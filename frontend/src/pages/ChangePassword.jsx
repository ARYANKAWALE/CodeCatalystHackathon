import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/auth/password', { current_password: current, new_password: newPassword });
      setSuccess('Password updated successfully.');
      setCurrent('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message || 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-centered">
      <div className="page-centered-inner">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Change password</li>
          </ol>
        </nav>

        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h1 className="h4 mb-1">Change password</h1>
            <p className="text-muted small mb-4">Use your current password, then choose a new one.</p>

            {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
            {success && <div className="alert alert-success py-2 mb-3">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="cp-current">Current password</label>
                <input
                  id="cp-current"
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="cp-new">New password</label>
                <div className="input-group">
                  <input
                    id="cp-new"
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw(!showPw)} tabIndex={-1} title={showPw ? 'Hide' : 'Show'}>
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="cp-confirm">Confirm new password</label>
                <input
                  id="cp-confirm"
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
