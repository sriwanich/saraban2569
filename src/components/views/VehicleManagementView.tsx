import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  FileCheck, 
  History, 
  AlertCircle, 
  ChevronRight, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  Settings,
  MoreVertical,
  X,
  ClipboardCheck,
  Fuel,
  Activity,
  Droplets,
  Zap,
  Gauge,
  Trash2,
  RefreshCw,
  FileText,
  Building2,
  Edit,
  Camera,
  Check,
  AlertTriangle,
  UploadCloud,
  Eye,
  Truck,
  Wrench,
  Flame,
  Shield,
  LayoutGrid,
  List,
  ZoomIn,
  Download,
  Paperclip,
  HardDrive,
  UserCheck,
  Phone,
  UserPlus,
  Crown,
  Layers,
  Info
} from 'lucide-react';
import { formatThaiDate } from '../../types';
import { 
  DDPM_VEHICLE_CATEGORIES, 
  getDDPMVehicleCategory, 
  isDDPMHeavyMachinery 
} from '../../data/ddpmVehicles';
import { useConfirm } from '../../context/ConfirmContext';
import { A4PaperPreview } from '../A4PaperPreview';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_number?: string;
  image_url?: string;
  province: string;
  brand: string;
  model: string;
  vehicle_type: string;
  department: string;
  current_mileage: number;
  status: 'active' | 'maintenance' | 'inactive';
  responsible_person?: string;        // ผู้รับผิดชอบ (ผู้รายงาน)
  responsible_user_id?: string;       // User ID หรือ username ในระบบ
  responsible_position?: string;      // ตำแหน่ง
  responsible_phone?: string;         // เบอร์โทรศัพท์ติดต่อ
  created_at?: string;
  updated_at?: string;
}

interface Inspection {
  id: string;
  vehicle_id: string;
  inspector_id: string;
  inspector_name: string;
  inspector_position: string;
  status: 'passed' | 'warning' | 'failed';
  mileage: number;
  results: any;
  submitted_at: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  title: string;
  description?: string;
  cost: number;
  technician?: string;
  provider_garage?: string;
  mileage: number;
  status: 'completed' | 'in_progress' | 'scheduled';
  created_at?: string;
  updated_at?: string;
}

// Helper function to extract defect issues from inspection results JSON
export function getInspectionIssues(resultsRaw: any): Array<{ key: string; name: string; note: string }> {
  if (!resultsRaw) return [];
  let results: any = {};
  try {
    results = typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : resultsRaw;
  } catch (e) {
    return [];
  }
  if (!results || typeof results !== 'object') return [];

  const issueList: Array<{ key: string; name: string; note: string }> = [];

  const fieldTitles: Record<string, string> = {
    '1_body': 'สภาพตัวถัง/สี',
    '2_tires': 'ลมยางและสภาพยาง',
    '3_radiator': 'น้ำในหม้อน้ำ',
    '4_hose': 'ท่อยางหม้อน้ำ',
    '5_belt': 'สายพานเครื่องยนต์',
    '6_brake_fluid': 'น้ำมันครัช/เบรก',
    '7_battery_water': 'น้ำกลั่นแบตเตอรี่',
    '8_engine_oil': 'น้ำมันเครื่อง',
    '9_engine_start': 'การติดเครื่องยนต์',
    '10_brake': 'ระบบเบรก',
    '11_clutch': 'ระบบครัช',
    '12_steering': 'พวงมาลัย',
    '13_horn': 'แตรสัญญาณ',
    '14_lights': 'ดวงไฟสัญญาณ',
    '15_wiper': 'ที่ปัดน้ำฝน',
    '17_fuel': 'น้ำมันเชื้อเพลิง',
    '18_air': 'ระบบแอร์',
    '19_cleanliness': 'ความสะอาดรถ'
  };

  Object.entries(results).forEach(([k, v]: [string, any]) => {
    if (!v || typeof v !== 'object') return;
    const isAbnormal = v.status === 'not_normal' || v.status === 'not_done' || v.status === 'hard' || v.status === 'wont_start';
    const fuelLow = k === '17_fuel' && (v.level === 'empty' || v.level === 'low');
    const hasNote = Boolean(v.note && typeof v.note === 'string' && v.note.trim() && k !== '20_last_used' && k !== '21_others');

    if (isAbnormal || fuelLow || hasNote) {
      let defaultNote = '';
      if (v.status === 'not_normal') defaultNote = 'ไม่ปกติ';
      else if (v.status === 'not_done') defaultNote = 'ยังไม่ได้ทำความสะอาด';
      else if (v.status === 'hard') defaultNote = 'ติดยาก';
      else if (v.status === 'wont_start') defaultNote = 'เครื่องยนต์ไม่ติด';
      else if (fuelLow) defaultNote = 'น้ำมันต่ำกว่า 1 ใน 4';

      issueList.push({
        key: k,
        name: fieldTitles[k] || k,
        note: v.note && typeof v.note === 'string' && v.note.trim() ? v.note.trim() : defaultNote
      });
    }
  });

  return issueList;
}

export const VehicleManagementView: React.FC<{ user: any; hasPermission?: (key: string) => boolean }> = ({ user, hasPermission }) => {
  const { confirm } = useConfirm();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [latestInspections, setLatestInspections] = useState<Record<string, Inspection>>({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'inspect' | 'history' | 'report' | 'maintenance'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  
  // Role & Scope states: Admin & Moderator see all, regular User sees only their assigned vehicles
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';
  const [scopeFilter, setScopeFilter] = useState<'all' | 'my_vehicles'>('all');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachedFileInfo, setAttachedFileInfo] = useState<{ name: string; size: string } | null>(null);

  // System Users and Departments for Responsible Person & Department Selection
  const [usersList, setUsersList] = useState<any[]>([]);
  const [systemDepartments, setSystemDepartments] = useState<string[]>([]);
  
  // Quick Add/Edit Vehicle Modal state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const [vehicleForm, setVehicleForm] = useState({
    license_plate: '',
    vehicle_number: '',
    image_url: '',
    province: 'ระยอง',
    brand: '',
    model: '',
    vehicle_type: 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)',
    department: '',
    current_mileage: 0,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    responsible_person: '',
    responsible_user_id: '',
    responsible_position: '',
    responsible_phone: ''
  });

  // Helper to determine if a vehicle is assigned to the current user
  const isResponsibleForVehicle = useCallback((v: Vehicle, u: any): boolean => {
    if (!u) return false;
    const userIdStr = String(u.id ?? '').trim().toLowerCase();
    const username = String(u.username ?? '').trim().toLowerCase();
    const userFullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const rawFirstName = String(u.firstName || '').trim().toLowerCase();
    
    const vUserId = String(v.responsible_user_id ?? '').trim().toLowerCase();
    const vPerson = String(v.responsible_person ?? '').trim().toLowerCase();

    // 1. Direct user ID or username match
    if (vUserId && (vUserId === userIdStr || vUserId === username)) return true;
    
    // 2. Full Name / First Name / Username in responsible_person text
    if (vPerson) {
      if (userFullName && (vPerson === userFullName || vPerson.includes(userFullName))) return true;
      if (username && vPerson.includes(username)) return true;
      if (rawFirstName && rawFirstName.length >= 2 && vPerson.includes(rawFirstName)) return true;
    }

    return false;
  }, []);

  const selectedTypeDetail = useMemo(() => {
    for (const cat of DDPM_VEHICLE_CATEGORIES) {
      const found = cat.types.find(t => t.name === vehicleForm.vehicle_type);
      if (found) return { ...found, category: cat.category, isMachinery: cat.isMachinery };
    }
    return null;
  }, [vehicleForm.vehicle_type]);

  const fetchLatestInspections = useCallback(async (vehicleList: Vehicle[]) => {
    if (!vehicleList || vehicleList.length === 0) return;
    const map: Record<string, Inspection> = {};
    await Promise.all(
      vehicleList.map(async (v) => {
        try {
          const res = await fetch(`/api/vehicles/${v.id}/inspections`);
          if (res.ok) {
            const list: Inspection[] = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              map[v.id] = list[0];
            }
          }
        } catch (e) {
          // ignore error
        }
      })
    );
    setLatestInspections(prev => ({ ...prev, ...map }));
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
        if (Array.isArray(data) && data.length > 0) {
          fetchLatestInspections(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();

    // Fetch system users for assigning responsible persons
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsersList(data);
      })
      .catch(err => console.error('Failed to fetch users:', err));

    // Fetch system departments from Settings
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSystemDepartments(data.map((d: any) => typeof d === 'string' ? d : d.name).filter(Boolean));
        }
      })
      .catch(err => console.error('Failed to fetch departments:', err));
  }, []);

  // Department options list: based on configured system departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    // Configured system departments
    systemDepartments.forEach(d => { if (d) set.add(d); });
    // Keep departments from existing vehicles for filter view
    vehicles.forEach(v => { if (v.department) set.add(v.department); });
    return Array.from(set);
  }, [systemDepartments, vehicles]);

  // Total vehicles assigned to current user
  const myVehiclesCount = useMemo(() => {
    return vehicles.filter(v => isResponsibleForVehicle(v, user)).length;
  }, [vehicles, user, isResponsibleForVehicle]);

  // Accessible vehicles according to Role & Permissions:
  // Admin & Moderator see ALL vehicles (can toggle to 'my_vehicles')
  // Regular User strictly sees ONLY vehicles they are responsible for
  const accessibleVehicles = useMemo(() => {
    if (isAdminOrModerator) {
      if (scopeFilter === 'my_vehicles') {
        return vehicles.filter(v => isResponsibleForVehicle(v, user));
      }
      return vehicles;
    }
    // Regular User: Strictly their own assigned vehicles
    return vehicles.filter(v => isResponsibleForVehicle(v, user));
  }, [vehicles, isAdminOrModerator, scopeFilter, user, isResponsibleForVehicle]);

  // Filtered vehicles (Search, Status, Department, DDPM Type)
  const filteredVehicles = useMemo(() => {
    return accessibleVehicles.filter(v => {
      const matchSearch = 
        v.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (v.vehicle_number && v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.vehicle_type && v.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.department && v.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.responsible_person && v.responsible_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.responsible_position && v.responsible_position.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchDept = departmentFilter === 'all' || v.department === departmentFilter;
      
      let matchType = true;
      if (typeFilter !== 'all') {
        if (typeFilter.startsWith('cat:')) {
          const targetCategory = typeFilter.replace('cat:', '');
          const cat = getDDPMVehicleCategory(v.vehicle_type);
          matchType = cat.category === targetCategory;
        } else {
          matchType = v.vehicle_type === typeFilter;
        }
      }

      return matchSearch && matchStatus && matchDept && matchType;
    });
  }, [accessibleVehicles, searchTerm, statusFilter, departmentFilter, typeFilter]);

  // Statistics calculation based on accessible vehicles
  const stats = useMemo(() => {
    const total = accessibleVehicles.length;
    const active = accessibleVehicles.filter(v => v.status === 'active').length;
    const maintenance = accessibleVehicles.filter(v => v.status === 'maintenance').length;
    const inactive = accessibleVehicles.filter(v => v.status === 'inactive').length;
    const machinery = accessibleVehicles.filter(v => isDDPMHeavyMachinery(v.vehicle_type)).length;
    return { total, active, maintenance, inactive, machinery };
  }, [accessibleVehicles]);

  const handleStartInspection = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveView('inspect');
  };

  const handleViewHistory = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveView('history');
  };

  const handleViewMaintenance = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveView('maintenance');
  };

  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setAttachedFileInfo(null);
    setVehicleForm({
      license_plate: '',
      vehicle_number: '',
      image_url: '',
      province: 'ระยอง',
      brand: '',
      model: '',
      vehicle_type: 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)',
      department: systemDepartments[0] || '',
      current_mileage: 0,
      status: 'active',
      responsible_person: '',
      responsible_user_id: '',
      responsible_position: '',
      responsible_phone: ''
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setAttachedFileInfo(
      vehicle.image_url 
        ? { name: vehicle.image_url.split('/').pop() || 'รูปภาพยานพาหนะ', size: 'จัดเก็บบนเซิร์ฟเวอร์' } 
        : null
    );
    setVehicleForm({
      license_plate: vehicle.license_plate,
      vehicle_number: vehicle.vehicle_number || '',
      image_url: vehicle.image_url || '',
      province: vehicle.province || 'ระยอง',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      vehicle_type: vehicle.vehicle_type || 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)',
      department: vehicle.department || '',
      current_mileage: vehicle.current_mileage || 0,
      status: vehicle.status || 'active',
      responsible_person: vehicle.responsible_person || '',
      responsible_user_id: vehicle.responsible_user_id || '',
      responsible_position: vehicle.responsible_position || '',
      responsible_phone: vehicle.responsible_phone || ''
    });
    setIsVehicleModalOpen(true);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบข้อมูลยานพาหนะ',
      message: `คุณต้องการลบข้อมูลยานพาหนะ "${vehicle.license_plate} ${vehicle.province || 'ระยอง'}" ออกจากระบบใช่หรือไม่?`,
      description: 'การดำเนินการนี้จะลบข้อมูลยานพาหนะ พร้อมประวัติการตรวจเช็กประจำวันและบันทึกทั้งหมดอย่างถาวร โดยไม่สามารถย้อนคืนได้',
      itemDetail: `ยานพาหนะ: ${vehicle.brand} ${vehicle.model} • ทะเบียน: ${vehicle.license_plate} ${vehicle.province || 'ระยอง'}${vehicle.vehicle_number ? ` • หมายเลข: ${vehicle.vehicle_number}` : ''}${vehicle.department ? ` • ฝ่าย: ${vehicle.department}` : ''}`,
      type: 'delete',
      confirmText: 'ยืนยันการลบยานพาหนะ',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (err) {
      console.error('Delete vehicle error:', err);
    }
  };

  const uploadVehicleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 15MB');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('files', file);
    formData.append('subfolder', 'vehicles');
    formData.append('uploadedBy', user?.username || user?.name || 'admin');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = data.files?.[0]?.url || data.url;
        if (uploadedUrl) {
          setVehicleForm(prev => ({ ...prev, image_url: uploadedUrl }));
          setAttachedFileInfo({
            name: file.name,
            size: file.size > 1024 * 1024 
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
              : `${(file.size / 1024).toFixed(1)} KB`
          });
        }
      } else {
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพลงเซิร์ฟเวอร์');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVehicleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadVehicleFile(file);
    }
  };

  const handleDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadVehicleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.license_plate.trim() || !vehicleForm.brand.trim()) {
      alert('กรุณากรอกเลขทะเบียนและยี่ห้อรถยนต์');
      return;
    }

    setIsSavingVehicle(true);
    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      });

      if (res.ok) {
        setIsVehicleModalOpen(false);
        setEditingVehicle(null);
        fetchVehicles();
      } else {
        const err = await res.json();
        alert('เกิดข้อผิดพลาด: ' + (err.error || 'ไม่สามารถบันทึกได้'));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // --- Sub-views routing ---
  if (activeView === 'inspect' && selectedVehicle) {
    return (
      <InspectionForm 
        vehicle={selectedVehicle} 
        user={user} 
        usersList={usersList}
        onBack={() => { setActiveView('list'); setSelectedVehicle(null); }}
        onComplete={() => { fetchVehicles(); setActiveView('list'); setSelectedVehicle(null); }}
      />
    );
  }

  if (activeView === 'history' && selectedVehicle) {
    return (
      <InspectionHistory 
        vehicle={selectedVehicle} 
        user={user} 
        onBack={() => { setActiveView('list'); setSelectedVehicle(null); }}
        onViewReport={(report) => { setSelectedInspection(report); setActiveView('report'); }}
        onStartNewInspection={() => setActiveView('inspect')}
      />
    );
  }

  if (activeView === 'report' && selectedVehicle && selectedInspection) {
    return (
      <VehiclePrintablePaperModal 
        vehicle={selectedVehicle}
        inspection={selectedInspection}
        user={user}
        onClose={() => setActiveView('history')}
      />
    );
  }

  if (activeView === 'maintenance' && selectedVehicle) {
    if (!isAdminOrModerator) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-[var(--bg-card)] rounded-3xl border border-[var(--border-light)] shadow-xs max-w-lg mx-auto mt-12 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">ไม่ได้รับสิทธิ์เข้าถึง</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
            หน้าประวัติการบำรุงรักษาและซ่อมแซมยานพาหนะเฉพาะผู้ดูแลระบบ (Admin) หรือผู้ตรวจสอบ (Moderator) เท่านั้น หากต้องการบันทึกข้อมูล กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <button
            type="button"
            onClick={() => { setActiveView('list'); setSelectedVehicle(null); }}
            className="px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            กลับสู่หน้ารายการยานพาหนะ
          </button>
        </div>
      );
    }

    return (
      <MaintenanceHistory 
        vehicle={selectedVehicle} 
        user={user} 
        onBack={() => { setActiveView('list'); setSelectedVehicle(null); }}
        onStartInspection={() => setActiveView('inspect')}
      />
    );
  }

  // --- Main Vehicle List View ---
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. Top Header Card */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-color)]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-color)] to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-[var(--primary-color)]/25 shrink-0">
              <Car className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  ระบบบริหารจัดการยานพาหนะ
                </h1>
                {user?.role === 'admin' ? (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    <span>ผู้ดูแลระบบ (Admin) • ดูแลจัดการยานพาหนะทั้งหมด</span>
                  </span>
                ) : user?.role === 'moderator' ? (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ผู้ตรวจสอบ/สารบรรณ (Moderator) • ดูแลจัดการยานพาหนะทั้งหมด</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>ผู้รับผิดชอบยานพาหนะ • แสดงเฉพาะรถที่ได้รับมอบหมาย ({accessibleVehicles.length} คัน)</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">
                {isAdminOrModerator 
                  ? 'จัดการทะเบียนยานพาหนะส่วนกลาง ตรวจสภาพรถประจำวัน และรายงานประวัติการใช้งานทุกคันในระบบ' 
                  : 'ตรวจสอบสภาพความพร้อมใช้งานประจำวัน บันทึกเลขไมล์ และรายงานประวัติการใช้งานยานพาหนะที่ท่านรับผิดชอบ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto self-end lg:self-center">
            <button
              onClick={fetchVehicles}
              disabled={loading}
              className="p-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] rounded-2xl transition-all shadow-xs hover:text-[var(--text-primary)] active:scale-95 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--primary-color)]' : ''}`} />
            </button>
            {isAdminOrModerator && (
              <button 
                onClick={handleOpenAddVehicle}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-[var(--primary-color)] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-[var(--primary-color)]/25 hover:bg-[var(--primary-hover)] transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มยานพาหนะใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Performance Indicators (KPI Summary Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[var(--border-lighter)] relative z-10">
          <div 
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'all' && typeFilter === 'all'
                ? 'bg-[var(--bg-surface)] border-[var(--primary-color)] shadow-sm ring-2 ring-[var(--primary-color)]/15' 
                : 'bg-[var(--bg-surface)]/60 border-[var(--border-light)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ทั้งหมด</span>
              <Car className="w-4 h-4 text-[var(--primary-color)]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1.5">{stats.total}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">ยานพาหนะในระบบ</div>
          </div>

          <div 
            onClick={() => setStatusFilter('active')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'active' 
                ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                : 'bg-[var(--bg-surface)]/60 border-[var(--border-light)] hover:bg-[var(--bg-surface)] hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">พร้อมใช้งาน</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{stats.active}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">สถานะปกติ พร้อมปฏิบัติงาน</div>
          </div>

          <div 
            onClick={() => setStatusFilter('maintenance')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'maintenance' 
                ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20' 
                : 'bg-[var(--bg-surface)]/60 border-[var(--border-light)] hover:bg-[var(--bg-surface)] hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">แจ้งซ่อม/บำรุง</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{stats.maintenance}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">รอหรือกำลังซ่อมบำรุง</div>
          </div>

          <div 
            onClick={() => setTypeFilter(typeFilter === 'cat:เครื่องจักรกลสาธารณภัย' ? 'all' : 'cat:เครื่องจักรกลสาธารณภัย')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              typeFilter === 'cat:เครื่องจักรกลสาธารณภัย'
                ? 'bg-orange-500/10 border-orange-500 shadow-sm ring-2 ring-orange-500/20' 
                : 'bg-[var(--bg-surface)]/60 border-[var(--border-light)] hover:bg-[var(--bg-surface)] hover:border-orange-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">เครื่องจักรกล ปภ.</span>
              <Wrench className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 mt-1.5">{stats.machinery}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">เครื่องจักรกลหนัก/กู้ภัย</div>
          </div>

          <div 
            onClick={() => setStatusFilter('inactive')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'inactive' 
                ? 'bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-500/20' 
                : 'bg-[var(--bg-surface)]/60 border-[var(--border-light)] hover:bg-[var(--bg-surface)] hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ระงับใช้งาน</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--text-secondary)] mt-1.5">{stats.inactive}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">ปลดประจำการ/งดใช้</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-xs flex flex-col gap-3">
        {/* Admin/Moderator Scope Selector Tabs */}
        {isAdminOrModerator && (
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl w-fit">
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === 'all'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ยานพาหนะทั้งหมด ({vehicles.length})</span>
            </button>
            <button
              onClick={() => setScopeFilter('my_vehicles')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === 'my_vehicles'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>เฉพาะรถที่ฉันรับผิดชอบ ({myVehiclesCount})</span>
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--primary-color)] transition-colors" />
            <input 
              type="text" 
              placeholder="ค้นหาเลขทะเบียน, ยี่ห้อ, รุ่น, หรือหมายเลขรถ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls Right: View Mode Toggle & Reset Button */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                  setTypeFilter('all');
                }}
                className="px-3 py-2 bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-rose-500 rounded-xl text-xs font-bold transition-all border border-[var(--border-light)] flex items-center gap-1 cursor-pointer"
                title="ล้างตัวกรองทั้งหมด"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}

            {/* View Mode Switcher: Grid vs Table */}
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[var(--primary-color)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
                title="มุมมองแบบการ์ด (Card Grid View)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">การ์ด</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-[var(--primary-color)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
                title="มุมมองแบบตารางข้อมูล (Table List View)"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Row 2: Status tabs + Department + DDPM Types */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-[var(--border-lighter)]">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'active', label: 'พร้อมใช้งาน' },
              { id: 'maintenance', label: 'แจ้งซ่อม' },
              { id: 'inactive', label: 'ระงับ' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[var(--primary-color)] text-white shadow-xs'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Department Filter (if departments exist) */}
            {departments.length > 0 && (
              <div className="w-full sm:w-56 shrink-0">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer focus:border-[var(--primary-color)]"
                >
                  <option value="all">ทุกฝ่ายงาน / กลุ่มงาน ปภ.</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* DDPM Vehicle & Machinery Type Filter */}
            <div className="w-full sm:w-64 shrink-0">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer focus:border-[var(--primary-color)]"
              >
                <option value="all">ทุกประเภทรถ / เครื่องจักรกล ปภ.</option>
                {DDPM_VEHICLE_CATEGORIES.map((cat, idx) => (
                  <optgroup key={idx} label={`หมวด: ${cat.category}`}>
                    <option value={`cat:${cat.category}`}>↳ ดูทั้งหมดในหมวด {cat.category}</option>
                    {cat.types.map((t, tIdx) => (
                      <option key={tIdx} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Vehicles Grid or Table View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-96 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-light)] animate-pulse" />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-light)]">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
            <Car className="w-10 h-10 opacity-40" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1">
            {!isAdminOrModerator && accessibleVehicles.length === 0
              ? 'ยังไม่มีข้อมูลยานพาหนะที่คุณรับผิดชอบ'
              : 'ไม่พบข้อมูลยานพาหนะ'}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mb-6">
            {!isAdminOrModerator && accessibleVehicles.length === 0
              ? 'ระบบจำกัดการมองเห็นเฉพาะยานพาหนะที่คุณมีชื่อเป็นผู้รับผิดชอบ หากท่านเป็นผู้รับผิดชอบรถยนต์หรือเครื่องจักรกล กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อทำการมอบหมายยานพาหนะให้บัญชีของท่าน'
              : searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || typeFilter !== 'all'
              ? 'ไม่พบยานพาหนะที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือกไว้'
              : isAdminOrModerator && scopeFilter === 'my_vehicles'
              ? 'คุณยังไม่มีรายชื่อเป็นผู้รับผิดชอบยานพาหนะคันใดในระบบ (คลิก "ยานพาหนะทั้งหมด" เพื่อดูยานพาหนะทุกคัน)'
              : 'ยังไม่มีข้อมูลยานพาหนะในระบบ เริ่มต้นเพิ่มข้อมูลคันแรกได้เลย'}
          </p>
          {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || typeFilter !== 'all') ? (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDepartmentFilter('all'); setTypeFilter('all'); }}
              className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          ) : isAdminOrModerator && scopeFilter === 'my_vehicles' ? (
            <button
              onClick={() => setScopeFilter('all')}
              className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ดูยานพาหนะทั้งหมด ({vehicles.length})
            </button>
          ) : isAdminOrModerator ? (
            <button
              onClick={handleOpenAddVehicle}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มยานพาหนะใหม่</span>
            </button>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map(vehicle => {
            const isVehicleActive = vehicle.status === 'active';
            const isVehicleMaintenance = vehicle.status === 'maintenance';
            const categoryInfo = getDDPMVehicleCategory(vehicle.vehicle_type);
            const isMachinery = isDDPMHeavyMachinery(vehicle.vehicle_type) || categoryInfo.isMachinery;
            const latestInsp = latestInspections[vehicle.id];
            const inspIssues = latestInsp ? getInspectionIssues(latestInsp.results) : [];
            const hasInspDefects = inspIssues.length > 0;

            return (
              <div 
                key={vehicle.id}
                className="group bg-[var(--bg-card)] rounded-3xl border border-[var(--border-light)] hover:border-[var(--primary-color)]/40 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Image Section */}
                <div className="relative h-52 w-full overflow-hidden bg-[var(--bg-elevated)]">
                  {vehicle.image_url ? (
                    <div 
                      onClick={() => setLightboxImage({ 
                        url: vehicle.image_url, 
                        title: `${vehicle.brand} ${vehicle.model}`, 
                        subtitle: `${vehicle.license_plate} ${vehicle.province || 'ระยอง'}` 
                      })}
                      className="w-full h-full cursor-zoom-in relative group/img"
                    >
                      <img 
                        src={vehicle.image_url} 
                        alt={vehicle.license_plate} 
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>ดูรูปขนาดใหญ่</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-surface)]">
                      {isMachinery ? (
                        <Wrench className="w-14 h-14 opacity-25 text-amber-500" />
                      ) : (
                        <Car className="w-14 h-14 opacity-25" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {isMachinery ? 'ยังไม่ได้แนบรูปเครื่องจักรกล' : 'ยังไม่ได้แนบรูปยานพาหนะ'}
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10 pointer-events-none">
                    <div className="flex flex-col gap-1 items-start max-w-[70%]">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-xs line-clamp-1 ${
                        categoryInfo.badgeColor === 'blue' 
                          ? 'bg-blue-600/90 text-white border-blue-400/40' 
                          : categoryInfo.badgeColor === 'amber'
                          ? 'bg-amber-600/90 text-white border-amber-400/40'
                          : categoryInfo.badgeColor === 'rose'
                          ? 'bg-rose-600/90 text-white border-rose-400/40'
                          : categoryInfo.badgeColor === 'emerald'
                          ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                          : 'bg-slate-800/90 text-white border-white/20'
                      }`} title={vehicle.vehicle_type}>
                        {vehicle.vehicle_type || 'รถยนต์ราชการ ปภ.'}
                      </span>
                      {isMachinery && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>เครื่องจักรกล</span>
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="pointer-events-auto">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm ${
                        isVehicleActive 
                          ? 'bg-emerald-500/80 text-white border-emerald-400/50' 
                          : isVehicleMaintenance
                          ? 'bg-amber-500/80 text-white border-amber-400/50'
                          : 'bg-rose-500/80 text-white border-rose-400/50'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>
                          {isVehicleActive ? 'พร้อมใช้งาน' : isVehicleMaintenance ? 'แจ้งซ่อม' : 'ระงับ'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Image Info: Plate Graphic and Action Menu */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10">
                    <div className="flex flex-col gap-1">
                      {vehicle.vehicle_number && (
                        <span className="text-[10px] font-black tracking-wider text-amber-300 font-mono bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md inline-block w-fit">
                          หมายเลข: {vehicle.vehicle_number}
                        </span>
                      )}
                      {/* Realistic Thai License Plate Style */}
                      <div className="inline-flex items-center gap-2 bg-white text-slate-900 px-3 py-1 rounded-lg border-2 border-slate-900 shadow-lg font-sans">
                        <span className="text-base font-black tracking-tight">{vehicle.license_plate}</span>
                        <span className="text-[11px] font-bold text-slate-600 border-l border-slate-300 pl-2">{vehicle.province || 'ระยอง'}</span>
                      </div>
                    </div>

                    {isAdminOrModerator && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditVehicle(vehicle)}
                          className="p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                          title="แก้ไขข้อมูลยานพาหนะ"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
                            className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                            title="ลบข้อมูลยานพาหนะ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Brand & Model */}
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        ยี่ห้อ / รุ่น
                      </div>
                      <div className="text-base font-extrabold text-[var(--text-primary)]">
                        {vehicle.brand} {vehicle.model}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
                          <Gauge className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          <span>{isMachinery ? 'ชม.ทำงาน/ไมล์' : 'เลขไมล์ล่าสุด'}</span>
                        </div>
                        <div className="text-sm font-black text-[var(--text-primary)] mt-1">
                          {Number(vehicle.current_mileage || 0).toLocaleString()} 
                          <span className="text-[10px] text-[var(--text-muted)] ml-1 font-bold">
                            {isMachinery ? 'ชม./กม.' : 'กม.'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>ฝ่ายที่รับผิดชอบ</span>
                        </div>
                        <div className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate" title={vehicle.department}>
                          {vehicle.department || 'ส่วนกลาง'}
                        </div>
                      </div>
                    </div>

                    {/* Responsible Person / Custodian Card */}
                    <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          vehicle.responsible_person 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' 
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                        }`}>
                          {vehicle.responsible_person ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                            <span>ผู้รับผิดชอบ</span>
                          </div>
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate" title={vehicle.responsible_person || 'ยังไม่ได้กำหนด'}>
                            {vehicle.responsible_person ? (
                              vehicle.responsible_person
                            ) : (
                              <span className="text-[var(--text-muted)] font-normal italic">ยังไม่ได้กำหนดผู้ดูแล</span>
                            )}
                          </div>
                          {vehicle.responsible_position && (
                            <div className="text-[10px] text-[var(--text-muted)] truncate" title={vehicle.responsible_position}>
                              {vehicle.responsible_position}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vehicle.responsible_phone && (
                          <a 
                            href={`tel:${vehicle.responsible_phone}`}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title={`โทรติดต่อ: ${vehicle.responsible_phone}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditVehicle(vehicle)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer"
                            title="แก้ไขผู้รับผิดชอบ"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Latest Inspection Alert Card (Only show if defects found) */}
                    {latestInsp && hasInspDefects && (
                      <div className="p-3 rounded-2xl border transition-all bg-rose-500/10 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black text-xs min-w-0">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                            <span className="truncate">พบปัญหาการตรวจ ({formatThaiDate(latestInsp.submitted_at)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewHistory(vehicle)}
                            className="text-[10px] font-black text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer"
                          >
                            ดูในประวัติ
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-rose-300/40 dark:border-rose-800/40">
                          {inspIssues.map((issue, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30"
                            >
                              <span>{issue.name}:</span>
                              <span className="font-medium text-rose-600 dark:text-rose-400">{issue.note}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2 border-t border-[var(--border-lighter)]">
                    <button 
                      onClick={() => handleStartInspection(vehicle)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>ตรวจสภาพประจำวัน</span>
                    </button>
                    
                    <button 
                      onClick={() => handleViewHistory(vehicle)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer min-w-0"
                      title="ประวัติการตรวจ"
                    >
                      <History className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate">ประวัติการตรวจ</span>
                    </button>

                    {isAdminOrModerator && (
                      <button 
                        onClick={() => handleViewMaintenance(vehicle)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer min-w-0"
                        title="ประวัติบำรุงรักษา"
                      >
                        <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">ประวัติบำรุงรักษา</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] text-[var(--text-secondary)] font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">รูปภาพ</th>
                  <th className="py-3.5 px-4">ทะเบียน / หมายเลข</th>
                  <th className="py-3.5 px-4">ประเภทรถ / หมวด ปภ.</th>
                  <th className="py-3.5 px-4">ยี่ห้อ / รุ่น</th>
                  <th className="py-3.5 px-4">ฝ่ายที่รับผิดชอบ</th>
                  <th className="py-3.5 px-4">ผู้รับผิดชอบ</th>
                  <th className="py-3.5 px-4 text-right">เลขไมล์ / ชม.</th>
                  <th className="py-3.5 px-4 text-center">สถานะ / ผลตรวจล่าสุด</th>
                  <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-lighter)]">
                {filteredVehicles.map(vehicle => {
                  const isVehicleActive = vehicle.status === 'active';
                  const isVehicleMaintenance = vehicle.status === 'maintenance';
                  const categoryInfo = getDDPMVehicleCategory(vehicle.vehicle_type);
                  const isMachinery = isDDPMHeavyMachinery(vehicle.vehicle_type) || categoryInfo.isMachinery;
                  const latestInsp = latestInspections[vehicle.id];
                  const inspIssues = latestInsp ? getInspectionIssues(latestInsp.results) : [];
                  const hasInspDefects = inspIssues.length > 0;

                  return (
                    <tr 
                      key={vehicle.id} 
                      className="hover:bg-[var(--bg-surface)]/70 transition-colors group"
                    >
                      {/* Thumbnail with Lightbox click */}
                      <td className="py-3 px-4 text-center">
                        {vehicle.image_url ? (
                          <div 
                            onClick={() => setLightboxImage({ 
                              url: vehicle.image_url, 
                              title: `${vehicle.brand} ${vehicle.model}`, 
                              subtitle: `${vehicle.license_plate} ${vehicle.province || 'ระยอง'}` 
                            })}
                            className="w-12 h-10 rounded-xl overflow-hidden bg-black/10 border border-[var(--border-light)] inline-block cursor-zoom-in group/thumb relative mx-auto"
                          >
                            <img src={vehicle.image_url} alt={vehicle.license_plate} className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-10 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                            {isMachinery ? <Wrench className="w-4 h-4 opacity-40 text-amber-500" /> : <Car className="w-4 h-4 opacity-40" />}
                          </div>
                        )}
                      </td>

                      {/* License Plate & Number */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-[var(--text-primary)] text-sm tracking-tight">
                            {vehicle.license_plate}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {vehicle.province || 'ระยอง'} {vehicle.vehicle_number ? `• เบอร์ ${vehicle.vehicle_number}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* DDPM Category & Type */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            categoryInfo.badgeColor === 'blue'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : categoryInfo.badgeColor === 'amber'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : categoryInfo.badgeColor === 'rose'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {categoryInfo.category}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[200px]" title={vehicle.vehicle_type}>
                            {vehicle.vehicle_type}
                          </span>
                        </div>
                      </td>

                      {/* Brand & Model */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--text-primary)]">
                          {vehicle.brand} {vehicle.model}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          {vehicle.department || 'ส่วนกลาง'}
                        </span>
                      </td>

                      {/* Responsible Person / Custodian */}
                      <td className="py-3 px-4">
                        {vehicle.responsible_person ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[var(--text-primary)] text-xs truncate max-w-[150px]" title={vehicle.responsible_person}>
                                  {vehicle.responsible_person}
                                </span>
                                {vehicle.responsible_phone && (
                                  <a 
                                    href={`tel:${vehicle.responsible_phone}`}
                                    className="text-emerald-500 hover:text-emerald-600"
                                    title={`โทร: ${vehicle.responsible_phone}`}
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]" title={vehicle.responsible_position || ''}>
                                {vehicle.responsible_position || 'ผู้รับผิดชอบยานพาหนะ'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            ยังไม่ระบุ
                          </span>
                        )}
                      </td>

                      {/* Mileage */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {Number(vehicle.current_mileage || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-1">
                          {isMachinery ? 'ชม.' : 'กม.'}
                        </span>
                      </td>

                      {/* Status & Latest Inspection */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isVehicleActive 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : isVehicleMaintenance
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isVehicleActive ? 'bg-emerald-500' : isVehicleMaintenance ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            <span>
                              {isVehicleActive ? 'พร้อมใช้งาน' : isVehicleMaintenance ? 'แจ้งซ่อม' : 'ระงับ'}
                            </span>
                          </span>

                          {latestInsp && hasInspDefects && (
                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>พบปัญหา</span>
                              </span>
                              <div className="flex flex-wrap justify-center gap-1 max-w-[180px]">
                                {inspIssues.slice(0, 2).map((issue, idx) => (
                                  <span key={idx} className="px-1.5 py-0.2 text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded border border-rose-300/40 truncate max-w-[150px]">
                                    {issue.name}: {issue.note}
                                  </span>
                                ))}
                                {inspIssues.length > 2 && (
                                  <span className="text-[9px] text-rose-500 font-bold">+{inspIssues.length - 2} รายการ</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartInspection(vehicle)}
                            className="px-2.5 py-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="ตรวจสภาพประจำวัน"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>ตรวจสภาพประจำวัน</span>
                          </button>
                           <button
                            onClick={() => handleViewHistory(vehicle)}
                            className="p-1.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl transition-all cursor-pointer"
                            title="ประวัติการตรวจ"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-500" />
                          </button>
                          {isAdminOrModerator && (
                            <button
                              onClick={() => handleViewMaintenance(vehicle)}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                              title="ประวัติบำรุงรักษา"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdminOrModerator && (
                            <button
                              onClick={() => handleOpenEditVehicle(vehicle)}
                              className="p-1.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl transition-all cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteVehicle(vehicle)}
                              className="p-1.5 bg-[var(--bg-canvas)] hover:bg-rose-500/10 text-rose-500 border border-[var(--border-light)] rounded-xl transition-all cursor-pointer"
                              title="ลบยานพาหนะ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {editingVehicle ? 'แก้ไขข้อมูลยานพาหนะ' : 'เพิ่มยานพาหนะใหม่เข้าสู่ระบบ'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    บันทึกข้อมูลยานพาหนะส่วนกลางเพื่อใช้ตรวจเช็คประจำวัน
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsVehicleModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVehicleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Image Upload Area - Upgraded to File Attachment to Server */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-light)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[var(--primary-color)]" />
                    <span>แนบไฟล์รูปภาพยานพาหนะ (จัดเก็บบนเซิร์ฟเวอร์)</span>
                  </label>
                  {vehicleForm.image_url ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>แนบไฟล์รูปภาพบนเซิร์ฟเวอร์แล้ว</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      รองรับ JPG, PNG, WEBP (สูงสุด 15MB)
                    </span>
                  )}
                </div>

                {vehicleForm.image_url ? (
                  <div className="space-y-3">
                    <div className="relative group rounded-2xl overflow-hidden border border-[var(--border-light)] bg-black/5 aspect-video sm:aspect-21/9 max-h-52 flex items-center justify-center">
                      <img 
                        src={vehicleForm.image_url} 
                        alt="Vehicle attachment" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-between">
                        <span className="text-xs text-white/90 font-mono truncate max-w-[65%]">
                          {vehicleForm.image_url}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ 
                            url: vehicleForm.image_url, 
                            title: `${vehicleForm.brand} ${vehicleForm.model}`, 
                            subtitle: `${vehicleForm.license_plate} ${vehicleForm.province}` 
                          })}
                          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          title="ดูรูปภาพขนาดเต็ม"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>ดูรูปขยาย</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] flex-wrap text-xs">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] font-mono text-[11px] truncate max-w-[60%]">
                        <Paperclip className="w-3.5 h-3.5 text-[var(--primary-color)] shrink-0" />
                        <span className="truncate">{attachedFileInfo?.name || vehicleForm.image_url.split('/').pop()}</span>
                        {attachedFileInfo?.size && (
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">({attachedFileInfo.size})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-[var(--primary-color)] hover:underline cursor-pointer flex items-center gap-1">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>เปลี่ยนไฟล์แนบ</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleVehicleImageUpload} 
                            className="hidden" 
                            disabled={isUploadingImage}
                          />
                        </label>
                        <span className="text-[var(--border-medium)]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleForm(prev => ({ ...prev, image_url: '' }));
                            setAttachedFileInfo(null);
                          }}
                          className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ลบไฟล์</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDropFile}
                    className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center gap-3 ${
                      isDragOver
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 scale-[1.01]'
                        : 'border-[var(--border-light)] hover:border-[var(--primary-color)]/50 bg-[var(--bg-canvas)]'
                    }`}
                  >
                    {isUploadingImage ? (
                      <div className="py-6 flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-[var(--primary-color)] animate-spin" />
                        <p className="text-xs font-bold text-[var(--text-primary)]">กำลังอัปโหลดและจัดเก็บบนเซิร์ฟเวอร์...</p>
                        <p className="text-[11px] text-[var(--text-muted)]">ระบบกำลังจัดเก็บไฟล์ในโฟลเดอร์ /uploads/vehicles</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center shadow-xs">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                            ลากและวางไฟล์รูปภาพที่นี่ หรือคลิกเพื่อแนบไฟล์
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                            ไฟล์ภาพจะถูกอัปโหลดและจัดเก็บบนเซิร์ฟเวอร์โดยตรงสำหรับตรวจสอบสภาพยานพาหนะ
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                          <label className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>เลือกไฟล์รูปภาพจากอุปกรณ์</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleVehicleImageUpload} 
                              className="hidden" 
                            />
                          </label>
                          <label className="px-3.5 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold rounded-xl transition-all border border-[var(--border-light)] cursor-pointer flex items-center gap-1.5 active:scale-95">
                            <Camera className="w-3.5 h-3.5" />
                            <span>ถ่ายภาพ</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={handleVehicleImageUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 1: License Plate, Province & Vehicle Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    หมายเลขทะเบียน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 7 กบ 5108 หรือ ปภ. รย-04"
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    จังหวัดที่จดทะเบียน
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.province}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, province: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    หมายเลขประจำรถ / รหัสเครื่องจักรกล ปภ.
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น รย 01-01, รย 02-01 หรือ มค 01-01"
                    value={vehicleForm.vehicle_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              {/* Row 2: DDPM Vehicle & Heavy Machinery Type Classification */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-light)] space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[var(--primary-color)]" />
                    <span>ประเภทรถยนต์ราชการ / เครื่องจักรกลสาธารณภัย (อ้างอิง ปภ.)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {selectedTypeDetail?.category && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
                      หมวด: {selectedTypeDetail.category}
                    </span>
                  )}
                </div>

                <select
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    let updatedBrand = vehicleForm.brand;
                    let updatedModel = vehicleForm.model;
                    
                    // Look up standard model
                    for (const cat of DDPM_VEHICLE_CATEGORIES) {
                      const found = cat.types.find(t => t.name === newType);
                      if (found && found.standardModel) {
                        // If brand/model are empty, auto-suggest
                        if (!vehicleForm.brand && !vehicleForm.model) {
                          const [sBrand, ...sModel] = found.standardModel.split(' / ')[0].split(' ');
                          updatedBrand = sBrand;
                          updatedModel = sModel.join(' ');
                        }
                      }
                    }

                    setVehicleForm({ 
                      ...vehicleForm, 
                      vehicle_type: newType,
                      brand: updatedBrand,
                      model: updatedModel
                    });
                  }}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)] outline-none"
                >
                  {DDPM_VEHICLE_CATEGORIES.map((cat, idx) => (
                    <optgroup key={idx} label={`หมวด: ${cat.category}`}>
                      {cat.types.map((t, tIdx) => (
                        <option key={tIdx} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="ยานพาหนะเฉพาะกิจอื่นๆ">ยานพาหนะเฉพาะกิจอื่นๆ (ระบุเอง)</option>
                </select>

                {selectedTypeDetail && (
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] p-2.5 rounded-xl border border-[var(--border-lighter)] space-y-1">
                    <p className="font-medium text-[11px] leading-relaxed">
                      <span className="font-bold text-[var(--text-primary)]">ลักษณะภารกิจ: </span>
                      {selectedTypeDetail.description}
                    </p>
                    {selectedTypeDetail.standardModel && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-lighter)] flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          รุ่นมาตรฐาน ปภ.: {selectedTypeDetail.standardModel}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const [sBrand, ...sModel] = (selectedTypeDetail.standardModel || '').split(' / ')[0].split(' ');
                            setVehicleForm({
                              ...vehicleForm,
                              brand: sBrand,
                              model: sModel.join(' ')
                            });
                          }}
                          className="text-[10px] font-bold text-[var(--primary-color)] hover:underline cursor-pointer"
                        >
                          ใช้ยี่ห้อ-รุ่นมาตรฐาน ปภ. อัตโนมัติ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 3: Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    ยี่ห้อ (Brand) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น THAI RUNG, TOYOTA, ISUZU, HINO, KOMATSU"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    รุ่น (Model)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น TR TRANSFORMER II (4x4), FVR 240, PC200-10"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              {/* Grid 4: Department, Mileage & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    สังกัดฝ่าย / กลุ่มงาน *
                  </label>
                  <select
                    value={vehicleForm.department}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, department: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  >
                    <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
                    {systemDepartments.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                    {vehicleForm.department && !systemDepartments.includes(vehicleForm.department) && (
                      <option value={vehicleForm.department}>{vehicleForm.department}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    {isDDPMHeavyMachinery(vehicleForm.vehicle_type) ? 'ชม.ทำงาน / เลขไมล์' : 'เลขไมล์ปัจจุบัน (กม.)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleForm.current_mileage}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, current_mileage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    สถานะความพร้อมใช้งาน
                  </label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value as any })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
                  >
                    <option value="active">พร้อมใช้งาน (Active)</option>
                    <option value="maintenance">แจ้งซ่อม / ปรับปรุง (Maintenance)</option>
                    <option value="inactive">ระงับการใช้งาน (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Grid 5: Responsible Person (ผู้รับผิดชอบ) - Integrated with Users */}
              <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[var(--primary-color)]" />
                      <span>ผู้รับผิดชอบยานพาหนะ</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      ดึงข้อมูลจากบุคลากรในระบบ (User) หรือระบุผู้ดูแลและเบอร์ติดต่อประจำยานพาหนะ
                    </p>
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        const myFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                        setVehicleForm(prev => ({
                          ...prev,
                          responsible_user_id: String(user.id || user.username),
                          responsible_person: myFullName,
                          responsible_position: user.position || prev.responsible_position,
                          responsible_phone: user.phone || prev.responsible_phone,
                          department: user.department ? user.department : prev.department
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] text-[11px] font-bold transition-all flex items-center gap-1 w-fit cursor-pointer shrink-0"
                      title="กำหนดตัวฉันเป็นผู้รับผิดชอบยานพาหนะคันนี้"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>กำหนดเป็นตัวฉัน ({user.firstName || user.username})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Select from System Users */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      เลือกจากบุคลากรในระบบ ({usersList.length} คน)
                    </label>
                    <select
                      value={vehicleForm.responsible_user_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setVehicleForm(prev => ({
                            ...prev,
                            responsible_user_id: '',
                            responsible_person: '',
                            responsible_position: ''
                          }));
                          return;
                        }
                        const found = usersList.find(u => String(u.id) === val || u.username === val);
                        if (found) {
                          const fullName = `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.username;
                          setVehicleForm(prev => ({
                            ...prev,
                            responsible_user_id: String(found.id || found.username),
                            responsible_person: fullName,
                            responsible_position: found.position || prev.responsible_position,
                            responsible_phone: found.phone || prev.responsible_phone,
                            // If vehicle department is not set, adopt user's department
                            department: !prev.department && found.department ? found.department : (found.department || prev.department)
                          }));
                        }
                      }}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                    >
                      <option value="">-- เลือกบุคลากรในระบบ (User) --</option>
                      {usersList.map((u) => {
                        const uName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                        return (
                          <option key={u.id} value={String(u.id || u.username)}>
                            {uName} {u.position ? `(${u.position})` : ''} {u.department ? `- ${u.department}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Direct Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      ชื่อ-นามสกุล ผู้รับผิดชอบ (แก้ไขหรือระบุเพิ่มเติมได้)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="เช่น นายสมบูรณ์ ปฏิบัติการ"
                        value={vehicleForm.responsible_person}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, responsible_person: e.target.value })}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 pr-8 text-xs text-[var(--text-primary)] outline-none"
                      />
                      {vehicleForm.responsible_person && (
                        <button
                          type="button"
                          onClick={() => setVehicleForm(prev => ({
                            ...prev,
                            responsible_user_id: '',
                            responsible_person: '',
                            responsible_position: '',
                            responsible_phone: ''
                          }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-rose-500"
                          title="ล้างข้อมูลผู้รับผิดชอบ"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      ตำแหน่งผู้รับผิดชอบ / พนักงานขับรถ
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น พนักงานขับเครื่องจักรกลขนาดหนัก, เจ้าพนักงาน ปภ."
                      value={vehicleForm.responsible_position}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, responsible_position: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      เบอร์โทรศัพท์ติดต่อ (ผู้รับผิดชอบ)
                    </label>
                    <input
                      type="tel"
                      placeholder="เช่น 081-234-5678"
                      value={vehicleForm.responsible_phone}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, responsible_phone: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-lighter)]">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingVehicle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingVehicle ? 'บันทึกการแก้ไข' : 'เพิ่มยานพาหนะ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Lightbox Preview Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-[var(--bg-card)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col cursor-default"
          >
            <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-light)] flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">
                  {lightboxImage.title}
                </h4>
                {lightboxImage.subtitle && (
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {lightboxImage.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="ดาวน์โหลดหรือเปิดดูรูปภาพต้นฉบับ"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">เปิดต้นฉบับ</span>
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 bg-black/95 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.title} 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Helper functions for Thai date-time
// ==========================================
const formatThaiDateTime = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return dateTimeStr;
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
};

const getNowISO = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
};

const getYesterdayISO = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

const InspectionForm: React.FC<{ 
  vehicle: Vehicle; 
  user: any; 
  usersList?: any[];
  onBack: () => void;
  onComplete: () => void;
}> = ({ vehicle, user, usersList = [], onBack, onComplete }) => {
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [mileage, setMileage] = useState(vehicle.current_mileage || 0);

  const currentUserFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '';
  const defaultDriver = currentUserFullName;
  const defaultVerifier = vehicle.responsible_person || currentUserFullName;
  const [driverName, setDriverName] = useState(defaultDriver);
  const [verifierName, setVerifierName] = useState(defaultVerifier);

  const [results, setResults] = useState<Record<string, any>>({
    '1_body': { status: 'normal', note: '' },
    '2_tires': { status: 'normal', note: '' },
    '3_radiator': { status: 'normal', low: false, refilled: false, frequent: false, note: '' },
    '4_hose': { status: 'normal', note: '' },
    '5_belt': { status: 'normal', note: '' },
    '6_brake_fluid': { status: 'normal', refilled: false, frequent: false, note: '' },
    '7_battery_water': { status: 'normal', refilled: false, frequent: false, note: '' },
    '8_engine_oil': { status: 'normal', frequent: false, mixed: false, note: '' },
    '9_engine_start': { status: 'normal', subStatus: '', note: '' },
    '10_brake': { status: 'normal', note: '' },
    '11_clutch': { status: 'normal', note: '' },
    '12_steering': { status: 'normal', note: '' },
    '13_horn': { status: 'normal', note: '' },
    '14_lights': { status: 'normal', note: '' },
    '15_wiper': { status: 'normal', note: '' },
    '17_fuel': { level: 'half' },
    '18_air': { status: 'normal', note: '' },
    '19_cleanliness': { status: 'done', note: '' },
    '20_last_used': { note: '' },
    '21_others': { note: '' }
  });

  const updateResult = (key: string, value: any) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], ...value }
    }));
  };

  // Quick button to mark all items in current step as normal
  const markStepAsAllNormal = (step: number) => {
    if (step === 1) {
      setResults(prev => ({
        ...prev,
        '1_body': { ...prev['1_body'], status: 'normal' },
        '2_tires': { ...prev['2_tires'], status: 'normal' },
        '3_radiator': { ...prev['3_radiator'], status: 'normal', low: false },
        '4_hose': { ...prev['4_hose'], status: 'normal' },
        '5_belt': { ...prev['5_belt'], status: 'normal' },
        '6_brake_fluid': { ...prev['6_brake_fluid'], status: 'normal' },
        '7_battery_water': { ...prev['7_battery_water'], status: 'normal' },
        '8_engine_oil': { ...prev['8_engine_oil'], status: 'normal', frequent: false, mixed: false }
      }));
    } else if (step === 2) {
      setResults(prev => ({
        ...prev,
        '9_engine_start': { ...prev['9_engine_start'], status: 'normal', subStatus: '' },
        '10_brake': { ...prev['10_brake'], status: 'normal' },
        '11_clutch': { ...prev['11_clutch'], status: 'normal' },
        '12_steering': { ...prev['12_steering'], status: 'normal' },
        '13_horn': { ...prev['13_horn'], status: 'normal' },
        '14_lights': { ...prev['14_lights'], status: 'normal' },
        '15_wiper': { ...prev['15_wiper'], status: 'normal' }
      }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const hasIssues = Object.entries(results).some(([k, v]: [string, any]) => {
        if (!v) return false;
        if (v.status === 'not_normal' || v.status === 'not_done' || v.status === 'hard' || v.status === 'wont_start') return true;
        if (v.note && v.note.trim() && k !== '20_last_used' && k !== '21_others') return true;
        return false;
      });

      const res = await fetch('/api/vehicle-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          inspector_id: user.username,
          inspector_name: verifierName.trim() || currentUserFullName,
          inspector_position: user.position || 'เจ้าหน้าที่ตรวจสภาพ',
          mileage: mileage,
          results: {
            ...results,
            driver_name: driverName.trim(),
            verifier_name: verifierName.trim()
          },
          status: hasIssues ? 'issues_found' : 'passed'
        })
      });

      if (res.ok) {
        alert(hasIssues ? 'บันทึกรายงานการตรวจรถเรียบร้อยแล้ว (ตรวจพบรายการที่ผิดปกติ/ชำรุด ระบบได้บันทึกรายงานปัญหาแล้ว)' : 'บันทึกรายงานการตรวจรถประจำวันเรียบร้อยแล้ว');
        onComplete();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'ก่อนติดเครื่องยนต์', subtitle: 'รายการที่ 1-8', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 2, title: 'เมื่อติดเครื่องยนต์แล้ว', subtitle: 'รายการที่ 9-15', icon: <Zap className="w-5 h-5" /> },
    { id: 3, title: 'สรุปผล & ส่งรายงาน', subtitle: 'ผู้ลงนาม, เลขไมล์, น้ำมัน', icon: <FileCheck className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Form Top Header Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-2xl transition-all active:scale-95 cursor-pointer"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                แบบบันทึกรายงานการตรวจรถประจำวัน
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-black">
                {vehicle.license_plate}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              {vehicle.brand} {vehicle.model} • {vehicle.province}
              {vehicle.department && ` • ฝ่าย: ${vehicle.department}`}
              {driverName && ` • พขร. ผู้รายงาน: ${driverName}`}
              {verifierName && ` • ผู้ตรวจ: ${verifierName}`}
            </p>
          </div>
        </div>

        {currentStep === 3 && (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันและส่งรายงาน</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Stepper Navigation */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {steps.map(step => {
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left ${
                  isActive 
                    ? 'bg-[var(--primary-color)] text-white shadow-sm' 
                    : isPassed
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-light)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : isPassed ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-canvas)] text-[var(--text-muted)]'
                }`}>
                  {isPassed ? <Check className="w-4 h-4" /> : step.icon}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-xs font-bold truncate leading-tight">{step.title}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{step.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Tool: Mark all normal */}
      {currentStep < 3 && (
        <div className="flex items-center justify-between bg-[var(--bg-elevated)] px-4 py-2.5 rounded-2xl border border-[var(--border-light)] text-xs">
          <span className="text-[var(--text-muted)] font-medium">ทางลัดการตรวจ: หากทุกจุดตรวจผ่านตามเกณฑ์มาตรฐาน</span>
          <button
            type="button"
            onClick={() => markStepAsAllNormal(currentStep)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ตั้งค่าทุกรายการในขั้นตอนนี้เป็น "ปกติ"</span>
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[420px]">
        {/* Step 1: Before Engine Start */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InspectionItem 
                num={1} 
                title="สภาพตัวถัง / สี"
                status={results['1_body']?.status}
                onStatusChange={(s) => updateResult('1_body', { status: s })}
                note={results['1_body']?.note}
                onNoteChange={(n) => updateResult('1_body', { note: n })}
                notePlaceholder="ระบุรอยยุบ สีถลอก ชน ชำรุด หรือตำหนิตัวถังที่พบ..."
              />

              <InspectionItem 
                num={2} 
                title="ลมยางและสภาพยาง"
                status={results['2_tires']?.status}
                onStatusChange={(s) => updateResult('2_tires', { status: s })}
                note={results['2_tires']?.note}
                onNoteChange={(n) => updateResult('2_tires', { note: n })}
                notePlaceholder="ระบุล้อที่มีปัญหา ความดันลมอ่อน ยางแบน หรือดอกยางสึก..."
              />

              <InspectionItem 
                num={3} 
                title="น้ำในหม้อน้ำ / น้ำยาหล่อเย็น"
                status={results['3_radiator']?.status}
                onStatusChange={(s) => updateResult('3_radiator', { status: s })}
                note={results['3_radiator']?.note}
                onNoteChange={(n) => updateResult('3_radiator', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น น้ำแห้งผิดปกติ ต่ำกว่าระดับ Min พบคราบน้ำรั่วซึม..."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <CheckChip label="ระดับปกติ" active={results['3_radiator']?.status === 'normal'} onClick={() => updateResult('3_radiator', { status: 'normal', low: false })} />
                  <CheckChip label="ต่ำกว่าระดับ" active={results['3_radiator']?.status === 'not_normal' || results['3_radiator']?.low} onClick={() => updateResult('3_radiator', { status: 'not_normal', low: true })} />
                  <CheckChip label="เติมแล้ว" active={results['3_radiator']?.refilled} onClick={() => updateResult('3_radiator', { refilled: !results['3_radiator']?.refilled })} />
                  <CheckChip label="ขาดบ่อย" active={results['3_radiator']?.frequent} onClick={() => updateResult('3_radiator', { frequent: !results['3_radiator']?.frequent, status: 'not_normal' })} />
                </div>
              </InspectionItem>

              <InspectionItem 
                num={4} 
                title="ท่อยางหม้อน้ำ" 
                status={results['4_hose']?.status}
                onStatusChange={(s) => updateResult('4_hose', { status: s })}
                note={results['4_hose']?.note}
                onNoteChange={(n) => updateResult('4_hose', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น ท่อยางบวม แตกลายงา แข็งกรอบ หรือมีคราบน้ำรั่วซึม..."
              />

              <InspectionItem 
                num={5} 
                title="สายพานเครื่องยนต์" 
                status={results['5_belt']?.status}
                onStatusChange={(s) => updateResult('5_belt', { status: s })}
                note={results['5_belt']?.note}
                onNoteChange={(n) => updateResult('5_belt', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น สายพานหย่อน มีเสียงดังเอี๊ยด หรือเนื้อยางแตกลายงา..."
              />

              <InspectionItem 
                num={6} 
                title="น้ำมันครัช / เบรก"
                status={results['6_brake_fluid']?.status}
                onStatusChange={(s) => updateResult('6_brake_fluid', { status: s })}
                note={results['6_brake_fluid']?.note}
                onNoteChange={(n) => updateResult('6_brake_fluid', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น น้ำมันลดฮวบ ต่ำกว่าระดับ Min หรือมีรอยน้ำมันรั่วซึม..."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <CheckChip label="ระดับปกติ" active={results['6_brake_fluid']?.status === 'normal'} onClick={() => updateResult('6_brake_fluid', { status: 'normal' })} />
                  <CheckChip label="เติมแล้ว" active={results['6_brake_fluid']?.refilled} onClick={() => updateResult('6_brake_fluid', { refilled: !results['6_brake_fluid']?.refilled })} />
                  <CheckChip label="ขาดบ่อย" active={results['6_brake_fluid']?.frequent} onClick={() => updateResult('6_brake_fluid', { frequent: !results['6_brake_fluid']?.frequent, status: 'not_normal' })} />
                </div>
              </InspectionItem>

              <InspectionItem 
                num={7} 
                title="น้ำกลั่นแบตเตอรี่"
                status={results['7_battery_water']?.status}
                onStatusChange={(s) => updateResult('7_battery_water', { status: s })}
                note={results['7_battery_water']?.note}
                onNoteChange={(n) => updateResult('7_battery_water', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น น้ำกลั่นแห้ง มีขี้เกลือเกาะที่ขั้ว หรือแบตเตอรี่บวม..."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <CheckChip label="ระดับปกติ" active={results['7_battery_water']?.status === 'normal'} onClick={() => updateResult('7_battery_water', { status: 'normal' })} />
                  <CheckChip label="เติมแล้ว" active={results['7_battery_water']?.refilled} onClick={() => updateResult('7_battery_water', { refilled: !results['7_battery_water']?.refilled })} />
                  <CheckChip label="ขาดบ่อย" active={results['7_battery_water']?.frequent} onClick={() => updateResult('7_battery_water', { frequent: !results['7_battery_water']?.frequent, status: 'not_normal' })} />
                </div>
              </InspectionItem>

              <InspectionItem 
                num={8} 
                title="น้ำมันเครื่อง"
                status={results['8_engine_oil']?.status}
                onStatusChange={(s) => updateResult('8_engine_oil', { status: s })}
                note={results['8_engine_oil']?.note}
                onNoteChange={(n) => updateResult('8_engine_oil', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น น้ำมันเครื่องดำคล้ำมาก พร่องต่ำกว่าขีด L หรือมีสิ่งเจือปน..."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <CheckChip label="ระดับปกติ" active={results['8_engine_oil']?.status === 'normal'} onClick={() => updateResult('8_engine_oil', { status: 'normal', frequent: false, mixed: false })} />
                  <CheckChip label="ขาดบ่อย" active={results['8_engine_oil']?.frequent} onClick={() => updateResult('8_engine_oil', { frequent: !results['8_engine_oil']?.frequent, status: 'not_normal' })} />
                  <CheckChip label="มีสิ่งเจือปน" active={results['8_engine_oil']?.mixed} onClick={() => updateResult('8_engine_oil', { mixed: !results['8_engine_oil']?.mixed, status: 'not_normal' })} />
                </div>
              </InspectionItem>
            </div>
          </div>
        )}

        {/* Step 2: After Engine Start */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InspectionItem 
                num={9} 
                title="การติดเครื่องยนต์"
                status={results['9_engine_start']?.status}
                onStatusChange={(s) => updateResult('9_engine_start', { status: s })}
                note={results['9_engine_start']?.note}
                onNoteChange={(n) => updateResult('9_engine_start', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น บิดกุญแจแล้วเงียบ ไดสตาร์ตหมุนอืด สตาร์ตหลายครั้ง..."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <CheckChip label="ปกติ" active={results['9_engine_start']?.status === 'normal'} onClick={() => updateResult('9_engine_start', { status: 'normal', subStatus: '' })} />
                  <CheckChip label="ติดยาก" active={results['9_engine_start']?.subStatus === 'hard' || (results['9_engine_start']?.status === 'not_normal' && results['9_engine_start']?.subStatus !== 'wont_start')} onClick={() => updateResult('9_engine_start', { status: 'not_normal', subStatus: 'hard' })} />
                  <CheckChip label="ไม่ติด" active={results['9_engine_start']?.subStatus === 'wont_start'} onClick={() => updateResult('9_engine_start', { status: 'not_normal', subStatus: 'wont_start' })} />
                </div>
              </InspectionItem>

              <InspectionItem 
                num={10} 
                title="ระบบเบรก (ลองเหยียบเบรกดู)"
                status={results['10_brake']?.status}
                onStatusChange={(s) => updateResult('10_brake', { status: s })}
                note={results['10_brake']?.note}
                onNoteChange={(n) => updateResult('10_brake', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น เบรกลึก เบรกจม เบรกแล้วปัด แป้นเบรกสั่น มีเสียงดัง..."
              />

              <InspectionItem 
                num={11} 
                title="ระบบครัช (ลองเหยียบคลัตช์ดู)"
                status={results['11_clutch']?.status}
                onStatusChange={(s) => updateResult('11_clutch', { status: s })}
                note={results['11_clutch']?.note}
                onNoteChange={(n) => updateResult('11_clutch', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น คลัตช์จม คลัตช์ลื่น เข้าเกียร์ยาก แป้นคลัตช์แข็งผิดปกติ..."
              />

              <InspectionItem 
                num={12} 
                title="พวงมาลัย (ระยะฟรี/เสียง)"
                status={results['12_steering']?.status}
                onStatusChange={(s) => updateResult('12_steering', { status: s })}
                note={results['12_steering']?.note}
                onNoteChange={(n) => updateResult('12_steering', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น พวงมาลัยหนัก เลี้ยวมีเสียงดัง ระยะฟรีมาก พวงมาลัยดึงข้าง..."
              />

              <InspectionItem 
                num={13} 
                title="แตรสัญญาณ"
                status={results['13_horn']?.status}
                onStatusChange={(s) => updateResult('13_horn', { status: s })}
                note={results['13_horn']?.note}
                onNoteChange={(n) => updateResult('13_horn', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น แตรไม่ดังเลย เสียงเบามาก หรือเสียงแตกผิดปกติ..."
              />

              <InspectionItem 
                num={14} 
                title="ดวงไฟสัญญาณต่างๆ (ไฟเลี้ยว/ไฟหน้า/ไฟเบรก)"
                status={results['14_lights']?.status}
                onStatusChange={(s) => updateResult('14_lights', { status: s })}
                note={results['14_lights']?.note}
                onNoteChange={(n) => updateResult('14_lights', { note: n })}
                notePlaceholder="ระบุจุดที่หลอดไฟขาด หรือไม่ติด (เช่น ไฟหน้าซ้าย, ไฟเลี้ยวขวา, ไฟเบรก)..."
              />

              <InspectionItem 
                num={15} 
                title="ที่ปัดน้ำฝนและน้ำฉีดกระจก"
                status={results['15_wiper']?.status}
                onStatusChange={(s) => updateResult('15_wiper', { status: s })}
                note={results['15_wiper']?.note}
                onNoteChange={(n) => updateResult('15_wiper', { note: n })}
                notePlaceholder="ระบุปัญหา เช่น ยางปัดฉีกขาด ปัดไม่เกลี้ยง ปัดสะดุด น้ำฉีดกระจกไม่ออก..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Final Mileage, Fuel & Summary */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Mileage & Fuel Card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-lighter)]">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--text-primary)]">ข้อมูลเลขไมล์และระดับน้ำมัน</h4>
                  <p className="text-xs text-[var(--text-muted)]">บันทึกตัวเลขกิโลเมตรและปริมาณน้ำมันในถัง</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  16. เลขไมล์ กม. วันนี้ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    value={mileage}
                    onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                    className="w-full py-3.5 pl-4 pr-14 bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-2xl text-xl font-black text-[var(--text-primary)] outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                    กม. (KM)
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  เลขไมล์เดิม: {Number(vehicle.current_mileage || 0).toLocaleString()} กม.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  17. ระดับน้ำมันเชื้อเพลิง
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'empty', label: 'ต่ำกว่า 1/4' },
                    { id: 'quarter', label: '1 ใน 4 ถัง' },
                    { id: 'half', label: 'ครึ่งถัง (1/2)' },
                    { id: 'full', label: 'เต็มถัง (Full)' }
                  ].map(fuelOption => (
                    <button
                      key={fuelOption.id}
                      type="button"
                      onClick={() => updateResult('17_fuel', { level: fuelOption.id })}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        results['17_fuel'].level === fuelOption.id
                          ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-xs'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {fuelOption.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Environmental & Notes Card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 space-y-5 shadow-xs">
              <div className="space-y-4">
                <InspectionItem 
                  num={18} 
                  title="ระบบแอร์รถยนต์"
                  status={results['18_air']?.status}
                  onStatusChange={(s) => updateResult('18_air', { status: s })}
                  note={results['18_air']?.note}
                  onNoteChange={(n) => updateResult('18_air', { note: n })}
                  notePlaceholder="ระบุปัญหา เช่น แอร์ไม่เย็น ลมเป่าเบา มีกลิ่นเหม็นอับ คอมแอร์เสียงดัง..."
                />

                <InspectionItem 
                  num={19} 
                  title="ความสะอาดทั่วไปของรถ"
                  status={results['19_cleanliness']?.status === 'done' || results['19_cleanliness']?.status === 'normal' ? 'normal' : 'not_normal'}
                  onStatusChange={(s) => updateResult('19_cleanliness', { status: s === 'normal' ? 'done' : 'not_normal' })}
                  note={results['19_cleanliness']?.note}
                  onNoteChange={(n) => updateResult('19_cleanliness', { note: n })}
                  notePlaceholder="ระบุจุดที่ไม่สะอาด เช่น ตัวถังเปื้อนโคลน, ภายในห้องโดยสารสกปรก..."
                >
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => updateResult('19_cleanliness', { status: 'done' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        results['19_cleanliness']?.status === 'done' || results['19_cleanliness']?.status === 'normal'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-light)]'
                      }`}
                    >
                      ✓ ทำความสะอาดแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => updateResult('19_cleanliness', { status: 'not_normal' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        results['19_cleanliness']?.status === 'not_normal' || results['19_cleanliness']?.status === 'not_done'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-light)]'
                      }`}
                    >
                      ยังไม่ได้ทำ / ไม่สะอาด
                    </button>
                  </div>
                </InspectionItem>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)] space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>20. ใช้รถครั้งสุดท้ายเมื่อ</span>
                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">เลือกปฏิทินและเวลา</span>
                  </label>
                  {results['20_last_used']?.note && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                      ✓ {results['20_last_used'].note}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <input 
                      type="datetime-local"
                      value={results['20_last_used']?.datetime || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const formatted = formatThaiDateTime(val);
                        updateResult('20_last_used', { datetime: val, note: formatted || val });
                      }}
                      className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] font-bold outline-none cursor-pointer"
                    />
                  </div>

                  <input 
                    type="text"
                    placeholder="ข้อความที่บันทึก เช่น 23 ก.ย. 2569 เวลา 16:30 น."
                    value={results['20_last_used']?.note || ''}
                    onChange={(e) => updateResult('20_last_used', { ...results['20_last_used'], note: e.target.value })}
                    className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none font-medium"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold">ปุ่มเลือกเวลาด่วน:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getNowISO();
                      updateResult('20_last_used', { datetime: iso, note: formatThaiDateTime(iso) });
                    }}
                    className="px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-[var(--border-light)] text-[var(--text-secondary)] font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>ปัจจุบัน ({formatThaiDateTime(getNowISO())})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const iso = getYesterdayISO();
                      updateResult('20_last_used', { datetime: iso, note: formatThaiDateTime(iso) });
                    }}
                    className="px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg border border-[var(--border-light)] text-[var(--text-secondary)] font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>เมื่อวานนี้</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  21. อื่นๆ / หมายเหตุเพิ่มเติม
                </label>
                <textarea 
                  placeholder="ระบุข้อสังเกตเพิ่มเติม (ถ้ามี)..."
                  value={results['21_others']?.note || ''}
                  onChange={(e) => updateResult('21_others', { note: e.target.value })}
                  className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Signatories Selection Card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 space-y-5 shadow-xs md:col-span-2">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-lighter)]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--text-primary)]">
                    ผู้ลงนามรายงาน (พขร. ผู้รายงาน และ ผู้ตรวจสอบ)
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    เลือกหรือระบุชื่อผู้ใช้งานที่จะนำไปแสดงในแบบพิมพ์รายงานตรวจความเรียบร้อยรถยนต์ประจำวัน
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. พขร. ผู้รายงาน */}
                <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[var(--text-primary)]">
                      พนักงานขับรถ / ผู้รายงาน (พขร.) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      พขร. ผู้รายงาน
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    แสดงในช่อง <strong>( ..................... ) พขร. ผู้รายงาน</strong>
                  </p>
                  
                  {usersList && usersList.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <select
                        value={usersList.some(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === driverName || u.username === driverName) ? driverName : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setDriverName(e.target.value);
                          }
                        }}
                        className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] font-medium outline-none cursor-pointer"
                      >
                        <option value="" disabled>-- เลือกรายชื่อ User ในระบบ --</option>
                        {usersList.map((u, idx) => {
                          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                          return (
                            <option key={u.id || idx} value={fullName}>
                              {fullName} {u.position ? `(${u.position})` : ''} {u.department ? `- ${u.department}` : ''}
                            </option>
                          );
                        })}
                        <option value="__custom__">✏️ ระบุชื่อ-นามสกุลเองอิสระ</option>
                      </select>

                      {(!usersList.some(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === driverName || u.username === driverName) || driverName === '') && (
                        <input
                          type="text"
                          placeholder="พิมพ์ชื่อ-นามสกุล พขร. ผู้รายงาน"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อ-นามสกุล พขร. ผู้รายงาน"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
                    />
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {vehicle.responsible_person && (
                      <button
                        type="button"
                        onClick={() => setDriverName(vehicle.responsible_person || '')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] border border-[var(--border-light)] transition-all cursor-pointer"
                      >
                        👤 ผู้รับผิดชอบรถ ({vehicle.responsible_person})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDriverName(currentUserFullName)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] transition-all cursor-pointer font-bold"
                    >
                      🙋 บัญชีนี้ ({currentUserFullName})
                    </button>
                  </div>
                </div>

                {/* 2. ผู้ตรวจสอบ */}
                <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[var(--text-primary)]">
                      ผู้ตรวจสอบ (ผู้ตรวจ) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                      ลงนาม ผู้ตรวจ
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    แสดงในช่อง <strong>( ..................... ) ลงนาม ผู้ตรวจ</strong>
                  </p>

                  {usersList && usersList.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <select
                        value={usersList.some(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === verifierName || u.username === verifierName) ? verifierName : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setVerifierName(e.target.value);
                          }
                        }}
                        className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] font-medium outline-none cursor-pointer"
                      >
                        <option value="" disabled>-- เลือกรายชื่อ User ในระบบ --</option>
                        {usersList.map((u, idx) => {
                          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                          return (
                            <option key={u.id || idx} value={fullName}>
                              {fullName} {u.position ? `(${u.position})` : ''} {u.department ? `- ${u.department}` : ''}
                            </option>
                          );
                        })}
                        <option value="__custom__">✏️ ระบุชื่อ-นามสกุลเองอิสระ</option>
                      </select>

                      {(!usersList.some(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === verifierName || u.username === verifierName) || verifierName === '') && (
                        <input
                          type="text"
                          placeholder="พิมพ์ชื่อ-นามสกุล ผู้ตรวจสอบ"
                          value={verifierName}
                          onChange={(e) => setVerifierName(e.target.value)}
                          className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อ-นามสกุล ผู้ตรวจสอบ"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-light)] focus:border-[var(--primary-color)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
                    />
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {vehicle.responsible_person && (
                      <button
                        type="button"
                        onClick={() => setVerifierName(vehicle.responsible_person || '')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/20 transition-all cursor-pointer font-bold"
                      >
                        👤 ผู้รับผิดชอบรถ ({vehicle.responsible_person})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setVerifierName(currentUserFullName)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] border border-[var(--border-light)] transition-all cursor-pointer"
                    >
                      🙋 บัญชีนี้ ({currentUserFullName})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-lighter)]">
        <button
          type="button"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>ย้อนกลับ</span>
        </button>

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>ดำเนินการต่อไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งรายงาน...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกและส่งรายงาน</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Inspection History Component
// ==========================================
const InspectionHistory: React.FC<{ 
  vehicle: Vehicle; 
  user: any; 
  onBack: () => void;
  onViewReport: (report: Inspection) => void;
  onStartNewInspection: () => void;
}> = ({ vehicle, user, onBack, onViewReport, onStartNewInspection }) => {
  const { confirm } = useConfirm();
  const [history, setHistory] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/inspections`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [vehicle.id]);

  const handleDeleteInspection = async (e: React.MouseEvent, inspection: Inspection) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'ยืนยันการลบประวัติการตรวจความเรียบร้อย',
      message: `คุณต้องการลบประวัติการตรวจความเรียบร้อยของรถยนต์ทะเบียน "${vehicle.license_plate}" รอบนี้ใช่หรือไม่?`,
      description: 'ข้อมูลผลการตรวจสภาพ ข้อบกพร่อง และประวัติเลขไมล์ของรอบนี้จะถูกลบออกจากระบบอย่างถาวร',
      itemDetail: `วันที่ตรวจ: ${formatThaiDate(inspection.submitted_at)} • ผู้ตรวจ: ${inspection.inspector_name || 'ไม่ระบุ'}${inspection.inspector_position ? ` (${inspection.inspector_position})` : ''} • เลขไมล์: ${Number(inspection.mileage || 0).toLocaleString()} กม.`,
      type: 'delete',
      confirmText: 'ยืนยันการลบประวัติ',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;
    
    try {
      const res = await fetch(`/api/vehicle-inspections/${inspection.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistory(prev => prev.filter(h => h.id !== inspection.id));
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (err) {
      console.error('Delete inspection error:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-2xl transition-all active:scale-95 cursor-pointer"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                ประวัติการตรวจความเรียบร้อย
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-black">
                {vehicle.license_plate}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
              {vehicle.brand} {vehicle.model} • {vehicle.province} • มีประวัติบันทึกทั้งหมด {history.length} รายการ
            </p>
          </div>
        </div>

        <button 
          onClick={onStartNewInspection}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกตรวจสภาพใหม่</span>
        </button>
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-light)]">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
            <History className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
            ยังไม่มีประวัติการตรวจสภาพสำหรับยานพาหนะนี้
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5">
            เมื่อเจ้าหน้าที่หรือผู้ขับขี่ทำรายงานตรวจสภาพรถประจำวัน ข้อมูลจะแสดงบันทึกที่นี่
          </p>
          <button
            onClick={onStartNewInspection}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl text-xs font-bold shadow-md"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>เริ่มบันทึกตรวจสภาพประจำวัน</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, idx) => {
            const itemResults = typeof item.results === 'string' ? JSON.parse(item.results || '{}') : (item.results || {});
            const issueList: { name: string; note: string }[] = [];
            
            const fieldTitles: Record<string, string> = {
              '1_body': 'สภาพตัวถัง/สี',
              '2_tires': 'ลมยางและสภาพยาง',
              '3_radiator': 'น้ำในหม้อน้ำ',
              '4_hose': 'ท่อยางหม้อน้ำ',
              '5_belt': 'สายพานเครื่องยนต์',
              '6_brake_fluid': 'น้ำมันครัช/เบรก',
              '7_battery_water': 'น้ำกลั่นแบตเตอรี่',
              '8_engine_oil': 'น้ำมันเครื่อง',
              '9_engine_start': 'การติดเครื่องยนต์',
              '10_brake': 'ระบบเบรก',
              '11_clutch': 'ระบบครัช',
              '12_steering': 'พวงมาลัย',
              '13_horn': 'แตรสัญญาณ',
              '14_lights': 'ดวงไฟสัญญาณ',
              '15_wiper': 'ที่ปัดน้ำฝน',
              '18_air': 'ระบบแอร์',
              '19_cleanliness': 'ความสะอาดรถ'
            };

            Object.entries(itemResults).forEach(([k, v]: [string, any]) => {
              if (!v) return;
              const isAbnormal = v.status === 'not_normal' || v.status === 'not_done' || v.status === 'hard' || v.status === 'wont_start';
              const hasNote = v.note && v.note.trim() && k !== '20_last_used' && k !== '21_others';
              if (isAbnormal || hasNote) {
                issueList.push({
                  name: fieldTitles[k] || k,
                  note: v.note || (v.status === 'not_normal' ? 'ไม่ปกติ' : v.status === 'not_done' ? 'ยังไม่ได้ทำความสะอาด' : '')
                });
              }
            });

            const hasDefects = issueList.length > 0;

            const formatThaiDateTimeWithBE = (dateStr?: string) => {
              if (!dateStr) return '';
              try {
                const normalized = String(dateStr).trim().replace(' ', 'T');
                const d = new Date(normalized);
                if (!isNaN(d.getTime())) {
                  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
                  const day = d.getDate();
                  const month = months[d.getMonth()];
                  const rawYear = d.getFullYear();
                  const year = rawYear < 2400 ? rawYear + 543 : rawYear;
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  return `${day} ${month} พ.ศ. ${year} เวลา ${hours}:${minutes} น.`;
                }
              } catch (e) {
                // fallback
              }
              return formatThaiDate(dateStr) || '';
            };

            const formattedDateTime = formatThaiDateTimeWithBE(item.submitted_at);

            return (
              <div 
                key={item.id}
                onClick={() => onViewReport(item)}
                className={`bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] border p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group ${
                  hasDefects ? 'border-rose-400/40 hover:border-rose-500' : 'border-[var(--border-light)] hover:border-[var(--primary-color)]/40'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                    hasDefects ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {hasDefects ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasDefects ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 flex-wrap">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>พบข้อบกพร่อง {issueList.length} รายการ</span>
                          {formattedDateTime && <span className="font-bold text-rose-600/80 dark:text-rose-400/80">({formattedDateTime})</span>}
                        </span>
                      ) : (
                        <span className="text-sm font-black text-[var(--text-primary)]">
                          หมายเลข: {vehicle.vehicle_number || '-'} | ยี่ห้อ / รุ่น: {vehicle.brand} {vehicle.model}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3.5 text-xs text-[var(--text-muted)] mt-2 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>ผู้ตรวจ: {item.inspector_name} {item.inspector_position ? `(${item.inspector_position})` : ''}</span>
                      </span>
                      {formattedDateTime && (
                        <span className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>วันที่ตรวจ: {formattedDateTime}</span>
                        </span>
                      )}
                    </div>

                    {/* Defect Preview Tags */}
                    {hasDefects && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {issueList.slice(0, 3).map((issue, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/5 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px]">
                            <span className="font-bold">{issue.name}:</span>
                            <span className="truncate max-w-[150px]">{issue.note || 'ไม่ปกติ'}</span>
                          </span>
                        ))}
                        {issueList.length > 3 && (
                          <span className="text-[10px] font-bold text-rose-500 self-center">
                            +{issueList.length - 3} รายการเพิ่มเติม
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--border-lighter)]">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">เลขไมล์ที่บันทึก</div>
                    <div className="text-sm font-black text-[var(--text-primary)]">
                      {Number(item.mileage || 0).toLocaleString()} <span className="text-[10px] text-[var(--text-muted)]">กม.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewReport(item); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--primary-color)] hover:text-white rounded-xl text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ดู/พิมพ์รายงาน</span>
                    </button>

                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => handleDeleteInspection(e, item)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="ลบรายงานนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-color)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. Helper UI Components
// ==========================================
const InspectionItem: React.FC<{ 
  num: number; 
  title: string; 
  status?: string; 
  onStatusChange?: (s: string) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
  notePlaceholder?: string;
  children?: React.ReactNode;
}> = ({ num, title, status, onStatusChange, note, onNoteChange, notePlaceholder, children }) => {
  const isNotNormal = status === 'not_normal';

  return (
    <div className={`p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 border ${
      isNotNormal 
        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 ring-2 ring-rose-500/15' 
        : 'bg-[var(--bg-surface)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            isNotNormal 
              ? 'bg-rose-600 text-white shadow-xs' 
              : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'
          }`}>
            {num}
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-relaxed">
              {title}
            </h4>
            {isNotNormal && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                พบปัญหา/ไม่ปกติ
              </span>
            )}
          </div>
        </div>

        {onStatusChange && (
          <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-xl border border-[var(--border-light)] shrink-0">
            <button 
              type="button"
              onClick={() => onStatusChange('normal')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                status === 'normal' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              ปกติ
            </button>
            <button 
              type="button"
              onClick={() => onStatusChange('not_normal')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                status === 'not_normal' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              ไม่ปกติ
            </button>
          </div>
        )}
      </div>

      {children}

      {/* Auto-render problem input if not normal and onNoteChange provided */}
      {isNotNormal && onNoteChange && (
        <div className="mt-3.5 pt-3 border-t border-rose-200 dark:border-rose-900/40 animate-fade-in space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>ระบุปัญหา / อาการชำรุดที่พบ :</span>
            <span className="text-[10px] font-medium text-rose-500/80">(ระบุรายละเอียดเพื่อแจ้งซ่อมบำรุง)</span>
          </label>
          <textarea 
            rows={2}
            placeholder={notePlaceholder || `ระบุรายละเอียดความผิดปกติหรืออาการชำรุดของ ${title}...`}
            value={note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            className="w-full p-2.5 text-xs bg-[var(--bg-canvas)] border border-rose-300 dark:border-rose-800/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all resize-none shadow-xs"
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

const CheckChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    type="button"
    onClick={(e) => { e.preventDefault(); onClick(); }}
    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
      active 
        ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-xs' 
        : 'bg-[var(--bg-canvas)] border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
    }`}
  >
    {label}
  </button>
);

// ==========================================
// 5. Official Thai A4 Print Form Component
// ==========================================
interface ReportPrintViewProps {
  vehicle: Vehicle;
  inspection: Inspection;
  user?: any;
  customDriverName?: string;
  customVerifierName?: string;
  customFormNumber?: string;
  fontSize?: 'sm' | 'base' | 'lg';
}

const ReportPrintView: React.FC<ReportPrintViewProps> = ({ 
  vehicle, 
  inspection, 
  user,
  customDriverName,
  customVerifierName,
  customFormNumber,
  fontSize = 'base'
}) => {
  const r = typeof inspection.results === 'string' ? JSON.parse(inspection.results) : (inspection.results || {});
  const date = new Date(inspection.submitted_at || Date.now());
  const day = date.getDate();
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", 
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear() + 543;

  // Determine Driver / Reporter Name (พขร. ผู้รายงาน - คนขับ/ผู้ตรวจสภาพที่รายงาน)
  const driverName = 
    customDriverName !== undefined ? customDriverName :
    (r?.driver_name || 
    r?.reporter_name || 
    (inspection as any)?.driver_name || 
    inspection.inspector_name || 
    (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 
    '');

  // Determine Verifier / Inspector Name (ลงนาม ผู้ตรวจ - ผู้รับผิดชอบรถ)
  const verifierName = 
    customVerifierName !== undefined ? customVerifierName :
    (r?.verifier_name || 
    vehicle.responsible_person || 
    r?.inspector_user_name || 
    (inspection as any)?.verifier_name || 
    '');

  const fontSizePx = fontSize === 'sm' ? '13px' : fontSize === 'lg' ? '16px' : '14.5px';

  return (
    <div className="sheet a4-page-sheet">
      <style>{`
        :root {
          --ink: #000;
          --line: #000;
        }
        .sheet {
          width: 100%;
          max-width: 210mm;
          background: #fff;
          padding: 8mm 9mm;
          box-shadow: none;
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          color: var(--ink);
          margin: 0 auto;
          box-sizing: border-box;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .sheet {
            box-shadow: none !important;
            padding: 8mm 9mm !important;
            width: 210mm !important;
          }
        }
        table.outer {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid var(--line);
          table-layout: fixed;
          font-size: ${fontSizePx};
          line-height: 1.42;
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          color: var(--ink);
        }
        table.outer col.c1 { width: 50%; }
        table.outer col.c2 { width: 50%; }
        table.outer > tbody > tr > td {
          border-left: 1px solid var(--line);
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          vertical-align: top;
          padding: 3px 7px;
          overflow: hidden;
        }
        .header-cell {
          text-align: center;
          padding: 6px 6px 5px !important;
        }
        .header-cell .t1 { font-size: 18px; font-weight: 700; display: block; margin-bottom: 2px; }
        .header-cell .t2 { display: block; margin-bottom: 1px; }
        .header-cell .t3 { display: block; }
        .dots { letter-spacing: 1px; }
        .col-head-row td { font-weight: 700; }
        .col-head-row td.blank-left { height: 22px; }
        .rules-cell u { text-underline-offset: 2px; }
        .rules-cell ol { margin: 3px 0 0 0; padding-left: 20px; }
        .rules-cell li { margin-bottom: 2px; }
        td.item-cell { padding: 3px 7px; }
        .item-num { font-weight: 700; }
        .opt-row { margin: 0 0 1px 2px; }
        .opt { display: inline-block; white-space: nowrap; margin-right: 26px; }
        .note-line { margin-left: 2px; }
        .full-dots-row td { height: 16px; padding: 2px 7px; }
        .footer-head td { font-weight: 700; }
        .footer-body td { vertical-align: top; padding: 4px 7px 6px; }
        .footer-body p { margin: 2px 0; }
        .footer-sign-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin: 3px 0 2px;
        }
        .footer-sign-col {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .footer-sign-dots-row {
          display: block;
          text-align: center;
          white-space: nowrap;
          line-height: 1.25;
        }
        .footer-sign-name-row {
          display: block;
          text-align: center;
          white-space: nowrap;
          margin-top: 2px;
          line-height: 1.25;
        }
        .footer-sign-role {
          white-space: nowrap;
          margin-left: 4px;
          line-height: 1.25;
        }
        .top-form-meta {
          text-align: right;
          font-size: 11px;
          color: #333;
          margin-bottom: 2px;
          font-weight: 600;
          line-height: 1;
        }
        .bottom-system-meta {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          font-size: 9px;
          color: #666;
          margin-top: 3px;
          line-height: 1;
        }
        .last-note { font-size: 13.5px; }

        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .page-wrap { padding: 0 !important; }
          .sheet { 
            box-shadow: none !important; 
            width: 100% !important; 
            min-height: auto !important; 
            padding: 4mm 6mm 2mm !important; 
            margin: 0 !important; 
          }
          @page { size: A4; margin: 6mm 7mm 4mm 7mm; }
        }
      `}</style>

      <div className="top-form-meta">{customFormNumber || 'แบบ ปภ. รย-01'}</div>
      <table className="outer">
        <colgroup>
          <col className="c1" />
          <col className="c2" />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} className="header-cell">
              <span className="t1">บันทึกรายงานตรวจความเรียบร้อยรถยนต์ประจำวัน</span>
              <span className="t2">
                <b>รถยนต์ หมายเลข</b> <span className="dots">{vehicle.vehicle_number ? <span className="px-1 font-normal">{vehicle.vehicle_number}</span> : '....................................................'}</span> <b>หมายเลขทะเบียน</b> <span className="dots">{vehicle.license_plate ? <span className="px-1 font-normal">{vehicle.license_plate} {vehicle.province || 'ระยอง'}</span> : '....................................................'}</span>
              </span>
              <span className="t3">
                <b>วันที่</b> <span className="dots">{day ? <span className="px-1 font-normal">{day}</span> : '..................'}</span> <b>เดือน</b> <span className="dots">{month ? <span className="px-1 font-normal">{month}</span> : '..............................'}</span> <b>พ.ศ.</b> <span className="font-normal">{year || '2569'}</span>
              </span>
            </td>
          </tr>

          <tr className="col-head-row">
            <td className="blank-left">&nbsp;</td>
            <td>เมื่อตรวจครบ 8 ข้อ แล้ว จึงติดเครื่องยนต์</td>
          </tr>

          <tr>
            <td className="item-cell rules-cell">
              <u><b>ข้อปฏิบัติ</b></u>
              <ol>
                <li>รายการใดที่ไม่ปกติ หรือชำรุดต้องเขียนใบชำรุด</li>
                <li>ตรวจทุกรายการอย่างจริงจัง</li>
                <li>การรายงานเท็จเป็นการผิดวินัย</li>
              </ol>
            </td>
            <td className="item-cell">
              <span className="item-num">9. ติดเครื่องยนต์</span>
              <div className="opt-row">
                <span className="opt">({r['9_engine_start']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['9_engine_start']?.status === 'hard' || r['9_engine_start']?.subStatus === 'hard' ? '✓' : '\u00A0\u00A0'}) ติดยาก</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['9_engine_start']?.status === 'wont_start' || r['9_engine_start']?.subStatus === 'wont_start' ? '✓' : '\u00A0\u00A0'}) ไม่ติด</span>
                <span className="opt">({r['9_engine_start']?.status === 'not_normal' && r['9_engine_start']?.subStatus !== 'hard' && r['9_engine_start']?.subStatus !== 'wont_start' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>

              <span className="item-num">10. เบรก</span> (เดินเครื่องเบาอยู่กับที่ ลองเบรกดู)
              <div className="opt-row">
                <span className="opt">({r['10_brake']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['10_brake']?.status === 'high' || r['10_brake']?.subStatus === 'high' ? '✓' : '\u00A0\u00A0'}) สูงกว่าปกติ</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['10_brake']?.status === 'low' || r['10_brake']?.subStatus === 'low' || (r['10_brake']?.status === 'not_normal' && !r['10_brake']?.subStatus) ? '✓' : '\u00A0\u00A0'}) ต่ำเกินไป</span>
              </div>

              <span className="item-num">11. คลัช</span> (เดินเครื่องเบาอยู่กับที่ ลองเหยียบดู)
              <div className="opt-row">
                <span className="opt">({r['11_clutch']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['11_clutch']?.status === 'high' || r['11_clutch']?.subStatus === 'high' ? '✓' : '\u00A0\u00A0'}) สูงกว่าปกติ</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['11_clutch']?.status === 'low' || r['11_clutch']?.subStatus === 'low' || (r['11_clutch']?.status === 'not_normal' && !r['11_clutch']?.subStatus) ? '✓' : '\u00A0\u00A0'}) ต่ำเกินไป</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">1. สภาพตัวถัง/สี</span>
              <div className="opt-row">
                <span className="opt">({r['1_body']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['1_body']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
              <div className="note-line flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                ({r['1_body']?.note || r['1_body']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) มีรอยยุบที่
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['1_body']?.note ? <span className="px-1 font-normal">{r['1_body'].note}</span> : '....................................................................................................'}
                </span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">12. พวงมาลัย</span>
              <div className="opt-row">
                <span className="opt">({r['12_steering']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['12_steering']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">2. ลมยางและสภาพยาง</span>
              <div className="opt-row">
                <span className="opt">({r['2_tires']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['2_tires']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
              <div className="note-line flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                ({r['2_tires']?.status === 'not_normal' || r['2_tires']?.note ? '✓' : '\u00A0\u00A0'}) ชำรุด มีรอยฉีก รั่วซึม แบนที่ล้อข้าง
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['2_tires']?.note ? <span className="px-1 font-normal">{r['2_tires'].note}</span> : '....................................................................................................'}
                </span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">13. แตร</span>
              <div className="opt-row">
                <span className="opt">({r['13_horn']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ดัง</span>
                <span className="opt">({r['13_horn']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ดัง</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">3. น้ำในหม้อน้ำ/น้ำยาหล่อเย็น</span>
              <div className="opt-row">
                <span className="opt">({r['3_radiator']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ระดับปกติ</span>
                <span className="opt">({r['3_radiator']?.low || (r['3_radiator']?.status === 'not_normal' && !r['3_radiator']?.refilled) ? '✓' : '\u00A0\u00A0'}) ต่ำกว่าระดับ</span>
                <span className="opt">({r['3_radiator']?.refilled ? '✓' : '\u00A0\u00A0'}) ตรวจเติมแล้ว</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['3_radiator']?.frequent ? '✓' : '\u00A0\u00A0'}) เติมบ่อย หรือทุกครั้ง</span>
                <span className="opt">({r['3_radiator']?.mixed || r['3_radiator']?.rust ? '✓' : '\u00A0\u00A0'}) มีสนิมในหม้อน้ำ</span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">14. ดวงไฟสัญญาณต่างๆ</span>
              <div className="opt-row">
                <span className="opt">({r['14_lights']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['14_lights']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
              <div className="note-line flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                ({r['14_lights']?.note || r['14_lights']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) มีเสียที่
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['14_lights']?.note ? <span className="px-1 font-normal">{r['14_lights'].note}</span> : '....................................................................................................'}
                </span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">4. ท่อยางหม้อน้ำ</span>
              <div className="opt-row">
                <span className="opt">({r['4_hose']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['4_hose']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">15. ที่ปัดน้ำฝน</span>
              <div className="opt-row">
                <span className="opt">({r['15_wiper']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['15_wiper']?.status === 'not_normal' && !r['15_wiper']?.unclean ? '✓' : '\u00A0\u00A0'}) ชำรุด</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['15_wiper']?.unclean || (r['15_wiper']?.status === 'not_normal' && r['15_wiper']?.note?.includes('สะอาด')) ? '✓' : '\u00A0\u00A0'}) ปัดไม่สะอาด</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">5. สายพาน</span>
              <div className="opt-row">
                <span className="opt">({r['5_belt']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['5_belt']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ชำรุด เปื่อย ฉีกขาด</span>
              </div>
            </td>
            <td className="item-cell">
              <div className="flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                <span className="item-num shrink-0">16. เลข กม วันนี้</span>
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {inspection.mileage ? <span className="px-1 font-normal">{Number(inspection.mileage).toLocaleString()} กม.</span> : '....................................................................................................'}
                </span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">6. น้ำมันคลัช เบรก</span>
              <div className="opt-row">
                <span className="opt">({r['6_brake_fluid']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ระดับปกติ</span>
                <span className="opt">({r['6_brake_fluid']?.refilled ? '✓' : '\u00A0\u00A0'}) ตรวจเติมแล้ว</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['6_brake_fluid']?.frequent || (r['6_brake_fluid']?.status === 'not_normal' && !r['6_brake_fluid']?.refilled) ? '✓' : '\u00A0\u00A0'}) ขาดบ่อย</span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">17. น้ำมันเชื้อเพลิง</span>
              <div className="opt-row">
                <span className="opt">({r['17_fuel']?.level === 'empty' || r['17_fuel']?.level === 'low' ? '✓' : '\u00A0\u00A0'}) ต่ำกว่า 1 ใน 4</span>
                <span className="opt">({r['17_fuel']?.level === 'quarter' ? '✓' : '\u00A0\u00A0'}) 1 ใน 4</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['17_fuel']?.level === 'almost_half' ? '✓' : '\u00A0\u00A0'}) เกือบครึ่งถัง</span>
                <span className="opt">({r['17_fuel']?.level === 'half' ? '✓' : '\u00A0\u00A0'}) ครึ่งถัง</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['17_fuel']?.level === 'full' || r['17_fuel']?.level === 'more_than_half' ? '✓' : '\u00A0\u00A0'}) มากกว่าครึ่งถัง</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">7. น้ำกลั่นแบตเตอรี่</span>
              <div className="opt-row">
                <span className="opt">({r['7_battery_water']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ระดับปกติ</span>
                <span className="opt">({r['7_battery_water']?.refilled ? '✓' : '\u00A0\u00A0'}) ตรวจเติมแล้ว</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['7_battery_water']?.frequent || (r['7_battery_water']?.status === 'not_normal' && !r['7_battery_water']?.refilled) ? '✓' : '\u00A0\u00A0'}) ขาดบ่อย</span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">18. ระบบแอร์รถยนต์</span>
              <div className="opt-row">
                <span className="opt">({r['18_air']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['18_air']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
            </td>
          </tr>

          <tr>
            <td className="item-cell">
              <span className="item-num">8. น้ำมันเครื่อง</span>
              <div className="opt-row">
                <span className="opt">({r['8_engine_oil']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ปกติ</span>
                <span className="opt">({r['8_engine_oil']?.status === 'not_normal' && !r['8_engine_oil']?.mixed && !r['8_engine_oil']?.frequent ? '✓' : '\u00A0\u00A0'}) ไม่ปกติ</span>
              </div>
              <div className="opt-row">
                <span className="opt">({r['8_engine_oil']?.frequent ? '✓' : '\u00A0\u00A0'}) ขาดบ่อย</span>
                <span className="opt">({r['8_engine_oil']?.mixed ? '✓' : '\u00A0\u00A0'}) มีสิ่งเจือปน</span>
              </div>
              <div className="note-line flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['8_engine_oil']?.note ? <span className="font-normal px-1">{r['8_engine_oil'].note}</span> : '....................................................................................................'}
                </span>
              </div>
            </td>
            <td className="item-cell">
              <span className="item-num">19. ความสะอาดทั่วไป</span>
              <div className="opt-row">
                <span className="opt">({r['19_cleanliness']?.status === 'done' || r['19_cleanliness']?.status === 'normal' ? '✓' : '\u00A0\u00A0'}) ทำแล้ว</span>
                <span className="opt">({r['19_cleanliness']?.status === 'not_done' || r['19_cleanliness']?.status === 'not_normal' ? '✓' : '\u00A0\u00A0'}) ยังไม่ทำ</span>
              </div>
              <div className="flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                <span className="item-num shrink-0">20. ใช้รถครั้งสุดท้าย เมื่อ</span>
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['20_last_used']?.note ? <span className="font-normal px-1">{r['20_last_used'].note}</span> : '....................................................................................................'}
                </span>
              </div>
              <div className="flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                <span className="item-num shrink-0">21. อื่นๆ</span>
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r['21_others']?.note ? <span className="font-normal px-1">{r['21_others'].note}</span> : '....................................................................................................'}
                </span>
              </div>
              <div className="note-line flex items-baseline overflow-hidden whitespace-nowrap min-w-0 w-full">
                <span className="dots flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">....................................................................................................</span>
              </div>
            </td>
          </tr>

          <tr className="footer-head">
            <td>พนักงานขับรถ</td>
            <td>ผู้ตรวจสอบ</td>
          </tr>
          <tr className="footer-body">
            <td>
              <p style={{ textAlign: 'center' }}>ขอรับรองว่าเป็นความจริง</p>
              <div className="footer-sign-wrapper">
                <div className="footer-sign-col">
                  <div className="footer-sign-dots-row">
                    <span className="dots">..........................................</span>
                  </div>
                  <div className="footer-sign-name-row">
                    (&nbsp;{driverName ? <span className="px-1 font-normal">{driverName}</span> : <span className="dots">..........................................</span>}&nbsp;)
                  </div>
                </div>
                <div className="footer-sign-role">
                  พขร. ผู้รายงาน
                </div>
              </div>
              <p className="last-note"><b>หมายเหตุ</b> &nbsp;: &nbsp;ตรวจเช็ค ทุกวันอังคาร</p>
            </td>
            <td>
              <p>บันทึกของผู้ตรวจสอบ<span className="dots">..........................</span></p>
              <p><span className="dots">............................................................</span></p>
              <div className="footer-sign-wrapper">
                <div className="footer-sign-col">
                  <div className="footer-sign-dots-row">
                    <span className="dots">..........................................</span>
                  </div>
                  <div className="footer-sign-name-row">
                    (&nbsp;{verifierName ? <span className="px-1 font-normal">{verifierName}</span> : <span className="dots">..........................................</span>}&nbsp;)
                  </div>
                </div>
                <div className="footer-sign-role">
                  ลงนาม ผู้ตรวจ
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="bottom-system-meta">
        <span>พิมพ์จากระบบบริหารจัดการงานสารบรรณและยานพาหนะ ปภ. ระยอง (DDPM Rayong Smart EDMS)</span>
      </div>
    </div>
  );
};

// ==========================================
// 6. Printable Modal Wrapping A4PaperPreview
// ==========================================
export const VehiclePrintablePaperModal: React.FC<{
  vehicle: Vehicle;
  inspection: Inspection;
  user?: any;
  onClose: () => void;
}> = ({ vehicle, inspection, user, onClose }) => {
  const r = typeof inspection.results === 'string' ? JSON.parse(inspection.results) : (inspection.results || {});
  
  const [driverName, setDriverName] = useState<string>(() => {
    return r?.driver_name || r?.reporter_name || (inspection as any)?.driver_name || inspection.inspector_name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || '';
  });

  const [verifierName, setVerifierName] = useState<string>(() => {
    return r?.verifier_name || vehicle.responsible_person || r?.inspector_user_name || (inspection as any)?.verifier_name || '';
  });

  const [formNumber, setFormNumber] = useState<string>(() => {
    const d = String(vehicle.department || '').trim();
    if (d.includes('ป้องกัน') || d.includes('ปฏิบัติการ')) {
      return 'รหัสแบบฟอร์ม: FM-DPM-PPO-001 | Rev.00 | วันที่บังคับใช้ 21/09/2569';
    }
    if (d.includes('สงเคราะห์') || d.includes('ผู้ประสบภัย')) {
      return 'รหัสแบบฟอร์ม: FM-DPM-RLF-001 | Rev.00 | วันที่บังคับใช้ 21/09/2569';
    }
    if (d.includes('ยุทธศาสตร์') || d.includes('จัดการ')) {
      return 'รหัสแบบฟอร์ม: FM-DPM-SMG-001 | Rev.00 | วันที่บังคับใช้ 21/09/2569';
    }
    return 'รหัสแบบฟอร์ม: FM-DPM-PPO-001 | Rev.00 | วันที่บังคับใช้ 21/09/2569'; // fallback
  });
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row items-stretch justify-stretch bg-slate-900/95 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:block print:overflow-visible">
      
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #printable-sidebar {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Left Control Panel Sidebar */}
      <div 
        id="printable-sidebar" 
        className="w-full lg:w-[380px] bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col overflow-y-auto shrink-0 p-5 space-y-5 no-print"
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">ตั้งค่าการจัดพิมพ์กระดาษ A4</h3>
              <span className="text-[10px] text-slate-400">แบบรายงานความเรียบร้อยของรถยนต์</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handlePrint}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์กระดาษ A4 / บันทึก PDF</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>รองรับการบันทึกเป็น PDF และพิมพ์ลงกระดาษ A4 มาตรฐาน</span>
          </div>
        </div>

        {/* Editable Signatures Settings */}
        <div className="space-y-3 bg-slate-700/40 p-3.5 rounded-xl border border-slate-600/50">
          <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider block">
            ข้อมูลผู้ลงนามในเอกสาร
          </label>
          
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium block">
              1. พนักงานขับรถ (พขร. ผู้รายงาน):
            </label>
            <input 
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="ชื่อ-นามสกุล พนักงานขับรถ"
              className="w-full p-2.5 bg-slate-900/80 border border-slate-600 focus:border-indigo-500 rounded-lg text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium block">
              2. ผู้ตรวจสอบ (ลงนาม ผู้ตรวจ):
            </label>
            <input 
              type="text"
              value={verifierName}
              onChange={(e) => setVerifierName(e.target.value)}
              placeholder="ชื่อ-นามสกุล ผู้ตรวจสอบ"
              className="w-full p-2.5 bg-slate-900/80 border border-slate-600 focus:border-indigo-500 rounded-lg text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium block">
              3. เลขรหัสฟอร์มมุมขวาบน:
            </label>
            <input 
              type="text"
              value={formNumber}
              onChange={(e) => setFormNumber(e.target.value)}
              placeholder="เช่น แบบ ปภ. รย-01"
              className="w-full p-2.5 bg-slate-900/80 border border-slate-600 focus:border-indigo-500 rounded-lg text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Font Size Settings */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            ขนาดตัวอักษรเอกสาร
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setFontSize('sm')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'sm' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              เล็ก (13px)
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'base' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ปกติ (14.5px)
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'lg' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ใหญ่ (16px)
            </button>
          </div>
        </div>

        {/* Exit Button */}
        <div className="pt-2 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับไปหน้าประวัติ</span>
          </button>
        </div>
      </div>

      {/* 2. Right Canvas Area using A4PaperPreview */}
      <div className="flex-1 bg-slate-950/80 p-2 sm:p-4 lg:p-6 overflow-y-auto flex justify-center custom-scrollbar print:p-0 print:bg-white print:block">
        <div className="w-full max-w-[860px]">
          <A4PaperPreview
            title="แบบรายงานความเรียบร้อยของรถยนต์ (A4)"
            subtitle={`${vehicle.license_plate} ${vehicle.province || 'ระยอง'} (${vehicle.vehicle_number || vehicle.vehicle_type})`}
            onPrint={handlePrint}
            exportFileName={`รายงานความเรียบร้อย_${vehicle.license_plate}_${vehicle.province || ''}`}
            paperClassName="p-0 bg-transparent shadow-none border-0 min-h-0 min-w-0"
          >
            <ReportPrintView 
              vehicle={vehicle} 
              inspection={inspection} 
              user={user} 
              customDriverName={driverName}
              customVerifierName={verifierName}
              customFormNumber={formNumber}
              fontSize={fontSize}
            />
          </A4PaperPreview>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. Full Vehicle Maintenance History System
// ==========================================
interface MaintenanceHistoryProps {
  vehicle: Vehicle;
  user: any;
  onBack: () => void;
  onStartInspection?: () => void;
}

export const MaintenanceHistory: React.FC<MaintenanceHistoryProps> = ({
  vehicle,
  user,
  onBack,
  onStartInspection
}) => {
  const { confirm } = useConfirm();
  const [logs, setLogs] = useState<VehicleMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'scheduled'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<VehicleMaintenance | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    title: 'เปลี่ยนถ่ายน้ำมันเครื่อง และไส้กรอง',
    description: '',
    cost: 1800,
    technician: '',
    provider_garage: 'ศูนย์บริการมาตรฐาน',
    mileage: vehicle.current_mileage || 0,
    status: 'completed' as 'completed' | 'in_progress' | 'scheduled'
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/maintenance`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance logs:', err);
    } finally {
      setLoading(false);
    }
  }, [vehicle.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCost = logs.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const count = logs.length;
    const avgCost = count > 0 ? Math.round(totalCost / count) : 0;
    const maxMileage = logs.reduce((max, item) => Math.max(max, Number(item.mileage || 0)), vehicle.current_mileage || 0);
    return { totalCost, count, avgCost, maxMileage };
  }, [logs, vehicle.current_mileage]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.provider_garage && item.provider_garage.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.technician && item.technician.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [logs, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setForm({
      maintenance_date: new Date().toISOString().split('T')[0],
      title: 'เปลี่ยนถ่ายน้ำมันเครื่อง และไส้กรอง',
      description: '',
      cost: 1800,
      technician: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
      provider_garage: 'ศูนย์บริการมาตรฐาน ปภ.',
      mileage: vehicle.current_mileage || 0,
      status: 'completed'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: VehicleMaintenance) => {
    setEditingLog(log);
    setForm({
      maintenance_date: log.maintenance_date ? log.maintenance_date.split('T')[0] : new Date().toISOString().split('T')[0],
      title: log.title || '',
      description: log.description || '',
      cost: Number(log.cost || 0),
      technician: log.technician || '',
      provider_garage: log.provider_garage || '',
      mileage: Number(log.mileage || 0),
      status: log.status || 'completed'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (log: VehicleMaintenance) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบบันทึกการบำรุงรักษา',
      message: `คุณต้องการลบบันทึกรายการ "${log.title}" ออกจากประวัติการบำรุงรักษาใช่หรือไม่?`,
      description: `ยานพาหนะ: ${vehicle.license_plate} • ค่าใช้จ่าย: ฿${Number(log.cost || 0).toLocaleString()}`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vehicle-maintenance/${log.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('กรุณากรอกรายการบำรุงรักษา');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingLog ? `/api/vehicle-maintenance/${editingLog.id}` : '/api/vehicle-maintenance';
      const method = editingLog ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vehicle_id: vehicle.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingLog(null);
        fetchLogs();
      } else {
        const err = await res.json().catch(() => null);
        alert('เกิดข้อผิดพลาด: ' + (err?.error || 'ไม่สามารถบันทึกข้อมูลได้'));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatThaiDateBE = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10) + 543;
        const mIdx = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        if (mIdx >= 0 && mIdx < 12) {
          return `วันที่ ${d} ${months[mIdx]} พ.ศ. ${y}`;
        }
      }
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        return `วันที่ ${dt.getDate()} ${months[dt.getMonth()]} พ.ศ. ${dt.getFullYear() + 543}`;
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  const quickPresets = [
    { title: 'เปลี่ยนถ่ายน้ำมันเครื่อง และไส้กรอง', cost: 1800 },
    { title: 'เปลี่ยนยางรถยนต์ 4 เส้น', cost: 14500 },
    { title: 'เช็คระยะ 20,000 กม. (ตรวจเช็กใหญ่)', cost: 3200 },
    { title: 'เปลี่ยนผ้าเบรก / น้ำมันเบรก', cost: 2500 },
    { title: 'เปลี่ยนแบตเตอรี่ใหม่ (12V 75Ah)', cost: 3800 },
    { title: 'ซ่อมแซมระบบปรับอากาศ / เติมน้ำยาแอร์', cost: 1500 },
    { title: 'ซ่อมแซมระบบช่วงล่าง และโช้คอัพ', cost: 6500 },
    { title: 'ซ่อมบำรุงเครื่องยนต์ / เปลี่ยนสายพาน', cost: 4200 }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* 1. Header Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-2xl transition-all active:scale-95 cursor-pointer"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-amber-500" />
                  <span>ประวัติการบำรุงรักษาและซ่อมแซม</span>
                </h2>
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black border border-amber-500/30">
                  {vehicle.license_plate} {vehicle.province || 'ระยอง'}
                </span>
                {vehicle.vehicle_number && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-bold font-mono">
                    เบอร์: {vehicle.vehicle_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
                {vehicle.brand} {vehicle.model} • {vehicle.vehicle_type} • ฝ่าย: {vehicle.department || 'ส่วนกลาง'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มบันทึกการบำรุงรักษา</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-3 bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] rounded-2xl transition-all cursor-pointer"
              title="พิมพ์ประวัติการบำรุงรักษา"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-[var(--border-lighter)] relative z-10">
          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-amber-500" />
              <span>ยอดรวมค่าบำรุงรักษา</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              ฿{stats.totalCost.toLocaleString()}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">บาทรวมทั้งหมด</div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>จำนวนครั้งที่เข้าซ่อม</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-1">
              {stats.count} <span className="text-xs font-bold text-[var(--text-muted)]">ครั้ง</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">บันทึกในระบบ</div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span>ค่าใช้จ่ายเฉลี่ยต่อครั้ง</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ฿{stats.avgCost.toLocaleString()}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">บาท / ครั้ง</div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-blue-500" />
              <span>เลขไมล์ล่าสุด</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats.maxMileage.toLocaleString()} <span className="text-xs font-bold text-[var(--text-muted)]">กม.</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">สถานะไมล์ปัจจุบัน</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="ค้นหารายการ, ศูนย์บริการ, ช่าง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'completed', label: 'เสร็จสิ้นแล้ว' },
            { id: 'in_progress', label: 'กำลังซ่อมแซม' },
            { id: 'scheduled', label: 'รอนัดหมาย' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Maintenance Records List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] animate-pulse" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-light)]">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3 text-amber-500">
            <Wrench className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
            ยังไม่มีประวัติการบำรุงรักษาสำหรับยานพาหนะนี้
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5">
            เริ่มต้นเพิ่มประวัติการเปลี่ยนถ่ายน้ำมันเครื่อง เปลี่ยนยาง ซ่อมบำรุงเครื่องยนต์ เพื่อใช้ติดตามค่าใช้จ่ายและรอบเช็คระยะ
          </p>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-amber-600 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกการบำรุงรักษาแรก</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(item => {
            const isCompleted = item.status === 'completed';
            const isInProgress = item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className="bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-amber-500/50 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isCompleted 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                      : isInProgress
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  }`}>
                    <Wrench className="w-6 h-6" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                        {item.title}
                      </h3>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : isInProgress
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        {isCompleted ? '✓ ดำเนินการเรียบร้อย' : isInProgress ? '⚙ กำลังซ่อมแซม' : '📅 รอนัดหมาย'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] flex-wrap pt-0.5">
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatThaiDateBE(item.maintenance_date)}
                      </span>

                      {item.provider_garage && (
                        <span className="flex items-center gap-1 text-[var(--text-muted)]">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{item.provider_garage}</span>
                        </span>
                      )}

                      {item.technician && (
                        <span className="flex items-center gap-1 text-[var(--text-muted)]">
                          <User className="w-3.5 h-3.5" />
                          <span>ช่าง: {item.technician}</span>
                        </span>
                      )}

                      {Boolean(item.mileage) && (
                        <span className="flex items-center gap-1 text-[var(--text-muted)]">
                          <Gauge className="w-3.5 h-3.5" />
                          <span>เลขไมล์: {Number(item.mileage).toLocaleString()} กม.</span>
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-canvas)] p-2.5 rounded-xl border border-[var(--border-lighter)] mt-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Cost Badge & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-lighter)]">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ค่าใช้จ่ายสุทธิ</div>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                      ฿{Number(item.cost || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-all cursor-pointer"
                      title="แก้ไขบันทึกนี้"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
                      title="ลบบันทึกนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add/Edit Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-card)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {editingLog ? 'แก้ไขบันทึกการบำรุงรักษา' : 'เพิ่มบันทึกการบำรุงรักษาใหม่'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    ยานพาหนะ: {vehicle.license_plate} {vehicle.province || 'ระยอง'} ({vehicle.brand} {vehicle.model})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Quick Presets for New Record */}
              {!editingLog && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
                    ตัวเลือกด่วน (Quick Presets) :
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPresets.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setForm(prev => ({ ...prev, title: preset.title, cost: preset.cost }))}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                          form.title === preset.title
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance Title */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                  รายการบำรุงรักษา / ซ่อมแซม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เปลี่ยนถ่ายน้ำมันเครื่อง, เปลี่ยนยาง 4 เส้น, เช็คระยะ 20,000 กม."
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500"
                />
              </div>

              {/* Date & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    วันที่ดำเนินการ
                  </label>
                  <input
                    type="date"
                    required
                    value={form.maintenance_date}
                    onChange={(e) => setForm(prev => ({ ...prev, maintenance_date: e.target.value }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    สถานะการซ่อมบำรุง
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  >
                    <option value="completed">เสร็จสิ้นเรียบร้อย</option>
                    <option value="in_progress">กำลังซ่อมแซม</option>
                    <option value="scheduled">รอนัดหมาย</option>
                  </select>
                </div>
              </div>

              {/* Cost & Mileage Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    ค่าใช้จ่าย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.cost}
                    onChange={(e) => setForm(prev => ({ ...prev, cost: Number(e.target.value) }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    เลขไมล์ขณะเข้าซ่อม (กม./ชม.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.mileage}
                    onChange={(e) => setForm(prev => ({ ...prev, mileage: Number(e.target.value) }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Garage & Technician Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    อู่ / ศูนย์บริการ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ศูนย์โตโยต้าระยอง, อู่ระยองการช่าง"
                    value={form.provider_garage}
                    onChange={(e) => setForm(prev => ({ ...prev, provider_garage: e.target.value }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                    ช่างผู้รับผิดชอบ / ผู้คุมงาน
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อช่างหรือผู้ตรวจสอบ"
                    value={form.technician}
                    onChange={(e) => setForm(prev => ({ ...prev, technician: e.target.value }))}
                    className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Description / Parts Details */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
                  รายละเอียดการซ่อมบำรุง / รายการอะไหล่ที่เปลี่ยน
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุรายละเอียดอะไหล่ รหัสอุปกรณ์ หรือหมายเหตุเพิ่มเติม..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--border-light)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingLog ? 'บันทึกการแก้ไข' : 'เพิ่มบันทึก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagementView;
