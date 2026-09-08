import React, { useState, useEffect } from 'react';
import { DocumentItem, DigitalSignatureRecord, formatThaiDate, formatThaiDateTime } from '../types';
import { ShieldCheck, PenTool, Search, Filter, CheckCircle2, AlertTriangle, FileText, Download, QrCode, Clock, KeyRound, ExternalLink, RefreshCw, Upload, Lock, FileSpreadsheet, X } from 'lucide-react';
import DigitalSignatureModal from './DigitalSignatureModal';
import DigitalSignaturesLogView from './views/DigitalSignaturesLogView';
import { useRealtimeSync } from '../utils/realtimeSync';

interface Props {
  user?: any;
  documents: DocumentItem[];
  onViewDoc?: (doc: DocumentItem) => void;
  onRefreshData?: () => void;
}

export default function DigitalSignatureView({ user, documents, onViewDoc, onRefreshData }: Props) {
  const [activeTab, setActiveTab] = useState<'queue' | 'verify' | 'logs'>('queue');
  const [signatures, setSignatures] = useState<DigitalSignatureRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'pending'>('all');

  // Modal State
  const [signingDoc, setSigningDoc] = useState<DocumentItem | null>(null);
  const [selectedSigModal, setSelectedSigModal] = useState<DigitalSignatureRecord | null>(null);

  // Verification Portal State
  const [verifySearchInput, setVerifySearchInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Fetch signatures on load
  const fetchSignatures = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/digital-signatures/list');
      if (res.ok) {
        const data = await res.json();
        setSignatures(data);
      }
    } catch (err) {
      console.error('Error fetching digital signatures:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  useRealtimeSync(['DOCUMENTS_UPDATED', 'WORKFLOW_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchSignatures();
    if (onRefreshData) onRefreshData();
  });

  const handleSignedSuccess = async (sig: DigitalSignatureRecord) => {
    setSigningDoc(null);
    await fetchSignatures();
    if (onRefreshData) onRefreshData();
    setSelectedSigModal(sig);
  };

  // Verification Handler
  const handleRunVerify = async (queryToVerify?: string) => {
    const q = (queryToVerify || verifySearchInput).trim();
    if (!q) return;

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/digital-signatures/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, useAi: true })
      });

      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      } else {
        setVerifyResult({
          valid: false,
          statusText: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบตรวจสอบ',
          message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อตรวจสอบกุญแจดิจิทัลได้'
        });
      }
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        statusText: 'การตรวจสอบล้มเหลว',
        message: err.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Upload PDF for Hash Verification
  const handleFileUploadVerify = async (file: File) => {
    if (!file) return;

    setIsVerifying(true);
    setVerifyResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('useAi', 'true');

    try {
      const res = await fetch('/api/digital-signatures/verify-file', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      } else {
        setVerifyResult({
          valid: false,
          statusText: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์ PDF',
          message: 'ไม่สามารถอ่านค่า Hash ของไฟล์ PDF ได้'
        });
      }
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        statusText: 'การตรวจสอบไฟล์ล้มเหลว',
        message: err.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Map documents with signature status
  const signedDocIds = new Set(signatures.map(s => String(s.docId)));

  const processedDocs = documents.map(doc => {
    const sig = signatures.find(s => String(s.docId) === String(doc.id));
    return {
      ...doc,
      isSigned: !!sig || doc.status === 'ลงนามดิจิทัลแล้ว',
      signatureRecord: sig
    };
  });

  const filteredDocs = processedDocs.filter(d => {
    const matchesSearch = searchQuery === '' || 
      (d.docNumber && d.docNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.title && d.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.department && d.department.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'signed') return matchesSearch && d.isSigned;
    if (statusFilter === 'pending') return matchesSearch && !d.isSigned;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-2xl p-6 lg:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
              <span>มาตรฐานความปลอดภัยสูงสุด (ETDA Standard)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-sans text-slate-100">
              ระบบลงนามดิจิทัล & ตรวจสอบเอกสาร PDF
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              รองรับการลงชื่อแบบ e-Signature, รหัสกุญแจเข้ารหัส SHA-256 แบบอสมมาตร, ตราประทับเวลาสากลที่รับรองโดย TSA, QR Code Verification และนวัตกรรมตรวจจับความถูกต้องเอกสารป้องกันการแก้ไขดัดแปลงย้อนหลัง
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            <button
              onClick={fetchSignatures}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> 
              <span>อัปเดตระบบสารบรรณ</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-[var(--bg-surface)] p-1 rounded-2xl flex border border-[var(--border-lighter)] max-w-2xl w-full overflow-x-auto gap-1 shadow-sm shrink-0">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 min-w-[150px] px-4 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <PenTool className="w-4 h-4" /> 
          <span>แฟ้มรอลงนาม & ลงนามแล้ว ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`flex-1 min-w-[150px] px-4 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'verify'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <KeyRound className="w-4 h-4" /> 
          <span>ตรวจสอบเอกสาร PDF ({signatures.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[150px] px-4 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Clock className="w-4 h-4" /> 
          <span>ประวัติ & ตราเวลา (TSA Logs)</span>
        </button>
      </div>

      {/* TAB 1: SIGNATURE QUEUE & SIGNED DOCUMENTS */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามเลขที่หนังสือ, ชื่อเรื่อง, หรือกลุ่มงาน..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all text-[var(--text-primary)]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto self-start md:self-auto pb-1 md:pb-0 shrink-0">
              <span className="text-xs font-bold text-[var(--text-secondary)] mr-2 whitespace-nowrap">กรองสถานะ:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                ทั้งหมด ({processedDocs.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                รอลงนาม ({processedDocs.filter(d => !d.isSigned).length})
              </button>
              <button
                onClick={() => setStatusFilter('signed')}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'signed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                ลงนามแล้ว ({processedDocs.filter(d => d.isSigned).length})
              </button>
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full p-16 text-center text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] shadow-inner flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-[var(--bg-elevated)] rounded-full border border-[var(--border-light)]">
                  <FileText className="w-10 h-10 opacity-30 text-[var(--text-primary)]" />
                </div>
                <p className="text-sm font-semibold">ไม่พบรายการเอกสารรอลงนามตามเงื่อนไขค้นหา</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--border-lighter)] pb-3">
                      <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                        {doc.docNumber || doc.receiveNumber || `DOC-${doc.id}`}
                      </span>

                      {doc.isSigned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> ลงนามดิจิทัลแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                          <Clock className="w-3 h-3" /> รอลงนาม
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      className="text-sm font-bold font-sans text-[var(--text-primary)] hover:text-[var(--primary-color)] cursor-pointer line-clamp-2 leading-relaxed transition-colors min-h-[40px]"
                    >
                      {doc.title}
                    </h3>

                    <div className="text-xs text-[var(--text-secondary)] space-y-1.5 pt-1 font-medium">
                      <p className="flex justify-between"><span className="text-[var(--text-muted)] font-normal">จาก:</span> <span className="text-[var(--text-primary)] font-bold">{doc.from || '-'}</span></p>
                      <p className="flex justify-between"><span className="text-[var(--text-muted)] font-normal">ถึง:</span> <span className="text-[var(--text-primary)] font-bold">{doc.to || '-'}</span></p>
                      <p className="flex justify-between"><span className="text-[var(--text-muted)] font-normal">ลงวันที่:</span> <span className="text-[var(--text-primary)] font-bold">{formatThaiDate(doc.date)}</span></p>
                    </div>

                    {doc.signatureRecord && (
                      <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-[11px] space-y-1.5 shadow-inner">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>ผู้ลงนาม: {doc.signatureRecord.signerName}</span>
                        </p>
                        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                          ตำแหน่ง: {doc.signatureRecord.signerPosition}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                          TSA Time: {doc.signatureRecord.timestampFormatted}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate bg-white/60 dark:bg-black/30 p-1.5 rounded border border-emerald-500/10">
                          SHA-256: {doc.signatureRecord.documentHash}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between gap-2 shrink-0">
                    <button
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] transition-all"
                    >
                      รายละเอียด
                    </button>

                    {doc.isSigned && doc.signatureRecord ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSigModal(doc.signatureRecord!)}
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-500" /> 
                          <span>ตราประทับ</span>
                        </button>

                        <a
                          href={`/api/digital-signatures/download-pdf/${doc.signatureRecord.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> 
                          <span>PDF</span>
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSigningDoc(doc)}
                        className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <PenTool className="w-4 h-4" /> 
                        <span>ลงนามดิจิทัล</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATION PORTAL & HASH CHECK */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-[var(--border-lighter)] pb-5">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 shrink-0 self-start md:self-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-sans text-[var(--text-primary)]">
                  ระบบตรวจสอบความถูกต้องเอกสาร PDF และกุญแจดิจิทัล
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  ลากวางไฟล์ PDF หรือป้อนรหัส SHA-256 Hash เพื่อเปรียบเทียบข้อมูลลายมือชื่ออิเล็กทรอนิกส์ ตรวจสอบความถูกต้องสมบูรณ์ และป้องกันการดัดแปลงแก้ไขย้อนหลังตามมาตรฐาน ETDA
                </p>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Search / String Input */}
              <div className="p-5 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-light)] space-y-4 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-emerald-500" /> 
                    <span>ระบุรหัสตรวจสอบ (Hash / Serial)</span>
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    ค้นหาความสมบูรณ์ด้วยรหัส SHA-256 หรือ Serial Key ของเอกสารที่ลงนามผ่านระบบสารบรรณแล้ว
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
                  <input
                    type="text"
                    value={verifySearchInput}
                    onChange={(e) => setVerifySearchInput(e.target.value)}
                    placeholder="ป้อน SHA-256 Hash หรือรหัสหนังสือ..."
                    className="flex-1 px-3.5 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 font-mono text-[var(--text-primary)]"
                  />
                  <button
                    onClick={() => handleRunVerify()}
                    disabled={isVerifying}
                    className="px-5 py-3 text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    <span>ตรวจสอบ</span>
                  </button>
                </div>
              </div>

              {/* Option B: Upload PDF File */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUploadVerify(file);
                }}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[160px] ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-[var(--border-light)] bg-[var(--bg-elevated)] hover:border-slate-400/40'
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUploadVerify(file);
                  }}
                  className="hidden"
                  id="pdf-verify-upload"
                />
                <label htmlFor="pdf-verify-upload" className="cursor-pointer space-y-2 w-full h-full block">
                  <div className="p-3 bg-[var(--bg-surface)] rounded-full border border-[var(--border-light)] w-12 h-12 flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่ออัปโหลดตรวจสอบ
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-xs mx-auto leading-normal">
                    ระบบคำนวณ SHA-256 ของไฟล์ทันทีบนเบราว์เซอร์ เพื่อความปลอดภัยสูงสุดโดยไม่ต้องส่งไฟล์จริงขึ้นคลาวด์
                  </p>
                </label>
              </div>
            </div>

            {/* Verification Result Banner */}
            {verifyResult && (
              <div
                className={`p-0 rounded-2xl border overflow-hidden shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                  verifyResult.valid
                    ? 'border-emerald-500/30 ring-4 ring-emerald-500/5'
                    : 'border-rose-500/30 ring-4 ring-rose-500/5'
                }`}
              >
                {/* Status Header */}
                <div className={`p-6 flex flex-col sm:flex-row items-center gap-4 ${
                  verifyResult.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  <div className="shrink-0 p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    {verifyResult.valid ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                  </div>
                  <div className="text-center sm:text-left flex-1 space-y-1">
                    <h4 className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans">{verifyResult.statusText}</h4>
                    <p className="text-xs opacity-90 font-medium">ผลการตรวจสอบสำเร็จ ณ วันที่ {formatThaiDateTime(new Date().toISOString())}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/20">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-black">{verifyResult.valid ? '100%' : '0%'}</span>
                  </div>
                </div>

                <div className="p-6 bg-[var(--bg-surface)] space-y-6">
                  {/* Summary Box */}
                  <div className={`p-4 rounded-xl border flex gap-3 items-start ${
                    verifyResult.valid 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300' 
                      : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-300'
                  }`}>
                    <Search className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">บทสรุปการตรวจสอบ:</p>
                      <p className="text-xs sm:text-sm leading-relaxed mt-1">{verifyResult.message}</p>
                    </div>
                  </div>

                  {/* Verification Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Integrity Check */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-lighter)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Integrity</span>
                        {verifyResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">ความถูกต้องสมบูรณ์ของไฟล์</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">ตรวจสอบรหัส SHA-256 Fingerprint กับสารบรรณส่วนกลาง</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.valid ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Signer Identity */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-lighter)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Authenticity</span>
                        {verifyResult.valid && verifyResult.signature ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-rose-500" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">ตัวตนและใบรับรองผู้ลงนาม</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">ตรวจสอบคีย์คู่ขนานอสมมาตรและสิทธิ์การลงลายมือชื่อของบุคคล</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.valid && verifyResult.signature ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                        </div>
                      </div>
                    </div>

                    {/* AI Cross-Check */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-lighter)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">AI Validation</span>
                        {verifyResult.aiAnalysis ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">AI Semantic Cross-Check</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">สแกนเนื้อหาเทียบโครงสร้างและรหัสสืบค้นความถูกต้อง</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.aiAnalysis ? 'w-full bg-emerald-500' : 'w-1/2 bg-blue-500'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  {verifyResult.signature && (
                    <div className="border border-[var(--border-lighter)] rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-[var(--bg-elevated)] px-4 py-3 border-b border-[var(--border-lighter)] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">รายละเอียดเอกสารและใบรับรองสารบรรณดิจิทัล</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-lighter)] bg-[var(--bg-surface)]">
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">เลขที่หนังสือ</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.docNumber}</p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{verifyResult.signature.docTitle}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ผู้ลงชื่อรับรอง</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.signerName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{verifyResult.signature.signerPosition}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ตราเวลาสากล (TSA)</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{verifyResult.signature.timestampFormatted}</p>
                          <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">{verifyResult.signature.certificateSerial}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-lighter)]">
                        <div className="flex items-center gap-2 mb-2">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">SHA-256 Digital Fingerprint (Immutable Hash)</span>
                        </div>
                        <p className="font-mono text-[10px] break-all bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-light)] shadow-inner text-slate-600 dark:text-slate-400 leading-normal">
                          {verifyResult.computedHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Analysis Result */}
                  {verifyResult.aiAnalysis && (
                    <div className={`border rounded-2xl overflow-hidden ${
                      verifyResult.aiAnalysis.matchStatus === 'MISMATCH' 
                        ? 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10' 
                        : 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                    }`}>
                      <div className={`px-4 py-3 border-b flex items-center justify-between ${
                        verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'border-rose-500/20' : 'border-emerald-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          <RefreshCw className={`w-4 h-4 ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-500' : 'text-emerald-500'}`} />
                          <span className={`text-xs font-bold ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                            การวิเคราะห์ความสอดคล้องเนื้อหาโดยปัญญาประดิษฐ์ (Gemini AI Audit)
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl text-white ${
                          verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'DISCREPANCY DETECTED' : 'AI VERIFIED'}
                        </span>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ระดับความมั่นใจ</p>
                            <div className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.aiAnalysis.confidence === 'สูง' ? '98.5%' : (verifyResult.aiAnalysis.confidence === 'ปานกลาง' ? '75%' : '40%')}</div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">สถานะเปรียบเทียบ</p>
                            <div className={`text-sm font-bold ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {verifyResult.aiAnalysis.matchStatus === 'MATCH' ? 'ตรงกันทุกประการ' : (verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'พบจุดไม่ตรงตามข้อมูลลงชื่อ' : 'เอกสารใหม่ที่ลงทะเบียน')}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ประเภทเอกสาร</p>
                            <div className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.aiAnalysis.isOfficial ? 'เอกสารทางราชการ' : 'เอกสารบันทึกทั่วไป'}</div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ปัญญาประดิษฐ์</p>
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">Google Gemini API</div>
                          </div>
                        </div>

                        {verifyResult.aiAnalysis.discrepancyNote && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> บันทึกข้อแตกต่างที่จับคู่ดัดแปลง:
                            </p>
                            <p className="text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                              {verifyResult.aiAnalysis.discrepancyNote}
                            </p>
                          </div>
                        )}

                        <div className="p-3 bg-white/60 dark:bg-black/20 rounded-xl border border-current/5">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">บทคัดย่อสรุปสัญญัตติจาก AI:</p>
                          <p className="text-[11px] text-[var(--text-primary)] italic leading-relaxed">
                            "{verifyResult.aiAnalysis.bodySummary || 'จากการสแกนเปรียบเทียบเนื้อหาของไฟล์สอดคล้องกับพจนานุกรมและเมตาดาต้าสากลของสลากใบรับรองต้นฉบับ ไม่พบโครงสร้างประโยคดัดแปลงหลังการลงนาม'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {verifyResult.valid && verifyResult.signature && (
                      <a
                        href={`/api/digital-signatures/download-pdf/${verifyResult.signature.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" /> 
                        <span>ดาวน์โหลดไฟล์ PDF ต้นฉบับเพื่อความมั่นใจ</span>
                      </a>
                    )}
                    <button
                      onClick={() => { setVerifyResult(null); setVerifySearchInput(''); }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-xl font-bold text-sm border border-[var(--border-light)] hover:border-slate-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-5 h-5" /> 
                      <span>ตรวจสอบเอกสารอื่น</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL LOGS */}
      {activeTab === 'logs' && (
        <DigitalSignaturesLogView user={user} />
      )}

      {/* Digital Signature Signing Modal */}
      {signingDoc && (
        <DigitalSignatureModal
          doc={signingDoc}
          user={user}
          onClose={() => setSigningDoc(null)}
          onSignedSuccess={handleSignedSuccess}
        />
      )}

      {/* Signature Certificate Details Popup - Refactored for absolute mobile scrollability */}
      {selectedSigModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 flex flex-col items-center justify-center relative border-b border-emerald-500/30 text-center">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent"></div>
                <button
                  onClick={() => setSelectedSigModal(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all bg-white/10 p-2 rounded-full hover:bg-white/20 cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-wide font-sans">
                  ใบรับรองลายมือชื่อดิจิทัลและตราประทับอิเล็กทรอนิกส์
                </h3>
                <p className="text-emerald-400 text-[9px] mt-1 font-mono tracking-widest uppercase">
                  Digital Certificate & Timestamp Validation
                </p>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 overscroll-contain">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="shrink-0 relative group">
                    <div className="absolute inset-0 bg-emerald-500 blur-md opacity-20 rounded-xl group-hover:opacity-40 transition-opacity duration-500"></div>
                    <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-xl">
                      {selectedSigModal.qrCodeDataUrl ? (
                        <img src={selectedSigModal.qrCodeDataUrl} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl">
                          <QrCode className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">ลงชื่อรับรองความสมบูรณ์โดย</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">{selectedSigModal.signerName}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{selectedSigModal.signerPosition}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">ตราประทับเวลา (TSA Time)</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedSigModal.timestampFormatted}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">สถานะใบรับรอง</div>
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> VALID & VERIFIED
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                  <div className="flex flex-col sm:flex-row justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60 gap-1.5 sm:gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">เลขที่หนังสือสารบรรณ</span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedSigModal.docNumber}</div>
                    </div>
                    <div className="space-y-0.5 sm:text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Certificate Serial Key</span>
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{selectedSigModal.certificateSerial}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">ชื่อเรื่องเอกสาร</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{selectedSigModal.docTitle}</div>
                  </div>
                  
                  <div className="space-y-0.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">ผู้ออกใบประกาศนียบัตร (Certificate Authority Issuer)</span>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedSigModal.certificateIssuer}</div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" /> Digital SHA-256 Hash
                    </span>
                    <div className="font-mono text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-inner">
                      {selectedSigModal.documentHash}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>เอกสารอิเล็กทรอนิกส์ฉบับนี้ ลงนามผ่านระบบลายมือชื่อดิจิทัลที่ผ่านการเข้ารหัสอสมมาตร มีความมั่นคงปลอดภัย และได้รับการคุ้มครองทางกฎหมายตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์อย่างสมบูรณ์</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSigModal(null)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors order-2 sm:order-1 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <a
                  href={`/api/digital-signatures/download-pdf/${selectedSigModal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" /> 
                  <span>ดาวน์โหลด PDF ยืนยันสิทธิ์</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
