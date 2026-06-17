/**
 * Rule-based full-transcript listening checker.
 * Deterministic word matching only — no chunking or semantic analysis.
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

function getResultTier(accuracyPercent) {
  if (accuracyPercent < 70) return 'failed';
  if (accuracyPercent < 90) return 'partial';
  return 'passed';
}

function buildFormattedResult(accuracyPercent, missingWords, resultTier) {
  if (resultTier === 'failed') {
    return [
      'RESULT',
      '',
      `${accuracyPercent}%`,
      '',
      'TASK FAILED',
      '',
      'Try again'
    ].join('\n');
  }

  if (resultTier === 'partial') {
    return [
      'RESULT',
      '',
      `${accuracyPercent}%`,
      '',
      '❌ Missing Words',
      formatWordList(missingWords)
    ].join('\n');
  }

  const lines = [
    'RESULT',
    '',
    `${accuracyPercent}%`,
    ''
  ];

  if (missingWords.length > 0) {
    lines.push('❌ Missing Words', formatWordList(missingWords), '');
  }

  lines.push('✔ Passed');
  return lines.join('\n');
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

  const totalWords = transcriptWords.length;
  const correctWords = correctWordsList.length;
  const accuracyPercent = Math.round((correctWords / totalWords) * 100);
  const resultTier = getResultTier(accuracyPercent);

  const result = {
    accuracyPercent,
    correctWords,
    totalWords,
    missingWords,
    missingCount: missingWords.length,
    resultTier,
    taskFailed: resultTier === 'failed',
    passed: resultTier === 'passed',
    tryAgain: resultTier === 'failed',
    showMissingWords: resultTier !== 'failed',
    isCorrect: resultTier === 'passed',
    formattedResult: buildFormattedResult(accuracyPercent, missingWords, resultTier)
  };

  return result;
}

module.exports = {
  analyzeListeningAnswer,
  normalizeListeningText,
  splitListeningWords
};
