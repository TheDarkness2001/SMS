import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { teachersAPI, schedulerAPI } from '../utils/api';
import '../styles/TeacherTimetable.css';

const TeacherTimetable = () => {
  const { t } = useLanguage();
  const { getBranchFilter, selectedBranch } = useBranch();
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Timetable configuration
  const DAYS_OF_WEEK = [t('common.monday'), t('common.tuesday'), t('common.wednesday'), t('common.thursday'), t('common.friday'), t('common.saturday'), t('common.sunday')];
  const START_HOUR = 8;
  const END_HOUR = 21;
  const HOUR_HEIGHT = 60; // pixels per hour

  // Fetch schedules for selected teacher
  const fetchSchedules = useCallback(async (teacherId) => {
    try {
      setLoading(true);
      setError('');
      
      const branchFilter = getBranchFilter();
      const res = await schedulerAPI.getAll(branchFilter);
      
      const allSchedules = res.data.data || [];
      
      // Filter schedules for this teacher
      const teacherSchedules = allSchedules.filter(schedule => 
        schedule.teacher === teacherId || schedule.teacher?._id === teacherId
      );
      
      setSchedules(teacherSchedules);
    } catch (err) {
      setError(t('teacherTimetable.failedToFetchSchedules'));
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, getBranchFilter, selectedBranch]);

  const handleTeacherSelect = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    fetchSchedules(teacher._id);
  }, [fetchSchedules]);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const branchFilter = getBranchFilter();
      const res = await teachersAPI.getAll(branchFilter);
      setTeachers(res.data.data || []);
      
      // If user is a teacher, auto-select their timetable
      if (currentUser && currentUser.role === 'teacher') {
        const userId = currentUser._id || currentUser.id;
        const teacher = res.data.data.find(t => t._id === userId);
        if (teacher) {
          setTimeout(() => {
            handleTeacherSelect(teacher);
          }, 100);
        }
      }
    } catch (err) {
      setError(t('teacherTimetable.failedToFetchTeachers'));
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, handleTeacherSelect, t, getBranchFilter, selectedBranch]);

  // Get current user from localStorage
  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTeachers();
    }
  }, [currentUser, fetchTeachers, selectedBranch]);

  // Check if user is admin, manager, or founder
  const canViewAllTeachers = currentUser && 
    (currentUser.role === 'admin' || 
     currentUser.role === 'manager' || 
     currentUser.role === 'founder');

  // Helper: Convert time string to minutes from start hour
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours - START_HOUR) * 60 + minutes;
  };
  
  // Helper: Generate color for teacher
  const getTeacherColor = (teacherId) => {
    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
      '#00BCD4', '#FF5722', '#3F51B5', '#8BC34A', '#FFC107'
    ];
    const index = teacherId ? teacherId.charCodeAt(teacherId.length - 1) % colors.length : 0;
    return colors[index];
  };
  
  // Helper: Prepare classes for a specific day
  const getClassesForDay = (day) => {
    return schedules
      .filter(schedule => schedule.scheduledDays?.includes(day))
      .map(schedule => ({
        ...schedule,
        top: timeToMinutes(schedule.startTime),
        height: timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime),
        color: getTeacherColor(selectedTeacher?._id)
      }))
      .sort((a, b) => a.top - b.top);
  };
  
  // Helper: Get today's classes for mobile/tablet view
  const getTodayClasses = () => {
    const now = new Date();
    const dayNames = [
      t('common.sunday'), 
      t('common.monday'), 
      t('common.tuesday'), 
      t('common.wednesday'), 
      t('common.thursday'), 
      t('common.friday'), 
      t('common.saturday')
    ];
    const today = dayNames[now.getDay()];
    
    return schedules
      .filter(schedule => schedule.scheduledDays?.includes(today))
      .map(schedule => ({
        ...schedule,
        color: getTeacherColor(selectedTeacher?._id)
      }))
      .sort((a, b) => {
        const aTime = a.startTime.split(':').map(Number);
        const bTime = b.startTime.split(':').map(Number);
        return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1]);
      });
  };
  
  if (loading && teachers.length === 0) {
    return (
      <div className="teacher-timetable-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>{t('teacherTimetable.title')}</h1>
        </div>
        <div className="loading-message">{t('teacherTimetable.loadingTeachers')}...</div>
      </div>
    );
  }

  return (
    <div className="teacher-timetable-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{t('teacherTimetable.title')}</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Show teacher selector only for admin/manager/founder or if no teacher selected */}
      {(!selectedTeacher || canViewAllTeachers) && (
        <div className="teacher-selector-card">
          <div className="teacher-selector-header">
            <h3>👤 {canViewAllTeachers ? t('teacherTimetable.selectTeacher') : t('sidebar.myTimetable')}</h3>
          </div>
          <div className="teacher-selector-body">
            <div className="teacher-filter-buttons">
              {teachers.map(teacher => (
                <button
                  key={teacher._id}
                  className={`btn ${selectedTeacher && selectedTeacher._id === teacher._id ? 'btn-primary' : 'btn-outline-primary'} me-2 mb-2`}
                  onClick={() => handleTeacherSelect(teacher)}
                >
                  {teacher.teacherId} - {teacher.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTeacher && (
        <div className="timetable-view">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>{(selectedTeacher._id === (currentUser?._id || currentUser?.id)) ? t('sidebar.myTimetable') : t('timetable.teachersTimetable', { name: selectedTeacher.name })}</h2>
            {canViewAllTeachers && (
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedTeacher(null)}
              >
                {t('teacherTimetable.backToSelection')}
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-message">{t('common.loading')}...</div>
          ) : (
            <>
              {/* Desktop Weekly Timetable */}
              <div className="weekly-timetable desktop-only">
                <div className="timetable-grid">
                  {/* Time column */}
                  <div className="time-column">
                    <div className="time-header">{t('timetable.time')}</div>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                      <div 
                        key={i} 
                        className="time-slot"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {String(START_HOUR + i).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {DAYS_OF_WEEK.map(day => {
                    const dayClasses = getClassesForDay(day);
                    return (
                      <div key={day} className="day-column">
                        <div className="day-header">{day}</div>
                        <div 
                          className="day-schedule"
                          style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
                        >
                          {/* Background grid lines */}
                          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                            <div 
                              key={`grid-${i}`} 
                              className="grid-line"
                              style={{ 
                                top: `${i * HOUR_HEIGHT}px`,
                                height: `${HOUR_HEIGHT}px`
                              }}
                            />
                          ))}

                          {dayClasses.map((classItem, idx) => (
                            <div
                              key={idx}
                              className="class-block"
                              style={{
                                top: `${classItem.top}px`,
                                height: `${Math.max(classItem.height - 2, 30)}px`,
                                backgroundColor: classItem.color,
                                borderLeft: `4px solid ${classItem.color}`,
                                filter: 'brightness(1.1)'
                              }}
                              title={`${classItem.subject?.name || classItem.subject} - ${classItem.className}\n${classItem.startTime} - ${classItem.endTime}\nRoom: ${classItem.roomNumber}`}
                            >
                              <div className="class-name">{classItem.subject?.name || classItem.subject}</div>
                              <div className="class-time">{classItem.startTime} - {classItem.endTime}</div>
                              <div className="class-room">{t('timetable.room')} {classItem.roomNumber}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile/Tablet Today's Classes */}
              <div className="today-timetable mobile-tablet-only">
                <div className="today-header">
                  <h3>📅 {t('teacherTimetable.todaysClasses')}</h3>
                  <p className="today-date">
                    {new Date().toLocaleDateString(
                      localStorage.getItem('language') === 'uz' ? 'uz-UZ' : 
                      localStorage.getItem('language') === 'ru' ? 'ru-RU' : 'en-US', 
                      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </p>
                </div>
                
                {getTodayClasses().length === 0 ? (
                  <div className="no-classes-today">
                    <div className="no-classes-icon">🌟</div>
                    <h4>{t('teacherTimetable.noClassesToday')}</h4>
                    <p>{t('teacherTimetable.enjoyFreeTime')}</p>
                  </div>
                ) : (
                  <div className="today-classes-list">
                    {getTodayClasses().map((classItem, idx) => (
                      <div key={idx} className="class-card" style={{ borderLeftColor: classItem.color }}>
                        <div className="class-card-header">
                          <div className="class-subject">{classItem.subject?.name || classItem.subject}</div>
                          <div className="class-badge" style={{ backgroundColor: classItem.color }}>{classItem.className}</div>
                        </div>
                        <div className="class-card-body">
                          <div className="class-time-info">
                            <span className="time-icon">⏰</span>
                            <span className="time-text">{classItem.startTime} - {classItem.endTime}</span>
                          </div>
                          {classItem.roomNumber && (
                            <div className="class-room-info">
                              <span className="room-icon">📍</span>
                              <span className="room-text">{t('timetable.roomLabel', { room: classItem.roomNumber })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherTimetable;