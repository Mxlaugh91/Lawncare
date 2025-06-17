// src/components/PwaUpdater.tsx - PWA oppdatering med cache-busting reload

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';

function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW registered:', swUrl);
      
      // Sjekk for oppdateringer hver 30. minutt
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 1000);
      }
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  // Automatisk oppdatering når ny versjon er klar
  useEffect(() => {
    if (needRefresh) {
      console.log('New version available, updating automatically...');
      updateServiceWorker(true);
      
      // CACHE-BUSTING: Legg til unik parameter for å tvinge reload av alle ressurser
      setTimeout(() => {
        const timestamp = Date.now();
        const currentUrl = new URL(window.location.href);
        
        // Legg til cache-busting parameter
        currentUrl.searchParams.set('_cb', timestamp.toString());
        
        // Erstatt current URL med den nye cache-busting URL-en
        window.location.replace(currentUrl.href);
      }, 100);
    }
  }, [needRefresh, updateServiceWorker]);

  // Ingen UI - alt skjer automatisk i bakgrunnen
  return null;
}

export default PwaUpdater;