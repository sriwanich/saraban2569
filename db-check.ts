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
  console.log('Connecting to:', { dbHost, dbPort, dbName, dbUser });
  try {
    const conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      connectTimeout: 3000
    });
    console.log('Connected successfully!');
    
    // DESCRIBE settings
    try {
      const [cols]: any = await conn.query('DESCRIBE settings');
      console.log('Columns in settings table:', cols.map((c: any) => `${c.Field} (${c.Type})`));
    } catch (e: any) {
      console.error('Failed to describe settings table:', e.message);
    }
    
    await conn.end();
  } catch (err: any) {
    console.error('Database connection failed:', err.message);
  }
}

test();
