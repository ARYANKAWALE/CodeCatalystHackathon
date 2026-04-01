import { useEffect, useState } from 'react';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

/**
 * Compact resume URL control for the identity header (not a full-width card).
 */
export default function IdentityResumeField({ resumeLink, onSaved, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState(resumeLink || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setLink(resumeLink || '');
  }, [resumeLink]);

  useEffect(() => {
    if (!ok) return undefined;
    const t = window.setTimeout(() => setOk(false), 2500);
    return () => window.clearTimeout(t);
  }, [ok]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/me/resume', { resume_link: link });
      onSaved(res.resume_link ?? '');
      setOk(true);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    if (resumeLink) {
      return (
        <a
          href={resumeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="identity-resume-field__link"
        >
          <i className="bi bi-file-earmark-pdf me-1" aria-hidden />
          View resume
        </a>
      );
    }
    return <span className="identity-resume-field__muted">No resume link</span>;
  }

  return (
    <div className="identity-resume-field">
      {error ? <div className="identity-resume-field__error small">{error}</div> : null}
      {ok ? <div className="identity-resume-field__ok small">Saved</div> : null}
      {!editing && !resumeLink ? (
        <button
          type="button"
          className="btn btn-sm identity-resume-field__btn-add"
          onClick={() => setEditing(true)}
        >
          <i className="bi bi-plus-lg me-1" aria-hidden />
          Add resume PDF link
        </button>
      ) : null}
      {!editing && resumeLink ? (
        <div className="identity-resume-field__row">
          <a
            href={resumeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary"
          >
            <i className="bi bi-box-arrow-up-right me-1" aria-hidden />
            Open resume
          </a>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setEditing(true)}
          >
            Edit link
          </button>
        </div>
      ) : null}
      {editing ? (
        <form className="identity-resume-field__form" onSubmit={submit}>
          <input
            type="url"
            className="form-control form-control-sm identity-resume-field__input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            aria-label="Resume PDF URL"
          />
          <div className="identity-resume-field__actions">
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setLink(resumeLink || '');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
