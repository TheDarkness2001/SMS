const Exam = require('../models/Exam');
const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const ClassSchedule = require('../models/ClassSchedule');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
exports.getExams = async (req, res) => {
  try {
    const { class: examClass, subject, status, startDate, endDate, includeArchived, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    if (examClass) query.class = examClass;
    if (subject) query.subject = subject;
    if (status) query.status = status;
    
    // By default, exclude archived exams unless explicitly requested
    if (!includeArchived || includeArchived === 'false') {
      query.status = query.status || { $ne: 'archived' };
    }
    
    if (startDate && endDate) {
      query.examDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const exams = await Exam.find(query)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class')
      .sort('-examDate');

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private
exports.createExam = async (req, res) => {
  try {
    const examData = {
      ...req.body,
      teacher: req.body.teacher || req.user._id,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    };

    const exam = await Exam.create(examData);

    // Auto-enroll students from the schedule if scheduleId is provided
    if (req.body.scheduleId) {
      try {
        const schedule = await ClassSchedule.findById(req.body.scheduleId)
          .populate('enrolledStudents', 'name studentId profileImage');
        
        if (schedule && schedule.enrolledStudents && schedule.enrolledStudents.length > 0) {
          // Add all enrolled students from the schedule to exam results
          schedule.enrolledStudents.forEach(student => {
            exam.results.push({
              student: student._id,
              marksObtained: 0,
              grade: '',
              remarks: '',
              enrollmentStatus: 'enrolled'
            });
          });
          
          await exam.save();
        }
      } catch (scheduleError) {
        console.error('Error auto-enrolling students:', scheduleError);
        // Continue even if auto-enrollment fails
      }
    }

    // Populate and return the exam with enrolled students
    const populatedExam = await Exam.findById(exam._id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class');

    res.status(201).json({
      success: true,
      data: populatedExam,
      message: req.body.scheduleId ? `Exam created with ${populatedExam.results.length} students auto-enrolled` : 'Exam created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('teacher', 'name email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add exam results
// @route   POST /api/exams/:id/results
// @access  Private
exports.addResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    exam.results.push(req.body);
    await exam.save();
    
    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll students in exam based on subject matching
// @route   POST /api/exams/:id/enroll-students
// @access  Private
exports.enrollStudents = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find students in the same class as the exam
    const students = await Student.find({ 
      class: exam.class,
      status: 'active'
    });
    
    // Filter students who have the same subject
    const enrolledStudents = students.filter(student => 
      student.subjects && student.subjects.includes(exam.subject)
    );
    
    // Add enrolled students to exam results with default values
    enrolledStudents.forEach(student => {
      // Check if student is already enrolled
      const existingResult = exam.results.find(result => 
        result.student && result.student.toString() === student._id.toString()
      );
      
      if (!existingResult) {
        exam.results.push({
          student: student._id,
          marksObtained: 0,
          grade: '',
          remarks: '',
          enrollmentStatus: 'enrolled' // Default status when enrolled
        });
      }
    });
    
    await exam.save();
    
    // Populate student details
    const populatedExam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email subjects');
    
    res.status(200).json({
      success: true,
      message: `${enrolledStudents.length} students enrolled successfully`,
      data: populatedExam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update student enrollment status
// @route   PUT /api/exams/:id/results/:studentId/status
// @access  Private
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentStatus, remarks } = req.body;
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Find the result for the specific student
    const resultIndex = exam.results.findIndex(result => 
      result.student && result.student.toString() === req.params.studentId
    );
    
    if (resultIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in exam results'
      });
    }
    
    // Update the enrollment status
    exam.results[resultIndex].enrollmentStatus = enrollmentStatus;
    if (remarks) {
      exam.results[resultIndex].remarks = remarks;
    }
    
    await exam.save();
    
    // Populate student details
    const populatedExam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email subjects');
    
    res.status(200).json({
      success: true,
      data: populatedExam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Manually add a student to an exam
// @route   POST /api/exams/:id/add-student
// @access  Private
exports.addStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check if student is already enrolled
    const existingResult = exam.results.find(result => 
      result.student && result.student.toString() === studentId
    );
    
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this exam'
      });
    }
    
    // Add student to exam results
    exam.results.push({
      student: studentId,
      marksObtained: 0,
      grade: '',
      remarks: '',
      enrollmentStatus: 'enrolled'
    });
    
    await exam.save();
    
    // Populate student details
    const populatedExam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email subjects');
    
    res.status(200).json({
      success: true,
      message: 'Student added to exam successfully',
      data: populatedExam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove a student from an exam
// @route   DELETE /api/exams/:id/remove-student/:studentId
// @access  Private
exports.removeStudent = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Filter out the student from results
    exam.results = exam.results.filter(result => 
      !result.student || result.student.toString() !== req.params.studentId
    );
    
    await exam.save();
    
    // Populate student details
    const populatedExam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email subjects');
    
    res.status(200).json({
      success: true,
      message: 'Student removed from exam successfully',
      data: populatedExam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update exam result for a student
// @route   PUT /api/exams/:id/results/:studentId
// @access  Private
exports.updateResult = async (req, res) => {
  try {
    const { marksObtained, grade, remarks } = req.body;
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check if student is eligible for the exam
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // If student is not eligible due to consecutive absences, deny entry
    if (student.examEligibility === false) {
      return res.status(403).json({
        success: false,
        message: 'Student is not eligible for this exam due to 3+ consecutive absences'
      });
    }
    
    // Find the result for the specific student
    const resultIndex = exam.results.findIndex(result => 
      result.student && result.student.toString() === req.params.studentId
    );
    
    if (resultIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in exam results'
      });
    }
    
    // Update the result
    exam.results[resultIndex].marksObtained = marksObtained;
    exam.results[resultIndex].grade = grade;
    exam.results[resultIndex].remarks = remarks;
    
    await exam.save();
    
    // Check if all students have marks - if yes, auto-archive the exam
    const allStudentsHaveMarks = exam.results.every(result => 
      result.marksObtained !== undefined && result.marksObtained !== null && result.marksObtained >= 0
    );
    
    if (allStudentsHaveMarks && exam.results.length > 0) {
      exam.status = 'archived';
      await exam.save();
      console.log(`✅ Exam "${exam.examName}" auto-archived - all marks have been entered`);
    }
    
    // Also update the student's exam results record
    const studentId = req.params.studentId;
    
    if (student) {
      // Check if this exam result already exists in student record
      const existingExamResultIndex = student.examResults.findIndex(er => 
        er.exam && er.exam.toString() === exam._id.toString()
      );
      
      const examResultData = {
        exam: exam._id,
        examName: exam.examName,
        subject: exam.subject,
        marksObtained: marksObtained,
        totalMarks: exam.totalMarks,
        grade: grade,
        status: marksObtained >= exam.passingMarks ? 'pass' : 'fail'
      };
      
      if (existingExamResultIndex !== -1) {
        // Update existing exam result
        student.examResults[existingExamResultIndex] = examResultData;
      } else {
        // Add new exam result
        student.examResults.push(examResultData);
      }
      
      await student.save();
    }
    
    // Populate student details
    const populatedExam = await Exam.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('results.student', 'name studentId class email subjects');
    
    res.status(200).json({
      success: true,
      data: populatedExam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark absent students as failed automatically
// @route   POST /api/exams/:id/mark-absent-failed
// @access  Private
exports.markAbsentFailed = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    let updatedCount = 0;
    
    // For students with 0 marks and no grade, mark as failed
    for (let i = 0; i < exam.results.length; i++) {
      const result = exam.results[i];
      
      // Check if student is eligible for the exam
      const student = await Student.findById(result.student);
      if (student && student.examEligibility === false) {
        // Skip ineligible students
        continue;
      }
      
      if (result.marksObtained === 0 && !result.grade) {
        result.grade = 'F';
        result.remarks = 'Absent - Marked as Failed';
        updatedCount++;
        
        // Also update the student's exam results record
        if (result.student) {
          const student = await Student.findById(result.student);
          
          if (student) {
            // Check if this exam result already exists in student record
            const existingExamResultIndex = student.examResults.findIndex(er => 
              er.exam && er.exam.toString() === exam._id.toString()
            );
            
            const examResultData = {
              exam: exam._id,
              examName: exam.examName,
              subject: exam.subject,
              marksObtained: 0,
              totalMarks: exam.totalMarks,
              grade: 'F',
              status: 'fail'
            };
            
            if (existingExamResultIndex !== -1) {
              // Update existing exam result
              student.examResults[existingExamResultIndex] = examResultData;
            } else {
              // Add new exam result
              student.examResults.push(examResultData);
            }
            
            await student.save();
          }
        }
      }
    }
    
    await exam.save();
    
    res.status(200).json({
      success: true,
      message: `${updatedCount} absent students marked as failed`,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get exams for a specific student
// @route   GET /api/exams/student/:studentId
// @access  Private
exports.getStudentExams = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Find all exams where this student is in the results array
    const exams = await Exam.find({
      'results.student': studentId
    })
    .populate('teacher', 'name email')
    .sort('-examDate');
    
    // Transform exams to include student's specific result
    const studentExams = exams.map(exam => {
      const studentResult = exam.results.find(
        r => r.student && r.student.toString() === studentId
      );
      
      return {
        _id: exam._id,
        examName: exam.examName,
        subject: exam.subject,
        class: exam.class,
        examDate: exam.examDate,
        startTime: exam.startTime,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        examType: exam.examType,
        status: exam.status,
        teacher: exam.teacher,
        result: studentResult ? {
          marksObtained: studentResult.marksObtained,
          grade: studentResult.grade,
          remarks: studentResult.remarks,
          enrollmentStatus: studentResult.enrollmentStatus
        } : null
      };
    });
    
    res.status(200).json({
      success: true,
      count: studentExams.length,
      data: studentExams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};