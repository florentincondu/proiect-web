import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner, FaPaperPlane } from 'react-icons/fa';

const VerifyAdmin = () => {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(''); // '' (none), 'sending', 'success', 'error'
  const [resendMessage, setResendMessage] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyAdminAccount = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const emailParam = params.get('email');
        
        setEmail(emailParam || '');

        if (!token || !emailParam) {
          setStatus('error');
          setMessage('Invalid verification link. Missing token or email.');
          return;
        }

        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-admin`;
        
        const response = await axios.get(`${apiUrl}?token=${token}&email=${emailParam}`);
        
        setStatus('success');
        setMessage(response.data.message || 'Your admin account has been successfully verified. You can now log in.');
        
        // Automatically redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Failed to verify admin account. The verification link may be invalid or expired.'
        );
        console.error('Admin verification error:', error);
      }
    };

    verifyAdminAccount();
  }, [location.search, navigate]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendVerification = async () => {
    // If we have the email from the URL, use it
    const emailToUse = email || resendEmail;
    
    if (!emailToUse) {
      setResendStatus('error');
      setResendMessage('Please enter your email address');
      return;
    }
    
    setResendStatus('sending');
    setResendMessage('');
    setVerificationLink('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/resend-admin-verification`, 
        { email: emailToUse }
      );
      
      setResendStatus('success');
      
      if (response.data.verificationLink) {
        setResendMessage('Verification link generated. Please click the link below to verify your admin account:');
        setVerificationLink(response.data.verificationLink);
      } else {
        setResendMessage(response.data.message || 'Verification email has been sent. Please check your inbox.');
      }
    } catch (error) {
      setResendStatus('error');
      setResendMessage(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-2xl font-bold text-center mb-6">Admin Verification</h1>
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {status === 'loading' && (
            <>
              <FaSpinner className="animate-spin text-5xl text-blue-500" />
              <p className="text-lg text-center">Verifying your admin account...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <FaCheckCircle className="text-6xl text-green-500 mb-2" />
              <h2 className="text-xl font-semibold text-center">Verification Successful!</h2>
              <p className="text-center">{message}</p>
              <button
                onClick={handleGoToLogin}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Go to Login
              </button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <FaExclamationTriangle className="text-6xl text-red-500 mb-2" />
              <h2 className="text-xl font-semibold text-center">Verification Failed</h2>
              <p className="text-center">{message}</p>
              
              {/* Resend verification section */}
              <div className="mt-4 w-full">
                <p className="text-sm text-center mb-4">
                  If your verification link has expired, you can request a new one:
                </p>
                <div className="space-y-3">
                  {!email && (
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  <button
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendStatus === 'sending' ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="mr-2" />
                        Resend Verification Email
                      </>
                    )}
                  </button>
                  
                  {resendStatus === 'success' && (
                    <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mt-3">
                      <p>{resendMessage}</p>
                      {verificationLink && (
                        <a 
                          href={verificationLink}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block mt-2 hover:bg-blue-700 transition-colors"
                        >
                          Verify Admin Account
                        </a>
                      )}
                    </div>
                  )}
                  
                  {resendStatus === 'error' && (
                    <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mt-3">
                      {resendMessage}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-700 w-full my-4 pt-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Go to Sign Up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyAdmin;
