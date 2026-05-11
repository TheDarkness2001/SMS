const mongoose = require('mongoose');

// Extracts the 11-char YouTube video ID from common URL shapes.
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return '';
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return '';
}

const videoLessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  youtubeUrl: {
    type: String,
    required: [true, 'YouTube URL is required'],
    trim: true
  },
  youtubeVideoId: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: [true, 'Language is required']
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: [true, 'Level is required']
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null,
    required: false
    // NOTE: Video Lessons are independent from Words/Sentences lessons.
    // This field is kept for legacy/optional linkage only. The new flow
    // does not use it — use the `topic` free-text field instead.
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  topic: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    default: null
  },
  createdByModel: {
    type: String,
    enum: ['Teacher', 'StaffAccount', 'Student'],
    default: 'StaffAccount'
  },
  requireWatchPercent: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  examUnlockedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamGroup'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

videoLessonSchema.index({ levelId: 1, createdAt: -1 });
videoLessonSchema.index({ languageId: 1, levelId: 1 });

videoLessonSchema.pre('save', function(next) {
  if (this.isModified('youtubeUrl') || !this.youtubeVideoId) {
    this.youtubeVideoId = extractYouTubeId(this.youtubeUrl);
  }
  if (!this.thumbnail && this.youtubeVideoId) {
    this.thumbnail = `https://img.youtube.com/vi/${this.youtubeVideoId}/hqdefault.jpg`;
  }
  next();
});

videoLessonSchema.statics.extractYouTubeId = extractYouTubeId;

module.exports = mongoose.model('VideoLesson', videoLessonSchema);
