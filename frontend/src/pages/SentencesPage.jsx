import React, { useState, useEffect, useCallback, useRef } from 'react';
import { languageAPI, levelAPI, lessonAPI, examGroupsAPI, sentenceAPI, homeworkAPI } from '../utils/api';
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
  const [expandedGroups, setExpandedGroups] = useState({});

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
  const [practiceView, setPracticeView] = useState('levels'); // 'levels' | 'classes' | 'game'
  const [bestPracticeScore, setBestPracticeScore] = useState(0);

  // Per-sentence timer for practice
  const SENTENCE_TIME_LIMIT = 30;
  const [sentenceTimeLeft, setSentenceTimeLeft] = useState(SENTENCE_TIME_LIMIT);
  const sentenceTimerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

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
        const res = await lessonAPI.getAllLessons(selectedLevelId);
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
    if (!userAnswer.trim() || !currentSentence) return;
    setIsChecking(true);
    // Stop timer when user submits
    if (sentenceTimerRef.current) {
      clearInterval(sentenceTimerRef.current);
      sentenceTimerRef.current = null;
    }
    try {
      const response = await sentenceAPI.checkAnswer({
        sentenceId: currentSentence._id,
        answer: userAnswer,
        direction: currentSentence.direction === 'en-to-uz' ? 'enToUz' : 'uzToEn'
      });
      if (response.data.success) {
        const isCorrect = response.data.data.isCorrect;
        setFeedback({
          isCorrect,
          correctAnswer: response.data.data.correctAnswer,
          userAnswer: response.data.data.yourAnswer || userAnswer
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

        // Auto-advance in practice mode after brief feedback
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          setFeedback(null);
          setUserAnswer('');
          handleNext();
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking answer:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle next sentence
  const handleNext = () => {
    fetchRandomSentence();
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // In practice, just submit (auto-advance handles next)
      if (!feedback && userAnswer.trim()) handleCheckAnswer();
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

  // Timer helpers
  const startSentenceTimer = () => {
    setSentenceTimeLeft(SENTENCE_TIME_LIMIT);
    if (sentenceTimerRef.current) clearInterval(sentenceTimerRef.current);
    sentenceTimerRef.current = setInterval(() => {
      setSentenceTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(sentenceTimerRef.current);
          sentenceTimerRef.current = null;
          handleSentenceTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSentenceTimer = () => {
    if (sentenceTimerRef.current) {
      clearInterval(sentenceTimerRef.current);
      sentenceTimerRef.current = null;
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  const handleSentenceTimeout = () => {
    if (!currentSentence) return;
    const correctAnswer = currentSentence.direction === 'en-to-uz' ? currentSentence.uzbek : currentSentence.english;
    setFeedback({
      isCorrect: false,
      correctAnswer,
      userAnswer: '',
      isTimeout: true
    });
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
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      handleNext();
    }, 1500);
  };

  // Practice navigation
  const selectLevelForPractice = async (levelId) => {
    setSelectedLevelId(levelId);
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    // Fetch lessons for this level
    setLessonsLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(levelId);
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
    setSentenceTimeLeft(SENTENCE_TIME_LIMIT);
    stopSentenceTimer();
  };

  const goBackToPracticeLevels = () => {
    stopSentenceTimer();
    setPracticeView('levels');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
  };

  const goBackToPracticeClasses = () => {
    stopSentenceTimer();
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
  };

  const endPractice = () => {
    // Save best score
    if (sessionStats.totalAttempts > 0) {
      const currentAccuracy = Math.round((sessionStats.correctAnswers / sessionStats.totalAttempts) * 100);
      setBestPracticeScore(prev => Math.max(prev, currentAccuracy));
    }
    stopSentenceTimer();
    setPracticeView('classes');
    setCurrentSentence(null);
    setFeedback(null);
    setUserAnswer('');
    setSessionComplete(false);
  };

  // Start per-sentence timer when sentence loads in practice
  useEffect(() => {
    if (activeTab === 'practice' && practiceView === 'game' && currentSentence && !feedback) {
      startSentenceTimer();
    }
    return () => {
      if (sentenceTimerRef.current) {
        clearInterval(sentenceTimerRef.current);
        sentenceTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentence, activeTab, practiceView]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sentenceTimerRef.current) clearInterval(sentenceTimerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
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

  const toggleGroupExpanded = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
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
      { id: 'examControl', label: t('sentences.examControl') || 'Exam Control' },
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
            {/* LEVELS VIEW */}
            {practiceView === 'levels' && (
              <>
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
                        <div className="practice-level-icon">{isUnlocked ? '📝' : '🔒'}</div>
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
                  <div className={`practice-timer ${sentenceTimeLeft <= 10 ? 'timer-urgent' : ''}`}>
                    ⏱️ {sentenceTimeLeft}s
                  </div>
                  <div className="practice-stats">
                    <span>{t('sentences.score') || 'Score'}: {sessionStats.correctAnswers}/{sessionStats.totalAttempts}</span>
                    <span>{t('sentences.accuracy') || 'Accuracy'}: {accuracy}%</span>
                    {bestPracticeScore > 0 && (
                      <span className="best-score">{t('sentences.best') || 'Best'}: {bestPracticeScore}%</span>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="loading-state">{t('sentences.loading') || 'Loading...'}</div>
                ) : currentSentence ? (
                  <div className="word-card">
                    <div className="direction-label">{getDirectionLabel()}</div>
                    <div className="word-display">{getDisplayText()}</div>

                    <div className="answer-section">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={getPlaceholder()}
                        disabled={isChecking || feedback !== null}
                        className="answer-input"
                        autoFocus
                      />

                      <button
                        onClick={handleCheckAnswer}
                        disabled={!userAnswer.trim() || isChecking || feedback !== null}
                        className="btn btn-primary"
                      >
                        {isChecking ? (t('sentences.checking') || 'Checking...') : (t('sentences.checkAnswer') || 'Check')}
                      </button>
                    </div>

                    {feedback && (
                      <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                        {feedback.isTimeout ? (
                          <>
                            <div className="feedback-title">⏰ {t('sentences.notFound') || 'Time\'s Up!'}</div>
                            <p>{t('sentences.correctAnswer') || 'Correct answer'}: <strong>{feedback.correctAnswer}</strong></p>
                          </>
                        ) : feedback.isCorrect ? (
                          <>
                            <div className="feedback-title">{t('sentences.correct') || 'Correct!'}</div>
                          </>
                        ) : (
                          <>
                            <div className="feedback-title">{t('sentences.incorrect') || 'Incorrect'}</div>
                            <p>{t('sentences.correctAnswer') || 'Correct answer'}: <strong>{feedback.correctAnswer}</strong></p>
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

        {/* EXAM CONTROL TAB (Admin/Staff) */}
        {activeTab === 'examControl' && isAdmin && (
          <ExamControl t={t} />
        )}

        {/* STUDENT PROGRESS TAB (Admin) */}
        {activeTab === 'progress' && isAdmin && (
          <div className="student-progress-section">
            {adminLoading ? (
              <div className="loading-state">{t('sentences.loading') || 'Loading...'}</div>
            ) : (
              <div className="progress-groups-container">
                {/* Groups */}
                {(studentsProgress.groups || []).map(group => (
                  <div key={group.groupId} className="progress-group-card">
                    <div
                      className="progress-group-header"
                      onClick={() => toggleGroupExpanded(group.groupId)}
                    >
                      <div className="progress-group-title">
                        <span className="progress-group-icon">{expandedGroups[group.groupId] ? '📂' : '📁'}</span>
                        <span className="progress-group-name">{group.groupName}</span>
                        {group.subjectName && (
                          <span className="progress-group-subject">({group.subjectName})</span>
                        )}
                      </div>
                      <div className="progress-group-stats">
                        <span>{group.studentCount} {t('sentences.students') || 'students'}</span>
                        <span>{group.avgAccuracy}% {t('sentences.avgAccuracy') || 'avg accuracy'}</span>
                        <span className="expand-icon">{expandedGroups[group.groupId] ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expandedGroups[group.groupId] && (
                      <div className="progress-group-body">
                        {group.students.length === 0 ? (
                          <div className="no-data">{t('sentences.noStudentsInGroup') || 'No students in this group.'}</div>
                        ) : (
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
                                  <td>{student.name || 'Unknown'}</td>
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
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Unassigned */}
                {studentsProgress.unassigned && studentsProgress.unassigned.students && studentsProgress.unassigned.students.length > 0 && (
                  <div className="progress-group-card unassigned">
                    <div
                      className="progress-group-header"
                      onClick={() => toggleGroupExpanded('unassigned')}
                    >
                      <div className="progress-group-title">
                        <span className="progress-group-icon">{expandedGroups['unassigned'] ? '📂' : '📁'}</span>
                        <span className="progress-group-name">{t('sentences.unassignedStudents') || 'Unassigned Students'}</span>
                      </div>
                      <div className="progress-group-stats">
                        <span>{studentsProgress.unassigned.studentCount} {t('sentences.students') || 'students'}</span>
                        <span className="expand-icon">{expandedGroups['unassigned'] ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expandedGroups['unassigned'] && (
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
                            {studentsProgress.unassigned.students.map(student => (
                              <tr key={student._id}>
                                <td>{student.name || 'Unknown'}</td>
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
                    )}
                  </div>
                )}

                {(!studentsProgress.groups || studentsProgress.groups.length === 0) &&
                  (!studentsProgress.unassigned || !studentsProgress.unassigned.students || studentsProgress.unassigned.students.length === 0) && (
                  <div className="no-data">{t('sentences.noStudentsYet') || 'No students found.'}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SentencesPage;
