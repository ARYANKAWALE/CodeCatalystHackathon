export function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = String(iso).slice(0, 10);
  return d || '—';
}

export function vacancyRoleLabel(roleType) {
  if (roleType === 'full_time') return 'Full-time';
  if (roleType === 'internship') return 'Internship';
  return fmt(roleType);
}

export function vacancyCompensation(v) {
  if (v.compensation_value == null || v.compensation_value === '') return '—';
  const n = Number(v.compensation_value);
  if (Number.isNaN(n)) return '—';
  if (v.compensation_kind === 'monthly_inr') {
    return `₹${n.toLocaleString('en-IN')}/mo`;
  }
  return `${n} LPA`;
}

/** True if application_deadline is strictly before today (local calendar). No deadline => still open. */
export function vacancyDeadlinePassed(v) {
  const raw = v?.application_deadline;
  if (raw == null || raw === '') return false;
  const deadline = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;
  return deadline < today;
}
