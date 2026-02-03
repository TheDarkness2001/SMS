import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { examsAPI, studentsAPI } from '../utils/api';
import '../styles/ExamResults.css';

const ExamResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingResult, setEditingResult] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [resultData, setResultData] = useState({
    marksObtained: 0,
    grade: '',
    remarks: ''
  });
  const [newStudentId, setNewStudentId] = useState('');

  const fetchExamDetails = useCallback(async () => {
    try {
      const response = await examsAPI.getOne(id);
      setExam(response.data.data);
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExamDetails();
  }, [id, fetchExamDetails]);

  const fetchAllStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      setAllStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleEditResult = (result) => {
    // Check if student is eligible for the exam
    if (result.student.examEligibility === false) {
      alert(t('examResults.notEligibleAlert'));
      return;
    }
    
    setEditingResult(result);
    setResultData({
      marksObtained: result.marksObtained || 0,
      grade: result.grade || '',
      remarks: result.remarks || ''
    });
  };

  const handleResultChange = (e) => {
    setResultData({
      ...resultData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveResult = async () => {
    try {
      const response = await examsAPI.updateResult(
        id, 
        editingResult.student._id, 
        resultData
      );
      setExam(response.data.data);
      setEditingResult(null);
      setResultData({
        marksObtained: 0,
        grade: '',
        remarks: ''
      });
    } catch (error) {
      console.error('Error updating result:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      }
    }
  };

  const handleMarkAbsentFailed = async () => {
    if (window.confirm(t('examResults.markAbsentConfirm'))) {
      try {
        const response = await examsAPI.markAbsentFailed(id);
        setExam(response.data.data);
        alert(`${response.data.message}`);
      } catch (error) {
        console.error('Error marking absent students:', error);
      }
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentId) {
      alert(t('common.selectStudent'));
      return;
    }
    
    try {
      const response = await examsAPI.addStudent(id, newStudentId);
      setExam(response.data.data);
      setAddingStudent(false);
      setNewStudentId('');
      alert(response.data.message);
    } catch (error) {
      console.error('Error adding student:', error);
      alert(error.response?.data?.message || t('examResults.addStudentError'));
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (window.confirm(t('examResults.removeStudentConfirm'))) {
      try {
        const response = await examsAPI.removeStudent(id, studentId);
        setExam(response.data.data);
        alert(t('examResults.removeStudentSuccess'));
      } catch (error) {
        console.error('Error removing student:', error);
        alert(t('examResults.removeStudentError'));
      }
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-message">{t('examResults.loadingExam')}</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container">
        <div className="alert alert-error">{t('examResults.examNotFound')}</div>
        <button onClick={() => navigate('/exams')} className="btn btn-primary">
          {t('examResults.backToExams')}
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1>{exam.examName} {t('examResults.results')}</h1>
          <p className="text-muted">
            {t('attendance.subject')}: {exam.subject} | {t('students.class')}: {exam.class} | {t('payments.date')}: {new Date(exam.examDate).toLocaleDateString(t('common.locale'))}
          </p>
        </div>
        <button onClick={() => navigate('/exams')} className="btn btn-secondary">
          {t('examResults.backToExams')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{t('examResults.examDetails')}</h3>
          <div>
            <button 
              className="btn btn-warning"
              onClick={handleMarkAbsentFailed}
              style={{ marginRight: '10px' }}
            >
              {t('examResults.markAbsentFailed')}
            </button>
            <button 
              className="btn btn-success"
              onClick={() => {
                setAddingStudent(true);
                fetchAllStudents();
              }}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              {t('common.addStudent')}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div>
            <strong>{t('exams.totalMarks')}:</strong> {exam.totalMarks}
          </div>
          <div>
            <strong>{t('exams.passingMarks')}:</strong> {exam.passingMarks}
          </div>
          <div>
            <strong>{t('exams.duration')}:</strong> {exam.duration} {t('examResults.minutes')}
          </div>
          <div>
            <strong>{t('common.status')}:</strong> 
            <span className={`badge badge-${exam.status === 'completed' ? 'success' : exam.status === 'ongoing' ? 'primary' : 'warning'}`}>
              {t(`common.${exam.status}`)}
            </span>
          </div>
          <div>
            <strong>{t('exams.studentsEnrolled')}:</strong> {exam.results ? exam.results.length : 0}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {addingStudent && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('examResults.addStudentToExam')}</h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setAddingStudent(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('common.selectStudent')} *</label>
                  <select
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="form-control"
                  >
                    <option value="">{t('examResults.selectStudent')}</option>
                    {allStudents
                      .filter(student => student.status === 'active')
                      .map(student => (
                        <option key={student._id} value={student._id}>
                          {student.studentId} - {student.name} ({student.class})
                          {student.examEligibility === false && ` (${t('examResults.notEligible')})`}
                        </option>
                      ))}
                  </select>
                  <small className="form-text text-muted">
                    {t('examResults.notEligibleNote')}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setAddingStudent(false)}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleAddStudent}
                >
                  {t('common.add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>{t('examResults.studentResults')}</h3>
        {(!exam.results || exam.results.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            {t('examResults.noStudentsEnrolled')}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('students.studentId')}</th>
                <th>{t('students.name')}</th>
                <th>{t('examResults.marksObtained')}</th>
                <th>{t('examResults.eligibility')}</th>
                <th>{t('examResults.remarks')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {exam.results.map((result) => {
                const student = result.student;
                const isEligible = student.examEligibility !== false;
                
                return (
                  <tr key={result._id || student._id}>
                    <td>{student.studentId}</td>
                    <td>{student.name}</td>
                    <td>
                      <strong>{result.marksObtained}</strong> / {exam.totalMarks}
                      {result.marksObtained >= exam.passingMarks ? (
                        <span className="badge badge-success" style={{ marginLeft: '10px' }}>{t('examResults.pass')}</span>
                      ) : (
                        <span className="badge badge-danger" style={{ marginLeft: '10px' }}>{t('examResults.fail')}</span>
                      )}
                    </td>
                    <td>
                      {isEligible ? (
                        <span className="badge badge-success">{t('examResults.eligible')}</span>
                      ) : (
                        <span className="badge badge-danger">{t('examResults.notEligible')}</span>
                      )}
                    </td>
                    <td>{result.remarks}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEditResult(result)}
                          disabled={!isEligible}
                        >
                          {t('examResults.editMarks')}
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveStudent(student._id)}
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Result Modal */}
      {editingResult && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingResult(null);
          }}
          style={{
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
          }}
        >
          <div 
            className="modal-content card" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              padding: '30px'
            }}
          >
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                {t('examResults.editResultFor')} {editingResult.student.name}
              </h2>
              <button 
                type="button" 
                onClick={() => setEditingResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveResult(); }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('students.studentId')}</label>
                <input
                  type="text"
                  value={editingResult.student.studentId}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('students.studentName')}</label>
                <input
                  type="text"
                  value={editingResult.student.name}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('examResults.marksObtained')} *</label>
                <input
                  type="number"
                  name="marksObtained"
                  value={resultData.marksObtained}
                  onChange={handleResultChange}
                  max={exam.totalMarks}
                  min="0"
                  required
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
                  {t('examResults.maxMarks')}: {exam.totalMarks} {t('examResults.marks')} | {t('examResults.passing')}: {exam.passingMarks} {t('examResults.marks')}
                </small>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('examResults.grade')} *</label>
                <select
                  name="grade"
                  value={resultData.grade}
                  onChange={handleResultChange}
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
                  <option value="">{t('examResults.selectGrade')}</option>
                  <option value="A+">A+ ({t('examResults.excellent')})</option>
                  <option value="A">A ({t('examResults.veryGood')})</option>
                  <option value="B">B ({t('examResults.good')})</option>
                  <option value="C">C ({t('examResults.satisfactory')})</option>
                  <option value="D">D ({t('examResults.pass')})</option>
                  <option value="F">F ({t('examResults.fail')})</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>{t('examResults.remarks')}</label>
                <textarea
                  name="remarks"
                  value={resultData.remarks}
                  onChange={handleResultChange}
                  rows="3"
                  placeholder={t('examResults.remarksPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setEditingResult(null)}
                  style={{ padding: '10px 24px' }}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {t('common.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResults;