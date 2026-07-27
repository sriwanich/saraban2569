const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `async function addSystemLog(action: string, details: string, username: string = 'System', ipAddress: string = '') {
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

const replacement = `async function addSystemLog(action: string, details: string, username: string = 'System', ipAddress: string = '') {
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

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.ts', content);
  console.log('Successfully updated addSystemLog');
} else {
  console.log('Target not found');
}
