const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');
const { protect, authorizeHomework } = require('../middleware/auth');

router.get('/language/:languageId', protect, levelController.getLevelsByLanguage);
router.post('/', protect, authorizeHomework(), levelController.createLevel);
router.put('/:id', protect, authorizeHomework(), levelController.updateLevel);
router.delete('/:id', protect, authorizeHomework(), levelController.deleteLevel);

module.exports = router;
