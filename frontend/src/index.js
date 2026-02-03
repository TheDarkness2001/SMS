import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './utils/pushNotification';

// CRITICAL: Log VAPID key at startup (earliest possible point)
console.log('[INDEX] Environment check:');
console.log('[INDEX] NODE_ENV:', process.env.NODE_ENV);
console.log('[INDEX] VAPID key exists:', !!process.env.REACT_APP_VAPID_PUBLIC_KEY);
console.log('[INDEX] VAPID key preview:', process.env.REACT_APP_VAPID_PUBLIC_KEY?.substring(0, 30) + '...');
console.log('[INDEX] All REACT_APP vars:', Object.keys(process.env).filter(k => k.startsWith('REACT_APP')));

// Register service worker for push notifications
if (process.env.NODE_ENV === 'production' || window.location.hostname === 'localhost') {
  registerServiceWorker().catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
