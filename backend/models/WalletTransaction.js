const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Wallet',
    index: true,
    immutable: true // Cannot change wallet after creation
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['top-up', 'class-deduction', 'penalty', 'refund', 'adjustment'],
    immutable: true
  },
  // All amounts stored in UZS (tyiyn - 1/100 soʻm) as integers
  amount: {
    type: Number,
    required: true,
    min: 0, // All amounts are positive, use direction to determine credit/debit
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true
  },
  direction: {
    type: String,
    required: true,
    enum: ['credit', 'debit'], // credit = money in, debit = money out
    immutable: true
  },
  // Status for transaction lifecycle
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  // Balance snapshot after this transaction (for audit trail)
  balanceAfterTransaction: {
    type: Number,
    required: true,
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true
  },
  // Available balance after transaction (for audit)
  availableBalanceAfter: {
    type: Number,
    required: true,
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true
  },
  // Pending balance after transaction (for audit)
  pendingBalanceAfter: {
    type: Number,
    required: true,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    immutable: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
    immutable: true
  },
  referenceModel: {
    type: String,
    enum: ['Class', 'Payment', 'Adjustment', 'Penalty'],
    immutable: true
  },
  // Who created this transaction
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
    immutable: true
  },
  createdByType: {
    type: String,
    required: true,
    enum: ['student', 'parent', 'teacher', 'admin', 'founder', 'receptionist', 'manager', 'system'],
    immutable: true
  },
  // Legacy field for backward compatibility
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    immutable: true
  },
  recordedByType: {
    type: String,
    enum: ['parent', 'student', 'receptionist', 'admin', 'teacher'],
    immutable: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'uzcard', 'humo', 'click', 'payme', 'cash', 'bank-transfer', 'adjustment'],
    immutable: true
  },
  reason: {
    type: String,
    maxlength: 500,
    immutable: true
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  // For refunds - link to original transaction
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
    immutable: true
  },
  // For reversals - link to reversed transaction
  reversalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction'
  },
  confirmationNumber: {
    type: String,
    sparse: true,
    immutable: true
  },
  // Metadata for additional tracking
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true,
    immutable: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    immutable: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Index for efficient queries
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ transactionType: 1 });
walletTransactionSchema.index({ status: 1 });
walletTransactionSchema.index({ createdBy: 1 });

// Prevent updates to completed/failed transactions (immutability enforcement)
walletTransactionSchema.pre('save', function(next) {
  if (!this.isNew) {
    // Allow only status and notes updates on existing transactions
    const modifiedPaths = this.modifiedPaths();
    const allowedModifications = ['status', 'notes', 'reversalTransactionId', 'metadata', 'updatedAt'];
    
    const illegalModifications = modifiedPaths.filter(path => !allowedModifications.includes(path));
    
    if (illegalModifications.length > 0) {
      return next(new Error(`Cannot modify immutable transaction fields: ${illegalModifications.join(', ')}`));
    }
    
    // Prevent status changes on completed/failed transactions
    if (this.isModified('status')) {
      const originalStatus = this._original?.status;
      if (['completed', 'failed'].includes(originalStatus) && originalStatus !== this.status) {
        return next(new Error(`Cannot change status from ${originalStatus}`));
      }
    }
  }
  
  // Validate reason is provided for penalties and adjustments
  if (['penalty', 'adjustment'].includes(this.transactionType) && !this.reason) {
    return next(new Error(`Reason is required for ${this.transactionType} transactions`));
  }
  
  next();
});

// Store original document for comparison
walletTransactionSchema.post('init', function(doc) {
  doc._original = doc.toObject();
});

// Virtual for display amount with direction
walletTransactionSchema.virtual('displayAmount').get(function() {
  return this.direction === 'credit' ? this.amount : -this.amount;
});

// Instance method to check if transaction can be reversed
walletTransactionSchema.methods.canReverse = function() {
  return this.status === 'completed' && !this.reversalTransactionId;
};

// Instance method to format amount in UZS
walletTransactionSchema.methods.formatAmount = function() {
  // Format: 125 500 soʻm
  const amount = Math.round(this.amount);
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' soʻm';
};

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);