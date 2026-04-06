import { StyleSheet, View, ImageBackground, StatusBar, Image, Animated, Text, Easing, Dimensions, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../context/AdminContext';
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
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const { adminSettings } = useAdmin();
  const [tickerWidth, setTickerWidth] = useState(0);
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const timestamp = Date.now();
        // Priority: Production /alerts API
        const res = await fetch(`${API_ENDPOINTS.ALERTS}?_=${timestamp}`);
        
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNews(data);
            return;
          } else if (data.alerts && Array.isArray(data.alerts)) {
            setNews(data.alerts);
            return;
          }
        }
        
        // Fallback to legacy RSS if backend is not yet providing alerts
        const rssRes = await fetch(`https://www.investing.com/rss/news_11.rss?_=${timestamp}`);
        const text = await rssRes.text();
        if (!text) return;
        const items = text.match(/<item>([\s\S]*?)<\/item>/g);
        if (!items) return;

        const parsed = items.map((it, idx) => {
          const titleMatch = it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || it.match(/<title>(.*?)<\/title>/);
          const title = titleMatch?.[1];
          const pubDate = it.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
          return {
            id: `news-${idx}`,
            title: title?.replace(/&amp;/g, '&'),
            msg: title?.replace(/&amp;/g, '&'),
            date: pubDate || '',
            type: (title?.toLowerCase().includes('surge') || title?.toLowerCase().includes('fall')) ? 'urgent' : 'info'
          };
        }).slice(0, 10);
        setNews(parsed);
      } catch (error) {
        console.log('Error fetching alerts from backend/rss:', error);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 60000); // Update every minute
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
  }, [adminSettings.ticker]);

  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={BG_IMAGE} style={styles.background} resizeMode="cover">
        
        <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}>
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
                  {adminSettings.ticker}
                </Text>
                {Array.from({ length: 15 }).map((_, i) => (
                  <Text key={i} style={styles.tickerText} numberOfLines={1}>{adminSettings.ticker}</Text>
                ))}
              </Animated.View>
            </View>
          </ImageBackground>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.newsSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="bell" size={24} color="#F9D342" style={{ marginRight: 10 }} />
              <Text style={styles.sectionTitle}>MARKET ALERTS</Text>
            </View>

            {news.length > 0 ? (
              news.map((item) => (
                <View key={item.id} style={[styles.newsCard, item.type === 'urgent' ? styles.urgentBorder : styles.infoBorder]}>
                  <View style={styles.newsCardHeader}>
                    <View>
                      <Text style={styles.newsTitle}>{item.title}</Text>
                      <View style={styles.newsDateRow}>
                        <MaterialCommunityIcons name="calendar" size={12} color="rgba(255,255,255,0.6)" style={{ marginRight: 5 }} />
                        <Text style={styles.newsDateText}>{item.date}</Text>
                      </View>
                    </View>
                    <View style={[styles.typeBadge, item.type === 'urgent' ? styles.urgentBadge : styles.infoBadge]}>
                      <Text style={[styles.typeBadgeText, item.type === 'urgent' ? styles.urgentBadgeText : styles.infoBadgeText]}>{item.type.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.newsMsg}>{item.msg}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noNewsCard}>
                <MaterialCommunityIcons name="information" size={30} color="#F9D342" style={{ marginBottom: 10 }} />
                <Text style={styles.noNewsText}>Fetching latest market updates...</Text>
              </View>
            )}
          </View>

          {/* Footer Implementation */}
          <View style={styles.footer}>
            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>BANK & LOCATION QR</Text>
              <View style={styles.qrRow}>
                <TouchableOpacity style={styles.qrContainer} onPress={() => openLink('https://wa.me/919441055916')}>
                  <Image source={QR_BANK} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrLabelText}>BANK DETAILS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qrContainer} onPress={() => openLink('https://www.google.com/maps?q=16.2366,80.6477')}>
                  <Image source={QR_LOCATION} style={styles.qrImage} resizeMode="contain" />
                  <Text style={styles.qrLabelText}>OUR LOCATION</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerSection}>
              <View style={styles.brandingRow}>
              <TouchableOpacity onPress={() => router.push('/admin')}>
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
                  <MaterialCommunityIcons name="instagram" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.facebook.com/')}>
                  <MaterialCommunityIcons name="facebook" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon} onPress={() => openLink('https://www.youtube.com/@abhinavjewellery')}>
                  <MaterialCommunityIcons name="youtube" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerSection}>
              <Text style={styles.footerLabel}>WHY CHOOSE US</Text>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#F9D342" style={{ marginRight: 10 }} />
                <Text style={styles.featureText}>100% Purity Guaranteed</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#F9D342" style={{ marginRight: 10 }} />
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
                <View style={styles.contactIconContainer}><MaterialCommunityIcons name="phone" size={18} color="#F9D342" /></View>
                <View>
                  <Text style={styles.contactSmallLabel}>WHATSAPP / CALL</Text>
                  <Text style={styles.contactValue}>+91 94410 55916</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactItem} onPress={() => openLink('mailto:info@abhinavjewellers.com')}>
                <View style={styles.contactIconContainer}><MaterialCommunityIcons name="email" size={18} color="#F9D342" /></View>
                <View>
                  <Text style={styles.contactSmallLabel}>EMAIL SUPPORT</Text>
                  <Text style={styles.contactValue}>info@abhinavjewellers.com</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}><MaterialCommunityIcons name="map-marker" size={18} color="#F9D342" /></View>
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
  },
  urgentBorder: {
    borderColor: '#E6007A', // Magenta
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
  urgentBadge: {
    backgroundColor: 'rgba(230,0,122,0.15)',
  },
  infoBadge: {
    backgroundColor: 'rgba(74,144,226,0.15)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  urgentBadgeText: {
    color: '#E6007A',
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
});
