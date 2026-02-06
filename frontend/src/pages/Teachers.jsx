import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { teachersAPI, branchesAPI } from '../utils/api';
import "../styles/Teachers.css"

const Teachers = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    teacherId: '',
    name: '',
    email: '',
    password: '',
    subject: '',
    department: '',
    phone: '',
    status: 'active',
    role: 'teacher',
    branchId: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTeachers = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const response = await teachersAPI.getAll({ 
        search: searchTerm,
        ...branchFilter
      });
      setTeachers(response.data.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      // Handle 401 Unauthorized error by redirecting to login
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(t('teachers.fetchError') + ': ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, navigate, t, getBranchFilter]);

  // Load branches for admin, manager, and founder
  useEffect(() => {
    const loadBranches = async () => {
      console.log('User role:', user?.role);
      if (['founder', 'admin', 'manager'].includes(user?.role)) {
        console.log('Attempting to load branches...');
        try {
          const branchesResponse = await branchesAPI.getAll();
          console.log('Branches API response:', branchesResponse.data);
          if (branchesResponse.data.success) {
            setBranches(branchesResponse.data.data);
            console.log('Branches set to state:', branchesResponse.data.data);
          } else {
            console.error('Branch API returned success: false', branchesResponse.data);
          }
        } catch (error) {
          console.error('Error loading branches:', error);
        }
      } else {
        console.log('User role does not have access to branch selector');
      }
    };
    loadBranches();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchTeachers();
  }, [fetchTeachers, selectedBranch]);

  const handleDelete = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await teachersAPI.delete(id);
        fetchTeachers();
        window.alert(t('common.deletedSuccessfully'));
      } catch (error) {
        // Handle 401 Unauthorized error by redirecting to login
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(t('teachers.deleteError') + ': ' + (error.response?.data?.message || error.message));
        }
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleAdd = () => {
    setEditingTeacher(null);
    setProfileImage(null);
    setFormData({
      teacherId: '',
      name: '',
      email: '',
      password: '',
      subject: '',
      department: '',
      phone: '',
      status: 'active',
      role: 'teacher',
      branchId: ''
    });
    setShowModal(true);
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setProfileImage(null);
    setFormData({
      teacherId: teacher.teacherId || '',
      name: teacher.name,
      email: teacher.email,
      password: '',
      subject: Array.isArray(teacher.subject) ? teacher.subject.join(', ') : teacher.subject,
      department: teacher.department,
      phone: teacher.phone || '',
      status: teacher.status,
      role: teacher.role,
      branchId: teacher.branchId || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate branch selection for admin/manager/founder
    if (['founder', 'admin', 'manager'].includes(user?.role) && !formData.branchId) {
      setError('Please select a branch');
      return;
    }

    try {
      let teacherData;
      let successMessage;
      
      // Convert subject string to array
      const subjectsArray = formData.subject
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const submitData = {
        ...formData,
        subject: subjectsArray
      };
      
      if (editingTeacher) {
        // Update existing teacher
        const updateData = { ...submitData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if not provided
        }
        const response = await teachersAPI.update(editingTeacher._id, updateData);
        teacherData = response.data.data;
        
        // Upload image if provided
        if (profileImage) {
          const imageFormData = new FormData();
          imageFormData.append('profileImage', profileImage);
          await teachersAPI.uploadPhoto(editingTeacher._id, imageFormData);
        }
        
        successMessage = t('teachers.updateSuccess');
      } else {
        // Create new teacher
        const response = await teachersAPI.create(submitData);
        teacherData = response.data.data;
        
        // Upload image if provided
        if (profileImage) {
          const imageFormData = new FormData();
          imageFormData.append('profileImage', profileImage);
          await teachersAPI.uploadPhoto(teacherData._id, imageFormData);
        }
        
        successMessage = t('teachers.addSuccess');
      }
      
      setShowModal(false);
      fetchTeachers();
      window.alert(successMessage);
    } catch (error) {
      // Handle 401 Unauthorized error by redirecting to login
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(error.response?.data?.message || t('teachers.saveError'));
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setError('');
  };

  // Get unique departments and roles
  const departments = ['all', ...new Set(teachers.map(t => t.department).filter(Boolean))];
  const roles = ['all', ...new Set(teachers.map(t => t.role).filter(Boolean))];

  // Filter teachers based on selected department and role
  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || teacher.department === selectedDepartment;
    const matchesRole = selectedRole === 'all' || teacher.role === selectedRole;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  return (
    <div className="container">
        <h1 style={{ marginBottom: '30px' }}>{t('teachers.title')}</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="search-bar" style={{ 
          display: 'flex', 
          gap: '15px', 
          marginBottom: '25px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              placeholder={t('teachers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          <button 
            onClick={fetchTeachers} 
            className="btn btn-primary"
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: '8px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,123,255,0.3)'
            }}
          >
            🔍 {t('common.search')}
          </button>
          <button 
            onClick={handleAdd} 
            className="btn btn-success"
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: '8px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(40,167,69,0.3)'
            }}
          >
            ➕ {t('teachers.addTeacher')}
          </button>
        </div>

        {/* Filters Section */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Department Filter */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                🏢 {t('teachers.department')}
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #ddd', 
                  fontSize: '15px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">{t('teachers.allDepartments')} ({teachers.length})</option>
                {departments.filter(d => d !== 'all').map(dept => (
                  <option key={dept} value={dept}>
                    {dept} ({teachers.filter(t => t.department === dept).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                👤 {t('common.role')}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #ddd', 
                  fontSize: '15px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">{t('teachers.allRoles')} ({teachers.length})</option>
                {roles.filter(r => r !== 'all').map(role => (
                  <option key={role} value={role}>
                    {t(`common.${role}`) || (role.charAt(0).toUpperCase() + role.slice(1))} ({teachers.filter(t => t.role === role).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedDepartment !== 'all' || selectedRole !== 'all') && (
            <div style={{ marginTop: '15px', textAlign: 'right' }}>
              <button
                onClick={() => {
                  setSelectedDepartment('all');
                  setSelectedRole('all');
                }}
                className="btn btn-secondary"
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '14px',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
              >
                🧹 {t('teachers.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">{t('teachers.loadingTeachers')}</div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>{t('teachers.showing')} {filteredTeachers.length} {t('common.of')} {teachers.length} {t('teachers.title').toLowerCase()}</strong>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('teachers.teacherId')}</th>
                  <th>{t('common.photo')}</th>
                  <th>{t('teachers.name')}</th>
                  <th>{t('teachers.subjects')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.role')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      {t('teachers.noTeachersFound')}
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                  <tr key={teacher._id}>
                    <td><strong style={{ color: '#007bff' }}>{teacher.teacherId || t('teachers.pending')}</strong></td>
                    <td>
                      {teacher.profileImage ? (
                        <img 
                          src={`/uploads/${teacher.profileImage}`} 
                          alt={teacher.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#666' }}>
                          {teacher.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>{teacher.name}</td>
                    <td>{Array.isArray(teacher.subject) ? teacher.subject.join(', ') : teacher.subject}</td>
                    <td>
                      <span className={`badge badge-${teacher.status === 'active' ? 'success' : 'warning'}`}>
                        {teacher.status === 'active' ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className={`badge badge-${teacher.role === 'admin' ? 'success' : 'info'}`}>
                        {t(`common.${teacher.role}`) || teacher.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/teachers/${teacher._id}`)}
                          className="btn btn-primary"
                          style={{ 
                            padding: '8px 16px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            fontWeight: '500',
                            minWidth: '70px'
                          }}
                        >
                          👁️ {t('common.view')}
                        </button>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="btn btn-secondary"
                          style={{ 
                            padding: '8px 16px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            fontWeight: '500',
                            minWidth: '70px'
                          }}
                        >
                          ✏️ {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(teacher._id)}
                          className="btn btn-danger"
                          style={{ 
                            padding: '8px 16px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            fontWeight: '500',
                            minWidth: '70px'
                          }}
                        >
                          🗑️ {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Teacher Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingTeacher ? t('teachers.edit') : t('teachers.addTeacher')}</h2>
              {error && <div className="alert alert-error">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>{t('teachers.teacherId')} *</label>
                  <input
                    type="text"
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={handleInputChange}
                    placeholder={`${t('common.example')} TCH001`}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('common.photo')}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files[0])}
                  />
                  {profileImage && (
                    <p style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                      {t('forms.selected')}: {profileImage.name}
                    </p>
                  )}
                  {editingTeacher && editingTeacher.profileImage && !profileImage && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={`/uploads/${editingTeacher.profileImage}`} 
                        alt="Current"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <p style={{ fontSize: '12px', color: '#666' }}>{t('common.photo')}</p>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('teachers.name')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('teachers.email')} *</label>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('login.password')} {editingTeacher ? `(${t('forms.leaveBlankToKeep')})` : '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingTeacher}
                  />
                </div>

                <div className="form-group">
                  <label>{t('teachers.subjects')} * <small style={{ color: '#666', fontWeight: 'normal' }}>({t('forms.subjectsCommaSeparated')})</small></label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder={`${t('common.example')} English, IT, Computer`}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('teachers.department')} *</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('teachers.phone')}</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>{t('common.status')}</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('common.role')}</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    list="role-suggestions"
                    placeholder={`${t('common.example')} teacher, admin, sales, HR`}
                  />
                  <datalist id="role-suggestions">
                    <option value="teacher">{t('login.teacher')}</option>
                    <option value="admin">{t('common.admin')}</option>
                  </datalist>
                </div>

                {['founder', 'admin', 'manager'].includes(user?.role) && (
                  <div className="form-group">
                    <label>Branch *</label>
                    <select
                      name="branchId"
                      value={formData.branchId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingTeacher ? t('common.update') : t('common.add')}
                  </button>
                  <button type="button" onClick={handleCloseModal} className="btn btn-secondary" style={{ flex: 1 }}>
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
};

export default Teachers;