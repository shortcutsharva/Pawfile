import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { NavIcon, type IconName } from './Icons';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/cases', label: 'Cases', icon: 'cases' },
  { to: '/contacts', label: 'Contacts', icon: 'contacts' },
  { to: '/hearings', label: 'Hearings', icon: 'hearings' },
  { to: '/documents', label: 'Documents', icon: 'documents' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
];

export function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const current =
    NAV.find(
      (item) =>
        location.pathname === item.to ||
        (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)),
    ) ?? NAV[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>
            Pawfile
            <small>Operations</small>
          </span>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="read-only">Read-only dashboard</span>
          <button type="button" className="button button-ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Pawfile</span>
            <h1>{current.label}</h1>
          </div>
          <span className="topbar-meta">SQLite server · read-only</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
