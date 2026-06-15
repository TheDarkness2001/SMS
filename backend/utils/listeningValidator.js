const { analyzeSentenceAnswer } = require('./sentenceValidator');

/**
 * Analyze a listening dictation answer against the official script.
 * Returns word-level accuracy as a percentage.
 */
function analyzeListeningAnswer(script, userAnswer) {
  const analysis = analyzeSentenceAnswer(script, userAnswer);
  const totalWords = analysis.correctTokens.length;
  const correctWords = analysis.diff.filter(d => d.type === 'correct').length;
  const accuracyPercent = totalWords > 0
    ? Math.round((correctWords / totalWords) * 100)
    : 0;

  return {
    ...analysis,
    accuracyPercent,
    correctWords,
    totalWords,
    isCorrect: accuracyPercent === 100
  };
}

module.exports = { analyzeListeningAnswer };
