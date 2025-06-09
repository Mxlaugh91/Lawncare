import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { useLocationStore } from '@/store/locationStore';
import { useEffect } from 'react';
import AppRoutes from '@/routes/AppRoutes';
import PwaUpdater from '@/components/PwaUpdater'; // <-- 1. IMPORTER DEN NYE KOMPONENTEN HER
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
    <BrowserRouter basename="/Lawncare">
      <AuthProvider>
        <PwaUpdater /> {/* <-- 2. LEGG TIL KOMPONENTEN HER */}
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;