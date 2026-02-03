import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import '../styles/admin-layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get user data from sessionStorage
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
  return (
    <div className="admin-layout">
      <Navbar />
      <div className="admin-layout__main">
        {/* Mobile hamburger menu - fixed position, moves when sidebar opens */}
        <button 
          className="admin-layout__menu-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <span className="admin-layout__hamburger-line"></span>
          <span className="admin-layout__hamburger-line"></span>
          <span className="admin-layout__hamburger-line"></span>
        </button>
        
        <Sidebar user={user} isOpen={sidebarOpen} onClose={closeSidebar} />
        
        {/* Mobile overlay */}
        <div 
          className={`admin-layout__sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        <div className="admin-layout__content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;