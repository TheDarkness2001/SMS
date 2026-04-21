import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { teachersAPI, teacherAttendanceAPI } from '../utils/api';
import { AiOutlineUser, AiOutlineMail, AiOutlinePhone } from 'react-icons/ai';
import '../styles/TeacherAttendance.css';

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const branchFilter = getBranchFilter();
        console.log('[TeacherAttendance] Fetching teachers with branch filter:', branchFilter);
        const response = await teachersAPI.getAll(branchFilter);
        setTeachers(response.data.data || []);
        console.log('[TeacherAttendance] Teachers loaded:', response.data.data?.length);
      } catch (err) {
        if (err.response?.status === 401) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(t('common.error') + ': ' + t('teachers.failed'));
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeachers();
  }, [navigate, t, selectedBranch, getBranchFilter]);

  // Filter teachers by role
  useEffect(() => {
    if (selectedRole === 'all') {
      setFilteredTeachers(teachers);
    } else {
      setFilteredTeachers(teachers.filter(teacher => teacher.role === selectedRole));
    }
  }, [teachers, selectedRole]);

  // Initialize attendance tracking for selected date
  useEffect(() => {
    const initAttendance = {};
    filteredTeachers.forEach(teacher => {
      initAttendance[teacher._id] = { status: '', notes: '' };
    });
    setAttendance(initAttendance);
  }, [filteredTeachers, selectedDate]);

  const handleStatusChange = (teacherId, status) => {
    setAttendance(prev => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], status }
    }));
  };

  const handleNotesChange = (teacherId, notes) => {
    setAttendance(prev => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], notes }
    }));
  };

  const handleSaveTeacher = async (teacherId) => {
    try {
      setError('');
      
      const status = attendance[teacherId]?.status;
      if (!status) {
        setError(t('attendance.markAttendance') + ' ' + t('forms.required'));
        return;
      }

      await teacherAttendanceAPI.mark({
        teacherId,
        status,
        date: selectedDate,
        notes: attendance[teacherId]?.notes || ''
      });

      const teacherName = teachers.find(t => t._id === teacherId)?.name;
      
      // Reset the teacher's entry
      setAttendance(prev => ({
        ...prev,
        [teacherId]: { status: '', notes: '' }
      }));
      
      toast.success(`${t('attendance.attendanceRecord')} ${t('common.savedSuccessfully')} (${teacherName})`);
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('attendance.failedToSave'));
      }
    }
  };

  if (loading) return <div className="teacher-attendance-container"><p>{t('common.loading')}</p></div>;

  return (
    <div className="teacher-attendance-container">
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', margin: 0 }}>{t('attendance.teacherAttendance')}</h1>
          <p className="subtitle" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', margin: '2px 0 0 0', opacity: 0.8 }}>
            {new Date(selectedDate).toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters Toolbar */}
      <div className="attendance-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>{t('attendance.date')}:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>{t('common.role')}:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' }}
          >
            <option value="all">{t('common.all')}</option>
            <option value="teacher">{t('login.teacher')}</option>
            <option value="admin">{t('common.admin')}</option>
            <option value="manager">{t('common.manager')}</option>
            <option value="founder">{t('common.founder')}</option>
          </select>
        </div>
      </div>

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="alert alert-info" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ marginBottom: '15px' }}>📋 {t('teachers.noTeachers')}</h3>
        </div>
      ) : (
        <div className="teachers-grid">
          {filteredTeachers.map(teacher => (
            <div key={teacher._id} className="teacher-card">
              <div className="teacher-card-header">
                <div className="teacher-avatar">
                  {teacher.profileImage ? (
                    <img src={teacher.profileImage} alt={teacher.name} />
                  ) : (
                    <div className="teacher-avatar-placeholder">{teacher.name?.charAt(0) || '?'}</div>
                  )}
                </div>
                <div className="teacher-info">
                  <h3>{teacher.name}</h3>
                  <span className={`role-badge role-${teacher.role}`}>{t(`common.${teacher.role}`)}</span>
                </div>
              </div>

              <div className="teacher-details">
                <p><AiOutlineMail /> {teacher.email || t('common.noData')}</p>
                <p><AiOutlinePhone /> {teacher.phone || t('common.noData')}</p>
                {Array.isArray(teacher.subject) && teacher.subject.length > 0 && (
                  <p><AiOutlineUser /> {teacher.subject.filter(s => typeof s === 'string').join(', ')}</p>
                )}
              </div>

              <div className="attendance-actions">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                  {t('attendance.status')}
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {['present', 'absent', 'late'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(teacher._id, status)}
                      className={`status-btn ${attendance[teacher._id]?.status === status ? `status-${status}` : ''}`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textTransform: 'capitalize',
                        backgroundColor: attendance[teacher._id]?.status === status
                          ? (status === 'present' ? '#4caf50' : status === 'absent' ? '#f44336' : '#ff9800')
                          : '#f5f5f5',
                        color: attendance[teacher._id]?.status === status ? '#fff' : '#333',
                        fontWeight: attendance[teacher._id]?.status === status ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t(`attendance.${status}`)}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder={t('attendance.notes')}
                  value={attendance[teacher._id]?.notes || ''}
                  onChange={(e) => handleNotesChange(teacher._id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '12px'
                  }}
                />

                <button
                  onClick={() => handleSaveTeacher(teacher._id)}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;