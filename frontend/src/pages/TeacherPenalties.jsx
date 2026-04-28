import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { penaltyAPI, examGroupsAPI } from '../utils/api';
import '../styles/Homework.css';

const TeacherPenalties = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupPenalties();
    }
  }, [selectedGroup, selectedDate]);

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

  const fetchGroupPenalties = async () => {
    setLoading(true);
    try {
      const res = await penaltyAPI.getGroupPenalties(selectedGroup, { date: selectedDate });
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching penalties:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPenalty = async (studentId, type, points, quantity = 1) => {
    try {
      await penaltyAPI.create({
        studentId,
        type,
        points,
        quantity,
        date: selectedDate,
        branchId: user?.branchId || user?.branch
      });
      fetchGroupPenalties();
    } catch (err) {
      console.error('Error adding penalty:', err);
      alert('Failed to add penalty');
    }
  };

  const revertPenalty = async (penaltyId) => {
    if (!window.confirm(t('common.confirmRevert') || 'Revert this penalty?')) return;
    try {
      await penaltyAPI.revert(penaltyId);
      fetchGroupPenalties();
    } catch (err) {
      console.error('Error reverting penalty:', err);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      spoken_uzbek: t('penalties.spokenUzbek') || 'Uzbek Word',
      missed_presentation: t('penalties.missedPresentation') || 'Missed Presentation',
      missed_writing_homework: t('penalties.missedHomework') || 'Missed Homework',
      missed_word_memorization: t('penalties.missedMemorization') || 'Missed Memorization'
    };
    return labels[type] || type;
  };

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h1>{t('penalties.title') || 'Penalties'}</h1>
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
        <div className="progress-groups-list">
          {students.map(({ student, penalties: sp, total }) => (
            <div key={student._id} className="progress-group-card">
              <div className="progress-group-header-static">
                <h3>{student.name}</h3>
                <span className="total-penalty" style={{ color: total < 0 ? '#ef4444' : '#22c55e' }}>
                  {total} pts
                </span>
              </div>

              <div className="quick-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  className="btn btn-small btn-delete"
                  onClick={() => addPenalty(student._id, 'spoken_uzbek', -1, 1)}
                >
                  +1 {t('penalties.uzbekWord') || 'Uzbek Word'}
                </button>
                <button
                  className="btn btn-small btn-delete"
                  onClick={() => addPenalty(student._id, 'missed_presentation', -10)}
                >
                  {t('penalties.missedPresentation') || 'Missed Presentation'} (-10)
                </button>
                <button
                  className="btn btn-small btn-delete"
                  onClick={() => addPenalty(student._id, 'missed_writing_homework', -5)}
                >
                  {t('penalties.missedHomework') || 'Missed HW'} (-5)
                </button>
                <button
                  className="btn btn-small btn-delete"
                  onClick={() => addPenalty(student._id, 'missed_word_memorization', -5)}
                >
                  {t('penalties.missedMemorization') || 'Missed Mem'} (-5)
                </button>
              </div>

              {sp.length > 0 && (
                <table className="progress-table">
                  <thead>
                    <tr>
                      <th>{t('common.type') || 'Type'}</th>
                      <th>{t('common.points') || 'Points'}</th>
                      <th>{t('common.notes') || 'Notes'}</th>
                      <th>{t('common.source') || 'Source'}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sp.map(p => (
                      <tr key={p._id}>
                        <td>{getTypeLabel(p.type)}</td>
                        <td style={{ color: p.points < 0 ? '#ef4444' : '#22c55e' }}>
                          {p.points * p.quantity}
                        </td>
                        <td>{p.notes}</td>
                        <td>{p.source}</td>
                        <td>
                          <button className="btn btn-small btn-secondary" onClick={() => revertPenalty(p._id)}>
                            {t('common.revert') || 'Revert'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherPenalties;
