import React, { useState, useEffect } from 'react';
import { 
  X, Server, AlertTriangle, CheckCircle2, Terminal, HelpCircle, Database, 
  RefreshCw, Globe, Activity, Link2, SlidersHorizontal, Check, Copy, AlertCircle
} from 'lucide-react';

interface HostTroubleshootingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverHealth: 'checking' | 'online' | 'fallback' | 'offline';
  onRetryHealthCheck: () => void;
}

export default function HostTroubleshootingModal({
  isOpen,
  onClose,
  serverHealth,
  onRetryHealthCheck
}: HostTroubleshootingModalProps) {
  const [activeTab, setActiveTab] = useState<'test' | 'overview' | 'cpanel' | 'vps' | 'shared' | 'mysql'>('test');
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Custom API configuration state
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    statusCode?: number;
    latencyMs?: number;
    message?: string;
    details?: any;
  }>({ status: 'idle' });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('edms_custom_api_url') || '';
        setCustomApiUrl(saved);
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetryHealthCheck();
    setTimeout(() => setIsRetrying(false), 600);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runDiagnosticPing = async (targetUrlOverride?: string) => {
    setTestResult({ status: 'testing' });
    const startTime = performance.now();

    const rawTarget = targetUrlOverride !== undefined ? targetUrlOverride : customApiUrl;
    const cleanBase = rawTarget.trim().replace(/\/+$/, '');
    const pingUrl = cleanBase ? `${cleanBase}/api/health` : `/api/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(pingUrl, { 
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - startTime);
      const text = await res.text();
      let parsedData: any = null;
      try {
        parsedData = JSON.parse(text);
      } catch (e) {}

      if (res.ok) {
        setTestResult({
          status: 'success',
          statusCode: res.status,
          latencyMs: latency,
          message: 'เชื่อมต่อกับ Backend Node.js สำเร็จ! เซิร์ฟเวอร์ตอบสนองปกติ',
          details: parsedData
        });
      } else {
        let msg = `เซิร์ฟเวอร์ตอบกลับสถานะ HTTP ${res.status}`;
        if (res.status === 404) {
          msg = 'HTTP 404 Not Found: ไม่พบ API เส้น /api/health (เว็บเซิร์ฟเวอร์ยังไม่ได้ Forward คำขอไปยัง Node.js หรือ Node.js ยังไม่ได้รัน)';
        } else if (res.status === 502 || res.status === 503) {
          msg = `HTTP ${res.status} Bad Gateway: เซิร์ฟเวอร์ Node.js หรือ Passenger หยุดทำงาน/ยังไม่ได้เริ่มรัน`;
        }
        setTestResult({
          status: 'error',
          statusCode: res.status,
          latencyMs: latency,
          message: msg,
          details: parsedData || text.slice(0, 300)
        });
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      let errMsg = err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้';
      if (err.name === 'AbortError') {
        errMsg = 'หมดเวลาเชื่อมต่อ (Connection Timeout 7s): เซิร์ฟเวอร์ไม่ตอบสนอง';
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        errMsg = 'Failed to fetch (ERR_CONNECTION_REFUSED / CORS): ไม่สามารถติดต่อ Node.js ได้ หรือถูกบล็อกโดย Firewall/Port หรือยังไม่ได้สั่งรัน Backend';
      }
      setTestResult({
        status: 'error',
        latencyMs: latency,
        message: errMsg
      });
    }
  };

  const handleSaveCustomApi = () => {
    const clean = customApiUrl.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('edms_custom_api_url', clean);
    } else {
      localStorage.removeItem('edms_custom_api_url');
    }
    onRetryHealthCheck();
    setTestResult({
      status: 'success',
      message: clean ? `บันทึกการเชื่อมต่อไปยัง: ${clean} เรียบร้อยแล้ว` : 'รีเซ็ตกลับเป็นค่าเริ่มต้น (Same-Origin /api) เรียบร้อยแล้ว'
    });
  };

  const handleResetDefault = () => {
    localStorage.removeItem('edms_custom_api_url');
    setCustomApiUrl('');
    onRetryHealthCheck();
    runDiagnosticPing('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100 animate-scale-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Official Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-900 dark:bg-blue-950/60 border border-blue-800/40 text-blue-200 flex items-center justify-center shrink-0 shadow-xs">
              <Server className="w-5 h-5 text-blue-100 dark:text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  เชื่อมต่อและตรวจสอบระบบแม่ข่าย (Backend Diagnostic)
                </h2>
                <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/50">
                  มาตรฐานระบบสารสนเทศ
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เครื่องมือทดสอบ คอนฟิกูเรชันเส้นทาง API และคู่มือติดตั้งบนเซิร์ฟเวอร์หน่วยงาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className={`px-5 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs relative z-10 ${
          serverHealth === 'online'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
            : serverHealth === 'fallback'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                serverHealth === 'online' ? 'bg-emerald-400' : serverHealth === 'fallback' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                serverHealth === 'online' ? 'bg-emerald-600' : serverHealth === 'fallback' ? 'bg-amber-600' : 'bg-rose-600'
              }`} />
            </div>
            <span className="font-semibold tracking-wide truncate">
              {serverHealth === 'online' && 'ระบบออนไลน์: ตรวจพบเซิร์ฟเวอร์หลัก Node.js เชื่อมต่อสมบูรณ์'}
              {serverHealth === 'fallback' && 'ระบบสำรอง: ทำงานในโหมดแคชเอกสารออฟไลน์ (Local Storage สำรอง)'}
              {serverHealth === 'offline' && 'ขัดข้อง: ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Node.js กรุณาตรวจสอบหรือตั้งค่าด้านล่าง'}
              {serverHealth === 'checking' && 'กำลังตรวจสอบ: ทดสอบสัญญาณการเชื่อมต่อไปยังเครื่องแม่ข่าย...'}
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 text-[11px] font-bold shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-700 dark:text-blue-400 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>ทดสอบอีกครั้ง</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100/70 dark:bg-slate-950/80 px-4 sm:px-6 pt-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2 relative z-10">
          <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-1 min-w-max w-full shadow-2xs">
            <button
              onClick={() => setActiveTab('test')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'test'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>กำหนด API URL</span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>วิเคราะห์สาเหตุ</span>
            </button>
            <button
              onClick={() => setActiveTab('cpanel')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'cpanel'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>cPanel / DirectAdmin</span>
            </button>
            <button
              onClick={() => setActiveTab('vps')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'vps'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>VPS Host</span>
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'shared'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>PHP Hosting</span>
            </button>
            <button
              onClick={() => setActiveTab('mysql')}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === 'mysql'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>MySQL Setup</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed flex-1 relative z-10 custom-scrollbar">
          
          {/* TAB 1: Live Diagnostic & Custom Server URL */}
          {activeTab === 'test' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                    <Activity className="w-4.5 h-4.5 text-blue-800 dark:text-blue-400" />
                    เครื่องมือกำหนดเส้นทาง API & วินิจฉัยสถานะ
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                    Host: {typeof window !== 'undefined' ? window.location.host : ''}
                  </span>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  ระบบสารบรรณทำงานเชื่อมต่อแบบ Real-time ไปยัง Backend ผ่านเส้นทาง <code className="text-blue-900 dark:text-blue-300 font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">/api/health</code> หากรันพอร์ตแยกต่างหากหรือมี Subdomain เฉพาะ สามารถระบุด้านล่างนี้เพื่อเชื่อมโยงเส้นทางหลัก
                </p>

                {/* Custom URL Input Panel */}
                <div className="space-y-2.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                    ฐานข้อมูลเซิร์ฟเวอร์เชื่อมโยง (Backend API Base URL):
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={customApiUrl}
                        onChange={(e) => setCustomApiUrl(e.target.value)}
                        placeholder="เว้นว่างไว้หากใช้โฮสต์เดียวกัน หรือใส่ เช่น http://103.x.x.x:3000"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => runDiagnosticPing()}
                        disabled={testResult.status === 'testing'}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-blue-900 dark:text-blue-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === 'testing' ? 'animate-spin' : ''}`} />
                        <span>ทดสอบปิง</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomApi}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกค่า</span>
                      </button>
                      {customApiUrl && (
                        <button
                          type="button"
                          onClick={handleResetDefault}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all cursor-pointer"
                          title="รีเซ็ตเป็นค่าเริ่มต้น"
                        >
                          ล้างค่า
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ping Result Box */}
                {testResult.status !== 'idle' && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                    testResult.status === 'testing'
                      ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      : testResult.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold border-b border-current/20 pb-1.5">
                      <span className="flex items-center gap-2">
                        {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-700 dark:text-blue-400" />}
                        {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                        <span>ผลการตรวจวัดการเชื่อมต่อ:</span>
                      </span>
                      {testResult.latencyMs !== undefined && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/70 dark:bg-slate-900/80">
                          PING: {testResult.latencyMs}ms {testResult.statusCode ? `(Status ${testResult.statusCode})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed font-semibold">{testResult.message}</p>

                    {testResult.details && (
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-36 custom-scrollbar">
                        <pre className="text-emerald-300">{typeof testResult.details === 'object' ? JSON.stringify(testResult.details, null, 2) : String(testResult.details)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick troubleshooting tips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    กรณี HTTP Response 404
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    เซิร์ฟเวอร์หลักหาเส้นทาง <code className="text-blue-800 dark:text-blue-300 font-mono">/api/</code> ไม่พบ เนื่องจากโปรเซส Node.js ยังไม่ได้ถูกรันขึ้นมา หรือโฮสติ้งยังไม่ได้ทำ Reverse Proxy เพื่อส่งคำขอไปยังพอร์ต 3000
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    กรณี Connection Timeout / Failed
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    ไม่สามารถสื่อสารได้โดยสิ้นเชิง มักเกิดจากพอร์ต <code className="text-blue-800 dark:text-blue-300 font-mono">3000</code> ถูกปิดกั้นในไฟร์วอลล์ หรือโปรเซสหยุดทำงาน แนะนำตรวจสอบสถานะการรันบน PM2 หรือ cPanel
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  สรุปแนวทางการตรวจสอบและการแก้ไขปัญหาการเชื่อมต่อ
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-4 leading-relaxed">
                  ระบบสารบรรณอิเล็กทรอนิกส์นี้เป็นโครงสร้าง **Full-Stack Application (React Front-End + Node.js Express Back-End)** ซึ่งมีประสิทธิภาพและความมั่นคงปลอดภัยสูง หากพบหน้าระบบแต่ไม่สามารถเข้าใช้งานได้ มักเกิดจาก 3 สาเหตุหลัก:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">ยังไม่ได้สั่งเริ่มต้นโปรแกรม Backend Node.js:</strong> 
                      ตัวเครื่องฝั่งหน้าบ้านจะพยายามดึงข้อมูลจากหลังบ้าน หากบริการหลังบ้านหยุดทำงาน (Stopped) จะไม่สามารถดึงข้อมูลทะเบียนหรือตรวจสอบสิทธิ์ได้
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">ขาดส่วนประกอบของชุด build คอมไพล์ไฟล์:</strong> 
                      ตัวเซิร์ฟเวอร์หลักต้องได้รับชุดคำสั่งที่คอมไพล์แล้วในโฟลเดอร์ <code className="text-blue-800 dark:text-blue-300">dist/server.cjs</code> เสมอ หากไม่มีการสั่ง <code className="text-blue-800 dark:text-blue-300">npm run build</code> ระบบจะไม่ทำงาน
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">การตั้งค่าตัวรันระบบ Startup ไม่สมบูรณ์:</strong> 
                      บน cPanel แนะนำให้ใส่ตัวตั้งต้นเป็น <code className="text-amber-700 dark:text-amber-400 font-bold">app.js</code> เสมอ และต้องทำการสร้างลิงก์พอร์ตภายในให้สมบูรณ์
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200">
                <p className="font-bold text-blue-950 dark:text-blue-100 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  คำแนะนำสำหรับการดำเนินการ:
                </p>
                กรุณาเลือกอ่านคู่มือการตั้งค่าจริงในแถบเมนูด้านบน เพื่อตรวจสอบคำสั่งและทำตามขั้นตอนบนเซิร์ฟเวอร์ของหน่วยงาน เช่น **cPanel** หรือ **VPS**
              </div>
            </div>
          )}

          {/* TAB 3: CPANEL / DIRECTADMIN */}
          {activeTab === 'cpanel' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Globe className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                คู่มือการตั้งค่าแอปพลิเคชัน Node.js บน cPanel
              </h3>

              <div className="space-y-3.5">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">1</span>
                    เปิดใช้งานแท็บ Setup Node.js App
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 text-xs pl-7">มองหาเมนูประเภท Software บนหน้าจอบอร์ดควบคุม cPanel คลิกเลือกเมนู <strong>Setup Node.js App</strong> และคลิกสร้างแอพ <strong>Create Application</strong></p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">2</span>
                    ระบุข้อมูลแอพพลิเคชันตามตารางหลัก
                  </strong>
                  <div className="pl-7 overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-1.5 font-bold text-slate-800 dark:text-slate-200">ตัวแปรอินพุต</th>
                          <th className="pb-1.5 font-bold text-slate-800 dark:text-slate-200">ค่าที่ควรกรอก</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="py-2">Node.js Version</td>
                          <td className="py-2 text-blue-800 dark:text-blue-300 font-semibold">เลือกเวอร์ชัน 20.x หรือ 18.x (แนะนำ 20+)</td>
                        </tr>
                        <tr>
                          <td className="py-2">Application mode</td>
                          <td className="py-2 text-indigo-800 dark:text-indigo-300 font-semibold">Production</td>
                        </tr>
                        <tr>
                          <td className="py-2">Application root</td>
                          <td className="py-2">ชื่อโฟลเดอร์รหัสต้นฉบับของคุณ (เช่น <code className="text-slate-800 dark:text-slate-200">edms</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2">Application startup file</td>
                          <td className="py-2 text-amber-700 dark:text-amber-400 font-bold">app.js</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">3</span>
                    สั่งติดตั้งแพ็กเกจ (Install Dependencies)
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 text-xs pl-7 mb-2">เข้าใช้งาน SSH หรือเปิดตัวเลือก Terminal ในระบบควบคุม แล้วป้อนชุดคำสั่งต่อไปนี้เพื่อสร้างไฟล์ระบบหลังบ้าน:</p>
                  <div className="pl-7 relative">
                    <pre className="bg-slate-900 dark:bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                      npm install{'\n'}npm run build
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('npm install && npm run build')}
                      className="absolute right-3 top-2.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer shadow-xs"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText === 'npm install && npm run build' ? 'คัดลอกเรียบร้อย!' : 'คัดลอกชุดคำสั่ง'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">4</span>
                    สั่งรีสตาร์ทบริการหลังบ้าน
                  </strong>
                  <p className="text-slate-600 dark:text-slate-400 text-xs pl-7">
                    กดปุ่ม <strong>"Restart"</strong> บนหัวข้อระบบ Node.js บน cPanel เพื่อให้ระบบโหลดไฟล์อัปเดตชุดใหม่ จากนั้นให้ทำตามข้อความหลักเพื่อเช็กสถานะอีกครั้ง
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VPS */}
          {activeTab === 'vps' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Terminal className="w-4.5 h-4.5 text-emerald-700 dark:text-emerald-400" />
                คู่มือรันเว็บแบบโปรดักชันบน Ubuntu Linux VPS (Nginx + PM2)
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-slate-800 dark:text-slate-200 mb-2 font-semibold">1. สั่งแพ็กไฟล์และคอมไพล์ในโฟลเดอร์ติดตั้ง:</p>
                  <pre className="bg-slate-900 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    cd /var/www/edms-saraban{'\n'}npm install{'\n'}npm run build
                  </pre>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 mb-2 font-semibold">2. ควบคุมโปรเซสในเบื้องหลังอย่างต่อเนื่องด้วยระบบ PM2 Manager:</p>
                  <pre className="bg-slate-900 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    pm2 start ecosystem.config.cjs{'\n'}pm2 save{'\n'}pm2 startup
                  </pre>
                </div>

                <div>
                  <p className="text-slate-800 dark:text-slate-200 mb-2 font-semibold">3. เขียนโค้ด Forward คำขอบนเว็บเซิร์ฟเวอร์หลัก (Nginx Reverse Proxy):</p>
                  <pre className="bg-slate-900 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 overflow-x-auto">
{`server {
    listen 80;
    server_name saraban-system.go.th;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
                  </pre>
                  <p className="mt-2 text-slate-500 text-[11px] italic">
                    อย่าลืมสั่งโหลดคอนฟิก Nginx ใหม่ผ่านคำสั่ง <code className="text-blue-800 dark:text-blue-300 font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">sudo systemctl reload nginx</code> หลังบันทึกไฟล์เสร็จสิ้น
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SHARED HOSTING (PHP ONLY) */}
          {activeTab === 'shared' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-700 dark:text-indigo-400" />
                โฮสต์แบบดั้งเดิมที่ไม่มีเมนู Node.js (PHP Shared Hosting)
              </h3>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  ⚠️ ข้อควรรู้เกี่ยวกับบริการโฮสติ้งราคาประหยัดบางราย
                </p>
                <p className="leading-relaxed">
                  ผู้ให้บริการส่วนใหญ่จะรันเฉพาะไฟล์ตระกูล PHP เท่านั้น หน้าเว็บหน้าบ้านซึ่งสร้างด้วย React จะเปิดใช้งานขึ้นมาได้เป็นปกติ แต่หากกรอกข้อมูลลงชื่อเข้าระบบจะไม่ทำงาน เนื่องจากไม่มีโปรเซสเซิร์ฟเวอร์ Node.js ทำงานอยู่เบื้องหลังในระบบเครื่องเซิร์ฟเวอร์
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200">วิธีแก้ไขระบบที่แนะนำและเสถียรที่สุด:</div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    แผนที่ 1: ฝากฐานระบบหลังบ้านไว้บนบริการคลาวด์มาตรฐาน (Render, Railway, Koyeb)
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    นำซอร์สโค้ดอัปโหลดขึ้น GitHub จากนั้นเชื่อมโยงและเปิดใช้งาน Node.js Service บนระบบคลาวด์เช่น **Render.com** ท่านจะได้โดเมนหลัก เช่น <code className="text-slate-800 dark:text-slate-200 font-mono bg-white dark:bg-slate-950 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800">https://edms-api.onrender.com</code> จากนั้นคัดลอกมาใส่ในแท็บแรก **"กำหนด API URL"** เพื่อใช้งานระบบร่วมกันทันที
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    แผนที่ 2: ติดต่อทีมเทคนิคของโฮสติ้งหลักเพื่อเปิดใช้งาน
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ติดต่อพนักงานฝ่ายซัพพอร์ตของเซิร์ฟเวอร์เพื่อเปิดใช้งานความสามารถ **Node.js Selector** หรืออัปเกรดแผนใช้งานระบบบริการเป็น Cloud Hosting หรือ VPS เพื่อความสมบูรณ์แบบสูงสุดของฐานข้อมูลองค์กร
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MYSQL */}
          {activeTab === 'mysql' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Database className="w-4.5 h-4.5 text-blue-900 dark:text-blue-400" />
                โครงสร้างระบบและการตั้งค่าเชื่อมโยงฐานข้อมูล MySQL
              </h3>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white text-xs sm:text-sm block mb-1.5">1. บันทึกตัวแปรสภาพแวดล้อมลงไฟล์ .env ที่โฟลเดอร์หลัก</strong>
                  <div className="relative mt-2">
                    <pre className="bg-slate-900 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-blue-200 overflow-x-auto">
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_saraban_db
DB_USERNAME=your_saraban_user
DB_PASSWORD=your_secure_password
PORT=3000
NODE_ENV=production
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('DB_HOST=localhost\nDB_PORT=3306\nDB_DATABASE=edms_db\nDB_USERNAME=edms_user\nDB_PASSWORD=password\nPORT=3000\nNODE_ENV=production')}
                      className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer shadow-xs"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText?.includes('DB_HOST') ? 'คัดลอกสำเร็จ!' : 'คัดลอกเนื้อหา'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white text-xs sm:text-sm block mb-1">2. นำเข้าตารางฐานข้อมูลสำเร็จรูป</strong>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      ค้นหาไฟล์ระบบ <strong><code className="text-blue-900 dark:text-blue-300 font-mono">database.sql</code></strong> ที่แนบไปในระบบราก นำเข้าผ่านอินเทอร์เฟซเมนูยอดนิยม <strong>phpMyAdmin</strong> บนหน้าควบคุมโฮสติ้งของท่าน เพื่อสร้างตารางเอกสาร ลำดับสิทธิ์ และสมุดทะเบียนให้เรียบร้อย
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 tracking-wide font-medium flex items-center gap-2">
            <span>เซิร์ฟเวอร์พอร์ตหลัก: <span className="font-mono text-blue-900 dark:text-blue-300 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">3000</span></span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Startup: <span className="font-mono text-amber-700 dark:text-amber-400 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">app.js</span></span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer text-center"
          >
            ปิดหน้าจอนี้
          </button>
        </div>
      </div>
    </div>
  );
}
