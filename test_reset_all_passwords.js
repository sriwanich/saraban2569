import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'edms_user',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'edms_db',
  });

  await connection.query('UPDATE users SET password = ?', ['1234']);
  console.log("All passwords reset to 1234");
  
  await connection.end();
}
run();
