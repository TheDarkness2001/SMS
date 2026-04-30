const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs');
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
      // Strip HTML tags from cell content
      const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) cells.push(text);
    }

    // If we have at least 2 cells, treat first as English, second as Uzbek
    if (cells.length >= 2 && cells[0].length > 1 && cells[1].length > 1) {
      pairs.push({ english: cells[0], uzbek: cells[1] });
    }
  }

  return pairs;
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

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete uploaded file:', err);
    });

    // Try parsing pairs from raw text first
    let pairs = parsePairs(rawText);

    // If nothing found, try HTML table extraction
    if (pairs.length === 0 && html) {
      pairs = parseHtmlTablePairs(html);
    }

    // If still nothing, try parsing the HTML as text (sometimes paragraphs contain pairs)
    if (pairs.length === 0 && html) {
      const htmlText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      pairs = parsePairs(htmlText);
    }

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
      const english = item.english?.trim();
      const uzbek = item.uzbek?.trim();

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
        continue;
      }

      // Check for duplicates in memory (fast)
      if (existingSet.has(english.toLowerCase())) {
        skipped.push({ english, uzbek, reason: 'Duplicate in lesson' });
        continue;
      }

      // Check word count limit
      if (lesson.maxWords && (toCreate.length + lesson.wordIds.length) >= lesson.maxWords) {
        skipped.push({ english, uzbek, reason: 'Lesson word limit reached' });
        continue;
      }

      existingSet.add(english.toLowerCase()); // Prevent dupes within the import batch too
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
      const english = item.english?.trim();
      const uzbek = item.uzbek?.trim();

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
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
