import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Admins see any student; students only their own profile (by linked student_id). */
export default function StudentViewAccess({ children }) {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const numericId = Number(id);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'admin') {
    return children;
  }
  if (user.role === 'student' && user.student_id != null && user.student_id === numericId) {
    return children;
  }
  return <Navigate to="/dashboard" replace />;
}
