import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'vite.svg', 'icons/*.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Prevent service worker from intercepting /api or /uploads requests and fallback to SPA
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 2
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'),
            handler: 'NetworkOnly'
          }
        ]
      },
      manifest: {
        id: '/',
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
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      'echarts-for-react': 'echarts-for-react/esm/index.js',
      'echarts': 'echarts'
    }
  },
  optimizeDeps: {
    include: ['fabric', 'pdf-lib', 'qrcode', 'echarts', 'echarts-for-react']
  },
  build: {
    chunkSizeWarningLimit: 3000
  },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: 'all' }
});
