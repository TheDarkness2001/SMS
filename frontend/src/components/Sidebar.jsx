/* eslint-disable react/jsx-no-undef */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { 
  AiOutlineHome, 
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiOutlineFileText,
  AiOutlineMessage,
  AiOutlineTeam,
  AiOutlineDollar,
  AiOutlineSetting,
  AiOutlineTool,
  AiOutlineClockCircle,
  AiOutlineUser,
  AiOutlineUserSwitch,
  AiOutlineCreditCard,
  AiOutlineBarChart,
  AiOutlineAppstore,
  AiOutlineCluster
} from 'react-icons/ai';
import { IoSchoolOutline } from 'react-icons/io5';
import './Sidebar.css';

const Sidebar = ({ user, isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState({
    attendance: location.pathname.includes('attendance'),
    people: location.pathname === '/teachers' || location.pathname === '/students',
    finance: ['/payments', '/revenue', '/admin/earnings', '/admin/payouts'].includes(location.pathname),
    operations: ['/exam-groups', '/scheduler'].includes(location.pathname)
  });
  
  // Ensure user object exists
  const userData = user || {};
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const hasPermission = (permission) => {
    const role = (userData.role || '').toLowerCase().trim();
    return role === 'admin' || role === 'manager' || role === 'founder' || 
           (userData.permissions && userData.permissions[permission]);
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Students should never see this sidebar - they use StudentSidebar
  const isStudent = userData.userType === 'student';
  const isAdmin = (userData.role || '').toLowerCase().trim() === 'admin' || 
                  (userData.role || '').toLowerCase().trim() === 'manager' || 
                  (userData.role || '').toLowerCase().trim() === 'founder';
  const isTeacher = userData.role === 'teacher';
  const isParent = userData.role === 'parent';
  
  // If student somehow ends up here, don't show this sidebar
  if (isStudent) {
    return null;
  }

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <ul className="sidebar-menu">
        {/* 🏠 MAIN SECTION */}
        <li className={isActive('/')}>
          <Link to="/">
            <span className="icon"><AiOutlineHome size={20} /></span>
            <span>{t('sidebar.dashboard')}</span>
          </Link>
        </li>

        {/* 🏢 BRANCHES (Founder only) */}
        {userData.role === 'founder' && (
          <li className={isActive('/branches')}>
            <Link to="/branches">
              <span className="icon"><AiOutlineCluster size={20} /></span>
              <span>Branches</span>
            </Link>
          </li>
        )}
        
        {!isParent && (
          <li className={isActive('/timetable') || isActive('/teacher-timetable')}>
            <Link to={isTeacher ? '/teacher-timetable' : '/timetable'}>
              <span className="icon"><AiOutlineCalendar size={20} /></span>
              <span>{isTeacher ? t('sidebar.myTimetable') : t('sidebar.timetable')}</span>
            </Link>
          </li>
        )}

        {/* 📋 ATTENDANCE GROUP - Admin/Manager/Founder only */}
        {!isParent && isAdmin && (
          <li className="group-header">
            <button 
              className="group-toggle"
              onClick={() => toggleGroup('attendance')}
            >
              <span className="icon"><AiOutlineCheckCircle size={20} /></span>
              <span>{t('sidebar.attendance')}</span>
              <span className={`chevron ${expandedGroups.attendance ? 'open' : ''}`}>▶</span>
            </button>
            {expandedGroups.attendance && (
              <ul className="group-menu">
                <li className={isActive('/student-attendance')}>
                  <Link to="/student-attendance">
                    <span className="icon"><IoSchoolOutline size={18} /></span>
                    <span>{t('sidebar.studentAttendance')}</span>
                  </Link>
                </li>
                <li className={isActive('/teacher-attendance')}>
                  <Link to="/teacher-attendance">
                    <span className="icon"><AiOutlineUserSwitch size={18} /></span>
                    <span>{t('sidebar.teacherAttendance')}</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}

        {/* 👨‍🏫 STUDENT ATTENDANCE - For teachers only (standalone) */}
        {!isParent && isTeacher && (
          <li className={isActive('/student-attendance')}>
            <Link to="/student-attendance">
              <span className="icon"><IoSchoolOutline size={20} /></span>
              <span>{t('sidebar.studentAttendance')}</span>
            </Link>
          </li>
        )}

        {/* 📝 EXAMS */}
        {!isParent && (
          <li className={isActive('/exams')}>
            <Link to="/exams">
              <span className="icon"><AiOutlineFileText size={20} /></span>
              <span>{t('sidebar.exams')}</span>
            </Link>
          </li>
        )}

        {/* 💬 FEEDBACK */}
        <li className={isActive('/feedback')}>
          <Link to="/feedback">
            <span className="icon"><AiOutlineMessage size={20} /></span>
            <span>{t('sidebar.feedback')}</span>
          </Link>
        </li>

        {/* 👥 PEOPLE GROUP (Admin/Manager/Founder) */}
        {isAdmin && (
          <li className="group-header">
            <button 
              className="group-toggle"
              onClick={() => toggleGroup('people')}
            >
              <span className="icon"><AiOutlineTeam size={20} /></span>
              <span>{t('sidebar.people')}</span>
              <span className={`chevron ${expandedGroups.people ? 'open' : ''}`}>▶</span>
            </button>
            {expandedGroups.people && (
              <ul className="group-menu">
                <li className={isActive('/teachers')}>
                  <Link to="/teachers">
                    <span className="icon"><AiOutlineUser size={18} /></span>
                    <span>{t('sidebar.teachers')}</span>
                  </Link>
                </li>
                <li className={isActive('/students')}>
                  <Link to="/students">
                    <span className="icon"><IoSchoolOutline size={18} /></span>
                    <span>{t('sidebar.students')}</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}

        {/* 💰 MY EARNINGS - Direct link for teachers */}
        {isTeacher && (
          <li className={isActive('/teacher-earnings')}>
            <Link to="/teacher-earnings">
              <span className="icon"><AiOutlineDollar size={20} /></span>
              <span>{t('sidebar.myEarnings')}</span>
            </Link>
          </li>
        )}

        {/* 💼 FINANCE GROUP (Admin/Manager/Founder with permissions) */}
        {!isTeacher && (hasPermission('canViewPayments') || hasPermission('canViewRevenue')) && (
          <li className="group-header">
            <button 
              className="group-toggle"
              onClick={() => toggleGroup('finance')}
            >
              <span className="icon"><AiOutlineDollar size={20} /></span>
              <span>{t('sidebar.finance')}</span>
              <span className={`chevron ${expandedGroups.finance ? 'open' : ''}`}>▶</span>
            </button>
            {expandedGroups.finance && (
              <ul className="group-menu">
                {hasPermission('canViewPayments') && (
                  <li className={isActive('/payments')}>
                    <Link to="/payments">
                      <span className="icon"><AiOutlineCreditCard size={18} /></span>
                      <span>{t('sidebar.payments')}</span>
                    </Link>
                  </li>
                )}
                {hasPermission('canViewRevenue') && (
                  <li className={isActive('/revenue')}>
                    <Link to="/revenue">
                      <span className="icon"><AiOutlineBarChart size={18} /></span>
                      <span>{t('sidebar.revenue')}</span>
                    </Link>
                  </li>
                )}
                {/* WALLET FEATURES HIDDEN - NOT IMPLEMENTED YET
                {hasPermission('canViewPayments') && (
                  <li className={isActive('/wallet')}>
                    <Link to="/wallet">
                      <span className="icon"><AiOutlineCreditCard size={18} /></span>
                      <span>Wallet</span>
                    </Link>
                  </li>
                )}
                {(userData.role === 'admin' || userData.role === 'founder') && (
                  <li className={isActive('/admin/wallet')}>
                    <Link to="/admin/wallet">
                      <span className="icon"><AiOutlineCreditCard size={18} /></span>
                      <span>Wallet Management</span>
                    </Link>
                  </li>
                )}
                */}
                {['admin', 'founder', 'manager'].includes(userData.role) && (
                  <li className={isActive('/admin/earnings')}>
                    <Link to="/admin/earnings">
                      <span className="icon"><AiOutlineDollar size={18} /></span>
                      <span>{t('sidebar.staffEarnings')}</span>
                    </Link>
                  </li>
                )}
                {['admin', 'founder', 'manager'].includes(userData.role) && (
                  <li className={isActive('/admin/payouts')}>
                    <Link to="/admin/payouts">
                      <span className="icon"><AiOutlineCheckCircle size={18} /></span>
                      <span>{t('sidebar.staffPayouts')}</span>
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>
        )}

        {/* 🧠 OPERATIONS (Admin/Manager/Founder) */}
        {isAdmin && (
          <li className="group-header">
            <button 
              className="group-toggle"
              onClick={() => toggleGroup('operations')}
            >
              <span className="icon"><AiOutlineSetting size={20} /></span>
              <span>{t('sidebar.operations')}</span>
              <span className={`chevron ${expandedGroups.operations ? 'open' : ''}`}>▶</span>
            </button>
            {expandedGroups.operations && (
              <ul className="group-menu">
                <li className={isActive('/exam-groups')}>
                  <Link to="/exam-groups">
                    <span className="icon"><AiOutlineAppstore size={18} /></span>
                    <span>{t('sidebar.subjectGroups')}</span>
                  </Link>
                </li>
                <li className={isActive('/scheduler')}>
                  <Link to="/scheduler">
                    <span className="icon"><AiOutlineClockCircle size={18} /></span>
                    <span>{t('sidebar.scheduler')}</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}

        {/* ⚙️ SETTINGS (Founder, Manager, or users with manageSettings permission) */}
        {(userData.role === 'founder' || userData.role === 'manager' || hasPermission('manageSettings')) && (
          <li className={isActive('/settings')}>
            <Link to="/settings">
              <span className="icon"><AiOutlineTool size={20} /></span>
              <span>{t('sidebar.settings')}</span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;