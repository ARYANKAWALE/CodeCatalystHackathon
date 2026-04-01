import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
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
  industry: '',
  website: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  description: '',
};

export default function CompanyForm() {
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
        const c = await api.get(`/companies/${id}`);
        if (!cancelled) {
          setForm({
            name: c.name ?? '',
            industry: c.industry ?? '',
            website: c.website ?? '',
            contact_person: c.contact_person ?? '',
            contact_email: c.contact_email ?? '',
            contact_phone: nationalDigitsFromStored(c.contact_phone ?? ''),
            address: c.address ?? '',
            description: c.description ?? '',
          });
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load company'));
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    if (form.contact_phone && !isValidIndiaMobileDigits(form.contact_phone)) {
      setError(`Contact phone must be ${IN_MOBILE_DIGITS} digits starting with 6–9 (${IN_PHONE_PREFIX}) or left blank`);
      setSaving(false);
      return;
    }
    const body = {
      name: form.name.trim(),
      industry: form.industry.trim(),
      website: form.website.trim(),
      contact_person: form.contact_person.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: toIndiaE164(form.contact_phone),
      address: form.address.trim(),
      description: form.description.trim(),
    };
    try {
      if (isEdit) {
        await api.put(`/companies/${id}`, body);
      } else {
        await api.post('/companies', body);
      }
      navigate('/companies');
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
        <h1>{isEdit ? 'Edit company' : 'Add company'}</h1>
        <p className="subtitle">
          {isEdit ? 'Update company details' : 'Create a new company record'}
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
              <label className="form-label" htmlFor="industry">
                Industry
              </label>
              <input
                id="industry"
                name="industry"
                className="form-control"
                value={form.industry}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="website">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                className="form-control"
                value={form.website}
                onChange={onChange}
                placeholder="https://"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="contact_person">
                Contact person
              </label>
              <input
                id="contact_person"
                name="contact_person"
                className="form-control"
                value={form.contact_person}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="contact_email">
                Contact email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                className="form-control"
                value={form.contact_email}
                onChange={onChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="contact_phone">
                Contact phone
              </label>
              <div className="input-group">
                <span className="input-group-text">{IN_PHONE_PREFIX}</span>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  className="form-control"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={IN_MOBILE_DIGITS}
                  placeholder="10-digit mobile"
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contact_phone: sanitizeIndiaMobileInput(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                className="form-control"
                rows={3}
                value={form.address}
                onChange={onChange}
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
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create company'}
            </button>
            <Link to="/companies" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
