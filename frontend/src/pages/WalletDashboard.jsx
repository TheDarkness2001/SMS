import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { topUpWallet } from '../api/wallet';
import { TransactionHistoryTable } from '../components/TransactionHistoryTable';
import { PaymentTopUpModal } from '../components/PaymentTopUpModal';
import { useWallet } from '../hooks/useWallet';
import { formatUZS } from '../utils/formatters';
import '../styles/WalletDashboard.css';

const WalletDashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { wallet, transactions, loading, fetchWalletSummary, fetchTransactionHistory } = useWallet();
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    transactionType: '',
    subject: ''
  });

  useEffect(() => {
    if (user) {
      fetchWalletSummary(user._id, 'student');
      fetchTransactionHistory(user._id, 'student');
    }
  }, [user, fetchWalletSummary, fetchTransactionHistory]);

  const handleTopUp = async (amount, paymentMethod, reason) => {
    try {
      await topUpWallet({
        ownerId: user._id,
        ownerType: 'student',
        amount,
        paymentMethod,
        reason
      });
      fetchWalletSummary(user._id, 'student');
      fetchTransactionHistory(user._id, 'student');
      setShowTopUpModal(false);
    } catch (error) {
      console.error('Top-up failed:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.dateFrom && new Date(transaction.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(transaction.createdAt) > new Date(filters.dateTo)) return false;
    if (filters.transactionType && transaction.transactionType !== filters.transactionType) return false;
    return true;
  });

  return (
    <div className="wallet-dashboard__container">
      <div className="wallet-dashboard__header">
        <h1 className="wallet-dashboard__title">{t('wallet.walletDashboard')}</h1>
        {user?.userType === 'student' && (
          <button 
            className="wallet-dashboard__top-up-btn"
            onClick={() => setShowTopUpModal(true)}
          >
            {t('wallet.topUpWallet')}
          </button>
        )}
      </div>

      <div className="wallet-dashboard__summary">
        <div className="wallet-dashboard__balance-card wallet-dashboard__balance-card--primary">
          <h3 className="wallet-dashboard__balance-title">{t('wallet.totalBalance')}</h3>
          <p className="wallet-dashboard__balance-amount">
            {formatUZS(wallet.balance || 0, language)}
          </p>
          {wallet.isLocked && (
            <div className="wallet-dashboard__locked-badge">
              🔒 {t('wallet.walletLocked')}: {wallet.lockReason}
            </div>
          )}
        </div>

        <div className="wallet-dashboard__balance-card wallet-dashboard__balance-card--available">
          <h3 className="wallet-dashboard__balance-title">{t('wallet.availableBalance')}</h3>
          <p className="wallet-dashboard__balance-amount wallet-dashboard__balance-amount--available">
            {formatUZS(wallet.availableBalance || 0, language)}
          </p>
          <p className="wallet-dashboard__balance-subtitle">{t('wallet.readyToUse')}</p>
        </div>

        <div className="wallet-dashboard__balance-card wallet-dashboard__balance-card--pending">
          <h3 className="wallet-dashboard__balance-title">{t('wallet.pendingBalance')}</h3>
          <p className="wallet-dashboard__balance-amount wallet-dashboard__balance-amount--pending">
            {formatUZS(wallet.pendingBalance || 0, language)}
          </p>
          <p className="wallet-dashboard__balance-subtitle">{t('wallet.beingProcessed')}</p>
        </div>

        {user?.userType === 'student' && (
          <div className="wallet-dashboard__stats">
            <div className="wallet-dashboard__stat">
              <h4>{t('wallet.totalTopUps')}</h4>
              <p>{formatUZS((wallet.transactionStats?.find(s => s._id === 'top-up')?.total || 0), language)}</p>
            </div>
            <div className="wallet-dashboard__stat">
              <h4>{t('wallet.totalDeductions')}</h4>
              <p>{formatUZS((wallet.transactionStats?.reduce((sum, stat) => 
                ['class-deduction', 'penalty'].includes(stat._id) ? sum + stat.total : sum, 0) || 0), language)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="wallet-dashboard__filters">
        <div className="wallet-dashboard__filter-group">
          <label>{t('wallet.dateFrom')}:</label>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            className="wallet-dashboard__filter-input"
          />
        </div>
        <div className="wallet-dashboard__filter-group">
          <label>{t('wallet.dateTo')}:</label>
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            className="wallet-dashboard__filter-input"
          />
        </div>
        <div className="wallet-dashboard__filter-group">
          <label>{t('wallet.type')}:</label>
          <select
            name="transactionType"
            value={filters.transactionType}
            onChange={handleFilterChange}
            className="wallet-dashboard__filter-select"
          >
            <option value="">{t('wallet.allTypes')}</option>
            <option value="top-up">{t('wallet.topUp')}</option>
            <option value="class-deduction">{t('wallet.classDeduction')}</option>
            <option value="penalty">{t('wallet.penalty')}</option>
            <option value="refund">{t('wallet.refund')}</option>
            <option value="adjustment">{t('wallet.adjustment')}</option>
          </select>
        </div>
      </div>

      <div className="wallet-dashboard__transactions">
        <h2 className="wallet-dashboard__transactions-title">{t('wallet.transactionHistory')}</h2>
        <TransactionHistoryTable 
          transactions={filteredTransactions} 
          loading={loading} 
        />
      </div>

      <PaymentTopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onTopUp={handleTopUp}
      />
    </div>
  );
};

export default WalletDashboard;