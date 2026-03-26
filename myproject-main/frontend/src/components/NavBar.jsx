import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/feed', label: 'View Feed' },
  { to: '/contact', label: 'Contact' },
  { to: '/admin', label: 'Admin' },
];

const signedInLinks = [
  { to: '/upload', label: 'Upload Snap' },
  { to: '/feed', label: 'View Feed' },
  { to: '/sac', label: 'SAC' },
  { to: '/association', label: 'ASSOCIATION' },
  { to: '/contact', label: 'Contact Admin' },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, admin, logoutAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  const navLinks = user ? [...signedInLinks] : [...publicLinks];
  if (admin) {
    navLinks.push({ to: '/admin', label: 'Admin' });
    navLinks.push({ to: '/users', label: 'Users' });
  }

  return (
    <header className="site-header">
      <div className="site-header-inner card">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark">KF</span>
          <div>
            <p>KITSFLICK</p>
            <span>Connected campus community</span>
          </div>
        </Link>

        <button
          type="button"
          className={`menu-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`site-nav-shell ${menuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={active ? 'active' : ''}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-actions">
            {user ? <span className="status-chip">Signed in: {user.username}</span> : null}
            {admin ? <span className="status-chip admin-chip">Admin: {admin.username}</span> : null}

            {!user ? <Link className="ghost-button" to="/login" onClick={closeMenu}>Login</Link> : null}
            {!user ? <Link className="animated-button nav-cta-button" to="/signup" onClick={closeMenu}>Sign Up</Link> : null}

            {user ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  logout();
                  closeMenu();
                  navigate('/');
                }}
              >
                Logout
              </button>
            ) : null}

            {admin ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  logoutAdmin();
                  closeMenu();
                  navigate('/admin');
                }}
              >
                Admin Out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
