import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Award, BookOpen, Send, Bold, Italic, 
  Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Plus, Eye, Save, Printer, FileDown, Trash2, History, Crown, X,
  Sparkles, AlertCircle, CheckCircle2, Copy, ZoomIn, ZoomOut, 
  Search, PenTool, LayoutGrid, Split, Maximize2, FileCheck,
  Building, Phone, ArrowUpRight, HelpCircle, Wand2, RefreshCw, Check
} from 'lucide-react';
import { 
  LETTER_TYPES, 
  buildOfficialDoc, 
  downloadAsDoc, 
  thDate, 
  thDateFull,
  toThaiNumeral,
  toArabicNumeral,
  convertHtmlDigitsToThai,
  convertHtmlDigitsToArabic,
  countArabicDigitsInHtml,
  convertDomElementToThaiNumerals,
  convertDomElementToArabicNumerals,
  DraftItem,
  OFFICIAL_STANDARD_PHRASES,
  PRESET_OFFICIAL_TEMPLATES,
  PresetOfficialTemplate
} from './draftData';
import { parseDocNumberStructure } from '../../../lib/fileCodeUtils';
import { useRealtimeSync } from '../../../utils/realtimeSync';
import { useConfirm } from '../../../context/ConfirmContext';

interface Props {
  user: any;
  onSendToSignQueue?: (item: any) => void;
  prefillData?: any;
}

export default function DraftLettersView({ user, onSendToSignQueue, prefillData }: Props) {
  const { confirm } = useConfirm();
  
  // Navigation & View Mode State
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'templates'>('editor');
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Draft Management State
  const [editingDraftDbId, setEditingDraftDbId] = useState<number | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('external');
  const [selectedTitle, setSelectedTypeTitle] = useState<string>('หนังสือส่ง (หนังสือภายนอก)');

  // Form Fields
  const [docNum, setDocNum] = useState<string>('รย ๐๐๒๑.๑/');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [docType, setDocType] = useState<string>('หนังสือส่ง');
  const [urgency, setUrgency] = useState<string>('ปกติ');
  const [secrecy, setSecrecy] = useState<string>('ไม่ลับ');
  const [subject, setSubject] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [refText, setRefText] = useState<string>('');
  const [attText, setAttText] = useState<string>('');
  const [signer, setSigner] = useState<string>('นายสมชาย มุ่งมั่นพัฒนา');
  const [signerPos, setSignerPos] = useState<string>('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  
  // Contact & Org Fields
  const [orgName, setOrgName] = useState<string>(user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [deptContact, setDeptContact] = useState<string>('ฝ่ายยุทธศาสตร์และการจัดการ');
  const [phone, setPhone] = useState<string>('๐ ๓๘๖๙ ๔๑๐๙');
  const [fax, setFax] = useState<string>('๐ ๓๘๖๙ ๔๑๑๐');
  const [email, setEmail] = useState<string>('rayong_dpm@moi.go.th');

  // Thai Numerals State
  const [autoThaiDocNum, setAutoThaiDocNum] = useState<boolean>(true);

  // Editor Reference & Live HTML Sync
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState<string>('');

  // Dropdown Panels
  const [showGarudaPanel, setShowGarudaPanel] = useState<boolean>(false);
  const [garudaSize, setGarudaSize] = useState<string>('113');
  const [garudaAlign, setGarudaAlign] = useState<'center' | 'left' | 'right'>('center');
  const [showPhrasesDropdown, setShowPhrasesDropdown] = useState<boolean>(false);
  const [phraseCategory, setPhraseCategory] = useState<'openings' | 'transitions' | 'closings'>('openings');

  // AI Generation Modal State
  const [showAiDraftModal, setShowAiDraftModal] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('');
  const [aiObjective, setAiObjective] = useState<string>('');
  const [aiDetails, setAiDetails] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
  const [activeAuditTab, setActiveAuditTab] = useState<'all' | 'spelling' | 'format' | 'royal' | 'completeness'>('all');

  // AI Saraban Auto-Format State
  const [isAutoFormatting, setIsAutoFormatting] = useState<boolean>(false);
  const [showAutoFormatModal, setShowAutoFormatModal] = useState<boolean>(false);
  const [autoFormatResult, setAutoFormatResult] = useState<any>(null);
  const [originalContentBeforeFormat, setOriginalContentBeforeFormat] = useState<string>('');
  const [formatModalTab, setFormatModalTab] = useState<'compare' | 'preview'>('compare');
  const [formatOptions, setFormatOptions] = useState<{
    applyBody: boolean;
    applyDocNum: boolean;
    applySubject: boolean;
    applyTo: boolean;
  }>({
    applyBody: true,
    applyDocNum: true,
    applySubject: false,
    applyTo: false
  });

  // History State
  const [draftsHistory, setDraftsHistory] = useState<DraftItem[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilterType, setHistoryFilterType] = useState<string>('all');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync editor content
  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  // Fetch Drafts
  const loadDrafts = () => {
    fetch('/api/drafts')
      .then(res => res.json())
      .then(data => {
        const drafts = data
          .filter((d: any) => d.docType === 'draft_letter')
          .map((d: any) => {
            let extra: any = {};
            try {
              extra = typeof d.extraData === 'string' ? JSON.parse(d.extraData) : (d.extraData || {});
            } catch (e) {}
            return {
              ...extra,
              id: extra.id || d.id,
              dbId: d.id,
              subject: d.title || d.subject || extra.subject,
              docNum: d.docNumber || extra.docNum,
              date: d.date || extra.date,
              docType: extra.docType || 'หนังสือส่ง',
              urgency: d.urgency || extra.urgency || 'ปกติ',
              secrecy: d.secrecy || extra.secrecy || 'ไม่ลับ',
              to: d.toDept || extra.to || '',
              body: d.content || extra.body || '',
              signer: d.signatory || extra.signer || '',
              signerPos: d.signatoryPosition || extra.signerPos || '',
              createdAt: d.createdAt || extra.createdAt || new Date().toISOString()
            };
          });
        setDraftsHistory(drafts);
      })
      .catch(e => {
        console.error('Error fetching drafts:', e);
        const saved = localStorage.getItem('moi_drafts');
        if (saved) {
          try {
            setDraftsHistory(JSON.parse(saved));
          } catch (err) {}
        }
      });
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  useRealtimeSync(['DRAFTS_UPDATED', 'DOCUMENTS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    loadDrafts();
  });

  // Handle prefill if passed from AI Scan
  useEffect(() => {
    if (prefillData) {
      setActiveTab('editor');
      if (prefillData.docNum) setDocNum(prefillData.docNum);
      if (prefillData.date) setDate(prefillData.date);
      if (prefillData.subject) setSubject(prefillData.subject);
      if (prefillData.to) setTo(prefillData.to);
      if (prefillData.ref) setRefText(prefillData.ref);
      if (prefillData.att) setAttText(prefillData.att);
      if (prefillData.urgency) setUrgency(prefillData.urgency);
      if (prefillData.secrecy) setSecrecy(prefillData.secrecy);
      if (prefillData.signer) setSigner(prefillData.signer);
      if (prefillData.signerPos) setSignerPos(prefillData.signerPos);
      if (prefillData.body) {
        setEditorContent(prefillData.body);
        if (editorRef.current) {
          editorRef.current.innerHTML = prefillData.body;
        }
      }
      showToast('นำเข้าข้อมูลจาก AI Scan เรียบร้อยแล้ว');
    }
  }, [prefillData]);

  // Initial Content Set
  useEffect(() => {
    if (!editorContent && editorRef.current && !editorRef.current.innerHTML) {
      const initialHtml = `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ${orgName} มีความประสงค์จะจัดโครงการเพิ่มประสิทธิภาพการป้องกันและบรรเทาสาธารณภัย เพื่อประโยชน์และความปลอดภัยของประชาชนในพื้นที่</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ จึงใคร่ขอความอนุเคราะห์จากท่าน โปรดพิจารณาให้ความอนุเคราะห์ในการประสานงานและสนับสนุนการดำเนินงานดังกล่าว</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`;
      editorRef.current.innerHTML = initialHtml;
      setEditorContent(initialHtml);
    }
  }, [orgName]);

  // Handle Template Selection
  const handleSelectType = (tpl: string, title: string) => {
    setSelectedType(tpl);
    setSelectedTypeTitle(title);
    setActiveTab('editor');

    const typeMap: Record<string, string> = {
      external: 'หนังสือส่ง',
      internal: 'หนังสือภายใน',
      stamp: 'หนังสือประทับตรา',
      cert: 'หนังสือรับรอง',
      reply: 'หนังสือส่ง',
      memo: 'บันทึกข้อความ',
      regulation: 'ระเบียบ',
      bylaw: 'ข้อบังคับ',
      statement: 'แถลงการณ์',
      news: 'ข่าว',
      circular: 'หนังสือเวียน (ว.)'
    };
    if (typeMap[tpl]) setDocType(typeMap[tpl]);

    const org = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
    const templates: Record<string, string> = {
      external: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ${org} มีภารกิจในการประสานการปฏิบัติราชการด้านการป้องกันและบรรเทาสาธารณภัย</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ ใคร่ขอความอนุเคราะห์จากท่าน โปรดพิจารณาประสานการปฏิบัติในส่วนที่เกี่ยวข้องต่อไป</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`,
      internal: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ข้าพเจ้ามีความประสงค์ขออนุมัติดำเนินการตามแผนปฏิบัติการป้องกันและบรรเทาสาธารณภัย</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>`,
      memo: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๑. เรื่องเดิม</b> ด้วย ฝ่ายยุทธศาสตร์และการจัดการ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้รับมอบหมายภารกิจในการ</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๒. ข้อเท็จจริง</b> ในการนี้ เพื่อให้การปฏิบัติราชการเป็นไปด้วยความเรียบร้อย จึงมีความจำเป็นต้อง</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๓. ข้อพิจารณาและข้อเสนอ</b> จึงเรียนมาเพื่อโปรดพิจารณา</p>`,
      cert: `<p style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 1.5em;">หนังสือรับรองฉบับนี้ให้ไว้เพื่อรับรองว่า</p><p style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 1em;">นาย/นาง/นางสาว ......................................................</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">เป็นบุคลากรในสังกัด ${org} ปฏิบัติหน้าที่ด้วยความวิริยะอุตสาหะและเรียบร้อยดีทุกประการ</p><p style="text-indent: 2.5em; margin-bottom: 1.5em;">ให้ไว้ ณ วันที่ ${thDateFull(date)}</p>`,
      reply: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ตามหนังสือที่อ้างถึง ${org} ได้รับทราบข้อเท็จจริงเกี่ยวกับการขอความอนุเคราะห์แล้ว นั้น</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ ขอเรียนชี้แจงว่าได้มอบหมายเจ้าหน้าที่ผู้รับผิดชอบประสานงานโดยตรงเป็นที่เรียบร้อยแล้ว</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดทราบ</p>`,
      circular: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย กองอำนวยการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ติดตามสภาวะอากาศและสถานการณ์สาธารณภัยอย่างใกล้ชิด</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ จึงขอให้อำเภอและองค์กรปกครองส่วนท้องถิ่นทุกแห่ง ดำเนินการเตรียมความพร้อมและเฝ้าระวังตลอด ๒๔ ชั่วโมง</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการโดยด่วน</p>`
    };

    const newHtml = templates[tpl] || `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">[กรอกเนื้อหาหนังสือราชการ...]</p>`;
    setEditorContent(newHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = newHtml;
    }
    showToast(`เปลี่ยนประเภทเป็น "${title}" เรียบร้อยแล้ว`);
  };

  // Load preset template from library
  const handleLoadPresetTemplate = (preset: PresetOfficialTemplate) => {
    setActiveTab('editor');
    setSubject(preset.subject);
    setTo(preset.to);
    setDocType(preset.docType);
    setUrgency(preset.urgency);
    setSecrecy(preset.secrecy);
    if (preset.ref) setRefText(preset.ref);
    if (preset.att) setAttText(preset.att);
    if (preset.signer) setSigner(preset.signer);
    if (preset.signerPos) setSignerPos(preset.signerPos);

    setEditorContent(preset.body);
    if (editorRef.current) {
      editorRef.current.innerHTML = preset.body;
    }
    showToast(`โหลดเทมเพลต "${preset.name}" เรียบร้อยแล้ว`);
  };

  // Rich Text Commands
  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  // Insert standard phrase
  const handleInsertPhrase = (phraseText: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    execCommand('insertHTML', `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">${phraseText}</p>`);
    setShowPhrasesDropdown(false);
    showToast('แทรกข้อความมาตรฐานแล้ว');
  };

  // Insert Garuda Seal
  const insertGaruda = () => {
    const src = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
    const alignStyle = garudaAlign === 'left' ? 'text-align:left;' : garudaAlign === 'right' ? 'text-align:right;' : 'text-align:center;';
    const html = `<div style="${alignStyle}margin:12px 0;"><img src="${src}" width="${garudaSize}" height="${garudaSize}" style="width:${garudaSize}px;height:${garudaSize}px;object-fit:contain;display:inline-block;" alt="ตราครุฑ" /></div>`;
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, html);
      setEditorContent(editorRef.current.innerHTML);
    }
    setShowGarudaPanel(false);
    showToast('แทรกตราครุฑแล้ว');
  };

  // Dynamic Arabic Digits Counter in Current Document
  const currentBodyHtml = editorRef.current ? editorRef.current.innerHTML : editorContent;
  const arabicDigitsFound = (
    (docNum.match(/[0-9]/g) || []).length +
    (subject.match(/[0-9]/g) || []).length +
    (refText.match(/[0-9]/g) || []).length +
    (attText.match(/[0-9]/g) || []).length +
    (phone.match(/[0-9]/g) || []).length +
    countArabicDigitsInHtml(currentBodyHtml)
  );

  // Convert Numerals (Document Number, Header Fields, & Content)
  const handleConvertDigits = (toThai: boolean) => {
    if (toThai) {
      // 1. Convert Document Number (เลขที่หนังสือ)
      const prevDocNum = docNum;
      const convertedDocNum = toThaiNumeral(prevDocNum);
      setDocNum(convertedDocNum);

      // 2. Convert metadata fields (เรื่อง, อ้างถึง, สิ่งที่ส่งมาด้วย, โทรศัพท์, ฝ่าย)
      setSubject(prev => toThaiNumeral(prev));
      setRefText(prev => toThaiNumeral(prev));
      setAttText(prev => toThaiNumeral(prev));
      setPhone(prev => toThaiNumeral(prev));
      setFax(prev => toThaiNumeral(prev));
      setDeptContact(prev => toThaiNumeral(prev));

      // 3. Convert editor body content (using DOM text nodes for 100% style/tag preservation)
      let convertedBodyCount = 0;
      if (editorRef.current) {
        convertedBodyCount = convertDomElementToThaiNumerals(editorRef.current);
        const updatedHtml = editorRef.current.innerHTML;
        setEditorContent(updatedHtml);
      } else {
        const updatedHtml = convertHtmlDigitsToThai(editorContent);
        setEditorContent(updatedHtml);
      }

      // Count conversions across fields
      const docNumMatches = (prevDocNum.match(/[0-9]/g) || []).length;
      const totalConverted = convertedBodyCount + docNumMatches;

      if (totalConverted > 0) {
        showToast(`🇹🇭 แปลงตัวเลขในเลขที่หนังสือและเนื้อหาเป็นเลขไทย (๐-๙) เรียบร้อย (${toThaiNumeral(totalConverted)} จุด)`);
      } else {
        showToast('🇹🇭 ตรวจสอบและแปลงตัวเลขทั้งหมดในเอกสารเป็นเลขไทย (๐-๙) ครบถ้วนแล้ว');
      }
    } else {
      setDocNum(prev => toArabicNumeral(prev));
      setSubject(prev => toArabicNumeral(prev));
      setRefText(prev => toArabicNumeral(prev));
      setAttText(prev => toArabicNumeral(prev));
      setPhone(prev => toArabicNumeral(prev));
      setFax(prev => toArabicNumeral(prev));
      setDeptContact(prev => toArabicNumeral(prev));

      if (editorRef.current) {
        convertDomElementToArabicNumerals(editorRef.current);
        const updatedHtml = editorRef.current.innerHTML;
        setEditorContent(updatedHtml);
      } else {
        const updatedHtml = convertHtmlDigitsToArabic(editorContent);
        setEditorContent(updatedHtml);
      }
      showToast('แปลงตัวเลขทั้งหมดเป็นเลขอารบิก (0-9) เรียบร้อยแล้ว');
    }
  };

  // AI Smart Draft Generation
  const handleGenerateAiDraft = async () => {
    if (!aiTopic.trim()) {
      alert('กรุณาระบุวัตถุประสงค์หรือหัวข้อเรื่องที่ต้องการให้ AI ร่าง');
      return;
    }

    setIsGeneratingAi(true);
    setAiDraftResult(null);

    try {
      const res = await fetch('/api/ai/draft-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          docType,
          to: to || 'ผู้ว่าราชการจังหวัดระยอง',
          objective: aiObjective,
          details: aiDetails,
          tone: urgency,
          orgName
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAiDraftResult(data.result);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างแบบร่างด้วย AI');
      }
    } catch (err: any) {
      console.error('Error generating AI draft:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ร่างหนังสือได้');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply AI Draft Result into Editor
  const handleApplyAiDraft = () => {
    if (!aiDraftResult) return;

    if (aiDraftResult.subject) setSubject(aiDraftResult.subject);
    if (aiDraftResult.to) setTo(aiDraftResult.to);
    if (aiDraftResult.urgency) setUrgency(aiDraftResult.urgency);
    if (aiDraftResult.suggestedSignerPos) setSignerPos(aiDraftResult.suggestedSignerPos);

    if (aiDraftResult.bodyHtml) {
      setEditorContent(aiDraftResult.bodyHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = aiDraftResult.bodyHtml;
      }
    }

    setShowAiDraftModal(false);
    setAiDraftResult(null);
    setAiTopic('');
    setAiObjective('');
    setAiDetails('');
    showToast('นำเนื้อหาที่ AI ร่างใส่ลงในแบบร่างเรียบร้อยแล้ว');
  };

  // AI Audit Document
  const handleAuditDocument = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setShowAuditPanel(true);

    const payload = {
      docType,
      docNum,
      date,
      to,
      subject,
      ref: refText,
      att: attText,
      body: editorRef.current?.innerHTML || editorContent,
      signer,
      signerPos,
      orgName
    };

    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAuditResult(data.result);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบด้วย AI');
        setShowAuditPanel(false);
      }
    } catch (err: any) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ตรวจสอบได้');
      setShowAuditPanel(false);
    } finally {
      setIsAuditing(false);
    }
  };

  // AI Auto-Format according to Thai Saraban Regulations
  const handleAutoFormatSaraban = async (directApply = false) => {
    const currentBody = editorRef.current?.innerHTML || editorContent;
    if (!currentBody.trim() || currentBody === '<p><br></p>') {
      alert('กรุณากรอกหรือพิมพ์เนื้อความของหนังสือราชการก่อนใช้งาน AI จัดหน้าตามระเบียบสารบรรณ');
      return;
    }

    setIsAutoFormatting(true);
    try {
      const payload = {
        body: currentBody,
        docType,
        docNum,
        date,
        to,
        subject,
        ref: refText,
        att: attText,
        signer,
        signerPos,
        orgName,
        options: {
          convertToThaiNumerals: true,
          enforceThreeParagraphs: true,
          standardizeSpacing: true
        }
      };

      const res = await fetch('/api/ai/auto-format-saraban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.result) {
        const result = data.result;

        if (directApply) {
          const finalHtml = result.formattedHtml;
          if (editorRef.current && finalHtml) {
            editorRef.current.innerHTML = finalHtml;
          }
          if (finalHtml) {
            setEditorContent(finalHtml);
          }
          if (result.docNumFormatted) {
            setDocNum(toThaiNumeral(result.docNumFormatted));
          } else {
            setDocNum(prev => toThaiNumeral(prev));
          }
          showToast('✨ AI จัดหน้าและแปลงตัวเลขเป็นเลขไทยตามระเบียบสารบรรณเรียบร้อยแล้ว');
        } else {
          setOriginalContentBeforeFormat(currentBody);
          setAutoFormatResult(result);
          setShowAutoFormatModal(true);
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการจัดหน้าด้วย AI');
      }
    } catch (err: any) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI จัดหน้าระเบียบสารบรรณได้');
    } finally {
      setIsAutoFormatting(false);
    }
  };

  // Apply Auto-Format Changes from Modal
  const applyAutoFormatChanges = () => {
    if (!autoFormatResult) return;

    if (formatOptions.applyBody && autoFormatResult.formattedHtml) {
      if (editorRef.current) {
        editorRef.current.innerHTML = autoFormatResult.formattedHtml;
      }
      setEditorContent(autoFormatResult.formattedHtml);
    }

    if (formatOptions.applyDocNum) {
      setDocNum(toThaiNumeral(autoFormatResult.docNumFormatted || docNum));
    }

    if (formatOptions.applySubject && autoFormatResult.subjectFormatted) {
      setSubject(toThaiNumeral(autoFormatResult.subjectFormatted));
    }

    if (formatOptions.applyTo && autoFormatResult.toFormatted) {
      setTo(autoFormatResult.toFormatted);
    }

    setShowAutoFormatModal(false);
    showToast('✨ นำการจัดหน้าตามระเบียบสารบรรณไปใช้ในเอกสารเรียบร้อยแล้ว');
  };

  // Generate Current Document HTML
  const getCurrentDocHtml = () => {
    return buildOfficialDoc({
      docType,
      docNum,
      date,
      to,
      subject,
      ref: refText,
      att: attText,
      body: editorContent || editorRef.current?.innerHTML || '',
      signer,
      signerPos,
      urgency,
      secrecy,
      orgName,
      deptContact,
      phone,
      fax,
      email
    });
  };

  // Save or Update Draft
  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      alert('กรุณากรอกเรื่องของหนังสือราชการก่อนบันทึก');
      return;
    }

    const isUpdate = editingDraftDbId !== null;
    const confirmed = await confirm({
      title: isUpdate ? 'ยืนยันการอัปเดตร่างหนังสือราชการ' : 'ยืนยันการบันทึกร่างหนังสือราชการ',
      message: `คุณต้องการ${isUpdate ? 'อัปเดต' : 'บันทึก'}ร่างหนังสือเรื่อง "${subject}" ใช่หรือไม่?`,
      type: 'edit',
      confirmText: isUpdate ? 'ยืนยันการอัปเดต' : 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const currentBody = editorRef.current?.innerHTML || editorContent;
    const draftId = editingDraftId || Date.now();

    const newItem: DraftItem = {
      id: draftId,
      type: selectedType,
      docType,
      docNum,
      date,
      to,
      subject,
      urgency,
      secrecy,
      body: currentBody,
      signer,
      signerPos,
      ref: refText,
      att: attText,
      createdAt: new Date().toISOString()
    };

    const payload = {
      docType: 'draft_letter',
      title: subject,
      docNumber: docNum,
      date,
      urgency,
      secrecy,
      fromDept: deptContact,
      toDept: to,
      subject,
      content: currentBody,
      signatory: signer,
      signatoryPosition: signerPos,
      status: 'draft',
      createdBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน',
      extraData: newItem
    };

    try {
      if (isUpdate) {
        await fetch(`/api/drafts/${editingDraftDbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('อัปเดตร่างหนังสือเรียบร้อยแล้ว');
      } else {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.id) {
          setEditingDraftDbId(data.id);
          setEditingDraftId(draftId);
        }
        showToast('บันทึกร่างหนังสือใหม่เรียบร้อยแล้ว');
      }

      loadDrafts();

      if (onSendToSignQueue) {
        onSendToSignQueue({
          id: draftId,
          date,
          type: docType,
          subject,
          proposer: signer || user?.firstName || 'ธุรการ',
          status: 'รอลงนาม'
        });
      }
    } catch (e) {
      console.error(e);
      const updated = [newItem, ...draftsHistory];
      setDraftsHistory(updated);
      localStorage.setItem('moi_drafts', JSON.stringify(updated));
      showToast('บันทึกลงในฐานข้อมูลเครื่องเรียบร้อยแล้ว');
    }
  };

  // Reset to New Draft
  const handleResetNewDraft = () => {
    setEditingDraftDbId(null);
    setEditingDraftId(null);
    setSubject('');
    setTo('');
    setDocNum('รย ๐๐๒๑.๑/');
    setDate(new Date().toISOString().split('T')[0]);
    setRefText('');
    setAttText('');
    setUrgency('ปกติ');
    setSecrecy('ไม่ลับ');
    const initialHtml = `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ${orgName} มีความประสงค์จะ [ระบุวัตถุประสงค์หลัก] เพื่อประโยชน์ต่อประชาชน</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ จึงใคร่ขอความอนุเคราะห์จากท่าน [ระบุสิ่งที่ต้องการ]</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`;
    setEditorContent(initialHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
    showToast('สร้างแบบร่างใหม่เรียบร้อย');
  };

  // Load Draft from History to Edit
  const handleLoadDraftToEdit = (item: any) => {
    setEditingDraftDbId(item.dbId || null);
    setEditingDraftId(item.id);
    if (item.docNum) setDocNum(item.docNum);
    if (item.date) setDate(item.date);
    if (item.subject) setSubject(item.subject);
    if (item.docType) setDocType(item.docType);
    if (item.urgency) setUrgency(item.urgency);
    if (item.secrecy) setSecrecy(item.secrecy);
    if (item.to) setTo(item.to);
    if (item.ref) setRefText(item.ref);
    if (item.att) setAttText(item.att);
    if (item.signer) setSigner(item.signer);
    if (item.signerPos) setSignerPos(item.signerPos);

    const bodyHtml = item.body || item.content || '';
    setEditorContent(bodyHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = bodyHtml;
    }

    setActiveTab('editor');
    showToast(`โหลดร่างหนังสือ "${item.subject || 'ฉบับนี้'}" เข้าสู่หน้าจอแก้ไขแล้ว`);
  };

  // Duplicate Draft
  const handleDuplicateDraft = async (item: any) => {
    const newTitle = `${item.subject || 'ร่างหนังสือ'} (สำเนา)`;
    const newId = Date.now();
    const clonedItem: DraftItem = {
      ...item,
      id: newId,
      subject: newTitle,
      createdAt: new Date().toISOString()
    };

    const payload = {
      docType: 'draft_letter',
      title: newTitle,
      docNumber: item.docNum || '',
      date: item.date || '',
      urgency: item.urgency || 'ปกติ',
      secrecy: item.secrecy || 'ไม่ลับ',
      fromDept: deptContact,
      toDept: item.to || '',
      subject: newTitle,
      content: item.body || item.content || '',
      signatory: item.signer || '',
      signatoryPosition: item.signerPos || '',
      status: 'draft',
      createdBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน',
      extraData: clonedItem
    };

    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      loadDrafts();
      showToast('ทำสำเนาแบบร่างสำเร็จ');
    } catch (e) {
      console.error(e);
      const updated = [clonedItem, ...draftsHistory];
      setDraftsHistory(updated);
      localStorage.setItem('moi_drafts', JSON.stringify(updated));
      showToast('ทำสำเนาสำเร็จ');
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (item: any) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบร่างหนังสือราชการ',
      message: `ต้องการลบร่างหนังสือเรื่อง "${item.subject || item.id}" ใช่หรือไม่? ไม่สามารถเรียกคืนได้`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const userNameToPass = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' : 'ผู้ใช้งาน';

    if (item.dbId) {
      try {
        await fetch(`/api/drafts/${item.dbId}?username=${encodeURIComponent(userNameToPass)}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
    }

    const updated = draftsHistory.filter(d => d.id !== item.id);
    setDraftsHistory(updated);
    localStorage.setItem('moi_drafts', JSON.stringify(updated));
    showToast('ลบแบบร่างเรียบร้อยแล้ว');
  };

  // Print Document directly
  const handlePrintDoc = () => {
    const docHtml = getCurrentDocHtml();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${subject || 'หนังสือราชการ'}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 20mm 20mm 20mm 25mm;
              }
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                font-family: 'TH SarabunPSK', 'Sarabun', sans-serif;
                color: #000;
              }
            </style>
          </head>
          <body>
            ${docHtml}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Filtered History
  const filteredHistory = draftsHistory.filter(item => {
    const matchSearch = !historySearch.trim() || 
      (item.subject && item.subject.toLowerCase().includes(historySearch.toLowerCase())) ||
      (item.docNum && item.docNum.toLowerCase().includes(historySearch.toLowerCase())) ||
      (item.to && item.to.toLowerCase().includes(historySearch.toLowerCase()));
    const matchType = historyFilterType === 'all' || item.docType === historyFilterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Glass Header & Sub-Tabs */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  ร่างหนังสือราชการ
                </h2>
                {editingDraftDbId && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                    <PenTool className="w-3 h-3" /> กำลังแก้ไขแบบร่างเดิม #{editingDraftDbId}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                ระบบร่างหนังสือราชการไทยตามระเบียบงานสารบรรณ พร้อม Live A4 Preview และ AI ช่วยร่างอัจฉริยะ
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Fast Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" /> หน้าจอพิมพ์ร่าง
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-3.5 h-3.5" /> ประวัติแบบร่าง
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'history' ? 'bg-white/25 text-white' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'}`}>
                {draftsHistory.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> คลังเทมเพลตมาตรฐาน
            </button>
          </div>

          {/* New Draft Button */}
          {activeTab === 'editor' && editingDraftDbId && (
            <button
              onClick={handleResetNewDraft}
              className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> ขึ้นแบบร่างใหม่
            </button>
          )}
        </div>
      </div>

      {/* VIEW: EDITOR & LIVE A4 */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Editor Control Bar (View Switcher + Quick Actions) */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            {/* Left: View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)] mr-1 hidden sm:inline">มุมมอง:</span>
              <div className="inline-flex p-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'split' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="แบ่ง ๒ ฝั่ง (Editor + Live A4)"
                >
                  <Split className="w-3.5 h-3.5" /> <span className="hidden md:inline">แบ่งจอ (Split View)</span>
                </button>
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'editor' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="โหมดพิมพ์เต็มจอ"
                >
                  <PenTool className="w-3.5 h-3.5" /> <span className="hidden md:inline">พิมพ์เต็มจอ</span>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'preview' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="โหมดตัวอย่างกระดาษ A4"
                >
                  <Eye className="w-3.5 h-3.5" /> <span className="hidden md:inline">พรีวิว A4</span>
                </button>
              </div>

              {/* Thai Numerals Converter */}
              <div className="inline-flex items-center p-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleConvertDigits(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="แปลงตัวเลขทั้งหมดในเลขที่หนังสือและเนื้อหาเป็นเลขไทย (๐-๙)"
                >
                  <span>🇹🇭 แปลงเลขไทย ๐-๙</span>
                  {arabicDigitsFound > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                      พบ {arabicDigitsFound}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleConvertDigits(false)}
                  className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                  title="แปลงกลับเป็นเลขอารบิก 0-9 ทั้งหมด"
                >
                  0-9
                </button>
              </div>
            </div>

            {/* Right: AI Assistant Buttons & Save Draft */}
            <div className="flex flex-wrap items-center gap-2">
              {/* AI Auto-Format to Saraban Standards */}
              <div className="flex items-center">
                <button
                  onClick={() => handleAutoFormatSaraban(false)}
                  disabled={isAutoFormatting}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-l-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="ตรวจทานและจัดหน้าตามระเบียบสารบรรณอัตโนมัติด้วย AI"
                >
                  {isAutoFormatting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isAutoFormatting ? 'กำลังจัดหน้า...' : '✨ AI จัดหน้าสารบรรณ'}</span>
                </button>
                <button
                  onClick={() => handleAutoFormatSaraban(true)}
                  disabled={isAutoFormatting}
                  className="px-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-bold rounded-r-lg border-l border-amber-700/30 transition-all cursor-pointer disabled:opacity-50"
                  title="จัดหน้าตามระเบียบสารบรรณทันทีใน 1 คลิก (1-Click Auto Format)"
                >
                  ด่วน
                </button>
              </div>

              <button
                onClick={() => setShowAiDraftModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> ✨ AI ช่วยร่างเนื้อหา
              </button>

              <button
                onClick={handleAuditDocument}
                disabled={isAuditing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FileCheck className="w-3.5 h-3.5" /> {isAuditing ? 'กำลังตรวจ...' : 'AI ตรวจระเบียบ'}
              </button>

              <button
                onClick={handleSaveDraft}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> {editingDraftDbId ? 'อัปเดตแบบร่าง' : 'บันทึกแบบร่าง'}
              </button>

              <button
                onClick={handlePrintDoc}
                className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-lg transition-colors cursor-pointer"
                title="สั่งพิมพ์ A4"
              >
                <Printer className="w-4 h-4 text-violet-500" />
              </button>

              <button
                onClick={() => downloadAsDoc(getCurrentDocHtml(), `ร่างหนังสือ_${subject || 'ราชการ'}`)}
                className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-lg transition-colors cursor-pointer"
                title="ส่งออกไฟล์ Word (.doc)"
              >
                <FileDown className="w-4 h-4 text-blue-500" />
              </button>
            </div>
          </div>

          {/* Main Content Workspace (Split / Editor / Preview) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: FORM & EDITOR */}
            {(viewMode === 'split' || viewMode === 'editor') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                {/* Form Metadata Section */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--primary-color)]" /> ข้อมูลหนังสือราชการ
                    </h3>

                    {/* Quick Category Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">ประเภท:</span>
                      <select
                        value={docType}
                        onChange={e => {
                          const val = e.target.value;
                          setDocType(val);
                          setSelectedTypeTitle(val);
                        }}
                        className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
                      >
                        <option value="หนังสือส่ง">หนังสือส่ง (หนังสือภายนอก)</option>
                        <option value="บันทึกข้อความ">บันทึกข้อความ (หนังสือภายใน)</option>
                        <option value="หนังสือประทับตรา">หนังสือประทับตรา</option>
                        <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                        <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
                        <option value="คำสั่ง">คำสั่ง</option>
                        <option value="ประกาศ">ประกาศ</option>
                      </select>
                    </div>
                  </div>

                  {/* Metadata Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Doc Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <span>เลขที่หนังสือ (ที่)</span>
                          {/[0-9]/.test(docNum) && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                              มีเลขอารบิก
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAutoThaiDocNum(!autoThaiDocNum)}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                              autoThaiDocNum 
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30' 
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
                            }`}
                            title="แปลงเลขอัตโนมัติเป็นเลขไทยทันทีขณะพิมพ์"
                          >
                            {autoThaiDocNum ? '✓ แปลงไทยออโต้' : 'พิมพ์อารบิก'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const converted = toThaiNumeral(docNum);
                              setDocNum(converted);
                              showToast(`แปลงเลขที่หนังสือเป็น "${converted}" แล้ว`);
                            }}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 cursor-pointer"
                            title="แปลงเลขที่หนังสือเป็นเลขไทยทันที"
                          >
                            🇹🇭 ๐-๙
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocNum(prev => toArabicNumeral(prev))}
                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded cursor-pointer"
                            title="แปลงกลับเป็นเลขอารบิก 0-9"
                          >
                            0-9
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={docNum}
                        onChange={e => {
                          const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                          setDocNum(val);
                        }}
                        onPaste={e => {
                          if (autoThaiDocNum) {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            const converted = toThaiNumeral(pasted);
                            const input = e.currentTarget;
                            const start = input.selectionStart || 0;
                            const end = input.selectionEnd || 0;
                            const currentVal = input.value;
                            const newVal = currentVal.substring(0, start) + converted + currentVal.substring(end);
                            setDocNum(newVal);
                          }
                        }}
                        placeholder="รย ๐๐๒๑.๑/..."
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono focus:border-[var(--primary-color)] outline-none"
                      />
                      {docNum && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {parseDocNumberStructure(docNum, docType).tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                              {tag.label}: <strong>{tag.value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ลงวันที่</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                      <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium truncate">
                        {thDateFull(date)}
                      </div>
                    </div>

                    {/* Urgency */}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ความเร่งด่วน</label>
                      <select
                        value={urgency}
                        onChange={e => setUrgency(e.target.value)}
                        className={`w-full bg-[var(--bg-overlay)] border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                          urgency !== 'ปกติ' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-[var(--border-light)] text-[var(--text-primary)]'
                        }`}
                      >
                        <option value="ปกติ">ปกติ</option>
                        <option value="ด่วน">ด่วน</option>
                        <option value="ด่วนมาก">ด่วนมาก</option>
                        <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                      </select>
                    </div>

                    {/* Secrecy */}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ชั้นความลับ</label>
                      <select
                        value={secrecy}
                        onChange={e => setSecrecy(e.target.value)}
                        className={`w-full bg-[var(--bg-overlay)] border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${
                          secrecy !== 'ไม่ลับ' && secrecy ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-[var(--border-light)] text-[var(--text-primary)]'
                        }`}
                      >
                        <option value="ไม่ลับ">ไม่ลับ (ทั่วไป)</option>
                        <option value="ลับ">ลับ</option>
                        <option value="ลับมาก">ลับมาก</option>
                        <option value="ลับที่สุด">ลับที่สุด</option>
                      </select>
                    </div>

                    {/* Recipient */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                        เรียน / ถึง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={to}
                        onChange={e => {
                          const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                          setTo(val);
                        }}
                        placeholder="เช่น ผู้ว่าราชการจังหวัดระยอง / นายอำเภอทุกอำเภอ"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>

                    {/* Subject */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                        เรื่อง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={e => {
                          const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                          setSubject(val);
                        }}
                        placeholder="กรอกชื่อเรื่องของหนังสือราชการ..."
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-semibold focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>

                    {/* Reference */}
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">อ้างถึง (ถ้ามี)</label>
                      <input
                        type="text"
                        value={refText}
                        onChange={e => {
                          const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                          setRefText(val);
                        }}
                        placeholder="หนังสือที่อ้างถึง..."
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>

                    {/* Attachment */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">สิ่งที่ส่งมาด้วย (ถ้ามี)</label>
                      <input
                        type="text"
                        value={attText}
                        onChange={e => {
                          const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                          setAttText(val);
                        }}
                        placeholder="กำหนดการ / บัญชีรายชื่อ / เอกสารแนบ..."
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>
                  </div>

                  {/* Collapsible Contact Section */}
                  <div className="pt-2 border-t border-[var(--border-lighter)]">
                    <details className="text-xs text-[var(--text-secondary)] group">
                      <summary className="font-semibold cursor-pointer select-none flex items-center justify-between text-[var(--text-primary)] hover:text-indigo-500 py-1">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-500" /> หน่วยงานเจ้าของเรื่อง & ข้อมูลติดต่อส่วนท้าย
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">หน่วยงานหลัก</label>
                          <input
                            type="text"
                            value={orgName}
                            onChange={e => setOrgName(e.target.value)}
                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">กลุ่มงาน/ฝ่าย</label>
                          <input
                            type="text"
                            value={deptContact}
                            onChange={e => {
                              const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                              setDeptContact(val);
                            }}
                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">เบอร์โทรศัพท์</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={e => {
                              const val = autoThaiDocNum ? toThaiNumeral(e.target.value) : e.target.value;
                              setPhone(val);
                            }}
                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">ไปรษณีย์อิเล็กทรอนิกส์</label>
                          <input
                            type="text"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Rich Editor Section */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  {/* Toolbar */}
                  <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] p-2.5 flex flex-wrap items-center gap-1.5">
                    {/* Basic text style */}
                    <button
                      onClick={() => execCommand('bold')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="ตัวหนา (Ctrl+B)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('italic')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="ตัวเอียง (Ctrl+I)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('underline')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="ขีดเส้นใต้ (Ctrl+U)"
                    >
                      <Underline className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

                    {/* Alignment */}
                    <button
                      onClick={() => execCommand('justifyLeft')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="จัดชิดซ้าย"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyCenter')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="จัดกึ่งกลาง"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyRight')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="จัดชิดขวา"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyFull')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors cursor-pointer"
                      title="จัดเต็มแนว (Justify - มาตรฐานราชการ)"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

                    {/* Insert Official Phrases Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPhrasesDropdown(!showPhrasesDropdown)}
                        className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-indigo-500 rounded font-semibold text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        📌 แทรกวลีราชการ ▼
                      </button>

                      {showPhrasesDropdown && (
                        <div className="absolute top-full left-0 mt-1.5 w-80 p-3 bg-[var(--bg-surface)] border border-indigo-500/30 rounded-xl shadow-2xl z-30 space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-1.5">
                            <span className="text-xs font-bold text-[var(--text-primary)]">เลือกวลีมาตรฐานราชการ</span>
                            <button onClick={() => setShowPhrasesDropdown(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex gap-1 border-b border-[var(--border-lighter)] pb-1.5">
                            <button
                              onClick={() => setPhraseCategory('openings')}
                              className={`px-2 py-1 text-[11px] rounded font-medium cursor-pointer ${
                                phraseCategory === 'openings' ? 'bg-indigo-500/15 text-indigo-500 font-bold' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              ขึ้นต้น (ย่อหน้า ๑)
                            </button>
                            <button
                              onClick={() => setPhraseCategory('transitions')}
                              className={`px-2 py-1 text-[11px] rounded font-medium cursor-pointer ${
                                phraseCategory === 'transitions' ? 'bg-indigo-500/15 text-indigo-500 font-bold' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              เชื่อมโยง (ย่อหน้า ๒)
                            </button>
                            <button
                              onClick={() => setPhraseCategory('closings')}
                              className={`px-2 py-1 text-[11px] rounded font-medium cursor-pointer ${
                                phraseCategory === 'closings' ? 'bg-indigo-500/15 text-indigo-500 font-bold' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              คำลงท้าย (ย่อหน้า ๓)
                            </button>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                            {OFFICIAL_STANDARD_PHRASES[phraseCategory].map((phrase, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleInsertPhrase(phrase.text)}
                                className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-xs text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border-light)] cursor-pointer"
                              >
                                <div className="font-semibold text-indigo-500 text-[11px]">{phrase.label}</div>
                                <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{phrase.text}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Insert Garuda Stamp */}
                    <div className="relative">
                      <button
                        onClick={() => setShowGarudaPanel(!showGarudaPanel)}
                        className="px-2.5 py-1 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5" /> ตราครุฑ
                      </button>

                      {showGarudaPanel && (
                        <div className="absolute top-full left-0 mt-1.5 w-64 p-3 bg-[var(--bg-surface)] border border-amber-500/40 rounded-xl shadow-2xl z-30 space-y-3 animate-fade-in">
                          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between border-b border-[var(--border-lighter)] pb-1.5">
                            <span>แทรกตราครุฑในเนื้อหา</span>
                            <button onClick={() => setShowGarudaPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">ขนาดตราครุฑ</label>
                            <div className="flex gap-2">
                              {[
                                { sz: '60', label: '1.5 ซม. (ใน)' },
                                { sz: '113', label: '3.0 ซม. (นอก)' }
                              ].map(item => (
                                <label key={item.sz} className="text-xs text-[var(--text-primary)] flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name="garudaSize" value={item.sz} checked={garudaSize === item.sz} onChange={e => setGarudaSize(e.target.value)} />
                                  {item.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">ตำแหน่ง</label>
                            <div className="flex gap-2">
                              {[
                                { id: 'left', label: 'ซ้าย' },
                                { id: 'center', label: 'กลาง' }
                              ].map(item => (
                                <label key={item.id} className="text-xs text-[var(--text-primary)] flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name="garudaAlign" value={item.id} checked={garudaAlign === item.id} onChange={e => setGarudaAlign(e.target.value as any)} />
                                  {item.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={insertGaruda}
                            className="w-full bg-amber-500 text-slate-950 text-xs font-bold py-1.5 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
                          >
                            แทรกลงในเนื้อหา
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Thai Numerals in Editor Toolbar */}
                    <div className="flex items-center bg-emerald-500/10 border border-emerald-500/30 rounded-lg overflow-hidden ml-auto mr-2">
                      <button
                        type="button"
                        onClick={() => handleConvertDigits(true)}
                        className="px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="แปลงตัวเลขทั้งหมดในเลขที่หนังสือและเนื้อหาเป็นเลขไทย (๐-๙)"
                      >
                        <span>🇹🇭 เลขไทย ๐-๙</span>
                        {arabicDigitsFound > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                            {arabicDigitsFound}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConvertDigits(false)}
                        className="px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/20 border-l border-emerald-500/30 transition-colors cursor-pointer"
                        title="แปลงกลับเป็นเลขอารบิก 0-9"
                      >
                        0-9
                      </button>
                    </div>

                    {/* AI Auto-Format to Saraban Toolbar Quick Action */}
                    <div className="flex items-center bg-amber-500/10 border border-amber-500/30 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleAutoFormatSaraban(false)}
                        disabled={isAutoFormatting}
                        className="px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="ตรวจทานและจัดหน้าตามระเบียบสารบรรณอัตโนมัติด้วย AI"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>AI จัดหน้าสารบรรณ</span>
                      </button>
                      <button
                        onClick={() => handleAutoFormatSaraban(true)}
                        disabled={isAutoFormatting}
                        className="px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/20 border-l border-amber-500/30 transition-colors cursor-pointer disabled:opacity-50"
                        title="จัดหน้าสารบรรณทันที (1-Click Auto-Format)"
                      >
                        1-Click
                      </button>
                    </div>
                  </div>

                  {/* ContentEditable Document Editor Body */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorInput}
                    className="p-5 min-h-[300px] text-sm text-[var(--text-primary)] leading-relaxed outline-none focus:ring-0 custom-scrollbar bg-white dark:bg-slate-900"
                    style={{ fontFamily: "'Sarabun', 'TH SarabunPSK', sans-serif" }}
                  />

                  {/* Signer Block */}
                  <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-light)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ชื่อ-สกุล ผู้ลงนาม</label>
                      <input
                        type="text"
                        value={signer}
                        onChange={e => setSigner(e.target.value)}
                        placeholder="เช่น นายสมชาย มุ่งมั่นพัฒนา"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ตำแหน่งผู้ลงนาม</label>
                      <input
                        type="text"
                        value={signerPos}
                        onChange={e => setSignerPos(e.target.value)}
                        placeholder="เช่น หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: REALISTIC A4 LIVE SHEET PREVIEW */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'} flex flex-col items-center space-y-3`}>
                {/* A4 Sheet Toolbar */}
                <div className="w-full flex items-center justify-between px-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold flex items-center gap-1 text-[var(--text-primary)]">
                      <Eye className="w-4 h-4 text-emerald-500" /> ตัวอย่างหน้ากระดาษจริง (A4)
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">(อัปเดตแบบ Real-time)</span>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg px-2 py-0.5 shadow-sm">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(prev - 10, 60))}
                      className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                      title="ย่อลง"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))}
                      className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                      title="ขยายขึ้น"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Desk Container with Simulated A4 Paper */}
                <div className="w-full bg-slate-200 dark:bg-slate-950 p-4 sm:p-8 rounded-2xl border border-[var(--border-light)] overflow-x-auto custom-scrollbar flex justify-center shadow-inner min-h-[700px]">
                  <div
                    className="bg-white text-slate-900 shadow-2xl p-8 sm:p-12 w-full max-w-[760px] min-h-[1050px] transition-transform origin-top select-text"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif"
                    }}
                    dangerouslySetInnerHTML={{ __html: getCurrentDocHtml() }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: DRAFT HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" /> ประวัติหนังสือร่างในระบบ
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                รายการแบบร่างที่บันทึกไว้ สามารถกด "แก้ไข" เพื่อดึงข้อมูลกลับมาพิมพ์ต่อได้ทันที
              </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="ค้นหาชื่อเรื่อง / เลขที่ / ผู้รับ..."
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none w-56"
                />
              </div>

              <select
                value={historyFilterType}
                onChange={e => setHistoryFilterType(e.target.value)}
                className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
              >
                <option value="all">ทุกประเภท</option>
                <option value="หนังสือส่ง">หนังสือส่ง</option>
                <option value="บันทึกข้อความ">บันทึกข้อความ</option>
                <option value="หนังสือประทับตรา">หนังสือประทับตรา</option>
                <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-sm space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-400 opacity-40" />
              <p>ยังไม่พบประวัติการร่างหนังสือตามเงื่อนไข</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] font-semibold text-[var(--text-secondary)]">
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3 w-36">เลขที่หนังสือ</th>
                    <th className="p-3 w-28">วันที่</th>
                    <th className="p-3">เรื่อง</th>
                    <th className="p-3 w-32">ประเภท</th>
                    <th className="p-3 w-32">ผู้ลงนาม</th>
                    <th className="p-3 w-44 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)]">
                  {filteredHistory.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[var(--border-lighter)]/30 transition-colors">
                      <td className="p-3 text-center text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-[var(--text-primary)]">{item.docNum || '-'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{thDate(item.date)}</td>
                      <td className="p-3 font-semibold text-[var(--text-primary)] max-w-xs truncate" title={item.subject}>
                        {item.subject || '-'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {item.docType}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-secondary)] truncate max-w-[120px]">{item.signer || '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Load & Edit */}
                          <button
                            onClick={() => handleLoadDraftToEdit(item)}
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="โหลดมาทำงานต่อในหน้าจอแก้ไข"
                          >
                            <PenTool className="w-3 h-3" /> แก้ไข
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateDraft(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors cursor-pointer"
                            title="ทำสำเนาแบบร่าง"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Preview */}
                          <button
                            onClick={() => {
                              const html = buildOfficialDoc({
                                docType: item.docType,
                                docNum: item.docNum,
                                date: item.date,
                                to: item.to,
                                subject: item.subject,
                                ref: item.ref,
                                att: item.att,
                                body: item.body || item.content,
                                signer: item.signer,
                                signerPos: item.signerPos,
                                orgName,
                                deptContact,
                                phone,
                                fax,
                                email
                              });
                              setPreviewHtml(html);
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors cursor-pointer"
                            title="ดูตัวอย่างเต็มหน้า"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Export Word */}
                          <button
                            onClick={() => {
                              const html = buildOfficialDoc({
                                docType: item.docType,
                                docNum: item.docNum,
                                date: item.date,
                                to: item.to,
                                subject: item.subject,
                                ref: item.ref,
                                att: item.att,
                                body: item.body || item.content,
                                signer: item.signer,
                                signerPos: item.signerPos,
                                orgName,
                                deptContact,
                                phone,
                                fax,
                                email
                              });
                              downloadAsDoc(html, `ร่างหนังสือ_${item.subject}`);
                            }}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors cursor-pointer"
                            title="ส่งออก Word (.doc)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDraft(item)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
                            title="ลบแบบร่าง"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: OFFICIAL TEMPLATES LIBRARY TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              คลังเทมเพลตหนังสือราชการพร้อมใช้งาน (Official Templates Library)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              เลือกเทมเพลตมาตรฐานตามภารกิจงาน เพื่อโหลดโครงสร้างเนื้อหาและคำลงท้ายที่ถูกต้องตามระเบียบงานสารบรรณลงในแบบร่างทันที
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESET_OFFICIAL_TEMPLATES.map(preset => (
                <div
                  key={preset.id}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {preset.category}
                      </span>
                      {preset.urgency !== 'ปกติ' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          {preset.urgency}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-500 transition-colors">
                      {preset.name}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      เรื่อง: {preset.subject}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-lighter)] mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">ถึง: {preset.to.split('/')[0]}</span>
                    <button
                      onClick={() => handleLoadPresetTemplate(preset)}
                      className="px-3 py-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      โหลดเทมเพลตนี้ <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI SMART DRAFT GENERATOR MODAL */}
      {showAiDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  ผู้ช่วย AI ร่างหนังสือราชการอัจฉริยะ
                </h3>
              </div>
              <button
                onClick={() => setShowAiDraftModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {!aiDraftResult ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      ระบุวัตถุประสงค์หรือเรื่องที่ต้องการร่าง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      placeholder="เช่น ขอเชิญประชุมเตรียมความพร้อมรับมือน้ำท่วมฉับพลัน หรือ ขอความอนุเคราะห์วิทยากร..."
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ประเภทหนังสือ</label>
                      <select
                        value={docType}
                        onChange={e => setDocType(e.target.value)}
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                      >
                        <option value="หนังสือส่ง">หนังสือส่ง (หนังสือภายนอก)</option>
                        <option value="บันทึกข้อความ">บันทึกข้อความ (หนังสือภายใน)</option>
                        <option value="หนังสือประทับตรา">หนังสือประทับตรา</option>
                        <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ความเร่งด่วน</label>
                      <select
                        value={urgency}
                        onChange={e => setUrgency(e.target.value)}
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                      >
                        <option value="ปกติ">ปกติ</option>
                        <option value="ด่วน">ด่วน</option>
                        <option value="ด่วนมาก">ด่วนมาก</option>
                        <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      สิ่งที่ต้องการให้ผู้รับดำเนินการ (ข้อเสนอ)
                    </label>
                    <input
                      type="text"
                      value={aiObjective}
                      onChange={e => setAiObjective(e.target.value)}
                      placeholder="เช่น เข้าร่วมการประชุมพร้อมมอบหมายผู้แทน ๑ ท่าน หรือ อนุเคราะห์วิทยากร ๒ ท่าน..."
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      รายละเอียดเพิ่มเติม / วันเวลา / สถานที่ (ถ้ามี)
                    </label>
                    <textarea
                      value={aiDetails}
                      onChange={e => setAiDetails(e.target.value)}
                      placeholder="เช่น วันที่ ๒๐ มีนาคม ๒๕๖๙ เวลา ๐๙.๓๐ น. ณ ห้องประชุมศาลากลางจังหวัด..."
                      rows={2}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-indigo-500 outline-none custom-scrollbar"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> AI ได้ร่างหนังสือราชการตามโครงสร้าง ๓ ย่อหน้าเรียบร้อยแล้ว
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">เรื่อง:</div>
                    <div className="p-2.5 bg-[var(--bg-overlay)] rounded-lg text-xs font-bold text-[var(--text-primary)]">
                      {aiDraftResult.subject}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">เนื้อหาหนังสือ (๓ ย่อหน้า):</div>
                    <div
                      className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs leading-relaxed text-[var(--text-primary)] max-h-56 overflow-y-auto custom-scrollbar"
                      dangerouslySetInnerHTML={{ __html: aiDraftResult.bodyHtml }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>คำลงท้าย: <strong>{aiDraftResult.closingWord}</strong></span>
                    <span>ผู้รับ: <strong>{aiDraftResult.to}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-light)] flex justify-end gap-2 bg-[var(--bg-elevated)]">
              {!aiDraftResult ? (
                <>
                  <button
                    onClick={() => setShowAiDraftModal(false)}
                    className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingAi}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-purple-500 hover:to-indigo-500 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" /> {isGeneratingAi ? 'กำลังประมวลผลร่าง...' : 'สร้างเนื้อหาด้วย AI'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAiDraftResult(null)}
                    className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
                  >
                    ร่างใหม่อีกครั้ง
                  </button>
                  <button
                    onClick={handleApplyAiDraft}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> นำไปใส่ในแบบร่างทันที
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI AUDIT RESULT DRAWER / MODAL */}
      {showAuditPanel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  ผลการตรวจสอบความสมบูรณ์และระเบียบสารบรรณด้วย AI
                </h3>
              </div>
              <button
                onClick={() => setShowAuditPanel(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {isAuditing && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[var(--text-secondary)]">กำลังตรวจสอบคำผิด ระเบียบสารบรรณ คำราชาศัพท์ และคำลงท้ายอย่างละเอียด...</p>
                </div>
              )}

              {!isAuditing && auditResult && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] font-semibold mb-1">คะแนนความสมบูรณ์ตามระเบียบ</div>
                      <div className="text-2xl font-black font-mono text-indigo-500">
                        {auditResult.overallScore} <span className="text-xs text-[var(--text-muted)] font-normal">/ 100</span>
                      </div>
                    </div>
                    <div className="w-1/2 bg-[var(--border-lighter)] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          auditResult.overallScore >= 80 ? 'bg-emerald-500' : auditResult.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${auditResult.overallScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-lighter)]">
                    "{auditResult.summary}"
                  </p>

                  {/* Closing Word Recommendation */}
                  {auditResult.closingSuggestion && auditResult.closingSuggestion.found && (
                    <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl space-y-1.5">
                      <div className="font-bold text-xs flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        คำลงท้ายที่ควรปรับปรุงตามหลักระเบียบราชการ
                      </div>
                      <p className="text-xs text-[var(--text-primary)]">
                        ควรใช้คำว่า <strong className="text-amber-600 dark:text-amber-400">"{auditResult.closingSuggestion.suggestedPhrase}"</strong> แทน "{auditResult.closingSuggestion.currentPhrase}"
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {auditResult.closingSuggestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Auto Apply Fix */}
                  {auditResult.improvedContent && (
                    <button
                      onClick={() => {
                        if (editorRef.current && auditResult.improvedContent) {
                          editorRef.current.innerHTML = auditResult.improvedContent;
                          setEditorContent(auditResult.improvedContent);
                          setShowAuditPanel(false);
                          showToast('ปรับปรุงเนื้อหาตามข้อเสนอแนะ AI แล้ว');
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> นำข้อเสนอแนะทั้งหมดไปปรับปรุงแบบร่างทันที
                    </button>
                  )}

                  {/* Audit Tabs */}
                  <div className="flex gap-1 border-b border-[var(--border-lighter)] pb-1">
                    {([
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'spelling', label: `คำผิด (${auditResult.spellingIssues?.length || 0})` },
                      { id: 'format', label: `รูปแบบ (${auditResult.formatIssues?.length || 0})` },
                      { id: 'royal', label: `ราชาศัพท์ (${auditResult.royalVocabularyIssues?.length || 0})` },
                      { id: 'completeness', label: `ครบถ้วน (${auditResult.completenessIssues?.length || 0})` }
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAuditTab(tab.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                          activeAuditTab === tab.id
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Issues List */}
                  <div className="space-y-2 pt-1 max-h-56 overflow-y-auto custom-scrollbar">
                    {/* Spelling issues */}
                    {(activeAuditTab === 'all' || activeAuditTab === 'spelling') && auditResult.spellingIssues && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-[var(--text-primary)]">✍️ คำผิดที่ตรวจพบ:</div>
                        {auditResult.spellingIssues.length === 0 ? (
                          <div className="text-[11px] text-[var(--text-muted)] italic">ไม่พบคำผิดสะกด</div>
                        ) : (
                          auditResult.spellingIssues.map((issue: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl text-xs flex items-center justify-between">
                              <span className="line-through text-red-500">"{issue.word}"</span>
                              <span>➡️</span>
                              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">"{issue.suggested}"</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Format issues */}
                    {(activeAuditTab === 'all' || activeAuditTab === 'format') && auditResult.formatIssues && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-[var(--text-primary)]">📐 โครงสร้างและระเบียบ:</div>
                        {auditResult.formatIssues.length === 0 ? (
                          <div className="text-[11px] text-[var(--text-muted)] italic">โครงสร้างถูกต้องตามมาตรฐาน</div>
                        ) : (
                          auditResult.formatIssues.map((issue: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl text-xs space-y-1">
                              <div className="font-bold text-[var(--text-primary)]">{issue.issue}</div>
                              <div className="text-[11px] text-[var(--text-secondary)]">คำแนะนำ: {issue.suggestion}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-light)] flex justify-end bg-[var(--bg-elevated)]">
              <button
                onClick={() => setShowAuditPanel(false)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI SARABAN AUTO-FORMAT MODAL */}
      {showAutoFormatModal && autoFormatResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-[var(--bg-elevated)] to-[var(--bg-elevated)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <Wand2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      AI จัดหน้าตามระเบียบสารบรรณอัตโนมัติ
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      ระเบียบสำนักนายกรัฐมนตรีฯ
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    จัดย่อหน้าร่น ๒.๕ ซม., ชิดขอบสองข้าง (Justify), แปลงเลขไทย ๐-๙, และวางโครงสร้าง ๓ ภาคตามมาตรฐาน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoFormatModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-overlay)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              {/* Highlights 4-Box Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <AlignJustify className="w-3.5 h-3.5 text-amber-500" /> ระยะร่นย่อหน้า
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-1">๒.๕ ซม. (Indent 2.5em)</div>
                  <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ชิดขอบสองข้าง (Justify)
                  </div>
                </div>

                <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> โครงสร้างเนื้อความ
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-1">๓ ภาคมาตรฐาน</div>
                  <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> เหตุ • ประสงค์ • สรุป
                  </div>
                </div>

                <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> ตัวเลขไทย
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-1">๐ - ๙ สารบรรณ</div>
                  <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> แปลงอัตโนมัติครบทุกจุด
                  </div>
                </div>

                <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-purple-500" /> วรรคตอนราชการ
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] mt-1">๑ เคาะ / "นั้น" ๒ เคาะ</div>
                  <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ถูกต้องตามระเบียบ
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFormatModalTab('compare')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      formatModalTab === 'compare'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" /> เปรียบเทียบ ก่อน - หลัง
                  </button>
                  <button
                    onClick={() => setFormatModalTab('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      formatModalTab === 'preview'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> พรีวิวหน้ากระดาษ A4 จริง
                  </button>
                </div>

                {autoFormatResult.closingWord && (
                  <div className="text-[11px] text-[var(--text-muted)] hidden sm:flex items-center gap-1">
                    <span>คำลงท้าย:</span>
                    <span className="font-semibold text-[var(--text-primary)]">"{autoFormatResult.closingWord}"</span>
                  </div>
                )}
              </div>

              {/* View 1: Compare Side-by-Side */}
              {formatModalTab === 'compare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Original */}
                  <div className="border border-[var(--border-light)] rounded-xl bg-[var(--bg-canvas)] overflow-hidden flex flex-col">
                    <div className="p-2.5 bg-[var(--bg-overlay)] border-b border-[var(--border-lighter)] flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> ต้นฉบับเดิม (ก่อนจัดหน้า)
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">แบบร่างเดิม</span>
                    </div>
                    <div
                      className="p-4 text-xs text-[var(--text-secondary)] leading-relaxed max-h-72 overflow-y-auto custom-scrollbar flex-1 bg-white/40 dark:bg-black/20"
                      dangerouslySetInnerHTML={{ __html: originalContentBeforeFormat || 'ไม่มีเนื้อหาเดิม' }}
                    />
                  </div>

                  {/* Right: AI Saraban Formatted */}
                  <div className="border-2 border-amber-500/50 rounded-xl bg-[var(--bg-canvas)] overflow-hidden flex flex-col shadow-md">
                    <div className="p-2.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> จัดหน้าตามระเบียบสารบรรณแล้ว (AI Formatted)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        พร้อมใช้งาน
                      </span>
                    </div>
                    <div
                      className="p-4 text-sm text-[var(--text-primary)] leading-relaxed max-h-72 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900"
                      style={{ fontFamily: "'Sarabun', 'TH SarabunPSK', sans-serif" }}
                      dangerouslySetInnerHTML={{ __html: autoFormatResult.formattedHtml }}
                    />
                  </div>
                </div>
              )}

              {/* View 2: A4 Real Paper Preview */}
              {formatModalTab === 'preview' && (
                <div className="border border-[var(--border-light)] rounded-xl bg-slate-200 dark:bg-slate-950 p-6 flex justify-center max-h-80 overflow-y-auto custom-scrollbar">
                  <div
                    className="bg-white text-black p-8 shadow-xl max-w-[650px] w-full text-sm leading-relaxed"
                    style={{ fontFamily: "'TH SarabunPSK', 'Sarabun', sans-serif", fontSize: '15pt' }}
                    dangerouslySetInnerHTML={{
                      __html: buildOfficialDoc({
                        docType,
                        docNum: formatOptions.applyDocNum && autoFormatResult.docNumFormatted ? autoFormatResult.docNumFormatted : docNum,
                        date,
                        to: formatOptions.applyTo && autoFormatResult.toFormatted ? autoFormatResult.toFormatted : to,
                        subject: formatOptions.applySubject && autoFormatResult.subjectFormatted ? autoFormatResult.subjectFormatted : subject,
                        ref: refText,
                        att: attText,
                        body: autoFormatResult.formattedHtml,
                        signer,
                        signerPos,
                        urgency,
                        secrecy,
                        orgName,
                        deptContact,
                        phone,
                        fax,
                        email
                      })
                    }}
                  />
                </div>
              )}

              {/* Summary of Changes Applied */}
              {autoFormatResult.summaryOfChanges && autoFormatResult.summaryOfChanges.length > 0 && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    รายการจัดระเบียบสารบรรณที่ดำเนินการ:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {autoFormatResult.summaryOfChanges.map((change: string, idx: number) => (
                      <div key={idx} className="text-[11px] text-[var(--text-primary)] flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applied Rules References */}
              {autoFormatResult.appliedRules && autoFormatResult.appliedRules.length > 0 && (
                <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
                  <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" /> ข้อกำหนดระเบียบที่ใช้อ้างอิง:
                  </div>
                  <div className="space-y-0.5">
                    {autoFormatResult.appliedRules.map((rule: string, idx: number) => (
                      <div key={idx} className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <span className="text-amber-500">§</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selective Apply Checkboxes */}
              <div className="p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl space-y-2">
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-500" /> เลือกข้อมูลที่ต้องการนำไปใส่ในแบบร่าง:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatOptions.applyBody}
                      onChange={e => setFormatOptions({ ...formatOptions, applyBody: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>นำเนื้อความที่จัดหน้าแล้วไปใส่ในแบบร่าง (Body Content)</span>
                  </label>

                  {autoFormatResult.docNumFormatted && (
                    <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formatOptions.applyDocNum}
                        onChange={e => setFormatOptions({ ...formatOptions, applyDocNum: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span>
                        แปลงเลขที่หนังสือเป็นเลขไทย: <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">"{autoFormatResult.docNumFormatted}"</span>
                      </span>
                    </label>
                  )}

                  {autoFormatResult.subjectFormatted && autoFormatResult.subjectFormatted !== subject && (
                    <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formatOptions.applySubject}
                        onChange={e => setFormatOptions({ ...formatOptions, applySubject: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span>ปรับปรุงชื่อเรื่องให้สมบูรณ์ขึ้น: "{autoFormatResult.subjectFormatted}"</span>
                    </label>
                  )}

                  {autoFormatResult.toFormatted && autoFormatResult.toFormatted !== to && (
                    <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formatOptions.applyTo}
                        onChange={e => setFormatOptions({ ...formatOptions, applyTo: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span>ปรับปรุงคำขึ้นต้น/ผู้รับ (เรียน): "{autoFormatResult.toFormatted}"</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <button
                onClick={() => setShowAutoFormatModal(false)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded-xl hover:bg-[var(--border-lighter)] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={applyAutoFormatChanges}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ยืนยันนำการจัดหน้าสารบรรณไปใช้ในเอกสาร</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างหนังสือราชการ
              </h3>
              <button onClick={() => setPreviewHtml(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 custom-scrollbar flex justify-center">
              <div className="max-w-[760px] w-full" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="p-4 border-t border-[var(--border-light)] flex justify-end gap-2 bg-[var(--bg-elevated)]">
              <button
                onClick={() => setPreviewHtml(null)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
              >
                ปิด
              </button>
              <button
                onClick={() => downloadAsDoc(previewHtml, `หนังสือราชการ_${subject || 'ร่าง'}`)}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-medium rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4" /> ดาวน์โหลด Word (.doc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
