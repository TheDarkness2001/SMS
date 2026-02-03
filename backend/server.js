const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimit');
require('./utils/notificationWorker');

// Load env vars
dotenv.config({ path: './.env' });

// Debug: Check if JWT_SECRET is loaded
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'NOT FOUND');

// Connect to database
connectDB();

const app = express();

// Trust proxy for rate limiting with X-Forwarded-For header
app.set('trust proxy', 1);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware: Sanitize inputs BEFORE routes
app.use(sanitizeInput);

// Security middleware: Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Enable CORS - Allow frontend from custom domain
const allowedOrigins = [
  'https://techrenacademy.com',
  'https://www.techrenacademy.com',
  'http://localhost:3000', // Development
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/student-attendance', require('./routes/studentAttendanceRoutes'));
app.use('/api/teacher-attendance', require('./routes/teacherAttendanceRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/exam-groups', require('./routes/examGroupRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/revenue', require('./routes/revenueRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/class-schedules', require('./routes/classScheduleRoutes'));
app.use('/api/scheduler', require('./routes/schedulerRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
// SIMPLIFIED SALARY PAYOUT SYSTEM - Record direct payments to staff
app.use('/api/salary-payouts', require('./routes/salaryPayoutRoutes'));
// WALLET ROUTES HIDDEN - NOT IMPLEMENTED YET
// app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/teacher-earnings', require('./routes/teacherEarningRoutes'));
app.use('/api/staff-earnings', require('./routes/staffEarningRoutes'));
app.use('/api/staff-payouts', require('./routes/staffPayoutRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug route - Check student records (remove in production)
app.get('/api/debug/students', async (req, res) => {
  try {
    const Student = require('./models/Student');
    const students = await Student.find().select('email password studentId name');
    
    const studentInfo = students.map(s => ({
      name: s.name,
      email: s.email || 'NO EMAIL',
      studentId: s.studentId,
      hasPassword: s.password ? 'YES' : 'NO'
    }));
    
    res.status(200).json({
      success: true,
      totalStudents: students.length,
      students: studentInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Error handler middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // Check if a server instance already exists
    if (server && !server.listening) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('Error closing existing server:', err.message);
            reject(err);
          } else {
            console.log('Closed existing server instance');
            resolve();
          }
        });
      });
    }
    
    server = app.listen(PORT, () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the existing server first.`);
        console.log('💡 Tip: Use \'npx kill-port\', or check for running Node processes');
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('Forcing server shutdown');
      process.exit(1);
    }, 10000);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Start the server
startServer();
