import { CascadingItem, SurveyQuestion } from '../types/survey';

/**
 * Administrative cascading data for Rayong Province (อำเภอ และ ตำบล)
 * Used by 'cascading_select' question type in SurveyKing architecture
 */
export const RAYONG_DISTRICTS_DATA: CascadingItem[] = [
  {
    id: 'muang',
    name: 'อำเภอเมืองระยอง',
    subItems: [
      { id: 'tha_pradu', name: 'ตำบลท่าประดู่' },
      { id: 'choeng_noen', name: 'ตำบลเชิงเนิน' },
      { id: 'taphong', name: 'ตำบลตะพง' },
      { id: 'pak_nam', name: 'ตำบลปากน้ำ' },
      { id: 'noen_phra', name: 'ตำบลเนินพระ' },
      { id: 'maptaphut', name: 'ตำบลมาบตาพุด' },
      { id: 'thap_ma', name: 'ตำบลทับมา' },
      { id: 'nam_khok', name: 'ตำบลน้ำคอก' },
      { id: 'na_ta_khwan', name: 'ตำบลนาตาขวัญ' },
      { id: 'klaeng_sub', name: 'ตำบลแกลง' },
      { id: 'ban_laeng', name: 'ตำบลบ้านแลง' }
    ]
  },
  {
    id: 'klaeng',
    name: 'อำเภอแกลง',
    subItems: [
      { id: 'thang_kwian', name: 'ตำบลทางเกวียน' },
      { id: 'wang_wa', name: 'ตำบลวังหว้า' },
      { id: 'chak_don', name: 'ตำบลชากโดน' },
      { id: 'kram', name: 'ตำบลกร่ำ' },
      { id: 'chak_phong', name: 'ตำบลชากพง' },
      { id: 'krasae_bon', name: 'ตำบลกระแสบน' },
      { id: 'ban_na', name: 'ตำบลบ้านนา' },
      { id: 'thung_khwai_kin', name: 'ตำบลทุ่งควายกิน' },
      { id: 'kong_din', name: 'ตำบลกองดิน' },
      { id: 'phlong_ta_eam', name: 'ตำบลคลองปูน' }
    ]
  },
  {
    id: 'ban_khai',
    name: 'อำเภอบ้านค่าย',
    subItems: [
      { id: 'ban_khai_sub', name: 'ตำบลบ้านค่าย' },
      { id: 'nong_lalok', name: 'ตำบลหนองละลอก' },
      { id: 'nong_taphan', name: 'ตำบลหนองตะพาน' },
      { id: 'ta_khan', name: 'ตำบลตาขัน' },
      { id: 'bang_but', name: 'ตำบลบางบุตร' },
      { id: 'chak_bok', name: 'ตำบลชากบก' },
      { id: 'nong_bua', name: 'ตำบลหนองบัว' }
    ]
  },
  {
    id: 'ban_chang',
    name: 'อำเภอบ้านฉาง',
    subItems: [
      { id: 'ban_chang_sub', name: 'ตำบลบ้านฉาง' },
      { id: 'samnak_thon', name: 'ตำบลสำนักท้อน' },
      { id: 'phla', name: 'ตำบลพลา' }
    ]
  },
  {
    id: 'pluak_daeng',
    name: 'อำเภอปลวกแดง',
    subItems: [
      { id: 'pluak_daeng_sub', name: 'ตำบลปลวกแดง' },
      { id: 'ta_sit', name: 'ตำบลตาสิทธิ์' },
      { id: 'la_han', name: 'ตำบลละหาร' },
      { id: 'mae_nam_khu', name: 'ตำบลแม่น้ำคู้' },
      { id: 'map_yang_phon', name: 'ตำบลมาบยางพร' },
      { id: 'nong_rai', name: 'ตำบลหนองไร่' }
    ]
  },
  {
    id: 'nikhom_phatthana',
    name: 'อำเภอนิคมพัฒนา',
    subItems: [
      { id: 'nikhom_phatthana_sub', name: 'ตำบลนิคมพัฒนา' },
      { id: 'phana_nikhom', name: 'ตำบลพนานิคม' },
      { id: 'makham_khu', name: 'ตำบลมะขามคู่' },
      { id: 'soi_sip_song', name: 'ตำบลซอยสิบสอง' }
    ]
  },
  {
    id: 'wang_chan',
    name: 'อำเภอวังจันทร์',
    subItems: [
      { id: 'wang_chan_sub', name: 'ตำบลวังจันทร์' },
      { id: 'chum_saeng', name: 'ตำบลชุมแสง' },
      { id: 'pa_yup_nai', name: 'ตำบลป่ายุบใน' },
      { id: 'phlong_ta_eam_2', name: 'ตำบลพลองตาเอี่ยม' }
    ]
  },
  {
    id: 'khao_chamao',
    name: 'อำเภอเขาชะเมา',
    subItems: [
      { id: 'nam_pen', name: 'ตำบลน้ำเป็น' },
      { id: 'huai_thap_mon', name: 'ตำบลห้วยทับมอญ' },
      { id: 'cham_kho', name: 'ตำบลชำฆ้อ' },
      { id: 'khao_noi', name: 'ตำบลเขาน้อย' }
    ]
  }
];

export interface QuizEvaluationResult {
  totalQuestionsWithScore: number;
  totalPointsEarned: number;
  totalPointsPossible: number;
  percentageScore: number;
  isPassed: boolean;
  passingScoreThreshold: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  questionResults: Array<{
    questionId: string;
    questionTitle: string;
    userAnswer: any;
    correctAnswer: any;
    pointsEarned: number;
    pointsPossible: number;
    isCorrect: boolean;
    explanation?: string;
  }>;
}

/**
 * Calculates Quiz & Assessment grade, point allocation, and pass/fail status
 */
export function evaluateQuizSubmission(
  questions: SurveyQuestion[],
  answers: Record<string, any>,
  passingScorePercent: number = 80
): QuizEvaluationResult {
  let pointsEarned = 0;
  let pointsPossible = 0;
  let scoredQuestionsCount = 0;

  const questionResults: QuizEvaluationResult['questionResults'] = [];

  questions.forEach(q => {
    // Only evaluate questions with score points or correct answer defined
    if (q.scorePoints && q.scorePoints > 0) {
      scoredQuestionsCount++;
      const maxPts = q.scorePoints;
      pointsPossible += maxPts;

      const userAns = answers[q.id];
      let isCorrect = false;

      if (q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'quota_choice') {
        const correctOpt = q.options?.find(o => o.isCorrect);
        const correctText = correctOpt ? correctOpt.text : q.correctAnswer;
        isCorrect = String(userAns || '').trim() === String(correctText || '').trim();
      } else if (q.type === 'multiple_choice') {
        const correctOpts = q.options?.filter(o => o.isCorrect).map(o => o.text) || [];
        const userList: string[] = Array.isArray(userAns) ? userAns : [];
        if (correctOpts.length > 0) {
          isCorrect = correctOpts.length === userList.length &&
            correctOpts.every(c => userList.includes(c));
        } else if (q.correctAnswer) {
          isCorrect = JSON.stringify(userList.sort()) === JSON.stringify((q.correctAnswer as string[]).sort());
        }
      } else if (q.type === 'text_short') {
        isCorrect = String(userAns || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
      } else if (q.type === 'nps_score' || q.type === 'rating_stars' || q.type === 'slider_score') {
        if (q.correctAnswer !== undefined) {
          isCorrect = Number(userAns) === Number(q.correctAnswer);
        } else {
          // If no specific correct answer, award points proportionally
          const numAns = Number(userAns) || 0;
          const max = q.type === 'nps_score' ? 10 : (q.maxScore || 5);
          const ratio = Math.min(1, Math.max(0, numAns / max));
          const earned = Math.round(ratio * maxPts);
          pointsEarned += earned;
          questionResults.push({
            questionId: q.id,
            questionTitle: q.title,
            userAnswer: userAns,
            correctAnswer: `ความพึงพอใจ ${numAns}/${max}`,
            pointsEarned: earned,
            pointsPossible: maxPts,
            isCorrect: earned > 0,
            explanation: q.answerExplanation
          });
          return;
        }
      }

      const earnedPts = isCorrect ? maxPts : 0;
      pointsEarned += earnedPts;

      const correctOptText = q.options?.find(o => o.isCorrect)?.text || q.correctAnswer;

      questionResults.push({
        questionId: q.id,
        questionTitle: q.title,
        userAnswer: userAns,
        correctAnswer: correctOptText,
        pointsEarned: earnedPts,
        pointsPossible: maxPts,
        isCorrect,
        explanation: q.answerExplanation
      });
    }
  });

  const percentageScore = pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100) : 100;
  const isPassed = percentageScore >= passingScorePercent;

  let grade: QuizEvaluationResult['grade'] = 'F';
  if (percentageScore >= 90) grade = 'A';
  else if (percentageScore >= 80) grade = 'B';
  else if (percentageScore >= 70) grade = 'C';
  else if (percentageScore >= 60) grade = 'D';

  return {
    totalQuestionsWithScore: scoredQuestionsCount,
    totalPointsEarned: pointsEarned,
    totalPointsPossible: pointsPossible,
    percentageScore,
    isPassed,
    passingScoreThreshold: passingScorePercent,
    grade,
    questionResults
  };
}

export interface NpsAnalysisResult {
  totalResponses: number;
  promoters: number; // 9-10
  passives: number; // 7-8
  detractors: number; // 0-6
  promoterPercent: number;
  passivePercent: number;
  detractorPercent: number;
  npsScore: number; // -100 to +100
  sentimentLabel: 'ยอดเยี่ยมระดับ World Class' | 'ดีเยี่ยม (Excellent)' | 'ระดับมาตรฐาน (Good)' | 'ต้องปรับปรุงเร่งด่วน (Needs Action)';
}

/**
 * Calculates Net Promoter Score (NPS) for SurveyKing 0-10 rating question
 */
export function calculateNps(scores: number[]): NpsAnalysisResult {
  const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s) && s >= 0 && s <= 10);
  const total = validScores.length;

  if (total === 0) {
    return {
      totalResponses: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      promoterPercent: 0,
      passivePercent: 0,
      detractorPercent: 0,
      npsScore: 0,
      sentimentLabel: 'ระดับมาตรฐาน (Good)'
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  validScores.forEach(score => {
    if (score >= 9) promoters++;
    else if (score >= 7) passives++;
    else detractors++;
  });

  const promoterPercent = Math.round((promoters / total) * 100);
  const passivePercent = Math.round((passives / total) * 100);
  const detractorPercent = Math.round((detractors / total) * 100);
  const npsScore = promoterPercent - detractorPercent;

  let sentimentLabel: NpsAnalysisResult['sentimentLabel'] = 'ระดับมาตรฐาน (Good)';
  if (npsScore >= 70) sentimentLabel = 'ยอดเยี่ยมระดับ World Class';
  else if (npsScore >= 30) sentimentLabel = 'ดีเยี่ยม (Excellent)';
  else if (npsScore < 0) sentimentLabel = 'ต้องปรับปรุงเร่งด่วน (Needs Action)';

  return {
    totalResponses: total,
    promoters,
    passives,
    detractors,
    promoterPercent,
    passivePercent,
    detractorPercent,
    npsScore,
    sentimentLabel
  };
}
