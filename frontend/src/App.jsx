import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import StudentViewAccess from './components/StudentViewAccess';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import StudentForm from './pages/StudentForm';
import StudentView from './pages/StudentView';
import CompanyList from './pages/CompanyList';
import CompanyForm from './pages/CompanyForm';
import CompanyView from './pages/CompanyView';
import InternshipList from './pages/InternshipList';
import InternshipForm from './pages/InternshipForm';
import InternshipView from './pages/InternshipView';
import PlacementList from './pages/PlacementList';
import PlacementForm from './pages/PlacementForm';
import PlacementView from './pages/PlacementView';
import SearchResults from './pages/SearchResults';
import Reports from './pages/Reports';
import AnalyticalReports from './pages/AnalyticalReports';
import PlacementSummary from './pages/PlacementSummary';
import InternshipSummary from './pages/InternshipSummary';
import CompanyWiseReport from './pages/CompanyWiseReport';
import AppealList from './pages/AppealList';
import AppealForm from './pages/AppealForm';
import MyReports from './pages/MyReports';
import MyProfile from './pages/MyProfile';
import VacancyBoard from './pages/VacancyBoard';
import MyApplications from './pages/MyApplications';
import AdminApplicants from './pages/AdminApplicants';

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}

function AppLayout() {
  return (
    <Navbar>
      <div className="container-fluid px-4">
        <Routes>
          <Route path="/dashboard" element={<P><Dashboard /></P>} />
          <Route path="/my-profile" element={<P><MyProfile /></P>} />
          <Route path="/account/password" element={<P><ChangePassword /></P>} />
          <Route path="/students" element={<P><StudentList /></P>} />
          <Route path="/students/add" element={<P><AdminRoute><StudentForm /></AdminRoute></P>} />
          <Route path="/students/:id/edit" element={<P><AdminRoute><StudentForm /></AdminRoute></P>} />
          <Route path="/students/:id" element={<P><StudentView /></P>} />
          <Route path="/companies" element={<P><CompanyList /></P>} />
          <Route path="/companies/add" element={<P><AdminRoute><CompanyForm /></AdminRoute></P>} />
          <Route path="/companies/:id/edit" element={<P><AdminRoute><CompanyForm /></AdminRoute></P>} />
          <Route path="/companies/:id" element={<P><CompanyView /></P>} />
          <Route path="/vacancies" element={<P><VacancyBoard /></P>} />
          <Route path="/my-applications" element={<P><MyApplications /></P>} />
          <Route path="/internships" element={<P><InternshipList /></P>} />
          <Route path="/internships/add" element={<P><AdminRoute><InternshipForm /></AdminRoute></P>} />
          <Route path="/internships/:id/edit" element={<P><AdminRoute><InternshipForm /></AdminRoute></P>} />
          <Route path="/internships/:id" element={<P><InternshipView /></P>} />
          <Route path="/placements" element={<P><PlacementList /></P>} />
          <Route path="/placements/add" element={<P><AdminRoute><PlacementForm /></AdminRoute></P>} />
          <Route path="/placements/:id/edit" element={<P><AdminRoute><PlacementForm /></AdminRoute></P>} />
          <Route path="/placements/:id" element={<P><PlacementView /></P>} />
          <Route path="/search" element={<P><SearchResults /></P>} />
          <Route path="/reports" element={<P><AdminRoute><Reports /></AdminRoute></P>} />
          <Route path="/reports/analytics" element={<P><AdminRoute><AnalyticalReports /></AdminRoute></P>} />
          <Route path="/reports/placement-summary" element={<P><AdminRoute><PlacementSummary /></AdminRoute></P>} />
          <Route path="/reports/internship-summary" element={<P><AdminRoute><InternshipSummary /></AdminRoute></P>} />
          <Route path="/reports/company-wise" element={<P><AdminRoute><CompanyWiseReport /></AdminRoute></P>} />
          <Route path="/reports/me" element={<P><MyReports /></P>} />
          <Route path="/admin/applications" element={<P><AdminRoute><AdminApplicants /></AdminRoute></P>} />
          <Route path="/appeals" element={<P><AppealList /></P>} />
          <Route path="/appeals/new" element={<P><AppealForm /></P>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Navbar>
  );
}
