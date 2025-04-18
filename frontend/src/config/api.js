export const API_BASE_URL = 'http://localhost:5000';
export const RESULTS_PER_PAGE = 15;
export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.types,places.websiteUri,places.priceLevel,places.businessStatus'
}); 