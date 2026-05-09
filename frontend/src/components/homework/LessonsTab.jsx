import React, { useState, useEffect } from 'react';
import { languageAPI, levelAPI, lessonAPI, homeworkAPI, sentenceAPI, uploadAPI } from '../../utils/api';

const LessonsTab = ({ t, mode = 'words' }) => {
  const isSentences = mode === 'sentences';
  const itemLabel = isSentences ? 'sentences' : 'words';
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
  const [lessonItems, setLessonItems] = useState([]);

  // Form states
  const [newLanguage, setNewLanguage] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [levelConfig, setLevelConfig] = useState({
    classesCount: 11,
    wordsPerClass: 20,
    minPassScore: 70
  });
  const [lessonForm, setLessonForm] = useState({ name: '', order: 1, minPassScore: 70, maxWords: 20 });
  const [editingLesson, setEditingLesson] = useState(null);
  const [newItem, setNewItem] = useState({ english: '', uzbek: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [editItemForm, setEditItemForm] = useState({ english: '', uzbek: '' });
  const [generating, setGenerating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [directionSettingsOpen, setDirectionSettingsOpen] = useState(null);
  const [itemSearch, setItemSearch] = useState('');

  const directionOptions = [
    { value: 'mixed', label: t('homework.mixed') || 'Mixed' },
    { value: 'en-to-uz', label: 'EN → UZ' },
    { value: 'uz-to-en', label: 'UZ → EN' }
  ];

  // Upload / OCR state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('docx'); // 'docx' or 'ocr'
  const [uploadLoading, setUploadLoading] = useState(false);
  const [extractedPairs, setExtractedPairs] = useState([]);
  const [selectedPairs, setSelectedPairs] = useState(new Set());
  const [uploadStep, setUploadStep] = useState('select'); // 'select', 'preview', 'importing'
  const [rawExtractedText, setRawExtractedText] = useState('');

  useEffect(() => {
    fetchLanguages();
  }, []);

  // Close direction settings dropdown when clicking outside
  useEffect(() => {
    if (!directionSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.direction-settings-wrapper')) {
        setDirectionSettingsOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [directionSettingsOpen]);

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
      const res = await lessonAPI.getAllLessons(levelId, isSentences ? 'sentences' : 'words');
      if (res.data.success) setLessons(res.data.data.lessons);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonItems = async (lessonId) => {
    setLoading(true);
    try {
      if (isSentences) {
        const res = await sentenceAPI.getAll({ lessonId });
        if (res.data.success) setLessonItems(res.data.data.sentences || []);
      } else {
        const res = await lessonAPI.getLesson(lessonId);
        if (res.data.success) setLessonItems(res.data.data.words || []);
      }
    } catch (err) {
      console.error(`Error fetching ${itemLabel}:`, err);
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
        minPassScore: parseInt(levelConfig.minPassScore) || 70
      });
      setNewLevel('');
      setLevelConfig({ classesCount: 11, wordsPerClass: 20, minPassScore: 70 });
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
        minPassScore: lessonForm.minPassScore,
        maxWords: lessonForm.maxWords,
        type: isSentences ? 'sentences' : 'words'
      });
      setLessonForm({ name: '', order: 1, minPassScore: 70, maxWords: 20 });
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
        minPassScore: lessonForm.minPassScore,
        maxWords: lessonForm.maxWords
      });
      setEditingLesson(null);
      setLessonForm({ name: '', order: 1, minPassScore: 70, maxWords: 20 });
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
      minPassScore: lesson.minPassScore,
      maxWords: lesson.maxWords || 20
    });
  };

  const selectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setItemSearch('');
    fetchLessonItems(lesson._id);
    setView('items');
  };

  // Update lesson direction mode
  const handleUpdateDirectionMode = async (lessonId, directionMode) => {
    try {
      await lessonAPI.updateLesson(lessonId, { directionMode });
      setLessons(prev => prev.map(l => l._id === lessonId ? { ...l, directionMode } : l));
      setDirectionSettingsOpen(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating direction mode');
    }
  };

  const getDirectionBadge = (mode) => {
    if (!mode || mode === 'mixed') return { label: t('homework.mixed') || 'Mixed', class: 'direction-mixed' };
    if (mode === 'en-to-uz') return { label: 'EN → UZ', class: 'direction-en-uz' };
    if (mode === 'uz-to-en') return { label: 'UZ → EN', class: 'direction-uz-en' };
    return { label: t('homework.mixed') || 'Mixed', class: 'direction-mixed' };
  };

  // Auto-generate classes
  const handleAutoGenerate = async () => {
    if (!selectedLevel) return;
    setGenerating(true);
    try {
      const res = await lessonAPI.autoGenerateClasses(selectedLevel._id, {
        count: selectedLevel.classesCount || 11,
        wordsPerClass: selectedLevel.wordsPerClass || 20,
        minPassScore: selectedLevel.minPassScore || 70,
        type: isSentences ? 'sentences' : 'words'
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

  // Item handlers (words or sentences)
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.english.trim() || !newItem.uzbek.trim() || !selectedLesson) return;
    setDuplicateWarning(null);
    try {
      let createRes;
      if (isSentences) {
        createRes = await sentenceAPI.create({
          english: newItem.english.trim(),
          uzbek: newItem.uzbek.trim(),
          lessonId: selectedLesson._id
        });
      } else {
        createRes = await homeworkAPI.addWord({
          english: newItem.english.trim(),
          uzbek: newItem.uzbek.trim(),
          lessonId: selectedLesson._id
        });
      }
      if (createRes.data.success) {
        setNewItem({ english: '', uzbek: '' });
        fetchLessonItems(selectedLesson._id);
        fetchLessons(selectedLevel._id);
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409 && data?.duplicate) {
        setDuplicateWarning({
          message: data.message,
          english: data.duplicate.english,
          uzbek: data.duplicate.uzbek,
          location: data.duplicate.location
        });
      } else {
        alert(data?.message || `Error adding ${itemLabel}`);
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm(t('homework.confirmDelete') || 'Are you sure?')) return;
    try {
      if (isSentences) {
        await sentenceAPI.delete(itemId);
      } else {
        await lessonAPI.removeWordFromLesson(selectedLesson._id, itemId);
      }
      fetchLessonItems(selectedLesson._id);
      fetchLessons(selectedLevel._id);
    } catch (err) {
      alert(err.response?.data?.message || `Error deleting ${itemLabel}`);
    }
  };

  const startEditItem = (item) => {
    setEditingItem(item._id);
    setEditItemForm({
      english: item.english,
      uzbek: item.uzbek
    });
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editItemForm.english.trim() || !editItemForm.uzbek.trim()) return;
    try {
      if (isSentences) {
        await sentenceAPI.update(editingItem, {
          english: editItemForm.english.trim(),
          uzbek: editItemForm.uzbek.trim()
        });
      } else {
        await homeworkAPI.updateWord(editingItem, {
          english: editItemForm.english.trim(),
          uzbek: editItemForm.uzbek.trim()
        });
      }
      setEditingItem(null);
      setEditItemForm({ english: '', uzbek: '' });
      fetchLessonItems(selectedLesson._id);
    } catch (err) {
      console.error('Update item error:', err);
      alert(err.response?.data?.message || `Error updating ${itemLabel}`);
    }
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setEditItemForm({ english: '', uzbek: '' });
  };

  // Upload / OCR handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
  };

  const handleParseFile = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setExtractedPairs([]);
    setSelectedPairs(new Set());

    const formData = new FormData();
    formData.append(uploadType === 'docx' ? 'document' : 'image', uploadFile);

    try {
      const endpoint = uploadType === 'docx' ? uploadAPI.parseDocx : uploadAPI.parseOCR;
      const res = await endpoint(formData);
      if (res.data.success) {
        const pairs = res.data.data.pairs || [];
        setExtractedPairs(pairs);
        setRawExtractedText(res.data.data.rawText || '');
        setSelectedPairs(new Set(pairs.map((_, i) => i)));
        setUploadStep('preview');
      } else {
        alert(res.data.message || 'Failed to parse file');
      }
    } catch (err) {
      console.error('Upload parse error:', err);
      alert(err.response?.data?.message || 'Error parsing file');
    } finally {
      setUploadLoading(false);
    }
  };

  const togglePairSelection = (index) => {
    setSelectedPairs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleBulkImport = async () => {
    if (selectedPairs.size === 0) return;
    const items = Array.from(selectedPairs).map(i => extractedPairs[i]).filter(Boolean);

    setUploadStep('importing');
    try {
      const res = isSentences
        ? await uploadAPI.bulkImportSentences({ lessonId: selectedLesson._id, items })
        : await uploadAPI.bulkImportWords({ lessonId: selectedLesson._id, items });

      if (res.data.success) {
        const created = res.data.data.created || 0;
        const skipped = res.data.data.skipped || [];
        const skippedCount = skipped.length;
        const noun = isSentences ? 'sentences' : 'words';
        let msg = `${created} ${noun} imported`;
        if (skippedCount > 0) {
          msg += `, ${skippedCount} skipped`;
          const dupes = skipped.filter(s => s.reason === 'Duplicate in lesson').length;
          const empty = skipped.filter(s => s.reason === 'Missing english or uzbek').length;
          const xml = skipped.filter(s => s.reason === 'Contains XML markup').length;
          const reasons = [];
          if (dupes) reasons.push(`${dupes} duplicate`);
          if (empty) reasons.push(`${empty} empty`);
          if (xml) reasons.push(`${xml} XML`);
          if (reasons.length) msg += ` (${reasons.join(', ')})`;
        }
        msg += '!';
        alert(msg);
        fetchLessonItems(selectedLesson._id);
        fetchLessons(selectedLevel._id);
        setShowUploadModal(false);
        setUploadStep('select');
        setUploadFile(null);
        setExtractedPairs([]);
        setSelectedPairs(new Set());
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      alert(err.response?.data?.message || 'Import failed');
      setUploadStep('preview');
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadStep('select');
    setUploadFile(null);
    setExtractedPairs([]);
    setSelectedPairs(new Set());
    setRawExtractedText('');
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <button key="lang" className="breadcrumb-item" onClick={() => { setView('languages'); setItemSearch(''); }}>
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
    if (selectedLevel && (view === 'lessons' || view === 'items')) {
      items.push(
        <span key="sep2" className="breadcrumb-sep">/</span>,
        <button key="les" className="breadcrumb-item" onClick={() => { setView('lessons'); setItemSearch(''); }}>
          {selectedLevel.name}
        </button>
      );
    }
    if (selectedLesson && view === 'items') {
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
          <form onSubmit={handleCreateLevel} className="level-form">
            <h3>{t('homework.addLevel') || 'Add Level'}</h3>
            <div className="level-form-main">
              <input
                type="text"
                placeholder={t('homework.levelName') || 'Level name (e.g., Blackhole 1)'}
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="form-input level-name-input"
                required
              />
              <button type="submit" className="btn btn-primary level-add-btn">{t('homework.add') || 'Add'}</button>
            </div>
            <div className="level-form-config">
              <div className="config-field">
                <span className="config-label">{t('homework.classesCount') || 'Classes'}</span>
                <input
                  type="number"
                  value={levelConfig.classesCount}
                  onChange={(e) => setLevelConfig({ ...levelConfig, classesCount: e.target.value })}
                  className="config-input"
                  min="1"
                  title={t('homework.defaultClasses') || 'Default classes count'}
                />
              </div>
              {!isSentences && (
                <div className="config-field">
                  <span className="config-label">{t('homework.wordsPerClass') || 'Words/Class'}</span>
                  <input
                    type="number"
                    value={levelConfig.wordsPerClass}
                    onChange={(e) => setLevelConfig({ ...levelConfig, wordsPerClass: e.target.value })}
                    className="config-input"
                    min="1"
                    title={t('homework.defaultWords') || 'Default words per class'}
                  />
                </div>
              )}
              <div className="config-field">
                <span className="config-label">{t('homework.passScore') || 'Pass %'}</span>
                <input
                  type="number"
                  value={levelConfig.minPassScore}
                  onChange={(e) => setLevelConfig({ ...levelConfig, minPassScore: e.target.value })}
                  className="config-input"
                  min="1"
                  max="100"
                />
              </div>
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
                        {lvl.classesCount || 11} {t('homework.classes') || 'classes'}
                        {!isSentences && (
                          <> · {lvl.wordsPerClass || 20} {t('homework.wordsPerClassShort') || 'words/class'}</>
                        )}
                        {' · '}{lvl.minPassScore || 70}%
                      </span>
                    </div>
                    <div className="hierarchy-actions">
                      <button
                        className="btn btn-small btn-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteLevel(lvl._id); }}
                      >
                        {t('homework.delete') || 'Delete'}
                      </button>
                    </div>
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
            <div className="form-row lesson-form-row">
              <div className="form-field">
                <label className="form-label">{t('homework.lessonName') || 'Lesson Name'}</label>
                <input
                  type="text"
                  placeholder={t('homework.lessonName') || 'e.g., Class 1'}
                  value={lessonForm.name}
                  onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">{t('homework.order') || 'Order'}</label>
                <input
                  type="number"
                  placeholder="1"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                  className="form-input"
                  min="1"
                  style={{ maxWidth: '80px' }}
                />
              </div>
              {!isSentences && (
                <div className="form-field">
                  <label className="form-label">{t('homework.maxWords') || 'Max Words'}</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={lessonForm.maxWords}
                    onChange={(e) => setLessonForm({ ...lessonForm, maxWords: parseInt(e.target.value) || 20 })}
                    className="form-input"
                    min="1"
                    style={{ maxWidth: '90px' }}
                  />
                </div>
              )}
              <div className="form-field">
                <label className="form-label">{t('homework.passScore') || 'Pass %'}</label>
                <input
                  type="number"
                  placeholder="70"
                  value={lessonForm.minPassScore}
                  onChange={(e) => setLessonForm({ ...lessonForm, minPassScore: parseInt(e.target.value) || 70 })}
                  className="form-input"
                  min="1"
                  max="100"
                  style={{ maxWidth: '80px' }}
                />
              </div>
              <div className="form-field form-field-actions">
                <button type="submit" className="btn btn-primary">
                  {editingLesson ? (t('homework.update') || 'Update') : (t('homework.add') || 'Add')}
                </button>
                {editingLesson && (
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setEditingLesson(null);
                    setLessonForm({ name: '', order: 1, minPassScore: 70, maxWords: 20 });
                  }}>
                    {t('homework.cancel') || 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          </form>

          {loading ? (
            <div className="loading">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="lessons-list">
              {lessons.length === 0 ? (
                <div className="no-data">{t('homework.noLessons') || 'No lessons yet.'}</div>
              ) : (
                lessons.map(lesson => {
                  const badge = getDirectionBadge(lesson.directionMode);
                  const isSettingsOpen = directionSettingsOpen === lesson._id;
                  return (
                    <div key={lesson._id} className="lesson-item">
                      <div className="lesson-row">
                        <div className="lesson-main" onClick={() => selectLesson(lesson)} style={{ cursor: 'pointer' }}>
                          <span className="lesson-order">{lesson.order}</span>
                          <span className="lesson-name">{lesson.name}</span>
                          <span className="lesson-meta">
                            {isSentences
                              ? `${lesson.sentenceCount || 0} ${t('sentences.title') || 'Sentences'} · ${lesson.minPassScore}%`
                              : `${lesson.wordIds?.length || 0}/${lesson.maxWords || 20} ${t('homework.words') || 'words'} · ${lesson.minPassScore}%`
                            }
                          </span>
                          <span className={`direction-badge ${badge.class}`}>{badge.label}</span>
                        </div>
                        <div className="lesson-actions">
                          <div className="direction-settings-wrapper">
                            <button
                              className="btn btn-small btn-settings"
                              onClick={(e) => { e.stopPropagation(); setDirectionSettingsOpen(isSettingsOpen ? null : lesson._id); }}
                              title={t('homework.directionSettings') || 'Direction settings'}
                            >
                              ⚙️
                            </button>
                            {isSettingsOpen && (
                              <div className="direction-settings-dropdown">
                                {directionOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    className={`direction-option ${lesson.directionMode === opt.value ? 'active' : ''}`}
                                    onClick={() => handleUpdateDirectionMode(lesson._id, opt.value)}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button className="btn btn-small btn-edit" onClick={() => startEditLesson(lesson)}>
                            {t('homework.edit') || 'Edit'}
                          </button>
                          <button className="btn btn-small btn-primary" onClick={() => selectLesson(lesson)}>
                            {isSentences ? (t('sentences.title') || 'Sentences') : (t('homework.words') || 'Words')}
                          </button>
                          <button className="btn btn-small btn-delete" onClick={() => handleDeleteLesson(lesson._id)}>
                            {t('homework.delete') || 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ITEMS VIEW (Words or Sentences) */}
      {view === 'items' && selectedLesson && (
        <>
          <form onSubmit={handleAddItem} className="word-form word-form-sticky">
            <h3>{isSentences ? (t('sentences.addSentence') || 'Add New Sentence') : (t('homework.addNewWord') || 'Add New Word')}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={isSentences ? (t('sentences.englishPlaceholder') || 'English sentence') : (t('homework.englishWord') || 'English word')}
                value={newItem.english}
                onChange={(e) => { setNewItem({ ...newItem, english: e.target.value }); setDuplicateWarning(null); }}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder={isSentences ? (t('sentences.uzbekPlaceholder') || 'Uzbek translation') : (t('homework.uzbekWord') || 'Uzbek meaning (comma-separated)')}
                value={newItem.uzbek}
                onChange={(e) => { setNewItem({ ...newItem, uzbek: e.target.value }); setDuplicateWarning(null); }}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary">{t('homework.add') || 'Add'}</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadModal(true)}
              >
                {t('homework.uploadFile') || 'Upload File'}
              </button>
            </div>
          </form>

          {/* Search Filter */}
          <div className="items-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={isSentences
                ? (t('sentences.searchSentences') || 'Search sentences...')
                : (t('homework.searchWords') || 'Search words...')
              }
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="items-search-input"
            />
            {itemSearch && (
              <button className="search-clear-btn" onClick={() => setItemSearch('')} title={t('homework.clear') || 'Clear'}>
                ×
              </button>
            )}
          </div>

          {duplicateWarning && (
            <div className="duplicate-warning">
              <div className="duplicate-warning-icon">⚠️</div>
              <div className="duplicate-warning-content">
                <strong>{duplicateWarning.message}</strong>
                <div className="duplicate-details">
                  <span className="duplicate-word">{duplicateWarning.english}</span>
                  <span className="duplicate-sep">→</span>
                  <span className="duplicate-word">{duplicateWarning.uzbek}</span>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="lesson-words-table">
              <table className="words-table">
                <thead>
                  <tr>
                    <th className="num-col">#</th>
                    <th>{t('homework.english') || 'English'}</th>
                    <th>{isSentences ? (t('homework.uzbek') || 'Uzbek') : (t('homework.uzbek') || 'Uzbek Meaning')}</th>
                    <th className="actions">{t('homework.actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonItems.filter(item => {
                    const q = itemSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (item.english || '').toLowerCase().includes(q) || (item.uzbek || '').toLowerCase().includes(q);
                  }).map((item, idx) => (
                    <tr key={item._id}>
                      {editingItem === item._id ? (
                        <>
                          <td className="num-col">{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={editItemForm.english}
                              onChange={(e) => setEditItemForm({ ...editItemForm, english: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', padding: '4px 8px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editItemForm.uzbek}
                              onChange={(e) => setEditItemForm({ ...editItemForm, uzbek: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', padding: '4px 8px' }}
                            />
                          </td>
                          <td className="actions">
                            <button type="button" className="btn btn-small btn-primary" onClick={handleUpdateItem}>
                              {t('homework.save') || 'Save'}
                            </button>
                            <button type="button" className="btn btn-small btn-secondary" onClick={cancelEditItem}>
                              {t('homework.cancel') || 'Cancel'}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="num-col">{idx + 1}</td>
                          <td>{item.english}</td>
                          <td>{item.uzbek}</td>
                          <td className="actions">
                            <button className="btn btn-small btn-edit" onClick={() => startEditItem(item)}>
                              {t('homework.edit') || 'Edit'}
                            </button>
                            <button className="btn btn-small btn-delete" onClick={() => handleDeleteItem(item._id)}>
                              {t('homework.delete') || 'Delete'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {lessonItems.filter(item => {
                const q = itemSearch.trim().toLowerCase();
                if (!q) return true;
                return (item.english || '').toLowerCase().includes(q) || (item.uzbek || '').toLowerCase().includes(q);
              }).length === 0 && (
                <div className="no-data">{isSentences ? (t('sentences.noSentences') || 'No sentences in this lesson yet.') : (t('homework.noWordsInLesson') || 'No words in this lesson yet.')}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Upload / OCR Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('homework.uploadFile') || 'Upload File'}</h3>
              <button className="modal-close" onClick={closeUploadModal}>×</button>
            </div>

            {uploadStep === 'select' && (
              <div className="upload-step">
                <div className="upload-type-toggle">
                  <button
                    className={`btn ${uploadType === 'docx' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUploadType('docx')}
                  >
                    {t('homework.uploadWord') || 'Word Document'}
                  </button>
                  <button
                    className={`btn ${uploadType === 'ocr' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setUploadType('ocr')}
                  >
                    {t('homework.uploadImage') || 'Image (OCR)'}
                  </button>
                </div>

                <div className="upload-hint">
                  {uploadType === 'docx'
                    ? (t('homework.docxHint') || 'Upload a .docx file with English | Uzbek pairs on each line.')
                    : (t('homework.ocrHint') || 'Upload a clear image of a document with English and Uzbek text.')
                  }
                </div>

                <input
                  type="file"
                  accept={uploadType === 'docx' ? '.docx' : 'image/*'}
                  onChange={handleFileSelect}
                  className="file-input"
                />

                {uploadFile && (
                  <div className="file-selected">
                    <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}

                <div className="upload-actions">
                  <button className="btn btn-secondary" onClick={closeUploadModal}>
                    {t('homework.cancel') || 'Cancel'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleParseFile}
                    disabled={!uploadFile || uploadLoading}
                  >
                    {uploadLoading
                      ? (t('homework.parsing') || 'Parsing...')
                      : (t('homework.parse') || 'Parse File')
                    }
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'preview' && (
              <div className="upload-step">
                <div className="preview-header">
                  <span>{extractedPairs.length} {t('homework.itemsFound') || 'items found'}</span>
                  <label className="select-all-label">
                    <input
                      type="checkbox"
                      checked={selectedPairs.size === extractedPairs.length && extractedPairs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPairs(new Set(extractedPairs.map((_, i) => i)));
                        } else {
                          setSelectedPairs(new Set());
                        }
                      }}
                    />
                    {t('homework.selectAll') || 'Select All'}
                  </label>
                </div>

                <div className="pairs-list">
                  {extractedPairs.map((pair, idx) => (
                    <div key={idx} className={`pair-row ${selectedPairs.has(idx) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedPairs.has(idx)}
                        onChange={() => togglePairSelection(idx)}
                      />
                      <span className="pair-english">{pair.english}</span>
                      <span className="pair-sep">→</span>
                      <span className="pair-uzbek">{pair.uzbek}</span>
                    </div>
                  ))}
                </div>

                {extractedPairs.length === 0 && (
                  <div className="no-data">
                    <p>{t('homework.noPairsFound') || 'No valid pairs found. Check file format.'}</p>
                    {rawExtractedText && (
                      <details className="raw-text-details">
                        <summary>{t('homework.showRawText') || 'Show extracted text'}</summary>
                        <pre className="raw-text-preview">{rawExtractedText}</pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="upload-actions">
                  <button className="btn btn-secondary" onClick={() => setUploadStep('select')}>
                    {t('homework.back') || 'Back'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkImport}
                    disabled={selectedPairs.size === 0}
                  >
                    {t('homework.importSelected') || 'Import Selected'} ({selectedPairs.size})
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'importing' && (
              <div className="upload-step importing">
                <div className="loading-spinner" />
                <p>{t('homework.importing') || 'Importing...'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsTab;
