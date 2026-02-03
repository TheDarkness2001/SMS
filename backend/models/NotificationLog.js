const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  eventType: {
    type: String,
    enum: ['ATTENDANCE_LATE', 'ATTENDANCE_ABSENT', 'TEACHER_FEEDBACK'],
    required: true
  },
  subject: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  lessonId: {
    type: String
  },
  channel: {
    type: String,
    enum: ['push', 'sms'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'skipped_quiet_hours', 'skipped_disabled', 'duplicate'],
    default: 'sent'
  },
  messageBody: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Prevent duplicates per student/subject/event/day/lesson/channel
notificationLogSchema.index(
  { student: 1, eventType: 1, subject: 1, date: 1, lessonId: 1, channel: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
