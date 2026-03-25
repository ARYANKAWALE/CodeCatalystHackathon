import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from '../components/StatusBadge';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function buildChartOptions(dark) {
  const tickColor = dark ? '#e2e8f0' : '#64748b';
  const gridColor = dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.06)';
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: tickColor },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: tickColor },
        grid: { color: gridColor },
      },
    },
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: dark ? '#8c9bb0' : '#334155',
          padding: 14,
          usePointStyle: true,
        },
      },
      tooltip: {
        titleColor: dark ? '#ffffff' : '#0f172a',
        bodyColor: dark ? '#e2e8f0' : '#334155',
        backgroundColor: dark ? 'rgba(30, 41, 59, 0.96)' : '#ffffff',
        borderColor: dark ? '#475569' : '#e2e8f0',
        borderWidth: 1,
      },
    },
  };
  return { barOptions, doughnutOptions };
}

const doughnutColors = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
];

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { dark } = useTheme();
  const { barOptions, doughnutOptions } = useMemo(() => buildChartOptions(dark), [dark]);
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
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load dashboard');
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

    return (
      <div>
        <div className="page-header">
          <div>
            <h1>My dashboard</h1>
            <p className="subtitle">Signed in as {user?.username}</p>
          </div>
        </div>

        <div className="detail-header">
          <h2>{s.name}</h2>
          <p className="meta mb-0">
            {s.roll_number} · {s.department}
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <Link to="/appeals/new" className="btn btn-primary btn-sm">New request to company</Link>
          <Link to="/appeals" className="btn btn-outline-secondary btn-sm">My requests</Link>
          <Link to="/reports/me" className="btn btn-outline-secondary btn-sm">My report</Link>
        </div>

        <div className="info-grid mb-4">
          <div className="info-item">
            <div className="label">Email</div>
            <div className="value">{fmt(s.email)}</div>
          </div>
          <div className="info-item">
            <div className="label">Phone</div>
            <div className="value">{fmt(s.phone)}</div>
          </div>
          <div className="info-item">
            <div className="label">CGPA</div>
            <div className="value">{s.cgpa != null ? String(s.cgpa) : '—'}</div>
          </div>
          <div className="info-item">
            <div className="label">Year</div>
            <div className="value">{s.year != null ? String(s.year) : '—'}</div>
          </div>
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <div className="label">Skills</div>
            <div className="value">{fmt(s.skills)}</div>
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
                      <th>Company</th>
                      <th>Title</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internships.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted text-center py-4">No internships yet</td>
                      </tr>
                    ) : (
                      internships.map((i) => (
                        <tr key={i.id}>
                          <td>{fmt(i.company_name)}</td>
                          <td>{fmt(i.title)}</td>
                          <td><StatusBadge status={i.status} /></td>
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
                      <th>Company</th>
                      <th>Role</th>
                      <th>Package (LPA)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-4">No placements yet</td>
                      </tr>
                    ) : (
                      placements.map((p) => (
                        <tr key={p.id}>
                          <td>{fmt(p.company_name)}</td>
                          <td>{fmt(p.role)}</td>
                          <td>{p.package_lpa != null ? p.package_lpa : '—'}</td>
                          <td><StatusBadge status={p.status} /></td>
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

  if (data.type === 'admin') {
    const deptStats = data.dept_stats || [];
    const placementCounts = data.placement_status_counts || {};
    const labels = Object.keys(placementCounts);
    const values = labels.map((k) => placementCounts[k]);

    const barData = {
      labels: deptStats.map(([d]) => d || '—'),
      datasets: [
        {
          label: 'Students',
          data: deptStats.map(([, c]) => c),
          backgroundColor: 'rgba(79, 70, 229, 0.65)',
          borderColor: '#4f46e5',
          borderWidth: 1,
        },
      ],
    };

    const doughnutData = {
      labels: labels.map((k) => k.replace(/_/g, ' ')),
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => doughnutColors[i % doughnutColors.length]),
          borderWidth: 1,
          borderColor: '#fff',
        },
      ],
    };

    const recentPlacements = data.recent_placements || [];
    const recentInternships = data.recent_internships || [];

    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Admin dashboard</h1>
            <p className="subtitle">Overview and recent activity</p>
          </div>
        </div>

        {(data.pending_appeals ?? 0) > 0 && (
          <div className="alert alert-warning border-0 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
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
            <div className="card">
              <div className="card-header">Students by department</div>
              <div className="card-body chart-container">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">Placement status</div>
              <div className="card-body chart-container">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="table-container">
              <div className="card-header border-bottom">Recent placements</div>
              <div className="table-responsive">
                <table className="table">
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
                    {recentPlacements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-4">No placements</td>
                      </tr>
                    ) : (
                      recentPlacements.map((p) => (
                        <tr key={p.id}>
                          <td>{fmt(p.student_name)}</td>
                          <td>{fmt(p.company_name)}</td>
                          <td>{fmt(p.role)}</td>
                          <td>{p.package_lpa != null ? `${p.package_lpa} LPA` : '—'}</td>
                          <td><StatusBadge status={p.status} /></td>
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
              <div className="card-header border-bottom">Recent internships</div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Company</th>
                      <th>Title</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInternships.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-4">No internships</td>
                      </tr>
                    ) : (
                      recentInternships.map((i) => (
                        <tr key={i.id}>
                          <td>{fmt(i.student_name)}</td>
                          <td>{fmt(i.company_name)}</td>
                          <td>{fmt(i.title)}</td>
                          <td><StatusBadge status={i.status} /></td>
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

  return <div className="alert alert-warning">Unknown dashboard type.</div>;
}
