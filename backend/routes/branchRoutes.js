const express = require('express');
const router = express.Router();
const {
  getAllBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
} = require('../controllers/branchController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getAllBranches)
  .post(createBranch);

router.route('/:id')
  .get(getBranch)
  .put(updateBranch)
  .delete(deleteBranch);

router.get('/:id/stats', getBranchStats);

module.exports = router;
