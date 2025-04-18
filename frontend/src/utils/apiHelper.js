import axios from 'axios';

/**
 * Helper utility for API requests with fallbacks and error handling
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Check if a specific API endpoint is available
 * @param {string} endpoint - The endpoint to check (e.g. "/api/places/prices")
 * @returns {Promise<boolean>} - Whether the endpoint is available
 */
export const isEndpointAvailable = async (endpoint) => {
  try {
    await axios.options(`${API_BASE_URL}${endpoint}`);
    return true;
  } catch (error) {
    console.warn(`Endpoint ${endpoint} check failed:`, error.message);
    return false;
  }
};

/**
 * Safely fetch data from an API endpoint with fallback
 * @param {string} endpoint - The endpoint to fetch from
 * @param {object} fallbackData - Data to return if the endpoint is unavailable
 * @returns {Promise<object>} - The API response data or fallback data
 */
export const safeFetch = async (endpoint, fallbackData = { success: true, data: [] }) => {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.warn(`Safely falling back for ${endpoint}:`, error.message);
    return fallbackData;
  }
};

/**
 * Get prices safely or return empty object if unavailable
 */
export const getPlacePrices = async () => {
  const response = await safeFetch('/api/places/prices', { success: true, prices: [] });
  if (response.success && response.prices) {
    return response.prices.reduce((acc, item) => {
      acc[item.placeId] = item.price;
      return acc;
    }, {});
  }
  
  return {};
};

/**
 * Get restrictions safely or return empty object if unavailable
 */
export const getPlaceRestrictions = async () => {
  const response = await safeFetch('/api/places/restrictions', { success: true, restrictions: [] });
  if (response.success && response.restrictions) {
    return response.restrictions.reduce((acc, item) => {
      acc[item.placeId] = {
        isRestricted: item.isRestricted,
        reason: item.reason
      };
      return acc;
    }, {});
  }
  
  return {};
};

export default {
  API_BASE_URL,
  isEndpointAvailable,
  safeFetch,
  getPlacePrices,
  getPlaceRestrictions
}; 