import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="ts-main-content">
        <AdminSidebar isOpen={sidebarOpen} />
        <div className="content-wrapper">
          <div className="container-fluid">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
