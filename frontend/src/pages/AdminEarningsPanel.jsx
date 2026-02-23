import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { teachersAPI } from '../utils/api';
import axios from 'axios';
import { formatUZS } from '../utils/formatters';
import '../styles/AdminEarningsPanel.css';

/**
 * Admin Earnings Management Panel
 * Admin/Manager can approve earnings, apply bonus/penalty/adjustment
 */
const AdminEarningsPanel = () => {
  const { user: authUser } = useAuth();
  // Use sessionStorage as fallback for role (same pattern as Teachers.jsx)
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const user = authUser?.role ? authUser : sessionUser;
  const { t, language } = useLanguage();
  const { getBranchFilter } = useBranch();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingEarnings, setPendingEarnings] = useState([]);
  const [allEarnings, setAllEarnings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'bonus', 'penalty', 'adjustment'
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    direction: 'credit'
  });

  const userRole = user?.role || user?.userType;
  const hasAdminAccess = ['admin', 'founder'].includes(userRole);
  const canApprove = ['admin', 'founder', 'manager'].includes(userRole);

  const fetchTeachers = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const response = await teachersAPI.getAll(branchFilter);
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  }, [getBranchFilter]);

  const fetchPendingEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const branchFilter = getBranchFilter();
      const response = await axios.get('/api/staff-earnings/pending', {
        headers: { Authorization: `Bearer ${token}` },
        params: branchFilter
      });
      setPendingEarnings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pending earnings:', error);
      alert(error.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t, getBranchFilter]);

  const fetchAllEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const branchFilter = getBranchFilter();
      const response = await axios.get('/api/staff-earnings', {
        headers: { Authorization: `Bearer ${token}` },
        params: branchFilter
      });
      setAllEarnings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  }, [getBranchFilter]);

  useEffect(() => {
    fetchTeachers();
    if (activeTab === 'pending') {
      fetchPendingEarnings();
    } else {
      fetchAllEarnings();
    }
  }, [activeTab, fetchTeachers, fetchPendingEarnings, fetchAllEarnings]);

  const handleApprove = async (earningId) => {
    if (!window.confirm(t('earnings.approveConfirm'))) return;

    try {
      const token = sessionStorage.getItem('token');
      await axios.patch(`/api/staff-earnings/${earningId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(t('earnings.approveSuccess'));
      fetchPendingEarnings();
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setFormData({ amount: '', reason: '', direction: 'credit' });
    setSelectedTeacher('');
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setFormData({ amount: '', reason: '', direction: 'credit' });
    setSelectedTeacher('');
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();

    if (!selectedTeacher) {
      alert(t('earnings.chooseTeacher'));
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      alert(t('earnings.enterAmount'));
      return;
    }

    if (!formData.reason || formData.reason.length < 10) {
      alert(t('earnings.reasonMin'));
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      let endpoint = '';
      let payload = {
        staffId: selectedTeacher,
        amount,
        reason: formData.reason
      };

      if (modalType === 'bonus') {
        endpoint = '/api/staff-earnings/bonus';
      } else if (modalType === 'penalty') {
        endpoint = '/api/staff-earnings/penalty';
      } else if (modalType === 'adjustment') {
        endpoint = '/api/staff-earnings/adjustment';
        payload.direction = formData.direction;
      }

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(t('earnings.applySuccess', { type: t(`earnings.${modalType}`) }));
      closeModal();
      if (activeTab === 'all') fetchAllEarnings();
    } catch (error) {
      alert(error.response?.data?.message || t('common.error'));
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#FFA500',
      approved: '#28a745',
      paid: '#007bff',
      cancelled: '#6c757d'
    };
    return (
      <span 
        className="admin-earnings__status-badge"
        style={{ backgroundColor: colors[status] }}
      >
        {t(`common.${status}`)}
      </span>
    );
  };

  if (!canApprove) {
    return (
      <div className="admin-earnings__container">
        <div className="admin-earnings__access-denied">
          <h2>{t('earnings.accessDenied')}</h2>
          <p>{t('earnings.accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-earnings__container">
      <div className="admin-earnings__header">
        <div>
          <h1 className="admin-earnings__title">{t('earnings.title')}</h1>
          <p className="admin-earnings__subtitle">{t('earnings.subtitle')}</p>
        </div>
        {hasAdminAccess && (
          <div className="admin-earnings__actions">
            <button 
              className="admin-earnings__action-btn admin-earnings__action-btn--bonus"
              onClick={() => openModal('bonus')}
            >
              🎁 {t('earnings.applyBonus')}
            </button>
            <button 
              className="admin-earnings__action-btn admin-earnings__action-btn--penalty"
              onClick={() => openModal('penalty')}
            >
              ⚠️ {t('earnings.applyPenalty')}
            </button>
            <button 
              className="admin-earnings__action-btn admin-earnings__action-btn--adjustment"
              onClick={() => openModal('adjustment')}
            >
              🔧 {t('earnings.makeAdjustment')}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-earnings__tabs">
        <button
          className={`admin-earnings__tab ${activeTab === 'pending' ? 'admin-earnings__tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          {t('earnings.pendingApproval', { count: pendingEarnings.length })}
        </button>
        <button
          className={`admin-earnings__tab ${activeTab === 'all' ? 'admin-earnings__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          {t('earnings.allEarnings')}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="admin-earnings__loading">{t('common.loading')}</div>
      ) : activeTab === 'pending' ? (
        <div className="admin-earnings__table-container">
          {pendingEarnings.length === 0 ? (
            <div className="admin-earnings__empty">
              <p>✅ {t('earnings.noPending')}</p>
            </div>
          ) : (
            <table className="admin-earnings__table">
              <thead>
                <tr>
                  <th>{t('attendance.teacher')}</th>
                  <th>{t('attendance.date')}</th>
                  <th>{t('earnings.earningType')}</th>
                  <th>{t('forms.description')}</th>
                  <th>{t('payments.amount')}</th>
                  <th>{t('attendance.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingEarnings.map((earning) => (
                  <tr key={earning._id}>
                    <td>{earning.staffId?.name || t('common.noData')}</td>
                    <td>{new Date(earning.referenceDate).toLocaleDateString(t('common.locale'))}</td>
                    <td>{t(`earnings.${earning.earningType}`)}</td>
                    <td>{earning.description || t('common.noData')}</td>
                    <td className="admin-earnings__amount">{formatUZS(earning.amount, language)}</td>
                    <td>
                      <button
                        className="admin-earnings__approve-btn"
                        onClick={() => handleApprove(earning._id)}
                      >
                        ✓ {t('earnings.approve')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="admin-earnings__table-container">
          {allEarnings.length === 0 ? (
            <div className="admin-earnings__empty">
              <p>📭 {t('earnings.noEarnings')}</p>
            </div>
          ) : (
            <table className="admin-earnings__table">
              <thead>
                <tr>
                  <th>{t('attendance.teacher')}</th>
                  <th>{t('attendance.date')}</th>
                  <th>{t('earnings.earningType')}</th>
                  <th>{t('forms.description')}</th>
                  <th>{t('payments.amount')}</th>
                  <th>{t('attendance.status')}</th>
                  <th>{t('earnings.approvedBy')}</th>
                </tr>
              </thead>
              <tbody>
                {allEarnings.map((earning) => (
                  <tr key={earning._id}>
                    <td>{earning.staffId?.name || t('common.noData')}</td>
                    <td>{new Date(earning.referenceDate).toLocaleDateString(t('common.locale'))}</td>
                    <td>{t(`earnings.${earning.earningType}`)}</td>
                    <td>{earning.description || t('common.noData')}</td>
                    <td className={earning.amount < 0 ? 'admin-earnings__amount--negative' : ''}>
                      {formatUZS(Math.abs(earning.amount), language)}
                    </td>
                    <td>{getStatusBadge(earning.status)}</td>
                    <td>{earning.approvedBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-earnings__modal-overlay" onClick={closeModal}>
          <div className="admin-earnings__modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-earnings__modal-header">
              <h2>
                {modalType === 'bonus' && `🎁 ${t('earnings.applyBonus')}`}
                {modalType === 'penalty' && `⚠️ ${t('earnings.applyPenalty')}`}
                {modalType === 'adjustment' && `🔧 ${t('earnings.makeAdjustment')}`}
              </h2>
              <button className="admin-earnings__modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmitAction}>
              <div className="admin-earnings__modal-body">
                <div className="admin-earnings__form-group">
                  <label>{t('earnings.selectTeacher')} *</label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                  >
                    <option value="">{t('earnings.chooseTeacher')}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-earnings__form-group">
                  <label>{t('earnings.amountSom')} *</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={t('earnings.enterAmount')}
                    required
                  />
                </div>

                {modalType === 'adjustment' && (
                  <div className="admin-earnings__form-group">
                    <label>{t('earnings.direction')} *</label>
                    <select
                      value={formData.direction}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    >
                      <option value="credit">{t('earnings.credit')}</option>
                      <option value="debit">{t('earnings.debit')}</option>
                    </select>
                  </div>
                )}

                <div className="admin-earnings__form-group">
                  <label>{t('earnings.reasonMin')} *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder={t('earnings.reasonPlaceholder')}
                    rows="4"
                    minLength="10"
                    required
                  />
                  <small>{formData.reason.length}/10 {t('earnings.characters')}</small>
                </div>
              </div>
              <div className="admin-earnings__modal-footer">
                <button type="button" className="admin-earnings__btn-secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="admin-earnings__btn-primary">
                  {t('earnings.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEarningsPanel;
