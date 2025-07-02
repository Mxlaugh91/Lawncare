import { HashRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import PwaUpdater from '@/components/PwaUpdater';
import '@/App.css';

function App() {
  return (
    <HashRouter>
      <PwaUpdater />
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;