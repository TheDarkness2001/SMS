import React, { useState, useEffect, useCallback } from 'react';
import { languageAPI, levelAPI, lessonAPI, examGroupsAPI, sentenceAPI, homeworkAPI, getImageUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import SentenceLeaderboard from '../components/sentences/SentenceLeaderboard';
import LessonsTab from '../components/homework/LessonsTab';
import ExamControl from '../components/homework/ExamControl';
import '../styles/Homework.css';

const SentencesPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('practice');

  // Game state
  const [currentSentence, setCurrentSentence] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Stats
  const [sessionStats, setSessionStats] = useState({
    totalAttempts: 0,
    correctAnswers: 0,
    enToUzCorrect: 0,
    enToUzTotal: 0,
    uzToEnCorrect: 0,
    uzToEnTotal: 0
  });
  const [sessionComplete, setSessionComplete] = useState(false);

  // Admin state
  const [studentsProgress, setStudentsProgress] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const isStudent = user?.userType === 'student';

  const isAdmin = (() => {
    const role = (user?.role || '').toLowerCase().trim();
    if (role === 'founder') return true;
    if (user?.permissions?.canManageHomework === true) return true;
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      const storedRole = (stored.role || '').toLowerCase().trim();
      if (storedRole === 'founder') return true;
      if (stored.permissions?.canManageHomework === true) return true;
    } catch (e) {}
    return false;
  })();

  // 3-tier hierarchy state (shared across tabs)
  // eslint-disable-next-line no-unused-vars
  const [languages, setLanguages] = useState([]);
  const [levelsList, setLevelsList] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [levelLessons, setLevelLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Practice mode state
  const [selectedPracticeLessonId, setSelectedPracticeLessonId] = useState('');
  const [practiceMode, setPracticeMode] = useState('level'); // 'level' or 'lesson'
  const [practiceView, setPracticeView] = useState('languages'); // 'languages' | 'levels' | 'classes' | 'game'
  const [bestPracticeScore, setBestPracticeScore] = useState(0);

  // Tab-switch warning state
  const [tabWarnings, setTabWarnings] = useState(0);
  const [tabWarningVisible, setTabWarningVisible] = useState(false);

  // Fetch languages for all users (students see only their subject language)
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await languageAPI.getAll();
        if (res.data.success) {
          let allLanguages = res.data.data.languages || [];

          // For students, filter languages by their group subjects
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
              console.error('Error fetching student groups:', err);
            }
          }

          setLanguages(allLanguages);
          if (allLanguages.length > 0) {
            setSelectedLanguageId(allLanguages[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };
    fetchLanguages();
  }, [isStudent]);

  // Fetch levels when language selected
  useEffect(() => {
    if (!selectedLanguageId) return;
    const fetchLevels = async () => {
      try {
        const res = await levelAPI.getByLanguage(selectedLanguageId);
        if (res.data.success) {
          setLevelsList(res.data.data.levels);
          if (res.data.data.levels.length > 0) {
            setSelectedLevelId(res.data.data.levels[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
      }
    };
    fetchLevels();
  }, [selectedLanguageId]);

  // Fetch lessons when level selected
  useEffect(() => {
    if (!selectedLevelId) return;
    const fetchLessons = async () => {
      setLessonsLoading(true);
      try {
        const res = await lessonAPI.getAllLessons(selectedLevelId, 'sentences');
        if (res.data.success) {
          setLevelLessons(res.data.data.lessons);
          if (res.data.data.lessons.length > 0) {
            setSelectedPracticeLessonId(res.data.data.lessons[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLessonsLoading(false);
      }
    };
    fetchLessons();
  }, [selectedLevelId]);

  // Fetch random sentence
  const fetchRandomSentence = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    setUserAnswer('');
    try {
      const params = {};
      if (practiceMode === 'lesson' && selectedPracticeLessonId) {
        params.lessonId = selectedPracticeLessonId;
      } else if (selectedLevelId) {
        params.levelId = selectedLevelId;
      }
      const response = await sentenceAPI.getRandom(params);
      if (response.data.success) {
        const sentence = response.data.data.sentence;
        // Add a random direction like Homework does
        sentence.direction = Math.random() > 0.5 ? 'en-to-uz' : 'uz-to-en';
        setCurrentSentence(sentence);
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevelId, selectedPracticeLessonId, practiceMode]);

  // Load first sentence when entering practice game
  useEffect(() => {
    const isGameVisible = activeTab === 'practice' && practiceView === 'game';
    if (isGameVisible && !currentSentence && !sessionComplete) {
      fetchRandomSentence();
    }
  }, [activeTab, practiceView, fetchRandomSentence, currentSentence, sessionComplete]);

  // Check answer
  const handleCheckAnswer = async () => {
    if (!userAnswer.trim() || !currentSentence || feedback) return;
    setIsChecking(true);
    try {
      const response = await sentenceAPI.checkAnswer({
        sentenceId: currentSentence._id,
        answer: userAnswer,
        direction: currentSentence.direction === 'en-to-uz' ? 'enToUz' : 'uzToEn'
      });
      if (response.data.success) {
        const data = response.data.data;
        const isCorrect = data.isCorrect;
        setFeedback({
          isCorrect,
          correctAnswer: data.correctAnswer,
          userAnswer: data.yourAnswer || userAnswer,
          analysis: data.analysis || null
        });
        setSessionStats(prev => {
          const newStats = {
            totalAttempts: prev.totalAttempts + 1,
            correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
            enToUzCorrect: prev.enToUzCorrect,
            enToUzTotal: prev.enToUzTotal,
            uzToEnCorrect: prev.uzToEnCorrect,
            uzToEnTotal: prev.uzToEnTotal
          };
          if (currentSentence.direction === 'en-to-uz') {
            newStats.enToUzTotal++;
            if (isCorrect) newStats.enToUzCorrect++;
          } else {
            newStats.uzToEnTotal++;
            if (isCorrect) newStats.uzToEnCorrect++;
          }
          return newStats;
        });

        // Auto-advance to next sentence on correct answer after brief delay
        if (isCorrect) {
          setTimeout(() => {
            setFeedback(null);
            setUserAnswer('');
            fetchRandomSentence();
          }, 1200);
        }
      }
    } catch (error) {
      console.error('Error checking answer:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Skip current sentence
  const handleSkipSentence = () => {
    if (!currentSentence) return;
    setSessionStats(prev => {
      const newStats = {
        totalAttempts: prev.totalAttempts + 1,
        correctAnswers: prev.correctAnswers,
        enToUzCorrect: prev.enToUzCorrect,
        enToUzTotal: prev.enToUzTotal,
        uzToEnCorrect: prev.uzToEnCorrect,
        uzToEnTotal: prev.uzToEnTotal
      };
      if (currentSentence.direction === 'en-to-uz') {
        newStats.enToUzTotal++;
      } else {
        newStats.uzToEnTotal++;
      }
      return newStats;
    });
    setFeedback(null);
    setUserAnswer('');
    handleNext();
  };

  // Handle next sentence
  const handleNext = () => {
    fetchRandomSentence();
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (feedback) {
        // If incorrect feedback is shown, Enter goes to next sentence
        if (!feedback.isCorrect) {
          setFeedback(null);
          setUserAnswer('');
          fetchRandomSentence();
        }
        // If correct, auto-advance is already in progress — do nothing
      } else if (userAnswer.trim()) {
        handleCheckAnswer();
      }
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (!currentSentence) return '';
    return currentSentence.direction === 'en-to-uz' ? currentSentence.english : currentSentence.uzbek;
  };

  const getDirectionLabel = () => {
    if (!currentSentence) return '';
    return currentSentence.direction === 'en-to-uz'
      ? t('sentences.translateToUzbek') || 'Translate to Uzbek'
      : t('sentences.translateToEnglish') || 'Translate to English';
  };

  const getPlaceholder = () => {
    if (!currentSentence) return '';
    return currentSentence.direction === 'en-to-uz'
      ? t('sentences.typeUzbek') || 'Type Uzbek translation...'
      : t('sentences.typeEnglish') || 'Type English translation...';
  };

  const accuracy = sessionStats.totalAttempts > 0
    ? Math.round((sessionStats.correctAnswers / sessionStats.totalAttempts) * 100)
    : 0;

  // Anti-copy/paste handlers
  const handlePreventCopy = (e) => {
    e.preventDefault();
    return false;
  };

  const handlePreventKeyboardShortcuts = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault();
    }
  };

  // Tab-switch / focus-loss detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && practiceView === 'game' && currentSentence && !feedback) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            // Reset after 3 warnings
            setTabWarningVisible(false);
            goBackToPracticeLanguages();
            return 0;
          } else {
            setTabWarningVisible(true);
            setTimeout(() => setTabWarningVisible(false), 3000);
            return next;
          }
        });
      }
    };

    const handleWindowBlur = () => {
      if (practiceView === 'game' && currentSentence && !feedback) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            setTabWarningVisible(false);
            goBackToPracticeLanguages();
            return 0;
          } else {
            setTabWarningVisible(true);
            setTimeout(() => setTabWarningVisible(false), 3000);
            return next;
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [practiceView, currentSentence, feedback]);

  // Practice navigation
  const selectLanguageForPractice = (languageId) => {
    setSelectedLanguageId(languageId);
    setPracticeView('levels');
  };

  const selectLevelForPractice = async (levelId) => {
    setSelectedLevelId(levelId);
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    // Fetch lessons for this level
    setLessonsLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(levelId, 'sentences');
      if (res.data.success) {
        setLevelLessons(res.data.data.lessons);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLessonsLoading(false);
    }
  };

  const selectClassForPractice = (lessonId) => {
    setSelectedPracticeLessonId(lessonId);
    setPracticeMode('lesson');
    setPracticeView('game');
    setSessionStats({
      totalAttempts: 0,
      correctAnswers: 0,
      enToUzCorrect: 0,
      enToUzTotal: 0,
      uzToEnCorrect: 0,
      uzToEnTotal: 0
    });
    setSessionComplete(false);
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setTabWarnings(0);
    setTabWarningVisible(false);
  };

  const goBackToPracticeLanguages = () => {
    setPracticeView('languages');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
    setTabWarnings(0);
    setTabWarningVisible(false);
  };

  const goBackToPracticeLevels = () => {
    setPracticeView('levels');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
    setTabWarnings(0);
    setTabWarningVisible(false);
  };

  const goBackToPracticeClasses = () => {
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
    setTabWarnings(0);
    setTabWarningVisible(false);
  };

  const endPractice = () => {
    // Save best score
    if (sessionStats.totalAttempts > 0) {
      const currentAccuracy = Math.round((sessionStats.correctAnswers / sessionStats.totalAttempts) * 100);
      setBestPracticeScore(prev => Math.max(prev, currentAccuracy));
    }
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
    setTabWarnings(0);
    setTabWarningVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setTabWarningVisible(false);
    };
  }, []);

  // Fetch student progress for admin
  useEffect(() => {
    if (activeTab === 'progress' && isAdmin) {
      fetchStudentProgress();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  const fetchStudentProgress = async () => {
    setAdminLoading(true);
    try {
      const response = await homeworkAPI.getGroupStudentProgress();
      if (response.data.success) {
        setStudentsProgress(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResetProgress = async (id) => {
    if (!window.confirm(t('sentences.confirmReset') || 'Reset this student\'s progress?')) return;
    try {
      await homeworkAPI.resetStudentProgress(id);
      fetchStudentProgress();
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  };

  // Build tabs
  const tabs = [];

  tabs.push(
    { id: 'practice', label: t('sentences.practice') || 'Practice' },
    { id: 'leaderboard', label: t('sentences.leaderboard') || 'Leaderboard' }
  );

  if (isAdmin) {
    tabs.push(
      { id: 'lessons', label: t('sentences.lessons') || 'Lessons' },
      { id: 'permissions', label: t('sentences.permissions') || 'Permissions' },
      { id: 'progress', label: t('sentences.studentProgress') || 'Student Progress' }
    );
  }

  return (
    <div className="homework-page">
      <div className="page-header">
        <h1>{t('sentences.title') || 'Sentences'}</h1>
        <p className="page-subtitle">{t('sentences.subtitle') || 'Practice sentence writing and track your progress'}</p>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentSentence(null);
              setFeedback(null);
              setSessionComplete(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* PRACTICE MODE */}
        {activeTab === 'practice' && (
          <div className="game-section">
            {/* LANGUAGES VIEW */}
            {practiceView === 'languages' && (
              <>
                <h3 className="practice-section-title">{t('sentences.selectLanguage') || 'Select a Language'}</h3>
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
                    <div className="no-data">{t('sentences.noLanguages') || 'No languages available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {/* LEVELS VIEW */}
            {practiceView === 'levels' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToPracticeLanguages}>
                    ← {t('sentences.backToLanguages') || 'Back to Languages'}
                  </button>
                </div>
                <h3 className="practice-section-title">{t('sentences.selectLevel') || 'Select a Level'}</h3>
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
                        <div className="practice-level-icon">{isUnlocked ? '📚' : '🔒'}</div>
                        <div className="practice-level-name">{level.name}</div>
                        {!isUnlocked && (
                          <div className="practice-level-locked-label">
                            {t('sentences.practiceLocked') || 'Locked'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {levelsList.length === 0 && (
                    <div className="no-data">{t('sentences.noLevels') || 'No levels available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {/* CLASSES VIEW */}
            {practiceView === 'classes' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToPracticeLevels}>
                    ← {t('sentences.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                <h3 className="practice-section-title">
                  {levelsList.find(l => l._id === selectedLevelId)?.name || ''} — {t('sentences.selectClass') || 'Select a Class'}
                </h3>
                {lessonsLoading ? (
                  <div className="loading-state">{t('sentences.loading') || 'Loading...'}</div>
                ) : (
                  <div className="practice-classes-grid">
                    {levelLessons.map(lesson => (
                      <div
                        key={lesson._id}
                        className="practice-class-card"
                        onClick={() => selectClassForPractice(lesson._id)}
                      >
                        <div className="practice-class-header">
                          <span className="practice-class-order">{lesson.order}</span>
                          <span className="practice-class-name">{lesson.name}</span>
                        </div>
                        <div className="practice-class-meta">
                          📝 {t('sentences.title') || 'Sentences'}
                        </div>
                      </div>
                    ))}
                    {levelLessons.length === 0 && (
                      <div className="no-data">{t('sentences.noClassesYet') || 'No classes available yet.'}</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* GAME VIEW */}
            {practiceView === 'game' && (
              <>
                <div className="practice-game-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToPracticeClasses}>
                    ← {t('sentences.backToClasses') || 'Back to Classes'}
                  </button>
                  <div className="practice-stats">
                    <span>{t('sentences.score') || 'Score'}: {sessionStats.correctAnswers}/{sessionStats.totalAttempts}</span>
                    <span>{t('sentences.accuracy') || 'Accuracy'}: {accuracy}%</span>
                    {bestPracticeScore > 0 && (
                      <span className="best-score">{t('sentences.best') || 'Best'}: {bestPracticeScore}%</span>
                    )}
                  </div>
                </div>

                {/* Tab warning overlay */}
                {tabWarningVisible && (
                  <div className="tab-warning-overlay">
                    <div className="tab-warning-box">
                      <div className="tab-warning-icon">⚠️</div>
                      <div className="tab-warning-title">
                        {t('sentences.warning') || 'Warning'} {tabWarnings}/3
                      </div>
                      <div className="tab-warning-message">
                        {t('sentences.warningMessage') || 'Do not leave the page!'}
                      </div>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="loading-state">{t('sentences.loading') || 'Loading...'}</div>
                ) : currentSentence ? (
                  <div
                    className="word-card sentence-practice-card"
                    onContextMenu={handlePreventCopy}
                    onCopy={handlePreventCopy}
                    onCut={handlePreventCopy}
                  >
                    <div className="direction-label">{getDirectionLabel()}</div>
                    <div className="word-display">{getDisplayText()}</div>

                    <div className="answer-section">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          handleKeyDown(e);
                          handlePreventKeyboardShortcuts(e);
                        }}
                        onCopy={handlePreventCopy}
                        onCut={handlePreventCopy}
                        onPaste={handlePreventCopy}
                        placeholder={getPlaceholder()}
                        disabled={isChecking || feedback !== null}
                        className="answer-input"
                        autoFocus
                      />

                      <div className="answer-buttons">
                        <button
                          onClick={handleSkipSentence}
                          disabled={isChecking || feedback !== null}
                          className="btn btn-secondary"
                        >
                          {t('sentences.skip') || 'Skip'}
                        </button>
                      </div>
                    </div>

                    {feedback && (
                      <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                        {feedback.isCorrect ? (
                          <>
                            <div className="feedback-title">{t('sentences.correct') || 'Correct!'}</div>
                          </>
                        ) : (
                          <>
                            <div className="feedback-title">{t('sentences.incorrect') || 'Incorrect'}</div>

                            {/* Category pills */}
                            {feedback.analysis && feedback.analysis.categories.length > 0 && (
                              <div className="feedback-categories">
                                {feedback.analysis.categories.map(cat => (
                                  <span key={cat} className={`category-pill category-${cat}`}>
                                    {t(`sentences.${cat}`) || cat}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Word diff */}
                            {feedback.analysis && feedback.analysis.diff.length > 0 && (
                              <div className="feedback-diff">
                                <div className="diff-row">
                                  <span className="diff-label">{t('sentences.correctAnswer') || 'Correct'}:</span>
                                  <span className="diff-words">
                                    {feedback.analysis.diff.map((d, i) => {
                                      if (d.type === 'correct') return <span key={i} className="diff-correct">{d.word}</span>;
                                      if (d.type === 'missing') return <span key={i} className="diff-missing">{d.word}</span>;
                                      if (d.type === 'wrong') return <span key={i} className="diff-missing">{d.expected}</span>;
                                      if (d.type === 'punctuation') return <span key={i} className="diff-missing">{d.expected}</span>;
                                      return null;
                                    })}
                                  </span>
                                </div>
                                <div className="diff-row">
                                  <span className="diff-label">{t('sentences.yourAnswerLabel') || 'Yours'}:</span>
                                  <span className="diff-words">
                                    {feedback.analysis.diff.map((d, i) => {
                                      if (d.type === 'correct') return <span key={i} className="diff-correct">{d.word}</span>;
                                      if (d.type === 'extra') return <span key={i} className="diff-extra">{d.word}</span>;
                                      if (d.type === 'wrong') return <span key={i} className="diff-wrong">{d.got}</span>;
                                      if (d.type === 'punctuation') return <span key={i} className="diff-wrong">{d.got}</span>;
                                      return null;
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Similarity score */}
                            {feedback.analysis && (
                              <div className="feedback-similarity">
                                {t('sentences.similarity') || 'Similarity'}: {feedback.analysis.similarityScore}%
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="feedback-actions">
                              <button
                                className="btn btn-small btn-secondary"
                                onClick={() => {
                                  setFeedback(null);
                                  setUserAnswer('');
                                }}
                              >
                                {t('sentences.tryAgain') || 'Try Again'}
                              </button>
                              <button
                                className="btn btn-small btn-primary"
                                onClick={() => {
                                  setFeedback(null);
                                  setUserAnswer('');
                                  handleNext();
                                }}
                              >
                                {t('sentences.next') || 'Next'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-words">
                    {t('sentences.noSentences') || 'No sentences available. Please contact admin to add sentences.'}
                  </div>
                )}

                <div className="practice-end-bar">
                  <button className="btn btn-small btn-delete" onClick={endPractice}>
                    {t('sentences.endPractice') || 'End Practice'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <SentenceLeaderboard t={t} />
        )}

        {/* LESSONS TAB (Admin) */}
        {activeTab === 'lessons' && isAdmin && (
          <LessonsTab t={t} mode="sentences" />
        )}

        {/* PERMISSIONS TAB (Admin/Staff) */}
        {activeTab === 'permissions' && isAdmin && (
          <ExamControl t={t} noExam />
        )}

        {/* STUDENT PROGRESS TAB (Admin) */}
        {activeTab === 'progress' && isAdmin && (
          <div className="student-progress-section">
            {adminLoading ? (
              <div className="loading-state">{t('sentences.loading') || 'Loading...'}</div>
            ) : (
              <div className="progress-flat-container">
                {/* Filters */}
                <div className="filters-bar-modern">
                  <div className="filters-row">
                    {/* Subject Filter */}
                    {(() => {
                      const subjects = ['all'];
                      (studentsProgress.groups || []).forEach(g => {
                        if (g.subjectName && !subjects.includes(g.subjectName)) {
                          subjects.push(g.subjectName);
                        }
                      });
                      if (subjects.length <= 1) return null;
                      return (
                        <div className="filter-chip">
                          <span className="filter-icon">📚</span>
                          <div className="filter-content">
                            <label>{t('sentences.filterBySubject') || 'Subject'}</label>
                            <select
                              value={subjectFilter}
                              onChange={(e) => setSubjectFilter(e.target.value)}
                              className="filter-select"
                            >
                              <option value="all">{t('sentences.allSubjects') || 'All Subjects'}</option>
                              {subjects.filter(s => s !== 'all').map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Date Filter */}
                    <div className="filter-chip">
                      <span className="filter-icon">📅</span>
                      <div className="filter-content">
                        <label>{t('sentences.filterByDate') || 'Date'}</label>
                        <div className="filter-date-wrap">
                          <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="filter-date-input"
                          />
                          {dateFilter && (
                            <button
                              className="filter-clear-btn"
                              onClick={() => setDateFilter('')}
                              title={t('sentences.clear') || 'Clear'}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Cards */}
                {(() => {
                  const isSameDay = (dateStr, targetStr) => {
                    if (!dateStr || !targetStr) return false;
                    const d = new Date(dateStr);
                    const t = new Date(targetStr);
                    return d.getFullYear() === t.getFullYear() &&
                           d.getMonth() === t.getMonth() &&
                           d.getDate() === t.getDate();
                  };

                  const filterStudents = (students) => {
                    if (!dateFilter) return students;
                    return students.filter(s => isSameDay(s.lastActivityDate, dateFilter));
                  };

                  const filteredGroups = (studentsProgress.groups || [])
                    .filter(g => subjectFilter === 'all' || g.subjectName === subjectFilter);

                  const groupsWithStudents = filteredGroups.map(group => ({
                    ...group,
                    students: filterStudents(group.students)
                  })).filter(g => g.students.length > 0);

                  const unassignedStudents = filterStudents(
                    studentsProgress.unassigned?.students || []
                  );

                  if (groupsWithStudents.length === 0 && unassignedStudents.length === 0) {
                    return <div className="no-data">{t('sentences.noStudentsYet') || 'No students found.'}</div>;
                  }

                  return (
                    <div className="progress-groups-list">
                      {groupsWithStudents.map(group => (
                        <div key={group.groupId} className="progress-group-card">
                          <div className="progress-group-header-static">
                            <div className="progress-group-title">
                              <span className="progress-group-icon">📁</span>
                              <div>
                                <div className="progress-group-name">{group.groupName}</div>
                                <div className="progress-group-subject">{group.subjectName}</div>
                              </div>
                            </div>
                            <div className="progress-group-stats">
                              <span>{group.students.length} {t('sentences.students') || 'students'}</span>
                            </div>
                          </div>
                          <div className="progress-group-body">
                            <table className="progress-table">
                              <thead>
                                <tr>
                                  <th>{t('sentences.studentName') || 'Student Name'}</th>
                                  <th>{t('sentences.wordPractice') || 'Word Practice'}</th>
                                  <th>{t('sentences.wordExam') || 'Word Exam'}</th>
                                  <th>{t('sentences.sentencePractice') || 'Sentence Practice'}</th>
                                  <th>{t('sentences.actions') || 'Actions'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.students.map(student => (
                                  <tr key={student._id}>
                                    <td>
                                                                          <div className="student-name-cell">
                                                                            {student.profileImage ? (
                                                                              <img src={getImageUrl(student.profileImage)} alt={student.name} className="student-avatar-small" />
                                                                            ) : (
                                                                              <div className="student-avatar-placeholder-small">{student.name?.charAt(0) || '?'}</div>
                                                                            )}
                                                                            <span>{student.name || 'Unknown'}</span>
                                                                          </div>
                                                                        </td>
                                    <td>
                                      <span className={`progress-badge ${student.wordPracticeAccuracy >= 70 ? 'good' : student.wordPracticeAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.wordPracticeAccuracy}%
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`progress-badge ${student.wordExamAccuracy >= 70 ? 'good' : student.wordExamAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.wordExamAccuracy}%
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`progress-badge ${student.sentencePracticeAccuracy >= 70 ? 'good' : student.sentencePracticeAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.sentencePracticeAccuracy}%
                                      </span>
                                    </td>
                                    <td className="actions">
                                      <button
                                        onClick={() => handleResetProgress(student._id)}
                                        className="btn btn-small btn-delete"
                                      >
                                        {t('sentences.reset') || 'Reset'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}

                      {/* Unassigned Students */}
                      {unassignedStudents.length > 0 && (
                        <div className="progress-group-card unassigned">
                          <div className="progress-group-header-static">
                            <div className="progress-group-title">
                              <span className="progress-group-icon">👤</span>
                              <div className="progress-group-name">{t('sentences.unassigned') || 'Unassigned'}</div>
                            </div>
                            <div className="progress-group-stats">
                              <span>{unassignedStudents.length} {t('sentences.students') || 'students'}</span>
                            </div>
                          </div>
                          <div className="progress-group-body">
                            <table className="progress-table">
                              <thead>
                                <tr>
                                  <th>{t('sentences.studentName') || 'Student Name'}</th>
                                  <th>{t('sentences.wordPractice') || 'Word Practice'}</th>
                                  <th>{t('sentences.wordExam') || 'Word Exam'}</th>
                                  <th>{t('sentences.sentencePractice') || 'Sentence Practice'}</th>
                                  <th>{t('sentences.actions') || 'Actions'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unassignedStudents.map(student => (
                                  <tr key={student._id}>
                                    <td>
                                                                          <div className="student-name-cell">
                                                                            {student.profileImage ? (
                                                                              <img src={getImageUrl(student.profileImage)} alt={student.name} className="student-avatar-small" />
                                                                            ) : (
                                                                              <div className="student-avatar-placeholder-small">{student.name?.charAt(0) || '?'}</div>
                                                                            )}
                                                                            <span>{student.name || 'Unknown'}</span>
                                                                          </div>
                                                                        </td>
                                    <td>
                                      <span className={`progress-badge ${student.wordPracticeAccuracy >= 70 ? 'good' : student.wordPracticeAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.wordPracticeAccuracy}%
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`progress-badge ${student.wordExamAccuracy >= 70 ? 'good' : student.wordExamAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.wordExamAccuracy}%
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`progress-badge ${student.sentencePracticeAccuracy >= 70 ? 'good' : student.sentencePracticeAccuracy >= 50 ? 'medium' : 'low'}`}>
                                        {student.sentencePracticeAccuracy}%
                                      </span>
                                    </td>
                                    <td className="actions">
                                      <button
                                        onClick={() => handleResetProgress(student._id)}
                                        className="btn btn-small btn-delete"
                                      >
                                        {t('sentences.reset') || 'Reset'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SentencesPage;
