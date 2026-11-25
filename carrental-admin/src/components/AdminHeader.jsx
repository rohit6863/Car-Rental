import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Maximize2,
  Minimize2,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';

export default function AdminHeader({ onToggleSidebar }) {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();

  const [accountOpen, setAccountOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsData, setAlertsData] = useState({ totalCount: 0, alerts: [] });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const accountRef = useRef(null);
  const alertsRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      try {
        const res = await client.get('/api/admin/alerts');
        if (active && res.data) {
          setAlertsData(res.data);
        }
      } catch {
        // fail gracefully
      }
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
        setAlertsOpen(false);
      }
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    setAccountOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="no-print sticky top-0 z-40 h-16 bg-white dark:bg-[#141416] border-b border-hairline dark:border-[#27272A] px-4 lg:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <div className="brand flex items-center lg:w-[216px]">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-slate-900 dark:text-zinc-100 no-underline focus:outline-none"
          >
            <div className="p-0.5 rounded-lg bg-white border border-hairline dark:border-[#27272A] shrink-0 shadow-xs">
              <img
                src="/img/logo.JPG"
                alt="WanderWheels"
                className="w-8 h-8 rounded-md object-cover block"
              />
            </div>
            <span className="font-extrabold text-[16px] tracking-tight text-slate-900 dark:text-zinc-100 whitespace-nowrap">
              Wander<span className="text-rose-600 dark:text-rose-500">Wheels</span>
              <span className="hidden xl:inline text-[11px] font-semibold text-slate-400 dark:text-zinc-500 ml-1.5">
                | Admin Panel
              </span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
          title="Toggle Sidebar"
          className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1C1C1F] transition cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative ml-1">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fleet, bookings, plates..."
            aria-label="Global Admin Search"
            className="w-56 lg:w-72 bg-slate-50 dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:bg-white dark:focus:bg-[#1C1C1F] focus:border-lavender-600 dark:focus:border-amber-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Utility Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Prominent Light / Dark Pill Switch */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          data-testid="admin-theme-toggle"
          className="relative inline-flex items-center h-9 px-1 rounded-full bg-slate-100 dark:bg-[#1C1C1F] border border-hairline dark:border-[#27272A] cursor-pointer transition-all hover:border-indigo-400 dark:hover:border-amber-500 select-none"
        >
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              !isDark
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Light</span>
          </span>
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              isDark
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dark</span>
          </span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            onClick={() => {
              setAlertsOpen((prev) => !prev);
              setAccountOpen(false);
            }}
            aria-label="Fleet Alerts"
            aria-expanded={alertsOpen}
            className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1C1C1F] relative transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {alertsData.totalCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#141416] absolute top-1.5 right-1.5" />
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#141416] border border-hairline dark:border-[#27272A] rounded-xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-hairline dark:border-[#27272A]">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Fleet &amp; Operations Alerts</span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-amber-400 bg-indigo-50 dark:bg-amber-500/15 px-2 py-0.5 rounded-full tabular-nums">
                  {alertsData.totalCount} Open
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-[#27272A] mt-1 max-h-72 overflow-y-auto text-xs">
                {alertsData.alerts.length === 0 ? (
                  <div className="py-5 text-center text-slate-400 dark:text-zinc-500">All operations caught up</div>
                ) : (
                  alertsData.alerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        setAlertsOpen(false);
                        navigate(alert.route);
                      }}
                      className="w-full text-left py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] rounded-lg cursor-pointer transition"
                    >
                      <p className="font-semibold text-slate-800 dark:text-zinc-100">{alert.title}</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[11px] mt-0.5">{alert.subtitle}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label="Toggle Fullscreen"
          className="hidden sm:flex p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1C1C1F] transition cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Quick Settings Gear */}
        <Link
          to="/update-contactinfo"
          title="Contact & Helpline Settings"
          aria-label="Contact Settings"
          className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1C1C1F] transition"
        >
          <Settings className="w-4 h-4" />
        </Link>

        <div className="h-5 w-px bg-slate-200 dark:bg-[#27272A] mx-1" />

        {/* Admin Account Dropdown */}
        <div className="ts-account relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => {
              setAccountOpen((prev) => !prev);
              setAlertsOpen(false);
            }}
            aria-expanded={accountOpen}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1C1C1F] border border-transparent hover:border-hairline dark:hover:border-[#27272A] transition cursor-pointer"
          >
            <img
              src="/img/admin-avatar.svg"
              className="w-8 h-8 rounded-full border border-hairline dark:border-[#27272A] bg-indigo-50 dark:bg-[#1C1C1F]"
              alt="Admin"
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-tight">Account</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Fleet Ops</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          </button>

          {accountOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#141416] border border-hairline dark:border-[#27272A] rounded-xl shadow-xl p-1.5 z-50 text-xs">
              <Link
                to="/change-password"
                onClick={() => setAccountOpen(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] font-medium flex items-center gap-2 no-underline"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                <span>Change Password</span>
              </Link>
              <div className="my-1 border-t border-slate-100 dark:border-[#27272A]" />
              <a
                href="#logout"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold flex items-center gap-2 no-underline"
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
