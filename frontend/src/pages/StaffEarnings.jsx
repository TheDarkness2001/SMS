import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { api } from '../utils/api';
import { formatUZS } from '../utils/formatters';
import '../styles/StaffEarnings.css';

/**
 * Staff Earnings Page (Teacher View)
 * READ-ONLY view for teachers to see their earnings
 * Teachers cannot create, edit, or approve earnings
 */
const StaffEarnings = () => {
  const { t, language } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [account, setAccount] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, paid
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dateRange, selectedBranch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const branchFilter = getBranchFilter();
      
      console.log('[StaffEarnings] Fetching with branch filter:', branchFilter);
      
      // Fetch account summary
      const accountRes = await api.get('/staff-earnings/account', {
        params: branchFilter
      });
      console.log('[StaffEarnings] Account response:', accountRes.data);
      setAccount(accountRes.data.data || null);
      
      // Fetch earnings with filters
      const params = {
        ...branchFilter
      };
      if (filter !== 'all') params.status = filter;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      
      console.log('[StaffEarnings] Fetching earnings with params:', params);
      const earningsRes = await api.get('/staff-earnings', { params });
      console.log('[StaffEarnings] Earnings response:', earningsRes.data);
      
      const earningsData = earningsRes.data.data || [];
      setEarnings(earningsData);
      console.log('[StaffEarnings] Loaded earnings:', earningsData.length);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      alert(error.response?.data?.message || 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#FFA500',    // Orange
      approved: '#28a745',   // Green
      paid: '#007bff',       // Blue
      cancelled: '#6c757d'   // Gray
    };
    
    return (
      <span 
        className="staff-earnings__status-badge"
        style={{ backgroundColor: colors[status] || '#6c757d' }}
      >
        {t(`common.${status}`)}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    const icons = {
      'per-class': '📚',
      'hourly': '⏰',
      'commission': '💰',
      'bonus': '🎁',
      'adjustment': '🔧',
      'penalty': '⚠️'
    };
    return icons[type] || '💵';
  };

  if (loading) {
    return (
      <div className="staff-earnings__container">
        <div className="staff-earnings__loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="staff-earnings__container">
      <div className="staff-earnings__header">
        <h1 className="staff-earnings__title">{t('staffEarnings.title')}</h1>
        <p className="staff-earnings__subtitle">{t('staffEarnings.subtitle')}</p>
      </div>

      {/* Account Summary Cards */}
      {account && (
        <div className="staff-earnings__summary">
          <div className="staff-earnings__summary-card staff-earnings__summary-card--primary">
            <div className="staff-earnings__summary-label">{t('staffEarnings.totalEarned')}</div>
            <div className="staff-earnings__summary-value">{formatUZS(account.totalEarned, language)}</div>
            <div className="staff-earnings__summary-note">{t('staffEarnings.lifetimeEarnings')}</div>
          </div>

          <div className="staff-earnings__summary-card staff-earnings__summary-card--success">
            <div className="staff-earnings__summary-label">{t('staffEarnings.availableForPayout')}</div>
            <div className="staff-earnings__summary-value">{formatUZS(account.availableForPayout, language)}</div>
            <div className="staff-earnings__summary-note">{t('staffEarnings.readyToWithdraw')}</div>
          </div>

          <div className="staff-earnings__summary-card staff-earnings__summary-card--warning">
            <div className="staff-earnings__summary-label">{t('staffEarnings.pendingApproval')}</div>
            <div className="staff-earnings__summary-value">{formatUZS(account.pendingEarnings, language)}</div>
            <div className="staff-earnings__summary-note">{t('staffEarnings.awaitingApproval')}</div>
          </div>

          <div className="staff-earnings__summary-card staff-earnings__summary-card--info">
            <div className="staff-earnings__summary-label">{t('staffEarnings.totalPaidOut')}</div>
            <div className="staff-earnings__summary-value">{formatUZS(account.totalPaidOut, language)}</div>
            <div className="staff-earnings__summary-note">{t('staffEarnings.alreadyReceived')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="staff-earnings__filters">
        <div className="staff-earnings__filter-group">
          <label>{t('staffEarnings.status')}</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="staff-earnings__filter-select"
          >
            <option value="all">{t('staffEarnings.allStatus')}</option>
            <option value="pending">{t('common.pending')}</option>
            <option value="approved">{t('common.approved')}</option>
            <option value="paid">{t('common.paid')}</option>
          </select>
        </div>

        <div className="staff-earnings__filter-group">
          <label>{t('revenue.from')}:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="staff-earnings__filter-input"
          />
        </div>

        <div className="staff-earnings__filter-group">
          <label>{t('revenue.to')}:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="staff-earnings__filter-input"
          />
        </div>

        <button onClick={fetchData} className="staff-earnings__filter-btn">
          🔄 {t('common.refresh')}
        </button>
      </div>

      {/* Earnings Table */}
      <div className="staff-earnings__table-container">
        {earnings.length === 0 ? (
          <div className="staff-earnings__empty">
            <p>📭 {t('staffEarnings.earningsNotFound')}</p>
            <small>{t('staffEarnings.earningsAppearHint')}</small>
          </div>
        ) : (
          <table className="staff-earnings__table">
            <thead>
              <tr>
                <th>{t('attendance.date')}</th>
                <th>{t('staffEarnings.type')}</th>
                <th>{t('staffEarnings.description')}</th>
                <th>{t('staffEarnings.amount')}</th>
                <th>{t('common.status')}</th>
                <th>{t('staffEarnings.approvedBy')}</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((earning) => (
                <tr key={earning._id}>
                  <td>
                    {new Date(earning.referenceDate).toLocaleDateString(t('common.locale'))}
                  </td>
                  <td>
                    <span className="staff-earnings__type">
                      {getTypeIcon(earning.earningType)} {t(`earnings.${earning.earningType}`) !== `earnings.${earning.earningType}` ? t(`earnings.${earning.earningType}`) : earning.earningType}
                    </span>
                  </td>
                  <td>{earning.description || t('common.noData')}</td>
                  <td className={earning.amount < 0 ? 'staff-earnings__amount--negative' : 'staff-earnings__amount--positive'}>
                    {formatUZS(Math.abs(earning.amount), language)}
                    {earning.amount < 0 && ` (${t('staffEarnings.deduction')})`}
                  </td>
                  <td>{getStatusBadge(earning.status)}</td>
                  <td>
                    {earning.approvedBy ? (
                      <span>{earning.approvedBy.name || t('common.admin')}</span>
                    ) : (
                      <span className="staff-earnings__pending-text">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="staff-earnings__info-box">
        <h3>ℹ️ {t('staffEarnings.aboutYourEarnings')}</h3>
        <ul>
          <li><strong>{t('common.pending')}:</strong> {t('staffEarnings.pendingDesc')}</li>
          <li><strong>{t('common.approved')}:</strong> {t('staffEarnings.approvedDesc')}</li>
          <li><strong>{t('common.paid')}:</strong> {t('staffEarnings.paidDesc')}</li>
          <li><strong>{t('sidebar.finance')}:</strong> {t('staffEarnings.payoutsDesc')}</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffEarnings;
