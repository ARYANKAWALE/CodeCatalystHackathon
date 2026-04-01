import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import NotificationBell from '../components/NotificationBell';
import { InternshipsEmptyIllustration, PlacementsEmptyIllustration } from '../components/StudentDashboardEmptyIllustration';
import CgpaRing from '../components/CgpaRing';
import { parseSkillTags } from '../utils/skillsParse';

ChartJS.register(ArcElement, Tooltip);

/** Donut/legend colors (keys match Placement.STATUSES); unknown → slate */
const PLACEMENT_STATUS_COLORS = {
  applied: '#1e3a5f',
  shortlisted: '#7dd3fc',
  interview_scheduled: '#38bdf8',
  selected: '#a78bfa',
  offer_received: '#fbbf24',
  accepted: '#34d399',
  placed: '#7c6f9e',
  rejected: '#475569',
  withdrawn: '#94a3b8',
};

function placementStatusColor(key) {
  return PLACEMENT_STATUS_COLORS[key] || '#64748b';
}

function buildDoughnutOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        titleColor: dark ? '#ffffff' : '#0f172a',
        bodyColor: dark ? '#e2e8f0' : '#334155',
        backgroundColor: dark ? 'rgba(30, 41, 59, 0.96)' : '#ffffff',
        borderColor: dark ? '#475569' : '#e2e8f0',
        borderWidth: 1,
      },
    },
  };
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

function computeStudentGlanceStats(internships, placements) {
  const totalApplications = internships.length + placements.length;
  const pendingInterviews =
    placements.filter((p) => ['shortlisted', 'interview_scheduled'].includes(p.status)).length +
    internships.filter((i) => i.status === 'selected').length;
  const offersReceived = placements.filter((p) =>
    ['offer_received', 'accepted', 'placed'].includes(p.status),
  ).length;
  return { totalApplications, pendingInterviews, offersReceived };
}

export default function Dashboard() {
  const { user, refreshSession } = useAuth();
  const location = useLocation();
  const { dark } = useTheme();
  const doughnutOptions = useMemo(() => buildDoughnutOptions(dark), [dark]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/dashboard');
        if (!cancelled) {
          setData(res);
          setError('');
          const vr = res.viewer_role;
          const ur = String(user?.role ?? '').toLowerCase();
          if (vr && ur && vr !== ur) {
            try {
              await refreshSession();
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load dashboard'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!data) {
    return null;
  }

  if (data.type === 'student' && data.student) {
    const s = data.student;
    const internships = s.internships || [];
    const placements = s.placements || [];
    const glance = computeStudentGlanceStats(internships, placements);
    const cgpaDisplay = s.cgpa != null ? String(s.cgpa) : '—';

    return (
      <div>
        <header className="page-header d-flex justify-content-between align-items-center w-100">
          <div>
            <h1>My dashboard</h1>
            <p className="subtitle">Signed in as {user?.username}</p>
          </div>
          <div className="flex-shrink-0 d-none d-md-block">
            <NotificationBell />
          </div>
        </header>

        <div className="detail-header student-dashboard-hero">
          <div className="student-dashboard-hero__main">
            <h2>{s.name}</h2>
            <p className="meta mb-0">
              {fmt(s.roll_number)} · {fmt(s.department)}
              {s.course ? ` · ${s.course}` : ''}
            </p>
          </div>
          <div className="student-dashboard-hero__chips" role="list">
            <span className="student-dashboard-hero__chip" role="listitem">
              <i className="bi bi-envelope" aria-hidden />
              <span className="text-truncate" title={s.email || ''}>{fmt(s.email)}</span>
            </span>
            <span className="student-dashboard-hero__chip" role="listitem">
              <i className="bi bi-telephone" aria-hidden />
              {fmt(s.phone)}
            </span>
            <span className="student-dashboard-hero__chip" role="listitem">
              <i className="bi bi-mortarboard" aria-hidden />
              Year {s.year != null ? String(s.year) : '—'}
            </span>
            <span className="student-dashboard-hero__chip" role="listitem">
              <i className="bi bi-graph-up-arrow" aria-hidden />
              CGPA {cgpaDisplay}
            </span>
          </div>
          {s.skills ? (
            <div className="student-dashboard-hero__skills mb-0">
              <span className="student-dashboard-hero__skills-label">Skills</span>
              <div className="student-skill-pills">
                {parseSkillTags(s.skills).map((tag) => (
                  <span key={tag} className="student-skill-pill">{tag}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="row g-3 mb-4 student-glance-stats">
          <div className="col-6 col-md-3">
            <div className="student-glance-card">
              <div className="student-glance-icon"><i className="bi bi-layers" aria-hidden /></div>
              <div className="student-glance-value">{glance.totalApplications}</div>
              <div className="student-glance-label">Total applications</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="student-glance-card">
              <div className="student-glance-icon"><i className="bi bi-calendar-event" aria-hidden /></div>
              <div className="student-glance-value">{glance.pendingInterviews}</div>
              <div className="student-glance-label">Pending interviews</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="student-glance-card">
              <div className="student-glance-icon"><i className="bi bi-award" aria-hidden /></div>
              <div className="student-glance-value">{glance.offersReceived}</div>
              <div className="student-glance-label">Offers received</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="student-glance-card student-glance-card--cgpa">
              <CgpaRing cgpa={s.cgpa} size={78} stroke={5} showCaption={false} />
              <div className="student-glance-label mt-1">Current CGPA</div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <Link to="/appeals/new" className="btn btn-primary btn-sm">New request to company</Link>
          <Link to="/appeals" className="btn btn-outline-secondary btn-sm">My requests</Link>
          <Link to="/reports/me" className="btn btn-outline-secondary btn-sm">My report</Link>
          <Link to={user?.student_id != null ? `/students/${user.student_id}` : '/my-profile'} className="btn btn-outline-secondary btn-sm">
            My profile
          </Link>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="table-container">
              <div className="card-header border-bottom">Internships</div>
              {internships.length === 0 ? (
                <div className="student-dash-table-empty">
                  <InternshipsEmptyIllustration />
                  <h4 className="student-dash-table-empty__title">No internships yet</h4>
                  <p className="student-dash-table-empty__text">
                    Explore companies or send a request to get your first internship on the record.
                  </p>
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    <Link to="/companies" className="btn btn-primary btn-sm">
                      <i className="bi bi-building me-1" aria-hidden />
                      Explore companies
                    </Link>
                    <Link to="/appeals/new" className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-plus-lg me-1" aria-hidden />
                      Log new request
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Title</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internships.map((i) => (
                        <tr key={i.id}>
                          <td>{fmt(i.company_name)}</td>
                          <td>{fmt(i.title)}</td>
                          <td><StatusBadge status={i.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="table-container">
              <div className="card-header border-bottom">Placements</div>
              {placements.length === 0 ? (
                <div className="student-dash-table-empty">
                  <PlacementsEmptyIllustration />
                  <h4 className="student-dash-table-empty__title">No placements yet</h4>
                  <p className="student-dash-table-empty__text">
                    Track offers and roles here once you start the placement process with a company.
                  </p>
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    <Link to="/companies" className="btn btn-primary btn-sm">
                      <i className="bi bi-building me-1" aria-hidden />
                      Explore companies
                    </Link>
                    <Link to="/appeals/new" className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-plus-lg me-1" aria-hidden />
                      New placement request
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Package (LPA)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placements.map((p) => (
                        <tr key={p.id}>
                          <td>{fmt(p.company_name)}</td>
                          <td>{fmt(p.role)}</td>
                          <td>{p.package_lpa != null ? p.package_lpa : '—'}</td>
                          <td><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.type === 'admin') {
    return <AdminDashboard data={data} doughnutOptions={doughnutOptions} />;
  }

  return <div className="alert alert-warning">Unknown dashboard type.</div>;
}

function AdminDashboard({ data, doughnutOptions }) {
  const [recentTab, setRecentTab] = useState('placements');

  const deptStats = [...(data.dept_stats || [])].sort((a, b) => (b[1] || 0) - (a[1] || 0));
  const deptMax = deptStats.reduce((m, [, c]) => Math.max(m, Number(c) || 0), 0) || 1;

  const placementCounts = data.placement_status_counts || {};
  const placementStatusOrder = useMemo(() => {
    if (Array.isArray(data.placement_status_order) && data.placement_status_order.length > 0) {
      return data.placement_status_order;
    }
    return Object.keys(PLACEMENT_STATUS_COLORS);
  }, [data.placement_status_order]);

  const placementTotal = placementStatusOrder.reduce(
    (s, k) => s + (Number(placementCounts[k]) || 0),
    0,
  );
  const placedN = Number(placementCounts.placed) || 0;
  const placedPct = placementTotal > 0 ? Math.round((placedN / placementTotal) * 100) : 0;

  const doughnutData = useMemo(() => {
    if (placementTotal <= 0) {
      return {
        labels: ['—'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['rgba(148, 163, 184, 0.35)'],
            borderWidth: 0,
            hoverOffset: 0,
          },
        ],
      };
    }
    return {
      labels: placementStatusOrder,
      datasets: [
        {
          data: placementStatusOrder.map((k) => Number(placementCounts[k]) || 0),
          backgroundColor: placementStatusOrder.map((k) => placementStatusColor(k)),
          borderWidth: 0,
        },
      ],
    };
  }, [data.placement_status_counts, placementStatusOrder, placementTotal]);

  const recentPlacements = data.recent_placements || [];
  const recentInternships = data.recent_internships || [];

  return (
      <div className="admin-dashboard-page">
        <header className="page-header d-flex justify-content-between align-items-center w-100">
          <div>
            <h1>Admin dashboard</h1>
            <p className="subtitle">Overview and recent activity</p>
          </div>
          <div className="flex-shrink-0 d-none d-md-block">
            <NotificationBell />
          </div>
        </header>

        {(data.pending_appeals ?? 0) > 0 && (
          <div className="alert alert-warning border-0 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 admin-dashboard-alert">
            <span>
              <strong>{data.pending_appeals}</strong> student appeal{data.pending_appeals === 1 ? '' : 's'} awaiting review.
            </span>
            <Link to="/appeals?status=pending" className="btn btn-sm btn-dark">Review appeals</Link>
          </div>
        )}

        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/students" className="stat-card-link d-block h-100" title="View all students">
              <div className="stat-card primary h-100">
                <div className="stat-icon mb-2"><i className="bi bi-people" aria-hidden /></div>
                <div className="stat-value">{data.total_students ?? 0}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </Link>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/companies" className="stat-card-link d-block h-100" title="View all companies">
              <div className="stat-card info h-100">
                <div className="stat-icon mb-2"><i className="bi bi-building" aria-hidden /></div>
                <div className="stat-value">{data.total_companies ?? 0}</div>
                <div className="stat-label">Total Companies</div>
              </div>
            </Link>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/internships?status=ongoing" className="stat-card-link d-block h-100" title="Internships with status ongoing">
              <div className="stat-card warning h-100">
                <div className="stat-icon mb-2"><i className="bi bi-briefcase" aria-hidden /></div>
                <div className="stat-value">{data.active_internships ?? 0}</div>
                <div className="stat-label">Active Internships</div>
              </div>
            </Link>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/internships?status=completed" className="stat-card-link d-block h-100" title="Internships with status completed">
              <div className="stat-card success h-100">
                <div className="stat-icon mb-2"><i className="bi bi-check2-circle" aria-hidden /></div>
                <div className="stat-value">{data.completed_internships ?? 0}</div>
                <div className="stat-label">Completed Internships</div>
              </div>
            </Link>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/placements?status=placed" className="stat-card-link d-block h-100" title="Placements with status placed">
              <div className="stat-card success h-100">
                <div className="stat-icon mb-2"><i className="bi bi-person-check" aria-hidden /></div>
                <div className="stat-value">{data.placed_students ?? 0}</div>
                <div className="stat-label">Students Placed</div>
              </div>
            </Link>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <Link to="/placements?status=placed" className="stat-card-link d-block h-100" title="Placed offers — average package (LPA)">
              <div className="stat-card danger h-100">
                <div className="stat-icon mb-2"><i className="bi bi-currency-rupee" aria-hidden /></div>
                <div className="stat-value">{Number(data.avg_package ?? 0).toFixed(2)}</div>
                <div className="stat-label">Avg Package (LPA)</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card mb-4 border-0 shadow-sm" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <div className="text-muted small text-uppercase fw-semibold">Highest package</div>
              <div className="fs-3 fw-bold text-primary">{data.highest_package ?? 0} LPA</div>
            </div>
            <i className="bi bi-trophy-fill text-warning fs-1 opacity-75" aria-hidden />
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm admin-dash-widget">
              <div className="card-body">
                <h2 className="admin-dash-widget-title h5 mb-4">Students by Department</h2>
                {deptStats.length === 0 ? (
                  <p className="text-muted small mb-0">No students yet.</p>
                ) : (
                  <ul className="list-unstyled mb-0 admin-dept-list">
                    {deptStats.map(([name, count]) => {
                      const n = Number(count) || 0;
                      const pct = Math.round((n / deptMax) * 100);
                      return (
                        <li key={name || '—'} className="admin-dept-item">
                          <div className="admin-dept-row">
                            <span className="admin-dept-name text-truncate" title={name || ''}>
                              {name || '—'}
                            </span>
                            <span className="admin-dept-count">{n}</span>
                          </div>
                          <div className="admin-dept-bar-track">
                            <div
                              className="admin-dept-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm admin-dash-widget">
              <div className="card-body">
                <h2 className="admin-dash-widget-title h5 mb-3">Placement Status</h2>
                <div className="placement-status-layout">
                  <div className="placement-status-chart-wrap">
                    <div className="placement-status-doughnut">
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                      <div className="placement-status-center-pct">{placedPct}%</div>
                    </div>
                  </div>
                  <ul className="placement-status-legend list-unstyled mb-0">
                    {placementStatusOrder.map((key) => (
                      <li key={key} className="placement-status-legend-item">
                        <span
                          className="placement-status-dot"
                          style={{ backgroundColor: placementStatusColor(key) }}
                          aria-hidden
                        />
                        <span className="placement-status-label">{key.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-recent-section mb-4">
          <div className="admin-recent-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={recentTab === 'placements'}
              className={`admin-recent-tab${recentTab === 'placements' ? ' active' : ''}`}
              onClick={() => setRecentTab('placements')}
            >
              Recent Placements
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={recentTab === 'internships'}
              className={`admin-recent-tab${recentTab === 'internships' ? ' active' : ''}`}
              onClick={() => setRecentTab('internships')}
            >
              Recent Internships
            </button>
          </div>

          <div
            className="card border-0 shadow-sm admin-recent-card"
            role="tabpanel"
            aria-label={recentTab === 'placements' ? 'Recent placements' : 'Recent internships'}
          >
            {recentTab === 'placements' && recentPlacements.length === 0 && (
              <div className="admin-empty-state">
                <div className="admin-empty-icon" aria-hidden>
                  <i className="bi bi-search" />
                  <span className="admin-empty-icon-badge"><i className="bi bi-x-lg" /></span>
                </div>
                <h3 className="admin-empty-title">No Data Available</h3>
                <p className="admin-empty-text">
                  There are no recent records found for this placement cycle yet.
                </p>
              </div>
            )}
            {recentTab === 'placements' && recentPlacements.length > 0 && (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Package</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPlacements.map((p) => (
                      <tr key={p.id}>
                        <td>{fmt(p.student_name)}</td>
                        <td>{fmt(p.company_name)}</td>
                        <td>{fmt(p.role)}</td>
                        <td>{p.package_lpa != null ? `${p.package_lpa} LPA` : '—'}</td>
                        <td><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {recentTab === 'internships' && recentInternships.length === 0 && (
              <div className="admin-empty-state">
                <div className="admin-empty-icon" aria-hidden>
                  <i className="bi bi-search" />
                  <span className="admin-empty-icon-badge"><i className="bi bi-x-lg" /></span>
                </div>
                <h3 className="admin-empty-title">No Data Available</h3>
                <p className="admin-empty-text">
                  There are no recent internship records found for this cycle yet.
                </p>
              </div>
            )}
            {recentTab === 'internships' && recentInternships.length > 0 && (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Company</th>
                      <th>Title</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInternships.map((i) => (
                      <tr key={i.id}>
                        <td>{fmt(i.student_name)}</td>
                        <td>{fmt(i.company_name)}</td>
                        <td>{fmt(i.title)}</td>
                        <td><StatusBadge status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
