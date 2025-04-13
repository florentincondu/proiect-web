import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaFilter, FaSearch, FaEye, FaTrash, FaEdit, FaSortAmountDown, FaSortAmountUp, FaDownload, FaExclamationTriangle, FaCog, FaMoneyBillWave } from 'react-icons/fa';
import { getAllBookings, updateBookingStatus, deleteBooking } from '../api/bookings';

const BookingsManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentBooking, setCurrentBooking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch bookings on component mount and whenever filters change
  useEffect(() => {
    fetchBookings();
  }, [filters, sortField, sortDirection]);
  
  // Effect pentru debugging nume utilizatori
  useEffect(() => {
    if (bookings.length > 0) {
      console.log('=== DEBUGGING USER NAMES ===');
      bookings.forEach((booking, index) => {
        if (booking.user) {
          console.log(`Booking ${index}:`, {
            bookingId: booking._id,
            userName: booking.user.name,
            firstName: booking.user.firstName,
            lastName: booking.user.lastName,
            fullUserObj: booking.user
          });
        } else {
          console.log(`Booking ${index} has no user data:`, booking._id);
        }
      });
    }
  }, [bookings]);
  
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllBookings(filters);
      
      // Debug pentru a verifica datele utilizatorilor
      console.log('Bookings data received:', data);
      if (data.length > 0 && data[0].user) {
        console.log('Sample user data:', data[0].user);
      }
      
      // Apply sorting
      const sortedData = [...data].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // Handle nested properties
        if (sortField === 'user.name' && a.user && b.user) {
          aValue = a.user.name;
          bValue = b.user.name;
        }
        
        // Handle date comparison
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        // Default comparison
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
      
      setBookings(sortedData);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Returns the appropriate payment status based on booking status
  const getMatchingPaymentStatus = (bookingStatus) => {
    switch(bookingStatus) {
      case 'confirmed':
        return 'paid';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'refunded';
      case 'pending':
      default:
        return 'pending';
    }
  };
  
  const handleUpdateStatus = async (bookingId, newStatus) => {
    setUpdateLoading(true);
    
    try {
      // Get the corresponding payment status for this booking status
      const newPaymentStatus = getMatchingPaymentStatus(newStatus);
      
      // Update both booking status and payment status
      await updateBookingStatus(bookingId, { 
        status: newStatus,
        paymentStatus: newPaymentStatus 
      });
      
      // Update local state with both updated statuses
      setBookings(bookings.map(booking => 
        booking._id === bookingId
          ? { 
              ...booking, 
              status: newStatus,
              paymentStatus: newPaymentStatus
            }
          : booking
      ));
      
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const handleDeleteBooking = async (bookingId) => {
    setDeleteLoading(true);
    
    try {
      await deleteBooking(bookingId);
      
      // Remove from local state
      setBookings(bookings.filter(booking => booking._id !== bookingId));
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set to default direction (desc)
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in multiple fields
    return (
      (booking.user?.name && booking.user.name.toLowerCase().includes(searchLower)) ||
      (booking.user?.email && booking.user.email.toLowerCase().includes(searchLower)) ||
      (booking.hotel?.name && booking.hotel.name.toLowerCase().includes(searchLower)) ||
      (booking.hotel?.location && booking.hotel.location.toLowerCase().includes(searchLower)) ||
      (booking._id && booking._id.toLowerCase().includes(searchLower))
    );
  });
  
  if (loading && bookings.length === 0) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6">
        <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Bookings Management</h1>
        <p className="text-gray-400">View and manage all customer bookings</p>
        </div>
        
        {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-gray-400 text-sm mb-1.5">Search</label>
              <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                placeholder="Search by name, email, hotel..."
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2.5 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
          {/* Status Filter */}
            <div>
            <label className="block text-gray-400 text-sm mb-1.5">Status</label>
              <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full bg-gray-700 text-white px-4 py-2.5 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
          {/* Date Picker Container - Contains both date inputs */}
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-gray-400 text-sm mb-1.5">Date Range</label>
            <div className="flex space-x-2">
              <div className="flex-1">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
                  className="w-full bg-gray-700 text-white px-3 py-2.5 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="From"
            />
            </div>
              <div className="flex-1">
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
                  className="w-full bg-gray-700 text-white px-3 py-2.5 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="To"
            />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-end mt-4 gap-2">
          <button
            onClick={resetFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            Reset Filters
                  </button>
          <button
            onClick={fetchBookings}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center"
          >
            <FaFilter className="mr-1.5" />
            Apply Filters
              </button>
            </div>
          </div>
          
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-600 text-red-400 p-4 rounded-lg mb-6 flex items-center">
          <FaExclamationTriangle className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Bookings Table/Card View */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('_id')}
                    className="flex items-center"
                  >
                    Booking ID
                    {sortField === '_id' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('user.name')}
                    className="flex items-center"
                  >
                    Customer
                    {sortField === 'user.name' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hotel/Room
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('checkIn')}
                    className="flex items-center"
                  >
                    Stay Period
                    {sortField === 'checkIn' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center"
                  >
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('paymentStatus')}
                    className="flex items-center"
                  >
                    Payment
                    {sortField === 'paymentStatus' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('totalAmount')}
                    className="flex items-center"
                  >
                    Amount
                    {sortField === 'totalAmount' && (
                      sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    No bookings found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(booking => (
                  <tr key={booking._id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-mono text-xs">{booking._id}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">{booking.user?.name || `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'Unknown User'}</div>
                      <div className="text-gray-400 text-xs">{booking.user?.email || 'No email'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{booking.hotel?.name || 'N/A'}</div>
                      <div className="text-gray-400 text-xs">{booking.roomType || booking.roomDetails?.name || 'Standard Room'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-blue-400 mr-1 flex-shrink-0" />
                        <div>
                          <div>{formatDate(booking.checkIn)}</div>
                          <div>{formatDate(booking.checkOut)}</div>
                        </div>
                        </div>
                      </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                          {booking.status}
                        </span>
                      </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' :
                        booking.paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        booking.paymentStatus === 'refunded' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {booking.totalAmount?.toFixed(2) || 'N/A'} RON
                      </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                          <button
                          className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                          onClick={() => {
                            setCurrentBooking(booking);
                            setShowEditModal(true);
                          }}
                          title="Edit booking"
                          >
                            <FaEdit />
                          </button>
                          <button
                          className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                          onClick={() => {
                            setCurrentBooking(booking);
                            setShowDeleteModal(true);
                          }}
                          title="Delete booking"
                          >
                          <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No bookings found. Try adjusting your filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredBookings.map(booking => (
                <div key={booking._id} className="p-4 hover:bg-gray-750">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium">{booking.hotel?.name || 'N/A'}</div>
                      <div className="text-gray-400 text-xs">{booking.roomType || booking.roomDetails?.name || 'Standard Room'}</div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {booking.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' :
                        booking.paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        booking.paymentStatus === 'refunded' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {booking.paymentStatus || 'pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs">Customer</div>
                      <div className="font-medium">{booking.user?.name || `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'Unknown User'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Amount</div>
                      <div className="font-medium">{booking.totalAmount?.toFixed(2) || 'N/A'} RON</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Check-in</div>
                      <div>{formatDate(booking.checkIn)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Check-out</div>
                      <div>{formatDate(booking.checkOut)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400 font-mono">
                      ID: {booking._id}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                        onClick={() => {
                          setCurrentBooking(booking);
                          setShowEditModal(true);
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                        onClick={() => {
                          setCurrentBooking(booking);
                          setShowDeleteModal(true);
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && currentBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div onClick={() => setShowEditModal(false)} className="absolute inset-0"></div>
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-5 border border-gray-700 relative z-10">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold">Update Booking Status</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="mb-4 bg-gray-700/40 p-3 rounded-md">
              <div className="text-sm text-gray-400">Booking ID</div>
              <div className="font-mono text-sm mt-1">{currentBooking._id}</div>
            </div>
            
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Customer</div>
                  <div className="text-sm font-medium">{currentBooking.user?.name || `${currentBooking.user?.firstName || ''} ${currentBooking.user?.lastName || ''}`.trim() || 'Unknown User'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Hotel</div>
                  <div className="text-sm">{currentBooking.hotel?.name || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div className="mb-5">
              <label className="block text-gray-400 text-sm mb-2">Booking Status</label>
              <select
                value={currentBooking.status}
                onChange={(e) => setCurrentBooking({...currentBooking, status: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-400 text-sm">Payment Status</label>
                <span className="text-xs text-gray-400">(Auto-updates with booking status)</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`flex-1 py-3 px-4 rounded-md bg-gray-700/50 border border-gray-600 text-sm flex items-center ${
                  currentBooking.paymentStatus === 'paid' ? 'text-green-400' :
                  currentBooking.paymentStatus === 'pending' ? 'text-yellow-400' :
                  currentBooking.paymentStatus === 'refunded' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  <FaMoneyBillWave className="mr-2" />
                  <span className="capitalize">{currentBooking.paymentStatus || 'pending'}</span>
                </div>
                
                <div className="text-gray-400">→</div>
                
                <div className={`flex-1 py-3 px-4 rounded-md bg-gray-700/30 border border-gray-600 text-sm flex items-center ${
                  getMatchingPaymentStatus(currentBooking.status) === 'paid' ? 'text-green-400' :
                  getMatchingPaymentStatus(currentBooking.status) === 'pending' ? 'text-yellow-400' :
                  getMatchingPaymentStatus(currentBooking.status) === 'refunded' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  <FaMoneyBillWave className="mr-2" />
                  <span className="capitalize">{getMatchingPaymentStatus(currentBooking.status)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(currentBooking._id, currentBooking.status)}
                disabled={updateLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>Update Status</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div onClick={() => setShowDeleteModal(false)} className="absolute inset-0"></div>
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-5 border border-gray-700 relative z-10">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
              <h2 className="text-xl font-bold text-red-400">Delete Booking</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="flex items-center mb-5 bg-red-500/10 border border-red-500/30 rounded-md p-4">
              <FaExclamationTriangle className="text-red-400 mr-3 flex-shrink-0" size={20} />
              <p className="text-sm">
                This action cannot be undone. This will permanently delete this booking and remove all associated data.
              </p>
            </div>
            
            <div className="mb-5 bg-gray-700/40 p-3 rounded-md">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-gray-400">Booking ID:</div>
                <div className="font-mono text-sm">{currentBooking._id}</div>
              </div>
              <div className="flex justify-between mb-2">
                <div className="text-sm text-gray-400">Customer:</div>
                <div className="text-sm">{currentBooking.user?.name || 'N/A'}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-400">Hotel:</div>
                <div className="text-sm">{currentBooking.hotel?.name || 'N/A'}</div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBooking(currentBooking._id)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>Delete Booking</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsManagement;