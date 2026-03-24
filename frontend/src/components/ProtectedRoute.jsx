import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}><div className="spinner-border text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
