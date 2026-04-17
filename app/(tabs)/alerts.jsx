import { StyleSheet, View, ImageBackground, StatusBar, Image, Animated, Text, Easing, Dimensions, ScrollView, TouchableOpacity, Linking, Platform, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { useNetInfo } from '@react-native-community/netinfo';
import { API_ENDPOINTS } from '../../constants/Config';

const { width } = Dimensions.get('window');

const BG_IMAGE = require('../../assets/images/bg-alerts.webp');
const LOGO_IMAGE = require('../../assets/images/logo.webp');
const TICKER_BG = require('../../assets/images/bg-ticker.webp');
const QR_BANK = require('../../assets/images/qr-code.webp');
const QR_LOCATION = require('../../assets/images/qr-code-location.webp');
const STACKVIL_LOGO = require('../../assets/images/stackvil-logo.webp');

const TICKER_TEXT = "Welcome to Abhinav Gold & Silver - Quality Purity Guaranteed • Best Rates in Market • Visit our showroom for latest designs • ";

export default function AlertsScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const { settings } = useSettings();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [news, setNews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQr, setSelectedQr] = useState(null);
  const netInfo = useNetInfo();
  const isConnected = netInfo.isConnected !== false;

  const parseNews = (xml) => {
    if (!xml) return [];
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g);
    if (!items) return [];

    return items
      .map((it, idx) => {
        const titleMatch =
          it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
          it.match(/<title>(.*?)<\/title>/);
        const title = titleMatch?.[1];
        const pubDate = it.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        const link = it.match(/<link>(.*?)<\/link>/)?.[1];

        // Format date: "2026-03-02 09:43:12" -> "02 Mar 2026"
        let dateStr = pubDate || '';
        if (dateStr.includes('-')) {
          const [y, m, dayParts] = dateStr.split('-');
          const monthIndex = parseInt(m) - 1;
          const day = dayParts.split(' ')[0];
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
          ];
          if (monthIndex >= 0 && monthIndex < 12) {
            dateStr = `${day} ${monthNames[monthIndex]} ${y}`;
          }
        }

        return {
          id: `news-${idx}`,
          title: title?.replace(/&amp;/g, '&'),
          msg: title?.replace(/&amp;/g, '&'),
          date: dateStr,
          link,
          type:
            title?.toLowerCase().includes('surge') ||
            title?.toLowerCase().includes('fall') ||
            title?.toLowerCase().includes('alert')
              ? 'urgent'
              : 'info',
        };
      })
      .slice(0, 15);
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('https://www.investing.com/rss/news.rss');
        if (res.ok) {
          const xml = await res.text();
          const parsed = parseNews(xml);
          if (parsed && parsed.length > 0) {
            setNews(parsed);
          }
        }
      } catch (err) {
        console.log('Failed to fetch news:', err);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 60000 * 5); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tickerWidth > 0) {
      scrollX.setValue(0);
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: -tickerWidth,
          duration: tickerWidth * 15,
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

  const openLink = (url) => {
    Linking.openURL(url);
  };

  const handleQrPress = (qr) => {
    setSelectedQr(qr);
    setQrModalVisible(true);
  };

  if (!isConnected) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#001A33' }]}>
        <StatusBar barStyle="light-content" />
        <FontAwesome name="wifi" size={64} color="#F9D342" style={{ marginBottom: 20 }} />
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10 }}>Disconnected</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 30 }}>Enable data or Wi-Fi to receive the latest market alerts.</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#F9D342', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 }}
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
      <ImageBackground source={BG_IMAGE} style={styles.background} resizeMode="cover">
        <View style={styles.headerContainer}>
          <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.tickerContainer}>
          <ImageBackground 
            source={TICKER_BG} 
            style={[styles.tickerImage, { height: 40, width: '100%', justifyContent: 'center', overflow: 'hidden' }]}
            resizeMode="cover"
          >
            <View style={styles.tickerContentOverlay}>
              <Animated.View
                style={[
                  styles.tickerScrollContainer,
                  { transform: [{ translateX: scrollX }] }
                ]}
              >
                <Text 
                  style={styles.tickerText} 
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (tickerWidth === 0 && w > 0) setTickerWidth(w);
                  }}
                  numberOfLines={1}
                >
                  {settings.ticker}
                </Text>
                {Array.from({ length: 15 }).map((_, i) => (
                  <Text key={i} style={styles.tickerText} numberOfLines={1}>{settings.ticker}</Text>
                ))}
              </Animated.View>
            </View>
          </ImageBackground>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  const res = await fetch('https://www.investing.com/rss/news.rss');
                  if (res.ok) {
                    const xml = await res.text();
                    const parsed = parseNews(xml);
                    if (parsed && parsed.length > 0) {
                      setNews(parsed);
                    }
                  }
                } catch (err) {
                } finally {
                  setRefreshing(false);
                }
              }}
              colors={['#F9D342']}
              tintColor={'#F9D342'}
            />
          }
        >
          
          <View style={styles.newsSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="bell" size={24} color="#F9D342" style={{ marginRight: 10 }} />
              <Text style={styles.sectionTitle}>MARKET ALERTS</Text>
            </View>

            {news.length > 0 ? (
              news.map((item) => (
                <View key={item.id} style={styles.newsCard}>
                  <View style={styles.newsCardHeader}>
                    <View>
                      <Text style={styles.newsTitle}>{item.title}</Text>
                      <View style={styles.newsDateRow}>
                        <FontAwesome name="calendar" size={12} color="rgba(255,255,255,0.6)" style={{ marginRight: 5 }} />
                        <Text style={styles.newsDateText}>{item.date}</Text>
                      </View>
                    </View>
                    {/* URGENT badge removed */}
                  </View>
                  <Text style={styles.newsMsg}>{item.msg}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noNewsCard}>
                <FontAwesome name="info-circle" size={30} color="#F9D342" style={{ marginBottom: 10 }} />
                <Text style={styles.noNewsText}>Fetching latest market updates...</Text>
              </View>
            )}
          </View>

          {/* Footer Implementation */}
          <View style={styles.footer}>
            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>BANK & LOCATION QR</Text>
              <View style={styles.qrRow}>
                <TouchableOpacity style={styles.qrContainer} onPress={() => handleQrPress(QR_BANK)}>
                  <Image source={QR_BANK} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrLabelText}>BANK DETAILS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qrContainer} onPress={() => handleQrPress(QR_LOCATION)}>
                  <Image source={QR_LOCATION} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrLabelText}>OUR LOCATION</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerSection}>
              <View style={styles.brandingRow}>
              <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                <Image source={LOGO_IMAGE} style={styles.footerLogo} resizeMode="contain" />
              </TouchableOpacity>
                <View>
                  <Text style={styles.footerBrandName}>ABHINAV</Text>
                  <Text style={styles.footerBrandSub}>GOLD & SILVER</Text>
                </View>
              </View>
              <Text style={styles.brandPitch}>Purity you can trust, quality you can wear. A legacy of excellence and transparency since 1995.</Text>
              
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.instagram.com/abhinavjewellery/')}>
                  <FontAwesome name="instagram" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.facebook.com/')}>
                  <FontAwesome name="facebook" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.youtube.com/@abhinavjewellery')}>
                  <FontAwesome name="youtube-play" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>WHY CHOOSE US</Text>
              <View style={styles.featureItem}>
                <FontAwesome name="shield" size={16} color="#F9D342" style={{ marginRight: 10 }} />
                <Text style={styles.featureText}>100% Purity Guaranteed</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="clock-o" size={16} color="#F9D342" style={{ marginRight: 10 }} />
                <Text style={styles.featureText}>Real-time Market Rates</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome5 name="award" size={16} color="#F9D342" style={{ marginRight: 10 }} />
                <Text style={styles.featureText}>Certified Bullion Dealer</Text>
              </View>
            </View>

            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>CONTACT US</Text>
              <TouchableOpacity style={styles.contactItem} onPress={() => openLink('tel:+919441055916')}>
                <View style={styles.contactIconContainer}><FontAwesome name="phone" size={18} color="#F9D342" /></View>
                <View>
                  <Text style={styles.contactSmallLabel}>WHATSAPP / CALL</Text>
                  <Text style={styles.contactValue}>+91 94410 55916</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactItem} onPress={() => openLink('mailto:info@abhinavjewellers.com')}>
                <View style={styles.contactIconContainer}><FontAwesome name="envelope" size={18} color="#F9D342" /></View>
                <View>
                  <Text style={styles.contactSmallLabel}>EMAIL SUPPORT</Text>
                  <Text style={styles.contactValue}>info@abhinavjewellers.com</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}><FontAwesome name="map-marker" size={18} color="#F9D342" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactSmallLabel}>MAIN BRANCH</Text>
                  <Text style={styles.contactValue}>D/o.16-8-15/a, Akkalabasavhai Street, Tenali, 522201</Text>
                </View>
              </View>
            </View>

            <View style={styles.footerBottom}>
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.copyText}>© {new Date().getFullYear()} Abhinav Gold & Silver. All Rights Reserved.</Text>
                <Text style={styles.trustText}>Trusted for excellence in bullion trading since 1995.</Text>
              </View>
              <View style={styles.designedByRow}>
                <Text style={styles.designedByText}>DESIGNED BY</Text>
                <TouchableOpacity onPress={() => openLink('https://stackvil.com')}>
                  <Image source={STACKVIL_LOGO} style={styles.stackvilLogo} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>

      <Modal
        animationType="fade"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setQrModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setQrModalVisible(false)}
            >
              <FontAwesome name="times" size={28} color="#FFF" />
            </TouchableOpacity>
            
            {selectedQr && (
              <Image 
                source={selectedQr} 
                style={styles.fullQrImage} 
                resizeMode="contain" 
              />
            )}

            {selectedQr === QR_BANK && (
              <View style={styles.bankDetailTextContainer}>
                <Text style={styles.bankDetailText}>Name : Abhinav Jewellers</Text>
                <Text style={styles.bankDetailText}>IFSC CODE : INDB0001882</Text>
                <Text style={styles.bankDetailText}>Account Number : 259440138353</Text>
              </View>
            )}
            
            <Text style={styles.modalHint}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  logo: {
    width: '90%',
    height: 150,
    maxWidth: 400,
  },
  tickerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  tickerImage: {
    width: '100%',
  },
  tickerContentOverlay: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    height: 40,
  },
  tickerScrollContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    width: 10000, 
  },
  tickerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginRight: 0,
    textAlignVertical: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  newsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  newsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 8,
    borderColor: '#F9D342', // Gold border for all
  },
  infoBorder: {
    borderColor: '#4A90E2', // Blue
  },
  newsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  newsDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  newsDateText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBadge: {
    backgroundColor: 'rgba(74,144,226,0.15)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  infoBadgeText: {
    color: '#4A90E2',
  },
  newsMsg: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
    fontWeight: '500',
  },
  noNewsCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  noNewsText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#0F172A', // Navy/Dark Slate
    marginTop: 40,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Space for BottomNav
  },
  footerSection: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 25,
  },
  footerLabel: {
    color: '#F9D342',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 15,
  },
  qrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qrContainer: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    width: '48%',
  },
  qrImage: {
    width: '100%',
    height: 100,
  },
  qrLabelText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    marginTop: 8,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  footerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  footerBrandName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerBrandSub: {
    color: '#F9D342',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  brandPitch: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: 'row',
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 211, 66, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactSmallLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  contactValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  footerBottom: {
    marginTop: 10,
  },
  copyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trustText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 4,
  },
  designedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  designedByText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '900',
    letterSpacing: 2,
  },
  stackvilLogo: {
    width: 80,
    height: 30,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: -50,
    right: 0,
    padding: 10,
  },
  fullQrImage: {
    width: width * 0.8,
    height: width * 0.8,
  },
  modalHint: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    opacity: 0.5,
  },
  bankDetailTextContainer: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankDetailText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
});
