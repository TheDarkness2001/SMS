# ⚡ QUICK FIX CODE REFERENCE

**Status**: Ready-to-Implement Code Snippets  
**Version**: 1.0  
**Last Updated**: December 18, 2025

---

## 🔴 CRITICAL FIX #1: Payment Validation

**File**: `/backend/controllers/paymentController.js`  
**Location**: Lines 70-95 (createPayment function)  
**Time**: 15 minutes

### Current Code (BROKEN):
```javascript
exports.createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      recordedBy: req.user._id
    };

    // Generate receipt number if payment is marked as paid
    if (paymentData.status === 'paid') {
      paymentData.receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      paymentData.paidDate = new Date();
    }

    const payment = await Payment.create(paymentData);
    // ... rest
  }
};
```

### Fixed Code:
```javascript
exports.createPayment = async (req, res) => {
  try {
    // VALIDATE REQUIRED FIELDS
    const { student, amount, dueDate, subject, academicYear, term } = req.body;
    
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
      });
    }
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required'
      });
    }
    if (!term) {
      return res.status(400).json({
        success: false,
        message: 'Term is required'
      });
    }

    const paymentData = {
      ...req.body,
      recordedBy: req.user._id
    };

    // Generate receipt number if payment is marked as paid
    if (paymentData.status === 'paid') {
      paymentData.receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      paymentData.paidDate = new Date();
    }

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## 🔴 CRITICAL FIX #2: Payment Field Mismatch

**File**: `/backend/controllers/paymentController.js`  
**Location**: Lines 72-80  
**Time**: 10 minutes

### Fixed Code:
```javascript
exports.createPayment = async (req, res) => {
  try {
    // ... validation code from above ...

    const paymentData = {
      ...req.body,
      // Accept both 'method' (from frontend) and 'paymentMethod' (from backend)
      paymentMethod: req.body.paymentMethod || req.body.method || 'cash',
      recordedBy: req.user._id
    };

    // ... rest of code ...
  }
};
```

### Also Update in updatePayment:
```javascript
exports.updatePayment = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Accept both field names
    if (req.body.method && !req.body.paymentMethod) {
      updateData.paymentMethod = req.body.method;
    }

    // ... rest of code ...
  }
};
```

---

## 🔴 CRITICAL FIX #3: Parent Authentication

**File**: `/backend/middleware/auth.js`  
**Location**: Lines 94-122  
**Time**: 45 minutes

### Option A: Update checkPermission Middleware (RECOMMENDED)

```javascript
// Check specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // ALLOW BOTH TEACHERS AND PARENTS
    const isTeacher = req.userType === 'teacher';
    const isParent = req.userType === 'parent';
    
    if (!isTeacher && !isParent) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and parents can access this route'
      });
    }

    // Full access for managers and founders
    if (req.user.role === 'manager' || req.user.role === 'founder') {
      return next();
    }

    // Admins have access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // For parents on specific endpoints (feedback, comments)
    if (isParent) {
      // Parents can add feedback comments without permission check
      // They only need to verify they own the student record
      return next();
    }

    // Teachers: check permissions
    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};
```

### Option B: If Using Student Model for Parent (Simpler)

```javascript
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // Check if user is a teacher or a parent (student logging in as parent)
    const isTeacher = req.userType === 'teacher';
    const isStudent = req.userType === 'student';
    
    // Allow teachers to check permissions
    if (!isTeacher) {
      // For students/parents, allow certain endpoints
      // Check if request is for parent-specific operations
      const allowedParentEndpoints = [
        '/feedback',
        '/parent-comment'
      ];
      
      const isParentEndpoint = allowedParentEndpoints.some(endpoint => 
        req.originalUrl.includes(endpoint)
      );
      
      if (isParentEndpoint) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'User does not have permission to access this resource'
      });
    }

    // Full access for managers and founders
    if (req.user.role === 'manager' || req.user.role === 'founder') {
      return next();
    }

    // Admins have access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Teachers: check permissions
    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};
```

---

## 🟡 HIGH FIX #1: Fix Role Display in UI

**File**: `/frontend/src/pages/Timetable.jsx`  
**Location**: Search for `userType` display  
**Time**: 30 minutes

### Find and Replace:
```
OLD: currentUser?.userType
NEW: currentUser?.role
```

### Example Fix:
```javascript
// OLD CODE:
const userRole = currentUser?.userType;

// NEW CODE:
const userRole = currentUser?.role;

// Also update in any UI text that displays role:
{/* OLD */}
{currentUser?.userType === 'teacher' && <span>Teacher</span>}

{/* NEW */}
{currentUser?.role === 'founder' && <span>Founder</span>}
{currentUser?.role === 'admin' && <span>Admin</span>}
{currentUser?.role === 'manager' && <span>Manager</span>}
{currentUser?.role === 'teacher' && <span>Teacher</span>}
{currentUser?.role === 'sales' && <span>Sales</span>}
```

---

## 🟡 HIGH FIX #2: Payment Term Calculation

**File**: `/frontend/src/pages/Payments.jsx`  
**Location**: Lines 99-115 (handlePaymentSubmit)  
**Time**: 45 minutes

### Current Code (BROKEN):
```javascript
const paymentData = {
  student: selectedStudent._id,
  amount: Number(formData.amount),
  paymentType: 'tuition-fee',
  method: formData.method,
  notes: formData.note,
  dueDate: new Date(filters.year, filters.month - 1, 1),
  academicYear: `${filters.year}-${filters.year + 1}`,
  term: '1st-term', // ❌ HARDCODED
  subject: selectedSubject,
  month: filters.month,
  year: filters.year
};
```

### Fixed Code:
```javascript
// Add helper function at top of component
const calculateTerm = (month) => {
  if ([1, 2, 3, 4].includes(month)) return '1st-term';
  if ([5, 6, 7, 8].includes(month)) return '2nd-term';
  if ([9, 10, 11, 12].includes(month)) return '3rd-term';
  return '1st-term';
};

// In handlePaymentSubmit:
const paymentData = {
  student: selectedStudent._id,
  amount: Number(formData.amount),
  paymentType: 'tuition-fee',
  paymentMethod: formData.method, // Also fix field name
  notes: formData.note,
  dueDate: new Date(filters.year, filters.month - 1, 1),
  academicYear: `${filters.year}-${filters.year + 1}`,
  term: calculateTerm(filters.month), // ✅ CALCULATED
  subject: selectedSubject,
  month: filters.month,
  year: filters.year
};
```

---

## 🟡 HIGH FIX #3: Permission Refresh Endpoint

**File**: `/backend/routes/authRoutes.js`  
**Location**: Add new route  
**Time**: 1.5 hours

### Add New Route:
```javascript
const express = require('express');
const router = express.Router();
const { login, teacherLogin, studentLogin, getMe, refreshPermissions } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/teacher/login', teacherLogin);
router.post('/student/login', studentLogin);
router.get('/me', protect, getMe);
router.post('/refresh-permissions', protect, refreshPermissions); // NEW

module.exports = router;
```

### Add Controller Function:

**File**: `/backend/controllers/authController.js`

```javascript
// Add new export at end of file
exports.refreshPermissions = async (req, res) => {
  try {
    if (req.userType === 'teacher') {
      const teacher = await Teacher.findById(req.user._id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          role: teacher.role,
          permissions: teacher.permissions
        }
      });
    } else if (req.userType === 'parent' || req.userType === 'student') {
      // Parents/students have no special permissions
      res.status(200).json({
        success: true,
        data: {
          permissions: {}
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Update Frontend to Refresh:

**File**: `/frontend/src/utils/api.js`

```javascript
// Add to authAPI object
export const authAPI = {
  refreshPermissions: () => api.post('/auth/refresh-permissions'),
};
```

**File**: `/frontend/src/context/AuthContext.jsx` or relevant component

```javascript
// After admin updates permissions, call:
const { data } = await authAPI.refreshPermissions();
// Update local storage
const user = JSON.parse(localStorage.getItem('user'));
user.permissions = data.data.permissions;
localStorage.setItem('user', JSON.stringify(user));
```

---

## 🟠 MEDIUM FIX #1: Rate Limiting

**File**: `/backend/middleware/rateLimit.js` (CREATE NEW FILE)  
**Time**: 1 hour

### Create File: `/backend/middleware/rateLimit.js`

```javascript
const rateLimit = require('express-rate-limit');

// Rate limit for login endpoints (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Don't count successful requests
    return res.statusCode < 400;
  }
});

// Rate limit for API endpoints (moderate)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { loginLimiter, apiLimiter };
```

### Update Routes:

**File**: `/backend/routes/authRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { login, teacherLogin, studentLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit'); // ADD THIS

// Apply rate limiting to login routes
router.post('/login', loginLimiter, login);
router.post('/teacher/login', loginLimiter, teacherLogin);
router.post('/student/login', loginLimiter, studentLogin);
router.get('/me', protect, getMe);

module.exports = router;
```

### Apply to All Routes:

**File**: `/backend/server.js`

```javascript
const { apiLimiter } = require('./middleware/rateLimit');

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);
```

---

## 🟠 MEDIUM FIX #2: Input Sanitization

**File**: `/backend/middleware/sanitize.js` (CREATE NEW FILE)  
**Time**: 2 hours

### First, Install Package:
```bash
npm install xss
```

### Create File: `/backend/middleware/sanitize.js`

```javascript
const xss = require('xss');

const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      } else if (typeof req.body[key] === 'object' && req.body[key] !== null) {
        // Recursively sanitize nested objects
        req.body[key] = sanitizeObject(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }

  next();
};

function sanitizeObject(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

module.exports = sanitizeInput;
```

### Apply in Server:

**File**: `/backend/server.js`

```javascript
const express = require('express');
const app = express();
const sanitizeInput = require('./middleware/sanitize'); // ADD THIS

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput); // ADD THIS - Should be after body parser

// ... rest of middleware and routes ...
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Day 1)
- [ ] Add payment validation (15 min)
- [ ] Fix paymentMethod field (10 min)
- [ ] Update checkPermission middleware (45 min)
- [ ] Test all critical fixes (30 min)

### Phase 2: High Priority (Day 2)
- [ ] Fix role display in UI (30 min)
- [ ] Implement term calculation (45 min)
- [ ] Add permission refresh endpoint (1.5 hours)
- [ ] Test all high priority fixes (30 min)

### Phase 3: Medium Priority (Days 3-4)
- [ ] Implement rate limiting (1 hour)
- [ ] Add input sanitization (2 hours)
- [ ] Full regression testing (2-4 hours)
- [ ] Final security review (1 hour)

---

## 🧪 QUICK TEST COMMANDS

### Test Payment Validation:
```bash
curl -X POST http://localhost:5002/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"student":"STU001","amount":100}'
# Should return 400 with error about missing dueDate
```

### Test Parent Feedback Comment:
```bash
curl -X PUT http://localhost:5002/api/feedback/FEEDBACK_ID/parent-comment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARENT_TOKEN" \
  -d '{"parentComments":"Great progress!"}'
# Should return 200, not 403
```

### Test Rate Limiting:
```bash
# Run 10 login attempts rapidly
for i in {1..10}; do
  curl -X POST http://localhost:5002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@school.com","password":"wrong"}'
done
# After 5 attempts, should get 429 Too Many Requests
```

---

## ✅ VERIFICATION CHECKLIST

After implementing all fixes:

- [ ] All CRITICAL issues fixed and tested
- [ ] All HIGH priority issues fixed and tested
- [ ] All MEDIUM priority issues fixed and tested
- [ ] Payment creation validates all required fields
- [ ] Parent can add feedback comments (200 response)
- [ ] Student can view own payments (200 response)
- [ ] Founder shows correct role in UI
- [ ] Payment term calculated correctly
- [ ] Permission refresh works (admin updates → immediate effect or after refresh)
- [ ] Rate limiting blocks excessive requests
- [ ] XSS injection attempts sanitized
- [ ] No 500 errors for validation failures
- [ ] All API responses have proper error messages

---

**Document Version**: 1.0  
**Created**: December 18, 2025  
**Status**: Ready for Implementation
