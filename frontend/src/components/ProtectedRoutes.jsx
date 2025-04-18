import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/authContext';


export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};


export const AdminRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  


  return user && user.role === 'admin' ? <Outlet /> : <Navigate to="/homepage" replace />;
};


export const ClientRoute = () => {
  const { isAuthenticated, user, loading } = useAuth();
  

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  


  return user && user.role !== 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default { ProtectedRoute, AdminRoute, ClientRoute }; 