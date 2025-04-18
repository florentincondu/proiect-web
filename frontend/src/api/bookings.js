import axios from 'axios';

const API_URL = 'http://localhost:5000/api';


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


export const createHotelBooking = async (bookingData) => {
  try {
    const response = await api.post('/bookings/hotel', bookingData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create booking' };
  }
};


export const getUserBookings = async (type = '') => {
  try {

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await api.get(`/bookings/my-bookings${type ? `?type=${type}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user bookings:', error);

    if (error.response?.status === 401) {
      throw { message: 'Your session has expired. Please log in again.' };
    }
    throw error.response?.data || { message: 'Failed to fetch bookings. Please try again later.' };
  }
};


export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.put(`/bookings/cancel/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to cancel booking' };
  }
};


export const getBookingDetails = async (bookingId) => {
  try {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch booking details' };
  }
};


export const getAllBookings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    
    const response = await api.get(`/bookings?${queryParams.toString()}`);
    
    console.log('API response for getAllBookings:', response.data);
    

    const processedData = response.data.map(booking => {
      if (booking.user && !booking.user.name && (booking.user.firstName || booking.user.lastName)) {
        booking.user.name = `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'Unknown User';
        console.log('Name created for user:', booking.user.name);
      }
      return booking;
    });
    
    return processedData;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch bookings' };
  }
};


export const updateBookingStatus = async (bookingId, data) => {
  try {
    const response = await api.put(`/bookings/${bookingId}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update booking' };
  }
};


export const deleteBooking = async (bookingId) => {
  try {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete booking' };
  }
};


export const getBookingStats = async () => {
  try {
    const response = await api.get('/bookings/stats/overview');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch booking statistics' };
  }
}; 