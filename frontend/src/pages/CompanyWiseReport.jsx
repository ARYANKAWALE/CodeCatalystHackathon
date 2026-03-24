import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function CompanyWiseReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/reports/company-wise');
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load report');
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
          <h1>Company-wise Report</h1>
          <p className="subtitle mb-0">Internships and placements by company</p>
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
                <th>Company Name</th>
                <th>Industry</th>
                <th>Total Internships</th>
                <th>Total Placements</th>
                <th>Students Placed</th>
                <th>Avg Package</th>
                <th>Max Package</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.company_name}-${idx}`}>
                  <td>{r.company_name}</td>
                  <td>{r.industry || '—'}</td>
                  <td>{r.internships}</td>
                  <td>{r.placements}</td>
                  <td>{r.placed}</td>
                  <td>{Number(r.avg_package).toFixed(2)}</td>
                  <td>{Number(r.max_package).toFixed(2)}</td>
                </tr>
              ))}
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
