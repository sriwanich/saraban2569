import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  FileSpreadsheet, 
  Download, 
  ArrowLeft, 
  Printer, 
  Users, 
  Clock, 
  CheckCircle2, 
  Star, 
  Eye, 
  Trash2, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Calendar,
  Sparkles,
  Award,
  MessageSquare,
  Sliders,
  Check,
  Building2,
  Copy,
  ChevronLeft,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { Survey, SurveyResponse, SurveyQuestion } from '../../types/survey';
import { SurveyResponseDetailModal } from './SurveyResponseDetailModal';
import { ECertificateModal } from './ECertificateModal';
import * as XLSX from 'xlsx';

interface SurveyAnalyticsDashboardProps {
  survey: Survey;
  responses: SurveyResponse[];
  onBack: () => void;
  onDeleteResponse?: (responseId: string) => void;
}

const COLORS = ['#2563eb', '#059669', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04', '#475569'];

export const getSafeAnswers = (raw: any): Record<string, any> => {
  if (!raw) return {};
  let res = raw;
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch (_) {}
  }
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch (_) {}
  }
  return typeof res === 'object' && res !== null ? res : {};
};

export const SurveyAnalyticsDashboard: React.FC<SurveyAnalyticsDashboardProps> = ({
  survey,
  responses,
  onBack,
  onDeleteResponse,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'identified' | 'anonymous' | 'has_feedback'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score_high' | 'score_low'>('newest');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [selectedCertResponse, setSelectedCertResponse] = useState<SurveyResponse | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'analytics' | 'responses' | 'ai_report'>('analytics');
  const [textSearchKeywords, setTextSearchKeywords] = useState<Record<string, string>>({});

  const [aiReport, setAiReport] = useState<any | null>(null);
  const [isAiReportLoading, setIsAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState<string | null>(null);

  const handleGenerateAiReport = async () => {
    setIsAiReportLoading(true);
    setAiReportError(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/ai-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.report);
      } else {
        const errData = await res.json();
        setAiReportError(errData.error || 'เกิดข้อผิดพลาดในการวิเคราะห์ AI');
      }
    } catch (e) {
      setAiReportError('ไม่สามารถติดต่อช่องทางประมวลผล AI ได้');
    } finally {
      setIsAiReportLoading(false);
    }
  };

  // Calculate personal score for any response
  const computeResponseScore = (r: SurveyResponse) => {
    let scoreSum = 0;
    let scoreCount = 0;
    const safeAnsMap = getSafeAnswers(r.answers);

    survey.questions.forEach(q => {
      const ans = safeAnsMap[q.id];
      if (ans === undefined || ans === null) return;

      if (q.type === 'rating_stars' && typeof ans === 'number') {
        scoreSum += (ans / (q.maxScore || 5)) * 100;
        scoreCount++;
      } else if (q.type === 'slider_score' && typeof ans === 'number') {
        const max = q.maxScore || 10;
        const min = q.minScore || 0;
        scoreSum += ((ans - min) / (max - min)) * 100;
        scoreCount++;
      } else if (q.type === 'matrix_rating' && typeof ans === 'object') {
        Object.values(ans).forEach((val: any) => {
          if (typeof val === 'number') {
            scoreSum += (val / 5) * 100;
            scoreCount++;
          }
        });
      }
    });

    if (scoreCount === 0) return null;
    const avgPercent = Math.round(scoreSum / scoreCount);
    const avgScoreOutOf5 = (avgPercent / 20).toFixed(2);
    return { avgPercent, avgScoreOutOf5 };
  };

  // Summary Metrics
  const totalResponses = responses.length;
  const avgTimeSeconds = useMemo(() => {
    if (totalResponses === 0) return 0;
    const sum = responses.reduce((acc, r) => acc + (r.timeSpentSeconds || 60), 0);
    return Math.round(sum / totalResponses);
  }, [responses, totalResponses]);

  // Overall CSAT Score
  const avgSatisfactionScore = useMemo(() => {
    if (totalResponses === 0) return 0;
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    responses.forEach(r => {
      survey.questions.forEach(q => {
        const ans = r.answers[q.id];
        if (ans !== undefined && ans !== null) {
          if (q.type === 'rating_stars' && typeof ans === 'number') {
            totalScoreSum += (ans / (q.maxScore || 5)) * 100;
            totalScoreCount++;
          } else if (q.type === 'slider_score' && typeof ans === 'number') {
            const max = q.maxScore || 10;
            const min = q.minScore || 0;
            totalScoreSum += ((ans - min) / (max - min)) * 100;
            totalScoreCount++;
          } else if (q.type === 'matrix_rating' && typeof ans === 'object') {
            Object.values(ans).forEach((val: any) => {
              if (typeof val === 'number') {
                totalScoreSum += (val / 5) * 100;
                totalScoreCount++;
              }
            });
          }
        }
      });
    });

    if (totalScoreCount === 0) return 100;
    return Math.round((totalScoreSum / totalScoreCount) * 10) / 10;
  }, [responses, survey.questions, totalResponses]);

  // Filtered & Sorted responses
  const processedResponses = useMemo(() => {
    let list = [...responses];

    // Filter type
    if (filterType === 'identified') {
      list = list.filter(r => !!r.respondentName && r.respondentName.trim() !== '');
    } else if (filterType === 'anonymous') {
      list = list.filter(r => !r.respondentName || r.respondentName.trim() === '');
    } else if (filterType === 'has_feedback') {
      list = list.filter(r => {
        return survey.questions.some(q => {
          if (q.type === 'text_short' || q.type === 'text_long') {
            const txt = r.answers[q.id];
            return typeof txt === 'string' && txt.trim() !== '';
          }
          return false;
        });
      });
    }

    // Keyword search
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(r => {
        const nameMatch = (r.respondentName || '').toLowerCase().includes(kw);
        const deptMatch = (r.respondentDepartment || '').toLowerCase().includes(kw);
        const ansMatch = JSON.stringify(r.answers).toLowerCase().includes(kw);
        return nameMatch || deptMatch || ansMatch;
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (sortBy === 'score_high' || sortBy === 'score_low') {
        const scoreA = computeResponseScore(a)?.avgPercent ?? 0;
        const scoreB = computeResponseScore(b)?.avgPercent ?? 0;
        return sortBy === 'score_high' ? scoreB - scoreA : scoreA - scoreB;
      }
      return 0;
    });

    return list;
  }, [responses, searchKeyword, filterType, sortBy, survey.questions]);

  const isRsvpForm = survey.settings?.isRsvpForm || survey.category === 'rsvp_acknowledgment';

  // Toggle inline row accordion
  const toggleRowAccordion = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export to Excel with clean formatted Thai columns
  const handleExportExcel = () => {
    if (responses.length === 0) {
      alert('ยังไม่มีข้อมูลคำตอบสำหรับการส่งออก');
      return;
    }

    const exportRows = responses.map((r, idx) => {
      const scoreObj = computeResponseScore(r);
      const rowData: Record<string, any> = {
        'ลำดับ': idx + 1,
        'รหัสคำตอบ': r.id,
        'วันที่ส่ง': new Date(r.submittedAt).toLocaleString('th-TH'),
        'ผู้ตอบ': r.respondentName || 'ไม่ระบุตัวตน (นิรนาม)',
        'ตำแหน่ง': r.respondentPosition || '-',
        'หน่วยงาน/สังกัด': r.respondentDepartment || 'ประชาชน / ทั่วไป',
        'เวลาที่ใช้ (วินาที)': r.timeSpentSeconds || '-',
        'คะแนนประเมินรวม (%)': scoreObj ? `${scoreObj.avgPercent}%` : '-',
        'คะแนนเฉลี่ย (เต็ม 5)': scoreObj ? scoreObj.avgScoreOutOf5 : '-'
      };

      survey.questions.forEach((q, qIdx) => {
        if (q.type === 'section_header') return;

        const ans = r.answers[q.id];
        const otherAns = r.answers[`${q.id}_other_text`];

        if (q.type === 'matrix_rating' && q.matrixRows) {
          q.matrixRows.forEach((mRow, mIdx) => {
            const colKey = `ข้อ ${qIdx + 1}.${mIdx + 1}: ${mRow.text}`;
            const rowVal = typeof ans === 'object' && ans ? (ans as Record<string, number>)[mRow.id] : null;
            rowData[colKey] = rowVal !== undefined && rowVal !== null ? rowVal : '-';
          });
        } else if (q.type === 'multiple_choice') {
          const colKey = `ข้อ ${qIdx + 1}: ${q.title}`;
          let valStr = Array.isArray(ans) ? ans.join(', ') : (ans || '-');
          if (otherAns) valStr += ` (อื่นๆ: ${otherAns})`;
          rowData[colKey] = valStr;
        } else if (q.type === 'rating_stars') {
          const colKey = `ข้อ ${qIdx + 1}: ${q.title}`;
          rowData[colKey] = ans !== undefined ? `${ans} ดาว` : '-';
        } else if (q.type === 'slider_score') {
          const colKey = `ข้อ ${qIdx + 1}: ${q.title}`;
          rowData[colKey] = ans !== undefined ? `${ans} คะแนน` : '-';
        } else if (q.type === 'signature') {
          const colKey = `ข้อ ${qIdx + 1}: ${q.title}`;
          rowData[colKey] = ans ? 'มีลายมือชื่อรับรอง' : 'ไม่มี';
        } else {
          const colKey = `ข้อ ${qIdx + 1}: ${q.title}`;
          let valStr = ans !== undefined && ans !== null ? String(ans) : '-';
          if (otherAns) valStr += ` (อื่นๆ: ${otherAns})`;
          rowData[colKey] = valStr;
        }
      });

      return rowData;
    });

    // Export to High-Fidelity Excel (.xlsx) using the xlsx library
    try {
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Survey Responses");
      XLSX.writeFile(wb, `survey-results-${survey.id}.xlsx`);
    } catch (err) {
      console.error("Failed to export to Excel:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel กำลังดาวน์โหลดแบบสำรอง (CSV)...");
      
      const headers = Array.from(new Set(exportRows.flatMap(row => Object.keys(row))));
      const escapeCsvValue = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvLines = [
        headers.map(escapeCsvValue).join(','),
        ...exportRows.map(row => headers.map(h => escapeCsvValue(row[h] ?? '')).join(','))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `survey-results-${survey.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Helper for qualitative Likert scale interpretation (มาตรฐาน ก.พ.ร.)
  const getLikertQualitativeLabel = (mean: number) => {
    if (mean >= 4.51) return { text: 'มากที่สุด (Very High)', color: 'text-emerald-600 bg-emerald-500/10' };
    if (mean >= 3.51) return { text: 'มาก (High)', color: 'text-teal-600 bg-teal-500/10' };
    if (mean >= 2.51) return { text: 'ปานกลาง (Moderate)', color: 'text-amber-600 bg-amber-500/10' };
    if (mean >= 1.51) return { text: 'น้อย (Low)', color: 'text-orange-600 bg-orange-500/10' };
    return { text: 'น้อยที่สุด (Very Low)', color: 'text-rose-600 bg-rose-500/10' };
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                จัดการผลการตอบกลับ (Analytics & Responses)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {survey.categoryLabel || 'ความพึงพอใจ'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-xl">
              {survey.title}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel / CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] border border-[var(--border-lighter)] text-[var(--text-primary)] font-bold text-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงานสรุป</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">ผู้ตอบทั้งหมด</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {totalResponses} <span className="text-xs font-normal text-[var(--text-muted)]">ชุด</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">คะแนนความพึงพอใจ (CSAT)</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {avgSatisfactionScore}%
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">เวลาเฉลี่ยในการตอบ</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {Math.floor(avgTimeSeconds / 60)}:{(avgTimeSeconds % 60).toString().padStart(2, '0')}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">นาที</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">จำนวนข้อคำถาม</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {survey.questions.filter(q => q.type !== 'section_header').length}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">ข้อ</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-[var(--border-lighter)] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> แดชบอร์ดสรุปรายข้อ (Question Breakdown)
        </button>
        <button
          onClick={() => setActiveTab('responses')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'responses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" /> จัดการผลการตอบกลับ (Responses - {responses.length})
        </button>
        <button
          onClick={() => setActiveTab('ai_report')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'ai_report'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-[var(--text-secondary)] hover:text-indigo-600'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" /> รายงานสรุป AI อัจฉริยะ (AI Executive Report)
        </button>
      </div>

      {/* ----------------- TAB 1: Analytics Breakdown ----------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {totalResponses === 0 ? (
            <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center space-y-3">
              <Users className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                ยังไม่มีข้อมูลคำตอบแบบสำรวจ
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                แชร์ลิงก์หรือสแกน QR Code เพื่อให้ผู้รับบริการหรือเจ้าหน้าที่เริ่มตอบแบบสำรวจ
              </p>
            </div>
          ) : (
            survey.questions.map((q, qIndex) => {
              if (q.type === 'section_header') return null;

              // 1. Single / Multiple Choice / Dropdown
              if (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown') {
                const countMap: Record<string, number> = {};
                q.options?.forEach(opt => { countMap[opt.text] = 0; });

                let answeredUsers = 0;
                responses.forEach(r => {
                  const ans = r.answers[q.id];
                  if (ans !== undefined && ans !== null && ans !== '') {
                    answeredUsers++;
                    if (Array.isArray(ans)) {
                      ans.forEach(item => { countMap[item] = (countMap[item] || 0) + 1; });
                    } else if (typeof ans === 'string') {
                      countMap[ans] = (countMap[ans] || 0) + 1;
                    }
                  }
                });

                const chartData = Object.entries(countMap).map(([name, value]) => ({
                  name,
                  value,
                  percent: totalResponses > 0 ? Math.round((value / totalResponses) * 100) : 0
                }));

                return (
                  <div key={q.id} className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-lighter)] pb-3 gap-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-0.5">ข้อที่ {qIndex + 1} ({q.type === 'multiple_choice' ? 'เลือกได้หลายข้อ' : 'เลือกตอบข้อเดียว'})</span>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          {q.title}
                        </h4>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 font-bold">
                        ตอบแล้ว {answeredUsers} / {totalResponses} คน
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      <div className="space-y-3">
                        {chartData.map((item, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-[var(--text-primary)] truncate max-w-[280px] font-bold">{item.name}</span>
                              <span className="font-bold text-[var(--text-secondary)]">{item.value} คน ({item.percent}%)</span>
                            </div>
                            <div className="w-full bg-[var(--bg-canvas)] h-2.5 rounded-full overflow-hidden border border-[var(--border-lighter)]">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${item.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={35}
                              paddingAngle={3}
                            >
                              {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. Matrix Rating (Likert 1-5 Scale) with Complete Statistical Summary
              if (q.type === 'matrix_rating') {
                const matrixStats = q.matrixRows?.map(row => {
                  let scoreSum = 0;
                  let count = 0;
                  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  const scoresList: number[] = [];

                  responses.forEach(r => {
                    const rowVal = (r.answers[q.id] || {})[row.id];
                    if (typeof rowVal === 'number' && rowVal >= 1 && rowVal <= 5) {
                      scoreSum += rowVal;
                      count++;
                      dist[rowVal] = (dist[rowVal] || 0) + 1;
                      scoresList.push(rowVal);
                    }
                  });

                  const mean = count > 0 ? scoreSum / count : 0;
                  
                  // Calculate SD
                  let variance = 0;
                  if (count > 1) {
                    variance = scoresList.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (count - 1);
                  }
                  const sd = Math.sqrt(variance);

                  return {
                    rowId: row.id,
                    name: row.text,
                    mean: Number(mean.toFixed(2)),
                    sd: Number(sd.toFixed(2)),
                    count,
                    dist
                  };
                });

                // Compute overall matrix average
                const overallMatrixMean = matrixStats && matrixStats.length > 0 
                  ? (matrixStats.reduce((acc, m) => acc + m.mean, 0) / matrixStats.length).toFixed(2)
                  : '0.00';
                const overallQualitative = getLikertQualitativeLabel(Number(overallMatrixMean));

                return (
                  <div key={q.id} className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-5">
                    <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-lighter)] pb-3 gap-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-0.5">
                          ข้อที่ {qIndex + 1} (ตารางประเมินระดับความพึงพอใจ 5 ระดับ)
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          {q.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">คะแนนเฉลี่ยรวม:</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          ⭐ {overallMatrixMean} / 5.00
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${overallQualitative.color}`}>
                          {overallQualitative.text}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {matrixStats?.map((rowStat, rIdx) => {
                        const qual = getLikertQualitativeLabel(rowStat.mean);

                        return (
                          <div key={rIdx} className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-blue-600 font-mono">{rIdx + 1}.</span>
                                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{rowStat.name}</span>
                              </div>
                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                    $\bar&#123;X&#125;$ = {rowStat.mean.toFixed(2)} (S.D. = {rowStat.sd.toFixed(2)})
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${qual.color}`}>
                                  {qual.text}
                                </span>
                              </div>
                            </div>

                            {/* Level Distribution Bar */}
                            <div className="grid grid-cols-5 gap-1.5 pt-1">
                              {[5, 4, 3, 2, 1].map(lvl => {
                                const cnt = rowStat.dist[lvl] || 0;
                                const pct = rowStat.count > 0 ? Math.round((cnt / rowStat.count) * 100) : 0;
                                const lvlLabel = lvl === 5 ? 'มากที่สุด' : lvl === 4 ? 'มาก' : lvl === 3 ? 'ปานกลาง' : lvl === 2 ? 'น้อย' : 'น้อยที่สุด';
                                return (
                                  <div key={lvl} className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center space-y-1">
                                    <span className="text-[10px] text-[var(--text-muted)] block truncate">{lvl} ({lvlLabel})</span>
                                    <span className="text-xs font-extrabold text-[var(--text-primary)] block font-mono">{cnt} คน</span>
                                    <div className="w-full bg-[var(--bg-canvas)] h-1.5 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[9px] text-[var(--text-muted)] block font-mono">{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 3. Rating Stars
              if (q.type === 'rating_stars') {
                const starDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                let totalScore = 0;
                let count = 0;

                responses.forEach(r => {
                  const val = r.answers[q.id];
                  if (typeof val === 'number') {
                    totalScore += val;
                    count++;
                    starDist[val] = (starDist[val] || 0) + 1;
                  }
                });

                const avgStars = count > 0 ? (totalScore / count).toFixed(2) : '0.00';

                return (
                  <div key={q.id} className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-0.5">ข้อที่ {qIndex + 1} (การให้คะแนนดาว)</span>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">{q.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-base font-extrabold text-amber-600 font-mono">
                          {avgStars} / 5.00 ดาว
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {[5, 4, 3, 2, 1].map(star => {
                        const cnt = starDist[star] || 0;
                        const pct = count > 0 ? Math.round((cnt / count) * 100) : 0;
                        return (
                          <div key={star} className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-center space-y-1">
                            <span className="text-xs font-bold text-amber-500 block">⭐ {star} ดาว</span>
                            <span className="text-sm font-extrabold text-[var(--text-primary)] block font-mono">{cnt} คน</span>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 4. Slider Score
              if (q.type === 'slider_score') {
                let scoreSum = 0;
                let count = 0;
                responses.forEach(r => {
                  const val = r.answers[q.id];
                  if (typeof val === 'number') {
                    scoreSum += val;
                    count++;
                  }
                });

                const avgScore = count > 0 ? (scoreSum / count).toFixed(1) : '0';

                return (
                  <div key={q.id} className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-0.5">ข้อที่ {qIndex + 1} (แถบวัดคะแนน)</span>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">{q.title}</h4>
                      </div>
                      <span className="text-base font-extrabold text-blue-600 font-mono">
                        เฉลี่ย: {avgScore} / {q.maxScore || 100} คะแนน
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-2">
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>0 คะแนน</span>
                        <span>{q.maxScore || 100} คะแนน</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (Number(avgScore) / (q.maxScore || 100)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // 5. Text Responses list
              if (q.type === 'text_short' || q.type === 'text_long') {
                const searchKw = (textSearchKeywords[q.id] || '').toLowerCase();
                const textAnswers = responses
                  .map(r => ({
                    text: r.answers[q.id],
                    respondent: r.respondentName || 'ไม่ระบุตัวตน (นิรนาม)',
                    department: r.respondentDepartment || 'ประชาชน / ทั่วไป',
                    submittedAt: r.submittedAt
                  }))
                  .filter(item => typeof item.text === 'string' && item.text.trim() !== '')
                  .filter(item => !searchKw || item.text.toLowerCase().includes(searchKw) || item.respondent.toLowerCase().includes(searchKw));

                return (
                  <div key={q.id} className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-lighter)] pb-3 gap-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-0.5">ข้อที่ {qIndex + 1} (ข้อคิดเห็นและข้อเสนอแนะ)</span>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          {q.title}
                        </h4>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        ได้รับข้อเสนอแนะ {textAnswers.length} รายการ
                      </span>
                    </div>

                    {/* Search inside text answers */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
                      <Search className="w-3.5 h-3.5 text-slate-400 ml-1" />
                      <input
                        type="text"
                        placeholder="ค้นหาข้อความในข้อนี้..."
                        value={textSearchKeywords[q.id] || ''}
                        onChange={(e) => setTextSearchKeywords(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar">
                      {textAnswers.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-4 text-center">
                          ไม่มีข้อความตอบกลับหรือคำค้นหาไม่ตรงกับรายการใด
                        </div>
                      ) : (
                        textAnswers.map((item, tIdx) => (
                          <div key={tIdx} className="p-3.5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-1.5">
                            <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-wrap">
                              "{item.text}"
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-lighter)]/50">
                              <span>{item.respondent} ({item.department})</span>
                              <span>{new Date(item.submittedAt).toLocaleString('th-TH')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>
      )}

      {/* ----------------- TAB 2: Responses Table Tab ----------------- */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search + Filter Chips + Sort */}
          <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ตอบ, สังกัด, หรือข้อความคำตอบ..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none"
                />
                {searchKeyword && (
                  <button onClick={() => setSearchKeyword('')} className="text-slate-400 hover:text-slate-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> เรียงตาม:
                </span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
                >
                  <option value="newest">เวลาล่าสุด (ใหม่ - เก่า)</option>
                  <option value="oldest">เวลาแรกเริ่ม (เก่า - ใหม่)</option>
                  <option value="score_high">คะแนนประเมินสูงสุด</option>
                  <option value="score_low">คะแนนประเมินต่ำสุด</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-[var(--text-muted)] mr-1">ตัวกรอง:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-lighter)]'
                }`}
              >
                ทั้งหมด ({responses.length})
              </button>
              <button
                onClick={() => setFilterType('identified')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'identified'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-lighter)]'
                }`}
              >
                ระบุตัวตน ({responses.filter(r => !!r.respondentName && r.respondentName.trim() !== '').length})
              </button>
              <button
                onClick={() => setFilterType('anonymous')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'anonymous'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-lighter)]'
                }`}
              >
                ไม่ระบุตัวตน / นิรนาม ({responses.filter(r => !r.respondentName || r.respondentName.trim() === '').length})
              </button>
              <button
                onClick={() => setFilterType('has_feedback')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'has_feedback'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-lighter)]'
                }`}
              >
                มีข้อเสนอแนะเพิ่มเติม
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-lighter)] bg-[var(--bg-canvas)]/60 text-[var(--text-muted)] font-bold">
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">ผู้ตอบ / หน่วยงาน</th>
                    {isRsvpForm && <th className="p-4">การตอบรับ (RSVP)</th>}
                    <th className="p-4">คะแนนประเมินรวม</th>
                    <th className="p-4">วันที่และเวลาที่ส่ง</th>
                    <th className="p-4">เวลาที่ใช้</th>
                    <th className="p-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)]/60">
                  {processedResponses.length === 0 ? (
                    <tr>
                      <td colSpan={isRsvpForm ? 7 : 6} className="p-12 text-center text-slate-400 text-xs">
                        ไม่พบรายการคำตอบตามเงื่อนไขที่ระบุ
                      </td>
                    </tr>
                  ) : (
                    processedResponses.map((r, idx) => {
                      const scoreObj = computeResponseScore(r);
                      const isExpanded = !!expandedRows[r.id];
                      
                      // Extra data for RSVP if applicable
                      const answers = getSafeAnswers(r.answers);
                      let rsvpStatus = '-';
                      if (isRsvpForm) {
                        const statusQ = survey.questions.find(q => q.type === 'rsvp_status' || q.title.includes('ยืนยันการเข้าร่วม'));
                        if (statusQ) {
                          rsvpStatus = String(answers[statusQ.id] || '-');
                        }
                      }

                      return (
                        <React.Fragment key={r.id}>
                          <tr className={`hover:bg-[var(--bg-canvas)]/50 transition-colors ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''}`}>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => toggleRowAccordion(r.id)}
                                className="p-1 rounded-md hover:bg-[var(--bg-canvas)] text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title={isExpanded ? 'ย่อคำตอบ' : 'ดูคำตอบย่อในตาราง'}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-[var(--text-primary)] block">
                                {r.respondentName || (answers.name) || 'ไม่ระบุตัวตน (Anonymous)'}
                              </span>
                              <div className="flex flex-col text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                                {(r.respondentPosition || answers.position || Object.values(answers).find((a: any) => typeof a === 'object' && a?.position)?.position) && (
                                  <span className="font-medium text-indigo-500">
                                    ตำแหน่ง: {r.respondentPosition || answers.position || Object.values(answers).find((a: any) => typeof a === 'object' && a?.position)?.position}
                                  </span>
                                )}
                                <span>
                                  {r.respondentDepartment || (answers.dept) || 'ประชาชน / ทั่วไป'}
                                </span>
                              </div>
                            </td>
                            {isRsvpForm && (
                              <td className="p-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  rsvpStatus.includes('ตนเอง') || rsvpStatus.includes('เข้าร่วม') && !rsvpStatus.includes('ไม่สะดวก')
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : rsvpStatus.includes('ผู้แทน')
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                    : rsvpStatus !== '-' 
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                  {rsvpStatus}
                                </span>
                              </td>
                            )}
                            <td className="p-4">
                              {scoreObj ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="font-extrabold text-[var(--text-primary)] font-mono">
                                      {scoreObj.avgScoreOutOf5} / 5.0
                                    </span>
                                    <span className="text-[10px] text-emerald-600 font-bold">
                                      ({scoreObj.avgPercent}%)
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[var(--text-muted)] block">
                                    {scoreObj.avgPercent >= 90 ? 'มากที่สุด' : scoreObj.avgPercent >= 75 ? 'มาก' : scoreObj.avgPercent >= 60 ? 'ปานกลาง' : 'ควรปรับปรุง'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">ไม่มีคะแนนวัดผล</span>
                              )}
                            </td>
                            <td className="p-4 text-[var(--text-secondary)]">
                              <span className="block font-medium">
                                {new Date(r.submittedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                {new Date(r.submittedAt).toLocaleTimeString('th-TH')} น.
                              </span>
                            </td>
                            <td className="p-4 text-[var(--text-secondary)] font-mono">
                              {r.timeSpentSeconds ? `${r.timeSpentSeconds} วินาที` : 'ประมาณ 1 นาที'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedResponse(r)}
                                  className="px-3 py-1.5 rounded-xl text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>ดูคำตอบ</span>
                                </button>
                                {survey.settings?.quizMode && r.passedExam && (
                                  <button
                                    onClick={() => {
                                      setSelectedCertResponse(r);
                                    }}
                                    className="p-2 rounded-xl text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                                    title="ดูใบประกาศนียบัตร"
                                  >
                                    <Award className="w-4 h-4" />
                                  </button>
                                )}
                                {onDeleteResponse && (
                                  <button
                                    onClick={() => {
                                      if (confirm('คุณต้องการลบรายการคำตอบนี้ใช่หรือไม่?')) {
                                        onDeleteResponse(r.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                    title="ลบคำตอบนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Row Preview */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={isRsvpForm ? 7 : 6} className="p-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-[var(--border-lighter)]">
                                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] space-y-3">
                                  <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5" /> ตัวอย่างคำตอบฉบับย่อของผู้ตอบรายนี้
                                    </span>
                                    <button
                                      onClick={() => setSelectedResponse(r)}
                                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                    >
                                      เปิดดูฉบับเต็มและพิมพ์ใบบันทึก ›
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    {survey.questions.map((q, qIdx) => {
                                      if (q.type === 'section_header') return null;
                                      const safeAnswers = getSafeAnswers(r.answers);
                                      const ans = safeAnswers[q.id];

                                      return (
                                        <div key={q.id} className="p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-1">
                                          <span className="text-[10px] font-bold text-[var(--text-muted)] block truncate">
                                            ข้อ {qIdx + 1}: {q.title}
                                          </span>
                                          <div className="font-bold text-[var(--text-primary)]">
                                            {ans === undefined || ans === null || ans === '' ? (
                                              <span className="text-slate-400 italic">ไม่ได้ตอบ</span>
                                            ) : q.type === 'rsvp_status' ? (
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-blue-600">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  <span>{String(ans)}</span>
                                                </div>
                                                {safeAnswers['representative_details'] && (
                                                  <div className="mt-1 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px] space-y-0.5">
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">ผู้แทน:</span>
                                                      <span className="text-blue-700">{safeAnswers['representative_details'].name}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">ตำแหน่ง:</span>
                                                      <span className="text-indigo-600">{safeAnswers['representative_details'].position}</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ) : q.type === 'matrix_rating' && typeof ans === 'object' ? (
                                              <div className="space-y-0.5 pt-0.5">
                                                {q.matrixRows?.slice(0, 3).map(mRow => (
                                                  <div key={mRow.id} className="flex justify-between text-[11px]">
                                                    <span className="text-[var(--text-secondary)] truncate max-w-[180px]">{mRow.text}</span>
                                                    <span className="font-mono text-emerald-600 font-bold">⭐ {(ans as any)[mRow.id] || '-'} / 5</span>
                                                  </div>
                                                ))}
                                                {(q.matrixRows?.length || 0) > 3 && (
                                                  <span className="text-[10px] text-slate-400 italic block text-right">+ อีก {(q.matrixRows?.length || 0) - 3} ประเด็น</span>
                                                )}
                                              </div>
                                            ) : q.type === 'rating_stars' ? (
                                              <span className="text-amber-500 font-mono">⭐ {ans} ดาว</span>
                                            ) : q.type === 'multiple_choice' && Array.isArray(ans) ? (
                                              <span>{ans.join(', ')}</span>
                                            ) : q.type === 'signature' ? (
                                              <span className="text-emerald-600">✓ มีลายมือชื่อรับรอง</span>
                                            ) : q.type === 'contact_info' && typeof ans === 'object' ? (
                                              <div className="space-y-0.5 text-[11px]">
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--text-muted)]">ชื่อ:</span>
                                                  <span>{ans.name || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--text-muted)]">ตำแหน่ง:</span>
                                                  <span className="text-indigo-500 font-bold">{ans.position || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[var(--text-muted)]">หน่วยงาน:</span>
                                                  <span>{ans.dept || '-'}</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <span>{String(ans)}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: AI Executive Analytics Report Tab ----------------- */}
      {activeTab === 'ai_report' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-transparent border border-blue-100 dark:border-blue-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    รายงานประเมินผลอัจฉริยะ (AI Executive Analytics)
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] max-w-xl">
                  ให้ Google Gemini AI ประมวลผลจากข้อมูลผู้ตอบทั้งหมดแบบเรียลไทม์ เพื่อจัดทำรายงานการประเมินเชิงรุกและข้อคิดเห็นเชิงนวัตกรรม
                </p>
              </div>

              {!aiReport && !isAiReportLoading && (
                <button
                  onClick={handleGenerateAiReport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 animate-pulse"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>สร้างรายงานประเมินผลอัจฉริยะ</span>
                </button>
              )}
            </div>

            {isAiReportLoading && (
              <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-indigo-100 dark:border-indigo-900/30">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center space-y-1">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 block animate-pulse">
                    กำลังรวบรวมข้อมูลดิบและเรียกใช้อัลกอริทึมวิเคราะห์รายงาน...
                  </span>
                  <span className="text-xs text-slate-400 block">
                    กระบวนการนี้ใช้เวลาประมาณ 10-15 วินาที เนื่องจากระบบกำลังวิเคราะห์เสียงสะท้อนเชิงสถิติและเชิงคุณภาพ
                  </span>
                </div>
              </div>
            )}

            {aiReportError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  ❌ เกิดข้อผิดพลาด: {aiReportError}
                </p>
                <button
                  onClick={handleGenerateAiReport}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            )}

            {aiReport && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                  <span className="text-xs text-[var(--text-muted)] font-bold">
                    จำนวนผู้ตอบที่เข้าร่วมประเมิน: {responses.length} ราย | วิเคราะห์โดย: Google Gemini-3.8-Flash
                  </span>
                  <button
                    onClick={() => setAiReport(null)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                  >
                    วิเคราะห์ข้อมูลใหม่ (Recalculate)
                  </button>
                </div>

                {/* 1. Executive Summary */}
                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">บทสรุปผู้บริหาร (Executive Summary)</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                    {aiReport.executiveSummary}
                  </p>
                </div>

                {/* 2. Qualitative & Quantitative Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
                      การวิเคราะห์เชิงปริมาณ (Quantitative Assessment)
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                      {aiReport.quantitativeAnalysis}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                      การวิเคราะห์เชิงคุณภาพ (Qualitative Insights)
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                      {aiReport.qualitativeInsights}
                    </p>
                  </div>
                </div>

                {/* 3. Pain Points & Action Plan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 space-y-3">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                      ⚠️ ความท้าทายหลัก / ความเสี่ยง (Key Pain Points)
                    </span>
                    <ul className="space-y-2 text-xs">
                      {aiReport.painPoints?.map((pt: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[var(--text-secondary)] font-medium">
                          <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                            {idx + 1}
                          </span>
                          <span className="mt-0.5 leading-snug">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 space-y-3">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      🚀 แผนมาตรการปฏิบัติการเชิงรุก (Proactive Action Plan)
                    </span>
                    <ul className="space-y-2 text-xs">
                      {aiReport.actionPlan?.map((plan: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[var(--text-secondary)] font-medium">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                            {idx + 1}
                          </span>
                          <span className="mt-0.5 leading-snug">{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Conclusion Bar */}
                <div className="p-4 rounded-2xl bg-indigo-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-indigo-200 uppercase tracking-wider block font-bold">สรุปผลประเมินตามเกณฑ์มาตรฐาน</span>
                    <span className="text-xs sm:text-sm font-bold block">{aiReport.scoreConclusion}</span>
                  </div>
                  <div className="px-4 py-1.5 rounded-xl bg-white/20 border border-white/25 text-xs font-bold text-center shrink-0">
                    ระดับภาพรวม: {aiReport.scoreConclusion?.includes('ดีเลิศ') ? '⭐ ดีเลิศ (Excellent)' : 
                                   aiReport.scoreConclusion?.includes('ดีมาก') ? '⭐ ดีมาก (Very Good)' :
                                   aiReport.scoreConclusion?.includes('ปานกลาง') ? '😐 ปานกลาง (Fair)' : '⚠️ ต้องปรับปรุงเร่งด่วน'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResponse && (
        <SurveyResponseDetailModal
          survey={survey}
          response={selectedResponse}
          allResponses={processedResponses}
          onClose={() => setSelectedResponse(null)}
          onSelectResponse={(newResp) => setSelectedResponse(newResp)}
          onDeleteResponse={onDeleteResponse}
        />
      )}

      {selectedCertResponse && (
        <ECertificateModal
          survey={survey}
          response={selectedCertResponse}
          onClose={() => setSelectedCertResponse(null)}
        />
      )}
    </div>
  );
};
