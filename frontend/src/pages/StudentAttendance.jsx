import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { useToast } from '../context/ToastContext';
import { studentAttendanceAPI, examGroupsAPI, schedulerAPI, subjectsAPI } from '../utils/api';
import { AiOutlineCalendar, AiOutlineTeam, AiOutlineClockCircle, AiOutlineBook } from 'react-icons/ai';
import '../styles/StudentAttendance.css';

const StudentAttendance = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentAttendance, setStudentAttendance] = useState({});
  const [savedAttendance, setSavedAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const isTeacher = user.role === 'teacher' && !['admin', 'manager', 'founder'].includes(user.role);
  const isAdmin = ['admin', 'manager', 'founder'].includes(user.role);
  const [viewMode, setViewMode] = useState('today');

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const branchFilter = getBranchFilter();
        
        console.log('[StudentAttendance] Fetching groups for user:', user);
        console.log('[StudentAttendance] Branch filter:', branchFilter);
        console.log('[StudentAttendance] Is teacher:', isTeacher);
        
        // Fetch both Exam Groups and Class Schedules
        const [groupsRes, schedulesRes] = await Promise.all([
          examGroupsAPI.getAll(branchFilter),
          schedulerAPI.getAll(branchFilter)
        ]);
        
        console.log('[StudentAttendance] Exam groups response:', groupsRes.data);
        console.log('[StudentAttendance] Schedules response:', schedulesRes.data);
        
        const groupsData = groupsRes.data.data || [];
        const schedulesData = schedulesRes.data.data || [];
        
        console.log('[StudentAttendance] Groups data count:', groupsData.length);
        console.log('[StudentAttendance] Schedules data count:', schedulesData.length);
        console.log('[StudentAttendance] Schedules details:', schedulesData.map(s => ({
          _id: s._id,
          className: s.className,
          startTime: s.startTime,
          endTime: s.endTime,
          enrolledStudentsCount: s.enrolledStudents?.length || 0,
          enrolledStudents: s.enrolledStudents,
          teacher: s.teacher?._id || s.teacher,
          subjectGroup: s.subjectGroup?._id || s.subjectGroup
        })));
        
        // Merge them into a unified format for attendance
        // For teachers: show BOTH exam groups AND schedules (including linked ones)
        // A teacher should be able to take attendance for any class they're assigned to
        const unifiedGroups = [
          // Include exam groups
          ...groupsData.map(g => ({
            ...g,
            _type: 'exam-group',
            displayId: g.groupId || 'G',
            displayName: g.groupName || g.subject
          })),
          // Include ALL schedules assigned to this teacher (including linked ones)
          // Each schedule becomes its own attendance group
          ...schedulesData.map(s => ({
            ...s,
            _id: s._id,
            groupId: 'SCH-' + s._id.substring(0, 6),
            groupName: s.className,
            subject: s.subject?.name || s.subject || 'N/A',
            class: s.className,
            students: s.enrolledStudents || [],
            teachers: [s.teacher],
            _type: 'schedule',
            displayId: 'SCH',
            displayName: s.className
          }))
        ];
        
        // Set filter mode from backend response (prefer exam groups' filter mode)
        if (groupsRes.data.filter) {
          setFilterMode(groupsRes.data.filter);
        }
        
        // Backend already filters exam groups for teachers (including via schedules)
        // Only need to filter out empty groups (must have students to take attendance)
        const filteredGroups = unifiedGroups.filter(group => group.students && group.students.length > 0);
        
        console.log('Attendance Groups Loaded:', {
          examGroups: groupsData.length,
          schedules: schedulesData.length,
          totalUnified: unifiedGroups.length,
          finalFiltered: filteredGroups.length
        });

        setGroups(filteredGroups);
        
        // Auto-select first group if nothing selected
        setSelectedGroup(prev => {
          if (!prev && filteredGroups.length > 0) {
            return filteredGroups[0]._id;
          }
          return prev;
        });
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError(t('attendance.failedToLoadGroups'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, [isTeacher, t, user, selectedBranch, getBranchFilter]);

  // Fetch existing attendance records
  const fetchExistingAttendance = useCallback(async (group, date) => {
    try {
      const branchFilter = getBranchFilter();
      const params = {
        date: date,
        class: group.class,
        subject: group.subject,
        ...branchFilter
      };
      
      const response = await studentAttendanceAPI.getAll(params);
      const data = response.data;
      
      if (data.success && data.data) {
        const existingRecords = {};
        const savedRecords = {};
        
        console.log('[StudentAttendance] Fetched existing records:', data.data.length);
        
        data.data.forEach(record => {
          if (record.student && record.student._id) {
            existingRecords[record.student._id] = {
              status: record.status,
              notes: record.notes || '',
              recordedAt: record.createdAt
            };
            savedRecords[record.student._id] = record._id;
            console.log('[StudentAttendance] Record found:', record.student._id, '->', record._id);
          }
        });
        
        console.log('[StudentAttendance] Setting savedRecords:', savedRecords);
        
        setStudentAttendance(prev => ({ ...prev, ...existingRecords }));
        setSavedAttendance(prev => ({ ...prev, ...savedRecords }));
      }
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  }, [getBranchFilter]);

  // Initialize attendance object for selected group
  useEffect(() => {
    if (selectedGroup) {
      const group = groups.find(g => g._id === selectedGroup);
      if (group) {
        const attendance = {};
        const saved = {};
        (group.students || []).forEach(student => {
          attendance[student._id] = { status: '', notes: '', recordedAt: null };
          saved[student._id] = null;
        });
        setStudentAttendance(attendance);
        setSavedAttendance(saved);
        
        // Fetch existing attendance for this date
        fetchExistingAttendance(group, selectedDate);
      }
    }
  }, [selectedGroup, selectedDate, groups, fetchExistingAttendance]);

  const handleStatusChange = (studentId, status) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const handleSaveStudent = async (studentId) => {
    try {
      setError('');
      
      const status = studentAttendance[studentId]?.status;
      if (!status) {
        setError(t('attendance.markAttendance') + ' ' + t('forms.required'));
        return;
      }

      // Get group data to extract required fields
      const group = groups.find(g => g._id === selectedGroup);
      if (!group) {
        setError(t('attendance.groupNotFound'));
        return;
      }

      // Find subject ID from subject name
      let subjectId = group.subject;
      
      // If group.subject is a string (subject name), we need to get the ObjectId
      try {
        const subjectsResponse = await subjectsAPI.getAll();
        
        if (subjectsResponse.data.success && subjectsResponse.data.data) {
          // Map common subject aliases
          let searchSubject = group.subject;
          const subjectAliases = {
            'it': 'computer science',
            'information technology': 'computer science',
            'cs': 'computer science',
            'informatics': 'computer science',
            'ict': 'computer science',
            'programming': 'computer science',
            'math': 'mathematics',
            'maths': 'mathematics',
            'bio': 'biology',
            'chem': 'chemistry',
            'phy': 'physics',
            'eng': 'english',
            'lit': 'literature',
            'geo': 'geography',
            'his': 'history',
          };
          
          const normalizedSubject = group.subject.toLowerCase().trim();
          if (subjectAliases[normalizedSubject]) {
            searchSubject = subjectAliases[normalizedSubject];
          }
          
          const matchingSubject = subjectsResponse.data.data.find(
            s => s.name.toLowerCase().trim() === searchSubject.toLowerCase().trim() || s._id === group.subject
          );
          
          if (matchingSubject) {
            subjectId = matchingSubject._id;
          } else if (typeof group.subject === 'string') {
            const availableNames = subjectsResponse.data.data.map(s => s.name).join(', ');
            setError(t('attendance.subjectNotFound', { subject: group.subject, available: availableNames }));
            return;
          }
        }
      } catch (subjectErr) {
        console.error('Error fetching subjects:', subjectErr);
        setError(t('attendance.failedToFetchSubjects'));
        return;
      }

      // Get teacher ID from group
      const teacherId = group.teachers && group.teachers.length > 0 
        ? (group.teachers[0]._id || group.teachers[0]) 
        : null;

      if (!teacherId) {
        setError(t('attendance.teacherNotFound'));
        return;
      }

      const attendancePayload = {
        student: studentId,
        status,
        date: selectedDate,
        class: group.class,
        subject: subjectId,
        teacher: teacherId,
        period: 1,
        notes: studentAttendance[studentId]?.notes || ''
      };

      console.log('Sending attendance data:', attendancePayload);
      console.log('Subject ID type:', typeof subjectId, subjectId);

      // Check if updating existing record
      const existingRecordId = savedAttendance[studentId];
      
      console.log('[StudentAttendance] Saving attendance for student:', studentId);
      console.log('[StudentAttendance] existingRecordId:', existingRecordId);
      console.log('[StudentAttendance] savedAttendance state:', savedAttendance);
      
      const successMsg = existingRecordId ? t('common.updatedSuccessfully') : t('common.savedSuccessfully');
      
      if (existingRecordId) {
        // Update existing record
        console.log('[StudentAttendance] Updating existing record:', existingRecordId);
        await studentAttendanceAPI.update(existingRecordId, attendancePayload);
      } else {
        // Create new record
        console.log('[StudentAttendance] Creating new record');
        const response = await studentAttendanceAPI.create(attendancePayload);
        // Save the record ID
        setSavedAttendance(prev => ({
          ...prev,
          [studentId]: response.data.data._id
        }));
      }
      
      // Update recordedAt timestamp
      setStudentAttendance(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          recordedAt: new Date().toISOString()
        }
      }));
      
      toast.success(successMsg);
    } catch (err) {
      console.error('Attendance save error:', err);
      console.error('Error response data:', err.response?.data);
      
      // Handle duplicate attendance error
      if (err.response?.data?.code === 'DUPLICATE_ATTENDANCE') {
        setError(`${t('common.error')}: ${t('attendance.alreadyMarked')} ${new Date(selectedDate).toLocaleDateString(t('common.locale'))}`);
      } else if (err.response?.data?.code === 'INVALID_SUBJECT') {
        const availableSubjects = err.response?.data?.availableSubjects?.map(s => s.name).join(', ') || 'None';
        setError(t('attendance.subjectNotFound', { subject: 'Unknown', available: availableSubjects }));
      } else {
        setError(err.response?.data?.message || t('attendance.failedToSave'));
      }
      
      setTimeout(() => setError(''), 8000);
    }
  };

  // Compute today's groups
  const todayGroups = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return groups.filter(group => {
      const scheduleDays = group.days || group.scheduledDays || [];
      return scheduleDays.includes(today) || group.frequency === 'daily';
    });
  }, [groups]);

  const displayedGroups = viewMode === 'today' ? todayGroups : groups;

  if (loading) return <div className="student-attendance-container"><p>{t('common.loading')}</p></div>;

  return (
    <div className="student-attendance-container">
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', margin: 0 }}>{t('attendance.studentAttendance')}</h1>
          <p className="subtitle" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', margin: '2px 0 0 0', opacity: 0.8 }}>
            {viewMode === 'today' ? t('attendance.todaysClasses') : t('attendance.allClasses')}
          </p>
        </div>
      </div>

      {error && !selectedGroup && <div className="alert alert-error">{error}</div>}

      {/* Admin Filter Toolbar */}
      {isAdmin && (
        <div className="attendance-toolbar">
          <div className="view-mode-buttons">
            <button
              className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              📋 {t('attendance.allClasses')}
            </button>
            <button
              className={`view-btn ${viewMode === 'today' ? 'active' : ''}`}
              onClick={() => setViewMode('today')}
            >
              📅 {t('attendance.todaysClasses')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontWeight: 500 }}>{t('attendance.date')}:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}

      {/* Teacher Date Picker */}
      {!isAdmin && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 500 }}>{t('attendance.date')}:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      )}

      {/* Groups Grid */}
      {displayedGroups.length === 0 ? (
        <div className="alert alert-info" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ marginBottom: '15px' }}>📋 {viewMode === 'today' ? t('attendance.noClassesToday') : t('attendance.noGroupsAvailable')}</h3>
          <p>{isTeacher ? t('attendance.noGroupsTeacherMsg') : t('attendance.noGroupsStaffMsg')}</p>
        </div>
      ) : (
        <div className="classes-grid">
          {displayedGroups.map(group => {
            const isSelected = selectedGroup === group._id;
            return (
              <div key={group._id} className={`class-card ${isSelected ? 'class-card--active' : ''}`}>
                <div className="class-header">
                  <h3>{group.groupName || group.displayName || 'Unnamed'}</h3>
                  <span className="class-badge">{group.class || group.className || 'N/A'}</span>
                </div>
                <div className="class-info">
                  <p><AiOutlineBook /> <strong>{t('exams.subject')}:</strong> {group.subject?.name || String(group.subject || '')}</p>
                  <p><AiOutlineClockCircle /> <strong>{t('exams.time')}:</strong> {group.startTime || '--:--'} - {group.endTime || '--:--'}</p>
                  <p><AiOutlineTeam /> <strong>{t('students.title')}:</strong> {group.students?.length || 0}</p>
                  {group.days?.length > 0 && (
                    <p><AiOutlineCalendar /> <strong>{t('scheduler.days')}:</strong> {group.days?.join(', ') || group.scheduledDays?.join(', ')}</p>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedGroup(isSelected ? null : group._id)}
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {isSelected ? t('common.close') : t('attendance.markAttendance')}
                </button>

                {isSelected && (
                  <div className="students-list">
                    <h4>{t('attendance.studentsList')}</h4>
                    {group.students?.length > 0 ? (
                      <div className="attendance-students">
                        {group.students.map(student => (
                          <div key={student._id} className="attendance-student-row">
                            <div className="attendance-student-header">
                              <div className="attendance-student-name">
                                <strong>{student.name || 'N/A'}</strong>
                                <span className="attendance-student-id">{student.studentId || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="attendance-status-bar">
                              {['present', 'absent', 'late'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(student._id, status)}
                                  className={`attendance-status-btn ${studentAttendance[student._id]?.status === status ? `is-${status}` : ''}`}
                                >
                                  {t(`attendance.${status}`)}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="attendance-notes-input"
                              placeholder={t('attendance.notes')}
                              value={studentAttendance[student._id]?.notes || ''}
                              onChange={(e) => handleNotesChange(student._id, e.target.value)}
                            />
                            <button
                              className="attendance-save-btn"
                              onClick={() => handleSaveStudent(student._id)}
                            >
                              {savedAttendance[student._id] ? t('common.update') : t('common.save')}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-students">{t('attendance.noStudents')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;