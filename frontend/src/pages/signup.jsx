import React, { useState } from 'react';
import '../styles/SignUp.css'; 
import { FaUser, FaEye, FaEyeSlash, FaEnvelope } from 'react-icons/fa';
import backgroundImage from '../assets/backgr.webp';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext'; // Import useAuth hook
import { signup as apiSignup } from '../api/auth';

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'client',
    subscriptionType: 'free'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Destructure login from useAuth to store the token and user

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerificationLink('');

    try {

      if (formData.role === 'admin') {
        setSuccess('Registering admin account. Your request will be sent to condurflorentin@gmail.com for approval.');
      }

      const data = await apiSignup(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password,
        formData.role,
        formData.subscriptionType
      );


      if (data.requiresVerification) {
        setSuccess(data.message);

        setSuccess('Admin registration request submitted. You will receive an email with a verification code when your request is approved by the administrator.');
        

        const userEmail = formData.email;
        

        setFormData({ 
          firstName: '', 
          lastName: '', 
          email: '', 
          password: '',
          role: 'client',
          subscriptionType: 'free'
        });
        

        setTimeout(() => {
          navigate('/admin-verification', { 
            state: { email: userEmail }
          });
        }, 2000);
        
        return;
      }


      if (data.token) {
        login(data.user, data.token);
        setSuccess('Registration successful!');
        

        setFormData({ 
          firstName: '', 
          lastName: '', 
          email: '', 
          password: '',
          role: 'client',
          subscriptionType: 'free'
        });
        

        setTimeout(() => navigate('/homepage'), 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || error.message || 'Registration failed. Please try again.');
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
      {/* Overlay pentru întregul ecran */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Containerul principal cu efect de sticlă */}
      <div className="w-full max-w-6xl overflow-hidden rounded-xl shadow-lg bg-gray-900 bg-opacity-70 backdrop-blur-sm flex z-10 relative">
        {/* Partea stângă - Hero section */}
        <div className="w-1/2 p-10 flex flex-col justify-center relative hidden md:flex">
          <div className="mb-12">
            <div className="text-white font-bold text-2xl">
              <span className="text-blue-500">Boksy</span>
            </div>
          </div>
          
          <div className="text-white mb-10">
            <h2 className="text-3xl font-bold mb-2">JOIN FOR FREE</h2>
            <h1 className="text-5xl font-bold mb-2">Unleash the traveler</h1>
            <h1 className="text-5xl font-bold mb-2">
              <span className="text-blue-400">inside YOU</span>, Enjoy your
            </h1>
            <h1 className="text-5xl font-bold mb-6">Dream Vacation</h1>
            
            <p className="text-sm text-gray-300 mb-8">
              Get started with the creation of travel itineraries tailored to your travel needs!
            </p>
            
            <div className="flex space-x-4">
              <button className="px-6 py-2 border border-white text-white rounded-full hover:bg-white hover:text-gray-900 transition duration-300">
                Explore more
              </button>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300">
                Book now
              </button>
            </div>
          </div>
        </div>
        
        {/* Partea dreaptă - Formular înregistrare */}
        <div className="w-full md:w-1/2 bg-gray-900 bg-opacity-90 p-10 flex flex-col justify-center backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-white mb-8">
            Create<br />new account
          </h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mb-4">
              {success}
              {verificationLink && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Please use this verification link:</p>
                  <a 
                    href={verificationLink}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block mt-2 hover:bg-blue-700 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Verify Admin Account
                  </a>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md"
                  placeholder="First name"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <FaUser />
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-gray-800 bg-opacity-80 text-white px-4 py-3 rounded-md"
                  placeholder="Last name"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <FaUser />
                </div>
              </div>
            </div>
            
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
            
            {/* Role Selection */}
            <div className="bg-gray-800 bg-opacity-80 p-4 rounded-md">
              <p className="text-white text-sm mb-2">Select your role:</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={formData.role === 'client'}
                    onChange={handleChange}
                    className="text-blue-500"
                  />
                  <span>Client</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={handleChange}
                    className="text-blue-500"
                  />
                  <span>Admin</span>
                </label>
              </div>
              {formData.role === 'admin' && (
                <p className="text-xs text-yellow-400 mt-2">
                  Admin accounts require email verification and approval.
                </p>
              )}
            </div>
            
            <div className="text-center mt-8">
              <button
                type="submit"
                className="w-full bg-blue-500 text-white rounded-md py-3 font-medium hover:bg-blue-600 transition duration-300"
              >
                Create Account
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4">
            <p className="text-gray-400">
              Already A Member? 
              <a href="/login" className="text-blue-400 ml-1 hover:underline">
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;