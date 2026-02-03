import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getSubjects } from '../api/subjects';
import { getTeacherEarningsSummary } from '../api/teacherEarnings';

const TeacherForm = ({ teacher, onSubmit, onCancel }) => {
  const { t, language } = useLanguage();
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: [],
    department: '',
    status: 'active',
    perClassEarning: 0,
    perClassEarnings: {},
    qualifications: '',
    branchId: ''
  });
  
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    try {
      // Load subjects
      const subjectsResponse = await getSubjects();
      setSubjects(subjectsResponse.data.data);

      // Load branches for founder, admin, and manager
      console.log('Current user role:', user.role);
      if (['founder', 'admin', 'manager'].includes(user.role)) {
        try {
          const branchesResponse = await fetch('/api/branches', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const branchesData = await branchesResponse.json();
          console.log('Branches loaded:', branchesData);
          if (branchesData.success) {
            setBranches(branchesData.data);
            console.log('Branches set:', branchesData.data);
          }
        } catch (error) {
          console.error('Error loading branches:', error);
        }
      } else {
        console.log('User role does not have access to branch selector');
      }

      if (teacher) {
        // Load existing teacher data
        setFormData({
          name: teacher.name || '',
          email: teacher.email || '',
          phone: teacher.phone || '',
          subject: Array.isArray(teacher.subject) ? teacher.subject : [teacher.subject || ''],
          department: teacher.department || '',
          status: teacher.status || 'active',
          perClassEarning: teacher.perClassEarning || 0,
          perClassEarnings: teacher.perClassEarnings || {},
          qualifications: teacher.qualifications || '',
          branchId: teacher.branchId || ''
        });

        // Load earnings summary if teacher exists
        if (teacher._id) {
          try {
            const summaryResponse = await getTeacherEarningsSummary(teacher._id, 'monthly');
            setEarningsSummary(summaryResponse.data.data);
          } catch (error) {
            console.error('Error loading earnings summary:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectName, checked) => {
    setFormData(prev => ({
      ...prev,
      subject: checked 
        ? [...prev.subject, subjectName]
        : prev.subject.filter(s => s !== subjectName)
    }));
  };

  const handleEarningChange = (subjectId, earning) => {
    setFormData(prev => ({
      ...prev,
      perClassEarnings: {
        ...prev.perClassEarnings,
        [subjectId]: parseFloat(earning) || 0
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.email) {
      alert(t('teacherForm.nameEmailRequired'));
      return;
    }

    if (['founder', 'admin', 'manager'].includes(user.role) && !formData.branchId) {
      alert('Please select a branch');
      return;
    }

    // Validate per-class earnings
    const invalidEarnings = Object.values(formData.perClassEarnings).some(earning => earning < 0);
    if (invalidEarnings) {
      alert(t('teacherForm.earningsNegativeError'));
      return;
    }

    if (formData.perClassEarning < 0) {
      alert(t('teacherForm.defaultEarningNegativeError'));
      return;
    }

    onSubmit({
      ...formData,
      subject: Array.isArray(formData.subject) ? formData.subject : [formData.subject]
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="teacher-form__loading">{t('common.loading')}</div>;
  }

  return (
    <div className="teacher-form__container">
      <h2 className="teacher-form__title">
        {teacher ? t('teacherForm.editTeacher') : t('teacherForm.addNewTeacher')}
      </h2>

      {earningsSummary && (
        <div className="teacher-form__summary">
          <h3 className="teacher-form__summary-title">{t('teacherForm.earningsSummary')}</h3>
          <div className="teacher-form__summary-grid">
            <div className="teacher-form__summary-item">
              <span className="teacher-form__summary-label">{t('teacherForm.totalEarnings')}:</span>
              <span className="teacher-form__summary-value">{language === 'en' ? '$' : ''}{earningsSummary.totalEarnings?.toFixed(2) || '0.00'}{language !== 'en' ? ' som' : ''}</span>
            </div>
            <div className="teacher-form__summary-item">
              <span className="teacher-form__summary-label">{t('teacherForm.pending')}:</span>
              <span className="teacher-form__summary-value">{language === 'en' ? '$' : ''}{earningsSummary.pendingEarnings?.toFixed(2) || '0.00'}{language !== 'en' ? ' som' : ''}</span>
            </div>
            <div className="teacher-form__summary-item">
              <span className="teacher-form__summary-label">{t('teacherForm.paid')}:</span>
              <span className="teacher-form__summary-value">{language === 'en' ? '$' : ''}{earningsSummary.paidEarnings?.toFixed(2) || '0.00'}{language !== 'en' ? ' som' : ''}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="teacher-form__form">
        <div className="teacher-form__section">
          <h3 className="teacher-form__section-title">{t('teacherForm.teacherInformation')}</h3>
          
          <div className="teacher-form__grid">
            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('students.name')} *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="teacher-form__input"
                required
              />
            </div>

            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('students.email')} *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="teacher-form__input"
                required
              />
            </div>

            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('students.phone')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="teacher-form__input"
              />
            </div>

            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('teachers.department')}</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="teacher-form__input"
              />
            </div>

            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('common.status')}</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="teacher-form__select"
              >
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
                <option value="on-leave">{t('teacherForm.onLeave')}</option>
              </select>
            </div>

            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('teacherForm.qualifications')}</label>
              <input
                type="text"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleInputChange}
                className="teacher-form__input"
              />
            </div>

            {['founder', 'admin', 'manager'].includes(user.role) && (
              <div className="teacher-form__field">
                <label className="teacher-form__label">Branch *</label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleInputChange}
                  className="teacher-form__select"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="teacher-form__section">
          <h3 className="teacher-form__section-title">{t('teacherForm.subjects')}</h3>
          <p className="teacher-form__section-description">
            {t('teacherForm.subjectsDescription')}
          </p>
          
          <div className="teacher-form__subjects-grid">
            {subjects.map(subject => (
              <div key={subject._id} className="teacher-form__subject-item">
                <label className="teacher-form__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.subject.includes(subject.name)}
                    onChange={(e) => handleSubjectChange(subject.name, e.target.checked)}
                    className="teacher-form__checkbox"
                  />
                  <span className="teacher-form__subject-name">{subject.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="teacher-form__section">
          <h3 className="teacher-form__section-title">{t('teacherForm.earningsConfiguration')}</h3>
          <p className="teacher-form__section-description">
            {t('teacherForm.earningsDescription')}
          </p>
          
          <div className="teacher-form__earnings-section">
            <div className="teacher-form__field">
              <label className="teacher-form__label">{t('teacherForm.defaultPerClassEarning')}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="perClassEarning"
                value={formData.perClassEarning}
                onChange={handleInputChange}
                className="teacher-form__input"
                placeholder={t('teacherForm.defaultEarningPlaceholder')}
              />
            </div>

            <div className="teacher-form__per-subject-earnings">
              <h4 className="teacher-form__subsection-title">{t('teacherForm.perSubjectEarnings')}</h4>
              <p className="teacher-form__subsection-description">
                {t('teacherForm.perSubjectEarningsDescription')}
              </p>
              
              <div className="teacher-form__pricing-grid">
                {subjects.map(subject => (
                  <div key={subject._id} className="teacher-form__pricing-item">
                    <label className="teacher-form__label">
                      {subject.name}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.perClassEarnings[subject._id] || ''}
                      onChange={(e) => handleEarningChange(subject._id, e.target.value)}
                      className="teacher-form__input teacher-form__pricing-input"
                      placeholder={`${t('studentForm.useDefault')} (${formData.perClassEarning || 0})`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="teacher-form__actions">
          <button type="button" onClick={onCancel} className="teacher-form__cancel-btn">
            {t('common.cancel')}
          </button>
          <button type="submit" className="teacher-form__submit-btn">
            {teacher ? t('teacherForm.updateTeacher') : t('teacherForm.createTeacher')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherForm;