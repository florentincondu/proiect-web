import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import AdminApprovalConfirmation from './pages/AdminApprovalConfirmation';
import TermsOfService from "./components/termsOfservice";


const AdminApprovalHandler = () => {
  const location = useLocation();
  return <AdminApprovalConfirmation />;
};

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
      {}
      <Route path="/admin/approve" element={<AdminApprovalConfirmation />} />
      <Route path="/admin/reject" element={<AdminApprovalConfirmation />} />
      <Route path="/admin/approve-admin-request" element={<AdminApprovalConfirmation />} />
      <Route path="/admin/reject-admin-request" element={<AdminApprovalConfirmation />} />
      {}
      <Route path="/admin/*" element={<AdminApprovalHandler />} />
      <Route path="/admin-approval-success" element={<AdminApprovalConfirmation />} />
      <Route path="/admin-rejection-success" element={<AdminApprovalConfirmation />} />
      
      {}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-admin" element={<VerifyAdmin />} />
      <Route path="/admin-verification" element={<AdminVerification />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {}
      <Route path="/homepage" element={<HomePage />} />
      <Route path="/popularhotels" element={<PopularHotelsPage />} />
      <Route path="/search-results" element={<SearchResults />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/hotel-search-results" element={<HotelSearchResults />} />
      <Route path="/hotel/:hotelId" element={
        <HotelRoute>
          <HotelDetailPage />
        </HotelRoute>
      } />
      
      {}
      <Route element={<AdminRoute />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard/*" element={<AdminDashboard />} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {}
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
      
      {}
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
