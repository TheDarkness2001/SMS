const ExamGroup = require('../models/ExamGroup');
const Student = require('../models/Student');
const ClassSchedule = require('../models/ClassSchedule');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const Language = require('../models/Language');

// @desc    Get all exam groups
// @route   GET /api/exam-groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    const { branchId } = req.query;
    
    console.log('[ExamGroupController] getGroups called');
    console.log('[ExamGroupController] User:', { role: userRole, id: userId, branchId: req.user.branchId });
    console.log('[ExamGroupController] Query params:', req.query);
    
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch - strict match only
      query.branchId = branchId;
    }

    // For students, show only groups they are enrolled in
    if (req.userType === 'student' || userRole === 'student') {
      query.students = { $in: [userId, userId.toString()] };
      const groups = await ExamGroup.find(query)
        .populate('subject', 'name code')
        .select('groupName subjectName subject');
      return res.status(200).json({
        success: true,
        count: groups.length,
        data: groups,
        filter: 'student-enrolled'
      });
    }

    // For teachers, show only groups they are assigned to
    if (userRole === 'teacher') {
      console.log('[ExamGroupController] Teacher userId:', userId, 'type:', typeof userId);
      console.log('[ExamGroupController] Query branchId:', query.branchId);
      
      // First, find schedules assigned to this teacher
      // Use both ObjectId and string forms for matching
      const scheduleQuery = {
        $or: [
          { teacher: userId },
          { teacher: userId.toString() }
        ]
      };
      if (query.branchId) {
        scheduleQuery.branchId = query.branchId;
      }
      
      console.log('[ExamGroupController] Schedule query:', JSON.stringify(scheduleQuery));
      
      const teacherSchedules = await ClassSchedule.find(scheduleQuery).select('subjectGroup');
      
      console.log('[ExamGroupController] Found schedules:', teacherSchedules.length);
      console.log('[ExamGroupController] Schedule details:', teacherSchedules.map(s => ({ 
        _id: s._id, 
        subjectGroup: s.subjectGroup,
        subjectGroupType: typeof s.subjectGroup 
      })));
      
      // Get exam group IDs from those schedules
      const examGroupIdsFromSchedules = teacherSchedules
        .filter(s => s.subjectGroup)
        .map(s => s.subjectGroup.toString());
      
      console.log('[ExamGroupController] Exam group IDs from schedules:', examGroupIdsFromSchedules);
      
      // Build query to find:
      // 1. Groups where teacher is directly in teachers array
      // 2. Groups that have schedules assigned to this teacher
      const teacherQuery = {
        ...query,
        $or: [
          { teachers: { $in: [userId, userId.toString()] } },
          ...(examGroupIdsFromSchedules.length > 0 ? [{ _id: { $in: examGroupIdsFromSchedules } }] : [])
        ]
      };
      
      console.log('[ExamGroupController] Teacher query:', JSON.stringify(teacherQuery));
      
      // First, let's see ALL groups in the database
      const allGroups = await ExamGroup.find({ branchId: query.branchId });
      console.log('[ExamGroupController] Total groups in branch:', allGroups.length);
      
      if (allGroups.length > 0) {
        console.log('[ExamGroupController] Sample group teachers field:', allGroups[0].teachers);
        console.log('[ExamGroupController] Sample group teachers types:', allGroups[0].teachers?.map(t => typeof t));
      }
      
      const groups = await ExamGroup.find(teacherQuery)
        .populate('students', 'name studentId profileImage class')
        .populate('teachers', 'name teacherId')
        .populate('createdBy', 'name');

      // Clean duplicates in students array for each group
      let cleaned = false;
      for (let group of groups) {
        const originalLength = group.students.length;
        const uniqueStudentIds = [...new Set(group.students.map(s => s._id.toString()))];
        
        if (originalLength !== uniqueStudentIds.length) {
          console.log(`[ExamGroupController] Cleaning duplicates in group ${group.groupName}: ${originalLength} -> ${uniqueStudentIds.length}`);
          group.students = uniqueStudentIds;
          await group.save();
          // Re-populate after save
          await group.populate('students', 'name studentId profileImage class');
          cleaned = true;
        }
      }

      console.log('[ExamGroupController] Groups found for teacher:', groups.length);
      if (cleaned) {
        console.log('[ExamGroupController] Auto-cleaned duplicate students');
      }
      if (groups.length > 0) {
        console.log('[ExamGroupController] First group:', {
          name: groups[0].groupName,
          teachers: groups[0].teachers,
          students: groups[0].students?.length
        });
      }

      return res.status(200).json({
        success: true,
        count: groups.length,
        data: groups,
        filter: 'teacher-assigned'
      });
    }
    
    // For managers, founders, admins - show all groups
    let groups = await ExamGroup.find(query)
      .populate('students', 'name studentId profileImage class')
      .populate('teachers', 'name teacherId')
      .populate('createdBy', 'name')
      .populate('subject', 'name code pricePerClass');

    // If lessonType filter requested, only show groups whose subject has lessons
    const { lessonType } = req.query;
    if (lessonType) {
      const lessonFilter = {};
      if (lessonType === 'sentences') {
        lessonFilter.type = 'sentences';
      } else if (lessonType === 'words') {
        lessonFilter.$or = [{ type: 'words' }, { type: { $exists: false } }];
      }
      const lessons = await Lesson.find(lessonFilter).select('levelId').lean();
      const levelIds = [...new Set(lessons.map(l => l.levelId.toString()))];

      if (levelIds.length > 0) {
        const levels = await Level.find({ _id: { $in: levelIds } }).select('languageId').lean();
        const languageIds = [...new Set(levels.map(l => l.languageId.toString()))];

        const languages = await Language.find({ _id: { $in: languageIds } }).select('name').lean();
        const languageNamesWithLessons = new Set(languages.map(l => l.name.toLowerCase().trim()));

        groups = groups.filter(group => {
          const groupSubject = (group.subjectName || group.groupName || group.subject?.name || '').toLowerCase().trim();
          // Flexible match: exact match OR language name is contained in group subject OR vice versa
          for (const langName of languageNamesWithLessons) {
            if (groupSubject === langName || groupSubject.includes(langName) || langName.includes(groupSubject)) {
              return true;
            }
          }
          return false;
        });
      } else {
        // No lessons of this type exist at all, hide all groups
        groups = [];
      }
    }

    // Clean duplicates in students array for each group
    let cleaned = false;
    for (let group of groups) {
      const originalLength = group.students.length;
      const uniqueStudentIds = [...new Set(group.students.map(s => s._id.toString()))];

      if (originalLength !== uniqueStudentIds.length) {
        console.log(`[ExamGroupController] Auto-cleaning duplicates in group ${group.groupName}: ${originalLength} -> ${uniqueStudentIds.length}`);
        group.students = uniqueStudentIds;
        await group.save();
        // Re-populate after save
        await group.populate('students', 'name studentId profileImage class');
        cleaned = true;
      }
    }

    if (cleaned) {
      console.log('[ExamGroupController] Auto-cleaned duplicate students in admin view');
    }

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups,
      filter: 'all'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single exam group
// @route   GET /api/exam-groups/:id
// @access  Private
exports.getGroup = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id)
      .populate('students', 'name studentId profileImage email class')
      .populate('teachers', 'name teacherId email')
      .populate('createdBy', 'name')
      .populate('subject', 'name code pricePerClass');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create exam group
// @route   POST /api/exam-groups
// @access  Private/Admin
exports.createGroup = async (req, res) => {
  try {
    // Validate that at least one teacher is assigned
    if (!req.body.teachers || req.body.teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one teacher must be assigned to the group'
      });
    }

    // Remove duplicate students
    const uniqueStudents = req.body.students ? [...new Set(req.body.students)] : [];
    
    console.log('[ExamGroupController] Creating group');
    console.log('[ExamGroupController] Original students:', req.body.students?.length);
    console.log('[ExamGroupController] Unique students:', uniqueStudents.length);
    console.log('[ExamGroupController] Teachers:', req.body.teachers);

    // Get subject details to set subjectName
    let subjectName = '';
    if (req.body.subject) {
      const subjectDoc = await Subject.findById(req.body.subject);
      if (subjectDoc) {
        subjectName = subjectDoc.name;
      }
    }

    const group = await ExamGroup.create({
      ...req.body,
      students: uniqueStudents,
      subjectName: subjectName,
      createdBy: req.user._id,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    });

    await group.populate('students', 'name studentId profileImage class');
    await group.populate('teachers', 'name teacherId');
    await group.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update exam group
// @route   PUT /api/exam-groups/:id
// @access  Private/Admin
exports.updateGroup = async (req, res) => {
  try {
    let group = await ExamGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Remove duplicate students
    if (req.body.students) {
      req.body.students = [...new Set(req.body.students)];
      console.log('[ExamGroupController] Updating group - unique students:', req.body.students.length);
    }
    
    if (req.body.teachers) {
      console.log('[ExamGroupController] Updating group - teachers being saved:', req.body.teachers);
      console.log('[ExamGroupController] Teachers count:', req.body.teachers.length);
      console.log('[ExamGroupController] Teachers types:', req.body.teachers.map(t => typeof t));
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        group[key] = req.body[key];
      }
    });

    // Update subjectName if subject changed
    if (req.body.subject && req.body.subject !== group.subject?.toString()) {
      const subjectDoc = await Subject.findById(req.body.subject);
      if (subjectDoc) {
        group.subjectName = subjectDoc.name;
      }
    }

    await group.save();
    await group.populate('students', 'name studentId profileImage class');
    await group.populate('teachers', 'name teacherId');
    await group.populate('createdBy', 'name');
    await group.populate('subject', 'name code pricePerClass');

    // AUTO-SYNC: Update linked schedules
    try {
      const linkedSchedule = await ClassSchedule.findOne({ subjectGroup: req.params.id });
      
      if (linkedSchedule) {
        console.log('🔄 Auto-syncing schedule for group:', group.groupName);
        
        // Get first teacher from group
        const firstTeacherId = group.teachers && group.teachers.length > 0 
          ? (group.teachers[0]._id || group.teachers[0])
          : linkedSchedule.teacher;
        
        // Get teacher name
        let teacherName = linkedSchedule.teacherName;
        if (firstTeacherId) {
          const teacher = await Teacher.findById(firstTeacherId);
          if (teacher) {
            teacherName = teacher.name;
          }
        }
        
        // Get subject details for schedule sync
        let subjectRef = linkedSchedule.subjectRef;
        let subjectName = group.subjectName || group.groupName;
        if (group.subject && group.subject._id) {
          subjectRef = group.subject._id;
          subjectName = group.subject.name;
        }
        
        // Update schedule with group data
        linkedSchedule.className = group.class || linkedSchedule.className;
        linkedSchedule.subject = subjectName;
        linkedSchedule.subjectRef = subjectRef;
        linkedSchedule.enrolledStudents = group.students || linkedSchedule.enrolledStudents;
        linkedSchedule.teacher = firstTeacherId;
        linkedSchedule.teacherName = teacherName;
        linkedSchedule.startTime = group.startTime || linkedSchedule.startTime;
        linkedSchedule.endTime = group.endTime || linkedSchedule.endTime;
        
        await linkedSchedule.save();
        console.log('✅ Schedule auto-synced successfully');
      }
    } catch (syncError) {
      console.error('⚠️  Schedule auto-sync failed:', syncError.message);
      // Don't fail the group update if sync fails
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete exam group
// @route   DELETE /api/exam-groups/:id
// @access  Private/Admin
exports.deleteGroup = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Check if there's a linked schedule
    const linkedSchedule = await ClassSchedule.findOne({ subjectGroup: req.params.id });
    
    if (linkedSchedule) {
      console.log('⚠️  Deleting group with linked schedule:', group.groupName);
      // Delete the linked schedule as well
      await ClassSchedule.findByIdAndDelete(linkedSchedule._id);
      console.log('✅ Linked schedule deleted');
    }

    await ExamGroup.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: linkedSchedule 
        ? 'Exam group and linked schedule deleted successfully'
        : 'Exam group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add student to group
// @route   POST /api/exam-groups/:id/students
// @access  Private/Admin
exports.addStudentToGroup = async (req, res) => {
  try {
    const { studentId } = req.body;
    const group = await ExamGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Check if student already in group
    if (group.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student already in this group'
      });
    }

    group.students.push(studentId);
    await group.save();
    await group.populate('students', 'name studentId profileImage email class');
    await group.populate('teachers', 'name teacherId');

    // AUTO-SYNC: Update linked class schedule with new student
    try {
      const linkedSchedule = await ClassSchedule.findOne({ subjectGroup: req.params.id });
      
      if (linkedSchedule) {
        console.log('🔄 Auto-syncing schedule - adding student:', studentId);
        
        // Add student to schedule's enrolledStudents if not already there
        if (!linkedSchedule.enrolledStudents.includes(studentId)) {
          linkedSchedule.enrolledStudents.push(studentId);
          await linkedSchedule.save();
          console.log('✅ Student added to class schedule successfully');
        }
      }
    } catch (syncError) {
      console.error('⚠️  Schedule auto-sync failed:', syncError.message);
      // Don't fail the group update if sync fails
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove student from group
// @route   DELETE /api/exam-groups/:id/students/:studentId
// @access  Private/Admin
exports.removeStudentFromGroup = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    const removedStudentId = req.params.studentId;
    group.students = group.students.filter(id => id.toString() !== removedStudentId);
    await group.save();
    await group.populate('students', 'name studentId profileImage email class');

    // AUTO-SYNC: Update linked class schedule - remove student
    try {
      const linkedSchedule = await ClassSchedule.findOne({ subjectGroup: req.params.id });
      
      if (linkedSchedule) {
        console.log('🔄 Auto-syncing schedule - removing student:', removedStudentId);
        
        // Remove student from schedule's enrolledStudents
        linkedSchedule.enrolledStudents = linkedSchedule.enrolledStudents.filter(
          id => id.toString() !== removedStudentId
        );
        await linkedSchedule.save();
        console.log('✅ Student removed from class schedule successfully');
      }
    } catch (syncError) {
      console.error('⚠️  Schedule auto-sync failed:', syncError.message);
      // Don't fail the group update if sync fails
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
