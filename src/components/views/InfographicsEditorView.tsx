import React, { useEffect, useRef, useState } from 'react';

// Dynamic fabric loading for build compatibility
let fabric: any = null;

import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, 
  Download, Trash2, Palette, Type as FontIcon, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, BringToFront, SendToBack,
  Save, Undo, Redo, LayoutGrid, Underline, Copy, PenTool, FolderOpen, Minus,
  Wrench, Settings, X, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck,
  Star, ArrowRight, ArrowLeft, Grid, Sparkles, Lock, Unlock, Eye, HelpCircle,
  BarChart3, PieChart, AlertTriangle, ShieldAlert, FileText, Users, CheckSquare,
  MessageSquare, Zap, Activity, Info, Award, Plus, Sliders, Hash, Move,
  Shapes, CheckCircle, XCircle, Lightbulb, Clock, Calendar, Mail, Phone, 
  MapPin, Heart, Target, TrendingUp, ThumbsUp, Tag, FileCheck, Shield, 
  Database, Quote, Check, Search, Stamp, Bookmark, Compass, Sticker,
  Smile, Flame, Crown, Trophy, Rocket, Bell, Globe, Cpu, Laptop, Printer,
  Briefcase, Scale, Building2, Share2, FileSignature, QrCode, Gift, Percent,
  Coins, DollarSign, Megaphone, CheckCheck, Workflow, ShieldCheck as ShieldCheckIcon,
  Ruler, Magnet, Crosshair, Columns, EyeOff, Maximize2, Minimize2, Scaling, Expand, Shrink, Smartphone, Monitor,
  Upload, RotateCcw, Crop
} from 'lucide-react';

import { InfographicsGalleryModal } from './InfographicsGalleryModal';
import { InfographicsImageGalleryModal, UploadedImageItem } from './InfographicsImageGalleryModal';
import { InfographicsShareModal, InfographicShareSettings } from './InfographicsShareModal';
import { ImageCropModal } from './ImageCropModal';
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

interface InfographicsEditorViewProps {
  user: any;
}

export default function InfographicsEditorView({ user }: InfographicsEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [fabricError, setFabricError] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);

  // Session Persistence Constants
  const SESSION_STORAGE_KEY = 'infographics_editor_session_v2';
  const isInitialLoadRef = useRef(true);
  const persistenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic import fabric.js from CDN to bypass server compilation and installation issues
  useEffect(() => {
    let isMounted = true;
    
    // Check if fabric is already available globally
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
        setFabricError('โหลดไลบรารีสำเร็จแต่ไม่พบตัวแปรระบบ Fabric บนเบราว์เซอร์');
      }
    };

    const handleScriptError = (err: any) => {
      console.error('Failed to load fabric library from CDN:', err);
      if (!isMounted) return;
      setFabricError('ไม่สามารถโหลดไลบรารีสำหรับออกแบบภาพได้เนื่องจากปัญหาการเชื่อมต่ออินเทอร์เน็ต กรุณาลองใหม่อีกครั้ง');
    };

    if (script) {
      // Script already exists, wait for it to load if it hasn't
      if ((window as any).fabric) {
        handleScriptLoad();
      } else {
        script.addEventListener('load', handleScriptLoad);
        script.addEventListener('error', handleScriptError);
      }
    } else {
      // Create and append the script
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.min.js';
      script.async = true;
      script.onload = handleScriptLoad;
      script.onerror = handleScriptError;
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
  }, []);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>('px');
  const [gridStyle, setGridStyle] = useState<GridStyle>('dots');
  const [gridSize, setGridSize] = useState<number>(20);
  const [gridOpacity, setGridOpacity] = useState<number>(0.2);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapTolerance, setSnapTolerance] = useState(10);
  const [guides, setGuides] = useState<GuideLine[]>([
    { id: 'guide-center-x', type: 'v', pos: 400, color: '#06b6d4' },
    { id: 'guide-center-y', type: 'h', pos: 300, color: '#06b6d4' },
  ]);
  const [showGuides, setShowGuides] = useState(true);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [showRulerGridPopover, setShowRulerGridPopover] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Container refs for Fullscreen & Auto-fit calculation
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  // Refs for event listeners
  const snapToGridRef = useRef(snapToGrid);
  snapToGridRef.current = snapToGrid;
  const gridSizeRef = useRef(gridSize);
  gridSizeRef.current = gridSize;
  const snapToleranceRef = useRef(snapTolerance);
  snapToleranceRef.current = snapTolerance;
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  
  // Left Sidebar active tab
  const [activeSidebarTab, setActiveSidebarTab] = useState<'text' | 'shapes' | 'elements' | 'infographic' | 'images' | 'templates' | 'canvas' | 'ai'>('elements');
  const [elementCategory, setElementCategory] = useState<'all' | 'stickers' | 'icons' | 'stamps' | 'flowchart' | 'diagrams' | 'dividers'>('all');
  const [iconSubCategory, setIconSubCategory] = useState<'all' | 'gov' | 'tech' | 'finance' | 'comm' | 'symbols' | 'safety'>('all');
  const [iconActiveColor, setIconActiveColor] = useState<string>('#2563eb');
  const [elementSearchQuery, setElementSearchQuery] = useState('');

  // Image Library Modal & Assets State
  const [showImageLibraryModal, setShowImageLibraryModal] = useState(false);
  const [uploadedImagesList, setUploadedImagesList] = useState<UploadedImageItem[]>([]);
  const [loadingUploadedImages, setLoadingUploadedImages] = useState(false);
  const [imageLibrarySearch, setImageLibrarySearch] = useState('');
  const [imageLibraryFolder, setImageLibraryFolder] = useState<string>('all');
  const [isUploadingImageSidebar, setIsUploadingImageSidebar] = useState(false);

  // Fetch images for sidebar panel
  const fetchUploadedImages = async () => {
    setLoadingUploadedImages(true);
    try {
      const res = await fetch('/api/infographics-assets/images');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          setUploadedImagesList(data.images);
        }
      }
    } catch (err) {
      console.error('Error fetching uploaded images:', err);
    } finally {
      setLoadingUploadedImages(false);
    }
  };

  useEffect(() => {
    if (activeSidebarTab === 'images') {
      fetchUploadedImages();
    }
  }, [activeSidebarTab]);

  // Fit to screen helper calculation
  const fitToScreen = (isFs = isFullscreen) => {
    if (!viewportContainerRef.current) return;
    const rect = viewportContainerRef.current.getBoundingClientRect();
    const paddingX = showRuler ? 60 : 32;
    const paddingY = showRuler ? 60 : 32;
    const availableWidth = Math.max(100, rect.width - paddingX);
    const availableHeight = Math.max(100, rect.height - paddingY);
    
    if (availableWidth > 0 && availableHeight > 0 && canvasSize.width > 0 && canvasSize.height > 0) {
      const scaleX = availableWidth / canvasSize.width;
      const scaleY = availableHeight / canvasSize.height;
      const bestScale = Math.min(scaleX, scaleY, 2.5);
      const finalZoom = Math.max(0.15, Math.round(bestScale * 100) / 100);
      setZoomLevel(finalZoom);
    }
  };

  // Toggle Full Screen (Compatible with PC & Mobile, Desktop HTML5 Fullscreen API + Fallback CSS Fullscreen)
  const toggleFullscreen = () => {
    const container = editorContainerRef.current;
    if (!container) return;

    const isDocFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (isDocFullscreen || isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
      setTimeout(() => fitToScreen(false), 150);
    } else {
      const requestMethod = 
        container.requestFullscreen ||
        (container as any).webkitRequestFullscreen ||
        (container as any).mozRequestFullScreen ||
        (container as any).msRequestFullscreen;

      if (requestMethod) {
        requestMethod.call(container).then(() => {
          setIsFullscreen(true);
          setTimeout(() => fitToScreen(true), 150);
        }).catch(() => {
          // If browser restricts HTML5 Fullscreen (e.g. inside strict iframe), fallback to CSS fullscreen
          setIsFullscreen(true);
          setTimeout(() => fitToScreen(true), 150);
        });
      } else {
        setIsFullscreen(true);
        setTimeout(() => fitToScreen(true), 150);
      }
    }
  };

  // Sync fullscreen change events from browser
  useEffect(() => {
    const handleFsChange = () => {
      const isDocFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isDocFs);
      setTimeout(() => fitToScreen(isDocFs), 100);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, [canvasSize, showRuler]);

  // Auto-scale on mount and on window resize for both PC & Mobile
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 250);

    const handleResize = () => {
      fitToScreen();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasSize, showRuler]);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('My Infographic');
  const [showGallery, setShowGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareData, setCurrentShareData] = useState<InfographicShareSettings | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveMode, setSaveMode] = useState<'overwrite' | 'copy'>('overwrite');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'tools' | 'properties'>('canvas');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Clipboard and History
  const clipboardRef = useRef<any>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryUpdateRef = useRef(false);
  
  // Properties of selected object
  const [fillColor, setFillColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Sarabun');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [textAlign, setTextAlign] = useState('left');
  const [underline, setUnderline] = useState(false);
  const [cornerRadius, setCornerRadius] = useState(8);
  const [isLocked, setIsLocked] = useState(false);
  
  // Shadow state
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('rgba(0,0,0,0.3)');
  const [shadowBlur, setShadowBlur] = useState(10);
  const [shadowOffsetX, setShadowOffsetX] = useState(3);
  const [shadowOffsetY, setShadowOffsetY] = useState(3);

  // Floating Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetObject: any | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    targetObject: null
  });

  // AI Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Global click & Escape listener to close context menu
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !fabricLoaded || !fabric) return;
    
    // Initialize Fabric.js Canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: backgroundColor,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });
    
    // Disable browser context menu on canvas
    const canvasElement = initCanvas.getElement();
    if (canvasElement) {
      canvasElement.oncontextmenu = (e: any) => e.preventDefault();
    }
    const upperCanvasEl = initCanvas.upperCanvasEl;
    if (upperCanvasEl) {
      upperCanvasEl.oncontextmenu = (e: any) => e.preventDefault();
    }
    const wrapperEl = initCanvas.wrapperEl;
    if (wrapperEl) {
      wrapperEl.oncontextmenu = (e: any) => e.preventDefault();
    }

    // Right click context menu handler
    const handleCanvasContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = initCanvas.findTarget(e);
      if (target) {
        initCanvas.setActiveObject(target);
        initCanvas.requestRenderAll();
        setSelectedObject(target);
      }

      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        targetObject: target || initCanvas.getActiveObject() || null,
      });
    };

    if (upperCanvasEl) {
      upperCanvasEl.addEventListener('contextmenu', handleCanvasContextMenu);
    } else if (wrapperEl) {
      wrapperEl.addEventListener('contextmenu', handleCanvasContextMenu);
    }
    
    setCanvas(initCanvas);

    // Initial Load from Session Storage
    const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const state = JSON.parse(savedSession);
        if (state.canvasSize) setCanvasSize(state.canvasSize);
        if (state.backgroundColor) setBackgroundColor(state.backgroundColor);
        if (state.projectName) setProjectName(state.projectName);
        if (state.guides) setGuides(state.guides);
        if (state.currentProjectId) setCurrentProjectId(state.currentProjectId);
        if (state.lastSavedTime) setLastSavedTime(state.lastSavedTime);
        
        if (state.canvasJSON) {
          initCanvas.loadFromJSON(state.canvasJSON, () => {
            initCanvas.requestRenderAll();
            // Important: Don't trigger auto-save during initial load
            isInitialLoadRef.current = false;
            setSaveToast({ message: 'กู้คืนข้อมูลล่าสุดของคุณเรียบร้อยแล้ว', type: 'success' });
            setTimeout(() => setSaveToast(null), 3000);
          });
        } else {
          isInitialLoadRef.current = false;
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        isInitialLoadRef.current = false;
      }
    } else {
      isInitialLoadRef.current = false;
    }
    
    const updateSelection = () => {
      const activeObj = initCanvas.getActiveObject();
      if (activeObj) {
        setSelectedObject(activeObj);
        setIsLocked(!activeObj.selectable);
        
        // Update local state based on selection
        if (activeObj.fill && typeof activeObj.fill === 'string') {
          setFillColor(activeObj.fill);
        } else {
          setFillColor('transparent');
        }
        
        if (activeObj.stroke && typeof activeObj.stroke === 'string') {
          setStrokeColor(activeObj.stroke);
        } else {
          setStrokeColor('transparent');
        }
        
        setStrokeWidth(activeObj.strokeWidth || 0);
        setOpacity(activeObj.opacity ?? 1);
        
        if ('rx' in activeObj && typeof (activeObj as any).rx === 'number') {
          setCornerRadius((activeObj as any).rx);
        }

        if (activeObj.shadow) {
          setShadowEnabled(true);
          const sh = activeObj.shadow as any;
          if (sh.color) setShadowColor(sh.color);
          if (sh.blur) setShadowBlur(sh.blur);
          if (sh.offsetX) setShadowOffsetX(sh.offsetX);
          if (sh.offsetY) setShadowOffsetY(sh.offsetY);
        } else {
          setShadowEnabled(false);
        }
        
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox') {
          const textObj = activeObj as any;
          if (textObj.fontSize) setFontSize(textObj.fontSize);
          if (textObj.fontFamily) setFontFamily(textObj.fontFamily);
          if (textObj.fontWeight) setFontWeight(textObj.fontWeight as string);
          if (textObj.fontStyle) setFontStyle(textObj.fontStyle);
          if (textObj.textAlign) setTextAlign(textObj.textAlign);
          if (textObj.underline !== undefined) setUnderline(textObj.underline);
        }
      } else {
        setSelectedObject(null);
      }
    };
    
    initCanvas.on('selection:created', updateSelection);
    initCanvas.on('selection:updated', updateSelection);
    initCanvas.on('selection:cleared', updateSelection);
    initCanvas.on('object:modified', updateSelection);

    // Double click to ungroup and directly edit child objects
    initCanvas.on('mouse:dblclick', (e: any) => {
      const target = e.target;
      if (target && target.type === 'group') {
        if (typeof (target as any).toActiveSelection === 'function') {
          const sel = (target as any).toActiveSelection();
          initCanvas.setActiveObject(sel);
          initCanvas.requestRenderAll();
        }
      }
    });
    
    // Snap to grid movement handler
    initCanvas.on('object:moving', (e: any) => {
      if (!snapToGridRef.current) return;
      const obj = e.target;
      if (!obj) return;
      const grid = gridSizeRef.current;
      const snapThresh = snapToleranceRef.current || 10;

      // Snap left
      const nearestX = Math.round(obj.left / grid) * grid;
      if (Math.abs(obj.left - nearestX) <= snapThresh) {
        obj.set({ left: nearestX });
      }

      // Snap top
      const nearestY = Math.round(obj.top / grid) * grid;
      if (Math.abs(obj.top - nearestY) <= snapThresh) {
        obj.set({ top: nearestY });
      }
    });

    // Real-time mouse pointer tracker for rulers
    initCanvas.on('mouse:move', (e: any) => {
      const pointer = initCanvas.getPointer(e.e);
      if (pointer) {
        setMouseCanvasPos({ x: Math.round(pointer.x), y: Math.round(pointer.y) });
      }
    });

    initCanvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = zoomLevelRef.current || 1;
      zoom *= 0.999 ** delta;
      if (zoom > 3) zoom = 3;
      if (zoom < 0.15) zoom = 0.15;
      
      setZoomLevel(Math.round(zoom * 100) / 100);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    initCanvas.on('mouse:out', () => {
      setMouseCanvasPos(null);
    });
    
    return () => {
      if (persistenceTimeoutRef.current) {
        clearTimeout(persistenceTimeoutRef.current);
      }
      initCanvas.dispose();
    };
  }, [fabricLoaded]);

  useEffect(() => {
    if (canvas) {
      canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
      canvas.backgroundColor = backgroundColor;
      canvas.requestRenderAll();
    }
  }, [canvasSize, backgroundColor, canvas]);

  useEffect(() => {
    if (!canvas) return;
    
    const onModified = () => { saveHistory(); };
    
    canvas.on('object:modified', onModified);
    canvas.on('object:added', onModified);
    canvas.on('object:removed', onModified);
    
    return () => {
      canvas.off('object:modified', onModified);
      canvas.off('object:added', onModified);
      canvas.off('object:removed', onModified);
    };
  }, [canvas, backgroundColor]);

  const handlePropertyChange = async (property: string, value: any) => {
    if (!canvas || !selectedObject) return;
    
    if (property === 'fontFamily') {
      await ensureGoogleFontLoaded(value);
    }

    if (property === 'rx' || property === 'ry') {
      selectedObject.set('rx', value);
      selectedObject.set('ry', value);
      setCornerRadius(value);
    } else {
      selectedObject.set(property as any, value);
    }

    canvas.requestRenderAll();
    
    // Update local state
    if (property === 'fill') setFillColor(value);
    if (property === 'stroke') setStrokeColor(value);
    if (property === 'strokeWidth') setStrokeWidth(value);
    if (property === 'opacity') setOpacity(value);
    if (property === 'fontFamily') setFontFamily(value);
    if (property === 'fontWeight') setFontWeight(value);
    if (property === 'fontStyle') setFontStyle(value);
    if (property === 'textAlign') setTextAlign(value);
    if (property === 'underline') setUnderline(value);
  };

  const applyShadow = (enabled: boolean, color = shadowColor, blur = shadowBlur, ox = shadowOffsetX, oy = shadowOffsetY) => {
    if (!canvas || !selectedObject) return;
    setShadowEnabled(enabled);
    if (enabled) {
      const sh = new fabric.Shadow({
        color: color,
        blur: blur,
        offsetX: ox,
        offsetY: oy
      });
      selectedObject.set('shadow', sh);
    } else {
      selectedObject.set('shadow', null);
    }
    canvas.requestRenderAll();
  };

  const saveHistory = () => {
    if (!canvas || isHistoryUpdateRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    const history = historyRef.current;
    let index = historyIndexRef.current;
    
    if (index >= 0 && history[index] === json) return;
    
    history.splice(index + 1);
    history.push(json);
    historyIndexRef.current = history.length - 1;
    
    if (history.length > 50) {
      history.shift();
      historyIndexRef.current--;
    }

    // Debounced persist to session storage
    if (!isInitialLoadRef.current) {
      if (persistenceTimeoutRef.current) clearTimeout(persistenceTimeoutRef.current);
      persistenceTimeoutRef.current = setTimeout(() => {
        persistToSession();
      }, 1000);
    }
  };

  const persistToSession = () => {
    if (!canvas || isInitialLoadRef.current) return;
    try {
      const state = {
        canvasJSON: canvas.toJSON(),
        canvasSize,
        backgroundColor,
        projectName,
        guides,
        currentProjectId,
        lastSavedTime,
        timestamp: Date.now()
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Session persistence warning:', err);
    }
  };

  // Sync session when metadata changes
  useEffect(() => {
    if (canvas && !isInitialLoadRef.current) {
      persistToSession();
    }
  }, [canvasSize, backgroundColor, projectName, guides, canvas]);

  const undo = () => {
    if (!canvas || historyIndexRef.current <= 0) return;
    isHistoryUpdateRef.current = true;
    historyIndexRef.current--;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.requestRenderAll();
      isHistoryUpdateRef.current = false;
    });
  };

  const redo = () => {
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryUpdateRef.current = true;
    historyIndexRef.current++;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.requestRenderAll();
      isHistoryUpdateRef.current = false;
    });
  };

  const copySelected = async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    activeObject.clone().then((cloned: any) => {
      clipboardRef.current = cloned;
    });
  };

  const pasteClipboard = async () => {
    if (!canvas || !clipboardRef.current) return;
    clipboardRef.current.clone().then((clonedObj: any) => {
      canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 20,
        top: clonedObj.top + 20,
        evented: true,
      });
      if (clonedObj.type === 'activeSelection') {
        clonedObj.canvas = canvas;
        (clonedObj as any).forEachObject((obj: any) => {
          canvas.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }
      clipboardRef.current.top += 20;
      clipboardRef.current.left += 20;
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
      saveHistory();
    });
  };

  // Grouping & Ungrouping Engine (100% Reliable)
  const groupObjects = () => {
    if (!canvas || !fabric) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (
      activeObj.type === 'activeSelection' || 
      activeObj.type === 'activeselection' || 
      (activeObj as any)._objects?.length > 1
    ) {
      if (typeof (activeObj as any).toGroup === 'function') {
        const group = (activeObj as any).toGroup();
        group.set({ subTargetCheck: true, interactive: true });
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        saveHistory();
        return;
      }
      
      const activeSelection = activeObj as any;
      const objects = activeSelection.getObjects ? [...activeSelection.getObjects()] : [...activeSelection._objects];
      if (objects && objects.length > 0) {
        canvas.discardActiveObject();
        const group = new fabric.Group(objects, { subTargetCheck: true, interactive: true });
        objects.forEach((obj: any) => canvas.remove(obj));
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        saveHistory();
      }
    }
  };

  const ungroupObjects = (targetGroup?: any) => {
    if (!canvas || !fabric) return;
    const activeObj = targetGroup || canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') return;

    if (typeof (activeObj as any).toActiveSelection === 'function') {
      const sel = (activeObj as any).toActiveSelection();
      canvas.setActiveObject(sel);
      canvas.requestRenderAll();
      saveHistory();
      return;
    }

    const group = activeObj as any;
    const objects = group.getObjects ? [...group.getObjects()] : [...group._objects];
    if (objects && objects.length > 0) {
      canvas.remove(group);
      objects.forEach((obj: any) => {
        obj.set({
          selectable: true,
          evented: true,
        });
        canvas.add(obj);
      });
      const activeSelection = new fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(activeSelection);
      canvas.requestRenderAll();
      saveHistory();
    }
  };

  const groupSelection = groupObjects;
  const ungroupSelection = ungroupObjects;
  const paste = pasteClipboard;

  const cloneSelected = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.clone().then((cloned: any) => {
      canvas.discardActiveObject();
      cloned.set({
        left: cloned.left! + 20,
        top: cloned.top! + 20,
        evented: true,
      });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        (cloned as any).forEachObject((obj: any) => {
          canvas.add(obj);
        });
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      saveHistory();
    });
  };

  const toggleLockSelected = () => {
    if (!canvas || !selectedObject) return;
    const nextLocked = !isLocked;
    selectedObject.set({
      selectable: !nextLocked,
      evented: !nextLocked,
      hasControls: !nextLocked,
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockRotation: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
    });
    setIsLocked(nextLocked);
    if (nextLocked) canvas.discardActiveObject();
    canvas.requestRenderAll();
    saveHistory();
  };

  // Quick Alignment Methods
  const alignObject = (position: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'center-both') => {
    if (!canvas || !selectedObject) return;
    
    // For ActiveSelection, align relative to canvas
    if (selectedObject.type === 'activeSelection' || selectedObject.type === 'activeselection') {
      selectedObject.set({ originX: 'center', originY: 'center' });
      switch (position) {
        case 'center-h': canvas.centerObjectH(selectedObject); break;
        case 'center-v': canvas.centerObjectV(selectedObject); break;
        case 'center-both': canvas.centerObject(selectedObject); break;
        case 'left': selectedObject.set('left', selectedObject.width / 2 + 20); break;
        case 'right': selectedObject.set('left', canvasSize.width - selectedObject.width / 2 - 20); break;
        case 'top': selectedObject.set('top', selectedObject.height / 2 + 20); break;
        case 'bottom': selectedObject.set('top', canvasSize.height - selectedObject.height / 2 - 20); break;
      }
    } else {
      const boundWidth = selectedObject.getScaledWidth ? selectedObject.getScaledWidth() : (selectedObject.width || 100);
      const boundHeight = selectedObject.getScaledHeight ? selectedObject.getScaledHeight() : (selectedObject.height || 100);

      switch (position) {
        case 'left':
          selectedObject.set('left', 20);
          break;
        case 'center-h':
          canvas.centerObjectH(selectedObject);
          break;
        case 'right':
          selectedObject.set('left', canvasSize.width - boundWidth - 20);
          break;
        case 'top':
          selectedObject.set('top', 20);
          break;
        case 'center-v':
          canvas.centerObjectV(selectedObject);
          break;
        case 'bottom':
          selectedObject.set('top', canvasSize.height - boundHeight - 20);
          break;
        case 'center-both':
          canvas.centerObject(selectedObject);
          break;
      }
    }
    selectedObject.setCoords();
    canvas.requestRenderAll();
    saveHistory();
  };

  // Guide & Ruler Helpers
  const addGuide = (type: 'h' | 'v', pos: number) => {
    const newGuide: GuideLine = {
      id: `guide-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      pos,
      color: '#06b6d4'
    };
    setGuides(prev => [...prev, newGuide]);
  };

  const removeGuide = (id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id));
  };

  const addCenterGuides = () => {
    const centerX = Math.round(canvasSize.width / 2);
    const centerY = Math.round(canvasSize.height / 2);
    setGuides(prev => [
      ...prev.filter(g => g.id !== 'guide-center-x' && g.id !== 'guide-center-y'),
      { id: 'guide-center-x', type: 'v', pos: centerX, color: '#3b82f6' },
      { id: 'guide-center-y', type: 'h', pos: centerY, color: '#3b82f6' },
    ]);
  };

  const clearGuides = () => {
    setGuides([]);
  };

  const cycleRulerUnit = () => {
    setRulerUnit(prev => {
      if (prev === 'px') return 'cm';
      if (prev === 'cm') return 'inch';
      return 'px';
    });
  };

  // Selected Object Bounding Box for Rulers
  const selectedBox = selectedObject ? {
    left: selectedObject.left || 0,
    top: selectedObject.top || 0,
    width: typeof selectedObject.getScaledWidth === 'function' ? selectedObject.getScaledWidth() : (selectedObject.width || 0),
    height: typeof selectedObject.getScaledHeight === 'function' ? selectedObject.getScaledHeight() : (selectedObject.height || 0),
  } : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!canvas) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        canvas.discardActiveObject();
        const allObjects = canvas.getObjects().filter(o => o.selectable !== false);
        if (allObjects.length > 0) {
          const selection = new (fabric.ActiveSelection || (fabric as any).ActiveSelection)(allObjects, { canvas });
          canvas.setActiveObject(selection);
          canvas.requestRenderAll();
        }
        return;
      }

      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelectedObject(null);
        return;
      }

      const activeObj = canvas.getActiveObject();
      if (!activeObj) return;

      if ((activeObj.type === 'i-text' || activeObj.type === 'textbox') && (activeObj as any).isEditing) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelected();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        copySelected();
        deleteSelected();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        cloneSelected();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupObjects();
        } else {
          groupObjects();
        }
      }

      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        const step = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case 'ArrowUp':
            activeObj.set('top', activeObj.top - step);
            break;
          case 'ArrowDown':
            activeObj.set('top', activeObj.top + step);
            break;
          case 'ArrowLeft':
            activeObj.set('left', activeObj.left - step);
            break;
          case 'ArrowRight':
            activeObj.set('left', activeObj.left + step);
            break;
        }
        activeObj.setCoords();
        canvas.requestRenderAll();
        saveHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, selectedObject]);

  // Actions for adding element types
  const addTextPreset = (type: 'h1' | 'h2' | 'body' | 'callout') => {
    if (!canvas) return;
    let textObj: any;

    if (type === 'h1') {
      textObj = new fabric.IText('หัวข้อใหญ่ (Main Heading)', {
        left: 100, top: 100, fontFamily: 'Prompt', fill: '#0f172a', fontSize: 44, fontWeight: 'bold'
      });
    } else if (type === 'h2') {
      textObj = new fabric.IText('หัวข้อย่อย (Sub Heading)', {
        left: 100, top: 100, fontFamily: 'Prompt', fill: '#1e293b', fontSize: 28, fontWeight: 'bold'
      });
    } else if (type === 'callout') {
      const bg = new fabric.Rect({
        width: 350, height: 80, rx: 12, ry: 12, fill: '#3b82f6', opacity: 0.15, stroke: '#3b82f6', strokeWidth: 2
      });
      const txt = new fabric.Textbox('ข้อความเน้นสำคัญ (Callout Box)', {
        width: 330, left: 10, top: 20, fontFamily: 'Sarabun', fill: '#1e40af', fontSize: 20, fontWeight: 'bold', textAlign: 'center'
      });
      const grp = new fabric.Group([bg, txt], { left: 100, top: 100 });
      canvas.add(grp);
      canvas.setActiveObject(grp);
      canvas.requestRenderAll();
      return;
    } else {
      textObj = new fabric.IText('เพิ่มรายละเอียดข้อความที่นี่...', {
        left: 100, top: 100, fontFamily: 'Sarabun', fill: '#334155', fontSize: 18
      });
    }

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.requestRenderAll();
  };

  const addShapePreset = (shapeType: 'rect' | 'circle' | 'triangle' | 'star' | 'polygon' | 'line' | 'arrow') => {
    if (!canvas) return;
    let obj: any;

    const baseColor = fillColor === 'transparent' ? '#3b82f6' : fillColor;

    switch (shapeType) {
      case 'rect':
        obj = new fabric.Rect({
          left: 100, top: 100, width: 120, height: 120, rx: cornerRadius, ry: cornerRadius, fill: baseColor
        });
        break;
      case 'circle':
        obj = new fabric.Circle({
          left: 100, top: 100, radius: 60, fill: baseColor
        });
        break;
      case 'triangle':
        obj = new fabric.Triangle({
          left: 100, top: 100, width: 120, height: 120, fill: baseColor
        });
        break;
      case 'star':
        // 5-point star path
        obj = new fabric.Path('M 50 0 L 63 38 L 100 38 L 69 59 L 82 100 L 50 75 L 18 100 L 31 59 L 0 38 L 37 38 Z', {
          left: 100, top: 100, fill: '#f59e0b', scaleX: 1.2, scaleY: 1.2
        });
        break;
      case 'polygon':
        // Hexagon
        obj = new fabric.Polygon([
          { x: 50, y: 0 }, { x: 100, y: 25 }, { x: 100, y: 75 },
          { x: 50, y: 100 }, { x: 0, y: 75 }, { x: 0, y: 25 }
        ], {
          left: 100, top: 100, fill: baseColor
        });
        break;
      case 'line':
        obj = new fabric.Line([0, 0, 200, 0], {
          left: 100, top: 100, stroke: baseColor === 'transparent' ? '#334155' : baseColor, strokeWidth: 4
        });
        break;
      case 'arrow':
        // Arrow shape
        const line = new fabric.Line([0, 20, 140, 20], { stroke: baseColor, strokeWidth: 6 });
        const head = new fabric.Triangle({
          left: 135, top: 20, width: 24, height: 24, angle: 90, fill: baseColor, originX: 'center', originY: 'center'
        });
        obj = new fabric.Group([line, head], { left: 100, top: 100 });
        break;
      default:
        return;
    }

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  };

  // Add Infographic Kit Elements
  const addInfographicComponent = (type: 'stat-card' | 'badge-num' | 'progress-bar' | 'alert-bar') => {
    if (!canvas) return;

    if (type === 'stat-card') {
      const cardBg = new fabric.Rect({
        width: 220, height: 130, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 15, offsetY: 4 })
      });
      const topBar = new fabric.Rect({ width: 220, height: 8, rx: 4, ry: 4, fill: '#10b981' });
      const numText = new fabric.Textbox('98.5%', {
        left: 110, top: 25, width: 200, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 36, fontWeight: 'bold', fill: '#0f172a'
      });
      const labelText = new fabric.Textbox('อัตราความพึงพอใจลูกค้า', {
        left: 110, top: 78, width: 200, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 14, fill: '#64748b'
      });
      const grp = new fabric.Group([cardBg, topBar, numText, labelText], { left: 100, top: 100 });
      canvas.add(grp);
      canvas.setActiveObject(grp);
    } else if (type === 'badge-num') {
      const circle = new fabric.Circle({ radius: 28, fill: '#3b82f6' });
      const num = new fabric.IText('1', {
        left: 28, top: 28, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 28, fontWeight: 'bold', fill: '#ffffff'
      });
      const grp = new fabric.Group([circle, num], { left: 100, top: 100 });
      canvas.add(grp);
      canvas.setActiveObject(grp);
    } else if (type === 'progress-bar') {
      const bgBar = new fabric.Rect({ width: 300, height: 24, rx: 12, ry: 12, fill: '#e2e8f0' });
      const fillBar = new fabric.Rect({ width: 225, height: 24, rx: 12, ry: 12, fill: '#06b6d4' });
      const txt = new fabric.IText('75%', {
        left: 285, top: 12, originX: 'right', originY: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#ffffff'
      });
      const grp = new fabric.Group([bgBar, fillBar, txt], { left: 100, top: 100 });
      canvas.add(grp);
      canvas.setActiveObject(grp);
    } else if (type === 'alert-bar') {
      const bg = new fabric.Rect({ width: 500, height: 60, rx: 12, ry: 12, fill: '#fef2f2', stroke: '#ef4444', strokeWidth: 2 });
      const badge = new fabric.Rect({ width: 120, height: 36, left: 12, top: 12, rx: 8, ry: 8, fill: '#ef4444' });
      const badgeTxt = new fabric.IText('ประกาศด่วน', { left: 72, top: 30, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#ffffff' });
      const bodyTxt = new fabric.Textbox('ข้อความแจ้งเตือนภัยหรือข้อมูลสำคัญประเด็นเร่งด่วน', { left: 145, top: 20, width: 340, fontFamily: 'Sarabun', fontSize: 15, fill: '#991b1b', fontWeight: 'bold' });
      const grp = new fabric.Group([bg, badge, badgeTxt, bodyTxt], { left: 100, top: 100 });
      canvas.add(grp);
      canvas.setActiveObject(grp);
    }

    canvas.requestRenderAll();
  };

  const addTableComponent = (rowsCount: number, colsCount: number) => {
    if (!canvas || !fabric) return;

    const colWidth = 120;
    const rowHeight = 40;

    const elements: any[] = [];

    for (let r = 0; r < rowsCount; r++) {
      for (let c = 0; c < colsCount; c++) {
        const isHeader = r === 0;
        const cellBgColor = isHeader ? '#1e293b' : (r % 2 === 0 ? '#f8fafc' : '#ffffff');
        const cellTextColor = isHeader ? '#ffffff' : '#0f172a';
        
        // Background rectangle
        const rect = new fabric.Rect({
          left: c * colWidth,
          top: r * rowHeight,
          width: colWidth,
          height: rowHeight,
          fill: cellBgColor,
          stroke: '#cbd5e1',
          strokeWidth: 1,
        });
        
        // Cell text
        const placeholderText = isHeader ? `หัวข้อ ${c + 1}` : `ข้อมูล ${r},${c + 1}`;
        const text = new fabric.Textbox(placeholderText, {
          left: c * colWidth + 5,
          top: r * rowHeight + (rowHeight - 16) / 2, // Centered vertically
          width: colWidth - 10,
          fontFamily: 'Sarabun',
          fontSize: 12,
          fontWeight: isHeader ? 'bold' : 'normal',
          fill: cellTextColor,
          textAlign: 'center',
          editable: true,
        });

        elements.push(rect);
        elements.push(text);
      }
    }

    const tableGroup = new fabric.Group(elements, {
      left: 150,
      top: 150,
      subTargetCheck: true,
      interactive: true,
    } as any);

    canvas.add(tableGroup);
    canvas.setActiveObject(tableGroup);
    canvas.requestRenderAll();
  };

  // Comprehensive SVG Vector Icon Data Dictionary
  const SVG_ICON_DATA: Record<string, { path: string; label: string; defaultColor: string; category: 'gov' | 'tech' | 'finance' | 'comm' | 'symbols' | 'safety' }> = {
    // 🏛️ หมวดราชการ & สารบรรณ & นิติการ (Government & Office)
    garuda: {
      path: 'M 12 2 C 10.5 2 9.5 3 9 4 C 7.5 3.5 5 4.5 4 6.5 C 5.5 7 7 6.5 8 7 C 6.5 9 5 12 6 15 C 7.5 13.5 9 13.5 10 14 C 9 16 9 18 10 20 L 12 22 L 14 20 C 15 18 15 16 14 14 C 15 13.5 16.5 13.5 18 15 C 19 12 17.5 9 16 7 C 17 6.5 18.5 7 20 6.5 C 19 4.5 16.5 3.5 15 4 C 14.5 3 13.5 2 12 2 Z M 12 6 C 12.8 6 13.5 6.7 13.5 7.5 C 13.5 8.3 12.8 9 12 9 C 11.2 9 10.5 8.3 10.5 7.5 C 10.5 6.7 11.2 6 12 6 Z',
      label: 'ตราสัญลักษณ์ราชการ (Official Emblem)',
      defaultColor: '#b45309',
      category: 'gov'
    },
    signature: {
      path: 'M 3 17.25 V 21 H 6.75 L 17.81 9.94 L 14.06 6.19 L 3 17.25 Z M 20.71 7.04 C 21.1 6.65 21.1 6.02 20.71 5.63 L 18.37 3.29 C 17.98 2.9 17.35 2.9 16.96 3.29 L 15.13 5.12 L 18.88 8.87 L 20.71 7.04 Z M 2 22 H 22 V 24 H 2 Z',
      label: 'ลายเซ็น/ลงนาม (Signature Pen)',
      defaultColor: '#1d4ed8',
      category: 'gov'
    },
    scale: {
      path: 'M 12 2 L 1 7 L 12 12 L 23 7 L 12 2 Z M 11 14.08 V 20 H 7 V 22 H 17 V 20 H 13 V 14.08 C 16.78 13.62 19.82 10.82 20.72 7.08 L 12 11 L 3.28 7.08 C 4.18 10.82 7.22 13.62 11 14.08 Z',
      label: 'ตราชั่งความยุติธรรม (Justice Law Scale)',
      defaultColor: '#d97706',
      category: 'gov'
    },
    building: {
      path: 'M 12 3 L 2 9 V 21 H 22 V 9 L 12 3 Z M 6 19 H 4 V 15 H 6 V 19 Z M 6 13 H 4 V 9.78 L 12 5 L 20 9.78 V 13 H 18 V 19 H 16 V 13 H 14 V 19 H 10 V 13 H 8 V 19 H 6 Z M 10 11 H 8 V 9 H 10 V 11 Z M 16 11 H 14 V 9 H 16 V 11 Z',
      label: 'อาคารสำนักงาน/กระทรวง (Office Building)',
      defaultColor: '#475569',
      category: 'gov'
    },
    printer: {
      path: 'M 19 8 H 5 C 3.34 8 2 9.34 2 11 V 17 H 6 V 21 H 18 V 17 H 22 V 11 C 22 9.34 20.66 8 19 8 Z M 16 19 H 8 V 14 H 16 V 19 Z M 19 12 C 18.45 12 18 11.55 18 11 C 18 10.45 18.45 10 19 10 C 19.55 10 20 10.45 20 11 C 20 11.55 19.55 12 19 12 Z M 18 3 H 6 V 7 H 18 V 3 Z',
      label: 'เครื่องพิมพ์เอกสาร (Printer)',
      defaultColor: '#0284c7',
      category: 'gov'
    },
    fileText: {
      path: 'M 14 2 H 6 C 4.9 2 4.01 2.9 4.01 4 L 4 20 C 4 21.1 4.89 22 5.99 22 H 18 C 19.1 22 20 21.1 20 20 V 8 L 14 2 Z M 16 18 H 8 V 16 H 16 V 18 Z M 16 14 H 8 V 12 H 16 V 14 Z M 13 9 V 3.5 L 18.5 9 H 13 Z',
      label: 'เอกสาร/หนังสือราชการ (File)',
      defaultColor: '#0284c7',
      category: 'gov'
    },
    folder: {
      path: 'M 10 4 H 4 C 2.9 4 2.01 4.9 2.01 6 L 2 18 C 2 19.1 2.9 20 4 20 H 20 C 21.1 20 22 19.1 22 18 V 8 C 22 6.9 21.1 6 20 6 H 12 L 10 4 Z',
      label: 'แฟ้มทะเบียนเอกสาร (Folder)',
      defaultColor: '#d97706',
      category: 'gov'
    },
    idCard: {
      path: 'M 20 4 H 4 C 2.89 4 2.01 4.89 2.01 6 L 2 18 C 2 19.11 2.89 20 4 20 H 20 C 21.11 20 22 19.11 22 18 V 6 C 22 4.89 21.11 4 20 4 Z M 20 18 H 4 V 12 H 20 V 18 Z M 20 8 H 4 V 6 H 20 V 8 Z M 6 14 H 10 V 16 H 6 V 14 Z M 12 14 H 18 V 16 H 12 V 14 Z',
      label: 'บัตรประจำตัว/สิทธิ์ (ID Card)',
      defaultColor: '#4338ca',
      category: 'gov'
    },
    users: {
      path: 'M 16 11 C 17.66 11 18.99 9.66 18.99 8 C 18.99 6.34 17.66 5 16 5 C 14.34 5 13 6.34 13 8 C 13 9.66 14.34 11 16 11 Z M 8 11 C 9.66 11 10.99 9.66 10.99 8 C 10.99 6.34 9.66 5 8 5 C 6.34 5 5 6.34 5 8 C 5 9.66 6.34 11 8 11 Z M 8 13 C 5.67 13 1 14.17 1 16.5 V 19 H 15 V 16.5 C 15 14.17 10.33 13 8 13 Z M 16 13 C 15.71 13 15.38 13.02 15.03 13.05 C 16.19 13.89 17 15.02 17 16.5 V 19 H 23 V 16.5 C 23 14.17 18.33 13 16 13 Z',
      label: 'คณะทำงาน/บุคลากร (Users)',
      defaultColor: '#4f46e5',
      category: 'gov'
    },
    award: {
      path: 'M 12 15 C 15.87 15 19 11.87 19 8 C 19 4.13 15.87 1 12 1 C 8.13 1 5 4.13 5 8 C 5 11.87 8.13 15 12 15 Z M 12 3 C 14.76 3 17 5.24 17 8 C 17 10.76 14.76 13 12 13 C 9.24 13 7 10.76 7 8 C 7 5.24 9.24 3 12 3 Z M 15.41 16.59 L 12 14.5 L 8.59 16.59 L 9.63 20.61 L 6.27 22.95 L 7.55 19.03 L 4.18 16.68 L 8.32 16.41 L 9.68 12.5 L 11.04 16.41 L 15.18 16.68 L 11.81 19.03 L 13.09 22.95 L 9.73 20.61 Z',
      label: 'เกียรติบัตร/รางวัล (Award)',
      defaultColor: '#d97706',
      category: 'gov'
    },

    // 💻 หมวดไอที & ดิจิทัล & เทคโนโลยี (Tech & Digital)
    cpu: {
      path: 'M 9 2 V 4 H 15 V 2 H 17 V 4 H 20 C 21.1 4 22 4.9 22 6 V 9 H 24 V 11 H 22 V 13 H 24 V 15 H 22 V 18 C 22 19.1 21.1 20 20 20 H 17 V 22 H 15 V 20 H 9 V 22 H 7 V 20 H 4 C 2.9 20 2 19.1 2 18 V 15 H 0 V 13 H 2 V 11 H 0 V 9 H 2 V 6 C 2 4.9 2.9 4 4 4 H 7 V 2 H 9 Z M 6 6 V 18 H 18 V 6 H 6 Z M 8 8 H 16 V 16 H 8 V 8 Z',
      label: 'ชิป AI / ประมวลผล (CPU / AI)',
      defaultColor: '#2563eb',
      category: 'tech'
    },
    laptop: {
      path: 'M 20 18 C 21.1 18 22 17.1 22 16 V 6 C 22 4.9 21.1 4 20 4 H 4 C 2.9 4 2 4.9 2 6 V 16 C 2 17.1 2.9 18 4 18 H 0 V 20 H 24 V 18 H 20 Z M 4 6 H 20 V 16 H 4 V 6 Z',
      label: 'คอมพิวเตอร์ (Laptop)',
      defaultColor: '#0284c7',
      category: 'tech'
    },
    smartphone: {
      path: 'M 17 1.01 L 7 1 C 5.9 1 5 1.9 5 3 V 21 C 5 22.1 5.9 23 7 23 H 17 C 18.1 23 19 22.1 19 21 V 3 C 19 1.9 18.1 1.01 17 1.01 Z M 17 19 H 7 V 5 H 17 V 19 Z',
      label: 'สมาร์ทโฟน/แอป (Smartphone)',
      defaultColor: '#4f46e5',
      category: 'tech'
    },
    cloud: {
      path: 'M 19.35 10.04 C 18.67 6.59 15.64 4 12 4 C 9.11 4 6.6 5.64 5.35 8.04 C 2.34 8.36 0 10.91 0 14 C 0 17.31 2.69 20 6 20 H 19 C 21.76 20 24 17.76 24 15 C 24 12.36 21.95 10.22 19.35 10.04 Z',
      label: 'คลาวด์/สำรองข้อมูล (Cloud)',
      defaultColor: '#0ea5e9',
      category: 'tech'
    },
    database: {
      path: 'M 12 2 C 6.48 2 2 3.79 2 6 V 18 C 2 20.21 6.48 22 12 22 C 17.52 22 22 20.21 22 18 V 6 C 22 3.79 17.52 2 12 2 Z M 12 4 C 16.42 4 20 5.34 20 6 C 20 6.66 16.42 8 12 8 C 7.58 8 4 6.66 4 6 C 4 5.34 7.58 4 12 4 Z M 20 12 C 20 12.66 16.42 14 12 14 C 7.58 14 4 12.66 4 12 V 9.35 C 5.92 10.36 8.78 11 12 11 C 15.22 11 18.08 10.36 20 9.35 V 12 Z M 20 18 C 20 18.66 16.42 20 12 20 C 7.58 20 4 18.66 4 18 V 15.35 C 5.92 16.36 8.78 17 12 17 C 15.22 17 18.08 16.36 20 15.35 V 18 Z',
      label: 'ฐานข้อมูล/ระบบคลัง (Database)',
      defaultColor: '#6366f1',
      category: 'tech'
    },
    wifi: {
      path: 'M 12 4 C 7.31 4 3.07 5.9 0 8.98 L 12 21 L 24 8.98 C 20.93 5.9 16.69 4 12 4 Z M 2.92 9.07 C 5.51 6.54 9.01 5 12 5 C 14.99 5 18.49 6.54 21.08 9.07 L 12 18.15 L 2.92 9.07 Z',
      label: 'เครือข่าย/WiFi (Network)',
      defaultColor: '#10b981',
      category: 'tech'
    },
    lock: {
      path: 'M 18 8 H 17 V 6 C 17 3.24 14.76 1 12 1 C 9.24 1 7 3.24 7 6 V 8 H 6 C 4.9 8 4 8.9 4 10 V 20 C 4 21.1 4.9 22 6 22 H 18 C 19.1 22 20 21.1 20 20 V 10 C 20 8.9 19.1 8 18 8 Z M 9 6 C 9 4.34 10.34 3 12 3 C 13.66 3 15 4.34 15 6 V 8 H 9 V 6 Z M 12 17 C 10.9 17 10 16.1 10 15 C 10 13.9 10.9 13 12 13 C 13.1 13 14 13.9 14 15 C 14 16.1 13.1 17 12 17 Z',
      label: 'ความปลอดภัย/รหัสผ่าน (Lock)',
      defaultColor: '#475569',
      category: 'tech'
    },
    qrCode: {
      path: 'M 3 3 H 9 V 9 H 3 V 3 Z M 5 5 V 7 H 7 V 5 H 5 Z M 3 15 H 9 V 21 H 3 V 15 Z M 5 17 V 19 H 7 V 17 H 5 Z M 15 3 H 21 V 9 H 15 V 3 Z M 17 5 V 7 H 19 V 5 H 17 Z M 13 13 H 15 V 15 H 13 V 13 Z M 15 15 H 17 V 17 H 15 V 15 Z M 17 13 H 19 V 15 H 17 V 13 Z M 19 15 H 21 V 17 H 19 V 15 Z M 13 17 H 15 V 19 H 13 V 17 Z M 15 19 H 17 V 21 H 15 V 19 Z M 17 17 H 19 V 19 H 17 V 17 Z M 19 19 H 21 V 21 H 19 V 19 Z',
      label: 'คิวอาร์โค้ด (QR Code)',
      defaultColor: '#0f172a',
      category: 'tech'
    },

    // 📊 หมวดสถิติ & การเงิน & ตัวชี้วัด (Finance & Stats)
    barChart: {
      path: 'M 5 9.2 H 3 V 19 H 5 V 9.2 Z M 10.6 5 H 8.6 V 19 H 10.6 V 5 Z M 16.2 13 H 14.2 V 19 H 16.2 V 13 Z M 21.8 2 H 19.8 V 19 H 21.8 V 2 Z M 1 21 H 23 V 23 H 1 V 21 Z',
      label: 'กราฟแท่งสถิติ (Bar Chart)',
      defaultColor: '#2563eb',
      category: 'finance'
    },
    pieChart: {
      path: 'M 11 2 V 11 H 20 C 20 6.03 15.97 2 11 2 Z M 9 4.08 C 5.05 4.56 2 7.92 2 12 C 2 16.42 5.58 20 10 20 C 14.08 20 17.44 16.95 17.92 13 H 9 V 4.08 Z',
      label: 'กราฟวงกลมสัดส่วน (Pie Chart)',
      defaultColor: '#8b5cf6',
      category: 'finance'
    },
    trendingUp: {
      path: 'M 16 6 L 18.29 8.29 L 13.41 13.17 L 9.41 9.17 L 2 16.59 L 3.41 18 L 9.41 12 L 13.41 16 L 19.71 9.71 L 22 12 V 6 H 16 Z',
      label: 'สถิติเติบโต/แนวโน้ม (Trending Up)',
      defaultColor: '#059669',
      category: 'finance'
    },
    coins: {
      path: 'M 12 2 C 6.48 2 2 3.34 2 5 C 2 6.66 6.48 8 12 8 C 17.52 8 22 6.66 22 5 C 22 3.34 17.52 2 12 2 Z M 2 7.5 V 10.5 C 2 12.16 6.48 13.5 12 13.5 C 17.52 13.5 22 12.16 22 10.5 V 7.5 C 20.35 9.04 16.46 10 12 10 C 7.54 10 3.65 9.04 2 7.5 Z M 2 13 V 16 C 2 17.66 6.48 19 12 19 C 17.52 19 22 17.66 22 16 V 13 C 20.35 14.54 16.46 15.5 12 15.5 C 7.54 15.5 3.65 14.54 2 13 Z',
      label: 'งบประมาณ/การเงิน (Coins Budget)',
      defaultColor: '#d97706',
      category: 'finance'
    },
    target: {
      path: 'M 12 2 C 6.48 2 2 6.48 2 12 C 2 17.52 6.48 22 12 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 12 2 Z M 12 20 C 7.58 20 4 16.42 4 12 C 4 7.58 7.58 4 12 4 C 16.42 4 20 7.58 20 12 C 20 16.42 16.42 20 12 20 Z M 12 6 C 8.69 6 6 8.69 6 12 C 6 15.31 8.69 18 12 18 C 15.31 18 18 15.31 18 12 C 18 8.69 15.31 6 12 6 Z M 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 Z M 12 10 C 10.9 10 10 10.9 10 12 C 10 13.1 10.9 14 12 14 C 13.1 14 14 13.1 14 12 C 14 10.9 13.1 10 12 10 Z',
      label: 'เป้าหมาย KPI / พันธกิจ',
      defaultColor: '#dc2626',
      category: 'finance'
    },
    zap: {
      path: 'M 7 2 V 13 H 10 V 22 L 17 10 H 13 L 17 2 H 7 Z',
      label: 'รวดเร็ว/ประสิทธิภาพ (Speed Zap)',
      defaultColor: '#eab308',
      category: 'finance'
    },

    // 📢 หมวดการสื่อสาร & ประชาสัมพันธ์ (Communication)
    megaphone: {
      path: 'M 4 8 V 16 H 7 L 13 21 V 3 L 7 8 H 4 Z M 19 12 C 19 9.64 17.65 7.6 15.68 6.57 V 17.43 C 17.65 16.4 19 14.36 19 12 Z M 15.68 1.95 V 4.07 C 19.16 5.3 21.68 8.35 21.68 12 C 21.68 15.65 19.16 18.7 15.68 19.93 V 22.05 C 20.31 20.73 23.68 16.73 23.68 12 C 23.68 7.27 20.31 3.27 15.68 1.95 Z',
      label: 'โทรโข่งประชาสัมพันธ์ (Megaphone)',
      defaultColor: '#ef4444',
      category: 'comm'
    },
    bell: {
      path: 'M 12 22 C 13.1 22 14 21.1 14 20 H 10 C 10 21.1 10.9 22 12 22 Z M 18 16 V 11 C 18 7.93 16.37 5.36 13.5 4.68 V 4 C 13.5 3.17 12.83 2.5 12 2.5 C 11.17 2.5 10.5 3.17 10.5 4 V 4.68 C 7.64 5.36 6 7.92 6 11 V 16 L 4 18 V 19 H 20 V 18 L 18 16 Z',
      label: 'กระดิ่งแจ้งเตือน (Notification Bell)',
      defaultColor: '#f59e0b',
      category: 'comm'
    },
    mail: {
      path: 'M 20 4 H 4 C 2.9 4 2.01 4.9 2.01 6 L 2 18 C 2 19.1 2.9 20 4 20 H 20 C 21.1 20 22 19.1 22 18 V 6 C 22 4.9 21.1 4 20 4 Z M 20 8 L 12 13 L 4 8 V 6 L 12 11 L 20 6 V 8 Z',
      label: 'อีเมล/หนังสือส่ง (Mail)',
      defaultColor: '#4f46e5',
      category: 'comm'
    },
    phone: {
      path: 'M 6.62 10.79 C 8.06 13.62 10.38 15.93 13.21 17.38 L 15.41 15.18 C 15.68 14.91 16.08 14.82 16.43 14.94 C 17.55 15.31 18.76 15.51 20 15.51 C 20.55 15.51 21 15.96 21 16.51 V 20 C 21 20.55 20.55 21 20 21 C 10.61 21 3 13.39 3 4 C 3 3.45 3.45 3 4 3 H 7.5 C 8.05 3 8.5 3.45 8.5 4 C 8.5 5.25 8.7 6.45 9.07 7.57 C 9.18 7.92 9.1 8.31 8.82 8.59 L 6.62 10.79 Z',
      label: 'เบอร์ติดต่อ/สายด่วน (Phone)',
      defaultColor: '#0284c7',
      category: 'comm'
    },
    globe: {
      path: 'M 11.99 2 C 6.47 2 2 6.48 2 12 C 2 17.52 6.47 22 11.99 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 11.99 2 Z M 12 20 C 7.58 20 4 16.42 4 12 C 4 11.53 4.05 11.08 4.14 10.63 C 5.6 10.63 6.94 9.87 7.69 8.68 C 8.31 9.49 9.12 10.15 10.05 10.59 C 9.71 11.45 9.5 12.39 9.5 13.38 C 9.5 14.6 9.84 15.74 10.42 16.71 C 10.9 17.54 11.43 18.84 12 20 Z M 18.92 16 C 18.06 14.93 16.92 14.1 15.6 13.62 C 15.86 12.83 16 11.99 16 11.11 C 16 10.11 15.82 9.16 15.49 8.28 C 17.15 8.91 18.49 10.19 19.26 11.83 C 19.74 13.12 20 14.53 20 16 Z',
      label: 'สากล/เครือข่ายโลก (Globe)',
      defaultColor: '#0284c7',
      category: 'comm'
    },
    mapPin: {
      path: 'M 12 2 C 8.13 2 5 5.13 5 9 C 5 14.25 12 22 12 22 C 12 22 19 14.25 19 9 C 19 5.13 15.87 2 12 2 Z M 12 11.5 C 10.62 11.5 9.5 10.38 9.5 9 C 9.5 7.62 10.62 6.5 12 6.5 C 13.38 6.5 14.5 7.62 14.5 9 C 14.5 10.38 13.38 11.5 12 11.5 Z',
      label: 'สถานที่/พิกัด (Map Pin)',
      defaultColor: '#ef4444',
      category: 'comm'
    },

    // ✨ หมวดสัญลักษณ์ & รีแอคชั่น (Symbols & Reactions)
    checkCircle: {
      path: 'M 12 2 C 6.48 2 2 6.48 2 12 C 2 17.52 6.48 22 12 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 12 2 Z M 10 17 L 5 12 L 6.41 10.59 L 10 14.17 L 17.59 6.58 L 19 8 L 10 17 Z',
      label: 'เครื่องหมายถูกต้อง (Checkmark)',
      defaultColor: '#10b981',
      category: 'symbols'
    },
    xCircle: {
      path: 'M 12 2 C 6.47 2 2 6.47 2 12 C 2 17.53 6.47 22 12 22 C 17.53 22 22 17.53 22 12 C 22 6.47 17.53 2 12 2 Z M 17 15.59 L 15.59 17 L 12 13.41 L 8.41 17 L 7 15.59 L 10.59 12 L 7 8.41 L 8.41 7 L 12 10.59 L 15.59 7 L 17 8.41 L 13.41 12 L 17 15.59 Z',
      label: 'เครื่องหมายกากบาท (Cross)',
      defaultColor: '#ef4444',
      category: 'symbols'
    },
    alert: {
      path: 'M 1 21 H 23 L 12 2 L 1 21 Z M 13 18 H 11 V 16 H 13 V 18 Z M 13 14 H 11 V 10 H 13 V 14 Z',
      label: 'คำเตือน/ระวัง (Alert Triangle)',
      defaultColor: '#f59e0b',
      category: 'symbols'
    },
    info: {
      path: 'M 12 2 C 6.48 2 2 6.48 2 12 C 2 17.52 6.48 22 12 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 12 2 Z M 13 17 H 11 V 11 H 13 V 17 Z M 13 9 H 11 V 7 H 13 V 9 Z',
      label: 'ข้อมูล/แนะนำ (Info Circle)',
      defaultColor: '#3b82f6',
      category: 'symbols'
    },
    lightbulb: {
      path: 'M 9 21 C 9 21.55 9.45 22 10 22 H 14 C 14.55 22 15 21.55 15 21 V 20 H 9 V 21 Z M 12 2 C 8.13 2 5 5.13 5 9 C 5 11.38 6.19 13.47 8 14.74 V 17 C 8 17.55 8.45 18 9 18 H 15 C 15.55 18 16 17.55 16 17 V 14.74 C 17.81 13.47 19 11.38 19 9 C 19 5.13 15.87 2 12 2 Z',
      label: 'ไอเดีย/ความคิดริเริ่ม (Lightbulb)',
      defaultColor: '#eab308',
      category: 'symbols'
    },
    thumbsUp: {
      path: 'M 1 21 H 5 V 9 H 1 V 21 Z M 23 10 C 23 8.9 22.1 8 21 8 H 14.69 L 15.64 3.43 L 15.67 3.11 C 15.67 2.7 15.5 2.32 15.23 2.05 L 14.17 1 L 7.59 7.59 C 7.22 7.95 7 8.45 7 9 V 19 C 7 20.1 7.9 21 9 21 H 18 C 18.83 21 19.54 20.5 19.84 19.78 L 22.86 12.73 C 22.95 12.5 23 12.26 23 12 V 10 Z',
      label: 'เห็นชอบ/อนุมัติ (Thumbs Up)',
      defaultColor: '#10b981',
      category: 'symbols'
    },
    star: {
      path: 'M 12 17.27 L 18.18 21 L 16.54 13.97 L 22 9.24 L 14.81 8.63 L 12 2 L 9.19 8.63 L 2 9.24 L 7.46 13.97 L 5.82 21 L 12 17.27 Z',
      label: 'ดาวเด่น/ความสำคัญ (Star)',
      defaultColor: '#f59e0b',
      category: 'symbols'
    },
    heart: {
      path: 'M 12 21.35 L 10.55 20.03 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 C 9.24 3 10.91 3.81 12 5.09 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.42 22 8.5 C 22 12.28 18.6 15.36 13.45 20.04 L 12 21.35 Z',
      label: 'การบริการด้วยใจ (Heart)',
      defaultColor: '#ec4899',
      category: 'symbols'
    },
    crown: {
      path: 'M 5 16 L 3 5 L 8.5 10 L 12 4 L 15.5 10 L 21 5 L 19 16 H 5 Z M 19 19 C 19 19.55 18.55 20 18 20 H 6 C 5.45 20 5 19.55 5 19 V 18 H 19 V 19 Z',
      label: 'มงกุฎ/เกียรติยศ (Crown)',
      defaultColor: '#eab308',
      category: 'symbols'
    },
    trophy: {
      path: 'M 19 5 H 17 V 3 H 7 V 5 H 5 C 3.9 5 3 5.9 3 7 V 9 C 3 11.21 4.79 13 7 13 H 7.24 C 8.16 14.78 9.94 16 12 16 C 14.06 16 15.84 14.78 16.76 13 H 17 C 19.21 13 21 11.21 21 9 V 7 C 21 5.9 20.1 5 19 5 Z M 5 9 V 7 H 7 V 11 C 5.9 11 5 10.1 5 9 Z M 19 9 C 19 10.1 18.1 11 17 11 V 7 H 19 V 9 Z M 13 18 H 11 V 20 H 7 V 22 H 17 V 20 H 13 V 18 Z',
      label: 'ถ้วยรางวัลชนะเลิศ (Trophy)',
      defaultColor: '#f59e0b',
      category: 'symbols'
    },
    flame: {
      path: 'M 12 23 C 7.03 23 3 18.97 3 14 C 3 10.14 5.43 6.84 9 5.51 C 9.5 8 11 9.5 12.5 10.5 C 13.5 8.5 14 6.5 13 3 C 18 5 21 9 21 14 C 21 18.97 16.97 23 12 23 Z',
      label: 'กระแสนิยม/ไฟลุก (Flame)',
      defaultColor: '#ea580c',
      category: 'symbols'
    },
    rocket: {
      path: 'M 12 2.5 C 12 2.5 7.5 6 7.5 12 C 7.5 15.5 9 18 9 18 L 12 16.5 L 15 18 C 15 18 16.5 15.5 16.5 12 C 16.5 6 12 2.5 12 2.5 Z M 6 12 L 2 15 L 4 19 L 7.5 17.5 C 7 15.5 6.5 13.5 6 12 Z M 18 12 C 17.5 13.5 17 15.5 16.5 17.5 L 20 19 L 22 15 L 18 12 Z M 12 7 C 13.1 7 14 7.9 14 9 C 14 10.1 13.1 11 12 11 C 10.9 11 10 10.1 10 9 C 10 7.9 10.9 7 12 7 Z',
      label: 'เริ่มต้นโครงการ/จรวด (Rocket)',
      defaultColor: '#8b5cf6',
      category: 'symbols'
    },
    sparkles: {
      path: 'M 12 0 L 14.59 9.41 L 24 12 L 14.59 14.59 L 12 24 L 9.41 14.59 L 0 12 L 9.41 9.41 Z',
      label: 'ประกายดาว/ความโดดเด่น',
      defaultColor: '#7c3aed',
      category: 'symbols'
    },
    clock: {
      path: 'M 11.99 2 C 6.47 2 2 6.48 2 12 C 2 17.52 6.47 22 11.99 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 11.99 2 Z M 12 20 C 7.58 20 4 16.42 4 12 C 4 7.58 7.58 4 12 4 C 16.42 4 20 7.58 20 12 C 20 16.42 16.42 20 12 20 Z M 12.5 7 H 11 V 13 L 16.25 16.15 L 17 14.92 L 12.5 12.25 V 7 Z',
      label: 'เวลา/กำหนดการ (Clock)',
      defaultColor: '#475569',
      category: 'symbols'
    },
    calendar: {
      path: 'M 19 3 H 18 V 1 H 16 V 3 H 8 V 1 H 6 V 3 H 5 C 3.89 3 3.01 3.9 3.01 5 L 3 19 C 3 20.1 3.89 21 5 21 H 19 C 20.1 21 21 20.1 21 19 V 5 C 21 3.9 20.1 3 19 3 Z M 19 19 H 5 V 8 H 19 V 19 Z',
      label: 'ปฏิทิน/นัดหมาย (Calendar)',
      defaultColor: '#2563eb',
      category: 'symbols'
    },

    // 🛡️ หมวดความปลอดภัย & สิ่งแวดล้อม (Safety & Eco)
    shieldCheck: {
      path: 'M 12 1 L 3 5 V 11 C 3 16.55 6.84 21.74 12 23 C 17.16 21.74 21 16.55 21 11 V 5 L 12 1 Z M 10 16 L 6 12 L 7.41 10.59 L 10 13.17 L 16.59 6.58 L 18 8 L 10 16 Z',
      label: 'ความปลอดภัย/ธรรมาภิบาล (Shield)',
      defaultColor: '#2563eb',
      category: 'safety'
    },
    firstAid: {
      path: 'M 19 3 H 5 C 3.9 3 3 3.9 3 5 V 19 C 3 20.1 3.9 21 5 21 H 19 C 20.1 21 21 20.1 21 19 V 5 C 21 3.9 20.1 3 19 3 Z M 17 13 H 13 V 17 H 11 V 13 H 7 V 11 H 11 V 7 H 13 V 11 H 17 V 13 Z',
      label: 'ปฐมพยาบาล/การแพทย์ (First Aid)',
      defaultColor: '#dc2626',
      category: 'safety'
    },
    leaf: {
      path: 'M 17 8 C 8 10 5.9 16.17 3.82 21.34 L 5.71 22 L 6.66 19.7 C 12 19.8 21 19 21 3 C 17.7 3.5 15.3 4.2 13.5 5.5 C 10.7 7.5 10 10.5 10 12 C 11.5 10.5 14 9.5 17 8 Z',
      label: 'รักษ์สิ่งแวดล้อม/ESG (Eco Leaf)',
      defaultColor: '#16a34a',
      category: 'safety'
    },
    recycle: {
      path: 'M 7 15 L 4.5 19.33 C 4.19 19.87 4.58 20.54 5.2 20.54 H 14.8 L 12.3 16.21 H 9.7 L 10.85 14.22 L 7 15 Z M 16 11 L 18.5 6.67 C 18.81 6.13 18.42 5.46 17.8 5.46 H 8.2 L 10.7 9.79 H 13.3 L 12.15 11.78 L 16 11 Z M 13 14 L 10.5 9.67 C 10.19 9.13 9.42 9.13 9.11 9.67 L 4.3 18 H 8.2 L 9.5 15.75 L 10.65 17.74 L 13 14 Z',
      label: 'รีไซเคิล/หมุนเวียน (Recycle)',
      defaultColor: '#059669',
      category: 'safety'
    }
  };

  const addVectorIcon = (iconKey: string) => {
    if (!canvas || !fabric) return;
    const iconData = SVG_ICON_DATA[iconKey];
    if (!iconData) return;

    // Use iconActiveColor if selected, or user fillColor, or default
    const color = iconActiveColor || (fillColor !== 'transparent' ? fillColor : iconData.defaultColor);
    const pathObj = new fabric.Path(iconData.path, {
      left: 160,
      top: 160,
      fill: color,
      scaleX: 2.2,
      scaleY: 2.2,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 6, offsetY: 2 })
    });

    canvas.add(pathObj);
    canvas.setActiveObject(pathObj);
    canvas.requestRenderAll();
  };

  // Add Rich Decorative Stickers & 3D Badges
  const addDecorativeSticker = (stickerId: string) => {
    if (!canvas || !fabric) return;

    let elements: any[] = [];
    let angle = 0;

    switch (stickerId) {
      case 'hot-topic': {
        // 🔥 HOT TOPIC Sticker
        const outerShadow = new fabric.Rect({
          width: 170, height: 52, rx: 26, ry: 26, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(220, 38, 38, 0.35)', blur: 14, offsetY: 5 })
        });
        const innerBadge = new fabric.Rect({
          left: 4, top: 4, width: 162, height: 44, rx: 22, ry: 22, fill: '#ef4444'
        });
        const emoji = new fabric.IText('🔥', { left: 16, top: 12, fontSize: 22 });
        const txt = new fabric.IText('HOT TOPIC', {
          left: 50, top: 14, fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#ffffff'
        });
        elements = [outerShadow, innerBadge, emoji, txt];
        angle = -4;
        break;
      }

      case 'new-release': {
        // ✨ NEW! Sticker
        const outer = new fabric.Rect({
          width: 150, height: 50, rx: 14, ry: 14, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(2, 132, 199, 0.35)', blur: 12, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 144, height: 44, rx: 11, ry: 11, fill: '#38bdf8'
        });
        const emoji = new fabric.IText('✨', { left: 12, top: 12, fontSize: 20 });
        const txt = new fabric.IText('NEW! ใหม่', {
          left: 42, top: 13, fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#0f172a'
        });
        elements = [outer, inner, emoji, txt];
        angle = 4;
        break;
      }

      case 'urgent-alert': {
        // ⚡ URGENT Sticker
        const outer = new fabric.Rect({
          width: 170, height: 52, rx: 12, ry: 12, fill: '#b45309', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(234, 88, 12, 0.4)', blur: 14, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 164, height: 46, rx: 9, ry: 9, fill: '#f59e0b'
        });
        const icon = new fabric.IText('⚡', { left: 14, top: 11, fontSize: 24 });
        const txt = new fabric.IText('ด่วนพิเศษ!', {
          left: 48, top: 14, fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#78350f'
        });
        elements = [outer, inner, icon, txt];
        angle = -6;
        break;
      }

      case 'verified-seal': {
        // ✓ 100% VERIFIED Seal Badge
        const circleOuter = new fabric.Circle({
          radius: 46, fill: '#047857', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(5, 150, 105, 0.35)', blur: 12, offsetY: 4 })
        });
        const circleInner = new fabric.Circle({
          left: 6, top: 6, radius: 40, fill: '#10b981', stroke: '#6ee7b7', strokeWidth: 1.5, strokeDashArray: [4, 3]
        });
        const checkIcon = new fabric.IText('✓', {
          left: 46, top: 22, originX: 'center', fontFamily: 'Prompt', fontSize: 24, fontWeight: 'bold', fill: '#ffffff'
        });
        const txtVer = new fabric.IText('VERIFIED', {
          left: 46, top: 52, originX: 'center', fontFamily: 'Prompt', fontSize: 10, fontWeight: 'bold', fill: '#ecfdf5'
        });
        const txtSub = new fabric.IText('100% ผ่านตรวจ', {
          left: 46, top: 66, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fontWeight: 'bold', fill: '#d1fae5'
        });
        elements = [circleOuter, circleInner, checkIcon, txtVer, txtSub];
        break;
      }

      case 'top-rated': {
        // 👑 TOP RATED Ribbon Badge
        const outer = new fabric.Rect({
          width: 175, height: 54, rx: 14, ry: 14, fill: '#4338ca', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(99, 102, 241, 0.35)', blur: 12, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 169, height: 48, rx: 11, ry: 11, fill: '#6366f1'
        });
        const icon = new fabric.IText('👑', { left: 14, top: 12, fontSize: 22 });
        const txt = new fabric.IText('TOP RATED', {
          left: 48, top: 15, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#ffffff'
        });
        elements = [outer, inner, icon, txt];
        angle = 3;
        break;
      }

      case 'best-choice': {
        // 🏆 BEST CHOICE Gold Badge
        const outer = new fabric.Rect({
          width: 180, height: 54, rx: 27, ry: 27, fill: '#b45309', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(217, 119, 6, 0.35)', blur: 12, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 174, height: 48, rx: 24, ry: 24, fill: '#f59e0b'
        });
        const icon = new fabric.IText('🏆', { left: 16, top: 12, fontSize: 22 });
        const txt = new fabric.IText('BEST CHOICE', {
          left: 48, top: 16, fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#451a03'
        });
        elements = [outer, inner, icon, txt];
        break;
      }

      case 'free-badge': {
        // 🎁 FREE Badge
        const outer = new fabric.Rect({
          width: 140, height: 50, rx: 12, ry: 12, fill: '#059669', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(16, 185, 129, 0.3)', blur: 10, offsetY: 3 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 134, height: 44, rx: 9, ry: 9, fill: '#10b981'
        });
        const icon = new fabric.IText('🎁', { left: 12, top: 11, fontSize: 20 });
        const txt = new fabric.IText('FREE ฟรี!', {
          left: 42, top: 14, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#ffffff'
        });
        elements = [outer, inner, icon, txt];
        angle = -5;
        break;
      }

      case 'thai-digital': {
        // 🇹🇭 THAILAND 4.0 Badge
        const outer = new fabric.Rect({
          width: 200, height: 56, rx: 14, ry: 14, fill: '#1e3a8a', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(30, 58, 138, 0.35)', blur: 14, offsetY: 4 })
        });
        const stripeRed = new fabric.Rect({ left: 4, top: 4, width: 192, height: 6, fill: '#dc2626', rx: 3, ry: 3 });
        const stripeWhite = new fabric.Rect({ left: 4, top: 10, width: 192, height: 4, fill: '#ffffff' });
        const txt = new fabric.IText('🇹🇭 THAILAND 4.0', {
          left: 100, top: 22, originX: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#ffffff'
        });
        const txtSub = new fabric.IText('DIGITAL TRANSFORMATION', {
          left: 100, top: 40, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fontWeight: 'bold', fill: '#93c5fd'
        });
        elements = [outer, stripeRed, stripeWhite, txt, txtSub];
        break;
      }

      case 'secure-badge': {
        // 🔒 100% SECURE Badge
        const circle = new fabric.Circle({
          radius: 46, fill: '#1e293b', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(30, 41, 59, 0.35)', blur: 12, offsetY: 4 })
        });
        const lockIcon = new fabric.IText('🔒', { left: 46, top: 18, originX: 'center', fontSize: 24 });
        const txt = new fabric.IText('100% SECURE', {
          left: 46, top: 52, originX: 'center', fontFamily: 'Prompt', fontSize: 9, fontWeight: 'bold', fill: '#38bdf8'
        });
        const sub = new fabric.IText('ความปลอดภัยสูง', {
          left: 46, top: 66, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fill: '#94a3b8'
        });
        elements = [circle, lockIcon, txt, sub];
        break;
      }

      case 'smart-tip': {
        // 💡 SMART TIP Sticker
        const outer = new fabric.Rect({
          width: 170, height: 50, rx: 25, ry: 25, fill: '#ca8a04', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(234, 179, 8, 0.3)', blur: 10, offsetY: 3 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 164, height: 44, rx: 22, ry: 22, fill: '#fef08a'
        });
        const icon = new fabric.IText('💡', { left: 14, top: 10, fontSize: 22 });
        const txt = new fabric.IText('SMART TIP', {
          left: 48, top: 14, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#854d0e'
        });
        elements = [outer, inner, icon, txt];
        angle = 2;
        break;
      }

      case 'deadline-urgent': {
        // ⏳ DEADLINE Sticker
        const outer = new fabric.Rect({
          width: 175, height: 52, rx: 12, ry: 12, fill: '#991b1b', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(153, 27, 27, 0.35)', blur: 12, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 169, height: 46, rx: 9, ry: 9, fill: '#fee2e2'
        });
        const icon = new fabric.IText('⏳', { left: 12, top: 11, fontSize: 22 });
        const txt = new fabric.IText('DEADLINE!', {
          left: 46, top: 14, fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#991b1b'
        });
        elements = [outer, inner, icon, txt];
        angle = -5;
        break;
      }

      case 'pinned-note': {
        // 📌 PINNED Note Sticker
        const paper = new fabric.Rect({
          width: 130, height: 90, rx: 4, ry: 4, fill: '#fef9c3', stroke: '#ffffff', strokeWidth: 3,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 10, offsetY: 4 })
        });
        const pin = new fabric.IText('📌', { left: 65, top: -10, originX: 'center', fontSize: 24 });
        const txt = new fabric.IText('PINNED', {
          left: 65, top: 32, originX: 'center', fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#854d0e'
        });
        const sub = new fabric.IText('เรื่องสำคัญ!', {
          left: 65, top: 56, originX: 'center', fontFamily: 'Prompt', fontSize: 12, fill: '#a16207'
        });
        elements = [paper, pin, txt, sub];
        angle = 6;
        break;
      }

      case 'kpi-target': {
        // 🎯 100% KPI REACHED
        const circle = new fabric.Circle({
          radius: 46, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(220, 38, 38, 0.35)', blur: 12, offsetY: 4 })
        });
        const icon = new fabric.IText('🎯', { left: 46, top: 16, originX: 'center', fontSize: 24 });
        const txt = new fabric.IText('100% KPI', {
          left: 46, top: 50, originX: 'center', fontFamily: 'Prompt', fontSize: 11, fontWeight: 'bold', fill: '#ffffff'
        });
        const sub = new fabric.IText('บรรลุเป้าหมาย', {
          left: 46, top: 66, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fontWeight: 'bold', fill: '#fecaca'
        });
        elements = [circle, icon, txt, sub];
        break;
      }

      case 'gov-standard': {
        // 🏛️ GOV STANDARD Crest
        const outer = new fabric.Rect({
          width: 190, height: 56, rx: 14, ry: 14, fill: '#1e3a8a', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(30, 58, 138, 0.35)', blur: 12, offsetY: 4 })
        });
        const icon = new fabric.IText('🏛️', { left: 16, top: 12, fontSize: 24 });
        const txt = new fabric.IText('GOV STANDARD', {
          left: 54, top: 14, fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#fbbf24'
        });
        const sub = new fabric.IText('มาตรฐานงานสารบรรณ', {
          left: 54, top: 34, fontFamily: 'Prompt', fontSize: 10, fill: '#e0e7ff'
        });
        elements = [outer, icon, txt, sub];
        break;
      }

      case 'eco-friendly': {
        // 🌿 ECO GREEN Badge
        const circle = new fabric.Circle({
          radius: 46, fill: '#15803d', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(21, 128, 61, 0.35)', blur: 12, offsetY: 4 })
        });
        const icon = new fabric.IText('🌿', { left: 46, top: 16, originX: 'center', fontSize: 24 });
        const txt = new fabric.IText('ECO GREEN', {
          left: 46, top: 52, originX: 'center', fontFamily: 'Prompt', fontSize: 9, fontWeight: 'bold', fill: '#ffffff'
        });
        const sub = new fabric.IText('รักษ์สิ่งแวดล้อม', {
          left: 46, top: 66, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fill: '#bbf7d0'
        });
        elements = [circle, icon, txt, sub];
        break;
      }

      case 'thank-you': {
        // ❤️ THANK YOU Sticker
        const outer = new fabric.Rect({
          width: 175, height: 50, rx: 25, ry: 25, fill: '#db2777', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(219, 39, 119, 0.3)', blur: 10, offsetY: 3 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 169, height: 44, rx: 22, ry: 22, fill: '#fbcfe8'
        });
        const icon = new fabric.IText('❤️', { left: 14, top: 10, fontSize: 22 });
        const txt = new fabric.IText('THANK YOU', {
          left: 46, top: 14, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#9d174d'
        });
        elements = [outer, inner, icon, txt];
        angle = -3;
        break;
      }

      case 'announcement': {
        // 📢 ANNOUNCE Sticker
        const outer = new fabric.Rect({
          width: 185, height: 54, rx: 14, ry: 14, fill: '#c026d3', stroke: '#ffffff', strokeWidth: 3.5,
          shadow: new fabric.Shadow({ color: 'rgba(192, 38, 211, 0.35)', blur: 12, offsetY: 4 })
        });
        const inner = new fabric.Rect({
          left: 3, top: 3, width: 179, height: 48, rx: 11, ry: 11, fill: '#f5d0fe'
        });
        const icon = new fabric.IText('📢', { left: 14, top: 12, fontSize: 22 });
        const txt = new fabric.IText('ประกาศสำคัญ!', {
          left: 48, top: 15, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#86198f'
        });
        elements = [outer, inner, icon, txt];
        angle = 3;
        break;
      }

      case 'score-100': {
        // 💯 100 คะแนนเต็ม
        const circle = new fabric.Circle({
          radius: 44, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 4,
          shadow: new fabric.Shadow({ color: 'rgba(220, 38, 38, 0.35)', blur: 12, offsetY: 4 })
        });
        const icon = new fabric.IText('💯', { left: 44, top: 20, originX: 'center', fontSize: 28 });
        const txt = new fabric.IText('คะแนนเต็ม!', {
          left: 44, top: 58, originX: 'center', fontFamily: 'Prompt', fontSize: 10, fontWeight: 'bold', fill: '#ffffff'
        });
        elements = [circle, icon, txt];
        angle = -6;
        break;
      }

      default:
        break;
    }

    if (elements.length > 0) {
      const grp = new fabric.Group(elements, {
        left: 160,
        top: 160,
        angle,
        subTargetCheck: true
      });
      canvas.add(grp);
      canvas.setActiveObject(grp);
      canvas.requestRenderAll();
    }
  };

  // Add Official Stamps
  const addOfficialStamp = (type: 'urgent' | 'secret' | 'approved' | 'copy' | 'received') => {
    if (!canvas || !fabric) return;

    let elements: any[] = [];
    let angle = -8;

    if (type === 'urgent') {
      const outerRect = new fabric.Rect({
        width: 220, height: 75, rx: 8, ry: 8, fill: 'rgba(239, 68, 68, 0.08)', stroke: '#dc2626', strokeWidth: 3
      });
      const innerRect = new fabric.Rect({
        left: 6, top: 6, width: 208, height: 63, rx: 5, ry: 5, fill: 'transparent', stroke: '#dc2626', strokeWidth: 1.5, strokeDashArray: [5, 3]
      });
      const txtMain = new fabric.IText('ด่วนที่สุด', {
        left: 110, top: 18, originX: 'center', fontFamily: 'Prompt', fontSize: 26, fontWeight: 'bold', fill: '#dc2626'
      });
      const txtSub = new fabric.IText('URGENT • หนังสือราชการ', {
        left: 110, top: 48, originX: 'center', fontFamily: 'Prompt', fontSize: 9, fontWeight: 'bold', fill: '#dc2626'
      });
      elements = [outerRect, innerRect, txtMain, txtSub];
      angle = -10;
    } else if (type === 'secret') {
      const outerRect = new fabric.Rect({
        width: 200, height: 70, rx: 8, ry: 8, fill: 'rgba(185, 28, 28, 0.08)', stroke: '#991b1b', strokeWidth: 3
      });
      const innerRect = new fabric.Rect({
        left: 5, top: 5, width: 190, height: 60, rx: 5, ry: 5, fill: 'transparent', stroke: '#991b1b', strokeWidth: 1
      });
      const txtMain = new fabric.IText('ลับมาก', {
        left: 100, top: 16, originX: 'center', fontFamily: 'Prompt', fontSize: 26, fontWeight: 'bold', fill: '#991b1b'
      });
      const txtSub = new fabric.IText('TOP SECRET • ห้ามเผยแพร่', {
        left: 100, top: 46, originX: 'center', fontFamily: 'Prompt', fontSize: 8, fontWeight: 'bold', fill: '#991b1b'
      });
      elements = [outerRect, innerRect, txtMain, txtSub];
      angle = -7;
    } else if (type === 'approved') {
      const outerRect = new fabric.Rect({
        width: 230, height: 75, rx: 12, ry: 12, fill: 'rgba(22, 163, 74, 0.08)', stroke: '#16a34a', strokeWidth: 3
      });
      const txtMain = new fabric.IText('✓ อนุมัติแล้ว', {
        left: 115, top: 16, originX: 'center', fontFamily: 'Prompt', fontSize: 24, fontWeight: 'bold', fill: '#16a34a'
      });
      const txtSub = new fabric.IText('APPROVED & VERIFIED', {
        left: 115, top: 46, originX: 'center', fontFamily: 'Prompt', fontSize: 10, fontWeight: 'bold', fill: '#16a34a'
      });
      elements = [outerRect, txtMain, txtSub];
      angle = -5;
    } else if (type === 'copy') {
      const outerRect = new fabric.Rect({
        width: 230, height: 72, rx: 8, ry: 8, fill: 'rgba(37, 99, 235, 0.08)', stroke: '#2563eb', strokeWidth: 2.5
      });
      const txtMain = new fabric.IText('สำเนาถูกต้อง', {
        left: 115, top: 16, originX: 'center', fontFamily: 'Prompt', fontSize: 22, fontWeight: 'bold', fill: '#2563eb'
      });
      const txtSub = new fabric.IText('CERTIFIED TRUE COPY', {
        left: 115, top: 44, originX: 'center', fontFamily: 'Prompt', fontSize: 9, fontWeight: 'bold', fill: '#2563eb'
      });
      elements = [outerRect, txtMain, txtSub];
      angle = -6;
    } else if (type === 'received') {
      const outerRect = new fabric.Rect({
        width: 240, height: 80, rx: 10, ry: 10, fill: 'rgba(124, 58, 237, 0.08)', stroke: '#7c3aed', strokeWidth: 2.5
      });
      const txtMain = new fabric.IText('ลงรับเอกสารแล้ว', {
        left: 120, top: 16, originX: 'center', fontFamily: 'Prompt', fontSize: 20, fontWeight: 'bold', fill: '#7c3aed'
      });
      const txtSub = new fabric.IText('RECEIVED • ระบบงานสารบรรณ', {
        left: 120, top: 46, originX: 'center', fontFamily: 'Sarabun', fontSize: 11, fontWeight: 'bold', fill: '#7c3aed'
      });
      elements = [outerRect, txtMain, txtSub];
      angle = -4;
    }

    const grp = new fabric.Group(elements, { left: 150, top: 150, angle, subTargetCheck: true });
    
    // Allow right click to ungroup for editing
    grp.on('mousedown', (e: any) => {
        if (e.button === 3) { // Right click
            if (typeof (grp as any).toActiveSelection === 'function') {
                (grp as any).toActiveSelection();
                canvas.requestRenderAll();
            }
        }
    });
    
    canvas.add(grp);
    canvas.setActiveObject(grp);
    canvas.requestRenderAll();
  };

  // Add Flowchart Diagram Blocks
  const addFlowchartShape = (type: 'capsule' | 'process' | 'diamond' | 'parallelogram' | 'cylinder' | 'document') => {
    if (!canvas || !fabric) return;

    let elements: any[] = [];
    const baseCol = fillColor === 'transparent' ? '#3b82f6' : fillColor;

    if (type === 'capsule') {
      const rect = new fabric.Rect({
        width: 180, height: 60, rx: 30, ry: 30, fill: baseCol, stroke: '#1d4ed8', strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 8, offsetY: 2 })
      });
      const txt = new fabric.IText('เริ่มต้น / สิ้นสุด', {
        left: 90, top: 30, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#ffffff'
      });
      elements = [rect, txt];
    } else if (type === 'process') {
      const rect = new fabric.Rect({
        width: 200, height: 75, rx: 8, ry: 8, fill: '#ffffff', stroke: baseCol, strokeWidth: 2.5,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 10, offsetY: 3 })
      });
      const topBar = new fabric.Rect({ width: 200, height: 6, rx: 3, ry: 3, fill: baseCol });
      const txt = new fabric.Textbox('กระบวนการ / ดำเนินการ', {
        left: 100, top: 38, width: 180, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#0f172a'
      });
      elements = [rect, topBar, txt];
    } else if (type === 'diamond') {
      const poly = new fabric.Polygon([
        { x: 90, y: 0 }, { x: 180, y: 55 }, { x: 90, y: 110 }, { x: 0, y: 55 }
      ], {
        fill: '#fef3c7', stroke: '#d97706', strokeWidth: 2.5
      });
      const txt = new fabric.Textbox('เงื่อนไขการตัดสินใจ?', {
        left: 90, top: 55, width: 130, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#92400e'
      });
      elements = [poly, txt];
    } else if (type === 'parallelogram') {
      const poly = new fabric.Polygon([
        { x: 30, y: 0 }, { x: 200, y: 0 }, { x: 170, y: 70 }, { x: 0, y: 70 }
      ], {
        fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 2
      });
      const txt = new fabric.Textbox('ข้อมูลนำเข้า / ส่งออก', {
        left: 100, top: 35, width: 150, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#1e40af'
      });
      elements = [poly, txt];
    } else if (type === 'cylinder') {
      const topEllipse = new fabric.Ellipse({ left: 0, top: 0, rx: 70, ry: 16, fill: '#e0e7ff', stroke: '#4338ca', strokeWidth: 2 });
      const bodyRect = new fabric.Rect({ left: 0, top: 16, width: 140, height: 60, fill: '#e0e7ff', stroke: '#4338ca', strokeWidth: 2 });
      const botEllipse = new fabric.Ellipse({ left: 0, top: 60, rx: 70, ry: 16, fill: '#c7d2fe', stroke: '#4338ca', strokeWidth: 2 });
      const txt = new fabric.IText('ฐานข้อมูล (DB)', {
        left: 70, top: 45, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#312e81'
      });
      elements = [bodyRect, botEllipse, topEllipse, txt];
    } else if (type === 'document') {
      const path = new fabric.Path('M 0 0 L 180 0 L 180 75 Q 135 60 90 75 Q 45 90 0 75 Z', {
        fill: '#f0fdf4', stroke: '#16a34a', strokeWidth: 2
      });
      const txt = new fabric.Textbox('หนังสือราชการ / ผลลัพธ์', {
        left: 90, top: 35, width: 150, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#166534'
      });
      elements = [path, txt];
    }

    const grp = new fabric.Group(elements, { left: 150, top: 150 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
    canvas.requestRenderAll();
  };

  // Add Advanced Infographic Elements
  const addAdvancedInfographic = (type: 'step-card' | 'comparison' | 'checklist' | 'quote' | 'donut-stat' | 'kpi-gauge' | 'ribbon-banner' | 'tag-pill') => {
    if (!canvas || !fabric) return;

    let grp: any;

    if (type === 'step-card') {
      const bg = new fabric.Rect({
        width: 320, height: 95, rx: 14, ry: 14, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 12, offsetY: 3 })
      });
      const badgeCircle = new fabric.Circle({ left: 15, top: 22, radius: 24, fill: '#3b82f6' });
      const badgeTxt = new fabric.IText('01', { left: 39, top: 46, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 20, fontWeight: 'bold', fill: '#ffffff' });
      const heading = new fabric.Textbox('ขั้นตอนที่ 1 : ตรวจสอบเอกสาร', { left: 75, top: 20, width: 230, fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#0f172a' });
      const desc = new fabric.Textbox('กรอกข้อมูลและแนบไฟล์เอกสารราชการเข้าสู่ระบบ', { left: 75, top: 48, width: 230, fontFamily: 'Sarabun', fontSize: 12, fill: '#64748b' });
      grp = new fabric.Group([bg, badgeCircle, badgeTxt, heading, desc], { left: 120, top: 120 });
    } else if (type === 'comparison') {
      const bg = new fabric.Rect({
        width: 380, height: 160, rx: 14, ry: 14, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1.5,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 12, offsetY: 3 })
      });
      const divider = new fabric.Line([190, 0, 190, 160], { stroke: '#e2e8f0', strokeWidth: 1.5 });
      const leftHeader = new fabric.Rect({ width: 190, height: 36, rx: 0, ry: 0, fill: '#dcfce7' });
      const rightHeader = new fabric.Rect({ left: 190, width: 190, height: 36, rx: 0, ry: 0, fill: '#fee2e2' });
      const leftTitle = new fabric.IText('✓ สิ่งที่ควรปฏิบัติ (DO)', { left: 95, top: 18, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: '#15803d' });
      const rightTitle = new fabric.IText('✕ ข้อควรระวัง (DON\'T)', { left: 285, top: 18, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: '#b91c1c' });
      const leftContent = new fabric.Textbox('• ตรวจสอบเลขที่หนังสือ\n• แนบเอกสารต้นฉบับครบถ้วน\n• ลงนามตามอำนาจหน้าที่', { left: 15, top: 48, width: 160, fontFamily: 'Sarabun', fontSize: 12, fill: '#334155', lineHeight: 1.3 });
      const rightContent = new fabric.Textbox('• ห้ามแก้ไขข้อความหลังลงนาม\n• ห้ามเผยแพร่เอกสารลับ\n• ไม่ละเลยระยะเวลาเสนอเรื่อง', { left: 205, top: 48, width: 160, fontFamily: 'Sarabun', fontSize: 12, fill: '#334155', lineHeight: 1.3 });
      grp = new fabric.Group([bg, divider, leftHeader, rightHeader, leftTitle, rightTitle, leftContent, rightContent], { left: 120, top: 120 });
    } else if (type === 'checklist') {
      const bg = new fabric.Rect({
        width: 320, height: 160, rx: 14, ry: 14, fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 2,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 10, offsetY: 2 })
      });
      const title = new fabric.Textbox('รายการตรวจสอบ (Checklist)', { left: 160, top: 15, width: 290, originX: 'center', fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#0f172a', textAlign: 'center' });
      
      const item1Bg = new fabric.Circle({ left: 20, top: 48, radius: 10, fill: '#10b981' });
      const item1Check = new fabric.IText('✓', { left: 30, top: 58, originX: 'center', originY: 'center', fontSize: 12, fill: '#ffffff', fontWeight: 'bold' });
      const item1Txt = new fabric.Textbox('ตรวจสอบความถูกต้องของหัวเรื่องและผู้รับ', { left: 50, top: 47, width: 250, fontFamily: 'Sarabun', fontSize: 13, fill: '#334155' });

      const item2Bg = new fabric.Circle({ left: 20, top: 82, radius: 10, fill: '#10b981' });
      const item2Check = new fabric.IText('✓', { left: 30, top: 92, originX: 'center', originY: 'center', fontSize: 12, fill: '#ffffff', fontWeight: 'bold' });
      const item2Txt = new fabric.Textbox('แนบไฟล์เอกสารประกอบและเอกสารอ้างอิง', { left: 50, top: 81, width: 250, fontFamily: 'Sarabun', fontSize: 13, fill: '#334155' });

      const item3Bg = new fabric.Circle({ left: 20, top: 116, radius: 10, fill: '#10b981' });
      const item3Check = new fabric.IText('✓', { left: 30, top: 126, originX: 'center', originY: 'center', fontSize: 12, fill: '#ffffff', fontWeight: 'bold' });
      const item3Txt = new fabric.Textbox('บันทึกและส่งเวียนตามลำดับการเสนอ', { left: 50, top: 115, width: 250, fontFamily: 'Sarabun', fontSize: 13, fill: '#334155' });

      grp = new fabric.Group([bg, title, item1Bg, item1Check, item1Txt, item2Bg, item2Check, item2Txt, item3Bg, item3Check, item3Txt], { left: 120, top: 120 });
    } else if (type === 'quote') {
      const bg = new fabric.Rect({
        width: 380, height: 110, rx: 12, ry: 12, fill: '#eff6ff', stroke: '#bfdbfe', strokeWidth: 1.5,
        shadow: new fabric.Shadow({ color: 'rgba(59,130,246,0.08)', blur: 10, offsetY: 2 })
      });
      const quoteMark = new fabric.IText('“', { left: 20, top: 10, fontFamily: 'Prompt', fontSize: 60, fontWeight: 'bold', fill: '#3b82f6', opacity: 0.4 });
      const quoteTxt = new fabric.Textbox('“การปฏิบัติงานสารบรรณที่รวดเร็วและถูกต้อง คือหัวใจสำคัญของความโปร่งใสในองค์กร”', {
        left: 45, top: 22, width: 315, fontFamily: 'Sarabun', fontSize: 14, fontWeight: 'bold', fill: '#1e3a8a', fontStyle: 'italic'
      });
      const author = new fabric.IText('— คำแนะนำมาตรฐานงานสารบรรณ', { left: 360, top: 82, originX: 'right', fontFamily: 'Sarabun', fontSize: 11, fill: '#60a5fa' });
      grp = new fabric.Group([bg, quoteMark, quoteTxt, author], { left: 120, top: 120 });
    } else if (type === 'donut-stat') {
      const outerCircle = new fabric.Circle({ radius: 55, fill: '#3b82f6', left: 15, top: 15 });
      const innerCircle = new fabric.Circle({ radius: 40, fill: '#ffffff', left: 30, top: 30 });
      const valTxt = new fabric.IText('85%', { left: 70, top: 70, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 24, fontWeight: 'bold', fill: '#1e3a8a' });
      const label = new fabric.Textbox('ความสำเร็จของโครงการเป้าหมาย', { left: 145, top: 42, width: 170, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#0f172a' });
      const sub = new fabric.Textbox('อ้างอิงรายงานผลประจำเดือนล่าสุด', { left: 145, top: 70, width: 170, fontFamily: 'Sarabun', fontSize: 12, fill: '#64748b' });
      const cardBg = new fabric.Rect({ width: 330, height: 140, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 12, offsetY: 3 }) });
      grp = new fabric.Group([cardBg, outerCircle, innerCircle, valTxt, label, sub], { left: 120, top: 120 });
    } else if (type === 'kpi-gauge') {
      const bg = new fabric.Rect({ width: 320, height: 120, rx: 14, ry: 14, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 10, offsetY: 2 }) });
      const title = new fabric.Textbox('ดัชนีชี้วัดความรวดเร็ว (KPI Speed)', { left: 160, top: 15, width: 290, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#0f172a' });
      const bRed = new fabric.Rect({ left: 25, top: 48, width: 85, height: 14, rx: 4, ry: 4, fill: '#ef4444' });
      const bYellow = new fabric.Rect({ left: 115, top: 48, width: 85, height: 14, rx: 4, ry: 4, fill: '#f59e0b' });
      const bGreen = new fabric.Rect({ left: 205, top: 48, width: 90, height: 14, rx: 4, ry: 4, fill: '#10b981' });
      const score = new fabric.IText('คะแนนรวม 9.4 / 10 (ระดับดีเยี่ยม)', { left: 160, top: 85, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#059669' });
      grp = new fabric.Group([bg, title, bRed, bYellow, bGreen, score], { left: 120, top: 120 });
    } else if (type === 'ribbon-banner') {
      const banner = new fabric.Rect({ left: 30, top: 10, width: 320, height: 50, rx: 6, ry: 6, fill: '#4f46e5', shadow: new fabric.Shadow({ color: 'rgba(79,70,229,0.25)', blur: 12, offsetY: 4 }) });
      const leftFold = new fabric.Polygon([{ x: 30, y: 10 }, { x: 0, y: 35 }, { x: 30, y: 60 }], { fill: '#3730a3' });
      const rightFold = new fabric.Polygon([{ x: 350, y: 10 }, { x: 380, y: 35 }, { x: 350, y: 60 }], { fill: '#3730a3' });
      const txt = new fabric.IText('★ สรุปผลการดำเนินงานสำคัญ ★', { left: 190, top: 35, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#ffffff' });
      grp = new fabric.Group([leftFold, rightFold, banner, txt], { left: 120, top: 120 });
    } else if (type === 'tag-pill') {
      const pill = new fabric.Rect({ width: 140, height: 36, rx: 18, ry: 18, fill: '#10b981' });
      const txt = new fabric.IText('• ประชาสัมพันธ์', { left: 70, top: 18, originX: 'center', originY: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#ffffff' });
      grp = new fabric.Group([pill, txt], { left: 120, top: 120 });
    }

    if (grp) {
      canvas.add(grp);
      canvas.setActiveObject(grp);
      canvas.requestRenderAll();
    }
  };

  // Add Decorative Dividers
  const addDecorativeDivider = (type: 'dashed-dot' | 'double-arrow' | 'gradient-line') => {
    if (!canvas || !fabric) return;

    let grp: any;
    const baseCol = fillColor === 'transparent' ? '#3b82f6' : fillColor;

    if (type === 'dashed-dot') {
      const lineLeft = new fabric.Line([0, 10, 160, 10], { stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [6, 4] });
      const diamond = new fabric.Polygon([{ x: 175, y: 0 }, { x: 185, y: 10 }, { x: 175, y: 20 }, { x: 165, y: 10 }], { fill: baseCol });
      const lineRight = new fabric.Line([190, 10, 350, 10], { stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [6, 4] });
      grp = new fabric.Group([lineLeft, diamond, lineRight], { left: 120, top: 120 });
    } else if (type === 'double-arrow') {
      const line = new fabric.Line([20, 10, 280, 10], { stroke: baseCol, strokeWidth: 4 });
      const leftArrow = new fabric.Triangle({ left: 15, top: 10, width: 16, height: 16, angle: -90, originX: 'center', originY: 'center', fill: baseCol });
      const rightArrow = new fabric.Triangle({ left: 285, top: 10, width: 16, height: 16, angle: 90, originX: 'center', originY: 'center', fill: baseCol });
      grp = new fabric.Group([leftArrow, line, rightArrow], { left: 120, top: 120 });
    } else if (type === 'gradient-line') {
      const line1 = new fabric.Line([0, 5, 320, 5], { stroke: baseCol, strokeWidth: 3 });
      const line2 = new fabric.Line([40, 12, 280, 12], { stroke: '#94a3b8', strokeWidth: 1.5 });
      grp = new fabric.Group([line1, line2], { left: 120, top: 120 });
    }

    if (grp) {
      canvas.add(grp);
      canvas.setActiveObject(grp);
      canvas.requestRenderAll();
    }
  };

  const generateAIDesign = async () => {
    if (!aiPrompt.trim()) {
      setAiError('กรุณาระบุหัวข้อที่ต้องการให้ออกแบบ');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const response = await fetch('/api/ai/infographics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAiResult(resData.data);
      } else {
        setAiError(resData.error || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI');
      }
    } catch (err: any) {
      console.error('Error generating AI infographic:', err);
      setAiError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setAiLoading(false);
    }
  };

  const insertAITitle = (title: string, subtitle: string) => {
    if (!canvas) return;
    const mainTitle = new fabric.Textbox(title, {
      left: 100,
      top: 100,
      width: 600,
      fontFamily: 'Prompt',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#1e293b',
      textAlign: 'center',
    });
    const subTitle = new fabric.Textbox(subtitle, {
      left: 100,
      top: 155,
      width: 600,
      fontFamily: 'Sarabun',
      fontSize: 16,
      fill: '#64748b',
      textAlign: 'center',
    });
    canvas.add(mainTitle);
    canvas.add(subTitle);
    canvas.setActiveObject(mainTitle);
    canvas.requestRenderAll();
  };

  const insertAISect = (heading: string, bodyText: string) => {
    if (!canvas) return;
    const headingTxt = new fabric.Textbox(heading, {
      left: 150,
      top: 200,
      width: 500,
      fontFamily: 'Prompt',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#4f46e5',
    });
    const bodyTxt = new fabric.Textbox(bodyText, {
      left: 150,
      top: 235,
      width: 500,
      fontFamily: 'Sarabun',
      fontSize: 14,
      fill: '#334155',
      lineHeight: 1.4,
    });
    
    // Group them
    const group = new fabric.Group([headingTxt, bodyTxt], {
      left: 150,
      top: 200,
      subTargetCheck: true,
      interactive: true,
    } as any);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  };

  const insertAIStat = (value: string, label: string, color: string) => {
    if (!canvas) return;
    const bg = new fabric.Rect({
      left: 0,
      top: 0,
      width: 220,
      height: 140,
      fill: '#ffffff',
      stroke: '#e2e8f0',
      strokeWidth: 1,
      rx: 12,
      ry: 12,
    });

    const valTxt = new fabric.Textbox(value, {
      left: 10,
      top: 20,
      width: 200,
      fontFamily: 'Prompt',
      fontSize: 38,
      fontWeight: 'bold',
      fill: color || '#4f46e5',
      textAlign: 'center',
    });

    const lblTxt = new fabric.Textbox(label, {
      left: 10,
      top: 75,
      width: 200,
      fontFamily: 'Sarabun',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#475569',
      textAlign: 'center',
      lineHeight: 1.3,
    });

    const group = new fabric.Group([bg, valTxt, lblTxt], {
      left: 150,
      top: 150,
      subTargetCheck: true,
      interactive: true,
    } as any);

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  };

  const applyAIPalette = (colors: string[]) => {
    if (!canvas || !colors || colors.length === 0) return;
    
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      if (activeObj.type === 'activeSelection') {
        const activeSel = activeObj as any;
        activeSel.forEachObject((obj: any, idx: number) => {
          const color = colors[idx % colors.length];
          obj.set('fill', color);
        });
      } else {
        if (activeObj.type === 'textbox' || activeObj.type === 'text') {
          activeObj.set('fill', colors[0]);
        } else if (activeObj.type === 'group') {
          const grp = activeObj as any;
          grp.forEachObject((obj: any, idx: number) => {
            const color = colors[idx % colors.length];
            obj.set('fill', color);
          });
        } else {
          activeObj.set('fill', colors[0]);
        }
      }
      canvas.requestRenderAll();
      return;
    }

    canvas.set('backgroundColor', colors[colors.length - 1]);
    canvas.requestRenderAll();
  };

  const insertImageFromUrl = (imageUrl: string, imageName?: string) => {
    if (!canvas || !fabric) return;
    (fabric.FabricImage || fabric.Image).fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img: any) => {
      if (!img) return;
      const defaultWidth = Math.min(320, canvasSize.width * 0.6);
      if (img.width > defaultWidth) {
        img.scaleToWidth(defaultWidth);
      }
      img.set({
        left: (canvasSize.width - (img.getScaledWidth ? img.getScaledWidth() : 300)) / 2,
        top: (canvasSize.height - (img.getScaledHeight ? img.getScaledHeight() : 300)) / 2,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    }).catch((err: any) => {
      console.error("Error loading image from URL", err);
      // Fallback without crossOrigin option
      (fabric.FabricImage || fabric.Image).fromURL(imageUrl).then((img: any) => {
        img.scaleToWidth(Math.min(320, canvasSize.width * 0.6));
        img.set({
          left: 100,
          top: 100
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      }).catch((e: any) => console.error("Fallback image load error", e));
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Local instant preview load
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result;
      if (typeof data === 'string' && fabric) {
        (fabric.FabricImage || fabric.Image).fromURL(data).then((img: any) => {
          img.scaleToWidth(Math.min(320, canvasSize.width * 0.6));
          img.set({
            left: 100,
            top: 100
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        }).catch((err: any) => console.error("Error loading local image", err));
      }
    };
    reader.readAsDataURL(file);

    // Also persist file to server /uploads so it is available in library
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('uploadedBy', 'Infographics Studio');
      await fetch('/api/infographics/upload', {
        method: 'POST',
        body: formData
      });
      fetchUploadedImages();
    } catch (uploadErr) {
      console.warn('Background upload to server failed:', uploadErr);
    }
  };
  
  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.requestRenderAll();
      saveHistory();
    }
  };
  
  const bringForward = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectForward(selectedObject);
    canvas.requestRenderAll();
    saveHistory();
  };
  
  const bringToFrontMethod = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectToFront(selectedObject);
    canvas.requestRenderAll();
    saveHistory();
  };
  
  const sendBackward = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectBackwards(selectedObject);
    canvas.requestRenderAll();
    saveHistory();
  };
  
  const sendToBackMethod = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectToBack(selectedObject);
    canvas.requestRenderAll();
    saveHistory();
  };

  const exportImage = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });
    const link = document.createElement('a');
    link.download = `${projectName}-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPngWithScale = (multiplier: number = 2) => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier
    });
    const link = document.createElement('a');
    link.download = `${projectName}-${multiplier}x-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSVG = () => {
    if (!canvas) return;
    try {
      const svgData = canvas.toSVG();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${projectName}-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ SVG');
    }
  };

  const exportJSON = () => {
    if (!canvas) return;
    try {
      const payload = {
        name: projectName,
        canvas: canvas.toJSON(),
        size: canvasSize,
        backgroundColor: backgroundColor,
        version: '1.0',
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${projectName}-project-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ JSON');
    }
  };
  
  const exportPDF = async () => {
    if (!canvas) return;
    try {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      });
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([canvasSize.width, canvasSize.height]);
      
      const imageBytes = await fetch(dataURL).then(res => res.arrayBuffer());
      const pdfImage = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: canvasSize.width,
        height: canvasSize.height,
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${projectName}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };
  
  const handleOpenSaveModal = () => {
    setSaveModalName(projectName || 'My Infographic');
    setSaveMode(currentProjectId ? 'overwrite' : 'copy');
    setShowSaveModal(true);
  };

  const saveProjectDB = async (overrideMode?: 'overwrite' | 'copy') => {
    if (!canvas || isSaving) return;
    setIsSaving(true);
    
    const effectiveMode = overrideMode || saveMode;
    const targetName = saveModalName.trim() || projectName.trim() || 'My Infographic';

    const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.5 });
    
    const payload = {
      canvas: canvas.toJSON(),
      size: canvasSize,
      backgroundColor: backgroundColor
    };

    try {
      if (currentProjectId && effectiveMode === 'overwrite') {
        const res = await fetch(`/api/infographics/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetName, data: JSON.stringify(payload), thumbnail })
        });

        if (!res.ok) throw new Error('Failed to update project');

        setProjectName(targetName);
        const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(nowStr);
        setShowSaveModal(false);
        setSaveToast({ message: `บันทึกอัปเดตโปรเจกต์ "${targetName}" เรียบร้อยแล้ว (เวลา ${nowStr} น.)`, type: 'success' });
      } else {
        const res = await fetch('/api/infographics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetName, data: JSON.stringify(payload), thumbnail })
        });

        if (!res.ok) throw new Error('Failed to create project');

        const data = await res.json();
        setCurrentProjectId(data.id);
        setProjectName(targetName);
        const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(nowStr);
        setShowSaveModal(false);
        setSaveToast({ message: `สร้างและบันทึกโปรเจกต์ใหม่ "${targetName}" เรียบร้อยแล้ว (เวลา ${nowStr} น.)`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setSaveToast({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveToast(null), 5000);
    }
  };

  const loadProjectDB = async (id: string) => {
    try {
      const res = await fetch(`/api/infographics/${id}`);
      if (res.ok) {
        const dbData = await res.json();
        const payload = JSON.parse(dbData.data);
        
        setCurrentProjectId(dbData.id);
        setProjectName(dbData.name);
        
        if (payload.size) setCanvasSize(payload.size);
        if (payload.backgroundColor) setBackgroundColor(payload.backgroundColor);
        
        if (canvas && payload.canvas) {
          canvas.loadFromJSON(payload.canvas, () => {
            const objs = canvas.getObjects();
            objs.forEach(async (obj) => {
              if ('fontFamily' in obj && obj.fontFamily) {
                await ensureGoogleFontLoaded(obj.fontFamily as string);
              }
            });
            canvas.requestRenderAll();
          });
        }
        setShowGallery(false);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดโปรเจกต์ได้');
    }
  };

  const handleOpenShare = async (targetProject?: InfographicShareSettings) => {
    if (targetProject) {
      setCurrentShareData(targetProject);
      setShowShareModal(true);
      return;
    }

    if (!canvas) return;

    setIsPreparingShare(true);
    try {
      const targetName = projectName.trim() || 'My Infographic';
      const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: 0.6 });
      const payload = {
        canvas: canvas.toJSON(),
        size: canvasSize,
        backgroundColor: backgroundColor
      };

      // 1. If project ID already exists, update latest design & thumbnail to server
      if (currentProjectId) {
        try {
          const updateRes = await fetch(`/api/infographics/${currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: targetName,
              data: JSON.stringify(payload),
              thumbnail,
              isPublic: true,
              allowEmbed: true,
              allowDownload: true,
              authorName: user?.name || user?.username || 'ผู้สร้างสรรค์ Infographic',
              authorDepartment: user?.department || 'หน่วยงานภาครัฐ'
            })
          });

          if (updateRes.ok) {
            const updated = await updateRes.json();
            setCurrentShareData(updated);
            setShowShareModal(true);
            return;
          }
        } catch (updateErr) {
          console.warn('Update failed, trying to create new project:', updateErr);
        }
      }

      // 2. Auto-create new project on server with isPublic = true
      const createRes = await fetch('/api/infographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          data: JSON.stringify(payload),
          thumbnail,
          isPublic: true,
          allowEmbed: true,
          allowDownload: true,
          authorName: user?.name || user?.username || 'ผู้สร้างสรรค์ Infographic',
          authorDepartment: user?.department || 'หน่วยงานภาครัฐ'
        })
      });

      if (createRes.ok) {
        const created = await createRes.json();
        setCurrentProjectId(created.id);
        setProjectName(targetName);
        setCurrentShareData(created);
        setShowShareModal(true);
      } else {
        throw new Error('Server returned non-OK status on create');
      }
    } catch (err) {
      console.error('Error preparing share:', err);
      alert('เกิดข้อผิดพลาดในการเตรียมระบบแชร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsPreparingShare(false);
    }
  };
  
  const clearCanvas = () => {
    if (!canvas) return;
    if (confirm('คุณต้องการล้างหน้ากระดานทั้งหมดใช่หรือไม่?')) {
      canvas.clear();
      canvas.backgroundColor = backgroundColor;
      canvas.requestRenderAll();
      saveHistory(); // This will trigger persistence
    }
  };

  // =========================================================
  // TEMPLATES BUILDERS
  // =========================================================

  // Template 1: Disaster Warning Template
  const loadDisasterWarningTemplate = () => {
    if (!canvas) return;
    const width = 1080;
    const height = 1620;
    setCanvasSize({ width, height });
    setBackgroundColor('#0b1a30'); 
    canvas.clear();
    canvas.backgroundColor = '#0b1a30';

    const objects: any[] = [];

    // Header Title
    objects.push(new fabric.Textbox('จังหวัดระยอง', {
      left: width / 2, top: 40, width: 600, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 55, fontWeight: 'bold',
    }));

    // Warning Banner
    objects.push(new fabric.Textbox('แจ้งเตือนภัย', {
      left: width / 2, top: 90, width: 800, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ff1111', fontSize: 150, fontWeight: 'bold',
      stroke: '#ffffff', strokeWidth: 8, shadow: new fabric.Shadow({ color: '#ff1111', blur: 20, offsetX: 0, offsetY: 0 })
    }));

    objects.push(new fabric.Textbox('ฝนตกหนักถึงหนักมาก และคลื่นลมแรง', {
      left: width / 2, top: 270, width: 900, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffde00', fontSize: 65, fontWeight: 'bold'
    }));

    // Date Pill
    objects.push(new fabric.Rect({
      left: width / 2, top: 380, originX: 'center', originY: 'center', fill: '#a01212', width: 700, height: 80, rx: 40, ry: 40, stroke: '#ffffff', strokeWidth: 3
    }));
    objects.push(new fabric.Textbox('เฝ้าระวังระหว่างวันที่ 6-9 สิงหาคม 2569', {
      left: width / 2, top: 380, width: 650, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 38, fontWeight: 'bold',
    }));

    // Info Box
    objects.push(new fabric.Rect({ left: 40, top: 480, width: 1000, height: 260, fill: 'rgba(5, 20, 50, 0.85)', rx: 20, ry: 20, stroke: '#ffde00', strokeWidth: 3 }));
    objects.push(new fabric.Textbox('กองอำนวยการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', { left: 70, top: 505, width: 940, fontFamily: 'Prompt', fill: '#ffde00', fontSize: 32, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('ขอให้ประชาชนในพื้นที่เสี่ยงภัย อำเภอเมืองระยอง อำเภอบ้านฉาง และอำเภอแกลง ติดตามสถานการณ์อย่างใกล้ชิด อาจเกิดน้ำป่าไหลหลาก น้ำท่วมฉับพลัน น้ำท่วมขัง และคลื่นลมแรงบริเวณชายฝั่ง', { left: 70, top: 565, width: 940, fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 26, lineHeight: 1.5 }));

    // Impact Cards
    objects.push(new fabric.Textbox('ผลกระทบที่อาจเกิดขึ้น', { left: width / 2, top: 780, width: 500, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffde00', fontSize: 36, fontWeight: 'bold' }));
    
    const createImpactCard = (x: number, y: number, text: string, color: string) => {
      objects.push(new fabric.Rect({ left: x, top: y, width: 220, height: 180, fill: '#1a3055', rx: 16, ry: 16, stroke: color, strokeWidth: 3 }));
      objects.push(new fabric.Rect({ left: x + 10, top: y + 10, width: 200, height: 90, fill: color + '22', rx: 12, ry: 12 }));
      objects.push(new fabric.Textbox(text, { left: x + 110, top: y + 115, width: 200, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 20, fontWeight: 'bold' }));
    };

    createImpactCard(50, 840, 'ฝนตกหนักสะสม', '#ef4444');
    createImpactCard(300, 840, 'น้ำป่าไหลหลาก', '#f97316');
    createImpactCard(550, 840, 'น้ำท่วมฉับพลัน', '#3b82f6');
    createImpactCard(800, 840, 'คลื่นลมแรงชายฝั่ง', '#06b6d4');

    // Bottom Prep Box
    objects.push(new fabric.Rect({ left: 40, top: 1060, width: 1000, height: 400, fill: '#13284a', rx: 20, ry: 20, stroke: '#5078c5', strokeWidth: 2 }));
    objects.push(new fabric.Textbox('การเตรียมความพร้อมของประชาชน', { left: width / 2, top: 1090, width: 800, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffde00', fontSize: 36, fontWeight: 'bold' }));

    const prepSteps = [
      '1. ติดตามข่าวสารจากทางราชการ และสายด่วนพยากรณ์อากาศ 1182 ตลอด 24 ชม.',
      '2. ขนย้ายสิ่งของขึ้นที่สูง และตรวจสอบระบบไฟฟ้า ปลั๊กไฟภายในบ้านเรือน',
      '3. เตรียมถุงยังชีพ สิ่งของจำเป็น ยาประจำตัว และเอกสารสำคัญให้พร้อม',
      '4. หลีกเลี่ยงการสัญจรผ่านเส้นทางน้ำท่วมขัง หรือบริเวณที่มีคลื่นลมแรง'
    ];

    prepSteps.forEach((st, idx) => {
      objects.push(new fabric.Rect({ left: 70, top: 1160 + (idx * 65), width: 940, height: 50, fill: '#1e3a6a', rx: 10, ry: 10 }));
      objects.push(new fabric.Textbox(st, { left: 90, top: 1172 + (idx * 65), width: 900, fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 22, fontWeight: 'bold' }));
    });

    // Footer Ribbon
    objects.push(new fabric.Rect({ left: 0, top: 1510, width: 1080, height: 110, fill: '#1b3266' }));
    objects.push(new fabric.Textbox('สายด่วนแจ้งเหตุสาธารณภัย ปภ. 1784 (ตลอด 24 ชั่วโมง)', { left: width / 2, top: 1545, width: 1000, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 32, fontWeight: 'bold' }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  };

  // Template 2: Executive Annual KPI Summary
  const loadKpiSummaryTemplate = () => {
    if (!canvas) return;
    const width = 1280;
    const height = 720;
    setCanvasSize({ width, height });
    setBackgroundColor('#0f172a');
    canvas.clear();
    canvas.backgroundColor = '#0f172a';

    const objects: any[] = [];

    // Header
    objects.push(new fabric.Textbox('สรุปผลการดำเนินงานประจำปี 2569 (Annual KPI Summary)', {
      left: 60, top: 40, width: 1000, fontFamily: 'Prompt', fill: '#ffffff', fontSize: 36, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox('รายงานความก้าวหน้าและประสิทธิภาพการให้บริการงานเอกสารดิจิทัล EDMS', {
      left: 60, top: 90, width: 1000, fontFamily: 'Sarabun', fill: '#94a3b8', fontSize: 20
    }));

    // Stat Cards
    const stats = [
      { num: '99.4%', label: 'ความพึงพอใจผู้ใช้งาน', color: '#10b981' },
      { num: '14,250', label: 'อนุมัติเอกสารดิจิทัล', color: '#3b82f6' },
      { num: '85%', label: 'ลดระยะเวลาประมวลผล', color: '#f59e0b' },
      { num: '0 ครั้ง', label: 'ข้อมูลสูญหาย (Zero Loss)', color: '#a855f7' }
    ];

    stats.forEach((st, i) => {
      const x = 60 + (i * 295);
      const y = 150;
      objects.push(new fabric.Rect({ left: x, top: y, width: 270, height: 160, rx: 16, ry: 16, fill: '#1e293b', stroke: st.color, strokeWidth: 2 }));
      objects.push(new fabric.Rect({ left: x, top: y, width: 270, height: 8, rx: 4, ry: 4, fill: st.color }));
      objects.push(new fabric.Textbox(st.num, { left: x + 135, top: y + 35, width: 250, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 44, fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(st.label, { left: x + 135, top: y + 105, width: 250, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#94a3b8', fontSize: 16, fontWeight: 'bold' }));
    });

    // KPI Progress Section
    objects.push(new fabric.Rect({ left: 60, top: 340, width: 720, height: 320, rx: 16, ry: 16, fill: '#1e293b', stroke: '#334155', strokeWidth: 1 }));
    objects.push(new fabric.Textbox('เป้าหมายตัวชี้วัดองค์กร (Key Performance Indicators)', { left: 90, top: 370, width: 660, fontFamily: 'Prompt', fill: '#f8fafc', fontSize: 22, fontWeight: 'bold' }));

    const kpiBars = [
      { label: 'อัตราการเปลี่ยนผ่านเป็น e-Document', pct: '95%', w: 600 },
      { label: 'การลงนามอนุมัติด้วย e-Signature', pct: '88%', w: 530 },
      { label: 'ความปลอดภัยระบบจัดเก็บเอกสารดิจิทัล', pct: '100%', w: 630 }
    ];

    kpiBars.forEach((bar, idx) => {
      const py = 430 + (idx * 70);
      objects.push(new fabric.Textbox(bar.label, { left: 90, top: py, width: 450, fontFamily: 'Sarabun', fill: '#cbd5e1', fontSize: 16, fontWeight: 'bold' }));
      objects.push(new fabric.Rect({ left: 90, top: py + 28, width: 630, height: 16, rx: 8, ry: 8, fill: '#334155' }));
      objects.push(new fabric.Rect({ left: 90, top: py + 28, width: bar.w, height: 16, rx: 8, ry: 8, fill: '#10b981' }));
      objects.push(new fabric.Textbox(bar.pct, { left: 720, top: py, width: 100, originX: 'right', fontFamily: 'Prompt', fill: '#10b981', fontSize: 18, fontWeight: 'bold' }));
    });

    // Highlights Side Card
    objects.push(new fabric.Rect({ left: 810, top: 340, width: 410, height: 320, rx: 16, ry: 16, fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2 }));
    objects.push(new fabric.Textbox('จุดเด่นและเป้าหมายถัดไป', { left: 840, top: 370, width: 350, fontFamily: 'Prompt', fill: '#60a5fa', fontSize: 22, fontWeight: 'bold' }));
    
    const highlights = [
      '• ขยายผลใช้งานครอบคลุมทุกกลุ่มงาน 100%',
      '• เชื่อมโยงระบบจัดเก็บลายมือชื่ออิเล็กทรอนิกส์',
      '• ยกระดับการสืบค้นเอกสารด้วยปัญญาประดิษฐ์ (AI)',
      '• รองรับมาตรฐานความปลอดภัย ISO 27001'
    ];

    highlights.forEach((hl, i) => {
      objects.push(new fabric.Textbox(hl, { left: 840, top: 420 + (i * 55), width: 350, fontFamily: 'Sarabun', fill: '#f1f5f9', fontSize: 16, lineHeight: 1.4 }));
    });

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  };

  // Template 3: 4-Step Process Flow
  const loadProcessFlowTemplate = () => {
    if (!canvas) return;
    const width = 1280;
    const height = 720;
    setCanvasSize({ width, height });
    setBackgroundColor('#f8fafc');
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';

    const objects: any[] = [];

    // Title
    objects.push(new fabric.Textbox('ขั้นตอนการเสนอและอนุมัติเอกสารดิจิทัล (4-Step Flow)', {
      left: width / 2, top: 40, width: 1000, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 36, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox('กระบวนการทำงานที่เป็นมาตรฐาน (Standard Operating Procedure)', {
      left: width / 2, top: 90, width: 800, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#64748b', fontSize: 20
    }));

    const steps = [
      { num: '1', title: 'ยื่นคำขอและร่างเอกสาร', desc: 'ผู้ขอสร้างร่างหนังสือในระบบ EDMS และแนบไฟล์อ้างอิง', color: '#3b82f6' },
      { num: '2', title: 'ตรวจสอบและคัดกรอง', desc: 'เจ้าหน้าที่กลุ่มงานตรวจสอบความถูกต้องของเนื้อหา', color: '#06b6d4' },
      { num: '3', title: 'ลงนามอนุมัติดิจิทัล', desc: 'ผู้บริหารลงนามผ่าน e-Signature พร้อมประทับเวลา', color: '#8b5cf6' },
      { num: '4', title: 'จัดเก็บและออกเลขรับ', desc: 'ระบบออกเลขทะเบียนรับ-ส่งอัตโนมัติและจัดเก็บถาวร', color: '#10b981' }
    ];

    steps.forEach((st, i) => {
      const x = 50 + (i * 295);
      const y = 200;

      // Card
      objects.push(new fabric.Rect({ left: x, top: y, width: 260, height: 320, rx: 20, ry: 20, fill: '#ffffff', stroke: st.color, strokeWidth: 3, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 5 }) }));
      
      // Circle Badge
      objects.push(new fabric.Circle({ left: x + 130, top: y - 25, radius: 30, fill: st.color, originX: 'center' }));
      objects.push(new fabric.Textbox(st.num, { left: x + 130, top: y - 25, originX: 'center', originY: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 32, fontWeight: 'bold' }));

      // Content
      objects.push(new fabric.Textbox(st.title, { left: x + 130, top: y + 50, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 20, fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(st.desc, { left: x + 130, top: y + 120, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#475569', fontSize: 16, lineHeight: 1.4 }));

      // Arrow indicator if not last
      if (i < 3) {
        objects.push(new fabric.Triangle({ left: x + 278, top: y + 140, width: 18, height: 24, angle: 90, fill: st.color, originX: 'center', originY: 'center' }));
      }
    });

    // Note Footer Box
    objects.push(new fabric.Rect({ left: 50, top: 580, width: 1180, height: 80, rx: 16, ry: 16, fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 1 }));
    objects.push(new fabric.Textbox('💡 ข้อควรจำ: ระบบมีการบันทึกประวัติการทำรายการ (Audit Log) ทุกขั้นตอน สามารถตรวจสอบย้อนหลังได้อย่างปลอดภัยตลอด 24 ชั่วโมง', { left: 80, top: 608, width: 1120, fontFamily: 'Sarabun', fill: '#1e40af', fontSize: 18, fontWeight: 'bold' }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  };

  // Preset Color Palettes
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
    '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', 
    '#a855f7', '#ec4899', '#64748b', '#0f172a'
  ];

  if (fabricError) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-center space-y-3 max-w-2xl mx-auto my-12 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400">ไม่สามารถเปิดใช้งาน Infographics Editor ได้</h3>
        <p className="text-sm text-red-600 dark:text-red-300 max-w-lg mx-auto">{fabricError}</p>
      </div>
    );
  }

  if (!fabricLoaded) {
    return (
      <div className="p-12 text-center space-y-3 my-12 animate-fade-in">
        <RefreshCw className="w-8 h-8 text-[var(--primary-color)] animate-spin mx-auto" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">กำลังเตรียมความพร้อมของเครื่องมือออกแบบ (Fabric Engine)...</p>
      </div>
    );
  }

  return (
    <div 
      ref={editorContainerRef}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen bg-[var(--bg-base)] shadow-2xl' : 'h-[calc(100vh-8rem)] bg-[var(--bg-base)]'} select-none transition-all`}
    >
      {/* Top Main Navigation Header Toolbar */}
      <div className="shrink-0 border-b border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between px-3 sm:px-4 overflow-x-auto whitespace-nowrap h-14 gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
              <Palette className="w-5 h-5" />
            </div>
            <h2 className="hidden lg:block text-base font-bold text-[var(--text-primary)] font-noto-serif-thai">
              Infographics Studio
            </h2>
          </div>
          
          <div className="w-px h-5 bg-[var(--border-medium)]"></div>
          
          <input 
            type="text" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-0.5 text-sm text-[var(--text-primary)] font-semibold max-w-[140px] sm:max-w-[200px]"
            placeholder="ชื่อโปรเจกต์..."
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Alignment Quick Bar (If object selected) */}
          {selectedObject && (
            <div className="hidden xl:flex items-center bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg p-1 gap-0.5">
              <button onClick={() => alignObject('left')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs" title="จัดชิดซ้าย"><AlignLeft className="w-3.5 h-3.5"/></button>
              <button onClick={() => alignObject('center-h')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs" title="กึ่งกลางแนวนอน"><AlignCenter className="w-3.5 h-3.5"/></button>
              <button onClick={() => alignObject('right')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs" title="จัดชิดขวา"><AlignRight className="w-3.5 h-3.5"/></button>
              <button onClick={() => alignObject('center-both')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-bold text-blue-500" title="ตรงกลางกระดาน"><Move className="w-3.5 h-3.5"/></button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              <button onClick={groupObjects} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs" title="รวมกลุ่ม (Group)"><Layers className="w-3.5 h-3.5"/></button>
              <button onClick={ungroupObjects} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs" title="ยกเลิกกลุ่ม (Ungroup)"><LayoutGrid className="w-3.5 h-3.5"/></button>
            </div>
          )}

          {/* Fit to screen button */}
          <button 
            onClick={() => fitToScreen()} 
            className="p-1.5 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] text-xs flex items-center gap-1 transition-colors"
            title="ปรับขนาดภาพให้พอดีหน้าจอ (Fit to Screen)"
          >
            <Scaling className="w-4 h-4 text-emerald-500" />
            <span className="hidden md:inline">พอดีจอ</span>
          </button>

          {/* Full Screen Toggle button */}
          <button 
            onClick={toggleFullscreen} 
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              isFullscreen 
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold shadow-sm ring-2 ring-amber-500/20' 
                : 'border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
            title={isFullscreen ? "ออกจากโหมดเต็มจอ (Esc)" : "แสดงผลเต็มจอ (Full Screen Mode)"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">ออกเต็มจอ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline">เต็มจอ</span>
              </>
            )}
          </button>

          {/* Ruler Toggle */}
          <button 
            onClick={() => setShowRuler(!showRuler)} 
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${showRuler ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold' : 'border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
            title="แสดง/ซ่อนไม้บรรทัด (Rulers)"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden md:inline">ไม้บรรทัด</span>
          </button>

          {/* Grid & Snap Dropdown Popover */}
          <div className="relative">
            <button 
              onClick={() => setShowRulerGridPopover(!showRulerGridPopover)} 
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${showGrid ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold' : 'border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="ตั้งค่าตารางนำสายตาและแม่เหล็กดูดติดเส้นกริด (Grid & Snap)"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden md:inline">ตาราง</span>
              {snapToGrid && <Magnet className="w-3 h-3 text-amber-500 ml-0.5" />}
            </button>

            {showRulerGridPopover && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-light)] p-3.5 z-50 animate-fade-in select-none">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)] mb-3">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    ตั้งค่าไม้บรรทัดและตารางนำสายตา
                  </h4>
                  <button 
                    onClick={() => setShowRulerGridPopover(false)} 
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <RulerGridControlPanel
                  showRuler={showRuler}
                  setShowRuler={setShowRuler}
                  rulerUnit={rulerUnit}
                  setRulerUnit={setRulerUnit}
                  showGrid={showGrid}
                  setShowGrid={setShowGrid}
                  gridStyle={gridStyle}
                  setGridStyle={setGridStyle}
                  gridSize={gridSize}
                  setGridSize={setGridSize}
                  gridOpacity={gridOpacity}
                  setGridOpacity={setGridOpacity}
                  snapToGrid={snapToGrid}
                  setSnapToGrid={setSnapToGrid}
                  guides={guides}
                  showGuides={showGuides}
                  setShowGuides={setShowGuides}
                  onAddCenterGuides={addCenterGuides}
                  onClearGuides={clearGuides}
                />
              </div>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex bg-[var(--bg-elevated)] rounded-lg p-0.5 border border-[var(--border-medium)]">
            <button onClick={undo} className="text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded transition-colors" title="ยกเลิก (Ctrl+Z)">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} className="text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded transition-colors" title="ทำซ้ำ (Ctrl+Y)">
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-[var(--border-medium)] mx-0.5"></div>

          {/* Gallery Button */}
          <button onClick={() => setShowGallery(true)} className="text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] p-1.5 sm:px-2.5 rounded-lg transition-colors flex items-center gap-1 text-xs border border-[var(--border-medium)]">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">แกลลอรี่</span>
          </button>

          {/* Save Button */}
          <button 
            onClick={handleOpenSaveModal} 
            disabled={isSaving} 
            className="text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] p-1.5 sm:px-3 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border border-[var(--border-medium)] bg-[var(--bg-surface)] shadow-sm active:scale-98"
            title="บันทึกข้อมูลและป้องกันการบันทึกซ้ำ"
          >
            <Save className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกโปรเจกต์'}</span>
            {lastSavedTime && (
              <span className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-normal">
                {lastSavedTime} น.
              </span>
            )}
          </button>

          {/* Share & Embed Button */}
          <button 
            onClick={() => handleOpenShare()} 
            disabled={isPreparingShare}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold p-1.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
            title="แชร์ลิงก์สาธารณะ (Public View Link) / ฝังโค้ด iframe Embed"
          >
            <Share2 className={`w-3.5 h-3.5 ${isPreparingShare ? 'animate-spin' : ''}`} />
            <span>{isPreparingShare ? 'กำลังเตรียม...' : 'แชร์ & Embed'}</span>
          </button>

          {/* Clear Canvas */}
          <button onClick={clearCanvas} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs" title="ล้างหน้ากระดาน">
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Export PNG / PDF */}
          <div className="flex bg-[var(--bg-elevated)] rounded-lg p-0.5 border border-[var(--border-medium)]">
            <button onClick={exportImage} className="text-[var(--text-primary)] hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1 rounded transition-colors flex items-center gap-1 text-xs font-semibold">
              <Download className="w-3.5 h-3.5 text-blue-500" /> PNG
            </button>
            <button onClick={exportPDF} className="bg-[var(--primary-color)] text-white hover:opacity-90 px-2.5 py-1 rounded transition-colors flex items-center gap-1 text-xs font-semibold shadow-sm">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        
        {/* Left Sidebar Icon-Nav + Tools Panel */}
        <div className={`${mobileTab === 'tools' ? 'flex fixed inset-x-0 bottom-14 top-1/4 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] rounded-t-3xl border-t-2 border-blue-500/30' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-80 md:border-r border-[var(--border-light)] bg-[var(--bg-surface)] z-10 shrink-0`}>
          
          {/* Vertical Sub-tab Bar */}
          <div className="w-14 shrink-0 bg-[var(--bg-canvas)] border-r border-[var(--border-light)] flex flex-col items-center py-3 gap-3">
            <button 
              onClick={() => setActiveSidebarTab('shapes')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'shapes' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="รูปร่าง & เส้น"
            >
              <Square className="w-5 h-5" />
              <span className="text-[9px] font-medium">รูปร่าง</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('elements')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'elements' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="องค์ประกอบ & สัญลักษณ์ (Elements)"
            >
              <Shapes className="w-5 h-5" />
              <span className="text-[9px] font-medium">องค์ประกอบ</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('text')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'text' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="ข้อความ"
            >
              <Type className="w-5 h-5" />
              <span className="text-[9px] font-medium">ข้อความ</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('infographic')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'infographic' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="องค์ประกอบ Infographics"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[9px] font-medium">กราฟิก</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('images')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'images' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="คลังรูปภาพที่อัปโหลด (Image Library)"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-[9px] font-medium">รูปภาพ</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('ai')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'ai' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="ผู้ช่วยออกแบบด้วย AI"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[9px] font-medium">AI</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebarTab('templates')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'templates' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="แม่แบบสำเร็จรูป"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[9px] font-medium">แม่แบบ</span>
            </button>

            <button 
              onClick={() => setActiveSidebarTab('canvas')} 
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${activeSidebarTab === 'canvas' ? 'bg-blue-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              title="ตั้งค่ากระดาษ"
            >
              <Sliders className="w-5 h-5" />
              <span className="text-[9px] font-medium">กระดาษ</span>
            </button>
          </div>

          {/* Sub-panel Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Mobile Drawer Header */}
            <div className="md:hidden flex items-center justify-between pb-2.5 border-b border-[var(--border-light)] mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-bold text-[var(--text-primary)]">เครื่องมือออกแบบ</span>
              </div>
              <button 
                onClick={() => setMobileTab('canvas')} 
                className="px-2.5 py-1 text-xs bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] rounded-lg font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> ปิด
              </button>
            </div>
            
            {/* Shapes & Lines Tab */}
            {activeSidebarTab === 'shapes' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">รูปร่างเรขาคณิต (Shapes)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => addShapePreset('rect')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Square className="w-4 h-4 text-blue-500" /> สี่เหลี่ยม
                  </button>
                  <button onClick={() => addShapePreset('circle')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Circle className="w-4 h-4 text-emerald-500" /> วงกลม
                  </button>
                  <button onClick={() => addShapePreset('triangle')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Triangle className="w-4 h-4 text-amber-500" /> สามเหลี่ยม
                  </button>
                  <button onClick={() => addShapePreset('polygon')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Hash className="w-4 h-4 text-purple-500" /> หกเหลี่ยม
                  </button>
                  <button onClick={() => addShapePreset('star')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> ดาว 5 แฉก
                  </button>
                  <button onClick={() => addShapePreset('line')} className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <Minus className="w-4 h-4 text-slate-500" /> เส้นตรง
                  </button>
                  <button onClick={() => addShapePreset('arrow')} className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-xs font-semibold text-[var(--text-primary)] transition-all">
                    <ArrowRight className="w-4 h-4 text-blue-500" /> ลูกศรนำสายตา (Arrow)
                  </button>
                </div>

                <div className="pt-3 border-t border-[var(--border-light)] space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">รูปภาพ (Images)</h3>
                    <button 
                      onClick={() => setShowImageLibraryModal(true)} 
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3" /> ดูคลังรูปภาพ
                    </button>
                  </div>
                  <label className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border-medium)] hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>อัปโหลดรูปภาพใหม่</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <button 
                    onClick={() => setActiveSidebarTab('images')}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:border-blue-500 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <Grid className="w-3.5 h-3.5 text-indigo-500" />
                    <span>เลือกจากคลังรูปที่เคยอัปโหลด</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI Assistant Tab */}
            {activeSidebarTab === 'ai' && (
              <div className="space-y-4">
                <InfographicsAiAssistant onImageSelected={(src: string) => {
                  if (canvas && fabric) {
                    (fabric.FabricImage || fabric.Image).fromURL(src).then((img: any) => {
                      img.scaleToWidth(Math.min(320, canvasSize.width * 0.6));
                      img.set({ left: 100, top: 100 });
                      canvas.add(img);
                      canvas.setActiveObject(img);
                      canvas.requestRenderAll();
                    });
                  }
                }} />
              </div>
            )}

            {/* Elements & Symbols Tab */}
            {activeSidebarTab === 'elements' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={elementSearchQuery}
                    onChange={(e) => setElementSearchQuery(e.target.value)}
                    placeholder="ค้นหาองค์ประกอบ, สัญลักษณ์, ไอคอน..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-overlay)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {elementSearchQuery && (
                    <button
                      onClick={() => setElementSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'stickers', label: '🌟 สติกเกอร์ & ป้าย 3D' },
                    { id: 'icons', label: '🎯 ไอคอนเวกเตอร์' },
                    { id: 'stamps', label: '📑 ตรายางราชการ' },
                    { id: 'flowchart', label: '🔀 ผังงาน' },
                    { id: 'diagrams', label: '📊 ไดอะแกรม' },
                    { id: 'dividers', label: '➖ เส้นคั่น' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setElementCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                        elementCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-blue-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Section: Decorative Stickers & 3D Badges */}
                {(elementCategory === 'all' || elementCategory === 'stickers') && (!elementSearchQuery || 'สติกเกอร์ sticker badge hot new release alert urgent verified seal top rated best choice free thai digital secure tip deadline pin kpi standard eco green thank you announce score 100'.includes(elementSearchQuery.toLowerCase())) && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        สติกเกอร์ & ป้ายกราฟิก 3D (Stickers & Badges)
                      </h4>
                      <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">18 รายการ</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'hot-topic', title: 'HOT TOPIC', desc: 'ประเด็นร้อน/ไฮไลต์', emoji: '🔥', bg: 'bg-red-500/10 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400' },
                        { id: 'new-release', title: 'NEW! ใหม่ล่าสุด', desc: 'ฟีเจอร์/ประกาศใหม่', emoji: '✨', bg: 'bg-sky-500/10 border-sky-300 text-sky-600 dark:border-sky-800 dark:text-sky-400' },
                        { id: 'urgent-alert', title: 'ด่วนพิเศษ!', desc: 'เตือนภัย/เร่งด่วน', emoji: '⚡', bg: 'bg-amber-500/10 border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400' },
                        { id: 'verified-seal', title: '100% VERIFIED', desc: 'ผ่านการตรวจสอบ', emoji: '✓', bg: 'bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400' },
                        { id: 'top-rated', title: 'TOP RATED', desc: 'ยอดนิยมอันดับ 1', emoji: '👑', bg: 'bg-indigo-500/10 border-indigo-300 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400' },
                        { id: 'best-choice', title: 'BEST CHOICE', desc: 'ทางเลือกดีเด่น', emoji: '🏆', bg: 'bg-amber-500/10 border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-300' },
                        { id: 'free-badge', title: 'FREE ฟรี!', desc: 'บริการไม่มีค่าใช้จ่าย', emoji: '🎁', bg: 'bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400' },
                        { id: 'thai-digital', title: 'THAILAND 4.0', desc: 'ทรานส์ฟอร์มดิจิทัล', emoji: '🇹🇭', bg: 'bg-blue-500/10 border-blue-300 text-blue-600 dark:border-blue-800 dark:text-blue-400' },
                        { id: 'secure-badge', title: '100% SECURE', desc: 'ความปลอดภัยสูง', emoji: '🔒', bg: 'bg-slate-500/10 border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300' },
                        { id: 'smart-tip', title: 'SMART TIP', desc: 'เทคนิคข้อแนะนำ', emoji: '💡', bg: 'bg-yellow-500/10 border-yellow-300 text-yellow-600 dark:border-yellow-800 dark:text-yellow-400' },
                        { id: 'deadline-urgent', title: 'DEADLINE!', desc: 'กำหนดส่งด่วน', emoji: '⏳', bg: 'bg-rose-500/10 border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400' },
                        { id: 'pinned-note', title: 'PINNED NOTE', desc: 'ปักหมุดเรื่องสำคัญ', emoji: '📌', bg: 'bg-yellow-500/10 border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-300' },
                        { id: 'kpi-target', title: '100% KPI', desc: 'บรรลุเป้าหมาย', emoji: '🎯', bg: 'bg-red-500/10 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400' },
                        { id: 'gov-standard', title: 'GOV STANDARD', desc: 'มาตรฐานสารบรรณ', emoji: '🏛️', bg: 'bg-blue-500/10 border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300' },
                        { id: 'eco-friendly', title: 'ECO GREEN', desc: 'รักษ์สิ่งแวดล้อม', emoji: '🌿', bg: 'bg-green-500/10 border-green-300 text-green-600 dark:border-green-800 dark:text-green-400' },
                        { id: 'thank-you', title: 'THANK YOU', desc: 'ขอบพระคุณทุกท่าน', emoji: '❤️', bg: 'bg-pink-500/10 border-pink-300 text-pink-600 dark:border-pink-800 dark:text-pink-400' },
                        { id: 'announcement', title: 'ประกาศสำคัญ!', desc: 'แจ้งให้ทราบโดยทั่วกัน', emoji: '📢', bg: 'bg-fuchsia-500/10 border-fuchsia-300 text-fuchsia-600 dark:border-fuchsia-800 dark:text-fuchsia-400' },
                        { id: 'score-100', title: 'คะแนนเต็ม 100!', desc: 'เกณฑ์ประเมินยอดเยี่ยม', emoji: '💯', bg: 'bg-red-500/10 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400' },
                      ]
                        .filter((st) => !elementSearchQuery || st.title.toLowerCase().includes(elementSearchQuery.toLowerCase()) || st.desc.toLowerCase().includes(elementSearchQuery.toLowerCase()) || st.id.includes(elementSearchQuery.toLowerCase()))
                        .map((st) => (
                          <button
                            key={st.id}
                            onClick={() => addDecorativeSticker(st.id)}
                            className={`p-2.5 rounded-xl border ${st.bg} hover:scale-[1.02] active:scale-[0.98] text-left transition-all group flex flex-col justify-between`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg leading-none">{st.emoji}</span>
                              <div className="text-xs font-bold font-prompt leading-tight truncate">{st.title}</div>
                            </div>
                            <div className="text-[10px] opacity-80 truncate">{st.desc}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Section 1: Official Government Stamps */}
                {(elementCategory === 'all' || elementCategory === 'stamps') && (!elementSearchQuery || 'ด่วน ลับ อนุมัติ สำเนา ลงรับ ตรายาง stamp urgent approved'.includes(elementSearchQuery.toLowerCase())) && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Stamp className="w-3.5 h-3.5 text-red-500" />
                        ตรายาง & สัญลักษณ์ประทับ (Official Stamps)
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addOfficialStamp('urgent')}
                        className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500 text-left transition-all group"
                      >
                        <div className="text-xs font-bold text-red-600 dark:text-red-400 font-prompt">ด่วนที่สุด</div>
                        <div className="text-[10px] text-red-500/80">URGENT STAMP</div>
                      </button>

                      <button
                        onClick={() => addOfficialStamp('secret')}
                        className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-500 text-left transition-all group"
                      >
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-400 font-prompt">ลับมาก</div>
                        <div className="text-[10px] text-rose-500/80">TOP SECRET</div>
                      </button>

                      <button
                        onClick={() => addOfficialStamp('approved')}
                        className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500 text-left transition-all group"
                      >
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-prompt">✓ อนุมัติแล้ว</div>
                        <div className="text-[10px] text-emerald-500/80">APPROVED</div>
                      </button>

                      <button
                        onClick={() => addOfficialStamp('copy')}
                        className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500 text-left transition-all group"
                      >
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-prompt">สำเนาถูกต้อง</div>
                        <div className="text-[10px] text-blue-500/80">TRUE COPY</div>
                      </button>

                      <button
                        onClick={() => addOfficialStamp('received')}
                        className="col-span-2 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-500 text-left transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 font-prompt">ลงรับเอกสารแล้ว</div>
                          <div className="text-[10px] text-purple-500/80">RECEIVED • ระบบสารบรรณ</div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-purple-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 2: Vector Icons with Subcategories and Color Selector */}
                {(elementCategory === 'all' || elementCategory === 'icons') && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        ไอคอนเวกเตอร์กราฟิก (Vector Icons)
                      </h4>
                      <span className="text-[10px] text-blue-500 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {Object.keys(SVG_ICON_DATA).length} ไอคอน
                      </span>
                    </div>

                    {/* Subcategories Filter */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                      {[
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'gov', label: '🏛️ ราชการ' },
                        { id: 'tech', label: '💻 ไอที/AI' },
                        { id: 'finance', label: '📊 สถิติ/การเงิน' },
                        { id: 'comm', label: '📢 สื่อสาร' },
                        { id: 'symbols', label: '✨ สัญลักษณ์' },
                        { id: 'safety', label: '🛡️ ปลอดภัย' },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setIconSubCategory(sub.id as any)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all ${
                            iconSubCategory === sub.id
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {/* Icon Color Picker Quick Palette */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-xs">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">สีไอคอนตอนวาง:</span>
                      <div className="flex items-center gap-1">
                        {['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#0f172a', '#ffffff'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setIconActiveColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-4 h-4 rounded-full border ${iconActiveColor === c ? 'ring-2 ring-blue-500 scale-110' : 'border-gray-300 dark:border-gray-600'} transition-transform`}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={iconActiveColor}
                          onChange={(e) => setIconActiveColor(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0 ml-1"
                          title="เลือกสีกำหนดเอง"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {Object.entries(SVG_ICON_DATA)
                        .filter(([key, item]) => {
                          const matchesCat = iconSubCategory === 'all' || item.category === iconSubCategory;
                          const matchesSearch = !elementSearchQuery || item.label.toLowerCase().includes(elementSearchQuery.toLowerCase()) || key.toLowerCase().includes(elementSearchQuery.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        .map(([key, item]) => (
                          <button
                            key={key}
                            onClick={() => addVectorIcon(key)}
                            className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
                            title={item.label}
                          >
                            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current transition-transform group-hover:scale-110" style={{ color: iconActiveColor || item.defaultColor }}>
                              <path d={item.path} />
                            </svg>
                            <span className="text-[9px] text-[var(--text-secondary)] truncate w-full font-medium">
                              {item.label.split('(')[0].trim()}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Flowchart Shapes */}
                {(elementCategory === 'all' || elementCategory === 'flowchart') && (!elementSearchQuery || 'ผังงาน flowchart จุดเริ่มต้น เงื่อนไข ตัดสินใจ กระบวนการ ฐานข้อมูล เอกสาร'.includes(elementSearchQuery.toLowerCase())) && (
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      บล็อกผังกระบวนการ (Flowchart Blocks)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => addFlowchartShape('capsule')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">จุดเริ่มต้น/สิ้นสุด</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Terminator Capsule</div>
                      </button>

                      <button
                        onClick={() => addFlowchartShape('process')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-[var(--text-primary)]">กล่องกระบวนการ</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Process Action Box</div>
                      </button>

                      <button
                        onClick={() => addFlowchartShape('diamond')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-amber-500 hover:bg-amber-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">เงื่อนไขตัดสินใจ</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Decision Diamond</div>
                      </button>

                      <button
                        onClick={() => addFlowchartShape('parallelogram')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">ข้อมูลนำเข้า/ส่งออก</div>
                        <div className="text-[10px] text-[var(--text-muted)]">I/O Parallelogram</div>
                      </button>

                      <button
                        onClick={() => addFlowchartShape('cylinder')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-indigo-500 hover:bg-indigo-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">ฐานข้อมูล DB</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Database Storage</div>
                      </button>

                      <button
                        onClick={() => addFlowchartShape('document')}
                        className="p-2.5 rounded-xl border border-[var(--border-light)] hover:border-emerald-500 hover:bg-emerald-500/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">หนังสือคำสั่ง</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Document Result</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 4: Infographic Flow & Diagram Cards */}
                {(elementCategory === 'all' || elementCategory === 'diagrams') && (!elementSearchQuery || 'ไดอะแกรม diagram การ์ด สถิติ kpi ขั้นตอน เปรียบเทียบ เช็คลิสต์ คำคม ริบบิ้น'.includes(elementSearchQuery.toLowerCase())) && (
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      การ์ด & ไดอะแกรมสรุปข้อมูล (Diagrams)
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => addAdvancedInfographic('step-card')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">การ์ดขั้นตอนมีลำดับ (Step 01 Card)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">พร้อมวงกลมหมายเลขและคำอธิบาย</div>
                        </div>
                        <Bookmark className="w-4 h-4 text-blue-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('comparison')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">กล่องเปรียบเทียบ (DO vs DON'T)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">ข้อควรปฏิบัติ และ ข้อห้าม/ข้อควรระวัง</div>
                        </div>
                        <Compass className="w-4 h-4 text-emerald-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('checklist')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-teal-500 hover:bg-teal-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">การ์ดเช็คลิสต์ (Checklist Card)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">รายการตรวจสอบ 3 ประเด็นสำคัญ</div>
                        </div>
                        <FileCheck className="w-4 h-4 text-teal-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('donut-stat')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">วงกลมสถิติเปอร์เซ็นต์ (Donut Stat)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">แสดงความสำเร็จของเป้าหมาย 85%</div>
                        </div>
                        <PieChart className="w-4 h-4 text-indigo-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('kpi-gauge')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">เกจวัดความเร็ว KPI (Speed Gauge)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">แถบระดับคะแนน แดง/เหลือง/เขียว</div>
                        </div>
                        <Target className="w-4 h-4 text-amber-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('quote')}
                        className="w-full text-left p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-blue-700 dark:text-blue-400">กล่องคำคม/ข้อความอ้างอิง (Quote)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">พร้อมเครื่องหมายคำพูดและที่มา</div>
                        </div>
                        <Quote className="w-4 h-4 text-blue-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('ribbon-banner')}
                        className="w-full text-left p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-500 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-purple-700 dark:text-purple-400">ริบบิ้นหัวข้อพับมุม (Ribbon Banner)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">แถบพาดหัวสรุปผลงานระดับพรีเมียม</div>
                        </div>
                        <Award className="w-4 h-4 text-purple-500" />
                      </button>

                      <button
                        onClick={() => addAdvancedInfographic('tag-pill')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">ป้ายแท็กสถานะ (Status Pill)</div>
                          <div className="text-[11px] text-[var(--text-muted)]">ป้ายกำกับข้อความสั้น</div>
                        </div>
                        <Tag className="w-4 h-4 text-emerald-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 5: Decorative Dividers */}
                {(elementCategory === 'all' || elementCategory === 'dividers') && (!elementSearchQuery || 'เส้นคั่น divider arrow ลูกศร ประ'.includes(elementSearchQuery.toLowerCase())) && (
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <Minus className="w-3.5 h-3.5 text-gray-500" />
                      เส้นคั่น & ตัวเชื่อม (Dividers & Connectors)
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => addDecorativeDivider('dashed-dot')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all"
                      >
                        <div className="text-xs font-bold text-[var(--text-primary)]">เส้นประคั่นจุดเพชรกลาง</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Dashed Diamond Separator</div>
                      </button>

                      <button
                        onClick={() => addDecorativeDivider('double-arrow')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all"
                      >
                        <div className="text-xs font-bold text-[var(--text-primary)]">ลูกศรสองทิศทาง (Flow Connector)</div>
                        <div className="text-[11px] text-[var(--text-muted)]">เชื่อมโยงขั้นตอนไป-กลับ</div>
                      </button>

                      <button
                        onClick={() => addDecorativeDivider('gradient-line')}
                        className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all"
                      >
                        <div className="text-xs font-bold text-[var(--text-primary)]">เส้นคู่แบ่งเซกชัน (Double Rule)</div>
                        <div className="text-[11px] text-[var(--text-muted)]">เส้นไฮไลต์แบ่งหัวข้อและเนื้อหา</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Tab */}
            {activeSidebarTab === 'text' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">รูปแบบข้อความ (Typography Presets)</h3>
                <button onClick={() => addTextPreset('h1')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all">
                  <div className="text-lg font-bold font-prompt text-[var(--text-primary)]">หัวข้อใหญ่ (Heading 1)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">ขนาด 44px ตัวหนา</div>
                </button>

                <button onClick={() => addTextPreset('h2')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all">
                  <div className="text-sm font-bold font-prompt text-[var(--text-primary)]">หัวข้อย่อย (Sub Heading)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">ขนาด 28px</div>
                </button>

                <button onClick={() => addTextPreset('body')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all">
                  <div className="text-xs font-sarabun text-[var(--text-primary)]">เพิ่มรายละเอียดข้อความทั่วไป...</div>
                  <div className="text-[11px] text-[var(--text-muted)]">ขนาด 18px</div>
                </button>

                <button onClick={() => addTextPreset('callout')} className="w-full text-left p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500 transition-all">
                  <div className="text-xs font-bold font-sarabun text-blue-600 dark:text-blue-400">กล่องเน้นข้อความสำคัญ (Callout)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">พร้อมพื้นหลังเน้นสายตา</div>
                </button>
              </div>
            )}

            {/* Infographic Kit Elements Tab */}
            {activeSidebarTab === 'infographic' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">ชุดกราฟิกอินโฟกราฟิก (Infographic Kits)</h3>
                <button onClick={() => addInfographicComponent('stat-card')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">การ์ดเน้นสถิติ (Stat Highlight)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">แสดงตัวเลขและข้อความคำอธิบาย</div>
                  </div>
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                </button>

                <button onClick={() => addInfographicComponent('badge-num')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">ป้ายวงกลมตัวเลข (Number Badge)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">สำหรับจัดลำดับขั้นตอน 1, 2, 3</div>
                  </div>
                  <Award className="w-5 h-5 text-blue-500" />
                </button>

                <button onClick={() => addInfographicComponent('progress-bar')} className="w-full text-left p-3 rounded-xl border border-[var(--border-light)] hover:border-cyan-500 hover:bg-cyan-500/5 transition-all flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">แถบความคืบหน้า (Progress Bar)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">แสดงเปอร์เซ็นต์ KPI และเป้าหมาย</div>
                  </div>
                  <Activity className="w-5 h-5 text-cyan-500" />
                </button>

                <button onClick={() => addInfographicComponent('alert-bar')} className="w-full text-left p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500 transition-all flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-red-700 dark:text-red-400">แถบประกาศเตือนภัย (Alert Banner)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">สำหรับเรื่องเร่งด่วน</div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </button>

                {/* เครื่องมือสร้างตาราง (Table Creator Tool) */}
                <div className="border-t border-[var(--border-light)] pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] font-noto-serif-thai flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-indigo-500" />
                    เครื่องมือสร้างตารางข้อมูล (Table Creator)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                    กำหนดจำนวนแถวและคอลัมน์เพื่อสร้างตารางข้อมูลสำหรับแทรกลงภาพอินโฟกราฟิก
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2.5 font-sans">
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium mb-1 block">จำนวนแถว (Rows)</label>
                      <input 
                        type="number" 
                        min="2" 
                        max="10" 
                        value={tableRows} 
                        onChange={(e) => setTableRows(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                        className="w-full border border-[var(--border-light)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 bg-[var(--bg-overlay)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium mb-1 block">จำนวนคอลัมน์ (Cols)</label>
                      <input 
                        type="number" 
                        min="2" 
                        max="8" 
                        value={tableCols} 
                        onChange={(e) => setTableCols(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))}
                        className="w-full border border-[var(--border-light)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 bg-[var(--bg-overlay)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => addTableComponent(tableRows, tableCols)} 
                    className="w-full text-center p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    สร้างตารางข้อมูล ({tableRows} แถว x {tableCols} คอลัมน์)
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-sans">
                    💡 ดับเบิ้ลคลิกเพื่อแก้ไขตัวอักษรในช่องได้โดยตรง หรือกดปุ่ม "ยกเลิกกลุ่ม (Ungroup)" เพื่อแยกแก้ไขช่องเซลล์แต่ละช่องได้อย่างอิสระ
                  </p>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeSidebarTab === 'templates' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">แม่แบบสำเร็จรูป (Templates)</h3>
                
                <button onClick={loadDisasterWarningTemplate} className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-800 transition-all">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800 dark:text-red-200">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>1. แจ้งเตือนสาธารณภัย / สภาวะอากาศ</span>
                  </div>
                  <p className="text-[11px] text-red-600 dark:text-red-300 mt-1">โทนสีน้ำเงินเข้ม-แดง สำหรับงาน ปภ. และสภาวะฉุกเฉิน</p>
                </button>

                <button onClick={loadKpiSummaryTemplate} className="w-full text-left p-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white transition-all">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>2. สรุปผลงานประจำปี / KPI Summary</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">อินโฟกราฟิกผู้บริหาร แสดงตัวเลขสำคัญและแถบเป้าหมาย</p>
                </button>

                <button onClick={loadProcessFlowTemplate} className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 transition-all">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-900 dark:text-blue-200">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span>3. ขั้นตอนการปฏิบัติงาน (4-Step Flow)</span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">กระบวนการยื่นคำขอและอนุมัติเอกสารแบบลำดับ</p>
                </button>
              </div>
            )}

            {/* Canvas Settings Tab */}
            {activeSidebarTab === 'canvas' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">ตั้งค่าขนาดและพื้นหลัง</h3>
                
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">ขนาดหน้ากระดาษ</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-xs font-semibold"
                    value={`${canvasSize.width}x${canvasSize.height}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      setCanvasSize({ width: w, height: h });
                    }}
                  >
                    <option value="1280x720">HD (16:9) - 1280 x 720 px</option>
                    <option value="1920x1080">Full HD (16:9) - 1920 x 1080 px</option>
                    <option value="800x600">การนำเสนอ (4:3) - 800 x 600 px</option>
                    <option value="1080x1620">โพสเตอร์แนวตั้ง - 1080 x 1620 px</option>
                    <option value="1080x1080">จัตุรัส (Square) - 1080 x 1080 px</option>
                    <option value="794x1123">A4 แนวตั้ง - 794 x 1123 px</option>
                    <option value="1123x794">A4 แนวนอน - 1123 x 794 px</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-2 block">สีพื้นหลังกระดาน</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {presetColors.map(color => (
                      <button 
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-6 h-6 rounded-full border ${backgroundColor === color ? 'border-2 border-blue-500 scale-110 shadow' : 'border-gray-200'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={backgroundColor} 
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{backgroundColor}</span>
                  </div>
                </div>

                {/* Ruler & Grid System Settings Section */}
                <div className="pt-3 border-t border-[var(--border-light)] space-y-3">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    ไม้บรรทัด & เส้นตารางนำสายตา
                  </h3>
                  <RulerGridControlPanel
                    showRuler={showRuler}
                    setShowRuler={setShowRuler}
                    rulerUnit={rulerUnit}
                    setRulerUnit={setRulerUnit}
                    showGrid={showGrid}
                    setShowGrid={setShowGrid}
                    gridStyle={gridStyle}
                    setGridStyle={setGridStyle}
                    gridSize={gridSize}
                    setGridSize={setGridSize}
                    gridOpacity={gridOpacity}
                    setGridOpacity={setGridOpacity}
                    snapToGrid={snapToGrid}
                    setSnapToGrid={setSnapToGrid}
                    guides={guides}
                    showGuides={showGuides}
                    setShowGuides={setShowGuides}
                    onAddCenterGuides={addCenterGuides}
                    onClearGuides={clearGuides}
                  />
                </div>
              </div>
            )}

            {/* AI Designer Assistant Tab */}
            {activeSidebarTab === 'ai' && (
              <div className="space-y-4 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
                    <Sparkles className="w-4 h-4 animate-bounce-slow" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">ผู้ช่วยออกแบบด้วย AI (Gemini)</h3>
                </div>
                
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  ระบุหัวข้อที่คุณต้องการให้ออกแบบ ระบบจะสร้างโครงสร้างข้อมูลภาษาไทย คู่สีระดับมืออาชีพ ดัชนีสถิติตัวเลข และหัวข้อย่อยเพื่อแทรกลงในภาพทันที
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-primary)] block">หัวข้ออินโฟกราฟิก</label>
                  <textarea 
                    className="w-full p-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    rows={3}
                    placeholder="เช่น: คู่มือเตรียมความพร้อมรับมืออุทกภัย, แนะนำ 3 ขั้นตอนการจองเลขหนังสือราชการ..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>

                {/* Suggestions Quick Pills */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">หัวข้อยอดนิยมแนะนำ:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'คู่มือเตรียมพร้อมน้ำท่วมฉับพลัน',
                      'สรุปความก้าวหน้าโครงการ ปภ. ระยอง',
                      'สถิติการเกิดอุบัติเหตุบนท้องถนน',
                      '3 ขั้นตอนการลงทะเบียนหนังสือรับ'
                    ].map((pill) => (
                      <button
                        key={pill}
                        onClick={() => setAiPrompt(pill)}
                        className="text-[10px] bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-200 transition-all font-medium"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateAIDesign}
                  disabled={aiLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังออกแบบเนื้อหาและคู่สี...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      ออกแบบด้วย AI ทันที
                    </>
                  )}
                </button>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiResult && (
                  <div className="space-y-4 pt-2 border-t border-dashed border-[var(--border-medium)]">
                    
                    {/* Design Advice Callout */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 text-xs leading-relaxed">
                      <div className="flex items-center gap-1.5 mb-1 text-indigo-700 font-bold">
                        <Info className="w-3.5 h-3.5" />
                        <span>คำแนะนำจาก AI Designer:</span>
                      </div>
                      {aiResult.designAdvice}
                    </div>

                    {/* Colors suggestions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">🎨 โทนสีแนะนำสำหรับการออกแบบ</span>
                      <div className="flex items-center justify-between gap-1.5 bg-[var(--bg-canvas)] p-2 rounded-xl border border-[var(--border-light)]">
                        <div className="flex gap-1.5">
                          {aiResult.colors?.map((col: string) => (
                            <div 
                              key={col} 
                              className="w-6 h-6 rounded-lg border border-slate-200 shadow-sm relative group cursor-pointer" 
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => applyAIPalette(aiResult.colors)}
                          className="text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-all"
                        >
                          <Palette className="w-3 h-3" />
                          ใช้เป็นธีมรูปภาพ
                        </button>
                      </div>
                    </div>

                    {/* Suggested Title */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">📝 หัวข้อหลักและคำโปรย</span>
                        <button
                          onClick={() => insertAITitle(aiResult.title, aiResult.subtitle)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          แทรกลงกระดาษ
                        </button>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <h4 className="text-xs font-bold text-slate-900">{aiResult.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-normal">{aiResult.subtitle}</p>
                      </div>
                    </div>

                    {/* Text Sections */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">📄 โครงเรื่องและหัวข้อย่อย</span>
                      <div className="space-y-2">
                        {aiResult.textSections?.map((sect: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <h5 className="text-xs font-bold text-slate-900">{sect.heading}</h5>
                              <p className="text-[10px] text-slate-600 leading-normal">{sect.body}</p>
                            </div>
                            <button
                              onClick={() => insertAISect(sect.heading, sect.body)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold p-1 shrink-0 flex items-center gap-0.5"
                              title="แทรกลงกระดาษ"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metric / Stat suggestions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">📊 ดัชนีตัวเลขสถิติเด่น</span>
                      <div className="space-y-2">
                        {aiResult.stats?.map((st: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between gap-2"
                            style={{ borderLeftWidth: '4px', borderLeftColor: st.color || '#4f46e5' }}
                          >
                            <div>
                              <span className="text-base font-extrabold" style={{ color: st.color || '#4f46e5' }}>{st.value}</span>
                              <p className="text-[10px] text-slate-600 font-bold leading-none mt-1">{st.label}</p>
                            </div>
                            <button
                              onClick={() => insertAIStat(st.value, st.label, st.color)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold p-1 shrink-0 flex items-center gap-0.5"
                              title="แทรกลงกระดาษ"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Image Library (Uploaded Images) Tab */}
            {activeSidebarTab === 'images' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">คลังรูปภาพที่อัปโหลด</h3>
                  </div>
                  <button
                    onClick={() => setShowImageLibraryModal(true)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    title="เปิดมุมมองตารางใหญ่"
                  >
                    <Maximize2 className="w-3 h-3" /> ขยายเต็ม
                  </button>
                </div>

                {/* Upload Action */}
                <label className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-blue-400/60 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500 hover:bg-blue-500/10 transition-all cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingImageSidebar ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพใหม่'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImageSidebar}
                    onChange={async (e) => {
                      if (!e.target.files || !e.target.files[0]) return;
                      const file = e.target.files[0];
                      setIsUploadingImageSidebar(true);
                      try {
                        const formData = new FormData();
                        formData.append('files', file);
                        formData.append('uploadedBy', 'Infographics Studio');
                        const res = await fetch('/api/infographics/upload', {
                          method: 'POST',
                          body: formData
                        });
                        if (res.ok) {
                          const uploadData = await res.json();
                          await fetchUploadedImages();
                          if (uploadData.files && uploadData.files[0]) {
                            insertImageFromUrl(uploadData.files[0].url, uploadData.files[0].originalName);
                          }
                        }
                      } catch (err) {
                        console.error('Upload error:', err);
                      } finally {
                        setIsUploadingImageSidebar(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* Search & Refresh */}
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={imageLibrarySearch}
                      onChange={(e) => setImageLibrarySearch(e.target.value)}
                      placeholder="ค้นหารูปภาพ..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg focus:outline-none focus:border-blue-500 text-[var(--text-primary)]"
                    />
                  </div>
                  <button
                    onClick={fetchUploadedImages}
                    className="p-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)]"
                    title="โหลดใหม่"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loadingUploadedImages ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Category / Folder filter chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                  {['all', 'inbox', 'system', 'admin'].map((folder) => (
                    <button
                      key={folder}
                      onClick={() => setImageLibraryFolder(folder)}
                      className={`px-2.5 py-1 rounded-lg font-medium capitalize shrink-0 transition-colors ${
                        imageLibraryFolder === folder
                          ? 'bg-blue-500 text-white font-bold'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:bg-[var(--border-light)]'
                      }`}
                    >
                      {folder === 'all' ? 'ทั้งหมด' : folder}
                    </button>
                  ))}
                </div>

                {/* Images Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>คลิกรูปภาพเพื่อแทรกลงกระดาน</span>
                    <span>
                      {uploadedImagesList.filter(img => 
                        (imageLibraryFolder === 'all' || img.folder === imageLibraryFolder) &&
                        (imageLibrarySearch === '' || img.filename.toLowerCase().includes(imageLibrarySearch.toLowerCase()))
                      ).length} รายการ
                    </span>
                  </div>

                  {loadingUploadedImages ? (
                    <div className="py-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p>กำลังโหลดคลังรูปภาพ...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {uploadedImagesList
                        .filter(img => 
                          (imageLibraryFolder === 'all' || img.folder === imageLibraryFolder) &&
                          (imageLibrarySearch === '' || img.filename.toLowerCase().includes(imageLibrarySearch.toLowerCase()))
                        )
                        .map((img) => (
                          <div
                            key={img.id}
                            onClick={() => insertImageFromUrl(img.url, img.filename)}
                            className="group relative bg-[var(--bg-canvas)] border border-[var(--border-light)] hover:border-blue-500 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md aspect-square flex flex-col"
                            title={`คลิกเพื่อใส่: ${img.filename}`}
                          >
                            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center p-1 overflow-hidden">
                              <img
                                src={img.url}
                                alt={img.filename}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-1.5 bg-[var(--bg-surface)] border-t border-[var(--border-light)] text-[10px]">
                              <p className="font-semibold text-[var(--text-primary)] truncate">{img.filename}</p>
                              <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
                                <span className="uppercase text-blue-500 font-mono font-bold">{img.folder}</span>
                                <span>{(img.size / 1024).toFixed(0)} KB</span>
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">
                                + วางบนกระดาน
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {!loadingUploadedImages && uploadedImagesList.length === 0 && (
                    <div className="py-8 text-center bg-[var(--bg-canvas)] rounded-2xl border border-dashed border-[var(--border-medium)] p-4 space-y-2">
                      <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">ยังไม่มีรูปภาพในคลัง</p>
                      <p className="text-[10px] text-[var(--text-muted)]">อัปโหลดรูปภาพเพื่อนำมาจัดวางใน Infographics</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Main Canvas Area */}
        <div 
          ref={viewportContainerRef}
          className="flex-1 bg-slate-900/10 dark:bg-slate-950 overflow-auto flex items-center justify-center p-3 sm:p-4 md:p-8 relative z-0"
        >
          <div 
            className="shadow-2xl ring-1 ring-black/10 bg-white transition-all relative flex flex-col" 
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'center center',
            }}
          >
            {/* Top Ruler Row */}
            {showRuler && (
              <div className="flex items-center">
                <CanvasCornerBox unit={rulerUnit} onCycleUnit={cycleRulerUnit} />
                <CanvasHorizontalRuler
                  width={canvasSize.width}
                  unit={rulerUnit}
                  mousePos={mouseCanvasPos}
                  selectedBox={selectedBox}
                  guides={guides}
                  onAddGuide={addGuide}
                  onRemoveGuide={removeGuide}
                />
              </div>
            )}

            {/* Canvas Container with Left Ruler */}
            <div className="flex items-start relative">
              {showRuler && (
                <CanvasVerticalRuler
                  height={canvasSize.height}
                  unit={rulerUnit}
                  mousePos={mouseCanvasPos}
                  selectedBox={selectedBox}
                  guides={guides}
                  onAddGuide={addGuide}
                  onRemoveGuide={removeGuide}
                />
              )}

              {/* Canvas Viewport + Interactive Grid & Guides Overlay */}
              <div 
                className="relative"
                style={{ 
                  width: `${canvasSize.width}px`, 
                  height: `${canvasSize.height}px`,
                  backgroundColor: backgroundColor 
                }}
              >
                <canvas ref={canvasRef} />
                <CanvasGridOverlay
                  width={canvasSize.width}
                  height={canvasSize.height}
                  showGrid={showGrid}
                  gridStyle={gridStyle}
                  gridSize={gridSize}
                  gridOpacity={gridOpacity}
                  guides={guides}
                  showGuides={showGuides}
                  onRemoveGuide={removeGuide}
                />
              </div>
            </div>
          </div>

          {/* Floating Canvas Info (Dimensions & Mouse coordinates & Snap status) */}
          <div className="absolute bottom-6 left-6 hidden lg:flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 z-10">
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)] font-sans">ขนาด:</span>
              <span className="font-semibold text-[var(--text-primary)]">{canvasSize.width} × {canvasSize.height} px</span>
            </div>
            {mouseCanvasPos && (
              <>
                <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600"></div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                  <span>X: {mouseCanvasPos.x}</span>
                  <span>Y: {mouseCanvasPos.y}</span>
                </div>
              </>
            )}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)] font-sans">แม่เหล็ก:</span>
              <span className={`font-semibold ${snapToGrid ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>{snapToGrid ? 'เปิด' : 'ปิด'}</span>
            </div>
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)] font-sans">หน่วย:</span>
              <button 
                onClick={cycleRulerUnit} 
                className="font-bold text-indigo-500 hover:underline uppercase"
                title="คลิกเพื่อเปลี่ยนหน่วยวัด"
              >
                {rulerUnit}
              </button>
            </div>
          </div>

          {/* Floating Canvas Quick Navigation & Zoom Controls */}
          <div className="absolute bottom-4 sm:bottom-6 right-3 sm:right-6 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden text-xs z-10 divide-x divide-slate-200 dark:divide-slate-700">
            <div className="flex items-center">
              <button 
                onClick={() => setZoomLevel(Math.max(0.15, Math.round((zoomLevel - 0.1) * 100) / 100))} 
                className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                title="ย่อขนาด (Zoom Out)"
              >
                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className="px-2 sm:px-2.5 font-bold font-mono text-slate-700 dark:text-slate-200 min-w-[3.2rem] text-center text-[11px] sm:text-xs">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button 
                onClick={() => setZoomLevel(Math.min(3, Math.round((zoomLevel + 0.1) * 100) / 100))} 
                className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors"
                title="ขยายขนาด (Zoom In)"
              >
                +
              </button>
            </div>

            {/* Fit Screen Button */}
            <button 
              onClick={() => fitToScreen()} 
              className="px-2 sm:px-3 py-2 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 transition-colors"
              title="ปรับขนาดให้พอดีหน้าจอ (Fit to Screen)"
            >
              <Scaling className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พอดีจอ</span>
            </button>

            {/* 100% Reset */}
            <button 
              onClick={() => setZoomLevel(1)} 
              className="hidden sm:block px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors"
              title="ขนาดจริง 100%"
            >
              100%
            </button>

            {/* Fullscreen Quick Toggle */}
            <button 
              onClick={toggleFullscreen} 
              className={`p-2 sm:p-2.5 transition-colors flex items-center gap-1 ${
                isFullscreen 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' 
                  : 'hover:bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}
              title={isFullscreen ? "ออกจากโหมดเต็มจอ (Esc)" : "ขยายเต็มหน้าจอ (Full Screen)"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />}
            </button>
          </div>
        </div>

        {/* Right Sidebar - Object Properties Inspector */}
        <div className={`${mobileTab === 'properties' ? 'flex fixed inset-x-0 bottom-14 top-1/3 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] rounded-t-3xl border-t-2 border-blue-500/30' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-72 md:border-l border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto z-10 shrink-0`}>
          {/* Mobile Drawer Handle and Header */}
          <div className="md:hidden flex items-center justify-between pb-3 border-b border-[var(--border-light)] mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs font-bold text-[var(--text-primary)]">แถบคุณสมบัติวัตถุ</span>
            </div>
            <button 
              onClick={() => setMobileTab('canvas')} 
              className="px-2.5 py-1 text-xs bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] rounded-lg font-medium flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> ปิด
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">คุณสมบัติวัตถุ (Properties)</h3>
            {selectedObject && (
              <button 
                onClick={toggleLockSelected} 
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${isLocked ? 'bg-amber-500/15 border-amber-500 text-amber-600' : 'border-[var(--border-medium)] text-[var(--text-secondary)]'}`}
                title={isLocked ? "ปลดล็อควัตถุ" : "ล็อควัตถุไม่ให้เคลื่อนย้าย"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          
          {!selectedObject ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-xs space-y-2">
              <LayoutGrid className="w-10 h-10 mx-auto opacity-20" />
              <p>เลือกวัตถุบนหน้ากระดานเพื่อปรับแต่งสี ขนาด และเลเยอร์</p>
              <p className="text-[11px] text-[var(--text-muted)] opacity-75">คลิกขวาที่วัตถุหรือสติกเกอร์เพื่อเปิดเมนูด่วนหรือแยกชิ้นส่วนแก้ไข</p>
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              
              {/* Group / Ungroup Quick Action Banner */}
              {selectedObject.type === 'group' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>วัตถุนี้ถูกรวมกลุ่มอยู่ (Group)</span>
                    </div>
                    <span className="text-[10px] bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono">
                      {(selectedObject as any)._objects?.length || (selectedObject as any).getObjects?.()?.length || 0} ชิ้น
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
                    คลิกปุ่มด้านล่างหรือคลิกขวา/ดับเบิ้ลคลิก เพื่อยกเลิกกลุ่มและแก้ไขข้อความหรือสีรูปทรงด้านในได้ทันที
                  </p>
                  <button
                    type="button"
                    onClick={() => ungroupObjects(selectedObject)}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>🔓 ยกเลิกกลุ่ม (Ungroup) / แยกชิ้นส่วนแก้ไข</span>
                  </button>
                </div>
              )}

              {(selectedObject.type === 'activeSelection' || selectedObject.type === 'activeselection') && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-700/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>เลือกหลายวัตถุ ({(selectedObject as any)._objects?.length || (selectedObject as any).getObjects?.()?.length || 0} ชิ้น)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={groupObjects}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>📦 รวมกลุ่มวัตถุ (Group Selection)</span>
                  </button>
                </div>
              )}

              {/* Color & Fill */}
              <div className="space-y-2">
                <label className="font-bold text-[var(--text-primary)] block">สีเติม (Fill Color)</label>
                <div className="flex flex-wrap gap-1.5">
                  {presetColors.map(color => (
                    <button 
                      key={color}
                      onClick={() => handlePropertyChange('fill', color)}
                      className={`w-5 h-5 rounded-full border ${fillColor === color ? 'border-2 border-blue-500 scale-110 shadow' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button 
                    onClick={() => handlePropertyChange('fill', 'transparent')}
                    className={`w-5 h-5 rounded-full border bg-white flex items-center justify-center text-red-500 font-bold ${fillColor === 'transparent' ? 'border-2 border-blue-500' : 'border-gray-300'}`}
                    title="ไม่มีสีเติม"
                  >
                    /
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="color" 
                    value={fillColor === 'transparent' ? '#ffffff' : fillColor} 
                    onChange={(e) => handlePropertyChange('fill', e.target.value)}
                    className="w-7 h-7 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={fillColor} 
                    onChange={(e) => handlePropertyChange('fill', e.target.value)}
                    className="flex-1 p-1 text-xs border border-[var(--border-medium)] rounded bg-transparent font-mono text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Stroke / Border */}
              <div className="space-y-2 pt-3 border-t border-[var(--border-light)]">
                <label className="font-bold text-[var(--text-primary)] block">เส้นขอบ (Stroke & Border)</label>
                <div className="flex items-center justify-between gap-2">
                  <input 
                    type="color" 
                    value={strokeColor === 'transparent' ? '#000000' : strokeColor} 
                    onChange={(e) => handlePropertyChange('stroke', e.target.value)}
                    className="w-7 h-7 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  />
                  <button onClick={() => handlePropertyChange('stroke', 'transparent')} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded">
                    ไม่มีขอบ
                  </button>
                  <span className="font-mono text-[var(--text-muted)]">{strokeWidth}px</span>
                </div>
                <input 
                  type="range" min="0" max="20" 
                  value={strokeWidth} 
                  onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Corner Radius for Rectangles */}
              {selectedObject.type === 'rect' && (
                <div className="space-y-1.5 pt-3 border-t border-[var(--border-light)]">
                  <div className="flex justify-between font-bold text-[var(--text-primary)]">
                    <span>ความมนขอบ (Corner Radius)</span>
                    <span className="font-mono text-[var(--text-muted)]">{cornerRadius}px</span>
                  </div>
                  <input 
                    type="range" min="0" max="50" 
                    value={cornerRadius} 
                    onChange={(e) => handlePropertyChange('rx', parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}

              {/* Image Crop */}
              {selectedObject.type === 'image' && (
                <div className="space-y-1.5 pt-3 border-t border-[var(--border-light)]">
                  <label className="font-bold text-[var(--text-primary)] block">รูปภาพ (Image)</label>
                  <button
                    onClick={() => {
                      if (selectedObject && selectedObject.getSrc) {
                        setImageToCrop(selectedObject.getSrc());
                      } else if (selectedObject && selectedObject.src) {
                        setImageToCrop(selectedObject.src);
                      }
                    }}
                    className="w-full bg-[var(--bg-canvas)] hover:bg-[var(--border-light)] text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
                  >
                    <Crop className="w-4 h-4" />
                    <span>ตัดครอบรูปภาพ (Crop Image)</span>
                  </button>
                </div>
              )}

              {/* Opacity */}
              <div className="space-y-1.5 pt-3 border-t border-[var(--border-light)]">
                <div className="flex justify-between font-bold text-[var(--text-primary)]">
                  <span>ความโปร่งใส (Opacity)</span>
                  <span className="font-mono text-[var(--text-muted)]">{Math.round(opacity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={opacity} 
                  onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Text specific tools */}
              {(selectedObject.type === 'i-text' || selectedObject.type === 'textbox') && (
                <div className="space-y-3 pt-3 border-t border-[var(--border-light)]">
                  <label className="font-bold text-[var(--text-primary)] block">แบบอักษร (Typography)</label>
                  <FontSelector
                    currentFont={fontFamily}
                    onSelectFont={(newFont) => handlePropertyChange('fontFamily', newFont)}
                  />

                  <div>
                    <div className="flex justify-between font-bold text-[var(--text-primary)] mb-1">
                      <span>ขนาดอักษร</span>
                      <span className="font-mono text-[var(--text-muted)]">{fontSize}px</span>
                    </div>
                    <input 
                      type="range" min="10" max="180" 
                      value={fontSize} 
                      onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      onClick={() => handlePropertyChange('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`p-1.5 rounded border flex justify-center ${fontWeight === 'bold' ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePropertyChange('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`p-1.5 rounded border flex justify-center ${fontStyle === 'italic' ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePropertyChange('underline', !underline)}
                      className={`p-1.5 rounded border flex justify-center ${underline ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      onClick={() => handlePropertyChange('textAlign', 'left')}
                      className={`p-1.5 rounded border flex justify-center ${textAlign === 'left' ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePropertyChange('textAlign', 'center')}
                      className={`p-1.5 rounded border flex justify-center ${textAlign === 'center' ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePropertyChange('textAlign', 'right')}
                      className={`p-1.5 rounded border flex justify-center ${textAlign === 'right' ? 'bg-blue-500 text-white border-blue-600' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'}`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Layer ordering */}
              <div className="pt-3 border-t border-[var(--border-light)] space-y-2">
                <label className="font-bold text-[var(--text-primary)] block">จัดลำดับเลเยอร์</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={bringForward} className="p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center items-center gap-1 font-semibold">
                    <BringToFront className="w-3.5 h-3.5" /> ขึ้น 1
                  </button>
                  <button onClick={bringToFrontMethod} className="p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center items-center gap-1 font-semibold">
                    <BringToFront className="w-3.5 h-3.5 text-blue-500" /> หน้าสุด
                  </button>
                  <button onClick={sendBackward} className="p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center items-center gap-1 font-semibold">
                    <SendToBack className="w-3.5 h-3.5" /> ลง 1
                  </button>
                  <button onClick={sendToBackMethod} className="p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center items-center gap-1 font-semibold">
                    <SendToBack className="w-3.5 h-3.5 text-amber-500" /> หลังสุด
                  </button>
                </div>
              </div>
              
              {/* Actions */}
              <div className="pt-3 border-t border-[var(--border-light)] space-y-2">
                <button onClick={cloneSelected} className="w-full p-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:bg-[var(--border-light)] rounded-xl flex justify-center items-center gap-1.5 font-semibold transition-colors">
                  <Copy className="w-4 h-4 text-blue-500" /> คัดลอก (Duplicate)
                </button>
                <button onClick={deleteSelected} className="w-full p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex justify-center items-center gap-1.5 font-semibold transition-colors">
                  <Trash2 className="w-4 h-4" /> ลบวัตถุที่เลือก
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex shrink-0 border-t border-[var(--border-light)] bg-[var(--bg-surface)] relative z-20 shadow-lg divide-x divide-[var(--border-light)]">
        <button 
          onClick={() => setMobileTab(mobileTab === 'tools' ? 'canvas' : 'tools')} 
          className={`flex-1 py-2.5 px-2 text-center text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors ${mobileTab === 'tools' ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <Wrench className="w-4 h-4"/> 
          <span>เครื่องมือ</span>
        </button>

        <button 
          onClick={() => setMobileTab(mobileTab === 'properties' ? 'canvas' : 'properties')} 
          className={`flex-1 py-2.5 px-2 text-center text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors ${mobileTab === 'properties' ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <Settings className="w-4 h-4"/> 
          <span>คุณสมบัติ</span>
        </button>

        <button 
          onClick={() => {
            setMobileTab('canvas');
            fitToScreen();
          }} 
          className="flex-1 py-2.5 px-2 text-center text-[11px] font-bold flex flex-col items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="ย่อ/ขยายให้พอดีหน้าจอมือถือ"
        >
          <Scaling className="w-4 h-4"/> 
          <span>พอดีจอ</span>
        </button>

        <button 
          onClick={toggleFullscreen} 
          className={`flex-1 py-2.5 px-2 text-center text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
            isFullscreen 
              ? 'text-amber-500 bg-amber-500/10' 
              : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
          }`}
          title="สลับโหมดเต็มหน้าจอ"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullscreen ? 'ออกเต็มจอ' : 'เต็มจอ'}</span>
        </button>
      </div>
      
      {showGallery && (
        <InfographicsGalleryModal 
          onClose={() => setShowGallery(false)} 
          onLoad={(id) => loadProjectDB(id)} 
          onShare={(project) => {
            setShowGallery(false);
            handleOpenShare(project);
          }}
        />
      )}

      {showShareModal && (
        <InfographicsShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          infographic={currentShareData}
          onUpdateSettings={async (updated) => {
            if (!currentShareData?.id) return;
            try {
              const res = await fetch(`/api/infographics/${currentShareData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
              });
              if (res.ok) {
                const saved = await res.json();
                setCurrentShareData(prev => prev ? { ...prev, ...saved, ...updated } : null);
                if (updated.name) setProjectName(updated.name);
              }
            } catch (e) {
              console.error(e);
            }
          }}
          onExportPng={(multiplier) => exportPngWithScale(multiplier)}
          onExportPdf={() => exportPDF()}
          onExportSvg={() => exportSVG()}
          onExportJson={() => exportJSON()}
        />
      )}

      {showImageLibraryModal && (
        <InfographicsImageGalleryModal
          onClose={() => setShowImageLibraryModal(false)}
          onSelectImage={(url, name) => insertImageFromUrl(url, name)}
        />
      )}

      {imageToCrop && (
        <ImageCropModal
          imageUrl={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={(croppedDataUrl) => {
            if (!canvas || !selectedObject || selectedObject.type !== 'image') {
              setImageToCrop(null);
              return;
            }
            // Preserve position and size
            const oldWidth = selectedObject.getScaledWidth ? selectedObject.getScaledWidth() : selectedObject.width;
            const oldHeight = selectedObject.getScaledHeight ? selectedObject.getScaledHeight() : selectedObject.height;
            const left = selectedObject.left;
            const top = selectedObject.top;
            const angle = selectedObject.angle;

            fabric.Image.fromURL(croppedDataUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
              img.set({
                left: left,
                top: top,
                angle: angle
              });
              img.scaleToWidth(oldWidth);
              
              canvas.remove(selectedObject);
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              saveHistory();
              setImageToCrop(null);
            });
          }}
        />
      )}

      {/* Toast Notification Banner */}
      {saveToast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in max-w-md w-11/12 ${
          saveToast.type === 'success' 
            ? 'bg-slate-900 text-white border-emerald-500/50 shadow-emerald-950/30' 
            : 'bg-red-950 text-white border-red-500/50 shadow-red-950/30'
        }`}>
          {saveToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium flex-1">{saveToast.message}</span>
          <button onClick={() => setSaveToast(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Save Project Protection Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-noto-serif-thai text-white">
                    ยืนยันการบันทึกโปรเจกต์ (Save Protection)
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    ตรวจสอบชื่อโปรเจกต์และรูปแบบการบันทึกเพื่อป้องกันการบันทึกทับซ้ำโดยไม่ตั้งใจ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 bg-[var(--bg-surface)]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>ชื่อโปรเจกต์ (Project Title)</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal">แก้ไขชื่อได้ตามต้องการ</span>
                </label>
                <input
                  type="text"
                  value={saveModalName}
                  onChange={(e) => setSaveModalName(e.target.value)}
                  placeholder="พิมพ์ชื่อโปรเจกต์..."
                  className="w-full p-2.5 text-sm font-semibold bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:border-emerald-500 outline-none"
                  autoFocus
                />
              </div>

              {currentProjectId ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>โปรเจกต์นี้มีข้อมูลในระบบอยู่แล้ว (ID: {currentProjectId})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                    โปรดเลือกว่าต้องการ **บันทึกทับไฟล์เดิม** หรือ **สร้างเป็นสำเนาโปรเจกต์ใหม่** เพื่อป้องกันการสูญหายของงานเก่า
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>โปรเจกต์ใหม่ (ยังไม่เคยถูกบันทึกในฐานข้อมูล)</span>
                </div>
              )}

              {currentProjectId && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">เลือกรูปแบบการบันทึก:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div
                      onClick={() => setSaveMode('overwrite')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                        saveMode === 'overwrite'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                          : 'bg-[var(--bg-canvas)] border-[var(--border-light)] hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                        <span>บันทึกทับโปรเจกต์เดิม</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                        อัปเดตไฟล์ ID {currentProjectId} โดยไม่สร้างรายการใหม่ในระบบ
                      </p>
                    </div>

                    <div
                      onClick={() => setSaveMode('copy')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                        saveMode === 'copy'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                          : 'bg-[var(--bg-canvas)] border-[var(--border-light)] hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                        <Copy className="w-3.5 h-3.5 text-indigo-500" />
                        <span>บันทึกเป็นโปรเจกต์ใหม่</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                        สร้างโปรเจกต์ใหม่เป็นสำเนา โดยยังเก็บงานเดิมไว้
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-lighter)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] hover:bg-[var(--border-light)] text-[var(--text-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => saveProjectDB()}
                disabled={isSaving || !saveModalName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึกข้อมูล'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Right-Click Context Menu */}
      {contextMenu.visible && (
        <div
          id="canvas-right-click-context-menu"
          className="fixed z-[9999] bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl shadow-2xl py-1.5 min-w-[240px] text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 divide-y divide-[var(--border-light)] overflow-hidden"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 260)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 380)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header info */}
          <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-500" />
              {contextMenu.targetObject
                ? contextMenu.targetObject.type === 'group'
                  ? 'กลุ่มวัตถุ / สติกเกอร์ (Group)'
                  : contextMenu.targetObject.type === 'activeSelection' || contextMenu.targetObject.type === 'activeselection'
                  ? 'เลือกหลายวัตถุ (Multi-select)'
                  : contextMenu.targetObject.type === 'i-text' || contextMenu.targetObject.type === 'textbox'
                  ? 'กล่องข้อความ (Text)'
                  : contextMenu.targetObject.type === 'image'
                  ? 'รูปภาพ (Image)'
                  : 'วัตถุ / รูปทรง (Object)'
                : 'ผืนผ้าใบ (Canvas)'}
            </span>
            <button
              type="button"
              onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Group / Ungroup High Priority Section */}
          {contextMenu.targetObject?.type === 'group' && (
            <div className="p-1.5 bg-amber-500/10">
              <button
                type="button"
                onClick={() => {
                  ungroupObjects(contextMenu.targetObject);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div className="flex flex-col">
                  <span>🔓 ยกเลิกกลุ่ม (Ungroup)</span>
                  <span className="text-[10px] font-normal text-amber-800/80 dark:text-amber-300/70">แยกชิ้นส่วนเพื่อแก้ไขข้อความและสี</span>
                </div>
              </button>
            </div>
          )}

          {(contextMenu.targetObject?.type === 'activeSelection' || contextMenu.targetObject?.type === 'activeselection') && (
            <div className="p-1.5 bg-indigo-500/10">
              <button
                type="button"
                onClick={() => {
                  groupObjects();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div className="flex flex-col">
                  <span>📦 รวมกลุ่มวัตถุ (Group)</span>
                  <span className="text-[10px] font-normal text-indigo-800/80 dark:text-indigo-300/70">รวมเป็นชิ้นเดียวเพื่อย้ายสะดวก</span>
                </div>
              </button>
            </div>
          )}

          {/* Clipboard & Editing Section */}
          <div className="py-1">
            {contextMenu.targetObject && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    copySelected();
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>คัดลอก (Copy)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cloneSelected();
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>สร้างสำเนา (Duplicate)</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                pasteClipboard();
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>วางวัตถุ (Paste)</span>
            </button>
          </div>

          {/* Layer Ordering Section (when object is selected) */}
          {contextMenu.targetObject && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  bringToFrontMethod();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                <BringToFront className="w-3.5 h-3.5 text-sky-500" />
                <span>นำขึ้นมาหน้าสุด (Bring to Front)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  bringForward();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 -rotate-90 text-sky-400" />
                <span>ขยับขึ้น 1 ชั้น (Bring Forward)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sendBackward();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-90 text-amber-400" />
                <span>ขยับลง 1 ชั้น (Send Backward)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sendToBackMethod();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                <SendToBack className="w-3.5 h-3.5 text-amber-500" />
                <span>ส่งไปหลังสุด (Send to Back)</span>
              </button>
            </div>
          )}

          {/* Alignment & Lock Section */}
          {contextMenu.targetObject && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  alignObject('center-both');
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                <Move className="w-3.5 h-3.5 text-teal-500" />
                <span>จัดกึ่งกลางหน้ากระดาน (Center Canvas)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleLockSelected();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
              >
                {isLocked ? <Unlock className="w-3.5 h-3.5 text-amber-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isLocked ? 'ปลดล็อควัตถุ (Unlock)' : 'ล็อควัตถุ (Lock)'}</span>
              </button>
            </div>
          )}

          {/* History and Canvas Utilities */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                undo();
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
            >
              <Undo className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>เลิกทำ (Undo)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                redo();
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
            >
              <Redo className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>ทำซ้ำ (Redo)</span>
            </button>
          </div>

          {/* Delete Action */}
          {contextMenu.targetObject && (
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  deleteSelected();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-2 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>ลบวัตถุนี้ (Delete)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
