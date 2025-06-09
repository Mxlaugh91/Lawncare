// src/components/PwaUpdater.tsx
import { useRegisterSW } from 'virtual:pwa-register/react';

// Denne komponenten er basert på den offisielle dokumentasjonen for vite-plugin-pwa
function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registered:', r);
    },
    onRegisterError(error) {
      console.log('Service Worker registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    // Hvis ingen oppdatering er nødvendig, viser vi ingenting.
    return null; 
  }

  // Hvis en ny versjon er klar, vis en oppdaterings-melding
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#3b82f6',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9999,
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span>Ny versjon tilgjengelig!</span>
      </div>
      <button 
        onClick={() => updateServiceWorker(true)}
        style={{ background: 'white', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '4px', marginRight: '8px', cursor: 'pointer' }}
      >
        Oppdater nå
      </button>
      <button 
        onClick={close}
        style={{ background: 'transparent', color: 'white', border: '1px solid white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
      >
        Lukk
      </button>
    </div>
  );
}

export default PwaUpdater;