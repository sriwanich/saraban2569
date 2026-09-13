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
  
  const [rows] = await connection.query("SELECT * FROM changelogs WHERE version = 'v2.5.0'");
  console.log("changes:", typeof rows[0].changes, rows[0].changes);
  console.log("images:", typeof rows[0].images, rows[0].images);
  await connection.end();
}
check();
