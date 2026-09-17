// Entry point for Plesk Obsidian / Phusion Passenger / PM2 / IISNode
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(serverPath)) {
  require(serverPath);
} else {
  console.error('================================================================');
  console.error('💥 [EDMS Server Startup Error] ไม่พบไฟล์ ./dist/server.cjs');
  console.error('กรุณาสั่งรันคำสั่ง Build บนเซิร์ฟเวอร์ก่อนเริ่มใช้งาน:');
  console.error('   npm install');
  console.error('   npm run build');
  console.error('หรือหาก Build จากเครื่องตนเอง กรุณาอัปโหลดโฟลเดอร์ dist/ ขึ้นมาด้วย');
  console.error('================================================================');

  // Launch a lightweight fallback HTTP server so Passenger / Web Server does not crash with 502/503
  const http = require('http');
  const port = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>EDMS Saraban - ต้องทำการ Build ก่อนเริ่มใช้งาน</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
          .box { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 640px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          h2 { color: #f59e0b; margin-top: 0; display: flex; align-items: center; gap: 8px; font-size: 22px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 12px 0; }
          .code-box { background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 18px; font-family: monospace; color: #38bdf8; font-size: 14px; margin: 16px 0; overflow-x: auto; }
          .badge { display: inline-block; background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b40; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="badge">Hosting Setup Notice</div>
          <h2>⚠️ ระบบ EDMS ยังไม่ได้ Build ไฟล์สำหรับใช้งานจริง</h2>
          <p>ตรวจพบว่าเซิร์ฟเวอร์ยังไม่มีไฟล์ <code>./dist/server.cjs</code> และไฟล์ในโฟลเดอร์ <code>dist/</code> ทำให้ไม่สามารถเริ่มระบบงานสารบรรณได้</p>
          <p><strong>วิธีแก้ไขอย่างรวดเร็ว (Quick Fix):</strong></p>
          <div class="code-box">
            # 1. เปิด Terminal ในโฟลเดอร์โปรเจกต์<br>
            npm install<br><br>
            # 2. สั่งคอมไพล์โค้ดเป็นไฟล์ Production<br>
            npm run build<br><br>
            # 3. รีสตาร์ท Node.js (หรือแตะปุ่ม Restart App ใน cPanel)
          </div>
          <p><em>หมายเหตุ: หากโฮสติ้งของท่านไม่มี Terminal ให้รัน <code>npm run build</code> บนคอมพิวเตอร์ของท่าน แล้วอัปโหลดทั้งโฟลเดอร์ <code>dist/</code> ขึ้นมาไว้ที่โฮสต์ครับ</em></p>
        </div>
      </body>
      </html>
    `);
  });

  const isNamedPipeOrSocket = isNaN(Number(port));
  if (isNamedPipeOrSocket) {
    server.listen(port);
  } else {
    server.listen(Number(port) || 3000, '0.0.0.0');
  }
}

