import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { BranchProvider } from './context/BranchContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import ViewStudent from './pages/ViewStudent';
import AddStudent from './pages/AddStudent';
import EditStudent from './pages/EditStudent';
import Teachers from './pages/Teachers';
import ViewTeacher from './pages/ViewTeacher';
import TeacherForm from './components/TeacherForm';
import ManageSubjects from './pages/ManageSubjects';
import Timetable from './pages/Timetable';
import Exams from './pages/Exams';
import ExamResults from './pages/ExamResults';
import ManageExamGroups from './pages/ManageExamGroups';
import Feedback from './pages/Feedback';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Attendance from './pages/Attendance';
import StudentAttendance from './pages/StudentAttendance';
// WALLET IMPORTS HIDDEN - NOT IMPLEMENTED YET
// import WalletDashboard from './pages/WalletDashboard';
// import { StudentClassPayments } from './pages/StudentClassPayments';
import StaffEarnings from './pages/StaffEarnings';
import Scheduler from './pages/Scheduler';
import Branches from './pages/Branches';
import StudentDashboard from './pages/StudentDashboard';
import StudentAttendancePage from './pages/StudentAttendancePage';
import StudentFeedbackPage from './pages/StudentFeedbackPage';
import StudentExamsPage from './pages/StudentExamsPage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentPaymentsPage from './pages/StudentPaymentsPage';
import StudentTimetable from './pages/StudentTimetable';
import TeacherTimetable from './pages/TeacherTimetable';
import TeacherAttendance from './pages/TeacherAttendance';
import Revenue from './pages/Revenue';
// WALLET IMPORTS HIDDEN - NOT IMPLEMENTED YET
// import AdminWalletPanel from './pages/AdminWalletPanel';
import AdminEarningsPanel from './pages/AdminEarningsPanel';
import AdminPayoutPanel from './pages/AdminPayoutPanel';
import NotFound from './components/NotFound';
import PrivateRoute from './components/PrivateRoute';
import './styles/App.css';

function App() {
  // Temporary debug - verify VAPID key is loaded
  console.log('[App] VAPID Key loaded:', !!process.env.REACT_APP_VAPID_PUBLIC_KEY);
  console.log('[App] VAPID Key value:', process.env.REACT_APP_VAPID_PUBLIC_KEY?.substring(0, 20) + '...');
  
  return (
    <LanguageProvider>
      <AuthProvider>
        <BranchProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
            <Route path="/students/:id" element={<PrivateRoute><ViewStudent /></PrivateRoute>} />
            <Route path="/students/add" element={<PrivateRoute><AddStudent /></PrivateRoute>} />
            <Route path="/students/edit/:id" element={<PrivateRoute><EditStudent /></PrivateRoute>} />
            <Route path="/teachers" element={<PrivateRoute><Teachers /></PrivateRoute>} />
            <Route path="/teachers/:id" element={<PrivateRoute><ViewTeacher /></PrivateRoute>} />
            <Route path="/teachers/add" element={<PrivateRoute><TeacherForm /></PrivateRoute>} />
            <Route path="/teachers/edit/:id" element={<PrivateRoute><TeacherForm /></PrivateRoute>} />
            <Route path="/subjects" element={<PrivateRoute><ManageSubjects /></PrivateRoute>} />
            <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
            <Route path="/exams" element={<PrivateRoute><Exams /></PrivateRoute>} />
            <Route path="/exams/:id/results" element={<PrivateRoute><ExamResults /></PrivateRoute>} />
            <Route path="/exam-groups" element={<PrivateRoute><ManageExamGroups /></PrivateRoute>} />
            <Route path="/feedback" element={<PrivateRoute><Feedback /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
            <Route path="/student-attendance" element={<PrivateRoute><StudentAttendance /></PrivateRoute>} />
            {/* WALLET ROUTES HIDDEN - NOT IMPLEMENTED YET
            <Route path="/wallet" element={<PrivateRoute><WalletDashboard /></PrivateRoute>} />
            <Route path="/student-class-payments" element={<PrivateRoute><StudentClassPayments /></PrivateRoute>} />
            */}
            <Route path="/teacher-earnings" element={<PrivateRoute><StaffEarnings /></PrivateRoute>} />
            <Route path="/scheduler" element={<PrivateRoute><Scheduler /></PrivateRoute>} />
            <Route path="/branches" element={<PrivateRoute><Branches /></PrivateRoute>} />
            <Route path="/student/dashboard" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
            <Route path="/student/timetable" element={<PrivateRoute><StudentTimetable /></PrivateRoute>} />
            <Route path="/student/attendance" element={<PrivateRoute><StudentAttendancePage /></PrivateRoute>} />
            <Route path="/student/feedback" element={<PrivateRoute><StudentFeedbackPage /></PrivateRoute>} />
            <Route path="/student/exams" element={<PrivateRoute><StudentExamsPage /></PrivateRoute>} />
            <Route path="/student/results" element={<PrivateRoute><StudentResultsPage /></PrivateRoute>} />
            <Route path="/student/payments" element={<PrivateRoute><StudentPaymentsPage /></PrivateRoute>} />
            <Route path="/teacher-timetable" element={<PrivateRoute><TeacherTimetable /></PrivateRoute>} />
            <Route path="/teacher-attendance" element={<PrivateRoute><TeacherAttendance /></PrivateRoute>} />
            <Route path="/revenue" element={<PrivateRoute><Revenue /></PrivateRoute>} />
            {/* WALLET ROUTES HIDDEN - NOT IMPLEMENTED YET
            <Route path="/admin/wallet" element={<PrivateRoute><AdminWalletPanel /></PrivateRoute>} />
            */}
            <Route path="/admin/earnings" element={<PrivateRoute><AdminEarningsPanel /></PrivateRoute>} />
            <Route path="/admin/payouts" element={<PrivateRoute><AdminPayoutPanel /></PrivateRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        </BranchProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;