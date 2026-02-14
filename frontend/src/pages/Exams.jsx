import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { examsAPI, schedulerAPI } from '../utils/api';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from 'react-icons/ai';
import '../styles/Exams.css';

const Exams = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getBranchFilter } = useBranch();
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const isTeacher = user.role === 'teacher' && !['admin', 'manager', 'founder'].includes(user.role);
  const [formData, setFormData] = useState({
    examName: '',
    subject: '',
    scheduleId: '',
    class: '',
    teacher: '',
    examDate: '',
    startTime: '',
    duration: '',
    totalMarks: '',
    passingMarks: '',
    examType: 'mid-term'
  });

  const fetchExams = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const response = await examsAPI.getAll({ 
        includeArchived: showArchived,
        ...branchFilter
      });
      let examsData = response.data.data || [];
      
      // Teachers only see exams for their assigned schedules
      if (isTeacher) {
        const schedulesResponse = await schedulerAPI.getAll(branchFilter);
        const allSchedules = schedulesResponse.data.data || [];
        
        console.log('[Exams] All schedules:', allSchedules.length);
        console.log('[Exams] User ID:', user._id || user.id);
        
        const teacherSchedules = allSchedules.filter(schedule => {
          const scheduleTeacherId = schedule.teacher?._id?.toString() || schedule.teacher?.toString();
          const userId = (user._id || user.id)?.toString();
          const match = scheduleTeacherId === userId;
          console.log('[Exams] Schedule:', schedule._id, 'Teacher:', scheduleTeacherId, 'Match:', match);
          return match;
        });
        
        console.log('[Exams] Teacher schedules:', teacherSchedules.length);
        
        const teacherScheduleIds = teacherSchedules.map(s => s._id.toString());
        console.log('[Exams] Teacher schedule IDs:', teacherScheduleIds);
        
        examsData = examsData.filter(exam => {
          const examScheduleId = exam.scheduleId?.toString();
          const match = teacherScheduleIds.includes(examScheduleId);
          console.log('[Exams] Exam:', exam._id, 'ScheduleId:', examScheduleId, 'Match:', match);
          return match;
        });
        
        console.log('[Exams] Filtered exams for teacher:', examsData.length);
      }
      
      setExams(examsData);
    } catch (error) {
      console.error('Error fetching exams:', error);
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user._id, user.id, navigate, showArchived, getBranchFilter]);

  const fetchSchedules = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const response = await schedulerAPI.getAll(branchFilter);
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, [getBranchFilter]);

  useEffect(() => {
    setLoading(true);
    fetchExams();
    fetchSchedules();
  }, [fetchExams, fetchSchedules, showArchived]);

  const handleScheduleChange = (e) => {
    const scheduleId = e.target.value;
    const schedule = schedules.find(s => s._id === scheduleId);
    
    setFormData({
      ...formData,
      scheduleId: scheduleId,
      subject: schedule ? schedule.subject : '',
      class: schedule ? schedule.className : '',
      teacher: schedule && schedule.teacher ? schedule.teacher._id : ''
    });
    setSelectedSchedule(schedule);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      if (currentExam) {
        // Update existing exam
        await examsAPI.update(currentExam._id, formData);
      } else {
        // Create new exam
        await examsAPI.create(formData);
      }
      setShowAddForm(false);
      setShowEditForm(false);
      setCurrentExam(null);
      setFormData({
        examName: '',
        subject: '',
        scheduleId: '',
        class: '',
        teacher: '',
        examDate: '',
        startTime: '',
        duration: '',
        totalMarks: '',
        passingMarks: '',
        examType: 'mid-term'
      });
      setSelectedSchedule(null);
      fetchExams();
    } catch (error) {
      console.error('Error saving exam:', error);
      const errorMsg = error.response?.data?.message || error.message || t('exams.saveError');
      setError(errorMsg);
      alert(t('common.error') + ': ' + errorMsg); // Show alert for immediate feedback
      // Handle 401 Unauthorized error by redirecting to login
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const handleEdit = (exam) => {
    setCurrentExam(exam);
    const schedule = schedules.find(s => s._id === exam.scheduleId);
    setSelectedSchedule(schedule);
    setFormData({
      examName: exam.examName,
      subject: exam.subject,
      scheduleId: exam.scheduleId || '',
      class: exam.class || '',
      teacher: exam.teacher?._id || exam.teacher || '',
      examDate: exam.examDate.split('T')[0],
      startTime: exam.startTime,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      examType: exam.examType
    });
    setShowEditForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await examsAPI.delete(id);
        fetchExams();
      } catch (error) {
        console.error('Error deleting exam:', error);
        // Handle 401 Unauthorized error by redirecting to login
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    }
  };

  const handleEnrollStudents = async (examId) => {
    try {
      const response = await examsAPI.enrollStudents(examId);
      alert(response.data.message);
      fetchExams();
    } catch (error) {
      console.error('Error enrolling students:', error);
      // Handle 401 Unauthorized error by redirecting to login
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  return (
    <div className="exams-page-container">
      {/* Page Header */}
      <header className="exams-page-header">
        <div className="exams-page-header-content">
          <div className="exams-page-title-section">
            <h1 className="exams-page-title">{t('exams.title')}</h1>
            <p className="exams-page-subtitle">{t('exams.manageExams')}</p>
          </div>
          <div className="exams-page-actions">
            <button 
              className={`btn ${showArchived ? 'btn-success' : 'btn-success'}`} 
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? '📋 ' + t('exams.showActive') : '📦 ' + t('exams.showArchived')}
            </button>
            {!isTeacher && (
              <button 
                className="btn btn-primary" 
                onClick={() => setShowAddForm(true)}
              >
                <AiOutlinePlus size={16} />
                {t('exams.addNewExam')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content Section */}
      <section className="exams-content-section">
        {loading ? (
          <div className="exams-loading-state">
            <div className="students__spinner"></div>
            <p className="exams-loading-text">{t('exams.loadingExams')}</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="exams-empty-state">
            <div className="exams-empty-state-content">
              <div className="exams-empty-icon">📝</div>
              <h3 className="exams-empty-title">{t('exams.noExamsFound')}</h3>
              <p className="exams-empty-description">{t('exams.startByCreating')}</p>
              {!isTeacher && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowAddForm(true)}
                >
                  <AiOutlinePlus size={16} />
                  {t('exams.addNewExam')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="exams-table-card">
            <div className="exams-table-wrapper">
              <table className="exams-table">
                <thead>
                  <tr>
                    <th>{t('exams.examName')}</th>
                    <th>{t('attendance.subject')}</th>
                    <th>{t('payments.date')}</th>
                    <th>{t('exams.time')}</th>
                    <th>{t('exams.totalMarks')}</th>
                    <th>{t('exams.studentsEnrolled')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam._id}>
                      <td className="exams-table-exam-name">{exam.examName}</td>
                      <td>{exam.subject}</td>
                      <td>{new Date(exam.examDate).toLocaleDateString(t('common.locale'))}</td>
                      <td>{exam.startTime}</td>
                      <td className="exams-table-marks">{exam.totalMarks}</td>
                      <td className="exams-table-center">{exam.results ? exam.results.length : 0}</td>
                      <td>
                        <div className="exams-table-actions">
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/exams/${exam._id}/results`)}
                          >
                          {t('exams.viewResults')}
                          </button>
                          {!isTeacher && (
                            <>
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEdit(exam)}
                              >
                                <AiOutlineEdit size={14} />
                                {t('common.edit')}
                              </button>
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => handleEnrollStudents(exam._id)}
                              >
                                {t('exams.enroll')}
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(exam._id)}
                              >
                                <AiOutlineDelete size={14} />
                                {t('common.delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Add/Edit Exam Modal */}
      {(showAddForm || showEditForm) && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowAddForm(false);
            setShowEditForm(false);
            setCurrentExam(null);
            setSelectedSchedule(null);
            setError('');
            setFormData({
              examName: '',
              subject: '',
              scheduleId: '',
              class: '',
              teacher: '',
              examDate: '',
              startTime: '',
              duration: '',
              totalMarks: '',
              passingMarks: '',
              examType: 'mid-term'
            });
          }}
        >
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '25px', fontSize: '1.5rem', fontWeight: '600' }}>
              {showAddForm ? <><AiOutlinePlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('exams.addNewExam')}</> : <><AiOutlineEdit size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('exams.editExam')}</>}
            </h2>
            
            {error && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '20px', 
                backgroundColor: '#fee', 
                border: '1px solid #fcc', 
                borderRadius: '6px',
                color: '#c33'
              }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.examName')} *</label>
                <input
                  type="text"
                  name="examName"
                  value={formData.examName}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('attendance.subject')} *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.selectSchedule')} *</label>
                <select
                  name="scheduleId"
                  value={formData.scheduleId}
                  onChange={handleScheduleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">{t('exams.selectSchedulePlaceholder')}</option>
                  {schedules.map(schedule => {
                    const timing = schedule.startTime && schedule.endTime ? `${schedule.startTime}-${schedule.endTime}` : t('timetable.noSchedules');
                    const days = schedule.scheduledDays && schedule.scheduledDays.length > 0 ? schedule.scheduledDays.join(', ') : t('exams.notSet');
                    const room = schedule.roomNumber ? `${t('exams.room')} ${schedule.roomNumber}` : t('exams.notSet');
                    const teacher = schedule.teacher ? schedule.teacher.name : t('exams.notAssigned');
                    const groupId = schedule.subjectGroup ? schedule.subjectGroup.groupId : t('exams.notAssigned');
                    const subject = schedule.subject || t('exams.notSet');
                    return (
                      <option key={schedule._id} value={schedule._id}>
                        {groupId} | {subject} ({schedule.className}) | {teacher} | {timing} | {days} | {room}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {selectedSchedule && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#333' }}>{t('exams.scheduleInfo')}</h4>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('exams.groupId')}:</strong> {selectedSchedule.subjectGroup ? selectedSchedule.subjectGroup.groupId : t('exams.notAssigned')}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('attendance.subject')}:</strong> {selectedSchedule.subject}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('exams.level')}:</strong> {selectedSchedule.className}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('attendance.teacher')}:</strong> {selectedSchedule.teacher ? selectedSchedule.teacher.name : t('exams.notAssigned')}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('attendance.classTime')}:</strong> {selectedSchedule.startTime && selectedSchedule.endTime ? `${selectedSchedule.startTime} - ${selectedSchedule.endTime}` : t('exams.notSet')}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('exams.days')}:</strong> {selectedSchedule.scheduledDays && selectedSchedule.scheduledDays.length > 0 ? selectedSchedule.scheduledDays.join(', ') : t('exams.notSet')}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>
                    <strong>{t('exams.roomNumber')}:</strong> {selectedSchedule.roomNumber || t('exams.notSet')}
                  </p>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.examDate')} *</label>
                  <input
                    type="date"
                    name="examDate"
                    value={formData.examDate}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.startTime')} *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.duration')} *</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.totalMarks')} *</label>
                  <input
                    type="number"
                    name="totalMarks"
                    value={formData.totalMarks}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.passingMarks')} *</label>
                  <input
                    type="number"
                    name="passingMarks"
                    value={formData.passingMarks}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('exams.examType')}</label>
                  <select
                    name="examType"
                    value={formData.examType}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="mid-term">{t('exams.midTerm')}</option>
                    <option value="final">{t('exams.final')}</option>
                    <option value="quiz">{t('exams.quiz')}</option>
                    <option value="assignment">{t('exams.assignment')}</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    setCurrentExam(null);
                    setSelectedSchedule(null);
                    setError('');
                    setFormData({
                      examName: '',
                      subject: '',
                      scheduleId: '',
                      class: '',
                      teacher: '',
                      examDate: '',
                      startTime: '',
                      duration: '',
                      totalMarks: '',
                      passingMarks: '',
                      examType: 'mid-term'
                    });
                  }}
                  style={{ padding: '10px 24px' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {showAddForm ? t('exams.addExamBtn') : t('exams.updateExamBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;