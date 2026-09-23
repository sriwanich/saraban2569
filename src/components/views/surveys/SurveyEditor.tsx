import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Settings, 
  Eye, Sparkles, ChevronDown, ChevronUp, Copy, CheckCircle2,
  Type, AlignLeft, List, CheckSquare, Star, LayoutGrid, Sliders, Calendar, FileUp, Hash, FileEdit
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { Survey, SurveyQuestion, SurveySettings, QuestionType, SurveyQuestionType } from '../../../types/survey';

interface SurveyEditorProps {
  survey: Survey | null;
  user: any;
  onClose: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: any; desc: string }[] = [
  { type: 'text', label: 'คำตอบสั้น', icon: Type, desc: 'ข้อความบรรทัดเดียว' },
  { type: 'textarea', label: 'คำตอบยาว', icon: AlignLeft, desc: 'ย่อหน้าหรือข้อความหลายบรรทัด' },
  { type: 'radio', label: 'ตัวเลือกเดียว', icon: List, desc: 'เลือกได้เพียงหนึ่งตัวเลือก' },
  { type: 'checkbox', label: 'หลายตัวเลือก', icon: CheckSquare, desc: 'เลือกได้มากกว่าหนึ่งตัวเลือก' },
  { type: 'dropdown', label: 'รายการเลือก', icon: ChevronDown, desc: 'เลือกจากรายการดรอปดาวน์' },
  { type: 'rating', label: 'ให้คะแนน', icon: Star, desc: 'การให้ดาวหรือระดับคะแนน' },
  { type: 'matrix', label: 'ตารางเลือก', icon: LayoutGrid, desc: 'ประเมินหลายหัวข้อในตารางเดียว' },
  { type: 'scale', label: 'มาตรวัด', icon: Sliders, desc: 'มาตรวัดแบบช่วงคะแนน (เช่น 0-10)' },
  { type: 'date', label: 'วันที่', icon: Calendar, desc: 'ปฏิทินเลือกวันที่' },
  { type: 'file', label: 'แนบไฟล์', icon: FileUp, desc: 'อัปโหลดเอกสารหรือรูปภาพ' },
  { type: 'ranking', label: 'จัดลำดับ', icon: Hash, desc: 'ลากวางเพื่อจัดลำดับความสำคัญ' },
  { type: 'signature', label: 'ลายเซ็น', icon: FileEdit, desc: 'ลงนามดิจิทัล' },
];

const SurveyEditor: React.FC<SurveyEditorProps> = ({ survey, user, onClose }) => {
  const [title, setTitle] = useState(survey?.title || 'แบบสำรวจไม่มีชื่อ');
  const [description, setDescription] = useState(survey?.description || '');
  const [category, setCategory] = useState(survey?.category || 'general');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(survey?.questions || []);
  const [settings, setSettings] = useState<SurveySettings>(survey?.settings || {
    status: 'draft',
    isOpen: true,
    themeColor: '#1e40af',
    headerLogoType: 'ddpm',
    allowAnonymous: true,
    requireLogin: false,
    oneResponsePerUser: true,
    showProgressBar: true,
    showQuestionNumbers: true,
    collectIp: true,
    collectDeviceInfo: true,
    limitOneResponsePerDevice: false,
    thankYouTitle: 'ขอบคุณ',
    thankYouMessage: 'ขอบพระคุณสำหรับการตอบแบบสำรวจ',
    showSummaryToRespondents: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'build' | 'settings' | 'preview'>('build');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  const mapQuestionType = (t: QuestionType): SurveyQuestionType => {
    switch (t) {
      case 'text': return 'text_short';
      case 'textarea': return 'text_long';
      case 'radio': return 'single_choice';
      case 'checkbox': return 'multiple_choice';
      case 'dropdown': return 'dropdown';
      case 'rating': return 'rating_stars';
      case 'matrix': return 'matrix_single';
      case 'scale': return 'slider_score';
      case 'date': return 'date_time';
      case 'file': return 'file_upload';
      case 'ranking': return 'ranking';
      case 'signature': return 'signature';
      default: return 'text_short';
    }
  };

  const handleAddQuestion = (type: QuestionType) => {
    const qType = mapQuestionType(type);
    const newQuestion: SurveyQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: qType,
      title: 'คำถามใหม่',
      required: false,
      options: ['radio', 'checkbox', 'dropdown', 'ranking'].includes(type) ? [
        { id: 'opt1', text: 'ตัวเลือก 1', label: 'ตัวเลือก 1', value: 'option1' },
        { id: 'opt2', text: 'ตัวเลือก 2', label: 'ตัวเลือก 2', value: 'option2' }
      ] : undefined,
      matrixRows: qType === 'matrix_single' ? [
        { id: 'row1', text: 'หัวข้อ 1' },
        { id: 'row2', text: 'หัวข้อ 2' }
      ] : undefined,
      matrixCols: qType === 'matrix_single' ? [
        { id: 'col1', text: 'ดีมาก', score: 4 },
        { id: 'col2', text: 'ดี', score: 3 },
        { id: 'col3', text: 'พอใช้', score: 2 },
        { id: 'col4', text: 'ควรปรับปรุง', score: 1 }
      ] : undefined,
      minScale: type === 'scale' ? 0 : undefined,
      maxScale: type === 'scale' ? 10 : undefined,
      minLabel: type === 'scale' ? 'น้อยที่สุด' : undefined,
      maxLabel: type === 'scale' ? 'มากที่สุด' : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAddOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const nextId = (q.options?.length || 0) + 1;
        return {
          ...q,
          options: [...(q.options || []), { id: `opt${nextId}`, text: `ตัวเลือก ${nextId}`, label: `ตัวเลือก ${nextId}`, value: `option${nextId}` }]
        };
      }
      return q;
    }));
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/surveys/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, count: 5, category })
      });
      const newQuestions = await res.json();
      if (Array.isArray(newQuestions)) {
        setQuestions([...questions, ...newQuestions]);
        setAiTopic('');
      }
    } catch (err) {
      console.error('AI Generate failed:', err);
      alert('AI สร้างคำถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const surveyData = {
      id: survey?.id,
      title,
      description,
      category,
      categoryLabel: category === 'satisfaction' ? 'ความพึงพอใจ' : category === 'disaster_readiness' ? 'ความพร้อม' : 'ทั่วไป',
      department: user.department || 'ฝ่ายบริหารทั่วไป',
      creatorId: user.username,
      creatorName: user.fullname,
      status: settings.status,
      questions,
      settings
    };

    try {
      const method = survey ? 'PUT' : 'POST';
      const url = survey ? `/api/surveys/${survey.id}` : '/api/surveys';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surveyData)
      });
      if (res.ok) {
        onClose();
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-200 px-4 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold text-slate-900 border-none p-0 focus:ring-0 w-full md:w-96"
              placeholder="ชื่อแบบสำรวจ..."
            />
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              {survey ? 'กำลังแก้ไขแบบสำรวจ' : 'สร้างแบบสำรวจใหม่'} • {questions.length} คำถาม
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl mr-4">
            {(['build', 'settings', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'build' ? 'ออกแบบ' : tab === 'settings' ? 'ตั้งค่า' : 'พรีวิว'}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {survey ? 'บันทึกการแก้ไข' : 'บันทึกและสร้าง'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto py-10 px-4">
          {activeTab === 'build' && (
            <div className="space-y-8 pb-32">
              {/* Header Editor */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เพิ่มคำอธิบายแบบสำรวจของคุณ..."
                  className="w-full text-slate-600 border-none p-0 focus:ring-0 resize-none min-h-[100px]"
                />
                <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-500">หมวดหมู่:</span>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="bg-slate-50 border-none rounded-lg text-sm font-bold text-indigo-600 focus:ring-0"
                  >
                    <option value="general">ทั่วไป</option>
                    <option value="satisfaction">ความพึงพอใจ (ก.พ.ร.)</option>
                    <option value="disaster_readiness">ความพร้อมรับมือภัยพิบัติ</option>
                    <option value="training">การฝึกอบรม/ฝึกซ้อม</option>
                    <option value="assessment">การประเมินผล</option>
                    <option value="exam_quiz">แบบทดสอบ/ข้อสอบ</option>
                  </select>
                </div>
              </div>

              {/* Questions List */}
              <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {questions.map((q, idx) => (
                    <Reorder.Item 
                      key={q.id} 
                      value={q}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="mt-2 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-6 h-6" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                {(() => {
                                  const config = QUESTION_TYPES.find(t => t.type === q.type);
                                  const Icon = config?.icon || Type;
                                  return (
                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                                      <Icon className="w-4 h-4" />
                                      <span className="text-xs font-bold uppercase tracking-wider">{config?.label}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <input 
                              value={q.title}
                              onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                              className="w-full text-xl font-bold text-slate-900 border-none p-0 focus:ring-0 placeholder:text-slate-200"
                              placeholder="ระบุคำถามของคุณ..."
                            />
                            
                            <input 
                              value={q.description || ''}
                              onChange={(e) => handleUpdateQuestion(q.id, { description: e.target.value })}
                              className="w-full text-sm text-slate-500 border-none p-0 focus:ring-0 placeholder:text-slate-300"
                              placeholder="เพิ่มคำอธิบายคำถาม (ไม่บังคับ)..."
                            />

                            {/* Question Specific Editors */}
                            <div className="pt-4 border-t border-slate-50">
                              {['radio', 'checkbox', 'dropdown', 'ranking'].includes(q.type) && (
                                <div className="space-y-3">
                                  {q.options?.map((opt, oIdx) => (
                                    <div key={opt.id} className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border-2 ${q.type === 'checkbox' ? 'rounded-md' : 'rounded-full'} border-slate-200`} />
                                      <input 
                                        value={opt.label}
                                        onChange={(e) => {
                                          const newOpts = [...(q.options || [])];
                                          newOpts[oIdx] = { ...opt, label: e.target.value, value: e.target.value };
                                          handleUpdateQuestion(q.id, { options: newOpts });
                                        }}
                                        className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                                      />
                                      <button 
                                        onClick={() => {
                                          const newOpts = q.options?.filter(o => o.id !== opt.id);
                                          handleUpdateQuestion(q.id, { options: newOpts });
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <button 
                                    onClick={() => handleAddOption(q.id)}
                                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-2 ml-8"
                                  >
                                    <Plus className="w-4 h-4" />
                                    เพิ่มตัวเลือก
                                  </button>
                                </div>
                              )}

                              {['matrix', 'matrix_single', 'matrix_rating', 'matrix_checkbox'].includes(q.type) && (
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">หัวข้อแถว (Rows)</span>
                                    {q.matrixRows?.map((row, rIdx) => {
                                      return (
                                        <div key={rIdx} className="flex items-center gap-3">
                                          <input 
                                            value={row.text}
                                            onChange={(e) => {
                                              const newRows = [...(q.matrixRows || [])];
                                              newRows[rIdx] = { ...row, text: e.target.value };
                                              handleUpdateQuestion(q.id, { matrixRows: newRows });
                                            }}
                                            className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-1.5 text-sm"
                                          />
                                          <button onClick={() => handleUpdateQuestion(q.id, { matrixRows: q.matrixRows?.filter((_, i) => i !== rIdx) })} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                      );
                                    })}
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateQuestion(q.id, { 
                                        matrixRows: [...(q.matrixRows || []), { id: `row_${Date.now()}_${Math.random().toString(36).substring(5)}`, text: `หัวข้อ ${(q.matrixRows?.length || 0) + 1}` }] 
                                      })} 
                                      className="text-xs font-bold text-indigo-600"
                                    >
                                      + เพิ่มหัวข้อ
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">หัวข้อคอลัมน์ (ระดับการประเมิน)</span>
                                    <div className="flex flex-wrap gap-2">
                                      {q.matrixCols?.map((col, cIdx) => {
                                        return (
                                          <div key={cIdx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1">
                                            <input 
                                              value={col.text}
                                              onChange={(e) => {
                                                const newCols = [...(q.matrixCols || [])];
                                                newCols[cIdx] = { ...col, text: e.target.value };
                                                handleUpdateQuestion(q.id, { matrixCols: newCols });
                                              }}
                                              className="bg-transparent border-none p-0 text-xs font-bold w-16 focus:ring-0"
                                            />
                                            <button onClick={() => handleUpdateQuestion(q.id, { matrixCols: q.matrixCols?.filter((_, i) => i !== cIdx) })} className="text-slate-400 hover:text-rose-500"><Plus className="w-3 h-3 rotate-45" /></button>
                                          </div>
                                        );
                                      })}
                                      <button 
                                        type="button"
                                        onClick={() => handleUpdateQuestion(q.id, { 
                                          matrixCols: [...(q.matrixCols || []), { id: `col_${Date.now()}_${Math.random().toString(36).substring(5)}`, text: 'ตัวเลือกใหม่' }] 
                                        })} 
                                        className="px-3 py-1 border border-dashed border-indigo-200 rounded-lg text-xs font-bold text-indigo-600"
                                      >
                                        + เพิ่มระดับ
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {q.type === 'scale' && (
                                <div className="grid grid-cols-2 gap-8">
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ป้ายกำกับฝั่งน้อย</span>
                                    <input value={q.minLabel} onChange={e => handleUpdateQuestion(q.id, { minLabel: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ป้ายกำกับฝั่งมาก</span>
                                    <input value={q.maxLabel} onChange={e => handleUpdateQuestion(q.id, { maxLabel: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm" />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                                  <div className={`w-10 h-5 rounded-full transition-colors relative ${q.required ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${q.required ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={q.required}
                                    onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                                  />
                                  <span className="text-sm font-bold text-slate-500">จำเป็นต้องตอบ</span>
                                </label>
                              </div>
                              <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                                <Settings className="w-3.5 h-3.5" />
                                การตั้งค่าขั้นสูง
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {/* AI Generator Box */}
              <div className="bg-indigo-900 rounded-[2rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-indigo-400/30 transition-all duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="p-5 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                    <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <h3 className="text-2xl font-bold tracking-tight">ออกแบบด้วย AI อัจฉริยะ (Gemini Powered)</h3>
                    <p className="text-indigo-100 font-medium opacity-80">เพียงระบุหัวข้อที่คุณต้องการ ระบบจะสร้างคำถามระดับมืออาชีพให้คุณโดยอัตโนมัติ</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="เช่น ประเมินความพึงพอใจการซ้อมแผนอุทกภัย..."
                        className="flex-1 bg-white/10 border-white/20 rounded-2xl px-6 py-4 placeholder:text-indigo-300 focus:bg-white focus:text-indigo-900 focus:ring-0 transition-all font-medium"
                      />
                      <button 
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !aiTopic}
                        className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 px-8 py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 whitespace-nowrap shadow-xl shadow-yellow-400/20"
                      >
                        {isAiGenerating ? <div className="w-5 h-5 border-2 border-indigo-950/20 border-t-indigo-950 rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        เริ่มสร้างคำถาม
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar (Floating at bottom) */}
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4">
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl flex items-center gap-1">
                  {QUESTION_TYPES.slice(0, 6).map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleAddQuestion(item.type)}
                      className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex flex-col items-center gap-1 group"
                      title={item.desc}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-tight group-hover:scale-110 transition-transform">{item.label}</span>
                    </button>
                  ))}
                  <div className="w-px h-8 bg-slate-200 mx-2" />
                  <div className="relative group/more">
                    <button className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex flex-col items-center gap-1">
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">เพิ่มเติม</span>
                    </button>
                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover/more:grid grid-cols-2 gap-2 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 w-64 animate-in fade-in zoom-in-95 duration-200">
                      {QUESTION_TYPES.slice(6).map((item) => (
                        <button
                          key={item.type}
                          onClick={() => handleAddQuestion(item.type)}
                          className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-all text-left"
                        >
                          <item.icon className="w-5 h-5 text-indigo-500" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                            <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

              {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* General Settings */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <div className="p-8 space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <Settings className="w-6 h-6 text-indigo-600" />
                    การกำหนดค่าแบบสำรวจ
                  </h3>
                  {/* ... Existing Settings ... */}
                </div>
              </div>

              {/* Certificate Designer UI */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  ออกแบบใบประกาศ (Certificate Designer)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">รูปแบบธีม (Template)</label>
                    <select 
                      value={settings.certificateDesignerConfig?.templateId || 'classic'}
                      onChange={e => setSettings({...settings, certificateDesignerConfig: { ...settings.certificateDesignerConfig!, templateId: e.target.value as any }})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="classic">คลาสสิก (ทางการ)</option>
                      <option value="modern">โมเดิร์น (ทันสมัย)</option>
                      <option value="minimal">มินิมอล (เรียบง่าย)</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">ตำแหน่งโลโก้</label>
                    <select 
                      value={settings.certificateDesignerConfig?.logoPosition || 'top-center'}
                      onChange={e => setSettings({...settings, certificateDesignerConfig: { ...settings.certificateDesignerConfig!, logoPosition: e.target.value as any }})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="top-left">ซ้ายบน</option>
                      <option value="top-center">กึ่งกลาง</option>
                      <option value="top-right">ขวาบน</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">ฟอนต์</label>
                    <select 
                      value={settings.certificateDesignerConfig?.fontFamily || 'sarabun'}
                      onChange={e => setSettings({...settings, certificateDesignerConfig: { ...settings.certificateDesignerConfig!, fontFamily: e.target.value as any }})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="sarabun">TH Sarabun New</option>
                      <option value="prompt">Prompt</option>
                      <option value="kanit">Kanit</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
              <div className="bg-indigo-600 h-2" />
              <div className="p-8 md:p-12 flex-1 space-y-10">
                <div className="space-y-3">
                  <h2 className="text-3xl font-extrabold text-slate-900">{title}</h2>
                  <p className="text-slate-500 leading-relaxed text-lg">{description}</p>
                </div>

                <div className="space-y-12 pb-20">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg font-bold text-indigo-600 pt-0.5">{idx + 1}.</span>
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-slate-800">
                            {q.title}
                            {q.required && <span className="text-rose-500 ml-1.5">*</span>}
                          </p>
                          {q.description && <p className="text-sm text-slate-400 font-medium">{q.description}</p>}
                        </div>
                      </div>
                      
                      <div className="ml-8">
                        {/* Dummy Input for Preview */}
                        {['text', 'date', 'text_short', 'date_time'].includes(q.type) && (
                          <input type="text" className="w-full max-w-lg bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 disabled:cursor-not-allowed" disabled placeholder="ตัวอย่างคำตอบ..." />
                        )}
                        {['textarea', 'text_long'].includes(q.type) && (
                          <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 disabled:cursor-not-allowed h-32" disabled placeholder="ตัวอย่างคำตอบ..." />
                        )}
                        {['radio', 'checkbox', 'single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && (
                          <div className="space-y-3">
                            {q.options?.map(opt => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <div className={`w-5 h-5 border-2 ${['checkbox', 'multiple_choice'].includes(q.type) ? 'rounded-md' : 'rounded-full'} border-slate-200 bg-slate-50`} />
                                <span className="text-slate-600 font-medium">{opt.label || opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {['rating', 'rating_stars'].includes(q.type) && (
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(v => <Star key={v} className="w-8 h-8 text-slate-200" />)}
                          </div>
                        )}
                        {['scale', 'slider_score'].includes(q.type) && (
                          <div className="space-y-4">
                            <div className="flex justify-between max-w-lg">
                              {[...Array((q.maxScale || 10) - (q.minScale || 0) + 1)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-400">
                                    {(q.minScale || 0) + i}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between max-w-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                              <span>{q.minLabel}</span>
                              <span>{q.maxLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyEditor;
