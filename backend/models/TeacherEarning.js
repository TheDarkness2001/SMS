const mongoose = require('mongoose');

/**
 * StaffEarning Model
 * Production-grade payroll & commission system
 * CRITICAL: This is NOT a wallet - staff EARNS money, not prepaid
 * All amounts in UZS (tyiyn = 1/100 so'm)
 */
const staffEarningSchema = new mongoose.Schema({
  // Staff Reference
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Teacher',
    index: true,
    immutable: true // Cannot change who earned it
  },
  
  // Class Reference (optional - can be for bonuses/adjustments)
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    index: true,
    immutable: true
  },
  
  // Student Reference (optional - for commission tracking)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    immutable: true
  },
  
  // Amount in UZS (stored as integers in tyiyn)
  amount: {
    type: Number,
    required: true,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true // Amount cannot be changed after creation
  },
  
  // Type of earning
  earningType: {
    type: String,
    required: true,
    enum: ['per-class', 'hourly', 'commission', 'bonus', 'adjustment', 'penalty'],
    default: 'per-class',
    immutable: true
  },
  
  // Status lifecycle: pending → approved → paid
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Reference date (usually class date)
  referenceDate: {
    type: Date,
    required: true,
    index: true,
    immutable: true
  },
  
  // Subject/Description
  description: {
    type: String,
    maxlength: 200,
    immutable: true
  },
  
  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  
  approvedAt: {
    type: Date
  },
  
  // Payout tracking
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryPayout'
  },
  
  paidAt: {
    type: Date,
    index: true
  },
  
  // For adjustments/penalties - MANDATORY reason
  reason: {
    type: String,
    maxlength: 500
  },
  
  // Who created this earning (for audit)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    immutable: true
  },
  
  createdByType: {
    type: String,
    enum: ['system', 'admin', 'manager', 'founder'],
    default: 'system',
    immutable: true
  },
  
  // Metadata for tracking
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true,
    immutable: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Prevent modification of critical fields after creation
staffEarningSchema.pre('save', function(next) {
  if (!this.isNew) {
    const modifiedPaths = this.modifiedPaths();
    const allowedModifications = ['status', 'approvedBy', 'approvedAt', 'payoutId', 'paidAt', 'metadata', 'updatedAt'];
    
    const illegalModifications = modifiedPaths.filter(path => !allowedModifications.includes(path));
    
    if (illegalModifications.length > 0) {
      return next(new Error(`Cannot modify immutable earning fields: ${illegalModifications.join(', ')}`));
    }
  }
  
  // Validate reason for adjustments and penalties
  if (['adjustment', 'penalty'].includes(this.earningType) && !this.reason) {
    return next(new Error('Reason is required for adjustments and penalties'));
  }
  
  // Validate reason length
  if (this.reason && this.reason.length < 10) {
    return next(new Error('Reason must be at least 10 characters'));
  }
  
  next();
});

// Indexes for efficient queries
staffEarningSchema.index({ staffId: 1, createdAt: -1 });
staffEarningSchema.index({ staffId: 1, status: 1 });
staffEarningSchema.index({ status: 1, referenceDate: -1 });
staffEarningSchema.index({ classId: 1 });
staffEarningSchema.index({ referenceDate: -1 });

// Virtual for formatted amount (for display)
staffEarningSchema.virtual('formattedAmount').get(function() {
  return `${Math.round(this.amount / 100).toLocaleString('en-US')} so'm`;
});

// Instance method to approve earning
staffEarningSchema.methods.approve = function(approvedById) {
  if (this.status !== 'pending') {
    throw new Error('Only pending earnings can be approved');
  }
  this.status = 'approved';
  this.approvedBy = approvedById;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to mark as paid
staffEarningSchema.methods.markAsPaid = function(payoutId) {
  if (this.status !== 'approved') {
    throw new Error('Only approved earnings can be marked as paid');
  }
  this.status = 'paid';
  this.payoutId = payoutId;
  this.paidAt = new Date();
  return this.save();
};

module.exports = mongoose.model('StaffEarning', staffEarningSchema, 'teacherearnings');