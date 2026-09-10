import React, { useState, useEffect } from 'react';
import { LogIn, User, Lock, ArrowLeft, ShieldCheck, Mail, Send, Eye, EyeOff, Server, Clock, Sun, Moon, Building2, Cpu, Sparkles } from 'lucide-react';
import ChangelogModal from './ChangelogModal';
import VersionBadge from './VersionBadge';

interface LoginProps {
  onLogin: (user: any, rememberMe: boolean) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [os, setOs] = useState('กำลังตรวจสอบระบบ...');
  const [time, setTime] = useState('');
  const [isDark, setIsDark] = useState(true);
  
  const [orgName, setOrgName] = useState('ระบบงานสารบรรณอิเล็กทรอนิกส์');
  const [footerText, setFooterText] = useState('© 2026 สงวนลิขสิทธิ์');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('th-TH'));
    }, 1000);
    
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
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
    fetchSettings();
    return () => clearInterval(timer);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        if (remember) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.setItem('rememberMe', 'false');
        }
        onLogin(data.user, remember);
      } else {
        setAlert({ type: 'error', message: data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setAlert({ type: 'error', message: 'กรุณาระบุอีเมล' });
      return;
    }
    
    setResetStatus('loading');
    setAlert(null);
    
    try {
      const response = await fetch('/api/forgot-password', {
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
        setResetStatus('success');
        setAlert({ type: 'success', message: 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว' });
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
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] dark:bg-blue-600/20 bg-blue-500/10 rounded-full blur-[100px] animate-pulse transition-colors duration-700"></div>
          {/* Bottom Left Orb */}
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] dark:bg-amber-500/10 bg-blue-300/20 rounded-full blur-[100px] animate-pulse transition-colors duration-700" style={{ animationDelay: '2s' }}></div>
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] dark:bg-sky-500/5 bg-sky-300/10 rounded-full blur-[120px] transition-colors duration-700"></div>
          
          {/* Grid Pattern overlay */}
          <div className="absolute inset-0 dark:opacity-50 opacity-10 transition-opacity duration-700" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwaXhlbHMgeD0iMCIgeT0iMCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0icmdiYSgxNDgsMTYzLDE4NCwwLjA1KSIvPjwvc3ZnPg==')" }}></div>
        </div>

        <main className="w-full max-w-[440px] relative z-10 animate-slide-up flex flex-col">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--glass-border)] shadow-glow mb-4 p-1 relative group overflow-hidden transition-colors duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-color)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover relative z-10" />
              ) : (
                <Building2 className="w-10 h-10 text-[var(--primary-color)] relative z-10" />
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] drop-shadow-sm font-sans transition-colors duration-500">
              EDMS <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-amber-200">Saraban</span>
            </h1>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 inline-block">
              <p className="text-sm font-bold text-[var(--primary-color)] tracking-wider">
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

          <div className="bg-[var(--bg-surface)]/80 dark:bg-[var(--bg-surface)]/60 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-card border border-[var(--glass-border)] relative transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="p-6 sm:p-8 relative z-10">
              {alert && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 border backdrop-blur-md ${
                  alert.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-200' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-200'
                } animate-scale-in transition-colors duration-500`}>
                  {alert.type === 'error' ? <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" /> : <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />}
                  <span className="leading-relaxed">{alert.message}</span>
                </div>
              )}

              {isForgotPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-sans transition-colors">ลืมรหัสผ่าน?</h2>
                    <p className="text-sm text-[var(--text-secondary)] font-sans transition-colors">กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้</p>
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
                        disabled={resetStatus === 'loading' || resetStatus === 'success'}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex flex-col gap-3">
                    {resetStatus === 'success' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setAlert(null);
                          setResetStatus('idle');
                          setResetEmail('');
                        }}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-[var(--border-medium)] rounded-xl text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] transition-colors font-sans"
                      >
                        กลับไปหน้าเข้าสู่ระบบ
                      </button>
                    ) : (
                      <>
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
                              ส่งลิงก์รีเซ็ตรหัสผ่าน
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(false);
                            setAlert(null);
                          }}
                          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors font-sans"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          กลับ
                        </button>
                      </>
                    )}
                  </div>
                </form>
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
            <div className="bg-[var(--bg-elevated)]/80 backdrop-blur-xl px-6 py-4 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-medium text-[var(--text-secondary)] font-mono transition-colors duration-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-light)] shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-light)] shadow-sm text-[var(--success)]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SECURE</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 opacity-60" />
                <span className="opacity-80 truncate max-w-[120px] sm:max-w-none">{os}</span>
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
