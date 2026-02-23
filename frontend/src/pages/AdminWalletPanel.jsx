import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { formatUZS, getTransactionStatusColor } from '../utils/formatters';
import '../styles/AdminWalletPanel.css';

const AdminWalletPanel = () => {
  const { user: authUser } = useAuth();
  // Use sessionStorage as fallback for role (same pattern as Teachers.jsx)
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const user = authUser?.role ? authUser : sessionUser;
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending-topups');
  const [pendingTopUps, setPendingTopUps] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'penalty', 'refund', 'adjustment'
  const [selectedStudent, setSelectedStudent] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    direction: 'debit',
    originalTransactionId: ''
  });

  // Check if user has admin/founder access
  const userRole = user?.role || user?.userType;
  const hasAdminAccess = ['admin', 'founder'].includes(userRole);
  const canConfirmTopUps = ['admin', 'founder', 'receptionist', 'manager'].includes(userRole);

  useEffect(() => {
    if (activeTab === 'pending-topups') {
      fetchPendingTopUps();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchPendingTopUps = async () => {
    setLoading(true);
    try {
      // Fetch all transactions and filter pending top-ups
      // This is a simplified approach - ideally backend should have a dedicated endpoint
      const response = await axios.get('/api/wallet/transactions/all', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        const pending = response.data.data.transactions.filter(
          t => t.transactionType === 'top-up' && t.status === 'pending'
        );
        setPendingTopUps(pending);
      }
    } catch (error) {
      console.error('Error fetching pending top-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/students', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setStudents(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleConfirmTopUp = async (transactionId) => {
    if (!window.confirm(t('walletAdmin.confirmTopUp'))) return;

    try {
      const response = await axios.patch(
        `/api/wallet/top-up/${transactionId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        alert(t('walletAdmin.confirmSuccess'));
        fetchPendingTopUps();
      }
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const handleRejectTopUp = async (transactionId) => {
    const reason = window.prompt(t('walletAdmin.rejectReason'));
    if (!reason) return;

    try {
      const response = await axios.patch(
        `/api/wallet/top-up/${transactionId}/fail`,
        { reason },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        alert(t('walletAdmin.rejectSuccess'));
        fetchPendingTopUps();
      }
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setFormData({
      amount: '',
      reason: '',
      direction: type === 'adjustment' ? 'debit' : '',
      originalTransactionId: ''
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent('');
    setFormData({
      amount: '',
      reason: '',
      direction: 'debit',
      originalTransactionId: ''
    });
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert(t('walletAdmin.chooseStudent'));
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(t('earnings.enterAmount'));
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      alert(t('walletAdmin.reasonMin', { min: '(Min 5 characters)' }));
      return;
    }

    try {
      let response;
      const token = sessionStorage.getItem('token');

      if (modalType === 'penalty') {
        response = await axios.post(
          '/api/wallet/penalty',
          {
            studentId: selectedStudent,
            amount,
            reason: formData.reason
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (modalType === 'refund') {
        response = await axios.post(
          '/api/wallet/refund',
          {
            studentId: selectedStudent,
            amount,
            reason: formData.reason,
            originalTransactionId: formData.originalTransactionId || undefined
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (modalType === 'adjustment') {
        // First get wallet ID
        const walletResponse = await axios.get(
          `/api/wallet/summary/${selectedStudent}/student`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!walletResponse.data.success) {
          throw new Error(t('settings.failed'));
        }

        const walletId = walletResponse.data.data.walletId;

        response = await axios.post(
          '/api/wallet/adjustment',
          {
            walletId,
            amount,
            direction: formData.direction,
            reason: formData.reason,
            originalTransactionId: formData.originalTransactionId || undefined
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (response.data.success) {
        alert(t('walletAdmin.submitType', { type: t(`walletAdmin.${modalType}`) }) + ' ' + t('common.success'));
        closeModal();
      }
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  if (!canConfirmTopUps && !hasAdminAccess) {
    return (
      <div className="admin-wallet-panel__container">
        <div className="admin-wallet-panel__access-denied">
          <h2>{t('earnings.accessDenied')}</h2>
          <p>{t('earnings.accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wallet-panel__container">
      <div className="admin-wallet-panel__header">
        <h1 className="admin-wallet-panel__title">{t('walletAdmin.title')}</h1>
        {hasAdminAccess && (
          <div className="admin-wallet-panel__actions">
            <button 
              className="admin-wallet-panel__action-btn admin-wallet-panel__action-btn--penalty"
              onClick={() => openModal('penalty')}
            >
              {t('walletAdmin.applyPenalty')}
            </button>
            <button 
              className="admin-wallet-panel__action-btn admin-wallet-panel__action-btn--refund"
              onClick={() => openModal('refund')}
            >
              {t('walletAdmin.processRefund')}
            </button>
            <button 
              className="admin-wallet-panel__action-btn admin-wallet-panel__action-btn--adjustment"
              onClick={() => openModal('adjustment')}
            >
              {t('walletAdmin.makeAdjustment')}
            </button>
          </div>
        )}
      </div>

      <div className="admin-wallet-panel__tabs">
        <button
          className={`admin-wallet-panel__tab ${activeTab === 'pending-topups' ? 'admin-wallet-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('pending-topups')}
        >
          {t('walletAdmin.pendingTopUps', { count: pendingTopUps.length })}
        </button>
      </div>

      <div className="admin-wallet-panel__content">
        {activeTab === 'pending-topups' && (
          <div className="admin-wallet-panel__pending-section">
            <h2>{t('walletAdmin.pendingRequests')}</h2>
            {loading ? (
              <p>{t('common.loading')}</p>
            ) : pendingTopUps.length === 0 ? (
              <div className="admin-wallet-panel__empty">
                <p>{t('walletAdmin.noPending')}</p>
              </div>
            ) : (
              <table className="admin-wallet-panel__table">
                <thead>
                  <tr>
                    <th>{t('attendance.date')}</th>
                    <th>{t('common.student')}</th>
                    <th>{t('payments.amount')}</th>
                    <th>{t('payouts.paymentMethod')}</th>
                    <th>{t('earnings.reason')}</th>
                    <th>{t('attendance.status')}</th>
                    <th>{t('attendance.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTopUps.map((topup) => (
                    <tr key={topup._id}>
                      <td>{new Date(topup.createdAt).toLocaleString(t('common.locale'))}</td>
                      <td>{topup.createdBy?.name || t('common.noData')}</td>
                      <td className="admin-wallet-panel__amount">
                        {formatUZS(topup.amount, language)}
                      </td>
                      <td>
                        <span className="admin-wallet-panel__payment-method">
                          {t(`payouts.${topup.paymentMethod?.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`)}
                        </span>
                      </td>
                      <td>{topup.reason || t('walletAdmin.walletTopUp')}</td>
                      <td>
                        <span 
                          className="admin-wallet-panel__status-badge"
                          style={{ 
                            backgroundColor: getTransactionStatusColor(topup.status) + '20',
                            color: getTransactionStatusColor(topup.status)
                          }}
                        >
                          {t(`common.${topup.status}`)}
                        </span>
                      </td>
                      <td className="admin-wallet-panel__action-cell">
                        <button
                          className="admin-wallet-panel__btn admin-wallet-panel__btn--confirm"
                          onClick={() => handleConfirmTopUp(topup._id)}
                        >
                          ✓ {t('earnings.approve')}
                        </button>
                        <button
                          className="admin-wallet-panel__btn admin-wallet-panel__btn--reject"
                          onClick={() => handleRejectTopUp(topup._id)}
                        >
                          ✗ {t('attendance.reject')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal for Penalty/Refund/Adjustment */}
      {showModal && (
        <div className="admin-wallet-panel__modal-overlay" onClick={closeModal}>
          <div className="admin-wallet-panel__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-wallet-panel__modal-title">
              {modalType === 'penalty' && t('walletAdmin.applyPenalty')}
              {modalType === 'refund' && t('walletAdmin.processRefund')}
              {modalType === 'adjustment' && t('walletAdmin.makeAdjustment')}
            </h2>

            <form onSubmit={handleSubmitAction} className="admin-wallet-panel__form">
              <div className="admin-wallet-panel__form-group">
                <label>{t('walletAdmin.selectStudent')}</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="admin-wallet-panel__select"
                  required
                >
                  <option value="">{t('walletAdmin.chooseStudent')}</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} - {student.studentId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-wallet-panel__form-group">
                <label>{t('payouts.amountSom')}</label>
                <input
                  type="number"
                  step="1000"
                  min="100"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="admin-wallet-panel__input"
                  placeholder={t('walletAdmin.amountPlaceholder')}
                  required
                />
              </div>

              {modalType === 'adjustment' && (
                <div className="admin-wallet-panel__form-group">
                  <label>{t('earnings.direction')}</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="admin-wallet-panel__select"
                    required
                  >
                    <option value="credit">{t('walletAdmin.addMoney')}</option>
                    <option value="debit">{t('walletAdmin.removeMoney')}</option>
                  </select>
                </div>
              )}

              <div className="admin-wallet-panel__form-group">
                <label>{t('earnings.reason')} ({t('forms.required')})</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="admin-wallet-panel__textarea"
                  placeholder={t('walletAdmin.reasonPlaceholder', { type: t(`walletAdmin.${modalType}`) })}
                  rows="4"
                  minLength={modalType === 'adjustment' ? 10 : 5}
                  required
                />
              </div>

              <div className="admin-wallet-panel__modal-actions">
                <button type="button" onClick={closeModal} className="admin-wallet-panel__btn-cancel">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="admin-wallet-panel__btn-submit">
                  {t('walletAdmin.submitType', { type: t(`walletAdmin.${modalType}`) })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWalletPanel;
