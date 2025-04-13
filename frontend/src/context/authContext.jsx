import React, { createContext, useContext, useState, useEffect } from 'react';
import { TokenService, checkAuthToken } from '../api/auth';

// Create the auth context
const AuthContext = createContext(null);

// Auth Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = TokenService.getToken();
      const storedUser = TokenService.getUser();

      if (storedToken && storedUser) {
        try {
          // Validate stored token
          const isValidToken = await checkAuthToken();
          if (isValidToken) {
            setToken(storedToken);
            setUser(storedUser);
            console.log('User session restored successfully');
          } else {
            console.log('Stored token is invalid, logging out');
            logout();
          }
        } catch (error) {
          console.error('Token validation error:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Function to refresh auth state - can be called after token restoration
  const refreshAuthState = async () => {
    const storedToken = TokenService.getToken();
    const storedUser = TokenService.getUser();
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      return true;
    }
    return false;
  };

  const login = (userData, authToken) => {
    console.log('Login in authContext:', { userData, authToken });
    
    // Ensure we have valid data
    if (!userData || !authToken) {
      console.error('Invalid login data:', { userData, authToken });
      return false;
    }
    
    // Normalize user data structure
    const normalizedUser = {
      id: userData.id || userData._id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
      profileImage: userData.profileImage,
      subscription: userData.subscription || 
                   (userData.bePartOfUs && userData.bePartOfUs.type) || 
                   'free'
    };
    
    console.log('Normalized user data:', normalizedUser);
    
    // Update state
    setUser(normalizedUser);
    setToken(authToken);
    
    // Save to localStorage
    TokenService.setToken(authToken);
    TokenService.setUser(normalizedUser);
    
    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    TokenService.removeToken();
    TokenService.removeUser();
  };

  const isAuthenticated = !!token && !TokenService.isTokenExpired();

  // Role check helpers
  const hasRole = (role) => {
    return isAuthenticated && user && user.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isHost = () => hasRole('host');
  const isClient = () => hasRole('client');
  const isGuest = () => !isAuthenticated || hasRole('guest');

  // Check if user has a premium subscription
  const isPremium = () => {
    return isAuthenticated && user && 
           user.bePartOfUs && user.bePartOfUs.type === 'premium';
  };

  // Check if user has a pro subscription
  const isPro = () => {
    return isAuthenticated && user && 
           user.bePartOfUs && 
           (user.bePartOfUs.type === 'pro' || user.bePartOfUs.type === 'premium');
  };

  // Context value with all auth-related state and functions
  const authContextValue = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin,
    isHost,
    isClient,
    isGuest,
    isPremium,
    isPro,
    refreshAuthState
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export for the provider
export default AuthProvider;