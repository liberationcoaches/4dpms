import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import SignUp from './pages/Auth/SignUp/SignUp';
import Join from './pages/Auth/Join/Join';
import Login from './pages/Auth/Login/Login';
import OTPVerify from './pages/Auth/OTPVerify/OTPVerify';
import TeamCode from './pages/Auth/TeamCode/TeamCode';
import AccessCode from './pages/Auth/AccessCode/AccessCode';
import EnquiryOrSignUp from './pages/Auth/EnquiryOrSignUp/EnquiryOrSignUp';
import SetPassword from './pages/Auth/SetPassword/SetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Dashboard/Settings/Settings';
import Notifications from './pages/Dashboard/Notifications/Notifications';
import TeamMemberKRAs from './pages/Dashboard/TeamMember/TeamMemberKRAs';
import Performance from './pages/Dashboard/Performance/Performance';
import Teams from './pages/Dashboard/Teams/Teams';
import Calendar from './pages/Dashboard/Calendar/Calendar';
import AdminDashboard from './pages/Admin/AdminDashboard';
import OrganizationDetail from './pages/Admin/OrganizationDetail';
import ClientAdminDashboard from './pages/ClientAdmin/ClientAdminDashboard';
import BossDashboard from './pages/Dashboard/Boss/BossDashboard';
import ManagerDashboard from './pages/Dashboard/Manager/ManagerDashboard';
import ReviewCycles from './pages/Dashboard/Boss/ReviewCycles';
import ReviewerDashboard from './pages/Reviewer/ReviewerDashboard';
import Scoring from './pages/Reviewer/Scoring';
import EmployeeDashboard from './pages/Dashboard/Employee/EmployeeDashboard';
import FeedbackHistory from './pages/Dashboard/Employee/FeedbackHistory';
import MidCycleNotes from './pages/Dashboard/Manager/MidCycleNotes';
import Onboarding from './pages/Onboarding/Onboarding';
import UnifiedDashboard from './pages/UnifiedDashboard/UnifiedDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/join" element={<Join />} />
      <Route path="/auth/join/:token" element={<Join />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/team-code" element={<TeamCode />} />
      <Route path="/auth/otp-verify" element={<OTPVerify />} />
      <Route path="/auth/access-code" element={<AccessCode />} />
      <Route path="/auth/enquiry-or-signup" element={<EnquiryOrSignUp />} />
      <Route path="/auth/set-password" element={<SetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/app" element={<UnifiedDashboard />} />
      <Route path="/dashboard" element={<Dashboard />}>
        <Route path="performance" element={<Performance />} />
        <Route path="teams" element={<Teams />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      {/* Team routes are now part of Supervisor dashboard */}
      <Route path="/dashboard/manager/team/:memberId" element={<TeamMemberKRAs />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/organizations/:id" element={<OrganizationDetail />} />
      <Route path="/client-admin/dashboard" element={<ClientAdminDashboard />} />
      <Route path="/dashboard/boss" element={<BossDashboard />} />
      <Route path="/dashboard/boss/review-cycles" element={<ReviewCycles />} />
      <Route path="/dashboard/manager" element={<ManagerDashboard />} />
      <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
      <Route path="/reviewer/scoring/:employeeId" element={<Scoring />} />
      <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
      <Route path="/dashboard/employee/feedback" element={<FeedbackHistory />} />
      <Route path="/dashboard/manager/mid-cycle-notes" element={<MidCycleNotes />} />
    </Routes>
  );
}

export default App;

