// src/components/PwaUpdater.tsx

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';

// Define the type for beforeinstallprompt event for PWA installation
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function PwaUpdater() {
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('PWAUpdater: Service Worker registered:', swUrl);
      // Check for updates periodically
      if (registration) {
        setInterval(() => {
          if (!isUpdating) {
            console.log('PWAUpdater: Checking for SW updates...');
            registration.update();
          }
        }, 60 * 60 * 1000); // Every hour
      }
    },
    onRegisterError(error) {
      console.error('PWAUpdater: SW registration error:', error);
    },
    onOfflineReady() {
      console.log('PWAUpdater: App is ready for offline use');
    },
  });

  // Handle service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('PWAUpdater: Received SW_ACTIVATED message');
        // The new service worker has taken control, reload the page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Handle PWA installation prompt
  useEffect(() => {
    // Check if app is running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsPwaInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
      console.log('PWAUpdater: beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredInstallPrompt(null);
      console.log('PWAUpdater: appinstalled event captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;
    
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWAUpdater: User accepted PWA installation');
      setDeferredInstallPrompt(null);
    } else {
      console.log('PWAUpdater: User dismissed PWA installation');
    }
  };

  const handleUpdateClick = async () => {
    if (!needRefresh) return;

    setIsUpdating(true);
    console.log('PWAUpdater: User clicked "Update now", calling updateServiceWorker(true)');
    
    try {
      // This will send SKIP_WAITING to the waiting SW and reload when it activates
      await updateServiceWorker(true);
    } catch (error) {
      console.error('PWAUpdater: Error updating service worker:', error);
      setIsUpdating(false);
    }
  };

  const closeUpdatePrompt = () => {
    console.log('PWAUpdater: User closed the prompt');
    if (needRefresh) {
      setNeedRefresh(false);
    }
    if (offlineReady) {
      setOfflineReady(false);
    }
  };
  
  const showInstallButton = !isPwaInstalled && deferredInstallPrompt;
  const showUpdateDialog = needRefresh;
  const showOfflineReadyDialog = offlineReady && !needRefresh;

  return (
    <>
      {/* PWA Installation prompt */}
      {showInstallButton && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <h3 className="font-semibold mb-1">Installer PlenPilot</h3>
          <p className="text-sm opacity-90">Få rask tilgang og offline-støtte!</p>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleInstallClick} 
              className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors"
            >
              Installer nå
            </button>
            <button 
              onClick={() => setDeferredInstallPrompt(null)} 
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              Senere
            </button>
          </div>
        </div>
      )}

      {/* Update dialog */}
      {showUpdateDialog && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔄</span>
            <div>
              <h3 className="font-bold">Ny versjon tilgjengelig!</h3>
              <p className="text-sm opacity-90">Oppdater for å få de nyeste funksjonene</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleUpdateClick}
              disabled={isUpdating}
              className={`px-4 py-2 rounded font-semibold transition-all transform ${
                isUpdating 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105'
              }`}
            >
              {isUpdating ? 'Oppdaterer...' : 'Oppdater nå'}
            </button>
            <button 
              onClick={closeUpdatePrompt} 
              disabled={isUpdating}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Senere
            </button>
          </div>
        </div>
      )}
      
      {/* Offline ready dialog */}
      {showOfflineReadyDialog && (
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