import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { studentAttendanceAPI, examGroupsAPI, schedulerAPI, subjectsAPI } from '../utils/api';
import '../styles/StudentAttendance.css';

const StudentAttendance = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentAttendance, setStudentAttendance] = useState({});
  const [savedAttendance, setSavedAttendance] = useState({}); // Track saved records
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const isTeacher = user.role === 'teacher' && !['admin', 'manager', 'founder'].includes(user.role);
  const [filterMode, setFilterMode] = useState('all'); // Track if filtering is applied

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
        
        // Get IDs of exam groups that have linked schedules to avoid duplication
        const linkedExamGroupIds = schedulesData
          .filter(s => s.subjectGroup && s.subjectGroup._id)
          .map(s => s.subjectGroup._id);
        
        console.log('Linked Exam Group IDs:', linkedExamGroupIds);
        
        // Merge them into a unified format for attendance
        const unifiedGroups = [
          // Include ALL exam groups
          ...groupsData.map(g => ({
            ...g,
            _type: 'exam-group',
            displayId: g.groupId || 'G',
            displayName: g.groupName || g.subject
          })),
          // Only include schedules that are NOT linked to an exam group
          ...schedulesData
            .filter(s => !s.subjectGroup || !s.subjectGroup._id)
            .map(s => ({
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
        
        let processedGroups = unifiedGroups;
        
        // Filter groups based on user role
        if (isTeacher) {
          console.log('[StudentAttendance] Filtering for teacher ID:', user.id, user._id);
          processedGroups = processedGroups.filter(group => {
            const hasTeacher = group.teachers && group.teachers.some(t => {
              const teacherId = t._id || t;
              const userId = user.id || user._id;
              const match = (teacherId === userId);
              if (match) {
                console.log('[StudentAttendance] Match found for group:', group.displayName);
              }
              return match;
            });
            return hasTeacher;
          });
          console.log('[StudentAttendance] Groups after teacher filter:', processedGroups.length);
        }
        
        // Filter out empty groups (must have students to take attendance)
        const filteredGroups = processedGroups.filter(group => group.students && group.students.length > 0);
        
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
        
        data.data.forEach(record => {
          if (record.student && record.student._id) {
            existingRecords[record.student._id] = {
              status: record.status,
              notes: record.notes || '',
              recordedAt: record.createdAt
            };
            savedRecords[record.student._id] = record._id;
          }
        });
        
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
      
      const successMsg = existingRecordId ? t('common.updatedSuccessfully') : t('common.savedSuccessfully');
      
      if (existingRecordId) {
        // Update existing record
        await studentAttendanceAPI.update(existingRecordId, attendancePayload);
      } else {
        // Create new record
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
      
      window.alert(successMsg);
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

  if (loading) return <div className="container"><p>{t('common.loading')}</p></div>;

  const selectedGroupData = groups.find(g => g._id === selectedGroup);

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>{t('attendance.studentAttendance')}</h1>

      {error && <div className="alert alert-error">{error}</div>}
      
      {/* Info message for teachers */}
      {isTeacher && (filterMode === 'current-upcoming-only' || filterMode === 'teacher-assigned') && (
        <div className="alert alert-info" style={{ marginBottom: '20px', backgroundColor: '#e7f3ff', border: '1px solid #2196F3', padding: '12px', borderRadius: '6px' }}>
          <strong>👨‍🏫 {t('common.teacher')} {t('common.view')}:</strong> {t('attendance.teacherViewInfo')}
        </div>
      )}
      
      {/* Info message for staff */}
      {!isTeacher && filterMode === 'all' && (
        <div className="alert alert-info" style={{ marginBottom: '20px', backgroundColor: '#f0f0f0', border: '1px solid #999', padding: '12px', borderRadius: '6px' }}>
          <strong>📊 {t('attendance.allClasses')}:</strong> {t('attendance.allClassesInfo')}
        </div>
      )}

      <div className="card">
        {groups.length === 0 ? (
          <div className="alert alert-info" style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ marginBottom: '15px' }}>📋 {t('attendance.noGroupsAvailable')}</h3>
            <p>
              {isTeacher 
                ? t('attendance.noGroupsTeacherMsg')
                : t('attendance.noGroupsStaffMsg')}
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px' }}>{t('attendance.selectGroup')}:</label>
              <select
                value={selectedGroup || ''}
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minWidth: '250px'
                }}
              >
                <option value="">-- {t('attendance.selectGroup')} --</option>
                {groups.map(group => (
                  <option key={group._id} value={group._id}>
                    {group.displayId} - {group.subject} ({group.class}) {group._type === 'schedule' ? '🗓️' : ''}
                  </option>
                ))}
              </select>
            </div>

        {selectedGroupData && (
          <>
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <strong>{t('sidebar.dashboard')}:</strong> {selectedGroupData.groupId} | 
              <strong style={{ marginLeft: '15px' }}>{t('exams.subject')}:</strong> {selectedGroupData.subject} | 
              <strong style={{ marginLeft: '15px' }}>{t('forms.class')}:</strong> {selectedGroupData.class} | 
              <strong style={{ marginLeft: '15px' }}>{t('students.name')}:</strong> {selectedGroupData.students?.length || 0}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginRight: '10px' }}>{t('attendance.date')}:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>{t('students.studentId')}</th>
                    <th>{t('students.name')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('attendance.notes')}</th>
                    <th>{t('attendance.recordedAt')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedGroupData.students || []).map(student => (
                    <tr key={student._id}>
                      <td>{student.studentId || 'N/A'}</td>
                      <td>{student.name || 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['present', 'absent', 'late'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student._id, status)}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: studentAttendance[student._id]?.status === status 
                                  ? (status === 'present' ? '#4caf50' : status === 'absent' ? '#f44336' : '#ff9800')
                                  : '#f5f5f5',
                                color: studentAttendance[student._id]?.status === status ? '#fff' : '#333',
                                fontWeight: studentAttendance[student._id]?.status === status ? 'bold' : 'normal',
                                textTransform: 'capitalize',
                                fontSize: '12px'
                              }}
                            >
                              {t(`attendance.${status}`)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder={t('common.noData')}
                          value={studentAttendance[student._id]?.notes || ''}
                          onChange={(e) => handleNotesChange(student._id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        />
                      </td>
                      <td>
                        {studentAttendance[student._id]?.recordedAt ? (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(studentAttendance[student._id].recordedAt).toLocaleTimeString(t('common.locale'), {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#999' }}>-</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleSaveStudent(student._id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: savedAttendance[student._id] ? '#2196f3' : '#4caf50',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          {savedAttendance[student._id] ? t('common.edit') : t('common.save')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!selectedGroupData && groups.length > 0 && (
          <p style={{ textAlign: 'center', color: '#666' }}>{t('attendance.selectGroup')} {t('attendance.markAttendance')}</p>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;