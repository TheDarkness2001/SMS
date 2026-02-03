/**
 * Format amount in UZS (Uzbek so'm)
 * Backend stores amounts in tyiyn (1/100 so'm), so we divide by 100
 * Display format: 125 500 so'm
 */
export const formatUZS = (amountInTyiyn, language = 'en') => {
  if (!amountInTyiyn && amountInTyiyn !== 0) {
    const symbol = language === 'ru' ? 'сум' : 'so\'m';
    return `0 ${symbol}`;
  }
  
  // Convert tyiyn to so'm (divide by 100)
  const amount = Math.round(amountInTyiyn / 100);
  
  // Format with space separators: 125 500
  const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  const symbol = language === 'ru' ? 'сум' : 'so\'m';
  return `${formatted} ${symbol}`;
};

/**
 * Parse UZS input (so'm) to tyiyn for backend
 * Input: 125500 (user enters in so'm)
 * Output: 12550000 (stored as tyiyn in backend)
 */
export const parseUZS = (amountInSom) => {
  const amount = parseFloat(amountInSom);
  if (isNaN(amount)) return 0;
  return Math.round(amount * 100); // Convert so'm to tyiyn
};

/**
 * Format transaction amount with direction
 * Positive for credits (green), negative for debits (red)
 */
export const formatTransactionAmount = (amount, direction, language = 'en') => {
  const formatted = formatUZS(amount, language);
  return direction === 'credit' ? `+${formatted}` : `-${formatted}`;
};

/**
 * Get transaction status color
 */
export const getTransactionStatusColor = (status) => {
  const colors = {
    pending: '#FFA500',    // Orange
    completed: '#28a745',  // Green
    failed: '#dc3545',     // Red
    reversed: '#6c757d'    // Gray
  };
  return colors[status] || '#6c757d';
};

/**
 * Get transaction type color
 */
export const getTransactionTypeColor = (type) => {
  const colors = {
    'top-up': '#28a745',         // Green
    'class-deduction': '#007bff', // Blue
    'penalty': '#dc3545',         // Red
    'refund': '#17a2b8',          // Cyan
    'adjustment': '#ffc107'       // Yellow
  };
  return colors[type] || '#6c757d';
};

/**
 * Legacy formatter for backward compatibility
 */
export const formatCurrency = (amount, currency = 'UZS') => {
  if (currency === 'UZS') {
    return formatUZS(amount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};