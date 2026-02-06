import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { schedulerAPI, teachersAPI, examGroupsAPI, subjectsAPI } from '../utils/api';
import '../styles/Scheduler.css';

const Scheduler = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  // Helper function to abbreviate day names
  const abbreviateDays = (days) => {
    if (!days || days.length === 0) return t('common.noData');
    return days.map(day => t(`common.${day.toLowerCase()}`)).join(', ');
  };

  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    subjectGroup: '', // NEW: Link to subject group
    className: '',
    section: 'A',
    subject: '',
    enrolledStudents: [],
    teacher: '',
    roomNumber: '',
    scheduledDays: [],
    frequency: 'weekly',
    startTime: '',
    endTime: ''
  });
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const branchFilter = getBranchFilter();
      console.log('[Scheduler] Fetching data with branch filter:', branchFilter);

      // Fetch schedules, teachers, and groups in parallel
      const [schedulesRes, teachersRes, groupsRes, subjectsRes] = await Promise.all([
        selectedTeacher 
          ? schedulerAPI.getAll({ teacher: selectedTeacher, ...branchFilter }) 
          : schedulerAPI.getAll(branchFilter),
        teachersAPI.getAll(branchFilter),
        examGroupsAPI.getAll(branchFilter),
        subjectsAPI.getAll()
      ]);

      const subjectsData = subjectsRes.data;

      // Ensure all data is properly populated
      const schedulesData = schedulesRes.data.data || [];
      const teachersData = teachersRes.data.data || [];
      const groupsData = groupsRes.data.data || [];

      setSchedules(schedulesData);
      setTeachers(teachersData);
      setGroups(groupsData);
      setSubjects(subjectsData.data || []);
      
      console.log('[Scheduler] Schedules loaded:', schedulesData.length);
      console.log('[Scheduler] Groups loaded:', groupsData.length);
      console.log('[Scheduler] Teachers loaded:', teachersData.length);
      console.log('[Scheduler] Subjects loaded:', subjectsData.data?.length || 0);
    } catch (err) {
      setError(t('common.error') + ': ' + t('common.loading'));
      console.error('[Scheduler] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeacher, t, getBranchFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedBranch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle group selection and auto-populate
  const handleGroupChange = (e) => {
    const groupId = e.target.value;
    const selectedGroup = groups.find(g => g._id === groupId);
    
    if (selectedGroup) {
      // Get subject ID from subject name if needed
      let subjectId = selectedGroup.subject;
      
      // If subject is a string (name), find the matching subject ID
      if (typeof selectedGroup.subject === 'string') {
        const matchingSubject = subjects.find(
          s => s.name.toLowerCase().trim() === selectedGroup.subject.toLowerCase().trim()
        );
        
        if (matchingSubject) {
          subjectId = matchingSubject._id;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        subjectGroup: groupId,
        className: selectedGroup.class,
        subject: subjectId,
        enrolledStudents: selectedGroup.students.map(s => s._id || s),
        teacher: selectedGroup.teachers?.[0]?._id || selectedGroup.teachers?.[0] || '',
        startTime: selectedGroup.startTime || '',
        endTime: selectedGroup.endTime || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subjectGroup: ''
      }));
    }
  };

  // Filter groups: show only groups without schedules (unless editing)
  const getAvailableGroups = () => {
    if (editingSchedule) {
      // When editing, show all groups
      return groups;
    }
    
    // Get all group IDs that already have schedules
    const groupsWithSchedules = schedules
      .filter(schedule => schedule.subjectGroup)
      .map(schedule => schedule.subjectGroup._id || schedule.subjectGroup);
    
    console.log('Groups with schedules:', groupsWithSchedules);
    console.log('All groups:', groups.map(g => ({ id: g._id, name: g.groupName })));
    
    // Return only groups without schedules
    const available = groups.filter(group => !groupsWithSchedules.includes(group._id));
    console.log('Available groups:', available.map(g => ({ id: g._id, name: g.groupName })));
    
    return available;
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => {
      const currentValues = prev[name] || [];
      if (checked) {
        return {
          ...prev,
          [name]: [...currentValues, value]
        };
      } else {
        return {
          ...prev,
          [name]: currentValues.filter(item => item !== value)
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const successMsg = editingSchedule ? t('common.success') : t('common.success');
      if (editingSchedule) {
        await schedulerAPI.update(editingSchedule._id, formData);
      } else {
        await schedulerAPI.create(formData);
      }
      setShowModal(false);
      setEditingSchedule(null);
      setCustomSubjectInput(''); // Clear custom subject input
      setFormData({
        subjectGroup: '',
        className: '',
        section: 'A',
        subject: '',
        enrolledStudents: [],
        teacher: '',
        roomNumber: '',
        scheduledDays: [],
        frequency: 'weekly',
        startTime: '',
        endTime: ''
      });
      fetchData();
      
      window.alert(successMsg);
    } catch (err) {
      setError(t('common.error') + ': ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleEdit = (schedule) => {
    console.log('Editing schedule:', schedule);
    setEditingSchedule(schedule);
    
    // Check if subject is a custom string (not an ObjectId from dropdown)
    const subjectValue = schedule.subject?._id || schedule.subject || '';
    const isCustomSubject = typeof subjectValue === 'string' && 
                           subjectValue.length > 0 && 
                           !subjects.find(s => s._id === subjectValue);
    
    if (isCustomSubject) {
      // If it's a custom subject, populate the custom input field
      setCustomSubjectInput(subjectValue);
    } else {
      setCustomSubjectInput('');
    }
    
    setFormData({
      subjectGroup: schedule.subjectGroup?._id || schedule.subjectGroup || '',
      className: schedule.className,
      section: schedule.section,
      subject: subjectValue,
      enrolledStudents: schedule.enrolledStudents || [],
      teacher: schedule.teacher?._id || schedule.teacher || '',
      roomNumber: schedule.roomNumber,
      scheduledDays: schedule.scheduledDays || [],
      frequency: schedule.frequency,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
    setShowModal(true);
    console.log('Modal should open now');
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('scheduler.deleteConfirm'))) {
      try {
        await schedulerAPI.delete(id);
        fetchData();
        window.alert(t('scheduler.deleteSuccess'));
      } catch (err) {
        setError(t('scheduler.deleteError') + ': ' + (err.response?.data?.message || err.message));
        console.error(err);
      }
    }
  };

  const openModal = () => {
    setEditingSchedule(null);
    setFormData({
      subjectGroup: '',
      className: '',
      section: 'A',
      subject: '',
      enrolledStudents: [],
      teacher: '',
      roomNumber: '',
      scheduledDays: [],
      frequency: 'weekly',
      startTime: '',
      endTime: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    setCustomSubjectInput(''); // Clear custom subject input
  };

  // Close modal when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Clear teacher filter
  const clearTeacherFilter = () => {
    setSelectedTeacher('');
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="scheduler-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>{t('scheduler.title')}</h1>
        </div>
        <div className="loading-message">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="scheduler-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{t('scheduler.title')}</h1>
        <button className="btn btn-primary" onClick={openModal}>
          {t('scheduler.addSchedule')}
        </button>
      </div>

      {error && <div className="alert alert-danger error-message">{error}</div>}

      {/* Teacher Filter */}
      <div className="filter-section">
        <h3>{t('scheduler.filterByTeacher')}</h3>
        <div className="scheduler-filter-row">
          <div className="scheduler-filter-field">
            <label className="scheduler-filter-label">{t('scheduler.teacher')}</label>
            <select
              className="scheduler-filter-select"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="">{t('scheduler.allTeachers')}</option>
              {teachers
                .filter(teacher => 
                  schedules.some(schedule => schedule.teacher?._id === teacher._id) || 
                  selectedTeacher === teacher._id
                )
                .map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.teacherId} - {teacher.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="scheduler-filter-field">
            <label className="scheduler-filter-label" style={{ visibility: 'hidden' }}>Reset</label>
            <button 
              className="scheduler-filter-reset"
              onClick={clearTeacherFilter}
            >
              {t('common.reset')}
            </button>
          </div>
        </div>
        {teachers.filter(teacher => 
          schedules.some(schedule => schedule.teacher?._id === teacher._id)).length === 0 && 
          schedules.length > 0 && (
            <p className="mt-2 text-muted">
              {t('scheduler.noTeachersWithSchedules')}
            </p>
          )
        }
      </div>

      {/* Schedules Table */}
      <div className="card schedule-list-card">
        <div className="card-header">
          <h3>{t('scheduler.list')}</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-message">{t('common.loading')}</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-4">
              <p>{t('scheduler.noSchedulesFound')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover schedule-table">
                <thead>
                  <tr>
                    <th>{t('scheduler.groupId')}</th>
                    <th>{t('scheduler.subject')}</th>
                    <th>{t('scheduler.level')}</th>
                    <th>{t('scheduler.teacher')}</th>
                    <th>{t('scheduler.room')}</th>
                    <th>{t('scheduler.days')}</th>
                    <th>{t('scheduler.time')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(schedule => (
                    <tr key={schedule._id}>
                      <td>
                        <span style={{ fontWeight: '600', color: '#007bff' }}>
                          {schedule.subjectGroup?.groupId || t('common.unknown')}
                        </span>
                      </td>
                      <td><strong>{schedule.subjectGroup?.subject || schedule.subject?.name || schedule.subject || t('common.unknown')}</strong></td>
                      <td>{schedule.className}</td>
                      <td>{schedule.teacher?.name || schedule.teacher || t('common.unknown')}</td>
                      <td>{schedule.roomNumber}</td>
                      <td>{abbreviateDays(schedule.scheduledDays)}</td>
                      <td>{schedule.startTime} - {schedule.endTime}</td>
                      <td className="action-buttons">
                        <button 
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => handleEdit(schedule)}
                        >
                          {t('common.edit')}
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(schedule._id)}
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Students in Selected Schedule/Group */}
      {selectedTeacher && schedules.length > 0 && (
        <div className="card schedule-students-card" style={{ marginTop: '30px' }}>
          <div className="card-header">
            <h3>{t('scheduler.enrolledStudents')}</h3>
          </div>
          <div className="card-body">
            {schedules.flatMap(schedule => schedule.enrolledStudents || []).length === 0 ? (
              <div className="text-center py-4">
                <p>{t('scheduler.noStudentsEnrolled')}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover students-table">
                  <thead>
                    <tr>
                      <th>{t('students.studentId')}</th>
                      <th>{t('students.name')}</th>
                      <th>{t('scheduler.subject')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(schedule => 
                      (schedule.enrolledStudents || []).map(student => (
                        <tr key={`${schedule._id}-${student._id}`}>
                          <td>{student.studentId || t('common.unknown')}</td>
                          <td><strong>{student.name || t('common.unknown')}</strong></td>
                          <td>{schedule.subject?.name || schedule.subjectGroup?.subject || schedule.subject || t('common.unknown')} - {schedule.className}</td>
                          <td><span className="badge badge-success">{t('common.completed')}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingSchedule ? t('scheduler.editSchedule') : t('scheduler.addSchedule')}
              </h5>
              <button 
                type="button" 
                className="modal-close-button" 
                onClick={closeModal}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Subject Group Selector */}
                <div className="mb-3" style={{ backgroundColor: '#f0f7ff', padding: '15px', borderRadius: '8px', border: '2px solid #4CAF50' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', color: '#2196F3' }}>
                    📚 {t('scheduler.linkGroup')}
                  </label>
                  <select
                    className="form-control"
                    value={formData.subjectGroup}
                    onChange={handleGroupChange}
                    style={{ fontWeight: '500' }}
                  >
                    <option value="">{t('scheduler.selectGroupPlaceholder')}</option>
                    {getAvailableGroups().length === 0 ? (
                      <option disabled>{t('scheduler.allGroupsScheduled')}</option>
                    ) : (
                      getAvailableGroups().map(group => (
                        <option key={group._id} value={group._id}>
                          {group.groupId ? `${group.groupId} - ` : ''}{group.groupName} ({group.class}) - {group.students?.length || 0} {t('feedback.students')}
                        </option>
                      ))
                    )}
                  </select>
                  <small className="form-text" style={{ marginTop: '8px', display: 'block', color: '#4CAF50', fontWeight: '500' }}>
                    🔄 {t('scheduler.autoSyncEnabled')}
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">{t('scheduler.levelName')}</label>
                  <input
                    type="text"
                    className="form-control"
                    name="className"
                    value={formData.className}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('scheduler.subjectClass')}</label>
                  <select
                    className="form-control"
                    name="subject"
                    value={customSubjectInput ? '' : formData.subject}
                    onChange={(e) => {
                      handleInputChange(e);
                      setCustomSubjectInput(''); // Clear custom input when dropdown is used
                    }}
                  >
                    <option value="">{t('scheduler.selectSubjectPlaceholder')}</option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    {t('scheduler.customSubjectHint')}
                  </small>
                  <input
                    type="text"
                    className="form-control mt-2"
                    name="customSubject"
                    placeholder={t('scheduler.customSubjectPlaceholder')}
                    value={customSubjectInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomSubjectInput(value);
                      if (value) {
                        setFormData(prev => ({ ...prev, subject: value }));
                      } else {
                        // If custom input is cleared, restore dropdown selection
                        setFormData(prev => ({ ...prev, subject: '' }));
                      }
                    }}
                  />
                  {customSubjectInput && (
                    <small className="form-text text-success" style={{ marginTop: '5px', display: 'block' }}>
                      ✓ {t('scheduler.usingCustomSubject')}: "{customSubjectInput}"
                    </small>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('scheduler.teacher')}</label>
                  <select
                    className="form-control"
                    name="teacher"
                    value={formData.teacher}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">{t('teachers.selectATeacher')}</option>
                    {teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.teacherId} - {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('scheduler.roomNumber')}</label>
                  <input
                    type="text"
                    className="form-control"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('scheduler.scheduledDays')}</label>
                  <div className="days-checkbox-group">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <div className="form-check form-check-inline" key={day}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="scheduledDays"
                          value={day}
                          checked={formData.scheduledDays.includes(day)}
                          onChange={handleCheckboxChange}
                        />
                        <label className="form-check-label">{t(`common.${day.toLowerCase()}`)}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">{t('scheduler.frequency')}</label>
                  <select
                    className="form-control"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                  >
                    <option value="daily">{t('common.daily')}</option>
                    <option value="weekly">{t('common.weekly')}</option>
                    <option value="bi-weekly">{t('common.biWeekly')}</option>
                    <option value="monthly">{t('common.monthly')}</option>
                  </select>
                </div>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">{t('scheduler.startTime')}</label>
                      <input
                        type="time"
                        className="form-control"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">{t('scheduler.endTime')}</label>
                      <input
                        type="time"
                        className="form-control"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-success">
                  {editingSchedule ? t('scheduler.updateSchedule') : t('scheduler.saveSchedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;