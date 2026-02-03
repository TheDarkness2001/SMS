import { useState } from 'react';
import { getWalletSummary, getTransactionHistory } from '../api/wallet';

export const useWallet = () => {
  const [wallet, setWallet] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWalletSummary = async (ownerId, ownerType) => {
    try {
      setLoading(true);
      const response = await getWalletSummary(ownerId, ownerType);
      setWallet(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async (ownerId, ownerType, params = {}) => {
    try {
      setLoading(true);
      const response = await getTransactionHistory(ownerId, ownerType, params);
      setTransactions(response.data.data.transactions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    wallet,
    transactions,
    loading,
    error,
    fetchWalletSummary,
    fetchTransactionHistory
  };
};