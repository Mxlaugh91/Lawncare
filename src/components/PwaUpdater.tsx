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
      console.log('SW oppdatert og aktivert');
      // Ikke automatisk reload her siden vi håndterer det manuelt i handleUpdateClick
    },
  });

  // onNeedRefresh og onOfflineReady vil bli trigget av useRegisterSW.
  // Vi setter showReloadPrompt til true når det er en oppdatering.
  useEffect(() => {
    if (needRefresh && !isUpdating) {
      setShowReloadPrompt(true);
    }
  }, [needRefresh, isUpdating]);
  
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
    
    if (isUpdating) {
      console.log('Oppdatering pågår allerede');
      return;
    }
    
    try {
      // Merk at oppdatering pågår
      setIsUpdating(true);
      
      // Skjul dialogen umiddelbart og merk at vi er i oppdateringsprosess
      setShowReloadPrompt(false);
      setNeedRefresh(false);
      
      // KRITISK: Kall updateServiceWorker(true) først for å resette tilstanden
      console.log('Kaller updateServiceWorker(true) for å resette tilstand');
      await updateServiceWorker(true);
      
      // Gi service worker tid til å oppdatere
      setTimeout(() => {
        console.log('Tvinger reload etter updateServiceWorker');
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Feil ved oppdatering av service worker:', error);
      // Resett state og force reload som fallback
      setIsUpdating(false);
      window.location.reload();
    }
  };

  const closeUpdatePrompt = () => {
    setShowReloadPrompt(false);
    setNeedRefresh(false);
    setIsUpdating(false);
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