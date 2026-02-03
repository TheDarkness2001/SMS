const Payment = require('../models/Payment');

// @desc    Get revenue report
// @route   GET /api/revenue
// @access  Private (with permission)
exports.getRevenue = async (req, res) => {
  try {
    const { startDate, endDate, academicYear, term, paymentType, paymentMethod, subject, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (paymentType) query.paymentType = paymentType;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (subject) query.subject = subject;

    if (startDate && endDate) {
      query.paidDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('student', 'name studentId class')
      .sort('-paidDate');

    // Calculate totals
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Group by payment type
    const revenueByType = payments.reduce((acc, payment) => {
      if (!acc[payment.paymentType]) {
        acc[payment.paymentType] = 0;
      }
      acc[payment.paymentType] += payment.amount;
      return acc;
    }, {});

    // Group by payment method
    const revenueByMethod = payments.reduce((acc, payment) => {
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = 0;
      }
      acc[payment.paymentMethod] += payment.amount;
      return acc;
    }, {});

    // Group by subject
    const revenueBySubject = payments.reduce((acc, payment) => {
      if (!acc[payment.subject]) {
        acc[payment.subject] = 0;
      }
      acc[payment.subject] += payment.amount;
      return acc;
    }, {});

    // Group by month
    const revenueByMonth = payments.reduce((acc, payment) => {
      const month = new Date(payment.paidDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += payment.amount;
      return acc;
    }, {});

    // Group by date for daily reports
    const revenueByDate = payments.reduce((acc, payment) => {
      const date = new Date(payment.paidDate).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += payment.amount;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions: payments.length,
        revenueByType,
        revenueByMethod,
        revenueBySubject,
        revenueByMonth,
        revenueByDate,
        payments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending payments summary
// @route   GET /api/revenue/pending
// @access  Private (with permission)
exports.getPendingPayments = async (req, res) => {
  try {
    let query = { 
      status: { $in: ['pending', 'partial', 'overdue'] } 
    };

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      // Founders can filter by branch
      query.branchId = req.query.branchId;
    }

    const pendingPayments = await Payment.find(query)
      .populate('student', 'name studentId class email phone')
      .sort('dueDate');

    const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalPending,
        count: pendingPayments.length,
        payments: pendingPayments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get revenue statistics
// @route   GET /api/revenue/stats
// @access  Private (with permission)
exports.getRevenueStats = async (req, res) => {
  try {
    const { academicYear, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }
    
    if (academicYear) query.academicYear = academicYear;

    // Total paid
    const paidPayments = await Payment.find({ ...query, status: 'paid' });
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    // Total pending (includes pending, partial, and overdue)
    const pendingPayments = await Payment.find({ 
      ...query, 
      status: { $in: ['pending', 'partial', 'overdue'] } 
    });
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Total overdue
    const overduePayments = await Payment.find({ 
      ...query, 
      status: 'overdue',
      dueDate: { $lt: new Date() }
    });
    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalPaid,
        totalPending,
        totalOverdue,
        paidCount: paidPayments.length,
        pendingCount: pendingPayments.length,
        overdueCount: overduePayments.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};