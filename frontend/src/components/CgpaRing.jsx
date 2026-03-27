const CGPA_MAX = 10;

function ratioForCgpa(n) {
  return Math.max(0, Math.min(1, n / CGPA_MAX));
}

export default function CgpaRing({ cgpa, size = 96, stroke = 6, showCaption = true }) {
  const n = cgpa != null && cgpa !== '' ? Number(cgpa) : null;
  if (n == null || Number.isNaN(n)) {
    return (
      <div className="cgpa-ring" style={{ width: size }}>
        <div
          className="cgpa-ring__svg-wrap cgpa-ring__svg-wrap--empty"
          style={{ width: size, height: size }}
        >
          <span className="cgpa-ring__placeholder">—</span>
          <span className="cgpa-ring__scale">CGPA</span>
        </div>
        {showCaption ? <span className="cgpa-ring__caption">CGPA</span> : null}
      </div>
    );
  }

  const ratio = ratioForCgpa(n);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * ratio;

  return (
    <div className="cgpa-ring" style={{ width: size }} title={`CGPA out of ${CGPA_MAX}`}>
      <div className="cgpa-ring__svg-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            className="cgpa-ring__track"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="cgpa-ring__fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="cgpa-ring__center">
          <span className="cgpa-ring__inner">
            <span className="cgpa-ring__value">{n.toFixed(2)}</span>
            <span className="cgpa-ring__max">/{CGPA_MAX}</span>
          </span>
        </div>
      </div>
      {showCaption ? <span className="cgpa-ring__caption">CGPA</span> : null}
    </div>
  );
}
