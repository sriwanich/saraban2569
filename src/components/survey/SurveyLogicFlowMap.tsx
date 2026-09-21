import React, { useState } from 'react';
import {
  GitBranch,
  Eye,
  EyeOff,
  FastForward,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowDown,
  ArrowRight,
  Filter,
  Plus,
  Settings2
} from 'lucide-react';
import { SurveyQuestion, SurveyLogicRule } from '../../types/survey';
import {
  normalizeRule,
  getReadableRuleDescription
} from '../../utils/surveyLogicEngine';

interface SurveyLogicFlowMapProps {
  questions: SurveyQuestion[];
  onOpenLogicModal: (question: SurveyQuestion) => void;
  onSelectQuestion: (questionId: string) => void;
}

export const SurveyLogicFlowMap: React.FC<SurveyLogicFlowMapProps> = ({
  questions,
  onOpenLogicModal,
  onSelectQuestion
}) => {
  const [filterType, setFilterType] = useState<'all' | 'has_logic' | 'no_logic'>('all');

  const questionsWithLogic = questions.filter(q => q.logicRules && q.logicRules.length > 0);
  const totalRulesCount = questions.reduce((acc, q) => acc + (q.logicRules?.length || 0), 0);

  const displayedQuestions = questions.filter(q => {
    if (filterType === 'has_logic') return q.logicRules && q.logicRules.length > 0;
    if (filterType === 'no_logic') return !q.logicRules || q.logicRules.length === 0;
    return true;
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-canvas)] overflow-hidden text-left">
      {/* Header Bar */}
      <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-lighter)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>แผนผังเส้นทางตรรกะ & การแตกกิ่งคำถาม (Logic Flow Map)</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-mono font-bold">
                {totalRulesCount} กฎเงื่อนไข
              </span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              เห็นภาพรวมความเชื่อมโยง เงื่อนไขการแสดงผล และจุดกระโดดข้ามข้อของแบบสำรวจทั้งชุด
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            ทั้งหมด ({questions.length})
          </button>
          <button
            onClick={() => setFilterType('has_logic')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'has_logic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            เฉพาะข้อที่มีตรรกะ ({questionsWithLogic.length})
          </button>
          <button
            onClick={() => setFilterType('no_logic')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'no_logic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            ข้อทั่วไป ({questions.length - questionsWithLogic.length})
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {displayedQuestions.map((q, idx) => {
            const rules = (q.logicRules || []).map(normalizeRule);
            const hasRules = rules.length > 0;
            const originalIndex = questions.findIndex(item => item.id === q.id);

            return (
              <div key={q.id} className="relative">
                {/* Connecting Line */}
                {idx < displayedQuestions.length - 1 && (
                  <div className="absolute left-7 top-full h-4 w-0.5 bg-slate-300 dark:bg-slate-700 -z-0" />
                )}

                <div
                  className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    hasRules
                      ? 'bg-[var(--bg-surface)] border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                      : 'bg-[var(--bg-surface)] border-[var(--border-lighter)] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Left: Question Badge & Title */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        hasRules
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-secondary)]'
                      }`}>
                        {originalIndex + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {q.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-lighter)]">
                            {q.type}
                          </span>
                          {q.required && (
                            <span className="text-xs font-bold text-rose-500">*จำเป็น</span>
                          )}
                        </div>

                        {q.description && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                            {q.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenLogicModal(q)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          hasRules
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border border-blue-500/30'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 border border-[var(--border-lighter)]'
                        }`}
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>{hasRules ? `แก้ไขตรรกะ (${rules.length})` : '+ ตั้งตรรกะเงื่อนไข'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Logic Rules Detail Card */}
                  {hasRules && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-lighter)] space-y-2">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        เงื่อนไขที่ทำงานกับข้อนี้ ({rules.length} กฎ):
                      </span>

                      <div className="space-y-1.5">
                        {rules.map((rule, rIdx) => (
                          <div
                            key={rule.id || rIdx}
                            className="p-2.5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs flex items-start justify-between gap-2"
                          >
                            <div className="flex items-start gap-2">
                              {rule.action === 'show' && <Eye className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                              {rule.action === 'hide' && <EyeOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                              {rule.action === 'jump_to_question' && <FastForward className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                              {rule.action === 'jump_to_end' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                              {rule.action === 'require' && <AlertCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}

                              <span className="text-[var(--text-secondary)] leading-relaxed font-medium">
                                {getReadableRuleDescription(rule, questions)}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 shrink-0">
                              {rule.conditionMatch === 'all' ? 'AND (ทุกข้อ)' : 'OR (ข้อใดข้อหนึ่ง)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
