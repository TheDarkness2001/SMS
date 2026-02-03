const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    required: true
  },
  class: {
    type: String,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  checkInTime: {
    type: String,
    default: ''
  },
  checkOutTime: {
    type: String,
    default: ''
  },
  checkInPhoto: {
    type: String,
    default: ''
  },
  checkOutPhoto: {
    type: String,
    default: ''
  },
  checkInLocation: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  },
  checkOutLocation: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  },
  locationVerified: {
    type: Boolean,
    default: false
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    userAgent: { type: String, default: '' },
    platform: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    deviceType: { type: String, enum: ['mobile', 'tablet', 'laptop', 'desktop', 'cctv', 'kiosk'], default: 'mobile' },
    deviceId: { type: String, default: '' }
  },
  isTeacherAbsent: {
    type: Boolean,
    default: false
  },
  isCanceled: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one attendance record per student per class per day
studentAttendanceSchema.index({ student: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);