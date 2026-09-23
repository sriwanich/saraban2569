import { Survey, SurveyQuestion, SurveyResponse } from '../types/survey';

export interface ExamGradingResult {
  scoreEarned: number;
  totalPossibleScore: number;
  scorePercentage: number;
  isPassed: boolean;
  passingScorePercent: number;
  correctQuestionCount: number;
  totalGradedQuestionCount: number;
  questionDetails: Array<{
    questionId: string;
    title: string;
    pointsPossible: number;
    pointsEarned: number;
    isCorrect: boolean;
    userAnswer: any;
    correctAnswerText: string;
    explanation?: string;
  }>;
}

export function gradeExamResponse(survey: Survey, answers: Record<string, any>): ExamGradingResult {
  let scoreEarned = 0;
  let totalPossibleScore = 0;
  let correctCount = 0;
  let gradedCount = 0;
  const questionDetails: ExamGradingResult['questionDetails'] = [];

  const isExam = survey.settings.isExamMode || survey.settings.surveyMode === 'exam' || survey.category === 'exam_quiz';
  const passingPercent = survey.settings.passingScorePercent || 70;

  survey.questions.forEach((q) => {
    // Only grade questions that have correctAnswers or points defined
    const hasAnswerKey = (q.correctAnswers && q.correctAnswers.length > 0) || (q.scorePoints && q.scorePoints > 0);
    if (!hasAnswerKey && !isExam) return;

    const pointsPossible = q.scorePoints || 10;
    totalPossibleScore += pointsPossible;
    gradedCount++;

    const userAns = answers[q.id];
    let isCorrect = false;
    let correctAnswerText = '';

    if (q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'picture_choice') {
      const correctOptId = q.correctAnswers?.[0];
      const correctOpt = q.options?.find(o => o.id === correctOptId);
      correctAnswerText = correctOpt ? correctOpt.text : (correctOptId || 'ไม่ได้กำหนด');

      if (userAns && (userAns === correctOptId || userAns === correctOpt?.text)) {
        isCorrect = true;
      }
    } else if (q.type === 'multiple_choice') {
      const correctIds = q.correctAnswers || [];
      const correctTexts = q.options?.filter(o => correctIds.includes(o.id)).map(o => o.text) || [];
      correctAnswerText = correctTexts.join(', ');

      const userAnsList: string[] = Array.isArray(userAns) ? userAns : [];
      // Check if all correct answers selected and no extra incorrect answers
      const isAllSelected = correctTexts.length > 0 && correctTexts.every(txt => userAnsList.includes(txt));
      const hasNoIncorrect = userAnsList.every(txt => correctTexts.includes(txt));
      if (isAllSelected && hasNoIncorrect) {
        isCorrect = true;
      }
    } else if (q.type === 'text_short') {
      const correctVal = (q.correctAnswers?.[0] || '').trim().toLowerCase();
      correctAnswerText = q.correctAnswers?.[0] || '';
      const userText = String(userAns || '').trim().toLowerCase();
      if (correctVal && userText === correctVal) {
        isCorrect = true;
      }
    } else if (q.type === 'rating_stars' || q.type === 'slider_score' || q.type === 'nps_score') {
      // If min/max score or exact score matching
      const targetVal = Number(q.correctAnswers?.[0]);
      correctAnswerText = String(q.correctAnswers?.[0] || '');
      if (!isNaN(targetVal) && Number(userAns) === targetVal) {
        isCorrect = true;
      }
    }

    const pointsEarned = isCorrect ? pointsPossible : 0;
    if (isCorrect) correctCount++;
    scoreEarned += pointsEarned;

    questionDetails.push({
      questionId: q.id,
      title: q.title,
      pointsPossible,
      pointsEarned,
      isCorrect,
      userAnswer: userAns,
      correctAnswerText,
      explanation: q.explanation
    });
  });

  const scorePercentage = totalPossibleScore > 0 ? Math.round((scoreEarned / totalPossibleScore) * 100) : 100;
  const isPassed = scorePercentage >= passingPercent;

  return {
    scoreEarned,
    totalPossibleScore,
    scorePercentage,
    isPassed,
    passingScorePercent: passingPercent,
    correctQuestionCount: correctCount,
    totalGradedQuestionCount: gradedCount,
    questionDetails
  };
}

export function generateCertificateNumber(surveyId: string, timestamp?: string): string {
  const dateStr = (timestamp ? new Date(timestamp) : new Date()).toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CERT-DDPM-${dateStr}-${rand}`;
}

export interface ExamGradeResult {
  scoreEarned: number;
  totalPossibleScore: number;
  scorePercentage: number;
  isPassed: boolean;
  passingScorePercent: number;
  correctQuestionsCount: number;
  totalQuestionsCount: number;
  questionResults: Array<{
    questionId: string;
    questionTitle: string;
    maxPoints: number;
    pointsEarned: number;
    isCorrect: boolean;
    userAnswer: any;
    correctAnswer: any;
    explanation?: string;
  }>;
}

export function calculateExamGrade(survey: Survey, answers: Record<string, any>): ExamGradeResult {
  const result = gradeExamResponse(survey, answers);
  return {
    scoreEarned: result.scoreEarned,
    totalPossibleScore: result.totalPossibleScore,
    scorePercentage: result.scorePercentage,
    isPassed: result.isPassed,
    passingScorePercent: result.passingScorePercent,
    correctQuestionsCount: result.correctQuestionCount,
    totalQuestionsCount: result.totalGradedQuestionCount,
    questionResults: result.questionDetails.map(d => ({
      questionId: d.questionId,
      questionTitle: d.title,
      maxPoints: d.pointsPossible,
      pointsEarned: d.pointsEarned,
      isCorrect: d.isCorrect,
      userAnswer: d.userAnswer,
      correctAnswer: d.correctAnswerText,
      explanation: d.explanation
    }))
  };
}
