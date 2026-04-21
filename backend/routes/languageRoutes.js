const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, languageController.getAllLanguages);
router.post('/', protect, authorize('admin', 'manager', 'founder'), languageController.createLanguage);
router.put('/:id', protect, authorize('admin', 'manager', 'founder'), languageController.updateLanguage);
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), languageController.deleteLanguage);

module.exports = router;
