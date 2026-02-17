// Middleware to enforce branch isolation for all staff users
// Founders have access to all branches
// All other users can only access their assigned branch data

const enforceBranchIsolation = (req, res, next) => {
  try {
    // Founder has global access - no filtering needed
    if (req.user.role === 'founder') {
      return next();
    }

    // Students don't need branch isolation - they see their own data
    if (req.user.role === 'student') {
      return next();
    }

    // Staff must have a branchId
    if (!req.user.branchId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. No branch assigned to your account.'
      });
    }

    // Check if branch is active
    const Branch = require('../models/Branch');
    Branch.findById(req.user.branchId).then(branch => {
      if (!branch || !branch.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Your branch is inactive.'
        });
      }

      // Auto-inject branchId into query params for GET requests (except for students viewing their own data)
      if (req.method === 'GET' && req.user.role !== 'student') {
        req.query.branchId = req.user.branchId;
      }

      // Auto-inject branchId into body for POST/PUT requests
      if (req.method === 'POST' || req.method === 'PUT') {
        req.body.branchId = req.user.branchId;
      }

      next();
    }).catch(err => {
      return res.status(500).json({
        success: false,
        message: 'Error checking branch status'
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Middleware to add branch filter to database queries
const addBranchFilter = (Model) => {
  return (req, res, next) => {
    // Skip for founders
    if (req.user.role === 'founder') {
      return next();
    }

    // Add branchId filter to query
    const originalFind = Model.find;
    const originalFindOne = Model.findOne;
    const originalCountDocuments = Model.countDocuments;

    Model.find = function(conditions, ...args) {
      if (req.user.branchId) {
        conditions = conditions || {};
        conditions.branchId = req.user.branchId;
      }
      return originalFind.call(this, conditions, ...args);
    };

    Model.findOne = function(conditions, ...args) {
      if (req.user.branchId) {
        conditions = conditions || {};
        conditions.branchId = req.user.branchId;
      }
      return originalFindOne.call(this, conditions, ...args);
    };

    Model.countDocuments = function(conditions, ...args) {
      if (req.user.branchId) {
        conditions = conditions || {};
        conditions.branchId = req.user.branchId;
      }
      return originalCountDocuments.call(this, conditions, ...args);
    };

    next();
  };
};

module.exports = {
  enforceBranchIsolation,
  addBranchFilter
};
