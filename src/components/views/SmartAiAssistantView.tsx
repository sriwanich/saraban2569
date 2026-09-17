import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Search,
  FileText,
  FileEdit,
  Clock,
  Check,
  Copy,
  AlertCircle,
  Building2,
  ChevronRight,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  BookmarkPlus,
  Printer,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Download,
  Paperclip,
  X,
  Filter,
  Flame,
  CheckSquare,
  HelpCircle,
  Scale,
  Wand2,
  Share2,
  Eye,
  FileCode,
  Layers,
  Calendar,
  Tag,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import A4PaperPreview from '../A4PaperPreview';
import { DocumentItem } from '../../types';

interface Props {
  user: any;
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem | string) => void;
  onNavigateToDrafts?: (draftData?: any) => void;
  onNavigateToTab?: (tab: string) => void;
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

type PromptCategory = 'all' | 'search' | 'disaster' | 'summary' | 'draft' | 'pending' | 'rewrite' | 'regulation';

export default function SmartAiAssistantView({
  user,
  documents,
  onViewDoc,
  onNavigateToDrafts,
  onNavigateToTab,
  isFloatingDrawer = false,
  onCloseDrawer
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        text: `สวัสดีครับคุณ **${user?.firstName || 'ผู้ใช้งาน'}**! ผมคือ **Smart e-Saraban AI Assistant** ผู้ช่วยปัญญาประดิษฐ์อัจฉริยะประจำระบบสารบรรณอิเล็กทรอนิกส์ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

ผมพร้อมช่วยดูแลงานสารบรรณครบวงจร:
• 🔍 **สืบค้นเอกสารอัจฉริยะ**: ค้นตามเรื่อง, เลขที่, ฝ่ายงาน, หรือเนื้อหา
• 📝 **สรุปสาระสำคัญ**: สรุปประเด็น ข้อกฎหมาย และแนวทางปฏิบัติ
• ✍️ **ยกร่างหนังสือราชการ**: ทั้งหนังสือภายนอก หนังสือภายใน และบันทึกข้อความตามระเบียบ พ.ศ. 2526
• ⏱️ **วิเคราะห์งานค้าง & SLA**: ติดตามหนังสือค้างดำเนินการของ 3 ฝ่ายงาน
• ✒️ **ขัดเกลาสำนวนภาษาราชการ**: ปรับภาษาพูดเป็นภาษาราชการที่ถูกต้อง

ท่านสามารถเลือกคำสั่งด่วนด้านล่าง แนบเอกสารเพื่อวิเคราะห์ หรือพิมพ์คำสั่งได้ทันทีครับ`,
        payload: {
          intentType: 'general',
          suggestedFollowUps: [
            'ค้นหาหนังสือเรื่องงบประมาณและอุทกภัย',
            'สรุปหนังสือรับล่าสุดในระบบ',
            'ยกร่างหนังสือตอบกลับตามระเบียบ',
            'วิเคราะห์งานค้างฝ่ายยุทธศาสตร์และการจัดการ'
          ]
        }
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [savedDraftSuccess, setSavedDraftSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('all');
  const [attachedDoc, setAttachedDoc] = useState<DocumentItem | null>(null);
  const [attachedIncident, setAttachedIncident] = useState<any | null>(null);
  const [urgentIncidents, setUrgentIncidents] = useState<any[]>([]);
  const [selectedIncidentModal, setSelectedIncidentModal] = useState<any | null>(null);
  const [selectorTab, setSelectorTab] = useState<'docs' | 'incidents'>('docs');
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState<Record<string, 'official' | 'raw'>>({});

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load Urgent Incidents
  useEffect(() => {
    fetch('/api/urgent-incidents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUrgentIncidents(data);
        } else if (data && data.success && Array.isArray(data.data)) {
          setUrgentIncidents(data.data);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch urgent incidents for AI assistant:', err);
      });
  }, []);

  // Preset Prompts categorized
  const presetPrompts = [
    {
      id: 'p-disaster-1',
      icon: ShieldAlert,
      label: 'ค้นหารายงานเหตุด่วนสาธารณภัยล่าสุดในจังหวัดระยอง',
      category: 'disaster',
      categoryName: 'เหตุด่วนสาธารณภัย',
      color: 'from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    },
    {
      id: 'p-disaster-2',
      icon: Flame,
      label: 'สรุปรายงานเหตุด่วนอุทกภัยและวาตภัยในพื้นที่อำเภอเมืองระยอง',
      category: 'disaster',
      categoryName: 'เหตุด่วนสาธารณภัย',
      color: 'from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    },
    {
      id: 'p-disaster-3',
      icon: AlertTriangle,
      label: 'ค้นหาเหตุด่วนสารเคมีรั่วไหล/อัคคีภัยในนิคมอุตสาหกรรมปลวกแดง',
      category: 'disaster',
      categoryName: 'เหตุด่วนสาธารณภัย',
      color: 'from-amber-500/10 to-red-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
      id: 'p-disaster-4',
      icon: FileEdit,
      label: 'ยกร่างหนังสือรายงานเหตุด่วนสาธารณภัยถึงผู้ว่าราชการจังหวัดระยอง',
      category: 'disaster',
      categoryName: 'เหตุด่วนสาธารณภัย',
      color: 'from-rose-500/10 to-orange-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    },
    {
      id: 'p-search-1',
      icon: Search,
      label: 'ค้นหาหนังสือเรื่องงบประมาณเดือนกรกฎาคม',
      category: 'search',
      categoryName: 'สืบค้นข้อมูล',
      color: 'from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    {
      id: 'p-search-2',
      icon: Search,
      label: 'ค้นหาหนังสือด่วนที่สุดและหนังสือเวียนทั้งหมด',
      category: 'search',
      categoryName: 'สืบค้นข้อมูล',
      color: 'from-sky-500/10 to-blue-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    },
    {
      id: 'p-sum-1',
      icon: FileText,
      label: 'สรุปหนังสือรับเลขที่ 123/2569 พร้อมข้อเสนอแนะ',
      category: 'summary',
      categoryName: 'สรุปสาระสำคัญ',
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    {
      id: 'p-sum-2',
      icon: BookOpen,
      label: 'สรุปสาระสำคัญของหนังสือที่เกี่ยวข้องกับภัยพิบัติ',
      category: 'summary',
      categoryName: 'สรุปสาระสำคัญ',
      color: 'from-fuchsia-500/10 to-purple-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
    },
    {
      id: 'p-draft-1',
      icon: FileEdit,
      label: 'ยกร่างหนังสือตอบกลับตามระเบียบสำนักนายกฯ 2526',
      category: 'draft',
      categoryName: 'ร่างหนังสือราชการ',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'p-draft-2',
      icon: Wand2,
      label: 'ร่างบันทึกข้อความภายในขออนุมัติจัดซื้อจัดจ้างครุภัณฑ์',
      category: 'draft',
      categoryName: 'ร่างหนังสือราชการ',
      color: 'from-teal-500/10 to-emerald-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    },
    {
      id: 'p-pending-1',
      icon: Clock,
      label: 'วิเคราะห์งานค้างและ SLA ของฝ่ายยุทธศาสตร์และการจัดการ',
      category: 'pending',
      categoryName: 'ติดตามงานค้าง',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
      id: 'p-pending-2',
      icon: ShieldAlert,
      label: 'ตรวจสอบหนังสือค้างดำเนินการของฝ่ายป้องกันและปฏิบัติการ',
      category: 'pending',
      categoryName: 'ติดตามงานค้าง',
      color: 'from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    },
    {
      id: 'p-rewrite-1',
      icon: Wand2,
      label: 'ขัดเกลาข้อความให้เป็นภาษาราชการ: "ขอให้ช่วยส่งข้อมูลด่วน จะรีบสรุปยอดเงิน"',
      category: 'rewrite',
      categoryName: 'ขัดเกลาสำนวน',
      color: 'from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    },
    {
      id: 'p-reg-1',
      icon: Scale,
      label: 'สอบถามอายุการเก็บรักษาและระเบียบการทำลายหนังสือราชการ',
      category: 'regulation',
      categoryName: 'ระเบียบสารบรรณ',
      color: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    }
  ];

  const filteredPrompts = selectedCategory === 'all'
    ? presetPrompts
    : presetPrompts.filter(p => p.category === selectedCategory);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech to Text (Voice Recognition) Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'th-TH';
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      alert('เบราว์เซอร์นี้ยังไม่รองรับการพิมพ์ด้วยเสียง (Web Speech API)');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // Text-to-Speech (TTS)
  const handleSpeak = (textToSpeak: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียงข้อความ');
      return;
    }

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown characters for smoother voice narration
    const cleanText = textToSpeak
      .replace(/[*#_`>]/g, '')
      .replace(/•/g, ', ')
      .replace(/https?:\/\/\S+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const currentAttached = attachedDoc;
    const currentAttachedIncident = attachedIncident;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim(),
      payload: currentAttached 
        ? { attachedDocInfo: { title: currentAttached.title, docNumber: currentAttached.docNumber || currentAttached.receiveNumber } }
        : currentAttachedIncident 
        ? { attachedIncidentInfo: { reportNumber: currentAttachedIncident.reportNumber || currentAttachedIncident.id, incidentTypes: currentAttachedIncident.incidentTypes, district: currentAttachedIncident.district } }
        : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    const sanitizedSelectedDoc = currentAttached ? {
      id: currentAttached.id,
      docNumber: currentAttached.docNumber || currentAttached.receiveNumber || '',
      receiveNumber: currentAttached.receiveNumber || '',
      title: currentAttached.title || '',
      from: currentAttached.from || '',
      to: currentAttached.to || '',
      department: currentAttached.department || '',
      date: currentAttached.date || '',
      priority: currentAttached.priority || 'ปกติ',
      status: currentAttached.status || 'pending',
      content: (currentAttached.content || '').substring(0, 2500),
      note: (currentAttached.note || '').substring(0, 1000)
    } : null;

    const sanitizedSelectedIncident = currentAttachedIncident ? {
      id: currentAttachedIncident.id,
      reportNumber: currentAttachedIncident.reportNumber || '',
      incidentTypes: currentAttachedIncident.incidentTypes || [],
      province: currentAttachedIncident.province || 'ระยอง',
      district: currentAttachedIncident.district || '',
      subdistrict: currentAttachedIncident.subdistrict || '',
      village: currentAttachedIncident.village || '',
      incidentDate: currentAttachedIncident.incidentDate || '',
      incidentTime: currentAttachedIncident.incidentTime || '',
      status: currentAttachedIncident.status || 'กำลังเผชิญเหตุ',
      affectedPeople: currentAttachedIncident.affectedPeople || 0,
      affectedHouseholds: currentAttachedIncident.affectedHouseholds || 0,
      injuredCount: currentAttachedIncident.injuredCount || 0,
      deceasedCount: currentAttachedIncident.deceasedCount || 0,
      missingCount: currentAttachedIncident.missingCount || 0,
      estimatedDamage: currentAttachedIncident.estimatedDamage || '',
      circumstances: currentAttachedIncident.circumstances || '',
      actionsTaken: currentAttachedIncident.actionsTaken || '',
      proposals: currentAttachedIncident.proposals || []
    } : null;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: textToSend.trim(),
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            position: user.position,
            department: user.department
          } : undefined,
          selectedDoc: sanitizedSelectedDoc,
          selectedIncident: sanitizedSelectedIncident,
          history: messages.slice(-6).map(m => ({ role: m.sender, text: m.text }))
        })
      });

      clearTimeout(timeoutTimer);

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
      clearTimeout(timeoutTimer);
      console.error('Error in AI assistant handleSend:', err);

      let friendlyMsg = err?.message || 'โปรดลองใหม่อีกครั้ง';
      if (err?.name === 'AbortError' || friendlyMsg.includes('aborted') || friendlyMsg.includes('AbortError')) {
        friendlyMsg = 'การเชื่อมต่อไปยังระบบ AI ใช้เวลานานเกินกำหนด กรุณากดลองส่งใหม่อีกครั้ง';
      } else if (friendlyMsg === 'Failed to fetch' || friendlyMsg.includes('Failed to fetch') || friendlyMsg.includes('NetworkError')) {
        friendlyMsg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ AI ได้ในขณะนี้ (เครือข่ายขัดข้องหรือเซิร์ฟเวอร์กำลังรีสตาร์ท) กรุณากดปุ่มลองส่งใหม่อีกครั้ง';
      }

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        text: `ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: ${friendlyMsg}`,
        payload: {
          intentType: 'error',
          failedPrompt: textToSend.trim(),
          errorDetails: friendlyMsg
        }
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
        content: draftData.fullDraftText || (draftData.bodyParagraphs ? draftData.bodyParagraphs.join('\n\n') : ''),
        category: 'memo',
        priority: 'ปกติ',
        docNumber: draftData.docNumber || 'รย 0021/ร่าง',
        status: 'draft',
        createdBy: `${user?.firstName || 'ผู้ใช้งาน'} ${user?.lastName || ''}`,
        department: user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ'
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
        setSavedDraftSuccess(msgId);
        setTimeout(() => setSavedDraftSuccess(null), 3000);
      }
    } catch (e) {
      console.error('Failed to save to draft:', e);
      setSavedDraftSuccess(msgId);
      setTimeout(() => setSavedDraftSuccess(null), 3000);
    }
  };

  const handlePrintDraft = (draftText: string, title?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตป๊อปอัปเพื่อเปิดหน้าพิมพ์เอกสาร');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'แบบร่างหนังสือราชการ'}</title>
          <style>
            @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
            body {
              font-family: 'Sarabun', 'TH Sarabun New', 'Cordia New', sans-serif;
              font-size: 16pt;
              line-height: 1.6;
              color: #000;
              margin: 0;
              padding: 20px;
            }
            .garuda {
              text-align: center;
              font-size: 28pt;
              margin-bottom: 15px;
            }
            .content {
              white-space: pre-wrap;
              text-align: justify;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="garuda">ครุฑ</div>
          <div class="content">${draftText}</div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportChatHistory = () => {
    const chatText = messages
      .map(m => `[${m.timestamp}] ${m.sender === 'assistant' ? 'Smart AI' : user?.firstName || 'User'}:\n${m.text}\n`)
      .join('\n----------------------------------------\n\n');

    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saraban_ai_chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-primary)] font-sans ${isFloatingDrawer ? 'p-3' : 'pb-8 animate-fade-in'}`}>
      
      {/* Header Banner */}
      {!isFloatingDrawer && (
        <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-5 lg:p-7 shadow-sm relative overflow-hidden mb-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-[90px] pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    Smart AI Assistant
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    พร้อมใช้งาน
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  ผู้ช่วยอัจฉริยะวิเคราะห์ สรุป ยกร่างหนังสือ และติดตามภาระงานตามระเบียบงานสารบรรณ พ.ศ. ๒๕๒๖
                </p>
              </div>
            </div>

            {/* Utility Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportChatHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-indigo-500/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-indigo-600 transition-all shadow-sm"
                title="ส่งออกบันทึกการสนทนา"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ส่งออกบทสนทนา</span>
              </button>

              <button
                onClick={() => setMessages([messages[0]])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-indigo-500/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-indigo-600 transition-all shadow-sm"
                title="เริ่มการสนทนาใหม่"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เริ่มสนทนาใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs & Context Bar */}
      <div className="space-y-3 mb-4">
        
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-medium">
          <span className="text-[var(--text-muted)] text-[11px] font-bold px-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> หมวดหมู่:
          </span>
          {[
            { id: 'all', label: '🌟 ทั้งหมด' },
            { id: 'disaster', label: '🚨 เหตุด่วนสาธารณภัย' },
            { id: 'search', label: '🔍 ค้นหาเอกสาร' },
            { id: 'summary', label: '📝 สรุปสาระสำคัญ' },
            { id: 'draft', label: '✍️ ยกร่างหนังสือ' },
            { id: 'pending', label: '⏱️ ติดตามงานค้าง' },
            { id: 'rewrite', label: '✒️ ขัดเกลาภาษาราชการ' },
            { id: 'regulation', label: '⚖️ ระเบียบสารบรรณ' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as PromptCategory)}
              className={`px-3 py-1.5 rounded-full shrink-0 transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-[var(--bg-overlay)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Attached Document or Incident Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-xs">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
            {attachedDoc ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  📌 แนบเอกสารอ้างอิง:
                </span>
                <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                  {attachedDoc.docNumber || attachedDoc.receiveNumber || 'ไม่ระบุเลข'}
                </span>
                <span className="text-[var(--text-primary)] font-medium max-w-xs sm:max-w-md truncate">
                  "{attachedDoc.title}"
                </span>
                <button
                  onClick={() => setAttachedDoc(null)}
                  className="p-1 rounded-full hover:bg-red-500/10 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  title="ปลดเอกสารที่แนบ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : attachedIncident ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-red-600 dark:text-red-400">
                  🚨 แนบรายงานเหตุด่วน:
                </span>
                <span className="font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                  {attachedIncident.reportNumber || attachedIncident.id}
                </span>
                <span className="text-[var(--text-primary)] font-medium max-w-xs sm:max-w-md truncate">
                  "{Array.isArray(attachedIncident.incidentTypes) ? attachedIncident.incidentTypes.join(', ') : attachedIncident.incidentTypes || 'สาธารณภัย'}" (อ.{attachedIncident.district || 'เมืองระยอง'})
                </span>
                <button
                  onClick={() => setAttachedIncident(null)}
                  className="p-1 rounded-full hover:bg-red-500/10 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  title="ปลดรายงานที่แนบ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[var(--text-secondary)]">
                ต้องการวิเคราะห์หนังสือราชการ หรือ รายงานเหตุด่วนสาธารณภัยเฉพาะเรื่องหรือไม่?
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {attachedDoc ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSend(`สรุปสาระสำคัญของหนังสือ "${attachedDoc.title}" (${attachedDoc.docNumber || attachedDoc.receiveNumber})`)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium transition-colors cursor-pointer"
                >
                  📝 สรุปเรื่องนี้
                </button>
                <button
                  onClick={() => handleSend(`ยกร่างหนังสือตอบกลับเรื่อง "${attachedDoc.title}" (${attachedDoc.docNumber || attachedDoc.receiveNumber})`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors cursor-pointer"
                >
                  ✍️ ร่างตอบกลับ
                </button>
              </div>
            ) : attachedIncident ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSend(`สรุปความเสียหายและมาตรการช่วยเหลือของรายงานเหตุด่วน ${attachedIncident.reportNumber || attachedIncident.id}`)}
                  className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium transition-colors cursor-pointer"
                >
                  📝 สรุปความเสียหาย
                </button>
                <button
                  onClick={() => handleSend(`ยกร่างหนังสือรายงานเหตุด่วนสาธารณภัยถึงผู้ว่าราชการจังหวัดระยอง จากรายงาน ${attachedIncident.reportNumber || attachedIncident.id} ${Array.isArray(attachedIncident.incidentTypes) ? attachedIncident.incidentTypes.join(', ') : ''} ที่ อ.${attachedIncident.district || 'เมืองระยอง'}`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors cursor-pointer"
                >
                  ✍️ ยกร่างรายงาน ผวจ.
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsDocSelectorOpen(!isDocSelectorOpen)}
                className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{isDocSelectorOpen ? 'ปิดหน้าต่างเลือก' : 'เลือกแนบเอกสาร / เหตุด่วน'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Document & Incident Selector Dropdown */}
        {isDocSelectorOpen && !attachedDoc && !attachedIncident && (
          <div className="p-3 rounded-2xl bg-[var(--bg-elevated)] border border-indigo-500/30 shadow-lg space-y-2 animate-fade-in">
            {/* Tabs for choosing between Documents and Incidents */}
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectorTab('docs')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectorTab === 'docs'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  📄 หนังสือราชการ ({documents.length})
                </button>
                <button
                  onClick={() => setSelectorTab('incidents')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectorTab === 'incidents'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  🚨 แบบรายงานเหตุด่วนสาธารณภัย ({urgentIncidents.length})
                </button>
              </div>
              <button
                onClick={() => setIsDocSelectorOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Documents Tab */}
            {selectorTab === 'docs' && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {documents.slice(0, 15).map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setAttachedDoc(doc);
                      setAttachedIncident(null);
                      setIsDocSelectorOpen(false);
                    }}
                    className="p-2 rounded-xl bg-[var(--bg-overlay)] hover:bg-indigo-500/10 border border-[var(--border-light)] hover:border-indigo-500/40 cursor-pointer flex items-center justify-between gap-3 text-xs transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {doc.docNumber || doc.receiveNumber || 'ไม่ระบุเลข'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--border-light)] text-[var(--text-secondary)]">
                          {doc.department || 'ฝ่ายงาน'}
                        </span>
                      </div>
                      <p className="font-medium text-[var(--text-primary)] truncate">{doc.title}</p>
                    </div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                      แนบหนังสือนี้ ➔
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Incidents Tab */}
            {selectorTab === 'incidents' && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {urgentIncidents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    ยังไม่มีข้อมูลรายงานเหตุด่วนสาธารณภัยในระบบ
                  </div>
                ) : (
                  urgentIncidents.slice(0, 15).map((inc: any) => {
                    const types = Array.isArray(inc.incidentTypes) ? inc.incidentTypes.join(', ') : inc.incidentTypes || 'สาธารณภัย';
                    return (
                      <div
                        key={inc.id}
                        onClick={() => {
                          setAttachedIncident(inc);
                          setAttachedDoc(null);
                          setIsDocSelectorOpen(false);
                        }}
                        className="p-2 rounded-xl bg-[var(--bg-overlay)] hover:bg-red-500/10 border border-[var(--border-light)] hover:border-red-500/40 cursor-pointer flex items-center justify-between gap-3 text-xs transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-600 dark:text-red-400">
                              {inc.reportNumber || inc.id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-600 font-semibold">
                              {types}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              📍 อ.{inc.district || '-'} ต.{inc.subdistrict || '-'}
                            </span>
                          </div>
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {inc.circumstances || `รายงานเหตุด่วนสาธารณภัย (${types})`}
                          </p>
                        </div>
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold shrink-0">
                          แนบรายงานเหตุด่วนนี้ ➔
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Prompt Cards Carousel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {filteredPrompts.slice(0, 4).map(prompt => {
            const IconComp = prompt.icon;
            return (
              <button
                key={prompt.id}
                onClick={() => handleSend(prompt.label)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border bg-gradient-to-r ${prompt.color} hover:scale-[1.01] active:scale-[0.99] transition-all text-left flex items-start gap-2.5 group shadow-xs disabled:opacity-50`}
              >
                <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20 shrink-0 mt-0.5">
                  <IconComp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block">
                    {prompt.categoryName}
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
      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-5 shadow-inner ${isFloatingDrawer ? 'max-h-[480px]' : 'min-h-[420px]'}`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Meta Info */}
            <div className="flex items-center gap-2 mb-1 px-1">
              {msg.sender === 'assistant' ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Smart AI Assistant
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  {user?.firstName || 'ผู้ใช้งาน'}
                </span>
              )}
              <span className="text-[10px] text-[var(--text-muted)]">{msg.timestamp}</span>
            </div>

            {/* Bubble Container */}
            <div
              className={`max-w-[95%] sm:max-w-[88%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                  : 'bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-tl-none space-y-4'
              }`}
            >
              {/* Attached Doc Pill on User Message */}
              {msg.payload?.attachedDocInfo && (
                <div className="mb-2 p-1.5 px-2.5 rounded-lg bg-white/10 text-[11px] font-medium flex items-center gap-1.5">
                  <Paperclip className="w-3 h-3" />
                  <span>แนบเอกสาร: {msg.payload.attachedDocInfo.docNumber} - {msg.payload.attachedDocInfo.title}</span>
                </div>
              )}

              {/* Message Text with Clean Styling */}
              <div className="whitespace-pre-wrap font-sans leading-relaxed">
                {msg.text}
              </div>

              {/* Action Controls for Assistant Message */}
              {msg.sender === 'assistant' && (
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-lighter)] text-xs">
                  <button
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="คัดลอกข้อความ"
                  >
                    {copiedDraftId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDraftId === msg.id ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>

                  <button
                    onClick={() => handleSpeak(msg.text, msg.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-indigo-600 transition-colors"
                    title="อ่านออกเสียง"
                  >
                    {isSpeaking === msg.id ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{isSpeaking === msg.id ? 'หยุดอ่าน' : 'อ่านออกเสียง'}</span>
                  </button>
                </div>
              )}

              {/* Payload Structured Components */}
              {msg.payload && (
                <div className="space-y-4 pt-1">
                  
                  {/* 0. ERROR & RETRY (Error Intent) */}
                  {msg.payload.intentType === 'error' && (
                    <div className="mt-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>ท่านสามารถกดปุ่มลองส่งใหม่อีกครั้ง หรือพิมพ์คำถามใหม่ได้ทันที</span>
                      </div>
                      {msg.payload.failedPrompt && (
                        <button
                          onClick={() => handleSend(msg.payload.failedPrompt)}
                          disabled={isLoading}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>ลองส่งใหม่อีกครั้ง</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 1. MATCHED DOCUMENTS (Search Intent) */}
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
                                  {doc.department || doc.type || 'ฝ่ายงาน'}
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
                              {doc.matchReason && (
                                <p className="text-[11px] text-indigo-500 font-medium">
                                  💡 {doc.matchReason}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  const realDoc = documents.find(d => d.id === doc.id || d.docNumber === doc.docNumber);
                                  onViewDoc(realDoc || doc.id);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>ดูเอกสาร</span>
                              </button>
                              <button
                                onClick={() => handleSend(`สรุปสาระสำคัญของหนังสือ "${doc.title}" (${doc.docNumber || doc.receiveNumber})`)}
                                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                                title="สั่ง AI สรุปหนังสือเรื่องนี้"
                              >
                                📝 สรุป
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1.5 MATCHED URGENT INCIDENTS (Disaster / Incident Reports) */}
                  {msg.payload.matchedIncidents && msg.payload.matchedIncidents.length > 0 && (
                    <div className="space-y-2 mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent border border-red-500/30">
                      <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 pb-1.5 border-b border-red-500/20">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          แบบรายงานเหตุด่วนสาธารณภัยที่เกี่ยวข้อง ({msg.payload.matchedIncidents.length} เหตุการณ์):
                        </span>
                        {onNavigateToTab && (
                          <button
                            onClick={() => onNavigateToTab('urgent_incidents')}
                            className="text-[11px] hover:underline flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                          >
                            <span>เปิดโมดูลรายงานเหตุด่วน</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-1">
                        {msg.payload.matchedIncidents.map((inc: any, incIdx: number) => {
                          const types = Array.isArray(inc.incidentTypes) ? inc.incidentTypes : [inc.incidentTypes || 'สาธารณภัย'];
                          return (
                            <div
                              key={inc.id || incIdx}
                              className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:border-red-500/40 transition-all space-y-2.5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                    {inc.reportNumber || inc.id}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">
                                    {inc.status || 'กำลังเผชิญเหตุ'}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {inc.incidentDate || inc.reportDate || '-'} {inc.incidentTime ? `(${inc.incidentTime} น.)` : ''}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-[var(--text-secondary)]">
                                  📍 อ.{inc.district || '-'} ต.{inc.subdistrict || '-'} จ.{inc.province || 'ระยอง'}
                                </span>
                              </div>

                              {/* Disaster Types Badges */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {types.map((t: string, tIdx: number) => (
                                  <span
                                    key={tIdx}
                                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-red-600 text-white shadow-xs flex items-center gap-1"
                                  >
                                    <Flame className="w-3 h-3" />
                                    {t}
                                  </span>
                                ))}
                                {inc.village && (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                                    {inc.village}
                                  </span>
                                )}
                              </div>

                              {/* Incident Circumstances */}
                              {inc.circumstances && (
                                <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-overlay)] p-2 rounded-lg border border-[var(--border-light)] leading-relaxed">
                                  <span className="font-bold text-red-600 dark:text-red-400">พฤติการณ์เหตุการณ์: </span>
                                  {inc.circumstances}
                                </p>
                              )}

                              {/* Impact Stats Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                                  <span className="text-[10px] text-[var(--text-muted)] block">ผู้ประสบภัย</span>
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    {inc.affectedPeople || 0} คน / {inc.affectedHouseholds || 0} ครัวเรือน
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                  <span className="text-[10px] text-[var(--text-muted)] block">บาดเจ็บ</span>
                                  <span className="font-bold text-orange-600 dark:text-orange-400">
                                    {inc.injuredCount || 0} ราย
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                  <span className="text-[10px] text-[var(--text-muted)] block">เสียชีวิต/สูญหาย</span>
                                  <span className="font-bold text-rose-700 dark:text-rose-400">
                                    {inc.deceasedCount || 0} / {inc.missingCount || 0} ราย
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                  <span className="text-[10px] text-[var(--text-muted)] block">ประเมินความเสียหาย</span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                                    {inc.estimatedDamage ? `${Number(inc.estimatedDamage).toLocaleString()} บ.` : 'อยู่ระหว่างสำรวจ'}
                                  </span>
                                </div>
                              </div>

                              {/* Actions Taken */}
                              {inc.actionsTaken && (
                                <div className="text-[11px] text-[var(--text-secondary)] bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">การให้ความช่วยเหลือเบื้องต้น: </span>
                                  {inc.actionsTaken}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-light)]">
                                <button
                                  onClick={() => setSelectedIncidentModal(inc)}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>เปิดดูแบบรายงานเต็ม (A4)</span>
                                </button>
                                <button
                                  onClick={() => handleSend(`สรุปภาพรวมความเสียหายและข้อเสนอแนะในการช่วยเหลือของรายงานเหตุด่วน ${inc.reportNumber || inc.id}`)}
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-medium transition-colors cursor-pointer"
                                >
                                  📝 สรุปความเสียหาย
                                </button>
                                <button
                                  onClick={() => handleSend(`ยกร่างหนังสือรายงานเหตุด่วนสาธารณภัยถึงผู้ว่าราชการจังหวัดระยอง จากเหตุ ${types.join(', ')} ในพื้นที่ ต.${inc.subdistrict || ''} อ.${inc.district || ''} เลขที่ ${inc.reportNumber || inc.id}`)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
                                >
                                  ✍️ ยกร่างรายงาน ผวจ.
                                </button>
                                {onNavigateToTab && (
                                  <button
                                    onClick={() => onNavigateToTab('urgent_incidents')}
                                    className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] font-medium transition-colors cursor-pointer ml-auto"
                                  >
                                    🚀 โมดูลเหตุด่วน
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. DOCUMENT SUMMARY CARD (Summary Intent) */}
                  {msg.payload.intentType === 'summary' && msg.payload.summaryResult && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-500/30 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          สรุปสาระสำคัญงานสารบรรณ (Executive Summary)
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                          {msg.payload.summaryResult.docNumber || 'หนังสือรับ'}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="font-bold text-[var(--text-primary)]">📌 เรื่อง: </span>
                          <span className="text-[var(--text-secondary)] font-medium">{msg.payload.summaryResult.title}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border-light)]">
                          <div><span className="font-semibold text-[var(--text-primary)]">จาก:</span> {msg.payload.summaryResult.fromDept || '-'}</div>
                          <div><span className="font-semibold text-[var(--text-primary)]">ถึง:</span> {msg.payload.summaryResult.toDept || '-'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-1">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block">📝 สาระสำคัญ:</span>
                          <p className="text-[var(--text-primary)] leading-relaxed">{msg.payload.summaryResult.coreContent}</p>
                        </div>
                        {msg.payload.summaryResult.governingRule && (
                          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
                            <span className="font-bold block mb-0.5">⚖️ กฎหมาย/ระเบียบที่เกี่ยวข้อง:</span>
                            <p>{msg.payload.summaryResult.governingRule}</p>
                          </div>
                        )}
                        {msg.payload.summaryResult.recommendation && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                            <span className="font-bold block mb-0.5">🎯 ข้อเสนอแนะเพื่อพิจารณา:</span>
                            <p className="whitespace-pre-line leading-relaxed">{msg.payload.summaryResult.recommendation}</p>
                          </div>
                        )}
                        {msg.payload.summaryResult.nextAction && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                            <span className="font-bold">🚀 ขั้นตอนดำเนินการถัดไป: </span>
                            <span>{msg.payload.summaryResult.nextAction}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-500/20">
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
                          onClick={() => handleSend(`ยกร่างหนังสือตอบกลับเรื่อง ${msg.payload.summaryResult.title}`)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-indigo-500" />
                          <span>ยกร่างหนังสือตอบกลับ</span>
                        </button>
                        <button
                          onClick={() => handleCopyText(`สรุปสาระสำคัญ: ${msg.payload.summaryResult.title}\n${msg.payload.summaryResult.coreContent}\n\nข้อเสนอแนะ:\n${msg.payload.summaryResult.recommendation}`, msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกสรุป</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. DRAFT LETTER CARD (Draft Intent) */}
                  {msg.payload.intentType === 'draft' && msg.payload.draftLetter && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/30 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <FileEdit className="w-4 h-4" />
                          ร่างหนังสือราชการตามระเบียบสารบรรณ พ.ศ. 2526
                        </span>
                        
                        {/* Mode Switcher */}
                        <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border-light)] text-[10px]">
                          <button
                            onClick={() => setDraftViewMode(prev => ({ ...prev, [msg.id]: 'official' }))}
                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                              (draftViewMode[msg.id] || 'official') === 'official'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            🏛️ แบบฟอร์มทางการ
                          </button>
                          <button
                            onClick={() => setDraftViewMode(prev => ({ ...prev, [msg.id]: 'raw' }))}
                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                              draftViewMode[msg.id] === 'raw'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            📝 ข้อความดิบ
                          </button>
                        </div>
                      </div>

                      {/* Official Formatted Thai Letter View */}
                      {(draftViewMode[msg.id] || 'official') === 'official' ? (
                        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[var(--border-medium)] text-[var(--text-primary)] font-sans text-xs leading-relaxed space-y-3 shadow-inner">
                          {/* Official Garuda Emblem Placeholder */}
                          <div className="text-center">
                            <div className="inline-block px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs tracking-widest mb-1">
                              [ ตราครุฑ ]
                            </div>
                            <div className="font-bold text-sm text-[var(--text-primary)]">
                              {msg.payload.draftLetter.departmentName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] border-b pb-2">
                            <span>ที่ {msg.payload.draftLetter.docNumber || 'รย ๐๐๒๑/ว...'}</span>
                            <span>วันที่ {msg.payload.draftLetter.dateStr || '...'}</span>
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
                              <p className="whitespace-pre-line">{msg.payload.draftLetter.fullDraftText}</p>
                            )}
                          </div>

                          <div className="text-center pt-2 space-y-1">
                            <p>{msg.payload.draftLetter.closing || 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ'}</p>
                            <p className="font-bold pt-2">{msg.payload.draftLetter.signatory || '(นายณัฐพันธุ์ ศรีวนิช)'}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{msg.payload.draftLetter.signatoryPosition || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</p>
                          </div>

                          <div className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-lighter)]">
                            <p>ฝ่ายยุทธศาสตร์และการจัดการ</p>
                            <p>โทรศัพท์ ๐ ๓๘๖๙ ๔๑๕๔ | โทรสาร ๐ ๓๘๖๙ ๔๑๕๕</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-60 custom-scrollbar border border-slate-800">
                          {msg.payload.draftLetter.fullDraftText}
                        </div>
                      )}

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
                          <span>{savedDraftSuccess === msg.id ? 'บันทึกลงระบบร่างสำเร็จ!' : 'บันทึกลงระบบร่าง (Draft)'}</span>
                        </button>

                        <button
                          onClick={() => handlePrintDraft(msg.payload.draftLetter.fullDraftText, msg.payload.draftLetter.subject)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-500" />
                          <span>พิมพ์ / พรีวิว PDF</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. PENDING TASKS SUMMARY (Pending Intent) */}
                  {msg.payload.intentType === 'pending_tasks' && msg.payload.pendingTasksSummary && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/30 space-y-3 shadow-sm">
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
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 block">ค้างทั้งหมด</span>
                          <span className="text-base font-bold text-amber-700 dark:text-amber-300">{msg.payload.pendingTasksSummary.totalPendingCount}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <span className="text-[10px] text-red-600 dark:text-red-400 block">เรื่องด่วน/ด่วนที่สุด</span>
                          <span className="text-base font-bold text-red-600 dark:text-red-400">{msg.payload.pendingTasksSummary.urgentCount}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 block">เกินกำหนด SLA</span>
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
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      (ค้าง {item.daysPending || 1} วัน)
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

                  {/* 5. REWRITE / TONE POLISH (Rewrite Intent) */}
                  {msg.payload.intentType === 'rewrite' && msg.payload.rewriteResult && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent border border-indigo-500/30 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Wand2 className="w-4 h-4" />
                          ผลการขัดเกลาสำนวนภาษาราชการ (Tone & Polish)
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                          {msg.payload.rewriteResult.toneStyle || 'ภาษาราชการ'}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {/* Original vs Polished */}
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 space-y-1">
                          <span className="font-bold text-red-600 dark:text-red-400 block text-[11px]">❌ ข้อความเดิม (ภาษาพูด/ไม่เป็นทางการ):</span>
                          <p className="text-[var(--text-secondary)] italic">"{msg.payload.rewriteResult.originalText}"</p>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px]">✅ สำนวนภาษาราชการที่ปรับปรุงแล้ว:</span>
                          <p className="text-[var(--text-primary)] font-semibold leading-relaxed">"{msg.payload.rewriteResult.polishedText}"</p>
                        </div>

                        {/* Improved points */}
                        {msg.payload.rewriteResult.improvedPoints && (
                          <div className="space-y-1 pt-1">
                            <span className="font-bold text-[var(--text-secondary)] text-[11px] block">จุดที่มีการปรับปรุงให้ถูกต้อง:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                              {msg.payload.rewriteResult.improvedPoints.map((pt: string, idx: number) => (
                                <li key={idx}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-indigo-500/20">
                        <button
                          onClick={() => handleCopyText(msg.payload.rewriteResult.polishedText, msg.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกสำนวนภาษาราชการ</span>
                        </button>
                        <button
                          onClick={() => handleSend(`ยกร่างหนังสือราชการโดยใช้เนื้อหา: ${msg.payload.rewriteResult.polishedText}`)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-indigo-500" />
                          <span>นำไปยกร่างหนังสือ</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. REGULATION Q&A (Regulation Intent) */}
                  {msg.payload.intentType === 'regulation_qa' && msg.payload.regulationResult && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/5 via-red-500/5 to-transparent border border-rose-500/30 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                          <Scale className="w-4 h-4" />
                          ระเบียบงานสารบรรณ & ข้อกฎหมาย
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                          พ.ศ. ๒๕๒๖
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="font-bold text-[var(--text-primary)]">📖 หัวข้อ: </span>
                          <span className="text-[var(--text-secondary)]">{msg.payload.regulationResult.topic}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-1">
                          <span className="font-bold text-rose-600 dark:text-rose-400 block text-[11px]">{msg.payload.regulationResult.ruleArticle}</span>
                          <p className="text-[var(--text-primary)] whitespace-pre-line leading-relaxed">{msg.payload.regulationResult.explanation}</p>
                        </div>
                        {msg.payload.regulationResult.practicalGuide && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                            <span className="font-bold block mb-0.5">💡 แนวทางการปฏิบัติในระบบ:</span>
                            <p>{msg.payload.regulationResult.practicalGuide}</p>
                          </div>
                        )}
                        {msg.payload.regulationResult.caution && (
                          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300">
                            <span className="font-bold block mb-0.5">⚠️ ข้อควรระวัง:</span>
                            <p>{msg.payload.regulationResult.caution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Suggested Follow-Up Prompts */}
                  {msg.payload.suggestedFollowUps && msg.payload.suggestedFollowUps.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-lighter)] space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        คำถามแนะนำถัดไป:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.payload.suggestedFollowUps.map((suggest: string, sIdx: number) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSend(suggest)}
                            className="text-left text-xs px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] hover:bg-indigo-500/10 border border-[var(--border-light)] hover:border-indigo-500/40 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                          >
                            + {suggest}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-overlay)] border border-indigo-500/30 max-w-sm shadow-md animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Smart AI กำลังประมวลผลคำตอบ...</p>
              <p className="text-[10px] text-[var(--text-muted)]">สแกนระเบียบสารบรรณ 2526 และฐานข้อมูลหนังสือราชการ</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box & Action Console */}
      <div className="pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-medium)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-md overflow-hidden"
        >
          {attachedDoc ? (
            <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                กำลังสอบถามเกี่ยวกับหนังสือ: {attachedDoc.docNumber || attachedDoc.receiveNumber} - {attachedDoc.title}
              </span>
              <button
                type="button"
                onClick={() => setAttachedDoc(null)}
                className="text-red-500 hover:text-red-700 ml-2 cursor-pointer"
                title="ยกเลิกการแนบ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : attachedIncident ? (
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-xs">
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold truncate">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                กำลังสอบถามเกี่ยวกับเหตุด่วน: {attachedIncident.reportNumber || attachedIncident.id} - {Array.isArray(attachedIncident.incidentTypes) ? attachedIncident.incidentTypes.join(', ') : attachedIncident.incidentTypes} (อ.{attachedIncident.district || 'เมืองระยอง'})
              </span>
              <button
                type="button"
                onClick={() => setAttachedIncident(null)}
                className="text-red-500 hover:text-red-700 ml-2 cursor-pointer"
                title="ยกเลิกการแนบ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-2 p-1.5 px-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="พิมพ์คำสั่ง เช่น 'ค้นหาหนังสือเรื่องงบประมาณ', 'สรุปหนังสือรับ 123/2569', 'ร่างหนังสือตอบกลับ', 'งานค้างฝ่ายยุทธศาสตร์'..."
              disabled={isLoading}
              className="flex-1 bg-transparent py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none disabled:opacity-50 max-h-24 custom-scrollbar"
            />

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleVoiceListening}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-md'
                  : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-indigo-600'
              }`}
              title={isListening ? 'กำลังฟัง... คลิกเพื่อหยุด' : 'พิมพ์ด้วยเสียง (Speech to Text)'}
            >
              {isListening ? <Mic className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Attach Doc Trigger Button */}
            <button
              type="button"
              onClick={() => setIsDocSelectorOpen(!isDocSelectorOpen)}
              className="p-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-indigo-600 transition-all cursor-pointer"
              title="แนบเอกสารเพื่อวิเคราะห์"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
            >
              <span>ส่งคำสั่ง</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1 mt-2">
          <span>💡 เคล็ดลับ: กด <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-light)] font-mono text-[10px]">Enter</kbd> เพื่อส่งคำสั่ง, <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-light)] font-mono text-[10px]">Shift + Enter</kbd> เพื่อขึ้นบรรทัดใหม่</span>
          <span className="hidden sm:inline">รองรับระเบียบสำนักนายกฯ ๒๕๒๖ และแบบรายงานเหตุด่วน ปภ.</span>
        </div>
      </div>

      {/* A4 Incident Preview Modal */}
      {selectedIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[var(--border-medium)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-overlay)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    แบบรายงานเหตุด่วนสาธารณภัย (A4 Official Preview)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    เลขที่รายงาน: {selectedIncidentModal.reportNumber || selectedIncidentModal.id} | จังหวัดระยอง
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายงาน</span>
                </button>
                <button
                  onClick={() => setSelectedIncidentModal(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: A4 Paper Format */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 custom-scrollbar">
              <A4PaperPreview
                title={`รายงานเหตุด่วนสาธารณภัย: ${selectedIncidentModal.reportNumber || selectedIncidentModal.id}`}
                subtitle="แบบรายงานเหตุด่วนสาธารณภัย กรมป้องกันและบรรเทาสาธารณภัย กระทรวงมหาดไทย"
                exportFileName={`รายงานเหตุด่วนสาธารณภัย_${selectedIncidentModal.reportNumber || selectedIncidentModal.id}`}
                onPrint={() => window.print()}
              >
                {/* Garuda Crest */}
                <div className="text-center space-y-1 pb-4 border-b border-slate-200">
                  <div className="inline-block px-4 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs tracking-widest uppercase mb-1">
                    [ ตราครุฑราชการ ]
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 font-serif">
                    แบบรายงานเหตุด่วนสาธารณภัย
                  </h2>
                  <p className="text-xs text-slate-600">
                    สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
                  </p>
                </div>

                {/* Header Information */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="font-bold">เลขที่รายงาน: </span>
                    <span className="font-mono">{selectedIncidentModal.reportNumber || selectedIncidentModal.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">วันที่รายงาน: </span>
                    <span>{selectedIncidentModal.reportDate || selectedIncidentModal.incidentDate || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold">เรียน: </span>
                    <span>ผู้ว่าราชการจังหวัดระยอง / อธิบดีกรมป้องกันและบรรเทาสาธารณภัย</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">สถานะเหตุการณ์: </span>
                    <span className="font-bold text-red-600">{selectedIncidentModal.status || 'กำลังเผชิญเหตุ'}</span>
                  </div>
                </div>

                {/* Section 1: Incident Summary */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-sm">
                    ๑. ข้อมูลเหตุการณ์และสถานที่เกิดเหตุ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pl-2">
                    <div>
                      <span className="font-semibold text-slate-700">ประเภทสาธารณภัย: </span>
                      <span className="font-bold text-red-600">
                        {Array.isArray(selectedIncidentModal.incidentTypes) ? selectedIncidentModal.incidentTypes.join(', ') : selectedIncidentModal.incidentTypes || 'สาธารณภัย'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">วันเวลาเกิดเหตุ: </span>
                      <span>{selectedIncidentModal.incidentDate || '-'} เวลา {selectedIncidentModal.incidentTime || '-'} น.</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700">สถานที่เกิดเหตุ: </span>
                      <span>{selectedIncidentModal.village || ''} ตำบล{selectedIncidentModal.subdistrict || '-'} อำเภอ{selectedIncidentModal.district || '-'} จังหวัด{selectedIncidentModal.province || 'ระยอง'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Circumstances */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-sm">
                    ๒. พฤติการณ์และสภาพความเสียหาย
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed pl-2 whitespace-pre-line">
                    {selectedIncidentModal.circumstances || 'อยู่ระหว่างการรวบรวมรายละเอียดพฤติการณ์เหตุการณ์'}
                  </p>
                </div>

                {/* Section 3: Casualties and Impact Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-sm">
                    ๓. ข้อมูลผู้ประสบภัยและความเสียหายเบื้องต้น
                  </h4>
                  <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2">ผู้ประสบภัย (คน)</th>
                        <th className="border border-slate-300 p-2">ครัวเรือน</th>
                        <th className="border border-slate-300 p-2">บาดเจ็บ (ราย)</th>
                        <th className="border border-slate-300 p-2">เสียชีวิต (ราย)</th>
                        <th className="border border-slate-300 p-2">สูญหาย (ราย)</th>
                        <th className="border border-slate-300 p-2">มูลค่าความเสียหาย (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2">{selectedIncidentModal.affectedPeople || 0}</td>
                        <td className="border border-slate-300 p-2">{selectedIncidentModal.affectedHouseholds || 0}</td>
                        <td className="border border-slate-300 p-2 text-orange-600 font-bold">{selectedIncidentModal.injuredCount || 0}</td>
                        <td className="border border-slate-300 p-2 text-red-600 font-bold">{selectedIncidentModal.deceasedCount || 0}</td>
                        <td className="border border-slate-300 p-2">{selectedIncidentModal.missingCount || 0}</td>
                        <td className="border border-slate-300 p-2 font-bold">{selectedIncidentModal.estimatedDamage ? Number(selectedIncidentModal.estimatedDamage).toLocaleString() : 'อยู่ระหว่างสำรวจ'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 4: Actions Taken */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 text-sm">
                    ๔. การให้ความช่วยเหลือและการดำเนินการของหน่วยงาน
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed pl-2 whitespace-pre-line">
                    {selectedIncidentModal.actionsTaken || 'สำนักงาน ปภ. จังหวัดระยอง และองค์กรปกครองส่วนท้องถิ่นในพื้นที่ได้ระดมกำลังเจ้าหน้าที่และเครื่องจักรกลสาธารณภัยเข้าช่วยเหลือทันที'}
                  </p>
                </div>

                {/* Signature Block */}
                <div className="pt-8 text-right pr-8 space-y-1 text-xs">
                  <p>รายงานโดย: สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง</p>
                  <p>สายด่วนสาธารณภัย ๑๗๘๔ / โทร ๐-๓๘๖๙-๔๑๐๙</p>
                </div>
              </A4PaperPreview>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-light)] bg-[var(--bg-overlay)] text-xs">
              <span className="text-[var(--text-muted)]">
                ข้อมูลเชื่อมโยงตรงกับฐานข้อมูลศูนย์บัญชาการเหตุการณ์จังหวัดระยอง (EOC)
              </span>
              <button
                onClick={() => setSelectedIncidentModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] border border-[var(--border-medium)] text-[var(--text-primary)] font-medium cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
