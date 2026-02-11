import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { studentsAPI, getImageUrl } from '../utils/api';
import { AiOutlineEye, AiOutlineEdit, AiOutlineDollar, AiOutlineDelete } from 'react-icons/ai';
import '../styles/Students.css';

const Students = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      console.log('[Students] Fetching with branch filter:', branchFilter);
      
      // IMPORTANT: Request ALL students (no status filter) to calculate stats correctly
      // The frontend will handle filtering by status using selectedStatus state
      const response = await studentsAPI.getAll({ 
        search: searchTerm,
        status: '', // Empty string to fetch all statuses
        ...branchFilter
      });
      
      console.log('[Students] Response received:', {
        status: response.status,
        dataLength: response.data?.data?.length,
        hasData: !!response.data?.data
      });
      
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('[Students] Error fetching students:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle 401 Unauthorized error by redirecting to login
      if (error.response && error.response.status === 401) {
        console.log('[Students] 401 detected, clearing session and redirecting');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(t('students.fetchError') + ': ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, navigate, t, getBranchFilter]);

  useEffect(() => {
    setLoading(true);
    fetchStudents();
  }, [fetchStudents, selectedBranch]);

  const handleAdd = () => {
    navigate('/students/add');
  };

  const handleEdit = (student) => {
    navigate(`/students/edit/${student._id}`);
  };

  const handlePay = (student) => {
    navigate(`/payments?studentId=${student._id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await studentsAPI.delete(id);
        fetchStudents();
        toast.success(t('students.deleteSuccess'));
      } catch (error) {
        // Handle 401 Unauthorized error by redirecting to login
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(t('students.deleteError') + ': ' + (error.response?.data?.message || error.message));
        }
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Filter students based on search term and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort by student ID numerically
    const idA = parseInt((a.studentId || '0').replace(/\D/g, ''), 10);
    const idB = parseInt((b.studentId || '0').replace(/\D/g, ''), 10);
    return idA - idB;
  });

  // Calculate stats from the raw students data
  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    inactive: students.filter(s => s.status === 'inactive').length,
    graduated: students.filter(s => s.status === 'graduated').length
  };
  
  console.log('[Students Page] Stats:', {
    totalStudents: students.length,
    activeCount: stats.active,
    inactiveCount: stats.inactive,
    graduatedCount: stats.graduated,
    statusBreakdown: students.reduce((acc, s) => {
      acc[s.status || 'undefined'] = (acc[s.status || 'undefined'] || 0) + 1;
      return acc;
    }, {})
  });

  return (
    <div className="students-container">
      <div className="admin-layout__page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="admin-layout__page-title">{t('students.title')}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleAdd}>
            {t('students.addStudent')}
          </button>
          <button className="btn btn-secondary" onClick={fetchStudents}>
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="search-filters">
        <h2>{t('common.search')} & {t('common.filter')}</h2>
        <div className="filters">
          <div className="filter-group">
            <label>{t('common.search')}</label>
            <input
              type="text"
              placeholder={t('students.searchStudent')}
              className="filter-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>{t('common.status')}</label>
            <select 
              className="filter-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">{t('common.all')} {t('common.status')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
              <option value="graduated">{t('students.graduated')}</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="students__loading">
          <div className="students__spinner"></div>
          {t('common.loading')}
        </div>
      ) : (
        <>
          <div className="students-stats-row">
            <div className="stat-box">
              <span className="stat-label">{t('common.total')}:</span>
              <span className="stat-count">{stats.total}</span>
            </div>
            <div className="stat-box active">
              <span className="stat-label">{t('common.active')}:</span>
              <span className="stat-count">{stats.active}</span>
            </div>
            <div className="stat-box inactive">
              <span className="stat-label">{t('common.inactive')}:</span>
              <span className="stat-count">{stats.inactive}</span>
            </div>
            <div className="stat-box graduated">
              <span className="stat-label">{t('students.graduated')}:</span>
              <span className="stat-count">{stats.graduated}</span>
            </div>
          </div>

          <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>{t('students.studentId')}</th>
                <th>{t('common.photo')}</th>
                <th>{t('students.name')}</th>
                <th>{t('students.subjects')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    {t('students.noStudents')}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td><strong style={{ color: '#007bff' }}>{student.studentId}</strong></td>
                    <td>
                      {student.profileImage ? (
                        <img 
                          src={getImageUrl(student.profileImage)}
                          alt={student.name}
                          className="student-table-photo"
                        />
                      ) : (
                        <div className="student-table-photo-placeholder">
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td>{student.name}</td>
                    <td>
                      {student.subjects && student.subjects.length > 0 
                        ? student.subjects.join(', ') 
                        : t('students.noSubjects')}
                    </td>
                    <td>
                      <span className={`badge badge-${student.status === 'active' ? 'success' : student.status === 'inactive' ? 'warning' : 'info'}`}>
                        {student.status === 'active' ? t('common.active') : student.status === 'inactive' ? t('common.inactive') : t('students.graduated')}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-table">
                        <button
                          onClick={() => navigate(`/students/${student._id}`)}
                          className="btn btn-primary btn-sm"
                        >
                          <AiOutlineEye size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.view')}
                        </button>
                        <button
                          onClick={() => handleEdit(student)}
                          className="btn btn-secondary btn-sm"
                        >
                          <AiOutlineEdit size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handlePay(student)}
                          className="btn btn-success btn-sm"
                        >
                          <AiOutlineDollar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('students.pay')}
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="btn btn-danger btn-sm"
                        >
                          <AiOutlineDelete size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

export default Students;