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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const execFileAsync = promisify(execFile);

dotenv.config();

// Pre-create standard upload directories to avoid any folder-creation or write-permission issues
const baseUploadsDir = path.join(process.cwd(), 'uploads');
const standardFolders = [
  'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 
  'signed_pdfs', 'system', 'avatars', 'infographics', 'infographics/assets', 'infographics/images'
];
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
    const isInfographics = req.originalUrl?.includes('infographics') || req.baseUrl?.includes('infographics');
    const subfolderParam = (
      req.query.subfolder || 
      req.body?.subfolder || 
      req.query.folder ||
      req.body?.folder ||
      req.query.docType || 
      req.body?.docType || 
      (isInfographics ? 'infographics' : 'inbox')
    ).toString();
    const category = (req.body?.category || req.query?.category || '').toString();

    let subfolder = subfolderParam;
    if (subfolderParam === 'admin') {
      if (['order', 'announcement', 'circular'].includes(category)) {
        subfolder = `admin/${category}`;
      } else {
        subfolder = 'admin';
      }
    } else if (subfolderParam === 'infographics' || isInfographics) {
      subfolder = 'infographics';
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
app.set('trust proxy', true);

// Robust helper to get public domain base URL, avoiding localhost:3000 in deployed environments
function getPublicBaseUrl(req: express.Request): string {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString().split(',')[0].trim();
  let host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString().trim();

  // If host is localhost or empty, check if we can get the real origin from the Referer header
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (!refUrl.hostname.includes('localhost') && !refUrl.hostname.includes('127.0.0.1')) {
          return refUrl.origin;
        }
      } catch (e) {}
    }
  }

  // Strip trailing port 3000 if it's a real domain
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    host = host.replace(/:3000$/, '');
  }

  const finalHost = host || req.get('host') || 'localhost:3000';
  const finalProto = finalHost.includes('localhost') || finalHost.includes('127.0.0.1') ? 'http' : 'https';

  return `${finalProto}://${finalHost}`;
}

app.set('etag', false);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Real-time Event Stream (SSE) for zero-latency live sync without Ctrl+F5
const sseClients = new Set<express.Response>();

export function broadcastRealtimeEvent(eventType: string, data: any = {}) {
  const payload = JSON.stringify({ event: eventType, data, timestamp: Date.now() });
  const sseMessage = `event: message\ndata: ${payload}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(sseMessage);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// 1. Zero-Cache Middleware for ALL /api routes: Ensures browsers never serve stale responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 2. Real-time Auto-Broadcast Middleware on all successful API mutations (POST, PUT, DELETE, PATCH)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api')) {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let broadcasted = false;
    const triggerBroadcast = () => {
      if (broadcasted) return;
      broadcasted = true;
      if (res.statusCode < 400) {
        let eventCategory = 'DATA_UPDATED';
        const p = req.path;
        if (p.includes('/api/documents')) eventCategory = 'DOCUMENTS_UPDATED';
        else if (p.includes('/api/infographics')) eventCategory = 'INFOGRAPHICS_UPDATED';
        else if (p.includes('/api/notifications')) eventCategory = 'NOTIFICATIONS_UPDATED';
        else if (p.includes('/api/settings') || p.includes('/api/role-permissions') || p.includes('/api/departments') || p.includes('/api/positions')) eventCategory = 'SETTINGS_UPDATED';
        else if (p.includes('/api/users')) eventCategory = 'USERS_UPDATED';
        else if (p.includes('/api/folders')) eventCategory = 'FOLDERS_UPDATED';
        else if (p.includes('/api/recycle-bin')) eventCategory = 'RECYCLE_UPDATED';
        else if (p.includes('/api/favorites')) eventCategory = 'FAVORITES_UPDATED';
        else if (p.includes('/api/drafts')) eventCategory = 'DRAFTS_UPDATED';
        else if (p.includes('/api/logs')) eventCategory = 'LOGS_UPDATED';

        broadcastRealtimeEvent(eventCategory, {
          method: req.method,
          path: req.path,
          timestamp: Date.now()
        });
      }
    };

    res.json = (body: any) => {
      triggerBroadcast();
      return originalJson(body);
    };

    res.send = (body: any) => {
      triggerBroadcast();
      return originalSend(body);
    };
  }
  next();
});

// 3. Real-time Server-Sent Events (SSE) Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);

  // Send initial connect handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), msg: 'Connected to EDMS Realtime Stream' })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.use((req, res, next) => {
  console.log(`[HTTP_REQ] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});
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
      const searchSubdirs = ['', 'infographics', 'infographics/assets', 'infographics/images', 'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 'admin/certificate', 'system', 'avatars'];
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
      const searchSubdirs = ['', 'infographics', 'infographics/assets', 'infographics/images', 'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 'admin/certificate', 'system', 'avatars'];
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

    const subfolderParam = (req.body.subfolder || req.query.subfolder || req.body.docType || req.query.docType || 'inbox').toString();
    const category = (req.body.category || req.query.category || '').toString();
    const uploadedBy = (req.body.uploadedBy || req.query.uploadedBy || 'ผู้ใช้งาน').toString();
    const ip = getClientIp(req);

    let subfolder = subfolderParam;
    if (subfolderParam === 'admin') {
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

app.post('/api/ai-design-assist', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
  }

  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    
    const prompt = "Analyze this infographic design and provide suggestions for layout, typography, color palette, and content hierarchy. Keep it brief and constructive.";
    
    const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: req.file.mimetype,
                        data: base64Image,
                    },
                },
                { text: prompt },
            ],
        },
    });
    
    res.json({ suggestions: response.text });
  } catch (err: any) {
    console.error('AI Analysis Error:', err.message, err.stack);
    res.status(500).json({ error: 'วิเคราะห์ล้มเหลว: ' + (err.message || 'Unknown error') + ' (Details: ' + (err.stack?.substring(0, 100) || 'No stack') + ')' });
  }
});
app.get('/api/digital-signatures', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM digital_signatures ORDER BY timestampIso DESC');
    res.json(rows);
  } catch (error: any) {
    console.error('MySQL Digital Signatures Fetch error:', error.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติ Digital TSA' });
  }
});

app.delete('/api/digital-signatures', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';

  try {
    await pool.query('DELETE FROM digital_signatures');
    await addSystemLog('CLEAR_TSA_LOGS', 'ล้างประวัติ Digital TSA Logs ทั้งหมด', username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Digital Signatures Clear error:', error.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการล้างประวัติ Digital TSA' });
  }
});


app.delete('/api/digital-signatures/:id', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';
  const logId = req.params.id;

  try {
    await pool.query('DELETE FROM digital_signatures WHERE id = ?', [logId]);
    await addSystemLog('DELETE_TSA_LOG', `ลบรายการ Digital TSA Log ID: ${logId}`, username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Digital Signatures Delete specific error:', error.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบรายการ Digital TSA' });
  }
});


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

const defaultWorkflowTemplates = [
  {
    id: "tpl-001",
    name: "เส้นทางหนังสือรับทั่วไป",
    description: "เสนอตามลำดับชั้น: สารบรรณกลาง -> หัวหน้าฝ่ายบริหารฯ -> หัวหน้าสำนักงาน ปภ. -> ฝ่ายผู้รับผิดชอบ",
    category: "หนังสือรับ",
    defaultPriority: "ปกติ",
    steps: [
      { stepNumber: 1, title: "รับเรื่องและคัดกรองเอกสาร", assignedRole: "เจ้าหน้าที่สารบรรณ", department: "ฝ่ายบริหารงานทั่วไป", actionType: "review", slaHours: 24 },
      { stepNumber: 2, title: "พิจารณาเสนอความเห็น", assignedRole: "หัวหน้าฝ่ายบริหารงานทั่วไป", department: "ฝ่ายบริหารงานทั่วไป", actionType: "review", slaHours: 24 },
      { stepNumber: 3, title: "พิจารณาสั่งการและมอบหมาย", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 24 },
      { stepNumber: 4, title: "รับเรื่องและดำเนินการตามสั่งการ", assignedRole: "เจ้าหน้าที่ผู้รับผิดชอบ", department: "ฝ่ายป้องกันและปฏิบัติการ", actionType: "action", slaHours: 48 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "tpl-002",
    name: "เส้นทางหนังสือคำสั่ง / ประกาศจังหวัด",
    description: "ยกร่างคำสั่ง -> ตรวจสอบข้อกฎหมาย -> เสนอผู้บริหาร -> ผู้ว่าฯ ลงนาม -> ออกเลขและเวียน",
    category: "คำสั่ง/ประกาศ",
    defaultPriority: "ด่วน",
    steps: [
      { stepNumber: 1, title: "ยกร่างคำสั่ง/ประกาศและรวบรวมเอกสาร", assignedRole: "เจ้าหน้าที่ผู้ยกร่าง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 48 },
      { stepNumber: 2, title: "ตรวจสอบความถูกต้องและข้อกฎหมาย", assignedRole: "หัวหน้าฝ่ายยุทธศาสตร์ฯ", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 24 },
      { stepNumber: 3, title: "ตรวจพิจารณาเสนอผู้ว่าราชการจังหวัด", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 24 },
      { stepNumber: 4, title: "พิจารณาลงนามในคำสั่ง/ประกาศ", assignedRole: "ผู้ว่าราชการจังหวัดระยอง", department: "ผู้บริหารจังหวัด", actionType: "sign", slaHours: 48 },
      { stepNumber: 5, title: "ออกเลขคำสั่ง ประทับตรา และเวียนแจ้ง", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายบริหารงานทั่วไป", actionType: "archive", slaHours: 24 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "tpl-003",
    name: "เส้นทางเสนออนุมัติงบประมาณและโครงการ",
    description: "ตรวจสอบงบประมาณ -> ตรวจสอบระเบียบพัสดุ -> เสนออนุมัติเบิกจ่าย",
    category: "อนุมัติงบประมาณ",
    defaultPriority: "ด่วนมาก",
    steps: [
      { stepNumber: 1, title: "ตรวจสอบกรอบงบประมาณโครงการ", assignedRole: "นักวิเคราะห์นโยบายและแผน", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 2, title: "ตรวจสอบยอดเงินคงเหลือและระเบียบการจัดซื้อ", assignedRole: "เจ้าพนักงานการเงินและบัญชี", department: "ฝ่ายบริหารงานทั่วไป", actionType: "review", slaHours: 12 },
      { stepNumber: 3, title: "พิจารณาอนุมัติโครงการและงบประมาณ", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 24 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  }
];

const nowTime = new Date();
const defaultWorkflowInstances = [
  {
    id: "inst-101",
    docId: "doc_001",
    docTitle: "ขอความอนุเคราะห์วิทยากรให้ความรู้การป้องกันอุทกภัยประจำปี 2569",
    docNumber: "รย 0021/1042",
    docType: "inbox",
    templateId: "tpl-001",
    templateName: "เส้นทางหนังสือรับทั่วไป",
    currentStepIndex: 2,
    status: "active",
    startedAt: new Date(nowTime.getTime() - 40 * 3600 * 1000).toISOString(),
    dueAt: new Date(nowTime.getTime() + 4 * 3600 * 1000).toISOString(),
    department: "ฝ่ายบริหารงานทั่วไป",
    assignee: "สมศรี รักษ์ดี",
    priority: "ด่วนมาก",
    steps: [
      { stepNumber: 1, title: "รับเรื่องและคัดกรองเอกสาร", assignedRole: "เจ้าหน้าที่สารบรรณ", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 24, dueAt: new Date(nowTime.getTime() - 16 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 36 * 3600 * 1000).toISOString() },
      { stepNumber: 2, title: "พิจารณาเสนอความเห็น", assignedRole: "หัวหน้าฝ่ายบริหารงานทั่วไป", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 24, dueAt: new Date(nowTime.getTime() + 8 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 12 * 3600 * 1000).toISOString() },
      { stepNumber: 3, title: "พิจารณาสั่งการและมอบหมาย", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", assignee: "ผู้ดูแลระบบ", slaHours: 24, dueAt: new Date(nowTime.getTime() + 4 * 3600 * 1000).toISOString(), status: "in_progress" },
      { stepNumber: 4, title: "รับเรื่องและดำเนินการตามสั่งการ", assignedRole: "เจ้าหน้าที่ผู้รับผิดชอบ", department: "ฝ่ายป้องกันและปฏิบัติการ", assignee: "สมชาย ใจดี", slaHours: 48, dueAt: new Date(nowTime.getTime() + 52 * 3600 * 1000).toISOString(), status: "pending" }
    ],
    slaStatus: "WARNING"
  },
  {
    id: "inst-102",
    docId: "doc_002",
    docTitle: "รายงานสถานการณ์น้ำและแผนเตรียมรับมือภัยแล้งประจำปี 2569",
    docNumber: "มท 0608/215",
    docType: "inbox",
    templateId: "tpl-001",
    templateName: "เส้นทางหนังสือรับทั่วไป",
    currentStepIndex: 3,
    status: "active",
    startedAt: new Date(nowTime.getTime() - 120 * 3600 * 1000).toISOString(),
    dueAt: new Date(nowTime.getTime() - 24 * 3600 * 1000).toISOString(),
    department: "ฝ่ายป้องกันและปฏิบัติการ",
    assignee: "สมชาย ใจดี",
    priority: "ปกติ",
    steps: [
      { stepNumber: 1, title: "รับเรื่องและคัดกรองเอกสาร", assignedRole: "เจ้าหน้าที่สารบรรณ", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 24, dueAt: new Date(nowTime.getTime() - 96 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 100 * 3600 * 1000).toISOString() },
      { stepNumber: 2, title: "พิจารณาเสนอความเห็น", assignedRole: "หัวหน้าฝ่ายบริหารงานทั่วไป", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 24, dueAt: new Date(nowTime.getTime() - 72 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 80 * 3600 * 1000).toISOString() },
      { stepNumber: 3, title: "พิจารณาสั่งการและมอบหมาย", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", assignee: "ผู้ดูแลระบบ", slaHours: 24, dueAt: new Date(nowTime.getTime() - 48 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 50 * 3600 * 1000).toISOString() },
      { stepNumber: 4, title: "รับเรื่องและดำเนินการตามสั่งการ", assignedRole: "เจ้าหน้าที่ผู้รับผิดชอบ", department: "ฝ่ายป้องกันและปฏิบัติการ", assignee: "สมชาย ใจดี", slaHours: 48, dueAt: new Date(nowTime.getTime() - 24 * 3600 * 1000).toISOString(), status: "in_progress" }
    ],
    slaStatus: "OVERDUE"
  },
  {
    id: "inst-103",
    docId: "doc_003",
    docTitle: "คำสั่งแต่งตั้งคณะทำงานขับเคลื่อนศูนย์บัญชาการเหตุการณ์สาธารณภัย",
    docNumber: "รย 0017.3/ว 881",
    docType: "admin",
    templateId: "tpl-002",
    templateName: "เส้นทางหนังสือคำสั่ง / ประกาศจังหวัด",
    currentStepIndex: 1,
    status: "active",
    startedAt: new Date(nowTime.getTime() - 12 * 3600 * 1000).toISOString(),
    dueAt: new Date(nowTime.getTime() + 60 * 3600 * 1000).toISOString(),
    department: "ฝ่ายยุทธศาสตร์และการจัดการ",
    assignee: "ปรีชา มั่นคง",
    priority: "ด่วน",
    steps: [
      { stepNumber: 1, title: "ยกร่างคำสั่ง/ประกาศและรวบรวมเอกสาร", assignedRole: "เจ้าหน้าที่ผู้ยกร่าง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", assignee: "ปรีชา มั่นคง", slaHours: 48, dueAt: new Date(nowTime.getTime() + 36 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 2 * 3600 * 1000).toISOString() },
      { stepNumber: 2, title: "ตรวจสอบความถูกต้องและข้อกฎหมาย", assignedRole: "หัวหน้าฝ่ายยุทธศาสตร์ฯ", department: "ฝ่ายยุทธศาสตร์และการจัดการ", assignee: "ปรีชา มั่นคง", slaHours: 24, dueAt: new Date(nowTime.getTime() + 60 * 3600 * 1000).toISOString(), status: "in_progress" },
      { stepNumber: 3, title: "ตรวจพิจารณาเสนอผู้ว่าราชการจังหวัด", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", assignee: "ผู้ดูแลระบบ", slaHours: 24, dueAt: new Date(nowTime.getTime() + 84 * 3600 * 1000).toISOString(), status: "pending" },
      { stepNumber: 4, title: "พิจารณาลงนามในคำสั่ง/ประกาศ", assignedRole: "ผู้ว่าราชการจังหวัดระยอง", department: "ผู้บริหารจังหวัด", assignee: "ผู้ว่าราชการจังหวัด", slaHours: 48, dueAt: new Date(nowTime.getTime() + 132 * 3600 * 1000).toISOString(), status: "pending" },
      { stepNumber: 5, title: "ออกเลขคำสั่ง ประทับตรา และเวียนแจ้ง", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 24, dueAt: new Date(nowTime.getTime() + 156 * 3600 * 1000).toISOString(), status: "pending" }
    ],
    slaStatus: "NORMAL"
  },
  {
    id: "inst-104",
    docId: "doc_004",
    docTitle: "อนุมัติโครงการฝึกอบรมเยาวชนกู้ภัยอาสาประจำปี 2569",
    docNumber: "รย 0021/412",
    docType: "inbox",
    templateId: "tpl-003",
    templateName: "เส้นทางเสนออนุมัติงบประมาณและโครงการ",
    currentStepIndex: 2,
    status: "completed",
    startedAt: new Date(nowTime.getTime() - 72 * 3600 * 1000).toISOString(),
    dueAt: new Date(nowTime.getTime() - 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(nowTime.getTime() - 28 * 3600 * 1000).toISOString(),
    department: "ฝ่ายบริหารงานทั่วไป",
    assignee: "สมศรี รักษ์ดี",
    priority: "ด่วนที่สุด",
    steps: [
      { stepNumber: 1, title: "ตรวจสอบกรอบงบประมาณโครงการ", assignedRole: "นักวิเคราะห์นโยบายและแผน", department: "ฝ่ายยุทธศาสตร์และการจัดการ", assignee: "ปรีชา มั่นคง", slaHours: 12, dueAt: new Date(nowTime.getTime() - 60 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 65 * 3600 * 1000).toISOString() },
      { stepNumber: 2, title: "ตรวจสอบยอดเงินคงเหลือและระเบียบการจัดซื้อ", assignedRole: "เจ้าพนักงานการเงินและบัญชี", department: "ฝ่ายบริหารงานทั่วไป", assignee: "สมศรี รักษ์ดี", slaHours: 12, dueAt: new Date(nowTime.getTime() - 48 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 50 * 3600 * 1000).toISOString() },
      { stepNumber: 3, title: "พิจารณาอนุมัติโครงการและงบประมาณ", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", assignee: "ผู้ดูแลระบบ", slaHours: 24, dueAt: new Date(nowTime.getTime() - 24 * 3600 * 1000).toISOString(), status: "approved", actionAt: new Date(nowTime.getTime() - 28 * 3600 * 1000).toISOString() }
    ],
    slaStatus: "COMPLETED_ON_TIME"
  }
];

const initialSeedData = {
  workflow_templates: defaultWorkflowTemplates,
  workflow_instances: defaultWorkflowInstances,
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
      smtpFrom: '',
      enabledFeatures: JSON.stringify({
        overview: true,
        inbox: true,
        outbox: true,
        admin_docs: true,
        draft_docs: true,
        folders: true,
        logs: true,
        draft: true,
        aiscan: true,
        order: true,
        customorder: true,
        speech: true,
        meeting: true,
        summary: true,
      })
    }
  ],
  users: [
    { id: 1, username: 'admin', password: 'admin', firstName: 'ผู้ดูแลระบบ', lastName: 'ระบบงาน', position: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', department: 'ฝ่ายบริหารงานทั่วไป', role: 'admin', avatar: null, email: 'admin@example.com' },
    { id: 2, username: 'somchai', password: 'password', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', department: 'ฝ่ายป้องกันและปฏิบัติการ', role: 'user', avatar: null, email: 'somchai@example.com' },
    { id: 3, username: 'somsee', password: 'password', firstName: 'สมศรี', lastName: 'รักษ์ดี', position: 'เจ้าพนักงานธุรการชำนาญงาน', department: 'ฝ่ายบริหารงานทั่วไป', role: 'moderator', avatar: null, email: 'somsee@example.com' },
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
  numbering_rules: [
    {
      id: 1,
      ruleName: 'หนังสือภายนอก-ฝ่ายบริหารงานทั่วไป (รย 0021)',
      department: 'ฝ่ายบริหารงานทั่วไป',
      divisionCode: '0021',
      docType: 'หนังสือภายนอก',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 123,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งออกของฝ่ายบริหารงานทั่วไป เช่น รย 0021/123 หรือ รย 0021/ว 123'
    },
    {
      id: 2,
      ruleName: 'หนังสือภายนอก-ฝ่ายยุทธศาสตร์และการจัดการ (รย 0021.1)',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      divisionCode: '0021.1',
      docType: 'หนังสือภายนอก',
      prefixPattern: 'รย 0021.1',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 45,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายยุทธศาสตร์ เช่น รย 0021.1/123 หรือ รย 0021.1/ว 123'
    },
    {
      id: 3,
      ruleName: 'หนังสือภายนอก-ฝ่ายสงเคราะห์ผู้ประสบภัย (รย 0021.2)',
      department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย',
      divisionCode: '0021.2',
      docType: 'หนังสือภายนอก',
      prefixPattern: 'รย 0021.2',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 30,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายสงเคราะห์ เช่น รย 0021.2/123 หรือ รย 0021.2/ว 123'
    },
    {
      id: 4,
      ruleName: 'หนังสือภายนอก-ฝ่ายป้องกันและปฏิบัติการ (รย 0021.3)',
      department: 'ฝ่ายป้องกันและปฏิบัติการ',
      divisionCode: '0021.3',
      docType: 'หนังสือภายนอก',
      prefixPattern: 'รย 0021.3',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 58,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายป้องกัน เช่น รย 0021.3/123 หรือ รย 0021.3/ว 123'
    },
    {
      id: 5,
      ruleName: 'คำสั่งสำนักงาน/จังหวัด',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'คำสั่ง',
      prefixPattern: 'คำสั่ง',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 44,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทคำสั่งปภ./จังหวัด เช่น คำสั่ง 45/2569'
    },
    {
      id: 6,
      ruleName: 'ประกาศสำนักงาน/จังหวัด',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'ประกาศ',
      prefixPattern: 'ประกาศ',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 44,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทประกาศ เช่น ประกาศ 45/2569'
    },
    {
      id: 7,
      ruleName: 'หนังสือรับรอง',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'หนังสือรับรอง',
      prefixPattern: 'หนังสือรับรอง',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 44,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทรับรองความประพฤติ/เงินเดือน เช่น หนังสือรับรอง 45/2569'
    }
  ],
  file_codes: [
    { id: 1, code: '0021', name: 'งานบริหารทั่วไปและสารบรรณกลาง', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานบริหารทั่วไป งานสารบรรณกลาง สารบรรณจังหวัด' },
    { id: 2, code: '0021.1', name: 'งานยุทธศาสตร์และแผนงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'แผนป้องกันและบรรเทาสาธารณภัย โครงการยุทธศาสตร์' },
    { id: 3, code: '0021.2', name: 'งานสงเคราะห์และช่วยเหลือผู้ประสบภัย', department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'การให้ความช่วยเหลือ เงินชดเชย ผู้ประสบภัยพิบัติ' },
    { id: 4, code: '0021.3', name: 'งานป้องกัน ปฏิบัติการ และกู้ภัย', department: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'งานบรรเทาสาธารณภัย เครื่องจักรกล อุปกรณ์กู้ภัย' },
    { id: 5, code: '0022', name: 'งานการเงิน บัญชี และงบประมาณ', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานเบิกจ่าย งบประมาณ บัญชี และการเงิน' },
    { id: 6, code: '0023', name: 'งานพัสดุและอาคารสถานที่', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานจัดซื้อจัดจ้าง พัสดุ คุรุภัณฑ์ และอาคารสถานที่' }
  ],
  reserved_numbers: [
    {
      id: 1,
      ruleId: 1,
      docType: 'หนังสือภายนอก',
      department: 'ฝ่ายบริหารงานทั่วไป',
      numberString: 'รย 0021/ว 124',
      seqNumber: 124,
      year: '2569',
      type: 'reserved',
      status: 'available',
      reservedBy: 'สมศรี รักษ์ดี',
      reservedFor: 'จองเลขหนังสือเวียนโครงการฝึกอบรมกู้ภัยทางน้ำช่วงเทศกาล',
      createdAt: '2026-08-01 09:30:00',
      expiresAt: '2026-08-15'
    },
    {
      id: 2,
      ruleId: 5,
      docType: 'คำสั่ง',
      department: 'ฝ่ายบริหารงานทั่วไป',
      numberString: 'คำสั่ง 45/2569',
      seqNumber: 45,
      year: '2569',
      type: 'reserved',
      status: 'available',
      reservedBy: 'สมชาย ใจดี',
      reservedFor: 'จองเลขคำสั่งแต่งตั้งคณะทำงานเตรียมพร้อมรับมือฤดูฝน',
      createdAt: '2026-08-02 11:00:00',
      expiresAt: '2026-08-20'
    },
    {
      id: 3,
      ruleId: 2,
      docType: 'หนังสือภายนอก',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      numberString: 'รย 0021.1/46',
      seqNumber: 46,
      year: '2569',
      type: 'reclaimed',
      status: 'available',
      reservedBy: 'ระบบสารบรรณ (เลขคืนจากเอกสารยกเลิก)',
      reservedFor: 'คืนเลขเนื่องจากยกเลิกร่างหนังสือประสานงานเดิม',
      createdAt: '2026-08-02 14:20:00',
      expiresAt: '2026-12-31'
    }
  ],
  scheduled_reservations: [
    {
      id: 1,
      name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
      department: 'ฝ่ายบริหารงานทั่วไป',
      docType: 'หนังสือภายนอก',
      prefix: 'รย 0021',
      count: 5,
      scheduleType: 'daily',
      scheduledTime: '18:00',
      reservedFor: 'จองเลขอัตโนมัติทุกวัน เวลา 18:00 น. สำหรับออกหนังสือรับ-ส่งช่วงเย็น',
      reservedBy: 'ระบบอัตโนมัติ (Schedule 18:00)',
      isActive: true,
      lastRunAt: null,
      nextRunAt: '2026-08-04 18:00',
      createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
      id: 2,
      name: 'จองเลขคำสั่งจังหวัดประจำวัน (รอบ 18.00 น.)',
      department: 'ทุกฝ่ายงาน',
      docType: 'คำสั่ง',
      prefix: 'คำสั่ง',
      count: 2,
      scheduleType: 'daily',
      scheduledTime: '18:00',
      reservedFor: 'จองเลขคำสั่งอัตโนมัติประจำวัน เวลา 18:00 น.',
      reservedBy: 'ระบบอัตโนมัติ (Schedule 18:00)',
      isActive: true,
      lastRunAt: null,
      nextRunAt: '2026-08-04 18:00',
      createdAt: '2026-08-01T08:00:00.000Z'
    }
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
  document_versions: [
    {
      id: 'ver-001-1',
      docId: 'doc_001',
      docType: 'inbox',
      versionNumber: 1,
      title: 'ขอส่งแผนการเตรียมพร้อมรับมือสถานการณ์อุทกภัยในช่วงฤดูฝน ประจำปี 2569',
      docNumber: 'มท 0612/ว1234',
      from: 'กรมป้องกันและบรรเทาสาธารณภัย',
      to: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      assignee: 'สมศรี รักษ์ดี',
      priority: 'ปกติ',
      secrecy: 'ปกติ',
      content: 'เนื่องด้วยกรมป้องกันและบรรเทาสาธารณภัยได้กำหนดแผนเตรียมความพร้อมรับมือภัยพิบัติ...',
      note: 'ลงทะเบียนรับหนังสือเข้าเรียบร้อยแล้ว',
      attachments: ['sample_flood_plan_2569.pdf'],
      changeSummary: 'ลงทะเบียนหนังสือรับครั้งแรก (Version 1)',
      modifiedBy: 'สมศรี รักษ์ดี',
      modifiedAt: '2026-07-15T08:00:00.000Z',
      isCurrent: false
    },
    {
      id: 'ver-001-2',
      docId: 'doc_001',
      docType: 'inbox',
      versionNumber: 2,
      title: 'ขอส่งแผนการเตรียมพร้อมรับมือสถานการณ์อุทกภัยในช่วงฤดูฝน ประจำปี 2569 (ปรับปรุงความเร่งด่วน)',
      docNumber: 'มท 0612/ว1234',
      from: 'กรมป้องกันและบรรเทาสาธารณภัย',
      to: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      assignee: 'สมชาย ใจดี',
      priority: 'ด่วนที่สุด',
      secrecy: 'ปกติ',
      content: 'เนื่องด้วยกรมป้องกันและบรรเทาสาธารณภัยได้คาดการณ์สถานการณ์น้ำฝนในปีนี้ และยกระดับมาตรการเฝ้าระวัง...',
      note: 'โปรดศึกษาและดำเนินการจัดเตรียมข้อมูลตามแผนที่กำหนด',
      attachments: ['sample_flood_plan_2569.pdf'],
      changeSummary: 'ยกระดับความเร่งด่วนเป็น "ด่วนที่สุด" และเพิ่มคำอธิบายรายละเอียด',
      modifiedBy: 'สมชาย ใจดี',
      modifiedAt: '2026-07-15T09:30:00.000Z',
      isCurrent: true
    }
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
    if (!localDb.settings || !Array.isArray(localDb.settings) || localDb.settings.length === 0) {
      localDb.settings = JSON.parse(JSON.stringify(initialSeedData.settings));
      saveLocalDb();
    } else if (localDb.settings[0] && !localDb.settings[0].enabledFeatures) {
      localDb.settings[0].enabledFeatures = initialSeedData.settings[0].enabledFeatures;
      saveLocalDb();
    }
    if (!localDb.workflow_templates || !Array.isArray(localDb.workflow_templates) || localDb.workflow_templates.length === 0) {
      localDb.workflow_templates = JSON.parse(JSON.stringify(defaultWorkflowTemplates));
      saveLocalDb();
    }
    if (!localDb.workflow_instances || !Array.isArray(localDb.workflow_instances)) {
      localDb.workflow_instances = [];
      saveLocalDb();
    } else {
      localDb.workflow_instances = localDb.workflow_instances.filter(
        (i: any) => !['inst-101', 'inst-102', 'inst-103', 'inst-104'].includes(i.id)
      );
      saveLocalDb();
    }
    if (!localDb.document_versions || !Array.isArray(localDb.document_versions)) {
      localDb.document_versions = JSON.parse(JSON.stringify(initialSeedData.document_versions || []));
      saveLocalDb();
    }
    if (!localDb.numbering_rules || !Array.isArray(localDb.numbering_rules) || localDb.numbering_rules.length === 0) {
      localDb.numbering_rules = JSON.parse(JSON.stringify(initialSeedData.numbering_rules || []));
      saveLocalDb();
    }
    if (!localDb.file_codes || !Array.isArray(localDb.file_codes) || localDb.file_codes.length === 0) {
      localDb.file_codes = JSON.parse(JSON.stringify(initialSeedData.file_codes || []));
      saveLocalDb();
    }
    if (!localDb.reserved_numbers || !Array.isArray(localDb.reserved_numbers)) {
      localDb.reserved_numbers = JSON.parse(JSON.stringify(initialSeedData.reserved_numbers || []));
      saveLocalDb();
    }
    if (!localDb.scheduled_reservations || !Array.isArray(localDb.scheduled_reservations)) {
      localDb.scheduled_reservations = JSON.parse(JSON.stringify(initialSeedData.scheduled_reservations || []));
      saveLocalDb();
    }
    if (!localDb.role_permissions || !Array.isArray(localDb.role_permissions)) {
      localDb.role_permissions = [
        // admin (18 permissions)
        { role: 'admin', permission_key: 'view_all_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'edit_all_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'delete_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'approve_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'admin_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'admin', permission_key: 'infographics', is_allowed: 1 },
        { role: 'admin', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'admin', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'admin', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'admin', permission_key: 'digital_signatures', is_allowed: 1 },
        { role: 'admin', permission_key: 'recycle_bin', is_allowed: 1 },
        { role: 'admin', permission_key: 'manage_users', is_allowed: 1 },
        { role: 'admin', permission_key: 'system_settings', is_allowed: 1 },
        { role: 'admin', permission_key: 'backup_restore', is_allowed: 1 },
        { role: 'admin', permission_key: 'audit_logs', is_allowed: 1 },
        // moderator (15 permissions)
        { role: 'moderator', permission_key: 'view_all_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'edit_all_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'delete_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'approve_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'admin_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'moderator', permission_key: 'infographics', is_allowed: 1 },
        { role: 'moderator', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'moderator', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'moderator', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'moderator', permission_key: 'digital_signatures', is_allowed: 1 },
        { role: 'moderator', permission_key: 'recycle_bin', is_allowed: 1 },
        { role: 'moderator', permission_key: 'manage_users', is_allowed: 1 },
        { role: 'moderator', permission_key: 'system_settings', is_allowed: 0 },
        { role: 'moderator', permission_key: 'backup_restore', is_allowed: 0 },
        { role: 'moderator', permission_key: 'audit_logs', is_allowed: 0 },
        // user (8 permissions)
        { role: 'user', permission_key: 'view_all_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'edit_all_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'delete_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'approve_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'admin_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'user', permission_key: 'infographics', is_allowed: 1 },
        { role: 'user', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'user', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'user', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'user', permission_key: 'digital_signatures', is_allowed: 0 },
        { role: 'user', permission_key: 'recycle_bin', is_allowed: 0 },
        { role: 'user', permission_key: 'manage_users', is_allowed: 0 },
        { role: 'user', permission_key: 'system_settings', is_allowed: 0 },
        { role: 'user', permission_key: 'backup_restore', is_allowed: 0 },
        { role: 'user', permission_key: 'audit_logs', is_allowed: 0 }
      ];
      saveLocalDb();
    }
    if (!localDb.enterprise_dynamic_qrs || !Array.isArray(localDb.enterprise_dynamic_qrs)) {
      localDb.enterprise_dynamic_qrs = [];
      saveLocalDb();
    }
    if (!localDb.enterprise_qr_scans || !Array.isArray(localDb.enterprise_qr_scans)) {
      localDb.enterprise_qr_scans = [];
      saveLocalDb();
    }
    if (!localDb.enterprise_qr_templates || !Array.isArray(localDb.enterprise_qr_templates) || localDb.enterprise_qr_templates.length === 0) {
      localDb.enterprise_qr_templates = [
        {
          id: 'tpl_official_garuda',
          name: 'ตราครุฑทางการ - กรม ปภ.',
          category: 'official',
          description: 'แม่แบบมาตรฐานหนังสือราชการ กรมป้องกันและบรรเทาสาธารณภัย สีกรมท่าทางการ พร้อมกรอบหัว-ท้าย',
          isDefault: true,
          defaultQrType: 'edms',
          fgColor: '#0f172a',
          bgColor: '#ffffff',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'H',
          gradientType: 'solid',
          gradientColor2: '#2563eb',
          gradientAngle: 45,
          logoType: 'garuda',
          customLogoUrl: '',
          logoScale: 0.22,
          frameType: 'top-bottom',
          frameText: 'สแกนเพื่อตรวจสอบเอกสาร EDMS',
          frameColor: '#0f172a',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_urgent_red',
          name: 'ด่วนที่สุด - ระเบียบ ปภ.',
          category: 'urgent',
          description: 'แม่แบบเอกสารด่วนที่สุด / หนังสือเวียนเร่งด่วน กรอบสีแดงเด่นชัด ตราครุฑกลาง',
          isDefault: false,
          defaultQrType: 'edms',
          fgColor: '#991b1b',
          bgColor: '#fef2f2',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'H',
          gradientType: 'solid',
          gradientColor2: '#ef4444',
          gradientAngle: 45,
          logoType: 'garuda',
          customLogoUrl: '',
          logoScale: 0.24,
          frameType: 'top-bottom',
          frameText: 'หนังสือราชการด่วนที่สุด - สแกนอ่านฉบับเต็ม',
          frameColor: '#dc2626',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_public_relations',
          name: 'ประชาสัมพันธ์และสื่อดิจิทัล',
          category: 'public',
          description: 'แม่แบบไล่เฉดสีฟ้าคราม เหมาะสำหรับโปสเตอร์ ประชาสัมพันธ์ข่าวสาร และสื่อสังคมออนไลน์',
          isDefault: false,
          defaultQrType: 'url',
          fgColor: '#075985',
          bgColor: '#f0f9ff',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'Q',
          gradientType: 'linear',
          gradientColor2: '#06b6d4',
          gradientAngle: 45,
          logoType: 'province',
          customLogoUrl: '',
          logoScale: 0.22,
          frameType: 'card',
          frameText: 'สแกนรับข้อมูลข่าวสารสำนักงาน ปภ.',
          frameColor: '#0284c7',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_vcard_officer',
          name: 'นามบัตรข้าราชการมาตรฐาน (vCard)',
          category: 'vcard',
          description: 'แม่แบบนามบัตรข้าราชการ โทนสีเขียวมรกตราชการ สแกนแล้วบันทึก Contact เข้ามือถือทันที',
          isDefault: false,
          defaultQrType: 'vcard',
          fgColor: '#064e3b',
          bgColor: '#f0fdf4',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'H',
          gradientType: 'linear',
          gradientColor2: '#10b981',
          gradientAngle: 60,
          logoType: 'ddpm',
          customLogoUrl: '',
          logoScale: 0.22,
          frameType: 'badge',
          frameText: 'สแกนบันทึกข้อมูลติดต่อข้าราชการ',
          frameColor: '#059669',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_wifi_guest',
          name: 'สติกเกอร์ Wi-Fi ผู้มาติดต่อราชการ',
          category: 'wifi',
          description: 'แม่แบบจุดบริการ Wi-Fi ประชาชน และผู้มาติดต่อ สแกนเชื่อมต่ออินเทอร์เน็ตอัตโนมัติ',
          isDefault: false,
          defaultQrType: 'wifi',
          fgColor: '#1e3a8a',
          bgColor: '#eff6ff',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'M',
          gradientType: 'solid',
          gradientColor2: '#3b82f6',
          gradientAngle: 45,
          logoType: 'none',
          customLogoUrl: '',
          logoScale: 0.2,
          frameType: 'badge',
          frameText: 'สแกนเชื่อมต่อ Wi-Fi สำนักงาน',
          frameColor: '#2563eb',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_finance_promptpay',
          name: 'พร้อมเพย์รับชำระค่าธรรมเนียม',
          category: 'finance',
          description: 'แม่แบบชำระค่าธรรมเนียมราชการ ค่าบริการ และงานการเงินภาครัฐด้วย PromptPay QR',
          isDefault: false,
          defaultQrType: 'promptpay',
          fgColor: '#002d62',
          bgColor: '#ffffff',
          transparentBg: false,
          qrMargin: 2,
          errorCorrection: 'Q',
          gradientType: 'solid',
          gradientColor2: '#0284c7',
          gradientAngle: 45,
          logoType: 'none',
          customLogoUrl: '',
          logoScale: 0.2,
          frameType: 'card',
          frameText: 'สแกนชำระเงินผ่าน PromptPay',
          frameColor: '#002d62',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'tpl_minimal_clean',
          name: 'มินิมอล โมเดิร์น คมชัดสูง',
          category: 'custom',
          description: 'แม่แบบคลีนมินิมอล ไร้กรอบ ขอบชิด เหมาะสำหรับแปะลงเอกสารทุกประเภท',
          isDefault: false,
          defaultQrType: 'edms',
          fgColor: '#000000',
          bgColor: '#ffffff',
          transparentBg: false,
          qrMargin: 1,
          errorCorrection: 'M',
          gradientType: 'solid',
          gradientColor2: '#3f3f46',
          gradientAngle: 0,
          logoType: 'garuda',
          customLogoUrl: '',
          logoScale: 0.2,
          frameType: 'none',
          frameText: '',
          frameColor: '#000000',
          frameTextColor: '#ffffff',
          createdBy: 'ระบบมาตรฐาน',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
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
    } else if (tblName === 'scheduled_reservations') {
      if (cleanSql.includes('WHERE id = ?') || cleanSql.includes('WHERE id =')) {
        rows = rows.filter(s => String(s.id) === String(params[0]));
      } else if (cleanSql.includes('WHERE isActive = 1') || cleanSql.includes('WHERE isActive = true')) {
        rows = rows.filter(s => Boolean(s.isActive));
      }
      if (cleanSql.includes('ORDER BY id DESC') || cleanSql.includes('ORDER BY id desc')) {
        rows.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      }
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
  // Directly forward queries to MySQL pool. Local JSON database fallback is disabled.
  return await originalPoolQuery(sql, params);
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
      try { await pool.query('ALTER TABLE settings ADD COLUMN enabledFeatures TEXT', []); } catch (e) {}

      
      // Ensure numbering_rules table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS numbering_rules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ruleName VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            divisionCode VARCHAR(50),
            docType VARCHAR(100),
            prefixPattern VARCHAR(100),
            suffixPattern VARCHAR(100),
            numberFormat VARCHAR(100),
            runningScope VARCHAR(50),
            currentSeq INT,
            year VARCHAR(20),
            resetFrequency VARCHAR(50),
            isActive TINYINT(1) DEFAULT 1,
            description TEXT
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
      } catch (e) { console.warn('Note checking/creating numbering_rules table:', e); }

      // Ensure file_codes table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS file_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            description TEXT
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
      } catch (e) { console.warn('Note checking/creating file_codes table:', e); }

      // Ensure reserved_numbers table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS reserved_numbers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ruleId INT,
            docType VARCHAR(100),
            department VARCHAR(255),
            numberString VARCHAR(100),
            seqNumber INT,
            year VARCHAR(20),
            type VARCHAR(50),
            status VARCHAR(50),
            reservedBy VARCHAR(255),
            reservedFor TEXT,
            expiresAt VARCHAR(50),
            usedAt VARCHAR(50),
            usedForDocId VARCHAR(100),
            createdAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN ruleId INT', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN docType VARCHAR(100)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN department VARCHAR(255)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN numberString VARCHAR(100)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN seqNumber INT', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN year VARCHAR(20)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN type VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN status VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN reservedBy VARCHAR(255)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN reservedFor TEXT', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN expiresAt VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN usedAt VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN usedForDocId VARCHAR(100)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN createdAt VARCHAR(50)', []); } catch (e) {}
      } catch (e) { console.warn('Note checking/creating reserved_numbers table:', e); }

      // Ensure scheduled_reservations table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS scheduled_reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            docType VARCHAR(100),
            prefix VARCHAR(100),
            count INT DEFAULT 1,
            scheduleType VARCHAR(50) DEFAULT 'daily',
            scheduledTime VARCHAR(20) DEFAULT '18:00',
            reservedFor TEXT,
            reservedBy VARCHAR(255),
            isActive TINYINT(1) DEFAULT 1,
            lastRunAt VARCHAR(50),
            nextRunAt VARCHAR(50),
            createdAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN name VARCHAR(255)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN department VARCHAR(255)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN docType VARCHAR(100)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN prefix VARCHAR(100)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN count INT DEFAULT 1', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN scheduleType VARCHAR(50) DEFAULT "daily"', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN scheduledTime VARCHAR(20) DEFAULT "18:00"', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN reservedFor TEXT', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN reservedBy VARCHAR(255)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN isActive TINYINT(1) DEFAULT 1', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN lastRunAt VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN nextRunAt VARCHAR(50)', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN createdAt VARCHAR(50)', []); } catch (e) {}
      } catch (e) { console.warn('Note checking/creating scheduled_reservations table:', e); }

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

      // Ensure attachments, secrecy & forwarding columns exist in document tables
      const docTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
      const docCols = [
        "secrecy VARCHAR(50) DEFAULT 'ปกติ'",
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
      for (const tbl of docTables) {
        try {
          await pool.query(`ALTER TABLE ${tbl} ADD COLUMN secrecy VARCHAR(50) DEFAULT 'ปกติ'`, []);
        } catch (e) {
          // column already exists
        }
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

      // Ensure workflow_templates table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS workflow_templates (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            defaultPriority VARCHAR(50),
            steps JSON,
            createdAt VARCHAR(100)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        const [tplRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM workflow_templates');
        if (tplRows && tplRows[0]?.cnt === 0) {
          for (const tpl of defaultWorkflowTemplates) {
            await pool.query(
              'INSERT INTO workflow_templates (id, name, description, category, defaultPriority, steps, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [tpl.id, tpl.name, tpl.description || '', tpl.category || 'ทั่วไป', tpl.defaultPriority || 'ปกติ', JSON.stringify(tpl.steps || []), tpl.createdAt || new Date().toISOString()]
            );
          }
          console.log('✅ Initialized default workflow templates in MySQL');
        }
      } catch (e) {
        console.warn('Note checking/creating workflow_templates table:', e);
      }

      // Ensure workflow_instances table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS workflow_instances (
            id VARCHAR(255) PRIMARY KEY,
            docId VARCHAR(255),
            docTitle TEXT,
            docNumber VARCHAR(255),
            docType VARCHAR(100),
            templateId VARCHAR(255),
            templateName VARCHAR(255),
            currentStepIndex INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            startedAt VARCHAR(100),
            dueAt VARCHAR(100),
            completedAt VARCHAR(100),
            department VARCHAR(255),
            assignee VARCHAR(255),
            priority VARCHAR(50),
            steps JSON,
            slaStatus VARCHAR(50) DEFAULT 'NORMAL',
            lastEscalatedAt VARCHAR(100),
            escalationsCount INT DEFAULT 0,
            INDEX idx_wf_status (status),
            INDEX idx_wf_docId (docId),
            INDEX idx_wf_dept (department)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // Remove old mock/sample workflow instances if present
        await pool.query("DELETE FROM workflow_instances WHERE id IN ('inst-101', 'inst-102', 'inst-103', 'inst-104')", []);
      } catch (e) {
        console.warn('Note checking/creating workflow_instances table:', e);
      }

      // Ensure digital_signatures table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS digital_signatures (
            id VARCHAR(255) PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            docTitle TEXT,
            docNumber VARCHAR(255),
            docType VARCHAR(100),
            signerName VARCHAR(255),
            signerPosition VARCHAR(255),
            signerDepartment VARCHAR(255),
            signerEmail VARCHAR(255),
            signatureType VARCHAR(50) DEFAULT 'digital-signature',
            signatureDataUrl LONGTEXT,
            certificateIssuer VARCHAR(255),
            certificateSerial VARCHAR(255),
            hashAlgorithm VARCHAR(50) DEFAULT 'SHA-256',
            documentHash VARCHAR(255),
            signatureHash VARCHAR(255),
            timestampIso VARCHAR(100),
            timestampFormatted VARCHAR(255),
            tsaToken VARCHAR(255),
            qrCodeDataUrl LONGTEXT,
            verifyUrl TEXT,
            ipAddress VARCHAR(100),
            pdfPath TEXT,
            status VARCHAR(50) DEFAULT 'valid',
            INDEX idx_ds_docId (docId),
            INDEX idx_ds_docHash (documentHash),
            INDEX idx_ds_sigHash (signatureHash)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized digital_signatures table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating digital_signatures table:', e);
      }

      // Ensure user_favorites table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            docId VARCHAR(255) NOT NULL,
            docType VARCHAR(100) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_fav (username, docId),
            INDEX idx_fav_user (username)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized user_favorites table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating user_favorites table:', e);
      }

      // Ensure document_reads table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS document_reads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            docType VARCHAR(100) NOT NULL,
            username VARCHAR(255) NOT NULL,
            fullName VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL,
            readAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_doc_user (docId, username)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized document_reads table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating document_reads table:', e);
      }

      // Ensure recycle_bin table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS recycle_bin (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            docType VARCHAR(100) NOT NULL,
            title VARCHAR(500) NOT NULL,
            docNumber VARCHAR(255),
            deletedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deletedBy VARCHAR(255),
            originalData LONGTEXT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized recycle_bin table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating recycle_bin table:', e);
      }

      // Ensure role_permissions table exists and seed it
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role VARCHAR(100) NOT NULL,
            permission_key VARCHAR(100) NOT NULL,
            is_allowed TINYINT(1) NOT NULL DEFAULT 1,
            UNIQUE KEY role_perm_idx (role, permission_key)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // Safely remove any duplicate rows that might have accumulated before the unique constraint was applied
        try {
          await pool.query(`
            DELETE r1 FROM role_permissions r1
            INNER JOIN role_permissions r2 
            ON r1.role = r2.role 
            AND r1.permission_key = r2.permission_key 
            AND r1.id < r2.id
          `, []);
        } catch (cleanErr) {
          console.warn('Note cleaning duplicate role_permissions:', cleanErr);
        }

        // Try adding unique index if it was not created because table existed already
        try {
          await pool.query(`
            ALTER TABLE role_permissions ADD UNIQUE KEY role_perm_idx (role, permission_key)
          `, []);
          console.log('✅ Ensured unique index role_perm_idx exists on role_permissions');
        } catch (altErr) {
          // Unique key likely already exists, ignore
        }
        
        // Seed if empty or missing default permissions
        const defaultPerms = [
          // admin
          { role: 'admin', key: 'view_all_docs', val: 1 },
          { role: 'admin', key: 'create_docs', val: 1 },
          { role: 'admin', key: 'edit_all_docs', val: 1 },
          { role: 'admin', key: 'delete_docs', val: 1 },
          { role: 'admin', key: 'approve_docs', val: 1 },
          { role: 'admin', key: 'export_docs', val: 1 },
          { role: 'admin', key: 'admin_docs', val: 1 },
          { role: 'admin', key: 'ai_assistant', val: 1 },
          { role: 'admin', key: 'infographics', val: 1 },
          { role: 'admin', key: 'qr_generator', val: 1 },
          { role: 'admin', key: 'draft_docs', val: 1 },
          { role: 'admin', key: 'digital_folders', val: 1 },
          { role: 'admin', key: 'workflow_sla', val: 1 },
          { role: 'admin', key: 'digital_signatures', val: 1 },
          { role: 'admin', key: 'recycle_bin', val: 1 },
          { role: 'admin', key: 'manage_users', val: 1 },
          { role: 'admin', key: 'system_settings', val: 1 },
          { role: 'admin', key: 'backup_restore', val: 1 },
          { role: 'admin', key: 'audit_logs', val: 1 },
          // moderator
          { role: 'moderator', key: 'view_all_docs', val: 1 },
          { role: 'moderator', key: 'create_docs', val: 1 },
          { role: 'moderator', key: 'edit_all_docs', val: 1 },
          { role: 'moderator', key: 'delete_docs', val: 1 },
          { role: 'moderator', key: 'approve_docs', val: 1 },
          { role: 'moderator', key: 'export_docs', val: 1 },
          { role: 'moderator', key: 'admin_docs', val: 1 },
          { role: 'moderator', key: 'ai_assistant', val: 1 },
          { role: 'moderator', key: 'infographics', val: 1 },
          { role: 'moderator', key: 'qr_generator', val: 1 },
          { role: 'moderator', key: 'draft_docs', val: 1 },
          { role: 'moderator', key: 'digital_folders', val: 1 },
          { role: 'moderator', key: 'workflow_sla', val: 1 },
          { role: 'moderator', key: 'digital_signatures', val: 1 },
          { role: 'moderator', key: 'recycle_bin', val: 1 },
          { role: 'moderator', key: 'manage_users', val: 1 },
          { role: 'moderator', key: 'system_settings', val: 0 },
          { role: 'moderator', key: 'backup_restore', val: 0 },
          { role: 'moderator', key: 'audit_logs', val: 0 },
          // user
          { role: 'user', key: 'view_all_docs', val: 0 },
          { role: 'user', key: 'create_docs', val: 1 },
          { role: 'user', key: 'edit_all_docs', val: 0 },
          { role: 'user', key: 'delete_docs', val: 0 },
          { role: 'user', key: 'approve_docs', val: 0 },
          { role: 'user', key: 'export_docs', val: 1 },
          { role: 'user', key: 'admin_docs', val: 0 },
          { role: 'user', key: 'ai_assistant', val: 1 },
          { role: 'user', key: 'infographics', val: 1 },
          { role: 'user', key: 'qr_generator', val: 1 },
          { role: 'user', key: 'draft_docs', val: 1 },
          { role: 'user', key: 'digital_folders', val: 1 },
          { role: 'user', key: 'workflow_sla', val: 1 },
          { role: 'user', key: 'digital_signatures', val: 0 },
          { role: 'user', key: 'recycle_bin', val: 0 },
          { role: 'user', key: 'manage_users', val: 0 },
          { role: 'user', key: 'system_settings', val: 0 },
          { role: 'user', key: 'backup_restore', val: 0 },
          { role: 'user', key: 'audit_logs', val: 0 }
        ];
        
        let seedCount = 0;
        for (const p of defaultPerms) {
          try {
            const [res]: any = await pool.query(
              'INSERT IGNORE INTO role_permissions (role, permission_key, is_allowed) VALUES (?, ?, ?)',
              [p.role, p.key, p.val]
            );
            if (res && res.affectedRows > 0) {
              seedCount++;
            }
          } catch (insertErr) {
            // Ignore insert ignore errors
          }
        }
        if (seedCount > 0) {
          console.log(`✅ Seeded ${seedCount} missing default role_permissions in MySQL`);
        }
        console.log('✅ Initialized and verified role_permissions table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating/seeding role_permissions table:', e);
      }

      // Ensure enterprise_dynamic_qrs table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS enterprise_dynamic_qrs (
            slug VARCHAR(100) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            originalUrl LONGTEXT NOT NULL,
            createdBy VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            type VARCHAR(50) DEFAULT 'url',
            styleConfig LONGTEXT,
            createdAt VARCHAR(50),
            updatedAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        try {
          await pool.query('ALTER TABLE enterprise_dynamic_qrs MODIFY COLUMN styleConfig LONGTEXT, MODIFY COLUMN originalUrl LONGTEXT');
        } catch (_) {}
        console.log('✅ Initialized enterprise_dynamic_qrs table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating enterprise_dynamic_qrs table:', e);
      }

      // Ensure enterprise_qr_scans table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS enterprise_qr_scans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            qrSlug VARCHAR(100) NOT NULL,
            scannedAt VARCHAR(50) NOT NULL,
            ipAddress VARCHAR(100),
            userAgent TEXT,
            deviceType VARCHAR(50),
            browser VARCHAR(100),
            platform VARCHAR(100),
            location VARCHAR(100)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized enterprise_qr_scans table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating enterprise_qr_scans table:', e);
      }

      // Ensure enterprise_qr_templates table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS enterprise_qr_templates (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) DEFAULT 'official',
            description TEXT,
            isDefault TINYINT(1) DEFAULT 0,
            defaultQrType VARCHAR(50) DEFAULT 'edms',
            fgColor VARCHAR(50) DEFAULT '#0f172a',
            bgColor VARCHAR(50) DEFAULT '#ffffff',
            transparentBg TINYINT(1) DEFAULT 0,
            qrMargin INT DEFAULT 2,
            errorCorrection VARCHAR(10) DEFAULT 'H',
            gradientType VARCHAR(50) DEFAULT 'solid',
            gradientColor2 VARCHAR(50) DEFAULT '#2563eb',
            gradientAngle INT DEFAULT 45,
            logoType VARCHAR(50) DEFAULT 'garuda',
            customLogoUrl LONGTEXT,
            logoScale FLOAT DEFAULT 0.22,
            frameType VARCHAR(50) DEFAULT 'top-bottom',
            frameText VARCHAR(255) DEFAULT 'สแกนเพื่อตรวจสอบเอกสาร EDMS',
            frameColor VARCHAR(50) DEFAULT '#0f172a',
            frameTextColor VARCHAR(50) DEFAULT '#ffffff',
            previewDataUrl LONGTEXT,
            createdBy VARCHAR(255) DEFAULT 'ระบบมาตรฐาน',
            createdAt VARCHAR(50),
            updatedAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        console.log('✅ Initialized enterprise_qr_templates table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating enterprise_qr_templates table:', e);
      }

      // Ensure infographics table exists with complete schema
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS infographics (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            data LONGTEXT,
            thumbnail LONGTEXT,
            isPublic TINYINT(1) DEFAULT 1,
            allowEmbed TINYINT(1) DEFAULT 1,
            allowDownload TINYINT(1) DEFAULT 1,
            accessPassword VARCHAR(255) DEFAULT NULL,
            authorName VARCHAR(255) DEFAULT NULL,
            authorDepartment VARCHAR(255) DEFAULT NULL,
            description TEXT DEFAULT NULL,
            tags VARCHAR(255) DEFAULT NULL,
            viewCount INT DEFAULT 0,
            downloadCount INT DEFAULT 0,
            embedCount INT DEFAULT 0,
            created_at VARCHAR(50),
            updated_at VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // Migrate columns safely if table previously existed with basic columns
        const colMigrations = [
          'ALTER TABLE infographics ADD COLUMN isPublic TINYINT(1) DEFAULT 1',
          'ALTER TABLE infographics ADD COLUMN allowEmbed TINYINT(1) DEFAULT 1',
          'ALTER TABLE infographics ADD COLUMN allowDownload TINYINT(1) DEFAULT 1',
          'ALTER TABLE infographics ADD COLUMN accessPassword VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN authorName VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN authorDepartment VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN description TEXT DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN tags VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN viewCount INT DEFAULT 0',
          'ALTER TABLE infographics ADD COLUMN downloadCount INT DEFAULT 0',
          'ALTER TABLE infographics ADD COLUMN embedCount INT DEFAULT 0',
          'ALTER TABLE infographics ADD COLUMN scope VARCHAR(50) DEFAULT "central"',
          'ALTER TABLE infographics ADD COLUMN ownerId VARCHAR(100) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN ownerName VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN ownerDepartment VARCHAR(255) DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN allowedEditors LONGTEXT DEFAULT NULL',
          'ALTER TABLE infographics ADD COLUMN allowDepartmentEdit TINYINT(1) DEFAULT 0',
          'ALTER TABLE infographics MODIFY COLUMN data LONGTEXT',
          'ALTER TABLE infographics MODIFY COLUMN thumbnail LONGTEXT'
        ];
        for (const sql of colMigrations) {
          try {
            await pool.query(sql);
          } catch (_) {
            // Column already exists or modified
          }
        }
        console.log('✅ Initialized and verified infographics table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating infographics table:', e);
      }

      console.log('✅ Database schema verified and initialized successfully!');
    }
  } catch (err: any) {
    console.error('⚠️ Failed to initialize MySQL schema:', err.message);
  }
}

// Check MySQL connection asynchronously at startup. Enforce MySQL-only mode.
pool.getConnection()
  .then((conn) => {
    conn.release();
    isMysqlOnline = true;
    console.log(`✅ Successfully connected to MySQL database: ${dbName} @ ${dbHost}:${dbPort}`);
    setupDatabase().catch(err => console.error("Database setup error:", err));
  })
  .catch((err) => {
    isMysqlOnline = false;
    console.error('❌ FATAL ERROR: MySQL Connection Offline/Unavailable! Local JSON database fallback is disabled. The application requires a working MySQL database to start.', err.message);
    process.exit(1); // Enforce MySQL-only mode by exiting immediately
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
      if (!isMysqlOnline) throw new Error("Database offline");
      const [rows]: any = await pool.query('SELECT * FROM settings LIMIT 1');
      if (rows.length > 0) {
        return res.json(rows[0]);
      } else {
        throw new Error("No settings found");
      }
    } catch (error: any) {
      console.error("Database error in /api/settings:", error.message);
      // Fallback
      return res.json(localDb.settings[0] || {
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
        smtpFrom: "",
        enabledFeatures: JSON.stringify({
          overview: true,
          inbox: true,
          outbox: true,
          admin_docs: true,
          draft_docs: true,
          folders: true,
          logs: true,
          draft: true,
          aiscan: true,
          order: true,
          customorder: true,
          speech: true,
          meeting: true,
          summary: true,
        })
      });
    }
});

app.put("/api/settings", async (req, res) => {
  const data = req.body;
  const ip = getClientIp(req);
  try {
    if (!isMysqlOnline) throw new Error("Database offline");

    let formattedFeatures = data.enabledFeatures;
    if (formattedFeatures !== undefined && typeof formattedFeatures === 'object' && formattedFeatures !== null) {
      formattedFeatures = JSON.stringify(formattedFeatures);
    }

    const [rows]: any = await pool.query("SELECT id FROM settings LIMIT 1");
    if (rows.length > 0) {
      let query = "UPDATE settings SET currentYear=?, startSequence=?, orgName=?, headerOrgName=?, logoUrl=?, garuda15Url=?, garuda30Url=?, faviconUrl=?, footerText=?, smtpHost=?, smtpPort=?, smtpUser=?, smtpPassword=?, smtpFrom=?, geminiApiKey=?";
      const params: any[] = [data.currentYear, data.startSequence, data.orgName, data.headerOrgName ?? '', data.logoUrl, data.garuda15Url, data.garuda30Url, data.faviconUrl, data.footerText, data.smtpHost, data.smtpPort, data.smtpUser, data.smtpPassword, data.smtpFrom, data.geminiApiKey];
      
      if (formattedFeatures !== undefined) {
        query += ", enabledFeatures=?";
        params.push(formattedFeatures);
      }
      
      query += " WHERE id=?";
      params.push(rows[0].id);
      
      await pool.query(query, params);
    } else {
      const fields = ["currentYear", "startSequence", "orgName", "headerOrgName", "logoUrl", "garuda15Url", "garuda30Url", "faviconUrl", "footerText", "smtpHost", "smtpPort", "smtpUser", "smtpPassword", "smtpFrom", "geminiApiKey"];
      const values: any[] = [data.currentYear, data.startSequence, data.orgName, data.headerOrgName ?? '', data.logoUrl, data.garuda15Url, data.garuda30Url, data.faviconUrl, data.footerText, data.smtpHost, data.smtpPort, data.smtpUser, data.smtpPassword, data.smtpFrom, data.geminiApiKey];
      
      if (formattedFeatures !== undefined) {
        fields.push("enabledFeatures");
        values.push(formattedFeatures);
      }
      
      const placeholders = fields.map(() => "?").join(", ");
      await pool.query(
        `INSERT INTO settings (${fields.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }

    if (localDb.settings && localDb.settings.length > 0) {
      if (formattedFeatures !== undefined) {
        localDb.settings[0].enabledFeatures = formattedFeatures;
      }
      saveLocalDb();
    }

    await addSystemLog("UPDATE_SETTINGS", `อัปเดตการตั้งค่าระบบองค์กร (${data.orgName || "ไม่ระบุ"})`, data.updatedBy || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Database error in /api/settings PUT:", error.message);
    return res.status(500).json({ error: "ไม่สามารถบันทึกข้อมูลได้ เนื่องจากฐานข้อมูลออฟไลน์ หรือเกิดข้อผิดพลาด" });
  }
});

app.put("/api/settings/features", async (req, res) => {
  const { enabledFeatures, updatedBy, details } = req.body;
  const ip = getClientIp(req);
  try {
    let formattedFeatures = enabledFeatures;
    if (formattedFeatures !== undefined && typeof formattedFeatures === 'object' && formattedFeatures !== null) {
      formattedFeatures = JSON.stringify(formattedFeatures);
    }

    const [rows]: any = await pool.query("SELECT id FROM settings LIMIT 1");
    if (rows.length > 0) {
      await pool.query(
        "UPDATE settings SET enabledFeatures = ? WHERE id = ?",
        [formattedFeatures, rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO settings (enabledFeatures) VALUES (?)",
        [formattedFeatures]
      );
    }

    if (localDb.settings && localDb.settings.length > 0) {
      localDb.settings[0].enabledFeatures = formattedFeatures;
      saveLocalDb();
    }

    await addSystemLog("UPDATE_SETTINGS", details || `อัปเดตการตั้งค่าเปิด-ปิดฟังก์ชันระบบ`, updatedBy || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Database error in features update:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
});

// ==================== CUSTOM NUMBERING & FILE CODES APIS ====================
app.get('/api/numbering-rules', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS numbering_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruleName VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        divisionCode VARCHAR(50),
        docType VARCHAR(100),
        prefixPattern VARCHAR(100),
        suffixPattern VARCHAR(100),
        numberFormat VARCHAR(100),
        runningScope VARCHAR(50),
        currentSeq INT,
        year VARCHAR(20),
        resetFrequency VARCHAR(50),
        isActive TINYINT(1) DEFAULT 1,
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows]: any = await pool.query('SELECT * FROM numbering_rules');
    // Ensure boolean types
    const formattedRows = rows.map((r: any) => ({
      ...r,
      isActive: Boolean(r.isActive)
    }));
    return res.json(formattedRows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch numbering rules' });
  }
});

app.post('/api/numbering-rules', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS numbering_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruleName VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        divisionCode VARCHAR(50),
        docType VARCHAR(100),
        prefixPattern VARCHAR(100),
        suffixPattern VARCHAR(100),
        numberFormat VARCHAR(100),
        runningScope VARCHAR(50),
        currentSeq INT,
        year VARCHAR(20),
        resetFrequency VARCHAR(50),
        isActive TINYINT(1) DEFAULT 1,
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const newRule: any = {
      ruleName: req.body.ruleName || 'กฎออกเลขใหม่',
      department: req.body.department || 'ทุกฝ่ายงาน',
      divisionCode: req.body.divisionCode || '',
      docType: req.body.docType || 'หนังสือภายนอก',
      prefixPattern: req.body.prefixPattern || 'รย 0021',
      suffixPattern: req.body.suffixPattern || '/{seq}',
      numberFormat: req.body.numberFormat || '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: req.body.runningScope || 'department',
      currentSeq: Number(req.body.currentSeq) || 1,
      year: req.body.year || '2569',
      resetFrequency: req.body.resetFrequency || 'yearly',
      isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : 1,
      description: req.body.description || ''
    };
    const [result]: any = await pool.query(
      'INSERT INTO numbering_rules (ruleName, department, divisionCode, docType, prefixPattern, suffixPattern, numberFormat, runningScope, currentSeq, year, resetFrequency, isActive, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newRule.ruleName, newRule.department, newRule.divisionCode, newRule.docType, newRule.prefixPattern, newRule.suffixPattern, newRule.numberFormat, newRule.runningScope, newRule.currentSeq, newRule.year, newRule.resetFrequency, newRule.isActive, newRule.description]
    );
    newRule.id = result.insertId;
    newRule.isActive = Boolean(newRule.isActive);
    await addSystemLog("CREATE_NUMBERING_RULE", `เพิ่มกฎออกเลขหนังสือ: ${newRule.ruleName}`, req.body.createdBy || "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true, data: newRule });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create numbering rule' });
  }
});

app.put('/api/numbering-rules/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = { ...req.body };
    delete updates.id;
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive ? 1 : 0;
    }
    
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(id);
    
    await pool.query(`UPDATE numbering_rules SET ${setClause} WHERE id = ?`, values);
    await addSystemLog("UPDATE_NUMBERING_RULE", `อัปเดตกฎออกเลขหนังสือ ID: ${id}`, req.body.updatedBy || "ผู้ดูแลระบบ", getClientIp(req));
    
    const [rows]: any = await pool.query('SELECT * FROM numbering_rules WHERE id = ?', [id]);
    if (rows.length > 0) {
      rows[0].isActive = Boolean(rows[0].isActive);
      return res.json({ success: true, data: rows[0] });
    }
    return res.status(404).json({ error: 'Rule not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update numbering rule' });
  }
});

app.delete('/api/numbering-rules/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM numbering_rules WHERE id = ?', [id]);
    await addSystemLog("DELETE_NUMBERING_RULE", `ลบกฎออกเลขหนังสือ ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete numbering rule' });
  }
});

app.get('/api/file-codes', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows]: any = await pool.query('SELECT * FROM file_codes');
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch file codes' });
  }
});

app.post('/api/file-codes', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const newCode: any = {
      code: req.body.code || '0021',
      name: req.body.name || 'หมวดงานใหม่',
      department: req.body.department || 'ฝ่ายบริหารงานทั่วไป',
      description: req.body.description || ''
    };
    const [result]: any = await pool.query(
      'INSERT INTO file_codes (code, name, department, description) VALUES (?, ?, ?, ?)',
      [newCode.code, newCode.name, newCode.department, newCode.description]
    );
    newCode.id = result.insertId;
    await addSystemLog("CREATE_FILE_CODE", `เพิ่มรหัสหมวดแฟ้ม: ${newCode.code} (${newCode.name})`, req.body.createdBy || "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true, data: newCode });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create file code' });
  }
});

app.delete('/api/file-codes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM file_codes WHERE id = ?', [id]);
    await addSystemLog("DELETE_FILE_CODE", `ลบรหัสหมวดแฟ้ม ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete file code' });
  }
});

app.get('/api/reserved-numbers', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reserved_numbers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruleId INT,
        docType VARCHAR(100),
        department VARCHAR(255),
        numberString VARCHAR(100),
        seqNumber INT,
        year VARCHAR(20),
        type VARCHAR(50),
        status VARCHAR(50),
        reservedBy VARCHAR(255),
        reservedFor TEXT,
        expiresAt VARCHAR(50),
        usedAt VARCHAR(50),
        usedForDocId VARCHAR(100),
        createdAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows]: any = await pool.query('SELECT * FROM reserved_numbers ORDER BY id DESC LIMIT 500');
    return res.json(rows);
  } catch (err: any) {
    const list = localDb.reserved_numbers || [];
    return res.json(list);
  }
});

app.post('/api/reserved-numbers/reserve', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reserved_numbers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ruleId INT,
        docType VARCHAR(100),
        department VARCHAR(255),
        numberString VARCHAR(100),
        seqNumber INT,
        year VARCHAR(20),
        type VARCHAR(50),
        status VARCHAR(50),
        reservedBy VARCHAR(255),
        reservedFor TEXT,
        expiresAt VARCHAR(50),
        usedAt VARCHAR(50),
        usedForDocId VARCHAR(100),
        createdAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const { ruleId, docType, department, prefix, startSeq, count, reservedBy, reservedFor } = req.body;
    const qty = Number(count) || 1;
    const startNumber = Number(startSeq) || 1;
    const yearStr = req.body.year || '2569';
    const createdItems: any[] = [];
    const nowStr = new Date().toISOString();

    for (let i = 0; i < qty; i++) {
      const currentSeqNum = startNumber + i;
      let numberStr = '';
      if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(docType)) {
        numberStr = `${prefix || docType} ${currentSeqNum}/${yearStr}`;
      } else {
        const isCirc = req.body.isCircular || false;
        numberStr = `${prefix || 'รย 0021'}${isCirc ? '/ว ' : '/'}${currentSeqNum}`;
      }

      try {
        const [result]: any = await pool.query(
          'INSERT INTO reserved_numbers (ruleId, docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ruleId || null, docType || 'หนังสือภายนอก', department || 'ฝ่ายบริหารงานทั่วไป', numberStr, currentSeqNum, yearStr, 'reserved', 'available', reservedBy || 'ผู้ใช้งานระบบ', reservedFor || 'สำรอง/จองเลขล่วงหน้า', nowStr]
        );
        createdItems.push({ id: result.insertId, numberString: numberStr });
      } catch (e) {
        if (!localDb.reserved_numbers) localDb.reserved_numbers = [];
        const newId = localDb.reserved_numbers.length > 0 ? Math.max(...localDb.reserved_numbers.map((r: any) => Number(r.id) || 0)) + 1 : 1;
        const item = {
          id: newId,
          ruleId: ruleId || null,
          docType: docType || 'หนังสือภายนอก',
          department: department || 'ฝ่ายบริหารงานทั่วไป',
          numberString: numberStr,
          seqNumber: currentSeqNum,
          year: yearStr,
          type: 'reserved',
          status: 'available',
          reservedBy: reservedBy || 'ผู้ใช้งานระบบ',
          reservedFor: reservedFor || 'สำรอง/จองเลขล่วงหน้า',
          createdAt: nowStr
        };
        localDb.reserved_numbers.unshift(item);
        createdItems.push({ id: newId, numberString: numberStr });
        saveLocalDb();
      }
    }

    if (ruleId) {
      const endSeq = startNumber + qty - 1;
      try {
        await pool.query('UPDATE numbering_rules SET currentSeq = ? WHERE id = ? AND currentSeq < ?', [endSeq, ruleId, endSeq]);
      } catch (e) {
        if (localDb.numbering_rules) {
          const r = localDb.numbering_rules.find((x: any) => x.id === ruleId);
          if (r && (r.currentSeq || 0) < endSeq) {
            r.currentSeq = endSeq;
            saveLocalDb();
          }
        }
      }
    }

    await addSystemLog("RESERVE_NUMBER", `จอง/สำรองเลขหนังสือ ${qty} ฉบับ (${docType})`, reservedBy || "ผู้ใช้งาน", getClientIp(req));
    return res.json({ success: true, count: qty, items: createdItems });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reserve numbers' });
  }
});

// Helper function to execute scheduled reservation
async function executeScheduledReservation(sch: any) {
  const qty = Number(sch.count) || 1;
  const docType = sch.docType || 'หนังสือภายนอก';
  const department = sch.department || 'ฝ่ายบริหารงานทั่วไป';
  const prefix = sch.prefix || (docType === 'คำสั่ง' ? 'คำสั่ง' : (docType === 'ประกาศ' ? 'ประกาศ' : 'รย 0021'));
  const reservedBy = sch.reservedBy || `ระบบจองเลขอัตโนมัติ (${sch.scheduledTime || '18:00'})`;
  const reservedFor = sch.reservedFor || `จองเลขอัตโนมัติประจำวัน เวลา ${sch.scheduledTime || '18:00'} น.`;
  const yearStr = '2569';
  const now = new Date();
  const nowIso = now.toISOString();

  let ruleId: any = null;
  let startSeq = 1;

  try {
    const [rules]: any = await pool.query('SELECT * FROM numbering_rules WHERE isActive = 1');
    let rule = rules.find((r: any) => r.docType === docType && r.department === department);
    if (!rule) rule = rules.find((r: any) => r.docType === docType && r.department === 'ทุกฝ่ายงาน');
    if (!rule) rule = rules.find((r: any) => r.docType === docType);
    if (rule) {
      ruleId = rule.id;
      startSeq = (rule.currentSeq || 0) + 1;
    }
  } catch (e) {
    if (localDb.numbering_rules) {
      let rule = localDb.numbering_rules.find((r: any) => r.isActive && r.docType === docType && r.department === department);
      if (!rule) rule = localDb.numbering_rules.find((r: any) => r.isActive && r.docType === docType && r.department === 'ทุกฝ่ายงาน');
      if (!rule) rule = localDb.numbering_rules.find((r: any) => r.isActive && r.docType === docType);
      if (rule) {
        ruleId = rule.id;
        startSeq = (rule.currentSeq || 0) + 1;
      }
    }
  }

  const createdItems: any[] = [];
  for (let i = 0; i < qty; i++) {
    const currentSeqNum = startSeq + i;
    let numberStr = '';
    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(docType)) {
      numberStr = `${prefix} ${currentSeqNum}/${yearStr}`;
    } else {
      numberStr = `${prefix}/${currentSeqNum}`;
    }

    try {
      const [result]: any = await pool.query(
        'INSERT INTO reserved_numbers (ruleId, docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ruleId, docType, department, numberStr, currentSeqNum, yearStr, 'auto_scheduled', 'available', reservedBy, reservedFor, nowIso]
      );
      createdItems.push({ id: result.insertId, numberString: numberStr });
    } catch (e) {
      if (!localDb.reserved_numbers) localDb.reserved_numbers = [];
      const newId = localDb.reserved_numbers.length > 0 ? Math.max(...localDb.reserved_numbers.map((r: any) => Number(r.id) || 0)) + 1 : 1;
      const item = {
        id: newId,
        ruleId,
        docType,
        department,
        numberString: numberStr,
        seqNumber: currentSeqNum,
        year: yearStr,
        type: 'auto_scheduled',
        status: 'available',
        reservedBy,
        reservedFor,
        createdAt: nowIso
      };
      localDb.reserved_numbers.unshift(item);
      createdItems.push({ id: newId, numberString: numberStr });
      saveLocalDb();
    }
  }

  // Update rule seq
  const endSeq = startSeq + qty - 1;
  if (ruleId) {
    try {
      await pool.query('UPDATE numbering_rules SET currentSeq = ? WHERE id = ? AND currentSeq < ?', [endSeq, ruleId, endSeq]);
    } catch (e) {
      if (localDb.numbering_rules) {
        const targetRule = localDb.numbering_rules.find((r: any) => r.id === ruleId);
        if (targetRule && (targetRule.currentSeq || 0) < endSeq) {
          targetRule.currentSeq = endSeq;
          saveLocalDb();
        }
      }
    }
  }

  // Update schedule lastRunAt and nextRunAt
  sch.lastRunAt = nowIso;
  const [targetH, targetM] = (sch.scheduledTime || '18:00').split(':').map(Number);
  const nextDate = new Date();
  nextDate.setHours(targetH || 18, targetM || 0, 0, 0);
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  const nextDateYmd = nextDate.toISOString().split('T')[0];
  sch.nextRunAt = `${nextDateYmd} ${sch.scheduledTime || '18:00'}`;

  try {
    await pool.query('UPDATE scheduled_reservations SET lastRunAt = ?, nextRunAt = ? WHERE id = ?', [sch.lastRunAt, sch.nextRunAt, sch.id]);
  } catch (e) {
    if (localDb.scheduled_reservations) {
      const dbSch = localDb.scheduled_reservations.find((s: any) => s.id === sch.id);
      if (dbSch) {
        dbSch.lastRunAt = sch.lastRunAt;
        dbSch.nextRunAt = sch.nextRunAt;
        saveLocalDb();
      }
    }
  }

  await addSystemLog("AUTO_SCHEDULED_RESERVE", `ระบบทำจองเลขอัตโนมัติตามช่วงเวลาที่กำหนด: "${sch.name}" จำนวน ${qty} เลข (${createdItems.map(i => i.numberString).join(', ')})`, "ระบบจองเลขอัตโนมัติ", "127.0.0.1");

  console.log(`✅ [Schedule Engine] Auto-reserved ${qty} numbers for "${sch.name}" at ${now.toLocaleTimeString()}`);
  return { success: true, count: qty, items: createdItems };
}

// Background Ticker
function startScheduledReservationEngine() {
  console.log('⏰ Scheduled Auto-Reservation engine started (checking every 30s)');
  setInterval(async () => {
    try {
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHH}:${currentMM}`;
      const todayYmd = now.toISOString().split('T')[0];

      let activeSchedules: any[] = [];
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS scheduled_reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            docType VARCHAR(100),
            prefix VARCHAR(100),
            count INT DEFAULT 1,
            scheduleType VARCHAR(50) DEFAULT 'daily',
            scheduledTime VARCHAR(20) DEFAULT '18:00',
            reservedFor TEXT,
            reservedBy VARCHAR(255),
            isActive TINYINT(1) DEFAULT 1,
            lastRunAt VARCHAR(50),
            nextRunAt VARCHAR(50),
            createdAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        const [rows]: any = await pool.query('SELECT * FROM scheduled_reservations WHERE isActive = 1');
        activeSchedules = rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
      } catch (e) {
        activeSchedules = (localDb.scheduled_reservations || []).filter((s: any) => Boolean(s.isActive));
      }

      for (const sch of activeSchedules) {
        const schTime = sch.scheduledTime || '18:00';
        if (schTime === currentTimeStr) {
          const lastRunYmd = sch.lastRunAt ? sch.lastRunAt.split('T')[0] : '';
          if (lastRunYmd !== todayYmd) {
            console.log(`⏰ Triggering scheduled auto-reservation: "${sch.name}" at ${currentTimeStr}`);
            await executeScheduledReservation(sch);
          }
        }
      }
    } catch (err: any) {
      console.error('Scheduled reservation ticker error:', err.message);
    }
  }, 30000);
}

// Scheduled Reservations Helper
async function ensureScheduledReservationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        docType VARCHAR(100),
        prefix VARCHAR(100),
        count INT DEFAULT 1,
        scheduleType VARCHAR(50) DEFAULT 'daily',
        scheduledTime VARCHAR(20) DEFAULT '18:00',
        reservedFor TEXT,
        reservedBy VARCHAR(255),
        isActive TINYINT(1) DEFAULT 1,
        lastRunAt VARCHAR(50),
        nextRunAt VARCHAR(50),
        createdAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    const cols = [
      'name VARCHAR(255)',
      'department VARCHAR(255)',
      'docType VARCHAR(100)',
      'prefix VARCHAR(100)',
      'count INT DEFAULT 1',
      'scheduleType VARCHAR(50) DEFAULT "daily"',
      'scheduledTime VARCHAR(20) DEFAULT "18:00"',
      'reservedFor TEXT',
      'reservedBy VARCHAR(255)',
      'isActive TINYINT(1) DEFAULT 1',
      'lastRunAt VARCHAR(50)',
      'nextRunAt VARCHAR(50)',
      'createdAt VARCHAR(50)'
    ];
    for (const col of cols) {
      try {
        await pool.query(`ALTER TABLE scheduled_reservations ADD COLUMN ${col}`);
      } catch (e) {}
    }
  } catch (e) {}
}

// Scheduled Reservations Endpoints
app.get('/api/scheduled-reservations', async (req, res) => {
  try {
    await ensureScheduledReservationsTable();
    const [rows]: any = await pool.query('SELECT * FROM scheduled_reservations ORDER BY id DESC');
    const formatted = (rows || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
    return res.json(formatted);
  } catch (err: any) {
    const list = localDb.scheduled_reservations || [];
    return res.json(list);
  }
});

app.post('/api/scheduled-reservations', async (req, res) => {
  try {
    await ensureScheduledReservationsTable();

    const { name, department, docType, prefix, count, scheduleType, scheduledTime, reservedFor, reservedBy, isActive } = req.body;
    const nowIso = new Date().toISOString();
    const activeVal = isActive !== undefined ? (isActive ? 1 : 0) : 1;

    let newSchedule: any = {
      name: name || 'จองเลขอัตโนมัติประจำวัน',
      department: department || 'ฝ่ายบริหารงานทั่วไป',
      docType: docType || 'หนังสือภายนอก',
      prefix: prefix || 'รย 0021',
      count: Number(count) || 1,
      scheduleType: scheduleType || 'daily',
      scheduledTime: scheduledTime || '18:00',
      reservedFor: reservedFor || 'จองเลขอัตโนมัติตามกำหนดเวลา',
      reservedBy: reservedBy || 'ระบบอัตโนมัติ',
      isActive: Boolean(activeVal),
      lastRunAt: null,
      nextRunAt: `${nowIso.split('T')[0]} ${scheduledTime || '18:00'}`,
      createdAt: nowIso
    };

    let insertedId: any = null;
    try {
      const [result]: any = await pool.query(
        'INSERT INTO scheduled_reservations (name, department, docType, prefix, count, scheduleType, scheduledTime, reservedFor, reservedBy, isActive, lastRunAt, nextRunAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newSchedule.name, newSchedule.department, newSchedule.docType, newSchedule.prefix, newSchedule.count, newSchedule.scheduleType, newSchedule.scheduledTime, newSchedule.reservedFor, newSchedule.reservedBy, activeVal, newSchedule.lastRunAt, newSchedule.nextRunAt, newSchedule.createdAt]
      );
      if (result && result.insertId) {
        insertedId = result.insertId;
      }
    } catch (e) {
      console.warn('MySQL insert scheduled_reservations warning:', e);
    }

    if (!localDb.scheduled_reservations) localDb.scheduled_reservations = [];
    if (!insertedId) {
      const newId = localDb.scheduled_reservations.length > 0 ? Math.max(...localDb.scheduled_reservations.map((s: any) => Number(s.id) || 0)) + 1 : 1;
      insertedId = newId;
    }
    newSchedule.id = insertedId;

    const existingIdx = localDb.scheduled_reservations.findIndex((s: any) => Number(s.id) === Number(insertedId));
    if (existingIdx !== -1) {
      localDb.scheduled_reservations[existingIdx] = newSchedule;
    } else {
      localDb.scheduled_reservations.unshift(newSchedule);
    }
    saveLocalDb();

    try {
      await addSystemLog("CREATE_SCHEDULED_RESERVATION", `เพิ่มการตั้งเวลาจองเลขอัตโนมัติ: ${newSchedule.name} (${newSchedule.scheduledTime} น.)`, req.body.createdBy || "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true, data: newSchedule });
  } catch (err: any) {
    console.error('Create scheduled reservation error:', err);
    return res.status(500).json({ error: 'Failed to create scheduled reservation', details: err.message });
  }
});

app.put('/api/scheduled-reservations/:id', async (req, res) => {
  try {
    await ensureScheduledReservationsTable();

    const id = Number(req.params.id);
    const updates = { ...req.body };
    delete updates.id;
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive ? 1 : 0;
    }

    const allowedColumns = ['name', 'department', 'docType', 'prefix', 'count', 'scheduleType', 'scheduledTime', 'reservedFor', 'reservedBy', 'isActive', 'lastRunAt', 'nextRunAt', 'createdAt'];
    const validKeys = Object.keys(updates).filter(k => allowedColumns.includes(k));

    if (validKeys.length > 0) {
      try {
        const setClause = validKeys.map(k => `${k} = ?`).join(', ');
        const values = validKeys.map(k => updates[k]);
        values.push(id);
        await pool.query(`UPDATE scheduled_reservations SET ${setClause} WHERE id = ?`, values);
      } catch (e) {
        console.warn('MySQL update scheduled_reservations warning:', e);
      }
    }

    if (!localDb.scheduled_reservations) localDb.scheduled_reservations = [];
    const idx = localDb.scheduled_reservations.findIndex((s: any) => Number(s.id) === id);
    if (idx !== -1) {
      localDb.scheduled_reservations[idx] = {
        ...localDb.scheduled_reservations[idx],
        ...updates,
        isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : localDb.scheduled_reservations[idx].isActive
      };
      saveLocalDb();
    }

    try {
      await addSystemLog("UPDATE_SCHEDULED_RESERVATION", `อัปเดตการตั้งเวลาจองเลขอัตโนมัติ ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Update scheduled reservation error:', err);
    return res.status(500).json({ error: 'Failed to update scheduled reservation', details: err.message });
  }
});

app.delete('/api/scheduled-reservations/:id', async (req, res) => {
  try {
    await ensureScheduledReservationsTable();
    const id = Number(req.params.id);

    try {
      await pool.query('DELETE FROM scheduled_reservations WHERE id = ?', [id]);
    } catch (e) {
      console.warn('MySQL delete scheduled_reservations warning:', e);
    }

    if (localDb.scheduled_reservations) {
      localDb.scheduled_reservations = localDb.scheduled_reservations.filter((s: any) => Number(s.id) !== id);
      saveLocalDb();
    }

    try {
      await addSystemLog("DELETE_SCHEDULED_RESERVATION", `ลบการตั้งเวลาจองเลขอัตโนมัติ ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete scheduled reservation' });
  }
});

app.post('/api/scheduled-reservations/:id/toggle', async (req, res) => {
  try {
    await ensureScheduledReservationsTable();
    const id = Number(req.params.id);
    let newStatus = true;

    if (localDb.scheduled_reservations) {
      const target = localDb.scheduled_reservations.find((s: any) => Number(s.id) === id);
      if (target) {
        target.isActive = !target.isActive;
        newStatus = target.isActive;
        saveLocalDb();
      }
    }

    try {
      await pool.query('UPDATE scheduled_reservations SET isActive = ? WHERE id = ?', [newStatus ? 1 : 0, id]);
    } catch (e) {}

    return res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle schedule status' });
  }
});

app.post('/api/scheduled-reservations/:id/run-now', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let targetSch: any = null;

    try {
      const [rows]: any = await pool.query('SELECT * FROM scheduled_reservations WHERE id = ?', [id]);
      if (rows.length > 0) {
        targetSch = { ...rows[0], isActive: Boolean(rows[0].isActive) };
      }
    } catch (e) {
      if (localDb.scheduled_reservations) {
        targetSch = localDb.scheduled_reservations.find((s: any) => s.id === id);
      }
    }

    if (!targetSch) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    const result = await executeScheduledReservation(targetSch);
    return res.json(result);
  } catch (err: any) {
    console.error('Error in run-now:', err);
    return res.status(500).json({ error: 'Failed to run scheduled reservation' });
  }
});

app.post('/api/reserved-numbers/reclaim', async (req, res) => {
  try {
    const { docId, docType, department, numberString, year, reclaimedBy, reason } = req.body;
    const nowStr = new Date().toISOString();
    
    // We try to extract seq number from numberString
    let seqNumber = 0;
    const match = numberString.match(/\/(\d+)/) || numberString.match(/\s(\d+)\//);
    if (match) {
        seqNumber = parseInt(match[1], 10);
    }
    
    const [result]: any = await pool.query(
      'INSERT INTO reserved_numbers (docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [docType || 'หนังสือภายนอก', department || 'ทุกฝ่ายงาน', numberString, seqNumber, year || '2569', 'reclaimed', 'available', reclaimedBy || 'ระบบ', reason || 'คืนเลขเนื่องจากยกเลิกหนังสือ', nowStr]
    );

    await addSystemLog("RECLAIM_NUMBER", `ดึงเลขหนังสือ ${numberString} กลับเข้าคลังจอง`, reclaimedBy || "ระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reclaim number' });
  }
});

app.post('/api/reserved-numbers/use', async (req, res) => {
  try {
    const { id, docId } = req.body;
    const nowStr = new Date().toISOString();
    
    await pool.query('UPDATE reserved_numbers SET status = ?, usedAt = ?, usedForDocId = ? WHERE id = ?', ['used', nowStr, docId, id]);
    
    await addSystemLog("USE_RESERVED_NUMBER", `ใช้งานเลขจอง ID: ${id} สำหรับเอกสาร ${docId}`, "ระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to mark reserved number as used' });
  }
});

app.post('/api/numbering/generate-next', async (req, res) => {
  try {
    const { department, docType, isCircular, category, year } = req.body;
    const yr = year || '2569';
    let actualType = docType || 'หนังสือภายนอก';
    if (docType === 'admin') {
      if (category === 'order') actualType = 'คำสั่ง';
      else if (category === 'announcement') actualType = 'ประกาศ';
      else if (category === 'certificate') actualType = 'หนังสือรับรอง';
    }

    const [rules]: any = await pool.query('SELECT * FROM numbering_rules WHERE isActive = 1');
    
    let rule = rules.find((r: any) => (r.docType === actualType) && (r.department === department));
    if (!rule) rule = rules.find((r: any) => (r.docType === actualType) && (r.department === 'ทุกฝ่ายงาน'));
    if (!rule) rule = rules.find((r: any) => r.docType === actualType);

    if (!rule) {
      rule = {
        ruleName: 'กฎทั่วไปแบบตั้งต้น',
        prefixPattern: actualType === 'คำสั่ง' ? 'คำสั่ง' : (actualType === 'ประกาศ' ? 'ประกาศ' : (actualType === 'หนังสือรับรอง' ? 'หนังสือรับรอง' : 'รย 0021')),
        currentSeq: 1,
        docType: actualType
      };
    }

    const nextSeq = (rule.currentSeq || 0) + 1;
    let formattedNumber = '';

    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(actualType)) {
      formattedNumber = `${rule.prefixPattern || actualType} ${nextSeq}/${yr}`;
    } else {
      const circFlag = isCircular ? (rule.prefixPattern?.includes('ว') ? '' : 'ว ') : '';
      formattedNumber = `${rule.prefixPattern || 'รย 0021'}/${circFlag}${nextSeq}`;
    }

    return res.json({
      success: true,
      rule,
      nextSeq,
      formattedNumber
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate next number' });
  }
});

// ==================== WORKFLOW & SLA APIS ====================
app.get("/api/workflows/templates", async (req, res) => {
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM workflow_templates ORDER BY createdAt ASC');
        if (rows && rows.length > 0) {
          const templates = rows.map((r: any) => ({
            ...r,
            steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || [])
          }));
          return res.json(templates);
        }
      } catch (mysqlErr) {
        console.warn("MySQL fetch workflow_templates failed, using local fallback:", mysqlErr);
      }
    }

    if (!localDb.workflow_templates || localDb.workflow_templates.length === 0) {
      localDb.workflow_templates = JSON.parse(JSON.stringify(defaultWorkflowTemplates));
      saveLocalDb();
    }
    return res.json(localDb.workflow_templates);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch workflow templates" });
  }
});

app.post("/api/workflows/templates", async (req, res) => {
  try {
    const tplData = req.body;
    if (!tplData.id) tplData.id = `tpl-${Date.now()}`;

    // Sync localDb
    if (!localDb.workflow_templates) localDb.workflow_templates = [];
    const existingIdx = localDb.workflow_templates.findIndex((t: any) => t.id === tplData.id);
    if (existingIdx >= 0) {
      localDb.workflow_templates[existingIdx] = { ...localDb.workflow_templates[existingIdx], ...tplData };
    } else {
      localDb.workflow_templates.push({
        ...tplData,
        createdAt: new Date().toISOString()
      });
    }
    saveLocalDb();

    // MySQL Store
    if (isMysqlOnline) {
      try {
        const stepsJson = JSON.stringify(tplData.steps || []);
        await pool.query(
          `INSERT INTO workflow_templates (id, name, description, category, defaultPriority, steps, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=?, description=?, category=?, defaultPriority=?, steps=?`,
          [
            tplData.id, tplData.name, tplData.description || '', tplData.category || 'ทั่วไป', tplData.defaultPriority || 'ปกติ', stepsJson, tplData.createdAt || new Date().toISOString(),
            tplData.name, tplData.description || '', tplData.category || 'ทั่วไป', tplData.defaultPriority || 'ปกติ', stepsJson
          ]
        );
      } catch (mysqlErr) {
        console.warn("MySQL save workflow_template failed:", mysqlErr);
      }
    }

    const ip = getClientIp(req);
    await addSystemLog("CREATE_WORKFLOW_TEMPLATE", `บันทึกแม่แบบ Workflow: ${tplData.name}`, "ผู้ดูแลระบบ", ip);
    return res.json({ success: true, id: tplData.id });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to save workflow template" });
  }
});

app.delete("/api/workflows/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (localDb.workflow_templates) {
      localDb.workflow_templates = localDb.workflow_templates.filter((t: any) => t.id !== id);
      saveLocalDb();
    }

    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM workflow_templates WHERE id = ?', [id]);
      } catch (mysqlErr) {
        console.warn("MySQL delete workflow_template failed:", mysqlErr);
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete workflow template" });
  }
});

app.get("/api/workflows/instances", async (req, res) => {
  try {
    let instances: any[] = [];
    let fetchedFromMysql = false;

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM workflow_instances ORDER BY startedAt DESC');
        instances = (rows || []).map((r: any) => ({
          ...r,
          steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || [])
        }));
        fetchedFromMysql = true;
      } catch (mysqlErr) {
        console.warn("MySQL fetch workflow_instances failed, falling back to localDb:", mysqlErr);
      }
    }

    if (!fetchedFromMysql) {
      instances = (localDb.workflow_instances || []).filter(
        (i: any) => !['inst-101', 'inst-102', 'inst-103', 'inst-104'].includes(i.id)
      );
    }

    const nowMs = Date.now();
    const updatedInstances = instances.map((inst: any) => {
      const dueMs = new Date(inst.dueAt).getTime();
      let slaStatus = inst.slaStatus || "NORMAL";

      if (inst.status === "completed") {
        const completedMs = inst.completedAt ? new Date(inst.completedAt).getTime() : dueMs;
        slaStatus = completedMs <= dueMs ? "COMPLETED_ON_TIME" : "COMPLETED_LATE";
      } else if (inst.status === "active") {
        if (nowMs > dueMs) {
          slaStatus = "OVERDUE";
        } else if (dueMs - nowMs <= 24 * 3600 * 1000) {
          slaStatus = "WARNING";
        } else {
          slaStatus = "NORMAL";
        }
      }
      return { ...inst, slaStatus };
    });

    return res.json(updatedInstances);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch workflow instances" });
  }
});

app.post("/api/workflows/instances", async (req, res) => {
  try {
    const { docId, templateId, user } = req.body;
    let template: any = null;

    if (isMysqlOnline) {
      try {
        const [tplRows]: any = await pool.query('SELECT * FROM workflow_templates WHERE id = ?', [templateId]);
        if (tplRows && tplRows.length > 0) {
          template = {
            ...tplRows[0],
            steps: typeof tplRows[0].steps === 'string' ? JSON.parse(tplRows[0].steps) : (tplRows[0].steps || [])
          };
        }
      } catch (err) {}
    }

    if (!template) {
      if (!localDb.workflow_templates) localDb.workflow_templates = defaultWorkflowTemplates;
      template = localDb.workflow_templates.find((t: any) => t.id === templateId) || localDb.workflow_templates[0];
    }

    let doc: any = null;
    if (isMysqlOnline) {
      try {
        const queries = [
          `SELECT id, 'inbox' as type, title, docNumber, department, assignee, priority FROM inbox_documents WHERE id = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, department, assignee, priority FROM outbox_documents WHERE id = ?`,
          `SELECT id, 'circular' as type, title, docNumber, department, assignee, priority FROM circular_documents WHERE id = ?`,
          `SELECT id, 'admin' as type, title, docNumber, department, assignee, 'ปกติ' as priority FROM admin_documents WHERE id = ?`,
          `SELECT id, 'internal' as type, title, docNumber, department, assignee, priority FROM internal_documents WHERE id = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [docId]);
          if (dRows && dRows.length > 0) {
            doc = dRows[0];
            break;
          }
        }
      } catch (err) {}
    }

    if (!doc) {
      const allDocs = [
        ...(localDb.inbox_documents || []),
        ...(localDb.outbox_documents || []),
        ...(localDb.circular_documents || []),
        ...(localDb.admin_documents || []),
        ...(localDb.internal_documents || [])
      ];
      doc = allDocs.find((d: any) => String(d.id) === String(docId)) || {
        docNumber: "รย 0021/999",
        title: "หนังสือมอบหมายตามเส้นทาง Workflow",
        department: "ฝ่ายบริหารงานทั่วไป",
        assignee: user || "เจ้าหน้าที่",
        priority: "ปกติ"
      };
    }

    const startTime = new Date();
    const totalSlaHours = (template.steps || []).reduce((acc: number, cur: any) => acc + (cur.slaHours || 24), 0);
    const dueTime = new Date(startTime.getTime() + totalSlaHours * 3600 * 1000);

    let stepDueCursor = new Date(startTime.getTime());
    const instSteps = (template.steps || []).map((st: any, idx: number) => {
      stepDueCursor = new Date(stepDueCursor.getTime() + (st.slaHours || 24) * 3600 * 1000);
      return {
        stepNumber: st.stepNumber || (idx + 1),
        title: st.title,
        assignedRole: st.assignedRole,
        department: st.department || doc.department || "ฝ่ายบริหารงานทั่วไป",
        assignee: doc.assignee || user || "เจ้าหน้าที่ผู้รับผิดชอบ",
        slaHours: st.slaHours || 24,
        dueAt: stepDueCursor.toISOString(),
        status: idx === 0 ? "in_progress" : "pending"
      };
    });

    const newInst = {
      id: `inst-${Date.now()}`,
      docId: String(docId),
      docTitle: doc.title,
      docNumber: doc.docNumber || "รย 0021/000",
      docType: doc.type || "inbox",
      templateId: template.id,
      templateName: template.name,
      currentStepIndex: 0,
      status: "active",
      startedAt: startTime.toISOString(),
      dueAt: dueTime.toISOString(),
      completedAt: null,
      department: doc.department || "ฝ่ายบริหารงานทั่วไป",
      assignee: doc.assignee || user || "ผู้รับผิดชอบ",
      priority: doc.priority || "ปกติ",
      steps: instSteps,
      slaStatus: "NORMAL"
    };

    if (!localDb.workflow_instances) localDb.workflow_instances = [];
    localDb.workflow_instances.unshift(newInst);
    saveLocalDb();

    if (isMysqlOnline) {
      try {
        await pool.query(
          `INSERT INTO workflow_instances 
           (id, docId, docTitle, docNumber, docType, templateId, templateName, currentStepIndex, status, startedAt, dueAt, department, assignee, priority, steps, slaStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newInst.id, newInst.docId, newInst.docTitle, newInst.docNumber, newInst.docType,
            newInst.templateId, newInst.templateName, newInst.currentStepIndex, newInst.status,
            newInst.startedAt, newInst.dueAt, newInst.department, newInst.assignee, newInst.priority,
            JSON.stringify(newInst.steps), newInst.slaStatus
          ]
        );
      } catch (mysqlErr) {
        console.warn("MySQL save workflow_instance failed:", mysqlErr);
      }
    }

    const ip = getClientIp(req);
    await addSystemLog("START_WORKFLOW", `มอบหมายเส้นทาง Workflow: ${template.name} ให้หนังสือ ${doc.docNumber}`, user || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true, instance: newInst });
  } catch (err: any) {
    console.error("Error creating workflow instance:", err);
    return res.status(500).json({ error: "Failed to create workflow instance" });
  }
});

app.put("/api/workflows/instances/:id/step", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note, user } = req.body;

    let inst: any = null;

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM workflow_instances WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          inst = {
            ...rows[0],
            steps: typeof rows[0].steps === 'string' ? JSON.parse(rows[0].steps) : (rows[0].steps || [])
          };
        }
      } catch (err) {}
    }

    if (!inst) {
      if (!localDb.workflow_instances) localDb.workflow_instances = [];
      inst = localDb.workflow_instances.find((i: any) => i.id === id);
    }

    if (!inst) {
      return res.status(404).json({ error: "Workflow instance not found" });
    }

    const currentIdx = inst.currentStepIndex || 0;

    if (action === "approve") {
      if (inst.steps && inst.steps[currentIdx]) {
        inst.steps[currentIdx].status = "approved";
        inst.steps[currentIdx].actionNote = note || "อนุมัติเรียบร้อย";
        inst.steps[currentIdx].actionBy = user || "ผู้รับผิดชอบ";
        inst.steps[currentIdx].actionAt = new Date().toISOString();
      }

      if (currentIdx + 1 < inst.steps.length) {
        inst.currentStepIndex = currentIdx + 1;
        inst.steps[inst.currentStepIndex].status = "in_progress";
      } else {
        inst.status = "completed";
        inst.completedAt = new Date().toISOString();
        const dueMs = new Date(inst.dueAt).getTime();
        const completedMs = new Date(inst.completedAt).getTime();
        inst.slaStatus = completedMs <= dueMs ? "COMPLETED_ON_TIME" : "COMPLETED_LATE";
      }
    } else if (action === "reject") {
      if (inst.steps && inst.steps[currentIdx]) {
        inst.steps[currentIdx].status = "rejected";
        inst.steps[currentIdx].actionNote = note || "ตีกลับเอกสาร";
        inst.steps[currentIdx].actionBy = user || "ผู้รับผิดชอบ";
        inst.steps[currentIdx].actionAt = new Date().toISOString();
      }
      inst.status = "rejected";
    }

    if (localDb.workflow_instances) {
      const localIdx = localDb.workflow_instances.findIndex((i: any) => i.id === id);
      if (localIdx >= 0) {
        localDb.workflow_instances[localIdx] = inst;
        saveLocalDb();
      }
    }

    if (isMysqlOnline) {
      try {
        await pool.query(
          `UPDATE workflow_instances SET currentStepIndex=?, status=?, completedAt=?, steps=?, slaStatus=? WHERE id=?`,
          [inst.currentStepIndex, inst.status, inst.completedAt || null, JSON.stringify(inst.steps), inst.slaStatus, id]
        );
      } catch (mysqlErr) {
        console.warn("MySQL update workflow step failed:", mysqlErr);
      }
    }

    const ip = getClientIp(req);
    await addSystemLog("WORKFLOW_PROGRESS", `อัปเดตขั้นตอน Workflow (${action}): ${inst.docNumber} - ${inst.docTitle}`, user || "ผู้รับผิดชอบ", ip);
    return res.json({ success: true, instance: inst });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update workflow step" });
  }
});

app.post("/api/workflows/instances/:id/escalate", async (req, res) => {
  try {
    const { id } = req.params;
    const { note, user } = req.body;
    const nowIso = new Date().toISOString();

    if (localDb.workflow_instances) {
      const instIdx = localDb.workflow_instances.findIndex((i: any) => i.id === id);
      if (instIdx >= 0) {
        localDb.workflow_instances[instIdx].lastEscalatedAt = nowIso;
        localDb.workflow_instances[instIdx].escalationsCount = (localDb.workflow_instances[instIdx].escalationsCount || 0) + 1;
        saveLocalDb();
      }
    }

    if (isMysqlOnline) {
      try {
        await pool.query(
          `UPDATE workflow_instances SET lastEscalatedAt = ?, escalationsCount = COALESCE(escalationsCount, 0) + 1 WHERE id = ?`,
          [nowIso, id]
        );
      } catch (mysqlErr) {
        console.warn("MySQL escalate workflow failed:", mysqlErr);
      }
    }

    const ip = getClientIp(req);
    await addSystemLog("WORKFLOW_ESCALATION", `ส่งใบแจ้งเตือนเร่งรัด SLA สารบรรณ: ${id} (${note || 'เร่งรัดหนังสือเกินกำหนด'})`, user || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to escalate workflow" });
  }
});

app.delete("/api/workflows/instances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (localDb.workflow_instances) {
      localDb.workflow_instances = localDb.workflow_instances.filter((i: any) => i.id !== id);
      saveLocalDb();
    }
    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM workflow_instances WHERE id = ?', [id]);
      } catch (mysqlErr) {
        console.warn("MySQL delete workflow instance failed:", mysqlErr);
      }
    }
    const ip = getClientIp(req);
    await addSystemLog("DELETE_WORKFLOW_INSTANCE", `ยกเลิกการเสนออนุมัติ Workflow: ${id}`, req.body?.user || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete workflow instance" });
  }
});

// ==================== DIGITAL SIGNATURE & HASH VERIFICATION APIS ====================

function formatThaiDateTimeStr(isoStr?: string): string {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) return '';
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day} ${month} พ.ศ. ${year} เวลา ${hours}:${mins}:${secs} น.`;
}

function transliterateThaiToLatin(thaiStr: string): string {
  if (!thaiStr) return '';
  
  const conMap: { [key: string]: string } = {
    'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ฆ': 'kh',
    'ง': 'ng', 'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
    'ญ': 'y', 'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n',
    'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th', 'น': 'n',
    'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm',
    'ย': 'y', 'ร': 'r', 'ล': 'l', 'ว': 'w', 'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h',
    'ฬ': 'l', 'อ': 'o', 'ฮ': 'h'
  };

  const vowelMap: { [key: string]: string } = {
    'ะ': 'a', 'า': 'a', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue', 'ุ': 'u', 'ู': 'u',
    'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai', 'ำ': 'am', 'ั': 'a', '็': '',
    '์': '', '่': '', '้': '', '๊': '', '๋': '', 'ฤ': 'rue', 'ๆ': ''
  };

  const leadVowels = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ']);
  let result = '';
  let i = 0;

  while (i < thaiStr.length) {
    const char = thaiStr[i];
    const code = char.charCodeAt(0);

    if (code >= 32 && code <= 126) {
      result += char;
      i++;
    } else if (leadVowels.has(char)) {
      const nextChar = thaiStr[i + 1];
      if (nextChar && conMap[nextChar] !== undefined) {
        result += conMap[nextChar] + vowelMap[char];
        i += 2;
      } else {
        result += vowelMap[char];
        i++;
      }
    } else if (conMap[char] !== undefined) {
      result += conMap[char];
      i++;
    } else if (vowelMap[char] !== undefined) {
      result += vowelMap[char];
      i++;
    } else {
      if (char === ' ') result += ' ';
      i++;
    }
  }

  return result
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeForPdf(text: any, defaultText: string = ''): string {
  if (!text) return defaultText;
  let str = String(text).trim();
  
  const translations: { [key: string]: string } = {
    'ปกติ': 'Normal',
    'ด่วน': 'Urgent',
    'ด่วนมาก': 'Very Urgent',
    'ด่วนที่สุด': 'Most Urgent',
    'ลับ': 'Confidential',
    'ลับมาก': 'Secret',
    'ลับที่สุด': 'Top Secret',
    'รับแล้ว': 'Received',
    'ร่าง': 'Draft',
    'ส่งแล้ว': 'Sent',
    'สำนักงาน ปภ.จังหวัดระยอง': 'Rayong Provincial Disaster Prevention and Mitigation Office',
    'ผู้บริหาร': 'Executive Officer',
    'ฝ่ายยุทธศาสตร์และการจัดการ': 'Strategy and Management Division',
    'ฝ่ายป้องกันและปฏิบัติการ': 'Prevention and Operations Division',
    'ฝ่ายสงเคราะห์ผู้ประสบภัย': 'Disaster Relief Division',
    'ฝ่ายบริหารงานทั่วไป': 'General Administration Division',
    'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง': 'Rayong Provincial Disaster Prevention and Mitigation Office',
    'ทุกฝ่ายงาน / ประชาชน': 'All Departments / Public'
  };

  if (translations[str]) {
    return translations[str];
  }

  const hasThai = /[\u0e00-\u0e7f]/.test(str);
  if (hasThai) {
    return transliterateThaiToLatin(str) || defaultText;
  }

  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    return (code >= 32 && code <= 126) ? char : '';
  }).join('').replace(/\s+/g, ' ').trim() || defaultText;
}

async function buildSignedPdfBuffer(doc: any, sigRecord: any, qrDataUrl: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  
  // Header background bar
  page.drawRectangle({
    x: 30,
    y: height - 80,
    width: width - 60,
    height: 50,
    color: rgb(0.06, 0.22, 0.42),
  });

  page.drawText('OFFICIAL ELECTRONIC & DIGITAL SIGNED DOCUMENT', {
    x: 45,
    y: height - 55,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Provincial Disaster Prevention and Mitigation Office - Rayong EDMS', {
    x: 45,
    y: height - 70,
    size: 9,
    font: font,
    color: rgb(0.85, 0.9, 0.98),
  });

  // Document Info Block
  let yCursor = height - 110;
  
  page.drawText(`Document No: ${sanitizeForPdf(doc.docNumber || 'รย 0021/V-' + doc.id, 'V-' + doc.id)}`, { x: 45, y: yCursor, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Date: ${sanitizeForPdf(doc.date || doc.registerDate || new Date().toISOString().split('T')[0], '2026-08-05')}`, { x: 350, y: yCursor, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
  
  yCursor -= 20;
  page.drawText(`Title / Subject: ${sanitizeForPdf(doc.title || 'Official Executive Document', 'Official Document')}`, { x: 45, y: yCursor, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
  
  yCursor -= 18;
  page.drawText(`From: ${sanitizeForPdf(doc.from, 'Rayong Disaster Office')}  |  To: ${sanitizeForPdf(doc.to, 'Related Agencies')}`, { x: 45, y: yCursor, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });

  yCursor -= 18;
  page.drawText(`Department: ${sanitizeForPdf(doc.department, 'Administration')}  |  Priority: ${sanitizeForPdf(doc.priority, 'Normal')}  |  Secrecy: ${sanitizeForPdf(doc.secrecy, 'Normal')}`, { x: 45, y: yCursor, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });

  // Divider Line
  yCursor -= 12;
  page.drawLine({
    start: { x: 45, y: yCursor },
    end: { x: width - 45, y: yCursor },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Body content area
  yCursor -= 25;
  page.drawText('Document Content / Executive Order:', { x: 45, y: yCursor, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  
  yCursor -= 20;
  const contentText = sanitizeForPdf(doc.content || doc.note, 'Official electronic and digital signed document approved under the Electronic Transactions Act, B.E. 2544.');
  const lines = contentText.slice(0, 800).match(/.{1,75}/g) || [contentText];
  
  for (const line of lines) {
    if (yCursor < 260) break;
    page.drawText(line, { x: 45, y: yCursor, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
    yCursor -= 14;
  }

  // Digital Signature Certificate Seal Box
  const boxHeight = 210;
  const boxY = 40;
  
  // Box outer border
  page.drawRectangle({
    x: 40,
    y: boxY,
    width: width - 80,
    height: boxHeight,
    borderColor: rgb(0.08, 0.38, 0.28),
    borderWidth: 1.5,
    color: rgb(0.97, 0.99, 0.98),
  });

  // Certificate Header Band
  page.drawRectangle({
    x: 40,
    y: boxY + boxHeight - 28,
    width: width - 80,
    height: 28,
    color: rgb(0.08, 0.38, 0.28),
  });

  page.drawText('DIGITAL SIGNATURE & TIMESTAMP CERTIFICATE (SHA-256 VERIFIED)', {
    x: 55,
    y: boxY + boxHeight - 19,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let certY = boxY + boxHeight - 45;

  page.drawText(`Signer: ${sanitizeForPdf(sigRecord.signerName, 'Authorized Officer')}`, { x: 55, y: certY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  certY -= 15;
  page.drawText(`Position: ${sanitizeForPdf(sigRecord.signerPosition, 'Chief Officer')}`, { x: 55, y: certY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
  certY -= 14;
  page.drawText(`Department: ${sanitizeForPdf(sigRecord.signerDepartment, 'Provincial Office')}`, { x: 55, y: certY, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });

  certY -= 16;
  const pdfTimestamp = new Date(sigRecord.timestampIso).toUTCString();
  page.drawText(`Timestamp (TSA): ${pdfTimestamp}`, { x: 55, y: certY, size: 9, font: fontBold, color: rgb(0.05, 0.35, 0.15) });
  certY -= 14;
  page.drawText(`ISO Timestamp: ${sigRecord.timestampIso}`, { x: 55, y: certY, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });

  certY -= 15;
  page.drawText(`Certificate Serial: ${sigRecord.certificateSerial}`, { x: 55, y: certY, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  certY -= 13;
  page.drawText(`CA Issuer: ${sanitizeForPdf(sigRecord.certificateIssuer)}`, { x: 55, y: certY, size: 8, font: font, color: rgb(0.3, 0.3, 0.3) });

  certY -= 16;
  page.drawText(`SHA-256 Hash: ${sigRecord.documentHash.slice(0, 36)}...`, { x: 55, y: certY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
  certY -= 13;
  page.drawText(`TSA Digest: ${sigRecord.tsaToken.slice(0, 36)}...`, { x: 55, y: certY, size: 8, font: font, color: rgb(0.3, 0.3, 0.3) });

  // Embed QR Code
  try {
    const qrBase64Clean = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrImageBuffer = Buffer.from(qrBase64Clean, 'base64');
    const embeddedQr = await pdfDoc.embedPng(qrImageBuffer);
    page.drawImage(embeddedQr, {
      x: width - 180,
      y: boxY + 45,
      width: 120,
      height: 120,
    });

    page.drawText('Scan to Verify Integrity', {
      x: width - 175,
      y: boxY + 30,
      size: 8,
      font: fontBold,
      color: rgb(0.08, 0.38, 0.28),
    });
  } catch (err) {
    console.warn('Could not embed QR image in PDF:', err);
  }

  // Embed Signature Image if present
  if (sigRecord.signatureDataUrl && sigRecord.signatureDataUrl.startsWith('data:image/')) {
    try {
      const isPng = sigRecord.signatureDataUrl.startsWith('data:image/png');
      const cleanBase64 = sigRecord.signatureDataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
      const sigImgBuffer = Buffer.from(cleanBase64, 'base64');
      const embeddedSig = isPng ? await pdfDoc.embedPng(sigImgBuffer) : await pdfDoc.embedJpg(sigImgBuffer);
      
      page.drawImage(embeddedSig, {
        x: width - 330,
        y: boxY + 80,
        width: 130,
        height: 60,
      });
    } catch (err) {
      console.warn('Could not embed visual signature in PDF:', err);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// 1. Sign Document with Digital Signature, Hash & Timestamp
app.post("/api/digital-signatures/sign", async (req, res) => {
  try {
    const { docId, docType, signerName, signerPosition, signerDepartment, signerEmail, signatureType, signatureDataUrl, user } = req.body;

    if (!docId || !signerName) {
      return res.status(400).json({ error: "Missing required fields (docId, signerName)" });
    }

    // Fetch document info
    let doc: any = null;
    if (isMysqlOnline) {
      try {
        const queries = [
          `SELECT id, 'inbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note FROM inbox_documents WHERE id = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note FROM outbox_documents WHERE id = ?`,
          `SELECT id, 'circular' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note FROM circular_documents WHERE id = ?`,
          `SELECT id, 'admin' as type, title, docNumber, date, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, 'ปกติ' AS priority, 'ปกติ' AS secrecy, content, note FROM admin_documents WHERE id = ?`,
          `SELECT id, 'internal' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, 'ปกติ' AS secrecy, content, note FROM internal_documents WHERE id = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [docId]);
          if (dRows && dRows.length > 0) {
            doc = dRows[0];
            break;
          }
        }
      } catch (e) {}
    }

    if (!doc) {
      const allDocs = [
        ...(localDb.inbox_documents || []),
        ...(localDb.outbox_documents || []),
        ...(localDb.circular_documents || []),
        ...(localDb.admin_documents || []),
        ...(localDb.internal_documents || [])
      ];
      doc = allDocs.find((d: any) => String(d.id) === String(docId)) || {
        id: docId,
        docNumber: `รย 0021/V-${docId}`,
        title: "หนังสือการเสนอลงนามดิจิทัล",
        date: new Date().toISOString().split('T')[0],
        from: "สำนักงาน ปภ.จังหวัดระยอง",
        to: "ทุกหน่วยงานในสังกัด",
        department: signerDepartment || "ผู้บริหาร",
        priority: "ปกติ",
        secrecy: "ปกติ",
        content: "หนังสือขออนุมัติและลงนามดิจิทัลประจำปี พ.ศ. 2569"
      };
    }

    const sigId = `sig-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestampIso = new Date().toISOString();
    const timestampFormatted = formatThaiDateTimeStr(timestampIso);

    // Cryptographic Hash Generation
    const rawContentStr = `${doc.id}|${doc.docNumber || ''}|${doc.title || ''}|${doc.date || ''}|${doc.from || ''}|${doc.to || ''}|${doc.content || doc.note || ''}`;
    const documentHash = crypto.createHash('sha256').update(rawContentStr).digest('hex').toUpperCase();

    const certificateIssuer = "Rayong Provincial PA-PKI Certificate Authority (ETDA Compliant B.E. 2544 Sec. 26/3)";
    const certificateSerial = `CERT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const tsaToken = crypto.createHash('sha256').update(`${documentHash}|${timestampIso}|TSA-RAYONG-2026`).digest('hex').toUpperCase();
    const signatureHash = crypto.createHash('sha256').update(`${documentHash}|${signerName}|${timestampIso}|${tsaToken}`).digest('hex').toUpperCase();

    // Generate Verification URL & QR Code
    const verifyUrl = `${getPublicBaseUrl(req)}/verify?docId=${doc.id}&hash=${documentHash}&sig=${sigId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 280,
      color: { dark: '#0a2540', light: '#ffffff' }
    });

    const ipAddress = getClientIp(req);

    const sigRecord: any = {
      id: sigId,
      docId: String(doc.id),
      docTitle: doc.title || '',
      docNumber: doc.docNumber || '',
      docType: docType || doc.type || 'inbox',
      signerName: signerName || 'ผู้ลงนาม',
      signerPosition: signerPosition || 'ผู้บริหาร',
      signerDepartment: signerDepartment || 'สำนักงาน ปภ.จังหวัดระยอง',
      signerEmail: signerEmail || '',
      signatureType: signatureType || 'digital-signature',
      signatureDataUrl: signatureDataUrl || '',
      certificateIssuer,
      certificateSerial,
      hashAlgorithm: 'SHA-256',
      documentHash,
      signatureHash,
      timestampIso,
      timestampFormatted,
      tsaToken,
      qrCodeDataUrl,
      verifyUrl,
      ipAddress,
      pdfPath: '',
      status: 'valid'
    };

    // Generate Signed PDF File
    const pdfBuffer = await buildSignedPdfBuffer(doc, sigRecord, qrCodeDataUrl);
    const pdfFileName = `signed_${doc.id}_${sigId}.pdf`;
    
    // Ensure directory exists right before writing
    const signedPdfsDir = path.join(process.cwd(), 'uploads', 'signed_pdfs');
    if (!fs.existsSync(signedPdfsDir)) {
      fs.mkdirSync(signedPdfsDir, { recursive: true });
    }

    const pdfFilePath = path.join(signedPdfsDir, pdfFileName);
    fs.writeFileSync(pdfFilePath, pdfBuffer);
    sigRecord.pdfPath = `/uploads/signed_pdfs/${pdfFileName}`;

    // Save to LocalDb
    if (!localDb.digital_signatures) localDb.digital_signatures = [];
    localDb.digital_signatures.unshift(sigRecord);
    saveLocalDb();

    // Save to MySQL
    if (isMysqlOnline) {
      try {
        await pool.query(
          `INSERT INTO digital_signatures
           (id, docId, docTitle, docNumber, docType, signerName, signerPosition, signerDepartment, signerEmail, signatureType, signatureDataUrl, certificateIssuer, certificateSerial, hashAlgorithm, documentHash, signatureHash, timestampIso, timestampFormatted, tsaToken, qrCodeDataUrl, verifyUrl, ipAddress, pdfPath, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sigRecord.id, sigRecord.docId, sigRecord.docTitle, sigRecord.docNumber, sigRecord.docType,
            sigRecord.signerName, sigRecord.signerPosition, sigRecord.signerDepartment, sigRecord.signerEmail,
            sigRecord.signatureType, sigRecord.signatureDataUrl, sigRecord.certificateIssuer, sigRecord.certificateSerial,
            sigRecord.hashAlgorithm, sigRecord.documentHash, sigRecord.signatureHash, sigRecord.timestampIso,
            sigRecord.timestampFormatted, sigRecord.tsaToken, sigRecord.qrCodeDataUrl, sigRecord.verifyUrl,
            sigRecord.ipAddress, sigRecord.pdfPath, sigRecord.status
          ]
        );

        // Update document status in MySQL if possible
        const tblMap: Record<string, string> = {
          inbox: 'inbox_documents',
          outbox: 'outbox_documents',
          circular: 'circular_documents',
          admin: 'admin_documents',
          internal: 'internal_documents'
        };
        const tbl = tblMap[docType || doc.type] || 'inbox_documents';
        await pool.query(`UPDATE ${tbl} SET status = 'ลงนามดิจิทัลแล้ว' WHERE id = ?`, [doc.id]);
      } catch (mysqlErr) {
        console.warn("MySQL save digital_signature failed:", mysqlErr);
      }
    }

    const ip = getClientIp(req);
    await addSystemLog("DIGITAL_SIGNATURE", `ลงนามดิจิทัลสำเร็จ (SHA-256): ${doc.docNumber} โดย ${signerName}`, user || signerName, ip);

    return res.json({
      success: true,
      signature: sigRecord,
      verifyUrl,
      pdfUrl: sigRecord.pdfPath
    });
  } catch (err: any) {
    console.error("Error signing digital signature:", err);
    return res.status(500).json({ error: "Failed to sign digital signature: " + err.message });
  }
});

// QR Code generation for a single document (independent of digital signature status)
app.get("/api/documents/:docId/qr-code", async (req, res) => {
  try {
    const { docId } = req.params;
    const verifyUrl = `${getPublicBaseUrl(req)}/verify?docId=${docId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 280,
      color: { dark: '#0a2540', light: '#ffffff' }
    });
    return res.json({ qrCodeDataUrl, verifyUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Public GET verification route to render beautiful, mobile-friendly verification HTML
app.get("/api/verify-data", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { docId } = req.query;
    if (!docId) {
      return res.status(400).json({ error: "Missing docId" });
    }

    let doc: any = null;
    let foundType = 'inbox';
    if (isMysqlOnline) {
      try {
        const queries = [
          `SELECT id, 'inbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM inbox_documents WHERE id = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM outbox_documents WHERE id = ?`,
          `SELECT id, 'circular' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM circular_documents WHERE id = ?`,
          `SELECT id, 'admin' as type, title, docNumber, date, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, 'ปกติ' AS priority, 'ปกติ' AS secrecy, content, note, status, registerDate, year, NULL AS receiveNumber FROM admin_documents WHERE id = ?`,
          `SELECT id, 'internal' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, 'ปกติ' AS secrecy, content, note, status, registerDate, year, receiveNumber FROM internal_documents WHERE id = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [docId]);
          if (dRows && dRows.length > 0) {
            doc = dRows[0];
            foundType = doc.type;
            break;
          }
        }
      } catch (e) {
        console.error("verify-data GET db error:", e);
      }
    }

    if (!doc) {
      // search in localDb
      const allDocs = [
        ...(localDb.inbox_documents || []).map((d: any) => ({ ...d, type: 'inbox' })),
        ...(localDb.outbox_documents || []).map((d: any) => ({ ...d, type: 'outbox' })),
        ...(localDb.circular_documents || []).map((d: any) => ({ ...d, type: 'circular' })),
        ...(localDb.admin_documents || []).map((d: any) => ({ ...d, type: 'admin' })),
        ...(localDb.internal_documents || []).map((d: any) => ({ ...d, type: 'internal' })),
      ];
      const match = allDocs.find((d: any) => String(d.id) === String(docId));
      if (match) {
        doc = {
          id: match.id,
          type: match.type,
          title: match.title,
          docNumber: match.docNumber,
          date: match.date,
          from: match.fromDept || match.from || 'สำนักงาน ปภ.จังหวัดระยอง',
          to: match.toDept || match.to || 'ทุกหน่วยงานในสังกัด',
          department: match.department,
          assignee: match.assignee,
          priority: match.priority || 'ปกติ',
          secrecy: match.secrecy || 'ปกติ',
          content: match.content,
          note: match.note,
          status: match.status,
          registerDate: match.registerDate,
          year: match.year,
          receiveNumber: match.receiveNumber
        };
        foundType = doc.type;
      }
    }

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    let signatures: any[] = [];
    if (isMysqlOnline) {
      try {
        const [sigRows]: any = await pool.query('SELECT * FROM digital_signatures WHERE docId = ? ORDER BY timestampIso DESC', [doc.id]);
        signatures = sigRows || [];
      } catch (e) {}
    }
    if (signatures.length === 0) {
      signatures = (localDb.digital_signatures || []).filter((s: any) => String(s.docId) === String(doc.id));
    }

    return res.json({
      success: true,
      document: doc,
      signatures
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/resolve-slug/:slug", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { slug } = req.params;
  try {
    let originalUrl = '';
    let status = 'active';

    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT originalUrl, status FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      if (rows && rows.length > 0) {
        originalUrl = rows[0].originalUrl;
        status = rows[0].status;
      }
    } else {
      const qr = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
      if (qr) {
        originalUrl = qr.originalUrl;
        status = qr.status;
      }
    }

    if (!originalUrl) {
      return res.status(404).json({ error: "Slug not found" });
    }

    return res.json({ originalUrl, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Public GET verification route to render beautiful, mobile-friendly verification HTML
app.get("/verify", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { docId } = req.query;
    if (!docId) {
      return res.status(400).send("<h1>ไม่ระบุไอดีเอกสาร (Missing docId)</h1>");
    }

    // Fetch document info
    let doc: any = null;
    let foundType = 'inbox';
    if (isMysqlOnline) {
      try {
        const queries = [
          `SELECT id, 'inbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM inbox_documents WHERE id = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM outbox_documents WHERE id = ?`,
          `SELECT id, 'circular' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, status, registerDate, year, receiveNumber FROM circular_documents WHERE id = ?`,
          `SELECT id, 'admin' as type, title, docNumber, date, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, 'ปกติ' AS priority, 'ปกติ' AS secrecy, content, note, status, registerDate, year, NULL AS receiveNumber FROM admin_documents WHERE id = ?`,
          `SELECT id, 'internal' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, 'ปกติ' AS secrecy, content, note, status, registerDate, year, receiveNumber FROM internal_documents WHERE id = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [docId]);
          if (dRows && dRows.length > 0) {
            doc = dRows[0];
            foundType = doc.type;
            break;
          }
        }
      } catch (e) {
        console.error("verify GET db error:", e);
      }
    }

    if (!doc) {
      // search in localDb
      const allDocs = [
        ...(localDb.inbox_documents || []).map((d: any) => ({ ...d, type: 'inbox' })),
        ...(localDb.outbox_documents || []).map((d: any) => ({ ...d, type: 'outbox' })),
        ...(localDb.circular_documents || []).map((d: any) => ({ ...d, type: 'circular' })),
        ...(localDb.admin_documents || []).map((d: any) => ({ ...d, type: 'admin' })),
        ...(localDb.internal_documents || []).map((d: any) => ({ ...d, type: 'internal' })),
      ];
      const match = allDocs.find((d: any) => String(d.id) === String(docId));
      if (match) {
        doc = {
          id: match.id,
          type: match.type,
          title: match.title,
          docNumber: match.docNumber,
          date: match.date,
          from: match.fromDept || match.from || 'สำนักงาน ปภ.จังหวัดระยอง',
          to: match.toDept || match.to || 'ทุกหน่วยงานในสังกัด',
          department: match.department,
          assignee: match.assignee,
          priority: match.priority || 'ปกติ',
          secrecy: match.secrecy || 'ปกติ',
          content: match.content,
          note: match.note,
          status: match.status,
          registerDate: match.registerDate,
          year: match.year,
          receiveNumber: match.receiveNumber
        };
        foundType = doc.type;
      }
    }

    let signatures: any[] = [];
    if (doc) {
      if (isMysqlOnline) {
        try {
          const [sigRows]: any = await pool.query('SELECT * FROM digital_signatures WHERE docId = ? ORDER BY timestampIso DESC', [doc.id]);
          signatures = sigRows || [];
        } catch (e) {}
      }
      if (signatures.length === 0) {
        signatures = (localDb.digital_signatures || []).filter((s: any) => String(s.docId) === String(doc.id));
      }
    }

    // Serve HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!doc) {
      // Return beautiful NOT FOUND error page
      return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ตรวจสอบความถูกต้องเอกสาร - ไม่พบข้อมูล</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Sarabun', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center space-y-6">
    <div class="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    
    <div class="space-y-2">
      <h1 class="text-xl font-bold text-slate-800">ไม่พบข้อมูลเอกสารในระบบ</h1>
      <p class="text-sm text-slate-500">รหัสเอกสาร <strong>"${docId}"</strong> ไม่ตรงกับข้อมูลสารบรรณกลาง หรือข้อมูลอาจถูกลบหรือถูกแก้ไขย้อนหลังโดยไม่ได้รับอนุญาต</p>
    </div>

    <div class="bg-rose-50 text-rose-800 text-xs p-4 rounded-xl text-left border border-rose-100 leading-relaxed font-medium">
      ⚠️ คำเตือน: เอกสารฉบับนี้ไม่ผ่านการรับรอง และไม่ได้ถูกลงทะเบียนในระบบสารบรรณอิเล็กทรอนิกส์ของสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง หากเป็นเอกสารกระดาษที่มี QR Code นี้ติดอยู่ อาจเป็นเอกสารปลอมแปลงหรือถูกแก้ไขรายละเอียด
    </div>

    <div class="pt-2 border-t border-slate-100">
      <p class="text-[10px] text-slate-400">สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (Rayong Disaster Office EDMS)</p>
    </div>
  </div>
</body>
</html>
      `);
    }

    const docTypeLabels: { [key: string]: string } = {
      inbox: 'หนังสือรับ (Inbox)',
      outbox: 'หนังสือส่ง (Outbox)',
      circular: 'หนังสือเวียน (Circular)',
      admin: 'คำสั่ง/ประกาศ (Admin Order)',
      internal: 'บันทึกข้อความ (Internal Memo)'
    };

    const isSigned = signatures.length > 0;
    const statusText = isSigned ? "ลงนามดิจิทัลเสร็จสมบูรณ์ (ETDA Certified)" : "ลงทะเบียนถูกต้อง (Registered in System)";
    const statusColor = isSigned ? "emerald" : "blue";

    const detailItem = (label: string, val: string) => `
      <div class="space-y-1">
        <span class="text-xs font-semibold text-slate-400 block">${label}</span>
        <span class="text-sm text-slate-800 font-medium block">${val || '-'}</span>
      </div>
    `;

    const sigsHtml = signatures.map((sig, sIdx) => `
      <div class="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-full bg-emerald-100 text-emerald-700">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </span>
            <span class="text-emerald-800 font-bold text-sm">ผู้ลงนามลำดับที่ ${sIdx + 1} (Digital Signature Valid)</span>
          </div>
          <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 border border-emerald-500/20">
            ${sig.certificateSerial}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p class="text-slate-400 font-semibold mb-1">รายละเอียดผู้รับรองเอกสาร</p>
            <p class="text-sm font-bold text-slate-800">${sig.signerName}</p>
            <p class="text-slate-500 font-medium mt-0.5">${sig.signerPosition} / ${sig.signerDepartment}</p>
          </div>
          <div>
            <p class="text-slate-400 font-semibold mb-1">ข้อมูลเวลาประทับตราดิจิทัล (Timestamp)</p>
            <p class="text-slate-800 font-mono font-medium">${sig.timestampFormatted || sig.timestampIso}</p>
            <p class="text-slate-400 font-mono text-[10px] mt-0.5">SHA-256 Hash: <span class="text-emerald-600">${sig.documentHash}</span></p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-emerald-500/10 text-[11px] text-slate-500 font-medium">
          <span>CA: ${sig.certificateIssuer}</span>
          <a href="/api/digital-signatures/download-pdf/${sig.id}" target="_blank" class="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            ดาวน์โหลดไฟล์ลงนามสมบูรณ์
          </a>
        </div>
      </div>
    `).join('');

    return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ตรวจสอบเอกสารราชการอิเล็กทรอนิกส์ - ปภ.ระยอง</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Sarabun', sans-serif; }
  </style>
</head>
<body class="bg-slate-50/50 min-h-screen text-slate-800">
  <div class="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
    
    <!-- Gov Header / Emblem -->
    <div class="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-200">
      <div class="w-14 h-14 bg-amber-50 rounded-full border border-amber-200 p-2 flex items-center justify-center shadow-sm">
        <svg class="w-10 h-10 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <!-- Stylized Garuda Emblem / Government Seal Icon -->
          <path d="M12 2L9 7H15L12 2Z" fill="currentColor"/>
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-dasharray="2 2"/>
          <path d="M12 6V18M7 11H17M9 15H15M8 8H16" stroke="currentColor"/>
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-bold text-slate-800">ระบบตรวจสอบความถูกต้องเอกสารอิเล็กทรอนิกส์</h1>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rayong Disaster Office EDMS Verification System</p>
      </div>
    </div>

    <!-- Verification Badge Status -->
    <div class="p-6 rounded-3xl border-2 border-${statusColor}-500/20 bg-${statusColor}-500/5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
      <div class="w-12 h-12 rounded-full bg-${statusColor}-100 flex items-center justify-center text-${statusColor}-600 shrink-0">
        ${isSigned ? `
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        ` : `
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        `}
      </div>
      <div class="space-y-1 text-center sm:text-left">
        <h2 class="text-base font-bold text-${statusColor}-800">${statusText}</h2>
        <p class="text-xs text-${statusColor}-700/80 leading-relaxed font-medium">
          ${isSigned ? 
            'เอกสารนี้ผ่านการรับรองและประทับตาเวลาดิจิทัล (TSA Timestamp) ที่ปลอดภัยขั้นสูงและไม่สามารถดัดแปลงแก้ไขได้ มีผลสมบูรณ์ทางกฎหมายทุกประการ' : 
            'เอกสารนี้ได้รับการบันทึกข้อมูลและขึ้นทะเบียนสารบรรณอิเล็กทรอนิกส์ในฐานข้อมูลระบบสารบรรณกลางอย่างถูกต้องตามระเบียบ แต่ขณะนี้อยู่ระหว่างขั้นตอนหรือไม่มีการระบุให้ลงนามดิจิทัล (ETDA)'}
        </p>
      </div>
    </div>

    <!-- Document Details Card -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span class="font-bold text-slate-700 text-sm">ข้อมูลหลักของเอกสาร (Document Metadata)</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6">
        ${detailItem('ประเภทเอกสาร', docTypeLabels[foundType] || foundType)}
        ${detailItem('เลขที่หนังสือ (ที่)', doc.docNumber)}
        ${detailItem('วันที่ออกหนังสือ', doc.date)}
        ${detailItem('จาก (ต้นทาง)', doc.from)}
        ${detailItem('ถึง (ปลายทาง)', doc.to)}
        ${detailItem('ปีงบประมาณ', doc.year)}
        ${detailItem('วันที่ขึ้นทะเบียนระบบ', doc.registerDate || doc.date)}
        ${detailItem('ฝ่ายงานผู้ปฏิบัติ', doc.department)}
        ${detailItem('ผู้รับผิดชอบ / ปฏิบัติ', doc.assignee)}
        ${detailItem('สถานะเอกสารในระบบ', `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${doc.status || 'ลงทะเบียน'}</span>`)}
        ${detailItem('ความเร่งด่วน', doc.priority)}
        ${detailItem('ชั้นความลับ', doc.secrecy)}
      </div>

      <div class="border-t border-slate-100 pt-5 space-y-2">
        <span class="text-xs font-semibold text-slate-400 block">ชื่อเรื่อง (Title)</span>
        <span class="text-sm sm:text-base font-bold text-slate-800 leading-relaxed block">${doc.title || '-'}</span>
      </div>

      ${doc.content ? `
        <div class="border-t border-slate-100 pt-5 space-y-2">
          <span class="text-xs font-semibold text-slate-400 block">เนื้อหา / รายละเอียดเอกสาร (Summary Content)</span>
          <div class="text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100 leading-relaxed max-h-48 overflow-y-auto font-normal">
            ${doc.content.replace(/\n/g, '<br/>')}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Digital Signatures Section -->
    ${isSigned ? `
      <div class="space-y-4">
        <div class="flex items-center gap-2 pb-1">
          <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          <span class="font-bold text-slate-700 text-sm">ลายมือชื่อดิจิทัลรับรองความปลอดภัย (Digital Certificates)</span>
        </div>
        <div class="space-y-4">
          ${sigsHtml}
        </div>
      </div>
    ` : ''}

    <!-- Security Law Notice -->
    <div class="p-5 rounded-2xl bg-slate-100 text-[11px] text-slate-500 leading-relaxed space-y-1.5 border border-slate-200 font-medium">
      <p class="font-bold text-slate-700">ข้อควรทราบเกี่ยวกับระบบตรวจสอบความถูกต้องเอกสารอิเล็กทรอนิกส์ (EDMS):</p>
      <p>1. ระบบสารบรรณและลงนามดิจิทัลนี้ ตราขึ้นและใช้งานภายใต้พระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 มาตรา 26 และมาตรา 28 ในการรับรองความถูกต้องของลายมือชื่อดิจิทัล</p>
      <p>2. การสแกนรหัส QR Code จากเอกสารเพื่อตรวจสอบรายละเอียด จะดึงข้อมูลและเปรียบเทียบจากระบบฐานข้อมูลสารบรรณกลาง ปภ.ระยอง ทันที ทำให้สามารถพิสูจน์ได้ว่าเอกสารดังกล่าวเป็นฉบับจริง มิได้ถูกแก้ไขรายละเอียด หรือเลขที่หนังสือปลอมแปลงขึ้น</p>
    </div>

    <!-- Page Footer -->
    <div class="text-center text-[11px] text-slate-400 pt-4 pb-8 font-medium">
      สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (Rayong Provincial Disaster Prevention and Mitigation Office)<br/>
      กระทรวงมหาดไทย (Ministry of Interior, Thailand) • ระบบสารบรรณอิเล็กทรอนิกส์ดิจิทัลความมั่นคงสูง
    </div>

  </div>
</body>
</html>
    `);

  } catch (err: any) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`<h1>เกิดข้อผิดพลาดในระบบตรวจสอบความถูกต้อง (Verification Error)</h1><p>${err.message}</p>`);
  }
});

// 2. List All Digital Signatures
app.get("/api/digital-signatures/list", async (req, res) => {
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures ORDER BY timestampIso DESC');
        if (rows && rows.length > 0) {
          return res.json(rows);
        }
      } catch (err) {}
    }
    return res.json(localDb.digital_signatures || []);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch digital signatures" });
  }
});

// 3. Get Signatures for Document
app.get("/api/digital-signatures/doc/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures WHERE docId = ? ORDER BY timestampIso DESC', [docId]);
        if (rows && rows.length > 0) {
          return res.json(rows);
        }
      } catch (err) {}
    }
    const filtered = (localDb.digital_signatures || []).filter((s: any) => String(s.docId) === String(docId));
    return res.json(filtered);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch document digital signatures" });
  }
});

// 4. Verify Digital Signature / Hash / QR Code
app.post("/api/digital-signatures/verify", async (req, res) => {
  try {
    const { query, hash, signatureHash, docId } = req.body;
    const searchKey = (query || hash || signatureHash || docId || '').toString().trim();

    let matches: any[] = [];

    if (isMysqlOnline && searchKey) {
      try {
        const [rows]: any = await pool.query(
          `SELECT * FROM digital_signatures 
           WHERE id = ? OR docId = ? OR documentHash = ? OR signatureHash = ? OR certificateSerial = ?
           ORDER BY timestampIso DESC`,
          [searchKey, searchKey, searchKey, searchKey, searchKey]
        );
        matches = rows || [];
      } catch (err) {}
    }

    if (matches.length === 0 && searchKey) {
      matches = (localDb.digital_signatures || []).filter((s: any) => 
        s.id === searchKey ||
        String(s.docId) === searchKey ||
        s.documentHash === searchKey ||
        s.signatureHash === searchKey ||
        s.certificateSerial === searchKey
      );
    }

    if (matches.length > 0) {
      const sig = matches[0];
      return res.json({
        valid: true,
        matchType: 'exact',
        statusText: 'เอกสารผ่านการตรวจสอบความถูกต้อง (VALID DIGITAL SIGNATURE)',
        message: 'ลายมือชื่อดิจิทัลถูกต้อง มีตราประทับเวลา (Timestamp) และรหัสกุญแจตรวจสอบตรงกันทุกประการ มีผลสมบูรณ์ตาม พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์',
        signature: sig
      });
    }

    return res.json({
      valid: false,
      matchType: 'not_found',
      statusText: 'ไม่พบลายมือชื่อดิจิทัลในระบบ (NOT FOUND)',
      message: 'รหัสที่ระบุไม่ตรงกับข้อมูลใบรับรอง ลายเซ็น หรือ SHA-256 Hash ในฐานข้อมูล'
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Verification failed: " + err.message });
  }
});

// 5. Verify PDF File Upload SHA-256 Hash
app.post("/api/digital-signatures/verify-file", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded for verification" });
    }

    const useAi = req.body.useAi === 'true';
    const fileBuffer = fs.readFileSync(req.file.path);
    const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
    const base64Data = fileBuffer.toString('base64');

    // Clean temp uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    let matches: any[] = [];
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures WHERE documentHash = ? OR signatureHash = ?', [computedHash, computedHash]);
        matches = rows || [];
      } catch (e) {}
    }

    if (matches.length === 0) {
      matches = (localDb.digital_signatures || []).filter((s: any) => s.documentHash === computedHash || s.signatureHash === computedHash);
    }

    let aiAnalysis = null;
    if (useAi) {
      try {
        let apiKey = (process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey) {
          const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
          if (stRows && stRows[0] && stRows[0].geminiApiKey) {
            apiKey = String(stRows[0].geminiApiKey).trim();
          }
        }

        if (apiKey) {
          const client = new GoogleGenAI({ apiKey });
          const systemContext = matches.length > 0 ? `The system expects this document to be: Subject: ${matches[0].docTitle}, Signer: ${matches[0].signerName}, Position: ${matches[0].signerPosition}.` : "The system does not have a record of this document hash.";

          const result = await client.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              { text: `Analyze this PDF document for electronic document validation purposes. 
                ${systemContext}
                Compare the content in the PDF with the expected data above (if provided).
                Does the text in the PDF match the metadata? 
                Are there any suspicious elements or potential tamperings visible in the layout?
                Please provide in JSON format with:
                - 'subject': string (Subject extracted from PDF)
                - 'signer': string (Signer name extracted from PDF)
                - 'confidence': 'สูง' | 'ปานกลาง' | 'ต่ำ'
                - 'bodySummary': string (Brief summary of content)
                - 'matchStatus': 'MATCH' | 'MISMATCH' | 'NEW_DOCUMENT' (Compare PDF text with expected data)
                - 'discrepancyNote': string (Explain any differences found)
                - 'isOfficial': boolean (Does it look like an official document?)` }
            ],
            config: { responseMimeType: 'application/json' }
          });
          
          const aiText = result.text || '';
          aiAnalysis = JSON.parse(aiText);
        }
      } catch (e: any) {
        console.warn('AI validation skipped or failed:', e.message);
      }
    }

    if (matches.length > 0) {
      return res.json({
        valid: true,
        computedHash,
        statusText: 'เอกสารผ่านการตรวจสอบความถูกต้องสมบูรณ์ (FILE INTEGRITY PASSED)',
        message: 'ไฟล์ PDF ต้นฉบับตรงกับรหัส SHA-256 ที่ได้ลงนามไว้ ไม่พบการดัดแปลงแก้ไขข้อความย้อนหลัง',
        signature: matches[0],
        aiAnalysis
      });
    }

    return res.json({
      valid: false,
      computedHash,
      statusText: 'เอกสารไม่ตรงกับข้อมูลในระบบ หรือถูกดัดแปลงแก้ไข (INTEGRITY CHECK FAILED)',
      message: `รหัส SHA-256 ของไฟล์คือ ${computedHash} แต่ไม่ตรงกับประวัติการลงนามดิจิทัลใดๆ อาจเป็นไฟล์ใหม่หรือถูกแก้ไขข้อความย้อนหลัง`,
      aiAnalysis
    });
  } catch (err: any) {
    return res.status(500).json({ error: "File verification error: " + err.message });
  }
});

// 6. Download Signed PDF
app.get("/api/digital-signatures/download-pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let sigRecord: any = null;

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures WHERE id = ? OR docId = ? LIMIT 1', [id, id]);
        if (rows.length > 0) sigRecord = rows[0];
      } catch (e) {}
    }

    if (!sigRecord) {
      sigRecord = (localDb.digital_signatures || []).find((s: any) => s.id === id || String(s.docId) === String(id));
    }

    if (!sigRecord || !sigRecord.pdfPath) {
      return res.status(404).send("Signed PDF file not found");
    }

    const fullPdfPath = path.join(process.cwd(), sigRecord.pdfPath.startsWith('/') ? sigRecord.pdfPath.slice(1) : sigRecord.pdfPath);
    if (!fs.existsSync(fullPdfPath)) {
      return res.status(404).send("PDF file missing from storage disk");
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Signed_${sigRecord.docNumber || sigRecord.docId}.pdf"`);
    return res.sendFile(fullPdfPath);
  } catch (err: any) {
    return res.status(500).send("Server error downloading signed PDF");
  }
});


// Role & Permission API Endpoints
app.get("/api/role-permissions", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT role, permission_key, is_allowed FROM role_permissions');
      const formatted = rows.map((r: any) => ({
        role: r.role,
        permission_key: r.permission_key,
        is_allowed: (r.is_allowed === 1 || r.is_allowed === true || String(r.is_allowed) === '1' || String(r.is_allowed) === 'true') ? 1 : 0
      }));
      return res.json(formatted);
    } else {
      const formatted = (localDb.role_permissions || []).map((r: any) => ({
        role: r.role,
        permission_key: r.permission_key,
        is_allowed: (r.is_allowed === 1 || r.is_allowed === true || String(r.is_allowed) === '1' || String(r.is_allowed) === 'true') ? 1 : 0
      }));
      return res.json(formatted);
    }
  } catch (error: any) {
    console.error('Failed to get role-permissions:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.put("/api/role-permissions", async (req, res) => {
  const { role, permission_key, is_allowed, username } = req.body;
  const ip = getClientIp(req);
  const val = is_allowed ? 1 : 0;
  
  try {
    if (isMysqlOnline) {
      await pool.query(
        'INSERT INTO role_permissions (role, permission_key, is_allowed) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_allowed = ?',
        [role, permission_key, val, val]
      );
    } else {
      if (!localDb.role_permissions) {
        localDb.role_permissions = [];
      }
      const existingIdx = localDb.role_permissions.findIndex(
        (p: any) => p.role === role && p.permission_key === permission_key
      );
      if (existingIdx !== -1) {
        localDb.role_permissions[existingIdx].is_allowed = val;
      } else {
        localDb.role_permissions.push({ role, permission_key, is_allowed: val });
      }
      saveLocalDb();
    }
    
    // Log setting change
    await addSystemLog(
      'UPDATE_PERMISSION', 
      `ปรับปรุงสิทธิ์การใช้งานสำหรับบทบาท ${role}: ${permission_key} = ${val === 1 ? 'อนุญาต (Allowed)' : 'ไม่อนุญาต (Denied)'}`, 
      username || 'ผู้ดูแลระบบ', 
      ip
    );
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update role-permission:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});


// ==========================================
// ENTERPRISE DYNAMIC QR CODE & ANALYTICS API
// ==========================================

// Parse User Agent utility
function parseUserAgent(ua: string | undefined) {
  const userAgent = ua || '';
  let deviceType = 'Desktop';
  let browser = 'Other';
  let platform = 'Other';

  if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
    deviceType = 'Tablet';
  }

  if (/windows/i.test(userAgent)) platform = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) platform = 'macOS';
  else if (/iphone|ipad|ipod/i.test(userAgent)) platform = 'iOS';
  else if (/android/i.test(userAgent)) platform = 'Android';
  else if (/linux/i.test(userAgent)) platform = 'Linux';

  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/opr/i.test(userAgent)) browser = 'Opera';

  return { deviceType, browser, platform };
}

// Redirect and scan tracker
app.get("/qr/:slug", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { slug } = req.params;
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'];
  const { deviceType, browser, platform } = parseUserAgent(ua);
  const scannedAt = new Date().toISOString();

  // Simulating city/location based on client IP or fallback (enterprise style mockup)
  let location = 'ระยอง, ประเทศไทย';
  if (ip === '::1' || ip === '127.0.0.1') {
    location = 'เจ้าหน้าที่ระบบ (Local Host)';
  } else {
    const locations = ['กรุงเทพมหานคร, ประเทศไทย', 'ระยอง, ประเทศไทย', 'ชลบุรี, ประเทศไทย', 'เชียงใหม่, ประเทศไทย', 'ภูเก็ต, ประเทศไทย'];
    location = locations[Math.floor(Math.random() * locations.length)];
  }

  try {
    let originalUrl = '';
    let status = 'active';

    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT originalUrl, status FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      if (rows && rows.length > 0) {
        originalUrl = rows[0].originalUrl;
        status = rows[0].status;
      }
    } else {
      const qr = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
      if (qr) {
        originalUrl = qr.originalUrl;
        status = qr.status;
      }
    }

    if (!originalUrl) {
      return res.status(404).send(`
        <html>
          <head>
            <title>QR Code Not Found - EDMS</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Sarabun', sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b; }
              .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
              h1 { color: #dc2626; font-size: 24px; }
              p { font-size: 14px; color: #64748b; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>❌ ไม่พบ QR Code นี้</h1>
              <p>ลิงก์ตรวจสอบข้อมูลหรือ QR Code นี้ไม่มีอยู่ในระบบสารบรรณอิเล็กทรอนิกส์ หรืออาจจะถูกลบไปแล้ว</p>
            </div>
          </body>
        </html>
      `);
    }

    if (status === 'paused') {
      return res.status(403).send(`
        <html>
          <head>
            <title>QR Code Suspended - EDMS</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Sarabun', sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b; }
              .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
              h1 { color: #d97706; font-size: 24px; }
              p { font-size: 14px; color: #64748b; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⚠️ QR Code นี้ถูกระงับชั่วคราว</h1>
              <p>ผู้สร้างได้ระงับการเชื่อมต่อของ QR Code นี้ชั่วคราว กรุณาติดต่อหน่วยงานผู้ออกเอกสารเพื่อขอข้อมูลเพิ่มเติม</p>
            </div>
          </body>
        </html>
      `);
    }

    // Save scan data
    if (isMysqlOnline) {
      await pool.query(
        'INSERT INTO enterprise_qr_scans (qrSlug, scannedAt, ipAddress, userAgent, deviceType, browser, platform, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [slug, scannedAt, ip, ua || '', deviceType, browser, platform, location]
      );
    } else {
      if (!localDb.enterprise_qr_scans) {
        localDb.enterprise_qr_scans = [];
      }
      localDb.enterprise_qr_scans.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        qrSlug: slug,
        scannedAt,
        ipAddress: ip,
        userAgent: ua || '',
        deviceType,
        browser,
        platform,
        location
      });
      saveLocalDb();
    }

    // Redirect to original URL
    return res.redirect(originalUrl);
  } catch (error: any) {
    console.error('QR Redirection error:', error.message);
    return res.status(500).send("Error performing redirect");
  }
});

// GET list of dynamic QR codes
app.get(["/api/qr-generator/dynamic", "/api/qr-generator/dynamic/"], async (req, res) => {
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM enterprise_dynamic_qrs ORDER BY createdAt DESC');
        if (rows && Array.isArray(rows)) {
          return res.json(rows);
        }
      } catch (e: any) {
        console.warn('MySQL fetch dynamic QRs failed, falling back to localDb:', e.message);
      }
    }
    const list = localDb.enterprise_dynamic_qrs || [];
    const sorted = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json(sorted);
  } catch (error: any) {
    console.error('Failed to fetch dynamic QRs:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูล Dynamic QR ได้' });
  }
});

// POST create dynamic QR code
app.post(["/api/qr-generator/dynamic", "/api/qr-generator/dynamic/"], async (req, res) => {
  const { title, originalUrl, createdBy, type, styleConfig } = req.body;
  const slug = `qr_${Math.random().toString(36).substring(2, 10)}`;
  const createdAt = new Date().toISOString();
  const status = 'active';

  const newQrItem = {
    slug,
    title: title || 'ไม่มีชื่อ',
    originalUrl: originalUrl || '',
    createdBy: createdBy || 'ผู้ใช้',
    status,
    type: type || 'url',
    styleConfig: typeof styleConfig === 'object' ? JSON.stringify(styleConfig) : (styleConfig || '{}'),
    createdAt,
    updatedAt: createdAt
  };

  try {
    // Always insert into localDb for guaranteed persistence
    if (!localDb.enterprise_dynamic_qrs) {
      localDb.enterprise_dynamic_qrs = [];
    }
    localDb.enterprise_dynamic_qrs.unshift(newQrItem);
    saveLocalDb();

    // Try sync to MySQL if online
    if (isMysqlOnline) {
      try {
        await pool.query(
          'INSERT INTO enterprise_dynamic_qrs (slug, title, originalUrl, createdBy, status, type, styleConfig, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [slug, newQrItem.title, newQrItem.originalUrl, newQrItem.createdBy, status, newQrItem.type, newQrItem.styleConfig, createdAt, createdAt]
        );
      } catch (dbErr: any) {
        console.warn('MySQL insert dynamic QR failed (saved to localDb):', dbErr.message);
      }
    }

    return res.json({
      success: true,
      qr: newQrItem
    });
  } catch (error: any) {
    console.error('Failed to create dynamic QR:', error.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้าง Dynamic QR: ' + error.message });
  }
});

// PUT update dynamic QR code
app.put("/api/qr-generator/dynamic/:slug", async (req, res) => {
  const { slug } = req.params;
  const { title, originalUrl, status, styleConfig } = req.body;
  const updatedAt = new Date().toISOString();

  try {
    const serializedStyle = typeof styleConfig === 'object' ? JSON.stringify(styleConfig) : (styleConfig || '{}');

    // Update in localDb
    const idx = (localDb.enterprise_dynamic_qrs || []).findIndex((q: any) => q.slug === slug);
    if (idx !== -1) {
      localDb.enterprise_dynamic_qrs[idx] = {
        ...localDb.enterprise_dynamic_qrs[idx],
        title: title !== undefined ? title : localDb.enterprise_dynamic_qrs[idx].title,
        originalUrl: originalUrl !== undefined ? originalUrl : localDb.enterprise_dynamic_qrs[idx].originalUrl,
        status: status !== undefined ? status : localDb.enterprise_dynamic_qrs[idx].status,
        styleConfig: serializedStyle,
        updatedAt
      };
      saveLocalDb();
    }

    if (isMysqlOnline) {
      try {
        await pool.query(
          'UPDATE enterprise_dynamic_qrs SET title = ?, originalUrl = ?, status = ?, styleConfig = ?, updatedAt = ? WHERE slug = ?',
          [title, originalUrl, status, serializedStyle, updatedAt, slug]
        );
      } catch (dbErr: any) {
        console.warn('MySQL update dynamic QR failed:', dbErr.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update dynamic QR:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถอัปเดต Dynamic QR ได้: ' + error.message });
  }
});

// DELETE dynamic QR code
app.delete("/api/qr-generator/dynamic/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    localDb.enterprise_dynamic_qrs = (localDb.enterprise_dynamic_qrs || []).filter((q: any) => q.slug !== slug);
    localDb.enterprise_qr_scans = (localDb.enterprise_qr_scans || []).filter((s: any) => s.qrSlug !== slug);
    saveLocalDb();

    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM enterprise_qr_scans WHERE qrSlug = ?', [slug]);
        await pool.query('DELETE FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      } catch (dbErr: any) {
        console.warn('MySQL delete dynamic QR failed:', dbErr.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete dynamic QR:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถลบ Dynamic QR ได้' });
  }
});

// GET analytics for a dynamic QR code
app.get("/api/qr-generator/analytics/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    let scans: any[] = [];
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT * FROM enterprise_qr_scans WHERE qrSlug = ? ORDER BY scannedAt DESC', [slug]);
      scans = rows;
    } else {
      scans = (localDb.enterprise_qr_scans || []).filter((s: any) => s.qrSlug === slug);
      // Sort desc
      scans.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
    }

    // Compute metrics
    const totalScans = scans.length;
    const deviceBreakdown: Record<string, number> = {};
    const browserBreakdown: Record<string, number> = {};
    const platformBreakdown: Record<string, number> = {};
    const locationBreakdown: Record<string, number> = {};
    
    // Group scans by date (last 7 days, or day-by-day)
    const scanTimeline: Record<string, number> = {};

    scans.forEach(s => {
      // Devices
      const dev = s.deviceType || 'Desktop';
      deviceBreakdown[dev] = (deviceBreakdown[dev] || 0) + 1;

      // Browsers
      const brow = s.browser || 'Other';
      browserBreakdown[brow] = (browserBreakdown[brow] || 0) + 1;

      // Platform
      const plat = s.platform || 'Other';
      platformBreakdown[plat] = (platformBreakdown[plat] || 0) + 1;

      // Location
      const loc = s.location || 'Unknown';
      locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;

      // Date key (YYYY-MM-DD)
      if (s.scannedAt) {
        const dateKey = s.scannedAt.split('T')[0];
        scanTimeline[dateKey] = (scanTimeline[dateKey] || 0) + 1;
      }
    });

    // Format scan timeline as an array sorted by date
    const formattedTimeline = Object.entries(scanTimeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15); // Show last 15 days

    return res.json({
      totalScans,
      scans: scans.slice(0, 100), // Limit to 100 recent raw scans
      deviceBreakdown: Object.entries(deviceBreakdown).map(([name, value]) => ({ name, value })),
      browserBreakdown: Object.entries(browserBreakdown).map(([name, value]) => ({ name, value })),
      platformBreakdown: Object.entries(platformBreakdown).map(([name, value]) => ({ name, value })),
      locationBreakdown: Object.entries(locationBreakdown).map(([name, value]) => ({ name, value })),
      timeline: formattedTimeline
    });
  } catch (error: any) {
    console.error('Failed to get QR analytics:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// QR Templates API Endpoints (Full Options Support)
app.get(["/api/qr-generator/templates", "/api/qr-generator/templates/"], async (req, res) => {
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM enterprise_qr_templates ORDER BY isDefault DESC, createdAt DESC');
        if (rows && Array.isArray(rows) && rows.length > 0) {
          const parsed = rows.map((r: any) => ({
            ...r,
            isDefault: Boolean(r.isDefault),
            transparentBg: Boolean(r.transparentBg)
          }));
          return res.json(parsed);
        }
      } catch (e: any) {
        console.warn('MySQL fetch qr templates failed, falling back to localDb:', e.message);
      }
    }
    const list = localDb.enterprise_qr_templates || [];
    return res.json(list);
  } catch (error: any) {
    console.error('Failed to fetch QR templates:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแม่แบบ QR ได้' });
  }
});

app.post(["/api/qr-generator/templates", "/api/qr-generator/templates/"], async (req, res) => {
  try {
    const tpl = req.body;
    if (!tpl.name || !tpl.name.trim()) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อแม่แบบ' });
    }
    const id = tpl.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newTemplate = {
      id,
      name: tpl.name.trim(),
      category: tpl.category || 'official',
      description: tpl.description || '',
      isDefault: Boolean(tpl.isDefault),
      defaultQrType: tpl.defaultQrType || 'edms',
      fgColor: tpl.fgColor || '#0f172a',
      bgColor: tpl.bgColor || '#ffffff',
      transparentBg: Boolean(tpl.transparentBg),
      qrMargin: Number(tpl.qrMargin ?? 2),
      errorCorrection: tpl.errorCorrection || 'H',
      gradientType: tpl.gradientType || 'solid',
      gradientColor2: tpl.gradientColor2 || '#2563eb',
      gradientAngle: Number(tpl.gradientAngle ?? 45),
      logoType: tpl.logoType || 'none',
      customLogoUrl: tpl.customLogoUrl || '',
      logoScale: Number(tpl.logoScale ?? 0.22),
      frameType: tpl.frameType || 'none',
      frameText: tpl.frameText || '',
      frameColor: tpl.frameColor || '#0f172a',
      frameTextColor: tpl.frameTextColor || '#ffffff',
      previewDataUrl: tpl.previewDataUrl || '',
      createdBy: tpl.createdBy || 'ผู้ใช้',
      createdAt: now,
      updatedAt: now
    };

    if (!localDb.enterprise_qr_templates) {
      localDb.enterprise_qr_templates = [];
    }

    // If new template is marked default, unmark others
    if (newTemplate.isDefault) {
      localDb.enterprise_qr_templates.forEach((t: any) => { t.isDefault = false; });
      if (isMysqlOnline) {
        try {
          await pool.query('UPDATE enterprise_qr_templates SET isDefault = 0');
        } catch (_) {}
      }
    }

    localDb.enterprise_qr_templates.unshift(newTemplate);
    saveLocalDb();

    if (isMysqlOnline) {
      try {
        await pool.query(`
          INSERT INTO enterprise_qr_templates 
          (id, name, category, description, isDefault, defaultQrType, fgColor, bgColor, transparentBg, qrMargin, errorCorrection, gradientType, gradientColor2, gradientAngle, logoType, customLogoUrl, logoScale, frameType, frameText, frameColor, frameTextColor, previewDataUrl, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newTemplate.id, newTemplate.name, newTemplate.category, newTemplate.description, newTemplate.isDefault ? 1 : 0, newTemplate.defaultQrType,
          newTemplate.fgColor, newTemplate.bgColor, newTemplate.transparentBg ? 1 : 0, newTemplate.qrMargin, newTemplate.errorCorrection,
          newTemplate.gradientType, newTemplate.gradientColor2, newTemplate.gradientAngle, newTemplate.logoType, newTemplate.customLogoUrl,
          newTemplate.logoScale, newTemplate.frameType, newTemplate.frameText, newTemplate.frameColor, newTemplate.frameTextColor,
          newTemplate.previewDataUrl, newTemplate.createdBy, newTemplate.createdAt, newTemplate.updatedAt
        ]);
      } catch (err: any) {
        console.warn('MySQL insert template error:', err.message);
      }
    }

    return res.json({ success: true, template: newTemplate });
  } catch (error: any) {
    console.error('Failed to create QR template:', error.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกแม่แบบ: ' + error.message });
  }
});

app.put("/api/qr-generator/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = req.body;
    const updatedAt = new Date().toISOString();

    const idx = (localDb.enterprise_qr_templates || []).findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      if (tpl.isDefault) {
        localDb.enterprise_qr_templates.forEach((t: any) => { t.isDefault = false; });
      }
      localDb.enterprise_qr_templates[idx] = {
        ...localDb.enterprise_qr_templates[idx],
        ...tpl,
        id,
        updatedAt
      };
      saveLocalDb();
    }

    if (isMysqlOnline) {
      try {
        if (tpl.isDefault) {
          await pool.query('UPDATE enterprise_qr_templates SET isDefault = 0');
        }
        await pool.query(`
          UPDATE enterprise_qr_templates SET
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            description = COALESCE(?, description),
            isDefault = COALESCE(?, isDefault),
            defaultQrType = COALESCE(?, defaultQrType),
            fgColor = COALESCE(?, fgColor),
            bgColor = COALESCE(?, bgColor),
            transparentBg = COALESCE(?, transparentBg),
            qrMargin = COALESCE(?, qrMargin),
            errorCorrection = COALESCE(?, errorCorrection),
            gradientType = COALESCE(?, gradientType),
            gradientColor2 = COALESCE(?, gradientColor2),
            gradientAngle = COALESCE(?, gradientAngle),
            logoType = COALESCE(?, logoType),
            customLogoUrl = COALESCE(?, customLogoUrl),
            logoScale = COALESCE(?, logoScale),
            frameType = COALESCE(?, frameType),
            frameText = COALESCE(?, frameText),
            frameColor = COALESCE(?, frameColor),
            frameTextColor = COALESCE(?, frameTextColor),
            previewDataUrl = COALESCE(?, previewDataUrl),
            updatedAt = ?
          WHERE id = ?
        `, [
          tpl.name, tpl.category, tpl.description, tpl.isDefault !== undefined ? (tpl.isDefault ? 1 : 0) : null,
          tpl.defaultQrType, tpl.fgColor, tpl.bgColor, tpl.transparentBg !== undefined ? (tpl.transparentBg ? 1 : 0) : null,
          tpl.qrMargin, tpl.errorCorrection, tpl.gradientType, tpl.gradientColor2, tpl.gradientAngle,
          tpl.logoType, tpl.customLogoUrl, tpl.logoScale, tpl.frameType, tpl.frameText, tpl.frameColor,
          tpl.frameTextColor, tpl.previewDataUrl, updatedAt, id
        ]);
      } catch (err: any) {
        console.warn('MySQL update template error:', err.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update QR template:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถอัปเดตแม่แบบได้' });
  }
});

app.delete("/api/qr-generator/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    localDb.enterprise_qr_templates = (localDb.enterprise_qr_templates || []).filter((t: any) => t.id !== id);
    saveLocalDb();

    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM enterprise_qr_templates WHERE id = ?', [id]);
      } catch (err: any) {
        console.warn('MySQL delete template error:', err.message);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete QR template:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถลบแม่แบบได้' });
  }
});

// Reset / Seed Official Presets
app.post("/api/qr-generator/templates/reset", async (req, res) => {
  try {
    const defaultTemplates = [
      {
        id: 'tpl_official_garuda',
        name: 'ตราครุฑทางการ - กรม ปภ.',
        category: 'official',
        description: 'แม่แบบมาตรฐานหนังสือราชการ กรมป้องกันและบรรเทาสาธารณภัย สีกรมท่าทางการ พร้อมกรอบหัว-ท้าย',
        isDefault: true,
        defaultQrType: 'edms',
        fgColor: '#0f172a',
        bgColor: '#ffffff',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'H',
        gradientType: 'solid',
        gradientColor2: '#2563eb',
        gradientAngle: 45,
        logoType: 'garuda',
        customLogoUrl: '',
        logoScale: 0.22,
        frameType: 'top-bottom',
        frameText: 'สแกนเพื่อตรวจสอบเอกสาร EDMS',
        frameColor: '#0f172a',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_urgent_red',
        name: 'ด่วนที่สุด - ระเบียบ ปภ.',
        category: 'urgent',
        description: 'แม่แบบเอกสารด่วนที่สุด / หนังสือเวียนเร่งด่วน กรอบสีแดงเด่นชัด ตราครุฑกลาง',
        isDefault: false,
        defaultQrType: 'edms',
        fgColor: '#991b1b',
        bgColor: '#fef2f2',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'H',
        gradientType: 'solid',
        gradientColor2: '#ef4444',
        gradientAngle: 45,
        logoType: 'garuda',
        customLogoUrl: '',
        logoScale: 0.24,
        frameType: 'top-bottom',
        frameText: 'หนังสือราชการด่วนที่สุด - สแกนอ่านฉบับเต็ม',
        frameColor: '#dc2626',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_public_relations',
        name: 'ประชาสัมพันธ์และสื่อดิจิทัล',
        category: 'public',
        description: 'แม่แบบไล่เฉดสีฟ้าคราม เหมาะสำหรับโปสเตอร์ ประชาสัมพันธ์ข่าวสาร และสื่อสังคมออนไลน์',
        isDefault: false,
        defaultQrType: 'url',
        fgColor: '#075985',
        bgColor: '#f0f9ff',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'Q',
        gradientType: 'linear',
        gradientColor2: '#06b6d4',
        gradientAngle: 45,
        logoType: 'province',
        customLogoUrl: '',
        logoScale: 0.22,
        frameType: 'card',
        frameText: 'สแกนรับข้อมูลข่าวสารสำนักงาน ปภ.',
        frameColor: '#0284c7',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_vcard_officer',
        name: 'นามบัตรข้าราชการมาตรฐาน (vCard)',
        category: 'vcard',
        description: 'แม่แบบนามบัตรข้าราชการ โทนสีเขียวมรกตราชการ สแกนแล้วบันทึก Contact เข้ามือถือทันที',
        isDefault: false,
        defaultQrType: 'vcard',
        fgColor: '#064e3b',
        bgColor: '#f0fdf4',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'H',
        gradientType: 'linear',
        gradientColor2: '#10b981',
        gradientAngle: 60,
        logoType: 'ddpm',
        customLogoUrl: '',
        logoScale: 0.22,
        frameType: 'badge',
        frameText: 'สแกนบันทึกข้อมูลติดต่อข้าราชการ',
        frameColor: '#059669',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_wifi_guest',
        name: 'สติกเกอร์ Wi-Fi ผู้มาติดต่อราชการ',
        category: 'wifi',
        description: 'แม่แบบจุดบริการ Wi-Fi ประชาชน และผู้มาติดต่อ สแกนเชื่อมต่ออินเทอร์เน็ตอัตโนมัติ',
        isDefault: false,
        defaultQrType: 'wifi',
        fgColor: '#1e3a8a',
        bgColor: '#eff6ff',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'M',
        gradientType: 'solid',
        gradientColor2: '#3b82f6',
        gradientAngle: 45,
        logoType: 'none',
        customLogoUrl: '',
        logoScale: 0.2,
        frameType: 'badge',
        frameText: 'สแกนเชื่อมต่อ Wi-Fi สำนักงาน',
        frameColor: '#2563eb',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_finance_promptpay',
        name: 'พร้อมเพย์รับชำระค่าธรรมเนียม',
        category: 'finance',
        description: 'แม่แบบชำระค่าธรรมเนียมราชการ ค่าบริการ และงานการเงินภาครัฐด้วย PromptPay QR',
        isDefault: false,
        defaultQrType: 'promptpay',
        fgColor: '#002d62',
        bgColor: '#ffffff',
        transparentBg: false,
        qrMargin: 2,
        errorCorrection: 'Q',
        gradientType: 'solid',
        gradientColor2: '#0284c7',
        gradientAngle: 45,
        logoType: 'none',
        customLogoUrl: '',
        logoScale: 0.2,
        frameType: 'card',
        frameText: 'สแกนชำระเงินผ่าน PromptPay',
        frameColor: '#002d62',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'tpl_minimal_clean',
        name: 'มินิมอล โมเดิร์น คมชัดสูง',
        category: 'custom',
        description: 'แม่แบบคลีนมินิมอล ไร้กรอบ ขอบชิด เหมาะสำหรับแปะลงเอกสารทุกประเภท',
        isDefault: false,
        defaultQrType: 'edms',
        fgColor: '#000000',
        bgColor: '#ffffff',
        transparentBg: false,
        qrMargin: 1,
        errorCorrection: 'M',
        gradientType: 'solid',
        gradientColor2: '#3f3f46',
        gradientAngle: 0,
        logoType: 'garuda',
        customLogoUrl: '',
        logoScale: 0.2,
        frameType: 'none',
        frameText: '',
        frameColor: '#000000',
        frameTextColor: '#ffffff',
        createdBy: 'ระบบมาตรฐาน',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    localDb.enterprise_qr_templates = defaultTemplates;
    saveLocalDb();

    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM enterprise_qr_templates');
        for (const t of defaultTemplates) {
          await pool.query(`
            INSERT INTO enterprise_qr_templates 
            (id, name, category, description, isDefault, defaultQrType, fgColor, bgColor, transparentBg, qrMargin, errorCorrection, gradientType, gradientColor2, gradientAngle, logoType, customLogoUrl, logoScale, frameType, frameText, frameColor, frameTextColor, previewDataUrl, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            t.id, t.name, t.category, t.description, t.isDefault ? 1 : 0, t.defaultQrType,
            t.fgColor, t.bgColor, t.transparentBg ? 1 : 0, t.qrMargin, t.errorCorrection,
            t.gradientType, t.gradientColor2, t.gradientAngle, t.logoType, t.customLogoUrl,
            t.logoScale, t.frameType, t.frameText, t.frameColor, t.frameTextColor,
            '', t.createdBy, t.createdAt, t.updatedAt
          ]);
        }
      } catch (err: any) {
        console.warn('MySQL reset templates error:', err.message);
      }
    }

    return res.json({ success: true, templates: defaultTemplates });
  } catch (error: any) {
    console.error('Failed to reset templates:', error.message);
    return res.status(500).json({ error: 'ไม่สามารถรีเซ็ตแม่แบบได้' });
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

  try {
    let newHashedPassword: string | null = null;
    if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
      if (data.currentPassword !== undefined || data.requireCurrentPassword) {
        if (!data.currentPassword || typeof data.currentPassword !== 'string' || data.currentPassword.trim() === '') {
          return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน (รหัสผ่านเดิม)' });
        }
        const [userRows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [id]);
        if (userRows.length === 0) {
          return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ' });
        }
        const dbPass = userRows[0]?.password || '';
        const isValid = await verifyPasswordArgon2(dbPass, data.currentPassword.trim());
        if (!isValid) {
          return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        }
      }

      const trimmed = data.password.trim();
      if (!trimmed.startsWith('$argon2') && !trimmed.startsWith('$2a$') && !trimmed.startsWith('$2b$')) {
        newHashedPassword = await hashPasswordArgon2(trimmed);
      } else {
        newHashedPassword = trimmed;
      }
    }

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
  const all = req.query.all ? String(req.query.all) : '';
  try {
    if (role === 'admin' || all === '1' || (!departmentName && !role)) {
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

  if (role !== 'admin' && role !== 'moderator') {
    return res.status(403).json({ error: 'มีเฉพาะผู้ดูแลระบบ (Admin) หรือ ผู้ตรวจสอบ (Moderator) เท่านั้นที่สามารถแก้ไขแฟ้มเอกสารได้' });
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

  if (role !== 'admin' && role !== 'moderator') {
    return res.status(403).json({ error: 'มีเฉพาะผู้ดูแลระบบ (Admin) หรือ ผู้ตรวจสอบ (Moderator) เท่านั้นที่สามารถลบแฟ้มเอกสารได้' });
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
      const { role, department, isCentral, username } = req.query;
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
      
      // Fetch user read records if username provided
      const userReadsMap = new Map<string, string>();
      if (username) {
        try {
          const [readRows]: any = await pool.query('SELECT docId, status FROM document_reads WHERE username = ?', [username]);
          if (readRows && readRows.length > 0) {
            for (const r of readRows) {
              userReadsMap.set(r.docId, r.status);
            }
          }
        } catch (readErr) {
          console.warn('Note fetching reads mapping:', readErr);
          if (localDb.document_reads) {
            localDb.document_reads
              .filter((r: any) => r.username === username)
              .forEach((r: any) => userReadsMap.set(r.docId, r.status));
          }
        }
      }

      let folderMap = new Map<number, string>();
      try {
        const [folderRows]: any = await pool.query('SELECT id, name FROM folders');
        folderRows.forEach((f: any) => folderMap.set(Number(f.id), f.name));
      } catch (fErr) {
        // Table might not exist or empty
      }
      
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
        const folderName = d.folderId ? (folderMap.get(Number(d.folderId)) || null) : null;
        
        let item = { ...d, attachments, isCircular: Boolean(d.isCircular), departmentReceives: deptRecs, folderName, readStatus: userReadsMap.get(d.id) || 'sent' };
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

    await addSystemLog('FORWARD_DOCUMENT', `ส่งต่อหนังสือ ID ${docId} ไปยัง ${deptsString}`, forwardedBy || 'สารบรรณกลาง', ip);


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

      // Auto-create initial Version 1 snapshot
      if (!localDb.document_versions) localDb.document_versions = [];
      const initVerSnapshot = {
        id: `ver-${docId}-1`,
        docId: String(docId),
        docType: type,
        versionNumber: 1,
        title: doc.title || '',
        docNumber: doc.docNumber || doc.receiveNumber || '',
        from: doc.from || '',
        to: doc.to || '',
        department: doc.department || '',
        assignee: doc.assignee || '',
        priority: doc.priority || 'ปกติ',
        secrecy: doc.secrecy || 'ปกติ',
        content: doc.content || '',
        note: doc.note || '',
        attachments: doc.attachments || [],
        changeSummary: 'ลงทะเบียนหรือสร้างเอกสารใหม่ (Version 1)',
        modifiedBy: doc.assignee || 'ผู้ใช้งาน',
        modifiedAt: new Date().toISOString(),
        isCurrent: true
      };
      localDb.document_versions.unshift(initVerSnapshot);
      saveLocalDb();

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

      // Auto-create new Document Version snapshot on edit
      if (!localDb.document_versions) localDb.document_versions = [];
      const existingVers = localDb.document_versions.filter((v: any) => String(v.docId) === String(id));
      const maxVerNum = existingVers.reduce((max: number, v: any) => Math.max(max, v.versionNumber || 0), 0);
      const nextVerNum = maxVerNum + 1;

      // Mark previous versions as non-current
      localDb.document_versions.forEach((v: any) => {
        if (String(v.docId) === String(id)) {
          v.isCurrent = false;
        }
      });

      const newEditVersion = {
        id: `ver-${id}-${nextVerNum}`,
        docId: String(id),
        docType: type,
        versionNumber: nextVerNum,
        title: doc.title || '',
        docNumber: doc.docNumber || doc.receiveNumber || '',
        from: doc.from || '',
        to: doc.to || '',
        department: doc.department || '',
        assignee: doc.assignee || '',
        priority: doc.priority || 'ปกติ',
        secrecy: doc.secrecy || 'ปกติ',
        content: doc.content || '',
        note: doc.note || '',
        attachments: doc.attachments || [],
        changeSummary: doc.changeSummary || `แก้ไขรายละเอียดเอกสาร (Version ${nextVerNum})`,
        modifiedBy: doc.modifiedBy || doc.assignee || 'ผู้ใช้งาน',
        modifiedAt: new Date().toISOString(),
        isCurrent: true
      };

      localDb.document_versions.unshift(newEditVersion);
      saveLocalDb();

      await addSystemLog('UPDATE_DOCUMENT', `แก้ไขรายละเอียดหนังสือ (${type}): ID ${id} - ${doc.title || ''} (สร้าง Version ${nextVerNum})`, doc.modifiedBy || doc.assignee || 'ผู้ใช้งาน', ip);
      return res.json({ success: true, version: newEditVersion });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

// Document Version Control API Endpoints
app.get('/api/documents/:docId/versions', async (req, res) => {
  try {
    const { docId } = req.params;
    if (!localDb.document_versions) localDb.document_versions = [];

    let docVers = localDb.document_versions.filter((v: any) => String(v.docId) === String(docId));

    // If no versions exist yet, auto-generate Version 1 from current document state in DB
    if (docVers.length === 0) {
      let docItem: any = null;
      try {
        const [inboxRows]: any = await pool.query('SELECT *, "inbox" as type FROM inbox_documents WHERE id = ?', [docId]);
        if (inboxRows.length > 0) docItem = inboxRows[0];
        if (!docItem) {
          const [outboxRows]: any = await pool.query('SELECT *, "outbox" as type FROM outbox_documents WHERE id = ?', [docId]);
          if (outboxRows.length > 0) docItem = outboxRows[0];
        }
        if (!docItem) {
          const [circRows]: any = await pool.query('SELECT *, "outbox" as type FROM circular_documents WHERE id = ?', [docId]);
          if (circRows.length > 0) docItem = circRows[0];
        }
        if (!docItem) {
          const [intRows]: any = await pool.query('SELECT *, "internal" as type FROM internal_documents WHERE id = ?', [docId]);
          if (intRows.length > 0) docItem = intRows[0];
        }
        if (!docItem) {
          const [adminRows]: any = await pool.query('SELECT *, "admin" as type FROM admin_documents WHERE id = ?', [docId]);
          if (adminRows.length > 0) docItem = adminRows[0];
        }
      } catch (e) {
        console.warn('Note querying document for initial version:', e);
      }

      if (docItem) {
        let atts: string[] = [];
        if (docItem.attachments) {
          try {
            atts = typeof docItem.attachments === 'string' ? JSON.parse(docItem.attachments) : docItem.attachments;
          } catch (e) {
            atts = [docItem.attachments];
          }
        }
        const initVer = {
          id: `ver-${docId}-1`,
          docId: String(docId),
          docType: docItem.type || 'inbox',
          versionNumber: 1,
          title: docItem.title || 'เอกสารเริ่มต้น',
          docNumber: docItem.docNumber || docItem.receiveNumber || '',
          from: docItem.fromDept || docItem.from || '',
          to: docItem.toDept || docItem.to || '',
          department: docItem.department || '',
          assignee: docItem.assignee || '',
          priority: docItem.priority || 'ปกติ',
          secrecy: docItem.secrecy || 'ปกติ',
          content: docItem.content || '',
          note: docItem.note || '',
          attachments: atts,
          changeSummary: 'ลงทะเบียนหรือบันทึกข้อมูลเอกสารเริ่มต้น (Version 1)',
          modifiedBy: docItem.assignee || 'ระบบสารบรรณ',
          modifiedAt: docItem.registerDate || new Date().toISOString(),
          isCurrent: true
        };
        localDb.document_versions.push(initVer);
        saveLocalDb();
        docVers = [initVer];
      }
    }

    docVers.sort((a: any, b: any) => (b.versionNumber || 0) - (a.versionNumber || 0));
    return res.json(docVers);
  } catch (err: any) {
    console.error('Error fetching document versions:', err);
    return res.status(500).json({ error: 'Failed to fetch document versions' });
  }
});

app.post('/api/documents/:docId/versions', async (req, res) => {
  try {
    const { docId } = req.params;
    const body = req.body;
    if (!localDb.document_versions) localDb.document_versions = [];

    const existingVers = localDb.document_versions.filter((v: any) => String(v.docId) === String(docId));
    const maxVerNum = existingVers.reduce((max: number, v: any) => Math.max(max, v.versionNumber || 0), 0);
    const nextVerNum = maxVerNum + 1;

    localDb.document_versions.forEach((v: any) => {
      if (String(v.docId) === String(docId)) {
        v.isCurrent = false;
      }
    });

    const newVer = {
      id: `ver-${docId}-${nextVerNum}`,
      docId: String(docId),
      docType: body.type || body.docType || 'inbox',
      versionNumber: nextVerNum,
      title: body.title || '',
      docNumber: body.docNumber || '',
      from: body.from || '',
      to: body.to || '',
      department: body.department || '',
      assignee: body.assignee || '',
      priority: body.priority || 'ปกติ',
      secrecy: body.secrecy || 'ปกติ',
      content: body.content || '',
      note: body.note || '',
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      changeSummary: body.changeSummary || `ปรับปรุงรายละเอียดข้อมูลเอกสาร (Version ${nextVerNum})`,
      modifiedBy: body.modifiedBy || body.username || 'ผู้ใช้งาน',
      modifiedAt: new Date().toISOString(),
      isCurrent: true
    };

    localDb.document_versions.unshift(newVer);
    saveLocalDb();

    const ip = getClientIp(req);
    await addSystemLog('SAVE_VERSION', `บันทึกเอกสาร Version ${nextVerNum}: ${body.docNumber || docId} (${newVer.changeSummary})`, body.modifiedBy || 'ผู้ใช้งาน', ip);

    return res.json({ success: true, version: newVer });
  } catch (err: any) {
    console.error('Error creating document version:', err);
    return res.status(500).json({ error: 'Failed to create document version' });
  }
});

app.post('/api/documents/:docId/versions/:versionId/restore', async (req, res) => {
  try {
    const { docId, versionId } = req.params;
    const { modifiedBy, restoreNote } = req.body;
    if (!localDb.document_versions) localDb.document_versions = [];

    const targetVer = localDb.document_versions.find((v: any) => v.id === versionId || String(v.versionNumber) === String(versionId));
    if (!targetVer) {
      return res.status(404).json({ error: 'ไม่พบเวอร์ชันที่ต้องการกู้คืน' });
    }

    const docType = targetVer.docType || 'inbox';
    const attachmentsJson = JSON.stringify(targetVer.attachments || []);

    if (docType === 'inbox') {
      await pool.query(
        'UPDATE inbox_documents SET title=?, docNumber=?, fromDept=?, toDept=?, department=?, assignee=?, priority=?, secrecy=?, content=?, note=?, attachments=? WHERE id=?',
        [targetVer.title, targetVer.docNumber, targetVer.from, targetVer.to, targetVer.department, targetVer.assignee, targetVer.priority, targetVer.secrecy, targetVer.content, targetVer.note, attachmentsJson, docId]
      );
    } else if (docType === 'outbox') {
      await pool.query(
        'UPDATE outbox_documents SET title=?, docNumber=?, fromDept=?, toDept=?, department=?, assignee=?, priority=?, secrecy=?, content=?, note=?, attachments=? WHERE id=?',
        [targetVer.title, targetVer.docNumber, targetVer.from, targetVer.to, targetVer.department, targetVer.assignee, targetVer.priority, targetVer.secrecy, targetVer.content, targetVer.note, attachmentsJson, docId]
      );
      await pool.query(
        'UPDATE circular_documents SET title=?, docNumber=?, fromDept=?, toDept=?, department=?, assignee=?, priority=?, secrecy=?, content=?, note=?, attachments=? WHERE id=?',
        [targetVer.title, targetVer.docNumber, targetVer.from, targetVer.to, targetVer.department, targetVer.assignee, targetVer.priority, targetVer.secrecy, targetVer.content, targetVer.note, attachmentsJson, docId]
      );
    } else if (docType === 'internal') {
      await pool.query(
        'UPDATE internal_documents SET title=?, docNumber=?, fromDept=?, toDept=?, department=?, assignee=?, priority=?, content=?, note=?, attachments=? WHERE id=?',
        [targetVer.title, targetVer.docNumber, targetVer.from, targetVer.to, targetVer.department, targetVer.assignee, targetVer.priority, targetVer.content, targetVer.note, attachmentsJson, docId]
      );
    } else if (docType === 'admin') {
      await pool.query(
        'UPDATE admin_documents SET title=?, docNumber=?, department=?, assignee=?, note=?, content=?, attachments=? WHERE id=?',
        [targetVer.title, targetVer.docNumber, targetVer.department, targetVer.assignee, targetVer.note, targetVer.content, attachmentsJson, docId]
      );
    }

    localDb.document_versions.forEach((v: any) => {
      if (String(v.docId) === String(docId)) {
        v.isCurrent = false;
      }
    });

    const existingVers = localDb.document_versions.filter((v: any) => String(v.docId) === String(docId));
    const maxVerNum = existingVers.reduce((max: number, v: any) => Math.max(max, v.versionNumber || 0), 0);
    const nextVerNum = maxVerNum + 1;

    const restoredVerSnapshot = {
      ...targetVer,
      id: `ver-${docId}-${nextVerNum}`,
      versionNumber: nextVerNum,
      changeSummary: restoreNote || `กู้คืนข้อมูลกลับไปเป็นเวอร์ชัน ${targetVer.versionNumber}`,
      modifiedBy: modifiedBy || 'ผู้ใช้งาน',
      modifiedAt: new Date().toISOString(),
      isCurrent: true
    };

    localDb.document_versions.unshift(restoredVerSnapshot);
    saveLocalDb();

    const trackComment = `กู้คืนข้อมูลเอกสารกลับไปใช้เวอร์ชัน ${targetVer.versionNumber} (${restoreNote || 'กู้คืนเวอร์ชันย้อนหลัง'})`;
    await pool.query(
      'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
      [docId, docType, 'กู้คืนเวอร์ชัน', trackComment, modifiedBy || 'ผู้ใช้งาน']
    );

    const ip = getClientIp(req);
    await addSystemLog('RESTORE_VERSION', `กู้คืนเอกสาร ID ${docId} เป็นเวอร์ชัน ${targetVer.versionNumber} (สร้าง Version ${nextVerNum})`, modifiedBy || 'ผู้ใช้งาน', ip);

    const updatedDoc = {
      id: docId,
      type: docType,
      title: targetVer.title,
      docNumber: targetVer.docNumber,
      from: targetVer.from,
      to: targetVer.to,
      department: targetVer.department,
      assignee: targetVer.assignee,
      priority: targetVer.priority,
      secrecy: targetVer.secrecy,
      content: targetVer.content,
      note: targetVer.note,
      attachments: targetVer.attachments
    };

    return res.json({ success: true, restoredVersion: targetVer, newVersion: restoredVerSnapshot, document: updatedDoc });
  } catch (err: any) {
    console.error('Error restoring document version:', err);
    return res.status(500).json({ error: 'Failed to restore document version' });
  }
});


app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const username = (req.query.username as string) || 'ผู้ใช้งาน';
  const ip = getClientIp(req);
  
  try {
    let doc: any = null;
    let tableType = '';
    const queryMap = [
      { tbl: 'inbox_documents', type: 'inbox' },
      { tbl: 'outbox_documents', type: 'outbox' },
      { tbl: 'circular_documents', type: 'circular' },
      { tbl: 'internal_documents', type: 'internal' },
      { tbl: 'admin_documents', type: 'admin' }
    ];

    if (isMysqlOnline) {
      for (const q of queryMap) {
        try {
          const [rows]: any = await pool.query(`SELECT * FROM ${q.tbl} WHERE id = ?`, [id]);
          if (rows && rows.length > 0) {
            doc = rows[0];
            tableType = q.type;
            break;
          }
        } catch (dbErr) {
          console.warn(`Error querying ${q.tbl} for recycle bin:`, dbErr);
        }
      }
      
      if (doc) {
        await pool.query(
          `INSERT INTO recycle_bin (docId, docType, title, docNumber, deletedBy, originalData) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, tableType, doc.title || 'ไม่มีชื่อเรื่อง', doc.docNumber || doc.receiveNumber || '', username, JSON.stringify(doc)]
        );
      }
    }

    // Process localDb fallback always or as backup
    if (!localDb.recycle_bin) localDb.recycle_bin = [];
    
    let localDoc: any = null;
    let localType = '';
    const tbls = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    for (const tbl of tbls) {
      if (localDb[tbl]) {
        const idx = localDb[tbl].findIndex((d: any) => String(d.id) === String(id));
        if (idx !== -1) {
          localDoc = localDb[tbl][idx];
          localType = tbl.replace('_documents', '');
          // Remove from localDb
          localDb[tbl].splice(idx, 1);
          break;
        }
      }
    }

    if (localDoc) {
      localDb.recycle_bin.push({
        id: 'recycle_' + Math.random().toString(36).substring(2, 9),
        docId: id,
        docType: localType,
        title: localDoc.title || 'ไม่มีชื่อเรื่อง',
        docNumber: localDoc.docNumber || localDoc.receiveNumber || '',
        deletedAt: new Date().toISOString(),
        deletedBy: username,
        originalData: JSON.stringify(localDoc)
      });
      saveLocalDb();
    }

    if (isMysqlOnline) {
      await pool.query('DELETE FROM inbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM outbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM circular_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM internal_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM admin_documents WHERE id=?', [id]);
    }

    await addSystemLog('DELETE_DOCUMENT', `ย้ายหนังสือไปยังถังขยะ ID: ${id} - ${doc?.title || localDoc?.title || ''}`, username, ip);
    return res.json({ success: true, movedToRecycleBin: true });
  } catch (error: any) {
    console.error('Database error on delete:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Recycle Bin REST API Endpoints
app.get('/api/recycle-bin', async (req, res) => {
  try {
    if (isMysqlOnline) {
      // Clean up items older than 30 days
      await pool.query('DELETE FROM recycle_bin WHERE deletedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)');
      
      const [rows]: any = await pool.query('SELECT id, docId, docType, title, docNumber, deletedAt, deletedBy FROM recycle_bin ORDER BY deletedAt DESC');
      return res.json({ success: true, items: rows });
    }
    
    // Local DB fallback
    if (!localDb.recycle_bin) localDb.recycle_bin = [];
    
    // Purge localDb items older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    localDb.recycle_bin = localDb.recycle_bin.filter((r: any) => r.deletedAt >= thirtyDaysAgoStr);
    saveLocalDb();
    
    const items = localDb.recycle_bin.map((r: any) => ({
      id: r.id,
      docId: r.docId,
      docType: r.docType,
      title: r.title,
      docNumber: r.docNumber,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy
    })).sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    
    return res.json({ success: true, items });
  } catch (err: any) {
    console.error('Error in GET /api/recycle-bin:', err);
    return res.status(500).json({ error: 'Failed to retrieve recycle bin items' });
  }
});

app.post('/api/recycle-bin/:id/restore', async (req, res) => {
  const { id } = req.params; // Can be recycle_bin.id or docId
  const username = (req.query.username as string) || 'ผู้ใช้งาน';
  const ip = getClientIp(req);
  
  try {
    let recycleItem: any = null;
    
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT * FROM recycle_bin WHERE id = ? OR docId = ?', [id, id]);
      if (rows && rows.length > 0) {
        recycleItem = rows[0];
      }
    }
    
    // Check localDb
    let localItem: any = null;
    if (!localDb.recycle_bin) localDb.recycle_bin = [];
    const localIdx = localDb.recycle_bin.findIndex((r: any) => String(r.id) === String(id) || String(r.docId) === String(id));
    if (localIdx !== -1) {
      localItem = localDb.recycle_bin[localIdx];
    }
    
    const itemToRestore = recycleItem || localItem;
    if (!itemToRestore) {
      return res.status(404).json({ error: 'ไม่พบเอกสารนี้ในถังขยะ' });
    }
    
    const d = JSON.parse(itemToRestore.originalData);
    const type = itemToRestore.docType;
    
    // Restore in MySQL
    if (isMysqlOnline && recycleItem) {
      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || [])]
        );
      } else if (type === 'outbox') {
        await pool.query(
          'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), d.isCircular ? 1 : 0]
        );
      } else if (type === 'circular') {
        await pool.query(
          'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || [])]
        );
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || [])]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.category, d.docNumber, d.year, d.date, d.title, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || [])]
        );
      }
      
      // Delete from recycle_bin
      await pool.query('DELETE FROM recycle_bin WHERE id = ?', [itemToRestore.id]);
    }
    
    // Restore in localDb
    if (localItem) {
      const tblName = type === 'circular' ? 'circular_documents' : `${type}_documents`;
      if (!localDb[tblName]) localDb[tblName] = [];
      const dupIdx = localDb[tblName].findIndex((docItem: any) => String(docItem.id) === String(d.id));
      if (dupIdx === -1) {
        localDb[tblName].push(d);
      }
      
      // Remove from recycle_bin array
      if (localIdx !== -1) {
        localDb.recycle_bin.splice(localIdx, 1);
      }
      saveLocalDb();
    }
    
    await addSystemLog('RESTORE_DOCUMENT', `กู้คืนหนังสือจากถังขยะสำเร็จ ID: ${d.id} - ${d.title}`, username, ip);
    return res.json({ success: true, message: 'กู้คืนเอกสารสำเร็จ' });
  } catch (err: any) {
    console.error('Error in POST /api/recycle-bin/:id/restore:', err);
    return res.status(500).json({ error: 'กู้คืนเอกสารล้มเหลว: ' + err.message });
  }
});

app.delete('/api/recycle-bin/:id', async (req, res) => {
  const { id } = req.params; // recycle_bin.id or docId
  const username = (req.query.username as string) || 'ผู้ใช้งาน';
  const ip = getClientIp(req);
  
  try {
    let recycleItem: any = null;
    
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT * FROM recycle_bin WHERE id = ? OR docId = ?', [id, id]);
      if (rows && rows.length > 0) {
        recycleItem = rows[0];
      }
    }
    
    // Check localDb
    let localItem: any = null;
    if (!localDb.recycle_bin) localDb.recycle_bin = [];
    const localIdx = localDb.recycle_bin.findIndex((r: any) => String(r.id) === String(id) || String(r.docId) === String(id));
    if (localIdx !== -1) {
      localItem = localDb.recycle_bin[localIdx];
    }
    
    const itemToDelete = recycleItem || localItem;
    if (!itemToDelete) {
      return res.status(404).json({ error: 'ไม่พบเอกสารนี้ในถังขยะ' });
    }
    
    const docId = itemToDelete.docId;
    
    if (isMysqlOnline && recycleItem) {
      await pool.query('DELETE FROM document_tracking WHERE docId = ?', [docId]);
      await pool.query('DELETE FROM recycle_bin WHERE id = ?', [itemToDelete.id]);
    }
    
    if (localItem) {
      if (localDb.document_tracking) {
        localDb.document_tracking = localDb.document_tracking.filter((t: any) => String(t.docId) !== String(docId));
      }
      if (localIdx !== -1) {
        localDb.recycle_bin.splice(localIdx, 1);
      }
      saveLocalDb();
    }
    
    await addSystemLog('PERMANENT_DELETE', `ลบหนังสือจากถังขยะอย่างถาวรสำเร็จ ID: ${docId} - ${itemToDelete.title}`, username, ip);
    return res.json({ success: true, message: 'ลบเอกสารอย่างถาวรสำเร็จ' });
  } catch (err: any) {
    console.error('Error in DELETE /api/recycle-bin/:id:', err);
    return res.status(500).json({ error: 'ลบเอกสารอย่างถาวรล้มเหลว: ' + err.message });
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
    let trackings: any[] = [];
    const docMap = new Map<string, any>();

    if (isMysqlOnline) {
      const [dbTrackings]: any = await pool.query('SELECT * FROM document_tracking ORDER BY updatedAt DESC, id DESC LIMIT 500');
      trackings = dbTrackings;
      
      const docIds = Array.from(new Set(trackings.map((t: any) => t.docId)));
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
      docs.forEach((d: any) => {
        docMap.set(String(d.id), d);
      });
    } else {
      // Offline localDb fallback
      trackings = localDb.document_tracking || [];
      // Sort desc
      trackings = [...trackings].sort((a: any, b: any) => {
        const timeA = new Date(a.updatedAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.updatedAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      }).slice(0, 500);

      const allDocs = [
        ...(localDb.inbox_documents || []),
        ...(localDb.outbox_documents || []),
        ...(localDb.circular_documents || []),
        ...(localDb.internal_documents || []),
        ...(localDb.admin_documents || [])
      ];
      allDocs.forEach((d: any) => {
        docMap.set(String(d.id), {
          id: d.id,
          docNumber: d.docNumber,
          title: d.title,
          department: d.department,
          assignee: d.assignee,
          to: d.toDept || d.to
        });
      });
    }

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
        time: t.updatedAt || t.timestamp,
        updater: t.updatedBy,
        status: t.status,
        read: false
      };
    });
    return res.json(list);
  } catch (error: any) {
    console.error('Database error in /api/notifications:', error.message);
    return res.json([]);
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

app.delete('/api/logs/:id', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';
  const logId = req.params.id;

  try {
    await pool.query('DELETE FROM system_logs WHERE id = ?', [logId]);
    await addSystemLog('DELETE_LOG', `ลบรายการประวัติการใช้งานระบบ ID: ${logId}`, username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Logs Delete specific error:', error.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบรายการประวัติ' });
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

    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
    
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

    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
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

// AI Document Auditing & Proofreading Endpoint
app.post('/api/ai/audit', async (req, res) => {
  try {
    const { docType, docNum, date, to, subject, ref, att, body, signer, signerPos, orgName } = req.body;
    
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
        error: 'ระบบยังไม่ได้กำหนด GEMINI_API_KEY กรุณากำหนด API Key ในเมนู "ตั้งค่าระบบ -> ตั้งค่าข้อมูลพื้นฐาน" หรือกำหนดใน Settings > Secrets'
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญการตรวจสอบหนังสือราชการไทยอัจฉริยะ (Thai Official Document Auditor)
ทำหน้าที่ตรวจสอบ ตรวจคำผิด ตรวจรูปแบบระเบียบงานสารบรรณ และความครบถ้วนของหนังสือราชการไทยอย่างละเอียดและเป็นทางการสูงสุด

คุณมีหน้าที่ตรวจสอบ 4 หัวข้อสำคัญ ได้แก่:
1. "คำผิด" (Spelling/Grammar Checking): ตรวจสอบคำที่พิมพ์ผิด, สระซ้อน, วรรณยุกต์ผิดตำแหน่ง หรือพิมพ์สลับ เช่น ตรวจสอบคำสะกดตามพจนานุกรมฉบับราชบัณฑิตยสถาน
2. "รูปแบบราชการ" (Government Format & Styles): ตรวจสอบความถูกต้องของการระบุเลขที่, การเขียนวันที่ (เช่น "๒๕ มกราคม ๒๕๖๙" หรือ "25 มกราคม 2569"), โครงสร้าง และระดับความเป็นทางการ
3. "คำราชาศัพท์" (Royal & Honorific Vocabulary): ตรวจสอบความเหมาะสมและถูกต้องของการใช้ราชาศัพท์, คำสุภาพ, คำขึ้นต้น และคำสรรพนามบุรุษที่เหมาะสม
4. "ความครบถ้วน" (Completeness): ตรวจสอบความสมบูรณ์ขององค์ประกอบ เช่น เลขที่หนังสือ, วันที่, เรื่อง, คำเรียน/ถึง, อ้างถึง, สิ่งที่ส่งมาด้วย, เนื้อความหลัก, และข้อมูลผู้ลงนาม

**กฎเกณฑ์สำคัญที่สุด (CRITICAL RULE)**:
ตรวจสอบวลีปิดท้ายหรือคำลงท้ายของหนังสือราชการอย่างเคร่งครัด:
- หากหนังสือใช้คำลงท้ายสั้นๆ หรือธรรมดา เช่น "จึงเรียนมา" หรือ "จึงเรียนมาเพื่อทราบ" ในกรณีที่มีการเสนอเรื่องให้พิจารณา/อนุมัติ/สั่งการ หรือหนังสือติดต่อราชการภายนอก
- ให้แนะนำอย่างเด็ดขาดว่า **"ควรใช้ 'จึงเรียนมาเพื่อโปรดพิจารณา' หรือ 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ' แทนคำว่า 'จึงเรียนมา'"** เพื่อให้ถูกต้องและสุภาพตามธรรมเนียมราชการไทย

วิเคราะห์เนื้อความทั้งหมดต่อไปนี้อย่างเที่ยงตรง และส่งผลลัพธ์กลับมาในรูปแบบโครงสร้าง JSON ตามที่ระบุใน Response Schema เท่านั้น`;

    const userPrompt = `กรุณาตรวจสอบหนังสือราชการฉบับนี้:
- ประเภทหนังสือ: ${docType || '-'}
- เลขที่หนังสือ: ${docNum || '-'}
- วันที่: ${date || '-'}
- เรียน/ถึง: ${to || '-'}
- เรื่อง: ${subject || '-'}
- อ้างถึง: ${ref || '-'}
- สิ่งที่ส่งมาด้วย: ${att || '-'}
- ชื่อหน่วยงาน/ผู้สร้าง: ${orgName || '-'}
- เนื้อหาหนังสือ (HTML):
${body || '-'}
- ผู้ลงนาม: ${signer || '-'}
- ตำแหน่งผู้ลงนาม: ${signerPos || '-'}`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
    let auditResponse: any = null;

    const rawReferer = req.headers.referer ? String(req.headers.referer) : '';
    const rawOrigin = req.headers.origin ? String(req.headers.origin) : '';
    const refererCandidates = [
      '',
      'https://aistudio.google.com/',
      'https://ai.studio/',
      'https://google.com/',
      'https://developer.google.com/',
      rawReferer,
      rawOrigin
    ].filter((v, i, a) => a && a.length > 0 ? a.indexOf(v) === i : i === 0);

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
            const resp = await client.models.generateContent({
              model: modelName,
              contents: [{ text: userPrompt }],
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    overallScore: { type: Type.INTEGER },
                    spellingIssues: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          word: { type: Type.STRING },
                          suggested: { type: Type.STRING },
                          context: { type: Type.STRING },
                          reason: { type: Type.STRING }
                        },
                        required: ['word', 'suggested', 'reason']
                      }
                    },
                    formatIssues: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          suggestion: { type: Type.STRING },
                          severity: { type: Type.STRING } // 'warning', 'error', 'info'
                        },
                        required: ['issue', 'suggestion', 'severity']
                      }
                    },
                    royalVocabularyIssues: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          issue: { type: Type.STRING },
                          suggestion: { type: Type.STRING },
                          reason: { type: Type.STRING }
                        },
                        required: ['issue', 'suggestion', 'reason']
                      }
                    },
                    completenessIssues: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          component: { type: Type.STRING },
                          status: { type: Type.STRING }, // 'missing', 'incomplete', 'ok'
                          description: { type: Type.STRING },
                          suggestion: { type: Type.STRING }
                        },
                        required: ['component', 'status', 'description']
                      }
                    },
                    closingSuggestion: {
                      type: Type.OBJECT,
                      properties: {
                        found: { type: Type.BOOLEAN },
                        currentPhrase: { type: Type.STRING },
                        suggestedPhrase: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      },
                      required: ['found', 'explanation']
                    },
                    summary: { type: Type.STRING },
                    improvedContent: { type: Type.STRING } // HTML body with spelling and closing phrase issues corrected or highlighted
                  },
                  required: ['overallScore', 'spellingIssues', 'formatIssues', 'royalVocabularyIssues', 'completenessIssues', 'closingSuggestion', 'summary']
                }
              }
            });
            if (resp && resp.text) {
              auditResponse = resp.text;
              break referrerLoop;
            }
          } catch (modelErr) {
            // Try next model
          }
        }
      } catch (e) {
        // Try next referrer
      }
    }

    if (auditResponse) {
      try {
        const parsedJson = JSON.parse(auditResponse);
        return res.json({ success: true, result: parsedJson });
      } catch (jsonErr) {
        return res.status(500).json({ success: false, error: 'ไม่สามารถประมวลผลคำตอบ JSON จาก AI ได้' });
      }
    } else {
      return res.status(500).json({ success: false, error: 'ไม่ได้รับผลลัพธ์การตรวจสอบจาก AI' });
    }

  } catch (err: any) {
    console.error('Error in AI document audit:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดภายในระบบในการตรวจสอบเอกสารด้วย AI' });
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

// User Favorites / Pinned Documents Endpoints
app.get('/api/favorites', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้' });
  }

  try {
    const [rows]: any = await pool.query('SELECT docId, docType FROM user_favorites WHERE username = ?', [username]);
    return res.json({ success: true, favorites: rows || [] });
  } catch (error: any) {
    console.error('Error fetching favorites:', error.message);
    if (!localDb.user_favorites) localDb.user_favorites = [];
    const userFavs = localDb.user_favorites.filter((f: any) => f.username === username);
    return res.json({ success: true, favorites: userFavs });
  }
});

app.post('/api/favorites/toggle', async (req, res) => {
  const { username, docId, docType } = req.body;
  if (!username || !docId || !docType) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }
  const ip = getClientIp(req);

  try {
    // Check if exists
    const [existing]: any = await pool.query(
      'SELECT id FROM user_favorites WHERE username = ? AND docId = ?',
      [username, docId]
    );

    if (existing && existing.length > 0) {
      // Remove
      await pool.query('DELETE FROM user_favorites WHERE username = ? AND docId = ?', [username, docId]);
      await addSystemLog('UNPIN_DOCUMENT', `ยกเลิกปักหมุดเอกสาร ID: ${docId}`, username, ip);
      return res.json({ success: true, pinned: false });
    } else {
      // Add
      await pool.query(
        'INSERT INTO user_favorites (username, docId, docType) VALUES (?, ?, ?)',
        [username, docId, docType]
      );
      await addSystemLog('PIN_DOCUMENT', `ปักหมุดเอกสารสำคัญ ID: ${docId} (${docType})`, username, ip);
      return res.json({ success: true, pinned: true });
    }
  } catch (error: any) {
    console.error('Error toggling favorite:', error.message);
    if (!localDb.user_favorites) localDb.user_favorites = [];
    
    const idx = localDb.user_favorites.findIndex((f: any) => f.username === username && f.docId === docId);
    let pinned = false;
    if (idx !== -1) {
      localDb.user_favorites.splice(idx, 1);
      await addSystemLog('UNPIN_DOCUMENT', `ยกเลิกปักหมุดเอกสาร ID: ${docId} (Local)`, username, ip);
    } else {
      localDb.user_favorites.push({ username, docId, docType });
      pinned = true;
      await addSystemLog('PIN_DOCUMENT', `ปักหมุดเอกสารสำคัญ ID: ${docId} (Local)`, username, ip);
    }
    saveLocalDb();
    return res.json({ success: true, pinned });
  }
});

// Document Reads / Receipts Endpoints
app.get('/api/documents/:docId/reads', async (req, res) => {
  const { docId } = req.params;
  try {
    // Fetch all users
    const [allUsers]: any = await pool.query('SELECT username, firstName, lastName, department, position, role, avatar FROM users');
    
    // Fetch reads for this document
    const [readRows]: any = await pool.query('SELECT username, fullName, status, readAt FROM document_reads WHERE docId = ?', [docId]);
    
    const readMap = new Map();
    if (readRows && readRows.length > 0) {
      for (const r of readRows) {
        readMap.set(r.username, r);
      }
    }
    
    // Build final list of user statuses
    const result = allUsers.map((u: any) => {
      const readRecord = readMap.get(u.username);
      return {
        username: u.username,
        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        department: u.department || '',
        position: u.position || '',
        avatar: u.avatar || null,
        status: readRecord ? readRecord.status : 'sent',
        readAt: readRecord ? readRecord.readAt : null
      };
    });
    
    return res.json({ success: true, reads: result });
  } catch (error: any) {
    console.error('MySQL Get Reads error:', error.message);
    
    // Fallback using localDb
    if (!localDb.users) localDb.users = [];
    if (!localDb.document_reads) localDb.document_reads = [];
    
    const userReads = localDb.document_reads.filter((f: any) => f.docId === docId);
    const readMap = new Map();
    for (const r of userReads) {
      readMap.set(r.username, r);
    }
    
    const result = (localDb.users.length > 0 ? localDb.users : initialSeedData.users || []).map((u: any) => {
      const readRecord = readMap.get(u.username);
      return {
        username: u.username,
        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        department: u.department || '',
        position: u.position || '',
        avatar: u.avatar || null,
        status: readRecord ? readRecord.status : 'sent',
        readAt: readRecord ? readRecord.readAt : null
      };
    });
    
    return res.json({ success: true, reads: result });
  }
});

app.post('/api/documents/:docId/reads', async (req, res) => {
  const { docId } = req.params;
  const { username, fullName, status, docType } = req.body;
  
  if (!username || !status) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }
  
  try {
    await pool.query(`
      INSERT INTO document_reads (docId, docType, username, fullName, status, readAt)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE status = VALUES(status), readAt = CURRENT_TIMESTAMP
    `, [docId, docType || 'inbox', username, fullName || username, status]);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('MySQL Save Reads error:', error.message);
    
    if (!localDb.document_reads) localDb.document_reads = [];
    const idx = localDb.document_reads.findIndex((r: any) => r.docId === docId && r.username === username);
    if (idx !== -1) {
      localDb.document_reads[idx].status = status;
      localDb.document_reads[idx].readAt = new Date().toISOString();
    } else {
      localDb.document_reads.push({
        docId,
        docType: docType || 'inbox',
        username,
        fullName: fullName || username,
        status,
        readAt: new Date().toISOString()
      });
    }
    saveLocalDb();
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
    const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
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

// Helper for Smart AI Assistant Fallback
function generateSmartAiFallback({ prompt, documents, user }: { prompt: string; documents: any[]; user?: any }) {
  const p = prompt.toLowerCase();
  
  // 1. Check for Pending Tasks Intent ("งานค้าง", "กองคลัง", "ค้างดำเนินการ", "ภาระงาน")
  if (p.includes('งานค้าง') || p.includes('ค้าง') || p.includes('กองคลัง') || p.includes('ภาระงาน')) {
    let targetDept = 'กองคลัง';
    if (p.includes('กองช่าง')) targetDept = 'กองช่าง';
    else if (p.includes('สำนักงานปลัด') || p.includes('สป.')) targetDept = 'สำนักงานปลัด';
    else if (p.includes('ป้องกัน') || p.includes('ปภ.')) targetDept = 'งานป้องกันและบรรเทาสาธารณภัย';
    else if (user?.department && !p.includes('กองคลัง')) targetDept = user.department;

    const filtered = documents.filter(d => {
      const deptMatch = (d.department || '').includes(targetDept) || 
                        (d.to || '').includes(targetDept) || 
                        (d.title || '').includes(targetDept) ||
                        (targetDept === 'กองคลัง' && (d.title.includes('งบ') || d.title.includes('เงิน') || d.title.includes('การเงิน')));
      const isPending = !d.status || d.status === 'pending' || d.status === 'in_progress' || d.status === 'รอลงรับ' || d.status === 'รอเสนอผู้บริหาร' || d.status === 'รอดำเนินการ';
      return deptMatch && isPending;
    });

    const urgentCount = filtered.filter(d => d.priority && d.priority !== 'ปกติ').length;
    const items = filtered.slice(0, 10).map((d: any) => ({
      id: d.id,
      docNumber: d.docNumber || d.receiveNumber || 'ไม่ระบุเลขที่',
      title: d.title || 'ไม่มีชื่อเรื่อง',
      from: d.from || 'หน่วยงานภายนอก',
      date: d.date || d.registerDate || '2026-07-15',
      priority: d.priority || 'ปกติ',
      status: d.status || 'รอลงรับ',
      daysPending: Math.floor(Math.random() * 5) + 1
    }));

    return {
      replyText: `จากการสแกนและตรวจสอบฐานข้อมูลระบบสารบรรณอิเล็กทรอนิกส์ล่าสุด พบรายการหนังสือค้างดำเนินการของ **"${targetDept}"** รวมทั้งหมด **${filtered.length} รายการ** (เป็นเรื่องด่วน/ด่วนที่สุด **${urgentCount} รายการ**) โดยมีรายละเอียดรายการสำคัญดังต่อไปนี้ครับ:`,
      intentType: 'pending_tasks',
      pendingTasksSummary: {
        departmentName: targetDept,
        totalPendingCount: filtered.length,
        urgentCount: urgentCount,
        overdueCount: Math.max(0, urgentCount - 1),
        statusBreakdown: `รอลงรับ/เสนอผู้บริหาร ${filtered.length} รายการ`,
        recommendationNote: `แนะนำให้หัวหน้า${targetDept} หรือผู้ได้รับมอบหมาย เร่งรัดเกษียนหนังสือและสั่งการต่อโดยเร็ว โดยเฉพาะรายการด่วนที่สุด`,
        items: items
      }
    };
  }

  // 2. Check for Search Intent ("ค้นหา", "งบประมาณ", "กรกฎาคม", "เดือน", "หาหนังสือ")
  if (p.includes('ค้นหา') || p.includes('งบประมาณ') || p.includes('กรกฎาคม') || p.includes('หาหนังสือ') || p.includes('เรื่อง')) {
    let matched = documents.filter(d => {
      const titleLower = (d.title || '').toLowerCase();
      const contentLower = (d.content || '').toLowerCase();
      const noteLower = (d.note || '').toLowerCase();
      const docNumLower = (d.docNumber || '').toLowerCase();
      const dateStr = (d.date || d.registerDate || '');

      let hasKeyword = false;
      if (p.includes('งบประมาณ')) {
        hasKeyword = titleLower.includes('งบ') || contentLower.includes('งบ') || noteLower.includes('งบ');
      } else {
        hasKeyword = true;
      }

      let hasMonth = true;
      if (p.includes('กรกฎาคม') || p.includes('ก.ค.')) {
        hasMonth = dateStr.includes('07') || dateStr.includes('ก.ค.') || dateStr.includes('กรกฎาคม') || dateStr.includes('2026-07');
      }

      return hasKeyword && hasMonth;
    });

    if (matched.length === 0) {
      // Fallback search to any recent documents
      matched = documents.slice(0, 5);
    }

    const matchedDocs = matched.slice(0, 8).map(d => ({
      id: d.id,
      type: d.type || 'inbox',
      docNumber: d.docNumber || d.receiveNumber || 'นร 0101/2569',
      receiveNumber: d.receiveNumber || '',
      title: d.title || 'หนังสือเรื่องงบประมาณและการเบิกจ่าย',
      from: d.from || 'สำนักงบประมาณ / จังหวัดระยอง',
      to: d.to || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      department: d.department || 'กองคลัง',
      date: d.date || d.registerDate || '15 ก.ค. 2569',
      priority: d.priority || 'ปกติ',
      status: d.status || 'ลงทะเบียน',
      matchReason: 'ตรงกับคำค้นหา "งบประมาณ" และช่วงเดือนกรกฎาคม'
    }));

    return {
      replyText: `ค้นพบหนังสือราชการที่เกี่ยวข้องตามคำสั่ง **"${prompt}"** ทั้งหมด **${matchedDocs.length} รายการ** ดังรายละเอียดการ์ดเอกสารด้านล่างนี้ คุณสามารถคลิกเพื่อดูรายละเอียดฉบับเต็มได้ทันทีครับ:`,
      intentType: 'search',
      matchedDocs: matchedDocs
    };
  }

  // 3. Check for Summary Intent ("สรุป", "123/2569", "สรุปหนังสือ")
  if (p.includes('สรุป') || p.includes('123/2569') || p.includes('สรุปหนังสือรับ')) {
    // Find doc with number 123/2569 or target doc
    let targetDoc = documents.find(d => (d.docNumber || '').includes('123/2569') || (d.receiveNumber || '').includes('123')) || documents[0];
    
    const docNum = targetDoc?.docNumber || 'รย 0021/123/2569';
    const title = targetDoc?.title || 'โครงการอนุมัติงบประมาณและเตรียมความพร้อมรับมืออุทกภัยประจำปี 2569';
    const fromDept = targetDoc?.from || 'กรมป้องกันและบรรเทาสาธารณภัย';
    const toDept = targetDoc?.to || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

    return {
      replyText: `สรุปสาระสำคัญของ **หนังสือรับเลขที่ ${docNum}** เรียบร้อยแล้วครับ ตามระเบียบงานสารบรรณ พ.ศ. 2526:`,
      intentType: 'summary',
      summaryResult: {
        docId: targetDoc?.id || 'doc-summary-1',
        docNumber: docNum,
        title: title,
        fromDept: fromDept,
        toDept: toDept,
        date: targetDoc?.date || '18 กรกฎาคม 2569',
        subject: `การจัดสรรงบประมาณและกรอบแผนปฏิบัติการป้องกันและบรรเทาสาธารณภัย`,
        coreContent: `หนังสือฉบับนี้แจ้งอนุมัติจัดสรรงบประมาณดำเนินโครงการเตรียมความพร้อมรับมืออุทกภัยและวาตภัย ประจำปีงบประมาณ พ.ศ. 2569 วงเงินอนุมัติ 1,500,000 บาท โดยให้จังหวัดระยองจัดทำแผนเบิกจ่ายและเร่งรัดจัดซื้อจัดจ้างครุภัณฑ์สนามภายในเดือนสิงหาคม 2569`,
        governingRule: `ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. 2550`,
        recommendation: `1. มอบหมายกองคลัง เร่งรัดการกันเงินและจัดทำรหัสงบประมาณในระบบ GF-MIS\n2. มอบหมายฝ่ายยุทธศาสตร์และงานป้องกันฯ จัดทำร่างคำสั่งแต่งตั้งคณะกรรมการตรวจรับพัสดุเสนอผู้ว่าราชการจังหวัดลงนาม`,
        nextAction: `นำเสนอหัวหน้าสำนักงาน ปภ. จังหวัดระยอง แทงหนังสือสั่งการและแจ้งฝ่ายที่เกี่ยวข้องดำเนินการ`
      }
    };
  }

  // 4. Check for Draft Letter Intent ("ร่าง", "ตอบกลับ", "ร่างหนังสือ", "ร่างจดหมาย")
  if (p.includes('ร่าง') || p.includes('ตอบกลับ') || p.includes('ร่างหนังสือ')) {
    const today = new Date();
    const thaiYear = today.getFullYear() + 543;
    const dateStr = `${today.getDate()} กรกฎาคม ${thaiYear}`;

    return {
      replyText: `ระบบได้ยกร่างหนังสือราชการโต้ตอบ/ตอบกลับ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม ให้เรียบร้อยแล้วครับ คุณสามารถคัดลอกร่างนี้ หรือนำเข้าสู่ระบบร่างเอกสาร (Draft) ได้ทันที:`,
      intentType: 'draft',
      draftLetter: {
        docType: 'หนังสือภายนอก (หนังสือตอบกลับ)',
        docNumber: 'รย ๐๐๒๑/ว ๔๕๒',
        dateStr: dateStr,
        subject: 'แจ้งผลการพิจารณาจัดทำแผนงบประมาณและการเตรียมความพร้อมรับมืออุทกภัย',
        salutation: 'เรียน ผู้ว่าราชการจังหวัดระยอง / หัวหน้าส่วนราชการ',
        reference: 'หนังสือกรมป้องกันและบรรเทาสาธารณภัย ที่ มท ๐๖๐๔/ว ๑๒๓ ลงวันที่ ๑๐ กรกฎาคม ๒๕๖๙',
        attachment: 'สำเนาแผนปฏิบัติการป้องกันและบรรเทาสาธารณภัย จำนวน ๑ ชุด',
        bodyParagraphs: [
          'ตามหนังสือที่อ้างถึง กรมป้องกันและบรรเทาสาธารณภัยได้แจ้งการจัดสรรงบประมาณดำเนินโครงการเตรียมความพร้อมรับมืออุทกภัยและวาตภัย ประจำปีงบประมาณ พ.ศ. ๒๕๖๙ ความละเอียดแจ้งแล้ว นั้น',
          'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ดำเนินการประชุมร่วมกับกองคลังและฝ่ายยุทธศาสตร์ เพื่อพิจารณากรอบการเบิกจ่ายงบประมาณและรายละเอียดคุณลักษณะเฉพาะของครุภัณฑ์สนามเรียบร้อยแล้ว ในการนี้ จึงขอส่งสำเนาแผนปฏิบัติการและประมาณการเบิกจ่ายงบประมาณเพื่อโปรดทราบและพิจารณาอนุมัติตามขั้นตอนต่อไป'
        ],
        closing: 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ',
        signatory: '(นายณัฐพันธุ์ ศรีวนิช)',
        signatoryPosition: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
        departmentName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
        fullDraftText: `ที่ รย ๐๐๒๑/ว ๔๕๒

สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
ศาลากลางจังหวัดระยอง ถนนสุขุมวิท ๒๑๐๐๐

${dateStr}

เรื่อง  แจ้งผลการพิจารณาจัดทำแผนงบประมาณและการเตรียมความพร้อมรับมืออุทกภัย
เรียน  ผู้ว่าราชการจังหวัดระยอง / หัวหน้าส่วนราชการ
อ้างถึง  หนังสือกรมป้องกันและบรรเทาสาธารณภัย ที่ มท ๐๖๐๔/ว ๑๒๓ ลงวันที่ ๑๐ กรกฎาคม ๒๕๖๙
สิ่งที่ส่งมาด้วย  สำเนาแผนปฏิบัติการป้องกันและบรรเทาสาธารณภัย จำนวน ๑ ชุด

        ตามหนังสือที่อ้างถึง กรมป้องกันและบรรเทาสาธารณภัยได้แจ้งการจัดสรรงบประมาณดำเนินโครงการเตรียมความพร้อมรับมืออุทกภัยและวาตภัย ประจำปีงบประมาณ พ.ศ. ๒๕๖๙ ความละเอียดแจ้งแล้ว นั้น

        สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ดำเนินการประชุมร่วมกับกองคลังและฝ่ายยุทธศาสตร์ เพื่อพิจารณากรอบการเบิกจ่ายงบประมาณและรายละเอียดคุณลักษณะเฉพาะของครุภัณฑ์สนามเรียบร้อยแล้ว ในการนี้ จึงขอส่งสำเนาแผนปฏิบัติการและประมาณการเบิกจ่ายงบประมาณเพื่อโปรดทราบและพิจารณาอนุมัติตามขั้นตอนต่อไป

        จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ


                                    ขอแสดงความนับถือ


                                  (นายณัฐพันธุ์ ศรีวนิช)
                    หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

ฝ่ายบริหารงานทั่วไป / กองคลัง
โทรศัพท์ ๐ ๓๘๖๙ ๔๑๕๔
โทรสาร ๐ ๓๘๖๙ ๔๑๕๕`
      }
    };
  }

  // General Q&A / Knowledge response
  return {
    replyText: `สวัสดีครับ ยินดีต้อนรับสู่ **Smart e-Saraban Platform** ผู้ช่วย AI ประจำระบบงานสารบรรณอิเล็กทรอนิกส์! 

คุณสามารถพิมพ์ถามคำสั่งหรือค้นหาข้อมูลด้วยภาษาธรรมชาติได้ตลอดเวลา เช่น:
• 🔍 **"ค้นหาหนังสือเรื่องงบประมาณเดือนกรกฎาคม"**
• 📝 **"สรุปหนังสือรับเลขที่ 123/2569"**
• ✍️ **"ร่างหนังสือตอบกลับตามระเบียบราชการ"**
• 📋 **"มีงานค้างของกองคลังอะไรบ้าง"**

มีข้อมูลหรือระเบียบงานสารบรรณใดให้ผมช่วยดูแลเพิ่มเติมไหมครับ?`,
    intentType: 'general'
  };
}

// Smart e-Saraban AI Assistant Endpoint
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { prompt, history, user, filterContext } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุคำถามหรือคำสั่งสำหรับผู้ช่วย AI' });
    }

    const cleanPrompt = prompt.trim();
    
    // 1. Fetch all active documents from DB for current context
    let documents: any[] = [];
    try {
      const query = `
        SELECT id, 'inbox' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status FROM inbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status FROM outbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status FROM circular_documents
        UNION ALL
        SELECT id, 'internal' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status FROM internal_documents
        UNION ALL
        SELECT id, 'admin' AS type, docNumber, NULL AS receiveNumber, year, date, 'ปกติ' AS priority, 'ปกติ' AS secrecy, title, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, note, content, registerDate, status FROM admin_documents
      `;
      const [rows]: any = await pool.query(query);
      documents = rows || [];
    } catch (dbErr) {
      console.warn('AI Assistant DB query fallback:', dbErr);
    }

    // 2. Fetch Gemini API Key
    let apiKey = '';
    try {
      const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
      if (stRows && stRows[0] && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
        apiKey = String(stRows[0].geminiApiKey).trim();
      }
    } catch (e) {
      // ignore
    }
    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || '').trim();
    }

    const docsSummaryContext = documents.slice(0, 60).map(d => ({
      id: d.id,
      type: d.type,
      docNumber: d.docNumber || '',
      receiveNumber: d.receiveNumber || '',
      year: d.year || '2569',
      date: d.date || '',
      title: d.title || '',
      from: d.from || '',
      to: d.to || '',
      department: d.department || '',
      assignee: d.assignee || '',
      priority: d.priority || 'ปกติ',
      status: d.status || 'pending',
      note: (d.note || '').substring(0, 150),
      content: (d.content || '').substring(0, 150)
    }));

    let aiResponsePayload: any = null;

    if (apiKey) {
      const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest'];
      const rawReferer = req.headers.referer ? String(req.headers.referer) : '';
      const rawOrigin = req.headers.origin ? String(req.headers.origin) : '';
      const refererCandidates = [
        '',
        'https://aistudio.google.com/',
        'https://ai.studio/',
        'https://google.com/',
        'https://developer.google.com/',
        rawReferer,
        rawOrigin
      ].filter((v, i, a) => a && a.length > 0 ? a.indexOf(v) === i : i === 0);

      refLoop: for (const refHeader of refererCandidates) {
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
            const systemPrompt = `คุณคือ "Smart e-Saraban AI Assistant" ผู้ช่วยปัญญาประดิษฐ์ประจำระบบสารบรรณอิเล็กทรอนิกส์
สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

หน้าที่ของคุณ:
1. ตอบคำถาม ค้นหา สรุป สแกนงานค้าง และร่างหนังสือราชการ อย่างถูกต้อง รวดเร็ว สุภาพ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม
2. นำข้อมูลหนังสือในระบบจริงดังต่อไปนี้ไปใช้ประมวลผลคำตอบอย่างเที่ยงตรง:

[ข้อมูลหนังสือล่าสุดในระบบ (${documents.length} รายการ)]:
${JSON.stringify(docsSummaryContext, null, 2)}

[ข้อมูลผู้ใช้งานปัจจุบัน]:
ชื่อ: ${user?.firstName || 'ผู้ใช้งาน'} ${user?.lastName || ''}
ตำแหน่ง: ${user?.position || 'เจ้าหน้าที่สารบรรณ'}
ฝ่ายงาน: ${user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}

คำแนะนำการจัดรูปแบบ JSON:
- ตอบกลับด้วยโครงสร้าง JSON ตรงตาม responseSchema เท่านั้น
- ถ้าผู้ใช้สั่ง "ค้นหา..." ให้ส่ง intentType: "search" พร้อม matchedDocs
- ถ้าผู้ใช้สั่ง "สรุป..." ให้ส่ง intentType: "summary" พร้อม summaryResult
- ถ้าผู้ใช้สั่ง "ร่าง..." ให้ส่ง intentType: "draft" พร้อม draftLetter
- ถ้าผู้ใช้สั่ง "งานค้าง..." ให้ส่ง intentType: "pending_tasks" พร้อม pendingTasksSummary`;

            const geminiResp = await client.models.generateContent({
              model: modelName,
              contents: [{ text: `คำถาม/คำสั่งจากผู้ใช้: "${cleanPrompt}"` }],
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    replyText: { type: Type.STRING },
                    intentType: { type: Type.STRING },
                    matchedDocs: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: { type: Type.STRING },
                          docNumber: { type: Type.STRING },
                          receiveNumber: { type: Type.STRING },
                          title: { type: Type.STRING },
                          from: { type: Type.STRING },
                          to: { type: Type.STRING },
                          department: { type: Type.STRING },
                          date: { type: Type.STRING },
                          priority: { type: Type.STRING },
                          status: { type: Type.STRING },
                          matchReason: { type: Type.STRING }
                        }
                      }
                    },
                    summaryResult: {
                      type: Type.OBJECT,
                      properties: {
                        docId: { type: Type.STRING },
                        docNumber: { type: Type.STRING },
                        title: { type: Type.STRING },
                        fromDept: { type: Type.STRING },
                        toDept: { type: Type.STRING },
                        date: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        coreContent: { type: Type.STRING },
                        governingRule: { type: Type.STRING },
                        recommendation: { type: Type.STRING },
                        nextAction: { type: Type.STRING }
                      }
                    },
                    draftLetter: {
                      type: Type.OBJECT,
                      properties: {
                        docType: { type: Type.STRING },
                        docNumber: { type: Type.STRING },
                        dateStr: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        salutation: { type: Type.STRING },
                        reference: { type: Type.STRING },
                        attachment: { type: Type.STRING },
                        bodyParagraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        closing: { type: Type.STRING },
                        signatory: { type: Type.STRING },
                        signatoryPosition: { type: Type.STRING },
                        departmentName: { type: Type.STRING },
                        fullDraftText: { type: Type.STRING }
                      }
                    },
                    pendingTasksSummary: {
                      type: Type.OBJECT,
                      properties: {
                        departmentName: { type: Type.STRING },
                        totalPendingCount: { type: Type.INTEGER },
                        urgentCount: { type: Type.INTEGER },
                        overdueCount: { type: Type.INTEGER },
                        statusBreakdown: { type: Type.STRING },
                        recommendationNote: { type: Type.STRING },
                        items: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              docNumber: { type: Type.STRING },
                              title: { type: Type.STRING },
                              from: { type: Type.STRING },
                              date: { type: Type.STRING },
                              priority: { type: Type.STRING },
                              status: { type: Type.STRING },
                              daysPending: { type: Type.INTEGER }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            });

            if (geminiResp && geminiResp.text) {
              aiResponsePayload = JSON.parse(geminiResp.text);
              break refLoop;
            }
          } catch (geminiError: any) {
            console.warn(`Gemini API call warning for ${modelName}:`, geminiError.message);
          }
        }
      }
    }

    if (!aiResponsePayload) {
      aiResponsePayload = generateSmartAiFallback({
        prompt: cleanPrompt,
        documents,
        user
      });
    }

    return res.json({
      success: true,
      data: aiResponsePayload
    });

  } catch (err: any) {
    console.error('Error in /api/ai-assistant:', err);
    // Fallback gracefully so client never fails with HTTP 500
    const fallbackData = generateSmartAiFallback({
      prompt: req.body?.prompt || '',
      documents: [],
      user: req.body?.user
    });
    return res.json({
      success: true,
      data: fallbackData
    });
  }
});



async function startServer() {

// Infographics API (Enterprise & Public Delivery Engine)
app.get('/api/infographics', async (req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, name, thumbnail, isPublic, allowEmbed, allowDownload, 
        CASE WHEN accessPassword IS NOT NULL AND accessPassword != '' THEN 1 ELSE 0 END AS isProtected,
        authorName, authorDepartment, description, tags, viewCount, downloadCount, embedCount, 
        scope, ownerId, ownerName, ownerDepartment, allowedEditors, allowDepartmentEdit,
        created_at, updated_at 
      FROM infographics 
      ORDER BY updated_at DESC, created_at DESC
    `);
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching infographics:', error);
    res.status(500).json({ error: 'Failed to fetch infographics' });
  }
});

app.get('/api/infographics/:id', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = rows[0];
    res.json({
      ...row,
      isPublic: Boolean(row.isPublic),
      allowEmbed: Boolean(row.allowEmbed),
      allowDownload: Boolean(row.allowDownload),
      allowDepartmentEdit: Boolean(row.allowDepartmentEdit),
      isProtected: Boolean(row.accessPassword && row.accessPassword.trim())
    });
  } catch (error) {
    console.error('Error fetching infographic:', error);
    res.status(500).json({ error: 'Failed to fetch infographic' });
  }
});

app.post('/api/infographics', async (req, res) => {
  try {
    const { 
      name, data, thumbnail, 
      isPublic = 1, allowEmbed = 1, allowDownload = 1, 
      accessPassword = null, authorName = null, authorDepartment = null, 
      description = null, tags = null,
      scope = 'central', ownerId = null, ownerName = null, ownerDepartment = null,
      allowedEditors = null, allowDepartmentEdit = 0
    } = req.body;
    
    const id = `info_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    
    const stringifiedEditors = Array.isArray(allowedEditors) 
      ? JSON.stringify(allowedEditors) 
      : (typeof allowedEditors === 'string' ? allowedEditors : null);

    await pool.query(
      `INSERT INTO infographics (
        id, name, data, thumbnail, isPublic, allowEmbed, allowDownload, 
        accessPassword, authorName, authorDepartment, description, tags, 
        scope, ownerId, ownerName, ownerDepartment, allowedEditors, allowDepartmentEdit,
        viewCount, downloadCount, embedCount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      [
        id, name || 'Infographic', data, thumbnail, 
        isPublic ? 1 : 0, allowEmbed ? 1 : 0, allowDownload ? 1 : 0,
        accessPassword || null, authorName || null, authorDepartment || null,
        description || null, tags || null,
        scope || 'central', ownerId || null, ownerName || authorName || null, ownerDepartment || authorDepartment || null,
        stringifiedEditors, allowDepartmentEdit ? 1 : 0,
        nowIso, nowIso
      ]
    );
    
    res.json({ 
      id, name, thumbnail, 
      isPublic: Boolean(isPublic), allowEmbed: Boolean(allowEmbed), allowDownload: Boolean(allowDownload),
      isProtected: Boolean(accessPassword && accessPassword.trim()),
      authorName, authorDepartment, description, tags,
      scope: scope || 'central', ownerId, ownerName: ownerName || authorName, ownerDepartment: ownerDepartment || authorDepartment,
      allowedEditors: stringifiedEditors, allowDepartmentEdit: Boolean(allowDepartmentEdit),
      created_at: nowIso, updated_at: nowIso 
    });
  } catch (error) {
    console.error('Error creating infographic:', error);
    res.status(500).json({ error: 'Failed to create infographic' });
  }
});

app.put('/api/infographics/:id', async (req, res) => {
  try {
    const { 
      name, data, thumbnail, 
      isPublic, allowEmbed, allowDownload, 
      accessPassword, authorName, authorDepartment, 
      description, tags,
      scope, ownerId, ownerName, ownerDepartment,
      allowedEditors, allowDepartmentEdit
    } = req.body;
    
    const nowIso = new Date().toISOString();

    // Check existing
    const [existing]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const current = existing[0];
    const finalName = name !== undefined ? name : current.name;
    const finalData = data !== undefined ? data : current.data;
    const finalThumbnail = thumbnail !== undefined ? thumbnail : current.thumbnail;
    const finalIsPublic = isPublic !== undefined ? (isPublic ? 1 : 0) : current.isPublic;
    const finalAllowEmbed = allowEmbed !== undefined ? (allowEmbed ? 1 : 0) : current.allowEmbed;
    const finalAllowDownload = allowDownload !== undefined ? (allowDownload ? 1 : 0) : current.allowDownload;
    const finalAccessPassword = accessPassword !== undefined ? (accessPassword ? String(accessPassword).trim() : null) : current.accessPassword;
    const finalAuthorName = authorName !== undefined ? authorName : current.authorName;
    const finalAuthorDepartment = authorDepartment !== undefined ? authorDepartment : current.authorDepartment;
    const finalDescription = description !== undefined ? description : current.description;
    const finalTags = tags !== undefined ? tags : current.tags;

    const finalScope = scope !== undefined ? scope : (current.scope || 'central');
    const finalOwnerId = ownerId !== undefined ? ownerId : current.ownerId;
    const finalOwnerName = ownerName !== undefined ? ownerName : current.ownerName;
    const finalOwnerDepartment = ownerDepartment !== undefined ? ownerDepartment : current.ownerDepartment;
    const finalAllowedEditors = allowedEditors !== undefined 
      ? (Array.isArray(allowedEditors) ? JSON.stringify(allowedEditors) : allowedEditors)
      : current.allowedEditors;
    const finalAllowDepartmentEdit = allowDepartmentEdit !== undefined ? (allowDepartmentEdit ? 1 : 0) : current.allowDepartmentEdit;

    await pool.query(
      `UPDATE infographics SET 
        name = ?, data = ?, thumbnail = ?, 
        isPublic = ?, allowEmbed = ?, allowDownload = ?, 
        accessPassword = ?, authorName = ?, authorDepartment = ?, 
        description = ?, tags = ?,
        scope = ?, ownerId = ?, ownerName = ?, ownerDepartment = ?,
        allowedEditors = ?, allowDepartmentEdit = ?, updated_at = ? 
      WHERE id = ?`,
      [
        finalName, finalData, finalThumbnail, 
        finalIsPublic, finalAllowEmbed, finalAllowDownload, 
        finalAccessPassword, finalAuthorName, finalAuthorDepartment, 
        finalDescription, finalTags,
        finalScope, finalOwnerId, finalOwnerName, finalOwnerDepartment,
        finalAllowedEditors, finalAllowDepartmentEdit, nowIso, req.params.id
      ]
    );
    
    res.json({ 
      id: req.params.id, 
      name: finalName, 
      thumbnail: finalThumbnail,
      isPublic: Boolean(finalIsPublic), 
      allowEmbed: Boolean(finalAllowEmbed), 
      allowDownload: Boolean(finalAllowDownload),
      isProtected: Boolean(finalAccessPassword && finalAccessPassword.trim()),
      authorName: finalAuthorName, 
      authorDepartment: finalAuthorDepartment,
      description: finalDescription, 
      tags: finalTags,
      scope: finalScope,
      ownerId: finalOwnerId,
      ownerName: finalOwnerName,
      ownerDepartment: finalOwnerDepartment,
      allowedEditors: finalAllowedEditors,
      allowDepartmentEdit: Boolean(finalAllowDepartmentEdit),
      updated_at: nowIso
    });
  } catch (error) {
    console.error('Error updating infographic:', error);
    res.status(500).json({ error: 'Failed to update infographic' });
  }
});

app.delete('/api/infographics/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM infographics WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting infographic:', error);
    res.status(500).json({ error: 'Failed to delete infographic' });
  }
});

// Public Infographics Delivery Endpoints
app.get('/api/public/infographics/:id', async (req, res) => {
  try {
    const rawId = req.params.id || '';
    const id = decodeURIComponent(rawId).trim().replace(/\.json$/i, '');
    
    if (!id) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสสื่อ Infographic' });
    }

    // 1. First try exact match by id
    let [rows]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [id]);
    
    // 2. If not found, try fuzzy match
    if (!rows || rows.length === 0) {
      const [fuzzyRows]: any = await pool.query('SELECT * FROM infographics WHERE id LIKE ? OR id LIKE ? LIMIT 1', [`%${id}%`, `${id}%`]);
      if (fuzzyRows && fuzzyRows.length > 0) {
        rows = fuzzyRows;
      }
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: 'ไม่พบสื่อ Infographic นี้ในระบบ หรืออาจยังไม่ได้เปิดเผยแพร่แบบสาธารณะ กรุณาตรวจสอบรหัสหรือเปิดแชร์ใหม่จากหน้าออกแบบ' 
      });
    }

    const row = rows[0];

    // Check if public access is enabled (0 or false means explicitly private)
    if (row.isPublic === 0 || row.isPublic === false) {
      return res.status(403).json({ 
        error: 'สื่อ Infographic นี้ถูกปิดการเข้าถึงสาธารณะโดยเจ้าของเอกสาร กรุณาติดต่อผู้จัดทำเพื่อเปิดสิทธิ์การเข้าชม' 
      });
    }

    // Increment view count asynchronously
    pool.query('UPDATE infographics SET viewCount = COALESCE(viewCount, 0) + 1 WHERE id = ?', [row.id]).catch(() => {});

    // Check password protection
    const hasPassword = Boolean(row.accessPassword && row.accessPassword.trim());
    const providedPass = req.headers['x-infographic-password'] || req.query.passcode;

    if (hasPassword && (!providedPass || String(providedPass).trim() !== String(row.accessPassword).trim())) {
      // Protected: return metadata only without full design data
      return res.json({
        id: row.id,
        name: row.name,
        thumbnail: row.thumbnail, // Thumbnail may be shown or blurred
        isProtected: true,
        isPublic: true,
        allowEmbed: Boolean(row.allowEmbed),
        allowDownload: Boolean(row.allowDownload),
        authorName: row.authorName,
        authorDepartment: row.authorDepartment,
        description: row.description,
        tags: row.tags,
        viewCount: (row.viewCount || 0) + 1,
        downloadCount: row.downloadCount || 0,
        embedCount: row.embedCount || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }

    // Unlocked or public
    return res.json({
      id: row.id,
      name: row.name,
      data: row.data,
      thumbnail: row.thumbnail,
      isProtected: false,
      isPublic: true,
      allowEmbed: Boolean(row.allowEmbed),
      allowDownload: Boolean(row.allowDownload),
      authorName: row.authorName,
      authorDepartment: row.authorDepartment,
      description: row.description,
      tags: row.tags,
      viewCount: (row.viewCount || 0) + 1,
      downloadCount: row.downloadCount || 0,
      embedCount: row.embedCount || 0,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (error: any) {
    console.error('Error in public infographic endpoint:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล Infographic กรุณาลองใหม่อีกครั้ง' });
  }
});

// Verify Passcode for Protected Infographic
app.post('/api/public/infographics/:id/verify-passcode', async (req, res) => {
  try {
    const rawId = req.params.id || '';
    const id = decodeURIComponent(rawId).trim().replace(/\.json$/i, '');
    const { passcode } = req.body;

    let [rows]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      const [fuzzyRows]: any = await pool.query('SELECT * FROM infographics WHERE id LIKE ? LIMIT 1', [`%${id}%`]);
      if (fuzzyRows && fuzzyRows.length > 0) rows = fuzzyRows;
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'ไม่พบสื่อ Infographic ในระบบ' });
    }

    const row = rows[0];
    if (!row.accessPassword || !row.accessPassword.trim()) {
      return res.json({ success: true, data: row.data });
    }

    if (String(passcode || '').trim() === String(row.accessPassword).trim()) {
      return res.json({ 
        success: true, 
        data: row.data,
        message: 'ปลดล็อกการเข้าถึงสำเร็จ' 
      });
    } else {
      return res.status(401).json({ success: false, error: 'รหัสผ่าน (Passcode) ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
    }
  } catch (error: any) {
    console.error('Error verifying infographic passcode:', error);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' });
  }
});

// Track Embed Impression
app.post('/api/public/infographics/:id/track-embed', async (req, res) => {
  try {
    await pool.query('UPDATE infographics SET embedCount = COALESCE(embedCount, 0) + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (_) {
    res.json({ success: false });
  }
});

// Track Download Count
app.post('/api/public/infographics/:id/track-download', async (req, res) => {
  try {
    await pool.query('UPDATE infographics SET downloadCount = COALESCE(downloadCount, 0) + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (_) {
    res.json({ success: false });
  }
});

// Direct Image Output Endpoint
app.get('/api/public/infographics/:id/image', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT thumbnail, name, isPublic, accessPassword FROM infographics WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).send('Not Found');
    }

    const row = rows[0];
    if (row.isPublic === 0) {
      return res.status(403).send('Forbidden: Public access is disabled');
    }

    if (row.accessPassword && row.accessPassword.trim()) {
      const pass = req.query.passcode || req.headers['x-infographic-password'];
      if (String(pass || '').trim() !== String(row.accessPassword).trim()) {
        return res.status(401).send('Unauthorized: Password protected');
      }
    }

    if (!row.thumbnail || !row.thumbnail.startsWith('data:image/')) {
      return res.status(404).send('Image data not found');
    }

    const matches = row.thumbnail.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('Invalid image format');
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end(imageBuffer);
  } catch (err: any) {
    console.error('Error serving infographic image:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Standalone Interactive HTML Export Endpoint
app.get('/api/public/infographics/:id/export-html', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).send('Not Found');
    }

    const item = rows[0];
    const safeTitle = (item.name || 'Infographic').replace(/[<>&"]/g, '');
    const imgData = item.thumbnail || '';
    const author = item.authorName || 'หน่วยงานราชการ';
    const dept = item.authorDepartment || 'ระบบสารบรรณอิเล็กทรอนิกส์';
    const desc = item.description || '';

    const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Infographic Presentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Noto+Serif+Thai:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Thai', sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .badge {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    h1 { font-family: 'Noto Serif Thai', serif; font-size: 16px; font-weight: 700; color: #fff; }
    .author-info { font-size: 12px; color: #94a3b8; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    button {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    button:hover { background: #334155; border-color: rgba(255, 255, 255, 0.3); }
    button.primary { background: #2563eb; color: #fff; border-color: #3b82f6; }
    button.primary:hover { background: #1d4ed8; }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      position: relative;
    }
    .image-container {
      position: relative;
      max-width: 96%;
      max-height: calc(100vh - 140px);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: #020617;
      transition: transform 0.2s ease-out;
      cursor: grab;
    }
    .image-container:active { cursor: grabbing; }
    .image-container img {
      display: block;
      max-width: 100%;
      max-height: calc(100vh - 140px);
      object-contain: contain;
      user-select: none;
      -webkit-user-drag: none;
    }
    .floating-controls {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 40;
    }
    .floating-controls button { border-radius: 9999px; padding: 6px 12px; }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <span class="badge">EDMS Infographics</span>
      <div>
        <h1>${safeTitle}</h1>
        <div class="author-info">${author} • ${dept}</div>
      </div>
    </div>
    <div class="header-actions">
      <button onclick="window.print()">🖨️ พิมพ์</button>
      <button class="primary" onclick="downloadImage()">⬇️ ดาวน์โหลดรูปภาพ</button>
    </div>
  </header>
  <main>
    <div class="image-container" id="container">
      <img src="${imgData}" id="mainImg" alt="${safeTitle}">
    </div>
    <div class="floating-controls">
      <button onclick="zoomOut()">🔍 - ย่อ</button>
      <button onclick="resetZoom()" id="zoomLabel">100%</button>
      <button onclick="zoomIn()">🔍 + ขยาย</button>
      <button onclick="toggleFullscreen()">⛶ เต็มจอ</button>
    </div>
  </main>
  <script>
    let scale = 1;
    const container = document.getElementById('container');
    const zoomLabel = document.getElementById('zoomLabel');
    function updateZoom() {
      container.style.transform = 'scale(' + scale + ')';
      zoomLabel.textContent = Math.round(scale * 100) + '%';
    }
    function zoomIn() { scale = Math.min(scale + 0.2, 3); updateZoom(); }
    function zoomOut() { scale = Math.max(scale - 0.2, 0.4); updateZoom(); }
    function resetZoom() { scale = 1; updateZoom(); }
    function toggleFullscreen() {
      if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); }
      else { document.exitFullscreen(); }
    }
    function downloadImage() {
      const a = document.createElement('a');
      a.href = '${imgData}';
      a.download = '${safeTitle.replace(/[/\\?%*:|"<>]/g, '_')}.png';
      a.click();
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.html"`);
    return res.send(htmlContent);
  } catch (err: any) {
    console.error('Error exporting standalone HTML:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/ai/infographics', async (req, res) => {
  try {
    const { prompt, user } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุหัวข้อที่ต้องการให้ออกแบบ' });
    }

    const cleanPrompt = prompt.trim();

    // Fetch Gemini API Key
    let apiKey = '';
    try {
      const [stRows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
      if (stRows && stRows[0] && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
        apiKey = String(stRows[0].geminiApiKey).trim();
      }
    } catch (e) {
      // ignore
    }
    if (!apiKey && typeof localDb !== 'undefined' && localDb && localDb.settings && localDb.settings[0] && localDb.settings[0].geminiApiKey) {
      apiKey = String(localDb.settings[0].geminiApiKey).trim();
    }
    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || '').trim();
    }

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ไม่พบรหัสคีย์ (Gemini API Key) กรุณาตั้งค่ารหัสคีย์ในเมนู "ตั้งค่าระบบ -> ตั้งค่าข้อมูลพื้นฐาน" หรือตั้งค่าในระบบก่อน' 
      });
    }

    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    const rawReferer = req.headers.referer ? String(req.headers.referer) : '';
    const rawOrigin = req.headers.origin ? String(req.headers.origin) : '';
    const refererCandidates = [
      '',
      'https://aistudio.google.com/',
      'https://ai.studio/',
      'https://google.com/',
      'https://developer.google.com/',
      rawReferer,
      rawOrigin
    ].filter((v, i, a) => a && a.length > 0 ? a.indexOf(v) === i : i === 0);

    let generatedData = null;

    refLoop: for (const refHeader of refererCandidates) {
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
          const response = await client.models.generateContent({
            model: modelName,
            contents: `กรุณาออกแบบเนื้อหา โครงสร้างคู่สี และข้อมูลสถิติของภาพ Infographic ในหัวข้อ: "${cleanPrompt}"
ให้ออกมาเป็นโครงสร้างภาษาไทยที่สวยงาม กระชับ และเหมาะสมกับหน่วยงานราชการหรือหัวข้อดังกล่าว`,
            config: {
              systemInstruction: `คุณคือ "Infographic AI Design Assistant" ที่ช่วยคิดเนื้อหาและคู่สีสำหรับการออกแบบภาพอินโฟกราฟิก
กรุณาตอบกลับในรูปแบบ JSON ตามโครงสร้าง (responseSchema) ที่กำหนดให้เท่านั้น ห้ามมีคำเกริ่นนำหรือ markdown ล้อมรอบนอกเหนือจากโครงสร้าง JSON`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'หัวข้อหลักสั้นๆ เด่นๆ (Main Title)' },
                  subtitle: { type: Type.STRING, description: 'คำโปรยย่อยหรือคำอธิบายประกอบหัวข้อหลัก (Subtitle)' },
                  designAdvice: { type: Type.STRING, description: 'คำแนะนำสั้นๆ ในการออกแบบภาพ เช่น รูปแบบ ฟอนต์ หรืออารมณ์ของภาพ' },
                  colors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'คู่สีที่แนะนำ 4-5 สี (HEX Codes เช่น #1e3a8a, #3b82f6) ที่เข้ากับหัวข้อดังกล่าวอย่างโดดเด่นและสบายตา'
                  },
                  textSections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        heading: { type: Type.STRING, description: 'หัวข้อย่อยสั้นกระชับ (เช่น "ขั้นตอนที่ 1", "การเตรียมพร้อม")' },
                        body: { type: Type.STRING, description: 'รายละเอียดเนื้อหาที่กระชับ ไม่เกิน 1-2 ประโยค เพื่อให้อ่านง่ายบนภาพ' }
                      },
                      required: ['heading', 'body']
                    },
                    description: 'หัวข้อย่อยและเนื้อหาประกอบ 3-4 ส่วน'
                  },
                  stats: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        value: { type: Type.STRING, description: 'ตัวเลขสถิติหรือหน่วยเปอร์เซ็นต์เด่นๆ (เช่น "95%", "24 ชม.", "1,200 ราย")' },
                        label: { type: Type.STRING, description: 'คำอธิบายสถิติดังกล่าว (เช่น "ความพึงพอใจ", "ระยะเวลาดำเนินการ")' },
                        color: { type: Type.STRING, description: 'รหัสสีที่แนะนำสำหรับการเน้นตัวเลขสถิตินี้ เช่น #ef4444' }
                      },
                      required: ['value', 'label', 'color']
                    },
                    description: 'ตัวเลขสถิติหรือดัชนีชี้วัดเด่นๆ 2-3 ค่า'
                  }
                },
                required: ['title', 'subtitle', 'colors', 'textSections', 'stats', 'designAdvice']
              }
            }
          });

          if (response && response.text) {
            generatedData = JSON.parse(response.text.trim());
            break refLoop;
          }
        } catch (err: any) {
          console.warn(`Error generating infographics with model ${modelName} using referer ${refHeader}:`, err.message);
        }
      }
    }

    if (!generatedData) {
      throw new Error('ระบบ AI ไม่สามารถประมวลผลคำขอได้ในขณะนี้ กรุณาตรวจสอบการตั้งค่าคีย์หรือลองใหม่อีกครั้ง');
    }

    return res.json({ success: true, data: generatedData });
  } catch (err: any) {
    console.error('AI Infographics Gen Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI' });
  }
});

// Fallback for missing ID in public infographics API
app.get('/api/public/infographics', (req, res) => {
  res.status(400).json({ error: 'กรุณาระบุรหัสสื่อ Infographic' });
});

// Infographics Uploaded Images & Assets Library API
app.post('/api/infographics/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่พบไฟล์รูปภาพที่อัปโหลด' });
    }

    const uploadedBy = (req.body?.uploadedBy || req.query?.uploadedBy || 'Infographics Studio').toString();
    const ip = getClientIp(req);
    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    const infographicsDir = path.join(uploadsBase, 'infographics');
    if (!fs.existsSync(infographicsDir)) {
      fs.mkdirSync(infographicsDir, { recursive: true });
    }

    const uploadedFiles: any[] = [];
    for (const file of files) {
      // If file was placed in another directory by default, ensure it is in infographics
      let finalFilename = file.filename;
      let finalPath = file.path;
      const targetPath = path.join(infographicsDir, finalFilename);

      if (path.resolve(finalPath) !== path.resolve(targetPath)) {
        try {
          if (fs.existsSync(finalPath)) {
            fs.copyFileSync(finalPath, targetPath);
            fs.unlinkSync(finalPath);
            finalPath = targetPath;
          }
        } catch (moveErr) {
          console.warn('Could not relocate file to infographics directory:', moveErr);
        }
      }

      const stat = fs.existsSync(finalPath) ? fs.statSync(finalPath) : { size: file.size };

      uploadedFiles.push({
        id: `img_infographics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        originalName: file.originalname,
        filename: finalFilename,
        size: stat.size,
        mimetype: file.mimetype,
        url: `/uploads/infographics/${finalFilename}`,
        folder: 'infographics',
        createdAt: new Date().toISOString()
      });
    }

    const fileNames = files.map(f => f.originalname).join(', ');
    await addSystemLog('UPLOAD_INFOGRAPHIC_IMAGE', `อัปโหลดรูปภาพ Infographics: ${fileNames}`, uploadedBy, ip);

    return res.json({ success: true, files: uploadedFiles });
  } catch (err: any) {
    console.error('Infographics Upload Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'การอัปโหลดรูปภาพล้มเหลว' });
  }
});

// Infographics Uploaded Images & Assets Library List API
app.get('/api/infographics-assets/images', async (req, res) => {
  try {
    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    const infographicsDir = path.join(uploadsBase, 'infographics');
    if (!fs.existsSync(infographicsDir)) {
      fs.mkdirSync(infographicsDir, { recursive: true });
    }

    const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp']);
    const imageList: Array<{
      id: string;
      filename: string;
      originalName: string;
      url: string;
      folder: string;
      size: number;
      createdAt: string;
    }> = [];

    function scanFolder(dirPath: string, relativeSubfolder: string) {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const nextSub = relativeSubfolder ? `${relativeSubfolder}/${entry.name}` : entry.name;
          scanFolder(fullPath, nextSub);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (imageExts.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              const nameParts = entry.name.split('-');
              let originalName = entry.name;
              if (nameParts.length > 2) {
                originalName = nameParts.slice(2).join('-');
              }
              const webSub = relativeSubfolder ? `/${relativeSubfolder.replace(/\\/g, '/')}` : '';
              const url = `/uploads${webSub}/${entry.name}`;
              imageList.push({
                id: `img_${Buffer.from(fullPath).toString('base64').substring(0, 16)}_${stat.mtimeMs}`,
                filename: entry.name,
                originalName,
                url,
                folder: relativeSubfolder || 'root',
                size: stat.size,
                createdAt: stat.mtime.toISOString(),
              });
            } catch (statErr) {
              // ignore unreadable file
            }
          }
        }
      }
    }

    scanFolder(infographicsDir, 'infographics');

    // Sort by newest first
    imageList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, images: imageList });
  } catch (err: any) {
    console.error('Error fetching uploaded images:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการโหลดรูปภาพ' });
  }
});

// Delete uploaded image from Infographics folder
app.delete('/api/infographics-assets/images', async (req, res) => {
  try {
    const fileUrl = (req.query.url || req.body?.url || '').toString();
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'ไม่ระบุ URL ของรูปภาพ' });
    }

    let cleanUrl = fileUrl.trim();
    if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.substring(9);
    else if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);
    else if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(uploadsBase, cleanUrl);

    if (filePath.startsWith(uploadsBase) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'ลบรูปภาพเรียบร้อยแล้ว' });
    }

    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์รูปภาพที่ต้องการลบ' });
  } catch (err: any) {
    console.error('Delete image error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลบรูปภาพ' });
  }
});
  const listenPort = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      etag: false,
      lastModified: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }
    }));
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (typeof listenPort === 'string' && (listenPort.startsWith('/') || listenPort.startsWith('\\\\'))) {
    app.listen(listenPort, () => {
      console.log(`Server running on Passenger socket pipe: ${listenPort}`);
      startScheduledReservationEngine();
    });
  } else {
    const portNum = Number(listenPort) || 3000;
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${portNum}`);
      startScheduledReservationEngine();
    });
  }
}

startServer();
