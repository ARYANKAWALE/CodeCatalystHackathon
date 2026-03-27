const CLASS_MAP = {
  applied: 'badge-applied',
  selected: 'badge-selected',
  shortlisted: 'badge-shortlisted',
  interview_scheduled: 'badge-interview-scheduled',
  offer_received: 'badge-offer-received',
  ongoing: 'badge-ongoing',
  completed: 'badge-completed',
  placed: 'badge-placed',
  rejected: 'badge-rejected',
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  withdrawn: 'badge-withdrawn',
};

export default function StatusBadge({ status }) {
  const cls = CLASS_MAP[status] || 'badge-applied';
  return <span className={`badge ${cls}`}>{(status || '—').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</span>;
}
