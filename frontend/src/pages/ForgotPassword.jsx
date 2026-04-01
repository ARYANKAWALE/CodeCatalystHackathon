import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

export default function ForgotPassword() {
  const { user, loading } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="auth-page"><div className="spinner-border text-primary" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccessMsg((typeof data?.message === 'string' && data.message) || '');
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Request failed'));
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
            <i className="bi bi-key-fill" />
          </div>
          <h2 className="auth-title">Forgot password</h2>
          <p className="auth-subtitle">Enter your account email and we will send a reset link if it exists.</p>
        </div>

        {error && <div className="alert alert-danger py-2 fade-in">{error}</div>}
        {done && (
          <div className="alert alert-success py-2 fade-in">
            {successMsg || 'If an account exists for that email, you will receive a link to reset your password shortly.'}
          </div>
        )}

        {!done && (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="fp-email">Email</label>
              <input
                id="fp-email"
                type="email"
                className="form-control form-control-lg"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={submitting}>
              {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-muted small mt-4 mb-0">
          <Link to="/login" className="fw-semibold">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
