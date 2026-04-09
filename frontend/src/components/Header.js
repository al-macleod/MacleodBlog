import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaMoon, FaSearch, FaSun, FaTimes } from 'react-icons/fa';
import '../styles/Header.css';
import api from '../services/api';
import { useTheme } from '../App';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();

  const exploreLinks = useMemo(() => ([
    { to: '/', label: 'Home', end: true },
    { to: '/random', label: 'Random Thoughts' },
    { to: '/tweets', label: 'Recent Thoughts' },
    { to: '/library', label: 'Library' },
    { to: '/search', label: 'Search' }
  ]), []);

  const createLinks = useMemo(() => ([
    { to: '/studio', label: 'Writing Studio', className: 'write-link' },
    { to: '/random', label: 'Thought Composer' }
  ]), []);

  const accountLinks = useMemo(() => (
    user ? [
      { to: `/profile/${user.id}`, label: 'Profile' },
      { to: '/settings', label: 'Settings' },
      { to: '/account', label: 'Account' }
    ] : [
      { to: '/account', label: 'Join / Login' }
    ]
  ), [user]);

  const routeMatches = (target) => {
    if (target === '/') {
      return location.pathname === '/';
    }

    return location.pathname.startsWith(target);
  };

  const groupIsActive = (links) => links.some((link) => routeMatches(link.to));

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await api.get('/users/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const toggleDropdown = (key) => {
    setOpenDropdown((current) => (current === key ? null : key));
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-top-row">
          <div className="logo">
            <Link to="/">
              <h1>BuzzForge</h1>
            </Link>
          </div>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-controls="global-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div id="global-navigation" className={`header-navigation ${menuOpen ? 'open' : ''}`}>
          <nav className="nav nav-groups" aria-label="Primary navigation">
            <div className="nav-dropdown">
              <button
                type="button"
                className={`nav-link dropdown-trigger ${groupIsActive(exploreLinks) ? 'active' : ''}`}
                onClick={() => toggleDropdown('explore')}
                aria-expanded={openDropdown === 'explore'}
              >
                Explore
              </button>
              <div className={`dropdown-menu ${openDropdown === 'explore' ? 'open' : ''}`}>
                {exploreLinks.map((link) => (
                  <NavLink
                    key={`explore-${link.to}`}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`.trim()}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="nav-dropdown">
              <button
                type="button"
                className={`nav-link dropdown-trigger ${groupIsActive(createLinks) ? 'active' : ''}`}
                onClick={() => toggleDropdown('create')}
                aria-expanded={openDropdown === 'create'}
              >
                Create
              </button>
              <div className={`dropdown-menu ${openDropdown === 'create' ? 'open' : ''}`}>
                {createLinks.map((link) => (
                  <NavLink
                    key={`create-${link.to}`}
                    to={link.to}
                    className={({ isActive }) => `dropdown-item ${link.className || ''} ${isActive ? 'active' : ''}`.trim()}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="nav-dropdown nav-dropdown-account">
              <button
                type="button"
                className={`nav-link dropdown-trigger ${groupIsActive(accountLinks) ? 'active' : ''}`}
                onClick={() => toggleDropdown('account')}
                aria-expanded={openDropdown === 'account'}
              >
                Account
              </button>
              <div className={`dropdown-menu ${openDropdown === 'account' ? 'open' : ''}`}>
                {accountLinks.map((link) => (
                  <NavLink
                    key={`account-${link.to}`}
                    to={link.to}
                    className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`.trim()}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          <div className="header-utilities">
            <button
              type="button"
              className="dark-mode-toggle"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
            </button>
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search posts and articles"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn" aria-label="Run search">
                <FaSearch />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
