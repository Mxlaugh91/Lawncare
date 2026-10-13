// src/components/PwaUpdater.tsx - PWA update strategy: automatic takeover
//
// Single update strategy (must stay in sync with registerType: 'autoUpdate' in
// vite.config.ts and src/sw.js):
//   1. the new service worker calls self.skipWaiting() + clients.claim(), so it
//      takes control immediately;
//   2. the page reloads exactly once when the new worker takes control
//      ("controllerchange").
// There is intentionally no waiting-worker / "new version available" prompt.

import { useEffect, useRef } from 'react';

function PwaUpdater() {
  // On the very first install there is no controller yet: skip the reload.
  const hadController = useRef(
    typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      !!navigator.serviceWorker.controller
  );

  useEffect(() => {
    if (!hadController.current || !('serviceWorker' in navigator)) return;

    let reloading = false;
    const handleControllerChange = () => {
      // Guard against reload loops if the event fires more than once.
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // No UI - the update happens automatically in the background.
  return null;
}

export default PwaUpdater;
