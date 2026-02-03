const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getStudentPayments,
  handlePartialPayment
} = require('../controllers/paymentController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

router.route('/')
  .get(protect, checkPermission('canViewPayments'), enforceBranchIsolation, getPayments)
  .post(protect, checkPermission('canManagePayments'), enforceBranchIsolation, createPayment);

router.post('/partial', protect, checkPermission('canManagePayments'), enforceBranchIsolation, handlePartialPayment);

router.get('/student/:studentId', protect, enforceBranchIsolation, getStudentPayments);

router.route('/:id')
  .get(protect, checkPermission('canViewPayments'), enforceBranchIsolation, getPayment)
  .put(protect, checkPermission('canManagePayments'), enforceBranchIsolation, updatePayment)
  .delete(protect, checkPermission('canManagePayments'), enforceBranchIsolation, deletePayment);

module.exports = router;