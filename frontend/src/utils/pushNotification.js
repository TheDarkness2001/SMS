/**
 * Check if notifications are supported
 */
export const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission and return subscription JSON
 */
export const requestPushPermission = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Push notifications can only be requested in the browser');
  }

  console.log('[PushUtil] Checking browser support...');
  console.log('[PushUtil] Notification:', 'Notification' in window);
  console.log('[PushUtil] ServiceWorker:', 'serviceWorker' in navigator);
  console.log('[PushUtil] PushManager:', 'PushManager' in window);

  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  try {
    // Request permission
    console.log('[PushUtil] Requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('[PushUtil] Permission result:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Wait for service worker to be ready
    console.log('[PushUtil] Waiting for service worker...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[PushUtil] Service worker ready:', registration.scope);

    // Get VAPID public key from env
    const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    console.log('[PushUtil] VAPID key configured:', !!vapidPublicKey);
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }

    // Check for existing subscription
    console.log('[PushUtil] Checking for existing subscription...');
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[PushUtil] Existing subscription found, checking VAPID key...');
      // If we have a subscription, we might want to check if it's still valid or unsubscribe/resubscribe
      // to ensure the VAPID key matches.
      // For now, let's keep it if it exists, or optionally unsubscribe.
      // await subscription.unsubscribe();
      // subscription = null;
    }

    if (!subscription) {
      console.log('[PushUtil] Subscribing to push with key:', vapidPublicKey);
      
      // Add a timeout to the subscription
      const subscribePromise = registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push subscription timeout')), 15000)
      );

      subscription = await Promise.race([subscribePromise, timeoutPromise]);
    }
    
    // Return subscription as JSON string
    const subscriptionJson = JSON.stringify(subscription);
    console.log('[PushUtil] Subscription successful');
    
    return subscriptionJson;
  } catch (error) {
    console.error('[PushUtil] Error requesting permission:', error);
    console.error('[PushUtil] Error name:', error.name);
    console.error('[PushUtil] Error message:', error.message);
    throw error;
  }
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PushUtil] Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('[PushUtil] Service Worker registration failed:', error);
      throw error;
    }
  } else {
    console.warn('[PushUtil] Service Workers not supported in this browser');
  }
};
