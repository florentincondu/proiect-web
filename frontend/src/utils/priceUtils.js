const eurToRon = 4.97;
const getConsistentBasePriceFromId = (hotelId) => {
  if (!hotelId) return 100; // Default base price
  let hash = 0;
  for (let i = 0; i < hotelId.length; i++) {
    const char = hotelId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const absoluteHash = Math.abs(hash);
  return 80 + (absoluteHash % 220);
};

export const generateHotelPrice = (hotel = {}) => {
  console.log("Hotel price:",hotel);
  let finalPrice = 0;
  if (hotel.price && typeof hotel.price === 'number') {
    finalPrice = hotel.price;
  }
  else if (hotel.savedPrice && typeof hotel.savedPrice === 'number') {
    finalPrice = hotel.savedPrice;
  }
  else if (!hotel) {
    finalPrice = Math.round(100 * eurToRon);
  }
  else if (hotel.id && hotel.estimatedPrice) {
    finalPrice = hotel.estimatedPrice;
  }
  else {
    const basePrice = getConsistentBasePriceFromId(hotel.id);
    let adjustedPrice = basePrice;
    const ratingFactor = hotel.rating ? (hotel.rating / 5) : 0.3; 
    adjustedPrice *= (1 + (ratingFactor * 0.3));
    let reviewCountFactor = 0;
    if (hotel.userRatingCount) {
      if (hotel.userRatingCount > 1000) reviewCountFactor = 0.4;
      else if (hotel.userRatingCount > 500) reviewCountFactor = 0.3;
      else if (hotel.userRatingCount > 200) reviewCountFactor = 0.2;
      else if (hotel.userRatingCount > 100) reviewCountFactor = 0.1;
    }
    adjustedPrice *= (1 + reviewCountFactor);
    let typeFactor = 0;
    if (hotel.types && Array.isArray(hotel.types)) {
      if (hotel.types.includes('luxury') || hotel.types.includes('resort')) {
        typeFactor = 0.3; 
      } else if (hotel.types.includes('hotel')) {
        typeFactor = 0.15; 
      }
    }
    adjustedPrice *= (1 + typeFactor);
    let locationFactor = 0;
    if (hotel.address && typeof hotel.address === 'string') {
      const address = hotel.address.toLowerCase();
      if (address.includes('center') || address.includes('centru') || 
          address.includes('downtown') || address.includes('central')) {
        locationFactor = 0.25;
      }
    }
    adjustedPrice *= (1 + locationFactor);
    finalPrice = Math.round(adjustedPrice * eurToRon / 10) * 10;
  }
  finalPrice = Math.round((finalPrice / 3) / 10) * 10;
  return Math.round(finalPrice / 10) * 10;
}; 