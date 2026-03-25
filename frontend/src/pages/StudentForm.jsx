import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
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
  nationalDigitsFromStored,
  sanitizeIndiaMobileInput,
  toIndiaE164,
} from '../utils/phoneIndia';

const emptyForm = {
  name: '',
  roll_number: '',
  email: '',
  phone: '',
  department: DEPARTMENTS[0],
  course: getDefaultCourseForDepartment(DEPARTMENTS[0]),
  year: '1',
  cgpa: '',
  skills: '',
  resume_link: '',
};

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await api.get(`/students/${id}`);
        if (!cancelled) {
          setForm({
            name: s.name ?? '',
            roll_number: s.roll_number ?? '',
            email: s.email ?? '',
            phone: nationalDigitsFromStored(s.phone ?? ''),
            department: s.department ?? DEPARTMENTS[0],
            course:
              s.course && String(s.course).trim()
                ? String(s.course).trim()
                : getDefaultCourseForDepartment(s.department ?? DEPARTMENTS[0]),
            year: s.year != null ? String(s.year) : '1',
            cgpa: s.cgpa != null ? String(s.cgpa) : '',
            skills: s.skills ?? '',
            resume_link: s.resume_link ?? '',
          });
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load student');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onDepartmentChange = (e) => {
    const department = e.target.value;
    setForm((prev) => {
      const allowed = getCoursesForDepartment(department);
      const course = allowed.includes(prev.course) ? prev.course : getDefaultCourseForDepartment(department);
      return { ...prev, department, course };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    if (form.phone && !isValidIndiaMobileDigits(form.phone)) {
      setError(`Phone must be ${IN_MOBILE_DIGITS} digits starting with 6–9 (${IN_PHONE_PREFIX}) or left blank`);
      setSaving(false);
      return;
    }
    const body = {
      name: form.name.trim(),
      roll_number: form.roll_number.trim(),
      email: form.email.trim(),
      phone: toIndiaE164(form.phone),
      department: form.department.trim(),
      course: form.course.trim(),
      year: parseInt(form.year, 10),
      skills: form.skills.trim(),
      resume_link: form.resume_link.trim(),
      cgpa:
        form.cgpa === '' || form.cgpa == null
          ? null
          : parseFloat(form.cgpa),
    };
    try {
      if (isEdit) {
        await api.put(`/students/${id}`, body);
      } else {
        await api.post('/students', body);
      }
      navigate('/students');
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
        <h1>{isEdit ? 'Edit student' : 'Add student'}</h1>
        <p className="subtitle">{isEdit ? 'Update profile details' : 'Create a new student record'}</p>
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
              <label className="form-label" htmlFor="name">
                Name <span className="text-danger">*</span>
              </label>
              <input
                id="name"
                name="name"
                className="form-control"
                value={form.name}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="roll_number">
                Roll number <span className="text-danger">*</span>
              </label>
              <input
                id="roll_number"
                name="roll_number"
                className="form-control"
                value={form.roll_number}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="email">
                Email <span className="text-danger">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="phone">
                Phone
              </label>
              <div className="input-group">
                <span className="input-group-text">{IN_PHONE_PREFIX}</span>
                <input
                  id="phone"
                  name="phone"
                  className="form-control"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={IN_MOBILE_DIGITS}
                  placeholder="10-digit mobile"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: sanitizeIndiaMobileInput(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="department">
                Department <span className="text-danger">*</span>
              </label>
              <select
                id="department"
                name="department"
                className="form-select"
                value={form.department}
                onChange={onDepartmentChange}
                required
              >
                {form.department && !DEPARTMENTS.includes(form.department) && (
                  <option value={form.department}>{form.department}</option>
                )}
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="course">
                Course / program <span className="text-danger">*</span>
              </label>
              <select
                id="course"
                name="course"
                className="form-select"
                value={form.course}
                onChange={onChange}
                required
              >
                {form.course && !getCoursesForDepartment(form.department).includes(form.course) && (
                  <option value={form.course}>{form.course}</option>
                )}
                {getCourseGroupsForDepartment(form.department).map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="year">
                Year <span className="text-danger">*</span>
              </label>
              <select
                id="year"
                name="year"
                className="form-select"
                value={form.year}
                onChange={onChange}
                required
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="cgpa">
                CGPA (0–10)
              </label>
              <input
                id="cgpa"
                name="cgpa"
                type="number"
                min={0}
                max={10}
                step={0.01}
                className="form-control"
                value={form.cgpa}
                onChange={onChange}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="skills">
                Skills
              </label>
              <textarea
                id="skills"
                name="skills"
                className="form-control"
                rows={3}
                value={form.skills}
                onChange={onChange}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="resume_link">
                Resume (PDF URL)
              </label>
              <input
                id="resume_link"
                name="resume_link"
                type="url"
                className="form-control"
                value={form.resume_link}
                onChange={onChange}
                placeholder="https://… (link to PDF)"
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create student'}
            </button>
            <Link to="/students" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
