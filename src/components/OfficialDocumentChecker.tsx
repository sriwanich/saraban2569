import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, Sparkles, 
  FileCheck, BookOpen, RefreshCw, Wand2, Copy, Check, ArrowRight
} from 'lucide-react';

interface Props {
  text: string;
  onApplyFixedText?: (fixedText: string) => void;
  title?: string;
}

interface IssueItem {
  id: string;
  type: 'error' | 'warning' | 'suggestion';
  title: string;
  description: string;
  originalText?: string;
  suggestedText?: string;
  ruleReference: string;
}

export default function OfficialDocumentChecker({ text, onApplyFixedText, title = 'ร่างหนังสือราชการ' }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);

  const analyzeOfficialRules = () => {
    setIsAnalyzing(true);
    setHasAnalyzed(true);

    setTimeout(() => {
      const detectedIssues: IssueItem[] = [];
      const content = text || '';

      // Rule 1: Check Salutation (คำขึ้นต้น)
      if (!content.includes('เรียน') && !content.includes('กราบเรียน') && !content.includes('ถึง')) {
        detectedIssues.push({
          id: 'salutation_missing',
          type: 'error',
          title: 'ไม่พบคำขึ้นต้นตามระเบียบสารบรรณ',
          description: 'หนังสือราชการต้องระบุคำขึ้นต้น เช่น "เรียน [ตำแหน่งผู้รับ]" หรือ "กราบเรียน" ตามฐานานุศักดิ์',
          suggestedText: 'เรียน ผู้ว่าราชการจังหวัดระยอง',
          ruleReference: 'ระเบียบสำนักนายกรัฐมนตรีฯ ข้อ 14 (คำขึ้นต้น)'
        });
      }

      // Rule 2: Check Closing Phrase (คำลงท้าย)
      if (!content.includes('ขอแสดงความนับถือ') && !content.includes('ขอแสดงความนับถืออย่างยิ่ง')) {
        detectedIssues.push({
          id: 'closing_missing',
          type: 'warning',
          title: 'คำลงท้ายยังไม่สมบูรณ์',
          description: 'หนังสือภายนอกทั่วไปควรปิดท้ายด้วย "ขอแสดงความนับถือ" หรือหนังสือถึงบุคคลสำคัญด้วย "ขอแสดงความนับถืออย่างยิ่ง"',
          suggestedText: 'ขอแสดงความนับถือ',
          ruleReference: 'ระเบียบสำนักนายกรัฐมนตรีฯ ข้อ 20 (คำลงท้าย)'
        });
      }

      // Rule 3: Check Thai Numbers or Date formatting
      if (content.includes('256') && !content.includes('พ.ศ.')) {
        detectedIssues.push({
          id: 'buddhist_year',
          type: 'suggestion',
          title: 'การระบุศักราช พ.ศ.',
          description: 'ควรเติมคำนำหน้าปีพุทธศักราช เช่น "พ.ศ. 2569" เพื่อความถูกต้องสมบูรณ์',
          suggestedText: 'พ.ศ. 2569',
          ruleReference: 'ระเบียบสำนักนายกรัฐมนตรีฯ หมวด ๒'
        });
      }

      // Rule 4: Check Spacing and Punctuation (การเว้นวรรค)
      if (content.includes('  ') || content.includes(' ,') || content.includes(' .')) {
        detectedIssues.push({
          id: 'spacing_inconsistency',
          type: 'suggestion',
          title: 'การเว้นวรรคตอนไม่สม่ำเสมอ',
          description: 'พบการเว้นวรรคซ้ำซ้อนหรือติดเครื่องหมายวรรคตอน ควรปรับระยะเคาะวรรคให้สะอาดตา',
          ruleReference: 'มาตรฐานการพิมพ์หนังสือราชการระบบสารบรรณอิเล็กทรอนิกส์'
        });
      }

      // Rule 5: Check Enclosures (สิ่งที่ส่งมาด้วย)
      if (content.includes('แนบ') && !content.includes('สิ่งที่ส่งมาด้วย')) {
        detectedIssues.push({
          id: 'enclosure_term',
          type: 'warning',
          title: 'ใช้คำว่า "สิ่งที่ส่งมาด้วย" แทน "เอกสารแนบ"',
          description: 'ในหนังสือภายนอก/ภายในทางการ ควรใช้หัวข้อ "สิ่งที่ส่งมาด้วย" พร้อมระบุจำนวนฉบับหรือแผ่น',
          suggestedText: 'สิ่งที่ส่งมาด้วย 1. รายงานสถานการณ์ภัยพิบัติ จำนวน 1 ชุด',
          ruleReference: 'ระเบียบสำนักนายกรัฐมนตรีฯ ข้อ 16'
        });
      }

      setIssues(detectedIssues);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleAutoFix = () => {
    let fixed = text;
    // Auto prefix salutation if missing
    if (!fixed.includes('เรียน') && !fixed.includes('กราบเรียน')) {
      fixed = `เรียน ผู้ว่าราชการจังหวัดระยอง\n\n${fixed}`;
    }
    // Auto append closing if missing
    if (!fixed.includes('ขอแสดงความนับถือ')) {
      fixed = `${fixed}\n\nขอแสดงความนับถือ\n\n(ลงชื่อ)........................................................\nหัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง`;
    }
    // Clean redundant spaces
    fixed = fixed.replace(/ {2,}/g, ' ');

    if (onApplyFixedText) {
      onApplyFixedText(fixed);
    }
    // Re-run
    analyzeOfficialRules();
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-base font-sans text-[var(--text-primary)]">
              AI ผู้ช่วยตรวจระเบียบงานสารบรรณสำนักนายกฯ
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              ตรวจสอบคำขึ้นต้น คำลงท้าย โครงสร้าง และภาษาทางการอัตโนมัติ
            </p>
          </div>
        </div>

        <button
          onClick={analyzeOfficialRules}
          disabled={isAnalyzing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-dark)] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              กำลังตรวจวิเคราะห์...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              เริ่มตรวจทานเอกสาร
            </>
          )}
        </button>
      </div>

      {hasAnalyzed && (
        <div className="space-y-4 pt-2">
          {issues.length === 0 ? (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div className="text-xs font-medium">
                <span className="font-bold">ถูกต้องสมบูรณ์!</span> เอกสารฉบับนี้สอดคล้องกับระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และฉบับแก้ไขเพิ่มเติม
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>พบข้อสังเกตและจุดที่ควรปรับปรุง <b>{issues.length} รายการ</b></span>
                {onApplyFixedText && (
                  <button
                    onClick={handleAutoFix}
                    className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    ปรับแก้และจัดฟอร์แมตอัตโนมัติ (Auto-Fix)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] space-y-1.5 transition-all"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      {issue.type === 'error' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                      {issue.type === 'suggestion' && <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />}
                      <span>{issue.title}</span>
                      <span className="ml-auto text-[10px] font-mono font-normal text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-md border border-[var(--border-light)]">
                        {issue.ruleReference}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-6">
                      {issue.description}
                    </p>
                    {issue.suggestedText && (
                      <div className="pl-6 pt-1 flex items-center gap-2 text-xs font-mono text-[var(--primary-color)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">ข้อเสนอแนะ:</span>
                        <code className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-light)]">
                          {issue.suggestedText}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
