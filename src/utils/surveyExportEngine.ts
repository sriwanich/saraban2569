import * as XLSX from 'xlsx';
import { Survey, SurveyResponse, SurveyQuestion } from '../types/survey';

/**
 * Clean & format answers for tabular export
 */
export function formatAnswerForCell(q: SurveyQuestion, answer: any): string {
  if (answer === undefined || answer === null || answer === '') return '-';

  if (Array.isArray(answer)) {
    return answer.join(', ');
  }

  if (typeof answer === 'object') {
    if (q.type === 'matrix_rating') {
      return Object.entries(answer)
        .map(([rowId, val]) => {
          const row = q.matrixRows?.find(r => (typeof r === 'string' ? r : r.id || r.text) === rowId);
          const rowLabel = typeof row === 'string' ? row : row?.text || rowId;
          return `${rowLabel}: ${val}`;
        })
        .join(' | ');
    }
    if (q.type === 'contact_info') {
      return Object.entries(answer)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    if (q.type === 'geo_location') {
      return `${answer.lat?.toFixed(5)}, ${answer.lng?.toFixed(5)} (${answer.address || ''})`;
    }
    try {
      return JSON.stringify(answer);
    } catch {
      return String(answer);
    }
  }

  return String(answer);
}

/**
 * Enterprise Multi-Sheet Excel Export
 */
export function exportSurveyToExcel(
  survey: Survey,
  responses: SurveyResponse[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Raw Responses Sheet
  const rawHeaders = [
    'ลำดับ (No.)',
    'รหัสการตอบ (Response ID)',
    'วัน-เวลาที่ส่ง (Submitted At)',
    'ชื่อผู้ตอบ (Respondent Name)',
    'หน่วยงาน/สังกัด (Department)',
    'ตำแหน่ง (Position)',
    'เบอร์โทรศัพท์ (Phone)',
    'อีเมล (Email)',
    'สถานะตรวจสอบ (Workflow Status)',
    'คะแนนที่ได้ (Score)',
    'ผลการสอบ (Exam Result)',
    'เวลาที่ใช้ (วินาที) (Time Spent s)',
    'ที่อยู่ IP (IP Address)',
    'พิกัด GPS (Coordinates)'
  ];

  // Append Question Titles as columns
  survey.questions.forEach((q, idx) => {
    rawHeaders.push(`[ข้อ ${idx + 1}] ${q.title}`);
  });

  const rawDataRows: any[][] = [rawHeaders];

  responses.forEach((r, rIdx) => {
    const safeAns: Record<string, any> = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
    
    const row: any[] = [
      rIdx + 1,
      r.id,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString('th-TH') : '-',
      r.respondentName || 'ไม่ระบุตัวตน (Anonymous)',
      r.respondentDepartment || '-',
      r.respondentPosition || '-',
      r.respondentPhone || '-',
      r.respondentEmail || '-',
      r.review?.status === 'approved' ? 'อนุมัติแล้ว (Approved)' :
      r.review?.status === 'rejected' ? 'ปฏิเสธ (Rejected)' :
      r.review?.status === 'under_review' ? 'กำลังตรวจสอบ (Under Review)' : 'รอดำเนินการ (Submitted)',
      r.scoreObtained !== undefined ? `${r.scoreObtained}/${r.maxPossibleScore || 0} (${r.scorePercentage || 0}%)` : (r.totalScore || '-'),
      r.passedExam !== undefined ? (r.passedExam ? 'ผ่าน (PASS)' : 'ไม่ผ่าน (FAIL)') : '-',
      r.timeSpentSeconds || '-',
      r.respondentIp || '-',
      r.geoLocation ? `${r.geoLocation.lat}, ${r.geoLocation.lng}` : '-'
    ];

    survey.questions.forEach(q => {
      row.push(formatAnswerForCell(q, safeAns[q.id]));
    });

    rawDataRows.push(row);
  });

  const wsRaw = XLSX.utils.aoa_to_sheet(rawDataRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'ผลการตอบรายบุคคล');

  // 2. Statistical Question Analysis Sheet
  const summaryHeaders = ['ข้อที่', 'ประเภทคำถาม', 'หัวข้อคำถาม', 'จำนวนผู้ตอบ', 'คะแนนเฉลี่ย/สถิติคำตอบ'];
  const summaryRows: any[][] = [summaryHeaders];

  survey.questions.forEach((q, idx) => {
    let statText = '-';
    let answeredCount = 0;

    if (q.type === 'rating_stars' || q.type === 'slider_score' || q.type === 'nps_score') {
      let sum = 0;
      responses.forEach(r => {
        const safeAns: Record<string, any> = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
        const val = safeAns[q.id];
        if (typeof val === 'number') {
          sum += val;
          answeredCount++;
        }
      });
      const avg = answeredCount > 0 ? (sum / answeredCount).toFixed(2) : '0';
      statText = `คะแนนเฉลี่ย: ${avg} / ${q.maxScore || 5}`;
    } else if (q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'image_choice') {
      const counts: Record<string, number> = {};
      responses.forEach(r => {
        const safeAns: Record<string, any> = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
        const val = safeAns[q.id];
        if (val) {
          counts[String(val)] = (counts[String(val)] || 0) + 1;
          answeredCount++;
        }
      });
      statText = Object.entries(counts)
        .map(([opt, cnt]) => `${opt}: ${cnt} (${Math.round((cnt / (answeredCount || 1)) * 100)}%)`)
        .join('; ');
    } else {
      responses.forEach(r => {
        const safeAns: Record<string, any> = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
        if (safeAns[q.id] !== undefined && safeAns[q.id] !== null && safeAns[q.id] !== '') {
          answeredCount++;
        }
      });
      statText = `บันทึกคำตอบรวม ${answeredCount} รายการ`;
    }

    summaryRows.push([
      `ข้อ ${idx + 1}`,
      q.type,
      q.title,
      answeredCount,
      statText
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปสถิติรายข้อ');

  // 3. Survey Metadata & Executive Overview
  const metaRows: any[][] = [
    ['หัวข้อแบบสำรวจ (Title)', survey.title],
    ['คำอธิบาย (Description)', survey.description],
    ['หมวดหมู่ (Category)', survey.categoryLabel || survey.category],
    ['หน่วยงานผู้รับผิดชอบ (Department)', survey.department],
    ['ผู้สร้าง (Creator)', survey.creatorName || 'ผู้ดูแลระบบ'],
    ['วันที่สร้าง (Created At)', survey.createdAt ? new Date(survey.createdAt).toLocaleString('th-TH') : '-'],
    ['สถานะ (Status)', survey.settings?.status || 'published'],
    ['จำนวนการตอบรับทั้งหมด (Total Responses)', responses.length],
    ['โหมดข้อสอบ (Exam Mode)', survey.settings?.isExamMode ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน'],
    ['เกณฑ์ผ่านการสอบ (Passing Score)', survey.settings?.isExamMode ? `${survey.settings.passingScorePercentage || 70}%` : 'N/A'],
    ['วันที่ส่งออกข้อมูล (Exported At)', new Date().toLocaleString('th-TH')]
  ];

  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'ข้อมูลภาพรวม (Overview)');

  // Download Excel file
  const fileName = `SurveyKing_Enterprise_${survey.id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Standard CSV Export
 */
export function exportSurveyToCsv(survey: Survey, responses: SurveyResponse[]): void {
  const headers = [
    'No',
    'ResponseID',
    'SubmittedAt',
    'RespondentName',
    'Department',
    'Score',
    'Status'
  ];

  survey.questions.forEach((q, idx) => {
    headers.push(`Q${idx + 1}_${q.title.replace(/,/g, ' ')}`);
  });

  const rows: string[] = [headers.join(',')];

  responses.forEach((r, idx) => {
    const safeAns: Record<string, any> = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
    const values: string[] = [
      String(idx + 1),
      `"${r.id}"`,
      `"${r.submittedAt ? new Date(r.submittedAt).toLocaleString('th-TH') : ''}"`,
      `"${(r.respondentName || 'Anonymous').replace(/"/g, '""')}"`,
      `"${(r.respondentDepartment || '').replace(/"/g, '""')}"`,
      `"${r.scoreObtained !== undefined ? r.scoreObtained : (r.totalScore || '')}"`,
      `"${r.review?.status || 'submitted'}"`
    ];

    survey.questions.forEach(q => {
      const cell = formatAnswerForCell(q, safeAns[q.id]).replace(/"/g, '""');
      values.push(`"${cell}"`);
    });

    rows.push(values.join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\n'); // Add BOM for Thai UTF-8 in Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Survey_${survey.id}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
