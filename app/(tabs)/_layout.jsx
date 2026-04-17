import React, { useEffect, useRef } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { stopAllScreenMusicOnTabChange } from '../../constants/tabScreenMusicStop';

function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

function CustomTabBar({ state, descriptors, navigation }) {
  const prevIndexRef = useRef(state.index);

  useEffect(() => {
    if (prevIndexRef.current !== state.index) {
      prevIndexRef.current = state.index;
      stopAllScreenMusicOnTabChange();
    }
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.topBorder} />
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

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

          const activeColor = '#F9D342'; // Gold
          const inactiveColor = '#8E8E93';

          const iconName = route.name === 'index' ? 'home' :
                           route.name === 'rates' ? 'bar-chart' :
                           route.name === 'alerts' ? 'bell' : 
                           'play-circle';

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={isFocused ? styles.activeTabButton : styles.inactiveTabButton}
            >
              <FontAwesome
                name={iconName}
                size={20}
                color={isFocused ? "#FFD700" : "#9CA3AF"}
                style={{ backgroundColor: 'transparent' }}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? "#FFD700" : "#9CA3AF" }]}>
                {label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1A0B2E',
        },
        headerTintColor: '#F9D342', // Gold header text
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
  tabBarContainer: {
    backgroundColor: '#0F051D',
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
  },
  topBorder: {
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 85,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#1A002B',
  },
  activeTabButton: {
    backgroundColor: '#30084a',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    minWidth: 80,
  },
  inactiveTabButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    minWidth: 80,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 1,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
});
