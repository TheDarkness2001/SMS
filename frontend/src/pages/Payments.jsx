import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePayments } from '../hooks/usePayments';
import { paymentsAPI } from '../utils/api';
import PaymentModal from '../components/PaymentModal';
import '../styles/Payments.css';

const Payments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const {
    // Data
    students,
    filteredStudents,
    
    // Loading states
    loading,
    error,
    success,
    
    // Filters
    filters,
    setFilters,
    
    // Operations
    refreshData,
    getPaymentForStudentSubject,
    getPaymentStatus,
    getExpectedAmount,
    
    // Setters for alerts
    setError,
    setSuccess
  } = usePayments();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(''); // 'add', 'edit'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [initialPayment, setInitialPayment] = useState(null);

  // Check URL parameters for studentId
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const studentId = queryParams.get('studentId');
    
    if (studentId) {
      // Find the student and filter to show only that student
      const student = students.find(s => s._id === studentId);
      if (student) {
        // Set filters to show only this student
        setFilters(prev => ({
          ...prev,
          search: student.name,
          class: 'all',
          subject: 'all'
        }));
      }
    }
  }, [location.search, students, setFilters]);

  // Open payment modal
  const openPaymentModal = (mode, student, subject = '') => {
    try {
      console.log('🔵 Opening payment modal:', { mode, student, subject });
      
      if (!student) {
        console.error('❌ No student provided');
        setError(t('payments.studentMissing'));
        return;
      }
      
      const expected = getExpectedAmount(student, subject);
      console.log('💰 Expected amount:', expected);
      
      setSelectedStudent(student);
      setSelectedSubject(subject);
      setExpectedAmount(expected);
      
      if (mode === 'edit') {
        const payment = getPaymentForStudentSubject(student._id, subject);
        console.log('📝 Existing payment for edit:', payment);
        setInitialPayment(payment);
      } else {
        console.log('➕ Creating new payment');
        setInitialPayment(null);
      }
      
      setModalMode(mode);
      setShowModal(true);
      console.log('✅ Modal state set to open');
    } catch (err) {
      console.error('❌ Error opening modal:', err);
      setError(t('payments.modalError') + ': ' + err.message);
    }
  };

  // Close payment modal
  const closePaymentModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setSelectedSubject('');
    setExpectedAmount(0);
    setInitialPayment(null);
    setError('');
    setSuccess('');
  };

  // Helper function to calculate term based on month
  const calculateTerm = (month) => {
    if ([1, 2, 3, 4].includes(month)) return '1st-term';
    if ([5, 6, 7, 8].includes(month)) return '2nd-term';
    if ([9, 10, 11, 12].includes(month)) return '3rd-term';
    return '1st-term';
  };

  // Handle payment submission
  const handlePaymentSubmit = async (formData) => {
    try {
      const paymentData = {
        student: selectedStudent._id,
        amount: Number(formData.amount),
        paymentType: 'tuition-fee', // Default payment type
        paymentMethod: formData.method, // Use correct field name
        notes: formData.note,
        dueDate: new Date(filters.year, filters.month - 1, 1),
        academicYear: `${filters.year}-${filters.year + 1}`,
        term: calculateTerm(filters.month), // Calculate based on month
        subject: selectedSubject, // Add subject field
        month: filters.month,
        year: filters.year
      };
      
      // Determine status based on amount vs expected amount
      const expectedAmt = getExpectedAmount(selectedStudent, selectedSubject);
      if (Number(formData.amount) >= expectedAmt) {
        paymentData.status = 'paid';
      } else if (Number(formData.amount) > 0) {
        paymentData.status = 'partial';
      } else {
        paymentData.status = 'pending';
      }
      
      let response;
      
      if (modalMode === 'edit') {
        // For edit, we need to find the existing payment
        const existingPayment = getPaymentForStudentSubject(selectedStudent._id, selectedSubject);
        if (existingPayment) {
          response = await paymentsAPI.update(existingPayment._id, paymentData);
        } else {
          response = await paymentsAPI.create(paymentData);
        }
      } else {
        response = await paymentsAPI.create(paymentData);
      }
      
      if (response.data?.success) {
        setSuccess(t('payments.saveSuccess'));
        
        // Close modal first
        closePaymentModal();
        
        // Then refresh data to show updated payment
        await refreshData();
      } else {
        throw new Error(t('payments.saveError'));
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      // Handle 401 Unauthorized error by redirecting to login
      if (err.response && err.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || err.message || t('payments.saveError'));
      }
    }
  };

  // Handle payment deletion (currently disabled - no delete buttons in UI)
  // eslint-disable-next-line no-unused-vars
  const handleDeletePayment = async (studentId, subject) => {
    if (!window.confirm(t('modals.deleteMessage'))) {
      return;
    }
    
    try {
      const payment = getPaymentForStudentSubject(studentId, subject);
      if (!payment) {
        throw new Error(t('payments.notFound'));
      }
      
      const response = await paymentsAPI.delete(payment._id);
      
      if (response.data?.success) {
        // Refresh data to update state
        refreshData();
        setSuccess(t('payments.deleteSuccess'));
      } else {
        throw new Error(t('payments.deleteError'));
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      // Handle 401 Unauthorized error by redirecting to login
      if (err.response && err.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || err.message || t('payments.deleteError'));
      }
    }
  };

  if (loading) {
    return (
      <div className="payments-page-container">
        <div className="payments-loading-state">
          <div className="students__spinner"></div>
          <p className="payments-loading-text">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !showModal) {
    return (
      <div className="payments-page-container">
        <div className="payments-error-state">
          <div className="alert alert-danger">{error}</div>
          <button className="btn btn-primary" onClick={refreshData}>
            {t('payments.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-page-container">
      <header className="payments-page-header">
        <div className="payments-page-header-content">
          <div className="payments-page-title-section">
            <h1 className="payments-page-title">{t('payments.title')}</h1>
          </div>
          <div className="payments-page-actions">
            <button className="btn btn-primary" onClick={refreshData}>
              {t('payments.refreshData')}
            </button>
          </div>
        </div>
      </header>

      {success && !showModal && <div className="alert alert-success">{success}</div>}
      {error && !showModal && <div className="alert alert-danger">{error}</div>}

      <div className="payments-filter-container">
        <div className="payments-filter-row">
          <div className="payments-filter-field payments-filter-search">
            <label className="payments-filter-label">{t('common.searchStudent')}</label>
            <input
              type="text"
              className="payments-filter-input"
              placeholder={t('common.nameOrId')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="payments-filter-field payments-filter-month">
            <label className="payments-filter-label">{t('common.month')}</label>
            <select
              className="payments-filter-select"
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>
                  {new Date(2020, month - 1, 1).toLocaleString('default', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>

          <div className="payments-filter-field payments-filter-year">
            <label className="payments-filter-label">{t('common.year')}</label>
            <select
              className="payments-filter-select"
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="payments-filter-field payments-filter-reset-container">
            <label className="payments-filter-label" style={{ visibility: 'hidden' }}>Reset</label>
            <button
              className="payments-filter-reset"
              onClick={() => {
                setFilters({
                  search: '',
                  class: 'All',
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear(),
                  subject: 'All',
                  status: 'All'
                });
                refreshData();
              }}
            >
              {t('common.reset')}
            </button>
          </div>
        </div>
      </div>

      <div className="payments-table-card">
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>{t('students.studentId')}</th>
                <th>{t('students.name')}</th>
                <th>{t('payments.courses')}</th>
                <th className="text-center">{t('payments.paidQuestion')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-students">{t('students.noStudents')}</td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const hasUnpaid = (student.subjects || []).some(subject => {
                    const payment = getPaymentForStudentSubject(student._id, subject);
                    const expected = getExpectedAmount(student, subject);
                    const paid = payment ? payment.amount : 0;
                    return paid < expected;
                  });

                  return (
                    <tr key={student._id} className={hasUnpaid ? 'unpaid-row' : 'paid-row'}>
                      <td className="student-id">{student.studentId}</td>
                      <td className="student-name">{student.name}</td>
                      <td>
                        <div className="course-pills-container">
                          {(student.subjects || []).map((subject, index) => {
                            const payment = getPaymentForStudentSubject(student._id, subject);
                            const status = getPaymentStatus(student._id, subject);
                            const expected = getExpectedAmount(student, subject);
                            const paid = payment ? payment.amount : 0;
                            const isUnpaid = paid < expected;
                            
                            return (
                              <button
                                key={index}
                                className={`course-pill ${isUnpaid ? 'unpaid' : 'paid'}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const mode = payment ? 'edit' : 'add';
                                  openPaymentModal(mode, student, subject);
                                }}
                                type="button"
                              >
                                <span className="subject-name">{subject}</span>
                                <span className="separator">—</span>
                                <span className="amount-display">
                                  {language === 'en' ? t('common.currencySymbol') : ''}
                                  {(payment ? paid : 0).toLocaleString(t('common.locale'))}
                                  {language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                                  {' / '}
                                  {language === 'en' ? t('common.currencySymbol') : ''}
                                  {expected.toLocaleString(t('common.locale'))}
                                  {language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                                </span>
                                <span className="status-label">({t(`common.${status}`)})</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="text-center">
                        {hasUnpaid ? t('payments.unpaid') : t('payments.paid')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {console.log('showModal state:', showModal, 'selectedStudent:', selectedStudent)}
      {showModal && (
        <PaymentModal
          isOpen={showModal}
          mode={modalMode}
          student={selectedStudent}
          subject={selectedSubject}
          expectedAmount={expectedAmount}
          initialPayment={initialPayment}
          onClose={closePaymentModal}
          onSubmit={handlePaymentSubmit}
          loading={false}
        />
      )}
    </div>
  );
};

export default Payments;