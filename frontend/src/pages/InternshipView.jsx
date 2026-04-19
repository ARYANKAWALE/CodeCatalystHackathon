import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';

const INTERNSHIP_STATUSES = ['applied', 'selected', 'ongoing', 'completed'];

const STATUS_LABELS = {
  applied: 'Applied',
  selected: 'Selected',
  ongoing: 'Ongoing',
  completed: 'Completed',
  rejected: 'Rejected',
};

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = String(iso).slice(0, 10);
  return d || '—';
}

function fmtDateFriendly(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtStipend(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

function computeDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const days = Math.round((e - s) / 86400000);
  if (days < 0) return null;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 30) {
    const w = Math.round(days / 7);
    return `${w} week${w !== 1 ? 's' : ''} (${days} days)`;
  }
  const m = Math.round(days / 30);
  return `${m} month${m !== 1 ? 's' : ''} (${days} days)`;
}

function computeProgress(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  const now = Date.now();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

export default function InternshipView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'student';

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable progress notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesMsg, setNotesMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/internships/${id}`);
        if (!cancelled) {
          setInternship(data);
          setNotesValue(data.progress_notes || '');
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load internship'));
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
      setError(getErrorMessage(e, 'Delete failed'));
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setNotesMsg('');
    try {
      await api.patch(`/internships/${id}/progress`, { progress_notes: notesValue.trim() });
      setInternship((prev) => ({ ...prev, progress_notes: notesValue.trim() }));
      setEditingNotes(false);
      setNotesMsg('Progress updated!');
      setTimeout(() => setNotesMsg(''), 3000);
    } catch (e) {
      setNotesMsg(getErrorMessage(e, 'Could not save progress notes'));
    } finally {
      setNotesSaving(false);
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

  const durationText = computeDuration(internship.start_date, internship.end_date);
  const progress = computeProgress(internship.start_date, internship.end_date);
  const stipendMonthly = (() => {
    if (internship.stipend == null || Number(internship.stipend) === 0) return null;
    const days = internship.duration_days;
    if (!days || days <= 0) return null;
    const months = days / 30;
    if (months < 0.5) return null;
    return Math.round(Number(internship.stipend) / months);
  })();
  const timelineStatuses = internship.status === 'rejected'
    ? ['applied', 'rejected']
    : INTERNSHIP_STATUSES;

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
          <h2>{fmt(internship.title)}</h2>
          <p className="meta mb-0">
            {[internship.student_name, internship.company_name].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Link to={`/internships/${id}/edit`} className="btn btn-primary btn-sm">
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
          currentStatus={internship.status}
          labels={STATUS_LABELS}
        />
      </div>

      {/* Stats Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-activity" aria-hidden /></div>
            <div className="detail-stat-label">Status</div>
            <div className="detail-stat-value"><StatusBadge status={internship.status} /></div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-currency-rupee" aria-hidden /></div>
            <div className="detail-stat-label">Stipend</div>
            <div className="detail-stat-value">{fmtStipend(internship.stipend)}</div>
            {stipendMonthly && (
              <div className="detail-stat-sub">≈ ₹{stipendMonthly.toLocaleString('en-IN')}/mo</div>
            )}
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-clock-history" aria-hidden /></div>
            <div className="detail-stat-label">Duration</div>
            <div className="detail-stat-value">{durationText || '—'}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="detail-stat-card">
            <div className="detail-stat-icon"><i className="bi bi-bar-chart-line" aria-hidden /></div>
            <div className="detail-stat-label">Progress</div>
            {progress !== null ? (
              <>
                <div className="detail-stat-value">{progress}%</div>
                <div className="detail-progress-bar">
                  <div
                    className="detail-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="detail-stat-value text-muted">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
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
          <div className="label">Start date</div>
          <div className="value">
            {fmtDateFriendly(internship.start_date) || '—'}
            {internship.start_date && (
              <span className="date-chip">{relativeDateLabel(internship.start_date)}</span>
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="label">End date</div>
          <div className="value">
            {fmtDateFriendly(internship.end_date) || '—'}
            {internship.end_date && (
              <span className="date-chip">{relativeDateLabel(internship.end_date)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description + Progress Notes */}
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-bottom bg-transparent">
              <i className="bi bi-file-text me-2" aria-hidden />Description
            </div>
            <div className="card-body">
              <div className="text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {internship.description?.trim() ? internship.description : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-bottom bg-transparent d-flex justify-content-between align-items-center">
              <span><i className="bi bi-journal-text me-2" aria-hidden />Progress notes</span>
              {(isOwner || isAdmin) && !editingNotes && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => { setEditingNotes(true); setNotesValue(internship.progress_notes || ''); setNotesMsg(''); }}
                >
                  <i className="bi bi-pencil me-1" aria-hidden />Update
                </button>
              )}
            </div>
            <div className="card-body">
              {notesMsg && (
                <div className={`alert ${notesMsg.includes('!') ? 'alert-success' : 'alert-danger'} py-1 px-2 small mb-2`}>
                  {notesMsg}
                </div>
              )}
              {editingNotes ? (
                <div>
                  <textarea
                    className="form-control mb-2"
                    rows={5}
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Write about your internship progress, milestones, learnings…"
                  />
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={notesSaving}
                      onClick={handleSaveNotes}
                    >
                      {notesSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setEditingNotes(false); setNotesMsg(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                  {internship.progress_notes?.trim() ? internship.progress_notes : (
                    <span className="text-muted fst-italic">
                      No progress notes yet.
                      {isOwner && ' Click "Update" to add your progress.'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
