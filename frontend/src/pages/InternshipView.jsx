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

function fmtStipend(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function InternshipView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/internships/${id}`);
        if (!cancelled) {
          setInternship(data);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load internship');
          setInternship(null);
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
    if (!window.confirm('Delete this internship? This cannot be undone.')) return;
    try {
      await api.del(`/internships/${id}`);
      navigate('/internships');
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

  if (error && !internship) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!internship) return null;

  const durationText =
    internship.duration_days != null && internship.duration_days !== ''
      ? `${internship.duration_days} days`
      : '—';

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{fmt(internship.title)}</h2>
          <p className="meta mb-0">
            {[internship.student_name, internship.company_name].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        {isAdmin && (
          <div className="d-flex flex-wrap gap-2">
            <Link to={`/internships/${id}/edit`} className="btn btn-primary btn-sm">
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
          <div className="label">Student</div>
          <div className="value">
            <Link to={`/students/${internship.student_id}`}>{fmt(internship.student_name)}</Link>
          </div>
        </div>
        <div className="info-item">
          <div className="label">Company</div>
          <div className="value">
            <Link to={`/companies/${internship.company_id}`}>{fmt(internship.company_name)}</Link>
          </div>
        </div>
        <div className="info-item">
          <div className="label">Status</div>
          <div className="value">
            <StatusBadge status={internship.status} />
          </div>
        </div>
        <div className="info-item">
          <div className="label">Start date</div>
          <div className="value">{fmtDate(internship.start_date)}</div>
        </div>
        <div className="info-item">
          <div className="label">End date</div>
          <div className="value">{fmtDate(internship.end_date)}</div>
        </div>
        <div className="info-item">
          <div className="label">Duration</div>
          <div className="value">{durationText}</div>
        </div>
        <div className="info-item">
          <div className="label">Stipend</div>
          <div className="value">{fmtStipend(internship.stipend)}</div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-bottom bg-transparent">Description</div>
            <div className="card-body">
              <div className="text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {internship.description?.trim() ? internship.description : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-bottom bg-transparent">Progress notes</div>
            <div className="card-body">
              <div className="text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {internship.progress_notes?.trim() ? internship.progress_notes : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
