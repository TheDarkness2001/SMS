# Quick Start Guide - Student Management System

## 🚀 Getting Started in 5 Minutes

### Step 1: Install MongoDB
Ensure MongoDB is installed and running on your system.
- Windows: Download from https://www.mongodb.com/try/download/community
- Start MongoDB service

### Step 2: Backend Setup

Open a terminal and run:

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Seed database with test data
npm run seed

# Start backend server
npm run dev
```

You should see:
```
MongoDB connected successfully
Server running in development mode on port 5000
```

### Step 3: Frontend Setup

Open a NEW terminal and run:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Browser will open automatically at `http://localhost:3000`

### Step 4: Login and Explore

Use these credentials to test different roles:

**Admin Access (Full Permissions):**
- Email: `admin@school.com`
- Password: `admin123`

**Teacher Access (Limited Permissions):**
- Email: `john.smith@school.com`
- Password: `teacher123`

**Parent Access (View Child Only):**
- Email: `robert.davis@parent.com`
- Password: `parent123`

## 📋 What's Included

After seeding, you'll have:
- ✅ 3 Teachers (1 Admin + 2 Regular Teachers)
- ✅ 3 Students with parent accounts
- ✅ Attendance records
- ✅ Exam schedules and results
- ✅ Payment records
- ✅ Timetables
- ✅ Student feedback

## 🎯 Key Features to Test

### As Admin
1. **Dashboard** - View system statistics
2. **Teachers** - Manage teacher permissions
3. **Students** - Full student management
4. **Payments** - Track all payments
5. **Revenue** - View revenue reports
6. **Timetable** - Manage schedules

### As Teacher
1. Limited access based on permissions
2. Can view assigned classes
3. Manage attendance (if permitted)
4. Create feedback for students

### As Parent
1. Automatically redirected to child's profile
2. View academic feedback with grades
3. See payment status
4. Check attendance and behavior

## 🔧 Troubleshooting

**MongoDB Connection Error:**
```bash
# Make sure MongoDB is running
# Windows: Start MongoDB service
# Mac: brew services start mongodb-community
```

**Port Already in Use:**
```bash
# Change PORT in .env file
PORT=5001
```

**Frontend Not Starting:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Need Help?

Check the main README.md for:
- Complete API documentation
- Project structure
- Detailed feature descriptions
- Advanced configuration

---

Happy Coding! 🎉
