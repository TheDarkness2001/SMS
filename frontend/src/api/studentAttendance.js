import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all student attendance records
export const getStudentAttendance = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/student-attendance`, { params });
  return response.data;
};

// Get attendance for specific student
export const getStudentAttendanceByStudent = async (studentId) => {
  const response = await axios.get(`${API_BASE_URL}/student-attendance/student/${studentId}`);
  return response.data;
};

// Get single attendance record
export const getSingleAttendance = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/student-attendance/${id}`);
  return response.data;
};

// Create attendance record
export const createAttendance = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/student-attendance`, data);
  return response.data;
};

// Update attendance record
export const updateAttendance = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/student-attendance/${id}`, data);
  return response.data;
};

// Delete attendance record
export const deleteAttendance = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/student-attendance/${id}`);
  return response.data;
};

// Check consecutive absences
export const checkConsecutiveAbsences = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/student-attendance/check-consecutive-absences`, data);
  return response.data;
};

// Get eligibility status
export const getEligibilityStatus = async (studentId) => {
  const response = await axios.get(`${API_BASE_URL}/student-attendance/eligibility/${studentId}`);
  return response.data;
};