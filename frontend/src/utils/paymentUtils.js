/**
 * Utility functions for payment operations
 */

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Get month name from month number
 * @param {number} monthNum - Month number (1-12)
 * @returns {string} Month name
 */
export const getMonthName = (monthNum) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || '';
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Normalize payment method
 * @param {string} method - Payment method
 * @returns {string} Normalized payment method
 */
export const normalizePaymentMethod = (method) => {
  if (!method) return 'cash';
  
  const methodMap = {
    'Cash': 'cash',
    'Card': 'card',
    'Bank Transfer': 'bank',
    'Online Payment': 'online'
  };
  
  return methodMap[method] || method.toLowerCase();
};

/**
 * Build payment map for fast lookups
 * @param {Array} payments - Array of payment objects
 * @returns {Object} Payment map with keys like `${studentId}_${subject}_${year}-${month}`
 */
export const buildPaymentMap = (payments) => {
  const map = {};
  (payments || []).forEach(payment => {
    const studentId = payment.student?._id || payment.studentId;
    const subject = payment.courseName;
    const year = payment.year;
    const month = payment.month;
    
    if (studentId && subject && year && month) {
      const key = `${studentId}_${subject}_${year}-${String(month).padStart(2, '0')}`;
      map[key] = payment;
    }
  });
  return map;
};

/**
 * Get payment key for lookup
 * @param {string} studentId - Student ID
 * @param {string} subject - Subject name
 * @param {string} dateStr - Date string in format YYYY-MM
 * @returns {string} Payment key
 */
export const getPaymentKey = (studentId, subject, dateStr) => {
  return `${studentId}_${subject}_${dateStr}`;
};