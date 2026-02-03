# Financial-Grade Wallet-Based Payment System

## Overview
This implementation provides a comprehensive, auditable, wallet-based payment system for the education management platform with support for per-class pricing, attendance-based financial actions, and teacher salary management.

## Core Components

### 1. Wallet System
- **Wallet Model**: Individual wallets for students/parents with balance tracking
- **WalletTransaction Model**: Immutable transaction records with audit trail
- **Payment Methods**: Online, cash, bank transfer with proper recording
- **Wallet Service**: Business logic for all wallet operations

### 2. Teacher Earnings System
- **TeacherEarning Model**: Per-class earnings tracking for teachers
- **SalaryPayout Model**: Salary payment records with reference tracking
- **TeacherEarning Service**: Business logic for earnings management

### 3. Attendance Integration
- **Attendance Payment Processor**: Links attendance status to financial actions
- **Penalty Rules**: Automatic application based on attendance status

## Database Schemas

### Wallet
```javascript
{
  ownerId: ObjectId,        // Student or Parent ID
  ownerType: String,        // 'student' or 'parent'
  balance: Number,          // Current wallet balance
  currency: String,         // Default 'USD'
  graceBalance: Number,     // Optional admin-defined grace balance
  isActive: Boolean        // Wallet status
}
```

### WalletTransaction
```javascript
{
  walletId: ObjectId,              // Reference to wallet
  transactionType: String,         // 'top-up', 'class-deduction', 'penalty', 'refund', 'adjustment'
  amount: Number,                  // Transaction amount
  direction: String,               // 'credit' or 'debit'
  referenceId: ObjectId,           // Reference to related model
  referenceModel: String,          // Model type of reference
  recordedBy: ObjectId,            // User who recorded transaction
  recordedByType: String,          // 'parent', 'student', 'receptionist', 'admin', 'teacher'
  paymentMethod: String,           // 'online', 'cash', 'bank-transfer', 'adjustment'
  status: String,                  // 'pending', 'confirmed', 'reversed'
  reason: String,                  // Transaction reason
  confirmationNumber: String       // Unique confirmation number
}
```

### TeacherEarning
```javascript
{
  teacherId: ObjectId,      // Reference to teacher
  classId: ObjectId,        // Reference to class
  subject: String,          // Subject name
  amount: Number,           // Earning amount
  status: String,           // 'pending', 'paid', 'locked'
  classDate: Date,          // Date of class completion
  classCompleted: Boolean   // Whether class was completed
}
```

### SalaryPayout
```javascript
{
  teacherId: ObjectId,      // Reference to teacher
  earningIds: [ObjectId],   // Array of earning IDs paid
  totalAmount: Number,      // Total payout amount
  paymentMethod: String,    // 'cash', 'bank-transfer', 'check', 'online'
  referenceNumber: String,  // Payment reference
  paidDate: Date,           // Date of payment
  paidBy: ObjectId          // User who made payment
}
```

## API Endpoints

### Wallet Endpoints
- `GET /api/wallet/balance/:ownerId/:ownerType` - Get wallet balance
- `GET /api/wallet/summary/:ownerId/:ownerType` - Get wallet summary
- `GET /api/wallet/transactions/:ownerId/:ownerType` - Get transaction history
- `PUT /api/wallet/top-up` - Top up wallet (parent/student/admin)
- `POST /api/wallet/class-deduction` - Process class deduction (admin/teacher)
- `POST /api/wallet/penalty/student` - Apply student penalty (admin)
- `POST /api/wallet/refund` - Process refund (admin)
- `POST /api/wallet/adjustment` - Manual wallet adjustment (admin)

### Teacher Earning Endpoints
- `POST /api/teacher-earnings` - Create earning for completed class (admin/teacher)
- `GET /api/teacher-earnings/:teacherId` - Get teacher earnings (teacher/admin)
- `GET /api/teacher-earnings/summary/:teacherId` - Get earnings summary (teacher/admin)
- `PUT /api/teacher-earnings/pay` - Mark earnings as paid (admin)
- `POST /api/teacher-earnings/penalty` - Apply teacher penalty (admin)
- `PUT /api/teacher-earnings/lock-earnings` - Lock earnings after period (admin)
- `GET /api/teacher-earnings/payouts/:teacherId` - Get payout history (teacher/admin)

## Business Logic

### Per-Class Pricing
- Students can have different prices per subject
- Default prices set at subject level
- Prices applied when class is completed

### Attendance-Based Financial Actions
- **Student Present**: Class deduction from wallet, earning for teacher
- **Student Absent**: Penalty applied (2x class fee)
- **Teacher Absent**: Penalty applied to teacher (5x earning)
- **Class Canceled**: No financial action taken

### Wallet Balance Management
- No negative balances allowed (except with grace balance)
- Multiple payment methods supported
- All transactions are immutable with full audit trail

### Teacher Salary Management
- Earnings calculated per class completion
- Separate from wallet balance
- Salary lock after configurable period
- Payout tracking with references

## Security & Permissions

### Role-Based Access
- **Admin**: Full access to all operations
- **Teacher**: Access to own earnings, mark attendance
- **Parent/Student**: Access to own wallet, top-up
- **Receptionist**: Record cash payments

### Audit Trail
- All financial actions are logged
- No transactions can be deleted
- Adjustments require admin role and reference to original
- Full actor tracking with timestamps

## Revenue Recognition

### Unearned vs Earned Revenue
- Wallet balance = Unearned revenue
- Class deductions = Earned revenue
- Proper separation for reporting and taxes

### Financial Reporting
- Daily/weekly/monthly revenue reports
- Teacher salary summaries
- Class-level profit/loss analysis
- Penalty summaries

## Error Handling & Validation

### Input Validation
- All amounts validated as positive numbers
- Required field validation
- Proper role checking for each operation

### Business Rule Validation
- Sufficient balance checks before deductions
- Class completion validation
- Teacher earning rate validation

## Integration Points

### Attendance System
- Automatic processing when attendance is marked
- Links attendance status to financial actions
- Maintains consistency between attendance and payments

### Student Management
- Per-class prices stored per student
- Wallet creation for new students
- Balance checks before class enrollment

## Notifications

### System Notifications
- Low wallet balance alerts
- Payment confirmations
- Class deduction confirmations
- Penalty notifications
- Salary updates

## Data Integrity

### Transaction Safety
- All financial operations in transactions
- No data loss possible
- Full audit trail maintained
- Immutable transaction records

## Testing Considerations

### Edge Cases
- Insufficient wallet balance
- Teacher absence scenarios
- Class cancellation handling
- Multiple penalties on same day
- Concurrent access handling

### Validation Scenarios
- Invalid amounts
- Unauthorized access attempts
- Missing required fields
- Duplicate transaction prevention