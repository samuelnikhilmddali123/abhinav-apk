import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../constants/Config';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminSettings, setAdminSettings] = useState({
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
    ticker: "✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ",
    marketStatus: {
      mode: 'regular',
      overrideStatus: 'open',
      openTime: '10:00 AM',
      closeTime: '08:00 PM',
    },
    stockStatus: {
      'gold999': true,
      'silver999': true,
    },
    videos: []
  });

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SETTINGS);
      if (response.ok) {
        const data = await response.json();
        // Map backend structure to mobile app structure
        const mapped = {
          rateModifications: {
            gold999_buy: data.baseModifications?.gold999?.value || 0,
            silver999_buy: data.baseModifications?.silver999?.value || 0,
            gold999_sell: data.goldOffset?.value || 0,
            silver999_sell: data.silverOffset?.value || 0,
            isModifiedMode: data.showModified || false,
          },
          ratesPageModifications: {
            gold999: data.ratesPage?.gold?.value || 0,
            silver999: data.ratesPage?.silver?.value || 0,
            isModifiedMode: data.ratesPage?.showModified || false,
          },
          ticker: data.ticker || "",
          marketStatus: {
            mode: data.marketStatus?.mode || 'regular',
            overrideStatus: data.marketStatus?.overrideStatus || data.marketStatus?.modifiedStatus || 'open',
            openTime: data.marketStatus?.openTime || '10:00 AM',
            closeTime: data.marketStatus?.closeTime || '08:00 PM',
          },
          stockStatus: data.stockOverrides || {},
          videos: data.videos || []
        };
        setAdminSettings(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch settings from backend:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistSettings = async (updatedSettings) => {
    try {
      const backendData = {
        baseModifications: {
          gold999: { mode: "amount", value: updatedSettings.rateModifications.gold999_buy },
          silver999: { mode: "amount", value: updatedSettings.rateModifications.silver999_buy }
        },
        goldOffset: { mode: "amount", value: updatedSettings.rateModifications.gold999_sell },
        silverOffset: { mode: "amount", value: updatedSettings.rateModifications.silver999_sell },
        showModified: updatedSettings.rateModifications.isModifiedMode,
        ratesPage: {
          gold: { mode: "amount", value: updatedSettings.ratesPageModifications.gold999 },
          silver: { mode: "amount", value: updatedSettings.ratesPageModifications.silver999 },
          showModified: updatedSettings.ratesPageModifications.isModifiedMode
        },
        ticker: updatedSettings.ticker,
        marketStatus: {
          mode: updatedSettings.marketStatus.mode,
          overrideStatus: updatedSettings.marketStatus.overrideStatus,
          openTime: updatedSettings.marketStatus.openTime,
          closeTime: updatedSettings.marketStatus.closeTime
        },
        stockOverrides: updatedSettings.stockStatus,
        videos: updatedSettings.videos
      };

      await fetch(API_ENDPOINTS.SETTINGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: backendData }),
      });
    } catch (error) {
      console.error('Failed to save settings to backend:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    // Poll for updates every 30 seconds to stay in sync with website admin changes
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  const updateSetting = (key, value) => {
    setAdminSettings(prev => {
      const updated = { ...prev, [key]: value };
      persistSettings(updated);
      return updated;
    });
  };

  const updateRateMod = (id, val) => {
    setAdminSettings(prev => {
      const updated = {
        ...prev,
        rateModifications: {
          ...prev.rateModifications,
          [id]: val
        }
      };
      persistSettings(updated);
      return updated;
    });
  };

  const updateRatesPageMod = (id, val) => {
    setAdminSettings(prev => {
      const updated = {
        ...prev,
        ratesPageModifications: {
          ...prev.ratesPageModifications,
          [id]: val
        }
      };
      persistSettings(updated);
      return updated;
    });
  };

  return (
    <AdminContext.Provider value={{ adminSettings, isLoading, setAdminSettings, updateSetting, updateRateMod, updateRatesPageMod, fetchSettings }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
