import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function SearchResults() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const q = useMemo(() => (searchParams.get('q') || '').trim(), [searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        const res = await api.get(`/search?${params.toString()}`);
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Search failed');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const showStudentResults = user?.role === 'admin';
  const students = showStudentResults ? (data?.students ?? []) : [];
  const companies = data?.companies ?? [];
  const internships = data?.internships ?? [];
  const placements = data?.placements ?? [];
  const allEmpty =
    !loading &&
    !error &&
    students.length === 0 &&
    companies.length === 0 &&
    internships.length === 0 &&
    placements.length === 0;

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1>Search Results</h1>
          <p className="subtitle mb-0">
            {q ? (
              <>
                Query: <strong>{q}</strong>
              </>
            ) : (
              user?.role === 'admin'
                ? 'Enter a search query to find students, companies, internships, and placements.'
                : 'Enter a search query to find companies, internships, and placements.'
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {allEmpty && (
        <div className="empty-state card border-0 shadow-sm">
          <i className="bi bi-search" aria-hidden />
          <h4>No results found</h4>
          <p className="mb-0">
            {q ? 'Try different keywords or check spelling.' : 'Use the search box to look up records.'}
          </p>
        </div>
      )}

      {showStudentResults && students.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header">Students</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll No</th>
                    <th>Email</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/students/${s.id}`}>{s.name}</Link>
                      </td>
                      <td>{s.roll_number}</td>
                      <td>{s.email}</td>
                      <td>{s.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {companies.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header">Companies</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Contact Person</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/companies/${c.id}`}>{c.name}</Link>
                      </td>
                      <td>{c.industry || '—'}</td>
                      <td>{c.contact_person || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {internships.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header">Internships</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {internships.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link to={`/internships/${i.id}`}>{i.title}</Link>
                      </td>
                      <td>{i.student_name || '—'}</td>
                      <td>{i.company_name || '—'}</td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {placements.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header">Placements</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Package LPA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/placements/${p.id}`}>{p.role}</Link>
                      </td>
                      <td>{p.student_name || '—'}</td>
                      <td>{p.company_name || '—'}</td>
                      <td>{p.package_lpa != null ? Number(p.package_lpa).toFixed(2) : '—'}</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
