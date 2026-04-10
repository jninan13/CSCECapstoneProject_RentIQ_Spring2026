import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkBase = 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors';
const activeClass = 'text-blue-600 bg-blue-50';
const inactiveClass = 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const navLinkClassName = ({ isActive }) =>
    `${linkBase} ${isActive ? activeClass : inactiveClass}`;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: logo + links */}
            <div className="flex items-center gap-1">
              <Link to="/" className="flex items-center mr-6">
                <span className="text-xl font-bold text-gray-900">Rent</span>
                <span className="text-xl font-bold text-blue-600">IQ</span>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {isAuthenticated && (
                  <>
                    <NavLink to="/properties" className={navLinkClassName}>
                      Search
                    </NavLink>
                    <NavLink to="/favorites" className={navLinkClassName}>
                      Favorites
                    </NavLink>
                  </>
                )}
                <NavLink to="/about" className={navLinkClassName}>
                  About
                </NavLink>
              </div>
            </div>

            {/* Right: auth */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <NavLink to="/profile" className={navLinkClassName}>
                    Profile
                  </NavLink>
                  <span className="text-xs text-gray-400 max-w-[140px] truncate">{user?.email}</span>
                  <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-xs px-4 py-2">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 pt-14">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white border-b border-gray-200 shadow-lg px-4 py-3 space-y-1">
            {isAuthenticated && (
              <>
                <NavLink to="/properties" className={navLinkClassName} onClick={() => setMobileOpen(false)}>Search</NavLink>
                <NavLink to="/favorites" className={navLinkClassName} onClick={() => setMobileOpen(false)}>Favorites</NavLink>
                <NavLink to="/profile" className={navLinkClassName} onClick={() => setMobileOpen(false)}>Profile</NavLink>
              </>
            )}
            <NavLink to="/about" className={navLinkClassName} onClick={() => setMobileOpen(false)}>About</NavLink>
            <div className="pt-3 mt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <>
                  <p className="text-xs text-gray-400 mb-2 truncate">{user?.email}</p>
                  <button onClick={handleLogout} className="btn-secondary w-full text-sm">Logout</button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link to="/register" className="btn-primary text-center text-sm" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
