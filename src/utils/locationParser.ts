export function parseLocationString(loc: string): { amphoe: string; tambon: string; muban: string } {
  const result = { amphoe: '', tambon: '', muban: '' };
  if (!loc) return result;

  // 1. Detect District (อำเภอ)
  if (loc.includes('เมืองระยอง') || loc.includes('อ.เมือง')) {
    result.amphoe = 'อำเภอเมืองระยอง';
  } else if (loc.includes('บ้านฉาง') || loc.includes('อ.บ้านฉาง')) {
    result.amphoe = 'อำเภอบ้านฉาง';
  } else if (loc.includes('แกลง') || loc.includes('อ.แกลง')) {
    result.amphoe = 'อำเภอแกลง';
  } else if (loc.includes('วังจันทร์') || loc.includes('อ.วังจันทร์')) {
    result.amphoe = 'อำเภอวังจันทร์';
  } else if (loc.includes('บ้านค่าย') || loc.includes('อ.บ้านค่าย')) {
    result.amphoe = 'อำเภอบ้านค่าย';
  } else if (loc.includes('ปลวกแดง') || loc.includes('อ.ปลวกแดง')) {
    result.amphoe = 'อำเภอปลวกแดง';
  } else if (loc.includes('เขาชะเมา') || loc.includes('อ.เขาชะเมา')) {
    result.amphoe = 'อำเภอเขาชะเมา';
  } else if (loc.includes('นิคมพัฒนา') || loc.includes('อ.นิคมพัฒนา')) {
    result.amphoe = 'อำเภอนิคมพัฒนา';
  }

  // 2. Detect Subdistrict (ตำบล)
  const subdistrictsList = [
    // เมืองระยอง
    'ท่าประดู่', 'เชิงเนิน', 'ตะพง', 'ปากน้ำ', 'เพ', 'กะเฉด', 'แกลง', 'บ้านแลง', 'นาตาขวัญ', 'เนินพระ', 'มาบตาพุด', 'ห้วยโป่ง', 'ทับมา', 'น้ำคอก', 'หนองสนม',
    // บ้านฉาง
    'บ้านฉาง', 'สำนักท้อน', 'พลา',
    // แกลง
    'ทางเกวียน', 'วังหว้า', 'ชากโดน', 'เนินฆ้อ', 'กร่ำ', 'ชากพง', 'กระแสบน', 'บ้านนา', 'ทุ่งควายกิน', 'กองดิน', 'คลองปูน', 'พังราด', 'ปากน้ำประแส', 'ห้วยยาง', 'สองสลึง',
    // วังจันทร์
    'วังจันทร์', 'ชุมแสง', 'ป่ายุบใน', 'พงตาเอี่ยม',
    // บ้านค่าย
    'บ้านค่าย', 'หนองละลอก', 'หนองตะพาน', 'ตาขัน', 'บางบุตร', 'หนองบัว', 'ชากบก',
    // ปลวกแดง
    'ปลวกแดง', 'ตาสิทธิ์', 'ละหาร', 'แม่น้ำคู้', 'มาบยางพร', 'หนองไร่',
    // เขาชะเมา
    'น้ำเป็น', 'ห้วยทับมอญ', 'ชำฆ้อ', 'เขาน้อย',
    // นิคมพัฒนา
    'นิคมพัฒนา', 'พนานิคม', 'มะขามคู่', 'ซอยสิบสาม'
  ];

  for (const sub of subdistrictsList) {
    if (loc.includes(sub)) {
      result.tambon = `ตำบล${sub}`;
      break;
    }
  }

  // 3. Detect Village (หมู่บ้าน)
  const mubanRegex = /หมู่ที่\s*([0-9๑-๙]+)|หมู่\s*([0-9๑-๙]+)/;
  const match = loc.match(mubanRegex);
  if (match) {
    const num = match[1] || match[2];
    result.muban = `หมู่ที่ ${num}`;
  }

  return result;
}
