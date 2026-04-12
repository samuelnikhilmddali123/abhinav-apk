import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { SettingsProvider } from '../context/SettingsContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isReady, setIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().then(() => {
        setIsReady(true);
        // Fade out the static splash screen after 2 seconds
        setTimeout(() => {
          fadeOut();
        }, 2000);
      });
    }
  }, [loaded]);

  const handleVideoStatusUpdate = (status) => {
    if (status.didJustFinish) {
      fadeOut();
    }
  };

  const handleError = () => {
    setVideoError(true);
    setTimeout(() => {
      fadeOut();
    }, 2000); // Wait briefly before fading if fallback is shown
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500, // Smooth 500ms fade
      useNativeDriver: true,
    }).start(() => {
      setSplashVisible(false);
    });
  };

  if (!loaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <RootLayoutNav />
      {splashVisible && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
          <Image
            source={require('../assets/images/Untitled design (2).png')}
            style={{ width: 250, height: 250 }}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SettingsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SettingsProvider>
  );
}
