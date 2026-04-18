import { useEffect, useState } from 'react';
import { api } from '../api';
import { getErrorMessage } from '../utils/errorMessage';

const INITIAL = {
  resumeMode: 'file',
  resumeUrl: '',
  coverLetter: '',
  portfolioLink: '',
};

/**
 * Application form for a vacancy: PDF upload or HTTPS résumé URL, optional cover letter & portfolio.
 */
export default function VacancyApplyModal({ vacancy, open, onClose, onApplied }) {
  const [form, setForm] = useState(INITIAL);
  const [resumeFile, setResumeFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(INITIAL);
      setResumeFile(null);
      setFormError('');
    }
  }, [open, vacancy?.id]);

  if (!open || !vacancy) return null;

  const heading =
    vacancy.company_name != null && vacancy.company_name !== ''
      ? `${vacancy.job_title || 'Role'} — ${vacancy.company_name}`
      : vacancy.job_title || 'Apply';

  const validateClient = () => {
    if (form.resumeMode === 'file') {
      if (!resumeFile) return 'Please choose a PDF résumé to upload.';
      const name = resumeFile.name || '';
      if (!name.toLowerCase().endsWith('.pdf')) return 'Résumé must be a .pdf file.';
    } else {
      const u = (form.resumeUrl || '').trim();
      if (!u) return 'Please enter a résumé URL (https://…).';
      const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      try {
        const p = new URL(href);
        if (p.protocol !== 'http:' && p.protocol !== 'https:') return 'Résumé URL must use http or https.';
        if (!p.host) return 'Résumé URL is not valid.';
      } catch {
        return 'Résumé URL is not valid.';
      }
    }
    const port = (form.portfolioLink || '').trim();
    if (port) {
      const href = /^https?:\/\//i.test(port) ? port : `https://${port}`;
      try {
        const p = new URL(href);
        if (p.protocol !== 'http:' && p.protocol !== 'https:') return 'Portfolio link must use http or https.';
        if (!p.host) return 'Portfolio link is not valid.';
      } catch {
        return 'Portfolio link is not valid.';
      }
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vErr = validateClient();
    if (vErr) {
      setFormError(vErr);
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      let created;
      if (form.resumeMode === 'file') {
        const fd = new FormData();
        fd.append('resume', resumeFile);
        fd.append('cover_letter', form.coverLetter.trim());
        fd.append('portfolio_link', form.portfolioLink.trim());
        created = await api.postForm(`/vacancies/${vacancy.id}/applications`, fd);
      } else {
        let resumeUrl = form.resumeUrl.trim();
        if (!/^https?:\/\//i.test(resumeUrl)) resumeUrl = `https://${resumeUrl}`;
        created = await api.post(`/vacancies/${vacancy.id}/applications`, {
          resume: resumeUrl,
          cover_letter: form.coverLetter.trim() || undefined,
          portfolio_link: form.portfolioLink.trim() || undefined,
        });
      }
      onApplied?.(created);
      onClose?.();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not submit application'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vacancy-apply-modal-title"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title" id="vacancy-apply-modal-title">
                Apply — {heading}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => !submitting && onClose?.()}
                disabled={submitting}
              />
            </div>
            <div className="modal-body">
              {formError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {formError}
                </div>
              )}

              <div className="mb-3">
                <div className="form-label">Résumé (required)</div>
                <div className="d-flex flex-wrap gap-3 mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="resumeMode"
                      id="apply-resume-file"
                      checked={form.resumeMode === 'file'}
                      onChange={() => {
                        setForm((f) => ({ ...f, resumeMode: 'file' }));
                        setFormError('');
                      }}
                    />
                    <label className="form-check-label" htmlFor="apply-resume-file">
                      Upload PDF
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="resumeMode"
                      id="apply-resume-url"
                      checked={form.resumeMode === 'url'}
                      onChange={() => {
                        setForm((f) => ({ ...f, resumeMode: 'url' }));
                        setResumeFile(null);
                        setFormError('');
                      }}
                    />
                    <label className="form-check-label" htmlFor="apply-resume-url">
                      Résumé URL
                    </label>
                  </div>
                </div>
                {form.resumeMode === 'file' ? (
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setResumeFile(f);
                      setFormError('');
                    }}
                  />
                ) : (
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://… (Drive, portfolio, etc.)"
                    value={form.resumeUrl}
                    onChange={(e) => setForm((p) => ({ ...p, resumeUrl: e.target.value }))}
                    autoComplete="off"
                  />
                )}
                <div className="form-text">PDF uploads are limited to 5 MB.</div>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="apply-cover">
                  Cover letter / message to HR (optional)
                </label>
                <textarea
                  id="apply-cover"
                  className="form-control"
                  rows={4}
                  value={form.coverLetter}
                  onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))}
                  maxLength={20000}
                  placeholder="Introduce yourself or add context for this role…"
                />
              </div>

              <div className="mb-0">
                <label className="form-label" htmlFor="apply-portfolio">
                  Portfolio / GitHub / LinkedIn (optional)
                </label>
                <input
                  id="apply-portfolio"
                  type="url"
                  className="form-control"
                  placeholder="https://…"
                  value={form.portfolioLink}
                  onChange={(e) => setForm((p) => ({ ...p, portfolioLink: e.target.value }))}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => !submitting && onClose?.()}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
