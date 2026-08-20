import mysql from 'mysql2/promise';
import * as argon2 from 'argon2';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'edms_user',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'edms_db',
  });

  const hash = await argon2.hash('1234');
  await connection.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'sriwanich']);
  console.log("Password reset for sriwanich to 1234");
  
  await connection.end();
}
run();
