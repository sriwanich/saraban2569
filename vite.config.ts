import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: process.env.DISABLE_PWA !== 'false', // ปิดการใช้งาน PWA เป็นค่าเริ่มต้นเพื่อป้องกันปัญหาสิทธิ์การเขียนไฟล์ (Permission Denied) บนเซิร์ฟเวอร์ปลายทาง หากต้องการเปิดให้ระบุ DISABLE_PWA=false ใน .env
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/]
      },
      manifest: {
        name: 'ระบบงานสารบรรณอิเล็กทรอนิกส์',
        short_name: 'EDMS',
        description: 'ระบบงานสารบรรณอิเล็กทรอนิกส์ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
        theme_color: '#2563eb',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: { host: '0.0.0.0', port: 3000, allowedHosts: 'all' }
});
