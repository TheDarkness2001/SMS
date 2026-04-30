import axios from 'axios';

// Use environment variable for API URL, fallback to Railway production backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://sms-production-5f19.up.railway.app/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Export api instance for direct use
export { api };

// Add token to requests
api.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem('token');
    // Log request for debugging
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header set with token');
    } else {
      console.log('No token found in sessionStorage');
    }
    return config;
  },
  error => {
    console.log('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  response => {
    console.log('Response received:', response.status);
    return response;
  },
  error => {
    console.log('Response error:', error.response?.status, error.message);
    if (error.response && error.response.status === 401) {
      console.log('401 error detected, clearing sessionStorage and redirecting to login');
      // Clear session storage and redirect to login
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Redirect to login page
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  request: (method, endpoint, data) => {
    return api({ method, url: endpoint, data });
  },
  login: (data) => {
    // Route to appropriate login endpoint based on userType
    if (data.userType === 'teacher') {
      return api.post('/auth/teacher/login', data);
    } else if (data.userType === 'parent') {
      return api.post('/auth/parent/login', data);
    } else {
      // Default to teacher login if userType not specified
      return api.post('/auth/teacher/login', data);
    }
  },
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.put(`/auth/reset-password/${token}`, data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Teachers API
export const teachersAPI = {
  getAll: (params) => api.get('/teachers', { params }),
  getOne: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  getProfile: () => api.get('/teachers/profile'),
  updateProfile: (data) => api.put('/teachers/profile', data),
  changePassword: (data) => api.put('/teachers/change-password', data),
  uploadPhoto: (id, formData) => api.put(`/teachers/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Students API
export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => {
    // If data is FormData (contains file), don't set Content-Type header
    if (data instanceof FormData) {
      return api.post('/students', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/students', data);
  },
  update: (id, data) => {
    // If data is FormData (contains file), don't set Content-Type header
    if (data instanceof FormData) {
      return api.put(`/students/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/students/${id}`, data);
  },
  delete: (id) => api.delete(`/students/${id}`),
  getParentChildren: () => api.get('/students/parent/children'),
  getStudentByParent: (parentId) => api.get(`/students/parent/${parentId}`),
  updateNotificationSettings: (id, data) => api.patch(`/students/${id}/notification-settings`, data),
  registerPushToken: (id, token) => api.post(`/students/${id}/push-token`, { token })
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getOne: (id) => api.get(`/attendance/${id}`),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  getTeacherAttendance: (teacherId) => api.get(`/attendance/teacher/${teacherId}`),
  // CCTV Attendance APIs
  processCCTV: (data) => api.post('/attendance/cctv', data),
  getCCTVStats: (params) => api.get('/attendance/cctv/stats', { params }),
  getRecentCCTV: (params) => api.get('/attendance/cctv/recent', { params })
};

// Student Attendance API
export const studentAttendanceAPI = {
  getAll: (params) => api.get('/student-attendance', { params }),
  getOne: (id) => api.get(`/student-attendance/${id}`),
  create: (data) => api.post('/student-attendance', data),
  update: (id, data) => api.put(`/student-attendance/${id}`, data),
  delete: (id) => api.delete(`/student-attendance/${id}`),
  getByStudent: (studentId) => api.get(`/student-attendance/student/${studentId}`),
  getByClass: (className, section) => api.get(`/student-attendance/class/${className}/${section}`)
};

// Exams API
export const examsAPI = {
  getAll: (params) => api.get('/exams', { params }),
  getOne: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  getStudentExams: (studentId) => api.get(`/exams/student/${studentId}`),
  // Exam results management
  updateResult: (examId, studentId, data) => api.put(`/exams/${examId}/results/${studentId}`, data),
  enrollStudents: (examId) => api.post(`/exams/${examId}/enroll-students`),
  addStudent: (examId, studentId) => api.post(`/exams/${examId}/add-student`, { studentId }),
  removeStudent: (examId, studentId) => api.delete(`/exams/${examId}/remove-student/${studentId}`),
  markAbsentFailed: (examId) => api.put(`/exams/${examId}/mark-absent-failed`)
};

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  getByStudent: (studentId) => api.get(`/payments/student/${studentId}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`)
};

// Revenue API
export const revenueAPI = {
  getRevenue: (params) => api.get('/revenue', { params }),
  getPending: (params) => api.get('/revenue/pending', { params }),
  getStats: (params) => api.get('/revenue/stats', { params })
};

// Timetable API
export const timetableAPI = {
  getAll: (params) => api.get('/timetable', { params }),
  getOne: (id) => api.get(`/timetable/${id}`),
  getByTeacher: (teacherId, params) => api.get(`/timetable/teacher/${teacherId}`, { params }),
  create: (data) => api.post('/timetable', data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`)
};

// Feedback API
export const feedbackAPI = {
  getAll: (params) => api.get('/feedback', { params }),
  getOne: (id) => api.get(`/feedback/${id}`),
  getByStudent: (studentId) => api.get(`/feedback/student/${studentId}`),
  getTodayClasses: (params) => api.get('/feedback/today-classes', { params }),
  create: (data) => api.post('/feedback', data),
  update: (id, data) => api.put(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`),
  addParentComment: (id, data) => api.put(`/feedback/${id}/parent-comment`, data)
};

// Scheduler API
export const schedulerAPI = {
  getAll: (params) => api.get('/scheduler', { params }),
  getOne: (id) => api.get(`/scheduler/${id}`),
  create: (data) => api.post('/scheduler', data),
  update: (id, data) => api.put(`/scheduler/${id}`, data),
  delete: (id) => api.delete(`/scheduler/${id}`),
  // NEW: Unified view combining subject, group, schedule
  getUnifiedView: (params) => api.get('/scheduler/unified-view', { params }),
  // NEW: Create schedule from exam group
  createFromGroup: (groupId, data) => api.post(`/scheduler/from-group/${groupId}`, data),
  // NEW: Sync students between schedule and group
  syncStudents: (id, direction) => api.post(`/scheduler/${id}/sync-students`, { direction })
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

// Exam Groups API
export const examGroupsAPI = {
  getAll: (params) => api.get('/exam-groups', { params }),
  getOne: (id) => api.get(`/exam-groups/${id}`),
  create: (data) => api.post('/exam-groups', data),
  update: (id, data) => api.put(`/exam-groups/${id}`, data),
  delete: (id) => api.delete(`/exam-groups/${id}`),
  addStudent: (id, studentId) => api.post(`/exam-groups/${id}/students`, { studentId }),
  removeStudent: (id, studentId) => api.delete(`/exam-groups/${id}/students/${studentId}`),
  // NEW: Create schedule from this group
  createSchedule: (id, data) => api.post(`/scheduler/from-group/${id}`, data)
};

// Upload / OCR / Bulk Import API
export const uploadAPI = {
  parseDocx: (formData) => api.post('/upload/parse-docx', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  parseOCR: (formData) => api.post('/upload/parse-ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkImportWords: (data) => api.post('/upload/bulk-import/words', data),
  bulkImportSentences: (data) => api.post('/upload/bulk-import/sentences', data)
};

// Subjects API
export const subjectsAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  getOne: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`)
};

// Teacher Attendance API (Simple Status Marking)
export const teacherAttendanceAPI = {
  // Mark teacher attendance
  mark: (data) => api.post('/teacher-attendance/mark', data),
  getHistory: (params) => api.get('/teacher-attendance/history', { params }),
  getAudit: (id) => api.get(`/teacher-attendance/${id}/audit`),
  getMyStats: (params) => api.get('/teacher-attendance/stats/my-stats', { params })
};

// Branches API
export const branchesAPI = {
  getAll: () => api.get('/branches'),
  getOne: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  getStats: (id) => api.get(`/branches/${id}/stats`)
};

// Salary Payouts API
export const salaryPayoutsAPI = {
  getAll: (params) => api.get('/salary-payouts', { params }),
  getOne: (id) => api.get(`/salary-payouts/${id}`),
  create: (data) => api.post('/salary-payouts', data),
  complete: (id) => api.patch(`/salary-payouts/${id}/complete`),
  cancel: (id, data) => api.patch(`/salary-payouts/${id}/cancel`, data)
};

// Homework API
export const homeworkAPI = {
  // Game
  getRandomWord: (params) => api.get('/homework/words/random', { params: params || {} }),
  checkAnswer: (data) => api.post('/homework/check-answer', data),
  submitResult: (sessionStats) => api.post('/homework/submit-result', { sessionStats }),
  getProgress: () => api.get('/homework/progress'),
  // Word management (admin)
  getLevels: (languageId) => api.get('/homework/levels', { params: languageId ? { languageId } : {} }),
  getAllWords: () => api.get('/homework/words'),
  addWord: (data) => api.post('/homework/words', data),
  updateWord: (id, data) => api.put(`/homework/words/${id}`, data),
  deleteWord: (id) => api.delete(`/homework/words/${id}`),
  // Student progress (admin)
  getAllStudentProgress: () => api.get('/homework/students/progress'),
  getGroupStudentProgress: () => api.get('/homework/students/group-progress'),
  getStudentProgress: (id) => api.get(`/homework/students/${id}/progress`),
  resetStudentProgress: (id) => api.post(`/homework/students/${id}/reset-progress`),
  // Leaderboard
  getLeaderboard: () => api.get('/homework/leaderboard')
};

// Sentence API
export const sentenceAPI = {
  getAll: (params) => api.get('/sentences', { params: params || {} }),
  create: (data) => api.post('/sentences', data),
  update: (id, data) => api.put(`/sentences/${id}`, data),
  delete: (id) => api.delete(`/sentences/${id}`),
  getRandom: (params) => api.get('/sentences/random', { params: params || {} }),
  checkAnswer: (data) => api.post('/sentences/check', data),
  getProgress: () => api.get('/sentences/progress'),
  submitResult: (sessionStats) => api.post('/sentences/submit-result', { sessionStats }),
  getLeaderboard: () => api.get('/sentences/leaderboard')
};

// Language API
export const languageAPI = {
  getAll: () => api.get('/homework/languages'),
  create: (data) => api.post('/homework/languages', data),
  update: (id, data) => api.put(`/homework/languages/${id}`, data),
  delete: (id) => api.delete(`/homework/languages/${id}`)
};

// Level API
export const levelAPI = {
  getByLanguage: (languageId) => api.get(`/homework/levels/language/${languageId}`),
  togglePracticeLock: (id, groupId) => api.post(`/homework/levels/${id}/toggle-practice-lock`, { groupId }),
  create: (data) => api.post('/homework/levels', data),
  update: (id, data) => api.put(`/homework/levels/${id}`, data),
  delete: (id) => api.delete(`/homework/levels/${id}`)
};

// Lesson API
export const lessonAPI = {
  // Admin
  getAllLessons: (levelId) => api.get('/homework/lessons', { params: levelId ? { levelId } : {} }),
  getLesson: (id) => api.get(`/homework/lessons/${id}`),
  createLesson: (data) => api.post('/homework/lessons', data),
  updateLesson: (id, data) => api.put(`/homework/lessons/${id}`, data),
  deleteLesson: (id) => api.delete(`/homework/lessons/${id}`),
  autoGenerateClasses: (id, data) => api.post(`/homework/lessons/${id}/auto-generate`, data),
  removeWordFromLesson: (id, wordId) => api.delete(`/homework/lessons/${id}/words/${wordId}`),
  toggleExamLock: (id, groupId) => api.post(`/homework/lessons/${id}/toggle-exam-lock`, { groupId }),
  getAllStudentLessonProgress: () => api.get('/homework/lessons/students/progress'),
  // Student
  getExamWords: (id) => api.get(`/homework/lessons/${id}/exam`),
  submitExam: (id, answers) => api.post(`/homework/lessons/${id}/exam`, { answers }),
  getMyLessonProgress: () => api.get('/homework/lessons/student/progress'),
  getMyAggregatedProgress: (params) => api.get('/homework/lessons/student/aggregated-progress', { params: params || {} }),
  initMyProgress: () => api.post('/homework/lessons/student/init'),
  updatePracticeStats: (data) => api.post('/homework/lessons/student/practice-stats', data)
};

// Penalty API
export const penaltyAPI = {
  create: (data) => api.post('/penalties', data),
  getStudentPenalties: (studentId, params) => api.get(`/penalties/student/${studentId}`, { params }),
  getGroupPenalties: (groupId, params) => api.get(`/penalties/group/${groupId}`, { params }),
  getMonthly: (params) => api.get('/penalties/monthly', { params }),
  revert: (id) => api.patch(`/penalties/${id}/revert`)
};

// Presentation API
export const presentationAPI = {
  record: (data) => api.post('/presentations', data),
  getStudentPresentations: (studentId, params) => api.get(`/presentations/student/${studentId}`, { params }),
  getMonthly: (params) => api.get('/presentations/monthly', { params }),
  getTop: (params) => api.get('/presentations/top', { params })
};

// Bonus API
export const bonusAPI = {
  calculate: (params) => api.get('/bonuses/calculate', { params }),
  distribute: (data) => api.post('/bonuses/distribute', data),
  getHistory: (params) => api.get('/bonuses/history', { params })
};

// System Config API
export const configAPI = {
  getAll: () => api.get('/homework/config'),
  get: (key) => api.get(`/homework/config/${key}`),
  update: (key, value) => api.put(`/homework/config/${key}`, { value })
};

// Helper function to get image URL from backend
export const getImageUrl = (filename) => {
  if (!filename) return null;
  
  // If already a full URL (ImageKit), return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // Otherwise, construct backend URL
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}/uploads/${filename}`;
};

export default api;