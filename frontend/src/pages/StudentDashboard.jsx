import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsAPI, studentAttendanceAPI, examsAPI, paymentsAPI, feedbackAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import {
  AiOutlineCheckCircle,
  AiOutlineFileText,
  AiOutlineDollar,
  AiOutlineWarning,
  AiOutlineTrophy
} from 'react-icons/ai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ParentNotificationModal from '../components/ParentNotificationModal';
import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    totalPresent: 0,
    totalAbsent: 0,
    upcomingExams: 0,
    pendingPayments: 0
  });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [feedbackRecords, setFeedbackRecords] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('[StudentDashboard] Fetching data for user:', user.id);
      
      // Fetch student details and update sessionStorage with fresh data
      const studentRes = await studentsAPI.getOne(user.id);
      const freshStudentData = studentRes.data.data;
      setStudentData(freshStudentData);
      
      console.log('[StudentDashboard] Student data:', freshStudentData);
      
      // Update sessionStorage with fresh profileImage
      if (freshStudentData.profileImage) {
        const updatedUser = { ...user, profileImage: freshStudentData.profileImage };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Fetch attendance data
      const attendanceRes = await studentAttendanceAPI.getByStudent(user.id);
      const attRecs = attendanceRes.data.data || [];
      setAttendanceRecords(attRecs);
      
      console.log('[StudentDashboard] Attendance records:', attRecs.length);
      
      const present = attRecs.filter(r => r.status === 'present').length;
      const total = attRecs.length;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

      // Fetch exams
      const examsRes = await examsAPI.getStudentExams(user.id);
      const allExams = examsRes.data.data || [];
      const upcomingExams = allExams.filter(exam => 
        exam.status === 'scheduled' && new Date(exam.examDate) > new Date()
      ).length;
      
      console.log('[StudentDashboard] Total exams:', allExams.length, 'Upcoming:', upcomingExams);

      // Fetch payments with refresh
      const paymentsRes = await paymentsAPI.getByStudent(user.id);
      const allPayments = paymentsRes.data.data || [];
      
      const paidPaymentsList = allPayments.filter(p => p.status === 'paid');
      const pendingPaymentsList = allPayments.filter(p => 
        p.status === 'pending' || p.status === 'overdue'
      );
      
      const totalPaidAmount = paidPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPendingAmount = pendingPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      console.log('[StudentDashboard] Total payments:', allPayments.length, 'Paid:', paidPaymentsList.length, 'Pending:', pendingPaymentsList.length);
      console.log('[StudentDashboard] Total paid amount:', totalPaidAmount, 'Pending amount:', totalPendingAmount);

      setStats({
        attendancePercentage: percentage,
        totalPresent: present,
        totalAbsent: total - present,
        upcomingExams,
        totalPaidAmount,
        totalPendingAmount,
        paidCount: paidPaymentsList.length,
        pendingCount: pendingPaymentsList.length
      });
      
      // Fetch feedback data
      const feedbackRes = await feedbackAPI.getByStudent(user.id || user._id);
      const feedbacks = feedbackRes.data.data || [];
      setFeedbackRecords(feedbacks);
      
      console.log('[StudentDashboard] Feedback records:', feedbacks.length);
      console.log('[StudentDashboard] Final stats:', {
        attendancePercentage: percentage,
        totalPresent: present,
        totalAbsent: total - present,
        upcomingExams,
        pendingPayments
      });
      
    } catch (error) {
      console.error('[StudentDashboard] Error fetching dashboard data:', error);
      console.error('[StudentDashboard] Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calculate subject-specific charts (current month - day 1 to day 30/31)
  const subjectCharts = useMemo(() => {
    // Get unique subjects from feedback records
    const subjects = [...new Set(feedbackRecords.map(f => {
      const subjectName = f.subject?.name || f.subject;
      return typeof subjectName === 'string' ? subjectName : null;
    }).filter(Boolean))];
    
    return subjects.map(subject => {
      const days = [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Get the last day of the current month
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Loop through all days of the current month
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);
        
        const dateStr = date.toLocaleDateString(t('common.locale'), { month: 'short', day: 'numeric' });
        
        // Find attendance for this day
        const dayAttendance = attendanceRecords.find(r => {
          const recordDate = new Date(r.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === date.getTime() && r.subject === subject;
        });
        
        const attendanceScore = dayAttendance ? 
          (dayAttendance.status === 'present' ? 100 : dayAttendance.status === 'late' ? 70 : 0) : 0;
        
        // Find feedback for this day and subject
        const dayFeedback = feedbackRecords.find(f => {
          const feedbackDate = new Date(f.feedbackDate);
          feedbackDate.setHours(0, 0, 0, 0);
          const subjectName = f.subject?.name || f.subject;
          return feedbackDate.getTime() === date.getTime() && subjectName === subject;
        });
        
        days.push({
          date: dateStr,
          attendance: attendanceScore,
          homework: dayFeedback ? dayFeedback.homework : 0,
          behavior: dayFeedback ? dayFeedback.behavior : 0,
          participation: dayFeedback ? dayFeedback.participation : 0
        });
      }
      
      return {
        subject,
        data: days
      };
    });
  }, [attendanceRecords, feedbackRecords, t]);

  // Calculate yearly data (current year by month)
  const yearlyData = useMemo(() => {
    const months = [];
    const currentYear = new Date().getFullYear();
    
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      const monthName = date.toLocaleDateString(t('common.locale'), { month: 'short' });
      
      // Attendance for this month
      const monthRecords = attendanceRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() === month && 
               recordDate.getFullYear() === currentYear;
      });
      
      const presentCount = monthRecords.filter(r => r.status === 'present').length;
      const attendanceRate = monthRecords.length > 0 
        ? Math.round((presentCount / monthRecords.length) * 100) 
        : 0;
      
      // Feedback for this month
      const monthFeedback = feedbackRecords.filter(f => {
        const feedbackDate = new Date(f.feedbackDate);
        return feedbackDate.getMonth() === month && 
               feedbackDate.getFullYear() === currentYear;
      });
      
      const avgHomework = monthFeedback.length > 0
        ? Math.round(monthFeedback.reduce((sum, f) => sum + f.homework, 0) / monthFeedback.length)
        : 0;
      
      const avgBehavior = monthFeedback.length > 0
        ? Math.round(monthFeedback.reduce((sum, f) => sum + f.behavior, 0) / monthFeedback.length)
        : 0;
      
      const avgParticipation = monthFeedback.length > 0
        ? Math.round(monthFeedback.reduce((sum, f) => sum + f.participation, 0) / monthFeedback.length)
        : 0;
      
      months.push({
        month: monthName,
        attendance: attendanceRate,
        homework: avgHomework,
        behavior: avgBehavior,
        participation: avgParticipation
      });
    }
    
    return months;
  }, [attendanceRecords, feedbackRecords, t]);

  useEffect(() => {
    fetchDashboardData();

    // Check if we should show the notification modal (once per student/parent)
    const alreadyAsked = sessionStorage.getItem(`push_notif_asked_${user.id || user._id}`);
    if (!alreadyAsked && (user.userType === 'parent' || user.userType === 'student')) {
      // Delay it slightly for better UX
      const timer = setTimeout(() => {
        setShowNotificationModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fetchDashboardData, user.id, user._id, user.userType]);

  if (loading) {
    return (
      <div className="student-page">
        <div className="loading-spinner">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* Parent Notification Opt-in Modal */}
      {showNotificationModal && (
        <ParentNotificationModal 
          studentId={user.id || user._id} 
          onComplete={() => setShowNotificationModal(false)} 
        />
      )}

      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <h1 className="welcome-title">{t('dashboard.welcome')}, {user.name}!</h1>
        <p className="welcome-subtitle">{t('dashboard.studentId')} {user.studentId}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Attendance Card */}
        <div className="stat-card sd-attendance-card">
          <div className="stat-icon">
            <AiOutlineCheckCircle size={32} />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">{t('dashboard.attendance')}</h3>
            <div className="stat-value">{stats.attendancePercentage}%</div>
            <div className="stat-details">
              <span className="stat-detail-item present">
                {stats.totalPresent} {t('dashboard.present')}
              </span>
              <span className="stat-detail-item absent">
                {stats.totalAbsent} {t('dashboard.absent')}
              </span>
            </div>
            <button 
              className="stat-action-btn"
              onClick={() => navigate('/student/attendance')}
            >
              {t('dashboard.viewDetails')}
            </button>
          </div>
        </div>

        {/* Exams Card */}
        <div className="stat-card sd-exams-card">
          <div className="stat-icon">
            <AiOutlineFileText size={32} />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">{t('dashboard.upcomingExams')}</h3>
            <div className="stat-value">{stats.upcomingExams}</div>
            <p className="stat-description">
              {stats.upcomingExams > 0 
                ? t('dashboard.upcomingExamsScheduled')
                : t('dashboard.noUpcomingExams')}
            </p>
            <button 
              className="stat-action-btn"
              onClick={() => navigate('/student/exams')}
            >
              {t('dashboard.viewExams')}
            </button>
          </div>
        </div>

        {/* Payments Card */}
        <div className="stat-card sd-payments-card">
          <div className="stat-icon">
            <AiOutlineDollar size={32} />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">{t('dashboard.payments')}</h3>
            <div className="stat-value" style={{ fontSize: '20px' }}>
              {stats.totalPaidAmount > 0 ? `${stats.totalPaidAmount.toLocaleString()} UZS` : '0 UZS'}
            </div>
            {stats.totalPendingAmount > 0 && (
              <div className="stat-subvalue" style={{ fontSize: '14px', color: '#ef4444', fontWeight: '600', marginTop: '4px' }}>
                {stats.totalPendingAmount.toLocaleString()} UZS {t('dashboard.pending')}
              </div>
            )}
            <p className="stat-description">
              {stats.totalPendingAmount > 0 
                ? `${stats.pendingCount} ${t('dashboard.pendingPayments')}`
                : t('dashboard.allPaymentsUpToDate')}
            </p>
            <button 
              className="stat-action-btn"
              onClick={() => navigate('/student/payments')}
            >
              {t('dashboard.viewPayments')}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {stats.pendingPayments > 0 && (
        <div className="dashboard-alerts">
          <div className="alert alert-warning">
            <AiOutlineWarning size={20} />
            <div className="alert-content">
              <strong>{t('dashboard.paymentRequired')}</strong> {stats.pendingPayments} {t('dashboard.pendingPaymentNotice')}
            </div>
          </div>
        </div>
      )}

      {/* Student Info Section */}
      <div className="student-info-section">
        <h2 className="section-title">{t('dashboard.yourInformation')}</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">{t('dashboard.fullName')}</span>
            <span className="info-value">{studentData?.name || t('common.noData')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('dashboard.email')}</span>
            <span className="info-value">{studentData?.email || t('common.noData')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('dashboard.phone')}</span>
            <span className="info-value">{studentData?.phone || t('common.noData')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('dashboard.gender')}</span>
            <span className="info-value">{studentData?.gender || t('common.noData')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('dashboard.dateOfBirth')}</span>
            <span className="info-value">
              {studentData?.dateOfBirth 
                ? new Date(studentData.dateOfBirth).toLocaleDateString(t('common.locale')) 
                : t('common.noData')}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('dashboard.status')}</span>
            <span className={`status-badge ${studentData?.status}`}>
              {studentData?.status ? t(`common.${studentData.status}`) : t('common.noData')}
            </span>
          </div>
        </div>
      </div>

      {/* Subject-Specific Performance Charts */}
      {subjectCharts.length > 0 && (
        <div className="subject-charts-section">
          <div className="section-header">
            <h2 className="section-title">{t('dashboard.monthlyPerformance')}</h2>
            <p className="section-subtitle">
              {new Date().toLocaleDateString(t('common.locale'), { month: 'long', year: 'numeric' })} 
              {' '}({t('common.day')} 1 - {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()})
            </p>
          </div>
          
          <div className="subject-charts-grid">
            {subjectCharts.map((subjectData, index) => (
              <div key={index} className="subject-chart-card">
                <h3 className="subject-chart-title">{subjectData.subject}</h3>
                <div className="subject-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={subjectData.data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '10px' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => `${value}%`}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="line"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                        name={t('dashboard.attendance')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="homework" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                        name={t('feedback.homework')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="behavior" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                        name={t('feedback.behavior')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="participation" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 3 }}
                        name={t('feedback.participation')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Charts Section */}
      <div className="charts-section">
        {/* Yearly Progress (Current Year) */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrapper">
              <AiOutlineTrophy size={24} color="#f59e0b" />
              <h2 className="chart-title">{t('dashboard.yearlyOverview')}</h2>
            </div>
            <p className="chart-subtitle">{new Date().getFullYear()} {t('dashboard.fullYear')}</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                  name={t('dashboard.attendance')}
                />
                <Line 
                  type="monotone" 
                  dataKey="homework" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name={t('feedback.homework')}
                />
                <Line 
                  type="monotone" 
                  dataKey="behavior" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  dot={{ fill: '#f59e0b', r: 5 }}
                  activeDot={{ r: 7 }}
                  name={t('feedback.behavior')}
                />
                <Line 
                  type="monotone" 
                  dataKey="participation" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name={t('feedback.participation')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
