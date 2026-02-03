import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import UserAvatar from './UserAvatar';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();
  const { selectedBranch, setSelectedBranch, branches, isAllBranches } = useBranch();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const branchDropdownRef = useRef(null);
  const [staffUser, setStaffUser] = useState(null);

  // Check if viewing as student
  useEffect(() => {
    const staffUserData = sessionStorage.getItem('staffUser');
    if (staffUserData) {
      setStaffUser(JSON.parse(staffUserData));
    }
  }, []);

  const handleReturnToStaff = () => {
    const staffUserData = sessionStorage.getItem('staffUser');
    if (staffUserData) {
      sessionStorage.setItem('user', staffUserData);
      sessionStorage.removeItem('staffUser');
      window.location.href = '/students';
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setIsBranchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Determine user display info based on user type
  const getUserDisplayInfo = () => {
    if (user.userType === 'parent') {
      return {
        name: user.parentName || user.name || t('common.unknown'),
        id: user.studentId || t('common.noData'),
        label: t('common.childId')
      };
    } else {
      return {
        name: user.name || t('common.unknown'),
        id: user.teacherId || user.studentId || t('common.noData'),
        label: t('common.id')
      };
    }
  };

  const displayInfo = getUserDisplayInfo();

  // Helper to get the correct image URL
  const getImageUrl = () => {
    if (!user.profileImage) return null;
    
    // If profileImage already starts with http or /, use as is
    if (user.profileImage.startsWith('http') || user.profileImage.startsWith('/uploads/')) {
      return user.profileImage;
    }
    
    // Otherwise, prepend /uploads/
    return `/uploads/${user.profileImage}`;
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to={user.userType === 'parent' ? `/students/${user.id}` : "/"} className="navbar-brand">
          TechRen Academy
        </Link>
        <div className="navbar-right">
          {/* Branch Selector for Founders, Admins, and Managers */}
          {['founder', 'admin', 'manager'].includes(user.role) && (
            <div className="branch-dropdown" ref={branchDropdownRef}>
              <button 
                className="branch-selector-button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              >
                <span className="branch-icon">🏢</span>
                <span className="branch-name">
                  {selectedBranch ? selectedBranch.name : 'All Branches'}
                </span>
                <span className="branch-arrow">{isBranchDropdownOpen ? '▲' : '▼'}</span>
              </button>
              
              {isBranchDropdownOpen && (
                <div className="branch-dropdown-menu">
                  <div 
                    className={`branch-option ${isAllBranches ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBranch(null);
                      setIsBranchDropdownOpen(false);
                    }}
                  >
                    <span className="branch-option-icon">🌐</span>
                    <div>
                      <div className="branch-option-name">All Branches</div>
                      <div className="branch-option-desc">View aggregated data</div>
                    </div>
                  </div>
                  <div className="branch-divider"></div>
                  {branches.map(branch => (
                    <div 
                      key={branch._id}
                      className={`branch-option ${selectedBranch?._id === branch._id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBranch(branch);
                        setIsBranchDropdownOpen(false);
                      }}
                    >
                      <span className="branch-option-icon">🏢</span>
                      <div>
                        <div className="branch-option-name">{branch.name}</div>
                        <div className="branch-option-desc">{branch.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="user-dropdown" ref={dropdownRef}>
            <div className="user-info-dropdown" onClick={toggleDropdown}>
              <UserAvatar 
                src={getImageUrl()}
                alt={displayInfo.name}
                size="small"
                className="navbar-user-avatar"
              />
              <span className="user-name">{displayInfo.name}</span>
            </div>
            
            {isDropdownOpen && (
              <div className="dropdown-menu">
                {/* Show staff info when viewing as student */}
                {staffUser && (
                  <>
                    <div className="dropdown-staff-alert">
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '6px' }}>
                        🔍 {t('common.viewingAsStudent')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                        {t('common.staff')}: {staffUser.name}
                      </div>
                      <button
                        onClick={handleReturnToStaff}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>←</span>
                        <span>{t('common.returnToStaffAccount')}</span>
                      </button>
                    </div>
                    <div className="dropdown-divider"></div>
                  </>
                )}
                <div className="dropdown-user-info">
                  <UserAvatar 
                    src={getImageUrl()}
                    alt={displayInfo.name}
                    size="large"
                  />
                  <div className="dropdown-user-name">{displayInfo.name}</div>
                  <div className="dropdown-user-id">{displayInfo.label}: {displayInfo.id}</div>
                  {(user.role || user.userType) && (
                    <div className="dropdown-user-role">
                      {t('common.role')}: {t(`common.${(user.role || user.userType).toLowerCase()}`)}
                    </div>
                  )}
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-language-selector">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`dropdown-lang-btn ${language === 'en' ? 'active' : ''}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => changeLanguage('ru')}
                    className={`dropdown-lang-btn ${language === 'ru' ? 'active' : ''}`}
                  >
                    РУ
                  </button>
                  <button
                    onClick={() => changeLanguage('uz')}
                    className={`dropdown-lang-btn ${language === 'uz' ? 'active' : ''}`}
                  >
                    UZ
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-logout-button">
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;