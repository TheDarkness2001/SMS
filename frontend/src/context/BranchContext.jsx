import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { branchesAPI } from '../utils/api';

const BranchContext = createContext();

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
};

export const BranchProvider = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState(null); // null means "All Branches"
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all branches (for founders, admins, and managers)
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.warn('[BranchContext] No token found in session storage');
        setBranches([]);
        return;
      }

      console.log('[BranchContext] Fetching branches with token...');
      const response = await branchesAPI.getAll();
      console.log('[BranchContext] Branches API response:', response.data);
      
      if (response.data.success) {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        let fetchedBranches = response.data.data.filter(b => b.isActive);
        
        console.log('[BranchContext] Total active branches:', fetchedBranches.length);
        console.log('[BranchContext] User role:', user.role, 'BranchId:', user.branchId);
        
        // If not founder, only show assigned branch
        if (user.role !== 'founder' && user.branchId) {
          fetchedBranches = fetchedBranches.filter(b => b._id === user.branchId);
          console.log('[BranchContext] Filtered to assigned branch for', user.role, ':', fetchedBranches.length);
          // Auto-select their branch if not already selected
          if (fetchedBranches.length > 0) {
            setSelectedBranch(fetchedBranches[0]);
            console.log('[BranchContext] Auto-selected branch:', fetchedBranches[0].name);
          }
        }
        
        setBranches(fetchedBranches);
        console.log('[BranchContext] Branches set to state:', fetchedBranches.map(b => b.name));
      } else {
        console.error('[BranchContext] API returned success: false', data.message);
        setBranches([]);
      }
    } catch (error) {
      console.error('[BranchContext] Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  // Load branches on mount and when token changes
  useEffect(() => {
    const handleAuthChange = () => {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const token = sessionStorage.getItem('token');
      
      console.log('[BranchContext] Auth change detected. User role:', user.role, 'Token exists:', !!token);
      
      if (token && ['founder', 'admin', 'manager'].includes(user.role)) {
        console.log('[BranchContext] Fetching branches for', user.role);
        fetchBranches();
      } else {
        console.log('[BranchContext] Clearing branches - insufficient role or no token');
        setBranches([]);
        setSelectedBranch(null);
      }
    };

    // Initial load
    handleAuthChange();
    
    // Listen for storage changes (to handle login/logout across tabs)
    window.addEventListener('storage', handleAuthChange);
    
    // Listen for custom 'auth-change' event (for same-tab login)
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Helper to get query params for API calls
  const getBranchQueryParam = useCallback(() => {
    if (!selectedBranch) return ''; // All branches
    return `branchId=${selectedBranch._id}`;
  }, [selectedBranch]);

  // Helper to get filter object for API calls
  const getBranchFilter = useCallback(() => {
    console.log('[BranchContext] getBranchFilter called, selectedBranch:', selectedBranch?.name);
    if (!selectedBranch) return {}; // All branches
    return { branchId: selectedBranch._id };
  }, [selectedBranch]);

  const value = useMemo(() => ({
    selectedBranch,
    setSelectedBranch,
    branches,
    loading,
    fetchBranches,
    getBranchQueryParam,
    getBranchFilter,
    isAllBranches: !selectedBranch
  }), [selectedBranch, branches, loading, getBranchFilter, getBranchQueryParam]);

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};
