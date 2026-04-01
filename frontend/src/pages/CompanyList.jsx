import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

function buildListQuery(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const industry = searchParams.get('industry') || '';
  return { page, industry };
}

function websiteHref(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export default function CompanyList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, industry } = useMemo(() => buildListQuery(searchParams), [searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (industry) params.set('industry', industry);

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
  }, [page, industry]);

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.set('page', '1');
      return next;
    });
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

  if (loading && !data) {
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
      <div className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h1>Companies</h1>
          <p className="subtitle mb-0">
            {total === 1 ? '1 company' : `${total} companies`}
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

      <div className="card mb-3 border-0 shadow-sm">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div>
            <label className="form-label small text-muted mb-1" htmlFor="filter-industry">
              Industry
            </label>
            <select
              id="filter-industry"
              className="form-select form-select-sm"
              style={{ minWidth: '14rem' }}
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
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Industry</th>
                <th>Contact Person</th>
                <th>Contact Email</th>
                <th>Website</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-5">
                    No companies match your filters.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const href = websiteHref(c.website);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/companies/${c.id}`}>{c.name}</Link>
                      </td>
                      <td>{c.industry || '—'}</td>
                      <td>{c.contact_person || '—'}</td>
                      <td>{c.contact_email || '—'}</td>
                      <td>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {c.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <Link to={`/companies/${c.id}`} className="btn btn-sm btn-outline-secondary">
                            View
                          </Link>
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
