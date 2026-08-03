const mysql = require('mysql2/promise');

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    const tablesToDrop = [
      'changelogs',
      'department_routings',
      'department_sequences',
      'department_transfers',
      'dept_outbox_documents',
      'document_links',
      'notifications',
      'sub_departments',
      'user_mailbox'
    ];
    
    for (const table of tablesToDrop) {
      await pool.query(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Dropped table: ${table}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
