// src/components/PwaUpdater.tsx - Automatisk PWA oppdatering med reload

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
      
      // VIKTIG: Reload siden for å sikre at ny kode lastes
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [needRefresh, updateServiceWorker]);

  // Ingen UI - alt skjer automatisk i bakgrunnen
  return null;
}

export default PwaUpdater;