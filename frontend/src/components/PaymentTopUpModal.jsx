import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { formatUZS } from '../utils/formatters';
import '../styles/Modal.css';

export const PaymentTopUpModal = ({ isOpen, onClose, onTopUp }) => {
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reason, setReason] = useState(t('paymentTopUp.title'));
  const [error, setError] = useState('');

  // Top-up limits in so'm
  const MIN_TOPUP = 10000;      // 10,000 so'm
  const MAX_TOPUP = 2000000;    // 2,000,000 so'm

  const validateAmount = (value) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      return t('paymentTopUp.validAmountRequired');
    }
    
    if (numValue < MIN_TOPUP) {
      return t('paymentTopUp.minTopUpAmount').replace('%{amount}', formatUZS(MIN_TOPUP * 100, language));
    }
        
    if (numValue > MAX_TOPUP) {
      return t('paymentTopUp.maxTopUpAmount').replace('%{amount}', formatUZS(MAX_TOPUP * 100, language));
    }
    
    return '';
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    
    if (value) {
      const validationError = validateAmount(value);
      setError(validationError);
    } else {
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    onTopUp(parseFloat(amount), paymentMethod, reason);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setPaymentMethod('cash');
    setReason(t('paymentTopUp.title'));
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Quick amount buttons
  const quickAmounts = [50000, 100000, 250000, 500000, 1000000];

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="payment-top-up__modal">
        <h2 className="payment-top-up__title">{t('paymentTopUp.title')}</h2>
        <p className="payment-top-up__subtitle">
          {t('paymentTopUp.enterAmount')}
          {t('paymentTopUp.minMaxAmount', { min: formatUZS(MIN_TOPUP * 100, language), max: formatUZS(MAX_TOPUP * 100, language) })}
        </p>
        
        <form onSubmit={handleSubmit} className="payment-top-up__form">
          <div className="payment-top-up__form-group">
            <label className="payment-top-up__label">{t('paymentTopUp.amountLabel')}</label>
            <input
              type="number"
              step="1000"
              min={MIN_TOPUP}
              max={MAX_TOPUP}
              value={amount}
              onChange={handleAmountChange}
              className={`payment-top-up__input ${error ? 'payment-top-up__input--error' : ''}`}
              placeholder={t('paymentTopUp.amountPlaceholder')}
              required
            />
            {error && (
              <span className="payment-top-up__error">{error}</span>
            )}
            {amount && !error && (
              <span className="payment-top-up__preview">
                {t('paymentTopUp.youAreToppingUp', { amount: formatUZS(parseFloat(amount) * 100, language) })}
              </span>
            )}
          </div>

          <div className="payment-top-up__quick-amounts">
            <label className="payment-top-up__label">{t('paymentTopUp.quickSelect')}:</label>
            <div className="payment-top-up__quick-buttons">
              {quickAmounts.map(quickAmount => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => {
                    setAmount(quickAmount.toString());
                    setError('');
                  }}
                  className="payment-top-up__quick-btn"
                >
                  {formatUZS(quickAmount * 100, language)}
                </button>
              ))}
            </div>
          </div>

          <div className="payment-top-up__form-group">
            <label className="payment-top-up__label">{t('payments.method')}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="payment-top-up__select"
              required
            >
              <option value="cash">{t('paymentTopUp.cash')}</option>
              <option value="uzcard">{t('paymentTopUp.uzcard')}</option>
              <option value="humo">{t('paymentTopUp.humo')}</option>
              <option value="click">{t('paymentTopUp.click')}</option>
              <option value="payme">{t('paymentTopUp.payme')}</option>
              <option value="card">{t('paymentTopUp.bankCard')}</option>
              <option value="bank-transfer">{t('paymentTopUp.bankTransfer')}</option>
            </select>
          </div>

          <div className="payment-top-up__form-group">
            <label className="payment-top-up__label">{t('paymentTopUp.reasonLabel')} ({t('common.optional')})</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="payment-top-up__input"
              placeholder={t('paymentTopUp.reasonPlaceholder')}
              maxLength={200}
            />
          </div>

          <div className="payment-top-up__info">
            <p>ℹ️ {t('paymentTopUp.pendingConfirmation')}</p>
            <p>💰 {t('paymentTopUp.dailyLimit', { limit: formatUZS(5000000 * 100, language) })}</p>
          </div>

          <div className="payment-top-up__actions">
            <button type="button" onClick={handleClose} className="payment-top-up__cancel-btn">
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="payment-top-up__submit-btn"
              disabled={!!error || !amount}
            >
              {t('paymentTopUp.topUpWallet')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};