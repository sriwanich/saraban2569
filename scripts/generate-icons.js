import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const sizes = [
  { name: 'icons/icon-72x72.png', size: 72, maskable: false },
  { name: 'icons/icon-96x96.png', size: 96, maskable: false },
  { name: 'icons/icon-128x128.png', size: 128, maskable: false },
  { name: 'icons/icon-144x144.png', size: 144, maskable: false },
  { name: 'icons/icon-152x152.png', size: 152, maskable: false },
  { name: 'icons/icon-180x180.png', size: 180, maskable: false },
  { name: 'icons/icon-192x192.png', size: 192, maskable: false },
  { name: 'icons/icon-512x512.png', size: 512, maskable: false },
  { name: 'icons/icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true }
];

function getSvg(size, isMaskable) {
  const padding = isMaskable ? size * 0.18 : size * 0.08;
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const rx = isMaskable ? 0 : size * 0.22;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a" />
        <stop offset="50%" stop-color="#1e40af" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
      <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f1f5f9" />
      </linearGradient>
      <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-opacity="0.35"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bgGrad)" />

    <!-- Outer Decorative Border for non-maskable -->
    ${!isMaskable ? `<rect x="${size * 0.04}" y="${size * 0.04}" width="${size * 0.92}" height="${size * 0.92}" rx="${size * 0.18}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${Math.max(1, size * 0.015)}" />` : ''}

    <g transform="translate(${cx}, ${cy})">
      <!-- Main Document Icon -->
      <g filter="url(#dropShadow)" transform="translate(0, ${-innerSize * 0.02})">
        <!-- Back document page -->
        <rect x="${-innerSize * 0.32}" y="${-innerSize * 0.38}" width="${innerSize * 0.54}" height="${innerSize * 0.72}" rx="${innerSize * 0.06}" fill="#93c5fd" opacity="0.6" transform="rotate(-6)" />
        
        <!-- Front document page -->
        <rect x="${-innerSize * 0.28}" y="${-innerSize * 0.36}" width="${innerSize * 0.56}" height="${innerSize * 0.74}" rx="${innerSize * 0.06}" fill="url(#docGrad)" stroke="#cbd5e1" stroke-width="${Math.max(1, innerSize * 0.02)}" />
        
        <!-- Header ribbon on document -->
        <rect x="${-innerSize * 0.24}" y="${-innerSize * 0.32}" width="${innerSize * 0.48}" height="${innerSize * 0.1}" rx="${innerSize * 0.03}" fill="#1e40af" />
        
        <!-- Document content lines -->
        <rect x="${-innerSize * 0.22}" y="${-innerSize * 0.16}" width="${innerSize * 0.44}" height="${innerSize * 0.04}" rx="${innerSize * 0.015}" fill="#94a3b8" />
        <rect x="${-innerSize * 0.22}" y="${-innerSize * 0.08}" width="${innerSize * 0.35}" height="${innerSize * 0.04}" rx="${innerSize * 0.015}" fill="#cbd5e1" />
        <rect x="${-innerSize * 0.22}" y="${0}" width="${innerSize * 0.42}" height="${innerSize * 0.04}" rx="${innerSize * 0.015}" fill="#cbd5e1" />
        <rect x="${-innerSize * 0.22}" y="${innerSize * 0.08}" width="${innerSize * 0.28}" height="${innerSize * 0.04}" rx="${innerSize * 0.015}" fill="#cbd5e1" />

        <!-- Gold Official Seal Badge -->
        <circle cx="${innerSize * 0.14}" cy="${innerSize * 0.22}" r="${innerSize * 0.15}" fill="url(#goldGrad)" stroke="#ffffff" stroke-width="${Math.max(1, innerSize * 0.025)}" filter="url(#dropShadow)" />
        <circle cx="${innerSize * 0.14}" cy="${innerSize * 0.22}" r="${innerSize * 0.11}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1, innerSize * 0.012)}" stroke-dasharray="${innerSize * 0.03} ${innerSize * 0.02}" />
        <!-- Star in badge -->
        <polygon points="${innerSize * 0.14},${innerSize * 0.13} ${innerSize * 0.165},${innerSize * 0.20} ${innerSize * 0.23},${innerSize * 0.20} ${innerSize * 0.18},${innerSize * 0.24} ${innerSize * 0.20},${innerSize * 0.31} ${innerSize * 0.14},${innerSize * 0.27} ${innerSize * 0.08},${innerSize * 0.31} ${innerSize * 0.10},${innerSize * 0.24} ${innerSize * 0.05},${innerSize * 0.20} ${innerSize * 0.115},${innerSize * 0.20}" fill="#ffffff" />
      </g>

      <!-- Bottom Badge: EDMS Text -->
      <g transform="translate(0, ${innerSize * 0.38})">
        <rect x="${-innerSize * 0.35}" y="${-innerSize * 0.08}" width="${innerSize * 0.7}" height="${innerSize * 0.16}" rx="${innerSize * 0.08}" fill="#0284c7" stroke="#ffffff" stroke-width="${Math.max(1, innerSize * 0.015)}" />
        <text x="0" y="${innerSize * 0.035}" font-family="system-ui, -apple-system, sans-serif" font-size="${innerSize * 0.09}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="${innerSize * 0.01}">SARABAN</text>
      </g>
    </g>
  </svg>
  `;
}

async function run() {
  const publicDir = path.join(process.cwd(), 'public');
  const iconsDir = path.join(publicDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Save standalone SVG
  const masterSvg = getSvg(512, false);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), masterSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'vite.svg'), masterSvg.trim());
  console.log('Saved public/icon.svg & public/vite.svg');

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  for (const item of sizes) {
    const svgContent = getSvg(item.size, item.maskable);
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${svgContent}</body></html>`;
    await page.setViewport({ width: item.size, height: item.size, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const outPath = path.join(publicDir, item.name);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Generated: ${item.name} (${item.size}x${item.size})`);
  }

  // Also copy 180x180 to favicon.ico as PNG
  const favSrc = path.join(iconsDir, 'icon-72x72.png');
  const favDest = path.join(publicDir, 'favicon.ico');
  if (fs.existsSync(favSrc)) {
    fs.copyFileSync(favSrc, favDest);
    console.log('Copied favicon.ico');
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
