import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Shared top navbar.
 * Props:
 *   actions — extra { label, onClick | href, variant, icon? } items
 */
export function Navbar({ actions = [] }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click (desktop dropdown)
  useEffect(() => {
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: '⬡' },
    { label: 'My Plan',   href: '/plan',       icon: '📋' },
    { label: 'Protocols', href: '/protocols',  icon: '🗂' },
    { label: 'Progress',  href: '/progress',   icon: '📊' },
    ...actions,
  ];

  const isActive = (href) => href && location.pathname === href;
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

  return (
    <header className="bg-cyber-dark/95 backdrop-blur-md border-b border-cyber-purple-800/60 shadow-lg shadow-cyber-purple-900/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* ── Logo ── */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div
              className="w-8 h-8 bg-gradient-to-br from-cyber-purple-600 to-cyber-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ clipPath: 'polygon(0 20%,20% 0,80% 0,100% 20%,100% 80%,80% 100%,20% 100%,0 80%)' }}
            >
              CF
            </div>
            <span className="text-base sm:text-lg font-bold text-cyber-cyan-400 tracking-widest group-hover:text-cyber-cyan-300 transition-colors font-sans">
              CYBER<span className="text-cyber-purple-400">FIT</span>
            </span>
          </Link>

          {/* ── Desktop centre nav ── */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link, i) =>
              link.href ? (
                <Link
                  key={i}
                  to={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono tracking-wide rounded transition-all duration-150 ${
                    isActive(link.href)
                      ? 'bg-cyber-purple-900/70 text-cyber-cyan-300 border border-cyber-cyan-700/50'
                      : 'text-gray-400 hover:text-white hover:bg-cyber-purple-900/40'
                  }`}
                >
                  <span className="text-sm">{link.icon}</span>
                  {link.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={link.onClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono tracking-wide rounded text-gray-400 hover:text-white hover:bg-cyber-purple-900/40 transition-all duration-150"
                >
                  <span className="text-sm">{link.icon}</span>
                  {link.label}
                </button>
              )
            )}
          </nav>

          {/* ── Right: CTA + avatar/hamburger ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Desktop-only "New Protocol" CTA */}
            <Link
              to="/onboarding"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 cyber-button bg-gradient-to-r from-cyber-purple-700 to-cyber-cyan-700 text-white text-xs font-mono font-semibold tracking-wide hover:shadow-cyan-glow transition-all duration-200"
            >
              <span>⚡</span>
              NEW PROTOCOL
            </Link>

            {/* Avatar + toggle (all screen sizes) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={open}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-cyber-purple-900/40 transition-colors"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-cyber-purple-600 to-cyber-cyan-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
                  style={{ clipPath: 'polygon(0 20%,20% 0,80% 0,100% 20%,100% 80%,80% 100%,20% 100%,0 80%)' }}
                >
                  {initials}
                </div>
                {/* Chevron on desktop, hamburger/X on mobile */}
                <span className="hidden md:block">
                  <svg
                    className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <span className="md:hidden">
                  {open ? (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </span>
              </button>

              {/* ── Dropdown / slide-down menu ── */}
              {open && (
                <>
                  {/* Desktop: floating dropdown */}
                  <div className="hidden md:block absolute right-0 top-full mt-2 w-52 bg-cyber-dark border border-cyber-purple-700/60 shadow-xl shadow-cyber-purple-900/40 z-50 overflow-hidden"
                    style={{ clipPath: 'polygon(0 8px,8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)' }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-cyber-purple-800/50">
                      <p className="text-xs text-gray-500 font-mono">SIGNED IN AS</p>
                      <p className="text-xs text-cyber-cyan-300 font-mono truncate mt-0.5">{user?.email}</p>
                    </div>
                    {/* Sign out */}
                    <button
                      onClick={() => { signOut(); setOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-xs font-mono text-cyber-red-400 hover:text-white hover:bg-cyber-red-900/30 transition-colors"
                    >
                      <span>⏻</span>
                      SIGN OUT
                    </button>
                  </div>

                  {/* Mobile: full-width panel below navbar */}
                  <div className="md:hidden fixed left-0 right-0 top-14 bg-cyber-dark border-b border-cyber-purple-800/60 shadow-xl shadow-cyber-purple-900/30 z-50">
                    {/* User info strip */}
                    <div className="px-4 py-3 border-b border-cyber-purple-800/40 bg-cyber-darker/60">
                      <p className="text-xs text-gray-500 font-mono">SIGNED IN AS</p>
                      <p className="text-xs text-cyber-cyan-300 font-mono truncate mt-0.5">{user?.email}</p>
                    </div>

                    {/* Nav links */}
                    <nav className="py-1">
                      {navLinks.map((link, i) =>
                        link.href ? (
                          <Link
                            key={i}
                            to={link.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-5 py-3.5 text-sm font-mono transition-colors ${
                              isActive(link.href)
                                ? 'text-cyber-cyan-300 bg-cyber-purple-900/50 border-l-2 border-cyber-cyan-500'
                                : 'text-gray-400 hover:text-white hover:bg-cyber-purple-900/30 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="text-base">{link.icon}</span>
                            {link.label}
                          </Link>
                        ) : (
                          <button
                            key={i}
                            onClick={() => { link.onClick?.(); setOpen(false); }}
                            className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-mono text-gray-400 hover:text-white hover:bg-cyber-purple-900/30 border-l-2 border-transparent transition-colors"
                          >
                            <span className="text-base">{link.icon}</span>
                            {link.label}
                          </button>
                        )
                      )}

                      {/* Generate Protocol CTA */}
                      <Link
                        to="/onboarding"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-5 py-3.5 text-sm font-mono text-cyber-cyan-400 hover:text-white hover:bg-cyber-cyan-900/20 border-l-2 border-transparent hover:border-cyber-cyan-500 transition-colors"
                      >
                        <span className="text-base">⚡</span>
                        New Protocol
                      </Link>
                    </nav>

                    {/* Sign out */}
                    <div className="border-t border-cyber-purple-800/40 px-5 py-3">
                      <button
                        onClick={() => { signOut(); setOpen(false); }}
                        className="flex items-center gap-3 w-full text-sm font-mono text-cyber-red-400 hover:text-white transition-colors"
                      >
                        <span>⏻</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
