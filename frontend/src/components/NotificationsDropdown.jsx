import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaRegBell, FaEnvelope, FaCheck } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useNotifications } from '../context/notificationContext';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    addTestNotification 
  } = useNotifications();


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd MMM, HH:mm', { locale: ro });
    } catch (e) {
      return dateString;
    }
  };


  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
        return <FaBell className="text-blue-500" />;
      case 'support':
        return <FaEnvelope className="text-green-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };


  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };


  const viewAllNotifications = () => {
    setIsOpen(false);
    navigate('/notifications');
  };


  const getNotificationMessage = (message) => {
    if (message.length > 100) {
      return message.substring(0, 100) + '...';
    }
    return message;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-1 rounded-full text-gray-600 hover:text-gray-800 focus:outline-none relative"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <FaBell className="w-6 h-6" />
        ) : (
          <FaRegBell className="w-6 h-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Notificări</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllAsRead();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <FaCheck className="mr-1" /> Marchează toate ca citite
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Nu aveți notificări</p>
              </div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-3 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-baseline">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {getNotificationMessage(notification.message)}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Marchează ca citit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {notifications.length > 5 && (
                  <div className="px-3 py-2 text-center bg-gray-50">
                    <p className="text-xs text-gray-500">
                      Se afișează 5 din {notifications.length} notificări
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-100 border-t text-center">
            <button
              onClick={viewAllNotifications}
              className="w-full text-sm text-blue-600 hover:text-blue-800"
            >
              Vezi toate notificările
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown; 