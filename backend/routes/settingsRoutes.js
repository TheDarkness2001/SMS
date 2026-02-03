const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getRolePermissions,
  checkFeature
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Only Admin, Manager, and Founder can access settings
router.route('/')
  .get(authorize('admin', 'manager', 'founder'), getSettings)
  .put(authorize('admin', 'manager', 'founder'), updateSettings);

// Get role permissions for current user
router.get('/permissions', getRolePermissions);

// Check if a feature is enabled
router.get('/feature/:featureName', checkFeature);

module.exports = router;