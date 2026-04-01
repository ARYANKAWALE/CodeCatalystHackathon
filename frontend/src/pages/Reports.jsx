import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

const EXPORT_TYPES = [
  { type: 'students', label: 'Students' },
  { type: 'companies', label: 'Companies' },
  { type: 'internships', label: 'Internships' },
  { type: 'placements', label: 'Placements' },
  { type: 'placement-summary', label: 'Placement summary' },
];

function parseFilename(contentDisposition) {
  if (!contentDisposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim());
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(contentDisposition);
  if (plain?.[1]) return plain[1].trim().replace(/^"|"$/g, '');
  return null;
}

export default function Reports() {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = await api.getBlob(`/reports/export/${type}`);
      const blob = await res.blob();
      const name =
        parseFilename(res.headers.get('content-disposition')) || `${type}_export.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(getErrorMessage(e, 'Download failed'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <div className="page-header mb-4">
        <h1>Reports</h1>
        <p className="subtitle mb-0">Analytics and data exports</p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <Link to="/reports/analytics" className="report-card h-100">
            <div
              className="report-icon"
              style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}
            >
              <i className="bi bi-pie-chart-fill" aria-hidden />
            </div>
            <div className="fw-semibold">Analytical Reports</div>
            <div className="small text-muted mt-1">KPIs, departments, top companies</div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-3">
          <Link to="/reports/placement-summary" className="report-card h-100">
            <div
              className="report-icon"
              style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}
            >
              <i className="bi bi-bar-chart-fill" aria-hidden />
            </div>
            <div className="fw-semibold">Placement Summary</div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-3">
          <Link to="/reports/internship-summary" className="report-card h-100">
            <div
              className="report-icon"
              style={{ background: '#fffbeb', color: 'var(--warning)' }}
            >
              <i className="bi bi-briefcase-fill" aria-hidden />
            </div>
            <div className="fw-semibold">Internship Summary</div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-3">
          <Link to="/reports/company-wise" className="report-card h-100">
            <div
              className="report-icon"
              style={{ background: '#eff6ff', color: 'var(--info)' }}
            >
              <i className="bi bi-building" aria-hidden />
            </div>
            <div className="fw-semibold">Company-wise Report</div>
          </Link>
        </div>
      </div>

      <h2 className="h5 fw-semibold mb-3">Export Data</h2>
      <div className="d-flex flex-wrap gap-2">
        {EXPORT_TYPES.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
            disabled={exporting !== null}
            onClick={() => handleExport(type)}
          >
            {exporting === type ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
            ) : (
              <i className="bi bi-download" aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
