import React, { useState } from 'react';
import { Sparkles, X, Bot, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import SmartAiAssistantView from './views/SmartAiAssistantView';
import { DocumentItem } from '../types';

interface Props {
  user: any;
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem | string) => void;
  onNavigateToDrafts?: (draftData?: any) => void;
  onOpenFullAiTab?: () => void;
}

export default function SmartAiFloatingWidget({
  user,
  documents,
  onViewDoc,
  onNavigateToDrafts,
  onOpenFullAiTab
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-2xl hover:shadow-indigo-500/30 active:scale-95 transition-all duration-300 border border-white/20"
          title="เปิดผู้ช่วย AI Smart"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="font-noto-serif-thai font-semibold text-xs sm:text-sm tracking-wide pr-1">
            Smart AI Assistant
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold backdrop-blur-sm">
            ✦ AI
          </span>
        </button>
      )}

      {/* Slide-over Floating AI Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-in-out bg-[var(--bg-surface)] border border-[var(--border-medium)] shadow-2xl rounded-2xl flex flex-col overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[500px] h-[620px] max-h-[85vh]'
          }`}
        >
          {/* Drawer Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white flex items-center justify-between border-b border-indigo-500/30 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-noto-serif-thai font-bold text-sm text-white flex items-center gap-2">
                  Smart e-Saraban AI Assistant
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Live
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-200/80">ผู้ช่วยปัญญาประดิษฐ์ประจำระบบสารบรรณ</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenFullAiTab && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullAiTab();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors text-xs flex items-center gap-1 mr-1"
                  title="เปิดในแท็บแบบเต็มหน้าจอ"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เต็มหน้าจอ</span>
                </button>
              )}

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors hidden sm:block"
                title={isExpanded ? 'ย่อขนาด' : 'ขยายขนาด'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-hidden p-2">
            <SmartAiAssistantView
              user={user}
              documents={documents}
              onViewDoc={(doc) => {
                setIsOpen(false);
                onViewDoc(doc);
              }}
              onNavigateToDrafts={(draft) => {
                setIsOpen(false);
                if (onNavigateToDrafts) onNavigateToDrafts(draft);
              }}
              isFloatingDrawer={true}
              onCloseDrawer={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
