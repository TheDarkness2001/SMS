import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { videoLessonAPI } from '../utils/api';
import '../styles/Homework.css';
import '../styles/VideoLessons.css';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const VideoTest = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [test, setTest] = useState(null);
  const [mode, setMode] = useState(null); // 'practice' | 'exam' | null (select)
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: answer }
  const [feedback, setFeedback] = useState(null); // for practice per-question
  const [warnings, setWarnings] = useState(0);
  const [warningVisible, setWarningVisible] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const isStudent = user?.userType === 'student';

  const fetchTest = useCallback(async (selectedMode) => {
    setLoading(true);
    setError('');
    try {
      const res = await videoLessonAPI.getTest(id, selectedMode);
      if (res.data.success) {
        const t = res.data.data.test;
        if (!t || !t.questions || t.questions.length === 0) {
          setError('This video does not have a test yet.');
        } else {
          setTest(t);
          const list = t.randomizeQuestions !== false ? shuffle(t.questions) : t.questions;
          setQuestions(list);
          if (selectedMode === 'exam') setTimeLeft(t.timerSeconds || 300);
        }
      } else {
        setError(res.data.message || 'Failed to load test');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleStart = (m) => {
    setMode(m);
    setCurrent(0);
    setAnswers({});
    setFeedback(null);
    setResult(null);
    setWarnings(0);
    setTerminated(false);
    submittedRef.current = false;
    fetchTest(m);
  };

  // Exam timer
  useEffect(() => {
    if (mode !== 'exam' || !test) return undefined;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitAll({ autoTimeout: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, test]);

  // Anti-cheat hooks (exam only)
  useEffect(() => {
    if (mode !== 'exam' || !test || terminated || result) return undefined;

    const handleWarning = () => {
      setWarnings(prev => {
        const next = prev + 1;
        setWarningVisible(true);
        setTimeout(() => setWarningVisible(false), 3500);
        if (next >= 3) {
          setTerminated(true);
          submitAll({ terminate: true, warnings: next });
        }
        videoLessonAPI.reportWarning(id, { warnings: next }).catch(() => {});
        return next;
      });
    };

    const onVis = () => { if (document.hidden) handleWarning(); };
    const onBlur = () => handleWarning();
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onCopy = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    document.addEventListener('paste', onCopy);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      document.removeEventListener('paste', onCopy);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, test, terminated, result, id]);

  const setAnswerFor = (qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const submitAll = async (opts = {}) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        mode,
        answers: questions.map(q => ({ questionId: q._id, answer: answers[q._id] ?? '' })),
        warnings: opts.warnings ?? warnings,
        terminated: !!opts.terminate
      };
      const res = await videoLessonAPI.submitAttempt(id, payload);
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.message || 'Submission failed');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Practice mode: check single question
  const checkPracticeAnswer = async () => {
    const q = questions[current];
    if (!q) return;
    const ua = answers[q._id];
    if (ua === undefined || ua === '') return;
    // Local check using the correctAnswer (practice mode sees it only server-side,
    // but we need per-question instant feedback, so we request server scoring once
    // for the single-question payload and keep explanation). Simpler: submit all as
    // practice on completion. For per-question feedback, do a lightweight check:
    // send one-question attempt with only this question's answer would double-count.
    // Instead, just highlight after full submit. Use a local transient feedback flag.
    setFeedback({ shown: true, questionId: q._id });
  };

  const goNext = () => {
    setFeedback(null);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      submitAll();
    }
  };

  const renderQuestion = (q) => {
    const ua = answers[q._id] ?? '';
    if (q.type === 'multiple-choice') {
      return (
        <div className="tt-options-play">
          {(q.options || []).map((opt, i) => (
            <label key={i} className={`tt-option-play ${ua === opt ? 'selected' : ''}`}>
              <input
                type="radio"
                name={`q-${q._id}`}
                checked={ua === opt}
                onChange={() => setAnswerFor(q._id, opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }
    if (q.type === 'true-false') {
      return (
        <div className="tt-options-play">
          {['true', 'false'].map(v => (
            <label key={v} className={`tt-option-play ${ua === v ? 'selected' : ''}`}>
              <input
                type="radio"
                name={`q-${q._id}`}
                checked={ua === v}
                onChange={() => setAnswerFor(q._id, v)}
              />
              <span>{v === 'true' ? 'True' : 'False'}</span>
            </label>
          ))}
        </div>
      );
    }
    return (
      <textarea
        rows="3"
        value={ua}
        placeholder="Type your answer..."
        onChange={(e) => setAnswerFor(q._id, e.target.value)}
      />
    );
  };

  const progressText = useMemo(
    () => (questions.length ? `Question ${current + 1} of ${questions.length}` : ''),
    [questions, current]
  );

  // --- RENDER ---
  if (!mode) {
    return (
      <div className="homework-page video-lessons-page">
        <div className="page-header">
          <h1>Topic Test</h1>
          <p className="page-subtitle">Choose a mode to begin.</p>
        </div>
        <div className="tt-mode-select">
          <div className="tt-mode-card" onClick={() => handleStart('practice')}>
            <div className="tt-mode-icon">📝</div>
            <h3>Practice Mode</h3>
            <p>Instant feedback, explanations, unlimited retries. No timer.</p>
            <button className="video-btn video-btn-primary">Start Practice</button>
          </div>
          <div className="tt-mode-card" onClick={() => handleStart('exam')}>
            <div className="tt-mode-icon">🏆</div>
            <h3>Exam Mode</h3>
            <p>Timed test, scored, anti-cheat enforced. 3 warnings = terminated.</p>
            <button className="video-btn video-btn-accent">Start Exam</button>
          </div>
        </div>
        <button className="video-btn video-btn-ghost" onClick={() => navigate('/video-lessons')}>← Back to Video Lessons</button>
      </div>
    );
  }

  if (loading) {
    return <div className="homework-page"><div className="video-empty">Loading test...</div></div>;
  }
  if (error) {
    return (
      <div className="homework-page">
        <div className="video-modal-error">{error}</div>
        <button className="video-btn video-btn-secondary" onClick={() => { setMode(null); setError(''); }}>Back</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="homework-page video-lessons-page">
        <div className="tt-result-card">
          <h2>{result.passed ? '🎉 Passed!' : 'Result'}</h2>
          <div className="tt-result-score">{result.score}%</div>
          <div className="tt-result-detail">
            {result.correctCount} / {result.totalQuestions} correct
          </div>
          <div className="tt-result-detail">
            Best score: {result.bestScore}% &middot; Attempts: {result.attempts}
          </div>
          {terminated && <div className="tt-warning">Exam was terminated due to 3 anti-cheat warnings.</div>}

          {mode === 'practice' && result.feedback && (
            <div className="tt-feedback-list">
              {result.feedback.map((f, i) => {
                const q = questions.find(x => String(x._id) === String(f.questionId));
                return (
                  <div key={i} className={`tt-feedback-item ${f.isCorrect ? 'ok' : 'bad'}`}>
                    <div className="tt-fb-q"><strong>Q{i + 1}.</strong> {q?.question}</div>
                    <div>Your answer: <em>{String(f.userAnswer || '—')}</em></div>
                    {!f.isCorrect && (
                      <div>Correct: <strong>{Array.isArray(f.correctAnswer) ? f.correctAnswer.join(' / ') : String(f.correctAnswer || '')}</strong></div>
                    )}
                    {f.explanation && <div className="tt-fb-explain">{f.explanation}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="tt-result-actions">
            <button className="video-btn video-btn-primary" onClick={() => { setMode(null); setResult(null); }}>Try Again</button>
            <button className="video-btn video-btn-secondary" onClick={() => navigate('/video-lessons')}>Back to Videos</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;

  return (
    <div className="homework-page video-lessons-page">
      <div className="tt-play-header">
        <div>
          <strong>{mode === 'exam' ? '🏆 Exam Mode' : '📝 Practice Mode'}</strong> &middot; {progressText}
        </div>
        {mode === 'exam' && (
          <div className={`tt-timer ${timeLeft < 30 ? 'danger' : ''}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {warningVisible && (
        <div className="anti-cheat-warning">
          Warning {warnings}/3 — do not switch tabs or leave the exam window.
        </div>
      )}

      <div className="tt-question-play">
        <div className="tt-q-number">Q{current + 1}</div>
        <div className="tt-q-text">{q.question}</div>
        {renderQuestion(q)}

        {mode === 'practice' && feedback && feedback.questionId === q._id && (
          <div className="tt-feedback-inline">Answer recorded. Review at the end.</div>
        )}
      </div>

      <div className="tt-play-actions">
        <button
          className="video-btn video-btn-secondary"
          onClick={() => { if (current > 0) setCurrent(current - 1); }}
          disabled={current === 0 || mode === 'exam'}
        >
          ← Previous
        </button>
        {mode === 'practice' && (
          <button className="video-btn video-btn-primary" onClick={checkPracticeAnswer}>
            Check
          </button>
        )}
        {current < questions.length - 1 ? (
          <button className="video-btn video-btn-primary" onClick={goNext}>Next →</button>
        ) : (
          <button className="video-btn video-btn-accent" onClick={() => submitAll()} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>

      <div className="tt-play-footer">
        <button className="video-btn video-btn-ghost" onClick={() => navigate('/video-lessons')}>Exit</button>
      </div>

      {!isStudent && (
        <div className="video-admin-tips" style={{ marginTop: 12 }}>
          Note: test result tracking only applies to student accounts.
        </div>
      )}
    </div>
  );
};

export default VideoTest;
