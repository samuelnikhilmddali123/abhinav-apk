import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Animated as RNAnimated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdmin } from '../../context/AdminContext';
import YoutubePlayer from "react-native-youtube-iframe";

const { width, height: SCREEN_H } = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';
/** Slide width — slightly narrow so more neighbors peek in (stacked deck). */
const ITEM_WIDTH = width * 0.68;
const CARD_WIDTH = width * 0.62;
const EMPTY_ITEM_SIZE = (width - ITEM_WIDTH) / 2;

const GOLD = '#FBBF24';
const MAGENTA = '#4A044E';
const MAGENTA_DARK = '#1A0B2E';

const LOGO_IMAGE = require('../../assets/images/logo.webp');
const TICKER_BG = require('../../assets/images/bg-ticker.webp');

const TICKER_TEXT =
  'Welcome to Abhinav Gold & Silver - Quality Purity Guaranteed • Best Rates in Market • Visit our showroom for latest designs • ';

const YOUTUBE_WATCH = (id) => `https://www.youtube.com/watch?v=${id}`;

const getYoutubeId = (url) => {
  if (!url) return '';
  // If it's already an 11-character ID, return it
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  // Robust YouTube ID extraction regex
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : url;
};

function RibbonShards() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.shard, { top: '8%', left: '-15%', transform: [{ rotate: '32deg' }] }]} />
      <View style={[styles.shard, { top: '35%', right: '-20%', transform: [{ rotate: '-28deg' }], opacity: 0.45 }]} />
      <View style={[styles.shardNarrow, { bottom: '15%', left: '5%', transform: [{ rotate: '52deg' }] }]} />
      <View style={[styles.shardNarrow, { top: '55%', right: '0%', transform: [{ rotate: '-42deg' }], opacity: 0.35 }]} />
    </View>
  );
}

function CarouselItem({ item, index, scrollX, isPlaying, onPlay }) {
  const openVideo = useCallback(() => {
    if (item.videoId) {
      onPlay(item.videoId);
    }
  }, [item.videoId, onPlay]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const distance = scrollX.value - centerPos;
    const relPos = distance / ITEM_WIDTH; // 0=center, +1=left on screen, -1=right

    const inputRange = [-3, -2, -1, 0, 1, 2, 3];

    // Depth: center full size; neighbors ~80–88%; farther cards smaller (matches stacked reference)
    const scale = interpolate(
      relPos,
      inputRange,
      [0.48, 0.56, 0.82, 1, 0.82, 0.56, 0.48],
      "clamp"
    );

    const absR = Math.abs(relPos);
    const opacity = interpolate(absR, [0, 0.12, 0.85, 1.4, 2.2, 3.2], [1, 1, 0.58, 0.5, 0.42, 0.36], "clamp");

    // Gentler tilt — heavy rotateY widens the card’s projected hit-box and reads as “on top”
    const rotateY = interpolate(relPos, inputRange, [22, 18, 9, 0, -9, -18, -22], "clamp");

    // Push side cards *away* from screen center (opposite of “pull in”). Inward values made the
    // right neighbor slide left onto the hero; on Android later FlatList rows + WebView then
    // paint on top and the overlap reads as a bug.
    const translateX = interpolate(
      relPos,
      inputRange,
      [
        0.78 * ITEM_WIDTH,
        0.58 * ITEM_WIDTH,
        0.32 * ITEM_WIDTH,
        0,
        -0.32 * ITEM_WIDTH,
        -0.58 * ITEM_WIDTH,
        -0.78 * ITEM_WIDTH,
      ],
      "clamp"
    );

    const borderW = interpolate(absR, [0, 0.14], [2.5, 0], "clamp");

    return {
      transform: [
        { perspective: 1400 },
        { translateX },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
      opacity,
      borderWidth: borderW,
      borderColor: GOLD,
    };
  });

  const dimOverlayStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0, 0.15, 1.2], [0, 0.45, 0.72], "clamp");
    return { opacity: o };
  });

  const playStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    // Reference: simple play on inactive stacks only; hide when card is focused
    const o = interpolate(Math.abs(relPos), [0.22, 0.55], [0, 1], "clamp");
    return { opacity: o };
  });

  const activeChromeStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    // Mute / expand chrome only when this slide is the hero thumbnail
    const o = interpolate(Math.abs(relPos), [0, 0.22], [1, 0], "clamp");
    return { opacity: o };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0, 1, 2.5], [1, 0.82, 0.72], "clamp");
    return { opacity: o };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {};
  });

  return (
    <Animated.View
      collapsable={false}
      style={[
        { width: ITEM_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' },
        containerStyle,
      ]}
    >
      <Animated.View
        collapsable={false}
        style={[
          styles.videoCard,
          { width: CARD_WIDTH },
          animatedCardStyle,
        ]}
      >
        {isPlaying ? (
          <View style={styles.playerWrapper}>
            <View style={styles.playerScaleWrapper}>
              <YoutubePlayer
                height={CARD_WIDTH * (16 / 9)}
                width={CARD_WIDTH * (16 / 9) * (16 / 9)} // 16:9 ratio player that covers height
                play={true}
                videoId={item.videoId}
                initialPlayerParams={{
                  controls: true,
                  loop: true,
                  modestbranding: true,
                  rel: false,
                }}
                webViewProps={{
                  allowsFullscreenVideo: false,
                  androidLayerType: 'hardware',
                  ...(IS_ANDROID
                    ? { style: { elevation: 0, backgroundColor: '#000' } }
                    : {}),
                }}
                onChangeState={(state) => {
                  if (state === "ended") onPlay(null);
                }}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={1} style={styles.touchableCard} onPress={openVideo}>
            <Animated.Image
              source={{ uri: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` }}
              style={[styles.thumbnail, thumbStyle]}
              resizeMode="cover"
            />

            <Animated.View style={[styles.dimOverlay, dimOverlayStyle]} />

            <Animated.View style={[styles.playBtnWrap, playStyle]} pointerEvents="box-none">
              <View style={styles.playBtnCircle}>
                <MaterialCommunityIcons name="play" size={36} color="#FFF" style={{ marginLeft: 4 }} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.topChrome, activeChromeStyle]} pointerEvents="box-none">
              <View style={styles.chromeRow}>
                <TouchableOpacity
                  style={styles.chromeBtn}
                  onPress={openVideo}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="volume-high" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chromeBtn}
                  onPress={openVideo}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="fullscreen" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.brandTop} pointerEvents="none">
              <Text style={styles.brandTag}>Abhinav Gold</Text>
            </View>
            <View style={styles.titleBlock} pointerEvents="none">
              <Text style={styles.videoTitle}>{item.title || 'Gold Price Update'}</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function PaginationDot({ index, scrollX }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
    const widthDot = interpolate(scrollX.value, inputRange, [8, 28, 8], "clamp");
    const opacity = interpolate(scrollX.value, inputRange, [0.25, 1, 0.25], "clamp");
    return { width: widthDot, opacity };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: GOLD }, animatedStyle]} />;
}

function AnimatedCell({ children, index, scrollX, style, ...props }) {
  const cellStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const absR = Math.abs((scrollX.value - centerPos) / ITEM_WIDTH);
    // Huge gap so the focused row always wins; non-focused rows use elevation 0 on Android so
    // nested WebViews/thumbnails cannot outrank the hero cell in the native compositor.
    const z = interpolate(absR, [0, 0.08, 0.2, 1, 2, 3], [80000, 72000, 400, 120, 60, 30], "clamp");
    const elev = interpolate(absR, [0, 0.08, 0.2], [32, 28, 0], "clamp");
    return {
      zIndex: Math.round(z),
      elevation: IS_ANDROID ? Math.round(elev) : 0,
    };
  });

  return (
    <Animated.View {...props} style={[style, cellStyle]} collapsable={false}>
      {children}
    </Animated.View>
  );
}

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const listRef = useRef(null);
  const tickerScrollX = useRef(new RNAnimated.Value(0)).current;
  const { adminSettings } = useAdmin();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  const videosRaw = adminSettings.videos && adminSettings.videos.length > 0
    ? adminSettings.videos
    : [
      { id: 'vid1', videoId: 'dQw4w9WgXcQ', title: 'Luxury Gold Collection' },
      { id: 'vid2', videoId: 'dQw4w9WgXcQ', title: 'Silver Bullion Guide' }
    ];

  const videos = videosRaw.map(v => {
    const rawId = v.videoId || v.id;
    const cleanId = getYoutubeId(rawId);
    return {
      ...v,
      videoId: cleanId,
      title: v.title || v.label || 'Gold Price Update'
    };
  });

  useEffect(() => {
    // Reset ticker width when text changes
    setTickerWidth(0);
  }, [adminSettings.ticker]);

  useEffect(() => {
    if (tickerWidth > 0) {
      tickerScrollX.setValue(0);
      RNAnimated.loop(
        RNAnimated.timing(tickerScrollX, {
          toValue: -tickerWidth,
          duration: tickerWidth * 15,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [tickerWidth]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const scrollToVideo = useCallback(
    (next) => {
      const max = Math.max(0, videos.length - 1);
      const clamped = Math.max(0, Math.min(max, next));
      setVideoIndex(clamped);
      listRef.current?.scrollToOffset({ offset: clamped * ITEM_WIDTH, animated: true });
    },
    [videos.length]
  );

  const onMomentumScrollEnd = useCallback((e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / ITEM_WIDTH);
    const max = Math.max(0, videos.length - 1);
    setVideoIndex(Math.max(0, Math.min(max, i)));
  }, [videos.length]);

  const data = [{ key: 'left-spacer' }, ...videos, { key: 'right-spacer' }];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#12081f', '#1f0f35', '#2a1248', '#1a0b2e']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.background}
      >
        <RibbonShards />

        <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
          <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.tickerContainer}>
          <ImageBackground
            source={TICKER_BG}
            style={[styles.tickerImage, { height: 40, width: '100%', justifyContent: 'center', overflow: 'hidden' }]}
            resizeMode="cover"
          >
            <View style={styles.tickerContentOverlay}>
              <RNAnimated.View
                style={[styles.tickerScrollContainer, { transform: [{ translateX: tickerScrollX }] }]}
              >
                <Text
                  style={styles.tickerText}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (tickerWidth === 0 && w > 0) setTickerWidth(w);
                  }}
                  numberOfLines={1}
                >
                  {adminSettings.ticker}
                </Text>
                {Array.from({ length: 10 }).map((_, i) => (
                  <Text key={i} style={styles.tickerText} numberOfLines={1}>
                    {adminSettings.ticker}
                  </Text>
                ))}
              </RNAnimated.View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.carouselWrapper}>
          <Animated.FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item, index) => (item.key ? String(item.key) : `v-${index}`)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContainer}
            onScroll={onScroll}
            onScrollBeginDrag={() => setPlayingVideoId(null)}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            windowSize={21}
            initialNumToRender={5}
            removeClippedSubviews={false}
            CellRendererComponent={(props) => <AnimatedCell {...props} scrollX={scrollX} />}
            style={{ overflow: 'visible' }}
            renderItem={({ item, index }) => {
              if (item.key === 'left-spacer' || item.key === 'right-spacer') {
                return <View style={{ width: EMPTY_ITEM_SIZE }} />;
              }
              return (
                <CarouselItem 
                  item={item} 
                  index={index} 
                  scrollX={scrollX} 
                  isPlaying={playingVideoId === item.videoId}
                  onPlay={setPlayingVideoId}
                />
              );
            }}
          />

          <View style={styles.chevronOverlayContainer}>
            <TouchableOpacity
              style={styles.chevronBtn}
              onPress={() => scrollToVideo(videoIndex - 1)}
              disabled={videoIndex <= 0 || videos.length === 0}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={32}
                color={videoIndex <= 0 ? 'rgba(255,255,255,0.35)' : '#FFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chevronBtn}
              onPress={() => scrollToVideo(videoIndex + 1)}
              disabled={videoIndex >= videos.length - 1 || videos.length === 0}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={32}
                color={videoIndex >= videos.length - 1 ? 'rgba(255,255,255,0.35)' : '#FFF'}
              />
            </TouchableOpacity>
          </View>

          {videos.length > 0 ? (
            <View style={styles.pagination}>
              {videos.map((_, i) => (
                <PaginationDot key={i} index={i} scrollX={scrollX} />
              ))}
            </View>
          ) : null}

          <TouchableOpacity 
            style={styles.exploreButton} 
            activeOpacity={0.8} 
            onPress={() => {
              if (videos[videoIndex]?.videoId) {
                setPlayingVideoId(videos[videoIndex].videoId);
              }
            }}
          >
            <View style={styles.exploreIconCircle}>
              <MaterialCommunityIcons name="play-circle" size={24} color={MAGENTA} />
            </View>
            <Text style={styles.exploreText}>Explore Live Sessions</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function openVideoFirst(v) {
  if (v?.videoId) Linking.openURL(YOUTUBE_WATCH(v.videoId));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: '100%', minHeight: SCREEN_H },
  shard: {
    position: 'absolute',
    width: width * 0.9,
    height: SCREEN_H * 0.45,
    backgroundColor: 'rgba(168, 85, 200, 0.12)',
    borderRadius: 4,
  },
  shardNarrow: {
    position: 'absolute',
    width: width * 0.35,
    height: SCREEN_H * 0.55,
    backgroundColor: 'rgba(220, 100, 180, 0.1)',
    borderRadius: 4,
  },
  headerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  logo: { width: '90%', height: 120, maxWidth: 400 },
  tickerContainer: { width: '100%', alignItems: 'center', marginTop: 8 },
  tickerImage: { width: '100%' },
  tickerContentOverlay: { flex: 1, justifyContent: 'center', overflow: 'hidden', height: 40 },
  tickerScrollContainer: { flexDirection: 'row', position: 'absolute', left: 0, width: 10000 },
  tickerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textAlignVertical: 'center',
  },
  carouselWrapper: { flex: 1, marginTop: 8, marginBottom: 24, overflow: 'visible' },
  carouselContainer: { alignItems: 'center', paddingVertical: 12, overflow: 'visible' },
  videoCard: {
    backgroundColor: '#000',
    borderRadius: 32,
    borderColor: GOLD,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
  },
  playerWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerScaleWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableCard: { flex: 1 },
  thumbnail: { width: '100%', height: '100%' },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  playBtnWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topChrome: {
    position: 'absolute',
    top: 10,
    right: 10,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  chromeRow: { flexDirection: 'row', gap: 8 },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brandTop: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  titleBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 24,
  },
  brandTag: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    fontFamily: Platform.select({ ios: 'Playfair Display', android: 'serif', default: 'serif' }),
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  chevronOverlayContainer: {
    position: 'absolute',
    top: '38%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  chevronBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  exploreButton: {
    backgroundColor: GOLD,
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 36,
    marginTop: 22,
    elevation: 10,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  exploreIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exploreText: {
    color: MAGENTA,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
