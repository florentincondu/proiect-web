const eurToRon = 4.97;

// Determine a consistent base price for a hotel based on its ID
const getConsistentBasePriceFromId = (hotelId) => {
  if (!hotelId) return 33; // Reduced to 1/3 of 100
  
  // Create a deterministic number from hotel ID
  // This will generate the same number every time for the same hotel ID
  let hash = 0;
  for (let i = 0; i < hotelId.length; i++) {
    const char = hotelId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate a base price between 27 and 100 from the hash (1/3 of original 80-300)
  const absoluteHash = Math.abs(hash);
  return 27 + (absoluteHash % 73);
};

export const generateHotelPrice = (hotel = {}) => {
  // If this is a hotel with a saved price field from database, always prioritize it
  // This ensures admin-set prices are used consistently
  if (hotel.price && typeof hotel.price === 'number') {
    return Math.round(hotel.price / 3);
  }
  
  // If our hotel object already has a saved price from admin database
  if (hotel.savedPrice && typeof hotel.savedPrice === 'number') {
    return Math.round(hotel.savedPrice / 3);
  }
  
  if (!hotel) {
    return Math.round(57 * eurToRon); // Default average price (1/3 of 170)
  }
  
  // If hotel has an id and a previously calculated estimatedPrice, return it divided by 3
  if (hotel.id && hotel.estimatedPrice) {
    return Math.round(hotel.estimatedPrice / 3);
  }
  
  // Get a consistent base price for this specific hotel
  const basePrice = getConsistentBasePriceFromId(hotel.id);
  
  // Adjust the price based on various factors
  let adjustedPrice = basePrice;
  
  // Factor 1: Rating (0-5 stars) - can increase price up to 30%
  const ratingFactor = hotel.rating ? (hotel.rating / 5) : 0.5; 
  adjustedPrice *= (1 + (ratingFactor * 0.3));
  
  // Factor 2: User Rating Count - popular hotels are more expensive
  // This can increase price up to 40%
  let reviewCountFactor = 0;
  if (hotel.userRatingCount) {
    // Normalize review count - more reviews mean higher price
    if (hotel.userRatingCount > 1000) reviewCountFactor = 0.4;
    else if (hotel.userRatingCount > 500) reviewCountFactor = 0.3;
    else if (hotel.userRatingCount > 200) reviewCountFactor = 0.2;
    else if (hotel.userRatingCount > 50) reviewCountFactor = 0.1;
  }
  adjustedPrice *= (1 + reviewCountFactor);
  
  // Factor 3: Hotel type - luxury hotels, resorts cost more
  let typeFactor = 0;
  if (hotel.types && Array.isArray(hotel.types)) {
    if (hotel.types.includes('luxury') || hotel.types.includes('resort')) {
      typeFactor = 0.3; // 30% more
    } else if (hotel.types.includes('hotel')) {
      typeFactor = 0.15; // 15% more
    }
  }
  adjustedPrice *= (1 + typeFactor);
  
  // Factor 4: Location - center locations are more expensive
  let locationFactor = 0;
  if (hotel.formattedAddress && typeof hotel.formattedAddress === 'string') {
    const address = hotel.formattedAddress.toLowerCase();
    if (address.includes('center') || address.includes('centru') || 
        address.includes('downtown') || address.includes('central')) {
      locationFactor = 0.25; // 25% more for center location
    }
  }
  adjustedPrice *= (1 + locationFactor);
  
  // Round to nearest 5
  adjustedPrice = Math.round(adjustedPrice / 5) * 5;
  
  // Convert to RON
  return Math.round(adjustedPrice * eurToRon);
}; 