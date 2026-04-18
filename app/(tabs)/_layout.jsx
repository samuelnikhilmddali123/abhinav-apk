import React, { useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { stopAllScreenMusicOnTabChange } from '../../constants/tabScreenMusicStop';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation }) {
  const prevIndexRef = useRef(state.index);

  useEffect(() => {
    if (prevIndexRef.current !== state.index) {
      prevIndexRef.current = state.index;
      stopAllScreenMusicOnTabChange();
    }
  }, [state.index]);

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={85} tint="dark" style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const isHome = route.name === 'index';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = route.name === 'index' ? 'home' :
                           route.name === 'rates' ? 'chart-line' :
                           route.name === 'alerts' ? 'bell' : 
                           'play-circle';

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              activeOpacity={0.8}
              style={[
                styles.tabButton,
                isHome && { marginTop: 15 } // Keeps the Home button offset as preferred
              ]}
            >
              {isFocused ? (
                <LinearGradient
                  colors={['#FFD700', '#B8860B']}
                  style={styles.activeIndicator}
                >
                  <MaterialCommunityIcons
                    name={iconName}
                    size={28}
                    color="#000"
                  />
                </LinearGradient>
              ) : (
                <MaterialCommunityIcons
                  name={iconName}
                  size={26}
                  color="#D4AF37"
                  style={styles.inactiveIcon}
                />
              )}
              <Text style={[
                styles.tabLabel, 
                { color: isFocused ? '#FFD700' : '#D4AF37', opacity: isFocused ? 1 : 0.6 }
              ]}>
                {label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        tabBarTransparent: true,
        headerStyle: {
          backgroundColor: '#1A0B2E',
        },
        headerTintColor: '#F9D342',
        headerTitleStyle: {
          fontWeight: '300',
          letterSpacing: 2,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          headerShown: false,
        }} 
      />
      <Tabs.Screen name="rates" options={{ title: 'Rates', headerShown: false }} />
      <Tabs.Screen name="videos" options={{ title: 'Videos', headerShown: false }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
  },
  container: {
    flexDirection: 'row',
    width: width * 0.92,
    height: 85,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Translucent black for glass effect
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20,
    overflow: 'hidden', // Required for BlurView rounding
  },

  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 5,
  },
  inactiveIcon: {
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});




