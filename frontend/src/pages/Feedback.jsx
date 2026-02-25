import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { feedbackAPI, schedulerAPI, teachersAPI, getImageUrl } from '../utils/api';
import { 
  AiOutlineCalendar, 
  AiOutlinePlus, 
  AiOutlineEye,
  AiOutlineBook,
  AiOutlineSmile,
  AiOutlineTeam,
  AiOutlineTrophy,
  AiOutlineWarning
} from 'react-icons/ai';
import '../styles/Feedback.css';

const Feedback = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [todayClasses, setTodayClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('today'); // Default to 'today'
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [error, setError] = useState('');
  const [currentUser] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  
  const [formData, setFormData] = useState({
    homework: 80,
    behavior: 80,
    participation: 80,
    feedbackDate: new Date().toISOString().split('T')[0],
    notes: '',
    isExamDay: false,
    examPercentage: 0
  });

  const isAdmin = (currentUser.role || '').toLowerCase().trim() === 'admin' || 
                  (currentUser.role || '').toLowerCase().trim() === 'manager' || 
                  (currentUser.role || '').toLowerCase().trim() === 'founder';

  const filteredClasses = useMemo(() => {
    let result = viewMode === 'all' ? allClasses : todayClasses;

    // For Admin/Manager/Founder, if viewMode is 'today', we filter the ALL classes list by current day
    // because todayClasses from teacher endpoint only returns for THAT teacher.
    // However, if we are admin, we want to see TODAY'S classes for ANY teacher.
    if (isAdmin && viewMode === 'today') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      result = allClasses.filter(cls => 
        (cls.scheduledDays && cls.scheduledDays.includes(today)) || 
        cls.frequency === 'daily'
      );
    }

    // Apply teacher filter
    if (teacherFilter !== 'all') {
      result = result.filter(cls => {
        const teacherId = cls.teacher?._id || cls.teacher;
        return teacherId === teacherFilter;
      });
    }

    return result;
  }, [allClasses, todayClasses, viewMode, teacherFilter, isAdmin]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const branchFilter = getBranchFilter();

      // Fetch teachers for filtering (Admins/Managers only)
      if (isAdmin) {
        try {
          const teachersRes = await teachersAPI.getAll(branchFilter);
          setTeachers(teachersRes.data.data || []);
        } catch (tErr) {
          console.error('Failed to fetch teachers:', tErr);
        }
      }

      // Admins/Founders can see ALL classes anytime, teachers only see today's classes
      let classesRes;
      if (isAdmin) {
        // Fetch ALL class schedules for admin/founder
        classesRes = await schedulerAPI.getAll(branchFilter);
        console.log('👑 Admin/Founder: Fetching ALL classes:', classesRes.data);
        const classes = (classesRes.data.data || []).filter(cls => {
          // Filter out classes without subject
          if (!cls.subject && !cls.subjectGroup?.subject) {
            console.warn('⚠️  Class missing subject:', cls);
            return false;
          }
          return true;
        });
        setAllClasses(classes);
        setTodayClasses(classes); // Initial state
      } else {
        // Fetch only today's classes for teachers
        classesRes = await feedbackAPI.getTodayClasses(branchFilter);
        console.log('👨‍🏫 Teacher: Today\'s classes response:', classesRes.data);
        const classes = (classesRes.data.data || []).filter(cls => {
          // Filter out classes without subject
          if (!cls.subject && !cls.subjectGroup?.subject) {
            console.warn('⚠️  Class missing subject:', cls);
            return false;
          }
          return true;
        });
        setTodayClasses(classes);
        setAllClasses(classes);
      }

      // Fetch recent feedback
      const feedbackRes = await feedbackAPI.getAll(branchFilter);
      console.log('📝 Recent feedback:', feedbackRes.data);
      setRecentFeedback(feedbackRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || t('feedback.loadError'));
      if (err.response && err.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, isAdmin, t, getBranchFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedBranch]);

  const handleOpenModal = (classSchedule, student) => {
    console.log('Opening modal with class:', classSchedule);
    console.log('Class subject field:', classSchedule.subject);
    console.log('Class subjectGroup field:', classSchedule.subjectGroup);
    console.log('Selected student:', student);
    
    setSelectedClass(classSchedule);
    setSelectedStudent(student);
    
    // Check if feedback already exists for this student/schedule
    const existingFeedback = findExistingFeedback(student._id, classSchedule._id);
    
    if (existingFeedback) {
      // Pre-fill with existing feedback data for editing
      setFormData({
        homework: existingFeedback.homework || 80,
        behavior: existingFeedback.behavior || 80,
        participation: existingFeedback.participation || 80,
        feedbackDate: new Date(existingFeedback.feedbackDate).toISOString().split('T')[0],
        notes: existingFeedback.notes || '',
        isExamDay: existingFeedback.isExamDay || false,
        examPercentage: existingFeedback.examPercentage || 0,
        _id: existingFeedback._id // Store feedback ID for updates
      });
    } else {
      // New feedback - use defaults
      setFormData({
        homework: 80,
        behavior: 80,
        participation: 80,
        feedbackDate: new Date().toISOString().split('T')[0],
        notes: '',
        isExamDay: false,
        examPercentage: 0
      });
    }
    
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClass(null);
    setSelectedStudent(null);
    setFormData({
      homework: 80,
      behavior: 80,
      participation: 80,
      feedbackDate: new Date().toISOString().split('T')[0],
      notes: '',
      isExamDay: false,
      examPercentage: 0
    });
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Selected class object:', selectedClass);
      
      // Extract subject from selectedClass with multiple fallbacks
      let subjectName = null;
      
      // Try different paths to get subject
      if (selectedClass.subject?.name) {
        subjectName = selectedClass.subject.name;
      } else if (typeof selectedClass.subject === 'string' && selectedClass.subject) {
        subjectName = selectedClass.subject;
      } else if (selectedClass.subjectGroup?.subject) {
        subjectName = selectedClass.subjectGroup.subject;
      } else if (selectedClass.subjectGroup?.groupName) {
        subjectName = selectedClass.subjectGroup.groupName;
      } else if (selectedClass.className) {
        // Last resort: use className as subject
        subjectName = selectedClass.className;
        console.warn('⚠️  Using className as subject fallback:', subjectName);
      }
      
      // Extract teacher ID
      const teacherId = selectedClass.teacher?._id || selectedClass.teacher;
      
      console.log('Extracted subject:', subjectName);
      console.log('Extracted teacher:', teacherId);
      
      if (!subjectName) {
        setError(t('feedback.subjectMissingError'));
        console.error('Class data:', selectedClass);
        return;
      }
      
      if (!teacherId) {
        setError(t('feedback.teacherMissingError'));
        console.error('Class data:', selectedClass);
        return;
      }

      const feedbackData = {
        student: selectedStudent._id,
        schedule: selectedClass._id,
        subject: subjectName,
        teacher: teacherId,
        homework: formData.isExamDay ? 0 : formData.homework,
        behavior: formData.isExamDay ? 0 : formData.behavior,
        participation: formData.isExamDay ? 0 : formData.participation,
        feedbackDate: formData.feedbackDate,
        notes: formData.notes,
        isExamDay: formData.isExamDay,
        examPercentage: formData.isExamDay ? formData.examPercentage : null
      };
      
      console.log('✅ Submitting feedback:', feedbackData);

      const successMsg = formData._id ? t('feedback.updateSuccess') : t('feedback.submitSuccess');
      
      if (formData._id) {
        // Update existing feedback
        await feedbackAPI.update(formData._id, feedbackData);
      } else {
        // Create new feedback
        await feedbackAPI.create(feedbackData);
      }

      handleCloseModal();
      fetchData();
      toast.success(successMsg);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || t('feedback.submitError'));
    }
  };

  // Find any feedback for student/schedule (regardless of date) - used for edit detection
  const findExistingFeedback = (studentId, scheduleId) => {
    return recentFeedback.find(fb => 
      fb.student?._id === studentId && 
      fb.schedule?._id === scheduleId
    );
  };

  if (loading) {
    return (
      <div className="feedback-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <div className="page-header" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', margin: 0 }}>{t('feedback.dailyFeedback')}</h1>
          <p className="subtitle" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', margin: '2px 0 0 0', opacity: 0.8 }}>{t('feedback.giveFeedbackToday')}</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={fetchData}
          style={{ 
            fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
            padding: '6px 12px',
            whiteSpace: 'nowrap'
          }}
        >
          🔄 {t('feedback.refreshClasses')}
        </button>
      </div>

      {error && !showModal && <div className="alert alert-error">{error}</div>}

      {/* Admin/Manager Filter Toolbar */}
      {isAdmin && (
        <div className="feedback-toolbar">
          <div className="view-mode-buttons">
            <button 
              className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              📋 {t('feedback.allClasses')}
            </button>
            <button 
              className={`view-btn ${viewMode === 'today' ? 'active' : ''}`}
              onClick={() => setViewMode('today')}
            >
              📅 {t('feedback.todaysClasses')}
            </button>
          </div>

          <div className="teacher-filter">
            <label htmlFor="teacher-select">👤 {t('attendance.filterByTeacher') || 'Filter by Teacher'}:</label>
            <select 
              id="teacher-select"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('attendance.allTeachers') || 'All Teachers'}</option>
              {teachers.map(teacher => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} {teacher.teacherId ? `(${teacher.teacherId})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Today's Classes Section */}
      <div className="section">
        <div className="section-header">
          <div>
            <h2>
              <AiOutlineCalendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              {viewMode === 'all' ? t('feedback.allClasses') : t('feedback.todaysClasses')}
            </h2>
            <p className="section-subtitle">
              {viewMode === 'all' 
                ? `${filteredClasses.length} ${t('feedback.classSchedulesAvailable')}`
                : new Date().toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              }
            </p>
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="alert alert-info">
            {isAdmin ? (
              <>
                <p><strong>{t('feedback.noClassSchedules')}</strong></p>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>{t('feedback.createClassSchedulesHint')}</p>
              </>
            ) : (
              <>
                <p><strong>{t('feedback.noClassesToday')}</strong></p>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>{t('feedback.classScheduleHint')}</p>
              </>
            )}
          </div>
        ) : (
          <div className="classes-grid">
            {filteredClasses.map((classSchedule) => (
              <div key={classSchedule._id} className="class-card">
                <div className="class-header">
                  <h3>{classSchedule.subject?.name || classSchedule.subject}</h3>
                  <span className="class-badge">{classSchedule.className}</span>
                </div>
                <div className="class-info">
                  {isAdmin && classSchedule.teacher && (
                    <p><strong>{t('attendance.teacher')}:</strong> {classSchedule.teacher?.name || t('common.noData')} {classSchedule.teacher?.teacherId ? `(${classSchedule.teacher.teacherId})` : ''}</p>
                  )}
                  <p><strong>{t('exams.time')}:</strong> {classSchedule.startTime} - {classSchedule.endTime}</p>
                  <p><strong>{t('exams.room')}:</strong> {classSchedule.roomNumber || t('common.noData')}</p>
                  <p><strong>{t('feedback.students')}:</strong> {classSchedule.enrolledStudents?.length || 0}</p>
                </div>

                <div className="students-list">
                  <h4>{t('feedback.giveFeedback')}:</h4>
                  {classSchedule.enrolledStudents?.length > 0 ? (
                    <div className="student-items">
                      {classSchedule.enrolledStudents.map((student) => {
                        const existingFeedback = findExistingFeedback(student._id, classSchedule._id);
                        const alreadySubmitted = !!existingFeedback;
                        return (
                          <div key={student._id} className="student-item">
                            <div className="student-info">
                              {student.profileImage ? (
                                <img 
                                  src={getImageUrl(student.profileImage)}
                                  alt={student.name}
                                  className="student-photo"
                                />
                              ) : (
                                <div className="student-photo-placeholder">
                                  {student.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <strong>{student.name}</strong>
                                <span className="student-id">{t('students.idLabel')}: {student.studentId}</span>
                              </div>
                            </div>
                            <button
                              className={`feedback-action-btn ${alreadySubmitted ? 'feedback-btn-done' : 'feedback-btn-add'}`}
                              onClick={() => handleOpenModal(classSchedule, student)}
                            >
                              {alreadySubmitted ? (
                                <>
                                  <AiOutlineEye size={14} />
                                  {t('common.edit')}
                                </>
                              ) : (
                                <>
                                  <AiOutlinePlus size={14} />
                                  {t('common.add')}
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-students">{t('feedback.noStudentsEnrolled')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Feedback Section */}
      <div className="section">
        <div className="section-header">
          <h2>{t('feedback.recentFeedback')}</h2>
          <p className="section-subtitle">{t('feedback.last20Entries')}</p>
        </div>

        {/* Feedback Statistics - Only for Manager and Founder */}
        {isAdmin && recentFeedback.length > 0 && (
          <div className="feedback-stats">
            <div className="stat-card">
              <h3><AiOutlineBook /> {t('feedback.homework')}</h3>
              <div className="stat-breakdown">
                <div className="stat-item">
                  <span className="stat-label">{t('feedback.averageScore')}:</span>
                  <span className="stat-value">
                    {Math.round(recentFeedback.reduce((sum, f) => sum + (f.homework || 0), 0) / recentFeedback.length)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineTrophy /> {t('feedback.highest')}:</span>
                  <span className="stat-value">
                    {Math.max(...recentFeedback.map(f => f.homework || 0))}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineWarning /> {t('feedback.lowest')}:</span>
                  <span className="stat-value">
                    {Math.min(...recentFeedback.map(f => f.homework || 0))}%
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <h3><AiOutlineSmile /> {t('feedback.behavior')}</h3>
              <div className="stat-breakdown">
                <div className="stat-item">
                  <span className="stat-label">{t('feedback.averageScore')}:</span>
                  <span className="stat-value">
                    {Math.round(recentFeedback.reduce((sum, f) => sum + (f.behavior || 0), 0) / recentFeedback.length)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineTrophy /> {t('feedback.highest')}:</span>
                  <span className="stat-value">
                    {Math.max(...recentFeedback.map(f => f.behavior || 0))}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineWarning /> {t('feedback.lowest')}:</span>
                  <span className="stat-value">
                    {Math.min(...recentFeedback.map(f => f.behavior || 0))}%
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <h3><AiOutlineTeam /> {t('feedback.participation')}</h3>
              <div className="stat-breakdown">
                <div className="stat-item">
                  <span className="stat-label">{t('feedback.averageScore')}:</span>
                  <span className="stat-value">
                    {Math.round(recentFeedback.reduce((sum, f) => sum + (f.participation || 0), 0) / recentFeedback.length)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineTrophy /> {t('feedback.highest')}:</span>
                  <span className="stat-value">
                    {Math.max(...recentFeedback.map(f => f.participation || 0))}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label"><AiOutlineWarning /> {t('feedback.lowest')}:</span>
                  <span className="stat-value">
                    {Math.min(...recentFeedback.map(f => f.participation || 0))}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {recentFeedback.length === 0 ? (
          <div className="alert alert-info">{t('feedback.noFeedbackYet')}</div>
        ) : (
          <div className="feedback-table-container">
            <table className="feedback-table">
              <thead>
                <tr>
                  <th>{t('payments.date')}</th>
                  <th>{t('students.student')}</th>
                  <th>{t('attendance.subject')}</th>
                  <th>{t('feedback.homework')}</th>
                  <th>{t('feedback.behavior')}</th>
                  <th>{t('feedback.participation')}</th>
                  <th>{t('feedback.examScore') || 'Exam Score'}</th>
                  <th>{t('feedback.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {recentFeedback.slice(0, 20).map((feedback) => {
                  const getScoreColor = (score) => {
                    if (score >= 80) return 'score-excellent';
                    if (score >= 60) return 'score-good';
                    if (score >= 40) return 'score-fair';
                    return 'score-poor';
                  };

                  return (
                    <tr key={feedback._id} className={feedback.isExamDay ? 'exam-day-row' : ''}>
                      <td>{new Date(feedback.feedbackDate).toLocaleDateString(t('common.locale'))}</td>
                      <td>
                        <div className="student-cell">
                          <strong>{feedback.student?.name || t('feedback.unknownStudent')}</strong>
                          <span className="student-id-small">{feedback.student?.studentId || t('common.noData')}</span>
                        </div>
                      </td>
                      <td>{feedback.schedule?.subject?.name || feedback.subject?.name || feedback.subject || t('common.noData')}</td>
                      <td>
                        {feedback.isExamDay ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <span className={`score-badge ${getScoreColor(feedback.homework || 0)}`}>
                            {feedback.homework || 0}%
                          </span>
                        )}
                      </td>
                      <td>
                        {feedback.isExamDay ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <span className={`score-badge ${getScoreColor(feedback.behavior || 0)}`}>
                            {feedback.behavior || 0}%
                          </span>
                        )}
                      </td>
                      <td>
                        {feedback.isExamDay ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <span className={`score-badge ${getScoreColor(feedback.participation || 0)}`}>
                            {feedback.participation || 0}%
                          </span>
                        )}
                      </td>
                      <td>
                        {feedback.isExamDay ? (
                          <span className={`score-badge score-excellent exam-badge`}>
                            🏆 {feedback.examPercentage}%
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="notes-cell">
                        {feedback.isExamDay && <span className="exam-label">[{t('feedback.examDay') || 'Exam'}] </span>}
                        {feedback.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData._id ? t('feedback.editFeedback') : t('feedback.addDailyFeedback')}</h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}

              <div className="feedback-info">
                <p><strong>{t('students.student')}:</strong> {selectedStudent?.name} ({selectedStudent?.studentId})</p>
                <p><strong>{t('attendance.subject')}:</strong> {
                  selectedClass?.subject?.name || 
                  selectedClass?.subject || 
                  selectedClass?.subjectGroup?.subject ||
                  selectedClass?.subjectGroup?.groupName ||
                  t('feedback.notSpecifiedSubject')
                }</p>
                <p><strong>{t('students.class')}:</strong> {selectedClass?.className}</p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Date Selection */}
                <div className="form-group">
                  <label>
                    <AiOutlineCalendar style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('feedback.feedbackDate')} *
                  </label>
                  <input
                    type="date"
                    name="feedbackDate"
                    value={formData.feedbackDate}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="form-select"
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    {t('feedback.selectClassDate')}
                  </small>
                </div>

                {/* Exam Day Toggle */}
                <div className="form-group exam-toggle-container">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isExamDay"
                      checked={formData.isExamDay}
                      onChange={(e) => setFormData({ ...formData, isExamDay: e.target.checked })}
                    />
                    <span className="checkbox-text">
                      🚀 {t('feedback.isExamDay') || 'Is this an Exam Day?'}
                    </span>
                  </label>
                </div>

                {formData.isExamDay ? (
                  <div className="form-group exam-score-input">
                    <label>
                      <AiOutlineTrophy style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {t('feedback.examPercentage') || 'Exam Score'}: {formData.examPercentage}%
                    </label>
                    <input
                      type="range"
                      name="examPercentage"
                      value={formData.examPercentage}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="1"
                      className="form-range exam-range"
                    />
                    <div className="range-labels">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <AiOutlineBook style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        {t('feedback.homework')}: {formData.homework}%
                      </label>
                      <input
                        type="range"
                        name="homework"
                        value={formData.homework}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="5"
                        className="form-range"
                      />
                      <div className="range-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        <AiOutlineSmile style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        {t('feedback.behavior')}: {formData.behavior}%
                      </label>
                      <input
                        type="range"
                        name="behavior"
                        value={formData.behavior}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="5"
                        className="form-range"
                      />
                      <div className="range-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        <AiOutlineTeam style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        {t('feedback.participation')}: {formData.participation}%
                      </label>
                      <input
                        type="range"
                        name="participation"
                        value={formData.participation}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="5"
                        className="form-range"
                      />
                      <div className="range-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>{t('feedback.additionalNotes')}</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder={t('feedback.notesPlaceholder')}
                    className="form-textarea"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('feedback.submitFeedback')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
