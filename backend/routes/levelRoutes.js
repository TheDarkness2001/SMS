const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');
const { protect, authorize } = require('../middleware/auth');

router.get('/language/:languageId', protect, levelController.getLevelsByLanguage);
router.post('/', protect, authorize('admin', 'manager', 'founder'), levelController.createLevel);
router.put('/:id', protect, authorize('admin', 'manager', 'founder'), levelController.updateLevel);
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), levelController.deleteLevel);

module.exports = router;
