import { useLocation } from 'react-router-dom';

/**
 * PageTransition — wraps page content with a slide-up fade-in animation.
 * Re-triggers on route change via the location key.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <div className="page-transition" key={location.pathname}>
      {children}
    </div>
  );
}
