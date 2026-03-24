import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Information Technology', 'Civil', 'Electrical'];

export default function Register() {
  const { user, loading, register } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    name: '', roll_number: '', department: DEPARTMENTS[0], year: '1',
    phone: '', cgpa: '', skills: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="login-wrapper"><div className="spinner-border text-white" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    const data = { username: form.username.trim(), email: form.email.trim(), password: form.password, role };
    if (role === 'student') {
      Object.assign(data, {
        name: form.name.trim(), roll_number: form.roll_number.trim(),
        department: form.department, year: parseInt(form.year, 10),
        phone: form.phone.trim(), skills: form.skills.trim(),
      });
      if (form.cgpa.trim()) data.cgpa = parseFloat(form.cgpa);
    }

    setSubmitting(true);
    try {
      await register(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrapper">
      <button
        className="theme-toggle position-fixed"
        style={{ top: '1.5rem', right: '1.5rem', zIndex: 10, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
        onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
      >
        <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
      </button>

      <div className="login-card" style={{ maxWidth: 500 }}>
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
            <i className="bi bi-mortarboard-fill" />
          </div>
          <h2>Create Account</h2>
          <p className="subtitle mb-0">Join PlaceTrack today</p>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <span className="form-label d-block mb-2">I am registering as</span>
            <div className="d-flex gap-2">
              {['admin', 'student'].map((r) => (
                <button key={r} type="button"
                  className={`btn flex-fill ${role === r ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRole(r)}
                >
                  <i className={`bi ${r === 'admin' ? 'bi-shield-lock' : 'bi-person-badge'} me-1`} />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username} onChange={set('username')} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={set('email')} required />
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-control" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>
          </div>

          {role === 'student' && (
            <div className="fade-in">
              <hr className="my-3" style={{ borderColor: 'var(--border)' }} />
              <p className="text-muted small fw-semibold mb-3 text-uppercase" style={{ letterSpacing: '.05em' }}>Student Details</p>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={form.name} onChange={set('name')} required />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Roll Number</label>
                  <input className="form-control" value={form.roll_number} onChange={set('roll_number')} required />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={set('department')}>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-sm-3">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={form.year} onChange={set('year')}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="col-sm-3">
                  <label className="form-label">CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" className="form-control" value={form.cgpa} onChange={set('cgpa')} />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={set('phone')} />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Skills</label>
                  <input className="form-control" placeholder="e.g. Python, React" value={form.skills} onChange={set('skills')} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 py-2 mt-2" disabled={submitting}>
            {submitting ? (
              <><span className="spinner-border spinner-border-sm me-2" />Creating account...</>
            ) : (
              <><i className="bi bi-person-plus me-2" />Create Account</>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted small">Already have an account? </span>
          <Link to="/login" className="small fw-semibold">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
