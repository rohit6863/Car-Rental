import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AdminHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="ts-main-content flex-1 flex relative">
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden"
            aria-hidden="true"
          />
        )}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="content-wrapper flex-1 min-w-0 p-4 sm:p-6 lg:p-7">
          <div className="max-w-[1560px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
