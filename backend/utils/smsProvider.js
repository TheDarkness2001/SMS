/**
 * SMS Provider Abstraction
 * This can be extended to use Twilio, Eskiz (Uzbekistan), etc.
 */

/**
 * Send SMS notification to a phone number
 * @param {string} phoneNumber - Recipient phone number (e.g. +998...)
 * @param {string} message - SMS body text
 */
const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) return { success: false, message: 'No phone number provided' };

  try {
    // Log the intent for now
    console.log(`[SMSProvider] Sending SMS to ${phoneNumber}:`, message);

    /**
     * EXAMPLE ESKIZ.UZ IMPLEMENTATION:
     * 
     * const axios = require('axios');
     * // ... handle token auth ...
     * const response = await axios.post('https://notify.eskiz.uz/api/message/sms/send', {
     *   mobile_phone: phoneNumber.replace(/\+/g, ''),
     *   message: message,
     *   from: '4546' // or your alpha-name
     * });
     * return { success: true, response: response.data };
     */

    return { success: true, message: 'SMS sent (logged)' };
  } catch (error) {
    console.error('[SMSProvider] Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSMS
};
