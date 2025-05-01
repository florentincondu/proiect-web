import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaListAlt, FaCreditCard, FaCheckCircle, FaArrowRight, FaArrowLeft, FaStar, FaParking, FaWifi, FaUtensils, FaWineGlass, FaPaw, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createHotelBooking } from '../api/bookings';
import { useAuth } from '../context/authContext';

const BookingFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  

  const hotelData = location.state?.hotel || null;
  
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedRoom, setSelectedRoom] = useState(location.state?.selectedRoom || null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    totalPrice: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {

    if (!hotelData && !selectedRoom) {
      navigate('/');
    }
    

    if (hotelData) {
      console.log('Initializing booking with hotel data:', hotelData);
      

      if (hotelData.price) {
        console.log('Hotel price from data:', hotelData.price);
      }
      

      setBookingDetails(prev => ({
        ...prev,
        hotelId: hotelData.id,
        hotelName: hotelData.name,
        hotelLocation: hotelData.location,
        hotelImage: hotelData.image
      }));
    }
    

    if (location.state?.selectedRoom && !selectedRoom) {
      console.log('Selected room data received:', location.state.selectedRoom);
      console.log('Room price from selected room:', location.state.selectedRoom.price);
      
      const roomData = location.state.selectedRoom;
      setSelectedRoom(roomData);
      
      // Auto-fill adults count based on room capacity
      if (roomData.capacity) {
        console.log('Setting adults count based on room capacity:', roomData.capacity);
        setBookingDetails(prev => ({
          ...prev,
          adults: roomData.capacity > 4 ? 4 : roomData.capacity // Cap at 4 adults max for UI dropdown
        }));
      }
    }
  }, [hotelData, navigate, selectedRoom, location.state]);
  
  useEffect(() => {

    let total = 0;
    
    if (selectedRoom) {
      const days = getDaysDifference(bookingDetails.checkIn, bookingDetails.checkOut);
      total = selectedRoom.price * days;
    }
    

    if (selectedExtras.length > 0) {
      const days = getDaysDifference(bookingDetails.checkIn, bookingDetails.checkOut);
      const extrasCost = selectedExtras.reduce((sum, extra) => {
        if (extra.priceType === 'per day') {
          return sum + (extra.price * days);
        } else if (extra.priceType === 'per person/day') {
          return sum + (extra.price * (bookingDetails.adults + bookingDetails.children) * days);
        } else {
          return sum + extra.price;
        }
      }, 0);
      
      console.log('Extras cost:', extrasCost);
      total += extrasCost;
    }
    

    const subtotal = total;
    const tax = subtotal * 0.12; // 12% tax
    total = subtotal + tax;
    
    console.log('Final total price with tax:', total);
    
    setBookingDetails(prev => ({
      ...prev,
      totalPrice: total,
      subtotal: subtotal,
      tax: tax
    }));
  }, [selectedRoom, selectedExtras, bookingDetails.checkIn, bookingDetails.checkOut, bookingDetails.adults, bookingDetails.children, hotelData]);
  
  const getDaysDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };
  
  const handleExtraToggle = (extra) => {
    if (selectedExtras.some(e => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  

  const handleSubmitBooking = async (paymentDetails) => {
    if (isLoading) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      if (!selectedRoom) {
        throw new Error('No room selected. Please select a room to continue.');
      }
      
      if (!bookingDetails.checkIn || !bookingDetails.checkOut) {
        throw new Error('Check-in and check-out dates are required.');
      }
      
      const checkIn = new Date(bookingDetails.checkIn);
      const checkOut = new Date(bookingDetails.checkOut);
      
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new Error('Invalid check-in or check-out dates.');
      }
      
      if (!hotelData || !hotelData.id) {
        console.warn('Hotel data missing or incomplete', hotelData);
      }

      // Format guests data correctly
      const guests = {
        adults: parseInt(bookingDetails.adults || 1),
        children: parseInt(bookingDetails.children || 0)
      };
      
      // Calculate total amount
      const roomPrice = selectedRoom.price || 0;
      const nightsCount = getDaysDifference(bookingDetails.checkIn, bookingDetails.checkOut);
      const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
      const subtotal = roomPrice * nightsCount + extrasTotal;
      const tax = subtotal * 0.12; // 12% tax
      const totalAmount = subtotal + tax;
      
      console.log('Submitting booking with hotel data:', hotelData);
      console.log('Price details: Subtotal:', subtotal, 'Tax:', tax, 'Total:', totalAmount);
      
      // Ensure roomDetails is properly structured
      const roomDetails = {
        name: selectedRoom.name || selectedRoom.type,
        price: roomPrice,
        capacity: selectedRoom.capacity || 2,
        amenities: selectedRoom.amenities || []
      };
      
      // Create a clean version of the payment details to avoid circular references
      const cleanPaymentDetails = {
        cardNumber: paymentDetails.cardNumber || '',
        expiry: paymentDetails.expiry || '',
        name: paymentDetails.name || '',
        paymentMethod: paymentDetails.paymentMethod || 'creditCard',
        amount: totalAmount,
        currency: 'RON'
      };
      
      // Create a more complete booking object
      const bookingData = {
        hotel: {
          id: hotelData?.id,
          name: hotelData?.name,
          location: hotelData?.location,
          image: hotelData?.image
        },
        roomType: selectedRoom.type,
        roomDetails,
        checkIn: bookingDetails.checkIn,
        checkOut: bookingDetails.checkOut,
        guests,
        totalAmount,
        extras: selectedExtras,
        notes: bookingDetails.notes || '',
        paymentDetails: cleanPaymentDetails
      };
      
      try {
        console.log('Full booking data being sent:', JSON.stringify(bookingData, null, 2));
      } catch (jsonError) {
        console.error('Error stringifying booking data:', jsonError);
        // Continue with the request even if logging fails
      }
      
      const response = await createHotelBooking(bookingData);
      
      console.log('Booking created successfully:', response);
      
      // Move to confirmation step
      setCurrentStep(4);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const steps = [
    { id: 1, title: 'Dates & Rooms', icon: <FaCalendarAlt /> },
    { id: 2, title: 'Extras', icon: <FaListAlt /> },
    { id: 3, title: 'Payment', icon: <FaCreditCard /> },
    { id: 4, title: 'Confirmation', icon: <FaCheckCircle /> }
  ];
  

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return <DatesAndRoomsStep 
                 onNext={() => setCurrentStep(2)} 
                 bookingDetails={bookingDetails}
                 onInputChange={handleInputChange}
                 selectedRoom={selectedRoom}
                 onRoomSelect={handleRoomSelect}
                 hotelData={hotelData}
               />;
      case 2:
        return <ExtrasStep 
                 onNext={() => setCurrentStep(3)} 
                 onBack={() => setCurrentStep(1)}
                 selectedExtras={selectedExtras}
                 onExtraToggle={handleExtraToggle}
                 bookingDetails={bookingDetails}
               />;
      case 3:
        return <PaymentStep 
                 onNext={handleSubmitBooking} 
                 onBack={() => setCurrentStep(2)}
                 bookingDetails={bookingDetails}
                 selectedRoom={selectedRoom}
                 selectedExtras={selectedExtras}
                 nights={getDaysDifference(bookingDetails.checkIn, bookingDetails.checkOut)}
                 isLoading={isLoading}
                 error={error}
               />;
      case 4:
        return <ConfirmationStep 
                 onFinish={() => navigate('/my-bookings')}
                 bookingDetails={bookingDetails}
                 selectedRoom={selectedRoom}
               />;
      default:
        return <DatesAndRoomsStep onNext={() => setCurrentStep(2)} />;
    }
  };


  const pageVariants = {
    initial: {
      opacity: 0,
      x: 50
    },
    in: {
      opacity: 1,
      x: 0
    },
    out: {
      opacity: 0,
      x: -50
    }
  };
  
  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header with logo - more responsive */}
      <header className="bg-gray-900 shadow-md py-4 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <div className="text-white font-bold text-xl sm:text-2xl">
            <span className="text-blue-400">Boksy</span>
          </div>
          <div className="flex space-x-2 sm:space-x-4">
            <button className="text-gray-300 hover:text-blue-400 transition text-sm sm:text-base">
              <span className="hidden sm:inline mr-2">Help</span>
              <span className="sm:hidden">?</span>
            </button>
            <button className="text-gray-300 hover:text-blue-400 transition text-sm sm:text-base">
              <span>My Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content - responsive container */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Progress tracking - responsive steps */}
        <div className="max-w-4xl mx-auto mb-6 sm:mb-8 relative">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center z-10 w-1/4">
                <div 
                  className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                    currentStep === step.id 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 transform scale-110' 
                      : currentStep > step.id 
                        ? 'bg-gradient-to-br from-green-500 to-green-600' 
                        : 'bg-gradient-to-br from-gray-700 to-gray-800'
                  }`}
                >
                  {currentStep > step.id ? (
                    <FaCheckCircle className="text-white text-sm sm:text-xl" />
                  ) : (
                    <span className="text-white text-sm sm:text-xl">{step.icon}</span>
                  )}
                </div>
                <span className={`mt-1 sm:mt-2 text-xs sm:text-sm font-medium transition-all duration-500 ${
                  currentStep === step.id 
                    ? 'text-blue-400' 
                    : currentStep > step.id
                      ? 'text-green-400'
                      : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden"
            >
            {error && currentStep !== 4 && (
              <div className="bg-red-500/20 border border-red-600 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
      </div>
    </div>
  );
};


const DatesAndRoomsStep = ({ onNext, bookingDetails, onInputChange, selectedRoom, onRoomSelect, hotelData }) => {
  const [showRoomDetails, setShowRoomDetails] = useState(null);
  

  const roomsFromHotel = hotelData?.rooms || [];


  const sampleRooms = [
    { 
      id: 1,
      name: 'Deluxe Double Room',
      type: 'deluxe',
      description: 'Spacious room with one double bed, perfect for couples.',
      amenities: ['Free WiFi', 'AC', 'TV', 'Mini-bar'],
      price: 120,
      rating: 4.7,
      image: ''
    },
    { 
      id: 2,
      name: 'Family Suite',
      type: 'suite',
      description: 'Large suite with two bedrooms, ideal for families.',
      amenities: ['Free WiFi', 'AC', 'Kitchen', 'Balcony', '2 Bathrooms'],
      price: 220,
      rating: 4.9,
      image: ''
    },
    { 
      id: 3,
      name: 'Standard Single',
      type: 'standard',
      description: 'Cozy room with a single bed, perfect for solo travelers.',
      amenities: ['Free WiFi', 'AC', 'TV'],
      price: 80,
      rating: 4.5,
      image: ''
    }
  ];
  

  const rooms = roomsFromHotel.length > 0 ? roomsFromHotel : sampleRooms;
  

  const isDateValid = () => {
    if (!bookingDetails.checkIn || !bookingDetails.checkOut) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkIn = new Date(bookingDetails.checkIn);
    const checkOut = new Date(bookingDetails.checkOut);
    
    if (checkIn < today) return false;
    if (checkOut <= checkIn) return false;
    if (!selectedRoom) return false;
    
    return true;
  };
  
  const renderRoomImage = (room) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    let imageUrl = room.image || hotelData?.image;
    
    // Process the image URL
    if (imageUrl) {
      // Handle different image URL formats
      if (typeof imageUrl === 'object' && imageUrl.name) {
        // Google Places API format
        imageUrl = `${API_BASE_URL}/api/places/media/${encodeURIComponent(imageUrl.name)}?maxWidthPx=400`;
      } else if (typeof imageUrl === 'string') {
        if (imageUrl.startsWith('/uploads/')) {
          // Local uploaded image with relative path
          imageUrl = `${API_BASE_URL}${imageUrl}`;
        } else if (!imageUrl.startsWith('http') && !imageUrl.includes('placehold.co')) {
          // Local file name or path - extract filename and build URL
          const fileName = imageUrl.split(/[\/\\]/).pop();
          imageUrl = `${API_BASE_URL}/uploads/hotels/${fileName}`;
        }
        // HTTP URLs and placeholder URLs remain unchanged
      }
    } else {
      // Default placeholder
      imageUrl = 'https://placehold.co/600x400/172a45/ffffff?text=No+Room+Image';
    }
    
    return (
      <img 
        src={imageUrl} 
        alt={room.name || room.type} 
        className="w-full h-full object-cover rounded-md transform hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://placehold.co/600x400/172a45/ffffff?text=Image+Error';
        }}
      />
    );
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center">
        <FaCalendarAlt className="mr-2 sm:mr-3 text-blue-500" />
        Select Dates & Room
      </h2>
      
      {/* Hotel info from real data */}
      {hotelData && (
        <div className="bg-gray-700 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center">
          <div className="sm:mr-4 mb-3 sm:mb-0 w-full sm:w-32 h-24 overflow-hidden rounded-md">
            {(() => {
              const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
              let imageUrl = hotelData.image;
              
              // Process the image URL
              if (imageUrl) {
                // Handle different image URL formats
                if (typeof imageUrl === 'object' && imageUrl.name) {
                  // Google Places API format
                  imageUrl = `${API_BASE_URL}/api/places/media/${encodeURIComponent(imageUrl.name)}?maxWidthPx=400`;
                } else if (typeof imageUrl === 'string') {
                  if (imageUrl.startsWith('/uploads/')) {
                    // Local uploaded image with relative path
                    imageUrl = `${API_BASE_URL}${imageUrl}`;
                  } else if (!imageUrl.startsWith('http') && !imageUrl.includes('placehold.co')) {
                    // Local file name or path - extract filename and build URL
                    const fileName = imageUrl.split(/[\/\\]/).pop();
                    imageUrl = `${API_BASE_URL}/uploads/hotels/${fileName}`;
                  }
                  // HTTP URLs and placeholder URLs remain unchanged
                }
              } else {
                // Default placeholder
                imageUrl = 'https://placehold.co/600x400/172a45/ffffff?text=No+Hotel+Image';
              }
              
              return (
                <img 
                  src={imageUrl} 
                  alt={hotelData.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/600x400/172a45/ffffff?text=Image+Error';
                  }}
                />
              );
            })()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{hotelData.name}</h3>
            <p className="text-gray-400 text-sm mb-2">{hotelData.location}</p>
            {hotelData.rating && (
              <div className="flex items-center">
                <div className="flex items-center bg-gray-800 px-2 py-1 rounded text-xs text-yellow-400">
                  <FaStar className="mr-1" />
                  <span>{hotelData.rating}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-6 sm:mb-8">
        <label className="block text-gray-300 mb-2 font-medium">Stay Dates</label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-gray-400 text-sm mb-1">Check-in Date</label>
            <input 
              type="date" 
              name="checkIn"
              value={bookingDetails.checkIn}
              onChange={onInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <label className="block text-gray-400 text-sm mb-1">Check-out Date</label>
            <input 
              type="date" 
              name="checkOut"
              value={bookingDetails.checkOut}
              onChange={onInputChange}
              min={bookingDetails.checkIn || new Date().toISOString().split('T')[0]}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6 sm:mb-8">
        <label className="block text-gray-300 mb-2 font-medium">Number of guests</label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-gray-400 text-sm mb-1">Adults</label>
            <div className="relative">
              <select 
                name="adults"
                value={bookingDetails.adults}
                onChange={onInputChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                {(() => {
                  // Get max capacity from selected room or default to 8
                  const maxCapacity = selectedRoom?.capacity || 8;
                  const options = [];
                  for (let i = 1; i <= Math.min(maxCapacity, 8); i++) {
                    options.push(<option key={i} value={i}>{i}</option>);
                  }
                  return options;
                })()}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-1/2">
            <label className="block text-gray-400 text-sm mb-1">Children</label>
            <div className="relative">
              <select 
                name="children"
                value={bookingDetails.children}
                onChange={onInputChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                {[0,1,2,3,4].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
          <FaStar className="mr-2 text-yellow-500" />
          Available Room Types
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
          {rooms.map(room => (
            <motion.div
              key={room.id}
              whileHover={{ scale: 1.01 }}
              className={`border rounded-xl p-3 sm:p-5 cursor-pointer transition-all duration-300 ${
                selectedRoom && selectedRoom.id === room.id 
                  ? 'border-blue-500 bg-blue-900 bg-opacity-10' 
                  : 'border-gray-600 hover:border-blue-400'
              }`}
              onClick={() => onRoomSelect(room)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-1/3 h-32 sm:h-40 rounded-md mb-3 sm:mb-0 sm:mr-6 overflow-hidden">
                  {renderRoomImage(room)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <h4 className="text-base sm:text-lg font-semibold">{room.name}</h4>
                    <div className="flex items-center text-yellow-500 bg-gray-700 px-2 py-1 rounded mt-1 sm:mt-0 w-fit">
                      <FaStar className="mr-1" />
                      <span>{room.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm sm:text-base mt-1 mb-2 sm:mb-3">{room.description}</p>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                    {room.amenities.map((amenity, idx) => (
                      <span key={idx} className="bg-gray-700 text-blue-300 px-2 sm:px-3 py-1 rounded-full">
                        {amenity}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 sm:mt-4">
                    <div>
                      <span className="text-blue-400 font-semibold text-lg sm:text-xl">{room.price} RON</span>
                      <span className="text-gray-400 text-xs sm:text-sm ml-1">per night</span>
                    </div>
                    
                    <div className="flex space-x-2 mt-2 sm:mt-0">
                      <button 
                        className="text-blue-400 hover:text-blue-300 transition px-2 sm:px-3 py-1 border border-blue-800 rounded text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRoomDetails(showRoomDetails === room.id ? null : room.id);
                        }}
                      >
                        Details
                      </button>
                      <button 
                        className={`py-1 sm:py-2 px-3 sm:px-4 rounded transition text-sm ${
                          selectedRoom && selectedRoom.id === room.id
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRoomSelect(room);
                        }}
                      >
                        {selectedRoom && selectedRoom.id === room.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Room details expandable section */}
                  <AnimatePresence>
                    {showRoomDetails === room.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-700">
                          <h5 className="font-medium mb-2 text-sm sm:text-base">Room Amenities</h5>
                          <ul className="text-gray-400 space-y-1 text-xs sm:text-sm">
                            {room.amenities.map((amenity, idx) => (
                              <li key={idx}>• {amenity}</li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={!isDateValid()}
          className={`flex items-center py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-medium transition ${
            isDateValid()
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Extras
          <FaArrowRight className="ml-2" />
        </motion.button>
      </div>
    </div>
  );
};


const ExtrasStep = ({ onNext, onBack, selectedExtras, onExtraToggle, bookingDetails }) => {
  const extras = [
    {
      id: 1,
      name: 'Car Park',
      description: 'Your vehicle parking space',
      price: 20,
      priceType: 'per day',
      icon: <FaParking />
    },
    {
      id: 2,
      name: 'Breakfast Buffet',
      description: 'Full breakfast buffet served 7-10 AM',
      price: 25,
      priceType: 'per person/day',
      icon: <FaUtensils />
    },
    {
      id: 3,
      name: 'Premium WiFi',
      description: 'High-speed internet for streaming and work',
      price: 10,
      priceType: 'per day',
      icon: <FaWifi />
    },
    {
      id: 4,
      name: 'Bottle of Wine',
      description: 'Chardonnay or Cabernet Sauvignon',
      price: 30,
      priceType: 'per bottle',
      icon: <FaWineGlass />
    },
    {
      id: 5,
      name: 'Pet Stay',
      description: 'Bring your furry friend along',
      price: 50,
      priceType: 'entire stay',
      icon: <FaPaw />
    }
  ];
  
  const isExtraSelected = (extraId) => {
    return selectedExtras.some(extra => extra.id === extraId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center">
        <FaListAlt className="mr-2 sm:mr-3 text-blue-500" />
        Add Extras to Your Stay
      </h2>
      
      {/* Hotel info summary */}
      <div className="mb-6 sm:mb-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-2">{bookingDetails.hotelName}</h3>
        <p className="flex items-center text-gray-300 text-sm mb-3">
          <FaMapMarkerAlt className="mr-2 text-blue-400" />
          {bookingDetails.hotelLocation}
        </p>
        <p className="text-sm text-gray-400">
          {formatDate(bookingDetails.checkIn)} - {formatDate(bookingDetails.checkOut)}
        </p>
      </div>
      
      <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
        {extras.map(extra => (
          <motion.div
            key={extra.id}
            whileHover={{ scale: 1.01 }}
            className={`border rounded-xl p-3 sm:p-5 cursor-pointer transition-all duration-300 ${
              isExtraSelected(extra.id)
                ? 'border-blue-500 bg-blue-900 bg-opacity-10' 
                : 'border-gray-600 hover:border-blue-400'
            }`}
            onClick={() => onExtraToggle(extra)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-start">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                  isExtraSelected(extra.id) ? 'bg-blue-500' : 'bg-gray-700'
                } mr-3 sm:mr-4`}>
                  {extra.icon}
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg">{extra.name}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">{extra.description}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-right mr-3 sm:mr-4">
                  <span className="text-blue-400 font-medium text-sm sm:text-base">{extra.price} RON</span>
                  <p className="text-gray-400 text-xs sm:text-sm">{extra.priceType}</p>
                </div>
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center transition-all ${
                  isExtraSelected(extra.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-500'
                }`}>
                  {isExtraSelected(extra.id) && (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center border border-gray-600 hover:border-gray-400 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="flex items-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg text-sm sm:text-base transition"
        >
          Continue to Payment
          <FaArrowRight className="ml-2" />
        </motion.button>
      </div>
    </div>
  );
};


const PaymentStep = ({ onNext, onBack, bookingDetails, selectedRoom, selectedExtras, nights, isLoading, error }) => {
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  const [isFocused, setIsFocused] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCardDetails({
      ...cardDetails,
      [name]: value
    });
  };
  
  const isFormValid = () => {
    if (paymentMethod === 'creditCard') {
      return cardDetails.cardNumber && cardDetails.expiry && cardDetails.cvv && cardDetails.name;
    }
    return true;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatCardNumber = (value) => {
    if (!value) return '';
    return value
      .replace(/\s/g, '')
      .match(/.{1,4}/g)
      ?.join(' ')
      .substr(0, 19) || '';
  };
  

  const calculateSummary = () => {

    if (bookingDetails.subtotal && bookingDetails.tax) {
      return {
        roomTotal: selectedRoom.price * nights,
        extrasTotal: bookingDetails.subtotal - (selectedRoom.price * nights),
        subtotal: bookingDetails.subtotal,
        tax: bookingDetails.tax,
        total: bookingDetails.totalPrice
      };
    }
    

    const roomTotal = selectedRoom.price * nights;
    
    let extrasTotal = 0;
    selectedExtras.forEach(extra => {
      if (extra.priceType === 'per day') {
        extrasTotal += extra.price * nights;
      } else if (extra.priceType === 'per person/day') {
        extrasTotal += extra.price * (bookingDetails.adults + bookingDetails.children) * nights;
      } else {
        extrasTotal += extra.price;
      }
    });
    
    const subtotal = roomTotal + extrasTotal;
    const tax = subtotal * 0.12; // 12% tax
    const total = subtotal + tax;
    
    return {
      roomTotal,
      extrasTotal,
      subtotal,
      tax,
      total
    };
  };
  
  const summary = calculateSummary();

  // Create a clean payment details object to pass to the booking function
  const handleCompleteBooking = () => {
    const cleanPaymentDetails = {
      cardNumber: cardDetails.cardNumber,
      expiry: cardDetails.expiry,
      cvv: cardDetails.cvv,
      name: cardDetails.name,
      paymentMethod: paymentMethod
    };
    
    onNext(cleanPaymentDetails);
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center">
        <FaCreditCard className="mr-2 sm:mr-3 text-blue-500" />
        Payment Details
      </h2>
      
      {/* Hotel info summary */}
      <div className="mb-6 sm:mb-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-2">{bookingDetails.hotelName}</h3>
        <p className="flex items-center text-gray-300 text-sm mb-3">
          <FaMapMarkerAlt className="mr-2 text-blue-400" />
          {bookingDetails.hotelLocation}
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-gray-400">
          <span className="bg-gray-700 px-2 py-1 rounded-md">
            {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded-md">
            {formatDate(bookingDetails.checkIn)} - {formatDate(bookingDetails.checkOut)}
          </span>
          <span className="bg-gray-700 px-2 py-1 rounded-md">
            {bookingDetails.adults + bookingDetails.children} {(bookingDetails.adults + bookingDetails.children) === 1 ? 'guest' : 'guests'}
          </span>
        </div>
      </div>
      
      {/* Payment method selection */}
      <div className="mb-6 sm:mb-8">
        <label className="block text-gray-300 mb-2 font-medium">Payment Method</label>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div 
            className={`w-full sm:w-auto flex-1 sm:flex-none py-3 px-4 rounded-lg border transition cursor-pointer ${
              paymentMethod === 'creditCard' 
                ? 'border-blue-500 bg-blue-900 bg-opacity-10' 
                : 'border-gray-600 hover:border-gray-400'
            }`}
            onClick={() => setPaymentMethod('creditCard')}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center ${
                paymentMethod === 'creditCard' ? 'border-blue-500' : 'border-gray-500'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  paymentMethod === 'creditCard' ? 'bg-blue-500' : 'bg-transparent'
                }`}></div>
              </div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base">Credit Card</span>
            </div>
          </div>
          <div 
            className={`w-full sm:w-auto flex-1 sm:flex-none py-3 px-4 rounded-lg border transition cursor-pointer ${
              paymentMethod === 'paypal' 
                ? 'border-blue-500 bg-blue-900 bg-opacity-10' 
                : 'border-gray-600 hover:border-gray-400'
            }`}
            onClick={() => setPaymentMethod('paypal')}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center ${
                paymentMethod === 'paypal' ? 'border-blue-500' : 'border-gray-500'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  paymentMethod === 'paypal' ? 'bg-blue-500' : 'bg-transparent'
                }`}></div>
              </div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base">PayPal</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Credit card form */}
      {paymentMethod === 'creditCard' && (
        <div className="mb-6 sm:mb-8">
          <div className="bg-gray-700 p-4 sm:p-6 rounded-lg border border-gray-600">
            <div className="mb-4 sm:mb-6">
              <label className="block text-gray-300 mb-1 sm:mb-2 text-sm font-medium">Card Number</label>
              <div className={`relative border rounded-md transition ${
                isFocused === 'cardNumber' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-500'
              }`}>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardNumber(cardDetails.cardNumber)}
                  onChange={(e) => {
                    const input = e.target.value.replace(/\D/g, '').substring(0, 16);
                    handleInputChange({ target: { name: 'cardNumber', value: input } });
                  }}
                  onFocus={() => setIsFocused('cardNumber')}
                  onBlur={() => setIsFocused(null)}
                  className="w-full bg-gray-700 py-2 sm:py-3 px-3 sm:px-4 text-white rounded-md focus:outline-none"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1 sm:space-x-2">
                  <div className="w-6 sm:w-8 h-4 sm:h-5 bg-gradient-to-r from-gray-400 to-gray-500 rounded"></div>
                  <div className="w-6 sm:w-8 h-4 sm:h-5 bg-gradient-to-r from-blue-400 to-blue-500 rounded"></div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
              <div className="w-full sm:w-1/2">
                <label className="block text-gray-300 mb-1 sm:mb-2 text-sm font-medium">Expiration Date</label>
                <div className={`border rounded-md transition ${
                  isFocused === 'expiry' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-500'
                }`}>
                  <input
                    type="text"
                    name="expiry"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => {
                      let input = e.target.value.replace(/\D/g, '').substring(0, 4);
                      if (input.length > 2) {
                        input = input.slice(0, 2) + '/' + input.slice(2);
                      }
                      handleInputChange({ target: { name: 'expiry', value: input } });
                    }}
                    onFocus={() => setIsFocused('expiry')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full bg-gray-700 py-2 sm:py-3 px-3 sm:px-4 text-white rounded-md focus:outline-none"
                    maxLength="5"
                  />
                </div>
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-gray-300 mb-1 sm:mb-2 text-sm font-medium">CVV</label>
                <div className={`border rounded-md transition ${
                  isFocused === 'cvv' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-500'
                }`}>
                  <input
                    type="text"
                    name="cvv"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => {
                      const input = e.target.value.replace(/\D/g, '').substring(0, 3);
                      handleInputChange({ target: { name: 'cvv', value: input } });
                    }}
                    onFocus={() => setIsFocused('cvv')}
                    onBlur={() => setIsFocused(null)}
                    className="w-full bg-gray-700 py-2 sm:py-3 px-3 sm:px-4 text-white rounded-md focus:outline-none"
                    maxLength="3"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1 sm:mb-2 text-sm font-medium">Cardholder Name</label>
              <div className={`border rounded-md transition ${
                isFocused === 'name' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-500'
              }`}>
                <input
                  type="text"
                  name="name"
                  placeholder="John Smith"
                  value={cardDetails.name}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused('name')}
                  onBlur={() => setIsFocused(null)}
                  className="w-full bg-gray-700 py-2 sm:py-3 px-3 sm:px-4 text-white rounded-md focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* PayPal option */}
      {paymentMethod === 'paypal' && (
        <div className="mb-6 sm:mb-8">
          <div className="bg-gray-700 p-4 sm:p-6 rounded-lg border border-gray-600 text-center">
            <p className="text-gray-300 mb-3 sm:mb-4">You'll be redirected to PayPal to complete your payment securely.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition w-full sm:w-auto font-medium">
              Continue with PayPal
            </button>
          </div>
        </div>
      )}
      
      {/* Booking summary */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Booking Summary</h3>
        <div className="bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-600">
          <div className="mb-4 pb-3 sm:pb-4 border-b border-gray-600">
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <div>
                <h4 className="font-medium">{selectedRoom.name}</h4>
                <div className="text-gray-400 text-sm">
                  {nights} {nights === 1 ? 'night' : 'nights'}, {bookingDetails.adults + bookingDetails.children} {bookingDetails.adults + bookingDetails.children === 1 ? 'guest' : 'guests'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-medium">{summary.roomTotal.toFixed(2)} RON</div>
                <div className="text-gray-400 text-sm">{selectedRoom.price} × {nights} {nights === 1 ? 'night' : 'nights'}</div>
              </div>
            </div>
          </div>
          
          {selectedExtras.length > 0 && (
            <div className="mb-4 pb-3 sm:pb-4 border-b border-gray-600">
              <h4 className="font-medium mb-2 sm:mb-3">Extras</h4>
              {selectedExtras.map(extra => (
                <div key={extra.id} className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-gray-300">{extra.name}</span>
                  <span className="text-blue-400">{
                    extra.priceType === 'per day' 
                      ? (extra.price * nights).toFixed(2)
                      : extra.priceType === 'per person/day'
                        ? (extra.price * (bookingDetails.adults + bookingDetails.children) * nights).toFixed(2)
                        : extra.price.toFixed(2)
                  } RON</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="mb-4 pb-3 sm:pb-4 border-b border-gray-600">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-gray-300">Subtotal</span>
              <span className="text-white">{summary.subtotal.toFixed(2)} RON</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Tax (12%)</span>
              <span className="text-white">{summary.tax.toFixed(2)} RON</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center font-semibold">
            <span>Total</span>
            <span className="text-lg sm:text-xl text-blue-400">{summary.total.toFixed(2)} RON</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center border border-gray-600 hover:border-gray-400 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCompleteBooking}
          disabled={!isFormValid()}
          className={`flex items-center py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-medium transition ${
            isFormValid()
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Complete Booking
          <FaArrowRight className="ml-2" />
        </motion.button>
      </div>
    </div>
  );
};


const ConfirmationStep = ({ onFinish, bookingDetails, selectedRoom }) => {
  const bookingReference = `TZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 mb-3 sm:mb-4">
          <FaCheckCircle className="text-white text-2xl sm:text-3xl" />
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Booking Confirmed!</h2>
        <p className="text-gray-400 mt-2 sm:mt-3 text-sm sm:text-base">Your reservation has been successfully booked.</p>
      </div>
      
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 sm:p-6 border border-blue-700 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 sm:pb-4 border-b border-blue-700">
          <div>
            <h3 className="font-bold text-lg sm:text-xl mb-1">{bookingDetails.hotelName}</h3>
            <p className="text-blue-300 text-sm sm:text-base mb-2">
              <FaMapMarkerAlt className="inline-block mr-1" /> {bookingDetails.hotelLocation}
            </p>
            <p className="text-blue-300 text-sm sm:text-base">
              {formatDate(bookingDetails.checkIn)} - {formatDate(bookingDetails.checkOut)}
            </p>
          </div>
          <div className="bg-blue-800 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium mt-2 sm:mt-0">
            Booking Ref: {bookingReference}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-3 sm:pb-4 border-b border-blue-700">
          <div>
            <h4 className="text-blue-300 text-xs sm:text-sm mb-1">Room Type</h4>
            <p className="text-sm sm:text-base">{selectedRoom.name}</p>
          </div>
          <div>
            <h4 className="text-blue-300 text-xs sm:text-sm mb-1">Check-in</h4>
            <p className="text-sm sm:text-base">{formatDate(bookingDetails.checkIn)}, from 3:00 PM</p>
          </div>
          <div>
            <h4 className="text-blue-300 text-xs sm:text-sm mb-1">Check-out</h4>
            <p className="text-sm sm:text-base">{formatDate(bookingDetails.checkOut)}, until 11:00 AM</p>
          </div>
          <div>
            <h4 className="text-blue-300 text-xs sm:text-sm mb-1">Guests</h4>
            <p className="text-sm sm:text-base">{bookingDetails.adults} Adults, {bookingDetails.children} Children</p>
          </div>
        </div>
        
        {/* Adăugare detalii de preț */}
        <div className="mb-3">
          <h4 className="text-blue-300 text-xs sm:text-sm mb-2">Payment Details</h4>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Subtotal:</span>
            <span>{bookingDetails.subtotal?.toFixed(2) || '0.00'} RON</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Tax (12%):</span>
            <span>{bookingDetails.tax?.toFixed(2) || '0.00'} RON</span>
          </div>
          <div className="flex justify-between font-semibold mt-2">
            <span>Total Amount:</span>
            <span className="text-white font-semibold text-base sm:text-lg">{bookingDetails.totalPrice.toFixed(2)} RON</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-600 mb-6 sm:mb-8">
        <h3 className="font-semibold mb-3 sm:mb-4">What's Next?</h3>
        <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
          <li className="flex items-start">
            <div className="text-green-400 mt-1 mr-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>A confirmation email has been sent to your registered email address</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-400 mt-1 mr-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>You can view or manage your booking in your account under "My Bookings"</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-400 mt-1 mr-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Need help? Contact our customer support at support@boksy.com</span>
          </li>
        </ul>
      </div>
      
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFinish}
          className="flex items-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 sm:py-3 px-6 sm:px-8 rounded-lg shadow-lg text-sm sm:text-base font-medium transition"
        >
          View My Bookings
        </motion.button>
      </div>
    </div>
  );
};

export default BookingFlow;