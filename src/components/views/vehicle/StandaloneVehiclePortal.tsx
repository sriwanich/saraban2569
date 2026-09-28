import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  Shield, 
  LogOut, 
  Sun, 
  Moon, 
  ArrowLeft, 
  ExternalLink, 
  QrCode, 
  User, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Layers,
  ChevronRight,
  ClipboardCheck,
  Building2
} from 'lucide-react';
import { VehicleManagementView } from '../VehicleManagementView';
import { ThemeMode } from '../../../types';

interface StandaloneVehiclePortalProps {
  user: any;
  onLogout: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isSystemDark: boolean;
}

export const StandaloneVehiclePortal: React.FC<StandaloneVehiclePortalProps> = ({
  user,
  onLogout,
  theme,
  setTheme,
  isSystemDark
}) => {
  const [targetPlate, setTargetPlate] = useState<string>('');
  const [targetProvince, setTargetProvince] = useState<string>('');
  const [targetAction, setTargetAction] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const plate = sp.get('plate');
      const prov = sp.get('prov') || sp.get('province');
      const action = sp.get('action');
      if (plate) setTargetPlate(decodeURIComponent(plate));
      if (prov) setTargetProvince(decodeURIComponent(prov));
      if (action) setTargetAction(action);
    }
  }, []);

  const displayPlate = useMemo(() => {
    if (!targetPlate) return '';
    const prov = targetProvince || 'กรุงเทพมหานคร';
    if (targetPlate.includes(prov) || targetPlate.includes('กรุงเทพ') || targetPlate.includes('ระยอง')) {
      return targetPlate;
    }
    return `${targetPlate} ${prov}`;
  }, [targetPlate, targetProvince]);

  // Presence heartbeat for users on Standalone Vehicle Portal
  useEffect(() => {
    if (!user) return;

    const sendPresence = async () => {
      try {
        const payload = {
          userId: user.id || user.username,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          position: user.position || 'เจ้าหน้าที่',
          department: user.department || 'สำนักงาน ปภ. ระยอง',
          departmentId: user.departmentId,
          role: user.role || 'user',
          avatar: user.avatar || '',
          currentView: 'vehicles',
          viewTitle: 'ระบบบริหารจัดการยานพาหนะหลัก (Vehicle Portal)',
          activeDetails: displayPlate 
            ? `กำลังตรวจสภาพรถยนต์ ทะเบียน: ${displayPlate}` 
            : 'กำลังใช้งานระบบบริหารจัดการยานพาหนะ ตรวจสภาพรถประจำวัน',
          status: document.visibilityState === 'visible' ? 'active' : 'idle'
        };
        await fetch('/api/user-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {}
    };

    sendPresence();
    const interval = setInterval(sendPresence, 15000);
    return () => clearInterval(interval);
  }, [user, displayPlate]);

  const handleGoToMainEdms = () => {
    // Clear vehicle-only query parameters and navigate to main dashboard
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('vehicle_id');
      url.searchParams.delete('v_id');
      url.searchParams.delete('action');
      url.searchParams.delete('plate');
      url.searchParams.delete('province');
      url.searchParams.delete('prov');
      url.searchParams.delete('portal');
      url.searchParams.delete('mode');
      window.location.href = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
    }
  };

  const isDarkMode = theme === 'dark' || (theme === 'auto' && isSystemDark);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">
      {/* Dedicated Standalone Top Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-light)] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Brand & Portal Title (No Left Sidebar!) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-black text-[var(--text-primary)] tracking-tight truncate">
                    ระบบบริหารจัดการยานพาหนะ
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-400/30">
                    QR PORTAL
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate hidden xs:block">
                  สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
                </p>
              </div>
            </div>

            {/* Right: User status, Theme switcher & Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* User Profile Pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {user?.fullName ? user.fullName.charAt(0) : user?.username?.charAt(0) || 'U'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[var(--text-primary)] leading-tight max-w-[120px] truncate">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                    {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'moderator' ? 'เจ้าหน้าที่' : 'ผู้รับผิดชอบรถ'}
                  </div>
                </div>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] transition-all cursor-pointer shadow-2xs"
                title={isDarkMode ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </button>

              {/* Switch to Full EDMS System Button */}
              <button
                onClick={handleGoToMainEdms}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="เข้าสู่ระบบสารบรรณและเอกสารหลัก (EDMS)"
              >
                <span>ระบบสารบรรณหลัก</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>

            </div>

          </div>
        </div>

        {/* Scanned Vehicle Quick Notification Strip if available */}
        {targetPlate && (
          <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-sky-600/10 border-t border-b border-blue-500/20 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center text-xs text-blue-700 dark:text-blue-300 font-semibold gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <QrCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>เข้าสู่ระบบด้วย QR Code ประจำรถ:</span>
                <b className="font-extrabold text-blue-800 dark:text-blue-200">{displayPlate}</b>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Standalone Main View - Full Width & Responsive without Sidebar */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        <VehicleManagementView 
          user={user} 
          hasPermission={(key) => user?.permissions?.[key] ?? (user?.role === 'admin' || user?.role === 'moderator')} 
        />
      </main>

      {/* Simple Footer */}
      <footer className="py-4 border-t border-[var(--border-light)] bg-[var(--bg-card)]/60 text-center text-xs text-[var(--text-muted)]">
        สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
      </footer>
    </div>
  );
};
export default StandaloneVehiclePortal;
