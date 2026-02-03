import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './PaymentModal.css';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  mode, 
  student, 
  subject, 
  expectedAmount,
  initialPayment,
  onSubmit 
}) => {
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    amount: expectedAmount || '',
    method: 'cash',
    note: ''
  });
  const [error, setError] = useState('');

  // Update form when initialPayment changes
  useEffect(() => {
    if (mode === 'edit' && initialPayment) {
      setForm({
        amount: initialPayment.amount || expectedAmount || '',
        method: initialPayment.paymentMethod || initialPayment.method || 'cash',
        note: initialPayment.notes || initialPayment.note || ''
      });
    } else {
      setForm({
        amount: expectedAmount || '',
        method: 'cash',
        note: ''
      });
    }
  }, [mode, initialPayment, expectedAmount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!form.amount || Number(form.amount) <= 0) {
      setError(t('payments.validAmountRequired'));
      return;
    }
    
    // Check if amount exceeds expected amount
    if (Number(form.amount) > expectedAmount) {
      setError(t('payments.amountExceedsMax').replace('%{amount}', expectedAmount));
      return;
    }
    
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'edit' ? t('payments.editPayment') : t('payments.addPayment')}</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        {student && (
          <div className="info-card">
            <div className="info-row">
              <div className="info-item">
                <label>{t('students.name')}:</label>
                <span>{student.name} ({student.studentId})</span>
              </div>
              <div className="info-item">
                <label>{t('payments.subject')}</label>
                <span>{subject}</span>
              </div>
              <div className="info-item">
                <label>{t('payments.expectedAmount')}</label>
                <span className="expected-amount">
                  {language === 'en' ? t('common.currencySymbol') : ''}{expectedAmount.toLocaleString(t('common.locale'))}{language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment information */}
        <div className="payment-info">
          <strong>{t('payments.paymentInformation')}</strong>
          <p>{t('payments.fullOrPartialPayment', { 
            amount: expectedAmount.toLocaleString(t('common.locale')), 
            currency: t('common.currencySymbol') 
          })}</p>
          {form.amount && Number(form.amount) > 0 && Number(form.amount) < expectedAmount && (
            <p>
              <strong>{t('payments.remainingBalance')}</strong>{' '}
              {language === 'en' ? t('common.currencySymbol') : ''}
              {(expectedAmount - Number(form.amount)).toLocaleString(t('common.locale'))}
              {language !== 'en' ? ` ${t('common.currencySymbol')}` : ''}
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('payments.amount')} ({t('common.currencySymbol')}) *</label>
            <input
              type="text"
              inputMode="decimal"
              name="amount"
              value={form.amount}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  handleInputChange(e);
                }
              }}
              required
              placeholder={t('payments.enterAmount', { 
                max: expectedAmount.toLocaleString(t('common.locale')), 
                currency: t('common.currencySymbol') 
              })}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {t('payments.enterAmountNow')}
            </div>
          </div>
          
          <div className="form-group">
            <label>{t('payments.method')} *</label>
            <select
              name="method"
              value={form.method}
              onChange={handleInputChange}
              required
            >
              <option value="cash">{t('payments.cash')}</option>
              <option value="card">{t('payments.card')}</option>
              <option value="bank">{t('payments.bank')}</option>
              <option value="online">{t('payments.online')}</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>{t('payments.note')}</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleInputChange}
              rows="3"
              placeholder={t('payments.additionalNotes')}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'edit' ? t('payments.updatePayment') : t('payments.addPayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;