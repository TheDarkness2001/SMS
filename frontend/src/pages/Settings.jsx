import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { settingsAPI, teachersAPI } from '../utils/api';
import '../styles/Settings.css';

const Settings = () => {
  const { t } = useLanguage();
  const { getBranchFilter } = useBranch();
  const [settings, setSettings] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    role: 'teacher',
    subject: '',
    permissions: {}
  });
  
  // Get current user
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isFounder = currentUser.role === 'founder';
  const isManager = currentUser.role === 'manager';
  const hasSettingsPermission = currentUser.permissions?.manageSettings;
  
  // Check if user can access settings
  const canAccessSettings = isFounder || isManager || hasSettingsPermission;

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.get();
      setSettings(res.data.data);
    } catch (err) {
      setError(t('common.error') + ': ' + t('settings.failed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchStaff = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const res = await teachersAPI.getAll(branchFilter);
      setStaff(res.data.data || []);
    } catch (err) {
      setError(t('common.error') + ': ' + t('settings.failed'));
      console.error(err);
    }
  }, [t, getBranchFilter]);

  useEffect(() => {
    // Check access before fetching
    if (!canAccessSettings) {
      setError(t('common.accessDenied'));
      setLoading(false);
      return;
    }
    
    fetchSettings();
    fetchStaff();
  }, [fetchSettings, fetchStaff, canAccessSettings, t]);

  const handleRolePermissionChange = (role, permission, value) => {
    // Add null check
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [role]: {
          ...prev.rolePermissions[role],
          [permission]: value
        }
      }
    }));
  };

  const handleFeatureChange = (feature, value) => {
    // Add null check
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Add null check
    if (!settings) return;
    
    try {
      setSaving(true);
      await settingsAPI.update(settings);
      setSuccess(t('settings.title') + ' ' + t('common.save') + 'd');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('common.error') + ': ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStaffEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setStaffFormData({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      subject: staffMember.subject || '',
      permissions: staffMember.permissions || {}
    });
    setShowStaffModal(true);
  };

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target;
    setStaffFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (permission, value) => {
    setStaffFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await teachersAPI.update(editingStaff._id, staffFormData);
      setSuccess(t('settings.staffManagement') + ' ' + t('common.save') + 'd');
      setShowStaffModal(false);
      setEditingStaff(null);
      setStaffFormData({
        name: '',
        email: '',
        role: 'teacher',
        subject: '',
        permissions: {}
      });
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('common.error') + ': ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const closeStaffModal = () => {
    setShowStaffModal(false);
    setEditingStaff(null);
  };

  // Close modal when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeStaffModal();
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>{t('settings.title')}</h1>
        </div>
        <div className="loading-message">{t('common.loading')}</div>
      </div>
    );
  }
  
  // Check access control
  if (!canAccessSettings) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>{t('settings.title')}</h1>
        </div>
        <div className="alert alert-danger error-message">
          {t('common.accessDenied') || 'Access Denied: You do not have permission to access this page.'}
        </div>
      </div>
    );
  }

  // Add null check for settings
  if (!settings) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>{t('settings.title')}</h1>
        </div>
        <div className="error-message">{t('common.error')}: {t('common.noData')}</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>{t('settings.title')}</h1>
      </div>

      {error && <div className="alert alert-danger error-message">{error}</div>}
      {success && <div className="alert alert-success success-message">{success}</div>}

      {/* Staff Management */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>{t('settings.staffManagement')}</h3>
        </div>
        <div className="settings-card-body">
          <div className="table-responsive">
            <table className="table table-hover staff-table">
              <thead>
                <tr>
                  <th>{t('common.photo')}</th>
                  <th>{t('students.name')}</th>
                  <th>{t('forms.email')}</th>
                  <th>{t('common.role')}</th>
                  <th>{t('forms.subject')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {staff
                  .filter(member => {
                    // Only founders can see other founders
                    if (member.role === 'founder' && !isFounder) {
                      return false;
                    }
                    return true;
                  })
                  .map(member => (
                  <tr key={member._id}>
                    <td>
                      {member.profileImage ? (
                        <img 
                          src={`/uploads/${member.profileImage}`} 
                          alt={member.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#666' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>
                      <span className={`role-badge role-${member.role}`}>
                        {t(`common.${member.role}`)}
                      </span>
                    </td>
                    <td>{member.subject || t('common.noData')}</td>
                    <td className="action-buttons">
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => handleStaffEdit(member)}
                      >
                        {t('settings.editPermissions')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Role-Based Permissions */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>{t('settings.roleBasedPermissions')}</h3>
          </div>
          <div className="settings-card-body">
            {settings.rolePermissions && Object.entries(settings.rolePermissions).map(([role, permissions]) => (
              <div key={role} className="permission-section">
                <h4 className="text-capitalize">{role} {t('settings.editPermissions')}</h4>
                <div className="checkbox-grid">
                  {permissions && Object.entries(permissions).map(([permission, value]) => (
                    <div key={permission} className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`${role}-${permission}`}
                        checked={value}
                        onChange={(e) => handleRolePermissionChange(role, permission, e.target.checked)}
                      />
                      <label htmlFor={`${role}-${permission}`}>
                        {t(`settings.permissions.${permission}`) || permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>{t('settings.featureToggles')}</h3>
          </div>
          <div className="settings-card-body">
            <div className="checkbox-grid">
              {settings.features && Object.entries(settings.features).map(([feature, enabled]) => (
                <div key={feature} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`feature-${feature}`}
                    checked={enabled}
                    onChange={(e) => handleFeatureChange(feature, e.target.checked)}
                  />
                  <label htmlFor={`feature-${feature}`}>
                    {t(`settings.features.${feature}`) || feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>{t('settings.systemSettings')}</h3>
          </div>
          <div className="settings-card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">{t('settings.sessionTimeout')}</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.system?.sessionTimeout || 3600}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    system: {
                      ...prev.system,
                      sessionTimeout: parseInt(e.target.value) || 3600
                    }
                  }))}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">{t('settings.maxFileSize')}</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.system?.maxFileSize || 5}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    system: {
                      ...prev.system,
                      maxFileSize: parseInt(e.target.value) || 5
                    }
                  }))}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">{t('settings.dateFormat')}</label>
                <select
                  className="form-control"
                  value={settings.system?.dateFormat || 'MM/DD/YYYY'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    system: {
                      ...prev.system,
                      dateFormat: e.target.value
                    }
                  }))}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="allowMultipleLogins"
                    checked={settings.system?.allowMultipleLogins || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      system: {
                        ...prev.system,
                        allowMultipleLogins: e.target.checked
                      }
                    }))}
                  />
                  <label className="form-check-label" htmlFor="allowMultipleLogins">
                    {t('settings.allowMultipleLogins')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WALLET SYSTEM SETTINGS - HIDDEN (NOT IMPLEMENTED YET)
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Wallet System Settings</h3>
          </div>
          <div className="settings-card-body">
            ... wallet settings form fields ...
          </div>
        </div>
        */}

        <div className="d-flex justify-content-end">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? t('common.save') + '...' : t('settings.saveSettings')}
          </button>
        </div>
      </form>

      {/* Staff Permission Modal */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {t('settings.editPermissionsFor', { name: editingStaff?.name })}
              </h5>
              <button 
                type="button" 
                className="modal-close-button" 
                onClick={closeStaffModal}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleStaffSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('students.name')}</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={staffFormData.name}
                    onChange={handleStaffInputChange}
                    readOnly
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('forms.email')}</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={staffFormData.email}
                    onChange={handleStaffInputChange}
                    readOnly
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('common.role')}</label>
                  <select
                    className="form-control"
                    name="role"
                    value={staffFormData.role}
                    onChange={handleStaffInputChange}
                    disabled
                  >
                    <option value="admin">{t('common.admin')}</option>
                    <option value="teacher">{t('common.teacher')}</option>
                    <option value="sales">{t('common.sales')}</option>
                    <option value="manager">{t('common.manager')}</option>
                    {isFounder && <option value="founder">{t('common.founder')}</option>}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('forms.subject')}</label>
                  <input
                    type="text"
                    className="form-control"
                    name="subject"
                    value={staffFormData.subject}
                    onChange={handleStaffInputChange}
                    readOnly
                  />
                </div>
                
                <div className="permission-section">
                  <h5>{t('settings.individualPermissions')}</h5>
                  <div className="checkbox-grid">
                    {staffFormData.permissions && Object.entries(staffFormData.permissions).map(([permission, value]) => (
                      <div key={permission} className="checkbox-item">
                        <input
                          type="checkbox"
                          id={`permission-${permission}`}
                          checked={value}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                        />
                        <label htmlFor={`permission-${permission}`}>
                          {t(`settings.permissions.${permission}`) || permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeStaffModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('common.save') + '...' : t('settings.savePermissions')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;