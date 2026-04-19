import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';

const PLACEMENT_STATUSES = [
  'applied', 'shortlisted', 'interview_scheduled', 'selected',
  'offer_received', 'accepted', 'placed',
];

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview',
  selected: 'Selected',
  offer_received: 'Offer',
  accepted: 'Accepted',
  placed: 'Placed',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function fmtDateFriendly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtLpa(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} LPA`;
}

function lpaToMonthly(lpa) {
  if (lpa == null || lpa === '' || Number.isNaN(Number(lpa))) return null;
  const monthly = (Number(lpa) * 100000) / 12;
  return `₹${Math.round(monthly).toLocaleString('en-IN')}/mo`;
}

function relativeDateLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
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

  const timelineStatuses =
    placement.status === 'rejected' ? ['applied', 'rejected'] :
    placement.status === 'withdrawn' ? ['applied', 'withdrawn'] :
    PLACEMENT_STATUSES;

  const monthly = lpaToMonthly(placement.package_lpa);

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{fmt(placement.role)}</h2>
          <p className="meta mb-0">
            {[placement.student_name, placement.company_name].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Link to={`/placements/${id}/edit`} className="btn btn-primary btn-sm">
                <i className="bi bi-pencil me-1" aria-hidden />Edit
              </Link>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
                <i className="bi bi-trash me-1" aria-hidden />Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="detail-section mb-4">
        <StatusTimeline
          statuses={timelineStatuses}
          currentStatus={placement.status}
          labels={STATUS_LABELS}
        />
      </div>

      {/* Package Highlight + Stats */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="detail-stat-card detail-stat-card--highlight">
            <div className="detail-stat-icon"><i className="bi bi-currency-rupee" aria-hidden /></div>
            <div className="detail-stat-label">Package</div>
            <div className="detail-stat-value detail-stat-value--large">{fmtLpa(placement.package_lpa)}</div>
            {monthly && <div className="detail-stat-sub">{monthly}</div>}
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-activity" aria-hidden /></div>
            <div className="detail-stat-label">Status</div>
            <div className="detail-stat-value"><StatusBadge status={placement.status} /></div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-calendar-check" aria-hidden /></div>
            <div className="detail-stat-label">Created</div>
            <div className="detail-stat-value">{fmtDateFriendly(placement.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
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
          <div className="label">Offer date</div>
          <div className="value">
            {fmtDateFriendly(placement.offer_date)}
            {placement.offer_date && (
              <span className="date-chip">{relativeDateLabel(placement.offer_date)}</span>
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="label">Joining date</div>
          <div className="value">
            {fmtDateFriendly(placement.joining_date)}
            {placement.joining_date && (
              <span className="date-chip">{relativeDateLabel(placement.joining_date)}</span>
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="label">Status</div>
          <div className="value"><StatusBadge status={placement.status} /></div>
        </div>
      </div>
    </div>
  );
}
