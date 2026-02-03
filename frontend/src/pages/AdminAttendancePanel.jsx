import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { teacherAttendanceAPI } from '../utils/api';
import '../styles/AdminAttendancePanel.css';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineEye, AiOutlineFilter } from 'react-icons/ai';

const AdminAttendancePanel = () => {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    verificationStatus: 'all',
    mode: 'all',
    startDate: '',
    endDate: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (filters.status !== 'all') params.status = filters.status;
      if (filters.verificationStatus !== 'all') params.verificationStatus = filters.verificationStatus;
      if (filters.mode !== 'all') params.mode = filters.mode;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await teacherAttendanceAPI.getAllAttendance(params);

      if (response.data.success) {
        setRecords(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  // Fetch records on mount or filter change
  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value,
      page: 1 // Reset to first page when filtering
    });
  };

  // Handle view details
  const handleViewDetails = async (recordId) => {
    try {
      const response = await teacherAttendanceAPI.getDetails(recordId);
      if (response.data.success) {
        setSelectedRecord(response.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError(t('common.error') + ': ' + t('common.loading'));
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'late':
        return 'warning';
      case 'absent':
        return 'danger';
      case 'half-day':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // Get verification badge color
  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'needs-review':
        return 'warning';
      case 'rejected':
        return 'danger';
      case 'pending':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="admin-attendance-container">
      <div className="admin-header">
        <h1>👨‍💼 {t('attendance.title')}</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{pagination.total}</span>
            <span className="stat-label">{t('attendance.totalRecords')}</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <h3>
            <AiOutlineFilter size={20} /> {t('common.filter')}
          </h3>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>{t('attendance.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">{t('attendance.allStatuses')}</option>
              <option value="present">{t('attendance.present')}</option>
              <option value="late">{t('attendance.late')}</option>
              <option value="absent">{t('attendance.absent')}</option>
              <option value="half-day">{t('attendance.halfDay')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('attendance.verificationStatus')}</label>
            <select
              value={filters.verificationStatus}
              onChange={(e) => handleFilterChange('verificationStatus', e.target.value)}
            >
              <option value="all">{t('attendance.allStatuses')}</option>
              <option value="verified">{t('attendance.verified')} ✓</option>
              <option value="needs-review">{t('attendance.needsReview')} ⚠️</option>
              <option value="rejected">{t('attendance.rejected')} ✗</option>
              <option value="pending">{t('attendance.pending')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('attendance.mode')}</label>
            <select
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
            >
              <option value="all">{t('attendance.allModes')}</option>
              <option value="test">🧪 {t('attendance.test')}</option>
              <option value="production">🚀 {t('attendance.production')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t('attendance.startDate')}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{t('attendance.endDate')}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{t('attendance.limit')}</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value="10">{t('attendance.perPage', { count: 10 })}</option>
              <option value="20">{t('attendance.perPage', { count: 20 })}</option>
              <option value="50">{t('attendance.perPage', { count: 50 })}</option>
              <option value="100">{t('attendance.perPage', { count: 100 })}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="records-card">
        {loading ? (
          <div className="loading">{t('attendance.loadingRecords')}</div>
        ) : records.length === 0 ? (
          <div className="no-records">{t('attendance.noRecords')}</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>{t('attendance.teacher')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('attendance.status')}</th>
                    <th>{t('attendance.checkIn')}</th>
                    <th>{t('attendance.checkOut')}</th>
                    <th>{t('attendance.mode')}</th>
                    <th>{t('attendance.verification')}</th>
                    <th>{t('attendance.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td className="teacher-cell">
                        <strong>{record.teacher?.name}</strong>
                        <small>{record.teacher?.email}</small>
                      </td>
                      <td>{new Date(record.date).toLocaleDateString(t('common.locale') || 'en-US')}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(record.status)}`}>
                          {t(`attendance.${record.status}`)}
                        </span>
                      </td>
                      <td>{record.checkInTime || '-'}</td>
                      <td>{record.checkOutTime || '-'}</td>
                      <td>
                        <span className={`mode-badge ${record.mode}`}>
                          {record.mode === 'test' ? `🧪 ${t('attendance.test').toUpperCase()}` : `🚀 ${t('attendance.production').toUpperCase()}`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${getVerificationColor(record.verificationStatus)}`}>
                          {t(`attendance.${record.verificationStatus}`)}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon"
                          onClick={() => handleViewDetails(record._id)}
                          title={t('attendance.viewDetails')}
                        >
                          <AiOutlineEye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <span className="pagination-info">
                {t('common.page')} {pagination.page} {t('common.of')} {pagination.pages} ({pagination.total} {t('common.total')})
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  ← {t('common.previous')}
                </button>
                <button
                  className="btn-pagination"
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  {t('common.next')} →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setShowDetailModal(false)}
          onSuccess={(msg) => {
            setSuccess(msg);
            setShowDetailModal(false);
            fetchAttendanceRecords();
          }}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
};

// Detail Modal Component
const DetailModal = ({ record, onClose, onSuccess, onError }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState(record.adminNotes || '');
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await teacherAttendanceAPI.approve(record._id, { notes });
      if (response.data.success) {
        onSuccess(`✓ ${t('attendance.approveSuccess')}`);
      }
    } catch (err) {
      onError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      onError(t('attendance.provideReason'));
      return;
    }
    try {
      setActionLoading(true);
      const response = await teacherAttendanceAPI.reject(record._id, { notes: rejectReason });
      if (response.data.success) {
        onSuccess(`✗ ${t('attendance.rejectSuccess')}`);
      }
    } catch (err) {
      onError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNotes = async () => {
    try {
      setActionLoading(true);
      const response = await teacherAttendanceAPI.addNotes(record._id, { notes });
      if (response.data.success) {
        onSuccess(`✓ ${t('attendance.notesSuccess')}`);
      }
    } catch (err) {
      onError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 {t('attendance.attendanceDetails')}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            {t('attendance.details')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            {t('attendance.photos')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            {t('attendance.verification')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            {t('attendance.auditTrail')}
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="tab-content">
            <div className="detail-grid">
              <div className="detail-row">
                <label>{t('attendance.teacher')}</label>
                <span>{record.teacher?.name} ({record.teacher?.email})</span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.date')}</label>
                <span>{new Date(record.date).toLocaleDateString(t('common.locale') || 'en-US')}</span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.status')}</label>
                <span className={`badge badge-${record.status === 'present' ? 'success' : 'danger'}`}>
                  {t(`attendance.${record.status}`)}
                </span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.mode')}</label>
                <span className={`mode-badge ${record.mode}`}>
                  {record.mode === 'test' ? `🧪 ${t('attendance.test').toUpperCase()}` : `🚀 ${t('attendance.production').toUpperCase()}`}
                </span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.checkInTime')}</label>
                <span>{record.checkInTime || '-'}</span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.checkOutTime')}</label>
                <span>{record.checkOutTime || '-'}</span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.verificationStatus')}</label>
                <span className={`badge badge-${
                  record.verificationStatus === 'verified' ? 'success' :
                  record.verificationStatus === 'needs-review' ? 'warning' : 'danger'
                }`}>
                  {t(`attendance.${record.verificationStatus}`)}
                </span>
              </div>
              <div className="detail-row">
                <label>{t('attendance.location')}</label>
                <span>
                  {record.checkInLocation?.latitude}, {record.checkInLocation?.longitude}
                  {record.checkInLocation?.accuracy && ` (±${record.checkInLocation.accuracy.toFixed(1)}m)`}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="notes-section">
              <label>{t('attendance.adminNotes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('attendance.addNotesPlaceholder')}
                rows="4"
              />
              <button className="btn btn-secondary" onClick={handleAddNotes} disabled={actionLoading}>
                {actionLoading ? t('common.save') + '...' : `💾 ${t('attendance.saveNotes')}`}
              </button>
            </div>

            {/* Action Buttons */}
            {record.verificationStatus !== 'verified' && (
              <div className="action-buttons">
                <button
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  <AiOutlineCheckCircle size={18} />
                  {actionLoading ? t('common.loading') : t('attendance.approve')}
                </button>
                <button className="btn btn-warning" onClick={() => setActiveTab('verification')}>
                  {t('attendance.markForReview')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="tab-content">
            <div className="photos-grid">
              <div className="photo-item">
                <h4>{t('attendance.checkInPhoto')}</h4>
                {record.checkInPhoto ? (
                  <img
                    src={`/uploads/${record.checkInPhoto}`}
                    alt={t('attendance.checkIn')}
                    onError={(e) => (e.target.src = '🚫')}
                  />
                ) : (
                  <div className="no-photo">{t('attendance.noPhoto')}</div>
                )}
                <p className="photo-time">{record.checkInTime}</p>
              </div>
              <div className="photo-item">
                <h4>{t('attendance.checkOutPhoto')}</h4>
                {record.checkOutPhoto ? (
                  <img
                    src={`/uploads/${record.checkOutPhoto}`}
                    alt={t('attendance.checkOut')}
                    onError={(e) => (e.target.src = '🚫')}
                  />
                ) : (
                  <div className="no-photo">{t('attendance.noPhoto')}</div>
                )}
                <p className="photo-time">{record.checkOutTime || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div className="tab-content">
            <div className="verification-grid">
              <div className="verification-item">
                <span className={record.verification?.faceMatch ? 'verified' : 'unverified'}>
                  {record.verification?.faceMatch ? '✓' : '✗'} {t('attendance.faceMatch')}
                </span>
              </div>
              <div className="verification-item">
                <span className={record.verification?.locationMatch ? 'verified' : 'unverified'}>
                  {record.verification?.locationMatch ? '✓' : '✗'} {t('attendance.locationMatch')}
                </span>
              </div>
              <div className="verification-item">
                <span className={record.verification?.deviceMatch ? 'verified' : 'unverified'}>
                  {record.verification?.deviceMatch ? '✓' : '✗'} {t('attendance.deviceMatch')}
                </span>
              </div>
              <div className="verification-item">
                <span className={record.verification?.manualApproval ? 'verified' : 'unverified'}>
                  {record.verification?.manualApproval ? '✓' : '✗'} {t('attendance.manualApproval')}
                </span>
              </div>
            </div>

            {record.verificationStatus !== 'verified' && (
              <div className="reject-section">
                <label>{t('attendance.rejectionReason')}</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('attendance.rejectionReasonPlaceholder')}
                  rows="4"
                />
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  <AiOutlineCloseCircle size={18} />
                  {actionLoading ? t('common.loading') : t('attendance.reject')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && record.auditTrail && (
          <div className="tab-content">
            <div className="audit-list">
              {record.auditTrail.map((entry, idx) => (
                <div key={idx} className="audit-entry">
                  <div className="audit-header">
                    <strong>{t(`attendance.${entry.action}`) || entry.action}</strong>
                    <span className="audit-time">
                      {new Date(entry.createdAt).toLocaleString(t('common.locale') || 'en-US')}
                    </span>
                  </div>
                  <div className="audit-details">
                    <p><strong>{t('attendance.actionBy')}:</strong> {entry.actionBy?.name} ({entry.role})</p>
                    {entry.description && <p><strong>{t('attendance.auditDescription')}:</strong> {entry.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendancePanel;
