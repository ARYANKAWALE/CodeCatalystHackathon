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
        <p className="mb-2">
          Your account is not linked to a student record. Linking runs when your{' '}
          <strong>account email</strong> matches <code>students.email</code>, or your <strong>username</strong> matches{' '}
          <code>students.roll_number</code> (case-insensitive). Otherwise an admin must set{' '}
          <code>users.student_id</code>.
        </p>
        {user?.email ? (
          <p className="small mb-1">
            Account email: <code className="user-select-all">{user.email}</code>
          </p>
        ) : null}
        {user?.username ? (
          <p className="small mb-0">
            Username: <code className="user-select-all">{user.username}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
