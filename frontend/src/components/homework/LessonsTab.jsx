import React, { useState, useEffect } from 'react';
import { languageAPI, levelAPI, lessonAPI, homeworkAPI } from '../../utils/api';

const LessonsTab = ({ t }) => {
  const [view, setView] = useState('languages');
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Data state
  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonWords, setLessonWords] = useState([]);

  // Form states
  const [newLanguage, setNewLanguage] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [levelConfig, setLevelConfig] = useState({
    classesCount: 11,
    wordsPerClass: 20,
    examTimeLimit: 300,
    minPassScore: 70
  });
  const [lessonForm, setLessonForm] = useState({ name: '', order: 1, examTimeLimit: 300, minPassScore: 70 });
  const [editingLesson, setEditingLesson] = useState(null);
  const [newWord, setNewWord] = useState({ english: '', uzbek: '' });
  const [editingWord, setEditingWord] = useState(null);
  const [editWordForm, setEditWordForm] = useState({ english: '', uzbek: '' });
  const [generating, setGenerating] = useState(false);

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
      const res = await lessonAPI.getAllLessons(levelId);
      if (res.data.success) setLessons(res.data.data.lessons);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonWords = async (lessonId) => {
    setLoading(true);
    try {
      const res = await lessonAPI.getLesson(lessonId);
      if (res.data.success) setLessonWords(res.data.data.words || []);
    } catch (err) {
      console.error('Error fetching words:', err);
    } finally {
      setLoading(false);
    }
  };

  // Language handlers
  const handleCreateLanguage = async (e) => {
    e.preventDefault();
    if (!newLanguage.trim()) return;
    try {
      await languageAPI.create({ name: newLanguage.trim() });
      setNewLanguage('');
      fetchLanguages();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating language');
    }
  };

  const handleDeleteLanguage = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await languageAPI.delete(id);
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

  // Level handlers
  const handleCreateLevel = async (e) => {
    e.preventDefault();
    if (!newLevel.trim() || !selectedLanguage) return;
    try {
      await levelAPI.create({
        name: newLevel.trim(),
        languageId: selectedLanguage._id,
        classesCount: parseInt(levelConfig.classesCount) || 11,
        wordsPerClass: parseInt(levelConfig.wordsPerClass) || 20,
        examTimeLimit: parseInt(levelConfig.examTimeLimit) || 300,
        minPassScore: parseInt(levelConfig.minPassScore) || 70
      });
      setNewLevel('');
      setLevelConfig({ classesCount: 11, wordsPerClass: 20, examTimeLimit: 300, minPassScore: 70 });
      fetchLevels(selectedLanguage._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating level');
    }
  };

  const handleDeleteLevel = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await levelAPI.delete(id);
      fetchLevels(selectedLanguage._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting level');
    }
  };

  const selectLevel = (lvl) => {
    setSelectedLevel(lvl);
    fetchLessons(lvl._id);
    setView('lessons');
  };

  // Lesson handlers
  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.name.trim() || !selectedLevel) return;
    try {
      await lessonAPI.createLesson({
        name: lessonForm.name.trim(),
        levelId: selectedLevel._id,
        order: lessonForm.order,
        examTimeLimit: lessonForm.examTimeLimit,
        minPassScore: lessonForm.minPassScore
      });
      setLessonForm({ name: '', order: 1, examTimeLimit: 300, minPassScore: 70 });
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating lesson');
    }
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!editingLesson) return;
    try {
      await lessonAPI.updateLesson(editingLesson._id, {
        name: lessonForm.name.trim(),
        order: lessonForm.order,
        examTimeLimit: lessonForm.examTimeLimit,
        minPassScore: lessonForm.minPassScore
      });
      setEditingLesson(null);
      setLessonForm({ name: '', order: 1, examTimeLimit: 300, minPassScore: 70 });
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating lesson');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await lessonAPI.deleteLesson(id);
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting lesson');
    }
  };

  const startEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      name: lesson.name,
      order: lesson.order,
      examTimeLimit: lesson.examTimeLimit,
      minPassScore: lesson.minPassScore
    });
  };

  const selectLesson = (lesson) => {
    setSelectedLesson(lesson);
    fetchLessonWords(lesson._id);
    setView('words');
  };

  // Auto-generate classes
  const handleAutoGenerate = async () => {
    if (!selectedLevel) return;
    setGenerating(true);
    try {
      const res = await lessonAPI.autoGenerateClasses(selectedLevel._id, {
        count: selectedLevel.classesCount || 11,
        wordsPerClass: selectedLevel.wordsPerClass || 20,
        examTimeLimit: selectedLevel.examTimeLimit || 300,
        minPassScore: selectedLevel.minPassScore || 70
      });
      if (res.data.success) {
        fetchLessons(selectedLevel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error generating classes');
    } finally {
      setGenerating(false);
    }
  };

  // Word handlers
  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWord.english.trim() || !newWord.uzbek.trim() || !selectedLesson) return;
    try {
      const createRes = await homeworkAPI.addWord({
        english: newWord.english.trim(),
        uzbek: newWord.uzbek.trim(),
        lessonId: selectedLesson._id
      });
      if (createRes.data.success) {
        setNewWord({ english: '', uzbek: '' });
        fetchLessonWords(selectedLesson._id);
        fetchLessons(selectedLevel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding word');
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      await lessonAPI.removeWordFromLesson(selectedLesson._id, wordId);
      fetchLessonWords(selectedLesson._id);
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting word');
    }
  };

  const startEditWord = (word) => {
    setEditingWord(word._id);
    setEditWordForm({ english: word.english, uzbek: word.uzbek });
  };

  const handleUpdateWord = async (e) => {
    e.preventDefault();
    if (!editWordForm.english.trim() || !editWordForm.uzbek.trim()) return;
    try {
      await homeworkAPI.updateWord(editingWord, {
        english: editWordForm.english.trim(),
        uzbek: editWordForm.uzbek.trim()
      });
      setEditingWord(null);
      setEditWordForm({ english: '', uzbek: '' });
      fetchLessonWords(selectedLesson._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating word');
    }
  };

  const cancelEditWord = () => {
    setEditingWord(null);
    setEditWordForm({ english: '', uzbek: '' });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <button key="lang" className="breadcrumb-item" onClick={() => setView('languages')}>
        {t('homework.languages') || 'Languages'}
      </button>
    );
    if (selectedLanguage) {
      items.push(
        <span key="sep1" className="breadcrumb-sep">/</span>,
        <button key="lvl" className="breadcrumb-item" onClick={() => setView('levels')}>
          {selectedLanguage.name}
        </button>
      );
    }
    if (selectedLevel && (view === 'lessons' || view === 'words')) {
      items.push(
        <span key="sep2" className="breadcrumb-sep">/</span>,
        <button key="les" className="breadcrumb-item" onClick={() => setView('lessons')}>
          {selectedLevel.name}
        </button>
      );
    }
    if (selectedLesson && view === 'words') {
      items.push(
        <span key="sep3" className="breadcrumb-sep">/</span>,
        <span key="word" className="breadcrumb-item active">{selectedLesson.name}</span>
      );
    }
    return <div className="breadcrumb">{items}</div>;
  };

  return (
    <div className="lessons-section">
      {renderBreadcrumb()}

      {/* LANGUAGES VIEW */}
      {view === 'languages' && (
        <>
          <form onSubmit={handleCreateLanguage} className="word-form">
            <h3>{t('homework.addLanguage') || 'Add Language'}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('homework.languageName') || 'Language name (e.g., English)'}
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('homework.loading') || 'Loading...'}</div>
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

      {/* LEVELS VIEW */}
      {view === 'levels' && selectedLanguage && (
        <>
          <form onSubmit={handleCreateLevel} className="word-form">
            <h3>{t('homework.addLevel') || 'Add Level'}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('homework.levelName') || 'Level name (e.g., Blackhole 1)'}
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="form-input"
                required
              />
              <input
                type="number"
                placeholder={t('homework.classesCount') || 'Classes'}
                value={levelConfig.classesCount}
                onChange={(e) => setLevelConfig({ ...levelConfig, classesCount: e.target.value })}
                className="form-input"
                min="1"
                style={{ maxWidth: '80px' }}
                title={t('homework.defaultClasses') || 'Default classes count'}
              />
              <input
                type="number"
                placeholder={t('homework.wordsPerClass') || 'Words/Class'}
                value={levelConfig.wordsPerClass}
                onChange={(e) => setLevelConfig({ ...levelConfig, wordsPerClass: e.target.value })}
                className="form-input"
                min="1"
                style={{ maxWidth: '90px' }}
                title={t('homework.defaultWords') || 'Default words per class'}
              />
              <input
                type="number"
                placeholder={t('homework.timeLimit') || 'Time (sec)'}
                value={levelConfig.examTimeLimit}
                onChange={(e) => setLevelConfig({ ...levelConfig, examTimeLimit: e.target.value })}
                className="form-input"
                min="30"
                style={{ maxWidth: '100px' }}
              />
              <input
                type="number"
                placeholder={t('homework.passScore') || 'Pass %'}
                value={levelConfig.minPassScore}
                onChange={(e) => setLevelConfig({ ...levelConfig, minPassScore: e.target.value })}
                className="form-input"
                min="1"
                max="100"
                style={{ maxWidth: '80px' }}
              />
              <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="hierarchy-list">
              {levels.length === 0 ? (
                <div className="no-data">{t('homework.noLevels') || 'No levels yet.'}</div>
              ) : (
                levels.map(lvl => (
                  <div key={lvl._id} className="hierarchy-card" onClick={() => selectLevel(lvl)}>
                    <div className="hierarchy-icon">📚</div>
                    <div className="hierarchy-info">
                      <h4>{lvl.name}</h4>
                      <span className="hierarchy-meta">
                        {lvl.classesCount || 11} {t('homework.classes') || 'classes'} ·
                        {lvl.wordsPerClass || 20} {t('homework.wordsPerClassShort') || 'words/class'} ·
                        {Math.floor((lvl.examTimeLimit || 300) / 60)} {t('homework.min') || 'min'} ·
                        {lvl.minPassScore || 70}%
                      </span>
                    </div>
                    <button
                      className="btn btn-small btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteLevel(lvl._id); }}
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

      {/* LESSONS VIEW */}
      {view === 'lessons' && selectedLevel && (
        <>
          <div className="auto-generate-bar">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAutoGenerate}
              disabled={generating}
            >
              {generating
                ? (t('homework.generating') || 'Generating...')
                : (t('homework.autoGenerateClasses') || `Auto-generate ${selectedLevel?.classesCount || 11} Classes`)
              }
            </button>
            <span className="auto-generate-hint">
              {t('homework.autoGenerateHint') || 'Creates classes with configured defaults'}
            </span>
          </div>

          <form onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson} className="word-form">
            <h3>{editingLesson ? (t('homework.editLesson') || 'Edit Lesson') : (t('homework.addNewLesson') || 'Add New Lesson')}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('homework.lessonName') || 'Lesson Name'}
                value={lessonForm.name}
                onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                placeholder={t('homework.order') || 'Order'}
                value={lessonForm.order}
                onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                className="form-input"
                min="1"
                style={{ maxWidth: '80px' }}
              />
              <input
                type="number"
                placeholder={t('homework.timeLimit') || 'Time (sec)'}
                value={lessonForm.examTimeLimit}
                onChange={(e) => setLessonForm({ ...lessonForm, examTimeLimit: parseInt(e.target.value) || 300 })}
                className="form-input"
                min="30"
                style={{ maxWidth: '100px' }}
              />
              <input
                type="number"
                placeholder={t('homework.passScore') || 'Pass %'}
                value={lessonForm.minPassScore}
                onChange={(e) => setLessonForm({ ...lessonForm, minPassScore: parseInt(e.target.value) || 70 })}
                className="form-input"
                min="1"
                max="100"
                style={{ maxWidth: '80px' }}
              />
              <button type="submit" className="btn btn-primary">
                {editingLesson ? (t('homework.update') || 'Update') : (t('homework.add') || 'Add')}
              </button>
              {editingLesson && (
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditingLesson(null);
                  setLessonForm({ name: '', order: 1, examTimeLimit: 300, minPassScore: 70 });
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
                <div className="no-data">{t('homework.noLessons') || 'No lessons yet.'}</div>
              ) : (
                lessons.map(lesson => (
                  <div key={lesson._id} className="lesson-item">
                    <div className="lesson-row">
                      <div className="lesson-main" onClick={() => selectLesson(lesson)} style={{ cursor: 'pointer' }}>
                        <span className="lesson-order">{lesson.order}</span>
                        <span className="lesson-name">{lesson.name}</span>
                        <span className="lesson-meta">{lesson.wordIds?.length || 0} {t('homework.words') || 'words'} · {formatTime(lesson.examTimeLimit)} · {lesson.minPassScore}%</span>
                      </div>
                      <div className="lesson-actions">
                        <button className="btn btn-small btn-edit" onClick={() => startEditLesson(lesson)}>
                          {t('homework.edit') || 'Edit'}
                        </button>
                        <button className="btn btn-small btn-primary" onClick={() => selectLesson(lesson)}>
                          {t('homework.words') || 'Words'}
                        </button>
                        <button className="btn btn-small btn-delete" onClick={() => handleDeleteLesson(lesson._id)}>
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

      {/* WORDS VIEW */}
      {view === 'words' && selectedLesson && (
        <>
          <form onSubmit={handleAddWord} className="word-form">
            <h3>{t('homework.addNewWord') || 'Add New Word'}</h3>
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
              <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
            </div>
          </form>

          {loading ? (
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
                      {editingWord === word._id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editWordForm.english}
                              onChange={(e) => setEditWordForm({ ...editWordForm, english: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', padding: '4px 8px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editWordForm.uzbek}
                              onChange={(e) => setEditWordForm({ ...editWordForm, uzbek: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', padding: '4px 8px' }}
                            />
                          </td>
                          <td className="actions">
                            <button className="btn btn-small btn-primary" onClick={handleUpdateWord}>
                              {t('homework.save') || 'Save'}
                            </button>
                            <button className="btn btn-small btn-secondary" onClick={cancelEditWord}>
                              {t('homework.cancel') || 'Cancel'}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{word.english}</td>
                          <td>{word.uzbek}</td>
                          <td className="actions">
                            <button className="btn btn-small btn-edit" onClick={() => startEditWord(word)}>
                              {t('homework.edit') || 'Edit'}
                            </button>
                            <button className="btn btn-small btn-delete" onClick={() => handleDeleteWord(word._id)}>
                              {t('homework.delete') || 'Delete'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {lessonWords.length === 0 && (
                <div className="no-data">{t('homework.noWordsInLesson') || 'No words in this lesson yet.'}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LessonsTab;
