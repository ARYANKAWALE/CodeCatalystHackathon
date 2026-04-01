import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

export default function ResetPassword() {
  const { user, loading } = useAuth();
  const { dark, toggle } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) setError('This reset link is missing a token. Request a new link from the forgot password page.');
  }, [token]);

  if (loading) return <div className="auth-page"><div className="spinner-border text-primary" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(getErrorMessage(err, 'Reset failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <button className="theme-toggle position-fixed" style={{ top: '1.5rem', right: '1.5rem', zIndex: 10 }} onClick={toggle}>
        <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
      </button>

      <div className="auth-card fade-in">
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3" style={{ width: 52, height: 52, fontSize: '1.4rem' }}>
            <i className="bi bi-shield-lock-fill" />
          </div>
          <h2 className="auth-title">Set new password</h2>
          <p className="auth-subtitle">Choose a new password for your account.</p>
        </div>

        {error && <div className="alert alert-danger py-2 fade-in">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="rp-p">New password</label>
            <div className="input-group">
              <input
                id="rp-p"
                type={showPw ? 'text' : 'password'}
                className="form-control form-control-lg"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={!token}
              />
              <button type="button" className="btn btn-outline-secondary pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="rp-c">Confirm password</label>
            <input
              id="rp-c"
              type={showPw ? 'text' : 'password'}
              className="form-control form-control-lg"
              placeholder="Repeat password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              disabled={!token}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={submitting || !token}>
            {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Update password'}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          <Link to="/login" className="fw-semibold">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
