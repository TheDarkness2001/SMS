const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDeletePlugin');

const listeningExerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  script: {
    type: String,
    required: [true, 'Script/transcript is required'],
    trim: true
  },
  audioFile: {
    type: String,
    required: [true, 'Audio file is required']
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: [true, 'Lesson ID is required']
  },
  order: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

listeningExerciseSchema.index({ lessonId: 1, order: 1 });

listeningExerciseSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ListeningExercise', listeningExerciseSchema);
