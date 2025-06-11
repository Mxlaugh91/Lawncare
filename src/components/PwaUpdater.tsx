// src/components/PwaUpdater.tsx - Forenklet og rask versjon

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';

function PwaUpdater() {
  const [showReload, setShowReload] = useState(false);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW registered:', swUrl);
      
      // Sjekk for oppdateringer hver 30. minutt (ikke hver time)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  // Vis reload-knapp når oppdatering er klar
  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    // Bare oppdater - ingen fancy loading states
    updateServiceWorker(true);
  };

  if (!showReload) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex gap-3 items-center">
      <div>
        <p className="font-semibold">Ny versjon tilgjengelig!</p>
        <p className="text-sm opacity-90">Klikk for å oppdatere</p>
      </div>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition-colors"
      >
        Oppdater
      </button>
    </div>
  );
}

export default PwaUpdater;