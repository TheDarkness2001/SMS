const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

// Set VAPID details if keys are present
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * Send push notification to multiple subscriptions
 * @param {string[]} tokens - Array of subscription JSON strings
 * @param {Object} notification - { title, body, data }
 */
const sendPushNotification = async (tokens, { title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) {
    return { success: false, message: 'No tokens provided' };
  }

  // Safe fallback if VAPID keys missing
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[PushProvider] VAPID keys not configured. Would send:', {
      tokensCount: tokens.length,
      title,
      body
    });
    return { success: true, message: 'Push logged only (VAPID not configured)' };
  }

  const payload = JSON.stringify({
    title,
    body,
    data
  });

  // Send to all subscriptions
  const results = await Promise.allSettled(
    tokens.map(subscriptionJson => {
      try {
        const subscription = JSON.parse(subscriptionJson);
        return webpush.sendNotification(subscription, payload);
      } catch (err) {
        console.error('[PushProvider] Invalid subscription format:', err);
        return Promise.reject(err);
      }
    })
  );

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;

  console.log(`[PushProvider] Sent: ${successCount}/${tokens.length} notifications`);

  if (failureCount > 0) {
    console.warn(`[PushProvider] Failed: ${failureCount} notifications`);
  }

  return {
    success: successCount > 0,
    response: {
      sent: successCount,
      failed: failureCount,
      total: tokens.length
    }
  };
};

module.exports = {
  sendPushNotification
};
