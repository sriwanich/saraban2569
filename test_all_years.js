import mysql from 'mysql2/promise';
async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'edms_user',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'edms_db',
  });
  const t = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
  for (const tbl of t) {
     const [r] = await connection.query(`SELECT COUNT(*) as c FROM ${tbl} WHERE year IS NULL OR year = ''`);
     console.log(tbl, r[0].c);
  }
  await connection.end();
}
run();
