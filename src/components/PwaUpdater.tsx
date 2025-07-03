// src/components/PwaUpdater.tsx - Fixed PWA updater without aggressive intervals

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';

function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW registered:', swUrl);
      
      // REMOVED: Aggressive 30-second interval updates that cause InvalidStateError
      // The browser will handle update checks automatically at appropriate intervals
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  // Automatic update when new version is available
  useEffect(() => {
    if (needRefresh) {
      console.log('New version available, updating automatically...');
      
      // SIMPLIFIED: Just call updateServiceWorker with reload flag
      // The vite-plugin-pwa will handle the update and reload properly
      updateServiceWorker(true);
      
      // REMOVED: Manual window.location.replace that could interfere
      // with the plugin's built-in update mechanism
    }
  }, [needRefresh, updateServiceWorker]);

  // No UI - everything happens automatically in the background
  return null;
}

export default PwaUpdater;