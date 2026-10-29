import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ active }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  return (
    <div className="profile_nav">
      <ul>
        <li className={active === 'profile' ? 'active' : ''}>
          <Link to="/profile">Profile Settings</Link>
        </li>
        <li className={active === 'password' ? 'active' : ''}>
          <Link to="/update-password">Update Password</Link>
        </li>
        <li className={active === 'booking' ? 'active' : ''}>
          <Link to="/my-booking">My Booking</Link>
        </li>
        <li>
          <a href="#logout" onClick={handleLogout}>
            Sign Out
          </a>
        </li>
      </ul>
    </div>
  );
}
