// src/components/PwaUpdater.tsx

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';

// Definerer typen for beforeinstallprompt-eventet for PWA-installasjon
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
  const [isUpdating, setIsUpdating] = useState(false); // For å vise "Oppdaterer..."

  const {
    offlineReady: [offlineReady, setOfflineReady], // Appen er klar for offline bruk
    needRefresh: [needRefresh, setNeedRefresh],   // En ny SW-versjon venter
    updateServiceWorker,                          // Funksjon for å oppdatere SW
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('PWAUpdater: Service Worker registrert:', swUrl);
      // Sjekk periodisk for oppdateringer hvis registreringsobjektet er tilgjengelig
      if (registration) {
        setInterval(() => {
          if (!isUpdating) { // Ikke sjekk for oppdateringer hvis en oppdatering allerede pågår
            console.log('PWAUpdater: Kjører periodisk sjekk for SW-oppdatering...');
            registration.update();
          }
        }, 60 * 60 * 1000); // Hver time
        console.log('PWAUpdater: Periodisk SW-oppdateringssjekk satt opp.');
      }
    },
    onRegisterError(error) {
      console.error('PWAUpdater: Feil ved SW-registrering:', error);
    },
    onOfflineReady() {
      console.log('PWAUpdater: App er nå klar for offline-bruk.');
      // Ingen grunn til å sette offlineReady-state her, det gjøres av hooken
    },
  });

  // Håndter PWA installasjonsprompt
  useEffect(() => {
    // Sjekk om appen kjører i standalone-modus (installert PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsPwaInstalled(true);
      console.log('PWAUpdater: Appen kjører i standalone-modus.');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Forhindre standard nettleserprompt
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
      console.log('PWAUpdater: "beforeinstallprompt" event fanget.');
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredInstallPrompt(null); // Fjern lagret prompt etter installasjon
      console.log('PWAUpdater: "appinstalled" event fanget.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Håndterer klikk på "Installer"-knappen
  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;
    
    await deferredInstallPrompt.prompt(); // Vis installasjonsprompten fra nettleseren
    const { outcome } = await deferredInstallPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWAUpdater: Bruker aksepterte PWA-installasjon.');
      setDeferredInstallPrompt(null); // Rydd opp
    } else {
      console.log('PWAUpdater: Bruker avviste PWA-installasjon.');
    }
  };

  // Håndterer klikk på "Oppdater nå"-knappen
  const handleUpdateClick = async () => {
    if (!needRefresh) return; // Skal ikke skje hvis knappen vises riktig

    setIsUpdating(true); // Vis "Oppdaterer..."
    console.log('PWAUpdater: Bruker trykket "Oppdater nå". Kaller updateServiceWorker(true).');
    
    // updateServiceWorker(true) vil:
    // 1. Sende SKIP_WAITING til den ventende SW.
    // 2. Når den nye SW har aktivert, vil den reloade siden.
    await updateServiceWorker(true);
    
    // setIsUpdating(false) er ikke strengt nødvendig her,
    // da siden vil reloade og komponenten nullstilles.
    // Men hvis reloaden skulle feile, kan det være lurt å ha en timeout for å resette.
    // For nå stoler vi på at reload skjer.
  };

  // Lukker "Oppdater nå" eller "Klar for offline"-prompten
  const closeUpdatePrompt = () => {
    console.log('PWAUpdater: Bruker lukket prompten.');
    if (needRefresh) {
      setNeedRefresh(false); // Skjul "Oppdater nå"-prompten
    }
    if (offlineReady) {
      setOfflineReady(false); // Skjul "Klar for offline"-prompten
    }
  };
  
  // Viser installasjonsknapp hvis appen ikke er installert og prompt er tilgjengelig
  const showInstallButton = !isPwaInstalled && deferredInstallPrompt;

  // Viser "Oppdater nå"-dialogen hvis needRefresh er true
  const showUpdateDialog = needRefresh;

  // Viser "Klar for offline"-dialogen hvis offlineReady er true OG ingen oppdatering venter
  const showOfflineReadyDialog = offlineReady && !needRefresh;

  return (
    <>
      {/* PWA Installasjons-knapp/dialog */}
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

      {/* Oppdaterings-dialog ("Oppdater nå") */}
      {showUpdateDialog && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl animate-spin-slow">🔄</span>
            <div>
              <h3 className="font-bold">Ny versjon tilgjengelig!</h3>
              <p className="text-sm opacity-90">Oppdater for å få de nyeste funksjonene.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleUpdateClick}
              disabled={isUpdating} // Deaktiver mens oppdatering pågår
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
      
      {/* "Klar for offline"-dialog */}
      {showOfflineReadyDialog && (
         <div className="fixed bottom-5 left-5 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
           <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="font-bold">Appen er klar offline!</h3>
              <p className="text-sm opacity-90">Du kan nå bruke appen uten internett.</p>
            </div>
          </div>
           <div className="flex justify-end">
            <button 
              onClick={closeUpdatePrompt}
              className="bg-white text-green-600 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors"
            >
              OK
            </button>
           </div>
         </div>
       )}
    </>
  );
}

export default PwaUpdater;