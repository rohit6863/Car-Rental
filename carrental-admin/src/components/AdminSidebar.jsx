import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Award,
  Car,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Users,
  FileText,
  Headphones,
  Mail,
  ChevronDown,
  Wrench,
  Sliders,
  MapPin,
} from 'lucide-react';

export default function AdminSidebar({ isOpen, desktopCollapsed, onClose }) {
  const location = useLocation();

  const isBrandsActive = location.pathname.includes('brand');
  const isVehiclesActive =
    location.pathname.includes('vehic') || location.pathname.includes('change-image');

  const [brandsOpen, setBrandsOpen] = useState(isBrandsActive);
  const [vehiclesOpen, setVehiclesOpen] = useState(isVehiclesActive);

  const linkClass = ({ isActive }) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition no-underline ${
      isActive
        ? 'bg-lavender-50 text-lavender-600 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-medium'
    }`;

  const subLinkClass = ({ isActive }) =>
    `w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition no-underline ${
      isActive
        ? 'bg-lavender-50 text-lavender-600 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-medium'
    }`;

  return (
    <aside
      className={`ts-sidebar no-print fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-[250px] bg-white dark:bg-slate-900 border-r border-hairline dark:border-slate-800 overflow-y-auto px-3.5 py-5 transition-all duration-200 shrink-0 ${
        isOpen ? 'translate-x-0 menu-open' : '-translate-x-full'
      } ${desktopCollapsed ? 'lg:hidden' : 'lg:translate-x-0'}`}
    >
      <ul className="ts-sidebar-menu space-y-6 list-none m-0 p-0">
        {/* Dashboards */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Dashboards
          </div>
          <div className="space-y-1">
            <NavLink to="/dashboard" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/telematics" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>Telematics &amp; GPS</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/pricing" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4" />
                    <span>Dynamic Pricing</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>
          </div>
        </li>

        {/* Fleet & Operations */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Fleet &amp; Ops
          </div>
          <div className="space-y-1">
            {/* Brands Dropdown */}
            <div>
              <a
                href="#"
                className="parent w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition no-underline"
                onClick={(e) => {
                  e.preventDefault();
                  setBrandsOpen(!brandsOpen);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-slate-400" />
                  <span>Brands</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    brandsOpen ? 'rotate-180' : ''
                  }`}
                />
              </a>
              <div className={`pl-8 pr-1 py-1 space-y-1 ${brandsOpen ? 'block' : 'hidden'}`}>
                <NavLink to="/create-brand" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Create Brand</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                    </>
                  )}
                </NavLink>
                <NavLink to="/manage-brands" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Manage Brands</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                    </>
                  )}
                </NavLink>
              </div>
            </div>

            {/* Vehicles Dropdown */}
            <div>
              <a
                href="#"
                className="parent w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition no-underline"
                onClick={(e) => {
                  e.preventDefault();
                  setVehiclesOpen(!vehiclesOpen);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span>Vehicles</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    vehiclesOpen ? 'rotate-180' : ''
                  }`}
                />
              </a>
              <div className={`pl-8 pr-1 py-1 space-y-1 ${vehiclesOpen ? 'block' : 'hidden'}`}>
                <NavLink to="/post-vehicle" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Post a Vehicle</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                    </>
                  )}
                </NavLink>
                <NavLink to="/manage-vehicles" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Manage Vehicles</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                    </>
                  )}
                </NavLink>
              </div>
            </div>

            <NavLink to="/manage-bookings" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Manage Booking</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/maintenance" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4" />
                    <span>Maintenance &amp; Service</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/manage-payments" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Manage Payments</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/reg-users" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>Reg Users</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>
          </div>
        </li>

        {/* Pages & Support */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
            Pages &amp; CMS
          </div>
          <div className="space-y-1">
            <NavLink to="/manage-contactusquery" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Manage Contact Us Query</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/manage-pages" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" />
                    <span>Manage Pages</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/update-contactinfo" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <Headphones className="w-4 h-4" />
                    <span>Update Contact Info</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>

            <NavLink to="/manage-subscribers" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4" />
                    <span>Manage Subscribers</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 dark:bg-indigo-400" />}
                </>
              )}
            </NavLink>
          </div>
        </li>
      </ul>
    </aside>
  );
}
