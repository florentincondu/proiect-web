import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import backgr from '../assets/start.avif';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const HotelCard = ({ 
  hotel, 
  currentImageIndex = 0, 
  onImageNavigate, 
  onClick, 
  roomAvailability = {},
  checkInDate,
  checkOutDate,
  guestCount
}) => {
  const [hoveredImage, setHoveredImage] = useState(false);
  
  // Helper function to get the photo URL
  const getPhotoUrl = (photo, maxWidth = 400) => {
    // Log for debugging
    console.log('HotelCard processing photo:', photo, typeof photo);
    
    // If no photo, return default image
    if (!photo) return backgr;
    
    // Handle object with name property
    if (typeof photo === 'object') {
      // Special case for user-uploaded images with name property that includes uploads/hotel path
      if (photo.name && typeof photo.name === 'string') {
        if (photo.name.includes('/uploads/hotel')) {
          return `${API_BASE_URL}${photo.name}`;
        } else {
          // Google Places API objects with name property
          return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo.name)}?maxWidthPx=${maxWidth}`;
        }
      }
      // For photo_reference from Google Places API
      else if (photo.photo_reference) {
        return `${API_BASE_URL}/api/places/photo?photo_reference=${encodeURIComponent(photo.photo_reference)}&maxwidth=${maxWidth}`;
      }
    }
    
    // Handle string paths
    if (typeof photo === 'string') {
      // For relative URLs uploaded by users with /uploads/ prefix
      if (photo.startsWith('/uploads/')) {
        return `${API_BASE_URL}${photo}`;
      }
      
      // For paths containing uploads/hotel without leading slash
      if (photo.includes('uploads/hotel')) {
        return photo.startsWith('/') 
          ? `${API_BASE_URL}${photo}` 
          : `${API_BASE_URL}/${photo}`;
      }
      
      // For absolute external URLs
      if (photo.startsWith('http')) {
        return photo;
      }
      
      // For placeholder images
      if (photo.includes('placehold.co')) {
        return photo;
      }
      
      // For other strings that might be file paths
      try {
        if (photo.includes('/') || photo.includes('\\')) {
          // Extract filename and assume it's in hotel uploads
          const fileName = photo.split(/[\/\\]/).pop();
          // Use hotels (plural) path as seen in searchLodge.jsx
          return `${API_BASE_URL}/uploads/hotel/${fileName}`;
        }
        
        // Default case for other strings - assume it's a media ID
        return `${API_BASE_URL}/api/places/media/${encodeURIComponent(photo)}?maxWidthPx=${maxWidth}`;
      } catch (error) {
        console.error('Error formatting image URL string:', error);
        return backgr;
      }
    }
    
    // Default case
    console.warn('Unsupported image URL format:', photo);
    return backgr;
  };
  
  // Navigate to next/previous image
  const handleImageNavigate = (direction, e) => {
    e.stopPropagation();
    if (onImageNavigate) {
      onImageNavigate(hotel.id, direction);
    }
  };
  
  // Get the current photo
  const currentPhoto = hotel.photos && hotel.photos.length > 0 
    ? hotel.photos[currentImageIndex || 0] 
    : null;
  
  // Get hotel availability info
  const availabilityInfo = hotel.id && roomAvailability[hotel.id];
  
  // Calculate if any room is available and can accommodate the requested guests
  const hasAvailableRoom = availabilityInfo?.availableRoomTypes?.some(room => {
    const roomData = roomAvailability[hotel.id]?.[room];
    return roomData?.available && roomData?.availableRooms > 0;
  });
  
  // Find the next available date if no rooms are available
  const getNextAvailableDate = () => {
    if (!availabilityInfo || hasAvailableRoom) return null;
    
    // Find the earliest next available date from all room types
    let earliestDate = null;
    
    if (availabilityInfo.availableRoomTypes) {
      availabilityInfo.availableRoomTypes.forEach(roomType => {
        const roomData = roomAvailability[hotel.id]?.[roomType];
        if (roomData?.nextAvailableDate) {
          if (!earliestDate || new Date(roomData.nextAvailableDate) < new Date(earliestDate)) {
            earliestDate = roomData.nextAvailableDate;
          }
        }
      });
    }
    
    return earliestDate;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Data indisponibilă';
      }
      
      return date.toLocaleDateString('ro-RO', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data indisponibilă';
    }
  };
  
  // Get total available rooms count
  const getTotalAvailableRooms = () => {
    if (!availabilityInfo || !availabilityInfo.availableRoomTypes) return 0;
    
    return availabilityInfo.availableRoomTypes.reduce((total, roomType) => {
      const roomData = roomAvailability[hotel.id]?.[roomType];
      return total + (roomData?.availableRooms || 0);
    }, 0);
  };
  
  // Get total rooms count
  const getTotalRooms = () => {
    if (!availabilityInfo || !availabilityInfo.availableRoomTypes) return 0;
    
    return availabilityInfo.availableRoomTypes.reduce((total, roomType) => {
      const roomData = roomAvailability[hotel.id]?.[roomType];
      return total + (roomData?.totalRooms || 0);
    }, 0);
  };
  
  const nextAvailableDate = getNextAvailableDate();
  const totalAvailableRooms = getTotalAvailableRooms();
  const totalRooms = getTotalRooms();
  
  return (
    <div 
      className="bg-[#172a45] rounded-lg overflow-hidden shadow-lg border border-blue-500/20 cursor-pointer relative flex flex-col h-full transition-transform hover:scale-105"
      onClick={() => onClick && onClick(hotel.id, { checkInDate, checkOutDate, guestCount })}
    >
      {/* Image Section */}
      <div className="relative h-32 xs:h-36 sm:h-40 md:h-44 overflow-hidden">
        <img 
          src={getPhotoUrl(currentPhoto)}
          alt={hotel.displayName?.text || hotel.name || 'Hotel image'} 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          onError={(e) => {
            console.error('Image failed to load:', e.target.src, 'Original photo:', currentPhoto);
            e.target.onerror = null;
            e.target.src = backgr;
          }}
          onMouseEnter={() => setHoveredImage(true)}
          onMouseLeave={() => setHoveredImage(false)}
        />
        
        {/* Navigation arrows */}
        {hotel.photos && hotel.photos.length > 1 && (
          <div className={`absolute inset-0 flex items-center justify-between px-2 ${hoveredImage ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={(e) => handleImageNavigate('prev', e)}
              className="bg-black/50 hover:bg-black/70 rounded-full p-1 sm:p-1.5 text-white transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={(e) => handleImageNavigate('next', e)}
              className="bg-black/50 hover:bg-black/70 rounded-full p-1 sm:p-1.5 text-white transition"
              aria-label="Next image"
            >
              <ChevronRight size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
        
        {/* Rating badge */}
        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-blue-900/80 px-1.5 sm:px-2 py-0.5 rounded text-xs flex items-center">
          <Star size={10} className="text-yellow-400 mr-0.5 sm:mr-1" fill="currentColor" />
          <span>{hotel.rating?.toFixed(1) || '?'}</span>
          {hotel.userRatingCount && (
            <span className="text-gray-400 ml-0.5 sm:ml-1 text-[10px] sm:text-xs">({hotel.userRatingCount})</span>
          )}
        </div>
        
        {/* Availability badge */}
        {availabilityInfo && (
          <div className={`absolute bottom-1 sm:bottom-2 left-1 sm:left-2 px-1 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-medium ${
            hasAvailableRoom
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {!hasAvailableRoom
              ? 'Indisponibil' 
              : `${totalAvailableRooms} ${totalAvailableRooms === 1 ? 'cameră disponibilă' : 'camere disponibile'}`
            }
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="p-2 sm:p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-xs sm:text-sm md:text-base truncate mb-0.5 sm:mb-1">{hotel.displayName?.text || hotel.name}</h3>
        
        <p className="text-gray-400 text-[9px] sm:text-xs mb-1 line-clamp-1">
          {hotel.formattedAddress || hotel.location || 'Address information not available'}
        </p>
        
        {/* Next available date notification if no rooms available */}
        {availabilityInfo && !hasAvailableRoom && nextAvailableDate && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-1 text-[9px] sm:text-xs text-amber-400 mb-1.5">
            <p className="line-clamp-2">Nu există disponibilitate pentru perioada aleasă. Următoarea dată disponibilă: {formatDate(nextAvailableDate)}</p>
          </div>
        )}
        
        {/* Amenities */}
        <div className="flex flex-wrap gap-1 mb-1 sm:mb-2 mt-auto">
          {hotel.amenities && (
            Array.isArray(hotel.amenities) 
              ? hotel.amenities.slice(0, 3).map((amenity, index) => (
                <span key={index} className="bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded text-[8px] sm:text-[9px] md:text-xs">
                  {typeof amenity === 'string' ? amenity.charAt(0).toUpperCase() + amenity.slice(1) : ''}
                </span>
              ))
              : Object.entries(hotel.amenities)
                .filter(([key, value]) => value === true)
                .slice(0, 3)
                .map(([key]) => (
                  <span key={key} className="bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded text-[8px] sm:text-[9px] md:text-xs">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                ))
          )}
        </div>
        
        {/* Price and Book Now button */}
        <div className="flex justify-between items-center mt-1">
          <div>
            <span className="text-xs sm:text-sm md:text-base font-bold text-green-300">
              {hotel.price || hotel.estimatedPrice || '?'} RON
            </span>
            <span className="text-[8px] sm:text-[9px] md:text-xs text-gray-400 block">per night</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick && onClick(hotel.id, { checkInDate, checkOutDate, guestCount });
            }}
            className={`${hasAvailableRoom 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-500 hover:bg-gray-600'} text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-xs font-medium transition-colors`}
          >
            {hasAvailableRoom ? 'Rezervă' : 'Vezi detalii'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard; 