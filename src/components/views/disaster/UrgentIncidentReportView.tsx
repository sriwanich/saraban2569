import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, Search, Edit, Trash2, FileText, ChevronLeft, Save, FileDown, Scan, Loader2, RefreshCw, CheckCircle2, AlertCircle, XCircle, Printer, ArrowRight } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import UrgentIncidentDashboard from './UrgentIncidentDashboard';
import { BarChart2 } from 'lucide-react';
import { EEC_PROVINCES } from '../../../data/eecLocations';
import { parseLocationString } from '../../../utils/locationParser';
import { getFiscalYearFromDocDate, getCalendarYearFromDocDate } from '../../../utils/thaiDateUtils';
import A4PaperPreview from '../../A4PaperPreview';

export interface UrgentIncident {
  id: string;
  docNumber: string;
  docDate: string;
  fromPerson: string;
  toPerson: string;
  incidentTypes: string[];
  incidentTypeOther: string;
  incidentAppearance: string;
  severity: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  amphoe?: string;
  tambon?: string;
  muban?: string;
  affectedPeople: string;
  affectedHouseholds: string;
  injured: string;
  dead: string;
  missing: string;
  evacuatedPeople: string;
  evacuatedHouseholds: string;
  damageHouses: string;
  damageHighRises: string;
  damageFactories: string;
  damageTemples: string;
  damageGovBuildings: string;
  damageOtherBuildings: string;
  damageBuildingCost: string;
  damageAgricultureCrops: string;
  damageAgricultureRice: string;
  damageAgricultureOrchard: string;
  damageAgricultureFish: string;
  damageAgricultureShrimp: string;
  damageLivestockCow: string;
  damageLivestockPig: string;
  damageLivestockPoultry: string;
  damageLivestockOther: string;
  damageAgricultureCost: string;
  damagePublicRoads: string;
  damagePublicBridges: string;
  damagePublicBridgeApproaches: string;
  damagePublicWeirs: string;
  damagePublicOther: string;
  damagePublicCost: string;
  totalDamageCost: string;
  mitigation: string;
  toolsFireTrucks: string;
  toolsWaterTrucks: string;
  toolsRescueTrucks: string;
  toolsFireBoats: string;
  toolsWaterPumps: string;
  toolsOther: string;
  opsGovAgencies: string;
  opsPrivateSector: string;
  proposals: string[];
  reporterName: string;
  reporterPosition: string;
  signatureImage?: string;
  damageImages?: string[];
  createdAt: string;
  createdBy: string;
}

const initialFormState: Omit<UrgentIncident, 'id' | 'createdAt' | 'createdBy'> = {
  docNumber: '', docDate: '', fromPerson: 'นายอำเภอ', toPerson: 'ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด',
  incidentTypes: [], incidentTypeOther: '', incidentAppearance: '', severity: 'เล็กน้อย',
  startDate: '', startTime: '', endDate: '', endTime: '', location: '',
  amphoe: '', tambon: '', muban: '',
  affectedPeople: '', affectedHouseholds: '', injured: '', dead: '', missing: '', evacuatedPeople: '', evacuatedHouseholds: '',
  damageHouses: '', damageHighRises: '', damageFactories: '', damageTemples: '', damageGovBuildings: '', damageOtherBuildings: '', damageBuildingCost: '',
  damageAgricultureCrops: '', damageAgricultureRice: '', damageAgricultureOrchard: '', damageAgricultureFish: '', damageAgricultureShrimp: '',
  damageLivestockCow: '', damageLivestockPig: '', damageLivestockPoultry: '', damageLivestockOther: '', damageAgricultureCost: '',
  damagePublicRoads: '', damagePublicBridges: '', damagePublicBridgeApproaches: '', damagePublicWeirs: '', damagePublicOther: '', damagePublicCost: '',
  totalDamageCost: '', mitigation: '',
  toolsFireTrucks: '', toolsWaterTrucks: '', toolsRescueTrucks: '', toolsFireBoats: '', toolsWaterPumps: '', toolsOther: '',
  opsGovAgencies: '', opsPrivateSector: '',
  proposals: [], reporterName: '', reporterPosition: 'นายอำเภอ',
  signatureImage: '',
  damageImages: []
};

const INCIDENT_TYPES = ['อุทกภัย', 'ความแห้งแล้ง', 'วาตภัย', 'อัคคีภัย', 'ไฟป่า', 'อุบัติภัย', 'อากาศหนาว', 'แผ่นดินไหว', 'สารเคมีและวัตถุอันตราย', 'ทุ่นระเบิด', 'การป้องกันและระงับภัยทางอากาศ', 'การก่อวินาศกรรม', 'การอพยพประชาชนและส่วนราชการ'];
const PROPOSALS = ['เพื่อโปรดทราบ', 'เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย', 'เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน'];

export default function UrgentIncidentReportView({ user, prefillData, onClearPrefillData }: { user: any; prefillData?: any; onClearPrefillData?: () => void }) {
  const { confirm } = useConfirm();
  const canEdit = user?.role === 'admin' || user?.department === 'ฝ่ายสงเคราะห์ผู้ประสบภัย';
  const [reports, setReports] = useState<UrgentIncident[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(2569);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'dashboard' | 'preview'>('list');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data && data.currentYear) {
          setCurrentYear(Number(data.currentYear));
        }
      } catch (e) {
        console.warn('Failed to fetch settings in UrgentIncidentReportView:', e);
      }
    };
    fetchSettings();
  }, []);
  const [previousMode, setPreviousMode] = useState<'list' | 'form'>('list');
  const [previewData, setPreviewData] = useState<UrgentIncident | null>(null);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('edms_urgent_incident_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.location || parsed.mitigation || (parsed.incidentTypes && parsed.incidentTypes.length > 0))) {
          return parsed;
        }
      }
    } catch (e) {}
    return initialFormState;
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-save form draft to localStorage
  useEffect(() => {
    if (viewMode === 'form' && !editingId && formData) {
      if (formData.location || formData.mitigation || (formData.incidentTypes && formData.incidentTypes.length > 0)) {
        try {
          localStorage.setItem('edms_urgent_incident_draft', JSON.stringify(formData));
        } catch (e) {}
      }
    }
  }, [formData, viewMode, editingId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e3a8a'; // Dark blue ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Check if canvas is empty (we can check by getting pixel data, or just save it)
    const dataUrl = canvas.toDataURL('image/png');
    setFormData(prev => ({ ...prev, signatureImage: dataUrl }));
    setIsDrawingSignature(false);
  };

  // Save feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    show: boolean;
    status: 'success' | 'error';
    message: string;
    report?: UrgentIncident;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    if (prefillData) {
      setFormData(prev => {
        const base = {
          ...prev,
          ...prefillData,
          incidentTypes: Array.isArray(prefillData.incidentTypes) ? prefillData.incidentTypes : [],
        };
        if ((!base.amphoe || !base.tambon) && base.location) {
          const parsed = parseLocationString(base.location);
          base.amphoe = base.amphoe || parsed.amphoe;
          base.tambon = base.tambon || parsed.tambon;
          base.muban = base.muban || parsed.muban;
        }
        return base;
      });
      setEditingId(null);
      setViewMode('form');
      if (onClearPrefillData) {
        onClearPrefillData();
      }
    }
  }, [prefillData, onClearPrefillData]);

  const lastScanDataRef = React.useRef<{ fileBase64: string; mimeType: string; fileName: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load reports from both Firestore & REST API fallback
  const fetchLocalReports = async () => {
    try {
      const res = await fetch('/api/urgent-incidents');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as UrgentIncident[];
      }
    } catch (e) {
      console.warn('REST API fetch urgent incidents failed:', e);
    }
    return [];
  };

  useEffect(() => {
    setLoading(true);
    fetchLocalReports().then(localList => {
      setReports(localList);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setValidationError(null);
    setSaveFeedback(null);

    // Form Validation
    if (!formData.location || !formData.location.trim() || !formData.docDate || !formData.docDate.trim()) {
      setValidationError('กรุณาระบุ "สถานที่เกิดภัย" และ "วันที่รายงาน" ให้ครบถ้วนก่อนบันทึก');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.incidentTypes || formData.incidentTypes.length === 0) {
      setValidationError('กรุณาเลือกชนิดของภัยอย่างน้อย ๑ รายการ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const formattedTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      // Helper to upload base64 image and return URL
      const uploadBase64Image = async (base64DataUrl: string, subfolder: string, originalName: string = 'image.png'): Promise<string> => {
        if (!base64DataUrl.startsWith('data:image/')) return base64DataUrl; // Already a URL or not base64
        
        try {
          const blob = base64ToBlob(base64DataUrl);
          const uploadData = new FormData();
          uploadData.append('subfolder', subfolder);
          uploadData.append('uploadedBy', user?.username || 'system');
          uploadData.append('files', blob, originalName);

          const res = await fetch(`/api/upload?subfolder=${subfolder}&uploadedBy=${encodeURIComponent(user?.username || 'system')}`, {
            method: 'POST',
            body: uploadData
          });
          
          if (res.ok) {
            const result = await res.json();
            if (result.files && result.files.length > 0) {
              return result.files[0].url;
            }
          }
          console.error(`Failed to upload to ${subfolder}`);
        } catch (err) {
          console.error(`Error uploading image to ${subfolder}:`, err);
        }
        return base64DataUrl; // Fallback to original base64 if upload fails
      };

      // Upload signature if it's base64
      let processedSignature = formData.signatureImage;
      if (processedSignature && processedSignature.startsWith('data:image/')) {
        processedSignature = await uploadBase64Image(processedSignature, 'reporter_signatures', `signature_${Date.now()}.png`);
      }

      // Upload damage images if they are base64
      let processedDamageImages = [...(formData.damageImages || [])];
      for (let i = 0; i < processedDamageImages.length; i++) {
        if (processedDamageImages[i] && processedDamageImages[i].startsWith('data:image/')) {
          processedDamageImages[i] = await uploadBase64Image(processedDamageImages[i], 'damage_photos', `damage_${Date.now()}_${i}.png`);
        }
      }

      // 1. Try REST API endpoint
      const restPayload = {
        ...formData,
        signatureImage: processedSignature,
        damageImages: processedDamageImages,
        id: editingId || undefined,
        createdAt: editingId ? undefined : nowIso,
        createdBy: user?.username || user?.name || 'เจ้าหน้าที่ ปภ.'
      };

      const res = await fetch(editingId ? `/api/urgent-incidents/${editingId}` : '/api/urgent-incidents', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restPayload)
      });
      const json = await res.json();
      
      if (json.success) {
        const savedRecord = json.data || { ...restPayload, id: json.id, docNumber: json.docNumber };
        const finalId = savedRecord.id;
        
        // Update local list state
        setReports(prev => {
          const exists = prev.some(r => r.id === finalId);
          if (exists) {
            return prev.map(r => r.id === finalId ? savedRecord : r);
          }
          return [savedRecord, ...prev];
        });

        // Set SUCCESS Feedback Notice
        setSaveFeedback({
          show: true,
          status: 'success',
          message: editingId ? 'อัปเดตแบบรายงานเหตุด่วนสาธารณภัยเรียบร้อยแล้ว' : 'บันทึกแบบรายงานเหตุด่วนสาธารณภัยสำเร็จ!',
          report: savedRecord,
          timestamp: formattedTime
        });

        // Clear local draft storage on successful save
        try { localStorage.removeItem('edms_urgent_incident_draft'); } catch (e) {}

        fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: editingId ? 'UPDATE_URGENT_INCIDENT' : 'CREATE_URGENT_INCIDENT', details: `${editingId ? 'แก้ไข' : 'สร้าง'}แบบรายงานเหตุด่วนสาธารณภัย: ${formData.location || 'ไม่ระบุสถานที่'}`, username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' }) }).catch(console.error); window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลไปยังเซิร์ฟเวอร์ได้');
      }
    } catch (err: any) {
      console.error('Error in handleSave:', err);
      setSaveFeedback({
        show: true,
        status: 'error',
        message: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        timestamp: formattedTime
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };



  const cropImageFromBase64 = (
    base64Str: string,
    box: [number, number, number, number] // [ymin, xmin, ymax, xmax] in 0..1000 scale
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve('');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }

          const width = img.naturalWidth;
          const height = img.naturalHeight;

          // box is [ymin, xmin, ymax, xmax] in 0..1000 scale
          const ymin = (box[0] / 1000) * height;
          const xmin = (box[1] / 1000) * width;
          const ymax = (box[2] / 1000) * height;
          const xmax = (box[3] / 1000) * width;

          const cropW = Math.max(10, xmax - xmin);
          const cropH = Math.max(10, ymax - ymin);

          canvas.width = cropW;
          canvas.height = cropH;

          ctx.drawImage(img, xmin, ymin, cropW, cropH, 0, 0, cropW, cropH);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error('Error cropping image:', err);
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = base64Str;
    });
  };

  const resizeImageBase64 = (base64Str: string, maxWidth: number = 1600, maxHeight: number = 1600): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxWidth && height <= maxHeight) {
          resolve(base64Str);
          return;
        }

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  const base64ToBlob = (base64DataUrl: string): Blob => {
    const parts = base64DataUrl.split(';base64,');
    if (parts.length < 2) {
      const raw = window.atob(base64DataUrl);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: 'application/octet-stream' });
    }
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const executeScan = async (base64Data: string, mimeType: string) => {
    setIsScanning(true);
    setScanErrorMsg(null);
    try {
      const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
      const savedKey = (settings.geminiApiKey || '').trim();

      // Compress and resize image first on the client-side to fit within body limits (e.g. Nginx 1MB client_max_body_size)
      // and speed up the API uploading & processing.
      let finalBase64 = base64Data;
      let finalMimeType = mimeType;
      if (base64Data.startsWith('data:image/')) {
        try {
          finalBase64 = await resizeImageBase64(base64Data);
          finalMimeType = 'image/jpeg'; // converted to JPEG in resizeImageBase64
          
          // Also save the resized version in ref so retries don't send the huge one
          if (lastScanDataRef.current) {
            lastScanDataRef.current.fileBase64 = finalBase64;
            lastScanDataRef.current.mimeType = finalMimeType;
          }
        } catch (resizeErr) {
          console.warn('Failed to resize image, sending original:', resizeErr);
        }
      }

      // Convert base64 to Blob to send as multipart/form-data (highly recommended to bypass WAF & JSON size limits)
      const blob = base64ToBlob(finalBase64);
      const formData = new FormData();
      formData.append('file', blob, finalMimeType.startsWith('image/') ? 'scan-document.jpg' : 'scan-document.pdf');
      formData.append('apiKey', savedKey);

      const response = await fetch('/api/ai/scan-urgent-incident', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        let errMsg = `เซิร์ฟเวอร์ตอบกลับผิดพลาด (รหัสสถานะ: ${response.status})`;
        if (response.status === 413) {
          errMsg = 'ไฟล์ภาพมีขนาดใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์ (413 Request Entity Too Large) ระบบได้บีบอัดแล้วแต่ยังเกินขีดจำกัดของระบบโฮสติ้งนี้ กรุณาใช้ไฟล์ภาพอื่นหรือลดความละเอียดลง';
        } else {
          try {
            const errJson = JSON.parse(text);
            if (errJson && errJson.error) {
              errMsg = errJson.error;
            }
          } catch (e) {
            if (text && text.includes('<!DOCTYPE')) {
              errMsg = `เซิร์ฟเวอร์ขัดข้อง (รหัสสถานะ: ${response.status}) โฮสติ้งของท่านอาจไม่พบบริการ API คาดว่าเซิร์ฟเวอร์ Node.js (server.ts) ไม่ได้กำลังรันอยู่ หรือ URL เส้นทางถูกบล็อก กรุณาตั้งค่า Reverse Proxy ไปยังพอร์ต 3000`;
            } else if (text) {
              errMsg = text.substring(0, 200);
            }
          }
        }
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (result.success && result.data) {
        let croppedSignature = '';
        const croppedDamageImages: string[] = [];

        // Crop signature if signatureBox is provided and it's an image
        if (result.data.signatureBox && base64Data.startsWith('data:image/')) {
          try {
            croppedSignature = await cropImageFromBase64(base64Data, result.data.signatureBox);
          } catch (e) {
            console.error('Error cropping signature:', e);
          }
        }

        // Crop damage images if damageBoxes are provided
        if (Array.isArray(result.data.damageBoxes) && result.data.damageBoxes.length > 0 && base64Data.startsWith('data:image/')) {
          for (const box of result.data.damageBoxes) {
            try {
              const cropped = await cropImageFromBase64(base64Data, box);
              if (cropped) {
                croppedDamageImages.push(cropped);
              }
            } catch (e) {
              console.error('Error cropping damage box:', e);
            }
          }
        }

        setFormData(prev => ({
          ...prev,
          ...result.data,
          incidentTypes: Array.isArray(result.data.incidentTypes) ? result.data.incidentTypes : prev.incidentTypes,
          signatureImage: croppedSignature || prev.signatureImage,
          damageImages: croppedDamageImages.length > 0 ? croppedDamageImages : prev.damageImages
        }));
        setScanErrorMsg(null);
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SCAN_URGENT_INCIDENT',
            details: `AI (${result.usedModel || 'AI'}) สแกนคัดลอกข้อมูลแบบรายงานเหตุด่วนสาธารณภัย`,
            username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน'
          })
        }).catch(console.error);

        await confirm({
          title: 'ดึงข้อมูลสำเร็จ',
          message: `AI (${result.usedModel || 'AI'}) สแกนและคัดลอกข้อมูลทั้งหมดจากเอกสารลงในฟอร์ม รวมถึงแยกสกัดลายเซ็นและรูปถ่ายความเสียหาย (ถ้ามี) เรียบร้อยแล้ว กรุณาตรวจสอบและบันทึกรายงาน`,
          type: 'info',
          confirmText: 'ตกลง'
        });
      } else {
        throw new Error(result.error || 'ไม่สามารถดึงข้อมูลได้');
      }
    } catch (err: any) {
      console.error('Scan Error:', err);
      let errMsg = err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI';
      try {
        if (typeof errMsg === 'string' && errMsg.startsWith('{') && errMsg.endsWith('}')) {
          const parsed = JSON.parse(errMsg);
          if (parsed.error) errMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errMsg;
        }
      } catch {}

      const cleanLower = String(errMsg).toLowerCase();
      if (cleanLower.includes('503') || cleanLower.includes('overloaded') || cleanLower.includes('unavailable') || cleanLower.includes('high traffic')) {
        errMsg = 'ระบบเซิร์ฟเวอร์ AI ของ Google มีปริมาณผู้ใช้งานหนาแน่นชั่วคราว ระบบได้พยายามสลับไปยังโมเดลสำรองแล้ว กรุณากดปุ่ม "ลองสแกนใหม่อีกครั้ง"';
      } else if (cleanLower.includes('429') || cleanLower.includes('quota') || cleanLower.includes('rate limit')) {
        errMsg = 'ระบบ AI มีปริมาณคำขอหนาแน่นชั่วคราว (Rate limit / Quota Exceeded) กรุณารอสักครู่แล้วกดลองใหม่อีกครั้ง';
      }

      setScanErrorMsg(errMsg);

      const wantRetry = await confirm({
        title: 'การสแกนด้วย AI ขัดข้อง',
        message: errMsg,
        description: 'ต้องการส่งคำร้องลองสแกนใหม่อีกครั้งทันทีหรือไม่?',
        type: 'warning',
        confirmText: 'ลองสแกนใหม่อีกครั้ง',
        cancelText: 'ปิด'
      });

      if (wantRetry && lastScanDataRef.current) {
        executeScan(lastScanDataRef.current.fileBase64, lastScanDataRef.current.mimeType);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        lastScanDataRef.current = {
          fileBase64: base64Data,
          mimeType: file.type,
          fileName: file.name
        };
        await executeScan(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setScanErrorMsg(err.message || 'ไม่สามารถอ่านไฟล์ได้');
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'ลบรายงานเหตุด่วน',
      message: 'คุณต้องการลบรายงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้',
      type: 'delete',
      confirmText: 'ลบข้อมูล'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/urgent-incidents/${id}`, { method: 'DELETE' });
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || 'ไม่สามารถลบข้อมูลจากเซิร์ฟเวอร์ได้');
      }

      setReports(prev => prev.filter(r => r.id !== id));

      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_URGENT_INCIDENT',
          details: `ลบแบบรายงานเหตุด่วนสาธารณภัยรหัส: ${id}`,
          username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน'
        })
      }).catch(console.error);
    } catch (err) {
      console.error('Error deleting report:', err);
      // Optional: Show error message
    }
  };

  const handleEdit = (report: UrgentIncident) => {
    const updated = { ...report };
    if ((!updated.amphoe || !updated.tambon) && updated.location) {
      const parsed = parseLocationString(updated.location);
      updated.amphoe = updated.amphoe || parsed.amphoe;
      updated.tambon = updated.tambon || parsed.tambon;
      updated.muban = updated.muban || parsed.muban;
    }
    setFormData(updated);
    setEditingId(report.id);
    setViewMode('form');
  };

  const handleViewPreview = (report: UrgentIncident, previous: "list" | "form") => {
    setPreviewData(report);
    setPreviousMode(previous);
    setViewMode("preview");
    fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "VIEW_URGENT_INCIDENT", details: `ดูตัวอย่างแบบรายงานเหตุด่วนสาธารณภัย: ${report.location || "ไม่ระบุสถานที่"}`, username: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "ผู้ใช้งาน" }) }).catch(console.error);
  };

  const handleViewDashboard = () => {
    setViewMode("dashboard");
    fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "VIEW_URGENT_INCIDENT_DASHBOARD", details: "เข้าดูแดชบอร์ดสรุปรายงานเหตุด่วนสาธารณภัย", username: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "ผู้ใช้งาน" }) }).catch(console.error);
  };

  const handleAddNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setViewMode('form');
  };

  const handleCheckboxChange = (field: 'incidentTypes' | 'proposals', value: string) => {
    setFormData(prev => {
      const list = prev[field];
      if (list.includes(value)) {
        return { ...prev, [field]: list.filter(item => item !== value) };
      }
      return { ...prev, [field]: [...list, value] };
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = 
        (r.location || '').includes(debouncedSearchQuery) || 
        (r.docNumber || '').includes(debouncedSearchQuery) ||
        (r.reporterName || '').includes(debouncedSearchQuery);
        
      if (!matchesSearch) return false;

      if (yearFilter === 'all') return true;
      
      const targetYear = yearFilter === 'current' ? currentYear : Number(yearFilter);
      const targetYearStr = String(targetYear);
      const targetThaiYearStr = targetYearStr.replace(/[0-9]/g, match => '๐๑๒๓๔๕๖๗๘๙'[parseInt(match)]);

      const docFiscalYear = getFiscalYearFromDocDate(r.docDate, r.startDate);
      const docCalendarYear = getCalendarYearFromDocDate(r.docDate, r.startDate);

      let matchesYear = false;
      if (docFiscalYear && docFiscalYear === targetYear) {
        matchesYear = true;
      }
      if (docCalendarYear && docCalendarYear === targetYear) {
        matchesYear = true;
      }
      if (r.docDate && (r.docDate.includes(targetYearStr) || r.docDate.includes(targetThaiYearStr))) {
        matchesYear = true;
      }
      if (r.startDate && (r.startDate.includes(targetYearStr) || r.startDate.includes(targetThaiYearStr))) {
        matchesYear = true;
      }

      return matchesYear;
    }).sort((a, b) => {
      // Sort by docDate or createdAt descending
      const dateA = a.docDate || a.createdAt;
      const dateB = b.docDate || b.createdAt;
      return dateB.localeCompare(dateA);
    });
  }, [reports, searchQuery, yearFilter, currentYear]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, yearFilter]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    reports.forEach(r => {
      // ดึงปีงบประมาณและปีจากวันที่ในเอกสารเท่านั้น (ไม่ใช้วันที่ลงทะเบียน)
      const fy = getFiscalYearFromDocDate(r.docDate, r.startDate);
      if (fy) {
        years.add(fy);
      }
      const cy = getCalendarYearFromDocDate(r.docDate, r.startDate);
      if (cy) {
        years.add(cy);
      }
    });
    
    // หากยังไม่มีข้อมูล ให้แสดงปีงบประมาณปัจจุบันเป็นค่าเริ่มต้น
    if (years.size === 0 && currentYear) {
      years.add(currentYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [reports, currentYear]);

  
  const printDocument = (report: UrgentIncident) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      confirm({
        title: 'การแจ้งเตือน',
        message: 'กรุณาอนุญาต Pop-up บนเบราว์เซอร์ของคุณเพื่อพิมพ์เอกสาร',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });
      return;
    }
    
    // Helper function to convert Arabic numerals to Thai numerals
    const toThai = (str: any) => {
      if (str === null || str === undefined) return '';
      const s = String(str);
      const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
      return s.replace(/[0-9]/g, match => thaiNumerals[parseInt(match)]);
    };

    // Helper function to format dotted lines
    const fill = (text: any, placeholderWidthPx: number = 100) => {
      const val = text !== undefined && text !== null ? String(text).trim() : '';
      if (!val) {
        return `<span class="dotted-line" style="width: ${placeholderWidthPx}px;"></span>`;
      }
      return `<span class="filled-text">${toThai(val)}</span>`;
    };

    const renderCheckbox = (isChecked: boolean) => {
      return `<span class="doc-checkbox">${isChecked ? '✓' : ''}</span>`;
    };

    const incidentTypes1 = ['อุทกภัย', 'วาตภัย', 'ความแห้งแล้ง', 'อัคคีภัย', 'ไฟป่า', 'อากาศหนาว', 'แผ่นดินไหว'];
    const incidentTypes2 = ['สารเคมีและวัตถุอันตราย', 'อุบัติเหตุ', 'ทุ่นระเบิด', 'การป้องกันและระงับภัยทางอากาศ'];
    const incidentTypes3 = ['การก่อวินาศกรรม', 'การอพยพประชาชนและส่วนราชการ'];

    let appendixHtml = '';
    if (report.damageImages && report.damageImages.length > 0) {
      const pages = [];
      for (let i = 0; i < report.damageImages.length; i += 2) {
        pages.push(report.damageImages.slice(i, i + 2));
      }
      pages.forEach((pair, pageIdx) => {
        appendixHtml += `
        <section class="a4-page-sheet" style="padding: 15mm; font-size: 15pt; line-height: 1.4; display: flex; flex-direction: column; align-items: center;">
          <div style="position: absolute; top: 16px; right: 16px; font-size: 10pt; color: #777;">
            หน้า ${toThai(pageIdx + 2)} (ภาคผนวกภาพถ่ายแนบ)
          </div>
          
          <div style="text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 24px; padding-top: 8px; line-height: 1.3;">
            <div>ภาพถ่ายความเสียหายในพื้นที่</div>
            <div style="font-size: 15pt; margin-top: 2px;">บ้าน${report.reporterName || 'ผู้รายงาน / ผู้ประสบภัย'}</div>
            <div style="font-size: 15pt;">บ้านเลขที่ ${toThai(report.location || '')}</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; max-width: 580px;">
            ${pair.map((imgUrl, imgIdx) => {
              const globalIdx = pageIdx * 2 + imgIdx + 1;
              return `
              <div style="text-align: center; width: 100%;">
                <img 
                  src="${imgUrl}" 
                  alt="Damage ${globalIdx}" 
                  style="width: 100%; height: 310px; object-fit: cover; margin: 0 auto; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background-color: #f5f5f5;" 
                />
                <div style="font-size: 14pt; font-weight: bold; color: #333; margin-top: 8px;">
                  ภาพถ่ายความเสียหาย ที่ ${toThai(globalIdx)}
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </section>
        `;
      });
    }

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>แบบรายงานเหตุด่วนสาธารณภัย - ที่ ${report.docNumber || ''}</title>
<style>
@font-face {
  font-family: 'Sarabun';
  font-weight: 400;
  src: url(https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont/fonts/thsarabunnew-webfont.woff2) format('woff2');
}
@font-face {
  font-family: 'Sarabun';
  font-weight: 700;
  src: url(https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont/fonts/thsarabunnew_bold-webfont.woff2) format('woff2');
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: 'Sarabun', sans-serif;
  font-size: 13pt;
  line-height: 1.15;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.pages { display: block; padding: 0; }
.a4-page-sheet {
  width: 210mm;
  height: 297mm;
  min-height: 297mm;
  max-height: 297mm;
  padding: 8mm 12mm 5mm 15mm;
  position: relative;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  background: #ffffff;
}
.grid-header {
  display: grid;
  grid-template-cols: 1fr 1.2fr 1fr;
  align-items: end;
  margin-bottom: 2px;
}
.doc-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border: 1px solid #000;
  margin-right: 5px;
  position: relative;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  line-height: 10px;
  vertical-align: middle;
}
.doc-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  margin-right: 14px;
  margin-bottom: 2px;
}
.pl-indent {
  padding-left: 2.5em;
}
.flex-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
}
.dotted-line {
  display: inline-block;
  border-bottom: 1px dotted #000;
  height: 0.85em;
  vertical-align: baseline;
  margin: 0;
}
.filled-text {
  display: inline;
  border-bottom: 1px dotted #000;
  padding: 0 1px;
  vertical-align: baseline;
  color: #000000;
  font-weight: normal;
  line-height: 1.15;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
}
</style>
</head>
<body>
<main class="pages">
  <!-- Page 1 -->
  <section class="a4-page-sheet">
    <div style="position: absolute; top: 8px; right: 16px; font-size: 9pt; color: #777;">หน้า ๑ (เอกสารแบบรายงาน)</div>
    
    <!-- Header section -->
    <div class="grid-header">
      <div style="text-align: left;">
        <span style="font-size: 13pt; margin-right: 4px;">ความเร่งด่วน</span>
        <span style="color: #dc2626; font-weight: bold; font-size: 20pt; letter-spacing: -0.025em; line-height: 1;">ด่วนที่สุด</span>
      </div>
      <div style="text-align: center;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0;">แบบรายงานเหตุด่วนสาธารณภัย</h1>
      </div>
      <div style="text-align: right;">
        วันที่ ${fill(report.docDate, 140)}
      </div>
    </div>

    <div style="margin-top: 4px; line-height: 1.25;">
      <div style="display: flex; justify-content: space-between;">
        <div>ที่ ${fill(report.docNumber?.replace(/^ที่\s*/, ''), 140)}</div>
      </div>
      <div>จาก ${fill(report.fromPerson, 450)}</div>
      <div style="margin-bottom: 6px;">ถึง ${fill(report.toPerson, 450)}</div>

      <!-- 1. ชนิดของภัย -->
      <div>
        <strong style="font-weight: bold;">๑. ชนิดของภัย</strong>
        <div class="pl-indent" style="margin-top: 2px; line-height: 1.1;">
          <div style="display: flex; flex-wrap: nowrap; align-items: center; margin-bottom: 2px;">
            ${incidentTypes1.map(t => {
              const isChecked = report.incidentTypes?.includes(t) || (t === 'แผ่นดินไหว' && (report.incidentTypes?.includes('แผ่นดินไหวและอาคารถล่ม') || report.incidentTypes?.includes('แผ่นดินไหว')));
              return `<span class="doc-item">${renderCheckbox(isChecked)}<span>${t}</span></span>`;
            }).join('')}
          </div>
          <div style="display: flex; flex-wrap: nowrap; align-items: center; margin-bottom: 2px;">
            <span style="margin-right: 14px;">และอาคารถล่ม</span>
            ${incidentTypes2.map(t => {
              const isChecked = report.incidentTypes?.includes(t) || (t === 'อุบัติเหตุ' && report.incidentTypes?.includes('อุบัติภัย'));
              return `<span class="doc-item">${renderCheckbox(isChecked)}<span>${t}</span></span>`;
            }).join('')}
          </div>
          <div style="display: flex; flex-wrap: nowrap; align-items: center; margin-bottom: 2px;">
            ${incidentTypes3.map(t => {
              const isChecked = report.incidentTypes?.includes(t);
              return `<span class="doc-item">${renderCheckbox(isChecked)}<span>${t}</span></span>`;
            }).join('')}
            <span class="doc-item">
              ${renderCheckbox(report.incidentTypes?.includes('อื่นๆ') || !!report.incidentTypeOther)}
              <span>อื่นๆ ${fill(report.incidentTypeOther, 240)}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Severity and detail -->
      <div class="pl-indent" style="line-height: 1.6; margin-bottom: 4px; display: block; word-break: break-word;">
        <span style="margin-right: 10px;">ความรุนแรงและลักษณะของภัย</span>
        ${['เล็กน้อย', 'ปานกลาง', 'รุนแรง'].map(sev => {
          const isChecked = report.severity === sev;
          return `<span style="display: inline-flex; align-items: center; margin-right: 14px; white-space: nowrap; vertical-align: middle;">${renderCheckbox(isChecked)}<span style="margin-left: 4px;">${sev}</span></span>`;
        }).join('')}
        <span style="margin-left: 10px; display: inline;">
          ลักษณะของภัย ${fill(report.incidentAppearance, 220)}
        </span>
      </div>

      <!-- 2. วันเวลาที่เกิดภัย -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๒. ภัยเกิดเมื่อ</strong> - วันที่ ${fill(report.startDate, 130)} เวลา ${fill(report.startTime, 80)} น. ภัยสิ้นสุด วันที่ ${fill(report.endDate, 130)} เวลา ${fill(report.endTime, 80)} น.
      </div>

      <!-- 3. สถานที่เกิดภัย -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๓. สถานที่เกิดภัย</strong> - ${fill(report.location, 620)}
      </div>

      <!-- 4. ราษฎรที่ประสบภัย -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๔. ราษฎรที่ประสบภัย</strong>
        <div class="pl-indent" style="line-height: 1.1;">
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px;">
            <span>๔.๑ ราษฎรได้รับความเดือดร้อน ${fill(report.affectedPeople, 50)} คน</span>
            <span>${fill(report.affectedHouseholds, 50)} ครัวเรือน</span>
            <span>๔.๒ บาดเจ็บ (เล็กน้อย) ${fill(report.injured, 50)} คน</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px;">
            <span>๔.๓ เสียชีวิต ${fill(report.dead, 50)} คน</span>
            <span>๔.๔ สูญหาย ${fill(report.missing, 50)} คน (ให้ระบุรายละเอียด)</span>
            <span>๔.๕ อพยพไปที่ปลอดภัย ${fill(report.evacuatedPeople, 50)} คน ${fill(report.evacuatedHouseholds, 50)} ครัวเรือน</span>
          </div>
        </div>
      </div>

      <!-- 5. พื้นที่ประสบภัยและความเสียหาย -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๕. พื้นที่ประสบภัยและความเสียหาย</strong>
        <div class="pl-indent" style="line-height: 1.1;">
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px;">
            <span>๕.๑ อาคารก่อสร้าง - บ้านพักอาศัยเสียหายทั้งหลัง ${fill('', 40)} หลัง</span>
            <span>บ้านพักอาศัยเสียหายบางส่วน ${fill(report.damageHouses, 40)} หลัง</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px; padding-left: 2.2em;">
            <span>อาคารสูงตั้งแต่ ๒๓ เมตรขึ้นไป ${fill(report.damageHighRises, 40)} อาคาร</span>
            <span>โรงเรียน ${fill('', 40)} แห่ง</span>
            <span>วัด ${fill(report.damageTemples, 40)} แห่ง</span>
            <span>สถานที่ราชการ ${fill(report.damageGovBuildings, 40)} แห่ง</span>
            <span>อื่นๆ ${fill(report.damageOtherBuildings, 120)}</span>
          </div>
          <div style="padding-left: 2.2em;">มูลค่าความเสียหายประมาณ ${fill(report.damageBuildingCost, 120)} บาท</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px;">
            <span>๕.๒ พื้นที่และทรัพย์สินทางการเกษตร พืชไร่ ${fill(report.damageAgricultureCrops, 40)} ไร่</span>
            <span>นาข้าว ${fill(report.damageAgricultureRice, 40)} ไร่</span>
            <span>พืชสวน ${fill(report.damageAgricultureOrchard, 40)} ไร่</span>
            <span>บ่อปลา ${fill(report.damageAgricultureFish, 40)} บ่อ</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0 8px; padding-left: 2.2em;">
            <span>บ่อกุ้ง ${fill(report.damageAgricultureShrimp, 40)} บ่อ</span>
            <span>สัตว์เลี้ยง (โค/กระบือ ${fill(report.damageLivestockCow, 40)} ตัว</span>
            <span>สุกร ${fill(report.damageLivestockPig, 40)} ตัว</span>
            <span>เป็ด/ไก่ ${fill(report.damageLivestockPoultry, 40)} ตัว)</span>
            <span>อื่นๆ ${fill(report.damageLivestockOther, 120)}</span>
          </div>
          <div style="padding-left: 2.2em;">มูลค่าความเสียหายประมาณ ${fill(report.damageAgricultureCost, 120)} บาท</div>

          <div>
            ๕.๓ สิ่งสาธารณประโยชน์ ถนน ${fill(report.damagePublicRoads, 60)} สาย
            สะพาน ${fill(report.damagePublicBridges, 60)} แห่ง
            คอสะพาน ${fill(report.damagePublicBridgeApproaches, 60)} แห่ง
            ฝาย ${fill(report.damagePublicWeirs, 60)} แห่ง
            อื่นๆ ${fill(report.damagePublicOther, 180)}
          </div>
          <div style="padding-left: 2.2em;">มูลค่าความเสียหายประมาณ ${fill(report.damagePublicCost, 120)} บาท</div>
          <div>๕.๔ รวมมูลค่าความเสียหายเบื้องต้นประมาณ ${fill(report.totalDamageCost, 160)} บาท</div>
        </div>
      </div>

      <!-- 6. การบรรเทาภัย -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๖. การบรรเทาภัย</strong> - ${fill(report.mitigation, 620)}
      </div>

      <!-- 7. เครื่องมือ/อุปกรณ์ที่ใช้ -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๗. เครื่องมือ/อุปกรณ์ที่ใช้</strong>
        <div class="pl-indent" style="display: flex; flex-wrap: wrap; gap: 0 12px; line-height: 1.1;">
          <span>- รถปฏิบัติการกู้ชีพ ${fill('', 40)} คัน</span>
          <span>รถดับเพลิง จำนวน ${fill(report.toolsFireTrucks, 40)} คัน</span>
          <span>รถยนต์บรรทุกน้ำ ${fill(report.toolsWaterTrucks, 40)} คัน</span>
          <span>รถกู้ภัย ${fill(report.toolsRescueTrucks, 40)} คัน</span>
          <span>เรือ ${fill(report.toolsFireBoats, 40)} ลำ</span>
          <span>เครื่องสูบน้ำ ${fill(report.toolsWaterPumps, 40)} เครื่อง</span>
          <span>(อื่นๆ) ${fill(report.toolsOther, 160)}</span>
        </div>
        <div class="pl-indent" style="display: flex; line-height: 1.1;">
          <span>ส่วนราชการ ${fill(report.opsGovAgencies, 580)}</span>
        </div>
      </div>

      <!-- 8. การดำเนินงานของส่วนราชการฯ -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๘. การดำเนินงานของส่วนราชการ หน่วยอาสาสมัคร มูลนิธิในพื้นที่</strong>
        <div class="pl-indent" style="line-height: 1.1;">
          <span class="doc-item" style="margin-right: 28px;">
            <span class="doc-checkbox"></span>
            <span>ส่วนราชการอื่น ${fill('', 240)}</span>
          </span>
          <span class="doc-item">
            <span class="doc-checkbox"></span>
            <span>ภาคเอกชน (ชื่อ) ${fill('', 240)}</span>
          </span>
        </div>
      </div>

      <!-- 9. ขอรับรองว่าพื้นที่ดังกล่าวเป็นพื้นที่ประสบภัยพิบัติฯ -->
      <div style="margin-bottom: 4px;">
        <strong style="font-weight: bold;">๙. ขอรับรองว่าพื้นที่ดังกล่าวเป็นพื้นที่ประสบภัยพิบัติ ซึ่งเกิดความเสียหายจริง โดยมีความประสงค์</strong>
        <div class="pl-indent" style="line-height: 1.1; margin-top: 2px;">
          <div style="display: table; width: 100%; margin-bottom: 2px;">
            <div style="display: table-cell; width: 22px; vertical-align: top; padding-top: 2px;">
              ${renderCheckbox(report.proposals?.includes('เพื่อโปรดทราบ'))}
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <span>รายงานข้อมูลเบื้องต้น เพื่อโปรดทราบ</span>
            </div>
          </div>

          <div style="display: table; width: 100%; margin-bottom: 2px;">
            <div style="display: table-cell; width: 22px; vertical-align: top; padding-top: 2px;">
              ${renderCheckbox(report.proposals?.includes('เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย'))}
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <span>รายงานเพื่อขอให้จังหวัดประกาศเป็นพื้นที่ประสบสาธารณภัย ตาม พ.ร.บ.ปภ. ๒๕๕๐</span>
            </div>
          </div>

          <div style="display: table; width: 100%; margin-bottom: 2px;">
            <div style="display: table-cell; width: 22px; vertical-align: top; padding-top: 2px;">
              ${renderCheckbox(report.proposals?.includes('เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน'))}
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <span>รายงานเพื่อขอให้จังหวัดประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน ตามระเบียบกระทรวงการคลัง ทั้งนี้ได้แนบรายละเอียดเอกสารแนบท้ายในการรายงานเหตุด่วนสาธารณภัย เพื่อประกาศภัยพิบัติจังหวัดระยองแล้ว</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Signatures Area -->
      <div style="display: flex; flex-direction: column; align-items: flex-end; padding-right: 48px; margin-top: 12px;">
        <div style="width: 320px; text-align: center; font-size: 13pt; line-height: 1.6;">
          <div style="position: relative; margin-bottom: 4px;">
            <span style="vertical-align: baseline;">(ลงชื่อ)</span>
            <span style="display: inline-block; width: 170px; border-bottom: 1px dotted #000; height: 0.85em; position: relative; margin: 0 4px; vertical-align: baseline;">
              ${report.signatureImage ? `<img src="${report.signatureImage}" alt="Signature" style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); max-height: 48px; min-width: 100px; object-fit: contain; mix-blend-mode: multiply;" />` : ''}
            </span>
            <span style="vertical-align: baseline;">ผู้รายงาน</span>
          </div>
          <div style="margin-bottom: 4px;">
            ( ${fill(report.reporterName, 180)} )
          </div>
          <div>
            ตำแหน่ง ${fill(report.reporterPosition, 180)}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Appendix Pages (Page 2+) -->
  ${appendixHtml}
</main>
<script>
window.onload = function() { window.print(); window.close(); }
</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close(); fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'PRINT_URGENT_INCIDENT', details: `พิมพ์แบบรายงานเหตุด่วนสาธารณภัย: ${report.location || 'ไม่ระบุสถานที่'}`, username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' }) }).catch(console.error);
  };


  if (viewMode === 'preview' && previewData) {
    const toThaiNum = (str: any) => {
      if (str === null || str === undefined) return '';
      const s = String(str);
      const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
      return s.replace(/[0-9]/g, match => thaiNumerals[parseInt(match)]);
    };

    const renderLine = (text: string | number | undefined | null, placeholder: string = '........................................................', defaultWidth?: number) => {
      const val = text !== undefined && text !== null ? String(text).trim() : '';
      if (!val) {
        const width = defaultWidth || Math.max(36, Math.min(550, placeholder.length * 6));
        return (
          <span 
            className="doc-empty-line" 
            style={{ 
              display: 'inline-block', 
              width: `${width}px`, 
              borderBottom: '1px dotted #000', 
              height: '0.85em', 
              verticalAlign: 'baseline', 
              margin: '0' 
            }} 
          />
        );
      }
      return (
        <span 
          className="doc-fill-line" 
          style={{ 
            display: 'inline', 
            borderBottom: '1px dotted #000', 
            padding: '0 1px', 
            verticalAlign: 'baseline', 
            color: '#000', 
            fontWeight: 'normal', 
            lineHeight: '1.15',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal'
          }}
        >
          {toThaiNum(val)}
        </span>
      );
    };

    const incidentTypeChoices = [
      'อุทกภัย', 'วาตภัย', 'ความแห้งแล้ง', 'อัคคีภัย', 'ไฟป่า', 'อากาศหนาว', 
      'แผ่นดินไหวและอาคารถล่ม', 'สารเคมีและวัตถุอันตราย', 'อุบัติภัย', 'ทุ่นระเบิด', 
      'การป้องกันและระงับภัยทางอากาศ', 'การก่อวินาศกรรม', 'การอพยพประชาชนและส่วนราชการ'
    ];

    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 -mx-4 sm:-mx-6 lg:-mx-8 p-4 sm:p-6 md:p-8 space-y-6">
        <div className="w-full max-w-5xl flex items-center justify-between mb-4">
          <button 
            onClick={() => setViewMode(previousMode)}
            title="ย้อนกลับ"
            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-400 dark:hover:border-gray-600 rounded-xl transition-all hover:shadow-md group flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>

        <A4PaperPreview
          title="แบบรายงานเหตุด่วนสาธารณภัย"
          subtitle={`เลขที่หนังสือ: ${previewData.docNumber || '-'} | ลงวันที่: ${previewData.docDate || '-'}`}
          exportFileName={`แบบรายงานเหตุด่วนสาธารณภัย_${previewData.docNumber?.replace(/\//g, '_') || 'ฉบับด่วน'}`}
          onPrint={() => printDocument(previewData)}
          paperClassName="p-0 bg-transparent shadow-none"
        >
          {/* Multi-Page Container */}
          <div className="flex flex-col items-center gap-8 select-none w-full" style={{ fontFamily: "'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif" }}>
            {/* Page 1 */}
            <div 
              className="a4-page-sheet bg-white text-black w-full min-h-[297mm] p-[6mm_12mm_0mm_15mm] relative box-border shadow-md" 
              style={{ fontSize: '13pt', lineHeight: '1.15', fontFamily: "'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif" }}
            >
              <div className="absolute top-2 right-4 text-xs text-neutral-400">หน้า ๑ (เอกสารแบบรายงาน)</div>
            
              {/* Header section */}
              <div className="grid grid-cols-3 items-end mb-1">
                <div className="text-left flex items-baseline">
                  <span className="font-normal text-[13pt] mr-1 text-black">ความเร่งด่วน</span>
                  <span className="text-red-600 font-bold text-[20pt] leading-none tracking-tight">ด่วนที่สุด</span>
                </div>
                <div className="text-center">
                  <h1 className="text-[16pt] font-bold text-black" style={{ fontFamily: "'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif" }}>แบบรายงานเหตุด่วนสาธารณภัย</h1>
                </div>
                <div className="text-right font-normal">
                  วันที่ {renderLine(previewData.docDate, '.....................................')}
                </div>
              </div>

              <div className="space-y-0.5 text-black font-normal">
                <div className="flex justify-between">
                  <div>ที่ {renderLine(previewData.docNumber?.replace(/^ที่\s*/, ''), '.....................................')}</div>
                </div>
                <div>จาก {renderLine(previewData.fromPerson, '.................................................................................................')}</div>
                <div className="pb-0">ถึง {renderLine(previewData.toPerson, '.................................................................................................')}</div>

                {/* 1. ชนิดของภัย */}
                <div>
                  <strong className="font-bold">๑. ชนิดของภัย</strong>
                  <div className="pl-[2.5em] pt-0.5 font-normal" style={{ lineHeight: '1.1' }}>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {[
                        'อุทกภัย', 'วาตภัย', 'ความแห้งแล้ง', 'อัคคีภัย', 'ไฟป่า', 'อากาศหนาว', 'แผ่นดินไหว'
                      ].map((t, idx) => {
                        const isChecked = previewData.incidentTypes.includes(t) || (t === 'แผ่นดินไหว' && (previewData.incidentTypes.includes('แผ่นดินไหวและอาคารถล่ม') || previewData.incidentTypes.includes('แผ่นดินไหว')));
                        return (
                          <span key={idx} className="doc-item" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', marginRight: '14px', marginBottom: '2px' }}>
                            <span 
                              className="doc-checkbox"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '12px', 
                                height: '12px', 
                                border: '1px solid #000', 
                                marginRight: '5px', 
                                position: 'relative',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}
                            >
                              {isChecked ? '✓' : ''}
                            </span>
                            <span>{t}</span>
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
                      <span style={{ marginRight: '14px' }}>และอาคารถล่ม</span>
                      {[
                        'สารเคมีและวัตถุอันตราย', 'อุบัติเหตุ', 'ทุ่นระเบิด', 'การป้องกันและระงับภัยทางอากาศ'
                      ].map((t, idx) => {
                        const isChecked = previewData.incidentTypes.includes(t) || (t === 'อุบัติเหตุ' && previewData.incidentTypes.includes('อุบัติภัย'));
                        return (
                          <span key={idx} className="doc-item" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', marginRight: '14px', marginBottom: '2px' }}>
                            <span 
                              className="doc-checkbox"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '12px', 
                                height: '12px', 
                                border: '1px solid #000', 
                                marginRight: '5px', 
                                position: 'relative',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}
                            >
                              {isChecked ? '✓' : ''}
                            </span>
                            <span>{t}</span>
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {[
                        'การก่อวินาศกรรม', 'การอพยพประชาชนและส่วนราชการ'
                      ].map((t, idx) => {
                        const isChecked = previewData.incidentTypes.includes(t);
                        return (
                          <span key={idx} className="doc-item" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', marginRight: '14px', marginBottom: '2px' }}>
                            <span 
                              className="doc-checkbox"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '12px', 
                                height: '12px', 
                                border: '1px solid #000', 
                                marginRight: '5px', 
                                position: 'relative',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}
                            >
                              {isChecked ? '✓' : ''}
                            </span>
                            <span>{t}</span>
                          </span>
                        );
                      })}
                      <span className="doc-item" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                        <span 
                          className="doc-checkbox"
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '12px', 
                            height: '12px', 
                            border: '1px solid #000', 
                            marginRight: '5px', 
                            position: 'relative',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}
                        >
                          {previewData.incidentTypes.includes('อื่นๆ') || previewData.incidentTypeOther ? '✓' : ''}
                        </span>
                        <span>อื่นๆ {renderLine(previewData.incidentTypeOther, '.............................................', 240)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pl-[2.5em] font-normal block" style={{ lineHeight: '1.6', wordBreak: 'break-word' }}>
                  <span className="font-normal" style={{ marginRight: '10px' }}>ความรุนแรงและลักษณะของภัย</span>
                  {['เล็กน้อย', 'ปานกลาง', 'รุนแรง'].map((sev, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', marginRight: '14px', verticalAlign: 'middle' }}>
                      <span 
                        className="doc-checkbox"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '12px', 
                          height: '12px', 
                          border: '1px solid #000', 
                          marginRight: '5px', 
                          position: 'relative',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}
                      >
                        {previewData.severity === sev ? '✓' : ''}
                      </span>
                      <span>{sev}</span>
                    </span>
                  ))}
                  <span className="font-normal" style={{ marginLeft: '10px', display: 'inline' }}>
                    ลักษณะของภัย {renderLine(previewData.incidentAppearance, '....................................', 220)}
                  </span>
                </div>

                {/* 2. วันเวลาที่เกิดภัย */}
                <div className="font-normal">
                  <strong className="font-bold">๒. ภัยเกิดเมื่อ</strong> - วันที่ {renderLine(previewData.startDate, '........................')} เวลา {renderLine(previewData.startTime, '................')} น. ภัยสิ้นสุด วันที่ {renderLine(previewData.endDate, '........................')} เวลา {renderLine(previewData.endTime, '................')} น.
                </div>

                {/* 3. สถานที่เกิดภัย */}
                <div className="font-normal">
                  <strong className="font-bold">๓. สถานที่เกิดภัย</strong> - {renderLine(previewData.location, '............................................................................................................................................................')}
                </div>

                {/* 4. ราษฎรที่ประสบภัย */}
                <div>
                  <strong className="font-bold">๔. ราษฎรที่ประสบภัย</strong>
                  <div className="pl-[2.5em] font-normal" style={{ lineHeight: '1.1' }}>
                    <div className="flex flex-wrap gap-x-2">
                      <span>๔.๑ ราษฎรได้รับความเดือดร้อน {renderLine(previewData.affectedPeople, '........')} คน</span>
                      <span>{renderLine(previewData.affectedHouseholds, '........')} ครัวเรือน</span>
                      <span>๔.๒ บาดเจ็บ (เล็กน้อย) {renderLine(previewData.injured, '........')} คน</span>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <span>๔.๓ เสียชีวิต {renderLine(previewData.dead, '........')} คน</span>
                      <span>๔.๔ สูญหาย {renderLine(previewData.missing, '........')} คน (ให้ระบุรายละเอียด)</span>
                      <span>๔.๕ อพยพไปที่ปลอดภัย {renderLine(previewData.evacuatedPeople, '........')} คน {renderLine(previewData.evacuatedHouseholds, '........')} ครัวเรือน</span>
                    </div>
                  </div>
                </div>

                {/* 5. พื้นที่ประสบภัยและความเสียหาย */}
                <div>
                  <strong className="font-bold">๕. พื้นที่ประสบภัยและความเสียหาย</strong>
                  <div className="pl-[2.5em] font-normal" style={{ lineHeight: '1.1' }}>
                    <div className="flex flex-wrap gap-x-2">
                      <span>๕.๑ อาคารก่อสร้าง - บ้านพักอาศัยเสียหายทั้งหลัง {renderLine('', '......')} หลัง</span>
                      <span>บ้านพักอาศัยเสียหายบางส่วน {renderLine(previewData.damageHouses, '......')} หลัง</span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 pl-[2.2em]">
                      <span>อาคารสูงตั้งแต่ ๒๓ เมตรขึ้นไป {renderLine(previewData.damageHighRises, '......')} อาคาร</span>
                      <span>โรงเรียน {renderLine('', '......')} แห่ง</span>
                      <span>วัด {renderLine(previewData.damageTemples, '......')} แห่ง</span>
                      <span>สถานที่ราชการ {renderLine(previewData.damageGovBuildings, '......')} แห่ง</span>
                      <span>อื่นๆ {renderLine(previewData.damageOtherBuildings, '................')}</span>
                    </div>
                    <div className="pl-[2.2em]">มูลค่าความเสียหายประมาณ {renderLine(previewData.damageBuildingCost, '................')} บาท</div>
                    
                    <div className="flex flex-wrap gap-x-2">
                      <span>๕.๒ พื้นที่และทรัพย์สินทางการเกษตร พืชไร่ {renderLine(previewData.damageAgricultureCrops, '......')} ไร่</span>
                      <span>นาข้าว {renderLine(previewData.damageAgricultureRice, '......')} ไร่</span>
                      <span>พืชสวน {renderLine(previewData.damageAgricultureOrchard, '......')} ไร่</span>
                      <span>บ่อปลา {renderLine(previewData.damageAgricultureFish, '......')} บ่อ</span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 pl-[2.2em]">
                      <span>บ่อกุ้ง {renderLine(previewData.damageAgricultureShrimp, '......')} บ่อ</span>
                      <span>สัตว์เลี้ยง (โค/กระบือ {renderLine(previewData.damageLivestockCow, '......')} ตัว</span>
                      <span>สุกร {renderLine(previewData.damageLivestockPig, '......')} ตัว</span>
                      <span>เป็ด/ไก่ {renderLine(previewData.damageLivestockPoultry, '......')} ตัว)</span>
                      <span>อื่นๆ {renderLine(previewData.damageLivestockOther, '................')}</span>
                    </div>
                    <div className="pl-[2.2em]">มูลค่าความเสียหายประมาณ {renderLine(previewData.damageAgricultureCost, '................')} บาท</div>

                    <div>
                      ๕.๓ สิ่งสาธารณประโยชน์ ถนน {renderLine(previewData.damagePublicRoads, '........')} สาย
                      สะพาน {renderLine(previewData.damagePublicBridges, '........')} แห่ง
                      คอสะพาน {renderLine(previewData.damagePublicBridgeApproaches, '........')} แห่ง
                      ฝาย {renderLine(previewData.damagePublicWeirs, '........')} แห่ง
                      อื่นๆ {renderLine(previewData.damagePublicOther, '........................')}
                    </div>
                    <div className="pl-[2.2em]">มูลค่าความเสียหายประมาณ {renderLine(previewData.damagePublicCost, '................')} บาท</div>
                    <div>๕.๔ รวมมูลค่าความเสียหายเบื้องต้นประมาณ {renderLine(previewData.totalDamageCost, '........................')} บาท</div>
                  </div>
                </div>

                {/* 6. การบรรเทาภัย */}
                <div className="font-normal">
                  <strong className="font-bold">๖. การบรรเทาภัย</strong> - {renderLine(previewData.mitigation, '......................................................................................................................................')}
                </div>

                {/* 7. เครื่องมือ/อุปกรณ์ที่ใช้ */}
                <div>
                  <strong className="font-bold">๗. เครื่องมือ/อุปกรณ์ที่ใช้</strong>
                  <div className="pl-[2.5em] flex flex-wrap gap-x-3 gap-y-0.5 font-normal" style={{ lineHeight: '1.1' }}>
                    <span>- รถปฏิบัติการกู้ชีพ {renderLine('', '......')} คัน</span>
                    <span>รถดับเพลิง จำนวน {renderLine(previewData.toolsFireTrucks, '......')} คัน</span>
                    <span>รถยนต์บรรทุกน้ำ {renderLine(previewData.toolsWaterTrucks, '......')} คัน</span>
                    <span>รถกู้ภัย {renderLine(previewData.toolsRescueTrucks, '......')} คัน</span>
                    <span>เรือ {renderLine(previewData.toolsFireBoats, '......')} ลำ</span>
                    <span>เครื่องสูบน้ำ {renderLine(previewData.toolsWaterPumps, '......')} เครื่อง</span>
                    <span>(อื่นๆ) {renderLine(previewData.toolsOther, '........................')}</span>
                  </div>
                  <div className="pl-[2.5em] flex font-normal" style={{ lineHeight: '1.1' }}>
                    <span>ส่วนราชการ {renderLine(previewData.opsGovAgencies, '.....................................................................................................................................................')}</span>
                  </div>
                </div>

                {/* 8. ดำเนินงาน */}
                <div>
                  <strong className="font-bold">๘. การดำเนินงานของส่วนราชการ หน่วยอาสาสมัคร มูลนิธิในพื้นที่</strong>
                  <div className="pl-[2.5em] font-normal" style={{ lineHeight: '1.1' }}>
                    <span className="doc-item" style={{ display: 'inline-block', marginRight: '28px', verticalAlign: 'middle' }}>
                      <span 
                        className="doc-checkbox"
                        style={{ 
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          border: '1px solid #000', 
                          marginRight: '6px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                      <span style={{ verticalAlign: 'middle' }}>ส่วนราชการอื่น {renderLine('', '........................................', 240)}</span>
                    </span>
                    <span className="doc-item" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      <span 
                        className="doc-checkbox"
                        style={{ 
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          border: '1px solid #000', 
                          marginRight: '6px', 
                          verticalAlign: 'middle' 
                        }} 
                      />
                      <span style={{ verticalAlign: 'middle' }}>ภาคเอกชน (ชื่อ) {renderLine('', '........................................', 240)}</span>
                    </span>
                  </div>
                </div>

                {/* 9. ข้อเสนอ / คำลงท้ายรับรอง */}
                <div>
                  <strong className="font-bold">๙. ขอรับรองว่าพื้นที่ดังกล่าวเป็นพื้นที่ประสบภัยพิบัติ ซึ่งเกิดความเสียหายจริง โดยมีความประสงค์</strong>
                  <div className="pl-[2.5em] mt-1 font-normal" style={{ lineHeight: '1.1' }}>
                    <div style={{ display: 'table', width: '100%', marginBottom: '2px', lineHeight: '1.1' }}>
                      <div style={{ display: 'table-cell', width: '22px', verticalAlign: 'top', paddingTop: '2px' }}>
                        <span 
                          className="doc-checkbox"
                          style={{ 
                            display: 'inline-block', 
                            width: '12px', 
                            height: '12px', 
                            border: '1px solid #000', 
                            position: 'relative', 
                            textAlign: 'center', 
                            lineHeight: '10px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}
                        >
                          {previewData.proposals.includes('เพื่อโปรดทราบ') ? '✓' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'table-cell', verticalAlign: 'top' }}>
                        <span>รายงานข้อมูลเบื้องต้น เพื่อโปรดทราบ</span>
                      </div>
                    </div>

                    <div style={{ display: 'table', width: '100%', marginBottom: '2px', lineHeight: '1.1' }}>
                      <div style={{ display: 'table-cell', width: '22px', verticalAlign: 'top', paddingTop: '2px' }}>
                        <span 
                          className="doc-checkbox"
                          style={{ 
                            display: 'inline-block', 
                            width: '12px', 
                            height: '12px', 
                            border: '1px solid #000', 
                            position: 'relative', 
                            textAlign: 'center', 
                            lineHeight: '10px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}
                        >
                          {previewData.proposals.includes('เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย') ? '✓' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'table-cell', verticalAlign: 'top' }}>
                        <span>รายงานเพื่อขอให้จังหวัดประกาศเป็นพื้นที่ประสบสาธารณภัย ตาม พ.ร.บ.ปภ. ๒๕๕๐</span>
                      </div>
                    </div>

                    <div style={{ display: 'table', width: '100%', marginBottom: '2px', lineHeight: '1.1' }}>
                      <div style={{ display: 'table-cell', width: '22px', verticalAlign: 'top', paddingTop: '2px' }}>
                        <span 
                          className="doc-checkbox"
                          style={{ 
                            display: 'inline-block', 
                            width: '12px', 
                            height: '12px', 
                            border: '1px solid #000', 
                            position: 'relative', 
                            textAlign: 'center', 
                            lineHeight: '10px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}
                        >
                          {previewData.proposals.includes('เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน') ? '✓' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'table-cell', verticalAlign: 'top' }}>
                        <span>รายงานเพื่อขอให้จังหวัดประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน ตามระเบียบกระทรวงการคลัง ทั้งนี้ได้แนบรายละเอียดเอกสารแนบท้ายในการรายงานเหตุด่วนสาธารณภัย เพื่อประกาศภัยพิบัติจังหวัดระยองแล้ว</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures Area */}
                <div className="flex flex-col items-end pr-12 pt-2 font-normal">
                  <div className="w-[320px] text-center font-normal space-y-1" style={{ fontSize: '13pt', lineHeight: '1.6' }}>
                    <div className="relative mb-1">
                      <span style={{ verticalAlign: 'baseline' }}>(ลงชื่อ)</span>
                      <span 
                        style={{ 
                          display: 'inline-block', 
                          width: '170px', 
                          borderBottom: '1px dotted #000', 
                          height: '0.85em', 
                          position: 'relative', 
                          margin: '0 4px', 
                          verticalAlign: 'baseline' 
                        }}
                      >
                        {previewData.signatureImage && (
                          <img 
                            src={previewData.signatureImage} 
                            alt="Signature Preview" 
                            className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 max-h-[48px] object-contain mix-blend-multiply z-10 select-none pointer-events-none" 
                            style={{ minWidth: '100px' }} 
                          />
                        )}
                      </span>
                      <span style={{ verticalAlign: 'baseline' }}>ผู้รายงาน</span>
                    </div>
                    <div className="font-normal" style={{ marginBottom: '4px' }}>
                      ( {renderLine(previewData.reporterName, '........................', 180)} )
                    </div>
                    <div className="font-normal">
                      ตำแหน่ง {renderLine(previewData.reporterPosition, '................................', 180)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2 onwards: Appendix Images (2 images per page) */}
            {previewData.damageImages && previewData.damageImages.length > 0 && (() => {
              const pages: string[][] = [];
              for (let i = 0; i < previewData.damageImages.length; i += 2) {
                pages.push(previewData.damageImages.slice(i, i + 2));
              }
              return pages.map((pair, pageIdx) => (
                <div 
                  key={pageIdx}
                  className="a4-page-sheet bg-white text-black shadow-md mx-auto p-[15mm] w-full min-h-[297mm] relative box-border flex flex-col items-center" 
                  style={{ fontSize: '15pt', lineHeight: '1.4', fontFamily: "'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif" }}
                >
                  <div className="absolute top-4 right-4 text-xs text-neutral-400">
                    หน้า {toThaiNum(pageIdx + 2)} (ภาคผนวกภาพถ่ายแนบ)
                  </div>
                  
                  <div className="text-center font-bold text-[16pt] mb-6 pt-2 leading-snug">
                    <div>ภาพถ่ายความเสียหายในพื้นที่</div>
                    <div className="text-[15pt] mt-0.5 font-bold">บ้าน{previewData.reporterName || 'ผู้รายงาน / ผู้ประสบภัย'}</div>
                    <div className="text-[15pt] font-bold">บ้านเลขที่ {toThaiNum(previewData.location || '')}</div>
                  </div>

                  {/* 2 Photos per page */}
                  <div className="flex flex-col items-center gap-6 w-full max-w-[580px]">
                    {pair.map((imgUrl, imgIdx) => {
                      const globalIdx = pageIdx * 2 + imgIdx + 1;
                      return (
                        <div key={imgIdx} className="text-center w-full">
                          <img 
                            src={imgUrl} 
                            alt={`Damage ${globalIdx}`} 
                            className="w-full h-[310px] object-cover mx-auto rounded border border-neutral-300 shadow-sm bg-neutral-100" 
                          />
                          <div className="text-[14pt] font-bold text-neutral-800 mt-2">
                            ภาพถ่ายความเสียหาย ที่ {toThaiNum(globalIdx)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </A4PaperPreview>
      </div>
    );
  }

  if (viewMode === 'dashboard') {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode('list')}
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                แดชบอร์ดสรุปรายงานเหตุด่วนสาธารณภัย
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">ปีปัจจุบัน: พ.ศ. {currentYear}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">ปี:</span>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all cursor-pointer shadow-sm"
            >
              <option value="all">แสดงทั้งหมด (ทุกปี)</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>พ.ศ. {year}</option>
              ))}
            </select>
          </div>
        </div>
        <UrgentIncidentDashboard reports={filteredReports} user={user} />
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              รายงานเหตุด่วนสาธารณภัย
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">ระบบจัดการแบบรายงานเหตุด่วนสาธารณภัย</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto">
            <button 
              type="button"
              onClick={handleViewDashboard}
              title="แดชบอร์ดสรุปผลเหตุด่วน"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] hover:text-indigo-600 hover:border-indigo-500/40 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer text-xs font-bold group"
            >
              <BarChart2 className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>แดชบอร์ดสรุปผล</span>
            </button>
            {canEdit && (
              <button 
                type="button"
                onClick={handleAddNew}
                title="สร้างแบบรายงานเหตุด่วนสาธารณภัย / รายงานใหม่"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md shadow-red-600/20 hover:shadow-lg active:scale-[0.98] cursor-pointer text-xs font-bold group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>สร้างแบบรายงานเหตุด่วนสาธารณภัย</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--border-light)] flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาสถานที่เกิดภัย, เลขที่เอกสาร, ผู้รายงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[var(--primary-color)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">ปี:</span>
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--primary-color)] transition-colors cursor-pointer w-full"
              >
                <option value="all">แสดงทั้งหมด (ทุกปี)</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>พ.ศ. {year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                  <tr>
                    <th className="px-4 py-3 border-b border-[var(--border-light)]">เลขที่/วันที่</th>
                    <th className="px-4 py-3 border-b border-[var(--border-light)]">สถานที่เกิดภัย</th>
                    <th className="px-4 py-3 border-b border-[var(--border-light)]">ประเภทภัย</th>
                    <th className="px-4 py-3 border-b border-[var(--border-light)]">ระดับความรุนแรง</th>
                    <th className="px-4 py-3 border-b border-[var(--border-light)]">ผู้รายงาน</th>
                    <th className="px-4 py-3 border-b border-[var(--border-light)] text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />กำลังโหลดข้อมูล...</td></tr>
                  ) : filteredReports.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">ไม่พบข้อมูลรายงานเหตุด่วน</td></tr>
                  ) : (
                    paginatedReports.map(report => (
                      <tr key={report.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors group">
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-[var(--text-primary)] mb-0.5">{report.docNumber || '-'}</div>
                          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                            <FileText className="w-3 h-3" />
                            {report.docDate || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="text-[var(--text-primary)] font-medium max-w-[220px] truncate leading-snug" title={report.location}>{report.location}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                             {report.amphoe && report.amphoe !== 'ไม่ระบุอำเภอ' ? report.amphoe : 'ไม่ระบุพื้นที่'}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-1">
                            {report.incidentTypes.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/30">{t}</span>
                            ))}
                            {report.incidentTypes.length > 2 && (
                              <span className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">+{report.incidentTypes.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {report.severity === 'รุนแรง' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/30">รุนแรง</span>
                          ) : report.severity === 'ปานกลาง' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30">ปานกลาง</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">เล็กน้อย</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{report.reporterName || '-'}</div>
                          <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[150px] italic">{report.reporterPosition || '-'}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { handleViewPreview(report, 'list'); }} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-all" title="ดูตัวอย่างก่อนพิมพ์">
                              <FileText className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <>
                                <button onClick={() => handleEdit(report)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-all" title="แก้ไข">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(report.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-all" title="ลบ">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[var(--border-light)]">
               {loading ? (
                  <div className="text-center py-10 text-[var(--text-muted)]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />กำลังโหลดข้อมูล...</div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-10 text-[var(--text-muted)]">ไม่พบข้อมูลรายงานเหตุด่วน</div>
                ) : (
                  paginatedReports.map(report => (
                    <div key={report.id} className="p-4 hover:bg-[var(--bg-elevated)]/50 transition-colors group">
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="flex-1">
                           <div className="font-bold text-[var(--text-primary)] text-sm line-clamp-2 leading-relaxed">
                             {report.location}
                           </div>
                           <div className="text-[10px] text-[var(--text-secondary)] mt-2 flex flex-wrap gap-2 items-center">
                             <span className="font-bold text-[var(--primary-color)] bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/30">{report.docNumber || '-'}</span>
                             <span className="flex items-center gap-1">
                               <FileText className="w-3 h-3 text-[var(--text-muted)]" />
                               {report.docDate || '-'}
                             </span>
                           </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                           {report.severity === 'รุนแรง' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50">รุนแรง</span>
                          ) : report.severity === 'ปานกลาง' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50">ปานกลาง</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/50">เล็กน้อย</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                         {report.incidentTypes.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded-md font-medium">{t}</span>
                         ))}
                         {report.incidentTypes.length > 3 && (
                            <span className="bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded-md font-medium">+{report.incidentTypes.length - 3}</span>
                         )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-lighter)]">
                        <div className="flex items-center gap-2 max-w-[65%]">
                           <div className="w-7 h-7 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-light)] flex-shrink-0">
                              <span className="text-[10px] font-bold">{report.reporterName ? report.reporterName.charAt(0) : '?'}</span>
                           </div>
                           <div className="truncate">
                             <div className="text-[11px] font-bold text-[var(--text-primary)] truncate">{report.reporterName || '-'}</div>
                             <div className="text-[9px] text-[var(--text-muted)] truncate italic">{report.reporterPosition || '-'}</div>
                           </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { handleViewPreview(report, 'list'); }} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-all" title="ดูตัวอย่างก่อนพิมพ์">
                            <FileText className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => handleEdit(report)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-all" title="แก้ไข">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(report.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-all" title="ลบ">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-elevated)]/30">
                <div className="text-xs text-[var(--text-secondary)] font-medium order-2 sm:order-1">
                  แสดงรายการที่ <span className="text-[var(--text-primary)] font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="text-[var(--text-primary)] font-bold">{Math.min(currentPage * itemsPerPage, filteredReports.length)}</span> จากทั้งหมด <span className="text-[var(--text-primary)] font-bold">{filteredReports.length}</span> รายการ
                </div>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-[var(--text-muted)] px-1">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              currentPage === p
                                ? 'bg-[var(--primary-color)] text-white shadow-md shadow-[var(--primary-color)]/20'
                                : 'border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('list')}
            title="ย้อนกลับ"
            className="p-3 hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-light)] rounded-xl text-[var(--text-secondary)] transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {editingId ? 'แก้ไขแบบรายงานเหตุด่วนสาธารณภัย' : 'สร้างแบบรายงานเหตุด่วนสาธารณภัย'}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">กรอกข้อมูลรายละเอียดเหตุการณ์สาธารณภัย</p>
          </div>
        </div>

        <div className="grid grid-flow-col gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleScanFile}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            title="สแกนเอกสารด้วย AI"
            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-purple-600 hover:border-purple-400 dark:hover:border-purple-600 dark:hover:bg-purple-900/20 rounded-xl transition-all hover:shadow-md group flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Scan className="w-6 h-6 group-hover:scale-110 transition-transform" />}
          </button>
          
          <button 
            onClick={() => {
              const toThai = (str: string) => {
                if (!str) return str;
                const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
                return str.replace(/[0-9]/g, match => thaiNumerals[parseInt(match)]);
              };
              
              const convertedData = { ...formData };
              Object.keys(convertedData).forEach(key => {
                if (typeof convertedData[key as keyof UrgentIncident] === 'string') {
                  (convertedData as any)[key] = toThai(convertedData[key as keyof UrgentIncident] as string);
                }
              });
              setFormData(convertedData);
            }}
            title="แปลงเลขอารบิกในฟอร์มเป็นเลขไทยทั้งหมด"
            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 rounded-xl transition-all hover:shadow-md group flex items-center justify-center"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="m3 15 2 2 4-4"/>
            </svg>
          </button>

          <button 
            onClick={() => { handleViewPreview(formData as UrgentIncident, 'form'); }}
            title="ดูตัวอย่างก่อนพิมพ์"
            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20 rounded-xl transition-all hover:shadow-md group flex items-center justify-center"
          >
            <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            title="บันทึกข้อมูล"
            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 rounded-xl transition-all hover:shadow-md group flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Banner แจ้งเตือน validationError */}
        {validationError && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">
              <p className="font-bold text-amber-950 dark:text-amber-100">ข้อมูลยังไม่สมบูรณ์</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">{validationError}</p>
            </div>
            <button 
              onClick={() => setValidationError(null)} 
              className="text-amber-600 hover:text-amber-800 p-1 rounded-lg"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Status Notification Box หลังจากกดบันทึกข้อมูล */}
        {saveFeedback && saveFeedback.show && (
          <div className={`rounded-2xl border p-5 sm:p-6 shadow-md transition-all ${
            saveFeedback.status === 'success' 
              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100' 
              : 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 text-red-950 dark:text-red-100'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                saveFeedback.status === 'success' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-red-600 text-white shadow-sm'
              }`}>
                {saveFeedback.status === 'success' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                      saveFeedback.status === 'success' 
                        ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100' 
                        : 'bg-red-200/80 text-red-900 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {saveFeedback.status === 'success' ? 'บันทึกสำเร็จ (SUCCESS)' : 'บันทึกไม่สำเร็จ (FAILED)'}
                    </span>
                    {saveFeedback.timestamp && (
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        เวลา {saveFeedback.timestamp} น.
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setSaveFeedback(null)} 
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    {saveFeedback.message}
                  </h3>
                  {saveFeedback.status === 'success' && saveFeedback.report && (
                    <p className="text-sm opacity-90 mt-1">
                      ระบบได้ทำการจัดเก็บและบันทึกข้อมูลแบบรายงานเหตุด่วนสาธารณภัยเข้าสู่ระบบเรียบร้อยแล้ว
                    </p>
                  )}
                </div>

                {saveFeedback.status === 'success' && saveFeedback.report && (
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/60 dark:border-emerald-800/50 text-xs sm:text-sm space-y-2 text-slate-800 dark:text-slate-200 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">เลขที่หนังสือ:</span>{' '}
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{saveFeedback.report.docNumber || 'ไม่ระบุ'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">วันที่รายงาน:</span>{' '}
                        <span>{saveFeedback.report.docDate || 'ไม่ระบุ'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">ชนิดของภัย:</span>{' '}
                        <span className="font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {saveFeedback.report.incidentTypes?.join(', ') || 'ไม่ระบุ'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">สถานที่เกิดภัย:</span>{' '}
                        <span>{saveFeedback.report.location || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {saveFeedback.status === 'success' && saveFeedback.report ? (
                    <>
                      <button
                        onClick={() => { handleViewPreview(saveFeedback.report!, 'form'); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <Printer className="w-4 h-4" /> ดูตัวอย่าง/พิมพ์เอกสาร (A4)
                      </button>
                      <button
                        onClick={() => {
                          setSaveFeedback(null);
                          setViewMode('list');
                        }}
                        className="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <ArrowRight className="w-4 h-4" /> ดูรายการรายงานทั้งหมด
                      </button>
                      <button
                        onClick={() => {
                          setSaveFeedback(null);
                          setEditingId(null);
                          setFormData(initialFormState);
                        }}
                        className="bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4" /> กรอกรายงานฉบับใหม่
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> ลองบันทึกใหม่อีกครั้ง
                      </button>
                      <button
                        onClick={() => setSaveFeedback(null)}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all"
                      >
                        กลับไปแก้ไขแบบฟอร์ม
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {scanErrorMsg && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">ข้อความจากระบบ AI</p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">{scanErrorMsg}</p>
                {scanErrorMsg && (scanErrorMsg.includes('API Key') || scanErrorMsg.includes('คีย์')) && (
                  <button 
                    onClick={() => {
                      const settingsTab = document.querySelector('[data-tab="settings"]') as HTMLElement;
                      if (settingsTab) settingsTab.click();
                      // Or just inform the user
                      window.alert('กรุณาไปที่เมนู "ตั้งค่าระบบ" เพื่อกำหนด "องค์กร Google Gemini API Key"');
                    }}
                    className="text-amber-700 dark:text-amber-400 underline font-semibold mt-2 block"
                  >
                    ไปที่เมนูตั้งค่าระบบ
                  </button>
                )}
              </div>
            </div>
            {lastScanDataRef.current && (
              <button
                type="button"
                onClick={() => executeScan(lastScanDataRef.current!.fileBase64, lastScanDataRef.current!.mimeType)}
                disabled={isScanning}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm self-end sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                ลองสแกนใหม่อีกครั้ง
              </button>
            )}
          </div>
        )}
        
        {/* ส่วนหัวกระดาษ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 flex justify-between">
            <span>ด่วนที่ (กรณี อำเภอ)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ที่ สส</label>
              <input type="text" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="เช่น ๐๐๒๑/๑๒๓" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">วันที่</label>
              <input type="text" value={formData.docDate} onChange={e => setFormData({...formData, docDate: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="เช่น ๑ ตุลาคม ๒๕๖๖" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">จาก</label>
              <input type="text" value={formData.fromPerson} onChange={e => setFormData({...formData, fromPerson: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="เช่น นายอำเภอเมือง" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ถึง</label>
              <input type="text" value={formData.toPerson} onChange={e => setFormData({...formData, toPerson: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="เช่น ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด" />
            </div>
          </div>
        </section>

        {/* 1. ชนิดของภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๑. ชนิดของภัย</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {INCIDENT_TYPES.map(type => (
              <label key={type} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input type="checkbox" checked={formData.incidentTypes.includes(type)} onChange={() => handleCheckboxChange('incidentTypes', type)} className="w-4 h-4 rounded border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]" />
                {type}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" checked={formData.incidentTypes.includes('อื่นๆ')} onChange={() => handleCheckboxChange('incidentTypes', 'อื่นๆ')} className="w-4 h-4 rounded border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]" />
              อื่นๆ
            </label>
          </div>
          {formData.incidentTypes.includes('อื่นๆ') && (
            <input type="text" value={formData.incidentTypeOther} onChange={e => setFormData({...formData, incidentTypeOther: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded px-3 py-2 text-sm focus:border-[var(--primary-color)] outline-none mt-2" placeholder="ระบุชนิดภัยอื่นๆ..." />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2">ความรุนแรงของภัย</label>
              <div className="flex flex-row gap-3 sm:gap-6 py-2">
                {['เล็กน้อย', 'ปานกลาง', 'รุนแรง'].map(level => (
                  <label key={level} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <input type="radio" name="severity" checked={formData.severity === level} onChange={() => setFormData({...formData, severity: level})} className="w-4 h-4 border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]" />
                    {level}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2">ลักษณะของภัย (เช่น น้ำล้นตลิ่ง, ฝนแล้งทิ้งช่วง)</label>
              <input 
                type="text" 
                value={formData.incidentAppearance} 
                onChange={e => setFormData({...formData, incidentAppearance: e.target.value})} 
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" 
                placeholder="ระบุลักษณะของภัย เช่น ฝนทิ้งช่วง ขาดแคลนน้ำอุปโภคบริโภค..." 
              />
            </div>
          </div>
        </section>

        {/* 2. วันเวลาที่เกิดภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๒. วันเวลาที่เกิดภัย</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ภัยเกิดวันที่</label>
              <input type="text" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">เวลา (น.)</label>
              <input type="text" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ภัยสิ้นสุดวันที่</label>
              <input type="text" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">เวลา (น.)</label>
              <input type="text" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
          </div>
        </section>

        {/* 3. สถานที่เกิดภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๓. สถานที่เกิดภัย <span className="text-red-500">*</span></h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">อำเภอ <span className="text-red-500">*</span></label>
              <select
                value={formData.amphoe || ''}
                onChange={e => {
                  const amp = e.target.value;
                  setFormData(prev => {
                    const updated = { ...prev, amphoe: amp, tambon: '' };
                    const mubanStr = updated.muban ? `${updated.muban} ` : '';
                    const tambonStr = updated.tambon ? `${updated.tambon} ` : '';
                    const amphoeStr = updated.amphoe ? `${updated.amphoe} ` : '';
                    updated.location = `${mubanStr}${tambonStr}${amphoeStr}จังหวัดระยอง`.trim();
                    return updated;
                  });
                }}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"
              >
                <option value="">-- เลือกอำเภอ --</option>
                {EEC_PROVINCES.find(p => p.id === 'rayong')?.districts.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ตำบล <span className="text-red-500">*</span></label>
              <select
                value={formData.tambon || ''}
                disabled={!formData.amphoe}
                onChange={e => {
                  const tam = e.target.value;
                  setFormData(prev => {
                    const updated = { ...prev, tambon: tam };
                    const mubanStr = updated.muban ? `${updated.muban} ` : '';
                    const tambonStr = updated.tambon ? `${updated.tambon} ` : '';
                    const amphoeStr = updated.amphoe ? `${updated.amphoe} ` : '';
                    updated.location = `${mubanStr}${tambonStr}${amphoeStr}จังหวัดระยอง`.trim();
                    return updated;
                  });
                }}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all disabled:opacity-50"
              >
                <option value="">-- เลือกตำบล --</option>
                {EEC_PROVINCES.find(p => p.id === 'rayong')?.districts
                  .find(d => d.name === formData.amphoe)?.subdistricts.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">หมู่บ้าน / หมู่ที่</label>
              <input
                type="text"
                placeholder="เช่น หมู่ที่ 3 บ้านเนินพระ"
                value={formData.muban || ''}
                onChange={e => {
                  const mub = e.target.value;
                  setFormData(prev => {
                    const updated = { ...prev, muban: mub };
                    const mubanStr = updated.muban ? `${updated.muban} ` : '';
                    const tambonStr = updated.tambon ? `${updated.tambon} ` : '';
                    const amphoeStr = updated.amphoe ? `${updated.amphoe} ` : '';
                    updated.location = `${mubanStr}${tambonStr}${amphoeStr}จังหวัดระยอง`.trim();
                    return updated;
                  });
                }}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">รายละเอียดสถานที่เพิ่มเติม / ที่อยู่ที่ประกอบขึ้นอัตโนมัติ</label>
            <textarea
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              rows={2}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none resize-none transition-all"
              placeholder="หมู่ที่ ตำบล อำเภอ จังหวัด..."
            />
          </div>
        </section>

        {/* 4. ราษฎรที่ประสบภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๔. ราษฎรที่ประสบภัย</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ได้รับความเดือดร้อน (คน)</label>
              <input type="text" value={formData.affectedPeople} onChange={e => setFormData({...formData, affectedPeople: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ได้รับความเดือดร้อน (ครัวเรือน)</label>
              <input type="text" value={formData.affectedHouseholds} onChange={e => setFormData({...formData, affectedHouseholds: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">บาดเจ็บ (คน)</label>
              <input type="text" value={formData.injured} onChange={e => setFormData({...formData, injured: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">เสียชีวิต (คน)</label>
              <input type="text" value={formData.dead} onChange={e => setFormData({...formData, dead: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">สูญหาย (คน)</label>
              <input type="text" value={formData.missing} onChange={e => setFormData({...formData, missing: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">อพยพที่ปลอดภัย (คน)</label>
              <input type="text" value={formData.evacuatedPeople} onChange={e => setFormData({...formData, evacuatedPeople: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">อพยพที่ปลอดภัย (ครัวเรือน)</label>
              <input type="text" value={formData.evacuatedHouseholds} onChange={e => setFormData({...formData, evacuatedHouseholds: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" />
            </div>
          </div>
        </section>

        {/* 5. พื้นที่ประสบภัยและความเสียหาย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๕. พื้นที่ประสบภัยและความเสียหาย</h2>
          
          <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-light)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)]">๕.๑ อาคารสิ่งก่อสร้าง</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div><label className="text-xs mb-1 block">บ้านพักอาศัย (หลัง)</label><input type="text" value={formData.damageHouses} onChange={e => setFormData({...formData, damageHouses: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">อาคารโรงงาน (แห่ง)</label><input type="text" value={formData.damageFactories} onChange={e => setFormData({...formData, damageFactories: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">วัด (แห่ง)</label><input type="text" value={formData.damageTemples} onChange={e => setFormData({...formData, damageTemples: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">สถานที่ราชการ (แห่ง)</label><input type="text" value={formData.damageGovBuildings} onChange={e => setFormData({...formData, damageGovBuildings: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">อื่นๆ</label><input type="text" value={formData.damageOtherBuildings} onChange={e => setFormData({...formData, damageOtherBuildings: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block font-bold text-red-600">ความเสียหายประมาณ (บาท)</label><input type="text" value={formData.damageBuildingCost} onChange={e => setFormData({...formData, damageBuildingCost: e.target.value})} className="w-full rounded px-2 py-1 text-sm border border-[var(--border-light)] outline-none bg-red-50 dark:bg-red-900/10" /></div>
            </div>
          </div>

          <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-light)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)]">๕.๒ พื้นที่และทรัพย์สินทางการเกษตร</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div><label className="text-xs mb-1 block">พืชไร่ (ไร่)</label><input type="text" value={formData.damageAgricultureCrops} onChange={e => setFormData({...formData, damageAgricultureCrops: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">นา (ไร่)</label><input type="text" value={formData.damageAgricultureRice} onChange={e => setFormData({...formData, damageAgricultureRice: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">สวน (ไร่)</label><input type="text" value={formData.damageAgricultureOrchard} onChange={e => setFormData({...formData, damageAgricultureOrchard: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">บ่อปลา (ไร่)</label><input type="text" value={formData.damageAgricultureFish} onChange={e => setFormData({...formData, damageAgricultureFish: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">บ่อกุ้ง (ไร่)</label><input type="text" value={formData.damageAgricultureShrimp} onChange={e => setFormData({...formData, damageAgricultureShrimp: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">โค/กระบือ (ตัว)</label><input type="text" value={formData.damageLivestockCow} onChange={e => setFormData({...formData, damageLivestockCow: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">สุกร (ตัว)</label><input type="text" value={formData.damageLivestockPig} onChange={e => setFormData({...formData, damageLivestockPig: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">เป็ด/ไก่ (ตัว)</label><input type="text" value={formData.damageLivestockPoultry} onChange={e => setFormData({...formData, damageLivestockPoultry: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">อื่นๆ (ปศุสัตว์)</label><input type="text" value={formData.damageLivestockOther} onChange={e => setFormData({...formData, damageLivestockOther: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block font-bold text-red-600">ความเสียหายประมาณ (บาท)</label><input type="text" value={formData.damageAgricultureCost} onChange={e => setFormData({...formData, damageAgricultureCost: e.target.value})} className="w-full rounded px-2 py-1 text-sm border border-[var(--border-light)] outline-none bg-red-50 dark:bg-red-900/10" /></div>
            </div>
          </div>

          <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-light)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)]">๕.๓ สิ่งสาธารณประโยชน์</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div><label className="text-xs mb-1 block">ถนน (สาย)</label><input type="text" value={formData.damagePublicRoads} onChange={e => setFormData({...formData, damagePublicRoads: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">สะพาน (แห่ง)</label><input type="text" value={formData.damagePublicBridges} onChange={e => setFormData({...formData, damagePublicBridges: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">คอสะพาน (แห่ง)</label><input type="text" value={formData.damagePublicBridgeApproaches} onChange={e => setFormData({...formData, damagePublicBridgeApproaches: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">ฝาย (แห่ง)</label><input type="text" value={formData.damagePublicWeirs} onChange={e => setFormData({...formData, damagePublicWeirs: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block">อื่นๆ</label><input type="text" value={formData.damagePublicOther} onChange={e => setFormData({...formData, damagePublicOther: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
              <div><label className="text-xs mb-1 block font-bold text-red-600">ความเสียหายประมาณ (บาท)</label><input type="text" value={formData.damagePublicCost} onChange={e => setFormData({...formData, damagePublicCost: e.target.value})} className="w-full rounded px-2 py-1 text-sm border border-[var(--border-light)] outline-none bg-red-50 dark:bg-red-900/10" /></div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 whitespace-nowrap">รวมความเสียหายเบื้องต้น</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const toNum = (str: string) => {
                      if (!str) return 0;
                      // Convert Thai numerals back to Arabic to calculate
                      const arabicStr = str.replace(/[๐-๙]/g, match => '๐๑๒๓๔๕๖๗๘๙'.indexOf(match).toString());
                      const num = parseFloat(arabicStr.replace(/,/g, ''));
                      return isNaN(num) ? 0 : num;
                    };
                    const buildingCost = toNum(formData.damageBuildingCost);
                    const agricultureCost = toNum(formData.damageAgricultureCost);
                    const publicCost = toNum(formData.damagePublicCost);
                    const total = buildingCost + agricultureCost + publicCost;
                    
                    // Convert the total back to thai or arabic depending on current format of inputs
                    // Simply converting to string for now, user can click Thai conversion later if needed
                    setFormData({...formData, totalDamageCost: total.toLocaleString()});
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  คำนวณยอดรวม
                </button>
                <div className="flex items-center gap-2 max-w-sm">
                  <input type="text" value={formData.totalDamageCost} onChange={e => setFormData({...formData, totalDamageCost: e.target.value})} className="w-full rounded px-3 py-2 text-sm font-bold text-red-700 border border-red-300 outline-none" placeholder="จำนวนเงิน" />
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">บาท</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. การบรรเทาภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๖. การบรรเทาภัย</h2>
          <textarea value={formData.mitigation} onChange={e => setFormData({...formData, mitigation: e.target.value})} rows={3} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none resize-none transition-all" placeholder="อธิบายการบรรเทาภัย..." />
        </section>

        {/* 7. เครื่องมือ/อุปกรณ์ที่ใช้ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๗. เครื่องมือ/อุปกรณ์ที่ใช้</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">รถดับเพลิง (คัน)</label><input type="text" value={formData.toolsFireTrucks} onChange={e => setFormData({...formData, toolsFireTrucks: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">รถบรรทุกน้ำ (คัน)</label><input type="text" value={formData.toolsWaterTrucks} onChange={e => setFormData({...formData, toolsWaterTrucks: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">รถกู้ภัย (คัน)</label><input type="text" value={formData.toolsRescueTrucks} onChange={e => setFormData({...formData, toolsRescueTrucks: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">เรือดับเพลิง (ลำ)</label><input type="text" value={formData.toolsFireBoats} onChange={e => setFormData({...formData, toolsFireBoats: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">เครื่องสูบน้ำ (เครื่อง)</label><input type="text" value={formData.toolsWaterPumps} onChange={e => setFormData({...formData, toolsWaterPumps: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">อื่นๆ</label><input type="text" value={formData.toolsOther} onChange={e => setFormData({...formData, toolsOther: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">๗.๑ ส่วนราชการ (หน่วยงาน)</label><input type="text" value={formData.opsGovAgencies} onChange={e => setFormData({...formData, opsGovAgencies: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">๗.๒ เอกชน/ประชาชน (กลุ่ม/คน)</label><input type="text" value={formData.opsPrivateSector} onChange={e => setFormData({...formData, opsPrivateSector: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" /></div>
          </div>
        </section>

        {/* 9. ข้อเสนอ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">๙. ข้อเสนอ</h2>
          <div className="space-y-2">
            {PROPOSALS.map(prop => (
              <label key={prop} className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                <input type="checkbox" checked={formData.proposals.includes(prop)} onChange={() => handleCheckboxChange('proposals', prop)} className="w-4 h-4 rounded border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]" />
                {prop}
              </label>
            ))}
          </div>
        </section>

        {/* ลายมือชื่อผู้รายงาน (Signatures) & รูปความเสียหาย (Damage Photos) */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
          <div className="border-b border-[var(--border-light)] pb-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">ผู้รายงานและหลักฐานแนบ</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ชื่อผู้รายงาน</label>
              <input type="text" value={formData.reporterName} onChange={e => setFormData({...formData, reporterName: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="(ลงชื่อ)" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-1">ตำแหน่ง</label>
              <input type="text" value={formData.reporterPosition} onChange={e => setFormData({...formData, reporterPosition: e.target.value})} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all" placeholder="เช่น นายอำเภอเมือง" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-light)]">
            {/* Signature Block */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-[var(--text-primary)]">ลายมือชื่อผู้รายงาน</label>
              
              {formData.signatureImage ? (
                <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-light)] flex flex-col items-center gap-3 relative group">
                  <img src={formData.signatureImage} alt="Signature" className="max-h-28 object-contain mix-blend-multiply dark:mix-blend-normal bg-white p-2 rounded" />
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, signatureImage: '' }))}
                    type="button"
                    className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors"
                    title="ลบลายมือชื่อ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-[var(--text-secondary)]">ตรวจจับจากไฟล์สแกน หรืออัปโหลด/วาดด้วยตนเอง</span>
                </div>
              ) : (
                <div className="bg-[var(--bg-overlay)] p-6 rounded-lg border border-dashed border-[var(--border-light)] flex flex-col items-center justify-center gap-4 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">ยังไม่มีภาพลายมือชื่อผู้รายงาน</div>
                  
                  {isDrawingSignature ? (
                    <div className="w-full max-w-sm space-y-3">
                      <div className="relative border border-gray-300 dark:border-neutral-700 rounded-lg bg-white overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          width={320}
                          height={150}
                          className="w-full h-[150px] cursor-crosshair touch-none bg-white"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={clearCanvas} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[var(--text-primary)] rounded">
                          ล้างกระดาน
                        </button>
                        <button type="button" onClick={saveSignature} className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
                          บันทึกลายเซ็น
                        </button>
                        <button type="button" onClick={() => setIsDrawingSignature(false)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <label className="bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" /> อัปโหลดรูปภาพลายเซ็น
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => {
                                setFormData(prev => ({ ...prev, signatureImage: r.result as string }));
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => setIsDrawingSignature(true)}
                        className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> วาดด้วยนิ้ว/เมาส์
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Damage Photos Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-[var(--text-primary)]">ภาพถ่ายความเสียหายในพื้นที่</label>
                <label className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold cursor-pointer flex items-center gap-1">
                  <Plus className="w-3 h-3" /> เพิ่มรูปภาพ
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        const r = new FileReader();
                        r.onloadend = () => {
                          setFormData(prev => ({
                            ...prev,
                            damageImages: [...(prev.damageImages || []), r.result as string]
                          }));
                        };
                        r.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              </div>

              {formData.damageImages && formData.damageImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto p-2 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-light)]">
                  {formData.damageImages.map((imgUrl, index) => (
                    <div key={index} className="relative group border border-[var(--border-light)] rounded-md overflow-hidden bg-black flex items-center justify-center aspect-video">
                      <img src={imgUrl} alt={`Damage ${index + 1}`} className="max-h-full max-w-full object-contain" />
                      <button 
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            damageImages: (prev.damageImages || []).filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"
                        title="ลบรูปภาพ"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white py-0.5 text-center">
                        ภาพที่ {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[var(--bg-overlay)] p-6 rounded-lg border border-dashed border-[var(--border-light)] flex flex-col items-center justify-center gap-2 text-center h-[130px]">
                  <div className="text-xs text-[var(--text-secondary)]">ยังไม่มีภาพถ่ายภัยพิบัติแนบ</div>
                  <span className="text-[10px] text-[var(--text-secondary)]">สกัดภาพอัตโนมัติเมื่อใช้ AI สแกน หรือกดปุ่ม "เพิ่มรูปภาพ" เพื่ออัปโหลดเอง</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
