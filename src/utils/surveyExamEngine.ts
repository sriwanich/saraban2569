import { Survey, SurveyQuestion, SurveyResponse } from '../types/survey';

/**
 * Validates Thai Citizen ID (13 Digits) using standard Modulo 11 checksum algorithm
 */
export function validateThaiCitizenId(id: string): boolean {
  if (!id) return false;
  const cleaned = id.replace(/[-\s]/g, '');
  if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleaned.charAt(12), 10);
}

/**
 * Validates Thai Phone Number (10 Digits starting with 0)
 */
export function validateThaiPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[-\s()]/g, '');
  return /^0[689]\d{8}$/.test(cleaned) || /^0[23457]\d{7,8}$/.test(cleaned);
}

/**
 * Validates Email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Calculates Exam Score and Pass/Fail result for a given survey and respondent answers
 */
export interface ExamEvaluationResult {
  scoreObtained: number;
  maxPossibleScore: number;
  scorePercentage: number;
  passedExam: boolean;
  questionResults: Record<
    string,
    {
      isCorrect: boolean;
      scoreEarned: number;
      maxScore: number;
      userAnswer: any;
      correctAnswer: any;
      explanation?: string;
    }
  >;
}

export function evaluateExamSubmission(
  survey: Survey,
  answers: Record<string, any>
): ExamEvaluationResult {
  let scoreObtained = 0;
  let maxPossibleScore = 0;
  const questionResults: ExamEvaluationResult['questionResults'] = {};

  const isExam = survey.settings?.isExamMode ?? false;
  const passingPercentage = survey.settings?.passingScorePercentage ?? 70;

  survey.questions.forEach((q, idx) => {
    // Only evaluate gradable question types
    if (['section_header', 'contact_info', 'rsvp_status'].includes(q.type)) {
      return;
    }

    const weight = q.scoreWeight ?? 1;
    const maxScore = weight;
    maxPossibleScore += maxScore;

    const userAns = answers[q.id];
    let isCorrect = false;
    let scoreEarned = 0;

    if (q.type === 'single_choice' || q.type === 'image_choice' || q.type === 'dropdown') {
      // Check if correct option is designated
      const correctOpt = q.options?.find(o => o.isCorrect || (q.correctAnswers && String(q.correctAnswers) === o.id || String(q.correctAnswers) === o.text));
      const targetVal = correctOpt ? correctOpt.text : q.correctAnswers;

      if (targetVal !== undefined && targetVal !== null && targetVal !== '') {
        if (String(userAns).trim().toLowerCase() === String(targetVal).trim().toLowerCase()) {
          isCorrect = true;
          scoreEarned = maxScore;
        }
      } else {
        // Fallback to option score
        const chosenOpt = q.options?.find(o => o.text === userAns || o.id === userAns);
        if (chosenOpt?.score !== undefined) {
          scoreEarned = chosenOpt.score;
          isCorrect = scoreEarned > 0;
        }
      }
    } else if (q.type === 'multiple_choice') {
      const correctOpts = q.options?.filter(o => o.isCorrect) || [];
      const correctTexts = correctOpts.map(o => o.text);

      if (correctTexts.length > 0 && Array.isArray(userAns)) {
        const userSet = new Set(userAns.map(String));
        const correctSet = new Set(correctTexts.map(String));
        
        // Exact match
        if (userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val))) {
          isCorrect = true;
          scoreEarned = maxScore;
        } else {
          // Partial credit: correct picks minus incorrect picks
          let matchCount = 0;
          let wrongCount = 0;
          userAns.forEach(ans => {
            if (correctSet.has(String(ans))) matchCount++;
            else wrongCount++;
          });
          const partial = Math.max(0, (matchCount - wrongCount) / correctTexts.length) * maxScore;
          scoreEarned = Math.round(partial * 10) / 10;
          isCorrect = scoreEarned === maxScore;
        }
      }
    } else if (q.type === 'rating_stars' || q.type === 'slider_score' || q.type === 'nps_score') {
      if (typeof userAns === 'number') {
        const maxVal = q.maxScore || 10;
        const minVal = q.minScore || 0;
        scoreEarned = Math.min(maxScore, ((userAns - minVal) / Math.max(1, maxVal - minVal)) * maxScore);
        isCorrect = scoreEarned >= maxScore * 0.7;
      }
    } else if (q.type === 'matrix_rating') {
      if (userAns && typeof userAns === 'object') {
        const rowCount = q.matrixRows?.length || 1;
        let matrixTotal = 0;
        let matrixMax = 0;
        const maxColScore = Math.max(...(q.matrixCols?.map(c => typeof c === 'string' ? 5 : (c.score ?? 5)) || [5]));

        q.matrixRows?.forEach(row => {
          const rowId = typeof row === 'string' ? row : row.id || row.text;
          const val = userAns[rowId];
          if (typeof val === 'number') {
            matrixTotal += val;
          }
          matrixMax += maxColScore;
        });

        scoreEarned = matrixMax > 0 ? (matrixTotal / matrixMax) * maxScore : 0;
        isCorrect = scoreEarned >= maxScore * 0.7;
      }
    } else if (q.type === 'text_short' && q.correctAnswers) {
      const cleanUser = String(userAns || '').trim().toLowerCase();
      const cleanCorrect = String(q.correctAnswers).trim().toLowerCase();
      if (cleanUser === cleanCorrect) {
        isCorrect = true;
        scoreEarned = maxScore;
      }
    }

    scoreObtained += scoreEarned;
    questionResults[q.id] = {
      isCorrect,
      scoreEarned,
      maxScore,
      userAnswer: userAns,
      correctAnswer: q.correctAnswers || q.options?.filter(o => o.isCorrect).map(o => o.text),
      explanation: q.explanation
    };
  });

  const scorePercentage = maxPossibleScore > 0 
    ? Math.round((scoreObtained / maxPossibleScore) * 1000) / 10 
    : 100;

  const passedExam = scorePercentage >= passingPercentage;

  return {
    scoreObtained: Math.round(scoreObtained * 10) / 10,
    maxPossibleScore: Math.round(maxPossibleScore * 10) / 10,
    scorePercentage,
    passedExam,
    questionResults
  };
}

/**
 * Calculates dynamic formula score (e.g. SUM, AVG, or mathematical expressions)
 */
export function evaluateFormula(formula: string, answers: Record<string, any>, questions: SurveyQuestion[]): number {
  if (!formula) return 0;
  try {
    let expr = formula;
    // Replace question tokens like q1, q_rating with numeric values
    questions.forEach(q => {
      const val = answers[q.id];
      let numVal = 0;
      if (typeof val === 'number') {
        numVal = val;
      } else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
        numVal = parseFloat(val);
      } else if (val && typeof val === 'object') {
        // Sum of matrix
        numVal = (Object.values(val) as any[]).reduce((acc: number, cur: any) => acc + (typeof cur === 'number' ? cur : 0), 0);
      }
      expr = expr.replace(new RegExp(`\\b${q.id}\\b`, 'g'), String(numVal));
    });

    // Handle helper functions
    expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) => {
      const items = args.split(',').map((x: string) => parseFloat(x.trim()) || 0);
      return String(items.reduce((a: number, b: number) => a + b, 0));
    });

    expr = expr.replace(/AVG\(([^)]+)\)/gi, (_, args) => {
      const items = args.split(',').map((x: string) => parseFloat(x.trim()) || 0);
      return String(items.length ? items.reduce((a: number, b: number) => a + b, 0) / items.length : 0);
    });

    // Sanitize and evaluate math safely
    if (/^[\d+\-*/().\s]+$/.test(expr)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${expr})`)();
      return typeof result === 'number' && !isNaN(result) ? Math.round(result * 100) / 100 : 0;
    }
  } catch (err) {
    console.warn('Formula evaluation error:', err);
  }
  return 0;
}
