const Settings = require('../models/Settings');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private (Admin, Manager, Founder)
exports.getSettings = async (req, res) => {
  try {
    // Get the first (and only) settings document
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({});
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private (Admin, Manager, Founder)
exports.updateSettings = async (req, res) => {
  try {
    // Only allow Admin, Manager, or Founder to update settings
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update settings'
      });
    }

    // Get the first (and only) settings document
    let settings = await Settings.findOne();
    
    // If no settings exist, create new ones
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      // Update existing settings
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get role permissions
// @route   GET /api/settings/permissions
// @access  Private
exports.getRolePermissions = async (req, res) => {
  try {
    // Get the first (and only) settings document
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({});
    }

    res.status(200).json({
      success: true,
      data: settings.rolePermissions[req.user.role] || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if feature is enabled
// @route   GET /api/settings/feature/:featureName
// @access  Private
exports.checkFeature = async (req, res) => {
  try {
    const { featureName } = req.params;
    
    // Get the first (and only) settings document
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({});
    }

    const isEnabled = settings.features[featureName] !== undefined ? 
      settings.features[featureName] : true;

    res.status(200).json({
      success: true,
      data: {
        feature: featureName,
        enabled: isEnabled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};