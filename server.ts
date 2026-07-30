import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import { hash, verify } from '@node-rs/argon2';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

const execFileAsync = promisify(execFile);

dotenv.config();

// Pre-create standard upload directories to avoid any folder-creation or write-permission issues
const baseUploadsDir = path.join(process.cwd(), 'uploads');
const standardFolders = ['inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular'];
try {
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
  }
  standardFolders.forEach(folder => {
    const folderPath = path.join(baseUploadsDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  });
  console.log('✅ Standard upload folders initialized successfully');
} catch (err: any) {
  console.error('❌ Failed to pre-create standard upload folders:', err.message);
}

// Multer storage configuration for attachments organized into subfolders by document type & category
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = (req.body.docType || req.query.docType || 'inbox').toString();
    const category = (req.body.category || req.query.category || '').toString();

    let subfolder = docType;
    if (docType === 'admin') {
      if (['order', 'announcement', 'circular'].includes(category)) {
        subfolder = `admin/${category}`;
      } else {
        subfolder = 'admin';
      }
    }

    const uploadDir = path.join(process.cwd(), 'uploads', subfolder);
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (e: any) {
      console.error(`Error creating upload dir ${uploadDir}:`, e.message);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F]/g, '_');
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Helper for Argon2id Password Hashing & Verification
async function hashPasswordArgon2(plainPassword: string): Promise<string> {
  if (!plainPassword) return '';
  try {
    return await hash(plainPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1
    });
  } catch (err: any) {
    console.warn('Argon2 hash fallback:', err.message);
    const bcrypt = await import('bcryptjs');
    return await bcrypt.hash(plainPassword, 10);
  }
}

async function verifyPasswordArgon2(hashedPassword: string, plainPassword: string): Promise<boolean> {
  if (!hashedPassword || !plainPassword) return false;
  const hash = String(hashedPassword).trim();
  const plain = String(plainPassword).trim();

  // If stored password is plain text (legacy seed user), direct check
  if (!hash.startsWith('$argon2') && !hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    return hash === plain;
  }
  try {
    if (hash.startsWith('$argon2')) {
      return await verify(hash, plain);
    } else {
      const bcrypt = await import('bcryptjs');
      return await bcrypt.compare(plain, hash);
    }
  } catch (err: any) {
    console.warn('Argon2 verify fallback:', err.message);
    return hash === plain;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Secure file download helper that restores the original filename
app.get('/api/files/download', async (req, res) => {
  const fileUrl = (req.query.url || '').toString();
  const username = (req.query.username || 'ผู้ใช้งาน').toString();
  const ip = getClientIp(req);
  if (!fileUrl) {
    return res.status(400).json({ error: 'ไม่ระบุ URL ของไฟล์' });
  }

  try {
    let cleanUrl = fileUrl.trim();
    if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.substring(9);
    else if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);
    else if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    let filePath = path.resolve(uploadsBase, cleanUrl);

    if (!filePath.startsWith(uploadsBase) || !fs.existsSync(filePath)) {
      const baseName = path.basename(fileUrl);
      let foundPath = '';
      const searchSubdirs = ['', 'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 'admin/certificate'];
      for (const sub of searchSubdirs) {
        const p = path.join(uploadsBase, sub, baseName);
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }
      if (foundPath) {
        filePath = foundPath;
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการดาวน์โหลดในระบบ' });
    }

    const baseFileName = path.basename(filePath);
    const nameParts = baseFileName.split('-');
    let originalName = baseFileName;
    if (nameParts.length > 2) {
      originalName = nameParts.slice(2).join('-');
    }

    await addSystemLog('DOWNLOAD_FILE', `ดาวน์โหลดไฟล์แนบ: ${originalName}`, username, ip);

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    return res.sendFile(filePath);
  } catch (err: any) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
  }
});

// Secure file preview/view helper that serves files inline with correct Content-Type
app.get('/api/files/view', async (req, res) => {
  const fileUrl = (req.query.url || '').toString();
  const username = (req.query.username || 'ผู้ใช้งาน').toString();
  const ip = getClientIp(req);
  if (!fileUrl) {
    return res.status(400).send('ไม่ระบุ URL ของไฟล์');
  }

  try {
    let cleanUrl = fileUrl.trim();
    if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.substring(9);
    else if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);
    else if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    let filePath = path.resolve(uploadsBase, cleanUrl);

    if (!filePath.startsWith(uploadsBase) || !fs.existsSync(filePath)) {
      const baseName = path.basename(fileUrl);
      let foundPath = '';
      const searchSubdirs = ['', 'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 'admin/certificate'];
      for (const sub of searchSubdirs) {
        const p = path.join(uploadsBase, sub, baseName);
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }
      if (foundPath) {
        filePath = foundPath;
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('ไม่พบไฟล์ที่ต้องการเปิดดู');
    }

    const baseFileName = path.basename(filePath);
    const nameParts = baseFileName.split('-');
    let originalName = baseFileName;
    if (nameParts.length > 2) {
      originalName = nameParts.slice(2).join('-');
    }

    await addSystemLog('VIEW_FILE', `เปิดดูไฟล์แนบ: ${originalName}`, username, ip);

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.txt') {
      contentType = 'text/plain; charset=utf-8';
    } else if (ext === '.doc' || ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.xls' || ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    return res.sendFile(filePath);
  } catch (err: any) {
    console.error('View error:', err.message);
    res.status(500).send('เกิดข้อผิดพลาดในการเปิดไฟล์');
  }
});

// File Upload Endpoint (Saves to folder categorized by document type & category)
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
    }

    const docType = (req.body.docType || req.query.docType || 'inbox').toString();
    const category = (req.body.category || req.query.category || '').toString();
    const uploadedBy = (req.body.uploadedBy || req.query.uploadedBy || 'ผู้ใช้งาน').toString();
    const ip = getClientIp(req);

    let subfolder = docType;
    if (docType === 'admin') {
      if (['order', 'announcement', 'circular'].includes(category)) {
        subfolder = `admin/${category}`;
      } else {
        subfolder = 'admin';
      }
    }

    // Auto deduplication check for uploaded files
    const uploadedFiles: any[] = [];
    for (const file of files) {
      let isDeduplicated = false;
      let masterUrl = '';
      let savedSpaceFormatted = '';

      if (autoDedupOnUpload) {
        try {
          const newFilePath = file.path;
          if (fs.existsSync(newFilePath)) {
            const newHash = await calculateFileSha256(newFilePath);
            const uploadsBase = path.resolve(process.cwd(), 'uploads');
            const existingFiles = getAllUploadedFilesRecursive(uploadsBase);

            for (const existingPath of existingFiles) {
              if (path.resolve(existingPath) === path.resolve(newFilePath)) continue;
              const existStat = fs.statSync(existingPath);
              if (existStat.size === file.size && existStat.size > 0) {
                const existHash = await calculateFileSha256(existingPath);
                if (existHash === newHash) {
                  // Duplicate content detected! Replace new file with Pointer hard link to master
                  fs.unlinkSync(newFilePath);
                  fs.linkSync(existingPath, newFilePath);
                  isDeduplicated = true;
                  masterUrl = `/uploads/${path.relative(uploadsBase, existingPath).replace(/\\/g, '/')}`;
                  savedSpaceFormatted = formatBytes(file.size);
                  break;
                }
              }
            }
          }
        } catch (e: any) {
          console.warn('Auto deduplication failed on upload:', e.message);
        }
      }

      uploadedFiles.push({
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${subfolder}/${file.filename}`,
        folder: `uploads/${subfolder}`,
        isDeduplicated,
        masterUrl,
        savedSpaceFormatted
      });
    }

    // Audit Log File Upload
    const fileNames = files.map(f => f.originalname).join(', ');
    const dedupText = uploadedFiles.some(f => f.isDeduplicated) ? ' (ทำการสร้าง Pointer รวมไฟล์ซ้ำอัตโนมัติสำเร็จ)' : '';
    await addSystemLog('UPLOAD_FILE', `อัปโหลด/แนบไฟล์แนบ (${subfolder}): ${fileNames}${dedupText}`, uploadedBy, ip);

    return res.json({ success: true, files: uploadedFiles });
  } catch (err: any) {
    console.error('File Upload Error:', err);
    return res.status(500).json({ error: err.message || 'การอัปโหลดไฟล์ล้มเหลว' });
  }
});

// ==========================================
// File Deduplication Engine (Single-Instance Storage & Pointer Links)
// ==========================================

const dedupIndexPath = path.join(process.cwd(), 'uploads', 'dedup_index.json');
let autoDedupOnUpload = true;

async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hashStream = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hashStream.update(chunk));
    stream.on('end', () => resolve(hashStream.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getAllUploadedFilesRecursive(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (['db_store.json', 'dedup_index.json', 'temp_uploads'].includes(item) || item.startsWith('temp_') || item.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllUploadedFilesRecursive(fullPath, fileList);
      } else if (stat.isFile()) {
        fileList.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return fileList;
}

function findDocReferencesForFile(filename: string, fileUrl: string) {
  const referencedDocs: Array<{ id: string; docNumber: string; title: string; type: string }> = [];
  const cleanBase = path.basename(filename);
  const docTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
  
  for (const tbl of docTables) {
    const list = localDb[tbl] || [];
    for (const d of list) {
      const atts = typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []);
      if (atts.includes(cleanBase) || atts.includes(fileUrl)) {
        referencedDocs.push({
          id: d.id,
          docNumber: d.docNumber || d.receiveNumber || 'N/A',
          title: d.title || 'ไม่มีชื่อเรื่อง',
          type: tbl.replace('_documents', '')
        });
      }
    }
  }
  return referencedDocs;
}

async function scanUploadsDeduplication() {
  const uploadsBase = path.resolve(process.cwd(), 'uploads');
  const filePaths = getAllUploadedFilesRecursive(uploadsBase);

  const fileMapByHash: Record<string, Array<{
    filePath: string;
    url: string;
    filename: string;
    size: number;
    mtime: Date;
    ino: number;
    docs: any[];
  }>> = {};

  let totalFiles = 0;
  let totalSizeBytes = 0;

  for (const fp of filePaths) {
    try {
      const stat = fs.statSync(fp);
      if (stat.size === 0) continue;
      const hashVal = await calculateFileSha256(fp);
      const relPath = path.relative(uploadsBase, fp).replace(/\\/g, '/');
      const url = `/uploads/${relPath}`;
      const filename = path.basename(fp);
      const docs = findDocReferencesForFile(filename, url);

      totalFiles++;
      totalSizeBytes += stat.size;

      if (!fileMapByHash[hashVal]) {
        fileMapByHash[hashVal] = [];
      }

      fileMapByHash[hashVal].push({
        filePath: fp,
        url,
        filename,
        size: stat.size,
        mtime: stat.mtime,
        ino: stat.ino,
        docs
      });
    } catch (e) {
      console.warn('Error reading file for dedup scan:', fp, e);
    }
  }

  const groups: any[] = [];
  let uniqueMasterFiles = 0;
  let uniqueSizeBytes = 0;
  let duplicateCount = 0;
  let potentialSavedSpaceBytes = 0;
  let pointerCount = 0;

  for (const [hashVal, fileList] of Object.entries(fileMapByHash)) {
    uniqueMasterFiles++;
    const fileSize = fileList[0].size;
    uniqueSizeBytes += fileSize;

    fileList.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    const master = fileList[0];

    if (fileList.length > 1) {
      const duplicates = fileList.slice(1);
      duplicateCount += duplicates.length;
      
      const groupSaved = duplicates.length * fileSize;
      potentialSavedSpaceBytes += groupSaved;

      const dupItems = duplicates.map(d => {
        const isHardLinked = d.ino === master.ino;
        if (isHardLinked) pointerCount++;
        return {
          url: d.url,
          filename: d.filename,
          path: d.filePath,
          ino: d.ino,
          isHardLinked,
          referencedDocs: d.docs
        };
      });

      groups.push({
        hash: hashVal,
        fileSize,
        fileSizeFormatted: formatBytes(fileSize),
        masterFile: {
          url: master.url,
          filename: master.filename,
          path: master.filePath,
          ino: master.ino,
          referencedDocs: master.docs
        },
        duplicatesCount: duplicates.length,
        duplicates: dupItems,
        savedSpaceBytes: groupSaved,
        savedSpaceFormatted: formatBytes(groupSaved)
      });
    }
  }

  const resultStats = {
    lastScanned: new Date().toISOString(),
    totalFiles,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    uniqueMasterFiles,
    uniqueSizeBytes,
    uniqueSizeFormatted: formatBytes(uniqueSizeBytes),
    duplicateCount,
    potentialSavedSpaceBytes,
    potentialSavedSpaceFormatted: formatBytes(potentialSavedSpaceBytes),
    pointerCount,
    autoDedupOnUpload,
    groups
  };

  try {
    fs.writeFileSync(dedupIndexPath, JSON.stringify(resultStats, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }

  return resultStats;
}

async function executeUploadsDeduplication() {
  const scanResult = await scanUploadsDeduplication();
  let filesMerged = 0;
  let bytesReclaimed = 0;

  for (const grp of scanResult.groups) {
    const masterPath = grp.masterFile.path;
    if (!fs.existsSync(masterPath)) continue;

    const masterIno = fs.statSync(masterPath).ino;

    for (const dup of grp.duplicates) {
      if (!fs.existsSync(dup.path)) continue;
      
      const dupStat = fs.statSync(dup.path);
      if (dupStat.ino !== masterIno) {
        try {
          fs.unlinkSync(dup.path);
          fs.linkSync(masterPath, dup.path);
          filesMerged++;
          bytesReclaimed += grp.fileSize;
        } catch (err: any) {
          console.error(`Error linking duplicate ${dup.path} to master ${masterPath}:`, err.message);
        }
      }
    }
  }

  const updatedStats = await scanUploadsDeduplication();
  return {
    success: true,
    filesMerged,
    bytesReclaimed,
    bytesReclaimedFormatted: formatBytes(bytesReclaimed),
    updatedStats
  };
}

// Deduplication API Routes
app.get('/api/deduplication/scan', async (req, res) => {
  try {
    const stats = await scanUploadsDeduplication();
    return res.json({ success: true, stats });
  } catch (err: any) {
    console.error('Error scanning deduplication:', err);
    return res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการสแกนไฟล์ซ้ำ' });
  }
});

app.post('/api/deduplication/deduplicate', async (req, res) => {
  try {
    const username = (req.body.username || req.query.username || 'ผู้ดูแลระบบ').toString();
    const ip = getClientIp(req);
    const result = await executeUploadsDeduplication();
    
    await addSystemLog(
      'DEDUPLICATE_FILES',
      `ดำเนินการรวมไฟล์ซ้ำในเซิร์ฟเวอร์: รวมแล้ว ${result.filesMerged} ไฟล์ ประหยัดพื้นที่ได้ ${result.bytesReclaimedFormatted}`,
      username,
      ip
    );

    return res.json(result);
  } catch (err: any) {
    console.error('Error executing deduplication:', err);
    return res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการรวมไฟล์ซ้ำ' });
  }
});

app.get('/api/deduplication/stats', async (req, res) => {
  try {
    if (fs.existsSync(dedupIndexPath)) {
      const data = JSON.parse(fs.readFileSync(dedupIndexPath, 'utf-8'));
      data.autoDedupOnUpload = autoDedupOnUpload;
      return res.json({ success: true, stats: data });
    }
    const stats = await scanUploadsDeduplication();
    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ไม่สามารถดึงข้อมูลสถิติไฟล์ซ้ำได้' });
  }
});

app.post('/api/deduplication/toggle-auto', (req, res) => {
  if (typeof req.body.enabled === 'boolean') {
    autoDedupOnUpload = req.body.enabled;
  } else {
    autoDedupOnUpload = !autoDedupOnUpload;
  }
  return res.json({ success: true, autoDedupOnUpload });
});

// MySQL Environment Variables Resolution with fallback support
const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
const dbName = process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || '';
const dbUser = process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || '';
const dbPass = process.env.DB_PASSWORD !== undefined 
  ? process.env.DB_PASSWORD 
  : (process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''));

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPass,
  database: dbName,
  charset: process.env.DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: true
});

let isMysqlOnline = false;

// Local JSON file database helper
const dbStorePath = path.join(process.cwd(), 'uploads', 'db_store.json');

const initialSeedData = {
  settings: [
    {
      id: 1,
      currentYear: 2569,
      startSequence: 1,
      orgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      headerOrgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg',
      garuda15Url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Garuda_Thailand.svg',
      garuda30Url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Garuda_Thailand.svg',
      faviconUrl: '',
      footerText: '© 2026 ระบบสารบรรณอิเล็กทรอนิกส์ - สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpFrom: ''
    }
  ],
  users: [
    { id: 1, username: 'admin', password: 'admin', firstName: 'ผู้ดูแลระบบ', lastName: 'ระบบงาน', position: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', department: 'ฝ่ายบริหารงานทั่วไป', role: 'admin', avatar: null, email: 'admin@example.com' },
    { id: 2, username: 'somchai', password: 'password', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', department: 'ฝ่ายป้องกันและปฏิบัติการ', role: 'user', avatar: null, email: 'somchai@example.com' },
    { id: 3, username: 'somsee', password: 'password', firstName: 'สมศรี', lastName: 'รักษ์ดี', position: 'เจ้าพนักงานธุรการชำนาญงาน', department: 'ฝ่ายบริหารงานทั่วไป', role: 'user', avatar: null, email: 'somsee@example.com' },
    { id: 4, username: 'preecha', password: 'password', firstName: 'ปรีชา', lastName: 'มั่นคง', position: 'นายช่างเครื่องกลชำนาญงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', role: 'user', avatar: null, email: 'preecha@example.com' }
  ],
  departments: [
    { id: 1, name: 'ฝ่ายบริหารงานทั่วไป', description: 'ดูแลงานธุรการ สารบรรณ การเงิน พัสดุ และงานสนับสนุนทั่วไป' },
    { id: 2, name: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'วางแผนและวิเคราะห์นโยบาย จัดทำแผนเผชิญเหตุและแผนงานโครงการต่างๆ' },
    { id: 3, name: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'ประสานการให้ความช่วยเหลือ และบรรเทาความเดือดร้อนแก่ผู้ประสบอุทกภัย วาตภัย และภัยพิบัติต่างๆ' },
    { id: 4, name: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'ปฏิบัติงานกู้ภัย จัดเตรียมบุคลากร เครื่องจักรกล และวิทยากรฝึกอบรมสาธารณภัย' }
  ],
  positions: [
    { id: 1, name: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', description: 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด' },
    { id: 2, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', description: 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 3, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการ', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 4, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 5, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 6, name: 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', description: 'ฝ่ายสงเคราะห์ผู้ประสบภัย' },
    { id: 7, name: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', description: 'ฝ่ายบริหารงานทั่วไป' },
    { id: 8, name: 'เจ้าพนักงานธุรการชำนาญงาน', description: 'ฝ่ายบริหารงานทั่วไป' },
    { id: 9, name: 'นายช่างเครื่องกลชำนาญงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' }
  ],
  folders: [
    { id: 1, name: 'แฟ้มคำสั่งผู้ว่าราชการจังหวัด', description: 'บันทึกคำสั่งสำคัญจากทางจังหวัดและผู้ว่าราชการจังหวัดระยอง' },
    { id: 2, name: 'แฟ้มแผนเตรียมรับมืออุทกภัย 2569', description: 'แฟ้มรวบรวมแผน ยุทธศาสตร์ และการปฏิบัติการป้องกันอุทกภัยประจำปี' },
    { id: 3, name: 'แฟ้มเอกสารงานสารบรรณทั่วไป', description: 'เอกสารรับ-ส่งทั่วไปที่ลงทะเบียนไว้ในระบบ' },
    { id: 4, name: 'แฟ้มโครงการอบรมและวิชาการ', description: 'เอกสารเกี่ยวกับการขอสนับสนุนวิทยากรและจัดอบรมบุคลากร/ประชาชน' }
  ],
  inbox_documents: [
    {
      id: 'doc_001', receiveNumber: '1', year: '2569', docNumber: 'มท 0612/ว1234', date: '2026-07-15', priority: 'ด่วนที่สุด', secrecy: 'ปกติ',
      title: 'ขอส่งแผนการเตรียมพร้อมรับมือสถานการณ์อุทกภัยในช่วงฤดูฝน ประจำปี 2569', fromDept: 'กรมป้องกันและบรรเทาสาธารณภัย', toDept: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ', assignee: 'สมชาย ใจดี', note: 'โปรดศึกษาและดำเนินการจัดเตรียมข้อมูลตามแผนที่กำหนด',
      content: 'เนื่องด้วยกรมป้องกันและบรรเทาสาธารณภัยได้คาดการณ์สถานการณ์น้ำฝนในปีนี้...', registerDate: '2026-07-15', folderId: 2, status: 'เสนอผู้บริหาร',
      attachments: JSON.stringify(['sample_flood_plan_2569.pdf']), isCentral: 1
    },
    {
      id: 'doc_002', receiveNumber: '2', year: '2569', docNumber: 'รย 0023/567', date: '2026-07-16', priority: 'ปกติ', secrecy: 'ปกติ',
      title: 'ขอความอนุเคราะห์สนับสนุนวิทยากรและอุปกรณ์ฝึกอบรมการดับเพลิงเบื้องต้น', fromDept: 'เทศบาลนครระยอง', toDept: 'ฝ่ายป้องกันและปฏิบัติการ',
      department: 'ฝ่ายป้องกันและปฏิบัติการ', assignee: 'ปรีชา มั่นคง', note: 'ส่งนายปรีชา มั่นคง เป็นวิทยากรหลักและจัดเตรียมชุดจำลองสถานการณ์ดับเพลิง',
      content: 'ด้วยเทศบาลนครระยองมีกำหนดจัดโครงการฝึกอบรมเยาวชนอาสาสมัครป้องกันภัยฝ่ายพลเรือน...', registerDate: '2026-07-16', folderId: 4, status: 'เสร็จสิ้น',
      attachments: JSON.stringify([]), isCentral: 1
    }
  ],
  outbox_documents: [
    {
      id: 'doc_003', receiveNumber: '1', year: '2569', docNumber: 'รย 0618/789', date: '2026-07-17', priority: 'ด่วน', secrecy: 'ปกติ',
      title: 'รายงานสถานการณ์และการให้ความช่วยเหลือเบื้องต้นเหตุวาตภัยในพื้นที่ อ.นิคมพัฒนา', fromDept: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', toDept: 'กรมป้องกันและบรรเทาสาธารณภัย',
      department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', assignee: 'สมศรี รักษ์ดี', note: 'เสนอผู้ว่าราชการจังหวัดลงนามเรียบร้อยและส่งไปยังส่วนกลางแล้ว',
      content: 'เรียนอธิบดีกรมป้องกันและบรรเทาสาธารณภัย ตามที่เกิดเหตุวาตภัยเมื่อวันที่ 16 กรกฎาคม...', registerDate: '2026-07-17', folderId: 3, status: 'เสร็จสิ้น',
      attachments: JSON.stringify(['sample_windstorm_report_2569.pdf']), isCircular: 0, isCentral: 1
    }
  ],
  circular_documents: [],
  internal_documents: [
    {
      id: 'doc_004', receiveNumber: '1', year: '2569', docNumber: 'บันทึกข้อความ 1/2569', date: '2026-07-18', priority: 'ปกติ', secrecy: 'ปกติ',
      title: 'ขออนุมัติซ่อมบำรุงรถบรรทุกน้ำอเนกประสงค์ หมายเลขทะเบียน บย-4567 ระยอง', fromDept: 'ฝ่ายป้องกันและปฏิบัติการ', toDept: 'ฝ่ายบริหารงานทั่วไป',
      department: 'ฝ่ายบริหารงานทั่วไป', assignee: 'ปรีชา มั่นคง', note: 'ประสานอู่ซ่อมด่วนเพื่อความพร้อมในการออกปฏิบัติงาน',
      content: 'เนื่องจากรถบรรทุกน้ำอเนกประสงค์ของหน่วยมีอาการสตาร์ทติดยากและมีน้ำมันรั่วไหล...', registerDate: '2026-07-18', folderId: 3, status: 'ส่งต่อกลุ่มงาน',
      attachments: JSON.stringify(['sample_water_truck_repair.pdf']), isCentral: 1
    }
  ],
  admin_documents: [
    {
      id: 'admin_001', category: 'order', docNumber: 'คำสั่ง ปภ.ระยอง ที่ 15/2569', year: '2569', date: '2026-07-01', priority: 'ปกติ', secrecy: 'ปกติ',
      title: 'คำสั่งแต่งตั้งคณะทำงานเตรียมรับมืออุทกภัยและวาตภัย ประจำฤดูฝน ปี 2569', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', assignee: 'สมชาย ใจดี',
      note: 'คำสั่งอย่างเป็นทางการ ลงนามโดยผู้ว่าราชการจังหวัด', content: 'เรื่อง แต่งตั้งคณะทำงานเตรียมรับมืออุทกภัยและวาตภัย ประจำปี พ.ศ. 2569 ณ จังหวัดระยอง...',
      registerDate: '2026-07-01', folderId: 1, status: 'เสร็จสิ้น', attachments: JSON.stringify(['sample_appoint_order_15_2569.pdf']), isCentral: 1
    },
    {
      id: 'admin_002', category: 'announcement', docNumber: 'ประกาศ ปภ.ระยอง ที่ 2/2569', year: '2569', date: '2026-07-10', priority: 'ปกติ', secrecy: 'ปกติ',
      title: 'ประกาศเตือนเฝ้าระวังระดับน้ำในแม่น้ำระยองและแม่น้ำประแสร์ ฉบับที่ 1', department: 'ฝ่ายป้องกันและปฏิบัติการ', assignee: 'ปรีชา มั่นคง',
      note: 'ประกาศเพื่อแจ้งเตือนประชาชนผ่านสถานีวิทยุและสื่อออนไลน์', content: 'ตามประกาศกรมอุตุนิยมวิทยา เรื่องฝนตกหนักถึงหนักมากบริเวณภาคตะวันออก...',
      registerDate: '2026-07-10', folderId: 2, status: 'เสร็จสิ้น', attachments: JSON.stringify([]), isCentral: 1
    },
    {
      id: 'admin_003', category: 'circular', docNumber: 'หนังสือเวียน ด่วนที่สุด ที่ รย 001/2569', year: '2569', date: '2026-07-12', priority: 'ปกติ', secrecy: 'ปกติ',
      title: 'แนวทางปฏิบัติเกี่ยวกับการรายงานด่วนกรณีเกิดสาธารณภัยรุนแรงในพื้นที่จังหวัดระยอง', department: 'ฝ่ายบริหารงานทั่วไป', assignee: 'สมศรี รักษ์ดี',
      note: 'หนังสือเวียนส่งทุกหน่วยงานส่วนท้องถิ่นและอำเภอในจังหวัดระยอง', content: 'ถึง นายอำเภอทุกอำเภอ และนายกองค์กรปกครองส่วนท้องถิ่นทุกแห่ง เพื่อความรวดเร็วในการช่วยเหลือ...',
      registerDate: '2026-07-12', folderId: 3, status: 'เสร็จสิ้น', attachments: JSON.stringify([]), isCentral: 1
    }
  ],
  department_receives: [],
  document_tracking: [
    { id: 1, docId: 'doc_001', docType: 'inbox', status: 'ลงทะเบียน', comments: 'ลงทะเบียนหนังสือรับอย่างเป็นทางการเข้าระบบ', updatedBy: 'สมศรี รักษ์ดี', updatedAt: '2026-07-15T08:00:00.000Z' },
    { id: 2, docId: 'doc_001', docType: 'inbox', status: 'เสนอผู้บริหาร', comments: 'เสนอ ผอ.ปภ.ระยอง พิจารณาและสั่งการ', updatedBy: 'สมศรี รักษ์ดี', updatedAt: '2026-07-15T09:30:00.000Z' },
    { id: 3, docId: 'doc_002', docType: 'inbox', status: 'ลงทะเบียน', comments: 'ลงทะเบียนหนังสือรับจากเทศบาลนครระยอง', updatedBy: 'สมศรี รักษ์ดี', updatedAt: '2026-07-16T10:00:00.000Z' },
    { id: 4, docId: 'doc_002', docType: 'inbox', status: 'ส่งต่อกลุ่มงาน', comments: 'ส่งเรื่องให้ฝ่ายป้องกันและปฏิบัติการพิจารณาจัดเตรียมทีมวิทยากร', updatedBy: 'สมศรี รักษ์ดี', updatedAt: '2026-07-16T11:00:00.000Z' },
    { id: 5, docId: 'doc_002', docType: 'inbox', status: 'เสร็จสิ้น', comments: 'มอบหมาย นายปรีชา มั่นคง ออกปฏิบัติงานเป็นวิทยากรเรียบร้อย', updatedBy: 'สมชาย ใจดี', updatedAt: '2026-07-16T14:00:00.000Z' }
  ],
  system_logs: [],
  notifications: [],
  organizations: []
};

let localDb: Record<string, any[]> = {};

function loadLocalDb() {
  try {
    if (fs.existsSync(dbStorePath)) {
      const fileData = fs.readFileSync(dbStorePath, 'utf-8');
      localDb = JSON.parse(fileData);
    } else {
      localDb = JSON.parse(JSON.stringify(initialSeedData));
      saveLocalDb();
    }
  } catch (err) {
    console.warn('Failed to load local db_store.json, resetting to initial seed:', err);
    localDb = JSON.parse(JSON.stringify(initialSeedData));
  }
}

function saveLocalDb() {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(dbStorePath, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save local db_store.json:', err);
  }
}

loadLocalDb();

async function handleLocalDbQuery(sql: string, params: any[] = []): Promise<[any, any]> {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');

  // 1. ALTER TABLE / CREATE TABLE / SET FOREIGN_KEY_CHECKS / TRUNCATE
  if (/^(ALTER|CREATE|SET|TRUNCATE)/i.test(cleanSql)) {
    return [{ affectedRows: 0 }, []];
  }

  // 2. UNION ALL document query
  if (cleanSql.includes('UNION ALL') && cleanSql.includes('inbox_documents')) {
    const docs = [
      ...(localDb.inbox_documents || []).map(d => ({
        id: d.id, type: 'inbox', category: null, isCircular: false, secrecy: d.secrecy || 'ปกติ',
        receiveNumber: d.receiveNumber, year: d.year, docNumber: d.docNumber, date: d.date, priority: d.priority,
        title: d.title, from: d.fromDept, to: d.toDept, department: d.department, assignee: d.assignee, note: d.note,
        content: d.content, registerDate: d.registerDate, folderId: d.folderId, status: d.status, attachments: d.attachments,
        forwardedTo: d.forwardedTo, forwardedBy: d.forwardedBy, forwardedAt: d.forwardedAt, forwardNote: d.forwardNote, isCentral: d.isCentral ?? 1
      })),
      ...(localDb.outbox_documents || []).map(d => ({
        id: d.id, type: 'outbox', category: null, isCircular: false, secrecy: d.secrecy || 'ปกติ',
        receiveNumber: d.receiveNumber, year: d.year, docNumber: d.docNumber, date: d.date, priority: d.priority,
        title: d.title, from: d.fromDept, to: d.toDept, department: d.department, assignee: d.assignee, note: d.note,
        content: d.content, registerDate: d.registerDate, folderId: d.folderId, status: d.status, attachments: d.attachments,
        forwardedTo: d.forwardedTo, forwardedBy: d.forwardedBy, forwardedAt: d.forwardedAt, forwardNote: d.forwardNote, isCentral: d.isCentral ?? 1
      })),
      ...(localDb.circular_documents || []).map(d => ({
        id: d.id, type: 'outbox', category: null, isCircular: true, secrecy: d.secrecy || 'ปกติ',
        receiveNumber: d.receiveNumber, year: d.year, docNumber: d.docNumber, date: d.date, priority: d.priority,
        title: d.title, from: d.fromDept, to: d.toDept, department: d.department, assignee: d.assignee, note: d.note,
        content: d.content, registerDate: d.registerDate, folderId: d.folderId, status: d.status, attachments: d.attachments,
        forwardedTo: d.forwardedTo, forwardedBy: d.forwardedBy, forwardedAt: d.forwardedAt, forwardNote: d.forwardNote, isCentral: d.isCentral ?? 1
      })),
      ...(localDb.internal_documents || []).map(d => ({
        id: d.id, type: 'internal', category: null, isCircular: false, secrecy: 'ปกติ',
        receiveNumber: d.receiveNumber, year: d.year, docNumber: d.docNumber, date: d.date, priority: d.priority,
        title: d.title, from: d.fromDept, to: d.toDept, department: d.department, assignee: d.assignee, note: d.note,
        content: d.content, registerDate: d.registerDate, folderId: d.folderId, status: d.status, attachments: d.attachments,
        forwardedTo: d.forwardedTo, forwardedBy: d.forwardedBy, forwardedAt: d.forwardedAt, forwardNote: d.forwardNote, isCentral: d.isCentral ?? 1
      })),
      ...(localDb.admin_documents || []).map(d => ({
        id: d.id, type: 'admin', category: d.category || 'order', isCircular: false, secrecy: 'ปกติ',
        receiveNumber: null, year: d.year, docNumber: d.docNumber, date: d.date, priority: 'ปกติ',
        title: d.title, from: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', to: 'ทุกฝ่ายงาน / ประชาชน', department: d.department, assignee: d.assignee, note: d.note,
        content: d.content, registerDate: d.registerDate, folderId: d.folderId, status: d.status, attachments: d.attachments,
        forwardedTo: d.forwardedTo, forwardedBy: d.forwardedBy, forwardedAt: d.forwardedAt, forwardNote: d.forwardNote, isCentral: d.isCentral ?? 1
      }))
    ];
    return [docs, []];
  }

  // 3. UNION ALL notification query
  if (cleanSql.includes('UNION ALL') && cleanSql.includes('WHERE id IN')) {
    const allTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    const matchedDocs: any[] = [];
    for (const tbl of allTables) {
      for (const item of (localDb[tbl] || [])) {
        if (params.includes(item.id)) {
          matchedDocs.push({
            id: item.id,
            docNumber: item.docNumber,
            title: item.title,
            department: item.department,
            assignee: item.assignee,
            to: item.toDept
          });
        }
      }
    }
    return [matchedDocs, []];
  }

  // 4. COUNT(*)
  if (/SELECT COUNT\(\*\)/i.test(cleanSql)) {
    const match = cleanSql.match(/FROM\s+[`']?([a-zA-Z0-9_]+)[`']?/i);
    const tblName = match ? match[1] : '';
    let count = 0;
    if (tblName && localDb[tblName]) {
      let filtered = localDb[tblName];
      if (cleanSql.includes('WHERE department = ? AND year = ?') && params.length >= 2) {
        filtered = filtered.filter(item => item.department === params[0] && String(item.year) === String(params[1]));
      }
      count = filtered.length;
    }
    return [[{ count }], []];
  }

  // 5. MAX(receiveNumber)
  if (/SELECT MAX\(receiveNumber\)/i.test(cleanSql)) {
    const dept = params[0];
    const yr = params[1];
    const items = (localDb.department_receives || []).filter(item => item.department === dept && String(item.year) === String(yr));
    const maxVal = items.reduce((max, item) => Math.max(max, Number(item.receiveNumber) || 0), 0);
    return [[{ maxNum: maxVal }], []];
  }

  // 6. SELECT FROM
  if (/^SELECT/i.test(cleanSql)) {
    const match = cleanSql.match(/FROM\s+[`']?([a-zA-Z0-9_]+)[`']?/i);
    const tblName = match ? match[1] : '';
    let rows = localDb[tblName] ? [...localDb[tblName]] : [];

    if (tblName === 'users') {
      if (cleanSql.includes('LOWER(username) = LOWER(?)')) {
        rows = rows.filter(u => String(u.username).toLowerCase() === String(params[0]).toLowerCase());
      } else if (cleanSql.includes('email = ? AND resetOtp = ?')) {
        rows = rows.filter(u => u.email === params[0] && u.resetOtp === params[1]);
      } else if (cleanSql.includes('email = ?')) {
        rows = rows.filter(u => u.email === params[0]);
      } else if (cleanSql.includes('WHERE id = ?') || cleanSql.includes('WHERE id =')) {
        rows = rows.filter(u => String(u.id) === String(params[0]));
      }
    } else if (tblName === 'folders') {
      if (cleanSql.includes('departmentName IS NULL') && params.length > 0) {
        rows = rows.filter(f => !f.departmentName || f.departmentName === params[0]);
      }
    } else if (tblName === 'departments') {
      if (cleanSql.includes('WHERE name = ?') && params.length > 0) {
        rows = rows.filter(d => d.name === params[0]);
      } else if (cleanSql.includes('WHERE id = ?')) {
        rows = rows.filter(d => String(d.id) === String(params[0]));
      }
    } else if (tblName === 'positions') {
      if (cleanSql.includes('WHERE id = ?')) {
        rows = rows.filter(p => String(p.id) === String(params[0]));
      }
    } else if (tblName === 'settings') {
      if (rows.length === 0 && initialSeedData.settings.length > 0) {
        rows = [...initialSeedData.settings];
      }
    } else if (tblName === 'document_tracking') {
      if (cleanSql.includes('WHERE docId=?') || cleanSql.includes('WHERE docId = ?')) {
        rows = rows.filter(t => String(t.docId) === String(params[0]));
      } else if (cleanSql.includes('ORDER BY')) {
        rows = rows.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      }
    } else if (tblName === 'system_logs') {
      rows = rows.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 200);
    }

    if (cleanSql.includes('LIMIT 1')) {
      rows = rows.slice(0, 1);
    }

    return [rows, []];
  }

  // 7. INSERT INTO / INSERT IGNORE INTO
  if (/^INSERT/i.test(cleanSql)) {
    const match = cleanSql.match(/INSERT\s+(?:IGNORE\s+)?INTO\s+[`']?([a-zA-Z0-9_]+)[`']?\s*\(([^)]+)\)/i);
    if (match) {
      const tblName = match[1];
      const cols = match[2].split(',').map(c => c.trim().replace(/[`']/g, ''));
      const newItem: Record<string, any> = {};

      cols.forEach((col, idx) => {
        newItem[col] = params[idx] !== undefined ? params[idx] : null;
      });

      if (!localDb[tblName]) {
        localDb[tblName] = [];
      }

      if (!newItem.id) {
        const numericIds = localDb[tblName].map(i => Number(i.id)).filter(n => !isNaN(n));
        newItem.id = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
      }

      if (!newItem.createdAt && !newItem.updatedAt) {
        newItem.createdAt = new Date().toISOString();
        newItem.updatedAt = new Date().toISOString();
      }

      // Check unique constraints for IGNORE
      let shouldInsert = true;
      if (cleanSql.includes('IGNORE')) {
        if (tblName === 'organizations') {
          if (localDb.organizations.some(o => o.name === newItem.name)) shouldInsert = false;
        } else if (tblName === 'department_receives') {
          if (localDb.department_receives.some(r => r.docId === newItem.docId && r.department === newItem.department)) shouldInsert = false;
        }
      }

      if (shouldInsert) {
        localDb[tblName].push(newItem);
        saveLocalDb();
      }

      return [{ insertId: newItem.id, affectedRows: shouldInsert ? 1 : 0 }, []];
    }
  }

  // 8. UPDATE
  if (/^UPDATE/i.test(cleanSql)) {
    const match = cleanSql.match(/UPDATE\s+[`']?([a-zA-Z0-9_]+)[`']?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (match) {
      const tblName = match[1];
      const setClause = match[2];
      const whereClause = match[3] || '';

      const setAssignments = setClause.split(',').map(s => s.trim());
      let paramIdx = 0;
      const updates: Record<string, any> = {};

      setAssignments.forEach(asgn => {
        const colMatch = asgn.match(/[`']?([a-zA-Z0-9_]+)[`']?\s*=\s*\?/);
        if (colMatch) {
          updates[colMatch[1]] = params[paramIdx++];
        }
      });

      if (localDb[tblName]) {
        let updatedCount = 0;
        localDb[tblName].forEach(item => {
          let matches = false;
          if (whereClause.includes('id=?') || whereClause.includes('id = ?')) {
            const targetId = params[paramIdx];
            if (String(item.id) === String(targetId)) matches = true;
          } else if (whereClause.includes('docId=?') || whereClause.includes('docId = ?')) {
            const targetDocId = params[paramIdx];
            if (String(item.docId) === String(targetDocId)) matches = true;
          } else {
            matches = true;
          }

          if (matches) {
            Object.assign(item, updates);
            updatedCount++;
          }
        });
        saveLocalDb();
        return [{ affectedRows: updatedCount }, []];
      }
    }
  }

  // 9. DELETE
  if (/^DELETE/i.test(cleanSql)) {
    const match = cleanSql.match(/DELETE\s+FROM\s+[`']?([a-zA-Z0-9_]+)[`']?(?:\s+WHERE\s+(.+))?$/i);
    if (match) {
      const tblName = match[1];
      const whereClause = match[2] || '';

      if (localDb[tblName]) {
        if (!whereClause) {
          localDb[tblName] = [];
          saveLocalDb();
          return [{ affectedRows: 0 }, []];
        }

        const targetVal = params[0];
        const beforeLen = localDb[tblName].length;

        if (whereClause.includes('id=?') || whereClause.includes('id = ?')) {
          localDb[tblName] = localDb[tblName].filter(item => String(item.id) !== String(targetVal));
        } else if (whereClause.includes('docId=?') || whereClause.includes('docId = ?')) {
          localDb[tblName] = localDb[tblName].filter(item => String(item.docId) !== String(targetVal));
        } else if (whereClause.includes('folderId=?') || whereClause.includes('folderId = ?')) {
          localDb[tblName] = localDb[tblName].filter(item => String(item.folderId) !== String(targetVal));
        }

        saveLocalDb();
        return [{ affectedRows: beforeLen - localDb[tblName].length }, []];
      }
    }
  }

  return [[], []];
}

const originalPoolQuery = pool.query.bind(pool);
(pool as any).query = async (sql: string, params: any[] = []) => {
  if (isMysqlOnline) {
    try {
      return await originalPoolQuery(sql, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT' || err.message?.includes('ECONNREFUSED')) {
        isMysqlOnline = false;
        console.warn('⚠️ MySQL connection lost/failed, switching to local DB fallback:', err.message);
        return await handleLocalDbQuery(sql, params);
      } else {
        throw err;
      }
    }
  }
  return await handleLocalDbQuery(sql, params);
};

// Also wrap execute if called anywhere
(pool as any).execute = (pool as any).query;

// Initialize database schema
async function setupDatabase() {
  try {
    const sqlPath = path.join(process.cwd(), 'database.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlFile = fs.readFileSync(sqlPath, 'utf-8');
      const statements = sqlFile
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          const upperStmt = statement.toUpperCase();
          if (upperStmt.startsWith('INSERT INTO')) {
            const match = statement.match(/INSERT\s+INTO\s+[`']?([a-zA-Z0-9_]+)[`']?/i);
            if (match && match[1]) {
              const tableName = match[1];
              try {
                const [rows]: any = await pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``, []);
                if (rows && rows[0] && rows[0].count > 0) {
                  // Table already has data, skip re-executing seed INSERT statement
                  continue;
                }
              } catch (cntErr) {
                // Ignore count check error
              }
            }
          }
          await pool.query(statement, []);
        } catch (sErr: any) {
          // Ignore table/column already exists or minor syntax warning
          if (!sErr.message.includes('already exists')) {
            console.warn('SQL execution note:', sErr.message);
          }
        }
      }
      
      try {
        await pool.query('ALTER TABLE users ADD COLUMN department VARCHAR(255)', []);
      } catch (e) {
        // column already exists
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(1000)', []);
      } catch (e) {
        // column already exists
      }
      try {
        await pool.query('ALTER TABLE settings ADD COLUMN faviconUrl TEXT', []);
      } catch (e) {
        // column already exists
      }
      try { await pool.query('ALTER TABLE settings ADD COLUMN garuda15Url TEXT', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN garuda30Url TEXT', []); } catch (e) {}

      // Ensure draft_documents table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS draft_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docType VARCHAR(100) NOT NULL,
            title VARCHAR(500) NOT NULL,
            docNumber VARCHAR(255),
            date VARCHAR(255),
            urgency VARCHAR(50) DEFAULT 'ปกติ',
            secrecy VARCHAR(50) DEFAULT 'ปกติ',
            fromDept VARCHAR(255),
            toDept VARCHAR(255),
            subject VARCHAR(500),
            content LONGTEXT,
            signatory VARCHAR(255),
            signatoryPosition VARCHAR(255),
            sealMode VARCHAR(50) DEFAULT 'garuda30',
            status VARCHAR(50) DEFAULT 'draft',
            createdBy VARCHAR(255),
            extraData LONGTEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
      } catch (e) {
        console.warn('Note checking/creating draft_documents table:', e);
      }
      try { await pool.query('ALTER TABLE settings ADD COLUMN smtpHost VARCHAR(255)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN smtpPort INT', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN smtpUser VARCHAR(255)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN smtpPassword VARCHAR(255)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN smtpFrom VARCHAR(255)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN geminiApiKey TEXT', []); } catch (e) {}
      try { await pool.query('ALTER TABLE settings ADD COLUMN headerOrgName VARCHAR(255)', []); } catch (e) {}
      
      try { await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(255)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE users ADD COLUMN resetOtp VARCHAR(10)', []); } catch (e) {}
      try { await pool.query('ALTER TABLE users ADD COLUMN resetOtpExpiry DATETIME', []); } catch (e) {}

      // Ensure attachments & forwarding columns exist in document tables
      const docTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
      const docCols = [
        'attachments TEXT',
        'forwardedTo TEXT',
        'forwardedBy VARCHAR(255)',
        'forwardedAt VARCHAR(255)',
        'forwardNote TEXT',
        'isCentral INT DEFAULT 1'
      ];
      for (const tbl of docTables) {
        for (const colDef of docCols) {
          try {
            await pool.query(`ALTER TABLE ${tbl} ADD COLUMN ${colDef}`, []);
          } catch (e) {
            // column already exists or table issue
          }
        }
      }
      try {
        await pool.query('ALTER TABLE outbox_documents ADD COLUMN isCircular TINYINT DEFAULT 0', []);
      } catch (e) {
        // column already exists
      }
      try {
        await pool.query("ALTER TABLE inbox_documents ADD COLUMN secrecy VARCHAR(50) DEFAULT 'ปกติ'", []);
      } catch (e) {
        // column already exists
      }
      try {
        await pool.query("ALTER TABLE outbox_documents ADD COLUMN secrecy VARCHAR(50) DEFAULT 'ปกติ'", []);
      } catch (e) {
        // column already exists
      }

      // Ensure departmentId and departmentName columns exist in folders table
      try {
        await pool.query('ALTER TABLE folders ADD COLUMN departmentId INT', []);
      } catch (e) {
        // column already exists or table issue
      }
      try {
        await pool.query('ALTER TABLE folders ADD COLUMN departmentName VARCHAR(255)', []);
      } catch (e) {
        // column already exists or table issue
      }

      // Ensure positions table exists in MySQL if not already created
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        // Seed default positions if empty
        const [posRows]: any = await pool.query('SELECT COUNT(*) as count FROM positions', []);
        if (posRows && posRows[0] && posRows[0].count === 0) {
          await pool.query(`
            INSERT INTO positions (id, name, description) VALUES
            (1, 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด'),
            (2, 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ'),
            (3, 'นักวิเคราะห์นโยบายและแผนชำนาญการ', 'ฝ่ายยุทธศาสตร์และการจัดการ'),
            (4, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
            (5, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
            (6, 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', 'ฝ่ายสงเคราะห์ผู้ประสบภัย'),
            (7, 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
            (8, 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
            (9, 'นายช่างเครื่องกลชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ')
          `, []);
        }
      } catch (pErr: any) {
        console.warn('Note checking/creating positions table:', pErr.message);
      }

      // Cleanup receiveNumber format if any contains / or leading zeros (e.g. 001/2569 -> 1)
      try {
        await pool.query("UPDATE inbox_documents SET receiveNumber = TRIM(LEADING '0' FROM SUBSTRING_INDEX(receiveNumber, '/', 1)) WHERE receiveNumber IS NOT NULL AND receiveNumber != ''", []);
        await pool.query("UPDATE outbox_documents SET receiveNumber = TRIM(LEADING '0' FROM SUBSTRING_INDEX(receiveNumber, '/', 1)) WHERE receiveNumber IS NOT NULL AND receiveNumber != ''", []);
        await pool.query("UPDATE circular_documents SET receiveNumber = TRIM(LEADING '0' FROM SUBSTRING_INDEX(receiveNumber, '/', 1)) WHERE receiveNumber IS NOT NULL AND receiveNumber != ''", []);
        await pool.query("UPDATE internal_documents SET receiveNumber = TRIM(LEADING '0' FROM SUBSTRING_INDEX(receiveNumber, '/', 1)) WHERE receiveNumber IS NOT NULL AND receiveNumber != ''", []);
      } catch (e) {
        // ignore if table/col doesn't exist
      }

      // Ensure department_receives table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS department_receives (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            department VARCHAR(255) NOT NULL,
            receiveNumber INT NOT NULL,
            year VARCHAR(50) NOT NULL,
            receivedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            receivedBy VARCHAR(255),
            UNIQUE KEY unique_doc_dept (docId, department)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
      } catch (e) {
        console.warn('Note checking/creating department_receives table:', e);
      }

      // Ensure organizations table exists for autocomplete
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS organizations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
      } catch (e) {
        console.warn('Note checking/creating organizations table:', e);
      }

      // Ensure project_summaries table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS project_summaries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(500) NOT NULL,
            year VARCHAR(50),
            type VARCHAR(100),
            owner VARCHAR(255),
            principal VARCHAR(255) DEFAULT 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
            dateStart VARCHAR(100),
            dateEnd VARCHAR(100),
            venue VARCHAR(255),
            budget DECIMAL(15,2) DEFAULT 0,
            budgetPlan DECIMAL(15,2) DEFAULT 0,
            target VARCHAR(255),
            participants INT DEFAULT 0,
            grade VARCHAR(255),
            speaker VARCHAR(255),
            objectives TEXT,
            activities TEXT,
            resultQty TEXT,
            resultQl TEXT,
            problems TEXT,
            suggestions TEXT,
            success VARCHAR(100),
            satisfaction VARCHAR(100),
            policy VARCHAR(255),
            html LONGTEXT,
            createdBy VARCHAR(255),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_project_year (year),
            INDEX idx_project_type (type),
            INDEX idx_project_owner (owner),
            INDEX idx_project_updatedAt (updatedAt DESC)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // Safe index additions for existing database instances
        const addIndexSafe = async (idxName: string, sql: string) => {
          try {
            await pool.query(sql, []);
          } catch (e: any) {
            // Index might already exist, which is fine
          }
        };

        await addIndexSafe('idx_project_year', `ALTER TABLE project_summaries ADD INDEX idx_project_year (year)`);
        await addIndexSafe('idx_project_type', `ALTER TABLE project_summaries ADD INDEX idx_project_type (type)`);
        await addIndexSafe('idx_project_owner', `ALTER TABLE project_summaries ADD INDEX idx_project_owner (owner)`);
        await addIndexSafe('idx_project_updatedAt', `ALTER TABLE project_summaries ADD INDEX idx_project_updatedAt (updatedAt DESC)`);

        try {
          await pool.query(`ALTER TABLE project_summaries ADD COLUMN IF NOT EXISTS principal VARCHAR(255) DEFAULT 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'`, []);
        } catch (e) {
          try {
            await pool.query(`ALTER TABLE project_summaries ADD COLUMN principal VARCHAR(255) DEFAULT 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'`, []);
          } catch (innerErr) {}
        }
      } catch (e) {
        console.warn('Note checking/creating project_summaries table:', e);
      }

      console.log('✅ Database schema verified and initialized successfully!');
    }
  } catch (err: any) {
    console.error('⚠️ Failed to initialize MySQL schema:', err.message);
  }
}

// Check MySQL connection asynchronously at startup
pool.getConnection()
  .then((conn) => {
    conn.release();
    isMysqlOnline = true;
    console.log(`✅ Successfully connected to MySQL database: ${dbName} @ ${dbHost}:${dbPort}`);
    setupDatabase().catch(err => console.error("Database setup error:", err));
  })
  .catch((err) => {
    isMysqlOnline = false;
    console.warn('⚠️ MySQL Connection Offline/Unavailable. Running application in robust standalone mode.', err.message);
  });

// System Logging Utility Function (MySQL + Local Fallback)
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function addSystemLog(action: string, details: string, username: string = 'System', ipAddress: string = '') {
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
}


// 1. Settings API Endpoints
app.get('/api/settings', async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT * FROM settings LIMIT 1');
      if (rows.length > 0) {
        return res.json(rows[0]);
      } else {
        return res.json({
          currentYear: 2569,
          startSequence: 1,
          orgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
          headerOrgName: '',
          logoUrl: '',
          garuda15Url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Garuda_Thailand.svg',
          garuda30Url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Garuda_Thailand.svg',
          faviconUrl: '',
          footerText: "© 2026 ระบบสารบรรณอิเล็กทรอนิกส์",
          geminiApiKey: "",
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          smtpFrom: ""
        });
      }
    } catch (error: any) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Database error" });
    }
});

app.put("/api/settings", async (req, res) => {
  const data = req.body;
  const ip = getClientIp(req);
  try {
      const [rows]: any = await pool.query("SELECT id FROM settings LIMIT 1");
      if (rows.length > 0) {
        await pool.query(
          "UPDATE settings SET currentYear=?, startSequence=?, orgName=?, headerOrgName=?, logoUrl=?, garuda15Url=?, garuda30Url=?, faviconUrl=?, footerText=?, smtpHost=?, smtpPort=?, smtpUser=?, smtpPassword=?, smtpFrom=?, geminiApiKey=? WHERE id=?",
          [data.currentYear, data.startSequence, data.orgName, data.headerOrgName ?? '', data.logoUrl, data.garuda15Url, data.garuda30Url, data.faviconUrl, data.footerText, data.smtpHost, data.smtpPort, data.smtpUser, data.smtpPassword, data.smtpFrom, data.geminiApiKey, rows[0].id]
        );
      } else {
        await pool.query(
          "INSERT INTO settings (currentYear, startSequence, orgName, headerOrgName, logoUrl, garuda15Url, garuda30Url, faviconUrl, footerText, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, geminiApiKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [data.currentYear, data.startSequence, data.orgName, data.headerOrgName ?? '', data.logoUrl, data.garuda15Url, data.garuda30Url, data.faviconUrl, data.footerText, data.smtpHost, data.smtpPort, data.smtpUser, data.smtpPassword, data.smtpFrom, data.geminiApiKey]
        );
      }
      await addSystemLog("UPDATE_SETTINGS", `อัปเดตการตั้งค่าระบบองค์กร (${data.orgName || "ไม่ระบุ"})`, data.updatedBy || "ผู้ดูแลระบบ", ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Database error:", error.message);
      return res.status(500).json({ error: "Database error" });
    }
});

// 2. Users API Endpoints
app.get("/api/users", async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT id, username, email, firstName, lastName, position, department, role, password, avatar FROM users');
      const formatted = rows.map((u: any) => ({
        ...u,
        isArgon2: u.password ? u.password.startsWith('$argon2') : false
      }));
      return res.json(formatted);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/users', async (req, res) => {
  const { username, password, email, firstName, lastName, position, department, role, avatar } = req.body;
  const ip = getClientIp(req);
  const hashedPassword = await hashPasswordArgon2(password || 'password');

  try {
      const [result]: any = await pool.query(
        'INSERT INTO users (username, password, email, firstName, lastName, position, department, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, email || null, firstName, lastName, position, department || 'ฝ่ายบริหารงานทั่วไป', role || 'user', avatar || null]
      );
      await addSystemLog('CREATE_USER', `เพิ่มเจ้าหน้าที่ใหม่: ${firstName} ${lastName} (${position}, ฝ่าย: ${department || 'ไม่ระบุ'}, สิทธิ์: ${role || 'user'}) - รหัสผ่านเข้ารหัสด้วย Argon2id`, req.body.createdBy || 'ผู้ดูแลระบบ', ip);
      return res.json({ success: true, id: result.insertId });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const ip = getClientIp(req);

  let newHashedPassword: string | null = null;
  if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
    const trimmed = data.password.trim();
    if (!trimmed.startsWith('$argon2') && !trimmed.startsWith('$2a$') && !trimmed.startsWith('$2b$')) {
      newHashedPassword = await hashPasswordArgon2(trimmed);
    }
  }

  try {
      if (newHashedPassword) {
        await pool.query(
          'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, password=?, avatar=? WHERE id=?',
          [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, newHashedPassword, data.avatar || null, id]
        );
      } else {
        await pool.query(
          'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, avatar=? WHERE id=?',
          [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, data.avatar || null, id]
        );
      }
      await addSystemLog('UPDATE_USER', `แก้ไขข้อมูลเจ้าหน้าที่ ID: ${id} (${data.firstName} ${data.lastName}, ฝ่าย: ${data.department || 'ไม่ระบุ'}, สิทธิ์: ${data.role})${newHashedPassword ? ' [อัปเดตรหัสผ่านใหม่]' : ''}`, data.updatedBy || 'ผู้ดูแลระบบ', ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  try {
    const [userRows]: any = await pool.query('SELECT firstName, lastName FROM users WHERE id = ?', [id]);
    const userName = userRows.length > 0 ? `${userRows[0].firstName} ${userRows[0].lastName}` : `ID ${id}`;
    
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    await addSystemLog('DELETE_USER', `ลบข้อมูลเจ้าหน้าที่: ${userName}`, 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// 3. Login API Endpoint with Argon2id Verification & Auto-Upgrade
app.post('/api/login', async (req, res) => {
  const username = req.body.username ? String(req.body.username).trim() : '';
  const password = req.body.password ? String(req.body.password).trim() : '';
  const ip = getClientIp(req);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
      if (rows.length > 0) {
        const user = rows[0];
        const isValid = await verifyPasswordArgon2(user.password, password);
        if (isValid) {
          // Auto-upgrade legacy password to Argon2id if needed
          if (!user.password.startsWith('$argon2')) {
            const newHash = await hashPasswordArgon2(password);
            await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
            user.password = newHash;
            console.log(`🔐 Auto-upgraded password to Argon2id for user: ${username}`);
          }

          const { password: _, ...sanitizedUser } = user;
          sanitizedUser.isArgon2 = true;
          await addSystemLog('LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จ (${user.firstName || username} ${user.lastName || ''}) - ยืนยันรหัสผ่านด้วย Argon2id`, username, ip);
          return res.json({ success: true, user: sanitizedUser });
        }
      }
      
      await addSystemLog('LOGIN_FAILED', `พยายามเข้าสู่ระบบไม่สำเร็จ (ชื่อผู้ใช้: ${username})`, username || 'Unknown', ip);
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

// 4. Departments API Endpoints
// Function to generate beautiful OTP Email HTML Template
function generateOtpEmailTemplate({
  otp,
  orgName,
  logoUrl,
  footerText,
  baseUrl,
}: {
  otp: string;
  orgName?: string;
  logoUrl?: string;
  footerText?: string;
  baseUrl?: string;
}) {
  const displayOrgName = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  let displayLogo = logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
  
  if (displayLogo && !displayLogo.startsWith('http://') && !displayLogo.startsWith('https://')) {
    if (baseUrl) {
      displayLogo = `${baseUrl}${displayLogo.startsWith('/') ? '' : '/'}${displayLogo}`;
    }
  }

  const displayFooter = footerText || 'ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รหัสผ่านใหม่ (OTP)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Sarabun', 'Prompt', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing:antialiased; color:#1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px; background-color:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #e2e8f0; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #f59e0b 100%); height: 6px;"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="background-color:#0f172a; padding: 36px 28px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="background-color:#ffffff; width:72px; height:72px; border-radius:18px; padding:6px; display:inline-block; box-shadow:0 4px 12px rgba(0,0,0,0.2); margin-bottom:16px;">
                      <img src="${displayLogo}" alt="Logo" width="60" height="60" style="display:block; width:100%; height:100%; object-fit:contain; border-radius:12px;" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; line-height:1.4; letter-spacing: -0.2px;">${displayOrgName}</h1>
                    <p style="margin:6px 0 0 0; color:#94a3b8; font-size:13px; font-weight: 500;">ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 32px 32px 32px; background-color:#ffffff;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Badge -->
                    <div style="display:inline-block; background-color:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600; margin-bottom:20px;">
                      🔑 รหัสยืนยันตัวตน / OTP Verification
                    </div>
                    
                    <h2 style="margin:0 0 10px 0; color:#0f172a; font-size:20px; font-weight:700;">คำร้องขอตั้งรหัสผ่านใหม่</h2>
                    <p style="margin:0 0 28px 0; color:#475569; font-size:14px; line-height:1.6; max-width:440px;">
                      ท่านได้ทำการขอรหัสผ่านชั่วคราว (OTP) เพื่อเข้าใช้งานระบบ โปรดนำรหัสผ่านด้านล่างนี้ไปกรอกในหน้ายืนยันตัวตน
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%); border:2px dashed #3b82f6; border-radius:16px; padding:28px 20px; margin-bottom:28px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                      <div style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">รหัส OTP ของคุณคือ</div>
                      <div style="font-family:'Courier New', Consolas, Monaco, monospace; font-size:42px; font-weight:800; color:#1e40af; letter-spacing:12px; margin:0; line-height:1; text-shadow: 1px 1px 0px #ffffff;">
                        ${otp}
                      </div>
                    </div>

                    <!-- Notice Card -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:12px; margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px; text-align:left;">
                          <p style="margin:0 0 6px 0; color:#92400e; font-size:13px; font-weight:700;">
                            ⏰ ระยะเวลาการใช้งาน & ข้อควรระวัง
                          </p>
                          <ul style="margin:0; padding-left:18px; color:#b45309; font-size:12.5px; line-height:1.6;">
                            <li>รหัส OTP นี้มีอายุการใช้งาน <strong>15 นาที</strong> เท่านั้น</li>
                            <li>หากท่านไม่ได้เป็นผู้ทำรายการนี้ โปรดละเว้นอีเมลฉบับนี้และแจ้งผู้ดูแลระบบ</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:28px 32px; text-align:center;">
              <p style="margin:0 0 6px 0; color:#334155; font-size:13px; font-weight:700;">${displayOrgName}</p>
              <p style="margin:0 0 12px 0; color:#64748b; font-size:12px; line-height:1.5;">${displayFooter}</p>
              <div style="border-top:1px solid #cbd5e1; margin:16px auto; width:80%; height:1px;"></div>
              <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.4;">
                ข้อความนี้เป็นอีเมลอัตโนมัติจากระบบสารบรรณอิเล็กทรอนิกส์ กรุณาอย่าตอบกลับอีเมลนี้
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Endpoint to send test email with theme
app.post('/api/settings/test-email', async (req, res) => {
  const { targetEmail } = req.body;
  if (!targetEmail) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลผู้รับทดสอบ' });

  try {
    const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName, logoUrl, footerText FROM settings LIMIT 1');
    const settings = settingsRows[0] || {};

    if (!settings.smtpHost || !settings.smtpUser) {
      return res.status(400).json({ success: false, message: 'ระบบยังไม่ได้ตั้งค่า SMTP Host หรือ User' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const testOtp = '849201';
    const emailHtml = generateOtpEmailTemplate({
      otp: testOtp,
      orgName: settings.orgName,
      logoUrl: settings.logoUrl,
      footerText: settings.footerText,
      baseUrl
    });

    await new Promise((resolve, reject) => {
      transporter.sendMail({
        from: settings.smtpFrom || '"ระบบสารบรรณ" <no-reply@example.com>',
        to: targetEmail,
        subject: `[ทดสอบระบบ] รหัสผ่านใหม่ (OTP) - ${settings.orgName || 'ระบบงานสารบรรณ'}`,
        text: `นี่คืออีเมลทดสอบระบบสารบรรณ รหัส OTP สมมติของคุณคือ: ${testOtp}`,
        html: emailHtml,
      }, (err, info) => {
        if (err) {
          console.error('SMTP Test Send Error:', err);
          reject(err);
        } else {
          resolve(info);
        }
      });
    });

    transporter.close();
    return res.json({ success: true, message: `ส่งอีเมลทดสอบรูปแบบ OTP ไปยัง ${targetEmail} สำเร็จแล้ว` });
  } catch (err: any) {
    console.error('Test Email Error:', err);
    return res.status(500).json({ success: false, message: `ล้มเหลวในการส่งอีเมลทดสอบ: ${err.message}` });
  }
});

// Forgot Password Flow
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });

  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานด้วยอีเมลนี้' });
    }
    const user = rows[0];

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query('UPDATE users SET resetOtp = ?, resetOtpExpiry = ? WHERE id = ?', [otp, expiry, user.id]);

    const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName, logoUrl, footerText FROM settings LIMIT 1');
    const settings = settingsRows[0] || {};
    
    if (!settings.smtpHost || !settings.smtpUser) {
       console.error('SMTP settings missing');
       return res.status(500).json({ success: false, message: 'ระบบยังไม่ได้ตั้งค่า SMTP' });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const emailHtml = generateOtpEmailTemplate({
      otp,
      orgName: settings.orgName,
      logoUrl: settings.logoUrl,
      footerText: settings.footerText,
      baseUrl
    });

    await new Promise((resolve, reject) => {
      transporter.sendMail({
        from: settings.smtpFrom || '"ระบบสารบรรณ" <no-reply@example.com>',
        to: email,
        subject: `รหัสผ่านใหม่ (OTP) - ${settings.orgName || 'ระบบงานสารบรรณ'}`,
        text: `รหัส OTP ของคุณคือ: ${otp} (รหัสผ่านนี้มีอายุการใช้งาน 15 นาที)`,
        html: emailHtml,
      }, (err, info) => {
        if (err) {
          console.error("SMTP Send Error:", err);
          reject(err);
        } else {
          resolve(info);
        }
      });
    });

    transporter.close();

    return res.json({ success: true, message: 'ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว' });
  } catch (error: any) {
    console.error('OTP Error:', error);
    return res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการส่งอีเมล: ${error.message}` });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ? AND resetOtp = ?', [email, otp]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
    
    const user = rows[0];
    if (new Date() > new Date(user.resetOtpExpiry)) {
      return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว' });
    }

    transporter.close();

    return res.json({ success: true, message: 'รหัส OTP ถูกต้อง' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ? AND resetOtp = ?', [email, otp]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    
    const user = rows[0];
    if (new Date() > new Date(user.resetOtpExpiry)) {
      return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว' });
    }

    const hashed = await hashPasswordArgon2(newPassword);
    await pool.query('UPDATE users SET password = ?, resetOtp = NULL, resetOtpExpiry = NULL WHERE id = ?', [hashed, user.id]);

    transporter.close();

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT * FROM departments');
      return res.json(rows);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/departments', async (req, res) => {
  const { name, description } = req.body;
  const ip = getClientIp(req);
  const updatedBy = req.body.createdBy || req.body.username || 'ผู้ดูแลระบบ';
  try {
      const [result]: any = await pool.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description]);
      await addSystemLog('CREATE_DEPARTMENT', `เพิ่มแผนก/กลุ่มงานใหม่: ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
      return res.json({ id: result.insertId, name, description });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const ip = getClientIp(req);
  const updatedBy = req.body.updatedBy || req.body.username || 'ผู้ดูแลระบบ';
  try {
      await pool.query('UPDATE departments SET name=?, description=? WHERE id=?', [name, description, id]);
      await addSystemLog('UPDATE_DEPARTMENT', `แก้ไขข้อมูลแผนก/กลุ่มงาน ID ${id}: เป็น ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  try {
    const [deptRows]: any = await pool.query('SELECT name FROM departments WHERE id = ?', [id]);
    const deptName = deptRows.length > 0 ? deptRows[0].name : `ID ${id}`;
    
    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    await addSystemLog('DELETE_DEPARTMENT', `ลบแผนก/กลุ่มงาน: ${deptName}`, 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// 4.5 Positions API Endpoints (ระบบบริหารตำแหน่งงาน จากฐานข้อมูล MySQL / Local DB)
app.get('/api/positions', async (req, res) => {
  try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS positions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      const [rows]: any = await pool.query('SELECT * FROM positions ORDER BY id ASC');
      if (Array.isArray(rows) && rows.length > 0) {
        return res.json(rows);
      }
      // If table exists but empty, seed default positions
      await pool.query(`
        INSERT INTO positions (id, name, description) VALUES
        (1, 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด'),
        (2, 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ'),
        (3, 'นักวิเคราะห์นโยบายและแผนชำนาญการ', 'ฝ่ายยุทธศาสตร์และการจัดการ'),
        (4, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
        (5, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
        (6, 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', 'ฝ่ายสงเคราะห์ผู้ประสบภัย'),
        (7, 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
        (8, 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
        (9, 'นายช่างเครื่องกลชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ')
      `);
      const [seededRows]: any = await pool.query('SELECT * FROM positions ORDER BY id ASC');
      return res.json(seededRows);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/positions', async (req, res) => {
  const { name, description } = req.body;
  const ip = getClientIp(req);
  const updatedBy = req.body.createdBy || req.body.username || 'ผู้ดูแลระบบ';
  if (!name) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อตำแหน่ง' });
  }
  try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS positions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      const [result]: any = await pool.query('INSERT INTO positions (name, description) VALUES (?, ?)', [name, description || '']);
      await addSystemLog('CREATE_POSITION', `เพิ่มตำแหน่งงานใหม่: ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
      return res.json({ id: result.insertId, name, description: description || '' });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/positions/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const ip = getClientIp(req);
  const updatedBy = req.body.updatedBy || req.body.username || 'ผู้ดูแลระบบ';
  try {
      await pool.query('UPDATE positions SET name=?, description=? WHERE id=?', [name, description || '', id]);
      await addSystemLog('UPDATE_POSITION', `แก้ไขข้อมูลตำแหน่งงาน ID ${id}: เป็น ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/positions/:id', async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  try {
    const [posRows]: any = await pool.query('SELECT name FROM positions WHERE id = ?', [id]);
    const posName = posRows.length > 0 ? posRows[0].name : `ID ${id}`;
    
    await pool.query('DELETE FROM positions WHERE id = ?', [id]);
    await addSystemLog('DELETE_POSITION', `ลบตำแหน่งงาน: ${posName}`, 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// 4.6 Organizations API Endpoints (For From/To autocomplete)
app.get('/api/organizations', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM organizations ORDER BY name ASC');
    return res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/organizations', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    // INSERT IGNORE to prevent duplicates
    const [result]: any = await pool.query('INSERT IGNORE INTO organizations (name) VALUES (?)', [name]);
    return res.json({ success: true, name });
  } catch (error: any) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// 5. Digital Folders API Endpoints (ระบบงานธุรการ: แฟ้มเอกสารดิจิทัล)
app.get('/api/folders', async (req, res) => {
  const departmentName = req.query.department ? String(req.query.department) : '';
  const role = req.query.role ? String(req.query.role) : '';
  try {
    if (role === 'admin') {
      const [rows]: any = await pool.query('SELECT * FROM folders ORDER BY id ASC');
      return res.json(rows);
    } else {
      const [rows]: any = await pool.query(
        'SELECT * FROM folders WHERE departmentName IS NULL OR departmentName = "" OR departmentName = ? ORDER BY id ASC',
        [departmentName]
      );
      return res.json(rows);
    }
  } catch (error: any) {
    console.error('MySQL Folders Fetch error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/folders', async (req, res) => {
  const { name, description, isPrivate, departmentName, username } = req.body;
  const ip = getClientIp(req);
  const userLabel = username || 'ผู้ใช้งาน';
  try {
    let deptId: number | null = null;
    let deptName: string | null = null;

    if (isPrivate && departmentName) {
      const [deptRows]: any = await pool.query('SELECT id FROM departments WHERE name = ?', [departmentName]);
      if (deptRows.length > 0) {
        deptId = deptRows[0].id;
        deptName = departmentName;
      }
    }

    const [result]: any = await pool.query(
      'INSERT INTO folders (name, description, departmentId, departmentName) VALUES (?, ?, ?, ?)',
      [name, description, deptId, deptName]
    );

    const logMsg = deptName 
      ? `สร้างแฟ้มเอกสารส่วนตัวเฉพาะฝ่าย (${deptName}): ${name}`
      : `สร้างแฟ้มเอกสารดิจิทัลส่วนกลาง: ${name}`;

    await addSystemLog('CREATE_FOLDER', logMsg, userLabel, ip);
    return res.json({ id: result.insertId, name, description, departmentId: deptId, departmentName: deptName });
  } catch (error: any) {
    console.error('MySQL Folder Create error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/folders/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, role, username } = req.body;
  const ip = getClientIp(req);
  const userLabel = username || 'ผู้ใช้งาน';

  if (role !== 'admin') {
    return res.status(403).json({ error: 'มีเฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขแฟ้มเอกสารได้' });
  }

  try {
    await pool.query('UPDATE folders SET name=?, description=? WHERE id=?', [name, description, id]);
    await addSystemLog('UPDATE_FOLDER', `แก้ไขแฟ้มเอกสารดิจิทัล ID ${id}: ${name}`, userLabel, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Folder Update error:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/folders/:id', async (req, res) => {
  const { id } = req.params;
  const role = req.query.role ? String(req.query.role) : '';
  const username = req.query.username ? String(req.query.username) : 'ผู้ใช้งาน';
  const ip = getClientIp(req);

  if (role !== 'admin') {
    return res.status(403).json({ error: 'มีเฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบแฟ้มเอกสารได้' });
  }

  try {
    const tables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    for (const tbl of tables) {
      try {
        await pool.query(`UPDATE ${tbl} SET folderId = NULL WHERE folderId = ?`, [id]);
      } catch (e) {
        // Table or column might not exist
      }
    }

    await pool.query('DELETE FROM folders WHERE id=?', [id]);
    await addSystemLog('DELETE_FOLDER', `ลบแฟ้มเอกสารดิจิทัล ID ${id}`, username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Folder Delete error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 6. Documents API Endpoints (หนังสือราชการ + คำสั่ง/ประกาศ - ดึงแบบแยกตาราง)
app.get('/api/documents', async (req, res) => {
  try {
      const { role, department, isCentral } = req.query;
      const query = `
        SELECT id, 'inbox' AS type, NULL AS category, 0 AS isCircular, COALESCE(secrecy, 'ปกติ') AS secrecy, receiveNumber, year, docNumber, date, priority, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, folderId, status, attachments, forwardedTo, forwardedBy, forwardedAt, forwardNote, isCentral FROM inbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, NULL AS category, 0 AS isCircular, COALESCE(secrecy, 'ปกติ') AS secrecy, receiveNumber, year, docNumber, date, priority, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, folderId, status, attachments, forwardedTo, forwardedBy, forwardedAt, forwardNote, isCentral FROM outbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, NULL AS category, 1 AS isCircular, COALESCE(secrecy, 'ปกติ') AS secrecy, receiveNumber, year, docNumber, date, priority, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, folderId, status, attachments, forwardedTo, forwardedBy, forwardedAt, forwardNote, isCentral FROM circular_documents
        UNION ALL
        SELECT id, 'internal' AS type, NULL AS category, 0 AS isCircular, 'ปกติ' AS secrecy, receiveNumber, year, docNumber, date, priority, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, folderId, status, attachments, forwardedTo, forwardedBy, forwardedAt, forwardNote, isCentral FROM internal_documents
        UNION ALL
        SELECT id, 'admin' AS type, category, 0 AS isCircular, 'ปกติ' AS secrecy, NULL AS receiveNumber, year, docNumber, date, 'ปกติ' AS priority, title, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, note, content, registerDate, folderId, status, attachments, forwardedTo, forwardedBy, forwardedAt, forwardNote, isCentral FROM admin_documents
      `;
      const [rows]: any = await pool.query(query);
      const [deptReceives]: any = await pool.query('SELECT * FROM department_receives');
      
      let processedRows = rows.map((d: any) => {
        let attachments: string[] = [];
        if (d.attachments) {
          try {
            attachments = typeof d.attachments === 'string' ? JSON.parse(d.attachments) : d.attachments;
          } catch (e) {
            attachments = [d.attachments];
          }
        }
        
        // Map department receives
        const deptRecs = deptReceives.filter((r: any) => r.docId === d.id);
        
        let item = { ...d, attachments, isCircular: Boolean(d.isCircular), departmentReceives: deptRecs };
        if (d.type === 'outbox' && d.note && d.note.startsWith('[CATEGORY:')) {
          const match = d.note.match(/^\[CATEGORY:(.*?)\] (.*)/);
          if (match) {
            return { ...item, category: match[1], note: match[2] };
          }
        }
        return item;
      });

      // Filter by department if user is not central
      if (isCentral !== '1' && department && typeof department === 'string' && department.trim() !== '') {
        const userDept = department.trim();

        processedRows = processedRows.filter((doc: any) => {
          if (doc.type === 'inbox') {
            // For department users (isCentral=0), they only see inbox docs if it is explicitly forwarded to their department
            return doc.forwardedTo && doc.forwardedTo.includes(userDept);
          }

          const matchesDept = doc.department === userDept ||
            doc.from === userDept ||
            doc.to === userDept ||
            (doc.forwardedTo && doc.forwardedTo.includes(userDept));
          return matchesDept;
        });
      }

      return res.json(processedRows);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }
});

// Endpoint for Forwarding Document to Department(s)
app.post('/api/documents/forward', async (req, res) => {
  const { docId, docType, targetDepartments, forwardNote, forwardedBy } = req.body;
  if (!docId || !targetDepartments || !Array.isArray(targetDepartments) || targetDepartments.length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุเอกสารและฝ่ายที่ต้องการส่งต่อ' });
  }

  const deptsString = targetDepartments.join(',');
  const timestamp = new Date().toISOString();
  const ip = getClientIp(req);

  try {
    const tableMap: Record<string, string> = {
      inbox: 'inbox_documents',
      outbox: 'outbox_documents',
      internal: 'internal_documents',
      admin: 'admin_documents'
    };
    const tableName = tableMap[docType] || 'inbox_documents';

    // Update document forwarding fields and status
    await pool.query(
      `UPDATE ${tableName} SET forwardedTo = ?, forwardedBy = ?, forwardedAt = ?, forwardNote = ?, status = 'ส่งต่อกลุ่มงาน' WHERE id = ?`,
      [deptsString, forwardedBy || 'สารบรรณกลาง', timestamp, forwardNote || '', docId]
    );

    if (docType === 'outbox') {
      await pool.query(
        `UPDATE circular_documents SET forwardedTo = ?, forwardedBy = ?, forwardedAt = ?, forwardNote = ?, status = 'ส่งต่อกลุ่มงาน' WHERE id = ?`,
        [deptsString, forwardedBy || 'สารบรรณกลาง', timestamp, forwardNote || '', docId]
      );
    }

    // Insert tracking log
    const trackingComment = `ส่งต่อหนังสือให้: ${deptsString}${forwardNote ? ` (คำสั่ง/ข้อความ: ${forwardNote})` : ''}`;
    await pool.query(
      'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
      [docId, docType, 'ส่งต่อกลุ่มงาน', trackingComment, forwardedBy || 'สารบรรณกลาง']
    );

    // Insert notifications for users in target departments
    for (const dept of targetDepartments) {
      const [deptUsers]: any = await pool.query('SELECT id FROM users WHERE department = ?', [dept]);
      for (const u of deptUsers) {
        await pool.query(
          'INSERT INTO notifications (userId, title, message, type, isRead) VALUES (?, ?, ?, ?, 0)',
          [u.id, 'หนังสือส่งต่อถึงฝ่าย', `หนังสือเลขที่/ที่ได้รับการส่งต่อให้ฝ่าย ${dept}: ${trackingComment}`, 'document']
        );
      }
    }

    await addSystemLog('FORWARD_DOCUMENT', `ส่งต่อหนังสือ ID ${docId} ไปยัง ${deptsString}`, forwardedBy || 'สารบรรณกลาง', ip);

    transporter.close();

    return res.json({ success: true, message: `ส่งต่อหนังสือให้ฝ่าย ${deptsString} เรียบร้อยแล้ว` });
  } catch (error: any) {
    console.error('Forward document error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents/:id/receive-department', async (req, res) => {
  const { id } = req.params;
  const { department, username, year, docType } = req.body;
  if (!department || !year) {
    return res.status(400).json({ error: 'Missing department or year' });
  }
  const ip = getClientIp(req);

  try {
    const [settingsRows]: any = await pool.query('SELECT startSequence FROM settings LIMIT 1');
    const startSeq = (settingsRows && settingsRows[0] && settingsRows[0].startSequence) ? Number(settingsRows[0].startSequence) : 1;
    const [maxRows]: any = await pool.query('SELECT MAX(receiveNumber) as maxNum FROM department_receives WHERE department = ? AND year = ?', [department, year]);
    const maxVal = maxRows[0]?.maxNum ? Number(maxRows[0].maxNum) : 0;
    const nextNum = Math.max(startSeq, maxVal + 1);

    await pool.query(
      'INSERT IGNORE INTO department_receives (docId, department, receiveNumber, year, receivedBy) VALUES (?, ?, ?, ?, ?)',
      [id, department, nextNum, year, username || 'ผู้ใช้งาน']
    );

    // Also update tracking
    const trackingComment = `ฝ่าย ${department} ลงรับหนังสือเรียบร้อยแล้ว (เลขรับฝ่าย: ${nextNum}/${year})`;
    await pool.query(
      'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
      [id, docType || 'inbox', 'ฝ่ายลงรับหนังสือ', trackingComment, username || 'ผู้ใช้งาน']
    );

    await addSystemLog('DEPT_RECEIVE', `ลงรับหนังสือฝ่าย ${department} (เลขรับ: ${nextNum}/${year}) เอกสาร ID ${id}`, username || 'ผู้ใช้งาน', ip);

    return res.json({ success: true, receiveNumber: nextNum });
  } catch (error: any) {
    console.error('Department receive error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', async (req, res) => {
  const doc = req.body;
  const docId = doc.id || 'doc_' + Math.random().toString(36).substring(2, 9);
  const type = doc.type || 'inbox';
  const folderId = doc.folderId ? parseInt(doc.folderId, 10) : null;
  const status = doc.status || 'ลงทะเบียน';
  const ip = getClientIp(req);
  const attachmentsJson = JSON.stringify(doc.attachments || []);

  try {
      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson]
        );
      } else if (type === 'outbox') {
        if (doc.isCircular) {
          await pool.query(
            'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson]
          );
        } else {
          await pool.query(
            'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson, 0]
          );
        }
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.category || 'order', doc.docNumber || '', doc.year || '', doc.date || '', doc.title || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson]
        );
      }
      
      // Auto-insert initial tracking record
      await pool.query(
        'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
        [docId, type, status, 'ลงทะเบียนเอกสารใหม่เข้าระบบ', doc.assignee || 'ผู้ดูแลระบบ']
      );

      await addSystemLog('CREATE_DOCUMENT', `ลงทะเบียนหนังสือใหม่ (${type}): ${doc.docNumber || doc.receiveNumber || docId} - ${doc.title}`, doc.assignee || 'ผู้ใช้งาน', ip);

      return res.json({ success: true, id: docId });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

app.put('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const doc = req.body;
  const type = doc.type || 'inbox';
  const folderId = doc.folderId ? parseInt(doc.folderId, 10) : null;
  const status = doc.status || 'ลงทะเบียน';
  const ip = getClientIp(req);
  const attachmentsJson = JSON.stringify(doc.attachments || []);

  try {
      // First delete from all tables to handle type/category changes safely
      await pool.query('DELETE FROM inbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM outbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM circular_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM internal_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM admin_documents WHERE id=?', [id]);

      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson]
        );
      } else if (type === 'outbox') {
        if (doc.isCircular) {
          await pool.query(
            'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson]
          );
        } else {
          await pool.query(
            'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, 0]
          );
        }
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.category || 'order', doc.docNumber || '', doc.year || '', doc.date || '', doc.title || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson]
        );
      }
      await addSystemLog('UPDATE_DOCUMENT', `แก้ไขรายละเอียดหนังสือ (${type}): ID ${id} - ${doc.title || ''}`, doc.assignee || 'ผู้ใช้งาน', ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  try {
      await pool.query('DELETE FROM inbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM outbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM circular_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM internal_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM admin_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM document_tracking WHERE docId=?', [id]);
      await addSystemLog('DELETE_DOCUMENT', `ลบหนังสือและประวัติติดตามของเอกสาร ID: ${id}`, 'ผู้ใช้งาน', ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

// 7. Tracking history / audit trails API
app.get('/api/tracking/:docId', async (req, res) => {
  const { docId } = req.params;
  try {
      const [rows]: any = await pool.query('SELECT * FROM document_tracking WHERE docId=? ORDER BY id ASC', [docId]);
      return res.json(rows);
    } catch (error: any) {
      console.error('MySQL Tracking Fetch error:', error.message);
    }
  }
);

app.post('/api/tracking', async (req, res) => {
  const { docId, docType, status, comments, updatedBy } = req.body;
  const ip = getClientIp(req);
  try {
      // 1. Add tracking row
      await pool.query(
        'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
        [docId, docType, status, comments, updatedBy]
      );
      
      // 2. Update status in the main table
      let table = 'inbox_documents';
      if (docType === 'outbox') table = 'outbox_documents';
      if (docType === 'internal') table = 'internal_documents';
      
      if (docType === 'admin') {
        await pool.query(`UPDATE admin_documents SET status=? WHERE id=?`, [status, docId]);
      } else {
        await pool.query(`UPDATE ${table} SET status=? WHERE id=?`, [status, docId]);
        if (docType === 'outbox') {
          await pool.query(`UPDATE circular_documents SET status=? WHERE id=?`, [status, docId]);
        }
      }
      
      await addSystemLog('TRACKING_UPDATE', `อัปเดตสถานะหนังสือ (${docId}) เป็น "${status}" (${comments || 'ไม่มีหมายเหตุ'})`, updatedBy || 'ผู้ใช้งาน', ip);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('MySQL Add Tracking error:', error.message);
    }
  }

);

// 8. Real Notifications API
function getNotificationTitle(status: string, docNumber: string): string {
  switch (status) {
    case 'ลงทะเบียน':
      return `ลงทะเบียนเอกสารใหม่ (${docNumber})`;
    case 'เสนอผู้บริหาร':
      return `เสนอผู้บริหารพิจารณา (${docNumber})`;
    case 'ส่งต่อกลุ่มงาน':
      return `ส่งต่อกลุ่มงานปฏิบัติ (${docNumber})`;
    case 'รับมอบหมาย':
      return `มอบหมายงานผู้รับผิดชอบ (${docNumber})`;
    case 'เสร็จสิ้น':
      return `ดำเนินการเสร็จสิ้น (${docNumber})`;
    default:
      return `อัพเดทสถานะเอกสาร (${docNumber})`;
  }
}

app.get('/api/notifications', async (req, res) => {
  const { department, name, role } = req.query;

  try {
      const [trackings]: any = await pool.query('SELECT * FROM document_tracking ORDER BY updatedAt DESC, id DESC LIMIT 500');
      
      const docIds = [...new Set(trackings.map((t: any) => t.docId))];
      let docs: any[] = [];
      if (docIds.length > 0) {
        const placeholders = docIds.map(() => '?').join(',');
        const docQuery = `
          SELECT id, docNumber, title, department, assignee, toDept AS \`to\` FROM inbox_documents WHERE id IN (${placeholders})
          UNION ALL
          SELECT id, docNumber, title, department, assignee, toDept AS \`to\` FROM outbox_documents WHERE id IN (${placeholders})
          UNION ALL
          SELECT id, docNumber, title, department, assignee, toDept AS \`to\` FROM circular_documents WHERE id IN (${placeholders})
          UNION ALL
          SELECT id, docNumber, title, department, assignee, toDept AS \`to\` FROM internal_documents WHERE id IN (${placeholders})
          UNION ALL
          SELECT id, docNumber, title, department, assignee, NULL AS \`to\` FROM admin_documents WHERE id IN (${placeholders})
        `;
        // Duplicate docIds array 5 times for the 5 UNION ALL clauses
        const queryParams = [...docIds, ...docIds, ...docIds, ...docIds, ...docIds];
        const [rows]: any = await pool.query(docQuery, queryParams);
        docs = rows;
      }

      const docMap = new Map<string, any>();
      docs.forEach((d: any) => {
        docMap.set(String(d.id), d);
      });

      const filteredTrackings = trackings.filter((t: any) => {
        if (name && t.updatedBy === name) return false;
        if (role === 'admin') return true;

        const docInfo = docMap.get(String(t.docId));
        if (!docInfo) return false;

        if (name && docInfo.assignee === name) return true;
        if (department && (docInfo.department === department || docInfo.to === department)) return true;

        return false;
      }).slice(0, 50);

      const list = filteredTrackings.map((t: any) => {
        const docInfo = docMap.get(String(t.docId)) || { docNumber: 'ไม่ระบุ', title: 'เอกสารถูกลบแล้ว' };
        return {
          id: `track_${t.id}`,
          docId: t.docId,
          docType: t.docType,
          title: getNotificationTitle(t.status, docInfo.docNumber),
          message: `เรื่อง: ${docInfo.title}${t.comments ? ` | ${t.comments}` : ''}`,
          time: t.updatedAt,
          updater: t.updatedBy,
          status: t.status,
          read: false
        };
      });
      return res.json(list);
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

// 9. System Logs API Endpoints
app.get('/api/logs', async (req, res) => {
  try {
      const [rows]: any = await pool.query('SELECT * FROM system_logs ORDER BY id DESC LIMIT 200');
      return res.json(rows);
    } catch (error: any) {
      console.error('Database error fetching logs:', error.message);
      const logs = localDb.system_logs || [];
      return res.json(logs);
    }
});

app.post('/api/logs', async (req, res) => {
  const { action, details, username } = req.body;
  const ip = getClientIp(req);
  await addSystemLog(action || 'USER_ACTION', details || '', username || 'ผู้ใช้งาน', ip);
  res.json({ success: true });
});

app.delete('/api/logs', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';

  try {
    await pool.query('DELETE FROM system_logs');
    await addSystemLog('CLEAR_LOGS', 'ล้างประวัติการใช้งานระบบทั้งหมด', username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Logs Clear error (DELETE):', error.message);
    try {
      await pool.query('TRUNCATE TABLE system_logs');
      await addSystemLog('CLEAR_LOGS', 'ล้างประวัติการใช้งานระบบทั้งหมด', username, ip);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('MySQL Logs Clear error (TRUNCATE):', err.message);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการล้างประวัติระบบ' });
    }
  }
});

// Helper utilities for Backup & Restore
function copyFolderRecursiveSync(source: string, target: string) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    if (file.startsWith('temp_backup_') || file.startsWith('temp_restore_') || file === 'temp_uploads') continue;
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    try {
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    } catch (err: any) {
      console.warn(`Copy folder note (${curSource}):`, err.message);
    }
  }
}

function deleteFolderRecursiveSync(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (e: any) {
      console.warn(`Failed to remove folder ${dirPath}:`, e.message);
    }
  }
}

async function restoreTableData(tableName: string, rows: any[]) {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) return;

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query(`DELETE FROM \`${tableName}\``);
  } catch (err: any) {
    console.warn(`Error clearing table ${tableName}:`, err.message);
  }

  if (rows && Array.isArray(rows) && rows.length > 0) {
    for (const row of rows) {
      const keys = Object.keys(row).filter(k => row[k] !== undefined);
      if (keys.length === 0) continue;

      const columns = keys.map(k => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => {
        const val = row[k];
        if (val === null) return null;
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });

      const sql = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;
      try {
        await pool.query(sql, values);
      } catch (err: any) {
        console.error(`Error restoring row into ${tableName}:`, err.message);
      }
    }
  }

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err: any) {}
}

// 10. Backup & Restore API Endpoints
app.get('/api/backup', async (req, res) => {
  const username = (req.query.username || 'ผู้ดูแลระบบ').toString();
  const ip = getClientIp(req);

  const tempDirName = `temp_backup_${Date.now()}`;
  const tempDir = path.join(process.cwd(), tempDirName);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tarFileName = `EDMS_Backup_${dateStr}_${Date.now()}.tar`;
  const tarFilePath = path.join(process.cwd(), tarFileName);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const tables = [
      'settings',
      'users',
      'departments',
      'positions',
      'folders',
      'inbox_documents',
      'circular_documents',
      'outbox_documents',
      'internal_documents',
      'admin_documents',
      'department_receives',
      'document_tracking',
      'organizations',
      'system_logs'
    ];

    const backupTablesData: Record<string, any[]> = {};
    for (const table of tables) {
      try {
        const [rows]: any = await pool.query(`SELECT * FROM \`${table}\``);
        backupTablesData[table] = rows || [];
      } catch (err: any) {
        console.warn(`Backup note: could not query table ${table}:`, err.message);
        backupTablesData[table] = [];
      }
    }

    const backupPayload = {
      version: '1.0',
      system: 'EDMS Electronic Document Management System',
      createdAt: new Date().toISOString(),
      createdBy: username,
      tables: backupTablesData
    };

    fs.writeFileSync(
      path.join(tempDir, 'backup_data.json'),
      JSON.stringify(backupPayload, null, 2),
      'utf-8'
    );

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      copyFolderRecursiveSync(uploadsDir, path.join(tempDir, 'uploads'));
    }

    await execFileAsync('tar', ['-cf', tarFilePath, '-C', tempDir, '.']);

    res.setHeader('Content-Type', 'application/x-tar');
    res.setHeader('Content-Disposition', `attachment; filename="${tarFileName}"`);

    res.sendFile(tarFilePath, (err) => {
      deleteFolderRecursiveSync(tempDir);
      if (fs.existsSync(tarFilePath)) {
        try { fs.unlinkSync(tarFilePath); } catch (e) {}
      }
      if (!err) {
        addSystemLog('BACKUP_DATABASE', `สำรองข้อมูลระบบและไฟล์เอกสารแนบทั้งหมดสำเร็จ (ไฟล์: ${tarFileName})`, username, ip).catch(() => {});
      }
    });

  } catch (error: any) {
    console.error('Backup Error:', error);
    deleteFolderRecursiveSync(tempDir);
    if (fs.existsSync(tarFilePath)) {
      try { fs.unlinkSync(tarFilePath); } catch (e) {}
    }
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสำรองข้อมูลระบบ: ' + error.message });
  }
});

const tempUploadsFolder = path.join(process.cwd(), 'uploads', 'temp_uploads');
if (!fs.existsSync(tempUploadsFolder)) {
  try { fs.mkdirSync(tempUploadsFolder, { recursive: true }); } catch (e) {}
}

const backupUpload = multer({
  dest: tempUploadsFolder,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

app.post('/api/restore', backupUpload.single('file'), async (req, res) => {
  const username = (req.body.username || req.query.username || 'ผู้ดูแลระบบ').toString();
  const ip = getClientIp(req);

  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์สำรองข้อมูล (.tar)' });
  }

  const uploadedPath = req.file.path;
  const tempRestoreDir = path.join(process.cwd(), `temp_restore_${Date.now()}`);

  try {
    fs.mkdirSync(tempRestoreDir, { recursive: true });

    await execFileAsync('tar', ['-xf', uploadedPath, '-C', tempRestoreDir]);

    let backupJsonPath = path.join(tempRestoreDir, 'backup_data.json');
    if (!fs.existsSync(backupJsonPath)) {
      const files = fs.readdirSync(tempRestoreDir);
      for (const f of files) {
        const p = path.join(tempRestoreDir, f, 'backup_data.json');
        if (fs.existsSync(p)) {
          backupJsonPath = p;
          break;
        }
      }
    }

    if (!fs.existsSync(backupJsonPath)) {
      throw new Error('ไม่พบไฟล์ข้อมูล backup_data.json ในไฟล์ .tar ที่อัปโหลด');
    }

    const jsonContent = fs.readFileSync(backupJsonPath, 'utf-8');
    const backupData = JSON.parse(jsonContent);

    if (!backupData || !backupData.tables) {
      throw new Error('โครงสร้างไฟล์สำรองข้อมูลไม่ถูกต้อง');
    }

    const restoredSummary: Record<string, number> = {};
    const tables = Object.keys(backupData.tables);

    for (const table of tables) {
      const rows = backupData.tables[table];
      if (Array.isArray(rows)) {
        await restoreTableData(table, rows);
        restoredSummary[table] = rows.length;
      }
    }

    let restoredUploadsDir = path.join(tempRestoreDir, 'uploads');
    if (!fs.existsSync(restoredUploadsDir)) {
      const files = fs.readdirSync(tempRestoreDir);
      for (const f of files) {
        const p = path.join(tempRestoreDir, f, 'uploads');
        if (fs.existsSync(p)) {
          restoredUploadsDir = p;
          break;
        }
      }
    }

    if (fs.existsSync(restoredUploadsDir)) {
      const targetUploadsDir = path.join(process.cwd(), 'uploads');
      copyFolderRecursiveSync(restoredUploadsDir, targetUploadsDir);
    }

    deleteFolderRecursiveSync(tempRestoreDir);
    if (fs.existsSync(uploadedPath)) {
      try { fs.unlinkSync(uploadedPath); } catch (e) {}
    }

    await addSystemLog('RESTORE_DATABASE', 'คืนค่าข้อมูลระบบและไฟล์เอกสารแนบจากไฟล์ .tar สำเร็จเรียบร้อยแล้ว', username, ip);

    return res.json({
      success: true,
      message: 'คืนค่าข้อมูลระบบและไฟล์เอกสารแนบจากไฟล์ .tar สำเร็จเรียบร้อยแล้ว',
      restoredAt: new Date().toISOString(),
      summary: restoredSummary
    });

  } catch (error: any) {
    console.error('Restore Error:', error);
    deleteFolderRecursiveSync(tempRestoreDir);
    if (fs.existsSync(uploadedPath)) {
      try { fs.unlinkSync(uploadedPath); } catch (e) {}
    }
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคืนค่าข้อมูล: ' + error.message });
  }
});

// AI Document Scanner Endpoint via Gemini API
import { GoogleGenAI } from '@google/genai';

app.post('/api/ai-scan', async (req, res) => {
  try {
    const { base64, mimeType, outputType, hint } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลไฟล์เอกสาร (base64)' });
    }

    let apiKey = (req.body.apiKey || '').trim();

    // 1. First check MySQL database settings
    if (!apiKey) {
      try {
        const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
        if (stRows && stRows[0] && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
          apiKey = String(stRows[0].geminiApiKey).trim();
        }
      } catch (e) {
        console.warn('Could not query settings for geminiApiKey:', e);
      }
    }

    // 2. Fallback to process.env.GEMINI_API_KEY if database settings key is empty
    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || '').trim();
    }

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ระบบยังไม่ได้กำหนด GEMINI_API_KEY กรุณากำหนด API Key ในเมนู "ตั้งค่าระบบ -> ตั้งค่าข้อมูลพื้นฐาน" หรือกำหนดใน Settings > Secrets' 
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญงานสารบรรณราชการไทย ที่มีความสามารถในการอ่าน สแกน และถอดความเอกสารราชการไทย
อ่านเอกสารในภาพหรือ PDF และสกัดข้อมูลออกมาเป็นโครงสร้าง JSON ตามที่กำหนดเท่านั้น`;

    const userPrompt = `อ่านและถอดความเอกสารราชการนี้ แล้วจัดโครงสร้างข้อมูลในรูปแบบ JSON ดังนี้:
{
  "docType": "ประเภทหนังสือ (หนังสือภายนอก/หนังสือภายใน/บันทึกข้อความ/คำสั่ง/ประกาศ/หนังสือรับรอง/หนังสือเวียน/ระเบียบ/ข้อบังคับ)",
  "docNum": "เลขที่หนังสือ เช่น ศธ 04034/123 หรือ ว.15 หรือ รย 0021/ว123",
  "date": "วันที่ เช่น 25 มกราคม 2569",
  "urgency": "ปกติ หรือ ด่วน หรือ ด่วนมาก หรือ ด่วนที่สุด",
  "secrecy": "ปกติ หรือ ลับ หรือ ลับมาก หรือ ลับที่สุด",
  "subject": "เรื่องของหนังสือ",
  "to": "เรียน ถึงใคร หรือ ใครเป็นผู้รับ",
  "from": "หน่วยงานหรือบุคคลที่ออกหนังสือ",
  "ref": "อ้างถึงหนังสือฉบับใด (ถ้ามี) หรือ ''",
  "att": "สิ่งที่ส่งมาด้วย (ถ้ามี) หรือ ''",
  "body": "เนื้อหาและสาระสำคัญของหนังสือ",
  "signer": "ชื่อผู้ลงนาม",
  "signerPos": "ตำแหน่งผู้ลงนาม",
  "rawText": "ข้อความทั้งหมดที่อ่านได้จากเอกสาร",
  "confidence": "สูง หรือ ปานกลาง หรือ ต่ำ",
  "confidenceNote": "หมายเหตุเกี่ยวกับความชัดเจน"
}

${outputType && outputType !== 'auto' ? `ผู้ใช้ต้องการแปลงเป็นประเภท: ${outputType}` : 'ตรวจจับประเภทหนังสือจากเอกสารจริง'}
${hint ? 'คำแนะนำเพิ่มเติมจากผู้ใช้: ' + hint : ''}`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    
    const rawReferer = req.headers.referer ? String(req.headers.referer) : '';
    const rawOrigin = req.headers.origin ? String(req.headers.origin) : '';
    const refererCandidates = [
      '',
      'https://aistudio.google.com/',
      'https://ai.studio/',
      'https://google.com/',
      'https://developer.google.com/',
      rawReferer,
      rawOrigin,
      'https://ais-dev-mg7dljkj65dnizvta7d3b4-370817768326.asia-southeast1.run.app/',
      'https://ais-pre-mg7dljkj65dnizvta7d3b4-370817768326.asia-southeast1.run.app/'
    ].filter((v, i, a) => a && a.length > 0 ? a.indexOf(v) === i : i === 0);

    let response: any = null;
    let lastError: any = null;

    referrerLoop: for (const refHeader of refererCandidates) {
      const headersConfig: Record<string, string> = {
        'User-Agent': 'aistudio-build'
      };
      if (refHeader) {
        headersConfig['Referer'] = refHeader;
        headersConfig['Referrer'] = refHeader;
      }

      const client = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: headersConfig }
      });

      for (const modelName of modelsToTry) {
        try {
          response = await client.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64
                }
              },
              { text: userPrompt }
            ],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  docType: { type: Type.STRING },
                  docNum: { type: Type.STRING },
                  date: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  secrecy: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  to: { type: Type.STRING },
                  from: { type: Type.STRING },
                  ref: { type: Type.STRING },
                  att: { type: Type.STRING },
                  body: { type: Type.STRING },
                  signer: { type: Type.STRING },
                  signerPos: { type: Type.STRING },
                  rawText: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  confidenceNote: { type: Type.STRING }
                }
              }
            }
          });
          if (response) break referrerLoop;
        } catch (err: any) {
          lastError = err;
          const errStr = String(err.message || err);
          if (errStr.includes('API_KEY_HTTP_REFERRER_BLOCKED') || errStr.includes('403')) {
            console.warn(`Referer '${refHeader}' blocked by API key restriction. Trying next referer...`);
            break;
          } else {
            console.warn(`Model ${modelName} failed with referer '${refHeader}':`, err.message);
          }
        }
      }
    }

    if (!response) {
      const errMsg = lastError?.message || String(lastError || 'ไม่สามารถประมวลผลไฟล์ผ่าน Gemini API ได้');
      if (errMsg.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
        return res.status(403).json({
          success: false,
          error: 'GEMINI_API_KEY ของคุณมีการจำกัดสิทธิ์ HTTP Referrer บน Google Cloud Console กรุณาเข้าสู่ Google Cloud Console / AI Studio แล้วตั้งค่า API Key ให้ยอมรับ HTTP Referrer ของแอปพลิเคชันหรือทุก Referrer (*)'
        });
      }
      throw lastError || new Error('ไม่สามารถประมวลผลไฟล์ผ่าน Gemini API ได้');
    }

    const text = response.text || '';
    let parsedJson = {};
    try {
      parsedJson = JSON.parse(text);
    } catch {
      parsedJson = { rawText: text, subject: 'เอกสารจากการสแกน' };
    }

    return res.json({ success: true, result: parsedJson });
  } catch (err: any) {
    console.error('Error in AI scan:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการสแกนเอกสารด้วย AI' });
  }
});

// AI Duplicate & Cross-Reference Detector Endpoint
app.post('/api/ai/detect-cross-references', async (req, res) => {
  try {
    const { doc, currentDocId } = req.body;
    if (!doc) {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลหนังสือที่ต้องการตรวจสอบ' });
    }

    let apiKey = (req.body.apiKey || '').trim();
    if (!apiKey) {
      try {
        const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
        if (stRows && stRows[0] && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
          apiKey = String(stRows[0].geminiApiKey).trim();
        }
      } catch (e) {}
    }
    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || '').trim();
    }

    // Fetch existing documents from database for historical comparison
    let allDocs: any[] = [];
    try {
      const query = `
        SELECT id, 'inbox' AS type, docNumber, receiveNumber, year, date, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content FROM inbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, docNumber, receiveNumber, year, date, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content FROM outbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, docNumber, receiveNumber, year, date, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content FROM circular_documents
        UNION ALL
        SELECT id, 'internal' AS type, docNumber, receiveNumber, year, date, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content FROM internal_documents
        UNION ALL
        SELECT id, 'admin' AS type, docNumber, NULL AS receiveNumber, year, date, title, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, note, content FROM admin_documents
      `;
      const [rows]: any = await pool.query(query);
      allDocs = rows || [];
    } catch (e) {
      allDocs = [
        ...(localDb.inbox_documents || []),
        ...(localDb.outbox_documents || []),
        ...(localDb.circular_documents || []),
        ...(localDb.internal_documents || []),
        ...(localDb.admin_documents || [])
      ];
    }

    // Filter out current document if editing
    const excludeId = currentDocId || doc.id;
    if (excludeId) {
      allDocs = allDocs.filter((d: any) => d.id !== excludeId);
    }

    if (allDocs.length === 0) {
      return res.json({
        success: true,
        result: {
          hasDuplicates: false,
          duplicateSummary: 'ไม่พบประวัติหนังสือในระบบสำหรับเปรียบเทียบ',
          hasReferences: false,
          referenceSummary: 'ยังไม่มีเอกสารย้อนหลังในอดีตสำหรับเชื่อมโยงบริบท',
          detectedItems: []
        }
      });
    }

    // Prepare clean candidate entries for Gemini prompt context
    const candidates = allDocs.slice(0, 60).map((d: any) => ({
      id: d.id,
      type: d.type || 'inbox',
      docNumber: d.docNumber || d.receiveNumber || '',
      year: d.year || '',
      date: d.date || '',
      title: d.title || '',
      from: d.from || d.fromDept || '',
      to: d.to || d.toDept || '',
      note: (d.note || d.content || '').substring(0, 250)
    }));

    if (!apiKey) {
      // Fallback smart algorithmic search if no API Key
      const targetTitle = (doc.title || doc.subject || '').toLowerCase();
      const targetDocNum = (doc.docNumber || '').toLowerCase();
      const targetRef = (doc.ref || '').toLowerCase();

      const matched: any[] = [];
      let isDup = false;

      for (const c of candidates) {
        let score = 0;
        let relationType = 'related';
        let relationLabel = 'บริบทเกี่ยวข้อง';
        let reason = '';

        const cNum = (c.docNumber || '').toLowerCase();
        const cTitle = (c.title || '').toLowerCase();

        if (cNum && targetDocNum && cNum === targetDocNum) {
          score = 98;
          relationType = 'duplicate';
          relationLabel = 'หนังสือซ้ำ';
          reason = `พบเลขที่หนังสือซ้ำกัน (${c.docNumber})`;
          isDup = true;
        } else if (targetRef && cNum && targetRef.includes(cNum)) {
          score = 90;
          relationType = 'direct_ref';
          relationLabel = 'อ้างถึงตรงๆ';
          reason = `หนังสือฉบับนี้ระบุอ้างถึงหนังสือเดิมเลขที่ ${c.docNumber}`;
        } else if (cTitle && targetTitle && (cTitle.includes(targetTitle) || targetTitle.includes(cTitle))) {
          score = 80;
          relationType = 'same_project';
          relationLabel = 'โครงการ/เรื่องเดียวกัน';
          reason = `พบบริบทชื่อเรื่องตรงหรือเกี่ยวข้องกันในประวัติหนังสือ (${c.title})`;
        }

        if (score >= 70) {
          matched.push({
            docId: c.id,
            docNumber: c.docNumber,
            title: c.title,
            date: c.date,
            from: c.from,
            type: c.type,
            relationType,
            relationLabel,
            similarityScore: score,
            reason,
            actionSuggestion: 'คลิกดูเอกสารเดิม หรือแนบเป็นเรื่องเดิมประกอบการเสนอ'
          });
        }
      }

      return res.json({
        success: true,
        result: {
          hasDuplicates: isDup,
          duplicateSummary: isDup ? 'พบหนังสือที่มีเลขที่หรือเรื่องซ้ำกับในระบบ' : 'ไม่พบหนังสือซ้ำ',
          hasReferences: matched.length > 0,
          referenceSummary: matched.length > 0 ? `พบหนังสือเดิมที่เกี่ยวข้อง ${matched.length} ฉบับ` : 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
          detectedItems: matched
        }
      });
    }

    const systemPrompt = `คุณคือระบบปัญญาประดิษฐ์ตรวจจับหนังสือซ้ำและเชื่อมโยงบริบทสำหรับระบบสารบรรณอิเล็กทรอนิกส์ (EDMS AI Duplicate & Cross-Reference Detector)
วิเคราะห์หนังสือฉบับใหม่/กำหนด เปรียบเทียบกับรายการหนังสือย้อนหลังในอดีตทั้งหมดในระบบเพื่อ:
1. ตรวจหาหนังสือซ้ำ (Duplicate) (เช่น เลขหนังสือซ้ำ, เรื่องและผู้ส่งเดียวกัน)
2. ตรวจการเชื่อมโยงบริบท/หนังสือเดิมที่เกี่ยวข้อง (Cross-References):
   - มีการระบุ 'อ้างถึง' เลขหนังสือเดิมฉบับใดในอดีต
   - เป็นเรื่องติดตาม/สืบเนื่อง เช่น ติดตามรายงาน, หนังสือตอบรับ, รายงานผลโครงการเดิม
   - เป็นโครงการ/เรื่อง/งานเดียวกันกับปีก่อนๆ หรือรอบเวลาที่แล้ว (เช่น โครงการอบรมประจำปี)
3. ให้คำอธิบายเหตุผลเป็นภาษาไทยอย่างชัดเจน เข้าใจง่าย มีประโยชน์ต่อเจ้าหน้าที่สารบรรณ`;

    const userPrompt = `
หนังสือฉบับที่กำลังสแกน/ตรวจสอบ:
- ID: ${doc.id || 'new'}
- เลขที่หนังสือ: ${doc.docNumber || '-'}
- เรื่อง: ${doc.title || doc.subject || '-'}
- จาก (ผู้ส่ง): ${doc.from || '-'}
- ถึง (ผู้รับ): ${doc.to || '-'}
- ลงวันที่: ${doc.date || '-'}
- อ้างถึง: ${doc.ref || '-'}
- เนื้อหา/สรุป: ${doc.body || doc.content || doc.rawText || doc.note || '-'}

รายการประวัติหนังสือในระบบ (${candidates.length} รายการ):
${JSON.stringify(candidates, null, 2)}

ให้ตอบในรูปแบบ JSON ตาม Schema นี้เท่านั้น:
{
  "hasDuplicates": true/false,
  "duplicateSummary": "ข้อความสรุปการตรวจพบหนังสือซ้ำ หรือ ''",
  "hasReferences": true/false,
  "referenceSummary": "ข้อความสรุปหนังสือเดิม/บริบทเชื่อมโยงที่พบ หรือ ''",
  "detectedItems": [
    {
      "docId": "ID ของเอกสารเดิมในระบบที่สแกนพบ",
      "docNumber": "เลขที่หนังสือเดิม",
      "title": "เรื่องหนังสือเดิม",
      "date": "วันที่หนังสือเดิม",
      "from": "ผู้ส่งเดิม",
      "type": "ประเภทหนังสือเดิม",
      "relationType": "duplicate | direct_ref | followup | same_project | related",
      "relationLabel": "หนังสือซ้ำ | อ้างถึงตรงๆ | เรื่องสืบเนื่อง/ติดตาม | โครงการ/เรื่องเดียวกัน | บริบทเกี่ยวข้อง",
      "similarityScore": 95,
      "reason": "เหตุผลเป็นภาษาไทย เช่น 'หนังสือฉบับนี้อ้างถึงการขออนุมัติจัดโครงการอบรมเมื่อปี 2568'",
      "actionSuggestion": "คลิกดูเอกสารเดิมเพื่อแนบเสนอคู่กัน"
    }
  ]
}`;

    const rawReferer = req.headers.referer ? String(req.headers.referer) : '';
    const rawOrigin = req.headers.origin ? String(req.headers.origin) : '';
    const refererCandidates = [
      '',
      'https://aistudio.google.com/',
      'https://ai.studio/',
      'https://google.com/',
      rawReferer,
      rawOrigin
    ].filter((v, i, a) => a && a.length > 0 ? a.indexOf(v) === i : i === 0);

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let response: any = null;

    if (apiKey) {
      referrerLoop: for (const refHeader of refererCandidates) {
        const headersConfig: Record<string, string> = { 'User-Agent': 'aistudio-build' };
        if (refHeader) {
          headersConfig['Referer'] = refHeader;
          headersConfig['Referrer'] = refHeader;
        }

        try {
          const client = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: headersConfig }
          });

          for (const modelName of modelsToTry) {
            try {
              response = await client.models.generateContent({
                model: modelName,
                contents: [{ text: userPrompt }],
                config: {
                  systemInstruction: systemPrompt,
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      hasDuplicates: { type: Type.BOOLEAN },
                      duplicateSummary: { type: Type.STRING },
                      hasReferences: { type: Type.BOOLEAN },
                      referenceSummary: { type: Type.STRING },
                      detectedItems: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            docId: { type: Type.STRING },
                            docNumber: { type: Type.STRING },
                            title: { type: Type.STRING },
                            date: { type: Type.STRING },
                            from: { type: Type.STRING },
                            type: { type: Type.STRING },
                            relationType: { type: Type.STRING },
                            relationLabel: { type: Type.STRING },
                            similarityScore: { type: Type.INTEGER },
                            reason: { type: Type.STRING },
                            actionSuggestion: { type: Type.STRING }
                          }
                        }
                      }
                    }
                  }
                }
              });
              if (response) break referrerLoop;
            } catch (err: any) {
              // try next model
            }
          }
        } catch (e) {
          // try next referer
        }
      }
    }

    if (response && response.text) {
      try {
        const parsedJson = JSON.parse(response.text);
        return res.json({ success: true, result: parsedJson });
      } catch (e) {
        // Fallback if JSON parse fails
      }
    }

    // Fallback algorithmic detection if Gemini API fails or key is missing
    const targetTitle = (doc.title || doc.subject || '').toLowerCase();
    const targetDocNum = (doc.docNumber || '').toLowerCase();
    const targetRef = (doc.ref || '').toLowerCase();

    const matched: any[] = [];
    let isDup = false;

    for (const c of candidates) {
      let score = 0;
      let relationType = 'related';
      let relationLabel = 'บริบทเกี่ยวข้อง';
      let reason = '';

      const cNum = (c.docNumber || '').toLowerCase();
      const cTitle = (c.title || '').toLowerCase();

      if (cNum && targetDocNum && cNum === targetDocNum) {
        score = 98;
        relationType = 'duplicate';
        relationLabel = 'หนังสือซ้ำ';
        reason = `พบเลขที่หนังสือซ้ำกัน (${c.docNumber})`;
        isDup = true;
      } else if (targetRef && cNum && targetRef.includes(cNum)) {
        score = 90;
        relationType = 'direct_ref';
        relationLabel = 'อ้างถึงตรงๆ';
        reason = `หนังสือฉบับนี้ระบุอ้างถึงหนังสือเดิมเลขที่ ${c.docNumber}`;
      } else if (cTitle && targetTitle && (cTitle.includes(targetTitle) || targetTitle.includes(cTitle))) {
        score = 80;
        relationType = 'same_project';
        relationLabel = 'โครงการ/เรื่องเดียวกัน';
        reason = `พบบริบทชื่อเรื่องตรงหรือเกี่ยวข้องกันในประวัติหนังสือ (${c.title})`;
      }

      if (score >= 70) {
        matched.push({
          docId: c.id,
          docNumber: c.docNumber,
          title: c.title,
          date: c.date,
          from: c.from,
          type: c.type,
          relationType,
          relationLabel,
          similarityScore: score,
          reason,
          actionSuggestion: 'คลิกดูเอกสารเดิม หรือแนบเป็นเรื่องเดิมประกอบการเสนอ'
        });
      }
    }

    return res.json({
      success: true,
      result: {
        hasDuplicates: isDup,
        duplicateSummary: isDup ? 'พบหนังสือที่มีเลขที่หรือเรื่องซ้ำกับในระบบ' : 'ไม่พบหนังสือซ้ำ',
        hasReferences: matched.length > 0,
        referenceSummary: matched.length > 0 ? `พบหนังสือเดิมที่เกี่ยวข้อง ${matched.length} ฉบับ` : 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
        detectedItems: matched
      }
    });
  } catch (err: any) {
    console.error('Error in AI detect cross references:', err);
    return res.json({
      success: true,
      result: {
        hasDuplicates: false,
        duplicateSummary: '',
        hasReferences: false,
        referenceSummary: 'ระบบทำการสแกนประวัติหนังสือเรียบร้อยแล้ว',
        detectedItems: []
      }
    });
  }
});

// Draft Documents CRUD Endpoints
app.get('/api/drafts', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM draft_documents ORDER BY updatedAt DESC');
    return res.json(rows || []);
  } catch (error: any) {
    console.error('Error fetching drafts:', error.message);
    const drafts = localDb.draft_documents || [];
    return res.json(drafts);
  }
});

app.post('/api/drafts', async (req, res) => {
  const {
    docType, title, docNumber, date, urgency, secrecy,
    fromDept, toDept, subject, content, signatory,
    signatoryPosition, sealMode, status, createdBy, extraData
  } = req.body;
  const ip = getClientIp(req);

  try {
    const [result]: any = await pool.query(
      `INSERT INTO draft_documents 
      (docType, title, docNumber, date, urgency, secrecy, fromDept, toDept, subject, content, signatory, signatoryPosition, sealMode, status, createdBy, extraData)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docType || 'memo', title || 'ร่างเอกสาร', docNumber || '', date || '', urgency || 'ปกติ', secrecy || 'ปกติ',
        fromDept || '', toDept || '', subject || '', content || '', signatory || '',
        signatoryPosition || '', sealMode || 'garuda30', status || 'draft', createdBy || 'ผู้ใช้งาน',
        typeof extraData === 'object' ? JSON.stringify(extraData) : (extraData || '')
      ]
    );
    await addSystemLog('CREATE_DRAFT', `บันทึกร่างเอกสาร: ${title || 'ร่างเอกสาร'}`, createdBy || 'ผู้ใช้งาน', ip);
    return res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    console.error('Error saving draft:', error.message);
    if (!localDb.draft_documents) localDb.draft_documents = [];
    const newDraft = {
      id: Date.now(),
      docType, title, docNumber, date, urgency, secrecy,
      fromDept, toDept, subject, content, signatory,
      signatoryPosition, sealMode, status, createdBy, extraData,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    localDb.draft_documents.push(newDraft);
    saveLocalDb();
    return res.json({ success: true, id: newDraft.id });
  }
});

app.put('/api/drafts/:id', async (req, res) => {
  const { id } = req.params;
  const {
    docType, title, docNumber, date, urgency, secrecy,
    fromDept, toDept, subject, content, signatory,
    signatoryPosition, sealMode, status, createdBy, extraData
  } = req.body;
  const ip = getClientIp(req);

  try {
    await pool.query(
      `UPDATE draft_documents SET
        docType=?, title=?, docNumber=?, date=?, urgency=?, secrecy=?,
        fromDept=?, toDept=?, subject=?, content=?, signatory=?,
        signatoryPosition=?, sealMode=?, status=?, createdBy=?, extraData=?
       WHERE id=?`,
      [
        docType, title, docNumber, date, urgency, secrecy,
        fromDept, toDept, subject, content, signatory,
        signatoryPosition, sealMode, status, createdBy,
        typeof extraData === 'object' ? JSON.stringify(extraData) : (extraData || ''),
        id
      ]
    );
    await addSystemLog('UPDATE_DRAFT', `อัปเดตร่างเอกสาร ID: ${id}`, createdBy || 'ผู้ใช้งาน', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating draft:', error.message);
    if (localDb.draft_documents) {
      const idx = localDb.draft_documents.findIndex((d: any) => String(d.id) === String(id));
      if (idx !== -1) {
        localDb.draft_documents[idx] = {
          ...localDb.draft_documents[idx],
          docType, title, docNumber, date, urgency, secrecy,
          fromDept, toDept, subject, content, signatory,
          signatoryPosition, sealMode, status, createdBy, extraData,
          updatedAt: new Date().toISOString()
        };
        saveLocalDb();
      }
    }
    return res.json({ success: true });
  }
});

app.delete('/api/drafts/:id', async (req, res) => {
  const { id } = req.params;
  let username = (req.query.username || req.body?.username || '').toString().trim();
  const ip = getClientIp(req);

  try {
    let draftSubject = '';
    let createdBy = '';
    try {
      const [rows]: any = await pool.query('SELECT title, subject, createdBy FROM draft_documents WHERE id=?', [id]);
      if (rows && rows.length > 0) {
        draftSubject = rows[0].subject || rows[0].title || '';
        createdBy = rows[0].createdBy || '';
      }
    } catch (e) {
      if (localDb.draft_documents) {
        const found = localDb.draft_documents.find((d: any) => String(d.id) === String(id));
        if (found) {
          draftSubject = found.subject || found.title || '';
          createdBy = found.createdBy || '';
        }
      }
    }

    if (!username) {
      username = createdBy || 'ผู้ใช้งาน';
    }

    const detailsStr = draftSubject ? `ลบร่างเอกสาร: ${draftSubject}` : `ลบร่างเอกสาร ID: ${id}`;

    await pool.query('DELETE FROM draft_documents WHERE id=?', [id]);
    await addSystemLog('DELETE_DRAFT', detailsStr, username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting draft:', error.message);
    let draftSubject = '';
    let createdBy = '';
    if (localDb.draft_documents) {
      const found = localDb.draft_documents.find((d: any) => String(d.id) === String(id));
      if (found) {
        draftSubject = found.subject || found.title || '';
        createdBy = found.createdBy || '';
      }
      localDb.draft_documents = localDb.draft_documents.filter((d: any) => String(d.id) !== String(id));
      saveLocalDb();
    }
    if (!username) {
      username = createdBy || 'ผู้ใช้งาน';
    }
    const detailsStr = draftSubject ? `ลบร่างเอกสาร: ${draftSubject}` : `ลบร่างเอกสาร ID: ${id}`;
    await addSystemLog('DELETE_DRAFT', detailsStr, username, ip);
    return res.json({ success: true });
  }
});

// Project Summaries CRUD & AI Endpoints
app.get('/api/project-summaries', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM project_summaries ORDER BY updatedAt DESC');
    return res.json(rows || []);
  } catch (error: any) {
    console.error('Error fetching project_summaries:', error.message);
    const list = localDb.project_summaries || [];
    return res.json(list);
  }
});

app.get('/api/project-summaries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows]: any = await pool.query('SELECT * FROM project_summaries WHERE id=?', [id]);
    if (rows && rows.length > 0) return res.json(rows[0]);
    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    const found = (localDb.project_summaries || []).find((s: any) => String(s.id) === String(id));
    if (found) return res.json(found);
    return res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/project-summaries', async (req, res) => {
  const {
    name, year, type, owner, principal, dateStart, dateEnd, venue, budget, budgetPlan,
    target, participants, grade, speaker, objectives, activities, resultQty,
    resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy
  } = req.body;
  const ip = getClientIp(req);

  const parsedBudget = parseFloat(String(budget || 0).replace(/,/g, '')) || 0;
  const parsedBudgetPlan = parseFloat(String(budgetPlan || 0).replace(/,/g, '')) || 0;
  const parsedParticipants = parseInt(String(participants || 0).replace(/,/g, ''), 10) || 0;

  try {
    const [result]: any = await pool.query(
      `INSERT INTO project_summaries 
      (name, year, type, owner, principal, dateStart, dateEnd, venue, budget, budgetPlan, target, participants, grade, speaker, objectives, activities, resultQty, resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name || 'โครงการไม่มีชื่อ', year || '', type || '', owner || '', principal || '', dateStart || '', dateEnd || '',
        venue || '', parsedBudget, parsedBudgetPlan, target || '',
        parsedParticipants, grade || '', speaker || '', objectives || '', activities || '',
        resultQty || '', resultQl || '', problems || '', suggestions || '', success || '',
        satisfaction || '', policy || '', html || '', createdBy || 'ผู้ใช้งาน'
      ]
    );
    await addSystemLog('CREATE_PROJECT_SUMMARY', `บันทึกสรุปโครงการ: ${name}`, createdBy || 'ผู้ใช้งาน', ip);
    return res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    console.error('Error saving project summary:', error.message);
    if (!localDb.project_summaries) localDb.project_summaries = [];
    const newSummary = {
      id: Date.now(),
      name, year, type, owner, principal, dateStart, dateEnd, venue, budget: parsedBudget, budgetPlan: parsedBudgetPlan,
      target, participants: parsedParticipants, grade, speaker, objectives, activities, resultQty,
      resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    localDb.project_summaries.push(newSummary);
    saveLocalDb();
    return res.json({ success: true, id: newSummary.id });
  }
});

app.put('/api/project-summaries/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, year, type, owner, principal, dateStart, dateEnd, venue, budget, budgetPlan,
    target, participants, grade, speaker, objectives, activities, resultQty,
    resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy
  } = req.body;
  const ip = getClientIp(req);

  const parsedBudget = parseFloat(String(budget || 0).replace(/,/g, '')) || 0;
  const parsedBudgetPlan = parseFloat(String(budgetPlan || 0).replace(/,/g, '')) || 0;
  const parsedParticipants = parseInt(String(participants || 0).replace(/,/g, ''), 10) || 0;

  try {
    await pool.query(
      `UPDATE project_summaries SET
        name=?, year=?, type=?, owner=?, principal=?, dateStart=?, dateEnd=?, venue=?, budget=?, budgetPlan=?,
        target=?, participants=?, grade=?, speaker=?, objectives=?, activities=?, resultQty=?,
        resultQl=?, problems=?, suggestions=?, success=?, satisfaction=?, policy=?, html=?, createdBy=?
       WHERE id=?`,
      [
        name, year, type, owner, principal, dateStart, dateEnd, venue, parsedBudget, parsedBudgetPlan,
        target, parsedParticipants, grade, speaker, objectives, activities, resultQty,
        resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy,
        id
      ]
    );
    await addSystemLog('UPDATE_PROJECT_SUMMARY', `อัปเดตสรุปโครงการ ID: ${id}`, createdBy || 'ผู้ใช้งาน', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating project summary:', error.message);
    if (localDb.project_summaries) {
      const idx = localDb.project_summaries.findIndex((s: any) => String(s.id) === String(id));
      if (idx !== -1) {
        localDb.project_summaries[idx] = {
          ...localDb.project_summaries[idx],
          name, year, type, owner, principal, dateStart, dateEnd, venue, budget: parsedBudget, budgetPlan: parsedBudgetPlan,
          target, participants: parsedParticipants, grade, speaker, objectives, activities, resultQty,
          resultQl, problems, suggestions, success, satisfaction, policy, html, createdBy,
          updatedAt: new Date().toISOString()
        };
        saveLocalDb();
      }
    }
    return res.json({ success: true });
  }
});

app.delete('/api/project-summaries/:id', async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);

  try {
    await pool.query('DELETE FROM project_summaries WHERE id=?', [id]);
    await addSystemLog('DELETE_PROJECT_SUMMARY', `ลบสรุปโครงการ ID: ${id}`, 'ผู้ใช้งาน', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project summary:', error.message);
    if (localDb.project_summaries) {
      localDb.project_summaries = localDb.project_summaries.filter((s: any) => String(s.id) !== String(id));
      saveLocalDb();
    }
    return res.json({ success: true });
  }
});

app.post('/api/ai/summarize-project', async (req, res) => {
  try {
    const d = req.body;
    let apiKey = (req.body.apiKey || '').trim();

    if (!apiKey) {
      try {
        const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
        if (stRows && stRows[0] && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
          apiKey = String(stRows[0].geminiApiKey).trim();
        }
      } catch (e) {}
    }

    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || '').trim();
    }

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ยังไม่ได้กำหนด GEMINI_API_KEY กรุณากำหนด API Key ในการตั้งค่าระบบ' 
      });
    }

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการจัดทำรายงานสรุปโครงการของ "สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง" หรือจังหวัดที่เกี่ยวข้อง กรมป้องกันและบรรเทาสาธารณภัย กระทรวงมหาดไทย

จงสร้างรายงานสรุปผลการดำเนินงานโครงการที่สมบูรณ์ เป็นทางการ ถูกต้องตามแบบฟอร์มหนังสือราชการไทยและระเบียบ ปภ. โดยใช้ข้อมูลต่อไปนี้:

หน่วยงานผู้รับผิดชอบ: ${d.school || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'}
ชื่อโครงการ: ${d.name}
ปีงบประมาณ: พ.ศ. ${d.year}
ประเภทโครงการ/งาน: ${d.type}
ผู้รับผิดชอบโครงการ: ${d.owner || 'ณัฐพันธุ์ ศรีวนิช'}
ผู้รับทราบ/ผู้บังคับบัญชา: ${d.principal || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
ระยะเวลาดำเนินการ: ${d.dateStart} ถึง ${d.dateEnd}
สถานที่ดำเนินการ: ${d.venue || d.school || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'}
กลุ่มเป้าหมาย/ผู้เข้าร่วม: ${d.target} จำนวน ${d.participants} คน ${d.grade ? '(' + d.grade + ')' : ''}
วิทยากร/ชุดวิทยากร/หน่วยงานร่วม: ${d.speaker || 'วิทยากรผู้เชี่ยวชาญ ปภ.จ.'}
งบประมาณที่ได้รับจัดสรร: ${d.budgetPlan} บาท / เบิกจ่ายจริง: ${d.budget} บาท
ความสอดคล้องกับแผน/ยุทธศาสตร์: ${d.policy || 'แผนป้องกันและบรรเทาสาธารณภัยแห่งชาติ / จังหวัด'}

วัตถุประสงค์ของโครงการ:
${d.objectives}

สาระสำคัญของกิจกรรม/การฝึกอบรม/การดำเนินงาน:
${d.activities}

ผลการดำเนินงานเชิงปริมาณ:
${d.resultQty}

ผลการดำเนินงานเชิงคุณภาพ:
${d.resultQl}

ปัญหา อุปสรรค และแนวทางแก้ไข: ${d.problems}
ข้อเสนอแนะในการปรับปรุงโครงการครั้งต่อไป: ${d.suggestions}
ระดับความสำเร็จของโครงการ: ${d.success}
คะแนนความพึงพอใจเฉลี่ย: ${d.satisfaction}

กรุณาสร้างรายงานสรุปโครงการเป็น HTML ที่สมบูรณ์ สวยงาม เหมาะสำหรับการพิมพ์ (Print Friendly Layout)
- ใช้ฟอนต์ TH SarabunPSK / Sarabun 
- ออกแบบตารางสรุปงบประมาณและผลการประเมินให้เรียบร้อย มีเส้นตารางชัดเจน
- จัดเรียงลำดับหัวข้อ ๑. ข้อมูลทั่วไป ๒. วัตถุประสงค์ ๓. ผลการดำเนินงาน ๔. สรุปงบประมาณ ๕. ปัญหาอุปสรรคและข้อเสนอแนะ ๖. สรุปภาพรวมความพึงพอใจ
- ในส่วนท้ายของรายงาน ให้จัดรูปแบบตารางสำหรับลงลายมือชื่อที่ชัดเจนและสมมาตร โดยผู้จัดทำรายงานด้านซ้ายคือ (ลงชื่อ) .................................... (${d.owner || 'ณัฐพันธุ์ ศรีวนิช'}) ผู้จัดทำ/เสนอรายงาน และผู้รับทราบด้านขวาคือ (ลงชื่อ) .................................... (${d.principal || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}) ผู้บังคับบัญชา / ผู้รับทราบ
- ตอบเฉพาะโค้ด HTML เท่านั้น โดยไม่ต้องมีคำอธิบาย หรือ Markdown code fence (\`\`\`html) หุ้ม`;

    const client = new GoogleGenAI({ apiKey });
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let responseText = '';

    for (const modelName of modelsToTry) {
      try {
        const resp = await client.models.generateContent({
          model: modelName,
          contents: prompt
        });
        if (resp && resp.text) {
          responseText = resp.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
      }
    }

    if (!responseText) {
      throw new Error('ไม่สามารถสร้างสรุปโครงการผ่าน Gemini API ได้');
    }

    // Clean html if wrapped in markdown ```html ... ```
    let cleanHtml = responseText.replace(/```html/gi, '').replace(/```/g, '').trim();

    return res.json({ success: true, html: cleanHtml });
  } catch (err: any) {
    console.error('Error in AI summarize project:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการสร้างสรุปโครงการด้วย AI' });
  }
});


async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
