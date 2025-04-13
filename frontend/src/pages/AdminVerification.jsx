import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/authContext';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

const AdminVerification = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract email from location state if available
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !verificationCode) {
      setError('Please enter both email and verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-admin-registration`, 
        { email, code: verificationCode }
      );
      
      setSuccess('Verification successful!');
      
      // If we receive a token and user data, log in the user automatically
      if (response.data.token && response.data.user) {
        // Store the user data and token
        login(response.data.user, response.data.token);
        
        // Log the user data for debugging
        console.log('User data stored:', response.data.user);
        
        // Redirect to admin dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        // If no token, redirect to login
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <FaLock className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Admin Verification</h1>
          <p className="text-gray-400 mt-2">
            Enter the verification code that was sent to your email
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4 flex items-start">
            <FaExclamationTriangle className="text-red-400 mt-1 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mb-4 flex items-start">
            <FaCheckCircle className="text-green-400 mt-1 mr-2 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
              disabled={location.state?.email}
            />
          </div>
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-400 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter verification code"
              maxLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Admin Account'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <a 
            href="/login"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminVerification; 