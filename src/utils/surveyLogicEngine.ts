import { SurveyQuestion, SurveyLogicRule, SurveyLogicCondition } from '../types/survey';

/**
 * Normalizes a rule into the modern standard format with an array of conditions
 */
export function normalizeRule(rule: SurveyLogicRule): SurveyLogicRule {
  if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    return {
      ...rule,
      id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conditionMatch: rule.conditionMatch || 'all',
      conditions: rule.conditions.map(c => ({
        ...c,
        id: c.id || `cond_${Math.random().toString(36).substring(2, 6)}`
      }))
    };
  }

  // Convert legacy single-condition rule
  const legacyCondition: SurveyLogicCondition = {
    id: `cond_${Date.now()}`,
    triggerQuestionId: rule.triggerQuestionId || '',
    operator: (rule.operator as any) || 'equals',
    triggerValue: rule.triggerValue
  };

  return {
    id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: rule.name || 'กฎตรรกะเงื่อนไข',
    action: rule.action || 'show',
    conditionMatch: rule.conditionMatch || 'all',
    conditions: [legacyCondition],
    targetQuestionId: rule.targetQuestionId,
    description: rule.description
  };
}

/**
 * Evaluates a single condition against current answers
 */
export function evaluateCondition(
  condition: SurveyLogicCondition,
  answers: Record<string, any>,
  allQuestions: SurveyQuestion[]
): boolean {
  if (!condition.triggerQuestionId) return true;

  const triggerQuestion = allQuestions.find(q => q.id === condition.triggerQuestionId);
  const rawAnswer = answers[condition.triggerQuestionId];

  // Handle matrix row answer
  let answerVal = rawAnswer;
  if (triggerQuestion?.type === 'matrix_rating' && condition.matrixRowId) {
    answerVal = rawAnswer?.[condition.matrixRowId];
  }

  const { operator, triggerValue } = condition;

  switch (operator) {
    case 'is_empty':
      return answerVal === undefined || answerVal === null || answerVal === '' || (Array.isArray(answerVal) && answerVal.length === 0);

    case 'is_not_empty':
    case 'is_answered':
      return answerVal !== undefined && answerVal !== null && answerVal !== '' && (!Array.isArray(answerVal) || answerVal.length > 0);

    case 'equals':
      if (answerVal === undefined || answerVal === null) return false;
      if (Array.isArray(answerVal)) {
        return answerVal.length === 1 && String(answerVal[0]) === String(triggerValue);
      }
      return String(answerVal).trim().toLowerCase() === String(triggerValue).trim().toLowerCase();

    case 'not_equals':
      if (answerVal === undefined || answerVal === null) return true;
      if (Array.isArray(answerVal)) {
        return !answerVal.map(String).includes(String(triggerValue));
      }
      return String(answerVal).trim().toLowerCase() !== String(triggerValue).trim().toLowerCase();

    case 'contains':
      if (answerVal === undefined || answerVal === null) return false;
      if (Array.isArray(answerVal)) {
        return answerVal.map(String).includes(String(triggerValue));
      }
      return String(answerVal).toLowerCase().includes(String(triggerValue).toLowerCase());

    case 'not_contains':
      if (answerVal === undefined || answerVal === null) return true;
      if (Array.isArray(answerVal)) {
        return !answerVal.map(String).includes(String(triggerValue));
      }
      return !String(answerVal).toLowerCase().includes(String(triggerValue).toLowerCase());

    case 'greater_than': {
      const numAnswer = parseFloat(answerVal);
      const numTarget = parseFloat(triggerValue);
      if (isNaN(numAnswer) || isNaN(numTarget)) return false;
      return numAnswer > numTarget;
    }

    case 'greater_than_or_equal': {
      const numAnswer = parseFloat(answerVal);
      const numTarget = parseFloat(triggerValue);
      if (isNaN(numAnswer) || isNaN(numTarget)) return false;
      return numAnswer >= numTarget;
    }

    case 'less_than': {
      const numAnswer = parseFloat(answerVal);
      const numTarget = parseFloat(triggerValue);
      if (isNaN(numAnswer) || isNaN(numTarget)) return false;
      return numAnswer < numTarget;
    }

    case 'less_than_or_equal': {
      const numAnswer = parseFloat(answerVal);
      const numTarget = parseFloat(triggerValue);
      if (isNaN(numAnswer) || isNaN(numTarget)) return false;
      return numAnswer <= numTarget;
    }

    default:
      return true;
  }
}

/**
 * Evaluates a rule containing one or more conditions (with AND/OR logic)
 */
export function evaluateRule(
  rule: SurveyLogicRule,
  answers: Record<string, any>,
  allQuestions: SurveyQuestion[]
): boolean {
  const normRule = normalizeRule(rule);
  if (!normRule.conditions || normRule.conditions.length === 0) return true;

  if (normRule.conditionMatch === 'any') {
    // OR condition: true if ANY condition is met
    return normRule.conditions.some(cond => evaluateCondition(cond, answers, allQuestions));
  } else {
    // AND condition (default): true only if ALL conditions are met
    return normRule.conditions.every(cond => evaluateCondition(cond, answers, allQuestions));
  }
}

/**
 * Evaluates the full question state (visibility, required, active rules)
 */
export function evaluateQuestionState(
  question: SurveyQuestion,
  allQuestions: SurveyQuestion[],
  answers: Record<string, any>
): {
  isVisible: boolean;
  isRequired: boolean;
  activeRules: SurveyLogicRule[];
  reason?: string;
} {
  const rules = (question.logicRules || []).map(normalizeRule);

  if (rules.length === 0) {
    return {
      isVisible: true,
      isRequired: question.required,
      activeRules: []
    };
  }

  const showRules = rules.filter(r => r.action === 'show');
  const hideRules = rules.filter(r => r.action === 'hide');
  const requireRules = rules.filter(r => r.action === 'require');

  let isVisible = true;
  const activeRules: SurveyLogicRule[] = [];

  // If there are 'show' rules, the question is HIDDEN by default until at least one 'show' rule evaluates to true
  if (showRules.length > 0) {
    const showMatched = showRules.some(r => {
      const passed = evaluateRule(r, answers, allQuestions);
      if (passed) activeRules.push(r);
      return passed;
    });
    isVisible = showMatched;
  }

  // If there are 'hide' rules, check if any hide rule is triggered
  if (isVisible && hideRules.length > 0) {
    const hideMatched = hideRules.some(r => {
      const passed = evaluateRule(r, answers, allQuestions);
      if (passed) activeRules.push(r);
      return passed;
    });
    if (hideMatched) {
      isVisible = false;
    }
  }

  // Check dynamic requirement overrides
  let isRequired = question.required;
  if (requireRules.length > 0) {
    const reqMatched = requireRules.some(r => {
      const passed = evaluateRule(r, answers, allQuestions);
      if (passed) activeRules.push(r);
      return passed;
    });
    if (reqMatched) {
      isRequired = true;
    }
  }

  return {
    isVisible,
    isRequired,
    activeRules
  };
}

/**
 * Evaluates Jump / Skip Logic after answering questions
 */
export function evaluateJumpTargets(
  allQuestions: SurveyQuestion[],
  answers: Record<string, any>
): {
  jumpToEnd: boolean;
  jumpTargetQuestionId?: string;
} {
  for (const q of allQuestions) {
    const rules = (q.logicRules || []).map(normalizeRule);
    for (const rule of rules) {
      if (rule.action === 'jump_to_end' && evaluateRule(rule, answers, allQuestions)) {
        return { jumpToEnd: true };
      }
      if (rule.action === 'jump_to_question' && rule.targetQuestionId && evaluateRule(rule, answers, allQuestions)) {
        return { jumpToEnd: false, jumpTargetQuestionId: rule.targetQuestionId };
      }
    }
  }

  return { jumpToEnd: false };
}

/**
 * Returns list of currently visible and active questions in order
 */
export function getActiveVisibleQuestions(
  allQuestions: SurveyQuestion[],
  answers: Record<string, any>
): SurveyQuestion[] {
  return allQuestions.filter(q => {
    const { isVisible } = evaluateQuestionState(q, allQuestions, answers);
    return isVisible;
  });
}

/**
 * Generates an elegant Thai readable summary for a logic rule
 */
export function getReadableRuleDescription(
  rule: SurveyLogicRule,
  allQuestions: SurveyQuestion[]
): string {
  const normRule = normalizeRule(rule);
  if (!normRule.conditions || normRule.conditions.length === 0) return 'ไม่มีเงื่อนไขกำหนด';

  const actionText = 
    normRule.action === 'show' ? '👁️ แสดงคำถามนี้' :
    normRule.action === 'hide' ? '🚫 ซ่อนคำถามนี้' :
    normRule.action === 'jump_to_question' ? `⏩ ข้ามไปยังข้อที่กำหนด` :
    normRule.action === 'jump_to_end' ? '🏁 ข้ามไปส่งแบบสำรวจทันที' :
    normRule.action === 'require' ? '⚠️ บังคับตอบ' : 'ดำเนินการ';

  const conditionStrings = normRule.conditions.map(cond => {
    const trigQ = allQuestions.find(q => q.id === cond.triggerQuestionId);
    const qIndex = allQuestions.findIndex(q => q.id === cond.triggerQuestionId);
    const qLabel = trigQ ? `[ข้อ ${qIndex + 1}. ${trigQ.title.slice(0, 25)}${trigQ.title.length > 25 ? '...' : ''}]` : `[คำถาม ID: ${cond.triggerQuestionId}]`;

    // Operator in Thai
    let opText = '';
    let valText = String(cond.triggerValue ?? '');

    // Check if trigger value is an option ID and find label
    if (trigQ?.options && cond.triggerValue) {
      const opt = trigQ.options.find(o => o.id === cond.triggerValue || o.text === cond.triggerValue);
      if (opt) valText = `"${opt.text}"`;
    }

    switch (cond.operator) {
      case 'equals':
        opText = `เท่ากับ ${valText}`;
        break;
      case 'not_equals':
        opText = `ไม่เท่ากับ ${valText}`;
        break;
      case 'contains':
        opText = `เลือกหรือมีคำว่า ${valText}`;
        break;
      case 'not_contains':
        opText = `ไม่เลือก ${valText}`;
        break;
      case 'greater_than':
        opText = `มากกว่า ${valText}`;
        break;
      case 'greater_than_or_equal':
        opText = `มากกว่าหรือเท่ากับ ${valText}`;
        break;
      case 'less_than':
        opText = `น้อยกว่า ${valText}`;
        break;
      case 'less_than_or_equal':
        opText = `น้อยกว่าหรือเท่ากับ ${valText}`;
        break;
      case 'is_empty':
        opText = 'ไม่มีการตอบ/เว้นว่าง';
        break;
      case 'is_not_empty':
      case 'is_answered':
        opText = 'มีการตอบแล้ว';
        break;
      default:
        opText = `${cond.operator} ${valText}`;
    }

    return `${qLabel} ${opText}`;
  });

  const joinWord = normRule.conditionMatch === 'any' ? ' หรือ ' : ' และ ';
  return `${actionText} เมื่อ: ${conditionStrings.join(joinWord)}`;
}
