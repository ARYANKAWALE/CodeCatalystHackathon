/** Muted inline SVG for student dashboard empty tables (internships / placements). */
export function InternshipsEmptyIllustration() {
  return (
    <svg
      className="student-dash-empty-svg"
      viewBox="0 0 120 100"
      aria-hidden
      focusable="false"
    >
      <rect x="18" y="22" width="84" height="56" rx="8" fill="currentColor" opacity="0.08" />
      <path
        d="M32 38h56M32 50h40M32 62h48"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.2"
      />
      <circle cx="78" cy="36" r="14" fill="currentColor" opacity="0.12" />
      <path
        d="M74 36h8M78 32v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function PlacementsEmptyIllustration() {
  return (
    <svg
      className="student-dash-empty-svg"
      viewBox="0 0 120 100"
      aria-hidden
      focusable="false"
    >
      <path
        d="M40 72 L60 42 L80 72 Z"
        fill="currentColor"
        opacity="0.1"
      />
      <rect x="52" y="28" width="16" height="20" rx="2" fill="currentColor" opacity="0.15" />
      <circle cx="60" cy="36" r="4" fill="currentColor" opacity="0.25" />
      <path
        d="M28 78h64"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.2"
      />
    </svg>
  );
}
