import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 10000000
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
