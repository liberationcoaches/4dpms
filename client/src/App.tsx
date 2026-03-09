import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import SignUp from './pages/Auth/SignUp/SignUp';
import Join from './pages/Auth/Join/Join';
import Login from './pages/Auth/Login/Login';
import OTPVerify from './pages/Auth/OTPVerify/OTPVerify';
import AccessCode from './pages/Auth/AccessCode/AccessCode';
import EnquiryOrSignUp from './pages/Auth/EnquiryOrSignUp/EnquiryOrSignUp';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Dashboard/Settings/Settings';
import Notifications from './pages/Dashboard/Notifications/Notifications';
import AdminDashboard from './pages/Admin/AdminDashboard';
import OrganizationDetail from './pages/Admin/OrganizationDetail';
import ClientAdminDashboard from './pages/ClientAdmin/ClientAdminDashboard';
import ReviewerDashboard from './pages/Reviewer/ReviewerDashboard';
import Scoring from './pages/Reviewer/Scoring';
import Onboarding from './pages/Onboarding/Onboarding';
import Paywall from './pages/Paywall/Paywall';
import OrgAdminDashboard from './pages/OrgAdmin/OrgAdminDashboard';
import MemberDashboard from './pages/MemberDashboard/MemberDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/join" element={<Join />} />
      <Route path="/auth/join/:token" element={<Join />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/otp-verify" element={<OTPVerify />} />
      <Route path="/auth/access-code" element={<AccessCode />} />
      <Route path="/auth/enquiry-or-signup" element={<EnquiryOrSignUp />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />}>
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="/member-dashboard" element={<MemberDashboard />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/organizations/:id" element={<OrganizationDetail />} />
      <Route path="/client-admin/dashboard" element={<ClientAdminDashboard />} />
      <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
      <Route path="/reviewer/scoring/:employeeId" element={<Scoring />} />
      <Route path="/paywall" element={<Paywall />} />
      <Route path="/org-admin" element={<Navigate to="/org-admin/dashboard" replace />} />
      <Route path="/org-admin/dashboard" element={<OrgAdminDashboard />} />
    </Routes>
  );
}

export default App;

