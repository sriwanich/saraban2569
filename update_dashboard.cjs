const fs = require('fs');

const content = `import React, { useMemo } from 'react';
import { UrgentIncident } from './UrgentIncidentReportView';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Activity, Users, Home, AlertCircle, Skull, HeartPulse, Building2, Trees, Landmark } from 'lucide-react';

interface Props {
  reports: UrgentIncident[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const SEVERITY_COLORS = { 'เล็กน้อย': '#22c55e', 'ปานกลาง': '#f97316', 'รุนแรง': '#ef4444' };

export default function UrgentIncidentDashboard({ reports }: Props) {
  
  const stats = useMemo(() => {
    let totalIncidents = reports.length;
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
      // Parse numbers (handling Thai numerals and commas if they exist)
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

      r.incidentTypes.forEach(t => {
        incidentTypeCount[t] = (incidentTypeCount[t] || 0) + 1;
      });

      if (severityCount[r.severity] !== undefined) {
        severityCount[r.severity] += 1;
      }

      // Trend by month (using docDate or createdAt)
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('th-TH', { month: 'short', year: '2-digit' }) : 'ไม่ระบุ';
      monthlyTrend[dateStr] = (monthlyTrend[dateStr] || 0) + 1;
    });

    const typeChartData = Object.keys(incidentTypeCount)
      .map(key => ({ name: key, value: incidentTypeCount[key] }))
      .sort((a, b) => b.value - a.value); // All types sorted

    const severityChartData = Object.keys(severityCount).map(key => ({
      name: key,
      value: severityCount[key]
    }));

    const trendChartData = Object.keys(monthlyTrend).map(key => ({
      name: key,
      value: monthlyTrend[key]
    }));
    
    const casualtiesData = [
      { name: 'เสียชีวิต', value: totalDead, fill: '#ef4444' },
      { name: 'บาดเจ็บ', value: totalInjured, fill: '#f97316' },
      { name: 'สูญหาย', value: totalMissing, fill: '#64748b' }
    ].filter(d => d.value > 0);
    
    const damageBreakdownData = [
      { name: 'สิ่งก่อสร้าง/บ้านเรือน', value: totalDamageBuilding, fill: '#3b82f6' },
      { name: 'การเกษตร', value: totalDamageAgriculture, fill: '#22c55e' },
      { name: 'สาธารณประโยชน์', value: totalDamagePublic, fill: '#8b5cf6' }
    ].filter(d => d.value > 0);

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
      casualtiesData,
      damageBreakdownData
    };
  }, [reports]);

  return (
    <div className="space-y-6">
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
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">ผู้เสียชีวิตรวม</p>
            <h3 className="text-xl font-bold text-rose-800 dark:text-rose-200">{stats.totalDead.toLocaleString()} <span className="text-sm font-normal">คน</span></h3>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">ผู้บาดเจ็บรวม</p>
            <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200">{stats.totalInjured.toLocaleString()} <span className="text-sm font-normal">คน</span></h3>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">ผู้สูญหายรวม</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{stats.totalMissing.toLocaleString()} <span className="text-sm font-normal">คน</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Types Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">สถิติการเกิดภัยแยกตามประเภท (ครั้ง)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                <XAxis type="number" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: 'var(--text-secondary)', fontSize: 13}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" name="จำนวนครั้งที่เกิดภัย">
                  {stats.typeChartData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Damage Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">สัดส่วนมูลค่าความเสียหาย (บาท)</h3>
          <div className="h-80">
            {stats.damageBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.damageBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? \`\${name} \${(percent * 100).toFixed(0)}%\` : ''}
                  >
                    {stats.damageBreakdownData.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString() + ' บาท', 'มูลค่าความเสียหาย']}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">ไม่มีข้อมูลความเสียหาย</div>
            )}
          </div>
        </div>
        
        {/* Severity Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">ระดับความรุนแรงของภัย</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.severityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => percent > 0 ? \`\${name} \${(percent * 100).toFixed(0)}%\` : ''}
                >
                  {stats.severityChartData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend line */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">แนวโน้มการรายงานเหตุด่วน (รายเดือน)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis tick={{fill: 'var(--text-secondary)'}} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" name="จำนวนรายงาน" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/views/disaster/UrgentIncidentDashboard.tsx', content, 'utf8');
