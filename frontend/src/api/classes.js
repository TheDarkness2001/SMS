import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all classes
export const getClasses = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/classes`, { params });
  return response.data;
};

// Get single class
export const getClass = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/classes/${id}`);
  return response.data;
};

// Create class
export const createClass = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/classes`, data);
  return response.data;
};

// Update class
export const updateClass = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/classes/${id}`, data);
  return response.data;
};

// Delete class
export const deleteClass = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/classes/${id}`);
  return response.data;
};

// Get all class schedules
export const getClassSchedules = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/class-schedules`, { params });
  return response.data;
};