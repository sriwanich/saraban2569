import React, { useMemo, useState } from 'react';
import { UrgentIncident } from './UrgentIncidentReportView';
import { Activity, Users, Home, AlertCircle, Skull, HeartPulse, ShieldAlert, BarChart3, PieChart as PieIcon, TrendingUp, MapPin, Navigation, Landmark, Building, Map, Printer, X, Filter, Calendar } from 'lucide-react';
import { parseLocationString } from '../../../utils/locationParser';
import { parseDateFromDocString } from '../../../utils/thaiDateUtils';

interface Props {
  reports: UrgentIncident[];
  user?: any;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const SEVERITY_COLORS: Record<string, { bg: string; text: string; bar: string; border: string }> = {
  'เล็กน้อย': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', bar: '#10b981', border: 'border-emerald-200 dark:border-emerald-800' },
  'ปานกลาง': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', bar: '#f59e0b', border: 'border-amber-200 dark:border-amber-800' },
  'รุนแรง': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', bar: '#ef4444', border: 'border-red-200 dark:border-red-800' }
};

export default function UrgentIncidentDashboard({ reports, user }: Props) {
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [selectedAmphoe, setSelectedAmphoe] = useState<string>('all');
  const [geoTab, setGeoTab] = useState<'amphoe' | 'tambon' | 'muban'>('amphoe');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFilters, setPrintFilters] = useState({
    startDate: '',
    endDate: '',
    incidentType: 'all',
    amphoe: 'all',
    tambon: 'all',
    muban: 'all',
    severity: 'all'
  });

  const stats = useMemo(() => {
    const totalIncidents = reports.length;
    let totalAffectedPeople = 0;
    let totalAffectedHouseholds = 0;
    let totalDamageCost = 0;
    
    // Casualties
    let totalDead = 0;
    let totalInjured = 0;
    let totalMissing = 0;
    
    // Damage costs breakdown
    let totalDamageBuilding = 0;
    let totalDamageAgriculture = 0;
    let totalDamagePublic = 0;

    const incidentTypeCount: Record<string, number> = {};
    const severityCount: Record<string, number> = { 'เล็กน้อย': 0, 'ปานกลาง': 0, 'รุนแรง': 0 };
    const monthlyTrend: Record<string, number> = {};

    reports.forEach(r => {
      const toNum = (str: string) => {
        if (!str) return 0;
        const arabicStr = str.replace(/[๐-๙]/g, match => '๐๑๒๓๔๕๖๗๘๙'.indexOf(match).toString());
        const num = parseFloat(arabicStr.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };

      totalAffectedPeople += toNum(r.affectedPeople);
      totalAffectedHouseholds += toNum(r.affectedHouseholds);
      totalDamageCost += toNum(r.totalDamageCost);
      
      totalDead += toNum(r.dead);
      totalInjured += toNum(r.injured);
      totalMissing += toNum(r.missing);
      
      totalDamageBuilding += toNum(r.damageBuildingCost);
      totalDamageAgriculture += toNum(r.damageAgricultureCost);
      totalDamagePublic += toNum(r.damagePublicCost);

      if (Array.isArray(r.incidentTypes)) {
        r.incidentTypes.forEach(t => {
          incidentTypeCount[t] = (incidentTypeCount[t] || 0) + 1;
        });
      }

      if (r.severity && severityCount[r.severity] !== undefined) {
        severityCount[r.severity] += 1;
      }

      const docDateObj = parseDateFromDocString(r.docDate, r.startDate);
      const dateStr = docDateObj 
        ? docDateObj.toLocaleString('th-TH', { month: 'short', year: '2-digit' }) 
        : (r.docDate || (r.createdAt ? new Date(r.createdAt).toLocaleString('th-TH', { month: 'short', year: '2-digit' }) : 'ไม่ระบุ'));
      monthlyTrend[dateStr] = (monthlyTrend[dateStr] || 0) + 1;
    });

    const typeChartData = Object.keys(incidentTypeCount)
      .map(key => ({ name: key, value: incidentTypeCount[key] }))
      .sort((a, b) => b.value - a.value);

    const maxTypeValue = typeChartData.length > 0 ? Math.max(...typeChartData.map(d => d.value), 1) : 1;

    const severityChartData = Object.keys(severityCount).map(key => ({
      name: key,
      value: severityCount[key]
    }));

    const trendChartData = Object.keys(monthlyTrend).map(key => ({
      name: key,
      value: monthlyTrend[key]
    }));
    
    const damageBreakdownData = [
      { name: 'สิ่งก่อสร้าง/บ้านเรือน', value: totalDamageBuilding, color: '#3b82f6' },
      { name: 'การเกษตร', value: totalDamageAgriculture, color: '#10b981' },
      { name: 'สาธารณประโยชน์', value: totalDamagePublic, color: '#8b5cf6' }
    ].filter(d => d.value > 0);

    const totalDamageBreakdownSum = damageBreakdownData.reduce((acc, cur) => acc + cur.value, 0);

    return {
      totalIncidents,
      totalAffectedPeople,
      totalAffectedHouseholds,
      totalDamageCost,
      totalDead,
      totalInjured,
      totalMissing,
      typeChartData,
      maxTypeValue,
      severityChartData,
      trendChartData,
      damageBreakdownData,
      totalDamageBreakdownSum
    };
  }, [reports]);

  // Geographical computations
  const reportsWithGeo = useMemo(() => {
    return reports.map(r => {
      let amp = r.amphoe;
      let tam = r.tambon;
      let mub = r.muban;
      if ((!amp || !tam) && r.location) {
        const parsed = parseLocationString(r.location);
        amp = amp || parsed.amphoe;
        tam = tam || parsed.tambon;
        mub = mub || parsed.muban;
      }
      return {
        ...r,
        amphoe: amp || 'ไม่ระบุอำเภอ',
        tambon: tam || 'ไม่ระบุตำบล',
        muban: mub || 'ไม่ระบุหมู่บ้าน'
      };
    });
  }, [reports]);

  const amphoeStats = useMemo(() => {
    const statsMap: Record<string, { name: string; count: number; affected: number; damage: number }> = {};
    reportsWithGeo.forEach(r => {
      const amp = r.amphoe;
      const toNum = (str: string) => {
        if (!str) return 0;
        const num = parseFloat(str.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[amp]) {
        statsMap[amp] = { name: amp, count: 0, affected: 0, damage: 0 };
      }
      statsMap[amp].count += 1;
      statsMap[amp].affected += toNum(r.affectedPeople);
      statsMap[amp].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap).sort((a, b) => b.count - a.count);
  }, [reportsWithGeo]);

  const tambonStats = useMemo(() => {
    const statsMap: Record<string, { name: string; amphoe: string; count: number; affected: number; damage: number }> = {};
    reportsWithGeo.forEach(r => {
      if (selectedAmphoe !== 'all' && r.amphoe !== selectedAmphoe) {
        return;
      }
      const key = `${r.amphoe}-${r.tambon}`;
      const toNum = (str: string) => {
        if (!str) return 0;
        const num = parseFloat(str.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[key]) {
        statsMap[key] = { name: r.tambon, amphoe: r.amphoe, count: 0, affected: 0, damage: 0 };
      }
      statsMap[key].count += 1;
      statsMap[key].affected += toNum(r.affectedPeople);
      statsMap[key].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap).sort((a, b) => b.count - a.count);
  }, [reportsWithGeo, selectedAmphoe]);

  const mubanStats = useMemo(() => {
    const statsMap: Record<string, { name: string; tambon: string; amphoe: string; count: number; affected: number; damage: number }> = {};
    reportsWithGeo.forEach(r => {
      if (selectedAmphoe !== 'all' && r.amphoe !== selectedAmphoe) {
        return;
      }
      const key = `${r.amphoe}-${r.tambon}-${r.muban}`;
      const toNum = (str: string) => {
        if (!str) return 0;
        const num = parseFloat(str.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[key]) {
        statsMap[key] = { name: r.muban, tambon: r.tambon, amphoe: r.amphoe, count: 0, affected: 0, damage: 0 };
      }
      statsMap[key].count += 1;
      statsMap[key].affected += toNum(r.affectedPeople);
      statsMap[key].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap).sort((a, b) => b.count - a.count);
  }, [reportsWithGeo, selectedAmphoe]);

  // SVG Area Chart Calculations for Monthly Trend
  const trendSvg = useMemo(() => {
    const data = stats.trendChartData;
    if (data.length === 0) return null;

    const width = 600;
    const height = 220;
    const padX = 45;
    const padY = 30;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const maxVal = Math.max(...data.map(d => d.value), 3);
    const minVal = 0;

    const points = data.map((d, i) => {
      const x = padX + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
      const y = height - padY - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH;
      return { x, y, name: d.name, value: d.value };
    });

    const linePath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height - padY} L ${points[0].x},${height - padY} Z`
      : '';

    return { width, height, padX, padY, points, linePath, areaPath, maxVal };
  }, [stats.trendChartData]);

  // SVG Donut Chart Calculation for Damage Breakdown
  const donutSvg = useMemo(() => {
    const data = stats.damageBreakdownData;
    const total = stats.totalDamageBreakdownSum;
    if (data.length === 0 || total === 0) return null;

    const radius = 80;
    const strokeWidth = 32;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    const slices = data.map(item => {
      const percentage = item.value / total;
      const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += percentage;
      return {
        ...item,
        percentage: (percentage * 100).toFixed(1),
        strokeDasharray,
        strokeDashoffset
      };
    });

    return { radius, strokeWidth, slices, circumference };
  }, [stats.damageBreakdownData, stats.totalDamageBreakdownSum]);

  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const amphoes = new Set<string>();
    const tambons = new Set<string>();
    const mubans = new Set<string>();

    reportsWithGeo.forEach(r => {
      if (Array.isArray(r.incidentTypes)) {
        r.incidentTypes.forEach(t => types.add(t));
      }
      if (r.amphoe && r.amphoe !== 'ไม่ระบุอำเภอ') amphoes.add(r.amphoe);
      
      if (printFilters.amphoe === 'all' || r.amphoe === printFilters.amphoe) {
        if (r.tambon && r.tambon !== 'ไม่ระบุตำบล') tambons.add(r.tambon);
      }
      
      if ((printFilters.amphoe === 'all' || r.amphoe === printFilters.amphoe) && 
          (printFilters.tambon === 'all' || r.tambon === printFilters.tambon)) {
        if (r.muban && r.muban !== 'ไม่ระบุหมู่บ้าน') mubans.add(r.muban);
      }
    });

    return {
      types: Array.from(types).sort(),
      amphoes: Array.from(amphoes).sort(),
      tambons: Array.from(tambons).sort(),
      mubans: Array.from(mubans).sort(),
    };
  }, [reportsWithGeo, printFilters.amphoe, printFilters.tambon]);

  const executePrint = () => {
    const filtered = reportsWithGeo.filter(r => {
      if (printFilters.startDate) {
        const rDate = parseDateFromDocString(r.docDate, r.startDate) || (r.createdAt ? new Date(r.createdAt) : null);
        if (rDate && rDate < new Date(printFilters.startDate)) return false;
      }
      if (printFilters.endDate) {
        const rDate = parseDateFromDocString(r.docDate, r.startDate) || (r.createdAt ? new Date(r.createdAt) : null);
        const eDate = new Date(printFilters.endDate);
        eDate.setHours(23, 59, 59, 999);
        if (rDate && rDate > eDate) return false;
      }
      if (printFilters.incidentType !== 'all') {
        if (!r.incidentTypes?.includes(printFilters.incidentType)) return false;
      }
      if (printFilters.severity !== 'all') {
        if (r.severity !== printFilters.severity) return false;
      }
      if (printFilters.amphoe !== 'all' && r.amphoe !== printFilters.amphoe) return false;
      if (printFilters.tambon !== 'all' && r.tambon !== printFilters.tambon) return false;
      if (printFilters.muban !== 'all' && r.muban !== printFilters.muban) return false;
      
      return true;
    });

    let fAffectedPeople = 0;
    let fDamageCost = 0;
    filtered.forEach(r => {
      const toNum = (str: string) => {
        if (!str) return 0;
        const num = parseFloat(String(str).replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      fAffectedPeople += toNum(r.affectedPeople);
      fDamageCost += toNum(r.totalDamageCost);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาต Pop-up บนเบราว์เซอร์ของคุณเพื่อพิมพ์เอกสาร');
      return;
    }

    let filterDesc = [];
    if (printFilters.startDate && printFilters.endDate) filterDesc.push(`วันที่: ${printFilters.startDate} ถึง ${printFilters.endDate}`);
    if (printFilters.incidentType !== 'all') filterDesc.push(`ประเภทภัย: ${printFilters.incidentType}`);
    if (printFilters.severity !== 'all') filterDesc.push(`ความรุนแรง: ${printFilters.severity}`);
    if (printFilters.amphoe !== 'all') filterDesc.push(`อำเภอ: ${printFilters.amphoe}`);
    if (printFilters.tambon !== 'all') filterDesc.push(`ตำบล: ${printFilters.tambon}`);
    if (printFilters.muban !== 'all') filterDesc.push(`หมู่บ้าน: ${printFilters.muban}`);

    const filterText = filterDesc.length > 0 ? `<div class="filter-text">เงื่อนไข: ${filterDesc.join(', ')}</div>` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>สรุปรายงานเหตุด่วนสาธารณภัย</title>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 14pt; color: #000; line-height: 1.3; }
          h1 { text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 5px; }
          .filter-text { text-align: center; font-size: 14pt; color: #333; margin-bottom: 10px; }
          .summary-info { text-align: center; margin-bottom: 15px; font-size: 16pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background-color: #f3f4f6; font-weight: bold; text-align: center; font-size: 14pt; }
          td { font-size: 14pt; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .nowrap { white-space: nowrap; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>ตารางสรุปรายงานเหตุด่วนสาธารณภัย</h1>
        ${filterText}
        <div class="summary-info">
          พบข้อมูลจำนวน ${filtered.length} ครั้ง | 
          ผู้ได้รับผลกระทบรวม ${fAffectedPeople.toLocaleString()} คน |
          มูลค่าความเสียหายรวม ${fDamageCost.toLocaleString()} บาท
        </div>
        <table>
          <thead>
            <tr>
              <th width="4%">ลำดับ</th>
              <th width="12%">วันที่รายงาน</th>
              <th width="14%">ประเภทภัย</th>
              <th width="8%">ความรุนแรง</th>
              <th width="20%">สถานที่เกิดภัย</th>
              <th width="12%">ผลกระทบ<br>(คน/ครัวเรือน)</th>
              <th width="14%">บาดเจ็บ/เสียชีวิต/สูญหาย</th>
              <th width="16%">มูลค่าความเสียหาย<br>(บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length > 0 ? filtered.map((r, idx) => {
              const types = Array.isArray(r.incidentTypes) ? r.incidentTypes.join(', ') : (r.incidentTypes || '-');
              const dateStr = r.docDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');
              
              const affected = `${r.affectedPeople || '0'} คน<br>${r.affectedHouseholds || '0'} ครัวเรือน`;
              const casualties = `เจ็บ: ${r.injured || '0'}<br>ตาย: ${r.dead || '0'}<br>สูญหาย: ${r.missing || '0'}`;
              
              const damage = parseFloat(String(r.totalDamageCost || '0').replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
              const damageStr = isNaN(damage) || damage === 0 ? '-' : damage.toLocaleString();

              return `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center nowrap">${dateStr}</td>
                  <td>${types}</td>
                  <td class="text-center">${r.severity || '-'}</td>
                  <td>${r.location || '-'}</td>
                  <td>${affected}</td>
                  <td>${casualties}</td>
                  <td class="text-right">${damageStr}</td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="8" class="text-center" style="padding: 20px;">ไม่พบข้อมูลตามเงื่อนไขที่ระบุ</td></tr>`}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close(); 
    fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'VIEW_URGENT_INCIDENT_SUMMARY', details: 'พิมพ์สรุปรายงานตารางเหตุด่วนสาธารณภัย (แบบมีเงื่อนไข)', username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' }) }).catch(console.error);
    
    setIsPrintModalOpen(false);
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handlePrintSummary = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Print Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">ภาพรวมเหตุด่วนสาธารณภัย</h2>
        <button
          onClick={handlePrintSummary}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์สรุปรายงานตาราง</span>
        </button>
      </div>

      {/* 1. Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">เหตุด่วนทั้งหมด (ครั้ง)</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalIncidents.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">ผู้ได้รับผลกระทบ (คน)</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalAffectedPeople.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">ครัวเรือนที่เดือดร้อน</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalAffectedHouseholds.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">มูลค่าความเสียหาย (บาท)</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalDamageCost.toLocaleString()}</h3>
          </div>
        </div>
      </div>
      
      {/* 2. Secondary KPI Cards (Casualties) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">ผู้เสียชีวิตรวม</p>
            <h3 className="text-xl font-bold text-rose-800 dark:text-rose-200">{stats.totalDead.toLocaleString()} <span className="text-xs font-normal">คน</span></h3>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">ผู้บาดเจ็บรวม</p>
            <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200">{stats.totalInjured.toLocaleString()} <span className="text-xs font-normal">คน</span></h3>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">ผู้สูญหายรวม</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{stats.totalMissing.toLocaleString()} <span className="text-xs font-normal">คน</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Types Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3 mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" /> สถิติการเกิดภัยแยกตามประเภท (ครั้ง)
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">ทั้งหมด {stats.typeChartData.length} ประเภท</span>
            </div>

            {stats.typeChartData.length > 0 ? (
              <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                {stats.typeChartData.map((item, idx) => {
                  const pct = Math.round((item.value / stats.maxTypeValue) * 100);
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={item.name} className="group">
                      <div className="flex justify-between text-xs font-medium mb-1 text-[var(--text-primary)]">
                        <span className="truncate max-w-[240px]">{item.name}</span>
                        <span className="font-bold">{item.value.toLocaleString()} ครั้ง</span>
                      </div>
                      <div className="w-full bg-[var(--bg-overlay)] rounded-full h-2.5 overflow-hidden flex">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
                ยังไม่มีข้อมูลประเภทภัย
              </div>
            )}
          </div>
        </div>

        {/* Damage Breakdown Donut */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3 mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-blue-500" /> สัดส่วนมูลค่าความเสียหาย (บาท)
              </h3>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                รวม {stats.totalDamageBreakdownSum.toLocaleString()} บาท
              </span>
            </div>

            {donutSvg ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pt-2">
                <div className="flex justify-center relative">
                  <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                    <circle
                      cx="100"
                      cy="100"
                      r={donutSvg.radius}
                      fill="transparent"
                      stroke="var(--border-light)"
                      strokeWidth={donutSvg.strokeWidth}
                    />
                    {donutSvg.slices.map((slice, i) => (
                      <circle
                        key={i}
                        cx="100"
                        cy="100"
                        r={donutSvg.radius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={donutSvg.strokeWidth}
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-700 hover:opacity-90"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-xs text-[var(--text-secondary)]">ความเสียหาย</span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">100%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {donutSvg.slices.map((slice, i) => (
                    <div key={i} className="flex items-start justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="text-[var(--text-primary)]">{slice.name}</span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-bold text-[var(--text-primary)]">{slice.percentage}%</span>
                        <span className="text-[var(--text-muted)] block text-[10px]">({slice.value.toLocaleString()} ฿)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
                ไม่มีข้อมูลมูลค่าความเสียหาย
              </div>
            )}
          </div>
        </div>
        
        {/* Severity Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3 mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> ระดับความรุนแรงของภัย
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">รวม {stats.totalIncidents} ครั้ง</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {stats.severityChartData.map(item => {
                const conf = SEVERITY_COLORS[item.name] || { bg: 'bg-gray-100', text: 'text-gray-700', bar: '#9ca3af', border: 'border-gray-200' };
                const pct = stats.totalIncidents > 0 ? Math.round((item.value / stats.totalIncidents) * 100) : 0;
                return (
                  <div key={item.name} className={`border ${conf.border} ${conf.bg} rounded-xl p-4 flex flex-col justify-between`}>
                    <div>
                      <span className={`text-xs font-semibold ${conf.text}`}>{item.name}</span>
                      <h4 className={`text-2xl font-bold ${conf.text} mt-1`}>{item.value.toLocaleString()} <span className="text-xs font-normal">ครั้ง</span></h4>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-medium mb-1 text-[var(--text-secondary)]">
                        <span>สัดส่วน</span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-white/40 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: conf.bar }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trend Monthly Sparkline Area */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3 mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> แนวโน้มการรายงานเหตุด่วน (รายเดือน)
              </h3>
              {hoveredTrendIdx !== null && trendSvg && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {trendSvg.points[hoveredTrendIdx].name}: {trendSvg.points[hoveredTrendIdx].value} ครั้ง
                </span>
              )}
            </div>

            {trendSvg && trendSvg.points.length > 0 ? (
              <div className="w-full overflow-hidden">
                <svg viewBox={`0 0 ${trendSvg.width} ${trendSvg.height}`} className="w-full h-56 select-none">
                  <defs>
                    <linearGradient id="urgentTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.5, 1].map((ratio, i) => {
                    const y = trendSvg.height - trendSvg.padY - ratio * (trendSvg.height - trendSvg.padY * 2);
                    const val = Math.round(ratio * trendSvg.maxVal);
                    return (
                      <g key={i}>
                        <line
                          x1={trendSvg.padX}
                          y1={y}
                          x2={trendSvg.width - trendSvg.padX}
                          y2={y}
                          stroke="var(--border-light)"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={trendSvg.padX - 8}
                          y={y + 4}
                          fill="var(--text-secondary)"
                          fontSize="10"
                          textAnchor="end"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <path d={trendSvg.areaPath} fill="url(#urgentTrendGrad)" />

                  {/* Line stroke */}
                  <path d={trendSvg.linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Data Points */}
                  {trendSvg.points.map((p, i) => (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredTrendIdx(i)} onMouseLeave={() => setHoveredTrendIdx(null)}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredTrendIdx === i ? 6 : 4}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                      <text
                        x={p.x}
                        y={trendSvg.height - 8}
                        fill="var(--text-secondary)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {p.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-[var(--text-muted)]">
                ยังไม่มีข้อมูลแนวโน้มรายเดือน
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Spatial & Geographic Disaster Analytics Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-light)] pb-4 gap-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" /> วิเคราะห์เจาะลึกพื้นที่เกิดภัยพิบัติ (Spatial & Geographic Analytics)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">วิเคราะห์สถิติเหตุด่วนสาธารณภัย แยกตามระดับ อำเภอ ตำบล และหมู่บ้าน อย่างละเอียดตามระเบียนข้อมูล</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">ตัวกรองอำเภอ:</span>
            <select
              value={selectedAmphoe}
              onChange={e => setSelectedAmphoe(e.target.value)}
              className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all cursor-pointer"
            >
              <option value="all">ทุกอำเภอ (ทั้งหมด)</option>
              <option value="อำเภอเมืองระยอง">อำเภอเมืองระยอง</option>
              <option value="อำเภอบ้านฉาง">อำเภอบ้านฉาง</option>
              <option value="อำเภอแกลง">อำเภอแกลง</option>
              <option value="อำเภอวังจันทร์">อำเภอวังจันทร์</option>
              <option value="อำเภอบ้านค่าย">อำเภอบ้านค่าย</option>
              <option value="อำเภอปลวกแดง">อำเภอปลวกแดง</option>
              <option value="อำเภอเขาชะเมา">อำเภอเขาชะเมา</option>
              <option value="อำเภอนิคมพัฒนา">อำเภอนิคมพัฒนา</option>
            </select>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-1 bg-[var(--bg-overlay)] rounded-lg w-fit">
          <button
            onClick={() => setGeoTab('amphoe')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              geoTab === 'amphoe'
                ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> ระดับอำเภอ ({amphoeStats.length})
          </button>
          
          <button
            onClick={() => setGeoTab('tambon')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              geoTab === 'tambon'
                ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> ระดับตำบล ({tambonStats.length})
          </button>

          <button
            onClick={() => setGeoTab('muban')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              geoTab === 'muban'
                ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> ระดับหมู่บ้าน ({mubanStats.length})
          </button>
        </div>

        {/* Tab Content rendering list of location stats */}
        <div className="overflow-hidden border border-[var(--border-light)] rounded-xl bg-[var(--bg-surface)]">
          {geoTab === 'amphoe' && (
            <div className="divide-y divide-[var(--border-light)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-4 sm:col-span-5 flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-rose-500" /> ชื่ออำเภอ</div>
                <div className="col-span-2 text-center">เกิดเหตุ</div>
                <div className="col-span-3 text-right">ผู้เดือดร้อน (คน)</div>
                <div className="col-span-3 text-right">มูลค่าเสียหาย (บาท)</div>
              </div>
              {amphoeStats.length > 0 ? (
                amphoeStats.map((item, idx) => {
                  const maxVal = Math.max(...amphoeStats.map(d => d.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={item.name} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)] transition-colors text-sm text-[var(--text-primary)]">
                      <div className="col-span-4 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {item.name}
                        </div>
                        <div className="w-full bg-[var(--bg-overlay)] rounded-full h-1.5 mt-2 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-900/50">
                          {item.count} ครั้ง
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-medium flex items-center justify-end gap-1">
                        <Users className="w-3.5 h-3.5 text-orange-500 hidden sm:inline" />
                        {item.affected.toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่มีข้อมูลภัยพิบัติจำแนกรายอำเภอ
                </div>
              )}
            </div>
          )}

          {geoTab === 'tambon' && (
            <div className="divide-y divide-[var(--border-light)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-4 sm:col-span-5 flex items-center gap-1"><Building className="w-3.5 h-3.5 text-rose-500" /> ชื่อตำบล / อำเภอ</div>
                <div className="col-span-2 text-center">เกิดเหตุ</div>
                <div className="col-span-3 text-right">ผู้เดือดร้อน (คน)</div>
                <div className="col-span-3 text-right">มูลค่าเสียหาย (บาท)</div>
              </div>
              {tambonStats.length > 0 ? (
                tambonStats.map((item, idx) => {
                  const maxVal = Math.max(...tambonStats.map(d => d.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={`${item.amphoe}-${item.name}`} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)] transition-colors text-sm text-[var(--text-primary)]">
                      <div className="col-span-4 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {item.name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] ml-3.5 mt-0.5">{item.amphoe}</div>
                        <div className="w-full bg-[var(--bg-overlay)] rounded-full h-1.5 mt-2 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-900/50">
                          {item.count} ครั้ง
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-medium flex items-center justify-end gap-1">
                        <Users className="w-3.5 h-3.5 text-orange-500 hidden sm:inline" />
                        {item.affected.toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่มีข้อมูลภัยพิบัติจำแนกรายตำบล
                </div>
              )}
            </div>
          )}

          {geoTab === 'muban' && (
            <div className="divide-y divide-[var(--border-light)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-4 sm:col-span-5 flex items-center gap-1"><Home className="w-3.5 h-3.5 text-rose-500" /> ชื่อหมู่บ้าน / ที่อยู่</div>
                <div className="col-span-2 text-center">เกิดเหตุ</div>
                <div className="col-span-3 text-right">ผู้เดือดร้อน (คน)</div>
                <div className="col-span-3 text-right">มูลค่าเสียหาย (บาท)</div>
              </div>
              {mubanStats.length > 0 ? (
                mubanStats.map((item, idx) => {
                  const maxVal = Math.max(...mubanStats.map(d => d.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={`${item.amphoe}-${item.tambon}-${item.name}`} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)] transition-colors text-sm text-[var(--text-primary)]">
                      <div className="col-span-4 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {item.name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] ml-3.5 mt-0.5">{item.tambon}, {item.amphoe}</div>
                        <div className="w-full bg-[var(--bg-overlay)] rounded-full h-1.5 mt-2 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 text-xs bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-900/50">
                          {item.count} ครั้ง
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-medium flex items-center justify-end gap-1">
                        <Users className="w-3.5 h-3.5 text-orange-500 hidden sm:inline" />
                        {item.affected.toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่มีข้อมูลภัยพิบัติจำแนกรายหมู่บ้าน
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-xl border border-[var(--border-light)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-overlay)]">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Printer className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-lg">เงื่อนไขการพิมพ์สรุปรายงาน</h2>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--border-light)] text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">ตั้งแต่ช่วงวันที่</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={printFilters.startDate}
                      onChange={(e) => setPrintFilters({...printFilters, startDate: e.target.value})}
                      className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <Calendar className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">ถึงวันที่</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={printFilters.endDate}
                      onChange={(e) => setPrintFilters({...printFilters, endDate: e.target.value})}
                      className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <Calendar className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">ประเภทภัย</label>
                  <select
                    value={printFilters.incidentType}
                    onChange={(e) => setPrintFilters({...printFilters, incidentType: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">-- ทุกประเภท --</option>
                    {filterOptions.types.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">ความรุนแรง</label>
                  <select
                    value={printFilters.severity}
                    onChange={(e) => setPrintFilters({...printFilters, severity: e.target.value})}
                    className="w-full px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">-- ทุกระดับ --</option>
                    <option value="เล็กน้อย">เล็กน้อย</option>
                    <option value="ปานกลาง">ปานกลาง</option>
                    <option value="รุนแรง">รุนแรง</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  พื้นที่เกิดภัย
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">อำเภอ</label>
                    <select
                      value={printFilters.amphoe}
                      onChange={(e) => setPrintFilters({...printFilters, amphoe: e.target.value, tambon: 'all', muban: 'all'})}
                      className="w-full px-2 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded text-[var(--text-primary)]"
                    >
                      <option value="all">-- ทุกอำเภอ --</option>
                      {filterOptions.amphoes.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">ตำบล</label>
                    <select
                      value={printFilters.tambon}
                      onChange={(e) => setPrintFilters({...printFilters, tambon: e.target.value, muban: 'all'})}
                      disabled={printFilters.amphoe === 'all'}
                      className="w-full px-2 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded text-[var(--text-primary)] disabled:opacity-50"
                    >
                      <option value="all">-- ทุกตำบล --</option>
                      {filterOptions.tambons.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">หมู่บ้าน</label>
                    <select
                      value={printFilters.muban}
                      onChange={(e) => setPrintFilters({...printFilters, muban: e.target.value})}
                      disabled={printFilters.tambon === 'all'}
                      className="w-full px-2 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded text-[var(--text-primary)] disabled:opacity-50"
                    >
                      <option value="all">-- ทุกหมู่บ้าน --</option>
                      {filterOptions.mubans.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-overlay)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setPrintFilters({
                    startDate: '', endDate: '', incidentType: 'all', amphoe: 'all', tambon: 'all', muban: 'all', severity: 'all'
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-light)] rounded-lg transition-colors"
              >
                ล้างเงื่อนไข
              </button>
              <button
                onClick={executePrint}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์รายงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
