const mongoose = require('mongoose');

const parentNotificationSettingsSchema = new mongoose.Schema({
  // We bind settings to a student, since parent contact is stored on the student
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: false
  },
  // Channels like ['push', 'sms']
  notificationChannels: {
    type: [String],
    enum: ['push', 'sms'],
    default: []
  },
  // Optional push device tokens for the parent (web/mobile)
  deviceTokens: {
    type: [String],
    default: []
  },
  // Quiet hours, stored as HH:mm strings (local school time)
  quietHoursStart: {
    type: String,
    default: '21:00'
  },
  quietHoursEnd: {
    type: String,
    default: '08:00'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ParentNotificationSettings', parentNotificationSettingsSchema);
