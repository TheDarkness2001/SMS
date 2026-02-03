const express = require('express');
const router = express.Router();
const {
  getRevenue,
  getPendingPayments,
  getRevenueStats
} = require('../controllers/revenueController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

router.get('/', protect, checkPermission('canViewRevenue'), enforceBranchIsolation, getRevenue);
router.get('/pending', protect, checkPermission('canViewRevenue'), enforceBranchIsolation, getPendingPayments);
router.get('/stats', protect, checkPermission('canViewRevenue'), enforceBranchIsolation, getRevenueStats);

module.exports = router;
