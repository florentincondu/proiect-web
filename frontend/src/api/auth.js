import axios from 'axios';

// Set base URL for API requests
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Add auth token to requests if available
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    // If token expired or unauthorized
    if (status === 401) {
      // Clear authentication data
      TokenService.removeToken();
      TokenService.removeUser();
      // Redirect to login or handle appropriately
    }
    
    return Promise.reject(error);
  }
);

export const TokenService = {
  getToken: () => localStorage.getItem('token'),
  
  setToken: (token) => localStorage.setItem('token', token),
  
  removeToken: () => localStorage.removeItem('token'),
  
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  
  removeUser: () => localStorage.removeItem('user'),
  
  isTokenExpired: () => {
    const token = localStorage.getItem('token');
    if (!token) return true; // Dacă nu există token, considerăm că e expirat
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1])); // Decodăm payload-ul JWT
      return payload.exp < Date.now() / 1000; // Comparăm expirația cu timestamp-ul curent
    } catch (error) {
      return true; // Dacă nu poate fi decodat, considerăm că e expirat
    }
  }
};
 
// Check if the auth token is still valid
export const checkAuthToken = async () => {
  const token = TokenService.getToken();
  if (!token || TokenService.isTokenExpired()) {
    TokenService.removeToken();
    TokenService.removeUser();
    return false;
  }
  return true; // Token-ul este valid
};

// Register a new user
export const signup = async (firstName, lastName, email, password, role = 'client', subscriptionType = 'free') => {
  try {
    const response = await axios.post('/api/auth/register', {
      firstName,
      lastName,
      email,
      password,
      role,
      subscriptionType
    });
    
    // Store user and token in localStorage if successful
    if (response.data.token) {
      TokenService.setToken(response.data.token);
      TokenService.setUser(response.data.user);
    }
    
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Registration failed. Please try again.'
    );
  }
};

// Login user
export const login = async (email, password, rememberMe = false) => {
  try {
    console.log('Making login request with:', { email });
    
    const response = await axios.post('/api/auth/login', {
      email,
      password,
      rememberMe
    });
    
    console.log('Login API response:', response.data);
    
    // Store user and token in localStorage if successful
    if (response.data.token) {
      TokenService.setToken(response.data.token);
      
      // Construiește obiectul user din datele primite direct
      const userData = {
        id: response.data.id,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email,
        role: response.data.role,
        profileImage: response.data.profileImage,
        subscription: response.data.subscription || 'free'
      };
      
      console.log('Processed user data:', userData);
      
      TokenService.setUser(userData);
    }
    
    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    console.error('Error response:', error.response?.data);
    
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      throw {
        message: error.response.data.message || 'Login failed. Please check your credentials.',
        response: error.response
      };
    } else if (error.request) {
      // Request was made but no response received
      throw {
        message: 'No response from server. Please check your connection.',
        request: error.request
      };
    } else {
      // Something else caused the error
      throw {
        message: error.message || 'Login failed. Please try again.'
      };
    }
  }
};

// Logout user
export const logout = () => {
  TokenService.removeToken();
  TokenService.removeUser();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return checkAuthToken();
};

// Get current user
export const getCurrentUser = () => {
  return TokenService.getUser();
};

// Get user profile
export const getProfile = async () => {
  try {
    console.log('Fetching profile from:', `${API_URL}/api/auth/profile`);
    const response = await axios.get('/api/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch profile.'
    );
  }
};

// Change subscription type
export const changeSubscription = async (subscriptionType) => {
  try {
    const response = await axios.post('/api/auth/change-subscription', {
      subscriptionType
    });
    
    // Update user in localStorage if successful
    if (response.data.user) {
      const currentUser = TokenService.getUser();
      if (currentUser) {
        currentUser.role = response.data.user.role;
        currentUser.subscription = response.data.user.subscription;
        TokenService.setUser(currentUser);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Subscription change error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to change subscription.'
    );
  }
};

// Update user profile
export const updateProfile = async (userData) => {
  try {
    const response = await axios.put('/api/auth/profile', userData);
    
    // Update user in localStorage if successful
    if (response.data.user) {
      TokenService.setUser(response.data.user);
    }
    
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to update profile.'
    );
  }
};

// Upload profile image
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    console.log('Uploading profile image...');
    
    const response = await axios.post('/api/auth/upload-profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Upload profile image response:', response.data);
    
    // Update user in localStorage with new profile image
    const currentUser = TokenService.getUser();
    if (currentUser && response.data.profileImage) {
      currentUser.profileImage = response.data.profileImage;
      TokenService.setUser(currentUser);
      console.log('Updated user with new profile image path:', response.data.profileImage);
    }
    
    return response.data;
  } catch (error) {
    console.error('Profile image upload error:', error);
    console.error('Error details:', error.response?.data);
    throw new Error(
      error.response?.data?.message || 'Failed to upload profile image.'
    );
  }
};

// Upload cover image
export const uploadCoverImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('coverImage', file);
    
    console.log('Uploading cover image...');
    
    const response = await axios.post('/api/auth/upload-cover-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Upload cover image response:', response.data);
    
    // Update user in localStorage with new cover image
    const currentUser = TokenService.getUser();
    if (currentUser && response.data.coverImage) {
      currentUser.coverImage = response.data.coverImage;
      TokenService.setUser(currentUser);
      console.log('Updated user with new cover image path:', response.data.coverImage);
    }
    
    return response.data;
  } catch (error) {
    console.error('Cover image upload error:', error);
    console.error('Error details:', error.response?.data);
    throw new Error(
      error.response?.data?.message || 'Failed to upload cover image.'
    );
  }
};

// Verify admin code
export const verifyAdminCode = async (token, code, email) => {
  try {
    console.log(`Attempting verification with token: ${token}, code: ${code}, email: ${email}`);
    const response = await axios.post(
      '/api/admin-approval/verify-code',
      { token, code, email }
    );
    
    // Store user and token in localStorage if successful
    if (response.data.token && response.data.user) {
      TokenService.setToken(response.data.token);
      TokenService.setUser(response.data.user);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error verifying admin code:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to verify admin code.'
    );
  }
};

// Change user password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await axios.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    
    return response.data;
  } catch (error) {
    console.error('Password change error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to change password.'
    );
  }
};