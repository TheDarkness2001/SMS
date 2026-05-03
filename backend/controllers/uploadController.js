const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const JSZip = require('jszip');
const Word = require('../models/Word');
const Sentence = require('../models/Sentence');
const Lesson = require('../models/Lesson');

// Escape special regex characters in a string
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse raw text into English/Uzbek pairs.
 * Supports: pipe |, tab, arrow ->, dash -, colon :, comma,
 * Also detects English/Uzbek boundary by ASCII vs non-ASCII
 */
function parsePairs(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];

  for (const line of lines) {
    if (line.length < 3) continue;

    let english = '';
    let uzbek = '';

    // Try separators in order of specificity
    const separators = [
      { regex: /\s*→\s*/, join: ' → ' },
      { regex: /\s*\|\s*/, join: ' | ' },
      { regex: /\t+/, join: '\t' },
      { regex: /\s*->\s*/, join: ' -> ' },
      { regex: /\s*-\s+/, join: ' - ' },
      { regex: /\s*:\s+/, join: ': ' },
      { regex: /\s*,\s+/, join: ', ' },
    ];

    for (const sep of separators) {
      const parts = line.split(sep.regex);
      if (parts.length >= 2 && parts[0].trim().length > 1 && parts[1].trim().length > 1) {
        english = parts[0].trim();
        uzbek = parts.slice(1).join(sep.join).trim();
        break;
      }
    }

    // Fallback: detect boundary between English (ASCII) and Uzbek (non-ASCII)
    if (!english && !uzbek) {
      const words = line.split(/\s+/);
      if (words.length >= 2) {
        let splitIndex = -1;
        for (let i = 1; i < words.length; i++) {
          // Current word has non-ASCII chars (Uzbek/Cyrillic)
          if (/[^\x00-\x7F]/.test(words[i])) {
            splitIndex = i;
            break;
          }
        }
        if (splitIndex > 0) {
          english = words.slice(0, splitIndex).join(' ').trim();
          uzbek = words.slice(splitIndex).join(' ').trim();
        }
      }
    }

    if (english && uzbek && english.length > 1 && uzbek.length > 1) {
      pairs.push({ english, uzbek });
    }
  }

  return pairs;
}

/**
 * Extract pairs from HTML tables in a docx file.
 * mammoth.convertToHtml produces <table> elements.
 */
function parseHtmlTablePairs(html) {
  const pairs = [];
  // Match table rows: <tr>...</tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    // Extract cell contents: <td>...</td> or <th>...</th>
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      // Strip HTML tags from cell content, then aggressively clean
      let text = cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      text = cleanExtractedText(text);
      if (text) cells.push(text);
    }

    // Skip rows where any extracted text still looks like XML
    if (cells.some(c => looksLikeXml(c))) {
      continue;
    }

    // Only extract English | Uzbek (ignore extra columns like pronunciation, short meaning)
    if (cells.length >= 2 && cells[0].length > 1 && cells[1].length > 1) {
      pairs.push({ english: cells[0], uzbek: cells[1] });
    }
  }

  return pairs;
}

/**
 * Decode common XML/HTML entities in a string, including numeric entities.
 */
function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Strip XML-like tags from text and clean up whitespace.
 */
function stripXmlTags(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aggressively clean extracted text by removing Word XML residue,
 * decoding entities, and stripping tags. Run this as a final pass.
 */
function cleanExtractedText(str) {
  if (!str) return '';
  let text = str;
  // Repeatedly decode entities and strip tags until stable
  for (let i = 0; i < 3; i++) {
    const prev = text;
    text = decodeXmlEntities(text);
    text = stripXmlTags(text);
    if (text === prev) break;
  }
  // Remove Word namespace prefixes like w:, w14:, r:, etc.
  text = text.replace(/\b(?:w\d*|w14|r|rsid\w*|paraId|textId)\b/g, ' ');
  // Remove XML attribute patterns like w:w="0", w:type="auto"
  text = text.replace(/\w+:\w+="[^"]*"/g, ' ');
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Check if extracted text looks like raw XML tag soup.
 * Also detects HTML-encoded XML (&lt;w:...&gt;) before decoding.
 */
function looksLikeXml(str) {
  if (!str) return false;
  // Check for raw XML tags
  const rawTagMatches = str.match(/<[\/?!?]?[\w:-]+[^>]*>/g);
  if (rawTagMatches && rawTagMatches.length > 2) {
    const tagCharCount = rawTagMatches.join('').length;
    if (tagCharCount > str.length * 0.3) return true;
  }
  // Check for HTML-encoded XML tags (&lt;w:...&gt;)
  const encodedTagMatches = str.match(/&lt;\/?[\w:-]+[^&]*&gt;/g);
  if (encodedTagMatches && encodedTagMatches.length > 2) {
    const tagCharCount = encodedTagMatches.join('').length;
    if (tagCharCount > str.length * 0.3) return true;
  }
  // Check for Word-specific XML residue patterns
  if (/\b(?:w:tcPr|w:tcW|w:tr|w:tbl|w:pPr|w:rPr|w:hideMark|w:rsid|w14:paraId)\b/.test(str)) {
    return true;
  }
  return false;
}

/**
 * Parse .docx XML directly by reading word/document.xml from the ZIP.
 * Uses namespace-agnostic regex to handle different XML prefixes.
 */
async function parseDocxXmlTables(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) return [];

    const rows = [];
    // Namespace-agnostic: match <prefix:tr> or <tr>
    const rowRegex = /<(?:\w+:)?tr[\s>][\s\S]*?<\/(?:\w+:)?tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(documentXml)) !== null) {
      const rowXml = rowMatch[0];
      const cells = [];
      // Namespace-agnostic: match <prefix:tc> or <tc>
      const cellRegex = /<(?:\w+:)?tc[\s>][\s\S]*?<\/(?:\w+:)?tc>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
        const cellXml = cellMatch[0];
        // Extract all <prefix:t> text within the cell
        const textParts = [];
        const textRegex = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/gi;
        let textMatch;
        while ((textMatch = textRegex.exec(cellXml)) !== null) {
          textParts.push(textMatch[1]);
        }
        let text = textParts.join('').trim();
        // Aggressively clean extracted text
        text = cleanExtractedText(text);
        cells.push(text);
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    // Convert rows to pairs
    const pairs = [];
    for (const cells of rows) {
      const firstCell = cells[0]?.toLowerCase().trim() || '';
      // Skip header rows
      if (firstCell.includes('word') || firstCell.includes('english') || firstCell.includes('pronunciation')) {
        continue;
      }
      // Skip rows where extracted text still looks like XML (check all cells)
      if (cells.some(c => looksLikeXml(c))) {
        continue;
      }

      if (cells.length >= 2 && cells[0].length > 1 && cells[1].length > 1) {
        pairs.push({ english: cells[0], uzbek: cells[1] });
      }
    }

    return pairs;
  } catch (err) {
    console.error('Direct XML parse error:', err);
    return [];
  }
}

// Upload and parse Word (.docx) file
exports.parseDocx = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Extract raw text
    const textResult = await mammoth.extractRawText({ path: filePath });
    const rawText = textResult.value;

    // Also convert to HTML to extract tables
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const html = htmlResult.value;

    // Strategy 1: Try direct XML parsing from .docx ZIP (most reliable for tables)
    let pairs = await parseDocxXmlTables(filePath);

    // Strategy 2: Try HTML table extraction from mammoth
    if (pairs.length < 5 && html) {
      const htmlPairs = parseHtmlTablePairs(html);
      if (htmlPairs.length > pairs.length) {
        pairs = htmlPairs;
      }
    }

    // Strategy 3: If table parsing found little/nothing, try raw text
    if (pairs.length < 5) {
      const textPairs = parsePairs(rawText);
      if (textPairs.length > pairs.length) {
        pairs = textPairs;
      }
    }

    // Strategy 4: If still little/nothing, parse HTML as plain text
    if (pairs.length < 5 && html) {
      const htmlText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const htmlTextPairs = parsePairs(htmlText);
      if (htmlTextPairs.length > pairs.length) {
        pairs = htmlTextPairs;
      }
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete uploaded file:', err);
    });

    res.json({
      success: true,
      message: `Extracted ${pairs.length} items from document`,
      data: {
        pairs,
        rawText: rawText.substring(0, 3000)
      }
    });
  } catch (error) {
    console.error('Parse DOCX error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse document: ' + error.message });
  }
};

// Upload and parse image with OCR
exports.parseImageOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const filePath = req.file.path;

    // Run OCR with English + Uzbek language support
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+uzb', {
      logger: () => {} // Suppress verbose logging
    });

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete uploaded file:', err);
    });

    const pairs = parsePairs(text);

    res.json({
      success: true,
      message: `Extracted ${pairs.length} items from image`,
      data: {
        pairs,
        rawText: text.substring(0, 3000)
      }
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ success: false, message: 'Failed to process image: ' + error.message });
  }
};

// Bulk import words into a lesson (batch-optimized)
exports.bulkImportWords = async (req, res) => {
  try {
    const { lessonId, items } = req.body;

    if (!lessonId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'lessonId and items array are required' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Fetch ALL existing words in this lesson in ONE query
    const existingWords = await Word.find({ lessonId }).select('english').lean();
    const existingSet = new Set(existingWords.map(w => w.english.toLowerCase().trim()));

    const toCreate = [];
    const skipped = [];

    for (const item of items) {
      // Safety: clean any residual XML/entities that parsing might have missed
      const english = cleanExtractedText(item.english || '');
      const uzbek = cleanExtractedText(item.uzbek || '');

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
        continue;
      }

      // Reject if still looks like XML after cleanup
      if (looksLikeXml(english) || looksLikeXml(uzbek)) {
        skipped.push({ english, uzbek, reason: 'Contains XML markup' });
        continue;
      }

      // Check for duplicates in memory (fast) - same english + same uzbek in same lesson
      const dupKey = `${english.toLowerCase()}|${uzbek.toLowerCase()}`;
      if (existingSet.has(dupKey)) {
        skipped.push({ english, uzbek, reason: 'Duplicate in lesson' });
        continue;
      }

      // Check word count limit
      if (lesson.maxWords && (toCreate.length + lesson.wordIds.length) >= lesson.maxWords) {
        skipped.push({ english, uzbek, reason: 'Lesson word limit reached' });
        continue;
      }

      existingSet.add(dupKey); // Prevent dupes within the import batch too
      toCreate.push({ english, uzbek, lessonId });
    }

    // Batch insert all words at once
    let createdDocs = [];
    if (toCreate.length > 0) {
      createdDocs = await Word.insertMany(toCreate);
      lesson.wordIds.push(...createdDocs.map(w => w._id));
      await lesson.save();
    }

    res.status(201).json({
      success: true,
      message: `Imported ${createdDocs.length} words, skipped ${skipped.length}`,
      data: { created: createdDocs.length, skipped, words: createdDocs }
    });
  } catch (error) {
    console.error('Bulk import words error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Bulk import sentences into a lesson (batch-optimized)
exports.bulkImportSentences = async (req, res) => {
  try {
    const { lessonId, items } = req.body;

    if (!lessonId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'lessonId and items array are required' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Fetch ALL existing sentences in this lesson in ONE query
    const existingSentences = await Sentence.find({ lessonId }).select('english').lean();
    const existingSet = new Set(existingSentences.map(s => s.english.toLowerCase().trim()));

    const toCreate = [];
    const skipped = [];

    for (const item of items) {
      const english = cleanExtractedText(item.english || '');
      const uzbek = cleanExtractedText(item.uzbek || '');

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
        continue;
      }

      if (looksLikeXml(english) || looksLikeXml(uzbek)) {
        skipped.push({ english, uzbek, reason: 'Contains XML markup' });
        continue;
      }

      // Check for duplicates in memory (fast)
      if (existingSet.has(english.toLowerCase())) {
        skipped.push({ english, uzbek, reason: 'Duplicate in lesson' });
        continue;
      }

      existingSet.add(english.toLowerCase()); // Prevent dupes within the import batch too
      toCreate.push({ english, uzbek, lessonId });
    }

    // Batch insert all sentences at once
    let createdDocs = [];
    if (toCreate.length > 0) {
      createdDocs = await Sentence.insertMany(toCreate);
    }

    res.status(201).json({
      success: true,
      message: `Imported ${createdDocs.length} sentences, skipped ${skipped.length}`,
      data: { created: createdDocs.length, skipped, sentences: createdDocs }
    });
  } catch (error) {
    console.error('Bulk import sentences error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
