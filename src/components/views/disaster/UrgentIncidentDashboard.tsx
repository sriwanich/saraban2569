import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { UrgentIncident } from './UrgentIncidentReportView';
import { 
  Activity, Users, Home, AlertCircle, Skull, HeartPulse, 
  ShieldAlert, BarChart3, PieChart as PieIcon, TrendingUp, 
  MapPin, Navigation, Landmark, Building, Printer, X, 
  Filter, Calendar, Search, RefreshCw, Layers, Award,
  ArrowUpRight, Flame, ChevronRight
} from 'lucide-react';
import { parseLocationString } from '../../../utils/locationParser';
import { parseDateFromDocString } from '../../../utils/thaiDateUtils';

interface Props {
  reports: UrgentIncident[];
  user?: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; color: string; border: string; label: string }> = {
  'เล็กน้อย': { 
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    color: '#10b981', 
    border: 'border-emerald-500/30',
    label: 'เล็กน้อย (Minor)'
  },
  'ปานกลาง': { 
    bg: 'bg-amber-500/10 dark:bg-amber-500/20', 
    text: 'text-amber-700 dark:text-amber-300', 
    color: '#f59e0b', 
    border: 'border-amber-500/30',
    label: 'ปานกลาง (Moderate)'
  },
  'รุนแรง': { 
    bg: 'bg-red-500/10 dark:bg-red-500/20', 
    text: 'text-red-700 dark:text-red-300', 
    color: '#ef4444', 
    border: 'border-red-500/30',
    label: 'รุนแรง (Severe)'
  }
};

export default function UrgentIncidentDashboard({ reports, user }: Props) {
  // Global dashboard filter states
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedAmphoeFilter, setSelectedAmphoeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '30days' | 'thisYear'>('all');

  // Geo drilldown state
  const [geoTab, setGeoTab] = useState<'amphoe' | 'tambon' | 'muban'>('amphoe');
  const [geoSearchTerm, setGeoSearchTerm] = useState<string>('');

  // Print Modal State
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

  // Base processed records with Location parsing
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

  // Dashboard filtered reports based on user filter controls
  const filteredReports = useMemo(() => {
    return reportsWithGeo.filter(r => {
      if (selectedIncidentType !== 'all') {
        if (!r.incidentTypes || !r.incidentTypes.includes(selectedIncidentType)) return false;
      }
      if (selectedSeverity !== 'all') {
        if (r.severity !== selectedSeverity) return false;
      }
      if (selectedAmphoeFilter !== 'all') {
        if (r.amphoe !== selectedAmphoeFilter) return false;
      }
      if (dateRangeFilter !== 'all') {
        const docDateObj = parseDateFromDocString(r.docDate, r.startDate) || (r.createdAt ? new Date(r.createdAt) : null);
        if (docDateObj) {
          const now = new Date();
          if (dateRangeFilter === '30days') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            if (docDateObj < thirtyDaysAgo) return false;
          } else if (dateRangeFilter === 'thisYear') {
            if (docDateObj.getFullYear() !== now.getFullYear()) return false;
          }
        }
      }
      return true;
    });
  }, [reportsWithGeo, selectedIncidentType, selectedSeverity, selectedAmphoeFilter, dateRangeFilter]);

  // Aggregated Statistics for KPIs and Charts
  const stats = useMemo(() => {
    const totalIncidents = filteredReports.length;
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

    filteredReports.forEach(r => {
      const toNum = (val: string | number | undefined) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const arabicStr = String(val).replace(/[๐-๙]/g, match => '๐๑๒๓๔๕๖๗๘๙'.indexOf(match).toString());
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

    const severityChartData = Object.keys(severityCount).map(key => ({
      name: key,
      value: severityCount[key]
    }));

    const trendChartData = Object.keys(monthlyTrend).map(key => ({
      name: key,
      value: monthlyTrend[key]
    }));
    
    const damageBreakdownData = [
      { name: 'สิ่งก่อสร้าง/อาคารบ้านเรือน', value: totalDamageBuilding, itemStyle: { color: '#3b82f6' } },
      { name: 'ด้านการเกษตร/ประมง/ปศุสัตว์', value: totalDamageAgriculture, itemStyle: { color: '#10b981' } },
      { name: 'สิ่งสาธารณประโยชน์', value: totalDamagePublic, itemStyle: { color: '#8b5cf6' } }
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
      severityChartData,
      trendChartData,
      damageBreakdownData,
      totalDamageBreakdownSum
    };
  }, [filteredReports]);

  // All available unique incident types & Amphoes for filter dropdowns
  const availableFilterOptions = useMemo(() => {
    const typesSet = new Set<string>();
    const amphoeSet = new Set<string>();
    reportsWithGeo.forEach(r => {
      if (Array.isArray(r.incidentTypes)) {
        r.incidentTypes.forEach(t => typesSet.add(t));
      }
      if (r.amphoe && r.amphoe !== 'ไม่ระบุอำเภอ') amphoeSet.add(r.amphoe);
    });
    return {
      types: Array.from(typesSet).sort(),
      amphoes: Array.from(amphoeSet).sort()
    };
  }, [reportsWithGeo]);

  // Geographical Stats Calculations (Amphoe, Tambon, Muban)
  const amphoeStats = useMemo(() => {
    const statsMap: Record<string, { name: string; count: number; affected: number; damage: number }> = {};
    filteredReports.forEach(r => {
      const amp = r.amphoe;
      const toNum = (val: any) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[amp]) {
        statsMap[amp] = { name: amp, count: 0, affected: 0, damage: 0 };
      }
      statsMap[amp].count += 1;
      statsMap[amp].affected += toNum(r.affectedPeople);
      statsMap[amp].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap)
      .filter(item => !geoSearchTerm || item.name.toLowerCase().includes(geoSearchTerm.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports, geoSearchTerm]);

  const tambonStats = useMemo(() => {
    const statsMap: Record<string, { name: string; amphoe: string; count: number; affected: number; damage: number }> = {};
    filteredReports.forEach(r => {
      const key = `${r.amphoe}-${r.tambon}`;
      const toNum = (val: any) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[key]) {
        statsMap[key] = { name: r.tambon, amphoe: r.amphoe, count: 0, affected: 0, damage: 0 };
      }
      statsMap[key].count += 1;
      statsMap[key].affected += toNum(r.affectedPeople);
      statsMap[key].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap)
      .filter(item => !geoSearchTerm || item.name.toLowerCase().includes(geoSearchTerm.toLowerCase()) || item.amphoe.toLowerCase().includes(geoSearchTerm.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports, geoSearchTerm]);

  const mubanStats = useMemo(() => {
    const statsMap: Record<string, { name: string; tambon: string; amphoe: string; count: number; affected: number; damage: number }> = {};
    filteredReports.forEach(r => {
      const key = `${r.amphoe}-${r.tambon}-${r.muban}`;
      const toNum = (val: any) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      if (!statsMap[key]) {
        statsMap[key] = { name: r.muban, tambon: r.tambon, amphoe: r.amphoe, count: 0, affected: 0, damage: 0 };
      }
      statsMap[key].count += 1;
      statsMap[key].affected += toNum(r.affectedPeople);
      statsMap[key].damage += toNum(r.totalDamageCost);
    });
    return Object.values(statsMap)
      .filter(item => !geoSearchTerm || item.name.toLowerCase().includes(geoSearchTerm.toLowerCase()) || item.tambon.toLowerCase().includes(geoSearchTerm.toLowerCase()) || item.amphoe.toLowerCase().includes(geoSearchTerm.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports, geoSearchTerm]);

  // ECharts Configurations

  // 1. Incident Types Bar Chart
  const incidentTypeChartOption = useMemo(() => {
    const categories = stats.typeChartData.slice(0, 8).map(d => d.name).reverse();
    const values = stats.typeChartData.slice(0, 8).map(d => d.value).reverse();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          return `<div class="p-1.5 font-sans"><span class="font-bold text-gray-800">${params[0].name}</span><br/><span class="text-blue-600 font-bold">${params[0].value} ครั้ง</span></div>`;
        }
      },
      grid: { top: 15, right: 30, bottom: 25, left: 120, containLabel: false },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(150, 150, 150, 0.15)', type: 'dashed' } },
        axisLabel: { fontSize: 11, color: '#888' }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: '#666',
          formatter: (value: string) => value.length > 14 ? value.slice(0, 14) + '...' : value
        }
      },
      series: [
        {
          name: 'จำนวนเหตุ',
          type: 'bar',
          data: values,
          barWidth: 16,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#60a5fa' }
              ]
            }
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#3b82f6'
          }
        }
      ]
    };
  }, [stats.typeChartData]);

  // 2. Damage Cost Breakdown Donut Chart
  const damageDonutChartOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<div class="p-1 font-sans"><span class="font-bold">${params.name}</span><br/><b>${params.value.toLocaleString()} บาท</b> (${params.percent}%)</div>`;
        }
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#888' }
      },
      series: [
        {
          name: 'มูลค่าความเสียหาย',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold',
              formatter: '{b}\n{d}%'
            }
          },
          data: stats.damageBreakdownData
        }
      ]
    };
  }, [stats.damageBreakdownData]);

  // 3. Monthly Trend Smooth Area Chart
  const trendLineChartOption = useMemo(() => {
    const dates = stats.trendChartData.map(d => d.name);
    const counts = stats.trendChartData.map(d => d.value);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#10b981', width: 1.5, type: 'dashed' } },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          return `<div class="p-1.5 font-sans"><span class="font-bold text-gray-800">${params[0].name}</span><br/><span class="text-emerald-600 font-bold">${params[0].value} ครั้ง</span></div>`;
        }
      },
      grid: { top: 20, right: 20, bottom: 25, left: 35, containLabel: false },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(150, 150, 150, 0.2)' } },
        axisLabel: { fontSize: 10, color: '#888' }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(150, 150, 150, 0.1)', type: 'dashed' } },
        axisLabel: { fontSize: 10, color: '#888' }
      },
      series: [
        {
          name: 'จำนวนเหตุด่วน',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3, color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
              ]
            }
          },
          data: counts
        }
      ]
    };
  }, [stats.trendChartData]);

  // 4. Top Amphoe Hotspots Chart
  const topAmphoeChartOption = useMemo(() => {
    const top5 = amphoeStats.slice(0, 6);
    const names = top5.map(d => d.name);
    const counts = top5.map(d => d.count);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { top: 20, right: 20, bottom: 30, left: 90, containLabel: false },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(150, 150, 150, 0.1)', type: 'dashed' } },
        axisLabel: { fontSize: 10, color: '#888' }
      },
      yAxis: {
        type: 'category',
        data: names.reverse(),
        axisLabel: { fontSize: 11, color: '#666' }
      },
      series: [
        {
          name: 'เกิดเหตุ (ครั้ง)',
          type: 'bar',
          data: counts.reverse(),
          barWidth: 14,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: '#f59e0b'
          }
        }
      ]
    };
  }, [amphoeStats]);

  // Print Summary Generator
  const executePrint = () => {
    const printFiltered = reportsWithGeo.filter(r => {
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
    printFiltered.forEach(r => {
      const toNum = (val: any) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString()).replace(/,/g, ''));
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
          @page { size: A4 landscape; margin: 12mm; }
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
          พบข้อมูลจำนวน ${printFiltered.length} ครั้ง | 
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
            ${printFiltered.length > 0 ? printFiltered.map((r, idx) => {
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
    fetch('/api/logs', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        action: 'VIEW_URGENT_INCIDENT_SUMMARY', 
        details: 'พิมพ์สรุปรายงานตารางเหตุด่วนสาธารณภัย', 
        username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' 
      }) 
    }).catch(console.error);
    
    setIsPrintModalOpen(false);
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Filter Control Toolbar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-600/15 via-amber-500/10 to-blue-500/10 border border-red-500/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-red-500 text-white rounded-xl shadow-md shadow-red-500/20 shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] font-sans">
                แดชบอร์ดสรุปรายงานเหตุด่วนสาธารณภัย
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              สรุปสถิติ ผลกระทบ ผู้บาดเจ็บ/เสียชีวิต มูลค่าความเสียหาย และการกระจายตัวเชิงพื้นที่
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สรุปรายงานตาราง</span>
          </button>
        </div>
      </motion.div>

      {/* Filter Control Toolbar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold shrink-0">
          <Filter className="w-4 h-4 text-amber-500" />
          <span>ตัวกรองข้อมูล:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          {/* Incident Type Filter */}
          <select
            value={selectedIncidentType}
            onChange={(e) => setSelectedIncidentType(e.target.value)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">ทุกประเภทภัย</option>
            {availableFilterOptions.types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">ทุกระดับความรุนแรง</option>
            <option value="เล็กน้อย">เล็กน้อย</option>
            <option value="ปานกลาง">ปานกลาง</option>
            <option value="รุนแรง">รุนแรง</option>
          </select>

          {/* Amphoe Filter */}
          <select
            value={selectedAmphoeFilter}
            onChange={(e) => setSelectedAmphoeFilter(e.target.value)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">ทุกอำเภอ</option>
            {availableFilterOptions.amphoes.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Time Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">ทุกช่วงเวลา</option>
            <option value="30days">30 วันล่าสุด</option>
            <option value="thisYear">ปีนี้ (พ.ศ. นี้)</option>
          </select>
        </div>

        {(selectedIncidentType !== 'all' || selectedSeverity !== 'all' || selectedAmphoeFilter !== 'all' || dateRangeFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSelectedIncidentType('all');
              setSelectedSeverity('all');
              setSelectedAmphoeFilter('all');
              setDateRangeFilter('all');
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ล้างตัวกรอง</span>
          </button>
        )}
      </div>

      {/* 2. Primary Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">เหตุด่วนทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-[var(--text-primary)] font-mono">
                {stats.totalIncidents.toLocaleString()}
              </h3>
              <span className="text-xs font-bold text-red-500">ครั้ง</span>
            </div>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Total Affected People */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">ผู้ได้รับผลกระทบ</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-[var(--text-primary)] font-mono">
                {stats.totalAffectedPeople.toLocaleString()}
              </h3>
              <span className="text-xs font-bold text-orange-500">คน</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">
              เดือดร้อน {stats.totalAffectedHouseholds.toLocaleString()} ครัวเรือน
            </p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Total Damage Cost */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">ประมาณการความเสียหาย</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {stats.totalDamageCost.toLocaleString()}
              </h3>
              <span className="text-xs font-bold text-emerald-600">บาท</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Casualties summary widget */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-2 w-full">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">ผู้บาดเจ็บ / เสียชีวิต</span>
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1 text-red-600 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                <Skull className="w-3.5 h-3.5" />
                <span>เสียชีวิต {stats.totalDead}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>บาดเจ็บ {stats.totalInjured}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Main Analytics ECharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Incident Types Breakdown Bar Chart */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                สถิติการเกิดภัยแยกตามประเภท (ครั้ง)
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {stats.typeChartData.length} ประเภท
            </span>
          </div>

          {stats.typeChartData.length > 0 ? (
            <ReactECharts 
              option={incidentTypeChartOption} 
              style={{ height: '260px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
              ไม่พบข้อมูลสถิติประเภทภัย
            </div>
          )}
        </div>

        {/* Chart 2: Damage Cost Breakdown Donut Chart */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                สัดส่วนมูลค่าความเสียหาย (บาท)
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              รวม {stats.totalDamageBreakdownSum.toLocaleString()} ฿
            </span>
          </div>

          {stats.damageBreakdownData.length > 0 ? (
            <ReactECharts 
              option={damageDonutChartOption} 
              style={{ height: '260px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
              ไม่มีข้อมูลมูลค่าความเสียหาย
            </div>
          )}
        </div>

        {/* Chart 3: Severity Breakdown & Status Cards */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                ระดับความรุนแรงของภัย
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              รวม {stats.totalIncidents} ครั้ง
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.severityChartData.map(item => {
              const conf = SEVERITY_CONFIG[item.name] || SEVERITY_CONFIG['เล็กน้อย'];
              const pct = stats.totalIncidents > 0 ? Math.round((item.value / stats.totalIncidents) * 100) : 0;
              return (
                <div key={item.name} className={`border ${conf.border} ${conf.bg} rounded-xl p-4 flex flex-col justify-between space-y-2`}>
                  <div>
                    <span className={`text-xs font-bold ${conf.text}`}>{conf.label}</span>
                    <h4 className={`text-2xl font-extrabold ${conf.text} font-mono mt-1`}>
                      {item.value.toLocaleString()} <span className="text-xs font-semibold">ครั้ง</span>
                    </h4>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                      <span>สัดส่วน</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-white/40 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: conf.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Monthly Trend Smooth Area Chart */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                แนวโน้มการรายงานเหตุด่วน (รายเดือน)
              </h3>
            </div>
          </div>

          {stats.trendChartData.length > 0 ? (
            <ReactECharts 
              option={trendLineChartOption} 
              style={{ height: '230px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-[var(--text-muted)]">
              ยังไม่มีข้อมูลแนวโน้มรายเดือน
            </div>
          )}
        </div>
      </div>

      {/* 4. Spatial & Geographic Disaster Analytics */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-lighter)] pb-4 gap-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              วิเคราะห์เจาะลึกพื้นที่เกิดภัยพิบัติ (Spatial Analytics)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              วิเคราะห์ความถี่เหตุด่วน ผู้ได้รับผลกระทบ และมูลค่าความเสียหายจำแนกรายอำเภอ ตำบล และหมู่บ้าน
            </p>
          </div>

          {/* Search Location Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="ค้นหาชื่ออำเภอ / ตำบล / หมู่บ้าน..."
              value={geoSearchTerm}
              onChange={(e) => setGeoSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Level Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-lighter)] pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setGeoTab('amphoe')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              geoTab === 'amphoe'
                ? 'bg-blue-500 text-white shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>ระดับอำเภอ ({amphoeStats.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setGeoTab('tambon')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              geoTab === 'tambon'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>ระดับตำบล ({tambonStats.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setGeoTab('muban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              geoTab === 'muban'
                ? 'bg-violet-500 text-white shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>ระดับหมู่บ้าน ({mubanStats.length})</span>
          </button>
        </div>

        {/* Tab Content Tables / Mobile Cards */}
        <div className="overflow-hidden border border-[var(--border-light)] rounded-xl bg-[var(--bg-surface)]">
          {geoTab === 'amphoe' && (
            <div className="divide-y divide-[var(--border-lighter)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-5 sm:col-span-5 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-red-500" />
                  <span>ชื่ออำเภอ</span>
                </div>
                <div className="col-span-3 text-center">ความถี่การเกิดเหตุ</div>
                <div className="col-span-2 text-right">ผู้เดือดร้อน (คน)</div>
                <div className="col-span-2 text-right">เสียหาย (บาท)</div>
              </div>

              {amphoeStats.length > 0 ? (
                amphoeStats.map((item, idx) => {
                  const maxVal = Math.max(...amphoeStats.map(d => d.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <div key={item.name} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)]/60 transition-colors text-xs text-[var(--text-primary)]">
                      <div className="col-span-5 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="w-full bg-[var(--bg-overlay)] rounded-full h-1.5 mt-2 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>

                      <div className="col-span-3 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 text-xs bg-red-500/10 text-red-600 rounded-full border border-red-500/20 font-mono">
                          {item.count} ครั้ง
                        </span>
                      </div>

                      <div className="col-span-2 text-right font-semibold font-mono">
                        {item.affected.toLocaleString()}
                      </div>

                      <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่พบข้อมูลตามคำค้นหา
                </div>
              )}
            </div>
          )}

          {geoTab === 'tambon' && (
            <div className="divide-y divide-[var(--border-lighter)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-5 sm:col-span-5 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ตำบล / อำเภอ</span>
                </div>
                <div className="col-span-3 text-center">ความถี่เกิดเหตุ</div>
                <div className="col-span-2 text-right">ผู้เดือดร้อน</div>
                <div className="col-span-2 text-right">เสียหาย (บาท)</div>
              </div>

              {tambonStats.length > 0 ? (
                tambonStats.map((item, idx) => {
                  const maxVal = Math.max(...tambonStats.map(d => d.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <div key={`${item.amphoe}-${item.name}`} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)]/60 transition-colors text-xs text-[var(--text-primary)]">
                      <div className="col-span-5 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] ml-4">{item.amphoe}</div>
                      </div>

                      <div className="col-span-3 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 font-mono">
                          {item.count} ครั้ง
                        </span>
                      </div>

                      <div className="col-span-2 text-right font-semibold font-mono">
                        {item.affected.toLocaleString()}
                      </div>

                      <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่พบข้อมูลตามคำค้นหา
                </div>
              )}
            </div>
          )}

          {geoTab === 'muban' && (
            <div className="divide-y divide-[var(--border-lighter)]">
              <div className="grid grid-cols-12 bg-[var(--bg-overlay)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                <div className="col-span-5 sm:col-span-5 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-violet-500" />
                  <span>หมู่บ้าน / ตำบล</span>
                </div>
                <div className="col-span-3 text-center">ความถี่เกิดเหตุ</div>
                <div className="col-span-2 text-right">ผู้เดือดร้อน</div>
                <div className="col-span-2 text-right">เสียหาย (บาท)</div>
              </div>

              {mubanStats.length > 0 ? (
                mubanStats.map((item, idx) => {
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <div key={`${item.amphoe}-${item.tambon}-${item.name}`} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[var(--bg-overlay)]/60 transition-colors text-xs text-[var(--text-primary)]">
                      <div className="col-span-5 sm:col-span-5 pr-2">
                        <div className="font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] ml-4">{item.tambon}, {item.amphoe}</div>
                      </div>

                      <div className="col-span-3 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 text-xs bg-violet-500/10 text-violet-600 rounded-full border border-violet-500/20 font-mono">
                          {item.count} ครั้ง
                        </span>
                      </div>

                      <div className="col-span-2 text-right font-semibold font-mono">
                        {item.affected.toLocaleString()}
                      </div>

                      <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                        {item.damage.toLocaleString()} ฿
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  ไม่พบข้อมูลตามคำค้นหา
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Print Modal */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-xl border border-[var(--border-light)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-overlay)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Printer className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-base">เงื่อนไขการพิมพ์สรุปรายงานเหตุด่วน</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--border-light)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[var(--text-secondary)]">ตั้งแต่วันที่</label>
                    <input 
                      type="date" 
                      value={printFilters.startDate}
                      onChange={(e) => setPrintFilters({...printFilters, startDate: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[var(--text-secondary)]">ถึงวันที่</label>
                    <input 
                      type="date" 
                      value={printFilters.endDate}
                      onChange={(e) => setPrintFilters({...printFilters, endDate: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[var(--text-secondary)]">ประเภทภัย</label>
                    <select
                      value={printFilters.incidentType}
                      onChange={(e) => setPrintFilters({...printFilters, incidentType: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none"
                    >
                      <option value="all">-- ทุกประเภท --</option>
                      {availableFilterOptions.types.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[var(--text-secondary)]">ความรุนแรง</label>
                    <select
                      value={printFilters.severity}
                      onChange={(e) => setPrintFilters({...printFilters, severity: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none"
                    >
                      <option value="all">-- ทุกระดับ --</option>
                      <option value="เล็กน้อย">เล็กน้อย</option>
                      <option value="ปานกลาง">ปานกลาง</option>
                      <option value="รุนแรง">รุนแรง</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 border border-[var(--border-light)] rounded-xl bg-[var(--bg-overlay)]/50 space-y-3">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span>กรองพื้นที่เกิดเหตุ</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">อำเภอ</label>
                      <select
                        value={printFilters.amphoe}
                        onChange={(e) => setPrintFilters({...printFilters, amphoe: e.target.value, tambon: 'all', muban: 'all'})}
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)]"
                      >
                        <option value="all">-- ทุกอำเภอ --</option>
                        {availableFilterOptions.amphoes.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">ตำบล</label>
                      <select
                        value={printFilters.tambon}
                        onChange={(e) => setPrintFilters({...printFilters, tambon: e.target.value, muban: 'all'})}
                        disabled={printFilters.amphoe === 'all'}
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] disabled:opacity-50"
                      >
                        <option value="all">-- ทุกตำบล --</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">หมู่บ้าน</label>
                      <select
                        value={printFilters.muban}
                        onChange={(e) => setPrintFilters({...printFilters, muban: e.target.value})}
                        disabled={printFilters.tambon === 'all'}
                        className="w-full px-2 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] disabled:opacity-50"
                      >
                        <option value="all">-- ทุกหมู่บ้าน --</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-overlay)] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrintFilters({
                      startDate: '', endDate: '', incidentType: 'all', amphoe: 'all', tambon: 'all', muban: 'all', severity: 'all'
                    });
                  }}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--border-light)] rounded-xl transition-colors cursor-pointer"
                >
                  ล้างเงื่อนไข
                </button>
                <button
                  type="button"
                  onClick={executePrint}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายงาน</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
