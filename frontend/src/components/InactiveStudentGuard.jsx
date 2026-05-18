import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * InactiveStudentGuard - Blocks inactive students from accessing restricted routes
 * Allowed routes for inactive students:
 * - /student/dashboard
 * - /student/payments
 * - /student/results
 * - /student/feedback
 */
const InactiveStudentGuard = ({ children }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  
  const isInactive = user.status === 'inactive';
  
  // Routes that inactive students CAN access
  const allowedRoutes = [
    '/student/dashboard',
    '/student/payments',
    '/student/results',
    '/student/feedback'
  ];
  
  // If student is inactive and trying to access a restricted route
  if (isInactive && !allowedRoutes.includes(location.pathname)) {
    // Redirect to dashboard with inactive notice
    return <Navigate to="/student/dashboard?inactive=true" replace />;
  }
  
  return children;
};

export default InactiveStudentGuard;
