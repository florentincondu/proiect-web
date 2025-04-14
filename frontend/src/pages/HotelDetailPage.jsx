import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaWifi, FaSwimmingPool, FaParking, FaCoffee, FaUtensils, FaSpa, FaDumbbell, FaConciergeBell, FaBath, FaSnowflake, FaMapMarkerAlt, FaPhoneAlt, FaGlobe, FaRegCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import { MdPets, MdAirportShuttle, MdRoomService, MdLocalLaundryService, MdOutlineCleaningServices, MdDirections } from 'react-icons/md';
import { IoArrowBack, IoArrowForward, IoClose } from 'react-icons/io5';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { BiUser } from 'react-icons/bi';
import { useAuth } from '../context/authContext';
import backgroundImage from '../assets/backgr.webp';
import backgr from '../assets/start.avif';
import { generateHotelPrice } from '../utils/priceUtils';
import ReviewItem from '../components/ReviewItem';

// Add API_BASE_URL constant
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const HotelDetailPage = ({ reservationMode }) => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [coordinates, setCoordinates] = useState({ lat: 44.4268, lng: 26.1025 }); // Default Bucharest coordinates
  
  // Add state for lightbox/image modal
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  
  // Exchange rate (approximate): 1 AED ≈ 1.2 RON
  const aedToRon = 1.2;
  // EUR to RON conversion for pricing
  const eurToRon = 4.97;

  // Google API Key
  const GOOGLE_API_KEY = import.meta.env.VITE_API_KEY || "AIzaSyA2ITzS0YozxlkFmdG7r8ZLo-rHUftwNEM";
  
  // Function to generate photo URL from Google Places API
  const getPhotoUrl = (photoReference, maxWidth = 800, maxHeight = null) => {
    if (!photoReference || !photoReference.name) return backgr;
    
    // Use our backend proxy instead of direct Google API call
    let url = `http://localhost:5000/api/places/media/${encodeURIComponent(photoReference.name)}?`;
    
    // Add dimension parameters
    if (maxWidth) {
      url += `maxWidthPx=${maxWidth}`;
    }
    
    if (maxHeight) {
      url += `&maxHeightPx=${maxHeight}`;
    }
    
    console.log('Generated photo URL:', url);
    return url;
  };
  
  // Function to generate room types based on hotel data
  const generateRoomTypes = (basePrice) => {
    // Round base price to nearest 10 for consistency
    const roundedBasePrice = Math.round(basePrice / 10) * 10;
    
    return [
      { 
        id: 1, 
        type: "Standard", 
        price: roundedBasePrice, 
        persons: 2,
        description: "Cameră confortabilă cu un pat dublu sau două paturi simple",
        amenities: ["TV", "Minibar", "Aer condiționat", "Baie privată"]
      },
      { 
        id: 2, 
        type: "Deluxe", 
        price: Math.round((roundedBasePrice * 1.5) / 10) * 10, 
        persons: 2,
        description: "Cameră spațioasă cu vedere panoramică și facilități premium",
        amenities: ["TV LCD", "Minibar", "Aer condiționat", "Baie de lux", "Balcon", "Halat și papuci"]
      },
      { 
        id: 3, 
        type: "Suite", 
        price: Math.round((roundedBasePrice * 2.5) / 10) * 10, 
        persons: 4,
        description: "Suită de lux cu dormitor separat și zonă de living",
        amenities: ["TV LCD", "Minibar", "Aer condiționat", "Baie de lux", "Balcon", "Halat și papuci", "Room service 24/7", "Jacuzzi"]
      },
    ];
  };
  
  // Function to open location in Google Maps
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}&query_place_id=${hotel.id}`;
    window.open(url, '_blank');
  };

  // Fetch hotel data from Google Places API
  useEffect(() => {
    const fetchHotelDetails = async () => {
      setLoading(true);
      
      try {
        const requestData = {
          includedTypes: ["lodging"],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: 44.4268,
                longitude: 26.1025
              },
              radius: 5000.0
            }
          }
        };
        
        const headers = {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.types,places.websiteUri,places.priceLevel,places.businessStatus,places.internationalPhoneNumber,places.editorialSummary,places.location'
        };
        
        if (hotelId && hotelId.startsWith('ChI')) {
          const placeDetailsResponse = await axios.get(
            `/api/places/${hotelId}`,
            { 
              headers: {
                'X-Goog-FieldMask': 'userRatingCount,id,displayName,photos,formattedAddress,rating,types,websiteUri,priceLevel,businessStatus,internationalPhoneNumber,editorialSummary,location'
              } 
            }
          );
          console.log(placeDetailsResponse.data);
          
          if (placeDetailsResponse.data) {
            if (placeDetailsResponse.data.location) {
              setCoordinates({
                lat: placeDetailsResponse.data.location.latitude,
                lng: placeDetailsResponse.data.location.longitude
              });
            }
            processHotelData(placeDetailsResponse.data);
          } else {
            throw new Error('Nu s-au putut găsi detaliile hotelului.');
          }
        } else {
          const response = await axios.post(
            '/api/places/search-nearby',
            requestData,
            { headers }
          );
          
          if (response.data && response.data.places && response.data.places.length > 0) {
            const selectedIndex = parseInt(hotelId);
            if (selectedIndex >= 0 && selectedIndex < response.data.places.length) {
              const selectedHotel = response.data.places[selectedIndex];
              
              // Extract coordinates if available
              if (selectedHotel.location) {
                setCoordinates({
                  lat: selectedHotel.location.latitude,
                  lng: selectedHotel.location.longitude
                });
              }
              
              processHotelData(selectedHotel);
            } else {
              setError('Hotel negăsit - index invalid');
            }
          } else {
            setError('Nu sunt hoteluri disponibile');
          }
        }
        
        
      } catch (error) {
        console.error('Eroare la obținerea detaliilor hotelului:', error);
        setError('Nu s-au putut obține detaliile hotelului. Vă rugăm să încercați din nou mai târziu.');
        setLoading(false);
      }
    };
    
    // Funcție pentru procesarea datelor hotelului și setarea stării
    const processHotelData = async (selectedHotel) => {
      // Logging pentru debugging
      console.log('Processing hotel data:', selectedHotel);
      
      // Check if this is actually our database hotel instead of Places API
      let dbHotel = null;
      let hotelPrice = 0;
      
      if (selectedHotel._id) {
        try {
          // This is already a hotel from our database
          dbHotel = selectedHotel;
          hotelPrice = dbHotel.price || generateHotelPrice(selectedHotel);
          
          // Get up-to-date price from the API
          const hotelResponse = await axios.get(`${API_BASE_URL}/api/hotels/${dbHotel._id}`);
          if (hotelResponse.data.success) {
            dbHotel = hotelResponse.data.data;
            hotelPrice = dbHotel.price || generateHotelPrice(selectedHotel);
          }
        } catch (error) {
          console.warn('Could not fetch updated hotel data:', error);
          hotelPrice = generateHotelPrice(selectedHotel);
        }
      } else {
        // This is likely a Google Places API hotel
        // Try to get saved price from database
        try {
          const savedPricesResponse = await axios.get(`${API_BASE_URL}/api/places/prices`);
          if (savedPricesResponse.data.success) {
            const savedPrice = savedPricesResponse.data.prices.find(
              price => price.placeId === selectedHotel.id
            );
            
            if (savedPrice) {
              console.log('Found saved price:', savedPrice.price);
              hotelPrice = savedPrice.price;
            } else {
              console.log('No saved price found, generating new price');
              hotelPrice = generateHotelPrice(selectedHotel);
            }
          } else {
            console.log('No saved prices available, generating new price');
            hotelPrice = generateHotelPrice(selectedHotel);
          }
        } catch (error) {
          console.warn('Could not fetch saved prices:', error);
          hotelPrice = generateHotelPrice(selectedHotel);
        }
      }
      
      // Ensure we have a valid price
      if (!hotelPrice || hotelPrice === 0) {
        console.log('Price was 0 or invalid, generating new price');
        hotelPrice = generateHotelPrice(selectedHotel);
      }
      
      console.log('Final hotel price:', hotelPrice);
      
      // Generate room types if needed - ensure prices are numbers
      const roomTypes = dbHotel?.rooms || generateRoomTypes(hotelPrice);
      console.log('Room types with prices:', roomTypes);
      
      // Make sure all room prices are valid numbers
      const validatedRoomTypes = roomTypes.map(room => ({
        ...room,
        price: typeof room.price === 'number' && !isNaN(room.price) ? room.price : hotelPrice
      }));
      
      // Create default data for missing parts
      const defaultFacilities = [
        { name: "Wi-Fi gratuit", icon: <FaWifi /> },
        { name: "Piscină", icon: <FaSwimmingPool /> },
        { name: "Parcare gratuită", icon: <FaParking /> },
        { name: "Mic dejun inclus", icon: <FaCoffee /> },
        { name: "Restaurant", icon: <FaUtensils /> },
        { name: "Spa & Wellness", icon: <FaSpa /> },
        { name: "Sală de fitness", icon: <FaDumbbell /> },
        { name: "Concierge 24/7", icon: <FaConciergeBell /> },
        { name: "Pet friendly", icon: <MdPets /> },
        { name: "Transfer aeroport", icon: <MdAirportShuttle /> }
      ];
      
      // Default reviews if none exist
      const defaultReviews = dbHotel?.reviews || [
        { id: 1, author: "Maria P.", rating: 5, comment: "O experiență minunată! Personalul a fost foarte amabil și camera impecabilă.", date: "10 Februarie 2025" },
        { id: 2, author: "Alexandru M.", rating: 4, comment: "Foarte mulțumit de servicii și facilități. Micul dejun ar putea fi îmbunătățit.", date: "28 Ianuarie 2025" },
        { id: 3, author: "Elena D.", rating: 5, comment: "Unul dintre cele mai bune hoteluri din această zonă! Recomand cu încredere.", date: "15 Ianuarie 2025" }
      ];
      
      // Prepare images
      const hotelImages = dbHotel?.photos 
        ? dbHotel.photos 
        : selectedHotel.photos && selectedHotel.photos.length > 0
          ? selectedHotel.photos.map(photo => getPhotoUrl(photo))
          : [backgr];
      
      // Set the hotel data with consistent property names
      const processedHotel = {
        id: dbHotel?._id || selectedHotel.id || hotelId,
        name: dbHotel?.name || selectedHotel.displayName?.text || selectedHotel.name || "Hotel necunoscut",
        location: dbHotel?.location || selectedHotel.formattedAddress || selectedHotel.address || "Locație necunoscută",
        description: dbHotel?.description || selectedHotel.editorialSummary?.text || selectedHotel.description || 
                    "Acest hotel oferă facilități excelente și servicii de calitate pentru oaspeți. Bucurați-vă de o experiență plăcută într-o locație convenabilă.",
        basePrice: hotelPrice,
        price: hotelPrice,
        rooms: validatedRoomTypes,
        facilities: defaultFacilities,
        images: hotelImages,
        reviews: defaultReviews,
        averageRating: dbHotel?.rating || selectedHotel.rating || 4.5,
        phoneNumber: selectedHotel.internationalPhoneNumber || selectedHotel.nationalPhoneNumber || selectedHotel.phone || "+40 21 123 4567",
        website: selectedHotel.websiteUri || selectedHotel.website || null,
        types: selectedHotel.types || []
      };
      
      // Fetch reviews for this hotel if ID exists
      if (processedHotel.id) {
        try {
          console.log('Fetching reviews for hotel ID:', processedHotel.id);
          const reviewsResponse = await axios.get(`${API_BASE_URL}/api/reviews/hotel/${processedHotel.id}`);
          console.log('Reviews response:', reviewsResponse.data);
          
          // Check if we have a valid response
          if (reviewsResponse.data) {
            // Default values in case data is missing
            let reviews = [];
            let avgRating = processedHotel.averageRating;
            let reviewCount = 0;
            
            // Safely access reviews data with try-catch blocks
            try {
              if (Array.isArray(reviewsResponse.data.reviews)) {
                reviews = reviewsResponse.data.reviews;
                reviewCount = reviews.length;
              }
            } catch (e) {
              console.error('Error processing reviews array:', e);
            }
            
            try {
              if (typeof reviewsResponse.data.averageRating === 'number') {
                avgRating = reviewsResponse.data.averageRating;
              }
            } catch (e) {
              console.error('Error processing average rating:', e);
            }
            
            try {
              if (typeof reviewsResponse.data.reviewCount === 'number') {
                reviewCount = reviewsResponse.data.reviewCount;
              }
            } catch (e) {
              console.error('Error processing review count:', e);
            }
            
            // Update the hotel object with the processed data
            processedHotel.reviews = reviews;
            processedHotel.averageRating = avgRating;
            processedHotel.reviewCount = reviewCount;
          }
        } catch (error) {
          console.error('Error fetching reviews:', error);
          console.error('Error details:', error.response?.data || 'No detailed error');
          // Use empty reviews array as fallback
          processedHotel.reviews = [];
        }
      }
      
      setHotel(processedHotel);
      setLoading(false);
    };
    
    fetchHotelDetails();
  }, [hotelId, GOOGLE_API_KEY]);

  // Load the Google Maps script dynamically
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if script already exists
      if (document.getElementById('google-maps-script')) {
        // If script exists, just initialize the map
        if (window.google && window.google.maps) {
          initMap();
        }
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';
      
      // Define the callback function globally
      window.initMap = () => {
        if (hotel) {
          initMap();
        }
      };
      
      // Append script to document
      document.head.appendChild(script);
    };
    
    if (hotel) {
      loadGoogleMapsScript();
    }
    
    // Cleanup function
    return () => {
      // Remove the global callback when component unmounts
      if (window.initMap) {
        window.initMap = undefined;
      }
    };
  }, [hotel, coordinates]);
  
  // Function to initialize Google Maps
  const initMap = () => {
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      const mapElement = document.getElementById('hotel-map');
      if (mapElement) {
        mapElement.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-800/80">
            <div class="text-center p-4">
              <div class="text-red-400 text-3xl mb-3">⚠️</div>
              <p class="text-gray-200">Could not load Google Maps</p>
              <p class="text-sm text-gray-400 mt-2">Please check API key permissions or try again later.</p>
            </div>
          </div>
        `;
      }
      return;
    }
    
    const mapElement = document.getElementById('hotel-map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }
    
    try {
      const map = new window.google.maps.Map(mapElement, {
        center: { lat: coordinates.lat, lng: coordinates.lng },
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }
        ]
      });
      
      // Add marker at hotel location
      const marker = new window.google.maps.Marker({
        position: { lat: coordinates.lat, lng: coordinates.lng },
        map: map,
        title: hotel.name || 'Hotel Location'
      });
      
      // Add info window when marker is clicked
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color: #333; padding: 8px; max-width: 200px;">
                    <strong>${hotel.name || 'Hotel'}</strong>
                    <p>${hotel.location || ''}</p>
                  </div>`
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      // Initially open the info window
      infoWindow.open(map, marker);
      
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      const mapElement = document.getElementById('hotel-map');
      if (mapElement) {
        mapElement.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-800/80">
            <div class="text-center p-4">
              <div class="text-red-400 text-3xl mb-3">⚠️</div>
              <p class="text-gray-200">Error loading map</p>
              <p class="text-sm text-gray-400 mt-2">${error.message || 'Unknown error'}</p>
            </div>
          </div>
        `;
      }
    }
  };

  const handlePrevImage = () => {
    if (showLightbox) {
      setLightboxImageIndex((prevIndex) => 
        prevIndex === 0 ? hotel.images.length - 1 : prevIndex - 1
      );
    } else {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? hotel.images.length - 1 : prevIndex - 1
      );
    }
  };

  const handleNextImage = () => {
    if (showLightbox) {
      setLightboxImageIndex((prevIndex) => 
        prevIndex === hotel.images.length - 1 ? 0 : prevIndex + 1
      );
    } else {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === hotel.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };
  
  // Open lightbox with clicked image
  const openLightbox = (index) => {
    setLightboxImageIndex(index);
    setShowLightbox(true);
    
    // Disable scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  };
  
  // Close lightbox
  const closeLightbox = () => {
    setShowLightbox(false);
    
    // Re-enable scrolling
    document.body.style.overflow = 'auto';
  };

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showLightbox) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLightbox]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Te rugăm să te conectezi pentru a posta o recenzie.');
      navigate('/login', { 
        state: { 
          returnUrl: `/hotel/${hotelId}`,
          message: 'Te rugăm să te autentifici pentru a posta o recenzie' 
        } 
      });
      return;
    }
    
    if (reviewText.trim() === '') {
      alert('Vă rugăm să introduceți un comentariu pentru recenzie.');
      return;
    }
    
    try {
      console.log('Submitting review for hotel ID:', hotel.id);
      
      const response = await axios.post(`${API_BASE_URL}/api/reviews`, {
        hotelId: hotel.id,
      rating: reviewRating,
      comment: reviewText,
        title: 'Review pentru ' + hotel.name
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data) {
        // Add the new review to the reviews list
        const newReview = {
          _id: response.data._id,
          rating: response.data.rating,
          comment: response.data.comment,
          createdAt: response.data.createdAt,
          user: {
            _id: response.data.user._id,
            name: response.data.user.name
          }
        };
        
        // Refresh the reviews from the server to get updated data
        try {
          const updatedReviews = await axios.get(`${API_BASE_URL}/api/reviews/hotel/${hotel.id}`);
          setHotel(prevHotel => ({
            ...prevHotel,
            reviews: updatedReviews.data.reviews || [],
            averageRating: updatedReviews.data.averageRating || prevHotel.averageRating,
            reviewCount: updatedReviews.data.reviewCount || prevHotel.reviews.length
          }));
          
          // Reset form
          setReviewText('');
          setReviewRating(5);
          
          // Show success message
          alert('Recenzia a fost adăugată cu succes!');
        } catch (error) {
          console.error('Error refreshing reviews:', error);
          
          // If refresh fails, manually add the new review
    setHotel(prevHotel => ({
      ...prevHotel,
      reviews: [newReview, ...prevHotel.reviews],
            averageRating: ((prevHotel.averageRating * prevHotel.reviews.length) + reviewRating) / (prevHotel.reviews.length + 1),
            reviewCount: prevHotel.reviews.length + 1
    }));
    
    // Reset form
    setReviewText('');
    setReviewRating(5);
          
          // Show success message
          alert('Recenzia a fost adăugată cu succes!');
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      console.error('Error details:', error.response?.data || 'No error details');
      alert('A apărut o eroare la trimiterea recenziei. Vă rugăm să încercați din nou.');
    }
  };

  const handleRoomSelect = (room) => {
    console.log('Selected room:', room);
    if (room && room.id) {
    setSelectedRoom(room.id);
    } else {
      console.error('Invalid room selected:', room);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      // Redirect to login page with a return URL
      navigate('/login', { 
        state: { 
          returnUrl: `/reserve/${hotelId}`, 
          message: 'Te rugăm să te autentifici pentru a face o rezervare' 
        } 
      });
      return;
    }
    
    if (!selectedRoom) {
      alert('Te rugăm să selectezi o cameră pentru a continua');
      return;
    }
    
    // Find the selected room object from hotel rooms
    const roomToBook = hotel.rooms.find(room => room.id === selectedRoom);
    
    if (!roomToBook) {
      console.error('Selected room not found:', selectedRoom);
      alert('Eroare la selectarea camerei. Te rugăm să încerci din nou.');
      return;
    }
    
    console.log('Selected room for booking:', roomToBook);
    
    // Prepare hotel data for booking flow
    const hotelData = {
      id: hotel.id || hotelId,
      name: hotel?.displayName?.text || hotel?.name || 'Hotel',
      location: hotel?.formattedAddress || hotel?.location || '',
      image: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
      price: roomToBook.price, // Make sure we're using the room's price here
      rating: hotel.rating,
      // Add phone if available
      phone: hotel?.phoneNumber || hotel?.phone || '',
      // Create rooms array with the selected room
      rooms: [
        {
          id: roomToBook.id,
          name: roomToBook.name || roomToBook.type,
          type: roomToBook.type,
          description: roomToBook.description || '',
          price: roomToBook.price, // Explicitly set the room price
          capacity: roomToBook.capacity || 2,
          amenities: roomToBook.amenities || ['Free WiFi', 'TV', 'AC'],
          image: roomToBook.image || (hotel.images && hotel.images.length > 0 ? hotel.images[0] : null),
          rating: roomToBook.rating || hotel.rating
        }
      ]
    };
    
    console.log('Booking hotel with data:', hotelData);
    console.log('Room price being passed:', roomToBook.price);
    
    // Navigate to booking flow with hotel data and pre-selected room
    navigate('/booking', { 
      state: { 
        hotel: hotelData,
        selectedRoom: {
          id: roomToBook.id,
          name: roomToBook.name || roomToBook.type,
          type: roomToBook.type,
          price: roomToBook.price, // Explicitly include price in selectedRoom
          capacity: roomToBook.capacity || 2,
          description: roomToBook.description || '',
          amenities: roomToBook.amenities || ['Free WiFi', 'TV', 'AC']
        }
      } 
    });
  };

  // useEffect to check reservation mode
  useEffect(() => {
    // If reservationMode is true but user is not authenticated, redirect to login
    if (reservationMode && !isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnUrl: `/reserve/${hotelId}`,
          message: 'Te rugăm să te autentifici pentru a face o rezervare' 
        } 
      });
    }
  }, [reservationMode, isAuthenticated, navigate, hotelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Eroare</h2>
        <p className="mb-6">{error || 'Hotel negăsit'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Înapoi
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0a192f] text-white min-h-screen">
      {/* Hero Image Section */}
      <div className="relative h-[40vh] md:h-[50vh] lg:h-[60vh] overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[#0a192f] opacity-90"></div>
        <img
          src={hotel.images[currentImageIndex]}
          alt={hotel.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = backgr;
          }}
        />
        
        {/* Hotel info overlay - desktop */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 px-6 py-6 bg-gradient-to-t from-[#0a192f] to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-md mb-2">{hotel.name}</h1>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < Math.floor(hotel.averageRating) ? (
                          <AiFillStar />
                        ) : i < hotel.averageRating ? (
                          <AiFillStar className="opacity-60" />
                        ) : (
                          <AiOutlineStar />
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm">{hotel.averageRating.toFixed(1)} ({hotel.reviews.length} recenzii)</span>
                </div>
                <div className="flex items-center text-sm text-gray-200">
                  <FaMapMarkerAlt className="mr-1 text-red-500" />
                  <span>{hotel.location}</span>
                </div>
              </div>
              <div className="bg-blue-900/70 backdrop-blur-sm px-6 py-3 rounded-lg shadow-xl">
                <div className="text-sm text-gray-200">Preț de la</div>
                <div className="text-2xl font-bold text-green-400">
                  {hotel.price || hotel.basePrice} RON
                  <span className="text-sm font-normal text-gray-300"> / noapte</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Image gallery controls */}
        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between px-4">
          <button 
            onClick={handlePrevImage}
            className="bg-black/30 hover:bg-black/50 rounded-full p-2 backdrop-blur-sm transition-all"
          >
            <IoArrowBack className="text-white/90" />
          </button>
          <button 
            onClick={handleNextImage}
            className="bg-black/30 hover:bg-black/50 rounded-full p-2 backdrop-blur-sm transition-all"
          >
            <IoArrowForward className="text-white/90" />
          </button>
        </div>
        
        {/* View all images button */}
        <button 
          onClick={() => openLightbox(currentImageIndex)}
          className="absolute bottom-6 right-6 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm transition-all z-10"
        >
          Vezi toate imaginile ({hotel.images.length})
        </button>
        
        {/* Image counter */}
        <div className="absolute top-6 right-6 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
          {currentImageIndex + 1} / {hotel.images.length}
        </div>
      </div>
      
      {/* Hotel info overlay - mobile */}
      <div className="md:hidden px-4 py-4 -mt-6 bg-[#0a192f] rounded-t-3xl relative z-10 border-t border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">{hotel.name}</h1>
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400 mr-2">
            {[...Array(5)].map((_, i) => (
              <span key={i}>
                {i < Math.floor(hotel.averageRating) ? (
                  <AiFillStar />
                ) : i < hotel.averageRating ? (
                  <AiFillStar className="opacity-60" />
                ) : (
                  <AiOutlineStar />
                )}
              </span>
            ))}
          </div>
          <span className="text-sm">{hotel.averageRating.toFixed(1)} ({hotel.reviews.length} recenzii)</span>
        </div>
        <div className="flex items-center text-sm text-gray-200">
          <FaMapMarkerAlt className="mr-1 text-red-500" />
          <span>{hotel.location}</span>
        </div>
        <div className="mt-2 bg-blue-900/50 px-4 py-2 rounded-lg inline-block shadow-sm">
          <div className="text-sm text-gray-200">Preț de la</div>
          <div className="text-xl font-bold text-green-400">
            {hotel.price || hotel.basePrice} RON
            <span className="text-sm font-normal text-gray-300"> / noapte</span>
          </div>
        </div>
      </div>
      
      {/* Thumbnail gallery */}
      <div className="max-w-6xl mx-auto px-4 mt-6 mb-6">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {hotel.images.slice(0, 6).map((image, index) => (
            <div 
              key={index} 
              className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden cursor-pointer ${
                index === currentImageIndex ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => setCurrentImageIndex(index)}
            >
              <img 
                src={image} 
                alt={`${hotel.name} imagine ${index + 1}`} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = backgr;
                }}
              />
            </div>
          ))}
          {hotel.images.length > 6 && (
            <div 
              className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden cursor-pointer bg-blue-900/50 flex items-center justify-center"
              onClick={() => openLightbox(5)}
            >
              <div className="text-center">
                <span className="text-sm">+{hotel.images.length - 6}</span>
                <p className="text-xs mt-1">Mai multe</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox/Image Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center p-4">
          <button 
            onClick={closeLightbox}
            className="absolute top-4 right-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors z-10"
            aria-label="Close image viewer"
          >
            <IoClose size={24} />
          </button>
          
          <div className="w-full max-w-4xl mx-auto">
            {/* Main image */}
            <div className="relative aspect-video">
              <img 
                src={hotel.images[lightboxImageIndex]} 
                alt={`${hotel.name} - Imagine full size ${lightboxImageIndex + 1}`} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = backgr;
                }}
              />
              
              {/* Navigation buttons */}
              <button 
                onClick={() => setLightboxImageIndex((prev) => (prev === 0 ? hotel.images.length - 1 : prev - 1))}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 rounded-full p-3 text-white hover:bg-black/70 transition-colors"
                aria-label="Previous image"
              >
                <IoArrowBack size={24} />
              </button>
              <button 
                onClick={() => setLightboxImageIndex((prev) => (prev === hotel.images.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 rounded-full p-3 text-white hover:bg-black/70 transition-colors"
                aria-label="Next image"
              >
                <IoArrowForward size={24} />
              </button>
            </div>
            
            {/* Image counter */}
            <div className="absolute bottom-20 left-0 right-0 text-center text-white">
              {lightboxImageIndex + 1} / {hotel.images.length}
            </div>
            
            {/* Thumbnails */}
            <div className="flex justify-center mt-4 space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
              {hotel.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`w-16 h-16 flex-shrink-0 cursor-pointer rounded-md overflow-hidden ${
                    index === lightboxImageIndex ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'}`}
                  onClick={() => setLightboxImageIndex(index)}
                >
                  <img 
                    src={image} 
                    alt={`Thumbnail ${index + 1}`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = backgr;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-2">
        {/* Main columns container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Hotel Info */}
          <div className="lg:col-span-2">
            {/* Quick info badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              {hotel.types && hotel.types.slice(0, 3).map((type, index) => (
                <span key={index} className="bg-blue-900/60 text-blue-200 px-3 py-1 rounded-full text-sm">
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
              
              {hotel.phone && (
                <a 
                  href={`tel:${hotel.phone}`} 
                  className="bg-green-900/60 text-green-200 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  <FaPhoneAlt className="mr-1" size={12} />
                  Contact
                </a>
              )}
              
              <button
                onClick={openInGoogleMaps}
                className="bg-red-900/60 text-red-200 px-3 py-1 rounded-full text-sm flex items-center"
              >
                <FaMapMarkerAlt className="mr-1" size={12} />
                Vezi pe hartă
              </button>
            </div>

            {/* Description */}
            <div className="mb-8 bg-[#112240] rounded-xl p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-700">Despre hotel</h2>
              <p className="text-gray-300 leading-relaxed">{hotel.description}</p>
            </div>

            {/* Facilities */}
            <div className="mb-8 bg-[#112240] rounded-xl p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700">Facilități</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {hotel.facilities.map((facility, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-blue-400 mr-2">{facility.icon}</span>
                    <span className="text-gray-200">{facility.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Types */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700">Tipuri de camere</h2>
              <div className="space-y-4">
                {hotel.rooms && hotel.rooms.map((room, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-xl transition-all ${
                      selectedRoom === room.id
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-700 bg-[#112240] hover:border-blue-400'
                    }`}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium mr-3">{room.type}</h3>
                          <span className="bg-gray-700/70 text-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                            <BiUser className="mr-1" />
                            Max. {room.persons} {room.persons === 1 ? 'persoană' : 'persoane'}
                          </span>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm text-gray-300">{room.description}</p>
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            {room.amenities && room.amenities.map((amenity, i) => (
                              <span key={i} className="text-xs bg-gray-700/60 px-2 py-0.5 rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <div className="bg-blue-900/40 px-4 py-2 rounded-xl">
                          <div className="font-bold text-lg text-green-400">{room.price} RON</div>
                          <p className="text-xs text-gray-400">pe noapte</p>
                        </div>
                        
                        {selectedRoom === room.id && (
                          <button
                            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm flex items-center"
                            onClick={handleBookNow}
                          >
                            <FaRegCalendarAlt className="mr-2" />
                            Rezervă acum
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700">Locație</h2>
              <div className="aspect-video relative rounded-xl overflow-hidden shadow-lg">
                <div 
                  id="hotel-map" 
                  className="w-full h-full bg-gray-800"
                >
                  {/* Map will be rendered here by Google Maps API */}
                </div>
                <button
                  onClick={openInGoogleMaps}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg flex items-center text-sm"
                >
                  <MdDirections className="mr-2" />
                  Vezi pe Google Maps
                </button>
              </div>
            </div>

            {/* Reviews */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700 flex items-center">
                <span>Recenzii</span>
                <span className="ml-2 bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-full text-sm">
                  {hotel.reviews.length}
                </span>
              </h2>
              
              {/* Add review form */}
              <div className="mb-6 border border-gray-700 rounded-xl p-5 bg-[#112240]">
                <h3 className="text-lg font-medium mb-3">Adaugă o recenzie</h3>
                <form onSubmit={handleSubmitReview}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Evaluare</label>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-2xl text-yellow-400 focus:outline-none"
                        >
                          {star <= reviewRating ? <AiFillStar /> : <AiOutlineStar />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="reviewText" className="block text-sm font-medium mb-1">Comentariu</label>
                    <textarea
                      id="reviewText"
                      rows="3"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Împărtășește-ți experiența..."
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Publică recenzia
                  </button>
                </form>
              </div>
              
              {/* Review list */}
              <div className="space-y-4">
                {hotel.reviews && hotel.reviews.length > 0 ? (
                  hotel.reviews.map((review) => (
                    <ReviewItem key={review._id} review={review} hotelId={hotel.id} />
                  ))
                ) : (
                  <div className="text-center p-6 bg-[#112240] rounded-xl">
                    <p className="text-gray-400">Nu există recenzii pentru acest hotel încă. Fii primul care adaugă o recenzie!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Booking & Info */}
          <div className="lg:mt-0 mt-6">
            {/* Sticky Booking Card */}
            <div className="sticky top-4">
              <div className="bg-[#112240] rounded-xl border border-gray-700 p-5 shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700">Rezervare</h2>
                
                {/* Login prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800/50 rounded-lg">
                    <p className="text-sm mb-2">Trebuie să fii conectat pentru a face o rezervare.</p>
                    <button
                      onClick={() => navigate('/login', { 
                        state: { 
                          returnUrl: `/hotel/${hotelId}`,
                          message: 'Te rugăm să te autentifici pentru a rezerva o cameră' 
                        } 
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors"
                    >
                      Autentificare
                    </button>
                  </div>
                )}
                
                {/* Selected room display */}
                {selectedRoom ? (
                  <div className="p-4 mb-4 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur rounded-lg border border-blue-500/70 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-blue-300 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                          Camera selectată
                        </h3>
                        <div className="mt-2 font-medium">{hotel.rooms.find(r => r.id === selectedRoom)?.type || 'Standard'}</div>
                        <div className="flex items-center mt-2 bg-blue-500/20 rounded-full px-3 py-1 w-fit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-300 font-medium">
                            {(() => {
                              const selectedRoomData = hotel.rooms.find(r => r.id === selectedRoom);
                              const price = selectedRoomData ? selectedRoomData.price : 0;
                              return isNaN(price) ? '0' : Math.round(price);
                            })()} RON/noapte
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border mb-4 rounded-lg border-gray-700 bg-gray-800/50">
                    <p className="text-gray-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Te rugăm să alegi o cameră din lista de mai sus.
                    </p>
                  </div>
                )}
                
                {/* Book Now button */}
                {isAuthenticated && (
                  <button 
                    onClick={handleBookNow}
                    disabled={!selectedRoom}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center ${
                      selectedRoom 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-600/30' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    } transition-all`}
                  >
                    {selectedRoom ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Rezervă acum
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        Selectează o cameră
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Hotel Info Card */}
              <div className="bg-[#112240] rounded-xl border border-gray-700 p-5 shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700">Informații contact</h2>
                
                <div className="space-y-4">
                  {hotel.phone && (
                    <div className="flex items-start">
                      <FaPhoneAlt className="text-blue-400 mt-1 mr-3" />
                      <div>
                        <div className="text-sm text-gray-300 mb-1">Telefon:</div>
                        <a href={`tel:${hotel.phone}`} className="hover:text-blue-400 transition-colors">
                          {hotel.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {hotel.website && (
                    <div className="flex items-start">
                      <FaGlobe className="text-blue-400 mt-1 mr-3 flex-shrink-0" />
                      <div className="w-full overflow-hidden">
                        <div className="text-sm text-gray-300 mb-1">Website:</div>
                        <a 
                          href={hotel.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-words overflow-hidden"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {hotel.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <FaMapMarkerAlt className="text-blue-400 mt-1 mr-3" />
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Adresă:</div>
                      <div>{hotel.location}</div>
                      <button 
                        onClick={openInGoogleMaps}
                        className="mt-2 text-sm text-blue-400 hover:underline flex items-center"
                      >
                        <MdDirections className="mr-1" />
                        Indicații rutiere
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Weather or other widgets can go here */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer before footer */}
      <div className="h-8"></div>
      
      {/* Footer */}
      <footer className="bg-[#0c1527] border-t border-gray-800 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Boksy</h3>
              <p className="text-gray-400">Descoperă cele mai bune hoteluri din România la prețuri avantajoase.</p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Link-uri rapide</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/" className="hover:text-white transition-colors">Acasă</a></li>
                <li><a href="/shop" className="hover:text-white transition-colors">Shop</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">Despre noi</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Contact</h4>
              <address className="text-gray-400 not-italic">
                <p>București, România</p>
                <p className="mt-2">Email: contact@boksy.ro</p>
                <p>Telefon: +40 721 234 567</p>
              </address>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Boksy. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Set default props
HotelDetailPage.defaultProps = {
  reservationMode: false
};

export default HotelDetailPage;