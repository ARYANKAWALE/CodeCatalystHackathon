import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

export default function PlacementSummary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/reports/placement-summary');
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load report'));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const placed = Number(r.placed) || 0;
        const avg = Number(r.avg_package) || 0;
        return {
          total_students: acc.total_students + (Number(r.total_students) || 0),
          placed: acc.placed + placed,
          unplaced: acc.unplaced + (Number(r.unplaced) || 0),
          weighted_pkg: acc.weighted_pkg + avg * placed,
          max_package: Math.max(acc.max_package, Number(r.max_package) || 0),
        };
      },
      { total_students: 0, placed: 0, unplaced: 0, weighted_pkg: 0, max_package: 0 },
    );
  }, [rows]);

  const totalPct =
    totals.total_students > 0
      ? Math.round((totals.placed / totals.total_students) * 1000) / 10
      : 0;
  const totalAvgPkg =
    totals.placed > 0 ? Math.round((totals.weighted_pkg / totals.placed) * 100) / 100 : 0;

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
          <h1>Placement Summary Report</h1>
          <p className="subtitle mb-0">Placements by department</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/reports" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" aria-hidden />
            Back
          </Link>
          <button type="button" className="btn btn-outline-primary" onClick={() => window.print()}>
            <i className="bi bi-printer me-1" aria-hidden />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="table-container">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Students</th>
                <th>Placed</th>
                <th>Unplaced</th>
                <th>Placement %</th>
                <th>Avg Package (LPA)</th>
                <th>Max Package (LPA)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.department}>
                  <td>{r.department}</td>
                  <td>{r.total_students}</td>
                  <td>{r.placed}</td>
                  <td>{r.unplaced}</td>
                  <td>{r.percentage != null ? `${r.percentage}%` : '—'}</td>
                  <td>{Number(r.avg_package).toFixed(2)}</td>
                  <td>{Number(r.max_package).toFixed(2)}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="fw-semibold table-light">
                  <td>Total</td>
                  <td>{totals.total_students}</td>
                  <td>{totals.placed}</td>
                  <td>{totals.unplaced}</td>
                  <td>{totalPct}%</td>
                  <td>{totalAvgPkg.toFixed(2)}</td>
                  <td>{totals.max_package.toFixed(2)}</td>
                </tr>
              )}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="text-muted text-center py-4">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
