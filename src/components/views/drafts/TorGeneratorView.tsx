import React, { useState } from 'react';
import { Bot, CheckCircle, Copy, Download, FileText, Loader2, Sparkles, Building2, Package, Truck, Receipt, Plus, Trash2 } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import { downloadAsDoc } from './draftData';
import A4PaperPreview from '../../A4PaperPreview';

export default function TorGeneratorView({ user, onSendToSignQueue }: { user: any; onSendToSignQueue?: (item: any) => void }) {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  
  const [formData, setFormData] = useState({
    projectName: '',
    procurements: [
      { id: Date.now(), type: 'จ้างทำของ/บริการ', name: '', price: '' }
    ],
    duration: '',
    details: '',
  });

  const handleAddProcurement = () => {
    setFormData(prev => ({
      ...prev,
      procurements: [...prev.procurements, { id: Date.now(), type: 'ซื้อ', name: '', price: '' }]
    }));
  };

  const handleRemoveProcurement = (id: number) => {
    setFormData(prev => ({
      ...prev,
      procurements: prev.procurements.filter(p => p.id !== id)
    }));
  };

  const updateProcurement = (id: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      procurements: prev.procurements.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const totalBudget = formData.procurements.reduce((sum, p) => sum + Number(String(p.price).replace(/,/g, '') || 0), 0);


  const handleGenerate = async () => {
    if (!formData.projectName || formData.procurements.length === 0 || !formData.details) {
      await confirm({
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาระบุชื่อโครงการ วงเงินงบประมาณ และรายละเอียดขอบเขตงาน',
        type: 'warning',
        confirmText: 'ตกลง'
      });
      return;
    }

    setLoading(true);
    try {
      const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
      const savedKey = (settings.geminiApiKey || '').trim();

      const payload = {
        ...formData,
        orgName: user?.orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
        apiKey: savedKey
      };

      const res = await fetch('/api/ai/draft-tor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.result) {
        setGeneratedHtml(data.result);
      } else {
        throw new Error(data.error || 'Failed to generate TOR');
      }
    } catch (err: any) {
      console.error(err);
      await confirm({
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถสร้าง TOR ได้',
        type: 'warning',
        confirmText: 'ปิด'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedHtml) return;
    downloadAsDoc(generatedHtml, `TOR_${formData.projectName || 'Draft'}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Form Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[var(--border-light)] flex flex-col h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">สร้างขอบเขตของงาน (TOR)</h2>
            <p className="text-sm text-[var(--text-secondary)]">กำหนดรายละเอียดเพื่อสร้าง TOR อัตโนมัติด้วย AI</p>
          </div>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">ชื่อโครงการ <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              placeholder="เช่น โครงการจ้างเหมาบริการทำความสะอาดอาคารสำนักงาน"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">รายการจัดหาและวงเงินงบประมาณ <span className="text-red-500">*</span></label>
              <button 
                onClick={handleAddProcurement}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มรายการ
              </button>
            </div>
            {formData.procurements.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="col-span-12 md:col-span-4">
                  <select
                    value={item.type}
                    onChange={(e) => updateProcurement(item.id, 'type', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  >
                    <option value="ซื้อ">ซื้อ</option>
                    <option value="จ้างทำของ/บริการ">จ้างทำของ/บริการ</option>
                    <option value="จ้างก่อสร้าง">จ้างก่อสร้าง</option>
                    <option value="เช่า">เช่า</option>
                  </select>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateProcurement(item.id, 'name', e.target.value)}
                    placeholder="รายละเอียด (เช่น ค่าแรง)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <div className="col-span-10 md:col-span-3">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateProcurement(item.id, 'price', e.target.value)}
                    placeholder="ราคา (บาท)"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-center items-center h-full pt-1.5">
                  <button 
                    onClick={() => handleRemoveProcurement(item.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="ลบรายการ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end pr-4 text-sm mt-2">
              <span className="font-bold text-gray-700">รวมเป็นเงินทั้งสิ้น: <span className="text-blue-600 text-base">{totalBudget.toLocaleString()}</span> บาท</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">ระยะเวลาดำเนินการ/ส่งมอบ <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
              placeholder="เช่น 30 วัน นับถัดจากวันลงนามในสัญญา หรือ แบ่งส่งมอบเป็น 3 งวด"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">รายละเอียดขอบเขตงาน / คุณลักษณะเฉพาะ (Scope) <span className="text-red-500">*</span></label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm resize-none"
              placeholder="ระบุรายละเอียดงานที่ต้องทำ หรือคุณลักษณะของสิ่งของที่ต้องการจัดซื้อ..."
            />
          </div>
        </div>

        <div className="pt-6 mt-4 border-t border-gray-100">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> กำลังประมวลผลด้วย AI...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> สร้างร่าง TOR อัตโนมัติ</>
            )}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-[var(--bg-elevated)]/50 rounded-3xl p-3 shadow-inner border border-[var(--border-light)] flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-1 overflow-hidden relative rounded-2xl">
          {!generatedHtml && !loading ? (
            <div className="absolute inset-0 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4 text-[var(--text-muted)] border border-[var(--border-lighter)]">
                <FileText className="w-8 h-8" />
              </div>
              <p className="font-bold text-[var(--text-primary)] mb-1 text-sm">ยังไม่มีเอกสาร TOR</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">กรอกข้อมูลรายละเอียดการจัดซื้อ/จัดจ้างด้านซ้าย แล้วคลิก &quot;สร้างร่าง TOR ด้วย AI&quot; เพื่อดูตัวอย่างเอกสารขนาดมาตรฐาน A4</p>
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500 p-8 text-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-2xl">
              <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-600" />
              <p className="font-bold text-sm text-[var(--text-primary)]">AI กำลังร่างเอกสาร TOR ตามระเบียบพัสดุฯ...</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">อาจใช้เวลาสักครู่</p>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <A4PaperPreview
                title={`ร่างขอบเขตของงาน (TOR): ${formData.projectName || 'โครงการ'}`}
                subtitle="แบบร่างมาตรฐาน A4 ตาม พ.ร.บ. การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐"
                htmlContent={generatedHtml}
                extraActions={
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedHtml.replace(/<[^>]+>/g, ''));
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-light)]"
                      title="คัดลอกข้อความ"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      ส่งออก Word
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
