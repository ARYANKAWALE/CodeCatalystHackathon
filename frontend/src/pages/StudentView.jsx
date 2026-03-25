import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function fmtDateRange(start, end) {
  const a = start ? start : '—';
  const b = end ? end : '—';
  if (a === '—' && b === '—') return '—';
  return `${a} → ${b}`;
}

export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await api.get(`/students/${id}`);
        if (!cancelled) {
          setStudent(s);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load student');
          setStudent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    try {
      await api.del(`/students/${id}`);
      navigate('/students');
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!student) return null;

  const internships = student.internships || [];
  const placements = student.placements || [];

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{student.name}</h2>
          <p className="meta mb-0">{student.roll_number}</p>
        </div>
        {isAdmin && (
          <div className="d-flex flex-wrap gap-2">
            <Link to={`/students/${id}/edit`} className="btn btn-primary btn-sm">
              Edit
            </Link>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="info-grid mb-4">
        <div className="info-item">
          <div className="label">Email</div>
          <div className="value">{fmt(student.email)}</div>
        </div>
        <div className="info-item">
          <div className="label">Phone</div>
          <div className="value">{fmt(student.phone)}</div>
        </div>
        <div className="info-item">
          <div className="label">Department</div>
          <div className="value">{fmt(student.department)}</div>
        </div>
        <div className="info-item">
          <div className="label">Year</div>
          <div className="value">{student.year != null ? String(student.year) : '—'}</div>
        </div>
        <div className="info-item">
          <div className="label">CGPA</div>
          <div className="value">
            {student.cgpa != null ? Number(student.cgpa).toFixed(2) : '—'}
          </div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Skills</div>
          <div className="value">{fmt(student.skills)}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Resume</div>
          <div className="value">
            {student.resume_link ? (
              <a href={student.resume_link} target="_blank" rel="noopener noreferrer">
                {student.resume_link}
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-container">
            <div className="card-header border-bottom">Internships</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Duration</th>
                    <th>Stipend</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {internships.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No internships
                      </td>
                    </tr>
                  ) : (
                    internships.map((i) => (
                      <tr key={i.id}>
                        <td>{fmt(i.title)}</td>
                        <td>{fmt(i.company_name)}</td>
                        <td>{fmtDateRange(i.start_date, i.end_date)}</td>
                        <td>{i.stipend != null ? i.stipend : '—'}</td>
                        <td>
                          <StatusBadge status={i.status} />
                        </td>
                        <td>
                          <Link to={`/internships/${i.id}`}>View</Link>
                        </td>
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
            <div className="card-header border-bottom">Placements</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Package</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {placements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted text-center py-4">
                        No placements
                      </td>
                    </tr>
                  ) : (
                    placements.map((p) => (
                      <tr key={p.id}>
                        <td>{fmt(p.role)}</td>
                        <td>{fmt(p.company_name)}</td>
                        <td>{p.package_lpa != null ? `${p.package_lpa} LPA` : '—'}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td>
                          <Link to={`/placements/${p.id}`}>View</Link>
                        </td>
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
