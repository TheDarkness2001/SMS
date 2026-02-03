import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import axios from 'axios';
import { formatUZS } from '../utils/formatters';
import '../styles/AdminPayoutPanel.css';

/**
 * Admin Payout Management Panel - SIMPLIFIED VERSION
 * Record direct payments to staff members
 * NO WALLET/EARNINGS TRACKING - Just record when you pay teachers
 */
const AdminPayoutPanel = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [activeTab, setActiveTab] = useState('create');
  const [teachers, setTeachers] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    amount: '',
    method: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    bankDetails: {
      accountNumber: '',
      accountName: '',
      bankName: ''
    },
    notes: ''
  });

  const userRole = (user?.role || user?.userType || '').toLowerCase().trim();
  const hasAccess = ['admin', 'founder', 'manager'].includes(userRole);

  useEffect(() => {
    if (hasAccess) {
      fetchTeachers();
      fetchPayoutHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const fetchTeachers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const branchFilter = getBranchFilter();
      
      console.log('[AdminPayoutPanel] Fetching teachers with branch filter:', branchFilter);
      
      const response = await axios.get('/api/teachers', {
        headers: { Authorization: `Bearer ${token}` },
        params: branchFilter
      });
      setTeachers(response.data.data || []);
      console.log('[AdminPayoutPanel] Teachers loaded:', response.data.data?.length);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchPayoutHistory = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const branchFilter = getBranchFilter();
      
      console.log('[AdminPayoutPanel] Fetching payout history with branch filter:', branchFilter);
      
      const response = await axios.get('/api/salary-payouts', {
        headers: { Authorization: `Bearer ${token}` },
        params: branchFilter
      });
      setPayoutHistory(response.data.data || []);
      console.log('[AdminPayoutPanel] Payout history loaded:', response.data.data?.length);
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async (e) => {
    e.preventDefault();

    if (!formData.teacherId) {
      alert(t('earnings.chooseTeacher'));
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      alert(t('earnings.enterAmount'));
      return;
    }

    if (formData.method === 'bank-transfer' && !formData.bankDetails.accountNumber) {
      alert(t('payouts.bankDetailsRequired'));
      return;
    }

    const teacherName = teachers.find(t => t._id === formData.teacherId)?.name || t('common.noData');
    if (!window.confirm(t('payouts.recordConfirm', { amount: formatUZS(formData.amount * 100, language), name: teacherName }))) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.post('/api/salary-payouts', {
        staffId: formData.teacherId,
        amount: parseFloat(formData.amount) * 100, // Convert to tyiyn
        method: formData.method,
        paymentDate: formData.paymentDate,
        bankDetails: formData.method === 'bank-transfer' ? formData.bankDetails : undefined,
        notes: formData.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`✅ ${t('payouts.recordSuccess')}`);
      
      // Reset form
      setFormData({
        teacherId: '',
        amount: '',
        method: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        bankDetails: { accountNumber: '', accountName: '', bankName: '' },
        notes: ''
      });
      
      fetchPayoutHistory();
      setActiveTab('history');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleCompletePayout = async (payoutId) => {
    if (!window.confirm(t('payouts.completeConfirm'))) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.patch(`/api/salary-payouts/${payoutId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ ${t('payouts.completeSuccess')}`);
      fetchPayoutHistory();
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const handleCancelPayout = async (payoutId) => {
    const reason = prompt(t('payouts.cancelReason'));
    if (!reason || reason.length < 10) {
      alert(t('payouts.cancelReasonMin'));
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.patch(`/api/salary-payouts/${payoutId}/cancel`, {
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ ${t('payouts.cancelSuccess')}`);
      fetchPayoutHistory();
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#FFA500',
      completed: '#28a745',
      cancelled: '#6c757d'
    };
    return (
      <span 
        className="payout-panel__status-badge"
        style={{ backgroundColor: colors[status] }}
      >
        {t(`common.${status}`)}
      </span>
    );
  };

  if (!hasAccess) {
    return (
      <div className="payout-panel__container">
        <div className="payout-panel__access-denied">
          <h2>{t('earnings.accessDenied')}</h2>
          <p>{t('earnings.accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payout-panel__container">
      <div className="payout-panel__header">
        <div>
          <h1 className="payout-panel__title">{t('payouts.title')}</h1>
          <p className="payout-panel__subtitle">{t('payouts.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="payout-panel__tabs">
        <button
          className={`payout-panel__tab ${activeTab === 'create' ? 'payout-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          💵 {t('payouts.createPayout')}
        </button>
        <button
          className={`payout-panel__tab ${activeTab === 'history' ? 'payout-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 {t('payouts.payoutHistory')}
        </button>
      </div>

      {/* Create Payout Tab */}
      {activeTab === 'create' && (
        <div className="payout-panel__create-section">
          <form onSubmit={handleCreatePayout}>
            {/* Teacher Selection */}
            <div className="payout-panel__card">
              <h3>{t('payouts.selectTeacher')}</h3>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="payout-panel__select"
                required
              >
                <option value="">{t('earnings.chooseTeacher')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.teacherId} - {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Amount */}
            <div className="payout-panel__card">
              <h3>{t('payouts.paymentAmount')}</h3>
              <div className="payout-panel__form-group">
                <label>{t('payouts.amountSom')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers
                    if (value === '' || /^\d*$/.test(value)) {
                      setFormData({ ...formData, amount: value });
                    }
                  }}
                  placeholder={t('payouts.amountPlaceholder')}
                  required
                  className="payout-panel__input"
                />
              </div>
              <div className="payout-panel__form-group">
                <label>{t('payouts.paymentDate')}</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                  className="payout-panel__input"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="payout-panel__card">
              <h3>{t('payouts.paymentMethod')}</h3>
              <div className="payout-panel__form-group">
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="payout-panel__select"
                >
                  <option value="cash">💵 {t('payouts.cash')}</option>
                  <option value="bank-transfer">🏦 {t('payouts.bankTransfer')}</option>
                  <option value="uzcard">💳 {t('payouts.uzcard')}</option>
                  <option value="humo">💳 {t('payouts.humo')}</option>
                  <option value="card">💳 {t('payouts.card')}</option>
                </select>
              </div>

              {formData.method === 'bank-transfer' && (
                <div className="payout-panel__bank-details">
                  <div className="payout-panel__form-group">
                    <label>{t('payouts.accountNumber')}</label>
                    <input
                      type="text"
                      value={formData.bankDetails.accountNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                      })}
                      placeholder={t('payouts.accountNumber').replace(' *', '')}
                      required
                      className="payout-panel__input"
                    />
                  </div>
                  <div className="payout-panel__form-group">
                    <label>{t('payouts.accountName')}</label>
                    <input
                      type="text"
                      value={formData.bankDetails.accountName}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountName: e.target.value }
                      })}
                      placeholder={t('payouts.accountName')}
                      className="payout-panel__input"
                    />
                  </div>
                  <div className="payout-panel__form-group">
                    <label>{t('payouts.bankName')}</label>
                    <input
                      type="text"
                      value={formData.bankDetails.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                      })}
                      placeholder={t('payouts.bankName')}
                      className="payout-panel__input"
                    />
                  </div>
                </div>
              )}

              <div className="payout-panel__form-group">
                <label>{t('payouts.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('payouts.notesPlaceholder')}
                  rows="3"
                  className="payout-panel__textarea"
                />
              </div>
            </div>

            {/* Submit Button */}
            {formData.teacherId && formData.amount && (
              <div className="payout-panel__preview">
                <h3>💰 {t('payouts.paymentSummary')}</h3>
                <div className="payout-panel__preview-row">
                  <span>{t('attendance.teacher')}:</span>
                  <strong>{teachers.find(t => t._id === formData.teacherId)?.name || t('common.noData')}</strong>
                </div>
                <div className="payout-panel__preview-row">
                  <span>{t('payments.amount')}:</span>
                  <strong className="payout-panel__preview-amount">{formatUZS(formData.amount * 100, language)}</strong>
                </div>
                <div className="payout-panel__preview-row">
                  <span>{t('payouts.paymentDate')}:</span>
                  <strong>{new Date(formData.paymentDate).toLocaleDateString(t('common.locale'))}</strong>
                </div>
                <div className="payout-panel__preview-row">
                  <span>{t('payouts.paymentMethod')}:</span>
                  <strong>{t(`payouts.${formData.method.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`).toUpperCase()}</strong>
                </div>
                <button type="submit" className="payout-panel__submit-btn">
                  ✓ {t('payouts.recordPayment')}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Payout History Tab */}
      {activeTab === 'history' && (
        <div className="payout-panel__history-section">
          {loading ? (
            <div className="payout-panel__loading">{t('payouts.loadingHistory')}</div>
          ) : payoutHistory.length === 0 ? (
            <div className="payout-panel__empty">
              <p>📭 {t('payouts.noHistory')}</p>
            </div>
          ) : (
            <div className="payout-panel__table-container">
              <table className="payout-panel__table">
                <thead>
                  <tr>
                    <th>{t('payouts.payoutId')}</th>
                    <th>{t('attendance.teacher')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('payments.amount')}</th>
                    <th>{t('payouts.paymentMethod')}</th>
                    <th>{t('attendance.status')}</th>
                    <th>{t('attendance.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr key={payout._id}>
                      <td className="payout-panel__payout-id">{payout.payoutId}</td>
                      <td>{payout.staffId?.name || t('common.noData')}</td>
                      <td>{new Date(payout.createdAt).toLocaleDateString(t('common.locale'))}</td>
                      <td className="payout-panel__amount">{formatUZS(payout.amount, language)}</td>
                      <td>{t(`payouts.${payout.method.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`)}</td>
                      <td>{getStatusBadge(payout.status)}</td>
                      <td>
                        {payout.status === 'pending' && (
                          <div className="payout-panel__action-btns">
                            <button
                              onClick={() => handleCompletePayout(payout._id)}
                              className="payout-panel__action-btn payout-panel__action-btn--complete"
                              title={t('payouts.markAsCompleted')}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleCancelPayout(payout._id)}
                              className="payout-panel__action-btn payout-panel__action-btn--cancel"
                              title={t('payouts.cancelPayout')}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {payout.status === 'completed' && (
                          <span className="payout-panel__completed-text">{t('payouts.paid')} ✓</span>
                        )}
                        {payout.status === 'cancelled' && (
                          <span className="payout-panel__cancelled-text">{t('payouts.cancelled')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPayoutPanel;
