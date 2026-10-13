// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n'; // Initialize i18n before rendering the app
import App, { AppErrorBoundary } from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
