import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { 
  examGroupsAPI, studentsAPI, teachersAPI, subjectsAPI, 
  schedulerAPI, branchesAPI 
} from '../utils/api';
import { 
  AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, 
  AiOutlineTeam, AiOutlineAppstore,
  AiOutlineCheckCircle
} from 'react-icons/ai';
import '../styles/ManageExamGroups.css';

const Groups = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [currentUser] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const isFounder = currentUser.role === 'founder';

  // Data
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [linkedSchedules, setLinkedSchedules] = useState({});

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  // ==================== UNIFIED FORM DATA ====================
  // One form that creates: Subject + Group + Schedule all at once!
  const [unifiedForm, setUnifiedForm] = useState({
    // Subject fields - simplified, just enter subject name
    subjectName: '',
    
    // Branch selection
    branchId: isFounder ? '' : (currentUser.branchId || ''),
    
    // Group fields
    groupId: '',
    groupName: '',
    class: '',
    section: 'A',
    
    // Schedule fields
    roomNumber: '',
    scheduledDays: [],
    frequency: 'weekly',
    startTime: '09:00',
    endTime: '10:00',
  });

  // ==================== DATA FETCHING ====================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const branchFilter = getBranchFilter();

      const [groupsRes, subjectsRes, studentsRes, teachersRes, schedulesRes] = await Promise.all([
        examGroupsAPI.getAll(branchFilter),
        subjectsAPI.getAll(),
        studentsAPI.getAll(branchFilter),
        teachersAPI.getAll(branchFilter),
        schedulerAPI.getAll(branchFilter)
      ]);

      const groupsData = groupsRes.data.data || [];
      const subjectsData = subjectsRes.data.data || [];
      const studentsData = studentsRes.data.data || [];
      const teachersData = teachersRes.data.data || [];
      const schedulesData = schedulesRes.data.data || [];

      setGroups(groupsData);
      setSubjects(subjectsData);
      setStudents(studentsData);
      setTeachers(teachersData);
      setSchedules(schedulesData);

      // Map linked schedules
      const linkedMap = {};
      schedulesData.forEach(schedule => {
        if (schedule.subjectGroup) {
          linkedMap[schedule.subjectGroup._id || schedule.subjectGroup] = schedule;
        }
      });
      setLinkedSchedules(linkedMap);

      if (isFounder) {
        try {
          const branchesRes = await branchesAPI.getAll();
          setBranches(branchesRes.data.data || []);
        } catch (e) { /* ignore */ }
      }
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
  }, [navigate, t, getBranchFilter, isFounder]);

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedBranch]);

  // ==================== RESET FORM ====================
  const resetUnifiedForm = () => {
    setUnifiedForm({
      subjectName: '',
      branchId: isFounder ? '' : (currentUser.branchId || ''),
      groupId: '',
      groupName: '',
      class: '',
      section: 'A',
      roomNumber: '',
      scheduledDays: [],
      frequency: 'weekly',
      startTime: '09:00',
      endTime: '10:00',
    });
    setSelectedStudents([]);
    setSelectedTeachers([]);
  };

  // ==================== OPEN MODALS ====================
  const openCreateModal = () => {
    setModalMode('create');
    setEditingGroup(null);
    resetUnifiedForm();
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setModalMode('edit');
    setEditingGroup(group);
    
    // Pre-fill form with existing data
    const linkedSchedule = linkedSchedules[group._id];
    
    setUnifiedForm({
      subjectName: group.subject?.name || group.subjectName || '',
      branchId: group.branchId || '',
      groupId: group.groupId || '',
      groupName: group.groupName,
      class: group.class,
      section: group.section || 'A',
      roomNumber: linkedSchedule?.roomNumber || '',
      scheduledDays: linkedSchedule?.scheduledDays || [],
      frequency: linkedSchedule?.frequency || 'weekly',
      startTime: linkedSchedule?.startTime || '09:00',
      endTime: linkedSchedule?.endTime || '10:00',
    });
    
    setSelectedStudents(group.students.map(s => s._id || s));
    setSelectedTeachers(group.teachers?.map(t => t._id || t) || []);
    setShowModal(true);
  };

  // ==================== UNIFIED CREATE/UPDATE ====================
  const handleSaveUnified = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate subject name
      if (!unifiedForm.subjectName.trim()) {
        toast.error('Please enter a subject name');
        setLoading(false);
        return;
      }
      
      const subjectName = unifiedForm.subjectName;
      
      // Step 1: Find or create subject
      let subjectId = null;
      const existingSubject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
      
      if (existingSubject) {
        subjectId = existingSubject._id;
      } else {
        // Create new subject if doesn't exist
        const subjectRes = await subjectsAPI.create({
          name: subjectName,
          branchId: isFounder ? unifiedForm.branchId : (selectedBranch?._id || currentUser.branchId)
        });
        subjectId = subjectRes.data.data._id;
        toast.success(`Subject "${subjectName}" created!`);
      }

      // Step 2: Create/Update Group
      const groupData = {
        groupId: unifiedForm.groupId,
        groupName: unifiedForm.groupName,
        subject: subjectId,
        subjectName: subjectName,
        class: unifiedForm.class,
        section: unifiedForm.section,
        students: selectedStudents,
        teachers: selectedTeachers,
        startTime: unifiedForm.startTime,
        endTime: unifiedForm.endTime,
        branchId: isFounder ? unifiedForm.branchId : (selectedBranch?._id || currentUser.branchId)
      };

      let groupId;
      if (modalMode === 'edit' && editingGroup) {
        await examGroupsAPI.update(editingGroup._id, groupData);
        groupId = editingGroup._id;
        toast.success('Group updated!');
      } else {
        const groupRes = await examGroupsAPI.create(groupData);
        groupId = groupRes.data.data._id;
        toast.success('Group created!');
      }

      // Step 3: Create/Update Schedule
      const scheduleData = {
        className: unifiedForm.class,
        section: unifiedForm.section,
        subject: subjectName,
        subjectRef: subjectId,
        subjectGroup: groupId,
        enrolledStudents: selectedStudents,
        teacher: selectedTeachers[0] || null,
        roomNumber: unifiedForm.roomNumber || 'TBD',
        scheduledDays: unifiedForm.scheduledDays,
        frequency: unifiedForm.frequency,
        startTime: unifiedForm.startTime,
        endTime: unifiedForm.endTime,
        branchId: isFounder ? unifiedForm.branchId : (selectedBranch?._id || currentUser.branchId)
      };

      if (modalMode === 'edit' && editingGroup && linkedSchedules[editingGroup._id]) {
        await schedulerAPI.update(linkedSchedules[editingGroup._id]._id, scheduleData);
        toast.success('Schedule updated!');
      } else {
        await schedulerAPI.create(scheduleData);
        toast.success('Schedule created!');
      }

      toast.success(modalMode === 'edit' ? 'All changes saved!' : 'Complete setup done! Subject, Group, and Schedule created!');
      setShowModal(false);
      resetUnifiedForm();
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
      toast.error(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== DELETE ====================
  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Delete this group? Linked schedule will also be deleted.')) return;
    try {
      await examGroupsAPI.delete(id);
      toast.success('Group deleted');
      fetchData();
    } catch (err) {
      toast.error(t('common.error'));
    }
  };



  // ==================== HELPERS ====================
  const abbreviateDays = (days) => {
    if (!days || days.length === 0) return '—';
    return days.map(day => day.slice(0, 3)).join(', ');
  };

  const toggleDay = (day) => {
    setUnifiedForm(prev => ({
      ...prev,
      scheduledDays: prev.scheduledDays.includes(day)
        ? prev.scheduledDays.filter(d => d !== day)
        : [...prev.scheduledDays, day]
    }));
  };

  // Get selected subject name
  const getSelectedSubjectName = () => {
    return unifiedForm.subjectName.toLowerCase().trim();
  };

  // Filter available students based on subject and branch
  // Students CAN be in multiple groups for DIFFERENT subjects (English + IT)
  // But CANNOT be in multiple groups for the SAME subject
  const getAvailableStudents = () => {
    const subjectName = getSelectedSubjectName();
    const selectedBranchId = unifiedForm.branchId;

    // Get student IDs already enrolled in OTHER groups with the SAME subject
    const enrolledInSameSubject = new Set();
    groups.forEach(group => {
      // Skip current group when editing
      if (modalMode === 'edit' && editingGroup && group._id === editingGroup._id) return;

      const groupSubject = (group.subject?.name || group.subjectName || group.groupName || '').toLowerCase().trim();
      if (subjectName && groupSubject === subjectName) {
        group.students?.forEach(s => enrolledInSameSubject.add(s._id || s));
      }
    });

    return students.filter(student => {
      // Must be active (or no status field) - handle case insensitive
      if (student.status && student.status.toLowerCase() !== 'active') return false;

      // Must belong to selected branch
      if (selectedBranchId && student.branchId !== selectedBranchId) return false;

      // Must not already be in another group for the SAME subject
      if (enrolledInSameSubject.has(student._id)) return false;

      // If subject selected, student must be studying that subject
      if (subjectName) {
        // Collect all possible subject fields from student
        const allStudentSubjects = [];

        // Check subjects array
        if (Array.isArray(student.subjects)) {
          student.subjects.forEach(s => {
            if (typeof s === 'string') allStudentSubjects.push(s.toLowerCase().trim());
          });
        }

        // Check single subject field (could be comma-separated)
        if (typeof student.subject === 'string') {
          student.subject.split(',').forEach(s => {
            allStudentSubjects.push(s.toLowerCase().trim());
          });
        }

        // Check subjectName field
        if (typeof student.subjectName === 'string') {
          student.subjectName.split(',').forEach(s => {
            allStudentSubjects.push(s.toLowerCase().trim());
          });
        }

        // Check if any subject matches
        const matchesSubject = allStudentSubjects.some(s =>
          s === subjectName ||
          s.includes(subjectName) ||
          subjectName.includes(s)
        );

        if (!matchesSubject) return false;
      }

      return true;
    });
  };

  // Filter teachers based on selected subject and branch
  const getAvailableTeachers = () => {
    const subjectName = getSelectedSubjectName();
    const selectedBranchId = unifiedForm.branchId;
    
    return teachers.filter(teacher => {
      // Must be active (or no status field) - handle case insensitive
      if (teacher.status && teacher.status.toLowerCase() !== 'active') return false;
      
      // Must belong to selected branch
      if (selectedBranchId && teacher.branchId !== selectedBranchId) return false;
      
      // If subject selected, teacher must teach that subject
      if (subjectName) {
        // Collect all possible subject fields from teacher
        const allTeacherSubjects = [];
        
        // Check subject field (usually an array based on schema)
        if (teacher.subject) {
          if (Array.isArray(teacher.subject)) {
            teacher.subject.forEach(s => {
              if (typeof s === 'string') allTeacherSubjects.push(s.toLowerCase().trim());
            });
          } else if (typeof teacher.subject === 'string') {
            teacher.subject.split(',').forEach(s => {
              allTeacherSubjects.push(s.toLowerCase().trim());
            });
          }
        }
        
        // Check specialization field
        if (typeof teacher.specialization === 'string') {
          teacher.specialization.split(',').forEach(s => {
            allTeacherSubjects.push(s.toLowerCase().trim());
          });
        }
        
        // Check subjectName field (some systems use this)
        if (typeof teacher.subjectName === 'string') {
          teacher.subjectName.split(',').forEach(s => {
            allTeacherSubjects.push(s.toLowerCase().trim());
          });
        }
        
        // Check if any subject matches
        const matchesSubject = allTeacherSubjects.some(s => 
          s === subjectName || s.includes(subjectName) || subjectName.includes(s)
        );
        
        if (!matchesSubject) return false;
      }
      
      return true;
    });
  };

  // ==================== RENDER ====================
  if (loading && groups.length === 0) {
    return <div className="manage-exam-groups-container"><div className="loading">{t('common.loading')}</div></div>;
  }

  return (
    <div className="manage-exam-groups-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AiOutlineAppstore size={28} /> {t('groups.title')}
        </h1>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AiOutlinePlus size={16} /> {t('groups.createCompleteGroup')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Info Banner */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AiOutlineCheckCircle size={24} />
        <div>
          <strong>{t('groups.unifiedManagement')}</strong>
          <div style={{ fontSize: '0.9em', opacity: 0.9 }}>{t('groups.unifiedDescription')}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{groups.length}</div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>{t('groups.stats.groups')}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{subjects.length}</div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>{t('groups.stats.subjects')}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>{schedules.length}</div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>{t('groups.stats.schedules')}</div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0 }}><AiOutlineTeam size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {t('groups.table.allGroups')}</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Level</th>
                <th>Schedule</th>
                <th>Teacher</th>
                <th>Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <AiOutlineAppstore size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <div>No groups yet. Click "Create Complete Group" to get started!</div>
                </td></tr>
              ) : groups.map(group => {
                const schedule = linkedSchedules[group._id];
                // Get teacher color based on first teacher's ID
                const teacherId = group.teachers?.[0]?._id || group.teachers?.[0] || 'none';
                // Generate consistent color from teacher ID
                const getTeacherColor = (id) => {
                  if (!id || id === 'none') return '#ffffff';
                  const colors = [
                    '#bbdefb', // blue - 0
                    '#e1bee7', // purple - 1
                    '#c8e6c9', // green - 2
                    '#ffe0b2', // orange - 3
                    '#f8bbd9', // pink - 4
                    '#b2dfdb', // teal - 5
                    '#dcedc8', // lime - 6
                    '#fff9c4', // yellow - 7
                    '#d7ccc8', // brown - 8
                    '#c5cae9', // indigo - 9
                  ];
                  // Simple hash: sum of char codes
                  const str = String(id);
                  let sum = 0;
                  for (let i = 0; i < str.length; i++) {
                    sum += str.charCodeAt(i);
                  }
                  return colors[sum % colors.length];
                };
                const rowColor = getTeacherColor(teacherId);
                
                return (
                  <tr key={group._id} style={{ backgroundColor: rowColor }}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#333' }}>{group.groupName || ''}</div>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>ID: {group.groupId || '—'}</div>
                    </td>
                    <td>{String(group.class || '')} {String(group.section || '')}</td>
                    <td>
                      {schedule ? (
                        <div>
                          <div style={{ fontSize: '0.85em' }}>{abbreviateDays(schedule.scheduledDays)}</div>
                          <div style={{ fontSize: '0.8em', color: '#666' }}>{schedule.startTime} - {schedule.endTime}</div>
                          <div style={{ fontSize: '0.8em', color: '#999' }}>Room: {schedule.roomNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>No schedule</span>
                      )}
                    </td>
                    <td>
                      {group.teachers?.length > 0 ? (
                        group.teachers.map((teacher, idx) => (
                          <div key={idx} style={{ fontSize: '0.9em', marginBottom: '2px' }}>
                            {teacher.teacherId ? `${teacher.teacherId} - ` : ''}{String(teacher.name || teacher || '')}
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>No teacher</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{group.students?.length || 0} students</span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(group)} style={{ marginRight: '5px' }}>
                        <AiOutlineEdit size={13} /> Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteGroup(group._id)}>
                        <AiOutlineDelete size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ==================== UNIFIED MODAL ==================== */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); } }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '24px 30px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {modalMode === 'edit' ? <><AiOutlineEdit size={24} /> Edit Complete Group</> : <><AiOutlinePlus size={24} /> Create Complete Group</>}
              </h2>
              <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Fill one form to create Subject + Group + Schedule together</p>
            </div>

            <form onSubmit={handleSaveUnified} style={{ padding: '30px' }}>
              
              {/* ==================== STEP 1: SUBJECT ==================== */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                  <h3 style={{ margin: 0, color: '#333' }}>Subject</h3>
                </div>
                
                <div style={{ marginLeft: '42px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <input 
                      type="text" 
                      placeholder="Subject Name (e.g., Russian, Math, English) *" 
                      value={unifiedForm.subjectName} 
                      onChange={(e) => setUnifiedForm({...unifiedForm, subjectName: e.target.value})} 
                      required
                      list="subject-suggestions"
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} 
                    />
                    <datalist id="subject-suggestions">
                      {subjects.filter(s => s.status === 'active').map(subject => (
                        <option key={subject._id} value={subject.name} />
                      ))}
                    </datalist>
                    
                    {/* Branch Selection - for founder only */}
                    {isFounder && (
                      <select 
                        value={unifiedForm.branchId} 
                        onChange={(e) => setUnifiedForm({...unifiedForm, branchId: e.target.value})}
                        required
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' }}
                      >
                        <option value="">Select Branch *</option>
                        {branches.map(branch => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
                      </select>
                    )}
                    
                    <div style={{ fontSize: '0.85em', color: '#666' }}>
                      Type a subject name. If it exists, it will be reused. If new, it will be created automatically.
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================== STEP 2: GROUP ==================== */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                  <h3 style={{ margin: 0, color: '#333' }}>Group Details</h3>
                </div>
                
                <div style={{ marginLeft: '42px', display: 'grid', gap: '12px' }}>
                  <input type="text" placeholder="Group Name *" value={unifiedForm.groupName} onChange={(e) => setUnifiedForm({...unifiedForm, groupName: e.target.value})} required
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} />
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" placeholder="Group ID (auto-generated if empty)" value={unifiedForm.groupId} onChange={(e) => setUnifiedForm({...unifiedForm, groupId: e.target.value})}
                      style={{ flex: 2, padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} />
                    <select value={unifiedForm.class} onChange={(e) => setUnifiedForm({...unifiedForm, class: e.target.value})} required
                      style={{ flex: 1, padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' }}>
                      <option value="">Level *</option>
                      {Array.from({ length: 12 }, (_, i) => `Level ${i + 1}`).map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <select value={unifiedForm.section} onChange={(e) => setUnifiedForm({...unifiedForm, section: e.target.value})}
                      style={{ flex: 0.5, padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' }}>
                      {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Teachers */}
                  <div>
                    <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block', color: '#555' }}>
                      Assign Teachers *
                      {getSelectedSubjectName() && (
                        <span style={{ fontSize: '0.85em', color: '#667eea', marginLeft: '8px' }}>
                          (Showing {getSelectedSubjectName() || 'all'} teachers)
                        </span>
                      )}
                    </label>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '2px solid #e0e0e0', borderRadius: '10px', padding: '12px' }}>
                      {getAvailableTeachers().length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                          {getSelectedSubjectName() 
                            ? <>
                                <div>No teachers found for "{getSelectedSubjectName()}"</div>
                                <div style={{ fontSize: '0.85em', marginTop: '8px' }}>
                                  Make sure teachers have this subject in their profile
                                </div>
                              </>
                            : 'Please enter a subject first to see available teachers.'}
                        </div>
                      ) : getAvailableTeachers().map(teacher => (
                        <label key={teacher._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedTeachers.includes(teacher._id)}
                            onChange={() => setSelectedTeachers(prev => prev.includes(teacher._id) ? prev.filter(id => id !== teacher._id) : [...prev, teacher._id])} />
                          <span>{String(teacher.teacherId || '')} - {String(teacher.name || '')}</span>
                          {(Array.isArray(teacher.subjects) || typeof teacher.subject === 'string') && (
                            <span style={{ fontSize: '0.8em', color: '#667eea', marginLeft: 'auto' }}>
                              {Array.isArray(teacher.subjects) 
                                ? teacher.subjects.filter(s => typeof s === 'string').slice(0, 2).join(', ')
                                : (typeof teacher.subject === 'string' ? teacher.subject.split(',').slice(0, 2).join(', ') : '')}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Students */}
                  <div>
                    <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block', color: '#555' }}>
                      Enroll Students
                      {getSelectedSubjectName() && (
                        <span style={{ fontSize: '0.85em', color: '#667eea', marginLeft: '8px' }}>
                          (Available: {getAvailableStudents().length})
                        </span>
                      )}
                    </label>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '2px solid #e0e0e0', borderRadius: '10px', padding: '12px' }}>
                      {getAvailableStudents().length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                          {getSelectedSubjectName() 
                            ? `No available students for "${getSelectedSubjectName()}". All students may be enrolled in other groups.` 
                            : 'Please select a subject first to see available students.'}
                        </div>
                      ) : getAvailableStudents().map(student => (
                        <label key={student._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedStudents.includes(student._id)}
                            onChange={() => setSelectedStudents(prev => prev.includes(student._id) ? prev.filter(id => id !== student._id) : [...prev, student._id])} />
                          <span>{String(student.studentId || '')} - {String(student.name || '')}</span>
                          {Array.isArray(student.subjects) && student.subjects.length > 0 && (
                            <span style={{ fontSize: '0.8em', color: '#28a745', marginLeft: 'auto' }}>
                              {student.subjects.filter(s => typeof s === 'string').slice(0, 2).join(', ')}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>

                  </div>
                </div>
              </div>

              {/* ==================== STEP 3: SCHEDULE ==================== */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                  <h3 style={{ margin: 0, color: '#333' }}>Schedule</h3>
                </div>
                
                <div style={{ marginLeft: '42px', display: 'grid', gap: '12px' }}>
                  {/* Days */}
                  <div>
                    <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block', color: '#555' }}>Class Days *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          style={{ padding: '8px 16px', borderRadius: '20px', border: unifiedForm.scheduledDays.includes(day) ? '2px solid #667eea' : '2px solid #ddd', background: unifiedForm.scheduledDays.includes(day) ? '#667eea' : 'white', color: unifiedForm.scheduledDays.includes(day) ? 'white' : '#666', cursor: 'pointer', fontSize: '0.9rem', fontWeight: unifiedForm.scheduledDays.includes(day) ? '600' : '400' }}>
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: '500', marginBottom: '6px', display: 'block', color: '#555', fontSize: '0.9rem' }}>Start Time</label>
                      <input type="time" value={unifiedForm.startTime} onChange={(e) => setUnifiedForm({...unifiedForm, startTime: e.target.value})} required
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: '500', marginBottom: '6px', display: 'block', color: '#555', fontSize: '0.9rem' }}>End Time</label>
                      <input type="time" value={unifiedForm.endTime} onChange={(e) => setUnifiedForm({...unifiedForm, endTime: e.target.value})} required
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: '500', marginBottom: '6px', display: 'block', color: '#555', fontSize: '0.9rem' }}>Room</label>
                      <input type="text" placeholder="Room" value={unifiedForm.roomNumber} onChange={(e) => setUnifiedForm({...unifiedForm, roomNumber: e.target.value})}
                        style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: '500', marginBottom: '6px', display: 'block', color: '#555', fontSize: '0.9rem' }}>Frequency</label>
                    <select value={unifiedForm.frequency} onChange={(e) => setUnifiedForm({...unifiedForm, frequency: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', fontSize: '1rem', backgroundColor: 'white' }}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '2px solid #f0f0f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); }} style={{ padding: '12px 24px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {loading ? 'Saving...' : <>{modalMode === 'edit' ? 'Save Changes' : 'Create Complete Group'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
