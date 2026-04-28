const Penalty = require('../models/Penalty');
const Student = require('../models/Student');
const HomeworkProgress = require('../models/HomeworkProgress');
const StudentVocabProgress = require('../models/StudentVocabProgress');
const Level = require('../models/Level');

const PENALTY_POINTS = {
  missed_writing_homework: -5,
  missed_word_memorization: -5
};

/**
 * Auto-detect missed writing homework and word memorization penalties
 * for Blackhole 4+ students based on their progress data.
 * Run daily via cron job.
 */
exports.autoDetectPenalties = async (branchId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active students in Blackhole 4+ levels
    // We consider students who have levels with names containing "Blackhole" and number >= 4
    const allLevels = await Level.find().select('_id name');
    const blackhole4PlusIds = allLevels
      .filter(l => {
        const match = l.name.match(/Blackhole\s*(\d+)/i);
        return match && parseInt(match[1]) >= 4;
      })
      .map(l => l._id.toString());

    if (blackhole4PlusIds.length === 0) {
      console.log('[AutoDetect] No Blackhole 4+ levels found');
      return { created: 0 };
    }

    const studentQuery = { status: 'active' };
    if (branchId) studentQuery.branchId = branchId;

    const students = await Student.find(studentQuery).select('_id name branchId');
    let createdCount = 0;

    for (const student of students) {
      // Check writing homework progress (HomeworkProgress)
      const hwProgress = await HomeworkProgress.find({
        studentId: student._id,
        lastUpdated: { $lt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) } // older than 2 days
      });

      for (const progress of hwProgress) {
        // Only check if this lesson belongs to Blackhole 4+
        const lessonLevel = await Level.findOne({ 'lessons._id': progress.lessonId });
        if (!lessonLevel || !blackhole4PlusIds.includes(lessonLevel._id.toString())) continue;

        // Check if penalty already exists for this student/lesson/type today
        const exists = await Penalty.findOne({
          studentId: student._id,
          type: 'missed_writing_homework',
          lessonId: progress.lessonId,
          date: { $gte: today }
        });

        if (!exists) {
          await Penalty.create({
            studentId: student._id,
            type: 'missed_writing_homework',
            points: PENALTY_POINTS.missed_writing_homework,
            quantity: 1,
            date: today,
            lessonId: progress.lessonId,
            notes: 'Auto-detected: no writing homework activity in last 2 days',
            source: 'auto',
            recordedBy: null,
            branchId: student.branchId,
            isReverted: false
          });
          createdCount++;
        }
      }

      // Check word memorization progress (StudentVocabProgress)
      const vocabProgress = await StudentVocabProgress.find({
        studentId: student._id,
        examStatus: { $in: ['locked', 'available'] }, // not passed
        lastExamDate: { $lt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } // older than 7 days
      });

      for (const progress of vocabProgress) {
        const lessonLevel = await Level.findOne({ 'lessons._id': progress.lessonId });
        if (!lessonLevel || !blackhole4PlusIds.includes(lessonLevel._id.toString())) continue;

        const exists = await Penalty.findOne({
          studentId: student._id,
          type: 'missed_word_memorization',
          lessonId: progress.lessonId,
          date: { $gte: today }
        });

        if (!exists) {
          await Penalty.create({
            studentId: student._id,
            type: 'missed_word_memorization',
            points: PENALTY_POINTS.missed_word_memorization,
            quantity: 1,
            date: today,
            lessonId: progress.lessonId,
            notes: 'Auto-detected: word memorization exam not completed in last 7 days',
            source: 'auto',
            recordedBy: null,
            branchId: student.branchId,
            isReverted: false
          });
          createdCount++;
        }
      }
    }

    console.log(`[AutoDetect] Created ${createdCount} auto-penalties`);
    return { created: createdCount };
  } catch (error) {
    console.error('[AutoDetect] Error:', error);
    return { created: 0, error: error.message };
  }
};
