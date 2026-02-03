import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './StudentAttendanceTable.css';

const StudentAttendanceTable = ({ students, attendanceRecords, onAddAttendance, onEditAttendance, onViewDetails }) => {
  const { t } = useLanguage();
  // Group students by class
  const groupStudentsByClass = (studentsList) => {
    return studentsList.reduce((groups, student) => {
      const classKey = `${student.class}-${student.section}`;
      if (!groups[classKey]) {
        groups[classKey] = {
          class: student.class,
          section: student.section,
          students: []
        };
      }
      groups[classKey].students.push(student);
      return groups;
    }, {});
  };

  const groupedStudents = groupStudentsByClass(students);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get attendance record for a student on a specific date
  const getAttendanceForStudent = (studentId, date = today) => {
    return attendanceRecords.find(record => 
      record.student && record.student._id === studentId && 
      new Date(record.date).toISOString().split('T')[0] === date
    );
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'present': return 'badge-success';
      case 'absent': return 'badge-danger';
      case 'late': return 'badge-warning';
      case 'half-day': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="student-attendance-table">
      {Object.keys(groupedStudents).map(classKey => {
        const classGroup = groupedStudents[classKey];
        return (
          <div key={classKey} className="class-group">
            <div className="class-header">
              <h3>{classGroup.class} {classGroup.section}</h3>
              <p>{classGroup.students.length} {t('attendance.studentsEnrolled')}</p>
            </div>
            
            {/* Desktop & Tablet: Table View */}
            <div className="table-responsive desktop-tablet-only">
              <table className="table table-hover attendance-table">
                <thead>
                  <tr>
                    <th>{t('students.studentId')}</th>
                    <th>{t('students.name')}</th>
                    <th>{t('attendance.todaysStatus')}</th>
                    <th>{t('attendance.checkIn')}</th>
                    <th>{t('attendance.checkOut')}</th>
                    <th>{t('attendance.comments')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {classGroup.students.map(student => {
                    const attendanceRecord = getAttendanceForStudent(student._id);
                    
                    return (
                      <tr key={student._id}>
                        <td>{student.studentId}</td>
                        <td>{student.name}</td>
                        <td>
                          {attendanceRecord ? (
                            <span className={`badge ${getStatusBadgeClass(attendanceRecord.status)}`}>
                              {attendanceRecord.status === 'present' ? t('attendance.present') : 
                               attendanceRecord.status === 'absent' ? t('attendance.absent') : 
                               attendanceRecord.status === 'late' ? t('attendance.late') : 
                               t('attendance.halfDay')}
                            </span>
                          ) : (
                            <span className="badge badge-secondary">{t('attendance.notMarked')}</span>
                          )}
                        </td>
                        <td>{attendanceRecord?.checkInTime || '-'}</td>
                        <td>{attendanceRecord?.checkOutTime || '-'}</td>
                        <td>
                          {attendanceRecord?.notes ? (
                            <span title={attendanceRecord.notes}>
                              {attendanceRecord.notes.length > 30 
                                ? `${attendanceRecord.notes.substring(0, 30)}...` 
                                : attendanceRecord.notes}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn btn-small btn-primary"
                              onClick={() => onAddAttendance(student)}
                            >
                              {t('common.add')}
                            </button>
                            {attendanceRecord && (
                              <button 
                                className="btn btn-small btn-warning"
                                onClick={() => onEditAttendance(attendanceRecord)}
                              >
                                {t('common.edit')}
                              </button>
                            )}
                            <button 
                              className="btn btn-small btn-info"
                              onClick={() => onViewDetails(student)}
                            >
                              {t('common.view')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card View */}
            <div className="mobile-cards-view mobile-only">
              {classGroup.students.map(student => {
                const attendanceRecord = getAttendanceForStudent(student._id);
                return (
                  <MobileAttendanceCard
                    key={student._id}
                    student={student}
                    attendanceRecord={attendanceRecord}
                    getStatusBadgeClass={getStatusBadgeClass}
                    onAddAttendance={onAddAttendance}
                    onEditAttendance={onEditAttendance}
                    onViewDetails={onViewDetails}
                  />
                );
              })}
              
              {/* Bulk Save Button - Fixed at bottom */}
              <div className="bulk-save-container">
                <button
                  className="bulk-save-btn"
                  onClick={() => {
                    // Collect all students with status changes
                    classGroup.students.forEach(student => {
                      if (student._tempStatus) {
                        const existingRecord = getAttendanceForStudent(student._id);
                        if (existingRecord) {
                          onEditAttendance({
                            ...existingRecord,
                            status: student._tempStatus,
                            notes: student._tempNotes || ''
                          });
                        } else {
                          onAddAttendance({
                            ...student,
                            status: student._tempStatus,
                            notes: student._tempNotes || ''
                          });
                        }
                      }
                    });
                  }}
                  type="button"
                >
                  💾 {t('attendance.saveAll')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile Card Component for individual student - Quick Mark Mode
const MobileAttendanceCard = ({ 
  student, 
  attendanceRecord, 
  getStatusBadgeClass,
  onAddAttendance,
  onEditAttendance,
  onViewDetails 
}) => {
  const [status, setStatus] = useState(attendanceRecord?.status || '');
  const [notes, setNotes] = useState(attendanceRecord?.notes || '');
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Update parent component when status changes
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    // Store in a temporary state that will be saved in bulk
    student._tempStatus = newStatus;
    student._tempNotes = notes;
  };

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    student._tempNotes = newNotes;
  };

  const handleNotesSave = () => {
    student._tempNotes = notes;
    setShowNotesModal(false);
  };

  return (
    <>
      <div className="mobile-quick-mark-row">
        <div className="student-info-quick">
          <div className="student-name-quick">{student.name}</div>
          <div className="student-id-quick">{t('students.idLabel')}: {student.studentId}</div>
        </div>

        {/* Three-state toggle buttons */}
        <div className="status-toggle-group">
          <button
            className={`status-btn status-present ${status === 'present' ? 'active' : ''}`}
            onClick={() => handleStatusChange('present')}
            type="button"
          >
            ✓
          </button>
          <button
            className={`status-btn status-absent ${status === 'absent' ? 'active' : ''}`}
            onClick={() => handleStatusChange('absent')}
            type="button"
          >
            ✕
          </button>
          <button
            className={`status-btn status-late ${status === 'late' ? 'active' : ''}`}
            onClick={() => handleStatusChange('late')}
            type="button"
          >
            ⏰
          </button>
        </div>

        {/* Add Note Button */}
        <button
          className={`add-note-btn ${notes ? 'has-note' : ''}`}
          onClick={() => setShowNotesModal(true)}
          type="button"
          title={notes ? t('attendance.editNote') : t('attendance.addNote')}
        >
          {notes ? '📝' : '+'}
        </button>
      </div>

      {/* Notes Modal Pop-up */}
      {showNotesModal && (
        <div className="notes-modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <h4>{t('attendance.addNoteFor')} {student.name}</h4>
              <button 
                className="modal-close-btn"
                onClick={() => setShowNotesModal(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="notes-modal-body">
              <textarea
                className="notes-modal-input"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder={t('attendance.addCommentsPlaceholder')}
                rows="4"
                autoFocus
              />
            </div>
            <div className="notes-modal-footer">
              <button
                className="notes-modal-btn cancel-btn"
                onClick={() => setShowNotesModal(false)}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="notes-modal-btn save-btn"
                onClick={handleNotesSave}
                type="button"
              >
                ✓ {t('attendance.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentAttendanceTable;