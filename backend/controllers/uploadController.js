const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const Word = require('../models/Word');
const Sentence = require('../models/Sentence');
const Lesson = require('../models/Lesson');

/**
 * Parse raw text into English/Uzbek pairs
 * Supports multiple formats:
 * - Pipe: English | Uzbek
 * - Comma: English, Uzbek
 * - Tab: English[tab]Uzbek
 * - Dash: English - Uzbek
 * - Colon: English: Uzbek
 * - Arrow: English -> Uzbek
 */
function parsePairs(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];

  for (const line of lines) {
    // Skip lines that look like headers or single words
    if (line.length < 3) continue;

    let english = '';
    let uzbek = '';

    // Try different separators in order of preference
    const separators = [
      { regex: /\s*\|\s*/, label: 'pipe' },
      { regex: /\s*->\s*/, label: 'arrow' },
      { regex: /\s*-\s+/, label: 'dash' },
      { regex: /\s*:\s*/, label: 'colon' },
      { regex: /\s*,\s*/, label: 'comma' },
      { regex: /\t+/, label: 'tab' },
    ];

    for (const sep of separators) {
      const parts = line.split(sep.regex);
      if (parts.length >= 2) {
        english = parts[0].trim();
        uzbek = parts.slice(1).join(sep.regex.source.replace(/\\s\*/g, ' ').replace(/\\t\+/g, ' ')).trim();
        break;
      }
    }

    // If no separator found, try splitting by detecting English vs non-English
    if (!english && !uzbek) {
      // Simple heuristic: split at first non-ASCII or after first word boundary
      const words = line.split(/\s+/);
      if (words.length >= 2) {
        // Try to find where English ends and Uzbek starts
        // English words typically contain only ASCII letters
        let splitIndex = words.length;
        for (let i = 1; i < words.length; i++) {
          const prevWord = words[i - 1];
          const currWord = words[i];
          // If previous is ASCII-only and current has non-ASCII, likely the split
          if (/^[a-zA-Z0-9\s.,!?';:]+$/.test(prevWord) && /[^\x00-\x7F]/.test(currWord)) {
            splitIndex = i;
            break;
          }
        }
        if (splitIndex < words.length) {
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

// Upload and parse Word (.docx) file
exports.parseDocx = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Extract raw text from docx
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;

    // Also try to get tables
    const tableResult = await mammoth.extractRawText({
      path: filePath,
      transform: (element) => {
        if (element.children) {
          return element.children.map(child => child.value).join('\t');
        }
        return element;
      }
    });

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete uploaded file:', err);
    });

    // Parse pairs from text
    let pairs = parsePairs(text);

    // If no pairs found with standard separators, try table parsing
    if (pairs.length === 0 && tableResult.value) {
      pairs = parsePairs(tableResult.value);
    }

    res.json({
      success: true,
      message: `Extracted ${pairs.length} items from document`,
      data: {
        pairs,
        rawText: text.substring(0, 2000) // Preview first 2000 chars
      }
    });
  } catch (error) {
    console.error('Parse DOCX error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse document', error: error.message });
  }
};

// Upload and parse image with OCR
exports.parseImageOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const filePath = req.file.path;

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+uzb', {
      logger: (m) => console.log(m)
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
        rawText: text.substring(0, 2000)
      }
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ success: false, message: 'Failed to process image', error: error.message });
  }
};

// Bulk import words into a lesson
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

    const created = [];
    const skipped = [];

    for (const item of items) {
      const english = item.english?.trim();
      const uzbek = item.uzbek?.trim();

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
        continue;
      }

      // Check for duplicates in this lesson
      const existing = await Word.findOne({ english: { $regex: new RegExp(`^${english}$`, 'i') }, lessonId });
      if (existing) {
        skipped.push({ english, uzbek, reason: 'Duplicate in lesson' });
        continue;
      }

      // Check word count limit
      if (lesson.maxWords && lesson.wordIds.length >= lesson.maxWords) {
        skipped.push({ english, uzbek, reason: 'Lesson word limit reached' });
        continue;
      }

      const word = await Word.create({ english, uzbek, lessonId });
      lesson.wordIds.push(word._id);
      created.push(word);
    }

    await lesson.save();

    res.status(201).json({
      success: true,
      message: `Imported ${created.length} words, skipped ${skipped.length}`,
      data: { created: created.length, skipped, words: created }
    });
  } catch (error) {
    console.error('Bulk import words error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Bulk import sentences into a lesson
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

    const created = [];
    const skipped = [];

    for (const item of items) {
      const english = item.english?.trim();
      const uzbek = item.uzbek?.trim();

      if (!english || !uzbek) {
        skipped.push({ ...item, reason: 'Missing english or uzbek' });
        continue;
      }

      // Check for duplicates
      const existing = await Sentence.findOne({
        english: { $regex: new RegExp(`^${english}$`, 'i') },
        lessonId
      });
      if (existing) {
        skipped.push({ english, uzbek, reason: 'Duplicate in lesson' });
        continue;
      }

      const sentence = await Sentence.create({ english, uzbek, lessonId });
      created.push(sentence);
    }

    res.status(201).json({
      success: true,
      message: `Imported ${created.length} sentences, skipped ${skipped.length}`,
      data: { created: created.length, skipped, sentences: created }
    });
  } catch (error) {
    console.error('Bulk import sentences error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
