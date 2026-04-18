import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import StatusBadge from '../components/StatusBadge';
import { fmt, fmtDate, vacancyRoleLabel } from '../utils/vacancyFormat';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
];

function linkHref(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const s = urlOrPath.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return null;
}

function previewText(value, max = 84) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

function countStatuses(items, allowed) {
  return items.filter((item) => allowed.includes(item.status)).length;
}

export default function AdminApplicants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyIdParam = searchParams.get('company_id') || '';
  const vacancyIdParam = searchParams.get('vacancy_id') || '';
  const statusParam = searchParams.get('status') || '';
  const queryParam = (searchParams.get('q') || '').trim();

  const [companies, setCompanies] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [draftQuery, setDraftQuery] = useState(queryParam);
  const [coverModal, setCoverModal] = useState({ open: false, title: '', body: '' });

  useEffect(() => {
    setDraftQuery(queryParam);
  }, [queryParam]);

  const loadCompanies = useCallback(async () => {
    try {
      const opts = await api.get('/options/companies');
      setCompanies(Array.isArray(opts) ? opts : []);
    } catch {
      setCompanies([]);
    }
  }, []);

  const loadVacancies = useCallback(async (companyId) => {
    if (!companyId) {
      setVacancies([]);
      return;
    }
    try {
      const data = await api.get(`/companies/${companyId}/vacancies`);
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
      if (vacancyIdParam) qs.set('vacancy_id', vacancyIdParam);
      else if (companyIdParam) qs.set('company_id', companyIdParam);
      if (statusParam) qs.set('status', statusParam);
      if (queryParam) qs.set('q', queryParam);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const data = await api.get(`/admin/applications${suffix}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load applications'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyIdParam, vacancyIdParam, statusParam, queryParam]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadVacancies(companyIdParam);
  }, [companyIdParam, loadVacancies]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const updateSearchParams = (updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
  };

  const setCompanyFilter = (companyId) => {
    updateSearchParams({
      company_id: companyId || null,
      vacancy_id: null,
    });
  };

  const setVacancyFilter = (vacancyId) => {
    updateSearchParams({ vacancy_id: vacancyId || null });
  };

  const setStatusFilter = (status) => {
    updateSearchParams({ status: status || null });
  };

  const applySearch = (e) => {
    e.preventDefault();
    updateSearchParams({ q: draftQuery.trim() || null });
  };

  const clearFilters = () => {
    setDraftQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const updateStatus = async (row, nextStatus) => {
    if (row.status === nextStatus) return;
    const prevItems = items;
    setUpdatingId(row.id);
    setItems((list) => list.map((entry) => (entry.id === row.id ? { ...entry, status: nextStatus } : entry)));
    try {
      const updated = await api.patch(`/admin/applications/${row.id}/status`, { status: nextStatus });
      setItems((list) => list.map((entry) => (entry.id === row.id ? { ...entry, ...updated } : entry)));
      setError('');
    } catch (e) {
      setItems(prevItems);
      setError(getErrorMessage(e, 'Could not update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    return {
      total,
      reviewQueue: countStatuses(items, ['applied', 'under_review']),
      shortlisted: countStatuses(items, ['shortlisted']),
      selected: countStatuses(items, ['selected']),
      rejected: countStatuses(items, ['rejected']),
    };
  }, [items]);

  const selectedCompany = useMemo(
    () => companies.find((company) => String(company.id) === String(companyIdParam)) || null,
    [companies, companyIdParam],
  );
  const selectedVacancy = useMemo(
    () => vacancies.find((vacancy) => String(vacancy.id) === String(vacancyIdParam)) || null,
    [vacancies, vacancyIdParam],
  );

  const hasFilters = Boolean(companyIdParam || vacancyIdParam || statusParam || queryParam);
  const filterSummary = hasFilters
    ? [
        selectedCompany ? `Company: ${selectedCompany.name}` : null,
        selectedVacancy ? `Vacancy: ${selectedVacancy.job_title}` : null,
        statusParam ? `Status: ${statusParam.replace(/_/g, ' ')}` : null,
        queryParam ? `Search: "${queryParam}"` : null,
      ].filter(Boolean).join(' | ')
    : 'All companies and vacancies';

  return (
    <div className="admin-applicants-page">
      <header className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1>Applicants</h1>
          <p className="subtitle mb-0">Vacancy applications - review resumes and update status</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/companies" className="btn btn-outline-secondary btn-sm">
            Companies
          </Link>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="admin-applicants-stats mb-4">
        <div className="admin-applicants-stat-card">
          <span className="admin-applicants-stat-card__label">Applications</span>
          <strong className="admin-applicants-stat-card__value">{stats.total}</strong>
          <span className="admin-applicants-stat-card__meta">matching the active filters</span>
        </div>
        <div className="admin-applicants-stat-card">
          <span className="admin-applicants-stat-card__label">Review queue</span>
          <strong className="admin-applicants-stat-card__value">{stats.reviewQueue}</strong>
          <span className="admin-applicants-stat-card__meta">applied or under review</span>
        </div>
        <div className="admin-applicants-stat-card">
          <span className="admin-applicants-stat-card__label">Shortlisted</span>
          <strong className="admin-applicants-stat-card__value">{stats.shortlisted}</strong>
          <span className="admin-applicants-stat-card__meta">ready for deeper review</span>
        </div>
        <div className="admin-applicants-stat-card">
          <span className="admin-applicants-stat-card__label">Decisions</span>
          <strong className="admin-applicants-stat-card__value">{stats.selected + stats.rejected}</strong>
          <span className="admin-applicants-stat-card__meta">
            {stats.selected} selected / {stats.rejected} rejected
          </span>
        </div>
      </div>

      <div className="table-container mb-4">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Filters</span>
          <span className="small text-muted">{filterSummary}</span>
        </div>
        <form className="p-3 admin-applicants-filters__grid" onSubmit={applySearch}>
          <div className="admin-applicants-filters__field">
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
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-applicants-filters__field">
            <label className="form-label small text-muted mb-1" htmlFor="adm-app-vacancy">
              Vacancy
            </label>
            <select
              id="adm-app-vacancy"
              className="form-select form-select-sm"
              value={vacancyIdParam}
              onChange={(e) => setVacancyFilter(e.target.value)}
              disabled={!companyIdParam}
            >
              <option value="">All vacancies</option>
              {vacancies.map((vacancy) => (
                <option key={vacancy.id} value={String(vacancy.id)}>
                  {vacancy.job_title}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-applicants-filters__field">
            <label className="form-label small text-muted mb-1" htmlFor="adm-app-status">
              Status
            </label>
            <select
              id="adm-app-status"
              className="form-select form-select-sm"
              value={statusParam}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-applicants-filters__field admin-applicants-filters__field--search">
            <label className="form-label small text-muted mb-1" htmlFor="adm-app-search">
              Search
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search" aria-hidden />
              </span>
              <input
                id="adm-app-search"
                className="form-control"
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="Student, roll number, company, role, or email"
              />
            </div>
          </div>

          <div className="admin-applicants-filters__actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Apply
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
              Clear
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadApplications}>
              Refresh
            </button>
          </div>
        </form>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Role</th>
                <th>Company</th>
                <th>Applied</th>
                <th>Resume</th>
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
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-muted text-center py-4">
                    {hasFilters ? 'No applications match the current filters.' : 'No applications have been submitted yet.'}
                  </td>
                </tr>
              ) : (
                items.map((application) => {
                  const vacancy = application.vacancy || {};
                  const student = application.student || {};
                  const resumeHref = linkHref(application.resume);
                  const portfolioHref = linkHref(application.portfolio_link);
                  const coverLetter = (application.cover_letter || '').trim();
                  const busy = updatingId === application.id;

                  return (
                    <tr key={application.id}>
                      <td>
                        <div className="fw-medium">{fmt(student.name)}</div>
                        <div className="small text-muted">{fmt(student.roll_number)}</div>
                        {student.email ? <div className="small text-muted">{student.email}</div> : null}
                        {student.id != null && (
                          <Link to={`/students/${student.id}`} className="small">
                            Profile
                          </Link>
                        )}
                      </td>
                      <td>
                        <div>{fmt(vacancy.job_title)}</div>
                        <div className="small text-muted">{vacancyRoleLabel(vacancy.role_type)}</div>
                        {vacancy.department ? (
                          <div className="small text-muted">Dept: {fmt(vacancy.department)}</div>
                        ) : null}
                      </td>
                      <td>
                        {vacancy.company_id ? (
                          <Link to={`/companies/${vacancy.company_id}`}>{fmt(vacancy.company_name)}</Link>
                        ) : (
                          fmt(vacancy.company_name)
                        )}
                      </td>
                      <td>{fmtDate(application.application_date)}</td>
                      <td>
                        {resumeHref ? (
                          <a href={resumeHref} target="_blank" rel="noopener noreferrer">
                            Resume
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {portfolioHref ? (
                          <a href={portfolioHref} target="_blank" rel="noopener noreferrer">
                            Portfolio
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <StatusBadge status={application.status} />
                      </td>
                      <td>
                        {coverLetter ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 admin-applicants-cover-btn"
                            onClick={() =>
                              setCoverModal({
                                open: true,
                                title: `${fmt(student.name)} - ${fmt(vacancy.job_title)}`,
                                body: coverLetter,
                              })
                            }
                          >
                            <span className="admin-applicants-cover-btn__preview">{previewText(coverLetter)}</span>
                            <span className="admin-applicants-cover-btn__link">View full note</span>
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-end">
                        <div className="admin-application-actions">
                          <button
                            type="button"
                            className={`btn btn-sm btn-outline-primary${application.status === 'shortlisted' ? ' is-active' : ''}`}
                            disabled={busy || application.status === 'shortlisted'}
                            onClick={() => updateStatus(application, 'shortlisted')}
                          >
                            Shortlist
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm btn-outline-success${application.status === 'selected' ? ' is-active' : ''}`}
                            disabled={busy || application.status === 'selected'}
                            onClick={() => updateStatus(application, 'selected')}
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm btn-outline-danger${application.status === 'rejected' ? ' is-active' : ''}`}
                            disabled={busy || application.status === 'rejected'}
                            onClick={() => updateStatus(application, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                        {busy ? <div className="small text-muted mt-2">Updating...</div> : null}
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
