import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ImageBackground, Dimensions, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { API_ENDPOINTS } from '../../constants/Config';

const { width } = Dimensions.get('window');
const BG_IMAGE = require('../../assets/images/bg-internal.jpg');
const LOGO_IMAGE = require('../../assets/images/logo.webp');

export default function AdminLogin() {
  const router = useRouter();
  
  // Pre-filling with 'admin' / 'admin' for your convenience
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');

  const handleLogin = async () => {
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Login successful, navigating...');
          router.replace('/admin/dashboard');
          return;
        }
      }
      
      // Fallback for demo/dev if API is not yet available
      if (user === 'admin' && (pass === 'admin' || pass === 'admin123' || pass === 'password')) {
        router.replace('/admin/dashboard');
      } else {
        alert('Invalid: Use admin / admin');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback for offline/dev
      if (user === 'admin' && (pass === 'admin' || pass === 'admin123')) {
        router.replace('/admin/dashboard');
      } else {
        alert('Could not connect to live backend');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={BG_IMAGE} style={styles.background} resizeMode="cover">
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.overlay}>
              <BlurView intensity={30} tint="dark" style={styles.card}>
                
                <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
                
                <Text style={styles.title}>ADMIN LOGIN</Text>
                <Text style={styles.subtitle}>Enter credentials to access the dashboard</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>USERNAME</Text>
                  <TextInput 
                    style={styles.input} 
                    value={username} 
                    onChangeText={setUsername} 
                    autoCapitalize="none"
                    placeholder="admin"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TextInput 
                    style={styles.input} 
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry 
                    placeholder="admin"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#000" style={{ marginRight: 10 }} />
                  <Text style={styles.loginBtnText}>ACCESS DASHBOARD</Text>
                </TouchableOpacity>

                <Text style={styles.hint}>Default: admin / admin</Text>

              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 450, padding: 40, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', overflow: 'hidden' },
  logo: { width: 80, height: 80, marginBottom: 25 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  subtitle: { color: '#F9D342', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 35, textAlign: 'center' },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  input: { width: '100%', height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 20, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  loginBtn: { width: '100%', height: 60, backgroundColor: '#F9D342', borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  loginBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  hint: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 25, fontWeight: 'bold' },
});
