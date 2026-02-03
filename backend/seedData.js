const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars FIRST
dotenv.config({ path: path.join(__dirname, '.env') });

const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Exam = require('./models/Exam');
const Payment = require('./models/Payment');
const Timetable = require('./models/Timetable');
const Feedback = require('./models/Feedback');
const Settings = require('./models/Settings');

// Use the same connection as the server
mongoose.connect('mongodb://localhost:27017/student_management_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    // Check if data already exists
    const existingTeachers = await Teacher.countDocuments();
    const existingStudents = await Student.countDocuments();
    
    if (existingTeachers > 0 || existingStudents > 0) {
      console.log('⚠️  Data already exists in database!');
      console.log(`   Teachers: ${existingTeachers}`);
      console.log(`   Students: ${existingStudents}`);
      console.log('\n   Skipping seed to preserve existing data.');
      console.log('   If you want to reseed, manually clear the database first.');
      process.exit(0);
    }

    // Clear existing data (only runs if database is empty)
    await Attendance.deleteMany();
    await Exam.deleteMany();
    await Payment.deleteMany();
    await Timetable.deleteMany();
    await Feedback.deleteMany();
    await Settings.deleteMany();

    console.log('Initializing fresh database...');

    // Create default settings
    const defaultSettings = await Settings.create({});

    console.log('Default settings created...');

    // Create Super Admin
    const superAdmin = await Teacher.create({
      name: 'Super Admin',
      email: 'mahammadinovh@gmail.com',
      password: 'Naruto2001*',
      phone: '+1234567890',
      subject: ['Administration'],
      department: 'Administration',
      role: 'admin',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canManagePayments: true,
        canViewRevenue: true,
        canManageScheduler: true,
        canViewTimetable: true,
        canManageTimetable: true,
        canManageStudents: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    // Create Admin Teacher
    const admin = await Teacher.create({
      name: 'Admin User',
      email: 'admin@school.com',
      password: 'admin123',
      phone: '+1234567890',
      subject: ['Administration'],
      department: 'Administration',
      role: 'admin',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canManagePayments: true,
        canViewRevenue: true,
        canManageScheduler: true,
        canViewTimetable: true,
        canManageTimetable: true,
        canManageStudents: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    // Create Manager
    const manager = await Teacher.create({
      name: 'Manager User',
      email: 'manager@school.com',
      password: 'manager123',
      phone: '+1234567891',
      subject: ['Management'],
      department: 'Administration',
      role: 'manager',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canManagePayments: true,
        canViewRevenue: true,
        canManageScheduler: true,
        canViewTimetable: true,
        canManageTimetable: true,
        canManageStudents: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    // Create Founder
    const founder = await Teacher.create({
      name: 'Founder User',
      email: 'founder@school.com',
      password: 'founder123',
      phone: '+1234567892',
      subject: ['Leadership'],
      department: 'Administration',
      role: 'founder',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canManagePayments: true,
        canViewRevenue: true,
        canManageScheduler: true,
        canViewTimetable: true,
        canManageTimetable: true,
        canManageStudents: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    // Create Sales
    const sales = await Teacher.create({
      name: 'Sales User',
      email: 'sales@school.com',
      password: 'sales123',
      phone: '+1234567893',
      subject: ['Sales'],
      department: 'Marketing',
      role: 'sales',
      status: 'active',
      permissions: {
        canViewPayments: false,
        canManagePayments: false,
        canViewRevenue: true,
        canManageScheduler: false,
        canViewTimetable: false,
        canManageTimetable: false,
        canManageStudents: false,
        canManageExams: false,
        canManageAttendance: false,
        canViewFeedback: false,
        canManageFeedback: false
      }
    });

    // Create Receptionist
    const receptionist = await Teacher.create({
      name: 'Receptionist User',
      email: 'receptionist@school.com',
      password: 'receptionist123',
      phone: '+1234567894',
      subject: ['Reception'],
      department: 'Administration',
      role: 'receptionist',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canManagePayments: false,
        canViewRevenue: false,
        canManageScheduler: false,
        canViewTimetable: true,
        canManageTimetable: false,
        canManageStudents: true,
        canManageExams: false,
        canManageAttendance: false,
        canViewFeedback: false,
        canManageFeedback: false
      }
    });

    // Create Teachers
    const teacher1 = await Teacher.create({
      name: 'John Smith',
      email: 'john.smith@school.com',
      password: 'teacher123',
      phone: '+1234567891',
      subject: ['Mathematics', 'Physics'],
      department: 'Science',
      role: 'teacher',
      status: 'active',
      permissions: {
        canViewTimetable: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    const teacher2 = await Teacher.create({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@school.com',
      password: 'teacher123',
      phone: '+1234567892',
      subject: ['English', 'Literature'],
      department: 'Arts',
      role: 'teacher',
      status: 'active',
      permissions: {
        canViewTimetable: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true,
        canManageFeedback: true
      }
    });

    const teacher3 = await Teacher.create({
      name: 'Michael Brown',
      email: 'michael.brown@school.com',
      password: 'teacher123',
      phone: '+1234567893',
      subject: ['Science', 'Chemistry', 'Biology'],
      department: 'Science',
      role: 'teacher',
      status: 'active',
      permissions: {
        canViewPayments: true,
        canViewTimetable: true,
        canManageExams: true,
        canManageAttendance: true,
        canViewFeedback: true
      }
    });

    console.log('Teachers created...');

    // Create Students
    const student1 = await Student.create({
      studentId: 'STU001',
      name: 'Emily Davis',
      email: 'emily.davis@student.com',
      password: 'student123',
      phone: '+1234567801',
      dateOfBirth: new Date('2008-05-15'),
      gender: 'female',
      address: '123 Main St, City, State',
      parentName: 'Robert Davis',
      parentPhone: '+1234567811',
      status: 'active',
      subjects: ['Mathematics', 'English', 'Science']
    });

    const student2 = await Student.create({
      studentId: 'STU002',
      name: 'James Wilson',
      email: 'james.wilson@student.com',
      password: 'student123',
      phone: '+1234567802',
      dateOfBirth: new Date('2008-07-20'),
      gender: 'male',
      address: '456 Oak Ave, City, State',
      parentName: 'Lisa Wilson',
      parentPhone: '+1234567812',
      status: 'active',
      subjects: ['Mathematics', 'English', 'Science']
    });

    const student3 = await Student.create({
      studentId: 'STU003',
      name: 'Sophia Martinez',
      email: 'sophia.martinez@student.com',
      password: 'student123',
      phone: '+1234567803',
      dateOfBirth: new Date('2009-03-10'),
      gender: 'female',
      address: '789 Pine Rd, City, State',
      parentName: 'Carlos Martinez',
      parentPhone: '+1234567813',
      status: 'active',
      subjects: ['Mathematics', 'English', 'Science']
    });

    console.log('Students created...');

    // Create Attendance Records
    await Attendance.create([
      {
        teacher: teacher1._id,
        date: new Date('2024-12-01'),
        status: 'present',
        checkInTime: '08:00 AM',
        checkOutTime: '04:00 PM',
        approvedBy: admin._id
      },
      {
        teacher: teacher2._id,
        date: new Date('2024-12-01'),
        status: 'present',
        checkInTime: '08:15 AM',
        checkOutTime: '04:15 PM',
        approvedBy: admin._id
      },
      {
        teacher: teacher3._id,
        date: new Date('2024-12-01'),
        status: 'late',
        checkInTime: '09:00 AM',
        checkOutTime: '04:00 PM',
        notes: 'Traffic delay',
        approvedBy: admin._id
      }
    ]);

    console.log('Attendance records created...');

    // Create Exams
    const exam1 = await Exam.create({
      examName: 'Midterm Exam',
      subject: 'Mathematics',
      class: 'Grade 10',
      examDate: new Date('2024-12-15'),
      startTime: '09:00',
      duration: 120, // 2 hours
      totalMarks: 100,
      passingMarks: 40,
      teacher: teacher1._id,
      status: 'scheduled'
    });

    const exam2 = await Exam.create({
      examName: 'Final Exam',
      subject: 'English',
      class: 'Grade 10',
      examDate: new Date('2024-12-20'),
      startTime: '10:00',
      duration: 120, // 2 hours
      totalMarks: 100,
      passingMarks: 40,
      teacher: teacher2._id,
      status: 'scheduled'
    });

    console.log('Exams created...');

    // Create Payments
    await Payment.create([
      {
        student: student1._id,
        amount: 150,
        paymentType: 'tuition-fee',
        paymentMethod: 'cash',
        status: 'paid',
        subject: 'Mathematics',
        dueDate: new Date('2024-12-01'),
        paidDate: new Date('2024-11-25'),
        receiptNumber: 'RCP-001',
        academicYear: '2024-2025',
        term: '1st-term',
        month: 12,
        year: 2024
      },
      {
        student: student2._id,
        amount: 140,
        paymentType: 'tuition-fee',
        paymentMethod: 'card',
        status: 'paid',
        subject: 'English',
        dueDate: new Date('2024-12-01'),
        paidDate: new Date('2024-11-28'),
        receiptNumber: 'RCP-002',
        academicYear: '2024-2025',
        term: '1st-term',
        month: 12,
        year: 2024
      }
    ]);

    console.log('Payments created...');

    // Create Timetables
    await Timetable.create([
      {
        class: 'Grade 10',
        section: 'A',
        dayOfWeek: 'Monday',
        academicYear: '2024-2025',
        term: '1st-term',
        periods: [
          {
            periodNumber: 1,
            subject: 'Mathematics',
            teacher: teacher1._id,
            startTime: '08:00',
            endTime: '09:00',
            room: 'Room 101'
          },
          {
            periodNumber: 2,
            subject: 'English',
            teacher: teacher2._id,
            startTime: '09:00',
            endTime: '10:00',
            room: 'Room 102'
          },
          {
            periodNumber: 3,
            subject: 'Science',
            teacher: teacher3._id,
            startTime: '10:30',
            endTime: '11:30',
            room: 'Lab 1'
          }
        ]
      }
    ]);

    console.log('Timetables created...');

    // Create Feedback
    await Feedback.create([
      {
        student: student1._id,
        course: 'Mathematics',
        teacher: teacher1._id,
        academicYear: '2024-2025',
        term: '1st-term',
        status: 'passed',
        grade: 'A',
        percentage: 85,
        paymentStatus: 'paid',
        startDate: new Date('2024-09-01'),
        finishDate: new Date('2024-12-20'),
        attendance: 95,
        behavior: 'excellent',
        homeworkPerformance: 'Excellent problem-solving skills and consistent homework completion',
        studentBehavior: 'Very respectful and engaged in class discussions',
        strugglingAreas: 'None identified',
        teacherComments: 'Emily is an outstanding student with excellent problem-solving skills.',
        strengths: 'Strong analytical thinking, participates actively in class',
        areasOfImprovement: 'Could work on speed in calculations',
        lastUpdatedBy: teacher1._id
      },
      {
        student: student2._id,
        course: 'English',
        teacher: teacher2._id,
        academicYear: '2024-2025',
        term: '1st-term',
        status: 'passed',
        grade: 'B',
        percentage: 78,
        paymentStatus: 'pending',
        startDate: new Date('2024-09-01'),
        finishDate: new Date('2024-12-20'),
        attendance: 88,
        behavior: 'good',
        homeworkPerformance: 'Good writing skills but needs improvement in grammar',
        studentBehavior: 'Generally well-behaved but sometimes distracted',
        strugglingAreas: 'Grammar and punctuation',
        teacherComments: 'James shows good understanding of literature and writing.',
        strengths: 'Creative writing, good vocabulary',
        areasOfImprovement: 'Needs to improve grammar and punctuation',
        lastUpdatedBy: teacher2._id
      }
    ]);

    console.log('Feedback created...');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Super Admin Login:');
    console.log('  Email: mahammadinovh@gmail.com');
    console.log('  Password: Naruto2001*');
    console.log('\nAdmin Login:');
    console.log('  Email: admin@school.com');
    console.log('  Password: admin123');
    console.log('\nManager Login:');
    console.log('  Email: manager@school.com');
    console.log('  Password: manager123');
    console.log('\nFounder Login:');
    console.log('  Email: founder@school.com');
    console.log('  Password: founder123');
    console.log('\nSales Login:');
    console.log('  Email: sales@school.com');
    console.log('  Password: sales123');
    console.log('\nTeacher Login:');
    console.log('  Email: john.smith@school.com');
    console.log('  Password: teacher123');
    console.log('\nStudent Login:');
    console.log('  Email: emily.davis@student.com');
    console.log('  Password: student123');
    console.log('  (Other students: james.wilson@student.com, sophia.martinez@student.com)');
    console.log('\nParent Login:');
    console.log('  Email: robert.davis@parent.com');
    console.log('  Password: parent123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();