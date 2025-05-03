import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
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
import AboutUs from "./pages/AboutUs";
import ResetPassword from './pages/ResetPassword';
import AdminApprovalConfirmation from './pages/AdminApprovalConfirmation';
import TermsOfService from "./components/termsOfservice";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceNotice from "./components/MaintenanceNotice";

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
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [completionTime, setCompletionTime] = useState(null);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);
  const [showMaintenanceNotice, setShowMaintenanceNotice] = useState(false);
  const location = useLocation();

  // Check if we're on a page that should bypass maintenance mode check
  const isLoginPage = location.pathname === '/login';
  const isMaintenancePage = location.pathname === '/maintenance';
  
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Always check maintenance status when app loads
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/maintenance-status`
        );
        
        // Skip setting maintenance mode for admins
        const userIsAdmin = isAdmin();
        
        if (response.data && response.data.maintenanceMode && !userIsAdmin) {
          setMaintenanceMode(true);
          setMaintenanceMessage(response.data.maintenanceMessage || '');
          setCompletionTime(response.data.completionTime);
          
          // Show notice only to logged-in non-admin users
          if (isAuthenticated) {
            setShowMaintenanceNotice(true);
          }
        } else {
          setMaintenanceMode(false);
          setShowMaintenanceNotice(false);
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
        // Assume no maintenance mode if check fails
        setMaintenanceMode(false);
      } finally {
        setIsCheckingMaintenance(false);
      }
    };

    checkMaintenanceStatus();
  }, [isAuthenticated, isAdmin]);

  // If we're still checking maintenance status, render a loading state
  if (isCheckingMaintenance) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If maintenance mode is active and the user is not an admin
  if (maintenanceMode && !isAdmin() && !isLoginPage && !isMaintenancePage) {
    // For non-authenticated users, show the maintenance page
    if (!isAuthenticated) {
      return <MaintenancePage />;
    }
    
    // For authenticated non-admin users, show their content with a notice banner
    if (showMaintenanceNotice) {
      return (
        <>
          <div className="fixed inset-x-0 top-0 z-50 p-4">
            <MaintenanceNotice 
              message={maintenanceMessage} 
              completionTime={completionTime}
              onClose={() => setShowMaintenanceNotice(false)}
            />
          </div>
          <div className="pt-24">
            <MainContent />
          </div>
        </>
      );
    }
  }

  // Normal app rendering
  return <MainContent />;
}

// Separate the routes into their own component for clarity
function MainContent() {
  return (
    <Routes>
      <Route path="/maintenance" element={<MaintenancePage />} />
      
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
      <Route path="/about-us" element={<AboutUs />} />
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
