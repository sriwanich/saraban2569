import React, { useState } from 'react';
import {
  X,
  GitBranch,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  FastForward,
  CheckSquare,
  Sparkles,
  Sliders,
  Star,
  Play
} from 'lucide-react';
import { SurveyQuestion, SurveyLogicRule, SurveyLogicCondition } from '../../types/survey';
import {
  normalizeRule,
  getReadableRuleDescription,
  evaluateQuestionState
} from '../../utils/surveyLogicEngine';

interface SurveyLogicModalProps {
  question: SurveyQuestion;
  allQuestions: SurveyQuestion[];
  onClose: () => void;
  onSaveRules: (questionId: string, rules: SurveyLogicRule[]) => void;
}

export const SurveyLogicModal: React.FC<SurveyLogicModalProps> = ({
  question,
  allQuestions,
  onClose,
  onSaveRules
}) => {
  // Current rules for this question
  const [rules, setRules] = useState<SurveyLogicRule[]>(
    (question.logicRules || []).map(normalizeRule)
  );

  // Active editing rule index (null if not currently creating/editing a specific rule)
  const [editingIndex, setEditingIndex] = useState<number | null>(
    rules.length > 0 ? 0 : null
  );

  // Test Simulator state (mock answers to test if logic works)
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // Candidate trigger questions (prefer questions before this one to avoid circular loops)
  const availableTriggerQuestions = allQuestions.filter(q => q.id !== question.id);
  const qIndex = allQuestions.findIndex(q => q.id === question.id);

  // Helper to add a new rule
  const handleAddNewRule = (
    action: SurveyLogicRule['action'] = 'show',
    presetCondition?: Partial<SurveyLogicCondition>
  ) => {
    const firstTrigger = availableTriggerQuestions[0];
    const initialCondition: SurveyLogicCondition = {
      id: `cond_${Date.now()}_1`,
      triggerQuestionId: presetCondition?.triggerQuestionId || firstTrigger?.id || '',
      operator: presetCondition?.operator || 'equals',
      triggerValue: presetCondition?.triggerValue !== undefined 
        ? presetCondition.triggerValue 
        : firstTrigger?.options?.[0]?.id || firstTrigger?.options?.[0]?.text || ''
    };

    const newRule: SurveyLogicRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `กฎตรรกะที่ ${rules.length + 1}`,
      action,
      conditionMatch: 'all',
      conditions: [initialCondition]
    };

    const nextRules = [...rules, newRule];
    setRules(nextRules);
    setEditingIndex(nextRules.length - 1);
  };

  // Helper to remove a rule
  const handleDeleteRule = (idx: number) => {
    const nextRules = rules.filter((_, i) => i !== idx);
    setRules(nextRules);
    if (editingIndex === idx) {
      setEditingIndex(nextRules.length > 0 ? 0 : null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  // Helper to update active rule
  const handleUpdateRule = (idx: number, patch: Partial<SurveyLogicRule>) => {
    setRules(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  // Condition handlers inside editing rule
  const handleAddCondition = (ruleIdx: number) => {
    const targetRule = rules[ruleIdx];
    if (!targetRule) return;

    const firstTrigger = availableTriggerQuestions[0];
    const newCond: SurveyLogicCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      triggerQuestionId: firstTrigger?.id || '',
      operator: 'equals',
      triggerValue: firstTrigger?.options?.[0]?.id || firstTrigger?.options?.[0]?.text || ''
    };

    handleUpdateRule(ruleIdx, {
      conditions: [...(targetRule.conditions || []), newCond]
    });
  };

  const handleUpdateCondition = (
    ruleIdx: number,
    condIdx: number,
    patch: Partial<SurveyLogicCondition>
  ) => {
    const targetRule = rules[ruleIdx];
    if (!targetRule) return;

    const nextConditions = [...targetRule.conditions];
    const updated = { ...nextConditions[condIdx], ...patch };

    // If trigger question changed, reset default operator and value
    if (patch.triggerQuestionId && patch.triggerQuestionId !== nextConditions[condIdx].triggerQuestionId) {
      const trigQ = allQuestions.find(q => q.id === patch.triggerQuestionId);
      if (trigQ?.type === 'rating_stars' || trigQ?.type === 'slider_score') {
        updated.operator = 'greater_than_or_equal';
        updated.triggerValue = 3;
      } else if (trigQ?.type === 'text_short' || trigQ?.type === 'text_long') {
        updated.operator = 'is_not_empty';
        updated.triggerValue = '';
      } else {
        updated.operator = 'equals';
        updated.triggerValue = trigQ?.options?.[0]?.id || trigQ?.options?.[0]?.text || '';
      }
    }

    nextConditions[condIdx] = updated;
    handleUpdateRule(ruleIdx, { conditions: nextConditions });
  };

  const handleDeleteCondition = (ruleIdx: number, condIdx: number) => {
    const targetRule = rules[ruleIdx];
    if (!targetRule) return;
    if (targetRule.conditions.length <= 1) {
      alert('กฎตรรกะต้องมีเงื่อนไขอย่างน้อย 1 เงื่อนไข');
      return;
    }
    const nextConditions = targetRule.conditions.filter((_, i) => i !== condIdx);
    handleUpdateRule(ruleIdx, { conditions: nextConditions });
  };

  // Quick Preset Handlers
  const handleApplyPreset = (presetType: 'low_rating' | 'other_specify' | 'jump_end' | 'govt_only') => {
    if (presetType === 'low_rating') {
      const ratingQ = availableTriggerQuestions.find(q => q.type === 'rating_stars' || q.type === 'slider_score');
      if (ratingQ) {
        handleAddNewRule('show', {
          triggerQuestionId: ratingQ.id,
          operator: 'less_than_or_equal',
          triggerValue: 2
        });
      } else {
        handleAddNewRule('show', { operator: 'less_than_or_equal', triggerValue: 2 });
      }
    } else if (presetType === 'other_specify') {
      const choiceQ = availableTriggerQuestions.find(q => q.options && q.options.length > 0);
      const otherOpt = choiceQ?.options?.find(o => o.text.includes('อื่น') || o.text.includes('Other'));
      handleAddNewRule('show', {
        triggerQuestionId: choiceQ?.id,
        operator: 'equals',
        triggerValue: otherOpt?.id || otherOpt?.text || 'อื่นๆ'
      });
    } else if (presetType === 'jump_end') {
      handleAddNewRule('jump_to_end');
    } else if (presetType === 'govt_only') {
      const firstChoice = availableTriggerQuestions.find(q => q.type === 'single_choice');
      handleAddNewRule('show', {
        triggerQuestionId: firstChoice?.id,
        operator: 'contains',
        triggerValue: 'เจ้าหน้าที่'
      });
    }
  };

  // Save changes and close
  const handleSaveAndClose = () => {
    onSaveRules(question.id, rules);
    onClose();
  };

  // Evaluate simulator state
  const simState = evaluateQuestionState(
    { ...question, logicRules: rules },
    allQuestions,
    testAnswers
  );

  const activeRule = editingIndex !== null ? rules[editingIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-b border-indigo-500/30 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shadow-inner">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-bold">
                  ข้อ {qIndex + 1}
                </span>
                <h3 className="text-base font-bold">
                  ตั้งค่าตรรกะเงื่อนไข & การแตกกิ่งคำถาม (Conditional Logic)
                </h3>
              </div>
              <p className="text-xs text-indigo-200 line-clamp-1 max-w-xl">
                กำหนดเงื่อนไขการแสดง/ซ่อน หรือข้ามข้อสำหรับ: {question.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Rule List & Presets */}
          <div className="w-full md:w-72 bg-[var(--bg-surface)] border-r border-[var(--border-lighter)] p-4 flex flex-col overflow-y-auto custom-scrollbar shrink-0 space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                กฎเงื่อนไขของข้อนี้ ({rules.length})
              </span>
              <button
                onClick={() => handleAddNewRule('show')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่มกฎ</span>
              </button>
            </div>

            {/* Rules List */}
            {rules.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-dashed border-[var(--border-lighter)] text-center space-y-2">
                <GitBranch className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-50" />
                <p className="text-xs text-[var(--text-secondary)] font-medium">ยังไม่มีการตั้งตรรกะเงื่อนไข</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  คำถามข้อนี้จะแสดงผลตามลำดับปกติเสมอ
                </p>
                <button
                  onClick={() => handleAddNewRule('show')}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all cursor-pointer"
                >
                  + เพิ่มกฎเงื่อนไขแรก
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((r, rIdx) => {
                  const isSelected = editingIndex === rIdx;
                  return (
                    <div
                      key={r.id || rIdx}
                      onClick={() => setEditingIndex(rIdx)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/30'
                          : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {r.action === 'show' && <Eye className="w-3.5 h-3.5 text-blue-500" />}
                          {r.action === 'hide' && <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
                          {r.action === 'jump_to_question' && <FastForward className="w-3.5 h-3.5 text-amber-500" />}
                          {r.action === 'jump_to_end' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {r.action === 'require' && <AlertCircle className="w-3.5 h-3.5 text-purple-500" />}
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {r.name || `กฎที่ ${rIdx + 1}`}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRule(rIdx);
                          }}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {getReadableRuleDescription(r, allQuestions)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Presets Section */}
            <div className="pt-3 border-t border-[var(--border-lighter)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                แม่แบบตรรกะด่วน (Quick Presets)
              </span>

              <div className="space-y-1.5">
                <button
                  onClick={() => handleApplyPreset('low_rating')}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-blue-500/10 border border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] hover:text-blue-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>แสดงเมื่อคะแนน &le; 2 ดาว (ถามสาเหตุ)</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('other_specify')}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-blue-500/10 border border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] hover:text-blue-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>แสดงเมื่อเลือกตัวเลือก "อื่นๆ"</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('govt_only')}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-blue-500/10 border border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] hover:text-blue-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>แสดงเฉพาะกลุ่มเจ้าหน้าที่ภาครัฐ</span>
                </button>

                <button
                  onClick={() => handleApplyPreset('jump_end')}
                  className="w-full text-left p-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-rose-500/10 border border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] hover:text-rose-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>ข้ามไปส่งแบบสำรวจทันที (Jump to End)</span>
                </button>
              </div>
            </div>

            {/* Test Simulator Toggle Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowSimulator(!showSimulator)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showSimulator
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-lighter)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{showSimulator ? 'ปิดโหมดจำลองทดสอบ' : '🎮 เปิดโหมดจำลองทดสอบ (Test Simulator)'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Rule Editor Panel */}
          <div className="flex-1 bg-[var(--bg-canvas)] p-5 overflow-y-auto custom-scrollbar flex flex-col space-y-5">
            
            {showSimulator ? (
              /* Interactive Simulator Sandbox */
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Play className="w-4 h-4 text-emerald-600" />
                      <span>โหมดจำลองทดสอบตรรกะแบบเรียลไทม์ (Logic Simulator)</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                      Live Testing
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
                    ลองจำลองเลือกคำตอบในข้อก่อนหน้า เพื่อดูว่าคำถามข้อนี้จะแสดงผลหรือซ่อนตามตรรกะที่ตั้งไว้หรือไม่
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface)] flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] block">สถานะผลลัพธ์ของคำถามข้อนี้:</span>
                    <span className={`text-base font-bold flex items-center gap-1.5 mt-0.5 ${
                      simState.isVisible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    }`}>
                      {simState.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      <span>{simState.isVisible ? 'คำถามนี้จะ "แสดงผล" (Visible)' : 'คำถามนี้จะ "ถูกซ่อน" (Hidden)'}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => setTestAnswers({})}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] cursor-pointer"
                  >
                    รีเซ็ตคำตอบทดสอบ
                  </button>
                </div>

                {/* Mock Answer Inputs for Available Trigger Questions */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">
                    เลือกคำตอบจำลองสำหรับข้อที่เกี่ยวข้อง:
                  </span>

                  <div className="space-y-3">
                    {availableTriggerQuestions.slice(0, 5).map((tq, idx) => (
                      <div key={tq.id} className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] space-y-2">
                        <span className="text-xs font-bold text-[var(--text-primary)] block">
                          ข้อ {idx + 1}. {tq.title}
                        </span>

                        {tq.options && tq.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {tq.options.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setTestAnswers(prev => ({ ...prev, [tq.id]: opt.id }))}
                                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                  testAnswers[tq.id] === opt.id
                                    ? 'bg-blue-600 text-white font-bold'
                                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-lighter)]'
                                }`}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        ) : tq.type === 'rating_stars' ? (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setTestAnswers(prev => ({ ...prev, [tq.id]: star }))}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  testAnswers[tq.id] === star
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-[var(--bg-canvas)] border border-[var(--border-lighter)]'
                                }`}
                              >
                                {star} ★
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="พิมพ์คำตอบจำลอง..."
                            value={testAnswers[tq.id] || ''}
                            onChange={(e) => setTestAnswers(prev => ({ ...prev, [tq.id]: e.target.value }))}
                            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeRule && editingIndex !== null ? (
              /* Rule Editor Details */
              <div className="space-y-5 animate-fade-in">
                {/* Rule Title & Action */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] space-y-4 shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">ชื่อกฎเงื่อนไข</label>
                      <input
                        type="text"
                        value={activeRule.name || ''}
                        onChange={(e) => handleUpdateRule(editingIndex, { name: e.target.value })}
                        placeholder="เช่น แสดงเมื่อให้คะแนนต่ำ..."
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">ผลลัพธ์การกระทำ (Action)</label>
                      <select
                        value={activeRule.action}
                        onChange={(e) => handleUpdateRule(editingIndex, { action: e.target.value as any })}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-blue-500"
                      >
                        <option value="show">👁️ แสดงคำถามนี้ (Show Question - ซ่อนไว้ก่อน)</option>
                        <option value="hide">🚫 ซ่อนคำถามนี้ (Hide Question)</option>
                        <option value="jump_to_question">⏩ ข้ามไปยังข้อคำถามที่กำหนด (Jump to Question)</option>
                        <option value="jump_to_end">🏁 ข้ามไปส่งแบบสำรวจทันที (Jump to End / Submit)</option>
                        <option value="require">⚠️ บังคับตอบเฉพาะเมื่อตรงเงื่อนไข (Dynamic Require)</option>
                      </select>
                    </div>
                  </div>

                  {/* Target Question Picker if jump_to_question */}
                  {activeRule.action === 'jump_to_question' && (
                    <div className="space-y-1 pt-2 border-t border-[var(--border-lighter)]">
                      <label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <FastForward className="w-4 h-4" />
                        <span>เลือกข้อคำถามปลายทางที่ต้องการกระโดดข้ามไป:</span>
                      </label>
                      <select
                        value={activeRule.targetQuestionId || ''}
                        onChange={(e) => handleUpdateRule(editingIndex, { targetQuestionId: e.target.value })}
                        className="w-full bg-[var(--bg-canvas)] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                      >
                        <option value="">-- เลือกข้อคำถามปลายทาง --</option>
                        {allQuestions.map((q, idx) => (
                          <option key={q.id} value={q.id}>
                            ข้อ {idx + 1}. {q.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Condition Match (AND / OR) */}
                  <div className="pt-2 border-t border-[var(--border-lighter)] flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      รูปแบบการตรวจสอบเงื่อนไข (Condition Matching):
                    </span>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
                      <button
                        type="button"
                        onClick={() => handleUpdateRule(editingIndex, { conditionMatch: 'all' })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeRule.conditionMatch === 'all'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        ตรงตามทุกข้อ (AND)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRule(editingIndex, { conditionMatch: 'any' })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeRule.conditionMatch === 'any'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        ตรงตามข้อใดข้อหนึ่ง (OR)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conditions List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      รายการเงื่อนไข ({activeRule.conditions?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddCondition(editingIndex)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มเงื่อนไขย่อย</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeRule.conditions?.map((cond, condIdx) => {
                      const trigQ = allQuestions.find(q => q.id === cond.triggerQuestionId);
                      const isNumericType = trigQ?.type === 'rating_stars' || trigQ?.type === 'slider_score';

                      return (
                        <div
                          key={cond.id || condIdx}
                          className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              เงื่อนไขที่ {condIdx + 1} {condIdx > 0 ? (activeRule.conditionMatch === 'all' ? '(และ - AND)' : '(หรือ - OR)') : ''}
                            </span>
                            {activeRule.conditions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCondition(editingIndex, condIdx)}
                                className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* 1. Trigger Question */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[var(--text-muted)]">เมื่อคำถามข้อ:</label>
                              <select
                                value={cond.triggerQuestionId}
                                onChange={(e) => handleUpdateCondition(editingIndex, condIdx, { triggerQuestionId: e.target.value })}
                                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                              >
                                {availableTriggerQuestions.map((tq, tIdx) => (
                                  <option key={tq.id} value={tq.id}>
                                    ข้อ {tIdx + 1}. {tq.title.slice(0, 30)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* 2. Operator */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[var(--text-muted)]">ตัวดำเนินการ (Operator):</label>
                              <select
                                value={cond.operator}
                                onChange={(e) => handleUpdateCondition(editingIndex, condIdx, { operator: e.target.value as any })}
                                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                              >
                                <option value="equals">เท่ากับ (Equals)</option>
                                <option value="not_equals">ไม่เท่ากับ (Not Equals)</option>
                                <option value="contains">ประกอบด้วย / มีคำว่า (Contains)</option>
                                <option value="not_contains">ไม่ประกอบด้วย (Not Contains)</option>
                                {isNumericType && (
                                  <>
                                    <option value="greater_than">มากกว่า (&gt;)</option>
                                    <option value="greater_than_or_equal">มากกว่าหรือเท่ากับ (&ge;)</option>
                                    <option value="less_than">น้อยกว่า (&lt;)</option>
                                    <option value="less_than_or_equal">น้อยกว่าหรือเท่ากับ (&le;)</option>
                                  </>
                                )}
                                <option value="is_answered">มีการตอบแล้ว (Answered)</option>
                                <option value="is_empty">ไม่มีการตอบ / เว้นว่าง (Empty)</option>
                              </select>
                            </div>

                            {/* 3. Trigger Value */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[var(--text-muted)]">ค่าคำตอบที่ตรงเงื่อนไข:</label>
                              {cond.operator === 'is_empty' || cond.operator === 'is_answered' ? (
                                <div className="p-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs text-[var(--text-muted)] text-center">
                                  ตรวจสอบสถานะการตอบ
                                </div>
                              ) : trigQ?.options && trigQ.options.length > 0 ? (
                                <select
                                  value={cond.triggerValue || ''}
                                  onChange={(e) => handleUpdateCondition(editingIndex, condIdx, { triggerValue: e.target.value })}
                                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                                >
                                  {trigQ.options.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.text}
                                    </option>
                                  ))}
                                </select>
                              ) : trigQ?.type === 'rating_stars' ? (
                                <select
                                  value={cond.triggerValue || 3}
                                  onChange={(e) => handleUpdateCondition(editingIndex, condIdx, { triggerValue: Number(e.target.value) })}
                                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                                >
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <option key={star} value={star}>{star} ดาว</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={cond.triggerValue || ''}
                                  onChange={(e) => handleUpdateCondition(editingIndex, condIdx, { triggerValue: e.target.value })}
                                  placeholder="พิมพ์ค่าคำตอบ..."
                                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Thai Preview Summary Card */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block">สรุปการทำงานของกฎข้อนี้:</span>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                    {getReadableRuleDescription(activeRule, allQuestions)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-auto text-center p-8 text-[var(--text-muted)] space-y-2">
                <GitBranch className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm font-semibold">เลือกกฎด้านซ้าย หรือกด "เพิ่มกฎ" เพื่อเริ่มกำหนดตรรกะ</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border-lighter)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="text-xs text-[var(--text-muted)]">
            <span>มีทั้งหมด </span>
            <span className="font-bold text-[var(--text-primary)]">{rules.length} กฎ</span>
            <span> ในคำถามข้อนี้</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกตรรกะเงื่อนไข</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
