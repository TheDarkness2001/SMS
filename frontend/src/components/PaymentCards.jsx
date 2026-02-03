import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './PaymentCards.css';
const PaymentCards = ({ 
  students, 
  getPaymentForStudentSubject, 
  getPaymentStatus, 
  getPaymentAmount, 
  getExpectedAmount,
  onPayNow,
  onEditPayment,
  onDeletePayment
}) => {
  const { t, language } = useLanguage();
  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('students.studentId')}</th>
            <th>{t('students.name')}</th>
            <th>{t('students.class')}</th>
            <th>{t('paymentCards.subjectsPayments')}</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student._id}>
              <td>{student.studentId}</td>
              <td>{student.name}</td>
              <td>{student.class} {student.section}</td>
              <td>
                <div className="subjects-payments-grid">
                  {(student.subjects || []).map(subject => {
                    const payment = getPaymentForStudentSubject(student._id, subject);
                    const expectedAmt = getExpectedAmount(student, subject);
                    const status = getPaymentStatus(student._id, subject);
                    const paidAmount = payment ? payment.amount : 0;
                    const remainingAmount = expectedAmt - paidAmount;
                    
                    return (
                      <div key={`${student._id}-${subject}`} className="subject-payment-card">
                        <div className="subject-info">
                          <span className="subject-name">{subject}</span>
                          <span className="expected-amount">
                            {language === 'en' ? t('common.currencySymbol') : ''}
                            {expectedAmt.toLocaleString(t('common.locale'))}
                            {language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                          </span>
                          {status === 'Partial' && payment && (
                            <div className="partial-payment-info">
                              {t('paymentCards.paid')}: {language === 'en' ? t('common.currencySymbol') : ''}{paidAmount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                              <br />
                              {t('paymentCards.due')}: {language === 'en' ? t('common.currencySymbol') : ''}{remainingAmount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                            </div>
                          )}
                        </div>
                        <div className="payment-status">
                          <span className={`status-badge ${
                            status === 'Paid' ? 'paid' :
                            status === 'Unpaid' ? 'unpaid' : 'partial'
                          }`}>
                            {status}
                          </span>
                          <span className="paid-amount">{getPaymentAmount(student._id, subject)}</span>
                        </div>
                        <div className="payment-actions">
                          {status === 'Unpaid' ? (
                            <button 
                              className="btn-pay"
                              onClick={() => onPayNow(student, subject)}
                            >
                              {t('paymentCards.payNow')}
                            </button>
                          ) : (
                            <div className="btn-group-actions">
                              <button 
                                className="btn-edit"
                                onClick={() => onEditPayment(student, subject)}
                              >
                                {t('common.edit')}
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => onDeletePayment(student._id, subject)}
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentCards;