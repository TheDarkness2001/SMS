import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsAPI, feedbackAPI, paymentsAPI, getImageUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineEye } from 'react-icons/ai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/ViewStudent.css';

const ViewStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [student, setStudent] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const [feedbackFilter, setFeedbackFilter] = useState({
    search: '',
    subject: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Function to view as student
  const handleViewAsStudent = () => {
    // Store the current staff user in sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    sessionStorage.setItem('staffUser', JSON.stringify(currentUser));
    
    // Create a student user object with necessary info
    const studentUser = {
      id: student._id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      role: 'student',
      userType: 'student'
    };
    
    // Update sessionStorage with student user
    sessionStorage.setItem('user', JSON.stringify(studentUser));
    
    // Navigate to student dashboard
    navigate('/student/dashboard');
    
    // Force reload to update layout
    window.location.href = '/student/dashboard';
  };

  // Check if current user is a parent trying to access their own child's profile
  const checkParentAccess = useCallback(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    console.log('Checking parent access. User:', user, 'Requested ID:', id);
    
    // Validate that ID is a proper MongoDB ObjectId format
    if (!id || id === 'add' || id.length !== 24) {
      console.log('Invalid student ID format');
      return false;
    }
    
    if (user.userType === 'parent') {
      // Parents can only access their own child's profile
      if (user.id !== id) {
        console.log('Parent trying to access unauthorized student profile');
        return false;
      }
      // Parent accessing their own child's profile - this is allowed
      console.log('Parent accessing their own child profile - access granted');
      return true;
    }
    // Non-parents can access any profile (permissions will be checked on backend)
    console.log('Non-parent user accessing profile - access granted');
    return true;
  }, [id]);

  const fetchStudentData = useCallback(async () => {
    console.log('Fetching student data for ID:', id);
    try {
      const [studentRes, feedbackRes, paymentsRes] = await Promise.all([
        studentsAPI.getOne(id),
        feedbackAPI.getByStudent(id),
        paymentsAPI.getByStudent(id)
      ]);

      console.log('Student data fetched successfully');
      setStudent(studentRes.data.data);
      setFeedback(feedbackRes.data.data);
      setPayments(paymentsRes.data.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
      // Redirect to students list if student not found or other error
      navigate('/students');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    console.log('ViewStudent component mounted/updated with ID:', id);
    
    // Check parent access before fetching data
    if (!checkParentAccess()) {
      console.log('Parent access denied, redirecting to students list');
      navigate('/students');
      return;
    }
    
    console.log('Fetching student data for ID:', id);
    // Reset loading state when ID changes
    setLoading(true);
    fetchStudentData();
  }, [id, navigate, checkParentAccess, fetchStudentData]);

  if (loading) {
    return (
      <div className="view-student-container">
        <div className="view-student__loading">{t('students.loadingStudentInfo')}</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="view-student-container">
        <div className="alert alert-error">{t('students.studentNotFound')}</div>
        <button onClick={() => navigate('/students')} className="btn btn-primary">
          {t('students.backToStudents')}
        </button>
      </div>
    );
  }

  const uniqueSubjects = [...new Set(feedback.map(f => f.subject || f.course).filter(Boolean))];
  
  const filteredFeedback = feedback.filter(item => {
    const itemDate = new Date(item.feedbackDate || item.date);
    const itemMonth = itemDate.getMonth() + 1;
    const itemYear = itemDate.getFullYear();
    
    const matchesSearch = feedbackFilter.search === '' || 
      (item.subject || item.course || '').toLowerCase().includes(feedbackFilter.search.toLowerCase()) ||
      (item.teacher?.name || '').toLowerCase().includes(feedbackFilter.search.toLowerCase());
    
    const matchesSubject = feedbackFilter.subject === 'all' || 
      (item.subject || item.course) === feedbackFilter.subject;
    
    const matchesMonth = itemMonth === feedbackFilter.month;
    const matchesYear = itemYear === feedbackFilter.year;
    
    return matchesSearch && matchesSubject && matchesMonth && matchesYear;
  });

  return (
    <div className={`view-student-container ${user.userType === 'parent' ? 'parent-view' : ''}`}>
      <div className="student-header">
        <div className="student-basic-info">
          {student.profileImage ? (
            <img 
              src={getImageUrl(student.profileImage)}
              alt={student.name} 
              className="student-photo"
            />
          ) : (
            <div className="student-photo" style={{
              background: 'linear-gradient(135deg, var(--blue) 0%, var(--indigo) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '42px',
              fontWeight: 'bold',
              borderRadius: '25px'
            }}>
              {student.name.charAt(0)}
            </div>
          )}
          <div className="student-text-info">
            <h1>{student.name}</h1>
            <p className="student-id">{t('students.studentId')}: {student.studentId}</p>
            <span className={`badge badge-${student.status === 'active' ? 'success' : student.status === 'inactive' ? 'warning' : 'info'}`}>
              {t(`common.${student.status}`) || student.status}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <button 
            onClick={handleViewAsStudent}
            className="btn btn-success"
            style={{ marginRight: '10px' }}
          >
            <AiOutlineEye size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {t('students.viewAsStudent')}
          </button>
          
          <button onClick={() => navigate('/students')} className="btn btn-secondary">
            ← {t('students.backToStudents')}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{t('common.subjects')}</h3>
          <p>{student.subjects ? student.subjects.length : 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>{t('students.paymentHistory')}</h3>
          <p>{payments.length} {t('common.total')}</p>
        </div>
        
        <div className="stat-card">
          <h3>{t('students.dailyFeedback')}</h3>
          <p>{feedback.length} {t('common.total')}</p>
        </div>
      </div>

      <div className="card">
        <h2>📋 {t('students.studentInformation')}</h2>
        
        <div className="student-info-container">
          {/* Student Information Section */}
          <div className="info-section">
            <h3 className="section-title">{t('students.studentInformation')}</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{t('students.studentId')}</span>
                <span className="info-value">#{student.studentId}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('common.status')}</span>
                <span className="info-value">
                  <span className={`badge badge-${student.status === 'active' ? 'success' : student.status === 'inactive' ? 'warning' : 'info'}`}>
                    {t(`common.${student.status}`) || student.status}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="info-section">
            <h3 className="section-title">{t('students.contactDetails')}</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{t('students.email')}</span>
                <span className="info-value">{student.email || t('students.notProvided')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.phone')}</span>
                <span className="info-value">{student.phone || t('students.notProvided')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.address')}</span>
                <span className="info-value">{student.address || t('students.notProvided')}</span>
              </div>
            </div>
          </div>

          {/* Academic Details Section */}
          <div className="info-section">
            <h3 className="section-title">{t('students.academicDetails')}</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{t('students.class')}</span>
                <span className="info-value">{student.class} {student.section || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('common.subjects')}</span>
                <span className="info-value">
                  {student.subjects && student.subjects.length > 0 
                    ? student.subjects.join(', ') 
                    : t('students.notProvided')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Settings Section */}
          <div className="info-section">
            <h3 className="section-title">{t('payments.title')} {t('common.subjects')}</h3>
            <div className="info-grid">
              {(student.subjectPayments && student.subjectPayments.length > 0) ? (
                student.subjectPayments.map((ps, idx) => (
                  <div className="info-row" key={idx}>
                    <span className="info-label">{ps.subject}</span>
                    <span className="info-value" style={{ fontWeight: '600', color: 'var(--blue)' }}>
                      {language === 'en' ? t('common.currencySymbol') : ''}{ps.amount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''} / {t('attendance.month')}
                    </span>
                  </div>
                ))
              ) : (student.paymentSubjects && student.paymentSubjects.length > 0) ? (
                student.paymentSubjects.map((ps, idx) => (
                  <div className="info-row" key={idx}>
                    <span className="info-label">{ps.subject}</span>
                    <span className="info-value" style={{ fontWeight: '600', color: 'var(--blue)' }}>
                      {language === 'en' ? t('common.currencySymbol') : ''}{ps.amount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''} / {t('attendance.month')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="info-row">
                  <span className="info-value">{t('students.notProvided')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="info-section">
            <h3 className="section-title">{t('students.studentInformation')}</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{t('students.dateOfBirth')}</span>
                <span className="info-value">
                  {student.dateOfBirth 
                    ? new Date(student.dateOfBirth).toLocaleDateString(t('common.locale') || 'en-US') 
                    : t('students.notProvided')}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.gender')}</span>
                <span className="info-value">{t(`students.${student.gender}`) || student.gender}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.bloodGroup')}</span>
                <span className="info-value">{student.bloodGroup || t('students.notProvided')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.medicalConditions')}</span>
                <span className="info-value">{student.medicalConditions || t('students.notProvided')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>👨‍👩‍👧‍👦 {t('students.parentInfo')}</h2>
        
        <div className="student-info-container">
          <div className="info-section">
            <h3 className="section-title">{t('students.parentInfo')}</h3>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{t('students.parentName')}</span>
                <span className="info-value">{student.parentName || t('students.notProvided')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.email')}</span>
                <span className="info-value">{student.parentEmail || t('students.notProvided')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('students.parentPhone')}</span>
                <span className="info-value">{student.parentPhone || t('students.notProvided')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>💬 {t('students.dailyFeedback')}</h2>
        {feedback.length > 0 ? (
          <>
            <div className="feedback-filters">
              <div className="filter-item">
                <label className="filter-label">{t('common.search')}</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder={t('common.nameOrId')}
                  value={feedbackFilter.search}
                  onChange={(e) => setFeedbackFilter(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div className="filter-item">
                <label className="filter-label">{t('common.subjects')}</label>
                <select
                  className="filter-select"
                  value={feedbackFilter.subject}
                  onChange={(e) => setFeedbackFilter(prev => ({ ...prev, subject: e.target.value }))}
                >
                  <option value="all">{t('attendance.allSubjects')}</option>
                  {uniqueSubjects.map((subject, idx) => (
                    <option key={idx} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">{t('common.month')}</label>
                <select
                  className="filter-select"
                  value={feedbackFilter.month}
                  onChange={(e) => setFeedbackFilter(prev => ({ ...prev, month: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month}>
                      {new Date(2020, month - 1, 1).toLocaleString('default', { month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">{t('common.year')}</label>
                <select
                  className="filter-select"
                  value={feedbackFilter.year}
                  onChange={(e) => setFeedbackFilter(prev => ({ ...prev, year: Number(e.target.value) }))}
                >
                  {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
                <button 
                  className="filter-reset-btn" 
                  onClick={() => setFeedbackFilter({ search: '', subject: 'all', month: new Date().getMonth() + 1, year: new Date().getFullYear() })}
                >
                  {t('common.reset')}
                </button>
              </div>
            </div>

            {/* Feedback Trend Chart */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--text-secondary)' }}>{t('students.overallFeedback')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredFeedback.slice().reverse().map(item => ({
                  date: new Date(item.feedbackDate || item.date).toLocaleDateString(t('common.locale') || 'en-US', { month: 'short', day: 'numeric' }),
                  [t('feedback.homework')]: item.homework || 0,
                  [t('feedback.behavior')]: item.behavior || 0,
                  [t('feedback.participation')]: item.participation || 0
                }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" style={{ fontSize: '12px' }} />
                  <YAxis domain={[0, 100]} stroke="#666" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Line type="monotone" dataKey={t('feedback.homework')} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey={t('feedback.behavior')} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey={t('feedback.participation')} stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Feedback List */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', marginTop: '30px', color: 'var(--text-secondary)' }}>
              {filteredFeedback.length} {t('students.overallFeedback')}
            </h3>
            <div className="feedback-list">
            {filteredFeedback.length === 0 ? (
              <div className="no-data">{t('students.noFeedback')}</div>
            ) : (
              filteredFeedback.map((item) => (
              <div key={item._id} className="feedback-item">
                <div className="feedback-header">
                  <div className="feedback-course">
                    <h3>{item.subject || item.course}</h3>
                    <p>{t('students.teacher')}: {item.teacher?.name || t('common.noData')}</p>
                  </div>
                  <div className="feedback-date">
                    {new Date(item.feedbackDate || item.date).toLocaleDateString(t('common.locale') || 'en-US')}
                  </div>
                </div>
                
                <div className="feedback-details">
                  <div className="detail-row">
                    <span className="detail-label">📚 {t('feedback.homework')}</span>
                    <span className="detail-value">{item.homework || 0}%</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">📚 {t('feedback.behavior')}</span>
                    <span className="detail-value">{item.behavior || 0}%</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">📚 {t('feedback.participation')}</span>
                    <span className="detail-value">{item.participation || 0}%</span>
                  </div>
                  
                  {item.notes && (
                    <div className="detail-row">
                      <span className="detail-label">{t('students.comments')}</span>
                      <span className="detail-value">{item.notes}</span>
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
            </div>
          </>
        ) : (
          <p className="no-data">{t('students.noFeedback')}</p>
        )}
      </div>

      <div className="card">
        <h2>💳 {t('students.paymentHistory')}</h2>
        {payments.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('attendance.month')}</th>
                  <th>{t('common.subjects')}</th>
                  <th>{t('attendance.amount')}</th>
                  <th>{t('attendance.paymentStatus')}</th>
                  <th>{t('attendance.dueDate')}</th>
                  <th>{t('attendance.paidDate')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{new Date(payment.month).toLocaleDateString(t('common.locale') || 'en-US', { year: 'numeric', month: 'long' })}</td>
                    <td>{payment.subject}</td>
                    <td>{language === 'en' ? t('common.currencySymbol') : ''}{payment.amount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}</td>
                    <td>
                      <span className={`badge badge-${payment.status === 'paid' ? 'success' : payment.status === 'partial' ? 'warning' : 'danger'}`}>
                        {t(`common.${payment.status}`) || payment.status}
                      </span>
                    </td>
                    <td>{new Date(payment.dueDate).toLocaleDateString(t('common.locale') || 'en-US')}</td>
                    <td>{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString(t('common.locale') || 'en-US') : t('common.noData')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">{t('students.noPayments')}</p>
        )}
      </div>
    </div>
  );
};

export default ViewStudent;