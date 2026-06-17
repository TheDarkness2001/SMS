/**
 * Rule-based listening chunk checker.
 * Splits transcript internally; compares ONE chunk at a time only.
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

function splitTranscriptIntoChunks(transcript) {
  const text = String(transcript || '').trim();
  if (!text) return [];
  if (!/[.!?]/.test(text)) return [text];
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function formatWordList(words) {
  return words.length > 0 ? words.join(', ') : '(none)';
}

function compareWordsForChunk(chunkText, studentAnswer) {
  const chunkWords = splitListeningWords(chunkText);
  const studentWords = splitListeningWords(studentAnswer);
  const studentPool = [...studentWords];
  const correctWordsList = [];
  const missingWords = [];

  for (const word of chunkWords) {
    const matchIndex = studentPool.indexOf(word);
    if (matchIndex >= 0) {
      correctWordsList.push(word);
      studentPool.splice(matchIndex, 1);
    } else {
      missingWords.push(word);
    }
  }

  const extraWords = studentPool;
  const totalWords = chunkWords.length;
  const correctWords = correctWordsList.length;
  const missingCount = missingWords.length;
  const extraCount = extraWords.length;
  const accuracyPercent = totalWords > 0
    ? Math.round((correctWords / totalWords) * 100)
    : 0;

  return {
    accuracyPercent,
    correctWords,
    totalWords,
    correctWordsList,
    missingWords,
    extraWords,
    missingCount,
    extraCount,
    isCorrect: totalWords > 0 && correctWords === totalWords && extraCount === 0
  };
}

function buildChunkFormattedResult({
  targetSentence,
  correctWordsList,
  missingWords,
  extraWords,
  accuracyPercent,
  chunkIndex,
  totalChunks
}) {
  return [
    'CHUNK RESULT',
    '',
    'Target Sentence:',
    targetSentence,
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
    '📈 Progress:',
    `Chunk ${chunkIndex + 1} of ${totalChunks}`
  ].join('\n');
}

function analyzeListeningChunk(transcript, studentAnswer, chunkIndex = 0) {
  const chunks = splitTranscriptIntoChunks(transcript);

  if (chunks.length === 0) {
    return { error: 'INVALID TRANSCRIPT' };
  }

  const index = Number.parseInt(chunkIndex, 10);
  if (!Number.isFinite(index) || index < 0 || index >= chunks.length) {
    return { error: 'INVALID CHUNK' };
  }

  const targetSentence = chunks[index];
  if (!targetSentence || !splitListeningWords(targetSentence).length) {
    return { error: 'INVALID CHUNK' };
  }

  const answerText = studentAnswer != null ? String(studentAnswer) : '';
  const comparison = compareWordsForChunk(targetSentence, answerText);
  const totalChunks = chunks.length;
  const hasNextChunk = index < totalChunks - 1;

  const result = {
    ...comparison,
    targetSentence,
    chunkIndex: index,
    totalChunks,
    hasNextChunk,
    formattedResult: ''
  };

  result.formattedResult = buildChunkFormattedResult(result);
  return result;
}

/** @deprecated Use analyzeListeningChunk */
function analyzeListeningAnswer(transcript, studentAnswer) {
  return analyzeListeningChunk(transcript, studentAnswer, 0);
}

module.exports = {
  analyzeListeningChunk,
  analyzeListeningAnswer,
  splitTranscriptIntoChunks,
  normalizeListeningText,
  splitListeningWords
};
