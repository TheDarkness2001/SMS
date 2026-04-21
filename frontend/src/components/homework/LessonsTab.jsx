import React, { useState, useEffect } from 'react';
import { lessonAPI, homeworkAPI } from '../../utils/api';

const LessonsTab = ({ t, levels }) => {
  const [lessons, setLessons] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [loading, setLoading] = useState(false);

  // Expanded lesson word editor state
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [lessonWords, setLessonWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [newWord, setNewWord] = useState({ english: '', uzbek: '' });

  // Form state
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    order: 1,
    examTimeLimit: 300,
    minPassScore: 70
  });

  useEffect(() => {
    if (levels.length > 0 && !selectedLevel) {
      setSelectedLevel(levels[0]);
    }
  }, [levels, selectedLevel]);

  useEffect(() => {
    if (selectedLevel) {
      fetchLessons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevel]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(selectedLevel);
      if (res.data.success) {
        setLessons(res.data.data.lessons);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const expandLesson = async (lessonId) => {
    if (expandedLessonId === lessonId) {
      setExpandedLessonId(null);
      setLessonWords([]);
      return;
    }
    setExpandedLessonId(lessonId);
    setWordsLoading(true);
    try {
      const res = await lessonAPI.getLesson(lessonId);
      if (res.data.success) {
        setLessonWords(res.data.data.words || []);
      }
    } catch (err) {
      console.error('Error fetching lesson words:', err);
    } finally {
      setWordsLoading(false);
    }
  };

  const handleAddWord = async (e, lessonId) => {
    e.preventDefault();
    if (!newWord.english.trim() || !newWord.uzbek.trim()) return;
    try {
      // Create word with the lesson's level
      const lesson = lessons.find(l => l._id === lessonId);
      const createRes = await homeworkAPI.addWord({
        english: newWord.english.trim(),
        uzbek: newWord.uzbek.trim(),
        level: lesson?.level || selectedLevel
      });
      if (createRes.data.success) {
        const wordId = createRes.data.data.word._id;
        await lessonAPI.addWordsToLesson(lessonId, [wordId]);
        setNewWord({ english: '', uzbek: '' });
        // Refresh words
        const res = await lessonAPI.getLesson(lessonId);
        if (res.data.success) {
          setLessonWords(res.data.data.words || []);
        }
        fetchLessons();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding word');
    }
  };

  const handleRemoveWord = async (lessonId, wordId) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await lessonAPI.removeWordFromLesson(lessonId, wordId);
      await homeworkAPI.deleteWord(wordId);
      setLessonWords(prev => prev.filter(w => w._id !== wordId));
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing word');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await lessonAPI.createLesson(formData);
      setFormData({ name: '', level: selectedLevel, order: 1, examTimeLimit: 300, minPassScore: 70 });
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating lesson');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await lessonAPI.updateLesson(editingId, formData);
      setFormMode('create');
      setEditingId(null);
      setFormData({ name: '', level: selectedLevel, order: 1, examTimeLimit: 300, minPassScore: 70 });
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating lesson');
    }
  };

  const handleEdit = (lesson) => {
    setFormMode('edit');
    setEditingId(lesson._id);
    setFormData({
      name: lesson.name,
      level: lesson.level,
      order: lesson.order,
      examTimeLimit: lesson.examTimeLimit,
      minPassScore: lesson.minPassScore
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await lessonAPI.deleteLesson(id);
      if (expandedLessonId === id) {
        setExpandedLessonId(null);
        setLessonWords([]);
      }
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting lesson');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="lessons-section">
      <div className="level-selector">
        <label>{t('homework.level') || 'Level'}:</label>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="level-select"
        >
          {levels.map(lvl => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      <form onSubmit={formMode === 'create' ? handleCreate : handleUpdate} className="word-form">
        <h3>{formMode === 'create' ? (t('homework.addNewLesson') || 'Add New Lesson') : (t('homework.editLesson') || 'Edit Lesson')}</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder={t('homework.lessonName') || 'Lesson Name'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="form-input"
            required
          />
          <input
            type="text"
            placeholder={t('homework.level') || 'Level'}
            value={formData.level || selectedLevel}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="form-input"
            list="level-suggestions"
            required
          />
          <input
            type="number"
            placeholder={t('homework.order') || 'Order'}
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
            className="form-input"
            min="1"
            style={{ maxWidth: '80px' }}
          />
          <input
            type="number"
            placeholder={t('homework.timeLimit') || 'Time (sec)'}
            value={formData.examTimeLimit}
            onChange={(e) => setFormData({ ...formData, examTimeLimit: parseInt(e.target.value) || 300 })}
            className="form-input"
            min="30"
            style={{ maxWidth: '100px' }}
          />
          <input
            type="number"
            placeholder={t('homework.passScore') || 'Pass %'}
            value={formData.minPassScore}
            onChange={(e) => setFormData({ ...formData, minPassScore: parseInt(e.target.value) || 70 })}
            className="form-input"
            min="1"
            max="100"
            style={{ maxWidth: '80px' }}
          />
          <button type="submit" className="btn btn-primary">
            {formMode === 'create' ? (t('homework.add') || 'Add') : (t('homework.update') || 'Update')}
          </button>
          {formMode === 'edit' && (
            <button type="button" className="btn btn-secondary" onClick={() => {
              setFormMode('create');
              setEditingId(null);
              setFormData({ name: '', level: selectedLevel, order: 1, examTimeLimit: 300, minPassScore: 70 });
            }}>
              {t('homework.cancel') || 'Cancel'}
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="loading">{t('homework.loading') || 'Loading...'}</div>
      ) : (
        <div className="lessons-list">
          {lessons.length === 0 ? (
            <div className="no-lessons">{t('homework.noLessons') || 'No lessons yet. Create one above.'}</div>
          ) : (
            lessons.map(lesson => (
              <div key={lesson._id} className="lesson-item">
                <div className="lesson-row">
                  <div className="lesson-main">
                    <span className="lesson-order">{lesson.order}</span>
                    <span className="lesson-name">{lesson.name}</span>
                    <span className="level-badge">{lesson.level}</span>
                    <span className="lesson-meta">{lesson.wordIds?.length || 0} {t('homework.words') || 'words'} · {formatTime(lesson.examTimeLimit)} · {lesson.minPassScore}%</span>
                  </div>
                  <div className="lesson-actions">
                    <button className="btn btn-small btn-edit" onClick={() => handleEdit(lesson)}>
                      {t('homework.edit') || 'Edit'}
                    </button>
                    <button
                      className={`btn btn-small ${expandedLessonId === lesson._id ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => expandLesson(lesson._id)}
                    >
                      {expandedLessonId === lesson._id ? (t('homework.close') || 'Close') : (t('homework.words') || 'Words')}
                    </button>
                    <button className="btn btn-small btn-delete" onClick={() => handleDelete(lesson._id)}>
                      {t('homework.delete') || 'Delete'}
                    </button>
                  </div>
                </div>

                {expandedLessonId === lesson._id && (
                  <div className="lesson-words-panel">
                    <h4>{t('homework.wordsInLesson') || 'Words in this lesson'}</h4>

                    <form onSubmit={(e) => handleAddWord(e, lesson._id)} className="word-form inline">
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder={t('homework.englishWord') || 'English word'}
                          value={newWord.english}
                          onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
                          className="form-input"
                          required
                        />
                        <input
                          type="text"
                          placeholder={t('homework.uzbekWord') || 'Uzbek word'}
                          value={newWord.uzbek}
                          onChange={(e) => setNewWord({ ...newWord, uzbek: e.target.value })}
                          className="form-input"
                          required
                        />
                        <button type="submit" className="btn btn-primary">
                          {t('homework.add') || 'Add'}
                        </button>
                      </div>
                    </form>

                    {wordsLoading ? (
                      <div className="loading">{t('homework.loading') || 'Loading...'}</div>
                    ) : (
                      <div className="lesson-words-table">
                        <table className="words-table">
                          <thead>
                            <tr>
                              <th>{t('homework.english') || 'English'}</th>
                              <th>{t('homework.uzbek') || 'Uzbek'}</th>
                              <th className="actions">{t('homework.actions') || 'Actions'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lessonWords.map(word => (
                              <tr key={word._id}>
                                <td>{word.english}</td>
                                <td>{word.uzbek}</td>
                                <td className="actions">
                                  <button
                                    className="btn btn-small btn-delete"
                                    onClick={() => handleRemoveWord(lesson._id, word._id)}
                                  >
                                    {t('homework.delete') || 'Delete'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {lessonWords.length === 0 && (
                          <div className="no-data">{t('homework.noWordsInLesson') || 'No words in this lesson yet.'}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LessonsTab;
