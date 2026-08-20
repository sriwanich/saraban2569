import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'edms_user',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'edms_db',
  });

  const tables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
  for (let table of tables) {
    try {
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      console.log(`\nTable ${table}:`);
      console.log(cols.map(c => `${c.Field} (${c.Type})`).join(', '));
    } catch (e) {
      console.log(`Table ${table} not found.`);
    }
  }

  await connection.end();
}
run();
