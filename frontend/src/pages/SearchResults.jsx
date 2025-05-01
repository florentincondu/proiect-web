import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Map, Star, Hotel, Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateHotelPrice } from '../utils/priceUtils';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const HotelSearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('relevance');
  const [hotelSource, setHotelSource] = useState('all'); // 'all', 'external', 'internal'

  useEffect(() => {
    const storedResults = sessionStorage.getItem('searchResults');
    const storedQuery = sessionStorage.getItem('searchQuery');
    
    if (location.state?.results && location.state?.searchQuery) {
      console.log('Using results from navigation state');
      const processedResults = processSearchResults(location.state.results);
      
      if (processedResults.length > 0) {
        console.log('Found results:', processedResults.length);
        console.log('Sources:', processedResults.reduce((acc, hotel) => {
          acc[hotel.source] = (acc[hotel.source] || 0) + 1;
          return acc;
        }, {}));
      }
      
      sessionStorage.setItem('searchResults', JSON.stringify(processedResults));
      sessionStorage.setItem('searchQuery', location.state.searchQuery);
      
      setSearchQuery(location.state.searchQuery);
      setResults(processedResults);
      setLoading(false);
    } 
    else if (storedResults && storedQuery) {
      console.log('Using results from session storage');
      setSearchQuery(storedQuery);
      setResults(JSON.parse(storedResults));
      setLoading(false);
    } 
    else {
      console.log('No search results found, redirecting to home');
      navigate('/', { replace: true });
    }
  }, []);

  const processSearchResults = (searchResults) => {
    return searchResults.map(result => ({
      ...result,
      estimatedPrice: result.estimatedPrice || generateHotelPrice(result),
      amenities: result.amenities || {
        pool: Math.random() > 0.5,
        pets: Math.random() > 0.7,
        wifi: Math.random() > 0.2,
        breakfast: Math.random() > 0.6,
        parking: Math.random() > 0.4,
      },
      source: result.source || 'external' // Default to external if not specified
    }));
  };

  const handleFilterChange = (filter) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };
  
  const handleSourceChange = (source) => {
    setHotelSource(source);
  };

  const filteredResults = results.filter(result => {
    // Filter by source (external API or internal database)
    if (hotelSource !== 'all' && result.source !== hotelSource) {
      return false;
    }
    
    // Filter by amenities
    if (selectedFilters.length > 0) {
      return selectedFilters.every(filter => 
        result.amenities && result.amenities[filter]
      );
    }
    
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.estimatedPrice || 0) - (b.estimatedPrice || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  const getPhotoUrl = (result) => {
    try {
      // If the source is internal and we have a direct URL
      if (result.source === 'internal' && result.photos && result.photos.length > 0) {
        const photoName = result.photos[0].name;
        if (photoName.startsWith('http://') || photoName.startsWith('https://')) {
          return photoName;
        }
      }
      
      // For external API photos
      if (result.photos && result.photos.length > 0 && result.photos[0].name) {
        const photoName = result.photos[0].name;
        console.log(`Creating photo URL for: ${typeof photoName === 'string' ? photoName.substring(0, 20) : 'non-string'}...`);

        return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photoName)}?maxWidthPx=400`;
      }
      
      console.log('No valid photo found, using placeholder');
      return 'https://placehold.co/400x300/172a45/ffffff?text=No+Image';
    } catch (e) {
      console.error("Error creating photo URL:", e);
      return 'https://placehold.co/400x300/172a45/ffffff?text=No+Image';
    }
  };

  const getHotelImage = (result) => {
    try {
      if (result.photos && result.photos.length > 0) {
        const photoUrl = getPhotoUrl(result);
        
        return (
          <img
            src={photoUrl}
            alt={result.displayName?.text || 'Hotel'}
            className="w-full h-48 object-cover"
            onError={(e) => {
              console.error(`Image load error for: ${result.id}`);
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/400x300/172a45/ffffff?text=Image+Error';
            }}
          />
        );
      } else {
        return (
          <div className="w-full h-48 bg-[#172a45] flex items-center justify-center">
            <Hotel size={48} className="text-gray-600" />
            <p className="text-sm text-gray-400 mt-2">No image available</p>
          </div>
        );
      }
    } catch (error) {
      console.error("Error rendering hotel image:", error);
      return (
        <div className="w-full h-48 bg-[#172a45] flex items-center justify-center">
          <Hotel size={48} className="text-gray-600" />
          <p className="text-sm text-gray-400 mt-2">Image error</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Results for "{searchQuery}"
          </h1>
          <p className="text-gray-400">
            {results.length} places found
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="bg-[#172a45] hover:bg-[#1e3a5f] px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            ← Back to Home
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#172a45] text-white p-2 rounded-lg"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="price">Sort by Price</option>
            <option value="rating">Sort by Rating</option>
          </select>
          
          {/* Hotel Source Filter */}
          <select
            value={hotelSource}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="bg-[#172a45] text-white p-2 rounded-lg"
          >
            <option value="all">All Sources</option>
            <option value="external">Partner Hotels</option>
            <option value="internal">User Hotels</option>
          </select>
          
          {/* Amenity filters */}
          <div className="flex flex-wrap gap-2">
            {['wifi', 'pool', 'breakfast', 'parking', 'pets'].map(filter => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedFilters.includes(filter) 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#172a45] text-gray-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-400">
            <p>{error}</p>
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="text-center text-gray-400">
            <p>No results found for your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedResults.map((result, index) => (
              <motion.div
                key={result.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#172a45] rounded-lg overflow-hidden shadow-lg"
              >
                {getHotelImage(result)}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold mb-2">{result.displayName?.text || 'Unnamed Hotel'}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.source === 'internal' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {result.source === 'internal' ? 'User Hotel' : 'Partner'}
                    </span>
                  </div>
                  <p className="text-gray-400 mb-2">{result.formattedAddress || 'Address not available'}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="text-yellow-400" />
                    <span>{result.rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-gray-400">({result.userRatingCount || 0} reviews)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">{result.estimatedPrice || 0} {result.currency || 'RON'}</span>
                    <button 
                      onClick={() => navigate(`/hotel/${result.id}`)}
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSearchResults; 