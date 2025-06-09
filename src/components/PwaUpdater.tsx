// Alternative approach with more explicit control
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function PwaUpdater() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
    onNeedRefresh() {
      console.log('🔄 New content available, will show update prompt');
    },
    onOfflineReady() {
      console.log('✅ App ready to work offline');
    },
  });

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleUpdateClick = () => {
    console.log('🔄 Update button clicked');
    setIsUpdating(true);
    setNeedRefresh(false);
    
    // Show updating message and reload after short delay
    setTimeout(() => {
      console.log('🔄 Reloading to apply update...');
      window.location.reload();
    }, 500);
  };

  const closeUpdatePrompt = () => {
    console.log('❌ Closing update prompt');
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Install Prompt */}
      {!isInstalled && deferredPrompt && (
        <div style={{
          position: 'fixed',
          bottom: needRefresh || isUpdating ? '140px' : '20px',
          right: '20px',
          background: '#22c55e',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          maxWidth: '300px',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span>Installer PlenPilot som app!</span>
          </div>
          <button 
            onClick={handleInstallClick}
            style={{ 
              background: 'white', 
              color: '#22c55e', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              marginRight: '8px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Installer
          </button>
          <button 
            onClick={() => setDeferredPrompt(null)}
            style={{ 
              background: 'transparent', 
              color: 'white', 
              border: '1px solid white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Ikke nå
          </button>
        </div>
      )}

      {/* Updating Message */}
      {isUpdating && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000,
          maxWidth: '320px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #ffffff40',
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontWeight: '500' }}>Oppdaterer app...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Update Prompt */}
      {needRefresh && !isUpdating && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#3b82f6',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000,
          maxWidth: '320px',
          border: '2px solid #1d4ed8',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🔄 Ny versjon tilgjengelig!</div>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              En oppdatering er klar. Klikk for å laste inn den nyeste versjonen.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleUpdateClick}
              style={{ 
                background: 'white', 
                color: '#3b82f6', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Oppdater nå
            </button>
            <button 
              onClick={closeUpdatePrompt}
              style={{ 
                background: 'transparent', 
                color: 'white', 
                border: '1px solid white', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Senere
            </button>
          </div>
        </div>
      )}

      {/* Offline Ready Notification */}
      {offlineReady && !needRefresh && !isUpdating && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
        }}>
          <span>✅ Appen er klar for offline bruk!</span>
        </div>
      )}
    </>
  );
}

export default PwaUpdater;