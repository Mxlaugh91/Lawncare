// src/main.tsx - Korrigert Service Worker registrering
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA Service Worker registrering - KORRIGERT
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // ✅ FIKSET: Riktig path med base URL
      const registration = await navigator.serviceWorker.register('/Lawncare/service-worker.js', {
        scope: '/Lawncare/' // ✅ FIKSET: Scope matcher base URL
      });
      
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Show update notification
              showUpdateNotification();
            }
          });
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// PWA Install prompt - FORBEDRET
let deferredPrompt: any;
let installButton: HTMLElement | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install prompt available');
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  hideInstallButton();
  deferredPrompt = null;
  
  // Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_installed', {
      'event_category': 'engagement',
      'event_label': 'PWA'
    });
  }
});

// ✅ FORBEDRET: Faktisk implementasjon av install UI
function showInstallButton() {
  // Sjekk om vi allerede viser install button
  if (installButton) return;
  
  // Opprett install button
  installButton = document.createElement('div');
  installButton.id = 'pwa-install-prompt';
  installButton.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideInUp 0.3s ease-out;
    ">
      📱 Installer PlenPilot
      <span style="
        background: rgba(255,255,255,0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 4px;
        cursor: pointer;
      " onclick="this.parentElement.parentElement.remove()">✕</span>
    </div>
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Add click handler
  installButton.addEventListener('click', async (e) => {
    if ((e.target as HTMLElement).textContent?.includes('✕')) return;
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Install prompt result: ${outcome}`);
      
      if (outcome === 'accepted') {
        hideInstallButton();
      }
      deferredPrompt = null;
    }
  });
  
  document.body.appendChild(installButton);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (installButton) {
      hideInstallButton();
    }
  }, 10000);
}

function hideInstallButton() {
  if (installButton) {
    installButton.remove();
    installButton = null;
  }
}

// ✅ NYTT: Update notification
function showUpdateNotification() {
  const updateDiv = document.createElement('div');
  updateDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    ">
      <strong>Ny versjon tilgjengelig!</strong><br>
      <small>Oppdater for nyeste funksjoner</small><br>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #3b82f6;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        margin-top: 8px;
        margin-right: 8px;
        cursor: pointer;
        font-weight: 500;
      ">Oppdater nå</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 6px 12px;
        border-radius: 4px;
        margin-top: 8px;
        cursor: pointer;
      ">Senere</button>
    </div>
  `;
  document.body.appendChild(updateDiv);
}

// ✅ NYTT: Eksporter install funksjon for bruk andre steder
(window as any).installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Manual install result: ${outcome}`);
    deferredPrompt = null;
  } else {
    console.log('Install prompt not available');
  }
};

// ✅ NYTT: Network status tracking
window.addEventListener('online', () => {
  console.log('Back online');
  // Sync pending data
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_DATA' });
  }
});

window.addEventListener('offline', () => {
  console.log('Gone offline');
  // Show offline indicator
  showOfflineIndicator();
});

function showOfflineIndicator() {
  if (document.getElementById('offline-indicator')) return;
  
  const offlineDiv = document.createElement('div');
  offlineDiv.id = 'offline-indicator';
  offlineDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ef4444;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      z-index: 10000;
    ">
      📵 Ingen internettforbindelse - Arbeider offline
    </div>
  `;
  document.body.appendChild(offlineDiv);
  
  // Remove when back online
  const removeOnOnline = () => {
    offlineDiv.remove();
    window.removeEventListener('online', removeOnOnline);
  };
  window.addEventListener('online', removeOnOnline);
}