// Guard against third-party extension errors (e.g. MetaMask extension in sandboxed iframe)
if (typeof window !== 'undefined') {
  const isExtErr = (e: any) => {
    const text = String((e && (e.message || e.reason || e.stack)) || e || '');
    const filename = String((e && e.filename) || '');
    return (
      filename.includes('extension://') ||
      text.includes('MetaMask') ||
      text.includes('ethereum') ||
      text.includes('Failed to connect to MetaMask')
    );
  };
  window.addEventListener('error', (e) => {
    if (isExtErr(e.error || e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('unhandledrejection', (e) => {
    if (isExtErr(e.reason)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

