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
      gold999_buy: src?.goldOffset?.value ?? 0,
      silver999_buy: src?.silverOffset?.value ?? 0,
      gold999_sell: src?.baseModifications?.gold999?.value ?? 0,
      silver999_sell: src?.baseModifications?.silver999?.value ?? 0,
      isModifiedMode: src?.showModified ?? false,
    },
    ratesPageModifications: {
      gold999: src?.ratesPage?.gold?.value ?? 0,
      silver999: src?.ratesPage?.silver?.value ?? 0,
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
    videos: Array.isArray(src?.videos) ? src.videos : DEFAULT_SETTINGS.videos,
  };
}

export function SettingsProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const fetchSettings = useCallback(async () => {
    try {
      // Website uses `/api/rates/settings` for offsets/ticker/stock (same as web RateContext).
      let res = await fetch(`${API_ENDPOINTS.RATE_SETTINGS}?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        res = await fetch(`${API_ENDPOINTS.SETTINGS}?_=${Date.now()}`, { cache: 'no-store' });
      }
      if (!res.ok) return;
      const data = await res.json();
      const mapped = mapBackendToAppSettings(data);

      // Website loads the video gallery from `GET /api/videos` (separate collection), not only RateSettings.
      let videos = mapped.videos;
      try {
        const vRes = await fetch(`${API_ENDPOINTS.VIDEOS}?_=${Date.now()}`, { cache: 'no-store' });
        if (vRes.ok) {
          const list = await vRes.json();
          if (Array.isArray(list)) {
            videos = normalizeVideosFromApi(list);
          }
        }
      } catch (e) {
        /* keep videos from settings */
      }

      setSettings((prev) => ({ ...prev, ...mapped, videos }));
    } catch (e) {
      // Keep last-known settings on network failure.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  const value = useMemo(() => ({ settings, isLoading, refresh: fetchSettings }), [settings, isLoading, fetchSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

