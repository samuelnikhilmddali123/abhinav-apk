import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, StatusBar, ImageBackground, ScrollView, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Audio from 'expo-av/build/Audio';
import { fetchRatesIdMap } from '../../constants/liveRates';
import { useSettings } from '../../context/SettingsContext';
import { API_ENDPOINTS } from '../../constants/Config';
import { registerTabScreenMusicStop } from '../../constants/tabScreenMusicStop';

const { width } = Dimensions.get('window');
const HEADER_IMAGE = require('../../assets/images/mobile-home-header.webp');
const BG_IMAGE = require('../../assets/images/bg-home-mobile.webp');
const TICKER_IMAGE = require('../../assets/images/bg-ticker.webp');
const HOME_MUSIC = require('../../assets/images/music/home.mp3');
const TICKER_TEXT = "✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ";
const imageSource = Image.resolveAssetSource(HEADER_IMAGE);
const ASPECT_RATIO = imageSource.width / imageSource.height;

const tickerSource = Image.resolveAssetSource(TICKER_IMAGE);
const TICKER_ASPECT_RATIO = tickerSource.width / tickerSource.height;

const SpotRateBox = ({ title, symbol, value, high, low, defaultColor = '#FFFFFF', trend }) => {
  const getBoxStyle = () => {
    if (trend === 'up') return { backgroundColor: '#4ade80' }; // Vibrant Green
    if (trend === 'down') return { backgroundColor: '#f87171' }; // Vibrant Red
    return { backgroundColor: defaultColor };
  };

  const getTextStyle = () => {
    if (trend === 'up' || trend === 'down') return { color: '#000' };
    return { color: '#000' };
  };

  const getLabelStyle = () => {
    if (trend === 'up' || trend === 'down') return { color: '#000' };
    return {};
  };

  return (
    <View style={styles.spotRateWrapper}>
      <Text style={[styles.spotRateLabel, getLabelStyle()]}>{title}</Text>
      <View style={[styles.spotRateBox, getBoxStyle()]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.symbol, getTextStyle()]}>{symbol}{symbol === '₹' ? ' ' : ''}</Text>
          <Text style={[styles.spotValue, getTextStyle()]}>{value || '--.--'}</Text>
        </View>
        <View style={styles.hlContainer}>
          <Text style={[styles.hlText, getTextStyle()]}>H:{high || '--.--'}</Text>
          <Text style={[styles.hlDivider, getTextStyle()]}> | </Text>
          <Text style={[styles.hlText, getTextStyle()]}>L:{low || '--.--'}</Text>
        </View>
      </View>
    </View>
  );
};

const LiveSpotRateRow = ({ product, sub, color, buy, sell, inStock = true, trend }) => {
  const getPillColor = () => {
    if (trend === 'up') return '#4ade80'; // Vibrant Green
    if (trend === 'down') return '#f87171'; // Vibrant Red
    return color;
  };

  return (
    <View style={styles.liveRowCard}>
      <View style={{ flex: 1.5, paddingRight: 5 }}>
        <Text style={[styles.retailProductTitle, { color: '#000' }]}>{product}</Text>
        <Text style={[styles.retailProductWeight, { color: '#444' }]}>{sub}</Text>
      </View>
      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 10 }}>
        <View style={[styles.retailPill, { backgroundColor: getPillColor(), justifyContent: 'center', alignItems: 'center', flex: 1, height: 42, borderRadius: 21 }]}>
          <Text style={{fontWeight: '900', fontSize: 15, color: '#000'}}>
            ₹ {sell || buy || '--'}
          </Text>
        </View>
      </View>
      <View style={{ flex: 0.8, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: inStock ? '#e6f4ea' : '#fce8e6', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name={inStock ? "checkmark" : "remove"} size={24} color={inStock ? "#1E8E3E" : "#D93025"} />
        </View>
      </View>
    </View>
  );
};

const MarketStatusBox = ({ status }) => {
  // Match website logic (`abhanav-website/src/context/RateContext.jsx` getMarketStatus)
  const parseTimeToMinutes = (t) => {
    if (!t || typeof t !== 'string') return null;
    const s = t.trim().toUpperCase();

    // Supports both "10:00" and "10:00 AM" formats.
    const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const ap = m[3];
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    if (mm < 0 || mm > 59) return null;
    if (ap) {
      hh = hh % 12;
      if (ap === 'PM') hh += 12;
    }
    if (hh < 0 || hh > 23) return null;
    return hh * 60 + mm;
  };

  const getMarket = () => {
    const cfg = status || {};
      const now = new Date();

    // Sunday check in IST
    const istDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    }).format(now);

    if (istDay === 'Sun') {
      return { isOpen: false, message: 'MARKET CLOSED (SUNDAY)' };
    }

    // Current IST time in minutes
    const istTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).format(now);

    const [hStr, mStr] = String(istTime).split(':');
    const curMin = Number(hStr) * 60 + Number(mStr);

    if (cfg.mode === 'modified') {
      const openMin = parseTimeToMinutes(cfg.openTime) ?? 600;
      const closeMin = parseTimeToMinutes(cfg.closeTime) ?? 1200;
      const timeRangeOpen = curMin >= openMin && curMin < closeMin;
      const isOpen = (cfg.overrideStatus || cfg.modifiedStatus) === 'open' && timeRangeOpen;
      return { isOpen, message: isOpen ? 'MARKET OPEN' : 'MARKET CLOSED' };
    }

    // Regular hours: 10:00–20:00 IST
    const isOpen = curMin >= 600 && curMin < 1200;
    return { isOpen, message: isOpen ? 'MARKET OPEN' : 'MARKET CLOSED' };
  };

  const market = getMarket();

  return (
    <View style={[styles.marketStatusButton, !market.isOpen && { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#f87171' }]}>
      <View style={styles.marketStatusTopRow}>
        <View style={[styles.marketStatusDot, !market.isOpen && { backgroundColor: '#f87171' }]} />
        <Text style={[styles.marketStatusTitle, !market.isOpen && { color: '#f87171' }]}>
          {market.message}
        </Text>
      </View>
      <Text style={styles.marketStatusTime}>
        {status?.mode === 'regular' ? 'REGULAR: 10:00 AM - 08:00 PM (IST)' : 'MODIFIED OPERATION MODE'}
      </Text>
    </View>
  );
};

const RetailRateRow = ({ product, weight, unit, color, hiLoColor, buy, sell, hi, lo, trend }) => {
  const getPillColor = () => {
    if (trend === 'up') return '#4ade80'; // Vibrant Green
    if (trend === 'down') return '#f87171'; // Vibrant Red
    return color;
  };

  return (
    <View style={styles.retailRow}>
      <View style={styles.retailProductCol}>
        <Text style={styles.retailProductTitle}>{product}</Text>
        <Text style={styles.retailProductWeight}>{weight}</Text>
        <Text style={styles.retailProductUnit}>{unit}</Text>
      </View>
      
      <View style={styles.retailPillCol}>
        <View style={[styles.retailPill, { backgroundColor: getPillColor(), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{fontWeight: '900', fontSize: 13, color: '#000'}}>₹ {buy || '--'}</Text>
        </View>
      </View>
      
      <View style={styles.retailPillCol}>
        <View style={[styles.retailPill, { backgroundColor: getPillColor(), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{fontWeight: '900', fontSize: 13, color: '#000'}}>₹ {sell || '--'}</Text>
        </View>
      </View>
    
      <View style={styles.retailHiLoCol}>
        <View style={[styles.retailHiLoBox, { backgroundColor: hiLoColor }]}>
          <View style={styles.retailHiLoInnerRow}>
            <Text style={styles.retailHiText}>HI</Text>
            <Text style={{fontWeight: '900', fontSize: 10, color: '#000', marginLeft: 6}}>₹ {hi || '--'}</Text>
          </View>
          <View style={styles.retailHiLoDivider} />
          <View style={styles.retailHiLoInnerRow}>
            <Text style={styles.retailLoText}>LO</Text>
            <Text style={{fontWeight: '900', fontSize: 10, color: '#000', marginLeft: 6}}>₹ {lo || '--'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const { settings } = useSettings();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [rates, setRates] = useState({});
  const [trends, setTrends] = useState({});
  const [isMusicOn, setIsMusicOn] = useState(false);
  const prevRatesRef = useRef({});
  const isFetchingRatesRef = useRef(false);
  // Website parity: RTGS HI/LO is session-local, calculated from live sell(ask) updates.
  const sessionHighLowRef = useRef({});
  const soundRef = useRef(null);



  useEffect(() => {
    const fetchRates = async () => {
      if (isFetchingRatesRef.current) return;
      isFetchingRatesRef.current = true;
      try {
        // Same pipeline as abhanav-website: raw bcast text → whitespace parse (see liveRates.js),
        // fallback to `/api/rates/live` Mongo snapshot. Avoids mismatch with legacy `/api/rates` JSON.
        let newRates = await fetchRatesIdMap(API_ENDPOINTS.RATES_LIVE);

        if (!newRates || Object.keys(newRates).length === 0) {
          newRates = prevRatesRef.current || {};
        }

        // Compute trend fresh each fetch:
        // - If price increased => green
        // - If decreased => red
        // - If unchanged => revert to default colors immediately
        // Track only the IDs that drive visible color changes.
        // Compare using the SAME string formatting as the UI, so if the
        // displayed value is stable, we clear the trend and the box returns
        // to its default (gold/silver).
        const spotIds = { '3103': true, '3101': true, '3107': true };
        const pillIds = { '945': true, '2966': true, '2987': true };

        const nextTrends = {};

        Object.keys(newRates).forEach((id) => {
          if (!spotIds[id] && !pillIds[id]) return;

          const ask = newRates[id]?.ask;
          const prevAsk = prevRatesRef.current[id]?.ask;
          if (prevAsk === undefined || prevAsk === null || ask === undefined || ask === null) return;

          const newNum = Number(String(ask).replace(/\r/g, '').trim());
          const oldNum = Number(String(prevAsk).replace(/\r/g, '').trim());
          if (isNaN(newNum) || isNaN(oldNum)) return;

          const d = spotIds[id] ? 2 : 0;
          const newRounded = Number(newNum.toFixed(d));
          const oldRounded = Number(oldNum.toFixed(d));

          if (newRounded === oldRounded) return; // stable rounded value => no trend/color

          if (newRounded > oldRounded) nextTrends[id] = { type: 'up' };
          else if (newRounded < oldRounded) nextTrends[id] = { type: 'down' };
        });

        setTrends(nextTrends);

        // Match website RateContext:
        // for RTGS ids, HI/LO is tracked in-session from latest sell (ask).
        ['945', '2966', '2987'].forEach((id) => {
          const sell = parseFloat(String(newRates[id]?.ask ?? '').replace(/\r/g, '').trim());
          if (isNaN(sell)) return;

          const current = sessionHighLowRef.current[id] || { high: -Infinity, low: Infinity };
          if (sell > current.high) current.high = sell;
          if (sell < current.low) current.low = sell;
          sessionHighLowRef.current[id] = current;

          newRates[id] = {
            ...(newRates[id] || {}),
            high: String(current.high),
            low: String(current.low),
          };
        });

        setRates(newRates);
        prevRatesRef.current = newRates;
      } catch (error) {
        console.log('Error fetching live rates:', error);
      } finally {
        isFetchingRatesRef.current = false;
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tickerWidth > 0) {
      scrollX.setValue(0);
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: -tickerWidth,
          duration: tickerWidth * 12, // Pace based on width
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [tickerWidth, scrollX]);

  // Reset ticker width when text changes to force re-calculation
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(HOME_MUSIC, {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded && status.error) {
          console.log('Home music playback error:', status.error);
        }
      });
      soundRef.current = sound;
      setIsMusicOn(true);
    } catch (e) {
      console.log('Home music start failed:', e);
      await stopAndResetMusic();
    }
  }, [stopAndResetMusic]);

  const toggleMusic = React.useCallback(async () => {
    if (isMusicOn) {
      await stopAndResetMusic();
      return;
    }
    // Immediate UI feedback on tap.
    setIsMusicOn(true);
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

  const formatPrice = (val, multiplier = 1, type = 'none') => {
    // Treat only explicit "missing" values as empty. "0" is valid.
    if (val === undefined || val === null || val === '-' || val === '') return '--';
    let num = Number(val) * multiplier;

    const applyOffset = (base, offsetVal) => {
      if (offsetVal === undefined || offsetVal === null) return base;
      const v = Number(offsetVal);
      if (isNaN(v)) return base;
      return base + v;
    };

    const mods = settings.rateModifications;

    // Website Hero "LIVE SPOT RATES" uses `rawRates.rtgs` — no admin offsets (only `rates.rtgs` is adjusted).
    // Type `live_rtgs` matches that raw pill: sell × factor, integer rupees (see Hero.jsx).
    if (mods?.isModifiedMode && !String(type).startsWith('spot') && type !== 'live_rtgs') {
      if (type === 'gold') {
        num = applyOffset(num, mods.gold999_buy);
      } else if (type === 'gold999') {
        num = applyOffset(num, mods.gold999_sell);
      } else if (type === 'silver') {
        num = applyOffset(num, mods.silver999_buy);
      } else if (type === 'silver999') {
        num = applyOffset(num, mods.silver999_sell);
      }
    }

    if (isNaN(num)) return val || '--';
    let options = { maximumFractionDigits: type === 'none' ? 4 : 0 };
    if (type.startsWith('spot')) {
      options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    }
    if (type === 'live_rtgs') {
      options = { maximumFractionDigits: 0 };
    }
    return num.toLocaleString('en-IN', options);
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Image 
            source={HEADER_IMAGE}
            style={[styles.headerImage, { aspectRatio: ASPECT_RATIO }]}
            resizeMode="contain"
          />
          
          <View style={styles.spotRatesContainer}>
            <SpotRateBox 
              title="USD-INR (₹)" 
              symbol="₹" 
              value={formatPrice(rates['3103']?.ask, 1, 'spot')} 
              high={formatPrice(rates['3103']?.high, 1, 'spot')} 
              low={formatPrice(rates['3103']?.low, 1, 'spot')} 
              trend={trends['3103']?.type}
              defaultColor="#FFFFFF"
            />
            <SpotRateBox 
              title="GOLD ($)" 
              symbol="$" 
              value={formatPrice(rates['3101']?.ask, 1, 'spot_gold')} 
              high={formatPrice(rates['3101']?.high, 1, 'spot_gold')} 
              low={formatPrice(rates['3101']?.low, 1, 'spot_gold')} 
              trend={trends['3101']?.type}
              defaultColor="#F9D342"
            />
            <SpotRateBox 
              title="SILVER ($)" 
              symbol="$" 
              value={formatPrice(rates['3107']?.ask, 1, 'spot_silver')} 
              high={formatPrice(rates['3107']?.high, 1, 'spot_silver')} 
              low={formatPrice(rates['3107']?.low, 1, 'spot_silver')} 
              trend={trends['3107']?.type}
              defaultColor="#FFFFFF"
            />
          </View>

          <View style={styles.liveSection}>
            <View style={styles.liveHeaderWrap}>
              <Text style={styles.liveTitle}>LIVE SPOT RATES</Text>
              <View style={styles.underline} />
            </View>

            <View style={styles.subHeaderContainer}>
              <View style={styles.subHeaderLabelProducts}><View style={styles.subHeaderCapsule}><Text style={styles.subHeaderText}>PRODUCTS</Text></View></View>
              <View style={styles.subHeaderLabelLive}><View style={styles.subHeaderCapsule}><Text style={styles.subHeaderText}>LIVE</Text></View></View>
              <View style={styles.subHeaderLabelStatus}><View style={styles.subHeaderCapsule}><Text style={styles.subHeaderText}>STATUS</Text></View></View>
            </View>

            <LiveSpotRateRow 
              product="GOLD 999" 
              sub="100 GRAMS" 
              color="#F9D342" 
              buy={formatPrice(
                rates['945']?.bid && rates['945']?.bid !== '-' ? rates['945']?.bid : rates['945']?.ask,
                10,
                'live_rtgs'
              )} 
              sell={formatPrice(rates['945']?.ask, 10, 'live_rtgs')}
              inStock={settings.stockStatus['gold999'] !== false}
              trend={trends['945']?.type}
            />
            <LiveSpotRateRow 
              product="SILVER 999" 
              sub="30 KGS" 
              color="#FFFFFF" 
              buy={formatPrice(
                rates['2966']?.bid && rates['2966']?.bid !== '-' ? rates['2966']?.bid : rates['2966']?.ask,
                1,
                'live_rtgs'
              )} 
              sell={formatPrice(rates['2966']?.ask, 1, 'live_rtgs')}
              inStock={settings.stockStatus['silver999'] !== false}
              trend={trends['2966']?.type}
            />
          </View>
          
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
          
          <View style={styles.marketStatusContainer}>
            <MarketStatusBox status={settings.marketStatus} />
          </View>
          
          <View style={styles.retailTableSection}>
            <View style={styles.retailTitleContainer}>
              <Text style={styles.retailTitleText}>LOCAL GOLD AND SILVER RETAIL RATES</Text>
              <View style={styles.retailTitleUnderline} />
            </View>

            <View style={styles.retailHeaderRow}>
              <View style={styles.retailHeaderPill}><Text style={styles.retailHeaderText}>PRODUCTS</Text></View>
              <View style={[styles.retailHeaderPill, { transform: [{ translateX: -22 }] }]}><Text style={styles.retailHeaderText}>BUY</Text></View>
              <View style={[styles.retailHeaderPill, { transform: [{ translateX: -22 }] }]}><Text style={styles.retailHeaderText}>SELL</Text></View>
              <View style={[styles.retailHeaderPill, { transform: [{ translateX: -22 }] }]}><Text style={styles.retailHeaderText}>HI / LO</Text></View>
            </View>
            
            <View style={styles.retailTableCard}>
              <RetailRateRow 
                 product={"GOLD\n999"} 
                 weight="10" 
                 unit="GRAMS" 
                 color="#fce04b" 
                 hiLoColor="#a5f3fc" 
                 buy={formatPrice(
                   rates['945']?.bid && rates['945']?.bid !== '-' ? rates['945']?.bid : rates['945']?.ask,
                   1,
                   'gold'
                 )} 
                 sell={formatPrice(rates['945']?.ask, 1, 'gold999')} 
                 hi={formatPrice(rates['945']?.high, 1, 'live_rtgs')} 
                 lo={formatPrice(rates['945']?.low, 1, 'live_rtgs')} 
                 trend={trends['945']?.type}
              />
               <RetailRateRow 
                  product={"SILVER\n999"} 
                  weight="1" 
                  unit="KG" 
                  color="#FFFFFF" 
                  hiLoColor="#a5f3fc" 
                  buy={formatPrice(
                    rates['2966']?.bid && rates['2966']?.bid !== '-' ? rates['2966']?.bid : rates['2966']?.ask,
                    1,
                    'silver'
                  )} 
                  sell={formatPrice(rates['2966']?.ask, 1, 'silver999')} 
                  hi={formatPrice(rates['2966']?.high, 1, 'live_rtgs')} 
                  lo={formatPrice(rates['2966']?.low, 1, 'live_rtgs')} 
                  trend={trends['2966']?.type}
               />
            </View>
          </View>

          <View style={styles.musicButtonWrap}>
            <TouchableOpacity
              style={[styles.musicButton, isMusicOn ? styles.musicButtonOn : styles.musicButtonOff]}
              onPress={toggleMusic}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="music-note"
                size={22}
                color={isMusicOn ? '#FFFFFF' : '#1e293b'}
                style={styles.musicButtonIcon}
              />
              <Text style={[styles.musicButtonText, isMusicOn ? styles.musicButtonTextOn : styles.musicButtonTextOff]}>
                {isMusicOn ? 'MUSIC ON' : 'MUSIC OFF'}
              </Text>
            </TouchableOpacity>
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
  },
  headerImage: {
    width: width,
    height: undefined,
  },
  spotRatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10, 
    zIndex: 10,
    marginBottom: 30,
  },
  liveSection: {
    paddingHorizontal: 15,
  },
  liveHeaderWrap: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  liveTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#800',
    letterSpacing: 0.5,
  },
  underline: {
    width: 160,
    height: 3,
    backgroundColor: '#800',
    marginTop: 1,
  },
  subHeaderContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  subHeaderCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeaderLabelProducts: { flex: 1.2 },
  subHeaderLabelLive: { flex: 2 },
  subHeaderLabelStatus: { flex: 0.8 },
  subHeaderText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveRowCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  productInfo: {
    flex: 1.2,
    paddingLeft: 3,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    lineHeight: 18,
  },
  productSub: {
    fontSize: 9,
    color: '#444',
    fontWeight: '900',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  priceTagContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    width: '85%',
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTagText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  statusIcon: {
    flex: 0.8,
    alignItems: 'center',
  },
  statusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,1)',
  },
  tickerContainer: {
    width: '100%',
    marginTop: 25,
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
  marketStatusContainer: {
    paddingHorizontal: 15,
    marginTop: 25,
    marginBottom: 20,
  },
  marketStatusButton: {
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketStatusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  marketStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  marketStatusTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  marketStatusTime: {
    color: '#111',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  retailTableSection: {
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 40,
  },
  retailTitleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  retailTitleText: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '900',
    color: '#b90046', 
    letterSpacing: 1,
    textAlign: 'center',
  },
  retailTitleUnderline: {
    height: 3,
    backgroundColor: '#b90046',
    width: '100%',
    marginTop: 5,
  },
  retailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  retailHeaderPill: {
    backgroundColor: '#cdd5e0',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#a3aec0',
  },
  retailHeaderText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  retailTableCard: {
    paddingTop: 10,
    paddingHorizontal: 5,
  },
  retailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  retailProductCol: {
    flex: 2,
  },
  retailProductTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
  },
  retailProductWeight: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    marginTop: 4,
  },
  retailProductUnit: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
  },
  retailPillCol: {
    flex: 2.8,
    paddingHorizontal: 4,
  },
  retailPill: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 24,
    height: 48,
  },
  retailHiLoCol: {
    flex: 3,
    paddingLeft: 4,
  },
  retailHiLoBox: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 24,
    height: 48, 
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  retailHiLoInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retailHiText: {
    color: '#15803d',
    fontWeight: '900',
    fontSize: 10,
  },
  retailLoText: {
    color: '#b91c1c',
    fontWeight: '900',
    fontSize: 10,
  },
  retailHiLoDivider: {
    height: 1,
    backgroundColor: '#000', 
    marginVertical: 4,
    opacity: 0.1,
  },
  musicButtonWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
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
  spotRateWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  spotRateLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  spotRateBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spotRateBoxGold: {
    backgroundColor: '#F9D342',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  symbol: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 2,
  },
  spotValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  hlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hlText: {
    fontSize: 8,
    color: '#666',
  },
  hlDivider: {
    fontSize: 8,
    color: '#999',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#F9D342',
    marginBottom: 40,
    letterSpacing: 2,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
    minWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 211, 66, 0.3)',
  },
  buttonText: {
    color: '#F9D342',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 1,
  },
});
