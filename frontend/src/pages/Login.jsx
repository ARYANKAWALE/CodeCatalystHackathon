import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthBackground from '../components/AuthBackground';

export default function Login() {
  const { user, loading, login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="login-wrapper"><div className="spinner-border text-white" /></div>;
  }
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrapper">
      <AuthBackground />

      <button
        className="theme-toggle position-fixed"
        style={{ top: '1.5rem', right: '1.5rem', zIndex: 10, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', backdropFilter: 'blur(8px)' }}
        onClick={toggle}
      >
        <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
      </button>

      <div className="login-card glass-card">
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3" style={{ width: 60, height: 60, fontSize: '1.6rem', boxShadow: '0 4px 20px rgba(79,70,229,.3)' }}>
            <i className="bi bi-mortarboard-fill" />
          </div>
          <h2 style={{ fontSize: '1.65rem' }}>Welcome back</h2>
          <p className="subtitle mb-0">Sign in to PlaceTrack</p>
        </div>

        {error && <div className="alert alert-danger py-2 fade-in">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-u">Username</label>
            <div className="input-group input-group-glass">
              <span className="input-group-text"><i className="bi bi-person" /></span>
              <input id="login-u" className="form-control" placeholder="Enter username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-p">Password</label>
            <div className="input-group input-group-glass">
              <span className="input-group-text"><i className="bi bi-lock" /></span>
              <input id="login-p" type="password" className="form-control" placeholder="Enter password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          <div className="mb-3">
            <small className="text-muted">Default: <strong>admin</strong> / <strong>admin123</strong></small>
          </div>

          <button type="submit" className="btn btn-primary btn-glow w-100 py-2" disabled={submitting}>
            {submitting ? (
              <><span className="spinner-border spinner-border-sm me-2" />Signing in...</>
            ) : (
              <><i className="bi bi-box-arrow-in-right me-2" />Sign In</>
            )}
          </button>
        </form>

        <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-muted small">Don't have an account? </span>
          <Link to="/register" className="small fw-semibold">Create one</Link>
        </div>
      </div>
    </div>
  );
}
