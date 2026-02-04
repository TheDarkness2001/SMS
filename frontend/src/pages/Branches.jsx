import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { branchesAPI } from '../utils/api';
import '../styles/Branches.css';

const Branches = () => {
  const { t } = useLanguage();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await branchesAPI.getAll();
      
      if (response.data.success) {
        setBranches(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = editingBranch 
        ? await branchesAPI.update(editingBranch._id, formData)
        : await branchesAPI.create(formData);
      
      if (response.data.success) {
        setSuccess(response.data.message);
        setShowModal(false);
        setEditingBranch(null);
        setFormData({ name: '', address: '', phone: '' });
        fetchBranches();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to save branch');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone
    });
    setShowModal(true);
  };

  const handleToggleActive = async (branch) => {
    try {
      const response = await branchesAPI.update(branch._id, { isActive: !branch.isActive });
      
      if (response.data.success) {
        setSuccess('Branch status updated');
        fetchBranches();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to update branch status');
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? This cannot be undone if the branch has data.')) {
      return;
    }

    try {
      const response = await branchesAPI.delete(branchId);
      
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchBranches();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to delete branch');
    }
  };

  const openModal = () => {
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '' });
  };

  if (loading) {
    return (
      <div className="branches-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="branches-container">
      <div className="branches-header">
        <h1>Branch Management</h1>
        <button className="btn btn-primary" onClick={openModal}>
          Add Branch
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="branches-grid">
        {branches.map(branch => (
          <div key={branch._id} className={`branch-card ${!branch.isActive ? 'inactive' : ''}`}>
            <div className="branch-card-header">
              <h3>{branch.name}</h3>
              <span className={`status-badge ${branch.isActive ? 'active' : 'inactive'}`}>
                {branch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="branch-card-body">
              <p><strong>Address:</strong> {branch.address}</p>
              <p><strong>Phone:</strong> {branch.phone}</p>
              <p><strong>Created:</strong> {new Date(branch.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="branch-card-actions">
              <button 
                className="btn btn-sm btn-primary" 
                onClick={() => handleEdit(branch)}
              >
                Edit
              </button>
              <button 
                className={`btn btn-sm ${branch.isActive ? 'btn-warning' : 'btn-success'}`}
                onClick={() => handleToggleActive(branch)}
              >
                {branch.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button 
                className="btn btn-sm btn-danger" 
                onClick={() => handleDelete(branch._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5>{editingBranch ? 'Edit Branch' : 'Add Branch'}</h5>
              <button className="modal-close-button" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <textarea
                    name="address"
                    className="form-control"
                    rows="3"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBranch ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
