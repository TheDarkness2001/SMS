import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatTransactionAmount, getTransactionStatusColor, getTransactionTypeColor } from '../utils/formatters';

export const TransactionHistoryTable = ({ transactions, loading }) => {
  const { t, language } = useLanguage();
  if (loading) {
    return (
      <div className="transaction-history__loading">
        <p>{t('transactionHistory.loading')}...</p>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-history__empty">
        <p>{t('transactionHistory.noTransactions')}</p>
      </div>
    );
  }

  const getTransactionTypeClass = (type) => {
    switch (type) {
      case 'top-up':
        return 'transaction-history__type--top-up';
      case 'class-deduction':
        return 'transaction-history__type--deduction';
      case 'penalty':
        return 'transaction-history__type--penalty';
      case 'refund':
        return 'transaction-history__type--refund';
      case 'adjustment':
        return 'transaction-history__type--adjustment';
      default:
        return 'transaction-history__type';
    }
  };

  const getDirectionClass = (direction) => {
    return direction === 'credit' 
      ? 'transaction-history__amount--credit' 
      : 'transaction-history__amount--debit';
  };

  return (
    <div className="transaction-history__container">
      <table className="transaction-history__table">
        <thead className="transaction-history__thead">
          <tr>
            <th className="transaction-history__header">{t('payments.date')}</th>
            <th className="transaction-history__header">{t('wallet.type')}</th>
            <th className="transaction-history__header">{t('payments.amount')}</th>
            <th className="transaction-history__header">{t('payments.status')}</th>
            <th className="transaction-history__header">{t('students.reason')}</th>
            <th className="transaction-history__header">{t('transactionHistory.recordedBy')}</th>
          </tr>
        </thead>
        <tbody className="transaction-history__tbody">
          {transactions.map((transaction) => (
            <tr key={transaction._id} className="transaction-history__row">
              <td className="transaction-history__cell">
                {new Date(transaction.createdAt).toLocaleDateString(t('common.locale'), {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td className={`transaction-history__cell ${getTransactionTypeClass(transaction.transactionType)}`}>
                <span 
                  className="transaction-history__type-badge"
                  style={{ 
                    backgroundColor: getTransactionTypeColor(transaction.transactionType) + '20',
                    color: getTransactionTypeColor(transaction.transactionType),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {t(`wallet.${transaction.transactionType.replace('-', ' ')}`) !== `wallet.${transaction.transactionType.replace('-', ' ')}` 
                    ? t(`wallet.${transaction.transactionType.replace('-', ' ')}`) 
                    : t(`wallet.${transaction.transactionType}`) !== `wallet.${transaction.transactionType}`
                      ? t(`wallet.${transaction.transactionType}`)
                      : transaction.transactionType.replace('-', ' ').toUpperCase()}
                </span>
              </td>
              <td className={`transaction-history__cell ${getDirectionClass(transaction.direction)}`}>
                <span 
                  style={{ 
                    color: transaction.direction === 'credit' ? '#28a745' : '#dc3545',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {formatTransactionAmount(transaction.amount, transaction.direction, language)}
                </span>
              </td>
              <td className="transaction-history__cell">
                <span 
                  className={`transaction-history__status transaction-history__status--${transaction.status}`}
                  style={{
                    backgroundColor: getTransactionStatusColor(transaction.status) + '20',
                    color: getTransactionStatusColor(transaction.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {t(`common.${transaction.status}`)}
                </span>
              </td>
              <td className="transaction-history__cell">
                {transaction.reason || t('common.noData')}
              </td>
              <td className="transaction-history__cell">
                {transaction.createdBy?.name || transaction.recordedBy?.name || t('transactionHistory.system')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};