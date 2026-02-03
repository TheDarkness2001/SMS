import React, { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import Navbar from './Navbar';
import '../styles/student-layout.css';

const StudentLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="student-layout">
      <Navbar />
      <div className="student-layout__container">
        {/* Mobile hamburger menu - fixed position, moves when sidebar opens */}
        <button 
          className="student-layout__menu-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <span className="student-layout__hamburger-line"></span>
          <span className="student-layout__hamburger-line"></span>
          <span className="student-layout__hamburger-line"></span>
        </button>
        
        <StudentSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        {/* Mobile overlay */}
        <div 
          className={`student-layout__sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        {/* Main content area */}
        <main className="student-layout__main-content">
          <div className="student-layout__content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
