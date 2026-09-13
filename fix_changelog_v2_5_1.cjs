const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixChangelogV251() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    const newChanges = JSON.stringify([
      {
        category: "improve",
        categoryLabel: "⚡ การปรับปรุง (Improvements)",
        items: [
          "ปรับปรุงดีไซน์ Glassmorphism (Glassmorphism Overhaul): ปรับโฉมหน้าตา UI ทั้งระบบให้ดูโปร่งใส ทันสมัย และเป็นมืออาชีพมากขึ้น",
          "เพิ่มประสิทธิภาพระบบ: ปปรับปรุงโครงสร้าง Layout ให้เหมาะสมกับการใช้งานบน Mobile และ PC",
          "ปรับปรุงความสวยงามของแถบแจ้งเตือน: ปรับดีไซน์ส่วนการแจ้งเตือนให้สะอาดตาและชัดเจนขึ้น"
        ]
      }
    ]);

    await connection.query('UPDATE changelogs SET changes = ? WHERE version = ?', [newChanges, 'v2.5.1']);
    console.log("Updated changelog v2.5.1");
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

fixChangelogV251();
