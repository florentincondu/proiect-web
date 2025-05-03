import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import backgroundImage from '../assets/backgr.webp';
import backgr from '../assets/start.avif';
import { useAuth } from '../context/authContext'
import { ChevronLeft, ChevronRight, Search, Calendar, Users, Map, Star, Menu, X, Heart, Hotel, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHotelPrice } from '../utils/priceUtils';
import { FaUser } from 'react-icons/fa';
import NotificationBell from '../components/NotificationBell';
import TermsOfService from '../components/termsOfservice';

const HomePage = () => {
  // Define getFormattedDate function before it's used
  const getFormattedDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  const [showModal, setShowModal] = useState(false);
  const [popularHotels, setPopularHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoriteHotels, setFavoriteHotels] = useState({});
  const [activeFilters, setActiveFilters] = useState([]);
  const [priceRange, setPriceRange] = useState([200, 2000]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredHotelId, setHoveredHotelId] = useState(null);
  const [checkInDate, setCheckInDate] = useState(getFormattedDate(1));
  const [checkOutDate, setCheckOutDate] = useState(getFormattedDate(8));
  const [guestCount, setGuestCount] = useState(2);
  
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  
  const searchRef = useRef(null);
  const filterRef = useRef(null);
  
  const API_BASE_URL = 'http://localhost:5000';

  const requestData = {
    includedTypes: ["lodging"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: 44.4268,
          longitude: 26.1025
        },
        radius: 10000.0
      }
    }
  };
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-FieldMask': 'places.userRatingCount,places.dineIn,places.allowsDogs,places.currentOpeningHours,places.curbsidePickup,places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.types,places.websiteUri,places.priceLevel,places.businessStatus,places.priceRange'
  };

  const filterOptions = [
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'pets', label: 'Pet Friendly' },
    { id: 'wifi', label: 'Free WiFi' },
    { id: 'breakfast', label: 'Breakfast Included' },
    { id: 'parking', label: 'Free Parking' },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterRef]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowModal(true);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const fetchPopularHotels = async () => {
      setLoading(true);
      try {
        // Attempt to fetch hotels from external API
        let apiHotels = [];
        try {
        const response = await axios.post(
          `${API_BASE_URL}/api/places/search-nearby`,
          requestData,
          { headers }
        );
        console.log("API response received:", response.data);
        
        if (response.data && response.data.places) {
          console.log("Number of hotels from API:", response.data.places.length);
            apiHotels = response.data.places.map(hotel => ({
            ...hotel,
            estimatedPrice: generateHotelPrice(hotel),
            amenities: {
              pool: Math.random() > 0.5,
              pets: Math.random() > 0.7,
              wifi: Math.random() > 0.2,
              breakfast: Math.random() > 0.6,
              parking: Math.random() > 0.4,
              },
              source: 'external'
            }));
          }
        } catch (apiError) {
          console.error('Error fetching hotels from API:', apiError);
          apiHotels = [];
        }

        // Fetch user hotels from backend
        let userHotels = [];
        try {
          const userHotelsResponse = await axios.get(
            `${API_BASE_URL}/api/hotels`,
            {
              headers: isAuthenticated ? {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              } : {}
            }
          );
          
          if (userHotelsResponse.data && userHotelsResponse.data.success) {
            const approvedHotels = userHotelsResponse.data.data.filter(hotel => 
              hotel.status === 'approved' || hotel.status === 'active'
            );
            
            userHotels = approvedHotels.map(hotel => ({
              id: hotel._id,
            displayName: {
                text: hotel.name
            },
              formattedAddress: hotel.location,
            photos: hotel.photos?.length > 0 ? hotel.photos.map(url => ({ name: url })) : [],
            rating: hotel.rating || 4.5,
              userRatingCount: hotel.reviews?.length || Math.floor(Math.random() * 100) + 10,
            estimatedPrice: parseFloat(hotel.price),
            currency: hotel.currency || 'RON',
              amenities: hotel.amenities?.reduce((obj, amenity) => {
                obj[amenity] = true; 
                return obj;
              }, {}) || {
              wifi: true,
              parking: true,
              breakfast: true
            },
              coordinates: hotel.coordinates,
              source: 'internal',
              description: hotel.description
            }));
          }
        } catch (userHotelsError) {
          console.error('Error fetching user hotels:', userHotelsError);
          
          // Fallback to localStorage if API fails
        try {
          const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
            console.log("Using mock hotels from localStorage:", mockHotels.length);

            const approvedMockHotels = mockHotels.filter(hotel => hotel.status === 'approved');
            
            userHotels = approvedMockHotels.map(hotel => ({
              id: hotel.id,
              displayName: {
                text: hotel.title
              },
              formattedAddress: hotel.address,
              photos: hotel.photos?.length > 0 ? hotel.photos.map(url => ({ name: url })) : [],
              rating: hotel.rating || 4.5,
              userRatingCount: Math.floor(Math.random() * 100) + 10,
              estimatedPrice: parseFloat(hotel.price),
              currency: hotel.currency || 'RON',
              amenities: hotel.amenities || {
                wifi: true,
                parking: true,
                breakfast: true
              },
              source: 'internal',
              description: hotel.description,
              coordinates: hotel.coordinates
            }));
          } catch (localStorageError) {
            console.error('Error accessing localStorage:', localStorageError);
            userHotels = [];
          }
        }
            
        // Combine both API and user hotels
        const combinedHotels = [...apiHotels, ...userHotels];
        setPopularHotels(combinedHotels);
            
        // Initialize image indexes
            const initialIndexes = {};
        combinedHotels.forEach((hotel) => {
              initialIndexes[hotel.id] = 0;
            });
            setCurrentImageIndexes(initialIndexes);
            
        setLoading(false);
      } catch (error) {
        console.error('Error fetching hotels:', error);
            setError('Failed to fetch popular hotels. Please try again later.');
        setLoading(false);
      }
    };

    fetchPopularHotels();
  }, [isAuthenticated]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      console.log('Admin user detected on homepage. Redirecting to dashboard.');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const getPhotoUrl = (photoReference, maxWidth = 400, maxHeight = null) => {
    if (photoReference && typeof photoReference === 'string') {
      return photoReference;
    }

    if (photoReference && typeof photoReference.name === 'string' && 
        (photoReference.name.startsWith('http://') || photoReference.name.startsWith('https://'))) {
      return photoReference.name;
    }
    
    if (!photoReference || !photoReference.name) return backgr;

    let url = `http://localhost:5000/api/places/media/${encodeURIComponent(photoReference.name)}?`;

    if (maxWidth) {
      url += `maxWidthPx=${maxWidth}`;
    }
    
    if (maxHeight) {
      url += `&maxHeightPx=${maxHeight}`;
    }
    
    return url;
  };

  const navigateImage = (hotelId, direction, event) => {
    if (event) {
    event.stopPropagation(); // Prevent triggering hotel click
      event.preventDefault();
    }
    
    const hotel = popularHotels.find(h => h.id === hotelId);
    if (!hotel || !hotel.photos || hotel.photos.length <= 1) return;
    
    setCurrentImageIndexes(prev => {
      const currentIndex = prev[hotelId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % hotel.photos.length;
      } else {
        newIndex = (currentIndex - 1 + hotel.photos.length) % hotel.photos.length;
      }
      
      return { ...prev, [hotelId]: newIndex };
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      setError('Please enter a location to search');
      return;
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      setError('Please select valid dates');
      return;
    }

    if (checkIn < today) {
      setError('Check-in date cannot be in the past');
      return;
    }

    if (checkOut <= checkIn) {
      setError('Check-out date must be after check-in date');
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      console.log(`Starting search for: "${query}" (${checkInDate} to ${checkOutDate}, ${guestCount} guests)`);

      const formattedQuery = query.toLowerCase().includes('hotel') 
        ? query  // If query already contains "hotel", use it as-is
        : `hotels in ${query}`; // Otherwise, add "hotels in" prefix
      
      console.log(`Using formatted query: "${formattedQuery}"`);
      
      // First, search for hotels using the external API
      let apiHotels = [];
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/places/search-text`,
          {
            textQuery: formattedQuery
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
            }
          }
        );

        console.log(`Search complete. Found ${response.data.places?.length || 0} results from API`);

        if (response.data.places && response.data.places.length > 0) {
          apiHotels = response.data.places.map(hotel => ({
            ...hotel,
            estimatedPrice: generateHotelPrice(hotel),
            amenities: {
              pool: Math.random() > 0.5,
              pets: Math.random() > 0.7,
              wifi: Math.random() > 0.2,
              breakfast: Math.random() > 0.6,
              parking: Math.random() > 0.4,
            },
            source: 'external'
          }));
        }
      } catch (apiError) {
        console.error('Error searching external API:', apiError);
      }
      
      // Second, search for hotels in our database
      let userHotels = [];
      try {
        // Search in our own database using the same query
        const userHotelsResponse = await axios.get(
          `${API_BASE_URL}/api/hotels/search?query=${encodeURIComponent(query)}`,
          {
            headers: isAuthenticated ? {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            } : {}
          }
        );
        
        if (userHotelsResponse.data && userHotelsResponse.data.success) {
          console.log(`Found ${userHotelsResponse.data.data.length} hotels in database`);
          
          const approvedHotels = userHotelsResponse.data.data.filter(hotel => 
            hotel.status === 'approved' || hotel.status === 'active'
          );
          
          userHotels = approvedHotels.map(hotel => ({
            id: hotel._id,
            displayName: {
              text: hotel.name
            },
            formattedAddress: hotel.location,
            photos: hotel.photos?.length > 0 ? hotel.photos.map(url => ({ name: url })) : [],
            rating: hotel.rating || 4.5,
            userRatingCount: hotel.reviews?.length || Math.floor(Math.random() * 100) + 10,
            estimatedPrice: parseFloat(hotel.price),
            currency: hotel.currency || 'RON',
            amenities: hotel.amenities?.reduce((obj, amenity) => {
              obj[amenity] = true; 
              return obj;
            }, {}) || {
              wifi: true,
              parking: true,
              breakfast: true
            },
            source: 'internal',
            description: hotel.description,
            coordinates: hotel.coordinates
          }));
        }
      } catch (dbError) {
        console.error('Error searching database:', dbError);
        
        // Fallback to localStorage if API fails
        try {
          const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
          
          if (mockHotels.length > 0) {
            const searchTerms = query.toLowerCase().split(' ');
            const filteredMockHotels = mockHotels.filter(hotel => {
              const hotelNameLower = hotel.title.toLowerCase();
              const hotelAddressLower = hotel.address.toLowerCase();
              return searchTerms.some(term => 
                hotelNameLower.includes(term) || hotelAddressLower.includes(term)
              );
            });
            
            const approvedMockHotels = filteredMockHotels.filter(hotel => hotel.status === 'approved');
            
            userHotels = approvedMockHotels.map(hotel => ({
              id: hotel.id,
              displayName: {
                text: hotel.title
              },
              formattedAddress: hotel.address,
              photos: hotel.photos?.length > 0 ? hotel.photos.map(url => ({ name: url })) : [],
              rating: hotel.rating || 4.5,
              userRatingCount: Math.floor(Math.random() * 100) + 10,
              estimatedPrice: parseFloat(hotel.price),
              currency: hotel.currency || 'RON',
              amenities: hotel.amenities || {
                wifi: true,
                parking: true,
                breakfast: true
              },
              source: 'internal',
              description: hotel.description,
              coordinates: hotel.coordinates
            }));
          }
        } catch (localStorageError) {
          console.error('Error accessing localStorage:', localStorageError);
        }
      }
      
      // Combine results from both sources
      const combinedResults = [...apiHotels, ...userHotels];
      
      if (combinedResults.length > 0) {
        console.log(`Combined search results: ${combinedResults.length} hotels`);
        
        // Store search parameters in sessionStorage
        const searchParams = {
          query,
          checkInDate,
          checkOutDate,
          guestCount,
          results: combinedResults
        };
        
        sessionStorage.setItem('searchParams', JSON.stringify(searchParams));
        
        setSearchQuery('');

        // Navigate to search results page with all search parameters
        navigate('/search-results', {
          state: {
            searchQuery: query,
            checkInDate,
            checkOutDate,
            guestCount,
            results: combinedResults
          },
          replace: true // Use replace to prevent adding to history stack
        });
      } else {
        setError('No hotels found in this location');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Error performing search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCityClick = (city) => {
    console.log('City clicked:', city);
    setSearchQuery(city);
    if (searchRef.current) {
      searchRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFavorite = (hotelId, event) => {
    event.stopPropagation();
    setFavoriteHotels(prev => ({
      ...prev,
      [hotelId]: !prev[hotelId]
    }));
  };

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleRatingSelect = (rating) => {
    setSelectedRating(rating === selectedRating ? 0 : rating);
  };

  const handleGuestContinue = () => {
    setShowModal(false);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewAllHotels = () => {
    navigate('/popularhotels');
  };

  const handleHotelClick = (hotelId) => {
    navigate(`/hotel/${hotelId}`);
  };

  const handleBookNow = (hotelId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnUrl: `/reserve/${hotelId}`,
          message: 'Te rugăm să te autentifici pentru a face o rezervare' 
        } 
      });
      return;
    }

    navigate(`/reserve/${hotelId}`);
  };

  const filteredHotels = popularHotels
    .filter(hotel => {
      if (selectedRating > 0 && (!hotel.rating || hotel.rating < selectedRating)) {
        return false;
      }

      if (activeFilters.length > 0) {
        return activeFilters.every(filter => hotel.amenities && hotel.amenities[filter]);
      }
      
      return true;
    })
    .filter(hotel => {
      return hotel.estimatedPrice >= priceRange[0] && hotel.estimatedPrice <= priceRange[1];
    });

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    hover: { scale: 1.03, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white overflow-x-hidden">
      {/* Hero Section with Background Image and Parallax Effect */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            filter: "brightness(0.5)" 
          }}
        ></div>
        
        {/* Navbar */}
        <header className="relative z-40 flex justify-between items-center p-4 md:p-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-xl md:text-2xl font-bold flex items-center">
            <span className="text-blue-400 mr-1">B</span>oksy
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            <a 
              onClick={() => isAuthenticated ? navigate('/my-bookings') : navigate('/login', { state: { returnUrl: '/my-bookings' } })} 
              className="font-medium hover:text-blue-400 transition-colors cursor-pointer"
            >
              Your Bookings
            </a>
            <a href="/contact-us" className="font-medium hover:text-blue-400 transition-colors">Contact Us</a>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <NotificationBell />
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
                  >
                    <FaUser />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                >
                  Login
                </button>
              )}
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden z-50" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                />
              <motion.div 
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ duration: 0.3 }}
                  className="fixed top-0 right-0 h-full w-72 bg-[#0a192f]/95 backdrop-blur-md shadow-xl z-50 flex flex-col p-6 border-l border-blue-500/30"
                >
                  <div className="flex justify-between items-center mb-8">
                    <div className="text-xl font-bold">
                      <span className="text-blue-400 mr-1">B</span>oksy
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)}>
                      <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-6 mt-6">
                    {user && (
                      <div className="bg-[#172a45] p-4 rounded-lg mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <FaUser size={16} />
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <NotificationBell />
                        </div>
                      </div>
                    )}
                    
                    <a 
                      onClick={() => {
                        if (isAuthenticated) {
                          navigate('/my-bookings');
                        } else {
                          navigate('/login', { state: { returnUrl: '/my-bookings' } });
                        }
                        setMobileMenuOpen(false);
                      }} 
                      className="font-medium hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-3 py-2"
                    >
                      <Clock size={18} />
                    Your Bookings
                  </a>
                    
                    {isAuthenticated && (
                      <a 
                        onClick={() => {
                          navigate('/profile');
                          setMobileMenuOpen(false);
                        }} 
                        className="font-medium hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-3 py-2"
                      >
                        <FaUser size={18} />
                        Profile
                      </a>
                    )}
                    
                    <a 
                      onClick={() => {
                        navigate('/popularhotels');
                        setMobileMenuOpen(false);
                      }} 
                      className="font-medium hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-3 py-2"
                    >
                      <Hotel size={18} />
                      All Hotels
                    </a>
                    
                    <a 
                      onClick={() => {
                        navigate('/contact-us');
                        setMobileMenuOpen(false);
                      }} 
                      className="font-medium hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-3 py-2"
                    >
                      <Info size={18} />
                      Contact Us
                    </a>
                    
                    <div className="mt-auto pt-4 border-t border-gray-700">
                  {isAuthenticated && !authLoading ? (
                    <button 
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full font-medium bg-red-500 hover:bg-red-600 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                      Logout
                    </button>
                  ) : (
                    <button 
                          onClick={() => {
                            navigate('/login');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full font-medium bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                          </svg>
                      Login
                    </button>
                  )}
                    </div>
                </div>
              </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        {/* Hero Content with Staggered Animation */}
        <div className="relative z-10 p-6 md:p-12 lg:p-24 flex flex-col h-[90vh] justify-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-2 md:mb-4 text-shadow">
              Enjoy Your <span className="text-blue-400">Dream</span> Vacation
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <p className="text-lg md:text-xl mb-8 text-shadow">Boksy: Easy stays, global adventures</p>
          </motion.div>
          
          {/* Search Bar */}
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="backdrop-blur-lg bg-[#0a192f]/80 p-4 md:p-6 rounded-xl w-full max-w-6xl mx-auto border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col relative">
                  <label className="mb-2 text-sm md:text-base flex items-center">
                    <Map size={16} className="mr-2 text-blue-400" />
                    Location
                  </label>
                  <input 
                    type="text" 
                    placeholder="Where are you going?" 
                    className="p-2 md:p-3 bg-[#172a45] rounded-lg text-sm md:text-base border border-transparent focus:border-blue-500 transition-colors outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-2 text-sm md:text-base flex items-center">
                    <Calendar size={16} className="mr-2 text-blue-400" />
                    Check in
                  </label>
                  <input 
                    type="date" 
                    placeholder="Add dates" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={getFormattedDate(0)}
                    className="p-2 md:p-3 bg-[#172a45] rounded-lg text-sm md:text-base border border-transparent focus:border-blue-500 transition-colors outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-2 text-sm md:text-base flex items-center">
                    <Calendar size={16} className="mr-2 text-blue-400" />
                    Check out
                  </label>
                  <input 
                    type="date" 
                    placeholder="Add dates" 
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate}
                    className="p-2 md:p-3 bg-[#172a45] rounded-lg text-sm md:text-base border border-transparent focus:border-blue-500 transition-colors outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-2 text-sm md:text-base flex items-center">
                    <Users size={16} className="mr-2 text-blue-400" />
                    Guests
                  </label>
                  <select 
                    className="p-2 md:p-3 bg-[#172a45] rounded-lg text-sm md:text-base border border-transparent focus:border-blue-500 transition-colors outline-none"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    required
                  >
                    <option value="1">1 guest</option>
                    <option value="2">2 guests</option>
                    <option value="3">3 guests</option>
                    <option value="4">4 guests</option>
                    <option value="5">5 guests</option>
                    <option value="6">6+ guests</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <motion.button 
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-lg"
                >
                  <Search size={20} />
                </motion.button>
              </div>
              {error && (
                <p className="mt-2 text-red-400 text-sm">{error}</p>
              )}
            </form>
          </motion.div>
          
          {/* Floating cards with popular destinations */}
          <div className="mt-12 flex flex-wrap justify-center gap-4 relative z-10">
            {['București', 'Cluj', 'Brașov', 'Constanța'].map((city, index) => (
              <motion.div
                key={city}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + (index * 0.1) }}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}
                className="bg-[#172a45]/80 backdrop-blur-md p-3 rounded-lg cursor-pointer border border-blue-500/30 shadow-lg"
                onClick={() => handleCityClick(city)}
              >
                <span className="font-medium">{city}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Popular Hotels Section with Filters */}
      <div className="py-12 md:py-16 px-4 md:px-8 bg-[#0a192f]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">
            Hoteluri Populare în <span className="text-blue-400">România</span>
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mb-8">Descoperă cele mai apreciate locații pentru un sejur de neuitat în România. Rezervă acum și bucură-te de experiențe memorabile!</p>
        
          {/* Filter Section */}
          <div className="w-full max-w-4xl mb-8">
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <div ref={filterRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-[#172a45] hover:bg-[#1e3a5f] px-4 py-2 rounded-full flex items-center gap-2 border border-blue-500/30"
                >
                  <Info size={16} />
                  Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
                </motion.button>
                
                {/* Filter dropdown */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 mt-2 p-4 bg-[#172a45] rounded-lg shadow-xl z-10 w-64 border border-blue-500/30"
                    >
                      <div className="mb-4">
                        <p className="font-medium mb-2">Amenities</p>
                        <div className="space-y-2">
                          {filterOptions.map(filter => (
                            <label key={filter.id} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeFilters.includes(filter.id)}
                                onChange={() => toggleFilter(filter.id)}
                                className="mr-2 accent-blue-500"
                              />
                              {filter.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-medium mb-2">Minimum Rating</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(rating => (
                            <button
                              key={rating}
                              onClick={() => handleRatingSelect(rating)}
                              className={`p-1 ${selectedRating >= rating ? 'text-yellow-400' : 'text-gray-400'}`}
                            >
                              <Star size={16} fill={selectedRating >= rating ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium mb-2">Price Range (RON)</p>
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="range"
                            min="200"
                            max="3000"
                            step="100"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                            className="w-full accent-blue-500"
                          />
                          <span>{priceRange[0]}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="range"
                            min="200"
                            max="3000"
                            step="100"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="w-full accent-blue-500"
                          />
                          <span>{priceRange[1]}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveFilters([]);
                          setSelectedRating(0);
                          setPriceRange([200, 2000]);
                        }}
                        className="mt-4 text-blue-400 text-sm hover:underline"
                      >
                        Reset all filters
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#172a45] hover:bg-[#1e3a5f] px-4 py-2 rounded-full flex items-center gap-2 border border-blue-500/30"
              >
                <Hotel size={16} />
                Hoteluri
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#172a45] hover:bg-[#1e3a5f] px-4 py-2 rounded-full flex items-center gap-2 border border-blue-500/30"
              >
                <Clock size={16} />
                Last Minute
              </motion.button>
            </div>
            
            {/* Filter Pills */}
            {(activeFilters.length > 0 || selectedRating > 0) && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {activeFilters.map(filter => {
                  const filterOption = filterOptions.find(opt => opt.id === filter);
                  return (
                    <span key={filter} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                      {filterOption?.label}
                      <button 
                        onClick={() => toggleFilter(filter)} 
                        className="ml-2 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
                
                {selectedRating > 0 && (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                    {selectedRating}+ <Star size={14} className="ml-1" fill="currentColor" />
                    <button 
                      onClick={() => setSelectedRating(0)} 
                      className="ml-2 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative w-24 h-24">
              <div className="absolute top-0 left-0 right-0 bottom-0 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
              <div className="absolute top-3 left-3 right-3 bottom-3 animate-spin rounded-full border-t-2 border-b-2 border-white animate-ping" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && !loading && (
          <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-red-400 mb-6 p-4 bg-red-500/10 rounded-lg max-w-xl mx-auto"
        >
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 text-sm underline hover:text-white"
          >
            Dismiss
          </button>
        </motion.div>
      )}
      
      {/* No results message */}
      {!loading && !error && filteredHotels.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl mb-4">No hotels match your current filters</p>
          <button 
            onClick={() => {
              setActiveFilters([]);
              setSelectedRating(0);
              setPriceRange([200, 2000]);
            }}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Reset all filters
          </button>
        </div>
      )}
      
      {/* Hotel Grid */}
      {!loading && !error && filteredHotels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredHotels.slice(0, 8).map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              variants={cardVariants}
              transition={{ delay: index * 0.1 }}
              className="bg-[#172a45] rounded-lg overflow-hidden shadow-lg border border-blue-500/20 cursor-pointer relative h-full flex flex-col"
              onClick={() => handleHotelClick(hotel.id)}
              onMouseEnter={() => setHoveredHotelId(hotel.id)}
              onMouseLeave={() => setHoveredHotelId(null)}
            >
              {/* Image */}
              <div className="relative h-36 overflow-hidden">
                {hotel.photos && hotel.photos.length > 0 ? (
                  <img 
                    src={getPhotoUrl(hotel.photos[currentImageIndexes[hotel.id] || 0])} 
                    alt={hotel.displayName?.text || 'Hotel image'} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                ) : (
                  <img 
                    src={backgr} 
                    alt="Default hotel" 
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Navigation arrows */}
                {hotel.photos && hotel.photos.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigateImage(hotel.id, 'prev', e);
                      }}
                      className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 rounded-full p-1.5 transition-colors z-20"
                    >
                      <ChevronLeft size={16} className="text-white" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigateImage(hotel.id, 'next', e);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 rounded-full p-1.5 transition-colors z-20"
                    >
                      <ChevronRight size={16} className="text-white" />
                    </button>
                  </>
                )}
                
                {/* Favorite button */}
                <button
                  onClick={(e) => toggleFavorite(hotel.id, e)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-1.5 rounded-full transition-colors"
                >
                  <Heart 
                    size={16} 
                    fill={favoriteHotels[hotel.id] ? 'currentColor' : 'none'} 
                    className={favoriteHotels[hotel.id] ? 'text-red-500' : 'text-white'}
                  />
                </button>
                
                {/* Rating badge */}
                <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-0.5 flex items-center text-xs">
                  <Star size={12} className="text-yellow-400 mr-1" fill="currentColor" />
                  <span>{hotel.rating ? hotel.rating.toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
                
              {/* Content */}
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-base truncate mb-1">{hotel.displayName?.text}</h3>
                
                <p className="text-gray-400 text-xs mb-2 line-clamp-1">
                  {hotel.formattedAddress || 'Address information not available'}
                </p>
                
                {/* Amenities */}
                <div className="flex flex-wrap gap-1 mb-2 mt-auto">
                  {hotel.amenities?.wifi && (
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-xs">WiFi</span>
                  )}
                  {hotel.amenities?.pool && (
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-xs">Pool</span>
                  )}
                  {hotel.amenities?.breakfast && (
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-xs">Breakfast</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <span className="text-base font-bold">{hotel.estimatedPrice} RON</span>
                    <span className="text-xs text-gray-400 block">per night</span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleBookNow(hotel.id, e)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  >
                    Book Now
                  </motion.button>
                </div>
              </div>
              
              {/* Hover overlay with quick details */}
              {hoveredHotelId === hotel.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end justify-center p-3 opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-xs text-center text-white">Click to see details</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      
      {!loading && !error && filteredHotels.length > 8 && (
        <div className="flex justify-center mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleViewAllHotels}
            className="bg-transparent text-blue-400 hover:text-blue-300 px-6 py-2 rounded-full border border-blue-500 hover:border-blue-400 transition-colors"
          >
            View all hotels
          </motion.button>
        </div>
      )}
    </div>
    
    {/* Why Choose Us Section */}
    <div className="py-16 px-4 md:px-8 bg-[#0a192f]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Why Choose <span className="text-blue-400">Boksy</span></h2>
          <p className="text-gray-400 max-w-2xl mx-auto">We make your travel experience seamless and memorable with these exclusive benefits.</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              title: "Best Price Guarantee",
              description: "Find a lower price? We'll match it and give you an additional 10% off.",
              icon: "💰"
            },
            {
              title: "No Booking Fees",
              description: "We don't charge any booking fees, so you get the best deal every time.",
              icon: "🎁"
            },
            {
              title: "24/7 Customer Support",
              description: "Our team is available round the clock to assist with any questions or issues.",
              icon: "🌟"
            },
            {
              title: "Flexible Cancellation",
              description: "Plans change? No problem. Many of our hotels offer free cancellation.",
              icon: "📅"
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
              className="bg-[#172a45] rounded-xl p-6 text-center border border-blue-500/30 shadow-lg"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Footer */}
    <footer className="py-12 px-4 md:px-8 bg-gradient-to-b from-[#0a192f] to-[#020c1b] border-t border-blue-900/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="text-blue-400 mr-1">B</span>oksy
            </h3>
            <p className="text-gray-400 mb-6">Discover the perfect stay for your next adventure.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#172a45] hover:bg-blue-500 text-gray-400 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#172a45] hover:bg-blue-500 text-gray-400 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-[#172a45] hover:bg-blue-500 text-gray-400 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 3.979-.05 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-3.979-.06-1.064-.05-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-5 text-white">Essential Pages</h3>
            <ul className="space-y-4">
              <li>
                <a href="/about-us" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact-us" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/terms-of-service" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-5 text-white">Get in Touch</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-400">15 Victoriei Street</p>
                  <p className="text-gray-400">Bucharest, Romania</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400">support@boksy.com</p>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <p className="text-gray-400">+40 721 234 567</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom footer */}
        <div className="pt-8 mt-10 border-t border-blue-900/30 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">© {new Date().getFullYear()} Boksy. All rights reserved.</p>
          
          {/* Payment icons */}
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-md bg-[#172a45] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
            </div>
            <div className="p-2 rounded-md bg-[#172a45] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M7.144 19.532l1.049-5.751A3.512 3.512 0 0 1 11.633 11h5.052a3.512 3.512 0 0 0 3.512-3.512V3.512A3.512 3.512 0 0 0 16.685 0h-7.85a3.512 3.512 0 0 0-3.512 3.512v7.24"/>
                <path d="M12.5 13.5v4a2 2 0 0 1-2 2H4.74A2 2 0 0 1 3 18.11L1 5.12A2 2 0 0 1 2.88 3h8.36a1.5 1.5 0 0 1 1.26.69"/>
              </svg>
            </div>
            <div className="p-2 rounded-md bg-[#172a45] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
    
    {/* Login/Register Modal */}
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-[#172a45] rounded-xl p-6 max-w-md w-full shadow-xl border border-blue-500/30"
          >
            <h2 className="text-2xl font-bold mb-4">Welcome to Boksy</h2>
            <p className="text-gray-400 mb-6">For the best experience, please sign in or create an account.</p>
            
            <div className="space-y-4">
              <button 
                onClick={handleLogin}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
              
              <button
                onClick={handleGuestContinue}
                className="w-full bg-transparent hover:bg-blue-500/10 text-blue-400 p-3 rounded-lg font-medium border border-blue-500 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
            
            <p className="text-gray-500 text-sm text-center mt-6">
              By continuing, you agree to Boksy's Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};

export default HomePage;