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

  // Force black labels for spot bar to ensure readability in app
  const style = document.createElement('style');
  style.innerHTML = \`
    .flex.flex-col.items-center span { color: black !important; }
    span[class*="text-slate-800"] { color: black !important; }
    .animate-ticker-rtl span { color: white !important; font-weight: 900 !important; }
  \`;
  document.head.appendChild(style);
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


