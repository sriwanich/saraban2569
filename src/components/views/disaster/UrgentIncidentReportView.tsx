import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AlertTriangle, Plus, Search, Edit, Trash2, FileText, ChevronLeft, Save, FileDown } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import UrgentIncidentDashboard from './UrgentIncidentDashboard';
import { BarChart2 } from 'lucide-react';

export interface UrgentIncident {
  id: string;
  docNumber: string;
  docDate: string;
  fromPerson: string;
  toPerson: string;
  incidentTypes: string[];
  incidentTypeOther: string;
  severity: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
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
  createdAt: string;
  createdBy: string;
}

const initialFormState: Omit<UrgentIncident, 'id' | 'createdAt' | 'createdBy'> = {
  docNumber: '', docDate: '', fromPerson: 'นายอำเภอ', toPerson: 'ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด',
  incidentTypes: [], incidentTypeOther: '', severity: '',
  startDate: '', startTime: '', endDate: '', endTime: '', location: '',
  affectedPeople: '', affectedHouseholds: '', injured: '', dead: '', missing: '', evacuatedPeople: '', evacuatedHouseholds: '',
  damageHouses: '', damageHighRises: '', damageFactories: '', damageTemples: '', damageGovBuildings: '', damageOtherBuildings: '', damageBuildingCost: '',
  damageAgricultureCrops: '', damageAgricultureRice: '', damageAgricultureOrchard: '', damageAgricultureFish: '', damageAgricultureShrimp: '',
  damageLivestockCow: '', damageLivestockPig: '', damageLivestockPoultry: '', damageLivestockOther: '', damageAgricultureCost: '',
  damagePublicRoads: '', damagePublicBridges: '', damagePublicBridgeApproaches: '', damagePublicWeirs: '', damagePublicOther: '', damagePublicCost: '',
  totalDamageCost: '', mitigation: '',
  toolsFireTrucks: '', toolsWaterTrucks: '', toolsRescueTrucks: '', toolsFireBoats: '', toolsWaterPumps: '', toolsOther: '',
  opsGovAgencies: '', opsPrivateSector: '',
  proposals: [], reporterName: '', reporterPosition: 'นายอำเภอ'
};

const INCIDENT_TYPES = ['อุทกภัย', 'ความแห้งแล้ง', 'วาตภัย', 'อัคคีภัย', 'ไฟป่า', 'อุบัติภัย', 'อากาศหนาว', 'แผ่นดินไหว', 'สารเคมีและวัตถุอันตราย', 'ทุ่นระเบิด', 'การป้องกันและระงับภัยทางอากาศ', 'การก่อวินาศกรรม', 'การอพยพประชาชนและส่วนราชการ'];
const PROPOSALS = ['เพื่อโปรดทราบ', 'เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย', 'เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน'];

export default function UrgentIncidentReportView({ user }: { user: any }) {
  const { confirm } = useConfirm();
  const [reports, setReports] = useState<UrgentIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'dashboard'>('list');
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'urgent_incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UrgentIncident));
      setReports(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching urgent reports:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const handleSave = async () => {
    if (!formData.location || !formData.docDate) {
      await confirm({
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาระบุสถานที่เกิดภัยและวันที่รายงาน',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'urgent_incidents', editingId), { ...formData });
      } else {
        await addDoc(collection(db, 'urgent_incidents'), {
          ...formData,
          createdAt: new Date().toISOString(),
          createdBy: user?.username || 'System'
        });
      }
      setViewMode('list');
    } catch (err) {
      console.error('Error saving report:', err);
      await confirm({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });
    }
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
      await deleteDoc(doc(db, 'urgent_incidents', id));
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const handleEdit = (report: UrgentIncident) => {
    setFormData(report);
    setEditingId(report.id);
    setViewMode('form');
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

  const filteredReports = reports.filter(r => 
    r.location.includes(searchQuery) || 
    r.docNumber.includes(searchQuery) ||
    r.reporterName.includes(searchQuery)
  );

  
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
    
    // Helper function to format dotted lines
    const fill = (text, length = 20) => {
      if (!text) return '<span class="dotted-line" style="min-width: ' + length + 'px;"></span>';
      return '<span class="filled-text">' + text + '</span>';
    };

    const html = `
      <html>
        <head>
          <title>แบบรายงานเหตุด่วนสาธารณภัย</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
            body { 
              font-family: 'Sarabun', sans-serif; 
              font-size: 16pt; 
              line-height: 1.4; 
              color: #000; 
              max-width: 210mm; 
              margin: 0 auto;
              padding: 20px;
            }
            * { box-sizing: border-box; }
            h1 { font-size: 20pt; font-weight: bold; text-align: center; margin: 15px 0 25px 0; }
            .urgent-stamp { color: red; font-size: 24pt; font-weight: bold; line-height: 1; margin-bottom: 15px; display: inline-block;}
            .flex-between { display: flex; justify-content: space-between; align-items: flex-end; }
            .flex-start { display: flex; justify-content: flex-start; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .indent-1 { padding-left: 2.5em; }
            .indent-2 { padding-left: 5em; }
            
            .checkbox { 
              display: inline-block; 
              width: 14px; height: 14px; 
              border: 1px solid #000; 
              margin-right: 5px; 
              position: relative; 
              top: 2px; 
            }
            .checked::after { 
              content: '✓'; 
              position: absolute; 
              top: -8px; left: 1px; 
              font-size: 18px; 
              font-weight: bold; 
            }
            
            .dotted-line {
              display: inline-block;
              border-bottom: 1px dotted #000;
              height: 1.2em;
              min-width: 50px;
            }
            .filled-text {
              display: inline-block;
              border-bottom: 1px dotted #000;
              color: #000;
              padding: 0 5px;
            }
            
            .row { display: flex; flex-wrap: wrap; align-items: baseline; }
            .item { margin-right: 15px; white-space: nowrap; }
            .signature-box { margin-top: 50px; display: flex; flex-direction: column; align-items: flex-end; padding-right: 40px; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="flex-between">
            <span class="urgent-stamp">ด่วนที่สุด</span>
            <div class="text-center" style="margin-right: 20px;">
              
              <div>ครั้งที่ ${fill('', 40)} / ๒๕${fill('', 40)}</div>
            </div>
          </div>
          
          <h1>แบบรายงานเหตุด่วนสาธารณภัย</h1>
          
          <div class="flex-between mb-2">
            <div>ที่ สส ${fill(report.docNumber, 150)}</div>
            <div>วันที่ ${fill(report.docDate, 200)}</div>
          </div>
          <div class="mb-2">จาก ${fill(report.fromPerson, 300)}</div>
          <div class="mb-4">ถึง ${fill(report.toPerson, 300)}</div>
          
          <div class="mb-2"><strong>๑. ชนิดของภัย</strong></div>
          <div class="indent-1 mb-2 row">
            ${INCIDENT_TYPES.map(t => `<div class="item"><span class="checkbox ${report.incidentTypes.includes(t) ? 'checked' : ''}"></span> ${t}</div>`).join('')}
            <div class="item"><span class="checkbox ${report.incidentTypes.includes('อื่นๆ') ? 'checked' : ''}"></span> อื่นๆ ${fill(report.incidentTypeOther, 150)}</div>
          </div>
          <div class="indent-1 mb-4 row">
            <span style="margin-right:15px;">ความรุนแรงและลักษณะของภัย</span>
            <div class="item"><span class="checkbox ${report.severity === 'เล็กน้อย' ? 'checked' : ''}"></span> เล็กน้อย</div>
            <div class="item"><span class="checkbox ${report.severity === 'ปานกลาง' ? 'checked' : ''}"></span> ปานกลาง</div>
            <div class="item"><span class="checkbox ${report.severity === 'รุนแรง' ? 'checked' : ''}"></span> รุนแรง</div>
          </div>

          <div class="mb-4">
            <strong>๒. วันเวลาที่เกิดภัย</strong><br>
            <div class="indent-1">
              เกิดวันที่ ${fill(report.startDate, 120)} เวลา ${fill(report.startTime, 60)} น. 
              สิ้นสุดวันที่ ${fill(report.endDate, 120)} เวลา ${fill(report.endTime, 60)} น.
            </div>
          </div>
          
          <div class="mb-4"><strong>๓. สถานที่เกิดภัย</strong> ${fill(report.location, 500)}</div>
          
          <div class="mb-2"><strong>๔. ราษฎรที่ประสบภัย</strong></div>
          <div class="indent-1 mb-4">
            <div class="row">
              <span class="item">๔.๑ ราษฎรที่ได้รับความเดือดร้อน ${fill(report.affectedPeople, 80)} คน</span>
              <span class="item">${fill(report.affectedHouseholds, 80)} ครัวเรือน</span>
            </div>
            <div class="row">
              <span class="item">๔.๒ บาดเจ็บ ${fill(report.injured, 80)} คน</span>
              <span class="item">๔.๓ เสียชีวิต ${fill(report.dead, 80)} คน</span>
              <span class="item">๔.๔ สูญหาย ${fill(report.missing, 80)} คน</span>
            </div>
            <div class="row">
              <span class="item">๔.๕ อพยพที่ปลอดภัย ${fill(report.evacuatedPeople, 80)} คน</span>
              <span class="item">${fill(report.evacuatedHouseholds, 80)} ครัวเรือน</span>
            </div>
          </div>

          <div class="mb-2"><strong>๕. พื้นที่ประสบภัยและความเสียหาย</strong></div>
          <div class="indent-1 mb-4">
            <div class="row">
              <span class="item">๕.๑ อาคารสิ่งก่อสร้าง / บ้านพักอาศัย ${fill(report.damageHouses, 60)} หลัง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อาคารโรงงาน ${fill(report.damageFactories, 60)} แห่ง</span>
              <span class="item">วัด ${fill(report.damageTemples, 60)} แห่ง</span>
              <span class="item">สถานที่ราชการ ${fill(report.damageGovBuildings, 60)} แห่ง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อื่นๆ ${fill(report.damageOtherBuildings, 100)}</span>
              <span class="item">ความเสียหายประมาณ ${fill(report.damageBuildingCost, 120)} บาท</span>
            </div>
            
            <div class="row" style="margin-top: 8px;">
              <span class="item">๕.๒ พื้นที่และทรัพย์สินทางการเกษตร พืชไร่ ${fill(report.damageAgricultureCrops, 60)} ไร่</span>
              <span class="item">นา ${fill(report.damageAgricultureRice, 60)} ไร่</span>
              <span class="item">สวน ${fill(report.damageAgricultureOrchard, 60)} ไร่</span>
            </div>
            <div class="indent-1 row">
              <span class="item">บ่อปลา ${fill(report.damageAgricultureFish, 60)} ไร่</span>
              <span class="item">บ่อกุ้ง ${fill(report.damageAgricultureShrimp, 60)} ไร่</span>
            </div>
            <div class="indent-1 row">
              <span class="item">สัตว์เลี้ยง (โค/กระบือ ${fill(report.damageLivestockCow, 60)} ตัว</span>
              <span class="item">สุกร ${fill(report.damageLivestockPig, 60)} ตัว</span>
              <span class="item">เป็ด/ไก่ ${fill(report.damageLivestockPoultry, 60)} ตัว)</span>
            </div>
            <div class="indent-1 row">
              <span class="item">อื่นๆ ${fill(report.damageLivestockOther, 100)}</span>
              <span class="item">ความเสียหายประมาณ ${fill(report.damageAgricultureCost, 120)} บาท</span>
            </div>

            <div class="row" style="margin-top: 8px;">
              <span class="item">๕.๓ สิ่งสาธารณประโยชน์ ถนน ${fill(report.damagePublicRoads, 60)} สาย</span>
              <span class="item">สะพาน ${fill(report.damagePublicBridges, 60)} แห่ง</span>
              <span class="item">คอสะพาน ${fill(report.damagePublicBridgeApproaches, 60)} แห่ง</span>
            </div>
            <div class="indent-1 row">
              <span class="item">ฝาย ${fill(report.damagePublicWeirs, 60)} แห่ง</span>
              <span class="item">อื่นๆ ${fill(report.damagePublicOther, 100)}</span>
              <span class="item">ความเสียหายประมาณ ${fill(report.damagePublicCost, 120)} บาท</span>
            </div>
            <div class="row" style="margin-top: 8px; font-weight: bold;">
              <span class="item">รวมความเสียหายเบื้องต้น ${fill(report.totalDamageCost, 150)} บาท</span>
            </div>
          </div>

          <div class="mb-4"><strong>๖. การบรรเทาภัย</strong> ${fill(report.mitigation, 500)}</div>
          
          <div class="mb-2"><strong>๗. เครื่องมือ/อุปกรณ์ที่ใช้</strong></div>
          <div class="indent-1 mb-4 row">
            <span class="item">รถดับเพลิง ${fill(report.toolsFireTrucks, 50)} คัน</span>
            <span class="item">รถบรรทุกน้ำ ${fill(report.toolsWaterTrucks, 50)} คัน</span>
            <span class="item">รถกู้ภัย ${fill(report.toolsRescueTrucks, 50)} คัน</span>
            <span class="item">เรือดับเพลิง ${fill(report.toolsFireBoats, 50)} ลำ</span>
            <span class="item">เครื่องสูบน้ำ ${fill(report.toolsWaterPumps, 50)} เครื่อง</span>
            <span class="item">อื่นๆ ${fill(report.toolsOther, 100)}</span>
          </div>
          <div class="indent-1 mb-4 row">
            <span class="item">๗.๑ ส่วนราชการ ${fill(report.opsGovAgencies, 80)} หน่วยงาน</span>
            <span class="item">๗.๒ เอกชน/ประชาชน ${fill(report.opsPrivateSector, 80)} กลุ่ม/คน</span>
          </div>

          <div class="mb-2"><strong>๘. การดำเนินงานของส่วนราชการ หน่วยอาสาสมัคร มูลนิธิในพื้นที่</strong></div>
          <div class="indent-1 mb-4">
            <div class="row"><span class="checkbox"></span> ส่วนราชการอื่นๆ${fill('', 300)}</div>
            <div class="row"><span class="checkbox"></span> ภาคเอกชน${fill('', 300)}</div>
          </div>

          <div class="mb-2"><strong>๙. ข้อเสนอ</strong></div>
          <div class="indent-1 mb-4">
            ${PROPOSALS.map(p => `<div class="row"><span class="checkbox ${report.proposals.includes(p) ? 'checked' : ''}"></span> ${p}</div>`).join('')}
          </div>

          <div class="signature-box">
            <div class="text-center">
              <div>(ลงชื่อ)${fill('', 150)}ผู้รายงาน</div>
              <div style="margin-top: 5px;">(${fill(report.reporterName, 180)})</div>
              <div style="margin-top: 5px;">${fill(report.reporterPosition, 200)}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };


  if (viewMode === 'dashboard') {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => setViewMode('list')}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            แดชบอร์ดสรุปรายงานเหตุด่วนสาธารณภัย
          </h1>
        </div>
        <UrgentIncidentDashboard reports={reports} />
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              รายงานเหตุด่วนสาธารณภัย
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">ระบบจัดการแบบรายงานเหตุด่วนสาธารณภัย (สำหรับผู้ดูแลและฝ่ายสงเคราะห์ฯ)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setViewMode('dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <BarChart2 className="w-4 h-4" /> แดชบอร์ดสรุปผล
            </button>
            <button 
              onClick={handleAddNew}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> สร้างรายงานฉบับใหม่
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--border-light)] flex gap-4">
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
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                <tr>
                  <th className="px-4 py-3">เลขที่/วันที่</th>
                  <th className="px-4 py-3">สถานที่เกิดภัย</th>
                  <th className="px-4 py-3">ประเภทภัย</th>
                  <th className="px-4 py-3">ระดับความรุนแรง</th>
                  <th className="px-4 py-3">ผู้รายงาน</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">ไม่พบข้อมูลรายงานเหตุด่วน</td></tr>
                ) : (
                  filteredReports.map(report => (
                    <tr key={report.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{report.docNumber || '-'}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{report.docDate || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] max-w-xs truncate" title={report.location}>{report.location}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {report.incidentTypes.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                          {report.incidentTypes.length > 2 && (
                            <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full">+{report.incidentTypes.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {report.severity === 'รุนแรง' ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">รุนแรง</span>
                        ) : report.severity === 'ปานกลาง' ? (
                          <span className="text-orange-500 font-medium">ปานกลาง</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">เล็กน้อย</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--text-primary)]">{report.reporterName || '-'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{report.reporterPosition || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => printDocument(report)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="พิมพ์แบบรายงาน">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(report)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="แก้ไข">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(report.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="ลบ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('list')}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {editingId ? 'แก้ไขแบบรายงานเหตุด่วนสาธารณภัย' : 'สร้างแบบรายงานเหตุด่วนสาธารณภัย'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> บันทึกข้อมูล
          </button>
          {editingId && (
            <button 
              onClick={() => printDocument(formData as UrgentIncident)}
              className="bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileDown className="w-4 h-4" /> พิมพ์เอกสาร
            </button>
          )}
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
            className="bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            title="แปลงเลขอารบิกในฟอร์มเป็นเลขไทยทั้งหมด"
          >
            แปลงเป็นเลขไทย
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
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
          
          <div className="mt-4">
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2">ความรุนแรงและลักษณะของภัย</label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              {['เล็กน้อย', 'ปานกลาง', 'รุนแรง'].map(level => (
                <label key={level} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <input type="radio" name="severity" checked={formData.severity === level} onChange={() => setFormData({...formData, severity: level})} className="w-4 h-4 border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]" />
                  {level}
                </label>
              ))}
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
          <textarea value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} rows={2} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none resize-none transition-all" placeholder="หมู่ที่ ตำบล อำเภอ จังหวัด..." />
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

        {/* Signatures */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">ผู้รายงาน</h2>
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
        </section>
      </div>
    </div>
  );
}
