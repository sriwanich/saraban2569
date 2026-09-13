const mysql = require('mysql2/promise');
require('dotenv').config();

async function listChangelogs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'test'
    });

    const [rows] = await connection.query('SELECT version, changes FROM changelogs ORDER BY releaseDate DESC');
    for (const row of rows) {
      console.log(`Version: ${row.version}`);
      console.log(`Changes: ${row.changes}`);
      console.log('---');
    }
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

listChangelogs();
