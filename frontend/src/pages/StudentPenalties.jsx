import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { penaltyAPI } from '../utils/api';
import '../styles/Homework.css';

const StudentPenalties = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [penalties, setPenalties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?._id) {
      fetchPenalties();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await penaltyAPI.getStudentPenalties(user._id, {
        year: selectedYear,
        month: selectedMonth
      });
      if (res.data.success) {
        setPenalties(res.data.data.penalties || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching penalties:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      spoken_uzbek: t('penalties.spokenUzbek') || 'Uzbek Word',
      missed_presentation: t('penalties.missedPresentation') || 'Missed Presentation',
      missed_writing_homework: t('penalties.missedHomework') || 'Missed Homework',
      missed_word_memorization: t('penalties.missedMemorization') || 'Missed Memorization',
      bonus: t('penalties.bonus') || 'Bonus'
    };
    return labels[type] || type;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h1>{t('penalties.myPenalties') || 'My Penalties'}</h1>
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
          <div className="stat-label">{t('penalties.total') || 'Total'}</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: total < 0 ? '#ef4444' : '#22c55e' }}>
            {total > 0 ? '+' : ''}{total}
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">{t('common.loading') || 'Loading...'}</div>}

      {!loading && penalties.length === 0 && (
        <div className="no-data">{t('penalties.noPenalties') || 'No penalties this month'}</div>
      )}

      {!loading && penalties.length > 0 && (
        <table className="progress-table">
          <thead>
            <tr>
              <th>{t('common.date') || 'Date'}</th>
              <th>{t('common.type') || 'Type'}</th>
              <th>{t('common.points') || 'Points'}</th>
              <th>{t('common.notes') || 'Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {penalties.map(p => (
              <tr key={p._id}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td>{getTypeLabel(p.type)}</td>
                <td style={{ color: p.points < 0 ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                  {p.points > 0 ? '+' : ''}{p.points * p.quantity}
                </td>
                <td>{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentPenalties;
