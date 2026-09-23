import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Survey } from '../../types/survey';

interface AiSurveyGeneratorModalProps {
  onClose: () => void;
  onGenerate: (generatedData: Partial<Survey>) => Promise<void> | void;
}

export const AiSurveyGeneratorModal: React.FC<AiSurveyGeneratorModalProps> = ({
  onClose,
  onGenerate
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('satisfaction');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const quickPrompts = [
    'แบบสำรวจความพึงพอใจผู้รับบริการของสำนักงาน ปภ. จังหวัด',
    'แบบประเมินความพร้อมรับมืออุทกภัยและวาตภัยในชุมชน',
    'แบบทดสอบความรู้พื้นฐานการดับเพลิงและการซ้อมอพยพหนีไฟ',
    'แบบรับฟังความคิดเห็นประชาชนเกี่ยวกับการแจ้งเตือนภัยพิบัติ'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/surveys/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category, questionCount, topic: prompt, count: questionCount })
      });

      let generatedData: Partial<Survey> = {};
      if (res.ok) {
        const data = await res.json();
        generatedData = data.survey || data;
      } else {
        generatedData = {
          title: `แบบสำรวจ: ${prompt}`,
          description: `แบบสำรวจประเมิน ${prompt}`,
          category: category as any,
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              title: 'ระดับความพึงพอใจโดยรวมต่อการดำเนินการ',
              required: true,
              options: [
                { id: 'opt1', text: 'มากที่สุด (5)' },
                { id: 'opt2', text: 'มาก (4)' },
                { id: 'opt3', text: 'ปานกลาง (3)' },
                { id: 'opt4', text: 'น้อย (2)' },
                { id: 'opt5', text: 'ปรับปรุง (1)' }
              ]
            }
          ]
        };
      }

      await onGenerate(generatedData);
      onClose();
    } catch (e) {
      console.error('AI Survey Generator error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">สร้างแบบสำรวจด้วย AI (Gemini)</h3>
              <p className="text-xs text-[var(--text-muted)]">สร้างข้อสอบและแบบสำรวจอัจฉริยะอัตโนมัติ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">
              คำอธิบายหัวข้อหรือวัตถุประสงค์แบบสำรวจ
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="ระบุวัตถุประสงค์ เช่น แบบสำรวจประเมินความพึงพอใจการฝึกซ้อมแผนอพยพสึนามิ..."
              className="w-full bg-[var(--bg-muted)] border border-[var(--border-lighter)] rounded-2xl p-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Quick Prompts */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">
              ตัวอย่างหัวข้อยอดนิยม (คลิกเพื่อเลือก)
            </label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-muted)] hover:bg-purple-500/10 hover:text-purple-600 border border-[var(--border-lighter)] text-[var(--text-muted)] transition text-left"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-muted)] border border-[var(--border-lighter)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
              >
                <option value="satisfaction">ความพึงพอใจ (ก.พ.ร.)</option>
                <option value="disaster_readiness">ความพร้อมรับมือภัย</option>
                <option value="training">การฝึกอบรม/ฝึกซ้อม</option>
                <option value="assessment">การประเมินผล</option>
                <option value="exam_quiz">แบบทดสอบ/ข้อสอบ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">จำนวนคำถาม</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-[var(--bg-muted)] border border-[var(--border-lighter)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
              >
                <option value={3}>3 ข้อ (สั้นกระชับ)</option>
                <option value={5}>5 ข้อ (มาตรฐาน)</option>
                <option value={10}>10 ข้อ (ครอบคลุม)</option>
                <option value={15}>15 ข้อ (แบบทดสอบสมบูรณ์)</option>
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[var(--border-lighter)] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-primary)] font-semibold hover:bg-[var(--border-lighter)] transition text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-purple-500/20 text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังประมวลผลด้วย AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> สร้างแบบสำรวจ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
