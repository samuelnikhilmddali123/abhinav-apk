import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [adminSettings, setAdminSettings] = useState({
    // Home Screen rate modifications
    rateModifications: {
      gold999_buy: 0,
      silver999_buy: 0,
      gold999_sell: 0,
      silver999_sell: 0,
      isModifiedMode: false,
    },
    // Separate modifications for the Rates Page
    ratesPageModifications: {
      gold999: 0,
      silver999: 0,
      isModifiedMode: false,
    },
    // Custom ticker announcement
    ticker: "✦   WELCOME TO ABHINAV GOLD & SILVER - QUALITY PURITY GUARANTEED   ",
    // Market operation settings
    marketStatus: {
      mode: 'regular', // 'regular' or 'modified'
      overrideStatus: 'open', // 'open' or 'closed'
      openTime: '10:00 AM',
      closeTime: '08:00 PM',
    },
    // Manual stock overrides (productId => boolean)
    stockStatus: {
      'gold999': true,
      'silver999': true,
    },
    // Video list
    videos: []
  });

  const updateSetting = (key, value) => {
    setAdminSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateRateMod = (id, val) => {
    setAdminSettings(prev => ({
      ...prev,
      rateModifications: {
        ...prev.rateModifications,
        [id]: val
      }
    }));
  };

  const updateRatesPageMod = (id, val) => {
    setAdminSettings(prev => ({
      ...prev,
      ratesPageModifications: {
        ...prev.ratesPageModifications,
        [id]: val
      }
    }));
  };

  return (
    <AdminContext.Provider value={{ adminSettings, setAdminSettings, updateSetting, updateRateMod, updateRatesPageMod }}>
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
