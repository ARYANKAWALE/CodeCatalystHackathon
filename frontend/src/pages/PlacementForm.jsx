import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

const STATUSES = ['applied', 'shortlisted', 'selected', 'placed', 'rejected'];

const emptyForm = {
  student_id: '',
  company_id: '',
  role: '',
  package_lpa: '',
  offer_date: '',
  joining_date: '',
  status: 'applied',
};

export default function PlacementForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState(emptyForm);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [studentOpts, companyOpts] = await Promise.all([
          api.get('/options/students'),
          api.get('/options/companies'),
        ]);
        if (cancelled) return;
        setStudents(Array.isArray(studentOpts) ? studentOpts : []);
        setCompanies(Array.isArray(companyOpts) ? companyOpts : []);

        if (isEdit) {
          const p = await api.get(`/placements/${id}`);
          if (cancelled) return;
          setForm({
            student_id: p.student_id != null ? String(p.student_id) : '',
            company_id: p.company_id != null ? String(p.company_id) : '',
            role: p.role ?? '',
            package_lpa:
              p.package_lpa != null && p.package_lpa !== '' ? String(p.package_lpa) : '',
            offer_date: p.offer_date ? String(p.offer_date).slice(0, 10) : '',
            joining_date: p.joining_date ? String(p.joining_date).slice(0, 10) : '',
            status: p.status && STATUSES.includes(p.status) ? p.status : 'applied',
          });
        } else {
          const sid = searchParams.get('student_id');
          const preStudent =
            sid && /^\d+$/.test(String(sid).trim()) ? String(sid).trim() : '';
          setForm({ ...emptyForm, student_id: preStudent });
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load form data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, searchParams]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      student_id: parseInt(form.student_id, 10),
      company_id: parseInt(form.company_id, 10),
      role: form.role.trim(),
      package_lpa: parseFloat(form.package_lpa),
      offer_date: form.offer_date || null,
      joining_date: form.joining_date || null,
      status: form.status,
    };
    try {
      if (isEdit) {
        await api.put(`/placements/${id}`, body);
      } else {
        await api.post('/placements', body);
      }
      navigate('/placements');
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit placement' : 'Add placement'}</h1>
        <p className="subtitle">
          {isEdit ? 'Update placement details' : 'Create a new placement record'}
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="student_id">
                Student <span className="text-danger">*</span>
              </label>
              <select
                id="student_id"
                name="student_id"
                className="form-select"
                value={form.student_id}
                onChange={onChange}
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.roll_number != null && s.roll_number !== '' ? ` (${s.roll_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="company_id">
                Company <span className="text-danger">*</span>
              </label>
              <select
                id="company_id"
                name="company_id"
                className="form-select"
                value={form.company_id}
                onChange={onChange}
                required
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="role">
                Role <span className="text-danger">*</span>
              </label>
              <input
                id="role"
                name="role"
                className="form-control"
                value={form.role}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="package_lpa">
                Package (LPA) <span className="text-danger">*</span>
              </label>
              <input
                id="package_lpa"
                name="package_lpa"
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={form.package_lpa}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="offer_date">
                Offer date
              </label>
              <input
                id="offer_date"
                name="offer_date"
                type="date"
                className="form-control"
                value={form.offer_date}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="joining_date">
                Joining date
              </label>
              <input
                id="joining_date"
                name="joining_date"
                type="date"
                className="form-control"
                value={form.joining_date}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="form-select"
                value={form.status}
                onChange={onChange}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create placement'}
            </button>
            <Link to="/placements" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
