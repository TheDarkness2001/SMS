import React, { useState, useEffect } from 'react';
import { lessonAPI, levelAPI } from '../../utils/api';

const ExamControl = ({ t }) => {
  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguageId) {
      fetchLevels(selectedLanguageId);
    }
  }, [selectedLanguageId]);

  useEffect(() => {
    if (selectedLevel) {
      fetchLessons(selectedLevel._id);
    }
  }, [selectedLevel]);

  const fetchLanguages = async () => {
    try {
      const res = await levelAPI.getLanguages();
      if (res.data.success) {
        setLanguages(res.data.data.languages || []);
        if (res.data.data.languages?.length > 0) {
          setSelectedLanguageId(res.data.data.languages[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching languages:', err);
    }
  };

  const fetchLevels = async (langId) => {
    try {
      const res = await levelAPI.getLevels(langId);
      if (res.data.success) {
        setLevels(res.data.data.levels || []);
        setSelectedLevel(null);
        setLessons([]);
      }
    } catch (err) {
      console.error('Error fetching levels:', err);
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
    setTogglingId(lessonId);
    try {
      const res = await lessonAPI.toggleExamLock(lessonId);
      if (res.data.success) {
        setLessons(prev => prev.map(l =>
          l._id === lessonId ? { ...l, examUnlocked: res.data.data.lesson.examUnlocked } : l
        ));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error toggling lock');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="exam-control-section">
      {/* Language selector */}
      <div className="tier-selectors">
        <div className="level-selector">
          <label>{t('homework.language') || 'Language'}:</label>
          <select
            value={selectedLanguageId}
            onChange={(e) => setSelectedLanguageId(e.target.value)}
            className="level-select"
          >
            {languages.map(lang => (
              <option key={lang._id} value={lang._id}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LEVELS VIEW */}
      {!selectedLevel && (
        <>
          <h3 className="practice-section-title">{t('homework.selectLevel') || 'Select a Level'}</h3>
          <div className="practice-levels-grid">
            {levels.map(level => (
              <div
                key={level._id}
                className="practice-level-card"
                onClick={() => setSelectedLevel(level)}
              >
                <div className="practice-level-icon">📚</div>
                <div className="practice-level-name">{level.name}</div>
              </div>
            ))}
            {levels.length === 0 && (
              <div className="no-data">{t('homework.noLevels') || 'No levels available yet.'}</div>
            )}
          </div>
        </>
      )}

      {/* LESSONS VIEW */}
      {selectedLevel && (
        <>
          <div className="practice-back-bar">
            <button className="btn btn-small btn-secondary" onClick={() => { setSelectedLevel(null); setLessons([]); }}>
              ← {t('homework.backToLevels') || 'Back to Levels'}
            </button>
          </div>
          <h3 className="practice-section-title">
            {selectedLevel.name} — {t('homework.classes') || 'Classes'}
          </h3>

          {loading ? (
            <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
          ) : (
            <div className="exam-control-grid">
              {lessons.map(lesson => (
                <div
                  key={lesson._id}
                  className={`exam-control-card ${lesson.examUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="exam-control-header">
                    <span className="exam-control-order">{lesson.order}</span>
                    <span className="exam-control-name">{lesson.name}</span>
                  </div>
                  <div className="exam-control-meta">
                    {lesson.wordIds?.length || 0} {t('homework.words') || 'words'}
                  </div>
                  <div className="exam-control-status">
                    {lesson.examUnlocked ? '🔓 ' + (t('homework.unlocked') || 'Unlocked') : '🔒 ' + (t('homework.locked') || 'Locked')}
                  </div>
                  <button
                    className={`btn btn-full ${lesson.examUnlocked ? 'btn-delete' : 'btn-primary'}`}
                    onClick={() => handleToggle(lesson._id)}
                    disabled={togglingId === lesson._id}
                  >
                    {togglingId === lesson._id
                      ? (t('homework.loading') || 'Loading...')
                      : lesson.examUnlocked
                        ? (t('homework.lock') || 'Lock')
                        : (t('homework.unlock') || 'Unlock')
                    }
                  </button>
                </div>
              ))}
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
