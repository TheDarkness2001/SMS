const mongoose = require('mongoose');

const examGroupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    trim: true,
    sparse: true,
    default: ''
  },
  groupName: {
    type: String,
    required: [true, 'Please provide group name'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Please provide subject']
  },
  class: {
    type: String,
    required: [true, 'Please provide class']
  },
  section: {
    type: String,
    default: 'A'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }],
  description: {
    type: String,
    default: ''
  },
  // Class timing and schedule
  startTime: {
    type: String,
    default: ''
  },
  endTime: {
    type: String,
    default: ''
  },
  days: {
    type: [String],
    default: []
  },
  roomNumber: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
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

module.exports = mongoose.model('ExamGroup', examGroupSchema);
