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
      // Check if the string might be a file path
      if (imageUrl.includes('/') || imageUrl.includes('\\')) {
        // This could be a file path - try to construct a URL based on backend
        const fileName = imageUrl.split(/[\/\\]/).pop(); // Get the filename
        return `${API_BASE_URL}/uploads/hotels/${fileName}`;
      }
      
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
  const [roomAvailability, setRoomAvailability] = useState({});
  const [checkInDate] = useState(new Date());
  const [checkOutDate] = useState(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)); // Default to 2 days from now
  

  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  

  const aedToRon = 1.2;

  const eurToRon = 4.97;


  const GOOGLE_API_KEY = import.meta.env.VITE_API_KEY || "AIzaSyA2ITzS0YozxlkFmdG7r8ZLo-rHUftwNEM";
  

  const generateRoomTypes = (basePrice) => {

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
  

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}&query_place_id=${hotel.id}`;
    window.open(url, '_blank');
  };


  useEffect(() => {
    const fetchHotelDetails = async () => {
      setLoading(true);
      
      try {
        const isGoogleId = hotelId && (hotelId.startsWith('ChI') || hotelId.startsWith('0x'));
        const isNumericId = !isNaN(parseInt(hotelId));
        const isMongoId = hotelId && /^[0-9a-fA-F]{24}$/.test(hotelId); // Check for MongoDB ObjectId format

        if (isMongoId || (!isGoogleId && !isNumericId)) {
          try {
            console.log('Fetching hotel details from database for ID:', hotelId);
            const hotelResponse = await axios.get(
              `${API_BASE_URL}/api/hotels/${hotelId}`, 
              {
                headers: isAuthenticated ? {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                } : {}
              }
            );

            if (hotelResponse.data && hotelResponse.data.success) {
              const dbHotel = hotelResponse.data.data;
              console.log('Found hotel in database:', dbHotel.name);
              
              const processed = {
                id: dbHotel._id,
                _id: dbHotel._id,
                name: dbHotel.name,
                displayName: { text: dbHotel.name },
                formattedAddress: dbHotel.location,
                location: dbHotel.location,
                photos: dbHotel.photos?.map(url => ({ name: url })) || [],
                images: dbHotel.photos?.map(url => getImageUrl(url)) || [backgr],
                rating: dbHotel.rating || 4.5,
                averageRating: dbHotel.rating || 4.5,
                userRatingCount: dbHotel.reviews?.length || 0,
                estimatedPrice: parseFloat(dbHotel.price),
                price: parseFloat(dbHotel.price),
                basePrice: parseFloat(dbHotel.price),
                editorialSummary: { text: dbHotel.description },
                description: dbHotel.description,
                internationalPhoneNumber: dbHotel.phoneNumber,
                phone: dbHotel.phoneNumber,
                type: dbHotel.propertyType,
                maxGuests: dbHotel.maxGuests,
                bedrooms: dbHotel.bedrooms,
                bathrooms: dbHotel.bathrooms,
                cancellationPolicy: dbHotel.cancellationPolicy,
                houseRules: dbHotel.houseRules,
                checkInTime: dbHotel.checkInTime,
                checkOutTime: dbHotel.checkOutTime,
                currency: dbHotel.currency || 'RON',
                rooms: dbHotel.rooms ? dbHotel.rooms.map(room => ({
                  ...room,
                  id: room._id || `room-${room.type}-${Math.random().toString(36).substring(2, 9)}`,
                  capacity: room.capacity,
                  persons: room.capacity
                })) : generateRoomTypes(parseFloat(dbHotel.price)),
                reviews: dbHotel.reviews || [],
                owner: dbHotel.owner,
                coordinates: dbHotel.coordinates,
                amenities: dbHotel.amenities,
                facilities: transformAmenities(dbHotel.amenities),
                types: dbHotel.propertyType ? [dbHotel.propertyType] : ['accommodation'],
                source: 'internal'
              };
              
              if (dbHotel.coordinates && dbHotel.coordinates.lat && dbHotel.coordinates.lng) {
                setCoordinates({
                  lat: dbHotel.coordinates.lat,
                  lng: dbHotel.coordinates.lng
                });
              }
              
              setHotel(processed);
              setLoading(false);
              return;
            }
          } catch (dbError) {
            console.error('Error fetching from database:', dbError);
          }
        }
        
        if (isGoogleId) {
          const placeDetailsResponse = await axios.get(
            `${API_BASE_URL}/api/places/${hotelId}`,
            { 
              headers: {
                'X-Goog-FieldMask': 'userRatingCount,id,displayName,photos,formattedAddress,rating,types,websiteUri,priceLevel,businessStatus,phone,internationalPhoneNumber,nationalPhoneNumber,editorialSummary,location'
              } 
            }
          );
          
          if (placeDetailsResponse.data) {
            console.log('Found hotel in Google Places API');
            
            if (placeDetailsResponse.data.location) {
              setCoordinates({
                lat: placeDetailsResponse.data.location.latitude,
                lng: placeDetailsResponse.data.location.longitude
              });
            }
            
            const price = generateHotelPrice(placeDetailsResponse.data);
            console.log("Hotel data:",placeDetailsResponse.data)
            
            const googleHotel = {
              ...placeDetailsResponse.data,
              images: placeDetailsResponse.data.photos 
                ? placeDetailsResponse.data.photos.map(photo => 
                    getImageUrl(photo, 800)
                  )
                : [backgr],
              price: price,
              basePrice: price,
              estimatedPrice: price,
              currency: 'RON',
              source: 'external',
              rooms: generateRoomTypes(price),
              facilities: transformAmenities(placeDetailsResponse.data.types),
              reviews: [],
              averageRating: placeDetailsResponse.data.rating || 4.0,
              location: placeDetailsResponse.data.address,
              description: placeDetailsResponse.data.description || 'No description available',
              phone: placeDetailsResponse.data.phone,
              internationalPhoneNumber: placeDetailsResponse.data.internationalPhoneNumber,
              nationalPhoneNumber: placeDetailsResponse.data.nationalPhoneNumber,
              website: placeDetailsResponse.data.website
            };
            setHotel(googleHotel);
            setLoading(false);
            return;
          }
        } 
        // For numeric IDs (index in the popular hotels array - legacy approach)
        else if (isNumericId) {
          const response = await axios.post(
            `${API_BASE_URL}/api/places/search-nearby`,
            {
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
            },
            { 
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.types,places.websiteUri,places.priceLevel,places.businessStatus,places.phone,places.internationalPhoneNumber,places.nationalPhoneNumber,places.editorialSummary,places.location'
              }
            }
          );
          
          if (response.data && response.data.places && response.data.places.length > 0) {
            const selectedIndex = parseInt(hotelId);
            if (selectedIndex >= 0 && selectedIndex < response.data.places.length) {
              const selectedHotel = response.data.places[selectedIndex];

              if (selectedHotel.location) {
                setCoordinates({
                  lat: selectedHotel.location.latitude,
                  lng: selectedHotel.location.longitude
                });
              }
              
              const price = generateHotelPrice(selectedHotel);
              
              const indexHotel = {
                ...selectedHotel,
                // Create images array from photos for compatibility
                images: selectedHotel.photos 
                  ? selectedHotel.photos.map(photo => 
                      getImageUrl(photo, 800)
                    )
                  : [backgr],
                price: price,
                basePrice: price,
                estimatedPrice: price,
                source: 'external',
                currency: 'RON',
                rooms: generateRoomTypes(price),
                facilities: transformAmenities(selectedHotel.types),
                reviews: [],
                averageRating: selectedHotel.rating || 4.0,
                location: selectedHotel.formattedAddress,
                description: selectedHotel.editorialSummary?.text || 'No description available',
                // Store all phone number fields
                phone: selectedHotel.phone,
                internationalPhoneNumber: selectedHotel.internationalPhoneNumber,
                nationalPhoneNumber: selectedHotel.nationalPhoneNumber,
                website: selectedHotel.websiteUri
              };
              
              setHotel(indexHotel);
        setLoading(false);
              return;
            }
          }
        }
        
        // Fallback to localStorage if all else fails
        try {
          const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
          const foundHotel = mockHotels.find(h => h.id === hotelId || h._id === hotelId);
          
          if (foundHotel) {
            console.log('Found hotel in localStorage:', foundHotel.title || foundHotel.name);
            
            const mockHotel = {
              id: foundHotel.id || foundHotel._id,
              name: foundHotel.title || foundHotel.name,
              displayName: { text: foundHotel.title || foundHotel.name },
              formattedAddress: foundHotel.address || foundHotel.location,
              location: foundHotel.address || foundHotel.location,
              photos: foundHotel.photos?.map(url => ({ name: url })) || [],
              // Create images array from photos
              images: foundHotel.photos?.length > 0 
                ? foundHotel.photos.map(url => getImageUrl(url))
                : [backgr],
              rating: foundHotel.rating || 4.5,
              averageRating: foundHotel.rating || 4.5,
              userRatingCount: 0,
              price: parseFloat(foundHotel.price),
              basePrice: parseFloat(foundHotel.price),
              estimatedPrice: parseFloat(foundHotel.price),
              editorialSummary: { text: foundHotel.description },
              description: foundHotel.description,
              coordinates: foundHotel.coordinates,
              amenities: foundHotel.amenities,
              facilities: transformAmenities(foundHotel.types),
              source: 'internal',
              currency: foundHotel.currency || 'RON',
              rooms: generateRoomTypes(parseFloat(foundHotel.price)),
              reviews: [],
              types: foundHotel.propertyType ? [foundHotel.propertyType] : ['accommodation']
            };
            
            if (foundHotel.coordinates) {
              setCoordinates(foundHotel.coordinates);
            }
            
            setHotel(mockHotel);
            setLoading(false);
            return;
          }
        } catch (localStorageError) {
          console.error('Error accessing localStorage:', localStorageError);
        }
        
        // If we reach here, the hotel was not found anywhere
        setError('Hotel not found');
        setLoading(false);
        } catch (error) {
        console.error('Error fetching hotel details:', error);
        setError('Could not load hotel details. Please try again later.');
      setLoading(false);
      }
    };
    
    if (hotelId) {
    fetchHotelDetails();
    }
  }, [hotelId, isAuthenticated]);


  useEffect(() => {
    const loadGoogleMapsScript = () => {

      if (document.getElementById('google-maps-script')) {

        if (window.google && window.google.maps) {
          initMap();
        }
        return;
      }
      

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';
      

      window.initMap = () => {
        if (hotel) {
          initMap();
        }
      };
      

      document.head.appendChild(script);
    };
    
    if (hotel) {
      loadGoogleMapsScript();
    }
    

    return () => {

      if (window.initMap) {
        window.initMap = undefined;
      }
    };
  }, [hotel, coordinates]);
  

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
      

      const marker = new window.google.maps.Marker({
        position: { lat: coordinates.lat, lng: coordinates.lng },
        map: map,
        title: hotel.name || 'Hotel Location'
      });
      

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color: #333; padding: 8px; max-width: 200px;">
                    <strong>${hotel.name || 'Hotel'}</strong>
                    <p>${hotel.location || ''}</p>
                  </div>`
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      

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
    if (!hotel.images || hotel.images.length <= 1) return;
    
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
    if (!hotel.images || hotel.images.length <= 1) return;
    
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
  

  const openLightbox = (index) => {
    if (!hotel.images || hotel.images.length <= 1) return;
    
    setLightboxImageIndex(index);
    setShowLightbox(true);

    document.body.style.overflow = 'hidden';
  };
  

  const closeLightbox = () => {
    setShowLightbox(false);
    

    document.body.style.overflow = 'auto';
  };


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
        

        try {
          const updatedReviews = await axios.get(`${API_BASE_URL}/api/reviews/hotel/${hotel.id}`);
          setHotel(prevHotel => ({
            ...prevHotel,
            reviews: updatedReviews.data.reviews || [],
            averageRating: updatedReviews.data.averageRating || prevHotel.averageRating,
            reviewCount: updatedReviews.data.reviewCount || prevHotel.reviews.length
          }));
          

          setReviewText('');
          setReviewRating(5);
          

          alert('Recenzia a fost adăugată cu succes!');
        } catch (error) {
          console.error('Error refreshing reviews:', error);
          

    setHotel(prevHotel => ({
      ...prevHotel,
      reviews: [newReview, ...prevHotel.reviews],
            averageRating: ((prevHotel.averageRating * prevHotel.reviews.length) + reviewRating) / (prevHotel.reviews.length + 1),
            reviewCount: prevHotel.reviews.length + 1
    }));
    

    setReviewText('');
    setReviewRating(5);
          

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
    // Handle both _id (MongoDB) and id (Google Places) formats
    if (room) {
      // Use room._id or room.id, whichever is available
      const roomId = room._id || room.id;
      if (roomId) {
        setSelectedRoom(roomId);
      } else {
        // If no ID is found, generate a temporary one based on room type
        const tempId = `room-${room.type}-${Date.now()}`;
        // Add the temporary ID to the room object
        room.id = tempId;
        setSelectedRoom(tempId);
      }
    } else {
      console.error('Invalid room selected:', room);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
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
    
    // Find the selected room, handling both id and _id formats
    const roomToBook = hotel.rooms.find(room => 
      room.id === selectedRoom || room._id === selectedRoom
    );
    
    if (!roomToBook) {
      console.error('Selected room not found:', selectedRoom);
      alert('Eroare la selectarea camerei. Te rugăm să încerci din nou.');
      return;
    }
    
    // Check if the room is available
    if (!roomAvailability[roomToBook.type]?.available || roomAvailability[roomToBook.type]?.availableRooms <= 0) {
      alert('Ne pare rău, această cameră nu mai este disponibilă. Te rugăm să selectezi o altă cameră.');
      return;
    }
    
    console.log('Selected room for booking:', roomToBook);
    
    // Update booking count in localStorage for API hotels
    if (hotel.source === 'external') {
      const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '{}');
      if (!bookings[hotel.id]) {
        bookings[hotel.id] = {};
      }
      if (!bookings[hotel.id][roomToBook.type]) {
        bookings[hotel.id][roomToBook.type] = 0;
      }
      bookings[hotel.id][roomToBook.type] += 1;
      localStorage.setItem('hotelBookings', JSON.stringify(bookings));
      console.log('Updated booking count in localStorage:', bookings);
    }
    
    // Prepare the room ID, using existing id or _id
    const roomId = roomToBook.id || roomToBook._id;
    
    // Get capacity from roomAvailability if available, otherwise use room data
    const roomCapacity = roomAvailability[roomToBook.type]?.capacity || 
                         roomToBook.capacity || 
                         roomToBook.persons || 
                         (roomToBook.type === 'Suite' ? 4 : 2);

    const hotelData = {
      id: hotel.id || hotel._id || hotelId,
      name: hotel?.displayName?.text || hotel?.name || 'Hotel',
      location: hotel?.formattedAddress || hotel?.location || '',
      image: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
      price: roomToBook.price, // Make sure we're using the room's price here
      rating: hotel.rating,
      phone: hotel?.phoneNumber || hotel?.phone || '',
      rooms: [
        {
          id: roomId,
          name: roomToBook.name || roomToBook.type,
          type: roomToBook.type,
          description: roomToBook.description || '',
          price: roomToBook.price, // Explicitly set the room price
          capacity: roomCapacity,
          amenities: roomToBook.amenities || ['Free WiFi', 'TV', 'AC'],
          image: roomToBook.image || (hotel.images && hotel.images.length > 0 ? hotel.images[0] : null),
          rating: roomToBook.rating || hotel.rating
        }
      ]
    };
    
    console.log('Booking hotel with data:', hotelData);
    console.log('Room price being passed:', roomToBook.price);
    console.log('Room capacity being passed:', roomCapacity);
    
    navigate('/booking', { 
      state: { 
        hotel: hotelData,
        selectedRoom: {
          id: roomId,
          name: roomToBook.name || roomToBook.type,
          type: roomToBook.type,
          price: roomToBook.price, // Explicitly include price in selectedRoom
          capacity: roomCapacity,
          description: roomToBook.description || '',
          amenities: roomToBook.amenities || ['Free WiFi', 'TV', 'AC']
        }
      } 
    });
  };


  useEffect(() => {

    if (reservationMode && !isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnUrl: `/reserve/${hotelId}`,
          message: 'Te rugăm să te autentifici pentru a face o rezervare' 
        } 
      });
    }
  }, [reservationMode, isAuthenticated, navigate, hotelId]);

  // Helper function to clear booking data (for testing/admin purposes)
  const clearBookingData = () => {
    if (window.confirm('Această acțiune va reseta toate datele de rezervare pentru acest hotel. Continuați?')) {
      const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '{}');
      if (bookings[hotel.id]) {
        delete bookings[hotel.id];
        localStorage.setItem('hotelBookings', JSON.stringify(bookings));
        alert('Datele de rezervare au fost resetate.');
        // Refresh the page to update room availability
        window.location.reload();
      } else {
        alert('Nu există date de rezervare pentru acest hotel.');
      }
    }
  };

  // Helper function to transform amenities to facilities
  const transformAmenities = (amenities) => {
    if (!amenities || !Array.isArray(amenities)) {
      return transformDefaultFacilities();
    }
    
    return amenities.map(amenity => {
      let icon;
      switch(amenity) {
        case 'wifi': icon = <FaWifi />; break;
        case 'parking': icon = <FaParking />; break;
        case 'pool': icon = <FaSwimmingPool />; break;
        case 'ac': icon = <FaSnowflake />; break;
        case 'breakfast': icon = <FaCoffee />; break;
        case 'pets': icon = <MdPets />; break;
        default: icon = <FaUtensils />; break;
      }
      return {
        name: amenity.charAt(0).toUpperCase() + amenity.slice(1),
        icon
      };
    });
  };
  
  // Default facilities when none are specified
  const transformDefaultFacilities = () => [
    { name: 'WiFi', icon: <FaWifi /> },
    { name: 'Parking', icon: <FaParking /> },
    { name: 'Restaurant', icon: <FaUtensils /> },
    { name: 'Air Conditioning', icon: <FaSnowflake /> },
    { name: 'Spa', icon: <FaSpa /> },
    { name: 'Fitness Center', icon: <FaDumbbell /> }
  ];

  // Add a function to calculate room availability deterministically based on hotel properties
  const calculateRoomAvailability = (hotel, roomType) => {
    if (!hotel) return 0;
    
    // Base availability on rating and price
    const rating = parseFloat(hotel.rating || hotel.averageRating || 4.0);
    const basePrice = parseFloat(hotel.price || hotel.basePrice || 500);
    
    // Calculate a quality score from 0-10
    let qualityScore = (rating / 5) * 10; // 0-10 scale based on rating
    
    // Adjust based on price range (higher prices might indicate more exclusive hotels with fewer rooms)
    // Prices below 300 RON get more availability, prices above 800 RON get less
    const priceAdjustment = basePrice < 300 ? 2 : basePrice > 800 ? -2 : 0;
    qualityScore += priceAdjustment;
    
    // Adjust based on room type
    let roomTypeMultiplier = 1;
    switch(roomType) {
      case 'Standard':
        roomTypeMultiplier = 0.5; // More standard rooms
        break;
      case 'Deluxe':
        roomTypeMultiplier = 0.4; // Fewer deluxe rooms
        break;
      case 'Suite':
        roomTypeMultiplier = 0.2; // Even fewer suites
        break;
      default:
        roomTypeMultiplier = 1;
    }
    
    // Calculate room count and ensure it's a whole number
    // Higher quality score = more rooms (max = qualityScore * roomTypeMultiplier)
    let calculatedRooms = Math.floor(qualityScore * roomTypeMultiplier);
    
    // Additional adjustments based on hotel type/category if available
    if (hotel.types && Array.isArray(hotel.types)) {
      // Hotels marked as "resort" or "hotel" likely have more rooms
      if (hotel.types.some(type => type.includes('resort') || type === 'hotel')) {
        calculatedRooms += 2;
      }
      // Hostels or small lodgings have fewer rooms
      if (hotel.types.some(type => type.includes('hostel') || type.includes('motel'))) {
        calculatedRooms -= 1;
      }
    }
    
    // Ensure we have a valid number (minimum 0)
    return Math.max(0, calculatedRooms);
  };

  // Add a function to check room availability
  const checkRoomsAvailability = async (hotelId, rooms) => {
    if (!hotelId || !rooms || rooms.length === 0) return;
    
    try {
      const startDate = checkInDate.toISOString().split('T')[0];
      const endDate = checkOutDate.toISOString().split('T')[0];
      const availability = {};
      
      // Check if this is an API-sourced hotel
      const isExternalHotel = hotel.source === 'external';
      
      // Check each room type
      for (const room of rooms) {
        try {
          console.log('Checking availability for room:', room.type, 'in hotel:', hotelId);
          
          if (isExternalHotel) {
            // For external API hotels, calculate availability deterministically
            const totalRooms = calculateRoomAvailability(hotel, room.type);
            
            // We'll track bookings in localStorage to simulate persistence
            const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '{}');
            const hotelBookings = bookings[hotelId] || {};
            const roomBookings = hotelBookings[room.type] || 0;
            
            // Calculate available rooms
            const availableRooms = Math.max(0, totalRooms - roomBookings);
            
            availability[room.type] = {
              available: availableRooms > 0, // Only available if there are rooms left
              price: room.price,
              totalRooms: totalRooms,
              availableRooms: availableRooms,
              capacity: room.persons || room.capacity || (room.type === 'Suite' ? 4 : 2)
            };
          } else {
            // For internal hotels, use the API
            const response = await axios.post(`${API_BASE_URL}/api/hotels/check-availability`, {
              hotelId,
              startDate,
              endDate,
              roomType: room.type,
              roomId: room._id || room.id // Send both ID formats
            });
            
            // Calculate the total available rooms
            const totalRoomCount = room.count || 0;
            const bookedRoomCount = response.data.bookedCount || 0;
            const availableRoomCount = totalRoomCount - bookedRoomCount;
            
            availability[room.type] = {
              available: response.data.available,
              price: room.price,
              totalRooms: totalRoomCount,
              availableRooms: availableRoomCount,
              capacity: room.persons || room.capacity || (room.type === 'Suite' ? 4 : 2)
            };
          }
        } catch (err) {
          console.error(`Error checking availability for room ${room.type}:`, err);
          
          // Fallback for error cases - calculate availability deterministically
          const totalRooms = calculateRoomAvailability(hotel, room.type);
          
          availability[room.type] = { 
            available: totalRooms > 0, 
            price: room.price,
            totalRooms: totalRooms,
            availableRooms: totalRooms,
            capacity: room.persons || room.capacity || (room.type === 'Suite' ? 4 : 2)
          };
        }
      }
      
      setRoomAvailability(availability);
    } catch (error) {
      console.error('Error checking room availability:', error);
    }
  };

  // Call this function after getting hotel data
  useEffect(() => {
    if (hotel && hotel.id && hotel.rooms) {
      checkRoomsAvailability(hotel.id, hotel.rooms);
    }
  }, [hotel]);

  // Add a separate effect to load reviews directly from the reviews API
  useEffect(() => {
    const fetchHotelReviews = async () => {
      if (hotel && hotel.id) {
        try {
          console.log('Fetching reviews for hotel ID:', hotel.id);
          const reviewsResponse = await axios.get(`${API_BASE_URL}/api/reviews/hotel/${hotel.id}`);
          
          if (reviewsResponse.data) {
            console.log('Loaded reviews from API:', reviewsResponse.data.reviews?.length || 0);
            setHotel(prevHotel => ({
              ...prevHotel,
              reviews: reviewsResponse.data.reviews || [],
              averageRating: reviewsResponse.data.averageRating || prevHotel.averageRating,
              reviewCount: reviewsResponse.data.reviewCount || prevHotel.reviews?.length || 0
            }));
          }
        } catch (error) {
          console.error('Error fetching hotel reviews:', error);
        }
      }
    };
    
    fetchHotelReviews();
  }, [hotel?.id]);

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
          src={(hotel.images && hotel.images.length > 0) ? getImageUrl(hotel.images[currentImageIndex]) : backgr}
          alt={hotel.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = backgr;
          }}
        />
        
        {/* Website URL and Location badge overlay for API-extracted hotels */}
        {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && (
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
            {/* Website badge - improved styling */}
            {hotel.websiteUri && (
              <a 
                href={hotel.websiteUri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-black/60 hover:bg-blue-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center transition-all border border-blue-500/30 group"
              >
                <FaGlobe className="mr-2 text-blue-400 group-hover:animate-pulse" />
                <span className="hidden sm:inline">Website oficial</span>
                <span className="sm:hidden">Website</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            
            {/* Location badge - improved styling and clickable */}
            {hotel.formattedAddress && (
              <div 
                onClick={openInGoogleMaps} 
                className="bg-black/60 hover:bg-blue-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center cursor-pointer transition-all border border-blue-500/30 group"
              >
                <FaMapMarkerAlt className="mr-2 text-red-500 group-hover:animate-bounce" />
                <span className="text-sm line-clamp-1">{hotel.formattedAddress}</span>
                <MdDirections className="ml-2 text-blue-400 group-hover:text-blue-300" />
              </div>
            )}
          </div>
        )}
        
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
                
                {/* Location with different display for API vs User-created hotels */}
                <div 
                  className={`flex items-center text-sm text-gray-200 ${(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? openInGoogleMaps : undefined}
                >
                  <FaMapMarkerAlt className="mr-1 text-red-500" />
                  <span>{(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? hotel.formattedAddress : hotel.location}</span>
                  {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && <MdDirections className="ml-1 text-blue-400" />}
                </div>
                
                {/* Website link for API-extracted hotels */}
                {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && hotel.websiteUri && (
                  <a 
                    href={hotel.websiteUri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-sm text-blue-400 mt-1 hover:text-blue-300"
                  >
                    <FaGlobe className="mr-1" />
                    <span>Website oficial</span>
                  </a>
                )}
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
        {hotel.images && hotel.images.length > 1 && (
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
        )}
        
        {/* View all images button */}
        {hotel.images && hotel.images.length > 1 && (
        <button 
          onClick={() => openLightbox(currentImageIndex)}
          className="absolute bottom-6 right-6 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm transition-all z-10"
        >
          Vezi toate imaginile ({hotel.images.length})
        </button>
        )}
        
        {/* Image counter */}
        {hotel.images && hotel.images.length > 1 && (
        <div className="absolute top-6 right-6 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
          {currentImageIndex + 1} / {hotel.images.length}
        </div>
        )}
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
        
        {/* Location with different display for API vs User-created hotels */}
        <div 
          className={`flex items-center text-sm text-gray-200 mb-2 ${(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? 'cursor-pointer hover:text-white' : ''}`}
          onClick={(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? openInGoogleMaps : undefined}
        >
          <FaMapMarkerAlt className="mr-1 text-red-500" />
          <span className="line-clamp-1">{(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) ? hotel.formattedAddress : hotel.location}</span>
          {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && <MdDirections className="ml-1 text-blue-400" />}
        </div>
        
        {/* Website link for API-extracted hotels */}
        {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && hotel.websiteUri && (
          <a 
            href={hotel.websiteUri} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-sm text-blue-400 mb-2 hover:text-blue-300"
          >
            <FaGlobe className="mr-1" />
            <span className="line-clamp-1">{hotel.websiteUri.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        
        {/* Phone for API-extracted hotels */}
        {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && hotel.internationalPhoneNumber && (
          <a 
            href={`tel:${hotel.internationalPhoneNumber}`} 
            className="flex items-center text-sm text-gray-200 mb-2 hover:text-blue-300"
          >
            <FaPhoneAlt className="mr-1 text-blue-400" />
            <span>{hotel.internationalPhoneNumber}</span>
          </a>
        )}
        
        <div className="mt-2 bg-blue-900/50 px-4 py-2 rounded-lg inline-block shadow-sm">
          <div className="text-sm text-gray-200">Preț de la</div>
          <div className="text-xl font-bold text-green-400">
            {hotel.price || hotel.basePrice} RON
            <span className="text-sm font-normal text-gray-300"> / noapte</span>
          </div>
        </div>
      </div>
      
      {/* Thumbnail gallery */}
      {hotel.images && hotel.images.length > 0 && (
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
                src={getImageUrl(image)} 
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
      )}

      {/* Lightbox/Image Modal */}
      {showLightbox && hotel.images && hotel.images.length > 0 && (
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
                src={getImageUrl(hotel.images[lightboxImageIndex])} 
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
                    src={getImageUrl(image)} 
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
              
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-blue-300">Disponibilitate camere</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">
                    Perioada: {checkInDate.toLocaleDateString('ro-RO')} - {checkOutDate.toLocaleDateString('ro-RO')}
                  </div>
                  
                  {/* Admin reset button removed */}
                </div>
              </div>
              
              <div className="space-y-4">
                {hotel.rooms && hotel.rooms.map((room, index) => {
                  // Use either _id or id, whichever is available
                  const roomId = room._id || room.id || `room-${index}`;
                  
                  // Check if room has availability
                  const roomHasAvailability = roomAvailability[room.type] && 
                                              roomAvailability[room.type].available &&
                                              roomAvailability[room.type].totalRooms > 0;
                  
                  // Skip rooms with zero availability
                  if (!roomHasAvailability) {
                    return null;
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-xl transition-all ${
                        selectedRoom === roomId
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-gray-700 bg-[#112240] hover:border-blue-400'
                      }`}
                      onClick={() => handleRoomSelect(room)}
                    >
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="mb-4 md:mb-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-lg font-medium mr-3">{room.type}</h3>
                            <span className="bg-gray-700/70 text-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                              <BiUser className="mr-1" />
                              Max. {room.capacity || room.persons || 2} {(room.capacity || room.persons || 2) === 1 ? 'persoană' : 'persoane'}
                            </span>
                            
                            {roomAvailability[room.type] && (
                              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                                roomAvailability[room.type].available ? 'bg-green-600/70 text-green-100' : 'bg-red-600/70 text-red-100'
                              }`}>
                                {roomAvailability[room.type].available ? (
                                  <>{roomAvailability[room.type].availableRooms} / {roomAvailability[room.type].totalRooms} disponibile</>
                                ) : (
                                  'Indisponibil'
                                )}
                              </span>
                            )}
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
                        
                        <div className="text-center md:text-right">
                          <p className="text-gray-400 text-sm">Preț pe noapte</p>
                          <p className="text-2xl font-bold text-white">{room.price} RON</p>
                          
                          {roomAvailability[room.type] && roomAvailability[room.type].available && roomAvailability[room.type].availableRooms <= 3 && (
                            <p className="text-amber-400 text-xs mt-1">
                              {roomAvailability[room.type].availableRooms === 1 
                                ? 'Ultima cameră disponibilă!' 
                                : `Doar ${roomAvailability[room.type].availableRooms} camere rămase!`
                              }
                            </p>
                          )}
                          
                          {selectedRoom === roomId && (
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
                  );
                })}
                
                {!hotel.rooms?.some(room => 
                  roomAvailability[room.type] && 
                  roomAvailability[room.type].available &&
                  roomAvailability[room.type].totalRooms > 0
                ) && (
                  <div className="text-center py-8 border border-gray-700 rounded-xl bg-[#112240]">
                    <p className="text-gray-400">Nu există camere disponibile pentru perioada selectată.</p>
                    <p className="text-gray-400 mt-2">Vă rugăm să reveniți mai târziu sau să încercați alte date.</p>
                  </div>
                )}
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
                        <div className="mt-2 font-medium">
                          {hotel.rooms.find(r => r._id === selectedRoom || r.id === selectedRoom)?.type || 'Standard'}
                        </div>
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
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-700 flex items-center justify-between">
                  Informații contact
                  
                  {/* Official Hotel badge for API-extracted hotels */}
                  {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full flex items-center">
                      <FaGlobe className="mr-1" size={12} />
                      Sursă oficială
                    </span>
                  )}
                </h2>
                
                <div className="space-y-4">
                  {/* Phone Numbers - Show all available phone numbers */}
                  {(hotel.phone || hotel.internationalPhoneNumber || hotel.nationalPhoneNumber) && (
                    <div className="flex items-start group p-2 rounded-lg hover:bg-blue-900/20 transition-colors">
                      <div className="flex items-center justify-center bg-blue-900/30 rounded-full p-2 text-blue-400 mr-3">
                        <FaPhoneAlt />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-300 mb-1">Telefon:</div>
                        
                        {/* International Phone Number */}
                        {hotel.internationalPhoneNumber && (
                          <a href={`tel:${hotel.internationalPhoneNumber}`} className="group-hover:text-blue-400 transition-colors flex items-center mb-1">
                            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded mr-2">Internațional</span>
                            {hotel.internationalPhoneNumber}
                            <span className="ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </span>
                          </a>
                        )}
                        
                        {/* Regular Phone */}
                        {hotel.phone && hotel.phone !== hotel.internationalPhoneNumber && (
                          <a href={`tel:${hotel.phone}`} className="group-hover:text-blue-400 transition-colors flex items-center mb-1">
                            {!hotel.internationalPhoneNumber && <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded mr-2">Principal</span>}
                            {hotel.phone}
                            <span className="ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </span>
                          </a>
                        )}
                        
                        {/* National Phone Number */}
                        {hotel.nationalPhoneNumber && 
                         hotel.nationalPhoneNumber !== hotel.internationalPhoneNumber && 
                         hotel.nationalPhoneNumber !== hotel.phone && (
                          <a href={`tel:${hotel.nationalPhoneNumber}`} className="group-hover:text-blue-400 transition-colors flex items-center">
                            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded mr-2">Național</span>
                            {hotel.nationalPhoneNumber}
                            <span className="ml-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Website */}
                  {(hotel.website || hotel.websiteUri) && (
                    <div className="flex items-start group p-2 rounded-lg hover:bg-blue-900/20 transition-colors">
                      <div className="flex items-center justify-center bg-blue-900/30 rounded-full p-2 text-blue-400 mr-3">
                        <FaGlobe />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm text-gray-300 mb-1">Website oficial:</div>
                        <a 
                          href={hotel.website || hotel.websiteUri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-words overflow-hidden flex items-center"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {(hotel.website || hotel.websiteUri).replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </span>
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Location */}
                  <div className="flex items-start group p-2 rounded-lg hover:bg-blue-900/20 transition-colors">
                    <div className="flex items-center justify-center bg-blue-900/30 rounded-full p-2 text-blue-400 mr-3">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-300 mb-1">Adresă:</div>
                      <div>
                        {/* Show formattedAddress for API hotels, or location for user-created hotels */}
                        {(hotel.source === 'external' || (hotel.id && (hotel.id.startsWith('ChI') || hotel.id.startsWith('0x')))) 
                          ? hotel.formattedAddress 
                          : hotel.location}
                      </div>
                      <button 
                        onClick={openInGoogleMaps}
                        className="mt-2 text-sm text-blue-400 hover:underline flex items-center"
                      >
                        <MdDirections className="mr-1" />
                        Vezi pe Google Maps
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


HotelDetailPage.defaultProps = {
  reservationMode: false
};

export default HotelDetailPage;