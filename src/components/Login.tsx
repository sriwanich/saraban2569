import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, CheckCircle, User, KeyRound, Eye, EyeOff, Lock, Clock, ShieldCheck, Server, HelpCircle, FolderOpen, Home, RefreshCw, LogIn } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: any, remember: boolean) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string, title: string } | null>(null);
  const [time, setTime] = useState('--:--:--');
  const [os, setOs] = useState('--');
  
  const [orgName, setOrgName] = useState('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [currentYear, setCurrentYear] = useState('2569');
  const [logoUrl, setLogoUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg');
  const [footerText, setFooterText] = useState('© 2026 ระบบสารบรรณอิเล็กทรอนิกส์');

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Fetch settings
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json();
          if (data.orgName) setOrgName(data.orgName);
          if (data.currentYear) setCurrentYear(String(data.currentYear));
          if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
          if (data.footerText !== undefined) setFooterText(data.footerText);
        }
      } catch (err: any) {
        console.error('Error fetching settings', err);
      }
    };
    fetchSettings();

    // Restore username if remembered
    try {
      if (localStorage.getItem('edms_remember') === '1') {
        const saved = localStorage.getItem('edms_user');
        if (saved) {
          setUsername(saved);
          setRemember(true);
        }
      }
    } catch (_) {}

    // Live clock
    const updateClock = () => {
      const now = new Date();
      setTime(
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0')
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Client OS detection
    const ua = navigator.userAgent;
    let detectedOs = 'Unknown';
    if (/Windows NT 10/.test(ua)) detectedOs = 'Win10';
    else if (/Windows NT 11/.test(ua)) detectedOs = 'Win11';
    else if (/Mac OS X/.test(ua)) detectedOs = 'macOS';
    else if (/Android/.test(ua)) detectedOs = 'Android';
    else if (/iPhone|iPad/.test(ua)) detectedOs = 'iOS';
    else if (/Linux/.test(ua)) detectedOs = 'Linux';
    setOs(detectedOs);

    return () => clearInterval(interval);
  }, []);

  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(Math.ceil(score * 0.8), 4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    
    if (!username.trim() || !password) {
      setAlert({
        type: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง'
      });
      return;
    }

    try {
      if (remember) {
        localStorage.setItem('edms_remember', '1');
        localStorage.setItem('edms_user', username);
      } else {
        localStorage.removeItem('edms_remember');
        localStorage.removeItem('edms_user');
      }
    } catch (_) {}

    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      if (data.success) {
        setAlert({
          type: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          message: 'กำลังนำท่านเข้าสู่ระบบ...'
        });
        setTimeout(() => {
          onLogin(data.user, remember);
        }, 1000);
      } else {
        setAlert({
          type: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          message: data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUsername('');
    setPassword('');
    setRemember(false);
    setAlert(null);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'กรุณากรอกอีเมล' });
      return;
    }
    
    setIsForgotLoading(true);
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      
      if (response.ok) {
        setOtpSent(true);
        setAlert({
          type: 'success',
          title: 'ส่ง OTP สำเร็จ',
          message: 'ระบบได้ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว'
        });
      } else {
        setAlert({
          type: 'error',
          title: 'ไม่สามารถส่ง OTP ได้',
          message: data.message || 'เกิดข้อผิดพลาดในการส่งอีเมล'
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        title: 'ไม่สามารถส่ง OTP ได้',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ'
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword.trim()) {
      setAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }
    
    setIsForgotLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword })
      });
      const data = await response.json();
      
      if (response.ok) {
        setAlert({
          type: 'success',
          title: 'เปลี่ยนรหัสผ่านสำเร็จ',
          message: 'สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที'
        });
        setTimeout(() => {
          setIsForgotPassword(false);
          setOtpSent(false);
          setForgotEmail('');
          setForgotOtp('');
          setForgotNewPassword('');
          setAlert(null);
        }, 3000);
      } else {
        setAlert({
          type: 'error',
          title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
          message: data.message || 'ข้อมูลไม่ถูกต้อง หรือรหัส OTP หมดอายุ'
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ'
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <>
      {/* Refined subtle top border */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-gradient-to-r from-[#2556A0] via-[var(--primary-color)] to-[#2556A0]" aria-hidden="true" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
        <main className="w-full max-w-md mx-auto">
          
          <header className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <div className="w-20 h-20 flex items-center justify-center">
                <img 
                  src={logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg'} 
                  alt="ตราสัญลักษณ์" 
                  className="w-full h-full object-contain drop-shadow-md" 
                />
              </div>
            </div>

            <h1 className="font-noto-serif-thai text-[clamp(10px,3.2vw,1.25rem)] sm:text-xl font-medium text-[var(--text-primary)] text-center mb-1 w-full whitespace-nowrap tracking-tight">
              {orgName}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] text-center">
              ระบบงานสารบรรณอิเล็กทรอนิกส์ (EDMS) ปี {currentYear}
            </p>
          </header>

          <div className="bg-[var(--bg-surface)]/80 backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="mb-5 text-center">
                <h2 className="text-xl font-medium text-[var(--text-primary)] mb-1">
                  {isForgotPassword ? 'ลืมรหัสผ่าน' : 'เข้าสู่ระบบ'}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {isForgotPassword 
                    ? (otpSent ? 'กรุณากรอกรหัส OTP และรหัสผ่านใหม่' : 'กรุณากรอกอีเมลเพื่อรับรหัส OTP สำหรับตั้งรหัสผ่านใหม่') 
                    : 'กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ'}
                </p>
              </div>
              
              {alert && (
                <div className={`flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm border ${
                  alert.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  <span className="shrink-0 mt-[2px]">
                    {alert.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </span>
                  <div>
                    <strong className="block font-medium mb-0.5">{alert.title}</strong>
                    <span className="opacity-90 leading-relaxed">{alert.message}</span>
                  </div>
                </div>
              )}

              {isForgotPassword ? (
                <form onSubmit={otpSent ? handleResetPasswordSubmit : handleForgotPasswordSubmit} className="space-y-4">
                  {!otpSent ? (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="forgotEmail">
                        อีเมล
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          id="forgotEmail"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                          placeholder="กรอกอีเมลของคุณ"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="forgotOtp">
                          รหัส OTP (6 หลัก)
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                            <Lock className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            id="forgotOtp"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value)}
                            maxLength={6}
                            className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all tracking-widest"
                            placeholder="123456"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="forgotNewPassword">
                          รหัสผ่านใหม่
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                            <Lock className="w-5 h-5" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            id="forgotNewPassword"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2.5 border border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                            placeholder="รหัสผ่านใหม่ของคุณ"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-1 space-y-3">
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] focus:ring-offset-[var(--bg-surface)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isForgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        otpSent ? 'รีเซ็ตรหัสผ่าน' : 'ส่งคำร้อง'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setOtpSent(false);
                        setAlert(null);
                      }}
                      className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      กลับไปหน้าเข้าสู่ระบบ
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="username">
                      ชื่อผู้ใช้งาน
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                        placeholder="กรอกชื่อผู้ใช้งาน"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="password">
                      รหัสผ่าน
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                        placeholder="กรอกรหัสผ่าน"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--border-medium)] bg-[var(--bg-overlay)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] focus:ring-offset-0"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">จดจำฉันในระบบ</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setAlert(null);
                      }} 
                      className="text-sm font-medium text-[var(--primary-color)] hover:text-[var(--primary-hover)] transition-colors"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] focus:ring-offset-[var(--bg-surface)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          เข้าสู่ระบบ
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            <div className="bg-[var(--bg-overlay)]/30 px-6 py-3 border-t border-[var(--border-lighter)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500/70" />
                    <span>SECURE</span>
                  </div>
                  <span className="text-[var(--border-light)] text-[10px]">|</span>
                  <div className="flex items-center gap-2" title="Powered by Vite, React & Node.js">
                    {/* Vite logo */}
                    <svg className="h-3.5 w-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 256 257" fill="none">
                      <path d="M128 0L11 202.5h234L128 0z" fill="url(#vite-g1)"/>
                      <path d="M128 0L64 110h128L128 0z" fill="url(#vite-g2)"/>
                      <defs>
                        <linearGradient id="vite-g1" x1="128" y1="0" x2="128" y2="257" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#BD34FE"/>
                          <stop offset="1" stopColor="#41B883"/>
                        </linearGradient>
                        <linearGradient id="vite-g2" x1="128" y1="0" x2="128" y2="110" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FFC517"/>
                          <stop offset="1" stopColor="#FFE15D"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* React logo */}
                    <svg className="h-3.5 w-3.5 opacity-60 hover:opacity-100 transition-opacity animate-[spin_20s_linear_infinite]" viewBox="-11.5 -10.23174 23 20.46348">
                      <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
                      <g stroke="#61dafb" strokeWidth="1" fill="none">
                        <ellipse rx="11" ry="4.2"/>
                        <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                        <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                      </g>
                    </svg>
                    {/* Node.js logo */}
                    <svg className="h-3.5 w-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 256 256" fill="none">
                      <path d="M128 10L230 69v118l-102 59-102-59V69z" fill="#339933"/>
                      <path d="M128 10v216l102-59V69z" fill="#66CC33"/>
                      <path d="M128 128l51-30V69l-51 29V51l34-20H94l34 20v47l-51-29v29l51 30v47l-34 20h68l-34-20z" fill="#FFF"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>{os}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-[var(--text-muted)] space-y-1.5">
            <p>{orgName}</p>
            <div className="flex justify-center gap-4">
              <span className="opacity-70">{footerText}</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
