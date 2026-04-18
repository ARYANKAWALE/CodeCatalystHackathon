import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { fmt, fmtDate, vacancyRoleLabel } from '../utils/vacancyFormat';

function resumeLinkHref(resume) {
  if (!resume || typeof resume !== 'string') return null;
  const s = resume.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return null;
}

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const isStudentViewer = role === 'student';
  const isStudent = isStudentViewer && user?.student_id != null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !isStudent) {
      if (!authLoading && !isStudent) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/me/applications');
        if (!cancelled) {
          setItems(data.items || []);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load applications'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isStudent]);

  if (authLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isStudentViewer) {
    return (
      <div className="alert alert-info" role="alert">
        Job applications are available to student accounts.
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="alert alert-info" role="alert">
        Link your student profile to your account to view and track vacancy applications.{' '}
        <Link to="/my-profile">My profile</Link>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1>My applications</h1>
          <p className="subtitle mb-0">Vacancies you have applied for</p>
        </div>
        <Link to="/vacancies" className="btn btn-outline-primary btn-sm">
          Browse open roles
        </Link>
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Type</th>
                <th>Applied</th>
                <th>Résumé</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-4">
                    You have not applied to any vacancies yet.{' '}
                    <Link to="/vacancies">Browse open roles</Link>.
                  </td>
                </tr>
              ) : (
                items.map((a) => {
                  const v = a.vacancy || {};
                  const cid = v.company_id;
                  return (
                    <tr key={a.id}>
                      <td>
                        {cid ? (
                          <Link to={`/companies/${cid}`}>{fmt(v.company_name)}</Link>
                        ) : (
                          fmt(v.company_name)
                        )}
                      </td>
                      <td>{fmt(v.job_title)}</td>
                      <td>{vacancyRoleLabel(v.role_type)}</td>
                      <td>{fmtDate(a.application_date)}</td>
                      <td>
                        {(() => {
                          const href = resumeLinkHref(a.resume);
                          return href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          ) : (
                            '—'
                          );
                        })()}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
