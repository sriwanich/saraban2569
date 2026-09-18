import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { LoadingIndicator } from './components/LoadingIndicator';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { PublicInfographicsViewer } from './components/views/PublicInfographicsViewer';

export type ThemeMode = 'light' | 'dark' | 'auto';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'auto';
  });

  // Check if current URL is a public/embed infographic view
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isPublicInfographic = 
    pathname.startsWith('/public/infographics') || 
    pathname.startsWith('/embed/infographics') || 
    pathname.startsWith('/view/infographics') ||
    hash.includes('/public/infographics') ||
    hash.includes('/embed/infographics') ||
    hash.includes('/view/infographics') ||
    searchParams.has('infographic_id') ||
    searchParams.has('info_id') ||
    searchParams.get('view') === 'public_infographics';

  useEffect(() => {
    const savedUser = localStorage.getItem('edms_user_data') || sessionStorage.getItem('edms_user_data');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
    setIsCheckingAuth(false);
    
    // Fetch global settings for Favicon & Title with auto-retry and cached fallback
    const fetchGlobalSettings = async (retryCount = 0) => {
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
        // Attempt retry if dev server is warming up
        if (retryCount < 3) {
          setTimeout(() => fetchGlobalSettings(retryCount + 1), (retryCount + 1) * 1000);
        } else {
          // Graceful fallback to local cache
          try {
            const cached = localStorage.getItem('moi_settings');
            if (cached) {
              const data = JSON.parse(cached);
              if (data.orgName) document.title = `${data.orgName} - ระบบสารบรรณอิเล็กทรอนิกส์`;
            }
          } catch (_) {}
        }
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

  // Real-time authenticated user presence heartbeat
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const sendPresence = async (action: 'ping' | 'logout' = 'ping') => {
      try {
        const payload = {
          action,
          userId: user.id || user.username,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          departmentId: user.departmentId
        };
        await fetch('/api/user-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {
        // ignore network error
      }
    };

    // Send immediate presence heartbeat on login/mount
    sendPresence('ping');

    // Send presence heartbeat every 15 seconds
    const interval = setInterval(() => {
      sendPresence('ping');
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendPresence('ping');
      }
    };

    const handleBeforeUnload = () => {
      try {
        const payload = JSON.stringify({
          action: 'logout',
          userId: user.id || user.username,
          username: user.username
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/user-presence', new Blob([payload], { type: 'application/json' }));
        }
      } catch (_) {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoggedIn, user]);

  const handleLogout = async () => {
    if (user) {
      try {
        await fetch('/api/user-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'logout',
            userId: user.id || user.username,
            username: user.username
          })
        });
      } catch (_) {}
    }
    localStorage.removeItem('edms_user_data');
    sessionStorage.removeItem('edms_user_data');
    setUser(null);
    setIsLoggedIn(false);
  };

  const Loading = () => <LoadingIndicator message="กำลังเริ่มต้นระบบสารบรรณ..." />;

  if (isPublicInfographic) {
    return (
      <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการแสดงผลสื่อ Infographic">
        <ConfirmProvider>
          <PublicInfographicsViewer />
        </ConfirmProvider>
      </ErrorBoundary>
    );
  }

  if (isCheckingAuth) {
    return <LoadingIndicator message="กำลังตรวจสอบความปลอดภัยและสิทธิ์การเข้าใช้งาน..." />;
  }

  if (isLoggedIn) {
    return (
      <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในการโหลดหน้าจอการทำงาน">
        <ConfirmProvider>
          <Dashboard onLogout={handleLogout} theme={theme} setTheme={handleSetTheme} user={user} isSystemDark={isSystemDark} />
        </ConfirmProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในหน้าต่างเข้าสู่ระบบ">
      <ConfirmProvider>
        <Login onLogin={(u, rememberMe) => {
          setUser(u);
          setIsLoggedIn(true);
          if (rememberMe) {
            localStorage.setItem('edms_user_data', JSON.stringify(u));
          } else {
            sessionStorage.setItem('edms_user_data', JSON.stringify(u));
          }
        }} />
      </ConfirmProvider>
    </ErrorBoundary>
  );
}
