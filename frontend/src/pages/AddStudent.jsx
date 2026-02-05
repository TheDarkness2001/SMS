import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { studentsAPI, branchesAPI } from '../utils/api';
import '../styles/AddStudent.css';

const AddStudent = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedBranch } = useBranch();
  const [user] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const [branches, setBranches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    subjects: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: '',
    medicalConditions: '',
    status: 'active',
    profileImage: null,
    parentName: '',
    parentPhone: '',
    password: '',
    branchId: '',
    // Payment fields
    paymentSubjects: [{ subject: '', amount: '' }]
  });

  const [availableSubjects] = useState([
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 
    'History', 'Geography', 'Computer Science', 'Art', 'Music',
    'Physical Education', 'Literature', 'Economics', 'Psychology'
  ]);

  // Pre-select branch if selected in Navbar
  useEffect(() => {
    if (selectedBranch && !formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: selectedBranch._id }));
    }
  }, [selectedBranch, formData.branchId]);

  // Load branches for admin/manager/founder
  useEffect(() => {
    const loadBranches = async () => {
      if (['founder', 'admin', 'manager'].includes(user?.role)) {
        try {
          const branchesResponse = await branchesAPI.getAll();
          if (branchesResponse.data.success) {
            setBranches(branchesResponse.data.data);
          }
        } catch (error) {
          console.error('Error loading branches:', error);
        }
      }
    };
    loadBranches();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Store file in form data
      setFormData(prev => ({
        ...prev,
        profileImage: file
      }));
    }
  };

  const handlePaymentSubjectChange = (index, field, value) => {
    const updatedSubjects = [...formData.paymentSubjects];
    updatedSubjects[index][field] = value;
    setFormData(prev => ({
      ...prev,
      paymentSubjects: updatedSubjects
    }));
  };

  const addPaymentSubject = () => {
    setFormData(prev => ({
      ...prev,
      paymentSubjects: [...prev.paymentSubjects, { subject: '', amount: '' }]
    }));
  };

  const removePaymentSubject = (index) => {
    if (formData.paymentSubjects.length <= 1) return;
    const updatedSubjects = [...formData.paymentSubjects];
    updatedSubjects.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      paymentSubjects: updatedSubjects
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate password
      if (!formData.password || formData.password.trim() === '') {
        setError(t('forms.passwordRequired'));
        setSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        setError(t('forms.passwordMinLength'));
        setSubmitting(false);
        return;
      }
      
      // Convert subjects string back to array
      const subjectsArray = formData.subjects.split(',').map(s => s.trim()).filter(Boolean);
      
      // Filter out empty payment subjects (check if subject AND amount are provided)
      const paymentSubjects = formData.paymentSubjects.filter(ps => {
        const hasSubject = ps.subject && ps.subject.trim() !== '';
        const hasAmount = ps.amount && ps.amount !== '' && Number(ps.amount) > 0;
        return hasSubject && hasAmount;
      });
      
      // Create FormData for file upload
      const submitFormData = new FormData();
      
      // Add all text fields
      submitFormData.append('studentId', formData.studentId);
      submitFormData.append('name', formData.name);
      submitFormData.append('email', formData.email);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('subjects', JSON.stringify(subjectsArray));
      submitFormData.append('dateOfBirth', formData.dateOfBirth);
      submitFormData.append('gender', formData.gender);
      submitFormData.append('bloodGroup', formData.bloodGroup);
      submitFormData.append('address', formData.address);
      submitFormData.append('medicalConditions', formData.medicalConditions);
      submitFormData.append('status', formData.status);
      submitFormData.append('parentName', formData.parentName);
      submitFormData.append('parentPhone', formData.parentPhone);
      submitFormData.append('password', formData.password);
      submitFormData.append('paymentSubjects', JSON.stringify(paymentSubjects));
      
      // Add branchId if user is admin/manager/founder
      if (['founder', 'admin', 'manager'].includes(user?.role)) {
        if (!formData.branchId) {
          setError('Please select a branch');
          setSubmitting(false);
          return;
        }
        submitFormData.append('branchId', formData.branchId);
      }
      
      // Add image file if selected
      if (formData.profileImage) {
        submitFormData.append('profileImage', formData.profileImage);
      }
      
      await studentsAPI.create(submitFormData);
      setSuccess(t('forms.addStudent') + ' ' + t('common.success') + '!');
      
      // Redirect to students list after a short delay
      setTimeout(() => {
        navigate('/students');
      }, 1500);
    } catch (err) {
      setError(t('common.error') + ': ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-student-container">
      <div className="admin-layout__page-header">
        <h1 className="admin-layout__page-title">{t('forms.addStudent')}</h1>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← {t('common.back')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="student-form">
          <div className="form-section">
            <h2>{t('students.name')} {t('common.actions')}</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="studentId">{t('students.studentId')} *</label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="name">{t('forms.firstName')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">{t('forms.email')}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">{t('forms.phone')}</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              {/* Branch Selector for Admin/Manager/Founder */}
              {['founder', 'admin', 'manager'].includes(user?.role) && (
                <div className="form-group">
                  <label htmlFor="branchId">Branch *</label>
                  <select
                    id="branchId"
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="subjects">{t('students.subjects')} ({t('common.filter')})</label>
                <input
                  type="text"
                  id="subjects"
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleChange}
                  placeholder={t('students.subjects')}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-hint">
              {t('students.subjects')}: {availableSubjects.join(', ')}
            </div>
          </div>
          
          <div className="form-section">
            <h2>{t('forms.gender')}</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateOfBirth">{t('forms.dateOfBirth')}</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="gender">{t('forms.gender')}</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">{t('forms.gender')}</option>
                  <option value="male">{t('forms.male')}</option>
                  <option value="female">{t('forms.female')}</option>
                  <option value="other">{t('forms.other')}</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bloodGroup">{t('forms.bloodGroup')}</label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">{t('common.filter')}</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="status">{t('common.status')}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                  <option value="graduated">{t('common.graduated')}</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="address">{t('forms.address')}</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input"
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="medicalConditions">{t('forms.medicalConditions')}</label>
              <textarea
                id="medicalConditions"
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleChange}
                className="form-input"
                rows="2"
                placeholder={t('common.noData')}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="profileImage">{t('common.photo')}</label>
              <div className="image-upload-wrapper">
                <input
                  type="file"
                  id="profileImage"
                  name="profileImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="form-input"
                />
                {imagePreview && (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, profileImage: null }));
                        document.getElementById('profileImage').value = '';
                      }}
                      style={{ marginTop: '10px' }}
                    >
                      {t('common.delete')} {t('common.photo')}
                    </button>
                  </div>
                )}
              </div>
              <div className="form-hint">
                {t('common.photo')}: JPG, PNG, GIF - Max 5MB
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h2>{t('forms.studentCredentials')}</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="parentName">{t('forms.guardianParentName')} ({t('forms.optional')})</label>
                <input
                  type="text"
                  id="parentName"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="parentPhone">{t('forms.guardianParentPhone')} ({t('forms.optional')})</label>
                <input
                  type="tel"
                  id="parentPhone"
                  name="parentPhone"
                  value={formData.parentPhone}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">{t('forms.password')} *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                placeholder={t('forms.passwordMinLength')}
                className="form-input"
              />
              <div className="form-hint">
                {t('forms.passwordHint')}
              </div>
            </div>
          </div>
          
          {/* Payment Information Section */}
          <div className="form-section">
            <h2>{t('payments.title')}</h2>
            <p className="form-hint">{t('students.subjects')} {t('payments.amount')}</p>
            
            {formData.paymentSubjects.map((paymentSubject, index) => (
              <div className="form-row" key={index}>
                <div className="form-group">
                  <label htmlFor={`subject-${index}`}>{t('exams.subject')}</label>
                  <input
                    type="text"
                    id={`subject-${index}`}
                    value={paymentSubject.subject}
                    onChange={(e) => handlePaymentSubjectChange(index, 'subject', e.target.value)}
                    className="form-input"
                    placeholder={`${t('common.example')}: ${availableSubjects[0]}`}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`amount-${index}`}>{t('payments.amount')} ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id={`amount-${index}`}
                    value={paymentSubject.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handlePaymentSubjectChange(index, 'amount', value);
                      }
                    }}
                    className="form-input"
                    placeholder={`${t('common.example')}: 150`}
                  />
                </div>
                
                {formData.paymentSubjects.length > 1 && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removePaymentSubject(index)}
                      style={{ height: '48px', marginTop: '0', padding: '12px 16px' }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addPaymentSubject}
              style={{ marginTop: '10px' }}
            >
              + {t('common.add')} {t('exams.subject')}
            </button>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
            >
              {submitting ? t('forms.addStudent') + '...' : t('forms.addStudent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudent;