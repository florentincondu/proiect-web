import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import backgroundImage from '../assets/backgr.webp';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Star, Wifi, Coffee, MapPin, Search, Filter, Menu, X, Heart, Info, Facebook, Twitter, Instagram, Mail, Phone, Map } from 'lucide-react';
import { useAuth } from '../context/authContext';
import { generateHotelPrice } from '../utils/priceUtils';
import { IoArrowForward, IoRefreshSharp } from 'react-icons/io5';

const PopularHotelsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const homepageHotels = location.state?.homepageHotels || [];
  
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [locationFilter, setLocationFilter] = useState('Toate locațiile');
  const [sortOption, setSortOption] = useState('rating');
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [hoveredHotelId, setHoveredHotelId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoriteHotels, setFavoriteHotels] = useState({});
  const [activeFilters, setActiveFilters] = useState([]);
  const [priceRange, setPriceRange] = useState([70, 700]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const searchRef = useRef(null);
  const initialLoadRef = useRef(false);
  

  const ronToEur = 0.20;


  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const { isAuthenticated, loading: authLoading } = useAuth();

  const filterRef = useRef(null);

  const filterOptions = [
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'pets', label: 'Pet Friendly' },
    { id: 'wifi', label: 'Free WiFi' },
    { id: 'breakfast', label: 'Breakfast Included' },
    { id: 'parking', label: 'Free Parking' },
    { id: 'spa', label: 'Spa' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'gym', label: 'Gym' },
    { id: 'conference', label: 'Conference Room' },
    { id: 'bar', label: 'Bar' },
    { id: 'beach', label: 'Beach Access' },
    { id: 'airport', label: 'Airport Shuttle' },
    { id: 'business', label: 'Business Center' },
    { id: 'family', label: 'Family Rooms' },
    { id: 'disabled', label: 'Disabled Access' }
  ];

  useEffect(() => {

    if (initialLoadRef.current) {
      return;
    }
    
    const fetchHotels = async () => {
      try {
        setLoading(true);
        

        let savedPrices = {};
        try {
          const savedPricesResponse = await axios.get(`${API_BASE_URL}/api/places/prices`);
          if (savedPricesResponse.data.success) {
            savedPrices = savedPricesResponse.data.prices.reduce((acc, item) => {
              acc[item.placeId] = item.price;
              return acc;
            }, {});
          }
        } catch (err) {
          console.error('Error fetching saved prices:', err);
        }
        
        let allHotels = [];
        

        if (homepageHotels.length > 0) {
          console.log('Using hotels from homepage:', homepageHotels.length);
          allHotels = [...homepageHotels];
          setHotels(allHotels);
          setFilteredHotels(allHotels);
          setLoading(false);
          initialLoadRef.current = true;
          return; // Skip API call if we already have hotels
        }
        


        const requestData = {
          includedTypes: ["lodging"],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: 44.4268,
                longitude: 26.1025
              },
              radius: 50000.0
            }
          }
        };
        
        const headers = {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus,places.types'
        };
        
        try {
          console.log('Sending search-nearby request with data:', JSON.stringify(requestData, null, 2));
          

        const response = await axios.post(
            `${API_BASE_URL}/api/places/search-nearby`,
          requestData,
          { headers }
        );
          
          console.log('Hotels fetched from nearby search:', response.data?.places?.length || 0);
          
        if (response.data && response.data.places) {

            let nearbyHotels = response.data.places.filter(hotel => 
              hotel.rating >= 4.0 && 
              hotel.userRatingCount >= 40 &&
            hotel.businessStatus === "OPERATIONAL"
          );
          

            const mappedHotels = nearbyHotels.map((hotel) => {

            const price = savedPrices[hotel.id] || generateHotelPrice(hotel);
            

            const hotelIdSum = hotel.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const normalizedHash = (hotelIdSum % 100) / 100; // Value between 0-1 based on hotel ID
            

            const hasPool = price > 200 ? normalizedHash > 0.4 : normalizedHash > 0.8;
            const hasBreakfast = price > 170 ? normalizedHash > 0.3 : normalizedHash > 0.5;
            const hasSpa = price > 270 ? normalizedHash > 0.4 : normalizedHash > 0.9;
            const hasRestaurant = normalizedHash > 0.3;
            const hasParking = normalizedHash > 0.2;
            
            return {
              id: hotel.id,
              displayName: hotel.displayName,
              formattedAddress: hotel.formattedAddress,
              rating: hotel.rating,
              userRatingCount: hotel.userRatingCount,
              estimatedPrice: price,
              photos: hotel.photos || [],
              priceLevel: hotel.priceLevel || "N/A",
              amenities: {
                wifi: true, // Most hotels have WiFi
                pool: hasPool,
                breakfast: hasBreakfast,
                spa: hasSpa,
                restaurant: hasRestaurant,
                parking: hasParking
              }
            };
          });
          


            const existingIds = new Set(allHotels.map(hotel => hotel.id));
            const uniqueNewHotels = mappedHotels.filter(hotel => !existingIds.has(hotel.id));
            

            allHotels = [...allHotels, ...uniqueNewHotels];
            

            console.log('Total unique hotels found:', allHotels.length);
          }
        } catch (error) {
          console.error('Error fetching hotels from nearby search:', error);
          setError("Nu am putut încărca hotelurile. Vă rugăm încercați din nou mai târziu.");
        }
        

        if (allHotels.length > 40) {
          allHotels = allHotels.slice(0, 40);
        }
        
        setHotels(allHotels);
        setFilteredHotels(allHotels);
          

          const initialIndexes = {};
        allHotels.forEach((hotel) => {
            initialIndexes[hotel.id] = 0;
          });
          setCurrentImageIndexes(initialIndexes);
        
        setLoading(false);
        initialLoadRef.current = true;
      } catch (error) {
        console.error("Error fetching hotels:", error);
        setError("Nu am putut încărca hotelurile. Vă rugăm încercați din nou mai târziu.");
        setLoading(false);
        initialLoadRef.current = true;
      }
    };

    fetchHotels();
    

    setTimeout(() => {
      if (searchRef.current) {
        window.scrollTo({
          top: searchRef.current.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    }, 1500);
  }, []);
  

  useEffect(() => {
    if (hotels.length === 0) return;

    let result = [...hotels];
    

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(hotel => 
        hotel.displayName?.text.toLowerCase().includes(query) || 
        hotel.formattedAddress?.toLowerCase().includes(query)
      );
    }
    

    if (locationFilter !== 'Toate locațiile') {
      result = result.filter(hotel => hotel.formattedAddress.includes(locationFilter));
    }
    

    switch (sortOption) {
      case 'price-asc':
        result.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        result.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          return priceB - priceA;
        });
        break;
      case 'rating':
        result.sort((a, b) => {

          const ratingDiff = (b.rating || 0) - (a.rating || 0);

          if (ratingDiff === 0) {
            return (b.userRatingCount || 0) - (a.userRatingCount || 0);
          }
          return ratingDiff;
        });
        break;
      case 'reviews':
        result.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
        break;
      default:
        break;
    }
    
    setFilteredHotels(result);
  }, [hotels, locationFilter, sortOption, searchQuery]);


  const locations = ['Toate locațiile', ...new Set(hotels.map(hotel => {

    const addressParts = hotel.formattedAddress.split(',');
    return addressParts.length > 1 ? addressParts[1].trim() : addressParts[0].trim();
  }))];


  const getPhotoUrl = (photo, maxWidth = 400) => {
    if (!photo || !photo.name) return backgroundImage;
    

    return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo.name)}?maxWidthPx=${maxWidth}`;
  };
  

  const navigateImage = (hotelId, direction, event) => {
    event.stopPropagation(); // Prevent triggering hotel click
    
    const hotel = hotels.find(h => h.id === hotelId);
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

  const handleHotelClick = (hotelId) => {
    navigate(`/hotel/${hotelId}`);
  };

  const handleBookNow = (hotelId, event) => {

    event.stopPropagation();
    
    if (isAuthenticated) {

      navigate(`/reserve/${hotelId}`);
    } else {

      navigate('/login', { state: { returnUrl: `/reserve/${hotelId}` } });
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };
  
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };
  
  const handleLocationChange = (e) => {
    setLocationFilter(e.target.value);
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  
  const toggleFavorite = (hotelId, event) => {
    event.stopPropagation();
    setFavoriteHotels(prev => ({
      ...prev,
      [hotelId]: !prev[hotelId]
    }));
  };

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => {
      if (prev.includes(filterId)) {
        return prev.filter(id => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };

  const handleRatingSelect = (rating) => {

    if (selectedRating === rating) {
      setSelectedRating(0);
    } else {
      setSelectedRating(rating);
    }
  };
  

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.03, transition: { duration: 0.2 } }
  };
  

  const filteredHotelsByFilters = filteredHotels.filter(hotel => {

    const hotelPrice = hotel.currentPrice || hotel.estimatedPrice || 0;
    if (hotelPrice < priceRange[0] || hotelPrice > priceRange[1]) {
      return false;
    }
    

    if (selectedRating > 0 && (!hotel.rating || hotel.rating < selectedRating)) {
      return false;
    }
    

    if (activeFilters.length > 0) {

      for (const filter of activeFilters) {

        if (typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities)) {
          if (!hotel.amenities[filter]) {
            return false;
          }
        } 

        else if (Array.isArray(hotel.amenities)) {
          if (!hotel.amenities.includes(filter)) {
            return false;
          }
        }

        else {
          return false;
        }
      }
    }
    
    return true;
  });


  const hotelsPerPage = 6; // Display fewer hotels per page for better navigation
  const indexOfLastHotel = currentPage * hotelsPerPage;
  const indexOfFirstHotel = indexOfLastHotel - hotelsPerPage;
  const currentHotels = filteredHotelsByFilters.slice(indexOfFirstHotel, indexOfLastHotel);
  const totalPages = Math.ceil(filteredHotelsByFilters.length / hotelsPerPage);


  const renderPageNumbers = () => {
    const pageNumbers = [];
    const ellipsis = <span className="px-2 flex items-center justify-center text-gray-400">...</span>;
    
    if (totalPages <= 5) {

      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <button
            key={i}
            onClick={() => paginate(i)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              i === currentPage 
                ? 'bg-blue-500 text-white font-bold' 
                : 'bg-[#172a45] text-white hover:bg-[#1e3a5f] border border-blue-500/30'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {


      pageNumbers.push(
        <button
          key={1}
          onClick={() => paginate(1)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            currentPage === 1 
              ? 'bg-blue-500 text-white font-bold' 
              : 'bg-[#172a45] text-white hover:bg-[#1e3a5f] border border-blue-500/30'
          }`}
        >
          1
        </button>
      );
      

      if (currentPage > 3) {
        pageNumbers.push(
          <span key="ellipsis1" className="px-2 flex items-center justify-center text-gray-400">...</span>
        );
      }
      

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <button
            key={i}
            onClick={() => paginate(i)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              i === currentPage 
                ? 'bg-blue-500 text-white font-bold' 
                : 'bg-[#172a45] text-white hover:bg-[#1e3a5f] border border-blue-500/30'
            }`}
          >
            {i}
          </button>
        );
      }
      

      if (currentPage < totalPages - 2) {
        pageNumbers.push(
          <span key="ellipsis2" className="px-2 flex items-center justify-center text-gray-400">...</span>
        );
      }
      

      if (totalPages > 1) {
        pageNumbers.push(
          <button
            key={totalPages}
            onClick={() => paginate(totalPages)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              currentPage === totalPages 
                ? 'bg-blue-500 text-white font-bold' 
                : 'bg-[#172a45] text-white hover:bg-[#1e3a5f] border border-blue-500/30'
            }`}
          >
            {totalPages}
          </button>
        );
      }
    }
    
    return pageNumbers;
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const getStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    return (
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} size={14} className="text-yellow-400" fill="currentColor" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star size={14} className="text-gray-400" fill="currentColor" />
            <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
              <Star size={14} className="text-yellow-400" fill="currentColor" />
            </div>
          </div>
        )}
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={i + fullStars + (hasHalfStar ? 1 : 0)} size={14} className="text-gray-400" fill="currentColor" />
        ))}
      </div>
    );
  };


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

  const refreshHotels = () => {

    setSearchQuery('');
    setLocationFilter('Toate locațiile');
    setSortOption('rating');
    setActiveFilters([]);
    setPriceRange([70, 700]);
    setSelectedRating(0);
    

    initialLoadRef.current = false;
    setLoading(true);
    setError(null);
    

    setHotels([]);
    setFilteredHotels([]);
    

    setTimeout(() => {
      const fetchHotels = async () => {
        try {

          const response = await axios.post(
            `${API_BASE_URL}/api/places/search-text`,
            { textQuery: 'hotels in Bucharest' },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
              }
            }
          );
          
          if (response.data && response.data.places) {
            const hotelsWithPrices = response.data.places.map(hotel => ({
              ...hotel,
              estimatedPrice: generateHotelPrice(hotel),
              amenities: {
                wifi: Math.random() > 0.2,
                pool: Math.random() > 0.5,
                pets: Math.random() > 0.7,
                breakfast: Math.random() > 0.6,
                parking: Math.random() > 0.4,
              }
            }));
            
            setHotels(hotelsWithPrices);
            setFilteredHotels(hotelsWithPrices);
            

            const initialIndexes = {};
            hotelsWithPrices.forEach((hotel) => {
              initialIndexes[hotel.id] = 0;
            });
            setCurrentImageIndexes(initialIndexes);
          } else {
            setError("Nu am putut încărca hotelurile. Vă rugăm încercați din nou mai târziu.");
          }
        } catch (error) {
          console.error("Error fetching hotels:", error);
          setError("Nu am putut încărca hotelurile. Vă rugăm încercați din nou mai târziu.");
        } finally {
          setLoading(false);
          initialLoadRef.current = true;
        }
      };
      
      fetchHotels();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#0a192f]/90 shadow-lg p-4 md:p-6 border-b border-blue-500/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
              <button 
              onClick={() => navigate('/')}
              className="mr-4 p-2 bg-[#172a45] hover:bg-[#1e3a5f] rounded-full flex items-center justify-center transition-colors"
              aria-label="Back to home"
              >
              <IoArrowForward className="text-white transform rotate-180" size={16} />
              </button>
            <div className="text-xl md:text-2xl font-bold">
              <span className="text-blue-400 mr-1">B</span>oksy
            </div>
          </div>
        </div>
      </header>

      {/* Top banner with heading */}
      <div 
        className="relative py-10 md:py-16 px-4"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(10, 25, 47, 0.7), rgba(10, 25, 47, 0.9)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              Descoperă Cele Mai Bune <span className="text-blue-400">Hoteluri în București și Împrejurimi</span>
            </h1>
            <p className="text-gray-300 text-center max-w-3xl mx-auto mb-8">
              Găsește cele mai populare și apreciate locații pentru cazare în zona București și împrejurimi într-o rază de 100km
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search and filter bar - new improved layout */}
      <div className="bg-[#0c1f38] py-6 px-4 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search bar */}
            <motion.div 
              ref={searchRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full md:w-1/3"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Caută după nume sau locație..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full p-3 pl-10 rounded-lg bg-[#172a45]/80 backdrop-blur-sm border border-blue-500/30 focus:outline-none focus:border-blue-400 transition-colors"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <button 
                  onClick={refreshHotels}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Reîmprospătează lista de hoteluri"
                    >
                  <IoRefreshSharp size={18} />
                    </button>
              </div>
            </motion.div>
            
            {/* Location filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative w-full md:w-auto"
            >
              <select
                value={locationFilter}
                onChange={handleLocationChange}
                className="appearance-none bg-[#172a45] border border-blue-500/30 text-white rounded-lg px-4 py-3 pr-8 w-full md:w-auto focus:outline-none focus:border-blue-400 transition-colors"
              >
                {locations.map((location, index) => (
                  <option key={index} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </motion.div>

            {/* Sorting options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative w-full md:w-auto"
            >
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="appearance-none bg-[#172a45] border border-blue-500/30 text-white rounded-lg px-4 py-3 pr-8 w-full md:w-auto focus:outline-none focus:border-blue-400 transition-colors"
              >
                <option value="rating">Rating (High to Low)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="reviews">Most Reviews</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
        </motion.div>

            {/* Filter button */}
            <div ref={filterRef} className="relative w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="w-full md:w-auto bg-[#172a45] hover:bg-[#1e3a5f] px-4 py-3 rounded-lg flex items-center gap-2 border border-blue-500/30 justify-center md:justify-start"
              >
                <Info size={16} />
                Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
              </motion.button>
              
              {/* Enhanced Filter dropdown - keep this part */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 p-4 bg-[#172a45] rounded-lg shadow-xl z-10 w-80 border border-blue-500/30"
                  >
                    <div className="mb-4">
                      <p className="font-medium mb-2">Amenities</p>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
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
                    
                    <div className="mb-4">
                      <p className="font-medium mb-2">Price Range (RON)</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="range"
                            min="70"
                            max="700"
                            step="30"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                            className="w-full accent-blue-500"
                          />
                          <span>{priceRange[0]}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="range"
                            min="70"
                            max="700"
                            step="30"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="w-full accent-blue-500"
                          />
                          <span>{priceRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="font-medium mb-2">Sort By</p>
                      <select
                        value={sortOption}
                        onChange={handleSortChange}
                        className="w-full bg-[#1e3a5f] border border-blue-500/30 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="rating">Rating (High to Low)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                        <option value="reviews">Most Reviews</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={() => {
                        setActiveFilters([]);
                        setSelectedRating(0);
                        setPriceRange([70, 700]);
                        setSortOption('rating');
                      }}
                      className="mt-4 text-blue-400 text-sm hover:underline"
                    >
                      Reset all filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>
          </div>
        </div>

      {/* Active filters display */}
      {(activeFilters.length > 0 || selectedRating > 0 || locationFilter !== 'Toate locațiile' || searchQuery.trim() !== '') && (
        <div className="bg-[#0a192f] py-3 px-4 border-t border-blue-500/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 text-sm mr-1">Active filters:</span>
              
              {searchQuery.trim() !== '' && (
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                  Search: {searchQuery}
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="ml-2 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              
              {locationFilter !== 'Toate locațiile' && (
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                  Location: {locationFilter}
                  <button 
                    onClick={() => setLocationFilter('Toate locațiile')} 
                    className="ml-2 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              
              {selectedRating > 0 && (
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                  Rating: {selectedRating}+ <Star size={14} className="ml-1" fill="currentColor" />
                  <button 
                    onClick={() => setSelectedRating(0)} 
                    className="ml-2 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              
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
              
              {/* Clear all filters button */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('Toate locațiile');
                  setActiveFilters([]);
                  setSelectedRating(0);
                  setPriceRange([70, 700]);
                  setSortOption('rating');
                }}
                className="text-blue-400 text-sm hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content with hotels */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">
            Hoteluri Populare în Zona București
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mb-8 mx-auto">
            Descoperă hotelurile din București și împrejurimi și găsește locația perfectă pentru următoarea ta ședere.
          </p>
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

        {/* Hotel Grid with Pagination */}
        {!loading && !error && filteredHotelsByFilters.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {currentHotels.map((hotel, index) => (
                <motion.div
                  key={hotel.id}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  variants={cardVariants}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#172a45] rounded-xl overflow-hidden shadow-lg border border-blue-500/30 cursor-pointer relative"
                  onClick={() => handleHotelClick(hotel.id)}
                  onMouseEnter={() => setHoveredHotelId(hotel.id)}
                  onMouseLeave={() => setHoveredHotelId(null)}
                >
                  {/* Image carousel */}
                  <div className="relative h-48 overflow-hidden">
                    {hotel.photos && hotel.photos.length > 0 ? (
                      <img 
                        src={getPhotoUrl(hotel.photos[currentImageIndexes[hotel.id] || 0])} 
                        alt={hotel.displayName?.text || 'Hotel image'} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    ) : (
                      <img 
                        src={backgroundImage} 
                        alt="Default hotel" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Navigation arrows */}
                    {hotel.photos && hotel.photos.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => navigateImage(hotel.id, 'prev', e)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-1 transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={(e) => navigateImage(hotel.id, 'next', e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-1 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                    
                    {/* Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(hotel.id, e)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                    >
                      <Heart 
                        size={18} 
                        fill={favoriteHotels[hotel.id] ? 'currentColor' : 'none'} 
                        className={favoriteHotels[hotel.id] ? 'text-red-500' : 'text-white'}
                      />
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg truncate">{hotel.displayName?.text}</h3>
                      <div className="flex items-center">
                        <Star size={16} className="text-yellow-400" fill="currentColor" />
                        <span className="ml-1">{hotel.rating ? hotel.rating.toFixed(1) : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {hotel.formattedAddress || 'Address information not available'}
                    </p>
                    
                    {/* Amenities icons */}
                    <div className="flex gap-2 mb-3">
                      {hotel.amenities && typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities) && hotel.amenities.wifi && (
                        <span className="bg-blue-500/20 text-blue-400 p-1 rounded text-xs">WiFi</span>
                      )}
                      {hotel.amenities && typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities) && hotel.amenities.pool && (
                        <span className="bg-blue-500/20 text-blue-400 p-1 rounded text-xs">Pool</span>
                      )}
                      {hotel.amenities && typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities) && hotel.amenities.breakfast && (
                        <span className="bg-blue-500/20 text-blue-400 p-1 rounded text-xs">Breakfast</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <span className="text-lg font-bold">{hotel.estimatedPrice} RON</span>
                        <span className="text-xs text-gray-400 block">per night</span>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleBookNow(hotel.id, e)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Book Now
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Hover overlay with quick details */}
                  {hoveredHotelId === hotel.id && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a192f] to-transparent p-4 transform translate-y-0 transition-transform">
                      <p className="text-sm">Click to see full details</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center mt-12">
                <div className="text-gray-400 mb-4 text-sm">
                  Showing page {currentPage} of {totalPages} ({filteredHotelsByFilters.length} hotels found)
                </div>
                <div className="flex items-center gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg flex items-center ${
                      currentPage === 1 
                        ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#172a45] hover:bg-[#1e3a5f] border border-blue-500/30'
                    }`}
                  >
                    <ChevronLeft size={18} className="mr-1" />
                Previous
              </button>
              
                  <div className="flex gap-1">
                    {renderPageNumbers()}
                  </div>
              
              <button
                onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg flex items-center ${
                      currentPage === totalPages 
                        ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#172a45] hover:bg-[#1e3a5f] border border-blue-500/30'
                    }`}
              >
                Next
                    <ChevronRight size={18} className="ml-1" />
              </button>
            </div>
                
                {/* Jump to page selector (visible when many pages) */}
                {totalPages > 7 && (
                  <div className="mt-4 flex items-center">
                    <span className="text-sm mr-2">Jump to page:</span>
                    <select 
                      value={currentPage}
                      onChange={(e) => paginate(Number(e.target.value))}
                      className="bg-[#172a45] border border-blue-500/30 rounded-lg p-1 text-sm"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* No results message */}
        {!loading && !error && filteredHotelsByFilters.length === 0 && (
          <div className="text-center py-12 bg-[#172a45]/50 rounded-xl border border-blue-500/30 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-3">No hotels found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your filters or search terms</p>
            <button 
              onClick={() => {
                setActiveFilters([]);
                setSelectedRating(0);
                setPriceRange([70, 700]);
                setSortOption('rating');
                setSearchQuery('');
              }}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#0a192f]/90 border-t border-blue-500/20 py-10 px-4 md:px-8 mt-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-blue-400 mr-1">B</span>oksy
            </h3>
            <p className="text-gray-400 mb-4">
              Your trusted partner for finding the perfect accommodations across Romania.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Instagram size={20} />
              </a>
            </div>
            </div>

            <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
              <li><a href="/" className="text-gray-400 hover:text-blue-400 transition-colors">Home</a></li>
              <li><a href="/about" className="text-gray-400 hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">Contact</a></li>
              <li><a href="/faq" className="text-gray-400 hover:text-blue-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="/cookies" className="text-gray-400 hover:text-blue-400 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>

            <div>
            <h4 className="font-bold mb-4">Contact Us</h4>
            <div className="space-y-2">
              <a href="mailto:info@boksy.com" className="flex items-center text-gray-400 hover:text-blue-400 transition-colors">
                <Mail size={16} className="mr-2" /> info@boksy.com
              </a>
              <a href="tel:+40123456789" className="flex items-center text-gray-400 hover:text-blue-400 transition-colors">
                <Phone size={16} className="mr-2" /> +40 123 456 789
              </a>
              <p className="flex items-start text-gray-400">
                <Map size={16} className="mr-2 mt-1" /> 
                <span>Bucharest, Romania<br />Sector 1, 010101</span>
              </p>
            </div>
          </div>
          </div>

        <div className="max-w-6xl mx-auto border-t border-blue-500/20 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Boksy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PopularHotelsPage;