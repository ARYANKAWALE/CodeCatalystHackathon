/**
 * AnimatedBackground — CSS-only floating gradient orbs.
 * Renders behind auth pages for a premium, dynamic feel.
 */
export default function AnimatedBackground({ variant = 'auth' }) {
  return (
    <div className={`anim-bg anim-bg--${variant}`} aria-hidden="true">
      <div className="anim-bg__orb anim-bg__orb--1" />
      <div className="anim-bg__orb anim-bg__orb--2" />
      <div className="anim-bg__orb anim-bg__orb--3" />
      <div className="anim-bg__grid" />
    </div>
  );
}
