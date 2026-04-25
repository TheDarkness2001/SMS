import React, { useState, useEffect } from 'react';
import { sentenceAPI } from '../../utils/api';

const SentencePractice = ({ t }) => {
  const [sentence, setSentence] = useState(null);
  const [answer, setAnswer] = useState('');
  const [direction, setDirection] = useState('enToUz'); // enToUz or uzToEn
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchSentence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await sentenceAPI.getCategories();
      if (res.data.success) setCategories(res.data.data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchSentence = async () => {
    setLoading(true);
    setFeedback(null);
    setAnswer('');
    try {
      const res = await sentenceAPI.getRandom(category || undefined);
      if (res.data.success) {
        setSentence(res.data.data.sentence);
      }
    } catch (err) {
      console.error('Error fetching sentence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!answer.trim() || !sentence) return;
    try {
      const res = await sentenceAPI.checkAnswer({
        sentenceId: sentence._id,
        answer: answer.trim(),
        direction
      });
      if (res.data.success) {
        const isCorrect = res.data.data.isCorrect;
        setFeedback({
          isCorrect,
          correctAnswer: res.data.data.correctAnswer,
          yourAnswer: res.data.data.yourAnswer
        });
        setSessionStats(prev => ({
          total: prev.total + 1,
          correct: prev.correct + (isCorrect ? 1 : 0)
        }));
      }
    } catch (err) {
      console.error('Error checking answer:', err);
    }
  };

  const handleNext = () => {
    fetchSentence();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (feedback) {
        handleNext();
      } else {
        handleCheck();
      }
    }
  };

  const promptText = sentence
    ? direction === 'enToUz'
      ? t('sentences.translateToUzbek') || 'Translate this sentence to Uzbek:'
      : t('sentences.translateToEnglish') || 'Translate this sentence to English:'
    : '';

  const promptSentence = sentence
    ? direction === 'enToUz'
      ? sentence.english
      : sentence.uzbek
    : '';

  return (
    <div className="sentence-practice">
      <div className="practice-header-row">
        <div className="direction-toggle">
          <button
            className={`direction-btn ${direction === 'enToUz' ? 'active' : ''}`}
            onClick={() => { setDirection('enToUz'); setFeedback(null); setAnswer(''); }}
          >
            EN → UZ
          </button>
          <button
            className={`direction-btn ${direction === 'uzToEn' ? 'active' : ''}`}
            onClick={() => { setDirection('uzToEn'); setFeedback(null); setAnswer(''); }}
          >
            UZ → EN
          </button>
        </div>

        <div className="category-filter">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setFeedback(null); }}
            className="form-select"
          >
            <option value="">{t('sentences.allCategories') || 'All Categories'}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="session-stats-bar">
        <span>{t('sentences.session') || 'Session'}: {sessionStats.correct}/{sessionStats.total}</span>
        <span className="accuracy">
          {sessionStats.total > 0
            ? `${Math.round((sessionStats.correct / sessionStats.total) * 100)}%`
            : '0%'
          }
        </span>
      </div>

      {loading ? (
        <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
      ) : sentence ? (
        <div className="practice-card">
          <div className="prompt-section">
            <p className="prompt-label">{promptText}</p>
            <h3 className="prompt-sentence">{promptSentence}</h3>
          </div>

          <div className="answer-section">
            <input
              type="text"
              className={`form-input answer-input ${feedback ? (feedback.isCorrect ? 'correct' : 'incorrect') : ''}`}
              placeholder={
                direction === 'enToUz'
                  ? (t('sentences.typeUzbek') || 'Type Uzbek translation...')
                  : (t('sentences.typeEnglish') || 'Type English translation...')
              }
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!feedback}
            />

            {feedback && (
              <div className={`feedback-message ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="feedback-icon">{feedback.isCorrect ? '✅' : '❌'}</div>
                <div className="feedback-text">
                  <strong>{feedback.isCorrect ? (t('homework.correct') || 'Correct!') : (t('homework.incorrect') || 'Incorrect')}</strong>
                  {!feedback.isCorrect && (
                    <div className="correct-answer">
                      {t('homework.correctAnswer') || 'Correct answer'}: {feedback.correctAnswer}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="practice-actions">
            {!feedback ? (
              <button className="btn btn-primary" onClick={handleCheck} disabled={!answer.trim()}>
                {t('homework.checkAnswer') || 'Check Answer'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleNext}>
                {t('homework.next') || 'Next'} →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="no-data">
          {t('sentences.noSentences') || 'No sentences available yet.'}
        </div>
      )}
    </div>
  );
};

export default SentencePractice;
