  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('My Presentation');
  const [showGallery, setShowGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveProjectDB = async () => {
    if (!canvas) return;
    setIsSaving(true);
    
    // Generate Thumbnail
    const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.5 });
    
    const payload = {
      canvas: canvas.toJSON(),
      size: canvasSize,
      backgroundColor: backgroundColor
    };

    try {
      if (currentProjectId) {
        await fetch(`/api/infographics/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, data: JSON.stringify(payload), thumbnail })
        });
        alert('บันทึกสำเร็จ');
      } else {
        const name = prompt('กรุณาตั้งชื่อโปรเจกต์', projectName) || projectName;
        setProjectName(name);
        const res = await fetch('/api/infographics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, data: JSON.stringify(payload), thumbnail })
        });
        const data = await res.json();
        setCurrentProjectId(data.id);
        alert('สร้างโปรเจกต์และบันทึกสำเร็จ');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
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
