import { Component, type ErrorInfo, type ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import PwaUpdater from '@/components/PwaUpdater';
import '@/App.css';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary. Several render paths can throw (for example a
 * missing Firestore Timestamp); without this the whole app would go blank with
 * no way for the user to recover.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Noe gikk galt</h1>
          <p className="text-sm text-muted-foreground">
            Appen støtte på en uventet feil. Last inn siden på nytt for å fortsette.
          </p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Last inn på nytt
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
