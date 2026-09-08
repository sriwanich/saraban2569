// Canva-Grade Components, Templates, and Color Kits for Infographics Editor

export interface CanvaColorTheme {
  id: string;
  name: string;
  category: string;
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  textLight: string;
  textMuted: string;
}

export const CANVA_COLOR_THEMES: CanvaColorTheme[] = [
  {
    id: 'thai-royal',
    name: 'กรมท่า & ทองคำหลวง (Royal Navy & Gold)',
    category: 'ราชการ / ทางการ',
    bg: '#0b192c',
    primary: '#f59e0b',
    secondary: '#38bdf8',
    accent: '#ef4444',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    textLight: '#ffffff',
    textMuted: '#94a3b8'
  },
  {
    id: 'eec-tech',
    name: 'ระยอง EEC นวัตกรรมดิจิทัล (Cyber Cyan)',
    category: 'สมาร์ทซิตี้ / เทคโนโลยี',
    bg: '#030712',
    primary: '#06b6d4',
    secondary: '#6366f1',
    accent: '#10b981',
    cardBg: '#111827',
    cardBorder: '#1f2937',
    textLight: '#f9fafb',
    textMuted: '#9ca3af'
  },
  {
    id: 'disaster-alert',
    name: 'ปภ. แจ้งเตือนภัยเร่งด่วน (Emergency Alert)',
    category: 'สาธารณภัย / ความปลอดภัย',
    bg: '#180303',
    primary: '#ef4444',
    secondary: '#f59e0b',
    accent: '#3b82f6',
    cardBg: '#2d0a0a',
    cardBorder: '#7f1d1d',
    textLight: '#ffffff',
    textMuted: '#fca5a5'
  },
  {
    id: 'green-gov',
    name: 'สิ่งแวดล้อม & ธรรมาภิบาล (Emerald Eco)',
    category: 'สิ่งแวดล้อม / สังคม',
    bg: '#f0fdf4',
    primary: '#047857',
    secondary: '#059669',
    accent: '#d97706',
    cardBg: '#ffffff',
    cardBorder: '#bbf7d0',
    textLight: '#064e3b',
    textMuted: '#047857'
  },
  {
    id: 'clean-slate',
    name: 'เอกสารผู้บริหาร มินิมอล (Modern Slate)',
    category: 'ธุรกิจ / รายงานผู้บริหาร',
    bg: '#f8fafc',
    primary: '#2563eb',
    secondary: '#475569',
    accent: '#0d9488',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    textLight: '#0f172a',
    textMuted: '#64748b'
  },
  {
    id: 'sunset-warmth',
    name: 'ส้มอิฐ & อำพันอบอุ่น (Sunset Warmth)',
    category: 'ประชาสัมพันธ์ / ชุมชน',
    bg: '#fffbeb',
    primary: '#d97706',
    secondary: '#ea580c',
    accent: '#0284c7',
    cardBg: '#ffffff',
    cardBorder: '#fde68a',
    textLight: '#78350f',
    textMuted: '#92400e'
  },
  {
    id: 'purple-innovate',
    name: 'วิสัยทัศน์ & นวัตกรรมล้ำยุค (Deep Violet)',
    category: 'นวัตกรรม / วิสัยทัศน์',
    bg: '#0f0728',
    primary: '#a855f7',
    secondary: '#ec4899',
    accent: '#38bdf8',
    cardBg: '#1e1145',
    cardBorder: '#3b1d82',
    textLight: '#ffffff',
    textMuted: '#c084fc'
  },
  {
    id: 'executive-dark',
    name: 'พรีเมียมเอ็กเซ็กคิวทีฟ (Obsidian Luxury)',
    category: 'ธุรกิจ / รายงานผู้บริหาร',
    bg: '#090d16',
    primary: '#38bdf8',
    secondary: '#818cf8',
    accent: '#34d399',
    cardBg: '#131b2e',
    cardBorder: '#1e293b',
    textLight: '#f8fafc',
    textMuted: '#94a3b8'
  }
];

export const applyColorThemeToCanvas = (
  canvas: any,
  theme: CanvaColorTheme,
  setBackgroundColor: (col: string) => void,
  saveHistory?: () => void
) => {
  if (!canvas) return;
  setBackgroundColor(theme.bg);
  canvas.backgroundColor = theme.bg;

  const objects = canvas.getObjects();
  const isDarkBg = theme.bg.startsWith('#0') || theme.bg.startsWith('#1') || theme.bg.startsWith('#2');

  objects.forEach((obj: any) => {
    // Background cards / containers
    if (obj.type === 'rect') {
      const w = obj.width * (obj.scaleX || 1);
      const h = obj.height * (obj.scaleY || 1);
      if (w > 150 && h > 60) {
        obj.set('fill', theme.cardBg);
        obj.set('stroke', theme.cardBorder);
      }
    }
    // Text objects
    if (obj.type === 'textbox' || obj.type === 'i-text') {
      const fs = obj.fontSize || 16;
      if (fs >= 28) {
        obj.set('fill', theme.primary);
      } else if (fs >= 18) {
        obj.set('fill', isDarkBg ? theme.textLight : theme.textLight);
      } else {
        obj.set('fill', theme.textMuted);
      }
    }
  });

  canvas.requestRenderAll();
  if (saveHistory) saveHistory();
};

export const addCanvaInfographicElement = (
  canvas: any,
  fabric: any,
  type: string
) => {
  if (!canvas || !fabric) return;

  if (type === 'stat-card') {
    const cardBg = new fabric.Rect({
      width: 240, height: 140, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 15, offsetY: 4 })
    });
    const topBar = new fabric.Rect({ width: 240, height: 8, rx: 4, ry: 4, fill: '#10b981' });
    const numText = new fabric.Textbox('98.5%', {
      left: 120, top: 28, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 36, fontWeight: 'bold', fill: '#0f172a'
    });
    const labelText = new fabric.Textbox('อัตราความพึงพอใจผู้รับบริการ', {
      left: 120, top: 82, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 14, fill: '#64748b'
    });
    const grp = new fabric.Group([cardBg, topBar, numText, labelText], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'kpi-trend-card') {
    const cardBg = new fabric.Rect({
      width: 260, height: 150, rx: 16, ry: 16, fill: '#0f172a', stroke: '#334155', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetY: 6 })
    });
    const titleTxt = new fabric.Textbox('สถิติการรับส่งหนังสืออิเล็กทรอนิกส์', {
      left: 20, top: 18, width: 220, fontFamily: 'Sarabun', fontSize: 13, fill: '#94a3b8', fontWeight: 'bold'
    });
    const numText = new fabric.Textbox('28,450', {
      left: 20, top: 44, width: 220, fontFamily: 'Prompt', fontSize: 36, fontWeight: 'bold', fill: '#38bdf8'
    });
    const trendBadgeBg = new fabric.Rect({
      left: 20, top: 102, width: 100, height: 26, rx: 6, ry: 6, fill: '#064e3b'
    });
    const trendText = new fabric.Textbox('▲ +24.8% YoY', {
      left: 70, top: 107, width: 90, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 11, fontWeight: 'bold', fill: '#34d399'
    });
    const subtext = new fabric.Textbox('เทียบกับช่วงเวลาเดียวกัน', {
      left: 130, top: 108, width: 120, fontFamily: 'Sarabun', fontSize: 11, fill: '#64748b'
    });
    const grp = new fabric.Group([cardBg, titleTxt, numText, trendBadgeBg, trendText, subtext], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'donut-chart') {
    const cardBg = new fabric.Rect({
      width: 220, height: 220, rx: 20, ry: 20, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 4 })
    });
    const outerRing = new fabric.Circle({
      left: 110, top: 90, radius: 55, fill: 'transparent', stroke: '#e2e8f0', strokeWidth: 14, originX: 'center', originY: 'center'
    });
    const activeRing = new fabric.Circle({
      left: 110, top: 90, radius: 55, fill: 'transparent', stroke: '#3b82f6', strokeWidth: 14, strokeDashArray: [260, 90], originX: 'center', originY: 'center'
    });
    const pctTxt = new fabric.Textbox('85%', {
      left: 110, top: 78, width: 100, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 26, fontWeight: 'bold', fill: '#0f172a'
    });
    const labelTxt = new fabric.Textbox('ความสำเร็จของโครงการ', {
      left: 110, top: 175, width: 200, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 13, fontWeight: 'bold', fill: '#475569'
    });
    const grp = new fabric.Group([cardBg, outerRing, activeRing, pctTxt, labelTxt], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'multi-bar-chart') {
    const cardBg = new fabric.Rect({
      width: 320, height: 200, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 4 })
    });
    const titleTxt = new fabric.Textbox('สถิติเปรียบเทียบผลงาน 3 ไตรมาส', {
      left: 20, top: 16, width: 280, fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#0f172a'
    });
    const barsData = [
      { label: 'Q1 สารบรรณ', w: 180, val: '72%', col: '#3b82f6' },
      { label: 'Q2 ทะเบียน', w: 220, val: '88%', col: '#06b6d4' },
      { label: 'Q3 อนุมัติ', w: 245, val: '98%', col: '#10b981' }
    ];
    const elements: any[] = [cardBg, titleTxt];
    barsData.forEach((b, idx) => {
      const py = 55 + (idx * 44);
      elements.push(new fabric.Textbox(b.label, { left: 20, top: py, width: 120, fontFamily: 'Sarabun', fontSize: 12, fill: '#475569', fontWeight: 'bold' }));
      elements.push(new fabric.Textbox(b.val, { left: 295, top: py, width: 60, originX: 'right', textAlign: 'right', fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: b.col }));
      elements.push(new fabric.Rect({ left: 20, top: py + 18, width: 275, height: 10, rx: 5, ry: 5, fill: '#f1f5f9' }));
      elements.push(new fabric.Rect({ left: 20, top: py + 18, width: b.w, height: 10, rx: 5, ry: 5, fill: b.col }));
    });
    const grp = new fabric.Group(elements, { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'timeline-step') {
    const cardBg = new fabric.Rect({
      width: 480, height: 110, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 4 })
    });
    const steps = [
      { num: '1', label: 'รับเรื่อง', col: '#3b82f6' },
      { num: '2', label: 'ตรวจทาน', col: '#06b6d4' },
      { num: '3', label: 'ลงนาม', col: '#8b5cf6' },
      { num: '4', label: 'ส่งออก', col: '#10b981' }
    ];
    const elements: any[] = [cardBg];
    // Connection line
    elements.push(new fabric.Rect({ left: 55, top: 40, width: 370, height: 4, fill: '#e2e8f0' }));
    steps.forEach((st, i) => {
      const cx = 55 + (i * 123);
      elements.push(new fabric.Circle({ left: cx, top: 42, radius: 18, fill: st.col, originX: 'center', originY: 'center' }));
      elements.push(new fabric.Textbox(st.num, { left: cx, top: 42, width: 30, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 16, fontWeight: 'bold', fill: '#ffffff' }));
      elements.push(new fabric.Textbox(st.label, { left: cx, top: 72, width: 80, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 12, fontWeight: 'bold', fill: '#334155' }));
    });
    const grp = new fabric.Group(elements, { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'comparison-box') {
    const mainBox = new fabric.Rect({
      width: 520, height: 240, rx: 16, ry: 16, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 4 })
    });
    const headerBar = new fabric.Rect({ width: 520, height: 40, rx: 16, ry: 16, fill: '#0f172a' });
    const headerTitle = new fabric.Textbox('ตารางเปรียบเทียบ: ก่อนปรับปรุง vs หลังปรับปรุงระบบ', {
      left: 260, top: 12, width: 480, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#ffffff'
    });
    const beforeBox = new fabric.Rect({ left: 15, top: 55, width: 235, height: 170, rx: 12, ry: 12, fill: '#fef2f2', stroke: '#fecaca', strokeWidth: 1 });
    const beforeTitle = new fabric.Textbox('❌ แบบเดิม (กระดาษ)', { left: 132, top: 68, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#dc2626' });
    const beforeText = new fabric.Textbox('• ใช้เวลาเสนอหนังสือ 3-5 วัน\n• เปลืองกระดาษและหมึกพิมพ์\n• สืบหาประวัติเอกสารได้ยาก\n• เสี่ยงเอกสารสูญหาย', { left: 30, top: 98, width: 205, fontFamily: 'Sarabun', fontSize: 12, fill: '#7f1d1d', lineHeight: 1.5 });

    const afterBox = new fabric.Rect({ left: 270, top: 55, width: 235, height: 170, rx: 12, ry: 12, fill: '#f0fdf4', stroke: '#bbf7d0', strokeWidth: 1 });
    const afterTitle = new fabric.Textbox('✅ แบบดิจิทัล EDMS (ใหม่)', { left: 387, top: 68, width: 220, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#16a34a' });
    const afterText = new fabric.Textbox('• อนุมัติรวดเร็วใน 5-15 นาที\n• ไร้กระดาษ 100% ประหยัดงบ\n• ค้นหาด้วย AI ได้ทันที 24 ชม.\n• ปลอดภัยด้วย e-Signature', { left: 285, top: 98, width: 205, fontFamily: 'Sarabun', fontSize: 12, fill: '#14532d', lineHeight: 1.5 });

    const grp = new fabric.Group([mainBox, headerBar, headerTitle, beforeBox, beforeTitle, beforeText, afterBox, afterTitle, afterText], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'device-phone-frame') {
    const phoneBody = new fabric.Rect({
      width: 220, height: 420, rx: 36, ry: 36, fill: '#0f172a', stroke: '#475569', strokeWidth: 4,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 25, offsetY: 10 })
    });
    const phoneScreen = new fabric.Rect({
      left: 10, top: 10, width: 200, height: 400, rx: 28, ry: 28, fill: '#1e293b'
    });
    const dynamicIsland = new fabric.Rect({
      left: 110, top: 22, width: 65, height: 16, rx: 8, ry: 8, fill: '#000000', originX: 'center', originY: 'center'
    });
    const mockAppTitle = new fabric.Textbox('Rayong EDMS App', {
      left: 110, top: 60, width: 180, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#38bdf8'
    });
    const mockCard1 = new fabric.Rect({ left: 25, top: 100, width: 170, height: 75, rx: 12, ry: 12, fill: '#334155' });
    const mockCard1Txt = new fabric.Textbox('หนังสือรอลงนาม: 3 รายการ', { left: 35, top: 115, width: 150, fontFamily: 'Sarabun', fontSize: 11, fontWeight: 'bold', fill: '#f8fafc' });
    const mockCard2 = new fabric.Rect({ left: 25, top: 190, width: 170, height: 75, rx: 12, ry: 12, fill: '#334155' });
    const mockCard2Txt = new fabric.Textbox('แจ้งเตือนภัย ปภ. ล่าสุด: ปกติ', { left: 35, top: 205, width: 150, fontFamily: 'Sarabun', fontSize: 11, fontWeight: 'bold', fill: '#34d399' });
    const homeIndicator = new fabric.Rect({ left: 110, top: 395, width: 90, height: 4, rx: 2, ry: 2, fill: '#94a3b8', originX: 'center', originY: 'center' });

    const grp = new fabric.Group([phoneBody, phoneScreen, dynamicIsland, mockAppTitle, mockCard1, mockCard1Txt, mockCard2, mockCard2Txt, homeIndicator], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'device-laptop-frame') {
    const laptopLid = new fabric.Rect({
      width: 440, height: 260, rx: 14, ry: 14, fill: '#1e293b', stroke: '#475569', strokeWidth: 3,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.25)', blur: 25, offsetY: 8 })
    });
    const laptopScreen = new fabric.Rect({
      left: 12, top: 12, width: 416, height: 236, rx: 6, ry: 6, fill: '#0f172a'
    });
    const cameraDot = new fabric.Circle({ left: 220, top: 6, radius: 2.5, fill: '#64748b', originX: 'center' });
    const screenHeading = new fabric.Textbox('ระบบบริหารงานสารบรรณอิเล็กทรอนิกส์ ระยอง', {
      left: 220, top: 35, width: 380, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#38bdf8'
    });
    const laptopBase = new fabric.Rect({
      left: -20, top: 260, width: 480, height: 14, rx: 6, ry: 6, fill: '#334155', stroke: '#475569', strokeWidth: 1
    });
    const notchLip = new fabric.Rect({ left: 200, top: 260, width: 40, height: 4, rx: 2, ry: 2, fill: '#64748b' });

    const grp = new fabric.Group([laptopLid, laptopScreen, cameraDot, screenHeading, laptopBase, notchLip], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'photo-polaroid-frame') {
    const polaroidCard = new fabric.Rect({
      width: 220, height: 270, rx: 6, ry: 6, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 18, offsetY: 6 })
    });
    const photoArea = new fabric.Rect({
      left: 15, top: 15, width: 190, height: 180, rx: 4, ry: 4, fill: '#e0e7ff'
    });
    const photoLabel = new fabric.Textbox('ภาพกิจกรรม / ผู้บริหาร', {
      left: 110, top: 95, width: 160, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 13, fontWeight: 'bold', fill: '#4338ca'
    });
    const caption = new fabric.Textbox('พิธีเปิดโครงการ EEC Rayong 2026', {
      left: 110, top: 215, width: 190, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 11, fontWeight: 'bold', fill: '#1e293b'
    });
    const grp = new fabric.Group([polaroidCard, photoArea, photoLabel, caption], { left: 100, top: 100, angle: -2 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'quote-card') {
    const quoteBg = new fabric.Rect({
      width: 440, height: 130, rx: 16, ry: 16, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.05)', blur: 12, offsetY: 3 })
    });
    const sideBorder = new fabric.Rect({ width: 8, height: 130, rx: 4, ry: 4, fill: '#2563eb' });
    const quoteMark = new fabric.Textbox('“', {
      left: 25, top: 5, width: 40, fontFamily: 'Prompt', fontSize: 48, fontWeight: 'bold', fill: '#93c5fd'
    });
    const quoteText = new fabric.Textbox('“ขับเคลื่อนราชการไทยสู่ระบบดิจิทัลที่ทันสมัย โปร่งใส และเข้าถึงได้ตลอด 24 ชั่วโมง”', {
      left: 45, top: 25, width: 375, fontFamily: 'Sarabun', fontSize: 13, fontWeight: 'bold', fill: '#1e293b', lineHeight: 1.4
    });
    const authorText = new fabric.Textbox('— ผู้ว่าราชการจังหวัดระยอง', {
      left: 45, top: 90, width: 375, fontFamily: 'Prompt', fontSize: 12, fill: '#64748b'
    });
    const grp = new fabric.Group([quoteBg, sideBorder, quoteMark, quoteText, authorText], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'garuda-badge') {
    const badgeBg = new fabric.Rect({
      width: 380, height: 70, rx: 12, ry: 12, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 2,
      shadow: new fabric.Shadow({ color: 'rgba(245, 158, 11, 0.2)', blur: 15, offsetY: 2 })
    });
    const sealCircle = new fabric.Circle({ left: 35, top: 35, radius: 24, fill: '#f59e0b', originX: 'center', originY: 'center' });
    const sealTxt = new fabric.Textbox('ครุฑ', { left: 35, top: 35, width: 40, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 11, fontWeight: 'bold', fill: '#0f172a' });
    const titleTxt = new fabric.Textbox('หนังสือราชการและประกาศทางการ', { left: 75, top: 16, width: 285, fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#ffffff' });
    const subTxt = new fabric.Textbox('ศูนย์อำนวยการและประสานงาน จังหวัดระยอง', { left: 75, top: 38, width: 285, fontFamily: 'Sarabun', fontSize: 12, fill: '#fcd34d' });
    const grp = new fabric.Group([badgeBg, sealCircle, sealTxt, titleTxt, subTxt], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'smart-city-badge') {
    const badgeBg = new fabric.Rect({
      width: 320, height: 65, rx: 32, ry: 32, fill: '#042f2e', stroke: '#14b8a6', strokeWidth: 2,
      shadow: new fabric.Shadow({ color: 'rgba(20, 184, 166, 0.25)', blur: 15, offsetY: 2 })
    });
    const iconCircle = new fabric.Circle({ left: 32, top: 32, radius: 20, fill: '#14b8a6', originX: 'center', originY: 'center' });
    const iconTxt = new fabric.Textbox('EEC', { left: 32, top: 32, width: 35, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 10, fontWeight: 'bold', fill: '#ffffff' });
    const titleTxt = new fabric.Textbox('RAYONG SMART CITY 2026', { left: 65, top: 14, width: 240, fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: '#5eead4' });
    const subTxt = new fabric.Textbox('เมืองอัจฉริยะน่าอยู่และศูนย์กลาง EEC', { left: 65, top: 34, width: 240, fontFamily: 'Sarabun', fontSize: 11, fill: '#ccfbf1' });
    const grp = new fabric.Group([badgeBg, iconCircle, iconTxt, titleTxt, subTxt], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'badge-num') {
    const circle = new fabric.Circle({ radius: 28, fill: '#3b82f6' });
    const num = new fabric.Textbox('1', {
      left: 28, top: 28, width: 40, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 28, fontWeight: 'bold', fill: '#ffffff'
    });
    const grp = new fabric.Group([circle, num], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'progress-bar') {
    const bgBar = new fabric.Rect({ width: 320, height: 24, rx: 12, ry: 12, fill: '#e2e8f0' });
    const fillBar = new fabric.Rect({ width: 240, height: 24, rx: 12, ry: 12, fill: '#06b6d4' });
    const txt = new fabric.Textbox('75%', {
      left: 300, top: 12, width: 60, originX: 'right', originY: 'center', textAlign: 'right', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#ffffff'
    });
    const grp = new fabric.Group([bgBar, fillBar, txt], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  } else if (type === 'alert-bar') {
    const bg = new fabric.Rect({ width: 500, height: 60, rx: 12, ry: 12, fill: '#fef2f2', stroke: '#ef4444', strokeWidth: 2 });
    const badge = new fabric.Rect({ width: 120, height: 36, left: 12, top: 12, rx: 8, ry: 8, fill: '#ef4444' });
    const badgeTxt = new fabric.Textbox('ประกาศด่วน', { left: 72, top: 30, width: 100, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#ffffff' });
    const bodyTxt = new fabric.Textbox('ข้อความแจ้งเตือนภัยหรือข้อมูลสำคัญประเด็นเร่งด่วน', { left: 145, top: 20, width: 340, fontFamily: 'Sarabun', fontSize: 15, fill: '#991b1b', fontWeight: 'bold' });
    const grp = new fabric.Group([bg, badge, badgeTxt, bodyTxt], { left: 100, top: 100 });
    canvas.add(grp);
    canvas.setActiveObject(grp);
  }

  canvas.requestRenderAll();
};

export const loadCanvaTemplate = (
  templateId: string,
  canvas: any,
  fabric: any,
  setCanvasSize: (size: { width: number; height: number }) => void,
  setBackgroundColor: (col: string) => void,
  saveHistory: () => void
) => {
  if (!canvas || !fabric) return;

  if (templateId === 'comparison-matrix') {
    const width = 1280;
    const height = 720;
    setCanvasSize({ width, height });
    setBackgroundColor('#f8fafc');
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';

    const objects: any[] = [];
    // Header
    objects.push(new fabric.Textbox('การเปรียบเทียบผลลัพธ์การเปลี่ยนผ่านสู่ e-Document', {
      left: width / 2, top: 40, width: 1100, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 34, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox('การวิเคราะห์เปรียบเทียบประสิทธิภาพก่อนและหลังนำระบบ EDMS ดิจิทัลมาใช้งานในจังหวัดระยอง', {
      left: width / 2, top: 85, width: 1000, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#64748b', fontSize: 18
    }));

    // Side by Side Cards
    const colW = 560;
    const cardH = 460;
    const cardY = 140;

    // Before Card
    objects.push(new fabric.Rect({ left: 60, top: cardY, width: colW, height: cardH, rx: 20, ry: 20, fill: '#ffffff', stroke: '#fca5a5', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(239,68,68,0.08)', blur: 20, offsetY: 6 }) }));
    objects.push(new fabric.Rect({ left: 60, top: cardY, width: colW, height: 50, rx: 20, ry: 20, fill: '#dc2626' }));
    objects.push(new fabric.Textbox('❌ ระบบเอกสารกระดาษแบบเดิม (Traditional Paper)', { left: 60 + colW / 2, top: cardY + 25, width: colW - 40, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 18, fontWeight: 'bold' }));

    const beforeItems = [
      { t: 'ระยะเวลาอนุมัติ:', d: 'เฉลี่ย 3 - 7 วันต่อฉบับ เสียเวลารอลงนามตามลำดับชั้น' },
      { t: 'ต้นทุนทรัพยากร:', d: 'ค่ากระดาษ หมึกพิมพ์ แฟ้ม และค่าขนส่งเอกสารปีละกว่า 450,000 บาท' },
      { t: 'การสืบค้นข้อมูล:', d: 'ค้นหาเอกสารย้อนหลังใช้เวลาเฉลี่ย 1-2 ชั่วโมง ต้องรื้อตู้เอกสาร' },
      { t: 'ความเสี่ยงข้อมูล:', d: 'เอกสารชำรุด สูญหายจากภัยธรรมชาติ หรือถูกแก้ไขโดยไม่ได้รับอนุญาต' }
    ];
    beforeItems.forEach((item, idx) => {
      const iy = cardY + 70 + (idx * 90);
      objects.push(new fabric.Textbox(item.t, { left: 90, top: iy, width: colW - 60, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#991b1b' }));
      objects.push(new fabric.Textbox(item.d, { left: 90, top: iy + 24, width: colW - 60, fontFamily: 'Sarabun', fontSize: 14, fill: '#4b5563', lineHeight: 1.4 }));
    });

    // After Card
    objects.push(new fabric.Rect({ left: 660, top: cardY, width: colW, height: cardH, rx: 20, ry: 20, fill: '#ffffff', stroke: '#86efac', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(34,197,94,0.08)', blur: 20, offsetY: 6 }) }));
    objects.push(new fabric.Rect({ left: 660, top: cardY, width: colW, height: 50, rx: 20, ry: 20, fill: '#16a34a' }));
    objects.push(new fabric.Textbox('✅ ระบบเอกสารดิจิทัล e-Document (Digital EDMS)', { left: 660 + colW / 2, top: cardY + 25, width: colW - 40, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 18, fontWeight: 'bold' }));

    const afterItems = [
      { t: 'ระยะเวลาอนุมัติ:', d: 'เฉลี่ยเพียง 5 - 15 นาที อนุมัติผ่าน Mobile & Web ได้ทุกที่ 24 ชม.' },
      { t: 'ต้นทุนทรัพยากร:', d: 'ลดค่าใช้จ่ายกระดาษและหมึกพิมพ์ลงได้กว่า 90% (Paperless)' },
      { t: 'การสืบค้นข้อมูล:', d: 'ค้นหาด้วยระบบ AI อัจฉริยะแบบ Full-text Search ภายใน 1 วินาที' },
      { t: 'ความปลอดภัยสูงสุด:', d: 'เข้ารหัสลับ SHA-256 มาตรฐานสากล มี Audit Log บันทึกทุกขั้นตอน' }
    ];
    afterItems.forEach((item, idx) => {
      const iy = cardY + 70 + (idx * 90);
      objects.push(new fabric.Textbox(item.t, { left: 690, top: iy, width: colW - 60, fontFamily: 'Prompt', fontSize: 15, fontWeight: 'bold', fill: '#166534' }));
      objects.push(new fabric.Textbox(item.d, { left: 690, top: iy + 24, width: colW - 60, fontFamily: 'Sarabun', fontSize: 14, fill: '#1f2937', lineHeight: 1.4 }));
    });

    // Footer summary
    objects.push(new fabric.Rect({ left: 60, top: 620, width: 1160, height: 60, rx: 12, ry: 12, fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 1 }));
    objects.push(new fabric.Textbox('🎯 สรุปผลลัพธ์: ประสิทธิภาพการทำงานเพิ่มขึ้น 450% และสร้างความพึงพอใจให้ประชาชนสูงสุด 99.4%', { left: width / 2, top: 648, width: 1100, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#1e40af', fontSize: 16, fontWeight: 'bold' }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  } else if (templateId === 'policy-notice') {
    const width = 794;
    const height = 1123;
    setCanvasSize({ width, height });
    setBackgroundColor('#ffffff');
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    const objects: any[] = [];
    // Border frame
    objects.push(new fabric.Rect({ left: 20, top: 20, width: width - 40, height: height - 40, fill: '#fcfcfc', stroke: '#1e3a8a', strokeWidth: 3, rx: 16, ry: 16 }));
    objects.push(new fabric.Rect({ left: 30, top: 30, width: width - 60, height: height - 60, fill: 'transparent', stroke: '#d97706', strokeWidth: 1, rx: 12, ry: 12 }));

    // Garuda Seal Header
    objects.push(new fabric.Circle({ left: width / 2, top: 90, radius: 36, fill: '#b45309', originX: 'center', originY: 'center' }));
    objects.push(new fabric.Textbox('ตราครุฑ', { left: width / 2, top: 90, width: 60, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 13, fontWeight: 'bold', fill: '#ffffff' }));

    // Title
    objects.push(new fabric.Textbox('ประกาศจังหวัดระยอง', { left: width / 2, top: 145, width: 600, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#1e3a8a', fontSize: 28, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('เรื่อง มาตรการความปลอดภัยและการให้บริการประชาชนด้านดิจิทัล ประจำปี 2569', { left: width / 2, top: 185, width: 660, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#475569', fontSize: 16, fontWeight: 'bold' }));

    // Decorative line
    objects.push(new fabric.Rect({ left: width / 2, top: 220, width: 500, height: 2, fill: '#d97706', originX: 'center' }));

    // Content Pillars
    const policies = [
      {
        num: 'ข้อที่ ๑',
        title: 'การยกระดับบริการผ่านระบบสารบรรณอิเล็กทรอนิกส์ (e-Service)',
        desc: 'ให้ทุกหน่วยงานในสังกัดจังหวัดระยองดำเนินการรับ-ส่งหนังสือราชการผ่านระบบดิจิทัล 100% เพื่อความรวดเร็วและตรวจสอบได้'
      },
      {
        num: 'ข้อที่ ๒',
        title: 'มาตรการรักษาความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity)',
        desc: 'กำหนดให้เจ้าหน้าที่ผู้ปฏิบัติงานใช้การยืนยันตัวตนสองชั้น (2FA) และห้ามเปิดเผยรหัสผ่านในการเข้าถึงฐานข้อมูลราชการ'
      },
      {
        num: 'ข้อที่ ๓',
        title: 'การบูรณาการข้อมูลเพื่อการเตือนภัยสาธารณภัย (Disaster Ready)',
        desc: 'เชื่อมโยงข้อมูลเซนเซอร์ตรวจวัดน้ำฝนและสภาพอากาศในพื้นที่ EEC เข้ากับศูนย์บัญชาการ ปภ. เพื่อเตือนภัยประชาชนแบบเรียลไทม์'
      },
      {
        num: 'ข้อที่ ๔',
        title: 'การเปิดเผยข้อมูลภาครัฐตามหลักธรรมาภิบาล (Open Data)',
        desc: 'เผยแพร่สถิติการดำเนินงานและงบประมาณอย่างโปร่งใสผ่านช่องทางออนไลน์ เพื่อให้ประชาชนมีส่วนร่วมในการตรวจสอบ'
      }
    ];

    policies.forEach((p, i) => {
      const py = 245 + (i * 175);
      objects.push(new fabric.Rect({ left: 60, top: py, width: width - 120, height: 155, rx: 14, ry: 14, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1.5, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.04)', blur: 10, offsetY: 2 }) }));
      objects.push(new fabric.Rect({ left: 80, top: py + 16, width: 80, height: 28, rx: 6, ry: 6, fill: '#1e3a8a' }));
      objects.push(new fabric.Textbox(p.num, { left: 120, top: py + 22, width: 70, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: '#ffffff' }));
      objects.push(new fabric.Textbox(p.title, { left: 175, top: py + 20, width: width - 260, fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#0f172a' }));
      objects.push(new fabric.Textbox(p.desc, { left: 80, top: py + 60, width: width - 160, fontFamily: 'Sarabun', fontSize: 13.5, fill: '#475569', lineHeight: 1.5 }));
    });

    // Signature Area
    objects.push(new fabric.Textbox('ประกาศ ณ วันที่ ๑ ตุลาคม พุทธศักราช ๒๕๖๙', { left: width / 2, top: 965, width: 600, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#334155', fontSize: 15 }));
    objects.push(new fabric.Textbox('(นายอนุมัติ พัฒนาระยอง)', { left: width / 2, top: 1010, width: 400, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 16, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('ผู้ว่าราชการจังหวัดระยอง', { left: width / 2, top: 1035, width: 400, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#64748b', fontSize: 14 }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  } else if (templateId === 'eec-smart-city') {
    const width = 1080;
    const height = 1080;
    setCanvasSize({ width, height });
    setBackgroundColor('#030712');
    canvas.clear();
    canvas.backgroundColor = '#030712';

    const objects: any[] = [];
    // Background Glow
    objects.push(new fabric.Circle({ left: width / 2, top: 200, radius: 280, fill: 'rgba(6, 182, 212, 0.08)', originX: 'center', originY: 'center' }));
    objects.push(new fabric.Circle({ left: 850, top: 800, radius: 250, fill: 'rgba(99, 102, 241, 0.08)', originX: 'center', originY: 'center' }));

    // Pill Badge
    objects.push(new fabric.Rect({ left: width / 2, top: 60, width: 340, height: 42, rx: 21, ry: 21, fill: '#082f49', stroke: '#06b6d4', strokeWidth: 1.5, originX: 'center', originY: 'center' }));
    objects.push(new fabric.Textbox('⚡ RAYONG SMART CITY 2026', { left: width / 2, top: 60, width: 320, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 14, fontWeight: 'bold', fill: '#22d3ee' }));

    // Main Title
    objects.push(new fabric.Textbox('ขับเคลื่อนระยอง สู่เมืองอัจฉริยะน่าอยู่', { left: width / 2, top: 115, width: 950, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 44, fontWeight: 'bold', fill: '#ffffff' }));
    objects.push(new fabric.Textbox('ยกระดับคุณภาพชีวิตประชาชนและสิ่งแวดล้อม ด้วยเทคโนโลยีดิจิทัลและข้อมูลเปิด EEC', { left: width / 2, top: 175, width: 900, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 20, fill: '#94a3b8' }));

    // 4 Bento Cards
    const cards = [
      { title: 'Smart Governance', sub: 'ระบบราชการไร้กระดาษ 100% สารบรรณดิจิทัล และ e-Service 24 ชม.', stat: '100%', tag: 'บริการดิจิทัล', col: '#06b6d4' },
      { title: 'Smart Environment', sub: 'เครือข่ายเซนเซอร์ IoT ตรวจวัดคุณภาพอากาศ PM2.5 และระดับน้ำฝน', stat: '142 จุด', tag: 'IoT ตรวจวัด', col: '#10b981' },
      { title: 'Smart Economy', sub: 'ส่งเสริมการลงทุนอุตสาหกรรมเป้าหมาย S-Curve และพัฒนาทักษะแรงงาน', stat: '4.8 แสนล้าน', tag: 'มูลค่าลงทุน', col: '#f59e0b' },
      { title: 'Smart Living', sub: 'ศูนย์สั่งการความปลอดภัย CCTV AI อัจฉริยะ และระบบแจ้งเตือนภัย ปภ.', stat: '24 ชม.', tag: 'ความปลอดภัย', col: '#8b5cf6' }
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 80 + (col * 470);
      const cy = 250 + (row * 330);

      objects.push(new fabric.Rect({ left: cx, top: cy, width: 450, height: 300, rx: 20, ry: 20, fill: '#111827', stroke: '#1f2937', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 20, offsetY: 6 }) }));
      objects.push(new fabric.Rect({ left: cx, top: cy, width: 450, height: 6, rx: 3, ry: 3, fill: c.col }));
      
      // Tag
      objects.push(new fabric.Rect({ left: cx + 30, top: cy + 30, width: 110, height: 28, rx: 6, ry: 6, fill: c.col + '22', stroke: c.col, strokeWidth: 1 }));
      objects.push(new fabric.Textbox(c.tag, { left: cx + 85, top: cy + 36, width: 100, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 11, fontWeight: 'bold', fill: c.col }));

      // Stat
      objects.push(new fabric.Textbox(c.stat, { left: cx + 420, top: cy + 25, width: 180, originX: 'right', textAlign: 'right', fontFamily: 'Prompt', fontSize: 26, fontWeight: 'bold', fill: c.col }));

      // Title & desc
      objects.push(new fabric.Textbox(c.title, { left: cx + 30, top: cy + 85, width: 390, fontFamily: 'Prompt', fontSize: 22, fontWeight: 'bold', fill: '#ffffff' }));
      objects.push(new fabric.Textbox(c.sub, { left: cx + 30, top: cy + 130, width: 390, fontFamily: 'Sarabun', fontSize: 16, fill: '#9ca3af', lineHeight: 1.5 }));
    });

    // Footer ribbon
    objects.push(new fabric.Rect({ left: 80, top: 930, width: 920, height: 80, rx: 16, ry: 16, fill: '#1e293b', stroke: '#334155', strokeWidth: 1 }));
    objects.push(new fabric.Textbox('🌐 ข้อมูลเปิดและระบบบริการประชาชน: www.rayong-smartcity.go.th | ศูนย์ประสานงาน EEC ระยอง', { left: width / 2, top: 960, width: 880, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 16, fontWeight: 'bold', fill: '#cbd5e1' }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  } else if (templateId === 'govtech-digital') {
    const width = 1080;
    const height = 1920;
    setCanvasSize({ width, height });
    setBackgroundColor('#0b1329');
    canvas.clear();
    canvas.backgroundColor = '#0b1329';

    const objects: any[] = [];
    // Header Hero Banner
    objects.push(new fabric.Rect({ left: 0, top: 0, width: width, height: 320, fill: '#111d40' }));
    objects.push(new fabric.Textbox('THAILAND GOVTECH 2026', { left: width / 2, top: 60, width: 800, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 20, fontWeight: 'bold', fill: '#38bdf8' }));
    objects.push(new fabric.Textbox('การเปลี่ยนผ่านงานสารบรรณสู่ดิจิทัล', { left: width / 2, top: 100, width: 960, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 48, fontWeight: 'bold', fill: '#ffffff' }));
    objects.push(new fabric.Textbox('ยกระดับความโปร่งใส รวดเร็ว และลดการใช้กระดาษในหน่วยงานภาครัฐ', { left: width / 2, top: 180, width: 900, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 24, fill: '#94a3b8' }));

    // 3 Big Highlight Metric Circles
    const metrics = [
      { val: '99.8%', label: 'ลดเอกสารสูญหาย', col: '#10b981' },
      { val: '10 นาที', label: 'เฉลี่ยเวลาลงนาม', col: '#38bdf8' },
      { val: '45 ล้าน', label: 'ประหยัดงบกระดาษ', col: '#f59e0b' }
    ];

    metrics.forEach((m, idx) => {
      const mx = 120 + (idx * 310);
      objects.push(new fabric.Rect({ left: mx, top: 360, width: 280, height: 180, rx: 20, ry: 20, fill: '#1a2750', stroke: m.col, strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 15, offsetY: 5 }) }));
      objects.push(new fabric.Textbox(m.val, { left: mx + 140, top: 400, width: 260, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 42, fontWeight: 'bold', fill: '#ffffff' }));
      objects.push(new fabric.Textbox(m.label, { left: mx + 140, top: 475, width: 260, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 18, fontWeight: 'bold', fill: m.col }));
    });

    // 4 Key Pillars Cards
    const pillars = [
      { title: '1. e-Document & e-Filing', desc: 'จัดเก็บและค้นหาเอกสารราชการในรูปแบบไฟล์ดิจิทัลพร้อม Metadata และระบบสืบค้นอัจฉริยะ AI', icon: '📁', col: '#3b82f6' },
      { title: '2. e-Signature & PKI Trust', desc: 'ลายมือชื่ออิเล็กทรอนิกส์ที่มีผลทางกฎหมายตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พร้อม Time Stamp', icon: '✍️', col: '#8b5cf6' },
      { title: '3. Data Security & ISO 27001', desc: 'การควบคุมสิทธิ์การเข้าถึงแบบ Role-based Access Control และบันทึก Audit Log ป้องกันการแก้ไข', icon: '🔒', col: '#06b6d4' },
      { title: '4. AI Assistance & OCR Smart', desc: 'ระบบรู้จำตัวอักษร OCR แปลงเอกสารสแกนเป็นข้อความที่สืบค้นได้ พร้อมระบบสรุปใจความสำคัญ', icon: '🤖', col: '#ec4899' }
    ];

    pillars.forEach((p, idx) => {
      const py = 580 + (idx * 260);
      objects.push(new fabric.Rect({ left: 80, top: py, width: 920, height: 230, rx: 24, ry: 24, fill: '#142044', stroke: '#273b75', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.35)', blur: 20, offsetY: 6 }) }));
      objects.push(new fabric.Rect({ left: 80, top: py, width: 12, height: 230, rx: 6, ry: 6, fill: p.col }));
      objects.push(new fabric.Textbox(p.title, { left: 130, top: py + 35, width: 820, fontFamily: 'Prompt', fontSize: 28, fontWeight: 'bold', fill: '#ffffff' }));
      objects.push(new fabric.Textbox(p.desc, { left: 130, top: py + 95, width: 820, fontFamily: 'Sarabun', fontSize: 21, fill: '#cbd5e1', lineHeight: 1.5 }));
    });

    // Bottom CTA & Contact
    objects.push(new fabric.Rect({ left: 80, top: 1670, width: 920, height: 180, rx: 24, ry: 24, fill: '#1e326b', stroke: '#3b82f6', strokeWidth: 2 }));
    objects.push(new fabric.Textbox('ร่วมขับเคลื่อนองค์กรสู่ระบบราชการดิจิทัลวันนี้', { left: width / 2, top: 1715, width: 850, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 30, fontWeight: 'bold', fill: '#ffffff' }));
    objects.push(new fabric.Textbox('ติดต่อฝ่ายพัฒนาระบบดิจิทัล จังหวัดระยอง | โทร 038-694-000', { left: width / 2, top: 1775, width: 850, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fontSize: 20, fill: '#93c5fd' }));

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  } else if (templateId === 'org-structure') {
    const width = 1280;
    const height = 720;
    setCanvasSize({ width, height });
    setBackgroundColor('#f8fafc');
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';

    const objects: any[] = [];
    // Header
    objects.push(new fabric.Textbox('โครงสร้างและสายการบังคับบัญชาศูนย์ปฏิบัติการดิจิทัล', { left: width / 2, top: 35, width: 1000, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 32, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('แผนผังการบริหารจัดการงานสารบรรณและประสานงานสาธารณภัย จังหวัดระยอง', { left: width / 2, top: 80, width: 900, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#64748b', fontSize: 18 }));

    // Level 1: Top Executive
    objects.push(new fabric.Rect({ left: width / 2 - 170, top: 130, width: 340, height: 95, rx: 16, ry: 16, fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 15, offsetY: 4 }) }));
    objects.push(new fabric.Textbox('ผู้อำนวยการศูนย์ปฏิบัติการ', { left: width / 2, top: 148, width: 300, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#38bdf8', fontSize: 16, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('กำกับดูแลยุทธศาสตร์และนโยบายภาพรวม', { left: width / 2, top: 178, width: 300, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#94a3b8', fontSize: 13 }));

    // Connector Line Down
    objects.push(new fabric.Rect({ left: width / 2 - 1.5, top: 225, width: 3, height: 45, fill: '#3b82f6' }));
    // Horizontal Crossbar
    objects.push(new fabric.Rect({ left: 180, top: 270, width: 920, height: 3, fill: '#3b82f6' }));

    // Level 2: 3 Departments
    const depts = [
      { title: 'กลุ่มงานสารบรรณดิจิทัล', sub: 'รับ-ส่งหนังสือ, ทะเบียนกลาง, e-Signature', col: '#3b82f6', x: 70 },
      { title: 'กลุ่มงานเฝ้าระวัง & ปภ.', sub: 'เตือนภัย, เรดาร์น้ำฝน, แผนเผชิญเหตุ', col: '#ef4444', x: 480 },
      { title: 'กลุ่มงานโครงสร้างพื้นฐาน IoT', sub: 'เซนเซอร์ EEC, คลาวด์, ความปลอดภัย', col: '#10b981', x: 890 }
    ];

    depts.forEach((d) => {
      const midX = d.x + 160;
      objects.push(new fabric.Rect({ left: midX - 1.5, top: 270, width: 3, height: 35, fill: d.col }));
      objects.push(new fabric.Rect({ left: d.x, top: 305, width: 320, height: 110, rx: 16, ry: 16, fill: '#ffffff', stroke: d.col, strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 15, offsetY: 4 }) }));
      objects.push(new fabric.Rect({ left: d.x, top: 305, width: 320, height: 8, rx: 4, ry: 4, fill: d.col }));
      objects.push(new fabric.Textbox(d.title, { left: midX, top: 328, width: 290, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#0f172a', fontSize: 16, fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(d.sub, { left: midX, top: 365, width: 290, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#64748b', fontSize: 13, lineHeight: 1.4 }));

      // Sub-units below
      objects.push(new fabric.Rect({ left: midX - 1.5, top: 415, width: 3, height: 25, fill: '#cbd5e1' }));
      objects.push(new fabric.Rect({ left: d.x + 20, top: 440, width: 280, height: 190, rx: 12, ry: 12, fill: '#f1f5f9', stroke: '#e2e8f0', strokeWidth: 1 }));
      objects.push(new fabric.Textbox('หน้าที่รับผิดชอบหลัก:', { left: d.x + 35, top: 455, width: 250, fontFamily: 'Prompt', fontSize: 12, fontWeight: 'bold', fill: '#334155' }));
      const tasks = d.col === '#3b82f6'
        ? ['• จัดการทะเบียนรับ-ส่งกลาง', '• ตรวจสอบร่างหนังสือราชการ', '• ออกเลขหนังสือด่วนและลับ', '• คัดแยกจัดเก็บถาวร']
        : d.col === '#ef4444'
        ? ['• ตรวจสอบข้อมูลเรดาร์ 24 ชม.', '• ประสานงานกู้ภัย 8 อำเภอ', '• ออกประกาศเตือนภัยฉุกเฉิน', '• ประเมินพื้นที่เสี่ยงอุทกภัย']
        : ['• ดูแลเซนเซอร์ตรวจวัด EEC', '• บริหารจัดการระบบ Cloud', '• สำรองข้อมูลทุก 6 ชั่วโมง', '• ตรวจสอบระบบรักษาความปลอดภัย'];

      tasks.forEach((t, ti) => {
        objects.push(new fabric.Textbox(t, { left: d.x + 35, top: 485 + (ti * 32), width: 250, fontFamily: 'Sarabun', fontSize: 12, fill: '#475569' }));
      });
    });

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  } else if (templateId === 'strategic-roadmap') {
    const width = 1920;
    const height = 1080;
    setCanvasSize({ width, height });
    setBackgroundColor('#0b132b');
    canvas.clear();
    canvas.backgroundColor = '#0b132b';

    const objects: any[] = [];
    // Title
    objects.push(new fabric.Textbox('แผนยุทธศาสตร์การพัฒนาสารสนเทศดิจิทัล 5 ปี (2569 - 2573)', { left: width / 2, top: 60, width: 1600, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 48, fontWeight: 'bold' }));
    objects.push(new fabric.Textbox('ROADMAP สู่การเป็นศูนย์กลางข้อมูลอัจฉริยะ EEC และการบริหารจัดการภาครัฐโปร่งใส', { left: width / 2, top: 130, width: 1400, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#38bdf8', fontSize: 24 }));

    const pillars = [
      { yr: 'ปีที่ 1 (2569)', title: 'Digital Foundation', sub: 'วางรากฐานระบบ EDMS ไร้กระดาษ 100% เชื่อมโยงทุกอำเภอ', kpi: '100% Paperless', col: '#3b82f6' },
      { yr: 'ปีที่ 2 (2570)', title: 'AI & Automation', sub: 'ประยุกต์ใช้ AI ในการสรุปหนังสือและคัดแยกเอกสารอัตโนมัติ', kpi: 'ลดเวลา 80%', col: '#06b6d4' },
      { yr: 'ปีที่ 3 (2571)', title: 'Big Data & IoT EEC', sub: 'บูรณาการข้อมูลเซนเซอร์ สภาพอากาศ และระบบ ปภ. ระดับจังหวัด', kpi: 'Real-time 24/7', col: '#10b981' },
      { yr: 'ปีที่ 4 (2572)', title: 'Open Governance', sub: 'เปิดเผยข้อมูลสถิติสาธารณะ Open Data ประชาชนมีส่วนร่วม', kpi: 'Transparency A+', col: '#f59e0b' },
      { yr: 'ปีที่ 5 (2573)', title: 'Smart Sustainable City', sub: 'ระยองต้นแบบเมืองอัจฉริยะชั้นนำแห่งภูมิภาคอาเซียน', kpi: 'Top 10 ASEAN', col: '#a855f7' }
    ];

    pillars.forEach((p, idx) => {
      const px = 70 + (idx * 360);
      objects.push(new fabric.Rect({ left: px, top: 220, width: 330, height: 680, rx: 24, ry: 24, fill: '#1c2541', stroke: p.col, strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 25, offsetY: 8 }) }));
      objects.push(new fabric.Rect({ left: px, top: 220, width: 330, height: 60, rx: 24, ry: 24, fill: p.col }));
      objects.push(new fabric.Textbox(p.yr, { left: px + 165, top: 235, width: 300, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 20, fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(p.title, { left: px + 165, top: 310, width: 290, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 22, fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(p.sub, { left: px + 25, top: 380, width: 280, fontFamily: 'Sarabun', fill: '#cbd5e1', fontSize: 18, lineHeight: 1.6 }));

      // KPI box
      objects.push(new fabric.Rect({ left: px + 25, top: 760, width: 280, height: 100, rx: 16, ry: 16, fill: '#0b132b', stroke: '#3a506b', strokeWidth: 1.5 }));
      objects.push(new fabric.Textbox('เป้าหมายตัวชี้วัด (KPI):', { left: px + 40, top: 775, width: 250, fontFamily: 'Sarabun', fontSize: 14, fill: '#94a3b8', fontWeight: 'bold' }));
      objects.push(new fabric.Textbox(p.kpi, { left: px + 165, top: 805, width: 260, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fontSize: 22, fontWeight: 'bold', fill: p.col }));
    });

    objects.forEach(obj => canvas.add(obj));
    canvas.requestRenderAll();
    saveHistory();
  }
};

export const generateFullAILegend = (
  canvas: any,
  fabric: any,
  aiData: any,
  setCanvasSize: (size: { width: number; height: number }) => void,
  setBackgroundColor: (col: string) => void,
  saveHistory: () => void
) => {
  if (!canvas || !fabric || !aiData) return;

  const width = 1280;
  const height = 800;
  setCanvasSize({ width, height });

  const primaryCol = aiData.colors?.[0] || '#2563eb';
  const secondaryCol = aiData.colors?.[1] || '#06b6d4';
  const accentCol = aiData.colors?.[2] || '#10b981';

  setBackgroundColor('#0f172a');
  canvas.clear();
  canvas.backgroundColor = '#0f172a';

  const objects: any[] = [];

  // Top Header Banner
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: width, height: 130, fill: '#1e293b', stroke: '#334155', strokeWidth: 1
  }));
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: width, height: 6, fill: primaryCol
  }));

  objects.push(new fabric.Textbox(aiData.title || 'อินโฟกราฟิกสรุปสาระสำคัญ', {
    left: width / 2, top: 25, width: 1100, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 32, fontWeight: 'bold'
  }));
  objects.push(new fabric.Textbox(aiData.subtitle || 'ข้อมูลและสาระสำคัญสำหรับประชาสัมพันธ์', {
    left: width / 2, top: 78, width: 1000, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#94a3b8', fontSize: 16
  }));

  // Stats Row (If any)
  const statsList = aiData.stats && aiData.stats.length > 0 ? aiData.stats.slice(0, 3) : [
    { value: '100%', label: 'ความสำเร็จในการดำเนินงาน', color: primaryCol },
    { value: '24 ชม.', label: 'ให้บริการประชาชนต่อเนื่อง', color: secondaryCol },
    { value: '0 วัน', label: 'ลดระยะเวลาคงค้าง', color: accentCol }
  ];

  const cardWidth = 360;
  statsList.forEach((st: any, i: number) => {
    const sx = 65 + (i * 395);
    const col = st.color || primaryCol;
    objects.push(new fabric.Rect({
      left: sx, top: 160, width: cardWidth, height: 130, rx: 16, ry: 16, fill: '#1e293b', stroke: col, strokeWidth: 2,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 15, offsetY: 4 })
    }));
    objects.push(new fabric.Textbox(st.value, {
      left: sx + cardWidth / 2, top: 175, width: cardWidth - 20, originX: 'center', textAlign: 'center', fontFamily: 'Prompt', fill: '#ffffff', fontSize: 38, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox(st.label, {
      left: sx + cardWidth / 2, top: 235, width: cardWidth - 30, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: col, fontSize: 14, fontWeight: 'bold'
    }));
  });

  // Content Sections (2 columns)
  const sections = aiData.textSections && aiData.textSections.length > 0 ? aiData.textSections.slice(0, 4) : [
    { heading: '1. ขอบเขตและเป้าหมายการดำเนินงาน', body: 'กำหนดแนวทางปฏิบัติที่ชัดเจนเพื่อยกระดับประสิทธิภาพและความถูกต้องของข้อมูล' },
    { heading: '2. ขั้นตอนและมาตรการสำคัญ', body: 'ดำเนินงานตามมาตรฐานสากล พร้อมการตรวจสอบและติดตามผลอย่างเป็นระบบ' }
  ];

  sections.forEach((sect: any, i: number) => {
    const colIdx = i % 2;
    const rowIdx = Math.floor(i / 2);
    const cx = 65 + (colIdx * 590);
    const cy = 320 + (rowIdx * 200);

    objects.push(new fabric.Rect({
      left: cx, top: cy, width: 560, height: 180, rx: 16, ry: 16, fill: '#1e293b', stroke: '#334155', strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 12, offsetY: 3 })
    }));
    objects.push(new fabric.Rect({
      left: cx, top: cy, width: 8, height: 180, rx: 4, ry: 4, fill: i % 2 === 0 ? primaryCol : secondaryCol
    }));
    objects.push(new fabric.Textbox(sect.heading, {
      left: cx + 28, top: cy + 20, width: 510, fontFamily: 'Prompt', fill: '#38bdf8', fontSize: 18, fontWeight: 'bold'
    }));
    objects.push(new fabric.Textbox(sect.body, {
      left: cx + 28, top: cy + 60, width: 510, fontFamily: 'Sarabun', fill: '#cbd5e1', fontSize: 14, lineHeight: 1.5
    }));
  });

  // Footer
  objects.push(new fabric.Rect({
    left: 65, top: 730, width: 1150, height: 50, rx: 12, ry: 12, fill: '#1e293b', stroke: '#334155', strokeWidth: 1
  }));
  objects.push(new fabric.Textbox(`💡 คำแนะนำการออกแบบ: ${aiData.designAdvice || 'ใช้การจัดวางสัดส่วนแบบ Visual Hierarchy เพื่อความอ่านง่ายและสวยงาม'}`, {
    left: width / 2, top: 745, width: 1100, originX: 'center', textAlign: 'center', fontFamily: 'Sarabun', fill: '#94a3b8', fontSize: 13
  }));

  objects.forEach(obj => canvas.add(obj));
  canvas.requestRenderAll();
  saveHistory();
};
