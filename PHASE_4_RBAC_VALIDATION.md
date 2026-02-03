# PHASE 4: RBAC & ROLE VALIDATION TEST
## Role-Based Access Control Matrix Verification

**Date**: December 18, 2025  
**Status**: READY FOR EXECUTION  
**Objective**: Verify all 5 roles have correct permissions across all endpoints

---

## 👥 ROLES MATRIX

| Role | Type | Permissions | Can Manage | Can View |
|------|------|------------|-----------|----------|
| **Admin** | System | Full access | Everything | Everything |
| **Manager** | Staff | Student/Attendance/Feedback | Assigned classes | All assigned data |
| **Founder** | Staff | Override permissions | Own school data | All |
| **Teacher** | Staff | Limited by permissions | Own classes | Own classes |
| **Sales** | Staff | Payments only | Payments | Revenue reports |
| **Student** | User | None (read-only) | Own data | Own records |
| **Parent** | User | Feedback comments | Child feedback | Child records |

---

## 🔐 PERMISSION MATRIX

### API Endpoints vs Roles

| Endpoint | Admin | Manager | Founder | Teacher | Sales | Student | Parent |
|----------|-------|---------|---------|---------|-------|---------|--------|
| POST /api/students | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/students | ✅ | ✅ | ✅ | ⚠️* | ❌ | ❌ | ❌ |
| PUT /api/students/:id | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| DELETE /api/students/:id | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /api/attendance | ✅ | ✅ | ✅ | ⚠️** | ❌ | ❌ | ❌ |
| GET /api/attendance | ✅ | ✅ | ✅ | ⚠️* | ❌ | ⚠️*** | ❌ |
| POST /api/feedback | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /api/feedback | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| PUT /api/feedback/:id/parent-comment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| DELETE /api/feedback/:id | ✅ | ✅ | ✅ | ⚠️**** | ❌ | ❌ | ❌ |
| POST /api/exams | ✅ | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| GET /api/exams | ✅ | ✅ | ✅ | ⚠️* | ❌ | ⚠️*** | ❌ |
| POST /api/payments | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| GET /api/payments | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️*** | ⚠️*** |
| POST /api/settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend**:
- ✅ = Full access
- ⚠️ = Limited access (with conditions)
- ❌ = No access (403 Forbidden)
- \* = Only assigned students
- \*\* = Only within time window
- \*\*\* = Only own data
- \*\*\*\* = Only own feedback

---

## 🧪 RBAC TEST CASES

### TEST SET 1: ADMIN ROLE

#### Test 1.1: Admin Can Create Students
```
User: Admin
Endpoint: POST /api/students
Data: { name: "John", class: "10A", ... }
Expected: 201 Created ✅
```

#### Test 1.2: Admin Can View All Students
```
User: Admin
Endpoint: GET /api/students
Expected: 200 OK, all students returned ✅
```

#### Test 1.3: Admin Can Delete Students
```
User: Admin
Endpoint: DELETE /api/students/STU001
Expected: 200 OK ✅
```

#### Test 1.4: Admin Can Access All Payments
```
User: Admin
Endpoint: GET /api/payments
Expected: 200 OK, all payments ✅
```

#### Test 1.5: Admin Can Change System Settings
```
User: Admin
Endpoint: POST /api/settings
Data: { academicYear: "2025-2026", ... }
Expected: 200 OK ✅
```

---

### TEST SET 2: MANAGER ROLE

#### Test 2.1: Manager Can Create Students
```
User: Manager
Endpoint: POST /api/students
Expected: 201 Created ✅
```

#### Test 2.2: Manager Can View Assigned Students Only
```
User: Manager (assigned to 10A)
Endpoint: GET /api/students?class=10A
Expected: 200 OK, class 10A students ✅

Endpoint: GET /api/students?class=11A
Expected: 200 OK, but only 10A students returned ✅
```

#### Test 2.3: Manager Cannot Delete Students
```
User: Manager
Endpoint: DELETE /api/students/STU001
Expected: 403 Forbidden ❌
```

#### Test 2.4: Manager Can Manage Attendance
```
User: Manager
Endpoint: POST /api/attendance
Expected: 201 Created ✅
```

#### Test 2.5: Manager Cannot Change System Settings
```
User: Manager
Endpoint: POST /api/settings
Expected: 403 Forbidden ❌
```

---

### TEST SET 3: FOUNDER ROLE

#### Test 3.1: Founder Displays Correct Role
```
User: Founder
Check: localStorage.user.role === 'founder' ✅
Check: UI shows "Founder" not "Teacher" ✅
```

#### Test 3.2: Founder Can Create Exams
```
User: Founder
Endpoint: POST /api/exams
Expected: 201 Created ✅
```

#### Test 3.3: Founder Can Override Manager Restrictions
```
User: Founder
Endpoint: DELETE /api/students/STU001
Expected: 200 OK ✅
```

#### Test 3.4: Founder Can View All Modules
```
User: Founder
Endpoints: All read endpoints
Expected: 200 OK for all ✅
```

---

### TEST SET 4: TEACHER ROLE

#### Test 4.1: Teacher Can Record Attendance
```
User: Teacher
Endpoint: POST /api/attendance
Data: { student: "STU001", status: "present", ... }
Expected: 201 Created ✅
(only for assigned students/classes)
```

#### Test 4.2: Teacher Cannot Record Attendance for Other Teacher's Students
```
User: Teacher A
Endpoint: POST /api/attendance
Data: { student: "STU_NOT_ASSIGNED", ... }
Expected: 403 Forbidden ❌
```

#### Test 4.3: Teacher Can Submit Feedback
```
User: Teacher
Endpoint: POST /api/feedback
Data: { student: "STU001", grade: "A", ... }
Expected: 201 Created ✅
```

#### Test 4.4: Teacher Can Delete Own Feedback
```
User: Teacher A
Endpoint: DELETE /api/feedback/FEEDBACK_BY_A
Expected: 200 OK ✅

Endpoint: DELETE /api/feedback/FEEDBACK_BY_B
Expected: 403 Forbidden ❌
```

#### Test 4.5: Teacher Cannot Create Payments
```
User: Teacher
Endpoint: POST /api/payments
Expected: 403 Forbidden ❌
```

#### Test 4.6: Teacher Can View Own Timetable
```
User: Teacher
Endpoint: GET /api/scheduler?teacher=TEACHER_ID
Expected: 200 OK ✅
```

#### Test 4.7: Teacher Cannot View Other Teachers' Timetables
```
User: Teacher A
Endpoint: GET /api/scheduler?teacher=TEACHER_B_ID
Expected: 403 Forbidden or empty ❌
```

---

### TEST SET 5: SALES ROLE

#### Test 5.1: Sales Can Create Payments
```
User: Sales
Endpoint: POST /api/payments
Expected: 201 Created ✅
```

#### Test 5.2: Sales Can View Revenue Reports
```
User: Sales
Endpoint: GET /api/payments/analytics
Expected: 200 OK, revenue data ✅
```

#### Test 5.3: Sales Cannot Create Students
```
User: Sales
Endpoint: POST /api/students
Expected: 403 Forbidden ❌
```

#### Test 5.4: Sales Cannot Modify Attendance
```
User: Sales
Endpoint: POST /api/attendance
Expected: 403 Forbidden ❌
```

---

### TEST SET 6: STUDENT ROLE

#### Test 6.1: Student Can View Own Attendance
```
User: Student
Endpoint: GET /api/attendance?student=SELF
Expected: 200 OK, own attendance ✅
```

#### Test 6.2: Student Cannot View Other Student's Attendance
```
User: Student A
Endpoint: GET /api/attendance?student=STUDENT_B
Expected: 403 Forbidden or filtered ❌
```

#### Test 6.3: Student Can View Own Feedback
```
User: Student
Endpoint: GET /api/feedback/student/SELF
Expected: 200 OK, own feedback ✅
```

#### Test 6.4: Student Can View Own Exam Results
```
User: Student
Endpoint: GET /api/exam-results?student=SELF
Expected: 200 OK, own results ✅
```

#### Test 6.5: Student Cannot Modify Any Data
```
User: Student
Endpoint: PUT /api/feedback (to edit grade)
Expected: 403 Forbidden ❌
```

#### Test 6.6: Student Can View Own Payments
```
User: Student
Endpoint: GET /api/payments?student=SELF
Expected: 200 OK, own payments ✅
```

#### Test 6.7: Student Cannot Create Payments
```
User: Student
Endpoint: POST /api/payments
Expected: 403 Forbidden ❌
```

---

### TEST SET 7: PARENT ROLE

#### Test 7.1: Parent Can View Child's Attendance
```
User: Parent
Endpoint: GET /api/attendance?student=CHILD_ID
Expected: 200 OK, child's attendance ✅
```

#### Test 7.2: Parent Can View Child's Feedback
```
User: Parent
Endpoint: GET /api/feedback/student/CHILD_ID
Expected: 200 OK, child's feedback ✅
```

#### Test 7.3: Parent Can Add Comments to Feedback
```
User: Parent
Endpoint: PUT /api/feedback/FEEDBACK_ID/parent-comment
Data: { parentComments: "Great work!" }
Expected: 200 OK ✅
```

#### Test 7.4: Parent Cannot Add Comments to Non-Child's Feedback
```
User: Parent A (child is STU001)
Endpoint: PUT /api/feedback/FEEDBACK_OF_STU002/parent-comment
Expected: 403 Forbidden ❌
```

#### Test 7.5: Parent Can View Child's Payments
```
User: Parent
Endpoint: GET /api/payments?student=CHILD_ID
Expected: 200 OK, child's payments ✅
```

#### Test 7.6: Parent Cannot View Other Child's Payments (if multiple)
```
User: Parent (child is STU001)
Endpoint: GET /api/payments?student=STU002
Expected: 403 Forbidden or filtered ❌
```

#### Test 7.7: Parent Cannot Modify Data
```
User: Parent
Endpoint: PUT /api/payments/PAYMENT_ID
Expected: 403 Forbidden ❌
```

---

## 🔍 PERMISSION MIDDLEWARE VALIDATION

### Test M.1: Middleware Accepts Teachers
```
Endpoint: POST /api/feedback (protected by checkPermission)
User: Teacher with canCreateFeedback=true
Expected: 200/201 ✅
```

### Test M.2: Middleware Accepts Parents for Feedback
```
Endpoint: PUT /api/feedback/ID/parent-comment
User: Parent (req.userType='parent')
Expected: 200 ✅
```

### Test M.3: Middleware Rejects Unauthorized Teachers
```
Endpoint: POST /api/feedback
User: Teacher without canCreateFeedback=true
Expected: 403 Forbidden ❌
```

### Test M.4: Middleware Accepts Admins Everywhere
```
Endpoints: All protected endpoints
User: Admin
Expected: 200/201 for all ✅
```

### Test M.5: Middleware Handles Missing Permissions Gracefully
```
Endpoint: POST /api/feedback
User: Teacher with permissions=null
Expected: 403 with message ❌
```

---

## 📋 RBAC TEST EXECUTION SUMMARY

### Total RBAC Tests: 45+

### By Role:
- Admin: 5 tests
- Manager: 5 tests
- Founder: 4 tests
- Teacher: 7 tests
- Sales: 4 tests
- Student: 7 tests
- Parent: 7 tests
- Middleware: 5 tests

### Success Criteria
✅ All authorized users get 200/201  
✅ All unauthorized users get 403  
✅ No permission bypasses  
✅ No accidental access to other users' data  
✅ Consistent permission enforcement across all endpoints  
✅ Parent comments work for feedback  
✅ Student own-data access works  

---

## 🔄 NEXT STEPS

1. Execute all RBAC tests
2. Document any permission gaps
3. Fix any bypasses found
4. Proceed to PHASE 5 (Responsiveness Testing)

---

**Status**: READY FOR EXECUTION  
**Last Updated**: December 18, 2025
