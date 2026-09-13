import React, { useMemo } from 'react';
import { UrgentIncident } from './UrgentIncidentReportView';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Activity, Users, Home, AlertCircle } from 'lucide-react';

interface Props {
  reports: UrgentIncident[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function UrgentIncidentDashboard({ reports }: Props) {
  
  const stats = useMemo(() => {
    let totalIncidents = reports.length;
    let totalAffectedPeople = 0;
    let totalAffectedHouseholds = 0;
    let totalDamageCost = 0;

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
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5

    const severityChartData = Object.keys(severityCount).map(key => ({
      name: key,
      value: severityCount[key]
    }));

    const trendChartData = Object.keys(monthlyTrend).map(key => ({
      name: key,
      value: monthlyTrend[key]
    }));

    return {
      totalIncidents,
      totalAffectedPeople,
      totalAffectedHouseholds,
      totalDamageCost,
      typeChartData,
      severityChartData,
      trendChartData
    };
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">เหตุด่วนทั้งหมด</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalIncidents}</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Incident Types */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">5 อันดับประเภทภัยที่เกิดขึ้นบ่อย</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                <XAxis type="number" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis dataKey="name" type="category" width={100} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="จำนวนครั้ง" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">สัดส่วนระดับความรุนแรง</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.severityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {stats.severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend line */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">แนวโน้มการเกิดภัย (รายเดือน)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis tick={{fill: 'var(--text-secondary)'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="จำนวนครั้ง" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
