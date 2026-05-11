import React, { useEffect, useState } from 'react';
import { videoLessonAPI } from '../../utils/api';

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'translation', label: 'Translation' },
  { value: 'true-false', label: 'True / False' },
  { value: 'short-answer', label: 'Short Answer' }
];

const newQuestion = () => ({
  _tempId: Math.random().toString(36).slice(2),
  type: 'multiple-choice',
  question: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  points: 1
});

const TopicTestBuilder = ({ video, onClose }) => {
  const [test, setTest] = useState({
    title: '',
    practiceEnabled: true,
    examEnabled: true,
    timerSeconds: 300,
    passingScore: 70,
    randomizeQuestions: true,
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    videoLessonAPI.getTest(video._id).then(res => {
      if (!mounted) return;
      const t = res.data.data?.test;
      if (t) {
        setTest({
          title: t.title || '',
          practiceEnabled: t.practiceEnabled !== false,
          examEnabled: t.examEnabled !== false,
          timerSeconds: t.timerSeconds || 300,
          passingScore: t.passingScore || 70,
          randomizeQuestions: t.randomizeQuestions !== false,
          questions: (t.questions || []).map(q => ({
            _id: q._id,
            type: q.type,
            question: q.question,
            options: q.options && q.options.length ? q.options : ['', '', '', ''],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            points: q.points || 1
          }))
        });
      }
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [video._id]);

  const updateQuestion = (idx, patch) => {
    setTest(prev => {
      const next = [...prev.questions];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, questions: next };
    });
  };

  const setOption = (qIdx, optIdx, value) => {
    setTest(prev => {
      const next = [...prev.questions];
      const opts = [...(next[qIdx].options || [])];
      opts[optIdx] = value;
      next[qIdx] = { ...next[qIdx], options: opts };
      return { ...prev, questions: next };
    });
  };

  const addOption = (qIdx) => {
    setTest(prev => {
      const next = [...prev.questions];
      const opts = [...(next[qIdx].options || []), ''];
      next[qIdx] = { ...next[qIdx], options: opts };
      return { ...prev, questions: next };
    });
  };

  const removeOption = (qIdx, optIdx) => {
    setTest(prev => {
      const next = [...prev.questions];
      const opts = (next[qIdx].options || []).filter((_, i) => i !== optIdx);
      next[qIdx] = { ...next[qIdx], options: opts };
      return { ...prev, questions: next };
    });
  };

  const addQuestion = () => {
    setTest(prev => ({ ...prev, questions: [...prev.questions, newQuestion()] }));
  };

  const removeQuestion = (idx) => {
    setTest(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const moveQuestion = (idx, dir) => {
    setTest(prev => {
      const arr = [...prev.questions];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...prev, questions: arr };
    });
  };

  const handleSave = async () => {
    setError('');
    // Validate
    for (let i = 0; i < test.questions.length; i++) {
      const q = test.questions[i];
      if (!q.question.trim()) return setError(`Question ${i + 1}: text is required`);
      if (q.correctAnswer === '' || q.correctAnswer === null || q.correctAnswer === undefined) {
        return setError(`Question ${i + 1}: correct answer is required`);
      }
      if (q.type === 'multiple-choice') {
        const opts = (q.options || []).filter(o => o && o.trim());
        if (opts.length < 2) return setError(`Question ${i + 1}: need at least 2 options`);
        if (!opts.includes(q.correctAnswer)) return setError(`Question ${i + 1}: correct answer must match one option`);
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: test.title,
        practiceEnabled: test.practiceEnabled,
        examEnabled: test.examEnabled,
        timerSeconds: Number(test.timerSeconds) || 300,
        passingScore: Number(test.passingScore) || 70,
        randomizeQuestions: test.randomizeQuestions,
        questions: test.questions.map(q => ({
          ...(q._id ? { _id: q._id } : {}),
          type: q.type,
          question: q.question,
          options: q.type === 'multiple-choice' ? (q.options || []).filter(o => o && o.trim()) : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: Number(q.points) || 1
        }))
      };
      const res = await videoLessonAPI.saveTest(video._id, payload);
      if (res.data.success) {
        onClose && onClose();
      } else {
        setError(res.data.message || 'Save failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const renderCorrectInput = (q, idx) => {
    if (q.type === 'multiple-choice') {
      return (
        <select
          value={q.correctAnswer || ''}
          onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
        >
          <option value="">-- Select correct option --</option>
          {(q.options || []).filter(o => o && o.trim()).map((o, i) => (
            <option key={i} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (q.type === 'true-false') {
      return (
        <select
          value={String(q.correctAnswer || '')}
          onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
        >
          <option value="">-- Select --</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    // text-based
    return (
      <input
        type="text"
        placeholder="Correct answer (comma-separated for alternatives)"
        value={Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : (q.correctAnswer || '')}
        onChange={(e) => {
          const val = e.target.value;
          if (val.includes(',')) {
            updateQuestion(idx, { correctAnswer: val.split(',').map(s => s.trim()).filter(Boolean) });
          } else {
            updateQuestion(idx, { correctAnswer: val });
          }
        }}
      />
    );
  };

  if (loading) return <div className="video-modal-backdrop"><div className="video-modal"><div className="video-modal-body">Loading test...</div></div></div>;

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div className="video-modal video-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <h3>Topic Test - {video.title}</h3>
          <button className="video-btn video-btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="video-modal-body">
          {error && <div className="video-modal-error">{error}</div>}

          <div className="video-field-row">
            <label className="video-field">
              <span>Test Title</span>
              <input type="text" value={test.title} onChange={(e) => setTest({ ...test, title: e.target.value })} />
            </label>
            <label className="video-field">
              <span>Timer (sec)</span>
              <input type="number" value={test.timerSeconds} onChange={(e) => setTest({ ...test, timerSeconds: e.target.value })} />
            </label>
            <label className="video-field">
              <span>Passing Score %</span>
              <input type="number" min="0" max="100" value={test.passingScore} onChange={(e) => setTest({ ...test, passingScore: e.target.value })} />
            </label>
          </div>

          <div className="video-field-row">
            <label className="video-field-check">
              <input type="checkbox" checked={test.practiceEnabled} onChange={(e) => setTest({ ...test, practiceEnabled: e.target.checked })} />
              <span>Practice Mode Enabled</span>
            </label>
            <label className="video-field-check">
              <input type="checkbox" checked={test.examEnabled} onChange={(e) => setTest({ ...test, examEnabled: e.target.checked })} />
              <span>Exam Mode Enabled</span>
            </label>
            <label className="video-field-check">
              <input type="checkbox" checked={test.randomizeQuestions} onChange={(e) => setTest({ ...test, randomizeQuestions: e.target.checked })} />
              <span>Randomize Question Order</span>
            </label>
          </div>

          <div className="tt-questions-list">
            {test.questions.map((q, idx) => (
              <div key={q._id || q._tempId} className="tt-question-card">
                <div className="tt-question-header">
                  <strong>Question {idx + 1}</strong>
                  <div className="tt-question-actions">
                    <button className="video-btn video-btn-ghost" onClick={() => moveQuestion(idx, -1)}>↑</button>
                    <button className="video-btn video-btn-ghost" onClick={() => moveQuestion(idx, 1)}>↓</button>
                    <button className="video-btn video-btn-danger" onClick={() => removeQuestion(idx)}>Remove</button>
                  </div>
                </div>
                <div className="video-field-row">
                  <label className="video-field">
                    <span>Type</span>
                    <select value={q.type} onChange={(e) => updateQuestion(idx, { type: e.target.value, correctAnswer: '' })}>
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="video-field">
                    <span>Points</span>
                    <input type="number" min="1" value={q.points} onChange={(e) => updateQuestion(idx, { points: e.target.value })} />
                  </label>
                </div>
                <label className="video-field">
                  <span>Question</span>
                  <textarea rows="2" value={q.question} onChange={(e) => updateQuestion(idx, { question: e.target.value })} />
                </label>

                {q.type === 'multiple-choice' && (
                  <div className="tt-options">
                    <div className="tt-options-label">Options</div>
                    {(q.options || []).map((opt, i) => (
                      <div key={i} className="tt-option-row">
                        <input type="text" value={opt} onChange={(e) => setOption(idx, i, e.target.value)} placeholder={`Option ${i + 1}`} />
                        <button className="video-btn video-btn-ghost" onClick={() => removeOption(idx, i)}>✕</button>
                      </div>
                    ))}
                    <button className="video-btn video-btn-secondary" onClick={() => addOption(idx)}>+ Option</button>
                  </div>
                )}

                <label className="video-field">
                  <span>Correct Answer</span>
                  {renderCorrectInput(q, idx)}
                </label>

                <label className="video-field">
                  <span>Explanation (shown in Practice mode)</span>
                  <textarea rows="2" value={q.explanation} onChange={(e) => updateQuestion(idx, { explanation: e.target.value })} />
                </label>
              </div>
            ))}
          </div>

          <button className="video-btn video-btn-primary" onClick={addQuestion}>+ Add Question</button>
        </div>
        <div className="video-modal-footer">
          <button className="video-btn video-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="video-btn video-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicTestBuilder;
