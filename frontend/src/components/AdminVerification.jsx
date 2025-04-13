import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaEnvelope, FaLock } from 'react-icons/fa';
import backgroundImage from '../assets/backgr.webp'; // Make sure this path matches your file location

const AdminVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationData, setVerificationData] = useState({
    email: location.state?.email || '',
    code: ''
  });
  const [message, setMessage] = useState(location.state?.message || 'Please enter the verification code sent to your email.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If this component is loaded without an email (e.g., direct URL access)
    // show a message but don't automatically redirect
    if (!location.state?.email) {
      setMessage('Please enter your email and the verification code you received.');
    }
  }, [location.state]);

  const handleChange = (e) => {
    setVerificationData({
      ...verificationData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verificationData.email || !verificationData.code) {
      setError('Please enter both email and verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-admin-registration`,
        verificationData
      );

      console.log('Verification response:', response.data);

      setSuccess(true);
      setMessage('Verification successful! Redirecting to dashboard...');

      // Store the token if it's in the response
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err.response?.data);
      setError(err.response?.data?.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for the entire screen */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Main container with glass effect */}
      <div className="w-full max-w-6xl overflow-hidden rounded-xl shadow-lg bg-gray-900 bg-opacity-70 backdrop-blur-sm flex z-10 relative">
        {/* Left side - Hero section */}
        <div className="w-1/2 p-10 flex flex-col justify-center relative hidden md:flex">
          <div className="mb-12">
            <div className="text-white font-bold text-2xl">
              <span className="text-blue-500">Travel</span>zo
            </div>
          </div>
          
          <div className="text-white mb-10">
            <h2 className="text-3xl font-bold mb-2">ADMIN ACCESS</h2>
            <h1 className="text-5xl font-bold mb-2">Complete your</h1>
            <h1 className="text-5xl font-bold mb-2">
              verification with <span className="text-blue-400">Boksy</span>
            </h1>
            <h1 className="text-5xl font-bold mb-6">Admin Portal</h1>
            
            <p className="text-sm text-gray-300 mb-8">
              Enter the verification code sent to your email to activate your admin account and access the full dashboard.
            </p>
            
            <div className="flex space-x-4">
              <button className="px-6 py-2 border border-white text-white rounded-full hover:bg-white hover:text-gray-900 transition duration-300">
                <a href="/HomePage" className="font-medium">Browse destinations</a>
              </button>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300">
                Need help?
              </button>
            </div>
          </div>
        </div>
        
        {/* Right side - Verification form */}
        <div className="w-full md:w-1/2 bg-gray-900 bg-opacity-90 p-10 flex flex-col justify-center backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-white mb-4">
            Admin<br />Verification
          </h2>
          
          {!success && (
            <p className="text-gray-300 mb-8">
              {message}
            </p>
          )}
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <FaExclamationTriangle className="text-red-400 mt-1 mr-3" />
                <p>{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-100 p-6 rounded-lg mb-6">
              <div className="flex flex-col items-center justify-center text-center">
                <FaCheckCircle className="text-5xl text-green-400 mb-4" />
                <p className="text-lg font-medium mb-2">{message}</p>
                <div className="flex justify-center items-center space-x-4 mt-3">
                  <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse"></div>
                  <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse delay-100"></div>
                  <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
                value={verificationData.email}
                onChange={handleChange}
                disabled={!!location.state?.email}
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <FaEnvelope />
              </div>
            </div>
            
            <div className="relative">
              <input
                id="code"
                name="code"
                type="text"
                required
                className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter verification code"
                value={verificationData.code}
                onChange={handleChange}
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <FaLock />
              </div>
            </div>
            
            <div className="text-center mt-8">
              <button
                type="submit"
                disabled={loading || success}
                className={`w-full bg-blue-500 text-white rounded-md py-3 font-medium ${
                  (loading || success) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
                } transition duration-300 flex items-center justify-center`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Account'
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-8">
            <p className="text-gray-400">
              Already verified?
              <a href="/login" className="text-blue-400 ml-1 hover:underline">
                Log in
              </a>
            </p>
          </div>
          
          <div className="text-center mt-4">
            <a href="/signup" className="text-blue-400 text-sm hover:underline block">
              Need a new account?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVerification;