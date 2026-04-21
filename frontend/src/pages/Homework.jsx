import React, { useState, useEffect, useCallback } from 'react';
import { homeworkAPI, lessonAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LessonsTab from '../components/homework/LessonsTab';
import ClassExam from '../components/homework/ClassExam';
import '../styles/Homework.css';

const SESSION_LIMIT = 20;

const Homework = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('practice');

  // Game state
  const [currentWord, setCurrentWord] = useState(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Level state
  const [selectedLevel, setSelectedLevel] = useState('');
  const [levels, setLevels] = useState([]);

  // Admin state
  const [studentsProgress, setStudentsProgress] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = ['admin', 'manager', 'founder'].includes((user?.role || '').toLowerCase().trim());
  const isStudent = user?.userType === 'student';

  // Lesson system state
  const [myProgress, setMyProgress] = useState([]);
  const [activeExamLesson, setActiveExamLesson] = useState(null);
  const [showClassExam, setShowClassExam] = useState(false);

  // Fetch available levels
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const response = await homeworkAPI.getLevels();
        if (response.data.success) {
          setLevels(response.data.data.levels);
          if (response.data.data.levels.length > 0 && !selectedLevel) {
            setSelectedLevel(response.data.data.levels[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
      }
    };
    fetchLevels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Fetch random word
  const fetchRandomWord = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    setUserAnswer('');
    try {
      const response = await homeworkAPI.getRandomWord(selectedLevel);
      if (response.data.success) {
        setCurrentWord(response.data.data.word);
      }
    } catch (error) {
      console.error('Error fetching word:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel]);

  // Load first word when tab changes to practice or exam
  useEffect(() => {
    if ((activeTab === 'practice' || activeTab === 'exam') && !currentWord && !sessionComplete) {
      fetchRandomWord();
    }
  }, [activeTab, fetchRandomWord, currentWord, sessionComplete]);

  // Check answer
  const handleCheckAnswer = async () => {
    if (!userAnswer.trim() || !currentWord) return;
    setIsChecking(true);
    try {
      const response = await homeworkAPI.checkAnswer({
        wordId: currentWord.id,
        answer: userAnswer,
        direction: currentWord.direction
      });
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
      }
    } catch (error) {
      console.error('Error checking answer:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle next word
  const handleNext = () => {
    if (activeTab === 'exam' && sessionStats.totalAttempts >= SESSION_LIMIT) {
      setSessionComplete(true);
    } else {
      fetchRandomWord();
    }
  };

  // Submit exam results
  const handleFinishExam = async () => {
    setIsSubmitting(true);
    try {
      await homeworkAPI.submitResult(sessionStats);
    } catch (error) {
      console.error('Error submitting results:', error);
    } finally {
      setIsSubmitting(false);
      setActiveTab('results');
      setSessionComplete(false);
      setSessionStats({
        totalAttempts: 0,
        correctAnswers: 0,
        enToUzCorrect: 0,
        enToUzTotal: 0,
        uzToEnCorrect: 0,
        uzToEnTotal: 0
      });
      setCurrentWord(null);
      setFeedback(null);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (feedback) {
        handleNext();
      } else {
        handleCheckAnswer();
      }
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (!currentWord) return '';
    return currentWord.direction === 'en-to-uz' ? currentWord.english : currentWord.uzbek;
  };

  const getDirectionLabel = () => {
    if (!currentWord) return '';
    return currentWord.direction === 'en-to-uz'
      ? t('homework.translateToUzbek') || 'Translate to Uzbek'
      : t('homework.translateToEnglish') || 'Translate to English';
  };

  const getPlaceholder = () => {
    if (!currentWord) return '';
    return currentWord.direction === 'en-to-uz'
      ? t('homework.typeUzbek') || 'Type Uzbek translation...'
      : t('homework.typeEnglish') || 'Type English translation...';
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
      const response = await homeworkAPI.getAllStudentProgress();
      if (response.data.success) {
        setStudentsProgress(response.data.data.students);
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

  const getPerformanceMessage = (acc) => {
    if (acc >= 90) return t('homework.excellent') || 'Excellent! Outstanding performance!';
    if (acc >= 80) return t('homework.great') || 'Great job! Very good performance!';
    if (acc >= 70) return t('homework.good') || 'Good work! Keep practicing!';
    if (acc >= 60) return t('homework.notBad') || 'Not bad! Room for improvement.';
    return t('homework.keepPracticing') || 'Keep practicing! You will improve with time.';
  };

  const tabs = [];

  if (isStudent) {
    tabs.push(
      { id: 'myLessons', label: t('homework.myLessons') || 'My Lessons' },
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
        {/* MY LESSONS TAB (Student) */}
        {activeTab === 'myLessons' && isStudent && (
          <div className="my-lessons-section">
            <div className="level-selector">
              <label>{t('homework.level') || 'Level'}:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="level-select"
              >
                {levels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div className="lessons-progress-list">
              {myProgress
                .filter(p => p.lessonId?.level === selectedLevel)
                .sort((a, b) => (a.lessonId?.order || 0) - (b.lessonId?.order || 0))
                .map(progress => {
                  const status = progress.status;
                  const lesson = progress.lessonId;
                  return (
                    <div key={progress._id} className={`lesson-card ${status}`}>
                      <div className="lesson-info">
                        <h4>{lesson?.name || 'Lesson'}</h4>
                        <span className={`status-badge ${status}`}>
                          {status === 'locked' ? (t('homework.locked') || 'Locked')
                            : status === 'available' ? (t('homework.available') || 'Available')
                            : (t('homework.passed') || 'Passed')
                          }
                        </span>
                        {progress.bestExamScore > 0 && (
                          <span className="best-score">{t('homework.bestScore') || 'Best'}: {progress.bestExamScore}%</span>
                        )}
                      </div>
                      <div className="lesson-actions">
                        {status === 'available' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setActiveExamLesson({ id: lesson?._id, name: lesson?.name });
                              setShowClassExam(true);
                            }}
                          >
                            {t('homework.takeClassExam') || 'Take Class Exam'}
                          </button>
                        )}
                        {status === 'passed' && (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setActiveExamLesson({ id: lesson?._id, name: lesson?.name });
                                setShowClassExam(true);
                              }}
                            >
                              {t('homework.retakeExam') || 'Retake Exam'}
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                setActiveTab('practice');
                              }}
                            >
                              {t('homework.practice') || 'Practice'}
                            </button>
                          </>
                        )}
                        {status === 'locked' && (
                          <span className="locked-text">{t('homework.completePrevious') || 'Complete previous lesson'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {myProgress.filter(p => p.lessonId?.level === selectedLevel).length === 0 && (
                <div className="no-lessons">
                  {t('homework.noLessonsYet') || 'No lessons available yet.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRACTICE / EXAM MODES */}
        {(activeTab === 'practice' || activeTab === 'exam') && (
          <div className="game-section">
            <div className="level-selector">
              <label>{t('homework.level') || 'Level'}:</label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  setCurrentWord(null);
                  setFeedback(null);
                  setSessionStats({
                    totalAttempts: 0,
                    correctAnswers: 0,
                    enToUzCorrect: 0,
                    enToUzTotal: 0,
                    uzToEnCorrect: 0,
                    uzToEnTotal: 0
                  });
                  setSessionComplete(false);
                }}
                className="level-select"
              >
                {levels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {activeTab === 'exam' && (
              <div className="exam-stats-bar">
                <div className="progress-info">
                  <span>{t('homework.question') || 'Question'} {Math.min(sessionStats.totalAttempts + 1, SESSION_LIMIT)} {t('homework.of') || 'of'} {SESSION_LIMIT}</span>
                  <span>{accuracy}% {t('homework.accuracy') || 'Accuracy'}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((sessionStats.totalAttempts) / SESSION_LIMIT) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {activeTab === 'practice' && (
              <div className="practice-stats">
                <span>{t('homework.score') || 'Score'}: {sessionStats.correctAnswers}/{sessionStats.totalAttempts}</span>
                <span>{t('homework.accuracy') || 'Accuracy'}: {accuracy}%</span>
              </div>
            )}

            {isLoading ? (
              <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
            ) : currentWord ? (
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

                  {!feedback ? (
                    <button
                      onClick={handleCheckAnswer}
                      disabled={!userAnswer.trim() || isChecking}
                      className="btn btn-primary"
                    >
                      {isChecking ? (t('homework.checking') || 'Checking...') : (t('homework.checkAnswer') || 'Check Answer')}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="btn btn-primary"
                    >
                      {activeTab === 'exam' && sessionStats.totalAttempts >= SESSION_LIMIT
                        ? (t('homework.finish') || 'Finish')
                        : (t('homework.next') || 'Next')}
                    </button>
                  )}
                </div>

                {feedback && (
                  <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                    {feedback.isCorrect ? (
                      <>
                        <div className="feedback-title">{t('homework.correct') || 'Correct!'}</div>
                        <p>{t('homework.greatJob') || 'Great job! Your answer is correct.'}</p>
                      </>
                    ) : (
                      <>
                        <div className="feedback-title">{t('homework.incorrect') || 'Incorrect'}</div>
                        <p>{t('homework.yourAnswer') || 'Your answer'}: <strong>{feedback.userAnswer}</strong></p>
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

            {activeTab === 'practice' && (
              <div className="game-tip">
                <p><strong>{t('homework.tip') || 'Tip'}:</strong> {t('homework.pressEnter') || 'Press Enter to submit your answer or go to the next word.'}</p>
              </div>
            )}

            {activeTab === 'exam' && sessionComplete && (
              <div className="session-complete-overlay">
                <div className="session-complete-card">
                  <h2>{t('homework.sessionComplete') || 'Session Complete!'}</h2>
                  <div className="session-stats">
                    <div className="stat-box">
                      <span className="stat-number">{sessionStats.correctAnswers}/{sessionStats.totalAttempts}</span>
                      <span className="stat-label">{t('homework.correctAnswers') || 'Correct Answers'}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-number">{accuracy}%</span>
                      <span className="stat-label">{t('homework.accuracy') || 'Accuracy'}</span>
                    </div>
                  </div>
                  <p className="performance-msg">{getPerformanceMessage(accuracy)}</p>
                  {isStudent ? (
                    <button
                      onClick={handleFinishExam}
                      disabled={isSubmitting}
                      className="btn btn-primary btn-large"
                    >
                      {isSubmitting ? (t('homework.saving') || 'Saving...') : (t('homework.viewResults') || 'View Results')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSessionComplete(false);
                        setSessionStats({
                          totalAttempts: 0,
                          correctAnswers: 0,
                          enToUzCorrect: 0,
                          enToUzTotal: 0,
                          uzToEnCorrect: 0,
                          uzToEnTotal: 0
                        });
                        setCurrentWord(null);
                        setFeedback(null);
                        fetchRandomWord();
                      }}
                      className="btn btn-primary btn-large"
                    >
                      {t('homework.tryAgain') || 'Try Again'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LESSONS TAB (Admin) */}
        {activeTab === 'lessons' && isAdmin && (
          <LessonsTab t={t} levels={levels} />
        )}

        {/* STUDENT PROGRESS TAB (Admin) */}
        {activeTab === 'progress' && isAdmin && (
          <div className="student-progress-section">
            {adminLoading ? (
              <div className="loading-state">{t('homework.loading') || 'Loading...'}</div>
            ) : (
              <div className="progress-table-container">
                <table className="progress-table">
                  <thead>
                    <tr>
                      <th>{t('homework.studentName') || 'Student Name'}</th>
                      <th>{t('homework.totalAttempts') || 'Total Attempts'}</th>
                      <th>{t('homework.correctAnswers') || 'Correct'}</th>
                      <th>{t('homework.accuracy') || 'Accuracy'}</th>
                      <th>{t('homework.actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsProgress.map(student => (
                      <tr key={student._id}>
                        <td>{student.name || student.studentId || 'Unknown'}</td>
                        <td>{student.progress?.totalAttempts || 0}</td>
                        <td>{student.progress?.correctAnswers || 0}</td>
                        <td>{student.progress?.accuracy || 0}%</td>
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
                {studentsProgress.length === 0 && (
                  <div className="no-data">{t('homework.noStudentsYet') || 'No students found.'}</div>
                )}
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
