import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const collapseRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  if (!user) return null;

  const role = String(user.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';
  /** Student-only UI; admins never use "My …" nav even if student_id is set */
  const isStudent = role === 'student' && !isAdmin;

  const navItems = [
    { to: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
    ...(isAdmin ? [{ to: '/students', icon: 'bi-people-fill', label: 'Students' }] : []),
    ...(isStudent && user.student_id != null
      ? [{ to: `/students/${user.student_id}`, icon: 'bi-person-badge', label: 'My profile' }]
      : []),
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
    <nav className="navbar navbar-expand-lg sticky-top">
      <div className="container-fluid px-3 px-md-4">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/dashboard" onClick={closeMenu}>
          <div className="brand-icon"><i className="bi bi-mortarboard-fill" /></div>
          <span className="fw-bold">PlaceTrack</span>
        </Link>

        <div className="d-flex align-items-center gap-2 d-lg-none">
          <button className="theme-toggle" onClick={toggle} style={{ width: 34, height: 34, fontSize: '.95rem' }}>
            <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
          </button>
          <button
            className="navbar-toggler border-0 p-1"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`} />
          </button>
        </div>

        <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} ref={collapseRef}>
          <ul className="navbar-nav me-auto ms-lg-3">
            {navItems.map(({ to, icon, label }) => (
              <li className="nav-item" key={to}>
                <NavLink className="nav-link" to={to} onClick={closeMenu}>
                  <i className={`bi ${icon} me-1`} /> {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <form className="d-flex my-2 my-lg-0 me-lg-3" onSubmit={handleSearch}>
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

          <div className="d-none d-lg-block me-2">
            <button className="theme-toggle" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
              <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
            </button>
          </div>

          <div className="dropdown my-2 my-lg-0">
            <button className="btn btn-outline-secondary d-flex align-items-center gap-2 w-100 w-lg-auto" data-bs-toggle="dropdown">
              <div className="avatar-sm">{user.username[0].toUpperCase()}</div>
              <span>{user.username}</span>
              <i className="bi bi-chevron-down small ms-auto ms-lg-0" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end mt-2 w-100 w-lg-auto">
              <li><span className="dropdown-item-text text-muted small">Signed in as <strong>{user.username}</strong> ({user.role})</span></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={() => { logout(); navigate('/login'); closeMenu(); }}>
                  <i className="bi bi-box-arrow-right me-2" />Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
