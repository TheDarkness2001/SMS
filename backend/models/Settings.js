const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Role-based access control settings
  rolePermissions: {
    admin: {
      canViewStudents: { type: Boolean, default: true },
      canManageStudents: { type: Boolean, default: true },
      canViewAttendance: { type: Boolean, default: true },
      canManageAttendance: { type: Boolean, default: true },
      canViewFeedback: { type: Boolean, default: true },
      canManageFeedback: { type: Boolean, default: true },
      canViewPayments: { type: Boolean, default: true },
      canManagePayments: { type: Boolean, default: true },
      canViewRevenue: { type: Boolean, default: true },
      canManageRevenue: { type: Boolean, default: true },
      canViewScheduler: { type: Boolean, default: true },
      canManageScheduler: { type: Boolean, default: true },
      canViewTimetable: { type: Boolean, default: true },
      canManageTimetable: { type: Boolean, default: true },
      canViewExams: { type: Boolean, default: true },
      canManageExams: { type: Boolean, default: true },
      canViewWallet: { type: Boolean, default: true },
      canManageWallet: { type: Boolean, default: true },
      canConfirmTopUps: { type: Boolean, default: true },
      canApplyPenalties: { type: Boolean, default: true },
      canProcessRefunds: { type: Boolean, default: true },
      canMakeAdjustments: { type: Boolean, default: true },
      canLockWallets: { type: Boolean, default: true }
    },
    teacher: {
      canViewStudents: { type: Boolean, default: true },
      canManageStudents: { type: Boolean, default: false },
      canViewAttendance: { type: Boolean, default: true },
      canManageAttendance: { type: Boolean, default: true },
      canViewFeedback: { type: Boolean, default: true },
      canManageFeedback: { type: Boolean, default: true },
      canViewPayments: { type: Boolean, default: false },
      canManagePayments: { type: Boolean, default: false },
      canViewRevenue: { type: Boolean, default: false },
      canManageRevenue: { type: Boolean, default: false },
      canViewScheduler: { type: Boolean, default: false },
      canManageScheduler: { type: Boolean, default: false },
      canViewTimetable: { type: Boolean, default: true },
      canManageTimetable: { type: Boolean, default: false },
      canViewExams: { type: Boolean, default: true },
      canManageExams: { type: Boolean, default: true },
      canViewWallet: { type: Boolean, default: false },
      canManageWallet: { type: Boolean, default: false },
      canConfirmTopUps: { type: Boolean, default: false },
      canApplyPenalties: { type: Boolean, default: false },
      canProcessRefunds: { type: Boolean, default: false },
      canMakeAdjustments: { type: Boolean, default: false },
      canLockWallets: { type: Boolean, default: false }
    },
    sales: {
      canViewStudents: { type: Boolean, default: false },
      canManageStudents: { type: Boolean, default: false },
      canViewAttendance: { type: Boolean, default: false },
      canManageAttendance: { type: Boolean, default: false },
      canViewFeedback: { type: Boolean, default: false },
      canManageFeedback: { type: Boolean, default: false },
      canViewPayments: { type: Boolean, default: true },
      canManagePayments: { type: Boolean, default: false },
      canViewRevenue: { type: Boolean, default: true },
      canManageRevenue: { type: Boolean, default: false },
      canViewScheduler: { type: Boolean, default: false },
      canManageScheduler: { type: Boolean, default: false },
      canViewTimetable: { type: Boolean, default: false },
      canManageTimetable: { type: Boolean, default: false },
      canViewExams: { type: Boolean, default: false },
      canManageExams: { type: Boolean, default: false },
      canViewWallet: { type: Boolean, default: false },
      canManageWallet: { type: Boolean, default: false },
      canConfirmTopUps: { type: Boolean, default: false },
      canApplyPenalties: { type: Boolean, default: false },
      canProcessRefunds: { type: Boolean, default: false },
      canMakeAdjustments: { type: Boolean, default: false },
      canLockWallets: { type: Boolean, default: false }
    },
    receptionist: {
      canViewStudents: { type: Boolean, default: true },
      canManageStudents: { type: Boolean, default: false },
      canViewAttendance: { type: Boolean, default: true },
      canManageAttendance: { type: Boolean, default: true },
      canViewFeedback: { type: Boolean, default: false },
      canManageFeedback: { type: Boolean, default: false },
      canViewPayments: { type: Boolean, default: true },
      canManagePayments: { type: Boolean, default: true },
      canViewRevenue: { type: Boolean, default: false },
      canManageRevenue: { type: Boolean, default: false },
      canViewScheduler: { type: Boolean, default: false },
      canManageScheduler: { type: Boolean, default: false },
      canViewTimetable: { type: Boolean, default: true },
      canManageTimetable: { type: Boolean, default: false },
      canViewExams: { type: Boolean, default: false },
      canManageExams: { type: Boolean, default: false },
      canViewWallet: { type: Boolean, default: true },
      canManageWallet: { type: Boolean, default: false },
      canConfirmTopUps: { type: Boolean, default: true },
      canApplyPenalties: { type: Boolean, default: false },
      canProcessRefunds: { type: Boolean, default: false },
      canMakeAdjustments: { type: Boolean, default: false },
      canLockWallets: { type: Boolean, default: false }
    },
    manager: {
      canViewStudents: { type: Boolean, default: true },
      canManageStudents: { type: Boolean, default: true },
      canViewAttendance: { type: Boolean, default: true },
      canManageAttendance: { type: Boolean, default: true },
      canViewFeedback: { type: Boolean, default: true },
      canManageFeedback: { type: Boolean, default: true },
      canViewPayments: { type: Boolean, default: true },
      canManagePayments: { type: Boolean, default: true },
      canViewRevenue: { type: Boolean, default: true },
      canManageRevenue: { type: Boolean, default: true },
      canViewScheduler: { type: Boolean, default: true },
      canManageScheduler: { type: Boolean, default: true },
      canViewTimetable: { type: Boolean, default: true },
      canManageTimetable: { type: Boolean, default: true },
      canViewExams: { type: Boolean, default: true },
      canManageExams: { type: Boolean, default: true },
      canViewWallet: { type: Boolean, default: true },
      canManageWallet: { type: Boolean, default: true },
      canConfirmTopUps: { type: Boolean, default: true },
      canApplyPenalties: { type: Boolean, default: false },
      canProcessRefunds: { type: Boolean, default: false },
      canMakeAdjustments: { type: Boolean, default: false },
      canLockWallets: { type: Boolean, default: false }
    },
    founder: {
      canViewStudents: { type: Boolean, default: true },
      canManageStudents: { type: Boolean, default: true },
      canViewAttendance: { type: Boolean, default: true },
      canManageAttendance: { type: Boolean, default: true },
      canViewFeedback: { type: Boolean, default: true },
      canManageFeedback: { type: Boolean, default: true },
      canViewPayments: { type: Boolean, default: true },
      canManagePayments: { type: Boolean, default: true },
      canViewRevenue: { type: Boolean, default: true },
      canManageRevenue: { type: Boolean, default: true },
      canViewScheduler: { type: Boolean, default: true },
      canManageScheduler: { type: Boolean, default: true },
      canViewTimetable: { type: Boolean, default: true },
      canManageTimetable: { type: Boolean, default: true },
      canViewExams: { type: Boolean, default: true },
      canManageExams: { type: Boolean, default: true },
      canViewWallet: { type: Boolean, default: true },
      canManageWallet: { type: Boolean, default: true },
      canConfirmTopUps: { type: Boolean, default: true },
      canApplyPenalties: { type: Boolean, default: true },
      canProcessRefunds: { type: Boolean, default: true },
      canMakeAdjustments: { type: Boolean, default: true },
      canLockWallets: { type: Boolean, default: true }
    }
  },
  
  // Feature toggle settings
  features: {
    studentManagement: { type: Boolean, default: true },
    attendanceTracking: { type: Boolean, default: true },
    feedbackSystem: { type: Boolean, default: true },
    paymentProcessing: { type: Boolean, default: true },
    revenueReporting: { type: Boolean, default: true },
    scheduler: { type: Boolean, default: true },
    timetable: { type: Boolean, default: true },
    examManagement: { type: Boolean, default: true },
    walletSystem: { type: Boolean, default: true },
    teacherEarnings: { type: Boolean, default: true }
  },
  
  // System settings
  system: {
    allowMultipleLogins: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 3600 }, // in seconds
    maxFileSize: { type: Number, default: 5 }, // in MB
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    // Wallet system settings
    currency: { type: String, default: 'UZS' },
    minTopUpAmount: { type: Number, default: 1000000 }, // 10,000 so'm in tyiyn (10,000 * 100)
    maxTopUpAmount: { type: Number, default: 200000000 }, // 2,000,000 so'm in tyiyn (2,000,000 * 100)
    dailyTopUpLimit: { type: Number, default: 500000000 }, // 5,000,000 so'm in tyiyn (5,000,000 * 100)
    graceBalanceEnabled: { type: Boolean, default: true },
    defaultGraceBalance: { type: Number, default: 0 }, // Default grace balance in tyiyn
    autoConfirmTopUps: { type: Boolean, default: false }, // If true, top-ups are auto-confirmed (not recommended)
    requireTopUpApproval: { type: Boolean, default: true }, // Require staff approval for top-ups
    walletLockingEnabled: { type: Boolean, default: true } // Allow admins to lock wallets
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.pre('save', function(next) {
  // This will be handled in the controller to ensure singleton
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);