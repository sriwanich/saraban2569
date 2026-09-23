import { SurveyQuestion, SurveyLogicRule, SurveyLogicCondition } from '../types/survey';

function evaluateCondition(condition: SurveyLogicCondition, answersMap: Record<string, any>): boolean {
  const val = answersMap[condition.triggerQuestionId];
  const targetVal = condition.triggerValue;

  switch (condition.operator) {
    case 'equals':
      if (Array.isArray(val)) {
        return val.includes(targetVal);
      }
      return String(val ?? '') === String(targetVal ?? '');
    case 'not_equals':
      if (Array.isArray(val)) {
        return !val.includes(targetVal);
      }
      return String(val ?? '') !== String(targetVal ?? '');
    case 'contains':
      if (Array.isArray(val)) {
        return val.some(item => String(item).toLowerCase().includes(String(targetVal).toLowerCase()));
      }
      return String(val ?? '').toLowerCase().includes(String(targetVal ?? '').toLowerCase());
    case 'not_contains':
      if (Array.isArray(val)) {
        return !val.some(item => String(item).toLowerCase().includes(String(targetVal).toLowerCase()));
      }
      return !String(val ?? '').toLowerCase().includes(String(targetVal ?? '').toLowerCase());
    case 'greater_than':
      return Number(val) > Number(targetVal);
    case 'greater_than_or_equal':
      return Number(val) >= Number(targetVal);
    case 'less_than':
      return Number(val) < Number(targetVal);
    case 'less_than_or_equal':
      return Number(val) <= Number(targetVal);
    case 'is_empty':
      return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    case 'is_not_empty':
    case 'is_answered':
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    default:
      return false;
  }
}

function evaluateRule(rule: SurveyLogicRule, answersMap: Record<string, any>): boolean {
  if (rule.conditions && rule.conditions.length > 0) {
    if (rule.conditionMatch === 'any') {
      return rule.conditions.some(cond => evaluateCondition(cond, answersMap));
    }
    return rule.conditions.every(cond => evaluateCondition(cond, answersMap));
  }

  // Legacy fallback
  if (rule.triggerQuestionId && rule.operator) {
    const singleCond: SurveyLogicCondition = {
      id: rule.id,
      triggerQuestionId: rule.triggerQuestionId,
      operator: rule.operator as any,
      triggerValue: rule.triggerValue
    };
    return evaluateCondition(singleCond, answersMap);
  }

  return false;
}

export function evaluateQuestionState(
  question: SurveyQuestion,
  answersMap: Record<string, any>,
  allQuestions: SurveyQuestion[] = []
): { isVisible: boolean; isRequired: boolean; disabled: boolean; activeRules: SurveyLogicRule[] } {
  let isVisible = true;
  let isRequired = Boolean(question.required);
  let disabled = false;
  const activeRules: SurveyLogicRule[] = [];

  if (!question.logicRules || question.logicRules.length === 0) {
    return { isVisible, isRequired, disabled, activeRules };
  }

  for (const rule of question.logicRules) {
    const matched = evaluateRule(rule, answersMap);
    if (matched) {
      activeRules.push(rule);
      if (rule.action === 'show') {
        isVisible = true;
      } else if (rule.action === 'hide') {
        isVisible = false;
      } else if (rule.action === 'require') {
        isRequired = true;
      }
    } else {
      if (rule.action === 'show') {
        isVisible = false;
      }
    }
  }

  return { isVisible, isRequired, disabled, activeRules };
}

export function getReadableRuleDescription(rule: SurveyLogicRule): string {
  if (rule.description) return rule.description;
  const actionText = rule.action === 'show' ? 'แสดง' : rule.action === 'hide' ? 'ซ่อน' : rule.action === 'require' ? 'บังคับตอบ' : 'ข้ามไป';
  return `ถ้าเงื่อนไขตรงตามที่กำหนด ให้${actionText}ข้อนี้`;
}

export function normalizeRule(rule: Partial<SurveyLogicRule>): SurveyLogicRule {
  const normalized: SurveyLogicRule = {
    id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    action: rule.action || 'show',
    conditionMatch: rule.conditionMatch || 'all',
    conditions: rule.conditions || [],
    targetQuestionId: rule.targetQuestionId,
    description: rule.description,
    triggerQuestionId: rule.triggerQuestionId,
    operator: rule.operator as any,
    triggerValue: rule.triggerValue
  };

  if (normalized.conditions.length === 0 && normalized.triggerQuestionId && normalized.operator) {
    normalized.conditions.push({
      id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      triggerQuestionId: normalized.triggerQuestionId,
      operator: normalized.operator as any,
      triggerValue: normalized.triggerValue
    });
  }

  return normalized;
}

/**
 * Automated Scoring & Grading Engine (Enterprise Exam Mode)
 * Calculates scores, determines pass/fail, and generates evaluation summaries.
 */
export function calculateSurveyScore(questions: SurveyQuestion[], answers: Record<string, any>): {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  questionResults: Record<string, { isCorrect: boolean; score: number; maxScore: number; explanation?: string }>;
} {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const questionResults: Record<string, { isCorrect: boolean; score: number; maxScore: number; explanation?: string }> = {};

  questions.forEach(q => {
    if (q.type === 'section_header') return;

    // Default question score if not specified (Enterprise Standard)
    const weight = q.scoreWeight || q.questionScore || q.points || q.scorePoints || 1;
    let qScore = 0;
    let isCorrect = false;
    const ans = answers[q.id];

    switch (q.type) {
      case 'single_choice':
      case 'dropdown':
      case 'quiz_answer':
        const selectedOpt = q.options?.find(opt => String(opt.id) === String(ans) || String(opt.text) === String(ans));
        
        // Priority 1: Option-level correct flag or score
        if (selectedOpt && (selectedOpt.isCorrect || selectedOpt.score)) {
          qScore = selectedOpt.score || (selectedOpt.isCorrect ? weight : 0);
          isCorrect = selectedOpt.isCorrect || qScore >= weight;
        } 
        // Priority 2: Question-level correctAnswer string
        else if (q.correctAnswer) {
          const cleanAns = String(ans || '').trim().toLowerCase();
          const correctStr = String(q.correctAnswer).trim().toLowerCase();
          
          if (cleanAns === correctStr || (selectedOpt && String(selectedOpt.text).trim().toLowerCase() === correctStr)) {
            qScore = weight;
            isCorrect = true;
          }
        }
        break;

      case 'multiple_choice':
      case 'checkbox':
        if (Array.isArray(ans)) {
          const correctOpts = q.options?.filter(opt => opt.isCorrect) || [];
          const qCorrectAnswers = q.correctAnswers || (typeof q.correctAnswer === 'string' ? [q.correctAnswer] : (Array.isArray(q.correctAnswer) ? q.correctAnswer : []));
          
          if (correctOpts.length > 0 || qCorrectAnswers.length > 0) {
            const correctSet = new Set([
              ...correctOpts.map(opt => String(opt.id).toLowerCase()),
              ...correctOpts.map(opt => String(opt.text).toLowerCase()),
              ...qCorrectAnswers.map(a => String(a).toLowerCase())
            ]);

            const selectedValues = ans.map(a => String(a).toLowerCase());
            
            // Check if all selected are in correct set AND all required correct answers are selected
            // For simplicity in Enterprise Exam: Exact match required
            const matches = selectedValues.filter(v => correctSet.has(v));
            const isFullyCorrect = matches.length === selectedValues.length && (qCorrectAnswers.length > 0 ? matches.length >= qCorrectAnswers.length : matches.length === correctOpts.length);

            if (isFullyCorrect) {
              qScore = weight;
              isCorrect = true;
            } else if (matches.length > 0) {
              // Partial credit
              const totalCorrectNeeded = qCorrectAnswers.length || correctOpts.length;
              const partial = (matches.length / totalCorrectNeeded) * weight;
              qScore = Math.max(0, Number((partial - (selectedValues.length > totalCorrectNeeded ? 0.5 : 0)).toFixed(2)));
            }
          }
        }
        break;

      case 'rating_stars':
      case 'slider_score':
        qScore = Number(ans) || 0;
        isCorrect = qScore >= (q.maxScore || 5) * 0.8; // Correct if >= 80%
        break;

      case 'matrix_rating':
        if (typeof ans === 'object' && ans !== null) {
          let matrixSum = 0;
          const rows = q.matrixRows || [];
          rows.forEach(row => {
            matrixSum += Number(ans[row.id]) || 0;
          });
          qScore = rows.length > 0 ? matrixSum / rows.length : 0;
          isCorrect = qScore >= 4; // Correct if avg >= 4
        }
        break;

      case 'text_short':
      case 'number_input':
        const cleanAns = String(ans || '').trim().toLowerCase();
        const correctStr = String(q.correctAnswer || '').trim().toLowerCase();
        if (correctStr && cleanAns === correctStr) {
          qScore = weight;
          isCorrect = true;
        }
        break;
    }

    totalScore += qScore;
    maxPossibleScore += weight;
    questionResults[q.id] = {
      isCorrect,
      score: qScore,
      maxScore: weight,
      explanation: q.explanation || q.answerExplanation
    };
  });

  return {
    totalScore: Number(totalScore.toFixed(2)),
    maxPossibleScore,
    percentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0,
    questionResults
  };
}

export function getEvaluationResult(percentage: number, settings: any) {
  const passingPercent = settings.passingScorePercentage || settings.passingScorePercent || settings.quizPassPercent || 60;
  const isPassed = percentage >= passingPercent;
  
  // Default Grades if none provided
  const grades = settings.evaluationGrades || [
    { minPercent: 85, maxPercent: 100, levelName: 'ดีเยี่ยม (Excellent)', gradeCode: 'A', color: '#10b981' },
    { minPercent: 70, maxPercent: 84.99, levelName: 'ดีมาก (Very Good)', gradeCode: 'B', color: '#3b82f6' },
    { minPercent: passingPercent, maxPercent: 69.99, levelName: 'ผ่านเกณฑ์ (Pass)', gradeCode: 'C', color: '#8b5cf6' },
    { minPercent: 0, maxPercent: passingPercent - 0.01, levelName: 'ไม่ผ่านเกณฑ์ (Fail)', gradeCode: 'F', color: '#ef4444' }
  ];

  const matchedGrade = grades.find((g: any) => percentage >= g.minPercent && percentage <= g.maxPercent) || grades[grades.length - 1];

  return {
    ...matchedGrade,
    isPassed,
    percentage,
    passingPercent
  };
}
