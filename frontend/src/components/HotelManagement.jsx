import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/authContext';
import axios from 'axios';
import { 
  FaSearch, FaHotel, FaDollarSign, FaBan, FaEdit, 
  FaSave, FaTimesCircle, FaCheck, FaSpinner, FaStar, FaAngleDown, FaSyncAlt 
} from 'react-icons/fa';
import backgr from '../assets/start.avif';
import { generateHotelPrice } from '../utils/priceUtils';
import { API_BASE_URL, HOTELS_API_URL, HOTEL_PRICES_API_URL, PLACES_SEARCH_TEXT_URL } from '../utils/apiConfig';

const HotelManagement = () => {
  const { token } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [editingHotel, setEditingHotel] = useState(null);
  const [updatedPrice, setUpdatedPrice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [isRestricting, setIsRestricting] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [savedPrices, setSavedPrices] = useState({});
  const [restrictions, setRestrictions] = useState({});
  const searchTimeoutRef = useRef(null);
  const [expandedHotel, setExpandedHotel] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomPrice, setRoomPrice] = useState('');


  const fetchSavedHotelPrices = async () => {
    try {
      console.log('Fetching saved hotel prices...');
      

      let pricesMap = {};
      
      try {

        const response = await axios.get(`${API_BASE_URL}/api/places/prices`, {

          timeout: 8000
        });
        
        if (response.data && response.data.prices) {

          response.data.prices.forEach(item => {
            pricesMap[item.placeId] = item.price;
          });
          console.log('Saved hotel prices loaded successfully:', pricesMap);
        } else {
          console.log('No saved prices found or invalid response format');
        }
      } catch (priceError) {
        console.warn('Error fetching hotel prices:', priceError.message);

      }
      

      setSavedPrices(pricesMap);
      

      let restrictionsMap = {};
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/places/restrictions`, {

          timeout: 8000
        });
        
        if (response.data && response.data.restrictions) {

          response.data.restrictions.forEach(item => {
            restrictionsMap[item.placeId] = {
              isRestricted: item.isRestricted,
              reason: item.reason || ''
            };
          });
        }
      } catch (restrictionError) {
        console.warn('Error fetching hotel restrictions:', restrictionError.message);

      }
      

      setRestrictions(restrictionsMap);
      
      return pricesMap;
    } catch (err) {
      console.error('Error in fetchSavedHotelPrices:', err);

      return {};
    }
  };


  useEffect(() => {
    const fetchInitialHotels = async () => {
      if (!token) {
        setError("Authentication required. Please log in again.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {

        const savedPrices = await fetchSavedHotelPrices();
        


        const response = await axios.post(
          PLACES_SEARCH_TEXT_URL,
          { textQuery: "hotels in Bucharest Romania" },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data && response.data.places) {
          const placesData = response.data.places;
          console.log('Fetched initial hotels:', placesData.length);
          

          const processedHotels = placesData.map(place => {

            const estimatedPrice = generateHotelPrice(place);
            

            const restriction = restrictions[place.id] || { isRestricted: false, reason: '' };
            
            return {
              _id: place.id,
              id: place.id,
              name: place.displayName?.text || 'Unnamed Hotel',
              location: place.formattedAddress || 'Unknown location',
              rating: place.rating || 0,
              price: savedPrices[place.id] || null, // Admin-set price if available
              estimatedPrice: estimatedPrice, // Store the generated price like HomePage does
              photos: place.photos ? place.photos.map(photo => ({
                name: photo.name
              })) : [],
              restrictions: restriction,
              priceLevel: place.priceLevel || 0,
              userRatingCount: place.userRatingCount,
              formattedAddress: place.formattedAddress,
              types: place.types || []
            };
          });
          
          setHotels(processedHotels);
          setFilteredHotels(processedHotels);
        } else {
          throw new Error('Failed to fetch hotels or invalid response format');
        }
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setError('Failed to load hotels. Please try again later.');
        setHotels([]);
        setFilteredHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialHotels();
  }, [token]);


  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchHotels(query);
      }, 500);
    } else if (query === '') {

      setFilteredHotels(hotels);
    }
  };


  const searchHotels = async (query) => {
    if (!query.trim()) {
      setFilteredHotels(hotels);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {

      const searchText = query.toLowerCase().includes('hotel') 
        ? query 
        : `hotels in ${query}`;
        
      console.log('Searching for:', searchText);
      

      const response = await axios.post(
        PLACES_SEARCH_TEXT_URL,
        { textQuery: searchText },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.places) {
        const placesData = response.data.places;
        console.log('Search results:', placesData.length);
        

        const processedHotels = placesData.map(place => {

          const estimatedPrice = generateHotelPrice(place);
          

          const restriction = restrictions[place.id] || { isRestricted: false, reason: '' };
          
          return {
            _id: place.id,
            id: place.id,
            name: place.displayName?.text || 'Unnamed Hotel',
            location: place.formattedAddress || 'Unknown location',
            rating: place.rating || 0,
            price: savedPrices[place.id] || null, // Admin-set price if available
            estimatedPrice: estimatedPrice, // Store the generated price like HomePage does
            photos: place.photos ? place.photos.map(photo => ({
              name: photo.name
            })) : [],
            restrictions: restriction,
            priceLevel: place.priceLevel || 0,
            userRatingCount: place.userRatingCount,
            formattedAddress: place.formattedAddress,
            types: place.types || []
          };
        });
        
        setFilteredHotels(processedHotels);
      } else {
        throw new Error('Failed to search hotels or invalid response format');
      }
    } catch (err) {
      console.error('Error searching hotels:', err);
      setError('Failed to search hotels. Please try again.');

    } finally {
      setIsSearching(false);
    }
  };


  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      searchHotels(searchQuery);
    }
  };


  const handleRefreshClick = async () => {
    setSearchQuery('');
    setIsLoading(true);
    setError(null);
    
    try {

      const response = await axios.post(
        PLACES_SEARCH_TEXT_URL,
        { textQuery: "hotels in Bucharest Romania" },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.places) {
        const placesData = response.data.places;
        

        const processedHotels = placesData.map(place => {

          const estimatedPrice = generateHotelPrice(place);
          

          const restriction = restrictions[place.id] || { isRestricted: false, reason: '' };
          
          return {
            _id: place.id,
            id: place.id,
            name: place.displayName?.text || 'Unnamed Hotel',
            location: place.formattedAddress || 'Unknown location',
            rating: place.rating || 0,
            price: savedPrices[place.id] || null, // Admin-set price if available
            estimatedPrice: estimatedPrice, // Store the generated price like HomePage does
            photos: place.photos ? place.photos.map(photo => ({
              name: photo.name
            })) : [],
            restrictions: restriction,
            priceLevel: place.priceLevel || 0,
            userRatingCount: place.userRatingCount,
            formattedAddress: place.formattedAddress,
            types: place.types || []
          };
        });
        
        setHotels(processedHotels);
        setFilteredHotels(processedHotels);
        setSuccessMessage('Hotels refreshed successfully');
        

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to refresh hotels');
      }
    } catch (err) {
      console.error('Error refreshing hotels:', err);
      setError('Failed to refresh hotels. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };


  const calculatePrice = (hotel, isEditing = false) => {

    if (hotel.price && typeof hotel.price === 'number') {
      return hotel.price;
    }


    if (savedPrices[hotel.id] && typeof savedPrices[hotel.id] === 'number') {
      return savedPrices[hotel.id];
    }


    return generateHotelPrice(hotel);
  };


  const calculateRoomPrice = (basePrice, adults, children, nights = 1) => {

    return basePrice * nights * (adults + children * 0.5);
  };


  const updateHotelPrice = async (hotelId, newPrice, hotelName) => {
    setIsUpdatingPrice(true);
    setError(null);
    
    try {

      if (isNaN(newPrice) || newPrice <= 0) {
        throw new Error('Price must be a positive number');
      }
      
      const fullPrice = parseFloat(newPrice);
      
      console.log(`Updating price for hotel ${hotelId} (${hotelName}) to ${fullPrice}`);
      
      const response = await axios.patch(
        `${API_BASE_URL}/api/hotels/${hotelId}/price`,
        { 
          price: fullPrice,
          name: hotelName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {

        setHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel._id === hotelId ? { ...hotel, price: fullPrice } : hotel
          )
        );
        setFilteredHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel._id === hotelId ? { ...hotel, price: fullPrice } : hotel
          )
        );
        

        setSavedPrices(prevPrices => ({
          ...prevPrices,
          [hotelId]: fullPrice
        }));
        
        setSuccessMessage('Price updated successfully');
        

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error(response.data?.message || 'Failed to update price');
      }
    } catch (err) {
      console.error('Error updating price:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update price. Please try again.');
    } finally {
      setIsUpdatingPrice(false);
      setEditingHotel(null); // Close the editing form
    }
  };
  

  const updateRoomPrices = async (hotelId, rooms) => {
    setIsUpdatingPrice(true);
    setError(null);
    
    try {
      const response = await axios.patch(
        `${HOTELS_API_URL}/${hotelId}/room-prices`,
        { rooms },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {

        const updatedHotel = response.data.data;
        
        setHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel._id === hotelId ? updatedHotel : hotel
          )
        );
        setFilteredHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel._id === hotelId ? updatedHotel : hotel
          )
        );
        setSuccessMessage('Room prices updated successfully');
        

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error('Failed to update room prices');
      }
    } catch (err) {
      console.error('Error updating room prices:', err);
      setError(err.message || 'Failed to update room prices. Please try again.');
    } finally {
      setIsUpdatingPrice(false);
      setEditingHotel(null); // Close the editing form
    }
  };


  const toggleHotelRestriction = async (hotelId, isRestricted, reason = '') => {
    setIsRestricting(true);
    try {
      let hotelDbId = hotelId;
      const hotel = hotels.find(h => h.id === hotelId);
      
      if (!hotel) {
        throw new Error('Hotel not found');
      }
      if (!hotel.mongoId) {
        try {
          console.log('Creating new hotel:', hotel);
          const photoUrls = hotel.photos ? hotel.photos.map(photo => photo.name || '').filter(name => name) : [];
          
          const createResponse = await axios.post(
            HOTELS_API_URL,
            {
              name: hotel.name,
              location: hotel.location,
              description: hotel.description || '',
              rating: hotel.rating || 0,
              price: parseFloat(hotel.price || hotel.estimatedPrice || 100), // Ensure we have a numeric price
              placeId: hotel.id, // Store the Google Places ID for reference
              photos: photoUrls, // Send array of photo URLs instead of objects
              amenities: [],
              propertyType: 'apartment', // Default property type
              maxGuests: 2,
              bedrooms: 1,
              bathrooms: 1,
              status: 'active',
              rooms: [
                {
                  type: 'single',
                  capacity: 1,
                  price: parseFloat((hotel.price || hotel.estimatedPrice || 100) * 0.7),
                  count: 2
                },
                {
                  type: 'double',
                  capacity: 2,
                  price: parseFloat(hotel.price || hotel.estimatedPrice || 100),
                  count: 3
                }
              ],
              coordinates: {
                lat: hotel.coordinates?.lat || 0,
                lng: hotel.coordinates?.lng || 0
              },
              payment: {
                isPaid: true,
                paymentDate: new Date(),
                paymentMethod: 'card',
                amount: 10,
                currency: 'EUR'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (createResponse.data && createResponse.data.data) {
            hotelDbId = createResponse.data.data._id;
            setHotels(prevHotels =>
              prevHotels.map(h =>
                h.id === hotelId ? { ...h, mongoId: hotelDbId } : h
              )
            );
          } else {
            throw new Error('Failed to create hotel in database: Invalid response');
          }
        } catch (createError) {
          console.error('Error creating hotel:', createError.response?.data || createError);
          throw new Error(createError.response?.data?.message || 'Failed to create hotel in database');
        }
      }
      const response = await axios.put(
        `${HOTELS_API_URL}/${hotelDbId}/restrict`,
        { isRestricted, reason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel.id === hotelId ? { ...hotel, restrictions: { isRestricted, reason } } : hotel
          )
        );
        setFilteredHotels(prevHotels => 
          prevHotels.map(hotel => 
            hotel.id === hotelId ? { ...hotel, restrictions: { isRestricted, reason } } : hotel
          )
        );
        setSuccessMessage(`Hotel ${isRestricted ? 'restricted' : 'unrestricted'} successfully`);
      } else {
        throw new Error('Failed to update restriction');
      }
    } catch (err) {
      console.error('Error updating restriction:', err);
      setError(err.message || 'Failed to update restriction. Please try again.');
    } finally {
      setIsRestricting(false);
      setShowRestrictionModal(false);
    }
  };


  const getPhotoUrl = (photoReference, maxWidth = 400) => {
    if (!photoReference || !photoReference.name) return backgr;
    

    let url = `${API_BASE_URL}/api/places/media/${encodeURIComponent(photoReference.name)}?`;
    

    if (maxWidth) {
      url += `maxWidthPx=${maxWidth}`;
    }
    
    return url;
  };


  const startEditing = (hotel) => {
    const hotelId = hotel._id || hotel.id;
    setEditingHotel(hotelId);
    

    setUpdatedPrice(generateHotelPrice(hotel).toString());
  };


  const cancelEditing = () => {
    setEditingHotel(null);
    setUpdatedPrice('');
  };


  const openRestrictionModal = (hotel) => {
    setSelectedHotel(hotel);
    setRestrictionReason(hotel.restrictions?.reason || '');
    setShowRestrictionModal(true);
  };


  const closeRestrictionModal = () => {
    setShowRestrictionModal(false);
    setSelectedHotel(null);
    setRestrictionReason('');
  };


  const handleRoomPriceEdit = (hotelId, roomId, newPrice) => {
    if (isNaN(newPrice) || newPrice <= 0) {
      setError('Room price must be a positive number');
      return;
    }
    
    updateRoomPrices(hotelId, [{
      roomId: roomId,
      price: parseFloat(newPrice)
    }]);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-3xl font-bold mb-2 text-white flex items-center">
          <FaHotel className="text-blue-500 mr-3" />
          Hotel Management
        </h2>
        <p className="text-gray-400 ml-9">Manage hotel listings, update prices, and control which properties are visible to users</p>
      </div>
      
      {/* Search and filter */}
      <div className="mb-6 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <div className="relative">
              <input
                type="text"
                className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all text-white"
                placeholder="Search hotels by name or location..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center whitespace-nowrap font-medium"
              onClick={handleSearchClick}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  <span className="whitespace-nowrap">Searching...</span>
                </>
              ) : (
                <>
                  <FaSearch className="mr-2" />
                  <span className="whitespace-nowrap">Search</span>
                </>
              )}
            </button>
            <button
              className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors whitespace-nowrap flex items-center font-medium"
              onClick={handleRefreshClick}
              disabled={isLoading}
            >
              <FaSyncAlt className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh All'}
            </button>
          </div>
        </div>
        {searchQuery && (
          <div className="mt-3 text-gray-400 text-sm">
            {filteredHotels.length} {filteredHotels.length === 1 ? 'result' : 'results'} found for "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-100">
          {successMessage}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-100">
          {error}
        </div>
      )}
      
      {/* Hotels list */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <FaHotel className="mr-2" />
                    <span>Hotel</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Location</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <FaStar className="mr-2" />
                    <span>Rating</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <FaDollarSign className="mr-2" />
                    <span>Price (RON)</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Status</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-gray-400">
                    <FaSpinner className="animate-spin inline mr-2" />
                    Loading hotels...
                  </td>
                </tr>
              ) : filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-gray-400">
                    {searchQuery ? 'No hotels found matching your search.' : 'No hotels available.'}
                  </td>
                </tr>
              ) : (
                filteredHotels.map((hotel) => (
                  <tr key={hotel._id || hotel.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-14 w-14 rounded-md overflow-hidden">
                          {hotel.photos && hotel.photos.length > 0 ? (
                            <img 
                              src={getPhotoUrl(hotel.photos[0])} 
                              alt={hotel.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { e.target.src = backgr; }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-700">
                              <FaHotel className="text-blue-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{hotel.name}</div>
                          <div className="text-xs text-gray-400 mt-1">ID: {hotel._id || hotel.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-300 max-w-[200px]">
                        {hotel.location}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-gray-700 px-2 py-1 rounded-md flex items-center">
                          <span className="text-sm font-medium text-yellow-400 mr-1">{hotel.rating ? hotel.rating.toFixed(1) : 'N/A'}</span>
                          {hotel.rating > 0 && <FaStar className="text-yellow-400" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-300">
                      <span className="text-sm font-medium flex items-center">
                        <span className="text-green-500 mr-1">RON</span>
                        {generateHotelPrice(hotel).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        hotel.restrictions?.isRestricted 
                          ? 'bg-red-900/30 text-red-300 border border-red-700' 
                          : 'bg-green-900/30 text-green-300 border border-green-700'
                      }`}>
                        {hotel.restrictions?.isRestricted ? 'Restricted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className={`text-sm px-3 py-1 rounded-md flex items-center transition-colors ${
                          hotel.restrictions?.isRestricted
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        onClick={() => openRestrictionModal(hotel)}
                      >
                        {hotel.restrictions?.isRestricted ? (
                          <>
                            <FaCheck className="mr-1" />
                            <span>Activate</span>
                          </>
                        ) : (
                          <>
                            <FaBan className="mr-1" />
                            <span>Restrict</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Restriction Modal */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-lg font-medium mb-4 text-white">
              {selectedHotel?.restrictions?.isRestricted ? 'Activate Hotel' : 'Restrict Hotel'}
            </h3>
            
            {selectedHotel?.restrictions?.isRestricted ? (
              <p className="text-gray-300 mb-4">
                Are you sure you want to activate this hotel? This will make it available in search results.
              </p>
            ) : (
              <>
                <p className="text-gray-300 mb-4">
                  Are you sure you want to restrict this hotel? This will remove it from search results.
                </p>
                <div className="mb-4">
                  <label htmlFor="restrictionReason" className="block text-sm font-medium text-gray-400 mb-1">
                    Reason for restriction
                  </label>
                  <textarea
                    id="restrictionReason"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter reason for restriction"
                    value={restrictionReason}
                    onChange={(e) => setRestrictionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                onClick={closeRestrictionModal}
                disabled={isRestricting}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white flex items-center ${
                  selectedHotel?.restrictions?.isRestricted 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => toggleHotelRestriction(
                  selectedHotel._id, 
                  !selectedHotel.restrictions?.isRestricted,
                  restrictionReason
                )}
                disabled={isRestricting}
              >
                {isRestricting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : selectedHotel?.restrictions?.isRestricted ? (
                  'Activate Hotel'
                ) : (
                  'Restrict Hotel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelManagement; 