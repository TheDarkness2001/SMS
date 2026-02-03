import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { teachersAPI, timetableAPI, attendanceAPI } from '../utils/api';
import '../styles/ViewTeacher.css';

const ViewTeacher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [teacher, setTeacher] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTeacherData = async () => {
    try {
      const [teacherRes, timetableRes, attendanceRes] = await Promise.all([
        teachersAPI.getOne(id),
        timetableAPI.getByTeacher(id),
        attendanceAPI.getAll({ teacher: id })
      ]);

      setTeacher(teacherRes.data.data);
      setTimetable(timetableRes.data.data);
      setAttendance(attendanceRes.data.data);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container view-teacher-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container view-teacher-container">
        <div className="alert alert-error">{t('teachers.teacherNotFound')}</div>
        <button onClick={() => navigate('/teachers')} className="btn btn-primary">
          {t('teachers.backToTeachers')}
        </button>
      </div>
    );
  }

  return (
    <div className="container view-teacher-container">
      <div className="view-teacher-header">
        <h1>{t('students.studentProfile')}</h1>
        <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
          {t('teachers.backToTeachers')}
        </button>
      </div>

      {/* Teacher Information Card */}
      <div className="card teacher-profile-card">
        <div className="teacher-profile-header">
          {teacher.profileImage ? (
            <img 
              src={`/uploads/${teacher.profileImage}`} 
              alt={teacher.name}
              className="teacher-avatar"
            />
          ) : (
            <div className="teacher-initials">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="teacher-info">
            <h2 className="teacher-name">{teacher.name}</h2>
            <p className="teacher-id">
              {teacher.teacherId || t('common.pending')}
            </p>
          </div>
        </div>
        
        <div className="teacher-details-grid">
          <div className="detail-item">
            <strong>{t('login.email')}:</strong> {teacher.email}
          </div>
          <div className="detail-item">
            <strong>{t('attendance.subject')}:</strong> {Array.isArray(teacher.subject) ? teacher.subject.join(', ') : teacher.subject}
          </div>
          <div className="detail-item">
            <strong>{t('teachers.department')}:</strong> {teacher.department}
          </div>
          <div className="detail-item">
            <strong>{t('login.phone')}:</strong> {teacher.phone || 'N/A'}
          </div>
          <div className="detail-item">
            <strong>{t('teachers.role')}:</strong> 
            <span className={`badge badge-${teacher.role === 'admin' ? 'success' : 'info'} badge-role`}>
              {t(`common.${teacher.role}`)}
            </span>
          </div>
          <div className="detail-item">
            <strong>{t('common.status')}:</strong> 
            <span className={`badge badge-${teacher.status === 'active' ? 'success' : 'warning'} badge-status`}>
              {t(`common.${teacher.status}`)}
            </span>
          </div>
        </div>

        {/* Permissions Section */}
        {teacher.permissions && (
          <div className="permissions-section">
            <h3>{t('settings.individualPermissions')}</h3>
            <div className="permissions-grid">
              {Object.entries(teacher.permissions).map(([key, value]) => (
                <div key={key} className="permission-item">
                  <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
                    {value ? '✓' : '✗'}
                  </span>
                  <span>{t(`permissions.${key}`) || key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timetable Section */}
      <h2 className="section-title">{t('timetable.timetable')}</h2>
      <div className="card schedule-card">
        {timetable.length === 0 ? (
          <p className="empty-message">
            {t('timetable.noSchedules')}
          </p>
        ) : (
          timetable.map((tt) => (
            <div key={tt._id} style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>
                {tt.class} - {t('studentTimetable.section')} {tt.section} - {t(`common.${tt.dayOfWeek.toLowerCase()}`) || tt.dayOfWeek}
              </h3>
              <div className="table-container">
                <table className="table timetable-table">
                  <thead>
                    <tr>
                      <th>{t('attendance.period')}</th>
                      <th>{t('attendance.subject')}</th>
                      <th>{t('exams.time')}</th>
                      <th>{t('timetable.room')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tt.periods.map((period, index) => (
                      <tr key={index}>
                        <td>{period.periodNumber}</td>
                        <td>{period.subject}</td>
                        <td>{period.startTime} - {period.endTime}</td>
                        <td>{period.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Attendance History */}
      <h2 className="section-title">{t('attendance.attendanceHistory')}</h2>
      <div className="card attendance-card">
        <div className="table-container">
          <table className="table attendance-table">
            <thead>
              <tr>
                <th>{t('attendance.date')}</th>
                <th>{t('common.status')}</th>
                <th>{t('attendance.checkIn')}</th>
                <th>{t('attendance.checkOut')}</th>
                <th>{t('attendance.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-message">
                    {t('attendance.noAttendanceData')}
                  </td>
                </tr>
              ) : (
                attendance.slice(0, 10).map((record) => (
                  <tr key={record._id}>
                    <td>{new Date(record.date).toLocaleDateString(t('common.locale') || 'en-US')}</td>
                    <td>
                      <span className={`status-badge status-${record.status === 'present' ? 'success' : 'danger'}`}>
                        {t(`attendance.${record.status}`)}
                      </span>
                    </td>
                    <td>{record.checkInTime || '-'}</td>
                    <td>{record.checkOutTime || '-'}</td>
                    <td>{record.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {attendance.length > 10 && (
          <p style={{ textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '14px' }}>
            {t('feedback.last10Entries')} ({attendance.length})
          </p>
        )}
      </div>
    </div>
  );
};

export default ViewTeacher;