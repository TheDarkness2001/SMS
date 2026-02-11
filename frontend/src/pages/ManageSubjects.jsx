import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { subjectsAPI, branchesAPI } from '../utils/api';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineBook } from 'react-icons/ai';
import '../styles/ManageExamGroups.css';

const ManageSubjects = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [error, setError] = useState('');
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    branchId: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const [subjectsRes, branchesRes] = await Promise.all([
        subjectsAPI.getAll(branchFilter),
        branchesAPI.getAll()
      ]);
      setSubjects(subjectsRes.data.data || []);
      setBranches(branchesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      if (err.response?.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, t, getBranchFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when selected branch changes
  useEffect(() => {
    fetchData();
  }, [selectedBranch, fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        branchId: formData.branchId || user.branchId // Use selected or user's branch
      };
      await subjectsAPI.create(submitData);
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        branchId: ''
      });
      fetchData();
      toast.success(t('common.savedSuccessfully'));
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    try {
      await subjectsAPI.update(editingSubject._id, formData);
      setShowEditModal(false);
      setEditingSubject(null);
      fetchData();
      toast.success(t('common.updatedSuccessfully'));
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await subjectsAPI.delete(id);
        fetchData();
        toast.success(t('common.deletedSuccessfully'));
      } catch (err) {
        setError(t('common.error'));
      }
    }
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || ''
    });
    setShowEditModal(true);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '0' }}><AiOutlineBook size={28} style={{ verticalAlign: 'middle', marginRight: '10px' }} />{t('subjects.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <AiOutlinePlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('common.add')} {t('students.subjects')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('subjects.subjectName')}</th>
              <th>{t('forms.code')}</th>
              <th>{t('forms.description')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <tr key={subject._id}>
                <td><strong>{subject.name}</strong></td>
                <td>{subject.code || '-'}</td>
                <td>{subject.description || '-'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(subject)}
                    style={{ marginRight: '5px' }}
                  >
                    <AiOutlineEdit size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.edit')}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteSubject(subject._id)}
                  >
                    <AiOutlineDelete size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Subject Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingSubject(null);
        }} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            borderRadius: '12px'
          }}>
            <h2 style={{ marginBottom: '25px' }}>
              {editingSubject ? <><AiOutlineEdit size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('subjects.editSubject')}</> : <><AiOutlinePlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('subjects.addNewSubject')}</>}
            </h2>

            <form onSubmit={editingSubject ? handleEditSubject : handleAddSubject}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('subjects.subjectName')} *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('forms.code')}</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder={`${t('common.example')} ENG101`}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('forms.description')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    minHeight: '80px'
                  }}
                />
              </div>
              
              {/* Branch Selector - Only for founders */}
              {user.role === 'founder' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('common.branch')}</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{t('common.selectBranch')}</option>
                    {branches.filter(b => b.status === 'active').map(branch => (
                      <option key={branch._id} value={branch._id}>{branch.name}</option>
                    ))}
                  </select>
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    {t('subjects.branchNote')}
                  </small>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingSubject(null);
                  }}
                  style={{ padding: '10px 24px' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {editingSubject ? t('subjects.updateSubject') : t('subjects.createSubject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSubjects;
