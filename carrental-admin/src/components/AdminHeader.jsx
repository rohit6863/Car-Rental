import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminHeader({ onToggleSidebar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    setAccountOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-hairline px-4 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="brand flex items-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-slate-900 no-underline focus:outline-none"
          >
            <img
              src="/img/logo.JPG"
              alt="WanderWheels"
              className="w-9 h-9 rounded-lg object-cover border border-hairline shrink-0"
            />
            <span className="font-extrabold text-[17px] tracking-tight text-slate-900 whitespace-nowrap">
              Wander<span className="text-rose-600">Wheels</span>
              <span className="hidden sm:inline text-xs font-semibold text-slate-400 ml-2">
                | Fleet Ops
              </span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Session
        </span>

        <div className="ts-account relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            aria-expanded={accountOpen}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-hairline transition cursor-pointer"
          >
            <img
              src="/img/admin-avatar.svg"
              className="w-8 h-8 rounded-full border border-hairline bg-indigo-50"
              alt="Admin"
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">Account</div>
              <div className="text-[11px] text-slate-500 leading-tight">Fleet Operations</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {accountOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-hairline rounded-xl shadow-lg p-1.5 z-50 text-xs">
              <Link
                to="/change-password"
                onClick={() => setAccountOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 no-underline"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Change Password</span>
              </Link>
              <div className="my-1 border-t border-slate-100"></div>
              <a
                href="#logout"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 no-underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
