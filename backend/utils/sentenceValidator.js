/**
 * Sentence Answer Validator
 * Performs word-level diff and grammar analysis between correct answer and user answer.
 */

const ARTICLES = new Set(['a', 'an', 'the']);
const PUNCTUATION_REGEX = /[.,!?;:"']$/;

function tokenize(text) {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function normalizeWord(word) {
  return word.replace(/[.,!?;:"']$/, '');
}

/**
 * Strip non-period trailing punctuation (comma, semicolon, colon, exclamation, question mark, quote).
 * Periods are preserved because they are required at end of sentences.
 */
function stripNonPeriodPunctuation(word) {
  return word.replace(/[,;:!?"']$/, '');
}

function hasPunctuationDiff(wordA, wordB) {
  const pA = wordA.match(/[.,!?;:"']$/)?.[0] || '';
  const pB = wordB.match(/[.,!?;:"']$/)?.[0] || '';
  return pA !== pB;
}

function hasPeriodDiff(wordA, wordB) {
  const pA = wordA.endsWith('.') ? '.' : '';
  const pB = wordB.endsWith('.') ? '.' : '';
  return pA !== pB;
}

/**
 * Compute word-level diff using a greedy alignment.
 */
function computeDiff(correctTokens, userTokens) {
  const diff = [];
  let i = 0, j = 0;

  while (i < correctTokens.length || j < userTokens.length) {
    const c = correctTokens[i];
    const u = userTokens[j];

    if (i >= correctTokens.length) {
      diff.push({ type: 'extra', word: u });
      j++;
      continue;
    }
    if (j >= userTokens.length) {
      diff.push({ type: 'missing', word: c });
      i++;
      continue;
    }

    const cStripped = stripNonPeriodPunctuation(c);
    const uStripped = stripNonPeriodPunctuation(u);

    if (c === u) {
      diff.push({ type: 'correct', word: c });
      i++;
      j++;
    } else if (cStripped === uStripped) {
      // Words match when ignoring non-period punctuation (comma, semicolon, etc.)
      diff.push({ type: 'correct', word: c });
      i++;
      j++;
    } else if (normalizeWord(c) === normalizeWord(u)) {
      // Same base word, difference is only punctuation
      if (hasPeriodDiff(c, u)) {
        diff.push({ type: 'missingPeriod', expected: c, got: u });
      } else {
        diff.push({ type: 'punctuation', expected: c, got: u });
      }
      i++;
      j++;
    } else {
      // Look ahead for a match within next 2 tokens
      let foundMatch = false;
      for (let lookAhead = 1; lookAhead <= 2 && !foundMatch; lookAhead++) {
        if (i + lookAhead < correctTokens.length && correctTokens[i + lookAhead] === u) {
          // Missing word(s) from correct
          for (let k = 0; k < lookAhead; k++) {
            diff.push({ type: 'missing', word: correctTokens[i + k] });
          }
          i += lookAhead;
          foundMatch = true;
        } else if (j + lookAhead < userTokens.length && correctTokens[i] === userTokens[j + lookAhead]) {
          // Extra word(s) from user
          for (let k = 0; k < lookAhead; k++) {
            diff.push({ type: 'extra', word: userTokens[j + k] });
          }
          j += lookAhead;
          foundMatch = true;
        }
      }

      if (!foundMatch) {
        // Wrong word
        diff.push({ type: 'wrong', expected: c, got: u });
        i++;
        j++;
      }
    }
  }

  return diff;
}

function detectCategories(diff) {
  const categories = new Set();
  const normalizedMissing = [];
  const normalizedWrong = [];

  for (const item of diff) {
    if (item.type === 'missing') {
      const w = normalizeWord(item.word);
      normalizedMissing.push(w);
      if (ARTICLES.has(w)) {
        categories.add('missingArticle');
      } else {
        categories.add('missingWords');
      }
    } else if (item.type === 'extra') {
      const w = normalizeWord(item.word);
      if (ARTICLES.has(w)) {
        categories.add('wrongArticle');
      } else {
        categories.add('extraWords');
      }
    } else if (item.type === 'wrong') {
      const exp = normalizeWord(item.expected);
      const got = normalizeWord(item.got);
      normalizedWrong.push({ expected: exp, got });
      if (ARTICLES.has(exp) && ARTICLES.has(got)) {
        categories.add('wrongArticle');
      } else {
        categories.add('wrongWord');
      }
    } else if (item.type === 'punctuation') {
      categories.add('missingPunctuation');
    } else if (item.type === 'missingPeriod') {
      categories.add('missingPeriod');
    }
  }

  // Detect wrong word order: same multiset of words but different sequence
  const allExpected = diff
    .filter(d => d.type === 'correct' || d.type === 'missing' || d.type === 'wrong')
    .map(d => normalizeWord(d.word || d.expected))
    .sort();
  const allGot = diff
    .filter(d => d.type === 'correct' || d.type === 'extra' || d.type === 'wrong')
    .map(d => normalizeWord(d.word || d.got))
    .sort();

  const hasSameWords = JSON.stringify(allExpected) === JSON.stringify(allGot);
  const hasWrongOrMissing = diff.some(d => d.type === 'wrong' || d.type === 'missing' || d.type === 'extra');
  if (hasSameWords && hasWrongOrMissing) {
    categories.add('wrongWordOrder');
  }

  return Array.from(categories);
}

function computeSimilarity(correctTokens, userTokens) {
  const correctSet = new Set(correctTokens.map(normalizeWord));
  const userSet = new Set(userTokens.map(normalizeWord));
  const intersection = new Set([...correctSet].filter(x => userSet.has(x)));
  const union = new Set([...correctSet, ...userSet]);
  return union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 0;
}

/**
 * Analyze a sentence answer and return detailed feedback.
 */
function analyzeSentenceAnswer(correct, userAnswer) {
  const correctTrimmed = correct.trim();
  const userTrimmed = userAnswer.trim();

  // Correct if no real errors (wrong/missing/extra words or missing period).
  // Comma/semicolon/exclamation differences are ignored.
  const hasRealErrors = diff.some(d => ['wrong', 'missing', 'extra', 'missingPeriod'].includes(d.type));
  const isCorrect = !hasRealErrors;

  const correctTokens = tokenize(correctTrimmed);
  const userTokens = tokenize(userTrimmed);

  const diff = computeDiff(correctTokens, userTokens);
  const categories = detectCategories(diff);
  const similarityScore = computeSimilarity(correctTokens, userTokens);

  return {
    isCorrect,
    diff,
    categories,
    similarityScore,
    correctTokens,
    userTokens
  };
}

module.exports = { analyzeSentenceAnswer };
