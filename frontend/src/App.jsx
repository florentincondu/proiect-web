import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Signup from "./pages/signup";
import HomePage from "./pages/HomePage";
import PopularHotelsPage from "./pages/popularhotels";
import HotelDetailPage from "./pages/HotelDetailPage";
import SearchResults from "./pages/searchLodge";
import HotelSearchResults from "./pages/SearchResults";
import ProfilePage from './pages/ProfilePage';
import VerifyAdmin from './pages/VerifyAdmin';
import AdminDashboard from "./pages/adminDashboard";
import AdminVerification from './pages/AdminVerification';
import AdminRequestApproval from './components/AdminRequestApproval';
import { ProtectedRoute, AdminRoute, ClientRoute } from './components/ProtectedRoutes';
import BookingFlow from "./pages/BookingFlow";
import MyBookings from "./pages/MyBookings";
import NotificationsPage from './pages/NotificationsPage';
import { useAuth } from './context/authContext';
import ContactUs from "./pages/ContactUs";
import ResetPassword from './pages/ResetPassword';

const HotelRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-admin" element={<AdminVerification />} />
      <Route path="/verify-admin-link" element={<VerifyAdmin />} />
      <Route path="/admin/approve/:requestId" element={<AdminRequestApproval action="approve" />} />
      <Route path="/admin/reject/:requestId" element={<AdminRequestApproval action="reject" />} />
      
      {/* Public/Guest routes for viewing hotels - with special handling for hotel details */}
      <Route path="/homepage" element={<HomePage />} />
      <Route path="/popularhotels" element={<PopularHotelsPage />} />
      <Route path="/search-results" element={<SearchResults />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="/hotel-search-results" element={<HotelSearchResults />} />
      <Route path="/hotel/:hotelId" element={
        <HotelRoute>
          <HotelDetailPage />
        </HotelRoute>
      } />
      
      {/* Routes for admin users only */}
      <Route element={<AdminRoute />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard/*" element={<AdminDashboard />} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {/* Routes for any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/booking" element={<BookingFlow />} />
        <Route path="/reserve/:hotelId" element={
          <HotelRoute>
            <HotelDetailPage reservationMode={true} />
          </HotelRoute>
        } />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      
      {/* Add ResetPassword route */}
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Redirect to appropriate page based on role */}
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;