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
import HotelCard from '../components/HotelCard';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';


let pricesCache = null;
const getPlacePrices = async () => {

  if (pricesCache) {
    console.log('Using cached prices');
    return pricesCache;
  }
  
  try {
    console.log('Fetching prices from API - first time only');
    const response = await axios.get(`${API_BASE_URL}/api/places/prices`);
    if (response.data && response.data.success) {

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


let restrictionsCache = null;
const getPlaceRestrictions = async () => {

  if (restrictionsCache) {
    console.log('Using cached restrictions');
    return restrictionsCache;
  }
  
  try {
    console.log('Fetching restrictions from API - first time only');
    const response = await axios.get(`${API_BASE_URL}/api/places/restrictions`);
    if (response.data && response.data.success) {

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
  

  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [searchResultsFromHomePage, setSearchResultsFromHomePage] = useState(location.state?.results || []);
  const [checkInDate, setCheckInDate] = useState(location.state?.checkInDate || new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(location.state?.checkOutDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [guestCount, setGuestCount] = useState(location.state?.guestCount || 2);
  

  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [dataProcessed, setDataProcessed] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState({});
  

  const [newSearchQuery, setNewSearchQuery] = useState(searchQuery);
  

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

  const amenitiesOptions = [
    { id: 'wifi', label: 'Free WiFi' },
    { id: 'parking', label: 'Parking' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'petFriendly', label: 'Pet Friendly' },
    { id: 'airCon', label: 'Air Conditioning' }
  ];


  const generateRandomAmenities = () => {
    const numAmenities = Math.floor(Math.random() * 3) + 2; // Generate 2-4 random amenities
    const shuffled = [...amenitiesOptions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numAmenities).map(amenity => amenity.id);
  };


  const sortOptions = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'priceAsc', label: 'Price (Low to High)' },
    { value: 'priceDesc', label: 'Price (High to Low)' },
    { value: 'ratingDesc', label: 'Rating (High to Low)' }
  ];
  
  useEffect(() => {
    if (dataProcessed) {
      console.log('Data already processed, skipping');
      return;
    }
    
    if (searchResultsFromHomePage.length > 0) {
      console.log('Using search results passed from HomePage:', searchResultsFromHomePage.length);
      
      const processedHotels = searchResultsFromHomePage.map(hotel => {
        let processedAmenities = [];
        
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
      
      setTotalPages(Math.ceil(processedHotels.length / RESULTS_PER_PAGE));
      
      const initialIndexes = {};
      processedHotels.forEach(hotel => {
        initialIndexes[hotel.id] = 0;
      });
      setCurrentImageIndexes(initialIndexes);
      setLoading(false);
      setDataProcessed(true);
      return;
    }
    
    // If no search query, don't fetch anything - just show the search prompt
    if (!searchQuery) {
      
      return;
    }


    fetchHotelsOnce();
    setLoading(false);
    
  }, [searchQuery, searchResultsFromHomePage.length, dataProcessed]);
  
  const fetchHotelsOnce = async () => {

    setHotels([]);
    setFilteredHotels([]);
    setCurrentPage(1);
    

      setLoading(true);
    setError(null);
    
      let hotelsData = [];
      
      try {
        console.log('Fetching hotels with search query:', searchQuery);
      

      const formattedQuery = searchQuery.toLowerCase().includes('hotel') 
        ? searchQuery 
        : `hotels in ${searchQuery}`;
      console.log('Sending search-text request with query:', formattedQuery);
      

      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
      };
      console.log('Using headers:', headers);
      

      const response = await axios.post(
        `${API_BASE_URL}/api/places/search-text`,
        { textQuery: formattedQuery },
        { headers }
      );
      
      console.log("Complete API response:", response.data);
      
      if (response.data && response.data.places && response.data.places.length > 0) {
        console.log(`Found ${response.data.places.length} hotels from Google Places API`);
        

        const placesHotels = response.data.places.map(hotel => {
          return {
            ...hotel,

            id: hotel.id,

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
        

        const savedPrices = await getPlacePrices();
        const restrictedHotels = await getPlaceRestrictions();
        
        console.log('Prices retrieved:', Object.keys(savedPrices).length);
        console.log('Restrictions retrieved:', Object.keys(restrictedHotels).length);
        

        const processedHotels = hotelsData
        .filter(hotel => !restrictedHotels[hotel.id]?.isRestricted)
          .map(hotel => ({
            ...hotel,

          currentPrice: savedPrices[hotel.id] || hotel.price || hotel.estimatedPrice || 0
          }));
        
        console.log(`Processed ${processedHotels.length} hotels after filtering`);
        

        setHotels(processedHotels);
        setFilteredHotels(processedHotels);
        

        setTotalPages(Math.ceil(processedHotels.length / RESULTS_PER_PAGE));
        

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


  useEffect(() => {
    if (hotels.length === 0) return;

    let results = [...hotels];


    results = results.filter(hotel => 
      !hotel.rating || hotel.rating >= filters.minRating
    );


    results = results.filter(hotel => {
      const price = hotel.currentPrice || hotel.estimatedPrice || 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });


    if (filters.amenities.length > 0) {
      results = results.filter(hotel => {

        if (!hotel.amenities || !hotel.amenities.length) return false;
        

        return filters.amenities.every(amenity => 
          hotel.amenities.includes(amenity)
        );
      });
    }


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

        results.sort((a, b) => {
          const priceA = a.currentPrice || a.estimatedPrice || 0;
          const priceB = b.currentPrice || b.estimatedPrice || 0;
          const scoreA = ((a.rating || 0) * 20) - (priceA / 100);
          const scoreB = ((b.rating || 0) * 20) - (priceB / 100);
          return scoreB - scoreA;
        });
    }

    setFilteredHotels(results);

    setCurrentPage(1);

    setTotalPages(Math.ceil(results.length / RESULTS_PER_PAGE));
  }, [hotels, filters]);
  

  const getPhotoUrl = (photo, maxWidth = 400) => {
    // Dacă nu avem nicio imagine, returnăm imaginea implicită
    if (!photo) return backgr;
    
    // Dacă avem un obiect cu proprietatea name (cazul API-ului Google Places)
    if (typeof photo === 'object' && photo.name) {
      return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo.name)}?maxWidthPx=${maxWidth}`;
    }
    
    // Dacă avem un string, procesăm diferitele tipuri de URL-uri
    if (typeof photo === 'string') {
      // 1. Pentru URL-uri relative încărcate de utilizator (încep cu /uploads/)
      if (photo.startsWith('/uploads/')) {
        return `${API_BASE_URL}${photo}`;
      }
      
      // 2. Pentru URL-uri absolute externe (încep cu http)
      if (photo.startsWith('http')) {
        return photo;
      }
      
      // 3. Pentru imagini placeholder
      if (photo.includes('placehold.co')) {
        return photo;
      }
      
      // 4. Pentru alte stringuri (presupunem că sunt ID-uri pentru media sau file paths)
      try {
        // Check if the string might be a file path
        if (photo.includes('/') || photo.includes('\\')) {
          // This could be a file path - try to construct a URL based on backend
          const fileName = photo.split(/[\/\\]/).pop(); // Get the filename
          return `${API_BASE_URL}/uploads/hotels/${fileName}`;
        }
        
        return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo)}?maxWidthPx=${maxWidth}`;
      } catch (error) {
        console.error('Error formatting image URL string:', error);
        return backgr;
      }
    }
    
    // 5. Pentru photo_reference din Google Places API
    if (photo && photo.photo_reference) {
      return `${API_BASE_URL}/api/places/photo?photo_reference=${encodeURIComponent(photo.photo_reference)}&maxwidth=${maxWidth}`;
    }
    
    // Pentru orice alt tip de date, returnăm imaginea implicită
    console.warn('Unsupported image URL format:', photo);
    return backgr;
  };
  

  const navigateImage = (hotelId, direction, event) => {
    if (event) {
      event.stopPropagation(); // Prevent triggering hotel click
    }
    
    console.log('Navigating image for hotel ID:', hotelId, 'Direction:', direction);
    

    const hotel = hotels.find(h => h.id === hotelId || h._id === hotelId);
    
    if (!hotel) {
      console.error('Hotel not found for ID:', hotelId);
      return;
    }
    
    if (!hotel.photos || hotel.photos.length <= 1) {
      console.log('Hotel has no photos or only one photo');
      return;
    }
    

    const currentIndex = currentImageIndexes[hotelId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % hotel.photos.length;
      } else {
        newIndex = (currentIndex - 1 + hotel.photos.length) % hotel.photos.length;
      }
      
    console.log('Changing image index from', currentIndex, 'to', newIndex);
    

    setCurrentImageIndexes(prev => ({
      ...prev,
      [hotelId]: newIndex
    }));
  };
  

  const handleHotelClick = (hotelId) => {
    if (!hotelId) {
      console.error('No hotel ID provided');
      return;
    }
    
    console.log('Navigating to hotel details page for ID:', hotelId);
    
    try {


    navigate(`/hotel/${hotelId}`);
    } catch (error) {
      console.error('Error navigating to hotel details:', error);
    }
  };
  

  const handlePageChange = (page) => {
    setCurrentPage(page);

    window.scrollTo(0, 0);
  };


  const handleNewSearch = (e) => {
    e.preventDefault();

    setLoading(true);
    
    // Show an error message if the search query is empty
    if (!newSearchQuery.trim()) {
      setError('Please enter a location to search for hotels');
      return;
    }
    
    // Reset all search-related state
    resetSearchState();
    setError(null);
    
    // Reset availability data to avoid stale data
    setHotelAvailability({});
    setNextAvailableDates({});
    setRoomAvailability({});
    
    const performNewSearch = async () => {
      try {
        let apiHotels = [];
        // Fetch from Google Places API
        try {
          const queryResponse = await axios.post(
            `${API_BASE_URL}/api/places/search-text`,
            { textQuery: `hotels in ${newSearchQuery}` },
            { headers }
          );
          
          if (queryResponse.data && queryResponse.data.places) {
            console.log('API search results:', queryResponse.data.places.length);
            apiHotels = queryResponse.data.places.map(hotel => ({
              ...hotel,
              id: hotel.id,
              estimatedPrice: generateHotelPrice(hotel),
              amenities: {
                wifi: Math.random() > 0.2,
                pool: Math.random() > 0.5,
                pets: Math.random() > 0.7,
                breakfast: Math.random() > 0.6,
                parking: Math.random() > 0.4,
              },
              source: 'external'
            }));
          }
        } catch (apiError) {
          console.error('Error searching external API:', apiError);
        }
        
        // Also search in our own database for user-added hotels
        let userHotels = [];
        try {
          const userHotelsResponse = await axios.get(
            `${API_BASE_URL}/api/hotels/search?query=${encodeURIComponent(newSearchQuery)}`,
            {
              headers: {
                'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
              }
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
        }
        
        // Combine results from both sources
        const combinedResults = [...apiHotels, ...userHotels];
        
        if (combinedResults.length > 0) {
          console.log(`Combined search results: ${combinedResults.length} hotels`);
          await processNewResults(combinedResults);
        } else {
          setError(`No hotels found for "${newSearchQuery}". Please try a different search term.`);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error performing new search:', error);
        setError('Failed to search hotels. Please try again later.');
        setLoading(false);
      }
    };
    
    performNewSearch();
  };

  // Process new search results
  const processNewResults = async (places) => {
    try {
      console.log('Processing new search results, count:', places.length);
      
      if (!places || places.length === 0) {
        setError(`No hotels found for "${newSearchQuery}". Please try a different search term.`);
        setLoading(false);
        return;
      }
      
      // Process the places similar to searchInDatabase
      const hotelsWithPrices = places.map(hotel => {
        return {
          ...hotel,
          id: hotel.id, // Ensure ID is preserved
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
      
      // Update state with new search results
      setSearchQuery(newSearchQuery.trim());
      setNewSearchQuery(newSearchQuery.trim());
      setHotels(hotelsWithPrices);
      setFilteredHotels(hotelsWithPrices);
      setTotalPages(Math.ceil(hotelsWithPrices.length / RESULTS_PER_PAGE));
      
      // Initialize image indexes for the hotels
      const initialIndexes = {};
      hotelsWithPrices.forEach(hotel => {
        initialIndexes[hotel.id] = 0;
      });
      setCurrentImageIndexes(initialIndexes);
      setDataProcessed(true);
      setLoading(false);
    } catch (err) {
      console.error('Error processing search results:', err);
      setError('Failed to process search results. Please try again.');
      setLoading(false);
    }
  };


  const searchInDatabase = async (query) => {
    try {
      setHotels([]);
      setFilteredHotels([]);
      setCurrentPage(1);
      
      setLoading(true);
      setError(null);
      
      pricesCache = null;
      restrictionsCache = null;
      setDataProcessed(false);
      
      let apiHotels = [];
      // First, search using Google Places API
      try {
        const formattedQuery = query.toLowerCase().includes('hotel') 
          ? query.trim()
          : `hotels in ${query.trim()}`;
        console.log('Searching with query:', formattedQuery);
        
        const headers = {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
        };
        console.log('Using search headers:', headers);
        
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
          
          apiHotels = response.data.places.map(hotel => {
            console.log(`Processing hotel with ID: ${hotel.id}`);
            return {
              ...hotel,
              id: hotel.id,
              estimatedPrice: generateHotelPrice(hotel),
              amenities: {
                wifi: Math.random() > 0.2,
                pool: Math.random() > 0.5,
                pets: Math.random() > 0.7,
                breakfast: Math.random() > 0.6,
                parking: Math.random() > 0.4,
              },
              source: 'external'
            };
          });
        }
      } catch (apiError) {
        console.error('Search-text API error:', apiError);
        console.error('Error details:', apiError.response?.data || apiError.message);
      }
      
      // Second, search for hotels in our database
      let userHotels = [];
      try {
        // Search in our own database using the same query
        const userHotelsResponse = await axios.get(
          `${API_BASE_URL}/api/hotels/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
            }
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
      }
      
      // Combine results from both sources
      const combinedHotels = [...apiHotels, ...userHotels];
      
      if (combinedHotels.length > 0) {
        console.log('Fully processed hotels:', combinedHotels.length);
        console.log('First processed hotel:', combinedHotels[0]);
        console.log('IDs of processed hotels:', combinedHotels.map(h => h.id));
        
        setSearchQuery(query.trim());
        setNewSearchQuery(query.trim());
        setHotels(combinedHotels);
        setFilteredHotels(combinedHotels);
        setTotalPages(Math.ceil(combinedHotels.length / RESULTS_PER_PAGE));
        
        const initialIndexes = {};
        combinedHotels.forEach(hotel => {
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


  const handleFilterChange = (key, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  };


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


  const resetFilters = () => {
    setFilters({
      minRating: 0,
      maxPrice: 5000,
      minPrice: 0,
      amenities: [],
      sortBy: 'recommended'
    });
  };
  

  const getCurrentPageHotels = () => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    return filteredHotels.slice(startIndex, endIndex);
  };
  

  const generatePaginationNumbers = () => {
    const pagesToShow = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {

      for (let i = 1; i <= totalPages; i++) {
        pagesToShow.push(i);
      }
    } else {

      pagesToShow.push(1);
      
      if (currentPage > 3) {
        pagesToShow.push('...');
      }
      

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pagesToShow.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pagesToShow.push('...');
      }
      

      if (totalPages > 1) {
        pagesToShow.push(totalPages);
      }
    }
    
    return pagesToShow;
  };
  

  const resetSearchState = () => {
    // Clear session storage
    sessionStorage.removeItem('searchResults');
    sessionStorage.removeItem('searchQuery');
    
    // Reset all state variables
    setDataProcessed(false);
    setHotels([]);
    setFilteredHotels([]);
    setSearchQuery('');
    //setNewSearchQuery(''); // Don't reset this since the user is typing a new query
    setSearchResultsFromHomePage([]);
    setCurrentPage(1);
    setError(null);
    setCurrentImageIndexes({});
    setHotelAvailability({});
    setNextAvailableDates({});
    setRoomAvailability({});
  };
  

  useEffect(() => {
    return () => {

      sessionStorage.removeItem('searchResults');
      sessionStorage.removeItem('searchQuery');
    };
  }, []);


  useEffect(() => {

    setNewSearchQuery(searchQuery);
  }, [searchQuery]);
  

  // Add state variables for search parameters
  const [hotelAvailability, setHotelAvailability] = useState({});
  const [nextAvailableDates, setNextAvailableDates] = useState({});

  // Function to find the next available date for a hotel
  const findNextAvailableDate = (hotelId) => {
    // In a real application, this would query the backend for availability
    // Here we'll generate a random future date for demonstration
    const today = new Date();
    // Add a random number of days (1-30) to current date
    const randomDays = Math.floor(Math.random() * 30) + 1;
    const nextAvailableDate = new Date(today);
    nextAvailableDate.setDate(nextAvailableDate.getDate() + randomDays);
    
    // Format the date as YYYY-MM-DD
    return nextAvailableDate.toISOString().split('T')[0];
  };

  // Function to check if a hotel has rooms that can accommodate the specified number of guests
  const canAccommodateGuests = (hotel) => {
    if (!hotel) return false;
    
    // For hotels with explicit room data
    if (hotel.rooms && Array.isArray(hotel.rooms)) {
      return hotel.rooms.some(room => {
        const capacity = room.capacity || room.persons || 0;
        return capacity >= guestCount;
      });
    }
    
    // For hotels without explicit room data, use maxGuests if available
    if (hotel.maxGuests) {
      return hotel.maxGuests >= guestCount;
    }
    
    // Default - assume standard hotels can accommodate up to 4 guests
    return guestCount <= 4;
  };

  // Function to check hotel availability for the selected dates
  const checkHotelAvailability = async (hotel) => {
    if (!hotel || !hotel.id) return false;
    
    try {
      // For internal hotels, query the database
      if (hotel.source === 'internal') {
        const response = await axios.post(`${API_BASE_URL}/api/hotels/check-availability`, {
          hotelId: hotel.id,
          startDate: checkInDate,
          endDate: checkOutDate
        });
        
        return {
          available: response.data.available,
          roomsAvailable: response.data.availableRooms || 0
        };
      } 
      // For external hotels, use a deterministic approach based on hotel properties
      else {
        // Use localStorage to track simulated bookings for external hotels
        const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '{}');
        const hotelBookings = bookings[hotel.id] || {};
        
        // Calculate a base availability score using hotel rating and price
        const rating = parseFloat(hotel.rating || hotel.averageRating || 4.0);
        const basePrice = parseFloat(hotel.price || hotel.estimatedPrice || 500);
        
        // Higher ratings and prices typically mean more rooms
        let roomsAvailable = Math.floor((rating / 5) * 10);
        
        // Adjust based on price (more expensive hotels might have fewer rooms but more exclusivity)
        roomsAvailable += basePrice < 300 ? 2 : basePrice > 800 ? -2 : 0;
        
        // Ensure minimum of 0 rooms
        roomsAvailable = Math.max(0, roomsAvailable);
        
        // Reduce by existing "bookings" if any
        const bookedRooms = hotelBookings[checkInDate] || 0;
        roomsAvailable = Math.max(0, roomsAvailable - bookedRooms);
        
        return {
          available: roomsAvailable > 0,
          roomsAvailable
        };
      }
    } catch (error) {
      console.error(`Error checking availability for hotel ${hotel.id}:`, error);
      return { available: false, roomsAvailable: 0 };
    }
  };

  // Modified useEffect to check availability for all hotels
  useEffect(() => {
    const checkAllHotelsAvailability = async () => {
      if (!dataProcessed || hotels.length === 0) return;
      
      const availabilityInfo = {};
      const nextDatesInfo = {};
      
      // Check availability for each hotel
      for (const hotel of hotels) {
        if (!hotel.id) continue;
        
        // Check if hotel can accommodate the requested number of guests
        const canAccommodate = canAccommodateGuests(hotel);
        
        // If the hotel can't accommodate the guests, mark as unavailable
        if (!canAccommodate) {
          availabilityInfo[hotel.id] = { available: false, roomsAvailable: 0, canAccommodateGuests: false };
          continue;
        }
        
        // Check availability for the selected dates
        const availability = await checkHotelAvailability(hotel);
        availabilityInfo[hotel.id] = { 
          ...availability, 
          canAccommodateGuests: canAccommodate 
        };
        
        // If hotel is not available, find the next available date
        if (!availability.available) {
          nextDatesInfo[hotel.id] = findNextAvailableDate(hotel.id);
        }
      }
      
      setHotelAvailability(availabilityInfo);
      setNextAvailableDates(nextDatesInfo);
      
      // Update roomAvailability state for display in hotel cards
      const roomAvailabilityData = {};
      hotels.forEach(hotel => {
        const availability = availabilityInfo[hotel.id];
        if (availability) {
          roomAvailabilityData[hotel.id] = {
            hasAvailableRooms: availability.available,
            totalAvailableRooms: availability.roomsAvailable,
            canAccommodateGuests: availability.canAccommodateGuests,
            availableRoomTypes: hotel.rooms ? 
              hotel.rooms
                .filter(room => {
                  const capacity = room.capacity || room.persons || 0;
                  return capacity >= guestCount;
                })
                .map(room => room.type) 
              : ['Standard', 'Deluxe']
          };
        }
      });
      setRoomAvailability(roomAvailabilityData);
      
      // Apply filters based on availability and guest capacity
      applyFiltersWithAvailability(availabilityInfo);
    };
    
    checkAllHotelsAvailability();
  }, [hotels, checkInDate, checkOutDate, guestCount, dataProcessed]);

  // Function to apply filters including availability
  const applyFiltersWithAvailability = (availabilityInfo) => {
    if (!hotels || hotels.length === 0) return;
    
    let filtered = [...hotels];
    
    // Apply filters for rating, price, amenities
    if (filters.minRating > 0) {
      filtered = filtered.filter(hotel => 
        parseFloat(hotel.rating || 0) >= filters.minRating
      );
    }
    
    if (filters.maxPrice < 5000) {
      filtered = filtered.filter(hotel => {
        const price = parseFloat(hotel.price || hotel.estimatedPrice || 0);
        return price <= filters.maxPrice;
      });
    }
    
    if (filters.minPrice > 0) {
      filtered = filtered.filter(hotel => {
        const price = parseFloat(hotel.price || hotel.estimatedPrice || 0);
        return price >= filters.minPrice;
      });
    }
    
    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(hotel => {
        // Handle different amenities data structures
        if (hotel.amenities) {
          if (Array.isArray(hotel.amenities)) {
            return filters.amenities.every(amenity => 
              hotel.amenities.includes(amenity)
            );
          } else {
            return filters.amenities.every(amenity => 
              hotel.amenities[amenity]
            );
          }
        }
        return false;
      });
    }
    
    // Sort by selected criteria
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'priceAsc':
            return (parseFloat(a.price || a.estimatedPrice || 0) - parseFloat(b.price || b.estimatedPrice || 0));
          case 'priceDesc':
            return (parseFloat(b.price || b.estimatedPrice || 0) - parseFloat(a.price || a.estimatedPrice || 0));
          case 'ratingDesc':
            return (parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
          default: // recommended
            return 0; // No specific sorting
        }
      });
    }
    
    // Don't filter out hotels based on availability - we'll show all hotels but mark unavailable ones
    setFilteredHotels(filtered);
    setTotalPages(Math.ceil(filtered.length / RESULTS_PER_PAGE));
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white">
      {/* Header */}
      <header className="bg-[#0a192f]/90 shadow-lg p-3 sm:p-4 md:p-6 border-b border-blue-500/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start mb-3 sm:mb-0">
            <button 
              onClick={() => { 
                resetSearchState(); 
                navigate('/'); 
              }}
              className="p-2 bg-[#172a45] hover:bg-[#1e3a5f] rounded-full flex items-center justify-center transition-colors"
              aria-label="Back to home"
            >
              <IoArrowForward className="text-white transform rotate-180" size={16} />
            </button>
            <div onClick={() => navigate('/')} className="text-xl md:text-2xl font-bold cursor-pointer">
              <span className="text-blue-400 mr-1">B</span>oksy
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex sm:hidden items-center bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <SlidersHorizontal size={18} className="mr-1.5" />
              <span className="hidden xs:inline">Filters</span>
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
          
          {/* Search form */}
          <form onSubmit={handleNewSearch} className="hidden md:flex flex-col lg:flex-row items-stretch lg:items-center bg-[#172a45] rounded-lg p-3 flex-1 max-w-5xl mx-2 lg:mx-8 border border-blue-500/30">
            <div className="flex items-center flex-1">
            <input
              type="text"
              value={newSearchQuery}
              onChange={(e) => setNewSearchQuery(e.target.value)}
              placeholder="Search for a destination"
              className={`bg-transparent border-none outline-none w-full text-white ${error && !newSearchQuery.trim() ? 'placeholder-red-400' : ''}`}
              required
            />
              <span className="mx-2 text-gray-500">|</span>
            </div>
            
            <div className="flex flex-1 lg:ml-2 mt-2 lg:mt-0">
              <div className="flex flex-col mr-2 flex-1">
                <label className="text-xs text-gray-400 mb-1">Check-in</label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-sm"
                />
              </div>
              
              <div className="flex flex-col mr-2 flex-1">
                <label className="text-xs text-gray-400 mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-sm"
                />
              </div>
              
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-400 mb-1">Guests</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value))}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-sm"
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
            
            <button type="submit" className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center">
              <Search size={20} />
            </button>
          </form>
          
          {/* Mobile search form */}
          <form onSubmit={handleNewSearch} className="w-full md:hidden bg-[#172a45] rounded-lg px-3 py-2 border border-blue-500/30">
            <div className="flex items-center">
              <input
                type="text"
                value={newSearchQuery}
                onChange={(e) => setNewSearchQuery(e.target.value)}
                placeholder="Search for a destination"
                className={`bg-transparent border-none outline-none w-full text-white ${error && !newSearchQuery.trim() ? 'placeholder-red-400' : ''}`}
                required
              />
              <button type="submit" className="ml-2 text-gray-300 hover:text-white">
                <Search size={20} />
              </button>
            </div>
            
            <div className="flex mt-2 items-center space-x-2">
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-400 mb-1">Check-in</label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-xs w-full"
                />
              </div>
              
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-400 mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-xs w-full"
                />
              </div>
              
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-400 mb-1">Guests</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value))}
                  className="bg-transparent border border-gray-700 rounded p-1 text-white text-xs w-full"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6+</option>
                </select>
              </div>
            </div>
            
            {/* Error message for empty search on mobile */}
            {error && error.includes('Please enter a location') && (
              <div className="text-red-400 text-sm mt-2 px-2">
                {error}
              </div>
            )}
          </form>
          
          {/* Error message for empty search on desktop */}
          {error && error.includes('Please enter a location') && (
            <div className="text-red-400 text-sm mt-2 max-w-5xl mx-8 px-4 hidden md:block">
              {error}
            </div>
          )}
          
          <div className="hidden sm:block text-lg">
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
      </header>
      
      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[#0a192f]/90 border-t border-b border-blue-500/30 py-4">
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Price range filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-3 sm:p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-2 sm:mb-3 text-blue-400">Price Range</h4>
                <div className="flex flex-col space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm mb-1 block">Min Price (RON)</label>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="mt-1 text-xs sm:text-sm text-right">{filters.minPrice} RON</div>
                  </div>
                  
                  <div>
                    <label className="text-xs sm:text-sm mb-1 block">Max Price (RON)</label>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="mt-1 text-xs sm:text-sm text-right">{filters.maxPrice} RON</div>
                  </div>
                </div>
              </div>
              
              {/* Star rating filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-3 sm:p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-2 sm:mb-3 text-blue-400">Star Rating</h4>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleFilterChange('minRating', rating)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center transition ${
                        filters.minRating === rating
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#0a192f] border border-blue-500/30 hover:border-blue-400'
                      }`}
                    >
                      {rating === 0
                        ? 'Any'
                        : (
                          <>
                            {rating}
                            <Star size={14} className="ml-1 text-yellow-400" fill={rating > 0 ? "currentColor" : "none"} />
                            {rating === 1 ? '+' : '+'}
                          </>
                        )
                      }
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Amenities filter */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-3 sm:p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-2 sm:mb-3 text-blue-400">Amenities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {amenitiesOptions.map(amenity => (
                    <button
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs text-left flex items-center transition ${
                        filters.amenities.includes(amenity.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#0a192f] border border-blue-500/30 hover:border-blue-400'
                      }`}
                    >
                      <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm border mr-1 sm:mr-2 flex items-center justify-center flex-shrink-0 ${
                        filters.amenities.includes(amenity.id)
                          ? 'bg-white border-white'
                          : 'border-gray-400'
                      }`}>
                        {filters.amenities.includes(amenity.id) && (
                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate">{amenity.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort options */}
              <div className="backdrop-blur-lg bg-[#172a45]/80 p-3 sm:p-4 rounded-lg border border-blue-500/30 shadow-md">
                <h4 className="font-medium mb-2 sm:mb-3 text-blue-400">Sort By</h4>
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
      <main className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8 sm:py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-4 border border-blue-500/30 shadow-lg">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <button 
              onClick={() => { 
                resetSearchState(); 
                navigate('/'); 
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}
        
        {/* No search query prompt */}
        {!loading && !error && !searchQuery && (
          <div className="text-center py-8 sm:py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-4 border border-blue-500/30 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Search for Hotels</h2>
            <p className="text-gray-400 mb-6">Enter a destination to find available hotels</p>
            <form onSubmit={handleNewSearch} className="max-w-md mx-auto px-4">
              <div className="flex">
                <input
                  type="text"
                  value={newSearchQuery}
                  onChange={(e) => setNewSearchQuery(e.target.value)}
                  placeholder="e.g., București, Cluj, Brașov..."
                  className="bg-[#0a192f] border border-blue-500/30 rounded-l-lg px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-lg transition-colors"
                >
                  <Search size={20} />
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Results count and active filters summary */}
        {!loading && !error && filteredHotels.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Hotels in <span className="text-blue-400">{searchQuery}</span></h1>
            <div className="flex flex-wrap items-center">
              <p className="text-gray-400 mr-4 text-sm sm:text-base">Found {filteredHotels.length} results</p>
              
              {/* Active filters display */}
              <div className="flex flex-wrap mt-2 gap-2">
                {/* Date filter */}
                <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center">
                  {new Date(checkInDate).toLocaleDateString('ro-RO', {day: 'numeric', month: 'short'})} - 
                  {new Date(checkOutDate).toLocaleDateString('ro-RO', {day: 'numeric', month: 'short'})}
                </div>
                
                {/* Guest count filter */}
                <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center">
                  {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                </div>
                
                {filters.minRating > 0 && (
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center">
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
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center">
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
                    <div key={amenityId} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center truncate max-w-[100px] sm:max-w-none">
                      <span className="truncate">{amenity?.label}</span>
                      <button 
                        onClick={() => toggleAmenity(amenityId)}
                        className="ml-1 flex-shrink-0 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                
                {filters.sortBy !== 'recommended' && (
                  <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs flex items-center">
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
          <div className="text-center py-8 sm:py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-4 border border-blue-500/30 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">No hotels match your filters</h2>
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
        {!loading && !error && hotels.length === 0 && searchQuery && (
          <div className="text-center py-8 sm:py-12 backdrop-blur-lg bg-[#172a45]/80 rounded-xl p-4 border border-blue-500/30 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">No hotels found</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {getCurrentPageHotels().map((hotel) => {
              const hotelId = hotel.id || hotel._id;
              return (
                <HotelCard 
                  key={hotelId} 
                  hotel={hotel}
                  currentImageIndex={currentImageIndexes[hotelId] || 0}
                  onImageNavigate={navigateImage}
                  onClick={handleHotelClick}
                  roomAvailability={roomAvailability}
                />
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && filteredHotels.length > RESULTS_PER_PAGE && (
          <div className="mt-4 sm:mt-6 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
              {/* Previous page button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 py-1 sm:py-2 rounded-lg ${
                  currentPage === 1 
                    ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#172a45] hover:bg-[#172a45]/80 border border-blue-500/30'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Page numbers */}
              {generatePaginationNumbers().map((page, index) => (
                <button
                  key={`page-${page}-${index}`}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`px-2 py-1 rounded-lg text-xs ${
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
                className={`px-2 py-1 sm:py-2 rounded-lg ${
                  currentPage === totalPages 
                    ? 'bg-[#172a45]/50 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#172a45] hover:bg-[#172a45]/80 border border-blue-500/30'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResults;