import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ImageBackground, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useAdmin } from '../../context/AdminContext';

const { width } = Dimensions.get('window');
const BG_IMAGE = require('../../assets/images/bg-internal.jpg');
const LOGO_IMAGE = require('../../assets/images/logo.webp');

const TABS = [
  { id: 'rates', label: 'Rates', icon: 'trending-up' },
  { id: 'news', label: 'News', icon: 'chat-outline' },
  { id: 'media', label: 'Media', icon: 'video-outline' },
  { id: 'market', label: 'Market', icon: 'clock-outline' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { adminSettings, updateSetting, updateRateMod, updateRatesPageMod } = useAdmin();
  const [activeTab, setActiveTab] = useState('rates');

  const handleLogout = () => {
    router.replace('/(tabs)/alerts');
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
             {activeTab === tab.id && <View style={styles.activeIndicator} />}
            <MaterialCommunityIcons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#F9D342' : 'rgba(255,255,255,0.6)'} 
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={BG_IMAGE} style={styles.background} resizeMode="cover">
        
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={LOGO_IMAGE} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.headerTitle}>ABHINAV</Text>
              <Text style={styles.headerSub}>ADMIN DASHBOARD</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
             <MaterialCommunityIcons name="logout" size={18} color="#F9D342" style={{marginRight: 8}} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {renderTabs()}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
          <View style={styles.mainContainer}>
            <View style={styles.contentArea}>
              {activeTab === 'rates' && <RatesTab adminSettings={adminSettings} updateRateMod={updateRateMod} updateSetting={updateSetting} updateRatesPageMod={updateRatesPageMod} />}
              {activeTab === 'news' && <NewsTab adminSettings={adminSettings} updateSetting={updateSetting} />}
              {activeTab === 'media' && <MediaTab adminSettings={adminSettings} updateSetting={updateSetting} />}
              {activeTab === 'market' && <MarketTab adminSettings={adminSettings} updateSetting={updateSetting} />}
            </View>
          </View>
        </KeyboardAvoidingView>

      </ImageBackground>
    </View>
  );
}

/* --- TAB COMPONENTS --- */

const RatesTab = ({ adminSettings, updateRateMod, updateSetting, updateRatesPageMod }) => {
  const mods = adminSettings.rateModifications;
  
  // Mock live prices for display consistency with screenshots
  const LIVE_GOLD = 150530;
  const LIVE_SILVER = 234495;

  const handleUpdate = (id, val) => {
    updateRateMod(id, Number(val) || 0);
  };

  const increment = (id) => updateRateMod(id, (mods[id] || 0) + 1);
  const decrement = (id) => updateRateMod(id, (mods[id] || 0) - 1);

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitleLine}>BASE RATE BUY</Text>
      <Text style={styles.pageTitleLineGold}>MODIFICATION</Text>
      <View style={styles.titleUnderline} />
      
      <View style={styles.modeToggleRow}>
          <TouchableOpacity 
            style={[styles.pillBtn, !mods.isModifiedMode ? styles.pillBtnActive : styles.pillBtnInactive]}
            onPress={() => updateRateMod('isModifiedMode', false)}
          >
            <Text style={[styles.pillText, !mods.isModifiedMode && styles.pillTextActive]}>LIVE MODE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pillBtn, mods.isModifiedMode ? styles.pillBtnActive : styles.pillBtnInactive]}
            onPress={() => updateRateMod('isModifiedMode', true)}
          >
            <Text style={[styles.pillText, mods.isModifiedMode && styles.pillTextActive]}>MODIFIED MODE</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.cardGroup}>
        <RateCard 
          title="GOLD BUY MODIFICATION" 
          sub="GOLD 999 (100 GRAMS)"
          live={LIVE_GOLD}
          offset={mods.gold999_buy} 
          onInc={() => increment('gold999_buy')} 
          onDec={() => decrement('gold999_buy')} 
          onChg={(v) => handleUpdate('gold999_buy', v)} 
        />
        <RateCard 
          title="SILVER BUY MODIFICATION" 
          sub="SILVER 999 (5 KGS)"
          live={LIVE_SILVER}
          offset={mods.silver999_buy} 
          onInc={() => increment('silver999_buy')} 
          onDec={() => decrement('silver999_buy')} 
          onChg={(v) => handleUpdate('silver999_buy', v)} 
        />
      </View>

      <Text style={[styles.pageTitleLine, {marginTop: 40}]}>RATES PAGE</Text>
      <Text style={styles.pageTitleLineGold}>MODIFICATION</Text>
      <View style={styles.titleUnderline} />
      <Text style={styles.infoPara}>MODIFY THE PRICES SHOWN EXCLUSIVELY ON THE 'RATES' TAB. THESE SETTINGS WILL NOT AFFECT THE HOME SCREEN.</Text>
      
      <View style={styles.modeToggleRow}>
          <TouchableOpacity 
            style={[styles.pillBtn, !adminSettings.ratesPageModifications.isModifiedMode ? styles.pillBtnActive : styles.pillBtnInactive]}
            onPress={() => updateRatesPageMod('isModifiedMode', false)}
          >
            <Text style={[styles.pillText, !adminSettings.ratesPageModifications.isModifiedMode && styles.pillTextActive]}>LIVE MODE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pillBtn, adminSettings.ratesPageModifications.isModifiedMode ? styles.pillBtnActive : styles.pillBtnInactive]}
            onPress={() => updateRatesPageMod('isModifiedMode', true)}
          >
            <Text style={[styles.pillText, adminSettings.ratesPageModifications.isModifiedMode && styles.pillTextActive]}>MODIFIED MODE</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.cardGroup}>
        <RateCard 
          title="RATES PAGE GOLD" 
          sub="GOLD 999 (100 GRAMS)"
          live={LIVE_GOLD}
          offset={adminSettings.ratesPageModifications.gold999} 
          onInc={() => updateRatesPageMod('gold999', adminSettings.ratesPageModifications.gold999 + 1)} 
          onDec={() => updateRatesPageMod('gold999', adminSettings.ratesPageModifications.gold999 - 1)} 
          onChg={(v) => updateRatesPageMod('gold999', Number(v) || 0)} 
        />
        <RateCard 
          title="RATES PAGE SILVER" 
          sub="SILVER 999 (5 KGS)"
          live={LIVE_SILVER}
          offset={adminSettings.ratesPageModifications.silver999} 
          onInc={() => updateRatesPageMod('silver999', adminSettings.ratesPageModifications.silver999 + 1)} 
          onDec={() => updateRatesPageMod('silver999', adminSettings.ratesPageModifications.silver999 - 1)} 
          onChg={(v) => updateRatesPageMod('silver999', Number(v) || 0)} 
        />
      </View>

      <Text style={[styles.pageTitleLine, {marginTop: 40}]}>STOCK CONTROL</Text>
      <View style={styles.titleUnderline} />
      <Text style={styles.infoPara}>MANUALLY OVERRIDE THE STOCK STATUS FOR INDIVIDUAL ITEMS.</Text>

      <View style={styles.stockList}>
          <StockItem 
            label="GOLD 999 (100 GRAMS)" 
            inStock={adminSettings.stockStatus['gold999']} 
            onToggle={() => updateSetting('stockStatus', { ...adminSettings.stockStatus, gold999: !adminSettings.stockStatus.gold999 })} 
          />
          <StockItem 
            label="SILVER 999 (30 KGS)" 
            inStock={adminSettings.stockStatus['silver999']} 
            onToggle={() => updateSetting('stockStatus', { ...adminSettings.stockStatus, silver999: !adminSettings.stockStatus.silver999 })} 
          />
      </View>

      <TouchableOpacity style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={20} color="#F9D342" style={{marginRight: 10}} />
          <Text style={styles.refreshBtnText}>FORCE MANUAL REFRESH</Text>
      </TouchableOpacity>

      <View style={{height: 100}} />
    </ScrollView>
  );
};

const NewsTab = ({ adminSettings, updateSetting }) => {
  const [ticker, setTicker] = useState(adminSettings.ticker);
  return (
    <View style={styles.tabFull}>
      <Text style={styles.pageTitleLineGold}>NEWS & TICKER</Text>
       <View style={styles.titleUnderline} />
      <Text style={styles.groupLabel}>TICKER MESSAGE</Text>
      <BlurView intensity={20} tint="dark" style={styles.textCard}>
        <TextInput style={styles.textArea} multiline value={ticker} onChangeText={setTicker} placeholder="Enter ticker message..." placeholderTextColor="rgba(255,255,255,0.3)" />
      </BlurView>
      <TouchableOpacity style={styles.actionBtn} onPress={() => updateSetting('ticker', ticker)}>
        <MaterialCommunityIcons name="content-save-outline" size={20} color="#000" style={{ marginRight: 10 }} />
        <Text style={styles.actionBtnText}>UPDATE TICKER</Text>
      </TouchableOpacity>
    </View>
  );
};

const MediaTab = ({ adminSettings, updateSetting }) => {
  const [newId, setNewId] = useState('');
  const videos = adminSettings.videos;

  const getYoutubeId = (url) => {
    if (!url) return '';
    // If it's already an 11-character ID, return it
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    
    // Robust YouTube ID extraction regex
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : url;
  };

  const addVideo = () => {
    if (!newId) return;
    const vidId = getYoutubeId(newId);
    // Avoid duplicates
    if (videos.some(v => v.id === vidId)) {
      Alert.alert('Error', 'This video is already in the gallery.');
      return;
    }
    updateSetting('videos', [...videos, { id: vidId, videoId: vidId, label: 'Visual Content' }]);
    setNewId('');
  };
  const removeVideo = (id) => updateSetting('videos', videos.filter(v => v.id !== id));

  return (
    <ScrollView style={styles.tabScroll}>
      <Text style={styles.pageTitleLineGold}>MEDIA GALLERY</Text>
       <View style={styles.titleUnderline} />
      <BlurView intensity={20} tint="dark" style={styles.addMediaCard}>
        <TextInput 
          style={styles.input} 
          placeholder="Paste YouTube Link or ID" 
          value={newId} 
          onChangeText={setNewId} 
          placeholderTextColor="rgba(255,255,255,0.3)" 
        />
        <TouchableOpacity style={styles.smallActionBtn} onPress={addVideo}><Text style={styles.smallActionBtnText}>+ ADD VIDEO</Text></TouchableOpacity>
      </BlurView>
      <Text style={[styles.groupLabel, {marginTop: 30}]}>ACTIVE VIDEOS ({videos.length})</Text>
      {videos.map(v => {
        const vidId = getYoutubeId(v.videoId || v.id);
        return (
          <BlurView intensity={20} tint="dark" key={v.id} style={styles.mediaItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Image 
                source={{ uri: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` }} 
                style={styles.adminThumb} 
                resizeMode="cover" 
              />
              <Text style={styles.mediaText} numberOfLines={1}>{vidId}</Text>
            </View>
            <TouchableOpacity onPress={() => removeVideo(v.id)} style={{ padding: 10 }}>
              <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </BlurView>
        );
      })}
    </ScrollView>
  );
};

const MarketTab = ({ adminSettings, updateSetting }) => {
  const status = adminSettings.marketStatus;
  return (
    <View style={styles.tabFull}>
       <Text style={styles.pageTitleLineGold}>MARKET STATUS</Text>
       <View style={styles.titleUnderline} />
       <Text style={styles.groupLabel}>MANUAL OVERRIDE</Text>
        <View style={styles.modeToggleRow}>
          <TouchableOpacity 
            style={[styles.pillBtn, status.overrideStatus === 'open' ? styles.pillBtnActive : styles.pillBtnInactive]} 
            onPress={() => updateSetting('marketStatus', {...status, overrideStatus: 'open', mode: 'modified'})}
          >
            <Text style={[styles.pillText, status.overrideStatus === 'open' && styles.pillTextActive]}>FORCE OPEN</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pillBtn, status.overrideStatus === 'closed' ? styles.pillBtnActiveRed : styles.pillBtnInactive]} 
            onPress={() => updateSetting('marketStatus', {...status, overrideStatus: 'closed', mode: 'modified'})}
          >
             <Text style={[styles.pillText, status.overrideStatus === 'closed' && styles.pillTextActive]}>FORCE CLOSED</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.refreshBtn, { marginTop: 10, borderColor: status.mode === 'regular' ? '#F9D342' : 'rgba(255,255,255,0.1)' }]} 
          onPress={() => updateSetting('marketStatus', {...status, mode: 'regular'})}
        >
           <MaterialCommunityIcons name="clock-outline" size={20} color={status.mode === 'regular' ? "#F9D342" : "rgba(255,255,255,0.4)"} style={{marginRight: 10}} />
           <Text style={[styles.refreshBtnText, status.mode !== 'regular' && { color: 'rgba(255,255,255,0.4)' }]}>RESET TO REGULAR HOURS</Text>
        </TouchableOpacity>
    </View>
  );
};

/* --- SHARED SUB-COMPONENTS --- */

const RateCard = ({ title, sub, live, offset, onInc, onDec, onChg }) => {
  const alt = live + offset;
  return (
    <BlurView intensity={20} tint="dark" style={styles.rateCard}>
      <View style={styles.rateCardHeader}>
        <Text style={styles.rateCardTitle}>{title}</Text>
        <View style={styles.fixedTag}><Text style={styles.fixedTagText}>₹ Fixed Amount</Text></View>
      </View>
      
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>LIVE:</Text>
        <Text style={styles.livePrice}>₹{live.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabelAlt}>ALT:</Text>
        <Text style={styles.altPrice}>₹{alt.toLocaleString('en-IN')}</Text>
      </View>

      <Text style={styles.productSub}>{sub}</Text>
      
      <View style={styles.stepperContainer}>
          <TouchableOpacity onPress={onDec} style={styles.stepperAction}><Text style={styles.stepperIcon}>-</Text></TouchableOpacity>
          <BlurView intensity={10} tint="dark" style={styles.stepperInputWrap}>
             <TextInput style={styles.stepperInput} value={String(offset)} onChangeText={onChg} keyboardType="numeric" />
          </BlurView>
          <TouchableOpacity onPress={onInc} style={styles.stepperAction}><Text style={styles.stepperIcon}>+</Text></TouchableOpacity>
      </View>
    </BlurView>
  );
};

const StockItem = ({ label, inStock, onToggle }) => (
  <BlurView intensity={20} tint="dark" style={styles.stockCard}>
      <Text style={styles.stockLabel}>{label}</Text>
      <TouchableOpacity style={[styles.stockStatusBtn, inStock ? styles.bgGreen : styles.bgRed]} onPress={onToggle}>
          <Text style={styles.stockStatusText}>{inStock ? 'IN STOCK' : 'OUT OF STOCK'}</Text>
      </TouchableOpacity>
  </BlurView>
);

/* --- STYLES --- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 40, height: 40, marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: '#F9D342', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F9D342', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  
  tabBar: { backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabBarContent: { paddingHorizontal: 20, alignItems: 'center' },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginRight: 15 },
  tabItemActive: { backgroundColor: '#F9D34220' },
  activeIndicator: { position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4, backgroundColor: '#F9D342', borderRadius: 2 },
  tabLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '900' },
  tabLabelActive: { color: '#FFF' },

  mainContainer: { flex: 1 },
  contentArea: { flex: 1, padding: 20 },
  tabScroll: { flex: 1 },
  tabFull: { flex: 1 },

  pageTitleLine: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  pageTitleLineGold: { color: '#F9D342', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  titleUnderline: { width: 100, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
  infoPara: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', lineHeight: 18, marginBottom: 30 },

  modeToggleRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25, padding: 5, marginBottom: 30 },
  pillBtn: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 20 },
  pillBtnActive: { backgroundColor: '#F9D342' },
  pillBtnActiveRed: { backgroundColor: '#B71C1C' },
  pillBtnInactive: { backgroundColor: 'transparent' },
  pillText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900' },
  pillTextActive: { color: '#000' },

  cardGroup: { gap: 20 },
  rateCard: { padding: 25, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  rateCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  rateCardTitle: { color: '#F9D342', fontSize: 14, fontWeight: '900' },
  fixedTag: { backgroundColor: 'rgba(77,175,123,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  fixedTagText: { color: '#4DAF7B', fontSize: 11, fontWeight: '900' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '900' },
  priceLabelAlt: { color: '#4DAF7B', fontSize: 13, fontWeight: '900' },
  livePrice: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  altPrice: { color: '#4DAF7B', fontSize: 16, fontWeight: '900' },
  productSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', marginVertical: 15 },
  
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  stepperAction: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  stepperIcon: { color: '#F9D342', fontSize: 24, fontWeight: 'bold' },
  stepperInputWrap: { flex: 1, height: 45, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  stepperInput: { flex: 1, textAlign: 'center', color: '#F9D342', fontSize: 24, fontWeight: '900' },

  stockList: { gap: 15 },
  stockCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  stockLabel: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  stockStatusBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  stockStatusText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  bgGreen: { backgroundColor: '#10b981' },
  bgRed: { backgroundColor: '#ef4444' },

  refreshBtn: { borderWidth: 2, borderColor: '#F9D34230', height: 60, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  refreshBtnText: { color: '#F9D342', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  groupLabel: { color: '#F9D342', fontSize: 14, fontWeight: '900', marginBottom: 15 },
  textCard: { height: 180, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  textArea: { flex: 1, color: '#FFF', fontSize: 18, textAlignVertical: 'top' },
  actionBtn: { backgroundColor: '#F9D342', height: 60, borderRadius: 20, marginTop: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },

  addMediaCard: { padding: 25, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  input: { height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingHorizontal: 20, color: '#FFF', marginBottom: 15, fontSize: 16 },
  smallActionBtn: { backgroundColor: '#F9D342', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  smallActionBtnText: { color: '#000', fontSize: 13, fontWeight: '900' },
  mediaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mediaText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800', flex: 1 },
  adminThumb: { width: 60, height: 40, borderRadius: 8, marginRight: 15, backgroundColor: 'rgba(0,0,0,0.3)' },
});
