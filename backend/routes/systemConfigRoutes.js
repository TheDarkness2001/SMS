const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager', 'founder'), systemConfigController.getAllConfigs);
router.get('/:key', protect, authorize('admin', 'manager', 'founder'), systemConfigController.getConfig);
router.put('/:key', protect, authorize('admin', 'manager', 'founder'), systemConfigController.updateConfig);

module.exports = router;
