import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { examsAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineTrophy } from 'react-icons/ai';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../styles/StudentPages.css';

const StudentResultsPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchExams = useCallback(async () => {
    try {
      const res = await examsAPI.getStudentExams(user.id);
      setExams(res.data.data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Filter completed exams with results
  const completedExams = useMemo(() => {
    let filtered = exams.filter(e => {
      return e.result && (e.result.marksObtained > 0 || e.result.grade);
    });

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(e => e.subject === selectedSubject);
    }

    return filtered.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
  }, [exams, selectedSubject]);

  // Get unique subjects
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(exams.map(e => e.subject).filter(Boolean))];
    return uniqueSubjects.sort();
  }, [exams]);

  // Calculate stats
  const stats = useMemo(() => {
    const passed = completedExams.filter(e => e.result?.marksObtained >= e.passingMarks).length;
    const failed = completedExams.length - passed;
    const avgPercentage = completedExams.length > 0 
      ? (completedExams.reduce((sum, e) => sum + ((e.result?.marksObtained / e.totalMarks) * 100), 0) / completedExams.length).toFixed(1)
      : 0;

    return { total: completedExams.length, passed, failed, avgPercentage };
  }, [completedExams]);

  // Chart data: Performance over time
  const performanceData = useMemo(() => {
    return completedExams.slice(0, 10).reverse().map(exam => ({
      name: exam.examName.substring(0, 15) + (exam.examName.length > 15 ? '...' : ''),
      [t('exams.percentage')]: ((exam.result?.marksObtained / exam.totalMarks) * 100).toFixed(1),
      [t('exams.passMarks')]: ((exam.passingMarks / exam.totalMarks) * 100).toFixed(1)
    }));
  }, [completedExams, t]);

  // Subject-wise performance
  const subjectPerformance = useMemo(() => {
    const subjectMap = {};
    completedExams.forEach(exam => {
      if (!subjectMap[exam.subject]) {
        subjectMap[exam.subject] = { total: 0, marks: 0, count: 0 };
      }
      subjectMap[exam.subject].marks += exam.result?.marksObtained || 0;
      subjectMap[exam.subject].total += exam.totalMarks;
      subjectMap[exam.subject].count += 1;
    });

    return Object.keys(subjectMap).map(subject => ({
      subject,
      [t('exams.percentage')]: ((subjectMap[subject].marks / subjectMap[subject].total) * 100).toFixed(1),
      exams: subjectMap[subject].count
    }));
  }, [completedExams, t]);

  // Pass/Fail pie chart
  const pieData = [
    { name: t('exams.passed'), value: stats.passed, color: '#10b981' },
    { name: t('exams.failed'), value: stats.failed, color: '#ef4444' }
  ];

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  return (
    <div className="student-page student-results-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('exams.examResults')}</h1>
        <p className="student-page-subtitle">{t('exams.viewResults')}</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{t('exams.title')}</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{t('exams.passed')}</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{stats.passed}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{t('exams.failed')}</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{stats.failed}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{t('exams.percentage')}</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>{stats.avgPercentage}%</div>
        </div>
      </div>

      {/* Charts Section */}
      {completedExams.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Performance Trend */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 0 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 'clamp(14px, 4vw, 18px)', fontWeight: '600' }}>{t('exams.examResults')}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} stroke="#666" style={{ fontSize: '11px' }} />
                <YAxis domain={[0, 100]} stroke="#666" style={{ fontSize: '11px' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey={t('exams.percentage')} stroke="#3b82f6" strokeWidth={2} name={t('exams.percentage')} />
                <Line type="monotone" dataKey={t('exams.passMarks')} stroke="#f59e0b" strokeDasharray="5 5" name={t('exams.passMarks')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pass/Fail Distribution */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 0 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 'clamp(14px, 4vw, 18px)', fontWeight: '600' }}>{t('exams.passed')}/{t('exams.failed')}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subject-wise Performance */}
      {subjectPerformance.length > 0 && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>{t('exams.subject')} {t('exams.percentage')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" stroke="#666" style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 100]} stroke="#666" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey={t('exams.percentage')} fill="#3b82f6" name={t('exams.percentage')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter */}
      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('attendance.filterBySubject')}</label>
        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{ width: '100%', maxWidth: '300px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
        >
          <option value="all">{t('attendance.allSubjects')}</option>
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>

      {/* Results List */}
      <div className="results-list">
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>{t('exams.results')} ({completedExams.length})</h2>
        {completedExams.length === 0 ? (
          <div className="no-data">
            <AiOutlineTrophy size={48} />
            <p>{t('exams.noExams')}{selectedSubject !== 'all' ? ' ' + t('attendance.filterBySubject') : ''}</p>
          </div>
        ) : (
          completedExams.map((exam) => (
            <div key={exam._id} className="result-card">
              <div className="result-header">
                <h3 className="exam-name">{exam.examName}</h3>
                <div className={`result-status ${exam.result?.marksObtained >= exam.passingMarks ? 'pass' : 'fail'}`}>
                  {exam.result?.marksObtained >= exam.passingMarks ? t('exams.passed').toUpperCase() : t('exams.failed').toUpperCase()}
                </div>
              </div>
              <div className="result-body">
                <div className="result-item">
                  <span>{t('exams.subject')}:</span>
                  <strong>{exam.subject}</strong>
                </div>
                <div className="result-item">
                  <span>{t('exams.obtainedMarks')}:</span>
                  <strong>{exam.result?.marksObtained || 0} / {exam.totalMarks}</strong>
                </div>
                <div className="result-item">
                  <span>{t('exams.percentage')}:</span>
                  <strong>{((exam.result?.marksObtained / exam.totalMarks) * 100).toFixed(1)}%</strong>
                </div>
                <div className="result-item">
                  <span>{t('dashboard.grade')}:</span>
                  <strong className="grade">{exam.result?.grade || t('common.noData')}</strong>
                </div>
                <div className="result-item">
                  <span>{t('exams.examDate')}:</span>
                  <strong>{new Date(exam.examDate).toLocaleDateString(t('common.locale'))}</strong>
                </div>
                {exam.result?.remarks && (
                  <div className="result-item" style={{ gridColumn: '1 / -1' }}>
                    <span>{t('attendance.notes')}:</span>
                    <strong>{exam.result.remarks}</strong>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentResultsPage;
