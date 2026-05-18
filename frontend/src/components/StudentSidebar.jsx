import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiOutlineMessage,
  AiOutlineFileText,
  AiOutlineDollar,
  AiOutlineTrophy,
  AiOutlineBook,
  AiOutlineEdit,
  AiOutlineWarning,
  AiOutlineStar,
  AiOutlinePlayCircle
} from 'react-icons/ai';
import './StudentSidebar.css';

const StudentSidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const isInactive = user.status === 'inactive';
  const [expandedGroups, setExpandedGroups] = useState({
    competition: location.pathname === '/student/penalties' || location.pathname === '/student/presentations'
  });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Define which routes are allowed for inactive students
  const allowedForInactive = ['/student/dashboard', '/student/results', '/student/feedback', '/student/payments'];
  
  const menuItems = [
    {
      path: '/student/dashboard',
      icon: <AiOutlineHome size={20} />,
      label: t('sidebar.dashboard'),
      key: 'dashboard'
    },
    {
      path: '/student/timetable',
      icon: <AiOutlineCalendar size={20} />,
      label: t('sidebar.timetable'),
      key: 'timetable',
      locked: isInactive
    },
    {
      path: '/student/attendance',
      icon: <AiOutlineCheckCircle size={20} />,
      label: t('sidebar.attendance'),
      key: 'attendance',
      locked: isInactive
    },
    {
      path: '/student/feedback',
      icon: <AiOutlineMessage size={20} />,
      label: t('sidebar.feedback'),
      key: 'feedback'
    },
    {
      path: '/student/exams',
      icon: <AiOutlineFileText size={20} />,
      label: t('sidebar.exams'),
      key: 'exams',
      locked: isInactive
    },
    {
      path: '/student/results',
      icon: <AiOutlineTrophy size={20} />,
      label: t('sidebar.results'),
      key: 'results'
    },
    {
      path: '/homework',
      icon: <AiOutlineBook size={20} />,
      label: t('sidebar.words') || 'Words',
      key: 'words',
      locked: isInactive
    },
    {
      path: '/sentences',
      icon: <AiOutlineEdit size={20} />,
      label: t('sidebar.sentences') || 'Sentences',
      key: 'sentences',
      locked: isInactive
    },
    {
      path: '/video-lessons',
      icon: <AiOutlinePlayCircle size={20} />,
      label: t('sidebar.videoLessons') || 'Video Lessons',
      key: 'videoLessons',
      locked: isInactive
    },
    {
      path: '/student/payments',
      icon: <AiOutlineDollar size={20} />,
      label: t('sidebar.payments'),
      key: 'payments'
    }
    /* CLASS PAYMENTS HIDDEN - DEPENDS ON WALLET SYSTEM (NOT IMPLEMENTED YET)
    ,{
      path: '/student-class-payments',
      icon: <AiOutlineDollar size={20} />,
      label: t('sidebar.class-payments'),
      key: 'class-payments'
    }
    */
  ];

  const handleLockedClick = (e, item) => {
    if (item.locked) {
      e.preventDefault();
      alert(t('common.inactiveRestricted') || 'This feature is not available for inactive accounts. Please contact TechRen Academy to reactivate your account.');
    }
  };

  return (
    <aside className={`student-sidebar ${isOpen ? 'open' : ''} ${isInactive ? 'inactive-mode' : ''}`}>
      <nav className="student-nav" style={{ marginTop: '20px' }}>
        <ul className="student-menu">
          {menuItems.map((item) => (
            <li key={item.key} className={`student-menu-item ${item.locked ? 'locked' : ''}`}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `student-menu-link ${isActive ? 'active' : ''} ${item.locked ? 'locked' : ''}`
                }
                onClick={(e) => {
                  if (item.locked) {
                    handleLockedClick(e, item);
                  } else {
                    onClose();
                  }
                }}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                {item.locked && <span className="lock-icon">🔒</span>}
              </NavLink>
            </li>
          ))}

          {/* 🏆 COMPETITION GROUP — My Penalties, My Presentations */}
          {!isInactive && (
            <li className="student-group-header">
              <button
                className="student-group-toggle"
                onClick={() => toggleGroup('competition')}
              >
                <span className="menu-icon"><AiOutlineTrophy size={20} /></span>
                <span className="menu-label">{t('sidebar.competition') || 'Competition'}</span>
                <span className={`chevron ${expandedGroups.competition ? 'open' : ''}`}>▶</span>
              </button>
              {expandedGroups.competition && (
                <ul className="student-group-menu">
                  <li className="student-menu-item">
                    <NavLink
                      to="/student/penalties"
                      className={({ isActive }) =>
                        `student-menu-link ${isActive ? 'active' : ''}`
                      }
                      onClick={onClose}
                    >
                      <span className="menu-icon"><AiOutlineWarning size={18} /></span>
                      <span className="menu-label">{t('sidebar.myPenalties') || 'My Penalties'}</span>
                    </NavLink>
                  </li>
                  <li className="student-menu-item">
                    <NavLink
                      to="/student/presentations"
                      className={({ isActive }) =>
                        `student-menu-link ${isActive ? 'active' : ''}`
                      }
                      onClick={onClose}
                    >
                      <span className="menu-icon"><AiOutlineStar size={18} /></span>
                      <span className="menu-label">{t('sidebar.myPresentations') || 'My Presentations'}</span>
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>

      {isInactive && (
        <div className="student-sidebar-inactive-notice">
          <p>⚠️ Account Inactive</p>
          <small>Contact admin to reactivate</small>
        </div>
      )}

      <div className="student-sidebar-footer">
        <p className="app-version">TechRen Academy v1.0</p>
      </div>
    </aside>
  );
};

export default StudentSidebar;
