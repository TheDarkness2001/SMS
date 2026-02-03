const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
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
  notes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  // Mode-related fields
  mode: {
    type: String,
    enum: ['test', 'production'],
    default: 'test'
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'needs-review', 'rejected', 'pending'],
    default: 'pending'
  },
  // Verification details
  verification: {
    faceMatch: { type: Boolean, default: false },
    locationMatch: { type: Boolean, default: false },
    deviceMatch: { type: Boolean, default: false },
    manualApproval: { type: Boolean, default: false }
  },
  // Admin review
  adminNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  // Consent tracking
  consent: {
    cameraAccess: { type: Boolean, default: false },
    locationAccess: { type: Boolean, default: false },
    dataStorage: { type: Boolean, default: false },
    consentDate: { type: Date, default: null }
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

// Compound index to ensure one attendance record per teacher per day
attendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
attendanceSchema.index({ mode: 1, verificationStatus: 1 });
attendanceSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
