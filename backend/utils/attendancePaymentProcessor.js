const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const walletService = require('../services/walletService');
const teacherEarningService = require('../services/teacherEarningService');

class AttendancePaymentProcessor {
  // Process attendance and apply appropriate financial actions
  async processAttendanceForPayment(classId, attendanceRecords) {
    const classRecord = await Class.findById(classId).populate('teacherId subjectId');
    if (!classRecord) {
      throw new Error('Class not found');
    }

    const results = [];

    for (const record of attendanceRecords) {
      const student = await Student.findById(record.studentId);
      if (!student) {
        results.push({ studentId: record.studentId, status: 'student_not_found', error: 'Student not found' });
        continue;
      }

      // Update the class record with attendance status
      const studentIndex = classRecord.students.findIndex(s => s.studentId.toString() === record.studentId.toString());
      if (studentIndex !== -1) {
        classRecord.students[studentIndex].attendanceStatus = record.isPresent ? 'present' : 'absent';
      } else {
        // Add student to class if not already present
        classRecord.students.push({
          studentId: record.studentId,
          attendanceStatus: record.isPresent ? 'present' : 'absent'
        });
      }

      const attendanceStatus = record.isPresent ? 'present' : 'absent';
      
      if (attendanceStatus === 'absent') {
        // Student absent - apply penalty
        await this.handleStudentAbsent(classRecord, student, record.recordedBy);
      } else if (record.isTeacherAbsent) {
        // Teacher absent - apply teacher penalty
        await this.handleTeacherAbsent(classRecord, record.recordedBy);
      } else if (record.isCanceled) {
        // Class canceled - no financial action
        await this.handleClassCanceled(classRecord, student);
      } else {
        // Class completed normally - process deduction and earning
        await this.handleClassCompleted(classRecord, student, record.recordedBy);
      }

      results.push({
        studentId: record.studentId,
        status: 'processed',
        action: attendanceStatus === 'absent' ? 'penalty_applied' : 
                record.isTeacherAbsent ? 'teacher_penalty_applied' :
                record.isCanceled ? 'no_action_taken' : 'class_deducted'
      });
    }

    // Save the updated class record
    await classRecord.save();

    return results;
  }

  // Handle student absent scenario
  async handleStudentAbsent(classRecord, student, recordedBy) {
    // Get per-class price (student-specific or subject default)
    const perClassPrice = student.perClassPrices?.[classRecord.subjectId._id.toString()] || 
                         classRecord.subjectId.pricePerClass || 0;

    if (perClassPrice <= 0) {
      throw new Error(`No price defined for subject ${classRecord.subjectId.name}`);
    }

    // Apply penalty = 2x per-class amount
    const penaltyAmount = perClassPrice * 2;

    await walletService.applyStudentPenalty(
      student._id,
      penaltyAmount,
      `Penalty for absent on ${classRecord.date.toISOString().split('T')[0]} in ${classRecord.subjectId.name}`,
      recordedBy,
      'admin' // Assuming admin/receptionist records this
    );

    return { penaltyApplied: true, amount: penaltyAmount };
  }

  // Handle teacher absent scenario
  async handleTeacherAbsent(classRecord, recordedBy) {
    // Get teacher's per-class earning
    const teacher = await Teacher.findById(classRecord.teacherId);
    if (!teacher || !teacher.perClassEarning) {
      throw new Error(`No earning rate defined for teacher ${teacher.name}`);
    }

    // Apply penalty = 5x teacher's per-class earning
    const penaltyAmount = teacher.perClassEarning * 5;

    await teacherEarningService.applyTeacherPenalty(
      classRecord.teacherId,
      penaltyAmount,
      `Penalty for absent on ${classRecord.date.toISOString().split('T')[0]} in ${classRecord.subjectId.name}`,
      recordedBy
    );

    return { penaltyApplied: true, amount: penaltyAmount };
  }

  // Handle class canceled scenario
  async handleClassCanceled(classRecord, student) {
    // No financial action needed - neither student charged nor teacher paid
    return { noAction: true };
  }

  // Handle completed class scenario
  async handleClassCompleted(classRecord, student, recordedBy) {
    // Process class deduction from student wallet
    await walletService.deductClassFee(
      classRecord._id,
      student._id,
      recordedBy,
      'admin' // Assuming admin/receptionist records this
    );

    // AUTO-GENERATE staff earning after payment confirmed
    // This creates a pending earning that requires admin approval
    try {
      await teacherEarningService.createEarningForClass(
        classRecord._id,
        classRecord.teacherId,
        student._id, // Student who attended
        recordedBy,
        'system' // Automatically generated
      );
    } catch (error) {
      // If earning already exists, log but don't fail the attendance
      if (error.message.includes('already exists')) {
        console.log(`Earning already exists for class ${classRecord._id}`);
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    return { deductionProcessed: true, earningCreated: true };
  }

  // Get student's per-class price for a specific subject
  async getStudentPerClassPrice(studentId, subjectId) {
    const student = await Student.findById(studentId);
    const subject = await Subject.findById(subjectId);

    if (!student || !subject) {
      throw new Error('Student or subject not found');
    }

    // Return student-specific price or subject default price
    return student.perClassPrices?.[subjectId.toString()] || subject.pricePerClass || 0;
  }

  // Validate if student has sufficient balance for upcoming class
  async validateStudentBalanceForClass(studentId, subjectId) {
    const price = await this.getStudentPerClassPrice(studentId, subjectId);
    
    // Get wallet with updated balance structure
    const wallet = await walletService.getOrCreateWallet(studentId, 'student');
    
    // Check if wallet is locked
    if (wallet.isLocked) {
      return {
        hasSufficientBalance: false,
        requiredAmount: price,
        availableBalance: wallet.availableBalance,
        totalBalance: wallet.balance,
        error: `Wallet is locked: ${wallet.lockReason}`
      };
    }
    
    // Check available balance + grace balance
    const effectiveBalance = wallet.availableBalance + wallet.graceBalance;
    const hasSufficientBalance = effectiveBalance >= price;

    return {
      hasSufficientBalance,
      requiredAmount: price,
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance,
      totalBalance: wallet.balance,
      graceBalance: wallet.graceBalance,
      effectiveBalance: effectiveBalance,
      shortfall: hasSufficientBalance ? 0 : price - effectiveBalance
    };
  }
}

module.exports = new AttendancePaymentProcessor();