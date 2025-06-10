// PwaUpdater.tsx

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

  // Utility function for platform detection
  const getPlatformInfo = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    return { isIOS, isAndroid, isStandalone };
  };

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registrert:', r);
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Sjekker for oppdateringer hver time
      }
    },
    onRegisterError(error) {
      console.log('SW registreringsfeil:', error);
    },
    onUpdated() {
      console.log('SW oppdatert og aktivert - laster siden på nytt');
      
      // Plattformspesifikk reload
      const { isIOS } = getPlatformInfo();
      
      if (isIOS) {
        // iOS krever ofte hard reload
        window.location.href = window.location.href;
      } else {
        window.location.reload();
      }
    },
  });

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FORCE_RELOAD') {
        console.log('Mottok FORCE_RELOAD fra service worker');
        window.location.reload();
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

  // onNeedRefresh og onOfflineReady vil bli trigget av useRegisterSW.
  // Vi setter showReloadPrompt til true når det er en oppdatering.
  useEffect(() => {
    if (needRefresh) {
      setShowReloadPrompt(true);
    }
  }, [needRefresh]);
  
  useEffect(() => {
    if (offlineReady) {
      console.log('App klar for offline-bruk');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
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
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleUpdateClick = async () => {
    console.log('Bruker trykket "Oppdater nå"');
    
    try {
      // Skjul dialogen umiddelbart
      setShowReloadPrompt(false);
      setNeedRefresh(false);
      
      // Plattformspesifikk håndtering
      const { isIOS, isStandalone } = getPlatformInfo();
      
      if (isIOS && isStandalone) {
        // iOS PWA krever ofte hard reload
        console.log('iOS PWA detektert - bruker hard reload');
        window.location.reload();
        return;
      }
      
      // Send eksplisitt melding til service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Sender SKIP_WAITING melding til service worker');
        navigator.serviceWorker.controller.postMessage({ 
          type: 'SKIP_WAITING' 
        });
        
        // Lyt etter at service worker er aktivert
        const handleControllerChange = () => {
          console.log('Service worker controller endret - laster siden på nytt');
          // Bruk hard reload for å sikre at alle ressurser oppdateres
          if (isIOS) {
            window.location.href = window.location.href;
          } else {
            window.location.reload();
          }
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
        
        // Timeout som backup for iOS
        setTimeout(() => {
          console.log('Timeout aktivert - tvinger reload');
          window.location.reload();
        }, 3000);
        
      } else {
        // Fallback til standard updateServiceWorker
        console.log('Bruker standard updateServiceWorker');
        await updateServiceWorker(true);
      }
      
    } catch (error) {
      console.error('Feil ved oppdatering av service worker:', error);
      // Force reload som fallback
      window.location.reload();
    }
  };

  const closeUpdatePrompt = () => {
    setShowReloadPrompt(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Installasjons-dialog */}
      {!isInstalled && deferredPrompt && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <h3 className="font-semibold mb-1">Installer PlenPilot</h3>
          <p className="text-sm opacity-90">Få rask tilgang og offline-støtte!</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstallClick} className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors">Installer</button>
            <button onClick={() => setDeferredPrompt(null)} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Senere</button>
          </div>
        </div>
      )}

      {/* Oppdaterings-dialog */}
      {showReloadPrompt && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl animate-spin-slow">🔄</span>
            <div>
              <h3 className="font-bold">Ny versjon tilgjengelig!</h3>
              <p className="text-sm opacity-90">Oppdater for å få de nyeste funksjonene</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdateClick} className="bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition-all transform hover:scale-105">Oppdater nå</button>
            <button onClick={closeUpdatePrompt} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Senere</button>
          </div>
        </div>
      )}
      
      {/* Offline-klar toast */}
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