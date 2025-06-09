// src/components/PwaUpdater.tsx
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Define the BeforeInstallPromptEvent interface
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
      console.log('New content available, will show update prompt');
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Clear the deferredPrompt so it can only be used once
    setDeferredPrompt(null);
  };

  const handleUpdateClick = async () => {
    console.log('Update button clicked, calling updateServiceWorker...');
    try {
      // Call updateServiceWorker with true to reload immediately
      await updateServiceWorker(true);
      console.log('Update service worker called successfully');
    } catch (error) {
      console.error('Error updating service worker:', error);
      // Fallback: force reload the page
      window.location.reload();
    }
  };

  const closeUpdatePrompt = () => {
    console.log('Closing update prompt');
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Debug logging
  useEffect(() => {
    console.log('PwaUpdater state:', { 
      needRefresh, 
      offlineReady, 
      isInstalled,
      hasDeferredPrompt: !!deferredPrompt 
    });
  }, [needRefresh, offlineReady, isInstalled, deferredPrompt]);

  return (
    <>
      {/* Install Prompt - Only show if app is NOT installed and we have a deferred prompt */}
      {!isInstalled && deferredPrompt && (
        <div style={{
          position: 'fixed',
          bottom: needRefresh ? '140px' : '20px', // Position above update prompt if both are shown
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

      {/* Update Prompt - Show regardless of installation status */}
      {needRefresh && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000, // Higher z-index to ensure it's on top
          maxWidth: '300px',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span>Ny versjon tilgjengelig!</span>
          </div>
          <button 
            onClick={handleUpdateClick}
            style={{ 
              background: 'white', 
              color: '#3b82f6', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              marginRight: '8px', 
              cursor: 'pointer',
              fontWeight: '500'
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
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Senere
          </button>
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
          <span>Appen er klar for offline bruk!</span>
        </div>
      )}
    </>
  );
}

export default PwaUpdater;