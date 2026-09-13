require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
  });
  
  const [rows] = await connection.query("SELECT id, changes, images FROM changelogs");
  for (let r of rows) {
    if (typeof r.changes === 'string') {
       try {
           const parsed = JSON.parse(r.changes);
           await connection.query("UPDATE changelogs SET changes = ? WHERE id = ?", [JSON.stringify(parsed), r.id]);
       } catch (e) {
           console.log("bad changes json for", r.id);
       }
    }
  }
  await connection.end();
}
check();
