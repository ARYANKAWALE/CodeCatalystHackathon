import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const role = String(user?.role ?? '').toLowerCase();
  const isStudent = role === 'student' && user?.student_id != null;

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/reports/me');
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load report');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isStudent]);

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }
  if (!isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const ic = data?.internship_status_counts || {};
  const pc = data?.placement_status_counts || {};
  const ac = data?.appeal_counts || {};

  return (
    <div>
      <div className="page-header mb-4">
        <h1>My report</h1>
        <p className="subtitle mb-0">Your internships, placements, and appeal activity (only you can see this).</p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header fw-semibold">Internships by status</div>
            <ul className="list-group list-group-flush">
              {Object.keys(ic).length === 0 ? (
                <li className="list-group-item text-muted">No data</li>
              ) : (
                Object.entries(ic).map(([k, v]) => (
                  <li key={k} className="list-group-item d-flex justify-content-between align-items-center">
                    <StatusBadge status={k} />
                    <span className="fw-semibold">{v}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header fw-semibold">Placements by status</div>
            <ul className="list-group list-group-flush">
              {Object.keys(pc).length === 0 ? (
                <li className="list-group-item text-muted">No data</li>
              ) : (
                Object.entries(pc).map(([k, v]) => (
                  <li key={k} className="list-group-item d-flex justify-content-between align-items-center">
                    <StatusBadge status={k} />
                    <span className="fw-semibold">{v}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header fw-semibold">Appeal requests</div>
            <ul className="list-group list-group-flush">
              {['pending', 'accepted', 'rejected'].map((k) => (
                <li key={k} className="list-group-item d-flex justify-content-between align-items-center text-capitalize">
                  {k}
                  <span className="fw-semibold">{ac[k] ?? 0}</span>
                </li>
              ))}
            </ul>
            <div className="card-body pt-0">
              <Link to="/appeals" className="btn btn-sm btn-outline-primary">Manage requests</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-container">
            <div className="card-header border-bottom">Recent internships</div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr><th>Company</th><th>Title</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(data?.recent_internships || []).length === 0 ? (
                    <tr><td colSpan={3} className="text-muted text-center py-4">None</td></tr>
                  ) : (
                    data.recent_internships.map((i) => (
                      <tr key={i.id}>
                        <td>{i.company_name}</td>
                        <td><Link to={`/internships/${i.id}`}>{i.title}</Link></td>
                        <td><StatusBadge status={i.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="table-container">
            <div className="card-header border-bottom">Recent placements</div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr><th>Company</th><th>Role</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(data?.recent_placements || []).length === 0 ? (
                    <tr><td colSpan={3} className="text-muted text-center py-4">None</td></tr>
                  ) : (
                    data.recent_placements.map((p) => (
                      <tr key={p.id}>
                        <td>{p.company_name}</td>
                        <td><Link to={`/placements/${p.id}`}>{p.role}</Link></td>
                        <td><StatusBadge status={p.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
