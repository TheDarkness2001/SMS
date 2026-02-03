const mongoose = require('mongoose');

const attendanceAuditSchema = new mongoose.Schema({
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'checked-in', 'checked-out', 'verified', 'rejected', 'approved', 'notes-added', 'status-changed'],
    required: true
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'admin', 'manager', 'founder'],
    required: true
  },
  oldValue: {
    type: Object,
    default: null
  },
  newValue: {
    type: Object,
    default: null
  },
  deviceInfo: {
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    platform: { type: String, default: '' }
  },
  description: {
    type: String,
    default: ''
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  }
}, {
  timestamps: true,
  minimize: false
});

// Indexes for fast queries
attendanceAuditSchema.index({ attendance: 1, createdAt: -1 });
attendanceAuditSchema.index({ teacher: 1, action: 1 });
attendanceAuditSchema.index({ actionBy: 1, createdAt: -1 });
attendanceAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AttendanceAudit', attendanceAuditSchema);
