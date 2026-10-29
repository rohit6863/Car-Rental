import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminHeader({ onToggleSidebar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  return (
    <div className="brand clearfix">
      <Link to="/dashboard" style={{ fontSize: '20px' }}>
        Car Rental Portal | Admin Panel
      </Link>
      <span className="menu-btn" onClick={onToggleSidebar} style={{ cursor: 'pointer' }}>
        <i className="fa fa-bars"></i>
      </span>
      <ul className="ts-profile-nav">
        <li
          className={`ts-account ${accountOpen ? 'open' : ''}`}
          onClick={() => setAccountOpen(!accountOpen)}
          style={{ cursor: 'pointer' }}
        >
          <a href="#" onClick={(e) => e.preventDefault()}>
            <img src="/img/ts-avatar.jpg" className="ts-avatar hidden-side" alt="" />
            &nbsp;Account <i className="fa fa-angle-down hidden-side"></i>
          </a>
          {accountOpen && (
            <ul style={{ display: 'block' }}>
              <li>
                <Link to="/change-password" onClick={() => setAccountOpen(false)}>
                  Change Password
                </Link>
              </li>
              <li>
                <a href="#logout" onClick={handleLogout}>
                  Logout
                </a>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
}
