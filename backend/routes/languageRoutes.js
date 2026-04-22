const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');
const { protect, authorizeHomework } = require('../middleware/auth');

router.get('/', protect, languageController.getAllLanguages);
router.post('/', protect, authorizeHomework(), languageController.createLanguage);
router.put('/:id', protect, authorizeHomework(), languageController.updateLanguage);
router.delete('/:id', protect, authorizeHomework(), languageController.deleteLanguage);

module.exports = router;
