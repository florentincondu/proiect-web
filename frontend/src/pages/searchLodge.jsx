import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import backgr from '../assets/start.avif';
import { ChevronLeft, ChevronRight, Search, X, Filter, Star, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/authContext';
import { generateHotelPrice } from '../utils/priceUtils';
import { RESULTS_PER_PAGE, getDefaultHeaders } from '../config/api';
import { IoArrowForward } from 'react-icons/io5';

// Define API_BASE_URL directly
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Function to get place prices - using direct axios instead of safeFetch
let pricesCache = null;
const getPlacePrices = async () => {
  // Use cache if available to prevent multiple calls
  if (pricesCache) {
    console.log('Using cached prices');
    return pricesCache;
  }
  
  try {
    console.log('Fetching prices from API - first time only');
    const response = await axios.get(`${API_BASE_URL}/api/places/prices`);
    if (response.data && response.data.success) {
      // Convert array of price objects to map with placeId as key
      pricesCache = response.data.prices.reduce((acc, item) => {
        acc[item.placeId] = item.price;
        return acc;
      }, {});
      return pricesCache;
    }
    pricesCache = {};
    return pricesCache;
  } catch (error) {
    console.error('Error fetching place prices:', error);
    pricesCache = {};
    return pricesCache;
  }
};

// Function to get place restrictions - using direct axios instead of safeFetch
let restrictionsCache = null;
const getPlaceRestrictions = async () => {
  // Use cache if available to prevent multiple calls
  if (restrictionsCache) {
    console.log('Using cached restrictions');
    return restrictionsCache;
  }
  
  try {
    console.log('Fetching restrictions from API - first time only');
    const response = await axios.get(`${API_BASE_URL}/api/places/restrictions`);
    if (response.data && response.data.success) {
      // Convert array to map with placeId as key
      restrictionsCache = response.data.restrictions.reduce((acc, item) => {
        acc[item.placeId] = {
          isRestricted: item.isRestricted,
          reason: item.reason
        };
        return acc;
      }, {});
      return restrictionsCache;
    }
    restrictionsCache = {};
    return restrictionsCache;
  } catch (error) {
    console.error('Error fetching place restrictions:', error);
    restrictionsCache = {};
    return restrictionsCache;
  }
};

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Convert from constant to state variable
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [searchResultsFromHomePage, setSearchResultsFromHomePage] = useState(location.state?.results || []);
  
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [dataProcessed, setDataProcessed] = useState(false);
  
  // Search state
  const [newSearchQuery, setNewSearchQuery] = useState(searchQuery);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    maxPrice: 5000,
    minPrice: 0,
    amenities: [],
    sortBy: 'recommended'
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-FieldMask': 'places.userRatingCount,places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.types,places.websiteUri,places.priceLevel,places.businessStatus,places.priceRange'
  };
  // Amenities options
  const amenitiesOptions = [
    { id: 'wifi', label: 'Free WiFi' },
    { id: 'parking', label: 'Parking' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'petFriendly', label: 'Pet Friendly' },
    { id: 'airCon', label: 'Air Conditioning' }
  ];

  // Function to generate random amenities
  const generateRandomAmenities = () => {
    const numAmenities = Math.floor(Math.random() * 3) + 2; // Generate 2-4 random amenities
    const shuffled = [...amenitiesOptions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numAmenities).map(amenity => amenity.id);
  };

  // Sort options
  const sortOptions = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'priceAsc', label: 'Price (Low to High)' },
    { value: 'priceDesc', label: 'Price (High to Low)' },
    { value: 'ratingDesc', label: 'Rating (High to Low)' }
  ];
  
  useEffect(() => {
    // Prevent multiple data processing
    if (dataProcessed) {
      console.log('Data already processed, skipping');
      return;
    }
    
    if (searchResultsFromHomePage.length > 0) {
      console.log('Using search results passed from HomePage:', searchResultsFromHomePage.length);
      
      // Use the results passed from HomePage
      const processedHotels = searchResultsFromHomePage.map(hotel => {
        let processedAmenities = [];
        
        // Convert amenities object to array if needed
        if (hotel.amenities && typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities)) {
          processedAmenities = Object.entries(hotel.amenities)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);
        } else if (Array.isArray(hotel.amenities)) {
          processedAmenities = hotel.amenities;
        } else {
          processedAmenities = generateRandomAmenities();
        }
        
        return {
          ...hotel,
          amenities: processedAmenities
        };
      });
      
      setHotels(processedHotels);
      setFilteredHotels(processedHotels);
      
      // Calculate total pages based on results per page
      setTotalPages(Math.ceil(processedHotels.length / RESULTS_PER_PAGE));
      
      // Initialize current image index for each hotel
      const initialIndexes = {};
      processedHotels.forEach(hotel => {
        initialIndexes[hotel.id] = 0;
      });
      setCurrentImageIndexes(initialIndexes);
      setLoading(false);
      setDataProcessed(true);
      return;
    }
    
    if (!searchQuery) {
      setError('No search query provided');
      setLoading(false);
      setDataProcessed(true);
      return;
    }

    // Only call fetchHotelsOnce once - not inside useEffect
    fetchHotelsOnce();
    
  }, [searchQuery, searchResultsFromHomePage.length, dataProcessed]); // Only rerun if these values change

  // Separate function to fetch hotels just once
  const fetchHotelsOnce = async () => {
    // Immediately clear all previous results and display loading state
    setHotels([]);
    setFilteredHotels([]);
    setCurrentPage(1);
    
    // Force re-render with loading state
      setLoading(true);
    setError(null);
    
      let hotelsData = [];
      
      try {
        console.log('Fetching hotels with search query:', searchQuery);
      
      // Format query to search for hotels in the specified location
      const formattedQuery = searchQuery.toLowerCase().includes('hotel') 
        ? searchQuery 
        : `hotels in ${searchQuery}`;
      console.log('Sending search-text request with query:', formattedQuery);
      
      // Use same headers as HomePage
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
      };
      console.log('Using headers:', headers);
      
      // Call the search-text endpoint
      const response = await axios.post(
        `${API_BASE_URL}/api/places/search-text`,
        { textQuery: formattedQuery },
        { headers }
      );
      
      console.log("Complete API response:", response.data);
      
      if (response.data && response.data.places && response.data.places.length > 0) {
        console.log(`Found ${response.data.places.length} hotels from Google Places API`);
        
        // Process hotels exactly like in HomePage
        const placesHotels = response.data.places.map(hotel => {
          return {
            ...hotel,
            // Explicitly set id to guarantee it's preserved
            id: hotel.id,
            // Generate price and amenities
            estimatedPrice: generateHotelPrice(hotel),
            amenities: {
              wifi: Math.random() > 0.2,
              pool: Math.random() > 0.5,
              pets: Math.random() > 0.7,
              breakfast: Math.random() > 0.6,
              parking: Math.random() > 0.4,
            }
          };
        });
        
        console.log('Processed hotels count:', placesHotels.length);
        
        hotelsData = placesHotels;
      } else {
        console.log('No hotels found from search-text API');
        setError(`No hotels found for "${searchQuery}". Please try a different search term.`);
        setLoading(false);
        setDataProcessed(true);
        return;
      }
        
        // Use our helper functions to safely get prices and restrictions
        const savedPrices = await getPlacePrices();
        const restrictedHotels = await getPlaceRestrictions();
        
        console.log('Prices retrieved:', Object.keys(savedPrices).length);
        console.log('Restrictions retrieved:', Object.keys(restrictedHotels).length);
        
        // Process hotels and apply prices/restrictions
        const processedHotels = hotelsData
        .filter(hotel => !restrictedHotels[hotel.id]?.isRestricted)
          .map(hotel => ({
            ...hotel,
          // Use saved price if available, otherwise use the hotel's base price or estimated price
          currentPrice: savedPrices[hotel.id] || hotel.price || hotel.estimatedPrice || 0
          }));
        
        console.log(`Processed ${processedHotels.length} hotels after filtering`);
        
      // Only update state after all processing is complete
        setHotels(processedHotels);
        setFilteredHotels(processedHotels);
        
        // Calculate total pages based on results per page
        setTotalPages(Math.ceil(processedHotels.length / RESULTS_PER_PAGE));
        
        // Initialize current image index for each hotel
        const initialIndexes = {};
        processedHotels.forEach(hotel => {
        initialIndexes[hotel.id] = 0;
        });
        setCurrentImageIndexes(initialIndexes);
      setDataProcessed(true);
      } catch (error) {
        console.error('Error fetching hotels:', error);
      setError('Failed to load hotels. Please try again.');
    } finally {
        setLoading(false);
      }
    };

  // Apply filters and sorting
  useEffect(() => {
    if (hotels.length === 0) return;

    let results = [...hotels];

    // Filter by rating
    results = results.filter(hotel => 
      !hotel.rating || hotel.rating >= filters.minRating
    );

    // Filter by price
    results = results.filter(hotel => {
      const price = hotel.currentPrice || hotel.estimatedPrice || 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    // Filter by amenities
    if (filters.amenities.length > 0) {
      results = results.filter(hotel => {
        // Skip hotels without amenities
        if (!hotel.amenities || !hotel.amenities.length) return false;
        
        // Check if all selected amenities are present in the hotel's amenities
        return filters.amenities.every(amenity => 
          hotel.amenities.includes(amenity)
        );
      });
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'priceAsc':
        results.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          return priceA - priceB;
        });
        break;
      case 'priceDesc':
        results.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          return priceB - priceA;
        });
        break;
      case 'ratingDesc':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // Default "recommended" sort combines rating and price factors
        results.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          const scoreA = ((a.rating || 0) * 20) - (priceA / 100);
          const scoreB = ((b.rating || 0) * 20) - (priceB / 100);
          return scoreB - scoreA;
        });
    }

    setFilteredHotels(results);
    // Reset to first page when filters change
    setCurrentPage(1);
    // Update total pages based on filtered results
    setTotalPages(Math.ceil(results.length / RESULTS_PER_PAGE));
  }, [hotels, filters]);
  
  // Function to get photo URL from either a Google Places photo reference or a local database URL
  const getPhotoUrl = (photo, maxWidth = 400) => {
    // For debugging
    console.log('Getting photo URL for:', photo);
    
    // Case 1: If photo is a string, treat it as a direct URL from our database
    if (typeof photo === 'string') {
      return photo;
    }
    
    // Case 2: If photo is an object with a name property, it's a Google Places photo reference
    if (photo && photo.name) {
      const url = `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo.name)}?maxWidthPx=${maxWidth}`;
      console.log('Generated photo URL:', url);
      return url;
    }
    
    // Case 3: If photo has a 'photo_reference' property (older Google Places API format)
    if (photo && photo.photo_reference) {
      const url = `${API_BASE_URL}/api/places/photo?photo_reference=${encodeURIComponent(photo.photo_reference)}&maxwidth=${maxWidth}`;
      console.log('Generated photo URL from photo_reference:', url);
      return url;
    }
    
    // Default case: use the fallback image
    console.log('Using fallback image');
    return backgr;
  };
  
  // Function to navigate through hotel images
  const navigateImage = (hotelId, direction, event) => {
    if (event) {
      event.stopPropagation(); // Prevent triggering hotel click
    }
    
    console.log('Navigating image for hotel ID:', hotelId, 'Direction:', direction);
    
    // Find the specific hotel by ID, try hotel.id first, then hotel._id
    const hotel = hotels.find(h => h.id === hotelId || h._id === hotelId);
    
    if (!hotel) {
      console.error('Hotel not found for ID:', hotelId);
      return;
    }
    
    if (!hotel.photos || hotel.photos.length <= 1) {
      console.log('Hotel has no photos or only one photo');
      return;
    }
    
    // Get current index for this specific hotel
    const currentIndex = currentImageIndexes[hotelId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % hotel.photos.length;
      } else {
        newIndex = (currentIndex - 1 + hotel.photos.length) % hotel.photos.length;
      }
      
    console.log('Changing image index from', currentIndex, 'to', newIndex);
    
    // Update only this hotel's image index
    setCurrentImageIndexes(prev => ({
      ...prev,
      [hotelId]: newIndex
    }));
  };
  
  // Function to handle hotel click
  const handleHotelClick = (hotelId) => {
    if (!hotelId) {
      console.error('No hotel ID provided');
      return;
    }
    
    console.log('Navigating to hotel details page for ID:', hotelId);
    
    try {
      // Navigate to hotel details page using the correct URL format
      // This matches how HomePage.jsx handles navigation to hotel details
    navigate(`/hotel/${hotelId}`);
    } catch (error) {
      console.error('Error navigating to hotel details:', error);
    }
  };
  
  // Function to handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when changing page
    window.scrollTo(0, 0);
  };

  // Handle new search submission
  const handleNewSearch = (e) => {
    e.preventDefault();
    
    if (!newSearchQuery.trim()) {
      return;
    }
    
    // Immediately clear all previous results and display loading state
    setHotels([]);
    setFilteredHotels([]);
    setCurrentPage(1);
    
    // Force re-render with loading state
    setLoading(true);
    setError(null);
    
    // Reset all caches
    pricesCache = null;
    restrictionsCache = null;
    setDataProcessed(false);
    
    // Format query to search for hotels in the specified location
    const formattedQuery = newSearchQuery.toLowerCase().includes('hotel') 
      ? newSearchQuery.trim()
      : `hotels in ${newSearchQuery.trim()}`;
    console.log('Searching for:', formattedQuery);
    
    // Use search-text API endpoint
    axios.post(`${API_BASE_URL}/api/places/search-text`, {
      textQuery: formattedQuery
    }, {
      headers: getDefaultHeaders()
    })
    .then(response => {
      if (response.data.places && response.data.places.length > 0) {
        console.log(`Found ${response.data.places.length} hotels`);
        
        const hotelsWithPrices = response.data.places.map(hotel => ({
          ...hotel,
          // Ensure we retain the Google Places ID
          id: hotel.id,
          estimatedPrice: generateHotelPrice(hotel),
          amenities: generateRandomAmenities()
        }));
        
        // Only update state after all processing is complete
        setSearchQuery(newSearchQuery.trim());
        setHotels(hotelsWithPrices);
        setFilteredHotels(hotelsWithPrices);
        setTotalPages(Math.ceil(hotelsWithPrices.length / RESULTS_PER_PAGE));
        
        // Initialize image indexes
        const initialIndexes = {};
        hotelsWithPrices.forEach(hotel => {
          initialIndexes[hotel.id] = 0;
        });
        setCurrentImageIndexes(initialIndexes);
        setDataProcessed(true);
      } else {
        console.log('No results found for search query:', formattedQuery);
        setError(`No hotels found for "${newSearchQuery.trim()}". Please try a different search term.`);
        setHotels([]);
        setFilteredHotels([]);
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      setError('Failed to search hotels. Please try again later.');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Helper function to search in our database
  const searchInDatabase = async (query) => {
    try {
      // Immediately clear all previous results and display loading state
      setHotels([]);
      setFilteredHotels([]);
      setCurrentPage(1);
      
      // Force re-render with loading state
      setLoading(true);
      setError(null);
      
      // Reset all caches
      pricesCache = null;
      restrictionsCache = null;
      setDataProcessed(false);
      
      // Format query to search for hotels in the specified location
      const formattedQuery = query.toLowerCase().includes('hotel') 
        ? query.trim()
        : `hotels in ${query.trim()}`;
      console.log('Searching with query:', formattedQuery);
      
      // Use the same headers as in HomePage
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
      };
      console.log('Using search headers:', headers);
      
      // Use direct axios.post to the search-text endpoint
      const response = await axios.post(
        `${API_BASE_URL}/api/places/search-text`,
        {
          textQuery: formattedQuery
        },
        { headers }
      );
      
      console.log('Complete search-text API response:', response.data);
      
      if (response.data && response.data.places && response.data.places.length > 0) {
        console.log(`Found ${response.data.places.length} hotels via search-text API`);
        console.log('First hotel sample:', JSON.stringify(response.data.places[0]));
        console.log('First place ID example:', response.data.places[0].id);
        
        // Process hotels exactly like HomePage does it
        const hotelsWithPrices = response.data.places.map(hotel => {
          console.log(`Processing hotel with ID: ${hotel.id}`);
          return {
            ...hotel,
            id: hotel.id, // Explicitly set ID to ensure it's preserved
            estimatedPrice: generateHotelPrice(hotel),
            amenities: {
              wifi: Math.random() > 0.2,
              pool: Math.random() > 0.5,
              pets: Math.random() > 0.7,
              breakfast: Math.random() > 0.6,
              parking: Math.random() > 0.4,
            }
          };
        });
        
        console.log('Fully processed hotels:', hotelsWithPrices.length);
        console.log('First processed hotel:', hotelsWithPrices[0]);
        console.log('IDs of processed hotels:', hotelsWithPrices.map(h => h.id));
        
        // Only update state after all processing is complete
        setSearchQuery(query.trim());
        setNewSearchQuery(query.trim());
        setHotels(hotelsWithPrices);
        setFilteredHotels(hotelsWithPrices);
        setTotalPages(Math.ceil(hotelsWithPrices.length / RESULTS_PER_PAGE));
        
        // Initialize image indexes
        const initialIndexes = {};
        hotelsWithPrices.forEach(hotel => {
          initialIndexes[hotel.id] = 0;
        });
        setCurrentImageIndexes(initialIndexes);
        setDataProcessed(true);
      } else {
        console.log('No hotels found for search query:', query);
        setError(`No hotels found for "${query}". Please try a different search term.`);
        setHotels([]);
        setFilteredHotels([]);
      }
    } catch (err) {
      console.error('Search-text API error:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to search hotels. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  };

  // Toggle amenity selection
  const toggleAmenity = (amenityId) => {
    setFilters(prevFilters => {
      const amenities = [...prevFilters.amenities];
      
      if (amenities.includes(amenityId)) {
        return {
          ...prevFilters,
          amenities: amenities.filter(id => id !== amenityId)
        };
      } else {
        return {
          ...prevFilters,
          amenities: [...amenities, amenityId]
        };
      }
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      minRating: 0,
      maxPrice: 5000,
      minPrice: 0,
      amenities: [],
      sortBy: 'recommended'
    });
  };
  
  // Get current page hotels
  const getCurrentPageHotels = () => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    return filteredHotels.slice(startIndex, endIndex);
  };
  
  // Generate pagination numbers
  const generatePaginationNumbers = () => {
    const pagesToShow = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all page numbers if total pages is less than or equal to max visible pages
      for (let i = 1; i <= totalPages; i++) {
        pagesToShow.push(i);
      }
    } else {
      // Always show first page
      pagesToShow.push(1);
      
      if (currentPage > 3) {
        pagesToShow.push('...');
      }
      
      // Show current page and adjacent pages
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pagesToShow.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pagesToShow.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pagesToShow.push(totalPages);
      }
    }
    
    return pagesToShow;
  };
  
  // Function to render a single hotel card
  const HotelCard = ({ hotel, index, handleClick }) => {
    // Process amenities correctly based on their source format
    let displayAmenities = [];
    
    if (hotel.amenities) {
      // Case 1: If amenities is an object (from HomePage)
      if (typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities)) {
        displayAmenities = Object.entries(hotel.amenities)
          .filter(([key, value]) => value === true)
          .map(([key]) => key);
      }
      // Case 2: If amenities is already an array (from backend)
      else if (Array.isArray(hotel.amenities)) {
        displayAmenities = hotel.amenities;
      }
    } else {
      // Generate random amenities if none exist
      displayAmenities = generateRandomAmenities();
    }
    
    // Ensure we have the correct ID format - prioritize the id formats in order of preference
    // Print the entire hotel object for debugging
    console.log('Hotel object in HotelCard:', hotel);
    
    // Determine the ID to use (Google Places id for Places API or MongoDB _id for database)
    const hotelId = hotel.id || hotel._id || null;
    console.log('Extracted hotel ID:', hotelId);
    
    // Determine hotel name based on source
    const hotelName = hotel.name || (hotel.displayName?.text || 'Unnamed Hotel');
    
    // Determine hotel location based on source
    const location = hotel.location || hotel.formattedAddress || 'Location not available';
    
    // Determine price based on source
    const price = hotel.currentPrice || hotel.estimatedPrice || 'Price not available';
    
    // Get the current image index or default to 0
    const currentImageIndex = currentImageIndexes[hotelId] || 0;
    
    return (
      <div 
        onClick={() => {
          console.log('Hotel card clicked with ID:', hotelId);
          if (hotelId) handleClick(hotelId);
        }}
        className="backdrop-blur-lg bg-[#172a45]/80 rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      >
        <div className="relative h-48 overflow-hidden">
          {hotel.photos && hotel.photos.length > 0 ? (
            <img 
              src={getPhotoUrl(hotel.photos[currentImageIndex])} 
              alt={hotelName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = backgr;
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#0a192f] flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
          
          {/* Image navigation buttons if multiple photos exist */}
          {hotel.photos && hotel.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  navigateImage(hotelId, 'prev', e);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  navigateImage(hotelId, 'next', e);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          
          {hotel.rating && (
            <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg flex items-center shadow-md">
              <Star size={16} className="text-yellow-500 mr-1" fill="currentColor" />
              <span className="text-gray-800 font-medium">
                {typeof hotel.rating === 'number' ? hotel.rating.toFixed(1) : hotel.rating}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4 text-white">
          <h3 className="font-bold text-lg mb-1">{hotelName}</h3>
          <p className="text-gray-300 text-sm mb-2">{location}</p>
          
          {/* Amenities */}
          <div className="flex flex-wrap gap-1 mb-3">
            {displayAmenities.slice(0, 3).map(amenityId => {
              const amenity = amenitiesOptions.find(a => a.id === amenityId);
              return amenity ? (
                <span key={amenityId} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                  {amenity.label}
                </span>
              ) : (
                <span key={amenityId} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                  {amenityId.charAt(0).toUpperCase() + amenityId.slice(1)}
                </span>
              );
            })}
            </div>
          
          <div className="flex justify-between items-center mt-2">
            <div>
              <span className="font-bold text-lg text-blue-400">{price} RON</span>
              <span className="text-gray-400 text-xs block">per night</span>
            </div>
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                console.log('View Details button clicked with ID:', hotelId);
                if (hotelId) handleClick(hotelId);
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Reset function to handle navigating back home or to another page
  const resetSearchState = () => {
    // Clear session storage data to prevent loops
    sessionStorage.removeItem('searchResults');
    sessionStorage.removeItem('searchQuery');
    
    // Reset all internal state
    setDataProcessed(false);
    setHotels([]);
    setFilteredHotels([]);
    setSearchQuery('');
    setNewSearchQuery('');
    setSearchResultsFromHomePage([]);
    setCurrentPage(1);
    setError(null);
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear session storage when component unmounts
      sessionStorage.removeItem('searchResults');
      sessionStorage.removeItem('searchQuery');
    };
  }, []);

  // Update the useEffect to syncronize searchQuery and newSearchQuery
  useEffect(() => {
    // When the component mounts or searchQuery changes, update newSearchQuery to match
    setNewSearchQuery(searchQuery);
  }, [searchQuery]);
  
  return (
    <div className="min-h-screen bg-[#0a192f] text-white">
      {/* Header */}
      <header className="bg-[#0a192f]/90 shadow-lg p-4 md:p-6 border-b border-blue-500/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => { 
                resetSearchState(); 
                navigate('/'); 
              }}
              className="mr-4 p-2 bg-[#172a45] hover:bg-[#1e3a5f] rounded-full flex items-center justify-center transition-colors"
              aria-label="Back to home"
            >
              <IoArrowForward className="text-white transform rotate-180" size={16} />
            </button>
            <div onClick={() => navigate('/')} className="text-xl md:text-2xl font-bold cursor-pointer">
              <span className="text-blue-400 mr-1">B</span>oksy
            </div>
          </div>
          
          {/* Search form */}
          <form onSubmit={handleNewSearch} className="hidden md:flex items-center bg-[#172a45] rounded-lg px-3 py-2 flex-1 max-w-md mx-8 border border-blue-500/30">
            <input
              type="text"
              value={newSearchQuery}
              onChange={(e) => setNewSearchQuery(e.target.value)}
              placeholder="Search for a destination"
              className="bg-transparent border-none outline-none w-full text-white"
            />
            <button type="submit" className="ml-2 text-gray-300 hover:text-white">
              <Search size={20} />
            </button>
          </form>
          
          <div className="text-lg">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <SlidersHorizontal size={18} className="mr-1.5" />
              <span className="hidden sm:inline">Filters</span>
              {filters.minRating > 0 || filters.amenities.length > 0 || filters.sortBy !== 'recommended' || 
                filters.minPrice > 0 || filters.maxPrice < 5000 ? (
                <span className="ml-1.5 bg-white text-blue-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {(filters.minRating > 0 ? 1 : 0) + 
                   (filters.amenities.length > 0 ? 1 : 0) + 
                   (filters.sortBy !== 'recommended' ? 1 : 0) +
                   ((filters.minPrice > 0 || filters.maxPrice < 5000) ? 1 : 0)}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        
        {/* Mobile search form */}
        <form onSubmit={handleNewSearch} className="mt-4 flex md:hidden items-center bg-[#172a45] rounded-lg px-3 py-2 border border-blue-500/30">
          <input
            type="text"
            value={newSearchQuery}
            onChange={(e) => setNewSearchQuery(e.target.value)}
            placeholder="Search for a destination"
            className="bg-transparent border-none outline-none w-full text-white"
          />
          <button type="submit" className="ml-2 text-gray-300 hover:text-white">
            <Search size={20} />
          </button>
        </form>
      </header>
      
      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[#0a192f]/90 border-t border-b border-blue-500/30 py-4">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <h3 className="text-lg font-semibold mb-2 md:mb-0 flex items-center">
                <Filter size={18} className="mr-2 text-blue-400" /> 
                Filter and Sort
              </h3>
              
              <div className="flex items-center">
                <button 
                  onClick={resetFilters}
                  className="text-sm text-gray-300 hover:text-white mr-4"
                >
                  Reset All
                </button>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="text-sm bg-[#172a45] hover:bg-[#172a45]/80 px-3 py-1.5 rounded-lg flex items-center border border-blue-500/30"
                >
                  <X size={16} className="mr-1" /> Close
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Price range filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-3 text-blue-400">Price Range</h4>
                <div className="flex flex-col space-y-4">
                  <div>
                    <label className="text-sm mb-1 block">Min Price (RON)</label>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="mt-1 text-sm text-right">{filters.minPrice} RON</div>
                  </div>
                  
                  <div>
                    <label className="text-sm mb-1 block">Max Price (RON)</label>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="mt-1 text-sm text-right">{filters.maxPrice} RON</div>
                  </div>
                </div>
              </div>
              
              {/* Rating filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-3 text-blue-400">Minimum Rating</h4>
                <div className="flex items-center space-x-2">
                  {[0, 1, 2, 3, 4].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleFilterChange('minRating', rating + 1)}
                      className={`flex items-center justify-center p-2 rounded ${
                        filters.minRating === rating + 1 ? 'bg-blue-500' : 'bg-[#0a192f]'
                      }`}
                    >
                      <div className="flex items-center">
                        <Star size={16} className="text-yellow-400" />
                        <span className="ml-1">{rating + 1}+</span>
                      </div>
                    </button>
                  ))}
                  {filters.minRating > 0 && (
                    <button
                      onClick={() => handleFilterChange('minRating', 0)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              {/* Amenities filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-3 text-blue-400">Amenities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {amenitiesOptions.map(amenity => (
                    <div key={amenity.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={amenity.id}
                        checked={filters.amenities.includes(amenity.id)}
                        onChange={() => toggleAmenity(amenity.id)}
                        className="mr-2 accent-blue-500"
                      />
                      <label htmlFor={amenity.id} className="text-sm cursor-pointer">
                        {amenity.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Sort options */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-3 text-blue-400">Sort By</h4>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full bg-[#0a192f] border border-blue-500/30 rounded-lg p-2 text-white"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-8 border border-blue-500/30 shadow-lg">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <button 
              onClick={() => { 
                resetSearchState(); 
                navigate('/'); 
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}
        
        {/* Results count and active filters summary */}
        {!loading && !error && filteredHotels.length > 0 && (
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Hotels in <span className="text-blue-400">{searchQuery}</span></h1>
            <div className="flex flex-wrap items-center">
              <p className="text-gray-400 mr-4">Found {filteredHotels.length} results</p>
              
              {/* Active filters display */}
              <div className="flex flex-wrap mt-2 gap-2">
                {filters.minRating > 0 && (
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm flex items-center">
                    {filters.minRating}+ Stars
                    <button 
                      onClick={() => handleFilterChange('minRating', 0)}
                      className="ml-1 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {(filters.minPrice > 0 || filters.maxPrice < 5000) && (
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm flex items-center">
                    {filters.minPrice} - {filters.maxPrice} RON
                    <button 
                      onClick={() => {
                        handleFilterChange('minPrice', 0);
                        handleFilterChange('maxPrice', 5000);
                      }}
                      className="ml-1 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {filters.amenities.map(amenityId => {
                  const amenity = amenitiesOptions.find(a => a.id === amenityId);
                  return (
                    <div key={amenityId} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm flex items-center">
                      {amenity?.label}
                      <button 
                        onClick={() => toggleAmenity(amenityId)}
                        className="ml-1 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                
                {filters.sortBy !== 'recommended' && (
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm flex items-center">
                    Sort: {sortOptions.find(option => option.value === filters.sortBy)?.label}
                    <button 
                      onClick={() => handleFilterChange('sortBy', 'recommended')}
                      className="ml-1 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* No results state */}
        {!loading && !error && filteredHotels.length === 0 && hotels.length > 0 && (
          <div className="text-center py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-8 border border-blue-500/30 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">No hotels match your filters</h2>
            <p className="text-gray-400 mb-6">Try adjusting your filters to see more results</p>
            <button 
              onClick={resetFilters}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}
        
        {/* No hotels found at all */}
        {!loading && !error && hotels.length === 0 && (
          <div className="text-center py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-8 border border-blue-500/30 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">No hotels found</h2>
            <p className="text-gray-400 mb-6">We couldn't find any hotels matching your search for "<span className="text-blue-400">{searchQuery}</span>"</p>
            <button 
              onClick={() => { 
                resetSearchState(); 
                navigate('/'); 
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}
        
        {/* Results grid */}
        {!loading && !error && filteredHotels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {getCurrentPageHotels().map((hotel) => {
              // Prioritize hotel.id (Google Places) over hotel._id (MongoDB)
              const hotelId = hotel.id || hotel._id;
              console.log('Rendering hotel card for hotel:', hotel);
              console.log('Using hotel ID:', hotelId);
              
              return (
              <HotelCard 
                  key={hotelId} 
                hotel={hotel}
                  index={hotelId}
                handleClick={handleHotelClick}
              />
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && filteredHotels.length > RESULTS_PER_PAGE && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              {/* Previous page button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === 1 
                    ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#172a45] hover:bg-[#172a45]/80 border border-blue-500/30'
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              
              {/* Page numbers */}
              {generatePaginationNumbers().map((page, index) => (
                <button
                  key={`page-${page}-${index}`}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`px-3 py-1 rounded-lg ${
                    page === currentPage 
                      ? 'bg-blue-500 text-white' 
                      : page === '...' 
                        ? 'bg-transparent cursor-default' 
                        : 'bg-[#172a45] hover:bg-[#172a45]/80 border border-blue-500/30'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              {/* Next page button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === totalPages 
                    ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#172a45] hover:bg-[#172a45]/80 border border-blue-500/30'
                }`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;