export interface DDPMVehicleTypeGroup {
  category: string;
  badgeColor: string;
  isMachinery?: boolean;
  types: {
    name: string;
    description: string;
    standardModel?: string;
  }[];
}

export const DDPM_VEHICLE_CATEGORIES: DDPMVehicleTypeGroup[] = [
  {
    category: 'รถยนต์ราชการ / ตรวจการณ์และบัญชาการ',
    badgeColor: 'blue',
    types: [
      {
        name: 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)',
        description: 'รถตรวจการณ์ขับเคลื่อน 4 ล้อ ติดตั้งระบบสื่อสารสั่งการและไซเรน สำหรับผู้บังคับบัญชาบัญชาการเหตุการณ์',
        standardModel: 'THAI RUNG TR TRANSFORMER II / TOYOTA FORTUNER 4x4'
      },
      {
        name: 'รถยนต์บรรทุก (กระบะ) ตรวจการณ์ 4x4',
        description: 'รถกระบะตรวจการณ์ 4 ประตู ยกสูง ขับเคลื่อน 4 ล้อ สำหรับลงพื้นที่ประสบภัยและเข้าถึงจุดเกิดเหตุฉุกเฉิน',
        standardModel: 'TOYOTA HILUX REVO 4x4 / ISUZU D-MAX V-CROSS 4x4'
      },
      {
        name: 'รถยนต์ตรวจการณ์ขับเคลื่อน 4 ล้อ',
        description: 'รถตรวจการณ์อเนกประสงค์ สำหรับภารกิจลาดตระเวนและตรวจพื้นที่เสี่ยงภัย',
        standardModel: 'ISUZU MU-X / TOYOTA FORTUNER'
      },
      {
        name: 'รถยนต์ส่วนกลาง / รถตู้โดยสาร',
        description: 'รถตู้ส่วนกลางสำหรับเดินทางตรวจราชการ ประสานงานหน่วยงาน และรับส่งเจ้าหน้าที่ปฏิบัติงาน',
        standardModel: 'TOYOTA COMMUTER 2.8 D4D'
      },
      {
        name: 'รถยนต์นั่งส่วนกลาง',
        description: 'รถยนต์นั่งส่วนกลางสำหรับปฏิบัติราชการทั่วไป',
        standardModel: 'TOYOTA COROLLA ALTIS / HONDA CIVIC'
      },
      {
        name: 'รถประจำตำแหน่ง / รถรับรองผู้บริหาร',
        description: 'รถยนต์ประจำตำแหน่งหัวหน้าสำนักงานหรือผู้บริหารระดับสูง',
        standardModel: 'TOYOTA CAMRY HEV / HONDA ACCORD'
      }
    ]
  },
  {
    category: 'รถกู้ชีพ กู้ภัย และช่วยเหลือผู้ประสบภัย',
    badgeColor: 'amber',
    types: [
      {
        name: 'รถกู้ภัยเคลื่อนที่เร็ว (Fast Rescue Vehicle - FRV)',
        description: 'รถกู้ภัยเคลื่อนที่เร็วพร้อมอุปกรณ์ตัดถ่าง เครื่องส่องสว่าง อุปกรณ์กู้ชีพ และระบบปฐมพยาบาลฉุกเฉิน',
        standardModel: 'TOYOTA HILUX REVO 4x4 WITH RESCUE BOX'
      },
      {
        name: 'รถปฏิบัติการค้นหาและกู้ภัย (USAR)',
        description: 'รถปฏิบัติการค้นหาและกู้ภัยในเขตเมือง พร้อมชุดเซ็นเซอร์ค้นหาผู้รอดชีวิตใต้ซากปรักหักพัง',
        standardModel: 'ISUZU FTR / HINO 500 USAR HEAVY RESCUE'
      },
      {
        name: 'รถบรรทุกพร้อมเครื่องกำเนิดไฟฟ้าและส่องสว่าง',
        description: 'รถบรรทุกติดตั้งเครื่องกำเนิดไฟฟ้าขนาดใหญ่ (Generator) และเสาไฟส่องสว่างสูง (Light Mast) สำหรับพื้นที่ประสบภัยไร้กระแสไฟฟ้า',
        standardModel: 'ISUZU FORWARD / HINO 500 MOBILE LIGHT & POWER'
      },
      {
        name: 'รถประกอบอาหารเคลื่อนที่ (Mobile Kitchen)',
        description: 'รถครัวสนามพระราชทาน/ครัวเคลื่อนที่ ปภ. ประกอบอาหารแจกจ่ายผู้ประสบภัยในพื้นที่ได้อย่างรวดเร็ว',
        standardModel: 'HINO / ISUZU MOBILE KITCHEN TRUCK'
      },
      {
        name: 'รถผลิตน้ำดื่มเคลื่อนที่ (Mobile Water Treatment)',
        description: 'รถติดตั้งระบบกรองน้ำ RO และฆ่าเชื้อ UV สำหรับผลิตน้ำดื่มสะอาดช่วยเหลือราษฎรในพื้นที่ประสบภัย',
        standardModel: 'ISUZU FTR MOBILE WATER PURIFICATION'
      },
      {
        name: 'รถสุขาเคลื่อนที่ (Mobile Restroom Truck)',
        description: 'รถสุขาเคลื่อนที่ปรับอากาศ สำหรับบริการผู้ประสบภัยและเจ้าหน้าที่ในศูนย์พักพิงชั่วคราว',
        standardModel: 'HINO 500 MOBILE RESTROOM'
      },
      {
        name: 'รถพยาบาลกู้ชีพฉุกเฉิน (Ambulance / EMS)',
        description: 'รถพยาบาลฉุกเฉินระดับสูง (ALS) พร้อมเครื่องกระตุกหัวใจและอุปกรณ์กู้ชีพมาตรฐานการแพทย์ฉุกเฉิน',
        standardModel: 'TOYOTA COMMUTER HIGH-ROOF AMBULANCE'
      },
      {
        name: 'ยานยนต์สะเทินน้ำสะเทินบก (Amphibious Vehicle)',
        description: 'ยานยนต์ลุยน้ำลึกและขับเคลื่อนบนบก สำหรับอพยพผู้ประสบภัยน้ำท่วมสูงและพื้นที่ตัดขาด',
        standardModel: 'AMPHIBIOUS 8x8 / ARGO / DUKW'
      },
      {
        name: 'รถบรรทุกชานต่ำบรรทุกเรือกู้ภัย / ลากจูงเรือ',
        description: 'รถบรรทุกหรือลากจูงเรือท้องแบนพร้อมเครื่องยนต์ เรือยางกู้ภัย และอุปกรณ์ช่วยเหลือทางน้ำ',
        standardModel: 'ISUZU D-MAX 4x4 / FTR BOAT TRANSPORTER'
      }
    ]
  },
  {
    category: 'รถดับเพลิงและกู้ภัยสารเคมี',
    badgeColor: 'rose',
    types: [
      {
        name: 'รถยนต์ดับเพลิงอาคาร / ชุมชน',
        description: 'รถดับเพลิงติดตั้งแท่นปืนฉีดน้ำและสายส่งน้ำแรงดันสูง สำหรับระงับอัคคีภัยในเขตชุมชนและอาคาร',
        standardModel: 'ISUZU / HINO PUMPER TRUCK'
      },
      {
        name: 'รถยนต์ดับเพลิงหอน้ำ / บันไดเลื่อนสูง',
        description: 'รถดับเพลิงพร้อมบันไดกู้ภัยหรือหอน้ำฉีดดับเพลิงอาคารสูง (ความสูง 32 - 53 เมตร)',
        standardModel: 'SCANIA / VOLVO AERIAL LADDER & WATER TOWER'
      },
      {
        name: 'รถยนต์ดับเพลิงเคมีและโฟม (CBRN / HazMat)',
        description: 'รถดับเพลิงสารเคมีอันตรายและโฟมดับเพลิง สำหรับโรงงานอุตสาหกรรม วัตถุอันตราย และนิคมอุตสาหกรรมในพื้นที่มาบตาพุด/ระยอง',
        standardModel: 'MAN / MERCEDES-BENZ ACTROS CHEMICAL & FOAM'
      },
      {
        name: 'รถบรรทุกน้ำช่วยดับเพลิง (10,000 ลิตร)',
        description: 'รถบรรทุกน้ำขนาดใหญ่ความจุ 10,000 - 12,000 ลิตร พร้อมปั๊มสูบจ่ายน้ำสนับสนุนรถดับเพลิงและแจกจ่ายน้ำช่วยเหลือภัยแล้ง',
        standardModel: 'ISUZU FVR 240 / HINO 500 (10,000L)'
      },
      {
        name: 'รถบรรทุกน้ำช่วยดับเพลิง (6,000 ลิตร)',
        description: 'รถบรรทุกน้ำขนาดกลางความจุ 6,000 ลิตร สำหรับพื้นที่แคบและสนับสนุนภารกิจดับเพลิง',
        standardModel: 'ISUZU FRR / HINO FC (6,000L)'
      },
      {
        name: 'รถยนต์ดับเพลิงป่า',
        description: 'รถขับเคลื่อน 4 ล้อ สำหรับเข้าดับไฟป่า ลุยพื้นที่ลาดชันและทุรกันดาร',
        standardModel: 'MERCEDES-BENZ UNIMOG 4x4 / ISUZU 4x4'
      },
      {
        name: 'หุ่นยนต์และยานไร้คนขับดับเพลิงควบคุมระยะไกล',
        description: 'หุ่นยนต์ฉีดน้ำแรงดันสูงควบคุมระยะไกล ป้องกันอันตรายของเจ้าหน้าที่ในพื้นที่เสี่ยงระเบิดหรือสารเคมี',
        standardModel: 'LUF 60 / COLOSSUS FIREFIGHTING ROBOT'
      }
    ]
  },
  {
    category: 'เครื่องจักรกลสาธารณภัยและสูบระบายน้ำ',
    badgeColor: 'emerald',
    isMachinery: true,
    types: [
      {
        name: 'รถสูบส่งน้ำระยะไกล (High-Pressure Long Distance)',
        description: 'รถสูบน้ำสมรรถนะสูงพร้อมสายส่งน้ำระยะทาง 3-5 กิโลเมตร สูบน้ำท่วมขังและสนับสนุนน้ำดับเพลิงระยะไกล',
        standardModel: 'HINO / VOLVO LONG-DISTANCE WATER SUPPLY SYSTEM'
      },
      {
        name: 'รถสูบน้ำท่วมขัง (Submersible Pump Truck)',
        description: 'รถปฏิบัติการสูบน้ำท่วมขัง อัตราการสูบไม่น้อยกว่า 50,000 ลิตร/นาที ช่วยแก้ปัญหาน้ำท่วมรอการระบาย',
        standardModel: 'HINO 500 SUBMERSIBLE PUMP TRUCK'
      },
      {
        name: 'รถขุดไฮดรอลิกตีนตะขาบ (Excavator / แบคโฮ)',
        description: 'เครื่องจักรกลขุดตักดิน เปิดทางน้ำ ขุดลอกคูคลอง และเปิดเส้นทางดินโคลนถล่ม',
        standardModel: 'KOMATSU PC200 / CATERPILLAR 320'
      },
      {
        name: 'รถขุดตักหน้าขุดหลัง (Backhoe Loader)',
        description: 'รถตักอเนกประสงค์ มีบุ้งกี๋ตักด้านหน้าและแขนขุดด้านหลัง คล่องตัวสูงในงานบรรเทาสาธารณภัย',
        standardModel: 'JCB 3CX / CASE 580'
      },
      {
        name: 'รถตักล้อยาง (Wheel Loader)',
        description: 'เครื่องจักรกลสำหรับตักเศษซากปรักหักพัง ดินโคลน ทราย และปรับพื้นที่ประสบภัย',
        standardModel: 'KOMATSU WA200 / CAT 938'
      },
      {
        name: 'รถเกลี่ยดิน (Motor Grader)',
        description: 'เครื่องจักรกลปรับเกลี่ยผิวทาง เปิดเส้นทางสัญจรหลังน้ำลดหรือดินสไลด์',
        standardModel: 'KOMATSU GD511 / MITSUBISHI MG330'
      },
      {
        name: 'รถบรรทุกเทท้าย 6 ล้อ / 10 ล้อ (Dump Truck)',
        description: 'รถบรรทุกเทท้ายขนย้ายดิน หิน ทราย และเศษซากสิ่งปรักหักพังออกจากพื้นที่เกิดภัย',
        standardModel: 'ISUZU DECA 360 / HINO 500 DUMP TRUCK'
      },
      {
        name: 'รถชานต่ำกึ่งพ่วงบรรทุกเครื่องจักรกลหนัก (Low-bed Trailer)',
        description: 'รถหัวลากพร้อมหางชานต่ำ สำหรับขนย้ายรถขุด รถตัก และเครื่องจักรกลสาธารณภัยเข้าพื้นที่ภัยพิบัติ',
        standardModel: 'ISUZU GIGA / HINO 700 PRIME MOVER + LOW-BED'
      },
      {
        name: 'รถขุดเจาะและเป่าล้างบ่อน้ำบาดาล',
        description: 'รถติดตั้งเครื่องเจาะบาดาลเพื่อแก้ไขปัญหาภัยแล้งขาดแคลนน้ำอุปโภคบริโภค',
        standardModel: 'DRILLING RIG & AIR COMPRESSOR TRUCK'
      }
    ]
  },
  {
    category: 'ยานพาหนะและเครื่องจักรกลอื่นๆ',
    badgeColor: 'purple',
    types: [
      {
        name: 'รถจักรยานยนต์ตรวจการณ์',
        description: 'รถจักรยานยนต์สายตรวจ ปภ. สำหรับเข้าถึงพื้นที่แคบ ตรวจระดับน้ำ และนำขบวนยานพาหนะฉุกเฉิน',
        standardModel: 'HONDA CB500X / YAMAHA MT-07 PATROL'
      },
      {
        name: 'เครื่องจักรกลสาธารณภัยเฉพาะกิจ',
        description: 'เครื่องจักรกลและยานพาหนะสำหรับภารกิจบรรเทาสาธารณภัยเฉพาะทาง',
        standardModel: 'DISASTER SPECIAL PURPOSE UNIT'
      }
    ]
  }
];

export const DDPM_DEPARTMENTS = [
  'ฝ่ายบริหารงานทั่วไป',
  'กลุ่มงานยุทธศาสตร์และการจัดการ',
  'กลุ่มงานป้องกันและปฏิบัติการ',
  'กลุ่มงานฟื้นฟูและพัฒนา',
  'ศูนย์ป้องกันและบรรเทาสาธารณภัย เขต'
];

// Flat list of all types for simple searches or dropdowns
export const ALL_DDPM_VEHICLE_TYPES = DDPM_VEHICLE_CATEGORIES.flatMap(g => g.types.map(t => t.name));

// Helper: find group and badge info for a given vehicle type
export function getDDPMVehicleCategory(typeName: string): DDPMVehicleTypeGroup {
  if (!typeName) return DDPM_VEHICLE_CATEGORIES[0];
  const found = DDPM_VEHICLE_CATEGORIES.find(group => 
    group.types.some(t => t.name === typeName || typeName.includes(t.name) || t.name.includes(typeName))
  );
  return found || DDPM_VEHICLE_CATEGORIES[DDPM_VEHICLE_CATEGORIES.length - 1];
}

// Helper: check if type is heavy machinery
export function isDDPMHeavyMachinery(typeName: string): boolean {
  if (!typeName) return false;
  const machineryKeywords = ['เครื่องจักรกล', 'รถขุด', 'รถตัก', 'รถเกลี่ย', 'รถสูบ', 'ไฮดรอลิก', 'เทท้าย', 'ชานต่ำ', 'เจาะ'];
  return machineryKeywords.some(kw => typeName.includes(kw));
}
