const Language = require('../models/Language');

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
    const language = await Language.findByIdAndDelete(id);
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });
    res.json({ success: true, message: 'Language deleted' });
  } catch (error) {
    console.error('Delete language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
