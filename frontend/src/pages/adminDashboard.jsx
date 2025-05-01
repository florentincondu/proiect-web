import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCog, FaChartLine, 
         FaListAlt, FaQuestion, FaBell, FaSearch, FaSignOutAlt, 
         FaUserShield, FaAngleDown, FaEllipsisV, FaCalendarCheck,
         FaCreditCard, FaChartBar, FaExclamationTriangle, FaClock, FaHotel } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import axios from 'axios';
import { IoArrowForward } from 'react-icons/io5';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


import BookingsManagement from '../components/BookingManagement'
import UsersManagement from '../components/UserManagment';
import ServicesManagement from '../components/ServiceManagement';
import PaymentsInvoicesManagement from '../components/PaymentsInvoicesManagement';
import Analytics from '../components/Analytics';
import Settings from '../components/Settings';
import AdminSupportTools from '../components/AdminSupportTools';
import HotelManagement from '../components/HotelManagement';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [activeSidebar, setActiveSidebar] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  

  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      totalBookings: 0,
      totalRevenue: 0,
      pendingBookings: 0
    },
    recentBookings: [],
    activityLogs: [],
    userRegistrations: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('weekly'); // weekly or monthly
  

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.log('Non-admin user attempting to access admin dashboard. Redirecting to homepage.');
      navigate('/homepage', { replace: true });
    }
  }, [user, navigate]);
  
  useEffect(() => {
    window.history.replaceState(null, '', location.pathname);
    
    const handlePopState = () => {
      if (user?.role === 'admin') {
        navigate('/dashboard', { replace: true });
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, location.pathname, user]);
  
  useEffect(() => {
    if (user?.role === 'admin' && token && activeSidebar === 'dashboard') {
      fetchDashboardData();
    }
  }, [user, token, activeSidebar]);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const summaryResponse = await axios.get(`${API_BASE_URL}/api/admin/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const logsResponse = await axios.get(`${API_BASE_URL}/api/admin/logs/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Dashboard summary response:', summaryResponse.data);
      console.log('Logs response:', logsResponse.data);
      
      setDashboardData({
        stats: summaryResponse.data.statistics || summaryResponse.data.stats || {
          totalUsers: 0,
          totalBookings: 0,
          totalRevenue: 0,
          pendingBookings: 0
        },
        recentBookings: summaryResponse.data.recentBookings || [],
        activityLogs: logsResponse.data.logs || [],
        userRegistrations: summaryResponse.data.userRegistrations || []
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      
      setDashboardData({
        stats: {
          totalUsers: 0,
          totalBookings: 0,
          totalRevenue: 0,
          pendingBookings: 0
        },
        recentBookings: [],
        activityLogs: [],
        userRegistrations: []
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const getTimeAgo = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      
      if (isNaN(seconds)) {
        return 'Invalid date';
      }
      
      if (seconds < 60) return `${seconds} seconds ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
      
      return new Date(timestamp).toLocaleDateString();
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Unknown time';
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  

  const renderContent = () => {
    switch(activeSidebar) {
      case 'dashboard':
        return (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-400">Welcome back, {user?.firstName || 'Admin'}. Here's what's happening today.</p>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 text-red-100">
                {error}
              </div>
            )}
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Total Users</h3>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {isLoading ? '...' : dashboardData.stats.totalUsers?.toString() || '0'}
                  </span>
                  <FaUsers className="ml-auto text-blue-500 text-xl" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Total Bookings</h3>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {isLoading ? '...' : dashboardData.stats.totalBookings?.toString() || '0'}
                  </span>
                  <FaCalendarCheck className="ml-auto text-green-500 text-xl" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Total Revenue</h3>
                <div className="flex items-center">
                    <span className="text-2xl font-bold">
                    {isLoading ? '...' : `${dashboardData.stats.totalRevenue?.toLocaleString() || '0'} RON`}
                    </span>
                  <FaCreditCard className="ml-auto text-purple-500 text-xl" />
                </div>
                  </div>
              
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Pending Bookings</h3>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {isLoading ? '...' : dashboardData.stats.pendingBookings?.toString() || '0'}
                  </span>
                  <FaClock className="ml-auto text-yellow-500 text-xl" />
                </div>
              </div>
            </div>
            
            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Booking Trend Chart */}
              <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex flex-wrap justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">Booking Trends</h2>
                  <div className="flex space-x-2 mt-2 sm:mt-0">
                    <button 
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${chartType === 'weekly' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                      onClick={() => setChartType('weekly')}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${chartType === 'monthly' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                      onClick={() => setChartType('monthly')}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <>
                      {chartType === 'weekly' ? (
                        <WeeklyBookingChart registrationData={dashboardData.userRegistrations} />
                      ) : (
                        <MonthlyBookingChart bookingData={dashboardData.recentBookings} />
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Activity Feed */}
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
                {isLoading ? (
                  <div className="text-center py-6 text-gray-400">Loading activity...</div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {dashboardData.activityLogs.length > 0 ? (
                      dashboardData.activityLogs.map((item, index) => (
                      <div key={item.id || index} className="flex items-start">
                        <div className={`
                            h-8 w-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0
                          ${item.action === 'User registered' ? 'bg-green-500/20 text-green-400' : 
                            item.action === 'Booking created' ? 'bg-blue-500/20 text-blue-400' :
                            item.action === 'Payment processed' ? 'bg-purple-500/20 text-purple-400' : 
                            item.action === 'Hotel updated' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.level === 'error' ? 'bg-red-500/20 text-red-400' :
                            item.level === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'}
                          `}>
                            {item.action === 'User registered' ? <FaUsers size={12} /> : 
                            item.action === 'Booking created' ? <FaCalendarAlt size={12} /> :
                            item.action === 'Payment processed' ? <FaMoneyBillWave size={12} /> :
                            item.action === 'Hotel updated' ? <FaHotel size={12} /> :
                            item.level === 'error' ? <FaExclamationTriangle size={12} /> :
                            <FaBell size={12} />}
                        </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">{item.user || 'User'}</span> {item.action}
                              {item.message && item.message !== item.action && (
                                <span className="text-gray-400 ml-1">: {item.message}</span>
                              )}
                            </p>
                          <p className="text-xs text-gray-400">{getTimeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-400">No recent activity</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Bookings */}
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 mb-6">
              <div className="flex flex-wrap justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Recent Bookings</h2>
                  <button 
                    onClick={() => setActiveSidebar('bookings')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center mt-2 sm:mt-0"
                  >
                  View All
                  <IoArrowForward className="ml-1" />
                  </button>
              </div>
              
                {isLoading ? (
                <div className="text-center py-6 text-gray-400">Loading bookings...</div>
              ) : dashboardData.recentBookings.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No recent bookings</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hotel</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {dashboardData.recentBookings.map((booking, index) => (
                        
                        <tr key={index} className="hover:bg-gray-750">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium">{booking.user?.name || 'User'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm">{booking.hotel?.name || 'Hotel'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-wrap">
                          <div className="text-sm">
    {new Date(booking.checkIn).toLocaleDateString()} : {new Date(booking.checkOut).toLocaleDateString()}
  </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full
                              ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'}`
                            }>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium">{booking.amount} RON</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              
              {/* Mobile Scrolling Indicator */}
              {!isLoading && dashboardData.recentBookings.length > 0 && (
                <div className="md:hidden text-center text-xs text-gray-400 py-2">
                  Scroll horizontally to see all data
              </div>
              )}
            </div>
          </>
        );
      case 'bookings':
        return <BookingsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'services':
        return <ServicesManagement />;
      case 'payments':
        return <PaymentsInvoicesManagement />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'support':
        return <AdminSupportTools />;
      case 'hotels':
        return <HotelManagement />;
      default:
        return <div>Select a menu item</div>;
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-gray-800 border-r border-gray-700">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-center h-16 px-4">
            <div className="text-white font-bold text-xl">
            <span className="text-blue-500">Boksy</span>
              <span className="text-xs font-normal ml-1 text-gray-400">Admin</span>
            </div>
        </div>
        
          <nav className="mt-5 flex-1 px-4 space-y-1">
            <button 
              onClick={() => setActiveSidebar('dashboard')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaChartLine className="mr-3" />
              <span>Dashboard</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('bookings')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'bookings' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaCalendarAlt className="mr-3" />
              <span>Bookings</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('users')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'users' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaUsers className="mr-3" />
              <span>Users</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('services')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'services' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaListAlt className="mr-3" />
              <span>Services</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('payments')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'payments' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaMoneyBillWave className="mr-3" />
              <span>Payments</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('analytics')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'analytics' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaChartBar className="mr-3" />
              <span>Analytics</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('settings')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaCog className="mr-3" />
              <span>Settings</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('support')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'support' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaQuestion className="mr-3" />
              <span>Support</span>
            </button>
            
            <button 
              onClick={() => setActiveSidebar('hotels')}
              className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                activeSidebar === 'hotels' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <FaHotel className="mr-3" />
              <span>Hotels</span>
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={handleLogout}
            className="flex items-center px-4 py-2 w-full rounded-md hover:bg-gray-700 transition-colors"
          >
            <FaSignOutAlt className="mr-3 text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-gray-800 flex items-center justify-between p-4 border-b border-gray-700">
        <div className="text-white font-bold text-xl">
          <span className="text-blue-500">Boksy</span>
          <span className="text-xs font-normal ml-1 text-gray-400">Admin</span>
        </div>
        
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="text-gray-300 hover:text-white"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>
      
      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-gray-900 bg-opacity-80 transition-opacity">
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-gray-800 shadow-xl transform transition-transform p-4 overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="text-white font-bold text-xl">
                <span className="text-blue-500">Travel</span>zo
                <span className="text-xs font-normal ml-1 text-gray-400">Admin</span>
              </div>
              
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="text-gray-300 hover:text-white"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <nav className="space-y-1">
              <button 
                onClick={() => { setActiveSidebar('dashboard'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaChartLine className="mr-3" />
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('bookings'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'bookings' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaCalendarAlt className="mr-3" />
                <span>Bookings</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('users'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'users' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaUsers className="mr-3" />
                <span>Users</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('services'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'services' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaListAlt className="mr-3" />
                <span>Services</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('payments'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'payments' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaMoneyBillWave className="mr-3" />
                <span>Payments</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('analytics'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'analytics' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaChartBar className="mr-3" />
                <span>Analytics</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('settings'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaCog className="mr-3" />
                <span>Settings</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('support'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'support' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaQuestion className="mr-3" />
                <span>Support</span>
              </button>
              
              <button 
                onClick={() => { setActiveSidebar('hotels'); setIsMobileSidebarOpen(false); }}
                className={`flex items-center px-4 py-3 w-full rounded-md transition-colors ${
                  activeSidebar === 'hotels' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <FaHotel className="mr-3" />
                <span>Hotels</span>
              </button>
            </nav>
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <button 
                onClick={() => { handleLogout(); setIsMobileSidebarOpen(false); }}
                className="flex items-center px-4 py-2 w-full rounded-md hover:bg-gray-700 transition-colors"
              >
                <FaSignOutAlt className="mr-3 text-red-400" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="md:ml-64 flex-1 flex flex-col">
        {/* Main content wrapper */}
        <div className="p-4 sm:p-6 mt-16 md:mt-0 min-h-screen">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};


const WeeklyBookingChart = ({ registrationData = [] }) => {

  const last7Days = Array(7).fill(0).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  

  const chartData = last7Days.map(date => {
    const matchingDay = registrationData.find(item => item._id === date);
    return matchingDay ? matchingDay.count : 0;
  });
  

  const labels = last7Days.map(date => {
    const day = new Date(date);
    return day.toLocaleDateString('en-US', { weekday: 'short' });
  });
  
  const data = {
    labels: labels,
    datasets: [
      {
        label: 'New Registrations',
        data: chartData,
        borderColor: 'rgba(99, 179, 237, 1)',
        backgroundColor: 'rgba(99, 179, 237, 0.2)',
        tension: 0.4,
        fill: true,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#cbd5e0',
          precision: 0
        },
        grid: {
          color: 'rgba(203, 213, 224, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#cbd5e0'
        },
        grid: {
          display: false
        }
      }
    }
  };
  
  return <Line data={data} options={options} />;
};


const MonthlyBookingChart = ({ bookingData = [] }) => {

  const last6Months = Array(6).fill(0).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  


  const bookingCounts = last6Months.map(() => Math.floor(Math.random() * 100) + 10);
  

  const labels = last6Months.map(date => 
    date.toLocaleDateString('en-US', { month: 'short' })
  );
  
  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Monthly Bookings',
        data: bookingCounts,
        backgroundColor: 'rgba(129, 140, 248, 0.7)',
        hoverBackgroundColor: 'rgba(129, 140, 248, 0.9)',
        borderRadius: 4,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#cbd5e0',
          precision: 0
        },
        grid: {
          color: 'rgba(203, 213, 224, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#cbd5e0'
        },
        grid: {
          display: false
        }
      }
    }
  };
  
  return <Bar data={data} options={options} />;
};

export default AdminDashboard;