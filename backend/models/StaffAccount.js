const mongoose = require('mongoose');

/**
 * StaffAccount Model (Summary/Balance Tracker)
 * Real-time summary of staff earnings and payouts
 * This is NOT a wallet - it's an accounting summary
 * All amounts in UZS (tyiyn = 1/100 so'm)
 */
const staffAccountSchema = new mongoose.Schema({
  // Staff reference
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Teacher',
    immutable: true
  },
  
  // Total amount earned (lifetime)
  totalEarned: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  
  // Total amount paid out (lifetime)
  totalPaidOut: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  
  // Available for payout (totalEarned - totalPaidOut - pending payouts)
  availableForPayout: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  
  // Pending earnings (not yet approved)
  pendingEarnings: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  
  // Approved but not paid
  approvedNotPaid: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  
  // Last earning date
  lastEarningDate: {
    type: Date,
    index: true
  },
  
  // Last payout date
  lastPayoutDate: {
    type: Date,
    index: true
  },
  
  // Statistics
  statistics: {
    totalClasses: { type: Number, default: 0 },
    totalBonuses: { type: Number, default: 0 },
    totalAdjustments: { type: Number, default: 0 },
    totalPenalties: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 }
  },
  
  // Currency (always UZS)
  currency: {
    type: String,
    default: 'UZS',
    immutable: true
  },
  
  // Last updated timestamp
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Pre-save validation
staffAccountSchema.pre('save', function(next) {
  // Ensure availableForPayout is not negative
  if (this.availableForPayout < 0) {
    return next(new Error('Available for payout cannot be negative'));
  }
  
  // Ensure totalPaidOut <= totalEarned (with approved)
  const totalApproved = this.totalEarned - this.pendingEarnings;
  if (this.totalPaidOut > totalApproved) {
    return next(new Error('Total paid out cannot exceed approved earnings'));
  }
  
  // Update lastUpdatedAt
  this.lastUpdatedAt = new Date();
  
  next();
});

// Index for efficient queries
staffAccountSchema.index({ lastUpdatedAt: -1 });

// Virtual for net balance (approved but not paid)
staffAccountSchema.virtual('netBalance').get(function() {
  return this.totalEarned - this.pendingEarnings - this.totalPaidOut;
});

// Instance method to add earning
staffAccountSchema.methods.addEarning = function(amount, status = 'pending') {
  this.totalEarned += amount;
  
  if (status === 'pending') {
    this.pendingEarnings += amount;
  } else if (status === 'approved') {
    this.approvedNotPaid += amount;
    this.availableForPayout += amount;
  }
  
  this.lastEarningDate = new Date();
  return this.save();
};

// Instance method to approve earning
staffAccountSchema.methods.approveEarning = function(amount) {
  if (this.pendingEarnings < amount) {
    throw new Error('Insufficient pending earnings');
  }
  
  this.pendingEarnings -= amount;
  this.approvedNotPaid += amount;
  this.availableForPayout += amount;
  
  return this.save();
};

// Instance method to process payout
staffAccountSchema.methods.processPayout = function(amount) {
  if (this.availableForPayout < amount) {
    throw new Error('Insufficient available balance for payout');
  }
  
  this.totalPaidOut += amount;
  this.availableForPayout -= amount;
  this.approvedNotPaid -= amount;
  this.lastPayoutDate = new Date();
  this.statistics.totalPayouts += 1;
  
  return this.save();
};

// Static method to get or create account
staffAccountSchema.statics.getOrCreate = async function(staffId) {
  let account = await this.findOne({ staffId });
  
  if (!account) {
    account = await this.create({ staffId });
  }
  
  return account;
};

// Static method to recalculate balance (for audit/reconciliation)
staffAccountSchema.statics.recalculateBalance = async function(staffId) {
  const StaffEarning = mongoose.model('StaffEarning');
  const StaffPayout = mongoose.model('StaffPayout');
  
  // Calculate totals from actual records
  const earningsAgg = await StaffEarning.aggregate([
    { $match: { staffId: mongoose.Types.ObjectId(staffId), status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  const payoutsAgg = await StaffPayout.aggregate([
    { $match: { staffId: mongoose.Types.ObjectId(staffId), status: 'completed' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  const pendingEarnings = earningsAgg.find(e => e._id === 'pending')?.total || 0;
  const approvedEarnings = earningsAgg.find(e => e._id === 'approved')?.total || 0;
  const paidEarnings = earningsAgg.find(e => e._id === 'paid')?.total || 0;
  const totalEarned = pendingEarnings + approvedEarnings + paidEarnings;
  const totalPaidOut = payoutsAgg[0]?.total || 0;
  
  // Update account
  const account = await this.getOrCreate(staffId);
  account.totalEarned = totalEarned;
  account.pendingEarnings = pendingEarnings;
  account.approvedNotPaid = approvedEarnings;
  account.totalPaidOut = totalPaidOut;
  account.availableForPayout = approvedEarnings; // Only approved can be paid out
  
  await account.save();
  return account;
};

module.exports = mongoose.model('StaffAccount', staffAccountSchema);
