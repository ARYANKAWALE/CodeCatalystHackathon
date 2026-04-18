import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  DEPARTMENTS,
  getCourseGroupsForDepartment,
  getCoursesForDepartment,
  getDefaultCourseForDepartment,
} from '../constants/studentProfile';
import {
  IN_MOBILE_DIGITS,
  IN_PHONE_PREFIX,
  isValidIndiaMobileDigits,
  sanitizeIndiaMobileInput,
  toIndiaE164,
} from '../utils/phoneIndia';
import { getErrorMessage } from '../utils/errorMessage';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Register() {
  const { user, loading, register } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    name: '', roll_number: '', department: DEPARTMENTS[0], course: getDefaultCourseForDepartment(DEPARTMENTS[0]), year: '1',
    phone: '', cgpa: '', skills: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="auth-page"><div className="spinner-border text-primary" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onDepartmentChange = (e) => {
    const department = e.target.value;
    setForm((f) => {
      const allowed = getCoursesForDepartment(department);
      const course = allowed.includes(f.course) ? f.course : getDefaultCourseForDepartment(department);
      return { ...f, department, course };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    const data = { username: form.username.trim(), email: form.email.trim(), password: form.password, role };
    if (role === 'student') {
      if (form.phone && !isValidIndiaMobileDigits(form.phone)) {
        setError(`Enter a valid Indian mobile (${IN_MOBILE_DIGITS} digits starting with 6–9) after ${IN_PHONE_PREFIX}, or leave phone blank`);
        return;
      }
      Object.assign(data, {
        name: form.name.trim(), roll_number: form.roll_number.trim(),
        department: form.department, course: form.course, year: parseInt(form.year, 10),
        phone: toIndiaE164(form.phone), skills: form.skills.trim(),
      });
      if (form.cgpa.trim()) data.cgpa = parseFloat(form.cgpa);
    }

    setSubmitting(true);
    try {
      await register(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
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

      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3" style={{ width: 52, height: 52, fontSize: '1.4rem' }}>
            <i className="bi bi-mortarboard-fill" />
          </div>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Get started with PlaceTrack</p>
        </div>

        {error && <div className="alert alert-danger py-2 fade-in">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-toggle mb-3">
            {['admin', 'student'].map((r) => (
              <button key={r} type="button" className={`auth-toggle-btn ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
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
              <div className="input-group">
                <input type={showPw ? 'text' : 'password'} className="form-control" value={form.password} onChange={set('password')} required minLength={6} />
                <button type="button" className="btn btn-outline-secondary pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>
            <div className="col-sm-6">
              <label className="form-label">Confirm</label>
              <div className="input-group">
                <input type={showCpw ? 'text' : 'password'} className="form-control" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                <button type="button" className="btn btn-outline-secondary pw-toggle" onClick={() => setShowCpw(!showCpw)} tabIndex={-1}>
                  <i className={`bi ${showCpw ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>
          </div>

          {role === 'student' && (
            <div className="fade-in">
              <div className="section-divider"><span>Student info</span></div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Full name</label>
                  <input className="form-control" value={form.name} onChange={set('name')} required />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Roll number</label>
                  <input className="form-control" value={form.roll_number} onChange={set('roll_number')} required />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-5">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={onDepartmentChange} required>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-sm-3">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={form.year} onChange={set('year')}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="col-sm-4">
                  <label className="form-label">CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" className="form-control" value={form.cgpa} onChange={set('cgpa')} />
                </div>
                <div className="col-12">
                  <label className="form-label">Course / program</label>
                  <select className="form-select" value={form.course} onChange={set('course')} required>
                    {getCourseGroupsForDepartment(form.department).map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.options.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">Phone</label>
                  <div className="input-group">
                    <span className="input-group-text">{IN_PHONE_PREFIX}</span>
                    <input
                      className="form-control"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={IN_MOBILE_DIGITS}
                      placeholder="10-digit mobile"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: sanitizeIndiaMobileInput(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="col-sm-6">
                  <label className="form-label">Skills</label>
                  <input className="form-control" placeholder="Python, React..." value={form.skills} onChange={set('skills')} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold mt-1" disabled={submitting}>
            {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          Have an account? <Link to="/login" className="fw-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
