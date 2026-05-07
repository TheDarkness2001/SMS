import React, { useState, useEffect, useCallback, useRef } from 'react';
import { homeworkAPI, lessonAPI, languageAPI, levelAPI, examGroupsAPI, getImageUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LessonsTab from '../components/homework/LessonsTab';
import ClassExam from '../components/homework/ClassExam';
import ExamControl from '../components/homework/ExamControl';
import '../styles/Homework.css';

const SESSION_LIMIT = 20;

const Homework = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('practice');

  // Game state
  const [currentWord, setCurrentWord] = useState(null);
  const [userAnswers, setUserAnswers] = useState(['']);
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
    // Check from auth context first, then fall back to sessionStorage
    const role = (user?.role || '').toLowerCase().trim();
    if (role === 'founder') return true;
    if (user?.permissions?.canManageHomework === true) return true;
    // Fallback: check sessionStorage (same source as Sidebar/Navbar)
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      const storedRole = (stored.role || '').toLowerCase().trim();
      if (storedRole === 'founder') return true;
      if (stored.permissions?.canManageHomework === true) return true;
    } catch (e) {}
    return false;
  })();

  // Lesson system state
  const [myProgress, setMyProgress] = useState([]);
  const [activeExamLesson, setActiveExamLesson] = useState(null);
  const [showClassExam, setShowClassExam] = useState(false);

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

  // Exam mode state
  const [examView, setExamView] = useState('levels'); // 'levels' | 'classes' | 'game'

  // Per-word timer for practice
  const WORD_TIME_LIMIT = 30;
  const [wordTimeLeft, setWordTimeLeft] = useState(WORD_TIME_LIMIT);
  const wordTimerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  // Fetch student lesson progress
  useEffect(() => {
    if (!isStudent) return;
    const fetchMyProgress = async () => {
      try {
        const res = await lessonAPI.getMyLessonProgress();
        if (res.data.success) {
          setMyProgress(res.data.data.progress);
        }
      } catch (error) {
        console.error('Error fetching lesson progress:', error);
      }
    };
    fetchMyProgress();
  }, [isStudent]);

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
        const res = await lessonAPI.getAllLessons(selectedLevelId, 'words');
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

  // Initialize answers when word changes
  useEffect(() => {
    if (currentWord) {
      const isMultiEnToUz = currentWord.direction === 'en-to-uz' && currentWord.uzbekMeanings?.length > 1;
      const isMultiUzToEn = currentWord.direction === 'uz-to-en' && currentWord.englishForms?.length > 1;
      if (isMultiEnToUz) {
        setUserAnswers(new Array(currentWord.uzbekMeanings.length).fill(''));
      } else if (isMultiUzToEn) {
        setUserAnswers(new Array(currentWord.englishForms.length).fill(''));
      } else {
        setUserAnswers(['']);
      }
    }
  }, [currentWord]);

  // Fetch random word
  const fetchRandomWord = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const params = {};
      if (practiceMode === 'lesson' && selectedPracticeLessonId) {
        params.lessonId = selectedPracticeLessonId;
      } else if (selectedLevelId) {
        params.levelId = selectedLevelId;
      }
      const response = await homeworkAPI.getRandomWord(params);
      if (response.data.success) {
        setCurrentWord(response.data.data.word);
      }
    } catch (error) {
      console.error('Error fetching word:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevelId, selectedPracticeLessonId, practiceMode]);

  // Load first word when tab changes to practice or exam
  useEffect(() => {
    const isGameVisible = activeTab === 'exam' || (activeTab === 'practice' && practiceView === 'game');
    if (isGameVisible && !currentWord && !sessionComplete) {
      fetchRandomWord();
    }
  }, [activeTab, practiceView, fetchRandomWord, currentWord, sessionComplete]);

  // Check answer
  const handleCheckAnswer = async () => {
    if (!currentWord) return;
    const hasAnswers = userAnswers.some(a => a.trim());
    if (!hasAnswers) return;
    setIsChecking(true);
    // Stop word timer when user submits
    if (activeTab === 'practice') {
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
        wordTimerRef.current = null;
      }
    }
    try {
      const payload = {
        wordId: currentWord.id,
        direction: currentWord.direction
      };
      const isMultiEnToUz = currentWord.direction === 'en-to-uz' && currentWord.uzbekMeanings?.length > 1;
      const isMultiUzToEn = currentWord.direction === 'uz-to-en' && currentWord.englishForms?.length > 1;
      if (isMultiEnToUz || isMultiUzToEn) {
        payload.answers = userAnswers;
      } else {
        payload.answer = userAnswers[0];
      }
      const response = await homeworkAPI.checkAnswer(payload);
      if (response.data.success) {
        const isCorrect = response.data.data.isCorrect;
        setFeedback({
          isCorrect,
          correctAnswer: response.data.data.correctAnswer,
          userAnswer: response.data.data.userAnswer
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
          if (currentWord.direction === 'en-to-uz') {
            newStats.enToUzTotal++;
            if (isCorrect) newStats.enToUzCorrect++;
          } else {
            newStats.uzToEnTotal++;
            if (isCorrect) newStats.uzToEnCorrect++;
          }
          return newStats;
        });

        // Track practice stats per lesson (student only, practice mode only)
        if (isStudent && activeTab === 'practice' && practiceMode === 'lesson' && selectedPracticeLessonId) {
          try {
            await lessonAPI.updatePracticeStats({
              lessonId: selectedPracticeLessonId,
              isCorrect
            });
          } catch (err) {
            // Silently fail - practice tracking is not critical
          }
        }

        // Auto-advance in practice mode after brief feedback
        if (activeTab === 'practice') {
          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
          autoAdvanceRef.current = setTimeout(() => {
            setFeedback(null);
            handleNext();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error checking answer:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Skip word
  const handleSkipWord = () => {
    if (!currentWord) return;
    stopWordTimer();
    setFeedback({
      isCorrect: false,
      correctAnswer: currentWord.uzbek,
      userAnswer: 'Skipped',
      isSkipped: true
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
      if (currentWord.direction === 'en-to-uz') {
        newStats.enToUzTotal++;
      } else {
        newStats.uzToEnTotal++;
      }
      return newStats;
    });
    if (isStudent && activeTab === 'practice' && practiceMode === 'lesson' && selectedPracticeLessonId) {
      lessonAPI.updatePracticeStats({ lessonId: selectedPracticeLessonId, isCorrect: false }).catch(() => {});
    }
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      setFeedback(null);
      handleNext();
    }, 1500);
  };

  // Handle next word
  const handleNext = () => {
    if (activeTab === 'exam' && sessionStats.totalAttempts >= SESSION_LIMIT) {
      setSessionComplete(true);
    } else {
      fetchRandomWord();
    }
  };

  // Handle Enter key
  const handleKeyDown = (e, inputIndex) => {
    if (e.key === 'Enter') {
      if (activeTab === 'practice') {
        // In practice, just submit (auto-advance handles next)
        const hasAnswers = userAnswers.some(a => a.trim());
        if (!feedback && hasAnswers) handleCheckAnswer();
      } else {
        // In exam, toggle between check and next
        if (feedback) {
          handleNext();
        } else {
          handleCheckAnswer();
        }
      }
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (!currentWord) return '';
    if (currentWord.direction === 'en-to-uz') {
      return <div className="word-main">{currentWord.english}</div>;
    }
    return currentWord.uzbek;
  };

  const getDirectionLabel = () => {
    if (!currentWord) return '';
    return currentWord.direction === 'en-to-uz'
      ? t('homework.translateToUzbek') || 'Translate to Uzbek'
      : t('homework.translateToEnglish') || 'Translate to English';
  };

  const getPlaceholder = (index) => {
    if (!currentWord) return '';
    if (currentWord.direction === 'en-to-uz') {
      return `${t('homework.meaning') || 'Meaning'} ${index + 1}...`;
    }
    if (currentWord.direction === 'uz-to-en' && currentWord.englishForms?.length > 1) {
      return `${t('homework.form') || 'Form'} ${index + 1}...`;
    }
    return t('homework.typeEnglish') || 'Type English translation...';
  };

  const accuracy = sessionStats.totalAttempts > 0
    ? Math.round((sessionStats.correctAnswers / sessionStats.totalAttempts) * 100)
    : 0;



  // Fetch student progress for admin
  useEffect(() => {
    if (activeTab === 'progress' && isAdmin) {
      fetchStudentProgress();
    }
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
    if (!window.confirm(t('homework.confirmReset') || 'Reset this student\'s progress?')) return;
    try {
      await homeworkAPI.resetStudentProgress(id);
      fetchStudentProgress();
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getPerformanceMessage = (acc) => {
    if (acc >= 90) return t('homework.excellent') || 'Excellent! Outstanding performance!';
    if (acc >= 80) return t('homework.great') || 'Great job! Very good performance!';
    if (acc >= 70) return t('homework.good') || 'Good work! Keep practicing!';
    if (acc >= 60) return t('homework.notBad') || 'Not bad! Room for improvement.';
    return t('homework.keepPracticing') || 'Keep practicing! You will improve with time.';
  };

  // Timer helpers
  const startWordTimer = () => {
    setWordTimeLeft(WORD_TIME_LIMIT);
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    wordTimerRef.current = setInterval(() => {
      setWordTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(wordTimerRef.current);
          wordTimerRef.current = null;
          handleWordTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopWordTimer = () => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  const handleWordTimeout = () => {
    if (!currentWord) return;
    const correctAnswer = currentWord.direction === 'en-to-uz'
      ? currentWord.uzbek
      : currentWord.english;
    setFeedback({
      isCorrect: false,
      correctAnswer,
      userAnswer: 'Timeout',
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
      if (currentWord.direction === 'en-to-uz') {
        newStats.enToUzTotal++;
      } else {
        newStats.uzToEnTotal++;
      }
      return newStats;
    });
    if (isStudent && practiceMode === 'lesson' && selectedPracticeLessonId) {
      lessonAPI.updatePracticeStats({ lessonId: selectedPracticeLessonId, isCorrect: false }).catch(() => {});
    }
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      setFeedback(null);
      handleNext();
    }, 1500);
  };

  // Practice navigation
  const selectLanguageForPractice = (languageId) => {
    setSelectedLanguageId(languageId);
    setPracticeView('levels');
  };

  const selectLevelForPractice = async (levelId) => {
    setSelectedLevelId(levelId);
    setPracticeView('classes');
    setCurrentWord(null);
    setFeedback(null);
    // Fetch lessons for this level
    setLessonsLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(levelId, 'words');
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
    setCurrentWord(null);
    setFeedback(null);
    setUserAnswers(['']);
    setWordTimeLeft(WORD_TIME_LIMIT);
    stopWordTimer();
    // Word will be fetched by useEffect when currentWord is null and activeTab is practice
  };

  const goBackToPracticeLanguages = () => {
    stopWordTimer();
    setPracticeView('languages');
    setCurrentWord(null);
    setFeedback(null);
    setUserAnswers(['']);
    setSessionComplete(false);
  };

  const goBackToPracticeLevels = () => {
    stopWordTimer();
    setPracticeView('levels');
    setCurrentWord(null);
    setFeedback(null);
    setUserAnswers(['']);
    setSessionComplete(false);
  };

  const goBackToPracticeClasses = () => {
    stopWordTimer();
    setPracticeView('classes');
    setCurrentWord(null);
    setFeedback(null);
    setUserAnswers(['']);
    setSessionComplete(false);
  };

  const endPractice = () => {
    // Save best score
    if (sessionStats.totalAttempts > 0) {
      const currentAccuracy = Math.round((sessionStats.correctAnswers / sessionStats.totalAttempts) * 100);
      setBestPracticeScore(prev => Math.max(prev, currentAccuracy));
    }
    stopWordTimer();
    setPracticeView('classes');
    setCurrentWord(null);
    setFeedback(null);
    setUserAnswers(['']);
    setSessionComplete(false);
  };

  // Exam navigation (student)
  const selectLevelForExam = async (levelId) => {
    setSelectedLevelId(levelId);
    setExamView('classes');
    // Fetch lessons for this level
    setLessonsLoading(true);
    try {
      const res = await lessonAPI.getAllLessons(levelId, 'words');
      if (res.data.success) {
        setLevelLessons(res.data.data.lessons);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLessonsLoading(false);
    }
  };

  const selectClassForExam = (lesson) => {
    setActiveExamLesson({ id: lesson._id, name: lesson.name });
    setExamView('game');
    setShowClassExam(true);
  };

  const goBackToExamLevels = () => {
    setExamView('levels');
    setShowClassExam(false);
    setActiveExamLesson(null);
  };

  // eslint-disable-next-line no-unused-vars
  const goBackToExamClasses = () => {
    setExamView('classes');
    setShowClassExam(false);
    setActiveExamLesson(null);
  };

  // eslint-disable-next-line no-unused-vars
  const handleExamFinish = () => {
    setShowClassExam(false);
    setExamView('classes');
    setActiveExamLesson(null);
    // Refresh progress
    if (isStudent) {
      lessonAPI.getMyLessonProgress().then(res => {
        if (res.data.success) setMyProgress(res.data.data.progress);
      }).catch(() => {});
    }
  };

  // Start per-word timer when word loads in practice
  useEffect(() => {
    if (activeTab === 'practice' && practiceView === 'game' && currentWord && !feedback) {
      startWordTimer();
    }
    return () => {
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
        wordTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, activeTab, practiceView]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const tabs = [];

  if (isStudent) {
    tabs.push(
      { id: 'practice', label: t('homework.practice') || 'Practice' },
      { id: 'exam', label: t('homework.exam') || 'Exam' }
    );
  } else {
    tabs.push(
      { id: 'practice', label: t('homework.practice') || 'Practice' },
      { id: 'exam', label: t('homework.exam') || 'Exam' }
    );
  }

  if (isAdmin) {
    tabs.push(
      { id: 'lessons', label: t('homework.lessons') || 'Lessons' },
      { id: 'examControl', label: t('homework.examControl') || 'Exam Control' },
      { id: 'progress', label: t('homework.studentProgress') || 'Student Progress' }
    );
  }

  return (
    <div className="homework-page">
      <div className="page-header">
        <h1>{t('homework.title') || 'Homework'}</h1>
        <p className="page-subtitle">{t('homework.subtitle') || 'Practice vocabulary and track your progress'}</p>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentWord(null);
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
                <h3 className="practice-section-title">{t('homework.selectLanguage') || 'Select a Language'}</h3>
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
                    <div className="no-data">{t('homework.noLanguages') || 'No languages available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {/* LEVELS VIEW */}
            {practiceView === 'levels' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToPracticeLanguages}>
                    ← {t('homework.backToLanguages') || 'Back to Languages'}
                  </button>
                </div>
                <h3 className="practice-section-title">{t('homework.selectLevel') || 'Select a Level'}</h3>
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
                            {t('homework.practiceLocked') || 'Locked'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {levelsList.length === 0 && (
                    <div className="no-data">{t('homework.noLevels') || 'No levels available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {/* CLASSES VIEW */}
            {practiceView === 'classes' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToPracticeLevels}>
                    ← {t('homework.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                <h3 className="practice-section-title">
                  {levelsList.find(l => l._id === selectedLevelId)?.name || ''} — {t('homework.selectClass') || 'Select a Class'}
                </h3>
                {lessonsLoading ? (
                  <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
                ) : (
                  <div className="practice-classes-grid">
                    {levelLessons.map(lesson => {
                      const dirBadge = !lesson.directionMode || lesson.directionMode === 'mixed'
                        ? { label: t('homework.mixed') || 'Mixed', class: 'direction-mixed' }
                        : lesson.directionMode === 'en-to-uz'
                          ? { label: t('homework.enToUzShort') || 'EN→UZ', class: 'direction-en-uz' }
                          : { label: t('homework.uzToEnShort') || 'UZ→EN', class: 'direction-uz-en' };
                      return (
                        <div
                          key={lesson._id}
                          className="practice-class-card"
                          onClick={() => selectClassForPractice(lesson._id)}
                        >
                          <div className="practice-class-header">
                            <span className="practice-class-order">{lesson.order}</span>
                            <span className="practice-class-name">{lesson.name}</span>
                            <span className={`practice-class-direction ${dirBadge.class}`}>{dirBadge.label}</span>
                          </div>
                          <div className="practice-class-meta">
                            {lesson.wordIds?.length || 0} {t('homework.words') || 'words'}
                          </div>
                        </div>
                      );
                    })}
                    {levelLessons.length === 0 && (
                      <div className="no-data">{t('homework.noLessonsYet') || 'No classes available yet.'}</div>
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
                    ← {t('homework.backToClasses') || 'Back to Classes'}
                  </button>
                  <div className={`practice-timer ${wordTimeLeft <= 10 ? 'timer-urgent' : ''}`}>
                    ⏱️ {wordTimeLeft}s
                  </div>
                  <div className="practice-stats">
                    <span>{t('homework.score') || 'Score'}: {sessionStats.correctAnswers}/{sessionStats.totalAttempts}</span>
                    <span>{t('homework.accuracy') || 'Accuracy'}: {accuracy}%</span>
                    {bestPracticeScore > 0 && (
                      <span className="best-score">{t('homework.best') || 'Best'}: {bestPracticeScore}%</span>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
                ) : currentWord ? (
                  <div className="word-card">
                    <div className="direction-label">{getDirectionLabel()}</div>
                    <div className="word-display">{getDisplayText()}</div>

                    <div className="answer-section">
                      {currentWord.direction === 'en-to-uz' && currentWord.uzbekMeanings?.length > 1 ? (
                        <div className="multi-answer-inputs">
                          {currentWord.uzbekMeanings.map((meaning, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={userAnswers[idx] || ''}
                              onChange={(e) => {
                                const newAnswers = [...userAnswers];
                                newAnswers[idx] = e.target.value;
                                setUserAnswers(newAnswers);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              placeholder={getPlaceholder(idx)}
                              disabled={isChecking || feedback !== null}
                              className="answer-input"
                              autoFocus={idx === 0}
                            />
                          ))}
                        </div>
                      ) : currentWord.direction === 'uz-to-en' && currentWord.englishForms?.length > 1 ? (
                        <div className="multi-answer-inputs">
                          {currentWord.englishForms.map((form, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={userAnswers[idx] || ''}
                              onChange={(e) => {
                                const newAnswers = [...userAnswers];
                                newAnswers[idx] = e.target.value;
                                setUserAnswers(newAnswers);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              placeholder={getPlaceholder(idx)}
                              disabled={isChecking || feedback !== null}
                              className="answer-input"
                              autoFocus={idx === 0}
                            />
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={userAnswers[0] || ''}
                          onChange={(e) => setUserAnswers([e.target.value])}
                          onKeyDown={(e) => handleKeyDown(e, 0)}
                          placeholder={getPlaceholder(0)}
                          disabled={isChecking || feedback !== null}
                          className="answer-input"
                          autoFocus
                        />
                      )}

                      <div className="answer-actions">
                        <button
                          onClick={handleCheckAnswer}
                          disabled={!userAnswers.some(a => a.trim()) || isChecking || feedback !== null}
                          className="btn btn-primary"
                        >
                          {isChecking ? (t('homework.checking') || 'Checking...') : (t('homework.checkAnswer') || 'Check')}
                        </button>
                        <button
                          onClick={handleSkipWord}
                          disabled={isChecking || feedback !== null}
                          className="btn btn-secondary"
                        >
                          {t('homework.skip') || 'Skip'}
                        </button>
                      </div>
                    </div>

                    {feedback && (
                      <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                        {feedback.isTimeout ? (
                          <>
                            <div className="feedback-title">⏰ {t('homework.notFound') || 'Not Found'}</div>
                            <p>{t('homework.correctAnswer') || 'Correct answer'}: <strong>{feedback.correctAnswer}</strong></p>
                          </>
                        ) : feedback.isSkipped ? (
                          <>
                            <div className="feedback-title">⏭️ {t('homework.skipped') || 'Skipped'}</div>
                            <p>{t('homework.correctAnswer') || 'Correct answer'}: <strong>{feedback.correctAnswer}</strong></p>
                          </>
                        ) : feedback.isCorrect ? (
                          <>
                            <div className="feedback-title">{t('homework.correct') || 'Correct!'}</div>
                          </>
                        ) : (
                          <>
                            <div className="feedback-title">{t('homework.incorrect') || 'Incorrect'}</div>
                            <p>{t('homework.correctAnswer') || 'Correct answer'}: <strong>{feedback.correctAnswer}</strong></p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-words">
                    {t('homework.noWords') || 'No words available. Please contact admin to add words.'}
                  </div>
                )}

                <div className="practice-end-bar">
                  <button className="btn btn-small btn-delete" onClick={endPractice}>
                    {t('homework.endPractice') || 'End Practice'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* EXAM MODE - Student: Card-based navigation */}
        {activeTab === 'exam' && isStudent && (
          <div className="game-section">
            {!showClassExam && examView === 'levels' && (
              <>
                <h3 className="practice-section-title">{t('homework.selectLevel') || 'Select a Level'}</h3>
                <div className="practice-levels-grid">
                  {levelsList.map(level => {
                    const isUnlocked = isStudent ? (level.examUnlockedForMe || false) : true;
                    return (
                      <div
                        key={level._id}
                        className={`practice-level-card ${isUnlocked ? '' : 'locked'}`}
                        onClick={() => isUnlocked && selectLevelForExam(level._id)}
                        style={{ cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
                      >
                        <div className="practice-level-icon">{isUnlocked ? '📚' : '🔒'}</div>
                        <div className="practice-level-name">{level.name}</div>
                        {!isUnlocked && (
                          <div className="practice-level-locked-label">
                            {t('homework.examLocked') || 'Locked'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {levelsList.length === 0 && (
                    <div className="no-data">{t('homework.noLevels') || 'No levels available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {!showClassExam && examView === 'classes' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToExamLevels}>
                    ← {t('homework.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                <h3 className="practice-section-title">
                  {levelsList.find(l => l._id === selectedLevelId)?.name || ''} — {t('homework.selectClass') || 'Select a Class'}
                </h3>
                {lessonsLoading ? (
                  <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
                ) : (
                  <div className="exam-student-grid">
                    {levelLessons.map(lesson => {
                      const progress = myProgress.find(p => p.lessonId?._id === lesson._id);
                      const isUnlocked = progress?.examUnlocked || false;
                      const status = progress?.status || 'locked';
                      const canTake = isUnlocked && (status === 'available' || status === 'passed');
                      return (
                        <div
                          key={lesson._id}
                          className={`exam-student-card ${isUnlocked ? 'unlocked' : 'locked'} ${status}`}
                          onClick={() => canTake && selectClassForExam(lesson)}
                          style={{ cursor: canTake ? 'pointer' : 'not-allowed' }}
                        >
                          <div className="exam-student-header">
                            <span className="exam-student-order">{lesson.order}</span>
                            <span className="exam-student-name">{lesson.name}</span>
                          </div>
                          <div className="exam-student-meta">
                            {lesson.wordIds?.length || 0} {t('homework.words') || 'words'}
                          </div>
                          <div className="exam-student-status">
                            {!isUnlocked && (
                              <span className="status-locked">🔒 {t('homework.locked') || 'Locked'}</span>
                            )}
                            {isUnlocked && status === 'locked' && (
                              <span className="status-progress">{t('homework.completePrevious') || 'Complete previous class'}</span>
                            )}
                            {isUnlocked && status === 'available' && (
                              <span className="status-available">✅ {t('homework.available') || 'Available'}</span>
                            )}
                            {isUnlocked && status === 'passed' && (
                              <span className="status-passed">🎓 {t('homework.passed') || 'Passed'}</span>
                            )}
                          </div>
                          {progress?.bestExamScore > 0 && (
                            <div className="exam-student-best">
                              {t('homework.bestScore') || 'Best'}: {progress.bestExamScore}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {levelLessons.length === 0 && (
                      <div className="no-data">{t('homework.noLessonsYet') || 'No classes available yet.'}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* EXAM MODE - Admin/Teacher: Card-based navigation (same as student) */}
        {activeTab === 'exam' && !isStudent && (
          <div className="game-section">
            {!showClassExam && examView === 'levels' && (
              <>
                <h3 className="practice-section-title">{t('homework.selectLevel') || 'Select a Level'}</h3>
                <div className="practice-levels-grid">
                  {levelsList.map(level => (
                    <div
                      key={level._id}
                      className="practice-level-card"
                      onClick={() => selectLevelForExam(level._id)}
                    >
                      <div className="practice-level-icon">📚</div>
                      <div className="practice-level-name">{level.name}</div>
                    </div>
                  ))}
                  {levelsList.length === 0 && (
                    <div className="no-data">{t('homework.noLevels') || 'No levels available yet.'}</div>
                  )}
                </div>
              </>
            )}

            {!showClassExam && examView === 'classes' && (
              <>
                <div className="practice-back-bar">
                  <button className="btn btn-small btn-secondary" onClick={goBackToExamLevels}>
                    ← {t('homework.backToLevels') || 'Back to Levels'}
                  </button>
                </div>
                <h3 className="practice-section-title">
                  {levelsList.find(l => l._id === selectedLevelId)?.name || ''} — {t('homework.selectClass') || 'Select a Class'}
                </h3>
                {lessonsLoading ? (
                  <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
                ) : (
                  <div className="exam-student-grid">
                    {levelLessons.map(lesson => (
                      <div
                        key={lesson._id}
                        className="exam-student-card unlocked available"
                        onClick={() => selectClassForExam(lesson)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="exam-student-header">
                          <span className="exam-student-order">{lesson.order}</span>
                          <span className="exam-student-name">{lesson.name}</span>
                        </div>
                        <div className="exam-student-meta">
                          {lesson.wordIds?.length || 0} {t('homework.words') || 'words'}
                        </div>
                        <div className="exam-student-status">
                          <span className="status-available">✅ {t('homework.available') || 'Available'}</span>
                        </div>
                      </div>
                    ))}
                    {levelLessons.length === 0 && (
                      <div className="no-data">{t('homework.noLessonsYet') || 'No classes available yet.'}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* LESSONS TAB (Admin) */}
        {activeTab === 'lessons' && isAdmin && (
          <LessonsTab t={t} />
        )}

        {/* EXAM CONTROL TAB (Admin/Staff) */}
        {activeTab === 'examControl' && isAdmin && (
          <ExamControl t={t} />
        )}

        {/* STUDENT PROGRESS TAB (Admin) */}
        {activeTab === 'progress' && isAdmin && (
          <div className="student-progress-section">
            {adminLoading ? (
              <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
            ) : (
              <div className="progress-flat-container">
                {/* Filters */}
                <div className="filters-bar">
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
                      <div className="filter-item">
                        <label>{t('homework.filterBySubject') || 'Subject:'}</label>
                        <select
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                          className="subject-filter-select"
                        >
                          <option value="all">{t('homework.allSubjects') || 'All Subjects'}</option>
                          {subjects.filter(s => s !== 'all').map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Date Filter */}
                  <div className="filter-item">
                    <label>{t('homework.filterByDate') || 'Date:'}</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="date-filter-input"
                    />
                    {dateFilter && (
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => setDateFilter('')}
                      >
                        {t('homework.clear') || 'Clear'}
                      </button>
                    )}
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

                  const filteredGroups = subjectFilter === 'all'
                    ? (studentsProgress.groups || [])
                    : (studentsProgress.groups || []).filter(g => g.subjectName === subjectFilter);

                  const groupsWithStudents = filteredGroups.map(group => ({
                    ...group,
                    students: filterStudents(group.students)
                  })).filter(g => g.students.length > 0);

                  const unassignedStudents = filterStudents(
                    studentsProgress.unassigned?.students || []
                  );

                  if (groupsWithStudents.length === 0 && unassignedStudents.length === 0) {
                    return <div className="no-data">{t('homework.noStudentsYet') || 'No students found.'}</div>;
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
                              <span>{group.students.length} {t('homework.students') || 'students'}</span>
                            </div>
                          </div>
                          <div className="progress-group-body">
                            <table className="progress-table">
                              <thead>
                                <tr>
                                  <th>{t('homework.studentName') || 'Student Name'}</th>
                                  <th>{t('homework.wordPractice') || 'Word Practice'}</th>
                                  <th>{t('homework.wordExam') || 'Word Exam'}</th>
                                  <th>{t('homework.sentencePractice') || 'Sentence Practice'}</th>
                                  <th>{t('homework.actions') || 'Actions'}</th>
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
                                        {t('homework.reset') || 'Reset'}
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
                              <div className="progress-group-name">{t('homework.unassigned') || 'Unassigned'}</div>
                            </div>
                            <div className="progress-group-stats">
                              <span>{unassignedStudents.length} {t('homework.students') || 'students'}</span>
                            </div>
                          </div>
                          <div className="progress-group-body">
                            <table className="progress-table">
                              <thead>
                                <tr>
                                  <th>{t('homework.studentName') || 'Student Name'}</th>
                                  <th>{t('homework.wordPractice') || 'Word Practice'}</th>
                                  <th>{t('homework.wordExam') || 'Word Exam'}</th>
                                  <th>{t('homework.sentencePractice') || 'Sentence Practice'}</th>
                                  <th>{t('homework.actions') || 'Actions'}</th>
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
                                        {t('homework.reset') || 'Reset'}
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

      {/* CLASS EXAM OVERLAY */}
      {showClassExam && activeExamLesson && (
        <div className="class-exam-overlay">
          <ClassExam
            lessonId={activeExamLesson.id}
            lessonName={activeExamLesson.name}
            t={t}
            onFinish={(result) => {
              setShowClassExam(false);
              setActiveExamLesson(null);
              if (isStudent) {
                lessonAPI.getMyLessonProgress().then(res => {
                  if (res.data.success) setMyProgress(res.data.data.progress);
                });
              }
            }}
            onCancel={() => {
              setShowClassExam(false);
              setActiveExamLesson(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Homework;
