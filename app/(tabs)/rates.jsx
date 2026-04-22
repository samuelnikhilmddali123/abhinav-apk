import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, StatusBar, Image, Dimensions, ImageBackground, Animated, Easing, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { fetchRatesIdMap } from '../../constants/liveRates';
import { useSettings } from '../../context/SettingsContext';
import { API_ENDPOINTS, FILE_ROOT } from '../../constants/Config';
import { registerTabScreenMusicStop } from '../../constants/tabScreenMusicStop';

const { width } = Dimensions.get('window');
const HEADER_IMAGE = require('../../assets/images/mobile-rates-header.webp');
const BG_IMAGE = require('../../assets/images/bg-internal.jpg');
const TICKER_IMAGE = require('../../assets/images/bg-ticker.webp');
const TICKER_TEXT = "✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ";
const imageSource = Image.resolveAssetSource(HEADER_IMAGE);
const ASPECT_RATIO = imageSource.width / imageSource.height;
const RATE_UP_COLOR = '#4ade80';
const RATE_DOWN_COLOR = '#f87171';
const RATE_DEFAULT_TEXT_COLOR = '#F0C733';

const AnimatedRateText = ({ value, trend, style, defaultColor = RATE_DEFAULT_TEXT_COLOR }) => {
  const progress = useRef(new Animated.Value(1)).current;
  const prevColorRef = useRef(defaultColor);

  const targetColor =
    trend === 'increase' ? RATE_UP_COLOR : trend === 'decrease' ? RATE_DOWN_COLOR : defaultColor;

  useEffect(() => {
    prevColorRef.current = targetColor;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [targetColor, progress]);

  const color = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [prevColorRef.current, targetColor],
  });

  return <Animated.Text style={[style, { color }]}>{value}</Animated.Text>;
};

const RetailRow = ({ purity, rate10g, trend, isLast = false, defaultColor = RATE_DEFAULT_TEXT_COLOR }) => (
  <View style={[styles.retailRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={[styles.retailColText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>{purity}</Text>
    <AnimatedRateText style={[styles.retailColRate, { flex: 1, textAlign: 'right', paddingRight: 10 }]} value={rate10g} trend={trend} defaultColor={defaultColor} />
  </View>
);

export default function RatesScreen() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const { settings } = useSettings();
   const [refreshing, setRefreshing] = useState(false);
   const [tickerWidth, setTickerWidth] = useState(0);
  const [rawRates, setRawRates] = useState({});
  const [previousRates, setPreviousRates] = useState({});
  const [currentRates, setCurrentRates] = useState({});
  const [trends, setTrends] = useState({});
  const [isMusicOn, setIsMusicOn] = useState(false);
  const netInfo = useNetInfo();
  const isConnected = netInfo.isConnected !== false;

  useEffect(() => {
    if (Object.keys(rawRates).length > 0) {
      setPreviousRates(currentRates);
      setCurrentRates(rawRates);

      const now = Date.now();
      setTrends(prev => {
        const next = { ...prev };
        Object.keys(rawRates).forEach(id => {
          const pStr = currentRates[id]?.ask;
          const cStr = rawRates[id]?.ask;
          if (pStr && cStr && pStr !== '-' && cStr !== '-') {
            const p = parseFloat(String(pStr).replace(/,/g, ''));
            const c = parseFloat(String(cStr).replace(/,/g, ''));
            if (!isNaN(p) && !isNaN(c)) {
              if (p !== c) {
                next[id] = {
                  type: c > p ? 'increase' : 'decrease',
                  expiry: now + 2000
                };
              }
            }
          }

          if (next[id] && now > next[id].expiry) {
            delete next[id];
          }
        });
        return next;
      });
    }
  }, [rawRates]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTrends(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now > next[id].expiry) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isFetchingRatesRef = useRef(false);
  const soundRef = useRef(null);

  const getRateChangeType = (id) => {
    return trends[id]?.type || "same";
  };

  // Same math as abhanav-website `src/context/RateContext.jsx` → `ratesPagePurities`:
  // karatBase = Math.round(live999Sell * factor)
  // sell (10g) = karatBase or Math.round(karatBase + ratesPage.gold) when showModified
  // sell8g = Math.round(sell * 0.8) — offset applies only via 10g sell, not added again on 8g
  const calculateKaratValue = (baseAsk, karatFactor, grams = 10) => {
    if (!baseAsk || baseAsk === '-') return '--';
    const live999Sell = parseFloat(baseAsk);
    if (isNaN(live999Sell) || live999Sell === 0) return '--';

    const mods = settings.ratesPageModifications;
    const karatBase = Math.round(live999Sell * karatFactor);

    let sell10 = karatBase;
    if (mods?.isModifiedMode) {
      const sDelta = Number(mods.gold999) || 0;
      sell10 = Math.round(karatBase + sDelta);
    }

    return grams === 8 ? Math.round(sell10 * 0.8) : grams === 10 ? sell10 : Math.round((live999Sell / 10) * karatFactor * grams);
  };

  const calculateKaratRate = (baseAsk, karatFactor, grams = 10) => {
    const value = calculateKaratValue(baseAsk, karatFactor, grams);
    if (value === '--') return '--';
    return '\u20B9' + Number(value).toLocaleString('en-IN');
  };

  const getSilverRate = () => {
    const silver = currentRates['2987']?.ask; // Silver 999 5KG as base
    if (!silver || silver === '-') return '--';
    let perKg = parseFloat(silver);
    if (isNaN(perKg)) return '--';

    const applyOffset = (base, offsetVal) => {
      if (offsetVal === undefined || offsetVal === null) return base;
      const v = Number(offsetVal);
      if (isNaN(v)) return base;
      return base + v;
    };

    const mods = settings.ratesPageModifications;

    if (mods?.isModifiedMode) {
      perKg = applyOffset(perKg, mods.silver999);
    }
    return perKg.toLocaleString('en-IN');
  };

  useEffect(() => {
    const fetchRates = async () => {
      if (isFetchingRatesRef.current) return;
      isFetchingRatesRef.current = true;
      try {
        const newMap = await fetchRatesIdMap(API_ENDPOINTS.RATES_LIVE);
        if (newMap && Object.keys(newMap).length > 0) {
            setRawRates(newMap);
        }
      } catch (e) {
        console.log('Error fetching rates:', e);
      } finally {
        isFetchingRatesRef.current = false;
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 1000);
    return () => clearInterval(interval);
  }, [settings.ratesPageModifications]);

  useEffect(() => {
    if (tickerWidth > 0) {
      scrollX.setValue(0);
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: -tickerWidth,
          duration: tickerWidth * 12,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [tickerWidth, scrollX]);

  // Reset ticker width when text changes
  useEffect(() => {
    setTickerWidth(0);
  }, [settings.ticker]);

  const stopAndResetMusic = React.useCallback(async () => {
    const snd = soundRef.current;
    soundRef.current = null;
    if (snd) {
      try {
        await snd.stopAsync();
      } catch {}
      try {
        await snd.unloadAsync();
      } catch {}
    }
    setIsMusicOn(false);
  }, []);

  const startMusic = React.useCallback(async () => {
    try {
      const musicUrl = settings.music?.ratesMusic?.fileUrl;
      const source = musicUrl ? { uri: FILE_ROOT + musicUrl } : null;
      if (!source) {
        console.log("Rates music URL not found in settings");
        setIsMusicOn(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded && status.error) {
          console.log('Rates music playback error:', status.error);
        }
      });

      soundRef.current = sound;
      setIsMusicOn(true);
    } catch (e) {
      console.log('Rates music start failed:', e);
      await stopAndResetMusic();
    }
  }, [stopAndResetMusic, settings.music]);

  const toggleMusic = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isMusicOn) {
      await stopAndResetMusic();
      return;
    }
    await startMusic();
  }, [isMusicOn, stopAndResetMusic, startMusic]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        void stopAndResetMusic();
      };
    }, [stopAndResetMusic])
  );

  useEffect(() => {
    return () => {
      void stopAndResetMusic();
    };
  }, [stopAndResetMusic]);

  useEffect(() => {
    return registerTabScreenMusicStop(() => stopAndResetMusic());
  }, [stopAndResetMusic]);

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.offlineContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#1A0B2E" />
        <FontAwesome name="wifi" size={64} color="#F0C733" style={{ marginBottom: 20 }} />
        <Text style={styles.offlineTitle}>No Internet Connection</Text>
        <Text style={styles.offlineSubTitle}>Please check your network settings to view live rates.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {}}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                 setRefreshing(true);
                 try {
                   const newMap = await fetchRatesIdMap(API_ENDPOINTS.RATES_LIVE);
                   if (newMap && Object.keys(newMap).length > 0) {
                       setRawRates(newMap);
                   }
                 } catch (e) {
                 } finally {
                   setRefreshing(false);
                 }
              }}
              colors={['#F0C733']}
              tintColor={'#F0C733'}
            />
          }
        >
          <Image
            source={HEADER_IMAGE}
            style={{
              width: width,
              height: 220,
              resizeMode: 'contain',
              marginBottom: -15,
              backgroundColor: 'transparent'
            }}
          />







          <View style={styles.tickerContainer}>

            <ImageBackground 
              source={TICKER_IMAGE} 
              style={[styles.tickerImage, { height: 40, width: '120%', justifyContent: 'center', overflow: 'hidden' }]} 
              resizeMode="cover" 
            >
              <Animated.View style={{ flexDirection: 'row', width: 8000, position: 'absolute', left: 0, transform: [{ translateX: scrollX }] }}>
                <Text 
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (tickerWidth === 0 && w > 0) setTickerWidth(w);
                  }}
                  style={styles.tickerText}
                >
                  {settings.ticker}
                </Text>
                {Array.from({ length: 15 }).map((_, i) => (
                    <Text key={i} style={styles.tickerText}>{settings.ticker}</Text>
                ))}
              </Animated.View>
            </ImageBackground>
          </View>

          <View style={styles.tableSection}>
            <Text style={styles.tableTitleText}>LIVE RETAIL RATES WITH GST</Text>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>PURITY</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'right', paddingRight: 10 }]}>10 GRAMS</Text>
              </View>

              <View style={styles.tableBody}>
                <RetailRow
                  purity="Gold 24 KT"
                  rate10g={calculateKaratRate(currentRates['945']?.ask, 1.0, 10)}
                  trend={getRateChangeType('945')}
                />
                <RetailRow
                  purity="Gold 22 KT"
                  rate10g={calculateKaratRate(currentRates['945']?.ask, 0.916, 10)}
                  trend={getRateChangeType('945')}
                />
                <RetailRow
                  purity="Gold 18 KT"
                  rate10g={calculateKaratRate(currentRates['945']?.ask, 0.75, 10)}
                  trend={getRateChangeType('945')}
                />
                <RetailRow
                  purity="Gold 14 KT"
                  rate10g={calculateKaratRate(currentRates['945']?.ask, 0.583, 10)}
                  trend={getRateChangeType('945')}
                  isLast
                />
              </View>
            </View>

            <View style={styles.subTableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>NAVARSU / KASU</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'right', paddingRight: 10 }]}>8 GRAMS</Text>
              </View>


              <View style={styles.tableBody}>
                <View style={[styles.retailRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.retailColText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>Gold 22KT</Text>
                  <AnimatedRateText
                    style={[styles.retailColRate, { flex: 1, textAlign: 'right', paddingRight: 10 }]}
                    value={calculateKaratRate(currentRates['945']?.ask, 0.916, 8)}
                    trend={getRateChangeType('945')}
                  />
                </View>
              </View>
            </View>

            {/* Silver Table */}
            <View style={styles.subTableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>SILVER</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'right', paddingRight: 10 }]}>10 GRAMS</Text>
              </View>

              <View style={styles.tableBody}>
                <View style={[styles.retailRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.retailColText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>Silver 999</Text>
                  <AnimatedRateText
                    style={[styles.retailColRate, { flex: 1, textAlign: 'right', paddingRight: 10 }]}
                    value={(() => {
                        const silver = currentRates['2987']?.ask; // Base KG
                        if (!silver || silver === '-') return '--';
                        let val = parseFloat(silver.replace(/,/g, ''));
                        if (isNaN(val)) return '--';
                        
                        // Apply mods if needed (similar to getSilverRate)
                        const mods = settings.ratesPageModifications;
                        if (mods?.isModifiedMode && mods.silver999) {
                            val += Number(mods.silver999);
                        }
                        
                        const per10g = Math.round(val / 100);
                        return '\u20B9' + per10g.toLocaleString('en-IN');
                    })()}
                    trend={getRateChangeType('2987')}
                    defaultColor="#CFE9E1"
                  />
                </View>
              </View>
            </View>

            <View style={styles.musicButtonWrap}>
              <TouchableOpacity
                style={[styles.musicButton, isMusicOn ? styles.musicButtonOn : styles.musicButtonOff]}
                onPress={toggleMusic}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome
                  name="music"
                  size={22}
                  color={isMusicOn ? '#FFFFFF' : '#1e293b'}
                  style={styles.musicButtonIcon}
                />
                <Text style={[styles.musicButtonText, isMusicOn ? styles.musicButtonTextOn : styles.musicButtonTextOff]}>
                  {isMusicOn ? 'MUSIC ON' : 'MUSIC OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0B2E',
  },
  bgImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  headerImage: {
    width: width,
    height: undefined,
  },
  tickerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  tickerImage: {
    width: '100%',
    height: undefined,
  },
  tickerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginRight: 0,
  },
  tableSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 25,
  },
  tableTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 15,
  },
  tableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  subTableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 18,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#A0155B',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 1,
  },
  tableBody: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  retailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  retailColText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
  retailColRate: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F0C733', 
    letterSpacing: 0.5,
  },
  musicButtonWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  musicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: width * 0.62,
  },
  musicButtonOn: {
    backgroundColor: '#db2777',
    borderColor: '#be185d',
  },
  musicButtonOff: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(30, 41, 59, 0.12)',
  },
  musicButtonIcon: {
    marginRight: 10,
  },
  musicButtonText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  musicButtonTextOn: {
    color: '#FFFFFF',
  },
  musicButtonTextOff: {
    color: '#1e293b',
  },
  offlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  offlineSubTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#F0C733',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
