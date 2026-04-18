import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import VacancyApplyModal from '../components/VacancyApplyModal';
import {
  fmt,
  fmtDate,
  vacancyRoleLabel,
  vacancyCompensation,
  vacancyDeadlinePassed,
} from '../utils/vacancyFormat';

function websiteHref(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

const VACANCY_FORM_EMPTY = {
  job_title: '',
  role_type: 'internship',
  department: '',
  compensation_value: '',
  compensation_kind: 'monthly_inr',
  application_deadline: '',
};

export default function CompanyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const role = String(user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStudentViewer = role === 'student' && !isAdmin;
  /** Linked student profile — can use appeals and submit vacancy applications */
  const isStudent = isStudentViewer && user?.student_id != null;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vacancies, setVacancies] = useState([]);
  const [vacanciesLoading, setVacanciesLoading] = useState(false);
  const [vacancyModalOpen, setVacancyModalOpen] = useState(false);
  const [vacancySaving, setVacancySaving] = useState(false);
  const [editingVacancyId, setEditingVacancyId] = useState(null);
  const [vacancyForm, setVacancyForm] = useState(VACANCY_FORM_EMPTY);
  const [applyTarget, setApplyTarget] = useState(null);
  const [applyToast, setApplyToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const c = await api.get(`/companies/${id}`);
        if (!cancelled) {
          setCompany(c);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load company'));
          setCompany(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || authLoading || (!isAdmin && !isStudentViewer)) return;
    let cancelled = false;
    (async () => {
      setVacanciesLoading(true);
      try {
        const data = await api.get(`/companies/${id}/vacancies`);
        if (!cancelled) setVacancies(data.items || []);
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load vacancies'));
      } finally {
        if (!cancelled) setVacanciesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, isAdmin, isStudentViewer]);

  const openNewVacancyModal = () => {
    setEditingVacancyId(null);
    setVacancyForm({
      ...VACANCY_FORM_EMPTY,
      role_type: 'internship',
      compensation_kind: 'monthly_inr',
    });
    setVacancyModalOpen(true);
  };

  const openEditVacancyModal = (v) => {
    setEditingVacancyId(v.id);
    setVacancyForm({
      job_title: v.job_title || '',
      role_type: v.role_type || 'internship',
      department: v.department || '',
      compensation_value:
        v.compensation_value != null && v.compensation_value !== '' ? String(v.compensation_value) : '',
      compensation_kind: v.compensation_kind || 'lpa',
      application_deadline: v.application_deadline ? String(v.application_deadline).slice(0, 10) : '',
    });
    setVacancyModalOpen(true);
  };

  const closeVacancyModal = () => {
    setVacancyModalOpen(false);
    setEditingVacancyId(null);
    setVacancyForm(VACANCY_FORM_EMPTY);
  };

  const handleVacancyFormRoleChange = (nextRole) => {
    setVacancyForm((prev) => ({
      ...prev,
      role_type: nextRole,
      compensation_kind: nextRole === 'internship' ? 'monthly_inr' : 'lpa',
    }));
  };

  const submitVacancy = async (e) => {
    e.preventDefault();
    setVacancySaving(true);
    try {
      let compensationValue = null;
      if (vacancyForm.compensation_value !== '' && vacancyForm.compensation_value != null) {
        const n = Number(vacancyForm.compensation_value);
        if (Number.isNaN(n)) {
          setError('Amount must be a valid number');
          setVacancySaving(false);
          return;
        }
        compensationValue = n;
      }
      const body = {
        job_title: vacancyForm.job_title.trim(),
        role_type: vacancyForm.role_type,
        department: vacancyForm.department.trim(),
        compensation_kind: vacancyForm.compensation_kind,
        compensation_value: compensationValue,
        application_deadline: vacancyForm.application_deadline || null,
      };
      if (editingVacancyId) {
        await api.put(`/vacancies/${editingVacancyId}`, body);
      } else {
        await api.post(`/companies/${id}/vacancies`, body);
      }
      const data = await api.get(`/companies/${id}/vacancies`);
      setVacancies(data.items || []);
      closeVacancyModal();
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save vacancy'));
    } finally {
      setVacancySaving(false);
    }
  };

  const handleDeleteVacancy = async (v) => {
    if (!window.confirm(`Delete vacancy “${v.job_title}”?`)) return;
    try {
      await api.del(`/vacancies/${v.id}`);
      const data = await api.get(`/companies/${id}/vacancies`);
      setVacancies(data.items || []);
      setError('');
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  };

  useEffect(() => {
    if (!applyToast) return undefined;
    const t = setTimeout(() => setApplyToast(''), 4500);
    return () => clearTimeout(t);
  }, [applyToast]);

  const onVacancyApplicationSubmitted = (v, created) => {
    setVacancies((prev) =>
      prev.map((row) =>
        row.id === v.id
          ? {
              ...row,
              my_application: {
                id: created.id,
                status: created.status,
                status_label: created.status_label,
              },
            }
          : row,
      ),
    );
    setError('');
    setApplyToast('Application submitted successfully.');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this company? This cannot be undone.')) return;
    try {
      await api.del(`/companies/${id}`);
      navigate('/companies');
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

  if (error && !company) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!company) return null;

  const internships = company.internships || [];
  const placements = company.placements || [];
  const site = websiteHref(company.website);

  return (
    <div>
      {applyToast && (
        <div
          className="toast-container position-fixed top-0 end-0 p-3"
          style={{ zIndex: 1085 }}
          aria-live="polite"
        >
          <div className="toast show text-bg-success border-0 shadow" role="status">
            <div className="d-flex align-items-center">
              <div className="toast-body py-2">{applyToast}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Dismiss"
                onClick={() => setApplyToast('')}
              />
            </div>
          </div>
        </div>
      )}

      <VacancyApplyModal
        vacancy={applyTarget}
        open={Boolean(applyTarget)}
        onClose={() => setApplyTarget(null)}
        onApplied={(created) => applyTarget && onVacancyApplicationSubmitted(applyTarget, created)}
      />

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2>{company.name}</h2>
          <p className="meta mb-0">{fmt(company.industry)}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {isStudent && (
            <>
              <Link
                to={`/appeals/new?company_id=${id}&type=internship`}
                className="btn btn-outline-primary btn-sm"
              >
                Request internship
              </Link>
              <Link
                to={`/appeals/new?company_id=${id}&type=placement`}
                className="btn btn-outline-primary btn-sm"
              >
                Request placement
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to={`/companies/${id}/edit`} className="btn btn-primary btn-sm">
                Edit
              </Link>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="info-grid mb-4">
        <div className="info-item">
          <div className="label">Industry</div>
          <div className="value">{fmt(company.industry)}</div>
        </div>
        <div className="info-item">
          <div className="label">Website</div>
          <div className="value">
            {site ? (
              <a href={site} target="_blank" rel="noopener noreferrer">
                {company.website}
              </a>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="info-item">
          <div className="label">Contact person</div>
          <div className="value">{fmt(company.contact_person)}</div>
        </div>
        <div className="info-item">
          <div className="label">Contact email</div>
          <div className="value">{fmt(company.contact_email)}</div>
        </div>
        <div className="info-item">
          <div className="label">Contact phone</div>
          <div className="value">{fmt(company.contact_phone)}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Address</div>
          <div className="value">{fmt(company.address)}</div>
        </div>
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Description</div>
          <div className="value">{fmt(company.description)}</div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-container">
            <div className="card-header border-bottom">Internships at this company</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {internships.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4">
                        No internships
                      </td>
                    </tr>
                  ) : (
                    internships.map((i) => (
                      <tr key={i.id}>
                        <td>{fmt(i.title)}</td>
                        <td>{fmt(i.student_name)}</td>
                        <td>{fmtDate(i.start_date)}</td>
                        <td>{fmtDate(i.end_date)}</td>
                        <td>
                          <StatusBadge status={i.status} />
                        </td>
                        <td>
                          <Link to={`/internships/${i.id}`}>View</Link>
                        </td>
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
            <div className="card-header border-bottom">Placements at this company</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Student</th>
                    <th>Package (LPA)</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {placements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted text-center py-4">
                        No placements
                      </td>
                    </tr>
                  ) : (
                    placements.map((p) => (
                      <tr key={p.id}>
                        <td>{fmt(p.role)}</td>
                        <td>{fmt(p.student_name)}</td>
                        <td>{p.package_lpa != null ? `${p.package_lpa} LPA` : '—'}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td>
                          <Link to={`/placements/${p.id}`}>View</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {(isAdmin || isStudentViewer) && (
        <div className="mt-4">
          <div className="table-container">
            <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>Vacancies</span>
              {isAdmin && (
                <button type="button" className="btn btn-primary btn-sm" onClick={openNewVacancyModal}>
                  Add new vacancy
                </button>
              )}
              {isStudentViewer && (
                <Link to="/vacancies" className="btn btn-outline-secondary btn-sm">
                  All open roles
                </Link>
              )}
            </div>
            <div className="table-responsive">
              {vacanciesLoading ? (
                <div className="text-center text-muted py-4">Loading vacancies…</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Role type</th>
                      <th>Department</th>
                      <th>Package / stipend</th>
                      <th>Application deadline</th>
                      <th className="text-end">{isAdmin ? 'Actions' : 'Apply'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacancies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted text-center py-4">
                          {isStudentViewer ? 'No vacancies recorded for this company' : 'No vacancies recorded'}
                        </td>
                      </tr>
                    ) : (
                      vacancies.map((v) => (
                        <tr key={v.id}>
                          <td>{fmt(v.job_title)}</td>
                          <td>{vacancyRoleLabel(v.role_type)}</td>
                          <td>{fmt(v.department)}</td>
                          <td>{vacancyCompensation(v)}</td>
                          <td>{fmtDate(v.application_deadline)}</td>
                          <td className="text-end text-nowrap">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0 me-3"
                                  onClick={() => openEditVacancyModal(v)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm text-danger p-0"
                                  onClick={() => handleDeleteVacancy(v)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            {isStudentViewer &&
                              (isStudent ? (
                                v.my_application ? (
                                  <button type="button" className="btn btn-secondary btn-sm" disabled>
                                    Applied
                                  </button>
                                ) : vacancyDeadlinePassed(v) ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled
                                    title="Deadline has passed"
                                  >
                                    Closed
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() =>
                                      setApplyTarget({
                                        ...v,
                                        company_id: company.id,
                                        company_name: company.name,
                                      })
                                    }
                                  >
                                    Apply now
                                  </button>
                                )
                              ) : (
                                <span className="text-muted small">Link profile to apply</span>
                              ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && vacancyModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={submitVacancy}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingVacancyId ? 'Edit vacancy' : 'New vacancy'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeVacancyModal}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="vacancy-job-title">
                      Job title
                    </label>
                    <input
                      id="vacancy-job-title"
                      className="form-control"
                      value={vacancyForm.job_title}
                      onChange={(e) => setVacancyForm((p) => ({ ...p, job_title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="vacancy-role-type">
                      Role type
                    </label>
                    <select
                      id="vacancy-role-type"
                      className="form-select"
                      value={vacancyForm.role_type}
                      onChange={(e) => handleVacancyFormRoleChange(e.target.value)}
                    >
                      <option value="internship">Internship</option>
                      <option value="full_time">Full-time</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="vacancy-department">
                      Field / department
                    </label>
                    <input
                      id="vacancy-department"
                      className="form-control"
                      value={vacancyForm.department}
                      onChange={(e) => setVacancyForm((p) => ({ ...p, department: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="vacancy-comp-kind">
                        Compensation type
                      </label>
                      <select
                        id="vacancy-comp-kind"
                        className="form-select"
                        value={vacancyForm.compensation_kind}
                        onChange={(e) =>
                          setVacancyForm((p) => ({ ...p, compensation_kind: e.target.value }))
                        }
                      >
                        <option value="lpa">Package (LPA)</option>
                        <option value="monthly_inr">Stipend (₹ / month)</option>
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="vacancy-comp-value">
                        Amount
                      </label>
                      <input
                        id="vacancy-comp-value"
                        type="number"
                        step="any"
                        min="0"
                        className="form-control"
                        value={vacancyForm.compensation_value}
                        onChange={(e) =>
                          setVacancyForm((p) => ({ ...p, compensation_value: e.target.value }))
                        }
                        placeholder={vacancyForm.compensation_kind === 'lpa' ? 'e.g. 9.5' : 'e.g. 25000'}
                      />
                    </div>
                  </div>
                  <div className="mb-0">
                    <label className="form-label" htmlFor="vacancy-deadline">
                      Application deadline
                    </label>
                    <input
                      id="vacancy-deadline"
                      type="date"
                      className="form-control"
                      value={vacancyForm.application_deadline}
                      onChange={(e) =>
                        setVacancyForm((p) => ({ ...p, application_deadline: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeVacancyModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={vacancySaving}>
                    {vacancySaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
