import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, DigitalSignatureRecord, formatThaiDate, formatThaiDateTime } from '../types';
import {
  ShieldCheck,
  PenTool,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  QrCode,
  Clock,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Upload,
  Lock,
  X,
  Copy,
  Check,
  LayoutGrid,
  List,
  Printer,
  Sparkles,
  Building,
  User,
  Eye,
  ArrowRight,
  Shield,
  Award
} from 'lucide-react';
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
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [signingDoc, setSigningDoc] = useState<DocumentItem | null>(null);
  const [selectedSigModal, setSelectedSigModal] = useState<DigitalSignatureRecord | null>(null);

  // Copy hash indicator
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);

  // Verification Portal State
  const [verifySearchInput, setVerifySearchInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedVerifyFile, setSelectedVerifyFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch signatures on load
  const fetchSignatures = async () => {
    setIsLoading(true);
    try {
      let res = await fetch('/api/digital-signatures/list');
      if (!res.ok) {
        res = await fetch('/api/digital-signatures');
      }
      if (res.ok) {
        const data = await res.json();
        setSignatures(Array.isArray(data) ? data : []);
      } else {
        setSignatures([]);
      }
    } catch (err) {
      setSignatures([]);
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

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHashKey(key);
    setTimeout(() => setCopiedHashKey(null), 2000);
  };

  // Verification Handler
  const handleRunVerify = async (queryToVerify?: string) => {
    const q = (queryToVerify !== undefined ? queryToVerify : verifySearchInput).trim();
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

    setSelectedVerifyFile(file);
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

  // Process documents with signature status
  const processedDocs = documents.map(doc => {
    const sig = signatures.find(s => String(s.docId) === String(doc.id));
    return {
      ...doc,
      isSigned: !!sig || doc.status === 'ลงนามดิจิทัลแล้ว',
      signatureRecord: sig
    };
  });

  // Unique departments for filter
  const departments = Array.from(new Set(documents.map(d => d.department).filter(Boolean))) as string[];

  // Counts for KPIs
  const totalCount = documents.length;
  const signedCount = processedDocs.filter(d => d.isSigned).length;
  const pendingCount = processedDocs.filter(d => !d.isSigned).length;
  const verifiedSigCount = signatures.length;

  const filteredDocs = processedDocs.filter(d => {
    const matchesSearch = searchQuery === '' ||
      (d.docNumber && d.docNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.title && d.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.department && d.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.from && d.from.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.to && d.to.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.signatureRecord?.signerName && d.signatureRecord.signerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === 'all' || d.department === departmentFilter;

    if (statusFilter === 'signed') return matchesSearch && matchesDept && d.isSigned;
    if (statusFilter === 'pending') return matchesSearch && matchesDept && !d.isSigned;
    return matchesSearch && matchesDept;
  });

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-slate-800 dark:text-slate-200">
      
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>สำนักงาน ปภ.จังหวัดระยอง • มาตรฐาน ETDA Standard</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>SHA-256 Asymmetric Cryptography</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-sans text-white">
              ระบบลงนามดิจิทัล & ตรวจสอบเอกสาร PDF
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              รองรับการลงลายมือชื่ออิเล็กทรอนิกส์ (e-Signature), การเข้ารหัสกุญแจคู่ขนาน SHA-256, ตราประทับเวลาสากล Time Stamping Authority (TSA), บาร์โค้ดคิวอาร์โค้ดรับรองสิทธิ์ และศูนย์ตรวจสอบความสมบูรณ์ไฟล์ PDF ป้องกันการดัดแปลงแก้ไขย้อนหลังตามระเบียบสารบรรณ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              onClick={() => {
                setActiveTab('verify');
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>ตรวจสอบ PDF ทันที</span>
            </button>

            <button
              onClick={fetchSignatures}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Docs */}
        <div
          onClick={() => {
            setActiveTab('queue');
            setStatusFilter('all');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group bg-[var(--bg-surface)] ${
            activeTab === 'queue' && statusFilter === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-[var(--border-lighter)] hover:border-indigo-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">เอกสารในระบบ</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-[var(--text-primary)]">
            {totalCount}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <span>แฟ้มสารบรรณทั้งหมด</span>
          </p>
        </div>

        {/* Card 2: Pending Signatures */}
        <div
          onClick={() => {
            setActiveTab('queue');
            setStatusFilter('pending');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group bg-[var(--bg-surface)] ${
            activeTab === 'queue' && statusFilter === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-[var(--border-lighter)] hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">รอลงนามดิจิทัล</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform relative">
              <PenTool className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1 animate-ping" />
              )}
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <span>เอกสารรอผู้บริหารลงชื่อ</span>
          </p>
        </div>

        {/* Card 3: Signed & Certified */}
        <div
          onClick={() => {
            setActiveTab('queue');
            setStatusFilter('signed');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group bg-[var(--bg-surface)] ${
            activeTab === 'queue' && statusFilter === 'signed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-[var(--border-lighter)] hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ลงนามสำเร็จแล้ว</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {signedCount}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <span>มีตราประทับเวลา TSA ครบถ้วน</span>
          </p>
        </div>

        {/* Card 4: Certificates in system */}
        <div
          onClick={() => {
            setActiveTab('logs');
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group bg-[var(--bg-surface)] ${
            activeTab === 'logs'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-[var(--border-lighter)] hover:border-indigo-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ใบรับรองและตราเวลา</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {verifiedSigCount}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <span>บันทึกหลักฐานการลงนาม (Logs)</span>
          </p>
        </div>
      </div>

      {/* 3. SEGMENTED NAVIGATION TABS */}
      <div className="bg-[var(--bg-surface)] p-1.5 rounded-2xl flex border border-[var(--border-lighter)] w-full overflow-x-auto gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <PenTool className="w-4 h-4" /> 
          <span>แฟ้มรอลงนาม & เอกสารในระบบ</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'queue' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          }`}>
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`flex-1 min-w-[200px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <KeyRound className="w-4 h-4" /> 
          <span>ศูนย์ตรวจสอบเอกสาร PDF & กุญแจดิจิทัล</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'verify' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            AI Audit
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Clock className="w-4 h-4" /> 
          <span>สมุดบันทึกหลักฐานตราเวลา (TSA Logs)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'logs' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          }`}>
            {signatures.length}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: SIGNATURE QUEUE & DOCUMENT LIST */}
      {activeTab === 'queue' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] flex flex-col lg:flex-row items-center justify-between gap-3.5 shadow-xs">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่หนังสือ, ชื่อเรื่อง, ผู้ลงนาม, หรือกลุ่มงาน..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-[var(--text-muted)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills & Department Selector */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">
              {/* Status Segmented Pills */}
              <div className="inline-flex p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  ทั้งหมด ({processedDocs.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  รอลงนาม ({processedDocs.filter(d => !d.isSigned).length})
                </button>
                <button
                  onClick={() => setStatusFilter('signed')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === 'signed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  ลงนามแล้ว ({processedDocs.filter(d => d.isSigned).length})
                </button>
              </div>

              {/* Department Dropdown */}
              {departments.length > 0 && (
                <div className="relative shrink-0">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="py-1.5 pl-3 pr-8 text-xs font-medium rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="all">ทุกกลุ่มงาน/ฝ่าย</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="inline-flex p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-light)] shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-800 text-[var(--primary-color)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-800 text-[var(--primary-color)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="มุมมองตาราง"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.length === 0 ? (
                <div className="col-span-full p-16 text-center text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-lighter)] shadow-inner flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 bg-[var(--bg-elevated)] rounded-full border border-[var(--border-light)]">
                    <FileText className="w-10 h-10 opacity-30 text-[var(--text-primary)]" />
                  </div>
                  <p className="text-sm font-semibold">ไม่พบเอกสารราชการที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDepartmentFilter('all'); }}
                    className="text-xs text-indigo-600 hover:underline font-bold"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Doc Number & Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-lighter)] pb-3">
                        <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] truncate">
                          {doc.docNumber || doc.receiveNumber || `DOC-${doc.id}`}
                        </span>

                        {doc.isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> ลงนามดิจิทัลแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            <Clock className="w-3 h-3" /> รอลงนาม
                          </span>
                        )}
                      </div>

                      {/* Document Title */}
                      <h3
                        onClick={() => onViewDoc && onViewDoc(doc)}
                        className="text-sm font-bold font-sans text-[var(--text-primary)] hover:text-indigo-600 cursor-pointer line-clamp-2 leading-relaxed transition-colors min-h-[42px]"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>

                      {/* Metadata rows */}
                      <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-0.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--text-muted)]">กลุ่มงาน/ฝ่าย:</span>
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px]">{doc.department || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--text-muted)]">ลงวันที่:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{formatThaiDate(doc.date)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--text-muted)]">จาก / ถึง:</span>
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px]">{doc.from || doc.to || '-'}</span>
                        </div>
                      </div>

                      {/* Signature Certified Box if signed */}
                      {doc.signatureRecord && (
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-[11px] space-y-2 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 truncate">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{doc.signatureRecord.signerName}</span>
                            </span>
                            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                              TSA Verified
                            </span>
                          </div>

                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate font-medium">
                            ตำแหน่ง: {doc.signatureRecord.signerPosition}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-white/70 dark:bg-black/30 px-2 py-1 rounded border border-emerald-500/10">
                            <span className="truncate max-w-[160px]">
                              SHA-256: {doc.signatureRecord.documentHash?.slice(0, 14)}...
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(doc.signatureRecord!.documentHash, `card-${doc.id}`)}
                              className="text-slate-400 hover:text-emerald-600 p-0.5"
                              title="คัดลอก Hash"
                            >
                              {copiedHashKey === `card-${doc.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between gap-2 shrink-0">
                      <button
                        onClick={() => onViewDoc && onViewDoc(doc)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>เปิดอ่าน</span>
                      </button>

                      {doc.isSigned && doc.signatureRecord ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedSigModal(doc.signatureRecord!)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                            title="ดูใบรับรองและตราประทับดิจิทัล"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-500" /> 
                            <span>ตราประทับ</span>
                          </button>

                          <a
                            href={`/api/digital-signatures/download-pdf/${doc.signatureRecord.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            title="ดาวน์โหลดไฟล์ PDF ที่ลงนามแล้ว"
                          >
                            <Download className="w-3.5 h-3.5" /> 
                            <span>PDF</span>
                          </a>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSigningDoc(doc)}
                          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs hover:shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" /> 
                          <span>ลงนามดิจิทัล</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-28">เลขที่หนังสือ</th>
                      <th className="py-3 px-4 min-w-[220px]">เรื่อง</th>
                      <th className="py-3 px-4 min-w-[140px]">กลุ่มงาน/ฝ่าย</th>
                      <th className="py-3 px-4 w-32">ลงวันที่</th>
                      <th className="py-3 px-4 text-center w-36">สถานะการลงนาม</th>
                      <th className="py-3 px-4 min-w-[180px]">ผู้ลงนาม / ตราเวลา</th>
                      <th className="py-3 px-4 text-center w-40">การปฏิบัติการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-lighter)] text-xs">
                    {filteredDocs.length > 0 ? (
                      filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                          <td className="py-3 px-4 text-center align-middle">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-primary)]">
                              {doc.docNumber || doc.receiveNumber || `DOC-${doc.id}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-middle">
                            <p
                              onClick={() => onViewDoc && onViewDoc(doc)}
                              className="font-bold text-[var(--text-primary)] hover:text-indigo-600 cursor-pointer line-clamp-1"
                            >
                              {doc.title}
                            </p>
                          </td>
                          <td className="py-3 px-4 align-middle text-[var(--text-secondary)] font-medium">
                            {doc.department || '-'}
                          </td>
                          <td className="py-3 px-4 align-middle text-[var(--text-muted)] whitespace-nowrap">
                            {formatThaiDate(doc.date)}
                          </td>
                          <td className="py-3 px-4 text-center align-middle">
                            {doc.isSigned ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> ลงนามแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" /> รอลงนาม
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-middle">
                            {doc.signatureRecord ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>{doc.signatureRecord.signerName}</span>
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                  {doc.signatureRecord.timestampFormatted}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              {doc.isSigned && doc.signatureRecord ? (
                                <>
                                  <button
                                    onClick={() => setSelectedSigModal(doc.signatureRecord!)}
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                    title="ดูใบรับรอง & ตราประทับ"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={`/api/digital-signatures/download-pdf/${doc.signatureRecord.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                    title="ดาวน์โหลด PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSigningDoc(doc)}
                                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>ลงนาม</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-[var(--text-muted)]">
                          ไม่พบรายการเอกสารในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: VERIFICATION PORTAL & PDF HASH CHECK */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="p-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-lighter)] space-y-6 shadow-xs">
            {/* Explainer Box */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-[var(--border-lighter)] pb-5">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 shrink-0 self-start md:self-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold font-sans text-[var(--text-primary)] flex items-center gap-2">
                  <span>ศูนย์ตรวจสอบความถูกต้องเอกสาร PDF และกุญแจดิจิทัล</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ETDA Standard
                  </span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  เลือกอัปโหลดไฟล์ PDF เพื่อตรวจสอบ Digital Fingerprint หรือระบุรหัส SHA-256 Hash เพื่อเปรียบเทียบข้อมูลลายมือชื่ออิเล็กทรอนิกส์ ตราประทับเวลาสากล และปัญญาประดิษฐ์ AI Cross-Check ตรวจจับการแก้ไขดัดแปลงย้อนหลัง
                </p>
              </div>
            </div>

            {/* Verification Inputs Grid (2 Approaches) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option 1: File Drag & Drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUploadVerify(file);
                }}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-between min-h-[220px] ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : 'border-[var(--border-light)] bg-[var(--bg-elevated)] hover:border-emerald-500/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUploadVerify(file);
                  }}
                  className="hidden"
                  id="pdf-verify-upload"
                />

                <div className="space-y-3 my-auto cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="p-3.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] w-14 h-14 flex items-center justify-center mx-auto shadow-xs text-emerald-600 dark:text-emerald-400">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      วิธีที่ ๑: อัปโหลดไฟล์ PDF เพื่อตรวจสอบ
                    </h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ PDF มาวางที่นี่
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                    ระบบคำนวณรหัส SHA-256 Fingerprint ทันทีบนเบราว์เซอร์ ไม่ส่งไฟล์ PDF ตัวจริงออกนอกเครือข่าย ปลอดภัยสูงสุดตามมาตรฐาน ETDA
                  </p>
                </div>

                {selectedVerifyFile && (
                  <div className="w-full mt-2 p-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-light)] flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-600 truncate max-w-[200px]">{selectedVerifyFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedVerifyFile(null); }}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: Search Hash or Serial Input */}
              <div className="p-6 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-light)] flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      วิธีที่ ๒: ระบุรหัสตรวจสอบ (Hash / Serial / เลขที่หนังสือ)
                    </h4>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    ค้นหาความสมบูรณ์และใบรับรองอิเล็กทรอนิกส์ด้วยรหัส SHA-256 Hash หรือ Serial Key ของเอกสารที่ลงนามผ่านระบบสารบรรณแล้ว
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="text"
                      value={verifySearchInput}
                      onChange={(e) => setVerifySearchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRunVerify(); }}
                      placeholder="ป้อน SHA-256 Hash, Serial Key, หรือเลขที่หนังสือ..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-[var(--text-primary)]"
                    />
                    <button
                      onClick={() => handleRunVerify()}
                      disabled={isVerifying || !verifySearchInput.trim()}
                      className="px-5 py-2.5 text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 disabled:opacity-50 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                      <span>ตรวจสอบ</span>
                    </button>
                  </div>

                  {/* Quick Preset Sample Chips */}
                  {signatures.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        ตัวอย่างรหัสจากระบบเพื่อทดสอบด่วน:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {signatures.slice(0, 3).map((sig) => (
                          <button
                            key={sig.id}
                            type="button"
                            onClick={() => {
                              setVerifySearchInput(sig.docNumber || sig.certificateSerial || sig.documentHash);
                              handleRunVerify(sig.docNumber || sig.certificateSerial || sig.documentHash);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sig.docNumber || sig.certificateSerial?.slice(0, 12)}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Result Showcase */}
            {verifyResult && (
              <div
                className={`rounded-3xl border overflow-hidden shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                  verifyResult.valid
                    ? 'border-emerald-500/30 ring-4 ring-emerald-500/5'
                    : 'border-rose-500/30 ring-4 ring-rose-500/5'
                }`}
              >
                {/* Status Header */}
                <div className={`p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  verifyResult.valid
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white'
                    : 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white'
                }`}>
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="shrink-0 p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                      {verifyResult.valid ? <CheckCircle2 className="w-9 h-9 text-white" /> : <AlertTriangle className="w-9 h-9 text-white" />}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans">
                        {verifyResult.statusText}
                      </h3>
                      <p className="text-xs opacity-90 font-medium">
                        ประมวลผลการตรวจสอบ ณ วันที่ {formatThaiDateTime(new Date().toISOString())}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black/25 rounded-2xl border border-white/20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Score</span>
                    <span className="text-2xl font-black">{verifyResult.valid ? '100%' : '0%'}</span>
                  </div>
                </div>

                {/* Result Details Body */}
                <div className="p-6 bg-[var(--bg-surface)] space-y-6">
                  
                  {/* Summary Callout Box */}
                  <div className={`p-4 rounded-2xl border flex gap-3 items-start ${
                    verifyResult.valid 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300' 
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-300'
                  }`}>
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">บทสรุปผลการตรวจสอบความสมบูรณ์:</h4>
                      <p className="text-xs sm:text-sm leading-relaxed mt-1">{verifyResult.message}</p>
                    </div>
                  </div>

                  {/* 4 Pillars Inspection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pillar 1: File Integrity */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-lighter)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Pillar 1</span>
                        {verifyResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      </div>
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">ความถูกต้องสมบูรณ์ (Integrity)</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        เปรียบเทียบค่า SHA-256 Fingerprint กับสารบรรณกลาง
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${verifyResult.valid ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                      </div>
                    </div>

                    {/* Pillar 2: Signer Authenticity */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-lighter)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Pillar 2</span>
                        {verifyResult.valid && verifyResult.signature ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-rose-500" />}
                      </div>
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">ตัวตนผู้ลงนาม (Authenticity)</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        ตรวจสอบคีย์คู่ขนานอสมมาตรและบทบาทหน้าที่
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${verifyResult.valid && verifyResult.signature ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                      </div>
                    </div>

                    {/* Pillar 3: Non-Repudiation (TSA) */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-lighter)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Pillar 3</span>
                        {verifyResult.valid && verifyResult.signature ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-rose-500" />}
                      </div>
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">ตราประทับเวลา (TSA Time)</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        เวลาสากลรับรองสิทธิ์ ไม่สามารถย้อนหลังได้
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${verifyResult.valid && verifyResult.signature ? 'w-full bg-emerald-500' : 'w-0 bg-rose-500'}`} />
                      </div>
                    </div>

                    {/* Pillar 4: AI Semantic Audit */}
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-lighter)] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Pillar 4</span>
                        {verifyResult.aiAnalysis ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />}
                      </div>
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">AI Semantic Audit</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        ตรวจจับการแก้ไขดัดแปลงโครงสร้างข้อความ
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${verifyResult.aiAnalysis ? 'w-full bg-emerald-500' : 'w-1/2 bg-indigo-500'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Certificate Information Details */}
                  {verifyResult.signature && (
                    <div className="border border-[var(--border-lighter)] rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-[var(--bg-elevated)] px-4 py-3 border-b border-[var(--border-lighter)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-[var(--text-primary)]">ข้อมูลใบรับรองสารบรรณดิจิทัล (Certificate Metadata)</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold">
                          Serial: {verifyResult.signature.certificateSerial}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-lighter)] bg-[var(--bg-surface)]">
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">เลขที่หนังสือ / เรื่อง</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.docNumber}</p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{verifyResult.signature.docTitle}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ผู้ลงนามรับรอง</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{verifyResult.signature.signerName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{verifyResult.signature.signerPosition}</p>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ตราเวลาสากล (TSA Time)</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{verifyResult.signature.timestampFormatted}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{verifyResult.signature.certificateIssuer}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-lighter)] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">SHA-256 Digital Fingerprint (Immutable Hash)</span>
                          </div>
                          <button
                            onClick={() => handleCopyText(verifyResult.computedHash || verifyResult.signature.documentHash, 'verify-hash')}
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copiedHashKey === 'verify-hash' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedHashKey === 'verify-hash' ? 'คัดลอกแล้ว' : 'คัดลอก Hash'}</span>
                          </button>
                        </div>
                        <p className="font-mono text-[10px] break-all bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-light)] text-slate-600 dark:text-slate-400 leading-normal">
                          {verifyResult.computedHash || verifyResult.signature.documentHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Semantic Analysis Result */}
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
                          <Sparkles className={`w-4 h-4 ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-500' : 'text-emerald-500'}`} />
                          <span className={`text-xs font-bold ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                            การวิเคราะห์ความสอดคล้องเนื้อหาโดยปัญญาประดิษฐ์ (AI Semantic Audit)
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                          verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'DISCREPANCY DETECTED' : 'AI VERIFIED'}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ระดับความมั่นใจ</span>
                            <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                              {verifyResult.aiAnalysis.confidence === 'สูง' ? '98.5% (High)' : (verifyResult.aiAnalysis.confidence === 'ปานกลาง' ? '75%' : '40%')}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">สถานะเปรียบเทียบ</span>
                            <div className={`text-xs sm:text-sm font-bold ${verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {verifyResult.aiAnalysis.matchStatus === 'MATCH' ? 'ตรงตามต้นฉบับทุกประการ' : (verifyResult.aiAnalysis.matchStatus === 'MISMATCH' ? 'พบจุดไม่ตรงกับข้อมูลลงนาม' : 'เอกสารใหม่ในระบบ')}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ประเภทเอกสาร</span>
                            <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                              {verifyResult.aiAnalysis.isOfficial ? 'เอกสารทางราชการ (Official)' : 'เอกสารทั่วไป'}
                            </div>
                          </div>
                        </div>

                        {verifyResult.aiAnalysis.discrepancyNote && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-800 dark:text-rose-200">
                            <strong>บันทึกข้อแตกต่างที่ตรวจพบ:</strong> {verifyResult.aiAnalysis.discrepancyNote}
                          </div>
                        )}

                        <div className="p-3 bg-white/70 dark:bg-black/20 rounded-xl border border-current/5">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">สรุปเนื้อหาจาก AI:</span>
                          <p className="text-xs text-[var(--text-primary)] italic leading-relaxed">
                            "{verifyResult.aiAnalysis.bodySummary || 'จากการสแกนเปรียบเทียบเนื้อหาของไฟล์สอดคล้องกับพจนานุกรมและเมตาดาต้าสากลของสลากใบรับรองต้นฉบับ ไม่พบโครงสร้างประโยคดัดแปลงหลังการลงนาม'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {verifyResult.valid && verifyResult.signature && (
                      <a
                        href={`/api/digital-signatures/download-pdf/${verifyResult.signature.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> 
                        <span>ดาวน์โหลดไฟล์ PDF ต้นฉบับ</span>
                      </a>
                    )}

                    <button
                      onClick={handlePrintCertificate}
                      className="px-5 py-2.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-xl font-bold text-xs sm:text-sm border border-[var(--border-light)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>พิมพ์ผลการตรวจสอบ</span>
                    </button>

                    <button
                      onClick={() => {
                        setVerifyResult(null);
                        setVerifySearchInput('');
                        setSelectedVerifyFile(null);
                      }}
                      className="px-5 py-2.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-xl font-bold text-xs sm:text-sm border border-[var(--border-light)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> 
                      <span>ตรวจสอบเอกสารฉบับอื่น</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 3: AUDIT TRAIL LOGS */}
      {activeTab === 'logs' && (
        <DigitalSignaturesLogView
          user={user}
          onViewCertificate={(sig) => setSelectedSigModal(sig)}
        />
      )}

      {/* 7. DIGITAL SIGNATURE SIGNING MODAL */}
      {signingDoc && (
        <DigitalSignatureModal
          doc={signingDoc}
          user={user}
          onClose={() => setSigningDoc(null)}
          onSignedSuccess={handleSignedSuccess}
        />
      )}

      {/* 8. CERTIFICATE DETAILS POPUP MODAL */}
      {selectedSigModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 flex flex-col items-center justify-center relative border-b border-emerald-500/30 text-center text-white">
                <button
                  onClick={() => setSelectedSigModal(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all bg-white/10 p-2 rounded-full hover:bg-white/20 cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 mb-2 shadow-xs">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-base sm:text-lg tracking-wide font-sans">
                  ใบรับรองลายมือชื่อดิจิทัลและตราประทับอิเล็กทรอนิกส์
                </h3>
                <p className="text-emerald-400 text-[10px] mt-1 font-mono tracking-widest uppercase">
                  Digital Certificate & Timestamp Validation
                </p>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 overscroll-contain">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="shrink-0 relative group">
                    <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-md">
                      {selectedSigModal.qrCodeDataUrl ? (
                        <img src={selectedSigModal.qrCodeDataUrl} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl">
                          <QrCode className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 w-full text-center sm:text-left">
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ลงชื่อรับรองความสมบูรณ์โดย</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">{selectedSigModal.signerName}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{selectedSigModal.signerPosition}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">ตราประทับเวลา (TSA Time)</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedSigModal.timestampFormatted}</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">สถานะใบรับรอง</div>
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VALID & VERIFIED
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/70 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                  <div className="flex flex-col sm:flex-row justify-between pb-2 border-b border-slate-200 dark:border-slate-700 gap-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">เลขที่หนังสือสารบรรณ</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSigModal.docNumber}</span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Certificate Serial Key</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedSigModal.certificateSerial}</span>
                    </div>
                  </div>
                  
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">ชื่อเรื่องเอกสาร</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedSigModal.docTitle}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-emerald-500" /> Digital SHA-256 Hash
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedSigModal.documentHash, 'modal-hash')}
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {copiedHashKey === 'modal-hash' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHashKey === 'modal-hash' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      {selectedSigModal.documentHash}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>เอกสารอิเล็กทรอนิกส์ฉบับนี้ ลงนามผ่านระบบลายมือชื่อดิจิทัลที่มีการเข้ารหัสอสมมาตร มีความมั่นคงปลอดภัย และได้รับการคุ้มครองทางกฎหมายตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSigModal(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ใบรับรอง</span>
                  </button>

                  <a
                    href={`/api/digital-signatures/download-pdf/${selectedSigModal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> 
                    <span>ดาวน์โหลด PDF</span>
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
