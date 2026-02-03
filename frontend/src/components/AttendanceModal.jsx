import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './AttendanceModal.css';

const AttendanceModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  student, 
  attendanceRecord,
  teachers 
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    student: student?._id || '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    class: student?.class || '',
    section: student?.section || 'A',
    subject: '',
    teacher: '',
    period: 1,
    checkInTime: '',
    checkOutTime: '',
    notes: ''
  });

  useEffect(() => {
    if (attendanceRecord) {
      setFormData({
        student: attendanceRecord.student?._id || '',
        date: attendanceRecord.date ? new Date(attendanceRecord.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: attendanceRecord.status || 'present',
        class: attendanceRecord.class || student?.class || '',
        section: attendanceRecord.section || student?.section || 'A',
        subject: attendanceRecord.subject || '',
        teacher: attendanceRecord.teacher?._id || '',
        period: attendanceRecord.period || 1,
        checkInTime: attendanceRecord.checkInTime || '',
        checkOutTime: attendanceRecord.checkOutTime || '',
        notes: attendanceRecord.notes || ''
      });
    } else if (student) {
      setFormData(prev => ({
        ...prev,
        student: student._id,
        class: student.class || '',
        section: student.section || 'A'
      }));
    }
  }, [attendanceRecord, student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{attendanceRecord ? t('attendance.editAttendance') : t('attendance.addAttendance')}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        {/* Time restriction notice for teachers */}
        {!attendanceRecord && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '12px',
            margin: '15px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <strong>⏰ {t('attendance.timeRestrictionNotice')}</strong>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>{t('common.student')}</label>
              <input
                type="text"
                value={`${student?.studentId || ''} - ${student?.name || ''}`}
                readOnly
                className="form-control"
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>{t('attendance.date')} *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('attendance.status')} *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-control"
                  required
                >
                  <option value="present">{t('attendance.present')}</option>
                  <option value="absent">{t('attendance.absent')}</option>
                  <option value="late">{t('attendance.late')}</option>
                  <option value="half-day">{t('attendance.halfDay')}</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>{t('attendance.class')}</label>
                <input
                  type="text"
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  className="form-control"
                  placeholder={t('attendance.classPlaceholder')}
                />
              </div>
              
              <div className="form-group">
                <label>{t('attendance.section')}</label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="form-control"
                  placeholder={t('attendance.sectionPlaceholder')}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>{t('attendance.subject')} *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-control"
                  placeholder={t('attendance.subjectPlaceholder')}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('attendance.period')} *</label>
                <input
                  type="number"
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  className="form-control"
                  min="1"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>{t('attendance.teacher')} *</label>
              <select
                name="teacher"
                value={formData.teacher}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">{t('attendance.selectATeacher')}</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({Array.isArray(teacher.subject) ? teacher.subject.join(', ') : teacher.subject})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>{t('attendance.checkInTime')}</label>
                <input
                  type="time"
                  name="checkInTime"
                  value={formData.checkInTime}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label>{t('attendance.checkOutTime')}</label>
                <input
                  type="time"
                  name="checkOutTime"
                  value={formData.checkOutTime}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>{t('attendance.comments')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder={t('attendance.addCommentsPlaceholder')}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {attendanceRecord ? t('common.update') : t('common.save')} {t('attendance.attendanceRecord')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceModal;