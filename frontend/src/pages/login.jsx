
import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaPaperPlane } from 'react-icons/fa';
import backgroundImage from '../assets/backgr.webp';
import { login as apiLogin } from '../api/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import axios from 'axios';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResetEmailSending, setIsResetEmailSending] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();


  useEffect(() => {
    if (location.state?.returnUrl) {
      setReturnUrl(location.state.returnUrl);
    }
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      setError('Please enter your email address');
      return;
    }
    
    setIsResetEmailSending(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/forgot-password`,
        { email: forgotPasswordEmail }
      );
      
      setSuccess('Password reset email sent. Please check your inbox.');

      setShowForgotPassword(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send password reset email');
    } finally {
      setIsResetEmailSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Login attempt with:', { email: formData.email });
      const response = await apiLogin(formData.email, formData.password, formData.rememberMe);
      console.log('Login response:', response);
      

      if (response.status === 'admin_pending' || 
          (response.requiresVerification && response.email && response.redirectTo)) {
        setError('Your admin account requires verification. Please check your email for the verification link.');
        setIsLoading(false);
        

        if (response.redirectTo) {
          setTimeout(() => {
            navigate(response.redirectTo, { 
              state: { 
                email: response.email,
                message: 'Please verify your admin account to continue.' 
              } 
            });
          }, 2000);
        }
        return;
      }
      

      if (!response.token || !response.user) {
        setError('Login successful but received incomplete user data. Please try again.');
        setIsLoading(false);
        return;
      }
      

      authLogin(response.user, response.token);
      setSuccess('Login successful! Redirecting...');
      

      if (returnUrl) {
        console.log('Redirecting to:', returnUrl);
        setTimeout(() => navigate(returnUrl, { replace: true }), 1000);
        return;
      }
      

      if (response.user.role === 'admin' || response.role === 'admin') {
        console.log('Redirecting admin user to dashboard');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      } else {
        console.log('Redirecting regular user to homepage');
        setTimeout(() => navigate('/homepage', { replace: true }), 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      

      if (error.response?.data?.status === 'admin_pending' || 
          error.response?.data?.requiresVerification) {
        setError('Admin account verification required. Please check your email for a verification link.');
        

        setShowResendVerification(true);
      } else {
        setError(error.response?.data?.message || error.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Please enter your email address to resend the verification link');
      return;
    }
    
    setIsResendingVerification(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/resend-admin-verification`, 
        { email: formData.email }
      );
      
      if (response.data.verificationLink) {
        setSuccess(`${response.data.message} Click the link below to verify your admin account.`);

        setFormData(prev => ({ ...prev, verificationLink: response.data.verificationLink }));
      } else {
        setSuccess(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setIsResendingVerification(false);
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
              <span className="text-blue-500">Boksy</span>
            </div>
          </div>
          
          <div className="text-white mb-10">
            <h2 className="text-3xl font-bold mb-2">WELCOME BACK</h2>
            <h1 className="text-5xl font-bold mb-2">Continue your</h1>
            <h1 className="text-5xl font-bold mb-2">
              journey with <span className="text-blue-400">Boksy</span>
            </h1>
            <h1 className="text-5xl font-bold mb-6">Explore the World</h1>
            
            <p className="text-sm text-gray-300 mb-8">
              Log in to access your saved travel plans and exclusive deals tailored just for you!
            </p>
            
            <div className="flex space-x-4">
              <button className="px-6 py-2 border border-white text-white rounded-full hover:bg-white hover:text-gray-900 transition duration-300">
                <a href="/HomePage" className="font-medium">Browse destinations</a>
              </button>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300">
                Special offers
              </button>
            </div>
          </div>
        </div>
        
        {/* Right side - Login form */}
        <div className="w-full md:w-1/2 bg-gray-900 bg-opacity-90 p-10 flex flex-col justify-center backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-white mb-8">
            {showForgotPassword ? 'Reset Password' : 'Welcome\nback'}
          </h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4">
              {error.includes('admin account') ? (
                <>
                  <p className="font-semibold mb-1">Admin Verification Required</p>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="mt-3 flex items-center justify-center text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded transition-colors"
                  >
                    {isResendingVerification ? 'Sending...' : (
                      <>
                        <FaPaperPlane className="mr-1.5" size={12} />
                        Resend Verification Email
                      </>
                    )}
                  </button>
                </>
              ) : (
                error
              )}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mb-4">
              <p>{success}</p>
              {formData.verificationLink && (
                <a 
                  href={formData.verificationLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block mt-2 hover:bg-blue-700 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Verify Admin Account
                </a>
              )}
            </div>
          )}
          
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="relative">
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md"
                  placeholder="Enter your email address"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <FaEnvelope />
                </div>
              </div>
              
              <div className="text-center mt-8">
                <button
                  type="submit"
                  disabled={isResetEmailSending}
                  className={`w-full bg-blue-500 text-white rounded-md py-3 font-medium ${
                    isResetEmailSending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
                  } transition duration-300`}
                >
                  {isResetEmailSending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md"
                  placeholder="Email address"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <FaEnvelope />
                </div>
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md"
                  placeholder="Password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400">
                    Remember me (stay logged in for 30 days)
                  </label>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotPasswordEmail(formData.email || '');
                  }}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              
              <div className="text-center mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-blue-500 text-white rounded-md py-3 font-medium ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
                  } transition duration-300`}
                >
                  {isLoading ? 'Logging in...' : 'Log In'}
                </button>
              </div>
            </form>
          )}
          
          {!showForgotPassword && (
            <>
              <div className="text-center mt-6">
                <p className="text-gray-400">
                  Don't have an account yet?
                  <a href="/signup" className="text-blue-400 ml-1 hover:underline">
                    Sign up
                  </a>
                </p>
              </div>
              
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <button 
                    type="button"
                    className="flex justify-center items-center py-2 px-4 border border-gray-700 rounded-md hover:bg-gray-800 transition duration-300"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex justify-center items-center py-2 px-4 border border-gray-700 rounded-md hover:bg-gray-800 transition duration-300"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex justify-center items-center py-2 px-4 border border-gray-700 rounded-md hover:bg-gray-800 transition duration-300"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;