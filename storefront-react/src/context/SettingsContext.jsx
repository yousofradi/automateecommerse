import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSetting('autoecommerce_global_settings')
      .then(s => { setSettings(s || {}); setLoading(false); })
      .catch(() => { setSettings({}); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
    }
    if (settings.storeFavicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = settings.storeFavicon;
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() { return useContext(SettingsContext); }
