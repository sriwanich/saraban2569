import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, Building2, Cpu, Server } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  showOrgLogo?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'กำลังโหลดข้อมูลระบบ...',
  subMessage,
  fullScreen = true,
  showOrgLogo = true,
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      const savedLogo = localStorage.getItem('moi_logo') || localStorage.getItem('moi_schoolLogo');
      if (savedLogo) return savedLogo;
      const settingsStr = localStorage.getItem('moi_settings');
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        if (parsed?.logoUrl) return parsed.logoUrl;
      }
    } catch (_) {}
    return '/public/ddpm-logo.svg';
  });

  const [orgName, setOrgName] = useState<string>(() => {
    try {
      const settingsStr = localStorage.getItem('moi_settings');
      if (settingsStr) {
        const parsed = JSON.parse(settingsStr);
        if (parsed?.orgName) return parsed.orgName;
      }
    } catch (_) {}
    return 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  });

  const [loadingStep, setLoadingStep] = useState(0);
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  const loadingSteps = [
    'กำลังเชื่อมต่อฐานข้อมูลและความปลอดภัย...',
    'กำลังตรวจสอบสิทธิ์และการเข้ารหัส...',
    'กำลังเตรียมความพร้อมโมดูลระบบสารบรรณ...',
    'กำลังประมวลผลอินเทอร์เฟซผู้ใช้งาน...',
  ];

  useEffect(() => {
    // Dynamic loading messages
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
    }, 1800);

    // If loading takes > 4.5 seconds, display reload helper button
    const slowTimeout = setTimeout(() => {
      setShowSlowNotice(true);
    }, 4500);

    // Try fetching fresh logo/settings if not yet available
    if (!logoUrl) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data?.logoUrl) {
            setLogoUrl(data.logoUrl);
            localStorage.setItem('moi_logo', data.logoUrl);
          }
          if (data?.orgName) {
            setOrgName(data.orgName);
          }
        })
        .catch(() => {});
    }

    return () => {
      clearInterval(stepInterval);
      clearTimeout(slowTimeout);
    };
  }, [logoUrl]);

  const handleForceReload = () => {
    window.location.reload();
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas,#0f172a)] text-[var(--text-primary,#f8fafc)] overflow-hidden select-none'
    : 'w-full py-12 flex flex-col items-center justify-center p-6 bg-transparent text-[var(--text-primary,#f8fafc)] select-none';

  return (
    <div className={containerClasses} id="edms-app-loading-indicator">
      {/* Ambient futuristic background glow */}
      {fullScreen && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute w-96 h-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute w-80 h-80 rounded-full bg-indigo-500/10 blur-2xl -translate-y-12 translate-x-16 animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
          
          {/* Subtle grid pattern for futuristic look */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
        </div>
      )}

      {/* Main Core Loading Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        
        {/* Orbital Futuristic Logo Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Rotating Pulse Ring */}
          <div className="absolute -inset-3 rounded-full border-2 border-dashed border-blue-500/30 dark:border-blue-400/30 animate-[spin_8s_linear_infinite]" />
          
          {/* Middle Glowing Ring */}
          <div className="absolute -inset-1.5 rounded-full border border-blue-500/50 dark:border-cyan-400/50 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
          
          {/* Main Logo Disc Container */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-slate-800/40 p-1.5 shadow-2xl backdrop-blur-md border border-blue-500/30 dark:border-blue-400/30 flex items-center justify-center overflow-hidden">
            {showOrgLogo && logoUrl ? (
              <img
                src={logoUrl}
                alt="Organization Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  if ((e.target as HTMLImageElement).src.indexOf('ddpm-logo.svg') === -1) {
                    (e.target as HTMLImageElement).src = '/public/ddpm-logo.svg';
                  }
                }}
              />
            ) : (
              <img
                src="/public/ddpm-logo.svg"
                alt="Organization Logo"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            )}

            {/* Corner High-tech Accents */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </div>

          {/* Orbiting Satellite Sparkle */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-bounce" style={{ animationDuration: '2s' }}>
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Organization Name & System Badge */}
        <div className="mb-3 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold tracking-wide uppercase">
            <Cpu className="w-3 h-3 animate-pulse" />
            <span>EDMS Smart Saraban</span>
          </div>
          
          <h3 className="text-base font-bold text-[var(--text-primary,#0f172a)] dark:text-slate-100 line-clamp-1 tracking-tight">
            {orgName}
          </h3>
        </div>

        {/* Futuristic Glowing Shimmer Progress Bar */}
        <div className="w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3.5 relative shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-cyan-400 animate-[shimmer_1.5s_infinite] w-full"
            style={{
              animation: 'indeterminate 1.6s ease-in-out infinite'
            }}
          />
        </div>

        {/* Dynamic Loading Message */}
        <p className="text-sm font-medium text-[var(--text-primary,#334155)] dark:text-slate-200 mb-1">
          {message}
        </p>

        {/* Dynamic Status Subtitle */}
        <p className="text-xs text-[var(--text-secondary,#64748b)] dark:text-slate-400 min-h-[18px] transition-all duration-300">
          {subMessage || loadingSteps[loadingStep]}
        </p>

        {/* Safe Recovery Option if Network is Slow */}
        {showSlowNotice && fullScreen && (
          <div className="mt-5 pt-4 border-t border-slate-200/40 dark:border-slate-800/60 w-full animate-fadeIn flex flex-col items-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              ใช้เวลานานกว่าปกติ? ท่านสามารถสั่งรีเฟรชระบบใหม่ได้ทันที
            </p>
            <button
              type="button"
              id="btn-force-reload-loading"
              onClick={handleForceReload}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-500/30 transition-all duration-200 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              รีเฟรชหน้าต่างระบบใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingIndicator;
