import React, { useState, useEffect, Suspense } from 'react';
import { 
  FileText, Sparkles, Award, FileEdit, Volume2, Users, BarChart3, BookOpen
} from 'lucide-react';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { LoadingIndicator } from '../LoadingIndicator';

const DraftLettersView = lazyWithRetry(() => import('./drafts/DraftLettersView'));
const AiScanView = lazyWithRetry(() => import('./drafts/AiScanView'));
const OrderTemplatesView = lazyWithRetry(() => import('./drafts/OrderTemplatesView'));
const CustomOrderView = lazyWithRetry(() => import('./drafts/CustomOrderView'));
const SpeechTemplatesView = lazyWithRetry(() => import('./drafts/SpeechTemplatesView'));
const MeetingMinutesView = lazyWithRetry(() => import('./drafts/MeetingMinutesView'));
const ProjectSummaryView = lazyWithRetry(() => import('./drafts/ProjectSummaryView'));
const OfficialRuleCheckerTab = lazyWithRetry(() => import('./drafts/OfficialRuleCheckerTab'));
const TorGeneratorView = lazyWithRetry(() => import('./drafts/TorGeneratorView'));

interface Props {
  user: any;
  initialSubTab?: string;
  onSendToSignQueue?: (item: any) => void;
  onSaveToRegistry?: (item: any) => void;
  onSendToDisasterReport?: (data: any) => void;
  enabledFeatures?: Record<string, boolean>;
}

export default function DraftDocsView({ user, initialSubTab = 'draft', onSendToSignQueue, onSaveToRegistry, onSendToDisasterReport, enabledFeatures }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [aiPrefillData, setAiPrefillData] = useState<any>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSendFromAiToDraft = (scannedData: any) => {
    setAiPrefillData(scannedData);
    setActiveSubTab('draft');
  };

  const tabs = [
    { id: 'draft', label: 'ร่างหนังสือราชการ', icon: FileText },
    { id: 'aiscan', label: 'AI สแกนเอกสาร', icon: Sparkles, badge: 'AI' },
    { id: 'rulecheck', label: 'ตรวจระเบียบสารบรรณ', icon: BookOpen, badge: 'ใหม่' },
    { id: 'order', label: 'คำสั่ง / ประกาศ', icon: Award, badge: '40+ แบบ' },
    { id: 'customorder', label: 'สร้างคำสั่ง/ประกาศเอง', icon: FileEdit },
    { id: 'tor', label: 'สร้างขอบเขตงาน (TOR)', icon: FileText, badge: 'AI' },
    { id: 'speech', label: 'คำกล่าว / รายงาน', icon: Volume2, badge: '100+ แบบ' },
    { id: 'meeting', label: 'บันทึกการประชุม', icon: Users },
    { id: 'summary', label: 'สรุปโครงการอัตโนมัติ', icon: BarChart3, badge: 'AI' },
  ];

  const filteredTabs = tabs.filter(tab => !enabledFeatures || enabledFeatures[tab.id] !== false);

  useEffect(() => {
    if (enabledFeatures && enabledFeatures[activeSubTab] === false) {
      const firstEnabled = filteredTabs[0];
      if (firstEnabled) {
        setActiveSubTab(firstEnabled.id);
      }
    }
  }, [enabledFeatures, activeSubTab, filteredTabs]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-10">
      {/* Navigation Sub-Pills Menu Grid */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-3 shadow-sm relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {filteredTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all duration-300 cursor-pointer group ${
                  isActive
                    ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md shadow-[var(--primary-color)]/20'
                    : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary-color)]/40 hover:bg-[var(--bg-elevated)] hover:shadow-sm'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--primary-color)]'}`} />
                <span className="text-center truncate w-full text-[11px] leading-tight">{tab.label}</span>
                {tab.badge && (
                  <span className={`absolute top-1 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    isActive ? 'bg-white/30 text-white' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab View Content */}
      <div className="min-h-[500px]">
        <Suspense fallback={<div className="py-12"><LoadingIndicator message="กำลังโหลดแบบฟอร์ม..." /></div>}>
          {activeSubTab === 'draft' && (
            <DraftLettersView
              user={user}
              onSendToSignQueue={onSendToSignQueue}
              prefillData={aiPrefillData}
            />
          )}

          {activeSubTab === 'aiscan' && (
            <AiScanView
              user={user}
              onSendToDraft={handleSendFromAiToDraft}
              onSaveToRegistry={onSaveToRegistry}
              onSendToDisasterReport={onSendToDisasterReport}
            />
          )}

          {activeSubTab === 'rulecheck' && (
            <OfficialRuleCheckerTab
              user={user}
            />
          )}

          {activeSubTab === 'order' && (
            <OrderTemplatesView
              user={user}
              onSendToSignQueue={onSendToSignQueue}
            />
          )}

          {activeSubTab === 'customorder' && (
            <CustomOrderView
              user={user}
              onSendToSignQueue={onSendToSignQueue}
            />
          )}

          {activeSubTab === 'speech' && (
            <SpeechTemplatesView
              user={user}
            />
          )}

          {activeSubTab === 'meeting' && (
            <MeetingMinutesView
              user={user}
            />
          )}

          {activeSubTab === 'summary' && (
            <ProjectSummaryView
              user={user}
            />
          )}
          
          {activeSubTab === 'tor' && (
            <TorGeneratorView
              user={user}
              onSendToSignQueue={onSendToSignQueue}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
