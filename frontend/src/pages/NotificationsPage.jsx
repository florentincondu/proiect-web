import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { FaArrowLeft, FaBell, FaEnvelope, FaCheck, FaTimes } from 'react-icons/fa';
import { useNotifications } from '../context/notificationContext';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, loading, error, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState('all'); 


  const memoizedFetchNotifications = useCallback(() => {
    fetchNotifications();
  }, []); // Empty dependency array

  useEffect(() => {
    memoizedFetchNotifications();
  }, [memoizedFetchNotifications]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'read') return notification.read;
    if (filter === 'unread') return !notification.read;
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy, HH:mm', { locale: ro });
    } catch (e) {
      return dateString;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
        return <FaBell className="text-blue-400" />;
      case 'support':
        return <FaEnvelope className="text-green-400" />;
      case 'contact':
        return <FaEnvelope className="text-purple-400" />;
      default:
        return <FaBell className="text-gray-400" />;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const getBackgroundColor = (isRead) => {
    return isRead ? 'bg-gray-900 bg-opacity-70' : 'bg-blue-900 bg-opacity-40';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6"
        >
          <FaArrowLeft className="mr-2" /> Înapoi
        </button>

        <div className="bg-gray-900 bg-opacity-70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-white flex items-center">
              <FaBell className="mr-3 text-blue-500" /> Notificările mele
            </h1>
            
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    filter === 'all' 
                      ? 'bg-blue-600 text-white border-blue-700' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  Toate
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 text-sm font-medium border-t border-b ${
                    filter === 'unread' 
                      ? 'bg-blue-600 text-white border-blue-700' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  Necitite
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                    filter === 'read' 
                      ? 'bg-blue-600 text-white border-blue-700' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  Citite
                </button>
              </div>
              
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 text-sm font-medium bg-blue-900 text-blue-300 rounded-lg border border-blue-800 hover:bg-blue-800 transition-colors"
                >
                  <FaCheck className="inline mr-1" /> Marchează toate ca citite
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-gray-800 bg-opacity-50 rounded-lg border border-red-900">
              <p className="text-red-400 mb-4">Nu am putut încărca notificările. Vă rugăm să încercați din nou mai târziu.</p>
              <button 
                onClick={memoizedFetchNotifications} 
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Încearcă din nou
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 bg-opacity-30 rounded-lg">
              <FaBell className="mx-auto text-5xl mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">Nu aveți {filter !== 'all' ? (filter === 'read' ? 'notificări citite' : 'notificări necitite') : 'notificări'} momentan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`p-5 rounded-lg transition-all ${getBackgroundColor(!notification.read)} backdrop-blur-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <div className="mr-3 text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <h3 className="text-lg font-medium text-white truncate">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="ml-3 px-2 py-0.5 text-xs font-medium bg-blue-900 text-blue-300 rounded-full">
                          Nou
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-900 text-blue-300 text-sm rounded-md hover:bg-blue-800 transition-colors"
                      >
                        <FaCheck className="mr-1.5" /> Marchează ca citit
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification._id)}
                      className="inline-flex items-center px-3 py-1.5 bg-red-900 text-red-300 text-sm rounded-md hover:bg-red-800 transition-colors"
                    >
                      <FaTimes className="mr-1.5" /> Șterge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;