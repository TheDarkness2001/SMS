/**
 * Unicode Text Normalizer
 * =======================
 * Normalizes apostrophes, quotes, and invisible Unicode characters
 * across all devices, keyboards, browsers, and operating systems.
 *
 * Problem solved:
 *   iPhone, Android, Windows, Mac, and various browsers produce different
 *   Unicode code points for visually identical characters. This causes
 *   answer mismatches, failed comparisons, and database inconsistencies.
 *
 * Usage:
 *   const { normalizeText, normalizeForComparison } = require('./utils/textNormalizer');
 *   const clean = normalizeText(rawUserInput);
 *   const comparable = normalizeForComparison(rawUserInput); // lower-cased
 */

// ------------------------------------------------------------------
// 1. Apostrophe-like characters → ASCII apostrophe (')
// ------------------------------------------------------------------
// U+2018  ‘   Left single quotation mark        (iOS auto-correct)
// U+2019  ’   Right single quotation mark       (iOS auto-correct, Windows curly)
// U+201A  ‚   Single low-9 quotation mark
// U+201B  ‛   Single high-reversed-9 quotation mark
// U+0060  `   Grave accent / backtick            (some keyboards)
// U+02BC  ʼ   Modifier letter apostrophe         (Unicode preferred for glottal stop)
// U+02BD  ҅   Modifier letter reversed comma
// U+02BE  ҆   Modifier letter right half ring
// U+02BF  ҇   Modifier letter left half ring
// U+0313  ̓   Combining comma above
// U+0314  ̔   Combining reversed comma above
// U+0315  ̕   Combining comma above right
// U+0374  ʹ   Greek numeral sign (looks like apostrophe)
// U+0375  ͵   Greek lower numeral sign
// U+055A  ՚   Armenian apostrophe
// U+055B  ՛   Armenian emphasis mark
// U+055D  ՝   Armenian comma
// U+0670  ٰ   Arabic letter superscript alef
// U+FF07  ＇  Fullwidth apostrophe               (CJK keyboards)
// U+2032  ′   Prime                              (math, looks like apostrophe)
// U+2035  ‵   Reversed prime
// U+2039  ‹   Single left-pointing angle quotation
// U+203A  ›   Single right-pointing angle quotation
// U+301D  〝   Reversed double prime quotation mark
// U+301E  〞   Double prime quotation mark
// U+301F  〟   Low double prime quotation mark
const APOSTROPHE_LIKE = /[\u2018\u2019\u201A\u201B\u0060\u02BC\u02BD\u02BE\u02BF\u0313\u0314\u0315\u0374\u0375\u055A\u055B\u055D\u0670\uFF07\u2032\u2035\u2039\u203A\u301D\u301E\u301F]/g;

// ------------------------------------------------------------------
// 2. Double-quote-like characters → ASCII double quote (")
// ------------------------------------------------------------------
// U+201C  "   Left double quotation mark         (iOS, Word auto-correct)
// U+201D  "   Right double quotation mark        (iOS, Word auto-correct)
// U+201E  "   Double low-9 quotation mark
// U+201F  "   Double high-reversed-9 quotation mark
// U+2033  ″   Double prime
// U+2036  ‶   Reversed double prime
// U+FF02  ＂  Fullwidth quotation mark           (CJK keyboards)
const QUOTE_LIKE = /[\u201C\u201D\u201E\u201F\u2033\u2036\uFF02]/g;

// ------------------------------------------------------------------
// 3. Invisible / zero-width characters → removed
// ------------------------------------------------------------------
// U+200B  Zero-width space           (copy-paste from web)
// U+200C  Zero-width non-joiner      (Persian/Arabic text)
// U+200D  Zero-width joiner          (emoji modifiers)
// U+200E  Left-to-right mark
// U+200F  Right-to-left mark
// U+FEFF  Byte order mark (BOM)      (files, copy-paste)
// U+2060  Word joiner
// U+00AD  Soft hyphen
// U+180E  Mongolian vowel separator  (deprecated but still appears)
const INVISIBLE_CHARS = /[\u200B-\u200F\uFEFF\u2060\u00AD\u180E]/g;

// ------------------------------------------------------------------
// 4. Dashes → normalized to regular hyphen or en-dash handling
// ------------------------------------------------------------------
// U+2010  ‐   Hyphen
// U+2011  ‑   Non-breaking hyphen
// U+2012  ‒   Figure dash
// U+2013  –   En dash                            (auto-correct on Mac/iOS)
// U+2014  —   Em dash
// U+2015  ―   Horizontal bar
const DASH_LIKE = /[\u2010-\u2015]/g;

// ------------------------------------------------------------------
// 5. Multiple whitespace / non-breaking space → single ASCII space
// ------------------------------------------------------------------
// U+00A0  Non-breaking space
// U+202F  Narrow no-break space
// U+2007  Figure space
// U+2008  Punctuation space
// U+3000  Ideographic space                     (CJK)
const MULTIPLE_SPACES = /[\s\u00A0\u202F\u2007\u2008\u3000]+/g;

// ------------------------------------------------------------------
// Core normalization function
// ------------------------------------------------------------------
function normalizeText(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  return (
    text
      .normalize('NFC')                  // Canonical composition (é as single char, not e + combining ´)
      .replace(INVISIBLE_CHARS, '')      // Strip zero-width chars / BOM
      .replace(APOSTROPHE_LIKE, "'")     // Unify all apostrophe-like glyphs
      .replace(QUOTE_LIKE, '"')          // Unify all double-quote-like glyphs
      .replace(DASH_LIKE, '-')           // Unify dashes to ASCII hyphen
      .replace(MULTIPLE_SPACES, ' ')     // Collapse all whitespace variants
      .trim()
  );
}

// ------------------------------------------------------------------
// Comparison-safe normalization (includes lower-casing)
// ------------------------------------------------------------------
function normalizeForComparison(text) {
  return normalizeText(text).toLowerCase();
}

// ------------------------------------------------------------------
// Array normalizer (for multi-answer inputs)
// ------------------------------------------------------------------
function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => normalizeText(item)).filter(Boolean);
}

module.exports = {
  normalizeText,
  normalizeForComparison,
  normalizeArray
};
