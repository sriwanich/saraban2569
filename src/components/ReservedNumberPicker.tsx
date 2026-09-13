import React, { useState, useMemo } from 'react';
import { 
  Bookmark, X, Search, Filter, Calendar, Sparkles, Check, 
  ChevronRight, LayoutGrid, List, Maximize2, Minimize2, 
  Clock, Hash, Building2, User, Info, AlertCircle, RefreshCw
} from 'lucide-react';
import { ReservedNumber, formatThaiDateString } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reservedNumbers: ReservedNumber[];
  currentDocTypeLabel: string;
  currentSpecificDocType: string;
  selectedId: number | null;
  onSelect: (item: ReservedNumber) => void;
}

export default function ReservedNumberPicker({
  isOpen,
  onClose,
  reservedNumbers,
  currentDocTypeLabel,
  currentSpecificDocType,
  selectedId,
  onSelect
}: Props) {
  const [filterType, setFilterType] = useState<string>(currentSpecificDocType || 'ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('available');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const filteredNumbers = useMemo(() => {
    return reservedNumbers.filter(item => {
      // Status Filter
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      
      // Type Filter
      if (filterType !== 'ALL') {
        const itemType = item.docType || '';
        const isTypeMatch = (target: string) => {
          if (target === 'หนังสือส่ง' || target === 'หนังสือภายนอก') {
            return itemType === 'หนังสือส่ง' || itemType === 'หนังสือภายนอก';
          }
          if (target === 'หนังสือรับ') {
            return itemType === 'หนังสือรับ' || itemType === 'หนังสือเข้า';
          }
          return itemType === target;
        };
        if (!isTypeMatch(filterType)) return false;
      }
      
      // Date Filter
      if (filterDate) {
        const itemDate = (item.reservedDate || item.createdAt || '').split('T')[0];
        if (itemDate !== filterDate) return false;
      }

      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const numStr = (item.numberString || '').toLowerCase();
        const byStr = (item.reservedBy || '').toLowerCase();
        const forStr = (item.reservedFor || '').toLowerCase();
        const deptStr = (item.department || '').toLowerCase();
        const seqStr = String(item.seqNumber || '');
        return (
          numStr.includes(term) || 
          byStr.includes(term) || 
          forStr.includes(term) || 
          deptStr.includes(term) || 
          seqStr.includes(term)
        );
      }
      
      return true;
    });
  }, [reservedNumbers, filterType, filterDate, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    const available = reservedNumbers.filter(r => r.status === 'available').length;
    return { available, total: reservedNumbers.length };
  }, [reservedNumbers]);

  const docTypes = ['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง', 'หนังสือส่ง', 'หนังสือภายใน', 'หนังสือรับ'];

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md cursor-pointer"
      />

      <div
        className={`bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800/50 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) relative z-10 ${
          isFullScreen 
            ? 'w-full h-full sm:rounded-none' 
            : 'w-full max-w-4xl h-[85vh] sm:rounded-[1.5rem]'
        } ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Futuristic Background Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-40">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" />
        </div>

        {/* Futuristic Header */}
        <div className="relative p-4 sm:p-5 shrink-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 z-20">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 animate-pulse" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg relative z-10">
                  <Bookmark className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  คลังเลขหนังสือจอง
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {stats.available} พร้อมใช้
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เลือกเลขหนังสือที่จองไว้เพื่อออกทะเบียน
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors hidden sm:flex"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Control Center */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Search & Main Filter */}
            <div className="lg:col-span-8 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่, ผู้จอง, วัตถุประสงค์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-xs"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!currentSpecificDocType || currentSpecificDocType === 'ALL' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      filterType === 'ALL'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                  {docTypes.map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                        filterType === t
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold shadow-md shadow-indigo-500/10">
                    <Filter className="w-3 h-3" />
                    จำกัดเฉพาะ: {currentSpecificDocType}
                  </div>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    (ไม่อนุญาตให้เลือกเลขข้ามประเภทหนังสือ)
                  </span>
                </div>
              )}
            </div>

            {/* Side Controls */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full h-10 pl-8 pr-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:border-amber-500"
                >
                  <option value="available">พร้อมใช้</option>
                  <option value="used">ใช้แล้ว</option>
                  <option value="ALL">ทั้งหมด</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-slate-100 dark:bg-slate-700 text-amber-600 dark:text-amber-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> ตาราง
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                    viewMode === 'list' 
                      ? 'bg-slate-100 dark:bg-slate-700 text-amber-600 dark:text-amber-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> รายการ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0f172a] custom-scrollbar">
          {filteredNumbers.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 animate-fade-in" 
              : "flex flex-col gap-2 animate-fade-in"
            }>
              {filteredNumbers.map((item) => (
                <ReservedCard 
                  key={item.id} 
                  item={item} 
                  isSelected={selectedId === item.id}
                  viewMode={viewMode}
                  onSelect={() => {
                    onSelect(item);
                    onClose();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 border border-dashed border-slate-200 dark:border-slate-800">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">ไม่พบรายการที่ต้องการ</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                ลองเปลี่ยนเงื่อนไขการค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมด
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setSearchTerm('');
                  setFilterDate('');
                }}
                className="mt-6 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 transition-opacity"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> เลขจองล่วงหน้า
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> เลขคืนเข้าคลัง
            </div>
            <div className="hidden sm:block">
              แสดงข้อมูล {filteredNumbers.length} จาก {stats.total} รายการ
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservedCard({ 
  item, 
  isSelected, 
  onSelect,
  viewMode
}: { 
  item: ReservedNumber, 
  isSelected: boolean, 
  onSelect: () => void,
  viewMode: 'grid' | 'list'
}) {
  const isAvailable = item.status === 'available';
  const isReclaimed = item.type === 'reclaimed';

  const typeStyles = {
    'หนังสือส่ง': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'คำสั่ง': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'ประกาศ': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'default': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  };

  const getStyle = (type: string) => (typeStyles as any)[type] || typeStyles.default;

  if (viewMode === 'list') {
    return (
      <div
        className={`group p-2 rounded-xl border transition-all flex items-center gap-3 cursor-pointer hover:translate-x-0.5 ${
          isSelected 
            ? 'bg-amber-500/10 border-amber-500 shadow-sm' 
            : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-amber-500/30'
        } ${!isAvailable && 'opacity-50'}`}
        onClick={() => isAvailable && onSelect()}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isReclaimed ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {isReclaimed ? <RefreshCw className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
              {item.numberString}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStyle(item.docType)}`}>
              {item.docType}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {item.department || 'ทุกส่วนราชการ'}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {item.reservedBy || '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] text-slate-400">จอง {formatThaiDateString(item.reservedDate || item.createdAt)}</div>
          </div>
          {isAvailable ? (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          ) : (
             <span className="text-[9px] font-bold text-slate-400 px-2">ใช้แล้ว</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative p-3.5 rounded-2xl border transition-all flex flex-col h-full cursor-pointer overflow-hidden hover:-translate-y-0.5 ${
        isSelected 
          ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-lg ring-1 ring-amber-500/20' 
          : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md'
      } ${!isAvailable && 'opacity-60'}`}
      onClick={() => isAvailable && onSelect()}
    >
      {/* Header Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${getStyle(item.docType)}`}>
              {item.docType}
            </span>
            {isReclaimed && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-bold flex items-center gap-1">
                คืน
              </span>
            )}
          </div>
          <div className="font-mono text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-500 transition-colors">
            {item.numberString}
          </div>
        </div>
        
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          isAvailable ? 'bg-slate-50 dark:bg-slate-700/50 text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
        }`}>
          {isAvailable ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
      </div>

      {/* Details Panel */}
      <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-2.5 flex flex-col gap-1.5 mb-3 border border-slate-100/30 dark:border-slate-800/30">
        <div className="flex items-center gap-2 text-[10px]">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-700 dark:text-slate-200 font-bold truncate">{item.department || 'ทุกส่วนราชการ'}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{item.reservedBy || '-'}</span>
        </div>

        {item.reservedFor && (
          <div className="flex items-start gap-2 text-[10px] mt-0.5 pt-1 border-t border-slate-100/50 dark:border-slate-800/50">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-500 dark:text-slate-400 italic line-clamp-1">{item.reservedFor}</span>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="mt-auto pt-2 border-t border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">จอง {formatThaiDateString(item.reservedDate || item.createdAt)}</span>
        </div>
        
        {isAvailable ? (
          <button 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
              isSelected 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-amber-500 dark:hover:bg-amber-500 dark:hover:text-white'
            }`}
          >
            {isSelected ? 'เลือกแล้ว' : 'ใช้เลขนี้'}
          </button>
        ) : (
          <div className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
            ใช้แล้ว
          </div>
        )}
      </div>
    </div>
  );
}
