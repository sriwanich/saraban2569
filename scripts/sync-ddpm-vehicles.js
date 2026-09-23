import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function run() {
  const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
  const dbName = process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || '';
  const dbUser = process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || '';
  const dbPass = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS || process.env.MYSQL_PASSWORD || '');

  console.log(`Connecting to MySQL database ${dbName} at ${dbHost}...`);
  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: dbName
  });

  const now = new Date().toISOString();

  const ddpmVehicles = [
    {
      id: 'v_01',
      license_plate: '7 กบ 5108',
      vehicle_number: 'รย 01-01',
      province: 'กรุงเทพมหานคร',
      brand: 'THAI RUNG',
      model: 'TR TRANSFORMER II (4x4)',
      vehicle_type: 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)',
      department: 'กลุ่มงานยุทธศาสตร์และการจัดการ',
      current_mileage: 18500,
      status: 'active'
    },
    {
      id: 'v_02',
      license_plate: '40-0258',
      vehicle_number: 'รย 02-01',
      province: 'ระยอง',
      brand: 'ISUZU',
      model: 'FVR 240 (10,000 ลิตร)',
      vehicle_type: 'รถบรรทุกน้ำช่วยดับเพลิง (10,000 ลิตร)',
      department: 'กลุ่มงานป้องกันและปฏิบัติการ',
      current_mileage: 12400,
      status: 'active'
    },
    {
      id: 'v_03',
      license_plate: '1 นง 9999',
      vehicle_number: 'รย 00-01',
      province: 'ระยอง',
      brand: 'TOYOTA',
      model: 'Camry 2.5 HEV',
      vehicle_type: 'รถประจำตำแหน่ง / รถรับรองผู้บริหาร',
      department: 'ฝ่ายบริหารงานทั่วไป',
      current_mileage: 45200,
      status: 'active'
    },
    {
      id: 'v_04',
      license_plate: '1 ขผ 4280',
      vehicle_number: 'รย 02-02',
      province: 'ระยอง',
      brand: 'TOYOTA',
      model: 'Hilux Revo 4x4 (FRV)',
      vehicle_type: 'รถกู้ภัยเคลื่อนที่เร็ว (Fast Rescue Vehicle - FRV)',
      department: 'กลุ่มงานป้องกันและปฏิบัติการ',
      current_mileage: 21300,
      status: 'active'
    },
    {
      id: 'v_05',
      license_plate: '40-0312',
      vehicle_number: 'รย 02-03',
      province: 'ระยอง',
      brand: 'ISUZU',
      model: 'FTR 240 Mobile Light & Power',
      vehicle_type: 'รถบรรทุกพร้อมเครื่องกำเนิดไฟฟ้าและส่องสว่าง',
      department: 'กลุ่มงานป้องกันและปฏิบัติการ',
      current_mileage: 9500,
      status: 'active'
    },
    {
      id: 'v_06',
      license_plate: '40-0488',
      vehicle_number: 'รย 03-01',
      province: 'ระยอง',
      brand: 'HINO',
      model: '500 Series (50,000 ลิตร/นาที)',
      vehicle_type: 'รถสูบส่งน้ำระยะไกล (High-Pressure Long Distance)',
      department: 'กลุ่มงานป้องกันและปฏิบัติการ',
      current_mileage: 6300,
      status: 'active'
    },
    {
      id: 'v_07',
      license_plate: 'นข 8831',
      vehicle_number: 'รย 00-02',
      province: 'ระยอง',
      brand: 'TOYOTA',
      model: 'Commuter 2.8 D4D',
      vehicle_type: 'รถยนต์ส่วนกลาง / รถตู้โดยสาร',
      department: 'ฝ่ายบริหารงานทั่วไป',
      current_mileage: 54200,
      status: 'active'
    },
    {
      id: 'v_08',
      license_plate: 'ปภ. รย-04',
      vehicle_number: 'มค 01-01',
      province: 'ระยอง',
      brand: 'KOMATSU',
      model: 'PC200-10M0 (Hydraulic Excavator)',
      vehicle_type: 'รถขุดไฮดรอลิกตีนตะขาบ (Excavator / แบคโฮ)',
      department: 'กลุ่มงานป้องกันและปฏิบัติการ',
      current_mileage: 1280,
      status: 'active'
    }
  ];

  for (const v of ddpmVehicles) {
    await conn.query(
      `INSERT INTO vehicles (id, license_plate, vehicle_number, province, brand, model, vehicle_type, department, current_mileage, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         license_plate = VALUES(license_plate),
         vehicle_number = VALUES(vehicle_number),
         province = VALUES(province),
         brand = VALUES(brand),
         model = VALUES(model),
         vehicle_type = VALUES(vehicle_type),
         department = VALUES(department),
         current_mileage = VALUES(current_mileage),
         status = VALUES(status),
         updated_at = VALUES(updated_at)`,
      [v.id, v.license_plate, v.vehicle_number, v.province, v.brand, v.model, v.vehicle_type, v.department, v.current_mileage, v.status, now, now]
    );
  }

  console.log('✅ Successfully updated and inserted DDPM vehicles and disaster machinery!');
  const [rows] = await conn.query('SELECT id, license_plate, vehicle_number, brand, model, vehicle_type, department FROM vehicles');
  console.log('Current vehicles in DB:', rows);
  await conn.end();
}

run().catch(console.error);
