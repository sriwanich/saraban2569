import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Award, FileEdit, Volume2, Users, BarChart3, BookOpen
} from 'lucide-react';

import DraftLettersView from './drafts/DraftLettersView';
import AiScanView from './drafts/AiScanView';
import OrderTemplatesView from './drafts/OrderTemplatesView';
import CustomOrderView from './drafts/CustomOrderView';
import SpeechTemplatesView from './drafts/SpeechTemplatesView';
import MeetingMinutesView from './drafts/MeetingMinutesView';
import ProjectSummaryView from './drafts/ProjectSummaryView';
import OfficialRuleCheckerTab from './drafts/OfficialRuleCheckerTab';
import TorGeneratorView from './drafts/TorGeneratorView';

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
      {/* Navigation Sub-Pills */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-3 shadow-sm relative z-10">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar p-1">
          {filteredTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-dark)] text-white shadow-md shadow-[var(--primary-color)]/20 hover:shadow-lg hover:shadow-[var(--primary-color)]/30 hover:-translate-y-0.5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:shadow-sm'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                    isActive ? 'bg-white/25 text-white' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20'
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
      </div>
    </div>
  );
}
