// PwaUpdater.tsx - Updated for manual registration

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
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReloadingForUpdate, setIsReloadingForUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  const baseUrl = import.meta.env.BASE_URL || '/Lawncare/';
  
  const reloadApp = () => {
    console.log('PwaUpdater: reloadApp() called. isReloadingForUpdate:', isReloadingForUpdate);
    if (window.location.href.includes('reloadingForUpdate=true')) {
        console.log('PwaUpdater: Reload already in progress, aborting new reload.');
        return;
    }

    const currentHash = window.location.hash;
    console.log('PwaUpdater: Reloading app with HashRouter - current hash:', currentHash);
    
    let newUrl = window.location.origin + baseUrl;
    if (currentHash && currentHash !== '#/' && currentHash !== '#') {
      newUrl += currentHash;
    }
    newUrl += (newUrl.includes('?') ? '&' : '?') + 'reloadingForUpdate=true';
    console.log('PwaUpdater: Navigating to:', newUrl);
    window.location.href = newUrl;
  };

  // Manual service worker registration
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          console.log('PwaUpdater: Registering service worker...');
          const reg = await navigator.serviceWorker.register(`${baseUrl}sw.js`, {
            scope: baseUrl,
          });
          
          setRegistration(reg);
          console.log('PwaUpdater: Service worker registered:', reg);

          // Check for updates periodically
          setInterval(() => {
            console.log('PwaUpdater: Checking for service worker updates...');
            reg.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for waiting service worker
          if (reg.waiting) {
            setShowReloadPrompt(true);
          }

          reg.addEventListener('updatefound', () => {
            console.log('PwaUpdater: Update found!');
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('PwaUpdater: New service worker installed, showing update prompt');
                  setShowReloadPrompt(true);
                }
              });
            }
          });

          // Check if app is ready for offline use
          if (reg.active) {
            setOfflineReady(true);
          }

        } catch (error) {
          console.error('PwaUpdater: Service worker registration failed:', error);
        }
      }
    };

    registerSW();
  }, [baseUrl]);

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('PwaUpdater: Received SW_ACTIVATED from service worker.');
        console.log('PwaUpdater: SW_ACTIVATED - Reload logic is disabled for testing.');
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

  // Handle install prompt
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('PwaUpdater: beforeinstallprompt event captured.');
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PwaUpdater: appinstalled event captured.');
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
      console.log('PwaUpdater: User accepted installation.');
      setDeferredPrompt(null);
    } else {
      console.log('PwaUpdater: User dismissed installation.');
    }
  };

  const handleUpdateClick = async () => {
    const clickTimestamp = Date.now();
    console.log(`PwaUpdater: handleUpdateClick ENTERED. Timestamp: ${clickTimestamp}`);
    
    if (isUpdating || !registration?.waiting || isReloadingForUpdate) {
      console.log(`PwaUpdater: handleUpdateClick (${clickTimestamp}) - Aborting: isUpdating=${isUpdating}, waiting=${!!registration?.waiting}, isReloadingForUpdate=${isReloadingForUpdate}`);
      return;
    }

    setIsUpdating(true);
    setShowReloadPrompt(false);

    let backupTimeoutId: number | undefined = undefined;

    const onControllerChange = () => {
      console.log(`PwaUpdater: controllerchange event received. Timestamp: ${Date.now()}`);
      clearTimeout(backupTimeoutId); 
      if (!isReloadingForUpdate) {
        setIsReloadingForUpdate(true);
        console.log('PwaUpdater: controllerchange - Scheduling immediate reload.');
        reloadApp();
      } else {
        console.log('PwaUpdater: controllerchange - Reload already in progress, ignoring.');
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

    try {
      if (registration?.waiting) {
        const skipWaitingId = `sw-skip-${Date.now()}`;
        console.log(`PwaUpdater: Sending SKIP_WAITING (ID: ${skipWaitingId}) to waiting SW:`, registration.waiting);
        registration.waiting.postMessage({ type: 'SKIP_WAITING', id: skipWaitingId });
      } else {
        console.warn('PwaUpdater: No waiting SW found to send SKIP_WAITING to.');
      }

      backupTimeoutId = window.setTimeout(() => {
        console.log(`PwaUpdater: Backup timeout reached for SW update. Timestamp: ${Date.now()}`);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true);
          console.log('PwaUpdater: Backup timeout - Forcing reload.');
          reloadApp();
        } else {
          console.log('PwaUpdater: Backup timeout - Reload already in progress, ignoring.');
        }
      }, 7000); 

    } catch (error) {
      console.error(`PwaUpdater (${clickTimestamp}): Error during handleUpdateClick:`, error);
      clearTimeout(backupTimeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      
      if (!isReloadingForUpdate) {
          setIsReloadingForUpdate(true);
          console.log('PwaUpdater: Error in update - Forcing reload.');
          reloadApp();
      }
    }
  };

  const closeUpdatePrompt = () => {
    console.log('PwaUpdater: User clicked "Later".');
    setShowReloadPrompt(false);
    setIsUpdating(false); 
  };

  return (
    <>
      {!isInstalled && deferredPrompt && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up">
          <h3 className="font-semibold mb-1">Install PlenPilot</h3>
          <p className="text-sm opacity-90">Get quick access and offline support!</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstallClick} className="bg-white text-green-500 px-4 py-2 rounded font-medium hover:bg-green-50 transition-colors">Install</button>
            <button onClick={() => { console.log('PwaUpdater: Dismissing install prompt.'); setDeferredPrompt(null);}} className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors">Later</button>
          </div>
        </div>
      )}

      {showReloadPrompt && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up border-2 border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔄</span> 
            <div>
              <h3 className="font-bold">New version available!</h3>
              <p className="text-sm opacity-90">Update to get the latest features</p>
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
              {(isUpdating || isReloadingForUpdate) ? 'Updating...' : 'Update now'}
            </button>
            <button 
              onClick={closeUpdatePrompt} 
              disabled={isUpdating || isReloadingForUpdate}
              className="border border-white/50 text-white px-4 py-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Later
            </button>
          </div>
        </div>
      )}
      
      {offlineReady && !showReloadPrompt && (
         <div className="fixed bottom-5 left-5 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg animate-fade-in">
           <span className="flex items-center gap-2">
             <span>✅</span>
             <span>App works offline!</span>
           </span>
         </div>
       )}
    </>
  );
}

export default PwaUpdater;