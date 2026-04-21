const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lesson name is required'],
    trim: true
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    trim: true
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    default: 1
  },
  wordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
  }],
  examTimeLimit: {
    type: Number,
    default: 300
  },
  minPassScore: {
    type: Number,
    default: 70
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

lessonSchema.index({ level: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
