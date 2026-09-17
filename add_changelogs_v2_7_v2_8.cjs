const mysql = require('mysql2/promise');
require('dotenv').config();

async function addChangelogs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    console.log("Connected to database successfully.");

    // Define v2.7.0 Changelog
    const v270 = {
      id: 'cl_v2_7_0',
      version: 'v2.7.0',
      title: 'ระบบลายมือชื่ออิเล็กทรอนิกส์ข้ามหน่วยงานและการยืนยันสิทธิ์ขั้นสูง (Cross-Agency Digital Signature & Federated Authentication)',
      releaseDate: '2026-09-13',
      type: 'major',
      summary: 'ยกระดับการทำงานข้ามองค์กรด้วยระบบลายมือชื่อดิจิทัลที่ผ่านการเข้ารหัสและตรวจสอบความน่าเชื่อถือสากล พร้อมระบบคำร้องขอลงนามเอกสารส่งนอกหน่วยงานและการตรวจสอบกุญแจความปลอดภัย',
      changes: JSON.stringify([
        {
          category: 'feature',
          categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
          items: [
            'ระบบลายมือชื่อดิจิทัลราชการข้ามหน่วยงาน (Cross-Agency Cryptographic Digital Signatures): รองรับการเข้ารหัสกุญแจส่วนตัว (Private Key) ของผู้ใช้งานและประทับลายมือชื่อที่เชื่อมโยงกับเลขพาสเวิร์ด เพื่อความปลอดภัยในการสื่อสารหนังสือสั่งการภายนอก',
            'ระบบคำร้องลงนามเอกสารภายนอกองค์กร (External Digital Signature Requests Flow): สร้างลิงก์และระบบส่งคำร้องเชิญลงนามเอกสารไปยังผู้บริหารหรือตัวแทนหน่วยงานภายนอกทาง SMS และ Email พร้อมกำหนดระยะเวลาอายุการใช้งานลิงก์ (Expiration TTL)',
            'ตัวพิสูจน์ความถูกต้องของเอกสาร (Signature Validation Engine): ปุ่มสำหรับบุคคลภายนอกใช้คลิกตรวจสอบเอกสารเพื่อเปรียบเทียบกุญแจสาธารณะ (Public Key Validity) ป้องกันการสวมรอยหรือแก้ไขเนื้อหาหนังสือราชการหลังส่งออก'
          ]
        },
        {
          category: 'improvement',
          categoryLabel: '⚡ การปรับปรุง (Improvements)',
          items: [
            'เร่งประสิทธิภาพการเรนเดอร์เอกสารและไฟล์ PDF ขนาดใหญ่บนแท็บเล็ตของผู้บริหารให้มีความเสถียรและเร็วขึ้นกว่าเดิม 50% ด้วยระบบ Cached Hybrid Rendering',
            'ปรับปรุงระบบการแสตมป์ตราสัญลักษณ์ (Digital Stamp Layout Indicator) และข้อความบันทึกการลงนามลงในเอกสาร PDF โดยตรงผ่านการคำนวณสัดส่วนหน้ากระดาษพิกเซลอย่างแม่นยำ'
          ]
        },
        {
          category: 'security',
          categoryLabel: '🔒 ความปลอดภัย (Security)',
          items: [
            'ระบบยืนยันตนสำหรับการลงนามขั้นสูง (Multi-Factor Signature OTP): บังคับยืนยันตัวตนด้วยรหัส OTP 6 หลักผ่านช่องทางที่กำหนดก่อนสั่งลงนามเอกสารสำคัญประเภทลับที่สุดเพื่อป้องกันความเสียหาย'
          ]
        }
      ]),
      images: JSON.stringify([])
    };

    // Define v2.8.0 Changelog (The absolute latest)
    const v280 = {
      id: 'cl_v2_8_0',
      version: 'v2.8.0',
      title: 'ระบบ AI วิเคราะห์ความเสี่ยงภัยพิบัติและจัดระดับความเร่งด่วนเอกสารอัตโนมัติ (AI Disaster Analytics & Urgent Document Dispatcher)',
      releaseDate: '2026-09-15',
      type: 'major',
      summary: 'ยกระดับระบบสารบรรณ ปภ.ระยอง สู่ยุคปัญญาประดิษฐ์เชิงรุก ด้วยการเชื่อมต่อโมเดลทำนายสาธารณภัยเพื่อประเมินความฉุกเฉินของหนังสือราชการ คัดแยกกลุ่มคำสำคัญระดับวิกฤต และสตรีมป้ายเตือนภัยระดับผู้บริหารทันทีแบบเรียลไทม์',
      changes: JSON.stringify([
        {
          category: 'feature',
          categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
          items: [
            'ระบบ AI ประเมินสาธารณภัยเชิงรุก (DDPM AI Risk Predictor): เชื่อมต่อ API ข้อมูลพยากรณ์อากาศและปริมาณน้ำฝนเพื่อวิเคราะห์เนื้อหาเอกสารรับเข้า หากมีความเกี่ยวข้องกับพื้นที่เสี่ยงภัยจะแนะนำระดับความเร่งด่วนสูงขึ้นให้เจ้าหน้าที่ทันที',
            'ระบบตรวจจับคำสำคัญระดับวิกฤตและสตรีมเตือนภัยทันที (Urgent Smart Broadcast Engine): ตรวจสอบคำสำคัญ เช่น "สารเคมีรั่วไหล", "น้ำป่าไหลหลาก", "อพยพด่วน" เพื่อส่งป้ายเตือนภัยกะพริบสีแดงเข้ม (Live Threat Banner) ไปยังอุปกรณ์ของผู้บริหารทุกหน้าจอแบบ Real-time',
            'ระบบร่างเอกสารตอบกลับภัยพิบัติอัจฉริยะ (AI Smart Disaster Response Drafter): ช่วยเจ้าหน้าที่ยกร่างหนังสือติดต่อ ประสานงาน หรือรายงานสถานการณ์บรรเทาสาธารณภัยอย่างถูกต้องตามมาตรฐานสำนักนายกรัฐมนตรีได้ใน 1 คลิก'
          ]
        },
        {
          category: 'improvement',
          categoryLabel: '⚡ การปรับปรุง (Improvements)',
          items: [
            'สตรีมช่องสัญญาณเฉพาะสำหรับ Generative AI (Enterprise AI Dedicated Pool): ปรับปรุงเวลาการสรุปและแปลความหมายเอกสารให้ตอบกลับเฉลี่ยภายในเวลาเพียง 1.2 วินาที ลดการติดคิวงานในเวลาเร่งด่วนได้ถึง 80%',
            'ยกระดับหน้าจอสรุปรายงาน (Analytical Dashboard Studio): แสดงแผนภูมิแนวโน้มเอกสารภัยพิบัติรายเดือนแยกตามประเภทภัยพิบัติ พร้อมความสามารถในการดึงข้อมูลแบบ Dynamic Export เป็นไฟล์ Excel/PDF'
          ]
        },
        {
          category: 'security',
          categoryLabel: '🔒 ความปลอดภัย (Security)',
          items: [
            'บังคับการสิทธิ์การเข้าถึงข้อมูลภัยพิบัติแห่งชาติ (National Security Clearance RBAC): แยกแยะรหัสความปลอดภัยตามโครงสร้างกระทรวงมหาดไทยฉบับล่าสุด ป้องกันเจ้าหน้าที่ทั่วไปเข้าถึงเอกสารวิเคราะห์ความเสี่ยงระดับลับที่สุดของจังหวัด'
          ]
        }
      ]),
      images: JSON.stringify([])
    };

    // Insert v2.7.0
    const [rows270] = await connection.query('SELECT version FROM changelogs WHERE version = ?', [v270.version]);
    if (rows270.length === 0) {
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
        [v270.id, v270.version, v270.title, v270.releaseDate, v270.type, v270.summary, v270.changes, v270.images, 'System Admin']
      );
      console.log(`✅ Successfully added changelog ${v270.version} into MySQL!`);
    } else {
      console.log(`ℹ️ Changelog ${v270.version} already exists in MySQL.`);
    }

    // Insert v2.8.0
    const [rows280] = await connection.query('SELECT version FROM changelogs WHERE version = ?', [v280.version]);
    if (rows280.length === 0) {
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [v280.id, v280.version, v280.title, v280.releaseDate, v280.type, v280.summary, v280.changes, v280.images, 'System Admin']
      );
      console.log(`✅ Successfully added changelog ${v280.version} into MySQL!`);
    } else {
      console.log(`ℹ️ Changelog ${v280.version} already exists in MySQL.`);
    }

    // Ensure only v2.8.0 is marked as Latest
    await connection.query('UPDATE changelogs SET isLatest = 0 WHERE version != ?', [v280.version]);
    await connection.query('UPDATE changelogs SET isLatest = 1 WHERE version = ?', [v280.version]);
    console.log("✅ Managed isLatest fields: v2.8.0 is now marked as the newest/latest version!");

    await connection.end();
  } catch (err) {
    console.error("❌ Error adding changelogs:", err);
  }
}

addChangelogs();
