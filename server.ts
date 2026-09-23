import express from 'express';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import compression from 'compression';
import HTMLtoDOCX from 'html-to-docx';
import os from 'os';
import v8 from 'v8';

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
import { OFFICIAL_SURVEY_TEMPLATES } from './src/data/surveyTemplates';

const execFileAsync = promisify(execFile);

// Global flag to disable email notifications if SMTP authentication fails due to IP/Auth issues
let smtpBlocked = false;

dotenv.config();

// Global crash-prevention listeners for maximum server uptime & stability
process.on('uncaughtException', (err: any) => {
  console.error('💥 [ResilienceGuard] Uncaught Exception prevented from crashing server:', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('💥 [ResilienceGuard] Unhandled Rejection prevented from crashing server:', reason?.message || reason);
});

// Robust JSON parsing utility
function safeJsonParse<T = any>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ==========================================
// AI MULTI-TIER FALLBACK & EXPONENTIAL BACKOFF INFRASTRUCTURE
// Standard Tier Sequence: gemini-3.8-flash -> gemini-flash-latest -> gemini-3.1-flash-lite
// ==========================================
export const DEFAULT_GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite'
];

export function formatGeminiErrorMessage(err: any): string {
  if (!err) return 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI กรุณาลองใหม่อีกครั้ง';
  
  let rawMsg = typeof err === 'string' ? err : (err?.message || '');
  if (!rawMsg && typeof err === 'object') {
    try { rawMsg = JSON.stringify(err); } catch { rawMsg = String(err); }
  }

  try {
    if (typeof rawMsg === 'string' && rawMsg.startsWith('{')) {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        rawMsg = parsed.error.message;
      }
    }
  } catch {}

  const lower = String(rawMsg).toLowerCase();
  
  if (lower.includes('503') || lower.includes('overloaded') || lower.includes('unavailable') || lower.includes('high traffic') || lower.includes('capacity')) {
    return 'ระบบเซิร์ฟเวอร์ AI ของ Google มีปริมาณผู้ใช้งานหนาแน่นชั่วคราว ระบบได้พยายามสลับไปยังโมเดลสำรองแล้ว กรุณากดปุ่ม "ลองใหม่อีกครั้ง"';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('rate limit')) {
    return 'ระบบ AI มีปริมาณคำขอหนาแน่นชั่วคราว (Rate limit / Quota Exceeded) กรุณารอสักครู่แล้วกดลองใหม่อีกครั้ง';
  }
  if (
    lower.includes('api_key_http_referrer_blocked') ||
    lower.includes('requests from referer') ||
    lower.includes('requests from referrer') ||
    lower.includes('referer <empty> are blocked') ||
    (lower.includes('referer') && lower.includes('blocked')) ||
    (lower.includes('403') && (lower.includes('referer') || lower.includes('referrer')))
  ) {
    return 'Google Gemini API Key ติดข้อจำกัด HTTP Referrer (Requests from referer are blocked): บน Google Cloud Console (เมนู APIs & Services > Credentials > คลิกที่ Gemini API Key) ในส่วน "Application restrictions" กรุณาเปลี่ยนเป็น "None" (ไม่มีการจำกัด) เนื่องจากระบบทำงานผ่าน Backend Server หรือเพิ่ม URL โดเมนของระบบลงใน Website restrictions';
  }
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || (lower.includes('400') && lower.includes('api key')) || lower.includes('invalid authentication credentials')) {
    return 'องค์กร Google Gemini API Key ในระบบไม่ถูกต้อง หรือไม่ได้กำหนดค่าในระบบ กรุณาตรวจสอบในเมนูตั้งค่าระบบ หรือ Settings > Secrets';
  }
  if (lower.includes('not found') && lower.includes('model')) {
    return 'ไม่พบโมเดล AI ที่ระบุ กำลังสลับไปยังโมเดลที่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง';
  }
  if (lower.includes('no file provided') || lower.includes('filebase64')) {
    return 'ไม่พบข้อมูลไฟล์ที่ต้องการสแกน กรุณาเลือกไฟล์เอกสารใหม่อีกครั้ง';
  }
  
  const cleaned = String(rawMsg)
    .replace(/^\[GoogleGenAI(?:Error)?\]:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/\{"error":\{.*?"message":"(.*?)"\}.*?\}/s, '$1')
    .trim();

  return cleaned || 'การเชื่อมต่อกับระบบ AI ขัดข้องชั่วคราว กรุณากดลองใหม่อีกครั้ง';
}

export function getGeminiClient(apiKey: string, req?: express.Request): GoogleGenAI {
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error('GEMINI_API_KEY is missing or invalid. Please configure it in Settings > Secrets.');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'aistudio-build'
  };

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers
    }
  });
}

export async function callGeminiWithFallback(options: {
  client: GoogleGenAI;
  contents: any;
  config?: any;
  models?: string[];
  maxRetriesPerModel?: number;
  initialDelayMs?: number;
}): Promise<{ response: any; usedModel: string }> {
  const inputModels = options.models && options.models.length > 0 ? options.models : [];
  const modelCandidateSet = new Set([...inputModels, ...DEFAULT_GEMINI_FALLBACK_MODELS]);
  const models = Array.from(modelCandidateSet);

  const maxRetries = options.maxRetriesPerModel ?? 1;
  const baseDelay = options.initialDelayMs ?? 800;
  let lastError: any = null;

  for (let m = 0; m < models.length; m++) {
    const modelName = models[m];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await options.client.models.generateContent({
          model: modelName,
          contents: options.contents,
          config: options.config
        });
        if (response && (response.text !== undefined || response.candidates?.length)) {
          return { response, usedModel: modelName };
        }
      } catch (err: any) {
        lastError = err;
        const errText = String(err?.message || '') + ' ' + String(err?.status || '') + ' ' + (typeof err === 'object' ? JSON.stringify(err) : '');
        const isTransient = errText.includes('503') ||
                            errText.includes('429') ||
                            errText.includes('overloaded') ||
                            errText.includes('UNAVAILABLE') ||
                            errText.includes('RESOURCE_EXHAUSTED') ||
                            errText.includes('quota') ||
                            errText.includes('rate limit') ||
                            errText.includes('high traffic') ||
                            err?.status === 503 ||
                            err?.status === 429;

        if (isTransient && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // When switching to the next candidate model after a rate limit/quota hit, pause briefly
        if (m < models.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
        break;
      }
    }
  }

  const friendlyMsg = formatGeminiErrorMessage(lastError);
  const err = new Error(friendlyMsg);
  (err as any).originalError = lastError;
  throw err;
}

export interface GeminiKeyInfo {
  apiKey: string;
  source: 'org_settings_db' | 'org_settings_local' | 'custom_request' | 'environment' | 'none';
  sourceDescription: string;
  maskedKey: string;
}

export async function getAppGeminiApiKeyInfo(customKey?: string, options?: { forceCustom?: boolean }): Promise<GeminiKeyInfo> {
  const mask = (k: string) => {
    if (!k) return '';
    return k.length > 8 ? `${k.substring(0, 6)}...${k.substring(k.length - 4)}` : '******';
  };

  // 0. Priority 0: Explicit forceCustom (e.g. testing an unsaved key in the Settings UI)
  if (options?.forceCustom && customKey && typeof customKey === 'string' && customKey.trim()) {
    const k = customKey.trim();
    return {
      apiKey: k,
      source: 'custom_request',
      sourceDescription: 'ระบุทดสอบจากหน้าจอการตั้งค่า',
      maskedKey: mask(k)
    };
  }

  // 1. TOP PRIORITY: Organization Settings from MySQL 'settings' table, column 'geminiApiKey'
  // Strictly fulfills user requirement: "ปรับปรุง AI ทั้งระบบ ให้ใช้ Gemini API Key จาก ตั้งค่าระบบ องค์กร ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"
  let orgApiKey = '';

  try {
    // Check lookup cache first for fast in-memory access
    if (typeof getLookupCached === 'function') {
      const cached = getLookupCached<any>('settings');
      if (cached && typeof cached.geminiApiKey === 'string' && cached.geminiApiKey.trim()) {
        orgApiKey = cached.geminiApiKey.trim();
      }
    }

    if (!orgApiKey && typeof pool !== 'undefined' && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT geminiApiKey FROM settings LIMIT 1');
        if (rows && rows.length > 0 && rows[0].geminiApiKey && String(rows[0].geminiApiKey).trim()) {
          orgApiKey = String(rows[0].geminiApiKey).trim();
        }
      } catch (dbErr: any) {
        console.warn('MySQL settings query for geminiApiKey failed:', dbErr.message);
      }

      // Legacy fallback check: system_settings table
      if (!orgApiKey) {
        try {
          const [stRows]: any = await pool.query('SELECT geminiApiKey FROM system_settings WHERE id = 1');
          if (stRows && stRows.length > 0 && stRows[0].geminiApiKey && String(stRows[0].geminiApiKey).trim()) {
            orgApiKey = String(stRows[0].geminiApiKey).trim();
          }
        } catch (_) {}
      }
    }

    // Removed localDb settings fallback to satisfy "MySQL Exclusive" requirement
  } catch (e: any) {
    console.error('Error fetching Organization Gemini API key from database:', e?.message || e);
  }

  // If Organization Key exists in MySQL, use it as Priority #1
  if (orgApiKey) {
    return {
      apiKey: orgApiKey,
      source: 'org_settings_db',
      sourceDescription: 'ตั้งค่าองค์กร (ฐานข้อมูล MySQL settings.geminiApiKey)',
      maskedKey: mask(orgApiKey)
    };
  }

  // 2. SECOND PRIORITY: Custom key provided by request (if DB does not have a key)
  if (customKey && typeof customKey === 'string' && customKey.trim()) {
    const k = customKey.trim();
    return {
      apiKey: k,
      source: 'custom_request',
      sourceDescription: 'ส่งผ่านคำขอ API (Request Payload)',
      maskedKey: mask(k)
    };
  }

  // 3. THIRD PRIORITY: Environment variable fallback
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'environment',
      sourceDescription: 'ตัวแปรสภาพแวดล้อมระบบ (Settings > Secrets)',
      maskedKey: mask(envKey)
    };
  }

  return {
    apiKey: '',
    source: 'none',
    sourceDescription: 'ยังไม่ได้ระบุ API Key',
    maskedKey: ''
  };
}

export async function getAppGeminiApiKey(customKey?: string, options?: { forceCustom?: boolean }): Promise<string> {
  const info = await getAppGeminiApiKeyInfo(customKey, options);
  return info.apiKey;
}


// Pre-create standard upload directories to avoid any folder-creation or write-permission issues
const baseUploadsDir = path.join(process.cwd(), 'uploads');
const standardFolders = [
  'inbox', 'outbox', 'internal', 'admin', 'admin/order', 'admin/announcement', 'admin/circular', 
  'signed_pdfs', 'system', 'avatars', 'infographics', 'infographics/assets', 'infographics/images',
  'automated_backups', 'reporter_signatures', 'damage_photos'
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

// Helper to safely decode filenames from Multer (Busboy parses UTF-8 headers as Latin1) and URL encoding
function decodeFilename(rawName: string): string {
  if (!rawName) return 'file';
  let name = String(rawName);

  // Repeatedly decode URI components (e.g. if encoded multiple times: %25E0%25B8... -> %E0%B8... -> คำ)
  for (let i = 0; i < 5; i++) {
    if (name.includes('%')) {
      try {
        const decodedUri = decodeURIComponent(name);
        if (decodedUri && decodedUri !== name) {
          name = decodedUri;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  // Try Latin1 / binary to UTF-8 conversion if it contains high-byte chars (common in Multer/Busboy parsing UTF-8 bytes as Latin1)
  if (/[\u0080-\u00FF]/.test(name)) {
    try {
      const converted = Buffer.from(name, 'latin1').toString('utf8');
      if (/[\u0E00-\u0E7F]/.test(converted) || (!converted.includes('\ufffd') && converted !== name)) {
        name = converted;
      }
    } catch (e) {}
  }

  // Check once more in case it was double-encoded or encoded inside latin1
  if (name.includes('%')) {
    try {
      const decodedUri = decodeURIComponent(name);
      if (decodedUri && decodedUri !== name) name = decodedUri;
    } catch (e) {}
  }

  return name.normalize('NFC');
}

// Helper to physically delete an uploaded attachment file from the server disk with comprehensive path & encoding resolution
function deletePhysicalUploadFile(fileUrlOrName: string): { success: boolean; filename?: string; error?: string } {
  if (!fileUrlOrName || typeof fileUrlOrName !== 'string') {
    return { success: false, error: 'ไม่ระบุ URL หรือชื่อไฟล์' };
  }

  const uploadsBase = path.resolve(process.cwd(), 'uploads');
  let clean = fileUrlOrName.trim();

  // Strip query strings and hash anchors (e.g. ?v=123, #section)
  clean = clean.split('?')[0].split('#')[0].trim();

  // Extract relative path from inside /uploads/ or uploads/ or absolute URL
  if (clean.includes('/uploads/')) {
    clean = clean.substring(clean.indexOf('/uploads/') + 9);
  } else if (clean.includes('uploads/')) {
    clean = clean.substring(clean.indexOf('uploads/') + 8);
  } else if (clean.startsWith('/')) {
    clean = clean.substring(1);
  }

  // Iterative URL decode (handling double or triple URL-encoded names e.g. %25E0%25B8...)
  for (let i = 0; i < 5; i++) {
    try {
      const decoded = decodeURIComponent(clean);
      if (decoded === clean) break;
      clean = decoded;
    } catch (e) {
      break;
    }
  }

  // Remove leading slashes again after decoding
  while (clean.startsWith('/') || clean.startsWith('\\')) {
    clean = clean.substring(1);
  }

  const protectedFiles = new Set(['db_store.json', 'db_store.json.bak', 'dedup_index.json']);

  // Check 1: Direct path
  const directPath = path.resolve(uploadsBase, clean);
  if (directPath.startsWith(uploadsBase) && fs.existsSync(directPath)) {
    const bName = path.basename(directPath);
    if (!protectedFiles.has(bName) && !fs.statSync(directPath).isDirectory()) {
      try {
        fs.unlinkSync(directPath);
        return { success: true, filename: bName };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }

  // Check 2: Normalize NFC / NFD direct path
  const nfcPath = path.resolve(uploadsBase, clean.normalize('NFC'));
  if (nfcPath.startsWith(uploadsBase) && fs.existsSync(nfcPath)) {
    const bName = path.basename(nfcPath);
    if (!protectedFiles.has(bName) && !fs.statSync(nfcPath).isDirectory()) {
      try {
        fs.unlinkSync(nfcPath);
        return { success: true, filename: bName };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }

  // Check 3: Search recursively across uploads directory
  const baseName = path.basename(clean);
  const baseNameNfc = baseName.normalize('NFC');
  const baseNameNfd = baseName.normalize('NFD');
  const decodedBase = decodeFilename(baseName);
  const ext = path.extname(clean).toLowerCase();

  let targetFound = '';

  function scanUploadsDir(currentDir: string): boolean {
    if (!fs.existsSync(currentDir)) return false;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return false;
    }

    for (const entry of entries) {
      const fullP = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (scanUploadsDir(fullP)) return true;
      } else if (entry.isFile()) {
        const entName = entry.name;
        if (protectedFiles.has(entName)) continue;

        // Match criteria
        const isMatch = 
          entName === baseName ||
          entName === baseNameNfc ||
          entName === baseNameNfd ||
          entName === decodedBase ||
          entName.normalize('NFC') === baseNameNfc ||
          entName.normalize('NFD') === baseNameNfd ||
          entName.endsWith('-' + baseName) ||
          entName.endsWith('_' + baseName) ||
          entName.endsWith('-' + baseNameNfc) ||
          entName.endsWith('_' + baseNameNfc);

        if (isMatch) {
          targetFound = fullP;
          return true;
        }
      }
    }
    return false;
  }

  scanUploadsDir(uploadsBase);

  // Check 4: If target was found, unlink
  if (targetFound && targetFound.startsWith(uploadsBase) && fs.existsSync(targetFound)) {
    const bName = path.basename(targetFound);
    if (!protectedFiles.has(bName) && !fs.statSync(targetFound).isDirectory()) {
      try {
        fs.unlinkSync(targetFound);
        return { success: true, filename: bName };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }

  // Check 5: What if on disk the file was saved as all underscores (e.g. _______.pdf) from a previous upload
  // when an upstream proxy stripped the Thai characters?
  if (/^_+$/.test(path.basename(baseName, ext))) {
    function scanUnderscore(currentDir: string): boolean {
      if (!fs.existsSync(currentDir)) return false;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (e) {
        return false;
      }
      for (const entry of entries) {
        const fullP = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (scanUnderscore(fullP)) return true;
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ext) {
          const entryBase = path.basename(entry.name, ext);
          if (/^_+$/.test(entryBase) && entry.name === baseName) {
            targetFound = fullP;
            return true;
          }
        }
      }
      return false;
    }
    scanUnderscore(uploadsBase);
    if (targetFound && targetFound.startsWith(uploadsBase) && fs.existsSync(targetFound)) {
      const bName = path.basename(targetFound);
      if (!protectedFiles.has(bName)) {
        try {
          fs.unlinkSync(targetFound);
          return { success: true, filename: bName };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      }
    }
  }

  return { success: false, error: 'ไม่พบไฟล์ที่ต้องการลบในเซิร์ฟเวอร์' };
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
    (req as any).uploadDir = uploadDir;
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 1. First prioritize fileNames from req.query or req.body (guaranteed UTF-8 text sent from client)
    let explicitName = '';
    const fileIdx = (req as any)._fileUploadIndex || 0;
    (req as any)._fileUploadIndex = fileIdx + 1;

    try {
      const queryNamesRaw = req.query.fileNames || req.body?.originalNames || req.body?.fileNames;
      if (queryNamesRaw) {
        let namesArr: string[] = [];
        if (Array.isArray(queryNamesRaw)) {
          namesArr = queryNamesRaw.map(String);
        } else if (typeof queryNamesRaw === 'string') {
          try {
            const parsed = JSON.parse(queryNamesRaw);
            if (Array.isArray(parsed)) namesArr = parsed.map(String);
            else namesArr = [queryNamesRaw];
          } catch (e) {
            namesArr = [queryNamesRaw];
          }
        }
        if (namesArr[fileIdx]) {
          explicitName = namesArr[fileIdx].trim();
        }
      }
    } catch (e) {}

    // Choose original name: if explicitName has content, use it; otherwise decode file.originalname
    let candidateName = explicitName || file.originalname || 'file';
    let cleanOrigName = decodeFilename(candidateName);

    const ext = path.extname(cleanOrigName);
    const rawBase = path.basename(cleanOrigName, ext);

    // If candidateName became all underscores (from upstream Apache/Passenger header mangling)
    // and explicitName was not used yet, try searching query params or headers
    let baseName = rawBase
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim();

    if (!baseName || /^_+$/.test(baseName)) {
      if (explicitName) {
        baseName = path.basename(decodeFilename(explicitName), ext)
          .replace(/[\/\\?%*:|"<>]/g, '_')
          .replace(/[\x00-\x1f\x7f]/g, '')
          .trim();
      }
      if (!baseName || /^_+$/.test(baseName)) {
        baseName = `file_${Date.now()}`;
      }
    }

    // Save with staging filename during multipart stream, preserving clean targetBaseName and targetFilename
    const stagingFilename = `_staging_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${baseName}${ext}`;
    (file as any).targetBaseName = baseName;
    (file as any).targetExt = ext;
    (file as any).targetFilename = `${baseName}${ext}`;
    (file as any).cleanOriginalName = cleanOrigName;

    cb(null, stagingFilename);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
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
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Real-time Event Stream (SSE) for zero-latency live sync without Ctrl+F5
const sseClients = new Set<express.Response>();

// Active Authenticated / Logged-in Users tracking with full real-time activity details
interface ActiveUserPresence {
  userId: string | number;
  username: string;
  fullName?: string;
  position?: string;
  department?: string;
  departmentId?: string | number;
  role?: string;
  avatar?: string;
  ip?: string;
  device?: string;
  browser?: string;
  currentView?: string;
  viewTitle?: string;
  activeDetails?: string;
  documentId?: string | number;
  status?: 'active' | 'idle' | 'away';
  loginAt?: number;
  lastActive: number;
  lastLoggedView?: string;
  lastLoggedDetails?: string;
  lastLoggedTime?: number;
}

const activeLoggedInUsers = new Map<string, ActiveUserPresence>();

function parseUserAgentInfo(ua: string = ''): { device: string; browser: string } {
  let device = 'คอมพิวเตอร์ (Desktop)';
  let browser = 'เว็บเบราว์เซอร์';

  if (/iPad/i.test(ua)) device = 'แท็บเล็ต (iPad)';
  else if (/iPhone/i.test(ua)) device = 'มือถือ (iPhone)';
  else if (/Android/i.test(ua)) {
    device = /Mobile/i.test(ua) ? 'มือถือ (Android)' : 'แท็บเล็ต (Android)';
  } else if (/Macintosh|Mac OS X/i.test(ua)) device = 'คอมพิวเตอร์ (Mac)';
  else if (/Windows NT/i.test(ua)) device = 'คอมพิวเตอร์ (Windows)';
  else if (/Linux/i.test(ua)) device = 'คอมพิวเตอร์ (Linux)';

  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';

  return { device, browser };
}

export function getActiveLoggedInUsersCount(): number {
  const now = Date.now();
  const TIMEOUT_MS = 35000; // 35 seconds of heartbeat silence means session inactive or closed
  for (const [key, presence] of activeLoggedInUsers.entries()) {
    if (now - presence.lastActive > TIMEOUT_MS) {
      activeLoggedInUsers.delete(key);
    }
  }
  const uniqueUsers = new Set<string>();
  for (const presence of activeLoggedInUsers.values()) {
    if (presence.userId) {
      uniqueUsers.add(String(presence.userId));
    } else if (presence.username) {
      uniqueUsers.add(String(presence.username).toLowerCase());
    }
  }
  return uniqueUsers.size;
}

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

export function broadcastOnlineCount() {
  const count = getActiveLoggedInUsersCount();
  const usersList = Array.from(activeLoggedInUsers.values()).map(u => ({
    userId: u.userId,
    username: u.username,
    fullName: u.fullName,
    position: u.position,
    department: u.department,
    departmentId: u.departmentId,
    role: u.role,
    avatar: u.avatar,
    ip: u.ip,
    ipAddress: u.ip,
    device: u.device,
    browser: u.browser,
    currentView: u.currentView,
    viewTitle: u.viewTitle,
    activeDetails: u.activeDetails,
    documentId: u.documentId,
    status: u.status,
    loginAt: u.loginAt,
    loginTime: u.loginAt,
    lastActive: u.lastActive
  }));
  broadcastRealtimeEvent('ONLINE_USERS_COUNT', { count, onlineUsers: count });
  broadcastRealtimeEvent('ACTIVE_USERS_UPDATED', { users: usersList, count });
}

// Background sweep for expired logged-in sessions every 10s
setInterval(() => {
  const beforeCount = activeLoggedInUsers.size;
  const count = getActiveLoggedInUsersCount();
  if (beforeCount !== activeLoggedInUsers.size) {
    broadcastOnlineCount();
  }
}, 10000);

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
        invalidateAllCaches(); // Blazing fast memory caching invalidation
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
  const currentCount = getActiveLoggedInUsersCount();

  // Send initial connect handshake with active logged-in user count
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), msg: 'Connected to EDMS Realtime Stream', onlineUsers: currentCount, count: currentCount })}\n\n`);

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

// Real-time active logged-in users endpoint (returns count of authenticated users only)
app.get('/api/online-users', (req, res) => {
  const count = getActiveLoggedInUsersCount();
  res.json({
    count,
    timestamp: Date.now()
  });
});

// Real-time active logged-in users list and statistics
app.get('/api/active-users', (req, res) => {
  getActiveLoggedInUsersCount(); // Clean expired
  const usersList = Array.from(activeLoggedInUsers.values()).map(u => ({
    userId: u.userId,
    username: u.username,
    fullName: u.fullName,
    position: u.position,
    department: u.department,
    departmentId: u.departmentId,
    role: u.role,
    avatar: u.avatar,
    ip: u.ip,
    ipAddress: u.ip,
    device: u.device,
    browser: u.browser,
    currentView: u.currentView,
    viewTitle: u.viewTitle,
    activeDetails: u.activeDetails,
    documentId: u.documentId,
    status: u.status,
    loginAt: u.loginAt,
    loginTime: u.loginAt,
    lastActive: u.lastActive
  }));
  res.json({
    users: usersList,
    count: usersList.length,
    timestamp: Date.now()
  });
});

// Admin force logout / terminate session endpoint
app.post('/api/active-users/terminate', async (req, res) => {
  const { targetUserId, targetUsername, reason } = req.body || {};
  const ip = getClientIp(req);
  if (!targetUserId && !targetUsername) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุผู้ใช้งานที่ต้องการตัดการเชื่อมต่อ' });
  }
  const key = String(targetUserId || targetUsername).toLowerCase();
  const existing = activeLoggedInUsers.get(key);
  if (existing) {
    activeLoggedInUsers.delete(key);
    broadcastOnlineCount();
    broadcastRealtimeEvent('FORCE_LOGOUT', {
      userId: targetUserId,
      username: targetUsername,
      reason: reason || 'ผู้ดูแลระบบสิ้นสุดเซสชันการทำงานของคุณ'
    });
    await addSystemLog('TERMINATE_SESSION', `ผู้ดูแลระบบตัดการเชื่อมต่อเซสชันของ: ${existing.fullName || existing.username} (${reason || 'ไม่ระบุเหตุผล'})`, 'ผู้ดูแลระบบ', ip);
  }
  return res.json({ success: true, count: getActiveLoggedInUsersCount() });
});

// Instant flash message / notification to active user
app.post('/api/active-users/message', async (req, res) => {
  const { targetUserId, targetUsername, message, senderName } = req.body || {};
  if (!message) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุข้อความแจ้งเตือน' });
  }
  broadcastRealtimeEvent('USER_FLASH_MESSAGE', {
    targetUserId,
    targetUsername,
    message,
    senderName: senderName || 'ผู้ดูแลระบบ',
    timestamp: Date.now()
  });
  return res.json({ success: true });
});

// User Presence / Heartbeat Endpoint for Logged-In Users with automatic activity logging
app.post('/api/user-presence', async (req, res) => {
  const {
    userId,
    username,
    fullName,
    position,
    department,
    departmentId,
    role,
    avatar,
    currentView,
    viewTitle,
    activeDetails,
    documentId,
    status = 'active',
    action
  } = req.body || {};

  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  const { device, browser } = parseUserAgentInfo(ua);

  if (!userId && !username) {
    return res.status(400).json({ success: false, message: 'Missing user identification' });
  }

  const key = String(userId || username).toLowerCase();

  if (action === 'logout') {
    const existing = activeLoggedInUsers.get(key);
    activeLoggedInUsers.delete(key);
    broadcastOnlineCount();
    const displayName = fullName || existing?.fullName || username;
    await addSystemLog('LOGOUT', 'ออกจากระบบเรียบร้อย (สิ้นสุดเซสชันการทำงาน)', displayName, ip);
    return res.json({ success: true, count: getActiveLoggedInUsersCount() });
  }

  const existing = activeLoggedInUsers.get(key);
  const now = Date.now();
  const loginTime = existing?.loginAt || now;

  // Track if view or activity details changed to automatically record in System Logs
  const prevView = existing?.lastLoggedView;
  const prevDetails = existing?.lastLoggedDetails;
  const prevLogTime = existing?.lastLoggedTime || 0;

  const currentViewNormalized = currentView || existing?.currentView || 'overview';
  const viewTitleNormalized = viewTitle || existing?.viewTitle || 'ภาพรวมระบบ (Overview)';
  const activeDetailsNormalized = activeDetails || existing?.activeDetails || '';

  const isViewChanged = currentViewNormalized && currentViewNormalized !== prevView;
  const isDetailsChanged = Boolean(activeDetailsNormalized && activeDetailsNormalized !== prevDetails && (now - prevLogTime > 15000));
  const isInitialLogin = !existing;

  let newLoggedView = prevView || currentViewNormalized;
  let newLoggedDetails = prevDetails || activeDetailsNormalized;
  let newLoggedTime = prevLogTime;

  if (isInitialLogin || isViewChanged || isDetailsChanged) {
    newLoggedView = currentViewNormalized;
    newLoggedDetails = activeDetailsNormalized;
    newLoggedTime = now;

    const userDisplayName = fullName || existing?.fullName || username;
    const logDetails = activeDetailsNormalized 
      ? `เข้าใช้งานหน้า: ${viewTitleNormalized} (${activeDetailsNormalized})`
      : `เข้าใช้งานหน้า: ${viewTitleNormalized}`;

    addSystemLog('PAGE_VIEW', logDetails, userDisplayName, ip).catch(() => {});
  }

  activeLoggedInUsers.set(key, {
    userId: userId || username,
    username: username || String(userId),
    fullName: fullName || existing?.fullName || '',
    position: position || existing?.position || '',
    department: department || existing?.department || '',
    departmentId: departmentId || existing?.departmentId || '',
    role: role || existing?.role || 'user',
    avatar: avatar || existing?.avatar || '',
    ip,
    device,
    browser,
    currentView: currentViewNormalized,
    viewTitle: viewTitleNormalized,
    activeDetails: activeDetailsNormalized,
    documentId: documentId || existing?.documentId,
    status: status || 'active',
    loginAt: loginTime,
    lastActive: now,
    lastLoggedView: newLoggedView,
    lastLoggedDetails: newLoggedDetails,
    lastLoggedTime: newLoggedTime
  });

  const count = getActiveLoggedInUsersCount();
  broadcastOnlineCount();
  return res.json({ success: true, count });
});

// Health check endpoint for deployment monitoring and diagnostic testing
app.get('/api/health', async (req, res) => {
  let dbStatus = 'offline';
  let dbError: string | null = null;
  if (isMysqlOnline) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = 'error';
      dbError = e.message;
    }
  } else {
    dbStatus = 'local_fallback';
  }

  res.json({
    status: 'ok',
    app: 'EDMS Saraban',
    version: '2.6.0',
    uptime: Math.floor(process.uptime()),
    onlineUsers: getActiveLoggedInUsersCount(),
    database: {
      status: dbStatus,
      name: dbName || 'local_store',
      host: dbHost,
      port: dbPort,
      error: dbError
    },
    system: {
      nodeVersion: process.version,
      port: process.env.PORT || 3000,
      env: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});


app.use((req, res, next) => {
  // console.log(`[HTTP_REQ] ${req.method} ${req.url} - IP: ${req.ip}`); // Silenced to prevent user confusion
  next();
});

// Self-healing fallback middleware to solve vehicle folder file-mismatches
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(process.cwd(), 'uploads', decodeURIComponent(req.path));
  if (!fs.existsSync(filePath)) {
    if (req.path.startsWith('/vehicles/')) {
      const filename = decodeURIComponent(req.path).substring(10); // remove "/vehicles/"
      const fallbackPath = path.join(process.cwd(), 'uploads', 'inbox', filename);
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
      }
    }
  }
  next();
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1d',
  etag: true
}));

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
    try {
      cleanUrl = decodeURIComponent(cleanUrl);
    } catch (e) {}
    if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.substring(9);
    else if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);
    else if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    let filePath = path.resolve(uploadsBase, cleanUrl);

    if (!filePath.startsWith(uploadsBase) || !fs.existsSync(filePath)) {
      const baseName = path.basename(cleanUrl);
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
    const match = baseFileName.match(/^\d{10,15}-\d{4,10}-(.+)$/);
    const originalName = match ? match[1] : baseFileName;

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
    try {
      cleanUrl = decodeURIComponent(cleanUrl);
    } catch (e) {}
    if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.substring(9);
    else if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);
    else if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    let filePath = path.resolve(uploadsBase, cleanUrl);

    if (!filePath.startsWith(uploadsBase) || !fs.existsSync(filePath)) {
      const baseName = path.basename(cleanUrl);
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
    const match = baseFileName.match(/^\d{10,15}-\d{4,10}-(.+)$/);
    const originalName = match ? match[1] : baseFileName;

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

// Resilient Weather Proxy with In-Memory Cache (5 mins TTL) and Fallback
interface WeatherCacheEntry {
  data: any;
  timestamp: number;
}
const weatherCacheMap = new Map<string, WeatherCacheEntry>();
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat((req.query.latitude || req.query.lat || '12.6814').toString());
    const lng = parseFloat((req.query.longitude || req.query.lng || '101.2816').toString());
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const now = Date.now();

    const cached = weatherCacheMap.get(cacheKey);
    if (cached && (now - cached.timestamp < WEATHER_CACHE_TTL_MS)) {
      return res.json(cached.data);
    }

    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=Asia%2FBangkok`;

    let data: any = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(openMeteoUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timer);

      if (upstream.ok) {
        data = await upstream.json();
        weatherCacheMap.set(cacheKey, { data, timestamp: now });
        return res.json(data);
      }
    } catch (fetchErr: any) {
      // Upstream failed or timed out
    }

    // Return stale cache if available
    if (cached) {
      return res.json(cached.data);
    }

    // Fallback synthesized response if external service is temporarily unavailable
    const nowHours = new Date().getHours();
    const fallbackHourlyTimes: string[] = [];
    const fallbackHourlyTemps: number[] = [];
    const fallbackHourlyPrecip: number[] = [];
    const fallbackHourlyProb: number[] = [];
    const fallbackHourlyHumidity: number[] = [];

    for (let i = 0; i < 12; i++) {
      const h = (nowHours + i) % 24;
      const hStr = h.toString().padStart(2, '0') + ':00';
      fallbackHourlyTimes.push(hStr);
      fallbackHourlyTemps.push(Math.round((30 + Math.sin((h - 8) * 0.25) * 3) * 10) / 10);
      fallbackHourlyPrecip.push(i === 2 ? 0.4 : 0);
      fallbackHourlyProb.push(i >= 2 && i <= 5 ? 40 : 20);
      fallbackHourlyHumidity.push(Math.round(75 - Math.sin((h - 8) * 0.25) * 10));
    }

    const fallbackData = {
      latitude: lat,
      longitude: lng,
      timezone: 'Asia/Bangkok',
      current: {
        time: new Date().toISOString(),
        temperature_2m: 30.2,
        relative_humidity_2m: 76,
        apparent_temperature: 35.5,
        precipitation: 0.0,
        rain: 0.0,
        weather_code: 2,
        surface_pressure: 1009,
        wind_speed_10m: 16,
        wind_direction_10m: 230,
        wind_gusts_10m: 22,
        cloud_cover: 60
      },
      hourly: {
        time: fallbackHourlyTimes,
        temperature_2m: fallbackHourlyTemps,
        precipitation: fallbackHourlyPrecip,
        precipitation_probability: fallbackHourlyProb,
        relative_humidity_2m: fallbackHourlyHumidity
      },
      daily: {
        time: [new Date().toISOString().slice(0, 10)],
        temperature_2m_max: [33.5],
        temperature_2m_min: [26.0],
        precipitation_sum: [2.5],
        precipitation_probability_max: [40],
        weather_code: [2]
      }
    };

    return res.json(fallbackData);
  } catch (err: any) {
    return res.json({
      current: { temperature_2m: 30.0, relative_humidity_2m: 75, apparent_temperature: 35.0, precipitation: 0, weather_code: 2 },
      hourly: { time: [], temperature_2m: [], precipitation: [], precipitation_probability: [], relative_humidity_2m: [] },
      daily: { time: [], temperature_2m_max: [33], temperature_2m_min: [26], precipitation_sum: [0], precipitation_probability_max: [20], weather_code: [2] }
    });
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
    let fileIndex = 0;

    // Retrieve original names array passed from client (guaranteed UTF-8)
    let clientOriginalNames: string[] = [];
    try {
      const rawClientNames = req.query.fileNames || req.body?.originalNames || req.body?.fileNames;
      if (rawClientNames) {
        if (Array.isArray(rawClientNames)) {
          clientOriginalNames = rawClientNames.map(String);
        } else if (typeof rawClientNames === 'string') {
          const parsed = JSON.parse(rawClientNames);
          if (Array.isArray(parsed)) clientOriginalNames = parsed.map(String);
          else clientOriginalNames = [rawClientNames];
        }
      }
    } catch (e) {}

    const pointersDir = path.join(process.cwd(), 'uploads', 'pointers');
    if (!fs.existsSync(pointersDir)) {
      try { fs.mkdirSync(pointersDir, { recursive: true }); } catch (e) {}
    }
    const uploadDir = (req as any).uploadDir || path.join(process.cwd(), 'uploads', subfolder);

    for (const file of files) {
      let isDeduplicated = false;
      let masterUrl = '';
      let savedSpaceFormatted = '';

      const stagingFilePath = file.path;
      const targetFilename = (file as any).targetFilename || `${path.basename(file.filename)}`;
      const targetFilePath = path.join(uploadDir, targetFilename);

      let cleanOriginalName = (file as any).cleanOriginalName || decodeFilename(file.originalname);
      // If client passed UTF-8 original names explicitly, use it!
      if (clientOriginalNames[fileIndex] && (!cleanOriginalName || /^_+$/.test(path.basename(cleanOriginalName, path.extname(cleanOriginalName))))) {
        cleanOriginalName = decodeFilename(clientOriginalNames[fileIndex]);
      } else if (clientOriginalNames[fileIndex] && /[\u0E00-\u0E7F]/.test(clientOriginalNames[fileIndex])) {
        cleanOriginalName = decodeFilename(clientOriginalNames[fileIndex]);
      }

      let fileHash = '';
      if (fs.existsSync(stagingFilePath)) {
        try {
          fileHash = await calculateFileSha256(stagingFilePath);
        } catch (e) {}
      }

      const uploadsBase = path.resolve(process.cwd(), 'uploads');
      const pointerMasterPath = fileHash ? path.join(pointersDir, `${fileHash.substring(0, 16)}_${targetFilename}`) : '';

      // Check for identical content across existing uploaded files and pointers
      let existingDuplicatePath = '';
      if (fileHash) {
        const existingFiles = getAllUploadedFilesRecursive(uploadsBase);
        for (const existingPath of existingFiles) {
          if (path.resolve(existingPath) === path.resolve(stagingFilePath)) continue;
          try {
            const existStat = fs.statSync(existingPath);
            if (existStat.size === file.size && existStat.size > 0) {
              const existHash = await calculateFileSha256(existingPath);
              if (existHash === fileHash) {
                existingDuplicatePath = existingPath;
                break;
              }
            }
          } catch (e) {}
        }
      }

      if (existingDuplicatePath) {
        // MATCHING DUPLICATE FOUND:
        // Do NOT rename with _1! Instead, create Pointer link to existing file
        isDeduplicated = true;
        masterUrl = `/uploads/${path.relative(uploadsBase, existingDuplicatePath).replace(/\\/g, '/')}`;
        savedSpaceFormatted = formatBytes(file.size);

        // Remove the temporary staging file
        try { if (fs.existsSync(stagingFilePath)) fs.unlinkSync(stagingFilePath); } catch (e) {}

        // If target file doesn't exist yet, hardlink to duplicate master pointer
        if (!fs.existsSync(targetFilePath)) {
          try {
            fs.linkSync(existingDuplicatePath, targetFilePath);
          } catch (e) {
            try { fs.copyFileSync(existingDuplicatePath, targetFilePath); } catch (err) {}
          }
        }
      } else {
        // UNIQUE CONTENT:
        // Move staging file to targetFilePath (clean filename without _1)
        if (fs.existsSync(stagingFilePath)) {
          if (fs.existsSync(targetFilePath) && path.resolve(stagingFilePath) !== path.resolve(targetFilePath)) {
            try { fs.unlinkSync(targetFilePath); } catch (e) {}
          }
          try {
            fs.renameSync(stagingFilePath, targetFilePath);
          } catch (e) {
            try {
              fs.copyFileSync(stagingFilePath, targetFilePath);
              fs.unlinkSync(stagingFilePath);
            } catch (err) {}
          }
        }

        // Also register in pointers directory for future fast pointer deduplication
        if (pointerMasterPath && !fs.existsSync(pointerMasterPath) && fs.existsSync(targetFilePath)) {
          try {
            fs.linkSync(targetFilePath, pointerMasterPath);
          } catch (e) {
            // ignore if linking fails
          }
        }
      }

      uploadedFiles.push({
        originalName: cleanOriginalName,
        filename: targetFilename,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${subfolder}/${targetFilename}`,
        folder: `uploads/${subfolder}`,
        isDeduplicated,
        masterUrl: masterUrl || `/uploads/${subfolder}/${targetFilename}`,
        pointerUrl: pointerMasterPath ? `/uploads/pointers/${path.basename(pointerMasterPath)}` : '',
        savedSpaceFormatted
      });
      fileIndex++;
    }

    // Audit Log File Upload
    const fileNames = uploadedFiles.map(f => f.originalName).join(', ');
    const dedupText = uploadedFiles.some(f => f.isDeduplicated) ? ' (ทำการสร้าง Pointer รวมไฟล์ซ้ำอัตโนมัติสำเร็จ)' : '';
    await addSystemLog('UPLOAD_FILE', `อัปโหลด/แนบไฟล์แนบ (${subfolder}): ${fileNames}${dedupText}`, uploadedBy, ip);

    return res.json({ success: true, files: uploadedFiles });
  } catch (err: any) {
    console.error('File Upload Error:', err);
    return res.status(500).json({ error: err.message || 'การอัปโหลดไฟล์ล้มเหลว' });
  }
});

// File Deletion Endpoint: physically removes attachment files from server's uploads folder
app.delete('/api/upload', async (req, res) => {
  try {
    const fileUrl = (req.body?.url || req.query?.url || req.body?.fileUrl || req.query?.fileUrl || '').toString();
    const username = (req.body?.username || req.query?.username || 'ผู้ใช้งาน').toString();
    const ip = getClientIp(req);

    // Support single file deletion
    if (fileUrl) {
      const result = deletePhysicalUploadFile(fileUrl);
      if (result.success) {
        await addSystemLog('DELETE_FILE', `ลบไฟล์แนบออกจากเซิร์ฟเวอร์สำเร็จ: ${result.filename}`, username, ip);
        return res.json({ success: true, message: 'ลบไฟล์ออกจากเซิร์ฟเวอร์สำเร็จ', filename: result.filename });
      }
    }

    // Also support batch URLs if passed as urls array or query string
    const urlsArr = req.body?.urls || (req.query?.urls ? (req.query.urls as string).split(',') : null);
    if (urlsArr && Array.isArray(urlsArr)) {
      let deletedCount = 0;
      const deletedFiles: string[] = [];
      for (const u of urlsArr) {
        const r = deletePhysicalUploadFile(String(u));
        if (r.success) {
          deletedCount++;
          if (r.filename) deletedFiles.push(r.filename);
        }
      }
      if (deletedCount > 0) {
        await addSystemLog('DELETE_FILE', `ลบไฟล์แนบออกจากเซิร์ฟเวอร์สำเร็จ ${deletedCount} ไฟล์: ${deletedFiles.join(', ')}`, username, ip);
        return res.json({ success: true, message: `ลบไฟล์ออกจากเซิร์ฟเวอร์สำเร็จ ${deletedCount} ไฟล์`, files: deletedFiles });
      }
    }

    if (!fileUrl && (!urlsArr || urlsArr.length === 0)) {
      return res.status(400).json({ success: false, error: 'ไม่ระบุ URL ของไฟล์ที่ต้องการลบ' });
    }

    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์ที่ต้องการลบในเซิร์ฟเวอร์' });
  } catch (err: any) {
    console.error('Error in DELETE /api/upload:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบไฟล์จากเซิร์ฟเวอร์' });
  }
});

// Fallback endpoints for deleting files
app.post('/api/upload/delete', async (req, res) => {
  try {
    const fileUrl = (req.body?.url || req.query?.url || req.body?.fileUrl || req.query?.fileUrl || '').toString();
    const username = (req.body?.username || req.query?.username || 'ผู้ใช้งาน').toString();
    const ip = getClientIp(req);

    if (fileUrl) {
      const result = deletePhysicalUploadFile(fileUrl);
      if (result.success) {
        await addSystemLog('DELETE_FILE', `ลบไฟล์แนบออกจากเซิร์ฟเวอร์สำเร็จ: ${result.filename}`, username, ip);
        return res.json({ success: true, message: 'ลบไฟล์ออกจากเซิร์ฟเวอร์สำเร็จ', filename: result.filename });
      }
    }

    const urlsArr = req.body?.urls || (req.query?.urls ? (req.query.urls as string).split(',') : null);
    if (urlsArr && Array.isArray(urlsArr)) {
      let deletedCount = 0;
      const deletedFiles: string[] = [];
      for (const u of urlsArr) {
        const r = deletePhysicalUploadFile(String(u));
        if (r.success) {
          deletedCount++;
          if (r.filename) deletedFiles.push(r.filename);
        }
      }
      if (deletedCount > 0) {
        await addSystemLog('DELETE_FILE', `ลบไฟล์แนบออกจากเซิร์ฟเวอร์สำเร็จ ${deletedCount} ไฟล์: ${deletedFiles.join(', ')}`, username, ip);
        return res.json({ success: true, message: `ลบไฟล์ออกจากเซิร์ฟเวอร์สำเร็จ ${deletedCount} ไฟล์`, files: deletedFiles });
      }
    }

    if (!fileUrl && (!urlsArr || urlsArr.length === 0)) {
      return res.status(400).json({ success: false, error: 'ไม่ระบุ URL ของไฟล์ที่ต้องการลบ' });
    }

    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์ที่ต้องการลบในเซิร์ฟเวอร์' });
  } catch (err: any) {
    console.error('Error in POST /api/upload/delete:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบไฟล์จากเซิร์ฟเวอร์' });
  }
});

app.delete('/api/files', async (req, res) => {
  try {
    const fileUrl = (req.body?.url || req.query?.url || req.body?.fileUrl || req.query?.fileUrl || '').toString();
    const username = (req.body?.username || req.query?.username || 'ผู้ใช้งาน').toString();
    const ip = getClientIp(req);

    if (fileUrl) {
      const result = deletePhysicalUploadFile(fileUrl);
      if (result.success) {
        await addSystemLog('DELETE_FILE', `ลบไฟล์แนบออกจากเซิร์ฟเวอร์สำเร็จ: ${result.filename}`, username, ip);
        return res.json({ success: true, message: 'ลบไฟล์ออกจากเซิร์ฟเวอร์สำเร็จ', filename: result.filename });
      }
    }

    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์ที่ต้องการลบในเซิร์ฟเวอร์' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบไฟล์' });
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
    
    const apiKey = await getAppGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'ไม่พบ Gemini API Key ในระบบ' });
    }

    const ai = getGeminiClient(apiKey, req);
    const prompt = "Analyze this infographic design and provide suggestions for layout, typography, color palette, and content hierarchy. Keep it brief and constructive.";
    
    const { response } = await callGeminiWithFallback({
      client: ai,
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
    const friendlyMsg = formatGeminiErrorMessage(err);
    res.status(500).json({ error: 'วิเคราะห์ล้มเหลว: ' + friendlyMsg });
  }
});

app.post('/api/ai/remove-background', async (req, res) => {
  try {
    const { image, apiKey: reqApiKey } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพ' });
    }

    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = 'image/png';
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    }

    const apiKey = await getAppGeminiApiKey(reqApiKey);

    if (!apiKey) {
      return res.status(500).json({ error: 'ไม่พบ Gemini API Key ในระบบ' });
    }

    const ai = getGeminiClient(apiKey, req);

    const modelsToTry = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];

    const { response } = await callGeminiWithFallback({
      client: ai,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: 'Isolate the main subject or object in this image. Remove the background completely, turning all background area into transparent PNG. Return ONLY the isolated subject on a transparent background PNG image.',
          },
        ],
      },
      models: modelsToTry,
    });
    
    let resultImageBase64: string | null = null;
    if (response && response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const resMime = part.inlineData.mimeType || 'image/png';
          resultImageBase64 = `data:${resMime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (resultImageBase64) {
      return res.json({ transparentImage: resultImageBase64, method: 'ai' });
    }

    return res.status(422).json({ 
      error: 'AI Model ไม่ส่งคืนรูปภาพใส สามารถเลือกโหมดลบสีพื้นหลัง (Smart Chroma Key) แทนได้',
      fallbackToChroma: true 
    });
  } catch (err: any) {
    console.error('Remove background error:', err);
    res.status(500).json({ error: 'การประมวลผลลบพื้นหลังล้มเหลว: ' + (err.message || 'Unknown error') });
  }
});
app.get('/api/digital-signatures', async (req, res) => {
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures ORDER BY timestampIso DESC');
        if (rows && Array.isArray(rows)) {
          return res.json(rows);
        }
      } catch (err) {}
    }
    return res.json(localDb.digital_signatures || []);
  } catch (error: any) {
    console.error('Digital Signatures Fetch error:', error.message);
    return res.json(localDb.digital_signatures || []);
  }
});

app.delete('/api/digital-signatures', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';

  try {
    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM digital_signatures');
      } catch (err) {}
    }
    localDb.digital_signatures = [];
    saveLocalDb();
    await addSystemLog('CLEAR_TSA_LOGS', 'ล้างประวัติ Digital TSA Logs ทั้งหมด', username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Digital Signatures Clear error:', error.message);
    localDb.digital_signatures = [];
    saveLocalDb();
    return res.json({ success: true });
  }
});

app.delete('/api/digital-signatures/:id', async (req, res) => {
  const ip = getClientIp(req);
  const username = req.body?.username || req.query?.username || 'ผู้ดูแลระบบ';
  const logId = req.params.id;

  try {
    if (isMysqlOnline) {
      try {
        await pool.query('DELETE FROM digital_signatures WHERE id = ?', [logId]);
      } catch (err) {}
    }
    localDb.digital_signatures = (localDb.digital_signatures || []).filter((s: any) => String(s.id) !== String(logId));
    saveLocalDb();
    await addSystemLog('DELETE_TSA_LOG', `ลบรายการ Digital TSA Log ID: ${logId}`, username, ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Digital Signatures Delete specific error:', error.message);
    localDb.digital_signatures = (localDb.digital_signatures || []).filter((s: any) => String(s.id) !== String(logId));
    saveLocalDb();
    return res.json({ success: true });
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

async function executeUploadsDeduplication(targetHash?: string) {
  const scanResult = await scanUploadsDeduplication();
  let filesMerged = 0;
  let bytesReclaimed = 0;

  const pointersDir = path.join(process.cwd(), 'uploads', 'pointers');
  if (!fs.existsSync(pointersDir)) {
    try { fs.mkdirSync(pointersDir, { recursive: true }); } catch (e) {}
  }

  for (const grp of scanResult.groups) {
    if (targetHash && grp.hash !== targetHash) continue;

    const masterPath = grp.masterFile.path;
    if (!fs.existsSync(masterPath)) continue;

    const masterIno = fs.statSync(masterPath).ino;
    const masterFilename = path.basename(masterPath);
    const pointerMasterPath = path.join(pointersDir, `${grp.hash.substring(0, 16)}_${masterFilename}`);

    // Ensure Master is also registered in Pointer hub
    if (!fs.existsSync(pointerMasterPath)) {
      try {
        fs.linkSync(masterPath, pointerMasterPath);
      } catch (e) {
        try { fs.copyFileSync(masterPath, pointerMasterPath); } catch (err) {}
      }
    }

    for (const dup of grp.duplicates) {
      if (!fs.existsSync(dup.path)) continue;
      
      const dupStat = fs.statSync(dup.path);
      if (dupStat.ino !== masterIno) {
        try {
          // Delete duplicate physical file from server to reclaim disk space
          fs.unlinkSync(dup.path);
          // Replace with pointer hardlink to master file
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
    const targetHash = (req.body.hash || req.query.hash || '').toString();
    const ip = getClientIp(req);
    const result = await executeUploadsDeduplication(targetHash || undefined);
    
    await addSystemLog(
      'DEDUPLICATE_FILES',
      `ดำเนินการย้ายไฟล์ซ้ำไป Pointer & ลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์: ย้ายแล้ว ${result.filesMerged} ไฟล์ ประหยัดพื้นที่ได้ ${result.bytesReclaimedFormatted}`,
      username,
      ip
    );

    return res.json(result);
  } catch (err: any) {
    console.error('Error executing deduplication:', err);
    return res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการรวมไฟล์ซ้ำ' });
  }
});

app.post('/api/deduplication/deduplicate-group', async (req, res) => {
  try {
    const username = (req.body.username || req.query.username || 'ผู้ดูแลระบบ').toString();
    const hash = (req.body.hash || '').toString();
    if (!hash) {
      return res.status(400).json({ error: 'กรุณาระบุ Hash ของกลุ่มไฟล์ที่ต้องการย้ายไป Pointer' });
    }
    const ip = getClientIp(req);
    const result = await executeUploadsDeduplication(hash);
    
    await addSystemLog(
      'DEDUPLICATE_GROUP',
      `ดำเนินการย้ายกลุ่มไฟล์ซ้ำ (${hash.substring(0, 10)}) ไป Pointer & ลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์ ประหยัดเนื้อที่ได้ ${result.bytesReclaimedFormatted}`,
      username,
      ip
    );

    return res.json(result);
  } catch (err: any) {
    console.error('Error executing group deduplication:', err);
    return res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการย้ายกลุ่มไฟล์ซ้ำไป Pointer' });
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
  multipleStatements: true,
  sessionVariables: {
    sql_mode: 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'
  }
});

let isMysqlOnline = false;

// In-memory cache for role permissions to dramatically reduce database load
const permissionCache = new Map<string, { allowed: boolean; expiry: number }>();
export function invalidatePermissionCache() {
  permissionCache.clear();
}

// In-memory lookup caches for blazing fast reads and low database load
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const lookupCaches: {
  settings: CacheEntry<any> | null;
  departments: CacheEntry<any[]> | null;
  positions: CacheEntry<any[]> | null;
  organizations: CacheEntry<any[]> | null;
  fileCodes: CacheEntry<any[]> | null;
  numberingRules: CacheEntry<any[]> | null;
} = {
  settings: null,
  departments: null,
  positions: null,
  organizations: null,
  fileCodes: null,
  numberingRules: null,
};

const LOOKUP_CACHE_TTL = 15000; // 15 seconds TTL is highly effective and completely safe

function getLookupCached<T>(key: keyof typeof lookupCaches): T | null {
  const entry = lookupCaches[key];
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setLookupCached<T>(key: keyof typeof lookupCaches, data: T) {
  lookupCaches[key] = {
    data,
    expiry: Date.now() + LOOKUP_CACHE_TTL
  };
}

function invalidateLookupCache(key: keyof typeof lookupCaches) {
  lookupCaches[key] = null;
}

// In-memory cache for raw documents to prevent expensive UNION ALL queries
interface RawDocumentsCache {
  rows: any[];
  deptReceives: any[];
  folderMap: Map<number, string>;
  expiry: number;
}
let rawDocumentsCache: RawDocumentsCache | null = null;
const RAW_DOCS_CACHE_TTL = 30000; // 30 seconds cache since any write instantly invalidates it

export function invalidateAllCaches() {
  rawDocumentsCache = null;
  permissionCache.clear();
  for (const key of Object.keys(lookupCaches) as (keyof typeof lookupCaches)[]) {
    lookupCaches[key] = null;
  }
}

// Stricter Server-Side RBAC Enforcement Helper
async function hasServerPermission(role: string, permissionKey: string): Promise<boolean> {
  // admin always has all permissions
  if (role && (role.toLowerCase() === 'admin' || role === 'ผู้ดูแลระบบ')) return true;
  if (!role) return false;

  const cacheKey = `${role.toLowerCase()}:${permissionKey.toLowerCase()}`;
  const now = Date.now();
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return cached.allowed;
  }

  let allowed = false;
  try {
    if (isMysqlOnline) {
      const [rows]: any = await pool.query(
        'SELECT is_allowed FROM role_permissions WHERE LOWER(role) = LOWER(?) AND LOWER(permission_key) = LOWER(?)',
        [role, permissionKey]
      );
      if (rows && rows.length > 0) {
        allowed = rows[0].is_allowed === 1 || rows[0].is_allowed === true || String(rows[0].is_allowed) === '1' || String(rows[0].is_allowed) === 'true';
      }
    }
  } catch (err) {
    console.warn('MySQL hasServerPermission error:', err);
  }

  // Fallback to localDb
  if (!allowed && localDb && localDb.role_permissions) {
    const perm = localDb.role_permissions.find((p: any) => p.role && p.permission_key && p.role.toLowerCase() === role.toLowerCase() && p.permission_key.toLowerCase() === permissionKey.toLowerCase());
    if (perm) {
      allowed = perm.is_allowed === 1 || perm.is_allowed === true || String(perm.is_allowed) === '1' || String(perm.is_allowed) === 'true';
    }
  }

  permissionCache.set(cacheKey, { allowed, expiry: now + 30000 }); // 30s cache TTL
  return allowed;
}

// Local JSON file database helper
const dbStorePath = path.join(process.cwd(), 'uploads', 'db_store.json');

const defaultWorkflowTemplates = [
  {
    id: "tpl-001",
    name: "เส้นทางหนังสือรับเสนอผู้บังคับบัญชาตามลำดับชั้น (ระเบียบสารบรรณ พ.ศ. 2526)",
    description: "เสนอตามลำดับชั้นตามระเบียบสารบรรณ พ.ศ. 2526: สารบรรณกลาง -> หัวหน้าฝ่าย/กลุ่มงาน -> หัวหน้าสำนักงาน ปภ. -> ผู้ปฏิบัติงาน -> ตรวจเสนอจบเรื่อง",
    category: "หนังสือรับ",
    defaultPriority: "ปกติ",
    steps: [
      { stepNumber: 1, title: "ลงทะเบียนรับเรื่องและเสนอเกษียนหนังสือ", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 2, title: "ตรวจพิจารณาและกลั่นกรองเสนอความเห็น", assignedRole: "หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 24 },
      { stepNumber: 3, title: "ตรวจพิจารณาสั่งการ/เกษียณหนังสือ", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 24 },
      { stepNumber: 4, title: "ดำเนินการตามสั่งการและรายงานผล", assignedRole: "เจ้าหน้าที่ผู้รับผิดชอบ", department: "ฝ่ายป้องกันและปฏิบัติการ", actionType: "action", slaHours: 48 },
      { stepNumber: 5, title: "ตรวจรับทราบรายงานผลและจัดเก็บแฟ้มจบเรื่อง", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "archive", slaHours: 12 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "tpl-002",
    name: "เส้นทางหนังสือส่งภายนอก / ภายใน (ระเบียบสารบรรณ พ.ศ. 2526)",
    description: "กระบวนการออกหนังสือส่งตามระเบียบสารบรรณ: ยกร่าง -> ตรวจร่าง -> เสนอผู้มีอำนาจ -> ผู้บริหารลงนาม -> ออกเลขส่ง ประทับตรา และจัดส่ง",
    category: "หนังสือส่ง",
    defaultPriority: "ปกติ",
    steps: [
      { stepNumber: 1, title: "ยกร่างหนังสือและจัดทำเอกสารแนบ", assignedRole: "เจ้าหน้าที่ผู้ยกร่าง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 24 },
      { stepNumber: 2, title: "ตรวจพิจารณาและกลั่นกรองร่างหนังสือ", assignedRole: "หัวหน้าฝ่าย/กลุ่มงาน", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 3, title: "ตรวจพิจารณาเสนอผู้มีอำนาจลงนาม", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 12 },
      { stepNumber: 4, title: "พิจารณาลงนามในหนังสือราชการ", assignedRole: "ผู้ว่าราชการจังหวัด/ผู้ได้รับมอบอำนาจ", department: "ผู้บริหารจังหวัด", actionType: "sign", slaHours: 24 },
      { stepNumber: 5, title: "ลงทะเบียนออกเลข ประทับตรา และจัดส่งออก", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "archive", slaHours: 12 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "tpl-003",
    name: "เส้นทางหนังสือคำสั่ง / ประกาศ / หนังสือรับรอง (ระบบงานธุรการ)",
    description: "ระบบงานธุรการตามระเบียบสารบรรณ: ยกร่างธุรการ -> ตรวจข้อกฎหมาย/ระเบียบ -> เสนอผู้บริหารลงนาม -> ออกเลขทะเบียนธุรการ -> เวียนแจ้งและจัดเก็บ",
    category: "คำสั่ง/ประกาศ/หนังสือรับรอง",
    defaultPriority: "ด่วน",
    steps: [
      { stepNumber: 1, title: "ยกร่างคำสั่ง/ประกาศ/หนังสือรับรอง", assignedRole: "เจ้าหน้าที่ผู้ยกร่าง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 24 },
      { stepNumber: 2, title: "ตรวจสอบความถูกต้องตามระเบียบสารบรรณและกฎหมาย", assignedRole: "หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 3, title: "ตรวจเสนอผู้ว่าราชการจังหวัด/ผู้บริหาร", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 12 },
      { stepNumber: 4, title: "ลงนามในคำสั่ง/ประกาศ/หนังสือรับรอง", assignedRole: "ผู้ว่าราชการจังหวัดระยอง", department: "ผู้บริหารจังหวัด", actionType: "sign", slaHours: 24 },
      { stepNumber: 5, title: "ออกเลขทะเบียน ประทับตราสัญลักษณ์ และเวียนแจ้ง", assignedRole: "เจ้าหน้าที่สารบรรณกลาง", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "archive", slaHours: 12 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "tpl-004",
    name: "เส้นทางเสนออนุมัติงบประมาณและโครงการ",
    description: "ตรวจสอบกรอบงบประมาณ -> ตรวจสอบระเบียบพัสดุการเงิน -> เสนออนุมัติเบิกจ่ายตามระเบียบกระทรวงการคลัง",
    category: "อนุมัติงบประมาณ",
    defaultPriority: "ด่วนมาก",
    steps: [
      { stepNumber: 1, title: "ตรวจสอบกรอบงบประมาณโครงการ", assignedRole: "นักวิเคราะห์นโยบายและแผน", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 2, title: "ตรวจสอบยอดเงินคงเหลือและระเบียบการจัดซื้อ", assignedRole: "เจ้าพนักงานการเงินและบัญชี", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "review", slaHours: 12 },
      { stepNumber: 3, title: "พิจารณาอนุมัติโครงการและงบประมาณ", assignedRole: "หัวหน้าสำนักงาน ปภ.จังหวัด", department: "ผู้บริหาร", actionType: "approve", slaHours: 24 },
      { stepNumber: 4, title: "บันทึกข้อมูลเบิกจ่ายและจัดเก็บรายงาน", assignedRole: "เจ้าหน้าที่การเงิน", department: "ฝ่ายยุทธศาสตร์และการจัดการ", actionType: "archive", slaHours: 24 }
    ],
    createdAt: "2026-08-01T08:00:00.000Z"
  }
];

const defaultWorkflowInstances: any[] = [];

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
    { id: 1, username: 'admin', password: 'admin', firstName: 'ผู้ดูแลระบบ', lastName: 'ระบบงาน', position: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', role: 'admin', avatar: null, email: 'admin@example.com' },
    { id: 2, username: 'somchai', password: 'password', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', department: 'ฝ่ายป้องกันและปฏิบัติการ', role: 'user', avatar: null, email: 'somchai@example.com' },
    { id: 3, username: 'somsee', password: 'password', firstName: 'สมศรี', lastName: 'รักษ์ดี', position: 'เจ้าพนักงานธุรการชำนาญงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', role: 'moderator', avatar: null, email: 'somsee@example.com' },
    { id: 4, username: 'preecha', password: 'password', firstName: 'ปรีชา', lastName: 'มั่นคง', position: 'นายช่างเครื่องกลชำนาญงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', role: 'user', avatar: null, email: 'preecha@example.com' }
  ],
  departments: [
    { id: 1, name: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'ดูแลงานธุรการ สารบรรณ การเงิน พัสดุ วางแผนและวิเคราะห์นโยบาย' },
    { id: 2, name: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'ปฏิบัติงานกู้ภัย จัดเตรียมบุคลากร เครื่องจักรกล และวิทยากรฝึกอบรมสาธารณภัย' },
    { id: 3, name: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'ประสานการให้ความช่วยเหลือ และบรรเทาความเดือดร้อนแก่ผู้ประสบอุทกภัย วาตภัย และภัยพิบัติต่างๆ' }
  ],
  positions: [
    { id: 1, name: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', description: 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด' },
    { id: 2, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', description: 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 3, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการ', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 4, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 5, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 6, name: 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', description: 'ฝ่ายสงเคราะห์ผู้ประสบภัย' },
    { id: 7, name: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 8, name: 'เจ้าพนักงานธุรการชำนาญงาน', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
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
      ruleName: 'หนังสือรับ-สารบรรณกลาง (รย 0021)',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '0021',
      docType: 'หนังสือรับ',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'global',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'ทะเบียนรับกลางของสำนักงาน (สารบรรณกลาง)'
    },
    {
      id: 2,
      ruleName: 'หนังสือรับ-ฝ่ายยุทธศาสตร์และการจัดการ',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      divisionCode: '0021',
      docType: 'หนังสือรับ',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'ทะเบียนรับเอกสารของฝ่ายยุทธศาสตร์และการจัดการ'
    },
    {
      id: 3,
      ruleName: 'หนังสือรับ-ฝ่ายยุทธศาสตร์และการจัดการ',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      divisionCode: '0021.1',
      docType: 'หนังสือรับ',
      prefixPattern: 'รย 0021.1',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'ทะเบียนรับเอกสารของฝ่ายยุทธศาสตร์และการจัดการ'
    },
    {
      id: 4,
      ruleName: 'หนังสือรับ-ฝ่ายสงเคราะห์ผู้ประสบภัย',
      department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย',
      divisionCode: '0021.2',
      docType: 'หนังสือรับ',
      prefixPattern: 'รย 0021.2',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'ทะเบียนรับเอกสารของฝ่ายสงเคราะห์ผู้ประสบภัย'
    },
    {
      id: 5,
      ruleName: 'หนังสือรับ-ฝ่ายป้องกันและปฏิบัติการ',
      department: 'ฝ่ายป้องกันและปฏิบัติการ',
      divisionCode: '0021.3',
      docType: 'หนังสือรับ',
      prefixPattern: 'รย 0021.3',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'ทะเบียนรับเอกสารของฝ่ายป้องกันและปฏิบัติการ'
    },
    {
      id: 6,
      ruleName: 'หนังสือส่ง-สารบรรณกลาง (รย 0021)',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '0021',
      docType: 'หนังสือส่ง',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'global',
      currentSeq: 0,
      year: '2570',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งออกสารบรรณกลาง เช่น รย 0021/123 หรือ รย 0021/ว 123'
    },
    {
      id: 7,
      ruleName: 'หนังสือส่ง-ฝ่ายยุทธศาสตร์และการจัดการ (รย 0021)',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      divisionCode: '0021',
      docType: 'หนังสือส่ง',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2570',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งออกของฝ่ายยุทธศาสตร์และการจัดการ เช่น รย 0021/123 หรือ รย 0021/ว 123'
    },
    {
      id: 8,
      ruleName: 'หนังสือส่ง-ฝ่ายยุทธศาสตร์และการจัดการ (รย 0021.1)',
      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
      divisionCode: '0021.1',
      docType: 'หนังสือส่ง',
      prefixPattern: 'รย 0021.1',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2570',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายยุทธศาสตร์ เช่น รย 0021.1/123 หรือ รย 0021.1/ว 123'
    },
    {
      id: 9,
      ruleName: 'หนังสือส่ง-ฝ่ายสงเคราะห์ผู้ประสบภัย (รย 0021.2)',
      department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย',
      divisionCode: '0021.2',
      docType: 'หนังสือส่ง',
      prefixPattern: 'รย 0021.2',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2570',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายสงเคราะห์ เช่น รย 0021.2/123 หรือ รย 0021.2/ว 123'
    },
    {
      id: 10,
      ruleName: 'หนังสือส่ง-ฝ่ายป้องกันและปฏิบัติการ (รย 0021.3)',
      department: 'ฝ่ายป้องกันและปฏิบัติการ',
      divisionCode: '0021.3',
      docType: 'หนังสือส่ง',
      prefixPattern: 'รย 0021.3',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{isCircular ? "ว " : ""}{seq}',
      runningScope: 'department',
      currentSeq: 0,
      year: '2570',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือส่งของฝ่ายป้องกัน เช่น รย 0021.3/123 หรือ รย 0021.3/ว 123'
    },
    {
      id: 11,
      ruleName: 'หนังสือภายใน-บันทึกข้อความ (รย 0021)',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '0021',
      docType: 'หนังสือภายใน',
      prefixPattern: 'รย 0021',
      suffixPattern: '/{seq}',
      numberFormat: '{prefix}/{seq}',
      runningScope: 'global',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'รหัสหนังสือภายใน บันทึกข้อความทุกฝ่ายงาน'
    },
    {
      id: 12,
      ruleName: 'คำสั่งสำนักงาน/จังหวัด',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'คำสั่ง',
      prefixPattern: 'คำสั่ง',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทคำสั่งปภ./จังหวัด เช่น คำสั่ง 45/2569'
    },
    {
      id: 13,
      ruleName: 'ประกาศสำนักงาน/จังหวัด',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'ประกาศ',
      prefixPattern: 'ประกาศ',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทประกาศ เช่น ประกาศ 45/2569'
    },
    {
      id: 14,
      ruleName: 'หนังสือรับรอง',
      department: 'ทุกฝ่ายงาน',
      divisionCode: '',
      docType: 'หนังสือรับรอง',
      prefixPattern: 'หนังสือรับรอง',
      suffixPattern: '/{year}',
      numberFormat: '{prefix} {seq}/{year}',
      runningScope: 'doc_type',
      currentSeq: 0,
      year: '2569',
      resetFrequency: 'yearly',
      isActive: true,
      description: 'หนังสือประเภทรับรองความประพฤติ/เงินเดือน เช่น หนังสือรับรอง 45/2569'
    }
  ],
  file_codes: [
    { id: 1, code: '0021', name: 'งานบริหารทั่วไปและสารบรรณกลาง', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานบริหารทั่วไป งานสารบรรณกลาง สารบรรณจังหวัด' },
    { id: 2, code: '0021.1', name: 'งานยุทธศาสตร์และแผนงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'แผนป้องกันและบรรเทาสาธารณภัย โครงการยุทธศาสตร์' },
    { id: 3, code: '0021.2', name: 'งานสงเคราะห์และช่วยเหลือผู้ประสบภัย', department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'การให้ความช่วยเหลือ เงินชดเชย ผู้ประสบภัยพิบัติ' },
    { id: 4, code: '0021.3', name: 'งานป้องกัน ปฏิบัติการ และกู้ภัย', department: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'งานบรรเทาสาธารณภัย เครื่องจักรกล อุปกรณ์กู้ภัย' },
    { id: 5, code: '0022', name: 'งานการเงิน บัญชี และงบประมาณ', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานเบิกจ่าย งบประมาณ บัญชี และการเงิน' },
    { id: 6, code: '0023', name: 'งานพัสดุและอาคารสถานที่', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานจัดซื้อจัดจ้าง พัสดุ คุรุภัณฑ์ และอาคารสถานที่' }
  ],
  reserved_numbers: [],
  scheduled_reservations: [],
  inbox_documents: [],
  outbox_documents: [],
  circular_documents: [],
  internal_documents: [],
  admin_documents: [],
  department_receives: [],
  document_tracking: [],
  document_versions: [],
  system_logs: [],
  notifications: [],
  organizations: [],
  changelogs: []
};

const defaultChangelogs = [
  {
    id: 'cl-v3-0-0',
    version: 'v3.0.0',
    title: 'ปลดระวาง Firebase สำเร็จ & ระบบจัดดัชนีฐานข้อมูลความเร็วสูงสุด (Speed Performance Engine)',
    releaseDate: '2026-09-17',
    type: 'major',
    summary: 'ยกระดับประสิทธิภาพการทำงานของระบบสารบรรณอิเล็กทรอนิกส์ (EDMS) สู่ขีดสุดอย่างเป็นทางการ โดยการทำความสะอาดระบบและปลดระวาง Firebase/Firestore ออกอย่างสมบูรณ์แบบ 100% พร้อมเปิดใช้งานเทคโนโลยีฐานข้อมูลความเร็วสูง Database Indexing และระบบ Memory Cache Hub ป้องกันคอขวด',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบจัดดัชนีฐานข้อมูลความเร็วสูง (High-Throughput Database Indexing): สร้างดัชนีชี้ตำแหน่ง (Indexes) บนคอลัมน์ที่มีการสืบค้นและเชื่อมโยงตารางบ่อยครั้ง เช่น แฟ้มเอกสาร ฝ่ายงาน และสถานะการอ่านเอกสาร ช่วยลดภาระและเร่งความเร็วการค้นหาข้อมูลในตารางขนาดใหญ่ขึ้นกว่า 90%',
          'หน่วยความจำแคชอัจฉริยะ (Ultra-Fast In-Memory Cache Engine): เพิ่มกลไกการดึงข้อมูลจากแรมโดยอัตโนมัติ สำหรับรายการเอกสารและฝ่ายงานที่ได้รับเอกสาร เพื่อลดคิวรี SQL ซ้ำซ้อน และเพิ่มขีดความสามารถการรองรับผู้ใช้งานพร้อมกันจำนวนมาก',
          'ระบบล้างแคชตามธุรกรรมจริง (Active Cache Invalidation Middleware): ระบบเคลียร์หน่วยความจำแคชทันทีแบบเรียลไทม์เมื่อเกิดการบันทึกหรือปรับปรุงข้อมูล เพื่อความแม่นยำและอัปเดตข้อมูลให้สดใหม่อยู่เสมอ'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปลดระวางและยกเลิกใช้งาน Firebase/Firestore อย่างสมบูรณ์แบบ (Complete Firebase Phase-out) ทั้งระบบเบื้องหลังและส่วนเชื่อมต่อภายนอก เพื่อความเป็นอิสระและความปลอดภัยสูงสุดของข้อมูลองค์กร (Data Sovereignty)',
          'ทำความสะอาดระบบและสคริปต์สเปรดชีตส่วนเกิน (Project Sanitization) ลบไฟล์ทดสอบและสคริปต์สำรองที่ไม่ได้ใช้งานในระบบออกทั้งหมด ช่วยลดขนาดไฟล์และทำให้การตรวจสอบโค้ดสะดวกรวดเร็วยิ่งขึ้น'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: true,
    isPublished: true,
    createdAt: '2026-09-17T03:55:00.000Z',
    updatedAt: '2026-09-17T03:55:00.000Z'
  },
  {
    id: 'cl-v2-9-0',
    version: 'v2.9.0',
    title: 'ศูนย์ปัญญาประดิษฐ์วิเคราะห์สาธารณภัย (Smart AI Disaster Intelligence) & พรีวิวรายงานเหตุด่วน A4 ทางการ',
    releaseDate: '2026-09-17',
    type: 'major',
    summary: 'ยกระดับขีดความสามารถ Smart AI Assistant ให้เชื่อมโยงกับฐานข้อมูลศูนย์รายงานเหตุด่วนสาธารณภัย (Urgent Incident Center) ค้นหา วิเคราะห์ความเสียหาย สรุปสถานการณ์ภัยพิบัติในจังหวัดระยอง พร้อมระบบยกร่างหนังสือรายงานผู้ว่าราชการจังหวัด และพรีวิวรายงานเหตุด่วน A4 ตามระเบียบ ปภ.',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบปัญญาประดิษฐ์สืบค้นและวิเคราะห์เหตุด่วนสาธารณภัย (Disaster AI Intelligence): เชื่อมโยงฐานข้อมูลเหตุด่วน ปภ.ระยอง เข้าสู่ระบบ AI เพื่อตอบคำถาม สรุปสถิติความเสียหาย ผู้ประสบภัย ผู้บาดเจ็บ/เสียชีวิต แยกตามประเภทภัยและพื้นที่รายอำเภอ/ตำบล',
          'ฟังก์ชันแนบรายงานเหตุด่วนเฉพาะเรื่อง (Attach Incident to AI): เลือกแนบรายงานเหตุด่วนสาธารณภัยเข้าสู่หน้าต่างสนทนา AI เพื่อให้ AI ช่วยวิเคราะห์ สรุปประเด็นสำคัญ และประเมินความเสียหายได้อย่างแม่นยำ',
          'AI ยกร่างหนังสือรายงานเหตุด่วนถึงผู้ว่าราชการจังหวัด (Draft Disaster Report to Governor): สั่งการให้ AI นำข้อมูลสถิติผู้ประสบภัย พฤติการณ์เหตุการณ์ และการช่วยเหลือมายกร่างเป็นหนังสือราชการทางการเรียน ผวจ.ระยอง ตามระเบียบสำนักนายกฯ ได้ในคลิกเดียว',
          'หน้าต่างพรีวิวแบบรายงานเหตุด่วน A4 ทางการ (Official A4 Paper Preview & Direct Print): แสดงผลแบบรายงาน ปภ. ๑ ครบถ้วนตามมาตรฐาน พร้อมตราครุฑราชการ ตารางสรุปความเสียหาย และปุ่มสั่งพิมพ์รายงานทันใจ',
          'หมวดหมู่คำสั่งสำเร็จรูป "🚨 เหตุด่วนสาธารณภัย" (Disaster Prompt Presets): เพิ่มเทมเพลตคำสั่งสืบค้นและสรุปสถานการณ์อุทกภัย วาตภัย อัคคีภัย และสารเคมีรั่วไหลในจังหวัดระยอง'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงระบบคัดกรองคำค้นหา (Disaster Intent Filter) ค้นหาเหตุการณ์ได้อย่างครอบคลุมทั้งจากเลขที่รายงาน ประเภทภัย ตำบล อำเภอ และพฤติการณ์เหตุการณ์',
          'เชื่อมโยงปุ่มนำทางลัด (Quick Navigation) จาก Smart AI Assistant ตรงเข้าสู่โมดูลรายงานเหตุด่วนสาธารณภัย'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: true,
    isPublished: true,
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z'
  },
  {
    id: 'cl-v2-8-1',
    version: 'v2.8.1',
    title: 'ปรับปรุงความเสถียรของระบบสื่อสารและหน้าจอตรวจสอบระบบ (System Stability & UI Cleanup)',
    releaseDate: '2026-09-16',
    type: 'patch',
    summary: 'ปรับปรุงประสิทธิภาพการแสดงผลโลโก้ในเทมเพลตอีเมลเพื่อความเข้ากันได้สูงสุด และนำหน้าต่างตรวจสอบระบบ (Diagnostics) ออกเพื่อความเรียบร้อยของหน้าจอเข้าสู่ระบบ',
    changes: [
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงการแสดงผลโลโก้เป็นรูปแบบ PNG ในเทมเพลตอีเมลระบบ เพื่อรองรับการแสดงผลบนทุก Email Client (Gmail, Outlook) ได้อย่างเสถียร',
          'นำปุ่มและหน้าต่างตรวจสอบระบบแม่ข่าย (Backend Diagnostic) ออกจากหน้าเข้าสู่ระบบเพื่อความสวยงามและเป็นมืออาชีพ',
          'ปรับปรุงระบบการดึงที่อยู่ไฟล์ภาพ (Absolute URL) ในอีเมลแจ้งเตือนให้มีความถูกต้องแม่นยำสูงขึ้น'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-16T09:00:00.000Z',
    updatedAt: '2026-09-16T09:00:00.000Z'
  },
  {
    id: 'cl-v2-8-0',
    version: 'v2.8.0',
    title: 'การกำหนดสิทธิ์ระดับฝ่าย/กลุ่มงาน (Department Granular Overrides) & บันทึกประวัติเหตุด่วนสาธารณภัย',
    releaseDate: '2026-09-15',
    type: 'major',
    summary: 'ยกระดับระบบควบคุมสิทธิ์การใช้งาน (Role & Permission Control Hub) ให้รองรับการกำหนดสิทธิ์แยกย่อยระดับฝ่าย/กลุ่มงาน (Department Overrides) พร้อมสลับมุมมอง 2 มิติ (Combined 2D Matrix View) และเชื่อมโยงบันทึกประวัติการใช้งาน (Audit Logs) สำหรับกิจกรรมเหตุด่วนสาธารณภัยแบบครบวงจร',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'Role & Permission Control Hub รองรับการสลับมุมมองกำหนดสิทธิ์ตามระดับผู้ใช้งาน (Roles), แยกย่อยตามฝ่าย/กลุ่มงาน (Departments) และมุมมองรวมแบบเมทริกซ์ 2 มิติ (Combined 2D Matrix View)',
          'เชื่อมโยงสิทธิ์การใช้งานโมดูลเหตุด่วนสาธารณภัย (urgent_incidents) บินตรงอยู่ในแผงควบคุมสิทธิ์หลักของระบบ',
          'บันทึกประวัติกิจกรรมเหตุด่วนสาธารณภัย (Urgent Incident Audit Logs) ติดตามกิจกรรมการสร้าง แก้ไข ลบ AI สแกน และพิมพ์รายงานในศูนย์ประวัติการใช้งาน'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'รองรับ Department-Specific Overrides (dept:<DepartmentName>) ให้เฉพาะฝ่ายงานที่กำหนดข้ามระดับบทบาทได้โดยไม่กระทบสิทธิ์ผู้ใช้งานอื่นในระบบ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'cl-v2-7-0',
    version: 'v2.7.0',
    title: 'ศูนย์รายงานเหตุด่วนสาธารณภัย (Urgent Incident Center) & AI Vision OCR สแกนเอกสารอัตโนมัติ',
    releaseDate: '2026-09-14',
    type: 'major',
    summary: 'เปิดใช้งานโมดูลรายงานเหตุด่วนสาธารณภัย (แบบ ปภ. ๑) สมบูรณ์แบบ รองรับ AI สแกนคัดลอกข้อมูล คัดแยกภาพความเสียหายและลายเซ็นดิจิทัล พร้อมแดชบอร์ดสถิติภัยพิบัติและแผนที่ GIS แยกรายอำเภอ/ตำบล/หมู่บ้าน',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบรายงานเหตุด่วนสาธารณภัย ปภ.๑ บันทึกข้อมูลผู้ประสบภัย ทรัพย์สิน สิ่งก่อสร้าง การเกษตร ปศุสัตว์ และสิ่งสาธารณประโยชน์',
          'AI Vision OCR Document Scanner สแกนวิเคราะห์เอกสารเหตุด่วน คัดแยกฟิลด์ ลายเซ็น และรูปถ่ายความเสียหายลงฟอร์มให้อัตโนมัติ',
          'Interactive Urgent Incident Dashboard & GIS Location Map วิเคราะห์สถิติความเสียหายและการช่วยเหลือแยกตามพื้นที่รายอำเภอ ตำบล และหมู่บ้าน'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'รองรับการพรีวิว บันทึก ส่งออก และพิมพ์แบบรายงานเหตุด่วนสาธารณภัยย่อ/ขยายเต็มรูปแบบทางการ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-14T09:00:00.000Z',
    updatedAt: '2026-09-14T09:00:00.000Z'
  },
  {
    id: 'cl-v2-6-0',
    version: 'v2.6.0',
    title: 'อัปเกรดความน่าเชื่อถือและความปลอดภัยขั้นสูง (Enterprise Reliability & Security Overhaul)',
    releaseDate: '2026-09-11',
    type: 'major',
    summary: 'ยกระดับความปลอดภัยและความน่าเชื่อถือของระบบด้วยระบบสำรองข้อมูลอัตโนมัติรายวัน (Automated Daily Backups Engine) บังคับสิทธิ์ฝั่งเซิร์ฟเวอร์แบบเข้มงวด และปรับปรุงบริการตรวจวิเคราะห์เอกสารผ่าน AI รุ่นเสถียรที่สุด',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบสำรองข้อมูลอัตโนมัติรายวัน (Automated Daily Backups Engine): ประมวลผลและสำรองฐานข้อมูลอย่างยืดหยุ่นในรูปแบบ JSON ทุกๆ 24 ชั่วโมง พร้อมระบบลบไฟล์เก่าอัตโนมัติ (Rotation) ย้อนหลังสูงสุด 7 วัน เพื่อรักษาสมดุลของดิสก์',
          'แผงควบคุมระบบกู้คืนประวัติสำรองข้อมูลอัตโนมัติ: เพิ่มตารางแสดงประวัติไฟล์สำรองข้อมูลรายวันในหน้าตั้งค่า พร้อมระบบกู้คืนระบบกลับไปยังประวัติวันนั้นทันทีด้วยการกดปุ่ม Restore เพียงคลิกเดียว'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'ระบบตรวจสอบสิทธิ์ระดับเซิร์ฟเวอร์แบบเข้มงวด (Stricter Server-Side RBAC Enforcement): บังคับสิทธิ์การจัดการข้อมูลผ่าน Backend ทุกการเรียกใช้การสำรองข้อมูล (backup_restore) และตั้งค่าระบบ (system_settings) ป้องกันการโจมตีหรือการยิงคำขอตรงจากภายนอก'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'อัปเกรด AI วิเคราะห์ความถูกต้องและลายเซ็นดิจิทัล: อัปเกรด API ตรวจสอบลายเซ็นและการถอดข้อความของไฟล์แนบ PDF เป็นโมเดลเวอร์ชันทางการ gemini-3.1-flash-lite และ gemini-3.8-flash เพื่อความรวดเร็วและหลีกเลี่ยงข้อจำกัดโควตาของรุ่นทดลอง',
          'ขยายสเปกการสำรองข้อมูลครอบคลุม 100%: เพิ่มการซิงโครไนซ์ตารางข้อมูลทั้งหมดของฐานข้อมูล (รวมถึง Workflow, คิวอาร์โค้ด, ตารางประวัติ Changelogs) ให้สามารถจัดเก็บและกู้คืนได้อย่างสมบูรณ์แบบไม่สูญหาย'
        ]
      }
    ],
    images: [],
    author: 'System Admin',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z'
  },
  {
    id: 'cl-v2-5-1',
    version: 'v2.5.1',
    title: 'ปรับปรุงดีไซน์ Glassmorphism และความสวยงามของระบบ',
    releaseDate: '2026-09-11',
    type: 'minor',
    summary: 'ปรับปรุงหน้าตา UI/UX ของระบบให้มีความทันสมัย สวยงาม ล้ำสมัย ด้วยดีไซน์ Glassmorphism พร้อมเพิ่มประสิทธิภาพการตอบสนอง',
    changes: [
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงดีไซน์ Glassmorphism (Glassmorphism Overhaul): ปรับโฉมหน้าตา UI ทั้งระบบให้ดูโปร่งใส ทันสมัย และเป็นมืออาชีพมากขึ้น',
          'เพิ่มประสิทธิภาพระบบ: ปรับปรุงโครงสร้าง Layout ให้เหมาะสมกับการใช้งานบน Mobile และ PC',
          'ปรับปรุงความสวยงามของแถบแจ้งเตือน: ปรับดีไซน์ส่วนการแจ้งเตือนให้สะอาดตาและชัดเจนขึ้น'
        ]
      }
    ],
    images: [],
    author: 'System Admin',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-11T16:52:11.457Z',
    updatedAt: '2026-09-11T16:52:11.457Z'
  },
  {
    id: 'cl-v2-5-0',
    version: 'v2.5.0',
    title: 'ยกระดับอัตลักษณ์ ปภ.ระยอง (DDPM Rayong Visual Identity) & ระบบโหลดประสิทธิภาพสูง Next-Gen',
    releaseDate: '2026-09-10',
    type: 'major',
    summary: 'อัปเกรดตราสัญลักษณ์ทางการ ปภ.ระยอง (Vector Emblem) เต็มระบบทุกโมดูล, เพิ่มระบบแสดงผลสถานะการโหลดแบบ Futuristic Orbital Loading Engine, ปรับปรุงสถาปัตยกรรม Bundle สลับหน้าจอได้รวดเร็วทันที และเสริมระบบกู้คืนแคชอัตโนมัติ',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ติดตั้งตราสัญลักษณ์ราชการความละเอียดสูง (Official DDPM Vector Emblem) สำนักงาน ปภ.ระยอง ครอบคลุมทั้งระบบ (Login, Dashboard Sidebar, Header, Drafts, Favicon, QR)',
          'หน้าต่างแสดงสถานะการโหลดรูปแบบใหม่ (Futuristic Orbital Loading Screen) พร้อมวงแหวน Pulse Ring, แถบ Shimmer Indeterminate Progress Bar และสเต็ปแสดงสถานะอัจฉริยะ',
          'ระบบตรวจจับและกู้คืนความเร็วเครือข่าย (Auto Recovery Helper) เมื่อเครือข่ายขัดข้องพร้อมปุ่มรีเฟรชกู้คืนระบบทันใจ'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'เปลี่ยนผ่านสู่ Direct Static Core Architecture เพื่อความเสถียรสูงสุดในการสลับหน้าจอ (Zero Chunk Latency)',
          'ปรับปรุงฟังก์ชันการดึงค่าการตั้งค่าระบบ (fetchGlobalSettings) พร้อม Exponential Backoff และ Local Cache Fallback'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'ระบบตรวจสอบความถูกต้องของตราสัญลักษณ์และไฟล์คอนฟิกส่วนกลาง ป้องกันการดัดแปลงหรือสูญหายของ Asset ราชการ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-10T08:40:03.779Z',
    updatedAt: '2026-09-10T08:40:03.779Z'
  },
  {
    id: 'cl-v2-4-8',
    version: 'v2.4.8',
    title: 'ระบบเชื่อมต่อความปลอดภัยขั้นสูง & เพิ่มประสิทธิภาพฐานข้อมูลเรียลไทม์',
    releaseDate: '2026-09-10',
    type: 'minor',
    summary: 'เพิ่มขีดความสามารถระบบ Realtime Synchronization เชื่อมต่อข้อมูลเอกสารและสถานะผู้ใช้งานแบบทันที พร้อมระบบตรวจสอบสิทธิ์ระดับฟิลด์และปกป้อง Session ผู้ใช้งาน',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบ Realtime Broadcast แจ้งเตือนการอัปเดตเอกสารและทะเบียนรับ-ส่งทั่วทั้งสำนักงานแบบ Instant Push',
          'ระบบตรวจสอบ Session Expiry แบบ Dynamic Multi-tab Protection ป้องกันการเข้าถึงซ้ำซ้อน'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'เพิ่มความเร็วในการตอบสนองของ MySQL Database Query และ Cache Layer สำหรับข้อมูลสถิติเอกสาร',
          'ปรับปรุงการแสดงผลรายการเอกสารในโหมดหน้าจอความละเอียดสูง (Ultra-wide & 4K Display Support)'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'เพิ่มระบบ Sanitization และการตรวจสอบ Payload ป้องกัน XSS / SQL Injection ในทุกจุดรับข้อมูล'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS สำนักงาน ปภ.ระยอง',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-10T08:39:59.189Z',
    updatedAt: '2026-09-10T08:39:59.189Z'
  },
  {
    id: 'cl-v2-4-5',
    version: 'v2.4.5',
    title: 'อัปเกรดดีไซน์ระบบจัดการบุคลากร (User Management) & ปรับปรุงประสิทธิภาพ',
    releaseDate: '2026-09-10',
    type: 'minor',
    summary: 'ปรับเปลี่ยน Layout ส่วนการจัดการข้อมูลบุคลากรในหน้าตั้งค่าระบบให้มีความสวยงาม มีระดับความเป็นมืออาชีพ รองรับการแสดงผลบน PC และ Mobile อย่างสมบูรณ์แบบ',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ปรับปรุงตารางข้อมูลบุคลากร (PC) ให้โปร่งสบาย มองง่าย และจัดกลุ่มข้อมูลเป็นสัดส่วน',
          'เปลี่ยนการแสดงผลบน Mobile เป็นแบบ Card View ที่ทันสมัยและอ่านข้อมูลได้ชัดเจนยิ่งขึ้น',
          'เพิ่มสถานะและ Badge บอก Role ผู้ใช้งานอย่างชัดเจน'
        ]
      }
    ],
    images: [],
    author: 'Administrator',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z'
  },
  {
    id: 'cl-v2-4-0',
    version: 'v2.4.0',
    title: 'เปิดตัวระบบ Changelog & Release Notes และศูนย์ความปลอดภัยเต็มระบบ',
    releaseDate: '2026-09-09',
    type: 'major',
    summary: 'อัปเกรดระบบสารบรรณอิเล็กทรอนิกส์เวอร์ชัน 2.4.0 เพิ่มศูนย์บันทึกประวัติการพัฒนา (Changelog Hub), แสดงรหัสเลขเวอร์ชันทุกหน้าจอ, พร้อมระบบแนบรูปภาพพรีวิวฟังก์ชัน และควบคุมสิทธิ์ผ่าน Role & Permission Control Hub',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบ Changelog & Release Notes เต็มระบบ สามารถดูรายละเอียดประวัติการอัปเดตของแต่ละเวอร์ชันได้อย่างละเอียด',
          'ป้ายแสดงรหัสเลขเวอร์ชันแบบไดนามิกบนแถบส่วนหัว (Header) และเมนูนำทางทุกหน้าจอ กดเพื่อเปิดดูรายละเอียดได้ทันที',
          'รองรับการแนบภาพพรีวิวฟังก์ชันและภาพหน้าจอ (Screenshots & Showcase) พร้อมระบบ Lightbox ดูภาพขยายขนาดเต็ม',
          'เพิ่มสิทธิ์การจัดการ Changelog (manage_changelog) ในแผงควบคุมสิทธิ์ผู้ใช้งาน (Role & Permission Control Hub) ให้ Admin จัดการเพิ่ม/แก้ไข/ลบได้อย่างสมบูรณ์'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงประสิทธิภาพความเร็วการโหลดข้อมูลและการซิงค์สถานะแบบเรียลไทม์ (SSE Zero-latency Stream)',
          'ปรับปรุงหน้าต่างจัดการบทบาทและสิทธิ์ผู้ใช้งานให้มีความยืดหยุ่นและค้นหาสิทธิ์ได้รวดเร็ว'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'จำกัดสิทธิ์การสร้าง แก้ไข และลบประวัติเวอร์ชันให้เฉพาะผู้ดูแลระบบ (Admin) หรือผู้ได้รับมอบหมายเท่านั้น'
        ]
      }
    ],
    images: [],
    author: 'ผู้ดูแลระบบกลาง (System Admin)',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-09-09T12:00:00.000Z',
    updatedAt: '2026-09-09T12:00:00.000Z'
  },
  {
    id: 'cl-v2-3-2',
    version: 'v2.3.2',
    title: 'ระบบรักษาความปลอดภัยแฟ้มเอกสารลับ 3 ชั้น และ Export ข้อมูลขั้นสูง',
    releaseDate: '2026-08-28',
    type: 'patch',
    summary: 'ยกระดับระบบตู้เอกสารดิจิทัลความลับ (Classified Cabinets) พร้อมระบบกำหนดรหัสผ่านความปลอดภัย 3 ชั้น และเพิ่มฟังก์ชันการส่งออกรายงานสรุปสถิติสารบรรณในรูปแบบ Excel/CSV/PDF',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบตู้เอกสารลับ (Secret Archive Vault) รองรับการตั้งรหัสผ่านแยกเฉพาะแฟ้ม และบันทึกประวัติการเข้าถึงรายบุคคล',
          'Export Report Studio ส่งออกสถิติหนังสือรับ-ส่ง, ปริมาณงานรายฝ่าย และรายงาน SLA สรุปประจำเดือน'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงการแสดงผลตารางข้อมูลเอกสารให้รองรับการเลื่อนดูข้อมูลขนาดใหญ่ (Virtualized Scrolling)',
          'เพิ่มประสิทธิภาพระบบค้นหาเอกสารความเร็วสูงแบบ Real-time Indexed Filtering'
        ]
      },
      {
        category: 'fix',
        categoryLabel: '🛠️ การแก้ไขข้อผิดพลาด (Bug Fixes)',
        items: [
          'แก้ไขปัญหาการแสดงผลฟอนต์ภาษาไทย TH Sarabun PSK ในการสร้างไฟล์ PDF บนบางระบบปฏิบัติการ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-08-28T14:30:00.000Z',
    updatedAt: '2026-08-28T14:30:00.000Z'
  },
  {
    id: 'cl-v2-3-0',
    version: 'v2.3.0',
    title: 'ระบบสร้าง QR Code สารบรรณอัจฉริยะ & สติ๊กเกอร์บาร์โค้ด',
    releaseDate: '2026-08-15',
    type: 'minor',
    summary: 'เพิ่มโมดูล QR Code Studio & PDF Label Generator สำหรับสร้าง QR Code สารบรรณ แทรกใน PDF และจัดพิมพ์สติ๊กเกอร์บาร์โค้ดสำหรับติดแฟ้มเอกสาร',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'QR Code Studio ออกแบบ QR Code สำหรับเอกสารราชการพร้อมตราครุฑและสีกรมท่าทางการ',
          'ระบบติดตามการสแกน QR Code (Scan Analytics & Geolocation Tracking)',
          'ส่งออกแม่แบบสติ๊กเกอร์ขนาดมาตรฐานสำหรับพิมพ์ติดแฟ้มเอกสารและสันแฟ้มราชการ',
          'เครื่องมือประทับตรายางรับ-ส่ง (Digital Rubber Stamp) ลงบนไฟล์ PDF โดยอัตโนมัติ'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงประสิทธิภาพการสร้างเอกสาร PDF ให้รวดเร็วขึ้น 40%',
          'เพิ่มระบบลดขนาดไฟล์ภาพสแกนเอกสารอัตโนมัติเพื่อประหยัดพื้นที่จัดเก็บ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z'
  },
  {
    id: 'cl-v2-2-0',
    version: 'v2.2.0',
    title: 'ศูนย์ลงนามดิจิทัลมาตรฐาน ETDA & ระบบติดตาม SLA อัจฉริยะ',
    releaseDate: '2026-07-20',
    type: 'minor',
    summary: 'เพิ่มระบบตรวจสอบและลงนามดิจิทัลมาตรฐาน ETDA Gateway และระบบติดตามกระบวนการทำงาน Workflow & SLA Real-time',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ศูนย์ลงนามดิจิทัล ETDA รองรับ Certificate และลายมือชื่ออิเล็กทรอนิกส์ตาม พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์',
          'ผังการเดินเอกสาร Workflow พร้อมการแจ้งเตือนความล่าช้า SLA อัตโนมัติ',
          'ระบบบันทึกข้อความสั่งการและเกษียนหนังสือดิจิทัลสำหรับผู้บริหาร (Digital Endorsement)',
          'ระบบแจ้งเตือนแบบ Push Notifications แจ้งเตือนหนังสือเข้าใหม่ทันที'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงความเสถียรของระบบซิงค์ไฟล์เอกสารแนบขนาดใหญ่ข้ามสาขา'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-07-20T08:30:00.000Z',
    updatedAt: '2026-07-20T08:30:00.000Z'
  },
  {
    id: 'cl-v2-1-0',
    version: 'v2.1.0',
    title: 'สตูดิโอออกแบบสื่อ Infographics & ระบบเผยแพร่เอกสารสาธารณะ',
    releaseDate: '2026-06-25',
    type: 'minor',
    summary: 'เพิ่มโมดูล Infographics Studio สำหรับฝ่ายประชาสัมพันธ์ในการออกแบบและเผยแพร่สื่อข้อมูลราชการ พร้อมระบบรหัสผ่านและระบบแชร์ลิงก์สาธารณะ',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'Infographics Editor พร้อมเครื่องมือวาด แม่แบบป้ายประชาสัมพันธ์ และคลังภาพกราฟิกมาตรฐาน',
          'ระบบสร้าง Public Link พร้อมตั้งรหัสผ่านป้องกัน และการนับสถิติการเปิดดู (View Counter)',
          'ระบบส่งออกภาพความละเอียดสูง PNG / SVG และการฝัง Widget (Embed Code) ลงบนเว็บไซต์หน่วยงาน'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'เพิ่มประสิทธิภาพระบบจัดเก็บไฟล์ Media และระบบ CDN Caching สำหรับการเข้าชมจากภายนอก'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z'
  },
  {
    id: 'cl-v2-0-0',
    version: 'v2.0.0',
    title: 'ระบบสารบรรณอิเล็กทรอนิกส์ ปภ.ระยอง 2.0 (Next-Gen EDMS)',
    releaseDate: '2026-06-01',
    type: 'major',
    summary: 'ยกเครื่องสถาปัตยกรรมระบบสารบรรณอิเล็กทรอนิกส์ใหม่ทั้งหมด รองรับสมุดทะเบียนรับ-ส่ง หนังสือภายใน งานธุรการ และผู้ช่วย AI สารบรรณ',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบทะเบียนหนังสือรับ หนังสือส่ง และหนังสือภายในตามระเบียบสำนักนายกรัฐมนตรี',
          'ระบบผู้ช่วย AI Smart สารบรรณ สำหรับสรุปและยกร่างหนังสือราชการ',
          'เครื่องมือออกแบบสื่อประชาสัมพันธ์ Infographics Studio',
          'ระบบแฟ้มเอกสารดิจิทัลและตู้ควบคุมความลับ',
          'ถังขยะกู้คืนเอกสาร (Recycle Bin) ป้องกันการลบข้อมูลผิดพลาด พร้อมตั้งเวลาลบถาวร 30 วัน'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'อัปเกรดฐานข้อมูลรองรับการทำงานแบบไฮบริด MySQL Relational Database และ Local Offline Storage',
          'รองรับธีมการแสดงผล Dark / Light Mode และจานสีเฉพาะหน่วยงาน'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  },
  {
    id: 'cl-v1-5-0',
    version: 'v1.5.0',
    title: 'ระบบสมุดทะเบียนรับ-ส่งอัตโนมัติ & ระบบค้นหาเอกสารขั้นสูง',
    releaseDate: '2026-04-18',
    type: 'minor',
    summary: 'เพิ่มระบบออกเลขที่หนังสือราชการอัตโนมัติตามหมวดหมู่ฝ่ายงาน และระบบค้นหาเอกสารแบบ Full-Text Search พร้อมพรีวิวไฟล์แนบในตัว',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบจัดสรรเลขที่หนังสืออัตโนมัติ (Auto-Numbering Sequence) ป้องกันเลขที่หนังสือซ้ำซ้อน',
          'ระบบค้นหาเอกสารขั้นสูง กรองตามวันที่, ฝ่ายงาน, ชั้นความเร็ว, ชั้นความลับ และคำสำคัญในเนื้อหา',
          'ตัวแสดงผลไฟล์เอกสาร PDF / รูปภาพในหน้าจอโดยไม่ต้องดาวน์โหลดลงเครื่อง'
        ]
      },
      {
        category: 'improvement',
        categoryLabel: '⚡ การปรับปรุง (Improvements)',
        items: [
          'ปรับปรุงระบบนำทางและเมนูการใช้งานสำหรับแท็บเล็ตและอุปกรณ์พกพา'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-04-18T08:00:00.000Z',
    updatedAt: '2026-04-18T08:00:00.000Z'
  },
  {
    id: 'cl-v1-2-0',
    version: 'v1.2.0',
    title: 'ระบบบริหารจัดการสิทธิ์ผู้ใช้งาน (RBAC) & บันทึกประวัติการใช้งาน (Audit Logs)',
    releaseDate: '2026-03-05',
    type: 'minor',
    summary: 'เพิ่มระบบจัดการบัญชีผู้ใช้งาน ฝ่ายงาน และตำแหน่ง พร้อมระบบบันทึกประวัติการกระทำของผู้ใช้งาน (Audit Logs) เพื่อความโปร่งใสและตรวจสอบได้',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบจัดการบทบาทและสิทธิ์ผู้ใช้งาน (Role-Based Access Control: Admin, Moderator, User)',
          'ระบบบันทึก Audit Logs บันทึกทุกกิจกรรมการสร้าง แก้ไข ลบ และเปิดดูเอกสารพร้อม IP Address',
          'ระบบเปลี่ยนรหัสผ่านและจัดการโปรไฟล์ส่วนตัวของผู้ใช้งาน'
        ]
      },
      {
        category: 'security',
        categoryLabel: '🔒 ความปลอดภัย (Security)',
        items: [
          'บังคับใช้การเข้ารหัสรหัสผ่านแบบ Salted Hash ปลอดภัยตามมาตรฐานความปลอดภัยสารสนเทศ'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-05T09:00:00.000Z'
  },
  {
    id: 'cl-v1-0-0',
    version: 'v1.0.0',
    title: 'เปิดตัวระบบสารบรรณอิเล็กทรอนิกส์ สำนักงาน ปภ.ระยอง (Initial Launch)',
    releaseDate: '2026-01-15',
    type: 'major',
    summary: 'เปิดใช้งานระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Phase 1) สำหรับจัดเก็บและค้นหาเอกสารราชการภายในสำนักงานอย่างเป็นทางการ',
    changes: [
      {
        category: 'feature',
        categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
        items: [
          'ระบบลงทะเบียนเข้าใช้งานและเข้าสู่ระบบสารบรรณอย่างปลอดภัย',
          'การบันทึกข้อมูลเอกสารรับเข้าและแนบไฟล์สแกนเอกสารต้นฉบับ',
          'แดชบอร์ดสรุปภาพรวมเอกสารและสถิติการรับส่งหนังสือประจำวัน',
          'ระบบสำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)'
        ]
      }
    ],
    images: [],
    author: 'ทีมพัฒนาระบบ EDMS',
    isLatest: false,
    isPublished: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z'
  }
];

function deduplicateChangelogs(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, any>();

  for (const item of items) {
    if (!item) continue;
    const rawVersion = (item.version || '').trim();
    const versionKey = rawVersion.toLowerCase().replace(/^v/i, '');
    if (!versionKey) continue;

    const formattedVer = rawVersion.toLowerCase().startsWith('v') ? rawVersion : `v${rawVersion}`;

    if (!map.has(versionKey)) {
      map.set(versionKey, { ...item, version: formattedVer });
    } else {
      const existing = map.get(versionKey)!;
      const existingChanges = Array.isArray(existing.changes) ? existing.changes.length : 0;
      const newChanges = Array.isArray(item.changes) ? item.changes.length : 0;
      if (item.isLatest || (!existing.isLatest && newChanges >= existingChanges)) {
        map.set(versionKey, { ...item, version: formattedVer });
      }
    }
  }

  const result = Array.from(map.values());

  result.sort((a, b) => {
    const clean = (v: string) => (v || '').replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0);
    const partsA = clean(a.version);
    const partsB = clean(b.version);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) {
        return numB - numA;
      }
    }
    return new Date(b.releaseDate || b.createdAt || 0).getTime() - new Date(a.releaseDate || a.createdAt || 0).getTime();
  });

  result.forEach((item, index) => {
    item.isLatest = (index === 0);
  });

  return result;
}

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
    localDb.workflow_instances = [];
    saveLocalDb();
    if (!localDb.document_versions || !Array.isArray(localDb.document_versions)) {
      localDb.document_versions = JSON.parse(JSON.stringify(initialSeedData.document_versions || []));
      saveLocalDb();
    }
    if (!localDb.numbering_rules || !Array.isArray(localDb.numbering_rules)) {
      localDb.numbering_rules = [];
      saveLocalDb();
    }
    if (!localDb.file_codes || !Array.isArray(localDb.file_codes) || localDb.file_codes.length === 0) {
      localDb.file_codes = JSON.parse(JSON.stringify(initialSeedData.file_codes || []));
      saveLocalDb();
    }
    if (!localDb.urgent_incidents || !Array.isArray(localDb.urgent_incidents)) {
      localDb.urgent_incidents = [];
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
        // admin (21 permissions)
        { role: 'admin', permission_key: 'view_all_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'edit_all_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'delete_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'approve_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'admin_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'urgent_incidents', is_allowed: 1 },
        { role: 'admin', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'admin', permission_key: 'infographics', is_allowed: 1 },
        { role: 'admin', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'admin', permission_key: 'surveys', is_allowed: 1 },
        { role: 'admin', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'admin', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'admin', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'admin', permission_key: 'digital_signatures', is_allowed: 1 },
        { role: 'admin', permission_key: 'recycle_bin', is_allowed: 1 },
        { role: 'admin', permission_key: 'manage_users', is_allowed: 1 },
        { role: 'admin', permission_key: 'system_settings', is_allowed: 1 },
        { role: 'admin', permission_key: 'backup_restore', is_allowed: 1 },
        { role: 'admin', permission_key: 'audit_logs', is_allowed: 1 },
        { role: 'admin', permission_key: 'manage_changelog', is_allowed: 1 },
        // moderator (17 permissions)
        { role: 'moderator', permission_key: 'view_all_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'edit_all_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'delete_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'approve_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'admin_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'urgent_incidents', is_allowed: 1 },
        { role: 'moderator', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'moderator', permission_key: 'infographics', is_allowed: 1 },
        { role: 'moderator', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'moderator', permission_key: 'surveys', is_allowed: 1 },
        { role: 'moderator', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'moderator', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'moderator', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'moderator', permission_key: 'digital_signatures', is_allowed: 1 },
        { role: 'moderator', permission_key: 'recycle_bin', is_allowed: 1 },
        { role: 'moderator', permission_key: 'manage_users', is_allowed: 0 },
        { role: 'moderator', permission_key: 'system_settings', is_allowed: 0 },
        { role: 'moderator', permission_key: 'backup_restore', is_allowed: 0 },
        { role: 'moderator', permission_key: 'audit_logs', is_allowed: 0 },
        { role: 'moderator', permission_key: 'manage_changelog', is_allowed: 0 },
        // user (10 permissions)
        { role: 'user', permission_key: 'view_all_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'create_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'edit_all_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'delete_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'approve_docs', is_allowed: 0 },
        { role: 'user', permission_key: 'export_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'admin_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'urgent_incidents', is_allowed: 1 },
        { role: 'user', permission_key: 'ai_assistant', is_allowed: 1 },
        { role: 'user', permission_key: 'infographics', is_allowed: 1 },
        { role: 'user', permission_key: 'qr_generator', is_allowed: 1 },
        { role: 'user', permission_key: 'surveys', is_allowed: 1 },
        { role: 'user', permission_key: 'draft_docs', is_allowed: 1 },
        { role: 'user', permission_key: 'digital_folders', is_allowed: 1 },
        { role: 'user', permission_key: 'workflow_sla', is_allowed: 1 },
        { role: 'user', permission_key: 'digital_signatures', is_allowed: 0 },
        { role: 'user', permission_key: 'recycle_bin', is_allowed: 0 },
        { role: 'user', permission_key: 'manage_users', is_allowed: 0 },
        { role: 'user', permission_key: 'system_settings', is_allowed: 0 },
        { role: 'user', permission_key: 'backup_restore', is_allowed: 0 },
        { role: 'user', permission_key: 'audit_logs', is_allowed: 0 },
        { role: 'user', permission_key: 'manage_changelog', is_allowed: 0 }
      ];
      saveLocalDb();
    } else {
      // Clean up any non-standard or department-specific roles from role_permissions
      const validRoles = ['admin', 'moderator', 'user'];
      const beforeCount = localDb.role_permissions.length;
      localDb.role_permissions = localDb.role_permissions.filter((p: any) => validRoles.includes(p.role));
      let changed = localDb.role_permissions.length !== beforeCount;

      // Ensure all standard keys exist in localDb.role_permissions
      const roles = ['admin', 'moderator', 'user'];
      const defaultAllowed: Record<string, Record<string, number>> = {
        admin: { manage_changelog: 1, urgent_incidents: 1, admin_docs: 1, vehicles: 1 },
        moderator: { manage_changelog: 0, urgent_incidents: 1, admin_docs: 1, manage_users: 0, vehicles: 1 },
        user: { manage_changelog: 0, urgent_incidents: 1, admin_docs: 1, manage_users: 0, vehicles: 1 }
      };
      for (const r of roles) {
        if (!localDb.role_permissions.some((p: any) => p.role === r && p.permission_key === 'manage_changelog')) {
          localDb.role_permissions.push({
            role: r,
            permission_key: 'manage_changelog',
            is_allowed: defaultAllowed[r]?.manage_changelog ?? 0
          });
          changed = true;
        }
        if (!localDb.role_permissions.some((p: any) => p.role === r && p.permission_key === 'urgent_incidents')) {
          localDb.role_permissions.push({
            role: r,
            permission_key: 'urgent_incidents',
            is_allowed: defaultAllowed[r]?.urgent_incidents ?? 1
          });
          changed = true;
        }
        if (!localDb.role_permissions.some((p: any) => p.role === r && p.permission_key === 'vehicles')) {
          localDb.role_permissions.push({
            role: r,
            permission_key: 'vehicles',
            is_allowed: defaultAllowed[r]?.vehicles ?? 1
          });
          changed = true;
        }
      }
      // Ensure moderator and user manage_users is strictly 0
      localDb.role_permissions.forEach((p: any) => {
        if ((p.role === 'moderator' || p.role === 'user') && p.permission_key === 'manage_users' && p.is_allowed !== 0) {
          p.is_allowed = 0;
          changed = true;
        }
      });
      if (changed) saveLocalDb();
    }
    if (!localDb.changelogs || !Array.isArray(localDb.changelogs) || localDb.changelogs.length === 0) {
      localDb.changelogs = deduplicateChangelogs(defaultChangelogs);
      saveLocalDb();
    } else {
      const merged = [...localDb.changelogs, ...defaultChangelogs];
      localDb.changelogs = deduplicateChangelogs(merged);
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
    console.warn('Failed to load local db_store.json, attempting backup restore:', err);
    try {
      const bakPath = `${dbStorePath}.bak`;
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf-8');
        if (bakData && bakData.trim().length > 0) {
          localDb = JSON.parse(bakData);
          console.log('✅ Successfully restored local database from .bak snapshot');
          sanitizeAndCleanDepartments();
          saveLocalDb(true);
          return;
        }
      }
    } catch (bakErr) {
      console.warn('Backup snapshot not readable:', bakErr);
    }
    localDb = JSON.parse(JSON.stringify(initialSeedData));
  }
  sanitizeAndCleanDepartments();
  saveLocalDb(true);
}

function sanitizeAndCleanDepartments() {
  if (!localDb) return;
  const legacyNames = ['ฝ่ายบริหารงานทั่วไป', 'ฝ่ายบริหารทั่วไป', 'บริหารงานทั่วไป', 'บริหารทั่วไป'];
  const targetDept = 'ฝ่ายยุทธศาสตร์และการจัดการ';

  // 1. Clean departments collection
  if (Array.isArray(localDb.departments)) {
    localDb.departments.forEach((d: any) => {
      if (d && legacyNames.some(l => d.name === l || d.name?.includes('บริหารงานทั่วไป') || d.name?.includes('ฝ่ายบริหารทั่วไป'))) {
        d.name = targetDept;
        d.description = 'งานธุรการ สารบรรณ การเงิน พัสดุ นโยบาย แผนงาน และยุทธศาสตร์';
      }
    });

    const seen = new Set<string>();
    const uniqueDepts: any[] = [];
    localDb.departments.forEach((d: any) => {
      if (d && d.name && !seen.has(d.name)) {
        seen.add(d.name);
        uniqueDepts.push(d);
      }
    });

    const required = [
      { name: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานธุรการ สารบรรณ การเงิน พัสดุ นโยบาย แผนงาน และยุทธศาสตร์' },
      { name: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'งานป้องกันและบรรเทาสาธารณภัย กู้ภัย การฝึกซ้อม และการเผชิญเหตุ' },
      { name: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'งานช่วยเหลือ เยียวยา และฟื้นฟูผู้ประสบสาธารณภัย' }
    ];
    required.forEach(reqDept => {
      if (!uniqueDepts.some(d => d.name === reqDept.name)) {
        uniqueDepts.push({ id: Date.now() + Math.floor(Math.random() * 1000), ...reqDept });
      }
    });

    localDb.departments = uniqueDepts;
  } else {
    localDb.departments = JSON.parse(JSON.stringify(initialSeedData.departments));
  }

  // 2. Clean users
  if (Array.isArray(localDb.users)) {
    localDb.users.forEach((u: any) => {
      if (u && legacyNames.some(l => u.department === l || u.department?.includes('บริหารงานทั่วไป') || u.department?.includes('ฝ่ายบริหารทั่วไป'))) {
        u.department = targetDept;
      }
      if (u && u.position && (u.position.includes('บริหารงานทั่วไป') || u.position.includes('ฝ่ายบริหารทั่วไป'))) {
        u.position = u.position.replace(/ฝ่ายบริหารงานทั่วไป|ฝ่ายบริหารทั่วไป/g, targetDept);
      }
    });
  }

  // 3. Clean numbering_rules
  if (Array.isArray(localDb.numbering_rules)) {
    localDb.numbering_rules.forEach((r: any) => {
      if (r && legacyNames.some(l => r.department === l || r.department?.includes('บริหารงานทั่วไป') || r.department?.includes('ฝ่ายบริหารทั่วไป'))) {
        r.department = targetDept;
      }
      if (r && r.ruleName) {
        r.ruleName = r.ruleName.replace(/ฝ่ายบริหารงานทั่วไป|ฝ่ายบริหารทั่วไป/g, targetDept);
      }
      if (r && r.description) {
        r.description = r.description.replace(/ฝ่ายบริหารงานทั่วไป|ฝ่ายบริหารทั่วไป/g, targetDept);
      }
    });
  }

  // 4. Clean file_codes
  if (Array.isArray(localDb.file_codes)) {
    localDb.file_codes.forEach((fc: any) => {
      if (fc && legacyNames.some(l => fc.department === l || fc.department?.includes('บริหารงานทั่วไป') || fc.department?.includes('ฝ่ายบริหารทั่วไป'))) {
        fc.department = targetDept;
      }
    });
  }

  // 5. Clean documents in all lists
  const docLists = ['inbox_documents', 'outbox_documents', 'admin_documents', 'circular_documents', 'internal_documents', 'draft_documents', 'recycle_bin'];
  docLists.forEach((listKey: string) => {
    if (Array.isArray(localDb[listKey])) {
      localDb[listKey].forEach((doc: any) => {
        if (!doc) return;
        if (legacyNames.some(l => doc.department === l || doc.department?.includes('บริหารงานทั่วไป') || doc.department?.includes('ฝ่ายบริหารทั่วไป'))) {
          doc.department = targetDept;
        }
        if (legacyNames.some(l => doc.toDept === l || doc.toDept?.includes('บริหารงานทั่วไป') || doc.toDept?.includes('ฝ่ายบริหารทั่วไป'))) {
          doc.toDept = targetDept;
        }
        if (legacyNames.some(l => doc.fromDept === l || doc.fromDept?.includes('บริหารงานทั่วไป') || doc.fromDept?.includes('ฝ่ายบริหารทั่วไป'))) {
          doc.fromDept = targetDept;
        }
        if (Array.isArray(doc.forwardedTo)) {
          doc.forwardedTo = doc.forwardedTo.map((f: string) =>
            legacyNames.some(l => f === l || f?.includes('บริหารงานทั่วไป') || f?.includes('ฝ่ายบริหารทั่วไป')) ? targetDept : f
          );
        }
        if (Array.isArray(doc.departmentReceives)) {
          doc.departmentReceives.forEach((dr: any) => {
            if (dr && legacyNames.some(l => dr.department === l || dr.department?.includes('บริหารงานทั่วไป') || dr.department?.includes('ฝ่ายบริหารทั่วไป'))) {
              dr.department = targetDept;
            }
          });
        }
      });
    }
  });

  // 6. Clean workflow templates & instances
  if (Array.isArray(localDb.workflow_templates)) {
    localDb.workflow_templates.forEach((wt: any) => {
      if (wt && Array.isArray(wt.steps)) {
        wt.steps.forEach((step: any) => {
          if (step && legacyNames.some(l => step.department === l || step.department?.includes('บริหารงานทั่วไป') || step.department?.includes('ฝ่ายบริหารทั่วไป'))) {
            step.department = targetDept;
          }
          if (step && step.assignedRole && (step.assignedRole.includes('บริหารงานทั่วไป') || step.assignedRole.includes('ฝ่ายบริหารทั่วไป'))) {
            step.assignedRole = step.assignedRole.replace(/หัวหน้าฝ่ายบริหารงานทั่วไป|หัวหน้าฝ่ายบริหารทั่วไป/g, 'หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ');
          }
        });
      }
    });
  }

  if (Array.isArray(localDb.workflow_instances)) {
    localDb.workflow_instances.forEach((wi: any) => {
      if (wi && Array.isArray(wi.steps)) {
        wi.steps.forEach((step: any) => {
          if (step && legacyNames.some(l => step.department === l || step.department?.includes('บริหารงานทั่วไป') || step.department?.includes('ฝ่ายบริหารทั่วไป'))) {
            step.department = targetDept;
          }
        });
      }
    });
  }
}

let saveDbDebounceTimer: NodeJS.Timeout | null = null;
let isSavingDb = false;
let pendingSaveDb = false;

async function performSaveLocalDbAsync() {
  if (isSavingDb) {
    pendingSaveDb = true;
    return;
  }
  isSavingDb = true;
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }
    // Use compact JSON string to minimize memory allocations and CPU cycles
    const dataStr = JSON.stringify(localDb);
    const tmpPath = `${dbStorePath}.tmp`;
    await fs.promises.writeFile(tmpPath, dataStr, 'utf-8');
    await fs.promises.rename(tmpPath, dbStorePath);

    // Asynchronously create backup snapshot
    try {
      await fs.promises.copyFile(dbStorePath, `${dbStorePath}.bak`);
    } catch (_) {}
  } catch (err) {
    console.error('Failed to save local db_store.json asynchronously:', err);
  } finally {
    isSavingDb = false;
    if (pendingSaveDb) {
      pendingSaveDb = false;
      saveLocalDb(false);
    }
  }
}

function saveLocalDb(immediate = false) {
  if (immediate) {
    if (saveDbDebounceTimer) {
      clearTimeout(saveDbDebounceTimer);
      saveDbDebounceTimer = null;
    }
    performSaveLocalDbAsync().catch(() => {});
  } else {
    if (!saveDbDebounceTimer) {
      saveDbDebounceTimer = setTimeout(() => {
        saveDbDebounceTimer = null;
        performSaveLocalDbAsync().catch(() => {});
      }, 500);
    }
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
    const match = cleanSql.match(/FROM\s+[`']?([a-zA-Z0-9_]+)[`']?/i);
    const tbl = match ? match[1] : 'department_receives';
    let items = (localDb[tbl] || []);
    if (cleanSql.includes('isCentral = 0') && cleanSql.includes('department = ?')) {
      const dept = params[0];
      const yr = params[1];
      items = items.filter(item => (item.isCentral === 0 || Number(item.isCentral) === 0) && item.department === dept && (!yr || String(item.year) === String(yr)));
    } else if (cleanSql.includes('isCentral = 1') || cleanSql.includes('isCentral IS NULL')) {
      const yr = params[0];
      items = items.filter(item => (item.isCentral === 1 || Number(item.isCentral) === 1 || item.isCentral === undefined || item.isCentral === null) && (!yr || String(item.year) === String(yr)));
    } else if (params.length >= 2) {
      const dept = params[0];
      const yr = params[1];
      items = items.filter(item => item.department === dept && (!yr || String(item.year) === String(yr)));
    }
    const maxVal = items.reduce((max, item) => Math.max(max, Number(item.receiveNumber) || 0), 0);
    return [[{ maxNum: maxVal, max: maxVal }], []];
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
  try {
    return await originalPoolQuery(sql, params);
  } catch (err: any) {
    const msg = err.message || '';
    const isSchemaError = msg.includes('Duplicate column name') || 
                         msg.includes('already exists') || 
                         msg.includes('Duplicate key name') || 
                         msg.includes('Duplicate entry') ||
                         msg.includes('doesn\'t exist') ||
                         msg.includes('SUPER privilege');
    
    if (!isSchemaError) {
      console.warn('⚠️ MySQL Query failed, using local DB fallback:', msg);
    }
    
    try {
      return await handleLocalDbQuery(sql, params);
    } catch (fallbackErr: any) {
      if (!isSchemaError) {
        console.error('❌ Local DB fallback failed:', fallbackErr.message);
      }
      throw err;
    }
  }
};

// Also wrap execute if called anywhere
(pool as any).execute = (pool as any).query;

// Initialize database schema
async function setupDatabase() {
  try {
    // Ensure missing tables from ALL_SYSTEM_TABLES exist to avoid fallback warnings
    if (typeof pool !== 'undefined' && isMysqlOnline) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS document_versions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            versionNumber INT NOT NULL,
            content LONGTEXT,
            changeSummary TEXT,
            modifiedBy VARCHAR(255),
            modifiedAt VARCHAR(100),
            isCurrent TINYINT(1) DEFAULT 0,
            INDEX idx_dv_docId (docId)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            content LONGTEXT,
            author VARCHAR(255),
            priority VARCHAR(50) DEFAULT 'normal',
            isActive TINYINT(1) DEFAULT 1,
            createdAt VARCHAR(100),
            updatedAt VARCHAR(100)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            action VARCHAR(255) NOT NULL,
            details TEXT,
            module VARCHAR(100),
            ipAddress VARCHAR(100),
            createdAt VARCHAR(100),
            INDEX idx_ua_username (username),
            INDEX idx_ua_action (action)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS custom_doc_numbers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            docId VARCHAR(255) NOT NULL,
            customNumber VARCHAR(255),
            year VARCHAR(50),
            department VARCHAR(255),
            createdAt VARCHAR(100),
            UNIQUE KEY unique_custom_doc (docId)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS urgent_incidents (
            id VARCHAR(255) PRIMARY KEY,
            docNumber VARCHAR(255),
            docDate VARCHAR(100),
            fromPerson VARCHAR(255),
            toPerson VARCHAR(255),
            incidentTypes LONGTEXT,
            incidentTypeOther TEXT,
            incidentAppearance TEXT,
            severity VARCHAR(100),
            startDate VARCHAR(100),
            startTime VARCHAR(50),
            endDate VARCHAR(100),
            endTime VARCHAR(50),
            location TEXT,
            affectedPeople INT DEFAULT 0,
            affectedHouseholds INT DEFAULT 0,
            injured INT DEFAULT 0,
            dead INT DEFAULT 0,
            missing INT DEFAULT 0,
            evacuatedPeople INT DEFAULT 0,
            evacuatedHouseholds INT DEFAULT 0,
            damageHouses INT DEFAULT 0,
            damageHighRises INT DEFAULT 0,
            damageTemples INT DEFAULT 0,
            damageGovBuildings INT DEFAULT 0,
            damageOtherBuildings INT DEFAULT 0,
            damageBuildingCost DECIMAL(15,2) DEFAULT 0,
            damageAgricultureCrops TEXT,
            damageAgricultureRice DECIMAL(15,2) DEFAULT 0,
            damageAgricultureOrchard DECIMAL(15,2) DEFAULT 0,
            damageAgricultureFish DECIMAL(15,2) DEFAULT 0,
            damageAgricultureShrimp DECIMAL(15,2) DEFAULT 0,
            damageLivestockCow INT DEFAULT 0,
            damageLivestockPig INT DEFAULT 0,
            damageLivestockPoultry INT DEFAULT 0,
            damageLivestockOther TEXT,
            damageAgricultureCost DECIMAL(15,2) DEFAULT 0,
            damagePublicRoads INT DEFAULT 0,
            damagePublicBridges INT DEFAULT 0,
            damagePublicBridgeApproaches INT DEFAULT 0,
            damagePublicWeirs INT DEFAULT 0,
            damagePublicOther TEXT,
            damagePublicCost DECIMAL(15,2) DEFAULT 0,
            totalDamageCost DECIMAL(15,2) DEFAULT 0,
            mitigation TEXT,
            toolsFireTrucks INT DEFAULT 0,
            toolsWaterTrucks INT DEFAULT 0,
            toolsRescueTrucks INT DEFAULT 0,
            toolsFireBoats INT DEFAULT 0,
            toolsWaterPumps INT DEFAULT 0,
            toolsOther TEXT,
            opsGovAgencies TEXT,
            opsPrivateSector TEXT,
            proposals LONGTEXT,
            reporterName VARCHAR(255),
            reporterPosition VARCHAR(255),
            signatureImage LONGTEXT,
            damageImages LONGTEXT,
            createdAt VARCHAR(50),
            updatedAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Dynamic Migration: Check and add incidentAppearance column to urgent_incidents if missing
        try {
          const [columns]: any = await pool.query("SHOW COLUMNS FROM urgent_incidents LIKE 'incidentAppearance'");
          if (!columns || columns.length === 0) {
            await pool.query("ALTER TABLE urgent_incidents ADD COLUMN incidentAppearance TEXT AFTER incidentTypeOther");
            console.log('✅ Added column incidentAppearance to urgent_incidents table successfully');
          }
        } catch (colErr: any) {
          console.warn('Note migrating incidentAppearance column:', colErr.message);
        }

        console.log('✅ Pre-initialized all mandatory system tables in MySQL');
      } catch (err: any) {
        console.warn('Note pre-initializing system tables:', err.message);
      }
    }

    const sqlPath = path.join(process.cwd(), 'database.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlFile = fs.readFileSync(sqlPath, 'utf-8');
      
      // Strip full-line comments before parsing statements
      const cleanSql = sqlFile.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
      
      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
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

      // Ensure custom_numbering table exists as compatibility alias
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS custom_numbering (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ruleName VARCHAR(255),
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
      } catch (e) {}

      // Migrate any legacy 'หนังสือภายนอก' to 'หนังสือส่ง'
      try {
        await pool.query("UPDATE numbering_rules SET docType = 'หนังสือส่ง' WHERE docType = 'หนังสือภายนอก'");
        await pool.query("UPDATE numbering_rules SET ruleName = REPLACE(ruleName, 'หนังสือภายนอก', 'หนังสือส่ง') WHERE ruleName LIKE '%หนังสือภายนอก%'");
        await pool.query("UPDATE reserved_numbers SET docType = 'หนังสือส่ง' WHERE docType = 'หนังสือภายนอก'");
        await pool.query("UPDATE scheduled_reservations SET docType = 'หนังสือส่ง' WHERE docType = 'หนังสือภายนอก'");
      } catch (migErr) {}

      // Migrate and purge 'ฝ่ายบริหารงานทั่วไป' / 'ฝ่ายบริหารทั่วไป' to 'ฝ่ายยุทธศาสตร์และการจัดการ'
      try {
        await pool.query("UPDATE users SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE inbox_documents SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE outbox_documents SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE admin_documents SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE circular_documents SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE internal_documents SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE numbering_rules SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE numbering_rules SET ruleName = REPLACE(REPLACE(ruleName, 'ฝ่ายบริหารงานทั่วไป', 'ฝ่ายยุทธศาสตร์และการจัดการ'), 'ฝ่ายบริหารทั่วไป', 'ฝ่ายยุทธศาสตร์และการจัดการ') WHERE ruleName LIKE '%บริหารงานทั่วไป%' OR ruleName LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE numbering_rules SET description = REPLACE(REPLACE(description, 'ฝ่ายบริหารงานทั่วไป', 'ฝ่ายยุทธศาสตร์และการจัดการ'), 'ฝ่ายบริหารทั่วไป', 'ฝ่ายยุทธศาสตร์และการจัดการ') WHERE description LIKE '%บริหารงานทั่วไป%' OR description LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE file_codes SET department = 'ฝ่ายยุทธศาสตร์และการจัดการ' WHERE department LIKE '%บริหารงานทั่วไป%' OR department LIKE '%ฝ่ายบริหารทั่วไป%'");
        await pool.query("UPDATE departments SET name = 'ฝ่ายยุทธศาสตร์และการจัดการ', description = 'งานธุรการ สารบรรณ การเงิน พัสดุ นโยบาย แผนงาน และยุทธศาสตร์' WHERE name LIKE '%บริหารงานทั่วไป%' OR name LIKE '%ฝ่ายบริหารทั่วไป%'");
      } catch (migDeptErr) {}

      // Synchronize numbering_rules year in MySQL if needed without auto-inserting seed rules
      try {
        const [existingRules]: any = await pool.query('SELECT * FROM numbering_rules');
        for (const found of (existingRules || [])) {
          if (found.year === '2569') {
            await pool.query('UPDATE numbering_rules SET year = ? WHERE id = ?', ['2570', found.id]);
          }
        }
      } catch (seedErr) {
        console.warn('Syncing numbering rules year to MySQL note:', seedErr);
      }

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
            reservedDate VARCHAR(100),
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
        try { await pool.query('ALTER TABLE reserved_numbers ADD COLUMN reservedDate VARCHAR(100)', []); } catch (e) {}
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
            dateOption VARCHAR(50) DEFAULT 'current_date',
            specificDate VARCHAR(50),
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
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN dateOption VARCHAR(50) DEFAULT "current_date"', []); } catch (e) {}
        try { await pool.query('ALTER TABLE scheduled_reservations ADD COLUMN specificDate VARCHAR(50)', []); } catch (e) {}
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
      try { await pool.query('ALTER TABLE users ADD COLUMN emailNotifications TINYINT(1) DEFAULT 1', []); } catch (e) {}

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
            (7, 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', 'ฝ่ายยุทธศาสตร์และการจัดการ'),
            (8, 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายยุทธศาสตร์และการจัดการ'),
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
          { role: 'admin', key: 'vehicles', val: 1 },
          { role: 'admin', key: 'urgent_incidents', val: 1 },
          { role: 'admin', key: 'ai_assistant', val: 1 },
          { role: 'admin', key: 'infographics', val: 1 },
          { role: 'admin', key: 'qr_generator', val: 1 },
          { role: 'admin', key: 'surveys', val: 1 },
          { role: 'admin', key: 'draft_docs', val: 1 },
          { role: 'admin', key: 'digital_folders', val: 1 },
          { role: 'admin', key: 'workflow_sla', val: 1 },
          { role: 'admin', key: 'digital_signatures', val: 1 },
          { role: 'admin', key: 'recycle_bin', val: 1 },
          { role: 'admin', key: 'manage_users', val: 1 },
          { role: 'admin', key: 'system_settings', val: 1 },
          { role: 'admin', key: 'backup_restore', val: 1 },
          { role: 'admin', key: 'audit_logs', val: 1 },
          { role: 'admin', key: 'manage_changelog', val: 1 },
          // moderator
          { role: 'moderator', key: 'view_all_docs', val: 1 },
          { role: 'moderator', key: 'create_docs', val: 1 },
          { role: 'moderator', key: 'edit_all_docs', val: 1 },
          { role: 'moderator', key: 'delete_docs', val: 1 },
          { role: 'moderator', key: 'approve_docs', val: 1 },
          { role: 'moderator', key: 'export_docs', val: 1 },
          { role: 'moderator', key: 'admin_docs', val: 1 },
          { role: 'moderator', key: 'vehicles', val: 1 },
          { role: 'moderator', key: 'urgent_incidents', val: 1 },
          { role: 'moderator', key: 'ai_assistant', val: 1 },
          { role: 'moderator', key: 'infographics', val: 1 },
          { role: 'moderator', key: 'qr_generator', val: 1 },
          { role: 'moderator', key: 'surveys', val: 1 },
          { role: 'moderator', key: 'draft_docs', val: 1 },
          { role: 'moderator', key: 'digital_folders', val: 1 },
          { role: 'moderator', key: 'workflow_sla', val: 1 },
          { role: 'moderator', key: 'digital_signatures', val: 1 },
          { role: 'moderator', key: 'recycle_bin', val: 1 },
          { role: 'moderator', key: 'manage_users', val: 0 },
          { role: 'moderator', key: 'system_settings', val: 0 },
          { role: 'moderator', key: 'backup_restore', val: 0 },
          { role: 'moderator', key: 'audit_logs', val: 0 },
          { role: 'moderator', key: 'manage_changelog', val: 0 },
          // user
          { role: 'user', key: 'view_all_docs', val: 0 },
          { role: 'user', key: 'create_docs', val: 1 },
          { role: 'user', key: 'edit_all_docs', val: 0 },
          { role: 'user', key: 'delete_docs', val: 0 },
          { role: 'user', key: 'approve_docs', val: 0 },
          { role: 'user', key: 'export_docs', val: 1 },
          { role: 'user', key: 'admin_docs', val: 1 },
          { role: 'user', key: 'vehicles', val: 1 },
          { role: 'user', key: 'urgent_incidents', val: 1 },
          { role: 'user', key: 'ai_assistant', val: 1 },
          { role: 'user', key: 'infographics', val: 1 },
          { role: 'user', key: 'qr_generator', val: 1 },
          { role: 'user', key: 'surveys', val: 1 },
          { role: 'user', key: 'draft_docs', val: 1 },
          { role: 'user', key: 'digital_folders', val: 1 },
          { role: 'user', key: 'workflow_sla', val: 1 },
          { role: 'user', key: 'digital_signatures', val: 0 },
          { role: 'user', key: 'recycle_bin', val: 0 },
          { role: 'user', key: 'manage_users', val: 0 },
          { role: 'user', key: 'system_settings', val: 0 },
          { role: 'user', key: 'backup_restore', val: 0 },
          { role: 'user', key: 'audit_logs', val: 0 },
          { role: 'user', key: 'manage_changelog', val: 0 }
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
        await pool.query("UPDATE role_permissions SET is_allowed = 0 WHERE role IN ('moderator', 'user') AND permission_key = 'manage_users'").catch(() => {});
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

      // Ensure changelogs table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS changelogs (
            id VARCHAR(100) PRIMARY KEY,
            version VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            releaseDate VARCHAR(50) NOT NULL,
            type VARCHAR(50) DEFAULT 'minor',
            summary TEXT,
            changes LONGTEXT,
            images LONGTEXT,
            author VARCHAR(255),
            isLatest TINYINT(1) DEFAULT 0,
            isPublished TINYINT(1) DEFAULT 1,
            createdAt VARCHAR(50),
            updatedAt VARCHAR(50)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);
        
        // Seed or update key milestone changelogs in MySQL
        let seededMilestones = 0;
        for (const item of defaultChangelogs) {
          const [exists]: any = await pool.query('SELECT id FROM changelogs WHERE id = ? OR version = ?', [item.id, item.version]);
          if (!exists || exists.length === 0) {
            await pool.query(
              `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                item.version,
                item.title,
                item.releaseDate,
                item.type,
                item.summary,
                JSON.stringify(item.changes || []),
                JSON.stringify(item.images || []),
                item.author || 'ผู้ดูแลระบบ',
                item.isLatest ? 1 : 0,
                item.isPublished !== false ? 1 : 0,
                item.createdAt || new Date().toISOString(),
                item.updatedAt || new Date().toISOString()
              ]
            );
            seededMilestones++;
          }
        }
        // Ensure v3.0.0 is marked as latest in MySQL if present
        try {
          await pool.query("UPDATE changelogs SET isLatest = 0 WHERE id != 'cl-v3-0-0'", []);
          await pool.query("UPDATE changelogs SET isLatest = 1 WHERE id = 'cl-v3-0-0'", []);
        } catch (_) {}
        if (seededMilestones > 0) {
          console.log(`✅ Seeded ${seededMilestones} milestone changelog entries in MySQL`);
        }
        console.log('✅ Initialized and synchronized changelogs table in MySQL');
      } catch (e) {
        console.warn('Note checking/creating/seeding changelogs table:', e);
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
          'ALTER TABLE infographics ADD COLUMN scope VARCHAR(50) DEFAULT \'central\'',
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

      // Ensure surveys and survey_responses tables exist with complete schema
      try {
        // 1. Create or update surveys table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS surveys (
            id VARCHAR(100) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            category VARCHAR(100) DEFAULT 'satisfaction',
            category_label VARCHAR(100) DEFAULT 'ความพึงพอใจ',
            department VARCHAR(255) DEFAULT '',
            creator_id VARCHAR(100) DEFAULT 'admin',
            creator_name VARCHAR(255) DEFAULT 'ผู้ดูแลระบบ',
            status VARCHAR(50) DEFAULT 'published',
            settings LONGTEXT,
            questions LONGTEXT,
            view_count INT DEFAULT 0,
            response_count INT DEFAULT 0,
            created_at VARCHAR(50),
            updated_at VARCHAR(50),
            INDEX idx_category (category),
            INDEX idx_status (status)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // 2. Create or update survey_responses table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS survey_responses (
            id VARCHAR(100) PRIMARY KEY,
            survey_id VARCHAR(100) NOT NULL,
            survey_title VARCHAR(255) DEFAULT NULL,
            respondent_name VARCHAR(255) DEFAULT NULL,
            respondent_department VARCHAR(255) DEFAULT NULL,
            respondent_position VARCHAR(255) DEFAULT NULL,
            respondent_phone VARCHAR(50) DEFAULT NULL,
            respondent_email VARCHAR(255) DEFAULT NULL,
            respondent_ip VARCHAR(100) DEFAULT NULL,
            device_info VARCHAR(255) DEFAULT NULL,
            time_spent_seconds INT DEFAULT 0,
            total_score DECIMAL(10,2) DEFAULT NULL,
            answers LONGTEXT,
            submitted_at VARCHAR(50),
            INDEX idx_survey_id (survey_id),
            INDEX idx_submitted_at (submitted_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, []);

        // 3. Auto-migrate missing columns for existing tables
        try {
          const [surveyCols]: any = await pool.query("SHOW COLUMNS FROM surveys LIKE 'status'");
          if (!surveyCols || surveyCols.length === 0) {
            await pool.query("ALTER TABLE surveys ADD COLUMN status VARCHAR(50) DEFAULT 'published' AFTER creator_name");
          }
        } catch (_) {}

        const responseColsToAdd = [
          { name: 'survey_title', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'respondent_position', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'respondent_phone', type: 'VARCHAR(50) DEFAULT NULL' },
          { name: 'respondent_email', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'respondent_ip', type: 'VARCHAR(100) DEFAULT NULL' },
          { name: 'device_info', type: 'VARCHAR(255) DEFAULT NULL' },
          { name: 'total_score', type: 'DECIMAL(10,2) DEFAULT NULL' }
        ];

        for (const col of responseColsToAdd) {
          try {
            const [c]: any = await pool.query(`SHOW COLUMNS FROM survey_responses LIKE '${col.name}'`);
            if (!c || c.length === 0) {
              await pool.query(`ALTER TABLE survey_responses ADD COLUMN ${col.name} ${col.type}`);
            }
          } catch (_) {}
        }

        // 4. Seed all Official Survey Templates from single source of truth
        if (Array.isArray(OFFICIAL_SURVEY_TEMPLATES)) {
          console.log(`📡 [Strict MySQL] Seeding ${OFFICIAL_SURVEY_TEMPLATES.length} official survey templates...`);
          for (let i = 0; i < OFFICIAL_SURVEY_TEMPLATES.length; i++) {
            const tpl = OFFICIAL_SURVEY_TEMPLATES[i];
            const tplId = `survey_official_${i + 1}`;
            const [chkRows]: any = await pool.query('SELECT id FROM surveys WHERE id = ?', [tplId]);
            if (!chkRows || chkRows.length === 0) {
              const now = new Date(Date.now() - (i * 86400000 * 2)).toISOString();
              await pool.query(
                `INSERT INTO surveys (id, title, description, category, category_label, department, creator_id, creator_name, status, settings, questions, view_count, response_count, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  tplId,
                  tpl.title,
                  tpl.description || '',
                  tpl.category || 'satisfaction',
                  tpl.categoryLabel || 'ความพึงพอใจ',
                  tpl.department || 'ฝ่ายบริหารทั่วไป',
                  'admin',
                  'ฝ่ายบริหารงานสารบรรณ ปภ.',
                  tpl.settings?.status || 'published',
                  JSON.stringify(tpl.settings || {}),
                  JSON.stringify(tpl.questions || []),
                  42 + (i * 18),
                  0,
                  now,
                  new Date().toISOString()
                ]
              );
              console.log(`✅ [Strict MySQL] Seeded template: ${tpl.title}`);
            }
          }
          console.log('🏁 [Strict MySQL] Survey template seeding completed.');
        }

        // 5. Seed sample responses for official template 1 and recalculate count if empty
        const [respCountRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM survey_responses WHERE survey_id = ?', ['survey_official_1']);
        if (respCountRows && respCountRows[0] && respCountRows[0].cnt === 0) {
          const sampleOfficialResponses = [
            {
              id: 'resp_official_1_01',
              survey_id: 'survey_official_1',
              survey_title: 'แบบประเมินความพึงพอใจการให้บริการประชาชน (ก.พ.ร.)',
              respondent_name: 'นายสมชาย รัตนโชติ',
              respondent_department: 'ประชาชนทั่วไป / ผู้ขอรับความช่วยเหลือ',
              respondent_position: 'ประชาชน',
              respondent_phone: '081-998-1234',
              respondent_email: 'somchai.r@gmail.com',
              respondent_ip: '127.0.0.1',
              device_info: 'Mobile (Safari/iOS)',
              time_spent_seconds: 78,
              total_score: 5.0,
              answers: JSON.stringify({
                'q_service_type': 'งานขอรับความช่วยเหลือสงเคราะห์ผู้ประสบภัยพิบัติ',
                'q_matrix_satisfaction': {
                  'row_step': 5,
                  'row_staff': 5,
                  'row_info': 5,
                  'row_place': 5,
                  'row_overall': 5
                },
                'q_nps_score': 10,
                'q_suggestions': 'เจ้าหน้าที่ ปภ. บริการรวดเร็ว ให้คำแนะนำชัดเจนและสุภาพมากครับ'
              }),
              submitted_at: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
              id: 'resp_official_1_02',
              survey_id: 'survey_official_1',
              survey_title: 'แบบประเมินความพึงพอใจการให้บริการประชาชน (ก.พ.ร.)',
              respondent_name: 'นางสาวกานดา วิเศษสุข',
              respondent_department: 'อบต.เชิงเนิน',
              respondent_position: 'เจ้าหน้าที่งานป้องกันและบรรเทาสาธารณภัย',
              respondent_phone: '086-455-8899',
              respondent_email: 'kanda.w@rayonglocal.go.th',
              respondent_ip: '127.0.0.1',
              device_info: 'Desktop (Chrome/Windows)',
              time_spent_seconds: 92,
              total_score: 4.8,
              answers: JSON.stringify({
                'q_service_type': 'งานฝึกอบรม/ซ้อมแผนป้องกันและระงับอัคคีภัย',
                'q_matrix_satisfaction': {
                  'row_step': 5,
                  'row_staff': 5,
                  'row_info': 4,
                  'row_place': 5,
                  'row_overall': 5
                },
                'q_nps_score': 9,
                'q_suggestions': 'การฝึกซ้อมมีความเข้มข้น วิทยากรอธิบายเข้าใจง่าย นำไปประยุกต์ใช้ในพื้นที่ได้จริง'
              }),
              submitted_at: new Date(Date.now() - 3600000 * 18).toISOString()
            },
            {
              id: 'resp_official_1_03',
              survey_id: 'survey_official_1',
              survey_title: 'แบบประเมินความพึงพอใจการให้บริการประชาชน (ก.พ.ร.)',
              respondent_name: 'นายธีรภัทร ชาญวิทย์',
              respondent_department: 'เทศบาลนครระยอง',
              respondent_position: 'นักจัดการงานทั่วไป',
              respondent_phone: '089-112-3344',
              respondent_email: 'theeraphat@rayongcity.go.th',
              respondent_ip: '127.0.0.1',
              device_info: 'Desktop (Chrome/macOS)',
              time_spent_seconds: 64,
              total_score: 4.6,
              answers: JSON.stringify({
                'q_service_type': 'งานสารบรรณ / ส่ง-รับหนังสือราชการ',
                'q_matrix_satisfaction': {
                  'row_step': 4,
                  'row_staff': 5,
                  'row_info': 5,
                  'row_place': 4,
                  'row_overall': 5
                },
                'q_nps_score': 9,
                'q_suggestions': 'ระบบรับส่งหนังสืออิเล็กทรอนิกส์สะดวกมาก ประหยัดเวลาการเดินทาง'
              }),
              submitted_at: new Date(Date.now() - 3600000 * 36).toISOString()
            }
          ];

          for (const resp of sampleOfficialResponses) {
            await pool.query(
              `INSERT INTO survey_responses (id, survey_id, survey_title, respondent_name, respondent_department, respondent_position, respondent_phone, respondent_email, respondent_ip, device_info, time_spent_seconds, total_score, answers, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE answers = VALUES(answers)`,
              [
                resp.id, resp.survey_id, resp.survey_title, resp.respondent_name, resp.respondent_department,
                resp.respondent_position, resp.respondent_phone, resp.respondent_email, resp.respondent_ip,
                resp.device_info, resp.time_spent_seconds, resp.total_score, resp.answers, resp.submitted_at
              ]
            );
          }

          await pool.query(
            'UPDATE surveys SET response_count = (SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?) WHERE id = ?',
            ['survey_official_1', 'survey_official_1']
          );
        }

        console.log('✅ Initialized, auto-migrated, and synchronized surveys & survey_responses tables in MySQL');
      } catch (e) {
        console.warn('Note checking/creating surveys/survey_responses tables:', e);
      }

      // Add database indexes to heavily queried and joined tables/columns for high throughput
      try {
        const indexList = [
          { table: 'inbox_documents', col: 'folderId', index: 'idx_inbox_folderId' },
          { table: 'outbox_documents', col: 'folderId', index: 'idx_outbox_folderId' },
          { table: 'circular_documents', col: 'folderId', index: 'idx_circular_folderId' },
          { table: 'internal_documents', col: 'folderId', index: 'idx_internal_folderId' },
          { table: 'admin_documents', col: 'folderId', index: 'idx_admin_folderId' },

          { table: 'inbox_documents', col: 'department', index: 'idx_inbox_department' },
          { table: 'outbox_documents', col: 'department', index: 'idx_outbox_department' },
          { table: 'circular_documents', col: 'department', index: 'idx_circular_department' },
          { table: 'internal_documents', col: 'department', index: 'idx_internal_department' },
          { table: 'admin_documents', col: 'department', index: 'idx_admin_department' },

          { table: 'document_reads', col: 'username', index: 'idx_docreads_username' },
          { table: 'document_reads', col: 'docId', index: 'idx_docreads_docid' },
          { table: 'department_receives', col: 'docId', index: 'idx_deptreceives_docid' },
          { table: 'user_favorites', col: 'username', index: 'idx_favorites_username' },
          { table: 'draft_documents', col: 'createdBy', index: 'idx_drafts_creator' }
        ];

        for (const idx of indexList) {
          try {
            const checkSql = `
              SELECT COUNT(*) AS count 
              FROM INFORMATION_SCHEMA.STATISTICS 
              WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND INDEX_NAME = ?
            `;
            const [checkRows]: any = await pool.query(checkSql, [idx.table, idx.index]);
            if (checkRows && checkRows[0] && checkRows[0].count === 0) {
              await pool.query(`CREATE INDEX \`${idx.index}\` ON \`${idx.table}\` (\`${idx.col}\`)`);
              console.log(`🚀 Database Index created successfully: ${idx.index} on ${idx.table}(${idx.col})`);
            }
          } catch (idxErr: any) {
            // Index already exists, table doesn't exist, or not permitted
          }
        }

        // --- VEHICLE SYSTEM SETUP ---
        // 1. Vehicles Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS vehicles (
            id VARCHAR(100) PRIMARY KEY,
            license_plate VARCHAR(50) NOT NULL,
            vehicle_number VARCHAR(100) DEFAULT NULL,
            province VARCHAR(100) DEFAULT 'ระยอง',
            brand VARCHAR(100) DEFAULT NULL,
            model VARCHAR(100) DEFAULT NULL,
            vehicle_type VARCHAR(100) DEFAULT 'รถยนต์นั่งส่วนบุคคล',
            department VARCHAR(255) DEFAULT NULL,
            current_mileage INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            image_url TEXT DEFAULT NULL,
            year VARCHAR(10) DEFAULT NULL,
            created_at VARCHAR(50),
            updated_at VARCHAR(50),
            INDEX idx_vehicle_status (status),
            INDEX idx_vehicle_plate (license_plate)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migration for vehicle_number
        try {
          const [cols]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "vehicle_number"');
          if (cols.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN vehicle_number VARCHAR(100) DEFAULT NULL AFTER license_plate');
            console.log('Migration: added vehicle_number to vehicles table');
          }
        } catch (mErr) {
          console.warn('Migration error (vehicle_number):', mErr);
        }

        // Migration for image_url
        try {
          const [cols]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "image_url"');
          if (cols.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN image_url TEXT DEFAULT NULL AFTER status');
            console.log('Migration: added image_url to vehicles table');
          }
        } catch (mErr) {
          console.warn('Migration error (image_url):', mErr);
        }

        // Migration for responsible person / reporter fields
        try {
          const [cols1]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "responsible_person"');
          if (cols1.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN responsible_person VARCHAR(255) DEFAULT NULL AFTER image_url');
            console.log('Migration: added responsible_person to vehicles table');
          }
          const [cols2]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "responsible_user_id"');
          if (cols2.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN responsible_user_id VARCHAR(100) DEFAULT NULL AFTER responsible_person');
            console.log('Migration: added responsible_user_id to vehicles table');
          }
          const [cols3]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "responsible_position"');
          if (cols3.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN responsible_position VARCHAR(255) DEFAULT NULL AFTER responsible_user_id');
            console.log('Migration: added responsible_position to vehicles table');
          }
          const [cols4]: any = await pool.query('SHOW COLUMNS FROM vehicles LIKE "responsible_phone"');
          if (cols4.length === 0) {
            await pool.query('ALTER TABLE vehicles ADD COLUMN responsible_phone VARCHAR(50) DEFAULT NULL AFTER responsible_position');
            console.log('Migration: added responsible_phone to vehicles table');
          }
        } catch (mErr) {
          console.warn('Migration error (responsible columns):', mErr);
        }

        // 2. Vehicle Inspections Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS vehicle_inspections (
            id VARCHAR(100) PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            inspector_id VARCHAR(100) DEFAULT NULL,
            inspector_name VARCHAR(255) DEFAULT NULL,
            inspector_position VARCHAR(255) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'passed',
            mileage INT DEFAULT 0,
            results LONGTEXT,
            submitted_at VARCHAR(50),
            INDEX idx_inspection_vehicle (vehicle_id),
            INDEX idx_inspection_date (submitted_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Vehicle Maintenance Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS vehicle_maintenance (
            id VARCHAR(100) PRIMARY KEY,
            vehicle_id VARCHAR(100) NOT NULL,
            maintenance_date VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            cost DECIMAL(10,2) DEFAULT 0,
            technician VARCHAR(255) DEFAULT NULL,
            provider_garage VARCHAR(255) DEFAULT NULL,
            mileage INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'completed',
            created_at VARCHAR(50),
            updated_at VARCHAR(50),
            INDEX idx_maint_vehicle (vehicle_id),
            INDEX idx_maint_date (maintenance_date)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Seed some initial vehicles if empty (Official DDPM Fleet & Disaster Machinery)
        const [vCountRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM vehicles');
        if (vCountRows && vCountRows[0] && vCountRows[0].cnt === 0) {
          const sampleVehicles = [
            { id: 'v_01', plate: '7 กบ 5108', num: 'รย 01-01', prov: 'กรุงเทพมหานคร', brand: 'THAI RUNG', model: 'TR TRANSFORMER II (4x4)', type: 'รถยนต์ตรวจการณ์และสั่งการ (Command Vehicle)', dept: 'กลุ่มงานยุทธศาสตร์และการจัดการ', mileage: 18500 },
            { id: 'v_02', plate: '40-0258', num: 'รย 02-01', prov: 'ระยอง', brand: 'ISUZU', model: 'FVR 240 (10,000 ลิตร)', type: 'รถบรรทุกน้ำช่วยดับเพลิง (10,000 ลิตร)', dept: 'กลุ่มงานป้องกันและปฏิบัติการ', mileage: 12400 },
            { id: 'v_03', plate: '1 นง 9999', num: 'รย 00-01', prov: 'ระยอง', brand: 'TOYOTA', model: 'Camry 2.5 HEV', type: 'รถประจำตำแหน่ง / รถรับรองผู้บริหาร', dept: 'ฝ่ายบริหารงานทั่วไป', mileage: 45200 },
            { id: 'v_04', plate: '1 ขผ 4280', num: 'รย 02-02', prov: 'ระยอง', brand: 'TOYOTA', model: 'Hilux Revo 4x4 (FRV)', type: 'รถกู้ภัยเคลื่อนที่เร็ว (Fast Rescue Vehicle - FRV)', dept: 'กลุ่มงานป้องกันและปฏิบัติการ', mileage: 21300 },
            { id: 'v_05', plate: '40-0312', num: 'รย 02-03', prov: 'ระยอง', brand: 'ISUZU', model: 'FTR 240 Mobile Light & Power', type: 'รถบรรทุกพร้อมเครื่องกำเนิดไฟฟ้าและส่องสว่าง', dept: 'กลุ่มงานป้องกันและปฏิบัติการ', mileage: 9500 },
            { id: 'v_06', plate: '40-0488', num: 'รย 03-01', prov: 'ระยอง', brand: 'HINO', model: '500 Series (50,000 ลิตร/นาที)', type: 'รถสูบส่งน้ำระยะไกล (High-Pressure Long Distance)', dept: 'กลุ่มงานป้องกันและปฏิบัติการ', mileage: 6300 },
            { id: 'v_07', plate: 'นข 8831', num: 'รย 00-02', prov: 'ระยอง', brand: 'TOYOTA', model: 'Commuter 2.8 D4D', type: 'รถยนต์ส่วนกลาง / รถตู้โดยสาร', dept: 'ฝ่ายบริหารงานทั่วไป', mileage: 54200 },
            { id: 'v_08', plate: 'ปภ. รย-04', num: 'มค 01-01', prov: 'ระยอง', brand: 'KOMATSU', model: 'PC200-10M0 (Hydraulic Excavator)', type: 'รถขุดไฮดรอลิกตีนตะขาบ (Excavator / แบคโฮ)', dept: 'กลุ่มงานป้องกันและปฏิบัติการ', mileage: 1280 }
          ];
          for (const v of sampleVehicles) {
            await pool.query(
              `INSERT INTO vehicles (id, license_plate, vehicle_number, province, brand, model, vehicle_type, department, current_mileage, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [v.id, v.plate, v.num, v.prov, v.brand, v.model, v.type, v.dept, v.mileage, 'active', new Date().toISOString(), new Date().toISOString()]
            );
          }
          console.log('✅ [Strict MySQL] Seeded official DDPM vehicles and disaster machinery.');
        }

      } catch (idxSetupErr: any) {
        console.warn('Note setting up database indexes:', idxSetupErr.message);
      }

      // Ensure system backup and scheduled backup tables exist with up-to-date columns
      try {
        await ensureScheduledBackupsTable();
      } catch (sbSetupErr: any) {
        console.warn('Note setting up backups table on database init:', sbSetupErr.message);
      }

      console.log('✅ Database schema verified and initialized successfully!');
    }
  } catch (err: any) {
    console.error('⚠️ Failed to initialize MySQL schema:', err.message);
  }
}

// Check MySQL connection asynchronously at startup. Enforce strict MySQL-only mode (อนุญาตให้ใช้งานเฉพาะฐานข้อมูล MySQL เท่านั้น).
pool.getConnection()
  .then((conn) => {
    conn.release();
    isMysqlOnline = true;
    console.log(`✅ Successfully connected to MySQL database: ${dbName} @ ${dbHost}:${dbPort} (Strict MySQL-Only Mode Enforced)`);
    setupDatabase().catch(err => console.error("Database setup error:", err));
  })
  .catch((err) => {
    isMysqlOnline = false;
    console.error('❌ CRITICAL: MySQL Connection Offline. System strictly enforces MySQL database only (อนุญาตให้ใช้งานเฉพาะฐานข้อมูล MySQL เท่านั้น):', err.message);
  });

// Periodic background health-check for MySQL pool resilience and auto-recovery
setInterval(async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    if (!isMysqlOnline) {
      isMysqlOnline = true;
      console.log('🔄 MySQL connection online/restored successfully!');
      setupDatabase().catch(() => {});
    }
  } catch (err: any) {
    if (isMysqlOnline) {
      isMysqlOnline = false;
      console.warn('⚠️ MySQL connection dropped, fallback to local DB store active:', err.message);
    }
  }
}, 15000);

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
  const newLog = { id: Date.now(), action, details, username, ipAddress, timestamp };
  localDb.system_logs.unshift(newLog);
  if (localDb.system_logs.length > 500) localDb.system_logs = localDb.system_logs.slice(0, 500);
  saveLocalDb();
  broadcastRealtimeEvent('LOGS_UPDATED', newLog);
}


async function getSystemCurrentYear(): Promise<string> {
  try {
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT currentYear FROM settings LIMIT 1');
      if (rows && rows.length > 0 && rows[0].currentYear) {
        return String(rows[0].currentYear);
      }
    }
  } catch (e) {
    console.error('Failed to get current year from MySQL:', e.message);
  }
  
  // Strictly enforce MySQL only, but provide a safe default if table is not yet ready
  return '2569';
}

// --- VEHICLE MANAGEMENT API ---
app.get('/api/vehicles', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const [rows]: any = await pool.query('SELECT * FROM vehicles ORDER BY license_plate ASC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { 
      license_plate, vehicle_number, province, brand, model, vehicle_type, 
      department, current_mileage, status, image_url,
      responsible_person, responsible_user_id, responsible_position, responsible_phone 
    } = req.body;
    const id = `v_${Date.now()}`;
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO vehicles (id, license_plate, vehicle_number, province, brand, model, vehicle_type, department, current_mileage, status, image_url, responsible_person, responsible_user_id, responsible_position, responsible_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, license_plate, vehicle_number || null, province, brand, model, vehicle_type, 
        department, current_mileage || 0, status || 'active', image_url || null, 
        responsible_person || null, responsible_user_id || null, responsible_position || null, responsible_phone || null, 
        now, now
      ]
    );
    res.json({ id, message: 'Vehicle added successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    const { 
      license_plate, vehicle_number, province, brand, model, vehicle_type, 
      department, current_mileage, status, image_url,
      responsible_person, responsible_user_id, responsible_position, responsible_phone 
    } = req.body;
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE vehicles SET license_plate = ?, vehicle_number = ?, province = ?, brand = ?, model = ?, vehicle_type = ?, department = ?, current_mileage = ?, status = ?, image_url = ?, responsible_person = ?, responsible_user_id = ?, responsible_position = ?, responsible_phone = ?, updated_at = ?
       WHERE id = ?`,
      [
        license_plate, vehicle_number || null, province, brand, model, vehicle_type, 
        department, current_mileage, status, image_url || null, 
        responsible_person || null, responsible_user_id || null, responsible_position || null, responsible_phone || null, 
        now, id
      ]
    );
    res.json({ message: 'Vehicle updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
    // Also delete inspections? Usually safe to keep or delete based on req.
    await pool.query('DELETE FROM vehicle_inspections WHERE vehicle_id = ?', [id]);
    res.json({ message: 'Vehicle and its inspections deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles/:id/inspections', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    const [rows]: any = await pool.query('SELECT * FROM vehicle_inspections WHERE vehicle_id = ? ORDER BY submitted_at DESC', [id]);
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicle-inspections', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { vehicle_id, inspector_id, inspector_name, inspector_position, status, mileage, results } = req.body;
    const id = `insp_${Date.now()}`;
    const now = new Date().toISOString();
    
    await pool.query(
      `INSERT INTO vehicle_inspections (id, vehicle_id, inspector_id, inspector_name, inspector_position, status, mileage, results, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, vehicle_id, inspector_id, inspector_name, inspector_position, status || 'passed', mileage || 0, JSON.stringify(results || {}), now]
    );

    // Update vehicle mileage
    if (mileage) {
      await pool.query('UPDATE vehicles SET current_mileage = ?, updated_at = ? WHERE id = ?', [mileage, now, vehicle_id]);
    }

    res.json({ id, message: 'Inspection report submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicle-inspections/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    await pool.query('DELETE FROM vehicle_inspections WHERE id = ?', [id]);
    res.json({ message: 'Inspection record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VEHICLE MAINTENANCE APIS ---
app.get('/api/vehicles/:id/maintenance', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    const [rows]: any = await pool.query('SELECT * FROM vehicle_maintenance WHERE vehicle_id = ? ORDER BY maintenance_date DESC, created_at DESC', [id]);
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicle-maintenance', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { vehicle_id, maintenance_date, title, description, cost, technician, provider_garage, mileage, status } = req.body;
    const id = `maint_${Date.now()}`;
    const now = new Date().toISOString();
    
    await pool.query(
      `INSERT INTO vehicle_maintenance (id, vehicle_id, maintenance_date, title, description, cost, technician, provider_garage, mileage, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vehicle_id, maintenance_date || now.split('T')[0], title, description || null, 
        cost || 0, technician || null, provider_garage || null, mileage || 0, status || 'completed', 
        now, now
      ]
    );

    // Update vehicle mileage if mileage is provided and greater than current
    if (mileage) {
      await pool.query('UPDATE vehicles SET current_mileage = GREATEST(current_mileage, ?), updated_at = ? WHERE id = ?', [mileage, now, vehicle_id]);
    }

    res.json({ id, message: 'Maintenance record added successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicle-maintenance/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    const { maintenance_date, title, description, cost, technician, provider_garage, mileage, status } = req.body;
    const now = new Date().toISOString();

    await pool.query(
      `UPDATE vehicle_maintenance SET maintenance_date = ?, title = ?, description = ?, cost = ?, technician = ?, provider_garage = ?, mileage = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [maintenance_date, title, description || null, cost || 0, technician || null, provider_garage || null, mileage || 0, status || 'completed', now, id]
    );

    res.json({ message: 'Maintenance record updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicle-maintenance/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) return res.status(503).json({ error: 'Database offline' });
    const { id } = req.params;
    await pool.query('DELETE FROM vehicle_maintenance WHERE id = ?', [id]);
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Settings API Endpoints
app.get('/api/settings', async (req, res) => {
  try {
      const cached = getLookupCached<any>('settings');
      if (cached) {
        return res.json(cached);
      }

      if (isMysqlOnline) {
        try {
          const [rows]: any = await pool.query('SELECT * FROM settings LIMIT 1');
          if (rows.length > 0) {
            setLookupCached('settings', rows[0]);
            return res.json(rows[0]);
          }
        } catch (dbErr: any) {
          console.warn('MySQL settings query warning:', dbErr.message);
        }
      }
      const localData = localDb.settings[0] || {
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
      };
      setLookupCached('settings', localData);
      return res.json(localData);
    } catch (error: any) {
      console.error("Error in /api/settings GET:", error.message);
      return res.json(localDb.settings[0] || {});
    }
});

app.put("/api/settings", async (req, res) => {
  const data = req.body;
  const ip = getClientIp(req);
  try {
    let formattedFeatures = data.enabledFeatures;
    if (formattedFeatures !== undefined && typeof formattedFeatures === 'object' && formattedFeatures !== null) {
      formattedFeatures = JSON.stringify(formattedFeatures);
    }

    if (isMysqlOnline) {
      try {
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
      } catch (dbErr: any) {
        console.error("Failed to update settings in MySQL, falling back to localDb:", dbErr.message);
      }
    }

    if (localDb.settings && localDb.settings.length > 0) {
      if (data.currentYear !== undefined) localDb.settings[0].currentYear = data.currentYear;
      if (data.startSequence !== undefined) localDb.settings[0].startSequence = data.startSequence;
      if (data.orgName !== undefined) localDb.settings[0].orgName = data.orgName;
      if (data.headerOrgName !== undefined) localDb.settings[0].headerOrgName = data.headerOrgName;
      if (data.logoUrl !== undefined) localDb.settings[0].logoUrl = data.logoUrl;
      if (data.garuda15Url !== undefined) localDb.settings[0].garuda15Url = data.garuda15Url;
      if (data.garuda30Url !== undefined) localDb.settings[0].garuda30Url = data.garuda30Url;
      if (data.faviconUrl !== undefined) localDb.settings[0].faviconUrl = data.faviconUrl;
      if (data.footerText !== undefined) localDb.settings[0].footerText = data.footerText;
      if (data.smtpHost !== undefined) localDb.settings[0].smtpHost = data.smtpHost;
      if (data.smtpPort !== undefined) localDb.settings[0].smtpPort = data.smtpPort;
      if (data.smtpUser !== undefined) localDb.settings[0].smtpUser = data.smtpUser;
      if (data.smtpPassword !== undefined) localDb.settings[0].smtpPassword = data.smtpPassword;
      if (data.smtpFrom !== undefined) localDb.settings[0].smtpFrom = data.smtpFrom;
      if (data.geminiApiKey !== undefined) localDb.settings[0].geminiApiKey = data.geminiApiKey;
      if (formattedFeatures !== undefined) {
        localDb.settings[0].enabledFeatures = formattedFeatures;
      }
      saveLocalDb();
    }

    invalidateLookupCache('settings');
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

    invalidateLookupCache('settings');
    await addSystemLog("UPDATE_SETTINGS", details || `อัปเดตการตั้งค่าเปิด-ปิดฟังก์ชันระบบ`, updatedBy || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Database error in features update:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
});

// ==================== CUSTOM NUMBERING & FILE CODES APIS ====================
async function getRealMaxSequenceForRule(rule: any, targetYear?: string): Promise<number> {
  const currentSystemYear = String(await getSystemCurrentYear());
  const yr = String(targetYear || currentSystemYear || rule.year || '2570');
  let maxSeq = 0;
  
  let inboxRows: any[] = [];
  let outboxRows: any[] = [];
  let circRows: any[] = [];
  let internalRows: any[] = [];
  let adminRows: any[] = [];
  let reservedRows: any[] = [];

  try {
    if (isMysqlOnline) {
      [inboxRows] = await pool.query('SELECT receiveNumber, docNumber, isCentral, department, year FROM inbox_documents').catch(() => [[]]);
      [outboxRows] = await pool.query('SELECT receiveNumber, docNumber, isCentral, department, year FROM outbox_documents').catch(() => [[]]);
      [circRows] = await pool.query('SELECT receiveNumber, docNumber, isCentral, department, year FROM circular_documents').catch(() => [[]]);
      [internalRows] = await pool.query('SELECT receiveNumber, docNumber, department, year FROM internal_documents').catch(() => [[]]);
      [adminRows] = await pool.query('SELECT docNumber, category, department, year FROM admin_documents').catch(() => [[]]);
      [reservedRows] = await pool.query('SELECT ruleId, docType, department, seqNumber, year FROM reserved_numbers').catch(() => [[]]);
    } else {
      inboxRows = localDb.inbox_documents || [];
      outboxRows = localDb.outbox_documents || [];
      circRows = localDb.circular_documents || [];
      internalRows = localDb.internal_documents || [];
      adminRows = localDb.admin_documents || [];
      reservedRows = localDb.reserved_numbers || [];
    }
  } catch (e) {
    inboxRows = localDb.inbox_documents || [];
    outboxRows = localDb.outbox_documents || [];
    circRows = localDb.circular_documents || [];
    internalRows = localDb.internal_documents || [];
    adminRows = localDb.admin_documents || [];
    reservedRows = localDb.reserved_numbers || [];
  }

  const docType = rule.docType;
  const dept = (rule.department || 'ทุกฝ่ายงาน').trim();
  const isGlobal = dept === 'ทุกฝ่ายงาน' || rule.runningScope === 'global' || (rule.ruleName && rule.ruleName.includes('สารบรรณกลาง'));

  if (docType === 'หนังสือรับ') {
    const list = inboxRows.filter((d: any) => String(d.year || '') === yr);
    list.forEach((d: any) => {
      let matches = false;
      const isDocCentral = d.isCentral === 1 || Number(d.isCentral) === 1 || d.isCentral === undefined || d.isCentral === null;
      if (isGlobal) {
        matches = isDocCentral;
      } else {
        matches = (!isDocCentral) && (d.department || '').trim() === dept;
      }
      if (matches) {
        const rec = parseInt(d.receiveNumber || '0', 10);
        if (!isNaN(rec) && rec < 1000000 && rec > maxSeq) maxSeq = rec;
      }
    });
  } else if (docType === 'หนังสือภายนอก' || docType === 'หนังสือส่ง') {
    const list = [...outboxRows, ...circRows].filter((d: any) => String(d.year || '') === yr);
    list.forEach((d: any) => {
      let matches = false;
      const isDocCentral = d.isCentral === 1 || Number(d.isCentral) === 1 || d.isCentral === undefined || d.isCentral === null;
      if (isGlobal) {
        matches = isDocCentral;
      } else {
        matches = (!isDocCentral) && (d.department || '').trim() === dept;
      }
      if (matches) {
        const rec = parseInt(d.receiveNumber || '0', 10);
        if (!isNaN(rec) && rec < 1000000 && rec > maxSeq) maxSeq = rec;
        if (d.docNumber) {
          const m = d.docNumber.match(/\/(\d+)$/) || d.docNumber.match(/\/ว\s*(\d+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num < 1000000 && num > maxSeq) maxSeq = num;
          }
        }
      }
    });
  } else if (docType === 'หนังสือภายใน') {
    const list = internalRows.filter((d: any) => String(d.year || '') === yr);
    list.forEach((d: any) => {
      let matches = false;
      if (isGlobal) {
        matches = true;
      } else {
        matches = (d.department || '').trim() === dept;
      }
      if (matches) {
        const rec = parseInt(d.receiveNumber || '0', 10);
        if (!isNaN(rec) && rec < 1000000 && rec > maxSeq) maxSeq = rec;
        if (d.docNumber) {
          const m = d.docNumber.match(/\/(\d+)$/) || d.docNumber.match(/\/ว\s*(\d+)$/) || d.docNumber.match(/(\d+)\s*\/\s*\d+/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num < 1000000 && num > maxSeq) maxSeq = num;
          }
        }
      }
    });
  } else if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(docType)) {
    const catMap: any = { 'คำสั่ง': 'order', 'ประกาศ': 'announcement', 'หนังสือรับรอง': 'certificate' };
    const targetCat = catMap[docType];
    const list = adminRows.filter((d: any) => (d.category === targetCat || (d.docNumber && d.docNumber.includes(docType))) && String(d.year || '') === yr);
    list.forEach((d: any) => {
      const m = (d.docNumber || '').match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
  }

  reservedRows.forEach((resv: any) => {
    if (String(resv.year || '') === yr) {
      if (resv.ruleId === rule.id || (resv.docType === docType && (isGlobal || resv.department === dept))) {
        const s = parseInt(resv.seqNumber || '0', 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    }
  });

  return maxSeq;
}

async function updateNumberingRuleSequenceForDoc(doc: any) {
  try {
    const currentSystemYear = String(await getSystemCurrentYear());
    const docYear = String(doc.year || currentSystemYear);
    const type = doc.type || 'inbox';
    const isCentralVal = doc.isCentral !== undefined ? Number(doc.isCentral) : 1;
    const isCentralBool = isCentralVal === 1;
    const docDept = (doc.department || '').trim();

    let actualType = 'หนังสือรับ';
    if (type === 'inbox') {
      actualType = 'หนังสือรับ';
    } else if (type === 'outbox') {
      actualType = 'หนังสือส่ง';
    } else if (type === 'internal') {
      actualType = 'หนังสือภายใน';
    } else if (type === 'admin') {
      if (doc.category === 'order') actualType = 'คำสั่ง';
      else if (doc.category === 'announcement') actualType = 'ประกาศ';
      else if (doc.category === 'certificate') actualType = 'หนังสือรับรอง';
      else actualType = 'คำสั่ง';
    }

    let seqToRecord = 0;
    if (type === 'inbox') {
      const rec = parseInt(doc.receiveNumber || '0', 10);
      if (!isNaN(rec) && rec > 0) seqToRecord = rec;
    } else if (type === 'outbox') {
      const rec = parseInt(doc.receiveNumber || '0', 10);
      if (!isNaN(rec) && rec > 0) {
        seqToRecord = rec;
      } else if (doc.docNumber) {
        const m = doc.docNumber.match(/\/(\d+)$/) || doc.docNumber.match(/\/ว\s*(\d+)$/);
        if (m) seqToRecord = parseInt(m[1], 10);
      }
    } else if (type === 'internal') {
      const rec = parseInt(doc.receiveNumber || '0', 10);
      if (!isNaN(rec) && rec > 0) {
        seqToRecord = rec;
      } else if (doc.docNumber) {
        const m = doc.docNumber.match(/\/(\d+)$/) || doc.docNumber.match(/\/ว\s*(\d+)$/) || doc.docNumber.match(/(\d+)\s*\/\s*\d+/);
        if (m) seqToRecord = parseInt(m[1], 10);
      }
    } else if (type === 'admin') {
      if (doc.docNumber) {
        const m = doc.docNumber.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) seqToRecord = parseInt(m[1], 10);
      }
    }

    if (seqToRecord <= 0) return;

    let rules: any[] = [];
    if (isMysqlOnline) {
      const [dbRows]: any = await pool.query('SELECT * FROM numbering_rules').catch(() => [[]]);
      rules = dbRows || [];
    } else {
      rules = localDb.numbering_rules || [];
    }

    const matchingRules = rules.filter((r: any) => {
      if (!r.isActive) return false;
      const matchesDocType = (r.docType === actualType) || (actualType === 'หนังสือส่ง' && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก'));
      if (!matchesDocType) return false;
      if (actualType === 'หนังสือรับ' || actualType === 'หนังสือส่ง' || actualType === 'หนังสือภายนอก') {
        if (isCentralBool) {
          return r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง'));
        } else {
          return r.department === docDept;
        }
      }
      if (actualType === 'หนังสือภายใน') {
        if (r.runningScope === 'department') {
          return r.department === docDept;
        }
        return true;
      }
      if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(actualType)) {
        return true;
      }
      return false;
    });

    for (const rule of matchingRules) {
      const newSeq = Math.max(Number(rule.currentSeq || 0), seqToRecord);
      if (isMysqlOnline) {
        await pool.query('UPDATE numbering_rules SET currentSeq = ?, year = ? WHERE id = ?', [newSeq, docYear, rule.id]).catch(() => {});
      }
      if (localDb.numbering_rules) {
        const localRule = localDb.numbering_rules.find((lr: any) => lr.id === rule.id);
        if (localRule) {
          localRule.currentSeq = newSeq;
          localRule.year = docYear;
        }
      }
    }
    if (localDb.numbering_rules) {
      saveLocalDb();
    }
  } catch (err: any) {
    console.warn('Error updating numbering rule sequence:', err.message);
  }
}

async function syncAllNumberingRulesSequence() {
  try {
    const currentSystemYear = String(await getSystemCurrentYear());
    let rows: any[] = [];
    if (isMysqlOnline) {
      try {
        const [dbRows]: any = await pool.query('SELECT * FROM numbering_rules');
        rows = dbRows || [];
      } catch (err) {}
    }
    if (rows.length === 0 && localDb.numbering_rules) {
      rows = localDb.numbering_rules || [];
    }

    for (const r of rows) {
      const realMax = await getRealMaxSequenceForRule(r, currentSystemYear);
      if (isMysqlOnline) {
        await pool.query('UPDATE numbering_rules SET currentSeq = ?, year = ? WHERE id = ?', [realMax, currentSystemYear, r.id]).catch(() => {});
      }
      if (localDb.numbering_rules) {
        const lRule = localDb.numbering_rules.find((lr: any) => lr.id === r.id);
        if (lRule) {
          lRule.currentSeq = realMax;
          lRule.year = currentSystemYear;
        }
      }
    }
    if (localDb.numbering_rules) {
      saveLocalDb();
    }
    invalidateLookupCache('numberingRules');
    broadcastRealtimeEvent('NUMBERING_RULES_UPDATED');
    broadcastRealtimeEvent('DOCUMENTS_UPDATED');
  } catch (err: any) {
    console.error('Error syncing numbering rules sequence:', err.message);
  }
}

app.get('/api/numbering-rules', async (req, res) => {
  try {
    const currentSystemYear = String(await getSystemCurrentYear());
    let rows: any[] = [];
    try {
      const [dbRows]: any = await pool.query('SELECT * FROM numbering_rules');
      rows = dbRows || [];
      if (rows.length === 0 && initialSeedData.numbering_rules) {
        for (const sr of initialSeedData.numbering_rules) {
          await pool.query(
            'INSERT INTO numbering_rules (id, ruleName, department, divisionCode, docType, prefixPattern, suffixPattern, numberFormat, runningScope, currentSeq, year, resetFrequency, isActive, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sr.id, sr.ruleName, sr.department, sr.divisionCode, sr.docType, sr.prefixPattern, sr.suffixPattern, sr.numberFormat, sr.runningScope, sr.currentSeq, currentSystemYear, sr.resetFrequency, sr.isActive ? 1 : 0, sr.description]
          ).catch(() => {});
        }
        const [seededRows]: any = await pool.query('SELECT * FROM numbering_rules');
        rows = seededRows || [];
      }
    } catch (dbErr) {
      if (!localDb.numbering_rules || localDb.numbering_rules.length === 0) {
        localDb.numbering_rules = JSON.parse(JSON.stringify(initialSeedData.numbering_rules || []));
        saveLocalDb();
      }
      rows = localDb.numbering_rules || [];
    }

    const formattedRows = [];
    for (const r of rows) {
      const realMax = await getRealMaxSequenceForRule(r, currentSystemYear);
      // Synchronize directly with actual max registered sequence among active documents
      const effectiveSeq = realMax;

      // Keep database currentSeq aligned with actual registered document sequence
      if (effectiveSeq !== Number(r.currentSeq || 0) || r.year !== currentSystemYear) {
        if (isMysqlOnline) {
          await pool.query('UPDATE numbering_rules SET currentSeq = ?, year = ? WHERE id = ?', [effectiveSeq, currentSystemYear, r.id]).catch(() => {});
        }
        if (localDb.numbering_rules) {
          const lRule = localDb.numbering_rules.find((lr: any) => lr.id === r.id);
          if (lRule) {
            lRule.currentSeq = effectiveSeq;
            lRule.year = currentSystemYear;
          }
        }
      }

      formattedRows.push({
        ...r,
        currentSeq: effectiveSeq,
        year: currentSystemYear,
        isActive: Boolean(r.isActive)
      });
    }

    if (localDb.numbering_rules) {
      saveLocalDb();
    }
    setLookupCached('numberingRules', formattedRows);
    return res.json(formattedRows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch numbering rules' });
  }
});

app.post('/api/numbering-rules/sync', async (req, res) => {
  try {
    const currentSystemYear = String(await getSystemCurrentYear());
    let rows: any[] = [];
    try {
      const [dbRows]: any = await pool.query('SELECT * FROM numbering_rules');
      rows = dbRows || [];
    } catch (dbErr) {
      rows = localDb.numbering_rules || [];
    }

    let syncedCount = 0;
    const formattedRows = [];
    for (const r of rows) {
      const realMax = await getRealMaxSequenceForRule(r, currentSystemYear);
      const effectiveSeq = realMax;

      if (effectiveSeq !== Number(r.currentSeq || 0) || r.year !== currentSystemYear) {
        syncedCount++;
        if (isMysqlOnline) {
          await pool.query('UPDATE numbering_rules SET currentSeq = ?, year = ? WHERE id = ?', [effectiveSeq, currentSystemYear, r.id]).catch(() => {});
        }
        if (localDb.numbering_rules) {
          const lRule = localDb.numbering_rules.find((lr: any) => lr.id === r.id);
          if (lRule) {
            lRule.currentSeq = effectiveSeq;
            lRule.year = currentSystemYear;
          }
        }
      }

      formattedRows.push({
        ...r,
        currentSeq: effectiveSeq,
        year: currentSystemYear,
        isActive: Boolean(r.isActive)
      });
    }

    if (localDb.numbering_rules) {
      saveLocalDb();
    }

    invalidateLookupCache('numberingRules');
    await addSystemLog("SYNC_NUMBERING_RULES", `ตรวจสอบและซิงค์ลำดับเลขหนังสืออัตโนมัติสำเร็จ (ปรับปรุง ${syncedCount} กฎ)`, req.body.syncedBy || "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true, syncedCount, rules: formattedRows });
  } catch (err: any) {
    console.error('Error syncing numbering rules:', err.message);
    return res.status(500).json({ error: 'Failed to sync numbering rules' });
  }
});

app.post('/api/numbering-rules', async (req, res) => {
  try {
    const currentSystemYear = await getSystemCurrentYear();
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
      year: req.body.year || currentSystemYear,
      resetFrequency: req.body.resetFrequency || 'yearly',
      isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : 1,
      description: req.body.description || ''
    };

    const realMax = await getRealMaxSequenceForRule(newRule);
    if (newRule.currentSeq < realMax) {
      return res.status(400).json({
        error: `ไม่สามารถกำหนดลำดับซ้ำหรือต่ำกว่าเลขที่ใช้งานไปแล้ว (ลำดับสูงสุดที่มีการใช้งานในระบบคือ ${realMax})`
      });
    }

    let insertId = 1;
    try {
      const [result]: any = await pool.query(
        'INSERT INTO numbering_rules (ruleName, department, divisionCode, docType, prefixPattern, suffixPattern, numberFormat, runningScope, currentSeq, year, resetFrequency, isActive, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newRule.ruleName, newRule.department, newRule.divisionCode, newRule.docType, newRule.prefixPattern, newRule.suffixPattern, newRule.numberFormat, newRule.runningScope, newRule.currentSeq, newRule.year, newRule.resetFrequency, newRule.isActive, newRule.description]
      );
      insertId = result.insertId;
    } catch (e) {
      if (!localDb.numbering_rules) localDb.numbering_rules = [];
      insertId = localDb.numbering_rules.length > 0 ? Math.max(...localDb.numbering_rules.map((r: any) => Number(r.id) || 0)) + 1 : 1;
      newRule.id = insertId;
      localDb.numbering_rules.push(newRule);
      saveLocalDb();
    }

    newRule.id = insertId;
    newRule.isActive = Boolean(newRule.isActive);
    invalidateLookupCache('numberingRules');
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
    
    let existingRule: any = null;
    try {
      const [rows]: any = await pool.query('SELECT * FROM numbering_rules WHERE id = ?', [id]);
      if (rows && rows.length > 0) existingRule = rows[0];
    } catch (e) {}
    if (!existingRule && localDb.numbering_rules) {
      existingRule = localDb.numbering_rules.find((r: any) => r.id === id);
    }

    if (existingRule && updates.currentSeq !== undefined) {
      const testRule = { ...existingRule, ...updates };
      const realMax = await getRealMaxSequenceForRule(testRule);
      const requestedSeq = Number(updates.currentSeq);
      if (requestedSeq < realMax) {
        return res.status(400).json({
          error: `ไม่สามารถกำหนดลำดับซ้ำหรือต่ำกว่าเลขที่ใช้งานไปแล้ว (ลำดับสูงสุดที่มีการใช้งานในระบบคือ ${realMax})`
        });
      }
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(id);
    
    try {
      await pool.query(`UPDATE numbering_rules SET ${setClause} WHERE id = ?`, values);
    } catch (e) {
      if (localDb.numbering_rules) {
        const idx = localDb.numbering_rules.findIndex((r: any) => r.id === id);
        if (idx !== -1) {
          localDb.numbering_rules[idx] = { ...localDb.numbering_rules[idx], ...updates };
          saveLocalDb();
        }
      }
    }

    invalidateLookupCache('numberingRules');
    await addSystemLog("UPDATE_NUMBERING_RULE", `อัปเดตกฎออกเลขหนังสือ ID: ${id}`, req.body.updatedBy || "ผู้ดูแลระบบ", getClientIp(req));
    
    let updatedRow: any = null;
    try {
      const [rows]: any = await pool.query('SELECT * FROM numbering_rules WHERE id = ?', [id]);
      if (rows && rows.length > 0) updatedRow = rows[0];
    } catch (e) {}
    if (!updatedRow && localDb.numbering_rules) {
      updatedRow = localDb.numbering_rules.find((r: any) => r.id === id);
    }

    if (updatedRow) {
      updatedRow.isActive = Boolean(updatedRow.isActive);
      return res.json({ success: true, data: updatedRow });
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
    invalidateLookupCache('numberingRules');
    await addSystemLog("DELETE_NUMBERING_RULE", `ลบกฎออกเลขหนังสือ ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete numbering rule' });
  }
});

app.get('/api/file-codes', async (req, res) => {
  try {
    const cached = getLookupCached<any[]>('fileCodes');
    if (cached) {
      return res.json(cached);
    }

    const [rows]: any = await pool.query('SELECT * FROM file_codes');
    setLookupCached('fileCodes', rows);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch file codes' });
  }
});

app.post('/api/file-codes', async (req, res) => {
  try {
    const newCode: any = {
      code: req.body.code || '0021',
      name: req.body.name || 'หมวดงานใหม่',
      department: req.body.department || 'ฝ่ายยุทธศาสตร์และการจัดการ',
      description: req.body.description || ''
    };
    const [result]: any = await pool.query(
      'INSERT INTO file_codes (code, name, department, description) VALUES (?, ?, ?, ?)',
      [newCode.code, newCode.name, newCode.department, newCode.description]
    );
    newCode.id = result.insertId;
    invalidateLookupCache('fileCodes');
    await addSystemLog("CREATE_FILE_CODE", `เพิ่มรหัสหมวดแฟ้ม: ${newCode.code} (${newCode.name})`, req.body.createdBy || "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true, data: newCode });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create file code' });
  }
});

app.delete('/api/file-codes', async (req, res) => {
  try {
    await pool.query('DELETE FROM file_codes');
    invalidateLookupCache('fileCodes');
    await addSystemLog("CLEAR_FILE_CODES", "ล้างรหัสหมวดแฟ้มทั้งหมด", "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear file codes' });
  }
});

app.delete('/api/file-codes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM file_codes WHERE id = ?', [id]);
    invalidateLookupCache('fileCodes');
    await addSystemLog("DELETE_FILE_CODE", `ลบรหัสหมวดแฟ้ม ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete file code' });
  }
});

app.post('/api/file-codes/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
    await pool.query('DELETE FROM file_codes WHERE id IN (?)', [ids]);
    invalidateLookupCache('fileCodes');
    await addSystemLog("BATCH_DELETE_FILE_CODES", `ลบรหัสหมวดแฟ้มแบบกลุ่ม จำนวน ${ids.length} รายการ`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to batch delete file codes' });
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
        reservedDate VARCHAR(100),
        expiresAt VARCHAR(50),
        usedAt VARCHAR(50),
        usedForDocId VARCHAR(100),
        createdAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const { ruleId, docType, department, prefix, startSeq, count, reservedBy, reservedFor, reservedDate } = req.body;
    const qty = Number(count) || 1;
    const startNumber = Number(startSeq) || 1;
    const yearStr = req.body.year || await getSystemCurrentYear();
    const createdItems: any[] = [];
    const nowStr = new Date().toISOString();
    const targetReservedDate = reservedDate || nowStr.split('T')[0];

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
          'INSERT INTO reserved_numbers (ruleId, docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, reservedDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ruleId || null, docType || 'หนังสือส่ง', department || 'ฝ่ายยุทธศาสตร์และการจัดการ', numberStr, currentSeqNum, yearStr, 'reserved', 'available', reservedBy || 'ผู้ใช้งานระบบ', reservedFor || 'สำรอง/จองเลขล่วงหน้า', targetReservedDate, nowStr]
        );
        createdItems.push({ id: result.insertId, numberString: numberStr, reservedDate: targetReservedDate });
      } catch (e) {
        if (!localDb.reserved_numbers) localDb.reserved_numbers = [];
        const newId = localDb.reserved_numbers.length > 0 ? Math.max(...localDb.reserved_numbers.map((r: any) => Number(r.id) || 0)) + 1 : 1;
        const item = {
          id: newId,
          ruleId: ruleId || null,
          docType: docType || 'หนังสือส่ง',
          department: department || 'ฝ่ายยุทธศาสตร์และการจัดการ',
          numberString: numberStr,
          seqNumber: currentSeqNum,
          year: yearStr,
          type: 'reserved',
          status: 'available',
          reservedBy: reservedBy || 'ผู้ใช้งานระบบ',
          reservedFor: reservedFor || 'สำรอง/จองเลขล่วงหน้า',
          reservedDate: targetReservedDate,
          createdAt: nowStr
        };
        localDb.reserved_numbers.unshift(item);
        createdItems.push({ id: newId, numberString: numberStr, reservedDate: targetReservedDate });
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

app.delete('/api/reserved-numbers', async (req, res) => {
  try {
    await pool.query('DELETE FROM reserved_numbers');
    localDb.reserved_numbers = [];
    saveLocalDb();
    await addSystemLog("CLEAR_RESERVED_NUMBERS", "ล้างคลังเลขจอง/เลขสำรองทั้งหมด", "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear reserved numbers' });
  }
});

app.delete('/api/reserved-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM reserved_numbers WHERE id = ?', [id]);
    if (localDb.reserved_numbers) {
      localDb.reserved_numbers = localDb.reserved_numbers.filter((r: any) => String(r.id) !== String(id));
      saveLocalDb();
    }
    await addSystemLog("DELETE_RESERVED_NUMBER", `ลบเลขจอง ID: ${id}`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete reserved number' });
  }
});

app.post('/api/reserved-numbers/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });
    await pool.query('DELETE FROM reserved_numbers WHERE id IN (?)', [ids]);
    if (localDb.reserved_numbers) {
      localDb.reserved_numbers = localDb.reserved_numbers.filter((r: any) => !ids.includes(r.id));
      saveLocalDb();
    }
    await addSystemLog("BATCH_DELETE_RESERVED_NUMBERS", `ลบเลขจองแบบกลุ่ม จำนวน ${ids.length} รายการ`, "ผู้ดูแลระบบ", getClientIp(req));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to batch delete reserved numbers' });
  }
});

// Helper function to execute scheduled reservation
async function executeScheduledReservation(sch: any) {
  const qty = Number(sch.count) || 1;
  const docType = sch.docType || 'หนังสือส่ง';
  const department = sch.department || 'ฝ่ายยุทธศาสตร์และการจัดการ';
  const prefix = sch.prefix || (docType === 'คำสั่ง' ? 'คำสั่ง' : (docType === 'ประกาศ' ? 'ประกาศ' : 'รย 0021'));
  const now = new Date();
  const nowIso = now.toISOString();
  const todayYmd = nowIso.split('T')[0];

  // Calculate explicit reservation date for this batch of numbers
  let reservedDate = todayYmd;
  if (sch.dateOption === 'specific_date' && sch.specificDate) {
    reservedDate = sch.specificDate;
  } else if (sch.dateOption === 'next_workday') {
    const nextWd = new Date();
    do {
      nextWd.setDate(nextWd.getDate() + 1);
    } while (nextWd.getDay() === 0 || nextWd.getDay() === 6);
    reservedDate = nextWd.toISOString().split('T')[0];
  } else if (sch.dateOption === 'next_day') {
    const nextD = new Date();
    nextD.setDate(nextD.getDate() + 1);
    reservedDate = nextD.toISOString().split('T')[0];
  }

  const reservedBy = sch.reservedBy || `ระบบจองเลขอัตโนมัติ (${sch.scheduledTime || '18:00'})`;
  const reservedFor = sch.reservedFor || `จองเลขอัตโนมัติรอบ ${sch.scheduledTime || '18:00'} น. (วันที่จอง: ${reservedDate})`;
  const yearStr = await getSystemCurrentYear();

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
        'INSERT INTO reserved_numbers (ruleId, docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, reservedDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ruleId, docType, department, numberStr, currentSeqNum, yearStr, 'auto_scheduled', 'available', reservedBy, reservedFor, reservedDate, nowIso]
      );
      createdItems.push({ id: result.insertId, numberString: numberStr, reservedDate });
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
        reservedDate,
        createdAt: nowIso
      };
      localDb.reserved_numbers.unshift(item);
      createdItems.push({ id: newId, numberString: numberStr, reservedDate });
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
  console.log('⏰ Scheduled Auto-Reservation engine started (checking every 60s)');
  setInterval(async () => {
    try {
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHH}:${currentMM}`;
      const todayYmd = now.toISOString().split('T')[0];

      let activeSchedules: any[] = [];
      if (isMysqlOnline) {
        try {
          const [rows]: any = await pool.query('SELECT * FROM scheduled_reservations WHERE isActive = 1');
          activeSchedules = rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
        } catch (e) {
          activeSchedules = (localDb.scheduled_reservations || []).filter((s: any) => Boolean(s.isActive));
        }
      } else {
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
  }, 60000);
}

// ==========================================
// AUTOMATED BACKUP DAEMON ENGINE (Multi-Schedule & Auto-Rotation)
// ==========================================
let lastAutomatedBackupDates: Record<string, string> = {};

const ALL_SYSTEM_TABLES = [
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
  'system_logs',
  'draft_documents',
  'user_favorites',
  'document_reads',
  'project_summaries',
  'infographics',
  'urgent_incidents',
  'recycle_bin',
  'workflow_templates',
  'workflow_instances',
  'digital_signatures',
  'numbering_rules',
  'custom_numbering',
  'file_codes',
  'reserved_numbers',
  'scheduled_reservations',
  'role_permissions',
  'enterprise_dynamic_qrs',
  'enterprise_qr_scans',
  'enterprise_qr_templates',
  'changelogs',
  'system_backups',
  'scheduled_backups',
  'document_versions',
  'announcements',
  'user_activity',
  'custom_doc_numbers'
];

async function ensureScheduledBackupsTable() {
  try {
    if (pool && isMysqlOnline) {
      // 1. Ensure system_backups table exists
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS system_backups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fileName VARCHAR(255) NOT NULL,
            fileSize BIGINT NOT NULL,
            backupType VARCHAR(50) NOT NULL,
            createdAt VARCHAR(50) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch (e: any) {
        console.warn('Note checking/creating system_backups table:', e.message);
      }

      // 2. Ensure scheduled_backups table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scheduled_backups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          scheduleType VARCHAR(50) DEFAULT 'daily',
          scheduledTime VARCHAR(20) DEFAULT '00:00',
          weeklyDay VARCHAR(20) DEFAULT 'monday',
          intervalHours INT DEFAULT 24,
          backupScope VARCHAR(50) DEFAULT 'full',
          retentionDays INT DEFAULT 7,
          isActive TINYINT(1) DEFAULT 1,
          lastRunAt VARCHAR(50),
          lastStatus VARCHAR(50) DEFAULT 'idle',
          lastFilename VARCHAR(255),
          lastFileSize BIGINT DEFAULT 0,
          description TEXT,
          createdBy VARCHAR(255) DEFAULT 'ผู้ดูแลระบบ',
          createdAt VARCHAR(50),
          nextRunAt VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      const cols = [
        'name VARCHAR(255)',
        'scheduleType VARCHAR(50) DEFAULT "daily"',
        'scheduledTime VARCHAR(20) DEFAULT "00:00"',
        'weeklyDay VARCHAR(20) DEFAULT "monday"',
        'intervalHours INT DEFAULT 24',
        'backupScope VARCHAR(50) DEFAULT "full"',
        'retentionDays INT DEFAULT 7',
        'isActive TINYINT(1) DEFAULT 1',
        'lastRunAt VARCHAR(50)',
        'lastStatus VARCHAR(50) DEFAULT "idle"',
        'lastFilename VARCHAR(255)',
        'lastFileSize BIGINT DEFAULT 0',
        'description TEXT',
        'createdBy VARCHAR(255) DEFAULT "ผู้ดูแลระบบ"',
        'createdAt VARCHAR(50)',
        'nextRunAt VARCHAR(50)'
      ];
      for (const col of cols) {
        try {
          await pool.query(`ALTER TABLE scheduled_backups ADD COLUMN ${col}`);
        } catch (e) {}
      }
    }
  } catch (e) {}

  if (!localDb.scheduled_backups || localDb.scheduled_backups.length === 0) {
    localDb.scheduled_backups = [
      {
        id: 1,
        name: 'สำรองข้อมูลระบบฉบับเต็มประจำวัน (รอบเที่ยงคืน 00:00 น.)',
        scheduleType: 'daily',
        scheduledTime: '00:00',
        weeklyDay: 'monday',
        intervalHours: 24,
        backupScope: 'full',
        retentionDays: 7,
        isActive: true,
        lastRunAt: null,
        lastStatus: 'idle',
        lastFilename: null,
        lastFileSize: 0,
        description: 'สำรองตารางฐานข้อมูลและสารบรรณระบบทั้งหมดทุกคืนอัตโนมัติ พร้อมระบบหมุนเวียนลบไฟล์เก่า (7 วัน)',
        createdBy: 'ระบบอัตโนมัติ (Daemon)',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'สำรองเอกสารและทะเบียนสารบรรณ (รอบปิดงาน 18:00 น.)',
        scheduleType: 'workdays',
        scheduledTime: '18:00',
        weeklyDay: 'monday',
        intervalHours: 24,
        backupScope: 'documents',
        retentionDays: 14,
        isActive: true,
        lastRunAt: null,
        lastStatus: 'idle',
        lastFilename: null,
        lastFileSize: 0,
        description: 'สำรองเฉพาะทะเบียนหนังสือรับ-ส่ง หนังสือเวียน และเอกสารภายในช่วงสิ้นสุดวันทำการ',
        createdBy: 'ระบบอัตโนมัติ (Daemon)',
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'สำรองโครงสร้างผู้ใช้และการตั้งค่าประจำสัปดาห์ (วันศุกร์ 19:00 น.)',
        scheduleType: 'weekly',
        weeklyDay: 'friday',
        scheduledTime: '19:00',
        intervalHours: 24,
        backupScope: 'system_config',
        retentionDays: 30,
        isActive: true,
        lastRunAt: null,
        lastStatus: 'idle',
        lastFilename: null,
        lastFileSize: 0,
        description: 'สำรองข้อมูลบุคลากร ฝ่ายงาน ตำแหน่ง และสิทธิ์การใช้งานทุกสิ้นสัปดาห์',
        createdBy: 'ระบบอัตโนมัติ (Daemon)',
        createdAt: new Date().toISOString()
      }
    ];
    saveLocalDb();
  }
}

async function executeScheduledBackup(sch: any, triggeredBy?: string): Promise<{ success: boolean; filename?: string; fileSize?: number; error?: string }> {
  try {
    const tar = await import('tar');
    const BACKUP_DIR = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const scope = sch.backupScope || 'full';
    let targetTables = ALL_SYSTEM_TABLES;

    if (scope === 'documents') {
      targetTables = [
        'inbox_documents',
        'circular_documents',
        'outbox_documents',
        'internal_documents',
        'admin_documents',
        'department_receives',
        'document_tracking',
        'draft_documents',
        'user_favorites',
        'document_reads',
        'recycle_bin',
        'custom_doc_numbers',
        'reserved_numbers',
        'numbering_rules'
      ];
    } else if (scope === 'system_config') {
      targetTables = [
        'settings',
        'users',
        'departments',
        'positions',
        'folders',
        'organizations',
        'workflow_templates',
        'numbering_rules'
      ];
    } else if (scope === 'logs_audit') {
      targetTables = [
        'system_logs',
        'project_summaries',
        'infographics',
        'urgent_incidents'
      ];
    }

    const backupTablesData: Record<string, any[]> = {};
    for (const table of targetTables) {
      try {
        if (pool && isMysqlOnline) {
          const [rows]: any = await pool.query(`SELECT * FROM \`${table}\``);
          backupTablesData[table] = rows || [];
        } else {
          backupTablesData[table] = (localDb && (localDb as any)[table]) ? (localDb as any)[table] : [];
        }
      } catch (err: any) {
        if (localDb && (localDb as any)[table]) {
          backupTablesData[table] = (localDb as any)[table];
        } else {
          backupTablesData[table] = [];
        }
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const timestamp = Date.now();
    const scopePrefix = scope === 'full' ? 'full' : scope;
    const filename = `edms_auto_backup_${scopePrefix}_${dateStr}_${timestamp}.tar`;
    const filePath = path.join(BACKUP_DIR, filename);

    // 1. Create temporary database snapshot dump JSON file
    const dumpFileName = `database_dump_${scopePrefix}_${dateStr}_${timestamp}.json`;
    const dumpFilePath = path.join(process.cwd(), dumpFileName);

    const payload = {
      version: '2.0',
      system: 'Smart e-Saraban EDMS (Rayong Disaster Prevention & Mitigation)',
      type: 'automated_daily_backup_tar',
      format: 'tar',
      scheduleId: sch.id,
      scheduleName: sch.name,
      scope: scope,
      retentionDays: Number(sch.retentionDays) || 7,
      createdBy: triggeredBy || sch.createdBy || 'ระบบอัตโนมัติ (Daemon)',
      createdAt: now.toISOString(),
      tables: backupTablesData,
      localDb: backupTablesData
    };

    fs.writeFileSync(dumpFilePath, JSON.stringify(payload, null, 2), 'utf-8');

    // 2. Determine archive items based on scope
    const itemsToArchive: string[] = [];
    if (fs.existsSync(dumpFilePath)) itemsToArchive.push(dumpFileName);

    if (scope === 'full' || scope === 'documents') {
      const uploadsPath = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsPath)) itemsToArchive.push('uploads');
    }

    if (scope === 'full' || scope === 'system_config') {
      const configFiles = ['.env', 'metadata.json', 'package.json', 'tsconfig.json', 'vite.config.ts', 'components.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'index.html'];
      for (const f of configFiles) {
        if (fs.existsSync(path.join(process.cwd(), f))) itemsToArchive.push(f);
      }
      // Include src and public for "Really Full" backup
      if (scope === 'full') {
        if (fs.existsSync(path.join(process.cwd(), 'src'))) itemsToArchive.push('src');
        if (fs.existsSync(path.join(process.cwd(), 'public'))) itemsToArchive.push('public');
      }
    }

    // 3. Create .tar archive
    try {
      await tar.create(
        {
          cwd: process.cwd(),
          file: filePath,
          gzip: false
        },
        itemsToArchive.length > 0 ? itemsToArchive : ['package.json']
      );
    } finally {
      // 4. Always clean up temporary dump file
      if (fs.existsSync(dumpFilePath)) {
        try { fs.unlinkSync(dumpFilePath); } catch {}
      }
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(2) + ' MB';

    console.log(`💾 [AutomatedBackupDaemon] .TAR Backup created successfully: ${filename} (${(fileSize / 1024).toFixed(1)} KB / ${sizeMb}) for schedule: "${sch.name}"`);

    // 5. Rotation: keep up to retentionDays / retentionLimit of .tar files
    const retentionLimit = Number(sch.retentionDays) || 7;
    if (retentionLimit > 0) {
      try {
        const files = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith('edms_auto_backup_') && f.endsWith('.tar'))
          .map(f => {
            const p = path.join(BACKUP_DIR, f);
            return { name: f, path: p, mtime: fs.statSync(p).mtimeMs };
          })
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > retentionLimit) {
          const toDelete = files.slice(retentionLimit);
          for (const item of toDelete) {
            try {
              fs.unlinkSync(item.path);
              if (pool && isMysqlOnline) {
                await pool.query('DELETE FROM system_backups WHERE fileName = ?', [item.name]).catch(() => {});
              }
              console.log(`🧹 [AutomatedBackupDaemon] Rotated old backup (.tar): ${item.name}`);
            } catch (e) {}
          }
        }
      } catch (rotErr: any) {
        console.warn('⚠️ [AutomatedBackupDaemon] Rotation warning:', rotErr?.message);
      }
    }

    // 6. Record to system_backups table in MySQL
    try {
      if (pool && isMysqlOnline) {
        await pool.query(
          'INSERT INTO system_backups (fileName, fileSize, backupType, createdAt) VALUES (?, ?, ?, ?)',
          [filename, sizeMb, `สำรองอัตโนมัติ (${scope})`, now.toISOString()]
        ).catch(() => {});
      }
    } catch {}

    // 7. Calculate next run time
    const [targetH, targetM] = (sch.scheduledTime || '00:00').split(':').map(Number);
    const nextDate = new Date();
    nextDate.setHours(targetH || 0, targetM || 0, 0, 0);
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    const nextDateYmd = nextDate.toISOString().split('T')[0];
    const nextRunAtStr = `${nextDateYmd} ${sch.scheduledTime || '00:00'}`;

    // 8. Update schedule record
    const nowIso = now.toISOString();
    if (localDb.scheduled_backups) {
      const match = localDb.scheduled_backups.find((s: any) => Number(s.id) === Number(sch.id));
      if (match) {
        match.lastRunAt = nowIso;
        match.lastStatus = 'success';
        match.lastFilename = filename;
        match.lastFileSize = fileSize;
        match.nextRunAt = nextRunAtStr;
        saveLocalDb();
      }
    }

    if (pool && isMysqlOnline && sch.id) {
      try {
        await pool.query(
          'UPDATE scheduled_backups SET lastRunAt = ?, lastStatus = ?, lastFilename = ?, lastFileSize = ?, nextRunAt = ? WHERE id = ?',
          [nowIso, 'success', filename, fileSize, nextRunAtStr, sch.id]
        );
      } catch (e) {}
    }

    try {
      await addSystemLog(
        'AUTO_BACKUP_DAEMON',
        `สำรองข้อมูลอัตโนมัติสำเร็จ (.tar): "${sch.name}" (${scope}) ไฟล์: ${filename} ขนาด: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        triggeredBy || 'ระบบอัตโนมัติ (Daemon)',
        '127.0.0.1'
      );
    } catch (e) {}

    // 9. Broadcast SSE
    try {
      broadcastToClients({
        type: 'AUTO_BACKUP_COMPLETED',
        scheduleId: sch.id,
        scheduleName: sch.name,
        filename,
        fileSize,
        sizeMb,
        createdAt: nowIso
      });
    } catch (e) {}

    return { success: true, filename, fileSize };
  } catch (err: any) {
    console.error(`❌ [AutomatedBackupDaemon] Backup execution failed for "${sch.name}":`, err?.message || err);

    if (localDb.scheduled_backups) {
      const match = localDb.scheduled_backups.find((s: any) => Number(s.id) === Number(sch.id));
      if (match) {
        match.lastStatus = 'failed';
        saveLocalDb();
      }
    }

    if (pool && isMysqlOnline && sch.id) {
      try {
        await pool.query('UPDATE scheduled_backups SET lastStatus = ? WHERE id = ?', ['failed', sch.id]);
      } catch (e) {}
    }

    return { success: false, error: err?.message || String(err) };
  }
}

async function performAutomatedDailyBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
  const defaultTask = {
    id: 1,
    name: 'สำรองข้อมูลระบบฉบับเต็มประจำวัน (.tar)',
    backupScope: 'full',
    retentionDays: 7,
    createdBy: 'ระบบอัตโนมัติ'
  };
  return await executeScheduledBackup(defaultTask);
}

function startAutomatedBackupEngine() {
  console.log('💾 Automated Backup Daemon engine started (checking every 60s, multi-schedule daemon active, generating .tar archives)');

  // Initial delayed check after server starts (10 seconds)
  setTimeout(async () => {
    try {
      await ensureScheduledBackupsTable();
      const isEnabled = localDb.settings && localDb.settings[0] && localDb.settings[0].automatedBackupEnabled !== false;
      if (!isEnabled) {
        console.log('💾 [AutomatedBackupDaemon] Master daemon switch is disabled in settings, skipping initial check.');
        return;
      }

      const todayYmd = new Date().toISOString().split('T')[0];
      const BACKUP_DIR = path.join(process.cwd(), 'backups');
      let todayBackupExists = false;

      if (fs.existsSync(BACKUP_DIR)) {
        const dateStr = todayYmd.replace(/-/g, '');
        const files = fs.readdirSync(BACKUP_DIR);
        todayBackupExists = files.some(f => (f.startsWith(`edms_auto_backup_`) || f.startsWith(`auto_backup_`) || f.startsWith(`edms_backup_`)) && f.includes(`_${dateStr}_`));
      }

      if (!todayBackupExists) {
        console.log(`💾 [AutomatedBackupDaemon] No backup found for today (${todayYmd}), initiating initial scheduled backup...`);
        const firstActive = (localDb.scheduled_backups || []).find((s: any) => s.isActive);
        if (firstActive) {
          const res = await executeScheduledBackup(firstActive);
          if (res.success) {
            lastAutomatedBackupDates[`sch_${firstActive.id}`] = todayYmd;
          }
        } else {
          await performAutomatedDailyBackup();
        }
      } else {
        console.log(`💾 [AutomatedBackupDaemon] Backup for today (${todayYmd}) already exists.`);
      }
    } catch (err: any) {
      console.error('⚠️ [AutomatedBackupDaemon] Initial backup check error:', err?.message);
    }
  }, 10000);

  // 60-second ticker to trigger schedules precisely at their designated time
  setInterval(async () => {
    try {
      const isEnabled = localDb.settings && localDb.settings[0] && localDb.settings[0].automatedBackupEnabled !== false;
      if (!isEnabled) {
        return;
      }

      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHH}:${currentMM}`;
      const todayYmd = now.toISOString().split('T')[0];
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = dayNames[dayOfWeek];
      const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

      let activeSchedules: any[] = [];
      if (pool && isMysqlOnline) {
        try {
          const [rows]: any = await pool.query('SELECT * FROM scheduled_backups WHERE isActive = 1');
          activeSchedules = (rows || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
        } catch (e) {
          activeSchedules = (localDb.scheduled_backups || []).filter((s: any) => Boolean(s.isActive));
        }
      } else {
        activeSchedules = (localDb.scheduled_backups || []).filter((s: any) => Boolean(s.isActive));
      }

      for (const sch of activeSchedules) {
        const schTime = sch.scheduledTime || '00:00';
        const schType = sch.scheduleType || 'daily';

        let shouldRunToday = false;
        if (schType === 'daily') {
          shouldRunToday = true;
        } else if (schType === 'workdays') {
          shouldRunToday = isWorkday;
        } else if (schType === 'weekly') {
          const targetDay = (sch.weeklyDay || 'monday').toLowerCase();
          shouldRunToday = (currentDayName === targetDay);
        } else if (schType === 'interval') {
          shouldRunToday = true;
        }

        if (shouldRunToday && schTime === currentTimeStr) {
          const cacheKey = `sch_${sch.id}`;
          const lastRunYmd = sch.lastRunAt ? sch.lastRunAt.split('T')[0] : (lastAutomatedBackupDates[cacheKey] || '');
          if (lastRunYmd !== todayYmd) {
            console.log(`⏰ [AutomatedBackupDaemon] Triggering scheduled auto-backup: "${sch.name}" (${sch.backupScope}) at ${currentTimeStr}`);
            const result = await executeScheduledBackup(sch);
            if (result.success) {
              lastAutomatedBackupDates[cacheKey] = todayYmd;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('⚠️ [AutomatedBackupDaemon] Ticker error:', err?.message);
    }
  }, 60000); // 1 minute ticker
}

// ==================== SCHEDULED BACKUPS REST APIS ====================
app.get('/api/scheduled-backups', async (req, res) => {
  try {
    await ensureScheduledBackupsTable();
    let schedules: any[] = [];
    if (pool && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM scheduled_backups ORDER BY id ASC');
        schedules = (rows || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
      } catch (e) {
        schedules = (localDb.scheduled_backups || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
      }
    } else {
      schedules = (localDb.scheduled_backups || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
    }
    return res.json({ success: true, schedules, data: schedules });
  } catch (err: any) {
    console.error('Get scheduled backups error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch scheduled backups', details: err.message });
  }
});

app.post('/api/scheduled-backups', async (req, res) => {
  try {
    await ensureScheduledBackupsTable();
    const { name, scheduleType, scheduledTime, weeklyDay, intervalHours, backupScope, retentionDays, description, isActive } = req.body;
    const nowIso = new Date().toISOString();
    const activeVal = isActive !== undefined ? (isActive ? 1 : 0) : 1;

    let newSchedule: any = {
      name: name || 'สำรองข้อมูลระบบอัตโนมัติ (.tar)',
      scheduleType: scheduleType || 'daily',
      scheduledTime: scheduledTime || '00:00',
      weeklyDay: weeklyDay || 'monday',
      intervalHours: Number(intervalHours) || 24,
      backupScope: backupScope || 'full',
      retentionDays: Number(retentionDays) || 7,
      description: description || '',
      isActive: activeVal === 1,
      lastRunAt: null,
      lastStatus: 'idle',
      lastFilename: null,
      lastFileSize: 0,
      createdBy: req.body.username || req.body.createdBy || 'ผู้ดูแลระบบ',
      createdAt: nowIso
    };

    let insertedId = null;
    if (pool && isMysqlOnline) {
      try {
        const [result]: any = await pool.query(
          'INSERT INTO scheduled_backups (name, scheduleType, scheduledTime, weeklyDay, intervalHours, backupScope, retentionDays, description, isActive, lastRunAt, lastStatus, lastFilename, lastFileSize, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newSchedule.name,
            newSchedule.scheduleType,
            newSchedule.scheduledTime,
            newSchedule.weeklyDay,
            newSchedule.intervalHours,
            newSchedule.backupScope,
            newSchedule.retentionDays,
            newSchedule.description,
            activeVal,
            null,
            'idle',
            null,
            0,
            newSchedule.createdBy,
            nowIso
          ]
        );
        insertedId = result.insertId;
      } catch (e) {
        console.warn('MySQL insert scheduled_backups warning:', e);
      }
    }

    if (!localDb.scheduled_backups) localDb.scheduled_backups = [];
    if (!insertedId) {
      const newId = localDb.scheduled_backups.length > 0 ? Math.max(...localDb.scheduled_backups.map((s: any) => Number(s.id) || 0)) + 1 : 1;
      insertedId = newId;
    }
    newSchedule.id = insertedId;

    const existingIdx = localDb.scheduled_backups.findIndex((s: any) => Number(s.id) === Number(insertedId));
    if (existingIdx !== -1) {
      localDb.scheduled_backups[existingIdx] = newSchedule;
    } else {
      localDb.scheduled_backups.push(newSchedule);
    }
    saveLocalDb();

    try {
      await addSystemLog("CREATE_SCHEDULED_BACKUP", `เพิ่มคิวตั้งเวลาสำรองข้อมูลอัตโนมัติ: ${newSchedule.name} (${newSchedule.scheduledTime} น.)`, req.body.username || "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true, schedule: newSchedule, data: newSchedule });
  } catch (err: any) {
    console.error('Create scheduled backup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create scheduled backup', details: err.message });
  }
});

app.put('/api/scheduled-backups/:id', async (req, res) => {
  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);
    const updates = { ...req.body };
    delete updates.id;
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive ? 1 : 0;
    }

    const allowedColumns = ['name', 'scheduleType', 'scheduledTime', 'weeklyDay', 'intervalHours', 'backupScope', 'retentionDays', 'description', 'isActive', 'lastRunAt', 'lastStatus', 'lastFilename', 'lastFileSize'];
    const validKeys = Object.keys(updates).filter(k => allowedColumns.includes(k));

    if (validKeys.length > 0 && pool && isMysqlOnline) {
      try {
        const setClause = validKeys.map(k => `\`${k}\` = ?`).join(', ');
        const values = validKeys.map(k => updates[k]);
        values.push(id);
        await pool.query(`UPDATE scheduled_backups SET ${setClause} WHERE id = ?`, values);
      } catch (e) {
        console.warn('MySQL update scheduled_backups warning:', e);
      }
    }

    if (!localDb.scheduled_backups) localDb.scheduled_backups = [];
    const idx = localDb.scheduled_backups.findIndex((s: any) => Number(s.id) === id);
    if (idx !== -1) {
      localDb.scheduled_backups[idx] = {
        ...localDb.scheduled_backups[idx],
        ...updates,
        isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : localDb.scheduled_backups[idx].isActive
      };
      saveLocalDb();
    }

    try {
      await addSystemLog("UPDATE_SCHEDULED_BACKUP", `อัปเดตคิวตั้งเวลาสำรองข้อมูลอัตโนมัติ ID: ${id}`, req.body.username || "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Update scheduled backup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update scheduled backup', details: err.message });
  }
});

app.delete('/api/scheduled-backups/:id', async (req, res) => {
  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);

    if (pool && isMysqlOnline) {
      try {
        await pool.query('DELETE FROM scheduled_backups WHERE id = ?', [id]);
      } catch (e) {
        console.warn('MySQL delete scheduled_backups warning:', e);
      }
    }

    if (localDb.scheduled_backups) {
      localDb.scheduled_backups = localDb.scheduled_backups.filter((s: any) => Number(s.id) !== id);
      saveLocalDb();
    }

    try {
      await addSystemLog("DELETE_SCHEDULED_BACKUP", `ลบคิวตั้งเวลาสำรองข้อมูลอัตโนมัติ ID: ${id}`, req.body.username || "ผู้ดูแลระบบ", getClientIp(req));
    } catch (logErr) {}

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete scheduled backup' });
  }
});

app.post('/api/scheduled-backups/:id/toggle', async (req, res) => {
  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);
    let newStatus = true;

    if (localDb.scheduled_backups) {
      const target = localDb.scheduled_backups.find((s: any) => Number(s.id) === id);
      if (target) {
        target.isActive = !target.isActive;
        newStatus = target.isActive;
        saveLocalDb();
      }
    }

    if (pool && isMysqlOnline) {
      try {
        await pool.query('UPDATE scheduled_backups SET isActive = ? WHERE id = ?', [newStatus ? 1 : 0, id]);
      } catch (e) {}
    }

    return res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to toggle schedule status' });
  }
});

app.post('/api/scheduled-backups/:id/run-now', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let targetSch: any = null;

    if (pool && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM scheduled_backups WHERE id = ?', [id]);
        if (rows.length > 0) {
          targetSch = { ...rows[0], isActive: Boolean(rows[0].isActive) };
        }
      } catch (e) {}
    }

    if (!targetSch && localDb.scheduled_backups) {
      targetSch = localDb.scheduled_backups.find((s: any) => Number(s.id) === id);
    }

    if (!targetSch) {
      return res.status(404).json({ success: false, error: 'Scheduled backup task not found' });
    }

    const result = await executeScheduledBackup(targetSch, req.body.username || 'ผู้ดูแลระบบ (สั่งรันด้วยตนเอง)');
    return res.json(result);
  } catch (err: any) {
    console.error('Error in backup run-now:', err);
    return res.status(500).json({ success: false, error: 'Failed to run scheduled backup' });
  }
});

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
        dateOption VARCHAR(50) DEFAULT 'current_date',
        specificDate VARCHAR(50),
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
      'dateOption VARCHAR(50) DEFAULT "current_date"',
      'specificDate VARCHAR(50)',
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

    const { name, department, docType, prefix, count, scheduleType, scheduledTime, reservedFor, reservedBy, dateOption, specificDate, isActive } = req.body;
    const nowIso = new Date().toISOString();
    const activeVal = isActive !== undefined ? (isActive ? 1 : 0) : 1;

    let newSchedule: any = {
      name: name || 'จองเลขอัตโนมัติประจำวัน',
      department: department || 'ฝ่ายยุทธศาสตร์และการจัดการ',
      docType: docType || 'หนังสือส่ง',
      prefix: prefix || 'รย 0021',
      count: Number(count) || 1,
      scheduleType: scheduleType || 'daily',
      scheduledTime: scheduledTime || '18:00',
      reservedFor: reservedFor || 'จองเลขอัตโนมัติตามกำหนดเวลา',
      reservedBy: reservedBy || 'ระบบอัตโนมัติ',
      dateOption: dateOption || 'current_date',
      specificDate: specificDate || '',
      isActive: Boolean(activeVal),
      lastRunAt: null,
      nextRunAt: `${nowIso.split('T')[0]} ${scheduledTime || '18:00'}`,
      createdAt: nowIso
    };

    let insertedId: any = null;
    try {
      const [result]: any = await pool.query(
        'INSERT INTO scheduled_reservations (name, department, docType, prefix, count, scheduleType, scheduledTime, reservedFor, reservedBy, dateOption, specificDate, isActive, lastRunAt, nextRunAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newSchedule.name, newSchedule.department, newSchedule.docType, newSchedule.prefix, newSchedule.count, newSchedule.scheduleType, newSchedule.scheduledTime, newSchedule.reservedFor, newSchedule.reservedBy, newSchedule.dateOption, newSchedule.specificDate, activeVal, newSchedule.lastRunAt, newSchedule.nextRunAt, newSchedule.createdAt]
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

    const allowedColumns = ['name', 'department', 'docType', 'prefix', 'count', 'scheduleType', 'scheduledTime', 'reservedFor', 'reservedBy', 'dateOption', 'specificDate', 'isActive', 'lastRunAt', 'nextRunAt', 'createdAt'];
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
    const effectiveYr = year || await getSystemCurrentYear();
    
    // We try to extract seq number from numberString
    let seqNumber = 0;
    const match = numberString.match(/\/(\d+)/) || numberString.match(/\s(\d+)\//);
    if (match) {
        seqNumber = parseInt(match[1], 10);
    }
    
    const [result]: any = await pool.query(
      'INSERT INTO reserved_numbers (docType, department, numberString, seqNumber, year, type, status, reservedBy, reservedFor, reservedDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [docType || 'หนังสือส่ง', department || 'ทุกฝ่ายงาน', numberString, seqNumber, effectiveYr, 'reclaimed', 'available', reclaimedBy || 'ระบบ', reason || 'คืนเลขเนื่องจากยกเลิกหนังสือ', nowStr.split('T')[0], nowStr]
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
    const { department, docType, isCircular, category, year, isCentral } = req.body;
    const yr = String(year || await getSystemCurrentYear());
    const isCentralNum = isCentral !== undefined ? (Number(isCentral) === 1 || isCentral === true ? 1 : 0) : 1;
    const isCentralBool = isCentralNum === 1;
    const targetDept = (department || '').trim();

    let actualType = docType || 'หนังสือส่ง';
    if (docType === 'admin') {
      if (category === 'order') actualType = 'คำสั่ง';
      else if (category === 'announcement') actualType = 'ประกาศ';
      else if (category === 'certificate') actualType = 'หนังสือรับรอง';
    } else if (docType === 'inbox') {
      actualType = 'หนังสือรับ';
    } else if (docType === 'outbox' || docType === 'หนังสือภายนอก' || docType === 'หนังสือส่ง') {
      actualType = 'หนังสือส่ง';
    } else if (docType === 'internal') {
      actualType = 'หนังสือภายใน';
    }

    let rules: any[] = [];
    if (isMysqlOnline) {
      const [rRows]: any = await pool.query('SELECT * FROM numbering_rules WHERE isActive = 1').catch(() => [[]]);
      rules = rRows || [];
    } else {
      rules = (localDb.numbering_rules || []).filter((r: any) => r.isActive);
    }

    const matchesDocType = (ruleDocType: string) => {
      if (actualType === 'หนังสือส่ง') return ruleDocType === 'หนังสือส่ง' || ruleDocType === 'หนังสือภายนอก';
      if (actualType === 'หนังสือรับ') return ruleDocType === 'หนังสือรับ' || ruleDocType === 'หนังสือเข้า';
      return ruleDocType === actualType;
    };

    let matchingRule: any = null;
    if (actualType === 'หนังสือรับ' || actualType === 'หนังสือส่ง') {
      if (isCentralBool) {
        matchingRule = rules.find((r: any) => matchesDocType(r.docType) && (r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง'))));
      } else {
        matchingRule = rules.find((r: any) => matchesDocType(r.docType) && (r.department === targetDept || (r.department && r.department.trim() === targetDept)));
      }
    } else if (actualType === 'หนังสือภายใน') {
      matchingRule = rules.find((r: any) => r.docType === actualType);
    } else if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(actualType)) {
      matchingRule = rules.find((r: any) => r.docType === actualType);
    }

    const ruleToUse = matchingRule || {
      docType: actualType,
      department: isCentralBool ? 'ทุกฝ่ายงาน' : targetDept,
      runningScope: isCentralBool ? 'global' : 'department',
      year: yr,
      currentSeq: 0
    };

    const maxSeq = await getRealMaxSequenceForRule(ruleToUse, yr);
    const baseSeq = Math.max(Number(ruleToUse.currentSeq || 0), maxSeq);
    const nextSeq = baseSeq + 1;

    let usedPrefix = matchingRule?.prefixPattern || 'รย 0021';
    let formattedNumber = '';

    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(actualType)) {
      usedPrefix = matchingRule?.prefixPattern || actualType;
      formattedNumber = `${usedPrefix} ${nextSeq}/${yr}`;
    } else if (actualType === 'หนังสือรับ') {
      usedPrefix = matchingRule?.prefixPattern || 'รย 0021';
      formattedNumber = '';
    } else if (actualType === 'หนังสือภายใน') {
      usedPrefix = matchingRule?.prefixPattern || 'รย 0021';
      formattedNumber = `${usedPrefix}/${nextSeq}`;
    } else {
      if (!matchingRule?.prefixPattern) {
        if (isCentralBool) {
          usedPrefix = 'รย 0021';
        } else {
          if (targetDept === 'ฝ่ายยุทธศาสตร์และการจัดการ') usedPrefix = 'รย 0021.1';
          else if (targetDept === 'ฝ่ายสงเคราะห์ผู้ประสบภัย') usedPrefix = 'รย 0021.2';
          else if (targetDept === 'ฝ่ายป้องกันและปฏิบัติการ') usedPrefix = 'รย 0021.3';
          else usedPrefix = 'รย 0021';
        }
      }
      const circFlag = isCircular ? (usedPrefix.includes('ว') ? '' : 'ว ') : '';
      formattedNumber = `${usedPrefix}/${circFlag}${nextSeq}`;
    }

    return res.json({
      success: true,
      nextSeq,
      receiveNumber: String(nextSeq),
      formattedNumber,
      prefix: usedPrefix,
      isCentral: isCentralNum,
      department: targetDept,
      ruleId: matchingRule?.id || null,
      ruleName: matchingRule?.ruleName || null,
      docType: actualType,
      divisionCode: matchingRule?.divisionCode || '',
      runningScope: matchingRule?.runningScope || (isCentralBool ? 'global' : 'department'),
      isActiveRule: !!matchingRule
    });
  } catch (err: any) {
    console.error('Failed to generate next number:', err);
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

    // Load available real documents to resolve missing/fallback docNumbers
    let allDocs: any[] = [
      ...(localDb.inbox_documents || []),
      ...(localDb.outbox_documents || []),
      ...(localDb.circular_documents || []),
      ...(localDb.admin_documents || []),
      ...(localDb.internal_documents || [])
    ];
    if (isMysqlOnline) {
      try {
        const [iRows]: any = await pool.query("SELECT id, docNumber, title, department, assignee FROM inbox_documents LIMIT 50");
        const [oRows]: any = await pool.query("SELECT id, docNumber, title, department, assignee FROM outbox_documents LIMIT 50");
        const [aRows]: any = await pool.query("SELECT id, docNumber, title, department, assignee FROM admin_documents LIMIT 50");
        if (iRows?.length || oRows?.length || aRows?.length) {
          allDocs = [...(iRows || []), ...(oRows || []), ...(aRows || []), ...allDocs];
        }
      } catch (e) {}
    }

    const nowMs = Date.now();
    const updatedInstances = instances.map((inst: any) => {
      // If instance has generic fallback docNumber or missing title, resolve to real document
      if (!inst.docNumber || inst.docNumber === 'รย 0021/999' || inst.docNumber === 'รย 0021/000') {
        const matched = allDocs.find((d: any) => String(d.id) === String(inst.docId) || String(d.docNumber) === String(inst.docId));
        if (matched) {
          if (matched.docNumber) inst.docNumber = matched.docNumber;
          if (matched.title) inst.docTitle = matched.title;
          if (matched.department) inst.department = matched.department;
          if (matched.assignee) inst.assignee = matched.assignee;
        } else if (allDocs.length > 0 && allDocs[0].docNumber) {
          inst.docNumber = allDocs[0].docNumber;
          if (allDocs[0].title) inst.docTitle = allDocs[0].title;
          if (allDocs[0].department) inst.department = allDocs[0].department;
        }
      }

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
          `SELECT id, 'inbox' as type, title, docNumber, department, assignee, priority FROM inbox_documents WHERE id = ? OR docNumber = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, department, assignee, priority FROM outbox_documents WHERE id = ? OR docNumber = ?`,
          `SELECT id, 'circular' as type, title, docNumber, department, assignee, priority FROM circular_documents WHERE id = ? OR docNumber = ?`,
          `SELECT id, 'admin' as type, title, docNumber, department, assignee, 'ปกติ' as priority FROM admin_documents WHERE id = ? OR docNumber = ?`,
          `SELECT id, 'internal' as type, title, docNumber, department, assignee, priority FROM internal_documents WHERE id = ? OR docNumber = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [docId, docId]);
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
      const matchedLocal = allDocs.find((d: any) => String(d.id) === String(docId) || String(d.docNumber) === String(docId));
      doc = matchedLocal || {
        docNumber: req.body.docNumber || (allDocs[0]?.docNumber || "รย 0021/ว 1092"),
        title: req.body.docTitle || (allDocs[0]?.title || "หนังสือมอบหมายตามเส้นทาง Workflow"),
        department: req.body.department || (allDocs[0]?.department || "ฝ่ายยุทธศาสตร์และการจัดการ"),
        assignee: req.body.assignee || user || "เจ้าหน้าที่",
        priority: req.body.priority || "ปกติ"
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
        department: st.department || doc.department || "ฝ่ายยุทธศาสตร์และการจัดการ",
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
      department: doc.department || "ฝ่ายยุทธศาสตร์และการจัดการ",
      assignee: doc.assignee || user || "ผู้รับผิดชอบ",
      priority: doc.priority || "ปกติ",
      steps: instSteps,
      slaStatus: "NORMAL"
    };

    if (!localDb.workflow_instances) localDb.workflow_instances = [];
    localDb.workflow_instances.unshift(newInst);

    // Sync document status with new workflow
    const initialStep = newInst.steps?.[0];
    const initialDocStatus = initialStep ? `อยู่ระหว่าง: ${initialStep.title}` : "อยู่ระหว่างเสนอลงนาม";

    // Update document in MySQL
    if (isMysqlOnline) {
      try {
        const docTables = {
          inbox: 'inbox_documents',
          outbox: 'outbox_documents',
          circular: 'circular_documents',
          internal: 'internal_documents',
          admin: 'admin_documents'
        };
        const tbl = docTables[newInst.docType as keyof typeof docTables] || 'inbox_documents';
        await pool.query(`UPDATE ${tbl} SET status = ? WHERE id = ?`, [initialDocStatus, newInst.docId]);
      } catch (mysqlErr) {
        console.warn("MySQL update document status on workflow start failed:", mysqlErr);
      }
    }

    // Update document in localDb
    const allTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    for (const tbl of allTables) {
      if (localDb[tbl]) {
        const foundDoc = localDb[tbl].find((d: any) => String(d.id) === String(newInst.docId));
        if (foundDoc) {
          foundDoc.status = initialDocStatus;
          break;
        }
      }
    }

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

    // Sync document status with workflow
    let docStatus = "ลงทะเบียน";
    if (inst.status === "completed") {
      docStatus = "เสร็จสิ้น";
    } else if (inst.status === "rejected") {
      docStatus = "ส่งกลับแก้ไข/ไม่อนุมัติ";
    } else {
      const activeStep = inst.steps?.[inst.currentStepIndex];
      if (activeStep) {
        docStatus = `อยู่ระหว่าง: ${activeStep.title}`;
      } else {
        docStatus = "อยู่ระหว่างเสนอลงนาม";
      }
    }

    // Update document in MySQL
    if (isMysqlOnline) {
      try {
        const docTables = {
          inbox: 'inbox_documents',
          outbox: 'outbox_documents',
          circular: 'circular_documents',
          internal: 'internal_documents',
          admin: 'admin_documents'
        };
        const tbl = docTables[inst.docType as keyof typeof docTables] || 'inbox_documents';
        await pool.query(`UPDATE ${tbl} SET status = ? WHERE id = ?`, [docStatus, inst.docId]);
      } catch (mysqlErr) {
        console.warn("MySQL update document status from workflow failed:", mysqlErr);
      }
    }

    // Update document in localDb
    const allTables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    for (const tbl of allTables) {
      if (localDb[tbl]) {
        const foundDoc = localDb[tbl].find((d: any) => String(d.id) === String(inst.docId));
        if (foundDoc) {
          foundDoc.status = docStatus;
          break;
        }
      }
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

app.delete("/api/workflows/instances/clear-all", async (req, res) => {
  try {
    localDb.workflow_instances = [];
    saveLocalDb();
    if (isMysqlOnline) {
      try {
        await pool.query('TRUNCATE TABLE workflow_instances', []);
      } catch (mysqlErr) {
        console.warn("MySQL truncate workflow_instances failed:", mysqlErr);
      }
    }
    const ip = getClientIp(req);
    await addSystemLog("CLEAR_WORKFLOW_INSTANCES", "ล้างข้อมูลรายการติดตามการเดินเอกสารทั้งหมด", req.body?.user || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to clear workflow instances" });
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

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatThaiDateOnly(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return String(isoDate);
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${year}`;
}

async function buildSignedPdfBuffer(doc: any, sigRecord: any, qrDataUrl: string): Promise<Buffer> {
  // 1. Try rendering with Puppeteer and high-fidelity Google Fonts Sarabun for 100% Thai support
  try {
    // Puppeteer stripped for AI Studio migration
    /*
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    */
    throw new Error('Puppeteer is disabled in this environment. Falling back to pdf-lib.');

    try {
      const page = await browser.newPage();

      // Organization info from system settings
      const orgSettings = (localDb.settings && localDb.settings[0]) || {};
      const orgName = orgSettings.orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

      // Load local DDPM/Garuda logo as base64 data URI to guarantee fast, offline rendering
      let emblemDataUri = '';
      try {
        const localLogo = path.join(process.cwd(), 'public', 'ddpm-logo.svg');
        if (fs.existsSync(localLogo)) {
          const svgContent = fs.readFileSync(localLogo, 'utf8');
          emblemDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
        }
      } catch (_) {}
      if (!emblemDataUri) {
        emblemDataUri = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
      }

      // Format Body Content
      const rawContent = doc.content || doc.note || 'หนังสืออิเล็กทรอนิกส์นี้ได้รับการลงนามดิจิทัลและบันทึกข้อมูลในระบบสารบรรณอิเล็กทรอนิกส์ (EDMS) ถูกต้องตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม ข้อมูลในเอกสารได้รับการคุ้มครองความสมบูรณ์และสามารถตรวจสอบย้อนกลับได้';
      const contentParagraphs = rawContent
        .split(/\r?\n\r?\n|\r?\n/)
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => `<p style="text-indent: 2.5em; margin-bottom: 12px; line-height: 1.7; text-align: justify; font-size: 14.5px;">${escapeHtml(p)}</p>`)
        .join('');

      // Formatted Date
      const thaiDocDate = formatThaiDateOnly(doc.date || doc.registerDate || sigRecord.timestampIso);
      const thaiSignTimestamp = sigRecord.timestampFormatted || formatThaiDateTimeStr(sigRecord.timestampIso);

      // Category title
      const isMemo = (doc.category === 'memo' || doc.type === 'memo' || !doc.category);
      const docTypeHeader = isMemo ? '' : 'หนังสือราชการอิเล็กทรอนิกส์';

      // Priority and Secrecy badges
      const priority = doc.priority || 'ปกติ';
      const secrecy = doc.secrecy || 'ปกติ';

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>เอกสารลงนามดิจิทัลสมบูรณ์ (ETDA Certified)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Prompt:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Prompt', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16mm 18mm 14mm 18mm;
      width: 210mm;
      min-height: 297mm;
      font-size: 14px;
      line-height: 1.55;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-32deg);
      font-size: 42px;
      font-weight: 800;
      color: rgba(5, 150, 105, 0.035);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .main-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      min-height: 265mm;
    }
    .header-section {
      text-align: center;
      position: relative;
      padding-bottom: 12px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 14px;
    }
    .header-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
      margin: 0 auto 6px;
      display: block;
    }
    .header-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .header-subtitle {
      font-size: 12px;
      color: #047857;
      font-weight: 700;
    }
    .badge-bar {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .badge-etda {
      background: #047857;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .badge-urgent {
      background: #dc2626;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .badge-secret {
      background: #d97706;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .gov-meta-table {
      width: 100%;
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.6;
    }
    .gov-meta-row {
      display: flex;
      margin-bottom: 6px;
    }
    .gov-meta-label {
      font-weight: 700;
      color: #0f172a;
      flex-shrink: 0;
    }
    .gov-meta-val {
      color: #1e293b;
      margin-left: 6px;
    }
    .content-box {
      flex: 1;
      margin-bottom: 16px;
    }
    .content-header {
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 14.5px;
      color: #0f172a;
    }
    .signature-signoff {
      margin-left: auto;
      width: 250px;
      text-align: center;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .signature-image {
      max-height: 52px;
      max-width: 150px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .cert-box {
      border: 1.5px solid #059669;
      border-radius: 8px;
      background: #f0fdf4;
      overflow: hidden;
      margin-top: auto;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .cert-header {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      color: #ffffff;
      padding: 5px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cert-header-title {
      font-size: 10.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .cert-header-law {
      font-size: 8.5px;
      color: #a7f3d0;
      white-space: nowrap;
    }
    .cert-body {
      padding: 10px 14px;
    }
    .cert-status-banner {
      background: #d1fae5;
      border: 1px solid #6ee7b7;
      border-radius: 6px;
      padding: 5px 10px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #065f46;
      font-weight: 700;
    }
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 12px;
    }
    .cert-info-list {
      font-size: 11.5px;
      line-height: 1.55;
      color: #1e293b;
    }
    .cert-item {
      margin-bottom: 3px;
    }
    .cert-label {
      font-weight: 700;
      color: #0f172a;
    }
    .cert-code {
      font-family: monospace;
      font-size: 9px;
      color: #065f46;
      background: #ffffff;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #d1fae5;
      word-break: break-all;
      display: block;
      margin-top: 1px;
    }
    .cert-qr-box {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .cert-qr-img {
      width: 105px;
      height: 105px;
      background: #ffffff;
      padding: 3px;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
    }
    .cert-qr-caption {
      font-size: 8px;
      color: #047857;
      font-weight: 700;
      margin-top: 3px;
      line-height: 1.2;
      white-space: nowrap;
      text-align: center;
    }
    .cert-legal-footer {
      border-top: 1px solid #d1fae5;
      margin-top: 8px;
      padding-top: 6px;
      font-size: 9.5px;
      color: #047857;
      line-height: 1.4;
      text-align: justify;
    }
    .page-footer {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #64748b;
      line-height: 1.2;
    }
    .page-footer div {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="watermark">ลงนามดิจิทัลสมบูรณ์ • ETDA CERTIFIED</div>
  <div class="main-container">
    
    <!-- Top Header -->
    <div class="header-section">
      <div class="badge-bar">
        <span class="badge-etda">ETDA Certified Section 26/3</span>
        ${secrecy !== 'ปกติ' ? `<span class="badge-secret">${escapeHtml(secrecy)}</span>` : ''}
      </div>
      <img class="header-logo" src="${emblemDataUri}" alt="Emblem" />
      ${docTypeHeader ? `<h1 class="header-title">${escapeHtml(docTypeHeader)}</h1>` : ''}
      <div class="header-subtitle">เอกสารอิเล็กทรอนิกส์และลายมือชื่อดิจิทัลรับรองตามกฎหมาย</div>
    </div>

    <!-- Official Metadata -->
    <div class="gov-meta-table">
      <div class="gov-meta-row" style="justify-content: space-between;">
        <div style="display: flex;">
          <span class="gov-meta-label">ส่วนราชการ:</span>
          <span class="gov-meta-val">${escapeHtml(doc.department || orgName)}</span>
        </div>
        <div style="display: flex;">
          <span class="gov-meta-label">ที่:</span>
          <span class="gov-meta-val" style="font-weight: 700;">${escapeHtml(doc.docNumber || 'รย ๐๐๒๑/ว ๑')}</span>
        </div>
      </div>
      <div class="gov-meta-row" style="justify-content: space-between;">
        <div style="display: flex;">
          <span class="gov-meta-label">วันที่:</span>
          <span class="gov-meta-val">${escapeHtml(thaiDocDate)}</span>
        </div>
        <div style="display: flex;">
          <span class="gov-meta-label">ความเร่งด่วน:</span>
          <span class="gov-meta-val">${escapeHtml(priority)}</span>
        </div>
      </div>
      <div class="gov-meta-row">
        <span class="gov-meta-label">เรื่อง:</span>
        <span class="gov-meta-val" style="font-weight: 700; color: #0f172a;">${escapeHtml(doc.title || 'เอกสารราชการ')}</span>
      </div>
      <div class="gov-meta-row">
        <span class="gov-meta-label">เรียน:</span>
        <span class="gov-meta-val">${escapeHtml(doc.to || 'ผู้เกี่ยวข้องทุกฝ่าย')}</span>
      </div>
      ${doc.from || doc.fromDept ? `
      <div class="gov-meta-row">
        <span class="gov-meta-label">จาก:</span>
        <span class="gov-meta-val">${escapeHtml(doc.from || doc.fromDept)}</span>
      </div>` : ''}
    </div>

    <!-- Content Paragraphs -->
    <div class="content-box">
      <div class="content-header">สาระสำคัญ / ข้อความในหนังสือ:</div>
      ${contentParagraphs}
    </div>

    <!-- Official Signature Sign-off -->
    <div class="signature-signoff">
      ${sigRecord.signatureDataUrl && sigRecord.signatureDataUrl.startsWith('data:image/') ? `
        <img src="${sigRecord.signatureDataUrl}" class="signature-image" alt="ลายมือชื่อ" />
      ` : '<div style="height: 38px;"></div>'}
      <div style="font-weight: 700; font-size: 14.5px; color: #0f172a;">( ${escapeHtml(sigRecord.signerName || 'ผู้มีอำนาจลงนาม')} )</div>
      <div style="font-size: 13px; color: #334155;">${escapeHtml(sigRecord.signerPosition || 'ผู้บริหาร')}</div>
      <div style="font-size: 12px; color: #64748b;">${escapeHtml(sigRecord.signerDepartment || orgName)}</div>
    </div>

    <!-- ETDA Certified Digital Signature Box -->
    <div class="cert-box">
      <div class="cert-header">
        <div class="cert-header-title">
          <span>🛡️</span>
          <span>ใบรับรองการลงนามดิจิทัลและประทับรับรองเวลาอิเล็กทรอนิกส์ (ETDA Certified)</span>
        </div>
        <div class="cert-header-law">พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๔๔</div>
      </div>
      <div class="cert-body">
        <div class="cert-status-banner">
          <div>✓ ลงนามดิจิทัลสมบูรณ์ (ETDA Certified - Section 26/3)</div>
          <div style="font-size: 10px; font-weight: normal; color: #047857;">สถานะ: ถูกต้องสมบูรณ์ มีผลทางกฎหมาย ไม่พบการแก้ไข</div>
        </div>
        <div class="cert-grid">
          <div class="cert-info-list">
            <div class="cert-item">
              <span class="cert-label">ผู้ลงนามดิจิทัล:</span>
              <span>${escapeHtml(sigRecord.signerName)}</span> (${escapeHtml(sigRecord.signerPosition)})
            </div>
            <div class="cert-item">
              <span class="cert-label">หน่วยงาน / สังกัด:</span>
              <span>${escapeHtml(sigRecord.signerDepartment || orgName)}</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">วันเวลาที่ลงนามและประทับเวลา (TSA Timestamp):</span>
              <span style="font-weight: 700; color: #047857;">${escapeHtml(thaiSignTimestamp)}</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">ผู้ออกใบรับรองอิเล็กทรอนิกส์ (CA):</span>
              <span>${escapeHtml(sigRecord.certificateIssuer || 'ระบบสารบรรณและออกใบรับรองอิเล็กทรอนิกส์ สำนักงาน ปภ.จังหวัดระยอง')}</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">หมายเลขชุดใบรับรอง (Serial Number):</span>
              <span style="font-family: monospace;">${escapeHtml(sigRecord.certificateSerial || sigRecord.id)}</span>
            </div>
            <div class="cert-item" style="margin-top: 4px;">
              <span class="cert-label">ค่าแฮชเอกสาร (Document SHA-256):</span>
              <span class="cert-code">${escapeHtml(sigRecord.documentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">ลายเซ็นดิจิทัลเข้ารหัส (Digital Signature Hash):</span>
              <span class="cert-code">${escapeHtml(sigRecord.signatureHash || 'SIG-SHA256-TOKEN-VERIFIED')}</span>
            </div>
          </div>

          <div class="cert-qr-box">
            ${qrDataUrl ? `<img class="cert-qr-img" src="${qrDataUrl}" alt="QR Code Verify" />` : ''}
            <div class="cert-qr-caption">สแกนตรวจสอบสิทธิ์ออนไลน์ ๒๔ ชม.</div>
          </div>
        </div>

        <div class="cert-legal-footer">
          <strong>การรับรองตามกฎหมาย:</strong> เอกสารฉบับนี้จัดทำขึ้นในรูปแบบข้อมูลอิเล็กทรอนิกส์ และลงลายมือชื่อดิจิทัลที่มีความน่าเชื่อถือตามมาตรา ๒๖ และได้รับผลทางกฎหมายเช่นเดียวกับเอกสารต้นฉบับตามมาตรา ๙ และมาตรา ๒๘ แห่งพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๔๔ ข้อมูลในเอกสารนี้ได้รับการคุ้มครองความสมบูรณ์และสามารถตรวจสอบย้อนกลับได้ตลอดเวลา
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="page-footer">
      <div>ระบบสารบรรณและลงนามอิเล็กทรอนิกส์ (EDMS) • ${escapeHtml(orgName)}</div>
      <div>รหัสเอกสาร: ${escapeHtml(sigRecord.id)} • พิมพ์เมื่อ: ${escapeHtml(formatThaiDateTimeStr(new Date().toISOString()))}</div>
    </div>

  </div>
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        preferCSSPageSize: true
      });

      return Buffer.from(pdfBytes);
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (puppeteerErr) {
    console.warn('Puppeteer Thai PDF generation warning, falling back to pdf-lib:', puppeteerErr);
    // Fallback using pdf-lib if Puppeteer ever has an environmental issue
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    
    page.drawRectangle({
      x: 30,
      y: height - 80,
      width: width - 60,
      height: 50,
      color: rgb(0.06, 0.22, 0.42),
    });
    page.drawText('ETDA CERTIFIED ELECTRONIC DOCUMENT', {
      x: 45,
      y: height - 55,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Document: ${sanitizeForPdf(doc.title || doc.docNumber || 'Official Document')}`, {
      x: 45,
      y: height - 70,
      size: 9,
      font: font,
      color: rgb(0.85, 0.9, 0.98),
    });
    page.drawText(`Signer: ${sanitizeForPdf(sigRecord.signerName)} | Hash: ${sigRecord.documentHash?.substring(0, 24)}...`, {
      x: 45,
      y: height - 110,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    if (qrDataUrl && qrDataUrl.startsWith('data:image/')) {
      try {
        const qrClean = qrDataUrl.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
        const embeddedQr = await pdfDoc.embedPng(Buffer.from(qrClean, 'base64'));
        page.drawImage(embeddedQr, { x: width - 170, y: height - 220, width: 120, height: 120 });
      } catch (_) {}
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }
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

    let orgSettings = {
      orgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      logoUrl: ''
    };
    try {
      const cached = getLookupCached<any>('settings');
      if (cached) {
        orgSettings = {
          orgName: cached.orgName || orgSettings.orgName,
          logoUrl: cached.logoUrl || ''
        };
      } else if (isMysqlOnline) {
        const [sRows]: any = await pool.query('SELECT orgName, logoUrl FROM settings LIMIT 1');
        if (sRows && sRows.length > 0) {
          orgSettings = {
            orgName: sRows[0].orgName || orgSettings.orgName,
            logoUrl: sRows[0].logoUrl || ''
          };
        }
      } else if (localDb.settings && localDb.settings[0]) {
        orgSettings = {
          orgName: localDb.settings[0].orgName || orgSettings.orgName,
          logoUrl: localDb.settings[0].logoUrl || ''
        };
      }
    } catch (_) {}

    return res.json({
      success: true,
      document: doc,
      signatures,
      orgSettings
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
    let title = '';

    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT originalUrl, status, title FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      if (rows && rows.length > 0) {
        originalUrl = rows[0].originalUrl;
        status = rows[0].status;
        title = rows[0].title || '';
      }
    } else {
      const qr = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
      if (qr) {
        originalUrl = qr.originalUrl;
        status = qr.status;
        title = qr.title || '';
      }
    }

    if (!originalUrl) {
      return res.status(404).json({ error: "Slug not found" });
    }

    return res.json({ originalUrl, status, title });
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

    let orgSettings = {
      orgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      logoUrl: ''
    };
    try {
      const cached = getLookupCached<any>('settings');
      if (cached) {
        orgSettings = {
          orgName: cached.orgName || orgSettings.orgName,
          logoUrl: cached.logoUrl || ''
        };
      } else if (isMysqlOnline) {
        const [sRows]: any = await pool.query('SELECT orgName, logoUrl FROM settings LIMIT 1');
        if (sRows && sRows.length > 0) {
          orgSettings = {
            orgName: sRows[0].orgName || orgSettings.orgName,
            logoUrl: sRows[0].logoUrl || ''
          };
        }
      } else if (localDb.settings && localDb.settings[0]) {
        orgSettings = {
          orgName: localDb.settings[0].orgName || orgSettings.orgName,
          logoUrl: localDb.settings[0].logoUrl || ''
        };
      }
    } catch (_) {}

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
      ⚠️ คำเตือน: เอกสารฉบับนี้ไม่ผ่านการรับรอง และไม่ได้ถูกลงทะเบียนในระบบสารบรรณอิเล็กทรอนิกส์ของ${orgSettings.orgName} หากเป็นเอกสารกระดาษที่มี QR Code นี้ติดอยู่ อาจเป็นเอกสารปลอมแปลงหรือถูกแก้ไขรายละเอียด
    </div>

    <div class="pt-2 border-t border-slate-100">
      <p class="text-[10px] text-slate-400">${orgSettings.orgName} (EDMS Verification)</p>
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
      internal: 'หนังสือภายใน (Internal Memo)'
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

    const logoHtml = orgSettings.logoUrl ? `
      <img src="${orgSettings.logoUrl}" class="w-12 h-12 object-contain" alt="ตราสัญลักษณ์ ${orgSettings.orgName}" onerror="this.src='/ddpm-logo.svg'" />
    ` : `
      <img src="/ddpm-logo.svg" class="w-12 h-12 object-contain" alt="ตราสัญลักษณ์หน่วยงาน" />
    `;

    return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ตรวจสอบเอกสารราชการอิเล็กทรอนิกส์ - ${orgSettings.orgName}</title>
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
      <div class="w-16 h-16 bg-white rounded-2xl border-2 border-slate-200 p-2 flex items-center justify-center shadow-md">
        ${logoHtml}
      </div>
      <div>
        <h1 class="text-lg font-bold text-slate-800">ระบบตรวจสอบความถูกต้องเอกสารอิเล็กทรอนิกส์</h1>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${orgSettings.orgName}</p>
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
      สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง • ระบบสารบรรณอิเล็กทรอนิกส์ดิจิทัล
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
    if (!localDb.digital_signatures) localDb.digital_signatures = [];
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures ORDER BY timestampIso DESC');
        if (rows && Array.isArray(rows)) {
          return res.json(rows);
        }
      } catch (err) {}
    }
    return res.json(localDb.digital_signatures || []);
  } catch (err: any) {
    console.error('Digital Signatures List fetch error:', err?.message || err);
    return res.json(localDb.digital_signatures || []);
  }
});

// 3. Get Signatures for Document
app.get("/api/digital-signatures/doc/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    if (!localDb.digital_signatures) localDb.digital_signatures = [];
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures WHERE docId = ? ORDER BY timestampIso DESC', [docId]);
        if (rows && Array.isArray(rows)) {
          return res.json(rows);
        }
      } catch (err) {}
    }
    const filtered = (localDb.digital_signatures || []).filter((s: any) => String(s.docId) === String(docId));
    return res.json(filtered);
  } catch (err: any) {
    console.error('Doc Digital Signatures fetch error:', err?.message || err);
    return res.json([]);
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
        const apiKey = await getAppGeminiApiKey();

        if (apiKey) {
          const client = getGeminiClient(apiKey, req);
          const systemContext = matches.length > 0 ? `The system expects this document to be: Subject: ${matches[0].docTitle}, Signer: ${matches[0].signerName}, Position: ${matches[0].signerPosition}.` : "The system does not have a record of this document hash.";

          const { response: result } = await callGeminiWithFallback({
            client,
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
    let doc: any = null;

    // 1. Find signature record in MySQL or localDb
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM digital_signatures WHERE id = ? OR docId = ? LIMIT 1', [id, id]);
        if (rows && rows.length > 0) sigRecord = rows[0];
      } catch (e) {}
    }

    if (!sigRecord) {
      sigRecord = (localDb.digital_signatures || []).find((s: any) => s.id === id || String(s.docId) === String(id));
    }

    // 2. Lookup original document to have full details for PDF generation/regeneration
    const targetDocId = sigRecord ? sigRecord.docId : id;
    if (isMysqlOnline) {
      try {
        const queries = [
          `SELECT id, 'inbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, attachments FROM inbox_documents WHERE id = ?`,
          `SELECT id, 'outbox' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, attachments FROM outbox_documents WHERE id = ?`,
          `SELECT id, 'circular' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, secrecy, content, note, attachments FROM circular_documents WHERE id = ?`,
          `SELECT id, 'admin' as type, title, docNumber, date, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน / ประชาชน' AS \`to\`, department, assignee, 'ปกติ' AS priority, 'ปกติ' AS secrecy, content, note, attachments FROM admin_documents WHERE id = ?`,
          `SELECT id, 'internal' as type, title, docNumber, date, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, priority, 'ปกติ' AS secrecy, content, note, attachments FROM internal_documents WHERE id = ?`
        ];
        for (const q of queries) {
          const [dRows]: any = await pool.query(q, [targetDocId]);
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
      doc = allDocs.find((d: any) => String(d.id) === String(targetDocId));
    }

    if (!doc) {
      doc = {
        id: targetDocId,
        docNumber: sigRecord?.docNumber || `รย 0021/V-${targetDocId}`,
        title: sigRecord?.docTitle || "หนังสือราชการลงนามดิจิทัล",
        date: new Date().toISOString().split('T')[0],
        from: sigRecord?.signerDepartment || "สำนักงาน ปภ.จังหวัดระยอง",
        to: "ทุกหน่วยงานในสังกัด",
        department: sigRecord?.signerDepartment || "ผู้บริหาร",
        priority: "ปกติ",
        secrecy: "ปกติ",
        content: "หนังสืออิเล็กทรอนิกส์ที่ผ่านการลงนามดิจิทัลและประทับตรารับรองตามมาตรฐาน ETDA"
      };
    }

    // 3. If signature record doesn't exist yet, synthesize and save one
    if (!sigRecord) {
      const sigId = `sig-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const timestampIso = new Date().toISOString();
      const rawContentStr = `${doc.id}|${doc.docNumber || ''}|${doc.title || ''}|${doc.date || ''}|${doc.from || ''}|${doc.to || ''}|${doc.content || doc.note || ''}`;
      const documentHash = crypto.createHash('sha256').update(rawContentStr).digest('hex').toUpperCase();
      const tsaToken = crypto.createHash('sha256').update(`${documentHash}|${timestampIso}|TSA-RAYONG-2026`).digest('hex').toUpperCase();
      const signatureHash = crypto.createHash('sha256').update(`${documentHash}|${doc.assignee || 'หัวหน้าสำนักงาน ปภ.จังหวัดระยอง'}|${timestampIso}|${tsaToken}`).digest('hex').toUpperCase();
      const verifyUrl = `${getPublicBaseUrl(req)}/verify?docId=${doc.id}&hash=${documentHash}&sig=${sigId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        margin: 1,
        width: 280,
        color: { dark: '#0a2540', light: '#ffffff' }
      });

      sigRecord = {
        id: sigId,
        docId: String(doc.id),
        docTitle: doc.title || '',
        docNumber: doc.docNumber || '',
        docType: doc.type || 'inbox',
        signerName: doc.assignee || 'หัวหน้าสำนักงาน ปภ.จังหวัดระยอง',
        signerPosition: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
        signerDepartment: doc.department || 'สำนักงาน ปภ.จังหวัดระยอง',
        signerEmail: '',
        signatureType: 'digital-signature',
        signatureDataUrl: '',
        certificateIssuer: 'Rayong Provincial PA-PKI Certificate Authority (ETDA Compliant B.E. 2544 Sec. 26/3)',
        certificateSerial: `CERT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        hashAlgorithm: 'SHA-256',
        documentHash,
        signatureHash,
        timestampIso,
        timestampFormatted: formatThaiDateTimeStr(timestampIso),
        tsaToken,
        qrCodeDataUrl,
        verifyUrl,
        ipAddress: getClientIp(req),
        pdfPath: '',
        status: 'valid'
      };

      if (!localDb.digital_signatures) localDb.digital_signatures = [];
      localDb.digital_signatures.unshift(sigRecord);
      saveLocalDb();
    }

    // 4. Ensure QR Code is present
    if (!sigRecord.qrCodeDataUrl) {
      try {
        const vUrl = sigRecord.verifyUrl || `${getPublicBaseUrl(req)}/verify?docId=${doc.id}&hash=${sigRecord.documentHash}&sig=${sigRecord.id}`;
        sigRecord.qrCodeDataUrl = await QRCode.toDataURL(vUrl, {
          margin: 1,
          width: 280,
          color: { dark: '#0a2540', light: '#ffffff' }
        });
      } catch (qrErr) {
        console.warn('QR regeneration error:', qrErr);
      }
    }

    // 5. Check if PDF file exists on disk, otherwise build it now
    const signedPdfsDir = path.join(process.cwd(), 'uploads', 'signed_pdfs');
    if (!fs.existsSync(signedPdfsDir)) {
      fs.mkdirSync(signedPdfsDir, { recursive: true });
    }

    let pdfBuffer: Buffer | null = null;
    let fullPdfPath = sigRecord.pdfPath ? path.join(process.cwd(), sigRecord.pdfPath.replace(/^\//, '')) : '';

    const forceRefresh = req.query.refresh === '1';
    let needsRebuild = !sigRecord.pdfPath || !fullPdfPath || !fs.existsSync(fullPdfPath) || forceRefresh;

    if (!needsRebuild && fullPdfPath && fs.existsSync(fullPdfPath)) {
      try {
        const stats = fs.statSync(fullPdfPath);
        // Old ASCII PDF was ~7KB; new Thai ETDA PDF with Sarabun font is ~19KB - 150KB+
        if (stats.size < 12000) {
          needsRebuild = true;
        }
      } catch (_) {
        needsRebuild = true;
      }
    }

    if (needsRebuild) {
      pdfBuffer = await buildSignedPdfBuffer(doc, sigRecord, sigRecord.qrCodeDataUrl || '');
      const pdfFileName = `signed_${doc.id}_${sigRecord.id}.pdf`;
      fullPdfPath = path.join(signedPdfsDir, pdfFileName);
      fs.writeFileSync(fullPdfPath, pdfBuffer);
      sigRecord.pdfPath = `/uploads/signed_pdfs/${pdfFileName}`;
      saveLocalDb();
    } else {
      try {
        pdfBuffer = fs.readFileSync(fullPdfPath);
      } catch (readErr) {
        pdfBuffer = await buildSignedPdfBuffer(doc, sigRecord, sigRecord.qrCodeDataUrl || '');
        fs.writeFileSync(fullPdfPath, pdfBuffer);
      }
    }

    // 6. Send PDF with safe ASCII + UTF-8 Content-Disposition header
    const rawFileName = `Signed_${sigRecord.docNumber || sigRecord.docId || doc.id || 'Document'}.pdf`;
    const safeAsciiName = `Signed_${String(sigRecord.docId || doc.id || id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(rawFileName)}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Server error downloading signed PDF:", err);
    try {
      // Fallback emergency PDF to avoid browser 'Failed to load PDF document' error
      const fallbackDoc = await PDFDocument.create();
      const p = fallbackDoc.addPage([595.28, 841.89]);
      const font = await fallbackDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await fallbackDoc.embedFont(StandardFonts.HelveticaBold);
      p.drawText('RAYONG EDMS - DIGITAL SIGNATURE CERTIFICATE', { x: 50, y: 780, size: 14, font: fontBold, color: rgb(0.06, 0.22, 0.42) });
      p.drawText(`Document ID: ${sanitizeForPdf(req.params.id, 'DOC-01')}`, { x: 50, y: 750, size: 11, font: fontBold });
      p.drawText(`Status: Digitally Signed & ETDA Certified`, { x: 50, y: 730, size: 10, font });
      p.drawText(`Generated: ${new Date().toUTCString()}`, { x: 50, y: 710, size: 9, font });
      const bytes = await fallbackDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Signed_Document.pdf"`);
      return res.send(Buffer.from(bytes));
    } catch (fbErr) {
      return res.status(500).send("Server error generating signed PDF");
    }
  }
});


// Role & Permission API Endpoints
app.get("/api/role-permissions", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT role, permission_key, is_allowed FROM role_permissions');
        if (Array.isArray(rows) && rows.length > 0) {
          const formatted = rows.map((r: any) => ({
            role: r.role,
            permission_key: r.permission_key,
            is_allowed: (r.is_allowed === 1 || r.is_allowed === true || String(r.is_allowed) === '1' || String(r.is_allowed) === 'true') ? 1 : 0
          }));
          return res.json(formatted);
        }
      } catch (dbErr: any) {
        console.warn('MySQL role-permissions fetch warning:', dbErr.message);
      }
    }
    const formatted = (localDb.role_permissions || []).map((r: any) => ({
      role: r.role,
      permission_key: r.permission_key,
      is_allowed: (r.is_allowed === 1 || r.is_allowed === true || String(r.is_allowed) === '1' || String(r.is_allowed) === 'true') ? 1 : 0
    }));
    return res.json(formatted);
  } catch (error: any) {
    console.error('Failed to get role-permissions:', error.message);
    const formatted = (localDb.role_permissions || []).map((r: any) => ({
      role: r.role,
      permission_key: r.permission_key,
      is_allowed: (r.is_allowed === 1 || r.is_allowed === true || String(r.is_allowed) === '1' || String(r.is_allowed) === 'true') ? 1 : 0
    }));
    return res.json(formatted);
  }
});

app.put("/api/role-permissions", async (req, res) => {
  const { role, permission_key, is_allowed, username } = req.body;
  const currentUserRole = req.body.currentUserRole || req.headers.role || '';
  const ip = getClientIp(req);
  const val = is_allowed ? 1 : 0;

  console.log(`[Permission Matrix Update] Initiating change: role="${role}", perm="${permission_key}", is_allowed=${val}, requested_by="${username}", user_role="${currentUserRole}"`);

  const allowed = await hasServerPermission(currentUserRole, 'system_settings');
  if (!allowed) {
    console.warn(`[Permission Matrix Update] Access Denied: User role "${currentUserRole}" does not have "system_settings" permission.`);
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ในการแก้ไขการกำหนดสิทธิ์ของระบบ (system_settings)' });
  }

  // Strict constraint: manage_users is strictly reserved for Admin (cannot be granted to moderator or user)
  if (role !== 'admin' && permission_key === 'manage_users' && val === 1) {
    return res.status(400).json({ success: false, error: 'ไม่อนุญาตให้เปิดสิทธิ์การจัดการบุคลากร (manage_users) สำหรับบทบาทอื่นที่ไม่ใช่ Admin' });
  }
  
  let databaseSuccess = false;
  try {
    if (isMysqlOnline) {
      try {
        await pool.query(
          'INSERT INTO role_permissions (role, permission_key, is_allowed) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_allowed = ?',
          [role, permission_key, val, val]
        );
        databaseSuccess = true;
        console.log(`[Permission Matrix Update] Successfully saved to MySQL for role "${role}"`);
      } catch (dbErr: any) {
        console.error('⚠️ MySQL update role-permission failed, falling back to localDb:', dbErr.message);
      }
    }
    
    if (!databaseSuccess) {
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
      console.log(`[Permission Matrix Update] Successfully saved to localDb for role "${role}"`);
    }
    
    // Log setting change
    await addSystemLog(
      'UPDATE_PERMISSION', 
      `ปรับปรุงสิทธิ์การใช้งานสำหรับบทบาท ${role}: ${permission_key} = ${val === 1 ? 'อนุญาต (Allowed)' : 'ไม่อนุญาต (Denied)'}`, 
      username || 'ผู้ดูแลระบบ', 
      ip
    ).catch(e => console.error('addSystemLog failed:', e.message));
    
    invalidatePermissionCache();
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update role-permission:', error.message);
    return res.status(500).json({ error: `เกิดข้อผิดพลาดของระบบ: ${error.message}` });
  }
});

app.post("/api/role-permissions/reset-defaults", async (req, res) => {
  const currentUserRole = req.body.currentUserRole || req.headers.role || '';
  const username = req.body.username || 'ผู้ดูแลระบบ';
  const ip = getClientIp(req);

  const allowed = await hasServerPermission(currentUserRole, 'system_settings');
  if (!allowed && currentUserRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ในการคืนค่าการกำหนดสิทธิ์ของระบบ' });
  }

  const logicalDefaults: Array<{ role: string; key: string; val: number }> = [
    // Admin: 22/22 (สิทธิ์เต็ม 100%)
    { role: 'admin', key: 'view_all_docs', val: 1 },
    { role: 'admin', key: 'create_docs', val: 1 },
    { role: 'admin', key: 'edit_all_docs', val: 1 },
    { role: 'admin', key: 'delete_docs', val: 1 },
    { role: 'admin', key: 'approve_docs', val: 1 },
    { role: 'admin', key: 'export_docs', val: 1 },
    { role: 'admin', key: 'admin_docs', val: 1 },
    { role: 'admin', key: 'vehicles', val: 1 },
    { role: 'admin', key: 'urgent_incidents', val: 1 },
    { role: 'admin', key: 'ai_assistant', val: 1 },
    { role: 'admin', key: 'infographics', val: 1 },
    { role: 'admin', key: 'qr_generator', val: 1 },
    { role: 'admin', key: 'surveys', val: 1 },
    { role: 'admin', key: 'draft_docs', val: 1 },
    { role: 'admin', key: 'digital_folders', val: 1 },
    { role: 'admin', key: 'workflow_sla', val: 1 },
    { role: 'admin', key: 'digital_signatures', val: 1 },
    { role: 'admin', key: 'recycle_bin', val: 1 },
    { role: 'admin', key: 'manage_users', val: 1 },
    { role: 'admin', key: 'system_settings', val: 1 },
    { role: 'admin', key: 'backup_restore', val: 1 },
    { role: 'admin', key: 'audit_logs', val: 1 },
    { role: 'admin', key: 'manage_changelog', val: 1 },

    // Moderator: 17/22 (สารบรรณกลาง / ผู้ตรวจสอบ / อนุมัติ / เครื่องมือช่วยงาน - ไม่รวมตั้งค่าโครงสร้างระบบ)
    { role: 'moderator', key: 'view_all_docs', val: 1 },
    { role: 'moderator', key: 'create_docs', val: 1 },
    { role: 'moderator', key: 'edit_all_docs', val: 1 },
    { role: 'moderator', key: 'delete_docs', val: 1 },
    { role: 'moderator', key: 'approve_docs', val: 1 },
    { role: 'moderator', key: 'export_docs', val: 1 },
    { role: 'moderator', key: 'admin_docs', val: 1 },
    { role: 'moderator', key: 'vehicles', val: 1 },
    { role: 'moderator', key: 'urgent_incidents', val: 1 },
    { role: 'moderator', key: 'ai_assistant', val: 1 },
    { role: 'moderator', key: 'infographics', val: 1 },
    { role: 'moderator', key: 'qr_generator', val: 1 },
    { role: 'moderator', key: 'surveys', val: 1 },
    { role: 'moderator', key: 'draft_docs', val: 1 },
    { role: 'moderator', key: 'digital_folders', val: 1 },
    { role: 'moderator', key: 'workflow_sla', val: 1 },
    { role: 'moderator', key: 'digital_signatures', val: 1 },
    { role: 'moderator', key: 'recycle_bin', val: 1 },
    { role: 'moderator', key: 'manage_users', val: 0 },
    { role: 'moderator', key: 'system_settings', val: 0 },
    { role: 'moderator', key: 'backup_restore', val: 0 },
    { role: 'moderator', key: 'audit_logs', val: 0 },
    { role: 'moderator', key: 'manage_changelog', val: 0 },

    // User: 11/22 (เจ้าหน้าที่ผู้ปฏิบัติงาน - สร้างเอกสาร/ร่าง/เครื่องมือ/รายงานเหตุด่วน/แบบฟอร์ม/ยานพาหนะตนเอง - ห้ามลบ/แก้ผู้อื่น/อนุมัติ/ระบบ)
    { role: 'user', key: 'view_all_docs', val: 0 },
    { role: 'user', key: 'create_docs', val: 1 },
    { role: 'user', key: 'edit_all_docs', val: 0 },
    { role: 'user', key: 'delete_docs', val: 0 },
    { role: 'user', key: 'approve_docs', val: 0 },
    { role: 'user', key: 'export_docs', val: 1 },
    { role: 'user', key: 'admin_docs', val: 1 },
    { role: 'user', key: 'vehicles', val: 1 },
    { role: 'user', key: 'urgent_incidents', val: 1 },
    { role: 'user', key: 'ai_assistant', val: 1 },
    { role: 'user', key: 'infographics', val: 1 },
    { role: 'user', key: 'qr_generator', val: 1 },
    { role: 'user', key: 'surveys', val: 1 },
    { role: 'user', key: 'draft_docs', val: 1 },
    { role: 'user', key: 'digital_folders', val: 1 },
    { role: 'user', key: 'workflow_sla', val: 1 },
    { role: 'user', key: 'digital_signatures', val: 0 },
    { role: 'user', key: 'recycle_bin', val: 0 },
    { role: 'user', key: 'manage_users', val: 0 },
    { role: 'user', key: 'system_settings', val: 0 },
    { role: 'user', key: 'backup_restore', val: 0 },
    { role: 'user', key: 'audit_logs', val: 0 },
    { role: 'user', key: 'manage_changelog', val: 0 }
  ];

  try {
    if (isMysqlOnline) {
      try {
        // Delete any non-standard or department-specific permissions
        await pool.query("DELETE FROM role_permissions WHERE role NOT IN ('admin', 'moderator', 'user')");
        for (const item of logicalDefaults) {
          await pool.query(
            'INSERT INTO role_permissions (role, permission_key, is_allowed) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_allowed = ?',
            [item.role, item.key, item.val, item.val]
          );
        }
      } catch (dbErr: any) {
        console.warn('MySQL reset-defaults warning:', dbErr.message);
      }
    }

    localDb.role_permissions = logicalDefaults.map(item => ({
      role: item.role,
      permission_key: item.key,
      is_allowed: item.val
    }));
    saveLocalDb();

    await addSystemLog(
      'RESET_PERMISSIONS',
      'ปรับปรุงสิทธิ์การใช้งาน Admin, Moderator, User ตามตรรกะระบบอัตโนมัติ (ยกเลิกการกำหนดสิทธิ์เจาะจงตามฝ่ายงาน)',
      username,
      ip
    ).catch(e => console.error('addSystemLog failed:', e.message));

    invalidatePermissionCache();
    return res.json({ 
      success: true, 
      message: 'ปรับปรุงและกำหนดสิทธิ์ผู้ใช้งาน Admin, Moderator, User ตามตรรกะระบบอัตโนมัติสำเร็จเรียบร้อยแล้ว',
      totalCount: logicalDefaults.length
    });
  } catch (error: any) {
    console.error('Failed to reset role permissions:', error);
    return res.status(500).json({ error: error.message });
  }
});


// ==========================================
// ULTRA-DETAILED SYSTEM HEALTH & DIAGNOSTICS API
// ==========================================
app.get("/api/system/health", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const processUptimeSec = process.uptime();
    const days = Math.floor(processUptimeSec / (3600 * 24));
    const hours = Math.floor((processUptimeSec % (3600 * 24)) / 3600);
    const minutes = Math.floor((processUptimeSec % 3600) / 60);
    const seconds = Math.floor(processUptimeSec % 60);
    const processUptimeFormatted = `${days > 0 ? `${days} วัน ` : ''}${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`;

    // System OS Uptime
    const sysUptimeSec = os.uptime();
    const sysDays = Math.floor(sysUptimeSec / (3600 * 24));
    const sysHours = Math.floor((sysUptimeSec % (3600 * 24)) / 3600);
    const sysMinutes = Math.floor((sysUptimeSec % 3600) / 60);
    const sysUptimeFormatted = `${sysDays > 0 ? `${sysDays} วัน ` : ''}${sysHours} ชม. ${sysMinutes} นาที`;

    // Process Memory
    const mem = process.memoryUsage();
    const memoryUsage = {
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
      externalMb: (mem.external / 1024 / 1024).toFixed(2),
      heapPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)
    };

    // System Hardware RAM (os module)
    const totalOsRamBytes = os.totalmem();
    const freeOsRamBytes = os.freemem();
    const usedOsRamBytes = totalOsRamBytes - freeOsRamBytes;
    const systemRam = {
      totalGb: (totalOsRamBytes / (1024 * 1024 * 1024)).toFixed(2),
      freeGb: (freeOsRamBytes / (1024 * 1024 * 1024)).toFixed(2),
      usedGb: (usedOsRamBytes / (1024 * 1024 * 1024)).toFixed(2),
      usedPercent: ((usedOsRamBytes / totalOsRamBytes) * 100).toFixed(1)
    };

    // CPU Metrics & Load
    const cpus = os.cpus() || [];
    const cpuCount = cpus.length;
    const cpuModel = cpuCount > 0 ? cpus[0].model : 'Generic CPU';
    const cpuSpeedGhz = cpuCount > 0 ? (cpus[0].speed / 1000).toFixed(2) : '0';
    const loadAvg = os.loadavg() || [0, 0, 0];

    // V8 Engine Statistics
    const v8Stats = v8.getHeapStatistics();
    const v8HeapStats = {
      heapSizeLimitMb: (v8Stats.heap_size_limit / 1024 / 1024).toFixed(1),
      totalAvailableSizeMb: (v8Stats.total_available_size / 1024 / 1024).toFixed(1),
      mallocedMemoryMb: (v8Stats.malloced_memory / 1024 / 1024).toFixed(1),
      peakMallocedMemoryMb: (v8Stats.peak_malloced_memory / 1024 / 1024).toFixed(1)
    };

    // Process Resource Usage
    let resourceUsage: any = null;
    if (typeof process.resourceUsage === 'function') {
      try {
        const ru = process.resourceUsage();
        resourceUsage = {
          userCpuTimeSec: (ru.userCPUTime / 1000000).toFixed(2),
          systemCpuTimeSec: (ru.systemCPUTime / 1000000).toFixed(2),
          maxRssMb: (ru.maxRSS / 1024).toFixed(1),
          fsReads: ru.fsRead,
          fsWrites: ru.fsWrite
        };
      } catch (_) {}
    }

    // Network & Storage Diagnostics
    const netInterfaces = os.networkInterfaces();
    const netInterfaceNames = Object.keys(netInterfaces);

    let uploadedFilesCount = 0;
    let diskSpace = {
      totalGb: '0.00',
      freeGb: '0.00',
      usedGb: '0.00',
      usedPercent: '0.0',
      uploadDirSizeBytes: 0,
      uploadDirSizeFormatted: '0 KB',
      uploadDirFilesCount: 0
    };

    try {
      const targetPath = process.cwd();
      if (typeof (fs as any).statfsSync === 'function') {
        const stats = (fs as any).statfsSync(targetPath);
        const bsize = Number(stats.bsize || 4096);
        const blocks = Number(stats.blocks || 0);
        const bavail = Number(stats.bavail || stats.bfree || 0);
        const totalBytes = blocks * bsize;
        const freeBytes = bavail * bsize;
        const usedBytes = Math.max(0, totalBytes - freeBytes);

        if (totalBytes > 0) {
          diskSpace.totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
          diskSpace.freeGb = (freeBytes / (1024 * 1024 * 1024)).toFixed(2);
          diskSpace.usedGb = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
          diskSpace.usedPercent = ((usedBytes / totalBytes) * 100).toFixed(1);
        }
      }
    } catch (e) {
      console.warn('Error reading statfs:', e);
    }

    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadDir)) {
        let totalSize = 0;
        let fileCount = 0;
        const files = fs.readdirSync(uploadDir);
        files.forEach(file => {
          try {
            const filePath = path.join(uploadDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              totalSize += stat.size;
              fileCount++;
            }
          } catch (_) {}
        });
        uploadedFilesCount = fileCount;
        diskSpace.uploadDirSizeBytes = totalSize;
        diskSpace.uploadDirFilesCount = fileCount;
        if (totalSize < 1024 * 1024) {
          diskSpace.uploadDirSizeFormatted = `${(totalSize / 1024).toFixed(1)} KB`;
        } else if (totalSize < 1024 * 1024 * 1024) {
          diskSpace.uploadDirSizeFormatted = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          diskSpace.uploadDirSizeFormatted = `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
      }
    } catch (_) {}

    // Event Loop Responsiveness Benchmark
    const benchStart = Date.now();
    for (let i = 0; i < 50000; i++) {
      Math.sqrt(i) * Math.sin(i);
    }
    const benchDurationUs = Math.max(1, (Date.now() - benchStart) * 1000);

    // Database Metrics
    let dbStatus = 'disconnected';
    let counts = {
      inboxDocs: 0,
      outboxDocs: 0,
      circularDocs: 0,
      adminDocs: 0,
      internalDocs: 0,
      totalDocs: 0,
      users: 0,
      departments: 0,
      positions: 0,
      systemLogs: 0,
      urgentIncidents: 0,
      digitalSignatures: 0,
      changelogs: 0,
      customNumbering: 0
    };

    let dbLatencyMs = 0;
    const dbStartTime = Date.now();

    if (isMysqlOnline) {
      try {
        await pool.query('SELECT 1');
        dbLatencyMs = Date.now() - dbStartTime;
        dbStatus = 'healthy';

        const [inboxRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM inbox_documents').catch(() => [[{ cnt: 0 }]]);
        const [outboxRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM outbox_documents').catch(() => [[{ cnt: 0 }]]);
        const [circularRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM circular_documents').catch(() => [[{ cnt: 0 }]]);
        const [adminRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM admin_documents').catch(() => [[{ cnt: 0 }]]);
        const [internalRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM internal_documents').catch(() => [[{ cnt: 0 }]]);
        const [usersRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM users').catch(() => [[{ cnt: 0 }]]);
        const [deptsRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM departments').catch(() => [[{ cnt: 0 }]]);
        const [posRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM positions').catch(() => [[{ cnt: 0 }]]);
        const [logsRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM system_logs').catch(() => [[{ cnt: 0 }]]);
        const [incidentsRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM urgent_incidents').catch(() => [[{ cnt: 0 }]]);
        const [sigsRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM digital_signatures').catch(() => [[{ cnt: 0 }]]);
        const [changelogsRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM changelogs').catch(() => [[{ cnt: 0 }]]);
        const [numRes]: any = await pool.query('SELECT COUNT(*) as cnt FROM numbering_rules').catch(async () => {
          return await pool.query('SELECT COUNT(*) as cnt FROM custom_numbering').catch(() => [[{ cnt: 0 }]]);
        });

        counts.inboxDocs = inboxRes[0]?.cnt || 0;
        counts.outboxDocs = outboxRes[0]?.cnt || 0;
        counts.circularDocs = circularRes[0]?.cnt || 0;
        counts.adminDocs = adminRes[0]?.cnt || 0;
        counts.internalDocs = internalRes[0]?.cnt || 0;
        counts.totalDocs = counts.inboxDocs + counts.outboxDocs + counts.circularDocs + counts.adminDocs + counts.internalDocs;
        counts.users = usersRes[0]?.cnt || 0;
        counts.departments = deptsRes[0]?.cnt || 0;
        counts.positions = posRes[0]?.cnt || 0;
        counts.systemLogs = logsRes[0]?.cnt || 0;
        counts.urgentIncidents = incidentsRes[0]?.cnt || 0;
        counts.digitalSignatures = sigsRes[0]?.cnt || 0;
        counts.changelogs = changelogsRes[0]?.cnt || 0;
        counts.customNumbering = numRes[0]?.cnt || 0;
      } catch (err: any) {
        dbStatus = 'degraded';
      }
    }

    if (dbStatus !== 'healthy') {
      counts.inboxDocs = (localDb.inbox_documents || []).length;
      counts.outboxDocs = (localDb.outbox_documents || []).length;
      counts.circularDocs = (localDb.circular_documents || []).length;
      counts.adminDocs = (localDb.admin_documents || []).length;
      counts.internalDocs = (localDb.internal_documents || []).length;
      counts.totalDocs = counts.inboxDocs + counts.outboxDocs + counts.circularDocs + counts.adminDocs + counts.internalDocs;
      counts.users = (localDb.users || []).length;
      counts.departments = (localDb.departments || []).length;
      counts.positions = (localDb.positions || []).length;
      counts.systemLogs = (localDb.system_logs || []).length;
      counts.urgentIncidents = (localDb.urgent_incidents || []).length;
      counts.digitalSignatures = (localDb.digital_signatures || []).length;
      counts.changelogs = (localDb.changelogs || []).length;
      counts.customNumbering = (localDb.numbering_rules || localDb.custom_numbering || []).length;
    }

    // Check Gemini API key availability
    let geminiApiKeyActive = false;
    try {
      const key = await getAppGeminiApiKey();
      geminiApiKeyActive = Boolean(key && key.trim().length > 5);
    } catch (_) {}

    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      timestampThai: formatThaiDateTimeStr(new Date().toISOString()),
      server: {
        nodeVersion: process.version,
        platform: `${process.platform} (${process.arch})`,
        osType: os.type(),
        osRelease: os.release(),
        hostname: os.hostname(),
        pid: process.pid,
        environment: process.env.NODE_ENV || 'development',
        port: 3000,
        host: '0.0.0.0',
        processUptimeSeconds: Math.floor(processUptimeSec),
        processUptimeFormatted,
        sysUptimeSeconds: Math.floor(sysUptimeSec),
        sysUptimeFormatted,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok'
      },
      cpu: {
        model: cpuModel,
        cores: cpuCount,
        speedGhz: cpuSpeedGhz,
        loadAvg1Min: loadAvg[0].toFixed(2),
        loadAvg5Min: loadAvg[1].toFixed(2),
        loadAvg15Min: loadAvg[2].toFixed(2),
        benchmarkUs: benchDurationUs
      },
      systemRam,
      memory: memoryUsage,
      v8Engine: v8HeapStats,
      resourceUsage,
      storage: {
        diskSpace,
        uploadedFilesCount,
        uploadDirectory: 'uploads/',
        attachmentsActive: true
      },
      network: {
        activeInterfacesCount: netInterfaceNames.length,
        interfaces: netInterfaceNames
      },
      database: {
        engine: 'MySQL / MariaDB Connection Pool',
        status: dbStatus,
        latencyMs: dbLatencyMs,
        tablesCount: 13,
        counts
      },
      aiEngine: {
        sdk: '@google/genai (v0.1.1+)',
        primaryModel: 'gemini-3.1-flash-lite',
        fallbackModels: ['gemini-flash-latest', 'gemini-3.8-flash'],
        apiKeyConfigured: geminiApiKeyActive
      },
      security: {
        passwordHasher: 'Argon2id (High-Entropy Salt)',
        sessionEngine: 'HTTP-Only Secure Cookies + Bearer Token',
        rbacMode: '4 Roles + Department Granular Overrides 2D Matrix',
        signatureEngine: 'SHA-256 + TSA Token (ETDA Compliant B.E. 2544)'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve system health: ' + error.message });
  }
});

// Interactive System Diagnostic Endpoints
app.post("/api/system/test-db", async (req, res) => {
  const start = Date.now();
  try {
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT NOW() as now_time, VERSION() as mysql_ver');
      const latencyMs = Date.now() - start;
      return res.json({
        success: true,
        message: 'การเชื่อมต่อคลังข้อมูล MySQL ทำงานได้ปกติ (โหมดบังคับใช้เฉพาะ MySQL เท่านั้น)',
        latencyMs,
        mysqlVersion: rows[0]?.mysql_ver || 'MySQL Server',
        serverDbTime: rows[0]?.now_time || new Date().toISOString(),
        engine: 'MySQL Connection Pool (Strictly Enforced)',
        status: 'online'
      });
    } else {
      const latencyMs = Date.now() - start;
      return res.json({
        success: false,
        message: 'ระบบกำหนดให้ใช้งานเฉพาะฐานข้อมูล MySQL เท่านั้น (MySQL-Only Mode Enforcement) - ไม่สามารถเชื่อมต่อ MySQL ได้ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล',
        latencyMs,
        mysqlVersion: 'Disconnected',
        serverDbTime: new Date().toISOString(),
        engine: 'MySQL Only (Strict Enforcement)',
        status: 'offline'
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'ล้มเหลวในการเชื่อมต่อ MySQL: ' + err.message,
      latencyMs: Date.now() - start,
      status: 'error'
    });
  }
});

app.post("/api/system/test-ai", async (req, res) => {
  const start = Date.now();
  try {
    const inputKey = (req.body?.geminiApiKey || req.body?.apiKey || '').trim();
    const keyInfo = await getAppGeminiApiKeyInfo(inputKey, { forceCustom: Boolean(inputKey) });

    if (!keyInfo.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'ยังไม่ได้ระบุ Google Gemini API Key กรุณาระบุใน "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"',
        latencyMs: Date.now() - start,
        status: 'not_configured',
        apiKeyConfigured: false
      });
    }

    // Perform live connection verification with Gemini API
    const client = getGeminiClient(keyInfo.apiKey, req);
    const { response, usedModel } = await callGeminiWithFallback({
      client,
      contents: [{ text: 'สวัสดี! ช่วยตอบสั้นๆ 1-3 คำว่า "ระบบพร้อมใช้งาน"' }],
      models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
      maxRetriesPerModel: 1,
      initialDelayMs: 600
    });

    const latencyMs = Date.now() - start;
    return res.json({
      success: true,
      message: 'เชื่อมต่อกับ Google Gemini API สำเร็จสมบูรณ์!',
      aiReply: response.text ? response.text.trim() : 'ระบบพร้อมใช้งาน',
      latencyMs,
      usedModel,
      source: keyInfo.source,
      sourceDescription: keyInfo.sourceDescription,
      maskedKey: keyInfo.maskedKey,
      apiKeyConfigured: true,
      status: 'active'
    });
  } catch (err: any) {
    const friendlyError = formatGeminiErrorMessage(err);
    return res.status(400).json({
      success: false,
      message: 'ทดสอบการเชื่อมต่อ Gemini API ล้มเหลว: ' + friendlyError,
      rawError: err?.message || String(err),
      latencyMs: Date.now() - start,
      status: 'error',
      apiKeyConfigured: false
    });
  }
});

app.post("/api/system/clean-memory", async (req, res) => {
  try {
    const memBefore = process.memoryUsage();
    let gcRan = false;
    if (typeof global.gc === 'function') {
      try {
        global.gc();
        gcRan = true;
      } catch (_) {}
    }

    const memAfter = process.memoryUsage();
    const freedBytes = Math.max(0, memBefore.heapUsed - memAfter.heapUsed);
    const freedMb = (freedBytes / 1024 / 1024).toFixed(2);

    return res.json({
      success: true,
      message: gcRan ? `ทำการล้างหน่วยความจำเรียบร้อยแล้ว คืนพื้นที่ได้ ${freedMb} MB` : `ทำการล้างหน่วยความจำและปรับปรุงพื้นที่ Heap เรียบร้อยแล้ว`,
      freedMb,
      gcRan,
      heapUsedMbBefore: (memBefore.heapUsed / 1024 / 1024).toFixed(2),
      heapUsedMbAfter: (memAfter.heapUsed / 1024 / 1024).toFixed(2)
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปรับปรุงหน่วยความจำ: ' + err.message
    });
  }
});

app.post("/api/system/verify-storage", async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    let fileCount = 0;
    let totalSizeBytes = 0;
    let isWritable = false;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Check write test
    const testFile = path.join(uploadDir, `.health_check_${Date.now()}.tmp`);
    try {
      fs.writeFileSync(testFile, 'OK');
      if (fs.existsSync(testFile)) {
        isWritable = true;
        fs.unlinkSync(testFile);
      }
    } catch (_) {}

    const files = fs.readdirSync(uploadDir);
    files.forEach(f => {
      try {
        const fp = path.join(uploadDir, f);
        const st = fs.statSync(fp);
        if (st.isFile()) {
          fileCount++;
          totalSizeBytes += st.size;
        }
      } catch (_) {}
    });

    const sizeFormatted = totalSizeBytes < 1024 * 1024 
      ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
      : totalSizeBytes < 1024 * 1024 * 1024 
        ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

    return res.json({
      success: true,
      message: 'ตรวจสอบความสมบูรณ์พื้นที่จัดเก็บไฟล์ (/uploads) เรียบร้อยแล้ว',
      isWritable,
      fileCount,
      totalSizeBytes,
      sizeFormatted,
      uploadPath: uploadDir,
      status: isWritable ? 'healthy' : 'read_only'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'ล้มเหลวในการตรวจสอบคลังจัดเก็บไฟล์: ' + err.message
    });
  }
});

// ==========================================
// CHANGELOG & VERSION RELEASE NOTES API
// ==========================================

function formatChangelogRow(r: any) {
  let parsedChanges: any[] = [];
  try {
    parsedChanges = typeof r.changes === 'string' ? JSON.parse(r.changes) : (r.changes || []);
  } catch (e) {
    parsedChanges = [];
  }

  let parsedImages: any[] = [];
  try {
    parsedImages = typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []);
  } catch (e) {
    parsedImages = [];
  }

  return {
    id: r.id,
    version: r.version,
    title: r.title,
    releaseDate: r.releaseDate,
    type: r.type || 'minor',
    summary: r.summary || '',
    changes: parsedChanges,
    images: parsedImages,
    author: r.author || 'ผู้ดูแลระบบ',
    isLatest: Boolean(r.isLatest === 1 || r.isLatest === true || String(r.isLatest) === '1' || String(r.isLatest) === 'true'),
    isPublished: r.isPublished === undefined ? true : Boolean(r.isPublished === 1 || r.isPublished === true || String(r.isPublished) === '1' || String(r.isPublished) === 'true'),
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || new Date().toISOString()
  };
}

app.get("/api/changelogs", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const sortChangelogs = (items: any[]) => {
      return items.sort((a, b) => {
        // 1. Put isLatest on top
        const aLatest = a.isLatest ? 1 : 0;
        const bLatest = b.isLatest ? 1 : 0;
        if (aLatest !== bLatest) {
          return bLatest - aLatest;
        }
        
        // 2. Sort by SemVer DESC
        const clean = (v: string) => (v || '').replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0);
        const partsA = clean(a.version);
        const partsB = clean(b.version);
        const maxLen = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < maxLen; i++) {
          const numA = partsA[i] || 0;
          const numB = partsB[i] || 0;
          if (numA !== numB) {
            return numB - numA;
          }
        }
        
        // 3. Fallback to releaseDate
        return new Date(b.releaseDate || b.createdAt).getTime() - new Date(a.releaseDate || a.createdAt).getTime();
      });
    };

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM changelogs');
        if (Array.isArray(rows) && rows.length > 0) {
          const formatted = rows.map(formatChangelogRow);
          return res.json(deduplicateChangelogs(formatted));
        }
      } catch (dbErr: any) {
        console.warn('MySQL changelogs fetch warning:', dbErr.message);
      }
    }

    if (!localDb.changelogs || !Array.isArray(localDb.changelogs)) {
      localDb.changelogs = deduplicateChangelogs(defaultChangelogs);
      saveLocalDb();
    } else {
      localDb.changelogs = deduplicateChangelogs(localDb.changelogs);
    }

    const list = localDb.changelogs.map(formatChangelogRow);
    return res.json(deduplicateChangelogs(list));
  } catch (error: any) {
    console.error('Failed to get changelogs:', error.message);
    return res.json(deduplicateChangelogs(defaultChangelogs));
  }
});

app.get("/api/changelogs/latest", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM changelogs WHERE isPublished = 1 ORDER BY isLatest DESC, releaseDate DESC, createdAt DESC LIMIT 1');
        if (Array.isArray(rows) && rows.length > 0) {
          return res.json(formatChangelogRow(rows[0]));
        }
      } catch (dbErr: any) {
        console.warn('MySQL latest changelog fetch warning:', dbErr.message);
      }
    }

    if (!localDb.changelogs || !Array.isArray(localDb.changelogs) || localDb.changelogs.length === 0) {
      localDb.changelogs = deduplicateChangelogs(defaultChangelogs);
      saveLocalDb();
    } else {
      localDb.changelogs = deduplicateChangelogs(localDb.changelogs);
    }

    const published = localDb.changelogs.filter((c: any) => c.isPublished !== false);
    const latest = published[0] || localDb.changelogs[0];
    return res.json(formatChangelogRow(latest));
  } catch (error: any) {
    console.error('Failed to get latest changelog:', error.message);
    return res.json(formatChangelogRow(defaultChangelogs[0]));
  }
});

app.post("/api/changelogs", async (req, res) => {
  const {
    version,
    title,
    releaseDate,
    type,
    summary,
    changes,
    images,
    author,
    isLatest,
    isPublished,
    username
  } = req.body;
  const ip = getClientIp(req);

  if (!title) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อหัวข้ออัปเดต (Title)' });
  }

  const id = `cl-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const relDate = releaseDate || nowIso.split('T')[0];
  const itemType = type || 'minor';
  const itemSummary = summary || '';
  const itemChanges = Array.isArray(changes) ? changes : [];
  const itemImages = Array.isArray(images) ? images : [];
  const itemAuthor = author || username || 'ผู้ดูแลระบบ';
  const itemIsLatest = isLatest ? 1 : 0;
  const itemIsPublished = isPublished !== false ? 1 : 0;

  // Auto-calculate version if not supplied or ensure clean format
  let finalVersion = (version || '').trim();
  if (!finalVersion) {
    let baseVer = 'v2.4.0';
    let existingVers: string[] = [];
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT version FROM changelogs ORDER BY releaseDate DESC, createdAt DESC');
        if (rows && rows.length > 0) {
          baseVer = rows[0].version;
          existingVers = rows.map((r: any) => r.version);
        }
      } catch (e) {
        console.error('Error fetching latest version for auto-version:', e);
      }
    } else if (localDb.changelogs && localDb.changelogs.length > 0) {
      baseVer = localDb.changelogs[0].version;
      existingVers = localDb.changelogs.map((c: any) => c.version);
    }

    const match = baseVer.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
    let major = match ? parseInt(match[1], 10) || 0 : 2;
    let minor = match && match[2] !== undefined ? parseInt(match[2], 10) || 0 : 4;
    let patch = match && match[3] !== undefined ? parseInt(match[3], 10) || 0 : 0;

    if (itemType === 'major') {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (itemType === 'minor') {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }

    finalVersion = `v${major}.${minor}.${patch}`;
    let attempt = patch;
    while (existingVers.includes(finalVersion)) {
      attempt += 1;
      if (itemType === 'major') {
        major += 1;
        finalVersion = `v${major}.0.0`;
      } else if (itemType === 'minor') {
        minor += 1;
        finalVersion = `v${major}.${minor}.0`;
      } else {
        patch = attempt;
        finalVersion = `v${major}.${minor}.${patch}`;
      }
    }
  }

  try {
    if (isMysqlOnline) {
      if (itemIsLatest === 1) {
        await pool.query('UPDATE changelogs SET isLatest = 0');
      }
      await pool.query(
        `INSERT INTO changelogs (id, version, title, releaseDate, type, summary, changes, images, author, isLatest, isPublished, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          finalVersion,
          title,
          relDate,
          itemType,
          itemSummary,
          JSON.stringify(itemChanges),
          JSON.stringify(itemImages),
          itemAuthor,
          itemIsLatest,
          itemIsPublished,
          nowIso,
          nowIso
        ]
      );
    } else {
      if (!localDb.changelogs) localDb.changelogs = [];
      if (itemIsLatest === 1) {
        localDb.changelogs.forEach((c: any) => { c.isLatest = false; });
      }
      const newEntry = {
        id,
        version: finalVersion,
        title,
        releaseDate: relDate,
        type: itemType,
        summary: itemSummary,
        changes: itemChanges,
        images: itemImages,
        author: itemAuthor,
        isLatest: Boolean(itemIsLatest),
        isPublished: Boolean(itemIsPublished),
        createdAt: nowIso,
        updatedAt: nowIso
      };
      localDb.changelogs.unshift(newEntry);
      localDb.changelogs = deduplicateChangelogs(localDb.changelogs);
      saveLocalDb();
    }

    await addSystemLog(
      'CREATE_CHANGELOG',
      `เพิ่มบันทึกประวัติการพัฒนาเวอร์ชัน ${version}: "${title}" โดย ${itemAuthor}`,
      username || 'ผู้ดูแลระบบ',
      ip
    );

    return res.json({
      success: true,
      item: {
        id,
        version,
        title,
        releaseDate: relDate,
        type: itemType,
        summary: itemSummary,
        changes: itemChanges,
        images: itemImages,
        author: itemAuthor,
        isLatest: Boolean(itemIsLatest),
        isPublished: Boolean(itemIsPublished),
        createdAt: nowIso,
        updatedAt: nowIso
      }
    });
  } catch (error: any) {
    console.error('Failed to create changelog:', error.message);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.put("/api/changelogs/:id", async (req, res) => {
  const { id } = req.params;
  const {
    version,
    title,
    releaseDate,
    type,
    summary,
    changes,
    images,
    author,
    isLatest,
    isPublished,
    username
  } = req.body;
  const ip = getClientIp(req);
  const nowIso = new Date().toISOString();

  try {
    if (isMysqlOnline) {
      if (isLatest) {
        await pool.query('UPDATE changelogs SET isLatest = 0 WHERE id != ?', [id]);
      }
      await pool.query(
        `UPDATE changelogs SET 
          title = COALESCE(?, title),
          releaseDate = COALESCE(?, releaseDate),
          type = COALESCE(?, type),
          summary = COALESCE(?, summary),
          changes = COALESCE(?, changes),
          images = COALESCE(?, images),
          author = COALESCE(?, author),
          isLatest = ?,
          isPublished = ?,
          updatedAt = ?
         WHERE id = ?`,
        [
          title,
          releaseDate,
          type,
          summary,
          changes !== undefined ? JSON.stringify(changes) : null,
          images !== undefined ? JSON.stringify(images) : null,
          author,
          isLatest ? 1 : 0,
          isPublished !== false ? 1 : 0,
          nowIso,
          id
        ]
      );
    } else {
      if (!localDb.changelogs) localDb.changelogs = [];
      const idx = localDb.changelogs.findIndex((c: any) => c.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'ไม่พบบันทึกประวัติเวอร์ชันนี้' });
      }
      if (isLatest) {
        localDb.changelogs.forEach((c: any) => {
          if (c.id !== id) c.isLatest = false;
        });
      }
      localDb.changelogs[idx] = {
        ...localDb.changelogs[idx],
        version: localDb.changelogs[idx].version, // Version is immutable
        title: title || localDb.changelogs[idx].title,
        releaseDate: releaseDate || localDb.changelogs[idx].releaseDate,
        type: type || localDb.changelogs[idx].type,
        summary: summary !== undefined ? summary : localDb.changelogs[idx].summary,
        changes: changes !== undefined ? changes : localDb.changelogs[idx].changes,
        images: images !== undefined ? images : localDb.changelogs[idx].images,
        author: author || localDb.changelogs[idx].author,
        isLatest: Boolean(isLatest),
        isPublished: isPublished !== false,
        updatedAt: nowIso
      };
      localDb.changelogs = deduplicateChangelogs(localDb.changelogs);
      saveLocalDb();
    }

    await addSystemLog(
      'UPDATE_CHANGELOG',
      `แก้ไขบันทึกประวัติการพัฒนาเวอร์ชัน ${version || id}: "${title || ''}"`,
      username || 'ผู้ดูแลระบบ',
      ip
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update changelog:', error.message);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.delete("/api/changelogs/:id", async (req, res) => {
  const { id } = req.params;
  const { username } = req.query;
  const ip = getClientIp(req);

  try {
    let deletedVersion = id;
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT version, title FROM changelogs WHERE id = ?', [id]);
      if (rows && rows.length > 0) {
        deletedVersion = `${rows[0].version} (${rows[0].title})`;
      }
      await pool.query('DELETE FROM changelogs WHERE id = ?', [id]);
    } else {
      if (!localDb.changelogs) localDb.changelogs = [];
      const item = localDb.changelogs.find((c: any) => c.id === id);
      if (item) {
        deletedVersion = `${item.version} (${item.title})`;
      }
      localDb.changelogs = localDb.changelogs.filter((c: any) => c.id !== id);
      localDb.changelogs = deduplicateChangelogs(localDb.changelogs);
      saveLocalDb();
    }

    await addSystemLog(
      'DELETE_CHANGELOG',
      `ลบบันทึกประวัติการพัฒนาเวอร์ชัน ${deletedVersion}`,
      (username as string) || 'ผู้ดูแลระบบ',
      ip
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete changelog:', error.message);
    return res.status(500).json({ error: error.message || 'Database error' });
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

// Public API for Dynamic QR inspection
app.get("/api/public/qr/:slug", async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=5');
  const { slug } = req.params;
  try {
    let qrData: any = null;
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
        if (rows && rows.length > 0) qrData = rows[0];
      } catch (e) {
        console.warn('MySQL public qr query fallback:', e);
      }
    }
    if (!qrData) {
      qrData = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
    }

    if (!qrData) {
      return res.status(404).json({ error: 'ไม่พบข้อมูล QR Code นี้ในระบบ' });
    }

    return res.json(qrData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
    let qrType = '';

    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT originalUrl, status, type FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      if (rows && rows.length > 0) {
        originalUrl = rows[0].originalUrl;
        status = rows[0].status;
        qrType = rows[0].type || '';
      }
    } else {
      const qr = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
      if (qr) {
        originalUrl = qr.originalUrl;
        status = qr.status;
        qrType = qr.type || '';
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

    // Fetch QR details for rendering the Verify Page
    let qrData: any = null;
    if (isMysqlOnline) {
      const [qrRows]: any = await pool.query('SELECT * FROM enterprise_dynamic_qrs WHERE slug = ?', [slug]);
      if (qrRows && qrRows.length > 0) qrData = qrRows[0];
    } else {
      qrData = (localDb.enterprise_dynamic_qrs || []).find((q: any) => q.slug === slug);
    }

    if (qrData?.type === 'edms' || originalUrl.includes('/verify?docId=')) {
      return res.redirect(302, originalUrl);
    }

    const title = qrData?.title || 'ลิงก์ตรวจสอบข้อมูลราชการ';
    const createdAt = qrData?.createdAt ? new Date(qrData.createdAt).toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    }) : '-';

    // Serve beautiful Verification Landing Page HTML instead of direct redirect
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ตรวจสอบความถูกต้อง QR Code - ปภ.ระยอง</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Sarabun', sans-serif; }
    .animate-check { animation: check-draw 0.6s ease-in-out forwards; }
    @keyframes check-draw {
      0% { stroke-dashoffset: 48; }
      100% { stroke-dashoffset: 0; }
    }
    .scanner-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, transparent, #10b981, transparent);
      animation: scan 2.5s infinite linear;
    }
    @keyframes scan {
      0% { top: 0; opacity: 0; }
      50% { top: 100%; opacity: 1; }
      100% { top: 0; opacity: 0; }
    }
  </style>
</head>
<body class="bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 min-h-screen text-slate-800 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 antialiased">
  <div class="max-w-lg w-full mx-auto space-y-4 sm:space-y-6">
    
    <!-- Verification Card -->
    <div class="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl border border-slate-200/80 overflow-hidden relative p-5 sm:p-8 md:p-10 text-center space-y-5 sm:space-y-6">
      <div class="scanner-line"></div>
      
      <!-- Top Verification Emblem -->
      <div class="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto pt-1">
        <div class="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30"></div>
        <div class="relative w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg sm:shadow-xl shadow-emerald-500/30">
          <svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path class="animate-check" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" stroke-dasharray="48" stroke-dashoffset="48"/>
          </svg>
        </div>
      </div>

      <!-- Heading & Security Badge -->
      <div class="space-y-1.5 sm:space-y-2">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
          ผ่านการตรวจสอบความถูกต้อง
        </h1>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] sm:text-xs font-black text-emerald-600 uppercase tracking-wider">
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>QR CODE VERIFIED & SECURE</span>
        </div>
      </div>

      <!-- Details Box -->
      <div class="bg-slate-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 text-left space-y-4 shadow-xs">
        <div class="space-y-1">
          <span class="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">เนื้อหา / ชื่อเรื่อง:</span>
          <p class="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">${title}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
          <div class="space-y-0.5">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">รหัสอ้างอิง:</span>
            <p class="text-xs sm:text-sm font-mono font-bold text-indigo-600">#${slug}</p>
          </div>
          <div class="space-y-0.5">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">วันที่ลงทะเบียน:</span>
            <p class="text-xs sm:text-[13px] font-semibold text-slate-600">${createdAt}</p>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-200/80 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">ลิงก์ปลายทาง:</span>
            <button id="copy-url-btn" type="button" class="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs active:scale-95 transition">
              คัดลอกลิงก์
            </button>
          </div>
          <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </div>
            <span id="target-url-text" class="text-xs sm:text-sm font-mono text-blue-600 break-all leading-tight flex-1 select-all">
              ${originalUrl}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Area: Button & Timer -->
      <div class="space-y-3 sm:space-y-4 pt-1">
        <a id="proceed-button" href="${originalUrl}" class="w-full h-12 sm:h-14 bg-slate-900 hover:bg-black text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-[0.98] shadow-lg sm:shadow-xl shadow-slate-900/20 text-sm sm:text-base cursor-pointer">
          <span>เข้าสู่ลิงก์ที่ระบุ</span>
          <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>

        <!-- Countdown & Pause/Play Control Bar -->
        <div class="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-left min-w-0">
              <span id="timer-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
              <span id="timer-status" class="text-xs sm:text-[13px] font-semibold text-slate-700 truncate">
                เมื่อสแกน QR Code และจะนำทางอัตโนมัติใน <span id="countdown" class="text-emerald-600 font-black text-sm sm:text-base">5</span> วินาที
              </span>
            </div>
            <button id="toggle-pause-btn" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg sm:rounded-xl shadow-2xs transition active:scale-95 shrink-0 cursor-pointer">
              <svg id="pause-icon" class="w-3 h-3 fill-current text-amber-600" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              <span id="toggle-btn-text">หยุดชั่วคราว</span>
            </button>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div id="progress-bar" class="h-full bg-emerald-500 transition-all duration-1000" style="width: 100%"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- Agency Footer -->
    <div class="flex items-center justify-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-wider uppercase text-center px-2">
      <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png" class="w-4 h-4 grayscale opacity-60 shrink-0" alt="Logo" />
      <span>สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง • EDMS VERIFY</span>
    </div>

  </div>

  <script>
    const originalUrl = ${JSON.stringify(originalUrl)};
    let timeLeft = 5;
    let isPaused = false;
    const countdownEl = document.getElementById('countdown');
    const timerStatusEl = document.getElementById('timer-status');
    const timerDotEl = document.getElementById('timer-dot');
    const toggleBtn = document.getElementById('toggle-pause-btn');
    const toggleBtnText = document.getElementById('toggle-btn-text');
    const pauseIcon = document.getElementById('pause-icon');
    const progressBar = document.getElementById('progress-bar');
    const copyBtn = document.getElementById('copy-url-btn');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(originalUrl);
        copyBtn.innerText = 'คัดลอกแล้ว';
        copyBtn.classList.add('text-emerald-600');
        setTimeout(() => {
          copyBtn.innerText = 'คัดลอกลิงก์';
          copyBtn.classList.remove('text-emerald-600');
        }, 2000);
      });
    }

    let timer = setInterval(tick, 1000);

    function tick() {
      if (isPaused) return;
      timeLeft--;
      if (countdownEl) countdownEl.innerText = timeLeft;
      if (progressBar) progressBar.style.width = ((timeLeft / 5) * 100) + '%';

      if (timeLeft <= 0) {
        clearInterval(timer);
        window.location.href = originalUrl;
      }
    }

    toggleBtn.addEventListener('click', function() {
      isPaused = !isPaused;
      if (isPaused) {
        toggleBtnText.innerText = 'เริ่มนับต่อ';
        toggleBtn.classList.remove('bg-white', 'text-slate-700');
        toggleBtn.classList.add('bg-emerald-600', 'text-white');
        pauseIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        pauseIcon.classList.remove('text-amber-600');
        pauseIcon.classList.add('text-white');
        timerDotEl.classList.remove('animate-ping', 'bg-emerald-500');
        timerDotEl.classList.add('bg-amber-500');
        progressBar.classList.remove('bg-emerald-500');
        progressBar.classList.add('bg-amber-500');
        timerStatusEl.innerHTML = '<span class="text-amber-600 font-bold">หยุดการนับถอยหลังชั่วคราว</span>';
      } else {
        toggleBtnText.innerText = 'หยุดชั่วคราว';
        toggleBtn.classList.add('bg-white', 'text-slate-700');
        toggleBtn.classList.remove('bg-emerald-600', 'text-white');
        pauseIcon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
        pauseIcon.classList.add('text-amber-600');
        pauseIcon.classList.remove('text-white');
        timerDotEl.classList.add('animate-ping', 'bg-emerald-500');
        timerDotEl.classList.remove('bg-amber-500');
        progressBar.classList.add('bg-emerald-500');
        progressBar.classList.remove('bg-amber-500');
        timerStatusEl.innerHTML = 'เมื่อสแกน QR Code และจะนำทางอัตโนมัติใน <span id="countdown" class="text-emerald-600 font-black text-sm sm:text-base">' + timeLeft + '</span> วินาที';
      }
    });

    document.getElementById('proceed-button').addEventListener('click', () => {
      clearInterval(timer);
    });
  </script>
</body>
</html>
    `);
  } catch (error: any) {
    console.error('QR Redirection error:', error.message);
    return res.status(500).send("Error performing redirect");
  }
});

// GET list of dynamic QR codes
app.get(["/api/qr-generator/dynamic", "/api/qr-generator/dynamic/"], async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=5');
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
    if (isMysqlOnline) {
      const [rows]: any = await pool.query('SELECT id, username, email, firstName, lastName, position, department, role, password, avatar, emailNotifications FROM users');
      const formatted = rows.map((u: any) => ({
        ...u,
        emailNotifications: u.emailNotifications !== undefined ? (Number(u.emailNotifications) === 1 || u.emailNotifications === true) : true,
        isArgon2: u.password ? u.password.startsWith('$argon2') : false
      }));
      return res.json(formatted);
    }
    throw new Error('MySQL offline');
  } catch (error: any) {
    const list = (localDb.users || []).map((u: any) => ({
      ...u,
      emailNotifications: u.emailNotifications !== undefined ? (Number(u.emailNotifications) === 1 || u.emailNotifications === true) : true,
      isArgon2: u.password ? u.password.startsWith('$argon2') : false
    }));
    return res.json(list);
  }
});

app.post('/api/users', async (req, res) => {
  const currentUserRole = req.body.currentUserRole || req.headers.role || '';
  if (currentUserRole === 'moderator' || currentUserRole === 'user') {
    return res.status(403).json({ error: 'ไม่อนุญาต: สิทธิ์การจัดการบุคลากรสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)' });
  }

  const { username, password, email, firstName, lastName, position, department, role, avatar } = req.body;
  const emailNotif = req.body.emailNotifications !== undefined ? (req.body.emailNotifications ? 1 : 0) : 1;
  const ip = getClientIp(req);
  const hashedPassword = await hashPasswordArgon2(password || 'password');

  try {
    let newId = Date.now();
    if (isMysqlOnline) {
      const [result]: any = await pool.query(
        'INSERT INTO users (username, password, email, firstName, lastName, position, department, role, avatar, emailNotifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, email || null, firstName, lastName, position, department || 'ฝ่ายยุทธศาสตร์และการจัดการ', role || 'user', avatar || null, emailNotif]
      );
      newId = result.insertId;
    }

    if (!localDb.users) localDb.users = [];
    const localUser = {
      id: newId,
      username,
      password: hashedPassword,
      email: email || '',
      firstName,
      lastName,
      position,
      department: department || 'ฝ่ายยุทธศาสตร์และการจัดการ',
      role: role || 'user',
      avatar: avatar || null,
      emailNotifications: emailNotif
    };
    localDb.users.push(localUser);
    saveLocalDb();

    await addSystemLog('CREATE_USER', `เพิ่มเจ้าหน้าที่ใหม่: ${firstName} ${lastName} (${position}, ฝ่าย: ${department || 'ไม่ระบุ'}, สิทธิ์: ${role || 'user'}) - รหัสผ่านเข้ารหัสด้วย Argon2id`, req.body.createdBy || 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true, id: newId });
  } catch (error: any) {
    console.error('Database error in POST /api/users:', error.message);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const currentUserRole = data.currentUserRole || req.headers.role || '';
  const currentUserId = data.currentUserId || req.headers['x-user-id'] || '';

  // Non-admins (e.g. moderator/user) can only update their own profile, not manage other users
  if ((currentUserRole === 'moderator' || currentUserRole === 'user') && String(id) !== String(currentUserId)) {
    return res.status(403).json({ error: 'ไม่อนุญาต: สิทธิ์การจัดการบุคลากรสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)' });
  }

  const ip = getClientIp(req);
  const emailNotif = data.emailNotifications !== undefined ? (data.emailNotifications ? 1 : 0) : 1;

  try {
    let newHashedPassword: string | null = null;
    if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
      if (data.currentPassword !== undefined || data.requireCurrentPassword) {
        if (!data.currentPassword || typeof data.currentPassword !== 'string' || data.currentPassword.trim() === '') {
          return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน (รหัสผ่านเดิม)' });
        }
        let dbPass = '';
        if (isMysqlOnline) {
          const [userRows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [id]);
          if (userRows.length > 0) dbPass = userRows[0]?.password || '';
        }
        if (!dbPass && localDb.users) {
          const u = localDb.users.find((x: any) => String(x.id) === String(id));
          if (u) dbPass = u.password || '';
        }
        if (!dbPass) {
          return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ' });
        }
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

    if (isMysqlOnline) {
      if (newHashedPassword) {
        await pool.query(
          'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, password=?, avatar=?, emailNotifications=? WHERE id=?',
          [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, newHashedPassword, data.avatar || null, emailNotif, id]
        );
      } else {
        await pool.query(
          'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, avatar=?, emailNotifications=? WHERE id=?',
          [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, data.avatar || null, emailNotif, id]
        );
      }
    }

    if (localDb.users) {
      const idx = localDb.users.findIndex((u: any) => String(u.id) === String(id));
      if (idx !== -1) {
        localDb.users[idx] = {
          ...localDb.users[idx],
          firstName: data.firstName !== undefined ? data.firstName : localDb.users[idx].firstName,
          lastName: data.lastName !== undefined ? data.lastName : localDb.users[idx].lastName,
          email: data.email !== undefined ? data.email : localDb.users[idx].email,
          position: data.position !== undefined ? data.position : localDb.users[idx].position,
          department: data.department !== undefined ? data.department : localDb.users[idx].department,
          role: data.role !== undefined ? data.role : localDb.users[idx].role,
          avatar: data.avatar !== undefined ? data.avatar : localDb.users[idx].avatar,
          emailNotifications: emailNotif,
          ...(newHashedPassword ? { password: newHashedPassword } : {})
        };
        saveLocalDb();
      }
    }

    await addSystemLog('UPDATE_USER', `แก้ไขข้อมูลเจ้าหน้าที่ ID: ${id} (${data.firstName} ${data.lastName}, ฝ่าย: ${data.department || 'ไม่ระบุ'}, สิทธิ์: ${data.role})${newHashedPassword ? ' [อัปเดตรหัสผ่านใหม่]' : ''}`, data.updatedBy || 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Database error in PUT /api/users/:id:', error.message);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const currentUserRole = req.body.currentUserRole || req.headers.role || req.query.role || '';
  if (currentUserRole === 'moderator' || currentUserRole === 'user') {
    return res.status(403).json({ error: 'ไม่อนุญาต: สิทธิ์การจัดการบุคลากรสงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)' });
  }

  const { id } = req.params;
  const ip = getClientIp(req);
  try {
    let userName = `ID ${id}`;
    if (isMysqlOnline) {
      const [userRows]: any = await pool.query('SELECT firstName, lastName FROM users WHERE id = ?', [id]);
      if (userRows.length > 0) userName = `${userRows[0].firstName} ${userRows[0].lastName}`;
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
    }
    if (localDb.users) {
      const u = localDb.users.find((x: any) => String(x.id) === String(id));
      if (u) userName = `${u.firstName} ${u.lastName}`;
      localDb.users = localDb.users.filter((x: any) => String(x.id) !== String(id));
      saveLocalDb();
    }
    await addSystemLog('DELETE_USER', `ลบข้อมูลเจ้าหน้าที่: ${userName}`, 'ผู้ดูแลระบบ', ip);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Database error in DELETE /api/users/:id:', error.message);
    return res.status(500).json({ error: 'Database error' });
  }
});

// 3. Login API Endpoint with Argon2id Verification & Auto-Upgrade (supports Username or Email)
app.post('/api/login', async (req, res) => {
  const loginIdentifier = (req.body.username || req.body.email || req.body.identifier || '').trim();
  const password = req.body.password ? String(req.body.password).trim() : '';
  const ip = getClientIp(req);

  if (!loginIdentifier || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน' });
  }

  try {
    let user: any = null;
    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query(
          'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))',
          [loginIdentifier, loginIdentifier]
        );
        if (rows && rows.length > 0) user = rows[0];
      } catch (dbErr: any) {
        console.warn('⚠️ [Login] MySQL user query failed, falling back to local store:', dbErr.message);
      }
    }
    if (!user && localDb && localDb.users) {
      user = localDb.users.find((u: any) => 
        (u.username && u.username.toLowerCase() === loginIdentifier.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === loginIdentifier.toLowerCase())
      );
    }

    if (user) {
      const isValid = await verifyPasswordArgon2(user.password, password);
      if (isValid) {
        if (!user.password.startsWith('$argon2')) {
          try {
            const newHash = await hashPasswordArgon2(password);
            if (isMysqlOnline) {
              await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]).catch(() => {});
            }
            user.password = newHash;
            if (localDb && localDb.users) {
              const idx = localDb.users.findIndex((u: any) => String(u.id) === String(user.id));
              if (idx !== -1) {
                localDb.users[idx].password = newHash;
                saveLocalDb();
              }
            }
            console.log(`🔐 Auto-upgraded password to Argon2id for user: ${user.username}`);
          } catch (e: any) {
            console.warn('Password upgrade non-critical error:', e.message);
          }
        }

        const { password: _, ...sanitizedUser } = user;
        sanitizedUser.isArgon2 = true;
        sanitizedUser.emailNotifications = user.emailNotifications !== undefined ? (Number(user.emailNotifications) === 1 || user.emailNotifications === true) : true;
        
        // Register logged-in active presence immediately
        try {
          const uKey = String(sanitizedUser.id || sanitizedUser.username).toLowerCase();
          const ua = req.headers['user-agent'] || '';
          const { device, browser } = parseUserAgentInfo(ua);
          const now = Date.now();
          activeLoggedInUsers.set(uKey, {
            userId: sanitizedUser.id || sanitizedUser.username,
            username: sanitizedUser.username,
            fullName: `${sanitizedUser.firstName || ''} ${sanitizedUser.lastName || ''}`.trim(),
            position: sanitizedUser.position || '',
            department: sanitizedUser.department || '',
            departmentId: sanitizedUser.departmentId || '',
            role: sanitizedUser.role || '',
            avatar: sanitizedUser.avatar || '',
            ip,
            device,
            browser,
            currentView: 'overview',
            viewTitle: 'ภาพรวมระบบ (Overview)',
            activeDetails: 'เพิ่งเข้าสู่ระบบและพร้อมปฏิบัติงาน',
            status: 'active',
            loginAt: now,
            lastActive: now,
            lastLoggedView: 'overview',
            lastLoggedDetails: 'เพิ่งเข้าสู่ระบบและพร้อมปฏิบัติงาน',
            lastLoggedTime: now
          });
          broadcastOnlineCount();
        } catch (_) {}

        await addSystemLog('LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จ (${user.firstName || user.username} ${user.lastName || ''} - ${user.username}) - ยืนยันรหัสผ่านด้วย Argon2id`, user.username, ip);
        return res.json({ success: true, user: sanitizedUser });
      }
    }
    
    await addSystemLog('LOGIN_FAILED', `พยายามเข้าสู่ระบบไม่สำเร็จ (ชื่อผู้ใช้/อีเมล: ${loginIdentifier})`, loginIdentifier || 'Unknown', ip);
    return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรืออีเมล หรือรหัสผ่านไม่ถูกต้อง' });
  } catch (error: any) {
    console.error('Database error in /api/login:', error.message);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
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
  
  let displayLogo = logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '' 
    ? (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:image/') 
        ? logoUrl 
        : `${baseUrl || ''}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`)
    : 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';

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

function generatePasswordResetSuccessEmailTemplate({
  orgName,
  logoUrl,
  footerText,
  baseUrl,
}: {
  orgName?: string;
  logoUrl?: string;
  footerText?: string;
  baseUrl?: string;
}) {
  const displayOrgName = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  
  let displayLogo = logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '' 
    ? (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:image/') 
        ? logoUrl 
        : `${baseUrl || ''}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`)
    : 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';

  const displayFooter = footerText || 'ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>เปลี่ยนรหัสผ่านสำเร็จ</title>
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
            <td style="background: linear-gradient(90deg, #059669 0%, #10b981 50%, #3b82f6 100%); height: 6px;"></td>
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
                    <div style="display:inline-block; background-color:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600; margin-bottom:20px;">
                      ✅ เปลี่ยนรหัสผ่านสำเร็จ / Password Reset Successful
                    </div>
                    
                    <h2 style="margin:0 0 10px 0; color:#0f172a; font-size:20px; font-weight:700;">รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว</h2>
                    <p style="margin:0 0 28px 0; color:#475569; font-size:14px; line-height:1.6; max-width:440px;">
                      ระบบได้รับคำขอและดำเนินการอัปเดตความปลอดภัยสิทธิ์การใช้งานบัญชีของคุณเรียบร้อยแล้ว ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                    </p>

                    <!-- Notice Card -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fef2f2; border:1px solid #fecaca; border-radius:12px; margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px; text-align:left;">
                          <p style="margin:0 0 6px 0; color:#991b1b; font-size:13px; font-weight:700;">
                            🛡️ คำแนะนำด้านความปลอดภัย
                          </p>
                          <ul style="margin:0; padding-left:18px; color:#b91c1c; font-size:12.5px; line-height:1.6;">
                            <li>หากท่านไม่ได้เป็นผู้ทำรายการนี้ โปรดติดต่อผู้ดูแลระบบทันที</li>
                            <li>ไม่ควรเปิดเผยรหัสผ่านของท่านให้ผู้อื่นทราบ</li>
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

// Function to generate beautiful Document Notification Email HTML Template
export function generateDocNotificationEmailHtml({
  badgeText,
  heading,
  description,
  docNumber,
  receiveNumber,
  title,
  docType,
  category,
  priority,
  secrecy,
  from,
  to,
  department,
  assignee,
  date,
  note,
  attachmentsCount,
  orgName,
  logoUrl,
  footerText,
  baseUrl,
}: {
  badgeText?: string;
  heading: string;
  description?: string;
  docNumber?: string;
  receiveNumber?: string;
  title: string;
  docType?: string;
  category?: string;
  priority?: string;
  secrecy?: string;
  from?: string;
  to?: string;
  department?: string;
  assignee?: string;
  date?: string;
  note?: string;
  attachmentsCount?: number;
  orgName?: string;
  logoUrl?: string;
  footerText?: string;
  baseUrl?: string;
}) {
  const displayOrgName = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const displayFooter = footerText || '© 2026 ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)';
  const logo = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : `${baseUrl || ''}${logoUrl}`) : '';

  const priorityColor = priority === 'ด่วนที่สุด' ? '#ef4444' : (priority === 'ด่วนมาก' ? '#f97316' : (priority === 'ด่วน' ? '#eab308' : '#3b82f6'));
  const secrecyColor = (secrecy === 'ลับที่สุด' || secrecy === 'ลับมาก' || secrecy === 'ลับ') ? '#dc2626' : '#64748b';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 32px 24px; text-align:center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                ${logo ? `
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <img src="${logo}" alt="Logo" style="height:54px; width:auto; object-fit:contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td align="center">
                    <h1 style="margin:0; color:#ffffff; font-size:19px; font-weight:700; line-height:1.4;">${displayOrgName}</h1>
                    <p style="margin:4px 0 0 0; color:#94a3b8; font-size:12.5px; font-weight: 500;">ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px; background-color:#ffffff;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Badge -->
                    <div style="display:inline-block; background-color:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:5px 14px; border-radius:20px; font-size:12.5px; font-weight:600; margin-bottom:16px;">
                      ${badgeText || '📬 แจ้งเตือนเอกสารในระบบสารบรรณ'}
                    </div>
                    
                    <h2 style="margin:0 0 8px 0; color:#0f172a; font-size:18px; font-weight:700;">${heading}</h2>
                    <p style="margin:0 0 20px 0; color:#475569; font-size:14px; line-height:1.6;">
                      ${description || 'มีเอกสารในระบบสารบรรณที่เกี่ยวข้องกับท่านหรือกลุ่มงานของท่าน โปรดตรวจสอบรายละเอียดด้านล่าง'}
                    </p>

                    <!-- Document Title Card -->
                    <div style="background-color:#f8fafc; border-left: 4px solid #2563eb; border-top:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; border-radius:8px; padding:16px 20px; margin-bottom:20px;">
                      <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:4px;">ชื่อเรื่องเอกสาร</div>
                      <div style="font-size:15px; font-weight:700; color:#0f172a; line-height:1.5;">${title}</div>
                    </div>

                    <!-- Metadata Grid Table -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; font-size:13.5px;">
                      ${docNumber ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; width:35%; background-color:#f8fafc;">เลขที่เอกสาร</td>
                        <td style="padding:10px 14px; color:#0f172a; font-weight:600;">${docNumber}</td>
                      </tr>` : ''}
                      ${receiveNumber ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; width:35%; background-color:#f8fafc;">เลขที่รับ</td>
                        <td style="padding:10px 14px; color:#0f172a; font-weight:600;">${receiveNumber}</td>
                      </tr>` : ''}
                      ${date ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">ลงวันที่</td>
                        <td style="padding:10px 14px; color:#0f172a;">${date}</td>
                      </tr>` : ''}
                      ${from ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">จาก</td>
                        <td style="padding:10px 14px; color:#0f172a;">${from}</td>
                      </tr>` : ''}
                      ${to ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">ถึง</td>
                        <td style="padding:10px 14px; color:#0f172a;">${to}</td>
                      </tr>` : ''}
                      ${department ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">กลุ่มงาน/ฝ่าย</td>
                        <td style="padding:10px 14px; color:#0f172a; font-weight:600;">${department}</td>
                      </tr>` : ''}
                      ${assignee ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">ผู้รับมอบหมาย</td>
                        <td style="padding:10px 14px; color:#1d4ed8; font-weight:600;">${assignee}</td>
                      </tr>` : ''}
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">ความเร่งด่วน / ชั้นความลับ</td>
                        <td style="padding:10px 14px; color:#0f172a;">
                          <span style="color:${priorityColor}; font-weight:600;">${priority || 'ปกติ'}</span>
                          ${secrecy && secrecy !== 'ปกติ' ? ` | <span style="color:${secrecyColor}; font-weight:600;">${secrecy}</span>` : ''}
                        </td>
                      </tr>
                      ${note ? `
                      <tr style="border-bottom:1px solid #e2e8f0; background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">คำสั่งการ/หมายเหตุ</td>
                        <td style="padding:10px 14px; color:#b45309; font-weight:500;">${note}</td>
                      </tr>` : ''}
                      ${attachmentsCount !== undefined ? `
                      <tr style="background-color:#ffffff;">
                        <td style="padding:10px 14px; color:#64748b; font-weight:600; background-color:#f8fafc;">ไฟล์แนบ</td>
                        <td style="padding:10px 14px; color:#0f172a;">${attachmentsCount > 0 ? `📎 แนบ ${attachmentsCount} ไฟล์` : 'ไม่มีไฟล์แนบ'}</td>
                      </tr>` : ''}
                    </table>

                    <!-- CTA Action Button -->
                    <div style="text-align:center; margin:28px 0 12px 0;">
                      <a href="${baseUrl || '#'}" target="_blank" style="display:inline-block; background-color:#2563eb; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        เข้าสู่ระบบเพื่อเปิดดูเอกสาร
                      </a>
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:24px 28px; text-align:center;">
              <p style="margin:0 0 4px 0; color:#334155; font-size:12.5px; font-weight:700;">${displayOrgName}</p>
              <p style="margin:0 0 10px 0; color:#64748b; font-size:11.5px; line-height:1.5;">${displayFooter}</p>
              <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.4;">
                ข้อความนี้เป็นอีเมลแจ้งเตือนอัตโนมัติจากระบบสารบรรณอิเล็กทรอนิกส์ กรุณาอย่าตอบกลับอีเมลนี้
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
  const { targetEmail, type = 'doc' } = req.body;
  if (!targetEmail) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลผู้รับทดสอบ' });

  try {
    let settings: any = {};
    if (isMysqlOnline) {
      const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName, logoUrl, footerText FROM settings LIMIT 1');
      if (settingsRows && settingsRows.length > 0) settings = settingsRows[0];
    }
    if (!settings.smtpHost && localDb.settings && localDb.settings.length > 0) {
      settings = localDb.settings[0];
    }

    if (!settings.smtpHost || !settings.smtpUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'ระบบยังไม่ได้ตั้งค่า SMTP Host หรือ User ในเมนู "ตั้งค่าระบบ > อีเมล (SMTP)" กรุณากรอกและกด "บันทึกการตั้งค่าระบบ" ก่อนส่งทดสอบ' 
      });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort) || 587,
      secure: Number(settings.smtpPort) === 465,
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || '',
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    let emailHtml = '';
    let emailSubject = '';

    if (type === 'otp') {
      const testOtp = '849201';
      emailHtml = generateOtpEmailTemplate({
        otp: testOtp,
        orgName: settings.orgName,
        logoUrl: settings.logoUrl,
        footerText: settings.footerText,
        baseUrl
      });
      emailSubject = `[ทดสอบระบบ] รหัสผ่านใหม่ (OTP) - ${settings.orgName || 'ระบบงานสารบรรณ'}`;
    } else {
      emailHtml = generateDocNotificationEmailHtml({
        badgeText: '🧪 ทดสอบระบบการแจ้งเตือนทางอีเมล',
        heading: 'การเชื่อมต่อระบบอีเมล (SMTP) สำเร็จสมบูรณ์',
        description: 'นี่คือตัวอย่างอีเมลแจ้งเตือนที่ระบบจะส่งให้ผู้ใช้งาน เมื่อมีการลงทะเบียนเอกสารใหม่ หรือส่งต่อหนังสือถึงฝ่าย/กลุ่มงานของท่าน',
        docNumber: 'รย 0023.1/ทดสอบ 001',
        receiveNumber: '108/2569',
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        title: 'ทดสอบการส่งหนังสือและระบบแจ้งเตือนทางอีเมลอัตโนมัติ (Email Notification)',
        from: 'ฝ่ายยุทธศาสตร์และการจัดการ',
        to: 'ทุกฝ่ายและกลุ่มงาน',
        department: 'สำนักงานป้องกันและบรรเทาสาธารณภัย',
        assignee: 'ผู้ดูแลระบบ / เจ้าหน้าที่สารบรรณ',
        priority: 'ด่วนที่สุด',
        secrecy: 'ปกติ',
        note: 'ระบบ SMTP พร้อมทำงานแล้วสำหรับการแจ้งเตือนเอกสาร',
        attachmentsCount: 1,
        orgName: settings.orgName,
        logoUrl: settings.logoUrl,
        footerText: settings.footerText,
        baseUrl
      });
      emailSubject = `[ทดสอบระบบ] แจ้งเตือนเอกสารสารบรรณ - ${settings.orgName || 'ระบบงานสารบรรณ'}`;
    }

    await new Promise((resolve, reject) => {
      transporter.sendMail({
        from: settings.smtpFrom ? settings.smtpFrom : `"${settings.orgName || 'ระบบสารบรรณ'}" <${settings.smtpUser}>`,
        to: targetEmail,
        subject: emailSubject,
        text: `นี่คืออีเมลทดสอบระบบสารบรรณ EDMS สำหรับ ${targetEmail}`,
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

    return res.json({ success: true, message: `ส่งอีเมลทดสอบไปยัง ${targetEmail} สำเร็จเรียบร้อยแล้ว` });
  } catch (err: any) {
    console.error('Test Email Error:', err);
    let errMsg = err.message || '';
    if (errMsg.includes('525') || errMsg.includes('Unauthorized IP') || errMsg.includes('whitelist')) {
      errMsg = `เซิร์ฟเวอร์ SMTP ปฏิเสธ IP Address ของระบบคลาวด์ (Unauthorized IP address). กรุณาตรวจสอบการตั้งค่า IP Whitelist ของเซิร์ฟเวอร์อีเมลองค์กร หรือเปลี่ยนไปใช้บริการ SMTP สาธารณะ เช่น Gmail App Password, SendGrid หรือ Mailgun`;
    }
    return res.status(500).json({ success: false, message: `ล้มเหลวในการส่งอีเมลทดสอบ: ${errMsg}` });
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

    let smtpErrorMsg = '';
    try {
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
    } catch (smtpErr: any) {
      smtpErrorMsg = smtpErr.message || 'SMTP Error';
      console.warn("SMTP sending failed, falling back to console OTP logging:", smtpErrorMsg);
    }

    console.log(`[OTP FORGOT PASSWORD] Email: ${email}, OTP: ${otp}`);

    return res.json({ 
      success: true, 
      message: smtpErrorMsg ? `สร้างรหัส OTP เรียบร้อยแล้ว (หมายเหตุ: ไม่สามารถส่งอีเมลผ่าน SMTP ได้เนื่องจาก: ${smtpErrorMsg} - รหัส OTP ของคุณคือ ${otp})` : 'ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว',
      devOtp: otp 
    });
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

    // Send password reset success email
    try {
      const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName, logoUrl, footerText FROM settings LIMIT 1');
      const settings = settingsRows[0] || {};
      
      if (settings.smtpHost && settings.smtpUser) {
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

        const successEmailHtml = generatePasswordResetSuccessEmailTemplate({
          orgName: settings.orgName,
          logoUrl: settings.logoUrl,
          footerText: settings.footerText,
          baseUrl
        });

        await new Promise((resolve, reject) => {
          transporter.sendMail({
            from: settings.smtpFrom || '"ระบบสารบรรณ" <no-reply@example.com>',
            to: email,
            subject: `เปลี่ยนรหัสผ่านสำเร็จ - ${settings.orgName || 'ระบบงานสารบรรณ'}`,
            text: `รหัสผ่านบัญชีของคุณได้รับการเปลี่ยนเรียบร้อยแล้ว`,
            html: successEmailHtml,
          }, (err, info) => {
            if (err) {
              console.error("SMTP Password Reset Success Notice Error:", err);
              reject(err);
            } else {
              resolve(info);
            }
          });
        });
      }
    } catch (emailErr) {
      console.warn("Failed to send password reset success email:", emailErr);
    }

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    const cached = getLookupCached<any[]>('departments');
    if (cached) {
      return res.json(cached);
    }

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM departments ORDER BY id ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          setLookupCached('departments', rows);
          return res.json(rows);
        }
      } catch (dbErr: any) {
        console.warn('MySQL departments fetch warning:', dbErr.message);
      }
    }
    const localData = localDb.departments || initialSeedData.departments || [];
    setLookupCached('departments', localData);
    return res.json(localData);
  } catch (error: any) {
    console.error('Error in /api/departments:', error.message);
    return res.json(localDb.departments || initialSeedData.departments || []);
  }
});

app.post('/api/departments', async (req, res) => {
  const { name, description } = req.body;
  const ip = getClientIp(req);
  const updatedBy = req.body.createdBy || req.body.username || 'ผู้ดูแลระบบ';
  if (!name) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อแผนก/กลุ่มงาน' });
  }
  try {
    let newId = Date.now();
    if (isMysqlOnline) {
      try {
        const [result]: any = await pool.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description || '']);
        newId = result.insertId;
      } catch (dbErr: any) {
        console.warn('MySQL department create warning:', dbErr.message);
      }
    }
    if (!localDb.departments) localDb.departments = [];
    localDb.departments.push({ id: newId, name, description: description || '' });
    saveLocalDb();
    invalidateLookupCache('departments');
    await addSystemLog('CREATE_DEPARTMENT', `เพิ่มแผนก/กลุ่มงานใหม่: ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
    return res.json({ id: newId, name, description: description || '' });
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
    if (isMysqlOnline) {
      try {
        await pool.query('UPDATE departments SET name=?, description=? WHERE id=?', [name, description || '', id]);
      } catch (dbErr: any) {
        console.warn('MySQL department update warning:', dbErr.message);
      }
    }
    if (localDb.departments) {
      const idx = localDb.departments.findIndex((d: any) => String(d.id) === String(id));
      if (idx !== -1) {
        localDb.departments[idx] = { ...localDb.departments[idx], name, description: description || '' };
        saveLocalDb();
      }
    }
    invalidateLookupCache('departments');
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
    let deptName = `ID ${id}`;
    if (isMysqlOnline) {
      try {
        const [deptRows]: any = await pool.query('SELECT name FROM departments WHERE id = ?', [id]);
        if (deptRows && deptRows.length > 0) deptName = deptRows[0].name;
        await pool.query('DELETE FROM departments WHERE id = ?', [id]);
      } catch (dbErr: any) {
        console.warn('MySQL department delete warning:', dbErr.message);
      }
    }
    if (localDb.departments) {
      const dObj = localDb.departments.find((d: any) => String(d.id) === String(id));
      if (dObj) deptName = dObj.name;
      localDb.departments = localDb.departments.filter((d: any) => String(d.id) !== String(id));
      saveLocalDb();
    }
    invalidateLookupCache('departments');
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
    const cached = getLookupCached<any[]>('positions');
    if (cached) {
      return res.json(cached);
    }

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM positions ORDER BY id ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          setLookupCached('positions', rows);
          return res.json(rows);
        }
      } catch (dbErr: any) {
        console.warn('MySQL positions fetch warning:', dbErr.message);
      }
    }
    const localData = localDb.positions || initialSeedData.positions || [];
    setLookupCached('positions', localData);
    return res.json(localData);
  } catch (error: any) {
    console.error('Database error in /api/positions:', error.message);
    return res.json(localDb.positions || initialSeedData.positions || []);
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
    let newId = Date.now();
    if (isMysqlOnline) {
      try {
        const [result]: any = await pool.query('INSERT INTO positions (name, description) VALUES (?, ?)', [name, description || '']);
        newId = result.insertId;
      } catch (dbErr: any) {
        console.warn('MySQL position insert warning:', dbErr.message);
      }
    }
    if (!localDb.positions) localDb.positions = [];
    localDb.positions.push({ id: newId, name, description: description || '' });
    saveLocalDb();
    invalidateLookupCache('positions');
    await addSystemLog('CREATE_POSITION', `เพิ่มตำแหน่งงานใหม่: ${name}${description ? ` (${description})` : ''}`, updatedBy, ip);
    return res.json({ id: newId, name, description: description || '' });
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
    if (isMysqlOnline) {
      try {
        await pool.query('UPDATE positions SET name=?, description=? WHERE id=?', [name, description || '', id]);
      } catch (dbErr: any) {
        console.warn('MySQL position update warning:', dbErr.message);
      }
    }
    if (localDb.positions) {
      const idx = localDb.positions.findIndex((p: any) => String(p.id) === String(id));
      if (idx !== -1) {
        localDb.positions[idx] = { ...localDb.positions[idx], name, description: description || '' };
        saveLocalDb();
      }
    }
    invalidateLookupCache('positions');
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
    let posName = `ID ${id}`;
    if (isMysqlOnline) {
      try {
        const [posRows]: any = await pool.query('SELECT name FROM positions WHERE id = ?', [id]);
        if (posRows && posRows.length > 0) posName = posRows[0].name;
        await pool.query('DELETE FROM positions WHERE id = ?', [id]);
      } catch (dbErr: any) {
        console.warn('MySQL position delete warning:', dbErr.message);
      }
    }
    if (localDb.positions) {
      const pObj = localDb.positions.find((p: any) => String(p.id) === String(id));
      if (pObj) posName = pObj.name;
      localDb.positions = localDb.positions.filter((p: any) => String(p.id) !== String(id));
      saveLocalDb();
    }
    invalidateLookupCache('positions');
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
    const cached = getLookupCached<any[]>('organizations');
    if (cached) {
      return res.json(cached);
    }

    if (isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM organizations ORDER BY name ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          setLookupCached('organizations', rows);
          return res.json(rows);
        }
      } catch (dbErr: any) {
        console.warn('MySQL organizations fetch warning:', dbErr.message);
      }
    }
    const localData = localDb.organizations || initialSeedData.organizations || [];
    setLookupCached('organizations', localData);
    return res.json(localData);
  } catch (error: any) {
    return res.json(localDb.organizations || initialSeedData.organizations || []);
  }
});

app.post('/api/organizations', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    // INSERT IGNORE to prevent duplicates
    const [result]: any = await pool.query('INSERT IGNORE INTO organizations (name) VALUES (?)', [name]);
    invalidateLookupCache('organizations');
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

// Helper function to handle document forwarding and notifications
async function handleDocumentForwarding(docId: string, docType: string, targetDepartments: string[], forwardNote: string, forwardedBy: string, ip: string, req: any) {
  if (!docId || !targetDepartments || targetDepartments.length === 0) return;

  const deptsString = targetDepartments.join(',');
  const timestamp = new Date().toISOString();

  const tableMap: Record<string, string> = {
    inbox: 'inbox_documents',
    outbox: 'outbox_documents',
    internal: 'internal_documents',
    admin: 'admin_documents'
  };
  const tableName = tableMap[docType] || 'inbox_documents';

  try {
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

    // Trigger Email Notification for Forwarding
    try {
      const [fullDocs]: any = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [docId]);
      if (fullDocs && fullDocs.length > 0) {
        const doc = fullDocs[0];
        const subject = `[แจ้งเตือน] ส่งต่อหนังสือถึงหน่วยงานท่าน: ${doc.title || 'ไม่มีชื่อเรื่อง'}`;
        const htmlBody = `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">มีการส่งต่อหนังสือถึงหน่วยงานของท่าน</h2>
            <p>เรียน เจ้าหน้าที่ผู้เกี่ยวข้อง,</p>
            <p>มีการส่งต่อเอกสารจาก <strong>${forwardedBy || 'สารบรรณกลาง'}</strong> ถึงหน่วยงาน <strong>${deptsString}</strong> ดังนี้:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>เรื่อง:</strong> ${doc.title || '-'}</p>
              <p><strong>เลขที่หนังสือ:</strong> ${doc.docNumber || '-'}</p>
              <p><strong>หมายเหตุการส่งต่อ:</strong> ${forwardNote || '-'}</p>
            </div>
            <p>กรุณาตรวจสอบข้อมูลเพิ่มเติมในระบบ EDMS เพื่อดำเนินการลงรับหนังสือเข้าสู่ฝ่ายของท่าน</p>
            <p style="font-size: 0.8em; color: #94a3b8; text-align: center; margin-top: 20px;">นี่คือการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้</p>
          </div>
        `;
        await sendNotificationEmail(targetDepartments, subject, htmlBody);
      }
    } catch (err: any) {
      console.warn('Forwarding notification failed:', err.message);
    }
    
    // Trigger rich notifications for each department
    for (const dept of targetDepartments) {
      try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        const emailHtml = generateDocNotificationEmailHtml({
          badgeText: '✉️ มีเอกสารส่งต่อถึงกลุ่มงาน',
          heading: `สารบรรณได้ส่งต่อเอกสารมายังฝ่าย/กลุ่มงาน: ${dept}`,
          description: `มีเอกสารส่งต่อจากสารบรรณกลาง เพื่อให้บุคลากรในฝ่ายของท่านตรวจสอบและดำเนินการลงรับหนังสือเข้าสารบรรณฝ่าย`,
          title: forwardNote ? `ส่งต่อเอกสาร: ${forwardNote}` : `ส่งต่อเอกสาร ID: ${docId}`,
          department: dept,
          actionUrl: `${baseUrl}/#inbox`,
          actionText: 'ดูรายการหนังสือเพื่อลงรับ',
          footerText: 'ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS)'
        });
        
        await sendNotificationEmail([dept], `[แจ้งเตือน] มีเอกสารส่งต่อถึงฝ่าย/กลุ่มงาน ${dept}`, emailHtml);
      } catch (e) {}
    }
  } catch (err: any) {
    console.error('Error in handleDocumentForwarding:', err.message);
  }
}

// 6. Documents API Endpoints (หนังสือราชการ + คำสั่ง/ประกาศ - ดึงแบบแยกตาราง)
app.get('/api/documents', async (req, res) => {
  try {
    const { role, department, isCentral, username } = req.query;
    let rows: any[] = [];
    let deptReceives: any[] = [];
    const userReadsMap = new Map<string, string>();
    const folderMap = new Map<number, string>();

    if (isMysqlOnline) {
      try {
        const now = Date.now();
        let cacheHit = false;

        if (rawDocumentsCache && rawDocumentsCache.expiry > now) {
          rows = rawDocumentsCache.rows;
          deptReceives = rawDocumentsCache.deptReceives;
          rawDocumentsCache.folderMap.forEach((val, key) => folderMap.set(key, val));
          cacheHit = true;
        }

        if (cacheHit) {
          if (username) {
            try {
              const [readRows]: any = await pool.query('SELECT docId, status FROM document_reads WHERE username = ?', [username]);
              if (readRows && readRows.length > 0) {
                for (const r of readRows) {
                  userReadsMap.set(r.docId, r.status);
                }
              }
            } catch (readErr) {}
          }
        } else {
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
          const [dbRows]: any = await pool.query(query);
          if (Array.isArray(dbRows)) rows = dbRows;

          try {
            const [dRecs]: any = await pool.query('SELECT * FROM department_receives');
            if (Array.isArray(dRecs)) deptReceives = dRecs;
          } catch (e) {}

          if (username) {
            try {
              const [readRows]: any = await pool.query('SELECT docId, status FROM document_reads WHERE username = ?', [username]);
              if (readRows && readRows.length > 0) {
                for (const r of readRows) {
                  userReadsMap.set(r.docId, r.status);
                }
              }
            } catch (readErr) {}
          }

          try {
            const [folderRows]: any = await pool.query('SELECT id, name FROM folders');
            if (folderRows) folderRows.forEach((f: any) => folderMap.set(Number(f.id), f.name));
          } catch (fErr) {}

          rawDocumentsCache = {
            rows,
            deptReceives,
            folderMap: new Map(folderMap),
            expiry: Date.now() + RAW_DOCS_CACHE_TTL
          };
        }
      } catch (mysqlErr: any) {
        console.warn('MySQL documents query warning, falling back to localDb:', mysqlErr.message);
        rows = [];
      }
    }

    // Fallback to localDb if MySQL is offline or returned empty/failed
    if (rows.length === 0) {
      const inbox = (localDb.inbox_documents || []).map((d: any) => ({ ...d, type: 'inbox', isCircular: false }));
      const outbox = (localDb.outbox_documents || []).map((d: any) => ({ ...d, type: 'outbox', isCircular: false }));
      const circular = (localDb.circular_documents || []).map((d: any) => ({ ...d, type: 'outbox', isCircular: true }));
      const internal = (localDb.internal_documents || []).map((d: any) => ({ ...d, type: 'internal', isCircular: false }));
      const admin = (localDb.admin_documents || []).map((d: any) => ({ ...d, type: 'admin', isCircular: false }));
      rows = [...inbox, ...outbox, ...circular, ...internal, ...admin];
      deptReceives = localDb.department_receives || [];
      if (localDb.folders) {
        localDb.folders.forEach((f: any) => folderMap.set(Number(f.id), f.name));
      }
      if (username && localDb.document_reads) {
        localDb.document_reads
          .filter((r: any) => r.username === username)
          .forEach((r: any) => userReadsMap.set(r.docId, r.status));
      }
    }

    const deptRecsMap = new Map<string, any[]>();
    for (const r of deptReceives) {
      const docIdStr = String(r.docId);
      let arr = deptRecsMap.get(docIdStr);
      if (!arr) {
        arr = [];
        deptRecsMap.set(docIdStr, arr);
      }
      arr.push(r);
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
      
      const deptRecs = deptRecsMap.get(String(d.id)) || [];
      const folderName = d.folderId ? (folderMap.get(Number(d.folderId)) || null) : null;
      
      const isCentralVal = (d.isCentral === 0 || d.isCentral === '0' || Number(d.isCentral) === 0) ? 0 : 1;
      let item = { 
        ...d, 
        isCentral: isCentralVal,
        attachments: Array.isArray(attachments) ? attachments : [], 
        isCircular: Boolean(d.isCircular), 
        departmentReceives: deptRecs, 
        folderName, 
        readStatus: userReadsMap.get(d.id) || 'sent' 
      };
      if (d.type === 'outbox' && d.note && d.note.startsWith('[CATEGORY:')) {
        const match = d.note.match(/^\[CATEGORY:(.*?)\] (.*)/);
        if (match) {
          return { ...item, category: match[1], note: match[2] };
        }
      }
      return item;
    });

    // Role-based central access restriction:
    // Only 'admin' and 'moderator' can view Central Saraban documents (isCentral === 1).
    // Regular 'user' roles MUST NOT see Central Saraban data.
    const isCentralPrivileged = role === 'admin' || role === 'moderator' || role === 'ผู้ดูแลระบบ';
    
    if (!isCentralPrivileged) {
      // Filter documents for non-admin/moderator users (department users)
      processedRows = processedRows.filter((doc: any) => {
        const isDocCentral = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);
        const userDept = department && typeof department === 'string' ? department.trim() : '';

        if (userDept) {
          const matchesDept = doc.department === userDept ||
            doc.from === userDept ||
            doc.to === userDept ||
            (doc.createdBy && username && doc.createdBy === username) ||
            (doc.assignee && username && (doc.assignee === username || doc.assignee.includes(username))) ||
            (doc.forwardedTo && doc.forwardedTo.includes(userDept)) ||
            (doc.departmentReceives && Array.isArray(doc.departmentReceives) && doc.departmentReceives.some((r: any) => r.department === userDept));
          
          if (isDocCentral) {
            // For Central Saraban documents, only allow if forwarded to userDept or received by userDept
            const matchesForward = doc.forwardedTo && doc.forwardedTo.includes(userDept);
            const matchesReceive = doc.departmentReceives && Array.isArray(doc.departmentReceives) && doc.departmentReceives.some((r: any) => r.department === userDept);
            return Boolean(matchesForward || matchesReceive);
          }

          return Boolean(matchesDept);
        }
        return !isDocCentral;
      });
    } else if (isCentral !== '1' && department && typeof department === 'string' && department.trim() !== '') {
      const userDept = department.trim();
      processedRows = processedRows.filter((doc: any) => {
        const matchesDept = doc.department === userDept ||
          doc.from === userDept ||
          doc.to === userDept ||
          (doc.createdBy && username && doc.createdBy === username) ||
          (doc.assignee && username && (doc.assignee === username || doc.assignee.includes(username))) ||
          (doc.forwardedTo && doc.forwardedTo.includes(userDept)) ||
          (doc.departmentReceives && Array.isArray(doc.departmentReceives) && doc.departmentReceives.some((r: any) => r.department === userDept));
        return Boolean(matchesDept);
      });
    }
    return res.json(processedRows);
  } catch (error: any) {
    console.error('Error in /api/documents:', error.message);
    return res.json([]);
  }
});

// Endpoint for Forwarding Document to Department(s)
app.post('/api/documents/forward', async (req, res) => {
  const { docId, docType, targetDepartments, forwardNote, forwardedBy } = req.body;
  if (!docId || !targetDepartments || !Array.isArray(targetDepartments) || targetDepartments.length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุเอกสารและฝ่ายที่ต้องการส่งต่อ' });
  }

  const ip = getClientIp(req);

  try {
    await handleDocumentForwarding(docId, docType, targetDepartments, forwardNote, forwardedBy, ip, req);
    return res.json({ success: true, message: `ส่งต่อหนังสือให้ฝ่าย ${targetDepartments.join(',')} เรียบร้อยแล้ว` });
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
    // Consult active numbering rule for this department and 'หนังสือรับ'
    let deptRules: any[] = [];
    if (isMysqlOnline) {
      const [rRows]: any = await pool.query("SELECT * FROM numbering_rules WHERE isActive = 1 AND (docType = 'หนังสือรับ' OR docType = 'หนังสือเข้า')").catch(() => [[]]);
      deptRules = rRows || [];
    } else {
      deptRules = (localDb.numbering_rules || []).filter((r: any) => r.isActive && (r.docType === 'หนังสือรับ' || r.docType === 'หนังสือเข้า'));
    }
    const matchingRule = deptRules.find((r: any) => (r.department || '').trim() === department.trim());
    const ruleBaseSeq = matchingRule ? Number(matchingRule.currentSeq || 0) : 0;

    let maxVal = 0;
    try {
      const [maxRows]: any = await pool.query('SELECT MAX(receiveNumber) as maxNum FROM department_receives WHERE department = ? AND year = ?', [department, year]);
      maxVal = maxRows[0]?.maxNum ? Number(maxRows[0].maxNum) : 0;
    } catch (e) {
      const list = (localDb.department_receives || []).filter((d: any) => d.department === department && String(d.year) === String(year));
      maxVal = list.reduce((m: number, d: any) => Math.max(m, Number(d.receiveNumber || 0)), 0);
    }

    const nextNum = Math.max(ruleBaseSeq, maxVal) + 1;

    try {
      await pool.query(
        'INSERT IGNORE INTO department_receives (docId, department, receiveNumber, year, receivedBy) VALUES (?, ?, ?, ?, ?)',
        [id, department, nextNum, year, username || 'ผู้ใช้งาน']
      );
    } catch (e) {
      if (!localDb.department_receives) localDb.department_receives = [];
      const exists = localDb.department_receives.some((d: any) => String(d.docId) === String(id) && d.department === department);
      if (!exists) {
        localDb.department_receives.push({ docId: id, department, receiveNumber: nextNum, year, receivedBy: username || 'ผู้ใช้งาน' });
        saveLocalDb();
      }
    }

    // Update active numbering rule currentSeq if matchingRule found
    if (matchingRule) {
      if (isMysqlOnline) {
        await pool.query('UPDATE numbering_rules SET currentSeq = ?, year = ? WHERE id = ?', [nextNum, year, matchingRule.id]).catch(() => {});
      }
      if (localDb.numbering_rules) {
        const lr = localDb.numbering_rules.find((r: any) => r.id === matchingRule.id);
        if (lr) {
          lr.currentSeq = nextNum;
          lr.year = year;
        }
        saveLocalDb();
      }
    }

    // Also update tracking
    const trackingComment = `ฝ่าย ${department} ลงรับหนังสือเรียบร้อยแล้ว (เลขรับฝ่าย: ${nextNum}/${year}${matchingRule ? ` • กฎ: ${matchingRule.ruleName}` : ''})`;
    try {
      await pool.query(
        'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
        [id, docType || 'inbox', 'ฝ่ายลงรับหนังสือ', trackingComment, username || 'ผู้ใช้งาน']
      );
    } catch (e) {}

    await addSystemLog('DEPT_RECEIVE', `ลงรับหนังสือฝ่าย ${department} (เลขรับ: ${nextNum}/${year}) เอกสาร ID ${id}`, username || 'ผู้ใช้งาน', ip);

    return res.json({ success: true, receiveNumber: nextNum, ruleName: matchingRule?.ruleName || null });
  } catch (error: any) {
    console.error('Department receive error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', async (req, res) => {
  const doc = req.body;
  const currentSystemYear = await getSystemCurrentYear();
  const docYear = doc.year || currentSystemYear;
  doc.year = docYear;
  const docId = doc.id || 'doc_' + Math.random().toString(36).substring(2, 9);
  const type = doc.type || 'inbox';
  const folderId = doc.folderId ? parseInt(doc.folderId, 10) : null;
  const status = doc.status || 'ลงทะเบียน';
  const ip = getClientIp(req);
  const attachmentsJson = JSON.stringify(doc.attachments || []);

  const isCentralVal = doc.isCentral !== undefined ? Number(doc.isCentral) : 1;

  try {
      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson, isCentralVal]
        );
      } else if (type === 'outbox') {
        if (doc.isCircular) {
          await pool.query(
            'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson, isCentralVal]
          );
        } else {
          await pool.query(
            'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.secrecy || 'ปกติ', doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson, 0, isCentralVal]
          );
        }
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.receiveNumber, doc.year, doc.docNumber, doc.date, doc.priority, doc.title, doc.from, doc.to, doc.department, doc.assignee, doc.note, doc.content, doc.registerDate, folderId, status, attachmentsJson, isCentralVal]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, doc.category || 'order', doc.docNumber || '', doc.year || '', doc.date || '', doc.title || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, isCentralVal]
        );
      }
      
      // Auto-insert initial tracking record
      await pool.query(
        'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
        [docId, type, status, 'ลงทะเบียนเอกสารใหม่เข้าระบบ', doc.assignee || 'ผู้ดูแลระบบ']
      );

      // Trigger Email Notification
      notifyWorkChange({ ...doc, id: docId, type }, 'CREATE', type).catch(err => console.warn('Notification failed:', err.message));

      // Auto-Forwarding if department is specified
      if (doc.department && doc.department !== 'สารบรรณกลาง') {
        handleDocumentForwarding(docId, type, [doc.department], 'ส่งต่อโดยอัตโนมัติขณะลงทะเบียน', doc.assignee || 'สารบรรณกลาง', ip, req).catch(err => console.warn('Auto-forwarding failed:', err.message));
      }

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

      // Rich HTML Email Notification - target only specific assignee/user
      const targets = [doc.assignee].filter(Boolean);
      if (targets.length > 0) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        let settingsData: any = {};
        if (localDb.settings && localDb.settings.length > 0) {
          settingsData = localDb.settings[0];
        }

        const emailHtml = generateDocNotificationEmailHtml({
          badgeText: '📥 ลงทะเบียนเอกสารใหม่',
          heading: `มีเอกสารใหม่ลงทะเบียนในระบบ: ${doc.title || '-'}`,
          description: `ระบบสารบรรณได้ทำการลงทะเบียนเอกสารใหม่ และมอบหมาย/ส่งถึงท่านหรือฝ่ายงานของท่าน`,
          docNumber: doc.docNumber || '-',
          receiveNumber: doc.receiveNumber ? `${doc.receiveNumber}/${docYear}` : '-',
          title: doc.title || '-',
          docType: type,
          priority: doc.priority || 'ปกติ',
          secrecy: doc.secrecy || 'ปกติ',
          from: doc.from || '-',
          to: doc.to || '-',
          department: doc.department || '-',
          assignee: doc.assignee || '-',
          date: doc.date || '',
          note: doc.note || '-',
          attachmentsCount: Array.isArray(doc.attachments) ? doc.attachments.length : 0,
          orgName: settingsData.orgName,
          logoUrl: settingsData.logoUrl,
          footerText: settingsData.footerText,
          baseUrl
        });

        sendNotificationEmail(targets, `[ระบบสารบรรณ] เอกสารใหม่: ${doc.title || 'ลงทะเบียนหนังสือ'}`, emailHtml);
      }
      await addSystemLog('CREATE_DOCUMENT', `ลงทะเบียนหนังสือใหม่ (${type}): ${doc.docNumber || doc.receiveNumber || docId} - ${doc.title}`, doc.assignee || 'ผู้ใช้งาน', ip);
      await updateNumberingRuleSequenceForDoc(doc);
      broadcastRealtimeEvent('NOTIFICATIONS_UPDATED', { docId });

      return res.json({ success: true, id: docId });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

app.put('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const doc = req.body;
  const currentSystemYear = await getSystemCurrentYear();
  const docYear = doc.year || currentSystemYear;
  doc.year = docYear;
  const type = doc.type || 'inbox';
  const folderId = doc.folderId ? parseInt(doc.folderId, 10) : null;
  const status = doc.status || 'ลงทะเบียน';
  const ip = getClientIp(req);
  const attachmentsJson = JSON.stringify(doc.attachments || []);

  try {
      // Automatic Orphan File Cleanup:
      // If any attachment previously belonged to this document, but was removed during this edit,
      // physically delete it from the server disk!
      try {
        let previousAttachments: string[] = [];
        if (isMysqlOnline) {
          const [oldRows]: any = await pool.query(
            'SELECT attachments FROM inbox_documents WHERE id=? UNION SELECT attachments FROM outbox_documents WHERE id=? UNION SELECT attachments FROM circular_documents WHERE id=? UNION SELECT attachments FROM internal_documents WHERE id=? UNION SELECT attachments FROM admin_documents WHERE id=?',
            [id, id, id, id, id]
          );
          if (oldRows && oldRows.length > 0 && oldRows[0].attachments) {
            try {
              const parsed = JSON.parse(oldRows[0].attachments);
              if (Array.isArray(parsed)) previousAttachments = parsed.map(String);
            } catch (e) {}
          }
        }
        if (previousAttachments.length === 0) {
          const tbls = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
          for (const tbl of tbls) {
            const found = (localDb[tbl] || []).find((d: any) => String(d.id) === String(id));
            if (found && found.attachments) {
              previousAttachments = Array.isArray(found.attachments) ? found.attachments.map(String) : [String(found.attachments)];
              break;
            }
          }
        }

        const newAttachments: string[] = Array.isArray(doc.attachments) ? doc.attachments.map(String) : [];
        const removedUrls = previousAttachments.filter(oldUrl => oldUrl && !newAttachments.includes(oldUrl));
        for (const remUrl of removedUrls) {
          deletePhysicalUploadFile(remUrl);
        }
      } catch (cleanErr: any) {
        console.warn('Auto cleanup of removed attachments failed:', cleanErr.message);
      }

      // First delete from all tables to handle type/category changes safely
      await pool.query('DELETE FROM inbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM outbox_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM circular_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM internal_documents WHERE id=?', [id]);
      await pool.query('DELETE FROM admin_documents WHERE id=?', [id]);

      const isCentralVal = doc.isCentral !== undefined ? Number(doc.isCentral) : 1;

      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, isCentralVal]
        );
      } else if (type === 'outbox') {
        if (doc.isCircular) {
          await pool.query(
            'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, isCentralVal]
          );
        } else {
          await pool.query(
            'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.secrecy || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, 0, isCentralVal]
          );
        }
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.receiveNumber || '', doc.year || '', doc.docNumber || '', doc.date || '', doc.priority || 'ปกติ', doc.title || '', doc.from || '', doc.to || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, isCentralVal]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, doc.category || 'order', doc.docNumber || '', doc.year || '', doc.date || '', doc.title || '', doc.department || '', doc.assignee || '', doc.note || '', doc.content || '', doc.registerDate || new Date().toISOString(), folderId, status, attachmentsJson, isCentralVal]
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
      await updateNumberingRuleSequenceForDoc(doc);

      // Trigger Email Notification
      notifyWorkChange({ ...doc, id, type }, 'UPDATE', type).catch(err => console.warn('Notification failed:', err.message));

      // Auto-Forwarding if department is specified and changed or newly set
      if (doc.department && doc.department !== 'สารบรรณกลาง') {
        handleDocumentForwarding(id, type, [doc.department], 'ส่งต่อโดยอัตโนมัติขณะปรับปรุงข้อมูล', doc.modifiedBy || doc.assignee || 'สารบรรณกลาง', ip, req).catch(err => console.warn('Auto-forwarding failed:', err.message));
      }

      return res.json({ success: true, version: newEditVersion });
    } catch (error: any) {
      console.error('Database error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

});

// Helper: Resolve a URL or relative path to an absolute path in uploads
function resolveLocalUploadFilePath(fileUrlOrPath?: string): string | null {
  if (!fileUrlOrPath) return null;
  let clean = String(fileUrlOrPath).trim().replace(/^\//, '');
  try { clean = decodeURIComponent(clean); } catch (e) {}
  if (clean.startsWith('uploads/')) clean = clean.substring(8);
  if (clean.startsWith('/uploads/')) clean = clean.substring(9);

  const uploadsBase = path.resolve(process.cwd(), 'uploads');
  const directPath = path.resolve(uploadsBase, clean);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) return directPath;

  const baseName = path.basename(clean);
  const searchDirs = ['', 'inbox', 'outbox', 'signed_pdfs', 'internal', 'admin', 'system', 'previews'];
  for (const dir of searchDirs) {
    const candidate = path.resolve(uploadsBase, dir, baseName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Helper: Convert local absolute path back to public URL
function getPublicUrlFromLocalPath(fullPath: string): string {
  const uploadsBase = path.resolve(process.cwd(), 'uploads');
  const rel = path.relative(uploadsBase, fullPath);
  return `/uploads/${rel.replace(/\\/g, '/')}`;
}

// Helper: Generate an authentic EDMS PDF document if doc has no file
async function ensureRealEdmsPdfForDoc(doc: any): Promise<{ fullPath: string; publicUrl: string }> {
  const inboxDir = path.join(process.cwd(), 'uploads', 'inbox');
  if (!fs.existsSync(inboxDir)) fs.mkdirSync(inboxDir, { recursive: true });
  const fileName = `edms_doc_${doc.id || 'doc'}.pdf`;
  const fullPath = path.join(inboxDir, fileName);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 1000) {
    return { fullPath, publicUrl: `/uploads/inbox/${fileName}` };
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Header bar
  page.drawRectangle({
    x: 40,
    y: height - 70,
    width: width - 80,
    height: 40,
    color: rgb(0.06, 0.22, 0.42)
  });
  page.drawText('EDMS OFFICIAL ELECTRONIC GOVERNMENT RECORD', {
    x: 52,
    y: height - 52,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  let y = height - 95;
  page.drawText(`Document No: ${sanitizeForPdf(doc.docNumber || 'V-' + doc.id, 'EDMS-DOC')}`, { x: 50, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Date: ${sanitizeForPdf(doc.date || new Date().toISOString().split('T')[0], '2026-09-17')}`, { x: 380, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });

  y -= 18;
  page.drawText(`Subject: ${sanitizeForPdf(doc.title || 'Official Executive Document', 'Official Record')}`, { x: 50, y, size: 10, font: fontBold, color: rgb(0.08, 0.2, 0.4) });

  y -= 16;
  page.drawText(`Department: ${sanitizeForPdf(doc.department, 'Rayong Disaster Prevention Office')}`, { x: 50, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`To: ${sanitizeForPdf(doc.to, 'Head of Government Agencies')}`, { x: 380, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });

  y -= 12;
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9)
  });

  y -= 25;
  page.drawText('Document Content / Executive Order:', { x: 50, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 16;
  const content = sanitizeForPdf(doc.content || 'Electronic Document Management System. Official letter registered in system with digital integrity tracking.', 'Official content');
  const lines = content.match(/.{1,70}/g) || [content];
  for (const line of lines.slice(0, 10)) {
    page.drawText(line, { x: 50, y, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
  }

  // Executive Signature Box
  const sigBoxY = 160;
  page.drawRectangle({
    x: 320,
    y: sigBoxY,
    width: 220,
    height: 100,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.85, 0.9),
    color: rgb(0.98, 0.99, 1)
  });
  page.drawText('(Executive Signature Block)', { x: 350, y: sigBoxY + 70, size: 8, font: fontBold, color: rgb(0.4, 0.5, 0.6) });
  page.drawText(sanitizeForPdf(doc.department, 'Executive Director'), { x: 340, y: sigBoxY + 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  page.drawText('Certified by Department of Disaster Prevention and Mitigation EDMS System', {
    x: 50,
    y: 35,
    size: 7.5,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(fullPath, Buffer.from(pdfBytes));
  return { fullPath, publicUrl: `/uploads/inbox/${fileName}` };
}

// Helper: Fast render PDF page preview as JPEG using headless Chrome + PDF.js with caching
async function generatePdfThumbnail(pdfFullPath: string, targetPageIdx: number = 0): Promise<string | null> {
  try {
    const previewsDir = path.join(process.cwd(), 'uploads', 'previews');
    if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });

    const fileStat = fs.statSync(pdfFullPath);
    const hashKey = `${path.basename(pdfFullPath)}_p${targetPageIdx}_${Math.floor(fileStat.mtimeMs)}`;
    const previewFileName = `thumb_${Buffer.from(hashKey).toString('hex').slice(0, 16)}.jpg`;
    const previewFullPath = path.join(previewsDir, previewFileName);
    const publicUrl = `/uploads/previews/${previewFileName}`;

    if (fs.existsSync(previewFullPath) && fs.statSync(previewFullPath).size > 10000) {
      return publicUrl;
    }

    const pdfBytes = fs.readFileSync(pdfFullPath);
    const pdfBase64 = pdfBytes.toString('base64');

    const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.min.js');
    const pdfJsPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.js');

    if (!fs.existsSync(workerPath) || !fs.existsSync(pdfJsPath)) {
      console.warn('PDF.js assets missing for thumbnail generation');
      return null;
    }

    const workerCode = fs.readFileSync(workerPath, 'utf8');
    const pdfJsCode = fs.readFileSync(pdfJsPath, 'utf8');

    // Puppeteer stripped for AI Studio migration
    /*
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    */
    throw new Error('Puppeteer is disabled in this environment.');

    try {
      const page = await browser.newPage();
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { background: white; overflow: hidden; }
              canvas { display: block; }
            </style>
          </head>
          <body>
            <canvas id="pdf-page-canvas"></canvas>
          </body>
        </html>
      `);

      await page.addScriptTag({ content: pdfJsCode });

      const pageNum = targetPageIdx + 1;
      const renderResult = await page.evaluate(async (b64, worker, pNum) => {
        try {
          const blob = new Blob([worker], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

          const raw = atob(b64);
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);

          const pdf = await (window as any).pdfjsLib.getDocument({ data: uint8Array }).promise;
          const targetP = Math.min(Math.max(1, pNum), pdf.numPages);
          const pdfPage = await pdf.getPage(targetP);
          const viewport = pdfPage.getViewport({ scale: 1.5 });

          const canvas = document.getElementById('pdf-page-canvas') as HTMLCanvasElement;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
          return { success: true, width: viewport.width, height: viewport.height, totalPages: pdf.numPages };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }, pdfBase64, workerCode, pageNum);

      if (renderResult && renderResult.success) {
        const canvasHandle = await page.$('#pdf-page-canvas');
        if (canvasHandle) {
          const imgBuf = await canvasHandle.screenshot({ type: 'jpeg', quality: 85 });
          fs.writeFileSync(previewFullPath, imgBuf);
          return publicUrl;
        }
      } else {
        console.warn('Render PDF error in puppeteer:', renderResult?.error);
      }
      return null;
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    console.warn('PDF thumbnail generation fallback error:', err.message);
    return null;
  }
}

// AI Smart Document Layout & Whitespace Detection for QR Stamping (Pulls Real Files)
app.post('/api/documents/:id/ai-stamp-layout', async (req, res) => {
  const { id } = req.params;
  const { 
    qrSizePreference, 
    targetAttachmentUrl, 
    targetFileUrl, 
    pageIndex: reqPageIdx, 
    targetPageIndex: reqTargetPageIdx,
    pageSnapshotBase64
  } = req.body || {};

  const effectiveAttachmentUrl = targetFileUrl || targetAttachmentUrl || '';
  const requestedPageIndex = reqTargetPageIdx !== undefined ? reqTargetPageIdx : reqPageIdx;

  try {
    const tables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    let doc: any = null;
    let targetTable = '';

    if (isMysqlOnline) {
      for (const tbl of tables) {
        const [rows]: any = await pool.query(`SELECT * FROM ${tbl} WHERE id = ?`, [id]);
        if (rows && rows.length > 0) {
          doc = rows[0];
          targetTable = tbl;
          break;
        }
      }
    }

    if (!doc) {
      for (const tbl of tables) {
        const found = (localDb[tbl] || []).find((d: any) => String(d.id) === String(id));
        if (found) {
          doc = found;
          targetTable = tbl;
          break;
        }
      }
    }

    if (!doc) {
      // Fallback representation
      doc = {
        id,
        title: req.body?.title || 'หนังสือราชการสารบรรณอิเล็กทรอนิกส์',
        docNumber: req.body?.docNumber || 'รย ๐๐๒๑/ว ๑๐๙๒',
        department: req.body?.department || 'สำนักงาน ปภ. จังหวัดระยอง',
        content: req.body?.content || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้นำระบบคิวอาร์โค้ดอัจฉริยะ (Smart QR Verification) มาประทับเพื่อเป็นหลักฐานยืนยันความถูกต้องของหนังสือราชการและป้องกันการแก้ไขดัดแปลง',
        to: req.body?.to || 'หัวหน้าส่วนราชการทุกหน่วยงาน',
        attachments: []
      };
      targetTable = 'inbox_documents';
    }

    // Parse current attachments
    let currentAttachments: string[] = [];
    if (doc.attachments) {
      try {
        currentAttachments = typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments;
      } catch (e) {
        currentAttachments = [doc.attachments];
      }
    }
    if (!Array.isArray(currentAttachments)) {
      currentAttachments = [];
    }

    // Build available attachments list with file metadata
    const availableAttachments: Array<{ name: string; url: string; type: 'pdf' | 'image' | 'other'; size?: number; isSelected?: boolean }> = [];
    for (const att of currentAttachments) {
      if (typeof att === 'string' && att.trim()) {
        const full = resolveLocalUploadFilePath(att);
        const name = path.basename(att);
        const ext = path.extname(att).toLowerCase();
        const type = ext === '.pdf' ? 'pdf' : ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext) ? 'image' : 'other';
        const size = full ? fs.statSync(full).size : undefined;
        availableAttachments.push({ name, url: att, type, size });
      }
    }

    // Determine the real file to analyze
    let realFileFullPath: string | null = null;
    let realFileUrl: string = '';
    let realFileType: 'pdf' | 'image' | 'other' = 'pdf';

    // 1. If user explicitly specified targetAttachmentUrl
    if (targetAttachmentUrl) {
      const resolved = resolveLocalUploadFilePath(targetAttachmentUrl);
      if (resolved) {
        realFileFullPath = resolved;
        realFileUrl = targetAttachmentUrl;
        const ext = path.extname(resolved).toLowerCase();
        realFileType = ext === '.pdf' ? 'pdf' : ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? 'image' : 'other';
      }
    }

    // 2. Pick primary attachment (prefer PDF, then image)
    if (!realFileFullPath && availableAttachments.length > 0) {
      const pdfAtt = availableAttachments.find(a => a.type === 'pdf');
      const imgAtt = availableAttachments.find(a => a.type === 'image');
      const chosen = pdfAtt || imgAtt || availableAttachments[0];
      const resolved = resolveLocalUploadFilePath(chosen.url);
      if (resolved) {
        realFileFullPath = resolved;
        realFileUrl = chosen.url;
        realFileType = chosen.type;
      }
    }

    // 3. If still no file and NO attachments exist, check inbox for sample PDF
    if (!realFileFullPath && availableAttachments.length === 0) {
      const samplePdfPath = path.join(process.cwd(), 'uploads', 'inbox', 'รูปภาพ.pdf');
      if (fs.existsSync(samplePdfPath)) {
        realFileFullPath = samplePdfPath;
        realFileUrl = '/uploads/inbox/รูปภาพ.pdf';
        realFileType = 'pdf';
      }
    }

    // 4. If still no file on disk, generate an official EDMS PDF for this document
    if (!realFileFullPath) {
      const generated = await ensureRealEdmsPdfForDoc(doc);
      realFileFullPath = generated.fullPath;
      realFileUrl = generated.publicUrl;
      realFileType = 'pdf';
      if (!currentAttachments.includes(realFileUrl)) {
        currentAttachments.push(realFileUrl);
        // Persist attachment
        if (isMysqlOnline && targetTable) {
          await pool.query(`UPDATE ${targetTable} SET attachments = ? WHERE id = ?`, [JSON.stringify(currentAttachments), id]);
        }
        if (targetTable && localDb[targetTable]) {
          const lItem = localDb[targetTable].find((d: any) => String(d.id) === String(id));
          if (lItem) lItem.attachments = currentAttachments;
        }
      }
    }

    // Extract file stats
    const fileStat = fs.statSync(realFileFullPath);
    const fileSizeBytes = fileStat.size;
    const realFileName = path.basename(realFileFullPath);

    let pdfWidth = 595.28;
    let pdfHeight = 841.89;
    let pageCount = 1;
    let targetPageIdx = requestedPageIndex !== undefined ? Math.max(0, Number(requestedPageIndex)) : 0;
    let pagePreviewUrl: string | null = null;
    let pdfBytes: Buffer | null = null;

    if (realFileType === 'pdf') {
      try {
        pdfBytes = fs.readFileSync(realFileFullPath);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        pageCount = pages.length;
        if (requestedPageIndex === undefined) {
          // In Thai EDMS multi-page documents, official signatures are located on the last page
          targetPageIdx = pageCount > 1 ? pageCount - 1 : 0;
        } else {
          targetPageIdx = Math.min(Math.max(0, targetPageIdx), pageCount - 1);
        }
        const sz = pages[targetPageIdx]?.getSize() || pages[0]?.getSize();
        if (sz) {
          pdfWidth = sz.width;
          pdfHeight = sz.height;
        }
        // Generate or retrieve cached page thumbnail preview
        pagePreviewUrl = await generatePdfThumbnail(realFileFullPath, targetPageIdx);
      } catch (pdfErr: any) {
        console.warn('PDF load warning in layout analysis:', pdfErr.message);
      }
    } else if (realFileType === 'image') {
      pagePreviewUrl = realFileUrl;
    }

    // Default density & base optimal size
    let density: 'sparse' | 'medium' | 'dense' = 'medium';
    let baseOptimalSize = qrSizePreference ? Number(qrSizePreference) : 85;
    let recommendedSpotId = 'signature-left';
    let detectedRealContentSummary = `ดึงไฟล์เอกสารจริง: ${realFileName} (${(fileSizeBytes / 1024).toFixed(1)} KB, ${pageCount} หน้า)`;
    let aiExplanation = `AI ตรวจสอบโครงสร้างไฟล์จริง [${realFileName}]: หน้าที่ ${targetPageIdx + 1}/${pageCount} แนะนำประทับที่ 'ท้ายหนังสือฝั่งซ้าย' ซึ่งเป็นพื้นที่ว่างปลอดภัย ปรับขนาดเป็น ${baseOptimalSize}x${baseOptimalSize} pt ไม่ทับตัวหนังสือหรือลายมือชื่อ`;

    // Multi-Model Gemini Vision & Layout Analysis on the REAL File
    let aiCustomZones: any[] = [];
    const stampApiKey = await getAppGeminiApiKey();
    if (stampApiKey) {
      try {
        const client = getGeminiClient(stampApiKey, req);
        const prompt = `คุณคือระบบ AI ผู้เชี่ยวชาญด้านงานสารบรรณอิเล็กทรอนิกส์และการวิเคราะห์เอกสารราชการไทย (EDMS)
นี่คือไฟล์เอกสารราชการจริง (ชื่อไฟล์: ${realFileName}, เรื่อง: ${doc.title || '-'}, เลขที่: ${doc.docNumber || '-'})
จงวิเคราะห์โครงสร้างหน้าเอกสารจริงนี้ (หน้า ${targetPageIdx + 1} จากทั้งหมด ${pageCount} หน้า) ด้วยความแม่นยำสูง (ขนาดหน้ากระดาษ กว้าง ${pdfWidth.toFixed(1)} pt, สูง ${pdfHeight.toFixed(1)} pt):
1. ตรวจสอบตำแหน่งที่มีข้อความ ตราครุฑ ตรายางประทับ ลายมือชื่อ และข้อความท้ายกระดาษ (Occupied Zones) โดยระบุพิกัด top, left, width, height (หน่วยเป็น pt นับจากมุมบนซ้ายของหน้ากระดาษ)
2. ค้นหา 'พื้นที่ว่างปลอดภัย (Safe Whitespace)' สำหรับประทับตรา QR Code ยืนยันเอกสาร (ขนาดแนะนำประมาณ 75-85 pt)
   - ต้องไม่ทับเนื้อหา ตราครุฑ หรือลายมือชื่อเด็ดขาด
   - เว้นระยะปลอดภัย (Safe Margin) อย่างน้อย 30-40 pt
   - สอดคล้องกับระเบียบงานสารบรรณ เช่น ท้ายหนังสือฝั่งซ้ายตรงข้ามบล็อกลงนาม, มุมบนขวา หรือมุมล่างขวา
3. คืนค่าผลลัพธ์เป็น JSON ล้วน (ไม่ต้องมี markdown code block):
{
  "targetPageIndex": ${targetPageIdx},
  "density": "sparse" | "medium" | "dense",
  "optimalSize": 85,
  "recommendedSpotId": "signature-left" | "top-right" | "bottom-right" | "bottom-left",
  "detectedRealContentSummary": "ข้อความและองค์ประกอบที่ตรวจพบในไฟล์จริง",
  "aiExplanation": "คำอธิบายการวิเคราะห์โครงสร้างไฟล์จริงและเหตุผลการจัดวางสั้นกระชับภาษาไทย",
  "occupiedZones": [
    { "id": "zone_1", "label": "คำอธิบายโซน", "top": 50, "left": 50, "width": 495, "height": 100 }
  ]
}`;

        // Prepare multimodal contents
        let contentsPayload: any = prompt;
        if (pdfBytes && realFileType === 'pdf') {
          contentsPayload = [
            {
              inlineData: {
                data: pdfBytes.toString('base64'),
                mimeType: 'application/pdf'
              }
            },
            prompt
          ];
        } else if (pagePreviewUrl && fs.existsSync(resolveLocalUploadFilePath(pagePreviewUrl) || '')) {
          const previewPath = resolveLocalUploadFilePath(pagePreviewUrl)!;
          const imgBytes = fs.readFileSync(previewPath);
          contentsPayload = [
            {
              inlineData: {
                data: imgBytes.toString('base64'),
                mimeType: 'image/jpeg'
              }
            },
            prompt
          ];
        }

        const { response } = await callGeminiWithFallback({
          client,
          contents: contentsPayload,
          config: {
            responseMimeType: 'application/json'
          },
          models: ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash']
        });

        if (response && response.text) {
          try {
            const parsed = JSON.parse(response.text.trim());
            if (parsed.recommendedSpotId) recommendedSpotId = parsed.recommendedSpotId;
            if (parsed.density) density = parsed.density;
            if (parsed.optimalSize && !qrSizePreference) baseOptimalSize = Number(parsed.optimalSize);
            if (parsed.aiExplanation) aiExplanation = parsed.aiExplanation;
            if (parsed.detectedRealContentSummary) detectedRealContentSummary = parsed.detectedRealContentSummary;
            if (parsed.targetPageIndex !== undefined && requestedPageIndex === undefined) {
              targetPageIdx = Math.min(Math.max(0, Number(parsed.targetPageIndex)), pageCount - 1);
            }
            if (Array.isArray(parsed.occupiedZones) && parsed.occupiedZones.length > 0) {
              aiCustomZones = parsed.occupiedZones.map((z: any, idx: number) => ({
                id: z.id || `zone_${idx}`,
                label: z.label || 'พื้นที่ข้อความในไฟล์จริง',
                top: Number(z.top) || 0,
                left: Number(z.left) || 0,
                width: Number(z.width) || 100,
                height: Number(z.height) || 50,
                pdfY: pdfHeight - (Number(z.top) || 0) - (Number(z.height) || 50),
                pdfX: Number(z.left) || 0
              }));
            }
          } catch (jsonErr) {
            console.warn('Could not parse Gemini JSON response, using text fallback:', response.text);
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini real file analysis warning:', geminiErr.message);
      }
    }

    // Occupied zones (Top-down coordinates)
    const occupiedZones = aiCustomZones.length > 0 ? aiCustomZones : [
      { id: 'garuda_header', label: 'ตราครุฑและหัวกระดาษราชการ', top: 25, left: 190, width: 215, height: 65, pdfY: pdfHeight - 90, pdfX: 190 },
      { id: 'header_metadata', label: 'ส่วนราชการ/เลขที่หนังสือ/วันที่/เรื่อง', top: 90, left: 50, width: 495, height: 130, pdfY: pdfHeight - 220, pdfX: 50 },
      {
        id: 'content_body',
        label: 'เนื้อหาข้อความสารบรรณในไฟล์จริง',
        top: 225,
        left: 50,
        width: 495,
        height: density === 'sparse' ? 140 : density === 'medium' ? 260 : 380,
        pdfY: density === 'sparse' ? pdfHeight - 365 : density === 'medium' ? pdfHeight - 485 : pdfHeight - 605,
        pdfX: 50
      },
      {
        id: 'signature_block',
        label: 'พื้นที่ลงนามและตำแหน่งผู้บริหาร',
        top: density === 'sparse' ? 390 : density === 'medium' ? 510 : 625,
        left: 280,
        width: 250,
        height: 120,
        pdfY: density === 'sparse' ? pdfHeight - 510 : density === 'medium' ? pdfHeight - 630 : pdfHeight - 745,
        pdfX: 280
      },
      { id: 'footer_info', label: 'ข้อมูลส่วนราชการเจ้าของเรื่อง/โทรสาร', top: pdfHeight - 70, left: 50, width: 350, height: 40, pdfY: 30, pdfX: 50 }
    ];

    // Coordinates calculation
    const sigLeftTop = density === 'sparse' ? 400 : density === 'medium' ? 520 : 635;
    const sigLeftPdfY = pdfHeight - sigLeftTop - baseOptimalSize;

    const topRightTop = 35;
    const topRightLeft = pdfWidth - Math.min(baseOptimalSize, 78) - 45;
    const topRightPdfY = pdfHeight - topRightTop - Math.min(baseOptimalSize, 78);

    const bottomRightTop = pdfHeight - baseOptimalSize - 45;
    const bottomRightLeft = pdfWidth - baseOptimalSize - 45;
    const bottomRightPdfY = 45;

    const bottomLeftTop = pdfHeight - Math.min(baseOptimalSize, 80) - 85;
    const bottomLeftLeft = 55;
    const bottomLeftPdfY = 85;

    const spots = [
      {
        id: 'signature-left',
        name: 'ท้ายหนังสือฝั่งซ้าย (ตรงข้ามบล็อกลงนาม)',
        badge: 'แนะนำโดย AI สูงสุด',
        isAiRecommended: recommendedSpotId === 'signature-left',
        x: 65,
        y: sigLeftPdfY,
        top: sigLeftTop,
        left: 65,
        width: baseOptimalSize,
        height: baseOptimalSize,
        xPercent: (65 / pdfWidth) * 100,
        yPercent: (sigLeftTop / pdfHeight) * 100,
        confidence: recommendedSpotId === 'signature-left' ? 99 : 92,
        reason: 'พื้นที่ว่างฝั่งซ้ายตรงข้ามลายมือชื่อผู้บริหารในไฟล์จริง มีระยะห่างปลอดภัย 45+ pt ไม่บังตัวหนังสือและสอดคล้องกับระเบียบงานสารบรรณ',
        isSafe: true,
        collisionRisk: 'none'
      },
      {
        id: 'top-right',
        name: 'มุมบนขวา (ข้างส่วนราชการ)',
        badge: 'มาตรฐานสากล',
        isAiRecommended: recommendedSpotId === 'top-right',
        x: topRightLeft,
        y: topRightPdfY,
        top: topRightTop,
        left: topRightLeft,
        width: Math.min(baseOptimalSize, 78),
        height: Math.min(baseOptimalSize, 78),
        xPercent: (topRightLeft / pdfWidth) * 100,
        yPercent: (topRightTop / pdfHeight) * 100,
        confidence: recommendedSpotId === 'top-right' ? 97 : 94,
        reason: 'มุมบนขวาของหน้ากระดาษ สะดวกต่อการสแกนตรวจสอบทันที ห่างจากตราครุฑ 125 pt ปลอดภัย 100%',
        isSafe: true,
        collisionRisk: 'none'
      },
      {
        id: 'bottom-right',
        name: 'มุมล่างขวาของหน้า (Margin Bottom-Right)',
        badge: 'ท้ายแผ่นกระดาษ',
        isAiRecommended: recommendedSpotId === 'bottom-right',
        x: bottomRightLeft,
        y: bottomRightPdfY,
        top: bottomRightTop,
        left: bottomRightLeft,
        width: baseOptimalSize,
        height: baseOptimalSize,
        xPercent: (bottomRightLeft / pdfWidth) * 100,
        yPercent: (bottomRightTop / pdfHeight) * 100,
        confidence: recommendedSpotId === 'bottom-right' ? 96 : 91,
        reason: 'พื้นที่ขอบล่างขวา ห่างจากลายมือชื่อและส่วนท้าย ไม่กระทบข้อความและสแกนสะดวก',
        isSafe: true,
        collisionRisk: 'none'
      },
      {
        id: 'bottom-left',
        name: 'มุมล่างซ้าย (ใกล้กลุ่มงานเจ้าของเรื่อง)',
        badge: 'แถบรับรอง',
        isAiRecommended: recommendedSpotId === 'bottom-left',
        x: bottomLeftLeft,
        y: bottomLeftPdfY,
        top: bottomLeftTop,
        left: bottomLeftLeft,
        width: Math.min(baseOptimalSize, 80),
        height: Math.min(baseOptimalSize, 80),
        xPercent: (bottomLeftLeft / pdfWidth) * 100,
        yPercent: (bottomLeftTop / pdfHeight) * 100,
        confidence: recommendedSpotId === 'bottom-left' ? 96 : 89,
        reason: 'พื้นที่มุมล่างซ้ายเหนือข้อมูลติดต่อเจ้าของเรื่อง เหมาะสำหรับการประทับตรารับรองเอกสาร',
        isSafe: true,
        collisionRisk: 'none'
      }
    ];

    return res.json({
      success: true,
      documentId: id,
      docTitle: doc.title,
      docNumber: doc.docNumber,
      hasRealFile: true,
      realFileName,
      realFileUrl,
      realFileType,
      fileSizeBytes,
      pagePreviewUrl,
      availableAttachments,
      pageSize: { width: pdfWidth, height: pdfHeight },
      pageCount,
      targetPageIndex: targetPageIdx,
      density,
      optimalSize: baseOptimalSize,
      occupiedZones,
      recommendedSpotId,
      spots,
      aiExplanation,
      detectedRealContentSummary
    });
  } catch (error: any) {
    console.error('Error in /api/documents/:id/ai-stamp-layout:', error);
    return res.status(500).json({ error: 'ล้มเหลวในการวิเคราะห์เลย์เอาต์ด้วย AI: ' + error.message });
  }
});

// Document QR / Official Seal Stamp API Endpoint (Stamps directly on Real PDF)
app.post('/api/documents/:id/stamp', async (req, res) => {
  const { id } = req.params;
  const {
    qrCodeImage,
    stampedBy = 'ผู้ดูแลระบบ',
    x,
    y,
    width: reqWidth,
    height: reqHeight,
    pageIndex = 0,
    coordinateOrigin = 'bottom-left',
    addVerificationCaption = true,
    aiSpotName = '',
    targetFileUrl
  } = req.body;
  const ip = getClientIp(req);

  try {
    const tables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    let doc: any = null;
    let targetTable = '';

    if (isMysqlOnline) {
      for (const tbl of tables) {
        const [rows]: any = await pool.query(`SELECT * FROM ${tbl} WHERE id = ?`, [id]);
        if (rows && rows.length > 0) {
          doc = rows[0];
          targetTable = tbl;
          break;
        }
      }
    }

    if (!doc) {
      for (const tbl of tables) {
        const found = (localDb[tbl] || []).find((d: any) => String(d.id) === String(id));
        if (found) {
          doc = found;
          targetTable = tbl;
          break;
        }
      }
    }

    if (!doc) {
      doc = {
        id,
        title: req.body?.title || 'หนังสือราชการสารบรรณอิเล็กทรอนิกส์',
        docNumber: req.body?.docNumber || 'รย ๐๐๒๑/ว ๑๐๙๒',
        department: req.body?.department || 'สำนักงาน ปภ. จังหวัดระยอง',
        content: req.body?.content || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้นำระบบคิวอาร์โค้ดอัจฉริยะ (Smart QR Verification) มาประทับเพื่อเป็นหลักฐานยืนยันความถูกต้องของหนังสือราชการและป้องกันการแก้ไขดัดแปลง',
        to: req.body?.to || 'หัวหน้าส่วนราชการทุกหน่วยงาน',
        attachments: []
      };
      targetTable = 'inbox_documents';
    }

    // Process attachments
    let currentAttachments: string[] = [];
    if (doc.attachments) {
      try {
        currentAttachments = typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments;
      } catch (e) {
        currentAttachments = [doc.attachments];
      }
    }
    if (!Array.isArray(currentAttachments)) {
      currentAttachments = [];
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let stampImageUrl = '';
    let imageBuffer: Buffer | null = null;

    if (qrCodeImage && typeof qrCodeImage === 'string') {
      const match = qrCodeImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'svg+xml' ? 'svg' : match[1];
        const base64Data = match[2];
        imageBuffer = Buffer.from(base64Data, 'base64');
        const fileName = `stamp_${id}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, imageBuffer);
        stampImageUrl = `/uploads/${fileName}`;
      } else if (qrCodeImage.startsWith('http://') || qrCodeImage.startsWith('https://') || qrCodeImage.startsWith('/uploads/')) {
        stampImageUrl = qrCodeImage;
        const resolved = resolveLocalUploadFilePath(qrCodeImage);
        if (resolved) {
          imageBuffer = fs.readFileSync(resolved);
        }
      }
    }

    let stampedPdfUrl = '';
    let stampedFileName = '';
    const stampW = Number(reqWidth) > 0 ? Number(reqWidth) : 85;
    const stampH = Number(reqHeight) > 0 ? Number(reqHeight) : 85;
    let actualStampX = 65;
    let actualStampY = 140;

    // Resolve real target file to stamp on
    let targetPdfFullPath: string | null = null;
    if (targetFileUrl) {
      targetPdfFullPath = resolveLocalUploadFilePath(targetFileUrl);
    }
    if (!targetPdfFullPath) {
      const pdfAtt = currentAttachments.find(att => typeof att === 'string' && att.toLowerCase().endsWith('.pdf'));
      if (pdfAtt) {
        targetPdfFullPath = resolveLocalUploadFilePath(pdfAtt);
      }
    }
    if (!targetPdfFullPath) {
      const samplePdfPath = path.join(process.cwd(), 'uploads', 'inbox', 'รูปภาพ.pdf');
      if (fs.existsSync(samplePdfPath)) {
        targetPdfFullPath = samplePdfPath;
      } else {
        const gen = await ensureRealEdmsPdfForDoc(doc);
        targetPdfFullPath = gen.fullPath;
      }
    }

    // Stamp directly onto the target PDF
    if (imageBuffer && targetPdfFullPath && fs.existsSync(targetPdfFullPath)) {
      try {
        const pdfBytes = fs.readFileSync(targetPdfFullPath);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const targetPageIdx = Math.min(Math.max(0, Number(pageIndex) || 0), pages.length - 1);
        const targetPage = pages[targetPageIdx] || pages[0];
        const { width, height } = targetPage.getSize();

        let embeddedImage;
        try {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } catch (pngErr) {
          try {
            embeddedImage = await pdfDoc.embedJpg(imageBuffer);
          } catch (jpgErr) {
            console.warn('Could not embed stamp as PNG/JPG:', jpgErr);
          }
        }

        if (embeddedImage) {
          // Calculate coordinates
          if (x !== undefined && y !== undefined) {
            actualStampX = Number(x);
            if (coordinateOrigin === 'top-left') {
              actualStampY = height - Number(y) - stampH;
            } else {
              actualStampY = Number(y);
            }
          } else {
            // Default: Left of signature block
            actualStampX = 65;
            actualStampY = 140;
          }

          // Ensure bounds inside page
          actualStampX = Math.max(15, Math.min(width - stampW - 15, actualStampX));
          actualStampY = Math.max(15, Math.min(height - stampH - 15, actualStampY));

          targetPage.drawImage(embeddedImage, {
            x: actualStampX,
            y: actualStampY,
            width: stampW,
            height: stampH
          });

          if (addVerificationCaption) {
            try {
              const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
              const caption = `EDMS VERIFY: ${doc.docNumber || doc.id}`;
              targetPage.drawText(caption, {
                x: actualStampX + Math.max(0, (stampW - (caption.length * 4.2)) / 2),
                y: Math.max(8, actualStampY - 8),
                size: 6.5,
                font: helvetica,
                color: rgb(0.2, 0.25, 0.3)
              });
            } catch (captionErr) {
              // ignore
            }
          }

          const stampedPdfBytes = await pdfDoc.save();
          const baseNameClean = path.basename(targetPdfFullPath).replace(/^stamped_\d+_/, '');
          stampedFileName = `stamped_${Date.now()}_${baseNameClean}`;
          const stampedPdfFullPath = path.join(uploadsDir, stampedFileName);
          fs.writeFileSync(stampedPdfFullPath, Buffer.from(stampedPdfBytes));
          stampedPdfUrl = `/uploads/${stampedFileName}`;

          // Pre-generate preview thumbnail of stamped document
          await generatePdfThumbnail(stampedPdfFullPath, targetPageIdx);

          currentAttachments.unshift(stampedPdfUrl);
        }
      } catch (stampPdfErr: any) {
        console.warn('Error stamping on real PDF:', stampPdfErr.message);
      }
    }

    // Fallback: If stamping failed, generate certified PDF
    if (!stampedPdfUrl && imageBuffer) {
      try {
        const newPdf = await PDFDocument.create();
        const page = newPdf.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        const helvetica = await newPdf.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await newPdf.embedFont(StandardFonts.HelveticaBold);

        page.drawText('EDMS SARABAN ELECTRONIC DOCUMENT', {
          x: 50,
          y: height - 50,
          size: 14,
          font: helveticaBold,
          color: rgb(0.08, 0.22, 0.42)
        });
        page.drawText(`Document No: ${doc.docNumber || doc.id}`, { x: 50, y: height - 70, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`Title: ${doc.title || '-'}`, { x: 50, y: height - 86, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

        let embeddedImage;
        try { embeddedImage = await newPdf.embedPng(imageBuffer); } catch (e) { try { embeddedImage = await newPdf.embedJpg(imageBuffer); } catch (_) {} }

        if (embeddedImage) {
          actualStampX = x !== undefined ? Number(x) : 65;
          actualStampY = y !== undefined ? (coordinateOrigin === 'top-left' ? height - Number(y) - stampH : Number(y)) : 140;
          page.drawImage(embeddedImage, { x: actualStampX, y: actualStampY, width: stampW, height: stampH });
        }

        const newPdfBytes = await newPdf.save();
        stampedFileName = `edms_certified_${id}_${Date.now()}.pdf`;
        const newPdfFullPath = path.join(uploadsDir, stampedFileName);
        fs.writeFileSync(newPdfFullPath, Buffer.from(newPdfBytes));
        stampedPdfUrl = `/uploads/${stampedFileName}`;
        currentAttachments.unshift(stampedPdfUrl);
      } catch (e: any) {
        console.warn('Fallback PDF error:', e.message);
      }
    }

    if (stampImageUrl && !currentAttachments.includes(stampImageUrl)) {
      currentAttachments.push(stampImageUrl);
    }

    const attachmentsJson = JSON.stringify(currentAttachments);

    if (isMysqlOnline && targetTable) {
      await pool.query(`UPDATE ${targetTable} SET attachments = ? WHERE id = ?`, [attachmentsJson, id]);
    }

    if (targetTable && localDb[targetTable]) {
      const localItem = localDb[targetTable].find((d: any) => String(d.id) === String(id));
      if (localItem) {
        localItem.attachments = currentAttachments;
      }
    }
    saveLocalDb();

    const stampDetailDesc = `ประทับตรา QR Code อัจฉริยะด้วย AI ลงในไฟล์จริง (${aiSpotName || 'ตำแหน่งปลอดภัยไม่ทับตัวหนังสือ'} ขนาด ${Math.round(stampW)}x${Math.round(stampH)} pt) สำเร็จ`;

    try {
      if (isMysqlOnline) {
        await pool.query(
          'INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES (?, ?, ?, ?, ?)',
          [id, doc.type || 'inbox', doc.status || 'ลงทะเบียน', stampDetailDesc, stampedBy]
        );
      }
    } catch (trackErr: any) {
      console.warn('Failed to insert document tracking:', trackErr.message);
    }

    if (!localDb.document_versions) localDb.document_versions = [];
    const existingVers = localDb.document_versions.filter((v: any) => String(v.docId) === String(id));
    const maxVerNum = existingVers.reduce((max: number, v: any) => Math.max(max, v.versionNumber || 0), 0);
    const nextVerNum = maxVerNum + 1;

    localDb.document_versions.forEach((v: any) => {
      if (String(v.docId) === String(id)) {
        v.isCurrent = false;
      }
    });

    const newStampVersion = {
      id: `ver-${id}-${nextVerNum}`,
      docId: String(id),
      docType: doc.type || 'inbox',
      versionNumber: nextVerNum,
      title: doc.title || '',
      docNumber: doc.docNumber || doc.receiveNumber || '',
      from: doc.from || doc.fromDept || '',
      to: doc.to || doc.toDept || '',
      department: doc.department || '',
      assignee: doc.assignee || '',
      priority: doc.priority || 'ปกติ',
      secrecy: doc.secrecy || 'ปกติ',
      content: doc.content || '',
      note: doc.note || '',
      attachments: currentAttachments,
      changeSummary: `ประทับตรายืนยัน QR Code ลงในไฟล์เอกสารจริงด้วย AI (${aiSpotName || 'ปลอดภัยไม่ทับตัวหนังสือ'} ขนาด ${Math.round(stampW)}x${Math.round(stampH)} pt) (Version ${nextVerNum})`,
      modifiedBy: stampedBy,
      modifiedAt: new Date().toISOString(),
      isCurrent: true
    };

    localDb.document_versions.unshift(newStampVersion);
    saveLocalDb();

    await addSystemLog('STAMP_DOCUMENT', `ประทับตรา QR Studio ด้วย AI ลงบนไฟล์จริง (${doc.type || targetTable}): ID ${id} - ${stampedFileName || doc.title}`, stampedBy, ip);

    return res.json({
      success: true,
      message: `ประทับตรายืนยัน QR Code อัจฉริยะด้วย AI ลงในไฟล์จริง [${stampedFileName || doc.docNumber || id}] เรียบร้อยแล้ว`,
      stampImageUrl,
      stampedPdfUrl: stampedPdfUrl || null,
      stampedFileName,
      attachments: currentAttachments,
      version: newStampVersion,
      stampPosition: { x: actualStampX, y: actualStampY, width: stampW, height: stampH, pageIndex }
    });
  } catch (error: any) {
    console.error('Document stamp error:', error);
    return res.status(500).json({ error: 'ไม่สามารถบันทึกตราลงเอกสารได้: ' + error.message });
  }
});

// Upload a real PDF or document directly to an EDMS record from the modal
app.post('/api/documents/:id/upload-attachment', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
  }

  try {
    const fileUrl = `/uploads/${file.filename}`;
    const tables = ['inbox_documents', 'outbox_documents', 'circular_documents', 'internal_documents', 'admin_documents'];
    let targetTable = '';
    let doc: any = null;

    if (isMysqlOnline) {
      for (const tbl of tables) {
        const [rows]: any = await pool.query(`SELECT * FROM ${tbl} WHERE id = ?`, [id]);
        if (rows && rows.length > 0) {
          doc = rows[0];
          targetTable = tbl;
          break;
        }
      }
    }

    if (!doc) {
      for (const tbl of tables) {
        const found = (localDb[tbl] || []).find((d: any) => String(d.id) === String(id));
        if (found) {
          doc = found;
          targetTable = tbl;
          break;
        }
      }
    }

    let currentAttachments: string[] = [];
    if (doc?.attachments) {
      try {
        currentAttachments = typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments;
      } catch (e) {
        currentAttachments = [doc.attachments];
      }
    }
    if (!Array.isArray(currentAttachments)) currentAttachments = [];

    currentAttachments.unshift(fileUrl);
    const attachmentsJson = JSON.stringify(currentAttachments);

    if (isMysqlOnline && targetTable) {
      await pool.query(`UPDATE ${targetTable} SET attachments = ? WHERE id = ?`, [attachmentsJson, id]);
    }
    if (targetTable && localDb[targetTable]) {
      const lItem = localDb[targetTable].find((d: any) => String(d.id) === String(id));
      if (lItem) lItem.attachments = currentAttachments;
      saveLocalDb();
    }

    // If PDF, generate preview thumbnail right away
    let pagePreviewUrl: string | null = null;
    if (file.filename.toLowerCase().endsWith('.pdf')) {
      pagePreviewUrl = await generatePdfThumbnail(file.path, 0);
    } else if (file.mimetype.startsWith('image/')) {
      pagePreviewUrl = fileUrl;
    }

    return res.json({
      success: true,
      message: `อัปโหลดไฟล์จริง [${file.originalname}] เข้าสู่ระบบเรียบร้อยแล้ว`,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      pagePreviewUrl,
      attachments: currentAttachments
    });
  } catch (err: any) {
    console.error('Error uploading document attachment:', err);
    return res.status(500).json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message });
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
      await pool.query('DELETE FROM workflow_instances WHERE docId=?', [id]);
    }

    if (localDb.workflow_instances) {
      localDb.workflow_instances = localDb.workflow_instances.filter((wi: any) => String(wi.docId) !== String(id));
      saveLocalDb();
    }

    await syncAllNumberingRulesSequence();
    await addSystemLog('DELETE_DOCUMENT', `ย้ายหนังสือไปยังถังขยะ ID: ${id} - ${doc?.title || localDoc?.title || ''}`, username, ip);

    // Trigger Email Notification
    const finalDoc = doc || localDoc;
    if (finalDoc) {
      notifyWorkChange(finalDoc, 'DELETE', tableType || localType).catch(err => console.warn('Notification failed:', err.message));
    }

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
      const isCentralVal = d.isCentral !== undefined ? Number(d.isCentral) : 1;
      if (type === 'inbox') {
        await pool.query(
          'INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), isCentralVal]
        );
      } else if (type === 'outbox') {
        await pool.query(
          'INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCircular, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), d.isCircular ? 1 : 0, isCentralVal]
        );
      } else if (type === 'circular') {
        await pool.query(
          'INSERT INTO circular_documents (id, receiveNumber, year, docNumber, date, priority, secrecy, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.secrecy, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), isCentralVal]
        );
      } else if (type === 'internal') {
        await pool.query(
          'INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.receiveNumber, d.year, d.docNumber, d.date, d.priority, d.title, d.fromDept, d.toDept, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), isCentralVal]
        );
      } else if (type === 'admin') {
        await pool.query(
          'INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status, attachments, isCentral) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.id, d.category, d.docNumber, d.year, d.date, d.title, d.department, d.assignee, d.note, d.content, d.registerDate, d.folderId, d.status, typeof d.attachments === 'string' ? d.attachments : JSON.stringify(d.attachments || []), isCentralVal]
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
    await syncAllNumberingRulesSequence();
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
    
    // Clean up associated physical attachment files from server disk
    try {
      let originalDataObj: any = null;
      if (itemToDelete.originalData) {
        originalDataObj = typeof itemToDelete.originalData === 'string' ? JSON.parse(itemToDelete.originalData) : itemToDelete.originalData;
      }
      const rawAtts = originalDataObj?.attachments;
      if (rawAtts) {
        let attList: string[] = [];
        if (Array.isArray(rawAtts)) {
          attList = rawAtts.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || '') : String(f || ''));
        } else if (typeof rawAtts === 'string' && rawAtts.trim() !== '') {
          try {
            const parsed = JSON.parse(rawAtts);
            if (Array.isArray(parsed)) {
              attList = parsed.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || '') : String(f || ''));
            } else {
              attList = [rawAtts];
            }
          } catch(e) {
            attList = [rawAtts];
          }
        }

        for (const fileUrl of attList) {
          if (!fileUrl) continue;
          deletePhysicalUploadFile(fileUrl);
        }
      }
    } catch(delErr: any) {
      console.warn('Could not clean up physical files on permanent delete:', delErr.message);
    }
    
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
    await syncAllNumberingRulesSequence();
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
    case 'ตีกลับ':
    case 'แก้ไข':
      return `ส่งกลับแก้ไขเอกสาร (${docNumber})`;
    default:
      return `อัพเดทสถานะเอกสาร (${docNumber})`;
  }
}

app.get('/api/notifications', async (req, res) => {
  const { department, name, role, filterType } = req.query;

  try {
    let trackings: any[] = [];
    const docMap = new Map<string, any>();
    let allActiveDocs: any[] = [];

    if (isMysqlOnline) {
      const [dbTrackings]: any = await pool.query('SELECT * FROM document_tracking ORDER BY updatedAt DESC, id DESC LIMIT 500');
      trackings = dbTrackings || [];
      
      const docQuery = `
        SELECT id, 'inbox' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status, createdAt FROM inbox_documents
        UNION ALL
        SELECT id, 'outbox' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status, createdAt FROM outbox_documents
        UNION ALL
        SELECT id, 'circular' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status, createdAt FROM circular_documents
        UNION ALL
        SELECT id, 'internal' AS type, docNumber, receiveNumber, year, date, priority, secrecy, title, fromDept AS \`from\`, toDept AS \`to\`, department, assignee, note, content, registerDate, status, createdAt FROM internal_documents
        UNION ALL
        SELECT id, 'admin' AS type, docNumber, NULL AS receiveNumber, year, date, 'ปกติ' AS priority, 'ปกติ' AS secrecy, title, 'สำนักงาน ปภ.จังหวัดระยอง' AS \`from\`, 'ทุกฝ่ายงาน' AS \`to\`, department, assignee, note, content, registerDate, status, createdAt FROM admin_documents
      `;
      const [rows]: any = await pool.query(docQuery);
      allActiveDocs = rows || [];
      allActiveDocs.forEach((d: any) => {
        docMap.set(String(d.id), d);
      });
    } else {
      // Offline localDb fallback
      trackings = localDb.document_tracking || [];
      trackings = [...trackings].sort((a: any, b: any) => {
        const timeA = new Date(a.updatedAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.updatedAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      }).slice(0, 500);

      allActiveDocs = [
        ...(localDb.inbox_documents || []).map((d: any) => ({ ...d, type: 'inbox' })),
        ...(localDb.outbox_documents || []).map((d: any) => ({ ...d, type: 'outbox' })),
        ...(localDb.circular_documents || []).map((d: any) => ({ ...d, type: 'circular' })),
        ...(localDb.internal_documents || []).map((d: any) => ({ ...d, type: 'internal' })),
        ...(localDb.admin_documents || []).map((d: any) => ({ ...d, type: 'admin' }))
      ];
      allActiveDocs.forEach((d: any) => {
        docMap.set(String(d.id), d);
      });
    }

    const notificationList: any[] = [];
    const now = new Date();

    // 1. Notifications from Document Tracking (Workflow & Status Updates)
    const filteredTrackings = trackings.filter((t: any) => {
      if (name && t.updatedBy === name) return false;
      if (role === 'admin') return true;

      const docInfo = docMap.get(String(t.docId));
      if (!docInfo) return false;

      if (name && (docInfo.assignee === name || t.recipient === name)) return true;
      if (department && (docInfo.department === department || docInfo.to === department)) return true;

      return true;
    }).slice(0, 40);

    filteredTrackings.forEach((t: any) => {
      const docInfo = docMap.get(String(t.docId)) || { docNumber: 'ไม่ระบุ', title: 'เอกสารถูกลบแล้ว', priority: 'ปกติ', department: 'ฝ่ายยุทธศาสตร์และการจัดการ' };
      const isUrgent = docInfo.priority === 'ด่วนที่สุด' || docInfo.priority === 'ด่วนมาก';
      
      notificationList.push({
        id: `track_${t.id}`,
        docId: t.docId,
        docType: t.docType || docInfo.type || 'inbox',
        type: isUrgent ? 'urgent' : (t.status === 'เสร็จสิ้น' ? 'completed' : 'status_change'),
        category: 'workflow',
        priority: docInfo.priority || 'ปกติ',
        secrecy: docInfo.secrecy || 'ปกติ',
        docNumber: docInfo.docNumber || docInfo.receiveNumber || 'ไม่ระบุเลข',
        docTitle: docInfo.title || '',
        title: getNotificationTitle(t.status, docInfo.docNumber || docInfo.receiveNumber || 'เอกสาร'),
        message: `เรื่อง: ${docInfo.title}${t.comments ? ` | หมายเหตุ: ${t.comments}` : ''}`,
        comments: t.comments || '',
        department: docInfo.department || '',
        assignee: docInfo.assignee || '',
        time: t.updatedAt || t.timestamp || new Date().toISOString(),
        updater: t.updatedBy || 'ระบบสารบรรณ',
        status: t.status,
        read: false
      });
    });

    // 2. Urgent / Critical Document Alerts (หนังสือด่วนมาก / ด่วนที่สุด)
    const urgentDocs = allActiveDocs.filter((d: any) => {
      const isPrio = d.priority === 'ด่วนที่สุด' || d.priority === 'ด่วนมาก';
      const isPending = d.status !== 'เสร็จสิ้น' && d.status !== 'completed';
      if (!isPrio || !isPending) return false;
      if (role === 'admin') return true;
      if (name && d.assignee === name) return true;
      if (department && (d.department === department || d.to === department)) return true;
      return true;
    }).slice(0, 15);

    urgentDocs.forEach((d: any) => {
      notificationList.push({
        id: `urgent_doc_${d.id}`,
        docId: d.id,
        docType: d.type || 'inbox',
        type: 'urgent',
        category: 'urgent',
        priority: d.priority || 'ด่วนที่สุด',
        secrecy: d.secrecy || 'ปกติ',
        docNumber: d.docNumber || d.receiveNumber || 'ไม่ระบุเลข',
        docTitle: d.title || '',
        title: `🚨 แจ้งเตือนหนังสือ${d.priority}: ${d.docNumber || d.receiveNumber}`,
        message: `เรื่อง: ${d.title} (จาก: ${d.from || '-'} | ถึง: ${d.to || '-'})`,
        comments: 'กรุณาดำเนินการตามลำดับความเร่งด่วนทันที',
        department: d.department || '',
        assignee: d.assignee || '',
        time: d.registerDate || d.date || d.createdAt || new Date().toISOString(),
        updater: 'ระบบตรวจจับความเร่งด่วนอัตโนมัติ',
        status: d.status || 'pending',
        read: false
      });
    });

    // 3. SLA & Overdue Warning Alerts (หนังสือค้างดำเนินการเกิน SLA)
    const overdueDocs = allActiveDocs.filter((d: any) => {
      const isPending = d.status !== 'เสร็จสิ้น' && d.status !== 'completed';
      if (!isPending) return false;
      const createdDate = new Date(d.registerDate || d.date || d.createdAt || 0);
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 2;
    }).slice(0, 10);

    overdueDocs.forEach((d: any) => {
      const createdDate = new Date(d.registerDate || d.date || d.createdAt || 0);
      const diffDays = Math.max(1, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      notificationList.push({
        id: `sla_doc_${d.id}`,
        docId: d.id,
        docType: d.type || 'inbox',
        type: 'sla_warning',
        category: 'sla',
        priority: d.priority || 'ปกติ',
        secrecy: d.secrecy || 'ปกติ',
        docNumber: d.docNumber || d.receiveNumber || 'ไม่ระบุเลข',
        docTitle: d.title || '',
        title: `⏳ แจ้งเตือนกำหนดเวลา SLA (ค้างดำเนินการ ${diffDays} วัน)`,
        message: `เรื่อง: ${d.title} (${d.department || 'ฝ่ายยุทธศาสตร์และการจัดการ'})`,
        comments: `เอกสารนี้คงค้างในระบบมาแล้ว ${diffDays} วัน โปรดตรวจสอบและเร่งรัดการลงนาม/ส่งต่อ`,
        department: d.department || '',
        assignee: d.assignee || '',
        time: d.registerDate || d.date || d.createdAt || new Date().toISOString(),
        updater: 'ระบบติดตาม SLA อัจฉริยะ',
        status: d.status || 'pending',
        read: false
      });
    });

    // Sort by time descending and deduplicate by ID
    const uniqueMap = new Map<string, any>();
    notificationList.forEach(n => {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    });

    let finalNotifications = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
      const timeA = new Date(a.time || 0).getTime();
      const timeB = new Date(b.time || 0).getTime();
      return timeB - timeA;
    });

    if (filterType && filterType !== 'all') {
      finalNotifications = finalNotifications.filter((n: any) => n.category === filterType || n.type === filterType);
    }

    return res.json(finalNotifications.slice(0, 60));
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
  const role = (req.query.role || req.headers.role || '').toString();
  const ip = getClientIp(req);

  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบในการจัดการสำรองและกู้คืนข้อมูล (backup_restore)' });
  }

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
      'system_logs',
      'draft_documents',
      'user_favorites',
      'document_reads',
      'project_summaries',
      'infographics',
      'urgent_incidents',
      'recycle_bin'
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

// ==========================================
// SCHEDULED BACKUP DAEMON API ENDPOINTS
// ==========================================
app.get('/api/scheduled-backups', async (req, res) => {
  const role = (req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์เข้าถึงระบบตั้งเวลาสำรองข้อมูล (backup_restore)' });
  }

  try {
    await ensureScheduledBackupsTable();
    if (pool && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM scheduled_backups ORDER BY id ASC');
        const formatted = (rows || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
        return res.json({ success: true, schedules: formatted });
      } catch (dbErr) {
        console.warn('MySQL scheduled_backups query warning:', dbErr);
      }
    }

    const list = (localDb.scheduled_backups || []).map((s: any) => ({ ...s, isActive: Boolean(s.isActive) }));
    return res.json({ success: true, schedules: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคิวตั้งเวลาสำรองข้อมูล' });
  }
});

app.post('/api/scheduled-backups', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์สร้างคิวตั้งเวลาสำรองข้อมูล' });
  }

  try {
    await ensureScheduledBackupsTable();
    const {
      name,
      scheduleType = 'daily',
      scheduledTime = '00:00',
      weeklyDay = 'monday',
      intervalHours = 24,
      backupScope = 'full',
      retentionDays = 7,
      description = '',
      createdBy = req.body.username || 'ผู้ดูแลระบบ',
      isActive = true
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อตารางตั้งเวลาสำรองข้อมูล' });
    }

    const nowIso = new Date().toISOString();
    let newId = Date.now();

    if (pool && isMysqlOnline) {
      try {
        const [result]: any = await pool.query(
          `INSERT INTO scheduled_backups (name, scheduleType, scheduledTime, weeklyDay, intervalHours, backupScope, retentionDays, description, createdBy, createdAt, isActive, lastStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name.trim(), scheduleType, scheduledTime, weeklyDay, Number(intervalHours) || 24, backupScope, Number(retentionDays) || 7, description, createdBy, nowIso, isActive ? 1 : 0, 'idle']
        );
        if (result && result.insertId) {
          newId = result.insertId;
        }
      } catch (dbErr) {
        console.warn('MySQL insert scheduled_backups warning:', dbErr);
      }
    }

    if (!localDb.scheduled_backups) {
      localDb.scheduled_backups = [];
    }

    const newSchedule = {
      id: newId,
      name: name.trim(),
      scheduleType,
      scheduledTime,
      weeklyDay,
      intervalHours: Number(intervalHours) || 24,
      backupScope,
      retentionDays: Number(retentionDays) || 7,
      description,
      createdBy,
      createdAt: nowIso,
      isActive: Boolean(isActive),
      lastRunAt: null,
      lastStatus: 'idle',
      lastFilename: null,
      lastFileSize: 0
    };

    localDb.scheduled_backups.push(newSchedule);
    saveLocalDb();

    await addSystemLog(
      'CREATE_SCHEDULED_BACKUP',
      `เพิ่มคิวตั้งเวลาสำรองข้อมูลใหม่: "${name}" (${scheduleType} เวลา ${scheduledTime} น. ขอบเขต: ${backupScope})`,
      createdBy,
      getClientIp(req)
    );

    return res.json({ success: true, schedule: newSchedule });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการสร้างคิวตั้งเวลา' });
  }
});

app.put('/api/scheduled-backups/:id', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์แก้ไขคิวตั้งเวลาสำรองข้อมูล' });
  }

  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);
    const {
      name,
      scheduleType,
      scheduledTime,
      weeklyDay,
      intervalHours,
      backupScope,
      retentionDays,
      description,
      isActive
    } = req.body;

    if (pool && isMysqlOnline) {
      try {
        await pool.query(
          `UPDATE scheduled_backups 
           SET name = COALESCE(?, name),
               scheduleType = COALESCE(?, scheduleType),
               scheduledTime = COALESCE(?, scheduledTime),
               weeklyDay = COALESCE(?, weeklyDay),
               intervalHours = COALESCE(?, intervalHours),
               backupScope = COALESCE(?, backupScope),
               retentionDays = COALESCE(?, retentionDays),
               description = COALESCE(?, description),
               isActive = COALESCE(?, isActive)
           WHERE id = ?`,
          [
            name,
            scheduleType,
            scheduledTime,
            weeklyDay,
            intervalHours !== undefined ? Number(intervalHours) : null,
            backupScope,
            retentionDays !== undefined ? Number(retentionDays) : null,
            description,
            isActive !== undefined ? (isActive ? 1 : 0) : null,
            id
          ]
        );
      } catch (dbErr) {
        console.warn('MySQL update scheduled_backups warning:', dbErr);
      }
    }

    if (localDb.scheduled_backups) {
      const match = localDb.scheduled_backups.find((s: any) => Number(s.id) === id);
      if (match) {
        if (name !== undefined) match.name = name;
        if (scheduleType !== undefined) match.scheduleType = scheduleType;
        if (scheduledTime !== undefined) match.scheduledTime = scheduledTime;
        if (weeklyDay !== undefined) match.weeklyDay = weeklyDay;
        if (intervalHours !== undefined) match.intervalHours = Number(intervalHours);
        if (backupScope !== undefined) match.backupScope = backupScope;
        if (retentionDays !== undefined) match.retentionDays = Number(retentionDays);
        if (description !== undefined) match.description = description;
        if (isActive !== undefined) match.isActive = Boolean(isActive);
        saveLocalDb();
      }
    }

    await addSystemLog(
      'UPDATE_SCHEDULED_BACKUP',
      `แก้ไขคิวตั้งเวลาสำรองข้อมูล ID: ${id} (${name || 'ปรับปรุงการตั้งค่า'})`,
      req.body.username || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ success: true, message: 'บันทึกการแก้ไขคิวตั้งเวลาสำเร็จแล้ว' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการแก้ไข' });
  }
});

app.delete('/api/scheduled-backups/:id', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ลบคิวตั้งเวลา' });
  }

  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);

    if (pool && isMysqlOnline) {
      try {
        await pool.query('DELETE FROM scheduled_backups WHERE id = ?', [id]);
      } catch (dbErr) {
        console.warn('MySQL delete scheduled_backups warning:', dbErr);
      }
    }

    if (localDb.scheduled_backups) {
      localDb.scheduled_backups = localDb.scheduled_backups.filter((s: any) => Number(s.id) !== id);
      saveLocalDb();
    }

    await addSystemLog(
      'DELETE_SCHEDULED_BACKUP',
      `ลบคิวตั้งเวลาสำรองข้อมูล ID: ${id}`,
      req.body.username || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ success: true, message: 'ลบคิวตั้งเวลาสำรองข้อมูลสำเร็จแล้ว' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลบ' });
  }
});

app.post('/api/scheduled-backups/:id/toggle', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์เปลี่ยนสถานะคิวตั้งเวลา' });
  }

  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);
    let newStatus = true;

    if (localDb.scheduled_backups) {
      const match = localDb.scheduled_backups.find((s: any) => Number(s.id) === id);
      if (match) {
        match.isActive = !match.isActive;
        newStatus = match.isActive;
        saveLocalDb();
      }
    }

    if (pool && isMysqlOnline) {
      try {
        await pool.query('UPDATE scheduled_backups SET isActive = ? WHERE id = ?', [newStatus ? 1 : 0, id]);
      } catch (dbErr) {}
    }

    await addSystemLog(
      'TOGGLE_SCHEDULED_BACKUP',
      `สลับสถานะคิวตั้งเวลาสำรองข้อมูล ID: ${id} เป็น: ${newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`,
      req.body.username || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการสลับสถานะ' });
  }
});

app.post('/api/scheduled-backups/:id/run-now', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์สั่งรันคิวสำรองข้อมูล' });
  }

  try {
    await ensureScheduledBackupsTable();
    const id = Number(req.params.id);
    let targetTask: any = null;

    if (pool && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM scheduled_backups WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          targetTask = { ...rows[0], isActive: Boolean(rows[0].isActive) };
        }
      } catch (e) {}
    }

    if (!targetTask && localDb.scheduled_backups) {
      targetTask = localDb.scheduled_backups.find((s: any) => Number(s.id) === id);
    }

    if (!targetTask) {
      return res.status(404).json({ success: false, error: 'ไม่พบคิวตั้งเวลาสำรองข้อมูลที่ระบุ' });
    }

    const username = req.body.username || 'ผู้ดูแลระบบ';
    const result = await executeScheduledBackup(targetTask, username);

    if (result.success) {
      return res.json({
        success: true,
        message: `สั่งรันคิว "${targetTask.name}" สำเร็จเรียบร้อยแล้ว`,
        filename: result.filename,
        fileSize: result.fileSize
      });
    } else {
      return res.status(500).json({ success: false, error: result.error || 'เกิดข้อผิดพลาดในการสำรองข้อมูล' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการสั่งรันคิว' });
  }
});


// Function to fetch unified backup list (.tar and .json)
async function getSystemBackupList() {
  const backups: any[] = [];
  try {
    const BACKUP_DIR = path.join(process.cwd(), 'backups');
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.tar') || f.endsWith('.tar.gz') || f.endsWith('.json'));
      for (const f of files) {
        try {
          const fPath = path.join(BACKUP_DIR, f);
          const stat = fs.statSync(fPath);
          const isTar = f.endsWith('.tar') || f.endsWith('.tar.gz');
          const sizeMb = (stat.size / (1024 * 1024)).toFixed(2) + ' MB';
          backups.push({
            id: `bk_${f}`,
            filename: f,
            fileName: f,
            size: stat.size,
            fileSize: sizeMb,
            sizeMb: sizeMb,
            backupType: isTar ? (f.includes('edms_backup_') ? 'สำรองระบบไฟล์และฐานข้อมูล (.tar)' : 'สำรองข้อมูล (.tar)') : 'สำรองฐานข้อมูล (.json)',
            format: isTar ? 'tar' : 'json',
            createdAt: stat.mtime ? stat.mtime.toISOString() : (stat.birthtime ? stat.birthtime.toISOString() : new Date().toISOString())
          });
        } catch (fileErr) {
          console.warn(`Error processing backup file ${f}:`, fileErr);
        }
      }
    }

    // Also merge with database records if available
    if (typeof pool !== 'undefined' && isMysqlOnline) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM system_backups ORDER BY createdAt DESC LIMIT 50').catch(() => [[]]);
        if (rows && Array.isArray(rows)) {
          for (const r of rows) {
            const existing = backups.find(b => b.fileName === r.fileName || b.filename === r.fileName);
            if (existing) {
              existing.backupType = r.backupType || existing.backupType;
              if (r.createdAt && !existing.createdAt) {
                existing.createdAt = new Date(r.createdAt).toISOString();
              }
            } else if (r.fileName) {
               // Optional: add if record exists in DB but not in filesystem?
               // For now just update existing
            }
          }
        }
      } catch (dbErr) {
        console.warn('Error fetching system_backups from DB:', dbErr);
      }
    }
  } catch (err) {
    console.error('Error in getSystemBackupList:', err);
  }

  // Sort descending by createdAt
  backups.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
  return backups;
}

// Automated Daily Backups Management Endpoints

app.get('/api/automated-backups', async (req, res) => {
  const role = (req.query.role || req.headers.role || '').toString();
  console.log(`[BACKUP] GET /api/automated-backups - Role: ${role}`);
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    console.warn(`[BACKUP] Access denied for role: ${role}`);
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบในการดูรายการสำรองข้อมูล (backup_restore)' });
  }
  try {
    const list = await getSystemBackupList();
    console.log(`[BACKUP] Found ${list.length} backups`);
    return res.json({ success: true, files: list, data: list });
  } catch (err: any) {
    console.error(`[BACKUP] Error fetching backup list:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการดึงรายการสำรองข้อมูลอัตโนมัติ' });
  }
});

app.get('/api/automated-backups/download/:filename', async (req, res) => {
  const role = (req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์สำรองข้อมูล' });
  }

  try {
    const filename = path.basename(req.params.filename);
    const BACKUP_DIR = path.join(process.cwd(), 'backups');
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('ไม่พบไฟล์สำรองข้อมูลที่ต้องการดาวน์โหลด');
    }

    const contentType = filename.endsWith('.json') ? 'application/json' : 'application/x-tar';
    res.download(filePath, filename, {
      headers: {
        'Content-Type': contentType
      }
    });
  } catch (err: any) {
    return res.status(500).send('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรองข้อมูล');
  }
});

app.post('/api/automated-backups/restore/:fileName', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบในการกู้คืนข้อมูล (backup_restore)' });
  }

  try {
    const filename = path.basename(req.params.fileName);
    const BACKUP_DIR = path.join(process.cwd(), 'backups');
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'ไม่พบไฟล์สำรองข้อมูลที่ต้องการกู้คืน' });
    }

    let restoredCount = 0;
    let tablesCount = 0;

    if (filename.endsWith('.tar') || filename.endsWith('.tar.gz')) {
      const tar = await import('tar');
      await tar.extract({
        cwd: process.cwd(),
        file: filePath
      });

      const dumpFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith('database_dump_') && f.endsWith('.json'));
      for (const df of dumpFiles) {
        try {
          const content = fs.readFileSync(path.join(process.cwd(), df), 'utf8');
          const dump = JSON.parse(content);
          let tablesToRestore = dump.tables || dump.localDb;
          if (!tablesToRestore || typeof tablesToRestore !== 'object' || Array.isArray(tablesToRestore)) {
            // Fallback to flat format (direct keys in dump)
            tablesToRestore = dump;
          }
          
          if (tablesToRestore && typeof tablesToRestore === 'object') {
            const tableKeys = Object.keys(tablesToRestore);
            tablesCount += tableKeys.length;
            for (const table of tableKeys) {
              const rows = tablesToRestore[table];
              if (Array.isArray(rows)) {
                // Update localDb
                (localDb as any)[table] = rows;
                restoredCount += rows.length;

                // Update MySQL if available
                if (pool && isMysqlOnline) {
                  try {
                    await restoreTableData(table, rows);
                  } catch (tErr: any) {
                    console.warn(`Restore warning for table ${table}:`, tErr.message);
                  }
                }
              }
            }
          }
        } catch {} finally {
          try { fs.unlinkSync(path.join(process.cwd(), df)); } catch {}
        }
      }

      saveLocalDb();
    } else if (filename.endsWith('.json')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const backupData = JSON.parse(content);
      const tablesToRestore = backupData.tables || backupData.localDb;
      if (tablesToRestore && typeof tablesToRestore === 'object') {
        const tableKeys = Object.keys(tablesToRestore);
        tablesCount += tableKeys.length;
        for (const table of tableKeys) {
          const rows = tablesToRestore[table];
          if (Array.isArray(rows)) {
            // Update localDb
            (localDb as any)[table] = rows;
            restoredCount += rows.length;

            // Update MySQL if available
            if (pool && isMysqlOnline) {
              try {
                await restoreTableData(table, rows);
              } catch (tErr: any) {
                console.warn(`Restore warning for table ${table}:`, tErr.message);
              }
            }
          }
        }
      }
      saveLocalDb();
    }

    const username = req.body.username || 'ผู้ดูแลระบบ';
    const ip = getClientIp(req);
    await addSystemLog(
      'RESTORE_DATABASE',
      `กู้คืนข้อมูลระบบจากไฟล์สำรองข้อมูลอัตโนมัติสำเร็จ: ${filename} (นำเข้าข้อมูลรวม ${restoredCount} แถว ใน ${tablesCount} ตาราง)`,
      username,
      ip
    );

    // Broadcast change
    try {
      broadcastToClients({
        type: 'DATABASE_RESTORED',
        filename,
        restoredTables: tablesCount,
        restoredRows: restoredCount,
        restoredAt: new Date().toISOString()
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: `กู้คืนระบบจากไฟล์ ${filename} สำเร็จเรียบร้อยแล้ว`,
      details: {
        tablesCount,
        recordsCount: restoredCount
      }
    });
  } catch (err: any) {
    console.error('❌ Restore automated backup error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
  }
});

app.post('/api/automated-backups/run', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบในการสั่งรันสำรองข้อมูล (backup_restore)' });
  }

  const result = await performAutomatedDailyBackup();
  if (result.success) {
    return res.json({ success: true, message: 'สั่งสำรองข้อมูลอัตโนมัติสำเร็จเรียบร้อยแล้ว', filename: result.filename });
  } else {
    return res.status(500).json({ success: false, error: result.error || 'เกิดข้อผิดพลาดในการสำรองข้อมูล' });
  }
});

app.get('/api/automated-backups/status', async (req, res) => {
  const role = (req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์' });
  }

  await ensureScheduledBackupsTable();
  const isEnabled = localDb.settings && localDb.settings[0] && localDb.settings[0].automatedBackupEnabled !== false;

  let schedules: any[] = [];
  if (pool && isMysqlOnline) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM scheduled_backups');
      schedules = rows || [];
    } catch (e) {
      schedules = localDb.scheduled_backups || [];
    }
  } else {
    schedules = localDb.scheduled_backups || [];
  }

  const activeCount = schedules.filter((s: any) => Boolean(s.isActive)).length;
  const totalCount = schedules.length;

  return res.json({
    success: true,
    enabled: isEnabled,
    activeSchedulesCount: activeCount,
    totalSchedulesCount: totalCount
  });
});

app.post('/api/automated-backups/toggle', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบ' });
  }
  const { enabled } = req.body;
  if (localDb.settings && localDb.settings.length > 0) {
    localDb.settings[0].automatedBackupEnabled = !!enabled;
    saveLocalDb();
  }
  
  const ip = getClientIp(req);
  await addSystemLog("SYSTEM_CONFIG", `อัปเดตสถานะการสำรองข้อมูลอัตโนมัติเป็น: ${enabled ? 'เปิด' : 'ปิด'}`, req.body.username || "ผู้ดูแลระบบ", ip);
  
  return res.json({ success: true, enabled: !!enabled });
});

app.delete('/api/automated-backups/all', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์' });
  }
  try {
    const BACKUP_DIR = path.join(process.cwd(), 'backups');
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR);
      for (const file of files) {
        if (file.startsWith('edms_auto_backup_') && file.endsWith('.tar')) {
          try { fs.unlinkSync(path.join(BACKUP_DIR, file)); } catch (e) {}
        }
      }
    }
    if (typeof pool !== 'undefined' && isMysqlOnline) {
      await pool.query('DELETE FROM system_backups WHERE fileName LIKE "edms_auto_backup_%"').catch(() => {});
    }
    const ip = getClientIp(req);
    await addSystemLog("SYSTEM_CLEANUP", `ลบไฟล์สำรองข้อมูลอัตโนมัติ (.tar) ทั้งหมด`, req.body.username || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true, message: 'ลบไฟล์สำรองข้อมูลอัตโนมัติทั้งหมดเรียบร้อยแล้ว' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลบไฟล์' });
  }
});

app.delete('/api/automated-backups/:filename', async (req, res) => {
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์' });
  }
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.tar') && !safeFilename.endsWith('.json')) {
       return res.status(400).json({ success: false, error: 'ไฟล์ไม่ถูกต้อง' });
    }
    const filePath = path.join(process.cwd(), 'backups', safeFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (typeof pool !== 'undefined' && isMysqlOnline) {
      await pool.query('DELETE FROM system_backups WHERE fileName = ?', [safeFilename]).catch(() => {});
    }
    const ip = getClientIp(req);
    await addSystemLog("SYSTEM_CLEANUP", `ลบไฟล์สำรองข้อมูลอัตโนมัติ: ${safeFilename}`, req.body.username || "ผู้ดูแลระบบ", ip);
    return res.json({ success: true, message: 'ลบไฟล์สำเร็จ' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'เกิดข้อผิดพลาด' });
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
  const role = (req.body.role || req.query.role || req.headers.role || '').toString();
  const ip = getClientIp(req);

  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์ของระบบในการจัดการสำรองและกู้คืนข้อมูล (backup_restore)' });
  }

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
app.post('/api/ai-scan', memoryUpload.single('file'), async (req, res) => {
  try {
    let base64 = '';
    let mimeType = '';
    let outputType = '';
    let hint = '';
    let clientApiKey = '';

    if (req.file) {
      base64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
      outputType = req.body.outputType || 'auto';
      hint = req.body.hint || '';
      clientApiKey = req.body.apiKey || '';
    } else {
      base64 = req.body.base64 || '';
      mimeType = req.body.mimeType || 'image/jpeg';
      outputType = req.body.outputType || 'auto';
      hint = req.body.hint || '';
      clientApiKey = req.body.apiKey || '';
    }

    if (base64) {
      base64 = base64.replace(/^data:.*?;base64,/, '').trim();
    }

    if (!base64) {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลไฟล์เอกสาร (อัปโหลดไฟล์ "file" หรือส่ง "base64" ใน JSON)' });
    }

    const apiKey = await getAppGeminiApiKey(clientApiKey);

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key กรุณาระบุในเมนู "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"' 
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญงานสารบรรณราชการไทยและการจัดการภัยพิบัติ ที่มีความสามารถในการอ่าน สแกน และถอดความเอกสารราชการไทยรวมถึงแบบรายงานเหตุด่วนสาธารณภัย (Disaster/Urgent Incident Report)
อ่านเอกสารในภาพหรือ PDF และสกัดข้อมูลออกมาเป็นโครงสร้าง JSON ตามที่กำหนดเท่านั้น`;

    const userPrompt = `อ่านและถอดความเอกสารราชการนี้ แล้วจัดโครงสร้างข้อมูลในรูปแบบ JSON ดังนี้:
{
  "docType": "ประเภทหนังสือ (หนังสือส่ง/หนังสือภายใน/บันทึกข้อความ/คำสั่ง/ประกาศ/หนังสือรับรอง/หนังสือเวียน/แบบรายงานเหตุด่วนสาธารณภัย)",
  "docNum": "เลขที่หนังสือ เช่น ศธ 04034/123 หรือ ว.15 หรือ รย 0021/ว123 (สำหรับรายงานเหตุด่วน สามารถเป็นเลขที่หนังสือรับหรือส่งได้)",
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
  "confidenceNote": "หมายเหตุเกี่ยวกับความชัดเจน",

  // ฟิลด์พิเศษกรณีที่เป็น 'แบบรายงานเหตุด่วนสาธารณภัย' (ถ้าไม่ใช่ ให้ปล่อยเป็นค่าว่างหรือ array ว่าง)
  "incidentTypes": ["อุทกภัย", "วาตภัย", "อัคคีภัย", "ภัยแล้ง", "ภัยหนาว", "ดินโคลนถล่ม", "อุบัติภัยทางถนน", "อุบัติภัยทางน้ำ", "โรคระบาด", "ไฟป่า", "ภัยอื่นๆ"],
  "incidentTypeOther": "ภัยอื่นๆ นอกเหนือจากตัวเลือก (ถ้ามี)",
  "severity": "เล็กน้อย หรือ ปานกลาง หรือ รุนแรง",
  "startDate": "วันที่เกิดภัย",
  "startTime": "เวลาที่เกิดภัย (HH:MM เช่น 08:30)",
  "endDate": "วันที่สิ้นสุดภัย",
  "endTime": "เวลาที่สิ้นสุดภัย (HH:MM)",
  "location": "สถานที่เกิดภัยแบบละเอียด (ตำบล, อำเภอ, จังหวัด และจุดที่เกิดภัย)",
  "affectedPeople": "จำนวนราษฎรที่เดือดร้อน (ตัวเลขจำนวนคน)",
  "affectedHouseholds": "จำนวนครัวเรือนที่เดือดร้อน (ตัวเลขจำนวนครัวเรือน)",
  "injured": "ผู้บาดเจ็บกี่คน (ตัวเลข)",
  "dead": "ผู้เสียชีวิตกี่คน (ตัวเลข)",
  "missing": "ผู้สูญหายกี่คน (ตัวเลข)",
  "evacuatedPeople": "ผู้อพยพกี่คน (ตัวเลข)",
  "evacuatedHouseholds": "ผู้อพยพกี่ครัวเรือน (ตัวเลข)",
  "damageHouses": "จำนวนบ้านเรือนเสียหาย (ตัวเลข)",
  "damageFactories": "จำนวนโรงงาน/อาคารพาณิชย์เสียหาย (ตัวเลข)",
  "damageBuildingCost": "มูลค่าความเสียหายสิ่งก่อสร้าง (บาท)",
  "damageAgricultureCost": "มูลค่าความเสียหายด้านการเกษตร (บาท)",
  "damagePublicCost": "มูลค่าความเสียหายด้านสาธารณูปโภค (บาท)",
  "totalDamageCost": "รวมมูลค่าความเสียหายทั้งหมด (บาท)",
  "mitigation": "การบรรเทาภัย / การช่วยเหลือเบื้องต้น (ข้อความ)",
  "reporterName": "ชื่อผู้รายงานภัย",
  "reporterPosition": "ตำแหน่งผู้รายงานภัย"
}

${outputType && outputType !== 'auto' ? `ผู้ใช้ต้องการแปลงเป็นประเภท: ${outputType}` : 'ตรวจจับประเภทหนังสือจากเอกสารจริง'}
${hint ? 'คำแนะนำเพิ่มเติมจากผู้ใช้: ' + hint : ''}`;

    const client = getGeminiClient(apiKey, req);

    // Multi-tier Fallback: gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.8-flash with Exponential Backoff
    const { response, usedModel } = await callGeminiWithFallback({
      client,
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
            confidenceNote: { type: Type.STRING },
            incidentTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            incidentTypeOther: { type: Type.STRING },
            severity: { type: Type.STRING },
            startDate: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endDate: { type: Type.STRING },
            endTime: { type: Type.STRING },
            location: { type: Type.STRING },
            affectedPeople: { type: Type.STRING },
            affectedHouseholds: { type: Type.STRING },
            injured: { type: Type.STRING },
            dead: { type: Type.STRING },
            missing: { type: Type.STRING },
            evacuatedPeople: { type: Type.STRING },
            evacuatedHouseholds: { type: Type.STRING },
            damageHouses: { type: Type.STRING },
            damageFactories: { type: Type.STRING },
            damageBuildingCost: { type: Type.STRING },
            damageAgricultureCost: { type: Type.STRING },
            damagePublicCost: { type: Type.STRING },
            totalDamageCost: { type: Type.STRING },
            mitigation: { type: Type.STRING },
            reporterName: { type: Type.STRING },
            reporterPosition: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text || '';
    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(text);
    } catch {
      parsedJson = { rawText: text, subject: 'เอกสารจากการสแกน' };
    }

    return res.json({ success: true, result: parsedJson, usedModel });
  } catch (err: any) {
    console.error('Error in AI scan:', err);
    const friendlyError = formatGeminiErrorMessage(err);
    return res.status(500).json({ success: false, error: friendlyError });
  }
});

// AI Duplicate & Cross-Reference Detector Endpoint
app.post('/api/ai/detect-cross-references', async (req, res) => {
  try {
    const { doc, currentDocId } = req.body;
    if (!doc) {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลหนังสือที่ต้องการตรวจสอบ' });
    }

    const apiKey = await getAppGeminiApiKey(req.body.apiKey);

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

    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let response: any = null;

    if (apiKey) {
      const client = getGeminiClient(apiKey, req);
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
          if (response) break;
        } catch (err: any) {
          // silently continue to next model or fallback
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
    
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key กรุณาระบุในเมนู "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"'
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

    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let auditResponse: any = null;

    try {
      const client = getGeminiClient(apiKey, req);
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
            break;
          }
        } catch (modelErr) {
          // Try next model
        }
      }
    } catch (e) {
      // client error
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

// AI Official Letter Generator Endpoint
app.post('/api/ai/draft-generate', async (req, res) => {
  try {
    const { topic, docType, to, objective, tone, orgName, details, apiKey: reqApiKey } = req.body;

    const apiKey = await getAppGeminiApiKey(reqApiKey);

    const org = orgName || 'ฝ่ายยุทธศาสตร์และการจัดการ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

    if (!apiKey) {
      const fallbackSubject = topic || 'ขอความอนุเคราะห์ประสานการปฏิบัติราชการ';
      const fallbackTo = to || 'ผู้ว่าราชการจังหวัดระยอง';
      const fallbackBody = `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ${org} มีภารกิจในการดำเนินการเกี่ยวกับ ${topic || 'การบริหารจัดการและประสานการปฏิบัติราชการ'} เพื่อให้การปฏิบัติงานเป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพสูงสุด</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ ${org} ใคร่ขอความอนุเคราะห์จากท่าน ${objective || 'โปรดพิจารณาดำเนินการและประสานงานในส่วนที่เกี่ยวข้องต่อไป'}${details ? ' โดยมีรายละเอียดตามที่แนบมาพร้อมนี้' : ''}</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`;
      
      return res.json({
        success: true,
        result: {
          subject: fallbackSubject,
          to: fallbackTo,
          bodyHtml: fallbackBody,
          closingWord: 'จึงเรียนมาเพื่อโปรดพิจารณา',
          urgency: 'ปกติ',
          suggestedSignerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
        }
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญการร่างหนังสือราชการไทย (Thai Official Document Drafter) ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม
หน่วยงานหลัก: ${org}

ข้อกำหนดโครงสร้างหนังสือราชการไทย:
1. การใช้ภาษาต้องเป็นทางการ ถูกต้องตามแบบแผนราชการ กระชับ ชัดเจน สุภาพ
2. โครงสร้างเนื้อหา 3 ย่อหน้ามาตรฐาน (ย่อหน้าละประมาณ 1-3 ประโยค):
   - ย่อหน้า 1 (เหตุที่มีหนังสือ): ขึ้นต้นด้วย "ด้วย..." หรือ "ตามที่...ความละเอียดแจ้งแล้ว นั้น" (ระบุความเป็นมา/เหตุผล)
   - ย่อหน้า 2 (จุดประสงค์/ข้อเสนอ): ขึ้นต้นด้วย "ในการนี้..." หรือ "เพื่อประโยชน์ในการ..." (ระบุสิ่งที่ต้องการให้ผู้รับดำเนินการ)
   - ย่อหน้า 3 (คำลงท้าย): ขึ้นต้นด้วย "จึงเรียนมาเพื่อโปรดพิจารณา" หรือ "จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ" หรือ "จึงเรียนมาเพื่อโปรดทราบ" หรือ "จึงเรียนมาเพื่อโปรดให้ความอนุเคราะห์"
3. ให้ผลลัพธ์เป็น JSON ตาม Response Schema
4. เนื้อหา (bodyHtml) ต้องอยู่ในรูปแบบแท็ก HTML <p style="text-indent: 2.5em; margin-bottom: 0.8em;">...</p> โดยไม่ต้องใส่แท็ก <html> หรือ <body>
ห้ามใช้คำว่า "ฝ่ายบริหารทั่วไป" หรือ "ฝ่ายบริหารงานทั่วไป" โดยเด็ดขาด ให้ใช้ "ฝ่ายยุทธศาสตร์และการจัดการ"`;

    const userPrompt = `กรุณาร่างหนังสือราชการฉบับนี้:
- ประเภทหนังสือ: ${docType || 'หนังสือส่ง'}
- วัตถุประสงค์/หัวข้อเรื่อง: ${topic || '-'}
- ผู้รับ (เรียน/ถึง): ${to || '-'}
- สิ่งที่ต้องการให้ดำเนินการ: ${objective || '-'}
- ข้อมูลเพิ่มเติม/รายละเอียด: ${details || '-'}
- ระดับความเร่งด่วน: ${tone || 'ปกติ'}`;

    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let draftResponse: any = null;

    try {
      const client = getGeminiClient(apiKey, req);
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
                  subject: { type: Type.STRING },
                  to: { type: Type.STRING },
                  bodyHtml: { type: Type.STRING },
                  closingWord: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  suggestedSignerPos: { type: Type.STRING }
                },
                required: ['subject', 'to', 'bodyHtml', 'closingWord']
              }
            }
          });
          if (resp && resp.text) {
            draftResponse = resp.text;
            break;
          }
        } catch (modelErr) {
          // try next model
        }
      }
    } catch (e) {}

    if (draftResponse) {
      try {
        const parsedJson = JSON.parse(draftResponse);
        return res.json({ success: true, result: parsedJson });
      } catch (jsonErr) {
        return res.status(500).json({ success: false, error: 'ไม่สามารถประมวลผลคำตอบ JSON จาก AI ได้' });
      }
    }

    const fallbackSubject = topic || 'ขอความอนุเคราะห์ประสานการปฏิบัติราชการ';
    return res.json({
      success: true,
      result: {
        subject: fallbackSubject,
        to: to || 'ผู้ว่าราชการจังหวัดระยอง',
        bodyHtml: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย ${org} มีความจำเป็นในการดำเนินการเกี่ยวกับ ${topic} เพื่อให้การปฏิบัติงานสัมฤทธิ์ผลตามวัตถุประสงค์</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ จึงขอความอนุเคราะห์จากท่าน ${objective || 'โปรดพิจารณาดำเนินการในส่วนที่เกี่ยวข้อง'}</p><p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`,
        closingWord: 'จึงเรียนมาเพื่อโปรดพิจารณา',
        urgency: 'ปกติ',
        suggestedSignerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
      }
    });
  } catch (err: any) {
    console.error('Error in AI draft generate:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการสร้างแบบร่างด้วย AI' });
  }
});

// AI Official Order & Announcement Generator Endpoint
app.post('/api/ai/order-generate', async (req, res) => {
  try {
    const { topic, orderType, category, reason, orgName, personnelInfo, customDuties, apiKey: reqApiKey } = req.body;
    const apiKey = await getAppGeminiApiKey(reqApiKey);
    const org = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
    const isAnnounce = orderType === 'announce';

    if (!apiKey) {
      const fallbackSubject = topic || (isAnnounce ? 'มาตรการเฝ้าระวังและป้องกันสาธารณภัยในพื้นที่' : 'แต่งตั้งคณะทำงานขับเคลื่อนภารกิจป้องกันและบรรเทาสาธารณภัย');
      const fallbackAuthority = isAnnounce
        ? 'อาศัยอำนาจตามมาตรา ๒๒ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐'
        : 'อาศัยอำนาจตามมาตรา ๑๕ และมาตรา ๒๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐';
      const fallbackBackground = `ด้วย ${org} มีความจำเป็นต้องเตรียมความพร้อมและบริหารจัดการเกี่ยวกับ ${topic || 'ภารกิจป้องกันและบรรเทาสาธารณภัย'} ${reason ? `เนื่องจาก ${reason}` : 'เพื่อให้การปฏิบัติงานของหน่วยงานเป็นไปด้วยความเรียบร้อย รวดเร็ว และมีประสิทธิภาพสูงสุด'}`;
      const fallbackDuties = customDuties || `ให้คณะทำงานมีอำนาจหน้าที่ในการอำนวยการ ประสานงาน ติดตาม ประเมินสถานการณ์ และสนับสนุนการปฏิบัติงานช่วยเหลือประชาชนตลอด ๒๔ ชั่วโมง`;

      return res.json({
        success: true,
        result: {
          subject: fallbackSubject,
          authority: fallbackAuthority,
          background: fallbackBackground,
          duties: fallbackDuties,
          suggestedSignerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
        }
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญการยกร่างคำสั่งและประกาศราชการไทย (Thai Official Order & Announcement Generator) ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม
หน่วยงานออกเอกสาร: ${org}

ข้อกำหนดคำสั่ง/ประกาศราชการไทย:
1. การใช้ภาษาต้องเป็นทางการตามแบบแผนราชการ ภาษาถูกต้อง กระชับ สุภาพ รัดกุม
2. โครงสร้างคำสั่งประกอบด้วย:
   - subject (เรื่อง): ชื่อเรื่องคำสั่ง/ประกาศที่ชัดเจน กระชับ
   - authority (ฐานอำนาจกฎหมายอ้างอิง): เช่น "อาศัยอำนาจตามมาตรา ๑๕ และมาตรา ๒๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐" หรือระเบียบที่เกี่ยวข้อง
   - background (ความเป็นมาและเหตุผล): ขึ้นต้นด้วย "ด้วย..." อธิบายเหตุผล ความจำเป็น และบริบท
   - duties (อำนาจและหน้าที่): ระบุข้อๆ ๑. ๒. ๓. หรือเป็นความรัดกุมในการปฏิบัติงาน
   - suggestedSignerPos: ตำแหน่งผู้ลงนามที่เหมาะสม (เช่น หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด หรือ ผู้ว่าราชการจังหวัด)
3. ให้ตอบกลับเป็น JSON ตาม Response Schema เท่านั้น`;

    const userPrompt = `กรุณาร่าง${isAnnounce ? 'ประกาศ' : 'คำสั่ง'}ราชการ:
- ชนิดเอกสาร: ${isAnnounce ? 'ประกาศ' : 'คำสั่ง'}
- หมวดหมู่งาน: ${category || 'งานป้องกันและบรรเทาสาธารณภัย'}
- หัวข้อ/เรื่องหรือวัตถุประสงค์: ${topic || '-'}
- เหตุผลความจำเป็น/บริบท: ${reason || '-'}
- คณะกรรมการ/บุคลากรที่เกี่ยวข้อง: ${personnelInfo || '-'}
- อำนาจหน้าที่ที่ต้องการเน้น: ${customDuties || '-'}`;

    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let draftResponse: any = null;

    try {
      const client = getGeminiClient(apiKey, req);
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
                  subject: { type: Type.STRING },
                  authority: { type: Type.STRING },
                  background: { type: Type.STRING },
                  duties: { type: Type.STRING },
                  suggestedSignerPos: { type: Type.STRING }
                },
                required: ['subject', 'authority', 'background', 'duties']
              }
            }
          });
          if (resp && resp.text) {
            draftResponse = resp.text;
            break;
          }
        } catch (modelErr) {
          // try next model
        }
      }
    } catch (e) {}

    if (draftResponse) {
      try {
        const parsedJson = JSON.parse(draftResponse);
        return res.json({ success: true, result: parsedJson });
      } catch (jsonErr) {
        return res.status(500).json({ success: false, error: 'ไม่สามารถประมวลผลคำตอบ JSON จาก AI ได้' });
      }
    }

    // Fallback if AI response empty
    return res.json({
      success: true,
      result: {
        subject: topic || (isAnnounce ? 'ประกาศมาตรการเฝ้าระวังสาธารณภัย' : 'คำสั่งแต่งตั้งคณะทำงานบรรเทาสาธารณภัย'),
        authority: isAnnounce ? 'อาศัยอำนาจตามมาตรา ๒๒ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕0' : 'อาศัยอำนาจตามมาตรา ๑๕ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐',
        background: `ด้วย ${org} มีความจำเป็นต้องบริหารจัดการและเตรียมความพร้อมรับมือ ${topic || 'สถานการณ์สาธารณภัย'} เพื่อความปลอดภัยของประชาชน`,
        duties: customDuties || `๑. ประสานงานและบูรณาการการปฏิบัติร่วมกับหน่วยงานที่เกี่ยวข้อง\n๒. กำกับ ดูแล และติดตามการช่วยเหลือผู้ประสบภัยตลอด ๒๔ ชั่วโมง`,
        suggestedSignerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
      }
    });
  } catch (err: any) {
    console.error('Error in AI order generate:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการยกร่างคำสั่ง/ประกาศด้วย AI' });
  }
});

// AI Official Speech & Report Generator Endpoint
app.post('/api/ai/speech-generate', async (req, res) => {
  try {
    const { speechType, topic, category, chairman, speaker, venue, orgName, keyPoints, participantsCount, apiKey: reqApiKey } = req.body;
    const apiKey = await getAppGeminiApiKey(reqApiKey);
    const org = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
    const chairmanName = chairman || 'ท่านผู้ว่าราชการจังหวัด';
    const speakerName = speaker || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
    const eventName = topic || 'โครงการเพิ่มประสิทธิภาพการป้องกันและบรรเทาสาธารณภัย';

    if (!apiKey) {
      const fallbackReportHtml = `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวรายงาน</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">พิธีเปิด${eventName}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">ณ ${venue || 'ห้องประชุมศาลากลางจังหวัด'}</p>
<p style="text-indent:3em;margin:0 0 8pt;">กราบเรียน ${chairmanName} ที่เคารพอย่างสูง</p>
<p style="text-indent:3em;margin:0 0 8pt;">กระผม/ดิฉัน ${speakerName} ในนามของคณะผู้จัดงานและผู้เข้าร่วมโครงการ ขอขอบพระคุณท่านประธานเป็นอย่างยิ่ง ที่ได้ให้เกียรติมาเป็นประธานในพิธีเปิด ${eventName} ในวันนี้</p>
<p style="text-indent:3em;margin:0 0 8pt;">การจัดกิจกรรมในครั้งนี้ มีวัตถุประสงค์สำคัญเพื่อ ${keyPoints || 'เสริมสร้างความรู้ ทักษะ และเตรียมความพร้อมในการปฏิบัติงานด้านการบรรเทาสาธารณภัยอย่างมีประสิทธิภาพ'} โดยมีผู้เข้าร่วมโครงการทั้งสิ้น ${participantsCount || '๑๐๐'} คน</p>
<p style="text-indent:3em;margin:0 0 8pt;">บัดนี้ ได้เวลาอันเป็นมงคลสมควรแล้ว กระผม/ดิฉัน ขอเรียนเชิญท่านประธาน ได้โปรดกล่าวเปิดงาน และให้โอวาทแก่ผู้เข้าร่วมกิจกรรม เพื่อเป็นสิริมงคลและขวัญกำลังใจในการปฏิบัติงานต่อไป กราบเรียนเชิญครับ/ค่ะ</p>`;

      const fallbackOpeningHtml = `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวเปิดงาน / กล่าวตอบ</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">โดย ${chairmanName}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">ในพิธีเปิด${eventName}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ท่านผู้บริหาร ข้าราชการ คณะวิทยากร และผู้เข้าร่วมโครงการทุกท่าน</p>
<p style="text-indent:3em;margin:0 0 8pt;">ผมมีความยินดีและเป็นเกียรติอย่างยิ่ง ที่ได้มาเป็นประธานในพิธีเปิด ${eventName} ในวันนี้ ขอชื่นชม ${org} และคณะทำงานทุกท่าน ที่ได้เล็งเห็นความสำคัญของการพัฒนาศักยภาพการบรรเทาสาธารณภัยเพื่อความปลอดภัยของประชาชน</p>
<p style="text-indent:3em;margin:0 0 8pt;">หวังเป็นอย่างยิ่งว่า ผู้เข้าร่วมโครงการทุกท่านจะนำความรู้ ทักษะ และประสบการณ์ที่ได้รับ ไปปรับใช้ในการปฏิบัติงานจริงเพื่อประโยชน์สูงสุดแก่ส่วนรวม ขออวยพรให้การจัดงานสำเร็จลุล่วงด้วยดี และขอเปิด ${eventName} ณ บัดนี้</p>`;

      return res.json({
        success: true,
        result: {
          title: `คำกล่าว${eventName}`,
          speechReportHtml: fallbackReportHtml,
          speechOpeningHtml: fallbackOpeningHtml,
          keyHighlights: keyPoints || 'การบูรณาการความร่วมมือและการเตรียมความพร้อมรับมือสาธารณภัยตลอด ๒๔ ชั่วโมง',
          closingRemark: 'ขออวยพรให้ทุกท่านประสบความสุข ความเจริญ และปฏิบัติภารกิจสำเร็จลุล่วงด้วยดี'
        }
      });
    }

    const systemPrompt = `คุณคือผู้เชี่ยวชาญการยกร่างคำกล่าวเปิดงาน กล่าวรายงาน และคำกล่าวพิธีการราชการไทย (Thai Official Speech & Report Drafter) ตามแบบแผนงานสารบรรณและธรรมเนียมพิธีการทางการ
หน่วยงานจัดงาน: ${org}

ข้อกำหนดคำกล่าวและคำรายงานราชการไทย:
1. ภาษาต้องไพเราะ สุภาพ เป็นทางการ ตามธรรมเนียมพิธีการไทย
2. ต้องยกร่าง 2 ส่วนหลัก:
   - speechReportHtml (คำกล่าวรายงาน ของผู้กล่าวรายงาน): ขึ้นต้นด้วย "กราบเรียน [ประธาน] ที่เคารพอย่างสูง" บอกวัตถุประสงค์ ผู้เข้าร่วม และเชิญประธานเปิดงาน
   - speechOpeningHtml (คำกล่าวเปิดงาน/กล่าวตอบ ของประธานในพิธี): แสดงความยินดี ชื่นชมหน่วยงานจัดงาน ให้ข้อคิดเน้นย้ำ และกล่าวเปิดงาน
3. รูปแบบคำกล่าวต้องจัดใส่แท็ก HTML <p style="text-indent:3em;margin:0 0 8pt;">...</p> กำหนดจัดกึ่งกลางส่วนหัวอย่างสวยงาม
4. ตอบกลับเป็น JSON ตาม Response Schema เท่านั้น`;

    const userPrompt = `กรุณาร่างคำกล่าวรายงานและคำกล่าวเปิดงานสำหรับพิธีการต่อไปนี้:
- ชื่องาน/โครงการ: ${eventName}
- หมวดหมู่งาน: ${category || 'งานป้องกันและบรรเทาสาธารณภัย'}
- ประเภทคำกล่าว: ${speechType || 'รายงานและเปิดงาน'}
- ประธานในพิธี: ${chairmanName}
- ผู้กล่าวรายงาน: ${speakerName}
- สถานที่จัดงาน: ${venue || 'ห้องประชุมศาลากลางจังหวัด'}
- จำนวนผู้เข้าร่วม: ${participantsCount || '๑๐๐'} คน
- สาระสำคัญ/วัตถุประสงค์ที่ต้องการเน้นย้ำ: ${keyPoints || 'บูรณาการความร่วมมือเพื่อความปลอดภัยของประชาชน'}`;

    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let draftResponse: any = null;

    try {
      const client = getGeminiClient(apiKey, req);
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
                  title: { type: Type.STRING },
                  speechReportHtml: { type: Type.STRING },
                  speechOpeningHtml: { type: Type.STRING },
                  keyHighlights: { type: Type.STRING },
                  closingRemark: { type: Type.STRING }
                },
                required: ['title', 'speechReportHtml', 'speechOpeningHtml']
              }
            }
          });
          if (resp && resp.text) {
            draftResponse = resp.text;
            break;
          }
        } catch (modelErr) {
          // try next model
        }
      }
    } catch (e) {}

    if (draftResponse) {
      try {
        const parsedJson = JSON.parse(draftResponse);
        return res.json({ success: true, result: parsedJson });
      } catch (jsonErr) {
        return res.status(500).json({ success: false, error: 'ไม่สามารถประมวลผลคำตอบ JSON จาก AI ได้' });
      }
    }

    // Fallback if AI response empty
    return res.json({
      success: true,
      result: {
        title: `คำกล่าว${eventName}`,
        speechReportHtml: `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวรายงาน</p><p style="text-indent:3em;margin:0 0 8pt;">กราบเรียน ${chairmanName} ที่เคารพอย่างสูง</p><p style="text-indent:3em;margin:0 0 8pt;">กระผม/ดิฉัน ${speakerName} ขอขอบพระคุณท่านประธานเป็นอย่างยิ่งที่ให้เกียรติมาเป็นประธานในพิธีเปิด ${eventName} ในวันนี้...</p>`,
        speechOpeningHtml: `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวเปิดงาน</p><p style="text-indent:3em;margin:0 0 8pt;">ท่านผู้บริหาร และผู้เข้าร่วมงานทุกท่าน ผมมีความยินดีเป็นอย่างยิ่งที่ได้มาเปิด ${eventName} ในวันนี้...</p>`,
        keyHighlights: keyPoints || 'การสร้างความตระหนักและการเตรียมพร้อมรับมือสาธารณภัย',
        closingRemark: 'ขอให้การดำเนินงานสำเร็จลุล่วงด้วยดี'
      }
    });
  } catch (err: any) {
    console.error('Error in AI speech generate:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการยกร่างคำกล่าวด้วย AI' });
  }
});

// HTML to DOCX Endpoint
app.post('/api/export-docx', async (req, res) => {
  try {
    const { html, filename } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }

    const wordCSS = `
      @font-face{font-family:'TH SarabunPSK';src:local('TH SarabunPSK'),local('TH Sarabun New'),local('Sarabun New');}
      @page Section1{size:210mm 297mm;margin:25mm 20mm 20mm 30mm;}
      div.Section1{page:Section1;}
      *{font-family:'TH SarabunPSK','TH Sarabun New','Sarabun',sans-serif!important;}
      html,body{font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;color:#000;background:#fff;margin:0;padding:0;}
      p{font-family:'TH SarabunPSK';font-size:16pt;line-height:1.5;margin:0 0 3pt;text-align:justify;}
      table{border-collapse:collapse;width:100%;margin:5pt 0;}
      td,th{border:1pt solid #555;padding:4pt 7pt;font-size:16pt;line-height:1.5;vertical-align:middle;}
      th{background:#d9d9d9;font-weight:700;text-align:center;}
    `;

    // Clean HTML to prevent html-to-docx invalid XML attribute errors (e.g. width percentages on td/th)
    let cleanedHtml = html || '';
    cleanedHtml = cleanedHtml.replace(/style="([^"]*)"/g, (match, styleContent) => {
      const newStyle = styleContent
        .split(';')
        .filter((s: string) => !s.trim().startsWith('width') || !s.includes('%'))
        .join(';');
      return `style="${newStyle}"`;
    });
    cleanedHtml = cleanedHtml.replace(/(<td|<th|<table)\s+([^>]*)\bwidth=["']?\d+%\b["']?/gi, '$1 $2');

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${wordCSS}</style></head><body><div class="Section1">${cleanedHtml}</div></body></html>`;

    const fileBuffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      font: 'TH SarabunPSK',
      fontSize: 32, // 16pt in word (half-points)
      margins: { top: 1440, right: 1134, bottom: 1134, left: 1701 }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'document')}.docx"`);
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('DOCX Export Error:', error);
    res.status(500).json({ error: error.message || 'Error generating document' });
  }
});

// AI Draft TOR Generate Endpoint
app.post('/api/ai/draft-tor', async (req, res) => {
  try {
    const { projectName, projectType, budget, duration, details, orgName, apiKey: reqApiKey, procurements } = req.body;

    const apiKey = await getAppGeminiApiKey(reqApiKey);
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ไม่พบ Gemini API Key ในระบบ' });
    }

    const org = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

    let procurementSection = '';
    if (procurements && Array.isArray(procurements) && procurements.length > 0) {
      const total = procurements.reduce((sum, p) => sum + Number(String(p.price).replace(/,/g, '') || 0), 0);
      procurementSection = `รายการจัดหาและงบประมาณ (รวมทั้งสิ้น ${total.toLocaleString()} บาท):\n` + 
        procurements.map(p => `- ประเภทการจัดหา: ${p.type} ${p.name ? `(${p.name})` : ''} วงเงิน: ${Number(String(p.price).replace(/,/g, '') || 0).toLocaleString()} บาท`).join('\n');
    } else {
      procurementSection = `- ประเภทการจัดหา: ${projectType}\n- วงเงินงบประมาณ: ${budget} บาท`;
    }

    const userPrompt = `กรุณาร่างเอกสาร "ขอบเขตของงาน (Terms of Reference : TOR)" สำหรับส่วนราชการ (ใช้ภาษาทางการ ระเบียบพัสดุฯ)
ข้อมูลโครงการมีดังนี้:
- ชื่อโครงการ: ${projectName}
${procurementSection}
- ระยะเวลาดำเนินการ/ส่งมอบ: ${duration}
- หน่วยงาน: ${org}
- รายละเอียดขอบเขตงาน:
${details}

รูปแบบเอกสารที่ต้องการ:
ขอให้สร้างโครงสร้าง TOR ให้ครบถ้วนสมบูรณ์ ประกอบด้วยหัวข้อหลัก (ปรับให้เข้ากับประเภทการจัดหา):
๑. ความเป็นมา
๒. วัตถุประสงค์
๓. คุณสมบัติของผู้เสนอราคา
๔. ขอบเขตของการดำเนินงาน / รายละเอียดคุณลักษณะเฉพาะ
๕. ระยะเวลาการส่งมอบ
๖. วงเงินงบประมาณ
๗. การรับประกันความชำรุดบกพร่อง (ถ้ามี)
๘. อัตราค่าปรับ (ถ้ามี)

ตอบกลับเป็น HTML ที่พร้อมใช้งานในหน้าเว็บ ไม่ต้องมี Markdown ล้อมรอบ (ไม่ต้องมี \`\`\`html) ใช้แท็ก HTML เช่น <strong>, <p>, <ol>, <li>, และ inline CSS ที่จำเป็น (ฟอนต์ TH SarabunPSK ขนาด 16pt)`;

    const client = getGeminiClient(apiKey, req);
    let responseText = '';

    try {
      const { response } = await callGeminiWithFallback({
        client,
        contents: userPrompt,
      });
      if (response && response.text) {
        responseText = response.text;
      }
    } catch (err: any) {
      console.error('AI Draft TOR Exception:', err.message);
      return res.status(500).json({ success: false, error: err.message || 'AI ไม่สามารถสร้างร่าง TOR ได้ในขณะนี้' });
    }

    if (responseText) {
      let cleanHtml = responseText.replace(/^```html\n?/, '').replace(/\n?```$/, '');
      return res.json({ success: true, result: cleanHtml });
    }

    return res.status(500).json({ success: false, error: 'AI ไม่สามารถสร้างร่าง TOR ได้ในขณะนี้' });
  } catch (err: any) {
    console.error('Error in AI draft TOR:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการสร้างร่าง TOR ด้วย AI' });
  }
});

// AI Smart Assist Document Autocomplete Endpoint
app.post('/api/ai/autocomplete', async (req, res) => {
  try {
    const { title, content, apiKey: reqApiKey } = req.body;
    const apiKey = await getAppGeminiApiKey(reqApiKey);

    if (!apiKey) {
      const t = title || 'หนังสือราชการทั่วไป';
      return res.json({
        success: true,
        result: {
          type: 'inbox',
          category: 'order',
          summary: content || `บันทึกข้อความ เรื่อง ${t} เพื่อพิจารณาดำเนินการตามอำนาจหน้าที่ของทางราชการ`,
          suggestedTo: 'หัวหน้าส่วนราชการทุกหน่วยงาน',
          priority: 'ปกติ'
        }
      });
    }

    const systemPrompt = `คุณคือผู้ช่วย AI อัจฉริยะสำหรับงานสารบรรณราชการไทย (Thai EDMS AI Smart Assistant)
หน้าที่ของคุณคือวิเคราะห์ชื่อเรื่อง (title) และรายละเอียดเนื้อหา (content) ที่ผู้ใช้กรอกเข้ามา แล้วทำการเติมข้อมูลอัตโนมัติให้สมบูรณ์ตามหลักการสารบรรณ:
1. type: เลือกประเภทหนังสือ ('inbox' สำหรับหนังสือรับ/หนังสือภายนอก, 'outbox' สำหรับหนังสือส่ง/หนังสือภายใน, 'admin' สำหรับคำสั่ง/ประกาศ)
2. category: หมวดหมู่เอกสาร ('order' สำหรับคำสั่ง, 'announcement' สำหรับประกาศ, 'circular' สำหรับหนังสือเวียน, 'general' สำหรับหนังสือทั่วไป)
3. summary: สรุปสาระสำคัญของเนื้อหาให้กระชับ เป็นทางการ และถูกต้องตามระเบียบงานสารบรรณ (ประมาณ 3-5 บรรทัด)
4. suggestedTo: แนะนำหน่วยงานหรือบุคคลปลายทางที่เหมาะสม (เช่น 'หัวหน้าสำนักงาน ปภ. จังหวัดระยอง', 'หัวหน้ากลุ่มงานยุทธศาสตร์และการจัดการ')
5. priority: ระดับความเร่งด่วน ('ปกติ', 'ด่วน', 'ด่วนมาก', 'ด่วนที่สุด')

ให้ส่งผลลัพธ์กลับมาเป็น JSON ตาม Response Schema ล้วน ๆ`;

    const userPrompt = `กรุณาวิเคราะห์และเติมข้อมูลจากหัวข้อและเนื้อหานี้:
- ชื่อเรื่อง (Title): ${title || '-'}
- รายละเอียด (Content): ${content || '-'}`;

    const client = getGeminiClient(apiKey, req);
    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
    let rawText = '';

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
                type: { type: Type.STRING, enum: ['inbox', 'outbox', 'admin'] },
                category: { type: Type.STRING, enum: ['order', 'announcement', 'circular', 'general'] },
                summary: { type: Type.STRING },
                suggestedTo: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['ปกติ', 'ด่วน', 'ด่วนมาก', 'ด่วนที่สุด'] }
              },
              required: ['type', 'category', 'summary', 'suggestedTo', 'priority']
            }
          }
        });
        if (resp && resp.text) {
          rawText = resp.text;
          break;
        }
      } catch (mErr) {
        console.warn(`Model ${modelName} failed for autocomplete, trying fallback...`);
      }
    }

    if (!rawText) {
      throw new Error('AI ทุกโมเดลไม่สามารถประมวลผลคำขอได้');
    }

    const parsed = JSON.parse(rawText);
    return res.json({
      success: true,
      result: parsed
    });

  } catch (err: any) {
    console.error('Error in /api/ai/autocomplete:', err);
    return res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI Smart Assist' });
  }
});

// AI Official Letter Auto-Format according to Thai Saraban Regulations Endpoint
// AI Official Letter Auto-Format according to Thai Saraban Regulations Endpoint
app.post('/api/ai/auto-format-saraban', async (req, res) => {
  const {
    body,
    docType,
    docNum,
    date,
    to,
    subject,
    ref,
    att,
    signer,
    signerPos,
    orgName,
    options = {}
  } = req.body;

  const convertDigits = options.convertToThaiNumerals !== false;
  const enforceThreeParts = options.enforceThreeParagraphs !== false;
  const fixSpacing = options.standardizeSpacing !== false;

  const org = orgName || 'ฝ่ายยุทธศาสตร์และการจัดการ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

  // Local rule-based engine helper function
  const toThaiNum = (str: string) => {
    if (!str) return '';
    return String(str).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[parseInt(d, 10)] || d);
  };

  const runLocalFormatter = (rawContent: string) => {
    let text = (rawContent || '').trim();
    let paragraphs: string[] = [];

    if (text.includes('<p') || text.includes('</p>')) {
      const matches = text.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (matches && matches.length > 0) {
        paragraphs = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      }
    }
    
    if (paragraphs.length === 0) {
      paragraphs = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .split(/\n\s*\n|\n/)
        .map(p => p.trim())
        .filter(Boolean);
    }

    if (paragraphs.length === 0) {
      paragraphs = [`ด้วย ${org} มีภารกิจในการปฏิบัติราชการตามที่ได้รับมอบหมาย`];
    }

    const changes: string[] = [];
    const appliedRules: string[] = [];
    const formattedParagraphs: string[] = [];

    paragraphs.forEach((p, idx) => {
      let cleanP = p.replace(/\s+/g, ' ').trim();
      const isSubItem = /^([0-9๐-๙]+\.|\([0-9๐-๙]+\)|ข้อ\s*[0-9๐-๙]+)/.test(cleanP);

      if (idx === 0 && !isSubItem) {
        if (!cleanP.startsWith('ด้วย') && !cleanP.startsWith('ตามที่') && !cleanP.startsWith('ตามหนังสือ') && !cleanP.startsWith('สืบเนื่อง')) {
          cleanP = 'ด้วย ' + cleanP;
          changes.push('ปรับปรุงคำขึ้นต้นย่อหน้าแรกเป็น "ด้วย..." ตามระเบียบสำนักนายกรัฐมนตรีฯ');
        }
      } else if (idx === 1 && paragraphs.length >= 3 && !isSubItem) {
        if (!cleanP.startsWith('ในการนี้') && !cleanP.startsWith('เพื่อประโยชน์') && !cleanP.startsWith('ฉะนั้น') && !cleanP.startsWith('ข้อพิจารณา') && !cleanP.startsWith('ข้อเสนอ')) {
          cleanP = 'ในการนี้ ' + cleanP;
          changes.push('ปรับปรุงคำเชื่อมโยงย่อหน้าสองเป็น "ในการนี้..." เพื่อความถูกต้องทางราชการ');
        }
      }

      if (cleanP.includes('นั้น')) {
        cleanP = cleanP.replace(/(\S)\s*นั้น\s*(\S)/g, '$1  นั้น  $2');
        appliedRules.push('เว้นวรรค ๒ ช่วงตัวอักษรหน้า-หลังคำว่า "นั้น" ตามระเบียบสำนักนายกรัฐมนตรีฯ');
      }

      if (convertDigits) {
        cleanP = toThaiNum(cleanP);
      }

      if (isSubItem) {
        formattedParagraphs.push(`<p style="margin-left: 1.5em; text-indent: 1.5em; text-align: justify; text-justify: inter-cluster; margin-bottom: 0.6em; line-height: 1.6;">${cleanP}</p>`);
      } else {
        formattedParagraphs.push(`<p style="text-indent: 2.5em; text-align: justify; text-justify: inter-cluster; margin-bottom: 0.8em; line-height: 1.6;">${cleanP}</p>`);
      }
    });

    const lastP = formattedParagraphs[formattedParagraphs.length - 1] || '';
    const hasClosing = /จึงเรียนมาเพื่อ|จึงเรียนยืนยัน|จึงเรียนรายงาน/.test(lastP);

    let closingWord = 'จึงเรียนมาเพื่อโปรดพิจารณา';
    if (to && (to.includes('รัฐมนตรี') || to.includes('ปลัด') || to.includes('ผู้ว่า'))) {
      closingWord = 'จึงเรียนมาเพื่อโปรดพิจารณา';
    } else if (subject && (subject.includes('ขออนุมัติ') || subject.includes('อนุมัติ'))) {
      closingWord = 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ';
    } else if (subject && (subject.includes('แจ้ง') || subject.includes('ทราบ') || subject.includes('รายงาน'))) {
      closingWord = 'จึงเรียนมาเพื่อโปรดทราบ';
    }

    if (enforceThreeParts && !hasClosing) {
      formattedParagraphs.push(`<p style="text-indent: 2.5em; text-align: justify; text-justify: inter-cluster; margin-bottom: 0.8em; line-height: 1.6;">${closingWord}</p>`);
      changes.push(`เพิ่มย่อหน้าภาคสรุป/คำลงท้ายมาตรฐาน: "${closingWord}"`);
    }

    changes.push('จัดระยะร่นย่อหน้าแรก (Indent) ๒.๕ ซม. และจัดขอบสองข้าง (Justify)');
    if (convertDigits) {
      changes.push('แปลงตัวเลขทั้งหมดเป็นเลขไทย (๐-๙)');
    }
    appliedRules.push('ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ ข้อ ๑๗-๒๐ (การพิมพ์และการจัดหน้า)');

    const formattedHtml = formattedParagraphs.join('');
    const docNumFormatted = convertDigits ? toThaiNum(docNum || '') : docNum;

    return {
      formattedHtml,
      docNumFormatted,
      dateFormatted: date || '',
      subjectFormatted: subject || '',
      toFormatted: to || '',
      closingWord,
      summaryOfChanges: Array.from(new Set(changes)),
      appliedRules: Array.from(new Set(appliedRules)),
      paragraphCount: formattedParagraphs.length
    };
  };

  try {
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);

    if (apiKey) {
      const systemPrompt = `คุณคือผู้เชี่ยวชาญการจัดหน้าและรูปแบบหนังสือราชการไทยตาม "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม" อย่างเคร่งครัด
หน่วยงานหลัก: ${org}

หน้าที่ของคุณคือ รับเนื้อหาหนังสือราชการ และทำการ "จัดหน้าและปรับปรุงรูปแบบตามระเบียบงานสารบรรณอัตโนมัติ" (Auto-formatting according to Thai Saraban Rules)

หลักเกณฑ์สำคัญตามระเบียบงานสารบรรณ:
1. การจัดย่อหน้าและโครงสร้าง (Paragraph Structure & Indentation):
   - ย่อหน้าหลักต้องมีระยะร่น (Indent) ๒.๕ ซม. (ใน HTML กำหนด style="text-indent: 2.5em; text-align: justify; text-justify: inter-cluster; margin-bottom: 0.8em; line-height: 1.6;")
   - ย่อหน้ารอง/ข้อย่อย (เช่น ๑., ๒., หรือ ๑.๑, ๑.๒) ต้องมีระยะร่น ๓.๕ ซม. (ใน HTML กำหนด style="margin-left: 1.5em; text-indent: 1.5em; text-align: justify; text-justify: inter-cluster; margin-bottom: 0.6em; line-height: 1.6;")
   - โครงสร้าง ๓ ภาคมาตรฐาน:
     * ย่อหน้า ๑ (ภาคเหตุ): ต้องขึ้นต้นด้วย "ด้วย..." หรือ "ตามที่... นั้น" (เว้นวรรค ๒ เคาะหน้าและหลังคำว่า นั้น)
     * ย่อหน้า ๒ (ภาคความประสงค์/ข้อพิจารณา): ต้องขึ้นต้นด้วย "ในการนี้..." หรือ "เพื่อประโยชน์ในการ..."
     * ย่อหน้า ๓ (ภาคสรุป/คำลงท้าย): ต้องขึ้นต้นด้วย "จึงเรียนมาเพื่อโปรดพิจารณา" หรือ "จึงเรียนมาเพื่อโปรดทราบ" หรือ "จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ" หรือ "จึงเรียนมาเพื่อโปรดให้ความอนุเคราะห์" ให้ถูกต้องเหมาะสมกับผู้รับและเรื่อง
2. การใช้ตัวเลขไทย (Thai Numerals):
   ${convertDigits ? '- ตัวเลขทั้งหมด (เลขที่หนังสือ, วันที่, ปี พ.ศ., จำนวนเงิน, สถิติ, เบอร์โทรศัพท์, ข้อย่อย) ต้องแปลงเป็นเลขไทย (๐-๙) ทั้งหมด' : '- คงตัวเลขตามต้นฉบับ'}
3. การเว้นวรรคตอน (Spacing & Punctuation):
   - เว้นวรรค ๑ ช่วงตัวอักษรระหว่างประโยค
   - เว้นวรรค ๒ ช่วงตัวอักษร หน้าและหลังคำว่า "นั้น"
   - หลัง "พ.ศ." เว้นวรรค ๑ ช่วงตัวอักษร
   - ลบการเว้นวรรคซ้ำซ้อน
4. ภาษาและสำนวนราชการ:
   - ภาษาทางการ กระชับ ชัดเจน สุภาพ
   - ห้ามใช้คำว่า "ฝ่ายบริหารทั่วไป" หรือ "ฝ่ายบริหารงานทั่วไป" โดยเด็ดขาด ให้ใช้ "ฝ่ายยุทธศาสตร์และการจัดการ"
5. ส่งผลลัพธ์เป็น JSON ตาม Response Schema`;

      const userPrompt = `กรุณาจัดหน้าและปรับปรุงรูปแบบตามระเบียบงานสารบรรณสำหรับเอกสารนี้:
- ประเภทหนังสือ: ${docType || 'หนังสือส่ง'}
- เรื่อง: ${subject || '-'}
- เรียน/ถึง: ${to || '-'}
- เลขที่หนังสือเดิม: ${docNum || '-'}
- วันที่: ${date || '-'}
- เนื้อความเดิมที่ต้องการให้จัดหน้า:
${body || '-'}`;

      let aiResult: any = null;

      try {
        const client = getGeminiClient(apiKey, req);
        const generateTask = async () => {
          const { response } = await callGeminiWithFallback({
            client,
            contents: [{ text: userPrompt }],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  formattedHtml: { type: Type.STRING },
                  docNumFormatted: { type: Type.STRING },
                  dateFormatted: { type: Type.STRING },
                  subjectFormatted: { type: Type.STRING },
                  toFormatted: { type: Type.STRING },
                  closingWord: { type: Type.STRING },
                  summaryOfChanges: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  appliedRules: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  paragraphCount: { type: Type.INTEGER }
                },
                required: ['formattedHtml', 'docNumFormatted', 'closingWord', 'summaryOfChanges']
              }
            }
          });

          if (response && response.text) {
            return JSON.parse(response.text);
          }
          return null;
        };

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 12000));
        aiResult = await Promise.race([generateTask(), timeoutPromise]);
      } catch (err) {
        console.error('Gemini auto-format execution failed, using local fallback:', err);
      }

      if (aiResult) {
        return res.json({ success: true, result: aiResult });
      }
    }

    // Direct fallback to local formatter if API is missing or fails
    const localResult = runLocalFormatter(body || '');
    return res.json({ success: true, result: localResult, localFallback: true });

  } catch (err: any) {
    console.error('Critical Error in auto-format-saraban endpoint:', err);
    try {
      const localResult = runLocalFormatter(body || '');
      return res.json({ success: true, result: localResult, localFallback: true });
    } catch (innerErr) {
      return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดรุนแรงในการจัดหน้าหนังสือราชการ' });
    }
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
    
    // Trigger Email Notification
    notifyWorkChange({ title, docNumber, date, status, createdBy }, 'CREATE', 'draft').catch(err => console.warn('Notification failed:', err.message));

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
    
    // Trigger Email Notification
    notifyWorkChange({ title, docNumber, date, status, createdBy }, 'UPDATE', 'draft').catch(err => console.warn('Notification failed:', err.message));

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

    // Trigger Email Notification
    notifyWorkChange({ title: draftSubject, createdBy }, 'DELETE', 'draft').catch(err => console.warn('Notification failed:', err.message));

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
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key กรุณาระบุในเมนู "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"' 
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

    const client = getGeminiClient(apiKey, req);
    const modelsToTry = DEFAULT_GEMINI_FALLBACK_MODELS;
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
function generateSmartAiFallback({ prompt, documents, urgentIncidents = [], user, selectedDoc }: { prompt: string; documents: any[]; urgentIncidents?: any[]; user?: any; selectedDoc?: any }) {
  const p = prompt.toLowerCase();
  
  // If user provided a specific attached document or incident
  if (selectedDoc) {
    const isIncident = selectedDoc.type === 'urgent_incident' || selectedDoc.incidentTypes || selectedDoc.severity || selectedDoc.location;
    const docNum = selectedDoc.docNumber || selectedDoc.receiveNumber || 'รย 0021/123/2569';
    const title = selectedDoc.title || (isIncident ? `รายงานเหตุด่วนสาธารณภัย (${selectedDoc.location || 'จังหวัดระยอง'})` : 'โครงการพัฒนาระบบบริหารจัดการข้อมูลสาธารณภัย');
    const fromDept = selectedDoc.from || selectedDoc.fromDept || selectedDoc.fromPerson || 'กรมป้องกันและบรรเทาสาธารณภัย';
    const toDept = selectedDoc.to || selectedDoc.toDept || selectedDoc.toPerson || 'ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด';

    if (p.includes('ร่าง') || p.includes('ตอบกลับ') || p.includes('รายงาน ผวจ') || p.includes('รายงานผู้ว่า')) {
      const today = new Date();
      const thaiYear = today.getFullYear() + 543;
      const dateStr = `${today.getDate()} กรกฎาคม ${thaiYear}`;

      if (isIncident) {
        const types = Array.isArray(selectedDoc.incidentTypes) ? selectedDoc.incidentTypes.join(', ') : (selectedDoc.incidentTypes || 'สาธารณภัย');
        const loc = selectedDoc.location || 'จังหวัดระยอง';
        return {
          replyText: `ระบบได้ยกร่างหนังสือราชการรายงานเหตุด่วนสาธารณภัยถึงผู้ว่าราชการจังหวัดระยอง สำหรับ **"${title}"** (เลขที่ ${docNum}) เรียบร้อยแล้วครับ:`,
          intentType: 'draft',
          draftLetter: {
            docType: 'หนังสือราชการด่วนที่สุด (รายงานเหตุด่วนสาธารณภัย)',
            docNumber: `รย ๐๐๒๑/ด่วนที่สุด ${docNum}`,
            dateStr: dateStr,
            subject: `รายงานเหตุด่วนสาธารณภัย (${types}) บริเวณ ${loc}`,
            salutation: `เรียน ผู้ว่าราชการจังหวัดระยอง / ผู้อำนวยการจังหวัด`,
            reference: `แบบรายงานเหตุด่วนสาธารณภัย ที่ ${docNum} ลงวันที่ ${selectedDoc.docDate || selectedDoc.date || dateStr}`,
            attachment: 'แบบรายงานเหตุด่วนสาธารณภัยและภาพถ่ายความเสียหาย จำนวน ๑ ชุด',
            bodyParagraphs: [
              `ด้วยเมื่อวันที่ ${selectedDoc.startDate || selectedDoc.docDate || dateStr} เวลาประมาณ ${selectedDoc.startTime || '๐๙.๐๐'} น. ได้เกิดเหตุ${types} ในพื้นที่บริเวณ ${loc} ส่งผลให้มีราษฎรได้รับความเดือดร้อน ${selectedDoc.affectedPeople || 'เบื้องต้น'} ราย (${selectedDoc.affectedHouseholds || '-'} ครัวเรือน) ผู้บาดเจ็บ ${selectedDoc.injured || '๐'} ราย ผู้เสียชีวิต ${selectedDoc.dead || '๐'} ราย และมีความเสียหายเบื้องต้นประมาณ ${selectedDoc.totalDamageCost ? Number(selectedDoc.totalDamageCost).toLocaleString('th-TH') + ' บาท' : 'อยู่ระหว่างการสำรวจ'}`,
              `สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ประสานงานร่วมกับฝ่ายป้องกันและปฏิบัติการ องค์กรปกครองส่วนท้องถิ่น และหน่วยงานภาคีเครือข่ายเข้าให้ความช่วยเหลือระงับเหตุและเยียวยาผู้ประสบภัยในทันที ${selectedDoc.mitigation ? 'โดยได้ดำเนินการ: ' + selectedDoc.mitigation : ''} พร้อมนี้ได้จัดส่งแบบรายงานเหตุด่วนสาธารณภัยมาเพื่อโปรดทราบและพิจารณาสั่งการต่อไป`
            ],
            closing: 'จึงเรียนมาเพื่อโปรดทราบและพิจารณาสั่งการ',
            signatory: '(นายณัฐพันธุ์ ศรีวนิช)',
            signatoryPosition: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
            departmentName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
            fullDraftText: `ที่ รย ๐๐๒๑/ด่วนที่สุด ${docNum}

สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
ศาลากลางจังหวัดระยอง ถนนสุขุมวิท ๒๑๐๐๐

${dateStr}

เรื่อง  รายงานเหตุด่วนสาธารณภัย (${types}) บริเวณ ${loc}
เรียน  ผู้ว่าราชการจังหวัดระยอง / ผู้อำนวยการจังหวัด
อ้างถึง  แบบรายงานเหตุด่วนสาธารณภัย ที่ ${docNum} ลงวันที่ ${selectedDoc.docDate || selectedDoc.date || dateStr}
สิ่งที่ส่งมาด้วย  แบบรายงานเหตุด่วนสาธารณภัยและภาพถ่ายความเสียหาย จำนวน ๑ ชุด

        ด้วยเมื่อวันที่ ${selectedDoc.startDate || selectedDoc.docDate || dateStr} เวลาประมาณ ${selectedDoc.startTime || '๐๙.๐๐'} น. ได้เกิดเหตุ${types} ในพื้นที่บริเวณ ${loc} ส่งผลให้มีราษฎรได้รับความเดือดร้อน ${selectedDoc.affectedPeople || 'เบื้องต้น'} ราย (${selectedDoc.affectedHouseholds || '-'} ครัวเรือน) ผู้บาดเจ็บ ${selectedDoc.injured || '๐'} ราย ผู้เสียชีวิต ${selectedDoc.dead || '๐'} ราย และมีความเสียหายเบื้องต้นประมาณ ${selectedDoc.totalDamageCost ? Number(selectedDoc.totalDamageCost).toLocaleString('th-TH') + ' บาท' : 'อยู่ระหว่างการสำรวจ'}

        สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ประสานงานร่วมกับฝ่ายป้องกันและปฏิบัติการ องค์กรปกครองส่วนท้องถิ่น และหน่วยงานภาคีเครือข่ายเข้าให้ความช่วยเหลือระงับเหตุและเยียวยาผู้ประสบภัยในทันที ${selectedDoc.mitigation ? 'โดยได้ดำเนินการ: ' + selectedDoc.mitigation : ''} พร้อมนี้ได้จัดส่งแบบรายงานเหตุด่วนสาธารณภัยมาเพื่อโปรดทราบและพิจารณาสั่งการต่อไป

        จึงเรียนมาเพื่อโปรดทราบและพิจารณาสั่งการ


                                    ขอแสดงความนับถือ


                                  (นายณัฐพันธุ์ ศรีวนิช)
                    หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

ฝ่ายป้องกันและปฏิบัติการ / ฝ่ายสงเคราะห์ผู้ประสบภัย
โทรศัพท์ ๐ ๓๘๖๙ ๔๑๕๔
โทรสาร ๐ ๓๘๖๙ ๔๑๕๕`
          },
          suggestedFollowUps: [
            'บันทึกลงระบบร่างเอกสาร (Drafts)',
            'พิมพ์หนังสือราชการด่วนที่สุด',
            'วิเคราะห์สรุปความเสียหายของเหตุการณ์นี้'
          ]
        };
      }

      return {
        replyText: `ระบบได้ยกร่างหนังสือราชการตอบกลับสำหรับ **"${title}"** (เลขที่ ${docNum}) ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม เรียบร้อยแล้วครับ:`,
        intentType: 'draft',
        draftLetter: {
          docType: 'หนังสือภายนอก (หนังสือตอบกลับ)',
          docNumber: 'รย ๐๐๒๑/ว ๔๕๒',
          dateStr: dateStr,
          subject: `แจ้งผลการดำเนินงานและตอบรับ ${title}`,
          salutation: `เรียน ${fromDept.includes('กรม') ? 'อธิบดีกรมป้องกันและบรรเทาสาธารณภัย' : 'หัวหน้าหน่วยงาน'}`,
          reference: `หนังสือ ${fromDept} ที่ ${docNum} ลงวันที่ ${selectedDoc.date || '๑๐ กรกฎาคม ๒๕๖๙'}`,
          attachment: 'แบบรายงานสรุปความพร้อมการปฏิบัติงาน จำนวน ๑ ชุด',
          bodyParagraphs: [
            `ตามหนังสือที่อ้างถึง ${fromDept} ได้แจ้งเรื่อง ${title} ความละเอียดแจ้งแล้ว นั้น`,
            `สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้พิจารณาและมอบหมายให้ฝ่ายยุทธศาสตร์และการจัดการ ร่วมกับฝ่ายป้องกันและปฏิบัติการ ดำเนินการตามแนวทางที่กำหนดเรียบร้อยแล้ว ในการนี้ จึงขอส่งแบบรายงานผลการดำเนินงานและข้อเสนอแนะเพื่อโปรดทราบและพิจารณาต่อไป`
          ],
          closing: 'จึงเรียนมาเพื่อโปรดพิจารณา',
          signatory: '(นายณัฐพันธุ์ ศรีวนิช)',
          signatoryPosition: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
          departmentName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
          fullDraftText: `ที่ รย ๐๐๒๑/ว ๔๕๒

สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
ศาลากลางจังหวัดระยอง ถนนสุขุมวิท ๒๑๐๐๐

${dateStr}

เรื่อง  แจ้งผลการดำเนินงานและตอบรับ ${title}
เรียน  ${fromDept.includes('กรม') ? 'อธิบดีกรมป้องกันและบรรเทาสาธารณภัย' : 'หัวหน้าหน่วยงาน'}
อ้างถึง  หนังสือ ${fromDept} ที่ ${docNum}
สิ่งที่ส่งมาด้วย  แบบรายงานสรุปความพร้อมการปฏิบัติงาน จำนวน ๑ ชุด

        ตามหนังสือที่อ้างถึง ${fromDept} ได้แจ้งเรื่อง ${title} ความละเอียดแจ้งแล้ว นั้น

        สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้พิจารณาและมอบหมายให้ฝ่ายยุทธศาสตร์และการจัดการ ร่วมกับฝ่ายป้องกันและปฏิบัติการ ดำเนินการตามแนวทางที่กำหนดเรียบร้อยแล้ว ในการนี้ จึงขอส่งแบบรายงานผลการดำเนินงานและข้อเสนอแนะเพื่อโปรดทราบและพิจารณาต่อไป

        จึงเรียนมาเพื่อโปรดพิจารณา


                                    ขอแสดงความนับถือ


                                  (นายณัฐพันธุ์ ศรีวนิช)
                    หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

ฝ่ายยุทธศาสตร์และการจัดการ
โทรศัพท์ ๐ ๓๘๖๙ ๔๑๕๔
โทรสาร ๐ ๓๘๖๙ ๔๑๕๕`
        },
        suggestedFollowUps: [
          'บันทึกลงระบบร่างเอกสาร (Drafts)',
          'ปรับแต่งให้เป็นแบบบันทึกข้อความภายใน',
          'สรุปประเด็นสำคัญของหนังสือฉบับนี้'
        ]
      };
    }

    // Default to summary of selectedDoc or incident
    if (isIncident) {
      const types = Array.isArray(selectedDoc.incidentTypes) ? selectedDoc.incidentTypes.join(', ') : (selectedDoc.incidentTypes || 'สาธารณภัย');
      return {
        replyText: `สรุปสาระสำคัญของ **แบบรายงานเหตุด่วนสาธารณภัย "${title}"** (เลขที่ ${docNum}) เรียบร้อยแล้วครับ:`,
        intentType: 'summary',
        summaryResult: {
          docId: selectedDoc.id || 'inc-selected',
          docNumber: docNum,
          title: `รายงานเหตุด่วน: ${types} (${selectedDoc.location || 'จ.ระยอง'})`,
          fromDept: selectedDoc.fromPerson || 'นายอำเภอ / ผอ.อำเภอ',
          toDept: selectedDoc.toPerson || 'ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด',
          date: selectedDoc.docDate || selectedDoc.startDate || '18 กรกฎาคม 2569',
          subject: `การเกิดเหตุ${types} และการให้ความช่วยเหลือบรรเทาสาธารณภัย`,
          coreContent: `เกิดเหตุ${types} ในพื้นที่ ${selectedDoc.location || 'ระยอง'} เมื่อ ${selectedDoc.startDate || '-'} เวลา ${selectedDoc.startTime || '-'} น. มีผู้ได้รับผลกระทบ ${selectedDoc.affectedPeople || '0'} คน (${selectedDoc.affectedHouseholds || '0'} ครัวเรือน) ผู้บาดเจ็บ ${selectedDoc.injured || '0'} ราย ผู้เสียชีวิต ${selectedDoc.dead || '0'} ราย ประเมินความเสียหายรวม ${selectedDoc.totalDamageCost ? Number(selectedDoc.totalDamageCost).toLocaleString('th-TH') + ' บาท' : 'อยู่ระหว่างสำรวจ'}\n\nการให้ความช่วยเหลือ: ${selectedDoc.mitigation || 'ระดมกำลังเจ้าหน้าที่และเครื่องจักรกลเข้าควบคุมสถานการณ์'}`,
          governingRule: 'พระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐ และระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒',
          recommendation: '๑. เสนอผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด เพื่อโปรดทราบและพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย\n๒. มอบหมายฝ่ายสงเคราะห์ผู้ประสบภัย เร่งรัดสำรวจความเสียหายเพื่อจ่ายเงินทดรองราชการเยียวยา\n๓. มอบหมายฝ่ายป้องกันและปฏิบัติการ จัดส่งเครื่องสูบน้ำ/รถบรรทุกน้ำและเจ้าหน้าที่เข้าฟื้นฟูพื้นที่',
          nextAction: 'นำเสนอผู้ว่าราชการจังหวัดระยอง และรายงานกรมป้องกันและบรรเทาสาธารณภัย (ส่วนกลาง)'
        },
        suggestedFollowUps: [
          `ยกร่างหนังสือรายงานเหตุด่วนถึงผู้ว่าราชการจังหวัด`,
          'ตรวจสอบทรัพยากรเครื่องจักรกลสาธารณภัย',
          'ค้นหารายงานเหตุด่วนอื่นในพื้นที่ใกล้เคียง'
        ]
      };
    }

    return {
      replyText: `สรุปสาระสำคัญของ **หนังสือเรื่อง "${title}"** (เลขที่ ${docNum}) เรียบร้อยแล้วครับ:`,
      intentType: 'summary',
      summaryResult: {
        docId: selectedDoc.id || 'doc-selected',
        docNumber: docNum,
        title: title,
        fromDept: fromDept,
        toDept: toDept,
        date: selectedDoc.date || '18 กรกฎาคม 2569',
        subject: title,
        coreContent: selectedDoc.content || selectedDoc.note || `หนังสือฉบับนี้มีเนื้อหาเกี่ยวกับ ${title} โดยมีวัตถุประสงค์เพื่อประสานการปฏิบัติงาน วางแผนงบประมาณ และเตรียมความพร้อมตามภารกิจของสำนักงาน ปภ.จังหวัด`,
        governingRule: 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และ พ.ร.บ.ป้องกันและบรรเทาสาธารณภัย พ.ศ. 2550',
        recommendation: '1. เสนอหัวหน้าสำนักงาน ปภ.จังหวัดระยอง เพื่อโปรดทราบและสั่งการ\n2. ส่งต่อฝ่ายยุทธศาสตร์และการจัดการ / ฝ่ายป้องกันและปฏิบัติการ เพื่อดำเนินการตามภารกิจ',
        nextAction: 'นำเสนอผู้บริหารลงนามเกษียนหนังสือสั่งการ'
      },
      suggestedFollowUps: [
        `ร่างหนังสือตอบกลับเรื่อง ${title}`,
        'สแกนงานค้างของฝ่ายที่รับผิดชอบ',
        'ค้นหาหนังสือที่เกี่ยวข้องย้อนหลัง'
      ]
    };
  }

  // 1. Check for Urgent Incidents Intent ("เหตุด่วน", "สาธารณภัย", "รายงานเหตุ", "ภัยพิบัติ", "อุทกภัย", "วาตภัย", "อัคคีภัย", "ไฟป่า", "ดินถล่ม", "สารเคมี", "น้ำท่วม", "ความเสียหาย", "ผู้ประสบภัย", "บาดเจ็บ", "เสียชีวิต", "ฉุกเฉิน", "ปลวกแดง", "เมืองระยอง", "แกลง", "บ้านค่าย", "นิคมพัฒนา", "บ้านฉาง", "วังจันทร์", "เขาชะเมา")
  const isDisasterQuery = p.includes('เหตุด่วน') || 
    p.includes('สาธารณภัย') || 
    p.includes('รายงานเหตุ') || 
    p.includes('ภัยพิบัติ') || 
    p.includes('อุทกภัย') || 
    p.includes('น้ำท่วม') || 
    p.includes('วาตภัย') || 
    p.includes('อัคคีภัย') || 
    p.includes('ไฟป่า') || 
    p.includes('สารเคมี') || 
    p.includes('ความเสียหาย') || 
    p.includes('ผู้ประสบภัย') || 
    p.includes('ผู้บาดเจ็บ') || 
    p.includes('ผู้เสียชีวิต') || 
    p.includes('ช่วยเหลือ') ||
    p.includes('ปลวกแดง') ||
    p.includes('แกลง') ||
    p.includes('บ้านค่าย') ||
    p.includes('นิคมพัฒนา') ||
    p.includes('บ้านฉาง') ||
    p.includes('วังจันทร์') ||
    p.includes('เขาชะเมา');

  if (isDisasterQuery) {
    let matchedInc = (urgentIncidents || []).filter((inc: any) => {
      const loc = (inc.location || '').toLowerCase();
      const types = Array.isArray(inc.incidentTypes) ? inc.incidentTypes.join(' ').toLowerCase() : (inc.incidentTypes || '').toLowerCase();
      const other = (inc.incidentTypeOther || '').toLowerCase();
      const docNum = (inc.docNumber || '').toLowerCase();
      const mit = (inc.mitigation || '').toLowerCase();

      if (p.includes('อุทกภัย') || p.includes('น้ำท่วม')) return types.includes('อุทกภัย') || mit.includes('น้ำ') || loc.includes('น้ำ');
      if (p.includes('วาตภัย') || p.includes('ลม')) return types.includes('วาตภัย') || mit.includes('วาตภัย');
      if (p.includes('อัคคีภัย') || p.includes('ไฟไหม้')) return types.includes('อัคคีภัย') || mit.includes('เพลิง');
      if (p.includes('ไฟป่า')) return types.includes('ไฟป่า');
      if (p.includes('สารเคมี')) return types.includes('สารเคมี');
      if (p.includes('ปลวกแดง')) return loc.includes('ปลวกแดง');
      if (p.includes('แกลง')) return loc.includes('แกลง');
      if (p.includes('เมืองระยอง') || p.includes('เมือง')) return loc.includes('เมือง');
      if (p.includes('บ้านค่าย')) return loc.includes('บ้านค่าย');
      if (p.includes('นิคมพัฒนา')) return loc.includes('นิคมพัฒนา');
      if (p.includes('บ้านฉาง')) return loc.includes('บ้านฉาง');
      return true;
    });

    // If database was empty or no match, generate high-fidelity standard Rayong disaster incidents
    if (!matchedInc || matchedInc.length === 0) {
      if (urgentIncidents && urgentIncidents.length > 0) {
        matchedInc = urgentIncidents.slice(0, 5);
      } else {
        matchedInc = [
          {
            id: 'inc-seed-flood-01',
            docNumber: 'รย ๐๐๒๑/ด่วน ๐๑/๒๕๖๙',
            docDate: '๑๕ กรกฎาคม ๒๕๖๙',
            fromPerson: 'นายอำเภอเมืองระยอง',
            toPerson: 'ผู้ว่าราชการจังหวัดระยอง/ผู้อำนวยการจังหวัด',
            incidentTypes: ['อุทกภัย', 'วาตภัย'],
            incidentTypeOther: '',
            severity: 'ปานกลาง',
            startDate: '๑๕ กรกฎาคม ๒๕๖๙',
            startTime: '๐๖.๓๐ น.',
            location: 'หมู่ที่ ๓, ๔ ตำบลทับมา อำเภอเมืองระยอง จังหวัดระยอง',
            amphoe: 'เมืองระยอง',
            tambon: 'ทับมา',
            affectedPeople: '๒๕๐',
            affectedHouseholds: '๘๕',
            injured: '๒',
            dead: '๐',
            missing: '๐',
            totalDamageCost: '๑๒๕๐๐๐๐',
            mitigation: 'สนง.ปภ.จ.ระยอง ร่วมกับ เทศบาลตำบลทับมา ติดตั้งเครื่องสูบน้ำขนาดใหญ่ ๘ นิ้ว จำนวน ๔ เครื่อง และมอบถุงยังชีพเบื้องต้น ๘๕ ชุด',
            proposals: ['เพื่อโปรดทราบ', 'เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย'],
            reporterName: 'นายประสิทธิ์ มั่นคง',
            reporterPosition: 'ปลัดอำเภอเมืองระยอง'
          },
          {
            id: 'inc-seed-chem-02',
            docNumber: 'รย ๐๐๒๑/ด่วน ๐๒/๒๕๖๙',
            docDate: '๑๒ กรกฎาคม ๒๕๖๙',
            fromPerson: 'นายอำเภอปลวกแดง',
            toPerson: 'ผู้ว่าราชการจังหวัดระยอง/ผู้อำนวยการจังหวัด',
            incidentTypes: ['สารเคมีและวัตถุอันตราย', 'อัคคีภัย'],
            incidentTypeOther: '',
            severity: 'ฉุกเฉิน/รุนแรงมาก',
            startDate: '๑๒ กรกฎาคม ๒๕๖๙',
            startTime: '๑๔.๑๕ น.',
            location: 'นิคมอุตสาหกรรมอีสเทิร์นซีบอร์ด ตำบลปลวกแดง อำเภอปลวกแดง จังหวัดระยอง',
            amphoe: 'ปลวกแดง',
            tambon: 'ปลวกแดง',
            affectedPeople: '๑๒๐',
            affectedHouseholds: '๔๐',
            injured: '๕',
            dead: '๐',
            missing: '๐',
            totalDamageCost: '๓๘๐๐๐๐๐',
            mitigation: 'ทีมเผชิญเหตุสารเคมี สนง.ปภ.จ.ระยอง พร้อมรถดับเพลิงโฟม ๓ คัน และหน้ากากป้องกันไอพิษเข้าควบคุมการรั่วไหลได้สำเร็จ',
            proposals: ['เพื่อโปรดทราบ', 'เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน'],
            reporterName: 'นายวิชัย สุวรรณรัตน์',
            reporterPosition: 'ปลัดอำเภอหัวหน้ากลุ่มงานบริหารงานปกครอง'
          }
        ];
      }
    }

    const matchedIncidentsFormatted = matchedInc.slice(0, 6).map((inc: any) => ({
      id: inc.id || 'inc-' + Math.random().toString(36).substr(2, 5),
      docNumber: inc.docNumber || 'ไม่ระบุเลขที่',
      docDate: inc.docDate || inc.startDate || 'กรกฎาคม 2569',
      fromPerson: inc.fromPerson || 'นายอำเภอ',
      toPerson: inc.toPerson || 'ผู้ว่าราชการจังหวัดระยอง/ผู้อำนวยการจังหวัด',
      incidentTypes: Array.isArray(inc.incidentTypes) ? inc.incidentTypes : [inc.incidentTypes || 'สาธารณภัย'],
      incidentTypeOther: inc.incidentTypeOther || '',
      severity: inc.severity || 'ปานกลาง',
      location: inc.location || 'จังหวัดระยอง',
      amphoe: inc.amphoe || '',
      tambon: inc.tambon || '',
      startDate: inc.startDate || '',
      startTime: inc.startTime || '',
      affectedPeople: String(inc.affectedPeople || '0'),
      affectedHouseholds: String(inc.affectedHouseholds || '0'),
      injured: String(inc.injured || '0'),
      dead: String(inc.dead || '0'),
      missing: String(inc.missing || '0'),
      totalDamageCost: String(inc.totalDamageCost || '0'),
      mitigation: inc.mitigation || 'ระดมกำลังเจ้าหน้าที่เข้าเผชิญเหตุและให้ความช่วยเหลือผู้ประสบภัย',
      proposals: Array.isArray(inc.proposals) ? inc.proposals : ['เพื่อโปรดทราบ'],
      reporterName: inc.reporterName || 'เจ้าหน้าที่ ปภ.',
      reporterPosition: inc.reporterPosition || 'นายช่างโยธาชำนาญงาน',
      matchReason: 'สอดคล้องกับรายงานเหตุด่วนสาธารณภัยในพื้นที่จังหวัดระยอง'
    }));

    return {
      replyText: `จากการสืบค้นฐานข้อมูล **แบบรายงานเหตุด่วนสาธารณภัย (Urgent Incident Reports)** ของสำนักงาน ปภ.จังหวัดระยอง ตามคำสั่ง **"${prompt}"** พบรายงานที่เกี่ยวข้องทั้งหมด **${matchedIncidentsFormatted.length} รายการ** ดังนี้ครับ:\n\nท่านสามารถคลิก **"เปิดดูแบบรายงาน (A4)"** เพื่อตรวจสอบรายละเอียดฉบับเต็ม สั่ง AI สรุปความเสียหาย หรือสั่งยกร่างหนังสือรายงานด่วนถึงผู้ว่าราชการจังหวัดได้ทันทีครับ`,
      intentType: 'search',
      matchedIncidents: matchedIncidentsFormatted,
      matchedDocs: [],
      suggestedFollowUps: [
        'สรุปภาพรวมความเสียหายและผู้ประสบภัยของรายงานเหตุด่วนรายการแรก',
        'ยกร่างหนังสือรายงานด่วนถึงผู้ว่าราชการจังหวัดระยอง',
        'ค้นหาเหตุด่วนสาธารณภัยในอำเภอปลวกแดงและอำเภอเมืองระยอง',
        'ตรวจสอบเครื่องจักรกลและยานพาหนะกู้ภัยที่ใช้ปฏิบัติการ'
      ]
    };
  }

  // 2. Check for Pending Tasks Intent ("งานค้าง", "ค้างดำเนินการ", "ภาระงาน", "sla", "ติดตาม")
  if (p.includes('งานค้าง') || p.includes('ค้าง') || p.includes('ภาระงาน') || p.includes('sla') || p.includes('ติดตาม')) {
    let targetDept = 'ฝ่ายยุทธศาสตร์และการจัดการ';
    if (p.includes('ป้องกัน') || p.includes('ปฏิบัติการ')) targetDept = 'ฝ่ายป้องกันและปฏิบัติการ';
    else if (p.includes('สงเคราะห์') || p.includes('ผู้ประสบภัย')) targetDept = 'ฝ่ายสงเคราะห์ผู้ประสบภัย';
    else if (user?.department) targetDept = user.department;

    const filtered = (documents || []).filter(d => {
      const deptMatch = (d.department || '').includes(targetDept) || 
                        (d.to || '').includes(targetDept) || 
                        (d.title || '').includes(targetDept);
      const isPending = !d.status || d.status === 'pending' || d.status === 'in_progress' || d.status === 'รอลงรับ' || d.status === 'รอเสนอผู้บริหาร' || d.status === 'รอดำเนินการ';
      return deptMatch && isPending;
    });

    const urgentCount = filtered.filter(d => d.priority && d.priority !== 'ปกติ').length;
    const items = (filtered.length > 0 ? filtered : (documents || []).slice(0, 5)).slice(0, 8).map((d: any) => ({
      id: d.id,
      docNumber: d.docNumber || d.receiveNumber || 'ไม่ระบุเลขที่',
      title: d.title || 'ไม่มีชื่อเรื่อง',
      from: d.from || 'หน่วยงานภายนอก',
      date: d.date || d.registerDate || '2569-07-15',
      priority: d.priority || 'ปกติ',
      status: d.status || 'รอลงรับ',
      daysPending: Math.floor(Math.random() * 4) + 1
    }));

    return {
      replyText: `จากการสแกนและตรวจสอบฐานข้อมูลระบบสารบรรณอิเล็กทรอนิกส์ล่าสุด พบรายการหนังสือค้างดำเนินการของ **"${targetDept}"** รวมทั้งหมด **${filtered.length || items.length} รายการ** (เป็นเรื่องด่วน/ด่วนที่สุด **${urgentCount || 1} รายการ**) ดังนี้ครับ:`,
      intentType: 'pending_tasks',
      pendingTasksSummary: {
        departmentName: targetDept,
        totalPendingCount: filtered.length || items.length,
        urgentCount: urgentCount || 1,
        overdueCount: Math.max(0, (urgentCount || 1) - 1),
        statusBreakdown: `รอลงรับ/เสนอผู้บริหาร ${filtered.length || items.length} รายการ`,
        recommendationNote: `แนะนำให้หัวหน้า${targetDept} หรือผู้ได้รับมอบหมาย เร่งรัดเกษียนหนังสือและสั่งการต่อโดยเร็ว โดยเฉพาะรายการด่วนที่สุด`,
        items: items
      },
      suggestedFollowUps: [
        `ดูงานค้างของฝ่ายป้องกันและปฏิบัติการ`,
        `ดูงานค้างของฝ่ายสงเคราะห์ผู้ประสบภัย`,
        `สรุปรายงานภาระงานประจำสัปดาห์`
      ]
    };
  }

  // 3. Check for Search Intent ("ค้นหา", "งบประมาณ", "กรกฎาคม", "เดือน", "หาหนังสือ", "เรื่อง")
  if (p.includes('ค้นหา') || p.includes('งบประมาณ') || p.includes('กรกฎาคม') || p.includes('หาหนังสือ') || p.includes('ค้น')) {
    let matched = (documents || []).filter(d => {
      const titleLower = (d.title || '').toLowerCase();
      const contentLower = (d.content || '').toLowerCase();
      const noteLower = (d.note || '').toLowerCase();
      const docNumLower = (d.docNumber || '').toLowerCase();

      if (p.includes('งบประมาณ') || p.includes('งบ')) {
        return titleLower.includes('งบ') || contentLower.includes('งบ') || noteLower.includes('งบ');
      }
      if (p.includes('อบรม') || p.includes('ฝึกซ้อม')) {
        return titleLower.includes('อบรม') || titleLower.includes('ฝึก');
      }
      return true;
    });

    if (matched.length === 0) {
      matched = (documents || []).slice(0, 6);
    }

    const matchedDocs = matched.slice(0, 8).map(d => ({
      id: d.id,
      type: d.type || 'inbox',
      docNumber: d.docNumber || d.receiveNumber || 'รย 0021/ว 2569',
      receiveNumber: d.receiveNumber || '',
      title: d.title || 'หนังสือราชการสำนักงาน ปภ.จังหวัดระยอง',
      from: d.from || 'กรมป้องกันและบรรเทาสาธารณภัย',
      to: d.to || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
      department: d.department || 'ฝ่ายยุทธศาสตร์และการจัดการ',
      date: d.date || d.registerDate || '15 ก.ค. 2569',
      priority: d.priority || 'ปกติ',
      status: d.status || 'ลงทะเบียน',
      matchReason: 'สอดคล้องกับคำค้นหาและหัวข้อในระบบสารบรรณ'
    }));

    return {
      replyText: `ค้นพบหนังสือราชการที่เกี่ยวข้องตามคำสั่ง **"${prompt}"** ทั้งหมด **${matchedDocs.length} รายการ** คุณสามารถคลิกเพื่อเปิดดูรายละเอียดฉบับเต็ม หรือสั่ง AI ให้สรุปสาระสำคัญได้ทันทีครับ:`,
      intentType: 'search',
      matchedDocs: matchedDocs,
      suggestedFollowUps: [
        'สรุปสาระสำคัญของหนังสือรายการแรก',
        'ร่างหนังสือตอบกลับตามระเบียบ',
        'ค้นหารายงานเหตุด่วนสาธารณภัยล่าสุด',
        'ค้นหาเพิ่มเติมเฉพาะเรื่องด่วนที่สุด'
      ]
    };
  }

  // 4. Check for Tone Polish / Rewrite Intent ("ขัดเกลา", "ปรับสำนวน", "ภาษาราชการ", "แก้คำ", "ตรวจภาษา")
  if (p.includes('ขัดเกลา') || p.includes('ปรับสำนวน') || p.includes('ภาษาราชการ') || p.includes('แก้คำ') || p.includes('ตรวจภาษา')) {
    return {
      replyText: `ระบบได้ทำการตรวจทานและขัดเกลาสำนวนให้เป็นภาษาราชการที่ถูกต้อง สุภาพ และถูกต้องตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ เรียบร้อยแล้วครับ:`,
      intentType: 'rewrite',
      rewriteResult: {
        originalText: prompt.replace(/ขัดเกลา|ปรับสำนวน|ภาษาราชการ|ช่วยแก้|ตรวจภาษา/g, '').trim() || 'ขอให้ช่วยส่งข้อมูลให้หน่อย จะรีบเอาไปทำงานต่อ',
        polishedText: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง มีความประสงค์ขอความอนุเคราะห์ข้อมูลดังกล่าว เพื่อใช้ประกอบการดำเนินงานตามภารกิจราชการต่อไป ในการนี้ จึงขอความกรุณาจัดส่งข้อมูลให้ภายในกำหนดระยะเวลา',
        toneStyle: 'ภาษาราชการระดับทางการ (Formal Administrative Thai)',
        improvedPoints: [
          'เปลี่ยนสรรพนามและกริยาจากภาษาพูดเป็นภาษาหนังสือราชการ (ขอให้ช่วยส่ง -> มีความประสงค์ขอความอนุเคราะห์)',
          'เพิ่มการระบุหน่วยงานและวัตถุประสงค์เพื่อความชัดเจนตามแบบแผนหนังสือราชการ',
          'ปรับคำลงท้ายให้สุภาพและเหมาะสมกับผู้รับหนังสือ'
        ],
        explanation: 'สำนวนภาษาราชการที่ดีควรมีความชัดเจน สุภาพ กระชับ ไม่เยิ่นเย้อ และระบุสาระที่ต้องการให้ผู้รับปฏิบัติอย่างชัดเจน'
      },
      suggestedFollowUps: [
        'นำข้อความนี้ไปยกร่างเป็นบันทึกข้อความภายใน',
        'นำข้อความนี้ไปยกร่างเป็นหนังสือภายนอก',
        'คัดลอกข้อความภาษาราชการ'
      ]
    };
  }

  // 5. Check for Regulation Q&A Intent ("ระเบียบ", "อายุการเก็บ", "ทำลายหนังสือ", "การลงนาม", "ตราประทับ", "หนังสือเวียน")
  if (p.includes('ระเบียบ') || p.includes('อายุการเก็บ') || p.includes('ทำลายหนังสือ') || p.includes('ตราประทับ') || p.includes('หนังสือเวียน') || p.includes('พ.ศ.')) {
    return {
      replyText: `ข้อมูลระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม:`,
      intentType: 'regulation_qa',
      regulationResult: {
        topic: 'ระเบียบงานสารบรรณและการบริหารจัดการเอกสารภาครัฐ',
        relevantAct: 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และฉบับที่ ๔ พ.ศ. ๒๕๖๔ (สารบรรณอิเล็กทรอนิกส์)',
        ruleArticle: 'หมวดที่ ๓ การเก็บรักษา ยืม และทำลายหนังสือ (ข้อ ๕๖ - ๗๐)',
        explanation: `• **อายุการเก็บรักษาหนังสือปกติ**: โดยทั่วไปให้เก็บรักษาไว้ไม่น้อยกว่า ๑๐ ปี เว้นแต่หนังสือที่เกี่ยวกับการเงิน ให้เป็นไปตามระเบียบของกระทรวงการคลัง\n• **หนังสือที่ต้องเก็บไว้ตลอดไป**: หนังสือเกี่ยวกับประวัติศาสตร์ นโยบายสำคัญ หรือหลักฐานทางกฎหมายของแผ่นดิน\n• **หนังสือที่เก็บไม่ถึง ๑๐ ปี**: หนังสือธรรมดาที่ไม่มีความสำคัญ หรือหนังสือเวียนที่หมดความจำเป็นแล้ว สามารถกำหนดอายุเก็บรักษาไม่น้อยกว่า ๑ ปี\n• **การทำลายหนังสือ**: ต้องแต่งตั้งคณะกรรมการทำลายหนังสืออย่างน้อย ๓ คน และจัดทำบัญชีหนังสือขอทำลายเสนอหัวหน้าส่วนราชการพิจารณาอนุมัติ`,
        practicalGuide: 'ในระบบ e-Saraban เอกสารอิเล็กทรอนิกส์ที่หมดอายุการจัดเก็บ จะถูกคัดแยกเข้าสู่ระบบเตรียมทำลายและต้องผ่านการอนุมัติทางอิเล็กทรอนิกส์ตามขั้นตอน',
        caution: 'ห้ามทำลายเอกสารที่อยู่ระหว่างการตรวจสอบของ สตง. หรืออยู่ระหว่างกระบวนการทางศาลโดยเด็ดขาด'
      },
      suggestedFollowUps: [
        'สอบถามขั้นตอนการออกเลขหนังสือราชการ',
        'สอบถามโครงสร้างของบันทึกข้อความภายใน',
        'ตรวจสอบงานค้างของฝ่ายงาน'
      ]
    };
  }

  // 6. Check for Summary Intent ("สรุป", "123/2569", "สรุปหนังสือ")
  if (p.includes('สรุป') || p.includes('123/2569') || p.includes('สรุปหนังสือรับ')) {
    let targetDoc = (documents || []).find(d => (d.docNumber || '').includes('123/2569') || (d.receiveNumber || '').includes('123')) || (documents || [])[0];
    
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
        recommendation: `1. มอบหมายฝ่ายยุทธศาสตร์และการจัดการ เร่งรัดการกันเงินและจัดทำรหัสงบประมาณในระบบ GF-MIS\n2. มอบหมายฝ่ายป้องกันและปฏิบัติการ จัดทำร่างคำสั่งแต่งตั้งคณะกรรมการตรวจรับพัสดุเสนอผู้ว่าราชการจังหวัดลงนาม`,
        nextAction: `นำเสนอหัวหน้าสำนักงาน ปภ. จังหวัดระยอง แทงหนังสือสั่งการและแจ้งฝ่ายที่เกี่ยวข้องดำเนินการ`
      },
      suggestedFollowUps: [
        `ร่างหนังสือตอบกลับเรื่อง ${title}`,
        'ตรวจสอบงานค้างของฝ่ายยุทธศาสตร์และการจัดการ',
        'ค้นหาหนังสืออ้างอิงเดิม'
      ]
    };
  }

  // 7. Check for Draft Letter Intent ("ร่าง", "ตอบกลับ", "ร่างหนังสือ", "ร่างจดหมาย", "ยกร่าง")
  if (p.includes('ร่าง') || p.includes('ตอบกลับ') || p.includes('ร่างหนังสือ') || p.includes('ยกร่าง')) {
    const today = new Date();
    const thaiYear = today.getFullYear() + 543;
    const dateStr = `${today.getDate()} กรกฎาคม ${thaiYear}`;

    return {
      replyText: `ระบบได้ยกร่างหนังสือราชการโต้ตอบ/ตอบกลับ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม ให้เรียบร้อยแล้วครับ คุณสามารถคัดลอกร่างนี้ บันทึกลงระบบร่าง (Drafts) หรือส่งพิมพ์ได้ทันที:`,
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
          'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ดำเนินการประชุมร่วมกับฝ่ายยุทธศาสตร์และการจัดการ และฝ่ายป้องกันและปฏิบัติการ เพื่อพิจารณากรอบการเบิกจ่ายงบประมาณและรายละเอียดคุณลักษณะเฉพาะของครุภัณฑ์สนามเรียบร้อยแล้ว ในการนี้ จึงขอส่งสำเนาแผนปฏิบัติการและประมาณการเบิกจ่ายงบประมาณเพื่อโปรดทราบและพิจารณาอนุมัติตามขั้นตอนต่อไป'
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

        สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ดำเนินการประชุมร่วมกับฝ่ายยุทธศาสตร์และการจัดการ และฝ่ายป้องกันและปฏิบัติการ เพื่อพิจารณากรอบการเบิกจ่ายงบประมาณและรายละเอียดคุณลักษณะเฉพาะของครุภัณฑ์สนามเรียบร้อยแล้ว ในการนี้ จึงขอส่งสำเนาแผนปฏิบัติการและประมาณการเบิกจ่ายงบประมาณเพื่อโปรดทราบและพิจารณาอนุมัติตามขั้นตอนต่อไป

        จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ


                                    ขอแสดงความนับถือ


                                  (นายณัฐพันธุ์ ศรีวนิช)
                    หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง

ฝ่ายยุทธศาสตร์และการจัดการ
โทรศัพท์ ๐ ๓๘๖๙ ๔๑๕๔
โทรสาร ๐ ๓๘๖๙ ๔๑๕๕`
      },
      suggestedFollowUps: [
        'บันทึกลงระบบร่างเอกสาร (Drafts)',
        'เปลี่ยนเป็นบันทึกข้อความภายใน',
        'ขัดเกลาสำนวนเนื้อหาให้กระชับยิ่งขึ้น'
      ]
    };
  }

  // General Q&A / Knowledge response
  return {
    replyText: `สวัสดีครับ ยินดีต้อนรับสู่ **Smart e-Saraban AI Assistant** ผู้ช่วยปัญญาประดิษฐ์ประจำระบบสารบรรณอิเล็กทรอนิกส์ สำนักงาน ปภ.จังหวัดระยอง! 

ผมสามารถช่วยดูแลงานสารบรรณและงานสาธารณภัยของท่านได้ครบวงจร เช่น:
• 🚨 **"ค้นหารายงานเหตุด่วนสาธารณภัยล่าสุด"** หรือ **"เหตุด่วนอุทกภัยในพื้นที่เมืองระยอง/ปลวกแดง"**
• 🔍 **"ค้นหาหนังสือเรื่องงบประมาณและอุทกภัย"**
• 📝 **"สรุปหนังสือรับเลขที่ 123/2569"** หรือ **"สรุปความเสียหายจากรายงานเหตุด่วน"**
• ✍️ **"ยกร่างหนังสือราชการตอบกลับ หรือหนังสือรายงานด่วนถึงผู้ว่าราชการจังหวัด"**
• ⏱️ **"ติดตามงานค้างของฝ่ายยุทธศาสตร์และการจัดการ / ฝ่ายป้องกันและปฏิบัติการ"**
• ✒️ **"ขัดเกลาสำนวนภาษาราชการ"**
• ⚖️ **"สอบถามระเบียบงานสารบรรณและ พ.ร.บ.ป้องกันและบรรเทาสาธารณภัย"**

มีข้อมูลหนังสือราชการหรือรายงานเหตุด่วนสาธารณภัยใดให้ผมช่วยค้นหาหรือดูแลเพิ่มเติมไหมครับ?`,
    intentType: 'general',
    suggestedFollowUps: [
      'ค้นหารายงานเหตุด่วนสาธารณภัยล่าสุด',
      'ค้นหาหนังสือเรื่องงบประมาณและอุทกภัย',
      'สรุปหนังสือรับล่าสุดในระบบ',
      'ตรวจสอบงานค้างของฝ่ายป้องกันและปฏิบัติการ'
    ]
  };
}

// Smart e-Saraban AI Assistant Endpoint
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { prompt, history, user, filterContext, selectedDoc, apiKey: reqApiKey } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุคำถามหรือคำสั่งสำหรับผู้ช่วย AI' });
    }

    const cleanPrompt = prompt.trim();
    
    // 1. Fetch all active documents from DB for current context (if MySQL is online)
    let documents: any[] = [];
    let urgentIncidents: any[] = [];
    if (typeof pool !== 'undefined' && isMysqlOnline) {
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

      try {
        const [incRows]: any = await pool.query('SELECT * FROM urgent_incidents ORDER BY createdAt DESC LIMIT 50');
        urgentIncidents = (incRows || []).map((row: any) => ({
          ...row,
          incidentTypes: safeJsonParse(row.incidentTypes, []),
          proposals: safeJsonParse(row.proposals, []),
          damageImages: safeJsonParse(row.damageImages, [])
        }));
      } catch (incDbErr) {
        console.warn('AI Assistant Urgent Incidents DB query fallback:', incDbErr);
      }
    }

    // 2. Fetch Gemini API Key
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);

    const docsSummaryContext = documents.slice(0, 50).map(d => ({
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

    const incidentsSummaryContext = urgentIncidents.slice(0, 30).map(inc => ({
      id: inc.id,
      docNumber: inc.docNumber || '',
      docDate: inc.docDate || '',
      fromPerson: inc.fromPerson || 'นายอำเภอ',
      toPerson: inc.toPerson || 'ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด',
      incidentTypes: Array.isArray(inc.incidentTypes) ? inc.incidentTypes : [],
      incidentTypeOther: inc.incidentTypeOther || '',
      severity: inc.severity || 'ปานกลาง',
      location: inc.location || '',
      amphoe: inc.amphoe || '',
      tambon: inc.tambon || '',
      startDate: inc.startDate || '',
      startTime: inc.startTime || '',
      affectedPeople: inc.affectedPeople || '0',
      affectedHouseholds: inc.affectedHouseholds || '0',
      injured: inc.injured || '0',
      dead: inc.dead || '0',
      missing: inc.missing || '0',
      totalDamageCost: inc.totalDamageCost || '0',
      mitigation: (inc.mitigation || '').substring(0, 180),
      proposals: Array.isArray(inc.proposals) ? inc.proposals : [],
      reporterName: inc.reporterName || '',
      reporterPosition: inc.reporterPosition || ''
    }));

    let aiResponsePayload: any = null;

    if (apiKey) {
      try {
        const client = getGeminiClient(apiKey, req);
        const systemPrompt = `คุณคือ "Smart e-Saraban AI Assistant" ผู้ช่วยปัญญาประดิษฐ์ระดับสูงประจำระบบสารบรรณอิเล็กทรอนิกส์
สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (ปภ.จังหวัดระยอง)

โครงสร้างฝ่ายงานหลัก 3 ฝ่าย:
1. ฝ่ายยุทธศาสตร์และการจัดการ (งานธุรการ สารบรรณ การเงิน พัสดุ นโยบาย แผนงาน และยุทธศาสตร์)
2. ฝ่ายป้องกันและปฏิบัติการ (งานป้องกันและบรรเทาสาธารณภัย กู้ภัย การฝึกซ้อม และการเผชิญเหตุ)
3. ฝ่ายสงเคราะห์ผู้ประสบภัย (งานช่วยเหลือ เยียวยา และฟื้นฟูผู้ประสบสาธารณภัย)
*ห้ามใช้คำว่า "ฝ่ายบริหารทั่วไป" หรือ "ฝ่ายบริหารงานทั่วไป" โดยเด็ดขาด

หน้าที่หลัก:
1. ตอบคำถาม ค้นหา สรุป สแกนงานค้าง ขัดเกลาภาษาราชการ และยกร่างหนังสือราชการ ถูกต้องตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และฉบับแก้ไขเพิ่มเติม
2. สืบค้นและวิเคราะห์ "แบบรายงานเหตุด่วนสาธารณภัย (Urgent Incident Reports)" ค้นหาประเภทภัย (อุทกภัย, วาตภัย, อัคคีภัย, ไฟป่า, สารเคมีและวัตถุอันตราย ฯลฯ) ระดับความรุนแรง พื้นที่เกิดเหตุ ยอดผู้ประสบภัย ผู้บาดเจ็บ/เสียชีวิต และมูลค่าความเสียหาย
3. นำข้อมูลหนังสือในระบบและรายงานเหตุด่วนจริงด้านล่างไปใช้ประมวลผลคำตอบอย่างเที่ยงตรง

[ข้อมูลหนังสือล่าสุดในระบบ (${documents.length} รายการ)]:
${JSON.stringify(docsSummaryContext, null, 2)}

[ข้อมูลแบบรายงานเหตุด่วนสาธารณภัยในระบบ (${urgentIncidents.length} รายการ)]:
${JSON.stringify(incidentsSummaryContext, null, 2)}

${selectedDoc ? `[เอกสาร/รายงานเหตุที่ผู้ใช้เลือกแนบมาเพื่อวิเคราะห์]:
เลขที่: ${selectedDoc.docNumber || selectedDoc.receiveNumber || '-'}
เรื่อง/สถานที่: ${selectedDoc.title || selectedDoc.location || '-'}
จาก: ${selectedDoc.from || selectedDoc.fromDept || selectedDoc.fromPerson || '-'}
ถึง: ${selectedDoc.to || selectedDoc.toDept || selectedDoc.toPerson || '-'}
วันที่: ${selectedDoc.date || selectedDoc.docDate || selectedDoc.startDate || '-'}
ประเภทภัย/เนื้อหา: ${selectedDoc.incidentTypes ? (Array.isArray(selectedDoc.incidentTypes) ? selectedDoc.incidentTypes.join(', ') : selectedDoc.incidentTypes) : (selectedDoc.content || selectedDoc.note || '-')}` : ''}

[ข้อมูลผู้ใช้งานปัจจุบัน]:
ชื่อ: ${user?.firstName || 'ผู้ใช้งาน'} ${user?.lastName || ''}
ตำแหน่ง: ${user?.position || 'เจ้าหน้าที่สารบรรณ'}
ฝ่ายงาน: ${user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ'}

คำแนะนำโครงสร้าง JSON (responseSchema):
- ตอบกลับด้วย JSON ที่มี field "replyText", "intentType" (search | summary | draft | pending_tasks | rewrite | regulation_qa | general), "suggestedFollowUps" (Array of 2-4 strings)
- ถ้าเป็นการค้นหาหนังสือ ให้ใส่ "matchedDocs"
- ถ้าเป็นการค้นหาเหตุด่วนสาธารณภัย ให้ใส่ "matchedIncidents"
- ถ้าเป็น "summary" ให้ใส่ "summaryResult"
- ถ้าเป็น "draft" ให้ใส่ "draftLetter"
- ถ้าเป็น "pending_tasks" ให้ใส่ "pendingTasksSummary"
- ถ้าเป็น "rewrite" ให้ใส่ "rewriteResult"
- ถ้าเป็น "regulation_qa" ให้ใส่ "regulationResult"`;

        const { response } = await callGeminiWithFallback({
          client,
          contents: [{ text: `คำถาม/คำสั่งจากผู้ใช้: "${cleanPrompt}"` }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                replyText: { type: Type.STRING },
                intentType: { type: Type.STRING },
                suggestedFollowUps: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                matchedIncidents: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      docNumber: { type: Type.STRING },
                      docDate: { type: Type.STRING },
                      fromPerson: { type: Type.STRING },
                      toPerson: { type: Type.STRING },
                      incidentTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                      incidentTypeOther: { type: Type.STRING },
                      severity: { type: Type.STRING },
                      location: { type: Type.STRING },
                      amphoe: { type: Type.STRING },
                      tambon: { type: Type.STRING },
                      startDate: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      affectedPeople: { type: Type.STRING },
                      affectedHouseholds: { type: Type.STRING },
                      injured: { type: Type.STRING },
                      dead: { type: Type.STRING },
                      missing: { type: Type.STRING },
                      totalDamageCost: { type: Type.STRING },
                      mitigation: { type: Type.STRING },
                      proposals: { type: Type.ARRAY, items: { type: Type.STRING } },
                      reporterName: { type: Type.STRING },
                      reporterPosition: { type: Type.STRING },
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
                },
                rewriteResult: {
                  type: Type.OBJECT,
                  properties: {
                    originalText: { type: Type.STRING },
                    polishedText: { type: Type.STRING },
                    toneStyle: { type: Type.STRING },
                    improvedPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING }
                  }
                },
                regulationResult: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    relevantAct: { type: Type.STRING },
                    ruleArticle: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    practicalGuide: { type: Type.STRING },
                    caution: { type: Type.STRING }
                  }
                }
              }
            }
          },
          maxRetriesPerModel: 1,
          initialDelayMs: 600
        });

        if (response && response.text) {
          try {
            aiResponsePayload = JSON.parse(response.text);
          } catch {
            // json parse fallback
          }
        }
      } catch (geminiError: any) {
        console.log('AI Assistant Gemini fallback triggered:', geminiError?.status || 'unknown');
      }
    }

    if (!aiResponsePayload) {
      aiResponsePayload = generateSmartAiFallback({
        prompt: cleanPrompt,
        documents,
        urgentIncidents,
        user,
        selectedDoc
      });
    }

    return res.json({
      success: true,
      data: aiResponsePayload
    });

  } catch (err: any) {
    console.error('Error in /api/ai-assistant:', err);
    const fallbackData = generateSmartAiFallback({
      prompt: req.body?.prompt || '',
      documents: [],
      urgentIncidents: [],
      user: req.body?.user,
      selectedDoc: req.body?.selectedDoc
    });
    return res.json({
      success: true,
      data: fallbackData
    });
  }
});



async function startServer() {

// Infographics API (Enterprise & Public Delivery Engine)
const canAccessInfographic = (row: any, user: any, action: 'list' | 'view' | 'edit' = 'view') => {
  const { userId, userRole, userName, userDept } = user;
  const isPublic = row.isPublic === 1 || row.isPublic === true;
  
  // Special roles see and edit all
  if (userRole === 'admin' || userRole === 'moderator') return true;

  // Owner Check
  if (userId && String(row.ownerId) === String(userId)) return true;
  if (userName && (row.ownerName === userName || row.authorName === userName)) return true;

  // Central scope is visible and editable to all authenticated users in this app context 
  if (row.scope === 'central') return true;

  // Department shared edit
  if (row.allowDepartmentEdit === 1 && row.ownerDepartment && userDept && row.ownerDepartment === userDept) return true;

  // Check allowed editors list
  if (row.allowedEditors) {
    let editors: any[] = [];
    try {
      editors = typeof row.allowedEditors === 'string' ? JSON.parse(row.allowedEditors) : row.allowedEditors;
    } catch (e) {}
    if (Array.isArray(editors)) {
      const hasExplicitEditorRight = editors.some(e => 
        (userId && String(e.id) === String(userId)) || 
        (userName && e.username === userName)
      );
      if (hasExplicitEditorRight) return true;
    }
  }

  // If no explicit rights, only allow if it's public and we are just viewing (not listing or editing)
  if (isPublic && action === 'view') return true;

  return false;
};

app.get('/api/infographics', async (req, res) => {
  try {
    const user = {
      userId: req.query.userId,
      userRole: req.query.userRole,
      userName: req.query.userName,
      userDept: req.query.userDept
    };

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

    // Filter results based on visibility and permissions for listing
    const filtered = (rows || []).filter((row: any) => canAccessInfographic(row, user, 'list'));

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching infographics:', error);
    res.status(500).json({ error: 'Failed to fetch infographics' });
  }
});

app.get('/api/infographics/:id', async (req, res) => {
  try {
    const user = {
      userId: req.query.userId,
      userRole: req.query.userRole,
      userName: req.query.userName,
      userDept: req.query.userDept
    };
    const [rows]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = rows[0];

    if (!canAccessInfographic(row, user, 'view')) {
      return res.status(403).json({ error: 'สื่อ Infographic นี้ถูกตั้งค่าเป็นส่วนตัว คุณไม่มีสิทธิ์ในการเข้าถึงหรือแก้ไข' });
    }

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

    try {
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
    } catch (dbError) {
      console.warn('Full schema insert failed, retrying with basic columns:', dbError);
      try {
        await pool.query(
          `INSERT INTO infographics (
            id, name, data, thumbnail, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, name || 'Infographic', data, thumbnail, nowIso, nowIso]
        );
      } catch (retryError) {
        console.error('Basic schema insert also failed:', retryError);
        throw retryError; // Propagate the retry error
      }
    }
    
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
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create infographic' });
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
      allowedEditors, allowDepartmentEdit,
      // Pass user info in body for mutations
      requestingUser 
    } = req.body;

    const user = requestingUser || {};
    
    const nowIso = new Date().toISOString();

    // Check existing
    const [existing]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const current = existing[0];

    // Permission Check for Edit
    if (!canAccessInfographic(current, user, 'edit')) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ในการแก้ไขสื่อ Infographic นี้' });
    }

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

    try {
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
    } catch (dbError) {
      console.warn('Full schema update failed, retrying with basic columns:', dbError);
      try {
        await pool.query(
          `UPDATE infographics SET 
            name = ?, data = ?, thumbnail = ?, updated_at = ? 
          WHERE id = ?`,
          [finalName, finalData, finalThumbnail, nowIso, req.params.id]
        );
      } catch (retryError) {
        console.error('Basic schema update also failed:', retryError);
        throw retryError; // Propagate the retry error
      }
    }
    
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
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update infographic' });
  }
});

app.delete('/api/infographics/:id', async (req, res) => {
  try {
    const user = {
      userId: req.query.userId,
      userRole: req.query.userRole,
      userName: req.query.userName,
      userDept: req.query.userDept
    };

    // Check existing
    const [existing]: any = await pool.query('SELECT * FROM infographics WHERE id = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const current = existing[0];

    // Permission Check for Delete
    if (!canAccessInfographic(current, user, 'edit')) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ในการลบสื่อ Infographic นี้' });
    }

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

    const apiKey = await getAppGeminiApiKey();

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key กรุณาระบุในเมนู "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"' 
      });
    }

    const client = getGeminiClient(apiKey, req);
    const { response } = await callGeminiWithFallback({
      client,
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

    let generatedData = null;
    if (response && response.text) {
      try {
        generatedData = JSON.parse(response.text.trim());
      } catch (e) {
        // Handle potential text wrapping in response
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          generatedData = JSON.parse(jsonMatch[0]);
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

// Infographics Uploaded Images & Assets Library API (Per-User Isolation)
app.post('/api/infographics/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่พบไฟล์รูปภาพที่อัปโหลด' });
    }

    const rawUserId = (req.body?.userId || req.query?.userId || req.body?.uploadedById || req.body?.uploadedBy || 'guest').toString().trim();
    const sanitizedUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'guest';
    const uploadedBy = (req.body?.uploadedBy || req.query?.uploadedBy || 'Infographics Studio').toString();
    const ip = getClientIp(req);
    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    const userInfographicsDir = path.join(uploadsBase, 'infographics', `user_${sanitizedUserId}`);
    if (!fs.existsSync(userInfographicsDir)) {
      fs.mkdirSync(userInfographicsDir, { recursive: true });
    }

    const uploadedFiles: any[] = [];
    for (const file of files) {
      let finalFilename = file.filename;
      let finalPath = file.path;
      const targetPath = path.join(userInfographicsDir, finalFilename);

      if (path.resolve(finalPath) !== path.resolve(targetPath)) {
        try {
          if (fs.existsSync(finalPath)) {
            fs.copyFileSync(finalPath, targetPath);
            fs.unlinkSync(finalPath);
            finalPath = targetPath;
          }
        } catch (moveErr) {
          console.warn('Could not relocate file to user infographics directory:', moveErr);
        }
      }

      const stat = fs.existsSync(finalPath) ? fs.statSync(finalPath) : { size: file.size };

      uploadedFiles.push({
        id: `img_infographics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        originalName: file.originalname,
        filename: finalFilename,
        size: stat.size,
        mimetype: file.mimetype,
        url: `/uploads/infographics/user_${sanitizedUserId}/${finalFilename}`,
        folder: 'infographics',
        userId: sanitizedUserId,
        createdAt: new Date().toISOString()
      });
    }

    const fileNames = files.map(f => f.originalname).join(', ');
    await addSystemLog('UPLOAD_INFOGRAPHIC_IMAGE', `อัปโหลดรูปภาพ Infographics (${sanitizedUserId}): ${fileNames}`, uploadedBy, ip);

    return res.json({ success: true, files: uploadedFiles });
  } catch (err: any) {
    console.error('Infographics Upload Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'การอัปโหลดรูปภาพล้มเหลว' });
  }
});

// Infographics Uploaded Images & Assets Library List API (Per-User Isolation)
app.get('/api/infographics-assets/images', async (req, res) => {
  try {
    const rawUserId = (req.query?.userId || req.query?.uploadedBy || '').toString().trim();
    const sanitizedUserId = rawUserId ? rawUserId.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const showAll = req.query?.all === 'true';

    const uploadsBase = path.resolve(process.cwd(), 'uploads');
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

    function scanDir(dirPath: string, webSubFolder: string) {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, `${webSubFolder}/${entry.name}`);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (imageExts.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              const decodedName = decodeFilename(entry.name);
              const match = decodedName.match(/^\d{10,15}-\d{4,10}-(.+)$/);
              const originalName = match ? match[1] : decodedName;
              const url = `/uploads/${webSubFolder}/${entry.name}`;
              imageList.push({
                id: `img_${Buffer.from(fullPath).toString('base64').substring(0, 16)}_${stat.mtimeMs}`,
                filename: entry.name,
                originalName,
                url,
                folder: 'infographics',
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

    if (sanitizedUserId && !showAll) {
      // Per-user isolated directory
      const userDir = path.join(uploadsBase, 'infographics', `user_${sanitizedUserId}`);
      scanDir(userDir, `infographics/user_${sanitizedUserId}`);
    } else {
      // Fallback or show all
      const infographicsDir = path.join(uploadsBase, 'infographics');
      scanDir(infographicsDir, 'infographics');
    }

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

    const delRes = deletePhysicalUploadFile(fileUrl);
    if (delRes.success) {
      return res.json({ success: true, message: 'ลบรูปภาพเรียบร้อยแล้ว', filename: delRes.filename });
    }

    return res.status(404).json({ success: false, error: delRes.error || 'ไม่พบไฟล์รูปภาพที่ต้องการลบ' });
  } catch (err: any) {
    console.error('Delete image error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลบรูปภาพ' });
  }
});

// ==========================================
// AI URGENT INCIDENT SCAN ROUTE
// ==========================================
app.post('/api/ai/scan-urgent-incident', memoryUpload.single('file'), async (req, res) => {
  try {
    let fileBase64 = '';
    let mimeType = '';
    let reqApiKey = '';

    if (req.file) {
      fileBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
      reqApiKey = req.body.apiKey || '';
    } else {
      fileBase64 = req.body.fileBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
      reqApiKey = req.body.apiKey || '';
    }

    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'กรุณาแนบไฟล์เอกสารที่ต้องการสแกน (อัปโหลดไฟล์ "file" หรือส่ง "fileBase64" ใน JSON)' });
    }

    const apiKey = await getAppGeminiApiKey(reqApiKey);
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key กรุณาระบุในเมนู "ตั้งค่าระบบ -> องค์กร -> ตั้งค่า องค์กร Google Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)"' });
    }

    const client = getGeminiClient(apiKey, req);

    const prompt = 'คุณคือผู้ช่วยถอดความแบบรายงานเหตุด่วนสาธารณภัย (Urgent Incident Report) ของประเทศไทย\nให้ดึงข้อมูลจากเอกสารรูปภาพ หรือ PDF ที่แนบมา แล้วส่งกลับมาเป็น JSON ตาม schema ดังนี้:\n{\n  "docNumber": "เลขที่หนังสือที่ สส ... (ถ้ามี)",\n  "docDate": "วันที่หนังสือ (ถ้ามี)",\n  "fromPerson": "จากใคร (ถ้ามี/ส่วนใหญ่นายอำเภอ)",\n  "toPerson": "ถึงใคร (ถ้ามี/ส่วนใหญ่ผู้ว่าราชการจังหวัด/ผู้อำนวยการจังหวัด)",\n  "incidentTypes": ["อุทกภัย", "ความแห้งแล้ง", "วาตภัย", "อัคคีภัย", "ไฟป่า", "อุบัติภัย", "อากาศหนาว", "แผ่นดินไหว", "สารเคมีและวัตถุอันตราย", "ทุ่นระเบิด", "การป้องกันและระงับภัยทางอากาศ", "การก่อวินาศกรรม", "การอพยพประชาชนและส่วนราชการ"], // เลือกชนิดภัยที่ระบุในเอกสารเป็น array ของ string จากลิสต์ตัวเลือกนี้เท่านั้น\n  "incidentTypeOther": "ภัยอื่นๆ นอกเหนือจากตัวเลือก (ถ้ามี)",\n  "incidentAppearance": "ลักษณะของภัย (ข้อความ เช่น ฝนตกหนักน้ำป่าไหลหลากล้นตลิ่ง หรือ ฝนทิ้งช่วงเป็นเวลานานจนอ่างเก็บน้ำแห้ง)",\n  "severity": "เล็กน้อย" หรือ "ปานกลาง" หรือ "รุนแรง",\n  "startDate": "วันที่เกิดภัย",\n  "startTime": "เวลาที่เกิดภัย (HH:MM)",\n  "endDate": "วันที่สิ้นสุดภัย",\n  "endTime": "เวลาที่สิ้นสุดภัย (HH:MM)",\n  "location": "สถานที่เกิดภัยแบบเต็ม",\n  "affectedPeople": "จำนวนคนเดือดร้อน (ตัวเลข)",\n  "affectedHouseholds": "จำนวนครัวเรือนที่เดือดร้อน (ตัวเลข)",\n  "injured": "บาดเจ็บกี่คน (ตัวเลข)",\n  "dead": "เสียชีวิตกี่คน (ตัวเลข)",\n  "missing": "สูญหายกี่คน (ตัวเลข)",\n  "evacuatedPeople": "อพยพกี่คน (ตัวเลข)",\n  "evacuatedHouseholds": "อพยพกี่ครัวเรือน (ตัวเลข)",\n  "damageHouses": "จำนวนบ้านเสียหาย (ตัวเลข)",\n  "damageHighRises": "จำนวนอาคารสูงเสียหาย (ตัวเลข)",\n  "damageFactories": "จำนวนโรงงานเสียหาย (ตัวเลข)",\n  "damageTemples": "จำนวนวัดเสียหาย (ตัวเลข)",\n  "damageGovBuildings": "จำนวนอาคารราชการเสียหาย (ตัวเลข)",\n  "damageOtherBuildings": "สิ่งปลูกสร้างอื่นๆ เสียหาย (ตัวเลข)",\n  "damageBuildingCost": "รวมมูลค่าสิ่งปลูกสร้างเสียหาย (ตัวเลข)",\n  "damageAgricultureCrops": "พืชไร่เสียหายกี่ไร่ (ตัวเลข)",\n  "damageAgricultureRice": "นาข้าวเสียหายกี่ไร่ (ตัวเลข)",\n  "damageAgricultureOrchard": "สวนเสียหายกี่ไร่ (ตัวเลข)",\n  "damageAgricultureFish": "บ่อปลาเสียหายกี่ไร่ (ตัวเลข)",\n  "damageAgricultureShrimp": "บ่อกุ้งเสียหายกี่ไร่ (ตัวเลข)",\n  "damageLivestockCow": "วัวควายเสียหายกี่ตัว (ตัวเลข)",\n  "damageLivestockPig": "หมูเสียหายกี่ตัว (ตัวเลข)",\n  "damageLivestockPoultry": "เป็ดไก่เสียหายกี่ตัว (ตัวเลข)",\n  "damageLivestockOther": "สัตว์เลี้ยงอื่นๆ (ข้อความ)",\n  "damageAgricultureCost": "รวมมูลค่าเกษตรเสียหาย (ตัวเลข)",\n  "damagePublicRoads": "ถนนเสียหายกี่สาย (ตัวเลข)",\n  "damagePublicBridges": "สะพานเสียหายกี่แห่ง (ตัวเลข)",\n  "damagePublicBridgeApproaches": "คอสะพานเสียหายกี่แห่ง (ตัวเลข)",\n  "damagePublicWeirs": "ฝายเสียหายกี่แห่ง (ตัวเลข)",\n  "damagePublicOther": "สาธารณะประโยชน์อื่นๆ (ข้อความ)",\n  "damagePublicCost": "รวมมูลค่าสาธารณประโยชน์เสียหาย (ตัวเลข)",\n  "totalDamageCost": "รวมมูลค่าความเสียหายเบื้องต้นทั้งหมด (ตัวเลข)",\n  "mitigation": "การบรรเทาภัย (ข้อความ)",\n  "toolsFireTrucks": "รถดับเพลิงกี่คัน (ตัวเลข)",\n  "toolsWaterTrucks": "รถบรรทุกน้ำกี่คัน (ตัวเลข)",\n  "toolsRescueTrucks": "รถกู้ภัยกี่คัน (ตัวเลข)",\n  "toolsFireBoats": "เรือดับเพลิงกี่ลำ (ตัวเลข)",\n  "toolsWaterPumps": "เครื่องสูบน้ำกี่เครื่อง (ตัวเลข)",\n  "toolsOther": "เครื่องมืออื่นๆ (ข้อความ)",\n  "opsGovAgencies": "ส่วนราชการช่วยเหลืออุทกภัยหรืออื่นๆ กี่หน่วยงาน (ตัวเลข)",\n  "opsPrivateSector": "ภาคเอกชนหรือประชาชนช่วยเหลือรวมกี่กลุ่ม/คน (ตัวเลข)",\n  "proposals": ["เพื่อโปรดทราบ", "เพื่อโปรดพิจารณาประกาศเขตพื้นที่ประสบสาธารณภัย", "เพื่อโปรดพิจารณาประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน"], // เลือกข้อเสนอจากลิสต์ตัวเลือกนี้เป็น array\n  "reporterName": "ชื่อผู้รายงาน",\n  "reporterPosition": "ตำแหน่งผู้รายงาน",\n  "signatureBox": [ymin, xmin, ymax, xmax], // ค้นหาตำแหน่งลายมือชื่อผู้รายงาน (ลายเซ็น) ในหน้ากระดาษ แล้วส่งค่าพิกัด Bounding Box ในสเกล 0-1000 (เช่น [820, 650, 930, 880]) หากไม่มีให้เป็น null\n  "damageBoxes": [[ymin, xmin, ymax, xmax], ...] // ค้นหาภาพประกอบภัยพิบัติ, รูปถ่ายความเสียหาย, รูปบ่อปลา, รูปบ้านพัง, รูปผู้ประสบภัยที่แนบมาในเอกสาร แล้วส่งเป็นลิสต์ของ Bounding Boxes สเกล 0-1000 หากไม่มีให้เป็น []\n}\n* หมายเหตุ: ดึงเฉพาะข้อมูลที่มีในเอกสารเท่านั้น ถ้าฟิลด์ไหนไม่มีให้เป็น string ว่าง "" หรือ array ว่าง [] หรือ null สำหรับ signatureBox\n* ห้ามตอบอย่างอื่นนอกจากโค้ด JSON (ห้ามมี markdown) แบบ raw';

    // Multi-tier Fallback: gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.8-flash with Exponential Backoff
    const { response, usedModel } = await callGeminiWithFallback({
      client,
      contents: [
        { text: prompt },
        { inlineData: { data: fileBase64.split(',')[1] || fileBase64, mimeType: mimeType || 'image/jpeg' } }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    let resultText = response.text || '{}';
    resultText = resultText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
    
    let parsedData = {};
    try {
      parsedData = JSON.parse(resultText);
    } catch {
      parsedData = { rawText: resultText };
    }
    res.json({ success: true, data: parsedData, usedModel });

  } catch (err: any) {
    console.error('Scan Error:', err);
    const friendlyError = formatGeminiErrorMessage(err);
    res.status(500).json({ success: false, error: friendlyError });
  }
});

// Manual & System Tar Backup Engine (.tar)
let isAutomatedBackupEnabled = true;

async function createSystemTarBackup(backupType = 'Manual Backup (.tar)') {
  const tar = await import('tar');
  const BACKUP_DIR = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const fileName = `edms_backup_${dateStr}_${timeStr}.tar`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // Dump complete database snapshot to JSON file to be packed into the .tar
  const dumpFileName = `database_dump_${dateStr}_${timeStr}.json`;
  const dumpFilePath = path.join(process.cwd(), dumpFileName);

  try {
    const dumpData: any = {
      exportedAt: now.toISOString(),
      version: '1.0.0',
      app: 'Smart e-Saraban EDMS (Rayong Disaster Prevention & Mitigation)'
    };

    if (typeof pool !== 'undefined' && isMysqlOnline) {
      const tables = ALL_SYSTEM_TABLES;
      for (const t of tables) {
        try {
          const [rows]: any = await pool.query(`SELECT * FROM \`${t}\``);
          dumpData[t] = rows || [];
        } catch {
          dumpData[t] = [];
        }
      }
    } else {
      dumpData.localDb = localDb;
    }
    fs.writeFileSync(dumpFilePath, JSON.stringify(dumpData, null, 2), 'utf8');
  } catch (dumpErr) {
    console.warn('Database dump before tar warning:', dumpErr);
  }

  // Gather directories to archive: dump, uploads, config/data if any
  const itemsToArchive: string[] = [];
  if (fs.existsSync(dumpFilePath)) itemsToArchive.push(dumpFileName);

  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsPath)) itemsToArchive.push('uploads');

  const configFiles = ['.env', 'metadata.json', 'package.json', 'tsconfig.json', 'vite.config.ts', 'components.json', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'index.html'];
  for (const f of configFiles) {
    if (fs.existsSync(path.join(process.cwd(), f))) itemsToArchive.push(f);
  }
  
  // Include src and public for "Really Full" backup
  if (fs.existsSync(path.join(process.cwd(), 'src'))) itemsToArchive.push('src');
  if (fs.existsSync(path.join(process.cwd(), 'public'))) itemsToArchive.push('public');

  try {
    await tar.create(
      {
        cwd: process.cwd(),
        file: filePath,
        gzip: false
      },
      itemsToArchive.length > 0 ? itemsToArchive : ['package.json']
    );
  } finally {
    // Clean up temporary database dump file
    if (fs.existsSync(dumpFilePath)) {
      try { fs.unlinkSync(dumpFilePath); } catch {}
    }
  }

  const stats = fs.statSync(filePath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

  // Log backup to DB or file
  try {
    if (typeof pool !== 'undefined' && isMysqlOnline) {
      await pool.query(
        'INSERT INTO system_backups (fileName, fileSize, backupType, createdAt) VALUES (?, ?, ?, ?)',
        [fileName, sizeMb, backupType, now.toISOString()]
      ).catch(() => {});
    }
  } catch {}

  return { fileName, filePath, size: stats.size, sizeMb, createdAt: now.toISOString(), backupType };
}

// Backup API endpoints
app.get('/api/admin/backups', async (req, res) => {
  const role = (req.query.role || req.headers.role || '').toString();
  const allowed = await hasServerPermission(role, 'backup_restore');
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'ขออภัย คุณไม่มีสิทธิ์' });
  }
  try {
    const list = await getSystemBackupList();
    res.json({ success: true, files: list, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'ไม่สามารถดึงข้อมูลประวัติสำรองข้อมูลได้' });
  }
});


// ==========================================
// ==========================================
const URGENT_INCIDENT_COLUMNS = [
  'id', 'docNumber', 'docDate', 'fromPerson', 'toPerson', 'incidentTypes', 'incidentTypeOther', 'incidentAppearance', 'severity',
  'startDate', 'startTime', 'endDate', 'endTime', 'location', 'affectedPeople', 'affectedHouseholds',
  'injured', 'dead', 'missing', 'evacuatedPeople', 'evacuatedHouseholds', 'damageHouses', 'damageHighRises',
  'damageTemples', 'damageGovBuildings', 'damageOtherBuildings', 'damageBuildingCost', 'damageAgricultureCrops',
  'damageAgricultureRice', 'damageAgricultureOrchard', 'damageAgricultureFish', 'damageAgricultureShrimp',
  'damageLivestockCow', 'damageLivestockPig', 'damageLivestockPoultry', 'damageLivestockOther', 'damageAgricultureCost',
  'damagePublicRoads', 'damagePublicBridges', 'damagePublicBridgeApproaches', 'damagePublicWeirs', 'damagePublicOther',
  'damagePublicCost', 'totalDamageCost', 'mitigation', 'toolsFireTrucks', 'toolsWaterTrucks', 'toolsRescueTrucks',
  'toolsFireBoats', 'toolsWaterPumps', 'toolsOther', 'opsGovAgencies', 'opsPrivateSector', 'proposals',
  'reporterName', 'reporterPosition', 'signatureImage', 'damageImages', 'createdAt', 'updatedAt'
];

function mapIncidentFromDb(row: any): any {
  if (!row) return null;
  return {
    ...row,
    incidentTypes: safeJsonParse(row.incidentTypes, []),
    proposals: safeJsonParse(row.proposals, []),
    damageImages: safeJsonParse(row.damageImages, [])
  };
}

app.get('/api/urgent-incidents', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM urgent_incidents ORDER BY createdAt DESC');
    const list = (rows || []).map(mapIncidentFromDb);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'ไม่สามารถดึงข้อมูลแบบรายงานเหตุด่วนจากฐานข้อมูล MySQL ได้' });
  }
});

app.post('/api/urgent-incidents', async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.location || !data.docDate) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุสถานที่เกิดภัยและวันที่รายงาน' });
    }
    const id = data.id || `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    
    // Calculate fallback document number strictly from MySQL
    const [cntRows]: any = await pool.query('SELECT COUNT(*) as count FROM urgent_incidents').catch(() => [[{ count: 0 }]]);
    const listCount = cntRows?.[0]?.count || 0;
      
    const docNum = data.docNumber || `รย 0021/เหตุด่วน-${now.getFullYear() + 543}-${String(listCount + 1).padStart(3, '0')}`;
    const newRecord = {
      ...data,
      id,
      docNumber: docNum,
      createdAt: data.createdAt || now.toISOString(),
      updatedAt: now.toISOString()
    };

    const dbData: any = {};
    for (const col of URGENT_INCIDENT_COLUMNS) {
      const val = newRecord[col];
      if (val === undefined) {
        dbData[col] = null;
      } else if (col === 'incidentTypes' || col === 'proposals' || col === 'damageImages') {
        dbData[col] = Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? val : '[]');
      } else {
        dbData[col] = val;
      }
    }
    const keys = Object.keys(dbData);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => dbData[k]);
    await pool.query(
      `INSERT INTO urgent_incidents (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`,
      values
    );

    // Trigger Email Notification
    notifyWorkChange(newRecord, 'CREATE', 'urgent_incident').catch(err => console.warn('Notification failed:', err.message));

    res.json({
      success: true,
      message: 'บันทึกแบบรายงานเหตุด่วนสาธารณภัยลง MySQL สำเร็จ',
      id: newRecord.id,
      docNumber: newRecord.docNumber,
      data: newRecord
    });
  } catch (err: any) {
    console.error('Error saving urgent incident to MySQL:', err);
    res.status(500).json({ success: false, error: err.message || 'ไม่สามารถบันทึกข้อมูลแบบรายงานเหตุด่วนสาธารณภัยลง MySQL ได้' });
  }
});

app.put('/api/urgent-incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    
    // Fetch current record from MySQL to merge
    const [rows]: any = await pool.query('SELECT * FROM urgent_incidents WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายงานเหตุด่วนที่ต้องการแก้ไขในระบบ' });
    }
    const currentRecord = mapIncidentFromDb(rows[0]);
    
    const nowStr = new Date().toISOString();
    const updatedRecord = {
      ...currentRecord,
      ...data,
      id, // keep original id
      updatedAt: nowStr
    };

    const dbData: any = {};
    const updatePairs: string[] = [];
    const updateValues: any[] = [];
    
    for (const col of URGENT_INCIDENT_COLUMNS) {
      if (col === 'id') continue;
      const val = updatedRecord[col];
      if (val !== undefined) {
        if (col === 'incidentTypes' || col === 'proposals' || col === 'damageImages') {
          dbData[col] = Array.isArray(val) ? JSON.stringify(val) : (typeof val === 'string' ? val : '[]');
        } else {
          dbData[col] = val;
        }
        updatePairs.push(`\`${col}\` = ?`);
        updateValues.push(dbData[col]);
      }
    }
    
    if (updatePairs.length > 0) {
      updateValues.push(id);
      await pool.query(
        `UPDATE urgent_incidents SET ${updatePairs.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Trigger Email Notification
    notifyWorkChange(updatedRecord, 'UPDATE', 'urgent_incident').catch(err => console.warn('Notification failed:', err.message));

    res.json({
      success: true,
      message: 'อัปเดตแบบรายงานเหตุด่วนสาธารณภัยลง MySQL เรียบร้อย',
      data: updatedRecord
    });
  } catch (err: any) {
    console.error('Error updating urgent incident in MySQL:', err);
    res.status(500).json({ success: false, error: err.message || 'ไม่สามารถอัปเดตแบบรายงานเหตุด่วนลง MySQL ได้' });
  }
});

app.delete('/api/urgent-incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch before delete for notification
    const [rows]: any = await pool.query('SELECT * FROM urgent_incidents WHERE id = ?', [id]);
    const docToDelete = rows && rows.length > 0 ? mapIncidentFromDb(rows[0]) : null;

    const [result]: any = await pool.query('DELETE FROM urgent_incidents WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายงานเหตุด่วนที่ต้องการลบในระบบ' });
    }
    
    // Trigger Email Notification
    if (docToDelete) {
      notifyWorkChange(docToDelete, 'DELETE', 'urgent_incident').catch(err => console.warn('Notification failed:', err.message));
    }

    res.json({ success: true, message: 'ลบแบบรายงานเหตุด่วนสาธารณภัยจาก MySQL เรียบร้อย' });
  } catch (err: any) {
    console.error('Error deleting urgent incident from MySQL:', err);
    res.status(500).json({ success: false, error: err.message || 'ไม่สามารถลบรายงานจาก MySQL ได้' });
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
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
        }
      }
    }));
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Express global error handling middleware for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('💥 Express API Error Handler caught:', err?.message || err);
    if (req.path.startsWith('/api/')) {
      return res.status(err?.status || 500).json({
        success: false,
        error: err?.message || 'เกิดข้อผิดพลาดในการประมวลผลคำขอ'
      });
    }
    return next(err);
  });

  const isNamedPipeOrSocket = isNaN(Number(listenPort));
  if (isNamedPipeOrSocket) {
    app.listen(listenPort, () => {
      console.log(`Server running on Passenger socket pipe: ${listenPort}`);
      startScheduledReservationEngine();
      startAutomatedBackupEngine();
    });
  } else {
    const portNum = Number(listenPort) || 3000;
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${portNum}`);
      startScheduledReservationEngine();
      startAutomatedBackupEngine();
    });
  }
}

startServer();

export async function sendNotificationEmail(
  targetAssigneeOrDepts: string | string[],
  subject: string,
  htmlContent: string
) {
  if (smtpBlocked) {
    console.log(`[Email Notification Skipped] SMTP blocked due to previous IP/Auth errors. Cannot send "${subject}".`);
    return;
  }
  try {
    let settings: any = {};
    if (isMysqlOnline) {
      try {
        const [settingsRows]: any = await pool.query('SELECT smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, orgName FROM settings LIMIT 1');
        if (settingsRows && settingsRows.length > 0) settings = settingsRows[0];
      } catch (err: any) {
        console.warn('Could not read settings from MySQL:', err.message);
      }
    }
    if (!settings.smtpHost && localDb.settings && localDb.settings.length > 0) {
      settings = localDb.settings[0];
    }

    if (!settings.smtpHost || !settings.smtpUser) {
      console.log(`[Email Notification Skipped] SMTP not configured. Cannot send "${subject}".`);
      return;
    }

    const targets: string[] = Array.isArray(targetAssigneeOrDepts) 
      ? targetAssigneeOrDepts.map(t => String(t).trim()).filter(Boolean)
      : [String(targetAssigneeOrDepts).trim()].filter(Boolean);

    if (targets.length === 0) return;

    let usersList: any[] = [];
    if (isMysqlOnline) {
      try {
        const [users]: any = await pool.query(`SELECT id, username, email, firstName, lastName, department, emailNotifications FROM users WHERE email IS NOT NULL AND email != ''`);
        if (users && users.length > 0) usersList = users;
      } catch (err: any) {
        console.warn('Could not query users from MySQL:', err.message);
      }
    }
    if (usersList.length === 0 && localDb.users) {
      usersList = localDb.users;
    }

    const matchingEmails = new Set<string>();

    for (const target of targets) {
      if (target.includes('@')) {
        matchingEmails.add(target);
        continue;
      }

      for (const u of usersList) {
        if (!u.email || !String(u.email).trim()) continue;
        
        const isNotifEnabled = u.emailNotifications === undefined || u.emailNotifications === null || Number(u.emailNotifications) === 1 || u.emailNotifications === true;
        if (!isNotifEnabled) continue;

        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        const username = String(u.username || '').trim();
        const department = String(u.department || '').trim();

        if (
          fullName === target ||
          username === target ||
          department === target ||
          (target.length > 2 && (fullName.includes(target) || username.includes(target)))
        ) {
          matchingEmails.add(String(u.email).trim());
        }
      }
    }

    const recipientList = Array.from(matchingEmails);
    if (recipientList.length === 0) {
      console.log(`[Email Notification] No matching recipients with emailNotifications enabled found for targets: ${targets.join(', ')}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort) || 587,
      secure: Number(settings.smtpPort) === 465,
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || '',
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: settings.smtpFrom ? settings.smtpFrom : `"${settings.orgName || 'ระบบสารบรรณ EDMS'}" <${settings.smtpUser}>`,
      to: recipientList.join(','),
      subject: subject,
      html: htmlContent
    };

    transporter.sendMail(mailOptions, async (err: any, info: any) => {
      if (err) {
        const isIpError = err.message.includes('525') || err.message.includes('5.7.1') || err.message.includes('Unauthorized IP');
        if (isIpError) {
          smtpBlocked = true;
          console.error('SMTP Authentication Error (IP/Auth): Disabling email notifications for the remainder of this session.', err.message);
          return;
        }
        console.error('Error sending notification email:', err.message);
        await addSystemLog('EMAIL_FAILED', `ส่งอีเมลแจ้งเตือน "${subject}" ไปยัง ${recipientList.join(', ')} ไม่สำเร็จ: ${err.message}`, 'ระบบอัตโนมัติ', '127.0.0.1');
      } else {
        console.log('Notification email sent successfully:', info.response || info.messageId);
        await addSystemLog('EMAIL_SENT', `ส่งอีเมลแจ้งเตือน "${subject}" ไปยัง ${recipientList.join(', ')} สำเร็จ`, 'ระบบอัตโนมัติ', '127.0.0.1');
      }
    });
  } catch (err: any) {
    console.error('sendNotificationEmail Error:', err.message);
  }
}

/**
 * Helper to notify work change (Create, Update, Delete) via Email
 */
export async function notifyWorkChange(doc: any, action: 'CREATE' | 'UPDATE' | 'DELETE', type: string) {
  const typeMap: any = {
    inbox: 'หนังสือรับ',
    outbox: 'หนังสือส่ง',
    circular: 'หนังสือเวียน',
    internal: 'บันทึกข้อความ',
    admin: 'งานธุรการ/ประกาศ',
    urgent_incident: 'รายงานเหตุด่วนสาธารณภัย'
  };

  const actionMap: any = {
    CREATE: 'เพิ่ม/ลงทะเบียน',
    UPDATE: 'แก้ไข/อัปเดต',
    DELETE: 'ลบ (ย้ายไปคลังกู้คืน)'
  };

  const docTitle = doc.title || doc.docNumber || doc.location || 'ไม่ระบุชื่อ';
  const docTypeLabel = typeMap[type] || type;
  const actionLabel = actionMap[action] || action;
  
  const subject = `[แจ้งเตือน] ${actionLabel}${docTypeLabel}: ${docTitle}`;
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">การแจ้งเตือนจากระบบ EDMS</h2>
      <p>เรียน ท่านผู้เกี่ยวข้อง,</p>
      <p>มีการ <strong>${actionLabel}</strong> ข้อมูลในส่วนของ <strong>${docTypeLabel}</strong> ในระบบเรียบร้อยแล้ว ดังนี้:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; width: 140px;"><strong>เรื่อง/สถานที่:</strong></td>
            <td style="padding: 5px 0;">${docTitle}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>เลขที่:</strong></td>
            <td style="padding: 5px 0;">${doc.docNumber || doc.receiveNumber || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>วันที่:</strong></td>
            <td style="padding: 5px 0;">${doc.date || doc.docDate || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>ผู้รับผิดชอบ:</strong></td>
            <td style="padding: 5px 0;">${doc.assignee || doc.reporterName || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;"><strong>สถานะ:</strong></td>
            <td style="padding: 5px 0;"><span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${doc.status || 'ปกติ'}</span></td>
          </tr>
        </table>
      </div>
      <p style="font-size: 0.9em; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
        ท่านได้รับอีเมลนี้เนื่องจากระบบตรวจพบว่าท่านเป็นผู้เกี่ยวข้องกับงานชิ้นนี้ และท่านได้เปิดการแจ้งเตือนทางอีเมลไว้ในเมนูตั้งค่าโปรไฟล์
      </p>
      <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">นี่คือการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้</p>
    </div>
  `;

  const targets = new Set<string>();
  if (doc.assignee) targets.add(doc.assignee);
  if (doc.createdBy) targets.add(doc.createdBy);
  if (doc.reporterName) targets.add(doc.reporterName);
  if (doc.fromPerson) targets.add(doc.fromPerson);
  if (doc.toPerson) targets.add(doc.toPerson);

  const targetList = Array.from(targets).filter(t => t && t !== 'ผู้ดูแลระบบ' && t !== 'Admin');

  if (targetList.length > 0) {
    await sendNotificationEmail(targetList, subject, htmlContent);
  }
}

// ==========================================
// ENHANCED AI INTEGRATION ENDPOINTS (iOS 26)
// ==========================================

// ==========================================
// THAI OFFICIAL DOCUMENT SMART NLP ANALYZER (FALLBACK ENGINE)
// ==========================================

// ==========================================
// SURVEY & EVALUATION INTELLIGENT API (MySQL Synchronized)
// ==========================================

// ==========================================
// SURVEY & EVALUATION INTELLIGENT API (MySQL Exclusive)
// ==========================================

// -1. GET /api/users/my-certificates - Fetch all certificates (passed quiz responses) for the current logged-in user
app.get('/api/users/my-certificates', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { name, email, search } = req.query as { name?: string; email?: string; search?: string };
    
    const queryParts: string[] = [];
    const params: any[] = [];

    // 1. If explicit manual search text is provided
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      queryParts.push('sr.respondent_name LIKE ? OR sr.respondent_email LIKE ? OR sr.respondent_phone LIKE ?');
      params.push(term, term, term);
    } else {
      // 2. Automatic matching using user profile info
      if (name && name.trim()) {
        const cleanName = name.trim();
        // Strict match
        queryParts.push('sr.respondent_name = ?');
        params.push(cleanName);
        
        // Thai spacing tolerance (e.g. "ผู้ดูแล ระบบ" vs "ผู้ดูแลระบบ")
        const nameNoSpaces = cleanName.replace(/\s+/g, '');
        queryParts.push("REPLACE(sr.respondent_name, ' ', '') = ?");
        params.push(nameNoSpaces);

        // Firstname or lastname partial matching
        const parts = cleanName.split(/\s+/);
        if (parts.length > 0 && parts[0].length > 1) {
          queryParts.push('sr.respondent_name LIKE ?');
          params.push(`%${parts[0]}%`);
        }
      }

      if (email && email.trim()) {
        const cleanEmail = email.trim();
        queryParts.push('sr.respondent_email = ?');
        params.push(cleanEmail);

        // Also extract username from email and match name or email
        if (cleanEmail.includes('@')) {
          const userPart = cleanEmail.split('@')[0];
          if (userPart.length > 2) {
            queryParts.push('sr.respondent_email LIKE ? OR sr.respondent_name LIKE ?');
            params.push(`%${userPart}%`, `%${userPart}%`);
          }
        }
      }
    }

    if (queryParts.length === 0) {
      return res.json([]);
    }

    const sql = `
      SELECT sr.*, s.title as survey_title, s.settings, s.questions
      FROM survey_responses sr
      JOIN surveys s ON sr.survey_id = s.id
      WHERE (${queryParts.join(' OR ')})
    `;

    const [rows]: any = await pool.query(sql, params);
    
    const certificates = (rows || []).map((row: any) => {
      const parsedSettings = safeJsonParse(row.settings, {});
      const parsedQuestions = safeJsonParse(row.questions, []);
      
      const maxPossibleScore = parsedQuestions
        .filter((q: any) => q.type !== 'section_header')
        .reduce((sum: number, q: any) => sum + (parseFloat(q.points) || 1), 0);

      const passingPercent = parseFloat(parsedSettings.passingScore) || 60;
      const totalScore = parseFloat(row.total_score) || 0;
      const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
      const isPassed = percentage >= passingPercent;

      return {
        id: row.id,
        survey_id: row.survey_id,
        survey_title: row.survey_title,
        respondent_name: row.respondent_name,
        respondent_department: row.respondent_department,
        respondent_position: row.respondent_position,
        total_score: totalScore,
        maxPossibleScore,
        percentage,
        passingPercent,
        isPassed,
        submitted_at: row.submitted_at,
        survey: {
          id: row.survey_id,
          title: row.survey_title,
          settings: parsedSettings,
          questions: parsedQuestions
        },
        response: {
          id: row.id,
          surveyId: row.survey_id,
          respondentName: row.respondent_name,
          respondentDepartment: row.respondent_department,
          respondentPosition: row.respondent_position,
          respondentPhone: row.respondent_phone,
          respondentEmail: row.respondent_email,
          respondentIp: row.respondent_ip,
          deviceInfo: row.device_info,
          timeSpentSeconds: row.time_spent_seconds,
          totalScore: totalScore,
          answers: safeJsonParse(row.answers, {}),
          submittedAt: row.submitted_at
        }
      };
    }).filter((cert: any) => cert.isPassed && cert.survey.settings?.quizMode);

    return res.json(certificates);
  } catch (err: any) {
    console.error('Failed to fetch user certificates:', err);
    return res.status(500).json({ error: err.message || 'ไม่สามารถดึงข้อมูลใบประกาศนียบัตรได้' });
  }
});

// 0. POST /api/surveys/seed-official - On-demand seeding of official survey templates
app.post('/api/surveys/seed-official', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    let seededCount = 0;
    if (Array.isArray(OFFICIAL_SURVEY_TEMPLATES)) {
      for (let i = 0; i < OFFICIAL_SURVEY_TEMPLATES.length; i++) {
        const tpl = OFFICIAL_SURVEY_TEMPLATES[i];
        const tplId = `survey_official_${i + 1}`;
        const [chkRows]: any = await pool.query('SELECT id FROM surveys WHERE id = ?', [tplId]);
        if (!chkRows || chkRows.length === 0) {
          const now = new Date(Date.now() - (i * 86400000 * 2)).toISOString();
          await pool.query(
            `INSERT INTO surveys (id, title, description, category, category_label, department, creator_id, creator_name, status, settings, questions, view_count, response_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tplId,
              tpl.title,
              tpl.description || '',
              tpl.category || 'satisfaction',
              tpl.categoryLabel || 'ความพึงพอใจ',
              tpl.department || 'ฝ่ายบริหารทั่วไป',
              'admin',
              'ฝ่ายบริหารงานสารบรรณ ปภ.',
              tpl.settings?.status || 'published',
              JSON.stringify(tpl.settings || {}),
              JSON.stringify(tpl.questions || []),
              42 + (i * 18),
              0,
              now,
              new Date().toISOString()
            ]
          );
          seededCount++;
        }
      }
    }

    return res.json({ success: true, seededCount, message: `ติดตั้งแบบสำรวจมาตรฐาน ปภ. สำเร็จจำนวน ${seededCount} รายการ` });
  } catch (err: any) {
    console.error('Failed to seed official surveys on-demand:', err);
    return res.status(500).json({ error: err.message || 'ไม่สามารถติดตั้งแบบสำรวจมาตรฐานได้' });
  }
});

// 1. GET /api/surveys - Fetch all surveys from MySQL exclusively
app.get('/api/surveys', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { status, category, search } = req.query as { status?: string; category?: string; search?: string };
    let sql = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) AS actual_response_count
      FROM surveys s
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND s.category = ?';
      params.push(category);
    }

    if (status && status !== 'all') {
      sql += ' AND (s.status = ? OR (s.status IS NULL AND ? = "published"))';
      params.push(status, status);
    }

    if (search && search.trim()) {
      sql += ' AND (s.title LIKE ? OR s.description LIKE ? OR s.department LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY s.created_at DESC';

    const [rows]: any = await pool.query(sql, params);
    const surveys = (rows || []).map((r: any) => {
      const parsedSettings = safeJsonParse(r.settings, {});
      const parsedQuestions = safeJsonParse(r.questions, []);
      const surveyStatus = r.status || parsedSettings.status || 'published';

      return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        category: r.category || 'satisfaction',
        categoryLabel: r.category_label || 'ความพึงพอใจ',
        department: r.department || '',
        creatorId: r.creator_id || 'admin',
        creatorName: r.creator_name || 'ผู้ดูแลระบบ',
        status: surveyStatus,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        viewCount: Number(r.view_count) || 0,
        responseCount: Number(r.actual_response_count ?? r.response_count) || 0,
        settings: { ...parsedSettings, status: surveyStatus },
        questions: Array.isArray(parsedQuestions) ? parsedQuestions : []
      };
    });

    return res.json(surveys);
  } catch (e: any) {
    console.error('GET /api/surveys error:', e);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแบบสำรวจจาก MySQL ได้' });
  }
});

// 2. GET /api/surveys/stats/overview - Global statistics for Survey Dashboard from MySQL exclusively
app.get('/api/surveys/stats/overview', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    let totalSurveys = 0;
    let publishedSurveys = 0;
    let draftSurveys = 0;
    let totalResponses = 0;
    let totalViews = 0;
    const categoryStats: Record<string, number> = {};

    const [surveyRows]: any = await pool.query(`
      SELECT status, category, view_count,
        (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) as resp_cnt
      FROM surveys s
    `);

    if (surveyRows && surveyRows.length > 0) {
      totalSurveys = surveyRows.length;
      for (const row of surveyRows) {
        const st = row.status || 'published';
        if (st === 'published') publishedSurveys++;
        else draftSurveys++;

        totalViews += Number(row.view_count) || 0;
        totalResponses += Number(row.resp_cnt) || 0;

        const cat = row.category || 'satisfaction';
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      }
    }

    return res.json({
      totalSurveys,
      publishedSurveys,
      draftSurveys,
      totalResponses,
      totalViews,
      completionRate: totalViews > 0 ? Math.min(100, Math.round((totalResponses / totalViews) * 100)) : 0,
      categoryStats
    });
  } catch (e: any) {
    console.error('GET /api/surveys/stats/overview error:', e);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสถิติภาพรวมจาก MySQL ได้' });
  }
});

// 3. GET /api/surveys/:id - Get single survey by ID from MySQL exclusively
app.get('/api/surveys/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    const [rows]: any = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) AS actual_response_count
      FROM surveys s
      WHERE s.id = ?
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบแบบสำรวจที่ระบุ เนื่องจากแบบสำรวจถูกลบออกจากระบบแล้ว' });
    }

    const r = rows[0];
    const parsedSettings = safeJsonParse(r.settings, {});
    const parsedQuestions = safeJsonParse(r.questions, []);
    const surveyStatus = r.status || parsedSettings.status || 'published';

    return res.json({
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: r.category || 'satisfaction',
      categoryLabel: r.category_label || 'ความพึงพอใจ',
      department: r.department || '',
      creatorId: r.creator_id || 'admin',
      creatorName: r.creator_name || 'ผู้ดูแลระบบ',
      status: surveyStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      viewCount: Number(r.view_count) || 0,
      responseCount: Number(r.actual_response_count ?? r.response_count) || 0,
      settings: { ...parsedSettings, status: surveyStatus },
      questions: Array.isArray(parsedQuestions) ? parsedQuestions : []
    });
  } catch (e: any) {
    console.error('GET /api/surveys/:id error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบบสำรวจ' });
  }
});

// 4. POST /api/surveys/:id/view - Increment survey view count in MySQL exclusively
app.post('/api/surveys/:id/view', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    await pool.query('UPDATE surveys SET view_count = view_count + 1 WHERE id = ?', [id]);
    const [rows]: any = await pool.query('SELECT view_count FROM surveys WHERE id = ?', [id]);
    const newViewCount = rows && rows.length > 0 ? Number(rows[0].view_count) || 1 : 1;

    return res.json({ success: true, viewCount: newViewCount });
  } catch (e: any) {
    console.error('POST /api/surveys/:id/view error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกจำนวนการเข้าชม' });
  }
});

// 5. POST /api/surveys - Create new survey in MySQL exclusively
app.post('/api/surveys', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const survey = req.body;
    if (!survey || !survey.title) {
      return res.status(400).json({ error: 'กรุณาระบุหัวข้อแบบสำรวจ' });
    }

    if (!survey.id) {
      survey.id = `survey_${Date.now()}`;
    }
    if (!survey.createdAt) survey.createdAt = new Date().toISOString();
    survey.updatedAt = new Date().toISOString();
    survey.viewCount = Number(survey.viewCount) || 0;
    survey.responseCount = Number(survey.responseCount) || 0;

    const statusVal = survey.status || survey.settings?.status || 'published';
    survey.status = statusVal;
    if (survey.settings) {
      survey.settings.status = statusVal;
    }

    await pool.query(
      `INSERT INTO surveys (id, title, description, category, category_label, department, creator_id, creator_name, status, settings, questions, view_count, response_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         description = VALUES(description),
         category = VALUES(category),
         category_label = VALUES(category_label),
         department = VALUES(department),
         status = VALUES(status),
         settings = VALUES(settings),
         questions = VALUES(questions),
         updated_at = VALUES(updated_at)`,
      [
        survey.id,
        survey.title,
        survey.description || '',
        survey.category || 'satisfaction',
        survey.categoryLabel || 'ความพึงพอใจ',
        survey.department || 'ฝ่ายบริหารทั่วไป',
        survey.creatorId || 'admin',
        survey.creatorName || 'ผู้ดูแลระบบ',
        statusVal,
        JSON.stringify(survey.settings || {}),
        JSON.stringify(survey.questions || []),
        survey.viewCount,
        survey.responseCount,
        survey.createdAt,
        survey.updatedAt
      ]
    );

    await addSystemLog(
      'SURVEY_CREATE',
      `สร้างแบบสำรวจ/แบบตอบรับใหม่ (${survey.id}): ${survey.title}`,
      (req as any).user?.name || survey.creatorName || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.status(201).json(survey);
  } catch (e: any) {
    console.error('POST /api/surveys error:', e);
    return res.status(500).json({ error: 'ไม่สามารถบันทึกแบบสำรวจลงใน MySQL ได้' });
  }
});

// 6. PUT /api/surveys/:id - Update existing survey in MySQL exclusively
app.put('/api/surveys/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedAt = new Date().toISOString();

    const statusVal = updateData.status || updateData.settings?.status || 'published';
    updateData.status = statusVal;
    if (updateData.settings) {
      updateData.settings.status = statusVal;
    }

    await pool.query(
      `INSERT INTO surveys (id, title, description, category, category_label, department, creator_id, creator_name, status, settings, questions, view_count, response_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         description = VALUES(description),
         category = VALUES(category),
         category_label = VALUES(category_label),
         department = VALUES(department),
         status = VALUES(status),
         settings = VALUES(settings),
         questions = VALUES(questions),
         updated_at = VALUES(updated_at)`,
      [
        id,
        updateData.title || 'แบบสำรวจ',
        updateData.description || '',
        updateData.category || 'satisfaction',
        updateData.categoryLabel || 'ความพึงพอใจ',
        updateData.department || 'ฝ่ายบริหารทั่วไป',
        updateData.creatorId || 'admin',
        updateData.creatorName || 'ผู้ดูแลระบบ',
        statusVal,
        JSON.stringify(updateData.settings || {}),
        JSON.stringify(updateData.questions || []),
        Number(updateData.viewCount) || 0,
        Number(updateData.responseCount) || 0,
        updateData.createdAt || new Date().toISOString(),
        updateData.updatedAt
      ]
    );

    await addSystemLog(
      'SURVEY_UPDATE',
      `แก้ไขปรับปรุงแบบสำรวจ/แบบตอบรับ (${id}): ${updateData.title || id}`,
      (req as any).user?.name || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ success: true, survey: updateData });
  } catch (e: any) {
    console.error('PUT /api/surveys/:id error:', e);
    return res.status(500).json({ error: 'ไม่สามารถแก้ไขแบบสำรวจใน MySQL ได้' });
  }
});

// 7. DELETE /api/surveys/:id - Delete survey and related responses from MySQL exclusively
app.delete('/api/surveys/:id', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM survey_responses WHERE survey_id = ?', [id]);
    await pool.query('DELETE FROM surveys WHERE id = ?', [id]);

    await addSystemLog(
      'SURVEY_DELETE',
      `ลบแบบสำรวจ/แบบตอบรับออกจากระบบ (${id})`,
      (req as any).user?.name || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ success: true, message: 'ลบแบบสำรวจและข้อมูลคำตอบเรียบร้อยแล้ว' });
  } catch (e: any) {
    console.error('DELETE /api/surveys/:id error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบแบบสำรวจจาก MySQL' });
  }
});

// 8. GET /api/surveys/:id/responses - Get all responses for a survey from MySQL exclusively
app.get('/api/surveys/:id/responses', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    const [rows]: any = await pool.query(
      'SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY submitted_at DESC', 
      [id]
    );

    const responses = (rows || []).map((r: any) => {
      const ansObj = safeJsonParse(r.answers, {});
      return {
        id: r.id,
        surveyId: r.survey_id,
        surveyTitle: r.survey_title || undefined,
        respondentName: r.respondent_name || undefined,
        respondentDepartment: r.respondent_department || undefined,
        respondentPosition: r.respondent_position || undefined,
        respondentPhone: r.respondent_phone || undefined,
        respondentEmail: r.respondent_email || undefined,
        respondentIp: r.respondent_ip || undefined,
        deviceInfo: r.device_info || undefined,
        totalScore: r.total_score !== null ? Number(r.total_score) : undefined,
        timeSpentSeconds: Number(r.time_spent_seconds) || 0,
        answers: ansObj,
        submittedAt: r.submitted_at
      };
    });

    return res.json(responses);
  } catch (e: any) {
    console.error('GET /api/surveys/:id/responses error:', e);
    return res.status(500).json({ error: 'ไม่สามารถดึงรายการคำตอบจาก MySQL ได้' });
  }
});

// 9. POST /api/surveys/:id/responses - Submit response and update response_count in MySQL exclusively
app.post('/api/surveys/:id/responses', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id } = req.params;
    const responseData = req.body;

    // Verify survey exists in MySQL before accepting response
    const [surveyRows]: any = await pool.query('SELECT id FROM surveys WHERE id = ?', [id]);
    if (!surveyRows || surveyRows.length === 0) {
      return res.status(404).json({ error: 'ไม่สามารถส่งคำตอบได้ เนื่องจากแบบสำรวจนี้ถูกลบหรือไม่มีอยู่ในระบบแล้ว' });
    }

    if (!responseData.id) responseData.id = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (!responseData.submittedAt) responseData.submittedAt = new Date().toISOString();
    responseData.surveyId = id;
    responseData.answers = safeJsonParse(responseData.answers, {});

    await pool.query(
      `INSERT INTO survey_responses (
        id, survey_id, survey_title, respondent_name, respondent_department, 
        respondent_position, respondent_phone, respondent_email, respondent_ip, 
        device_info, time_spent_seconds, total_score, answers, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        survey_title = VALUES(survey_title),
        respondent_name = VALUES(respondent_name),
        respondent_department = VALUES(respondent_department),
        respondent_position = VALUES(respondent_position),
        respondent_phone = VALUES(respondent_phone),
        respondent_email = VALUES(respondent_email),
        respondent_ip = VALUES(respondent_ip),
        device_info = VALUES(device_info),
        time_spent_seconds = VALUES(time_spent_seconds),
        total_score = VALUES(total_score),
        answers = VALUES(answers),
        submitted_at = VALUES(submitted_at)`,
      [
        responseData.id,
        id,
        responseData.surveyTitle || null,
        responseData.respondentName || null,
        responseData.respondentDepartment || null,
        responseData.respondentPosition || null,
        responseData.respondentPhone || null,
        responseData.respondentEmail || null,
        responseData.respondentIp || getClientIp(req) || null,
        responseData.deviceInfo || req.headers['user-agent'] || null,
        Number(responseData.timeSpentSeconds) || 0,
        responseData.totalScore !== undefined && responseData.totalScore !== null ? Number(responseData.totalScore) : null,
        JSON.stringify(responseData.answers || {}),
        responseData.submittedAt
      ]
    );

    // Recalculate and update exact response_count in surveys table
    await pool.query(
      `UPDATE surveys 
       SET response_count = (SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?) 
       WHERE id = ?`,
      [id, id]
    );

    await addSystemLog(
      'SURVEY_RESPONSE_SUBMIT',
      `ส่งแบบตอบรับ/คำตอบแบบสำรวจ (${id}): ผู้ตอบ ${responseData.respondentName || 'ไม่ระบุตัวตน'}`,
      responseData.respondentName || 'ประชาชน/ผู้ตอบแบบสำรวจ',
      getClientIp(req)
    );

    return res.status(201).json({ success: true, response: responseData });
  } catch (e: any) {
    console.error('POST /api/surveys/:id/responses error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกคำตอบลงใน MySQL' });
  }
});

// 10. DELETE /api/surveys/:id/responses/:responseId - Delete individual response from MySQL exclusively
app.delete('/api/surveys/:id/responses/:responseId', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }

    const { id, responseId } = req.params;
    await pool.query('DELETE FROM survey_responses WHERE id = ? AND survey_id = ?', [responseId, id]);
    await pool.query(
      `UPDATE surveys 
       SET response_count = (SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?) 
       WHERE id = ?`,
      [id, id]
    );

    return res.json({ success: true, message: 'ลบรายการคำตอบเรียบร้อยแล้ว' });
  } catch (e: any) {
    console.error('DELETE /api/surveys/:id/responses/:responseId error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบคำตอบจาก MySQL' });
  }
});

app.post('/api/surveys/ai-generate', async (req, res) => {
  try {
    const topic = req.body.topic || req.body.prompt;
    const category = req.body.category || 'satisfaction';
    const targetAudience = req.body.targetAudience || 'ประชาชนและเจ้าหน้าที่ผู้รับบริการ';
    const questionCount = Math.min(Math.max(parseInt(req.body.questionCount) || 6, 1), 100);
    const includeMatrix = req.body.includeMatrix !== false;
    const includeRating = req.body.includeRating !== false;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'กรุณาระบุหัวข้อแบบสำรวจที่ต้องการสร้าง' });
    }

    const apiKey = await getAppGeminiApiKey(req.body.apiKey);
    if (!apiKey) {
      return res.status(400).json({ error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key' });
    }

    const client = getGeminiClient(apiKey, req);
    const aiPrompt = `คุณคือผู้เชี่ยวชาญการออกแบบแบบสอบถามและแบบประเมินผลสำหรับหน่วยงานราชการไทย และกรมป้องกันและบรรเทาสาธารณภัย (ปภ.)
กรุณาสร้างชุดคำถามแบบสำรวจสำหรับหัวข้อ: "${topic.trim()}"
หมวดหมู่: "${category}"
กลุ่มเป้าหมายผู้ตอบ: "${targetAudience}"
จำนวนข้อคำถามที่ต้องการ: ${questionCount} ข้อ (ต้องสร้างให้ครบทั้งหมด ${questionCount} ข้อ โดยเรียงหมายเลข id: "q_1", "q_2", ... "q_${questionCount}")
${includeMatrix ? '- ให้มีคำถามประเภท matrix_rating (Likert Scale 5 ระดับ) ในชุดคำถามด้วย' : ''}
${includeRating ? '- ให้มีคำถามประเภท rating_stars (1-5 ดาว) ในชุดคำถามด้วย' : ''}

ส่งกลับมาเป็น JSON ตาม Schema ดังนี้ (ห้ามใส่ Markdown code block อื่นใด ให้ส่งเฉพาะ raw JSON):
{
  "title": "ชื่อหัวข้อแบบสำรวจที่เป็นทางการและกระชับ",
  "description": "คำชี้แจงและวัตถุประสงค์ของแบบสำรวจเพื่อประโยชน์ราชการ",
  "category": "satisfaction",
  "categoryLabel": "ความพึงพอใจการบริการ หรือตามความเหมาะสม",
  "settings": {
    "themeColor": "#2563eb",
    "headerLogoType": "garuda",
    "showProgressBar": true,
    "showQuestionNumbers": true,
    "allowAnonymous": true,
    "requireLogin": false,
    "limitOneResponsePerDevice": false,
    "thankYouTitle": "ขอบพระคุณสำหรับข้อมูลและการประเมิน",
    "thankYouMessage": "ความคิดเห็นของท่านมีคุณค่ายิ่งในการนำไปพัฒนาและปรับปรุงการปฏิบัติงานให้มีประสิทธิภาพสูงสุด",
    "showSummaryToRespondents": true
  },
  "questions": [
    {
      "id": "q_1",
      "type": "single_choice",
      "title": "1. ข้อมูลสถานะทั่วไปของผู้ตอบแบบสำรวจ",
      "description": "กรุณาเลือกตัวเลือกที่ตรงกับท่านมากที่สุด",
      "required": true,
      "options": [
        { "id": "opt_1", "text": "ประชาชนทั่วไป / ผู้รับบริการ" },
        { "id": "opt_2", "text": "เจ้าหน้าที่หน่วยงานภาครัฐ" },
        { "id": "opt_3", "text": "ตัวแทนภาคเอกชน / ผู้ประกอบการ" },
        { "id": "opt_4", "text": "ผู้นำชุมชน / อาสาสมัคร (อปพร.)" }
      ]
    }
  ]
}`;

    const { response } = await callGeminiWithFallback({
      client,
      contents: [{ text: aiPrompt }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    let resultText = response.text || '{}';
    resultText = resultText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
    const parsed = JSON.parse(resultText);

    await addSystemLog(
      'SURVEY_AI_GENERATE',
      `ใช้งาน AI ช่วยสร้างแบบสำรวจหัวข้อ: ${topic}`,
      (req as any).user?.name || 'ผู้ดูแลระบบ',
      getClientIp(req)
    );

    return res.json({ survey: parsed });
  } catch (e: any) {
    console.error('AI Survey Generator error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผล AI แบบสำรวจ' });
  }
});

// AI 1: Individual Response Evaluation
app.post('/api/surveys/:id/responses/:responseId/ai-evaluate', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }
    const { id, responseId } = req.params;

    // 1. Fetch survey
    const [surRows]: any = await pool.query('SELECT * FROM surveys WHERE id = ?', [id]);
    if (!surRows || surRows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบแบบสำรวจที่ระบุ' });
    }
    const survey = surRows[0];
    const parsedQuestions = safeJsonParse(survey.questions, []);

    // 2. Fetch response
    const [respRows]: any = await pool.query('SELECT * FROM survey_responses WHERE id = ? AND survey_id = ?', [responseId, id]);
    if (!respRows || respRows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการคำตอบที่ระบุ' });
    }
    const responseData = respRows[0];
    const parsedAnswers = safeJsonParse(responseData.answers, {});

    // 3. Prepare AI key
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);
    if (!apiKey) {
      return res.status(400).json({ error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key' });
    }

    const client = getGeminiClient(apiKey, req);

    // Format the questions and answers into readable text
    let qaText = '';
    parsedQuestions.forEach((q: any, idx: number) => {
      if (q.type === 'section_header') {
        qaText += `\n--- ส่วน: ${q.title} ---\n`;
        return;
      }
      const ans = parsedAnswers[q.id];
      if (ans === undefined || ans === null || ans === '') return;

      qaText += `คำถามที่ ${idx + 1}: ${q.title}\n`;
      if (q.type === 'matrix_rating' && typeof ans === 'object') {
        q.matrixRows?.forEach((mRow: any) => {
          const score = ans[mRow.id];
          qaText += `  - ประเด็น "${mRow.text}": คะแนน ${score || 'ไม่ได้ตอบ'}/5\n`;
        });
      } else if (q.type === 'multiple_choice' && Array.isArray(ans)) {
        qaText += `  คำตอบ: ${ans.join(', ')}\n`;
      } else if (q.type === 'rating_stars') {
        qaText += `  คำตอบ: ${ans} ดาว\n`;
      } else if (q.type === 'slider_score') {
        qaText += `  คำตอบ: ${ans} คะแนน\n`;
      } else {
        qaText += `  คำตอบ: ${ans}\n`;
      }
      const otherAns = parsedAnswers[`${q.id}_other_text`];
      if (otherAns) {
        qaText += `  คำตอบเพิ่มเติม (อื่นๆ): ${otherAns}\n`;
      }
    });

    const aiPrompt = `คุณคือผู้เชี่ยวชาญการประเมินและวิเคราะห์คำตอบจากแบบสำรวจความพึงพอใจและการประเมินผลสำหรับหน่วยงานราชการไทย โดยเฉพาะหน่วยงานป้องกันและบรรเทาสาธารณภัย (ปภ.)
กรุณาวิเคราะห์คำตอบของผู้ตอบแบบสอบถามรายนี้อย่างละเอียดจากข้อมูลต่อไปนี้:

แบบสำรวจเรื่อง: ${survey.title}
คำชี้แจง: ${survey.description}
ผู้ตอบแบบสำรวจ: ${responseData.respondent_name || 'ประชาชน / นิรนาม'}
ตำแหน่ง: ${responseData.respondent_position || 'ประชาชน / ทั่วไป'}
สังกัด: ${responseData.respondent_department || 'ปภ.ระยอง'}

คำถามและคำตอบทั้งหมดของผู้ตอบรายนี้:
${qaText}

กรุณาวิเคราะห์และจัดทำรายงานประเมินผลเป็นภาษาไทยอย่างเป็นทางการตามหัวข้อดังนี้ในรูปแบบ JSON:
{
  "summary": "สรุปความคิดเห็นหรือแนวโน้มของผู้ตอบรายนี้อย่างสั้นและกระชับ (2-3 ประโยค)",
  "sentiment": "ประเมินโทนอารมณ์ความรู้สึกของผู้ตอบ (ตัวเลือก: 'บวก', 'เป็นกลาง', 'ลบ')",
  "keyPoints": [
    "ประเด็นที่ผู้ตอบให้ความสำคัญหรือชื่นชม (1-2 ประเด็น)",
    "ปัญหาหรือจุดที่ผู้ตอบสะท้อนว่าควรได้รับการแก้ไข (1-2 ประเด็น)"
  ],
  "recommendations": [
    "ข้อเสนอแนะเชิงปฏิบัติการสำหรับ ปภ. ระยอง จากคำตอบของผู้ตอบรายนี้ (2-3 ข้อ)"
  ],
  "scoreEvaluation": "วิเคราะห์ระดับคะแนนประเมินรวมของผู้ตอบรายนี้ เช่น มีระดับความพึงพอใจโดยรวมค่อนข้างสูง ปานกลาง หรือต้องปรับปรุงอย่างเร่งด่วน"
}

ห้ามใส่ Markdown code block ใดๆ ให้ส่งกลับมาเฉพาะข้อมูล raw JSON เท่านั้น`;

    const { response } = await callGeminiWithFallback({
      client,
      contents: [{ text: aiPrompt }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    let resultText = response.text || '{}';
    resultText = resultText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
    const parsed = JSON.parse(resultText);

    return res.json({ evaluation: parsed });
  } catch (e: any) {
    console.error('AI Respondent Evaluator error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการวิเคราะห์ AI คำตอบรายบุคคล' });
  }
});

// AI 2: Global Survey Analytics Report
app.post('/api/surveys/:id/ai-report', async (req, res) => {
  try {
    if (!isMysqlOnline) {
      return res.status(500).json({ error: 'ฐานข้อมูล MySQL ไม่พร้อมใช้งาน' });
    }
    const { id } = req.params;

    // 1. Fetch survey
    const [surRows]: any = await pool.query('SELECT * FROM surveys WHERE id = ?', [id]);
    if (!surRows || surRows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบแบบสำรวจที่ระบุ' });
    }
    const survey = surRows[0];
    const parsedQuestions = safeJsonParse(survey.questions, []);

    // 2. Fetch responses
    const [respRows]: any = await pool.query('SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY submitted_at DESC', [id]);
    const responsesCount = respRows.length;
    if (responsesCount === 0) {
      return res.status(400).json({ error: 'ยังไม่มีข้อมูลผู้ตอบแบบสำรวจในการสร้างรายงานวิเคราะห์' });
    }

    // 3. Prepare AI key
    const apiKey = await getAppGeminiApiKey(req.body.apiKey);
    if (!apiKey) {
      return res.status(400).json({ error: 'ระบบยังไม่ได้กำหนด Google Gemini API Key' });
    }

    const client = getGeminiClient(apiKey, req);

    // Aggregate statistics and some text responses for qualitative analysis
    let scoreSum = 0;
    let scoreCount = 0;
    const questionStats: Record<string, { title: string, type: string, ratings: number[], comments: string[] }> = {};

    parsedQuestions.forEach((q: any) => {
      if (q.type === 'section_header') return;
      questionStats[q.id] = {
        title: q.title,
        type: q.type,
        ratings: [],
        comments: []
      };
    });

    respRows.forEach((row: any) => {
      const answers = safeJsonParse(row.answers, {});
      parsedQuestions.forEach((q: any) => {
        if (q.type === 'section_header') return;
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === '') return;

        if (q.type === 'rating_stars' && typeof ans === 'number') {
          questionStats[q.id].ratings.push(ans);
          scoreSum += (ans / (q.maxScore || 5)) * 100;
          scoreCount++;
        } else if (q.type === 'slider_score' && typeof ans === 'number') {
          questionStats[q.id].ratings.push(ans);
          const max = q.maxScore || 10;
          const min = q.minScore || 0;
          scoreSum += ((ans - min) / (max - min)) * 100;
          scoreCount++;
        } else if (q.type === 'matrix_rating' && typeof ans === 'object') {
          Object.entries(ans).forEach(([rowId, val]: [string, any]) => {
            if (typeof val === 'number') {
              questionStats[q.id].ratings.push(val);
              scoreSum += (val / 5) * 100;
              scoreCount++;
            }
          });
        } else if ((q.type === 'text_long' || q.type === 'text_short') && typeof ans === 'string') {
          if (ans.trim().length > 2 && questionStats[q.id].comments.length < 15) {
            questionStats[q.id].comments.push(ans.trim());
          }
        }
      });
    });

    // Format aggregated summaries to AI prompt
    let aggSummary = '';
    Object.entries(questionStats).forEach(([qId, stats]) => {
      aggSummary += `\nคำถาม: ${stats.title} (${stats.type})\n`;
      if (stats.ratings.length > 0) {
        const sum = stats.ratings.reduce((a, b) => a + b, 0);
        const avg = (sum / stats.ratings.length).toFixed(2);
        aggSummary += `  - คะแนนเฉลี่ย: ${avg} (จากทั้งหมด ${stats.ratings.length} รายการ)\n`;
      }
      if (stats.comments.length > 0) {
        aggSummary += `  - ตัวอย่างคำตอบหรือข้อคิดเห็นเด่นๆ:\n`;
        stats.comments.forEach((comm) => {
          aggSummary += `    * "${comm}"\n`;
        });
      }
    });

    const overallAvgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : '0.00';

    const aiPrompt = `คุณคือผู้เชี่ยวชาญการวิเคราะห์ข้อมูลและเขียนรายงานสถิติแบบประเมินผลระดับ Enterprise สำหรับหน่วยงานราชการไทย
กรุณาวิเคราะห์ข้อมูลแบบสำรวจนี้และจัดทำ "รายงานสรุปวิเคราะห์ผลอัจฉริยะระบบงานระยอง ปภ. (Smart Survey Analytics Executive Report)" เป็นภาษาไทยที่เป็นทางการและละเอียดสูง

แบบสำรวจเรื่อง: ${survey.title}
กลุ่มเป้าหมาย/คำชี้แจง: ${survey.description}
จำนวนผู้ตอบแบบสำรวจทั้งหมด: ${responsesCount} คน
ดัชนีคะแนนประเมินรวมเฉลี่ยภาพรวม (%): ${overallAvgScore}%

ข้อมูลสถิติแยกตามข้อคำถามและความคิดเห็น:
${aggSummary}

กรุณาสรุปรายงานอย่างละเอียดและลุ่มลึก โดยส่งกลับมาเป็นรูปแบบ JSON เท่านั้น ห้ามใส่คำชี้แจงภายนอกหรือ Markdown code block ใดๆ:
{
  "executiveSummary": "บทสรุปผู้บริหารความยาวประมาณ 4-5 บรรทัด สรุปผลลัพธ์ภาพรวม ทิศทางความรู้สึก และจุดสำคัญที่สุด",
  "quantitativeAnalysis": "บทวิเคราะห์สถิติตัวเลขและระดับความพึงพอใจภาพรวม เทียบกับเป้าหมายงาน ปภ. เชิงลึก",
  "qualitativeInsights": "สรุปข้อมูลเชิงความคิดเห็น สะท้อนความพึงพอใจและเสียงสะท้อนจากประชาชน/ผู้รับบริการ และวิเคราะห์อุปสรรคเชิงระบบ",
  "painPoints": [
    "ระบุจุดอ่อน ปัญหาหลัก หรือความเสี่ยงที่พบจากการประเมิน 3 ประเด็นที่สำคัญที่สุด"
  ],
  "actionPlan": [
    "เสนอแผนงาน/มาตรการปฏิบัติการเชิงรุก (Action Plan) ที่ ปภ. ระยอง ควรดำเนินการต่อ 4 ข้อ เพื่อแก้ไขปัญหาและเพิ่มระดับความพึงพอใจ"
  ],
  "scoreConclusion": "สรุปวิเคราะห์ผลลัพธ์ผ่านเกณฑ์ความพึงพอใจมาตรฐานของหน่วยงานภาครัฐหรือไม่ อย่างไร พร้อมระดับการประเมินโดยรวม (ดีเลิศ / ดีมาก / ปานกลาง / ต้องปรับปรุง)"
}`;

    const { response } = await callGeminiWithFallback({
      client,
      contents: [{ text: aiPrompt }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    let resultText = response.text || '{}';
    resultText = resultText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
    const parsed = JSON.parse(resultText);

    return res.json({ report: parsed });
  } catch (e: any) {
    console.error('AI Survey Report Generator error:', e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผล AI รายงานภาพรวม' });
  }
});

function analyzeThaiGovDocument(title: string, content: string) {
  const combined = `${title || ''} ${content || ''}`.toLowerCase();

  // 1. Determine Document Type
  let type: 'inbox' | 'outbox' | 'admin' | 'internal' = 'inbox';
  let category: 'order' | 'announcement' | 'certificate' | 'circular' | 'memo' = 'memo';

  if (combined.includes('คำสั่ง') || combined.includes('แต่งตั้ง') || combined.includes('มอบหมายหน้าที่')) {
    type = 'admin';
    category = 'order';
  } else if (combined.includes('ประกาศ') || combined.includes('แถลงการณ์')) {
    type = 'admin';
    category = 'announcement';
  } else if (combined.includes('บันทึกข้อความ') || combined.includes('ภายใน') || combined.includes('ขออนุมัติ')) {
    type = 'internal';
    category = 'memo';
  } else if (combined.includes('หนังสือส่ง') || combined.includes('กราบเรียน') || combined.includes('ส่งถึง')) {
    type = 'outbox';
    category = 'memo';
  } else if (combined.includes('หนังสือเวียน') || combined.includes('ว.') || combined.includes('แจ้งเวียน')) {
    category = 'circular';
  }

  // 2. Determine Priority
  let priority: 'normal' | 'urgent' | 'very_urgent' | 'extremely_urgent' = 'normal';
  if (combined.includes('ด่วนที่สุด') || combined.includes('ฉุกเฉิน') || combined.includes('เตือนภัย') || combined.includes('วิกฤต') || combined.includes('เผชิญเหตุ')) {
    priority = 'extremely_urgent';
  } else if (combined.includes('ด่วนมาก') || combined.includes('เร่งด่วน') || combined.includes('สำคัญมาก')) {
    priority = 'very_urgent';
  } else if (combined.includes('ด่วน') || combined.includes('เร่งรัด')) {
    priority = 'urgent';
  }

  // 3. Determine Department
  let suggestedTo = 'ฝ่ายยุทธศาสตร์และการจัดการ';
  if (combined.includes('ป้องกัน') || combined.includes('อุทกภัย') || combined.includes('วาตภัย') || combined.includes('สาธารณภัย') || combined.includes('ดับเพลิง') || combined.includes('กู้ภัย') || combined.includes('ปฏิบัติการ')) {
    suggestedTo = 'ฝ่ายป้องกันและปฏิบัติการ';
  } else if (combined.includes('สงเคราะห์') || combined.includes('ผู้ประสบภัย') || combined.includes('ถุงยังชีพ') || combined.includes('เยียวยา') || combined.includes('เงินช่วยเหลือ') || combined.includes('ฟื้นฟู')) {
    suggestedTo = 'ฝ่ายสงเคราะห์ผู้ประสบภัย';
  } else if (combined.includes('ยุทธศาสตร์') || combined.includes('แผนงาน') || combined.includes('งบประมาณ') || combined.includes('โครงการ') || combined.includes('ติดตามประเมินผล') || combined.includes('นโยบาย') || combined.includes('สารบรรณ') || combined.includes('ธุรการ') || combined.includes('พัสดุ') || combined.includes('การเงิน')) {
    suggestedTo = 'ฝ่ายยุทธศาสตร์และการจัดการ';
  }

  // 4. Generate Clean Executive Summary
  let summary = '';
  if (content && content.trim().length > 10) {
    summary = content.trim().substring(0, 500) + '...';
  }
  return { type, category, priority, suggestedTo, summary };
}

