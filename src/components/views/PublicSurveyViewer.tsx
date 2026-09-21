import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Share2,
  ExternalLink,
  ShieldCheck,
  PauseCircle
} from 'lucide-react';
import { Survey, SurveyResponse } from '../../types/survey';
import { OFFICIAL_SURVEY_TEMPLATES } from '../../data/surveyTemplates';
import { SurveyRespondentPortal } from '../survey/SurveyRespondentPortal';

export function PublicSurveyViewer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyId, setSurveyId] = useState<string>('');
  const [isRequireLoginPrompt, setIsRequireLoginPrompt] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Extract surveyId from URL query or path
  useEffect(() => {
    let extractedId = '';
    const searchParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    if (searchParams.get('surveyId')) {
      extractedId = searchParams.get('surveyId') || '';
    } else if (searchParams.get('survey')) {
      extractedId = searchParams.get('survey') || '';
    } else if (searchParams.get('id') && (searchParams.get('view') === 'survey' || searchParams.get('view') === 'public_survey')) {
      extractedId = searchParams.get('id') || '';
    } else if (pathname.startsWith('/survey/')) {
      extractedId = pathname.replace('/survey/', '').split('/')[0];
    } else if (pathname.startsWith('/public/survey/')) {
      extractedId = pathname.replace('/public/survey/', '').split('/')[0];
    } else if (hash.includes('/survey/')) {
      const parts = hash.split('/survey/');
      if (parts[1]) extractedId = parts[1].split('?')[0].split('/')[0];
    }

    if (!extractedId) {
      // Default to first official template if none provided
      extractedId = 'survey_official_1';
    }

    // Enterprise-grade Address Bar Cleaner: Rewrite raw query-strings to clean, semantic RESTful paths instantly
    if (extractedId && typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const isQueryParamUrl = searchParams.has('surveyId') || searchParams.has('survey') || (searchParams.has('id') && searchParams.get('id') === extractedId);
      if (isQueryParamUrl) {
        const embedVal = searchParams.get('embed');
        let newPath = `/public/survey/${extractedId}`;
        if (embedVal) {
          newPath += `?embed=${embedVal}`;
        }
        window.history.replaceState({}, '', newPath);
      }
    }

    setSurveyId(extractedId);
    loadSurvey(extractedId);
  }, []);

  const loadSurvey = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Try fetching from server API
      const res = await fetch(`/api/surveys/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setSurvey(data);
          checkSurveyAccess(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch survey fallback:', e);
    }

    // 2. Try fetching from localStorage cache
    try {
      const cached = localStorage.getItem('edms_surveys_cache');
      if (cached) {
        const list: Survey[] = JSON.parse(cached);
        const match = list.find(s => s.id === id);
        if (match) {
          setSurvey(match);
          checkSurveyAccess(match);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 3. Try matching default official templates
    const officialMatch = OFFICIAL_SURVEY_TEMPLATES.find((tpl, idx) => {
      const tplId = `survey_official_${idx + 1}`;
      return tplId === id || tpl.title.includes(id);
    });

    if (officialMatch) {
      const fallbackSurvey: Survey = {
        ...officialMatch,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorId: 'system',
        creatorName: 'สำนักงาน ปภ. จังหวัดระยอง',
        viewCount: 1,
        responseCount: 0
      };
      setSurvey(fallbackSurvey);
      checkSurveyAccess(fallbackSurvey);
      setLoading(false);
      return;
    }

    // 4. If no exact match and id starts with 'survey_', pick the first available official template
    if (OFFICIAL_SURVEY_TEMPLATES.length > 0) {
      const fallbackSurvey: Survey = {
        ...OFFICIAL_SURVEY_TEMPLATES[0],
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorId: 'system',
        creatorName: 'สำนักงาน ปภ. จังหวัดระยอง',
        viewCount: 1,
        responseCount: 0
      };
      setSurvey(fallbackSurvey);
      checkSurveyAccess(fallbackSurvey);
      setLoading(false);
      return;
    }

    setError('ไม่พบแบบสำรวจที่ท่านต้องการตอบ หรือแบบสำรวจอาจถูกลบไปแล้ว');
    setLoading(false);
  };

  const checkSurveyAccess = (s: Survey) => {
    if (s.settings?.requireLogin) {
      // Check if user is already authenticated in session
      const authUser = localStorage.getItem('edms_user_data') || sessionStorage.getItem('edms_user_data');
      if (!authUser) {
        setIsRequireLoginPrompt(true);
      }
    }
  };

  const handleSubmitResponse = async (respData: Omit<SurveyResponse, 'id' | 'submittedAt'>) => {
    const newResponse: SurveyResponse = {
      ...respData,
      surveyTitle: respData.surveyTitle || survey?.title,
      id: `resp_${Date.now()}`,
      submittedAt: new Date().toISOString()
    };

    try {
      // Send to server
      await fetch(`/api/surveys/${respData.surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResponse)
      });
    } catch (e) {
      console.warn('Failed to submit to API, saving locally:', e);
    }

    // Also persist in localStorage for instant sync
    try {
      const existing = localStorage.getItem(`survey_responses_${respData.surveyId}`);
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(newResponse);
      localStorage.setItem(`survey_responses_${respData.surveyId}`, JSON.stringify(list));

      // Increment response count in cache
      const cachedSurveys = localStorage.getItem('edms_surveys_cache');
      if (cachedSurveys) {
        const sList: Survey[] = JSON.parse(cachedSurveys);
        const updated = sList.map(s => s.id === respData.surveyId ? { ...s, responseCount: (s.responseCount || 0) + 1 } : s);
        localStorage.setItem('edms_surveys_cache', JSON.stringify(updated));
      }
    } catch (_) {}

    return true;
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword.trim()) {
      setPasswordError('กรุณากรอกรหัสผ่านเพื่อเข้าทำแบบสำรวจ');
      return;
    }
    // Accept standard demo or general staff access
    if (loginPassword === '1234' || loginPassword === 'admin' || loginPassword === 'ddpm' || loginPassword.length >= 4) {
      setIsRequireLoginPrompt(false);
      setPasswordError('');
    } else {
      setPasswordError('รหัสผ่านไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ');
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">กำลังโหลดแบบสำรวจ...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">ระบบกำลังเตรียมชุดคำถามสำหรับท่าน</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/40 text-center space-y-5 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">ไม่สามารถเปิดแบบสำรวจได้</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error || 'ไม่พบแบบสำรวจที่ท่านต้องการตอบในระบบ'}
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              ไปยังหน้าหลักระบบสารบรรณ
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Paused State
  if (survey.settings?.status === 'paused') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-amber-200 dark:border-amber-900/40 text-center space-y-5 max-w-md w-full animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
            <PauseCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบสำรวจนี้ปิดรับคำตอบชั่วคราว
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ขออภัยในความไม่สะดวก หน่วยงานผู้จัดทำได้ปิดรับความคิดเห็นหรือครบกำหนดระยะเวลาการสำรวจแล้ว ขอขอบพระคุณสำหรับความสนใจ
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
            {survey.title}
          </div>
        </div>
      </div>
    );
  }

  // Optional: Survey requires explicit login (only if creator specifically set requireLogin: true)
  if (isRequireLoginPrompt) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-5 max-w-md w-full animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              แบบสำรวจนี้กำหนดการยืนยันตัวตน
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              แบบสำรวจนี้เป็นแบบประเมินเฉพาะกลุ่ม/เจ้าหน้าที่ภายใน กรุณากรอกรหัสผ่านเพื่อเริ่มทำแบบสำรวจ
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-3 pt-2">
            <input
              type="password"
              placeholder="กรอกรหัสผ่านเข้าทำแบบสำรวจ..."
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                setPasswordError('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
            {passwordError && (
              <p className="text-xs font-bold text-rose-500 text-left">{passwordError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              ยืนยันและเริ่มตอบแบบสำรวจ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Public Respondent Form
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased py-4 sm:py-8 px-2 sm:px-4">
      {/* Top Brand Banner */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <img src="/ddpm-logo.svg" alt="DDPM" className="w-7 h-7 object-contain" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            แบบสำรวจและประเมินผลสารบรรณดิจิทัล
          </span>
        </div>
      </div>

      {/* Main Respondent Form */}
      <SurveyRespondentPortal
        survey={survey}
        onSubmit={handleSubmitResponse}
      />

      {/* Footer */}
      <div className="max-w-3xl mx-auto mt-8 pb-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
        <p>สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (สนง.ปภ.ระยอง)</p>
        <p className="text-[10px]">ระบบสารบรรณอิเล็กทรอนิกส์และแบบประเมินผลออนไลน์</p>
      </div>
    </div>
  );
}
