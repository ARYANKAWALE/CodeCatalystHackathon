import { useMemo } from 'react';

/**
 * Reusable horizontal status timeline step-indicator.
 *
 * @param {{ statuses: string[], currentStatus: string, labels?: Record<string,string> }} props
 *
 * Steps before current → completed (✓), current → active (pulsing), after → upcoming (gray).
 */
export default function StatusTimeline({ statuses, currentStatus, labels = {} }) {
  const currentIdx = useMemo(() => {
    const idx = statuses.indexOf(currentStatus);
    return idx >= 0 ? idx : -1;
  }, [statuses, currentStatus]);

  const label = (s) =>
    labels[s] || s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="status-timeline" role="group" aria-label="Status progress">
      {statuses.map((s, i) => {
        let cls = 'status-timeline__step';
        if (i < currentIdx) cls += ' is-completed';
        else if (i === currentIdx) cls += ' is-active';
        else cls += ' is-upcoming';

        return (
          <div key={s} className={cls}>
            {i > 0 && (
              <div
                className={`status-timeline__connector ${i <= currentIdx ? 'is-filled' : ''}`}
              />
            )}
            <div className="status-timeline__dot">
              {i < currentIdx ? (
                <i className="bi bi-check-lg" aria-hidden />
              ) : i === currentIdx ? (
                <span className="status-timeline__pulse" />
              ) : null}
            </div>
            <span className="status-timeline__label">{label(s)}</span>
          </div>
        );
      })}
    </div>
  );
}
