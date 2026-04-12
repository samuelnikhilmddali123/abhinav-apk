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

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemActive
              ]}
            >
              <View style={styles.iconContainer}>
                <TabBarIcon
                  name={
                    route.name === 'index' ? 'home' :
                    route.name === 'rates' ? 'bar-chart' :
                    route.name === 'alerts' ? 'bell' : 
                    'play-circle'
                  }
                  color={isFocused ? activeColor : inactiveColor}
                />
                {isFocused && <View style={styles.activeDot} />}
              </View>
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? activeColor : inactiveColor }
              ]}>
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
    backgroundColor: '#0F051D', // Darker background for tab bar
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  topBorder: {
    height: 1,
    backgroundColor: '#F9D342', // Gold top border
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 80,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 15,
  },
  tabItemActive: {
    backgroundColor: 'rgba(61, 11, 46, 0.4)', // Dark maroon/purple tint from image
    borderWidth: 1,
    borderColor: 'rgba(249, 211, 66, 0.5)', // Gold border
    marginHorizontal: 4,
    shadowColor: '#F9D342',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F9D342',
    marginTop: 2,
    position: 'absolute',
    bottom: -8,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});
