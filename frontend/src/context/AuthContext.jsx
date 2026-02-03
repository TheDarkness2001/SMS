import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
      // Set token for axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user info
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password, userType = 'teacher') => {
    try {
      // Use specific endpoint based on user type
      const endpoint = userType === 'teacher' ? '/api/auth/teacher/login' : '/api/auth/student/login';
      
      const response = await axios.post(endpoint, {
        email,
        password
      });

      const { token, user: userData } = response.data.data;
      
      sessionStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
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