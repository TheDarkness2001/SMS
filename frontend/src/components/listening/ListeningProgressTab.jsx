import React, { useState, useEffect } from 'react';
import { listeningAPI, getImageUrl } from '../../utils/api';

const StudentNameCell = ({ student }) => (
  <div className="student-name-cell">
    {student.profileImage ? (
      <img src={getImageUrl(student.profileImage)} alt={student.name} className="student-avatar-small" />
    ) : (
      <div className="student-avatar-placeholder-small">{student.name?.charAt(0) || '?'}</div>
    )}
    <span>{student.name || 'Unknown'}</span>
  </div>
);

const ListeningProgressTab = ({ t }) => {
  const [studentsProgress, setStudentsProgress] = useState({ groups: [], unassigned: { students: [] } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [groupLevelSelection, setGroupLevelSelection] = useState({});
  const [groupLevelStats, setGroupLevelStats] = useState({});
  const [groupLevelLoading, setGroupLevelLoading] = useState({});

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listeningAPI.getGroupProgress();
      if (res.data.success) {
        setStudentsProgress(res.data.data);
      } else {
        setError(res.data.message || 'Failed to load progress');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupLevelChange = async (groupId, levelId) => {
    setGroupLevelSelection(prev => ({ ...prev, [groupId]: levelId }));
    if (!levelId || levelId === 'all') {
      setGroupLevelStats(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      return;
    }
    setGroupLevelLoading(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await listeningAPI.getLevelStudentStats(levelId);
      if (res.data.success) {
        setGroupLevelStats(prev => ({ ...prev, [groupId]: res.data.data.stats || {} }));
      }
    } catch (err) {
      console.error('Error fetching level stats:', err);
    } finally {
      setGroupLevelLoading(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const isSameDay = (dateStr, targetStr) => {
    if (!dateStr || !targetStr) return false;
    const d = new Date(dateStr);
    const target = new Date(targetStr);
    return d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth() &&
      d.getDate() === target.getDate();
  };

  const filterStudents = (students) => {
    if (!dateFilter) return students;
    return students.filter(s => isSameDay(s.lastActivityDate, dateFilter));
  };

  if (loading) {
    return <div className="loading-state">{t('listening.loading') || 'Loading...'}</div>;
  }

  const subjects = ['all'];
  (studentsProgress.groups || []).forEach(g => {
    if (g.subjectName && !subjects.includes(g.subjectName)) subjects.push(g.subjectName);
  });

  const filteredGroups = (studentsProgress.groups || [])
    .filter(g => subjectFilter === 'all' || g.subjectName === subjectFilter)
    .map(group => ({ ...group, students: filterStudents(group.students) }))
    .filter(g => g.students.length > 0);

  const unassignedStudents = filterStudents(studentsProgress.unassigned?.students || []);

  return (
    <div className="student-progress-section">
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div className="filters-bar-modern">
        <div className="filters-row">
          {subjects.length > 1 && (
            <div className="filter-chip">
              <span className="filter-icon">📚</span>
              <div className="filter-content">
                <label>{t('listening.filterBySubject') || 'Subject'}</label>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="filter-select">
                  <option value="all">{t('listening.allSubjects') || 'All Subjects'}</option>
                  {subjects.filter(s => s !== 'all').map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="filter-chip">
            <span className="filter-icon">📅</span>
            <div className="filter-content">
              <label>{t('listening.filterByDate') || 'Date'}</label>
              <div className="filter-date-wrap">
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="filter-date-input" />
                {dateFilter && (
                  <button className="filter-clear-btn" onClick={() => setDateFilter('')} title={t('listening.clear') || 'Clear'}>×</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 && unassignedStudents.length === 0 ? (
        <div className="no-data">{t('listening.noStudentsYet') || 'No students found.'}</div>
      ) : (
        <div className="progress-groups-list">
          {filteredGroups.map(group => {
            const selectedLevelId = groupLevelSelection[group.groupId] || 'all';
            const levelStats = groupLevelStats[group.groupId] || null;
            const isLevelLoading = groupLevelLoading[group.groupId];
            const listeningLevels = (group.levels || []).slice().sort((a, b) =>
              (a.order || 0) - (b.order || 0) ||
              (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
            );
            const showLevelView = selectedLevelId !== 'all' && levelStats;

            return (
              <div key={group.groupId} className="progress-group-card">
                <div className="progress-group-header-static">
                  <div className="progress-group-title">
                    <span className="progress-group-icon">📁</span>
                    <div>
                      <div className="progress-group-name">{group.groupName}</div>
                      <div className="progress-group-subject">{group.subjectName}</div>
                    </div>
                  </div>
                  <div className="progress-group-filter">
                    <select
                      className="group-lesson-select"
                      value={selectedLevelId}
                      onChange={(e) => handleGroupLevelChange(group.groupId, e.target.value)}
                    >
                      <option value="all">{t('listening.allLevels') || 'All Levels (Aggregate)'}</option>
                      {listeningLevels.map(l => (
                        <option key={l._id} value={l._id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="progress-group-stats">
                    <span>{group.students.length} {t('listening.students') || 'students'}</span>
                  </div>
                </div>
                <div className="progress-group-body">
                  {isLevelLoading ? (
                    <div className="loading-state">{t('listening.loading') || 'Loading...'}</div>
                  ) : (
                    <table className="progress-table">
                      <thead>
                        <tr>
                          <th>{t('listening.studentName') || 'Student Name'}</th>
                          {showLevelView ? (
                            <>
                              <th>{t('listening.attempts') || 'Attempts'}</th>
                              <th>{t('listening.accuracy') || 'Accuracy'}</th>
                            </>
                          ) : (
                            <>
                              <th>{t('listening.listeningPractice') || 'Listening Practice'}</th>
                              <th>{t('listening.attempts') || 'Attempts'}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.students.map(student => {
                          const sStats = showLevelView
                            ? (levelStats[student._id?.toString?.() || student._id] || { attempts: 0, accuracy: 0 })
                            : null;
                          return (
                            <tr key={student._id}>
                              <td><StudentNameCell student={student} /></td>
                              {showLevelView ? (
                                <>
                                  <td>{sStats.attempts}</td>
                                  <td>{sStats.accuracy}%</td>
                                </>
                              ) : (
                                <>
                                  <td>{student.listeningPracticeAccuracy}%</td>
                                  <td>{student.listeningAttempts}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}

          {unassignedStudents.length > 0 && (
            <div className="progress-group-card">
              <div className="progress-group-header-static">
                <div className="progress-group-title">
                  <span className="progress-group-icon">👤</span>
                  <div>
                    <div className="progress-group-name">{t('listening.unassignedStudents') || 'Unassigned Students'}</div>
                  </div>
                </div>
              </div>
              <div className="progress-group-body">
                <table className="progress-table">
                  <thead>
                    <tr>
                      <th>{t('listening.studentName') || 'Student Name'}</th>
                      <th>{t('listening.listeningPractice') || 'Listening Practice'}</th>
                      <th>{t('listening.attempts') || 'Attempts'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map(student => (
                      <tr key={student._id}>
                        <td><StudentNameCell student={student} /></td>
                        <td>{student.listeningPracticeAccuracy}%</td>
                        <td>{student.listeningAttempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListeningProgressTab;
