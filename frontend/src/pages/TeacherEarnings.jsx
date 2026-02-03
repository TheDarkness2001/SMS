import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTeacherEarnings, getTeacherEarningsSummary, getSalaryPayoutHistory } from '../api/teacherEarnings';
import { createSalaryPayout, markEarningsAsPaid } from '../api/teacherEarnings';
import { TransactionHistoryTable } from '../components/TransactionHistoryTable';
import { Modal } from '../components/Modal';
import { formatUZS } from '../utils/formatters';
import '../styles/TeacherEarnings.css';
import '../styles/Modal.css';

export const TeacherEarnings = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState({ totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, paid, history
  const [selectedEarnings, setSelectedEarnings] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const loadEarnings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTeacherEarnings(user._id, { status: 'pending' });
      setEarnings(response.data.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await getTeacherEarningsSummary(user._id, activeTab);
      setSummary(response.data.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [user, activeTab]);

  const loadPayoutHistory = useCallback(async () => {
    try {
      const response = await getSalaryPayoutHistory(user._id);
      setPayoutHistory(response.data.data);
    } catch (error) {
      console.error('Error loading payout history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadEarnings();
      loadSummary();
      loadPayoutHistory();
    }
  }, [user, loadEarnings, loadSummary, loadPayoutHistory]);

  const handleEarningToggle = (earningId) => {
    setSelectedEarnings(prev => 
      prev.includes(earningId)
        ? prev.filter(id => id !== earningId)
        : [...prev, earningId]
    );
  };

  const handleMarkAsPaid = async () => {
    if (selectedEarnings.length === 0) {
      alert(t('staffEarnings.selectEarningError'));
      return;
    }

    try {
      await markEarningsAsPaid({
        earningIds: selectedEarnings,
        teacherId: user._id,
        paymentMethod: 'bank-transfer',
        referenceNumber: `PAY-${Date.now()}`,
        notes: t('staffEarnings.salaryPayment')
      });
      
      // Refresh data
      loadEarnings();
      loadSummary();
      loadPayoutHistory();
      setSelectedEarnings([]);
      setShowPayoutModal(false);
    } catch (error) {
      console.error('Error marking earnings as paid:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(t('common.locale') || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  if (loading) {
    return (
      <div className="teacher-earnings__loading">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="teacher-earnings__container">
      <div className="teacher-earnings__header">
        <h1 className="teacher-earnings__title">{t('staffEarnings.earningDashboard')}</h1>
      </div>

      <div className="teacher-earnings__summary">
        <div className="teacher-earnings__summary-card">
          <h3 className="teacher-earnings__summary-title">{t('staffEarnings.todaysEarnings')}</h3>
          <p className="teacher-earnings__summary-amount">
            {formatUZS(summary.totalEarnings * 100, language)}
          </p>
        </div>
        <div className="teacher-earnings__summary-card">
          <h3 className="teacher-earnings__summary-title">{t('staffEarnings.pendingApproval')}</h3>
          <p className="teacher-earnings__summary-amount">
            {formatUZS(summary.pendingEarnings * 100, language)}
          </p>
        </div>
        <div className="teacher-earnings__summary-card">
          <h3 className="teacher-earnings__summary-title">{t('staffEarnings.paidThisMonth')}</h3>
          <p className="teacher-earnings__summary-amount">
            {formatUZS(summary.paidEarnings * 100, language)}
          </p>
        </div>
      </div>

      <div className="teacher-earnings__tabs">
        <button 
          className={`teacher-earnings__tab ${activeTab === 'daily' ? 'teacher-earnings__tab--active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          {t('staffEarnings.daily')}
        </button>
        <button 
          className={`teacher-earnings__tab ${activeTab === 'weekly' ? 'teacher-earnings__tab--active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          {t('staffEarnings.weekly')}
        </button>
        <button 
          className={`teacher-earnings__tab ${activeTab === 'monthly' ? 'teacher-earnings__tab--active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          {t('staffEarnings.monthly')}
        </button>
      </div>

      <div className="teacher-earnings__actions">
        <button 
          className="teacher-earnings__payout-btn"
          onClick={() => setShowPayoutModal(true)}
          disabled={selectedEarnings.length === 0}
        >
          {t('staffEarnings.markSelectedPaid', { count: selectedEarnings.length })}
        </button>
      </div>

      <div className="teacher-earnings__earnings-list">
        <h2 className="teacher-earnings__section-title">{t('staffEarnings.pendingApproval')}</h2>
        
        {earnings.length === 0 ? (
          <div className="teacher-earnings__empty">
            <p>{t('staffEarnings.earningsNotFound')}</p>
          </div>
        ) : (
          <div className="teacher-earnings__table-container">
            <table className="teacher-earnings__table">
              <thead className="teacher-earnings__thead">
                <tr>
                  <th className="teacher-earnings__header">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEarnings(earnings.map(e => e._id));
                        } else {
                          setSelectedEarnings([]);
                        }
                      }}
                      checked={selectedEarnings.length === earnings.length && earnings.length > 0}
                    />
                  </th>
                  <th className="teacher-earnings__header">{t('attendance.date')}</th>
                  <th className="teacher-earnings__header">{t('attendance.subject')}</th>
                  <th className="teacher-earnings__header">{t('attendance.class')}</th>
                  <th className="teacher-earnings__header">{t('staffEarnings.amount')}</th>
                  <th className="teacher-earnings__header">{t('common.status')}</th>
                  <th className="teacher-earnings__header">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="teacher-earnings__tbody">
                {earnings.map((earning) => (
                  <tr key={earning._id} className="teacher-earnings__row">
                    <td className="teacher-earnings__cell">
                      <input
                        type="checkbox"
                        checked={selectedEarnings.includes(earning._id)}
                        onChange={() => handleEarningToggle(earning._id)}
                      />
                    </td>
                    <td className="teacher-earnings__cell">
                      {formatDate(earning.classDate)}
                    </td>
                    <td className="teacher-earnings__cell">
                      {earning.subject}
                    </td>
                    <td className="teacher-earnings__cell">
                      {earning.classId || 'N/A'}
                    </td>
                    <td className="teacher-earnings__cell">
                      {formatUZS(earning.amount * 100, language)}
                    </td>
                    <td className="teacher-earnings__cell">
                      <span className={`teacher-earnings__status teacher-earnings__status--${earning.status}`}>
                        {t(`common.${earning.status}`)}
                      </span>
                    </td>
                    <td className="teacher-earnings__cell">
                      <button 
                        className="teacher-earnings__view-btn"
                        onClick={() => console.log('View earning:', earning)}
                      >
                        {t('common.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="teacher-earnings__payout-history">
        <h2 className="teacher-earnings__section-title">{t('staffEarnings.salaryPayoutHistory')}</h2>
        
        {payoutHistory.length === 0 ? (
          <div className="teacher-earnings__empty">
            <p>{t('staffEarnings.noPayoutHistory')}</p>
          </div>
        ) : (
          <div className="teacher-earnings__history-list">
            {payoutHistory.map((payout) => (
              <div key={payout._id} className="teacher-earnings__history-item">
                <div className="teacher-earnings__history-header">
                  <span className="teacher-earnings__history-date">
                    {formatDate(payout.paidDate)}
                  </span>
                  <span className="teacher-earnings__history-amount">
                    {formatUZS(payout.totalAmount * 100, language)}
                  </span>
                </div>
                <div className="teacher-earnings__history-details">
                  <p><strong>{t('staffEarnings.paymentMethod')}:</strong> {payout.paymentMethod}</p>
                  <p><strong>{t('staffEarnings.reference')}:</strong> {payout.referenceNumber || 'N/A'}</p>
                  <p><strong>{t('staffEarnings.by')}:</strong> {payout.paidBy?.name || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Confirmation Modal */}
      {showPayoutModal && (
        <div className="teacher-earnings__modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="teacher-earnings__modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-earnings__modal-header">
              <h3>{t('staffEarnings.confirmSalaryPayment')}</h3>
              <button className="teacher-earnings__modal-close" onClick={() => setShowPayoutModal(false)}>
                ×
              </button>
            </div>
            <div className="teacher-earnings__modal-body">
              <p>{t('staffEarnings.selectedEarnings')}: {selectedEarnings.length}</p>
              <p>{t('staffEarnings.totalAmount')}: {formatUZS(earnings
                .filter(e => selectedEarnings.includes(e._id))
                .reduce((sum, e) => sum + e.amount, 0) * 100, language)}</p>
              <p>{t('staffEarnings.paymentMethod')}: Bank Transfer</p>
            </div>
            <div className="teacher-earnings__modal-footer">
              <button className="teacher-earnings__modal-cancel" onClick={() => setShowPayoutModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="teacher-earnings__modal-confirm" onClick={handleMarkAsPaid}>
                {t('staffEarnings.confirmPayment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
