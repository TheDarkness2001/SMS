import React, { useState, useEffect } from 'react';
import { lessonAPI, levelAPI, languageAPI, examGroupsAPI } from '../../utils/api';

const ExamControl = ({ t }) => {
  // Navigation state: groups -> languages -> levels -> classes
  const [view, setView] = useState('groups');

  // Selection state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);

  // Data state
  const [groups, setGroups] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup && view === 'languages') {
      fetchLanguages();
    }
  }, [selectedGroup, view]);

  useEffect(() => {
    if (selectedLanguage && view === 'levels') {
      fetchLevels(selectedLanguage._id);
    }
  }, [selectedLanguage, view]);

  useEffect(() => {
    if (selectedLevel && view === 'classes') {
      fetchLessons(selectedLevel._id);
    }
  }, [selectedLevel, view]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await examGroupsAPI.getAll();
      if (res.data.success) {
        setGroups(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const res = await languageAPI.getAll();
      if (res.data.success) {
        setLanguages(res.data.data.languages || []);
      }
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
      if (res.data.success) {
        setLevels(res.data.data.levels || []);
      }
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
      if (res.data.success) {
        setLessons(res.data.data.lessons || []);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (lessonId) => {
    if (!selectedGroup) return;
    setTogglingId(lessonId);
    try {
      const res = await lessonAPI.toggleExamLock(lessonId, selectedGroup._id);
      if (res.data.success) {
        setLessons(prev => prev.map(l =>
          l._id === lessonId ? { ...l, examUnlockedFor: res.data.data.lesson.examUnlockedFor } : l
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error toggling lock');
    } finally {
      setTogglingId(null);
    }
  };

  const isUnlockedForGroup = (lesson) => {
    if (!selectedGroup) return false;
    return lesson.examUnlockedFor?.some(g => g.toString() === selectedGroup._id.toString()) || false;
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <button key="groups" className="breadcrumb-item" onClick={() => setView('groups')}>
        {t('homework.groups') || 'Groups'}
      </button>
    );
    if (selectedGroup) {
      items.push(
        <span key="sep1" className="breadcrumb-sep">/</span>,
        <button key="group" className="breadcrumb-item" onClick={() => setView('languages')}>
          {selectedGroup.groupName}
        </button>
      );
    }
    if (selectedLanguage && (view === 'levels' || view === 'classes')) {
      items.push(
        <span key="sep2" className="breadcrumb-sep">/</span>,
        <button key="lang" className="breadcrumb-item" onClick={() => setView('levels')}>
          {selectedLanguage.name}
        </button>
      );
    }
    if (selectedLevel && view === 'classes') {
      items.push(
        <span key="sep3" className="breadcrumb-sep">/</span>,
        <span key="lvl" className="breadcrumb-item active">{selectedLevel.name}</span>
      );
    }
    return <div className="breadcrumb">{items}</div>;
  };

  return (
    <div className="exam-control-section">
      {renderBreadcrumb()}

      {/* GROUPS VIEW */}
      {view === 'groups' && (
        <>
          <h3 className="practice-section-title">{t('homework.selectGroup') || 'Select a Group'}</h3>
          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="practice-levels-grid">
              {groups.map(group => (
                <div
                  key={group._id}
                  className="practice-level-card"
                  onClick={() => {
                    setSelectedGroup(group);
                    setView('languages');
                  }}
                >
                  <div className="practice-level-icon">👥</div>
                  <div className="practice-level-name">{group.groupName}</div>
                  {group.subjectName && (
                    <div className="practice-level-locked-label">{group.subjectName}</div>
                  )}
                </div>
              ))}
              {groups.length === 0 && (
                <div className="no-data">{t('homework.noGroups') || 'No groups available.'}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* LANGUAGES VIEW */}
      {view === 'languages' && selectedGroup && (
        <>
          <h3 className="practice-section-title">{t('homework.selectLanguage') || 'Select a Language'}</h3>
          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="practice-levels-grid">
              {languages.map(lang => (
                <div
                  key={lang._id}
                  className="practice-level-card"
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setView('levels');
                  }}
                >
                  <div className="practice-level-icon">🌐</div>
                  <div className="practice-level-name">{lang.name}</div>
                </div>
              ))}
              {languages.length === 0 && (
                <div className="no-data">{t('homework.noLanguages') || 'No languages available.'}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* LEVELS VIEW */}
      {view === 'levels' && selectedLanguage && (
        <>
          <h3 className="practice-section-title">{t('homework.selectLevel') || 'Select a Level'}</h3>
          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="practice-levels-grid">
              {levels.map(level => (
                <div
                  key={level._id}
                  className="practice-level-card"
                  onClick={() => {
                    setSelectedLevel(level);
                    setView('classes');
                  }}
                >
                  <div className="practice-level-icon">📚</div>
                  <div className="practice-level-name">{level.name}</div>
                </div>
              ))}
              {levels.length === 0 && (
                <div className="no-data">{t('homework.noLevels') || 'No levels available.'}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* CLASSES VIEW */}
      {view === 'classes' && selectedLevel && (
        <>
          <h3 className="practice-section-title">
            {selectedGroup?.groupName} — {selectedLevel.name} — {t('homework.classes') || 'Classes'}
          </h3>
          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="exam-control-grid">
              {lessons.map(lesson => {
                const unlocked = isUnlockedForGroup(lesson);
                return (
                  <div
                    key={lesson._id}
                    className={`exam-control-card ${unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className="exam-control-header">
                      <span className="exam-control-order">{lesson.order}</span>
                      <span className="exam-control-name">{lesson.name}</span>
                    </div>
                    <div className="exam-control-meta">
                      {lesson.wordIds?.length || 0} {t('homework.words') || 'words'}
                    </div>
                    <div className="exam-control-status">
                      {unlocked ? '🔓 ' + (t('homework.unlocked') || 'Unlocked') : '🔒 ' + (t('homework.locked') || 'Locked')}
                    </div>
                    <button
                      className={`btn btn-full ${unlocked ? 'btn-delete' : 'btn-primary'}`}
                      onClick={() => handleToggle(lesson._id)}
                      disabled={togglingId === lesson._id}
                    >
                      {togglingId === lesson._id
                        ? (t('homework.loading') || 'Loading...')
                        : unlocked
                          ? (t('homework.lock') || 'Lock')
                          : (t('homework.unlock') || 'Unlock')
                      }
                    </button>
                  </div>
                );
              })}
              {lessons.length === 0 && (
                <div className="no-data">{t('homework.noLessonsYet') || 'No classes available yet.'}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExamControl;
