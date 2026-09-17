const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const v290 = {
  id: 'cl-v2-9-0',
  version: 'v2.9.0',
  title: 'ศูนย์ปัญญาประดิษฐ์วิเคราะห์สาธารณภัย (Smart AI Disaster Intelligence) & พรีวิวรายงานเหตุด่วน A4 ทางการ',
  releaseDate: '2026-09-17',
  type: 'major',
  summary: 'ยกระดับขีดความสามารถ Smart AI Assistant ให้เชื่อมโยงกับฐานข้อมูลศูนย์รายงานเหตุด่วนสาธารณภัย (Urgent Incident Center) ค้นหา วิเคราะห์ความเสียหาย สรุปสถานการณ์ภัยพิบัติในจังหวัดระยอง พร้อมระบบยกร่างหนังสือรายงานผู้ว่าราชการจังหวัด และพรีวิวรายงานเหตุด่วน A4 ตามระเบียบ ปภ.',
  changes: [
    {
      category: 'feature',
      categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
      items: [
        'ระบบปัญญาประดิษฐ์สืบค้นและวิเคราะห์เหตุด่วนสาธารณภัย (Disaster AI Intelligence): เชื่อมโยงฐานข้อมูลเหตุด่วน ปภ.ระยอง เข้าสู่ระบบ AI เพื่อตอบคำถาม สรุปสถิติความเสียหาย ผู้ประสบภัย ผู้บาดเจ็บ/เสียชีวิต แยกตามประเภทภัยและพื้นที่รายอำเภอ/ตำบล',
        'ฟังก์ชันแนบรายงานเหตุด่วนเฉพาะเรื่อง (Attach Incident to AI): เลือกแนบรายงานเหตุด่วนสาธารณภัยเข้าสู่หน้าต่างสนทนา AI เพื่อให้ AI ช่วยวิเคราะห์ สรุปประเด็นสำคัญ และประเมินความเสียหายได้อย่างแม่นยำ',
        'AI ยกร่างหนังสือรายงานเหตุด่วนถึงผู้ว่าราชการจังหวัด (Draft Disaster Report to Governor): สั่งการให้ AI นำข้อมูลสถิติผู้ประสบภัย พฤติการณ์เหตุการณ์ และการช่วยเหลือมายกร่างเป็นหนังสือราชการทางการเรียน ผวจ.ระยอง ตามระเบียบสำนักนายกฯ ได้ในคลิกเดียว',
        'หน้าต่างพรีวิวแบบรายงานเหตุด่วน A4 ทางการ (Official A4 Paper Preview & Direct Print): แสดงผลแบบรายงาน ปภ. ๑ ครบถ้วนตามมาตรฐาน พร้อมตราครุฑราชการ ตารางสรุปความเสียหาย และปุ่มสั่งพิมพ์รายงานทันใจ',
        'หมวดหมู่คำสั่งสำเร็จรูป "🚨 เหตุด่วนสาธารณภัย" (Disaster Prompt Presets): เพิ่มเทมเพลตคำสั่งสืบค้นและสรุปสถานการณ์อุทกภัย วาตภัย อัคคีภัย และสารเคมีรั่วไหลในจังหวัดระยอง'
      ]
    },
    {
      category: 'improvement',
      categoryLabel: '⚡ การปรับปรุง (Improvements)',
      items: [
        'ปรับปรุงระบบคัดกรองคำค้นหา (Disaster Intent Filter) ค้นหาเหตุการณ์ได้อย่างครอบคลุมทั้งจากเลขที่รายงาน ประเภทภัย ตำบล อำเภอ และพฤติการณ์เหตุการณ์',
        'เชื่อมโยงปุ่มนำทางลัด (Quick Navigation) จาก Smart AI Assistant ตรงเข้าสู่โมดูลรายงานเหตุด่วนสาธารณภัย'
      ]
    }
  ],
  images: [],
  author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
  isLatest: true,
  isPublished: true,
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z'
};

async function syncChangelog() {
  console.log('🚀 Starting sync of Changelog v2.9.0 to MySQL and Local DB...');

  // 1. Update uploads/db_store.json
  try {
    const dbStorePath = path.join(process.cwd(), 'uploads', 'db_store.json');
    if (fs.existsSync(dbStorePath)) {
      const content = fs.readFileSync(dbStorePath, 'utf-8');
      const data = JSON.parse(content);
      if (!Array.isArray(data.changelogs)) {
        data.changelogs = [];
      }

      // Check if already exists in db_store
      const existingIdx = data.changelogs.findIndex(
        (c) => c.id === v290.id || (c.version && c.version.toLowerCase().replace(/^v/, '') === '2.9.0')
      );

      // Set all other changelogs isLatest to false
      data.changelogs.forEach(c => { c.isLatest = false; });

      if (existingIdx >= 0) {
        data.changelogs[existingIdx] = { ...data.changelogs[existingIdx], ...v290, isLatest: true };
        console.log('🔄 Updated existing v2.9.0 in db_store.json');
      } else {
        data.changelogs.unshift(v290);
        console.log('➕ Added v2.9.0 to top of db_store.json');
      }

      fs.writeFileSync(dbStorePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('💾 Successfully saved uploads/db_store.json');
    }
  } catch (err) {
    console.warn('⚠️ Note updating db_store.json:', err.message);
  }

  // 2. Connect to MySQL and insert/update
  const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
  const dbName = process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || '';
  const dbUser = process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || '';
  const dbPass = process.env.DB_PASSWORD !== undefined 
    ? process.env.DB_PASSWORD 
    : (process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''));

  if (!dbName || !dbUser) {
    console.log('ℹ️ MySQL credentials not fully specified in environment. Local JSON storage updated.');
    return;
  }

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      connectTimeout: 5000
    });

    console.log(`✅ Connected to MySQL Database [${dbName}] at ${dbHost}:${dbPort}`);

    // Create table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS changelogs (
        id VARCHAR(100) PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        releaseDate VARCHAR(50) NOT NULL,
        type VARCHAR(50) DEFAULT 'minor',
        summary TEXT,
        changes LONGTEXT,
        images LONGTEXT,
        author VARCHAR(255),
        isLatest TINYINT(1) DEFAULT 0,
        isPublished TINYINT(1) DEFAULT 1,
        createdAt VARCHAR(50),
        updatedAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if v2.9.0 exists
    const [existingRows] = await connection.query(
      'SELECT id, version FROM changelogs WHERE id = ? OR version = ?',
      [v290.id, v290.version]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // Update
      await connection.query(
        `UPDATE changelogs 
         SET title = ?, releaseDate = ?, type = ?, summary = ?, changes = ?, images = ?, author = ?, isLatest = 1, isPublished = 1, updatedAt = ?
         WHERE id = ? OR version = ?`,
        [
          v290.title,
          v290.releaseDate,
          v290.type,
          v290.summary,
          JSON.stringify(v290.changes),
          JSON.stringify(v290.images),
          v290.author,
          new Date().toISOString(),
          v290.id,
          v290.version
        ]
      );
      console.log(`🔄 Updated Changelog ${v290.version} in MySQL`);
    } else {
      // Insert
      await connection.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        [
          v290.id,
          v290.version,
          v290.title,
          v290.releaseDate,
          v290.type,
          v290.summary,
          JSON.stringify(v290.changes),
          JSON.stringify(v290.images),
          v290.author,
          v290.createdAt,
          v290.updatedAt
        ]
      );
      console.log(`✨ Successfully inserted Changelog ${v290.version} into MySQL`);
    }

    // Set all others isLatest = 0
    await connection.query("UPDATE changelogs SET isLatest = 0 WHERE id != ? AND version != ?", [v290.id, v290.version]);
    await connection.query("UPDATE changelogs SET isLatest = 1 WHERE id = ? OR version = ?", [v290.id, v290.version]);
    console.log(`📌 Marked ${v290.version} as the unique latest version in MySQL`);

    // Verify
    const [allRows] = await connection.query('SELECT version, title, releaseDate, isLatest FROM changelogs ORDER BY isLatest DESC, releaseDate DESC LIMIT 5');
    console.log('📋 Recent Changelogs in MySQL:');
    console.table(allRows);

    await connection.end();
  } catch (mysqlErr) {
    console.warn('⚠️ MySQL connection/query notice:', mysqlErr.message);
  }
}

syncChangelog();
