const Timetable = require('../models/Timetable');

// @desc    Get all timetables
// @route   GET /api/timetable
// @access  Private
exports.getTimetables = async (req, res) => {
  try {
    const { class: className, section, academicYear, term, dayOfWeek, branchId } = req.query;
    let query = { isActive: true };

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    // SECURITY: Teachers can only see timetables where they teach
    if (req.isTeacherRestricted) {
      query['periods.teacher'] = req.user._id;
      console.log(`✅ Teacher ${req.user._id} restricted to own timetable`);
    }

    if (className) query.class = className;
    if (section) query.section = section;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;

    const timetables = await Timetable.find(query)
      .populate('periods.teacher', 'name email subject')
      .sort('dayOfWeek');

    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single timetable
// @route   GET /api/timetable/:id
// @access  Private
exports.getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('periods.teacher', 'name email subject phone');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new timetable
// @route   POST /api/timetable
// @access  Private (with permission)
exports.createTimetable = async (req, res) => {
  try {
    const timetableData = {
      ...req.body,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    };
    const timetable = await Timetable.create(timetableData);

    res.status(201).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update timetable
// @route   PUT /api/timetable/:id
// @access  Private (with permission)
exports.updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('periods.teacher', 'name email');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete timetable
// @route   DELETE /api/timetable/:id
// @access  Private (with permission)
exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get teacher's timetable
// @route   GET /api/timetable/teacher/:teacherId
// @access  Private
exports.getTeacherTimetable = async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    let query = { 'periods.teacher': req.params.teacherId, isActive: true };

    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const timetables = await Timetable.find(query)
      .populate('periods.teacher', 'name email')
      .sort('dayOfWeek');

    res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
