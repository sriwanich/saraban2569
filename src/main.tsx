import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker with automatic update trigger
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New update available for e-Saraban Enterprise PWA. Refreshing...');
    // Force immediate update and page reload
    updateSW(true);
  },
  onOfflineReady() {
    console.log('e-Saraban PWA is ready for offline operation.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
