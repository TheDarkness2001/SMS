# Student Management System

A comprehensive web-based Student Management System built with Node.js, Express, React, and MongoDB. This system manages teachers, students, attendance, exams, payments, revenue, schedules, and feedback with role-based access control.

## Features

### 🔐 Authentication
- **Teacher Login**: JWT-based authentication for teachers and admins
- **Parent Login**: Secure login for parents to view their child's information
- **Auto-logout**: Automatic session expiration for security
- **Protected Routes**: Role-based route protection

### 👨‍🏫 Teacher Management
- Add, view, edit, and delete teachers
- Upload profile images
- Filter by subject and status
- **Permission System**: Admin can control access to:
  - Payments Management
  - Revenue Reports
  - Scheduler
  - Timetable Management
  - Student Management
  - Exams Management
  - Attendance Management
  - Feedback Management

### 👨‍🎓 Student Management
- Complete CRUD operations for student records
- Search and filter by name, ID, or class
- Parent information management
- **Parent Portal**: Parents can log in to view their child's:
  - Academic progress
  - Feedback from teachers
  - Payment status
  - Attendance records

### 📋 Teacher Attendance
- Record teacher attendance with photo verification
- Location tracking support
- Filter by teacher, date, or department
- Check-in/check-out time tracking
- Approval workflow

### 📝 Exams Management
- Create and manage exams
- Schedule exams with date/time
- Record student scores
- Grade assignment
- Performance tracking

### 💰 Payments
- Track student fee payments
- Multiple payment types (tuition, exam, transport, library fees)
- Payment status tracking (paid, pending, partial, overdue)
- Receipt generation
- Payment history

### 📊 Revenue Management
- Generate comprehensive revenue reports
- Revenue breakdown by:
  - Payment type
  - Month
  - Academic year
- Pending payments tracking
- Revenue statistics dashboard

### 📅 Timetable
- Class-wise timetable management
- Period allocation
- Teacher assignment
- Room allocation
- Day-wise scheduling

### 💬 Feedback System
- Comprehensive student feedback including:
  - Course performance (grades, percentage)
  - Payment status
  - Start and finish dates
  - Attendance percentage
  - Behavior assessment
  - Teacher comments
  - Strengths and areas of improvement
- **Parent Access**: Parents can view all feedback for their child
- Teacher-generated feedback with detailed insights

## Tech Stack

### Backend
- **Node.js** & **Express.js**: Server framework
- **MongoDB** & **Mongoose**: Database and ODM
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **Multer**: File uploads
- **Express Validator**: Input validation
- **CORS**: Cross-origin resource sharing

### Frontend
- **React 18**: UI library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **CSS3**: Styling

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory (already provided):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student_management
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

4. Start MongoDB service

5. Seed the database with dummy data:
```bash
npm run seed
```

6. Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## Test Credentials

After seeding the database, you can use these credentials:

### Admin Login
- **Email**: admin@school.com
- **Password**: admin123
- **Access**: Full system access with all permissions

### Teacher Login
- **Email**: john.smith@school.com
- **Password**: teacher123
- **Access**: Limited based on permissions

### Parent Login
- **Email**: robert.davis@parent.com
- **Password**: parent123
- **Access**: View child's profile and feedback only

## API Endpoints

### Authentication
- `POST /api/auth/teacher/login` - Teacher login
- `POST /api/auth/parent/login` - Parent login
- `GET /api/auth/me` - Get current user

### Teachers
- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/:id` - Get teacher by ID
- `POST /api/teachers` - Create teacher (Admin only)
- `PUT /api/teachers/:id` - Update teacher (Admin only)
- `DELETE /api/teachers/:id` - Delete teacher (Admin only)
- `PUT /api/teachers/:id/photo` - Upload profile image
- `PUT /api/teachers/:id/permissions` - Update permissions (Admin only)

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get all attendance records
- `GET /api/attendance/:id` - Get attendance by ID
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance (Admin only)

### Exams
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `POST /api/exams` - Create exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/results` - Add exam results

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `GET /api/payments/student/:studentId` - Get student payments
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Revenue
- `GET /api/revenue` - Get revenue report
- `GET /api/revenue/pending` - Get pending payments
- `GET /api/revenue/stats` - Get revenue statistics

### Timetable
- `GET /api/timetable` - Get all timetables
- `GET /api/timetable/:id` - Get timetable by ID
- `GET /api/timetable/teacher/:teacherId` - Get teacher's timetable
- `POST /api/timetable` - Create timetable
- `PUT /api/timetable/:id` - Update timetable
- `DELETE /api/timetable/:id` - Delete timetable

### Feedback
- `GET /api/feedback` - Get all feedback
- `GET /api/feedback/:id` - Get feedback by ID
- `GET /api/feedback/student/:studentId` - Get student feedback
- `POST /api/feedback` - Create feedback
- `PUT /api/feedback/:id` - Update feedback
- `DELETE /api/feedback/:id` - Delete feedback
- `PUT /api/feedback/:id/parent-comment` - Add parent comment

## Project Structure

```
student-management/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/              # Request handlers
│   │   ├── authController.js
│   │   ├── teacherController.js
│   │   ├── studentController.js
│   │   ├── attendanceController.js
│   │   ├── examController.js
│   │   ├── paymentController.js
│   │   ├── revenueController.js
│   │   ├── timetableController.js
│   │   └── feedbackController.js
│   ├── middleware/               # Custom middleware
│   │   ├── auth.js              # Authentication & authorization
│   │   ├── upload.js            # File upload
│   │   └── errorHandler.js      # Error handling
│   ├── models/                   # Database models
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Attendance.js
│   │   ├── Exam.js
│   │   ├── Payment.js
│   │   ├── Timetable.js
│   │   └── Feedback.js
│   ├── routes/                   # API routes
│   │   ├── authRoutes.js
│   │   ├── teacherRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── examRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── revenueRoutes.js
│   │   ├── timetableRoutes.js
│   │   └── feedbackRoutes.js
│   ├── uploads/                  # Uploaded files
│   ├── server.js                 # Express app entry point
│   ├── seedData.js              # Database seeder
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Navigation bar
│   │   │   └── PrivateRoute.jsx # Protected route wrapper
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── Teachers.jsx     # Teacher management
│   │   │   ├── Students.jsx     # Student management
│   │   │   ├── ViewStudent.jsx  # Student profile (parent view)
│   │   │   ├── Attendance.jsx   # Attendance tracking
│   │   │   ├── Exams.jsx        # Exam management
│   │   │   ├── Payments.jsx     # Payment management
│   │   │   ├── Revenue.jsx      # Revenue reports
│   │   │   ├── Timetable.jsx    # Timetable management
│   │   │   └── Feedback.jsx     # Feedback management
│   │   ├── utils/
│   │   │   └── api.js           # API service layer
│   │   ├── App.jsx              # Main app component
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Global styles
│   └── package.json
├── .env                          # Environment variables
├── .gitignore
└── README.md
```

## Key Features Explanation

### Permission-Based Access Control
- Admins can assign specific permissions to each teacher
- Only authorized users can access sensitive modules (Payments, Revenue, etc.)
- Navigation menu dynamically shows/hides links based on permissions

### Parent Portal
- Parents log in using their email and password
- Automatically redirected to their child's profile page
- Can view complete academic feedback with detailed metrics
- View payment history and status
- No access to other students or administrative functions

### Feedback Table Details
The feedback system includes comprehensive information:
- **Course Name**: Subject/course being evaluated
- **Status**: Passed/Failed/In Progress
- **Grade & Percentage**: Academic performance metrics
- **Payment Status**: Fee payment status for the course
- **Start/Finish Dates**: Course duration
- **Attendance**: Percentage of classes attended
- **Behavior**: Student behavior rating
- **Teacher Comments**: Detailed feedback from instructors
- **Strengths & Areas of Improvement**: Personalized insights

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Protected Routes**: Authentication middleware on all sensitive routes
- **Role-Based Access**: Permission system for granular access control
- **Auto Logout**: Invalid/expired tokens trigger automatic logout
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Centralized error handling middleware

## Future Enhancements

- Email notifications for parents and students
- Mobile app for attendance with GPS tracking
- Automated report card generation
- SMS integration for payment reminders
- Advanced analytics and reporting
- Calendar integration for events
- Push notifications
- Multi-language support

## Support

For issues or questions, please create an issue in the repository or contact the development team.

## License

This project is licensed under the ISC License.

---

**Built with ❤️ for educational institutions**
