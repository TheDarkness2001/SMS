import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { schedulerAPI } from '../utils/api';
import WeeklyTimetableGrid from '../components/WeeklyTimetableGrid';
import { AiOutlineCalendar } from 'react-icons/ai';
import '../styles/StudentPages.css';
import '../styles/Timetable.css';

const StudentTimetable = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const DAYS_OF_WEEK = useMemo(() => [
    t('common.monday'), t('common.tuesday'), t('common.wednesday'),
    t('common.thursday'), t('common.friday'), t('common.saturday'), t('common.sunday')
  ], [t]);

  useEffect(() => {
    fetchStudentSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudentSchedules = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await schedulerAPI.getAll();
      const allSchedules = res.data.data || [];
      const studentId = user._id || user.id;

      if (!studentId) {
        setError(t('studentTimetable.unableToIdentify'));
        setLoading(false);
        return;
      }

      const studentSchedules = allSchedules.filter((schedule) =>
        schedule.enrolledStudents?.some((student) => {
          const enrolledStudentId = student._id || student;
          return enrolledStudentId === studentId || enrolledStudentId.toString() === studentId.toString();
        })
      );

      setSchedules(studentSchedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(t('studentTimetable.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const getClassColor = (schedule) => {
    const colors = [
      '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
      '#0891b2', '#4f46e5', '#ca8a04', '#be185d', '#0d9488'
    ];
    const subject = schedule.subjectGroup?.subject || schedule.subject?.name || schedule.subject || '';
    const subjectName = typeof subject === 'string' ? subject : 'Default';
    return colors[subjectName.charCodeAt(0) % colors.length];
  };

  const pageTitle = user.name
    ? t('timetable.teachersTimetable', { name: user.name })
    : t('studentTimetable.myTimetable');

  if (loading) {
    return (
      <div className="student-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">{t('studentTimetable.loadingTimetable')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page student-timetable-page">
      <div className="student-page-header">
        <h1 className="student-page-title">
          <AiOutlineCalendar style={{ marginRight: '10px' }} />
          {pageTitle}
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
        <WeeklyTimetableGrid
          schedules={schedules}
          daysOfWeek={DAYS_OF_WEEK}
          getClassColor={getClassColor}
          t={t}
        />
      )}
    </div>
  );
};

export default StudentTimetable;
