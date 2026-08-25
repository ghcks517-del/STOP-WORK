import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (window.location.pathname.startsWith('/admin')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/admin/manifest.webmanifest';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
