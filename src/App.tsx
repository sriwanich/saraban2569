import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export type ThemeMode = 'light' | 'dark' | 'auto';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'auto';
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('edms_user_data') || sessionStorage.getItem('edms_user_data');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
    setIsCheckingAuth(false);
    
    // Fetch global settings for Favicon & Title
    const fetchGlobalSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          localStorage.setItem('moi_settings', JSON.stringify(data));
          if (data.logoUrl) {
            localStorage.setItem('moi_logo', data.logoUrl);
            localStorage.setItem('moi_schoolLogo', data.logoUrl);
          }
          if (data.garuda15Url) {
            localStorage.setItem('moi_garuda15', data.garuda15Url);
            localStorage.setItem('moi_garudaCustom', data.garuda15Url);
          }
          if (data.garuda30Url) {
            localStorage.setItem('moi_garuda30', data.garuda30Url);
            if (!data.garuda15Url) localStorage.setItem('moi_garudaCustom', data.garuda30Url);
          }
          if (data.orgName) {
            document.title = `${data.orgName} - ระบบสารบรรณอิเล็กทรอนิกส์`;
          }
          if (data.faviconUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.faviconUrl;
          }
        }
      } catch (err) {
        console.error('Failed to fetch global settings:', err);
      }
    };
    fetchGlobalSettings();
  }, []);

  const [isSystemDark, setIsSystemDark] = useState(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setIsSystemDark(e.matches);
      };
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    } catch (err) {
      console.error('Failed to bind media query listener:', err);
    }
  }, []);

  const handleSetTheme = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isActualDark = theme === 'dark' || (theme === 'auto' && isSystemDark);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (isActualDark) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme, isActualDark]);

  const handleLogout = async () => {
    localStorage.removeItem('edms_user_data');
    sessionStorage.removeItem('edms_user_data');
    setUser(null);
    setIsLoggedIn(false);
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)]">กำลังโหลด...</div>;
  }

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} theme={theme} setTheme={handleSetTheme} user={user} isSystemDark={isSystemDark} />;
  }

  return <Login onLogin={(u, rememberMe) => {
    setUser(u);
    setIsLoggedIn(true);
    if (rememberMe) {
      localStorage.setItem('edms_user_data', JSON.stringify(u));
    } else {
      sessionStorage.setItem('edms_user_data', JSON.stringify(u));
    }
  }} />;
}
