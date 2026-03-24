import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
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
import PlacementSummary from './pages/PlacementSummary';
import InternshipSummary from './pages/InternshipSummary';
import CompanyWiseReport from './pages/CompanyWiseReport';

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
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}

function AppLayout() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="container-fluid px-4">
          <Routes>
            <Route path="/dashboard" element={<P><Dashboard /></P>} />
            <Route path="/students" element={<P><StudentList /></P>} />
            <Route path="/students/add" element={<P><StudentForm /></P>} />
            <Route path="/students/:id/edit" element={<P><StudentForm /></P>} />
            <Route path="/students/:id" element={<P><StudentView /></P>} />
            <Route path="/companies" element={<P><CompanyList /></P>} />
            <Route path="/companies/add" element={<P><CompanyForm /></P>} />
            <Route path="/companies/:id/edit" element={<P><CompanyForm /></P>} />
            <Route path="/companies/:id" element={<P><CompanyView /></P>} />
            <Route path="/internships" element={<P><InternshipList /></P>} />
            <Route path="/internships/add" element={<P><InternshipForm /></P>} />
            <Route path="/internships/:id/edit" element={<P><InternshipForm /></P>} />
            <Route path="/internships/:id" element={<P><InternshipView /></P>} />
            <Route path="/placements" element={<P><PlacementList /></P>} />
            <Route path="/placements/add" element={<P><PlacementForm /></P>} />
            <Route path="/placements/:id/edit" element={<P><PlacementForm /></P>} />
            <Route path="/placements/:id" element={<P><PlacementView /></P>} />
            <Route path="/search" element={<P><SearchResults /></P>} />
            <Route path="/reports" element={<P><Reports /></P>} />
            <Route path="/reports/placement-summary" element={<P><PlacementSummary /></P>} />
            <Route path="/reports/internship-summary" element={<P><InternshipSummary /></P>} />
            <Route path="/reports/company-wise" element={<P><CompanyWiseReport /></P>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </>
  );
}
