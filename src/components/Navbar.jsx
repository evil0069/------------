import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleScroll = (id) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Don't show navbar on chat page (it has its own header)
  if (location.pathname === '/chat') return null;

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-chance">𝕮𝖍𝖆𝖓𝖈𝖊</span>
          <span className="brand-ai">AI</span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <button
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => {
              setMenuOpen(false);
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Companion
          </button>
          <button className="nav-link" onClick={() => handleScroll('technology')}>
            Technology
          </button>
          <button className="nav-link" onClick={() => handleScroll('experience')}>
            Experience
          </button>
          <button className="nav-link" onClick={() => handleScroll('about')}>
            About
          </button>

          {user ? (
            <div className="nav-auth-group">
              <Link
                to="/chat"
                className="nav-btn-primary"
                onClick={() => setMenuOpen(false)}
              >
                Start Chatting →
              </Link>
              <Link
                to="/settings"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <button onClick={handleLogout} className="nav-link nav-logout">
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="nav-btn-primary"
              onClick={() => setMenuOpen(false)}
            >
              Log In or Sign In
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
