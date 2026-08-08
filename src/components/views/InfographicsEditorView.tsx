import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { 
  Type, Square, Circle, Triangle, Image as ImageIcon, 
  Download, Trash2, Palette, Type as FontIcon, Bold, Italic, 
  AlignLeft, AlignCenter, AlignRight, BringToFront, SendToBack,
  Save, Undo, Redo, LayoutGrid, Underline, Copy, PenTool, FolderOpen, Minus
, Wrench, Settings, X, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';

import { InfographicsGalleryModal } from './InfographicsGalleryModal';
import { FontSelector, ensureGoogleFontLoaded } from './FontSelector';
import { PDFDocument } from 'pdf-lib';

interface InfographicsEditorViewProps {
  user: any;
}

export default function InfographicsEditorView({ user }: InfographicsEditorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Auto-scale on mount for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setZoomLevel(0.4);
    }
  }, []);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('My Presentation');
  const [showGallery, setShowGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveMode, setSaveMode] = useState<'overwrite' | 'copy'>('overwrite');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'tools' | 'properties'>('canvas');
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
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Fabric.js Canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: backgroundColor,
      preserveObjectStacking: true, // Keep objects in order when selecting
    });
    
    setCanvas(initCanvas);
    
    const updateSelection = () => {
      const activeObj = initCanvas.getActiveObject();
      if (activeObj) {
        setSelectedObject(activeObj);
        
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
        
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox') {
          const textObj = activeObj as fabric.IText;
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
    initCanvas.on('object:modified', () => { updateSelection(); });
    
    return () => {
      initCanvas.dispose();
    };
  }, []); // Run once to mount
  
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
  }, [canvas, backgroundColor]); // Rerun if these change so saveHistory has fresh closure
  
  const handlePropertyChange = async (property: string, value: any) => {
    if (!canvas || !selectedObject) return;
    
    if (property === 'fontFamily') {
      await ensureGoogleFontLoaded(value);
    }

    selectedObject.set(property, value);
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
  
  const saveHistory = () => {
    if (!canvas || isHistoryUpdateRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    const history = historyRef.current;
    let index = historyIndexRef.current;
    
    // Only save if different from last
    if (index >= 0 && history[index] === json) return;
    
    // Discard redo history
    history.splice(index + 1);
    
    history.push(json);
    historyIndexRef.current = history.length - 1;
    
    // Limit history length
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
        (clonedObj as fabric.ActiveSelection).forEachObject((obj: any) => {
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
    selectedObject.clone().then((cloned) => {
      canvas.discardActiveObject();
      cloned.set({
        left: cloned.left! + 20,
        top: cloned.top! + 20,
        evented: true,
      });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        (cloned as fabric.ActiveSelection).forEachObject((obj: any) => {
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
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid acting if the user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!canvas) return;

      // Undo (Ctrl+Z or Cmd+Z)
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
      
      // Redo (Ctrl+Y or Cmd+Y)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      
      // Paste (Ctrl+V or Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Make sure we only fire object actions if an object is selected
      const activeObj = canvas.getActiveObject();
      if (!activeObj) return;

      if ((activeObj.type === 'i-text' || activeObj.type === 'textbox') && (activeObj as fabric.IText).isEditing) {
        return; // Don't delete or duplicate if actively typing inside a text object
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
      
      // Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelected();
      }
      
      // Ctrl+X / Cmd+X
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        copySelected();
        deleteSelected();
      }
      
      // Ctrl+D or Cmd+D to duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        cloneSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      
    };
  }, [canvas, selectedObject]); // Need to depend on canvas and selectedObject

  // Actions
  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('เพิ่มข้อความที่นี่', {
      left: 100,
      top: 100,
      fontFamily: 'Sarabun',
      fill: fillColor,
      fontSize: 32,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  };
  
  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: fillColor,
      width: 100,
      height: 100,
      rx: 8,
      ry: 8
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  };
  
  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      fill: fillColor,
      radius: 50,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
  };
  
  const addTriangle = () => {
    if (!canvas) return;
    const triangle = new fabric.Triangle({
      left: 100,
      top: 100,
      fill: fillColor,
      width: 100,
      height: 100,
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.requestRenderAll();
  };
  
  const addLine = () => {
    if (!canvas) return;
    const line = new fabric.Line([50, 50, 250, 50], {
      left: 100,
      top: 100,
      stroke: fillColor === 'transparent' ? '#000000' : fillColor,
      strokeWidth: 4,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
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
      multiplier: 2 // High res export
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
        multiplier: 2 // High res export for better PDF quality
      });
      
      const pdfDoc = await PDFDocument.create();
      // Use canvas size as point size
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
    setSaveModalName(projectName || 'My Presentation');
    setSaveMode(currentProjectId ? 'overwrite' : 'copy');
    setShowSaveModal(true);
  };

  const saveProjectDB = async (overrideMode?: 'overwrite' | 'copy') => {
    if (!canvas || isSaving) return;
    setIsSaving(true);
    
    const effectiveMode = overrideMode || saveMode;
    const targetName = saveModalName.trim() || projectName.trim() || 'My Presentation';

    // Generate Thumbnail
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

  const loadDisasterWarningTemplate = () => {
    if (!canvas) return;
    
    const width = 1080;
    const height = 1620;
    setCanvasSize({ width, height });
    setBackgroundColor('#0b1a30'); 
    canvas.clear();
    canvas.backgroundColor = '#0b1a30';

    const objects: any[] = [];

    // ==========================================
    // BACKGROUND ELEMENTS (Lightning effect mock)
    // ==========================================
    // In a real app we'd load an image, here we use some gradient-like shapes
    
    // ==========================================
    // HEADER
    // ==========================================
    
    // Top Title
    objects.push(new fabric.Textbox('จังหวัดระยอง', {
      left: width / 2, top: 40, width: 600,
      originX: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ffffff',
      fontSize: 55, fontWeight: 'bold',
    }));

    // "แจ้งเตือน" Giant Text
    objects.push(new fabric.Textbox('แจ้งเตือน', {
      left: width / 2, top: 90, width: 800,
      originX: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ff1111',
      fontSize: 160, fontWeight: 'bold',
      stroke: '#ffffff', strokeWidth: 8,
      shadow: new fabric.Shadow({ color: '#ffffff', blur: 15, offsetX: 0, offsetY: 0 })
    }));

    // "ฝนตกหนักถึงหนักมาก" 
    objects.push(new fabric.Textbox('ฝนตกหนักถึงหนักมาก', {
      left: width / 2, top: 270, width: 800,
      originX: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ffde00',
      fontSize: 75, fontWeight: 'bold',
      shadow: new fabric.Shadow({ color: '#000000', blur: 10, offsetX: 3, offsetY: 3 })
    }));

    // Areas
    objects.push(new fabric.Textbox('ในพื้นที่ อำเภอเมืองระยอง\nอำเภอบ้านฉาง และอำเภอแกลง', {
      left: width / 2, top: 370, width: 900,
      originX: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ffffff',
      fontSize: 50, fontWeight: 'bold',
      shadow: new fabric.Shadow({ color: '#000000', blur: 10, offsetX: 2, offsetY: 2 })
    }));

    // Date Tag Background
    objects.push(new fabric.Rect({
      left: width / 2, top: 510, originX: 'center', originY: 'center',
      fill: '#a01212', width: 700, height: 90, rx: 45, ry: 45,
      stroke: '#ffffff', strokeWidth: 4
    }));

    objects.push(new fabric.Textbox('ระหว่างวันที่ 6-9 สิงหาคม 2569', {
      left: width / 2, top: 510, width: 650,
      originX: 'center', originY: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ffffff',
      fontSize: 45, fontWeight: 'bold',
    }));

    // ==========================================
    // MIDDLE NOTIFICATION TEXT BOX
    // ==========================================
    objects.push(new fabric.Rect({
      left: 40, top: 600, width: 680, height: 260,
      fill: 'rgba(5, 20, 50, 0.85)', rx: 20, ry: 20,
      stroke: '#ffde00', strokeWidth: 3
    }));

    objects.push(new fabric.Textbox('กองอำนวยการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', {
      left: 60, top: 615, width: 640,
      fontFamily: 'Sarabun', fill: '#ffde00',
      fontSize: 24, fontWeight: 'bold',
    }));

    objects.push(new fabric.Textbox('ได้ติดตามประกาศจาก กรมอุตุนิยมวิทยา เรื่อง คลื่นลมแรงบริเวณทะเลอันดามัน\nตอนบนและอ่าวไทยตอนบน และฝนตกหนักถึงหนักมากบริเวณประเทศไทย\nโดยจังหวัดระยองพื้นที่ (อำเภอเมืองระยอง อำเภอบ้านฉาง และอำเภอแกลง)\nมีพื้นที่คาดว่าจะเกิดฝนตกหนัก อาจเกิดน้ำป่าไหลหลาก น้ำท่วมฉับพลัน\nน้ำท่วมขังดินโคลนถล่มและคลื่นลมแรง (มีผลกระทบในช่วงวันที่ 6-9 สิงหาคม 2569)', {
      left: 60, top: 655, width: 640,
      fontFamily: 'Sarabun', fill: '#ffffff',
      fontSize: 20, lineHeight: 1.4,
    }));

    // "ผลกระทบที่อาจเกิดขึ้น" Tag
    objects.push(new fabric.Rect({
      left: width / 2 - 200, top: 880, width: 400, height: 50,
      fill: '#ffde00', rx: 25, ry: 25, originX: 'center', originY: 'center',
    }));
    objects.push(new fabric.Textbox('ผลกระทบที่อาจเกิดขึ้น', {
      left: width / 2 - 200, top: 880, width: 350,
      originX: 'center', originY: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#000000',
      fontSize: 28, fontWeight: 'bold',
    }));

    // Images placeholders for impact
    const createImpactCard = (x: number, y: number, text: string) => {
      objects.push(new fabric.Rect({
        left: x, top: y, width: 220, height: 180,
        fill: '#1a3055', rx: 10, ry: 10, stroke: '#88aaff', strokeWidth: 2
      }));
      // Mock image area
      objects.push(new fabric.Rect({
        left: x+2, top: y+2, width: 216, height: 110,
        fill: '#2a4a75', rx: 8, ry: 8
      }));
      objects.push(new fabric.Textbox(text, {
        left: x + 110, top: y + 120, width: 200, originX: 'center', textAlign: 'center',
        fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 18, fontWeight: 'bold'
      }));
    };

    createImpactCard(40, 920, 'ฝนตกหนัก\nถึงหนักมาก');
    createImpactCard(280, 920, 'น้ำป่าไหลหลาก');
    createImpactCard(520, 920, 'น้ำท่วมฉับพลัน\nน้ำท่วมขังในระยะสั้น');
    createImpactCard(760, 920, 'คลื่นลมแรง\nบริเวณทะเลอันดามันตอนบน\nและอ่าวไทยตอนบน');


    // ==========================================
    // BOTTOM SECTION (PREPARATION)
    // ==========================================
    objects.push(new fabric.Rect({
      left: 40, top: 1130, width: 1000, height: 350,
      fill: '#13284a', rx: 15, ry: 15, stroke: '#5078c5', strokeWidth: 2
    }));

    objects.push(new fabric.Textbox('เตรียมความพร้อมโดยให้ดำเนินการ ดังนี้', {
      left: width / 2, top: 1150, width: 800, originX: 'center', textAlign: 'center',
      fontFamily: 'Sarabun', fill: '#ffde00', fontSize: 35, fontWeight: 'bold'
    }));

    const createPrepItem = (x: number, top: number, num: string, color: string, text: string) => {
      objects.push(new fabric.Circle({
        left: x, top: top, radius: 25, fill: color
      }));
      objects.push(new fabric.Textbox(num, {
        left: x + 25, top: top + 10, width: 50, originX: 'center', textAlign: 'center',
        fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 35, fontWeight: 'bold'
      }));
      objects.push(new fabric.Textbox(text, {
        left: x + 70, top: top, width: 230,
        fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 16, lineHeight: 1.4
      }));
    };

    createPrepItem(60, 1200, '1', '#2e7d32', 'ติดตามข้อมูลสภาวะอากาศ\nที่เว็บไซต์กรมอุตุนิยมวิทยา\nhttps://www.tmd.go.th\nหรือ สายด่วนพยากรณ์อากาศ 1182\nและข่าวสารจากทางราชการ\nอย่างใกล้ชิด');
    
    objects.push(new fabric.Rect({ left: 380, top: 1200, width: 2, height: 150, fill: '#335588' }));
    createPrepItem(400, 1200, '2', '#e65100', 'แจ้งเตือน ประชาสัมพันธ์สร้างการรับรู้\nให้ประชาชนในพื้นที่ ระวังอันตรายจาก\nฝนตกหนักถึงหนักมากและฝนที่ตกสะสม\nซึ่งอาจทำให้เกิดน้ำท่วมฉับพลัน และ\nน้ำป่าไหลหลาก โดยเฉพาะพื้นที่ชุมชนเมือง/\nเศรษฐกิจ เฝ้าระวังน้ำท่วมฉับพลัน\nน้ำท่วมขังในระยะสั้น');
    
    objects.push(new fabric.Rect({ left: 720, top: 1200, width: 2, height: 150, fill: '#335588' }));
    createPrepItem(740, 1200, '3', '#1565c0', 'แจ้งให้หน่วยงาน เครือข่าย\nภาคประชาชน ภาคเอกชน\nเตรียมพร้อมทรัพยากร เครื่องจักรกล\nสาธารณภัย และแผนเผชิญเหตุ\nรวมถึงกำลังเจ้าหน้าที่ให้มีความพร้อม\nปฏิบัติงานด้านอำนวยความสะดวก\nด้านบรรเทากู้ชีพ และด้านให้ความช่วยเหลือ\nประชาชนที่ประสบภัยตลอด 24 ชั่วโมง');


    // "ประชาชนควรเตรียมพร้อม" Tag
    objects.push(new fabric.Rect({
      left: 40, top: 1390, width: 280, height: 40, fill: '#c62828', rx: 20, ry: 20
    }));
    objects.push(new fabric.Textbox('ประชาชนควรเตรียมพร้อม', {
      left: 55, top: 1398, width: 250,
      fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 20, fontWeight: 'bold'
    }));

    const createIconItem = (x: number, top: number, text: string) => {
      objects.push(new fabric.Circle({ left: x, top: top, radius: 25, fill: '#2a4a75' }));
      objects.push(new fabric.Textbox(text, {
        left: x + 60, top: top + 5, width: 120,
        fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 13, lineHeight: 1.3
      }));
    }

    createIconItem(50, 1440, 'ตรวจสอบบ้านเรือน\nและสิ่งก่อสร้าง\nให้อยู่ในสภาพมั่นคง');
    createIconItem(250, 1440, 'เตรียมสิ่งของ\nจำเป็นยามฉุกเฉิน\nและเอกสารสำคัญ');
    createIconItem(450, 1440, 'หลีกเลี่ยงการเดินทาง\nผ่านเส้นทางที่มีน้ำท่วม\nหรือเสี่ยงอันตราย');
    createIconItem(650, 1440, 'ระวังพื้นที่ลาดเชิงเขา\nใกล้ทางน้ำไหลผ่าน\nและพื้นที่ลุ่ม');
    createIconItem(850, 1440, 'หากเกิดเหตุฉุกเฉิน\nให้แจ้งหน่วยงาน\nที่เกี่ยวข้องทันที');


    // ==========================================
    // FOOTER (Contact Info)
    // ==========================================
    objects.push(new fabric.Rect({
      left: 0, top: 1530, width: 1080, height: 90, fill: '#1b3266'
    }));
    
    objects.push(new fabric.Textbox('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง  วิทยุสื่อสารความถี่', {
      left: 40, top: 1545, width: 800,
      fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 20, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox('ศูนย์ราชการจังหวัดระยอง โทรศัพท์ 0 3869 4129 โทรสาร 0 3869 4134   161.200 MHz', {
      left: 40, top: 1575, width: 800,
      fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 18,
    }));

    objects.push(new fabric.Textbox('1784 สายด่วน', {
      left: 800, top: 1540, width: 250,
      fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 32, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox('ตลอด 24 ชม.', {
      left: 800, top: 1580, width: 250,
      fontFamily: 'Sarabun', fill: '#ffffff', fontSize: 18,
    }));


    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
  };

  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
    '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', 
    '#a855f7', '#ec4899', '#64748b'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[var(--bg-base)]">
      {/* Header Toolbar */}
      <div className="shrink-0 border-b border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between px-4 overflow-x-auto whitespace-nowrap h-16 md:h-14 gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center gap-4">
          <h2 className="hidden md:block text-lg font-bold text-[var(--text-primary)] font-noto-serif-thai">ออกแบบ Infographics / Presentations</h2>
          <h2 className="md:hidden text-lg font-bold text-[var(--text-primary)] font-noto-serif-thai">ออกแบบ</h2>
          <div className="w-px h-6 bg-[var(--border-medium)]"></div>
          <input 
            type="text" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 text-[var(--text-primary)] font-medium"
            placeholder="ชื่อโปรเจกต์"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowGallery(true)} className="text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] p-2 rounded-lg transition-colors flex items-center gap-1 text-sm border border-[var(--border-medium)]">
            <FolderOpen className="w-4 h-4" /> แกลลอรี่
          </button>
          <button 
            onClick={handleOpenSaveModal} 
            disabled={isSaving} 
            className="text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm font-semibold border border-[var(--border-medium)] bg-[var(--bg-surface)] shadow-sm active:scale-98"
            title="บันทึกข้อมูลและป้องกันการบันทึกซ้ำ"
          >
            <Save className="w-4 h-4 text-emerald-500" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกโปรเจกต์'}</span>
            {lastSavedTime && (
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-normal">
                {lastSavedTime} น.
              </span>
            )}
          </button>
          
          <div className="w-px h-6 bg-[var(--border-medium)] mx-1"></div>
          
          <div className="flex bg-[var(--bg-elevated)] rounded-lg p-1 border border-[var(--border-medium)]">
            <button onClick={undo} className="text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-sm font-medium" title="Undo (Ctrl+Z)">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={redo} className="text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-sm font-medium" title="Redo (Ctrl+Y)">
              <Redo className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-px h-6 bg-[var(--border-medium)] mx-1"></div>
          
          <button onClick={clearCanvas} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm">
            <Trash2 className="w-4 h-4" /> ล้างทั้งหมด
          </button>
          
          <div className="flex bg-[var(--bg-elevated)] rounded-lg p-1 border border-[var(--border-medium)]">
            <button onClick={exportImage} className="text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-sm font-medium">
              <Download className="w-4 h-4" /> PNG
            </button>
            <button onClick={exportPDF} className="bg-[var(--primary-color)] text-white hover:bg-[var(--primary-hover)] px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Left Sidebar (Tools) */}
        <div className={`${mobileTab === 'tools' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-64 md:border-r border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto md:shadow-none md:rounded-none md:z-0`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">เครื่องมือ</h3>
            <button onClick={() => setMobileTab('canvas')} className="md:hidden p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            <button onClick={addText} className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-[var(--text-primary)]">
              <Type className="w-5 h-5 text-[var(--primary-color)]" />
              <span>เพิ่มข้อความ</span>
            </button>
            
            <button onClick={addRect} className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-[var(--text-primary)]">
              <Square className="w-5 h-5 text-[var(--primary-color)]" />
              <span>สี่เหลี่ยม</span>
            </button>

            <button onClick={addCircle} className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-[var(--text-primary)]">
              <Circle className="w-5 h-5 text-[var(--primary-color)]" />
              <span>วงกลม</span>
            </button>
            
            <button onClick={addTriangle} className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-[var(--text-primary)]">
              <Triangle className="w-5 h-5 text-[var(--primary-color)]" />
              <span>สามเหลี่ยม</span>
            </button>
            
            <button onClick={addLine} className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all text-[var(--text-primary)]">
              <Minus className="w-5 h-5 text-[var(--primary-color)]" />
              <span>เส้นตรง</span>
            </button>

            <label className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 transition-all cursor-pointer text-[var(--text-primary)]">
              <ImageIcon className="w-5 h-5 text-[var(--primary-color)]" />
              <span>อัปโหลดรูปภาพ</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">แม่แบบ (Templates)</h3>
            <div className="space-y-3">
              <button onClick={loadDisasterWarningTemplate} className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-all text-red-800">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LayoutGrid className="w-4 h-4" />
                  <span>แจ้งเตือนสาธารณภัย</span>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">ตั้งค่าหน้ากระดาษ</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">ขนาด (กว้าง x สูง)</label>
                <div className="flex flex-col gap-2">
                  <select 
                    className="w-full p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                    value={`${canvasSize.width}x${canvasSize.height}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      setCanvasSize({ width: w, height: h });
                    }}
                  >
                    <option value="800x600">การนำเสนอ (4:3) - 800x600</option>
                    <option value="1280x720">HD (16:9) - 1280x720</option>
                    <option value="1920x1080">Full HD (16:9) - 1920x1080</option>
                    <option value="1080x1080">Instagram Square - 1080x1080</option>
                    <option value="794x1123">A4 แนวตั้ง - 794x1123</option>
                    <option value="1123x794">A4 แนวนอน - 1123x794</option>
                    <option value="1080x1620">โปสเตอร์ - 1080x1620</option>
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={canvasSize.width} 
                      onChange={(e) => setCanvasSize({ ...canvasSize, width: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                      placeholder="กว้าง"
                    />
                    <div className="flex items-center text-gray-500 text-sm">x</div>
                    <input 
                      type="number" 
                      value={canvasSize.height} 
                      onChange={(e) => setCanvasSize({ ...canvasSize, height: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                      placeholder="สูง"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-2 block">สีพื้นหลัง</label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map(color => (
                    <button 
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-6 h-6 rounded-full border ${backgroundColor === color ? 'border-2 border-blue-500 scale-110' : 'border-gray-200'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={backgroundColor} 
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center p-4 md:p-8 relative z-0">
          <div className="shadow-2xl ring-1 ring-black/5 bg-white transition-all" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}>
            <canvas ref={canvasRef} />
          </div>
          <div className="absolute bottom-6 right-6 flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Minus className="w-4 h-4" />
            </button>
            <div className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-bold">
              +
            </button>
          </div>
        </div>

        {/* Right Sidebar (Properties) */}
        <div className={`${mobileTab === 'properties' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-64 md:border-l border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto md:shadow-none md:rounded-none md:z-0`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">คุณสมบัติ</h3>
            <button onClick={() => setMobileTab('canvas')} className="md:hidden p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {!selectedObject ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>เลือกวัตถุบนกระดานเพื่อแก้ไข</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Common Tools */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-2 block flex items-center gap-1">
                    <Palette className="w-3 h-3" /> สีเติม (Fill Color)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {presetColors.map(color => (
                      <button 
                        key={color}
                        onClick={() => handlePropertyChange('fill', color)}
                        className={`w-5 h-5 rounded-full border ${fillColor === color ? 'border-2 border-blue-500 scale-110' : 'border-gray-200'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button 
                      onClick={() => handlePropertyChange('fill', 'transparent')}
                      className={`w-5 h-5 rounded-full border bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="20" x2="20" y2="0" stroke="red" stroke-width="2"/></svg>')] ${fillColor === 'transparent' ? 'border-2 border-blue-500 scale-110' : 'border-gray-200'}`}
                      title="ไม่มีสี"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="color" 
                      value={fillColor === 'transparent' ? '#ffffff' : fillColor} 
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                      className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={fillColor} 
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                      className="flex-1 p-1 text-xs border border-[var(--border-medium)] rounded bg-transparent text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-2 block flex items-center gap-1">
                    <PenTool className="w-3 h-3" /> สีเส้นขอบ (Stroke)
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="color" 
                      value={strokeColor === 'transparent' ? '#000000' : strokeColor} 
                      onChange={(e) => handlePropertyChange('stroke', e.target.value)}
                      className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer"
                    />
                    <button 
                      onClick={() => handlePropertyChange('stroke', 'transparent')}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      ไม่มีขอบ
                    </button>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="20" 
                    value={strokeWidth} 
                    onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
                    className="w-full accent-[var(--primary-color)]"
                  />
                  <div className="text-right text-xs text-[var(--text-muted)] mt-1">{strokeWidth}px</div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">ความโปร่งใส (Opacity)</label>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.1"
                    value={opacity} 
                    onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                    className="w-full accent-[var(--primary-color)]"
                  />
                  <div className="text-right text-xs text-[var(--text-muted)] mt-1">{Math.round(opacity * 100)}%</div>
                </div>
              </div>

              {/* Text specific tools */}
              {(selectedObject.type === 'i-text' || selectedObject.type === 'textbox') && (
                <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
                  <div>
                    <FontSelector
                      currentFont={fontFamily}
                      onSelectFont={(newFont) => handlePropertyChange('fontFamily', newFont)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-2 block flex items-center gap-1">
                      <FontIcon className="w-3 h-3" /> ขนาดตัวอักษร
                    </label>
                    <input 
                      type="range" 
                      min="12" 
                      max="120" 
                      value={fontSize} 
                      onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                      className="w-full accent-[var(--primary-color)]"
                    />
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                      <span>12</span>
                      <span>{fontSize}px</span>
                      <span>120</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-2 block">สไตล์ตัวอักษร</label>
                    <div className="flex gap-1 mb-2">
                      <button 
                        onClick={() => handlePropertyChange('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}
                        className={`flex-1 p-1.5 rounded border ${fontWeight === 'bold' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePropertyChange('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`flex-1 p-1.5 rounded border ${fontStyle === 'italic' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePropertyChange('underline', !underline)}
                        className={`flex-1 p-1.5 rounded border ${underline ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <Underline className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handlePropertyChange('textAlign', 'left')}
                        className={`flex-1 p-1.5 rounded border ${textAlign === 'left' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePropertyChange('textAlign', 'center')}
                        className={`flex-1 p-1.5 rounded border ${textAlign === 'center' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePropertyChange('textAlign', 'right')}
                        className={`flex-1 p-1.5 rounded border ${textAlign === 'right' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-[var(--bg-elevated)] border-[var(--border-medium)]'} flex justify-center`}
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Layer tools */}
              <div className="pt-4 border-t border-[var(--border-light)]">
                <label className="text-xs text-[var(--text-secondary)] mb-2 block flex items-center gap-1">
                  <LayoutGrid className="w-3 h-3" /> จัดเรียงเลเยอร์
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={bringForward} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center text-[var(--text-primary)] text-xs gap-1 items-center" title="นำขึ้น 1 ระดับ">
                    <BringToFront className="w-3 h-3" /> ขึ้น 1
                  </button>
                  <button onClick={bringToFrontMethod} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center text-[var(--text-primary)] text-xs gap-1 items-center" title="นำมาไว้หน้าสุด">
                    <BringToFront className="w-3 h-3" /> หน้าสุด
                  </button>
                  <button onClick={sendBackward} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center text-[var(--text-primary)] text-xs gap-1 items-center" title="ลง 1 ระดับ">
                    <SendToBack className="w-3 h-3" /> ลง 1
                  </button>
                  <button onClick={sendToBackMethod} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded hover:bg-[var(--border-light)] flex justify-center text-[var(--text-primary)] text-xs gap-1 items-center" title="ไว้หลังสุด">
                    <SendToBack className="w-3 h-3" /> หลังสุด
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[var(--border-light)] space-y-2">
                <button onClick={cloneSelected} className="w-full p-2 text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-medium)] hover:bg-[var(--border-light)] rounded-lg flex justify-center items-center gap-2 transition-colors">
                  <Copy className="w-4 h-4" /> คัดลอก (Duplicate)
                </button>
                <button onClick={deleteSelected} className="w-full p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex justify-center items-center gap-2 transition-colors">
                  <Trash2 className="w-4 h-4" /> ลบวัตถุที่เลือก
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
      
      <div className="md:hidden flex shrink-0 border-t border-[var(--border-light)] bg-[var(--bg-surface)] relative z-20">
        <button onClick={() => setMobileTab(mobileTab === 'tools' ? 'canvas' : 'tools')} className={`flex-1 p-3 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 ${mobileTab === 'tools' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}`}>
          <Wrench className="w-5 h-5"/> เครื่องมือ
        </button>
        <button onClick={() => setMobileTab(mobileTab === 'properties' ? 'canvas' : 'properties')} className={`flex-1 p-3 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 ${mobileTab === 'properties' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}`}>
          <Settings className="w-5 h-5"/> ตั้งค่า
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
              {/* Project Name Input */}
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

              {/* Status Info Box */}
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

              {/* Mode Options (If existing project) */}
              {currentProjectId && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">เลือกรูปแบบการบันทึก:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: Overwrite */}
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

                    {/* Option 2: Save as Copy */}
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
