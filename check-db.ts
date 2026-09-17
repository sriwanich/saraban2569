import { pool } from './src/db/db';
async function run() {
  const [rows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
  console.log('Custom API key is:', rows[0]?.geminiApiKey);
  process.exit(0);
}
run();
