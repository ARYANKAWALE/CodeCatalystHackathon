import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getErrorMessage } from '../utils/errorMessage';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Login() {
  const { user, loading, login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const resetOk = location.state?.passwordReset;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="auth-page"><div className="spinner-border text-primary" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <AnimatedBackground variant="auth" />

      <button className="theme-toggle position-fixed" style={{ top: '1.5rem', right: '1.5rem', zIndex: 10 }} onClick={toggle}>
        <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
      </button>

      <div className="auth-card">
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3" style={{ width: 52, height: 52, fontSize: '1.4rem' }}>
            <i className="bi bi-mortarboard-fill" />
          </div>
          <h2 className="auth-title">Sign in</h2>
          <p className="auth-subtitle">Welcome back to PlaceTrack</p>
        </div>

        {resetOk && (
          <div className="alert alert-success py-2 fade-in">
            Your password was updated. Sign in with your new password.
          </div>
        )}
        {error && <div className="alert alert-danger py-2 fade-in">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-u">Username or email</label>
            <input id="login-u" className="form-control form-control-lg" placeholder="username or email" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-p">Password</label>
            <div className="input-group">
              <input id="login-p" type={showPw ? 'text' : 'password'} className="form-control form-control-lg" placeholder="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="btn btn-outline-secondary pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            <div className="text-end mt-1">
              <Link to="/forgot-password" className="small">Forgot password?</Link>
            </div>
          </div>

          <p className="text-muted small mb-3">Demo: <code>admin</code> / <code>admin123</code></p>

          <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={submitting}>
            {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          No account? <Link to="/register" className="fw-semibold">Register</Link>
        </p>
      </div>
    </div>
  );
}
