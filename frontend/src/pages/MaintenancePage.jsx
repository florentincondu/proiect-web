import React, { useState, useEffect } from 'react';
import { FaTools, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { Link } from 'react-router-dom';

const MaintenancePage = () => {
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    message: 'We are currently performing scheduled maintenance.',
    completionTime: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [adminLoginModal, setAdminLoginModal] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/maintenance-status`
        );
        if (response.data) {
          setMaintenanceInfo({
            message: response.data.maintenanceMessage || maintenanceInfo.message,
            completionTime: response.data.completionTime
          });
        }
      } catch (error) {
        console.error('Error fetching maintenance status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceStatus();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/login`,
        loginCredentials
      );

      if (response.data && response.data.token) {
        // Save auth token
        localStorage.setItem('token', response.data.token);

        // Save user info
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Redirect to dashboard if admin
        if (response.data.user && response.data.user.role === 'admin') {
          window.location.href = '/dashboard';
        } else {
          setLoginError('Only administrators can access during maintenance mode.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const formattedTime = maintenanceInfo.completionTime 
    ? new Date(maintenanceInfo.completionTime).toLocaleString() 
    : null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="text-yellow-400 text-7xl">
              <FaTools />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-white mb-4">
            Site Under Maintenance
          </h1>

          {isLoading ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : (
            <div className="text-center mb-8">
              <p className="text-gray-300 text-lg mb-4">
                {maintenanceInfo.message}
              </p>
              
              {formattedTime && (
                <div className="flex items-center justify-center text-blue-300 mt-6">
                  <FaClock className="mr-2" /> 
                  <span>Expected to be back online by {formattedTime}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="text-yellow-500 mr-3 mt-1">
                <FaExclamationTriangle />
              </div>
              <div>
                <p className="text-yellow-100 text-sm">
                  We apologize for any inconvenience this may cause. Our team is working hard to improve your experience.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setAdminLoginModal(true)}
              className="text-sm text-gray-400 hover:text-blue-400 underline transition-colors"
            >
              Administrator Login
            </button>
          </div>
        </div>
      </div>

      {/* Admin Login Modal */}
      {adminLoginModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Administrator Login</h2>
            
            {loginError && (
              <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4">
                {loginError}
              </div>
            )}
            
            <form onSubmit={handleAdminLogin}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full bg-gray-700 rounded border border-gray-600 p-2 text-white"
                  value={loginCredentials.email}
                  onChange={(e) => setLoginCredentials({...loginCredentials, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full bg-gray-700 rounded border border-gray-600 p-2 text-white"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAdminLoginModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center disabled:opacity-50"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage; 