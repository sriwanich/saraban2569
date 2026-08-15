import React, { useState } from 'react';
import { Sparkles, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';

interface InfographicsAiAssistantProps {
  onImageSelected: (imageSrc: string) => void;
}

export const InfographicsAiAssistant: React.FC<InfographicsAiAssistantProps> = ({ onImageSelected }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setSuggestions(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ai-design-assist', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze design');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err: any) {
      console.error(err);
      setSuggestions(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ภาพ โปรดลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        AI Design Assistant
      </h3>
      <p className="text-xs text-[var(--text-secondary)]">อัปโหลดรูปภาพเพื่อนำมาเป็นแบบอ้างอิง แล้วให้ AI ช่วยวิเคราะห์และแนะนำการออกแบบ</p>

      {!previewUrl ? (
        <label className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[var(--border-medium)] hover:border-indigo-500 hover:bg-indigo-50/10 transition-all cursor-pointer">
          <Upload className="w-8 h-8 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">เลือกรูปภาพเพื่อเป็นแบบ</span>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border-medium)]">
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
          <button 
            onClick={() => { setPreviewUrl(null); setFile(null); setSuggestions(null); }}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-2">
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ภาพด้วย AI'}
          </button>
          
          <button 
            onClick={() => onImageSelected(previewUrl)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-600 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition-all"
          >
            <ImageIcon className="w-4 h-4" /> แทรกรูปนี้ลงหน้ากระดาน
          </button>
        </div>
      )}

      {suggestions && (
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] leading-relaxed">
          <h4 className="font-bold text-[var(--text-primary)] mb-2">คำแนะนำจาก AI:</h4>
          {suggestions}
        </div>
      )}
    </div>
  );
};
