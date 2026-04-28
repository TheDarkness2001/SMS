import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { presentationAPI } from '../utils/api';
import '../styles/Homework.css';

const StudentPresentations = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [presentations, setPresentations] = useState([]);
  const [avgScore, setAvgScore] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?._id) {
      fetchPresentations();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchPresentations = async () => {
    setLoading(true);
    try {
      const res = await presentationAPI.getStudentPresentations(user._id, {
        year: selectedYear,
        month: selectedMonth
      });
      if (res.data.success) {
        setPresentations(res.data.data.presentations || []);
        setAvgScore(res.data.data.avgScore || 0);
        setCount(res.data.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching presentations:', err);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h1>{t('presentations.myPresentations') || 'My Presentations'}</h1>
      </div>

      <div className="filters-bar" style={{ marginBottom: '20px' }}>
        <div className="filter-item">
          <label>{t('common.year') || 'Year'}</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>{t('common.month') || 'Month'}</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="stat-label">{t('presentations.avgScore') || 'Average Score'}</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {avgScore}
          </div>
        </div>
        <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="stat-label">{t('presentations.count') || 'Total Presentations'}</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {count}
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">{t('common.loading') || 'Loading...'}</div>}

      {!loading && presentations.length === 0 && (
        <div className="no-data">{t('presentations.noPresentations') || 'No presentations this month'}</div>
      )}

      {!loading && presentations.length > 0 && (
        <table className="progress-table">
          <thead>
            <tr>
              <th>{t('common.date') || 'Date'}</th>
              <th>{t('presentations.score') || 'Score'}</th>
              <th>{t('presentations.notes') || 'Notes'}</th>
              <th>{t('presentations.evaluator') || 'Evaluator'}</th>
            </tr>
          </thead>
          <tbody>
            {presentations.map(p => (
              <tr key={p._id}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 'bold', color: p.score >= 8 ? '#22c55e' : p.score >= 5 ? '#f59e0b' : '#ef4444' }}>
                  {p.score}
                </td>
                <td>{p.notes}</td>
                <td>{p.evaluatedBy?.name || 'Teacher'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentPresentations;
