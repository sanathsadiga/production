import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

export const UserNavbar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>MMCL Production</h1>
        </div>
        <ul className="navbar-menu">
          <li><a href="/user/dashboard">Welcome</a></li>
        </ul>
        <div className="navbar-user">
          {user && <span className="user-name">{user.name}</span>}
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export const AdminNavbar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <nav className="navbar navbar-admin">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>MMCL Production - Admin</h1>
        </div>
        <ul className="navbar-menu">
          <li><a href="/admin/dashboard">Welcome</a></li>
          <li><a href="/admin/reports">Reports</a></li>
        </ul>
        <div className="navbar-user">
          {user && <span className="user-name">{user.name}</span>}
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  );
};
