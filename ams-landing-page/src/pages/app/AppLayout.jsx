import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ams-theme.css';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="ams-app-container">
      {/* Exact Navbar from admin_panel.html */}
      <header className="ams-navbar">
        <Link to="/app/dashboard" className="logo">
          <span>AMS</span>
          <span style={{ fontSize: '0.85rem', color: '#28A745', fontWeight: 'normal', marginLeft: '5px' }}>
            [SaaS Portal]
          </span>
        </Link>

        <nav className="nav-links">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/app/kiosk"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Attendance Kiosk
          </NavLink>
          <NavLink
            to="/app/enroll"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Add User
          </NavLink>
          <NavLink
            to="/app/history"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            History & Records
          </NavLink>
          <NavLink
            to="/app/settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Setup Times
          </NavLink>
        </nav>

        <div className="company-info">
          <span>🏢 {user?.company_name || 'Organization'}</span>
          <span style={{ color: '#A0A0A0', fontSize: '0.85rem' }}>({user?.username})</span>
          <button
            onClick={handleLogout}
            className="ams-btn ams-btn-danger"
            style={{ padding: '5px 12px', fontSize: '0.85rem', marginLeft: '10px' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px', width: '100%', boxSizing: 'border-box' }}>
        <Outlet />
      </main>
    </div>
  );
}
