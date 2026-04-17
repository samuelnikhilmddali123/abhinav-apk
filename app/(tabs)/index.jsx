import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  StatusBar,
  RefreshControl,
  ScrollView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WEBSITE_URL } from '../../constants/Config';

const WEB_URL = WEBSITE_URL;
const GOLD_COLOR = '#FFD700';

const injectedJS = `
(function() {
  // --- 1. HIDE REDUNDANT NAVIGATION ---
  function hideNavigation() {
    const footerSelectors = [
      'footer', '.footer', '.bottom-nav', '.mobile-nav', 
      '.navbar-fixed-bottom', '.bottom-menu', '#footer', 
      '.tab-bar', '.navigation-bar', '.mobile-footer', 'nav', '.nav'
    ];

    footerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && (style.bottom === '0px' || parseInt(style.bottom) < 50)) {
           el.style.setProperty('display', 'none', 'important');
        }
        if (el.tagName === 'FOOTER' || el.classList.contains('footer')) {
           el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (link.href.includes('home1') || link.innerText.toLowerCase().includes('home 1')) {
        link.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // --- 2. MOBILE TABLE STYLING FIX ---
  function applyMobileTableFix() {
    if (window.innerWidth > 768) return;

    const styleId = 'mobile-table-fix';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = \`
      /* Match Website's Hero.jsx / index.css scrolling logic */
      @media (max-width: 768px) {
        .rates-scroll-wrapper {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding-bottom: 15px !important;
        }

        .rates-table {
          min-width: 520px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }

        .rate-row {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
        }
      }

      /* Fixed column widths to prevent squishing (from website CSS) */
      .product-column { min-width: 120px !important; }
      .buy-column      { min-width: 130px !important; }
      .sell-column     { min-width: 130px !important; }
      .hilo-column     { min-width: 140px !important; }
      
      .buy-box, .sell-box, .hi-lo-box {
          min-width: 110px !important;
      }

      /* Ensure no scroll snapping interferes */
      * {
        scroll-snap-type: none !important;
        scroll-snap-align: none !important;
      }
    \`;
    document.head.appendChild(style);
  }

  // Initial runs
  hideNavigation();
  applyMobileTableFix();

  // Periodical triggers for dynamic content
  const interval = setInterval(() => {
    hideNavigation();
    applyMobileTableFix();
  }, 1000);
  setTimeout(() => clearInterval(interval), 10000);

  // --- 3. SCROLL POSITION REPORTING ---
  window.addEventListener('scroll', function() {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'scroll',
        scrollY: window.scrollY
      })
    );
  });
})();
`;

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  // Check Internet Connection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = useCallback(() => {
    if (!isAtTop) return;
    
    setRefreshing(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
    // Timeout for safety
    setTimeout(() => setRefreshing(false), 1500);
  }, [isAtTop]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "scroll") {
        setIsAtTop(data.scrollY <= 0);
      }
    } catch (e) {}
  };

  const handleRetry = () => {
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected && webViewRef.current) {
        webViewRef.current.reload();
      }
    });
  };

  if (!isConnected) {
    return (
      <View style={styles.offlineContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <MaterialCommunityIcons name="wifi-off" size={64} color={GOLD_COLOR} style={{ marginBottom: 20 }} />
        <Text style={styles.offlineTitle}>No Internet Connection</Text>
        <Text style={styles.offlineSubTitle}>Please check your network settings and try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <View style={styles.webViewWrapper}>
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          scrollEnabled={refreshing}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GOLD_COLOR]}
              tintColor={GOLD_COLOR}
              enabled={isAtTop}
            />
          }
        >
          <WebView 
            ref={webViewRef}
            source={{ uri: WEB_URL }}
            style={styles.webView}
            injectedJavaScript={injectedJS}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={onMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              setIsLoading(false);
              setRefreshing(false);
            }}
            pullToRefreshEnabled={false}
            allowsBackForwardNavigationGestures={true}
            startInLoadingState={true}
            renderLoading={() => null} 
          />
        </ScrollView>
        
        {isLoading && !refreshing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GOLD_COLOR} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webViewWrapper: {
    flex: 1,
    backgroundColor: 'black',
  },
  webView: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  offlineContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 30,
    elevation: 5,
    shadowColor: GOLD_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  offlineTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  offlineSubTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
