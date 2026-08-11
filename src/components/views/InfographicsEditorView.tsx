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
  MessageSquare, Zap, Activity, Info, Award, Plus, Sliders, Hash, Move
} from 'lucide-react';

import { InfographicsGalleryModal } from './InfographicsGalleryModal';
import { FontSelector, ensureGoogleFontLoaded } from './FontSelector';
import { PDFDocument } from 'pdf-lib';

interface InfographicsEditorViewProps {
  user: any;
}

export default function InfographicsEditorView({ user }: InfographicsEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [fabricError, setFabricError] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);

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
  
  // Left Sidebar active tab
  const [activeSidebarTab, setActiveSidebarTab] = useState<'text' | 'shapes' | 'infographic' | 'templates' | 'canvas' | 'ai'>('shapes');

  // Auto-scale on mount for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setZoomLevel(0.4);
    }
  }, []);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('My Infographic');
  const [showGallery, setShowGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveMode, setSaveMode] = useState<'overwrite' | 'copy'>('overwrite');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'tools' | 'properties'>('canvas');
  
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

  // AI Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !fabricLoaded || !fabric) return;
    
    // Initialize Fabric.js Canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: backgroundColor,
      preserveObjectStacking: true,
    });
    
    setCanvas(initCanvas);
    
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
    
    return () => {
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
  };

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
  };

  // Quick Alignment Methods
  const alignObject = (position: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'center-both') => {
    if (!canvas || !selectedObject) return;
    const boundWidth = selectedObject.getScaledWidth();
    const boundHeight = selectedObject.getScaledHeight();

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
    selectedObject.setCoords();
    canvas.requestRenderAll();
  };

  // Grouping
  const groupObjects = () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeSelection') return;
    const activeSelection = activeObj as any;
    const objects = activeSelection.getObjects();
    canvas.discardActiveObject();
    const group = new fabric.Group(objects);
    objects.forEach((obj: any) => canvas.remove(obj));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  };

  const ungroupObjects = () => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') return;
    const group = activeObj as any;
    const objects = group.getObjects();
    canvas.remove(group);
    objects.forEach((obj: any) => canvas.add(obj));
    const activeSelection = new fabric.ActiveSelection(objects, { canvas });
    canvas.setActiveObject(activeSelection);
    canvas.requestRenderAll();
  };

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result;
      if (typeof data === 'string') {
        fabric.Image.fromURL(data).then((img) => {
          img.scaleToWidth(300);
          img.set({
            left: 100,
            top: 100
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        }).catch(err => console.error("Error loading image", err));
      }
    };
    reader.readAsDataURL(file);
  };
  
  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => canvas.remove(obj));
    }
  };
  
  const bringForward = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectForward(selectedObject);
    canvas.requestRenderAll();
  };
  
  const bringToFrontMethod = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectToFront(selectedObject);
    canvas.requestRenderAll();
  };
  
  const sendBackward = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectBackwards(selectedObject);
    canvas.requestRenderAll();
  };
  
  const sendToBackMethod = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectToBack(selectedObject);
    canvas.requestRenderAll();
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
  
  const clearCanvas = () => {
    if (!canvas) return;
    if (confirm('คุณต้องการล้างหน้ากระดานทั้งหมดใช่หรือไม่?')) {
      canvas.clear();
      canvas.backgroundColor = backgroundColor;
      canvas.requestRenderAll();
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
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[var(--bg-base)] select-none">
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
            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-0.5 text-sm text-[var(--text-primary)] font-semibold max-w-[160px] sm:max-w-[220px]"
            placeholder="ชื่อโปรเจกต์..."
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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

          {/* Grid Toggle */}
          <button 
            onClick={() => setShowGrid(!showGrid)} 
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${showGrid ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold' : 'border-[var(--border-medium)] text-[var(--text-secondary)]'}`}
            title="แสดง/ซ่อนเส้นตารางนำสายตา"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden md:inline">ตาราง</span>
          </button>

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
        <div className={`${mobileTab === 'tools' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-2xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-80 md:border-r border-[var(--border-light)] bg-[var(--bg-surface)] z-10 shrink-0`}>
          
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

                <div className="pt-3 border-t border-[var(--border-light)]">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">อัปโหลดรูปภาพ (Upload Image)</h3>
                  <label className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border-medium)] hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>เลือกรูปภาพจากเครื่อง</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
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
              </div>
            )}
          </div>
        </div>

        {/* Center Main Canvas Area */}
        <div className="flex-1 bg-slate-900/10 dark:bg-slate-950 overflow-auto flex items-center justify-center p-4 md:p-8 relative z-0">
          <div 
            className="shadow-2xl ring-1 ring-black/10 bg-white transition-all relative" 
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'center center',
              backgroundImage: showGrid ? 'radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)' : 'none',
              backgroundSize: '20px 20px'
            }}
          >
            <canvas ref={canvasRef} />
          </div>

          {/* Floating Canvas Controls */}
          <div className="absolute bottom-6 right-6 flex items-center bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            <button onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
              <Minus className="w-4 h-4" />
            </button>
            <div className="px-3 font-semibold text-slate-700 dark:text-slate-200 min-w-[3.5rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
              +
            </button>
            <button onClick={() => setZoomLevel(1)} className="px-2.5 py-1.5 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
              100%
            </button>
          </div>
        </div>

        {/* Right Sidebar - Object Properties Inspector */}
        <div className={`${mobileTab === 'properties' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-2xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-72 md:border-l border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto z-10 shrink-0`}>
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
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              
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
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex shrink-0 border-t border-[var(--border-light)] bg-[var(--bg-surface)] relative z-20">
        <button onClick={() => setMobileTab(mobileTab === 'tools' ? 'canvas' : 'tools')} className={`flex-1 p-3 text-center text-xs font-semibold flex flex-col items-center justify-center gap-1 ${mobileTab === 'tools' ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>
          <Wrench className="w-5 h-5"/> เครื่องมือ
        </button>
        <button onClick={() => setMobileTab(mobileTab === 'properties' ? 'canvas' : 'properties')} className={`flex-1 p-3 text-center text-xs font-semibold flex flex-col items-center justify-center gap-1 ${mobileTab === 'properties' ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>
          <Settings className="w-5 h-5"/> คุณสมบัติ
        </button>
      </div>
      
      {showGallery && (
        <InfographicsGalleryModal 
          onClose={() => setShowGallery(false)} 
          onLoad={(id) => loadProjectDB(id)} 
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
    </div>
  );
}
