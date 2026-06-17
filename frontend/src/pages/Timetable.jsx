import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { teachersAPI, schedulerAPI } from '../utils/api';
import WeeklyTimetableGrid from '../components/WeeklyTimetableGrid';
import '../styles/Timetable.css';

const Timetable = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Timetable configuration
  const DAYS_OF_WEEK = useMemo(() => [
    t('common.monday'), t('common.tuesday'), t('common.wednesday'),
    t('common.thursday'), t('common.friday'), t('common.saturday'), t('common.sunday')
  ], [t]);

  // Get current user from localStorage
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setCurrentUser(user);
  }, []);

  // Check if user can view all teachers
  const canViewAllTeachers = currentUser && 
    (currentUser.role === 'admin' || 
     currentUser.role === 'manager' || 
     currentUser.role === 'founder');

  // Fetch all teachers for admin/manager/founder
  const fetchTeachers = useCallback(async () => {
    if (!canViewAllTeachers) return;
    
    try {
      const branchFilter = getBranchFilter();
      const res = await teachersAPI.getAll(branchFilter);
      const allTeachers = res.data.data || [];
      
      setTeachers(allTeachers);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  }, [canViewAllTeachers, getBranchFilter]);

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get logged-in user from localStorage
      const user = JSON.parse(sessionStorage.getItem('user'));
      
      console.log('Fetching timetable for user:', user);
      
      if (!user || (!user._id && !user.id)) {
        setError(t('common.error') + ': ' + t('common.loading'));
        setLoading(false);
        return;
      }

      // Use either _id or id field
      const userId = user._id || user.id;
      console.log('User ID:', userId);

      // Fetch schedules from Scheduler using API helper
      const branchFilter = getBranchFilter();
      const response = await schedulerAPI.getAll(branchFilter);
      
      const allSchedules = response.data.data || [];
      console.log('All schedules fetched:', allSchedules.length);
      console.log('Schedules data:', allSchedules);
      
      // Filter schedules for this teacher
      const teacherSchedules = allSchedules.filter(schedule => {
        const teacherId = schedule.teacher?._id || schedule.teacher;
        console.log('Comparing:', { scheduleTeacher: teacherId, currentUser: userId });
        return teacherId === userId || schedule.teacher === userId;
      });
      
      console.log('Filtered teacher schedules:', teacherSchedules.length);
      setSchedules(teacherSchedules);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      console.error('Error details:', error.response?.data);
      setError(t('common.error') + ': Timetable - ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [t, getBranchFilter]);
  
  useEffect(() => {
    if (currentUser) {
      if (canViewAllTeachers) {
        fetchTeachers();
      } else {
        // Auto-load teacher's own timetable
        fetchTimetable();
      }
    }
  }, [currentUser, canViewAllTeachers, fetchTeachers, fetchTimetable, selectedBranch]);

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher);
    fetchTimetableForTeacher(teacher._id);
  };

  const fetchTimetableForTeacher = async (teacherId) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching timetable for teacher ID:', teacherId);
      
      const branchFilter = getBranchFilter();
      const response = await schedulerAPI.getAll(branchFilter);
      
      console.log('All schedules fetched for admin:', response.data);
      
      // Validate response structure
      if (!response.data || !response.data.data) {
        console.error('Invalid response structure:', response.data);
        setSchedules([]);
        return;
      }
      
      const allSchedules = response.data.data;
      console.log('Total schedules:', allSchedules.length);
      
      // Filter schedules for the selected teacher
      const teacherSchedules = allSchedules.filter(schedule => {
        const scheduleTeacherId = schedule.teacher?._id || schedule.teacher;
        console.log('Comparing:', { scheduleTeacher: scheduleTeacherId, selectedTeacher: teacherId });
        return scheduleTeacherId === teacherId || schedule.teacher === teacherId;
      });
      
      console.log('Filtered schedules for selected teacher:', teacherSchedules.length);
      setSchedules(teacherSchedules);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      console.error('Error details:', error.response?.data);
      setError(t('timetable.failedToLoad') + ' - ' + (error.response?.data?.message || error.message));
      setSchedules([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  const getClassColor = (schedule) => {
    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
      '#00BCD4', '#FF5722', '#3F51B5', '#8BC34A', '#FFC107'
    ];
    const subject = schedule.subject?.name || schedule.subjectGroup?.subject || schedule.subject;
    const subjectName = typeof subject === 'object' && subject?.name
      ? subject.name
      : (typeof subject === 'string' ? subject : 'Default');
    const index = subjectName ? subjectName.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <div className="container timetable-container">
      <h1 className="timetable-header">
        {canViewAllTeachers ? t('sidebar.scheduler') : t('sidebar.myTimetable')}
      </h1>
      
      {error && <div className="alert alert-error">{error}</div>}

      {/* Teacher Selection for Admin/Manager/Founder */}
      {canViewAllTeachers && (
        <div className="teacher-selector-card">
          <div className="teacher-selector-header">
            <h3>👤 {t('attendance.selectTeacher')}</h3>
          </div>
          <div className="teacher-selector-body">
            <div className="teacher-filter-dropdown">
              <select
                className="form-control timetable-filter-select"
                value={selectedTeacher?._id || ''}
                onChange={(e) => {
                  const teacherId = e.target.value;
                  if (teacherId) {
                    const teacher = teachers.find(t => t._id === teacherId);
                    handleTeacherSelect(teacher);
                  } else {
                    setSelectedTeacher(null);
                    setSchedules([]);
                  }
                }}
              >
                <option value="">{t('attendance.selectTeacher')}</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.teacherId} - {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Show timetable only if teacher is selected (for admin/manager) or user is teacher */}
      {(selectedTeacher || !canViewAllTeachers) && (
        <>
          {selectedTeacher && canViewAllTeachers && (
            <h2 style={{ marginTop: '20px', marginBottom: '15px' }}>
              {t('timetable.teachersTimetable', { name: selectedTeacher.name })}
            </h2>
          )}
          
          {loading ? (
            <div className="loading-message">{t('common.loading')}...</div>
          ) : (
            <WeeklyTimetableGrid
              schedules={schedules}
              daysOfWeek={DAYS_OF_WEEK}
              getClassColor={getClassColor}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Timetable;