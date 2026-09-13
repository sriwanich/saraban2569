const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateChangelogs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    const [rows] = await connection.query('SELECT version FROM changelogs ORDER BY releaseDate DESC');
    console.log("Current versions:", rows.map(r => r.version));
    
    const has250 = rows.some(r => r.version === 'v2.5.0');
    if (!has250) {
      await connection.query('UPDATE changelogs SET isLatest = 0');
      
      const newVersion = 'v2.5.0';
      const id = 'cl_' + Math.random().toString(36).substring(2, 9);
      const title = 'อัปเดตประสิทธิภาพและระบบแจ้งเตือนอีเมลอัตโนมัติ (Email Notifications)';
      const releaseDate = new Date().toISOString();
      const type = 'major';
      const summary = 'ปรับปรุงความเร็วในการโหลดหน้าเว็บ (Performance), หน้าตั้งค่ารูปแบบใหม่ และเพิ่มระบบแจ้งเตือนผ่าน Email';
      const changes = JSON.stringify([
        { text: 'ปรับปรุงความเร็วและประสิทธิภาพ (Performance Optimization): ทำ Code Splitting (Lazy Loading) ให้โหลดหน้าเว็บได้ไวขึ้น', type: 'improve' },
        { text: 'ปรับปรุงการจัดวางหน้าการตั้งค่า (Settings): ออกแบบรูปแบบใหม่เป็นแนวนอน (Floating Segmented Control) เพื่อความสวยงามและรองรับมือถือ', type: 'improve' },
        { text: 'เพิ่มฟีเจอร์ระบบแจ้งเตือนผ่าน Email: ระบบจะส่งอีเมลอัตโนมัติเมื่อมีการมอบหมายเอกสาร, ส่งต่อข้ามฝ่าย หรืออัปเดตสถานะเอกสาร', type: 'add' },
        { text: 'เพิ่มตั้งค่าการรับอีเมล: ผู้ใช้ (Admin, Moderator, User) สามารถเปิด/ปิดการแจ้งเตือนทางอีเมลได้ที่เมนู "จัดการโปรไฟล์ส่วนตัว"', type: 'add' },
        { text: 'ปรับปรุงสิทธิ์การมองเห็นผู้รับผิดชอบ (Assignee): แสดงเฉพาะบุคลากรในฝ่ายเดียวกัน ยกเว้นระดับ Admin และ Moderator ที่สามารถเห็นรายชื่อทั้งหมด', type: 'improve' }
      ]);
      const images = JSON.stringify([]);
      
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [id, newVersion, title, releaseDate, type, summary, changes, images, 'System Admin', releaseDate, releaseDate]
      );
      console.log("Added changelog v2.5.0");
    } else {
      console.log("Changelog v2.5.0 already exists.");
    }
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

updateChangelogs();
