const SystemConfig = require('../models/SystemConfig');

const DEFAULTS = {
  defaultClassesPerLevel: { value: 11, description: 'Default number of classes per level' },
  defaultWordsPerClass: { value: 20, description: 'Default number of words per class' },
  defaultExamTimeLimit: { value: 300, description: 'Default exam time limit in seconds' },
  defaultPassScore: { value: 70, description: 'Default minimum passing score percentage' }
};

// Initialize default configs
exports.initDefaults = async () => {
  for (const [key, config] of Object.entries(DEFAULTS)) {
    const existing = await SystemConfig.findOne({ key });
    if (!existing) {
      await SystemConfig.create({
        key,
        value: config.value,
        description: config.description
      });
    }
  }
};

// Get all configs
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await SystemConfig.find().sort({ key: 1 });
    res.json({ success: true, data: { configs } });
  } catch (error) {
    console.error('Get configs error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get single config
exports.getConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const config = await SystemConfig.findOne({ key });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }
    res.json({ success: true, data: { config } });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update config
exports.updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const config = await SystemConfig.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Config updated', data: { config } });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
