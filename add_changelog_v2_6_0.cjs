const mysql = require('mysql2/promise');
require('dotenv').config();

async function addChangelogV260() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    // Check if v2.6.0 already exists
    const [rows] = await connection.query('SELECT version FROM changelogs WHERE version = ?', ['v2.6.0']);
    
    if (rows.length === 0) {
      // Set previous versions as not latest
      await connection.query('UPDATE changelogs SET isLatest = 0');
      
      const newVersion = 'v2.6.0';
      const id = 'cl_v2_6_0';
      const title = 'อัปเกรดความน่าเชื่อถือและความปลอดภัยขั้นสูง (Enterprise Reliability & Security Overhaul)';
      const releaseDate = '2026-09-11';
      const type = 'major';
      const summary = 'ยกระดับความปลอดภัยและความน่าเชื่อถือของระบบด้วยระบบสำรองข้อมูลอัตโนมัติรายวัน (Automated Daily Backups Engine) บังคับสิทธิ์ฝั่งเซิร์ฟเวอร์แบบเข้มงวด และปรับปรุงบริการตรวจวิเคราะห์เอกสารผ่าน AI รุ่นเสถียรที่สุด';
      
      const changes = JSON.stringify([
        {
          category: 'feature',
          categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
          items: [
            'ระบบสำรองข้อมูลอัตโนมัติรายวัน (Automated Daily Backups Engine): ประมวลผลและสำรองฐานข้อมูลอย่างยืดหยุ่นในรูปแบบ JSON ทุกๆ 24 ชั่วโมง พร้อมระบบลบไฟล์เก่าอัตโนมัติ (Rotation) ย้อนหลังสูงสุด 7 วัน เพื่อรักษาสมดุลของดิสก์',
            'แผงควบคุมระบบกู้คืนประวัติสำรองข้อมูลอัตโนมัติ: เพิ่มตารางแสดงประวัติไฟล์สำรองข้อมูลรายวันในหน้าตั้งค่า พร้อมระบบกู้คืนระบบกลับไปยังประวัติวันนั้นทันทีด้วยการกดปุ่ม Restore เพียงคลิกเดียว'
          ]
        },
        {
          category: 'security',
          categoryLabel: '🔒 ความปลอดภัย (Security)',
          items: [
            'ระบบตรวจสอบสิทธิ์ระดับเซิร์ฟเวอร์แบบเข้มงวด (Stricter Server-Side RBAC Enforcement): บังคับสิทธิ์การจัดการข้อมูลผ่าน Backend ทุกการเรียกใช้การสำรองข้อมูล (backup_restore) และตั้งค่าระบบ (system_settings) ป้องกันการโจมตีหรือการยิงคำขอตรงจากภายนอก'
          ]
        },
        {
          category: 'improvement',
          categoryLabel: '⚡ การปรับปรุง (Improvements)',
          items: [
            'อัปเกรด AI วิเคราะห์ความถูกต้องและลายเซ็นดิจิทัล: อัปเกรด API ตรวจสอบลายเซ็นและการถอดข้อความของไฟล์แนบ PDF เป็นโมเดลเวอร์ชันทางการ gemini-2.5-flash เพื่อความรวดเร็วและหลีกเลี่ยงข้อจำกัดโควตาของรุ่นทดลอง',
            'ขยายสเปกการสำรองข้อมูลครอบคลุม 100%: เพิ่มการซิงโครไนซ์ตารางข้อมูลทั้งหมดของฐานข้อมูล (รวมถึง Workflow, คิวอาร์โค้ด, ตารางประวัติ Changelogs) ให้สามารถจัดเก็บและกู้คืนได้อย่างสมบูรณ์แบบไม่สูญหาย'
          ]
        }
      ]);
      const images = JSON.stringify([]);
      
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
         [id, newVersion, title, releaseDate, type, summary, changes, images, 'System Admin']
      );
      console.log("✅ Successfully added changelog v2.6.0 into MySQL!");
    } else {
      console.log("ℹ️ Changelog v2.6.0 already exists in MySQL.");
    }
    
    await connection.end();
  } catch (err) {
    console.error("❌ Error adding changelog v2.6.0:", err);
  }
}

addChangelogV260();
