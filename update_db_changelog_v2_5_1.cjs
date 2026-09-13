const mysql = require('mysql2/promise');
require('dotenv').config();

async function addChangelogV251() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    const [rows] = await connection.query('SELECT version FROM changelogs WHERE version = ?', ['v2.5.1']);
    
    if (rows.length === 0) {
      await connection.query('UPDATE changelogs SET isLatest = 0');
      
      const newVersion = 'v2.5.1';
      const id = 'cl_' + Math.random().toString(36).substring(2, 9);
      const title = 'ปรับปรุงดีไซน์ Glassmorphism และความสวยงามของระบบ';
      const releaseDate = new Date().toISOString();
      const type = 'minor';
      const summary = 'ปรับปรุงหน้าตา UI/UX ของระบบให้มีความทันสมัย สวยงาม ล้ำสมัย ด้วยดีไซน์ Glassmorphism พร้อมเพิ่มประสิทธิภาพการตอบสนอง';
      const changes = JSON.stringify([
        { text: 'ปรับปรุงดีไซน์ Glassmorphism (Glassmorphism Overhaul): ปรับโฉมหน้าตา UI ทั้งระบบให้ดูโปร่งใส ทันสมัย และเป็นมืออาชีพมากขึ้น', type: 'improve' },
        { text: 'เพิ่มประสิทธิภาพระบบ: ปรับปรุงโครงสร้าง Layout ให้เหมาะสมกับการใช้งานบน Mobile และ PC', type: 'improve' },
        { text: 'ปรับปรุงความสวยงามของแถบแจ้งเตือน: ปรับดีไซน์ส่วนการแจ้งเตือนให้สะอาดตาและชัดเจนขึ้น', type: 'improve' }
      ]);
      const images = JSON.stringify([]);
      
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [id, newVersion, title, releaseDate, type, summary, changes, images, 'System Admin', releaseDate, releaseDate]
      );
      console.log("Added changelog v2.5.1");
    } else {
      console.log("Changelog v2.5.1 already exists.");
    }
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

addChangelogV251();
