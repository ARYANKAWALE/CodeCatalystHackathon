import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
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

function fmtLpa(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} LPA`;
}

export default function PlacementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/placements/${id}`);
        if (!cancelled) {
          setPlacement(data);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load placement'));
          setPlacement(null);
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
    if (!window.confirm('Delete this placement? This cannot be undone.')) return;
    try {
      await api.del(`/placements/${id}`);
      navigate('/placements');
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
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

  if (error && !placement) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!placement) return null;

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{fmt(placement.role)}</h2>
          <p className="meta mb-0">
            {[placement.student_name, placement.company_name].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        {isAdmin && (
          <div className="d-flex flex-wrap gap-2">
            <Link to={`/placements/${id}/edit`} className="btn btn-primary btn-sm">
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
            <Link to={`/students/${placement.student_id}`}>{fmt(placement.student_name)}</Link>
          </div>
        </div>
        <div className="info-item">
          <div className="label">Company</div>
          <div className="value">
            <Link to={`/companies/${placement.company_id}`}>{fmt(placement.company_name)}</Link>
          </div>
        </div>
        <div className="info-item">
          <div className="label">Role</div>
          <div className="value">{fmt(placement.role)}</div>
        </div>
        <div className="info-item">
          <div className="label">Package</div>
          <div className="value">{fmtLpa(placement.package_lpa)}</div>
        </div>
        <div className="info-item">
          <div className="label">Offer date</div>
          <div className="value">{fmtDate(placement.offer_date)}</div>
        </div>
        <div className="info-item">
          <div className="label">Joining date</div>
          <div className="value">{fmtDate(placement.joining_date)}</div>
        </div>
        <div className="info-item">
          <div className="label">Status</div>
          <div className="value">
            <StatusBadge status={placement.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
