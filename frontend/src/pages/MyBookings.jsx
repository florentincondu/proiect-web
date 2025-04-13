import React, { useEffect, useState } from 'react';
import UserBookings from '../components/UserBookings';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { FaArrowLeft } from 'react-icons/fa';

const MyBookings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, refreshAuthState } = useAuth();
  const [refreshed, setRefreshed] = useState(false);
  
  // Handle authentication persistence on page refresh
  useEffect(() => {
    const handlePageRefresh = async () => {
      if (!isAuthenticated && !loading && !refreshed) {
        // Try to restore auth state from localStorage
        const restored = await refreshAuthState();
        setRefreshed(true);
        
        if (!restored) {
          // If not restored, redirect to login
          navigate('/login', { 
            state: { 
              returnUrl: '/my-bookings',
              message: 'Please log in to view your bookings' 
            } 
          });
        }
      }
    };
    
    handlePageRefresh();
  }, [isAuthenticated, loading, navigate, refreshAuthState, refreshed]);
  
  // Extra check to ensure user is authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && refreshed) {
      navigate('/login', { state: { returnUrl: '/my-bookings' } });
    }
  }, [isAuthenticated, loading, navigate, refreshed]);

  const handleProfileClick = () => {
    if (isAuthenticated && user) {
      navigate('/profile');
    } else {
      navigate('/login', { state: { returnUrl: '/profile' } });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white">
      {/* Header */}
      <header className="bg-[#0a192f]/90 shadow-lg py-4 sticky top-0 z-10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div 
            className="text-2xl font-bold cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <span className="text-blue-400 mr-1">B</span>oksy
          </div>
          
          <nav className="flex items-center space-x-6">
            <button 
              onClick={() => navigate('/')}
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              Home
            </button>
            <button 
              onClick={handleProfileClick}
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              My Profile
            </button>
          </nav>
        </div>
      </header>

      {/* Back button - positioned at the edge */}
      <div className="px-6 py-4">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-gray-300 hover:text-white hover:bg-blue-800/20 px-3 py-2 rounded-lg transition-all"
        >
          <FaArrowLeft className="mr-2" />
          <span>Înapoi</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-2">
        <h1 className="text-3xl font-bold mb-6 border-b border-gray-700 pb-2">
          My Bookings
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-400">
            Manage all your bookings in one place. View your active and past reservation details, or cancel if needed.
          </p>
        </div>
        
        <UserBookings />
      </div>
      
      {/* Footer */}
      <footer className="bg-[#0a192f]/90 border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold">
                <span className="text-blue-400 mr-1">B</span>oksy
              </div>
              <p className="text-gray-400 text-sm mt-1">Easy stays, global adventures</p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
              >
                Home
              </button>
              <button 
                onClick={handleProfileClick}
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
              >
                Profile
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
              >
                Contact Us
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} Boksy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MyBookings; 