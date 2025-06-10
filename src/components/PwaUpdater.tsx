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
  const [isReloadingForUpdate, setIsReloadingForUpdate] = useState(false); // Nytt state flagg

  const baseUrl = import.meta.env.BASE_URL || '/Lawncare/';
  
  const reloadApp = () => {
    console.log('PwaUpdater: reloadApp() kalt. isReloadingForUpdate:', isReloadingForUpdate);
    // Forhindre flere reloads hvis en allerede er i gang (selv om nettleseren vanligvis stopper JS)
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
    // Legg til en markør for å unngå raske, doble reloads hvis noe går galt
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'reloadingForUpdate=true';

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
        }, 60 * 60 * 1000); // Hver time
      }
    },
    onRegisterError(error) {
      console.log('PwaUpdater: SW registreringsfeil:', error);
    },
    // onNeedRefresh og onOfflineReady callbacks er håndtert via state-variablene.
  });

  // Lytt etter SW_ACTIVATED melding fra SW (som en sekundær mekanisme)
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('PwaUpdater: Mottok SW_ACTIVATED fra service worker.');
        if (!isReloadingForUpdate) {
          console.log('PwaUpdater: SW_ACTIVATED - Planlegger reload.');
          setIsReloadingForUpdate(true);
          // Liten forsinkelse for å la ting sette seg, og la controllerchange fyre først hvis mulig
          setTimeout(() => {
            console.log('PwaUpdater: SW_ACTIVATED - Utfører reload etter timeout.');
            reloadApp();
          }, 1000); // Litt lenger forsinkelse
        } else {
          console.log('PwaUpdater: SW_ACTIVATED - Reload allerede påbegynt/planlagt, ignorerer.');
        }
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

  // Håndter visning av oppdateringsprompt
  useEffect(() => {
    if (needRefresh && !isUpdating && !isReloadingForUpdate) {
      console.log('PwaUpdater useEffect[needRefresh, isUpdating, isReloadingForUpdate]: Viser reload prompt.');
      setShowReloadPrompt(true);
    } else if (showReloadPrompt && (!needRefresh || isUpdating || isReloadingForUpdate)) {
      // Skjul prompt hvis conditions ikke lenger møtes, og den er synlig
      console.log('PwaUpdater useEffect[needRefresh, isUpdating, isReloadingForUpdate]: Skjuler reload prompt.');
      setShowReloadPrompt(false);
    }
  }, [needRefresh, isUpdating, isReloadingForUpdate, showReloadPrompt]);
  
  useEffect(() => {
    if (offlineReady) {
      console.log('PwaUpdater: App klar for offline-bruk.');
    }
  }, [offlineReady]);

  // Håndter PWA installasjonsprompt
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
    console.log('PwaUpdater: Bruker trykket "Oppdater nå". isUpdating:', isUpdating, 'needRefresh:', needRefresh);
    if (isUpdating || !needRefresh || isReloadingForUpdate) {
      console.log('PwaUpdater: Oppdatering pågår allerede, ikke nødvendig, eller reload er planlagt.');
      return;
    }

    setIsUpdating(true);
    setShowReloadPrompt(false); // Skjul prompten umiddelbart

    let backupTimeoutId: number | undefined = undefined;

    const onControllerChange = () => {
      console.log('PwaUpdater: controllerchange event mottatt.');
      clearTimeout(backupTimeoutId); // Avbryt backup timeout
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
        console.log('PwaUpdater: Sender SKIP_WAITING til ventende SW:', registration.waiting);
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        console.warn('PwaUpdater: Ingen ventende SW funnet å sende SKIP_WAITING til. Muligens allerede aktivert.');
        // Hvis ingen ventende SW, kan den ha aktivert veldig raskt.
        // `controllerchange` kan allerede ha fyrt eller vil fyre snart.
        // Vi stoler fortsatt på `controllerchange` eller backup timeout.
      }

      // Start backup timeout *etter* forsøk på å sende SKIP_WAITING
      backupTimeoutId = window.setTimeout(() => {
        console.log('PwaUpdater: Backup timeout nådd for SW oppdatering.');
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); // Greit å prøve selv om {once: true}
        if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true);
          console.log('PwaUpdater: Backup timeout - Tvinger reload.');
          reloadApp();
        } else {
          console.log('PwaUpdater: Backup timeout - Reload allerede påbegynt/planlagt, ignorerer.');
        }
      }, 7000); // Litt lenger backup timeout

      // Viktig: Kall updateServiceWorker(false) for å informere vite-pwa-plugin
      // om at vi håndterer skipWaiting og reload manuelt.
      // Dette resetter dens interne `needRefresh`-state.
      console.log('PwaUpdater: Kaller updateServiceWorker(false) for å resette PWA state.');
      await updateServiceWorker(false); // false = ikke automatisk reload
      // Ikke sett setIsUpdating(false) her, siden siden skal reloade.
      // Etter reload vil isUpdating være false (initial state).

    } catch (error) {
      console.error('PwaUpdater: Feil under handleUpdateClick:', error);
      // Fallback: Prøv å resette state og tving en reload for å komme ut av en mulig feiltilstand
      clearTimeout(backupTimeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      
      // Resett state så brukeren ikke sitter fast med "Oppdaterer..."
      // isReloadingForUpdate vil håndtere selve reloaden
      if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true); // Sørg for at reload skjer
          console.log('PwaUpdater: Feil i update - Tvinger reload.');
          reloadApp();
      }
      // setIsUpdating(false); // Vil resettes ved reload
      // setShowReloadPrompt(false); // Vil resettes ved reload
      // setNeedRefresh(false); // La vite-plugin håndtere dette etter reload
    }
  };

  const closeUpdatePrompt = () => {
    console.log('PwaUpdater: Bruker trykket "Senere".');
    setShowReloadPrompt(false);
    // Brukeren ønsker ikke å oppdatere nå.
    // `needRefresh` vil forbli true, så prompten kan komme tilbake ved neste besøk/refresh
    // eller etter neste periodiske sjekk, med mindre vi eksplisitt resetter den
    // via updateServiceWorker(false)
    // For nå, la `needRefresh` være som den er.
    // updateServiceWorker(false); // Vurder om dette skal kalles for å "glemme" oppdateringen til neste sjekk
    setIsUpdating(false); // Sørg for at isUpdating er false hvis brukeren avbryter
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
            <button onClick={() => { console.log('PwaUpdater: Avviser installasjonsprompt.'); setDeferredPrompt(null);}} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Senere</button>
          </div>
        </div>
      )}

      {/* Oppdaterings-dialog */}
      {showReloadPrompt && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl animate-spin-slow">🔄</span> {/* Bruk en faktisk roterende emoji eller ikon */}
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