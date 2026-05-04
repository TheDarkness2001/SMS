import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { examGroupsAPI, studentsAPI, teachersAPI, subjectsAPI } from '../utils/api';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineBook, AiOutlineSchedule } from 'react-icons/ai';
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
    endTime: '',
    branchId: ''
  });

  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [linkedSchedules, setLinkedSchedules] = useState({}); // Map groupId -> schedule
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const branchFilter = getBranchFilter();
      const [groupsRes, studentsRes, teachersRes, subjectsRes] = await Promise.all([
        examGroupsAPI.getAll(branchFilter),
        studentsAPI.getAll(branchFilter),
        teachersAPI.getAll(branchFilter),
        subjectsAPI.getAll()
      ]);
      setGroups(groupsRes.data.data || []);
      setStudents(studentsRes.data.data || []);
      setTeachers(teachersRes.data.data || []);
      setSubjects(subjectsRes.data.data || []);
      
      // Check which groups have linked schedules
      const { schedulerAPI } = await import('../utils/api');
      const schedulesRes = await schedulerAPI.getAll(branchFilter);
      const schedules = schedulesRes.data.data || [];
      const linkedMap = {};
      schedules.forEach(schedule => {
        if (schedule.subjectGroup) {
          linkedMap[schedule.subjectGroup._id || schedule.subjectGroup] = schedule;
        }
      });
      setLinkedSchedules(linkedMap);
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
    
    // Load user from sessionStorage
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    
    // Load branches for founder
    const loadBranches = async () => {
      try {
        const { branchesAPI } = await import('../utils/api');
        const res = await branchesAPI.getAll();
        setBranches(res.data.data || []);
      } catch (err) {
        console.error('Error loading branches:', err);
      }
    };
    loadBranches();
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
    
    // Validate branch selection for founder
    if (user?.role === 'founder' && !formData.branchId) {
      setError(t('branches.selectBranch'));
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        subject: formData.subject,
        students: selectedStudents,
        teachers: selectedTeachers,
        branchId: user?.role === 'founder' ? formData.branchId : selectedBranch?._id
      };
      await examGroupsAPI.create(submitData);
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
        endTime: '',
        branchId: ''
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
    
    // Validate branch selection for founder
    if (user?.role === 'founder' && !formData.branchId) {
      setError(t('branches.selectBranch'));
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        subject: formData.subject,
        students: selectedStudents,
        teachers: selectedTeachers,
        branchId: user?.role === 'founder' ? formData.branchId : selectedBranch?._id
      };
      await examGroupsAPI.update(editingGroup._id, submitData);
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

  // NEW: Create schedule from group
  const handleCreateSchedule = async (group) => {
    try {
      setLoading(true);
      const scheduleData = {
        scheduledDays: group.days || ['Monday', 'Wednesday', 'Friday'],
        frequency: 'weekly',
        roomNumber: group.roomNumber || 'TBD',
        startTime: group.startTime || '09:00',
        endTime: group.endTime || '10:00'
      };
      
      await examGroupsAPI.createSchedule(group._id, scheduleData);
      toast.success(`Schedule created successfully for ${group.groupName}!`);
      fetchData(); // Refresh to show linked status
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.data) {
        // Schedule already exists
        toast.info('A schedule already exists for this group.');
      } else {
        toast.error('Failed to create schedule: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
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
      endTime: group.endTime || '',
      branchId: group.branchId || ''
    });
    setSelectedStudents(group.students.map(s => s._id || s));
    setSelectedTeachers(group.teachers?.map(t => t._id || t) || []);
    setShowEditModal(true);
  };

  const classOptions = Array.from({ length: 10 }, (_, i) => `${t('common.level')} ${i + 1}`);

  // Filter available students: must study the subject
  // Students CAN be in multiple groups (same or different subjects)
  const getAvailableStudents = () => {
    // Use groupName as subject for filtering (since we send groupName as subject to backend)
    const currentSubject = (formData.groupName || formData.subject)?.trim().toLowerCase();
    if (!currentSubject) return students.filter(s => s.status === 'active');

    // Show only ACTIVE students who have the subject in their subjects array
    return students.filter(student => {
      if (student.status !== 'active') return false;

      // Check if student studies this subject
      const studentSubjects = (student.subjects || []).map(s => s.toLowerCase().trim());
      return studentSubjects.includes(currentSubject);
    });
  };

  // Filter available teachers by subject
  const getAvailableTeachers = () => {
    const currentSubject = formData.subject?.trim().toLowerCase();
    if (!currentSubject) return [];

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
                  {linkedSchedules[group._id] ? (
                    <span className="badge badge-success" style={{ marginRight: '5px' }}>
                      <AiOutlineSchedule size={12} style={{ marginRight: '2px' }} /> Scheduled
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleCreateSchedule(group)}
                      style={{ marginRight: '5px' }}
                      title="Create schedule from this group"
                    >
                      <AiOutlineSchedule size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Create Schedule
                    </button>
                  )}
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

              {/* Subject Dropdown - Now linked to Subject model */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('attendance.subject')} *</label>
                <select
                  name="subject"
                  value={formData.subject}
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
                  <option value="">{t('forms.selectSubject')}</option>
                  {subjects.filter(s => s.status === 'active').map(subject => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name} {subject.pricePerClass > 0 ? `($${subject.pricePerClass}/class)` : ''}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Subjects are linked to the Subject database for pricing
                </small>
              </div>

              {/* Branch Selection for Founder */}
              {user?.role === 'founder' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('branches.branch')} *</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
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
                    <option value="">{t('branches.selectBranch')}</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                    setFormData({
                      groupId: '',
                      groupName: '',
                      subject: '',
                      class: '',
                      section: 'A',
                      description: '',
                      startTime: '',
                      endTime: '',
                      branchId: ''
                    });
                    setSelectedStudents([]);
                    setSelectedTeachers([]);
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
