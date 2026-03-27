import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';

const STATUSES = ['applied', 'selected', 'ongoing', 'completed', 'rejected'];

const emptyForm = {
  student_id: '',
  company_id: '',
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  stipend: '',
  status: 'applied',
  progress_notes: '',
};

export default function InternshipForm() {
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
          const inv = await api.get(`/internships/${id}`);
          if (cancelled) return;
          setForm({
            student_id: inv.student_id != null ? String(inv.student_id) : '',
            company_id: inv.company_id != null ? String(inv.company_id) : '',
            title: inv.title ?? '',
            description: inv.description ?? '',
            start_date: inv.start_date ? String(inv.start_date).slice(0, 10) : '',
            end_date: inv.end_date ? String(inv.end_date).slice(0, 10) : '',
            stipend: inv.stipend != null && inv.stipend !== '' ? String(inv.stipend) : '',
            status: inv.status && STATUSES.includes(inv.status) ? inv.status : 'applied',
            progress_notes: inv.progress_notes ?? '',
          });
        } else {
          const sid = searchParams.get('student_id');
          const preStudent =
            sid && /^\d+$/.test(String(sid).trim()) ? String(sid).trim() : '';
          setForm({ ...emptyForm, student_id: preStudent });
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load form data');
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
      title: form.title.trim(),
      description: form.description.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      stipend: form.stipend === '' || form.stipend == null ? 0 : parseFloat(form.stipend),
      status: form.status,
      progress_notes: form.progress_notes.trim(),
    };
    try {
      if (isEdit) {
        await api.put(`/internships/${id}`, body);
      } else {
        await api.post('/internships', body);
      }
      navigate('/internships');
    } catch (err) {
      setError(err.message || 'Save failed');
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
        <h1>{isEdit ? 'Edit internship' : 'Add internship'}</h1>
        <p className="subtitle">
          {isEdit ? 'Update internship details' : 'Create a new internship record'}
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
            <div className="col-12">
              <label className="form-label" htmlFor="title">
                Title <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                name="title"
                className="form-control"
                value={form.title}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows={4}
                value={form.description}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="start_date">
                Start date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="end_date">
                End date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="form-control"
                value={form.end_date}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="stipend">
                Stipend
              </label>
              <input
                id="stipend"
                name="stipend"
                type="number"
                step="any"
                min="0"
                className="form-control"
                value={form.stipend}
                onChange={onChange}
                placeholder="0"
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
            <div className="col-12">
              <label className="form-label" htmlFor="progress_notes">
                Progress notes
              </label>
              <textarea
                id="progress_notes"
                name="progress_notes"
                className="form-control"
                rows={4}
                value={form.progress_notes}
                onChange={onChange}
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create internship'}
            </button>
            <Link to="/internships" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
