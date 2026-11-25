import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ active }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  const navItems = [
    { id: 'profile', label: 'Profile Settings', to: '/profile', icon: 'fa-user-gear' },
    { id: 'password', label: 'Update Password', to: '/update-password', icon: 'fa-key' },
    { id: 'booking', label: 'My Booking', to: '/my-booking', icon: 'fa-calendar-check' },
  ];

  return (
    <aside className="profile_nav w-full">
      <div className="surface-card bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
        
        {/* User Card Header */}
        <div className="pb-4 mb-4 border-b border-slate-200 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <i className="fa-solid fa-user text-brand-red"></i>
          </div>
          <div className="overflow-hidden">
            <p className="text-adaptive-main font-display font-bold text-sm text-slate-900 truncate">
              {user?.fullname || user?.FullName || 'Account Settings'}
            </p>
            <p className="text-adaptive-sub text-xs text-slate-500 truncate">
              {user?.email || 'Manage your account'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <ul className="space-y-1.5 text-xs font-bold uppercase tracking-wider">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id} className={isActive ? 'active' : ''}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand-red text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          
          <li className="pt-2 mt-2 border-t border-slate-200">
            <a
              href="#logout"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-all font-bold"
            >
              <i className="fa-solid fa-right-from-bracket text-sm text-rose-500"></i>
              <span>Sign Out</span>
            </a>
          </li>
        </ul>

      </div>
    </aside>
  );
}
