// src/components/PwaUpdater.tsx
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

  // Simplified update approach - close all tabs and reload
  const handleUpdateClick = () => {
    console.log('🔄 Update button clicked');
    
    // Hide the prompt
    setNeedRefresh(false);
    
    // Show user message and instruction
    const confirmed = window.confirm(
      'For å fullføre oppdateringen må alle faner av appen lukkes og åpnes på nytt.\n\n' +
      'Klikk OK for å lukke denne fanen. Åpne deretter appen på nytt for å se den oppdaterte versjonen.\n\n' +
      '(Hvis du har flere faner åpne med appen, lukk dem også)'
    );
    
    if (confirmed) {
      // Try to close the tab/window
      if (window.opener) {
        window.close(); // Close popup/tab opened by another window
      } else {
        // For main window, try to close or navigate away
        try {
          window.close();
        } catch (e) {
          // If we can't close (main tab), reload instead
          window.location.reload();
        }
      }
    } else {
      // User cancelled, show the prompt again
      setNeedRefresh(true);
    }
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
          bottom: needRefresh ? '140px' : '20px',
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

      {/* Update Prompt */}
      {needRefresh && (
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
              En oppdatering er klar. Lukk alle faner og åpne appen på nytt for å se den nyeste versjonen.
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
      {offlineReady && !needRefresh && (
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