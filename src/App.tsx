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
    const savedUser = localStorage.getItem('edms_user_data');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
    setIsCheckingAuth(false);
    
    // Fetch global settings for Favicon & Title
    const fetchGlobalSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
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

  const handleSetTheme = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    root.classList.remove('light', 'dark');
    if (theme === 'dark' || (theme === 'auto' && isDarkOS)) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listener for OS theme changes if in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleLogout = async () => {
    localStorage.removeItem('edms_user_data');
    setUser(null);
    setIsLoggedIn(false);
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)]">กำลังโหลด...</div>;
  }

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} theme={theme} setTheme={handleSetTheme} user={user} />;
  }

  return <Login onLogin={(u) => { setUser(u); setIsLoggedIn(true); localStorage.setItem('edms_user_data', JSON.stringify(u)); }} />;
}
