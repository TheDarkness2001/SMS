const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Could be Student or Parent
    index: true
  },
  ownerType: {
    type: String,
    required: true,
    enum: ['student', 'parent'],
    index: true
  },
  // All amounts stored in UZS (Uzbek soʻm) as integers (tyiyn = 1/100 soʻm)
  // 1 soʻm = 100 tyiyn, so 10,000 soʻm = 1,000,000 tyiyn stored
  balance: {
    type: Number,
    default: 0,
    min: 0, // Prevent negative balance (unless admin override)
    get: v => Math.round(v), // Always return integers
    set: v => Math.round(v)
  },
  // Available balance = balance that can be used immediately
  availableBalance: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  // Pending balance = funds that are being processed (e.g., pending top-ups)
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  currency: {
    type: String,
    default: 'UZS',
    uppercase: true,
    maxlength: 3,
    immutable: true // Currency cannot be changed after creation
  },
  // Grace balance for admin-approved overdraft (stored in tyiyn)
  graceBalance: {
    type: Number,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  // Lock wallet to prevent any transactions
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  // Lock reason (required when isLocked = true)
  lockReason: {
    type: String,
    maxlength: 500
  },
  // Who locked the wallet
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  lockedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track last transaction timestamp for audit
  lastTransactionAt: {
    type: Date
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { getters: true }, // Apply getters when converting to JSON
  toObject: { getters: true }
});

// Index for efficient balance lookups
walletSchema.index({ ownerId: 1, ownerType: 1 });

// Virtual field for total balance (available + pending)
walletSchema.virtual('totalBalance').get(function() {
  return this.availableBalance + this.pendingBalance;
});

// Pre-save middleware to validate balance consistency
walletSchema.pre('save', function(next) {
  // Ensure balance = availableBalance + pendingBalance
  this.balance = this.availableBalance + this.pendingBalance;
  
  // Validate lock requirements
  if (this.isLocked && !this.lockReason) {
    return next(new Error('Lock reason is required when wallet is locked'));
  }
  
  // Prevent negative available balance (unless grace balance exists)
  if (this.availableBalance < 0 && Math.abs(this.availableBalance) > this.graceBalance) {
    return next(new Error('Available balance cannot be negative beyond grace balance'));
  }
  
  next();
});

// Instance method to check if wallet can deduct amount
walletSchema.methods.canDeduct = function(amount) {
  if (this.isLocked) return false;
  const effectiveBalance = this.availableBalance + this.graceBalance;
  return effectiveBalance >= amount;
};

// Instance method to lock wallet
walletSchema.methods.lock = function(reason, lockedBy) {
  this.isLocked = true;
  this.lockReason = reason;
  this.lockedBy = lockedBy;
  this.lockedAt = new Date();
};

// Instance method to unlock wallet
walletSchema.methods.unlock = function() {
  this.isLocked = false;
  this.lockReason = undefined;
  this.lockedBy = undefined;
  this.lockedAt = undefined;
};

module.exports = mongoose.model('Wallet', walletSchema);