/**
 * API Configuration
 * This file defines common API endpoints used throughout the application
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
export const HOTELS_API_URL = `${API_BASE_URL}/api/hotels`;
export const HOTEL_PRICES_API_URL = `${API_BASE_URL}/api/admin/places/prices`;
export const PLACES_SEARCH_TEXT_URL = `${API_BASE_URL}/api/places/search-text`;
export const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
export const USER_API_URL = `${API_BASE_URL}/api/users`;
export const BOOKING_API_URL = `${API_BASE_URL}/api/bookings`;
export const MEDIA_API_URL = `${API_BASE_URL}/api/media`; 