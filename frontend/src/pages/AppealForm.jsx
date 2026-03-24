import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AppealForm() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preCompany = searchParams.get('company_id') || '';
  const preType = (searchParams.get('type') || 'internship').toLowerCase();

  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    appeal_type: preType === 'placement' ? 'placement' : 'internship',
    company_id: preCompany,
    title: '',
    message: '',
    package_lpa: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const role = String(user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStudent = !isAdmin && role === 'student' && user?.student_id != null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await api.get('/options/companies');
        if (!cancelled) setCompanies(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }
  if (!isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body = {
        appeal_type: form.appeal_type,
        company_id: parseInt(form.company_id, 10),
        title: form.title.trim(),
        message: form.message.trim() || undefined,
      };
      if (Number.isNaN(body.company_id)) {
        setError('Choose a company');
        setSubmitting(false);
        return;
      }
      if (form.appeal_type === 'placement' && form.package_lpa.trim() !== '') {
        body.package_lpa = parseFloat(form.package_lpa);
        if (Number.isNaN(body.package_lpa)) {
          setError('Invalid expected package (LPA)');
          setSubmitting(false);
          return;
        }
      }
      await api.post('/appeals', body);
      navigate('/appeals');
    } catch (err) {
      setError(err.message || 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header mb-4">
        <div>
          <h1>Request internship or placement</h1>
          <p className="subtitle mb-0">
            Submit a request to the admin. If approved, a record will be added to your internships or placements.
          </p>
        </div>
        <Link to="/appeals" className="btn btn-outline-secondary">Back to requests</Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.appeal_type} onChange={set('appeal_type')}>
                <option value="internship">Internship</option>
                <option value="placement">Placement</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Company</label>
              <select
                className="form-select"
                required
                value={form.company_id}
                onChange={set('company_id')}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">
                {form.appeal_type === 'internship' ? 'Proposed internship title' : 'Target role'}
              </label>
              <input
                className="form-control"
                required
                value={form.title}
                onChange={set('title')}
                placeholder={form.appeal_type === 'internship' ? 'e.g. Summer SDE Intern' : 'e.g. Software Engineer'}
              />
            </div>
            {form.appeal_type === 'placement' && (
              <div className="mb-3">
                <label className="form-label">Expected package (LPA, optional)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.package_lpa}
                  onChange={set('package_lpa')}
                  placeholder="Leave blank if unknown"
                />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">Message to admin (optional)</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.message}
                onChange={set('message')}
                placeholder="Why this company, timing, or other context…"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
