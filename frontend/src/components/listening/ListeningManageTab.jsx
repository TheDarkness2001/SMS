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

  const handleDeleteLanguage = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await languageAPI.delete(id);
      if (selectedLanguage?._id === id) {
        setSelectedLanguage(null);
        setView('languages');
      }
      fetchLanguages();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting language');
    }
  };

  const selectLanguage = (lang) => {
    setSelectedLanguage(lang);
    fetchLevels(lang._id);
    setView('levels');
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

  const handleDeleteLevel = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await levelAPI.delete(id);
      if (selectedLevel?._id === id) {
        setSelectedLevel(null);
        setView('levels');
      }
      fetchLevels(selectedLanguage._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting level');
    }
  };

  const selectLevel = (level) => {
    setSelectedLevel(level);
    fetchLessons(level._id);
    setView('classes');
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

  const selectLesson = (lesson) => {
    setSelectedLesson(lesson);
    fetchExercises(lesson._id);
    setView('exercises');
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

  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <button
        key="lang"
        type="button"
        className="breadcrumb-item"
        onClick={() => {
          setView('languages');
          setSelectedLesson(null);
        }}
      >
        {t('homework.languages') || 'Languages'}
      </button>
    );
    if (selectedLanguage) {
      items.push(
        <span key="sep1" className="breadcrumb-sep">/</span>,
        <button
          key="lvl"
          type="button"
          className="breadcrumb-item"
          onClick={() => {
            setView('levels');
            setSelectedLesson(null);
          }}
        >
          {selectedLanguage.name}
        </button>
      );
    }
    if (selectedLevel && (view === 'classes' || view === 'exercises')) {
      items.push(
        <span key="sep2" className="breadcrumb-sep">/</span>,
        <button
          key="cls"
          type="button"
          className="breadcrumb-item"
          onClick={() => setView('classes')}
        >
          {selectedLevel.name}
        </button>
      );
    }
    if (selectedLesson && view === 'exercises') {
      items.push(
        <span key="sep3" className="breadcrumb-sep">/</span>,
        <span key="ex" className="breadcrumb-item active">{selectedLesson.name}</span>
      );
    }
    return <div className="breadcrumb">{items}</div>;
  };

  return (
    <div className="lessons-section">
      {renderBreadcrumb()}

      {view === 'languages' && (
        <>
          <form onSubmit={handleAddLanguage} className="word-form">
            <h3>{t('homework.addLanguage') || 'Add Language'}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('homework.languageName') || 'Language name (e.g., English)'}
                value={newLanguage}
                onChange={e => setNewLanguage(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('listening.loading') || 'Loading...'}</div>
          ) : (
            <div className="hierarchy-list">
              {languages.length === 0 ? (
                <div className="no-data">{t('homework.noLanguages') || 'No languages yet.'}</div>
              ) : (
                languages.map(lang => (
                  <div key={lang._id} className="hierarchy-card" onClick={() => selectLanguage(lang)}>
                    <div className="hierarchy-icon">🌐</div>
                    <div className="hierarchy-info">
                      <h4>{lang.name}</h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang._id); }}
                    >
                      {t('homework.delete') || 'Delete'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {view === 'levels' && selectedLanguage && (
        <>
          <form onSubmit={handleAddLevel} className="level-form">
            <h3>{t('homework.addLevel') || 'Add Level'}</h3>
            <div className="level-form-main">
              <input
                type="text"
                placeholder={t('homework.levelName') || 'Level name (e.g., Blackhole 1)'}
                value={newLevel}
                onChange={e => setNewLevel(e.target.value)}
                className="form-input level-name-input"
                required
              />
              <button type="submit" className="btn btn-primary level-add-btn">{t('homework.add') || 'Add'}</button>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('listening.loading') || 'Loading...'}</div>
          ) : (
            <div className="hierarchy-list">
              {levels.length === 0 ? (
                <div className="no-data">{t('homework.noLevels') || 'No levels yet.'}</div>
              ) : (
                levels.map(level => (
                  <div key={level._id} className="hierarchy-card" onClick={() => selectLevel(level)}>
                    <div className="hierarchy-icon">🎧</div>
                    <div className="hierarchy-info">
                      <h4>{level.name}</h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteLevel(level._id); }}
                    >
                      {t('homework.delete') || 'Delete'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {view === 'classes' && selectedLevel && (
        <>
          <form onSubmit={handleAddLesson} className="word-form">
            <h3>{t('listening.addClass') || 'Add Class'}</h3>
            <div className="form-row lesson-form-row">
              <div className="form-field">
                <label className="form-label">{t('homework.lessonName') || 'Class Name'}</label>
                <input
                  type="text"
                  placeholder={t('listening.newClass') || 'New class name'}
                  value={lessonForm.name}
                  onChange={e => setLessonForm({ ...lessonForm, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('homework.order') || 'Order'}</label>
                <input
                  type="number"
                  min="1"
                  value={lessonForm.order}
                  onChange={e => setLessonForm({ ...lessonForm, order: parseInt(e.target.value, 10) || 1 })}
                  className="form-input"
                  style={{ maxWidth: '80px' }}
                />
              </div>
              <div className="form-field form-field-actions">
                <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
              </div>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('listening.loading') || 'Loading...'}</div>
          ) : (
            <div className="lessons-list">
              {lessons.length === 0 ? (
                <div className="no-data">{t('listening.noClasses') || 'No listening classes available yet.'}</div>
              ) : (
                lessons.map(lesson => (
                  <div key={lesson._id} className="lesson-item">
                    <div className="lesson-row">
                      <div className="lesson-main" onClick={() => selectLesson(lesson)} style={{ cursor: 'pointer' }}>
                        <span className="lesson-order">{lesson.order}</span>
                        <span className="lesson-name">{lesson.name}</span>
                        <span className="lesson-meta">
                          {lesson.listeningCount || 0} {t('listening.exercises') || 'exercises'}
                        </span>
                      </div>
                      <div className="lesson-actions">
                        <button type="button" className="btn btn-small btn-primary" onClick={() => selectLesson(lesson)}>
                          {t('listening.exercises') || 'Exercises'}
                        </button>
                        <button type="button" className="btn btn-small btn-delete" onClick={() => handleDeleteLesson(lesson._id)}>
                          {t('homework.delete') || 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {view === 'exercises' && selectedLesson && (
        <>
          <form onSubmit={handleAddExercise} className="word-form">
            <h3>{t('listening.addExercise') || 'Add Listening Exercise'}</h3>
            <div className="form-row" style={{ flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder={t('listening.exerciseTitle') || 'Title (e.g. Dialogue 1)'}
                value={exerciseForm.title}
                onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                min="1"
                value={exerciseForm.order}
                onChange={e => setExerciseForm({ ...exerciseForm, order: parseInt(e.target.value, 10) || 1 })}
                className="form-input"
                style={{ maxWidth: '80px' }}
                title={t('homework.order') || 'Order'}
              />
            </div>
            <textarea
              placeholder={t('listening.scriptPlaceholder') || 'Full script / transcript students should type...'}
              value={exerciseForm.script}
              onChange={e => setExerciseForm({ ...exerciseForm, script: e.target.value })}
              rows={4}
              className="form-input"
              required
              style={{ width: '100%', marginTop: '12px', resize: 'vertical' }}
            />
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="file-input-row" style={{ flex: 1 }}>
                <label>{t('listening.audioFile') || 'Audio file'} (mp3, wav, m4a)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setAudioFile(e.target.files[0] || null)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (t('listening.uploading') || 'Uploading...') : (t('homework.add') || 'Add')}
              </button>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('listening.loading') || 'Loading...'}</div>
          ) : (
            <div className="listening-exercise-list">
              {exercises.length === 0 ? (
                <div className="no-data">{t('listening.noExercises') || 'No exercises yet. Add one above.'}</div>
              ) : (
                exercises.map(exercise => (
                  <div key={exercise._id} className="listening-exercise-card">
                    {editingExercise === exercise._id ? (
                      <div className="edit-exercise-form">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          className="form-input"
                        />
                        <textarea
                          value={editForm.script}
                          onChange={e => setEditForm({ ...editForm, script: e.target.value })}
                          rows={4}
                          className="form-input"
                        />
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={e => setEditAudioFile(e.target.files[0] || null)}
                        />
                        <div className="card-actions">
                          <button type="button" className="btn btn-small btn-primary" onClick={() => handleUpdateExercise(exercise._id)} disabled={submitting}>
                            {t('listening.save') || 'Save'}
                          </button>
                          <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditingExercise(null)}>
                            {t('listening.cancel') || 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="exercise-card-header">
                          <strong>{exercise.title}</strong>
                          <div className="card-actions">
                            <button type="button" className="btn btn-small btn-edit" onClick={() => startEditExercise(exercise)}>
                              {t('listening.edit') || 'Edit'}
                            </button>
                            <button type="button" className="btn btn-small btn-delete" onClick={() => handleDeleteExercise(exercise._id)}>
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
          )}
        </>
      )}
    </div>
  );
};

export default ListeningManageTab;
