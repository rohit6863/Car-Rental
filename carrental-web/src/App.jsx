import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import CarListingPage from './pages/CarListingPage';
import VehicleDetailsPage from './pages/VehicleDetailsPage';
import CmsPage from './pages/CmsPage';
import ContactUsPage from './pages/ContactUsPage';
import ProfilePage from './pages/ProfilePage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import MyBookingPage from './pages/MyBookingPage';
import ReceiptPage from './pages/ReceiptPage';

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/index.php" element={<HomePage />} />
      <Route path="/car-listing" element={<CarListingPage />} />
      <Route path="/car-listing.php" element={<CarListingPage />} />
      <Route path="/search-carresult" element={<CarListingPage />} />
      <Route path="/search-carresult.php" element={<CarListingPage />} />
      <Route path="/vehical-details/:id" element={<VehicleDetailsPage />} />
      <Route path="/vehical-details.php" element={<VehicleDetailsPage />} />
      <Route path="/page/:type" element={<CmsPage />} />
      <Route path="/page.php" element={<CmsPage />} />
      <Route path="/contact-us" element={<ContactUsPage />} />
      <Route path="/contact-us.php" element={<ContactUsPage />} />

      {/* Customer Protected Pages */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile.php"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/update-password"
        element={
          <ProtectedRoute>
            <UpdatePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/update-password.php"
        element={
          <ProtectedRoute>
            <UpdatePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-booking"
        element={
          <ProtectedRoute>
            <MyBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-booking.php"
        element={
          <ProtectedRoute>
            <MyBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipt/:bookingId"
        element={
          <ProtectedRoute>
            <ReceiptPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate-receipt.php"
        element={
          <ProtectedRoute>
            <ReceiptPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
