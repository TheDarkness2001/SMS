const Payment = require('../models/Payment');
const Student = require('../models/Student');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private (with permission)
exports.getPayments = async (req, res) => {
  try {
    const { student, status, paymentType, academicYear, term, subject, month, year, branchId } = req.query;
    console.log('[PAYMENTS] Request query:', req.query);
    
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
      console.log('[PAYMENTS] Non-founder filter applied:', query.branchId);
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
      console.log('[PAYMENTS] Founder branch filter applied:', branchId);
    } else {
      console.log('[PAYMENTS] No branch filter applied (Founder viewing all)');
    }

    if (student) query.student = student;
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (subject) query.subject = subject;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const payments = await Payment.find(query)
      .populate('student', 'name studentId email')
      .populate('recordedBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student', 'name studentId email phone')
      .populate('recordedBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new payment
// @route   POST /api/payments
// @access  Private (with permission)
exports.createPayment = async (req, res) => {
  try {
    // VALIDATE REQUIRED FIELDS
    const { student, amount, dueDate, subject, academicYear, term } = req.body;
    
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
      });
    }
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }
    if (!term) {
      return res.status(400).json({
        success: false,
        message: 'Term is required'
      });
    }

    const paymentData = {
      ...req.body,
      // Accept both 'method' (from frontend) and 'paymentMethod' (from backend)
      paymentMethod: req.body.paymentMethod || req.body.method || 'cash',
      recordedBy: req.user._id
    };

    // Auto-assign branchId if not founder
    if (req.user.role !== 'founder') {
      paymentData.branchId = req.user.branchId;
    }

    // Generate receipt number if payment is marked as paid
    if (paymentData.status === 'paid') {
      paymentData.receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      paymentData.paidDate = new Date();
    }

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private (with permission)
exports.updatePayment = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Accept both field names
    if (req.body.method && !req.body.paymentMethod) {
      updateData.paymentMethod = req.body.method;
    }

    // Generate receipt number if status changed to paid
    if (updateData.status === 'paid' && !updateData.receiptNumber) {
      updateData.receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      updateData.paidDate = new Date();
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('student', 'name studentId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private (with permission)
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payments by student
// @route   GET /api/payments/student/:studentId
// @access  Private
exports.getStudentPayments = async (req, res) => {
  try {
    const { subject, month, year } = req.query;
    let query = { student: req.params.studentId };
    
    if (subject) query.subject = subject;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const payments = await Payment.find(query)
      .populate('recordedBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Handle partial payment
// @route   POST /api/payments/partial
// @access  Private (with permission)
exports.handlePartialPayment = async (req, res) => {
  try {
    const { studentId, subject, amount, method, notes, month, year } = req.body;
    
    // Get existing payment for this student/subject/month/year if it exists
    const existingPayment = await Payment.findOne({
      student: studentId,
      subject: subject,
      month: month,
      year: year
    });
    
    if (existingPayment) {
      // If there's an existing payment, update it by adding the new amount
      const newAmount = existingPayment.amount + amount;
      let newStatus = 'partial';
      
      // You would need to determine the expected amount to set status appropriately
      // This is a simplified example
      
      const updatedPayment = await Payment.findByIdAndUpdate(
        existingPayment._id,
        {
          amount: newAmount,
          status: newStatus,
          method: method || existingPayment.method,
          notes: notes || existingPayment.notes,
          // Update paidDate if now fully paid
          ...(newStatus === 'paid' && !existingPayment.paidDate && { paidDate: new Date() })
        },
        { new: true }
      );
      
      return res.status(200).json({
        success: true,
        data: updatedPayment
      });
    } else {
      // Create new partial payment
      const payment = await Payment.create({
        student: studentId,
        amount: amount,
        paymentType: 'tuition-fee',
        method: method || 'cash',
        status: 'partial',
        subject: subject,
        month: month,
        year: year,
        dueDate: new Date(), // You might want to set this appropriately
        notes: notes || '',
        recordedBy: req.user._id
      });
      
      return res.status(201).json({
        success: true,
        data: payment
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};