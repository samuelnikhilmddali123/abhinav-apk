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

const parseProductName = (productName) => {
  const match = productName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { name: match[1], sub: match[2] };
  }
  return { name: productName, sub: '' };
};

const LocalRateRow = ({ product, buy, sell, buyTrend, sellTrend, isLast = false }) => {
  const { name, sub } = parseProductName(product);
  const isGold = name.toLowerCase().includes('gold');
  const dotColor = isGold ? '#FFD700' : '#E5E7EB'; 

  return (
    <View style={[styles.rowContainer, isLast && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.productIndicator, { backgroundColor: dotColor }]} />
        <View style={{ flexDirection: 'column' }}>
          <Text style={styles.cellTextLeftName}>{name}</Text>
          {sub ? <Text style={styles.cellTextLeftSub}>{sub}</Text> : null}
        </View>
      </View>
      
      <View style={{ flex: 0.9, alignItems: 'flex-end', paddingRight: 4 }}>
        <View style={styles.buyBox}>
          <AnimatedRateText
            style={styles.cellPriceText}
            value={buy}
            trend={buyTrend}
            defaultColor="#FFFFFF"
          />
        </View>
      </View>
      
      <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
        <View style={styles.sellBox}>
          <AnimatedRateText
            style={styles.cellPriceTextGold}
            value={sell}
            trend={sellTrend}
            defaultColor="#F0C733"
          />
        </View>
      </View>
    </View>
  );
};

const SpotRateRow = ({ symbol, buy, sell, high, low, buyTrend, sellTrend, isLast = false }) => {
  const { name, sub } = parseProductName(symbol);
  const isGold = name.toLowerCase().includes('gold');
  const isUSD = name.toLowerCase().includes('usd');
  const dotColor = isGold ? '#FFD700' : isUSD ? '#3B82F6' : '#E5E7EB'; 

  return (
    <View style={[styles.rowContainer, isLast && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.productIndicator, { backgroundColor: dotColor }]} />
        <View style={{ flexDirection: 'column' }}>
          <Text style={styles.cellTextLeftName}>{name}</Text>
          {sub ? <Text style={styles.cellTextLeftSub}>{sub}</Text> : null}
        </View>
      </View>
      <AnimatedRateText
        style={[styles.cellTextRight, { flex: 1 }]}
        value={buy}
        trend={buyTrend}
        defaultColor="#FFFFFF"
      />
      <AnimatedRateText
        style={[styles.cellTextRight, { flex: 1 }]}
        value={sell}
        trend={sellTrend}
        defaultColor="#F0C733"
      />
      <Text style={[styles.cellTextRight, { flex: 1, color: RATE_UP_COLOR, fontSize: 13, fontWeight: '700' }]}>{high}</Text>
      <Text style={[styles.cellTextRight, { flex: 1, color: RATE_DOWN_COLOR, fontSize: 13, fontWeight: '700' }]}>{low}</Text>
    </View>
  );
};

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
          
          const parseNum = (v) => {
            if (v === undefined || v === null || v === '-') return NaN;
            const s = String(v).replace(/,/g, '');
            return parseFloat(s);
          };

          const p = parseNum(pStr);
          const c = parseNum(cStr);

          if (!isNaN(p) && !isNaN(c)) {
            // ─── PERFECT UNIFIED TREND LOGIC ───
            const rNV = parseFloat(c.toFixed(6));
            const rOV = parseFloat(p.toFixed(6));

            if (Math.abs(rNV - rOV) > 0.0000001) {
              // PRICE MOVED: Apply color immediately
              next[id] = {
                type: rNV > rOV ? 'increase' : 'decrease',
                expiry: now + 2000
              };
            } else if (next[id] && now < next[id].expiry) {
              // STABILITY PROTECTION: Keep previous color until 2s expiry
              // No change to next[id]
            } else {
              // STABLE: Effectively no movement for >2s
              delete next[id];
            }
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
  const calculateKaratRate = (baseRateVal, karatFactor, grams = 10, isBuy = false) => {
    if (settings.marketStatus?.isStoppedAll) return '--';
    const goldBuyStopped = settings.rateModifications?.gold999_buy_stopped;
    const goldSellStopped = settings.rateModifications?.gold999_sell_stopped;
    if (isBuy && goldBuyStopped) return '--';
    if (!isBuy && goldSellStopped) return '--';

    if (!baseRateVal || baseRateVal === '-') return '--';
    const liveVal = parseFloat(String(baseRateVal).replace(/,/g, ''));
    if (isNaN(liveVal) || liveVal === 0) return '--';

    const mods = settings.ratesPageModifications;
    const karatBase = Math.round(liveVal * karatFactor);

    let finalVal = karatBase;
    if (mods?.isModifiedMode) {
      const sDelta = Number(mods.gold999) || 0;
      finalVal = Math.round(karatBase + sDelta);
    }

    const numericVal = grams === 8 
      ? Math.round(finalVal * 0.8) 
      : grams === 10 
      ? finalVal 
      : Math.round((liveVal / 10) * karatFactor * grams);

    return '\u20B9' + numericVal.toLocaleString('en-IN');
  };

  const getSilverRateValue = (isBuy = false) => {
    if (settings.marketStatus?.isStoppedAll) return '--';
    const silverBuyStopped = settings.rateModifications?.silver999_buy_stopped;
    const silverSellStopped = settings.rateModifications?.silver999_sell_stopped;
    if (isBuy && silverBuyStopped) return '--';
    if (!isBuy && silverSellStopped) return '--';

    const silver = isBuy ? currentRates['2987']?.bid : currentRates['2987']?.ask; // Silver 999 5KG as base
    if (!silver || silver === '-') return '--';
    let val = parseFloat(String(silver).replace(/,/g, ''));
    if (isNaN(val)) return '--';

    const mods = settings.ratesPageModifications;
    if (mods?.isModifiedMode && mods.silver999) {
      val += Number(mods.silver999);
    }
    return '\u20B9' + Math.round(val).toLocaleString('en-IN');
  };

  const formatSpotRate = (val, isINR = false, stopKey = null) => {
    if (settings.marketStatus?.isStoppedAll) return '--';
    if (stopKey === 'gold_buy' && settings.rateModifications?.gold999_buy_stopped) return '--';
    if (stopKey === 'gold_sell' && settings.rateModifications?.gold999_sell_stopped) return '--';
    if (stopKey === 'silver_buy' && settings.rateModifications?.silver999_buy_stopped) return '--';
    if (stopKey === 'silver_sell' && settings.rateModifications?.silver999_sell_stopped) return '--';

    if (!val || val === '-') return '--';
    const num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return val;
    if (isINR) {
      if (num > 1000) {
        return '₹' + Math.round(num).toLocaleString('en-IN');
      }
      return '₹' + num.toFixed(2);
    }
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            <Text style={styles.tableTitleText}>LOCAL RETAIL RATES (WITH GST)</Text>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerTextLeft, { flex: 1.8 }]}>PRODUCT</Text>
                <Text style={[styles.headerTextRight, { flex: 0.9, paddingRight: 4 }]}>BUY</Text>
                <Text style={[styles.headerTextRight, { flex: 0.9 }]}>SELL</Text>
              </View>

              <View style={styles.tableBody}>
                <LocalRateRow
                  product="Gold 999 (10 Grams)"
                  buy={calculateKaratRate(currentRates['945']?.bid, 1.0, 10, true)}
                  sell={calculateKaratRate(currentRates['945']?.ask, 1.0, 10, false)}
                  buyTrend={getRateChangeType('945')}
                  sellTrend={getRateChangeType('945')}
                />
                <LocalRateRow
                  product="Gold 916 (10 Grams)"
                  buy={calculateKaratRate(currentRates['945']?.bid, 0.916, 10, true)}
                  sell={calculateKaratRate(currentRates['945']?.ask, 0.916, 10, false)}
                  buyTrend={getRateChangeType('945')}
                  sellTrend={getRateChangeType('945')}
                />
                <LocalRateRow
                  product="Gold 750 (10 Grams)"
                  buy={calculateKaratRate(currentRates['945']?.bid, 0.75, 10, true)}
                  sell={calculateKaratRate(currentRates['945']?.ask, 0.75, 10, false)}
                  buyTrend={getRateChangeType('945')}
                  sellTrend={getRateChangeType('945')}
                />
                <LocalRateRow
                  product="Gold 583 (10 Grams)"
                  buy={calculateKaratRate(currentRates['945']?.bid, 0.583, 10, true)}
                  sell={calculateKaratRate(currentRates['945']?.ask, 0.583, 10, false)}
                  buyTrend={getRateChangeType('945')}
                  sellTrend={getRateChangeType('945')}
                />
                <LocalRateRow
                  product="Gold 916 (8 Grams) - Kasu"
                  buy={calculateKaratRate(currentRates['945']?.bid, 0.916, 8, true)}
                  sell={calculateKaratRate(currentRates['945']?.ask, 0.916, 8, false)}
                  buyTrend={getRateChangeType('945')}
                  sellTrend={getRateChangeType('945')}
                />
                <LocalRateRow
                  product="Silver 999 (1 KG)"
                  buy={getSilverRateValue(true)}
                  sell={getSilverRateValue(false)}
                  buyTrend={getRateChangeType('2987')}
                  sellTrend={getRateChangeType('2987')}
                  isLast
                />
              </View>
            </View>

            <Text style={[styles.tableTitleText, { marginTop: 22 }]}>LIVE SPOT RATES</Text>

            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={[styles.tableContainer, { minWidth: 500, marginBottom: 10 }]}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.headerTextLeft, { flex: 1.2 }]}>SYMBOL</Text>
                  <Text style={[styles.headerTextRight, { flex: 1 }]}>BUY</Text>
                  <Text style={[styles.headerTextRight, { flex: 1 }]}>SELL</Text>
                  <Text style={[styles.headerTextRight, { flex: 1, color: RATE_UP_COLOR }]}>HIGH</Text>
                  <Text style={[styles.headerTextRight, { flex: 1, color: RATE_DOWN_COLOR }]}>LOW</Text>
                </View>

                <View style={styles.tableBody}>
                  <SpotRateRow
                    symbol="GOLD ($ / oz)"
                    buy={formatSpotRate(currentRates['3101']?.bid, false)}
                    sell={formatSpotRate(currentRates['3101']?.ask, false)}
                    high={formatSpotRate(currentRates['3101']?.high, false)}
                    low={formatSpotRate(currentRates['3101']?.low, false)}
                    buyTrend={getRateChangeType('3101')}
                    sellTrend={getRateChangeType('3101')}
                  />
                  <SpotRateRow
                    symbol="SILVER ($ / oz)"
                    buy={formatSpotRate(currentRates['3107']?.bid, false)}
                    sell={formatSpotRate(currentRates['3107']?.ask, false)}
                    high={formatSpotRate(currentRates['3107']?.high, false)}
                    low={formatSpotRate(currentRates['3107']?.low, false)}
                    buyTrend={getRateChangeType('3107')}
                    sellTrend={getRateChangeType('3107')}
                  />
                  <SpotRateRow
                    symbol="USD - INR (₹)"
                    buy={formatSpotRate(currentRates['3103']?.bid, true)}
                    sell={formatSpotRate(currentRates['3103']?.ask, true)}
                    high={formatSpotRate(currentRates['3103']?.high, true)}
                    low={formatSpotRate(currentRates['3103']?.low, true)}
                    buyTrend={getRateChangeType('3103')}
                    sellTrend={getRateChangeType('3103')}
                  />
                   <SpotRateRow
                    symbol="Gold 999 (100 Grams)"
                    buy={formatSpotRate(currentRates['945']?.bid, true, 'gold_buy')}
                    sell={formatSpotRate(currentRates['945']?.ask, true, 'gold_sell')}
                    high={formatSpotRate(currentRates['945']?.high, true, 'gold_sell')}
                    low={formatSpotRate(currentRates['945']?.low, true, 'gold_sell')}
                    buyTrend={getRateChangeType('945')}
                    sellTrend={getRateChangeType('945')}
                  />
                  <SpotRateRow
                    symbol="Silver 999 (30 KGS)"
                    buy={formatSpotRate(currentRates['2966']?.bid, true, 'silver_buy')}
                    sell={formatSpotRate(currentRates['2966']?.ask, true, 'silver_sell')}
                    high={formatSpotRate(currentRates['2966']?.high, true, 'silver_sell')}
                    low={formatSpotRate(currentRates['2966']?.low, true, 'silver_sell')}
                    buyTrend={getRateChangeType('2966')}
                    sellTrend={getRateChangeType('2966')}
                    isLast
                  />
                </View>
              </View>
            </ScrollView>

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
    paddingHorizontal: 16,
    marginTop: 25,
  },
  tableTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37', // Elegant premium gold title
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tableContainer: {
    backgroundColor: 'rgba(12, 6, 22, 0.96)', // Solid ultra-dark violet for premium readability
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.35)', // Clean, fine gold accent border
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 4, 15, 0.98)', // Polished deepest black-violet
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(212, 175, 55, 0.45)', // Slightly brighter clean gold division line
  },
  headerTextLeft: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37', // Elegant premium gold for headings
    letterSpacing: 1,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  headerTextRight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37', // Elegant premium gold for headings
    letterSpacing: 1,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  tableBody: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  productIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  cellTextLeft: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F4F6',
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  cellTextLeftName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF', // High-contrast clean white
    letterSpacing: 0.25,
  },
  cellTextLeftSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF', // Clean muted weight label
    marginTop: 2.5,
  },
  cellTextRight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.25,
    textAlign: 'right',
  },
  buyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 12,      // Substantial padding for increased box size
    paddingHorizontal: 16,    // Substantial padding for increased box size
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellBox: {
    backgroundColor: 'rgba(240, 199, 51, 0.12)', // Premium frosted gold container
    borderRadius: 8,
    paddingVertical: 12,      // Substantial padding for increased box size
    paddingHorizontal: 16,    // Substantial padding for increased box size
    borderWidth: 1,
    borderColor: 'rgba(240, 199, 51, 0.3)',
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },
  cellPriceTextGold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F0C733',
    letterSpacing: 0.25,
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
