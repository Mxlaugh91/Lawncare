import { HashRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { useLocationStore } from '@/store/locationStore';
import { useEffect } from 'react';
import AppRoutes from '@/routes/AppRoutes';
import PwaUpdater from '@/components/PwaUpdater';
import '@/App.css';

function App() {
  const { initRealtimeUpdates, cleanup } = useLocationStore();

  useEffect(() => {
    // Initialize real-time updates
    initRealtimeUpdates();

    // Cleanup on unmount
    return () => cleanup();
  }, [initRealtimeUpdates, cleanup]);

  return (
    <HashRouter>
      <AuthProvider>
        <PwaUpdater />
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;