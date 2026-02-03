# PHASE 7: EDGE CASES & BOUNDARY TESTING

**Date**: December 18, 2025  
**Status**: READY FOR EXECUTION  
**Objective**: Test system behavior with invalid, empty, and extreme inputs

---

## 🚫 NULL/EMPTY INPUT TESTS

### Test E.1: Empty Student Name
```
Scenario: Create student with name=""
Expected: 400 Bad Request, "Name is required"
Result: [ ] PASS / [ ] FAIL
```

### Test E.2: Empty Feedback Comments
```
Scenario: Submit feedback with comments=""
Expected: 400 or allow (depends on business logic)
Result: [ ] PASS / [ ] FAIL
```

### Test E.3: Missing Required Fields
```
Scenario: POST /api/payments { amount: 100 } (missing dueDate, subject, etc)
Expected: 400 Bad Request with list of missing fields
Result: [ ] PASS / [ ] FAIL
```

### Test E.4: Null Foreign Keys
```
Scenario: Create feedback with student=null
Expected: 400 Bad Request or 500 with clear error
Result: [ ] PASS / [ ] FAIL
```

### Test E.5: Empty Date
```
Scenario: Create payment with dueDate=""
Expected: 400 Bad Request, "Invalid date"
Result: [ ] PASS / [ ] FAIL
```

---

## 🔢 NUMERIC BOUNDARY TESTS

### Test E.6: Zero Amount Payment
```
Scenario: Create payment with amount=0
Expected: 400 Bad Request, "Amount must be greater than 0"
Result: [ ] PASS / [ ] FAIL
```

### Test E.7: Negative Amount
```
Scenario: Create payment with amount=-100
Expected: 400 Bad Request, "Amount must be positive"
Result: [ ] PASS / [ ] FAIL
```

### Test E.8: Very Large Amount
```
Scenario: Create payment with amount=999999999
Expected: 201 Created (or 400 if business limit set)
Result: [ ] PASS / [ ] FAIL
```

### Test E.9: Decimal Amount
```
Scenario: Create payment with amount=100.50
Expected: 201 Created, stored as 100.50
Result: [ ] PASS / [ ] FAIL
```

### Test E.10: Invalid Grade Value
```
Scenario: Submit feedback with grade="Z" or grade=150
Expected: 400 Bad Request, "Invalid grade"
Result: [ ] PASS / [ ] FAIL
```

### Test E.11: Percentage > 100
```
Scenario: Submit feedback with percentage=150
Expected: 400 Bad Request or 201 (depends on validation)
Result: [ ] PASS / [ ] FAIL
```

### Test E.12: Negative Percentage
```
Scenario: Submit feedback with percentage=-10
Expected: 400 Bad Request
Result: [ ] PASS / [ ] FAIL
```

---

## 📅 DATE BOUNDARY TESTS

### Test E.13: Future Date as Payment Due
```
Scenario: dueDate = 2099-12-31
Expected: 201 Created (valid future date)
Result: [ ] PASS / [ ] FAIL
```

### Test E.14: Past Date as Payment Due
```
Scenario: dueDate = 2020-01-01
Expected: 400 or 201 (depends on business logic)
Result: [ ] PASS / [ ] FAIL
```

### Test E.15: Invalid Date Format
```
Scenario: dueDate = "2025-13-45" (invalid month/day)
Expected: 400 Bad Request, "Invalid date format"
Result: [ ] PASS / [ ] FAIL
```

### Test E.16: Leap Year Date
```
Scenario: dueDate = "2024-02-29" (leap year, valid)
Expected: 201 Created
Result: [ ] PASS / [ ] FAIL
```

### Test E.17: Non-leap Year Feb 29
```
Scenario: dueDate = "2023-02-29" (not leap year)
Expected: 400 Bad Request, "Invalid date"
Result: [ ] PASS / [ ] FAIL
```

### Test E.18: Current Date + Exact Time
```
Scenario: Attendance recording at class end time (30-min window)
Expected: 201 Created
Result: [ ] PASS / [ ] FAIL
```

### Test E.19: 31 Minutes After Class
```
Scenario: Attendance recording 31 minutes after class end
Expected: 400 Bad Request, "Outside submission window"
Result: [ ] PASS / [ ] FAIL
```

---

## 📝 STRING BOUNDARY TESTS

### Test E.20: Very Long String
```
Scenario: Feedback comments = 10000 characters
Expected: 201 Created or truncated
Result: [ ] PASS / [ ] FAIL
```

### Test E.21: Special Characters in Name
```
Scenario: Student name = "John O'Brien-Smith"
Expected: 201 Created, stored correctly
Result: [ ] PASS / [ ] FAIL
```

### Test E.22: Unicode Characters
```
Scenario: Student name = "张三" (Chinese)
Expected: 201 Created, stored correctly
Result: [ ] PASS / [ ] FAIL
```

### Test E.23: HTML/Script in Comments
```
Scenario: Feedback comments = "<script>alert('xss')</script>"
Expected: Sanitized, stored as plain text
Result: [ ] PASS / [ ] FAIL
```

### Test E.24: SQL Injection Attempt
```
Scenario: Student name = "'; DROP TABLE students; --"
Expected: Escaped/sanitized, stored as literal string
Result: [ ] PASS / [ ] FAIL
```

### Test E.25: Very Long Email
```
Scenario: Email = "verylongemail..." (>255 chars)
Expected: 400 Bad Request or truncated
Result: [ ] PASS / [ ] FAIL
```

### Test E.26: Invalid Email Format
```
Scenario: Email = "notanemail"
Expected: 400 Bad Request, "Invalid email"
Result: [ ] PASS / [ ] FAIL
```

---

## 🆔 ID/REFERENCE BOUNDARY TESTS

### Test E.27: Non-existent Student ID
```
Scenario: Create feedback with student="NONEXISTENT"
Expected: 404 Not Found or 400 Bad Request
Result: [ ] PASS / [ ] FAIL
```

### Test E.28: Invalid Format Student ID
```
Scenario: Create feedback with student=""
Expected: 400 Bad Request
Result: [ ] PASS / [ ] FAIL
```

### Test E.29: SQL Injection in ID
```
Scenario: GET /api/feedback/'; DROP TABLE feedback; --
Expected: Escaped, treated as literal ID, 404
Result: [ ] PASS / [ ] FAIL
```

### Test E.30: Extremely Long ID
```
Scenario: GET /api/students/aaaaaaaaaaaaaaa...(1000+ chars)
Expected: 400 Bad Request or 404
Result: [ ] PASS / [ ] FAIL
```

---

## 🔐 AUTHENTICATION BOUNDARY TESTS

### Test E.31: Missing Authorization Header
```
Scenario: GET /api/students (no Bearer token)
Expected: 401 Unauthorized
Result: [ ] PASS / [ ] FAIL
```

### Test E.32: Invalid Token Format
```
Scenario: Authorization: "Bearernotavalidtoken"
Expected: 401 Unauthorized
Result: [ ] PASS / [ ] FAIL
```

### Test E.33: Expired Token
```
Scenario: Use token that expired 1 day ago
Expected: 401 Unauthorized, "Token expired"
Result: [ ] PASS / [ ] FAIL
```

### Test E.34: Token from Different User
```
Scenario: Use Student's token to access Teacher endpoint
Expected: 401 or 403
Result: [ ] PASS / [ ] FAIL
```

### Test E.35: Malformed JWT
```
Scenario: Authorization: "Bearer eyJhbGc....(corrupted)"
Expected: 401 Unauthorized
Result: [ ] PASS / [ ] FAIL
```

---

## 🔄 DUPLICATE OPERATION TESTS

### Test E.36: Duplicate Attendance Record
```
Scenario: Record attendance twice for same student/class/date
Expected: 400 or 201 (depends on logic - should prevent duplicates)
Result: [ ] PASS / [ ] FAIL
```

### Test E.37: Duplicate Student Name in Class
```
Scenario: Two students with identical name in same class
Expected: 201 for both (names not unique)
Result: [ ] PASS / [ ] FAIL
```

### Test E.38: Duplicate Payment for Student
```
Scenario: Create payment twice for same student/subject/term
Expected: 201 for both or 400 (depends on business logic)
Result: [ ] PASS / [ ] FAIL
```

### Test E.39: Duplicate Exam Name
```
Scenario: Create exam with same name/date/class twice
Expected: 201 for both or 400
Result: [ ] PASS / [ ] FAIL
```

---

## 🔀 ENUM/CHOICE BOUNDARY TESTS

### Test E.40: Invalid Attendance Status
```
Scenario: POST attendance with status="maybe"
Expected: 400 Bad Request, "Invalid status (present/absent/late/half-day)"
Result: [ ] PASS / [ ] FAIL
```

### Test E.41: Invalid Payment Status
```
Scenario: POST payment with status="refunded"
Expected: 400 Bad Request, "Invalid status"
Result: [ ] PASS / [ ] FAIL
```

### Test E.42: Invalid Payment Method
```
Scenario: POST payment with paymentMethod="crypto"
Expected: 400 Bad Request or 201 (depends on allowed methods)
Result: [ ] PASS / [ ] FAIL
```

### Test E.43: Invalid Class Name
```
Scenario: Create student with class="99Z"
Expected: 400 Bad Request or 201 (depends on validation)
Result: [ ] PASS / [ ] FAIL
```

---

## 🌐 CONCURRENT/RACE CONDITION TESTS

### Test E.44: Simultaneous Duplicate Prevention
```
Scenario: Two requests for duplicate attendance simultaneously
Expected: One succeeds, one fails with duplicate error
Result: [ ] PASS / [ ] FAIL
```

### Test E.45: Read-During-Update
```
Scenario: Read payment while it's being updated
Expected: Either old or new data, never partial/corrupt
Result: [ ] PASS / [ ] FAIL
```

### Test E.46: Update During Delete
```
Scenario: Update feedback while deletion in progress
Expected: One operation succeeds, other fails gracefully
Result: [ ] PASS / [ ] FAIL
```

---

## 🔍 PERMISSION BOUNDARY TESTS

### Test E.47: Teacher Delete Other's Feedback
```
Scenario: Teacher A tries DELETE on Teacher B's feedback
Expected: 403 Forbidden, feedback intact
Result: [ ] PASS / [ ] FAIL
```

### Test E.48: Student Modify Own Data
```
Scenario: Student tries PUT /api/students/SELF
Expected: 403 Forbidden
Result: [ ] PASS / [ ] FAIL
```

### Test E.49: Parent View Unrelated Child
```
Scenario: Parent tries GET /api/attendance?student=UNRELATED
Expected: 403 Forbidden or empty
Result: [ ] PASS / [ ] FAIL
```

### Test E.50: Missing Permission Header
```
Scenario: Teacher without canCreateFeedback tries POST feedback
Expected: 403 Forbidden
Result: [ ] PASS / [ ] FAIL
```

---

## 📡 NETWORK/TIMEOUT BOUNDARY TESTS

### Test E.51: Slow Database
```
Scenario: Database takes 10+ seconds to respond
Expected: Request timeout after configured duration
Result: [ ] PASS / [ ] FAIL
```

### Test E.52: Connection Interrupted
```
Scenario: Network connection drops mid-request
Expected: Error response, no data corruption
Result: [ ] PASS / [ ] FAIL
```

### Test E.53: Payload Too Large
```
Scenario: POST with 10MB payload
Expected: 413 Payload Too Large
Result: [ ] PASS / [ ] FAIL
```

---

## 💥 ERROR HANDLING TESTS

### Test E.54: 500 Error Should Not Leak Sensitive Data
```
Scenario: Force 500 error (e.g., division by zero)
Expected: Generic error message, no stack trace
Result: [ ] PASS / [ ] FAIL
```

### Test E.55: 404 Shouldn't Leak System Info
```
Scenario: Try non-existent endpoint
Expected: 404 Not Found, generic message
Result: [ ] PASS / [ ] FAIL
```

### Test E.56: Error Messages Consistent
```
Scenario: Trigger same error multiple times
Expected: Same error message each time
Result: [ ] PASS / [ ] FAIL
```

---

## 📊 EDGE CASE TEST SUMMARY

### Total Tests: 56

### Categories:
- Null/Empty: 5 tests
- Numeric: 7 tests
- Date: 7 tests
- String: 7 tests
- ID/Reference: 4 tests
- Authentication: 5 tests
- Duplicate: 4 tests
- Enum: 4 tests
- Concurrent: 3 tests
- Permission: 4 tests
- Network: 3 tests
- Error Handling: 3 tests

### Success Criteria
✅ Invalid inputs rejected with 400/403 status  
✅ No 500 errors for bad input  
✅ Clear error messages  
✅ No data corruption  
✅ No security vulnerabilities (XSS, SQL injection)  
✅ Duplicate prevention works  
✅ Permission checks enforced  
✅ Graceful timeout handling  

---

**Status**: READY FOR EXECUTION  
**Last Updated**: December 18, 2025
