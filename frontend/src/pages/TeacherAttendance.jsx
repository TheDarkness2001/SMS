import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { teachersAPI, teacherAttendanceAPI } from '../utils/api';
import '../styles/TeacherAttendance.css';

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Initialize attendance tracking for selected date
  useEffect(() => {
    const initAttendance = {};
    teachers.forEach(teacher => {
      initAttendance[teacher._id] = { status: '', notes: '' };
    });
    setAttendance(initAttendance);
  }, [teachers, selectedDate]);

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

  if (loading) return <div className="container"><p>{t('common.loading')}</p></div>;

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>{t('attendance.teacherAttendance')}</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>{t('attendance.date')}:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="attendance-table">
            <thead>
              <tr>
                <th>{t('teachers.name')}</th>
                <th>{t('attendance.status')}</th>
                <th>{t('attendance.notes')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher._id}>
                  <td>{teacher.name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['present', 'absent', 'late'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(teacher._id, status)}
                          className={`status-btn ${attendance[teacher._id]?.status === status ? `status-${status}` : ''}`}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: attendance[teacher._id]?.status === status 
                              ? (status === 'present' ? '#4caf50' : status === 'absent' ? '#f44336' : '#ff9800')
                              : '#f5f5f5',
                            color: attendance[teacher._id]?.status === status ? '#fff' : '#333',
                            fontWeight: attendance[teacher._id]?.status === status ? 'bold' : 'normal',
                            textTransform: 'capitalize'
                          }}
                        >
                          {t(`attendance.${status}`)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder={t('attendance.notes')}
                      value={attendance[teacher._id]?.notes || ''}
                      onChange={(e) => handleNotesChange(teacher._id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => handleSaveTeacher(teacher._id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#4caf50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {t('common.save')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;