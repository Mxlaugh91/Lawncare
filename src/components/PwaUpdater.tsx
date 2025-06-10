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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReloadingForUpdate, setIsReloadingForUpdate] = useState(false);

  const baseUrl = import.meta.env.BASE_URL || '/Lawncare/';
  
  const reloadApp = () => {
    console.log('PwaUpdater: reloadApp() kalt. isReloadingForUpdate på kalltidspunkt:', isReloadingForUpdate);
    if (window.location.href.includes('reloadingForUpdate=true')) {
        console.log('PwaUpdater: Reload allerede i gang (markør i URL), avbryter ny reload.');
        return;
    }

    const currentHash = window.location.hash;
    console.log('PwaUpdater: Reloader app med HashRouter - current hash:', currentHash);
    
    let newUrl = window.location.origin + baseUrl;
    if (currentHash && currentHash !== '#/' && currentHash !== '#') {
      newUrl += currentHash;
    }
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'reloadingForUpdate=true';
    console.log('PwaUpdater: Navigerer til:', newUrl);
    window.location.href = newUrl;
  };

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PwaUpdater: SW registrert:', r);
      if (r) {
        setInterval(() => {
          console.log('PwaUpdater: Kjører periodisk r.update() for SW.');
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('PwaUpdater: SW registreringsfeil:', error);
    },
  });

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('PwaUpdater: Mottok SW_ACTIVATED fra service worker.');
        // MIDLERTIDIG DEAKTIVERT FOR FEILSØKING:
        console.log('PwaUpdater: SW_ACTIVATED - Reload-logikk er midlertidig deaktivert for test.');
        /*
        if (!isReloadingForUpdate) {
          console.log('PwaUpdater: SW_ACTIVATED - Planlegger reload (logikk er aktiv).');
          setIsReloadingForUpdate(true);
          setTimeout(() => {
            console.log('PwaUpdater: SW_ACTIVATED - Utfører reload etter timeout (logikk er aktiv).');
            reloadApp();
          }, 1000); 
        } else {
          console.log('PwaUpdater: SW_ACTIVATED - Reload allerede påbegynt/planlagt, ignorerer.');
        }
        */
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
  }, [isReloadingForUpdate]); // Viktig dependency

  useEffect(() => {
    if (needRefresh && !isUpdating && !isReloadingForUpdate) {
      console.log('PwaUpdater useEffect[needRefresh, isUpdating, isReloadingForUpdate]: Viser reload prompt.');
      setShowReloadPrompt(true);
    } else if (showReloadPrompt && (!needRefresh || isUpdating || isReloadingForUpdate)) {
      console.log('PwaUpdater useEffect[needRefresh, isUpdating, isReloadingForUpdate]: Skjuler reload prompt.');
      setShowReloadPrompt(false);
    }
  }, [needRefresh, isUpdating, isReloadingForUpdate, showReloadPrompt]);
  
  useEffect(() => {
    if (offlineReady) {
      console.log('PwaUpdater: App klar for offline-bruk.');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('PwaUpdater: beforeinstallprompt event fanget.');
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PwaUpdater: appinstalled event fanget.');
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
    console.log('PwaUpdater: handleInstallClick');
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PwaUpdater: Bruker aksepterte installasjon.');
      setDeferredPrompt(null);
    } else {
      console.log('PwaUpdater: Bruker avviste installasjon.');
    }
  };

  const handleUpdateClick = async () => {
    // VIKTIG LOGG: Sjekk om denne kalles én eller to ganger
    const clickTimestamp = Date.now();
    console.log(`PwaUpdater: handleUpdateClick ENTERED. Timestamp: ${clickTimestamp}. isUpdating: ${isUpdating}, needRefresh: ${needRefresh}, isReloadingForUpdate: ${isReloadingForUpdate}`);
    
    if (isUpdating || !needRefresh || isReloadingForUpdate) {
      console.log(`PwaUpdater: handleUpdateClick (${clickTimestamp}) - Avbryter: isUpdating=${isUpdating}, !needRefresh=${!needRefresh}, isReloadingForUpdate=${isReloadingForUpdate}`);
      return;
    }

    setIsUpdating(true);
    setShowReloadPrompt(false);

    let backupTimeoutId: number | undefined = undefined;

    const onControllerChange = () => {
      console.log(`PwaUpdater: controllerchange event mottatt. Timestamp: ${Date.now()}`);
      clearTimeout(backupTimeoutId); 
      if (!isReloadingForUpdate) {
        setIsReloadingForUpdate(true);
        console.log('PwaUpdater: controllerchange - Planlegger umiddelbar reload.');
        reloadApp();
      } else {
        console.log('PwaUpdater: controllerchange - Reload allerede påbegynt/planlagt, ignorerer.');
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        const skipWaitingId = `sw-skip-${Date.now()}`;
        console.log(`PwaUpdater: Sender SKIP_WAITING (ID: ${skipWaitingId}) til ventende SW:`, registration.waiting);
        registration.waiting.postMessage({ type: 'SKIP_WAITING', id: skipWaitingId });
      } else {
        console.warn('PwaUpdater: Ingen ventende SW funnet å sende SKIP_WAITING til. Muligens allerede aktivert.');
      }

      backupTimeoutId = window.setTimeout(() => {
        console.log(`PwaUpdater: Backup timeout nådd for SW oppdatering. Timestamp: ${Date.now()}`);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true);
          console.log('PwaUpdater: Backup timeout - Tvinger reload.');
          reloadApp();
        } else {
          console.log('PwaUpdater: Backup timeout - Reload allerede påbegynt/planlagt, ignorerer.');
        }
      }, 7000); 

      console.log(`PwaUpdater (${clickTimestamp}): Kaller updateServiceWorker(false) for å resette PWA state.`);
      await updateServiceWorker(false); 

    } catch (error) {
      console.error(`PwaUpdater (${clickTimestamp}): Feil under handleUpdateClick:`, error);
      clearTimeout(backupTimeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      
      if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true);
          console.log('PwaUpdater: Feil i update - Tvinger reload.');
          reloadApp();
      }
    }
  };

  const closeUpdatePrompt = () => {
    console.log('PwaUpdater: Bruker trykket "Senere".');
    setShowReloadPrompt(false);
    setIsUpdating(false); 
  };

  return (
    <>
      {!isInstalled && deferredPrompt && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <h3 className="font-semibold mb-1">Installer PlenPilot</h3>
          <p className="text-sm opacity-90">Få rask tilgang og offline-støtte!</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstallClick} className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors">Installer</button>
            <button onClick={() => { console.log('PwaUpdater: Avviser installasjonsprompt.'); setDeferredPrompt(null);}} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Senere</button>
          </div>
        </div>
      )}

      {showReloadPrompt && (
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
              disabled={isUpdating || isReloadingForUpdate}
              className={`px-4 py-2 rounded font-semibold transition-all transform ${
                (isUpdating || isReloadingForUpdate)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105'
              }`}
            >
              {(isUpdating || isReloadingForUpdate) ? 'Oppdaterer...' : 'Oppdater nå'}
            </button>
            <button 
              onClick={closeUpdatePrompt} 
              disabled={isUpdating || isReloadingForUpdate}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Senere
            </button>
          </div>
        </div>
      )}
      
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