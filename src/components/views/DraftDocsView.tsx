import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Award, FileEdit, Volume2, Users 
} from 'lucide-react';

import DraftLettersView from './drafts/DraftLettersView';
import AiScanView from './drafts/AiScanView';
import OrderTemplatesView from './drafts/OrderTemplatesView';
import CustomOrderView from './drafts/CustomOrderView';
import SpeechTemplatesView from './drafts/SpeechTemplatesView';
import MeetingMinutesView from './drafts/MeetingMinutesView';

interface Props {
  user: any;
  initialSubTab?: string;
  onSendToSignQueue?: (item: any) => void;
  onSaveToRegistry?: (item: any) => void;
}

export default function DraftDocsView({ user, initialSubTab = 'draft', onSendToSignQueue, onSaveToRegistry }: Props) {
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
    { id: 'order', label: 'คำสั่ง / ประกาศ', icon: Award, badge: '40+ แบบ' },
    { id: 'customorder', label: 'สร้างคำสั่ง/ประกาศเอง', icon: FileEdit },
    { id: 'speech', label: 'คำกล่าว / รายงาน', icon: Volume2, badge: '100+ แบบ' },
    { id: 'meeting', label: 'บันทึกการประชุม', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Pills */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--primary-color)] text-white shadow-md font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'
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
      </div>
    </div>
  );
}
