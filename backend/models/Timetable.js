const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Please provide class']
  },
  section: {
    type: String,
    default: 'A'
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  periods: [{
    periodNumber: {
      type: Number,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    room: {
      type: String,
      default: ''
    }
  }],
  academicYear: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['1st-term', '2nd-term', '3rd-term'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index for unique timetable per class, section, day, and term
timetableSchema.index({ class: 1, section: 1, dayOfWeek: 1, academicYear: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
