const Settings = require('../models/Settings');

// Check if user has a specific permission
exports.hasPermission = async (user, permission) => {
  try {
    // Managers and Founders have full access
    if (user.role === 'manager' || user.role === 'founder') {
      return true;
    }
    
    // Admins have access to everything
    if (user.role === 'admin') {
      return true;
    }
    
    // For teachers and other roles, check settings
    const settings = await Settings.findOne();
    
    if (!settings) {
      // If no settings, use user's built-in permissions
      return user.permissions && user.permissions[permission];
    }
    
    // Check role-based permissions from settings
    const rolePermissions = settings.rolePermissions[user.role];
    return rolePermissions && rolePermissions[permission];
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Check if a feature is enabled
exports.isFeatureEnabled = async (featureName) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings) {
      // If no settings, enable all features by default
      return true;
    }
    
    return settings.features[featureName] !== undefined ? 
      settings.features[featureName] : true;
  } catch (error) {
    console.error('Error checking feature status:', error);
    return true; // Enable by default on error
  }
};

// Middleware to check permissions
exports.checkPermission = (permission) => {
  return async (req, res, next) => {
    if (req.userType !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access this route'
      });
    }

    const hasPerm = await exports.hasPermission(req.user, permission);
    
    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};