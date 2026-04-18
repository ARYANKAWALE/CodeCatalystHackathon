import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import {
  fmt,
  fmtDate,
  vacancyRoleLabel,
  vacancyCompensation,
  vacancyDeadlinePassed,
} from '../utils/vacancyFormat';

export default function VacancyBoard() {
  const { user, loading: authLoading } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStudentViewer = role === 'student' && !isAdmin;
  const isStudent = isStudentViewer && user?.student_id != null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (roleFilter === 'internship' || roleFilter === 'full_time') {
          qs.set('role_type', roleFilter);
        }
        const data = await api.get(`/vacancies?${qs.toString()}`);
        if (!cancelled) {
          setItems(data.items || []);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load vacancies'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, roleFilter]);

  const refetch = async () => {
    const qs = new URLSearchParams();
    if (roleFilter === 'internship' || roleFilter === 'full_time') {
      qs.set('role_type', roleFilter);
    }
    const data = await api.get(`/vacancies?${qs.toString()}`);
    setItems(data.items || []);
  };

  const handleApply = async (v) => {
    setApplyingId(v.id);
    try {
      const created = await api.post(`/vacancies/${v.id}/applications`, {});
      setItems((prev) =>
        prev.map((row) =>
          row.id === v.id
            ? {
                ...row,
                my_application: {
                  id: created.id,
                  status: created.status,
                  status_label: created.status_label,
                },
              }
            : row,
        ),
      );
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit application'));
    } finally {
      setApplyingId(null);
    }
  };

  if (authLoading || loading) {
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
      <header className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1>Open roles</h1>
          <p className="subtitle mb-0">
            Posted roles across companies. Past deadlines stay visible; applying is only allowed before the deadline.
          </p>
        </div>
        {isStudentViewer && (
          <Link to="/my-applications" className="btn btn-outline-primary btn-sm">
            My applications
          </Link>
        )}
      </header>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <span className="text-muted small">Filter by type</span>
        <div className="btn-group" role="group" aria-label="Role type filter">
          <button
            type="button"
            className={`btn btn-sm ${roleFilter === '' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setRoleFilter('')}
          >
            All
          </button>
          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'internship' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setRoleFilter('internship')}
          >
            Internship
          </button>
          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'full_time' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setRoleFilter('full_time')}
          >
            Full-time
          </button>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => refetch()}>
            Refresh
          </button>
        )}
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Job title</th>
                <th>Type</th>
                <th>Department</th>
                <th>Package / stipend</th>
                <th>Deadline</th>
                {isStudentViewer ? <th className="text-end">Apply</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isStudentViewer ? 7 : 6} className="text-muted text-center py-4">
                    No vacancies match this filter
                  </td>
                </tr>
              ) : (
                items.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.company_id ? (
                        <Link to={`/companies/${v.company_id}`}>{fmt(v.company_name)}</Link>
                      ) : (
                        fmt(v.company_name)
                      )}
                    </td>
                    <td>{fmt(v.job_title)}</td>
                    <td>{vacancyRoleLabel(v.role_type)}</td>
                    <td>{fmt(v.department)}</td>
                    <td>{vacancyCompensation(v)}</td>
                    <td>{fmtDate(v.application_deadline)}</td>
                    {isStudentViewer ? (
                      <td className="text-end">
                        {isStudent ? (
                          v.my_application ? (
                            <button type="button" className="btn btn-secondary btn-sm" disabled>
                              Applied
                            </button>
                          ) : vacancyDeadlinePassed(v) ? (
                            <button type="button" className="btn btn-outline-secondary btn-sm" disabled title="Deadline has passed">
                              Closed
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={applyingId === v.id}
                              onClick={() => handleApply(v)}
                            >
                              {applyingId === v.id ? 'Applying…' : 'Apply now'}
                            </button>
                          )
                        ) : (
                          <span className="text-muted small">Link profile</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
