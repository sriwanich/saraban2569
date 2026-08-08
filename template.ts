export const createDisasterTemplate = (canvas: any, setCanvasSize: any, setBackgroundColor: any) => {
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
