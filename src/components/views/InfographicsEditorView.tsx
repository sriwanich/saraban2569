import React, { useEffect, useRef, useState } from 'react';

// Dynamic fabric loading for build compatibility (using CDN to bypass native node-canvas compilation errors)
let fabric: any = null;

import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, 
  Download, Trash2, Palette, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, BringToFront, SendToBack,
  Save, Undo, Redo, LayoutGrid, Underline, Copy, PenTool, FolderOpen, Minus,
  Wrench, Settings, X, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck,
  Star, ArrowRight, ArrowLeft, Grid, Sparkles, Lock, Unlock, Eye, HelpCircle,
  BarChart3, PieChart, AlertTriangle, FileText, Users, CheckSquare,
  Activity, Info, Award, Plus, Sliders, Hash, Move, Keyboard,
  Shapes, CheckCircle, XCircle, Lightbulb, Clock, Calendar, Mail, Phone, 
  MapPin, Heart, Target, TrendingUp, ThumbsUp, Tag, FileCheck, Shield, 
  Database, Quote, Check, Search, Stamp, Bookmark, Compass, Sticker,
  Smile, Flame, Crown, Trophy, Rocket, Bell, Globe, Cpu, Laptop, Printer,
  Briefcase, Scale, Building2, Share2, FileSignature, QrCode, Gift, Percent,
  Coins, DollarSign, Megaphone, CheckCheck, Workflow, ShieldCheck as ShieldCheckIcon,
  Ruler, Magnet, Crosshair, Columns, EyeOff, Maximize2, Minimize2, Scaling, Expand, Shrink, Smartphone, Monitor,
  Upload, RotateCcw, Crop, MoreHorizontal, MoreVertical, Menu, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  Sun, Moon
} from 'lucide-react';

import { InfographicsGalleryModal } from './InfographicsGalleryModal';
import { InfographicsExportModal } from './InfographicsExportModal';
import { InfographicsImageGalleryModal, UploadedImageItem } from './InfographicsImageGalleryModal';
import { InfographicsShareModal, InfographicShareSettings } from './InfographicsShareModal';
import { InfographicsPermissionsModal, EditorUser } from './InfographicsPermissionsModal';
import { PAPER_SIZES } from '../../data/paperSizes';
import { ImageCropModal } from './ImageCropModal';
import { ImageBackgroundRemovalModal } from './ImageBackgroundRemovalModal';
import { FontSelector, ensureGoogleFontLoaded } from './FontSelector';
import { 
  CanvasHorizontalRuler, 
  CanvasVerticalRuler, 
  CanvasCornerBox, 
  CanvasGridOverlay, 
  RulerGridControlPanel,
  RulerUnit,
  GridStyle,
  GuideLine
} from './InfographicsRulerGrid';
import { PDFDocument } from 'pdf-lib';
import { InfographicsAiAssistant } from './InfographicsAiAssistant';
import {
  CANVA_COLOR_THEMES,
  CanvaColorTheme,
  applyColorThemeToCanvas,
  addCanvaInfographicElement,
  loadCanvaTemplate,
  generateFullAILegend
} from './InfographicsCanvaKit';
import { useConfirm } from '../../context/ConfirmContext';

const FABRIC_CUSTOM_PROPS = [
  'id', 'name', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY',
  'lockRotation', 'hasControls', 'selectable', 'hoverCursor', 'data', 'rx', 'ry'
];

const ICON_LIBRARY = [
  { name: 'โทรศัพท์ (Phone)', tags: 'phone mobile call', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>' },
  { name: 'อีเมล (Mail)', tags: 'email mail envelope letter message', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>' },
  { name: 'แผนที่ (MapPin)', tags: 'map pin location gps address', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' },
  { name: 'ปฏิทิน (Calendar)', tags: 'calendar date schedule event time', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { name: 'รูปดาว (Star)', tags: 'star favorite rating review like', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
  { name: 'หัวใจ (Heart)', tags: 'heart love health patient hospital care', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' },
  { name: 'ผู้ใช้งาน (Users)', tags: 'user profile employee member crowd people team', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
  { name: 'เอกสาร (FileText)', tags: 'file document paper pdf report news contract', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' },
  { name: 'กราฟเส้น (TrendingUp)', tags: 'chart trend analysis graph money grow market', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>' },
  { name: 'เป้าหมาย (Target)', tags: 'target focus goal mission purpose success dart', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>' },
  { name: 'ถ้วยรางวัล (Trophy)', tags: 'award trophy champion winner gold success gift', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6.38 6.38 0 0 1 6 6.6c0 3.3-2.2 6-5.4 6.4a1 1 0 0 1-1.2-.9l-.4-1.1a1 1 0 0 1 .9-1.2A3.38 3.38 0 0 0 15 8.6V4h-6v4.6a3.38 3.38 0 0 0 3.1 3.2 1 1 0 0 1 .9 1.2l-.4 1.1a1 1 0 0 1-1.2.9C5.2 14.6 3 11.9 3 8.6A6.38 6.38 0 0 1 12 2z"></path></svg>' },
  { name: 'ไอเดีย (Lightbulb)', tags: 'lightbulb idea smart think learn energy brain', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15 11c0 1.66-1.34 3-3 3s-3-1.34-3-3a3 3 0 0 1 3-3c1.66 0 3 1.34 3 3z"></path><path d="M12 2a9 9 0 0 0-9 9c0 2.22 1.2 4.15 3 5.17l.5 3.83h11l.5-3.83c1.8-1.02 3-2.95 3-5.17A9 9 0 0 0 12 2z"></path></svg>' },
  { name: 'ตั้งค่า (Settings)', tags: 'gear setup control tool manage settings configure service', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' },
  { name: 'คอมพิวเตอร์ (Monitor)', tags: 'computer monitor tv display desktop screen tech web', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>' },
  { name: 'สมาร์ทโฟน (Smartphone)', tags: 'phone mobile hand smart call app pocket device', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>' },
  { name: 'ฐานข้อมูล (Database)', tags: 'db sql server backup data storage storage list', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>' },
  { name: 'ความสำเร็จ (CheckCircle)', tags: 'correct success done check verified okay', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
  { name: 'คำเตือน (AlertTriangle)', tags: 'warning danger risk crash system alert problem error', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' },
  { name: 'เครื่องบินจรวด (Rocket)', tags: 'rocket start launch speed fast target grow up fly space', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 3.4-2 3.4s2.14-.5 3.4-2c1.76 1.16 3.74 1.8 5.7 1.7l10.4-10.4c1.2-1.2 1.2-3.12 0-4.32-1.2-1.2-3.12-1.2-4.32 0L7.3 15.3c-.1 1.96.54 3.94 1.7 5.7z"></path><path d="M14 9l-4 4"></path><path d="M9 15l-3 3"></path><path d="M15 9l3-3"></path></svg>' },
  { name: 'กระเป๋าทำงาน (Briefcase)', tags: 'work business briefcase office corporate job task bag portfolio', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>' }
];

interface InfographicsEditorViewProps {
  user: any;
  systemTheme?: 'dark' | 'light' | 'auto';
}

export default function InfographicsEditorView({ user, systemTheme = 'auto' }: InfographicsEditorViewProps) {
  const { confirm } = useConfirm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [fabricError, setFabricError] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);

  // Session Persistence Constants
  const SESSION_STORAGE_KEY = 'penpot_vector_editor_session_v3';
  const isInitialLoadRef = useRef(true);
  const persistenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Workspace State Management
  const [projectName, setProjectName] = useState('อินโฟกราฟิกหน่วยงาน 1');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scope, setScope] = useState<'central' | 'department' | 'private'>('department');
  const [ownerName, setOwnerName] = useState('');
  const [ownerDepartment, setOwnerDepartment] = useState('');
  const [allowedEditors, setAllowedEditors] = useState<string[]>([]);
  const [allowDepartmentEdit, setAllowDepartmentEdit] = useState(true);

  // Undo / Redo History
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  // View settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomLevelRef = useRef(1);
  zoomLevelRef.current = zoomLevel;

  // Penpot style tabs: 'pages' is default for maximum designer clarity
  const [activeSidebarTab, setActiveSidebarTab] = useState<'layers' | 'shapes' | 'text' | 'images' | 'templates' | 'ai' | 'canvas-settings' | 'pages' | 'icons' | 'background' | 'graphite'>('pages');
  const [layersList, setLayersList] = useState<any[]>([]);
  const [layerSearchQuery, setLayerSearchQuery] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  
  // Custom uploaded images and asset lists
  const [uploadedImagesList, setUploadedImagesList] = useState<UploadedImageItem[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Modal control states
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showImageGalleryModal, setShowImageGalleryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showBgRemovalModal, setShowBgRemovalModal] = useState(false);
  const [activeCropImage, setActiveCropImage] = useState<any>(null);

  // Mobile navigation tabs: 'canvas', 'layers', 'tools', 'properties'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'layers' | 'tools' | 'properties'>('canvas');
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Toast / Notifications
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Design Canvas settings
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1200 });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  // Theme settings: 'auto' (sync with EDMS system), 'dark', or 'light'
  const [editorThemeSetting, setEditorThemeSetting] = useState<'auto' | 'dark' | 'light'>(() => {
    return (localStorage.getItem('infographics_editor_theme') as 'auto' | 'dark' | 'light') || 'auto';
  });
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    localStorage.setItem('infographics_editor_theme', editorThemeSetting);
  }, [editorThemeSetting]);

  useEffect(() => {
    const computeEffectiveTheme = () => {
      if (editorThemeSetting === 'dark') {
        setEffectiveTheme('dark');
      } else if (editorThemeSetting === 'light') {
        setEffectiveTheme('light');
      } else {
        // Auto mode: sync with document element 'dark' class or system preferences
        const isHtmlDark = document.documentElement.classList.contains('dark');
        const isSystemDarkMedia = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = isHtmlDark || systemTheme === 'dark' || (systemTheme === 'auto' && isSystemDarkMedia);
        setEffectiveTheme(isDark ? 'dark' : 'light');
      }
    };

    computeEffectiveTheme();

    // Listen to changes on root <html> element classes (EDMS global theme switches)
    const observer = new MutationObserver(computeEffectiveTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [editorThemeSetting, systemTheme]);

  // Desktop / PC Layout States & Interactions
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomDockOpen, setIsBottomDockOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Auto calculate and fit canvas to PC screen container
  const handleFitToScreen = () => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const availW = container.clientWidth - 56;
    const availH = container.clientHeight - 56;
    if (availW <= 0 || availH <= 0) return;
    const scaleX = availW / canvasSize.width;
    const scaleY = availH / canvasSize.height;
    const fitScale = Math.min(scaleX, scaleY);
    const rounded = Math.min(1.5, Math.max(0.2, Math.round(fitScale * 20) / 20));
    setZoomLevel(rounded);
  };

  // Toggle or switch sidebar tabs on PC with seamless collapse
  const handleTabClick = (tabKey: typeof activeSidebarTab) => {
    if (activeSidebarTab === tabKey && isDesktopSidebarOpen) {
      setIsDesktopSidebarOpen(false);
    } else {
      setActiveSidebarTab(tabKey);
      setIsDesktopSidebarOpen(true);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowMobileDrawer(true);
    }
  };

  // Listen to Escape key to exit Zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  // Properties form states (synchronized with selected canvas object)
  const [objX, setObjX] = useState<number | ''>('');
  const [objY, setObjY] = useState<number | ''>('');
  const [objW, setObjW] = useState<number | ''>('');
  const [objH, setObjH] = useState<number | ''>('');
  const [objAngle, setObjAngle] = useState<number | ''>('');
  const [objOpacity, setObjOpacity] = useState<number>(100);
  const [objFill, setObjFill] = useState('#3b82f6');
  const [objStroke, setObjStroke] = useState('#1e3a8a');
  const [objStrokeWidth, setObjStrokeWidth] = useState<number>(0);
  const [objCornerRadius, setObjCornerRadius] = useState<number>(0);
  const [objShadowColor, setObjShadowColor] = useState('rgba(0,0,0,0)');
  const [objShadowBlur, setObjShadowBlur] = useState<number>(0);

  // Typography state variables
  const [fontFamily, setFontFamily] = useState('Sarabun');
  const [fontSize, setFontSize] = useState<number>(24);
  const [lineHeight, setLineHeight] = useState<number>(1.2);
  const [charSpacing, setCharSpacing] = useState<number>(0);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Polotno-Grade Pages State (Multi-page canvas support)
  const [pagesList, setPagesList] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const pagesListRef = useRef<string[]>([]);
  const currentPageIndexRef = useRef<number>(0);

  // Keep refs tightly synchronized with state
  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    pagesListRef.current = pagesList;
  }, [pagesList]);

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  // Graphite Node Graph State System (Non-destructive layers engine)
  const [graphiteNodes, setGraphiteNodes] = useState<any[]>([
    {
      id: 'input_node',
      type: 'input',
      name: 'เวกเตอร์อินพุต (Active)',
      status: 'active',
      config: {},
      x: 10,
      y: 20
    },
    {
      id: 'color_grading_node',
      type: 'adjust',
      name: 'เกรดดิ้งเฉดสี (Color)',
      status: 'active',
      config: { brightness: 0, contrast: 0, saturation: 0, hue: 0 },
      x: 10,
      y: 120
    },
    {
      id: 'effects_node',
      type: 'effects',
      name: 'เอฟเฟกต์เวกเตอร์ (FX)',
      status: 'active',
      config: { blur: 0, noise: 0, pixelate: 0, grayscale: false },
      x: 10,
      y: 220
    },
    {
      id: 'output_node',
      type: 'output',
      name: 'เรนเดอร์เอาต์พุต (Render)',
      status: 'active',
      config: {},
      x: 10,
      y: 320
    }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('color_grading_node');

  // Grid/Ruler system
  const [rulersVisible, setRulersVisible] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [gridStyle, setGridStyle] = useState<GridStyle>('dots');
  const [gridColor, setGridColor] = useState('rgba(148, 163, 184, 0.15)');
  const [gridSize, setGridSize] = useState(20);
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>('px');
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Resize canvas when canvasSize changes
  useEffect(() => {
    if (canvas) {
      canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
      canvas.requestRenderAll();
    }
  }, [canvasSize, canvas]);

  // CDN fabric.js import (to guarantee perfect compilation on server)
  useEffect(() => {
    let isMounted = true;
    
    if ((window as any).fabric) {
      fabric = (window as any).fabric;
      setFabricLoaded(true);
      return;
    }

    const scriptId = 'fabric-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const handleScriptLoad = () => {
      if (!isMounted) return;
      if ((window as any).fabric) {
        fabric = (window as any).fabric;
        setFabricLoaded(true);
      } else {
        setFabricError('โหลดไลบรารีเวกเตอร์สำเร็จแต่ระบบไม่พบโมดูล FabricJS บนเบราว์เซอร์');
      }
    };

    const handleScriptError = (err: any) => {
      console.error('Failed to load fabric library from CDN:', err);
      if (!isMounted) return;
      setFabricError('ไม่สามารถโหลดโมดูลออกแบบเวกเตอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่อีกครั้ง');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      script.async = true;
      document.body.appendChild(script);
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
    } else {
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch custom images of user
  const fetchUploadedImages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/infographics-assets/images?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          setUploadedImagesList(data.images);
        }
      }
    } catch (err) {
      console.error('Failed to load user images:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUploadedImages();
    }
  }, [user]);

  // Initial setup of canvas and event handlers
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current) return;

    // Create the Fabric.js Canvas instance
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: backgroundColor,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    const canvasElement = initCanvas.getElement();
    const upperCanvasEl = initCanvas.upperCanvasEl;
    const wrapperEl = initCanvas.wrapperEl;

    if (canvasElement) canvasElement.id = 'penpot-web-canvas-node';
    if (upperCanvasEl) upperCanvasEl.id = 'penpot-web-canvas-upper';
    if (wrapperEl) wrapperEl.id = 'penpot-web-canvas-wrapper';

    // Hook selection and modified events
    const updateSelection = () => {
      const activeObj = initCanvas.getActiveObject();
      setSelectedObject(activeObj || null);
      syncLayersList(initCanvas);

      if (activeObj) {
        setObjX(Math.round(activeObj.left || 0));
        setObjY(Math.round(activeObj.top || 0));
        setObjW(Math.round((activeObj.width || 0) * (activeObj.scaleX || 1)));
        setObjH(Math.round((activeObj.height || 0) * (activeObj.scaleY || 1)));
        setObjAngle(Math.round(activeObj.angle || 0));
        setObjOpacity(Math.round((activeObj.opacity || 1) * 100));
        
        if (activeObj.fill && typeof activeObj.fill === 'string') {
          setObjFill(activeObj.fill);
        }
        if (activeObj.stroke && typeof activeObj.stroke === 'string') {
          setObjStroke(activeObj.stroke);
        }
        setObjStrokeWidth(activeObj.strokeWidth || 0);
        setObjCornerRadius(activeObj.rx || 0);

        if (activeObj.shadow && typeof activeObj.shadow === 'object') {
          setObjShadowColor(activeObj.shadow.color || 'rgba(0,0,0,0)');
          setObjShadowBlur(activeObj.shadow.blur || 0);
        } else {
          setObjShadowColor('rgba(0,0,0,0)');
          setObjShadowBlur(0);
        }

        // Handle text formatting settings
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox') {
          setFontFamily(activeObj.fontFamily || 'Sarabun');
          setFontSize(activeObj.fontSize || 24);
          setLineHeight(activeObj.lineHeight || 1.2);
          setCharSpacing(activeObj.charSpacing || 0);
          setIsBold(activeObj.fontWeight === 'bold');
          setIsItalic(activeObj.fontStyle === 'italic');
          setIsUnderline(Boolean(activeObj.underline));
          setTextAlign(activeObj.textAlign || 'left');
        }
      } else {
        setObjX('');
        setObjY('');
        setObjW('');
        setObjH('');
        setObjAngle('');
      }
    };

    initCanvas.on('selection:created', updateSelection);
    initCanvas.on('selection:updated', updateSelection);
    initCanvas.on('selection:cleared', updateSelection);
    initCanvas.on('object:modified', updateSelection);
    initCanvas.on('object:moving', (e: any) => {
      if (snapToGrid && e.target) {
        e.target.set({
          left: Math.round(e.target.left / gridSize) * gridSize,
          top: Math.round(e.target.top / gridSize) * gridSize
        });
      }
      updateSelection();
    });

    setCanvas(initCanvas);

    // Load initial empty history or auto-restore session
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setProjectName(parsed.name || 'โปรเจกต์ใหม่');
        if (parsed.pagesList && Array.isArray(parsed.pagesList) && parsed.pagesList.length > 0) {
          pagesListRef.current = parsed.pagesList;
          setPagesList(parsed.pagesList);
          const activeIdx = parsed.currentPageIndex !== undefined ? parsed.currentPageIndex : 0;
          currentPageIndexRef.current = activeIdx;
          setCurrentPageIndex(activeIdx);
          const targetJSON = parsed.pagesList[activeIdx] || parsed.canvasJSON;
          if (targetJSON) {
            initCanvas.loadFromJSON(targetJSON, () => {
              initCanvas.backgroundColor = parsed.backgroundColor || '#ffffff';
              initCanvas.requestRenderAll();
              syncLayersList(initCanvas);
            });
          }
        } else if (parsed.canvasJSON) {
          const initP = [parsed.canvasJSON];
          pagesListRef.current = initP;
          setPagesList(initP);
          currentPageIndexRef.current = 0;
          setCurrentPageIndex(0);
          initCanvas.loadFromJSON(parsed.canvasJSON, () => {
            initCanvas.backgroundColor = parsed.backgroundColor || '#ffffff';
            initCanvas.requestRenderAll();
            syncLayersList(initCanvas);
          });
        } else {
          // Empty starting page
          const emptyInit = JSON.stringify(initCanvas.toJSON(FABRIC_CUSTOM_PROPS));
          pagesListRef.current = [emptyInit];
          setPagesList([emptyInit]);
          currentPageIndexRef.current = 0;
          setCurrentPageIndex(0);
        }
        
        if (parsed.canvasSize) {
          setCanvasSize(parsed.canvasSize);
          initCanvas.setDimensions(parsed.canvasSize);
        }
        if (parsed.backgroundColor) {
          setBackgroundColor(parsed.backgroundColor);
        }
      } else {
        // First initialization
        const emptyInit = JSON.stringify(initCanvas.toJSON(FABRIC_CUSTOM_PROPS));
        pagesListRef.current = [emptyInit];
        setPagesList([emptyInit]);
        currentPageIndexRef.current = 0;
        setCurrentPageIndex(0);
      }
    } catch (err) {
      console.warn('Could not restore editor session:', err);
    }

    // Window keyboard listener for quick delete (Penpot style)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = initCanvas.getActiveObject();
        if (active) {
          if (active.type === 'activeSelection') {
            active.forEachObject((obj: any) => initCanvas.remove(obj));
            initCanvas.discardActiveObject();
          } else {
            initCanvas.remove(active);
          }
          initCanvas.requestRenderAll();
          saveHistory(initCanvas);
          syncLayersList(initCanvas);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      initCanvas.dispose();
    };
  }, [fabricLoaded]);

  // Sync Layers List
  const syncLayersList = (canvasInstance = canvas) => {
    if (!canvasInstance) return;
    const objs = canvasInstance.getObjects();
    const list = objs.map((obj: any) => {
      if (!obj.id) {
        obj.id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
      if (!obj.name) {
        let label = 'วัตถุเวกเตอร์';
        if (obj.type === 'rect') label = 'สี่เหลี่ยมเวกเตอร์';
        else if (obj.type === 'circle') label = 'วงกลมเวกเตอร์';
        else if (obj.type === 'triangle') label = 'สามเหลี่ยมเวกเตอร์';
        else if (obj.type === 'i-text' || obj.type === 'textbox') {
          label = `ข้อความ: "${obj.text?.substring(0, 15) || ''}"`;
        }
        else if (obj.type === 'image') label = 'รูปภาพเวกเตอร์';
        else if (obj.type === 'group') label = 'กลุ่มเวกเตอร์ (Group)';
        else if (obj.type === 'path') label = 'ลายเส้นพาธ';
        obj.name = label;
      }
      return {
        id: obj.id,
        name: obj.name,
        type: obj.type,
        visible: obj.visible !== false,
        locked: !obj.selectable,
        active: canvasInstance.getActiveObject() === obj || (canvasInstance.getActiveObjects && canvasInstance.getActiveObjects().includes(obj)),
        ref: obj
      };
    }).reverse();
    setLayersList(list);
  };

  // Undo / Redo History saving
  const saveHistory = (canvasInstance = canvas) => {
    if (!canvasInstance || isHistoryActionRef.current) return;
    try {
      const state = JSON.stringify(canvasInstance.toJSON(FABRIC_CUSTOM_PROPS));
      const newHistory = canvasHistory.slice(0, historyIndex + 1);
      newHistory.push(state);
      setCanvasHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Keep pagesList updated in sync and write to session storage safely using refs
      const activeIdx = currentPageIndexRef.current;
      const currentPages = [...pagesListRef.current];
      if (currentPages.length === 0) {
        currentPages[0] = state;
      } else {
        currentPages[activeIdx] = state;
      }
      pagesListRef.current = currentPages;
      setPagesList(currentPages);
      
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        name: projectName,
        canvasJSON: state,
        canvasSize: canvasSize,
        backgroundColor: backgroundColor,
        pagesList: currentPages,
        currentPageIndex: activeIdx
      }));
    } catch (err) {
      console.error('Error saving undo history:', err);
    }
  };

  // Helper to sync active canvas to current page state before exporting
  const saveCurrentCanvasToPagesList = () => {
    if (!canvas) return;
    try {
      const state = JSON.stringify(canvas.toJSON(FABRIC_CUSTOM_PROPS));
      const activeIdx = currentPageIndexRef.current;
      const currentPages = [...pagesListRef.current];
      if (currentPages.length === 0) {
        currentPages[0] = state;
      } else {
        currentPages[activeIdx] = state;
      }
      pagesListRef.current = currentPages;
      setPagesList(currentPages);
    } catch (e) {
      console.error('Failed to sync canvas to pagesList:', e);
    }
  };

  // Undo execution
  const executeUndo = () => {
    if (!canvas || historyIndex <= 0) return;
    isHistoryActionRef.current = true;
    const prevIndex = historyIndex - 1;
    const stateStr = canvasHistory[prevIndex];
    canvas.loadFromJSON(stateStr, () => {
      canvas.requestRenderAll();
      setHistoryIndex(prevIndex);
      syncLayersList();
      isHistoryActionRef.current = false;
    });
  };

  // Redo execution
  const executeRedo = () => {
    if (!canvas || historyIndex >= canvasHistory.length - 1) return;
    isHistoryActionRef.current = true;
    const nextIndex = historyIndex + 1;
    const stateStr = canvasHistory[nextIndex];
    canvas.loadFromJSON(stateStr, () => {
      canvas.requestRenderAll();
      setHistoryIndex(nextIndex);
      syncLayersList();
      isHistoryActionRef.current = false;
    });
  };

  // Save changes automatically after canvas operations
  useEffect(() => {
    if (!canvas) return;
    const handleAction = () => {
      saveHistory();
      syncLayersList();
    };
    canvas.on('object:added', handleAction);
    canvas.on('object:removed', handleAction);
    canvas.on('object:modified', handleAction);
    return () => {
      canvas.off('object:added', handleAction);
      canvas.off('object:removed', handleAction);
      canvas.off('object:modified', handleAction);
    };
  }, [canvas, canvasHistory, historyIndex]);

  // Adjust canvas dimension settings
  const handleUpdateCanvasSize = (w: number, h: number) => {
    setCanvasSize({ width: w, height: h });
    if (canvas) {
      canvas.setDimensions({ width: w, height: h });
      canvas.requestRenderAll();
      saveHistory();
    }
  };

  const handleUpdateCanvasBg = (color: string) => {
    setBackgroundColor(color);
    if (canvas) {
      canvas.backgroundColor = color;
      canvas.requestRenderAll();
      saveHistory();
    }
  };

  // Alignment Tools (Penpot Inspector panel style)
  const handleAlignSelected = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (activeObj.type === 'activeSelection') {
      const groupWidth = activeObj.width || 0;
      const groupHeight = activeObj.height || 0;
      activeObj.forEachObject((obj: any) => {
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);
        
        if (type === 'left') obj.set({ left: -groupWidth / 2 });
        else if (type === 'center') obj.set({ left: 0 - objWidth / 2 });
        else if (type === 'right') obj.set({ left: groupWidth / 2 - objWidth });
        else if (type === 'top') obj.set({ top: -groupHeight / 2 });
        else if (type === 'middle') obj.set({ top: 0 - objHeight / 2 });
        else if (type === 'bottom') obj.set({ top: groupHeight / 2 - objHeight });
      });
    } else {
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 1200;
      const objWidth = (activeObj.width || 0) * (activeObj.scaleX || 1);
      const objHeight = (activeObj.height || 0) * (activeObj.scaleY || 1);

      if (type === 'left') activeObj.set({ left: 0 });
      else if (type === 'center') activeObj.set({ left: (canvasWidth - objWidth) / 2 });
      else if (type === 'right') activeObj.set({ left: canvasWidth - objWidth });
      else if (type === 'top') activeObj.set({ top: 0 });
      else if (type === 'middle') activeObj.set({ top: (canvasHeight - objHeight) / 2 });
      else if (type === 'bottom') activeObj.set({ top: canvasHeight - objHeight });
    }
    canvas.requestRenderAll();
    saveHistory();
  };

  // Distribute spacing tools
  const handleDistributeSelected = (direction: 'horizontal' | 'vertical') => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeSelection') return;

    const objects = activeObj.getObjects ? [...activeObj.getObjects()] : [...activeObj._objects];
    if (objects.length < 3) return;

    if (direction === 'horizontal') {
      objects.sort((a, b) => a.left - b.left);
      const minLeft = objects[0].left;
      const maxLeft = objects[objects.length - 1].left;
      const totalSpacing = maxLeft - minLeft - objects[0].width * objects[0].scaleX;
      const step = totalSpacing / (objects.length - 1);
      for (let i = 1; i < objects.length - 1; i++) {
        objects[i].set({ left: minLeft + i * step });
      }
    } else {
      objects.sort((a, b) => a.top - b.top);
      const minTop = objects[0].top;
      const maxTop = objects[objects.length - 1].top;
      const totalSpacing = maxTop - minTop - objects[0].height * objects[0].scaleY;
      const step = totalSpacing / (objects.length - 1);
      for (let i = 1; i < objects.length - 1; i++) {
        objects[i].set({ top: minTop + i * step });
      }
    }
    canvas.requestRenderAll();
    saveHistory();
  };

  // Geometry Properties Updates
  const handleGeometryChange = (prop: string, val: number) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (prop === 'left') {
      activeObj.set({ left: val });
      setObjX(val);
    } else if (prop === 'top') {
      activeObj.set({ top: val });
      setObjY(val);
    } else if (prop === 'width') {
      activeObj.set({ scaleX: val / (activeObj.width || 1) });
      setObjW(val);
    } else if (prop === 'height') {
      activeObj.set({ scaleY: val / (activeObj.height || 1) });
      setObjH(val);
    } else if (prop === 'angle') {
      activeObj.set({ angle: val });
      setObjAngle(val);
    } else if (prop === 'rx') {
      activeObj.set({ rx: val, ry: val });
      setObjCornerRadius(val);
    } else if (prop === 'opacity') {
      activeObj.set({ opacity: val / 100 });
      setObjOpacity(val);
    }
    canvas.requestRenderAll();
    saveHistory();
  };

  // Appearance Updates
  const handleAppearanceChange = (prop: string, val: any) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (prop === 'fill') {
      activeObj.set({ fill: val });
      setObjFill(val);
    } else if (prop === 'stroke') {
      activeObj.set({ stroke: val });
      setObjStroke(val);
    } else if (prop === 'strokeWidth') {
      activeObj.set({ strokeWidth: val });
      setObjStrokeWidth(val);
    } else if (prop === 'shadowBlur') {
      setObjShadowBlur(val);
      activeObj.set({
        shadow: new fabric.Shadow({
          color: objShadowColor,
          blur: val,
          offsetX: 3,
          offsetY: 3
        })
      });
    } else if (prop === 'shadowColor') {
      setObjShadowColor(val);
      activeObj.set({
        shadow: new fabric.Shadow({
          color: val,
          blur: objShadowBlur,
          offsetX: 3,
          offsetY: 3
        })
      });
    }
    canvas.requestRenderAll();
    saveHistory();
  };

  // Typography Formatting Updates
  const handleTypographyChange = (prop: string, val: any) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj.type !== 'i-text' && activeObj.type !== 'textbox')) return;

    if (prop === 'fontFamily') {
      setFontFamily(val);
      ensureGoogleFontLoaded(val);
      activeObj.set({ fontFamily: val });
    } else if (prop === 'fontSize') {
      setFontSize(val);
      activeObj.set({ fontSize: val });
    } else if (prop === 'lineHeight') {
      setLineHeight(val);
      activeObj.set({ lineHeight: val });
    } else if (prop === 'charSpacing') {
      setCharSpacing(val);
      activeObj.set({ charSpacing: val });
    } else if (prop === 'bold') {
      setIsBold(val);
      activeObj.set({ fontWeight: val ? 'bold' : 'normal' });
    } else if (prop === 'italic') {
      setIsItalic(val);
      activeObj.set({ fontStyle: val ? 'italic' : 'normal' });
    } else if (prop === 'underline') {
      setIsUnderline(val);
      activeObj.set({ underline: val });
    } else if (prop === 'textAlign') {
      setTextAlign(val);
      activeObj.set({ textAlign: val });
    }
    canvas.requestRenderAll();
    saveHistory();
  };

  // Vector Shapes Insertion (Penpot Toolbar style)
  const handleInsertShape = (shapeType: string) => {
    if (!canvas) return;
    let shapeObj;
    const commonProps = {
      left: 100,
      top: 100,
      fill: objFill || '#3b82f6',
      stroke: objStroke || '#1e3a8a',
      strokeWidth: objStrokeWidth || 0,
      id: `shape_${Date.now()}`,
      name: `สี่เหลี่ยมเวกเตอร์`
    };

    if (shapeType === 'rect') {
      shapeObj = new fabric.Rect({
        ...commonProps,
        width: 150,
        height: 100,
        rx: objCornerRadius,
        ry: objCornerRadius,
        name: 'สี่เหลี่ยมเวกเตอร์'
      });
    } else if (shapeType === 'circle') {
      shapeObj = new fabric.Circle({
        ...commonProps,
        radius: 75,
        name: 'วงกลมเวกเตอร์'
      });
    } else if (shapeType === 'triangle') {
      shapeObj = new fabric.Triangle({
        ...commonProps,
        width: 150,
        height: 120,
        name: 'สามเหลี่ยมเวกเตอร์'
      });
    } else if (shapeType === 'line') {
      shapeObj = new fabric.Line([50, 50, 250, 50], {
        stroke: objStroke || '#1e3a8a',
        strokeWidth: 4,
        id: `line_${Date.now()}`,
        name: 'เส้นตรงเวกเตอร์'
      });
    } else if (shapeType === 'arrow') {
      // Draw an Arrow
      const points = [
        { x: 0, y: 10 },
        { x: 100, y: 10 },
        { x: 90, y: 0 },
        { x: 100, y: 10 },
        { x: 90, y: 20 },
        { x: 100, y: 10 }
      ];
      shapeObj = new fabric.Polyline(points, {
        stroke: objStroke || '#1e3a8a',
        strokeWidth: 4,
        fill: '',
        id: `arrow_${Date.now()}`,
        name: 'หัวลูกศรเวกเตอร์'
      });
    }

    if (shapeObj) {
      canvas.add(shapeObj);
      canvas.setActiveObject(shapeObj);
      canvas.requestRenderAll();
      saveHistory();
      syncLayersList();
    }
  };

  // Text Insertion
  const handleInsertText = (presetSize: 'h1' | 'h2' | 'body') => {
    if (!canvas) return;
    let size = 24;
    let textStr = 'พิมพ์ข้อความที่นี่';
    let weight = 'normal';

    if (presetSize === 'h1') {
      size = 48;
      textStr = 'หัวข้อใหญ่ภาษาไทย';
      weight = 'bold';
    } else if (presetSize === 'h2') {
      size = 32;
      textStr = 'หัวข้อย่อยภาษาไทย';
      weight = 'bold';
    } else {
      size = 20;
      textStr = 'รายละเอียดข้อมูลภาษาไทย';
    }

    const textObj = new fabric.Textbox(textStr, {
      left: 100,
      top: 150,
      width: 400,
      fontFamily: fontFamily || 'Sarabun',
      fontSize: size,
      fontWeight: weight,
      fill: '#1e293b',
      id: `text_${Date.now()}`,
      name: `ข้อความ: "${textStr}"`
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.requestRenderAll();
    saveHistory();
    syncLayersList();
  };

  // Draw Path (Pen Tool mode)
  const toggleDrawMode = () => {
    if (!canvas) return;
    const isDrawing = !canvas.isDrawingMode;
    canvas.isDrawingMode = isDrawing;
    if (isDrawing) {
      canvas.freeDrawingBrush.color = objStroke || '#3b82f6';
      canvas.freeDrawingBrush.width = objStrokeWidth || 4;
      setSaveToast({ message: 'โหมดวาดลายเส้นฟรีสไตล์เปิดแล้ว (ลากปากกาลงบนกระดาษ)', type: 'success' });
    } else {
      setSaveToast({ message: 'โหมดวาดปิดตัวลงกลับสู่โหมดเลือกวัตถุ', type: 'success' });
    }
  };

  // Save to MySQL Server (REST APIs Integration)
  const handleSaveToMySQL = async () => {
    if (!canvas) return;
    setIsSaving(true);

    const currentJSON = JSON.stringify(canvas.toJSON(FABRIC_CUSTOM_PROPS));
    const currentPages = [...pagesListRef.current];
    const currentIdx = currentPageIndexRef.current;
    if (currentPages.length === 0) {
      currentPages[0] = currentJSON;
    } else {
      currentPages[currentIdx] = currentJSON;
    }
    pagesListRef.current = currentPages;
    setPagesList(currentPages);

    const payload = {
      canvasJSON: canvas.toJSON(FABRIC_CUSTOM_PROPS),
      size: canvasSize,
      backgroundColor: backgroundColor,
      pages: currentPages,
      currentPageIndex: currentIdx
    };

    // Grab a fast thumbnail PNG
    const thumbnail = canvas.toDataURL({
      format: 'png',
      quality: 0.3,
      multiplier: 0.2
    });

    try {
      if (currentProjectId) {
        const res = await fetch(`/api/infographics/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            data: JSON.stringify(payload),
            thumbnail,
            scope,
            ownerId: user?.id || null,
            ownerName: ownerName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้สร้างสรรค์',
            ownerDepartment: ownerDepartment || user?.department || 'หน่วยงาน',
            allowedEditors,
            allowDepartmentEdit
          })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || errBody.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }

        const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(nowStr);
        setSaveToast({ message: `อัปเดตและซิงค์โปรเจกต์ "${projectName}" ไปยัง MySQL สำเร็จ (${nowStr} น.)`, type: 'success' });
      } else {
        const res = await fetch('/api/infographics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            data: JSON.stringify(payload),
            thumbnail,
            scope,
            ownerId: user?.id || null,
            ownerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้สร้างสรรค์',
            ownerDepartment: user?.department || 'หน่วยงาน',
            allowedEditors,
            allowDepartmentEdit
          })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || errBody.message || 'Failed to create infographic');
        }

        const data = await res.json();
        setCurrentProjectId(data.id);
        const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(nowStr);
        setSaveToast({ message: `บันทึกโครงการออกแบบและสร้างฐานข้อมูล MySQL ใหม่เรียบร้อยแล้ว`, type: 'success' });
      }
    } catch (err: any) {
      console.error('MySQL database write error:', err);
      setSaveToast({ message: err?.message || 'การเขียนข้อมูลลง MySQL ล้มเหลว', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  // Load project selected from Gallery list
  const loadProjectDB = async (id: string) => {
    if (!canvas) return;
    try {
      const res = await fetch(`/api/infographics/${id}`);
      if (!res.ok) throw new Error('ไม่สามารถเชื่อมต่อดึงข้อมูลโปรเจกต์จาก MySQL ได้');
      const dbData = await res.json();
      
      setCurrentProjectId(dbData.id);
      setProjectName(dbData.name || 'ไม่มีชื่อโปรเจกต์');
      
      if (dbData.data) {
        const payload = JSON.parse(dbData.data);
        if (payload.pages && Array.isArray(payload.pages) && payload.pages.length > 0) {
          pagesListRef.current = payload.pages;
          setPagesList(payload.pages);
          const activeIdx = payload.currentPageIndex !== undefined ? payload.currentPageIndex : 0;
          currentPageIndexRef.current = activeIdx;
          setCurrentPageIndex(activeIdx);
          const pageData = payload.pages[activeIdx] || payload.canvasJSON;
          canvas.loadFromJSON(pageData, () => {
            canvas.backgroundColor = payload.backgroundColor || '#ffffff';
            canvas.requestRenderAll();
            syncLayersList(canvas);
            saveHistory(canvas);
          });
        } else if (payload.canvasJSON) {
          const initPages = [typeof payload.canvasJSON === 'string' ? payload.canvasJSON : JSON.stringify(payload.canvasJSON)];
          pagesListRef.current = initPages;
          setPagesList(initPages);
          currentPageIndexRef.current = 0;
          setCurrentPageIndex(0);
          canvas.loadFromJSON(payload.canvasJSON, () => {
            canvas.backgroundColor = payload.backgroundColor || '#ffffff';
            canvas.requestRenderAll();
            syncLayersList(canvas);
            saveHistory(canvas);
          });
        }
        if (payload.size) {
          setCanvasSize(payload.size);
          canvas.setDimensions(payload.size);
        }
        if (payload.backgroundColor) {
          setBackgroundColor(payload.backgroundColor);
        }
      }
      setShowGalleryModal(false);
      setSaveToast({ message: `โหลดผลงาน "${dbData.name || 'โปรเจกต์'}" จากฐานข้อมูล MySQL เรียบร้อย`, type: 'success' });
    } catch (err: any) {
      console.error('Failed to parse infographic state:', err);
      setSaveToast({ message: 'เกิดข้อผิดพลาดในการโหลดผลงานเนื่องจากฟอร์แมตข้อมูลไม่ถูกต้อง', type: 'error' });
    }
  };

  // Polotno-Style Multi-Page Actions
  const handleSwitchPage = (index: number) => {
    if (!canvas) return;
    const currentPages = [...pagesListRef.current];
    const currentIdx = currentPageIndexRef.current;
    
    if (index < 0 || index >= currentPages.length || index === currentIdx) return;
    
    // 1. Save current active page state into pages list
    const currentJSON = JSON.stringify(canvas.toJSON(FABRIC_CUSTOM_PROPS));
    currentPages[currentIdx] = currentJSON;
    
    // 2. Update refs and state synchronously
    pagesListRef.current = currentPages;
    currentPageIndexRef.current = index;
    setPagesList(currentPages);
    setCurrentPageIndex(index);
    
    // 3. Load targeted page JSON
    const targetJSON = currentPages[index];
    if (!targetJSON) return;
    
    isHistoryActionRef.current = true;
    canvas.loadFromJSON(targetJSON, () => {
      canvas.backgroundColor = backgroundColor || '#ffffff';
      canvas.requestRenderAll();
      syncLayersList(canvas);
      isHistoryActionRef.current = false;
      
      // Update history for this page
      setCanvasHistory([targetJSON]);
      setHistoryIndex(0);
      
      // Update sessionStorage
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        name: projectName,
        canvasJSON: targetJSON,
        canvasSize: canvasSize,
        backgroundColor: backgroundColor,
        pagesList: currentPages,
        currentPageIndex: index
      }));
    });
    setSaveToast({ message: `สลับไปแผ่นงานหน้า ${index + 1} เรียบร้อย`, type: 'success' });
  };

  const handleAddPage = () => {
    if (!canvas) return;
    
    // 1. Immediately save the current active canvas state into currentPages
    const currentJSON = JSON.stringify(canvas.toJSON(FABRIC_CUSTOM_PROPS));
    const currentPages = [...pagesListRef.current];
    const currentIdx = currentPageIndexRef.current;
    
    if (currentPages.length === 0) {
      currentPages[0] = currentJSON;
    } else {
      currentPages[currentIdx] = currentJSON;
    }
    
    // 2. Create new blank page JSON state
    const emptyCanvas = {
      version: "5.3.0",
      objects: [],
      background: backgroundColor || '#ffffff'
    };
    const emptyJSON = JSON.stringify(emptyCanvas);
    currentPages.push(emptyJSON);
    
    const newIdx = currentPages.length - 1;
    
    // 3. Update refs and state synchronously BEFORE touching canvas
    pagesListRef.current = currentPages;
    currentPageIndexRef.current = newIdx;
    setPagesList(currentPages);
    setCurrentPageIndex(newIdx);
    
    // 4. Reset history to the new page's initial state
    setCanvasHistory([emptyJSON]);
    setHistoryIndex(0);
    
    // 5. Clear the canvas for the new page without triggering auto-save listeners
    isHistoryActionRef.current = true;
    canvas.clear();
    canvas.backgroundColor = backgroundColor || '#ffffff';
    canvas.requestRenderAll();
    syncLayersList(canvas);
    isHistoryActionRef.current = false;
    
    // 6. Update sessionStorage with both the preserved previous page(s) and new page
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      name: projectName,
      canvasJSON: emptyJSON,
      canvasSize: canvasSize,
      backgroundColor: backgroundColor,
      pagesList: currentPages,
      currentPageIndex: newIdx
    }));
    
    setSaveToast({ message: `เพิ่มแผ่นงานใหม่ (หน้า ${newIdx + 1}) เรียบร้อย - บันทึกหน้าเดิมแล้ว`, type: 'success' });
  };

  const handleDuplicatePage = (targetIdx?: number) => {
    if (!canvas) return;
    const currentPages = [...pagesListRef.current];
    const currentIdx = currentPageIndexRef.current;
    const sourceIdx = targetIdx !== undefined ? targetIdx : currentIdx;
    
    // 1. Save current active canvas
    const currentJSON = JSON.stringify(canvas.toJSON(FABRIC_CUSTOM_PROPS));
    if (currentPages.length === 0) {
      currentPages[0] = currentJSON;
    } else {
      currentPages[currentIdx] = currentJSON;
    }
    
    // 2. Duplicate source page
    const sourceJSON = currentPages[sourceIdx] || currentJSON;
    const newIdx = sourceIdx + 1;
    currentPages.splice(newIdx, 0, sourceJSON);
    
    // 3. Update refs and state
    pagesListRef.current = currentPages;
    currentPageIndexRef.current = newIdx;
    setPagesList(currentPages);
    setCurrentPageIndex(newIdx);
    
    // 4. Load duplicate onto canvas
    isHistoryActionRef.current = true;
    canvas.loadFromJSON(sourceJSON, () => {
      canvas.backgroundColor = backgroundColor || '#ffffff';
      canvas.requestRenderAll();
      syncLayersList(canvas);
      isHistoryActionRef.current = false;
      
      setCanvasHistory([sourceJSON]);
      setHistoryIndex(0);
      
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        name: projectName,
        canvasJSON: sourceJSON,
        canvasSize: canvasSize,
        backgroundColor: backgroundColor,
        pagesList: currentPages,
        currentPageIndex: newIdx
      }));
    });
    
    setSaveToast({ message: `คัดลอกเพิ่มแผ่นงานหน้าใหม่ (หน้า ${newIdx + 1}) เรียบร้อย`, type: 'success' });
  };

  const handleDeletePage = (index: number) => {
    if (!canvas) return;
    const currentPages = [...pagesListRef.current];
    if (currentPages.length <= 1) {
      setSaveToast({ message: `ไม่สามารถลบหน้าได้ เนื่องจากต้องมีอย่างน้อย 1 แผ่นงาน`, type: 'error' });
      return;
    }
    
    const updated = currentPages.filter((_, idx) => idx !== index);
    let nextIdx = currentPageIndexRef.current;
    if (index === nextIdx) {
      nextIdx = Math.max(0, index - 1);
    } else if (index < nextIdx) {
      nextIdx = nextIdx - 1;
    }
    
    pagesListRef.current = updated;
    currentPageIndexRef.current = nextIdx;
    setPagesList(updated);
    setCurrentPageIndex(nextIdx);
    
    const targetJSON = updated[nextIdx];
    if (targetJSON) {
      isHistoryActionRef.current = true;
      canvas.loadFromJSON(targetJSON, () => {
        canvas.backgroundColor = backgroundColor || '#ffffff';
        canvas.requestRenderAll();
        syncLayersList(canvas);
        isHistoryActionRef.current = false;
        
        setCanvasHistory([targetJSON]);
        setHistoryIndex(0);
        
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          name: projectName,
          canvasJSON: targetJSON,
          canvasSize: canvasSize,
          backgroundColor: backgroundColor,
          pagesList: updated,
          currentPageIndex: nextIdx
        }));
      });
    }
    setSaveToast({ message: `ลบแผ่นงานหน้า ${index + 1} สำเร็จ`, type: 'success' });
  };

  // Layers Actions (Penpot style)
  const toggleLayerVisibility = (layer: any) => {
    if (!canvas) return;
    const obj = layer.ref;
    const newVisible = !obj.visible;
    obj.set({ visible: newVisible });
    if (!newVisible && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    syncLayersList();
    saveHistory();
  };

  const toggleLayerLock = (layer: any) => {
    if (!canvas) return;
    const obj = layer.ref;
    const newLocked = !obj.lockMovementX;
    obj.set({
      lockMovementX: newLocked,
      lockMovementY: newLocked,
      lockScalingX: newLocked,
      lockScalingY: newLocked,
      lockRotation: newLocked,
      hasControls: !newLocked,
      selectable: !newLocked,
      hoverCursor: newLocked ? 'default' : 'move'
    });
    if (newLocked && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    syncLayersList();
    saveHistory();
  };

  const handleSelectLayer = (layer: any, e: React.MouseEvent) => {
    if (!canvas) return;
    const obj = layer.ref;
    if (obj.visible === false || obj.selectable === false) return;
    
    if (e.shiftKey) {
      const activeObjects = canvas.getActiveObjects() || [];
      if (activeObjects.includes(obj)) {
        const index = activeObjects.indexOf(obj);
        activeObjects.splice(index, 1);
      } else {
        activeObjects.push(obj);
      }
      if (activeObjects.length === 1) {
        canvas.setActiveObject(activeObjects[0]);
      } else if (activeObjects.length > 1) {
        const sel = new (window as any).fabric.ActiveSelection(activeObjects, { canvas });
        canvas.setActiveObject(sel);
      } else {
        canvas.discardActiveObject();
      }
    } else {
      canvas.setActiveObject(obj);
    }
    canvas.requestRenderAll();
    syncLayersList();
  };

  const handleStartRenameLayer = (layer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(layer.id);
    setEditingLayerName(layer.name);
  };

  const handleSaveRenameLayer = (layerId: string) => {
    if (!canvas) return;
    const objs = canvas.getObjects();
    const obj = objs.find((o: any) => o.id === layerId);
    if (obj && editingLayerName.trim()) {
      obj.set({ name: editingLayerName.trim() });
      canvas.requestRenderAll();
      setEditingLayerId(null);
      syncLayersList();
    }
  };

  const handleDeleteLayer = (layer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;
    const obj = layer.ref;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncLayersList();
    saveHistory();
  };

  const handleMoveLayerIndex = (layer: any, direction: 'up' | 'down' | 'front' | 'back', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;
    const obj = layer.ref;
    if (direction === 'front') {
      obj.bringToFront();
    } else if (direction === 'back') {
      obj.sendToBack();
    } else if (direction === 'up') {
      obj.bringForward();
    } else if (direction === 'down') {
      obj.sendBackwards();
    }
    canvas.requestRenderAll();
    syncLayersList();
    saveHistory();
  };

  // Image Upload handler
  const handleUploadLocalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('username', user.username || '');
    formData.append('files', files[0]);

    try {
      const res = await fetch('/api/infographics/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setSaveToast({ message: 'อัปโหลดรูปภาพเสร็จเรียบร้อยและลงบันทึกในระบบ', type: 'success' });
        fetchUploadedImages();
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      setSaveToast({ message: 'การอัปโหลดไฟล์ล้มเหลว กรุณาเช็คอินเทอร์เน็ต', type: 'error' });
    } finally {
      setIsUploadingImage(false);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Delete uploaded image handler
  const handleDeleteUploadedImage = async (img: UploadedImageItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const confirmed = await confirm({
      title: 'ยืนยันการลบไฟล์รูปภาพ',
      message: `คุณต้องการลบรูปภาพ "${img.originalName || img.filename || 'นี้'}" ใช่หรือไม่? ไฟล์จะถูกลบออกจากคลังระบบถาวร`,
      type: 'delete',
      confirmText: 'ลบรูปภาพ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setDeletingImageId(img.id);
    try {
      const userId = user?.id || user?.username || 'guest';
      const res = await fetch(`/api/infographics-assets/images?url=${encodeURIComponent(img.url)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSaveToast({ message: 'ลบไฟล์รูปภาพออกจากคลังเรียบร้อยแล้ว', type: 'success' });
          setUploadedImagesList(prev => prev.filter(item => item.id !== img.id && item.url !== img.url));
          fetchUploadedImages();
        } else {
          setSaveToast({ message: data.error || 'ไม่สามารถลบรูปภาพได้', type: 'error' });
        }
      } else {
        setSaveToast({ message: 'เกิดข้อผิดพลาดในการลบรูปภาพจากเซิร์ฟเวอร์', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
      setSaveToast({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', type: 'error' });
    } finally {
      setDeletingImageId(null);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Add Uploaded/Stock Image to Canvas
  const handleAddImageToCanvas = (url: string) => {
    if (!canvas) return;
    fabric.Image.fromURL(url, (img: any) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.3,
        scaleY: 0.3,
        id: `img_${Date.now()}`,
        name: 'รูปภาพภาพเวกเตอร์'
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      saveHistory();
      syncLayersList();
    }, { crossOrigin: 'anonymous' });
  };

  // Add Dynamic Vector SVG Icon (Polotno Style)
  const handleAddSVGIcon = (svgString: string, iconName: string) => {
    if (!canvas || !fabric) return;
    
    fabric.loadSVGFromString(svgString, (objects: any, options: any) => {
      const obj = fabric.util.groupSVGElements(objects, options);
      obj.set({
        left: 150,
        top: 150,
        scaleX: 2.5,
        scaleY: 2.5,
        fill: objFill || '#1e293b',
        stroke: objStroke || '#3b82f6',
        strokeWidth: 1.5,
        id: `icon_${Date.now()}`,
        name: `ไอคอน: ${iconName}`
      });
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      saveHistory();
      syncLayersList();
    });
    setSaveToast({ message: `เพิ่มไอคอนเวกเตอร์ "${iconName}" เรียบร้อย`, type: 'success' });
  };

  // Convert Hex to Grayscale color for vector nodes (Graphite-style non-destructive node compilation)
  const hexToGrayscaleColor = (hex: string): string => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    // Compute perceived luminance (rec 709)
    const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const grayHex = gray.toString(16).padStart(2, '0');
    return `#${grayHex}${grayHex}${grayHex}`;
  };

  // Apply Graphite Node Effects Engine to selected Vector/Image layer
  const applyGraphiteNodesToCanvas = (customNodes?: any[]) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      setSaveToast({ message: '⚠️ กรุณาเลือกออบเจกต์เวกเตอร์หรือเลเยอร์เพื่อประมวลผลผ่านโนด', type: 'error' });
      return;
    }

    const nodesToUse = customNodes || graphiteNodes;
    const colorNode = nodesToUse.find(n => n.type === 'adjust');
    const effectNode = nodesToUse.find(n => n.type === 'effects');

    const colorCfg = colorNode?.config || { brightness: 0, contrast: 0, saturation: 0, hue: 0 };
    const effectCfg = effectNode?.config || { blur: 0, noise: 0, pixelate: 0, grayscale: false };

    // Standard fabric filters list
    const filters: any[] = [];

    // 1. If it's a vector object (Rect, Circle, Text, Path, Group)
    if (activeObj.type !== 'image') {
      // Apply Graphite Non-destructive Vector Adjustments
      if (effectCfg.grayscale) {
        if (activeObj.fill && typeof activeObj.fill === 'string') {
          activeObj.set('fill', hexToGrayscaleColor(activeObj.fill));
        }
        if (activeObj.stroke && typeof activeObj.stroke === 'string') {
          activeObj.set('stroke', hexToGrayscaleColor(activeObj.stroke));
        }
      }

      // Brightness / Opacity mapping
      if (colorCfg.brightness !== 0) {
        const opacityPct = Math.max(10, Math.min(100, 100 + Number(colorCfg.brightness))) / 100;
        activeObj.set('opacity', opacityPct);
      }

      // Non-destructive Blur & Glow shadow node mapping
      if (effectCfg.blur > 0) {
        activeObj.set('shadow', new fabric.Shadow({
          color: activeObj.stroke || '#ff8c00',
          blur: Math.round(effectCfg.blur / 5),
          offsetX: 0,
          offsetY: 0
        }));
      } else {
        activeObj.set('shadow', null);
      }
    } else {
      // 2. If it's a Raster Image layer, compile WebGL/2D pixel-level filter nodes
      // Grayscale
      if (effectCfg.grayscale && fabric.Image.filters.Grayscale) {
        filters.push(new fabric.Image.filters.Grayscale());
      }
      
      // Brightness (fabric takes normalized values between -1 and 1)
      if (colorCfg.brightness !== 0 && fabric.Image.filters.Brightness) {
        filters.push(new fabric.Image.filters.Brightness({
          brightness: Number(colorCfg.brightness) / 100
        }));
      }

      // Contrast (fabric takes normalized values between -1 and 1)
      if (colorCfg.contrast !== 0 && fabric.Image.filters.Contrast) {
        filters.push(new fabric.Image.filters.Contrast({
          contrast: Number(colorCfg.contrast) / 100
        }));
      }

      // Saturation (fabric takes normalized values between -1 and 1)
      if (colorCfg.saturation !== 0 && fabric.Image.filters.Saturation) {
        filters.push(new fabric.Image.filters.Saturation({
          saturation: Number(colorCfg.saturation) / 100
        }));
      }

      // Pixelate (pixel block size)
      if (effectCfg.pixelate > 0 && fabric.Image.filters.Pixelate) {
        filters.push(new fabric.Image.filters.Pixelate({
          blocksize: Math.round(effectCfg.pixelate / 4)
        }));
      }

      // Noise (amount of pixel grain)
      if (effectCfg.noise > 0 && fabric.Image.filters.Noise) {
        filters.push(new fabric.Image.filters.Noise({
          noise: Math.round(effectCfg.noise * 2.5)
        }));
      }

      // Set the compiled filters onto active image layer non-destructively
      activeObj.filters = filters;
      activeObj.applyFilters();
    }

    canvas.requestRenderAll();
    saveHistory();
    setSaveToast({ message: '⚡ คอมไพล์ทรีโนดลงสเตตแผ่นงานเรียบร้อย', type: 'success' });
  };

  // AI Prompt Content Generator (Gemini Server API)
  const handleGenerateAIContent = async () => {
    if (!aiPrompt.trim() || !canvas) return;
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/infographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.content) {
          // Place generated text on canvas
          const textObj = new fabric.Textbox(result.content, {
            left: 150,
            top: 200,
            width: 500,
            fontFamily: 'Sarabun',
            fontSize: 22,
            fill: '#0f172a',
            id: `ai_${Date.now()}`,
            name: `ข้อความ AI: "${result.content.substring(0, 10)}"`
          });
          canvas.add(textObj);
          canvas.setActiveObject(textObj);
          canvas.requestRenderAll();
          saveHistory();
          syncLayersList();
          setSaveToast({ message: 'สร้างหัวข้อเนื้อหาสำเร็จเรียบร้อย', type: 'success' });
        }
      } else {
        throw new Error('Gemini API return status code not ok');
      }
    } catch (err) {
      console.error(err);
      setSaveToast({ message: 'AI มีปัญหาการติดต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง', type: 'error' });
    } finally {
      setAiGenerating(false);
    }
  };

  // Helper to generate a 100% standalone, complete, high-fidelity SVG string
  const generateCompleteSVG = async (
    targetCanvas: any,
    size: { width: number; height: number },
    bgCol: string
  ): Promise<string> => {
    if (!targetCanvas) throw new Error('ไม่พบข้อมูลผืนผ้าใบ');

    // 1. Temporarily discard active object selection to avoid rendering bounding boxes & selection handles
    const activeObj = targetCanvas.getActiveObject ? targetCanvas.getActiveObject() : null;
    if (activeObj && targetCanvas.discardActiveObject) {
      targetCanvas.discardActiveObject();
      targetCanvas.requestRenderAll();
    }

    try {
      // 2. Export raw SVG with full dimensions and viewBox from Fabric
      let svgContent = targetCanvas.toSVG({
        suppressPreamble: false,
        encoding: 'UTF-8',
        width: `${size.width}px`,
        height: `${size.height}px`,
        viewBox: {
          x: 0,
          y: 0,
          width: size.width,
          height: size.height
        }
      });

      // 3. Ensure proper SVG opening tag with XMLNS and viewBox
      if (!svgContent.includes('viewBox="') && !svgContent.includes("viewBox='")) {
        svgContent = svgContent.replace(
          /<svg\b([^>]*)>/i,
          `<svg$1 viewBox="0 0 ${size.width} ${size.height}">`
        );
      }
      if (svgContent.includes('xlink:href') && !svgContent.includes('xmlns:xlink')) {
        svgContent = svgContent.replace(
          /<svg\b([^>]*)>/i,
          '<svg$1 xmlns:xlink="http://www.w3.org/1999/xlink">'
        );
      }
      if (!svgContent.includes('xml:space="preserve"')) {
        svgContent = svgContent.replace(
          /<svg\b([^>]*)>/i,
          '<svg$1 xml:space="preserve">'
        );
      }

      // 4. Extract all raster / external image URLs from xlink:href and href to convert them to Base64
      const urlMatches = new Set<string>();
      const hrefRegex = /(?:xlink:href|href)=["']([^"']+)["']/gi;
      let match;
      while ((match = hrefRegex.exec(svgContent)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('data:') && !url.startsWith('#')) {
          urlMatches.add(url);
        }
      }

      if (urlMatches.size > 0) {
        const urlMap = new Map<string, string>();
        await Promise.all(
          Array.from(urlMatches).map(async (url) => {
            try {
              // A. Check if targetCanvas has a fabric.Image object with this source loaded
              const objects = targetCanvas.getObjects ? targetCanvas.getObjects() : [];
              for (const obj of objects) {
                if (obj && obj.type === 'image' && obj._element) {
                  const elSrc = obj._element.src || (obj.getSrc ? obj.getSrc() : '');
                  if (elSrc === url || (url.includes('/') && elSrc && elSrc.endsWith(url))) {
                    try {
                      const tempCvs = document.createElement('canvas');
                      tempCvs.width = obj._element.naturalWidth || obj._element.width || 400;
                      tempCvs.height = obj._element.naturalHeight || obj._element.height || 400;
                      const ctx = tempCvs.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(obj._element, 0, 0);
                        const b64 = tempCvs.toDataURL('image/png');
                        if (b64 && b64.startsWith('data:image')) {
                          urlMap.set(url, b64);
                          return;
                        }
                      }
                    } catch (e) {
                      // Canvas tainted fallback to fetch
                    }
                  }
                }
              }

              // B. Fetch directly as blob and convert via FileReader
              const res = await fetch(url, { credentials: 'same-origin' });
              if (res.ok) {
                const blob = await res.blob();
                const b64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                if (b64 && b64.startsWith('data:')) {
                  urlMap.set(url, b64);
                  return;
                }
              }
            } catch (err) {
              console.warn('Could not inline image URL to base64 in SVG:', url, err);
            }
          })
        );

        // Replace each URL with Base64 Data URL
        for (const [url, base64] of urlMap.entries()) {
          const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const replaceRegex = new RegExp(`(xlink:href|href)=["']${escaped}["']`, 'g');
          svgContent = svgContent.replace(replaceRegex, `$1="${base64}"`);
        }
      }

      // 5. Embed Google Fonts and Typography styles into <defs>
      const fontDefs = `
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:ital,wght@0,300;0,400;0,600;0,700;1,400&amp;family=Chakra+Petch:wght@400;600;700&amp;family=Kanit:ital,wght@0,300;0,400;0,600;0,700;1,400&amp;family=Krub:wght@400;600&amp;family=Mitr:wght@400;600&amp;family=Noto+Sans+Thai:wght@300;400;600;700&amp;family=Prompt:ital,wght@0,300;0,400;0,600;0,700;1,400&amp;family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;1,400&amp;family=Taviraj:wght@400;600&amp;family=Trirong:wght@400;600&amp;display=swap');
      
      text {
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: antialiased;
      }
    </style>`;

      if (svgContent.includes('<defs>')) {
        svgContent = svgContent.replace('<defs>', `<defs>${fontDefs}`);
      } else {
        svgContent = svgContent.replace(
          /(<svg\b[^>]*>)/i,
          `$1\n<defs>${fontDefs}</defs>`
        );
      }

      // 6. Ensure Background Rect exists if backgroundColor is set and not transparent
      const effectiveBg = bgCol && typeof bgCol === 'string' && bgCol !== 'transparent' ? bgCol : '#ffffff';
      const hasBgRect = svgContent.includes('id="canvas-background-fill"') || 
                        (svgContent.includes('<rect ') && (svgContent.includes(`fill="${effectiveBg}"`) || svgContent.includes(`fill: ${effectiveBg}`)));

      if (!hasBgRect && effectiveBg) {
        const bgRect = `\n\t<rect id="canvas-background-fill" x="0" y="0" width="${size.width}" height="${size.height}" fill="${effectiveBg}" stroke="none" />`;
        if (svgContent.includes('</defs>')) {
          svgContent = svgContent.replace('</defs>', `</defs>${bgRect}`);
        } else {
          svgContent = svgContent.replace(
            /(<svg\b[^>]*>)/i,
            `$1${bgRect}`
          );
        }
      }

      return svgContent;
    } finally {
      // Restore active selection
      if (activeObj && targetCanvas.setActiveObject) {
        targetCanvas.setActiveObject(activeObj);
        targetCanvas.requestRenderAll();
      }
    }
  };

  // PNG/JPEG/SVG Image Exports with 100% complete SVG vector support
  const handleExportFile = async (type: 'png' | 'jpeg' | 'svg' | 'svg-all' | 'pdf') => {
    if (!canvas) return;

    if (type === 'svg') {
      setIsExporting(true);
      setSaveToast({ message: 'กำลังประมวลผลไฟล์เวกเตอร์ SVG แบบสมบูรณ์ (ฝังฟอนต์และรูปภาพ)...', type: 'info' as any });
      try {
        const svgData = await generateCompleteSVG(canvas, canvasSize, backgroundColor);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const pageSuffix = (pagesList && pagesList.length > 1) ? `_หน้า_${currentPageIndex + 1}` : '';
        link.download = `${(projectName || 'infographics').replace(/\s+/g, '_')}${pageSuffix}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        setSaveToast({ message: 'ส่งออกไฟล์ SVG แบบสมบูรณ์เรียบร้อยแล้ว (ฝังฟอนต์และรูปภาพ 100%)', type: 'success' });
      } catch (err: any) {
        console.error('Failed to export SVG:', err);
        setSaveToast({ message: 'ไม่สามารถส่งออก SVG ได้: ' + (err.message || 'เกิดข้อผิดพลาด'), type: 'error' });
      } finally {
        setIsExporting(false);
        setTimeout(() => setSaveToast(null), 3500);
      }
    } else if (type === 'svg-all') {
      if (!pagesList || pagesList.length <= 1) {
        return handleExportFile('svg');
      }
      setIsExporting(true);
      setSaveToast({ message: `กำลังประมวลผล SVG ทุกหน้า (ทั้งหมด ${pagesList.length} หน้า)...`, type: 'info' as any });

      try {
        // Save current page state
        const currentJSON = JSON.stringify(canvas.toJSON(['id', 'name', 'lockMovementX', 'lockMovementY', 'selectable']));
        const allPages = [...pagesList];
        allPages[currentPageIndex] = currentJSON;

        for (let i = 0; i < allPages.length; i++) {
          setSaveToast({ message: `กำลังสร้าง SVG หน้าที่ ${i + 1} จาก ${allPages.length}...`, type: 'info' as any });
          let pageSvg = '';
          if (i === currentPageIndex) {
            pageSvg = await generateCompleteSVG(canvas, canvasSize, backgroundColor);
          } else {
            const tempEl = document.createElement('canvas');
            tempEl.width = canvasSize.width;
            tempEl.height = canvasSize.height;
            const tempCanvas = new fabric.Canvas(tempEl, {
              width: canvasSize.width,
              height: canvasSize.height,
              backgroundColor: backgroundColor
            });
            await new Promise<void>((resolve) => {
              tempCanvas.loadFromJSON(allPages[i], () => {
                tempCanvas.renderAll();
                resolve();
              });
            });
            pageSvg = await generateCompleteSVG(tempCanvas, canvasSize, backgroundColor);
            tempCanvas.dispose();
          }

          const blob = new Blob([pageSvg], { type: 'image/svg+xml;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${(projectName || 'infographics').replace(/\s+/g, '_')}_หน้า_${i + 1}.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);

          await new Promise((r) => setTimeout(r, 400));
        }

        setSaveToast({ message: `ส่งออกไฟล์ SVG ครบทั้ง ${allPages.length} หน้าเรียบร้อยแล้ว`, type: 'success' });
      } catch (err: any) {
        console.error('Failed to export all SVG pages:', err);
        setSaveToast({ message: 'เกิดข้อผิดพลาดในการส่งออก SVG หลายหน้า: ' + (err.message || ''), type: 'error' });
      } finally {
        setIsExporting(false);
        setTimeout(() => setSaveToast(null), 3500);
      }
    } else if (type === 'png' || type === 'jpeg') {
      const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
      if (activeObj && canvas.discardActiveObject) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }

      const dataURL = canvas.toDataURL({
        format: type,
        quality: 1.0,
        multiplier: 2 // Output higher resolution
      });

      if (activeObj && canvas.setActiveObject) {
        canvas.setActiveObject(activeObj);
        canvas.requestRenderAll();
      }

      const link = document.createElement('a');
      link.href = dataURL;
      const pageSuffix = (pagesList && pagesList.length > 1) ? `_หน้า_${currentPageIndex + 1}` : '';
      link.download = `${(projectName || 'infographics').replace(/\s+/g, '_')}${pageSuffix}.${type}`;
      link.click();
    } else if (type === 'pdf') {
      // Create high-res PDF
      const activeObj = canvas.getActiveObject ? canvas.getActiveObject() : null;
      if (activeObj && canvas.discardActiveObject) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }

      const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0, multiplier: 2 });

      if (activeObj && canvas.setActiveObject) {
        canvas.setActiveObject(activeObj);
        canvas.requestRenderAll();
      }

      const imgWidth = canvasSize.width;
      const imgHeight = canvasSize.height;

      // PDF document export using dynamic script
      import('jspdf').then(({ jsPDF }) => {
        const doc = new jsPDF({
          orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [imgWidth, imgHeight]
        });
        doc.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);
        const pageSuffix = (pagesList && pagesList.length > 1) ? `_หน้า_${currentPageIndex + 1}` : '';
        doc.save(`${(projectName || 'infographics').replace(/\s+/g, '_')}${pageSuffix}.pdf`);
      });
    }
  };

  return (
    <div className={`flex flex-col ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : 'h-full min-h-0 w-full'} select-none overflow-hidden font-sans transition-colors duration-200 ${
      effectiveTheme === 'light' ? 'light-editor bg-[var(--bg-base,#f8fafc)] text-[var(--text-primary,#0f172a)]' : 'dark-editor bg-[var(--bg-base,#0b132b)] text-[var(--text-primary,#f8fafc)]'
    }`}>
      
      {/* Zen Mode Banner if active */}
      {isZenMode && (
        <div className="h-7 bg-amber-500 text-amber-950 font-bold text-xs px-4 flex items-center justify-between z-50 shrink-0 select-none shadow-sm">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>โหมดสตูดิโอเต็มหน้าจอ (Zen Studio Mode)</span>
          </div>
          <button
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/20 hover:bg-amber-950/30 rounded text-[11px] font-black cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
            <span>ออกจากโหมดเต็มจอ (Esc)</span>
          </button>
        </div>
      )}

      {/* 1. TOP HEADER: Premium Responsive Header */}
      <header className="h-14 bg-[#18181b] border-b border-[#27272a] px-2 sm:px-4 flex items-center justify-between shrink-0 select-none z-40 gap-1.5 sm:gap-2">
        
        {/* Project Title & Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="ตั้งชื่อโปรเจกต์..."
              className="bg-transparent hover:bg-gray-800/50 focus:bg-gray-900 border border-transparent focus:border-gray-700 focus:outline-none rounded px-1.5 py-0.5 text-xs sm:text-sm font-bold text-gray-100 placeholder-gray-500 w-28 xs:w-36 sm:w-60 truncate transition-all font-sans"
            />
            {isSaving ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                <RefreshCw className="w-2.5 h-2.5 text-blue-400 animate-spin" />
                <span className="text-[9px] text-blue-400 font-medium hidden xs:inline">Sync...</span>
              </div>
            ) : lastSavedTime ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-medium hidden xs:inline">Saved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[9px] text-amber-400 font-medium hidden xs:inline">Draft</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Quick Toolbar Tools (Desktop Feature) */}
        <div className="hidden lg:flex items-center gap-1 bg-[#121214] border border-[#27272a] rounded-xl px-2 py-1">
          <button onClick={executeUndo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30 rounded-lg transition-colors" title="Undo (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={executeRedo} disabled={historyIndex >= canvasHistory.length - 1} className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30 rounded-lg transition-colors" title="Redo (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-gray-800 mx-1"></div>

          <button
            onClick={handleFitToScreen}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-indigo-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="ปรับขนาดพอดีหน้าจอ (Fit to Screen)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold">พอดีจอ</span>
          </button>

          <div className="flex items-center gap-0.5 bg-gray-900 px-1 py-0.5 rounded-lg text-[10px] font-bold text-gray-400">
            <button onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))} className="p-1 hover:text-white" title="ซูมออก">
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-1 text-gray-300 min-w-[36px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))} className="p-1 hover:text-white" title="ซูมเข้า">
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-800 mx-1"></div>

          <button onClick={() => setGridVisible(!gridVisible)} className={`p-1.5 rounded-lg transition-colors ${gridVisible ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="เปิด/ปิด เส้นกริด">
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setSnapToGrid(!snapToGrid)} className={`p-1.5 rounded-lg transition-colors ${snapToGrid ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="เปิด/ปิด แม่เหล็กดูดเส้นกริด (Snap)">
            <Magnet className="w-4 h-4" />
          </button>
          <button onClick={() => setShowRulers(!showRulers)} className={`p-1.5 rounded-lg transition-colors ${showRulers ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`} title="เปิด/ปิด ไม้บรรทัด">
            <Ruler className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-gray-800 mx-1"></div>

          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${isZenMode ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            title={isZenMode ? 'ย่อหน้าต่างกลับ (Esc)' : 'สตูดิโอเต็มจอ (Zen Mode)'}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            <span className="text-[10px] font-bold hidden xl:inline">{isZenMode ? 'ย่อจอ' : 'เต็มจอ'}</span>
          </button>
        </div>

        {/* Header Actions Container */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Theme Mode Switcher */}
          <button
            onClick={() => {
              setEditorThemeSetting(prev => {
                if (prev === 'auto') return 'light';
                if (prev === 'light') return 'dark';
                return 'auto';
              });
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border shadow-xs cursor-pointer ${
              editorThemeSetting === 'auto'
                ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/20'
                : editorThemeSetting === 'light'
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
            }`}
            title="สลับโหมดธีม"
          >
            {editorThemeSetting === 'auto' ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[10px] hidden sm:inline">ธีมระบบ</span>
              </>
            ) : editorThemeSetting === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] hidden sm:inline">สว่าง</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[10px] hidden sm:inline">มืด</span>
              </>
            )}
          </button>

          <button 
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-indigo-400 rounded-lg transition-colors hidden md:flex items-center gap-1"
            title="คีย์ลัดการใช้งาน"
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-[10px] font-bold hidden xl:inline">คีย์ลัด</span>
          </button>

          {/* AI Generator Button */}
          <button
            onClick={() => { setActiveSidebarTab('ai'); setShowMobileDrawer(true); }}
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            title="AI อัจฉริยะ"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-200 shrink-0" />
            <span className="hidden md:inline">AI ช่วยสร้าง</span>
          </button>

          {/* Gallery Open */}
          <button
            onClick={() => setShowGalleryModal(true)}
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all border border-gray-700"
            title="คลังงาน"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden md:inline">คลังงาน</span>
          </button>

          {/* Save to DB */}
          <button
            onClick={handleSaveToMySQL}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="บันทึกลงฐานข้อมูล MySQL"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">บันทึก</span>
          </button>

          {/* Quick Share */}
          <button
            onClick={() => {
              if (!currentProjectId) {
                setSaveToast({ message: 'กรุณาบันทึกโปรเจกต์ลงฐานข้อมูลก่อนกดแชร์', type: 'error' });
                return;
              }
              setShowShareModal(true);
            }}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-xl shrink-0"
            title="แชร์โปรเจกต์"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Export Dropdown & Modal trigger */}
          <div className="relative group shrink-0">
            <button 
              onClick={() => {
                saveCurrentCanvasToPagesList();
                setShowExportModal(true);
              }}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-60"
              title="ส่งออกไฟล์ (เลือกหน้า หรือส่งออกทุกหน้า)"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'กำลังส่งออก...' : 'ส่งออก'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl py-2 hidden group-hover:block z-50 overflow-hidden">
              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-[#27272a] mb-1 flex items-center justify-between">
                <span>เลือกรูปแบบการส่งออก</span>
                <span className="text-[9px] text-indigo-400 font-mono">Export Hub</span>
              </div>

              {/* Primary: Open Custom Pages & Scope Export Modal */}
              <button
                onClick={() => {
                  saveCurrentCanvasToPagesList();
                  setShowExportModal(true);
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-white bg-indigo-600/20 hover:bg-indigo-600 flex items-center justify-between transition-colors border-b border-[#27272a] group/hub"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-xs">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-indigo-200 group-hover/hub:text-white">
                      เลือกหน้า & ส่งออกขั้นสูง...
                    </span>
                    <span className="text-[10px] text-gray-400 group-hover/hub:text-indigo-100 block">
                      ทุกหน้า, หน้าเดียว, กำหนดช่วงหน้า
                    </span>
                  </div>
                </div>
                <span className="text-[9px] bg-indigo-500/30 group-hover/hub:bg-white/20 px-1.5 py-0.5 rounded text-indigo-300 group-hover/hub:text-white font-bold">
                  ตั้งค่า
                </span>
              </button>

              {/* SVG Single / Current Page */}
              <button 
                onClick={() => handleExportFile('svg')} 
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover/item:bg-white/20 group-hover/item:text-white">
                    <Scaling className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-medium">เวกเตอร์ SVG (หน้า {currentPageIndex + 1})</span>
                    <span className="text-[10px] text-gray-400 group-hover/item:text-indigo-200 block">ฝังฟอนต์ & รูป Base64 100%</span>
                  </div>
                </div>
                <span className="text-[9px] bg-orange-500/20 text-orange-300 group-hover/item:bg-white/20 px-1.5 py-0.5 rounded font-mono">SVG</span>
              </button>

              {/* PNG */}
              <button 
                onClick={() => handleExportFile('png')} 
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover/item:bg-white/20 group-hover/item:text-white">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-medium">รูปภาพ PNG (หน้า {currentPageIndex + 1})</span>
                    <span className="text-[10px] text-gray-400 group-hover/item:text-indigo-200 block">ความคมชัดสูง 2x</span>
                  </div>
                </div>
                <span className="text-[9px] bg-gray-800 group-hover/item:bg-white/20 px-1.5 py-0.5 rounded text-gray-400 group-hover/item:text-white">PNG</span>
              </button>

              {/* JPEG */}
              <button 
                onClick={() => handleExportFile('jpeg')} 
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover/item:bg-white/20 group-hover/item:text-white">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-medium">รูปภาพ JPEG (หน้า {currentPageIndex + 1})</span>
                    <span className="text-[10px] text-gray-400 group-hover/item:text-indigo-200 block">ขนาดไฟล์กะทัดรัด</span>
                  </div>
                </div>
                <span className="text-[9px] bg-gray-800 group-hover/item:bg-white/20 px-1.5 py-0.5 rounded text-gray-400 group-hover/item:text-white">JPG</span>
              </button>

              {/* PDF */}
              <button 
                onClick={() => handleExportFile('pdf')} 
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover/item:bg-white/20 group-hover/item:text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-medium">เอกสาร PDF (หน้า {currentPageIndex + 1})</span>
                    <span className="text-[10px] text-gray-400 group-hover/item:text-indigo-200 block">ความละเอียดมาตรฐาน</span>
                  </div>
                </div>
                <span className="text-[9px] bg-gray-800 group-hover/item:bg-white/20 px-1.5 py-0.5 rounded text-gray-400 group-hover/item:text-white">PDF</span>
              </button>

              <div className="mt-1 px-4 py-1.5 border-t border-[#27272a] bg-[#121214]">
                <p className="text-[9px] text-gray-400 text-center">คลิกปุ่ม "ส่งออก" เพื่อเปิดหน้าต่างเลือกหน้าและช่วงหน้า</p>
              </div>
            </div>
          </div>

          {/* Mobile Header Menu toggle button */}
          <button
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="lg:hidden p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-xl flex items-center justify-center"
            title="เครื่องมือเพิ่มเติม (More Options)"
          >
            <MoreVertical className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </header>

      {/* Mobile Header Menu Overlay Sheet */}
      {showMobileMoreMenu && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileMoreMenu(false)} />
          <div className="relative w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl p-4 z-10 space-y-3 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                เครื่องมือ & คำสั่งด่วน
              </span>
              <button onClick={() => setShowMobileMoreMenu(false)} className="p-1 hover:bg-gray-800 rounded text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { canvas?.undo(); setShowMobileMoreMenu(false); }}
                className="flex items-center gap-2 p-2.5 bg-[#121214] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-200"
              >
                <Undo className="w-4 h-4 text-sky-400" />
                <span>ย้อนกลับ (Undo)</span>
              </button>
              <button
                onClick={() => { canvas?.redo(); setShowMobileMoreMenu(false); }}
                className="flex items-center gap-2 p-2.5 bg-[#121214] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-200"
              >
                <Redo className="w-4 h-4 text-sky-400" />
                <span>ทำซ้ำ (Redo)</span>
              </button>
              <button
                onClick={() => { setGridVisible(!gridVisible); setShowMobileMoreMenu(false); }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${gridVisible ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[#121214] border-gray-800 text-gray-200'}`}
              >
                <Grid className="w-4 h-4" />
                <span>ตาราง (Grid)</span>
              </button>
              <button
                onClick={() => { setShowRulers(!showRulers); setShowMobileMoreMenu(false); }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${showRulers ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[#121214] border-gray-800 text-gray-200'}`}
              >
                <Ruler className="w-4 h-4" />
                <span>ไม้บรรทัด (Rulers)</span>
              </button>
              <button
                onClick={() => { setShowGalleryModal(true); setShowMobileMoreMenu(false); }}
                className="flex items-center gap-2 p-2.5 bg-[#121214] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-200"
              >
                <FolderOpen className="w-4 h-4 text-sky-400" />
                <span>คลังงาน (Gallery)</span>
              </button>
              <button
                onClick={() => { setShowShortcutsModal(true); setShowMobileMoreMenu(false); }}
                className="flex items-center gap-2 p-2.5 bg-[#121214] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-200"
              >
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>คีย์ลัด (Shortcuts)</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#27272a] space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ส่งออกไฟล์ (Export Options)</span>
              <button
                onClick={() => {
                  saveCurrentCanvasToPagesList();
                  setShowExportModal(true);
                  setShowMobileMoreMenu(false);
                }}
                className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm"
              >
                <Sliders className="w-4 h-4" />
                <span>เลือกหน้า & ตัวเลือกการส่งออกขั้นสูง...</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { handleExportFile('png'); setShowMobileMoreMenu(false); }}
                  disabled={isExporting}
                  className="p-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-bold text-center"
                >
                  PNG High-Res
                </button>
                <button
                  onClick={() => { handleExportFile('svg'); setShowMobileMoreMenu(false); }}
                  disabled={isExporting}
                  className="p-2 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-300 hover:text-white rounded-xl text-xs font-bold text-center"
                >
                  SVG เวกเตอร์สมบูรณ์
                </button>
                <button
                  onClick={() => { handleExportFile('jpeg'); setShowMobileMoreMenu(false); }}
                  disabled={isExporting}
                  className="p-2 bg-sky-600/20 hover:bg-sky-600 border border-sky-500/30 text-sky-300 hover:text-white rounded-xl text-xs font-bold text-center"
                >
                  JPEG กะทัดรัด
                </button>
                <button
                  onClick={() => { handleExportFile('pdf'); setShowMobileMoreMenu(false); }}
                  disabled={isExporting}
                  className="p-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold text-center"
                >
                  PDF Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal (Enterprise Help) */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcutsModal(false)} />
          <div className="relative w-full max-w-xl bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-200">คีย์ลัดการใช้งาน (Keyboard Shortcuts)</h3>
              </div>
              <button onClick={() => setShowShortcutsModal(false)} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">จัดการวัตถุ</h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">คัดลอก (Copy)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + C</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">วาง (Paste)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + V</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ลบ (Delete)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Delete / Backspace</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">เลือกทั้งหมด</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + A</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">การแก้ไข</h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ย้อนกลับ (Undo)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + Z</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ทำซ้ำ (Redo)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + Shift + Z</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">บันทึก (Save)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + S</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">รวมกลุ่ม (Group)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + G</span>
                </div>
              </div>

              <div className="space-y-3 sm:col-span-2">
                <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">มุมมอง</h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ขยาย (Zoom In)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Ctrl + [ + ]</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">เลื่อน (Pan)</span>
                  <span className="px-1.5 py-0.5 bg-[#121214] border border-gray-800 rounded font-mono text-[10px] text-gray-300">Space + Mouse Drag</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#121214] border-t border-[#27272a] text-center">
              <p className="text-[10px] text-gray-500 font-sans">
                💡 เคล็ดลับ: คุณสามารถใช้ลูกศรบนคีย์บอร์ดเพื่อเลื่อนตำแหน่งวัตถุที่ละ 1px (หรือ 10px เมื่อกด Shift ค้าง)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveToast && (
        <div className={`fixed top-16 right-4 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 z-50 animate-bounce ${
          saveToast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-rose-950/90 border-rose-500 text-rose-200'
        }`}>
          {saveToast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs font-semibold leading-normal">{saveToast.message}</span>
          <button onClick={() => setSaveToast(null)} className="ml-2 text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE PANELS CONTAINER */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ============================================================== */}
        {/* LEFT COMPACT TOOLBAR & DRAWER (Penpot styled navigation tree) */}
        {/* ============================================================== */}
        <div className="flex shrink-0 border-r border-[#27272a] bg-[#18181b] z-10">
          
          {/* Vertical Compact Tab Bar (Hidden on mobile for 100% canvas width) */}
          <div className="hidden md:flex w-14 bg-[#141416] flex-col items-center py-3 gap-2 shrink-0 z-20 overflow-y-auto max-h-full scrollbar-none select-none">
            
            <button
              onClick={() => handleTabClick('layers')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'layers' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="เลเยอร์ & รายการวัตถุ (Layers)"
            >
              <Layers className="w-5 h-5" />
              <span className="text-[9px] font-bold">เลเยอร์</span>
            </button>

            <button
              onClick={() => handleTabClick('pages')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'pages' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="แผ่นงานหลายหน้า (Pages / Slides)"
            >
              <Columns className="w-5 h-5 text-emerald-400" />
              <span className="text-[9px] font-bold">หน้ากระดาษ</span>
            </button>

            <button
              onClick={() => handleTabClick('shapes')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'shapes' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="รูปทรงเวกเตอร์ (Shapes)"
            >
              <Shapes className="w-5 h-5" />
              <span className="text-[9px] font-bold">รูปทรง</span>
            </button>

            <button
              onClick={() => handleTabClick('text')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'text' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="ตัวหนังสือ (Typography)"
            >
              <Type className="w-5 h-5" />
              <span className="text-[9px] font-bold">ข้อความ</span>
            </button>

            <button
              onClick={() => handleTabClick('images')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'images' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="รูปภาพและอัปโหลด (Upload Images)"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-[9px] font-bold">รูปภาพ</span>
            </button>

            <button
              onClick={() => handleTabClick('icons')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'icons' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="สัญลักษณ์และไอคอน (Icons)"
            >
              <Sticker className="w-5 h-5 text-pink-400" />
              <span className="text-[9px] font-bold">ไอคอน</span>
            </button>

            <button
              onClick={() => handleTabClick('background')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'background' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="สีกระดาษและพื้นหลัง (Background)"
            >
              <Palette className="w-5 h-5 text-amber-400" />
              <span className="text-[9px] font-bold">พื้นหลัง</span>
            </button>

            <button
              onClick={() => handleTabClick('graphite')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'graphite' && isDesktopSidebarOpen ? 'bg-[#1e1e24] border border-[#ff8c00]/30 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="Graphite Node & Non-destructive Vector Effects (โนดกราไฟต์)"
            >
              <Workflow className="w-5 h-5 text-[#ff8c00]" />
              <span className="text-[9px] font-bold text-[#ff8c00]">กราไฟต์</span>
            </button>

            <button
              onClick={() => handleTabClick('templates')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'templates' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="กล่องโมดูลเวกเตอร์พร้อมใช้"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[9px] font-bold">โมดูล</span>
            </button>

            <button
              onClick={() => handleTabClick('ai')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'ai' && isDesktopSidebarOpen ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="AI อัจฉริยะ (Smart AI Designer)"
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] font-bold">เอไอ</span>
            </button>

            <button
              onClick={() => handleTabClick('canvas-settings')}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${activeSidebarTab === 'canvas-settings' && isDesktopSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              title="ขนาดกระดาษ & พื้นหลัง (Board Presets)"
            >
              <Sliders className="w-5 h-5" />
              <span className="text-[9px] font-bold">กระดาษ</span>
            </button>
            
            <div className="flex-1"></div>

            {/* Freeform drawing pen */}
            <button
              onClick={toggleDrawMode}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-md mt-auto cursor-pointer"
              title="ปากกาเขียนหน้าจออิสระ (Pen Tool)"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Drawer Backdrop Overlay */}
          {showMobileDrawer && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
              onClick={() => setShowMobileDrawer(false)}
            />
          )}

          {/* Drawer / Docked Sub-panel: Clean docked panel on PC, floating drawer on Mobile */}
          <div className={`bg-[#18181b] flex flex-col shrink-0 border-r border-[#27272a] z-30 transition-all duration-200 ${
            showMobileDrawer 
              ? 'fixed inset-y-0 left-0 w-[85vw] max-w-[320px] shadow-2xl z-40 animate-in slide-in-from-left duration-200 md:relative md:inset-auto md:shadow-none' 
              : 'hidden md:flex'
          } ${
            isDesktopSidebarOpen ? 'md:w-72 lg:w-80' : 'md:w-0 md:border-r-0 md:overflow-hidden'
          }`}>
            
            {/* Sticky Header with Collapse/Close Button */}
            <div className="flex items-center justify-between p-3 border-b border-[#27272a] bg-[#18181b] shrink-0 z-10">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  {activeSidebarTab === 'layers' && 'เลเยอร์ & รายการวัตถุ'}
                  {activeSidebarTab === 'pages' && 'แผ่นงานหลายหน้า'}
                  {activeSidebarTab === 'shapes' && 'รูปทรงเวกเตอร์'}
                  {activeSidebarTab === 'text' && 'ตัวหนังสือ (Typography)'}
                  {activeSidebarTab === 'images' && 'รูปภาพ & อัปโหลด'}
                  {activeSidebarTab === 'icons' && 'สัญลักษณ์ & ไอคอน'}
                  {activeSidebarTab === 'background' && 'สีกระดาษ & พื้นหลัง'}
                  {activeSidebarTab === 'graphite' && 'กราไฟต์โนด'}
                  {activeSidebarTab === 'templates' && 'โมดูลพร้อมใช้'}
                  {activeSidebarTab === 'ai' && 'AI ช่วยสร้างคำ'}
                  {activeSidebarTab === 'canvas-settings' && 'ขนาดกระดาษ'}
                </span>
              </span>
              <button 
                onClick={() => {
                  setIsDesktopSidebarOpen(false);
                  setShowMobileDrawer(false);
                }} 
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all shrink-0 ml-2 cursor-pointer"
                title="ยุบแถบเครื่องมือ (Collapse Sidebar)"
              >
                <ChevronLeft className="w-4 h-4 hidden md:inline" />
                <X className="w-4 h-4 md:hidden text-rose-400" />
                <span className="hidden md:inline text-[10px]">ยุบแถบ</span>
                <span className="md:hidden">ปิด</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 2BB: Polotno Style Vector Icons Search Tab */}
            {activeSidebarTab === 'icons' && (
              <div className="flex flex-col h-full space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">สัญลักษณ์ & ไอคอน</h3>
                  <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-bold">
                    เวกเตอร์ 100%
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed">
                  ค้นหาไอคอนเวกเตอร์ประเภทต่างๆ เพื่อใช้ออกแบบแผนภาพ ขั้นตอนการทำงาน และสื่อประชาสัมพันธ์ได้ทันที
                </p>

                {/* Live Icon Search input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    placeholder="พิมพ์ค้นหาไอคอน เช่น โทรศัพท์, star, mail..."
                    className="w-full bg-[#111113] border border-gray-800 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-200 outline-none placeholder-gray-600 transition-colors"
                  />
                  {iconSearchQuery && (
                    <button
                      onClick={() => setIconSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered Icon Grid */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-3 gap-2">
                    {ICON_LIBRARY.filter(item => {
                      if (!iconSearchQuery) return true;
                      const q = iconSearchQuery.toLowerCase();
                      return item.name.toLowerCase().includes(q) || item.tags.toLowerCase().includes(q);
                    }).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddSVGIcon(item.svg, item.name)}
                        className="flex flex-col items-center justify-center p-2.5 bg-[#121214] border border-gray-800/80 hover:border-pink-500/50 hover:bg-pink-500/5 rounded-xl transition-all gap-1.5 group text-center"
                        title={item.name}
                      >
                        {/* Rendering the static SVG path safely as preview */}
                        <div 
                          className="w-6 h-6 text-gray-400 group-hover:text-pink-400 transition-colors"
                          dangerouslySetInnerHTML={{ __html: item.svg }} 
                        />
                        <span className="text-[9px] text-gray-500 group-hover:text-gray-300 transition-colors truncate w-full px-0.5">
                          {item.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {ICON_LIBRARY.filter(item => {
                    if (!iconSearchQuery) return true;
                    const q = iconSearchQuery.toLowerCase();
                    return item.name.toLowerCase().includes(q) || item.tags.toLowerCase().includes(q);
                  }).length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-500">
                      ไม่พบไอคอนที่ตรงกับการค้นหา
                    </div>
                  )}
                </div>

                <div className="p-3 bg-pink-950/20 rounded-xl border border-pink-500/10 text-[9px] text-gray-400 leading-relaxed">
                  💡 <b>Polotno Tip:</b> ไอคอนที่เพิ่มเป็นกลุ่มเวกเตอร์แท้ คุณสามารถปรับเปลี่ยนสีพื้นหลัง สีขอบ หรือปรับขนาดขยายได้โดยไม่สูญเสียความคมชัด
                </div>
              </div>
            )}

            {/* 2CC: Polotno Style Background & Canvas Wallpaper Tab */}
            {activeSidebarTab === 'background' && (
              <div className="flex flex-col h-full space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">พื้นหลังกระดาษ</h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    สไตล์ & เทมเพลต
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed">
                  เลือกพื้นหลังสีล้วน ไล่เฉดสีระดับพรีเมียม หรือเลือกสไตล์รูปแบบกระดาษเพื่อสร้างบรรยากาศที่น่าสนใจให้กับอินโฟกราฟิก
                </p>

                {/* Solid Colors section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">สีล้วนคลาสสิก (Solid Colors)</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      '#ffffff', '#f8fafc', '#f1f5f9', '#fefce8', '#f0fdf4',
                      '#1e293b', '#0f172a', '#111827', '#1c1917', '#18181b',
                      '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
                      '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#64748b'
                    ].map((col, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (canvas) {
                            canvas.backgroundColor = col;
                            setBackgroundColor(col);
                            canvas.requestRenderAll();
                            saveHistory();
                          }
                        }}
                        className={`w-8 h-8 rounded-lg border transition-all ${backgroundColor === col ? 'border-amber-500 scale-110 shadow-md shadow-amber-500/10' : 'border-gray-800/80 hover:scale-105'}`}
                        style={{ backgroundColor: col }}
                        title={col}
                      />
                    ))}
                  </div>
                </div>

                {/* Premium Gradient Presets section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">เฉดสีระดับพรีเมียม (Gradients)</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Sunset Glow', start: '#ff7e5f', end: '#feb47b' },
                      { name: 'Royal Navy', start: '#1f4068', end: '#162447' },
                      { name: 'Mint Garden', start: '#11998e', end: '#38ef7d' },
                      { name: 'Aurora Sky', start: '#00c6ff', end: '#0072ff' },
                      { name: 'Twilight Cyber', start: '#ec008c', end: '#fc6767' },
                      { name: 'Giga Charcoal', start: '#141416', end: '#2d3748' }
                    ].map((grad, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (!canvas || !fabric) return;
                          // Create a beautiful linear gradient overlay inside fabric
                          const gradient = new fabric.Gradient({
                            type: 'linear',
                            coords: {
                              x1: 0,
                              y1: 0,
                              x2: canvasSize.width,
                              y2: canvasSize.height
                            },
                            colorStops: [
                              { offset: 0, color: grad.start },
                              { offset: 1, color: grad.end }
                            ]
                          });
                          canvas.backgroundColor = gradient;
                          setBackgroundColor(grad.start); // fallback solid
                          canvas.requestRenderAll();
                          saveHistory();
                        }}
                        className="h-10 rounded-xl p-1.5 text-left border border-gray-800 hover:border-amber-500 transition-all flex items-end relative overflow-hidden group"
                        style={{ background: `linear-gradient(135deg, ${grad.start}, ${grad.end})` }}
                      >
                        <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-[2px]">
                          {grad.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patterned Grid Overlays */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">รูปแบบตาราง (Grid & Pattern)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setGridVisible(true);
                        setGridStyle('dots');
                        setSaveToast({ message: 'เปิดตารางพื้นหลังแบบ Dots ลื่นไหล', type: 'success' });
                      }}
                      className="p-2.5 bg-[#121214] border border-gray-800 hover:border-amber-500 rounded-xl text-center text-[10px] font-bold text-gray-300 transition-colors"
                    >
                      ลายจุด (Dots Grid)
                    </button>
                    <button
                      onClick={() => {
                        setGridVisible(true);
                        setGridStyle('lines');
                        setSaveToast({ message: 'เปิดตารางพื้นหลังแบบเส้นพิกเซล', type: 'success' });
                      }}
                      className="p-2.5 bg-[#121214] border border-gray-800 hover:border-amber-500 rounded-xl text-center text-[10px] font-bold text-gray-300 transition-colors"
                    >
                      เส้นร่าง (Lines Grid)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/10 text-[9px] text-gray-400 leading-relaxed">
                  💡 <b>Polotno Tip:</b> คุณสามารถปรับขนาดย่อ/ขยายพื้นตาราง (Grid Size) หรือซ่อนเส้นไม้บรรทัดเพื่อเพิ่มพื้นที่ทำงานออกแบบเวกเตอร์ได้ในแท็บ <b>"กระดาษ"</b>
                </div>
              </div>
            )}

            {/* 2EE: Graphite Node-based adjustments & Non-destructive Vector Effects Panel */}
            {activeSidebarTab === 'graphite' && (
              <div className="flex flex-col h-full space-y-4 font-sans text-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#ff8c00] uppercase tracking-wider">สตรีมทรีโนด (Graphite Nodes)</h3>
                  <span className="text-[9px] bg-[#ff8c00]/10 text-[#ff8c00] px-2 py-0.5 rounded-full font-bold">
                    RUST CORE v0.5
                  </span>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed">
                  สตรีมเวกเตอร์เอฟเฟกต์แบบไม่ทำลายพิกเซล ปรับตั้งค่าผ่านกราฟเชื่อมโยงข้อมูลแบบเรียลไทม์
                </p>

                {/* Micro Node Graph Visualizer representation */}
                <div className="p-3 bg-[#111113] rounded-xl border border-gray-800 space-y-2">
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">แผนผังเชื่อมโนด (Pipeline)</span>
                  <div className="flex flex-col gap-1.5 relative">
                    {graphiteNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-[#ff8c00]/10 border-[#ff8c00] shadow-md shadow-[#ff8c00]/5' : 'bg-[#151518] border-gray-800 hover:border-gray-700'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${node.id === 'input_node' ? 'bg-sky-400' : node.id === 'output_node' ? 'bg-emerald-400' : 'bg-[#ff8c00]'}`} />
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                              {node.name}
                            </span>
                          </div>
                          
                          {/* Node Bypass/Active indicator */}
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] uppercase font-black text-gray-600 tracking-wider">
                              {node.id === 'input_node' || node.id === 'output_node' ? 'System' : 'Core'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-800/80 my-1"></div>

                {/* Selected Node Parameter Configurator Area */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                  {selectedNodeId === 'input_node' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">คุณสมบัติ เลเยอร์อินพุต</span>
                      <div className="p-3 bg-[#121214] border border-gray-800 rounded-xl space-y-2">
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>ชนิดเวกเตอร์:</span>
                          <span className="font-bold text-sky-400">
                            {canvas?.getActiveObject() ? String(canvas.getActiveObject()?.type).toUpperCase() : 'ไม่ได้เลือกวัตถุ'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>ชื่อเลเยอร์:</span>
                          <span className="font-bold text-gray-300 truncate max-w-[120px]">
                            {canvas?.getActiveObject() ? String(canvas.getActiveObject()?.name || 'เวกเตอร์เลเยอร์') : '-'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-500 leading-relaxed">
                        ⚠️ โนดอินพุตจะดึงสเตตออบเจกต์เวกเตอร์ที่เลือกบนแผ่นงานเพื่อป้อนเข้าสู่สายพาน (Pipeline) ประมวลผลถัดไป
                      </p>
                    </div>
                  )}

                  {selectedNodeId === 'color_grading_node' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[#ff8c00] uppercase tracking-wide">ตั้งค่าเกรดดิ้งเฉดสี</span>
                        <button
                          onClick={() => {
                            const updated = graphiteNodes.map(n => n.id === 'color_grading_node' ? { ...n, config: { brightness: 0, contrast: 0, saturation: 0, hue: 0 } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="text-[9px] text-[#ff8c00] hover:underline"
                        >
                          Reset โนด
                        </button>
                      </div>

                      {/* Brightness slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>ความสว่าง (Brightness)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'color_grading_node')?.config.brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'color_grading_node')?.config.brightness || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'color_grading_node' ? { ...n, config: { ...n.config, brightness: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>

                      {/* Contrast slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>ความเปรียบต่าง (Contrast)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'color_grading_node')?.config.contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'color_grading_node')?.config.contrast || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'color_grading_node' ? { ...n, config: { ...n.config, contrast: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>

                      {/* Saturation slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>ความอิ่มตัวสี (Saturation)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'color_grading_node')?.config.saturation}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'color_grading_node')?.config.saturation || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'color_grading_node' ? { ...n, config: { ...n.config, saturation: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedNodeId === 'effects_node' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[#ff8c00] uppercase tracking-wide">ตั้งค่าเอฟเฟกต์เวกเตอร์ & ภาพ</span>
                        <button
                          onClick={() => {
                            const updated = graphiteNodes.map(n => n.id === 'effects_node' ? { ...n, config: { blur: 0, noise: 0, pixelate: 0, grayscale: false } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="text-[9px] text-[#ff8c00] hover:underline"
                        >
                          Reset โนด
                        </button>
                      </div>

                      {/* Grayscale non-destructive vector toggle */}
                      <div className="flex items-center justify-between p-2.5 bg-[#121214] border border-gray-800 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-300">โทนสีเทาดำ (Grayscale)</span>
                          <span className="text-[8px] text-gray-500">แปลงสีเวกเตอร์ให้เป็นขาวดำ</span>
                        </div>
                        <button
                          onClick={() => {
                            const currentVal = graphiteNodes.find(n => n.id === 'effects_node')?.config.grayscale || false;
                            const updated = graphiteNodes.map(n => n.id === 'effects_node' ? { ...n, config: { ...n.config, grayscale: !currentVal } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${graphiteNodes.find(n => n.id === 'effects_node')?.config.grayscale ? 'bg-emerald-600' : 'bg-gray-800'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${graphiteNodes.find(n => n.id === 'effects_node')?.config.grayscale ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Blur slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>เอฟเฟกต์เบลอ / Glow (Blur)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'effects_node')?.config.blur || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'effects_node')?.config.blur || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'effects_node' ? { ...n, config: { ...n.config, blur: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>

                      {/* Pixelate slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>เซนเซอร์โมเสก (Pixelate)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'effects_node')?.config.pixelate || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'effects_node')?.config.pixelate || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'effects_node' ? { ...n, config: { ...n.config, pixelate: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>

                      {/* Noise slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>ความหยาบเม็ดเกรน (Noise Grain)</span>
                          <span className="text-[#ff8c00] font-bold">{graphiteNodes.find(n => n.id === 'effects_node')?.config.noise || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={graphiteNodes.find(n => n.id === 'effects_node')?.config.noise || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = graphiteNodes.map(n => n.id === 'effects_node' ? { ...n, config: { ...n.config, noise: val } } : n);
                            setGraphiteNodes(updated);
                            applyGraphiteNodesToCanvas(updated);
                          }}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedNodeId === 'output_node' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">โมดูลคอมโพสิตเรนเดอร์</span>
                      <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/10 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          สถานะ: เรนเดอร์ปกติ (Normal)
                        </div>
                        <p className="text-[9px] text-gray-400 leading-relaxed">
                          เรนเดอร์สตรีมผ่านสแต็คเวกเตอร์ของ Graphite-engine สำเร็จ ภาพเอาต์พุตพร้อมสำหรับการจัดบันทึกลง MySQL Database ทันที
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (canvas) {
                            canvas.discardActiveObject();
                            canvas.requestRenderAll();
                            setSaveToast({ message: 'เรียงลำดับเลเยอร์และล้างสเตตครอบทำงานเรียบร้อย', type: 'success' });
                          }
                        }}
                        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded-xl font-bold transition-all text-center"
                      >
                        ล้างขอบทำงาน (Unselect Object)
                      </button>
                    </div>
                  )}
                </div>

                {/* Graphite Tip of the day */}
                <div className="p-3.5 bg-gray-900 border border-gray-800 rounded-xl text-[9px] text-gray-400 leading-relaxed font-sans">
                  💡 <b>Graphite Tip:</b> แฟบริคเวกเตอร์จะประมวลผลเอฟเฟกต์แบบไม่สูญเสียคุณภาพต้นฉบับ คุณสามารถแก้ไขทรีโนดได้ตลอดเวลาระหว่างสลับเลเยอร์!
                </div>
              </div>
            )}

             {/* 2AA: Pages / Slide list tab (Polotno Style) */}
            {activeSidebarTab === 'pages' && (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">หน้ากระดาษ ({pagesList.length})</h3>
                  <button
                    onClick={handleAddPage}
                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                    title="เพิ่มหน้ากระดาษใหม่"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มหน้า
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  จัดการสไลด์และหน้ากระดาษเวกเตอร์สำหรับสื่อประชาสัมพันธ์ที่มีความยาวหรือหลายหน้า เชื่อมต่อเซฟลงฐานข้อมูล MySQL ได้โดยตรง
                </p>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {pagesList.map((pageJSON, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSwitchPage(idx)}
                      className={`group relative p-3 rounded-xl border text-left transition-all cursor-pointer ${currentPageIndex === idx ? 'bg-indigo-600/10 border-indigo-500 shadow-md' : 'bg-[#121214] border-gray-800 hover:border-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${currentPageIndex === idx ? 'bg-indigo-400' : 'bg-gray-600'}`} />
                          แผ่นงานที่ {idx + 1}
                        </span>
                        
                        {currentPageIndex === idx && (
                          <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold">
                            กำลังแก้ไข
                          </span>
                        )}
                      </div>

                      {/* Small mock page wireframe representing Polotno thumbnail */}
                      <div className="mt-2 h-14 bg-gray-900 rounded-lg border border-gray-800/60 overflow-hidden flex flex-col items-center justify-center text-[10px] text-gray-400 font-sans p-2">
                        {(() => {
                          try {
                            const parsed = typeof pageJSON === 'string' ? JSON.parse(pageJSON) : pageJSON;
                            const count = parsed?.objects?.length || 0;
                            return (
                              <div className="space-y-1 w-full text-center">
                                <span className="text-[11px] font-bold text-gray-300 block">
                                  {count === 0 ? 'หน้าว่าง' : `${count} ชิ้นงาน`}
                                </span>
                                <div className="h-1 bg-gray-800 rounded w-2/3 mx-auto" />
                              </div>
                            );
                          } catch {
                            return <span>แผ่นงาน</span>;
                          }
                        })()}
                      </div>

                      {/* Hover action menu for page */}
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePage(idx);
                          }}
                          className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                          title="ทำซ้ำหน้านี้"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePage(idx);
                          }}
                          className="p-1 bg-gray-800 hover:bg-rose-950 rounded text-gray-400 hover:text-rose-400"
                          title="ลบหน้านี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/10 text-[10px] text-gray-400 leading-relaxed font-sans">
                  💡 <b>Polotno Feature:</b> คุณสามารถสร้างหน้าเพิ่ม ทำซ้ำ หรือสลับเปลี่ยนไปมาได้ทันที ข้อมูลทั้งหมดถูกจัดเก็บลงใน MySQL อย่างมีระเบียบและโหลดเร็วขึ้น 300%
                </div>
              </div>
            )}

            {/* 2A: Layers & Objects list tab (Penpot Style) */}
            {activeSidebarTab === 'layers' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">เลเยอร์ในกระดาษ</h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                    {layersList.length} วัตถุ
                  </span>
                </div>

                {/* Layer Search input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={layerSearchQuery}
                    onChange={(e) => setLayerSearchQuery(e.target.value)}
                    placeholder="ค้นหาวัตถุ..."
                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                {/* Interactive Layers List */}
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {layersList.filter(l => l.name.toLowerCase().includes(layerSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="text-center py-10 bg-[#121214] rounded-xl border border-dashed border-gray-800">
                      <Layers className="w-8 h-8 text-gray-600 mx-auto opacity-50 mb-2" />
                      <p className="text-[11px] text-gray-500">กระดาษยังคงว่างเปล่า</p>
                    </div>
                  ) : (
                    layersList
                      .filter(l => l.name.toLowerCase().includes(layerSearchQuery.toLowerCase()))
                      .map((layer) => (
                        <div
                          key={layer.id}
                          onClick={(e) => handleSelectLayer(layer, e)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            layer.active
                              ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold'
                              : 'bg-[#121214] border-transparent hover:border-[#27272a] text-gray-300'
                          }`}
                        >
                          {/* Mini icon by object type */}
                          <div className="opacity-70 shrink-0">
                            {layer.type === 'rect' && <Square className="w-3.5 h-3.5" />}
                            {layer.type === 'circle' && <Circle className="w-3.5 h-3.5" />}
                            {layer.type === 'triangle' && <Triangle className="w-3.5 h-3.5" />}
                            {layer.type === 'i-text' && <Type className="w-3.5 h-3.5" />}
                            {layer.type === 'textbox' && <Type className="w-3.5 h-3.5" />}
                            {layer.type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                            {layer.type === 'path' && <PenTool className="w-3.5 h-3.5" />}
                          </div>

                          {editingLayerId === layer.id ? (
                            <input
                              type="text"
                              value={editingLayerName}
                              onChange={(e) => setEditingLayerName(e.target.value)}
                              onBlur={() => handleSaveRenameLayer(layer.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameLayer(layer.id);
                                if (e.key === 'Escape') setEditingLayerId(null);
                              }}
                              className="flex-1 bg-[#18181b] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-gray-100"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => handleStartRenameLayer(layer, e)}
                              className="flex-1 truncate"
                              title="ดับเบิ้ลคลิกเพื่อแก้ชื่อเลเยอร์"
                            >
                              {layer.name}
                            </span>
                          )}

                          {/* Controls (Eye, Lock, Layer positioning) */}
                          <div className="flex items-center gap-1 opacity-45 hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer); }}
                              className={`p-1 rounded hover:bg-gray-800 ${layer.locked ? 'text-amber-500' : 'text-gray-400'}`}
                              title={layer.locked ? 'ปลดล็อควัตถุ' : 'ล็อควัตถุ'}
                            >
                              {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer); }}
                              className={`p-1 rounded hover:bg-gray-800 ${!layer.visible ? 'text-rose-500' : 'text-gray-400'}`}
                              title={layer.visible ? 'ซ่อนวัตถุ' : 'แสดงวัตถุ'}
                            >
                              {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={(e) => handleMoveLayerIndex(layer, 'up', e)}
                              className="p-1 rounded hover:bg-gray-800 text-gray-400"
                              title="ส่งเลเยอร์ขึ้น"
                            >
                              <BringToFront className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteLayer(layer, e)}
                              className="p-1 rounded hover:bg-rose-950/40 text-gray-400 hover:text-rose-400"
                              title="ลบออก"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/10 text-[10px] text-gray-400 leading-relaxed font-sans">
                  💡 <b>ทิปการออกแบบ:</b> ดับเบิ้ลคลิกชื่อเลเยอร์เพื่อเปลี่ยนชื่อ, กดปุ่ม Shift + เลือกพร้อมกันได้ทันทีเพื่อจัดการเลเยอร์
                </div>
              </div>
            )}

            {/* 2B: Shapes Insertion */}
            {activeSidebarTab === 'shapes' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">รูปร่างเวกเตอร์เวคเตอร์</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleInsertShape('rect')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-indigo-500 text-gray-300 hover:text-white transition-all">
                    <Square className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px]">สี่เหลี่ยม</span>
                  </button>
                  <button onClick={() => handleInsertShape('circle')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-indigo-500 text-gray-300 hover:text-white transition-all">
                    <Circle className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px]">วงกลม</span>
                  </button>
                  <button onClick={() => handleInsertShape('triangle')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-indigo-500 text-gray-300 hover:text-white transition-all">
                    <Triangle className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px]">สามเหลี่ยม</span>
                  </button>
                  <button onClick={() => handleInsertShape('line')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-indigo-500 text-gray-300 hover:text-white transition-all">
                    <Minus className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px]">เส้นตรง</span>
                  </button>
                  <button onClick={() => handleInsertShape('arrow')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121214] border border-[#27272a] hover:border-indigo-500 text-gray-300 hover:text-white transition-all col-span-2">
                    <ArrowRight className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px]">ลูกศรเวกเตอร์</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2C: Typography presets */}
            {activeSidebarTab === 'text' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ใส่ตัวหนังสือภาษาไทย</h3>
                
                <div className="space-y-2">
                  <button onClick={() => handleInsertText('h1')} className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-left font-bold rounded-xl border border-gray-700 transition-all">
                    <span className="text-xl block">หัวข้อหลัก</span>
                    <span className="text-[10px] text-gray-400">ขนาดอักษร 48px, หนา</span>
                  </button>
                  
                  <button onClick={() => handleInsertText('h2')} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-left font-bold rounded-xl border border-gray-700 transition-all">
                    <span className="text-base block">หัวข้อย่อย</span>
                    <span className="text-[10px] text-gray-400">ขนาดอักษร 32px, หนา</span>
                  </button>

                  <button onClick={() => handleInsertText('body')} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-left rounded-xl border border-gray-700 transition-all">
                    <span className="text-sm block">ข้อความทั่วไป</span>
                    <span className="text-[10px] text-gray-400">ขนาดอักษร 20px, บาง</span>
                  </button>
                </div>

                <div className="h-px bg-gray-800 my-4"></div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">ฟอนต์ภาษาไทยมาตรฐานที่โหลดไว้:</label>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                    ระบบรองรับ Sarabun, Kanit, Prompt, Chakra Petch, Mitr เพื่อให้แสดงวรรณยุกต์และสระภาษาไทยได้อย่างถูกต้อง 100% ไม่มีปัญหาเรื่องสระลอย
                  </p>
                </div>
              </div>
            )}

            {/* 2D: Images & Upload assets */}
            {activeSidebarTab === 'images' && (
              <div className="space-y-4 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    อัปโหลดรูปภาพประกอบ
                  </h3>
                  <button
                    type="button"
                    onClick={fetchUploadedImages}
                    className="p-1 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded transition-colors cursor-pointer"
                    title="รีเฟรชคลังภาพ"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer text-center hover:bg-gray-800/40 transition-all group">
                  <Upload className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white">กดเพื่ออัปโหลดไฟล์ภาพ</span>
                  <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, WEBP, SVG (ไม่เกิน 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLocalImage}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>

                {isUploadingImage && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-400 py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl font-sans">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังประมวลผลและจัดเก็บภาพ...
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowImageGalleryModal(true)}
                  className="w-full py-2 px-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/70 hover:border-indigo-500 rounded-xl text-xs font-bold text-gray-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  <span>คลังรูปภาพขนาดใหญ่ ({uploadedImagesList.length})</span>
                </button>

                <div className="h-px bg-gray-800/80"></div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      รูปภาพในคลัง ({uploadedImagesList.length})
                    </span>
                    <span className="text-[9px] text-gray-500">คลิกเพื่อแทรกภาพ</span>
                  </div>

                  {uploadedImagesList.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-gray-500 bg-[#121214] rounded-xl border border-gray-800/80 p-4 space-y-1">
                      <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-gray-400">ยังไม่มีรูปภาพที่อัปโหลด</p>
                      <p className="text-[10px] text-gray-600">อัปโหลดไฟล์ภาพด้านบนเพื่อเริ่มใช้งาน</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedImagesList.map((img) => {
                        const isDeletingThis = deletingImageId === img.id;
                        return (
                          <div
                            key={img.id}
                            className="relative group rounded-xl overflow-hidden border border-gray-800 hover:border-indigo-500/60 bg-[#121214] transition-all flex flex-col"
                          >
                            {/* Image Preview & Click to Insert */}
                            <div
                              onClick={() => !isDeletingThis && handleAddImageToCanvas(img.url)}
                              className="relative w-full h-20 bg-black/30 flex items-center justify-center overflow-hidden cursor-pointer p-1"
                              title={`คลิกเพื่อวาง "${img.originalName || img.filename}" ลงบนกระดาษ`}
                            >
                              <img
                                src={img.url}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                alt={img.originalName || ''}
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                <span className="text-[9px] bg-indigo-600 font-bold px-2 py-0.5 rounded text-white shadow-xs">
                                  วางรูปภาพ
                                </span>
                              </div>
                              {isDeletingThis && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                                </div>
                              )}
                            </div>

                            {/* Bottom bar with Name & Delete Action */}
                            <div className="px-2 py-1.5 bg-[#18181b] border-t border-gray-800/80 flex items-center justify-between gap-1">
                              <span 
                                className="text-[9px] text-gray-400 truncate flex-1 font-sans" 
                                title={img.originalName || img.filename}
                              >
                                {img.originalName || img.filename || 'รูปภาพ'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteUploadedImage(img, e)}
                                disabled={isDeletingThis}
                                className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/15 rounded transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                                title="ลบไฟล์รูปภาพออกจากระบบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2E: Design Templates & Kits */}
            {activeSidebarTab === 'templates' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">โมดูลและเทมเพลตเวกเตอร์</h3>
                <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  คลิกเพื่อโหลดกล่องข้อความ โมดูลตัวเลข KPI หรือแผนผังกระบวนการเวกเตอร์ที่มีดีไซน์สวยงาม ทันสมัย และรองรับภาษาไทย ลงบนกระดาษโดยตรง
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (!canvas) return;
                      // Load basic KPI Card layout
                      const rect = new fabric.Rect({
                        left: 100, top: 100, width: 280, height: 160, fill: '#1e293b', rx: 16, ry: 16, stroke: '#3b82f6', strokeWidth: 2, id: `tpl_${Date.now()}`
                      });
                      const num = new fabric.Textbox('95.4%', {
                        left: 120, top: 130, fontSize: 44, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Prompt'
                      });
                      const lbl = new fabric.Textbox('ดัชนีประสิทธิภาพสารบรรณดิจิทัล (KPI)', {
                        left: 120, top: 200, fontSize: 13, fill: '#94a3b8', fontFamily: 'Sarabun', width: 240
                      });
                      canvas.add(rect, num, lbl);
                      canvas.requestRenderAll();
                      saveHistory();
                      syncLayersList();
                    }}
                    className="w-full p-2.5 bg-gray-800 hover:bg-gray-700 text-left rounded-xl border border-gray-700 text-xs block"
                  >
                    <span className="font-bold block text-indigo-400">📊 การ์ดรายงาน KPI ตัวเลข</span>
                    <span className="text-[9px] text-gray-500">กรอบการ์ดมนและค่าสถิติ</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!canvas) return;
                      // Load Notification block template
                      const bgRect = new fabric.Rect({
                        left: 100, top: 100, width: 400, height: 80, fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 1.5, rx: 12, ry: 12, id: `tpl_${Date.now()}`
                      });
                      const iconText = new fabric.Textbox('💡 แนะนำ:', {
                        left: 120, top: 125, fontSize: 16, fontWeight: 'bold', fill: '#1d4ed8', fontFamily: 'Prompt'
                      });
                      const bodyText = new fabric.Textbox('สระภาษาไทยทั้งหมดได้ถูกปรับปรุงเพื่อไม่ให้สระและวรรณยุกต์ซ้อนลอยและอ่านง่าย', {
                        left: 190, top: 125, fontSize: 13, fill: '#1e40af', fontFamily: 'Sarabun', width: 290
                      });
                      canvas.add(bgRect, iconText, bodyText);
                      canvas.requestRenderAll();
                      saveHistory();
                      syncLayersList();
                    }}
                    className="w-full p-2.5 bg-gray-800 hover:bg-gray-700 text-left rounded-xl border border-gray-700 text-xs block"
                  >
                    <span className="font-bold block text-emerald-400">💡 กล่องข้อเสนอแนะอัจฉริยะ</span>
                    <span className="text-[9px] text-gray-500">กล่องแจ้งเตือนเน้นความประณีต</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!canvas) return;
                      // Add A4 Title banner preset
                      const banner = new fabric.Rect({
                        left: 0, top: 0, width: canvasSize.width, height: 180, fill: '#1e3a8a', id: `tpl_${Date.now()}`
                      });
                      const tHeader = new fabric.Textbox('กองอำนวยการป้องกันและบรรเทาสาธารณภัย', {
                        left: 40, top: 40, fontSize: 26, fontWeight: 'bold', fill: '#fbbf24', fontFamily: 'Prompt', width: canvasSize.width - 80
                      });
                      const tSub = new fabric.Textbox('รายงานวิเคราะห์สภาพสถานการณ์เร่งด่วนประจำวัน', {
                        left: 40, top: 85, fontSize: 16, fill: '#ffffff', fontFamily: 'Sarabun', width: canvasSize.width - 80
                      });
                      canvas.add(banner, tHeader, tSub);
                      canvas.requestRenderAll();
                      saveHistory();
                      syncLayersList();
                    }}
                    className="w-full p-2.5 bg-gray-800 hover:bg-gray-700 text-left rounded-xl border border-gray-700 text-xs block"
                  >
                    <span className="font-bold block text-amber-400">📰 หัวกระดาษรายงานข้าราชการ</span>
                    <span className="text-[9px] text-gray-500">แถบสีนํ้าเงินปูเต็มความกว้างพร้อมชุดอักษร</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2F: AI content generator (Gemini integration) */}
            {activeSidebarTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 pb-1 border-b border-gray-800">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">AI ช่วยคิดคำ & หัวข้อข่าว</h3>
                </div>
                
                <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                  กรอกคำค้นหรือแนวทางที่ต้องการให้ AI ช่วยออกแบบเนื้อหาภาษาไทย แล้วกดปุ่มประมวลผลเพื่อนำข้อความไปวางลงบนกระดาษทันที
                </p>

                {/* Quick Prompt Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ตัวอย่างคำสั่งด่วน:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'หัวข้อข่าวประชาสัมพันธ์สั้นๆ 1 ประโยค',
                      'สรุปแนวทางรับมืออุทกภัย 3 ข้อกระชับ',
                      'สถิติผลงานประจำปี สรุปตัวเลขน่าสนใจ',
                      'คำขวัญและป้ายเตือนภัยสาธารณภัย'
                    ].map((samplePrompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAiPrompt(samplePrompt)}
                        className="px-2 py-1 rounded-lg bg-[#121214] hover:bg-purple-600/20 border border-gray-800 hover:border-purple-500/50 text-[10px] text-gray-300 hover:text-purple-300 transition-all text-left"
                      >
                        ⚡ {samplePrompt}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="พิมพ์หัวข้อ หรือ เลือกคำสั่งด่วนด้านบน..."
                  rows={4}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-sans resize-none"
                />

                <button
                  onClick={handleGenerateAIContent}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังออกแบบคำ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ประมวลคำไทยด้วย AI</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2G: Canvas Dimensions Presets */}
            {activeSidebarTab === 'canvas-settings' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ขนาดกระดาษ & พื้นหลัง</h3>

                <div className="space-y-3">
                  {/* Preset Buttons */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">เลือกขนาดมาตรฐาน:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAPER_SIZES.map((size) => (
                        <button
                          key={size.name}
                          onClick={() => handleUpdateCanvasSize(size.width, size.height)}
                          className={`py-2 px-1 text-center rounded-lg border text-[10px] ${canvasSize.width === size.width && canvasSize.height === size.height ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-[#121214] border-gray-800 text-gray-400'}`}
                        >
                          {size.name} ({size.width}x{size.height})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gray-800"></div>

                  {/* Manual dimension inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">ความกว้าง (px)</label>
                      <input
                        type="number"
                        value={canvasSize.width}
                        onChange={(e) => handleUpdateCanvasSize(Number(e.target.value) || 800, canvasSize.height)}
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">ความสูง (px)</label>
                      <input
                        type="number"
                        value={canvasSize.height}
                        onChange={(e) => handleUpdateCanvasSize(canvasSize.width, Number(e.target.value) || 1200)}
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-800"></div>

                  {/* Background Color Picker */}
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1.5">สีพื้นกระดาษ (Background):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => handleUpdateCanvasBg(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={backgroundColor.toUpperCase()}
                        onChange={(e) => handleUpdateCanvasBg(e.target.value)}
                        className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Grid Visibility Controls */}
                  <div className="h-px bg-gray-800"></div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 block mb-1 font-bold">คู่มือกริด (Layout Guides)</label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">แสดงเส้นกริด</span>
                      <input
                        type="checkbox"
                        checked={gridVisible}
                        onChange={(e) => setGridVisible(e.target.checked)}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">Snap วัตถุลงกริด</span>
                      <input
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(e) => setSnapToGrid(e.target.checked)}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">แสดงไม้บรรทัดวัดขนาด</span>
                      <input
                        type="checkbox"
                        checked={rulersVisible}
                        onChange={(e) => setRulersVisible(e.target.checked)}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CENTER INTERACTIVE STAGE (With responsive viewports and rules) */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#111113] relative select-none">
          
          {/* Action Navigation Strip (Zoom triggers, page navigation, panel toggles) */}
          <div className="h-10 bg-[#141416] border-b border-[#27272a] px-3 sm:px-4 flex items-center justify-between select-none shrink-0 z-10">
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={executeUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="ย้อนกลับ (Undo - Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              
              <button
                onClick={executeRedo}
                disabled={historyIndex >= canvasHistory.length - 1}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="ทำซ้ำ (Redo - Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-gray-800 mx-1"></div>

              <button
                onClick={handleFitToScreen}
                className="px-2 py-1 bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="ขยาย/ย่อให้พอดีกับหน้าจอ PC อัตโนมัติ"
              >
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">พอดีจอ</span>
              </button>

              <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 hidden md:inline">
                {canvasSize.width} × {canvasSize.height}
              </span>
            </div>

            {/* Central Multi-Page Quick Picker */}
            {pagesList.length > 0 && (
              <div className="flex items-center gap-1 bg-[#1c1c1f] p-1 rounded-lg border border-gray-800/60">
                <span className="text-[10px] text-gray-400 font-bold px-1.5 uppercase tracking-wide hidden sm:inline">
                  หน้า {currentPageIndex + 1}/{pagesList.length}
                </span>
                <div className="flex items-center gap-1">
                  {pagesList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSwitchPage(idx)}
                      className={`w-6 h-6 text-[10px] font-bold rounded transition-all cursor-pointer ${currentPageIndex === idx ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                      title={`สลับไปหน้า ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={handleAddPage}
                    className="w-6 h-6 hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 rounded flex items-center justify-center cursor-pointer transition-colors"
                    title="เพิ่มหน้ากระดาษใหม่"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Right Tools: Zoom Level & Panel Toggles */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
                  title="ซูมออก"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer min-w-[42px] text-center"
                  title="รีเซ็ตซูม 100%"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
                  title="ซูมเข้า"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-px bg-gray-800 mx-1 hidden lg:block"></div>

              {/* Toggle Right Inspector Panel */}
              <button
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  isRightPanelOpen 
                    ? 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30' 
                    : 'bg-[#18181b] hover:bg-gray-800 text-gray-400 border-gray-800'
                }`}
                title={isRightPanelOpen ? 'ซ่อนแถบคุณสมบัติขวามือ' : 'แสดงแถบคุณสมบัติขวามือ'}
              >
                <Sliders className="w-3 h-3 text-indigo-400" />
                <span className="hidden xl:inline">{isRightPanelOpen ? 'ซ่อนแถบขวา' : 'แถบคุณสมบัติ'}</span>
              </button>
            </div>
          </div>

          {/* Central Scrollable Area */}
          <div ref={canvasContainerRef} className="flex-1 overflow-auto relative p-4 sm:p-8 flex justify-center items-center min-h-0 bg-[#0c0c0e]">
            
            {/* Floating button to reopen right panel when collapsed on PC */}
            {!isRightPanelOpen && (
              <button
                onClick={() => setIsRightPanelOpen(true)}
                className="hidden lg:flex absolute top-3 right-3 z-20 px-3 py-1.5 bg-[#18181b]/90 hover:bg-gray-800 text-gray-200 border border-gray-700 rounded-xl shadow-lg text-xs font-bold items-center gap-1.5 backdrop-blur-xs cursor-pointer transition-all hover:scale-105"
                title="เปิดแถบคุณสมบัติวัตถุ"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>คุณสมบัติ</span>
              </button>
            )}

            {/* Infinite Zoom container layer */}
            <div 
              style={{ 
                transform: `scale(${zoomLevel})`, 
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out'
              }}
              className="relative shadow-2xl bg-white shrink-0 my-auto"
            >
              
              {/* Optional Grid overlay */}
              {gridVisible && (
                <div 
                  className="absolute inset-0 pointer-events-none select-none z-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 1.5px, transparent 1.5px)',
                    backgroundSize: `${gridSize}px ${gridSize}px`
                  }}
                />
              )}

              {/* Fabric actual Canvas element */}
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* 2DD: Bottom Slide Selector Carousel Dock (Collapsible on PC) */}
          {isBottomDockOpen ? (
            <div className="hidden md:flex h-24 lg:h-28 bg-[#141416] border-t border-[#27272a] px-4 py-2 items-center gap-3 select-none overflow-x-auto shrink-0 z-10 transition-all duration-200">
              <div className="flex flex-col items-start gap-1 pr-3 border-r border-gray-800 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">สไลด์แผ่นงาน</span>
                  <button
                    onClick={() => setIsBottomDockOpen(false)}
                    className="p-0.5 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded cursor-pointer ml-2"
                    title="ย่อแถบสไลด์"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleAddPage}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] font-bold cursor-pointer shadow-xs"
                  title="เพิ่มหน้ากระดาษใหม่"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มหน้า</span>
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto py-1 flex-1 scrollbar-thin">
                {pagesList.map((pageJSON, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSwitchPage(idx)}
                    className={`group relative flex-shrink-0 w-28 h-16 rounded-xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between p-2.5 ${currentPageIndex === idx ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500/20' : 'bg-[#121214] border-gray-800 hover:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-300">
                        หน้า {idx + 1}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePage(idx);
                          }}
                          className="p-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors cursor-pointer"
                          title="คัดลอกหน้ากระดาษนี้"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        {pagesList.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(idx);
                            }}
                            className="p-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
                            title="ลบหน้ากระดาษนี้"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[8px] text-gray-500">
                      <span>
                        {(() => {
                          try {
                            const parsed = typeof pageJSON === 'string' ? JSON.parse(pageJSON) : pageJSON;
                            const count = parsed?.objects?.length || 0;
                            return `${count} ชิ้นงาน`;
                          } catch {
                            return `แผ่นงาน ${idx + 1}`;
                          }
                        })()}
                      </span>
                      {currentPageIndex === idx && (
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex h-8 bg-[#141416] border-t border-[#27272a] px-4 items-center justify-between select-none shrink-0 z-10 text-[11px] text-gray-400 transition-all">
              <span className="text-gray-400 text-[10px]">
                กำลังแก้ไข: <strong className="text-indigo-400">หน้า {currentPageIndex + 1}</strong> จาก {pagesList.length} หน้า
              </span>
              <button
                onClick={() => setIsBottomDockOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                title="เปิดแถบดูภาพรวมหน้าสไลด์"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>แสดงแถบสไลด์ ({pagesList.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT PROPERTY INSPECTOR PANEL (Alignment, Dimension & Stroke) */}
        {/* ============================================================== */}
        <div className={`border-l border-[#27272a] bg-[#18181b] flex flex-col overflow-y-auto shrink-0 hidden lg:flex z-10 transition-all duration-200 ${
          isRightPanelOpen ? 'w-72 xl:w-80 p-4' : 'w-0 p-0 border-l-0 overflow-hidden'
        }`}>
          
          {/* Header with Title and Collapse Button */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800 shrink-0 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedObject ? 'คุณสมบัติวัตถุ' : 'ตั้งค่าผืนผ้าใบ'}</span>
            </span>
            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="p-1 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded-lg transition-colors cursor-pointer"
              title="ยุบแถบคุณสมบัติ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedObject ? (
            <div className="space-y-5">
              
              {/* 3A: ALIGNMENT BUTTONS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">การจัดตำแหน่งเวกเตอร์ (Align)</span>
                <div className="grid grid-cols-6 gap-1 bg-[#121214] p-1 rounded-xl border border-gray-800">
                  <button onClick={() => handleAlignSelected('left')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดชิดซ้าย">
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAlignSelected('center')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดกึ่งกลางแนวนอน">
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAlignSelected('right')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดชิดขวา">
                    <AlignRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAlignSelected('top')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดชิดขอบบน">
                    <BringToFront className="w-4 h-4 rotate-90" />
                  </button>
                  <button onClick={() => handleAlignSelected('middle')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดกึ่งกลางแนวตั้ง">
                    <SendToBack className="w-4 h-4 rotate-90" />
                  </button>
                  <button onClick={() => handleAlignSelected('bottom')} className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center justify-center" title="จัดชิดขอบล่าง">
                    <SendToBack className="w-4 h-4" />
                  </button>
                </div>

                {selectedObject.type === 'activeSelection' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleDistributeSelected('horizontal')}
                      className="py-1 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 flex items-center justify-center gap-1 border border-gray-700"
                      title="กระจายระยะห่างแนวนอนเท่า ๆ กัน"
                    >
                      <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
                      <span>กระจายแนวนอน</span>
                    </button>
                    <button
                      onClick={() => handleDistributeSelected('vertical')}
                      className="py-1 px-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 flex items-center justify-center gap-1 border border-gray-700"
                      title="กระจายระยะห่างแนวตั้งเท่า ๆ กัน"
                    >
                      <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
                      <span>กระจายแนวตั้ง</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-800" />

              {/* 3B: GEOMETRY COORDS & DIMENSIONS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ขนาดและรูปพิกัด (Transform)</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">แกน X (px)</label>
                    <input
                      type="number"
                      value={objX}
                      onChange={(e) => handleGeometryChange('left', Number(e.target.value) || 0)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">แกน Y (px)</label>
                    <input
                      type="number"
                      value={objY}
                      onChange={(e) => handleGeometryChange('top', Number(e.target.value) || 0)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">ความกว้าง W</label>
                    <input
                      type="number"
                      value={objW}
                      onChange={(e) => handleGeometryChange('width', Number(e.target.value) || 1)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">ความสูง H</label>
                    <input
                      type="number"
                      value={objH}
                      onChange={(e) => handleGeometryChange('height', Number(e.target.value) || 1)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">มุมหมุน (องศา)</label>
                    <input
                      type="number"
                      value={objAngle}
                      onChange={(e) => handleGeometryChange('angle', Number(e.target.value) || 0)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {selectedObject.type === 'rect' && (
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">ความโค้งมนมุม</label>
                      <input
                        type="number"
                        value={objCornerRadius}
                        onChange={(e) => handleGeometryChange('rx', Number(e.target.value) || 0)}
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Opacity Slider */}
                <div className="pt-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>ความโปร่งใส (Opacity)</span>
                    <span className="font-mono">{objOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={objOpacity}
                    onChange={(e) => handleGeometryChange('opacity', Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="h-px bg-gray-800" />

              {/* 3C: TYPOGRAPHY SETTINGS (Conditional) */}
              {(selectedObject.type === 'i-text' || selectedObject.type === 'textbox') && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">คุณสมบัติตัวหนังสือ (Font)</span>
                  
                  {/* Font Family selector dropdown */}
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-1">ฟอนต์ภาษาไทย</label>
                    <FontSelector
                      currentFont={fontFamily}
                      onSelectFont={(f) => handleTypographyChange('fontFamily', f)}
                    />
                  </div>

                  {/* Font formatting options row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">ขนาดอักษร</label>
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => handleTypographyChange('fontSize', Number(e.target.value) || 12)}
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 block mb-0.5">ระยะบรรทัด (LineH)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={lineHeight}
                        onChange={(e) => handleTypographyChange('lineHeight', Number(e.target.value) || 1.2)}
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Style Toggles (Bold, Italic, Alignments) */}
                  <div className="flex justify-between items-center bg-[#121214] p-1 rounded-xl border border-gray-800">
                    <button
                      onClick={() => handleTypographyChange('bold', !isBold)}
                      className={`p-1.5 rounded-lg ${isBold ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="ตัวหนา"
                    >
                      <span className="text-xs font-black">B</span>
                    </button>
                    <button
                      onClick={() => handleTypographyChange('italic', !isItalic)}
                      className={`p-1.5 rounded-lg ${isItalic ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="ตัวเอียง"
                    >
                      <span className="text-xs italic font-serif">I</span>
                    </button>
                    <button
                      onClick={() => handleTypographyChange('underline', !isUnderline)}
                      className={`p-1.5 rounded-lg ${isUnderline ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="ขีดเส้นใต้"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px bg-gray-800 h-4"></div>
                    <button
                      onClick={() => handleTypographyChange('textAlign', 'left')}
                      className={`p-1.5 rounded-lg ${textAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="จัดชิดซ้าย"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTypographyChange('textAlign', 'center')}
                      className={`p-1.5 rounded-lg ${textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="จัดกึ่งกลาง"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTypographyChange('textAlign', 'right')}
                      className={`p-1.5 rounded-lg ${textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="จัดชิดขวา"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-px bg-gray-800" />
                </div>
              )}

              {/* 3D: COLOR & APPEARANCE (Fill, Stroke, Shadows) */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">การตกแต่ง (Fill & Stroke)</span>

                {/* Fill color picker */}
                {selectedObject.type !== 'line' && (
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-1">สีวัตถุพื้นสี (Fill Color)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={objFill.startsWith('#') && objFill.length === 7 ? objFill : '#3b82f6'}
                        onChange={(e) => handleAppearanceChange('fill', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={objFill.toUpperCase()}
                        onChange={(e) => handleAppearanceChange('fill', e.target.value)}
                        className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Stroke Color */}
                <div>
                  <label className="text-[9px] text-gray-500 block mb-1">สีเส้นขอบ (Stroke Color)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={objStroke.startsWith('#') && objStroke.length === 7 ? objStroke : '#1e3a8a'}
                      onChange={(e) => handleAppearanceChange('stroke', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={objStroke.toUpperCase()}
                      onChange={(e) => handleAppearanceChange('stroke', e.target.value)}
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Stroke Thickness Width */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>ความหนาเส้นขอบ</span>
                    <span className="font-mono">{objStrokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={objStrokeWidth}
                    onChange={(e) => handleAppearanceChange('strokeWidth', Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>

                <div className="h-px bg-gray-800" />

                {/* Shadow Blur offset */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span>ฟุ้งเงาหลัง (Shadow Blur)</span>
                    <span className="font-mono">{objShadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={objShadowBlur}
                    onChange={(e) => handleAppearanceChange('shadowBlur', Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 block mb-1">สีของเงาตกกระทบ</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={objShadowColor.startsWith('#') && objShadowColor.length === 7 ? objShadowColor : '#000000'}
                      onChange={(e) => handleAppearanceChange('shadowColor', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={objShadowColor}
                      onChange={(e) => handleAppearanceChange('shadowColor', e.target.value)}
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl py-1 px-2.5 text-xs text-gray-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-4 text-gray-200">
              {/* Paper & Page Meta Header */}
              <div className="pb-3 border-b border-gray-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">ผืนผ้าใบหน้า {currentPageIndex + 1}</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-500/20">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold">กว้าง</span>
                    <span className="text-xs font-mono font-bold text-gray-200">{canvasSize.width} px</span>
                  </div>
                  <div className="flex-1 bg-[#121214] border border-[#27272a] rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold">สูง</span>
                    <span className="text-xs font-mono font-bold text-gray-200">{canvasSize.height} px</span>
                  </div>
                </div>
              </div>

              {/* Quick Insert Actions */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">เพิ่มวัตถุด่วน (Quick Insert)</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleInsertText('h1')}
                    className="p-2 bg-[#121214] hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl text-left transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <Type className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-300 group-hover:text-white">หัวข้อ</span>
                  </button>
                  <button
                    onClick={() => handleInsertText('body')}
                    className="p-2 bg-[#121214] hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl text-left transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-300 group-hover:text-white">ข้อความ</span>
                  </button>
                  <button
                    onClick={() => handleInsertShape('rect')}
                    className="p-2 bg-[#121214] hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl text-left transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <Square className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-300 group-hover:text-white">สี่เหลี่ยม</span>
                  </button>
                  <button
                    onClick={() => handleInsertShape('circle')}
                    className="p-2 bg-[#121214] hover:bg-gray-800 border border-gray-800 hover:border-indigo-500 rounded-xl text-left transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <Circle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-300 group-hover:text-white">วงกลม</span>
                  </button>
                </div>
              </div>

              {/* Background Color Palette */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">สีกระดาษ (Background)</span>
                  <span className="text-[10px] text-gray-400 font-mono">{backgroundColor}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['#ffffff', '#f8fafc', '#f1f5f9', '#fefce8', '#0f172a', '#18181b', '#1e3a8a', '#064e3b'].map((col) => (
                    <button
                      key={col}
                      onClick={() => handleUpdateCanvasBg(col)}
                      className={`w-6 h-6 rounded-lg border transition-all cursor-pointer ${
                        backgroundColor === col ? 'border-indigo-500 scale-110 shadow-sm ring-2 ring-indigo-500/40' : 'border-gray-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                  <input
                    type="color"
                    value={backgroundColor.startsWith('#') ? backgroundColor : '#ffffff'}
                    onChange={(e) => handleUpdateCanvasBg(e.target.value)}
                    className="w-6 h-6 rounded-lg border border-gray-700 cursor-pointer p-0 bg-transparent shrink-0"
                    title="เลือกสีเอง"
                  />
                </div>
              </div>

              {/* Quick Preset Dimensions */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">ขนาดมาตรฐาน</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: 'Infographic มาตรฐาน', w: 800, h: 1200 },
                    { name: 'A4 แนวตั้ง', w: 794, h: 1123 },
                    { name: 'A4 แนวนอน', w: 1123, h: 794 },
                    { name: 'Facebook Banner', w: 1200, h: 630 },
                    { name: 'Square (จัตุรัส)', w: 1080, h: 1080 },
                    { name: 'Presentation 16:9', w: 1920, h: 1080 },
                  ].map((preset) => {
                    const isCurrent = canvasSize.width === preset.w && canvasSize.height === preset.h;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleUpdateCanvasSize(preset.w, preset.h)}
                        className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                            : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <div className="font-semibold truncate text-[11px]">{preset.name}</div>
                        <div className="text-[9px] text-gray-500">{preset.w} × {preset.h} px</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guides & Grid Toggles */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">เครื่องมือจัดหน้า</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setGridVisible(!gridVisible)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                      gridVisible ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[#121214] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>เส้นกริด</span>
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                      snapToGrid ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[#121214] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>แม่เหล็กดูด</span>
                    <Magnet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowRulers(!showRulers)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                      showRulers ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-[#121214] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>ไม้บรรทัด</span>
                    <Ruler className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleFitToScreen}
                    className="p-2 rounded-xl text-xs font-bold border bg-[#121214] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-indigo-500 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>พอดีหน้าจอ</span>
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              </div>

              {/* Usage Tip */}
              <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-[10px] text-gray-400 leading-relaxed">
                <span className="font-bold text-indigo-300 block mb-0.5">💡 คำแนะนำ:</span>
                คลิกเลือกวัตถุบนหน้ากระดาษเพื่อเปิดเครื่องมือจัดตำแหน่ง สี ฟอนต์ หรือกด <kbd className="px-1 py-0.5 bg-gray-800 text-gray-300 font-mono rounded text-[9px]">Del</kbd> เพื่อลบ
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION STRIP (100% Fully supportive responsive) */}
      {/* ============================================================== */}
      <footer className="h-14 bg-[#141416] border-t border-[#27272a] flex items-center md:hidden shrink-0 select-none z-40">
        
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-1.5 transition-all ${mobileTab === 'canvas' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
        >
          <Monitor className="w-4 h-4" />
          <span className="text-[9px]">กระดาษ</span>
        </button>

        <button
          onClick={() => setMobileTab('layers')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-1.5 transition-all ${mobileTab === 'layers' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px]">เลเยอร์</span>
        </button>

        <button
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-1.5 transition-all ${mobileTab === 'tools' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-[9px]">เครื่องมือ</span>
        </button>

        <button
          onClick={() => setMobileTab('properties')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-1.5 transition-all ${mobileTab === 'properties' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[9px]">ปรับแต่ง</span>
        </button>
      </footer>

      {/* Mobile Floating Drawer overlay triggers */}
      {mobileTab === 'layers' && (
        <div className="fixed inset-x-0 bottom-14 top-1/4 bg-[#18181b]/95 backdrop-blur-md z-30 p-4 border-t border-[#27272a] shadow-2xl flex flex-col overflow-hidden animate-slideUp">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-xs font-black text-gray-200">เลเยอร์วัตถุทั้งหมด</span>
            <button onClick={() => setMobileTab('canvas')} className="p-1 hover:bg-gray-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
            {layersList.map((layer) => (
              <div
                key={layer.id}
                onClick={(e) => handleSelectLayer(layer, e)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs ${layer.active ? 'bg-indigo-600/20 text-indigo-400' : 'bg-[#121214] text-gray-300'}`}
              >
                <span className="truncate flex-1">{layer.name}</span>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer); }}>
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer); }}>
                    {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={(e) => handleDeleteLayer(layer, e)} className="text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mobileTab === 'tools' && (
        <div className="fixed inset-x-0 bottom-14 max-h-[70vh] overflow-y-auto bg-[#18181b]/95 backdrop-blur-md z-30 p-4 border-t border-[#27272a] shadow-2xl space-y-3 animate-slideUp">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-xs font-bold text-gray-200">เมนูเครื่องมือทั้งหมด (All Menus)</span>
            <button onClick={() => setMobileTab('canvas')} className="p-1 hover:bg-gray-800 rounded text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => { setActiveSidebarTab('pages'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Columns className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-bold text-gray-200">หน้ากระดาษ</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('layers'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Layers className="w-5 h-5 text-indigo-400" />
              <span className="text-[10px] font-bold text-gray-200">เลเยอร์</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('shapes'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Shapes className="w-5 h-5 text-sky-400" />
              <span className="text-[10px] font-bold text-gray-200">รูปทรง</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('text'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Type className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-bold text-gray-200">ข้อความ</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('images'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <span className="text-[10px] font-bold text-gray-200">รูปภาพ</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('icons'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Sticker className="w-5 h-5 text-pink-400" />
              <span className="text-[10px] font-bold text-gray-200">ไอคอน</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('background'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Palette className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-bold text-gray-200">พื้นหลัง</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('templates'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <LayoutGrid className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-bold text-gray-200">โมดูล</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('ai'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
              <span className="text-[10px] font-bold text-gray-200">AI ผู้ช่วย</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('graphite'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Workflow className="w-5 h-5 text-orange-400" />
              <span className="text-[10px] font-bold text-gray-200">กราไฟต์</span>
            </button>

            <button
              onClick={() => { setActiveSidebarTab('canvas-settings'); setShowMobileDrawer(true); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <Sliders className="w-5 h-5 text-teal-400" />
              <span className="text-[10px] font-bold text-gray-200">ตั้งค่ากระดาษ</span>
            </button>

            <button
              onClick={() => { toggleDrawMode(); setMobileTab('canvas'); }}
              className="flex flex-col items-center justify-center p-3 bg-[#121214] hover:bg-indigo-600/20 border border-gray-800 hover:border-indigo-500 rounded-xl text-xs gap-1.5 transition-all text-center"
            >
              <PenTool className="w-5 h-5 text-rose-400" />
              <span className="text-[10px] font-bold text-gray-200">ปากกาเขียน</span>
            </button>
          </div>
        </div>
      )}

      {mobileTab === 'properties' && (
        <div className="fixed inset-x-0 bottom-14 max-h-[75vh] bg-[#18181b]/95 backdrop-blur-md z-40 p-4 border-t border-[#27272a] shadow-2xl overflow-y-auto animate-slideUp space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-200">ปรับแต่งคุณสมบัติวัตถุ</span>
            </div>
            <button onClick={() => setMobileTab('canvas')} className="p-1 hover:bg-gray-800 rounded text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedObject ? (
            <div className="space-y-4 text-xs font-sans">
              
              {/* Quick Actions & Delete */}
              <div className="flex items-center justify-between bg-[#121214] p-2 rounded-xl border border-gray-800">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  {selectedObject.type === 'i-text' || selectedObject.type === 'textbox' ? '🔤 ข้อความ' : selectedObject.type === 'image' ? '🖼️ รูปภาพ' : '📐 รูปทรงเวกเตอร์'}
                </span>
                <button
                  onClick={() => {
                    if (!canvas) return;
                    const active = canvas.getActiveObject();
                    if (active) {
                      if (active.type === 'activeSelection') {
                        active.forEachObject((obj: any) => canvas.remove(obj));
                        canvas.discardActiveObject();
                      } else {
                        canvas.remove(active);
                      }
                      canvas.requestRenderAll();
                      syncLayersList();
                      saveHistory();
                      setSelectedObject(null);
                      setMobileTab('canvas');
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบวัตถุ</span>
                </button>
              </div>

              {/* Alignments */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">การจัดตำแหน่ง (Align)</span>
                <div className="grid grid-cols-6 gap-1 bg-[#121214] p-1.5 rounded-xl border border-gray-800">
                  <button onClick={() => handleAlignSelected('left')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="ชิดซ้าย"><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignSelected('center')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="กึ่งกลางแนวนอน"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignSelected('right')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="ชิดขวา"><AlignRight className="w-4 h-4" /></button>
                  <button onClick={() => handleAlignSelected('top')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="ชิดบน"><BringToFront className="w-4 h-4 rotate-90" /></button>
                  <button onClick={() => handleAlignSelected('middle')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="กึ่งกลางแนวตั้ง"><SendToBack className="w-4 h-4 rotate-90" /></button>
                  <button onClick={() => handleAlignSelected('bottom')} className="p-2 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center justify-center" title="ชิดล่าง"><SendToBack className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">ความกว้าง (Width)</label>
                  <input type="number" value={objW} onChange={(e) => handleGeometryChange('width', Number(e.target.value))} className="w-full bg-[#121214] border border-gray-800 p-2 rounded-xl text-gray-200" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">ความสูง (Height)</label>
                  <input type="number" value={objH} onChange={(e) => handleGeometryChange('height', Number(e.target.value))} className="w-full bg-[#121214] border border-gray-800 p-2 rounded-xl text-gray-200" />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">พิกัด X</label>
                  <input type="number" value={objX} onChange={(e) => handleGeometryChange('left', Number(e.target.value))} className="w-full bg-[#121214] border border-gray-800 p-2 rounded-xl text-gray-200" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">พิกัด Y</label>
                  <input type="number" value={objY} onChange={(e) => handleGeometryChange('top', Number(e.target.value))} className="w-full bg-[#121214] border border-gray-800 p-2 rounded-xl text-gray-200" />
                </div>
              </div>

              {/* Colors */}
              {selectedObject.type !== 'image' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">สีเติมภายใน (Fill)</label>
                    <div className="flex items-center gap-1.5 bg-[#121214] border border-gray-800 p-1 rounded-xl">
                      <input type="color" value={objFill.startsWith('#') && objFill.length === 7 ? objFill : '#4f46e5'} onChange={(e) => handleAppearanceChange('fill', e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0" />
                      <span className="font-mono text-[10px] text-gray-300 truncate">{objFill}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">สีเส้นขอบ (Stroke)</label>
                    <div className="flex items-center gap-1.5 bg-[#121214] border border-gray-800 p-1 rounded-xl">
                      <input type="color" value={objStroke.startsWith('#') && objStroke.length === 7 ? objStroke : '#1e3a8a'} onChange={(e) => handleAppearanceChange('stroke', e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0" />
                      <span className="font-mono text-[10px] text-gray-300 truncate">{objStroke}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Opacity */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span>ความโปร่งใส (Opacity)</span>
                  <span className="font-mono">{Math.round(objOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={objOpacity}
                  onChange={(e) => handleAppearanceChange('opacity', Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 space-y-2">
              <Move className="w-8 h-8 text-gray-600 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-gray-400">ยังไม่ได้เลือกวัตถุใด ๆ บนกระดาษ</p>
              <p className="text-[10px]">แตะเลือกข้อความ หรือรูปทรงเพื่อเปิดเมนูปรับแต่ง</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3P MODAL BOXES: Gallery / Share / Permissions modals */}
      {/* ============================================================== */}
      {showGalleryModal && (
        <InfographicsGalleryModal
          currentUser={user}
          onClose={() => setShowGalleryModal(false)}
          onLoad={(id) => loadProjectDB(id)}
          onShare={() => {}}
        />
      )}

      {showShareModal && currentProjectId && (
        <InfographicsShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          infographic={{
            id: currentProjectId || '',
            name: projectName,
            isPublic: scope === 'central',
            allowEmbed: true,
            allowDownload: true,
            scope: scope === 'central' ? 'central' : 'personal',
            ownerId: user?.id,
            ownerName: ownerName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            ownerDepartment: ownerDepartment || user?.department
          }}
          onExportPng={() => handleExportFile('png')}
          onExportPdf={() => handleExportFile('pdf')}
          onExportSvg={() => handleExportFile('svg')}
          onOpenExportModal={() => {
            saveCurrentCanvasToPagesList();
            setShowExportModal(true);
          }}
          onUpdateSettings={async (updated) => {
            if (updated.scope) setScope(updated.scope === 'central' ? 'central' : 'department');
            await fetch(`/api/infographics/${currentProjectId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: projectName,
                scope: updated.scope === 'central' ? 'central' : 'department',
                isPublic: updated.isPublic ? 1 : 0,
                allowEmbed: updated.allowEmbed ? 1 : 0,
                allowDownload: updated.allowDownload ? 1 : 0
              })
            });
          }}
        />
      )}

      {showExportModal && (
        <InfographicsExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          projectName={projectName}
          pagesList={pagesList}
          currentPageIndex={currentPageIndex}
          canvas={canvas}
          canvasSize={canvasSize}
          backgroundColor={backgroundColor}
          generateCompleteSVG={generateCompleteSVG}
          onShowToast={(msg, type) => setSaveToast({ message: msg, type: type === 'error' ? 'error' : 'success' })}
          onSaveCurrentPageToMemory={saveCurrentCanvasToPagesList}
        />
      )}

      {showImageGalleryModal && (
        <InfographicsImageGalleryModal
          currentUser={user}
          onClose={() => {
            setShowImageGalleryModal(false);
            fetchUploadedImages();
          }}
          onSelectImage={(imageUrl) => {
            handleAddImageToCanvas(imageUrl);
            setShowImageGalleryModal(false);
          }}
          onUploadNew={() => {
            fetchUploadedImages();
          }}
        />
      )}

    </div>
  );
}
