import React, { useState, useEffect } from 'react';
import { languageAPI, levelAPI, lessonAPI, listeningAPI } from '../../utils/api';

const ListeningManageTab = ({ t }) => {
  const [view, setView] = useState('languages');
  const [loading, setLoading] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [exercises, setExercises] = useState([]);

  const [newLanguage, setNewLanguage] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [lessonForm, setLessonForm] = useState({ name: '', order: 1 });
  const [exerciseForm, setExerciseForm] = useState({ title: '', script: '', order: 1 });
  const [audioFile, setAudioFile] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', script: '', order: 1 });
  const [editAudioFile, setEditAudioFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const res = await languageAPI.getAll();
      if (res.data.success) setLanguages(res.data.data.languages);
    } catch (err) {
      console.error('Error fetching languages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async (languageId) => {
    setLoading(true);
    try {
      const res = await levelAPI.getByLanguage(languageId);
      if (res.data.success) setLevels(res.data.data.levels);
    } catch (err) {
      console.error('Error fetching levels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (levelId) => {
    setLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(levelId, 'listening');
      if (res.data.success) setLessons(res.data.data.lessons);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (lessonId) => {
    setLoading(true);
    try {
      const res = await listeningAPI.getAll({ lessonId });
      if (res.data.success) setExercises(res.data.data.exercises);
    } catch (err) {
      console.error('Error fetching exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLanguage = async (e) => {
    e.preventDefault();
    if (!newLanguage.trim()) return;
    try {
      const res = await languageAPI.create({ name: newLanguage.trim() });
      if (res.data.success) {
        setNewLanguage('');
        fetchLanguages();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding language');
    }
  };

  const handleAddLevel = async (e) => {
    e.preventDefault();
    if (!newLevel.trim() || !selectedLanguage) return;
    try {
      const res = await levelAPI.create({ name: newLevel.trim(), languageId: selectedLanguage._id });
      if (res.data.success) {
        setNewLevel('');
        fetchLevels(selectedLanguage._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding level');
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.name.trim() || !selectedLevel) return;
    try {
      const res = await lessonAPI.createLesson({
        name: lessonForm.name.trim(),
        levelId: selectedLevel._id,
        order: lessonForm.order,
        type: 'listening'
      });
      if (res.data.success) {
        setLessonForm({ name: '', order: 1 });
        fetchLessons(selectedLevel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding class');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm(t('listening.confirmDeleteClass') || 'Delete this class and all exercises?')) return;
    try {
      await lessonAPI.deleteLesson(lessonId);
      fetchLessons(selectedLevel._id);
      if (selectedLesson?._id === lessonId) {
        setSelectedLesson(null);
        setView('classes');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting class');
    }
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!exerciseForm.title.trim() || !exerciseForm.script.trim() || !audioFile || !selectedLesson) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', exerciseForm.title.trim());
      formData.append('script', exerciseForm.script.trim());
      formData.append('lessonId', selectedLesson._id);
      formData.append('order', exerciseForm.order);
      formData.append('audio', audioFile);

      const res = await listeningAPI.create(formData);
      if (res.data.success) {
        setExerciseForm({ title: '', script: '', order: 1 });
        setAudioFile(null);
        fetchExercises(selectedLesson._id);
        fetchLessons(selectedLevel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding exercise');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditExercise = (exercise) => {
    setEditingExercise(exercise._id);
    setEditForm({ title: exercise.title, script: exercise.script, order: exercise.order || 1 });
    setEditAudioFile(null);
  };

  const handleUpdateExercise = async (exerciseId) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', editForm.title.trim());
      formData.append('script', editForm.script.trim());
      formData.append('order', editForm.order);
      if (editAudioFile) formData.append('audio', editAudioFile);

      const res = await listeningAPI.update(exerciseId, formData);
      if (res.data.success) {
        setEditingExercise(null);
        fetchExercises(selectedLesson._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating exercise');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExercise = async (exerciseId) => {
    if (!window.confirm(t('listening.confirmDelete') || 'Delete this exercise?')) return;
    try {
      await listeningAPI.delete(exerciseId);
      fetchExercises(selectedLesson._id);
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting exercise');
    }
  };

  if (loading && view === 'languages' && languages.length === 0) {
    return <div className="loading-state">{t('listening.loading') || 'Loading...'}</div>;
  }

  return (
    <div className="lessons-tab listening-manage-tab">
      {view === 'languages' && (
        <>
          <h3>{t('listening.selectLanguage') || 'Select Language'}</h3>
          <div className="practice-levels-grid">
            {languages.map(lang => (
              <button
                key={lang._id}
                className="practice-level-card"
                onClick={() => {
                  setSelectedLanguage(lang);
                  fetchLevels(lang._id);
                  setView('levels');
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>
          <form className="add-form-inline" onSubmit={handleAddLanguage}>
            <input
              type="text"
              placeholder={t('listening.newLanguage') || 'New language name'}
              value={newLanguage}
              onChange={e => setNewLanguage(e.target.value)}
            />
            <button type="submit" className="btn-primary">{t('listening.add') || 'Add'}</button>
          </form>
        </>
      )}

      {view === 'levels' && selectedLanguage && (
        <>
          <button className="back-btn" onClick={() => setView('languages')}>← {t('listening.back') || 'Back'}</button>
          <h3>{selectedLanguage.name} — {t('listening.selectLevel') || 'Select Level'}</h3>
          <div className="practice-levels-grid">
            {levels.map(level => (
              <button
                key={level._id}
                className="practice-level-card"
                onClick={() => {
                  setSelectedLevel(level);
                  fetchLessons(level._id);
                  setView('classes');
                }}
              >
                {level.name}
              </button>
            ))}
          </div>
          <form className="add-form-inline" onSubmit={handleAddLevel}>
            <input
              type="text"
              placeholder={t('listening.newLevel') || 'New level name'}
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
            />
            <button type="submit" className="btn-primary">{t('listening.add') || 'Add'}</button>
          </form>
        </>
      )}

      {view === 'classes' && selectedLevel && (
        <>
          <button className="back-btn" onClick={() => setView('levels')}>← {t('listening.back') || 'Back'}</button>
          <h3>{selectedLevel.name} — {t('listening.selectClass') || 'Select Class'}</h3>
          <div className="practice-levels-grid">
            {lessons.map(lesson => (
              <button
                key={lesson._id}
                className="practice-level-card"
                onClick={() => {
                  setSelectedLesson(lesson);
                  fetchExercises(lesson._id);
                  setView('exercises');
                }}
              >
                <span>{lesson.name}</span>
                <small>{lesson.listeningCount || 0} {t('listening.exercises') || 'exercises'}</small>
              </button>
            ))}
          </div>
          <form className="add-form-inline" onSubmit={handleAddLesson}>
            <input
              type="text"
              placeholder={t('listening.newClass') || 'New class name'}
              value={lessonForm.name}
              onChange={e => setLessonForm({ ...lessonForm, name: e.target.value })}
            />
            <input
              type="number"
              min="1"
              value={lessonForm.order}
              onChange={e => setLessonForm({ ...lessonForm, order: parseInt(e.target.value, 10) || 1 })}
              style={{ width: '70px' }}
            />
            <button type="submit" className="btn-primary">{t('listening.addClass') || 'Add Class'}</button>
          </form>
        </>
      )}

      {view === 'exercises' && selectedLesson && (
        <>
          <button className="back-btn" onClick={() => setView('classes')}>← {t('listening.back') || 'Back'}</button>
          <div className="lesson-header-row">
            <h3>{selectedLesson.name}</h3>
            <button className="btn-danger btn-sm" onClick={() => handleDeleteLesson(selectedLesson._id)}>
              {t('listening.deleteClass') || 'Delete Class'}
            </button>
          </div>

          <form className="listening-exercise-form" onSubmit={handleAddExercise}>
            <h4>{t('listening.addExercise') || 'Add Listening Exercise'}</h4>
            <input
              type="text"
              placeholder={t('listening.exerciseTitle') || 'Title (e.g. Dialogue 1)'}
              value={exerciseForm.title}
              onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })}
              required
            />
            <textarea
              placeholder={t('listening.scriptPlaceholder') || 'Full script / transcript students should type...'}
              value={exerciseForm.script}
              onChange={e => setExerciseForm({ ...exerciseForm, script: e.target.value })}
              rows={4}
              required
            />
            <div className="file-input-row">
              <label>{t('listening.audioFile') || 'Audio file'} (mp3, wav, m4a)</label>
              <input
                type="file"
                accept="audio/*"
                onChange={e => setAudioFile(e.target.files[0] || null)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (t('listening.uploading') || 'Uploading...') : (t('listening.addExercise') || 'Add Exercise')}
            </button>
          </form>

          <div className="listening-exercise-list">
            {exercises.length === 0 ? (
              <p className="empty-state">{t('listening.noExercises') || 'No exercises yet. Add one above.'}</p>
            ) : (
              exercises.map(exercise => (
                <div key={exercise._id} className="listening-exercise-card">
                  {editingExercise === exercise._id ? (
                    <div className="edit-exercise-form">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      />
                      <textarea
                        value={editForm.script}
                        onChange={e => setEditForm({ ...editForm, script: e.target.value })}
                        rows={4}
                      />
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={e => setEditAudioFile(e.target.files[0] || null)}
                      />
                      <div className="card-actions">
                        <button className="btn-primary btn-sm" onClick={() => handleUpdateExercise(exercise._id)} disabled={submitting}>
                          {t('listening.save') || 'Save'}
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setEditingExercise(null)}>
                          {t('listening.cancel') || 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="exercise-card-header">
                        <strong>{exercise.title}</strong>
                        <div className="card-actions">
                          <button className="btn-secondary btn-sm" onClick={() => startEditExercise(exercise)}>
                            {t('listening.edit') || 'Edit'}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => handleDeleteExercise(exercise._id)}>
                            {t('listening.delete') || 'Delete'}
                          </button>
                        </div>
                      </div>
                      <p className="exercise-script-preview">{exercise.script}</p>
                      <audio controls src={listeningAPI.getAudioUrl(exercise.audioFile)} preload="metadata" />
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ListeningManageTab;
