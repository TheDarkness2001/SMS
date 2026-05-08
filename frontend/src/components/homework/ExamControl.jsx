import React, { useState, useEffect } from 'react';
import { lessonAPI, levelAPI, languageAPI, examGroupsAPI, getImageUrl } from '../../utils/api';

const ExamControl = ({ t, noExam = false }) => {
  const lessonType = noExam ? 'sentences' : 'words';
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
  const [togglingPractice, setTogglingPractice] = useState(false);

  // Preview modal state
  const [previewLesson, setPreviewLesson] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const formatSchedule = (group) => {
    const parts = [];
    if (group.days?.length) {
      const shortDays = group.days.map(d => d.slice(0, 3));
      parts.push(shortDays.join(', '));
    }
    if (group.startTime && group.endTime) {
      parts.push(`${group.startTime}-${group.endTime}`);
    }
    return parts.join(' · ');
  };

  const getTeacherNames = (group) => {
    if (!group.teachers?.length) return null;
    return group.teachers.map(t => t.name).join(', ');
  };

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
      const res = await examGroupsAPI.getAll({ lessonType });
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
      const res = await lessonAPI.getAllLessons(levelId, lessonType);
      if (res.data.success) {
        setLessons(res.data.data.lessons || []);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExam = async (lessonId) => {
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
      alert(err.response?.data?.message || 'Error toggling exam lock');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTogglePractice = async () => {
    if (!selectedGroup || !selectedLevel) return;
    setTogglingPractice(true);
    try {
      const res = await levelAPI.togglePracticeLock(selectedLevel._id, selectedGroup._id);
      if (res.data.success) {
        const updatedPracticeUnlockedFor = res.data.data.level.practiceUnlockedFor || [];
        setSelectedLevel(prev => ({
          ...prev,
          practiceUnlockedFor: updatedPracticeUnlockedFor
        }));
        // Also sync the levels array so navigation back/forth stays consistent
        setLevels(prev => prev.map(l =>
          l._id === selectedLevel._id ? { ...l, practiceUnlockedFor: updatedPracticeUnlockedFor } : l
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error toggling practice lock');
    } finally {
      setTogglingPractice(false);
    }
  };

  const isExamUnlockedForGroup = (lesson) => {
    if (!selectedGroup) return false;
    const groupId = String(selectedGroup._id);
    return lesson.examUnlockedFor?.some(g => String(g) === groupId) || false;
  };

  const isPracticeUnlockedForGroup = () => {
    if (!selectedGroup || !selectedLevel) return false;
    const groupId = String(selectedGroup._id);
    return (selectedLevel.practiceUnlockedFor || []).some(g => String(g) === groupId);
  };

  const handleOpenPreview = async (lesson) => {
    setPreviewLesson(lesson);
    setPreviewLoading(true);
    try {
      const res = await lessonAPI.getLesson(lesson._id);
      if (res.data.success) {
        setPreviewData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching lesson preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewLesson(null);
    setPreviewData(null);
  };

  const handleViewGroupClasses = async (group) => {
    setSelectedGroup(group);
    setSelectedLanguage(null);
    setSelectedLevel(null);
    setLevels([]);
    setLessons([]);
    setLoading(true);
    try {
      // Fetch all languages and try to auto-match by subjectName
      const langRes = await languageAPI.getAll();
      const allLangs = langRes.data.data?.languages || [];
      setLanguages(allLangs);

      const matchedLang = allLangs.find(l =>
        l.name?.toLowerCase().trim() === group.subjectName?.toLowerCase().trim()
      );

      if (matchedLang) {
        setSelectedLanguage(matchedLang);
        const levelRes = await levelAPI.getByLanguage(matchedLang._id);
        const fetchedLevels = levelRes.data.data?.levels || [];
        setLevels(fetchedLevels);
        // Try to auto-match level by group name or class
        const matchedLevel = fetchedLevels.find(l =>
          l.name?.toLowerCase().trim() === group.groupName?.toLowerCase().trim() ||
          l.name?.toLowerCase().trim() === group.class?.toLowerCase().trim()
        );
        if (matchedLevel) {
          setSelectedLevel(matchedLevel);
          const lessonRes = await lessonAPI.getAllLessons(matchedLevel._id, lessonType);
          setLessons(lessonRes.data.data?.lessons || []);
          setView('groupClasses');
        } else {
          setView('groupLevels');
        }
      } else {
        setView('groupLevels');
      }
    } catch (err) {
      console.error('Error in group quick view:', err);
      setView('groupLevels');
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const items = [];
    items.push(
      <button key="groups" className="breadcrumb-item" onClick={() => {
        setView('groups');
        setSelectedGroup(null);
        setSelectedLanguage(null);
        setSelectedLevel(null);
      }}>
        {t('homework.groups') || 'Groups'}
      </button>
    );
    if (selectedGroup) {
      const isQuickView = view === 'groupLevels' || view === 'groupClasses';
      items.push(
        <span key="sep1" className="breadcrumb-sep">/</span>,
        <button
          key="group"
          className="breadcrumb-item"
          onClick={() => {
            if (isQuickView) {
              setView('groupLevels');
              setSelectedLevel(null);
              setLessons([]);
            } else {
              setView('languages');
            }
          }}
        >
          {selectedGroup.groupName}
        </button>
      );
    }
    if (selectedLanguage && (view === 'levels' || view === 'classes')) {
      const langName = selectedLanguage.name?.trim();
      const groupName = selectedGroup?.groupName?.trim();
      if (langName && groupName && langName.toLowerCase() === groupName.toLowerCase()) {
        // Skip language breadcrumb if it duplicates group name
      } else {
        items.push(
          <span key="sep2" className="breadcrumb-sep">/</span>,
          <button key="lang" className="breadcrumb-item" onClick={() => setView('levels')}>
            {selectedLanguage.name}
          </button>
        );
      }
    }
    if (selectedLevel && (view === 'classes' || view === 'groupClasses')) {
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
            <div className="group-cards-grid">
              {groups.map(group => {
                const scheduleText = formatSchedule(group);
                const teacherText = getTeacherNames(group);
                const visibleStudents = group.students?.slice(0, 4) || [];
                const overflowCount = (group.students?.length || 0) - visibleStudents.length;
                return (
                  <div
                    key={group._id}
                    className="group-card-rich"
                  >
                    <div
                      className="group-card-main"
                      onClick={() => {
                        setSelectedGroup(group);
                        setView('languages');
                      }}
                    >
                      <div className="group-card-header">
                        <span className="group-card-icon">👥</span>
                        {group.groupId ? (
                          <span className="group-card-id">ID: {group.groupId}</span>
                        ) : (
                          <span className="group-card-id">ID: {group._id?.slice(-6)}</span>
                        )}
                      </div>
                      <div className="group-card-name">{group.groupName}</div>
                      {group.subjectName && group.subjectName !== group.groupName && (
                        <div className="group-card-subject">{group.subjectName}</div>
                      )}
                      {scheduleText && (
                        <div className="group-card-schedule">🕐 {scheduleText}</div>
                      )}
                      {teacherText && (
                        <div className="group-card-teacher">👤 {teacherText}</div>
                      )}
                      {visibleStudents.length > 0 && (
                        <div className="group-card-avatars">
                          {visibleStudents.map(s => {
                            const imgUrl = getImageUrl(s.profileImage);
                            return imgUrl ? (
                              <img
                                key={s._id}
                                src={imgUrl}
                                alt=""
                                className="group-avatar"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                            ) : (
                              <div key={s._id} className="group-avatar group-avatar-placeholder">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="9" r="4" fill="#9ca3af"/>
                                  <path d="M5 21c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </div>
                            );
                          })}
                          {overflowCount > 0 && (
                            <span className="group-avatar-overflow">+{overflowCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="group-card-actions">
                      <button
                        className="btn btn-small btn-secondary group-view-classes-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewGroupClasses(group);
                        }}
                      >
                        📋 {t('homework.viewClasses') || 'View Classes'}
                      </button>
                    </div>
                  </div>
                );
              })}
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

          {/* Level-level practice unlock banner */}
          <div className={`level-practice-banner ${isPracticeUnlockedForGroup() ? 'unlocked' : 'locked'}`}>
            <span className="banner-icon">{isPracticeUnlockedForGroup() ? '🔓' : '🔒'}</span>
            <span className="banner-text">
              {t('homework.practiceForLevel') || 'Practice'}: {isPracticeUnlockedForGroup() ? (t('homework.unlocked') || 'Unlocked') : (t('homework.locked') || 'Locked')}
            </span>
            <button
              className={`btn btn-small ${isPracticeUnlockedForGroup() ? 'btn-delete' : 'btn-primary'}`}
              onClick={handleTogglePractice}
              disabled={togglingPractice}
            >
              {togglingPractice
                ? (t('homework.loading') || '...')
                : isPracticeUnlockedForGroup()
                  ? (t('homework.lockPractice') || 'Lock Practice')
                  : (t('homework.unlockPractice') || 'Unlock Practice')
              }
            </button>
          </div>

          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="exam-control-grid">
              {lessons.map(lesson => {
                const examUnlocked = isExamUnlockedForGroup(lesson);
                const practiceUnlocked = isPracticeUnlockedForGroup();
                return (
                  <div
                    key={lesson._id}
                    className={`exam-control-card ${noExam ? (practiceUnlocked ? 'unlocked' : 'locked') : (examUnlocked ? 'unlocked' : 'locked')}`}
                  >
                    <div className="exam-control-header">
                      <span className="exam-control-order">{lesson.order}</span>
                      <span className="exam-control-name">{lesson.name}</span>
                    </div>
                    <div className="exam-control-meta">
                      {noExam
                        ? (t('sentences.title') || 'Sentences')
                        : `${lesson.wordIds?.length || 0} ${t('homework.words') || 'words'}`
                      }
                    </div>
                    <div className="exam-control-status-row">
                      <span className={`status-badge ${practiceUnlocked ? 'status-unlocked' : 'status-locked'}`}>
                        {practiceUnlocked ? '🔓' : '🔒'} {t('homework.practiceShort') || 'Practice'}
                      </span>
                      {!noExam && (
                        <span className={`status-badge ${examUnlocked ? 'status-unlocked' : 'status-locked'}`}>
                          {examUnlocked ? '🔓' : '🔒'} {t('homework.examShort') || 'Exam'}
                        </span>
                      )}
                    </div>
                    <div className="exam-control-buttons">
                      <button
                        className={`btn btn-full ${practiceUnlocked ? 'btn-delete' : 'btn-primary'}`}
                        onClick={handleTogglePractice}
                        disabled={togglingPractice}
                      >
                        {togglingPractice
                          ? (t('homework.loading') || '...')
                          : practiceUnlocked
                            ? (t('homework.lockPractice') || 'Lock Practice')
                            : (t('homework.unlockPractice') || 'Unlock Practice')
                        }
                      </button>
                      {!noExam && (
                        <button
                          className={`btn btn-full ${examUnlocked ? 'btn-delete' : 'btn-primary'}`}
                          onClick={() => handleToggleExam(lesson._id)}
                          disabled={togglingId === lesson._id}
                        >
                          {togglingId === lesson._id
                            ? (t('homework.loading') || '...')
                            : examUnlocked
                              ? (t('homework.lockExam') || 'Lock Exam')
                              : (t('homework.unlockExam') || 'Unlock Exam')
                          }
                        </button>
                      )}
                    </div>
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

      {/* GROUP LEVELS VIEW (Quick View) */}
      {view === 'groupLevels' && selectedGroup && (
        <>
          <h3 className="practice-section-title">
            {selectedGroup.groupName} — {t('homework.selectLevel') || 'Select a Level'}
          </h3>
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
                    fetchLessons(level._id);
                    setView('groupClasses');
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

      {/* GROUP CLASSES VIEW (Quick View) */}
      {view === 'groupClasses' && selectedLevel && (
        <>
          <h3 className="practice-section-title">
            {selectedGroup?.groupName} — {selectedLevel.name} — {t('homework.classes') || 'Classes'}
          </h3>

          {/* Level-level practice unlock banner */}
          <div className={`level-practice-banner ${isPracticeUnlockedForGroup() ? 'unlocked' : 'locked'}`}>
            <span className="banner-icon">{isPracticeUnlockedForGroup() ? '🔓' : '🔒'}</span>
            <span className="banner-text">
              {t('homework.practiceForLevel') || 'Practice'}: {isPracticeUnlockedForGroup() ? (t('homework.unlocked') || 'Unlocked') : (t('homework.locked') || 'Locked')}
            </span>
            <button
              className={`btn btn-small ${isPracticeUnlockedForGroup() ? 'btn-delete' : 'btn-primary'}`}
              onClick={handleTogglePractice}
              disabled={togglingPractice}
            >
              {togglingPractice
                ? (t('homework.loading') || '...')
                : isPracticeUnlockedForGroup()
                  ? (t('homework.lockPractice') || 'Lock Practice')
                  : (t('homework.unlockPractice') || 'Unlock Practice')
              }
            </button>
          </div>

          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="exam-control-grid">
              {lessons.map(lesson => {
                const examUnlocked = isExamUnlockedForGroup(lesson);
                const practiceUnlocked = isPracticeUnlockedForGroup();
                return (
                  <div
                    key={lesson._id}
                    className={`exam-control-card ${noExam ? (practiceUnlocked ? 'unlocked' : 'locked') : (examUnlocked ? 'unlocked' : 'locked')}`}
                  >
                    <div className="exam-control-header">
                      <span className="exam-control-order">{lesson.order}</span>
                      <span className="exam-control-name">{lesson.name}</span>
                    </div>
                    <div className="exam-control-meta">
                      {noExam
                        ? (t('sentences.title') || 'Sentences')
                        : `${lesson.wordIds?.length || 0} ${t('homework.words') || 'words'}`
                      }
                    </div>
                    <div className="exam-control-status-row">
                      <span className={`status-badge ${practiceUnlocked ? 'status-unlocked' : 'status-locked'}`}>
                        {practiceUnlocked ? '🔓' : '🔒'} {t('homework.practiceShort') || 'Practice'}
                      </span>
                      {!noExam && (
                        <span className={`status-badge ${examUnlocked ? 'status-unlocked' : 'status-locked'}`}>
                          {examUnlocked ? '🔓' : '🔒'} {t('homework.examShort') || 'Exam'}
                        </span>
                      )}
                    </div>
                    <div className="exam-control-buttons">
                      <button
                        className={`btn btn-full ${practiceUnlocked ? 'btn-delete' : 'btn-primary'}`}
                        onClick={handleTogglePractice}
                        disabled={togglingPractice}
                      >
                        {togglingPractice
                          ? (t('homework.loading') || '...')
                          : practiceUnlocked
                            ? (t('homework.lockPractice') || 'Lock Practice')
                            : (t('homework.unlockPractice') || 'Unlock Practice')
                        }
                      </button>
                      {!noExam && (
                        <button
                          className={`btn btn-full ${examUnlocked ? 'btn-delete' : 'btn-primary'}`}
                          onClick={() => handleToggleExam(lesson._id)}
                          disabled={togglingId === lesson._id}
                        >
                          {togglingId === lesson._id
                            ? (t('homework.loading') || '...')
                            : examUnlocked
                              ? (t('homework.lockExam') || 'Lock Exam')
                              : (t('homework.unlockExam') || 'Unlock Exam')
                          }
                        </button>
                      )}
                      <button
                        className="btn btn-full btn-secondary preview-btn"
                        onClick={() => handleOpenPreview(lesson)}
                      >
                        👁️ {t('homework.preview') || 'Preview'}
                      </button>
                    </div>
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

      {/* Preview Modal */}
      {previewLesson && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal-content lesson-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {previewLesson.name} {t('homework.preview') || 'Preview'}
              </h3>
              <button className="modal-close" onClick={handleClosePreview}>×</button>
            </div>
            <div className="modal-body">
              {previewLoading ? (
                <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
              ) : previewData ? (
                <div className="lesson-preview-content">
                  <div className="preview-meta">
                    <span>{t('homework.words') || 'Words'}: {previewData.words?.length || 0}</span>
                    <span>{t('homework.order') || 'Order'}: {previewData.lesson?.order}</span>
                  </div>
                  {previewData.words && previewData.words.length > 0 ? (
                    <div className="preview-words-list">
                      {previewData.words.map((word, idx) => (
                        <div key={word._id || idx} className="preview-word-item">
                          <span className="preview-word-number">{idx + 1}.</span>
                          <span className="preview-word-en">{word.english || word.text || word.sentence}</span>
                          <span className="preview-word-uz">{word.uzbek || word.translation || word.uzbekTranslation}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">{t('homework.noWords') || 'No words available.'}</div>
                  )}
                </div>
              ) : (
                <div className="no-data">{t('homework.noData') || 'No data available.'}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamControl;
