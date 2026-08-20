import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'edms_user',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'edms_db',
  });

  const [rows] = await connection.query('SELECT id, year FROM admin_documents WHERE year IS NULL');
  console.log("null years:", rows.length);
  const [rows2] = await connection.query('SELECT id, year FROM inbox_documents WHERE year IS NULL');
  console.log("null years in inbox:", rows2.length);

  await connection.end();
}
run();
