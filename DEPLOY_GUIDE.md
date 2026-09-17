# คู่มือการติดตั้งและ Deploy บนโฮสติ้งจริง (EDMS Saraban Deployment Guide)

หากคุณอัปโหลดไฟล์ขึ้นโฮสติ้งจริงแล้วพบข้อความแจ้งเตือน:
> **"ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง"**

เอกสารนี้จะช่วยอธิบายสาเหตุและวิธีแก้ไขอย่างละเอียดทีละขั้นตอน

---

## 🔍 สาเหตุที่พบบ่อย (Root Causes)

ระบบนี้เป็น **Full-Stack Application** ที่ประกอบด้วย:
1. **Frontend**: React + Vite + Tailwind CSS
2. **Backend**: Node.js + Express (ทำงานผ่านไฟล์ `dist/server.cjs` หรือ `app.js`)
3. **Database**: MySQL (พร้อมระบบ Fallback ฐานข้อมูลอัตโนมัติ)

หากอัปโหลดไฟล์ขึ้นเว็บเซิร์ฟเวอร์แบบเดิม (เช่น อัปโหลดเข้า `public_html` ของ Apache/Nginx โดยไม่ได้สั่งรัน Node.js) ตัวเว็บเบราว์เซอร์จะไม่สามารถเรียก API เส้น `/api/login` ได้ และจะได้รับข้อผิดพลาด 404 / 502 ส่งผลให้ระบบแจ้งเตือนว่า *"ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"*

---

## 🚀 วิธีแก้ไขที่ 1: การตั้งค่าบน cPanel / DirectAdmin / Plesk (Setup Node.js App)

หากโฮสติ้งของคุณเป็น Shared Hosting หรือ Cloud ที่มี cPanel:

1. **เปิดเมนู "Setup Node.js App"**
   - ไปที่ cPanel Dashboard > ค้นหา **"Setup Node.js App"**
   - คลิกปุ่ม **Create Application**

2. **กรอกข้อมูลการตั้งค่า:**
   - **Node.js version**: เลือก **20.x** หรือ **18.x**
   - **Application mode**: เลือก **Production**
   - **Application root**: ใส่โฟลเดอร์ของแอป (เช่น `edms` หรือ `public_html`)
   - **Application URL**: เลือกโดเมนหรือ Subdomain ของคุณ
   - **Application startup file**: ระบุเป็น **`app.js`**
   - คลิกปุ่ม **Create**

3. **ติดตั้งแพ็กเกจและคอมไพล์ (Build):**
   - ในหน้า Node.js App คลิกปุ่ม **"Run NPM Install"**
   - เปิด **Terminal** ใน cPanel หรือ SSH ไปยังโฟลเดอร์ของแอป แล้วสั่ง:
     ```bash
     npm install
     npm run build
     ```
     *(สำคัญมาก: ขั้นตอนนี้จะสร้างโฟลเดอร์ `dist/` และไฟล์ `dist/server.cjs`)*

4. **ตั้งค่าฐานข้อมูลใน `.env`:**
   - สร้างหรือแก้ไขไฟล์ `.env` ที่โฟลเดอร์หลัก:
     ```env
     DB_HOST=localhost
     DB_PORT=3306
     DB_DATABASE=ชื่อฐานข้อมูล_ของคุณ
     DB_USERNAME=ชื่อผู้ใช้_MySQL
     DB_PASSWORD=รหัสผ่าน_MySQL
     PORT=3000
     NODE_ENV=production
     ```
   - นำเข้าไฟล์ `database.sql` ผ่านเมนู **phpMyAdmin**

5. **คลิกปุ่ม "Restart" บน cPanel**
   - แตะปุ่ม **Restart Application** เพื่อเริ่มระบบใหม่
   - ทดสอบเปิดหน้าเว็บและเข้าสู่ระบบ

---

## 🖥️ วิธีแก้ไขที่ 2: การตั้งค่าบน VPS (Ubuntu / Debian / CentOS กับ Nginx + PM2)

หากคุณใช้งาน Cloud VPS (เช่น DigitalOcean, Linode, AWS, Vultr, หรือ VPS ในไทย):

### 1. ติดตั้ง Node.js 20 และ PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. นำโปรเจกต์ลงเครื่องและ Build
```bash
cd /var/www/edms-app
npm install
npm run build
```

### 3. เริ่มรัน Backend ด้วย PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. ตั้งค่า Nginx Reverse Proxy
แก้ไขไฟล์ `/etc/nginx/sites-available/edms` หรือ `/etc/nginx/conf.d/default.conf`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
จากนั้นสั่งทดสอบและเริ่ม Nginx ใหม่:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🌐 วิธีแก้ไขที่ 3: กรณีไม่มี Node.js บนเซิร์ฟเวอร์ (ต้องการ Build จากเครื่องตนเอง)

หากโฮสต์ของคุณไม่มี Terminal หรือไม่รองรับการสั่งรันคำสั่ง:
1. บนคอมพิวเตอร์ของคุณ ให้เปิดโฟลเดอร์โปรเจกต์ใน Terminal แล้วรัน:
   ```bash
   npm install
   npm run build
   ```
2. อัปโหลดโฟลเดอร์ **`dist/`** พร้อมไฟล์ **`app.js`**, **`.env`**, **`package.json`** และ **`ecosystem.config.cjs`** ขึ้นไปยังโฮสติ้งทั้งหมด
3. ตรวจสอบว่ามีไฟล์ `dist/server.cjs` และ `dist/index.html` อยู่บนโฮสต์แล้ว

---

## 🩺 การทดสอบสถานะเซิร์ฟเวอร์ (Health Check)
คุณสามารถทดสอบว่าเซิร์ฟเวอร์ Backend ทำงานแล้วหรือไม่ โดยเปิด URL:
```text
https://your-domain.com/api/health
```
หากเซิร์ฟเวอร์ทำงานถูกต้อง จะตอบกลับเป็น JSON เช่น:
```json
{
  "status": "ok",
  "app": "EDMS Saraban",
  "version": "2.6.0",
  "database": {
    "status": "connected"
  }
}
```
หากเปิดแล้วพบ **404 Not Found** หรือ **502 Bad Gateway** แสดงว่า Node.js Backend ยังไม่ได้เริ่มทำงาน หรือ Reverse Proxy ยังไม่ได้เชื่อมไปยังพอร์ต 3000 ครับ
