import React, { useState, useEffect } from 'react';
import { LogIn, User, Lock, ArrowLeft, ShieldCheck, Mail, Send, Eye, EyeOff, Server, Clock, Sun, Moon, Building2, Cpu, Sparkles, AlertTriangle, HelpCircle, Activity, Apple, Monitor, Smartphone, Tablet, Terminal, Users } from 'lucide-react';
import ChangelogModal from './ChangelogModal';
import VersionBadge from './VersionBadge';
import { realtimeSync } from '../utils/realtimeSync';

interface LoginProps {
  onLogin: (user: any, rememberMe: boolean) => void;
}

const getDeviceBrandIcon = (uaString: string) => {
  const ua = uaString.toLowerCase();
  
  // Parse version/model
  let modelVersion = 'v1.0';
  if (ua.includes('windows') || ua.includes('win64') || ua.includes('win32')) {
    modelVersion = 'Win 11';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    if (ua.includes('iphone')) {
      const match = uaString.match(/iPhone OS\s([0-9_]+)/);
      modelVersion = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    } else if (ua.includes('ipad')) {
      const match = uaString.match(/CPU OS\s([0-9_]+)/);
      modelVersion = match ? `iPadOS ${match[1].replace(/_/g, '.')}` : 'iPadOS';
    } else {
      modelVersion = 'macOS';
    }
  } else if (ua.includes('android')) {
    const match = uaString.match(/Android\s([0-9]+)/);
    modelVersion = match ? `Android ${match[1]}` : 'Android';
  } else if (ua.includes('linux')) {
    modelVersion = 'Linux';
  }

  // 1. Apple (Mac, iPhone, iPad, iPod)
  if (ua.includes('macintosh') || ua.includes('mac os') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return {
      name: 'Apple',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z"/>
        </svg>
      )
    };
  }
  
  // 2. Samsung
  if (ua.includes('samsung') || ua.includes('sm-')) {
    return {
      name: 'Samsung',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="1.5">
          <ellipse cx="12" cy="12" rx="11" ry="6" transform="rotate(-15 12 12)" />
          <path d="M8 11.5c.2-.3.6-.5 1.1-.5.6 0 .9.3.9.6 0 .5-.5.6-1 .7s-1 .3-1 .7c0 .4.4.6 1 .6.6 0 1-.2 1.2-.5" strokeLinecap="round" />
          <path d="M12.5 13v-2l.8 1.5.8-1.5v2M16 11.5v1.5" strokeLinecap="round" />
        </svg>
      )
    };
  }

  // 3. Xiaomi / Redmi / POCO
  if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco') || ua.includes('mi ')) {
    return {
      name: 'Xiaomi',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M7 15v-5c0-.8.6-1.5 1.5-1.5s1.5.7 1.5 1.5v5 M11 15v-5c0-.8.6-1.5 1.5-1.5s1.5.7 1.5 1.5v5 M16 15v-4 M16 8h.01" strokeLinecap="round" />
        </svg>
      )
    };
  }

  // 4. Huawei / Honor
  if (ua.includes('huawei') || ua.includes('honor')) {
    return {
      name: 'Huawei',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M12 2c-.3 1.5 0 3 .4 3.8.4-.8.7-2.3.4-3.8zm-2.2.4c0 1.5.6 2.8 1.3 3.3-.2-.8-.2-2.3-1.3-3.3zm4.4 0c0 1.5-.6 2.8-1.3 3.3.2-.8.2-2.3 1.3-3.3zm-6.1 2.3c.3 1.4 1.2 2.3 2 2.5-.6-.6-1.2-2-2-2.5zm7.8 0c-.3 1.4-1.2 2.3-2 2.5.6-.6 1.2-2 2-2.5z"/>
        </svg>
      )
    };
  }

  // 5. Oppo / Realme
  if (ua.includes('oppo') || ua.includes('cph') || ua.includes('realme')) {
    return {
      name: ua.includes('realme') ? 'Realme' : 'OPPO',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2">
          <circle cx="7" cy="12" r="3.5" />
          <circle cx="17" cy="12" r="3.5" />
        </svg>
      )
    };
  }

  // 6. Vivo
  if (ua.includes('vivo')) {
    return {
      name: 'Vivo',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="1.8">
          <path d="M4 8l4 8h8l4-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v8" strokeLinecap="round" />
        </svg>
      )
    };
  }

  // 7. OnePlus
  if (ua.includes('oneplus')) {
    return {
      name: 'OnePlus',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" />
          <path d="M10 7v10M8 9l2-2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 12h4M16 10v4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    };
  }

  // 8. Google (Pixel / Nexus)
  if (ua.includes('pixel') || ua.includes('nexus') || ua.includes('google')) {
    return {
      name: 'Google Pixel',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 12 5.92 12 12s4.92 11 11.24 11c6.578 0 11.02-4.623 11.02-11.205 0-.756-.08-1.332-.18-1.8H12.24z"/>
        </svg>
      )
    };
  }

  // 9. Dell
  if (ua.includes('dell')) {
    return {
      name: 'Dell',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <text x="50%" y="62%" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif" fill="currentColor" stroke="none" transform="rotate(-15 12 12)">DELL</text>
        </svg>
      )
    };
  }

  // 10. HP
  if (ua.includes('hp') || ua.includes('hewlett')) {
    return {
      name: 'HP',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <text x="50%" y="63%" textAnchor="middle" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" fontStyle="italic" fill="currentColor" stroke="none">hp</text>
        </svg>
      )
    };
  }

  // 11. Lenovo
  if (ua.includes('lenovo')) {
    return {
      name: 'Lenovo',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <rect x="2" y="6" width="20" height="12" rx="1" fill="currentColor" />
          <text x="50%" y="14" textAnchor="middle" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" fill="white">Lenovo</text>
        </svg>
      )
    };
  }

  // 12. Asus
  if (ua.includes('asus')) {
    return {
      name: 'ASUS',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <text x="50%" y="60%" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5" fill="currentColor">ASUS</text>
        </svg>
      )
    };
  }

  // 13. Acer
  if (ua.includes('acer')) {
    return {
      name: 'Acer',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <text x="50%" y="60%" textAnchor="middle" fontSize="7" fontWeight="bold" fontFamily="sans-serif" fontStyle="italic" fill="currentColor">acer</text>
        </svg>
      )
    };
  }

  // 14. Windows OS (If not brand specific but on Windows Desktop)
  if (ua.includes('windows') || ua.includes('win64') || ua.includes('win32')) {
    return {
      name: 'Microsoft Windows',
      version: modelVersion,
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
          <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551V12.45zm10.95-10.518L24 0v11.55H10.95V1.932zM24 12.45v11.55l-13.05-1.95V12.45H24z" />
        </svg>
      )
    };
  }

  // Fallback to standard CPU/Computer
  return {
    name: 'Generic Device',
    version: modelVersion,
    icon: <Cpu className="w-4 h-4 shrink-0" />
  };
};

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState<'checking' | 'online' | 'fallback' | 'offline'>('checking');
  const [serverDetails, setServerDetails] = useState<any>(null);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(() => {
    return typeof window !== 'undefined' ? realtimeSync.getOnlineUsers() : 0;
  });
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword' | 'success'>('email');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [os, setOs] = useState('กำลังตรวจสอบระบบ...');
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [isDark, setIsDark] = useState(true);
  
  const [orgName, setOrgName] = useState('ระบบงานสารบรรณอิเล็กทรอนิกส์');
  const [footerText, setFooterText] = useState('© 2026 สงวนลิขสิทธิ์');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const getApiBase = () => {
    try {
      const saved = localStorage.getItem('edms_custom_api_url');
      return saved ? saved.trim().replace(/\/+$/, '') : '';
    } catch (e) {
      return '';
    }
  };

  const checkServerHealth = async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setServerDetails(data);
        if (data.database?.status === 'connected') {
          setServerHealth('online');
        } else {
          setServerHealth('fallback');
        }
      } else {
        setServerHealth('offline');
      }
    } catch (err) {
      setServerHealth('offline');
    }
  };

  useEffect(() => {
    // Load saved username and remember state
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (savedUsername && savedRemember) {
      setUsername(savedUsername);
      setRemember(true);
    } else if (savedUsername) {
      setUsername(savedUsername);
      setRemember(false);
    }

    // Initial Theme Setup
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    // Auto-Login Support (Development Only)
    if (import.meta.env.VITE_AUTO_LOGIN_USER && import.meta.env.VITE_AUTO_LOGIN_PASS) {
      console.log('Auto-login detected, attempting login...');
      setUsername(import.meta.env.VITE_AUTO_LOGIN_USER);
      setPassword(import.meta.env.VITE_AUTO_LOGIN_PASS);
      // Trigger submit automatically after short delay to let state update
      setTimeout(() => {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      }, 500);
    }

    const ua = navigator.userAgent;
    let currentOs = 'Unknown OS';
    if (ua.indexOf('Win') !== -1) currentOs = 'Windows 11 / Node 20.x';
    if (ua.indexOf('Mac') !== -1) currentOs = 'macOS Sonoma / Node 20.x';
    if (ua.indexOf('Linux') !== -1) currentOs = 'Ubuntu Linux 24.04 / Node 20.x';
    if (ua.indexOf('Android') !== -1) currentOs = 'Android 14';
    if (ua.indexOf('like Mac') !== -1) currentOs = 'iOS 17';
    setOs(`Client: ${currentOs}`);

    const updateTime = () => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    const fetchSettings = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.orgName) setOrgName(data.orgName);
          if (data.footerText) setFooterText(data.footerText);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        console.error('Failed to load org settings:', err);
      }
    };

    const fetchOnlineUsers = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/online-users`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.count === 'number') {
            setOnlineUsersCount(Math.max(0, data.count));
          }
        }
      } catch (err) {
        // keep current count
      }
    };

    fetchSettings();
    checkServerHealth();
    fetchOnlineUsers();

    const onlineInterval = setInterval(fetchOnlineUsers, 15000);

    const unsubscribeOnline = realtimeSync.subscribe(['ONLINE_USERS_COUNT', 'REALTIME_CONNECTED'], (data) => {
      if (data?.count !== undefined) {
        const c = Number(data.count);
        setOnlineUsersCount(isNaN(c) ? 0 : Math.max(0, c));
      } else if (data?.onlineUsers !== undefined) {
        const c = Number(data.onlineUsers);
        setOnlineUsersCount(isNaN(c) ? 0 : Math.max(0, c));
      }
    });

    return () => {
      clearInterval(timer);
      clearInterval(onlineInterval);
      unsubscribeOnline();
    };
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  const getLogoSrc = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
      return 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('Backend returned non-JSON response:', responseText.slice(0, 200));
      }

      if (response.ok && data && data.user) {
        setServerHealth('online');
        if (remember) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.setItem('rememberMe', 'false');
        }
        onLogin(data.user, remember);
      } else if (response.status === 404) {
        setServerHealth('offline');
        setAlert({ 
          type: 'error', 
          message: 'ไม่พบ API เซิร์ฟเวอร์ (HTTP 404 Not Found): กรุณาตรวจสอบว่าได้เริ่มทำงาน Node.js Backend และตั้งค่า Reverse Proxy ไปยังพอร์ต 3000 แล้วหรือไม่' 
        });
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        setServerHealth('offline');
        setAlert({ 
          type: 'error', 
          message: `เซิร์ฟเวอร์ปลายทางไม่ตอบสนอง (HTTP ${response.status} Bad Gateway): เซิร์ฟเวอร์ Node.js หรือ Passenger บนโฮสต์ยังไม่ได้ถูกเริ่มทำงาน หรือหยุดทำงานกะทันหัน` 
        });
      } else if (data && (data.message || data.error)) {
        setAlert({ type: 'error', message: data.message || data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      } else {
        setAlert({ type: 'error', message: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status}): กรุณาตรวจสอบสถานะเซิร์ฟเวอร์บนโฮสต์` });
      }
    } catch (err) {
      setServerHealth('offline');
      setAlert({ 
        type: 'error', 
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (Connection Refused): เซิร์ฟเวอร์ Node.js ไม่ได้กำลังทำงานอยู่บนโฮสต์จริง กรุณาตรวจสอบการรันระบบหรือคลิกดูคำแนะนำ' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setAlert({ type: 'error', message: 'กรุณาระบุอีเมล' });
      return;
    }
    
    setResetStatus('loading');
    setAlert(null);
    
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง');
      }

      if (response.ok) {
        setResetStatus('idle');
        setResetStep('otp');
        setAlert({ type: 'success', message: 'ส่งรหัส OTP 6 หลักไปยังอีเมลของคุณแล้ว (มีอายุ 15 นาที)' });
      } else {
        setResetStatus('idle');
        setAlert({ type: 'error', message: data.message || data.error || 'ไม่พบอีเมลนี้ในระบบ' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setResetStatus('idle');
      setAlert({ type: 'error', message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp) {
      setAlert({ type: 'error', message: 'กรุณากรอกรหัส OTP 6 หลัก' });
      return;
    }

    setResetStatus('loading');
    setAlert(null);

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp.trim() })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง');
      }

      if (response.ok) {
        setResetStatus('idle');
        setResetStep('newPassword');
        setAlert({ type: 'success', message: 'รหัส OTP ถูกต้อง กรุณาตั้งรหัสผ่านใหม่ของคุณ' });
      } else {
        setResetStatus('idle');
        setAlert({ type: 'error', message: data.message || data.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setResetStatus('idle');
      setAlert({ type: 'error', message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setAlert({ type: 'error', message: 'กรุณากรอกรหัสผ่านใหม่' });
      return;
    }
    if (newPassword.length < 4) {
      setAlert({ type: 'error', message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setResetStatus('loading');
    setAlert(null);

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp.trim(), newPassword })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง');
      }

      if (response.ok) {
        setResetStatus('success');
        setResetStep('success');
        setAlert({ type: 'success', message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
      } else {
        setResetStatus('idle');
        setAlert({ type: 'error', message: data.message || data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setResetStatus('idle');
      setAlert({ type: 'error', message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden relative selection:bg-blue-500/30 transition-colors duration-700">
        
        {/* Theme Toggle Button - Floating Top Right */}
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-card text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-all hover:scale-105"
          title={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Animated Futuristic Background - Adapts to theme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top Right Orb */}
          <div className="absolute -top-40 -right-40 w-[550px] h-[550px] dark:bg-blue-600/15 bg-blue-500/5 rounded-full blur-[120px] animate-pulse transition-colors duration-700"></div>
          {/* Bottom Left Orb */}
          <div className="absolute -bottom-40 -left-40 w-[550px] h-[550px] dark:bg-sky-500/10 bg-blue-300/15 rounded-full blur-[120px] animate-pulse transition-colors duration-700" style={{ animationDelay: '3s' }}></div>
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[450px] dark:bg-indigo-500/5 bg-sky-300/10 rounded-full blur-[130px] transition-colors duration-700"></div>
          
          {/* Cyber Grid Background overlay from global styles */}
          <div className="absolute inset-0 cyber-grid-bg dark:opacity-40 opacity-20 transition-opacity duration-700"></div>
        </div>

        <main className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[520px] relative z-10 animate-slide-up flex flex-col">
          
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--glass-border)] shadow-glow mb-4 p-1.5 relative group overflow-hidden transition-colors duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-color)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {/* Futuristic Corner Tech Accents on Logo */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--primary-color)] opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[var(--primary-color)] opacity-60"></div>
              {logoUrl ? (
                <img
                  src={getLogoSrc(logoUrl)}
                  alt="Logo"
                  className="w-full h-full object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const fallback = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              ) : (
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png"
                  alt="Logo"
                  className="w-full h-full object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] drop-shadow-sm font-sans transition-colors duration-500">
              EDMS <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500 dark:from-blue-400 dark:via-sky-300 dark:to-amber-200">Saraban</span>
            </h1>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/25 inline-block backdrop-blur-md">
              <p className="text-xs font-bold text-[var(--primary-color)] tracking-wider">
                ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ {(() => {
                  try {
                    const saved = localStorage.getItem('moi_settings');
                    if (saved) {
                      const parsed = JSON.parse(saved);
                      const year = parsed.currentYear || '';
                      return year ? `ปี ${year}` : '';
                    }
                  } catch (e) {}
                  return '';
                })()}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)]/85 dark:bg-[var(--bg-surface)]/60 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-card border border-[var(--glass-border)] relative transition-colors duration-500">
            {/* Tech line indicator top */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="p-6 sm:p-8 relative z-10">
              {alert && (
                <div className={`mb-4 p-4 rounded-xl text-sm font-medium flex items-start gap-3 border backdrop-blur-md ${
                  alert.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-200' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-200'
                } animate-scale-in transition-colors duration-500`}>
                  {alert.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" /> : <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />}
                  <span className="leading-relaxed">{alert.message}</span>
                </div>
              )}

              {serverHealth === 'offline' && (
                <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>ระบบกำลังทำงานในโหมดออฟไลน์ (Local DB Cache)</span>
                </div>
              )}

              {isForgotPassword ? (
                <div>
                  {resetStep === 'email' && (
                    <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-in">
                      <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-sans transition-colors">ลืมรหัสผ่าน?</h2>
                        <p className="text-sm text-[var(--text-secondary)] font-sans transition-colors">กรอกอีเมลของคุณเพื่อรับรหัส OTP สำหรับตั้งรหัสผ่านใหม่</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5 font-sans transition-colors" htmlFor="resetEmail">อีเมล (Email)</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                            <Mail className="w-5 h-5" />
                          </div>
                          <input
                            type="email"
                            id="resetEmail"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all font-sans"
                            placeholder="your@email.com"
                            required
                            disabled={resetStatus === 'loading'}
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2 flex flex-col gap-3">
                        <button
                          type="submit"
                          disabled={resetStatus === 'loading'}
                          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] focus:ring-offset-[var(--bg-surface)] transition-all disabled:opacity-70 disabled:cursor-not-allowed font-sans"
                        >
                          {resetStatus === 'loading' ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              ส่งรหัส OTP ไปยังอีเมล
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(false);
                            setAlert(null);
                            setResetStep('email');
                          }}
                          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors font-sans"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          กลับไปหน้าเข้าสู่ระบบ
                        </button>
                      </div>
                    </form>
                  )}

                  {resetStep === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                      <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1 font-sans transition-colors">กรอกรหัส OTP</h2>
                        <p className="text-xs text-[var(--text-secondary)] font-sans transition-colors">ระบบได้ส่งรหัส OTP 6 หลักไปยัง <span className="font-semibold text-[var(--primary-color)]">{resetEmail}</span> เรียบร้อยแล้ว</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 font-sans">รหัส OTP (6 หลัก)</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={resetOtp}
                          onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                          className="block w-full px-4 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] text-center tracking-widest text-lg font-bold placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                          placeholder="000000"
                          required
                        />
                      </div>

                      <div className="pt-2 flex flex-col gap-3">
                        <button
                          type="submit"
                          disabled={resetStatus === 'loading'}
                          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] shadow-md transition-all disabled:opacity-70"
                        >
                          {resetStatus === 'loading' ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="w-5 h-5" />
                              ยืนยันรหัส OTP
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetStep('email')}
                          className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-[var(--primary-color)] underline"
                        >
                          ส่งรหัส OTP อีกครั้ง / เปลี่ยนอีเมล
                        </button>
                      </div>
                    </form>
                  )}

                  {resetStep === 'newPassword' && (
                    <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
                      <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1 font-sans transition-colors">ตั้งรหัสผ่านใหม่</h2>
                        <p className="text-xs text-[var(--text-secondary)] font-sans transition-colors">ยืนยันรหัส OTP สำเร็จ กรุณากำหนดรหัสผ่านใหม่ของคุณ</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 font-sans">รหัสผ่านใหม่</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full pl-4 pr-11 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all font-sans"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--primary-color)]"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 font-sans">ยืนยันรหัสผ่านใหม่</label>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full px-4 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all font-sans"
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      <div className="pt-2 flex flex-col gap-3">
                        <button
                          type="submit"
                          disabled={resetStatus === 'loading'}
                          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] shadow-md transition-all disabled:opacity-70"
                        >
                          {resetStatus === 'loading' ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="w-5 h-5" />
                              บันทึกรหัสผ่านใหม่
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {resetStep === 'success' && (
                    <div className="text-center space-y-4 py-4 animate-fade-in">
                      <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">เปลี่ยนรหัสผ่านสำเร็จ</h3>
                      <p className="text-sm text-[var(--text-secondary)]">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setAlert(null);
                          setResetStatus('idle');
                          setResetStep('email');
                          setResetEmail('');
                          setResetOtp('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] transition-all shadow-md"
                      >
                        กลับไปหน้าเข้าสู่ระบบ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5 font-sans transition-colors" htmlFor="username">
                      ชื่อผู้ใช้งาน (Username)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all font-sans"
                        placeholder="กรอกชื่อผู้ใช้งาน"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5 font-sans transition-colors" htmlFor="password">
                      รหัสผ่าน (Password)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-11 py-3 border border-[var(--border-medium)] rounded-xl bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all font-sans"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="peer appearance-none w-5 h-5 border border-[var(--border-medium)] rounded bg-[var(--bg-canvas)] checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/50 focus:ring-offset-0 transition-all"
                        />
                        <ShieldCheck className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors font-sans">จดจำฉัน</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setAlert(null);
                      }} 
                      className="text-sm font-medium text-[var(--primary-color)] hover:text-[var(--primary-hover)] transition-colors font-sans hover:underline underline-offset-4"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-[15px] font-bold text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] focus:ring-offset-[var(--bg-surface)] transition-all disabled:opacity-70 disabled:cursor-not-allowed font-sans relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>เข้าสู่ระบบ (Login)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Footer status bar inside card */}
            <div className="bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-2 py-2 sm:px-3 sm:py-2.5 md:px-3.5 md:py-3 border-t border-[var(--border-light)] flex flex-row items-center justify-between gap-1 sm:gap-1.5 md:gap-2 w-full overflow-hidden transition-colors duration-500">
              {/* 1. Clock Badge */}
              <div 
                className="flex-1 min-w-0 h-[26px] sm:h-[30px] md:h-[32px] px-1 sm:px-2 md:px-2.5 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 bg-[var(--bg-surface)] rounded-full border border-[var(--border-light)] shadow-sm font-mono text-[8px] sm:text-[9.5px] md:text-[10.5px] text-[var(--text-secondary)] transition-all"
                title={`เวลาปัจจุบัน: ${time}`}
              >
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-[var(--primary-color)] shrink-0" />
                <span className="whitespace-nowrap tracking-tight sm:tracking-normal truncate">{time}</span>
              </div>

              {/* 2. Secure Badge */}
              <div 
                className="flex-1 min-w-0 h-[26px] sm:h-[30px] md:h-[32px] px-1 sm:px-2 md:px-2.5 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 bg-[var(--bg-surface)] rounded-full border border-[var(--border-light)] shadow-sm text-[var(--success)] text-[8px] sm:text-[9.5px] md:text-[10.5px] font-bold transition-all"
                title="ระบบความปลอดภัย: มาตรฐานการเชื่อมต่อปลอดภัยและเข้ารหัสข้อมูลสารบรรณ"
              >
                <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-emerald-500 shrink-0" />
                <span className="whitespace-nowrap tracking-tight sm:tracking-wider">SECURE</span>
              </div>

              {/* 3. Client Badge */}
              {(() => {
                const brand = getDeviceBrandIcon(navigator.userAgent);
                return (
                  <div
                    className="flex-1 min-w-0 h-[26px] sm:h-[30px] md:h-[32px] px-1 sm:px-2 md:px-2.5 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 transition-all hover:scale-105 shadow-sm relative cursor-help text-[8px] sm:text-[9.5px] md:text-[10.5px] font-sans font-bold whitespace-nowrap"
                    title={`${brand.name} (${os})`}
                  >
                    <span className="shrink-0 flex items-center justify-center [&>svg]:w-2.5 [&>svg]:h-2.5 sm:[&>svg]:w-3 sm:[&>svg]:h-3 md:[&>svg]:w-3.5 md:[&>svg]:h-3.5">
                      {brand.icon}
                    </span>
                    <span className="opacity-95 text-[8px] sm:text-[9px] md:text-[10.5px] font-semibold truncate">{brand.version}</span>
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-indigo-500" />
                    </span>
                  </div>
                );
              })()}

              {/* 4. Backend Badge (Passive status badge, no popup modal) */}
              <div
                className={`flex-1 min-w-0 h-[26px] sm:h-[30px] md:h-[32px] px-1 sm:px-2 md:px-2.5 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 rounded-full border shadow-sm relative text-[8px] sm:text-[9.5px] md:text-[10.5px] font-sans font-bold whitespace-nowrap transition-all hover:scale-105 select-none cursor-default ${
                  serverHealth === 'online'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : serverHealth === 'fallback'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : serverHealth === 'checking'
                    ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold'
                }`}
                title={
                  serverHealth === 'online' ? 'Backend Node.js: ออนไลน์ (เชื่อมต่อสำเร็จ)' :
                  serverHealth === 'fallback' ? 'Backend: โหมดฐานข้อมูลสำรอง (Local DB)' :
                  serverHealth === 'checking' ? 'Backend: กำลังตรวจสอบการเชื่อมต่อ...' :
                  'Backend: ออฟไลน์'
                }
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 fill-current shrink-0">
                  <path d="M12 1L2 6.8v10.4L12 23l10-5.8V6.8L12 1zm8.2 15.2L12 21l-8.2-4.8V7.8L12 3l8.2 4.8v8.4zM10.8 7.3L7 9.5v5l3.8 2.2V14.5l-2.2-1.3V10.8l2.2 1.3V7.3zm2.4 0v4.8l2.2-1.3v-2.4l-2.2 1.3V7.3z"/>
                </svg>
                <span className="opacity-95 text-[8px] sm:text-[9px] md:text-[10.5px] font-semibold truncate">
                  {serverHealth === 'online' && 'NodeJS'}
                  {serverHealth === 'fallback' && (
                    <>
                      <span className="inline sm:hidden">LocalDB</span>
                      <span className="hidden sm:inline">Local DB</span>
                    </>
                  )}
                  {serverHealth === 'checking' && 'Checking'}
                  {serverHealth === 'offline' && 'Offline'}
                </span>
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 md:h-2 md:w-2">
                  {serverHealth !== 'checking' && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      serverHealth === 'online' ? 'bg-emerald-400' :
                      serverHealth === 'fallback' ? 'bg-amber-400' :
                      'bg-rose-400'
                    }`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 ${
                    serverHealth === 'online' ? 'bg-emerald-500' :
                    serverHealth === 'fallback' ? 'bg-amber-500' :
                    serverHealth === 'checking' ? 'bg-slate-400 animate-pulse' :
                    'bg-rose-500'
                  }`} />
                </span>
              </div>

              {/* 5. Online Users Badge */}
              <div
                className={`flex-1 min-w-0 h-[26px] sm:h-[30px] md:h-[32px] px-1 sm:px-2 md:px-2.5 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 rounded-full border transition-all hover:scale-105 shadow-sm relative cursor-help text-[8px] sm:text-[9.5px] md:text-[10.5px] font-sans font-bold whitespace-nowrap ${
                  onlineUsersCount > 0
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    : 'border-slate-300/40 dark:border-slate-700/40 bg-slate-500/5 text-slate-500 dark:text-slate-400'
                }`}
                title={
                  onlineUsersCount > 0
                    ? `จำนวนผู้ใช้งานที่เข้าสู่ระบบขณะนี้: ${onlineUsersCount} คน (Real-time Authenticated Users)`
                    : `ไม่มีผู้ใช้งานที่ล็อกอินอยู่ในระบบขณะนี้ (ระบบพร้อมให้บริการ)`
                }
              >
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 shrink-0" />
                <span className="opacity-95 text-[8px] sm:text-[9px] md:text-[10.5px] font-semibold truncate">
                  <span className="inline sm:hidden">{onlineUsersCount} คน</span>
                  <span className="hidden sm:inline">{onlineUsersCount} ออนไลน์</span>
                </span>
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 md:h-2 md:w-2">
                  {onlineUsersCount > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 ${
                    onlineUsersCount > 0 ? 'bg-sky-500' : 'bg-slate-400 dark:bg-slate-500'
                  }`} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm font-medium text-[var(--text-secondary)] space-y-2 font-sans transition-colors duration-500 flex flex-col items-center">
            <p className="tracking-wide text-[var(--text-primary)]">{orgName}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs opacity-70">{footerText}</p>
              <span className="text-xs opacity-40">•</span>
              <VersionBadge variant="footer" onClick={() => setIsChangelogOpen(true)} />
            </div>
          </div>
        </main>
      </div>

      {/* Changelog Modal for Login Page */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        currentUser={null}
      />

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}
