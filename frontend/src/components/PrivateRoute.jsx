import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import StudentLayout from './StudentLayout';
import ParentLayout from './ParentLayout';

const PrivateRoute = ({ children }) => {
  const { user: authUser, loading } = useAuth();
  
  // Check sessionStorage for impersonation (teacher viewing as student)
  const sessionStorageUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const user = sessionStorageUser.userType ? sessionStorageUser : authUser;

  // If still loading user info, show nothing or a loading spinner
  if (loading) {
    return <div>Loading...</div>;
  }

  // If no user (not authenticated), redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // For students, use StudentLayout (dedicated student view)
  if (user.userType === 'student') {
    return <StudentLayout>{children}</StudentLayout>;
  }

  // For parents, use ParentLayout (no sidebar)
  if (user.userType === 'parent') {
    return <ParentLayout>{children}</ParentLayout>;
  }

  // For all other users (teachers, admin, etc.), use regular Layout (with sidebar)
  return <Layout>{children}</Layout>;
};

export default PrivateRoute;