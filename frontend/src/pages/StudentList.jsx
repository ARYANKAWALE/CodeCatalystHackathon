import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

function buildListQuery(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const department = searchParams.get('department') || '';
  const year = searchParams.get('year') || '';
  return { page, department, year };
}

export default function StudentList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, department, year } = useMemo(
    () => buildListQuery(searchParams),
    [searchParams],
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (department) params.set('department', department);
    if (year) params.set('year', year);

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/students?${params.toString()}`);
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load students');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, department, year]);

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
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    try {
      await api.del(`/students/${id}`);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (department) params.set('department', department);
      if (year) params.set('year', year);
      const res = await api.get(`/students?${params.toString()}`);
      setData(res);
      setError('');
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  const items = data?.items ?? [];
  const departments = data?.departments ?? [];
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
          <h1>Students</h1>
          <p className="subtitle mb-0">
            {total === 1 ? '1 student' : `${total} students`}
          </p>
        </div>
        {isAdmin && (
          <Link to="/students/add" className="btn btn-primary">
            Add Student
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
            <label className="form-label small text-muted mb-1" htmlFor="filter-dept">
              Department
            </label>
            <select
              id="filter-dept"
              className="form-select form-select-sm"
              style={{ minWidth: '12rem' }}
              value={department}
              onChange={(e) => setFilter('department', e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small text-muted mb-1" htmlFor="filter-year">
              Year
            </label>
            <select
              id="filter-year"
              className="form-select form-select-sm"
              style={{ minWidth: '8rem' }}
              value={year}
              onChange={(e) => setFilter('year', e.target.value)}
            >
              <option value="">All years</option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
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
                <th>Roll No</th>
                <th>Email</th>
                <th>Department</th>
                <th>Year</th>
                <th>CGPA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted text-center py-5">
                    No students match your filters.
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/students/${s.id}`}>{s.name}</Link>
                    </td>
                    <td>{s.roll_number}</td>
                    <td>{s.email}</td>
                    <td>{s.department}</td>
                    <td>{s.year}</td>
                    <td>{s.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline-secondary">
                          View
                        </Link>
                        {isAdmin && (
                          <Link to={`/students/${s.id}/edit`} className="btn btn-sm btn-outline-primary">
                            Edit
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(s.id)}
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
