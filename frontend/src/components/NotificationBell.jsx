import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/notificationContext';
import { FaBell, FaCheckCircle, FaTimesCircle, FaEnvelope, FaCalendarAlt, FaExclamationCircle } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }


    if (notification.type === 'booking') {
      navigate('/my-bookings');
    } else if (notification.type === 'support') {
      navigate('/contact-us');
    }


    setIsOpen(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking':
        return <FaCalendarAlt className="text-blue-500" />;
      case 'support':
        return <FaEnvelope className="text-green-500" />;
      default:
        return <FaExclamationCircle className="text-yellow-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`border-b border-gray-700 p-3 cursor-pointer hover:bg-gray-800 transition-colors flex ${
                      !notification.read ? 'bg-gray-800/40' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mr-3 mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <h4 className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-gray-400 hover:text-gray-300"
                          aria-label="Delete notification"
                        >
                          <FaTimesCircle size={16} />
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>{formatDate(notification.createdAt)}</span>
                        {!notification.read && (
                          <span className="text-blue-400 flex items-center">
                            <span className="h-2 w-2 rounded-full bg-blue-400 mr-1"></span> New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-gray-700 text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell; 