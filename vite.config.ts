import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Prevent service worker from intercepting /api or /uploads requests and fallback to SPA
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'),
            handler: 'NetworkOnly'
          }
        ]
      },
      manifest: {
        name: 'e-Saraban PWA Enterprise',
        short_name: 'e-Saraban',
        description: 'Enterprise PWA Electronic Document Management System & QR Portal',
        theme_color: '#1e3a8a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
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
  optimizeDeps: {
    include: ['fabric', 'pdf-lib', 'qrcode']
  },
  build: {
    chunkSizeWarningLimit: 3000
  },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: 'all' }
});
