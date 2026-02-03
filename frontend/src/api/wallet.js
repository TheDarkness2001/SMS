import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get wallet balance
export const getWalletBalance = async (ownerId, ownerType) => {
  const response = await axios.get(`${API_BASE_URL}/wallet/balance/${ownerId}/${ownerType}`);
  return response.data;
};

// Get wallet summary
export const getWalletSummary = async (ownerId, ownerType) => {
  const response = await axios.get(`${API_BASE_URL}/wallet/summary/${ownerId}/${ownerType}`);
  return response.data;
};

// Get transaction history
export const getTransactionHistory = async (ownerId, ownerType, params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/wallet/transactions/${ownerId}/${ownerType}`, { params });
  return response.data;
};

// Top up wallet
export const topUpWallet = async (data) => {
  const response = await axios.put(`${API_BASE_URL}/wallet/top-up`, data);
  return response.data;
};

// Process class deduction
export const processClassDeduction = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/wallet/class-deduction`, data);
  return response.data;
};

// Apply student penalty
export const applyStudentPenalty = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/wallet/penalty/student`, data);
  return response.data;
};

// Process refund
export const processRefund = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/wallet/refund`, data);
  return response.data;
};

// Adjust wallet (admin only)
export const adjustWallet = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/wallet/adjustment`, data);
  return response.data;
};