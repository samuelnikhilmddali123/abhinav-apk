import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../constants/Config';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  rateModifications: {
    gold999_buy: 0,
    silver999_buy: 0,
    gold999_sell: 0,
    silver999_sell: 0,
    isModifiedMode: false,
  },
  ratesPageModifications: {
    gold999: 0,
    silver999: 0,
    isModifiedMode: false,
  },
  ticker: '✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ',
  marketStatus: {
    mode: 'regular',
    overrideStatus: 'open',
    openTime: '10:00 AM',
    closeTime: '08:00 PM',
  },
  stockStatus: {
    gold999: true,
    silver999: true,
  },
  videos: [],
  music: null,
};

/** Same source as abhanav-website `GET /api/videos` — `{ videoId, title }[]` */
function normalizeVideosFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map((v, i) => {
    const vid = v?.videoId || v?.id;
    const title = v?.title || v?.label || 'Gold Price Update';
    return {
      id: v?.id || vid || `video-${i}`,
      videoId: vid,
      title,
      label: v?.label || title,
    };
  }).filter((x) => x.videoId);
}

function mapBackendToAppSettings(data) {
  // Support both possible response shapes:
  // - direct settings object (preferred)
  // - wrapper like { settings: {...} }
  const src = data?.settings && typeof data.settings === 'object' ? data.settings : data;

  return {
    rateModifications: {
      gold999_buy: src?.goldOffset?.value ?? src?.gold?.value ?? 0,
      silver999_buy: src?.silverOffset?.value ?? src?.silver?.value ?? 0,
      gold999_sell: src?.baseModifications?.gold999?.value ?? 0,
      silver999_sell: src?.baseModifications?.silver999?.value ?? 0,
      isModifiedMode: src?.showModified ?? false,
    },
    ratesPageModifications: {
      gold999: src?.ratesPage?.goldTable?.value ?? src?.ratesPage?.gold?.value ?? 0,
      silver999: src?.ratesPage?.silverTable?.value ?? src?.ratesPage?.silver?.value ?? 0,
      isModifiedMode: src?.ratesPage?.showModified ?? false,
    },
    ticker: src?.ticker ?? DEFAULT_SETTINGS.ticker,
    marketStatus: {
      mode: src?.marketStatus?.mode ?? DEFAULT_SETTINGS.marketStatus.mode,
      overrideStatus:
        src?.marketStatus?.overrideStatus ??
        src?.marketStatus?.modifiedStatus ??
        DEFAULT_SETTINGS.marketStatus.overrideStatus,
      openTime: src?.marketStatus?.openTime ?? DEFAULT_SETTINGS.marketStatus.openTime,
      closeTime: src?.marketStatus?.closeTime ?? DEFAULT_SETTINGS.marketStatus.closeTime,
    },
    stockStatus: src?.stockOverrides ?? src?.stockStatus ?? DEFAULT_SETTINGS.stockStatus,
  };
}

export function SettingsProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const fetchMusicSettings = useCallback(async () => {
    if (!API_ENDPOINTS.MUSIC) return;
    try {
      const res = await fetch(API_ENDPOINTS.MUSIC);
      if (res.ok) {
        let data = await res.json();
        // Handle both single object and list formats
        const musicData = Array.isArray(data) ? data[0] : data;
        if (musicData) {
          setSettings(prev => ({ ...prev, music: musicData }));
        }
      }
    } catch (e) {
      console.log('Failed to fetch music settings:', e);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!API_ENDPOINTS.RATE_SETTINGS) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(API_ENDPOINTS.RATE_SETTINGS);
      if (res.ok) {
        const data = await res.json();
        const mapped = mapBackendToAppSettings(data);
        setSettings(prev => ({ ...prev, ...mapped }));
      }
    } catch (e) {
      console.log('Failed to fetch settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    if (!API_ENDPOINTS.VIDEOS) return;
    try {
      const res = await fetch(API_ENDPOINTS.VIDEOS);
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeVideosFromApi(data);
        setSettings(prev => ({ ...prev, videos: normalized }));
      }
    } catch (e) {
      console.log('Failed to fetch videos:', e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 3000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  useEffect(() => {
    fetchMusicSettings();
    fetchVideos();
    const interval = setInterval(() => {
        fetchMusicSettings();
        fetchVideos();
    }, 60000); // 1 minute for static assets
    return () => clearInterval(interval);
  }, [fetchMusicSettings, fetchVideos]);

  const value = useMemo(() => ({ settings, isLoading, refresh: fetchSettings }), [settings, isLoading, fetchSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

