/**
 * Rule-based listening answer checker.
 * Exact word matching only — no semantic or positional alignment.
 */

const PUNCTUATION_PATTERN = /[.,!?;:"'()[\]]/g;

function normalizeListeningText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .replace(PUNCTUATION_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitListeningWords(text) {
  const normalized = normalizeListeningText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function formatWordList(words) {
  return words.length > 0 ? words.join(', ') : '(none)';
}

function buildFormattedResult({
  correctWordsList,
  missingWords,
  extraWords,
  accuracyPercent,
  correctWords,
  totalWords,
  missingCount,
  extraCount
}) {
  return [
    'RESULT',
    '',
    '✔ Correct Words:',
    formatWordList(correctWordsList),
    '',
    '❌ Missing Words:',
    formatWordList(missingWords),
    '',
    '➕ Extra Words:',
    formatWordList(extraWords),
    '',
    '📊 Score:',
    `${accuracyPercent}%`,
    '',
    '📈 Summary:',
    `Words correct: ${correctWords} / ${totalWords}`,
    `Missing words: ${missingCount}`,
    `Extra words: ${extraCount}`
  ].join('\n');
}

function analyzeListeningAnswer(transcript, studentAnswer) {
  const transcriptWords = splitListeningWords(transcript);
  const studentWords = splitListeningWords(studentAnswer);

  if (transcriptWords.length === 0) {
    return { error: 'INVALID TRANSCRIPT' };
  }

  const studentPool = [...studentWords];
  const correctWordsList = [];
  const missingWords = [];

  for (const word of transcriptWords) {
    const matchIndex = studentPool.indexOf(word);
    if (matchIndex >= 0) {
      correctWordsList.push(word);
      studentPool.splice(matchIndex, 1);
    } else {
      missingWords.push(word);
    }
  }

  const extraWords = studentPool;
  const totalWords = transcriptWords.length;
  const correctWords = correctWordsList.length;
  const missingCount = missingWords.length;
  const extraCount = extraWords.length;
  const accuracyPercent = Math.round((correctWords / totalWords) * 100);

  const result = {
    accuracyPercent,
    correctWords,
    totalWords,
    correctWordsList,
    missingWords,
    extraWords,
    missingCount,
    extraCount,
    isCorrect: correctWords === totalWords && extraCount === 0,
    formattedResult: ''
  };

  result.formattedResult = buildFormattedResult(result);
  return result;
}

module.exports = {
  analyzeListeningAnswer,
  normalizeListeningText,
  splitListeningWords
};
