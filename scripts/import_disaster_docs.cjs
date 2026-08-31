const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runImport() {
  const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
  const dbName = process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'edms_db';
  const dbUser = process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
  const dbPass = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''));

  console.log(`Connecting to MySQL at ${dbHost}:${dbPort}, database: ${dbName}, user: ${dbUser}...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      charset: 'utf8mb4',
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL:', err.message);
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), 'disaster_office69.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ disaster_office69.sql not found in root directory.');
    await connection.end();
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  function parseInserts(sqlText, tableName) {
    const regex = new RegExp("INSERT INTO `" + tableName + "` \\(([^)]+)\\) VALUES\\s*(.*?);", "gs");
    let match;
    let rows = [];
    while ((match = regex.exec(sqlText)) !== null) {
      const cols = match[1].split(",").map(c => c.trim().replace(/`/g, ""));
      const valuesStr = match[2];
      const rowRegex = /\((.*?)\)(?:,\s*|$)/gs;
      let rMatch;
      while ((rMatch = rowRegex.exec(valuesStr)) !== null) {
        const rawVals = rMatch[1];
        const vals = [];
        let inStr = false;
        let current = "";
        let escaped = false;
        for (let i = 0; i < rawVals.length; i++) {
          let ch = rawVals[i];
          if (escaped) {
            current += ch;
            escaped = false;
          } else if (ch === '\\\\') {
            escaped = true;
          } else if (ch === '\'' || ch === '"') {
            inStr = !inStr;
            current += ch;
          } else if (ch === ',' && !inStr) {
            vals.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        vals.push(current.trim());

        const obj = {};
        cols.forEach((col, idx) => {
          let v = vals[idx];
          if (v !== undefined) {
            if ((v.startsWith('\'') && v.endsWith('\'')) || (v.startsWith('"') && v.endsWith('"'))) {
              v = v.substring(1, v.length - 1).replace(/\\''/g, '\'').replace(/\\\\/g, '\\');
            } else if (v.toUpperCase() === 'NULL') {
              v = null;
            } else if (!isNaN(Number(v))) {
              v = Number(v);
            }
          }
          obj[col] = v;
        });
        rows.push(obj);
      }
    }
    return rows;
  }

  let stats = {
    receiveImported: 0, receiveSkipped: 0,
    sendImported: 0, sendSkipped: 0,
    commandImported: 0, commandSkipped: 0,
    certificateImported: 0, certificateSkipped: 0,
    bookMainImported: 0, bookMainSkipped: 0
  };

  // 1. Import bookregister_receive -> inbox_documents
  console.log('\n--- Importing bookregister_receive (หนังสือรับ) ---');
  const receiveRows = parseInserts(sqlContent, 'bookregister_receive');
  for (const r of receiveRows) {
    const docId = `rcv-${r.ms_id}-${r.year}-${r.register_number}`;
    const receiveNumber = String(r.register_number || '');
    const year = String(r.year || '2569');
    const docNumber = r.book_no || '';
    const date = r.signdate || '';
    let priority = 'ปกติ';
    if (r.level === 2) priority = 'ด่วน';
    else if (r.level === 3) priority = 'ด่วนมาก';
    else if (r.level >= 4) priority = 'ด่วนที่สุด';

    const title = r.subject || 'ไม่มีชื่อเรื่อง';
    const fromDept = r.book_from || '';
    const toDept = r.book_to || '';
    const department = 'ฝ่ายบริหารงานทั่วไป';
    const assignee = r.officer || '';
    const note = r.comment || '';
    const content = r.operation || '';
    const registerDate = r.register_date || '';
    const status = 'ลงทะเบียน';
    const attachments = r.ref_id ? JSON.stringify([{ url: `/uploads/inbox/${r.ref_id}`, originalName: r.ref_id }]) : '[]';

    const [existing] = await connection.query('SELECT id FROM inbox_documents WHERE id = ? OR (docNumber = ? AND year = ?)', [docId, docNumber, year]);
    if (existing && existing.length > 0) {
      stats.receiveSkipped++;
    } else {
      await connection.query(
        `INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [docId, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments]
      );
      stats.receiveImported++;
    }
  }
  console.log(`bookregister_receive: Imported ${stats.receiveImported}, Skipped (duplicate) ${stats.receiveSkipped}`);

  // 2. Import bookregister_send -> outbox_documents
  console.log('\n--- Importing bookregister_send (หนังสือส่ง) ---');
  const sendRows = parseInserts(sqlContent, 'bookregister_send');
  for (const r of sendRows) {
    const docId = `snd-${r.ms_id}-${r.year}-${r.register_number}`;
    const receiveNumber = String(r.register_number || '');
    const year = String(r.year || '2569');
    const docNumber = r.book_no || '';
    const date = r.signdate || '';
    const priority = 'ปกติ';
    const title = r.subject || 'ไม่มีชื่อเรื่อง';
    const fromDept = r.book_from || '';
    const toDept = r.book_to || '';
    const department = 'ฝ่ายบริหารงานทั่วไป';
    const assignee = r.officer || '';
    const note = r.comment || '';
    const content = r.operation || '';
    const registerDate = r.register_date || '';
    const status = 'ลงทะเบียน';
    const attachments = r.ref_id ? JSON.stringify([{ url: `/uploads/outbox/${r.ref_id}`, originalName: r.ref_id }]) : '[]';

    const [existing] = await connection.query('SELECT id FROM outbox_documents WHERE id = ? OR (docNumber = ? AND year = ?)', [docId, docNumber, year]);
    if (existing && existing.length > 0) {
      stats.sendSkipped++;
    } else {
      await connection.query(
        `INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [docId, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments]
      );
      stats.sendImported++;
    }
  }
  console.log(`bookregister_send: Imported ${stats.sendImported}, Skipped (duplicate) ${stats.sendSkipped}`);

  // 3. Import bookregister_command -> admin_documents (order / คำสั่ง)
  console.log('\n--- Importing bookregister_command (คำสั่ง) ---');
  const commandRows = parseInserts(sqlContent, 'bookregister_command');
  for (const r of commandRows) {
    const docId = `cmd-${r.ms_id}-${r.year}-${r.register_number}`;
    const docNumber = r.book_no || '';
    const year = String(r.year || '2569');
    const date = r.signdate || '';
    const title = r.subject || 'ไม่มีชื่อเรื่อง';
    const department = 'ฝ่ายบริหารงานทั่วไป';
    const assignee = r.officer || '';
    const note = r.comment || '';
    const content = r.comment || '';
    const registerDate = r.register_date || '';
    const status = 'ลงทะเบียน';
    const attList = [];
    if (r.file_name) {
      attList.push({ url: `/uploads/admin/order/${r.file_name}`, originalName: r.file_name });
    }
    const attachments = JSON.stringify(attList);

    const [existing] = await connection.query('SELECT id FROM admin_documents WHERE id = ? OR (docNumber = ? AND year = ? AND category = "order")', [docId, docNumber, year]);
    if (existing && existing.length > 0) {
      stats.commandSkipped++;
    } else {
      await connection.query(
        `INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, status, attachments, isCentral) VALUES (?, 'order', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [docId, docNumber, year, date, title, department, assignee, note, content, registerDate, status, attachments]
      );
      stats.commandImported++;
    }
  }
  console.log(`bookregister_command: Imported ${stats.commandImported}, Skipped (duplicate) ${stats.commandSkipped}`);

  // 4. Import bookregister_certificate -> admin_documents (announcement / ประกาศ / หนังสือรับรอง)
  console.log('\n--- Importing bookregister_certificate (ประกาศ / หนังสือรับรอง) ---');
  const certRows = parseInserts(sqlContent, 'bookregister_certificate');
  for (const r of certRows) {
    const docId = `cer-${r.ms_id}-${r.year}-${r.register_number}`;
    const docNumber = r.book_no || '';
    const year = String(r.year || '2569');
    const date = r.signdate || '';
    const title = r.subject || r.name_cer || 'ไม่มีชื่อเรื่อง';
    const department = 'ฝ่ายบริหารงานทั่วไป';
    const assignee = r.officer || '';
    const note = r.comment || '';
    const content = r.subject2 || '';
    const registerDate = r.register_date || '';
    const status = 'ลงทะเบียน';
    const attList = [];
    if (r.file_name) {
      attList.push({ url: `/uploads/admin/announcement/${r.file_name}`, originalName: r.file_name });
    }
    const attachments = JSON.stringify(attList);

    const [existing] = await connection.query('SELECT id FROM admin_documents WHERE id = ? OR (docNumber = ? AND year = ? AND category = "announcement")', [docId, docNumber, year]);
    if (existing && existing.length > 0) {
      stats.certificateSkipped++;
    } else {
      await connection.query(
        `INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, status, attachments, isCentral) VALUES (?, 'announcement', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [docId, docNumber, year, date, title, department, assignee, note, content, registerDate, status, attachments]
      );
      stats.certificateImported++;
    }
  }
  console.log(`bookregister_certificate: Imported ${stats.certificateImported}, Skipped (duplicate) ${stats.certificateSkipped}`);

  // 5. Import book_main -> inbox_documents or internal_documents
  console.log('\n--- Importing book_main (ทะเบียนหนังสือหลัก) ---');
  const bookMainRows = parseInserts(sqlContent, 'book_main');
  for (const r of bookMainRows) {
    const docId = `bm-${r.ms_id}`;
    const docNumber = r.bookno || '';
    const year = '2569';
    const date = r.signdate || '';
    const title = r.subject || 'ไม่มีชื่อเรื่อง';
    const fromDept = r.sender || '';
    const toDept = r.office || '';
    const department = 'ฝ่ายบริหารงานทั่วไป';
    const assignee = r.office || '';
    const note = r.detail || '';
    const content = r.detail || '';
    const registerDate = r.send_date ? r.send_date.toString().substring(0, 10) : '';
    const status = 'ลงทะเบียน';
    const attachments = r.ref_id ? JSON.stringify([{ url: `/uploads/inbox/${r.ref_id}`, originalName: r.ref_id }]) : '[]';

    const [existing] = await connection.query('SELECT id FROM inbox_documents WHERE id = ? OR (docNumber = ? AND year = ?)', [docId, docNumber, year]);
    if (existing && existing.length > 0) {
      stats.bookMainSkipped++;
    } else {
      try {
        await connection.query(
          `INSERT IGNORE INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, 'ปกติ', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [docId, String(r.ms_id), year, docNumber, date, title, fromDept, toDept, department, assignee, note, content, registerDate, status, attachments]
        );
        stats.bookMainImported++;
      } catch (e) {
        stats.bookMainSkipped++;
      }
    }
  }
  console.log(`book_main: Imported ${stats.bookMainImported}, Skipped (duplicate) ${stats.bookMainSkipped}`);

  console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY ===');
  console.log(JSON.stringify(stats, null, 2));

  await connection.end();
}

runImport().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
