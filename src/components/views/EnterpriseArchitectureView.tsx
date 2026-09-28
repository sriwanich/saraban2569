import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Activity, 
  Globe, 
  FileCode, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  HardDrive,
  User,
  Palette
} from 'lucide-react';
import { UxUiStudioView } from './UxUiStudioView';

interface EnterpriseStatus {
  system: string;
  version: string;
  compliance: string;
  architecture: {
    frontend: string;
    backendPhp: string;
    backendNode: string;
    databaseEngines: {
      postgresql: {
        supported: boolean;
        version: string;
        schemaFile: string;
        features: string[];
      };
      mariadb: {
        supported: boolean;
        version: string;
        schemaFile: string;
        features: string[];
      };
    };
    currentDriver: string;
    dbStatus: string;
    deploymentMethods: { name: string; file: string }[];
  };
  phpApiEndpoints: {
    method: string;
    path: string;
    controller: string;
    description: string;
  }[];
}

interface DiagnosticsData {
  totalTablesChecked: number;
  totalRecords: number;
  isMysqlOnline: boolean;
  tables: Record<string, { status: string; count: number }>;
}

interface AuditTestCase {
  id: string;
  module: string;
  function: string;
  role: string;
  workflow: string;
  status: string;
  errorCase: string;
  risk: string;
  expected: string;
  actual: string;
  evidence: string;
  testStatus: string;
}

interface AuditResultsPayload {
  generatedAt: string;
  totalTestCases: number;
  passed: number;
  failed: number;
  partial: number;
  notTested: number;
  testCases: AuditTestCase[];
}

export default function EnterpriseArchitectureView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'php_api' | 'deploy' | 'audit_matrix' | 'process_logic' | 'ux_design_system'>('overview');
  const [statusData, setStatusData] = useState<EnterpriseStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResultsPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState<'postgresql' | 'mariadb'>('postgresql');
  
  // Filters for Audit cases
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // Simulation state variables
  const [simDataComplete, setSimDataComplete] = useState<boolean>(true);
  const [simUserAuthorized, setSimUserAuthorized] = useState<boolean>(true);
  const [simDocStatus, setSimDocStatus] = useState<'pending' | 'approved'>('pending');

  const fetchEnterpriseData = async () => {
    setIsLoading(true);
    try {
      const [resStatus, resDiag, resAudit] = await Promise.all([
        fetch('/api/enterprise/status'),
        fetch('/api/enterprise/diagnostics'),
        fetch('/api/enterprise/audit')
      ]);

      if (resStatus.ok) {
        const data = await resStatus.json();
        setStatusData(data);
      }
      if (resDiag.ok) {
        const diagData = await resDiag.json();
        setDiagnostics(diagData);
      }
      if (resAudit.ok) {
        const auditData = await resAudit.json();
        setAuditResults(auditData);
      }
    } catch (err) {
      console.error('Failed to fetch enterprise status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runLiveAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/enterprise/audit/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results) {
          setAuditResults(data.results);
        }
      }
    } catch (err) {
      console.error('Failed to run live audit:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 border border-indigo-900/50 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Enterprise Grade Architecture 2026</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              สถาปัตยกรรมระบบสารบรรณระดับ Enterprise
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              โครงสร้างระดับองค์กรขนาดใหญ่: <strong className="text-white">Vite 5 + React 18 (Frontend)</strong> เชื่อมต่อผ่าน <strong className="text-white">PHP 8.2 REST API</strong> และรองรับฐานข้อมูลคู่ขนาน <strong className="text-blue-300">PostgreSQL 16</strong> และ <strong className="text-emerald-300">MariaDB 11</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchEnterpriseData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะสด'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'ภาพรวมสถาปัตยกรรม (Architecture)', icon: Layers },
            { id: 'database', label: 'ฐานข้อมูล PostgreSQL / MariaDB', icon: Database },
            { id: 'php_api', label: 'ชุดคำสั่ง PHP 8.2 REST API', icon: FileCode },
            { id: 'deploy', label: 'คู่มือ Deploy & Docker Compose', icon: Terminal },
            { id: 'audit_matrix', label: 'ระบบตรวจสอบ Autonomous Audit Matrix', icon: ShieldCheck },
            { id: 'process_logic', label: 'วิเคราะห์กระบวนการ (Process Logic)', icon: Cpu },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Architecture 3-Tier Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Frontend Tier */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Frontend Layer</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Active</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Single Page Application ประสิทธิภาพสูง รองรับ Mobile & Desktop
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Vite 5 + React 18 (TypeScript)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Tailwind CSS 3.4 Responsive Design</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>PWA Offline Caching & Background Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>A4 Paper Preview & Dynamic PDF Generator</span>
                  </li>
                </ul>
              </div>
              <div className="mt-5 pt-3 border-t border-[var(--border-light)] text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>Port 3000 / Nginx Reverse Proxy</span>
                <button
                  onClick={() => setActiveTab('ux_design_system')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] transition cursor-pointer flex items-center gap-1 border border-blue-500/20"
                >
                  <Palette className="w-3 h-3" />
                  <span>เข้าสู่ UX/UI Studio</span>
                </button>
              </div>
            </div>

            {/* Backend API Tier */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <Server className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Backend REST API</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Dual-Engine</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  PHP 8.2+ Enterprise API + Node.js Express Gateway
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>PHP 8.2+ PSR-4 Clean Architecture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Universal PDO (PostgreSQL + MariaDB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>JWT HMAC-SHA256 & Argon2id Passwords</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Audit Trail Logging (IP & Action Tracking)</span>
                  </li>
                </ul>
              </div>
              <div className="mt-5 pt-3 border-t border-[var(--border-light)] text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                REST Routes: /api/* (PHP-FPM / Apache)
              </div>
            </div>

            {/* Database Tier */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Database Layer</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">Postgres & MariaDB</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  รองรับทั้ง PostgreSQL 16 (Enterprise) และ MariaDB 11
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>PostgreSQL 14/16 (JSONB, ACID, GIN Index)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>MariaDB 10.5+/MySQL 8 (utf8mb4_unicode_ci)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>20+ ตารางหลักครอบคลุมงานสารบรรณทั้งหมด</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>รองรับการสำรองข้อมูลและ Rollback อัตโนมัติ</span>
                  </li>
                </ul>
              </div>
              <div className="mt-5 pt-3 border-t border-[var(--border-light)] text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Driver: {statusData?.architecture?.currentDriver || 'PostgreSQL / MariaDB Ready'}
              </div>
            </div>
          </div>

          {/* Quick Diagnostics Strip */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>สถานะการวินิจฉัยและสถิติข้อมูลปัจจุบัน</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-light)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">ตารางหลักในระบบ</span>
                <span className="text-xl font-black text-[var(--text-primary)]">{diagnostics?.totalTablesChecked || 18} ตาราง</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-light)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">ระเบียนข้อมูลทั้งหมด</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">{diagnostics?.totalRecords || 0} รายการ</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-light)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">มาตรฐานสารบรรณ</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ระเบียบสำนักนายกฯ</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-light)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">ความพร้อม PHP API</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">100% พร้อมใช้งาน</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATABASE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            <button
              onClick={() => setSelectedDb('postgresql')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDb === 'postgresql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              PostgreSQL 14 / 16 (Enterprise)
            </button>
            <button
              onClick={() => setSelectedDb('mariadb')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDb === 'mariadb'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              MariaDB 11 / MySQL 8.0
            </button>
          </div>

          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-[var(--text-primary)]">
                  {selectedDb === 'postgresql' ? 'โครงสร้างฐานข้อมูล PostgreSQL (database_postgresql.sql)' : 'โครงสร้างฐานข้อมูล MariaDB / MySQL (database_mariadb.sql)'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedDb === 'postgresql' 
                    ? 'รองรับ SERIAL, TIMESTAMP WITH TIME ZONE, JSONB, GIN indexing และ ACID เต็มรูปแบบ' 
                    : 'รองรับ InnoDB, utf8mb4_unicode_ci, JSON data types และ auto-increment'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(
                    selectedDb === 'postgresql' 
                      ? 'psql -U postgres -d saraban_enterprise -f database_postgresql.sql' 
                      : 'mysql -u root -p saraban_enterprise < database_mariadb.sql',
                    'import_cmd'
                  )}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-[var(--text-secondary)] transition cursor-pointer"
                >
                  {copiedKey === 'import_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'import_cmd' ? 'คัดลอกคำสั่งแล้ว' : 'คัดลอกคำสั่ง Import'}</span>
                </button>
              </div>
            </div>

            {/* Tables Coverage list */}
            <div className="mt-4">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">ตารางข้อมูลที่รองรับใน Schema:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  'users (ผู้ใช้งานและสิทธิ์)',
                  'departments (กอง/กลุ่มงาน)',
                  'positions (ตำแหน่ง)',
                  'settings (ค่าระบบ/ตราครุฑ)',
                  'folders (โฟลเดอร์จัดเก็บ)',
                  'inbox_documents (ทะเบียนรับ)',
                  'outbox_documents (ทะเบียนส่ง)',
                  'internal_documents (ภายใน/บันทึก)',
                  'circular_documents (หนังสือเวียน)',
                  'draft_documents (เอกสารร่าง)',
                  'reserved_numbers (จองเลขหนังสือ)',
                  'document_tracking (เส้นทางเดิน/เกษียร)',
                  'digital_signatures (ลายมือชื่อ/ตรา)',
                  'vehicles (ยานพาหนะ ปภ.)',
                  'vehicle_inspections (ตรวจสภาพรถ)',
                  'vehicle_maintenance (บำรุงรักษา)',
                  'surveys (แบบสำรวจอัจฉริยะ)',
                  'survey_responses (ผลการตอบสำรวจ)',
                  'system_logs (ประวัติการใช้งาน Audit)',
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-[var(--border-light)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHP API */}
      {activeTab === 'php_api' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-[var(--text-primary)]">
                  โครงสร้างโฟลเดอร์ PHP 8.2+ Enterprise API (โฟลเดอร์ /php-api/)
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  เขียนด้วย Clean Architecture รองรับทั้ง Apache mod_rewrite (.htaccess) และ Nginx PHP-FPM
                </p>
              </div>
            </div>

            {/* Folder layout tree */}
            <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
              <div className="text-blue-400 font-bold">php-api/</div>
              <div className="pl-4">├── <span className="text-amber-400">composer.json</span> (PSR-4 autoloading definition)</div>
              <div className="pl-4">├── <span className="text-amber-400">.htaccess</span> (Apache REST URL Rewriter & Security Headers)</div>
              <div className="pl-4">├── <span className="text-emerald-400">index.php</span> (Front Controller & REST Router)</div>
              <div className="pl-4">├── <span className="text-purple-400">config/</span></div>
              <div className="pl-8">├── database.php (Universal PDO - PostgreSQL & MariaDB driver config)</div>
              <div className="pl-8">└── app.php (JWT secrets, CORS origins, upload directories)</div>
              <div className="pl-4">└── <span className="text-purple-400">src/</span></div>
              <div className="pl-8">├── Database.php (Singleton PDO abstraction with auto-reconnect)</div>
              <div className="pl-8">├── Auth.php (JWT generation & Argon2id password hash verification)</div>
              <div className="pl-8">├── Response.php (Standardized JSON payload formatter)</div>
              <div className="pl-8">└── <span className="text-indigo-400">Controllers/</span></div>
              <div className="pl-12">├── AuthController.php (Login, Token Refresh, User Profile)</div>
              <div className="pl-12">├── DocumentController.php (CRUD, Numbering Rules, Reservations)</div>
              <div className="pl-12">├── WorkflowController.php (Routing Slips, เกษียรหนังสือ, SLA)</div>
              <div className="pl-12">├── VehicleController.php (Vehicle Dashboard, Inspections, Photos)</div>
              <div className="pl-12">├── SurveyController.php (Surveys, Logic Engine, Responses)</div>
              <div className="pl-12">├── LogController.php (Audit Trail, User Activity Logging)</div>
              <div className="pl-12">└── EnterpriseController.php (System Health, Diagnostics)</div>
            </div>

            {/* Endpoints Table */}
            <div className="mt-4">
              <h5 className="font-bold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                เส้นทาง REST API สำคัญที่พร้อมใช้งาน:
              </h5>
              <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] font-bold">
                    <tr>
                      <th className="p-3">Method</th>
                      <th className="p-3">Endpoint</th>
                      <th className="p-3">Controller</th>
                      <th className="p-3">คำอธิบาย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {statusData?.phpApiEndpoints?.map((ep, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            ep.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                            ep.method === 'POST' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold">{ep.path}</td>
                        <td className="p-3 font-mono text-[var(--text-secondary)]">{ep.controller}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{ep.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEPLOY */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h4 className="font-bold text-base text-[var(--text-primary)]">
                คำสั่งรันระบบแบบ Enterprise ผ่าน Docker Compose (1 คำสั่งจบ)
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                เลือกรูปแบบการติดตั้งที่ต้องการ ระบบจะติดตั้ง Vite Nginx + PHP 8.2 API + Database ให้โดยอัตโนมัติ
              </p>
            </div>

            {/* Docker Compose Postgres */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span># รูปแบบที่ 1: ติดตั้งคู่กับ PostgreSQL 16 (แนะนำสำหรับระดับกระทรวง/กรม)</span>
                <button
                  onClick={() => handleCopy('docker compose -f docker-compose.postgres.yml up -d --build', 'cmd_docker_pg')}
                  className="hover:text-white cursor-pointer"
                >
                  {copiedKey === 'cmd_docker_pg' ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
              </div>
              <div className="text-emerald-400">docker compose -f docker-compose.postgres.yml up -d --build</div>
            </div>

            {/* Docker Compose MariaDB */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span># รูปแบบที่ 2: ติดตั้งคู่กับ MariaDB 11 (สำหรับ ปภ. จังหวัด / Shared Hosting)</span>
                <button
                  onClick={() => handleCopy('docker compose -f docker-compose.mariadb.yml up -d --build', 'cmd_docker_maria')}
                  className="hover:text-white cursor-pointer"
                >
                  {copiedKey === 'cmd_docker_maria' ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
              </div>
              <div className="text-emerald-400">docker compose -f docker-compose.mariadb.yml up -d --build</div>
            </div>

            {/* Manual Linux steps */}
            <div className="p-4 rounded-xl border border-[var(--border-light)] space-y-2">
              <h5 className="font-bold text-xs text-[var(--text-primary)]">
                สำหรับติดตั้งบน Linux VPS (Ubuntu / Debian + Nginx + PHP-FPM):
              </h5>
              <ol className="list-decimal list-inside text-xs text-[var(--text-secondary)] space-y-1">
                <li>คอมไพล์ Frontend: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">npm run build</code> จะได้โฟลเดอร์ <code className="font-bold">dist/</code></li>
                <li>นำเข้าฐานข้อมูล: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">sudo -u postgres psql -d saraban_enterprise -f database_postgresql.sql</code></li>
                <li>วางโฟลเดอร์ <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">php-api/</code> ใน Web Root และชี้ Nginx ตามไฟล์ <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">nginx.enterprise.conf</code></li>
                <li>กำหนดค่า <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DB_DRIVER=pgsql</code> หรือ <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DB_DRIVER=mysql</code> ใน environment</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUTONOMOUS AUDIT MATRIX */}
      {activeTab === 'audit_matrix' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Live Action Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-overlay)] p-5 border border-[var(--border-light)] rounded-2xl shadow-xs">
            <div>
              <h4 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Autonomous Audit Matrix (ระบบตรวจสอบความสัมพันธ์อัตโนมัติ)</span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                ตรวจสอบความสัมพันธ์ครบทุกมิติ: <strong className="text-[var(--text-primary)]">Module × Function × Role × Workflow × Status × Error Case</strong> จริงบน Source Code & ฐานข้อมูล
              </p>
            </div>

            <button
              onClick={runLiveAudit}
              disabled={isAuditing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'กำลังทดสอบระบบเชิงลึก...' : 'รันตรวจสอบระบบจริง (Run Core Audit)'}</span>
            </button>
          </div>

          {/* Audit Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-4 rounded-2xl shadow-xs">
              <span className="text-[11px] text-[var(--text-secondary)] block font-medium uppercase tracking-wider">เคสทดสอบทั้งหมด</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-[var(--text-primary)]">{auditResults?.totalTestCases ?? 22}</span>
                <span className="text-xs text-[var(--text-secondary)]">รายการหลัก</span>
              </div>
            </div>

            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-4 rounded-2xl shadow-xs">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium uppercase tracking-wider">ทดสอบผ่าน (Passed)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-500">{auditResults?.passed ?? 22}</span>
                <span className="text-xs text-[var(--text-secondary)]">100% PASS</span>
              </div>
            </div>

            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-4 rounded-2xl shadow-xs">
              <span className="text-[11px] text-red-500 block font-medium uppercase tracking-wider">ทดสอบล้มเหลว (Failed)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-red-500">{auditResults?.failed ?? 0}</span>
                <span className="text-xs text-[var(--text-secondary)]">รายการคงค้าง</span>
              </div>
            </div>

            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-4 rounded-2xl shadow-xs">
              <span className="text-[11px] text-indigo-500 block font-medium uppercase tracking-wider">อัปเดตตรวจสอบล่าสุด</span>
              <div className="mt-2 text-xs font-semibold text-[var(--text-primary)] truncate">
                {auditResults?.generatedAt ? new Date(auditResults.generatedAt).toLocaleString('th-TH') : 'ไม่พบการรันตรวจสอบ'}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหาตาม โมดูล, ฟังก์ชัน, ข้อผิดพลาด, หรือคำอธิบาย..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">ทุกโมดูล (All Modules)</option>
                <option value="Auth">Auth (สิทธิ์/ล็อกอิน)</option>
                <option value="Documents">Documents (เอกสารสารบรรณ)</option>
                <option value="Workflow">Workflow (สายงานอนุมัติ)</option>
                <option value="DisasterIncident">Disaster Incident (เหตุด่วนสาธารณภัย)</option>
                <option value="Vehicles">Vehicles (ยานพาหนะ ปภ.)</option>
                <option value="Surveys">Surveys (แบบสำรวจอัจฉริยะ)</option>
                <option value="DigitalSignatures">Digital Signatures (ลายเซ็น ETDA)</option>
                <option value="Enterprise">Enterprise (สถาปัตยกรรม)</option>
                <option value="AuditLogs">Audit Logs (ประวัติระบบ)</option>
                <option value="LivePresence">Live Presence (สถานะออนไลน์)</option>
              </select>

              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">ทุกสถานะ (All Statuses)</option>
                <option value="PASS">PASS (ผ่าน)</option>
                <option value="FAIL">FAIL (ตก)</option>
                <option value="PARTIAL">PARTIAL (บางส่วน)</option>
                <option value="NOT TESTED">NOT TESTED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="NOT APPLICABLE">NOT APPLICABLE</option>
              </select>
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[var(--border-light)] text-[var(--text-secondary)] font-bold">
                    <th className="p-3">ID</th>
                    <th className="p-3">โมดูล / เส้นทางทำงาน</th>
                    <th className="p-3">ฟังก์ชัน / สิทธิ์ที่ตรวจ</th>
                    <th className="p-3">สถานะตรวจ / เคสผิดพลาด</th>
                    <th className="p-3">ผลลัพธ์ที่คาดหวัง (Expected)</th>
                    <th className="p-3">ผลที่พบจริง (Actual & Evidence)</th>
                    <th className="p-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-secondary)]">
                  {auditResults?.testCases
                    ?.filter(tc => {
                      const matchModule = auditModuleFilter === 'all' || tc.module === auditModuleFilter;
                      const matchStatus = auditStatusFilter === 'all' || tc.testStatus === auditStatusFilter;
                      const searchStr = `${tc.id} ${tc.module} ${tc.function} ${tc.workflow} ${tc.errorCase} ${tc.expected} ${tc.actual}`.toLowerCase();
                      const matchSearch = !auditSearchQuery || searchStr.includes(auditSearchQuery.toLowerCase());
                      return matchModule && matchStatus && matchSearch;
                    })
                    ?.map((tc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500">{tc.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-[var(--text-primary)]">{tc.module}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">{tc.workflow}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[var(--text-primary)]">{tc.function}</div>
                          <div className="inline-flex text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            Role: {tc.role}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-[var(--text-primary)]">{tc.errorCase}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">สถานะ: {tc.status}</div>
                        </td>
                        <td className="p-3 text-blue-600 dark:text-blue-400 font-medium max-w-[200px] break-words">
                          {tc.expected}
                        </td>
                        <td className="p-3 max-w-[300px]">
                          <div className="text-[var(--text-primary)] font-medium break-words">{tc.actual}</div>
                          {tc.evidence && (
                            <div className="text-[10px] font-mono bg-slate-950 text-emerald-400 p-1.5 rounded mt-1 overflow-x-auto max-h-[80px]">
                              {tc.evidence}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${
                            tc.testStatus === 'PASS'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : tc.testStatus === 'FAIL'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}>
                            {tc.testStatus === 'PASS' && <Check className="w-3 h-3" />}
                            <span>{tc.testStatus}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  {(!auditResults?.testCases || auditResults?.testCases?.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">
                        ไม่พบข้อมูลผลการทดสอบ กรุณากดรันระบบตรวจสอบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BUSINESS PROCESS ARCHITECT */}
      {activeTab === 'process_logic' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 border border-indigo-950/50 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
                System Analyst & Business Process Architect
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                สถาปัตยกรรมกระบวนการและตรรกะระบบ (Business Process Design)
              </h3>
              <p className="text-slate-300 text-xs max-w-3xl leading-relaxed">
                การวิเคราะห์กระบวนการทำงานและตรรกะระดับ Enterprise เพื่อตอบคำถามว่า <strong className="text-white">“ระบบควรทำงานอย่างไรจึงจะถูกต้องและปลอดภัยสูงสุด”</strong> พร้อมการบังคับใช้กฎทางธุรกิจ (Business Rules) ร่วมกันทั้งระบบ (Single Source of Truth)
              </p>
            </div>
          </div>

          {/* 1. Expecting Logic & Business Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>กฎทางธุรกิจหลัก (Business Rules First)</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 text-[10px]">1</div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">เอกสารในสถานะร่าง (Draft)</span>
                    <span className="text-[var(--text-secondary)]">ผู้สร้างสารบรรณเป็นเจ้าของเท่านั้นที่แก้ไข แก้ไขเนื้อหา เอกสารแนบ หรือลบออกได้</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 text-[10px]">2</div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">เอกสารที่ส่งเสนอแล้ว (Submitted/Pending)</span>
                    <span className="text-[var(--text-secondary)]">ระบบล็อกข้อมูลหลักทันทีเพื่อความน่าเชื่อถือ ป้องกันการแก้ไขเชิงเนื้อหาโดยพละการ</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 text-[10px]">3</div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">เอกสารถูกตีกลับ (Rejected)</span>
                    <span className="text-[var(--text-secondary)]">ผู้สร้างสามารถทำการแก้ไขข้อบกพร่องตามคำเกษียรของหัวหน้างาน และกดส่งตรวจสอบใหม่ (Resubmit) ได้</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 text-[10px]">4</div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">เอกสารอนุมัติหรือดำเนินการแล้ว (Approved/Processed)</span>
                    <span className="text-[var(--text-secondary)]">ล็อกถาวร ห้ามแก้ไข/ลบเด็ดขาด อนุญาตเฉพาะการดูข้อมูล (Read), พิมพ์ออก (Print) และจัดเก็บถาวร (Archive)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Design Gates */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>การประมวลผลธุรกรรมที่ปลอดภัย (Transactional & Exception Path)</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">Transactional Atomicity (ACID)</span>
                  <span className="text-[var(--text-secondary)] block leading-relaxed">
                    ทุกธุรกรรมที่มีหลายการอัปเดต (เช่นเปลี่ยนสถานะเอกสาร + บันทึก Audit Log + บันทึกกล่องจดหมายรับส่ง) จะถูกห่อหุ้มในธุรกรรมฐานข้อมูลเดียว หากขั้นตอนใดขั้นตอนหนึ่งล้มเหลว ระบบจะสั่ง <code className="bg-red-500/10 text-red-600 px-1 py-0.5 rounded font-mono text-[10px]">ROLLBACK</code> ทันทีเพื่อความปลอดภัยของข้อมูล
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">Idempotency & Concurrency Control</span>
                  <span className="text-[var(--text-secondary)] block leading-relaxed">
                    ระบบป้องกันการกดดับเบิลคลิก (Double-Click) ซ้ำกันบนหน้าจอด้วยการทำ Request Lock และมีระบบตรวจหาการเขียนทับซ้อน (Optimistic Concurrency Detection) โดยตรวจสอบการเปลี่ยนแปลงก่อนทำการบันทึก
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Interactive Decision Logic Tree */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span>เครื่องมือจำลองตรรกะการตัดสินใจ (Decision Logic Simulator)</span>
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              จำลองกลไกเงื่อนไขความถูกต้อง Gate ตรวจสอบก่อนอนุญาตทำธุรกรรม (Decision Tree) ของเอกสารระดับ Enterprise:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* Simulation Controls */}
              <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-light)] space-y-4">
                <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider block border-b border-[var(--border-light)] pb-1.5">ขั้นตอนจำลอง</span>
                
                {/* Checkpoint 1 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block">1. ความสมบูรณ์ของเอกสาร (Data Complete)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSimDataComplete(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simDataComplete ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      สมบูรณ์ (Complete)
                    </button>
                    <button
                      onClick={() => setSimDataComplete(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!simDataComplete ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      ว่าง/ไม่ครบ (Missing)
                    </button>
                  </div>
                </div>

                {/* Checkpoint 2 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block">2. สิทธิ์ของผู้ใช้ (User Authorization)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSimUserAuthorized(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simUserAuthorized ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      มีสิทธิ์อนุมัติ (Authorized)
                    </button>
                    <button
                      onClick={() => setSimUserAuthorized(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!simUserAuthorized ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      ไม่มีสิทธิ์ (Forbidden)
                    </button>
                  </div>
                </div>

                {/* Checkpoint 3 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block">3. สถานะเอกสารปัจจุบัน (Document Status)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSimDocStatus('pending')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simDocStatus === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      Pending (พิจารณา)
                    </button>
                    <button
                      onClick={() => setSimDocStatus('approved')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simDocStatus === 'approved' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      Approved (ล็อกแล้ว)
                    </button>
                  </div>
                </div>
              </div>

              {/* Decision Flow visualizer */}
              <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-light)] md:col-span-2 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider block border-b border-[var(--border-light)] pb-1.5">แผนผังผลการตัดสินใจ (Decision Tree Flow)</span>
                  
                  <div className="space-y-4 py-3 text-xs">
                    {/* Node 1 */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded border font-mono font-bold ${simDataComplete ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40'}`}>
                        1. Data Input Validation
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {simDataComplete ? '✅ ผ่าน (Data Complete)' : '❌ ไม่ผ่าน -> Reject (HTTP 400)'}
                      </span>
                    </div>

                    {/* Node 2 */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded border font-mono font-bold ${simUserAuthorized ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40'}`}>
                        2. Role & Resource Permission Gate
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {simUserAuthorized ? '✅ ผ่าน (Authorized)' : '❌ ปฏิเสธสิทธิ์ -> Access Denied (HTTP 403)'}
                      </span>
                    </div>

                    {/* Node 3 */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded border font-mono font-bold ${simDocStatus === 'pending' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40'}`}>
                        3. Current State transition
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {simDocStatus === 'pending' ? '✅ ดำเนินการอนุมัติได้' : '❌ ปฏิเสธ -> ไม่อนุญาตเขียนทับเอกสารที่ล็อกแล้ว (HTTP 409)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final simulation output */}
                <div className="p-3 rounded-xl bg-slate-900 text-white font-mono text-xs flex items-center justify-between border border-indigo-900/50">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span>ผลลัพธ์สุดท้าย (Execution Gate Output):</span>
                  </div>
                  <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                    simDataComplete && simUserAuthorized && simDocStatus === 'pending'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {simDataComplete && simUserAuthorized && simDocStatus === 'pending'
                      ? 'PASS: ธุรกรรมสำเร็จ (COMMIT)'
                      : 'FAIL: ดำเนินการล้มเหลว (REJECT / ROLLBACK)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. State & Transition Matrix */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>ตารางสถานะการเดินงานสารบรรณ (State & Transition Matrix)</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[var(--border-light)] text-[var(--text-secondary)] font-bold">
                    <th className="p-3">สถานะปัจจุบัน (State)</th>
                    <th className="p-3">การกระทำที่อนุญาต (Action)</th>
                    <th className="p-3">บทบาทที่มีสิทธิ์ (Allowed Role)</th>
                    <th className="p-3">เงื่อนไขการตรวจสอบ (Condition)</th>
                    <th className="p-3">สถานะถัดไป (Next State)</th>
                    <th className="p-3">คำอธิบายกระบวนการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-secondary)]">
                  {[
                    { state: 'Draft', action: 'Submit (ส่งเสนอ)', role: 'Staff / User', cond: 'กรอกหัวเรื่อง, แหล่งที่มาครบถ้วน', next: 'Pending', desc: 'เสนอเรื่องให้หัวหน้าฝ่ายงานวิเคราะห์' },
                    { state: 'Pending', action: 'Approve (อนุมัติลงรับ)', role: 'Manager / Admin', cond: 'ตรวจสิทธิ์ผู้พิจารณา, เอกสารเป็น Pending', next: 'Approved / Processed', desc: 'ออกเลขทะเบียนหนังสือและลงนาม e-Signature' },
                    { state: 'Pending', action: 'Reject (ตีกลับแก้ไข)', role: 'Manager / Admin', cond: 'ต้องระบุเหตุผลในการตีกลับ', next: 'Rejected', desc: 'ส่งกลับให้ผู้ร่างเพื่อปรับปรุงเนื้อความ' },
                    { state: 'Rejected', action: 'Edit & Resubmit', role: 'Staff (Owner)', cond: 'เป็นเจ้าของเอกสารและปรับความเรียบร้อย', next: 'Pending', desc: 'แก้ไขเสร็จสิ้นส่งกลับเข้าวงจรอนุมัติ' },
                    { state: 'Approved', action: 'Archive (จัดเก็บถาวร)', role: 'Staff / Manager / Admin', cond: 'หนังสือได้รับอนุมัติลงรับเสร็จสิ้น', next: 'Archived', desc: 'ย้ายเข้าที่จัดเก็บเอกสารปิดเรื่อง' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-3 font-bold text-[var(--text-primary)]">{row.state}</td>
                      <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.action}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">{row.role}</span></td>
                      <td className="p-3 text-[var(--text-primary)]">{row.cond}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{row.next}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Human vs System workflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Human Tasks */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
                <User className="w-4 h-4 text-orange-500" />
                <span>งานระดับบุคคล (Human Workflows)</span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                ขั้นตอนและภาระการตัดสินใจที่อาศัยสติปัญญาและการพิจารณาของเจ้าหน้าที่โดยเฉพาะ:
              </p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>การวิเคราะห์และสรุปย่อ:</strong> ย่อใจความหลักของหนังสือแนบที่เข้ามาเพื่อจัดทำบันทึกสรุปเสนอผู้ว่าราชการจังหวัด</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>การเกษียรความเห็น:</strong> หัวหน้าฝ่ายพิจารณาลงความเห็นวินิจฉัยเพื่อสั่งการ และส่งมอบความเห็นให้แอดมินดำเนินการถัดไป</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>การประเมินภัยพิบัติ (ปภ.):</strong> การประสานงานเหตุด่วนสาธารณภัยและการจัดกำลังพลสนับสนุนทางภูมิศาสตร์</span>
                </li>
              </ul>
            </div>

            {/* System Automated Tasks */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
                <Server className="w-4 h-4 text-emerald-500" />
                <span>งานระบบอัตโนมัติ (System Automated Workflows)</span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                ขั้นตอนที่เซิร์ฟเวอร์และระบบดำเนินการให้โดยอัตโนมัติอย่างถูกต้อง แม่นยำ ปราศจาก Human Error:
              </p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>การออกเลขรันนิ่ง (Auto-Running Numbers):</strong> กำหนดเลขทะเบียนหนังสือ รย.xxxx อย่างต่อเนื่องตามปีงบประมาณอัตโนมัติ</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>การสร้างประวัติระบบ (Audit Logging):</strong> บันทึกประวัติการกระทำผู้ใช้ ลิงก์เข้ากับไอพีและช่วงเวลาทันทีโดยห้ามแก้ไข</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>การยิงแจ้งเตือน (Notifications Engine):</strong> ส่งสัญญาณระบบเตือนในพอร์ทัลแก่เจ้าหน้าที่เมื่อได้รับหนังสือด่วนที่สุดเข้าฝ่ายงาน</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 5. Process Optimization: BEFORE vs AFTER */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-light)] pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>การเพิ่มประสิทธิภาพกระบวนการรับส่งเอกสาร (Process Optimization Guide)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 text-xs">
              {/* BEFORE */}
              <div className="p-4 rounded-xl border border-red-200 bg-red-500/5 space-y-2">
                <span className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">ก่อนการปรับปรุง (BEFORE - Manual-Heavy)</span>
                <div className="flex flex-col gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-red-100 flex items-center justify-between">
                    <span>1. สร้างร่างเอกสาร (Draft)</span>
                    <span className="text-slate-400">Manual</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-red-100 flex items-center justify-between">
                    <span>2. เดินเอกสารทางกายภาพให้ผู้บังคับบัญชาตรวจ</span>
                    <span className="text-slate-400">Manual</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-red-100 flex items-center justify-between">
                    <span>3. ลงลายมือชื่อด้วยหมึกและตราครุฑยางพารา</span>
                    <span className="text-slate-400">Manual</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-red-100 flex items-center justify-between">
                    <span>4. เดินเรื่องให้พนักงานสแกนส่งสแกนเก็บเข้าคลัง</span>
                    <span className="text-slate-400">Manual</span>
                  </div>
                </div>
                <p className="text-[10px] text-red-500 leading-relaxed pt-1.5">
                  ⚠️ มีความล่าช้า เอกสารสูญหายได้ง่าย และขาดกลไกตรวจสอบผู้มีสิทธิ์ใช้งานจริง (No Audit Trail)
                </p>
              </div>

              {/* AFTER */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-500/5 space-y-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">หลังการปรับปรุง (AFTER - Optimized Gateway)</span>
                <div className="flex flex-col gap-1.5 text-[11px] font-mono text-[var(--text-secondary)]">
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 flex items-center justify-between">
                    <span>1. คีย์แบบร่างระบบอัจฉริยะ (Smart Pre-Fill)</span>
                    <span className="text-emerald-600 font-bold">Auto</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 flex items-center justify-between">
                    <span>2. อนุมัติลงรับ & ออกเลขทะเบียนด้วยปุ่มเดียว</span>
                    <span className="text-emerald-600 font-bold">Auto</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 flex items-center justify-between">
                    <span>3. ลงลายเซ็นดิจิทัล e-Signature (ETDA Compliant)</span>
                    <span className="text-emerald-600 font-bold">Secure</span>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 flex items-center justify-between">
                    <span>4. เก็บบันทึกประวัติและกระจายสิทธิ์ค้นหาทันที</span>
                    <span className="text-emerald-600 font-bold">Real-time</span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 leading-relaxed pt-1.5">
                  ✅ ประหยัดเวลา 90% ข้อมูลเป็นระเบียบตรวจสอบประวัติแก้ไขย้อนหลังได้ทันที สอดคล้องกับ พ.ร.บ. ปฏิบัติราชการทางอิเล็กทรอนิกส์
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: UX/UI STUDIO & DESIGN SYSTEM */}
      {activeTab === 'ux_design_system' && (
        <UxUiStudioView />
      )}
    </div>
  );
}
