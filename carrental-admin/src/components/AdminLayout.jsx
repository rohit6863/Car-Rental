import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FE] dark:bg-[#0C0C0E] transition-colors">
      <AdminHeader onToggleSidebar={handleToggleSidebar} />
      <div className="ts-main-content flex-1 flex relative">
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="no-print fixed inset-0 z-20 bg-black/50 backdrop-blur-[1px] lg:hidden"
            aria-hidden="true"
          />
        )}
        <AdminSidebar
          isOpen={mobileOpen}
          desktopCollapsed={desktopCollapsed}
          onClose={() => setMobileOpen(false)}
        />
        <main className="content-wrapper flex-1 min-w-0 p-4 sm:p-6 lg:p-7">
          <div className="max-w-[1560px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
