export interface EecSubdistrict {
  name: string;
  lat: number;
  lng: number;
}

export interface EecDistrict {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subdistricts: EecSubdistrict[];
}

export interface EecProvince {
  id: string;
  name: string;
  lat: number;
  lng: number;
  districts: EecDistrict[];
}

export const EEC_PROVINCES: EecProvince[] = [
  {
    id: 'rayong',
    name: 'จังหวัดระยอง (Rayong)',
    lat: 12.6814,
    lng: 101.2816,
    districts: [
      {
        id: 'mueang-rayong',
        name: 'อำเภอเมืองระยอง',
        lat: 12.6814,
        lng: 101.2816,
        subdistricts: [
          { name: 'ตำบลท่าประดู่ (ศูนย์ราชการ/ตัวเมือง)', lat: 12.6814, lng: 101.2816 },
          { name: 'ตำบลเชิงเนิน', lat: 12.6950, lng: 101.2980 },
          { name: 'ตำบลตะพง', lat: 12.6450, lng: 101.3550 },
          { name: 'ตำบลปากน้ำ (ชายฝั่งทะเล/ปากน้ำระยอง)', lat: 12.6620, lng: 101.2650 },
          { name: 'ตำบลเพ (ท่าเรือบ้านเพ/เกาะเสม็ด)', lat: 12.6180, lng: 101.4330 },
          { name: 'ตำบลกะเฉด', lat: 12.7120, lng: 101.4550 },
          { name: 'ตำบลแกลง (เมืองระยอง)', lat: 12.6520, lng: 101.4050 },
          { name: 'ตำบลบ้านแลง', lat: 12.7350, lng: 101.3120 },
          { name: 'ตำบลนาตาขวัญ', lat: 12.7280, lng: 101.3480 },
          { name: 'ตำบลเนินพระ (ศูนย์ราชการจังหวัดระยอง)', lat: 12.6850, lng: 101.2380 },
          { name: 'ตำบลมาบตาพุด (นิคมอุตสาหกรรมมาบตาพุด)', lat: 12.7080, lng: 101.1680 },
          { name: 'ตำบลห้วยโป่ง', lat: 12.7480, lng: 101.1450 },
          { name: 'ตำบลทับมา', lat: 12.7050, lng: 101.2480 },
          { name: 'ตำบลน้ำคอก', lat: 12.7190, lng: 101.2750 },
          { name: 'ตำบลหนองสนม', lat: 12.6920, lng: 101.2580 }
        ]
      },
      {
        id: 'ban-chang',
        name: 'อำเภอบ้านฉาง',
        lat: 12.7258,
        lng: 101.0592,
        subdistricts: [
          { name: 'ตำบลบ้านฉาง (ตัวอำเภอ)', lat: 12.7258, lng: 101.0592 },
          { name: 'ตำบลสำนักท้อน', lat: 12.7750, lng: 101.0420 },
          { name: 'ตำบลพลา (ชายหาดพลา/สนามบินอู่ตะเภา)', lat: 12.6780, lng: 101.0350 }
        ]
      },
      {
        id: 'klaeng',
        name: 'อำเภอแกลง',
        lat: 12.7786,
        lng: 101.6497,
        subdistricts: [
          { name: 'ตำบลทางเกวียน (ศูนย์ราชการแกลง)', lat: 12.7786, lng: 101.6497 },
          { name: 'ตำบลวังหว้า', lat: 12.7920, lng: 101.6050 },
          { name: 'ตำบลชากโดน', lat: 12.7420, lng: 101.6850 },
          { name: 'ตำบลเนินฆ้อ', lat: 12.7120, lng: 101.6720 },
          { name: 'ตำบลกร่ำ (อนุสาวรีย์สุนทรภู่/แหลมแม่พิมพ์)', lat: 12.6650, lng: 101.6420 },
          { name: 'ตำบลชากพง (หาดแหลมแม่พิมพ์)', lat: 12.6480, lng: 101.5850 },
          { name: 'ตำบลกระแสบน', lat: 12.8620, lng: 101.6150 },
          { name: 'ตำบลบ้านนา', lat: 12.8250, lng: 101.6620 },
          { name: 'ตำบลทุ่งควายกิน', lat: 12.8020, lng: 101.7350 },
          { name: 'ตำบลกองดิน', lat: 12.8250, lng: 101.7820 },
          { name: 'ตำบลคลองปูน', lat: 12.7480, lng: 101.7320 },
          { name: 'ตำบลพังราด', lat: 12.7150, lng: 101.7650 },
          { name: 'ตำบลปากน้ำประแส (ลุ่มน้ำประแส)', lat: 12.7050, lng: 101.7050 },
          { name: 'ตำบลห้วยยาง', lat: 12.8750, lng: 101.6750 },
          { name: 'ตำบลสองสลึง', lat: 12.7550, lng: 101.5950 }
        ]
      },
      {
        id: 'wang-chan',
        name: 'อำเภอวังจันทร์',
        lat: 13.0333,
        lng: 101.5167,
        subdistricts: [
          { name: 'ตำบลวังจันทร์', lat: 13.0333, lng: 101.5167 },
          { name: 'ตำบลชุมแสง', lat: 13.0720, lng: 101.4850 },
          { name: 'ตำบลป่ายุบใน (EECi / วังจันทร์วัลเลย์)', lat: 12.9850, lng: 101.4650 },
          { name: 'ตำบลพงตาเอี่ยม', lat: 13.0550, lng: 101.5850 }
        ]
      },
      {
        id: 'ban-khai',
        name: 'อำเภอบ้านค่าย',
        lat: 12.7833,
        lng: 101.3000,
        subdistricts: [
          { name: 'ตำบลบ้านค่าย', lat: 12.7833, lng: 101.3000 },
          { name: 'ตำบลหนองละลอก', lat: 12.8120, lng: 101.2450 },
          { name: 'ตำบลหนองตะพาน', lat: 12.7650, lng: 101.2720 },
          { name: 'ตำบลตาขัน', lat: 12.7450, lng: 101.3150 },
          { name: 'ตำบลบางบุตร', lat: 12.8250, lng: 101.3520 },
          { name: 'ตำบลหนองบัว', lat: 12.8650, lng: 101.3850 },
          { name: 'ตำบลชากบก', lat: 12.8450, lng: 101.3150 }
        ]
      },
      {
        id: 'pluak-daeng',
        name: 'อำเภอปลวกแดง',
        lat: 12.9750,
        lng: 101.2167,
        subdistricts: [
          { name: 'ตำบลปลวกแดง (อ่างเก็บน้ำหนองปลาไหล)', lat: 12.9750, lng: 101.2167 },
          { name: 'ตำบลตาสิทธิ์', lat: 13.0250, lng: 101.2350 },
          { name: 'ตำบลละหาร', lat: 12.9650, lng: 101.2850 },
          { name: 'ตำบลแม่น้ำคู้', lat: 12.8950, lng: 101.2350 },
          { name: 'ตำบลมาบยางพร (นิคมอุตสาหกรรมอีสเทิร์นซีบอร์ด)', lat: 12.9350, lng: 101.1650 },
          { name: 'ตำบลหนองไร่', lat: 13.0150, lng: 101.3150 }
        ]
      },
      {
        id: 'khao-chamao',
        name: 'อำเภอเขาชะเมา',
        lat: 12.9467,
        lng: 101.6700,
        subdistricts: [
          { name: 'ตำบลน้ำเป็น (อุทยานแห่งชาติเขาชะเมา-เขาวง)', lat: 12.9467, lng: 101.6700 },
          { name: 'ตำบลห้วยทับมอญ', lat: 12.9850, lng: 101.6250 },
          { name: 'ตำบลชำฆ้อ', lat: 12.9250, lng: 101.7150 },
          { name: 'ตำบลเขาน้อย', lat: 12.8850, lng: 101.6550 }
        ]
      },
      {
        id: 'nikhom-phatthana',
        name: 'อำเภอนิคมพัฒนา',
        lat: 12.8333,
        lng: 101.1500,
        subdistricts: [
          { name: 'ตำบลนิคมพัฒนา', lat: 12.8333, lng: 101.1500 },
          { name: 'ตำบลพนานิคม', lat: 12.8550, lng: 101.1250 },
          { name: 'ตำบลมะขามคู่', lat: 12.8750, lng: 101.0750 },
          { name: 'ตำบลซอยสิบสาม', lat: 12.8120, lng: 101.1850 }
        ]
      }
    ]
  }
];

export interface LiveWeatherData {
  locationName: string;
  province: string;
  district: string;
  subdistrict: string;
  lat: number;
  lng: number;
  updatedAt: string;
  
  // Real-time Measurements
  temperature: number;
  apparentTemperature: number;
  tempMin: number;
  tempMax: number;
  
  relativeHumidity: number;
  dewPoint: number;
  
  rainRate: number; // mm/h
  precipitationSum: number; // mm in 24h
  precipitationProbability: number; // %
  rainCategory: 'none' | 'light' | 'moderate' | 'heavy' | 'very_heavy';
  rainCategoryLabel: string;
  rainWarningColor: string;
  
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windDirectionText: string;
  windGusts: number;
  
  surfacePressure: number; // hPa
  uvIndex: number;
  cloudCover: number; // %
  
  weatherCode: number;
  weatherDescription: string;
  weatherIconType: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-lightning' | 'cloud-drizzle' | 'wind';
  
  // Forecast
  hourly: {
    time: string[];
    temperature: number[];
    precipitation: number[];
    precipitationProbability: number[];
    relativeHumidity: number[];
  };
  
  daily: {
    time: string[];
    tempMax: number[];
    tempMin: number[];
    precipitationSum: number[];
    precipitationProbabilityMax: number[];
    weatherCode: number[];
  };
  
  stationSource: string;
}

export function getWindDirectionText(degrees: number): string {
  const directions = [
    'เหนือ (N)', 'ตะวันออกเฉียงเหนือ (NE)', 'ตะวันออก (E)', 
    'ตะวันออกเฉียงใต้ (SE)', 'ใต้ (S)', 'ตะวันตกเฉียงใต้ (SW)', 
    'ตะวันตก (W)', 'ตะวันตกเฉียงเหนือ (NW)'
  ];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index];
}

export function getWmoWeatherInfo(code: number): { description: string; iconType: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-lightning' | 'cloud-drizzle' | 'wind' } {
  switch (code) {
    case 0:
      return { description: 'ท้องฟ้าแจ่มใส (Clear sky)', iconType: 'sun' };
    case 1:
      return { description: 'ท้องฟ้าโปร่งเกือบทั้งหมด (Mainly clear)', iconType: 'sun' };
    case 2:
      return { description: 'มีเมฆบางส่วน (Partly cloudy)', iconType: 'cloud' };
    case 3:
      return { description: 'มีเมฆเป็นส่วนมากถึงมีเมฆเต็มท้องฟ้า (Overcast)', iconType: 'cloud' };
    case 45:
    case 48:
      return { description: 'มีหมอกหรือหมอกน้ำค้าง (Fog)', iconType: 'cloud' };
    case 51:
    case 53:
    case 55:
      return { description: 'ฝนละออง / ฝนปรอยๆ (Drizzle)', iconType: 'cloud-drizzle' };
    case 61:
      return { description: 'ฝนตกเล็กน้อย (Slight rain)', iconType: 'cloud-rain' };
    case 63:
      return { description: 'ฝนตกปานกลาง (Moderate rain)', iconType: 'cloud-rain' };
    case 65:
      return { description: 'ฝนตกหนัก (Heavy rain)', iconType: 'cloud-rain' };
    case 80:
      return { description: 'ฝนซู่กระจายเล็กน้อย (Slight rain showers)', iconType: 'cloud-rain' };
    case 81:
      return { description: 'ฝนซู่กระจายปานกลาง (Moderate rain showers)', iconType: 'cloud-rain' };
    case 82:
      return { description: 'ฝนซู่ตกหนักรุนแรง (Violent rain showers)', iconType: 'cloud-rain' };
    case 95:
      return { description: 'พายุฝนฟ้าคะนอง (Thunderstorm)', iconType: 'cloud-lightning' };
    case 96:
    case 99:
      return { description: 'พายุฝนฟ้าคะนองและอาจมีลูกเห็บตก (Thunderstorm with hail)', iconType: 'cloud-lightning' };
    default:
      return { description: 'มีฝนฟ้าคะนองประปราย', iconType: 'cloud-rain' };
  }
}

export function classifyRainfallTmd(rain24hOrRate: number): {
  category: 'none' | 'light' | 'moderate' | 'heavy' | 'very_heavy';
  label: string;
  color: string;
  alertLevel: string;
} {
  if (rain24hOrRate <= 0.05) {
    return {
      category: 'none',
      label: 'ไม่มีฝน / ท้องฟ้าปกติ',
      color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
      alertLevel: 'ปกติ'
    };
  }
  if (rain24hOrRate <= 10.0) {
    return {
      category: 'light',
      label: 'ฝนเล็กน้อย (0.1 - 10.0 มม.)',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      alertLevel: 'เฝ้าระวังเบื้องต้น'
    };
  }
  if (rain24hOrRate <= 35.0) {
    return {
      category: 'moderate',
      label: 'ฝนปานกลาง (10.1 - 35.0 มม.)',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      alertLevel: 'เฝ้าระวังระดับ 1'
    };
  }
  if (rain24hOrRate <= 90.0) {
    return {
      category: 'heavy',
      label: 'ฝนตกหนัก (35.1 - 90.0 มม.) - เสี่ยงน้ำท่วมขัง',
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      alertLevel: 'เตือนภัยฝนตกหนัก'
    };
  }
  return {
    category: 'very_heavy',
    label: 'ฝนตกหนักมาก (> 90.0 มม.) - วิกฤตน้ำท่วมฉับพลัน/น้ำป่า',
    color: 'text-rose-600 bg-rose-600/15 border-rose-600/30 animate-pulse',
    alertLevel: 'เตือนภัยวิกฤตระดับสูงสุด'
  };
}
