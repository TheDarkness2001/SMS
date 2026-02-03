const Branch = require('../models/Branch');

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private (Founder, Admin, Manager)
exports.getAllBranches = async (req, res) => {
  try {
    console.log('[BRANCHES] Request user:', { id: req.user?._id, role: req.user?.role });
    
    // Only founders, admins, and managers can access branches
    if (!['founder', 'admin', 'manager'].includes(req.user.role)) {
      console.log('[BRANCHES] Access denied for role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only founders, admins, and managers can view branches.'
      });
    }

    const branches = await Branch.find()
      .populate('createdBy', 'name email')
      .sort('createdAt');
    
    console.log('[BRANCHES] Found branches:', branches.length);

    res.status(200).json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.log('[BRANCHES] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private (Founder only)
exports.getBranch = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only founders can view branches.'
      });
    }

    const branch = await Branch.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create branch
// @route   POST /api/branches
// @access  Private (Founder only)
exports.createBranch = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only founders can create branches.'
      });
    }

    const { name, address, phone } = req.body;

    // Check if branch name already exists
    const existingBranch = await Branch.findOne({ name });
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Branch with this name already exists'
      });
    }

    const branch = await Branch.create({
      name,
      address,
      phone,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: branch,
      message: 'Branch created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update branch
// @route   PUT /api/branches/:id
// @access  Private (Founder only)
exports.updateBranch = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only founders can update branches.'
      });
    }

    const { name, address, phone, isActive } = req.body;

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== branch.name) {
      const existingBranch = await Branch.findOne({ name });
      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: 'Branch with this name already exists'
        });
      }
    }

    branch.name = name || branch.name;
    branch.address = address || branch.address;
    branch.phone = phone || branch.phone;
    if (typeof isActive !== 'undefined') {
      branch.isActive = isActive;
    }

    await branch.save();

    res.status(200).json({
      success: true,
      data: branch,
      message: 'Branch updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private (Founder only)
exports.deleteBranch = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only founders can delete branches.'
      });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check if branch has associated data
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    const Payment = require('../models/Payment');
    
    const [studentCount, teacherCount, paymentCount] = await Promise.all([
      Student.countDocuments({ branchId: req.params.id }),
      Teacher.countDocuments({ branchId: req.params.id }),
      Payment.countDocuments({ branchId: req.params.id })
    ]);
    
    if (studentCount > 0 || teacherCount > 0 || paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with existing data. Please deactivate instead.'
      });
    }

    await branch.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get branch statistics
// @route   GET /api/branches/:id/stats
// @access  Private (Founder only)
exports.getBranchStats = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    const Payment = require('../models/Payment');
    
    const [studentCount, teacherCount, totalRevenue] = await Promise.all([
      Student.countDocuments({ branchId: req.params.id }),
      Teacher.countDocuments({ branchId: req.params.id }),
      Payment.aggregate([
        { $match: { branchId: mongoose.Types.ObjectId(req.params.id), status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        students: studentCount,
        teachers: teacherCount,
        revenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
