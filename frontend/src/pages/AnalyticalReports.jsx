import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function fmtLpa(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  const s = num.toFixed(3).replace(/\.?0+$/, '');
  return `${s} LPA`;
}

function fmtStipend(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function StatCard({ iconWrapClass, iconClass, label, value }) {
  return (
    <div className="analytics-stat-card">
      <div className={`analytics-stat-icon ${iconWrapClass}`}>
        <i className={`bi ${iconClass}`} aria-hidden />
      </div>
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value">{value}</div>
    </div>
  );
}

export default function AnalyticalReports() {
  const [tab, setTab] = useState('placement');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports/analytics');
        if (!cancelled) {
          setData(res);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load analytics');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  const p = data?.placement;
  const i = data?.internship;

  return (
    <div className="analytics-page">
      <div className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h1>Analytical Reports</h1>
          <p className="subtitle mb-0">Detailed summaries and breakdowns of placement activities.</p>
        </div>
        <Link to="/reports" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-grid-3x3-gap me-1" aria-hidden />
          All reports
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="analytics-tabs mb-4" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'placement'}
          className={`analytics-tab ${tab === 'placement' ? 'is-active' : ''}`}
          onClick={() => setTab('placement')}
        >
          Placement Summary
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'internship'}
          className={`analytics-tab ${tab === 'internship' ? 'is-active' : ''}`}
          onClick={() => setTab('internship')}
        >
          Internship Summary
        </button>
      </div>

      {tab === 'placement' && p && (
        <>
          <div className="row g-3 g-md-4 mb-4">
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--primary"
                iconClass="bi-award-fill"
                label="Total Placed"
                value={p.total_placed}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--success"
                iconClass="bi-graph-up-arrow"
                label="Average Package"
                value={fmtLpa(p.avg_package)}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--info"
                iconClass="bi-graph-up-arrow"
                label="Highest Package"
                value={fmtLpa(p.highest_package)}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--warning"
                iconClass="bi-graph-down-arrow"
                label="Lowest Package"
                value={fmtLpa(p.lowest_package)}
              />
            </div>
          </div>

          <div className="row g-3 g-md-4">
            <div className="col-lg-7">
              <div className="analytics-panel h-100">
                <div className="analytics-panel-head">
                  <h2 className="analytics-panel-title">Department Breakdown</h2>
                  <p className="analytics-panel-sub">Placements metrics by discipline</p>
                </div>
                <div className="table-responsive">
                  <table className="table table-borderless analytics-table mb-0">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="text-end">Students</th>
                        <th className="text-end">Placed</th>
                        <th className="text-end">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(p.departments || []).map((r) => (
                        <tr key={r.department}>
                          <td>{r.department}</td>
                          <td className="text-end">{r.total_students}</td>
                          <td className="text-end">{r.placed}</td>
                          <td className="text-end">{r.rate_pct != null ? `${r.rate_pct}%` : '—'}</td>
                        </tr>
                      ))}
                      {(!p.departments || p.departments.length === 0) && (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-4">
                            No department data yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="analytics-panel h-100">
                <div className="analytics-panel-head d-flex align-items-start gap-2">
                  <div className="analytics-panel-icon-wrap analytics-icon--primary">
                    <i className="bi bi-building" aria-hidden />
                  </div>
                  <div>
                    <h2 className="analytics-panel-title mb-0">Top Recruiters</h2>
                    <p className="analytics-panel-sub mb-0">Companies hiring the most students</p>
                  </div>
                </div>
                <ol className="analytics-ranked-list">
                  {(p.top_recruiters || []).map((r, idx) => (
                    <li key={`${r.company_name}-${idx}`} className="analytics-ranked-item">
                      <div className="analytics-ranked-main">
                        <span className="analytics-ranked-name">{r.company_name}</span>
                        <span className="analytics-ranked-meta">
                          {r.hires} {r.hires === 1 ? 'Hire' : 'Hires'}, Avg: {fmtLpa(r.avg_package)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {(!p.top_recruiters || p.top_recruiters.length === 0) && (
                    <p className="text-muted text-center py-3 mb-0 small">No placement data yet.</p>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'internship' && i && (
        <>
          <div className="row g-3 g-md-4 mb-4">
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--primary"
                iconClass="bi-briefcase-fill"
                label="Total Internships"
                value={i.total_internships}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--success"
                iconClass="bi-check-circle-fill"
                label="Completed"
                value={i.completed}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--warning"
                iconClass="bi-hourglass-split"
                label="Ongoing"
                value={i.ongoing}
              />
            </div>
            <div className="col-6 col-xl-3">
              <StatCard
                iconWrapClass="analytics-icon--info"
                iconClass="bi-currency-rupee"
                label="Avg Stipend"
                value={i.avg_stipend > 0 ? fmtStipend(i.avg_stipend) : '—'}
              />
            </div>
          </div>

          <div className="row g-3 g-md-4">
            <div className="col-lg-7">
              <div className="analytics-panel h-100">
                <div className="analytics-panel-head">
                  <h2 className="analytics-panel-title">Department Breakdown</h2>
                  <p className="analytics-panel-sub">Internship coverage by discipline</p>
                </div>
                <div className="table-responsive">
                  <table className="table table-borderless analytics-table mb-0">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="text-end">Students</th>
                        <th className="text-end">With internship</th>
                        <th className="text-end">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(i.departments || []).map((r) => (
                        <tr key={r.department}>
                          <td>{r.department}</td>
                          <td className="text-end">{r.total_students}</td>
                          <td className="text-end">{r.with_internship}</td>
                          <td className="text-end">{r.rate_pct != null ? `${r.rate_pct}%` : '—'}</td>
                        </tr>
                      ))}
                      {(!i.departments || i.departments.length === 0) && (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-4">
                            No department data yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="analytics-panel h-100">
                <div className="analytics-panel-head d-flex align-items-start gap-2">
                  <div className="analytics-panel-icon-wrap analytics-icon--primary">
                    <i className="bi bi-building" aria-hidden />
                  </div>
                  <div>
                    <h2 className="analytics-panel-title mb-0">Top Host Companies</h2>
                    <p className="analytics-panel-sub mb-0">Most internship engagements</p>
                  </div>
                </div>
                <ol className="analytics-ranked-list">
                  {(i.top_hosts || []).map((r, idx) => (
                    <li key={`${r.company_name}-${idx}`} className="analytics-ranked-item">
                      <div className="analytics-ranked-main">
                        <span className="analytics-ranked-name">{r.company_name}</span>
                        <span className="analytics-ranked-meta">
                          {r.internships} {r.internships === 1 ? 'slot' : 'slots'}, Avg stipend:{' '}
                          {fmtStipend(r.avg_stipend)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {(!i.top_hosts || i.top_hosts.length === 0) && (
                    <p className="text-muted text-center py-3 mb-0 small">No internship data yet.</p>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
