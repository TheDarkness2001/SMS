import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all subjects
export const getSubjects = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/subjects`, { params });
  return response.data;
};

// Get single subject
export const getSubject = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/subjects/${id}`);
  return response.data;
};

// Create subject
export const createSubject = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/subjects`, data);
  return response.data;
};

// Update subject
export const updateSubject = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/subjects/${id}`, data);
  return response.data;
};

// Delete subject
export const deleteSubject = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/subjects/${id}`);
  return response.data;
};