import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineSound } from 'react-icons/ai';
import { languageAPI, levelAPI, examGroupsAPI, listeningAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ListeningManageTab from '../components/listening/ListeningManageTab';
import ListeningLeaderboard from '../components/listening/ListeningLeaderboard';
import ListeningProgressTab from '../components/listening/ListeningProgressTab';
import ExamControl from '../components/homework/ExamControl';
import '../styles/Homework.css';
import '../styles/Listening.css';

const formatAudioTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ListeningPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const audioRef = useRef(null);

  const [activeTab, setActiveTab] = useState('practice');
  const [languages, setLanguages] = useState([]);
  const [levelsList, setLevelsList] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [practiceView, setPracticeView] = useState('languages');
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState('');
  const [exercisesLoading, setExercisesLoading] = useState(false);
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
        const res = await levelAPI.getByLanguage(selectedLanguageId, { moduleType: 'listening' });
        if (res.data.success) setLevelsList(res.data.data.levels || []);
      } catch (err) {
        console.error('Error fetching levels:', err);
      }
    };
    fetchLevels();
  }, [selectedLanguageId]);

  const loadExercisesForLevel = async (levelId) => {
    setExercisesLoading(true);
    try {
      const res = await listeningAPI.getAll({ levelId });
      if (res.data.success) {
        setExercises(res.data.data.exercises || []);
      }
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setExercises([]);
    } finally {
      setExercisesLoading(false);
    }
  };

  const selectLanguageForPractice = (languageId) => {
    setSelectedLanguageId(languageId);
    setPracticeView('levels');
  };

  const selectLevelForPractice = async (levelId) => {
    setSelectedLevelId(levelId);
    setFeedback(null);
    setUserAnswer('');
    setCurrentExercise(null);
    await loadExercisesForLevel(levelId);
    setPracticeView('exercises');
  };

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setUserAnswer('');
    setFeedback(null);
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioError('');
    setPracticeView('game');
  };

  useEffect(() => {
    if (!currentExercise) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioError('');
  }, [currentExercise?._id]);

  const waitForAudioReady = (audio) => new Promise((resolve, reject) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timeout'));
    }, 15000);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onFail = () => {
      cleanup();
      reject(new Error('Audio failed to load'));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onFail);
    };
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onFail);
  });

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError('');
    try {
      if (audio.paused) {
        await waitForAudioReady(audio);
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Audio play error:', err);
      setAudioError(
        t('listening.audioLoadError') ||
        'Audio file could not be loaded. Please ask your teacher to re-upload this exercise.'
      );
      setIsPlaying(false);
    }
  };

  const skipAudio = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : null;
    let nextTime = audio.currentTime + seconds;
    if (nextTime < 0) nextTime = 0;
    if (duration !== null && nextTime > duration) nextTime = duration;
    audio.currentTime = nextTime;
    setAudioCurrentTime(nextTime);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setAudioCurrentTime(time);
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => {
    setIsPlaying(false);
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) {
      setAudioCurrentTime(audio.duration);
    }
  };
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setAudioCurrentTime(audio.currentTime);
  };
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) {
      setAudioDuration(audio.duration);
      setAudioError('');
    }
  };
  const handleAudioError = () => {
    setAudioError(
      t('listening.audioLoadError') ||
      'Audio file could not be loaded. Please ask your teacher to re-upload this exercise.'
    );
    setIsPlaying(false);
  };

  const handleCheck = async () => {
    if (!currentExercise) return;
    setIsChecking(true);
    try {
      const res = await listeningAPI.checkAnswer({
        listeningId: currentExercise._id,
        answer: userAnswer
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

  const handleTryAgain = () => {
    setFeedback(null);
    setUserAnswer('');
    setIsPlaying(false);
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
        <h1>
          <AiOutlineSound size={28} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
          {t('listening.title') || 'Listening'}
        </h1>
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
                    <div
                      key={lang._id}
                      className="practice-level-card"
                      onClick={() => selectLanguageForPractice(lang._id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="practice-level-icon">🌐</div>
                      <div className="practice-level-name">{lang.name}</div>
                    </div>
                  ))}
                  {languages.length === 0 && (
                    <div className="no-data">{t('listening.noClasses') || 'No languages available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {practiceView === 'levels' && (
              <>
                <div className="practice-back-bar">
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => setPracticeView('languages')}>
                    ← {t('listening.back') || 'Back'}
                  </button>
                </div>
                <h3 className="practice-section-title">{t('listening.selectLevel') || 'Select a Level'}</h3>
                <div className="practice-levels-grid">
                  {levelsList.map(level => {
                    const isUnlocked = isStudent ? (level.practiceUnlockedForMe || false) : true;
                    return (
                      <div
                        key={level._id}
                        className={`practice-level-card ${isUnlocked ? '' : 'locked'}`}
                        onClick={() => isUnlocked && selectLevelForPractice(level._id)}
                        style={{ cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
                      >
                        <div className="practice-level-icon">{isUnlocked ? '🎧' : '🔒'}</div>
                        <div className="practice-level-name">{level.name}</div>
                        {!isUnlocked && (
                          <div className="practice-level-locked-label">
                            {t('listening.practiceLocked') || 'Locked'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {practiceView === 'exercises' && (
              <>
                <div className="practice-back-bar">
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => setPracticeView('levels')}>
                    ← {t('listening.back') || 'Back'}
                  </button>
                </div>
                <h3 className="practice-section-title">
                  {levelsList.find(l => l._id === selectedLevelId)?.name || ''} — {t('listening.selectExercise') || 'Select an Exercise'}
                </h3>
                {sessionStats.total > 0 && (
                  <p className="session-stats-banner">
                    {t('listening.sessionAvg') || 'Session average'}: {sessionAvg}%
                  </p>
                )}
                {exercisesLoading ? (
                  <div className="loading-state">{t('listening.loading') || 'Loading...'}</div>
                ) : exercises.length === 0 ? (
                  <div className="no-data">{t('listening.noExercises') || 'No exercises in this level yet.'}</div>
                ) : (
                  <div className="practice-levels-grid">
                    {exercises.map(exercise => (
                      <div
                        key={exercise._id}
                        className="practice-level-card"
                        onClick={() => startExercise(exercise)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="practice-level-icon">🎧</div>
                        <div className="practice-level-name">{exercise.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {practiceView === 'game' && currentExercise && (
              <div className="listening-practice-card">
                <div className="practice-game-bar">
                  <button type="button" className="btn btn-small btn-secondary" onClick={handleNext}>
                    ← {t('listening.backToList') || 'Back to list'}
                  </button>
                </div>

                <h3 className="exercise-title">{currentExercise.title}</h3>

                <div className="listening-audio-controls">
                  <audio
                    key={currentExercise._id}
                    ref={audioRef}
                    src={listeningAPI.getAudioUrl(currentExercise.audioFile, currentExercise._id)}
                    onPlay={handleAudioPlay}
                    onPause={handleAudioPause}
                    onEnded={handleAudioEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onError={handleAudioError}
                    preload="auto"
                  />

                  <div className="listening-audio-progress">
                    <input
                      type="range"
                      className="listening-audio-progress-bar"
                      min={0}
                      max={audioDuration || 0}
                      step={0.1}
                      value={Math.min(audioCurrentTime, audioDuration || 0)}
                      onChange={handleSeek}
                      disabled={!audioDuration || !!audioError}
                      aria-label={t('listening.audioProgress') || 'Audio progress'}
                    />
                    <div className="listening-audio-time">
                      <span>{formatAudioTime(audioCurrentTime)}</span>
                      <span>{formatAudioTime(audioDuration)}</span>
                    </div>
                  </div>

                  {audioError && (
                    <p className="listening-audio-error">{audioError}</p>
                  )}

                  <div className="listening-audio-buttons">
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => skipAudio(-5)}
                      title={t('listening.prev5s') || 'Back 5 seconds'}
                    >
                      −5s
                    </button>
                    <button
                      type="button"
                      className={`btn ${isPlaying ? 'btn-delete' : 'btn-primary'}`}
                      onClick={togglePlayPause}
                    >
                      {isPlaying
                        ? (t('listening.pause') || 'Pause')
                        : (t('listening.play') || 'Play')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => skipAudio(5)}
                      title={t('listening.next5s') || 'Forward 5 seconds'}
                    >
                      +5s
                    </button>
                  </div>
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
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCheck}
                    disabled={isChecking}
                  >
                    {isChecking
                      ? (t('listening.checking') || 'Checking...')
                      : (t('listening.checkAnswer') || 'Check Answer')}
                  </button>
                ) : (
                  <div className={`feedback-box ${feedback.resultTier === 'passed' ? 'correct' : feedback.resultTier === 'partial' ? 'partial' : 'incorrect'}`}>
                    <div className="accuracy-display">
                      <span className="result-label">{t('listening.resultLabel') || 'RESULT:'}</span>
                      <span className="accuracy-percent">{feedback.accuracyPercent}%</span>
                    </div>

                    {feedback.resultTier === 'failed' && (
                      <>
                        <p className="listening-task-failed">{t('listening.taskFailed') || 'TASK FAILED'}</p>
                        <p className="listening-try-again-text">{t('listening.tryAgain') || 'Try again'}</p>
                        <button type="button" className="btn btn-primary" onClick={handleTryAgain}>
                          {t('listening.tryAgain') || 'Try again'}
                        </button>
                      </>
                    )}

                    {feedback.resultTier === 'partial' && (
                      <>
                        {feedback.showMissingWords && feedback.missingWords?.length > 0 && (
                          <div className="listening-result-section listening-result-missing">
                            <strong>{t('listening.missingWords') || '❌ Missing Words'}</strong>
                            <p>{feedback.missingWords.join(', ')}</p>
                          </div>
                        )}
                        <button type="button" className="btn btn-primary" onClick={handleNext}>
                          {t('listening.next') || 'Next Exercise'}
                        </button>
                      </>
                    )}

                    {feedback.resultTier === 'passed' && (
                      <>
                        {feedback.showMissingWords && feedback.missingWords?.length > 0 && (
                          <div className="listening-result-section listening-result-missing">
                            <strong>{t('listening.missingWords') || '❌ Missing Words'}</strong>
                            <p>{feedback.missingWords.join(', ')}</p>
                          </div>
                        )}
                        <p className="listening-passed">{t('listening.passed') || '✔ Passed'}</p>
                        <button type="button" className="btn btn-primary" onClick={handleNext}>
                          {t('listening.next') || 'Next Exercise'}
                        </button>
                      </>
                    )}
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
