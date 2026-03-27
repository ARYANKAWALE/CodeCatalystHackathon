import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  if (!user) {
    return (
      <main className="main-content main-content--no-sidebar">
        {children}
      </main>
    );
  }

  const role = String(user.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  /** Student-only UI; admins never use "My …" nav even if student_id is set */
  const isStudent = role === 'student' && !isAdmin;

  const profilePath =
    isStudent && user.student_id != null ? `/students/${user.student_id}` : '/my-profile';

  const navItems = [
    { to: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard', end: true },
    ...(isAdmin ? [{ to: '/students', icon: 'bi-people-fill', label: 'Students' }] : []),
    ...(isStudent ? [{ to: profilePath, icon: 'bi-person-badge', label: 'My profile' }] : []),
    { to: '/companies', icon: 'bi-building', label: 'Companies' },
    {
      to: '/internships',
      icon: 'bi-briefcase-fill',
      label: isAdmin ? 'Internships' : isStudent ? 'My internships' : 'Internships',
    },
    {
      to: '/placements',
      icon: 'bi-trophy-fill',
      label: isAdmin ? 'Placements' : isStudent ? 'My placements' : 'Placements',
    },
    ...(isAdmin
      ? [
          { to: '/reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Reports' },
          { to: '/appeals', icon: 'bi-inbox-fill', label: 'Appeals' },
        ]
      : []),
    ...(isStudent
      ? [
          { to: '/appeals', icon: 'bi-send-fill', label: 'My requests' },
          { to: '/reports/me', icon: 'bi-graph-up-arrow', label: 'My report' },
        ]
      : []),
  ];

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop d-md-none"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}

      <aside id="app-sidebar" className={`app-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <Link className="sidebar-brand" to="/dashboard" onClick={closeMenu}>
            <div className="brand-icon"><i className="bi bi-mortarboard-fill" /></div>
            <span className="fw-bold">PlaceTrack</span>
          </Link>

          <form className="sidebar-search" onSubmit={handleSearch}>
            <div className="input-group search-box">
              <span className="input-group-text border-end-0"><i className="bi bi-search" /></span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list">
            {navItems.map(({ to, icon, label, end }) => (
              <li key={`${to}-${label}`}>
                <NavLink className="sidebar-nav-link" to={to} end={Boolean(end)} onClick={closeMenu}>
                  <i className={`bi ${icon}`} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="dropdown dropup sidebar-profile-dropdown">
            <button
              type="button"
              className="btn btn-outline-secondary sidebar-profile-btn d-flex align-items-center gap-2 w-100"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="avatar-sm">{user.username[0].toUpperCase()}</div>
              <span className="text-truncate flex-grow-1 text-start">{user.username}</span>
              <i className="bi bi-chevron-up small flex-shrink-0" />
            </button>
            <ul className="dropdown-menu dropdown-menu-start shadow-lg w-100">
              <li>
                <span className="dropdown-item-text text-muted small">
                  Signed in as <strong>{user.username}</strong> ({user.role})
                </span>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link className="dropdown-item" to="/account/password" onClick={closeMenu}>
                  <i className="bi bi-key me-2" />
                  Change password
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => toggle()}
                >
                  <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'} me-2`} />
                  {dark ? 'Light mode' : 'Dark mode'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    logout();
                    navigate('/login');
                    closeMenu();
                  }}
                >
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="app-main-area">
        <header className="mobile-chrome-bar d-md-none">
          <button
            type="button"
            className="mobile-chrome-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`} />
          </button>
          <Link className="mobile-chrome-brand" to="/dashboard" onClick={closeMenu}>
            <div className="brand-icon brand-icon-sm" aria-hidden>
              <i className="bi bi-mortarboard-fill" />
            </div>
            <span className="fw-bold">PlaceTrack</span>
          </Link>
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
