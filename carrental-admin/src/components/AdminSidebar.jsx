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
} from 'lucide-react';

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();

  const isBrandsActive = location.pathname.includes('brand');
  const isVehiclesActive = location.pathname.includes('vehic') || location.pathname.includes('change-image');

  const [brandsOpen, setBrandsOpen] = useState(isBrandsActive);
  const [vehiclesOpen, setVehiclesOpen] = useState(isVehiclesActive);

  const linkClass = ({ isActive }) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition no-underline ${
      isActive
        ? 'bg-lavender-50 text-lavender-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`;

  const subLinkClass = ({ isActive }) =>
    `w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12.5px] transition no-underline ${
      isActive
        ? 'bg-lavender-50 text-lavender-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`;

  return (
    <aside
      className={`ts-sidebar fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-[250px] bg-white border-r border-hairline overflow-y-auto px-3.5 py-5 transition-transform duration-200 shrink-0 ${
        isOpen ? 'translate-x-0 menu-open' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <ul className="ts-sidebar-menu space-y-6 list-none m-0 p-0">
        {/* Dashboards */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Main
          </div>
          <div className="space-y-1">
            <NavLink to="/dashboard" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                </>
              )}
            </NavLink>
          </div>
        </li>

        {/* Fleet & Operations */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Fleet & Operations
          </div>
          <div className="space-y-1">
            {/* Brands Dropdown */}
            <div>
              <a
                href="#"
                className="parent w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition no-underline"
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
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                    </>
                  )}
                </NavLink>
                <NavLink to="/manage-brands" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Manage Brands</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                    </>
                  )}
                </NavLink>
              </div>
            </div>

            {/* Vehicles Dropdown */}
            <div>
              <a
                href="#"
                className="parent w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition no-underline"
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
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                    </>
                  )}
                </NavLink>
                <NavLink to="/manage-vehicles" onClick={onClose} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span>Manage Vehicles</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                </>
              )}
            </NavLink>
          </div>
        </li>

        {/* Pages & Support */}
        <li>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            CMS & Support
          </div>
          <div className="space-y-1">
            <NavLink to="/manage-contactusquery" onClick={onClose} className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Manage Contact Us Query</span>
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
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
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lavender-600" />}
                </>
              )}
            </NavLink>
          </div>
        </li>
      </ul>
    </aside>
  );
}
