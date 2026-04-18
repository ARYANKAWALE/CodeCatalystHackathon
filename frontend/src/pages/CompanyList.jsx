import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 15;

function buildListQuery(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const industry = searchParams.get('industry') || '';
  const q = (searchParams.get('q') || '').trim();
  return { page, industry, q };
}

function websiteHref(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function excerpt(text, max = 96) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trimEnd()}...`;
}

export default function CompanyList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, industry, q } = useMemo(() => buildListQuery(searchParams), [searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState(q);

  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (industry) params.set('industry', industry);
    if (q) params.set('q', q);

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/companies?${params.toString()}`);
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load companies'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, industry, q]);

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.set('page', '1');
      return next;
    });
  };

  const clearFilters = () => {
    setQueryInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('industry');
      next.delete('q');
      next.delete('page');
      return next;
    });
  };

  const applySearch = (e) => {
    e.preventDefault();
    setFilter('q', queryInput.trim());
  };

  const onPageChange = (p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      return next;
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this company? This cannot be undone.')) return;
    try {
      await api.del(`/companies/${id}`);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (industry) params.set('industry', industry);
      if (q) params.set('q', q);
      const res = await api.get(`/companies?${params.toString()}`);
      setData(res);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  };

  const items = data?.items ?? [];
  const industries = data?.industries ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const isAdmin = user?.role === 'admin';
  const showingStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingEnd = total === 0 ? 0 : showingStart + items.length - 1;
  const hasFilters = Boolean(industry || q);
  const filterSummary = hasFilters
    ? [industry ? `Industry: ${industry}` : null, q ? `Search: "${q}"` : null].filter(Boolean).join(' | ')
    : 'Browse the full employer directory';

  if (loading && !data) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h1>Companies</h1>
          <p className="subtitle mb-0">
            {total === 1 ? '1 company in the network' : `${total} companies in the network`}
          </p>
        </div>
        {isAdmin && (
          <Link to="/companies/add" className="btn btn-primary">
            Add Company
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="directory-stat-card">
            <span className="directory-stat-card__label">Network</span>
            <strong className="directory-stat-card__value">{total}</strong>
            <span className="directory-stat-card__meta">registered companies</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="directory-stat-card">
            <span className="directory-stat-card__label">Showing</span>
            <strong className="directory-stat-card__value">
              {showingStart}-{showingEnd}
            </strong>
            <span className="directory-stat-card__meta">results on page {page}</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="directory-stat-card">
            <span className="directory-stat-card__label">Focus</span>
            <strong className="directory-stat-card__value directory-stat-card__value--small">
              {hasFilters ? 'Filtered view' : 'Full directory'}
            </strong>
            <span className="directory-stat-card__meta">{filterSummary}</span>
          </div>
        </div>
      </div>

      <div className="table-container company-directory-filters mb-4">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>Find companies</span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={clearFilters}
            disabled={!hasFilters && !queryInput}
          >
            Clear filters
          </button>
        </div>
        <form className="p-3 company-directory-filters__grid" onSubmit={applySearch}>
          <div className="company-directory-filters__field company-directory-filters__field--search">
            <label className="form-label small text-muted mb-1" htmlFor="filter-company-search">
              Search
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search" aria-hidden />
              </span>
              <input
                id="filter-company-search"
                className="form-control"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Name, industry, contact person, or email"
              />
            </div>
          </div>

          <div className="company-directory-filters__field">
            <label className="form-label small text-muted mb-1" htmlFor="filter-industry">
              Industry
            </label>
            <select
              id="filter-industry"
              className="form-select form-select-sm"
              value={industry}
              onChange={(e) => setFilter('industry', e.target.value)}
            >
              <option value="">All industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div className="company-directory-filters__actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Apply
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={clearFilters}
              disabled={!hasFilters && !queryInput}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Industry</th>
                <th>Contact</th>
                <th>Website</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted text-center py-5">
                    {hasFilters ? 'No companies match the current search or industry filter.' : 'No companies available yet.'}
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const href = websiteHref(c.website);
                  const description = excerpt(c.description);

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="company-directory__name-cell">
                          <Link to={`/companies/${c.id}`} className="company-directory__name">
                            {c.name}
                          </Link>
                          {description ? (
                            <div className="company-directory__meta">{description}</div>
                          ) : (
                            <div className="company-directory__meta text-muted">No description provided</div>
                          )}
                        </div>
                      </td>
                      <td>{c.industry || '-'}</td>
                      <td>
                        <div className="company-directory__contact">
                          <span>{c.contact_person || 'No contact person'}</span>
                          {c.contact_email ? (
                            <a href={`mailto:${c.contact_email}`}>{c.contact_email}</a>
                          ) : (
                            <span className="text-muted">No email listed</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            Visit site
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className="company-directory__actions">
                          <Link to={`/companies/${c.id}`} className="btn btn-sm btn-outline-secondary">
                            View
                          </Link>
                          {isAdmin && (
                            <Link
                              to={`/admin/applications?company_id=${c.id}`}
                              className="btn btn-sm btn-outline-info"
                            >
                              Applicants
                            </Link>
                          )}
                          {isAdmin && (
                            <Link to={`/companies/${c.id}/edit`} className="btn btn-sm btn-outline-primary">
                              Edit
                            </Link>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(c.id)}
                            >
                              Delete
                            </button>
                          )}
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

      <Pagination page={page} pages={pages} onPageChange={onPageChange} />
    </div>
  );
}
