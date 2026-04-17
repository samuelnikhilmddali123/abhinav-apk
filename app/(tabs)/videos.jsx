import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, StatusBar, Image, ImageBackground, Text, Easing, Dimensions, TouchableOpacity, Linking, Animated as RNAnimated, Platform, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { useSettings } from '../../context/SettingsContext';
import { useNetInfo } from '@react-native-community/netinfo';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';

const { width, height: SCREEN_H } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.7;
const CARD_WIDTH = width * 0.7;
const EMPTY_ITEM_SIZE = (width - ITEM_WIDTH) / 2;

const GOLD = '#FBBF24';
const MAGENTA = '#4A044E';

const LOGO_IMAGE = require('../../assets/images/logo.webp');
const TICKER_BG = require('../../assets/images/bg-ticker.webp');
const BG_VIDEOS = require('../../assets/images/bg-videos.jpg');

const YOUTUBE_WATCH = (id) => `https://www.youtube.com/watch?v=${id}`;
const YOUTUBE_EMBED = (id) => `https://www.youtube.com/embed/${id}?playsinline=1&controls=0&fs=0&modestbranding=1&rel=0&showinfo=0&cc_load_policy=0&iv_load_policy=3`;



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

function CarouselItem({ item, index, scrollX, onPlayVideo, isPlaying }) {
  const openVideo = useCallback(() => {
    if (item.videoId) onPlayVideo?.(item);
  }, [item, onPlayVideo]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const distance = scrollX.value - centerPos;
    const relPos = distance / ITEM_WIDTH;
    const inputRange = [-1, 0, 1];
    const absRelPos = Math.abs(relPos);
    const scale = interpolate(relPos, inputRange, [0.86, 1, 0.86], 'clamp');
    const opacity = interpolate(relPos, inputRange, [0.72, 1, 0.72], 'clamp');
    const isActive = absRelPos < 0.5;
    const zIndex = isActive ? 20 : 10;
    const elevation = isActive ? 10 : 4;
    const borderW = interpolate(Math.abs(relPos), [0, 0.1], [2, 0], 'clamp');
    const shadowOp = interpolate(absRelPos, [0, 0.9], [0.85, 0], 'clamp');

    return {
      transform: [{ scale }],
      opacity,
      borderWidth: borderW,
      borderColor: GOLD,
      shadowOpacity: shadowOp,
      position: 'relative',
      zIndex,
      ...(Platform.OS === 'android' ? { elevation } : {}),
    };
  });

  const dimOverlayStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0, 1], [0, 0.62], 'clamp');
    return { opacity: o };
  });

  const playStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0.4, 0.8], [0, 1], 'clamp');
    return { opacity: o };
  });

  const activeChromeStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0, 0.3], [1, 0], 'clamp');
    return { opacity: o };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const o = interpolate(Math.abs(relPos), [0, 1], [1, 0.75], 'clamp');
    return { opacity: o };
  });

  const containerStyle = useAnimatedStyle(() => {
    const centerPos = (index - 1) * ITEM_WIDTH;
    const relPos = (scrollX.value - centerPos) / ITEM_WIDTH;
    const absRelPos = Math.abs(relPos);
    const isActive = absRelPos < 0.5;
    const zIndex = isActive ? 20 : 10;
    const elevation = isActive ? 10 : 4;
    return {
      position: 'relative',
      zIndex,
      ...(Platform.OS === 'android' ? { elevation } : {}),
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }, containerStyle]}>
      <Animated.View style={[styles.videoCard, { width: CARD_WIDTH }, animatedCardStyle]}>
        {isPlaying ? (
          <View style={{ flex: 1, backgroundColor: '#000', borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: CARD_WIDTH * (16/9) * (16/9), height: CARD_WIDTH * (16 / 9), alignItems: 'center', justifyContent: 'center' }}>
              <YoutubePlayer
                height={CARD_WIDTH * (16 / 9)}
                width={CARD_WIDTH * (16 / 9) * (16 / 9)}
                videoId={item.videoId}
                play={isPlaying}
                forceAndroidAutoplay={true}
                initialPlayerParams={{
                  preventFullScreen: true,
                  controls: false,
                  modestbranding: true,
                  rel: false,
                  iv_load_policy: 3,
                }}
                webViewProps={{
                  mediaPlaybackRequiresUserAction: false,
                  allowsInlineMediaPlayback: true,
                  injectedJavaScript: `
                    document.body.style.backgroundColor = 'black';
                    true;
                  `,
                }}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={1} style={styles.touchableCard} onPress={openVideo}>
            <Animated.Image source={{ uri: `https://img.youtube.com/vi/${item.videoId}/maxresdefault.jpg` }} style={[styles.thumbnail, thumbStyle]} resizeMode="cover" />
            <Animated.View style={[styles.dimOverlay, dimOverlayStyle]} />
            <Animated.View style={[styles.playBtnWrap, playStyle]} pointerEvents="box-none">
              <View style={styles.playBtnCircle}>
                <FontAwesome name="play" size={36} color="#FFF" style={{ marginLeft: 6 }} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.topChrome, activeChromeStyle]} pointerEvents="box-none">
              <View style={styles.chromeRow}>
                <TouchableOpacity style={styles.chromeBtn} onPress={openVideo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome name="volume-up" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chromeBtn} onPress={openVideo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome name="arrows-alt" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            <View style={styles.brandTop} pointerEvents="none"><Text style={styles.brandTag}>Abhinav Gold</Text></View>
            <View style={styles.titleBlock} pointerEvents="none"><Text style={styles.videoTitle}>{item.title || 'Gold Price Update'}</Text></View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function PaginationDot({ index, scrollX }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
    const widthDot = interpolate(scrollX.value, inputRange, [8, 28, 8], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.25, 1, 0.25], 'clamp');
    return { width: widthDot, opacity };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: GOLD }, animatedStyle]} />;
}

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const listRef = useRef(null);
  const tickerScrollX = useRef(new RNAnimated.Value(0)).current;
  const { settings } = useSettings();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [playerVideo, setPlayerVideo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const netInfo = useNetInfo();
  const isConnected = netInfo.isConnected !== false;

  const openPlayer = useCallback((item) => {
    if (!item?.videoId) return;
    setPlayerVideo(item);
  }, []);

  const closePlayer = useCallback(() => setPlayerVideo(null), []);

  const playerW = Math.min(width - 32, width);
  const playerH = Math.round(playerW * (9 / 16));

  const rawVideos = settings.videos || [];
  const { videos, initialCenterIndex } = useMemo(() => {
    if (rawVideos.length <= 1) return { videos: rawVideos, initialCenterIndex: 0 };
    const newestVideo = rawVideos[rawVideos.length - 1];
    const remaining = rawVideos.slice(0, -1);
    const leftCount = Math.floor(remaining.length / 2);
    const leftSide = remaining.slice(0, leftCount);
    const rightSide = remaining.slice(leftCount);
    return {
      videos: [...leftSide, newestVideo, ...rightSide],
      initialCenterIndex: leftSide.length,
    };
  }, [rawVideos]);

  useEffect(() => { setTickerWidth(0); }, [settings.ticker]);

  useEffect(() => {
    if (tickerWidth > 0) {
      tickerScrollX.setValue(0);
      RNAnimated.loop(RNAnimated.timing(tickerScrollX, { toValue: -tickerWidth, duration: tickerWidth * 15, easing: Easing.linear, useNativeDriver: true })).start();
    }
  }, [tickerWidth, tickerScrollX]);

  useEffect(() => {
    const max = Math.max(0, videos.length - 1);
    const centerIndex = Math.max(0, Math.min(max, initialCenterIndex));
    setVideoIndex(centerIndex);
    scrollX.value = centerIndex * ITEM_WIDTH;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: centerIndex * ITEM_WIDTH, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialCenterIndex, videos, scrollX]);

  const onScroll = useAnimatedScrollHandler((event) => { scrollX.value = event.contentOffset.x; });

  const scrollToVideo = useCallback((next) => {
    const max = Math.max(0, videos.length - 1);
    const clamped = Math.max(0, Math.min(max, next));
    setVideoIndex(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_WIDTH, animated: true });
  }, [videos.length]);

  const onMomentumScrollEnd = useCallback((e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / ITEM_WIDTH);
    const max = Math.max(0, videos.length - 1);
    setVideoIndex(Math.max(0, Math.min(max, i)));
  }, [videos.length]);

  const data = [{ key: 'left-spacer' }, ...videos, { key: 'right-spacer' }];

  if (!isConnected) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <StatusBar barStyle="light-content" />
        <FontAwesome name="wifi" size={64} color={GOLD} style={{ marginBottom: 20 }} />
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10 }}>No Internet</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 30 }}>Please connect to the internet to view latest videos.</Text>
        <TouchableOpacity 
          style={{ backgroundColor: GOLD, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 }}
          onPress={() => {}}
        >
          <Text style={{ color: '#000', fontWeight: '900' }}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={BG_VIDEOS} style={styles.background} resizeMode="cover">
        <RibbonShards />
        <Animated.ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 2000);
              }}
              colors={['#FBBF24']}
              tintColor={'#FBBF24'}
            />
          }
        >
          <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
            <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.tickerContainer}>
            <ImageBackground source={TICKER_BG} style={[styles.tickerImage, { height: 40, width: '100%', justifyContent: 'center', overflow: 'hidden' }]} resizeMode="cover">
              <View style={styles.tickerContentOverlay}>
                <RNAnimated.View style={[styles.tickerScrollContainer, { transform: [{ translateX: tickerScrollX }] }]}>
                  <Text style={styles.tickerText} onLayout={(e) => { const w = e.nativeEvent.layout.width; if (tickerWidth === 0 && w > 0) setTickerWidth(w); }} numberOfLines={1}>
                    {settings.ticker}
                  </Text>
                  {Array.from({ length: 10 }).map((_, i) => (<Text key={i} style={styles.tickerText} numberOfLines={1}>{settings.ticker}</Text>))}
                </RNAnimated.View>
              </View>
            </ImageBackground>
          </View>

          <View style={[styles.carouselWrapper, { height: CARD_WIDTH * (16 / 9) + 80 }]}>
            <Animated.FlatList
              ref={listRef} data={data} keyExtractor={(item, index) => (item.key ? String(item.key) : `v-${index}`)}
              horizontal showsHorizontalScrollIndicator={false} snapToInterval={ITEM_WIDTH} snapToAlignment="start" decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer} onScroll={onScroll} scrollEventThrottle={16}
              onMomentumScrollEnd={onMomentumScrollEnd} windowSize={21} initialNumToRender={5} removeClippedSubviews={false} style={{ overflow: 'visible' }}
              renderItem={({ item, index }) => {
                if (item.key === 'left-spacer' || item.key === 'right-spacer') return <View style={{ width: EMPTY_ITEM_SIZE }} />;
                return <CarouselItem item={item} index={index} scrollX={scrollX} onPlayVideo={openPlayer} isPlaying={playerVideo?.id === item.id && playerVideo?.videoId === item.videoId} />;
              }}
            />

            {videos.length > 0 && (
              <View style={styles.pagination}>
                {videos.map((_, i) => <PaginationDot key={i} index={i} scrollX={scrollX} />)}
              </View>
            )}
          </View>

          {/* Additional bottom branding or info helps the scroll feel natural */}
          <View style={{ marginTop: 20, paddingHorizontal: 30, alignItems: 'center', marginBottom: 40 }}>
             <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: 20 }}>
               STAY UPDATED WITH OUR LATEST COLLECTIONS AND MARKET INSIGHTS
             </Text>
             
             {videos.length > 0 && (
               <View style={{ width: '100%', gap: 15 }}>
                 {videos.map((vid, idx) => (
                   <TouchableOpacity 
                     key={`list-${idx}`} 
                     style={styles.moreVideoCard}
                     onPress={() => openPlayer(vid)}
                   >
                     <Image 
                       source={{ uri: `https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg` }} 
                       style={styles.moreVideoThumb} 
                     />
                     <View style={{ flex: 1, paddingRight: 10 }}>
                       <Text style={styles.moreVideoTitle} numberOfLines={2}>{vid.title || 'Gold Price Update'}</Text>
                       <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>Abhinav Gold & Silver</Text>
                     </View>
                     <FontAwesome name="play-circle-o" size={28} color={GOLD} />
                   </TouchableOpacity>
                 ))}
               </View>
             )}
          </View>
        </Animated.ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { width: '100%', minHeight: SCREEN_H },
  shard: { position: 'absolute', width: width * 0.9, height: SCREEN_H * 0.45, backgroundColor: 'rgba(168, 85, 200, 0.12)', borderRadius: 4 },
  shardNarrow: { position: 'absolute', width: width * 0.35, height: SCREEN_H * 0.55, backgroundColor: 'rgba(220, 100, 180, 0.1)', borderRadius: 4 },
  headerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  logo: { width: '50%', height: 120, maxWidth: 200 },
  tickerContainer: { width: '100%', alignItems: 'center', marginTop: 8 },
  tickerImage: { width: '100%' },
  tickerContentOverlay: { flex: 1, justifyContent: 'center', overflow: 'hidden', height: 40 },
  tickerScrollContainer: { flexDirection: 'row', position: 'absolute', left: 0, width: 10000 },
  tickerText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2, textAlignVertical: 'center' },
  carouselWrapper: { marginTop: 8, marginBottom: 24, overflow: 'visible' },
  carouselContainer: { alignItems: 'center', paddingVertical: 12, overflow: 'visible' },
  videoCard: { backgroundColor: '#000', borderRadius: 32, borderColor: GOLD, overflow: 'hidden', aspectRatio: 9 / 16, shadowColor: GOLD, shadowOffset: { width: 0, height: 10 } },
  touchableCard: { flex: 1 },
  thumbnail: { width: '100%', height: '100%' },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },
  playBtnWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtnCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center', alignItems: 'center' },
  topChrome: { position: 'absolute', top: 10, right: 10, left: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  chromeRow: { flexDirection: 'row', gap: 8 },
  chromeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  brandTop: { position: 'absolute', top: 56, left: 0, right: 0, paddingHorizontal: 14, alignItems: 'center' },
  titleBlock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 24 },
  brandTag: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  videoTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 28, fontFamily: Platform.select({ ios: 'Playfair Display', android: 'serif', default: 'serif' }), textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  exploreButton: { backgroundColor: GOLD, height: 58, borderRadius: 29, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 36, marginTop: 22, elevation: 10, shadowColor: GOLD, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10 },
  exploreIconCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  exploreText: { color: MAGENTA, fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  playerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  playerHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  playerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  playerOpenYt: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  playerFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  moreVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moreVideoThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#000',
  },
  moreVideoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
