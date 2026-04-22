const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const Word = require('../models/Word');

exports.getLevelsByLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    const levels = await Level.find({ languageId }).sort({ name: 1 });
    res.json({ success: true, count: levels.length, data: { levels } });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createLevel = async (req, res) => {
  try {
    const { name, languageId, classesCount, wordsPerClass, examTimeLimit, minPassScore } = req.body;
    if (!name?.trim() || !languageId) {
      return res.status(400).json({ success: false, message: 'Name and language are required' });
    }
    const level = new Level({
      name: name.trim(),
      languageId,
      classesCount: classesCount || 11,
      wordsPerClass: wordsPerClass || 20,
      examTimeLimit: examTimeLimit || 300,
      minPassScore: minPassScore || 70
    });
    await level.save();
    res.status(201).json({ success: true, message: 'Level created', data: { level } });
  } catch (error) {
    console.error('Create level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const level = await Level.findByIdAndUpdate(id, { name: name?.trim() }, { new: true });
    if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
    res.json({ success: true, message: 'Level updated', data: { level } });
  } catch (error) {
    console.error('Update level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const level = await Level.findById(id);
    if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

    // Get all lessons in this level
    const lessons = await Lesson.find({ levelId: id });

    // Delete all words in all lessons
    for (const lesson of lessons) {
      await Word.deleteMany({ _id: { $in: lesson.wordIds } });
    }

    // Delete lessons and progress
    await Lesson.deleteMany({ levelId: id });
    await Level.findByIdAndDelete(id);

    res.json({ success: true, message: 'Level, classes, and words deleted' });
  } catch (error) {
    console.error('Delete level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
