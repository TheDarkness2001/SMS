const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  rank: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
}, { _id: false });

const penaltyPeriodSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12,
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  totalPenalties: {
    type: Number,
    default: 0
  },
  totalBonusesDistributed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  winners: {
    type: [winnerSchema],
    default: []
  }
}, {
  timestamps: true
});

penaltyPeriodSchema.index({ year: 1, month: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('PenaltyPeriod', penaltyPeriodSchema);
