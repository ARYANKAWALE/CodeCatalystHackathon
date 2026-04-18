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
