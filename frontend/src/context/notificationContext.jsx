import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './authContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    if (!isAuthenticated || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.notifications.filter(notif => !notif.read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      // Set empty notifications instead of mock data
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      // First update UI for responsiveness
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Then update on server
      await axios.patch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // If server update fails, we can keep the UI updated anyway
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // First update UI for responsiveness
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
      
      // Then update on server
      await axios.patch(`${API_BASE_URL}/api/notifications/read-all`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // If server update fails, we can keep the UI updated anyway
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId) => {
    try {
      // First update UI for responsiveness
      const deletedNotif = notifications.find(n => n._id === notificationId);
      const wasUnread = deletedNotif && !deletedNotif.read;
      
      setNotifications(prev => 
        prev.filter(notif => notif._id !== notificationId)
      );
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Then update on server
      await axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      // If server update fails, we can keep the UI updated anyway
    }
  };

  // Add a simulation function to add a new notification (for testing)
  const addTestNotification = (type) => {
    const newNotification = {
      _id: Date.now().toString(),
      type: type || 'booking',
      title: type === 'support' ? 'New Support Response' : 'New Booking Update',
      message: type === 'support' 
        ? 'Your support request has received a new response' 
        : 'There is an update to your recent booking',
      read: false,
      createdAt: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // Fetch notifications when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      
      // Set up polling to check for new notifications (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        loading, 
        error, 
        fetchNotifications, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification,
        addTestNotification 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 