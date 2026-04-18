import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import StatusBadge from '../components/StatusBadge';
import { fmt, fmtDate, vacancyRoleLabel } from '../utils/vacancyFormat';

function linkHref(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const s = urlOrPath.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return null;
}

export default function AdminApplicants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyIdParam = searchParams.get('company_id') || '';
  const vacancyIdParam = searchParams.get('vacancy_id') || '';

  const [companies, setCompanies] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [coverModal, setCoverModal] = useState({ open: false, title: '', body: '' });

  const loadCompanies = useCallback(async () => {
    try {
      const opts = await api.get('/options/companies');
      setCompanies(Array.isArray(opts) ? opts : []);
    } catch {
      setCompanies([]);
    }
  }, []);

  const loadVacancies = useCallback(async (cid) => {
    if (!cid) {
      setVacancies([]);
      return;
    }
    try {
      const data = await api.get(`/companies/${cid}/vacancies`);
      setVacancies(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setVacancies([]);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (vacancyIdParam) {
        qs.set('vacancy_id', vacancyIdParam);
      } else if (companyIdParam) {
        qs.set('company_id', companyIdParam);
      }
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const data = await api.get(`/admin/applications${suffix}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load applications'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyIdParam, vacancyIdParam]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadVacancies(companyIdParam);
  }, [companyIdParam, loadVacancies]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const setCompanyFilter = (cid) => {
    const next = new URLSearchParams(searchParams);
    if (cid) next.set('company_id', cid);
    else next.delete('company_id');
    next.delete('vacancy_id');
    setSearchParams(next, { replace: true });
  };

  const setVacancyFilter = (vid) => {
    const next = new URLSearchParams(searchParams);
    if (vid) next.set('vacancy_id', vid);
    else next.delete('vacancy_id');
    setSearchParams(next, { replace: true });
  };

  const updateStatus = async (row, nextStatus) => {
    if (row.status === nextStatus) return;
    const prevItems = items;
    setUpdatingId(row.id);
    setItems((list) => list.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
    try {
      const updated = await api.patch(`/admin/applications/${row.id}/status`, { status: nextStatus });
      setItems((list) => list.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      setError('');
    } catch (e) {
      setItems(prevItems);
      setError(getErrorMessage(e, 'Could not update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <header className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1>Applicants</h1>
          <p className="subtitle mb-0">Vacancy applications — review résumés and update status</p>
        </div>
        <Link to="/companies" className="btn btn-outline-secondary btn-sm">
          Companies
        </Link>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="table-container mb-4">
        <div className="card-header border-bottom">Filters</div>
        <div className="p-3 row g-3">
          <div className="col-md-5">
            <label className="form-label small text-muted mb-1" htmlFor="adm-app-company">
              Company
            </label>
            <select
              id="adm-app-company"
              className="form-select form-select-sm"
              value={companyIdParam}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label small text-muted mb-1" htmlFor="adm-app-vacancy">
              Vacancy (optional)
            </label>
            <select
              id="adm-app-vacancy"
              className="form-select form-select-sm"
              value={vacancyIdParam}
              onChange={(e) => setVacancyFilter(e.target.value)}
              disabled={!companyIdParam}
            >
              <option value="">All vacancies {companyIdParam ? 'for this company' : ''}</option>
              {vacancies.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.job_title}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button type="button" className="btn btn-outline-primary btn-sm w-100" onClick={() => loadApplications()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Role (vacancy)</th>
                <th>Company</th>
                <th>Applied</th>
                <th>Résumé</th>
                <th>Portfolio</th>
                <th>Status</th>
                <th>Cover letter</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-muted text-center py-4">
                    No applications match the current filters.
                  </td>
                </tr>
              ) : (
                items.map((a) => {
                  const v = a.vacancy || {};
                  const st = a.student || {};
                  const resumeHrefVal = linkHref(a.resume);
                  const portHref = linkHref(a.portfolio_link);
                  const busy = updatingId === a.id;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="fw-medium">{fmt(st.name)}</div>
                        <div className="small text-muted">{fmt(st.roll_number)}</div>
                        {st.id != null && (
                          <Link to={`/students/${st.id}`} className="small">
                            Profile
                          </Link>
                        )}
                      </td>
                      <td>
                        <div>{fmt(v.job_title)}</div>
                        <div className="small text-muted">{vacancyRoleLabel(v.role_type)}</div>
                      </td>
                      <td>
                        {v.company_id ? (
                          <Link to={`/companies/${v.company_id}`}>{fmt(v.company_name)}</Link>
                        ) : (
                          fmt(v.company_name)
                        )}
                      </td>
                      <td>{fmtDate(a.application_date)}</td>
                      <td>
                        {resumeHrefVal ? (
                          <a href={resumeHrefVal} target="_blank" rel="noopener noreferrer">
                            Open résumé
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {portHref ? (
                          <a href={portHref} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          onClick={() =>
                            setCoverModal({
                              open: true,
                              title: `${fmt(st.name)} — ${fmt(v.job_title)}`,
                              body: (a.cover_letter || '').trim() || '—',
                            })
                          }
                        >
                          View
                        </button>
                      </td>
                      <td className="text-end text-nowrap">
                        <div className="btn-group btn-group-sm flex-wrap justify-content-end">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={busy}
                            onClick={() => updateStatus(a, 'shortlisted')}
                            title="Shortlist"
                          >
                            Shortlist
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-success"
                            disabled={busy}
                            onClick={() => updateStatus(a, 'selected')}
                            title="Select"
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={busy}
                            onClick={() => updateStatus(a, 'rejected')}
                            title="Reject"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {coverModal.open && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cover letter / message</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setCoverModal({ open: false, title: '', body: '' })}
                />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">{coverModal.title}</p>
                <div className="border rounded p-3 bg-light" style={{ whiteSpace: 'pre-wrap' }}>
                  {coverModal.body}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCoverModal({ open: false, title: '', body: '' })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
