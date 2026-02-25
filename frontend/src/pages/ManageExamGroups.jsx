import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { examGroupsAPI, studentsAPI, teachersAPI } from '../utils/api';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineBook } from 'react-icons/ai';
import '../styles/ManageExamGroups.css';

const ManageExamGroups = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    groupId: '',
    groupName: '',
    subject: '',
    class: '',
    section: 'A', // Keep default for backend compatibility
    description: '',
    startTime: '',
    endTime: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const [groupsRes, studentsRes, teachersRes] = await Promise.all([
        examGroupsAPI.getAll(branchFilter),
        studentsAPI.getAll(branchFilter),
        teachersAPI.getAll(branchFilter)
      ]);
      setGroups(groupsRes.data.data || []);
      setStudents(studentsRes.data.data || []);
      setTeachers(teachersRes.data.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
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
    setLoading(true);
    fetchData();
  }, [fetchData, selectedBranch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleTeacherToggle = (teacherId) => {
    setSelectedTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    
    // Validate teacher selection
    if (selectedTeachers.length === 0) {
      setError(t('subjectGroups.teacherRequired'));
      return;
    }
    
    try {
      await examGroupsAPI.create({
        ...formData,
        subject: formData.groupName, // Use groupName as subject
        students: selectedStudents,
        teachers: selectedTeachers
      });
      setSuccess(t('common.savedSuccessfully'));
      setShowAddModal(false);
      setFormData({
        groupId: '',
        groupName: '',
        subject: '',
        class: '',
        section: 'A',
        description: '',
        startTime: '',
        endTime: ''
      });
      setSelectedStudents([]);
      setSelectedTeachers([]);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    try {
      await examGroupsAPI.update(editingGroup._id, {
        ...formData,
        subject: formData.groupName, // Use groupName as subject
        students: selectedStudents,
        teachers: selectedTeachers
      });
      setSuccess(t('common.savedSuccessfully'));
      setShowEditModal(false);
      setEditingGroup(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm(t('modals.deleteMessage'))) {
      try {
        await examGroupsAPI.delete(id);
        setSuccess(t('common.deletedSuccessfully'));
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(t('common.error'));
      }
    }
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setFormData({
      groupId: group.groupId || '',
      groupName: group.groupName,
      subject: group.subject,
      class: group.class,
      section: group.section || 'A',
      description: group.description || '',
      startTime: group.startTime || '',
      endTime: group.endTime || ''
    });
    setSelectedStudents(group.students.map(s => s._id || s));
    setSelectedTeachers(group.teachers?.map(t => t._id || t) || []);
    setShowEditModal(true);
  };

  const classOptions = Array.from({ length: 10 }, (_, i) => `${t('common.level')} ${i + 1}`);

  // Filter available students: exclude those already in OTHER groups with the SAME subject
  const getAvailableStudents = () => {
    // Use groupName as subject for filtering (since we send groupName as subject to backend)
    const currentSubject = (formData.groupName || formData.subject)?.trim().toLowerCase();
    if (!currentSubject) return students.filter(s => s.status === 'active');

    // Get all student IDs already enrolled in OTHER groups with the same subject
    const enrolledStudentIds = groups
      .filter(group => {
        const groupSubject = (group.subject || group.groupName)?.trim().toLowerCase();
        const isSameSubject = groupSubject === currentSubject;
        const isDifferentGroup = group._id !== editingGroup?._id;
        return isSameSubject && isDifferentGroup;
      })
      .flatMap(group => group.students.map(s => s._id || s));

    console.log('[ManageExamGroups] Filtering students for subject:', currentSubject);
    console.log('[ManageExamGroups] Already enrolled student IDs:', enrolledStudentIds);

    // Show only ACTIVE students not in another group for this subject
    return students.filter(student => 
      student.status === 'active' && !enrolledStudentIds.includes(student._id)
    );
  };

  // Filter available teachers by subject
  const getAvailableTeachers = () => {
    const currentSubject = formData.groupName?.trim().toLowerCase();
    if (!currentSubject) return teachers;

    // Filter teachers who teach this subject
    return teachers.filter(teacher => {
      const teacherSubjects = Array.isArray(teacher.subject)
        ? teacher.subject.map(s => s.toLowerCase().trim())
        : [teacher.subject?.toLowerCase().trim()].filter(Boolean);
      return teacherSubjects.includes(currentSubject);
    });
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="manage-exam-groups-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '0' }}><AiOutlineBook size={28} style={{ verticalAlign: 'middle', marginRight: '10px' }} />{t('subjectGroups.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <AiOutlinePlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('subjectGroups.addGroup')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('subjectGroups.groupId')}</th>
              <th>{t('subjectGroups.groupName')}</th>
              <th>{t('forms.level')}</th>
              <th>{t('forms.classTime')}</th>
              <th>{t('subjectGroups.teachers')}</th>
              <th>{t('subjectGroups.students')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr key={group._id}>
                <td>
                  <span style={{ fontWeight: '600', color: '#007bff' }}>
                    {group.groupId || t('forms.notSet')}
                  </span>
                </td>
                <td>{group.groupName}</td>
                <td>{group.class}</td>
                <td>
                  {group.startTime && group.endTime ? (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {group.startTime} - {group.endTime}
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>{t('forms.notSet')}</span>
                  )}
                </td>
                <td>
                  <span className="badge badge-success">
                    {t('subjectGroups.teacherCount', { count: group.teachers?.length || 0 })}
                  </span>
                </td>
                <td>
                  <span className="badge badge-info">
                    {t('subjectGroups.studentCount', { count: group.students.length })}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(group)}
                    style={{ marginRight: '5px' }}
                  >
                    <AiOutlineEdit size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.edit')}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteGroup(group._id)}
                  >
                    <AiOutlineDelete size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Group Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingGroup(null);
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
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            borderRadius: '12px'
          }}>
            <h2 style={{ marginBottom: '25px' }}>
              {editingGroup ? <><AiOutlineEdit size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('subjectGroups.editGroup')}</> : <><AiOutlinePlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{t('subjectGroups.addNewGroup')}</>}
            </h2>

            <form onSubmit={editingGroup ? handleEditGroup : handleAddGroup}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('subjectGroups.groupId')}</label>
                <input
                  type="text"
                  name="groupId"
                  value={formData.groupId}
                  onChange={handleInputChange}
                  placeholder={`${t('common.example')} ENG-L1-A, MATH-L2-B`}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  {t('forms.optional')}: Auto-generated if left empty
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('subjectGroups.groupName')} *</label>
                <input
                  type="text"
                  name="groupName"
                  value={formData.groupName}
                  onChange={handleInputChange}
                  required
                  placeholder={`${t('common.example')} IELTS Advanced, Math Foundation`}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('forms.level')} *</label>
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">{t('subjectGroups.selectLevel')}</option>
                    {classOptions.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('forms.startTime')}</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
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
                <div className="form-group">
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('forms.endTime')}</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
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
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '12px', display: 'block', color: '#d32f2f' }}>
                  {t('subjectGroups.selectTeachers')} * ({selectedTeachers.length} {t('forms.selected')})
                </label>
                {!formData.groupName && (
                  <small style={{ color: '#ff9800', marginBottom: '10px', display: 'block' }}>
                    ⚠️ {t('subjectGroups.enterGroupNameFirstTeachers')}
                  </small>
                )}
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '12px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {getAvailableTeachers().length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#999' }}>
                      {formData.groupName 
                        ? t('subjectGroups.noTeachersFound', { subject: formData.groupName }) 
                        : t('subjectGroups.enterGroupNameTeachers')}
                    </p>
                  ) : (
                    getAvailableTeachers().map(teacher => (
                      <label key={teacher._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher._id)}
                          onChange={() => handleTeacherToggle(teacher._id)}
                          style={{ marginRight: '12px', width: '18px', height: '18px' }}
                        />
                        <span>
                          <strong>{teacher.name}</strong> ({teacher.teacherId}) - {Array.isArray(teacher.subject) ? teacher.subject.join(', ') : teacher.subject}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedTeachers.length === 0 && (
                  <small style={{ color: '#d32f2f', marginTop: '5px', display: 'block' }}>
                    {t('subjectGroups.teacherRequired')}
                  </small>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '12px', display: 'block' }}>
                  {t('subjectGroups.selectStudents')} ({selectedStudents.length} {t('forms.selected')})
                </label>
                {!formData.groupName && (
                  <small style={{ color: '#ff9800', marginBottom: '10px', display: 'block' }}>
                    ⚠️ {t('subjectGroups.enterGroupNameFirstStudents')}
                  </small>
                )}
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '12px'
                }}>
                  {getAvailableStudents().length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#999' }}>
                      {(formData.groupName || formData.subject)
                        ? t('subjectGroups.noStudentsFound', { subject: formData.groupName || formData.subject }) 
                        : t('subjectGroups.enterSubjectFirst')}
                    </p>
                  ) : (
                    getAvailableStudents().map(student => (
                      <label key={student._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleStudentToggle(student._id)}
                          style={{ marginRight: '12px', width: '18px', height: '18px' }}
                        />
                        <span>{student.name} ({student.class})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingGroup(null);
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
                  {editingGroup ? t('subjectGroups.updateGroup') : t('subjectGroups.createGroup')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageExamGroups;
