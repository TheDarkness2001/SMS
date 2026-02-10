import { api } from '../utils/api';

// Create earning for completed class
export const createEarningForClass = async (data) => {
  const response = await api.post('/teacher-earnings', data);
  return response;
};

// Get teacher earnings
export const getTeacherEarnings = async (teacherId, params = {}) => {
  const response = await api.get(`/teacher-earnings/${teacherId}`, { params });
  return response;
};

// Get teacher earnings summary
export const getTeacherEarningsSummary = async (teacherId, period = 'monthly') => {
  const response = await api.get(`/teacher-earnings/summary/${teacherId}`, { 
    params: { period } 
  });
  return response;
};

// Mark earnings as paid
export const markEarningsAsPaid = async (data) => {
  const response = await api.put('/teacher-earnings/pay', data);
  return response;
};

// Apply teacher penalty
export const applyTeacherPenalty = async (data) => {
  const response = await api.post('/teacher-earnings/penalty', data);
  return response;
};

// Get salary payout history
export const getSalaryPayoutHistory = async (teacherId, params = {}) => {
  const response = await api.get(`/teacher-earnings/payouts/${teacherId}`, { params });
  return response;
};

// Create salary payout
export const createSalaryPayout = async (data) => {
  const response = await api.post('/teacher-earnings/payouts', data);
  return response;
};