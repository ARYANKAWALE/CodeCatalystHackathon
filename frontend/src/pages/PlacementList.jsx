import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

function buildListQuery(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const status = searchParams.get('status') || '';
  const companyId = searchParams.get('company_id') || '';
  return { page, status, companyId };
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = String(iso).slice(0, 10);
  return d || '—';
}

function fmtLpa(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} LPA`;
}

export default function PlacementList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, status, companyId } = useMemo(() => buildListQuery(searchParams), [searchParams]);

  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (status) params.set('status', status);
    if (companyId) params.set('company_id', companyId);

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/placements?${params.toString()}`);
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load placements');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, status, companyId]);

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
    if (!window.confirm('Delete this placement? This cannot be undone.')) return;
    try {
      await api.del(`/placements/${id}`);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (status) params.set('status', status);
      if (companyId) params.set('company_id', companyId);
      const res = await api.get(`/placements?${params.toString()}`);
      setData(res);
      setError('');
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  const items = data?.items ?? [];
  const statuses = data?.statuses ?? [];
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
          <h1>Placements</h1>
          <p className="subtitle mb-0">
            {total === 1 ? '1 placement' : `${total} placements`}
          </p>
        </div>
        {isAdmin && (
          <Link to="/placements/add" className="btn btn-primary">
            Add Placement
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
            <label className="form-label small text-muted mb-1" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              className="form-select form-select-sm"
              style={{ minWidth: '12rem' }}
              value={status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small text-muted mb-1" htmlFor="filter-company">
              Company
            </label>
            <select
              id="filter-company"
              className="form-select form-select-sm"
              style={{ minWidth: '14rem' }}
              value={companyId}
              onChange={(e) => setFilter('company_id', e.target.value)}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
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
                <th>Student Name</th>
                <th>Company</th>
                <th>Role</th>
                <th>Package</th>
                <th>Offer Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted text-center py-5">
                    No placements match your filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/students/${row.student_id}`}>{row.student_name || '—'}</Link>
                    </td>
                    <td>
                      <Link to={`/companies/${row.company_id}`}>{row.company_name || '—'}</Link>
                    </td>
                    <td>{row.role || '—'}</td>
                    <td>{fmtLpa(row.package_lpa)}</td>
                    <td>{fmtDate(row.offer_date)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <Link to={`/placements/${row.id}`} className="btn btn-sm btn-outline-secondary">
                          View
                        </Link>
                        {isAdmin && (
                          <Link to={`/placements/${row.id}/edit`} className="btn btn-sm btn-outline-primary">
                            Edit
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(row.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={pages} onPageChange={onPageChange} />
    </div>
  );
}
