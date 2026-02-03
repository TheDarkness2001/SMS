import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create earning for completed class
export const createEarningForClass = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/teacher-earnings`, data);
  return response.data;
};

// Get teacher earnings
export const getTeacherEarnings = async (teacherId, params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/teacher-earnings/${teacherId}`, { params });
  return response.data;
};

// Get teacher earnings summary
export const getTeacherEarningsSummary = async (teacherId, period = 'monthly') => {
  const response = await axios.get(`${API_BASE_URL}/teacher-earnings/summary/${teacherId}`, { 
    params: { period } 
  });
  return response.data;
};

// Mark earnings as paid
export const markEarningsAsPaid = async (data) => {
  const response = await axios.put(`${API_BASE_URL}/teacher-earnings/pay`, data);
  return response.data;
};

// Apply teacher penalty
export const applyTeacherPenalty = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/teacher-earnings/penalty`, data);
  return response.data;
};

// Get salary payout history
export const getSalaryPayoutHistory = async (teacherId, params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/teacher-earnings/payouts/${teacherId}`, { params });
  return response.data;
};