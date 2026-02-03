import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { studentAttendanceAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineClockCircle } from 'react-icons/ai';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/StudentPages.css';

const StudentAttendancePage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchAttendance = useCallback(async () => {
    try {
      console.log('Fetching attendance for student:', user.id || user._id);
      const res = await studentAttendanceAPI.getByStudent(user.id || user._id);
      const records = res.data.data || [];
      console.log('Fetched attendance records:', records.length);
      setAttendanceRecords(records);
      setFilteredRecords(records);

      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const total = records.length;

      setStats({
        total,
        present,
        absent,
        late,
        percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      console.error('Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  }, [user.id, user._id]);

  // Filter records when month/year changes
  useEffect(() => {
    let filtered = attendanceRecords;

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(r => {
        const date = new Date(r.date);
        return (date.getMonth() + 1) === parseInt(selectedMonth);
      });
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(r => {
        const date = new Date(r.date);
        return date.getFullYear() === parseInt(selectedYear);
      });
    }

    setFilteredRecords(filtered);

    // Recalculate stats for filtered data
    const present = filtered.filter(r => r.status === 'present').length;
    const absent = filtered.filter(r => r.status === 'absent').length;
    const late = filtered.filter(r => r.status === 'late').length;
    const total = filtered.length;

    setStats({
      total,
      present,
      absent,
      late,
      percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
    });
  }, [selectedMonth, selectedYear, attendanceRecords]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Calculate monthly chart data
  const monthlyChartData = useMemo(() => {
    const data = [];
    const currentYear = parseInt(selectedYear !== 'all' ? selectedYear : new Date().getFullYear());
    
    for (let month = 0; month < 12; month++) {
      const monthRecords = attendanceRecords.filter(r => {
        const date = new Date(r.date);
        return date.getFullYear() === currentYear && date.getMonth() === month;
      });
      
      const present = monthRecords.filter(r => r.status === 'present').length;
      const absent = monthRecords.filter(r => r.status === 'absent').length;
      const late = monthRecords.filter(r => r.status === 'late').length;
      
      data.push({
        month: new Date(2024, month).toLocaleString(t('common.locale') || 'en-US', { month: 'short' }),
        Present: present,
        Absent: absent,
        Late: late
      });
    }
    return data;
  }, [attendanceRecords, selectedYear, t]);

  // Calculate yearly overview (last 12 months)
  const yearlyChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthRecords = attendanceRecords.filter(r => {
        const date = new Date(r.date);
        return date.getFullYear() === targetDate.getFullYear() && 
               date.getMonth() === targetDate.getMonth();
      });
      
      const total = monthRecords.length;
      const present = monthRecords.filter(r => r.status === 'present').length;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      
      data.push({
        month: targetDate.toLocaleString(t('common.locale') || 'en-US', { month: 'short', year: '2-digit' }),
        'Attendance %': parseFloat(percentage)
      });
    }
    return data;
  }, [attendanceRecords, t]);

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  return (
    <div className="student-page student-attendance-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('attendance.myAttendance')}</h1>
        <p className="student-page-subtitle">{t('attendance.attendanceHistory')}</p>
      </div>

      {/* Filters */}
      <div className="attendance-filters" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('attendance.filterByDate')}</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
          >
            <option value="all">{t('attendance.allSubjects')}</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(2024, i).toLocaleString(t('common.locale') || 'en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('attendance.filterByYear')}</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
          >
            <option value="all">{t('attendance.allYears')}</option>
            {[2024, 2023, 2022, 2021].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setSelectedMonth('all'); setSelectedYear(new Date().getFullYear().toString()); }}
          style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginTop: 'auto' }}
        >
          {t('attendance.resetFilters')}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="attendance-stats">
        <div className="stat-box present-box">
          <AiOutlineCheckCircle size={24} />
          <div className="stat-info">
            <div className="stat-number">{stats.present}</div>
            <div className="stat-label">{t('attendance.present')}</div>
          </div>
        </div>
        <div className="stat-box absent-box">
          <AiOutlineCloseCircle size={24} />
          <div className="stat-info">
            <div className="stat-number">{stats.absent}</div>
            <div className="stat-label">{t('attendance.absent')}</div>
          </div>
        </div>
        <div className="stat-box late-box">
          <AiOutlineClockCircle size={24} />
          <div className="stat-info">
            <div className="stat-number">{stats.late}</div>
            <div className="stat-label">{t('attendance.leave')}</div>
          </div>
        </div>
        <div className="stat-box percentage-box">
          <div className="percentage-circle">{stats.percentage}%</div>
          <div className="stat-label">{t('attendance.attendanceRate')}</div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>{t('attendance.attendanceRecord')} ({selectedYear !== 'all' ? selectedYear : new Date().getFullYear()})</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Present" fill="#10b981" />
            <Bar dataKey="Absent" fill="#ef4444" />
            <Bar dataKey="Late" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Overview Chart */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>{t('attendance.attendanceTrend')}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yearlyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Attendance %" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance Records */}
      <div className="attendance-records">
        <h2 className="section-title">{t('attendance.historyWithCount', { count: filteredRecords.length })}</h2>
        {filteredRecords.length === 0 ? (
          <p className="no-data">{t('attendance.noRecordsFound')}</p>
        ) : (
          <div className="records-list">
            {filteredRecords.map((record) => (
              <div key={record._id} className="attendance-record-card">
                <div className="record-date">
                  {new Date(record.date).toLocaleDateString(t('common.locale') || 'en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="record-subject">{record.subject || t('common.unknown')}</div>
                <div className={`record-status status-${record.status}`}>
                  {t(`attendance.${record.status}`)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendancePage;
