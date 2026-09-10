import React, { useState, useEffect } from 'react';
import { Sparkles, Tag, GitBranch, History } from 'lucide-react';
import { ChangelogItem } from '../types';

interface VersionBadgeProps {
  onClick?: () => void;
  variant?: 'header' | 'sidebar' | 'footer' | 'pill' | 'button';
  className?: string;
  showIcon?: boolean;
}

export default function VersionBadge({
  onClick,
  variant = 'header',
  className = '',
  showIcon = true
}: VersionBadgeProps) {
  const [version, setVersion] = useState<string>('v2.4.0');
  const [releaseTitle, setReleaseTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestVersion = async () => {
      try {
        const res = await fetch('/api/changelogs/latest', { cache: 'no-store' });
        if (res.ok) {
          const data: ChangelogItem = await res.json();
          if (isMounted && data && data.version) {
            setVersion(data.version);
            setReleaseTitle(data.title || '');
          }
        }
      } catch (e) {
        // Fallback to default v2.4.0
      }
    };

    fetchLatestVersion();
    // Re-fetch occasionally or on focus
    const handleFocus = () => fetchLatestVersion();
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`ระบบเวอร์ชัน ${version}: ${releaseTitle || 'คลิกเพื่อดูรายละเอียดประวัติการอัปเดต (Changelog)'}`}
        className={`group relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 border border-amber-500/30 hover:border-amber-500/50 text-[var(--text-primary)] transition-all duration-200 cursor-pointer shadow-xs active:scale-95 select-none ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        {showIcon && (
          <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform duration-200" />
        )}
        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 tracking-tight">
          {version}
        </span>
        <span className="hidden xl:inline text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors border-l border-amber-500/30 pl-1.5">
          Changelog
        </span>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={onClick}
        title="คลิกเพื่อดูบันทึกประวัติเวอร์ชันและฟังก์ชันใหม่ทั้งหมด"
        className={`w-full flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)]/70 hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] text-xs transition-colors cursor-pointer group select-none ${className}`}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--primary-color)] group-hover:rotate-45 transition-transform" />
          <span className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            ประวัติระบบ
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20">
          {version}
        </span>
      </button>
    );
  }

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors cursor-pointer font-mono font-bold ${className}`}
        title="คลิกเพื่อดูบันทึกประวัติการเปลี่ยนแปลง (Changelog)"
      >
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>{version}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-[var(--text-primary)] transition-colors cursor-pointer ${className}`}
    >
      <Tag className="w-3 h-3 text-[var(--primary-color)]" />
      <span>{version}</span>
    </button>
  );
}
