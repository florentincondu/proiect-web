import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCheck, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import { useAuth } from '../context/authContext';
import backgroundImage from '../assets/backgr.webp';
import backgr from '../assets/start.avif';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Funcție utilitară care generează URL-ul corect pentru o imagine, indiferent de sursa ei
 * @param {string|object} imageUrl - URL-ul sau obiectul cu referința imaginii
 * @param {number} maxWidth - Lățimea maximă pentru imagini (opțional)
 * @return {string} - URL-ul complet și valid pentru imagine
 */
const getImageUrl = (imageUrl, maxWidth = 800) => {
  // Dacă nu avem nicio imagine, returnăm imaginea implicită
  if (!imageUrl) return backgr;
  
  // Dacă avem un obiect cu proprietatea name (cazul API-ului Google Places)
  if (typeof imageUrl === 'object' && imageUrl.name) {
    return `${API_BASE_URL}/api/places/media/${encodeURIComponent(imageUrl.name)}?maxWidthPx=${maxWidth}`;
  }
  
  // Dacă avem un string, procesăm diferitele tipuri de URL-uri
  if (typeof imageUrl === 'string') {
    // 1. Pentru URL-uri relative încărcate de utilizator (încep cu /uploads/)
    if (imageUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    
    // 2. Pentru URL-uri absolute externe (încep cu http)
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // 3. Pentru imagini placeholder
    if (imageUrl.includes('placehold.co')) {
      return imageUrl;
    }
    
    // 4. Pentru alte stringuri (presupunem că sunt ID-uri pentru media)
    try {
      return `${API_BASE_URL}/api/places/media/${encodeURIComponent(imageUrl)}?maxWidthPx=${maxWidth}`;
    } catch (error) {
      console.error('Error formatting image URL string:', error);
      return backgr;
    }
  }
  
  // Pentru orice alt tip de date, returnăm imaginea implicită
  console.warn('Unsupported image URL format:', imageUrl);
  return backgr;
};

const ReserveRoom = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState({ name: '', rating: 5, comment: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomAvailability, setRoomAvailability] = useState({});
  const [checkInDate, setCheckInDate] = useState(new Date());
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)); // Default to 2 days from now
  const [guestCount, setGuestCount] = useState(2);

  const aedToRon = 1.2;

  // Function to fetch hotel data from API
  const fetchHotelFromAPI = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hotels/${hotelId}`);
      
      if (response.data && response.data.success) {
        const hotelData = response.data.data;
        
        // Transform the hotel data structure
        const transformedHotel = {
          id: hotelData._id,
          name: hotelData.name,
          location: hotelData.location,
          price: hotelData.price,
          description: hotelData.description || 'No description available',
          utilities: hotelData.amenities?.map(amenity => ({ name: amenity })) || [],
          rooms: hotelData.rooms?.map(room => ({
            id: room._id || room.type,
            type: room.type,
            price: room.price,
            occupancy: room.capacity,
            count: room.count,
            bedType: getBedTypeByRoomType(room.type),
            size: getRoomSizeByType(room.type),
            amenities: ["TV LCD", "Wi-Fi", "Aer condiționat"].concat(room.type === 'double' ? ["Mini-bar"] : [])
          })) || [],
          feedback: hotelData.reviews?.map((review, idx) => ({
            id: review._id || idx,
            name: review.user?.firstName || 'Anonymous',
            rating: review.rating,
            date: new Date(review.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
            comment: review.comment
          })) || [],
          images: hotelData.photos?.map(url => getImageUrl(url)) || ['/images/hotel_placeholder.jpg']
        };
        
        setHotel(transformedHotel);
        await checkRoomsAvailability(transformedHotel.rooms, hotelData._id);
        setLoading(false);
      } else {
        throw new Error('Hotel data not found');
      }
    } catch (error) {
      console.error('Failed to fetch hotel data:', error);
      setError('Failed to load hotel data. Please try again later.');
      setLoading(false);
      
      // Mock data fallback for demo purposes
      fetchMockHotel();
    }
  };
  
  // Check availability for all room types
  const checkRoomsAvailability = async (rooms, hotelId) => {
    if (!rooms || !hotelId) return;
    
    const startDate = checkInDate.toISOString().split('T')[0];
    const endDate = checkOutDate.toISOString().split('T')[0];
    
    try {
      const availability = {};
      
      // Check each room type
      for (const room of rooms) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/hotels/check-availability`, {
            hotelId,
            startDate,
            endDate,
            roomType: room.type,
            guests: guestCount
          });
          
          // Calculate the total available rooms
          const totalRoomCount = room.count || 0;
          const bookedRoomCount = response.data.bookedCount || 0;
          const availableRoomCount = totalRoomCount - bookedRoomCount;
          
          availability[room.type] = {
            available: response.data.available,
            price: response.data.totalPrice / Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)),
            totalRooms: totalRoomCount,
            availableRooms: availableRoomCount
          };
        } catch (err) {
          console.error(`Error checking availability for room ${room.type}:`, err);
          availability[room.type] = { 
            available: false, 
            price: room.price,
            totalRooms: room.count || 0,
            availableRooms: 0
          };
        }
      }
      
      setRoomAvailability(availability);
    } catch (error) {
      console.error('Error checking room availability:', error);
    }
  };
  
  // Helper to get bed type text based on room type
  const getBedTypeByRoomType = (type) => {
    const bedTypes = {
      'single': 'Pat single',
      'double': 'Pat matrimonial',
      'triple': 'Pat matrimonial și pat single',
      'quad': 'Pat matrimonial și canapea extensibilă'
    };
    return bedTypes[type] || 'Pat standard';
  };
  
  // Helper to get room size text based on room type
  const getRoomSizeByType = (type) => {
    const sizes = {
      'single': '18-22 mp',
      'double': '24-28 mp',
      'triple': '30-35 mp',
      'quad': '40-50 mp'
    };
    return sizes[type] || '25 mp';
  };
  
  // Fallback mock data for demo/testing
  const fetchMockHotel = () => {
    const hotelData = {
      id: parseInt(hotelId),
      name: "Hilton Hotel",
      location: "Dubai Marina",
      price: 549,
      description: "Situat în inima Dubai Marina, Hilton Hotel oferă camere luxoase cu vedere panoramică asupra golfului. Hotelul dispune de piscine interioare și exterioare, centru SPA, restaurante de lux și acces direct la plajă. Serviciile premium și facilitățile moderne fac din acest hotel alegerea perfectă pentru vacanțe de vis în Dubai.",
      utilities: [
        { name: "Wi-Fi", icon: "wifi" },
        { name: "Aer condiționat", icon: "snow" },
        { name: "Piscină", icon: "droplet" },
        { name: "Sală de fitness", icon: "dumbbell" },
        { name: "Restaurant", icon: "utensils" },
        { name: "Spa", icon: "spa" },
        { name: "Parcare gratuită", icon: "car" },
        { name: "Room service", icon: "concierge-bell" }
      ],
      rooms: [
        { 
          id: 1, 
          type: "single", 
          price: 549, 
          occupancy: 1, 
          bedType: "Pat single", 
          size: "22 mp",
          amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr"]
        },
        { 
          id: 2, 
          type: "double", 
          price: 749, 
          occupancy: 2, 
          bedType: "Pat King size", 
          size: "28 mp",
          amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Balcon privat", "Espressor"]
        },
        { 
          id: 3, 
          type: "triple", 
          price: 1049, 
          occupancy: 3, 
          bedType: "Pat King size și pat single", 
          size: "35 mp",
          amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Balcon privat", "Espressor", "Zonă de living"]
        },
        { 
          id: 4, 
          type: "quad", 
          price: 1549, 
          occupancy: 4, 
          bedType: "Pat King size și canapea extensibilă", 
          size: "48 mp",
          amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Terasă privată", "Espressor", "Zonă de living", "Jacuzzi"]
        }
      ],
      feedback: [
        { id: 1, name: "Maria P.", rating: 5, date: "15 Februarie 2023", comment: "O experiență extraordinară! Personalul este foarte amabil și locația este superbă. Recomand cu căldură!" },
        { id: 2, name: "Alexandru M.", rating: 4, date: "23 Martie 2023", comment: "Camere spațioase și curate, vedere excelentă. Micul dejun ar putea fi îmbunătățit." },
        { id: 3, name: "Elena D.", rating: 5, date: "10 Aprilie 2023", comment: "Am stat în camera Deluxe și a fost extraordinară. Priveliștea este spectaculoasă iar serviciile impecabile." }
      ],
      images: [
        "/images/hotel1.jpg",
        "/images/hotel1_room1.jpg",
        "/images/hotel1_room2.jpg",
        "/images/hotel1_pool.jpg",
        "/images/hotel1_restaurant.jpg",
        "/images/hotel1_lobby.jpg"
      ]
    };
    
    setHotel(hotelData);
    
    // Set mock availability
    const mockAvailability = {};
    hotelData.rooms.forEach(room => {
      mockAvailability[room.type] = { 
        available: Math.random() > 0.3, // 70% chance of being available 
        price: room.price
      };
    });
    setRoomAvailability(mockAvailability);
    setLoading(false);
  };

  useEffect(() => {
    fetchHotelFromAPI();
  }, [hotelId]);
  
  // Recheck availability when dates or guest count changes
  useEffect(() => {
    if (hotel && hotel.id) {
      checkRoomsAvailability(hotel.rooms, hotel.id);
    }
  }, [checkInDate, checkOutDate, guestCount]);

  const handleDateChange = (startDate, endDate) => {
    setCheckInDate(startDate);
    setCheckOutDate(endDate);
    
    // Reset room selection when dates change as availability might have changed
    setSelectedRoom(null);
  };

  const handleGuestCountChange = (count) => {
    setGuestCount(count);
    
    // Reset room selection when guest count changes
    setSelectedRoom(null);
  };

  const handleRoomSelect = (room) => {
    // Check if room is available first
    if (roomAvailability[room.type]?.available) {
      setSelectedRoom(room);
    } else {
      // Show a message that room is not available
      alert('Ne pare rău, acest tip de cameră nu este disponibil pentru perioada selectată.');
    }
  };

  const handleBookNow = () => {
    if (!selectedRoom) {
      alert("Vă rugăm să selectați un tip de cameră");
      return;
    }
    
    // Double check availability before proceeding
    if (!roomAvailability[selectedRoom.type]?.available) {
      alert('Ne pare rău, acest tip de cameră nu mai este disponibil. Vă rugăm să selectați alt tip de cameră.');
      setSelectedRoom(null);
      return;
    }
    
    // Prepare data for booking page
    const bookingData = {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        location: hotel.location,
        image: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
      },
      selectedRoom: {
        ...selectedRoom,
        // Make sure to include any calculated price from availability check
        price: roomAvailability[selectedRoom.type]?.price || selectedRoom.price
      },
      dates: {
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString()
      },
      guests: {
        adults: guestCount > 0 ? guestCount : 1,
        children: 0
      }
    };
    
    // Navigate to booking page with the prepared data
    navigate('/booking', { state: bookingData });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    

    const newFeedbackItem = {
      id: hotel.feedback.length + 1,
      name: newFeedback.name,
      rating: newFeedback.rating,
      date: new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
      comment: newFeedback.comment
    };
    
    setHotel({
      ...hotel,
      feedback: [...hotel.feedback, newFeedbackItem]
    });
    
    setNewFeedback({ name: '', rating: 5, comment: '' });
    setShowFeedbackForm(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === hotel.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? hotel.images.length - 1 : prev - 1));
  };

  if (!hotel) {
    return (
      <div className="min-h-screen bg-[#0a192f] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a192f] text-white p-4 md:p-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Înapoi
      </button>
      
      <div className="max-w-6xl mx-auto">
        {/* Hotel Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{hotel.name}</h1>
            <p className="text-blue-400 flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {hotel.location}
            </p>
            
            {/* Star rating display */}
            <div className="flex items-center mb-4">
              {[...Array(5)].map((_, index) => (
                <svg 
                  key={index} 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 ${index < 4 ? "text-yellow-400" : "text-gray-400"}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 text-sm text-gray-300">(120 recenzii)</span>
            </div>
          </div>
          
          <div className="bg-[#172a45] p-4 rounded-lg shadow-lg">
            <p className="text-sm text-gray-300 mb-1">Preț începând de la</p>
            <p className="text-2xl font-bold">{Math.round(hotel.price * aedToRon)} Lei</p>
            <p className="text-sm text-gray-300 mb-4">pe noapte</p>
          </div>
        </div>
        
        {/* Gallery */}
        <div className="relative mb-8 bg-[#172a45] rounded-lg overflow-hidden">
          <div className="aspect-w-16 aspect-h-9">
            <img 
              src={getImageUrl(hotel.images[currentImageIndex])} 
              alt={`${hotel.name} imagine ${currentImageIndex + 1}`} 
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
          
          {/* Navigation arrows */}
          <button 
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Gallery thumbnails */}
          <div className="flex overflow-x-auto p-2 bg-[#0f2847] space-x-2">
            {hotel.images.map((image, index) => (
              <button 
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 ${currentImageIndex === index ? 'ring-2 ring-blue-500' : ''}`}
              >
                <img 
                  src={getImageUrl(image)} 
                  alt={`Thumbnail ${index + 1}`} 
                  className="h-16 w-24 object-cover rounded"
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex border-b border-[#2d3a4f] mb-6">
            <button 
              onClick={() => setActiveTab('description')}
              className={`py-2 px-4 font-medium ${activeTab === 'description' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Descriere
            </button>
            <button 
              onClick={() => setActiveTab('rooms')}
              className={`py-2 px-4 font-medium ${activeTab === 'rooms' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Camere
            </button>
            <button 
              onClick={() => setActiveTab('utilities')}
              className={`py-2 px-4 font-medium ${activeTab === 'utilities' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Facilități
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`py-2 px-4 font-medium ${activeTab === 'feedback' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Recenzii
            </button>
          </div>
          
          {/* Tab content */}
          <div className="bg-[#172a45] rounded-lg p-6">
            {/* Description Tab */}
            {activeTab === 'description' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Despre {hotel.name}</h2>
                <p className="mb-6">{hotel.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1e3a5f] p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Check-in / Check-out</h3>
                    <p className="text-sm">Check-in: de la 14:00</p>
                    <p className="text-sm">Check-out: până la 12:00</p>
                  </div>
                  <div className="bg-[#1e3a5f] p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Politica de anulare</h3>
                    <p className="text-sm">Anulare gratuită cu până la 48 de ore înainte de check-in.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Tipuri de camere</h2>
                
                {/* Date and guest selection */}
                <div className="bg-[#1e3a5f] p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-3">Selectați datele și numărul de oaspeți</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Check-in</label>
                      <input 
                        type="date" 
                        value={checkInDate.toISOString().split('T')[0]} 
                        onChange={(e) => setCheckInDate(new Date(e.target.value))}
                        className="w-full p-2 bg-[#112240] border border-[#2d3a4f] rounded"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Check-out</label>
                      <input 
                        type="date" 
                        value={checkOutDate.toISOString().split('T')[0]} 
                        onChange={(e) => setCheckOutDate(new Date(e.target.value))}
                        className="w-full p-2 bg-[#112240] border border-[#2d3a4f] rounded"
                        min={new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Număr persoane</label>
                      <select 
                        value={guestCount} 
                        onChange={(e) => setGuestCount(parseInt(e.target.value))}
                        className="w-full p-2 bg-[#112240] border border-[#2d3a4f] rounded"
                      >
                        <option value="1">1 persoană</option>
                        <option value="2">2 persoane</option>
                        <option value="3">3 persoane</option>
                        <option value="4">4 persoane</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-blue-300">Disponibilitate camere</h3>
                  <div className="text-sm text-gray-400">
                    Perioada: {new Date(checkInDate).toLocaleDateString('ro-RO')} - {new Date(checkOutDate).toLocaleDateString('ro-RO')}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {hotel.rooms.map((room) => (
                    <div 
                      key={room.id} 
                      className={`border ${
                        !roomAvailability[room.type]?.available 
                          ? 'border-red-500 bg-red-900/20' 
                          : selectedRoom?.id === room.id 
                            ? 'border-blue-500 bg-blue-900/30' 
                            : 'border-[#2d3a4f]'
                      } rounded-lg p-4 transition-colors ${roomAvailability[room.type]?.available ? 'cursor-pointer' : 'opacity-70'}`}
                      onClick={() => roomAvailability[room.type]?.available && handleRoomSelect(room)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="mb-4 md:mb-0">
                          <div className="flex items-center">
                            <h3 className="font-bold text-lg">{room.type.charAt(0).toUpperCase() + room.type.slice(1)}</h3>
                            {!roomAvailability[room.type]?.available && (
                              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                Indisponibil
                              </span>
                            )}
                            {roomAvailability[room.type]?.available && (
                              <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {roomAvailability[room.type]?.availableRooms} / {roomAvailability[room.type]?.totalRooms} disponibile
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm">
                            <span className="mr-3">{room.size}</span>
                            <span className="mr-3">{room.occupancy} {room.occupancy === 1 ? 'persoană' : 'persoane'}</span>
                            <span>{room.bedType}</span>
                          </p>
                          
                          <div className="mt-2">
                            <p className="text-sm font-medium mb-1">Dotări cameră:</p>
                            <div className="flex flex-wrap gap-2">
                              {room.amenities.map((amenity, i) => (
                                <span key={i} className="text-xs bg-[#263b59] px-2 py-1 rounded">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Preț pe noapte</p>
                          <p className="text-xl font-bold">
                            {Math.round((roomAvailability[room.type]?.price || room.price) * aedToRon)} Lei
                          </p>
                          {roomAvailability[room.type]?.available && roomAvailability[room.type]?.availableRooms <= 3 && (
                            <p className="text-sm text-yellow-400 mt-1">
                              {roomAvailability[room.type]?.availableRooms === 1 
                                ? 'Ultima cameră disponibilă!' 
                                : `Doar ${roomAvailability[room.type]?.availableRooms} camere rămase!`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleBookNow}
                    disabled={!selectedRoom}
                    className={`px-6 py-3 rounded-lg font-medium ${selectedRoom ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'} transition-colors`}
                  >
                    {selectedRoom ? 'Rezervă acum' : 'Selectează o cameră'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Utilities Tab */}
            {activeTab === 'utilities' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Facilități hotel</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {hotel.utilities.map((utility, index) => (
                    <div key={index} className="bg-[#1e3a5f] p-4 rounded-lg flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span>{utility.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-bold mb-3">Politici hotel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1e3a5f] p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Regulamente</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check-in de la 14:00
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check-out până la 12:00
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Camerele sunt nefumători
                        </li>
                      </ul>
                    </div>
                    <div className="bg-[#1e3a5f] p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Plăți acceptate</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cărți de credit/debit
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Plată online în avans
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Numerar
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Recenzii clienți</h2>
                  <button 
                    onClick={() => setShowFeedbackForm(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Adaugă recenzie
                  </button>
                </div>
                
                {/* Feedback listing */}
                <div className="space-y-6">
                  {hotel.feedback.map((item) => (
                    <div key={item.id} className="border-b border-[#2d3a4f] pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="text-xs text-gray-400">{item.date}</p>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, index) => (
                            <svg 
                              key={index} 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 ${index < item.rating ? "text-yellow-400" : "text-gray-400"}`} 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300">{item.comment}</p>
                    </div>
                  ))}
                </div>
                
                {/* Feedback form modal */}
                {showFeedbackForm && (
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#172a45] p-6 rounded-xl max-w-md w-full shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Adaugă o recenzie</h3>
                        <button onClick={() => setShowFeedbackForm(false)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <form onSubmit={handleFeedbackSubmit}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Nume</label>
                          <input
                            type="text"
                            value={newFeedback.name}
                            onChange={(e) => setNewFeedback({...newFeedback, name: e.target.value})}
                            className="w-full p-2 bg-[#1e3a5f] rounded-lg text-white border border-[#2d3a4f] focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Nota (1-5)</label>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setNewFeedback({...newFeedback, rating})}
                                className="mr-1 focus:outline-none"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`h-6 w-6 ${rating <= newFeedback.rating ? "text-yellow-400" : "text-gray-400"} hover:text-yellow-300 transition-colors`}
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <label className="block text-sm font-medium mb-2">Comentariu</label>
                          <textarea
                            value={newFeedback.comment}
                            onChange={(e) => setNewFeedback({...newFeedback, comment: e.target.value})}
                            className="w-full p-2 bg-[#1e3a5f] rounded-lg text-white border border-[#2d3a4f] focus:outline-none focus:border-blue-500 min-h-[100px]"
                            required
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowFeedbackForm(false)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            Anulează
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Trimite recenzie
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveRoom;