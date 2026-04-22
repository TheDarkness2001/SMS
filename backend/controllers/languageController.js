const Language = require('../models/Language');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const Word = require('../models/Word');

exports.getAllLanguages = async (req, res) => {
  try {
    const languages = await Language.find().sort({ name: 1 });
    res.json({ success: true, count: languages.length, data: { languages } });
  } catch (error) {
    console.error('Get all languages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createLanguage = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Language name is required' });
    }
    const language = new Language({ name: name.trim() });
    await language.save();
    res.status(201).json({ success: true, message: 'Language created', data: { language } });
  } catch (error) {
    console.error('Create language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const language = await Language.findByIdAndUpdate(id, { name: name?.trim() }, { new: true });
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });
    res.json({ success: true, message: 'Language updated', data: { language } });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const language = await Language.findById(id);
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });

    // Cascade: Language → Levels → Lessons → Words
    const levels = await Level.find({ languageId: id });
    for (const level of levels) {
      const lessons = await Lesson.find({ levelId: level._id });
      for (const lesson of lessons) {
        await Word.deleteMany({ _id: { $in: lesson.wordIds } });
      }
      await Lesson.deleteMany({ levelId: level._id });
    }
    await Level.deleteMany({ languageId: id });
    await Language.findByIdAndDelete(id);

    res.json({ success: true, message: 'Language and all related data deleted' });
  } catch (error) {
    console.error('Delete language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
