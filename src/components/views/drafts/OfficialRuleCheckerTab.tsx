import React, { useState } from 'react';
import { BookOpen, Sparkles, Copy, Check, FileText } from 'lucide-react';
import OfficialDocumentChecker from '../../OfficialDocumentChecker';

interface Props {
  user: any;
}

export default function OfficialRuleCheckerTab({ user }: Props) {
  const [draftContent, setDraftContent] = useState<string>(
    `ด้วย สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้รับแจ้งเตือนสถานการณ์สภาพอากาศแปรปรวนและฝนตกหนักถึงหนักมากในพื้นที่ภาคตะวันออก ระหว่างวันที่ 15 - 18 พฤษภาคม 2569\n\nจึงขอให้หน่วยงานที่เกี่ยวข้องเตรียมความพร้อมเจ้าหน้าที่ อุปกรณ์ และเครื่องจักรกลสาธารณภัยเพื่อพร้อมเข้าช่วยเหลือประชาชนผู้ประสบภัยได้อย่างทันท่วงที\n\nขอแสดงความนับถือ`
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center border border-amber-500/30 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-sans text-[var(--text-primary)]">
              ระบบตรวจสอบระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 & ฉบับแก้ไข
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              ผู้ช่วยอัจฉริยะในการตรวจคำขึ้นต้น, คำลงท้าย, การระบุสิ่งที่ส่งมาด้วย, การเว้นวรรค และรูปแบบภาษาหนังสือราชการตามมาตรฐานกรม ปภ. และกระทรวงมหาดไทย
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor on Left */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[var(--primary-color)]" />
                ข้อความร่างหนังสือราชการที่จะตรวจ
              </label>
              <button
                onClick={handleCopy}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>

            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={14}
              placeholder="วางข้อความเนื้อหาร่างหนังสือราชการที่ต้องการให้ระบบตรวจสอบที่นี่..."
              className="w-full text-sm bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-2xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-color)] font-sans leading-relaxed resize-none"
            />

            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
              <span>ความยาว: {draftContent.length} ตัวอักษร</span>
              <span>ฟอนต์มาตรฐาน: TH Sarabun PSK 16pt</span>
            </div>
          </div>
        </div>

        {/* Checker & Rules on Right */}
        <div className="lg:col-span-6">
          <OfficialDocumentChecker
            text={draftContent}
            onApplyFixedText={(fixedText) => setDraftContent(fixedText)}
          />
        </div>
      </div>
    </div>
  );
}
