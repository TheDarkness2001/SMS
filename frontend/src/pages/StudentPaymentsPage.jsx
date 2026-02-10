import React, { useState, useEffect, useCallback } from 'react';
import { paymentsAPI } from '../utils/api';
import { AiOutlineDollar, AiOutlineCheckCircle, AiOutlineClockCircle } from 'react-icons/ai';
import { useLanguage } from '../context/LanguageContext';
import { formatUZS } from '../utils/formatters';
import '../styles/StudentPages.css';

const StudentPaymentsPage = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentMonthPayments, setCurrentMonthPayments] = useState([]);
  const [stats, setStats] = useState({ paid: 0, pending: 0 });
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchPayments = useCallback(async () => {
    try {
      console.log('[StudentPaymentsPage] Fetching payments for student:', user.id);
      
      const res = await paymentsAPI.getByStudent(user.id);
      const paymentData = res.data.data || [];
      
      console.log('[StudentPaymentsPage] Total payments fetched:', paymentData.length);
      console.log('[StudentPaymentsPage] Payment data:', paymentData);

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter payments for current month only
      const currentMonthData = paymentData.filter(p => {
        const paymentDate = new Date(p.dueDate || p.createdAt);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });
      
      console.log('[StudentPaymentsPage] Current month payments:', currentMonthData.length);

      setCurrentMonthPayments(currentMonthData);

      // Calculate stats for current month
      const paid = currentMonthData.filter(p => p.status === 'paid').length;
      const pending = currentMonthData.filter(p => p.status === 'pending' || p.status === 'overdue').length;

      setStats({ paid, pending });
      
      console.log('[StudentPaymentsPage] Stats:', { paid, pending });
    } catch (error) {
      console.error('[StudentPaymentsPage] Error fetching payments:', error);
      console.error('[StudentPaymentsPage] Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  // Get current month name
  const currentMonthName = new Date().toLocaleString(t('common.locale'), { month: 'long', year: 'numeric' });

  return (
    <div className="student-page student-payments-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('payments.monthlyPaymentStatus')}</h1>
        <p className="student-page-subtitle">{currentMonthName} - {t('payments.currentMonthOnly')}</p>
      </div>

      {/* Payment Stats for Current Month */}
      <div className="payment-stats">
        <div className="stat-box paid-box">
          <AiOutlineCheckCircle size={24} />
          <div className="stat-info">
            <div className="stat-number">{stats.paid}</div>
            <div className="stat-label">{t('payments.paidThisMonth')}</div>
          </div>
        </div>
        <div className="stat-box pending-box">
          <AiOutlineClockCircle size={24} />
          <div className="stat-info">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">{t('payments.pendingThisMonth')}</div>
          </div>
        </div>
      </div>

      {/* Payment List - Current Month Only */}
      <div className="payments-list">
        <h2 className="section-title">{t('payments.paymentRecords')} ({currentMonthPayments.length})</h2>
        {currentMonthPayments.length === 0 ? (
          <div className="no-data">
            <AiOutlineDollar size={48} />
            <p>{t('payments.noPaymentsFor')} {currentMonthName}</p>
            <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '8px' }}>{t('payments.notPaidYet')}</p>
          </div>
        ) : (
          <div className="payment-cards">
            {currentMonthPayments.map((payment) => (
              <div key={payment._id} className="payment-card">
                <div className="payment-header">
                  <div className="payment-type">{payment.type || t('payments.tuitionFee')}</div>
                  <div className={`payment-status status-${payment.status}`}>
                    {t(`common.${payment.status}`).toUpperCase()}
                  </div>
                </div>
                <div className="payment-body">
                  <div className="payment-amount">
                    {formatUZS(payment.amount * 100, language)}
                  </div>
                  <div className="payment-details">
                    <div className="payment-detail-item">
                      <span>{t('payments.dueDate')}</span>
                      <strong>{new Date(payment.dueDate).toLocaleDateString(t('common.locale'))}</strong>
                    </div>
                    {payment.paidDate && (
                      <div className="payment-detail-item">
                        <span>{t('payments.paidDate')}</span>
                        <strong>{new Date(payment.paidDate).toLocaleDateString(t('common.locale'))}</strong>
                      </div>
                    )}
                    {payment.subject && (
                      <div className="payment-detail-item">
                        <span>{t('payments.subject')}</span>
                        <strong>{payment.subject}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentsPage;
