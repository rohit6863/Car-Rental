import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';

// Admin Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminChangePasswordPage from './pages/AdminChangePasswordPage';
import AdminCreateBrandPage from './pages/AdminCreateBrandPage';
import AdminManageBrandsPage from './pages/AdminManageBrandsPage';
import AdminEditBrandPage from './pages/AdminEditBrandPage';
import AdminPostVehiclePage from './pages/AdminPostVehiclePage';
import AdminManageVehiclesPage from './pages/AdminManageVehiclesPage';
import AdminEditVehiclePage from './pages/AdminEditVehiclePage';
import AdminChangeImagePage from './pages/AdminChangeImagePage';
import AdminManageBookingsPage from './pages/AdminManageBookingsPage';
import AdminManagePaymentsPage from './pages/AdminManagePaymentsPage';
import AdminManageContactUsQueryPage from './pages/AdminManageContactUsQueryPage';
import AdminRegUsersPage from './pages/AdminRegUsersPage';
import AdminManagePagesPage from './pages/AdminManagePagesPage';
import AdminUpdateContactInfoPage from './pages/AdminUpdateContactInfoPage';
import AdminManageSubscribersPage from './pages/AdminManageSubscribersPage';
import AdminMaintenancePage from './pages/AdminMaintenancePage';
import AdminPricingPage from './pages/AdminPricingPage';
import AdminTelematicsPage from './pages/AdminTelematicsPage';

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<AdminLoginPage />} />

      {/* Protected Admin Routes */}
      <Route
        path="/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminDashboardPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangePasswordPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/create-brand"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminCreateBrandPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-brands"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageBrandsPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/edit-brand/:id"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminEditBrandPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/edit-brand"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminEditBrandPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/post-vehicle"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminPostVehiclePage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-vehicles"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageVehiclesPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/edit-vehicle/:id"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminEditVehiclePage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/edit-vehicle"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminEditVehiclePage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/change-image/:id/:num"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/changeimage1"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage fixedNum={1} />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/changeimage2"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage fixedNum={2} />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/changeimage3"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage fixedNum={3} />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/changeimage4"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage fixedNum={4} />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/changeimage5"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminChangeImagePage fixedNum={5} />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-bookings"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageBookingsPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-payments"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManagePaymentsPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-contactusquery"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageContactUsQueryPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/manage-conactusquery"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageContactUsQueryPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/reg-users"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminRegUsersPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-pages"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManagePagesPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/update-contactinfo"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminUpdateContactInfoPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/manage-subscribers"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminManageSubscribersPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/maintenance"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminMaintenancePage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/pricing"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminPricingPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/telematics"
        element={
          <AdminProtectedRoute>
            <AdminLayout>
              <AdminTelematicsPage />
            </AdminLayout>
          </AdminProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
