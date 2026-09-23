import React, { useState } from 'react';
import { GitBranch, Edit3, Settings, Eye, AlertTriangle, ArrowDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import { SurveyQuestion } from '../../types/survey';

interface SurveyLogicFlowMapProps {
  questions: SurveyQuestion[];
  onOpenLogicModal: (question: SurveyQuestion) => void;
  onSelectQuestion: (questionId: string) => void;
}

export const SurveyLogicFlowMap: React.FC<SurveyLogicFlowMapProps> = ({
  questions,
  onOpenLogicModal,
  onSelectQuestion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Check for logical warnings (e.g., question referencing a future question, or missing rules)
  const getLogicStatus = (q: SurveyQuestion, index: number) => {
    if (!q.logicRules || q.logicRules.length === 0) {
      return { status: 'static', message: 'แสดงตลอดเวลา (Static Node)' };
    }

    const issues: string[] = [];
    q.logicRules.forEach((rule) => {
      rule.conditions.forEach((cond) => {
        const triggerIndex = questions.findIndex((t) => t.id === cond.triggerQuestionId);
        if (triggerIndex === -1) {
          issues.push(`อ้างอิงคำถามที่ไม่มีอยู่จริง (ID: ${cond.triggerQuestionId})`);
        } else if (triggerIndex >= index) {
          issues.push(`เกิดตรรกะแบบวนรอบ: อ้างอิงคำถามข้อที่ ${triggerIndex + 1} ซึ่งอยู่หลังข้อนี้`);
        }
      });
    });

    if (issues.length > 0) {
      return { status: 'error', message: issues.join(', ') };
    }

    return { status: 'conditional', message: `มีตรรกะเชื่อมโยง (${q.logicRules.length} เงื่อนไข)` };
  };

  const filteredQuestions = questions.filter((q) =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-lighter)] overflow-hidden h-full">
      
      {/* Visual Header */}
      <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-orange-600" />
            แผนผังตรรกะการข้ามและเงื่อนไข (Smart Flow Mapping)
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            ตรวจสอบทิศทางการจัดส่งแบบสำรวจ ความเชื่อมโยงแบบมีเงื่อนไขของข้อคำถามทุกข้อ
          </p>
        </div>
        
        {/* Search */}
        <input
          type="text"
          placeholder="ค้นหาข้อคำถาม..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none w-full sm:w-48 placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* Map Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-[var(--text-muted)]">ไม่พบข้อคำถามที่สอดคล้องกับการค้นหา</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-3">
            {filteredQuestions.map((q, idx) => {
              const fullIndex = questions.findIndex((t) => t.id === q.id);
              const { status, message } = getLogicStatus(q, fullIndex);

              return (
                <div key={q.id} className="flex flex-col items-center">
                  
                  {/* Question Node Card */}
                  <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-orange-500/30 rounded-xl p-3.5 shadow-sm transition flex items-start gap-3">
                    
                    {/* Index Bullet */}
                    <div className="w-6 h-6 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-lighter)] flex items-center justify-center font-bold text-[10px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                      Q{fullIndex + 1}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {q.type.replace('_', ' ')}
                        </span>
                        
                        {/* Status pill */}
                        {status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold text-[9px]">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            ตรรกะขัดแย้ง
                          </span>
                        )}
                        {status === 'conditional' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-bold text-[9px]">
                            <GitBranch className="w-2.5 h-2.5" />
                            แสดงตามเงื่อนไข
                          </span>
                        )}
                        {status === 'static' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-bold text-[9px]">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            แสดงถาวร
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-xs text-[var(--text-primary)] truncate">
                        {q.title}
                      </h5>

                      {/* Rule details rendering */}
                      {q.logicRules && q.logicRules.length > 0 && (
                        <div className="bg-[var(--bg-canvas)] rounded-lg p-2 border border-[var(--border-lighter)] text-[10px] text-[var(--text-secondary)] space-y-1">
                          {q.logicRules.map((rule, ruleIdx) => (
                            <div key={rule.id} className="flex flex-wrap items-center gap-1">
                              <span className="font-bold text-orange-600">เงื่อนไข {ruleIdx + 1}:</span>
                              <span>จะ</span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {rule.action === 'show' ? 'แสดง' : rule.action === 'hide' ? 'ซ่อน' : 'บังคับตอบ'}
                              </span>
                              <span>เมื่อ</span>
                              {rule.conditions.map((cond, condIdx) => {
                                const targetQIdx = questions.findIndex((t) => t.id === cond.triggerQuestionId);
                                return (
                                  <span key={cond.id} className="bg-black/5 dark:bg-white/5 px-1 rounded text-[9px]">
                                    {condIdx > 0 ? ` ${rule.conditionMatch === 'all' ? 'และ' : 'หรือ'} ` : ''}
                                    Q{targetQIdx + 1} {cond.operator === 'equals' ? '=' : cond.operator === 'not_equals' ? '≠' : cond.operator} '{cond.triggerValue}'
                                  </span>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warning Message if any */}
                      {status === 'error' && (
                        <p className="text-[9px] text-red-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {message}
                        </p>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => onOpenLogicModal(q)}
                        className="p-1.5 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-orange-600 hover:border-orange-500/20 transition"
                        title="ตั้งค่า/แก้ไขเงื่อนไข"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-blue-600 hover:border-blue-500/20 transition"
                        title="แก้ไขคำถามข้อนี้"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Flow Arrow (only if not the last item) */}
                  {idx < filteredQuestions.length - 1 && (
                    <div className="py-1 flex flex-col items-center">
                      <ArrowDown className="w-4 h-4 text-[var(--text-muted)] animate-bounce" />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
