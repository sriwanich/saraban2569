import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Survey, SurveyResponse } from '../../../types/survey';
import { SurveyRespondentPortal } from '../../survey/SurveyRespondentPortal';

interface SurveyPublicViewerProps {
  surveyId: string;
}

const SurveyPublicViewer: React.FC<SurveyPublicViewerProps> = ({ surveyId }) => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/surveys/${surveyId}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('ไม่พบแบบสำรวจ หรือเซิร์ฟเวอร์ยังไม่พร้อมให้บริการ');
      }
      const data = await res.json();
      setSurvey(data);
      
      // Increment view count in background
      fetch(`/api/surveys/${surveyId}/view`, { method: 'POST' }).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดแบบสำรวจได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (response: Omit<SurveyResponse, 'id' | 'submittedAt'>): Promise<boolean> => {
    if (!survey) return false;
    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      return res.ok;
    } catch (err) {
      console.error('Submission failed:', err);
      return false;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-[var(--text-muted)] font-bold uppercase text-xs tracking-widest">กำลังเตรียมแบบสำรวจ / ข้อสอบ...</p>
      </div>
    </div>
  );

  if (error || !survey) return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--bg-surface)] p-8 rounded-3xl shadow-xl border border-[var(--border-lighter)] text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">ไม่พบแบบสำรวจ หรือถูกปิดใช้งานแล้ว</h2>
          <p className="text-xs text-[var(--text-muted)] font-medium">กรุณาตรวจสอบลิงก์ หรือติดต่อเจ้าหน้าที่ผู้รับผิดชอบ</p>
        </div>
        <button 
          onClick={fetchSurvey} 
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <SurveyRespondentPortal 
        survey={survey} 
        onSubmit={handleSubmitResponse}
        isEmbedded={false}
      />
    </div>
  );
};

export default SurveyPublicViewer;
