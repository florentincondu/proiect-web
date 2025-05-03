import React, { createContext, useContext, useState, useEffect } from 'react';
import { TokenService, checkAuthToken } from '../api/auth';
import axios from 'axios';


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = TokenService.getToken();
      const storedUser = TokenService.getUser();

      if (storedToken && storedUser) {
        try {

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
    

    if (!userData || !authToken) {
      console.error('Invalid login data:', { userData, authToken });
      return false;
    }
    

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
    

    setUser(normalizedUser);
    setToken(authToken);
    

    TokenService.setToken(authToken);
    TokenService.setUser(normalizedUser);
    
    return true;
  };

  const logout = async () => {
    try {
      // Call the logout API endpoint if user is authenticated
      if (token) {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API success
      setUser(null);
      setToken(null);
      TokenService.removeToken();
      TokenService.removeUser();
    }
  };

  const isAuthenticated = !!token && !TokenService.isTokenExpired();


  const hasRole = (role) => {
    return isAuthenticated && user && user.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isHost = () => hasRole('host');
  const isClient = () => hasRole('client');
  const isGuest = () => !isAuthenticated || hasRole('guest');


  const isPremium = () => {
    return isAuthenticated && user && 
           user.bePartOfUs && user.bePartOfUs.type === 'premium';
  };


  const isPro = () => {
    return isAuthenticated && user && 
           user.bePartOfUs && 
           (user.bePartOfUs.type === 'pro' || user.bePartOfUs.type === 'premium');
  };


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


export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


export default AuthProvider;