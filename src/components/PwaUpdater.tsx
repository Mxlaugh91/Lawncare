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
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered:', r);
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error:', error);
    },
    onNeedRefresh() {
      console.log('🔄 New content available');
      // Since we use skipWaiting: true, the new SW will activate immediately
      // We just need to reload the page
      setShowReloadPrompt(true);
    },
    onOfflineReady() {
      console.log('✅ App ready to work offline');
    },
  });

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    // Install prompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('PWA installed');
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
    console.log(`Install prompt outcome: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

 const handleUpdateClick = () => {
    console.log('[PWA Updater] handleUpdateClick function initiated.');
    if (!updateServiceWorker) {
        console.error('[PWA Updater] updateServiceWorker function is not available!');
        return;
    }
    console.log('[PWA Updater] Calling updateServiceWorker(true) to activate new SW.');
    updateServiceWorker(true); // This tells the new SW to skip waiting and activate.
                               // It sends a { type: 'SKIP_WAITING' } message to the SW.
    console.log('[PWA Updater] updateServiceWorker(true) has been called.');
    console.log('[PWA Updater] Setting timeout for window.location.reload() in 100ms.');
    
    setTimeout(() => {
      console.log('[PWA Updater] Timeout reached. Executing window.location.reload().');
      try {
        window.location.reload();
      } catch (e) {
        console.error('[PWA Updater] Error during window.location.reload():', e);
      }
    }, 100);
  };

  const closeUpdatePrompt = () => {
    console.log('[PWA Updater] closeUpdatePrompt called. Hiding reload prompt.');
    setShowReloadPrompt(false);

  };

  return (
    <>
      {/* Install Prompt */}
      {!isInstalled && deferredPrompt && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Installer PlenPilot</h3>
              <p className="text-sm opacity-90">
                Få rask tilgang og offline-støtte!
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleInstallClick}
              className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors"
            >
              Installer
            </button>
            <button 
              onClick={() => setDeferredPrompt(null)}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              Senere
            </button>
          </div>
        </div>
      )}

      {/* Update Prompt - Shows when new version is ready */}
      {(needRefresh || showReloadPrompt) && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl animate-spin-slow">🔄</span>
            <div>
              <h3 className="font-bold">Ny versjon tilgjengelig!</h3>
              <p className="text-sm opacity-90">
                Oppdater for å få de nyeste funksjonene
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleUpdateClick}
              className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition-all transform hover:scale-105"
            >
              Oppdater nå
            </button>
            <button 
              onClick={closeUpdatePrompt}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              Senere
            </button>
          </div>
        </div>
      )}

      {/* Offline Ready Toast */}
      {offlineReady && !needRefresh && !showReloadPrompt && (
        <div className="fixed bottom-5 left-5 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <span>✅</span>
            <span>Appen fungerer offline!</span>
          </span>
        </div>
      )}
    </>
  );
}

export default PwaUpdater;
