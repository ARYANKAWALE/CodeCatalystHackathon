import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import CgpaRing from '../components/CgpaRing';
import IdentityResumeField from '../components/IdentityResumeField';
import ProfileTableEmpty from '../components/ProfileTableEmpty';
import { parseSkillTags } from '../utils/skillsParse';

function fmt(value) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function fmtDateRange(start, end) {
  const from = start || '-';
  const to = end || '-';
  if (from === '-' && to === '-') return '-';
  return `${from} -> ${to}`;
}

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOwnProfile =
    String(user?.role ?? '').toLowerCase() === 'student' &&
    user?.student_id != null &&
    String(user.student_id) === String(id);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [viewImage, setViewImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await api.get(`/students/${id}`);
        if (!cancelled) {
          setStudent(response);
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load student'));
          setStudent(null);
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
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    try {
      await api.del(`/students/${id}`);
      navigate('/students');
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5 MB)');
      return;
    }
    setAvatarUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await api.postForm(`/students/${id}/image`, fd);
      setStudent(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload profile image'));
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const skillTags = useMemo(() => parseSkillTags(student?.skills), [student?.skills]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!student) return null;

  const internships = student.internships || [];
  const placements = student.placements || [];
  const showTableActions = isOwnProfile || isAdmin;
  const internAddHref = isAdmin ? `/internships/add?student_id=${id}` : '/appeals/new';
  const placementAddHref = isAdmin ? `/placements/add?student_id=${id}` : '/appeals/new';

  return (
    <div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {isOwnProfile ? (
        <div className="page-header mb-3">
          <div>
            <h1>My profile</h1>
            <p className="subtitle">Your identity, academics, and activity in one place</p>
          </div>
        </div>
      ) : null}

      <div className="student-identity-card card border-0 shadow-sm mb-4">
        <div className="card-body student-identity-card__body">
          <div className="student-identity-card__topbar">
            <div className="student-identity-card__eyebrow">Profile overview</div>
            {isAdmin ? (
              <div className="student-identity-card__admin-actions">
                <Link to={`/students/${id}/edit`} className="btn btn-primary btn-sm">
                  Edit
                </Link>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          <div className="student-identity-card__layout">
            <div className="student-identity-card__identity-row">
              <div className="position-relative">
                {student.profile_image ? (
                  <img
                    src={student.profile_image}
                    alt={`${student.name} profile`}
                    className="student-identity-card__avatar img-fluid"
                    style={{ objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setViewImage(true)}
                    aria-hidden
                  />
                ) : (
                  <div className="student-identity-card__avatar" aria-hidden>
                    {initialsFromName(student.name)}
                  </div>
                )}
                {(isAdmin || isOwnProfile) && (
                  <label className="profile-avatar-upload" style={{ position: 'absolute', bottom: -5, right: -5, width: 32, height: 32, cursor: 'pointer', zIndex: 2 }} title="Upload new avatar">
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} className="d-none" />
                    {avatarUploading ? (
                      <span className="spinner-border spinner-border-sm text-light" style={{ width: '1rem', height: '1rem' }} role="status" />
                    ) : (
                      <i className="bi bi-camera-fill" aria-hidden />
                    )}
                  </label>
                )}
              </div>
              <div className="student-identity-card__identity-text">
                <h2 className="student-identity-card__name">{fmt(student.name)}</h2>
                <p className="student-identity-card__meta text-muted mb-2">
                  {fmt(student.roll_number)}
                  {student.department ? ` | ${fmt(student.department)}` : ''}
                </p>
                <p className="student-identity-card__course student-identity-card__course--clamp mb-0">
                  {student.course ? fmt(student.course) : <span className="text-muted">Course / program not set</span>}
                </p>
              </div>
            </div>

            <div className="student-identity-card__contact-block">
              <div className="student-identity-card__contact">
                {student.email ? (
                  <a className="student-identity-card__contact-item" href={`mailto:${student.email}`}>
                    <i className="bi bi-envelope" aria-hidden />
                    <span className="text-truncate">{student.email}</span>
                  </a>
                ) : (
                  <span className="student-identity-card__contact-item text-muted">
                    <i className="bi bi-envelope" aria-hidden />
                    No email
                  </span>
                )}
                {student.phone ? (
                  <a className="student-identity-card__contact-item" href={`tel:${String(student.phone).replace(/\s/g, '')}`}>
                    <i className="bi bi-telephone" aria-hidden />
                    {fmt(student.phone)}
                  </a>
                ) : (
                  <span className="student-identity-card__contact-item text-muted">
                    <i className="bi bi-telephone" aria-hidden />
                    No phone
                  </span>
                )}
              </div>
            </div>

            <div className="student-identity-card__viz">
              <span className="student-identity-card__section-label student-identity-card__viz-label">Academic score</span>
              <CgpaRing cgpa={student.cgpa} size={104} stroke={7} />
            </div>

            <div className="student-identity-card__actions">
              <div className="student-identity-card__resume-block">
                <span className="student-identity-card__section-label">Resume</span>
                {isOwnProfile ? (
                  <IdentityResumeField
                    resumeLink={student.resume_link}
                    onSaved={(newLink) => {
                      setStudent((prev) => (prev ? { ...prev, resume_link: newLink || null } : prev));
                    }}
                    readOnly={false}
                  />
                ) : (
                  <IdentityResumeField resumeLink={student.resume_link} readOnly />
                )}
              </div>

              <div className="student-identity-card__skills-block">
                <span className="student-identity-card__section-label">Skills</span>
                {skillTags.length > 0 ? (
                  <div className="student-skill-pills" role="list">
                    {skillTags.map((tag) => (
                      <span key={tag} className="student-skill-pill" role="listitem">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : isOwnProfile ? (
                  <Link to={`/students/${id}/edit`} className="student-skills-empty student-skills-empty--action">
                    + Add your top skills (for example React, Node.js)
                  </Link>
                ) : (
                  <div className="student-skills-empty">No skills listed</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4 student-academic-overview">
        <div className="card-header student-academic-overview__header">Academic overview</div>
        <div className="card-body py-0">
          <dl className="student-kv-list mb-0">
            <div className="student-kv-row">
              <dt>Department</dt>
              <dd>{fmt(student.department)}</dd>
            </div>
            <div className="student-kv-row">
              <dt>Course / program</dt>
              <dd>{fmt(student.course)}</dd>
            </div>
            <div className="student-kv-row">
              <dt>Year</dt>
              <dd>{student.year != null ? String(student.year) : '-'}</dd>
            </div>
            <div className="student-kv-row student-kv-row--last">
              <dt>CGPA</dt>
              <dd>{student.cgpa != null ? Number(student.cgpa).toFixed(2) : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-container student-profile-table">
            <div className="student-profile-table__head card-header border-0">
              <h3 className="student-profile-table__title h6 mb-0">Internships</h3>
              {showTableActions ? (
                <Link to={internAddHref} className="btn btn-sm student-profile-table__add-btn" title="Add internship">
                  <i className="bi bi-plus-lg" aria-hidden />
                  <span className="d-none d-sm-inline ms-1">Add new</span>
                </Link>
              ) : null}
            </div>
            <div className="table-responsive">
              <table className="table student-profile-table__data">
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Company</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Stipend</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="student-profile-table__th-actions">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {internships.length === 0 ? (
                    <ProfileTableEmpty variant="internships" isAdmin={isAdmin} studentId={id} colSpan={6} />
                  ) : (
                    internships.map((internship) => (
                      <tr key={internship.id} className="student-profile-table__row">
                        <td className="student-profile-table__cell student-profile-table__cell--primary">
                          {fmt(internship.title)}
                        </td>
                        <td className="student-profile-table__cell student-profile-table__cell--primary">
                          {fmt(internship.company_name)}
                        </td>
                        <td className="student-profile-table__cell student-profile-table__cell--muted">
                          {fmtDateRange(internship.start_date, internship.end_date)}
                        </td>
                        <td className="student-profile-table__cell student-profile-table__cell--muted">
                          {internship.stipend != null ? internship.stipend : '-'}
                        </td>
                        <td>
                          <StatusBadge status={internship.status} />
                        </td>
                        <td>
                          <Link to={`/internships/${internship.id}`} className="student-profile-table__row-link">
                            View
                          </Link>
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
          <div className="table-container student-profile-table">
            <div className="student-profile-table__head card-header border-0">
              <h3 className="student-profile-table__title h6 mb-0">Placements</h3>
              {showTableActions ? (
                <Link to={placementAddHref} className="btn btn-sm student-profile-table__add-btn" title="Add placement">
                  <i className="bi bi-plus-lg" aria-hidden />
                  <span className="d-none d-sm-inline ms-1">Add new</span>
                </Link>
              ) : null}
            </div>
            <div className="table-responsive">
              <table className="table student-profile-table__data">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Company</th>
                    <th scope="col">Package</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="student-profile-table__th-actions">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {placements.length === 0 ? (
                    <ProfileTableEmpty variant="placements" isAdmin={isAdmin} studentId={id} colSpan={5} />
                  ) : (
                    placements.map((placement) => (
                      <tr key={placement.id} className="student-profile-table__row">
                        <td className="student-profile-table__cell student-profile-table__cell--primary">
                          {fmt(placement.role)}
                        </td>
                        <td className="student-profile-table__cell student-profile-table__cell--primary">
                          {fmt(placement.company_name)}
                        </td>
                        <td className="student-profile-table__cell student-profile-table__cell--muted">
                          {placement.package_lpa != null ? `${placement.package_lpa} LPA` : '-'}
                        </td>
                        <td>
                          <StatusBadge status={placement.status} />
                        </td>
                        <td>
                          <Link to={`/placements/${placement.id}`} className="student-profile-table__row-link">
                            View
                          </Link>
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
      
      {viewImage && student.profile_image && (
        <div 
          className="modal-backdrop show d-flex justify-content-center align-items-center" 
          style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setViewImage(false)}
        >
          <div className="position-relative" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn-close btn-close-white position-absolute" 
              onClick={() => setViewImage(false)} 
              aria-label="Close"
              style={{ zIndex: 1051, top: '-2rem', right: '-2rem' }}
            />
            <img 
              src={student.profile_image} 
              alt="Expanded profile" 
              style={{ maxHeight: '85vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '8px' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
