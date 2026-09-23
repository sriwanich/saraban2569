import * as XLSX from 'xlsx';
import { Survey, SurveyResponse, SurveyQuestion } from '../types/survey';

export interface ExamGradingResult {
  totalQuestions: number;
  correctCount: number;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  isPassed: boolean;
  questionResults: Array<{
    questionId: string;
    questionTitle: string;
    userAnswer: any;
    correctAnswer: any;
    isCorrect: boolean;
    points: number;
    earned: number;
    explanation?: string;
  }>;
}

/**
 * Auto-grades a survey response when the survey is in Exam / Assessment mode.
 */
export function gradeSurveyExam(survey: Survey, answers: Record<string, any>): ExamGradingResult {
  const isGlobalExam = !!survey.settings?.isExamMode;
  const examQuestions = survey.questions.filter(q => 
    q.type !== 'section_header' && (isGlobalExam || q.isExamQuestion || q.correctAnswer !== undefined)
  );

  let totalQuestions = 0;
  let correctCount = 0;
  let earnedPoints = 0;
  let maxPoints = 0;
  const questionResults: ExamGradingResult['questionResults'] = [];

  examQuestions.forEach(q => {
    // Only grade if question has a correctAnswer defined or is marked as exam question
    if (q.correctAnswer === undefined && !q.isExamQuestion) return;

    totalQuestions++;
    const qPoints = q.points !== undefined && q.points > 0 ? q.points : 1;
    maxPoints += qPoints;

    const userAns = answers[q.id];
    let isCorrect = false;

    if (q.type === 'single_choice' || q.type === 'dropdown') {
      isCorrect = String(userAns || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
    } else if (q.type === 'multiple_choice') {
      const uArr = Array.isArray(userAns) ? userAns.map(v => String(v).trim().toLowerCase()).sort() : [];
      const cArr = Array.isArray(q.correctAnswer) 
        ? q.correctAnswer.map(v => String(v).trim().toLowerCase()).sort()
        : [String(q.correctAnswer || '').trim().toLowerCase()];
      isCorrect = uArr.length === cArr.length && uArr.every((val, idx) => val === cArr[idx]);
    } else if (q.type === 'text_short') {
      const uText = String(userAns || '').trim().toLowerCase();
      const cText = String(q.correctAnswer || '').trim().toLowerCase();
      isCorrect = uText === cText;
    } else if (q.type === 'rating_stars' || q.type === 'slider_score' || q.type === 'nps_score') {
      isCorrect = Number(userAns) === Number(q.correctAnswer);
    } else {
      isCorrect = JSON.stringify(userAns) === JSON.stringify(q.correctAnswer);
    }

    const earned = isCorrect ? qPoints : 0;
    if (isCorrect) correctCount++;
    earnedPoints += earned;

    questionResults.push({
      questionId: q.id,
      questionTitle: q.title,
      userAnswer: userAns,
      correctAnswer: q.correctAnswer,
      isCorrect,
      points: qPoints,
      earned,
      explanation: q.explanation
    });
  });

  const percentage = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
  const passScoreThreshold = survey.settings?.passScore ?? 60;
  const isPassed = percentage >= passScoreThreshold;

  return {
    totalQuestions,
    correctCount,
    earnedPoints,
    maxPoints,
    percentage,
    isPassed,
    questionResults
  };
}

/**
 * Cross-Tabulation calculation for comparing two categorical survey questions.
 */
export interface CrossTabMatrix {
  questionA: SurveyQuestion;
  questionB: SurveyQuestion;
  rows: string[];
  cols: string[];
  matrix: number[][]; // counts [rowIdx][colIdx]
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export function computeCrossTabulation(
  survey: Survey, 
  responses: SurveyResponse[], 
  questionIdA: string, 
  questionIdB: string
): CrossTabMatrix | null {
  const qA = survey.questions.find(q => q.id === questionIdA);
  const qB = survey.questions.find(q => q.id === questionIdB);
  if (!qA || !qB) return null;

  // Extract distinct row values
  const rowLabels: string[] = [];
  if (qA.options && qA.options.length > 0) {
    qA.options.forEach(o => rowLabels.push(o.text));
  } else {
    const set = new Set<string>();
    responses.forEach(r => {
      const v = r.answers[qA.id];
      if (v) set.add(String(v));
    });
    rowLabels.push(...Array.from(set));
  }
  if (rowLabels.length === 0) rowLabels.push('อื่นๆ / ไม่ระบุ');

  // Extract distinct column values
  const colLabels: string[] = [];
  if (qB.options && qB.options.length > 0) {
    qB.options.forEach(o => colLabels.push(o.text));
  } else {
    const set = new Set<string>();
    responses.forEach(r => {
      const v = r.answers[qB.id];
      if (v) set.add(String(v));
    });
    colLabels.push(...Array.from(set));
  }
  if (colLabels.length === 0) colLabels.push('อื่นๆ / ไม่ระบุ');

  // Initialize matrix
  const matrix: number[][] = rowLabels.map(() => colLabels.map(() => 0));
  const rowTotals: number[] = rowLabels.map(() => 0);
  const colTotals: number[] = colLabels.map(() => 0);
  let grandTotal = 0;

  responses.forEach(r => {
    const rawA = r.answers[qA.id];
    const rawB = r.answers[qB.id];
    if (rawA === undefined || rawB === undefined) return;

    const valA = Array.isArray(rawA) ? rawA[0] : String(rawA);
    const valB = Array.isArray(rawB) ? rawB[0] : String(rawB);

    let rIdx = rowLabels.findIndex(l => l.toLowerCase() === valA.toLowerCase());
    let cIdx = colLabels.findIndex(l => l.toLowerCase() === valB.toLowerCase());

    if (rIdx === -1) rIdx = 0;
    if (cIdx === -1) cIdx = 0;

    matrix[rIdx][cIdx]++;
    rowTotals[rIdx]++;
    colTotals[cIdx]++;
    grandTotal++;
  });

  return {
    questionA: qA,
    questionB: qB,
    rows: rowLabels,
    cols: colLabels,
    matrix,
    rowTotals,
    colTotals,
    grandTotal
  };
}

/**
 * Enterprise Microsoft Excel (.xlsx) Multi-Sheet Exporter
 */
export function exportSurveyToExcel(survey: Survey, responses: SurveyResponse[]) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: บทสรุปผู้บริหารและสถิติภาพรวม (Summary)
  // ==========================================
  const isExam = !!survey.settings?.isExamMode;
  const totalResponses = responses.length;
  
  let passedCount = 0;
  let totalScoreSum = 0;
  let scoreCount = 0;

  responses.forEach(r => {
    if (r.examResult) {
      if (r.examResult.isPassed) passedCount++;
      totalScoreSum += r.examResult.percentage;
      scoreCount++;
    }
  });

  const avgExamScore = scoreCount > 0 ? (totalScoreSum / scoreCount).toFixed(1) : '-';
  const passRate = scoreCount > 0 ? `${Math.round((passedCount / scoreCount) * 100)}%` : '-';

  const summaryData = [
    ['รายงานผลการสำรวจและประเมินผลระดับ Enterprise (SurveyKing Platform)'],
    ['ชื่อแบบสำรวจ / ข้อสอบ', survey.title],
    ['หมวดหมู่', survey.categoryLabel || survey.category],
    ['หน่วยงานผู้จัดทำ', survey.department || 'สำนักงาน ปภ. จังหวัดระยอง'],
    ['สถานะแบบสำรวจ', survey.settings?.status === 'published' ? 'เปิดรับคำตอบ (Active)' : 'ระงับ/ฉบับร่าง'],
    ['วันที่สร้างแบบสำรวจ', new Date(survey.createdAt).toLocaleString('th-TH')],
    ['วันที่ส่งออกข้อมูล', new Date().toLocaleString('th-TH')],
    [''],
    ['ดัชนีชี้วัดหลัก (Key Performance Indicators)'],
    ['จำนวนผู้เข้าชม (View Count)', survey.viewCount || 0],
    ['จำนวนผู้ส่งคำตอบทั้งหมด (Total Responses)', totalResponses],
    ['โหมดแบบสอบถาม', isExam ? 'แบบทดสอบ/วัดผลออนไลน์ (Exam Mode)' : 'แบบสำรวจความคิดเห็น (Survey Mode)']
  ];

  if (isExam) {
    summaryData.push(
      ['เกณฑ์คะแนนผ่าน', `${survey.settings?.passScore || 60}%`],
      ['คะแนนเฉลี่ยของผู้เข้าสอบ', `${avgExamScore}%`],
      ['จำนวนผู้สอบผ่าน', `${passedCount} คน (${passRate})`],
      ['จำนวนผู้สอบไม่ผ่าน', `${scoreCount - passedCount} คน`]
    );
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // ==========================================
  // SHEET 2: ข้อมูลคำตอบดิบรายบุคคล (Raw Data)
  // ==========================================
  const rawRows = responses.map((r, idx) => {
    const rowObj: Record<string, any> = {
      'ลำดับ (No.)': idx + 1,
      'รหัสคำตอบ (Response ID)': r.id,
      'วันเวลาที่ส่ง (Submitted Date)': new Date(r.submittedAt).toLocaleString('th-TH'),
      'ชื่อ-นามสกุล (Respondent Name)': r.respondentName || 'ไม่ระบุตัวตน (นิรนาม)',
      'ตำแหน่ง (Position)': r.respondentPosition || '-',
      'หน่วยงาน/สังกัด (Department)': r.respondentDepartment || 'ทั่วไป',
      'เบอร์โทรศัพท์ (Phone)': r.respondentPhone || '-',
      'อีเมล (Email)': r.respondentEmail || '-',
      'เวลาที่ใช้ตอบ (วินาที)': r.timeSpentSeconds || '-'
    };

    if (isExam && r.examResult) {
      rowObj['ผลการสอบ'] = r.examResult.isPassed ? 'ผ่านเกณฑ์ (PASS)' : 'ไม่ผ่านเกณฑ์ (FAIL)';
      rowObj['คะแนนรวมที่ได้'] = `${r.examResult.earnedPoints} / ${r.examResult.maxPoints}`;
      rowObj['คิดเป็นเปอร์เซ็นต์ (%)'] = `${r.examResult.percentage}%`;
    }

    if (r.whitelistTokenUsed) {
      rowObj['รหัสยืนยันสิทธิ์ (Token)'] = r.whitelistTokenUsed;
    }

    survey.questions.forEach((q, qIdx) => {
      if (q.type === 'section_header') return;

      const colHeader = `ข้อ ${qIdx + 1}: ${q.title.replace(/[\r\n]+/g, ' ').substring(0, 50)}`;
      const ans = r.answers[q.id];
      const other = r.answers[`${q.id}_other_text`];

      if (q.type === 'matrix_rating' && q.matrixRows) {
        q.matrixRows.forEach((mRow, mIdx) => {
          const rowText = typeof mRow === 'string' ? mRow : mRow.text || mRow.id;
          const rowId = typeof mRow === 'string' ? mRow : mRow.id || mRow.text;
          const matrixColHeader = `ข้อ ${qIdx + 1}.${mIdx + 1}: ${rowText.substring(0, 40)}`;
          const rowVal = typeof ans === 'object' && ans ? (ans as Record<string, any>)[rowId] : null;
          rowObj[matrixColHeader] = rowVal !== undefined && rowVal !== null ? rowVal : '-';
        });
      } else if (q.type === 'multiple_choice' || q.type === 'matrix_checkbox') {
        let valStr = Array.isArray(ans) ? ans.join(', ') : (ans || '-');
        if (other) valStr += ` (อื่นๆ: ${other})`;
        rowObj[colHeader] = valStr;
      } else if (q.type === 'ranking') {
        rowObj[colHeader] = Array.isArray(ans) ? ans.join(' > ') : (ans || '-');
      } else if (q.type === 'signature') {
        rowObj[colHeader] = ans ? 'มีลายมือชื่อดิจิทัล' : 'ไม่มี';
      } else {
        let valStr = ans !== undefined && ans !== null ? String(ans) : '-';
        if (other) valStr += ` (อื่นๆ: ${other})`;
        rowObj[colHeader] = valStr;
      }
    });

    return rowObj;
  });

  const wsRaw = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Data');

  // ==========================================
  // SHEET 3: สถิติวิเคราะห์รายข้อ (Item Analytics)
  // ==========================================
  const itemAnalyticsData: any[][] = [
    ['สถิติผลตอบรับรายข้อ (Question-Level Statistical Breakdown)'],
    ['ข้อที่', 'ประเภทคำถาม', 'หัวข้อคำถาม', 'จำนวนผู้ตอบ', 'คะแนนเฉลี่ย / สัดส่วนหลัก', 'การแปลผลเชิงคุณภาพ']
  ];

  survey.questions.forEach((q, qIdx) => {
    if (q.type === 'section_header') return;

    let ansCount = 0;
    let sumScore = 0;
    let maxSc = q.maxScore || 5;

    responses.forEach(r => {
      const a = r.answers[q.id];
      if (a !== undefined && a !== null && a !== '') {
        ansCount++;
        if (typeof a === 'number') {
          sumScore += a;
        }
      }
    });

    let avgStr = '-';
    let qualStr = '-';

    if (q.type === 'rating_stars' || q.type === 'slider_score') {
      const avg = ansCount > 0 ? (sumScore / ansCount).toFixed(2) : '0';
      avgStr = `${avg} / ${maxSc}`;
      const numAvg = parseFloat(avg);
      if (numAvg >= maxSc * 0.8) qualStr = 'ระดับดีเด่น / มากที่สุด';
      else if (numAvg >= maxSc * 0.6) qualStr = 'ระดับดี / มาก';
      else if (numAvg >= maxSc * 0.4) qualStr = 'ระดับปานกลาง';
      else qualStr = 'ต้องปรับปรุงเร่งด่วน';
    } else if (q.type === 'single_choice' || q.type === 'dropdown') {
      avgStr = `ผู้ตอบ ${ansCount} คน`;
      qualStr = 'การแจกแจงความถี่ตามตัวเลือก';
    } else if (q.type === 'nps_score') {
      const avg = ansCount > 0 ? (sumScore / ansCount).toFixed(1) : '0';
      avgStr = `NPS เฉลี่ย ${avg}/10`;
      qualStr = parseFloat(avg) >= 9 ? 'กลุ่มผู้สนับสนุน (Promoters)' : parseFloat(avg) >= 7 ? 'กลุ่มเฉยๆ (Passives)' : 'กลุ่มผู้ไม่เห็นด้วย (Detractors)';
    }

    itemAnalyticsData.push([
      `ข้อ ${qIdx + 1}`,
      q.type,
      q.title,
      ansCount,
      avgStr,
      qualStr
    ]);
  });

  const wsAnalytics = XLSX.utils.aoa_to_sheet(itemAnalyticsData);
  XLSX.utils.book_append_sheet(wb, wsAnalytics, 'Item Statistics');

  // Trigger download
  const cleanTitle = (survey.title || 'survey').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_').substring(0, 30);
  XLSX.writeFile(wb, `${cleanTitle}_SurveyKing_Enterprise.xlsx`);
}

/**
 * Generates clean A4 paper questionnaire printout format.
 */
export function printPaperSurvey(survey: Survey) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์เอกสาร');
    return;
  }

  const isExam = !!survey.settings?.isExamMode;

  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${survey.title} - แบบพิมพ์กระดาษ</title>
  <style>
    @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
    body {
      font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif;
      font-size: 16pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
    }
    .header-box { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .org-title { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
    .survey-title { font-size: 20pt; font-weight: bold; margin-bottom: 8px; }
    .survey-desc { font-size: 15pt; color: #333; margin-bottom: 6px; }
    .instruction-box { background: #f4f4f4; border: 1px solid #ccc; padding: 10px 14px; font-size: 14pt; margin-bottom: 20px; border-radius: 4px; }
    .q-item { margin-bottom: 18px; page-break-inside: avoid; }
    .q-num { font-weight: bold; }
    .q-title { font-weight: bold; margin-bottom: 6px; }
    .opt-list { margin-left: 20px; }
    .opt-item { margin-bottom: 4px; display: flex; align-items: center; }
    .checkbox-box { width: 14px; height: 14px; border: 1.5px solid #000; display: inline-block; margin-right: 8px; }
    .radio-circle { width: 14px; height: 14px; border: 1.5px solid #000; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .text-line { border-bottom: 1px dotted #000; width: 100%; height: 24px; margin-top: 4px; }
    .text-area-box { border: 1px solid #999; height: 80px; width: 100%; margin-top: 6px; }
    .matrix-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .matrix-table th, .matrix-table td { border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 13pt; }
    .matrix-table th.row-header, .matrix-table td.row-header { text-align: left; }
    .sig-section { margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
    .sig-box { text-align: center; width: 250px; }
    .exam-badge { display: inline-block; background: #000; color: #fff; padding: 2px 8px; font-size: 12pt; border-radius: 3px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header-box">
    ${isExam ? '<div class="exam-badge">แบบทดสอบและวัดผลออนไลน์ / ข้อสอบมาตรฐาน</div>' : ''}
    <div class="org-title">${survey.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</div>
    <div class="survey-title">${survey.title}</div>
    ${survey.description ? `<div class="survey-desc">${survey.description}</div>` : ''}
  </div>

  <div class="instruction-box">
    <strong>คำชี้แจง:</strong> กรุณาทำเครื่องหมาย ✓ หรือกรอกข้อความลงในช่องว่างตามความเป็นจริง ข้อมูลของท่านจะถูกเก็บเป็นความลับและนำไปประมวลผลเพื่อการพัฒนาหน่วยงาน
    ${isExam ? `<br><strong>เกณฑ์การวัดผล:</strong> เกณฑ์ผ่านร้อยละ ${survey.settings?.passScore || 60} ${survey.settings?.timeLimitMinutes ? `(เวลาทำข้อสอบ ${survey.settings.timeLimitMinutes} นาที)` : ''}` : ''}
  </div>

  <div class="questions-container">
    ${survey.questions.map((q, idx) => {
      if (q.type === 'section_header') {
        return `<div style="background:#e5e7eb; padding:6px 10px; font-weight:bold; margin:20px 0 10px 0; border-left:4px solid #000;">${q.title}</div>`;
      }

      let content = '';

      if (q.type === 'single_choice' || q.type === 'dropdown') {
        content = `<div class="opt-list">
          ${(q.options || []).map(opt => `
            <div class="opt-item"><span class="radio-circle"></span> ${opt.text}</div>
          `).join('')}
          ${q.allowOther ? `<div class="opt-item"><span class="radio-circle"></span> อื่นๆ โปรดระบุ: <span class="text-line" style="display:inline-block; width:200px;"></span></div>` : ''}
        </div>`;
      } else if (q.type === 'multiple_choice' || q.type === 'matrix_checkbox') {
        content = `<div class="opt-list">
          ${(q.options || []).map(opt => `
            <div class="opt-item"><span class="checkbox-box"></span> ${opt.text}</div>
          `).join('')}
          ${q.allowOther ? `<div class="opt-item"><span class="checkbox-box"></span> อื่นๆ โปรดระบุ: <span class="text-line" style="display:inline-block; width:200px;"></span></div>` : ''}
        </div>`;
      } else if (q.type === 'text_short') {
        content = `<div style="margin-top:6px;">ตอบ: <div class="text-line"></div></div>`;
      } else if (q.type === 'text_long') {
        content = `<div class="text-area-box"></div>`;
      } else if (q.type === 'matrix_rating' && q.matrixRows) {
        content = `<table class="matrix-table">
          <thead>
            <tr>
              <th class="row-header" style="width:50%;">ประเด็นการประเมิน</th>
              ${(q.matrixCols || [
                { text: '1 (น้อยสุด)' }, { text: '2 (น้อย)' }, { text: '3 (ปานกลาง)' }, { text: '4 (มาก)' }, { text: '5 (มากที่สุด)' }
              ]).map(c => `<th>${typeof c === 'string' ? c : c.text || c.id}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${q.matrixRows.map(r => `
              <tr>
                <td class="row-header">${typeof r === 'string' ? r : r.text || r.id}</td>
                ${(q.matrixCols || [1,2,3,4,5]).map(() => `<td><span class="radio-circle" style="margin:0;"></span></td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>`;
      } else if (q.type === 'rating_stars' || q.type === 'slider_score' || q.type === 'nps_score') {
        content = `<div style="margin-top:6px; display:flex; gap:12px; align-items:center;">
          <span>คะแนนประเมิน: </span>
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, q.maxScore || 5).map(n => `
            <span style="display:inline-flex; align-items:center; gap:3px;"><span class="radio-circle" style="margin:0;"></span> ${n}</span>
          `).join('')}
        </div>`;
      } else if (q.type === 'ranking' && q.rankingItems) {
        content = `<div class="opt-list">
          ${q.rankingItems.map((item) => `
            <div class="opt-item"><span style="border-bottom:1px solid #000; width:30px; display:inline-block; text-align:center; margin-right:8px;">&nbsp;</span> ${item}</div>
          `).join('')}
        </div>`;
      } else {
        content = `<div class="text-line"></div>`;
      }

      const pointsStr = isExam && q.points ? ` <span style="font-size:12pt; color:#444;">(${q.points} คะแนน)</span>` : '';

      return `
        <div class="q-item">
          <div class="q-title"><span class="q-num">ข้อที่ ${idx + 1}.</span> ${q.title}${q.required ? ' *' : ''}${pointsStr}</div>
          ${q.description ? `<div style="font-size:13pt; color:#555; margin-bottom:4px;">${q.description}</div>` : ''}
          ${content}
        </div>
      `;
    }).join('')}
  </div>

  <div class="sig-section">
    <div class="sig-box">
      ลงชื่อ ...........................................................<br>
      (...........................................................)<br>
      ตำแหน่ง ...........................................................<br>
      วันที่ ......... / ......... / .............
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
