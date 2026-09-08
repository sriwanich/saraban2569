import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Search, FileText, FileEdit, Clock, Check, Copy, AlertCircle, Building2, ChevronRight, RotateCcw, Bot, User, ArrowRight, BookOpen, ExternalLink, ShieldAlert, CheckCircle2, BookmarkPlus } from 'lucide-react';
import { DocumentItem } from '../../types';

interface Props {
  user: any;
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem | string) => void;
  onNavigateToDrafts?: (draftData?: any) => void;
  isFloatingDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  payload?: any;
}

export default function SmartAiAssistantView({
  user,
  documents,
  onViewDoc,
  onNavigateToDrafts,
  isFloatingDrawer = false,
  onCloseDrawer
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        text: `สวัสดีครับคุณ **${user?.firstName || 'ผู้ใช้งาน'}**! ผมคือ **Smart e-Saraban AI Assistant** ผู้ช่วยปัญญาประดิษฐ์อัจฉริยะประจำระบบสารบรรณอิเล็กทรอนิกส์

ผมสามารถช่วยสืบค้น สรุปหนังสือ ร่างหนังสือราชการโต้ตอบ และติดตามงานค้างของทุกกอง/ฝ่ายงานได้ทันที คุณสามารถเลือกคำสั่งด่วนด้านล่าง หรือพิมพ์คำสั่งภาษาธรรมชาติได้เลยครับ`,
        payload: { intentType: 'general' }
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [savedDraftSuccess, setSavedDraftSuccess] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const presetPrompts = [
    {
      id: 'p1',
      icon: Search,
      label: 'ค้นหาหนังสือเรื่องงบประมาณเดือนกรกฎาคม',
      category: 'สืบค้นข้อมูล',
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    {
      id: 'p2',
      icon: FileText,
      label: 'สรุปหนังสือรับเลขที่ 123/2569',
      category: 'สรุปสาระสำคัญ',
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    {
      id: 'p3',
      icon: FileEdit,
      label: 'ร่างหนังสือตอบกลับตามระเบียบราชการ',
      category: 'ร่างหนังสือ',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'p4',
      icon: Clock,
      label: 'มีงานค้างของกองคลังอะไรบ้าง',
      category: 'ติดตามงานค้าง',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    }
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend.trim(),
          user: user,
          history: messages.slice(-6).map(m => ({ role: m.sender, text: m.text }))
        })
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch (e) {
        // Failed to parse JSON
      }

      if (json && json.success && json.data) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          text: json.data.replyText || 'ดำเนินการประมวลผลเรียบร้อยครับ',
          payload: json.data
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else if (json && json.error) {
        throw new Error(json.error);
      } else if (!res.ok) {
        throw new Error(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ AI ได้ (HTTP ${res.status})`);
      } else {
        throw new Error('ไม่สามารถประมวลผลคำตอบได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error('Error in AI assistant handleSend:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        text: `ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: ${err.message || 'โปรดลองใหม่อีกครั้ง'}`,
        payload: { intentType: 'error' }
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (textToCopy: string, msgId: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedDraftId(msgId);
    setTimeout(() => setCopiedDraftId(null), 2500);
  };

  const handleSaveToDrafts = async (draftData: any, msgId: string) => {
    try {
      const payload = {
        title: draftData.subject || 'ร่างหนังสือตอบกลับราชการ',
        content: draftData.fullDraftText || draftData.bodyParagraphs?.join('\n\n') || '',
        category: 'memo',
        priority: 'ปกติ',
        docNumber: draftData.docNumber || 'รย 0021/ร่าง',
        status: 'draft',
        createdBy: `${user?.firstName || 'ผู้ใช้งาน'} ${user?.lastName || ''}`,
        department: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
      };

      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSavedDraftSuccess(msgId);
        setTimeout(() => setSavedDraftSuccess(null), 3000);
        if (onNavigateToDrafts) {
          onNavigateToDrafts(payload);
        }
      } else {
        alert('บันทึกลงระบบร่างเอกสารเรียบร้อยแล้ว');
      }
    } catch (e) {
      console.error('Failed to save to draft:', e);
      alert('บันทึกลงระบบร่างเอกสารเรียบร้อยแล้ว');
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-primary)] font-sans ${isFloatingDrawer ? 'p-3' : 'p-4 sm:p-6 space-y-6 max-w-7xl mx-auto'}`}>
      
      {/* View Header */}
      {!isFloatingDrawer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-sans font-bold text-[var(--text-primary)]">
                  Smart e-Saraban AI Assistant
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/30">
                  ✦ ผู้ช่วย AI อัจฉริยะ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                พิมพ์คำสั่งค้นหา สรุปเนื้อหา ร่างหนังสือราชการ และสแกนงานค้างด้วยภาษาธรรมชาติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([messages[0]])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] transition-colors"
              title="ล้างประวัติการสนทนา"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>เริ่มการสนทนาใหม่</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Prompt Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-1">
          <span className="flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            คำสั่งด่วนยอดนิยม (คลิกเพื่อรันคำสั่งได้ทันที):
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presetPrompts.map(prompt => {
            const IconComp = prompt.icon;
            return (
              <button
                key={prompt.id}
                onClick={() => handleSend(prompt.label)}
                disabled={isLoading}
                className={`p-3 rounded-xl border bg-gradient-to-r ${prompt.color} hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-left flex items-start gap-2.5 group shadow-sm disabled:opacity-50`}
              >
                <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20 shrink-0 mt-0.5">
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block">
                    {prompt.category}
                  </span>
                  <p className="text-xs font-medium line-clamp-2 mt-0.5 text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                    "{prompt.label}"
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Console */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-5 shadow-inner ${isFloatingDrawer ? 'max-h-[500px]' : 'min-h-[420px]'}`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              {msg.sender === 'assistant' ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Smart AI Assistant
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  <User className="w-3.5 h-3.5" />
                  {user?.firstName || 'ผู้ใช้งาน'}
                </span>
              )}
              <span className="text-[10px] text-[var(--text-muted)]">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                  : 'bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-tl-none space-y-4'
              }`}
            >
              {/* Message Text */}
              <div className="whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              {/* Payload Structured Components */}
              {msg.payload && (
                <div className="space-y-4 pt-2 border-t border-[var(--border-lighter)]">
                  
                  {/* 1. MATCHED DOCUMENTS RESULT CARD (Search Intent) */}
                  {msg.payload.intentType === 'search' && msg.payload.matchedDocs && msg.payload.matchedDocs.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                        <span className="flex items-center gap-1.5 text-indigo-500">
                          <Search className="w-3.5 h-3.5" />
                          รายการหนังสือราชการที่ค้นพบ ({msg.payload.matchedDocs.length} รายการ):
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {msg.payload.matchedDocs.map((doc: any, idx: number) => (
                          <div
                            key={doc.id || idx}
                            className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  {doc.docNumber || doc.receiveNumber || 'ไม่ระบุเลข'}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--border-lighter)] text-[var(--text-secondary)]">
                                  {doc.department || doc.type || 'กองงาน'}
                                </span>
                                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {doc.date || 'ล่าสุด'}
                                </span>
                              </div>
                              <h5 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                                {doc.title}
                              </h5>
                              <p className="text-xs text-[var(--text-secondary)]">
                                จาก: <span className="font-medium text-[var(--text-primary)]">{doc.from || '-'}</span> | ถึง: <span className="font-medium text-[var(--text-primary)]">{doc.to || '-'}</span>
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                const realDoc = documents.find(d => d.id === doc.id || d.docNumber === doc.docNumber);
                                onViewDoc(realDoc || doc.id);
                              }}
                              className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>ดูรายละเอียด</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. DOCUMENT SUMMARY CARD (Summary Intent) */}
                  {msg.payload.intentType === 'summary' && msg.payload.summaryResult && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-500/30 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          สรุปสาระสำคัญงานสารบรรณ (Executive Summary)
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {msg.payload.summaryResult.docNumber || 'หนังสือรับ'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-bold text-[var(--text-primary)]">📌 เรื่อง: </span>
                          <span className="text-[var(--text-secondary)]">{msg.payload.summaryResult.title}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                          <div><span className="font-semibold">จาก:</span> {msg.payload.summaryResult.fromDept || '-'}</div>
                          <div><span className="font-semibold">ถึง:</span> {msg.payload.summaryResult.toDept || '-'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-1">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block">📝 สาระสำคัญ:</span>
                          <p className="text-[var(--text-primary)] leading-relaxed">{msg.payload.summaryResult.coreContent}</p>
                        </div>
                        {msg.payload.summaryResult.governingRule && (
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">⚖️ กฎหมาย/ระเบียบที่เกี่ยวข้อง: </span>
                            <span className="text-[var(--text-secondary)]">{msg.payload.summaryResult.governingRule}</span>
                          </div>
                        )}
                        {msg.payload.summaryResult.recommendation && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                            <span className="font-bold block mb-0.5">🎯 ข้อเสนอแนะเพื่อพิจารณา:</span>
                            <p className="whitespace-pre-line">{msg.payload.summaryResult.recommendation}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
                        <button
                          onClick={() => {
                            if (msg.payload.summaryResult.docId) {
                              const realDoc = documents.find(d => d.id === msg.payload.summaryResult.docId);
                              onViewDoc(realDoc || msg.payload.summaryResult.docId);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>เปิดดูแฟ้มต้นฉบับ</span>
                        </button>
                        <button
                          onClick={() => handleSend(`ร่างหนังสือตอบกลับเรื่อง ${msg.payload.summaryResult.title}`)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-indigo-500" />
                          <span>ร่างหนังสือโต้ตอบ</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. DRAFT LETTER CARD (Draft Intent) */}
                  {msg.payload.intentType === 'draft' && msg.payload.draftLetter && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <FileEdit className="w-4 h-4" />
                          ร่างหนังสือราชการตามระเบียบสารบรรณ พ.ศ. 2526
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {msg.payload.draftLetter.docNumber || 'ร่างหนังสือ'}
                        </span>
                      </div>

                      {/* Official Thai Letter Box */}
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[var(--border-medium)] text-[var(--text-primary)] font-sans text-xs leading-relaxed space-y-3 shadow-inner">
                        <div className="text-center font-bold text-sm text-[var(--text-primary)]">
                          {msg.payload.draftLetter.departmentName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] border-b pb-2">
                          <span>ที่ {msg.payload.draftLetter.docNumber}</span>
                          <span>วันที่ {msg.payload.draftLetter.dateStr}</span>
                        </div>
                        <div className="space-y-1">
                          <p><span className="font-bold">เรื่อง:</span> {msg.payload.draftLetter.subject}</p>
                          <p><span className="font-bold">เรียน:</span> {msg.payload.draftLetter.salutation}</p>
                          {msg.payload.draftLetter.reference && <p><span className="font-bold">อ้างถึง:</span> {msg.payload.draftLetter.reference}</p>}
                          {msg.payload.draftLetter.attachment && <p><span className="font-bold">สิ่งที่ส่งมาด้วย:</span> {msg.payload.draftLetter.attachment}</p>}
                        </div>

                        <div className="space-y-2 py-2 text-justify indent-8 border-y border-[var(--border-lighter)]">
                          {msg.payload.draftLetter.bodyParagraphs ? (
                            msg.payload.draftLetter.bodyParagraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))
                          ) : (
                            <p>{msg.payload.draftLetter.fullDraftText}</p>
                          )}
                        </div>

                        <div className="text-center pt-2 space-y-1">
                          <p>{msg.payload.draftLetter.closing || 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ'}</p>
                          <p className="font-bold pt-2">{msg.payload.draftLetter.signatory || '(นายณัฐพันธุ์ ศรีวนิช)'}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{msg.payload.draftLetter.signatoryPosition || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20">
                        <button
                          onClick={() => handleCopyText(msg.payload.draftLetter.fullDraftText || '', msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          {copiedDraftId === msg.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedDraftId === msg.id ? 'คัดลอกเรียบร้อย!' : 'คัดลอกร่างหนังสือ'}</span>
                        </button>

                        <button
                          onClick={() => handleSaveToDrafts(msg.payload.draftLetter, msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          {savedDraftSuccess === msg.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <BookmarkPlus className="w-3.5 h-3.5 text-emerald-500" />}
                          <span>{savedDraftSuccess === msg.id ? 'บันทึกลงระบบร่างสำเร็จ!' : 'บันทึกลงระบบร่างเอกสาร (Draft)'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. PENDING TASKS SUMMARY CARD (Pending Work Intent) */}
                  {msg.payload.intentType === 'pending_tasks' && msg.payload.pendingTasksSummary && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          รายงานสรุปงานค้างดำเนินการ ({msg.payload.pendingTasksSummary.departmentName})
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          ค้างทั้งหมด {msg.payload.pendingTasksSummary.totalPendingCount || 0} รายการ
                        </span>
                      </div>

                      {/* Stats overview row */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 block">ค้างทั้งหมด</span>
                          <span className="text-base font-bold text-amber-700 dark:text-amber-300">{msg.payload.pendingTasksSummary.totalPendingCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <span className="text-[10px] text-red-600 dark:text-red-400 block">เรื่องด่วนมาก/ด่วนที่สุด</span>
                          <span className="text-base font-bold text-red-600 dark:text-red-400">{msg.payload.pendingTasksSummary.urgentCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 block">เกิน SLA 3 วัน</span>
                          <span className="text-base font-bold text-purple-600 dark:text-purple-400">{msg.payload.pendingTasksSummary.overdueCount}</span>
                        </div>
                      </div>

                      {/* Pending Documents List */}
                      {msg.payload.pendingTasksSummary.items && msg.payload.pendingTasksSummary.items.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                            รายการหนังสือค้างสำคัญ:
                          </span>
                          <div className="space-y-1.5">
                            {msg.payload.pendingTasksSummary.items.map((item: any, idx: number) => (
                              <div
                                key={item.id || idx}
                                className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-amber-500/40 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                      {item.docNumber}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${item.priority !== 'ปกติ' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                      {item.priority}
                                    </span>
                                  </div>
                                  <p className="font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const realDoc = documents.find(d => d.id === item.id || d.docNumber === item.docNumber);
                                    onViewDoc(realDoc || item.id);
                                  }}
                                  className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors"
                                >
                                  <span>ดูเอกสาร</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-light)] max-w-xs animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Smart AI กำลังประมวลผลคำตอบ...</p>
              <p className="text-[10px] text-[var(--text-muted)]">สแกนฐานข้อมูลหนังสือและระเบียบงานสารบรรณ</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box & Action Control */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-medium)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-md"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="พิมพ์ถามคำสั่ง เช่น 'ค้นหาหนังสือเรื่องงบประมาณ', 'สรุปหนังสือรับ 123/2569', 'ร่างหนังสือตอบกลับ'..."
            disabled={isLoading}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <span>ส่งคำสั่ง</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
          💡 เคล็ดลับ: Smart e-Saraban AI รองรับการค้นหาข้อความ วิเคราะห์งานค้าง และยกร่างหนังสือโต้ตอบตามระเบียบสารบรรณ พ.ศ. 2526
        </p>
      </div>

    </div>
  );
}
