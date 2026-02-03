const mongoose = require('mongoose');

/**
 * StaffPayout Model (Salary Payout / Withdrawal)
 * Production-grade withdrawal system for staff earnings
 * CRITICAL: Payout does NOT modify earnings - only marks them as paid
 * All amounts in UZS (tyiyn = 1/100 so'm)
 */
const staffPayoutSchema = new mongoose.Schema({
  // Unique payout ID for reference
  payoutId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    immutable: true
  },
  
  // Staff receiving the payout
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Teacher',
    index: true,
    immutable: true
  },
  
  // List of earnings being paid out
  earningIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffEarning',
    immutable: true
  }],
  
  // Total amount being paid (in tyiyn)
  amount: {
    type: Number,
    required: true,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true
  },
  
  // Payment method
  method: {
    type: String,
    required: true,
    enum: ['cash', 'bank-transfer', 'uzcard', 'humo', 'card', 'check'],
    immutable: true
  },
  
  // Status lifecycle: pending → completed / cancelled
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Bank details (for bank transfers)
  bankDetails: {
    accountNumber: String,
    bankName: String,
    accountHolder: String
  },
  
  // Reference number (transaction ID, check number, etc.)
  referenceNumber: {
    type: String,
    maxlength: 100,
    immutable: true
  },
  
  // Who approved/processed this payout
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    immutable: true
  },
  
  approvedByType: {
    type: String,
    enum: ['admin', 'founder', 'manager'],
    required: true,
    immutable: true
  },
  
  // When payout was completed
  completedAt: {
    type: Date,
    index: true
  },
  
  // Cancellation tracking
  cancelledAt: {
    type: Date
  },
  
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  
  // Notes
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Metadata
  metadata: {
    earningsCount: Number,
    dateRange: {
      from: Date,
      to: Date
    }
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

// Generate unique payout ID before saving
staffPayoutSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.payoutId) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.payoutId = `PAYOUT-${timestamp}-${random}`;
    }
  }
  
  // Prevent modification of immutable fields
  if (!this.isNew) {
    const modifiedPaths = this.modifiedPaths();
    const allowedModifications = ['status', 'completedAt', 'cancelledAt', 'cancellationReason', 'notes', 'updatedAt'];
    
    const illegalModifications = modifiedPaths.filter(path => !allowedModifications.includes(path));
    
    if (illegalModifications.length > 0) {
      return next(new Error(`Cannot modify immutable payout fields: ${illegalModifications.join(', ')}`));
    }
  }
  
  // Validate cancellation reason
  if (this.status === 'cancelled' && !this.cancellationReason) {
    return next(new Error('Cancellation reason is required'));
  }
  
  next();
});

// Indexes for efficient queries
staffPayoutSchema.index({ staffId: 1, createdAt: -1 });
staffPayoutSchema.index({ status: 1, createdAt: -1 });
staffPayoutSchema.index({ approvedBy: 1 });
staffPayoutSchema.index({ completedAt: -1 });

// Virtual for formatted amount
staffPayoutSchema.virtual('formattedAmount').get(function() {
  return `${Math.round(this.amount / 100).toLocaleString('en-US')} so'm`;
});

// Instance method to complete payout
staffPayoutSchema.methods.complete = function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending payouts can be completed');
  }
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Instance method to cancel payout
staffPayoutSchema.methods.cancel = function(reason) {
  if (this.status !== 'pending') {
    throw new Error('Only pending payouts can be cancelled');
  }
  if (!reason || reason.length < 10) {
    throw new Error('Cancellation reason must be at least 10 characters');
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

module.exports = mongoose.model('StaffPayout', staffPayoutSchema, 'salarypayouts');