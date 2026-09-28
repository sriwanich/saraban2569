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

---

## 🛠️ กรณีอัปโหลดขึ้นเซิร์ฟเวอร์จริงแล้วข้อมูลไม่แสดง (MySQL Connection Troubleshooting)

หากหน้าจอยานพาหนะ/หน้าตรวจสภาพแจ้งว่า **"ไม่พบข้อมูล"** หรือ **"ไม่สามารถเชื่อมต่อฐานข้อมูลได้"** ทั้งที่มั่นใจว่าใช้ MySQL Server ที่เดียวกัน มีจุดที่ต้องตรวจสอบ 4 ประการดังนี้:

### 1. ไฟล์ `.env` บนเซิร์ฟเวอร์จริงยังไม่ได้สร้าง หรือ กำหนดค่าไม่ครบถ้วน
เมื่ออัปโหลดไฟล์ขึ้นโฮสติ้งจริง ไฟล์ `.env` มักจะ **ไม่ได้ถูกอัปโหลดขึ้นไปด้วย** (เพราะถูกตั้งค่าเป็น Hidden File ในคอมพิวเตอร์ หรือไม่ได้แชร์ผ่าน Git) 
* **วิธีแก้ไข**: ให้สร้างไฟล์ชื่อ `.env` ไว้ที่โฟลเดอร์นอกสุด (Root Directory) ของแอปบนเซิร์ฟเวอร์จริง และใส่ข้อมูลการเชื่อมต่อ MySQL ให้ถูกต้อง:
  ```env
  DB_HOST=127.0.0.1  # หรือใส่เป็น IP/Hostname ของเครื่อง MySQL Server
  DB_PORT=3306
  DB_DATABASE=ชื่อฐานข้อมูล_ปภ_ระยอง
  DB_USERNAME=ชื่อผู้ใช้_MySQL
  DB_PASSWORD=รหัสผ่าน_MySQL
  NODE_ENV=production
  PORT=3000
  ```

### 2. ระบบรักษาความปลอดภัยของ MySQL Server บล็อกการเชื่อมต่อภายนอก (Remote Connections)
หากตัวแอป Node.js รันอยู่บนเซิร์ฟเวอร์ A แต่อยากเชื่อมต่อกับ MySQL Server ที่อยู่บนเซิร์ฟเวอร์ B:
* **ปัญหา**: โดยปกติ MySQL จะถูกบล็อกไม่ให้เชื่อมต่อจากภายนอก (จะรับเฉพาะ `localhost` หรือ `127.0.0.1` เท่านั้น)
* **วิธีแก้ไข**: 
  1. เข้าไปที่ **cPanel / DirectAdmin** ของฝั่ง MySQL Server -> มองหาเมนู **"Remote MySQL"** 
  2. เพิ่ม IP Address ของเครื่องที่รันแอป Node.js (เครื่องเซิร์ฟเวอร์จริง) เพื่ออนุญาต (Allow Access) ให้สิทธิ์เชื่อมต่อเข้ามาได้
  3. ตรวจสอบว่าในไฟล์ `.env` ของแอปได้เปลี่ยน `DB_HOST` จาก `localhost` เป็น **IP ของเครื่อง MySQL Server** แล้วหรือยัง

### 3. โหมดเคร่งครัด (Strict MySQL-Only Mode) และ 503 Database Offline
ระบบยานพาหนะและการตรวจสภาพความเรียบร้อยทำงานภายใต้ **Strict MySQL-Only Mode** 
* หากระบบตรวจสอบพบว่า MySQL ขัดข้องหรือตั้งค่ารหัสผ่านไม่ถูก ตัว API ระบบยานพาหนะจะส่งรหัสผิดพลาด `503 Database offline` ไปยังเบราว์เซอร์ทันที ส่งผลให้หน้าเว็บโหลดข้อมูลค้างหรือไม่แสดงผล
* **วิธีทดสอบ**: เปิดหน้าเว็บในเบราว์เซอร์ -> กดปุ่ม **F12** บนคีย์บอร์ด -> เลือกแท็บ **Network (เครือข่าย)** -> ลองกดรีเฟรชหน้าเว็บ แล้วดูว่า API `/api/vehicles` หรือ `/api/inspections` ส่งรหัส **503** กลับมาหรือไม่ หากส่ง 503 กลับมา แสดงว่ารหัสผ่าน/โฮสต์ใน `.env` ผิดพลาด หรือ MySQL เชื่อมต่อไม่สำเร็จอย่างแน่นอน

### 4. ความเป็นระเบียบของตัวสะกดเล็ก-ใหญ่ (Case-Sensitivity บน Linux)
* ในระบบ Local (Windows) ตัวพิมพ์เล็ก-ใหญ่ของชื่อตารางจะไม่ส่งผลกระทบใดๆ (Case-insensitive)
* แต่ในระบบ Server จริงที่เป็น **Linux** ชื่อตารางทั้งหมดใน MySQL จะเป็น **Case-sensitive** (ตัวพิมพ์เล็กและตัวพิมพ์ใหญ่ถือเป็นคนละตารางกัน!)
* **วิธีแก้ไข**: มั่นใจว่าได้นำเข้าไฟล์ `database.sql` หรือ `disaster_office69.sql` ครบถ้วนแล้ว ซึ่งตัวฐานข้อมูล MySQL จะสร้างตารางยานพาหนะในรูปแบบพิมพ์เล็กทั้งหมด ได้แก่ `vehicles`, `vehicle_inspections`, และ `vehicle_maintenance` ตรงตามที่เขียนไว้ในโค้ดระบบ

---

## 🏢 คู่มือการติดตั้งระบบสารบรรณระดับ Enterprise (Vite + React + PHP 8.x API + PostgreSQL / MariaDB)

ระบบได้รับการปรับปรุงโครงสร้างให้รองรับสถาปัตยกรรมระดับ **Enterprise** ครบวงจร โดยแบ่งสถาปัตยกรรมออกเป็น:
1. **Frontend**: Vite 5 + React 18 + TypeScript + Tailwind CSS (SPA ประสิทธิภาพสูง)
2. **Backend API**: PHP 8.2+ REST API (โฟลเดอร์ `php-api/` รองรับ PSR-4, PDO, JWT, Clean Architecture)
3. **Database Dual-Engine**:
   - **PostgreSQL 14+ / 16+**: สำหรับระบบสารบรรณขนาดใหญ่ระดับกระทรวง/กรม พร้อมรองรับ Transaction สูงและ JSONB (`database_postgresql.sql`)
   - **MariaDB 10.5+ / 11.x**: สำหรับระบบสารบรรณมาตรฐานหน่วยงานราชการ ปภ. และ Shared Hosting (`database_mariadb.sql`)

---

### วิธีที่ 1: ติดตั้งผ่าน Docker Compose (แนะนำ สะดวกที่สุดใน 1 คำสั่ง)

#### กรณีใช้งาน PostgreSQL 16 (Enterprise Standard):
```bash
docker compose -f docker-compose.postgres.yml up -d --build
```
ระบบจะสร้าง Container:
* `saraban_frontend` (Nginx + Vite React SPA บน Port 80/443)
* `saraban_php_api` (PHP 8.2-FPM Enterprise REST API)
* `saraban_postgres` (PostgreSQL 16 พร้อมนำเข้า `database_postgresql.sql` อัตโนมัติ)

#### กรณีใช้งาน MariaDB 11:
```bash
docker compose -f docker-compose.mariadb.yml up -d --build
```

---

### วิธีที่ 2: ติดตั้งบน Nginx + PHP-FPM + PostgreSQL / MariaDB (Linux Server)

1. **คอมไพล์ Frontend (React + Vite):**
   ```bash
   npm install
   npm run build
   ```
   นำโฟลเดอร์ `dist/` ไปไว้ที่ `/var/www/saraban/frontend`

2. **นำเข้าโครงสร้างฐานข้อมูล:**
   - สำหรับ PostgreSQL:
     ```bash
     sudo -u postgres psql -d saraban_enterprise -f database_postgresql.sql
     ```
   - สำหรับ MariaDB / MySQL:
     ```bash
     mysql -u saraban_user -p saraban_enterprise < database_mariadb.sql
     ```

3. **วางโค้ด PHP API:**
   นำโฟลเดอร์ `php-api/` ไปวางที่ `/var/www/saraban/api`

4. **กำหนดค่า `.env` ใน `php-api/`:**
   ```env
   # สำหรับ PostgreSQL:
   DB_DRIVER=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=saraban_enterprise
   DB_USERNAME=postgres
   DB_PASSWORD=รหัสผ่าน_Postgres

   # สำหรับ MariaDB:
   # DB_DRIVER=mysql
   # DB_HOST=127.0.0.1
   # DB_PORT=3306
   # DB_DATABASE=saraban_enterprise
   # DB_USERNAME=saraban_user
   # DB_PASSWORD=รหัสผ่าน_MariaDB
   ```

5. **ตั้งค่า Nginx Server Block:**
   ใช้การตั้งค่าตามไฟล์ `nginx.enterprise.conf` ที่ระบบสร้างไว้ให้ เพื่อส่งต่อเส้นทาง `/api/` ไปยัง PHP-FPM และส่งหน้าเว็บทั่วไปไปยัง `dist/index.html`

---

### วิธีที่ 3: ติดตั้งบน Apache Web Server (Shared Hosting / cPanel พร้อม PHP + MariaDB หรือ PostgreSQL)

1. นำโฟลเดอร์ `dist/` ของหน้าเว็บ Vite React ไปวางไว้ที่ root (`public_html`)
2. นำโฟลเดอร์ `php-api/` ไปวางไว้ที่ `public_html/api/` หรือ `public_html/php-api/`
3. ไฟล์ `php-api/.htaccess` จะทำหน้าที่แปลง URL ของ REST API ให้โดยอัตโนมัติ
4. สร้างฐานข้อมูลใน phpMyAdmin (MariaDB) หรือ phpPgAdmin (PostgreSQL) แล้ว Import ไฟล์ `database_mariadb.sql` หรือ `database_postgresql.sql`
5. ทดสอบ API Status ที่: `https://your-domain.com/api/enterprise/status`


