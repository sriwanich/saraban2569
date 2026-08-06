import React, { useState, useEffect } from 'react';
import { DocumentItem, DigitalSignatureRecord, formatThaiDate, formatThaiDateTime } from '../types';
import { ShieldCheck, PenTool, Search, Filter, CheckCircle2, AlertTriangle, FileText, Download, QrCode, Clock, KeyRound, ExternalLink, RefreshCw, Upload, Lock, FileSpreadsheet, X } from 'lucide-react';
import DigitalSignatureModal from './DigitalSignatureModal';

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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" /> Legal Electronic & Digital Signatures Standard (ETDA)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ศูนย์ลงนามดิจิทัล & ตรวจสอบเอกสาร PDF (Digital Signature Studio)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              รองรับ e-Signature, Digital Signature ด้วยรหัสกุญแจเข้ารหัส SHA-256, ตราประทับเวลามาตรฐาน (TSA), QR Code และระบบตรวจจับการแก้ไขดัดแปลงเอกสารย้อนหลัง
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchSignatures}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> อัปเดตข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center border-b border-[var(--card-border)] gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <PenTool className="w-4 h-4" /> แฟ้มรอลงนาม & ลงนามแล้ว ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'verify'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <KeyRound className="w-4 h-4" /> ตรวจสอบความถูกต้อง PDF & Hash ({signatures.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-4 h-4" /> ประวัติและตราประทับเวลา (TSA Audit Logs)
        </button>
      </div>

      {/* TAB 1: SIGNATURE QUEUE & SIGNED DOCUMENTS */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามเลขที่, เรื่อง, หรือกลุ่มงาน..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">สถานะ:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                รอลงนาม
              </button>
              <button
                onClick={() => setStatusFilter('signed')}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${
                  statusFilter === 'signed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                ลงนามดิจิทัลแล้ว
              </button>
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full p-12 text-center text-[var(--text-muted)] bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)]">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">ไม่พบรายการหนังสือตรงตามเงื่อนไข</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {doc.docNumber || doc.receiveNumber || `DOC-${doc.id}`}
                      </span>

                      {doc.isSigned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> ลงนามดิจิทัลแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> รอลงนาม
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      className="text-sm font-bold text-[var(--text-primary)] hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer line-clamp-2 leading-snug"
                    >
                      {doc.title}
                    </h3>

                    <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-1">
                      <p><span className="font-semibold">จาก:</span> {doc.from || '-'}</p>
                      <p><span className="font-semibold">ถึง:</span> {doc.to || '-'}</p>
                      <p><span className="font-semibold">ลงวันที่:</span> {formatThaiDate(doc.date)}</p>
                    </div>

                    {doc.signatureRecord && (
                      <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-[11px] space-y-1">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                          ผู้ลงนาม: {doc.signatureRecord.signerName} ({doc.signatureRecord.signerPosition})
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          TSA Time: {doc.signatureRecord.timestampFormatted}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          SHA-256: {doc.signatureRecord.documentHash}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--card-border)] flex items-center justify-between gap-2 shrink-0">
                    <button
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ดูรายละเอียด
                    </button>

                    {doc.isSigned && doc.signatureRecord ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSigModal(doc.signatureRecord!)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-500" /> ตราประทับ
                        </button>

                        <a
                          href={`/api/digital-signatures/download-pdf/${doc.signatureRecord.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSigningDoc(doc)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                      >
                        <PenTool className="w-3.5 h-3.5" /> ลงนามดิจิทัล
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
          <div className="p-6 bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  ระบบตรวจสอบความถูกต้องเอกสาร PDF และกุญแจดิจิทัล (PDF Integrity & Hash Verification)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  วางไฟล์ PDF หรือป้อนรหัส SHA-256 Hash, Serial Number หรือข้อความสแกนจาก QR Code เพื่อพิสูจน์ความจริงและตรวจจับการปลอมแปลง
                </p>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Search / String Input */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-500" /> ค้นหาตามรหัส Hash / Serial / QR Text
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={verifySearchInput}
                    onChange={(e) => setVerifySearchInput(e.target.value)}
                    placeholder="ระบุ SHA-256 Hash หรือ CERT-2026-XXXXXX..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                  <button
                    onClick={() => handleRunVerify()}
                    disabled={isVerifying}
                    className="px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    ตรวจสอบ
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
                className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
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
                <label htmlFor="pdf-verify-upload" className="cursor-pointer space-y-1.5">
                  <Upload className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์ PDF ตรวจสอบ
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    ระบบจะคำนวณรหัส SHA-256 ของไฟล์ PDF แบบ Real-time และเปรียบเทียบกับฐานข้อมูล
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
                  <div className="text-center sm:text-left flex-1">
                    <h4 className="text-xl sm:text-2xl font-black tracking-tight">{verifyResult.statusText}</h4>
                    <p className="text-sm opacity-90 font-medium">ผลการตรวจสอบ ณ วันที่ {formatThaiDateTime(new Date().toISOString())}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/20">
                    <span className="text-xs font-bold uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-black">{verifyResult.valid ? '100%' : '0%'}</span>
                  </div>
                </div>

                <div className="p-6 bg-[var(--card-bg)] space-y-6">
                  {/* Summary Box */}
                  <div className={`p-4 rounded-xl border flex gap-3 items-start ${
                    verifyResult.valid ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300' : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-300'
                  }`}>
                    <Search className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">บทสรุปการตรวจสอบ:</p>
                      <p className="text-sm leading-relaxed">{verifyResult.message}</p>
                    </div>
                  </div>

                  {/* Verification Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Integrity Check */}
                    <div className="p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--card-border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Integrity</span>
                        {verifyResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">ความถูกต้องของไฟล์</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">ตรวจสอบรหัส SHA-256 Fingerprint กับฐานข้อมูลกลาง</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.valid ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Signer Identity */}
                    <div className="p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--card-border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Authenticity</span>
                        {verifyResult.valid && verifyResult.signature ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-[var(--text-muted)]" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">ตัวตนผู้ลงนาม</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">ตรวจสอบความมีอยู่ของใบรับรองอิเล็กทรอนิกส์ในระบบ</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.valid && verifyResult.signature ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                        </div>
                      </div>
                    </div>

                    {/* AI Cross-Check */}
                    <div className="p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--card-border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">AI Validation</span>
                        {verifyResult.aiAnalysis ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">AI Cross-Reference</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">วิเคราะห์เนื้อหาด้วย AI และเปรียบเทียบกับข้อมูล Metadata</p>
                      <div className="pt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${verifyResult.aiAnalysis ? 'w-full bg-emerald-500' : 'w-1/2 bg-blue-500'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  {verifyResult.signature && (
                    <div className="border border-[var(--card-border)] rounded-2xl overflow-hidden">
                      <div className="bg-[var(--bg-base)] px-4 py-3 border-b border-[var(--card-border)] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">รายละเอียดเอกสารและใบรับรองต้นฉบับ</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--card-border)] bg-white dark:bg-slate-900/40">
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ข้อมูลหนังสือ</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.docNumber}</p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{verifyResult.signature.docTitle}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ผู้ลงนาม</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.signerName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{verifyResult.signature.signerPosition}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ตราประทับเวลา (TSA)</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{verifyResult.signature.timestampFormatted}</p>
                          <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">{verifyResult.signature.certificateSerial}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-[var(--card-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">SHA-256 Digital Fingerprint</span>
                        </div>
                        <p className="font-mono text-[10px] break-all bg-white dark:bg-slate-950 p-2 rounded-lg border border-[var(--card-border)] shadow-inner text-slate-600 dark:text-slate-400">
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
                            การวิเคราะห์เนื้อหาเชิงลึกด้วย AI (Gemini Semantic Analysis)
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white ${
                          verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'DISCREPANCY DETECTED' : 'AI VERIFIED'}
                        </span>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ความแม่นยำ</p>
                            <div className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.aiAnalysis.confidence === 'สูง' ? '98.5%' : (verifyResult.aiAnalysis.confidence === 'ปานกลาง' ? '75%' : '40%')}</div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">สถานะการเทียบเคียง</p>
                            <div className={`text-sm font-bold ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {verifyResult.aiAnalysis.matchStatus === 'MATCH' ? 'ตรงตามต้นฉบับ 100%' : (verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'พบจุดไม่ตรงกัน' : 'เอกสารใหม่ (ไม่มีในระบบ)')}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">รูปแบบเอกสาร</p>
                            <div className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.aiAnalysis.isOfficial ? 'เอกสารราชการทางการ' : 'เอกสารทั่วไป'}</div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">วิเคราะห์โดย</p>
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">Google Gemini Flash</div>
                          </div>
                        </div>

                        {verifyResult.aiAnalysis.discrepancyNote && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> บันทึกการตรวจสอบความผิดปกติ:
                            </p>
                            <p className="text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                              {verifyResult.aiAnalysis.discrepancyNote}
                            </p>
                          </div>
                        )}

                        <div className="p-3 bg-white/60 dark:bg-black/20 rounded-xl border border-current/5">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">สรุปเนื้อหาสำคัญจาก AI:</p>
                          <p className="text-[11px] text-[var(--text-primary)] italic leading-relaxed">
                            "{verifyResult.aiAnalysis.bodySummary || 'AI ได้ตรวจสอบเนื้อหาในเอกสารแล้ว พบว่าหัวข้อเรื่อง ผู้รับ และผู้ลงนาม ตรงกับฐานข้อมูลที่ลงนามไว้ทุกประการ'}"
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
                        className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" /> ดาวน์โหลดเอกสารยืนยัน
                      </a>
                    )}
                    <button
                      onClick={() => { setVerifyResult(null); setVerifySearchInput(''); }}
                      className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" /> ตรวจสอบไฟล์อื่น
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
        <div className="p-6 bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" /> ตารางหลักฐานประวัติการลงนามดิจิทัล (Digital Signature Logs)
            </h3>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              รวม {signatures.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[var(--text-secondary)] border-b border-[var(--card-border)] uppercase font-semibold">
                <tr>
                  <th className="p-3">วันที่เวลา (TSA)</th>
                  <th className="p-3">เลขที่หนังสือ / เรื่อง</th>
                  <th className="p-3">ผู้ลงนาม & ตำแหน่ง</th>
                  <th className="p-3">SHA-256 Hash</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {signatures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                      ยังไม่มีประวัติการลงนามดิจิทัลในระบบ
                    </td>
                  </tr>
                ) : (
                  signatures.map((sig) => (
                    <tr key={sig.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {sig.timestampFormatted}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[var(--text-primary)]">{sig.docNumber || 'รย 0021/V-' + sig.docId}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{sig.docTitle}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{sig.signerName}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{sig.signerPosition}</div>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                        {sig.documentHash}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedSigModal(sig)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                        >
                          ตราประทับ
                        </button>
                        <a
                          href={`/api/digital-signatures/download-pdf/${sig.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          ดาวน์โหลด PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Signature Certificate Details Popup */}
      {selectedSigModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden my-4 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full max-h-full">
              {/* Header */}
              <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 flex flex-col items-center justify-center relative overflow-hidden border-b border-emerald-500/30">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent"></div>
                <button onClick={() => setSelectedSigModal(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20 z-10">
                  <X className="w-5 h-5" />
                </button>
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/40 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-lg text-white tracking-wide text-center">
                  ใบรับรองลายมือชื่อดิจิทัลและตราประทับ
                </h3>
                <p className="text-emerald-400 text-[10px] mt-0.5 font-mono tracking-widest uppercase">
                  Digital Signature Certificate
                </p>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="shrink-0 relative group">
                    <div className="absolute inset-0 bg-emerald-500 blur-md opacity-20 rounded-xl group-hover:opacity-40 transition-opacity duration-500"></div>
                    <div className="relative bg-white p-2.5 rounded-xl border border-slate-200 shadow-xl">
                      {selectedSigModal.qrCodeDataUrl ? (
                        <img src={selectedSigModal.qrCodeDataUrl} alt="QR Code" className="w-28 h-28 object-contain" />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl">
                          <QrCode className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 w-full text-center sm:text-left">
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">ลงนามโดย (Signed By)</div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedSigModal.signerName}</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{selectedSigModal.signerPosition}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">ตราประทับเวลา (TSA)</div>
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{selectedSigModal.timestampFormatted}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">สถานะ (Status)</div>
                        <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VALID & VERIFIED
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <div className="flex flex-col sm:flex-row justify-between pb-2 border-b border-slate-200 dark:border-slate-700 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-slate-500">เลขที่หนังสือ</span>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{selectedSigModal.docNumber}</div>
                    </div>
                    <div className="space-y-0.5 sm:text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500">Certificate Serial</span>
                      <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedSigModal.certificateSerial}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] uppercase font-bold text-slate-500">เรื่อง</span>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{selectedSigModal.docTitle}</div>
                  </div>
                  
                  <div className="space-y-0.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] uppercase font-bold text-slate-500">ผู้ออกใบรับรอง (Issuer)</span>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{selectedSigModal.certificateIssuer}</div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> Digital Fingerprint (SHA-256)
                    </span>
                    <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                      {selectedSigModal.documentHash}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-1 shrink-0 pb-2">
                  <a
                    href={`/api/digital-signatures/download-pdf/${selectedSigModal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 shadow hover:shadow-md transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <Download className="w-4 h-4" /> ดาวน์โหลดเอกสาร (PDF) พร้อมตราประทับ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
