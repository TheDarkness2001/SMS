import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { paymentsAPI } from '../utils/api';
import { AiOutlineDollar, AiOutlineCheckCircle, AiOutlineClockCircle } from 'react-icons/ai';
import { useLanguage } from '../context/LanguageContext';
import { formatUZS } from '../utils/formatters';
import '../styles/StudentPages.css';

const StudentPaymentsPage = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchPayments = useCallback(async () => {
    try {
      console.log('[StudentPaymentsPage] Fetching payments for student:', user.id);
      
      const res = await paymentsAPI.getByStudent(user.id);
      const paymentData = res.data.data || [];
      
      console.log('[StudentPaymentsPage] Total payments fetched:', paymentData.length);
      
      setAllPayments(paymentData);
      setFilteredPayments(paymentData);
    } catch (error) {
      console.error('[StudentPaymentsPage] Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  // Filter payments when month/year changes
  useEffect(() => {
    let filtered = allPayments;

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(p => {
        const date = new Date(p.dueDate || p.createdAt);
        return (date.getMonth() + 1) === parseInt(selectedMonth);
      });
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(p => {
        const date = new Date(p.dueDate || p.createdAt);
        return date.getFullYear() === parseInt(selectedYear);
      });
    }

    setFilteredPayments(filtered);
  }, [selectedMonth, selectedYear, allPayments]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Calculate stats
  const stats = useMemo(() => {
    const paid = filteredPayments.filter(p => p.status === 'paid');
    const pending = filteredPayments.filter(p => p.status === 'pending' || p.status === 'overdue');
    
    const totalPaid = paid.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      totalPaid,
      totalPending,
      totalAmount: totalPaid + totalPending
    };
  }, [filteredPayments]);

  // Get unique years from payments
  const availableYears = useMemo(() => {
    const years = [...new Set(allPayments.map(p => new Date(p.dueDate || p.createdAt).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [allPayments]);

  if (loading) return <div className="student-page"><div className="loading-spinner">{t('common.loading')}</div></div>;

  return (
    <div className="student-page student-payments-page">
      <div className="student-page-header">
        <h1 className="student-page-title">{t('payments.myPayments')}</h1>
        <p className="student-page-subtitle">{t('payments.viewAllPayments')}</p>
      </div>

      {/* Summary Cards */}
      <div className="payment-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '20px', borderRadius: '12px' }}>
          <AiOutlineCheckCircle size={32} />
          <div className="stat-info" style={{ marginTop: '10px' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700' }}>{formatUZS(stats.totalPaid * 100, language)}</div>
            <div className="stat-label" style={{ fontSize: '14px', opacity: 0.9 }}>{t('payments.totalPaid')}</div>
          </div>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '20px', borderRadius: '12px' }}>
          <AiOutlineClockCircle size={32} />
          <div className="stat-info" style={{ marginTop: '10px' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700' }}>{formatUZS(stats.totalPending * 100, language)}</div>
            <div className="stat-label" style={{ fontSize: '14px', opacity: 0.9 }}>{t('payments.totalPending')}</div>
          </div>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '20px', borderRadius: '12px' }}>
          <AiOutlineDollar size={32} />
          <div className="stat-info" style={{ marginTop: '10px' }}>
            <div className="stat-number" style={{ fontSize: '24px', fontWeight: '700' }}>{stats.paidCount + stats.pendingCount}</div>
            <div className="stat-label" style={{ fontSize: '14px', opacity: 0.9 }}>{t('payments.totalPayments')}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="payment-filters" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('payments.filterByMonth')}</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('payments.allMonths')}</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2024, i).toLocaleString(t('common.locale'), { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>{t('payments.filterByYear')}</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
            >
              <option value="all">{t('payments.allYears')}</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}
            style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            {t('payments.reset')}
          </button>
        </div>
      </div>

      {/* Payment List */}
      <div className="payments-list">
        <h2 className="section-title" style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
          {t('payments.paymentRecords')} ({filteredPayments.length})
        </h2>
        {filteredPayments.length === 0 ? (
          <div className="no-data" style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '12px' }}>
            <AiOutlineDollar size={48} color="#6c757d" />
            <p style={{ marginTop: '15px', color: '#6c757d' }}>{t('payments.noPaymentsFound')}</p>
          </div>
        ) : (
          <div className="payment-table" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{t('payments.type')}</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{t('payments.amount')}</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{t('payments.dueDate')}</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{t('payments.status')}</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>{t('payments.paidDate')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '15px', fontSize: '14px' }}>{payment.type || t('payments.tuitionFee')}</td>
                    <td style={{ padding: '15px', fontSize: '14px', fontWeight: '600' }}>{formatUZS(payment.amount * 100, language)}</td>
                    <td style={{ padding: '15px', fontSize: '14px' }}>{new Date(payment.dueDate).toLocaleDateString(t('common.locale'))}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: payment.status === 'paid' ? '#d1fae5' : (payment.status === 'pending' ? '#fef3c7' : '#fee2e2'),
                        color: payment.status === 'paid' ? '#065f46' : (payment.status === 'pending' ? '#92400e' : '#991b1b')
                      }}>
                        {t(`common.${payment.status}`)}
                      </span>
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px' }}>
                      {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString(t('common.locale')) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentsPage;
