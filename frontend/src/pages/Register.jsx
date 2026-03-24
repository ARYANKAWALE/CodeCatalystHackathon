import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Information Technology',
  'Civil',
  'Electrical',
];

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState('1');
  const [phone, setPhone] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="login-wrapper">
        <div className="text-center text-white">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const formData = {
      username: username.trim(),
      email: email.trim(),
      password,
      role,
    };

    if (role === 'student') {
      formData.name = name.trim();
      formData.roll_number = rollNumber.trim();
      formData.department = department;
      formData.year = parseInt(year, 10);
      formData.phone = phone.trim();
      if (cgpa.trim()) {
        formData.cgpa = parseFloat(cgpa);
      }
      formData.skills = skills.trim();
    }

    setSubmitting(true);
    try {
      await register(formData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="text-center mb-3">
          <div className="brand-icon mx-auto mb-2">
            <i className="bi bi-mortarboard-fill" aria-hidden />
          </div>
          <h2>Create Account</h2>
          <p className="subtitle mb-0">Join PlaceTrack</p>
        </div>

        {error ? <div className="alert alert-danger py-2" role="alert">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <span className="form-label d-block">Role</span>
            <div className="d-flex gap-3">
              <label className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="role"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                <span className="form-check-label">Admin</span>
              </label>
              <label className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name="role"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                />
                <span className="form-check-label">Student</span>
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className="form-control"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {role === 'student' ? (
            <>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-roll">Roll number</label>
                <input
                  id="reg-roll"
                  className="form-control"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-dept">Department</label>
                <select
                  id="reg-dept"
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-year">Year</label>
                <select
                  id="reg-year"
                  className="form-select"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-phone">Phone</label>
                <input
                  id="reg-phone"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-cgpa">CGPA</label>
                <input
                  id="reg-cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  className="form-control"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="reg-skills">Skills</label>
                <textarea
                  id="reg-skills"
                  className="form-control"
                  rows={2}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>
            </>
          ) : null}

          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
