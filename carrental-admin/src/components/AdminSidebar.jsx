import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function AdminSidebar({ isOpen }) {
  const location = useLocation();

  const isBrandsActive = location.pathname.includes('brand');
  const isVehiclesActive = location.pathname.includes('vehic');

  const [brandsOpen, setBrandsOpen] = useState(isBrandsActive);
  const [vehiclesOpen, setVehiclesOpen] = useState(isVehiclesActive);

  return (
    <nav className={`ts-sidebar ${isOpen ? 'menu-open' : ''}`}>
      <ul className="ts-sidebar-menu">
        <li className="ts-label">Main</li>
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-dashboard"></i> Dashboard
          </NavLink>
        </li>

        {/* Brands Dropdown */}
        <li className={brandsOpen ? 'open' : ''}>
          <div className="more" onClick={() => setBrandsOpen(!brandsOpen)}>
            <i className={`fa ${brandsOpen ? 'fa-angle-up' : 'fa-angle-down'}`}></i>
          </div>
          <a
            href="#"
            className="parent"
            onClick={(e) => {
              e.preventDefault();
              setBrandsOpen(!brandsOpen);
            }}
          >
            <i className="fa fa-files-o"></i> Brands
          </a>
          <ul style={{ display: brandsOpen ? 'block' : 'none' }}>
            <li>
              <NavLink to="/create-brand" className={({ isActive }) => (isActive ? 'active' : '')}>
                Create Brand
              </NavLink>
            </li>
            <li>
              <NavLink to="/manage-brands" className={({ isActive }) => (isActive ? 'active' : '')}>
                Manage Brands
              </NavLink>
            </li>
          </ul>
        </li>

        {/* Vehicles Dropdown */}
        <li className={vehiclesOpen ? 'open' : ''}>
          <div className="more" onClick={() => setVehiclesOpen(!vehiclesOpen)}>
            <i className={`fa ${vehiclesOpen ? 'fa-angle-up' : 'fa-angle-down'}`}></i>
          </div>
          <a
            href="#"
            className="parent"
            onClick={(e) => {
              e.preventDefault();
              setVehiclesOpen(!vehiclesOpen);
            }}
          >
            <i className="fa fa-sitemap"></i> Vehicles
          </a>
          <ul style={{ display: vehiclesOpen ? 'block' : 'none' }}>
            <li>
              <NavLink to="/post-vehicle" className={({ isActive }) => (isActive ? 'active' : '')}>
                Post a Vehicle
              </NavLink>
            </li>
            <li>
              <NavLink to="/manage-vehicles" className={({ isActive }) => (isActive ? 'active' : '')}>
                Manage Vehicles
              </NavLink>
            </li>
          </ul>
        </li>

        {/* Manage Booking */}
        <li>
          <NavLink to="/manage-bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-users"></i> Manage Booking
          </NavLink>
        </li>

        {/* Manage Payments */}
        <li>
          <NavLink to="/manage-payments" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-money"></i> Manage Payments
          </NavLink>
        </li>

        {/* Manage Contact Us Query */}
        <li>
          <NavLink to="/manage-contactusquery" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-desktop"></i> Manage Contact Us Query
          </NavLink>
        </li>

        {/* Reg Users */}
        <li>
          <NavLink to="/reg-users" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-users"></i> Reg Users
          </NavLink>
        </li>

        {/* Manage Pages */}
        <li>
          <NavLink to="/manage-pages" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-files-o"></i> Manage Pages
          </NavLink>
        </li>

        {/* Update Contact Info */}
        <li>
          <NavLink to="/update-contactinfo" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-files-o"></i> Update Contact Info
          </NavLink>
        </li>

        {/* Manage Subscribers */}
        <li>
          <NavLink to="/manage-subscribers" className={({ isActive }) => (isActive ? 'active' : '')}>
            <i className="fa fa-table"></i> Manage Subscribers
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
