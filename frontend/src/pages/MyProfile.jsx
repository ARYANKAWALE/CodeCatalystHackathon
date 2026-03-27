import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Distinct URL so "My profile" is not the same as /dashboard (avoids two active nav links).
 */
export default function MyProfile() {
  const { user } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();

  if (role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }
  if (user?.student_id != null) {
    return <Navigate to={`/students/${user.student_id}`} replace />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>My profile</h1>
        <p className="subtitle">Signed in as {user?.username}</p>
      </div>
      <div className="alert alert-warning border-0 shadow-sm" role="alert">
        Your account is not linked to a student record. Ask an administrator to set your{' '}
        <strong>student_id</strong> or use the same email as your student profile so linking can run
        automatically.
      </div>
    </div>
  );
}
