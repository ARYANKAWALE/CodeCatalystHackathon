import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relativeDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.round(diffDays / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

export default function MyProfile() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/auth/profile');
      setProfile(data);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load profile'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const startEditing = () => {
    const s = profile?.student || {};
    setForm({
      email: profile?.email || '',
      name: s.name || '',
      phone: s.phone || '',
      department: s.department || '',
      course: s.course || '',
      year: s.year || '',
      cgpa: s.cgpa ?? '',
      skills: s.skills || '',
    });
    setSaveMsg('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveMsg('');
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const data = await api.patch('/auth/profile', form);
      setProfile(data);
      setEditing(false);
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) {
      setSaveMsg(getErrorMessage(e, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setSaveMsg('Only PDF files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveMsg('File too large (max 5 MB)');
      return;
    }
    setResumeUploading(true);
    setSaveMsg('');
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const data = await api.postForm('/auth/profile/resume', fd);
      setProfile((prev) => ({
        ...prev,
        student: { ...prev.student, resume_link: data.resume_link },
      }));
      setSaveMsg('Resume uploaded successfully!');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err) {
      setSaveMsg(getErrorMessage(err, 'Could not upload resume'));
    } finally {
      setResumeUploading(false);
      e.target.value = '';
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

  if (error && !profile) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  if (!profile) return null;

  const isStudent = profile.role === 'student';
  const stu = profile.student;
  const initials = (stu?.name || profile.username || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="profile-page">
      {/* Hero card */}
      <div className="profile-hero">
        <div className="profile-hero__avatar">
          <span>{initials}</span>
        </div>
        <div className="profile-hero__info">
          <h2 className="profile-hero__name">{stu?.name || profile.username}</h2>
          <p className="profile-hero__role">
            <span className="profile-role-badge">{profile.role}</span>
            {stu?.roll_number && (
              <span className="profile-roll-badge">{stu.roll_number}</span>
            )}
          </p>
          <p className="profile-hero__joined">
            <i className="bi bi-calendar3 me-1" aria-hidden />
            Joined {fmtDate(profile.created_at)}
            <span className="date-chip">{relativeDateLabel(profile.created_at)}</span>
          </p>
        </div>
        <div className="profile-hero__actions">
          {!editing && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startEditing}>
              <i className="bi bi-pencil me-1" aria-hidden />Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {saveMsg && (
        <div className={`alert ${saveMsg.includes('!') ? 'alert-success' : 'alert-danger'} border-0 shadow-sm mt-3`} role="alert">
          {saveMsg}
        </div>
      )}

      {/* Profile content */}
      <div className="row g-4 mt-1">
        {/* Account Information */}
        <div className="col-lg-6">
          <div className="profile-card">
            <div className="profile-card__header">
              <i className="bi bi-person-circle me-2" aria-hidden />Account Information
            </div>
            <div className="profile-card__body">
              <div className="profile-field">
                <label className="profile-field__label">Username</label>
                <div className="profile-field__value profile-field__value--readonly">
                  <i className="bi bi-lock me-1" aria-hidden />
                  {profile.username}
                  <span className="profile-field__hint">Cannot be changed</span>
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-field__label">Email</label>
                {editing ? (
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                ) : (
                  <div className="profile-field__value">{profile.email || '—'}</div>
                )}
              </div>
              <div className="profile-field">
                <label className="profile-field__label">Role</label>
                <div className="profile-field__value profile-field__value--readonly">
                  <span className="profile-role-badge">{profile.role}</span>
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-field__label">Account Created</label>
                <div className="profile-field__value">{fmtDate(profile.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Details (only for students with linked record) */}
        {isStudent && stu && (
          <div className="col-lg-6">
            <div className="profile-card">
              <div className="profile-card__header">
                <i className="bi bi-mortarboard me-2" aria-hidden />Student Details
              </div>
              <div className="profile-card__body">
                <div className="profile-field">
                  <label className="profile-field__label">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  ) : (
                    <div className="profile-field__value">{stu.name || '—'}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Roll Number</label>
                  <div className="profile-field__value profile-field__value--readonly">
                    <i className="bi bi-lock me-1" aria-hidden />
                    {stu.roll_number}
                    <span className="profile-field__hint">Cannot be changed</span>
                  </div>
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="e.g. +91 9876543210"
                    />
                  ) : (
                    <div className="profile-field__value">{stu.phone || '—'}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Department</label>
                  {editing ? (
                    <input
                      type="text"
                      className="form-control"
                      value={form.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                    />
                  ) : (
                    <div className="profile-field__value">{stu.department || '—'}</div>
                  )}
                </div>
                <div className="row">
                  <div className="col-6">
                    <div className="profile-field">
                      <label className="profile-field__label">Course</label>
                      {editing ? (
                        <input
                          type="text"
                          className="form-control"
                          value={form.course}
                          onChange={(e) => handleChange('course', e.target.value)}
                        />
                      ) : (
                        <div className="profile-field__value">{stu.course || '—'}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="profile-field">
                      <label className="profile-field__label">Year</label>
                      {editing ? (
                        <input
                          type="number"
                          className="form-control"
                          value={form.year}
                          min={1}
                          max={6}
                          onChange={(e) => handleChange('year', e.target.value)}
                        />
                      ) : (
                        <div className="profile-field__value">{stu.year || '—'}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="profile-field">
                      <label className="profile-field__label">CGPA</label>
                      {editing ? (
                        <input
                          type="number"
                          className="form-control"
                          value={form.cgpa}
                          step="0.01"
                          min={0}
                          max={10}
                          onChange={(e) => handleChange('cgpa', e.target.value)}
                        />
                      ) : (
                        <div className="profile-field__value">{stu.cgpa ?? '—'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills & Resume (for students) */}
        {isStudent && stu && (
          <div className="col-12">
            <div className="profile-card">
              <div className="profile-card__header">
                <i className="bi bi-tools me-2" aria-hidden />Skills & Resume
              </div>
              <div className="profile-card__body">
                <div className="profile-field">
                  <label className="profile-field__label">Skills</label>
                  {editing ? (
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.skills}
                      onChange={(e) => handleChange('skills', e.target.value)}
                      placeholder="e.g. Python, React, Machine Learning, SQL..."
                    />
                  ) : (
                    <div className="profile-field__value">
                      {stu.skills ? (
                        <div className="profile-skills-wrap">
                          {stu.skills.split(',').map((s, i) => (
                            <span key={i} className="profile-skill-chip">{s.trim()}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted fst-italic">No skills added yet</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Resume (PDF)</label>
                  <div className="profile-field__value">
                    {stu.resume_link ? (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <a
                          href={stu.resume_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="bi bi-file-earmark-pdf me-1" aria-hidden />
                          View Resume
                        </a>
                        <span className="text-muted" style={{ fontSize: '.78rem' }}>
                          {stu.resume_link.split('/').pop()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted fst-italic">No resume uploaded yet</span>
                    )}
                    <div className="mt-2">
                      <label className="btn btn-sm btn-outline-secondary" style={{ cursor: 'pointer' }}>
                        {resumeUploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up me-1" aria-hidden />
                            {stu.resume_link ? 'Replace Resume' : 'Upload Resume'}
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf"
                          className="d-none"
                          onChange={handleResumeUpload}
                          disabled={resumeUploading}
                        />
                      </label>
                      <span className="text-muted ms-2" style={{ fontSize: '.72rem' }}>PDF only, max 5 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin with no student record */}
        {!isStudent && (
          <div className="col-lg-6">
            <div className="profile-card">
              <div className="profile-card__header">
                <i className="bi bi-shield-check me-2" aria-hidden />Admin Account
              </div>
              <div className="profile-card__body">
                <p className="text-muted mb-0">
                  You are signed in as an administrator. Admin accounts manage students,
                  companies, internships, placements, and appeals.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit action buttons */}
      {editing && (
        <div className="profile-edit-actions mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Saving…
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1" aria-hidden />Save Changes
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={cancelEditing}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
