import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all class schedules
export const getClassSchedules = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/class-schedules`, { params });
  return response.data;
};

// Get single class schedule
export const getClassSchedule = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/class-schedules/${id}`);
  return response.data;
};

// Create class schedule
export const createClassSchedule = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/class-schedules`, data);
  return response.data;
};

// Update class schedule
export const updateClassSchedule = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/class-schedules/${id}`, data);
  return response.data;
};

// Delete class schedule
export const deleteClassSchedule = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/class-schedules/${id}`);
  return response.data;
};