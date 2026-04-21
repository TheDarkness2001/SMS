import React, { useState, useEffect } from 'react';
import { lessonAPI, homeworkAPI } from '../../utils/api';

const LessonsTab = ({ t, levels }) => {
  const [lessons, setLessons] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLessonId, setAssignLessonId] = useState(null);
  const [selectedWordIds, setSelectedWordIds] = useState([]);

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

  const fetchWords = async () => {
    try {
      const res = await homeworkAPI.getAllWords();
      if (res.data.success) {
        setWords(res.data.data.words);
      }
    } catch (err) {
      console.error('Error fetching words:', err);
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
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting lesson');
    }
  };

  const openAssignModal = async (lessonId) => {
    setAssignLessonId(lessonId);
    setSelectedWordIds([]);
    await fetchWords();
    setShowAssignModal(true);
  };

  const handleAssignWords = async () => {
    if (selectedWordIds.length === 0) {
      setShowAssignModal(false);
      return;
    }
    try {
      await lessonAPI.addWordsToLesson(assignLessonId, selectedWordIds);
      setShowAssignModal(false);
      fetchLessons();
    } catch (err) {
      alert(err.response?.data?.message || 'Error assigning words');
    }
  };

  const toggleWordSelection = (wordId) => {
    setSelectedWordIds(prev =>
      prev.includes(wordId)
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
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
            style={{ maxWidth: '100px' }}
          />
          <input
            type="number"
            placeholder={t('homework.timeLimit') || 'Time (sec)'}
            value={formData.examTimeLimit}
            onChange={(e) => setFormData({ ...formData, examTimeLimit: parseInt(e.target.value) || 300 })}
            className="form-input"
            min="30"
            style={{ maxWidth: '120px' }}
          />
          <input
            type="number"
            placeholder={t('homework.passScore') || 'Pass %'}
            value={formData.minPassScore}
            onChange={(e) => setFormData({ ...formData, minPassScore: parseInt(e.target.value) || 70 })}
            className="form-input"
            min="1"
            max="100"
            style={{ maxWidth: '100px' }}
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
        <div className="lessons-table-container">
          <table className="words-table">
            <thead>
              <tr>
                <th>{t('homework.order') || 'Order'}</th>
                <th>{t('homework.lessonName') || 'Lesson Name'}</th>
                <th>{t('homework.level') || 'Level'}</th>
                <th>{t('homework.words') || 'Words'}</th>
                <th>{t('homework.timeLimit') || 'Time Limit'}</th>
                <th>{t('homework.passScore') || 'Pass Score'}</th>
                <th className="actions">{t('homework.actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                    {t('homework.noLessons') || 'No lessons yet. Create one above.'}
                  </td>
                </tr>
              ) : (
                lessons.map(lesson => (
                  <tr key={lesson._id}>
                    <td>{lesson.order}</td>
                    <td>{lesson.name}</td>
                    <td><span className="level-badge">{lesson.level}</span></td>
                    <td>{lesson.wordIds?.length || 0}</td>
                    <td>{formatTime(lesson.examTimeLimit)}</td>
                    <td>{lesson.minPassScore}%</td>
                    <td className="actions">
                      <button className="btn btn-small btn-edit" onClick={() => handleEdit(lesson)}>
                        {t('homework.edit') || 'Edit'}
                      </button>
                      <button className="btn btn-small btn-secondary" onClick={() => openAssignModal(lesson._id)}>
                        {t('homework.assignWords') || 'Words'}
                      </button>
                      <button className="btn btn-small btn-delete" onClick={() => handleDelete(lesson._id)}>
                        {t('homework.delete') || 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('homework.assignWords') || 'Assign Words to Lesson'}</h3>
            <div className="word-selection-list">
              {words.length === 0 ? (
                <p>{t('homework.noWords') || 'No words available.'}</p>
              ) : (
                words.map(word => (
                  <label key={word._id} className="word-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedWordIds.includes(word._id)}
                      onChange={() => toggleWordSelection(word._id)}
                    />
                    <span>{word.english}</span>
                    <span className="word-trans">{word.uzbek}</span>
                    <span className="level-badge">{word.level}</span>
                  </label>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleAssignWords}>
                {t('homework.save') || 'Save'} ({selectedWordIds.length})
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                {t('homework.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsTab;
