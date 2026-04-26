
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration for Android Installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Attempt to register service worker with a relative path
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service worker registered!', reg))
      .catch(err => {
        // Suppress specific origin errors common in preview environments
        if (err.message && err.message.includes('origin')) {
          console.warn('Service Worker skipped due to origin mismatch (Preview Mode)');
        } else {
          console.error('Service worker registration failed:', err);
        }
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
