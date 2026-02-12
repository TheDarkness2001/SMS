import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { studentsAPI, teachersAPI, paymentsAPI, examGroupsAPI, schedulerAPI } from '../utils/api';
import { 
  AiOutlineUser, 
  AiOutlineTeam, 
  AiOutlineDollar, 
  AiOutlineCheckCircle,
  AiOutlineCreditCard,
  AiOutlineFileText,
  AiOutlineMessage,
  AiOutlineCalendar,
  AiOutlineBarChart,
  AiOutlineSetting,
  AiOutlineAppstore
} from 'react-icons/ai';
import { IoSchoolOutline } from 'react-icons/io5';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    groups: 0,
    unpaidStudents: 0,
    paidStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  
  // Redirect students to their dedicated dashboard
  useEffect(() => {
    if (user.userType === 'student') {
      navigate('/student/dashboard');
    }
  }, [user.userType, navigate]);
  
  const isTeacher = (user.role || '').toLowerCase() === 'teacher' && !['admin', 'manager', 'founder'].includes((user.role || '').toLowerCase());
  const isAdmin = ['admin', 'manager', 'founder'].includes((user.role || '').toLowerCase());

  const fetchDashboardStats = useCallback(async () => {
    try {
      const isTeacherRole = user.role === 'teacher' && !['admin', 'manager', 'founder'].includes(user.role);
      const branchFilter = getBranchFilter();
      console.log('[Dashboard] Fetching stats with filter:', branchFilter);
      console.log('[Dashboard] User role:', user.role, 'isTeacherRole:', isTeacherRole);
      
      if (isTeacherRole) {
        // Teachers see their own groups and students
        console.log('[Dashboard] Fetching teacher-specific stats');
        
        // Fetch BOTH exam groups AND schedules (like StudentAttendance does)
        const [groupsRes, schedulesRes] = await Promise.all([
          examGroupsAPI.getAll(branchFilter),
          schedulerAPI.getAll(branchFilter)
        ]);
        
        console.log('[Dashboard] Exam groups response:', groupsRes.data);
        console.log('[Dashboard] Schedules response:', schedulesRes.data);
        
        const examGroups = groupsRes.data.data || [];
        const schedules = schedulesRes.data.data || [];
        
        // Get schedules that are NOT linked to exam groups (to avoid duplicates)
        const linkedExamGroupIds = schedules
          .filter(s => s.subjectGroup && s.subjectGroup._id)
          .map(s => s.subjectGroup._id.toString());
        
        // Filter exam groups to only those assigned to this teacher
        const teacherExamGroups = examGroups.filter(g => 
          g.teachers && g.teachers.some(t => {
            const teacherId = t._id ? t._id.toString() : t.toString();
            return teacherId === user._id.toString();
          })
        );
        
        // Filter schedules to only those assigned to this teacher (not linked to exam groups)
        const teacherSchedules = schedules.filter(s => {
          // Skip if already linked to an exam group (those students are counted in exam group)
          if (s.subjectGroup && s.subjectGroup._id) return false;
          
          const scheduleTeacherId = s.teacher?._id ? s.teacher._id.toString() : s.teacher?.toString();
          return scheduleTeacherId === user._id.toString();
        });
        
        console.log('[Dashboard] Teacher exam groups:', teacherExamGroups.length);
        console.log('[Dashboard] Teacher schedules:', teacherSchedules.length);
        
        // Count unique students across all teacher's groups AND schedules
        const uniqueStudentIds = new Set();
        
        // Add students from exam groups
        teacherExamGroups.forEach(group => {
          console.log('[Dashboard] Processing exam group:', group.groupName, 'Students:', group.students?.length);
          if (group.students && Array.isArray(group.students)) {
            group.students.forEach(student => {
              const studentId = student._id ? student._id.toString() : student.toString();
              uniqueStudentIds.add(studentId);
            });
          }
        });
        
        // Add students from schedules
        teacherSchedules.forEach(schedule => {
          console.log('[Dashboard] Processing schedule:', schedule.className, 'Students:', schedule.enrolledStudents?.length);
          if (schedule.enrolledStudents && Array.isArray(schedule.enrolledStudents)) {
            schedule.enrolledStudents.forEach(student => {
              const studentId = student._id ? student._id.toString() : student.toString();
              uniqueStudentIds.add(studentId);
            });
          }
        });
        
        console.log('[Dashboard] Unique students found:', uniqueStudentIds.size);
        
        setStats({
          students: uniqueStudentIds.size,
          teachers: 0,
          groups: teacherExamGroups.length + teacherSchedules.length,
          unpaidStudents: 0,
          paidStudents: 0
        });
      } else {
        // Admins/managers see full system stats
        const [studentsRes, teachersRes, paymentsRes] = await Promise.all([
          studentsAPI.getAll(branchFilter),
          teachersAPI.getAll(branchFilter),
          paymentsAPI.getAll(branchFilter)
        ]);
        
        // Calculate totals from response
        const studentsData = studentsRes.data.data || [];
        const teachersData = teachersRes.data.data || [];
        const paymentsData = paymentsRes.data.data || [];
        
        console.log('[Dashboard] Data fetched:', {
          students: studentsData.length,
          activeStudents: studentsData.filter(s => s.status === 'active').length,
          inactiveStudents: studentsData.filter(s => s.status === 'inactive').length,
          teachers: teachersData.length,
          payments: paymentsData.length
        });
        
        // Calculate unpaid students from payments data
        const allStudents = studentsData;
        const allPayments = paymentsData;
        
        // Get current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        const currentYear = currentDate.getFullYear();
        
        // Filter to only active students
        const activeStudents = allStudents.filter(student => student.status === 'active');
        
        // Get unique ACTIVE student IDs who have made payments THIS MONTH
        const activeStudentIds = new Set(activeStudents.map(s => s._id));
        const paidThisMonthStudentIds = [...new Set(
          allPayments
            .filter(payment => {
              const studentId = payment.student?._id || payment.student;
              const isActive = activeStudentIds.has(studentId);
              const isPaid = payment.status === 'paid' || payment.status === 'completed';
              const isThisMonth = payment.month === currentMonth && payment.year === currentYear;
              return isActive && isPaid && isThisMonth;
            })
            .map(payment => payment.student?._id || payment.student)
        )];
        
        // Count ACTIVE students who have paid THIS MONTH
        const paidCount = paidThisMonthStudentIds.length;
        
        // Count ACTIVE students who haven't paid THIS MONTH
        const unpaidCount = activeStudents.filter(student => 
          !paidThisMonthStudentIds.includes(student._id)
        ).length;
        
        const newStats = {
          students: studentsRes.data.count || allStudents.length,
          teachers: teachersRes.data.count || teachersData.length || 0,
          unpaidStudents: unpaidCount,
          paidStudents: paidCount
        };
        console.log('[Dashboard] Setting stats:', {
          ...newStats,
          activeStudents: activeStudents.length,
          totalStudents: allStudents.length
        });
        setStats(newStats);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching dashboard stats:', error);
      console.error('[Dashboard] Error details:', error.response?.data);
      console.error('[Dashboard] Error status:', error.response?.status);
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [user.role, navigate, getBranchFilter]);

  useEffect(() => {
    setLoading(true);
    fetchDashboardStats();
  }, [fetchDashboardStats, selectedBranch]);

  if (loading) {
    return (
      <div className="admin-dashboard__container">
        <div className="global-loading">
          <div className="global-spinner"></div>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard__container">
      <div className="admin-layout__page-header">
        <h1 className="admin-layout__page-title">{t('dashboard.title')}</h1>
        <div className="admin-layout__page-actions">
          {!isTeacher && (
            <button className="btn btn-primary" onClick={() => navigate('/students')}>
              {t('dashboard.viewStudents')}
            </button>
          )}
        </div>
      </div>

      <div className="admin-dashboard__stats-grid">
        {!isTeacher && (
          <>
            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(11, 105, 255, 0.1)' }}>
                <IoSchoolOutline size={32} color="#0b69ff" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.students}</h3>
                <p>{t('dashboard.totalStudents')}</p>
              </div>
            </div>

            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <AiOutlineUser size={32} color="#3b82f6" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.teachers}</h3>
                <p>{t('dashboard.totalTeachers')}</p>
              </div>
            </div>

            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <AiOutlineDollar size={32} color="#ef4444" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.unpaidStudents}</h3>
                <p>{t('dashboard.unpaidStudents')}</p>
              </div>
            </div>
            
            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <AiOutlineCheckCircle size={32} color="#10b981" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.paidStudents}</h3>
                <p>{t('dashboard.paidStudents')}</p>
              </div>
            </div>
          </>
        )}
        
        {/* Teacher Stats */}
        {isTeacher && (
          <>
            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(11, 105, 255, 0.1)' }}>
                <IoSchoolOutline size={32} color="#0b69ff" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.students}</h3>
                <p>{t('dashboard.myStudents')}</p>
              </div>
            </div>

            <div className="admin-dashboard__stat-card">
              <div className="admin-dashboard__stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <AiOutlineTeam size={32} color="#3b82f6" />
              </div>
              <div className="admin-dashboard__stat-info">
                <h3>{stats.groups}</h3>
                <p>{t('dashboard.myGroups')}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>{t('dashboard.quickActions')}</h2>
        <div className="admin-dashboard__quick-actions-grid">
          {!isTeacher && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/students')}>
              <span className="admin-dashboard__action-icon"><AiOutlineTeam size={24} /></span>
              <span className="admin-dashboard__action-text">{t('dashboard.manageStudents')}</span>
            </button>
          )}
          
          {isAdmin && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/teachers')}>
              <span className="admin-dashboard__action-icon"><AiOutlineUser size={24} /></span>
              <span className="admin-dashboard__action-text">{t('dashboard.manageTeachers')}</span>
            </button>
          )}
          
          {!isTeacher && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/payments')}>
              <span className="admin-dashboard__action-icon"><AiOutlineCreditCard size={24} /></span>
              <span className="admin-dashboard__action-text">{t('dashboard.viewPayments')}</span>
            </button>
          )}
          
          {/* Student Attendance - Show for teachers AND admins */}
          <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/student-attendance')}>
            <span className="admin-dashboard__action-icon"><AiOutlineCheckCircle size={24} /></span>
            <span className="admin-dashboard__action-text">{t('dashboard.studentAttendance')}</span>
          </button>
          
          {isAdmin && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/exam-groups')}>
              <span className="admin-dashboard__action-icon"><AiOutlineAppstore size={24} /></span>
              <span className="admin-dashboard__action-text">{t('sidebar.subjectGroups')}</span>
            </button>
          )}
          
          {!isTeacher && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/exams')}>
              <span className="admin-dashboard__action-icon"><AiOutlineFileText size={24} /></span>
              <span className="admin-dashboard__action-text">{t('dashboard.examManagement')}</span>
            </button>
          )}
          
          {/* Feedback - Show for teachers AND admins */}
          <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/feedback')}>
            <span className="admin-dashboard__action-icon"><AiOutlineMessage size={24} /></span>
            <span className="admin-dashboard__action-text">{t('dashboard.studentFeedback')}</span>
          </button>
          
          {/* Teacher Earnings - Show ONLY for teachers */}
          {isTeacher && (
            <button className="admin-dashboard__quick-action-btn" onClick={() => navigate('/teacher-earnings')}>
              <span className="admin-dashboard__action-icon"><AiOutlineDollar size={24} /></span>
              <span className="admin-dashboard__action-text">{t('sidebar.myEarnings')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>{t('dashboard.welcome')}, {user.name || t('common.unknown')}!</h2>
        <p>{t('common.loggedInAs')} {t(`common.${user.role || user.userType}`) || user.role || user.userType}. {t('dashboard.todaysOverview')}</p>
        
        <div className="admin-dashboard__welcome-grid">
          <div className="admin-dashboard__welcome-item">
            <h3><AiOutlineCalendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {t('dashboard.todaysOverview')}</h3>
            <p>{t('dashboard.checkTodaysAttendance')}</p>
          </div>
          
          {!isTeacher && (
            <>
              <div className="admin-dashboard__welcome-item">
                <h3><AiOutlineBarChart size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {t('dashboard.reports')}</h3>
                <p>{t('dashboard.generateReports')}</p>
              </div>
              
              <div className="admin-dashboard__welcome-item">
                <h3><AiOutlineSetting size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {t('sidebar.settings')}</h3>
                <p>{t('dashboard.configureSystem')}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;