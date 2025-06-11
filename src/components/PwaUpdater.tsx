// src/components/PwaUpdater.tsx

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';

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
      if (registration) {
        setInterval(() => {
          if (!isUpdating) { // Unngå sjekk hvis en oppdatering allerede er i gang
            console.log('PWAUpdater: Checking for SW updates...');
            registration.update();
          }
        }, 60 * 60 * 1000); // Hver time
      }
    },
    onRegisterError(error) {
      console.error('PWAUpdater: SW registration error:', error);
    },
    onOfflineReady() {
      console.log('PWAUpdater: App is ready for offline use');
    },
  });

  // Lytt etter SW_ACTIVATED meldingen fra din custom SW (valgfritt)
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('PWAUpdater: Received SW_ACTIVATED message. New SW is in control.');
        // updateServiceWorker(true) bør allerede ha håndtert reload via controllerchange.
        // Denne meldingen er mest for bekreftelse eller sekundær logikk hvis nødvendig.
        // For å unngå potensiell dobbel reload, kan vi la updateServiceWorker(true) styre.
        // Om ønskelig, kan du sette en flagg her og unngå reload hvis updateServiceWorker allerede har gjort det.
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
  }, []); // Tom dependency array, lytteren settes opp én gang

  // Håndter PWA installasjonsprompt
  useEffect(() => {
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
      setDeferredInstallPrompt(null);
    }
  };

  const handleUpdateClick = async () => {
    if (!needRefresh) return;

    setIsUpdating(true);
    console.log('PWAUpdater: User clicked "Update now", calling updateServiceWorker(true)');
    
    // Fallback timeout i tilfelle reloaden ikke skjer
    const updateTimeoutId = setTimeout(() => {
      console.warn('PWAUpdater: Update process seems to be taking too long. Resetting "isUpdating" state.');
      setIsUpdating(false);
      // Du kan også vurdere å tvinge en reload her hvis SW ikke tok over:
      // window.location.reload();
    }, 15000); // 15 sekunder timeout

    try {
      // updateServiceWorker(true) vil sende SKIP_WAITING og reloade siden
      // når den nye SW-en er aktiv (via controllerchange).
      await updateServiceWorker(true);
      // Hvis kallet fullfører uten å kaste feil (og siden reloader),
      // vil timeouten ikke ha så mye å si, men det er greit å fjerne den.
      clearTimeout(updateTimeoutId);
    } catch (error) {
      console.error('PWAUpdater: Error updating service worker:', error);
      setIsUpdating(false); // Resett ved feil
      clearTimeout(updateTimeoutId);
    }
  };

  const closeUpdatePrompt = () => {
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
      {/* PWA Installasjons-dialog */}
      {showInstallButton && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          {/* ... innhold ... */}
          <button onClick={handleInstallClick} className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors">Installer nå</button>
          <button onClick={() => setDeferredInstallPrompt(null)} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Senere</button>
        </div>
      )}

      {/* Oppdaterings-dialog */}
      {showUpdateDialog && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          {/* ... innhold ... */}
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
          <button onClick={closeUpdatePrompt} disabled={isUpdating} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50">Senere</button>
        </div>
      )}
      
      {/* "Klar for offline"-dialog */}
      {showOfflineReadyDialog && (
         <div className="fixed bottom-5 left-5 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg animate-fade-in">
           {/* ... innhold ... */}
           <button onClick={closeUpdatePrompt} className="bg-white text-green-600 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors">OK</button>
         </div>
       )}
    </>
  );
}

export default PwaUpdater;