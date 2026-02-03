import React from 'react';
import Navbar from './Navbar';
import '../styles/parent-layout.css';

const ParentLayout = ({ children }) => {
  return (
    <div className="parent-layout">
      <Navbar />
      <div className="parent-layout__main-content">
        {children}
      </div>
    </div>
  );
};

export default ParentLayout;