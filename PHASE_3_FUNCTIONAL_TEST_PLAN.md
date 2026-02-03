# PHASE 3: FUNCTIONAL TEST PLAN
## Staff → Student Workflows Verification

**Date**: December 18, 2025  
**Status**: READY FOR EXECUTION  
**Objective**: Verify all Staff → Student data flows work correctly

---

## 📋 TEST STRUCTURE

### Test Modules (8 Total)
1. **Authentication Module** - Login flows and JWT handling
2. **Student Management** - CRUD operations and data integrity
3. **Attendance Module** - Record and view staff → student flow
4. **Feedback Module** - Submission and "Not Viewed" → "Viewed" status
5. **Exams Module** - Create exams and assign students
6. **Timetable/Scheduler** - Schedule creation and student access
7. **Payments Module** - Payment creation and student view
8. **Settings/Dashboard** - System configuration and metrics

---

## 🔐 1. AUTHENTICATION MODULE TESTS

### Test 1.1: Teacher Login
**User**: Teacher (teacherId: T001)  
**Steps**:
1. POST `/api/auth/teacher/login` with valid credentials
2. Verify JWT token returned
3. Check `userType: 'teacher'` in response
4. Check `role` field populated

**Expected**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "John Teacher",
    "email": "john@school.com",
    "userType": "teacher",
    "role": "teacher",
    "permissions": { ... }
  }
}
```

**Status**: ⏳ PENDING

---

### Test 1.2: Student Login
**User**: Student (studentId: STU001)  
**Steps**:
1. POST `/api/auth/student/login` with valid credentials
2. Verify JWT token returned
3. Check `userType: 'student'` in response

**Expected**: 200 OK with token

**Status**: ⏳ PENDING

---

### Test 1.3: Parent Login
**User**: Parent (student's parent)  
**Steps**:
1. POST `/api/auth/login` with parent credentials
2. Verify JWT token returned
3. Check `userType: 'parent'` in token
4. Verify parent can access feedback endpoint

**Expected**: 200 OK, token with userType='parent'

**Status**: ⏳ PENDING

---

### Test 1.4: JWT Token Validation
**Steps**:
1. Login and get token
2. Extract token and verify expiration
3. Use token in Authorization header
4. Verify `protect` middleware validates correctly

**Expected**: Token valid for configured duration (usually 24-48 hours)

**Status**: ⏳ PENDING

---

## 👥 2. STUDENT MANAGEMENT MODULE TESTS

### Test 2.1: Create Student
**User**: Admin/Manager  
**Steps**:
1. POST `/api/students` with student data
2. Verify student created with correct fields
3. Check student assigned to class

**Expected**: 201 Created with student object

**Status**: ⏳ PENDING

---

### Test 2.2: Update Student Profile
**User**: Admin/Manager  
**Steps**:
1. PUT `/api/students/:id` with new data (class change)
2. Verify update successful
3. Check cascade effects on:
   - Timetable entries
   - Attendance records
   - Exam assignments

**Expected**: 200 OK, student updated

**Status**: ⏳ PENDING

---

### Test 2.3: Student View Own Profile
**User**: Student  
**Steps**:
1. GET `/api/students/me` (own profile)
2. Verify can see own data
3. Try to GET other student's profile
4. Verify denied with 403

**Expected**: 
- Own profile: 200 OK
- Other profile: 403 Forbidden

**Status**: ⏳ PENDING

---

### Test 2.4: Teacher Bulk View Students
**User**: Teacher  
**Steps**:
1. GET `/api/students?class=10A&section=A`
2. Verify only assigned students returned
3. Check cannot see other classes

**Expected**: 200 OK, filtered student list

**Status**: ⏳ PENDING

---

## 📝 3. ATTENDANCE MODULE TESTS

### Test 3.1: Teacher Records Attendance
**User**: Teacher  
**Scenario**: Record attendance within 30-minute window after class

**Steps**:
1. GET `/api/student-attendance` (fetch students in class)
2. POST `/api/student-attendance` with attendance data:
   ```json
   {
     "student": "STU001",
     "class": "10A",
     "subject": "Mathematics",
     "status": "present",
     "date": "2025-12-18"
   }
   ```
3. Verify record created
4. Check duplicate prevention (same student, same day)

**Expected**: 201 Created, no duplicates allowed

**Status**: ⏳ PENDING

---

### Test 3.2: Attendance Time Window Enforcement
**User**: Teacher  
**Scenario**: Try to record attendance outside 30-minute window

**Steps**:
1. Try to record attendance more than 30 minutes after class end
2. Verify denied with appropriate error

**Expected**: 400 Bad Request, "Outside submission window"

**Status**: ⏳ PENDING

---

### Test 3.3: Student Views Own Attendance
**User**: Student  
**Steps**:
1. GET `/api/student-attendance?student=STU001`
2. Verify can see own attendance records
3. Check attendance displays with:
   - Date
   - Status (present/absent/late/half-day)
   - Subject
   - Teacher name

**Expected**: 200 OK with attendance records

**Status**: ⏳ PENDING

---

### Test 3.4: Attendance Charts (Monthly/Yearly)
**User**: Student/Parent  
**Steps**:
1. GET `/api/student-attendance/charts/monthly?student=STU001&month=12&year=2025`
2. Verify monthly attendance data
3. GET yearly chart
4. Verify calculations correct

**Expected**: 200 OK with chart data

**Status**: ⏳ PENDING

---

## 📋 4. FEEDBACK MODULE TESTS

### Test 4.1: Teacher Submits Feedback
**User**: Teacher  
**Steps**:
1. POST `/api/feedback` with feedback data:
   ```json
   {
     "student": "STU001",
     "subject": "Mathematics",
     "grade": "A",
     "percentage": 85,
     "comments": "Good performance",
     "status": "passed"
   }
   ```
2. Verify feedback created
3. Check `parentViewed: false` (default)

**Expected**: 201 Created with parentViewed=false

**Status**: ⏳ PENDING

---

### Test 4.2: Feedback Initial Status "Not Viewed"
**User**: Student/Parent  
**Steps**:
1. GET `/api/feedback/student/:studentId`
2. Check feedback list shows "Not Viewed" status (parentViewed=false)
3. Verify initial state is "Not Viewed"

**Expected**: Feedback with parentViewed=false

**Status**: ⏳ PENDING

---

### Test 4.3: Feedback Status Changes to "Viewed"
**User**: Student/Parent  
**Steps**:
1. GET `/api/feedback/student/:studentId`
2. Open feedback (view it)
3. Check parentViewed auto-updated to true
4. GET feedback again
5. Verify status now shows "Viewed"

**Expected**: parentViewed changes from false → true

**Status**: ⏳ PENDING

---

### Test 4.4: Viewed Status Persists After Reload
**User**: Student/Parent  
**Steps**:
1. View feedback (status → Viewed)
2. Logout and login again
3. GET feedback again
4. Verify still shows as "Viewed"

**Expected**: parentViewed=true persists across sessions

**Status**: ⏳ PENDING

---

### Test 4.5: Parent Adds Comments
**User**: Parent  
**Steps**:
1. GET own child's feedback
2. PUT `/api/feedback/:id/parent-comment` with comment:
   ```json
   { "parentComments": "Great progress! Keep it up!" }
   ```
3. Verify comment saved
4. Verify parentViewed=true

**Expected**: 200 OK, comment saved, parentViewed=true

**Status**: ⏳ PENDING

---

### Test 4.6: Feedback Deletion Permission Check
**User**: Teacher A trying to delete Teacher B's feedback  
**Steps**:
1. Teacher A tries: DELETE `/api/feedback/:feedbackIdFromTeacherB`
2. Verify returns 403 Forbidden
3. Verify feedback NOT deleted
4. Admin deletes same feedback
5. Verify deletion succeeds

**Expected**: 
- Teacher A: 403 Forbidden, feedback intact
- Admin: 200 OK, feedback deleted

**Status**: ⏳ PENDING

---

### Test 4.7: Teacher Can Only See Assigned Students' Feedback
**User**: Teacher  
**Steps**:
1. GET `/api/feedback/student/:studentId` for own assigned student
2. Verify feedback visible
3. Try to GET feedback for non-assigned student
4. Verify denied (403 or empty)

**Expected**: Only assigned students' feedback visible

**Status**: ⏳ PENDING

---

## 📚 5. EXAMS MODULE TESTS

### Test 5.1: Teacher Creates Exam
**User**: Teacher  
**Steps**:
1. POST `/api/exams` with exam data:
   ```json
   {
     "name": "Mathematics Midterm",
     "subject": "Mathematics",
     "class": "10A",
     "date": "2025-12-20",
     "totalMarks": 100
   }
   ```
2. Verify exam created
3. Check exam assigned to all students in class

**Expected**: 201 Created, exam visible to students

**Status**: ⏳ PENDING

---

### Test 5.2: Teacher Assigns Students to Exam
**User**: Teacher  
**Steps**:
1. POST `/api/exam-groups` to assign students
2. Verify students added to exam
3. Check rollNumber assignment

**Expected**: 200 OK, students assigned

**Status**: ⏳ PENDING

---

### Test 5.3: Teacher Records Exam Results
**User**: Teacher  
**Steps**:
1. POST `/api/exam-results` with scores:
   ```json
   {
     "student": "STU001",
     "exam": "EXAM001",
     "marksObtained": 85,
     "percentage": 85
   }
   ```
2. Verify result saved
3. Check passing/failing status

**Expected**: 201 Created with percentage calculated

**Status**: ⏳ PENDING

---

### Test 5.4: Student Views Own Exam Results
**User**: Student  
**Steps**:
1. GET `/api/exam-results?student=STU001`
2. Verify can see own results
3. Try to GET other student's results
4. Verify denied

**Expected**:
- Own results: 200 OK
- Other results: 403 Forbidden

**Status**: ⏳ PENDING

---

### Test 5.5: Parent Views Child's Exam Results
**User**: Parent  
**Steps**:
1. GET `/api/exam-results?student=CHILD_ID`
2. Verify can see child's results
3. Try to GET other child's results (if multiple)
4. Verify denied

**Expected**: Only child's results accessible

**Status**: ⏳ PENDING

---

## 📅 6. TIMETABLE/SCHEDULER MODULE TESTS

### Test 6.1: Teacher Creates Schedule
**User**: Teacher  
**Steps**:
1. POST `/api/scheduler` with schedule:
   ```json
   {
     "teacher": "TEACHER_ID",
     "subject": "Mathematics",
     "class": "10A",
     "section": "A",
     "startTime": "09:00",
     "endTime": "10:00",
     "scheduledDays": ["Monday", "Wednesday", "Friday"]
   }
   ```
2. Verify schedule created
3. Check appears in teacher's timetable

**Expected**: 201 Created

**Status**: ⏳ PENDING

---

### Test 6.2: Admin/Manager Views All Teachers' Timetables
**User**: Admin/Manager  
**Steps**:
1. GET `/api/scheduler`
2. Verify can see all teachers' schedules
3. Click on teacher dropdown
4. Filter by teacher
5. View that teacher's timetable

**Expected**: All schedules visible, can filter

**Status**: ⏳ PENDING

---

### Test 6.3: Teacher Views Own Timetable
**User**: Teacher  
**Steps**:
1. GET `/api/scheduler?teacher=TEACHER_ID`
2. Verify only own schedule visible
3. Check cannot see other teachers' schedules

**Expected**: Only own schedule returned

**Status**: ⏳ PENDING

---

### Test 6.4: Student Views Class Timetable
**User**: Student  
**Steps**:
1. GET `/api/scheduler?class=10A&section=A`
2. Verify can see class schedule
3. Check shows all subjects and teachers
4. Verify matches teacher's submitted schedule

**Expected**: 200 OK, correct class schedule

**Status**: ⏳ PENDING

---

### Test 6.5: Timetable UI Responsiveness
**User**: Any  
**Steps**:
1. View timetable on different devices:
   - Mobile (≤480px)
   - Tablet (481-1024px)
   - Desktop (1025-1920px)
   - Ultra-wide (≥1921px)
2. Verify layout scales correctly
3. Check:
   - Days visible
   - Times readable
   - No horizontal scroll (except mobile)

**Expected**: Proper scaling on all devices

**Status**: ⏳ PENDING

---

## 💳 7. PAYMENTS MODULE TESTS

### Test 7.1: Admin Creates Payment
**User**: Admin/Manager  
**Steps**:
1. POST `/api/payments` with:
   ```json
   {
     "student": "STU001",
     "amount": 5000,
     "paymentMethod": "cash",
     "dueDate": "2025-12-31",
     "subject": "Tuition",
     "academicYear": "2025-2026",
     "term": "1st-term",
     "status": "pending"
   }
   ```
2. Verify validation:
   - All required fields checked
   - Amount > 0
   - Dates valid
3. Check payment created

**Expected**: 201 Created, all validations pass

**Status**: ⏳ PENDING

---

### Test 7.2: Payment Term Calculation
**User**: Admin  
**Steps**:
1. Create payment in January (month=1)
2. Check term = "1st-term"
3. Create payment in June (month=6)
4. Check term = "2nd-term"
5. Create payment in October (month=10)
6. Check term = "3rd-term"

**Expected**: Term calculated correctly based on month

**Status**: ⏳ PENDING

---

### Test 7.3: Payment Field Mismatch (Both Formats)
**User**: Admin  
**Steps**:
1. POST with `paymentMethod: 'cash'`
2. Verify saves correctly
3. POST with `method: 'online'`
4. Verify saves correctly (converts to paymentMethod)

**Expected**: Both formats work

**Status**: ⏳ PENDING

---

### Test 7.4: Student Views Own Payments
**User**: Student  
**Steps**:
1. GET `/api/payments?student=STU001` (own ID)
2. Verify can see own payment records
3. Try to GET other student's payments
4. Verify denied (403 or filtered)

**Expected**: Only own payments visible

**Status**: ⏳ PENDING

---

### Test 7.5: Parent Views Child's Payments
**User**: Parent  
**Steps**:
1. GET `/api/payments?student=CHILD_ID`
2. Verify can see child's payment status
3. Check amount, due date, status
4. Try to GET non-child's payment
5. Verify denied

**Expected**: Only child's payments visible

**Status**: ⏳ PENDING

---

### Test 7.6: Payment Status Transitions
**User**: Admin  
**Steps**:
1. Create payment with status: "pending"
2. PUT `/api/payments/:id` with status: "partial" (amount < expected)
3. Verify status updated
4. PUT with status: "paid"
5. Check receiptNumber generated
6. Check paidDate set

**Expected**: Status transitions work, receipt generated for paid

**Status**: ⏳ PENDING

---

## ⚙️ 8. SETTINGS/DASHBOARD MODULE TESTS

### Test 8.1: Dashboard Load
**User**: Admin/Teacher/Student  
**Steps**:
1. GET `/api/dashboard` or load Dashboard.jsx
2. Verify loads without errors
3. Check displays metrics:
   - Total students
   - Total teachers
   - Total classes (for admin)
   - Pending payments (for admin)

**Expected**: 200 OK with dashboard data

**Status**: ⏳ PENDING

---

### Test 8.2: Settings Page Access
**User**: Admin  
**Steps**:
1. GET `/api/settings`
2. Verify can view system settings
3. Try to modify as Teacher
4. Verify denied

**Expected**: Only admin can access

**Status**: ⏳ PENDING

---

### Test 8.3: Academic Year Configuration
**User**: Admin  
**Steps**:
1. GET current academic year from settings
2. Verify used in:
   - Payment creation
   - Exam records
   - Timetable
3. Update academic year
4. Check reflected in new records

**Expected**: Academic year consistent across modules

**Status**: ⏳ PENDING

---

## 🔄 9. CROSS-MODULE TESTS

### Test 9.1: Student Class Change Cascade
**User**: Admin  
**Steps**:
1. Update student class: 10A → 11A
2. Verify cascades to:
   - Timetable entries
   - Attendance records
   - Exam assignments
3. Check old class data intact (no deletion)

**Expected**: All modules updated, no data loss

**Status**: ⏳ PENDING

---

### Test 9.2: Payment Doesn't Affect Exams/Timetable
**User**: Admin  
**Steps**:
1. Create/update payment for STU001
2. Verify exam records unchanged
3. Verify timetable unchanged
4. Verify attendance unaffected

**Expected**: Payment isolated from other modules

**Status**: ⏳ PENDING

---

### Test 9.3: Attendance Doesn't Break Feedback
**User**: Teacher  
**Steps**:
1. Record attendance for STU001
2. Submit feedback for same STU001
3. Verify both operations succeed
4. Check no conflicts or data loss

**Expected**: Both operations independent

**Status**: ⏳ PENDING

---

### Test 9.4: Data Consistency Check
**User**: Admin  
**Steps**:
1. Verify all students in Exams exist in Students module
2. Verify all records have valid references
3. Check no orphaned records
4. Verify date consistency

**Expected**: All references valid, no orphaned data

**Status**: ⏳ PENDING

---

## 🧪 10. ROLE-BASED RBAC TESTS

### Test 10.1: Admin Full Access
**User**: Admin  
**Steps**:
1. Access all modules (Students, Teachers, Payments, etc.)
2. Perform CRUD on all resources
3. Change system settings
4. Verify no 403 errors

**Expected**: Full access to all endpoints

**Status**: ⏳ PENDING

---

### Test 10.2: Manager Permissions
**User**: Manager  
**Steps**:
1. Access Students, Attendance, Feedback
2. Try to delete Teachers
3. Try to change system settings
4. Verify appropriate denials

**Expected**: Limited access, some endpoints 403

**Status**: ⏳ PENDING

---

### Test 10.3: Teacher Permissions
**User**: Teacher  
**Steps**:
1. Record attendance for assigned students
2. Submit feedback for assigned students
3. Try to record attendance for non-assigned students
4. Try to view other teachers' payments
5. Verify appropriate permissions

**Expected**: Only assigned students' data accessible

**Status**: ⏳ PENDING

---

### Test 10.4: Student Permissions
**User**: Student  
**Steps**:
1. View own attendance
2. View own feedback
3. View own exam results
4. View own payments
5. Try to modify own data
6. Try to view other student's data

**Expected**: Read-only, no modifications, no cross-student data

**Status**: ⏳ PENDING

---

### Test 10.5: Parent Permissions
**User**: Parent  
**Steps**:
1. View child's attendance
2. View child's feedback
3. Add comments to feedback
4. View child's payments
5. Try to view other child's data
6. Try to modify any data

**Expected**: Read-only + add comments, only child's data

**Status**: ⏳ PENDING

---

## 📊 TESTING SUMMARY

### Total Test Cases: 50+
- Module 1 (Auth): 4 tests
- Module 2 (Students): 4 tests
- Module 3 (Attendance): 4 tests
- Module 4 (Feedback): 7 tests
- Module 5 (Exams): 5 tests
- Module 6 (Timetable): 5 tests
- Module 7 (Payments): 6 tests
- Module 8 (Settings): 3 tests
- Cross-Module: 4 tests
- RBAC: 5 tests

### Execution Order
1. Authentication (must pass first)
2. Student Management
3. Core modules (Attendance, Feedback, Exams, Timetable, Payments)
4. Settings
5. Cross-module tests
6. RBAC validation

### Success Criteria
✅ All 50+ tests pass  
✅ No 403 errors for authorized users  
✅ Appropriate 403 for unauthorized users  
✅ No data corruption  
✅ No cross-student data leaks  
✅ All Staff → Student flows working  

---

**Next Phase**: PHASE 4 - RBAC & Role Validation  
**Timeline**: Execute tests and document results
