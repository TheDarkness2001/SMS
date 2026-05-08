import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in by verifying token
    const token = sessionStorage.getItem('token');
    if (token) {
      // Get user info
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data;
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password, userType = 'teacher') => {
    try {
      // Use specific endpoint based on user type
      const endpoint = userType === 'teacher' ? '/auth/teacher/login' : '/auth/student/login';
      
      const response = await api.post(endpoint, {
        email,
        password
      });

      const { token, user: userData } = response.data.data;
      
      sessionStorage.setItem('token', token);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    setUser,  // Expose setUser to allow direct updates from components
    login: loginUser,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};