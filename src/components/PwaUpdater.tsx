// src/components/PwaUpdater.tsx - Simplified version for auto-generated SW

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered: ', swUrl);
      // Check for updates periodically
      if (r) {
        setInterval(() => {
          console.log('Checking for SW updates...');
          r.update();
        }, 60 * 60 * 1000); // Every hour
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  // Handle install prompt
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('Install prompt captured');
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('App installed');
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
      console.log('User accepted installation');
      setDeferredPrompt(null);
    } else {
      console.log('User dismissed installation');
    }
  };

  const handleUpdateClick = () => {
    updateServiceWorker(true);
  };

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {!isInstalled && deferredPrompt && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <h3 className="font-semibold mb-1">Install PlenPilot</h3>
          <p className="text-sm opacity-90">Get quick access and offline support!</p>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleInstallClick} 
              className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors"
            >
              Install
            </button>
            <button 
              onClick={() => setDeferredPrompt(null)} 
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {(offlineReady || needRefresh) && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔄</span>
            <div>
              <h3 className="font-bold">
                {offlineReady ? 'App ready to work offline!' : 'New version available!'}
              </h3>
              <p className="text-sm opacity-90">
                {offlineReady 
                  ? 'You can now use the app without internet.' 
                  : 'Update to get the latest features'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {needRefresh && (
              <button 
                onClick={handleUpdateClick}
                className="px-4 py-2 rounded font-semibold transition-all transform bg-white text-blue-600 hover:bg-blue-50 hover:scale-105"
              >
                Update now
              </button>
            )}
            <button 
              onClick={closePrompt}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors"
            >
              {needRefresh ? 'Later' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default PwaUpdater;