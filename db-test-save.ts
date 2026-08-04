import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
const dbName = process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || '';
const dbUser = process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || '';
const dbPass = process.env.DB_PASSWORD !== undefined 
  ? process.env.DB_PASSWORD 
  : (process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''));

async function test() {
  console.log('Testing SELECT and UPDATE queries on settings...');
  try {
    const conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      connectTimeout: 3000
    });
    
    // 1. SELECT id FROM settings LIMIT 1
    const [rows]: any = await conn.query('SELECT id FROM settings LIMIT 1');
    console.log('SELECT rows:', rows);
    
    if (rows.length > 0) {
      const autoReserveEnabled = true;
      const autoReserveTime = '18:00';
      const autoReserveQty = 5;
      
      // 2. UPDATE settings SET autoReserveEnabled = ?, autoReserveTime = ?, autoReserveQty = ? WHERE id = ?
      console.log('Running UPDATE...');
      const [res]: any = await conn.query(
        'UPDATE settings SET autoReserveEnabled = ?, autoReserveTime = ?, autoReserveQty = ? WHERE id = ?',
        [autoReserveEnabled ? 1 : 0, autoReserveTime || '18:00', Number(autoReserveQty) || 5, rows[0].id]
      );
      console.log('UPDATE success! Result:', res);
    } else {
      console.log('No settings row found to update!');
    }
    
    await conn.end();
  } catch (err: any) {
    console.error('Database query failed:', err);
  }
}

test();
