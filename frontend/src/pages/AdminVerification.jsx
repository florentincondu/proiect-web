import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/authContext';
import { FaLock, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaEnvelope } from 'react-icons/fa';
import { verifyAdminCode } from '../api/auth';
import { Link } from 'react-router-dom';
import { TokenService } from '../api/auth';

const AdminVerification = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const queryParams = new URLSearchParams(location.search);
  const tokenParam = queryParams.get('token');
  const emailParam = queryParams.get('email');

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
    
    if (emailParam) {
      setEmail(emailParam);
    } else if (location.state?.email) {
      setEmail(location.state.email);
    }


    if (tokenParam) {
      checkVerificationStatus(tokenParam);
    } else if (emailParam) {

      checkVerificationStatusByEmail(emailParam);
    }
  }, [location]);

  const checkVerificationStatus = async (verificationToken) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/admin-approval/status?token=${verificationToken}`
      );
      

      if (response.data.adminVerified) {
        setSuccess('Your admin account is already verified.');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
      

      if (response.data.verificationPending) {
        setSuccess('Your admin request has been approved. Please enter the verification code sent to your email.');
      }
      

      if (response.data.adminApproved && !response.data.verificationPending) {
        setSuccess('Your admin request has been approved, but it seems you haven\'t received the verification code yet. You can request to resend it.');
      }
      

      if (response.data.email && !email) {
        setEmail(response.data.email);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setError('Could not verify your account status. Please try again.');
    }
  };

  const checkVerificationStatusByEmail = async (userEmail) => {
    try {

      const response = await axios.post(
        `${API_URL}/api/admin-approval/resend-code`,
        { email: userEmail }
      );
      

      if (response.data.success) {
        setSuccess('A verification code has been sent to your email. Please check your inbox.');
      }
    } catch (error) {
      console.error('Error checking verification by email:', error);
      setError('Could not verify your account status. Please try again or contact support.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log(`Attempting verification with token: ${token}, code: ${verificationCode}, email: ${email}`);
      

      const response = await verifyAdminCode(token || '', verificationCode, email);
      
      if (response.success) {
        console.log('Verification successful:', response);
        if (response.token && response.user) {

          TokenService.setToken(response.token);
          TokenService.setUser(response.user);
        }
        

        console.log('Redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        setError(response.message || 'Verification failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!token && !email) {
      setError('Unable to resend verification code. Missing token or email.');
      return;
    }
    
    setResending(true);
    setError('');
    
    try {

      const response = await axios.post(`${API_URL}/api/admin-approval/resend-code`, {
        token,
        email
      });
      
      setSuccess('Verification code has been resent to your email. Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification code:', error);
      setError(error.response?.data?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };


  useEffect(() => {
    if (!token && !email) {
      setError('Missing verification parameters. Please check your verification link or enter your email below.');
    } else {
      setError('');
    }
  }, [token, email]);

  useEffect(() => {
    if (success === true) {

      console.log('Success state is true, redirecting to dashboard immediately');
      navigate('/dashboard', { replace: true });
    }
  }, [success, navigate]);

  if (success === true) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-white text-center">
          <FaCheckCircle className="mx-auto text-green-500 text-6xl mb-4" />
          <h2 className="text-2xl font-bold mb-4">Verification Successful!</h2>
          <p className="text-gray-300 mb-6">
            Your admin account has been successfully verified. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <FaSpinner className="text-blue-500 text-xl animate-spin" />
          </div>
        </div>
      </div>
    );
  }

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
          {email && (
            <p className="text-blue-400 mt-1 text-sm">
              <FaEnvelope className="inline mr-1" /> {email}
            </p>
          )}
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
        
        {/* Add email input if email is missing */}
        {!email && (
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              required
            />
            <button
              onClick={() => {
                if (email) checkVerificationStatusByEmail(email);
              }}
              disabled={!email || loading}
              className="mt-2 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Verification Code
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <button
            onClick={handleResendCode}
            disabled={resending}
            className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center mx-auto mb-4"
          >
            {resending ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Resending code...
              </>
            ) : (
              <>
                <FaEnvelope className="mr-2" />
                Didn't receive the code? Resend it
              </>
            )}
          </button>
          
          <a 
            href="/login"
            className="text-gray-400 hover:text-gray-300 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminVerification; 