import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, StatusBar, Image, Dimensions, ImageBackground, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Audio from 'expo-av/build/Audio';
import { fetchRatesIdMap } from '../../constants/liveRates';
import { useSettings } from '../../context/SettingsContext';
import { API_ENDPOINTS } from '../../constants/Config';

const { width } = Dimensions.get('window');
const HEADER_IMAGE = require('../../assets/images/mobile-rates-header.webp');
const BG_IMAGE = require('../../assets/images/bg-internal.jpg');
const TICKER_IMAGE = require('../../assets/images/bg-ticker.webp');
const RATES_MUSIC = require('../../assets/images/music/rates.mp3');
const TICKER_TEXT = "✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ";
const imageSource = Image.resolveAssetSource(HEADER_IMAGE);
const ASPECT_RATIO = imageSource.width / imageSource.height;

const RetailRow = ({ purity, rate, isLast = false }) => (
  <View style={[styles.retailRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={[styles.retailColText, { flex: 1, textAlign: 'left', paddingLeft: 10 }]}>{purity}</Text>
    <View style={{ flex: 1 }} />
    <Text style={[styles.retailColRate, { flex: 1, textAlign: 'right', paddingRight: 10 }]}>{rate}</Text>
  </View>
);

export default function RatesScreen() {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const { settings } = useSettings();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [rates, setRates] = useState({});
  const [isMusicOn, setIsMusicOn] = useState(false);

  const isFetchingRatesRef = useRef(false);
  const prevRatesRef = useRef({});
  const soundRef = useRef(null);

  useEffect(() => {
    const fetchRates = async () => {
      if (isFetchingRatesRef.current) return;
      isFetchingRatesRef.current = true;
      try {
        let newRates = await fetchRatesIdMap(API_ENDPOINTS.RATES_LIVE);

        if (!newRates || Object.keys(newRates).length === 0) {
          newRates = prevRatesRef.current || {};
        }
        setRates(newRates);
        prevRatesRef.current = newRates;
      } catch (error) {
        console.log('Error fetching rates (RatesScreen):', error);
      } finally {
        isFetchingRatesRef.current = false;
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateKaratRate = (baseAsk, factor) => {
    if (!baseAsk || baseAsk === '-') return '--';
    let num = parseFloat(baseAsk);
    if (isNaN(num)) return '--';
    
    const applyOffset = (base, offsetVal) => {
      if (offsetVal === undefined || offsetVal === null) return base;
      const v = Number(offsetVal);
      if (isNaN(v)) return base;
      return base + v;
    };

    const mods = settings.ratesPageModifications;

    // Match website behavior:
    // 1) Compute karat base from LIVE 999
    // 2) Apply flat Rates Page offset AFTER karat calculation (not multiplied by factor)
    const karatBase = Math.round(num * factor);
    const withOffset = mods?.isModifiedMode ? applyOffset(karatBase, mods.gold999) : karatBase;
    return withOffset.toLocaleString('en-IN');
  };

  const getSilverRate = () => {
    const silver = rates['2987']?.ask; // Silver 999 5KG as base
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(RATES_MUSIC, {
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <Image 
          source={HEADER_IMAGE}
          style={[styles.headerImage, { aspectRatio: ASPECT_RATIO }]}
          resizeMode="contain"
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
              <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>GOLD RATES</Text>
              <Text style={[styles.headerText, { flex: 1, textAlign: 'right', paddingRight: 10 }]}>RATES</Text>
            </View>

            <View style={styles.tableBody}>
              <RetailRow purity="Gold 24 KT" rate={calculateKaratRate(rates['945']?.ask, 1.0)} />
              <RetailRow purity="Gold 22 KT" rate={calculateKaratRate(rates['945']?.ask, 0.916)} />
              <RetailRow purity="Gold 18 KT" rate={calculateKaratRate(rates['945']?.ask, 0.75)} />
              <RetailRow purity="Gold 14 KT" rate={calculateKaratRate(rates['945']?.ask, 0.583)} isLast />
            </View>
          </View>

          <View style={styles.musicButtonWrap}>
            <TouchableOpacity style={styles.musicButton} onPress={toggleMusic} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.musicButtonText}>{isMusicOn ? 'MUSIC ON' : 'MUSIC OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    fontSize: 18,
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
    backgroundColor: '#e5e7eb',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    paddingHorizontal: 34,
    paddingVertical: 14,
  },
  musicButtonText: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
