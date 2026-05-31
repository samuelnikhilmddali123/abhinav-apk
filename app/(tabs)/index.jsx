import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  StatusBar,
  Platform,
  TouchableOpacity,
  Text,
  ScrollView,
  RefreshControl
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { WEBSITE_URL } from '../../constants/Config';

const WEB_URL = WEBSITE_URL;
const GOLD_COLOR = '#FFD700';

const injectedJS = `
(function() {
  function hideNavigation() {
    const isHome = window.location.pathname === '/' || window.location.pathname === '/home1' || window.location.pathname.endsWith('/');
    
    const footerSelectors = [
      'footer', '.footer', '.bottom-nav', '.mobile-nav', 
      '.navbar-fixed-bottom', '.bottom-menu', '#footer', 
      '.tab-bar', '.navigation-bar', '.mobile-footer', 'nav', '.nav'
    ];
    footerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
    });

    const topHeaderSelectors = [
      '.top-nav-wrapper', 
      'div.absolute.top-0.w-full.z-50',
      'div.absolute.top-0',
      'header'
    ];
    topHeaderSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.innerText.includes('ABHINAV') || el.querySelector('img[src*="logo"]')) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });
  }
  hideNavigation();
  setInterval(hideNavigation, 1000);

  function allowLayoutFix() {
    const body = document.body;
    if (body) {
      body.style.paddingTop = "1px";
      body.style.paddingBottom = "100px";
    }
    // Disable zoom
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }
  allowLayoutFix();

  // Scroll Position for logic
  window.addEventListener('scroll', function() {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'scroll',
        scrollY: window.scrollY
      })
    );
  });

  // Inject Custom Premium styling for Website inside WebView
  const style = document.createElement('style');
  style.innerHTML = `
    /* Force extremely clean professional global font */
    * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }
    
    .flex.flex-col.items-center span { color: black !important; }
    span[class*="text-slate-800"] { color: black !important; }
    .animate-ticker-rtl span { color: white !important; font-weight: 900 !important; }

    /* headings style override */
    h2, .text-xl, .text-2xl, h1 {
      font-weight: 900 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      color: #9A155B !important; /* Premium magenta gold styling match */
    }

    /* Price boxes (yellow & green price containers) */
    .bg-yellow-400, .bg-amber-400, .bg-emerald-400, .bg-red-400, .bg-green-400, .bg-blue-400,
    div[class*="bg-amber-"], div[class*="bg-emerald-"], div[class*="bg-yellow-"] {
      border-radius: 12px !important;
      border: 1.2px solid rgba(212, 175, 55, 0.4) !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.18) !important;
      overflow: hidden !important;
      padding: 10px 20px !important;
    }

    /* Price texts inside boxes */
    .text-black.font-black, .text-black.font-bold, span[class*="text-black"] {
      font-weight: 900 !important;
      font-size: 1.15rem !important;
      letter-spacing: 0.5px !important;
    }

    /* Spot Cards at top */
    div[class*="bg-white/"], div[class*="backdrop-blur-"] {
      background-color: rgba(255, 255, 255, 0.9) !important; /* Solid premium white cards */
      border-radius: 14px !important;
      border: 1px solid rgba(212, 175, 55, 0.25) !important;
      box-shadow: 0 6px 12px rgba(0,0,0,0.1) !important;
    }
  `;
  document.head.appendChild(style);

  // Dynamic JS layout modifications
  function applyAppDOMFixes() {
    // Style headings & column pills (PRODUCTS, LIVE, STATUS)
    const allDivs = document.querySelectorAll('button, div, span, p, th');
    allDivs.forEach(el => {
      const text = el.innerText ? el.innerText.trim().toUpperCase() : '';
      if (text === 'PRODUCTS' || text === 'LIVE' || text === 'STATUS' || text === 'BUY' || text === 'SELL' || text === 'HI-LO') {
        el.style.setProperty('font-family', '-apple-system, sans-serif', 'important');
        el.style.setProperty('font-weight', '900', 'important');
        el.style.setProperty('letter-spacing', '1px', 'important');
        el.style.setProperty('font-size', '10px', 'important');
        el.style.setProperty('border-radius', '20px', 'important');
        el.style.setProperty('background-color', '#E2E8F0', 'important'); // Polished light slate gray
        el.style.setProperty('color', '#1E293B', 'important'); // Slate dark text
        el.style.setProperty('border', '1px solid #CBD5E1', 'important');
        el.style.setProperty('padding', '4px 12px', 'important');
        el.style.setProperty('text-transform', 'uppercase', 'important');
      }
    });

    // Remove High/Low from Local Gold & Silver Retail Rates
    const sections = document.querySelectorAll('div, section');
    sections.forEach(section => {
      if (section.innerText && section.innerText.includes('LOCAL GOLD AND SILVER RETAIL RATES')) {
        // Find and hide any headers or cells related to HI-LO or high/low inside this container
        const items = section.querySelectorAll('*');
        items.forEach(item => {
          const itemText = item.innerText ? item.innerText.trim().toUpperCase() : '';
          
          // Hide "HI-LO" pill or texts containing H: / L: / HIGH / LOW
          if (itemText === 'HI-LO' || itemText.includes('H:') || itemText.includes('L:') || itemText.includes('HIGH') || itemText.includes('LOW')) {
            if (!itemText.includes('LOCAL GOLD') && !itemText.includes('RETAIL RATES')) {
              item.style.setProperty('display', 'none', 'important');
            }
          }
        });
      }
    });
  }

  applyAppDOMFixes();
  setTimeout(applyAppDOMFixes, 500);
  setInterval(applyAppDOMFixes, 1500);
})();
`;

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const ni = (NetInfo.default || NetInfo);
    const unsubscribe = ni.addEventListener(state => {
      setIsConnected(state.isConnected !== false);
    });
    return () => unsubscribe();
  }, []);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "scroll") {
        setIsAtTop(data.scrollY <= 0);
      }
    } catch (e) {}
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
    // Safety timeout to hide spinner if reload is fast or fails
    setTimeout(() => setRefreshing(false), 2500);
  }, []);

  if (!isConnected) {
    return (
      <View style={styles.offlineContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={{ fontSize: 60, marginBottom: 20 }}>📡</Text>
        <Text style={styles.offlineTitle}>No Internet Connection</Text>
        <Text style={styles.offlineSubTitle}>Please check your network settings and try again.</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (webViewRef.current) webViewRef.current.reload();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <View style={styles.webViewWrapper}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={isAtTop}
              colors={[GOLD_COLOR]}
              tintColor={GOLD_COLOR}
            />
          }
          scrollEnabled={isAtTop}
        >
          <WebView 
            ref={webViewRef}
            source={{ uri: WEB_URL }}
            style={styles.webView}
            injectedJavaScript={injectedJS}
            onMessage={onMessage}
            onLoadStart={() => {
              setIsLoading(true);
            }}
            onLoadEnd={() => {
              setIsLoading(false);
              setRefreshing(false);
            }}
            pullToRefreshEnabled={false}
            bounces={true}
            overScrollMode="always"
            nestedScrollEnabled={true}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={false}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
          />
        </ScrollView>
        {isLoading && !refreshing && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={GOLD_COLOR} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  webViewWrapper: { flex: 1, backgroundColor: 'black' },
  webView: { flex: 1, backgroundColor: 'black' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  offlineContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  offlineSubTitle: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


