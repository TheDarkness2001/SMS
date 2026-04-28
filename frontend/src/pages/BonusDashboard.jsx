import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bonusAPI } from '../utils/api';
import '../styles/Homework.css';

const BonusDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await bonusAPI.calculate({
        year,
        month,
        branchId: user?.branchId || user?.branch
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error calculating bonuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await bonusAPI.getHistory({
        branchId: user?.branchId || user?.branch
      });
      if (res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const distribute = async () => {
    if (!data || data.topPresenters.length < 2) {
      alert(t('bonuses.notEnough') || 'Not enough presenters to distribute');
      return;
    }
    if (!window.confirm(t('bonuses.confirmDistribute') || 'Finalize and distribute bonuses?')) return;

    try {
      const first = data.topPresenters[0];
      const second = data.topPresenters[1];
      await bonusAPI.distribute({
        year,
        month,
        branchId: user?.branchId || user?.branch,
        firstPlaceStudentId: first.student?._id || first._id,
        secondPlaceStudentId: second.student?._id || second._id
      });
      alert(t('bonuses.distributed') || 'Bonuses distributed successfully');
      fetchData();
      fetchHistory();
    } catch (err) {
      console.error('Error distributing bonuses:', err);
      alert('Failed to distribute bonuses');
    }
  };

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h1>{t('bonuses.title') || 'Bonus Dashboard'}</h1>
      </div>

      <div className="filters-bar" style={{ marginBottom: '20px' }}>
        <div className="filter-item">
          <label>{t('common.year') || 'Year'}</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>{t('common.month') || 'Month'}</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading-state">{t('common.loading') || 'Loading...'}</div>}

      {data && (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="stat-label">{t('bonuses.totalPenalties') || 'Total Penalties'}</div>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {data.totalPenalties}
              </div>
            </div>
            <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="stat-label">{t('bonuses.firstPlace') || '1st Place (40%)'}</div>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {data.firstPlace.amount}
              </div>
            </div>
            <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="stat-label">{t('bonuses.secondPlace') || '2nd Place (30%)'}</div>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {data.secondPlace.amount}
              </div>
            </div>
            <div className="stat-card" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="stat-label">{t('bonuses.educationCenter') || 'Education Center (30%)'}</div>
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {data.educationCenter.amount}
              </div>
            </div>
          </div>

          <h3>{t('bonuses.topPresenters') || 'Top Presenters'}</h3>
          <table className="progress-table" style={{ marginBottom: '24px' }}>
            <thead>
              <tr>
                <th>{t('common.rank') || 'Rank'}</th>
                <th>{t('common.student') || 'Student'}</th>
                <th>{t('presentations.avgScore') || 'Avg Score'}</th>
                <th>{t('presentations.count') || 'Count'}</th>
              </tr>
            </thead>
            <tbody>
              {data.topPresenters.map((p, i) => (
                <tr key={p.student?._id || p._id || i}>
                  <td>#{i + 1}</td>
                  <td>{p.student?.name || p._id?.name || 'Unknown'}</td>
                  <td>{p.avgScore}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button className="btn btn-primary" onClick={distribute}>
              {t('bonuses.distribute') || 'Finalize & Distribute'}
            </button>
          </div>
        </>
      )}

      <h3>{t('bonuses.history') || 'History'}</h3>
      <table className="progress-table">
        <thead>
          <tr>
            <th>{t('common.month') || 'Month'}</th>
            <th>{t('bonuses.totalPenalties') || 'Total'}</th>
            <th>{t('bonuses.distributed') || 'Distributed'}</th>
            <th>{t('common.status') || 'Status'}</th>
            <th>{t('common.winners') || 'Winners'}</th>
          </tr>
        </thead>
        <tbody>
          {history.map(h => (
            <tr key={`${h.year}-${h.month}`}>
              <td>{h.year}-{h.month}</td>
              <td>{h.totalPenalties}</td>
              <td>{h.totalBonusesDistributed}</td>
              <td>{h.status}</td>
              <td>
                {h.winners?.map(w => (
                  <div key={w.rank}>
                    #{w.rank}: {w.studentId?.name || 'Unknown'} ({w.amount} pts)
                  </div>
                ))}
              </td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan="5" className="no-data">{t('common.noData') || 'No history'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BonusDashboard;
