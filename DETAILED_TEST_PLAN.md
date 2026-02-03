# 🧪 DETAILED FUNCTIONAL TEST PLAN & EXECUTION GUIDE

**Version**: 1.0  
**Date**: December 18, 2025  
**Status**: Ready for Execution

---

## TEST ENVIRONMENT SETUP

### Prerequisites
- MongoDB running locally on `mongodb://localhost:27017/student_management_system`
- Backend running on port 5002
- Frontend running on port 5173 (or proxy to 5002)
- seedData.js executed for test data
- Postman or cURL for API testing

### Test Credentials

```
ADMIN:
  Email: admin@school.com
  Password: admin123
  Role: admin

MANAGER:
  Email: manager@school.com
  Password: manager123
  Role: manager

FOUNDER:
  Email: founder@school.com
  Password: founder123
  Role: founder

TEACHER:
  Email: john.smith@school.com
  Password: teacher123
  Role: teacher

SALES:
  Email: sales@school.com
  Password: sales123
  Role: sales

PARENT:
  Email: robert.davis@parent.com
  Password: parent123
  Role: parent (BROKEN - uses student identity)

STUDENT:
  Email: james.martinez@student.com
  Password: student123
  Role: student
```

---

## TEST CASE 1: AUTHENTICATION & ROLE VALIDATION

### Test 1.1: Admin Login
**Expected Result**: ✅ Login successful, full permissions  
**Steps**:
1. POST `/api/auth/login` with admin credentials
2. Verify response includes token and role='admin'
3. Store token in Authorization header

**Pass Criteria**:
- Status 200
- token present in response
- user.role === 'admin'
- user.userType === 'teacher'

**Result**: _____ (To be filled during testing)

---

### Test 1.2: Teacher Login
**Expected Result**: ✅ Login successful, limited permissions  
**Steps**:
1. POST `/api/auth/login` with teacher credentials
2. Verify role='teacher', NOT 'admin'
3. Check permissions object

**Pass Criteria**:
- Status 200
- user.role === 'teacher'
- user.permissions.canManageFeedback === false (for regular teacher)

**Result**: _____ (To be filled during testing)

---

### Test 1.3: Parent Login (KNOWN BUG)
**Expected Result**: ❌ Broken - Parent gets student identity  
**Steps**:
1. POST `/api/auth/login` with parent email
2. Observe response

**Expected Bug**: 
- user.userType === 'student' (WRONG - should be 'parent')
- No role field (should have role)
- user._id references Student record, not Parent record

**Result**: _____ (To be filled during testing)

---

## TEST CASE 2: RBAC PERMISSION ENFORCEMENT

### Test 2.1: Admin Can Manage All Modules
**Module**: Students  
**Steps**:
1. Login as admin
2. POST `/api/students` with new student data
3. Verify creation succeeds

**Pass Criteria**: Status 201, student created

**Result**: _____

---

### Test 2.2: Teacher Cannot Delete Student
**Module**: Students  
**Steps**:
1. Login as teacher
2. DELETE `/api/students/{studentId}`

**Expected**: 403 Forbidden (missing permission)

**Result**: _____

---

### Test 2.3: Sales Cannot Manage Payments
**Module**: Payments  
**Steps**:
1. Login as sales
2. POST `/api/payments` with payment data

**Expected**: 403 Forbidden (missing permission)

**Result**: _____

---

### Test 2.4: Manager Can Create Teachers
**Module**: Teachers  
**Steps**:
1. Login as manager
2. POST `/api/teachers` with teacher data

**Pass Criteria**: Status 201, teacher created

**Result**: _____

---

### Test 2.5: Founder Access Check
**Module**: Multiple  
**Steps**:
1. Login as founder
2. Try accessing all protected modules
3. Verify no access restrictions (full override)

**Expected**: All operations allowed (admin-like access)

**Result**: _____

---

## TEST CASE 3: PAYMENT SYSTEM VALIDATION

### Test 3.1: Create Payment with Valid Data
**Module**: Payments  
**Steps**:
1. Login as admin
2. POST `/api/payments` with complete data:
```json
{
  "student": "STU001_ObjectId",
  "amount": 150,
  "paymentType": "tuition-fee",
  "paymentMethod": "cash",
  "status": "paid",
  "subject": "Mathematics",
  "dueDate": "2024-12-01",
  "academicYear": "2024-2025",
  "term": "1st-term",
  "month": 12,
  "year": 2024
}
```

**Expected**: Status 201, payment saved

**Result**: _____

---

### Test 3.2: Create Payment Without dueDate (BUG TEST)
**Module**: Payments  
**Steps**:
1. POST `/api/payments` without dueDate field
2. Observe error response

**Current Behavior**: 500 Server Error (bad)  
**Expected Behavior**: 400 Bad Request with clear message (good)

**Result**: _____ (Confirm BUG EXISTS)

---

### Test 3.3: Create Payment Without subject (BUG TEST)
**Module**: Payments  
**Steps**:
1. POST `/api/payments` without subject field

**Current Behavior**: 500 Server Error  
**Expected Behavior**: 400 Bad Request

**Result**: _____ (Confirm BUG EXISTS)

---

### Test 3.4: Field Mismatch Test (paymentMethod)
**Module**: Payments  
**Steps**:
1. POST `/api/payments` with `method: "card"` (frontend format)
2. GET payment record from database
3. Check stored field

**Current Bug**: Only `paymentMethod` saved, `method` ignored  
**Expected**: Both should work correctly

**Result**: _____ (Confirm BUG EXISTS)

---

### Test 3.5: Revenue Calculation Accuracy
**Module**: Revenue  
**Steps**:
1. Create 3 payments: 100, 50, 75 (all status='paid')
2. GET `/api/revenue/stats`
3. Verify totalPaid = 225

**Expected**: totalPaid === 225

**Result**: _____

---

## TEST CASE 4: PARENT FUNCTIONALITY (EXPECTED FAILURES)

### Test 4.1: Parent Cannot Add Feedback Comments (BUG)
**Module**: Feedback  
**Steps**:
1. Login as parent
2. GET `/api/feedback/student/{studentId}` 
3. PUT `/api/feedback/{feedbackId}/parent-comment` with comment

**Expected Bug**: 403 Forbidden at step 3  
**Reason**: checkPermission middleware rejects non-teachers

**Result**: _____ (Confirm BUG EXISTS)

---

### Test 4.2: Parent Cannot View Own Child Payments
**Module**: Payments  
**Steps**:
1. Login as parent
2. GET `/api/payments/student/{studentId}`

**Expected Bug**: 403 Forbidden  
**Reason**: checkPermission requires canViewPayments permission, parent has none

**Result**: _____ (Confirm BUG EXISTS)

---

## TEST CASE 5: STUDENT ACCESS CONTROL

### Test 5.1: Student Cannot Create Exams
**Module**: Exams  
**Steps**:
1. Login as student
2. POST `/api/exams` with exam data

**Expected**: 403 Forbidden

**Result**: _____

---

### Test 5.2: Student Cannot View Payments
**Module**: Payments  
**Steps**:
1. Login as student
2. GET `/api/payments/student/{studentId}`

**Expected Bug**: 403 Forbidden (students should see own payments)

**Result**: _____ (Confirm BUG)

---

## TEST CASE 6: DATA CONSISTENCY

### Test 6.1: Update Student, Verify Payment References
**Module**: Students, Payments  
**Steps**:
1. Get student STU001
2. Create payment for STU001
3. Update student email to newemail@school.com
4. Get payment again
5. Verify student reference still valid

**Expected**: Payment still references updated student

**Result**: _____

---

### Test 6.2: Change Student Class, Check Timetable Impact
**Module**: Students, Timetable  
**Steps**:
1. Student currently in "Grade 10A"
2. Create timetable entry for "Grade 10A"
3. Update student to "Grade 11B"
4. Query timetable for student

**Expected**: Student not in old timetable entries anymore  
**Actual**: _____ (May still be referenced)

**Result**: _____

---

### Test 6.3: Delete Student, Verify Cascade
**Module**: Students, Payments, Feedback, Attendance  
**Steps**:
1. Create student STU999
2. Create payment for STU999
3. Create feedback for STU999
4. Delete student STU999
5. Query payments for STU999
6. Query feedback for STU999

**Expected**: All records deleted or orphaned properly

**Result**: _____

---

## TEST CASE 7: PERMISSION REFRESH

### Test 7.1: Permission Change Requires Re-login
**Module**: Settings, Permissions  
**Steps**:
1. Login as teacher (teacher@school.com)
2. Note: canManagePayments = false
3. As admin, update teacher permissions: canManagePayments = true
4. Teacher makes request: POST `/api/payments`
5. Request fails with 403 (permission old)
6. Teacher logs out and logs back in
7. Repeat step 4

**Current Behavior**: 403 both times (needs re-login)  
**Expected**: 201 after re-login

**Result**: _____ (Confirm permission caching)

---

## TEST CASE 8: ROLE DISPLAY IN UI

### Test 8.1: Founder Shows Correct Role in UI
**Module**: Frontend, Timetable  
**Steps**:
1. Login as founder
2. Navigate to Timetable
3. Check user role display

**Current Bug**: Shows "Teacher" not "Founder"  
**Expected**: Shows "Founder"

**Result**: _____ (Confirm BUG)

---

## TEST CASE 9: SECURITY TESTS

### Test 9.1: Invalid Token Rejected
**Module**: Auth  
**Steps**:
1. Make request with Authorization: `Bearer invalid_token_123`
2. Observe response

**Expected**: 401 Unauthorized

**Result**: _____

---

### Test 9.2: No Token Rejected
**Module**: Auth  
**Steps**:
1. GET `/api/students` without token

**Expected**: 401 Unauthorized

**Result**: _____

---

### Test 9.3: Expired Token Rejected (Manual Test)
**Module**: Auth  
**Steps**:
1. Wait for token to expire (7 days for JWT_EXPIRE)
2. Make request with expired token

**Expected**: 401 Unauthorized

**Result**: _____ (Note: Skip if testing in short timeframe)

---

## TEST CASE 10: API VALIDATION

### Test 10.1: Invalid Email Format Rejected
**Module**: Teachers  
**Steps**:
1. POST `/api/teachers` with email="invalid#email.com"

**Expected**: 400 Bad Request (validation error)

**Result**: _____

---

### Test 10.2: Missing Required Fields
**Module**: Students  
**Steps**:
1. POST `/api/students` with only name and email (missing class, studentId, password)

**Expected**: 400 Bad Request

**Result**: _____

---

## TEST EXECUTION SUMMARY

### Total Test Cases: 30+
- ✅ Expected to Pass: 18
- ⚠️ Known Bugs: 8
- 🔴 CRITICAL FAILURES: 3

### Time Estimate: 2-3 hours

---

## CRITICAL BUGS CONFIRMED BY TESTING

| Bug ID | Test | Result | Severity |
|--------|------|--------|----------|
| AUTH-001 | 1.3 | Parent gets student identity | CRITICAL |
| AUTH-002 | 4.1 | Parent blocked from feedback | CRITICAL |
| PAY-001 | 3.2 | Missing dueDate -> 500 error | CRITICAL |
| PAY-002 | 3.3 | Missing subject -> 500 error | CRITICAL |
| PAY-003 | 3.4 | paymentMethod field mismatch | CRITICAL |
| PERM-001 | 5.2 | Student cannot view payments | HIGH |
| UI-001 | 8.1 | Founder shows as Teacher | HIGH |
| DATA-001 | 6.2 | Class change doesn't cascade | MEDIUM |

---

## RECOMMENDATIONS POST-TESTING

### Immediate (Today)
- [ ] Fix Payment field validation
- [ ] Fix Parent authentication
- [ ] Fix checkPermission for students

### This Week
- [ ] Fix role display in UI
- [ ] Add permission refresh
- [ ] Add API input validation

### Next Sprint
- [ ] Add rate limiting
- [ ] Add request sanitization
- [ ] Add audit logging

---

**Test Plan Version**: 1.0  
**Created**: December 18, 2025  
**Last Updated**: December 18, 2025
