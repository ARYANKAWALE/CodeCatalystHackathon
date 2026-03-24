import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = String(iso).slice(0, 10);
  return d || '—';
}

function websiteHref(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export default function CompanyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStudent = role === 'student' && !isAdmin && user?.student_id != null;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const c = await api.get(`/companies/${id}`);
        if (!cancelled) {
          setCompany(c);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load company');
          setCompany(null);
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
    if (!window.confirm('Delete this company? This cannot be undone.')) return;
    try {
      await api.del(`/companies/${id}`);
      navigate('/companies');
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

  if (error && !company) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!company) return null;

  const internships = company.internships || [];
  const placements = company.placements || [];
  const site = websiteHref(company.website);

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{company.name}</h2>
          <p className="meta mb-0">{fmt(company.industry)}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {isStudent && (
            <>
              <Link
                to={`/appeals/new?company_id=${id}&type=internship`}
                className="btn btn-outline-primary btn-sm"
              >
                Request internship
              </Link>
              <Link
                to={`/appeals/new?company_id=${id}&type=placement`}
                className="btn btn-outline-primary btn-sm"
              >
                Request placement
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to={`/companies/${id}/edit`} className="btn btn-primary btn-sm">
                Edit
              </Link>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="info-grid mb-4">
        <div className="info-item">
          <div className="label">Industry</div>
          <div className="value">{fmt(company.industry)}</div>
        </div>
        <div className="info-item">
          <div className="label">Website</div>
          <div className="value">
            {site ? (
              <a href={site} target="_blank" rel="noopener noreferrer">
                {company.website}
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="label">Contact person</div>
          <div className="value">{fmt(company.contact_person)}</div>
        </div>
        <div className="info-item">
          <div className="label">Contact email</div>
          <div className="value">{fmt(company.contact_email)}</div>
        </div>
        <div className="info-item">
          <div className="label">Contact phone</div>
          <div className="value">{fmt(company.contact_phone)}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Address</div>
          <div className="value">{fmt(company.address)}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Description</div>
          <div className="value">{fmt(company.description)}</div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-container">
            <div className="card-header border-bottom">Internships at this company</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Start</th>
                    <th>End</th>
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
                        <td>{fmt(i.student_name)}</td>
                        <td>{fmtDate(i.start_date)}</td>
                        <td>{fmtDate(i.end_date)}</td>
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
            <div className="card-header border-bottom">Placements at this company</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Student</th>
                    <th>Package (LPA)</th>
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
                        <td>{fmt(p.student_name)}</td>
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
