import React from 'react';
import { FaTools, FaClock } from 'react-icons/fa';

/**
 * Component that displays a maintenance notice to users
 * @param {Object} props
 * @param {string} props.message - The maintenance message
 * @param {string} props.completionTime - The estimated completion time
 * @param {boolean} props.fullScreen - Whether to display the notice as a full screen overlay
 * @param {Function} props.onClose - Optional callback when the notice is closed
 */
const MaintenanceNotice = ({ message, completionTime, fullScreen = false, onClose }) => {
  const formattedTime = completionTime ? new Date(completionTime).toLocaleString() : null;
  
  // Modal/overlay version for interrupting the user experience
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
        <div className="bg-gray-800 rounded-lg shadow-lg max-w-lg w-full mx-4 p-6 animate-fade-in">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl text-yellow-400 mb-6">
              <FaTools />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Site Maintenance in Progress
            </h2>
            
            <div className="text-gray-300 mb-6">
              <p className="mb-4">{message || "We're currently performing maintenance on our site. Please check back later."}</p>
              
              {formattedTime && (
                <div className="flex items-center justify-center text-blue-300 font-medium">
                  <FaClock className="mr-2" /> Expected to be back online by {formattedTime}
                </div>
              )}
            </div>
            
            {onClose && (
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Banner/notification version
  return (
    <div className="bg-yellow-600/90 rounded-lg shadow-md p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-white">
          <FaTools size={24} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-white font-medium">
            Maintenance Mode Active
          </p>
          <p className="text-yellow-100 mt-1">
            {message || "We're currently performing maintenance on our site."}
          </p>
          {formattedTime && (
            <p className="text-yellow-100 mt-1 flex items-center">
              <FaClock className="mr-1" /> Expected completion: {formattedTime}
            </p>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="ml-4 text-white hover:text-yellow-200"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default MaintenanceNotice; 