import React, { useState, useEffect, useRef } from 'react';
import { languageAPI, levelAPI, lessonAPI, examGroupsAPI, listeningAPI } from '../utils/api';
import { normalizeText } from '../utils/textNormalizer';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ListeningManageTab from '../components/listening/ListeningManageTab';
import ListeningLeaderboard from '../components/listening/ListeningLeaderboard';
import ListeningProgressTab from '../components/listening/ListeningProgressTab';
import ExamControl from '../components/homework/ExamControl';
import '../styles/Homework.css';
import '../styles/Listening.css';

const ListeningPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const audioRef = useRef(null);

  const [activeTab, setActiveTab] = useState('practice');
  const [languages, setLanguages] = useState([]);
  const [levelsList, setLevelsList] = useState([]);
  const [levelLessons, setLevelLessons] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedPracticeLessonId, setSelectedPracticeLessonId] = useState('');
  const [practiceView, setPracticeView] = useState('languages');
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, totalAccuracy: 0 });

  const isStudent = user?.userType === 'student';
  const isAdmin = (() => {
    const role = (user?.role || '').toLowerCase().trim();
    if (role === 'founder') return true;
    if (user?.permissions?.canManageHomework === true) return true;
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      if ((stored.role || '').toLowerCase().trim() === 'founder') return true;
      if (stored.permissions?.canManageHomework === true) return true;
    } catch (e) {}
    return false;
  })();

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await languageAPI.getAll();
        if (res.data.success) {
          let allLanguages = res.data.data.languages || [];
          if (isStudent) {
            try {
              const groupsRes = await examGroupsAPI.getAll();
              if (groupsRes.data.success) {
                const subjectNames = (groupsRes.data.data || [])
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
              console.error('Error fetching student groups:', err);
            }
          }
          setLanguages(allLanguages);
        }
      } catch (err) {
        console.error('Error fetching languages:', err);
      }
    };
    fetchLanguages();
  }, [isStudent]);

  useEffect(() => {
    if (!selectedLanguageId) return;
    const fetchLevels = async () => {
      try {
        const res = await levelAPI.getByLanguage(selectedLanguageId);
        if (res.data.success) setLevelsList(res.data.data.levels || []);
      } catch (err) {
        console.error('Error fetching levels:', err);
      }
    };
    fetchLevels();
  }, [selectedLanguageId]);

  useEffect(() => {
    if (!selectedLevelId) return;
    const fetchLessons = async () => {
      setLessonsLoading(true);
      try {
        const res = await lessonAPI.getAllLessons(selectedLevelId, 'listening');
        if (res.data.success) setLevelLessons(res.data.data.lessons || []);
      } catch (err) {
        console.error('Error fetching lessons:', err);
      } finally {
        setLessonsLoading(false);
      }
    };
    fetchLessons();
  }, [selectedLevelId]);

  const loadExercisesForLesson = async (lessonId) => {
    try {
      const res = await listeningAPI.getAll({ lessonId });
      if (res.data.success) {
        setExercises(res.data.data.exercises || []);
      }
    } catch (err) {
      console.error('Error fetching exercises:', err);
    }
  };

  const selectLanguageForPractice = (languageId) => {
    setSelectedLanguageId(languageId);
    setPracticeView('levels');
  };

  const selectLevelForPractice = (levelId) => {
    setSelectedLevelId(levelId);
    setPracticeView('classes');
  };

  const selectClassForPractice = async (lessonId) => {
    setSelectedPracticeLessonId(lessonId);
    await loadExercisesForLesson(lessonId);
    setPracticeView('exercises');
    setFeedback(null);
    setUserAnswer('');
    setCurrentExercise(null);
  };

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setUserAnswer('');
    setFeedback(null);
    setIsPlaying(false);
    setPracticeView('game');
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => setIsPlaying(false);

  const handleCheck = async () => {
    if (!userAnswer.trim() || !currentExercise) return;
    setIsChecking(true);
    try {
      const res = await listeningAPI.checkAnswer({
        listeningId: currentExercise._id,
        answer: normalizeText(userAnswer)
      });
      if (res.data.success) {
        const { accuracyPercent } = res.data.data;
        setFeedback(res.data.data);
        setSessionStats(prev => ({
          total: prev.total + 1,
          totalAccuracy: prev.totalAccuracy + accuracyPercent
        }));
      }
    } catch (err) {
      console.error('Error checking answer:', err);
      alert(err.response?.data?.message || 'Error checking answer');
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    setPracticeView('exercises');
    setCurrentExercise(null);
    setFeedback(null);
    setUserAnswer('');
    setIsPlaying(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleCheck();
  };

  const getAccuracyLabel = (percent) => {
    if (percent >= 90) return t('listening.excellent') || 'Excellent!';
    if (percent >= 70) return t('listening.good') || 'Good job!';
    if (percent >= 50) return t('listening.notBad') || 'Not bad — keep practicing!';
    return t('listening.keepPracticing') || 'Keep practicing!';
  };

  const tabs = [
    { id: 'practice', label: t('listening.practice') || 'Practice' },
    { id: 'leaderboard', label: t('listening.leaderboard') || 'Leaderboard' }
  ];
  if (isAdmin) {
    tabs.push(
      { id: 'lessons', label: t('listening.lessons') || 'Lessons' },
      { id: 'permissions', label: t('listening.permissions') || 'Permissions' },
      { id: 'progress', label: t('listening.studentProgress') || 'Student Progress' }
    );
  }

  const sessionAvg = sessionStats.total > 0
    ? Math.round(sessionStats.totalAccuracy / sessionStats.total)
    : 0;

  return (
    <div className="homework-page listening-page">
      <div className="page-header">
        <h1>{t('listening.title') || 'Listening'}</h1>
        <p className="page-subtitle">
          {t('listening.subtitle') || 'Listen to audio and write what you hear'}
        </p>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'leaderboard' && (
          <ListeningLeaderboard t={t} />
        )}

        {activeTab === 'lessons' && isAdmin && (
          <ListeningManageTab t={t} />
        )}

        {activeTab === 'permissions' && isAdmin && (
          <ExamControl t={t} noExam lessonType="listening" />
        )}

        {activeTab === 'progress' && isAdmin && (
          <ListeningProgressTab t={t} />
        )}

        {activeTab === 'practice' && (
          <div className="game-section">
            {practiceView === 'languages' && (
              <>
                <h3 className="practice-section-title">{t('listening.selectLanguage') || 'Select a Language'}</h3>
                <div className="practice-levels-grid">
                  {languages.map(lang => (
                    <button
                      key={lang._id}
                      className="practice-level-card"
                      onClick={() => selectLanguageForPractice(lang._id)}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {practiceView === 'levels' && (
              <>
                <button className="back-btn" onClick={() => setPracticeView('languages')}>
                  ← {t('listening.back') || 'Back'}
                </button>
                <h3 className="practice-section-title">{t('listening.selectLevel') || 'Select a Level'}</h3>
                <div className="practice-levels-grid">
                  {levelsList.map(level => {
                    const isUnlocked = isStudent ? (level.practiceUnlockedForMe || false) : true;
                    return (
                      <button
                        key={level._id}
                        className={`practice-level-card ${isUnlocked ? '' : 'locked'}`}
                        onClick={() => isUnlocked && selectLevelForPractice(level._id)}
                        disabled={!isUnlocked}
                      >
                        <span>{level.name}</span>
                        {!isUnlocked && (
                          <small>{t('listening.practiceLocked') || 'Locked'}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {practiceView === 'classes' && (
              <>
                <button className="back-btn" onClick={() => setPracticeView('levels')}>
                  ← {t('listening.back') || 'Back'}
                </button>
                <h3 className="practice-section-title">{t('listening.selectClass') || 'Select a Class'}</h3>
                {lessonsLoading ? (
                  <p>{t('listening.loading') || 'Loading...'}</p>
                ) : levelLessons.length === 0 ? (
                  <p className="empty-state">{t('listening.noClasses') || 'No listening classes available yet.'}</p>
                ) : (
                  <div className="practice-levels-grid">
                    {levelLessons.map(lesson => (
                      <button
                        key={lesson._id}
                        className="practice-level-card"
                        onClick={() => selectClassForPractice(lesson._id)}
                      >
                        <span>{lesson.name}</span>
                        <small>{lesson.listeningCount || 0} {t('listening.exercises') || 'exercises'}</small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {practiceView === 'exercises' && (
              <>
                <button className="back-btn" onClick={() => setPracticeView('classes')}>
                  ← {t('listening.back') || 'Back'}
                </button>
                <h3 className="practice-section-title">{t('listening.selectExercise') || 'Select an Exercise'}</h3>
                {sessionStats.total > 0 && (
                  <p className="session-stats-banner">
                    {t('listening.sessionAvg') || 'Session average'}: {sessionAvg}%
                  </p>
                )}
                {exercises.length === 0 ? (
                  <p className="empty-state">{t('listening.noExercises') || 'No exercises in this class yet.'}</p>
                ) : (
                  <div className="practice-levels-grid">
                    {exercises.map(exercise => (
                      <button
                        key={exercise._id}
                        className="practice-level-card"
                        onClick={() => startExercise(exercise)}
                      >
                        {exercise.title}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {practiceView === 'game' && currentExercise && (
              <div className="listening-practice-card">
                <button className="back-btn" onClick={handleNext}>
                  ← {t('listening.backToList') || 'Back to list'}
                </button>

                <h3 className="exercise-title">{currentExercise.title}</h3>

                <div className="listening-audio-controls">
                  <audio
                    ref={audioRef}
                    src={listeningAPI.getAudioUrl(currentExercise.audioFile)}
                    onPlay={handleAudioPlay}
                    onPause={handleAudioPause}
                    onEnded={handleAudioEnded}
                    preload="metadata"
                  />
                  <button
                    type="button"
                    className={`listening-play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={togglePlayPause}
                  >
                    {isPlaying
                      ? (t('listening.pause') || 'Pause')
                      : (t('listening.play') || 'Play')}
                  </button>
                  <span className="listening-hint">
                    {t('listening.listenHint') || 'Listen carefully, then type what you hear below.'}
                  </span>
                </div>

                <textarea
                  className="listening-answer-input"
                  placeholder={t('listening.typeWhatYouHear') || 'Type what you hear...'}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  disabled={!!feedback}
                />

                {!feedback ? (
                  <button
                    className="check-answer-btn"
                    onClick={handleCheck}
                    disabled={isChecking || !userAnswer.trim()}
                  >
                    {isChecking
                      ? (t('listening.checking') || 'Checking...')
                      : (t('listening.checkAnswer') || 'Check Answer')}
                  </button>
                ) : (
                  <div className={`feedback-box ${feedback.accuracyPercent >= 70 ? 'correct' : 'incorrect'}`}>
                    <div className="accuracy-display">
                      <span className="accuracy-percent">{feedback.accuracyPercent}%</span>
                      <span className="accuracy-label">{getAccuracyLabel(feedback.accuracyPercent)}</span>
                    </div>
                    <p className="accuracy-detail">
                      {feedback.correctWords} / {feedback.totalWords} {t('listening.wordsCorrect') || 'words correct'}
                    </p>
                    {feedback.accuracyPercent < 100 && (
                      <div className="script-comparison">
                        <p><strong>{t('listening.correctScript') || 'Correct script'}:</strong></p>
                        <p className="script-text">{feedback.script}</p>
                        <p><strong>{t('listening.yourAnswer') || 'Your answer'}:</strong></p>
                        <p className="script-text your-answer">{feedback.yourAnswer}</p>
                      </div>
                    )}
                    <button className="next-btn" onClick={handleNext}>
                      {t('listening.next') || 'Next Exercise'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListeningPage;
