const xss = require('xss');

/**
 * Middleware to sanitize all input to prevent XSS attacks
 * Recursively sanitizes strings in request body and query parameters
 * EXCLUDES sensitive fields like passwords from sanitization
 */
const sanitizeInput = (req, res, next) => {
  // Sensitive fields that should NOT be sanitized (e.g., passwords with special chars)
  const sensitiveFields = ['password', 'confirmPassword', 'token', 'secret'];

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, sensitiveFields);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query, sensitiveFields);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params, sensitiveFields);
  }

  next();
};

/**
 * Recursively sanitize object properties
 * Converts strings with XSS-like content to safe plain text
 * @param {object} obj - Object to sanitize
 * @param {array} sensitiveFields - Fields to skip sanitization (passwords, tokens, etc.)
 */
function sanitizeObject(obj, sensitiveFields = []) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  if (typeof obj === 'string') {
    // Remove XSS attempts while preserving legitimate content
    return xss(obj, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoredTag: true,
      stripLeadingAndTrailingWhitespace: false
    });
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Skip sanitization for sensitive fields
        if (sensitiveFields.includes(key)) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = sanitizeObject(obj[key], sensitiveFields);
        }
      }
    }
    return sanitized;
  }

  return obj;
}

module.exports = sanitizeInput;
