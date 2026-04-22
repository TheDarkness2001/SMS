const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const { protect, authorizeHomework } = require('../middleware/auth');

router.get('/', protect, authorizeHomework(), systemConfigController.getAllConfigs);
router.get('/:key', protect, authorizeHomework(), systemConfigController.getConfig);
router.put('/:key', protect, authorizeHomework(), systemConfigController.updateConfig);

module.exports = router;
