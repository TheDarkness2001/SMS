import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { subjectsAPI } from '../utils/api';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineBook } from 'react-icons/ai';
import '../styles/ManageExamGroups.css';

const ManageSubjects = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await subjectsAPI.getAll();
      setSubjects(response.data.data || []);
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
  }, [navigate, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      await subjectsAPI.create(formData);
      setSuccess(t('common.savedSuccessfully'));
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        description: ''
      });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    try {
      await subjectsAPI.update(editingSubject._id, formData);
      setSuccess(t('common.updatedSuccessfully'));
      setShowEditModal(false);
      setEditingSubject(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleDeleteSubject = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await subjectsAPI.delete(id);
        setSuccess(t('common.deletedSuccessfully'));
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
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
      {success && <div className="alert alert-success">{success}</div>}

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
