import mysql from 'mysql2/promise';
async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'dpmpryg_sriwanich',
    password: 'M@t34a053896077',
    database: 'disaster_saraban70'
  });
  const [rows] = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
  console.log('Key:', rows[0].geminiApiKey);
  process.exit(0);
}
run();
