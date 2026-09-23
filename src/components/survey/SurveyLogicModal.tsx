import React, { useState } from 'react';
import { X, Plus, Trash2, HelpCircle, AlertCircle, Check } from 'lucide-react';
import { SurveyQuestion, SurveyLogicRule, SurveyLogicCondition } from '../../types/survey';

interface SurveyLogicModalProps {
  question: SurveyQuestion;
  allQuestions: SurveyQuestion[];
  onClose: () => void;
  onSaveRules: (qId: string, rules: SurveyLogicRule[]) => void;
}

export const SurveyLogicModal: React.FC<SurveyLogicModalProps> = ({
  question,
  allQuestions,
  onClose,
  onSaveRules,
}) => {
  // Initialize rules with existing ones or an empty array
  const [rules, setRules] = useState<SurveyLogicRule[]>(() => {
    if (question.logicRules && question.logicRules.length > 0) {
      return JSON.parse(JSON.stringify(question.logicRules));
    }
    return [];
  });

  // Only allow selecting trigger questions that appear BEFORE the current question to prevent circular dependency
  const currentIdx = allQuestions.findIndex((q) => q.id === question.id);
  const eligibleQuestions = allQuestions.slice(0, currentIdx > 0 ? currentIdx : 0);

  const handleAddRule = () => {
    const newRule: SurveyLogicRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      action: 'show',
      conditionMatch: 'all',
      conditions: [
        {
          id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          triggerQuestionId: eligibleQuestions[0]?.id || '',
          operator: 'equals',
          triggerValue: '',
        },
      ],
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleUpdateRuleAction = (ruleId: string, action: SurveyLogicRule['action']) => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, action } : r))
    );
  };

  const handleUpdateRuleMatch = (ruleId: string, conditionMatch: SurveyLogicRule['conditionMatch']) => {
    setRules(
      rules.map((r) => (r.id === ruleId ? { ...r, conditionMatch } : r))
    );
  };

  const handleAddCondition = (ruleId: string) => {
    setRules(
      rules.map((r) => {
        if (r.id === ruleId) {
          const newCond: SurveyLogicCondition = {
            id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            triggerQuestionId: eligibleQuestions[0]?.id || '',
            operator: 'equals',
            triggerValue: '',
          };
          return { ...r, conditions: [...r.conditions, newCond] };
        }
        return r;
      })
    );
  };

  const handleRemoveCondition = (ruleId: string, condId: string) => {
    setRules(
      rules.map((r) => {
        if (r.id === ruleId) {
          // Keep at least one condition
          if (r.conditions.length <= 1) return r;
          return { ...r, conditions: r.conditions.filter((c) => c.id !== condId) };
        }
        return r;
      })
    );
  };

  const handleUpdateCondition = (
    ruleId: string,
    condId: string,
    updates: Partial<SurveyLogicCondition>
  ) => {
    setRules(
      rules.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            conditions: r.conditions.map((c) => {
              if (c.id === condId) {
                const newCond = { ...c, ...updates };
                // Reset trigger value if question changes
                if (updates.triggerQuestionId) {
                  newCond.triggerValue = '';
                }
                return newCond;
              }
              return c;
            }),
          };
        }
        return r;
      })
    );
  };

  const handleSave = () => {
    // Basic validation: filter out rules with empty trigger questions
    const validRules = rules.filter((r) => {
      return r.conditions.every((c) => c.triggerQuestionId !== '');
    });
    onSaveRules(question.id, validRules);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-lighter)] flex items-center justify-between bg-[var(--bg-canvas)] rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                ตั้งค่าเงื่อนไขการแสดงผล (Display Logic)
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                ตั้งค่าว่าข้อคำถามนี้จะแสดงขึ้น หรือซ่อน หรือบังคับตอบเมื่อไร
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Target Details */}
        <div className="px-5 py-3 bg-orange-500/5 border-b border-[var(--border-lighter)] text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-orange-700 dark:text-orange-400">เป้าหมาย:</span>{' '}
          <span className="text-[var(--text-primary)] font-medium">{question.title}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {eligibleQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                ไม่พบคำถามที่เหมาะสมสำหรับตั้งเงื่อนไข
              </p>
              <p className="text-[10px] text-[var(--text-muted)] max-w-xs">
                การตั้งเงื่อนไขต้องอ้างอิงจากคำถามข้อที่อยู่ก่อนหน้าข้อปัจจุบันเท่านั้น (ไม่สามารถอ้างอิงข้อหลังจากนี้หรือข้อตัวเองได้เพื่อความสมบูรณ์ทางโครงสร้าง)
              </p>
            </div>
          ) : (
            <>
              {rules.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[var(--border-lighter)] rounded-xl bg-[var(--bg-canvas)]">
                  <p className="text-xs text-[var(--text-muted)] mb-3">ยังไม่มีการเพิ่มเงื่อนไขใดๆ ในคำถามข้อนี้</p>
                  <button
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มเงื่อนไขแรก
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule, ruleIdx) => (
                    <div
                      key={rule.id}
                      className="p-4 border border-[var(--border-lighter)] rounded-xl bg-[var(--bg-canvas)] space-y-3 relative"
                    >
                      {/* Delete Rule button */}
                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="absolute top-4 right-4 p-1 text-[var(--text-muted)] hover:text-red-500 rounded hover:bg-red-500/10 transition"
                        title="ลบเงื่อนไขนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Rule Statement Header */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-orange-600">เงื่อนไขที่ {ruleIdx + 1}:</span>
                        
                        <span className="text-[var(--text-secondary)]">กำหนดให้</span>
                        <select
                          value={rule.action}
                          onChange={(e) => handleUpdateRuleAction(rule.id, e.target.value as any)}
                          className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-1.5 py-0.5 font-medium text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="show">แสดงคำถามนี้ (Show)</option>
                          <option value="hide">ซ่อนคำถามนี้ (Hide)</option>
                          <option value="require">บังคับตอบข้อนี้ (Require)</option>
                        </select>

                        <span className="text-[var(--text-secondary)]">เมื่อผลประเมินเข้าเกณฑ์</span>
                        <select
                          value={rule.conditionMatch}
                          onChange={(e) => handleUpdateRuleMatch(rule.id, e.target.value as any)}
                          className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-1.5 py-0.5 font-medium text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="all">ตรงครบทุกข้อข้างล่าง (AND)</option>
                          <option value="any">ตรงอย่างน้อยหนึ่งข้อ (OR)</option>
                        </select>
                      </div>

                      {/* Conditions list */}
                      <div className="space-y-2 border-l-2 border-orange-200 dark:border-orange-900/40 pl-3 pt-1">
                        {rule.conditions.map((cond, condIdx) => {
                          const triggerQ = eligibleQuestions.find((eq) => eq.id === cond.triggerQuestionId);
                          const hasOptions = triggerQ && (triggerQ.options && triggerQ.options.length > 0);

                          return (
                            <div key={cond.id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-[var(--text-muted)]">ข้อ {condIdx + 1}:</span>
                              
                              {/* Trigger Question Selector */}
                              <select
                                value={cond.triggerQuestionId}
                                onChange={(e) =>
                                  handleUpdateCondition(rule.id, cond.id, {
                                    triggerQuestionId: e.target.value,
                                  })
                                }
                                className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-2 py-1 max-w-[200px] sm:max-w-[250px] truncate text-[var(--text-primary)]"
                              >
                                {eligibleQuestions.map((eq, eqIdx) => (
                                  <option key={eq.id} value={eq.id}>
                                    Q{eqIdx + 1}: {eq.title}
                                  </option>
                                ))}
                              </select>

                              {/* Operator Selector */}
                              <select
                                value={cond.operator}
                                onChange={(e) =>
                                  handleUpdateCondition(rule.id, cond.id, {
                                    operator: e.target.value as any,
                                  })
                                }
                                className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-1.5 py-1 text-[var(--text-primary)]"
                              >
                                <option value="equals">เท่ากับ (=)</option>
                                <option value="not_equals">ไม่เท่ากับ (≠)</option>
                                <option value="contains">มีคำว่า (Contains)</option>
                                <option value="not_contains">ไม่มีคำว่า</option>
                                <option value="greater_than">มากกว่า (&gt;)</option>
                                <option value="less_than">น้อยกว่า (&lt;)</option>
                                <option value="is_empty">เว้นว่างไว้</option>
                                <option value="is_not_empty">มีการตอบกลับ</option>
                              </select>

                              {/* Trigger Value Input */}
                              {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                                <>
                                  {hasOptions ? (
                                    <select
                                      value={cond.triggerValue || ''}
                                      onChange={(e) =>
                                        handleUpdateCondition(rule.id, cond.id, {
                                          triggerValue: e.target.value,
                                        })
                                      }
                                      className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-2 py-1 text-[var(--text-primary)]"
                                    >
                                      <option value="">-- เลือกตัวเลือก --</option>
                                      {triggerQ.options?.map((opt) => (
                                        <option key={opt.id} value={opt.text}>
                                          {opt.text}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="พิมพ์คำตอบ..."
                                      value={cond.triggerValue || ''}
                                      onChange={(e) =>
                                        handleUpdateCondition(rule.id, cond.id, {
                                          triggerValue: e.target.value,
                                        })
                                      }
                                      className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded px-2 py-1 outline-none text-[var(--text-primary)] w-32"
                                    />
                                  )}
                                </>
                              )}

                              {/* Remove Condition Button */}
                              {rule.conditions.length > 1 && (
                                <button
                                  onClick={() => handleRemoveCondition(rule.id, cond.id)}
                                  className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition"
                                  title="ลบเงื่อนไขย่อยนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Condition button */}
                        <button
                          onClick={() => handleAddCondition(rule.id)}
                          className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 transition"
                        >
                          <Plus className="w-3 h-3" />
                          เพิ่มเกณฑ์ย่อยในเงื่อนไขนี้
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddRule}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[var(--border-lighter)] rounded-xl text-xs font-semibold text-orange-600 hover:bg-orange-500/5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มเงื่อนไขแยกกลุ่มใหม่ (OR Rule Block)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-lighter)] flex items-center justify-between bg-[var(--bg-canvas)] rounded-b-2xl shrink-0">
          <p className="text-[10px] text-[var(--text-muted)] max-w-[60%]">
            * ระบบตรรกะแบบสำรวจอัจฉริยะ (Smart Logic Evaluator) จะคัดกรองข้อมูลผู้ตอบก่อนนำส่งคำสั่งถัดไปแบบเรียลไทม์
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-[var(--border-lighter)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={eligibleQuestions.length === 0}
              className="px-4 py-1.5 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold shadow-sm transition inline-flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              บันทึกข้อกำหนด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
