import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import 'react-quill-new/dist/quill.snow.css';
import './index.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.debug('SW registered: ', registration);
    }).catch(registrationError => {
      console.debug('SW registration failed: ', registrationError);
    });
  });
}

console.debug('Pulse Feeds: App initializing...');

// Remove boot loader once React kicks in
const hideBootLoader = () => {
  const loader = document.getElementById('boot-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

hideBootLoader();
console.debug('Pulse Feeds: Render initiated.');
