import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { feedbackAPI } from '../utils/api';
import { AiOutlineMessage } from 'react-icons/ai';
import { useLanguage } from '../context/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/StudentPages.css';

const StudentFeedbackPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedClassLevel, setSelectedClassLevel] = useState('all');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await feedbackAPI.getByStudent(user.id);
      const data = res.data.data || [];
      setFeedbacks(data);
      setFilteredFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  // Get unique subjects and class levels for filters
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(feedbacks.map(f => {
      const subjectName = f.subject?.name || f.subject;
      return typeof subjectName === 'string' ? subjectName : null;
    }).filter(Boolean))];
    return uniqueSubjects.sort();
  }, [feedbacks]);

  const classLevels = useMemo(() => {
    const uniqueLevels = [...new Set(feedbacks.map(f => f.classLevel).filter(Boolean))];
    return uniqueLevels.sort();
  }, [feedbacks]);

  // Filter feedbacks when filters change
  useEffect(() => {
    let filtered = feedbacks;

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(f => f.subject === selectedSubject);
    }

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(f => {
        const date = new Date(f.feedbackDate || f.createdAt);
        return (date.getMonth() + 1) === parseInt(selectedMonth);
      });
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(f => {
        const date = new Date(f.feedbackDate || f.createdAt);
        return date.getFullYear() === parseInt(selectedYear);
      });
    }

    if (selectedClassLevel !== 'all') {
      filtered = filtered.filter(f => f.classLevel === selectedClassLevel);
    }

    setFilteredFeedbacks(filtered);
  }, [selectedSubject, selectedMonth, selectedYear, selectedClassLevel, feedbacks]);

  // Calculate chart data - scores over time (by date)
  const chartData = useMemo(() => {
    const data = [];
    const dateScores = {};
    
    filteredFeedbacks.forEach(f => {
      const date = new Date(f.feedbackDate || f.createdAt);
      const dateKey = date.toLocaleDateString(t('common.locale') || 'en-US', { month: 'short', day: 'numeric' });
      
      if (!dateScores[dateKey]) {
        dateScores[dateKey] = { homework: [], participation: [], behavior: [] };
      }
      if (f.homework) dateScores[dateKey].homework.push(Number(f.homework));
      if (f.participation) dateScores[dateKey].participation.push(Number(f.participation));
      if (f.behavior) dateScores[dateKey].behavior.push(Number(f.behavior));
    });
    
    Object.entries(dateScores)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([date, scores]) => {
        const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
        data.push({
          date,
          homework: avg(scores.homework), // Keep as 0-10 scale
          participation: avg(scores.participation),
          behavior: avg(scores.behavior)
        });
      });
    
    return data;
  }, [filteredFeedbacks, t]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  return (
    <div className="student-page student-feedback-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('feedback.teacherFeedback')}</h1>
        <p className="student-page-subtitle">{t('feedback.viewFeedbackSubtitle')}</p>
      </div>

      {/* Filters - Row Layout */}
      <div className="feedback-filters" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('feedback.subject')}</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('feedback.allSubjects')}</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('feedback.classLevel')}</label>
            <select 
              value={selectedClassLevel} 
              onChange={(e) => setSelectedClassLevel(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('feedback.allLevels')}</option>
              {classLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('feedback.month')}</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('feedback.allMonths')}</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2024, i).toLocaleString(t('common.locale'), { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('feedback.year')}</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('feedback.allYears')}</option>
              {[2024, 2023, 2022, 2021].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { 
              setSelectedSubject('all'); 
              setSelectedClassLevel('all'); 
              setSelectedMonth('all'); 
              setSelectedYear('all'); 
            }}
            style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginBottom: '0' }}
          >
            {t('feedback.clearFilters')}
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 'clamp(14px, 4vw, 18px)', fontWeight: '600' }}>{t('feedback.overallCourseFeedback') || 'Overall Course Feedback'}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} ticks={[0, 2.5, 5, 7.5, 10]} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="homework" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name={t('feedback.homework') || 'Homework'} />
              <Line type="monotone" dataKey="participation" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name={t('feedback.participation') || 'Participation'} />
              <Line type="monotone" dataKey="behavior" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name={t('feedback.behavior') || 'Behavior'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="feedback-list">
        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>{t('feedback.feedbackRecords')} ({filteredFeedbacks.length})</h2>
        {filteredFeedbacks.length === 0 ? (
          <div className="no-data">
            <AiOutlineMessage size={48} />
            <p>{t('feedback.noFeedbackAvailable')}{selectedSubject !== 'all' || selectedMonth !== 'all' || selectedYear !== 'all' || selectedClassLevel !== 'all' ? t('feedback.forSelectedFilters') : t('feedback.yet')}</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback._id} className="feedback-card">
              <div className="feedback-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className="feedback-subject">{feedback.subject?.name || feedback.subject || t('common.unknown')}</div>
                  {feedback.classLevel && (
                    <span style={{ 
                      background: feedback.classLevel.toLowerCase().includes('retake') ? '#fef3c7' : '#dbeafe', 
                      color: feedback.classLevel.toLowerCase().includes('retake') ? '#92400e' : '#1e40af',
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '13px', 
                      fontWeight: '600' 
                    }}>
                      {feedback.classLevel}
                    </span>
                  )}
                </div>
                <div className="feedback-date">
                  {new Date(feedback.feedbackDate || feedback.createdAt).toLocaleDateString(t('common.locale'))}
                </div>
              </div>
              <div className="feedback-body">
                {feedback.isExamDay ? (
                  <div className="feedback-item exam-score-item">
                    <span className="label">🏆 {t('feedback.examScore')}:</span>
                    <span className="score-value">{feedback.examPercentage}%</span>
                  </div>
                ) : (
                  <>
                    {/* Homework Score */}
                    <div className="feedback-item">
                      <span className="label">📚 {t('feedback.homework')}:</span>
                      <span className="score-value">{feedback.homework || 0}%</span>
                    </div>
                    
                    {/* Behavior Score */}
                    <div className="feedback-item">
                      <span className="label">😊 {t('feedback.behavior')}:</span>
                      <span className="score-value">{feedback.behavior || 0}%</span>
                    </div>
                    
                    {/* Participation Score */}
                    <div className="feedback-item">
                      <span className="label">🙋 {t('feedback.participation')}:</span>
                      <span className="score-value">{feedback.participation || 0}%</span>
                    </div>
                  </>
                )}
                
                {/* Notes */}
                {feedback.notes && (
                  <div className="feedback-comment">
                    <span className="label">
                      {feedback.isExamDay ? `📝 ${t('feedback.examDay')} ${t('feedback.notes')}:` : `${t('feedback.notes')}:`}
                    </span>
                    <p>{feedback.notes}</p>
                  </div>
                )}
                
                {/* Teacher Name */}
                {feedback.teacher && (
                  <div className="feedback-teacher">
                    — {feedback.teacher?.name || t('feedback.teacher')}
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

export default StudentFeedbackPage;
