import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = String(iso).slice(0, 19).replace('T', ' ');
  return d || '—';
}

export default function AppealList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const status = searchParams.get('status') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const role = String(user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStudent = role === 'student' && !isAdmin;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    if (status) p.set('status', status);
    return p.toString();
  }, [page, status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/appeals?${query}`);
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load requests'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

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

  const handleAccept = async (id) => {
    if (!window.confirm('Accept this request? A matching internship or placement record will be created for the student.')) return;
    setActionId(id);
    try {
      await api.post(`/appeals/${id}/accept`, {});
      const res = await api.get(`/appeals?${query}`);
      setData(res);
    } catch (e) {
      window.alert(getErrorMessage(e, 'Accept failed'));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    const note = window.prompt('Optional message to the student (reason for rejection):') ?? '';
    if (note === null) return;
    setActionId(id);
    try {
      await api.post(`/appeals/${id}/reject`, { admin_note: note.trim() });
      const res = await api.get(`/appeals?${query}`);
      setData(res);
    } catch (e) {
      window.alert(getErrorMessage(e, 'Reject failed'));
    } finally {
      setActionId(null);
    }
  };

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const statuses = data?.statuses ?? ['pending', 'accepted', 'rejected'];

  if (loading && !data) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h1>{isAdmin ? 'Appeal requests' : 'My requests'}</h1>
          <p className="subtitle mb-0">
            {isAdmin
              ? 'Review student requests for internships and placements.'
              : 'Track requests you sent to admins.'}
          </p>
        </div>
        {isStudent && (
          <Link to="/appeals/new" className="btn btn-primary">New request</Link>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3 border-0 shadow-sm">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div>
            <label className="form-label small text-muted mb-1" htmlFor="ap-status">Status</label>
            <select
              id="ap-status"
              className="form-select form-select-sm"
              style={{ minWidth: '12rem' }}
              value={status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
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
                {isAdmin && <th>Student</th>}
                <th>Company</th>
                <th>Type</th>
                <th>Title / role</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-muted text-center py-5">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    {isAdmin && (
                      <td>
                        <div className="fw-medium">{row.student_name || '—'}</div>
                        <div className="small text-muted">{row.student_roll || ''}</div>
                      </td>
                    )}
                    <td>{row.company_name || '—'}</td>
                    <td className="text-capitalize">{row.appeal_type || '—'}</td>
                    <td>
                      <div>{row.title || '—'}</div>
                      {row.appeal_type === 'placement' && row.package_lpa != null && (
                        <div className="small text-muted">{Number(row.package_lpa).toFixed(2)} LPA (expected)</div>
                      )}
                      {row.message && <div className="small text-body-secondary mt-1">{row.message}</div>}
                      {row.status === 'rejected' && row.admin_note && (
                        <div className="small text-danger mt-1">Admin: {row.admin_note}</div>
                      )}
                      {row.status === 'accepted' && (
                        <div className="small mt-1">
                          {row.result_internship_id && (
                            <Link to={`/internships/${row.result_internship_id}`}>View internship record</Link>
                          )}
                          {row.result_placement_id && (
                            <Link to={`/placements/${row.result_placement_id}`}>View placement record</Link>
                          )}
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td className="text-nowrap small">{fmtDate(row.created_at)}</td>
                    <td>
                      {isAdmin && row.status === 'pending' && (
                        <div className="d-flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={actionId === row.id}
                            onClick={() => handleAccept(row.id)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={actionId === row.id}
                            onClick={() => handleReject(row.id)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {!isAdmin && row.status === 'pending' && (
                        <span className="text-muted small">Awaiting admin</span>
                      )}
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
