import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getSubjects } from '../api/subjects';
import { getWalletSummary } from '../api/wallet';
import { branchesAPI } from '../utils/api';

const StudentForm = ({ student, onSubmit, onCancel }) => {
  const { t, language } = useLanguage();
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    parentName: '',
    parentPhone: '',
    perClassPrices: {},
    walletBalance: 0,
    branchId: ''
  });
  
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
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
          const branchesResponse = await branchesAPI.getAll();
          console.log('Branches loaded:', branchesResponse.data);
          if (branchesResponse.data.success) {
            setBranches(branchesResponse.data.data);
            console.log('Branches set:', branchesResponse.data.data);
          }
        } catch (error) {
          console.error('Error loading branches:', error);
        }
      } else {
        console.log('User role does not have access to branch selector');
      }

      if (student) {
        // Load existing student data
        setFormData({
          name: student.name || '',
          email: student.email || '',
          phone: student.phone || '',
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
          gender: student.gender || '',
          address: student.address || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          perClassPrices: student.perClassPrices || {},
          walletBalance: 0,
          branchId: student.branchId || ''
        });

        // Load wallet balance if student exists
        if (student._id) {
          try {
            const walletResponse = await getWalletSummary(student._id, 'student');
            setFormData(prev => ({
              ...prev,
              walletBalance: walletResponse.data.data.balance || 0
            }));
          } catch (error) {
            console.error('Error loading wallet:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (subjectId, price) => {
    setFormData(prev => ({
      ...prev,
      perClassPrices: {
        ...prev.perClassPrices,
        [subjectId]: parseFloat(price) || 0
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.email) {
      alert(t('studentForm.nameEmailRequired'));
      return;
    }

    if (['founder', 'admin', 'manager'].includes(user.role) && !formData.branchId) {
      alert('Please select a branch');
      return;
    }

    // Validate per-class prices
    const invalidPrices = Object.values(formData.perClassPrices).some(price => price < 0);
    if (invalidPrices) {
      alert(t('studentForm.pricesNegativeError'));
      return;
    }

    onSubmit({
      ...formData,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
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
    return <div className="student-form__loading">{t('common.loading')}</div>;
  }

  return (
    <div className="student-form__container">
      <h2 className="student-form__title">
        {student ? t('studentForm.editStudent') : t('studentForm.addNewStudent')}
      </h2>

      <form onSubmit={handleSubmit} className="student-form__form">
        <div className="student-form__section">
          <h3 className="student-form__section-title">{t('studentForm.studentInformation')}</h3>
          
          <div className="student-form__grid">
            <div className="student-form__field">
              <label className="student-form__label">{t('students.name')} *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="student-form__input"
                required
              />
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('students.email')} *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="student-form__input"
                required
              />
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('students.phone')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="student-form__input"
              />
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('studentForm.dateOfBirth')}</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="student-form__input"
              />
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('studentForm.gender')}</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="student-form__select"
              >
                <option value="">{t('studentForm.selectGender')}</option>
                <option value="male">{t('studentForm.male')}</option>
                <option value="female">{t('studentForm.female')}</option>
                <option value="other">{t('studentForm.other')}</option>
              </select>
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('students.address')}</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="student-form__input"
              />
            </div>

            {['founder', 'admin', 'manager'].includes(user.role) && (
              <div className="student-form__field">
                <label className="student-form__label">Branch *</label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleInputChange}
                  className="student-form__select"
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

        <div className="student-form__section">
          <h3 className="student-form__section-title">{t('studentForm.parentInformation')}</h3>
          
          <div className="student-form__grid">
            <div className="student-form__field">
              <label className="student-form__label">{t('studentForm.parentName')}</label>
              <input
                type="text"
                name="parentName"
                value={formData.parentName}
                onChange={handleInputChange}
                className="student-form__input"
              />
            </div>

            <div className="student-form__field">
              <label className="student-form__label">{t('studentForm.parentPhone')}</label>
              <input
                type="tel"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleInputChange}
                className="student-form__input"
              />
            </div>
          </div>
        </div>

        <div className="student-form__section">
          <h3 className="student-form__section-title">{t('studentForm.walletInformation')}</h3>
          
          <div className="student-form__wallet-info">
            <p className="student-form__wallet-balance">
              <strong>{t('studentForm.currentWalletBalance')}:</strong> {language === 'en' ? '$' : ''}{formData.walletBalance.toFixed(2)}{language !== 'en' ? ' som' : ''}
            </p>
          </div>
        </div>

        <div className="student-form__section">
          <h3 className="student-form__section-title">{t('studentForm.perClassPricing')}</h3>
          <p className="student-form__section-description">
            {t('studentForm.perClassPricingDescription')}
          </p>
          
          <div className="student-form__pricing-grid">
            {subjects.map(subject => (
              <div key={subject._id} className="student-form__pricing-item">
                <label className="student-form__label">
                  {subject.name} ({language === 'en' ? '$' : ''}{subject.pricePerClass ? subject.pricePerClass.toFixed(2) : '0.00'}{language !== 'en' ? ' som' : ''} {t('common.default') || 'default'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.perClassPrices[subject._id] || ''}
                  onChange={(e) => handlePriceChange(subject._id, e.target.value)}
                  className="student-form__input student-form__pricing-input"
                  placeholder={`${t('studentForm.useDefault')} (${subject.pricePerClass || 0})`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="student-form__actions">
          <button type="button" onClick={onCancel} className="student-form__cancel-btn">
            {t('common.cancel')}
          </button>
          <button type="submit" className="student-form__submit-btn">
            {student ? t('studentForm.updateStudent') : t('studentForm.createStudent')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;