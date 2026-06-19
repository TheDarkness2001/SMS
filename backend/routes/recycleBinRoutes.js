const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const recycleBinController = require('../controllers/recycleBinController');

router.use(protect);
router.use(authorize('admin', 'founder', 'manager'));

router.get('/', recycleBinController.listRecycleBin);
router.get('/snapshots', recycleBinController.listSnapshots);
router.post('/restore/:id', recycleBinController.restoreItem);
router.post('/purge/:id', recycleBinController.purgeItem);

module.exports = router;
