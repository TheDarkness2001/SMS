import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { examsAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { AiOutlineFileText, AiOutlineCalendar } from 'react-icons/ai';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/StudentPages.css';

const StudentExamsPage = () => {
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

  // Filter upcoming exams
  const upcomingExams = useMemo(() => {
    let filtered = exams.filter(e => e.status === 'scheduled' && new Date(e.examDate) > new Date());
    
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(e => e.subject === selectedSubject);
    }
    
    return filtered.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  }, [exams, selectedSubject]);

  // Get unique subjects
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(exams.map(e => e.subject).filter(Boolean))];
    return uniqueSubjects.sort();
  }, [exams]);

  // Chart data: Upcoming exams by subject
  const subjectChartData = useMemo(() => {
    const subjectMap = {};
    upcomingExams.forEach(exam => {
      subjectMap[exam.subject] = (subjectMap[exam.subject] || 0) + 1;
    });
    return Object.keys(subjectMap).map(subject => ({
      subject,
      count: subjectMap[subject]
    }));
  }, [upcomingExams]);

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  return (
    <div className="student-page student-exams-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('exams.upcomingExams')}</h1>
        <p className="student-page-subtitle">{t('exams.myExams')}</p>
      </div>

      {/* Stats Card */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('exams.upcomingExams')}</div>
        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '4px' }}>{upcomingExams.length}</div>
        <div style={{ fontSize: '13px', opacity: '0.85' }}>{t('exams.noUpcomingExams')}</div>
      </div>

      {/* Chart: Exams by Subject */}
      {subjectChartData.length > 0 && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>{t('exams.subject')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name={t('exams.upcomingExams')} />
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

      {/* Exams List */}
      <div className="exams-list">
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>{t('exams.myExams')} ({upcomingExams.length})</h2>
          {upcomingExams.length === 0 ? (
            <div className="no-data">
              <AiOutlineCalendar size={48} />
              <p>{t('exams.noUpcomingExams')}{selectedSubject !== 'all' ? ' ' + t('attendance.filterBySubject') : ''}</p>
            </div>
          ) : (
            upcomingExams.map((exam) => (
              <div key={exam._id} className="exam-card">
                <div className="exam-icon">
                  <AiOutlineFileText size={24} />
                </div>
                <div className="exam-details">
                  <h3 className="exam-name">{exam.examName}</h3>
                  <div className="exam-info">
                    <span>{t('exams.subject')}: {exam.subject}</span>
                    <span>{t('exams.date')}: {new Date(exam.examDate).toLocaleDateString(t('common.locale'))}</span>
                    <span>{t('attendance.classTime')}: {exam.startTime}</span>
                    <span>{t('exams.duration')}: {exam.duration} {t('common.min')}</span>
                  </div>
                  <div className="exam-marks">
                    {t('exams.totalMarks')}: {exam.totalMarks} | {t('exams.passMarks')}: {exam.passingMarks}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  export default StudentExamsPage;
