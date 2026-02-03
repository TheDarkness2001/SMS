import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { schedulerAPI } from '../utils/api';
import { AiOutlineCalendar, AiOutlineClockCircle } from 'react-icons/ai';
import '../styles/StudentPages.css';

const StudentTimetable = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchStudentSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudentSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Current user:', user);
      
      // Fetch all schedules (backend should filter based on enrolled students)
      const res = await schedulerAPI.getAll();
      const allSchedules = res.data.data || [];
      
      console.log('All schedules fetched:', allSchedules.length);
      
      // Get student ID (could be _id or id)
      const studentId = user._id || user.id;
      
      if (!studentId) {
        console.error('No student ID found in user object');
        setError(t('studentTimetable.unableToIdentify'));
        setLoading(false);
        return;
      }
      
      // Filter schedules where current student is enrolled
      const studentSchedules = allSchedules.filter(schedule => {
        const isEnrolled = schedule.enrolledStudents?.some(student => {
          const enrolledStudentId = student._id || student;
          return enrolledStudentId === studentId || enrolledStudentId.toString() === studentId.toString();
        });
        
        if (isEnrolled) {
          console.log('Student enrolled in:', schedule.subject?.name || schedule.subjectGroup?.subject);
        }
        
        return isEnrolled;
      });
      
      console.log('Filtered schedules for student:', studentSchedules.length);
      setSchedules(studentSchedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      console.error('Error details:', err.response?.data);
      setError(t('studentTimetable.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = () => {
    const dayGroups = {
      [t('common.monday')]: [],
      [t('common.tuesday')]: [],
      [t('common.wednesday')]: [],
      [t('common.thursday')]: [],
      [t('common.friday')]: [],
      [t('common.saturday')]: [],
      [t('common.sunday')]: []
    };

    schedules.forEach(schedule => {
      schedule.scheduledDays?.forEach(day => {
        if (dayGroups[day]) {
          dayGroups[day].push(schedule);
        }
      });
    });

    return dayGroups;
  };

  const groupedSchedules = groupByDay();

  if (loading) {
    return (
      <div className="student-page">
        <div className="loading-spinner">{t('studentTimetable.loadingTimetable')}...</div>
      </div>
    );
  }

  return (
    <div className="student-page student-timetable-page">
      <div className="student-page-header">
        <h1 className="student-page-title">
          <AiOutlineCalendar style={{ marginRight: '10px' }} />
          {t('studentTimetable.myTimetable')}
        </h1>
        <p className="student-page-subtitle">{t('studentTimetable.weeklySchedule')}</p>
      </div>

      {error && (
        <div className="error-message" style={{ 
          background: '#fee', 
          color: '#c00', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="no-data" style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          background: '#f8f9fa', 
          borderRadius: '12px' 
        }}>
          <AiOutlineCalendar size={64} style={{ color: '#999', marginBottom: '20px' }} />
          <h3>{t('studentTimetable.noClassesScheduled')}</h3>
          <p>{t('studentTimetable.notEnrolled')}</p>
        </div>
      ) : (
        <div className="student-timetable-grid">
          {Object.entries(groupedSchedules).map(([day, daySchedules]) => (
            daySchedules.length > 0 && (
              <div key={day} className="student-day-schedule">
                <h2>{day}</h2>
                <div className="student-day-classes">
                  {daySchedules
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(schedule => (
                      <div key={schedule._id} className="student-class-card">
                        <div className="student-class-card-header">
                          <div className="student-class-card-info">
                            <h3>
                              {schedule.subjectGroup?.subject || schedule.subject?.name || schedule.subject || t('common.unknown')}
                            </h3>
                            <p>
                              {schedule.className} - {t('studentTimetable.section')} {schedule.section}
                            </p>
                          </div>
                          <div className="student-class-card-time">
                            <AiOutlineClockCircle />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                        </div>
                        
                        <div className="student-class-card-details">
                          <div>
                            <span>{t('students.teacher')}:</span> {schedule.teacher?.name || t('common.unknown')}
                          </div>
                          <div>
                            <span>{t('timetable.room')}:</span> {schedule.roomNumber || t('common.unknown')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;
