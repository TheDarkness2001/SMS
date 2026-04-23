import React, { useState, useEffect, useCallback } from 'react';
import { lessonAPI } from '../../utils/api';

const QUESTION_TIME_LIMIT = 35; // 35 seconds per question

const ClassExam = ({ lessonId, lessonName, onFinish, onCancel, t }) => {
  const [examWords, setExamWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [examError, setExamError] = useState(null);

  useEffect(() => {
    const loadExam = async () => {
      try {
        const res = await lessonAPI.getExamWords(lessonId);
        if (res.data.success) {
          setExamWords(res.data.data.examWords);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        const status = err.response?.status;
        const message = err.response?.data?.message || 'Failed to load exam';
        if (status === 403) {
          setExamError(message);
          setLoading(false);
        } else {
          alert(message);
          onCancel();
        }
      }
    };
    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Per-question timer
  useEffect(() => {
    if (loading || finished || examWords.length === 0) return;
    setQuestionTimeLeft(QUESTION_TIME_LIMIT);
    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit empty answer when time runs out
          submitAnswerTimedOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading, finished, examWords.length]);

  const currentWord = examWords[currentIndex];

  const submitAnswerTimedOut = useCallback(() => {
    if (!currentWord) return;
    const newAnswer = {
      wordId: currentWord.id,
      answer: '',
      direction: currentWord.direction
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setAnswer('');

    if (currentIndex >= examWords.length - 1) {
      finishExam(newAnswers);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, currentIndex, examWords, answers]);

  const submitAnswer = useCallback(() => {
    if (!currentWord) return;
    const newAnswer = {
      wordId: currentWord.id,
      answer: answer.trim(),
      direction: currentWord.direction
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setAnswer('');

    if (currentIndex >= examWords.length - 1) {
      finishExam(newAnswers);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, answer, currentIndex, examWords, answers]);

  const finishExam = async (finalAnswers) => {
    if (finished || submitting) return;
    setFinished(true);
    setSubmitting(true);

    const answersToSubmit = finalAnswers || answers;
    try {
      const res = await lessonAPI.submitExam(lessonId, answersToSubmit);
      if (res.data.success) {
        setResult(res.data.data);
        onFinish && onFinish(res.data.data);
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      alert(err.response?.data?.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="class-exam-container">
        <div className="loading">{t('homework.loadingExam') || 'Loading exam...'}</div>
      </div>
    );
  }

  if (examError) {
    return (
      <div className="class-exam-container">
        <div className="exam-not-available">
          <div className="exam-not-available-icon">⏰</div>
          <h3>{t('homework.examNotAvailable') || 'Exam Not Available'}</h3>
          <p>{examError}</p>
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('homework.back') || 'Back'}
          </button>
        </div>
      </div>
    );
  }

  if (finished && result) {
    return (
      <div className="class-exam-container">
        <div className={`exam-result ${result.passed ? 'passed' : 'failed'}`}>
          <h2>{result.passed ? (t('homework.examPassed') || 'Exam Passed!') : (t('homework.examFailed') || 'Exam Failed')}</h2>
          <div className="exam-score">
            <span className="score-value">{result.score}%</span>
            <span className="score-detail">
              {result.correctCount}/{result.totalQuestions} {t('homework.correct') || 'correct'}
            </span>
          </div>
          <p className="pass-requirement">
            {t('homework.required') || 'Required'}: {result.minPassScore}%
          </p>
          <button className="btn btn-primary" onClick={onCancel}>
            {t('homework.backToLessons') || 'Back to Lessons'}
          </button>
        </div>
      </div>
    );
  }

  if (examWords.length === 0) {
    return (
      <div className="class-exam-container">
        <p>{t('homework.noWordsInLesson') || 'No words in this lesson.'}</p>
        <button className="btn btn-secondary" onClick={onCancel}>
          {t('homework.back') || 'Back'}
        </button>
      </div>
    );
  }

  const isEnToUz = currentWord?.direction === 'en-to-uz';

  return (
    <div className="class-exam-container">
      <div className="exam-header">
        <h3>{t('homework.classExam') || 'Class Exam'}: {lessonName}</h3>
        <div className={`exam-timer ${questionTimeLeft < 10 ? 'urgent' : ''}`}>
          {formatTime(questionTimeLeft)}
        </div>
      </div>

      <div className="exam-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex) / examWords.length) * 100}%` }}
          />
        </div>
        <span className="progress-text">{currentIndex + 1} / {examWords.length}</span>
      </div>

      <div className="exam-question">
        <div className="direction-label">
          {isEnToUz
            ? (t('homework.translateEnToUz') || 'Translate to Uzbek')
            : (t('homework.translateUzToEn') || 'Translate to English')
          }
        </div>
        <div className="question-word">
          {isEnToUz ? currentWord?.english : currentWord?.uzbek}
        </div>
        <input
          type="text"
          className="exam-answer-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submitAnswer()}
          placeholder={t('homework.typeAnswer') || 'Type your answer...'}
          autoFocus
        />
        <button
          className="btn btn-primary btn-large"
          onClick={submitAnswer}
          disabled={!answer.trim()}
        >
          {currentIndex >= examWords.length - 1
            ? (t('homework.finish') || 'Finish')
            : (t('homework.next') || 'Next')
          }
        </button>
      </div>
    </div>
  );
};

export default ClassExam;
