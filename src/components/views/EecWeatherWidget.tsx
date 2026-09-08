import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CloudRain, Thermometer, Droplets, Wind, Compass, 
  Sun, Cloud, CloudLightning, RefreshCw, MapPin, 
  AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight,
  ExternalLink, Info, Calendar, Sparkles, Activity,
  Gauge, Eye, EyeOff, ArrowUp, ArrowDown, Clock, Waves, ChevronDown, ChevronUp,
  Navigation, Zap
} from 'lucide-react';
import { EEC_PROVINCES, LiveWeatherData, getWmoWeatherInfo } from '../../data/eecLocations';
import { fetchLiveEecWeather } from '../../utils/eecWeatherService';

interface Props {
  onDraftAlertDoc?: (weatherSummary: string, location: string) => void;
  defaultExpanded?: boolean;
}

export default function EecWeatherWidget({ onDraftAlertDoc, defaultExpanded = false }: Props) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('mueang-rayong');
  const [selectedSubdistrictName, setSelectedSubdistrictName] = useState<string>('ตำบลท่าประดู่ (ศูนย์ราชการ/ตัวเมือง)');
  
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [viewTab, setViewTab] = useState<'forecast' | 'details'>('forecast');

  // Province object (Rayong)
  const rayongProvince = useMemo(() => {
    return EEC_PROVINCES.find(p => p.id === 'rayong') || EEC_PROVINCES[0];
  }, []);

  // Current District object
  const currentDistrict = useMemo(() => {
    return rayongProvince.districts.find(d => d.id === selectedDistrictId) || rayongProvince.districts[0];
  }, [rayongProvince, selectedDistrictId]);

  // Available Subdistricts
  const subdistricts = useMemo(() => {
    return currentDistrict.subdistricts || [];
  }, [currentDistrict]);

  // Fetch weather data
  const loadWeather = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await fetchLiveEecWeather('rayong', selectedDistrictId, selectedSubdistrictName);
      setWeatherData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading Rayong weather data:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedDistrictId, selectedSubdistrictName]);

  // Handle district change
  const handleDistrictChange = (distId: string) => {
    setSelectedDistrictId(distId);
    const newDist = rayongProvince.districts.find(d => d.id === distId) || rayongProvince.districts[0];
    setSelectedSubdistrictName(newDist.subdistricts[0]?.name || '');
  };

  // Quick preset shortcuts for key Rayong zones
  const quickHotspots = [
    { label: 'ศูนย์ราชการระยอง', districtId: 'mueang-rayong', subdistrict: 'ตำบลเนินพระ (ศูนย์ราชการจังหวัดระยอง)' },
    { label: 'นิคมฯ มาบตาพุด', districtId: 'mueang-rayong', subdistrict: 'ตำบลมาบตาพุด (นิคมอุตสาหกรรมมาบตาพุด)' },
    { label: 'หาดพลา / บ้านฉาง', districtId: 'ban-chang', subdistrict: 'ตำบลพลา (หาดพลา/สนามบินอู่ตะเภา)' },
    { label: 'EECi วังจันทร์วัลเลย์', districtId: 'wang-chan', subdistrict: 'ตำบลป่ายุบใน (EECi วังจันทร์วัลเลย์)' },
    { label: 'ปลวกแดง / อ่างเก็บน้ำ', districtId: 'pluak-daeng', subdistrict: 'ตำบลปลวกแดง (อ่างเก็บน้ำหนองปลาไหล)' },
    { label: 'แหลมแม่พิมพ์ แกลง', districtId: 'klaeng', subdistrict: 'ตำบลกร่ำ (อนุสาวรีย์สุนทรภู่/แหลมแม่พิมพ์)' },
  ];

  // Initial and reactive load
  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // Auto refresh interval (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadWeather(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  // Weather Icon Component
  const renderWeatherIcon = (iconType: string, sizeClass = 'w-7 h-7') => {
    switch (iconType) {
      case 'sun':
        return <Sun className={`${sizeClass} text-amber-500`} />;
      case 'cloud-rain':
        return <CloudRain className={`${sizeClass} text-sky-500`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${sizeClass} text-purple-500`} />;
      case 'cloud-drizzle':
        return <CloudRain className={`${sizeClass} text-cyan-500`} />;
      case 'wind':
        return <Wind className={`${sizeClass} text-teal-500`} />;
      default:
        return <Cloud className={`${sizeClass} text-sky-400`} />;
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      {/* 1. Header Bar: Official Identity & Real-time Connectivity */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group hover:bg-[var(--bg-elevated)]/80 transition-colors ${
          isExpanded ? 'border-b border-[var(--border-lighter)]' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs group-hover:scale-105 transition-transform">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>ข้อมูลสดเรียลไทม์</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-mono">
                อัปเดต: {weatherData?.updatedAt || lastRefreshed.toLocaleTimeString('th-TH')}
              </span>
              {!isExpanded && weatherData && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20 animate-fade-in">
                  <span>{weatherData.temperature}°C</span>
                  <span className="opacity-40">•</span>
                  <span>{weatherData.rainRate > 0 ? `ฝน ${weatherData.rainRate} มม./ชม.` : (getWmoWeatherInfo(weatherData.weatherCode)?.description || 'ปกติ')}</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-sans font-extrabold text-[var(--text-primary)]">
              ศูนย์ข้อมูลสภาพอากาศและปริมาณฝน จังหวัดระยอง
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => loadWeather()}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-light)] text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs min-h-[36px]"
            title="รีเฟรชข้อมูลสภาพอากาศสด"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรชข้อมูล</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs min-h-[36px] ${
              isExpanded 
                ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)]' 
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-blue-500/20'
            }`}
            title={isExpanded ? "ซ่อนข้อมูลสภาพอากาศ" : "แสดงข้อมูลสภาพอากาศ"}
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>ซ่อนข้อมูล</span>
                <ChevronUp className="w-4 h-4 ml-0.5" />
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>แสดงข้อมูล</span>
                <ChevronDown className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Content Body */}
      {isExpanded && (
        <>
          {/* 2. Rayong 8 Districts Quick-Selector Pills & Hotspots Ribbon */}
      <div className="px-4 py-3 sm:px-6 bg-[var(--bg-elevated)]/60 border-b border-[var(--border-lighter)] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>เลือกอำเภอตรวจวัด (8 อำเภอในจังหวัดระยอง):</span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            {currentDistrict.name} ({subdistricts.length} จุดตรวจวัด/ตำบล)
          </span>
        </div>

        {/* 8 Districts Grid (Responsive: 4 cols on mobile, 8 cols on desktop) */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5">
          {rayongProvince.districts.map((d) => {
            const isSelected = d.id === selectedDistrictId;
            return (
              <button
                key={d.id}
                onClick={() => handleDistrictChange(d.id)}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate flex items-center justify-center border min-h-[40px] ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-lighter)] hover:border-blue-500/40 hover:text-[var(--text-primary)]'
                }`}
                title={d.name}
              >
                <span>{d.name.replace('อำเภอ', 'อ.')}</span>
              </button>
            );
          })}
        </div>

        {/* Subdistrict Detailed Dropdown & Quick Hotspots */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-lighter)]">
          {/* Detailed Subdistrict Dropdown */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-[var(--text-muted)] font-semibold shrink-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>ตำบล/จุดตรวจวัด:</span>
            </span>
            <select
              value={selectedSubdistrictName}
              onChange={(e) => setSelectedSubdistrictName(e.target.value)}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs flex-1 max-w-md min-h-[36px]"
            >
              {subdistricts.map((s, idx) => (
                <option key={idx} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Hotspot Chips (Mobile-friendly horizontal scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase shrink-0">จุดสำคัญ:</span>
            {quickHotspots.map((h, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDistrictId(h.districtId);
                  setSelectedSubdistrictName(h.subdistrict);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  selectedSubdistrictName === h.subdistrict
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-lighter)] hover:border-blue-500/30'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main Weather Dashboard Content */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
        {isLoading && !weatherData ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="font-semibold text-sm">กำลังเชื่อมต่อดึงข้อมูลตรวจวัดสภาพอากาศสด จังหวัดระยอง...</span>
          </div>
        ) : weatherData ? (
          <>
            {/* Bento Grid: Hero Status Box (Left) + 4 Metrics (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
              
              {/* Main Weather Hero Card (5 Cols on large) */}
              <div className="lg:col-span-5 bg-gradient-to-br from-blue-500/10 via-[var(--bg-elevated)] to-[var(--bg-surface)] border border-blue-500/25 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{weatherData.locationName}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                      สดวันนี้
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-black font-mono text-[var(--text-primary)] tracking-tight">
                          {weatherData.temperature}°
                        </span>
                        <span className="text-lg font-bold text-[var(--text-muted)]">C</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center flex-wrap gap-1.5 sm:gap-2">
                        <span>รู้สึกเหมือน <b className="text-[var(--text-primary)]">{weatherData.apparentTemperature}°C</b></span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-rose-500 font-mono font-semibold">
                          <ArrowUp className="w-3 h-3" />{weatherData.tempMax}°
                        </span>
                        <span className="flex items-center gap-0.5 text-sky-500 font-mono font-semibold">
                          <ArrowDown className="w-3 h-3" />{weatherData.tempMin}°
                        </span>
                      </div>
                    </div>

                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner shrink-0">
                      {renderWeatherIcon(weatherData.weatherIconType, 'w-8 h-8 sm:w-9 sm:h-9')}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-blue-500/15">
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {weatherData.weatherDescription}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center flex-wrap gap-2">
                      <span className="flex items-center gap-1">
                        <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                        <span>โอกาสฝน: <b className="text-blue-600 dark:text-blue-400 font-mono">{weatherData.precipitationProbability}%</b></span>
                      </span>
                      <span>•</span>
                      <span>เมฆปกคลุม: <b className="font-mono">{weatherData.cloudCover}%</b></span>
                    </div>
                  </div>
                </div>

                {/* Risk Level Badge Footer */}
                <div className="mt-3.5 pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">เกณฑ์เตือนภัย ปภ.:</span>
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${weatherData.rainWarningColor}`}>
                    {weatherData.rainCategoryLabel}
                  </span>
                </div>
              </div>

              {/* 4 Core Parameter Cards (7 Cols on large / 2x2 Grid) */}
              <div className="lg:col-span-7 grid grid-cols-2 gap-2.5 sm:gap-3.5">
                
                {/* Metric 1: ปริมาณน้ำฝน */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-blue-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-1 sm:gap-1.5 truncate">
                      <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>ฝนสะสม 24 ชม.</span>
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">TMD</span>
                  </div>
                  <div className="my-1.5 sm:my-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                        {weatherData.precipitationSum}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)]">มม.</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 flex justify-between">
                      <span className="text-[var(--text-muted)]">อัตราฝน:</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{weatherData.rainRate} มม./ชม.</span>
                    </div>
                  </div>
                  {/* Rain Progress / Meter */}
                  <div className="w-full bg-[var(--bg-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--border-lighter)]">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(5, (weatherData.precipitationSum / 90) * 100))}%` }} 
                    />
                  </div>
                </div>

                {/* Metric 2: ความชื้นสัมพัทธ์ */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    <span className="flex items-center gap-1 sm:gap-1.5 truncate">
                      <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>ความชื้นสัมพัทธ์</span>
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded shrink-0">RH%</span>
                  </div>
                  <div className="my-1.5 sm:my-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                        {weatherData.relativeHumidity}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)]">%</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 flex justify-between">
                      <span className="text-[var(--text-muted)]">Dew Point:</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{weatherData.dewPoint}°C</span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--bg-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--border-lighter)]">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${weatherData.relativeHumidity}%` }} 
                    />
                  </div>
                </div>

                {/* Metric 3: ความเร็ว & ทิศทางลม */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1 sm:gap-1.5 truncate">
                      <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>ความเร็ว & ทิศลม</span>
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">10m</span>
                  </div>
                  <div className="my-1.5 sm:my-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                        {weatherData.windSpeed}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)]">กม./ชม.</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 flex justify-between">
                      <span className="text-[var(--text-muted)]">ทิศทาง:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[80px] sm:max-w-none">{weatherData.windDirectionText}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono flex justify-between">
                    <span>ลมกระโชก:</span>
                    <span>{weatherData.windGusts} กม./ชม.</span>
                  </div>
                </div>

                {/* Metric 4: ดัชนี UV & ความกดอากาศ */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1 sm:gap-1.5 truncate">
                      <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>ความกดอากาศ/UV</span>
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">hPa</span>
                  </div>
                  <div className="my-1.5 sm:my-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                        {weatherData.surfacePressure}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)]">hPa</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] mt-0.5 flex justify-between">
                      <span className="text-[var(--text-muted)]">ดัชนี UV:</span>
                      <span className="font-mono font-bold text-amber-500">{weatherData.uvIndex}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono flex justify-between">
                    <span>ระดับผิวน้ำทะเล:</span>
                    <span>ปกติ</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. 7-Day Forecast (Responsive Carousel on Mobile / 7-Cols on Desktop) */}
            {weatherData.daily.time && weatherData.daily.time.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>พยากรณ์อากาศ 7 วันล่วงหน้า ({weatherData.district} จ.ระยอง)</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] hidden sm:inline">
                    TMD Rayong Forecast Model
                  </span>
                </div>

                {/* Horizontal Scroll on Mobile, Grid on Large Screen */}
                <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 lg:grid lg:grid-cols-7 scrollbar-none snap-x">
                  {weatherData.daily.time.slice(0, 7).map((dayStr, idx) => {
                    const dateObj = new Date(dayStr);
                    const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                    const dayName = idx === 0 ? 'วันนี้' : `${thaiDays[dateObj.getDay()]} ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                    const tMax = weatherData.daily.tempMax[idx] !== undefined ? Math.round(weatherData.daily.tempMax[idx]) : 32;
                    const tMin = weatherData.daily.tempMin[idx] !== undefined ? Math.round(weatherData.daily.tempMin[idx]) : 25;
                    const rainSum = weatherData.daily.precipitationSum[idx] !== undefined ? weatherData.daily.precipitationSum[idx] : 0;
                    const rainProb = weatherData.daily.precipitationProbabilityMax[idx] !== undefined ? weatherData.daily.precipitationProbabilityMax[idx] : 30;
                    const wCode = weatherData.daily.weatherCode[idx] ?? 2;
                    const wInfo = getWmoWeatherInfo(wCode);

                    return (
                      <div 
                        key={idx} 
                        className={`min-w-[110px] sm:min-w-[125px] lg:min-w-0 p-3 rounded-xl border text-center transition-all flex flex-col justify-between snap-start shrink-0 lg:shrink ${
                          idx === 0 
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-1 ring-blue-500/20' 
                            : 'bg-[var(--bg-elevated)] border-[var(--border-lighter)] text-[var(--text-secondary)] hover:border-blue-500/30'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{dayName}</div>
                        <div className="my-2 flex justify-center">
                          {renderWeatherIcon(wInfo.iconType, 'w-6 h-6')}
                        </div>
                        <div className="text-xs font-mono font-bold">
                          <span className="text-[var(--text-primary)]">{tMax}°</span>
                          <span className="text-[var(--text-muted)] text-[10px] ml-1">{tMin}°</span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-[var(--border-lighter)] text-[10px] font-mono flex items-center justify-center gap-1">
                          <CloudRain className="w-3 h-3 text-blue-500" />
                          <span>{rainProb}% <span className="text-[var(--text-muted)]">({rainSum}มม.)</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Footer Metadata & Institutional Verification */}
            <div className="pt-3 border-t border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--text-muted)] gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{weatherData.stationSource}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border border-emerald-500/20">
                  ตรวจวัดอัตโนมัติทุก 3 นาที
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
        </>
      )}
    </div>
  );
}
