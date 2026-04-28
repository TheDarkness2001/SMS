import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { presentationAPI, examGroupsAPI } from '../utils/api';
import '../styles/Homework.css';

const TeacherPresentations = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchStudentsAndHistory();
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const res = await examGroupsAPI.getAll();
      if (res.data.success) {
        setGroups(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const fetchStudentsAndHistory = async () => {
    setLoading(true);
    try {
      const group = groups.find(g => g._id === selectedGroup);
      const activeStudents = (group?.students || []).filter(s => s.status === 'active');
      setStudents(activeStudents);

      const now = new Date();
      const res = await presentationAPI.getMonthly({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        branchId: user?.branchId || user?.branch
      });
      if (res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId, value) => {
    setScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleNotesChange = (studentId, value) => {
    setNotes(prev => ({ ...prev, [studentId]: value }));
  };

  const submitScores = async () => {
    const entries = Object.entries(scores).filter(([_, score]) => score !== '');
    if (entries.length === 0) {
      alert(t('presentations.noScores') || 'No scores entered');
      return;
    }

    try {
      for (const [studentId, score] of entries) {
        await presentationAPI.record({
          studentId,
          score: parseInt(score),
          date: selectedDate,
          notes: notes[studentId] || '',
          branchId: user?.branchId || user?.branch
        });
      }
      alert(t('presentations.saved') || 'Scores saved successfully');
      setScores({});
      setNotes({});
      fetchStudentsAndHistory();
    } catch (err) {
      console.error('Error saving scores:', err);
      alert('Failed to save scores');
    }
  };

  const getStudentHistory = (studentId) => {
    const studentData = history.find(h => h.student?._id === studentId);
    return studentData || null;
  };

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h1>{t('presentations.title') || 'Presentations'}</h1>
      </div>

      <div className="filters-bar" style={{ marginBottom: '20px' }}>
        <div className="filter-item">
          <label>{t('groups.group') || 'Group'}</label>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
            <option value="">{t('common.select') || 'Select...'}</option>
            {groups.map(g => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>{t('common.date') || 'Date'}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="date-filter-input"
          />
        </div>
      </div>

      {loading && <div className="loading-state">{t('common.loading') || 'Loading...'}</div>}

      {!loading && selectedGroup && students.length === 0 && (
        <div className="no-data">{t('common.noData') || 'No students found'}</div>
      )}

      {selectedGroup && students.length > 0 && (
        <>
          <div className="progress-groups-list">
            {students.map(student => {
              const hist = getStudentHistory(student._id);
              return (
                <div key={student._id} className="progress-group-card" style={{ marginBottom: '12px' }}>
                  <div className="progress-group-header-static">
                    <h3>{student.name}</h3>
                    {hist && (
                      <span className="avg-score">
                        Avg: {hist.average} ({hist.count} presentations)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                    <label>{t('presentations.score') || 'Score'} (1-10):</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={scores[student._id] || ''}
                      onChange={e => handleScoreChange(student._id, e.target.value)}
                      style={{ width: '60px', padding: '6px' }}
                    />
                    <input
                      type="text"
                      placeholder={t('presentations.notes') || 'Notes'}
                      value={notes[student._id] || ''}
                      onChange={e => handleNotesChange(student._id, e.target.value)}
                      style={{ flex: 1, padding: '6px' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={submitScores}>
              {t('common.save') || 'Save Scores'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherPresentations;
