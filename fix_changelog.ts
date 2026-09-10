import mysql from 'mysql2/promise';

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'password',
    database: process.env.MYSQL_DATABASE || 'edms_db'
  });
  
  await connection.query('UPDATE changelogs SET isLatest = 0 WHERE version = "v2.4.0"');
  console.log('Fixed');
  connection.end();
}
fix();
