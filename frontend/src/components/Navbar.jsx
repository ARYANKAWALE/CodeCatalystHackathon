import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (!user) return null;

  return (
    <nav className="navbar navbar-expand-lg sticky-top">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/dashboard">
          <div className="brand-icon"><i className="bi bi-mortarboard-fill" /></div>
          <span className="fw-bold">PlaceTrack</span>
        </Link>
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <i className="bi bi-list fs-4" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto ms-3">
            <li className="nav-item">
              <NavLink className="nav-link" to="/dashboard"><i className="bi bi-grid-1x2-fill me-1" /> Dashboard</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/students"><i className="bi bi-people-fill me-1" /> Students</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/companies"><i className="bi bi-building me-1" /> Companies</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/internships"><i className="bi bi-briefcase-fill me-1" /> Internships</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/placements"><i className="bi bi-trophy-fill me-1" /> Placements</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/reports"><i className="bi bi-file-earmark-bar-graph-fill me-1" /> Reports</NavLink>
            </li>
          </ul>
          <form className="d-flex me-3" onSubmit={handleSearch}>
            <div className="input-group search-box">
              <span className="input-group-text bg-transparent border-end-0"><i className="bi bi-search" /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </form>
          <div className="dropdown">
            <button className="btn btn-outline-secondary d-flex align-items-center gap-2" data-bs-toggle="dropdown">
              <div className="avatar-sm">{user.username[0].toUpperCase()}</div>
              <span className="d-none d-lg-inline">{user.username}</span>
              <i className="bi bi-chevron-down small" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end mt-2">
              <li><span className="dropdown-item-text text-muted small">Signed in as <strong>{user.username}</strong></span></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item" onClick={() => { logout(); navigate('/login'); }}><i className="bi bi-box-arrow-right me-2" />Logout</button></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
