const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Update addSystemLog
const oldAddLog = `async function addSystemLog(action: string, details: string, username: string = 'System', ipAddress: string = '') {
  const timestamp = new Date().toISOString();
  try {
      await pool.query(
        'INSERT INTO system_logs (action, details, username, ipAddress) VALUES (?, ?, ?, ?)',
        [action, details, username, ipAddress]
      );
    } catch (e: any) {
      console.error('Failed to insert log into MySQL:', e.message);
    }
}`;

const newAddLog = `async function addSystemLog(action: string, details: string, username: string = 'System', ipAddress: string = '') {
  const timestamp = new Date().toISOString();
  try {
      await pool.query(
        'INSERT INTO system_logs (action, details, username, ipAddress) VALUES (?, ?, ?, ?)',
        [action, details, username, ipAddress]
      );
    } catch (e: any) {
      console.error('Failed to insert log into MySQL:', e.message);
    }
  if (!localDb.system_logs) localDb.system_logs = [];
  localDb.system_logs.unshift({ id: Date.now(), action, details, username, ipAddress, timestamp });
  if (localDb.system_logs.length > 500) localDb.system_logs = localDb.system_logs.slice(0, 500);
  saveLocalDb();
}`;

if (content.includes(oldAddLog)) {
  content = content.replace(oldAddLog, newAddLog);
  console.log('Updated addSystemLog in server.ts');
}

// 2. Update GET /api/logs
const oldGetLogs = `app.get('/api/logs', async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT * FROM system_logs ORDER BY id DESC LIMIT 200');
      return res.json(rows);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});`;

const newGetLogs = `app.get('/api/logs', async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT * FROM system_logs ORDER BY id DESC LIMIT 200');
      return res.json(rows);
    } catch (error: any) {
      console.error('Database error fetching logs:', error.message);
      const logs = localDb.system_logs || [];
      return res.json(logs);
    }
});`;

if (content.includes(oldGetLogs)) {
  content = content.replace(oldGetLogs, newGetLogs);
  console.log('Updated GET /api/logs in server.ts');
}

fs.writeFileSync('server.ts', content);
