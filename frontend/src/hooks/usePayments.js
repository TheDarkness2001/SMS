import { useState, useEffect, useCallback, useMemo } from 'react';
import { studentsAPI, paymentsAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../context/BranchContext';

/**
 * Custom hook for payment management
 */
export const usePayments = (initialFilters = {}) => {
  const navigate = useNavigate();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    class: 'All',
    subject: 'All',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    ...initialFilters
  });

  /**
   * Load students, subjects and payments data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess('');

      const branchFilter = getBranchFilter();

      // Fetch students and payments from the API
      const [studentsResponse, paymentsResponse] = await Promise.all([
        studentsAPI.getAll(branchFilter),
        paymentsAPI.getAll(branchFilter)
      ]);

      if (studentsResponse.data?.success) {
        setStudents(studentsResponse.data.data || []);
      } else {
        throw new Error('Failed to fetch students');
      }

      if (paymentsResponse.data?.success) {
        setPayments(paymentsResponse.data.data || []);
      } else {
        throw new Error('Failed to fetch payments');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // Handle 401 Unauthorized error by redirecting to login
      if (err.response && err.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, getBranchFilter]);

  /**
   * Refresh data
   */
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Load data on component mount or when branch changes
  useEffect(() => {
    loadData();
  }, [loadData, selectedBranch]);

  /**
   * Get unique classes for filter
   */
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(students.map(s => s.class).filter(Boolean))];
    return ['All', ...classes.sort()];
  }, [students]);

  /**
   * Get unique subjects for filter
   */
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set();
    students.forEach(student => {
      (student.subjects || []).forEach(subject => subjects.add(subject));
    });
    return ['All', ...Array.from(subjects).sort()];
  }, [students]);

  /**
   * Filter students based on current filters
   */
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Only show active students
      if (student.status !== 'active') return false;

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (!student.name.toLowerCase().includes(searchTerm) && 
            !student.studentId.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Class filter
      if (filters.class !== 'All' && student.class !== filters.class) {
        return false;
      }

      return true;
    });
  }, [students, filters]);

  /**
   * Get payment for a student and subject in the selected month/year
   */
  const getPaymentForStudentSubject = useCallback((studentId, subject) => {
    return payments.find(p => 
      p.student?._id === studentId && 
      p.subject === subject &&  // Changed from courseName to subject
      p.month === filters.month &&
      p.year === filters.year
    );
  }, [payments, filters.month, filters.year]);

  /**
   * Get payment status for a student and subject
   */
  const getPaymentStatus = useCallback((studentId, subject) => {
    const payment = getPaymentForStudentSubject(studentId, subject);
    
    if (!payment) return 'Unpaid';
    if (payment.status === 'paid') return 'Paid';
    if (payment.status === 'partial') return 'Partial';
    return 'Unpaid';
  }, [getPaymentForStudentSubject]);

  /**
   * Get payment amount for a student and subject
   */
  const getPaymentAmount = useCallback((studentId, subject) => {
    const payment = getPaymentForStudentSubject(studentId, subject);
    console.log(`Payment for student ${studentId}, subject ${subject}:`, payment);
    return payment ? `$${payment.amount}` : '-';
  }, [getPaymentForStudentSubject]);

  /**
   * Get expected amount for a student and subject
   */
  const getExpectedAmount = useCallback((student, subject) => {
    if (!student) return 0;
    
    const normalizedSubject = subject.toLowerCase().trim();

    // 1. Check in subjectPayments array (New standardized field)
    if (student.subjectPayments && Array.isArray(student.subjectPayments)) {
      const config = student.subjectPayments.find(p => 
        p.subject && p.subject.toLowerCase().trim() === normalizedSubject
      );
      if (config && config.amount) {
        return parseFloat(config.amount);
      }
    }

    // 2. Check in perClassPrices Map/Object
    if (student.perClassPrices) {
      // If it's a Map, convert to object or use .get()
      const prices = student.perClassPrices instanceof Map 
        ? Object.fromEntries(student.perClassPrices) 
        : student.perClassPrices;

      // Try exact match
      if (prices[subject]) return parseFloat(prices[subject]);
      
      // Try normalized match
      for (const [key, value] of Object.entries(prices)) {
        if (key.toLowerCase().trim() === normalizedSubject && value) {
          return parseFloat(value);
        }
      }
    }
    
    // 3. Check for legacy paymentSubjects field (if it still exists in some docs)
    if (student.paymentSubjects && Array.isArray(student.paymentSubjects)) {
      const config = student.paymentSubjects.find(p => 
        p.subject && p.subject.toLowerCase().trim() === normalizedSubject
      );
      if (config && config.amount) {
        return parseFloat(config.amount);
      }
    }
    
    // Fallback to default amounts
    const subjectAmounts = {
      'mathematics': 150,
      'physics': 140,
      'chemistry': 130,
      'biology': 130,
      'english': 120,
      'history': 110,
      'geography': 110,
      'computer science': 160,
      'art': 100,
      'music': 100
    };
    
    return subjectAmounts[normalizedSubject] || 100;
  }, []);

  return {
    // Data
    students,
    payments,
    filteredStudents,
    uniqueClasses,
    uniqueSubjects,
    
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
    getPaymentAmount,
    getExpectedAmount,
    
    // Setters for alerts
    setError,
    setSuccess
  };
};