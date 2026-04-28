import React from 'react';
import { NavLink } from 'react-router-dom';
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
  AiOutlineStar
} from 'react-icons/ai';
import './StudentSidebar.css';

const StudentSidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
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
      key: 'timetable'
    },
    {
      path: '/student/attendance',
      icon: <AiOutlineCheckCircle size={20} />,
      label: t('sidebar.attendance'),
      key: 'attendance'
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
      key: 'exams'
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
      key: 'words'
    },
    {
      path: '/sentences',
      icon: <AiOutlineEdit size={20} />,
      label: t('sidebar.sentences') || 'Sentences',
      key: 'sentences'
    },
    {
      path: '/student/penalties',
      icon: <AiOutlineWarning size={20} />,
      label: t('sidebar.myPenalties') || 'My Penalties',
      key: 'my-penalties'
    },
    {
      path: '/student/presentations',
      icon: <AiOutlineStar size={20} />,
      label: t('sidebar.myPresentations') || 'My Presentations',
      key: 'my-presentations'
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

  return (
    <aside className={`student-sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="student-nav" style={{ marginTop: '20px' }}>
        <ul className="student-menu">
          {menuItems.map((item) => (
            <li key={item.key} className="student-menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `student-menu-link ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="student-sidebar-footer">
        <p className="app-version">TechRen Academy v1.0</p>
      </div>
    </aside>
  );
};

export default StudentSidebar;
