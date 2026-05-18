/**
 * Unicode Text Normalizer (Frontend)
 * ==================================
 * Mirrors backend/utils/textNormalizer.js for client-side preprocessing.
 * Normalizes apostrophes, quotes, and invisible Unicode characters
 * before sending to the API.
 */

// Apostrophe-like characters → ASCII apostrophe (')
const APOSTROPHE_LIKE = /[\u2018\u2019\u201A\u201B\u0060\u02BC\u02BD\u02BE\u02BF\u0313\u0314\u0315\u0374\u0375\u055A\u055B\u055D\u0670\uFF07\u2032\u2035\u2039\u203A\u301D\u301E\u301F]/g;

// Double-quote-like characters → ASCII double quote (")
const QUOTE_LIKE = /[\u201C\u201D\u201E\u201F\u2033\u2036\uFF02]/g;

// Invisible / zero-width characters → removed
const INVISIBLE_CHARS = /[\u200B-\u200F\uFEFF\u2060\u00AD\u180E]/g;

// Dash-like characters → ASCII hyphen
const DASH_LIKE = /[\u2010-\u2015]/g;

// Multiple whitespace variants → single ASCII space
const MULTIPLE_SPACES = /[\s\u00A0\u202F\u2007\u2008\u3000]+/g;

/**
 * Normalize text by replacing Unicode variants with ASCII equivalents.
 * @param {any} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  return (
    text
      .normalize('NFC')
      .replace(INVISIBLE_CHARS, '')
      .replace(APOSTROPHE_LIKE, "'")
      .replace(QUOTE_LIKE, '"')
      .replace(DASH_LIKE, '-')
      .replace(MULTIPLE_SPACES, ' ')
      .trim()
  );
}

/**
 * Comparison-safe normalization (includes lower-casing).
 * @param {any} text
 * @returns {string}
 */
export function normalizeForComparison(text) {
  return normalizeText(text).toLowerCase();
}

/**
 * Normalize an array of text answers.
 * @param {any[]} arr
 * @returns {string[]}
 */
export function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => normalizeText(item)).filter(Boolean);
}