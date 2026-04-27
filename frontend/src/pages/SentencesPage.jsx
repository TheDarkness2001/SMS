import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { languageAPI, levelAPI, lessonAPI, examGroupsAPI, sentenceAPI } from '../utils/api';
import SentencePractice from '../components/sentences/SentencePractice';
import SentenceLeaderboard from '../components/sentences/SentenceLeaderboard';
import SentenceManager from '../components/sentences/SentenceManager';
import '../styles/Homework.css';

const SentencesPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('practice');
  const [isAdmin, setIsAdmin] = useState(false);

  // 3-tier hierarchy state
  const [languages, setLanguages] = useState([]);
  const [levels, setLevels] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');

  // View state for practice: 'levels' → 'classes' → 'game'
  const [practiceView, setPracticeView] = useState('levels');
  const [manageView, setManageView] = useState('levels'); // 'levels' | 'classes' | 'manage'
  const [sentenceCountMap, setSentenceCountMap] = useState({});

  useEffect(() => {
    // Determine admin status
    const role = (user?.role || '').toLowerCase().trim();
    if (role === 'founder' || user?.permissions?.canManageHomework === true) {
      setIsAdmin(true);
    }
  }, [user]);

  // Fetch languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await languageAPI.getAll();
        if (res.data.success) {
          let allLanguages = res.data.data.languages || [];
          const isStudent = user?.userType === 'student';
          if (isStudent) {
            try {
              const groupsRes = await examGroupsAPI.getAll();
              if (groupsRes.data.success) {
                const studentGroups = groupsRes.data.data || [];
                const subjectNames = studentGroups
                  .map(g => g.subjectName || g.subject?.name)
                  .filter(Boolean)
                  .map(s => s.toLowerCase().trim());
                const uniqueSubjects = [...new Set(subjectNames)];
                if (uniqueSubjects.length > 0) {
                  allLanguages = allLanguages.filter(lang =>
                    uniqueSubjects.some(sub => sub === lang.name.toLowerCase().trim())
                  );
                }
              }
            } catch (err) {
              console.error('Error filtering languages:', err);
            }
          }
          setLanguages(allLanguages);
          if (allLanguages.length > 0) {
            setSelectedLanguageId(allLanguages[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching languages:', err);
      }
    };
    fetchLanguages();
  }, [user]);

  // Fetch levels when language changes
  useEffect(() => {
    if (!selectedLanguageId) return;
    const fetchLevels = async () => {
      try {
        const res = await levelAPI.getByLanguage(selectedLanguageId);
        if (res.data.success) {
          setLevels(res.data.data.levels);
        }
      } catch (err) {
        console.error('Error fetching levels:', err);
      }
    };
    fetchLevels();
  }, [selectedLanguageId]);

  // Fetch lessons when level is selected (for practice game)
  useEffect(() => {
    if (!selectedLevelId) return;
    const fetchLessons = async () => {
      try {
        const res = await lessonAPI.getAllLessons(selectedLevelId);
        if (res.data.success) {
          setLessons(res.data.data.lessons);
        }
      } catch (err) {
        console.error('Error fetching lessons:', err);
      }
    };
    fetchLessons();
  }, [selectedLevelId]);

  // Fetch sentence counts per lesson for a level
  const fetchSentenceCounts = async (levelId) => {
    try {
      const res = await sentenceAPI.getAll({ levelId });
      if (res.data.success) {
        const counts = {};
        (res.data.data.sentences || []).forEach(s => {
          const lid = s.lessonId?._id || s.lessonId;
          counts[lid] = (counts[lid] || 0) + 1;
        });
        setSentenceCountMap(counts);
      }
    } catch (err) {
      console.error('Error fetching sentence counts:', err);
    }
  };

  const handleSelectLevel = (levelId) => {
    setSelectedLevelId(levelId);
    if (activeTab === 'practice') {
      setPracticeView('classes');
    } else {
      setManageView('classes');
    }
    // Fetch lessons and sentence counts
    lessonAPI.getAllLessons(levelId).then(res => {
      if (res.data.success) setLessons(res.data.data.lessons);
    }).catch(console.error);
    fetchSentenceCounts(levelId);
  };

  const handleSelectLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    if (activeTab === 'practice') {
      setPracticeView('game');
    } else {
      setManageView('manage');
    }
  };

  const handleBackToLevels = () => {
    setSelectedLevelId('');
    setSelectedLessonId('');
    setLessons([]);
    setPracticeView('levels');
    setManageView('levels');
  };

  const handleBackToClasses = () => {
    setSelectedLessonId('');
    if (activeTab === 'practice') {
      setPracticeView('classes');
    } else {
      setManageView('classes');
    }
  };

  const tabs = [
    { id: 'practice', label: t('sentences.practice') || 'Practice' },
    { id: 'leaderboard', label: t('sentences.leaderboard') || 'Leaderboard' },
  ];
  if (isAdmin) {
    tabs.push({ id: 'manage', label: t('sentences.manage') || 'Manage Sentences' });
  }

  // Render level selection cards
  const renderLevelCards = () => (
    <div className="level-cards-grid">
      {levels.map(level => (
        <div
          key={level._id}
          className="level-card"
          onClick={() => handleSelectLevel(level._id)}
        >
          <h3 className="level-card-title">{level.name}</h3>
          <p className="level-card-info">
            {level.classesCount || 0} {t('homework.classes') || 'classes'}
          </p>
        </div>
      ))}
      {levels.length === 0 && (
        <div className="no-data">{t('homework.noLevels') || 'No levels yet.'}</div>
      )}
    </div>
  );

  // Render class selection cards
  const renderClassCards = () => (
    <div className="level-cards-grid">
      {lessons.map(lesson => (
        <div
          key={lesson._id}
          className="level-card"
          onClick={() => handleSelectLesson(lesson._id)}
        >
          <h3 className="level-card-title">{lesson.name}</h3>
          <p className="level-card-info">
            {sentenceCountMap[lesson._id] || 0} {t('sentences.title') || 'sentences'}
          </p>
        </div>
      ))}
      {lessons.length === 0 && (
        <div className="no-data">{t('homework.noLessons') || 'No classes yet.'}</div>
      )}
    </div>
  );


  return (
    <div className="homework-page">
      <div className="homework-header">
        <h1>{t('sentences.title') || 'Sentences'}</h1>
        <p>{t('sentences.subtitle') || 'Practice sentence writing and see the leaderboard'}</p>
      </div>

      <div className="homework-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setPracticeView('levels');
              setManageView('levels');
              setSelectedLevelId('');
              setSelectedLessonId('');
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="homework-content">
        {/* Practice Tab */}
        {activeTab === 'practice' && (
          <>
            {practiceView === 'levels' && selectedLanguageId && (
              <>
                <div className="breadcrumb-nav">
                  <select
                    className="form-select language-select"
                    value={selectedLanguageId}
                    onChange={(e) => setSelectedLanguageId(e.target.value)}
                  >
                    {languages.map(l => (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                {renderLevelCards()}
              </>
            )}
            {practiceView === 'classes' && (
              <>
                <div className="breadcrumb-nav">
                  <button className="btn btn-small btn-secondary" onClick={handleBackToLevels}>
                    ← {t('homework.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                {renderClassCards()}
              </>
            )}
            {practiceView === 'game' && selectedLessonId && (
              <>
                <div className="breadcrumb-nav">
                  <button className="btn btn-small btn-secondary" onClick={handleBackToLevels}>
                    ← {t('homework.backToLevels') || 'Levels'}
                  </button>
                  <span className="breadcrumb-sep">›</span>
                  <button className="btn btn-small btn-secondary" onClick={handleBackToClasses}>
                    {t('homework.backToClasses') || 'Classes'}
                  </button>
                </div>
                <SentencePractice t={t} lessonId={selectedLessonId} levelId={selectedLevelId} />
              </>
            )}
          </>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <SentenceLeaderboard t={t} />
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && isAdmin && (
          <>
            {manageView === 'levels' && selectedLanguageId && (
              <>
                <div className="breadcrumb-nav">
                  <select
                    className="form-select language-select"
                    value={selectedLanguageId}
                    onChange={(e) => setSelectedLanguageId(e.target.value)}
                  >
                    {languages.map(l => (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                {renderLevelCards()}
              </>
            )}
            {manageView === 'classes' && (
              <>
                <div className="breadcrumb-nav">
                  <button className="btn btn-small btn-secondary" onClick={handleBackToLevels}>
                    ← {t('homework.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                {renderClassCards()}
              </>
            )}
            {manageView === 'manage' && selectedLessonId && (
              <>
                <div className="breadcrumb-nav">
                  <button className="btn btn-small btn-secondary" onClick={handleBackToLevels}>
                    ← {t('homework.backToLevels') || 'Levels'}
                  </button>
                  <span className="breadcrumb-sep">›</span>
                  <button className="btn btn-small btn-secondary" onClick={handleBackToClasses}>
                    {t('homework.backToClasses') || 'Classes'}
                  </button>
                </div>
                <SentenceManager t={t} lessonId={selectedLessonId} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SentencesPage;
