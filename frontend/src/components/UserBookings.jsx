import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaCheckCircle, FaClock, FaBan, FaHotel, FaMapMarkerAlt, FaUsers, FaRegCalendarAlt, FaArrowRight, FaMoneyBillWave, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { getUserBookings, cancelBooking, getBookingDetails } from '../api/bookings';
import { useAuth } from '../context/authContext';

const UserBookings = () => {
  const [activeBookings, setActiveBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  useEffect(() => {
    // Check if user is authenticated before fetching bookings
    if (!authLoading) {
      if (isAuthenticated) {
        fetchBookings();
      } else {
        // Redirect to login if not authenticated
        navigate('/login', { 
          state: { 
            returnUrl: '/my-bookings',
            message: 'Please log in to view your bookings'
          } 
        });
      }
    }
  }, [isAuthenticated, authLoading, navigate]);
  
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch active bookings
      const activeData = await getUserBookings('active');
      console.log('Active bookings:', activeData);
      
      // Process bookings to ensure hotel data is present
      const processedActiveBookings = activeData.map(booking => {
        console.log(`Processing booking ${booking._id}:`, booking);
        
        // Create a copy of the booking to avoid mutations
        const processedBooking = { ...booking };
        
        // Ensure hotel object exists
        if (!processedBooking.hotel) {
          processedBooking.hotel = { 
            name: 'Hotel',
            location: 'Location not available',
            image: null 
          };
          console.warn(`Creating missing hotel object for booking ${processedBooking._id}`);
        } else {
          // Ensure hotel name and location exist
          if (!processedBooking.hotel.name) {
            console.warn(`Missing hotel name for booking ${processedBooking._id}, adding default name`);
            processedBooking.hotel.name = 'Hotel';
          }
          
          if (!processedBooking.hotel.location) {
            console.warn(`Missing hotel location for booking ${processedBooking._id}, adding default location`);
            processedBooking.hotel.location = 'Location not available';
          }
        }
        
        return processedBooking;
      });
      
      setActiveBookings(processedActiveBookings);
      
      // Fetch past bookings
      const pastData = await getUserBookings('past');
      console.log('Past bookings:', pastData);
      
      // Process past bookings similarly
      const processedPastBookings = pastData.map(booking => {
        // Create a copy of the booking to avoid mutations
        const processedBooking = { ...booking };
        
        // Ensure hotel object exists
        if (!processedBooking.hotel) {
          processedBooking.hotel = { 
            name: 'Hotel',
            location: 'Location not available',
            image: null
          };
        } else {
          // Ensure hotel name and location exist
          if (!processedBooking.hotel.name) {
            processedBooking.hotel.name = 'Hotel';
          }
          
          if (!processedBooking.hotel.location) {
            processedBooking.hotel.location = 'Location not available';
          }
        }
        
        return processedBooking;
      });
      
      setPastBookings(processedPastBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    setCancellingId(bookingId);
    
    try {
      await cancelBooking(bookingId);
      // Refresh bookings after cancellation
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking. Please try again later.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewDetails = async (booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <FaCheckCircle className="text-green-500" />;
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'cancelled':
        return <FaBan className="text-red-500" />;
      case 'completed':
        return <FaCheckCircle className="text-blue-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };
  
  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedBooking(null);
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow-md mb-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow-md mb-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={fetchBookings}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  const bookingsToShow = activeTab === 'active' ? activeBookings : pastBookings;
  
  return (
    <div className="p-4 sm:p-6 bg-gray-900 rounded-lg shadow-md mb-8 animate-fadeIn">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white flex items-center">
        <FaCalendarAlt className="mr-2 text-blue-500" />
        Your Bookings
      </h2>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'active'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Active Bookings
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'past'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('past')}
        >
          Past Bookings
        </button>
      </div>
      
      {/* Bookings list */}
      {bookingsToShow.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            {activeTab === 'active'
              ? 'You have no active bookings'
              : 'You have no past bookings'}
          </div>
          {activeTab === 'active' && (
            <button
              onClick={() => navigate('/search')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Book Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookingsToShow.map((booking) => (
            <div
              key={booking._id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
            >
              {/* Header with status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-medium text-lg text-white">
                    {(booking && booking.hotel && booking.hotel.name) ? booking.hotel.name : 'Hotel Booking'}
                  </div>
                  <div className="text-gray-400 text-sm flex items-center mt-1">
                    <FaMapMarkerAlt className="mr-1" />
                    {(booking && booking.hotel && booking.hotel.location) ? booking.hotel.location : 'Location not available'}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                  booking.status === 'confirmed' ? 'bg-green-900/30 text-green-400' :
                  booking.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                  booking.status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
                  'bg-blue-900/30 text-blue-400'
                }`}>
                  {getStatusIcon(booking.status)}
                  <span className="ml-1 capitalize">{booking.status}</span>
                </div>
              </div>
              
              {/* Booking details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Stay Period</div>
                  <div className="flex items-center text-sm">
                    <FaRegCalendarAlt className="mr-1 text-blue-500" />
                    <span>
                      {formatDate(booking.checkIn)}
                      <FaArrowRight className="mx-2 inline-block text-xs text-gray-500" />
                      {formatDate(booking.checkOut)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-xs mb-1">Room Type</div>
                  <div className="flex items-center text-sm">
                    <FaHotel className="mr-1 text-blue-500" />
                    <span>{booking.roomType || booking.roomDetails?.name || 'Standard Room'}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-xs mb-1">Guests</div>
                  <div className="flex items-center text-sm">
                    <FaUsers className="mr-1 text-blue-500" />
                    <span>
                      {booking.guests?.adults || 0} Adults, {booking.guests?.children || 0} Children
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-xs mb-1">Total Amount</div>
                  <div className="text-sm font-medium">
                    {booking.totalAmount?.toFixed(2) || 'N/A'} RON
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-2 border-t border-gray-700 pt-4">
                {activeTab === 'active' && booking.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelBooking(booking._id)}
                    disabled={cancellingId === booking._id}
                    className="px-3 py-1 border border-red-600 text-red-500 rounded text-xs font-medium hover:bg-red-600/10 transition disabled:opacity-50"
                  >
                    {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
                <button 
                  onClick={() => handleViewDetails(booking)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Booking Details Modal */}
      {detailsModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gray-900 p-4 rounded-t-lg border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Booking Details</h3>
              <button 
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Hotel & Room Info */}
              <div className="mb-6">
                <h4 className="text-blue-400 font-medium mb-3">Hotel Information</h4>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-start">
                    {selectedBooking.hotel?.image && (
                      <div className="w-20 h-20 bg-gray-800 rounded-md overflow-hidden mr-4 flex-shrink-0">
                        <img 
                          src={selectedBooking.hotel.image} 
                          alt={selectedBooking.hotel.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=Hotel'; }}
                        />
                      </div>
                    )}
                    <div>
                      <h5 className="font-medium text-white text-lg">
                        {selectedBooking.hotel?.name || 'Hotel Booking'}
                      </h5>
                      <div className="text-gray-400 text-sm flex items-center mt-1">
                        <FaMapMarkerAlt className="mr-1" />
                        {selectedBooking.hotel?.location || 'Location not available'}
                      </div>
                      <div className="mt-3 p-2 rounded bg-gray-700/30 border border-gray-600">
                        <div className="text-sm mb-1">
                          <span className="text-gray-400">Room: </span> 
                          <span className="text-white">{selectedBooking.roomType || selectedBooking.roomDetails?.name || 'Standard Room'}</span>
                        </div>
                        {selectedBooking.roomDetails?.amenities && selectedBooking.roomDetails.amenities.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-400">Amenities: </span> 
                            <span className="text-white">{selectedBooking.roomDetails.amenities.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Booking Details */}
              <div className="mb-6">
                <h4 className="text-blue-400 font-medium mb-3">Reservation Details</h4>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Check-in</div>
                      <div className="font-medium">{formatDate(selectedBooking.checkIn)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Check-out</div>
                      <div className="font-medium">{formatDate(selectedBooking.checkOut)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Guests</div>
                      <div className="font-medium">
                        {selectedBooking.guests?.adults || 0} Adults, {selectedBooking.guests?.children || 0} Children
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Booking Status</div>
                      <div className={`font-medium flex items-center ${
                        selectedBooking.status === 'confirmed' ? 'text-green-400' :
                        selectedBooking.status === 'pending' ? 'text-yellow-400' :
                        selectedBooking.status === 'cancelled' ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {getStatusIcon(selectedBooking.status)}
                        <span className="ml-1 capitalize">{selectedBooking.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pricing & Payment */}
              <div className="mb-6">
                <h4 className="text-blue-400 font-medium mb-3">Payment Information</h4>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-gray-400">Room Charge:</div>
                    <div className="font-medium">{selectedBooking.roomDetails?.price?.toFixed(2) || 'N/A'} RON</div>
                  </div>
                  
                  {selectedBooking.extras && selectedBooking.extras.length > 0 && (
                    <>
                      {selectedBooking.extras.map((extra, index) => (
                        <div key={index} className="flex justify-between items-center mb-2">
                          <div className="text-gray-400">{extra.name}:</div>
                          <div className="font-medium">{extra.price?.toFixed(2) || '0.00'} RON</div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  <div className="border-t border-gray-600 my-2 pt-2 flex justify-between items-center">
                    <div className="text-white font-medium">Total Amount:</div>
                    <div className="font-bold text-blue-400">{selectedBooking.totalAmount?.toFixed(2) || 'N/A'} RON</div>
                  </div>
                  
                  <div className="mt-4 flex items-center text-sm">
                    <FaInfoCircle className="text-gray-400 mr-2" />
                    <span className="text-gray-400">
                      Payment Status: <span className="capitalize">{selectedBooking.paymentStatus || 'pending'}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              {selectedBooking.notes && (
                <div className="mb-6">
                  <h4 className="text-blue-400 font-medium mb-3">Additional Notes</h4>
                  <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-300 text-sm">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end mt-6 space-x-3">
                {selectedBooking.status !== 'cancelled' && activeTab === 'active' && (
                  <button
                    onClick={() => {
                      closeDetailsModal();
                      handleCancelBooking(selectedBooking._id);
                    }}
                    className="px-4 py-2 border border-red-600 text-red-500 rounded font-medium hover:bg-red-600/10 transition"
                  >
                    Cancel Booking
                  </button>
                )}
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBookings; 