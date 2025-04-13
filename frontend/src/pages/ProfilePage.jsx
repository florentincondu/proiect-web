import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaCog, 
  FaChartLine, FaMedal, FaShareAlt, FaEdit, FaCamera, FaBell, 
  FaCheck, FaRegStar, FaStar, FaMoon, FaSun, FaCalendar, FaShieldAlt,
  FaDesktop, FaTabletAlt, FaMobileAlt, FaLaptop, FaTimes } from 'react-icons/fa';
import { RiCameraLensFill } from 'react-icons/ri';
import { useAuth } from '../context/authContext';
import { getProfile, updateProfile, uploadProfileImage, uploadCoverImage } from '../api/auth';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('profile'); // 'profile' or 'cover'
  
  // References to hidden file inputs and video elements
  const profileImageInputRef = useRef(null);
  const coverImageInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileData = await getProfile();
        console.log('Profile data fetched:', profileData);
        
        // If profile data has image paths, log them for debugging
        if (profileData) {
          console.log('Profile image path:', profileData.profileImage);
          console.log('Cover image path:', profileData.coverImage);
        }
        
        setProfile(profileData);
        setError(null);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Cleanup function for camera
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updatedProfile = await updateProfile(profile);
      setProfile(updatedProfile);
      setError(null);
      setIsEditing(false);
      showNotification('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
      showNotification('Failed to update profile', 'error');
    }
  };

  // Handle file selection for profile image
  const handleProfileImageClick = () => {
    // Show option for camera or file
    setShowOptionModal('profile');
  };

  // Handle file selection for cover image
  const handleCoverImageClick = () => {
    // Show option for camera or file
    setShowOptionModal('cover');
  };

  // State for option modal
  const [showOptionModal, setShowOptionModal] = useState(null); // 'profile', 'cover' or null

  // Handle option selection (camera or file)
  const handleOptionSelection = (option) => {
    if (option === 'camera') {
      setCameraType(showOptionModal); // Set which type of image we're capturing
      setShowOptionModal(null);
      setShowCamera(true);
      startCamera();
    } else if (option === 'file') {
      if (showOptionModal === 'profile') {
        profileImageInputRef.current.click();
      } else if (showOptionModal === 'cover') {
        coverImageInputRef.current.click();
      }
      setShowOptionModal(null);
    } else {
      setShowOptionModal(null);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      showNotification('Failed to access camera', 'error');
      setShowCamera(false);
    }
  };

  // Take photo
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        try {
          if (cameraType === 'profile') {
            await handleProfileImageUpload(blob);
          } else if (cameraType === 'cover') {
            await handleCoverImageUpload(blob);
          }
          
          // Stop camera stream
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
          
          setShowCamera(false);
        } catch (error) {
          console.error('Error uploading image:', error);
          showNotification('Failed to upload image', 'error');
        }
      }, 'image/jpeg', 0.8);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // Handle profile image file selection
  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type and size
    const fileType = file.type.split('/')[0];
    if (fileType !== 'image') {
      showNotification('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification('Image size should not exceed 5MB', 'error');
      return;
    }

    await handleProfileImageUpload(file);
    // Clear the input
    e.target.value = '';
  };

  // Handle profile image upload (works for both file and blob)
  const handleProfileImageUpload = async (file) => {
    try {
      setUploadingProfile(true);
      const result = await uploadProfileImage(file);
      console.log('Profile image upload result:', result);
      
      // Make sure we're using the correct path from the server response
      setProfile(prev => ({ 
        ...prev, 
        profileImage: result.profileImage 
      }));
      showNotification('Profile image updated successfully!', 'success');
      
      // Force refresh the image by adding a cache-busting parameter
      if (result.profileImage) {
        const timestamp = new Date().getTime();
        const imageUrl = result.profileImage.includes('?') 
          ? `${result.profileImage}&t=${timestamp}` 
          : `${result.profileImage}?t=${timestamp}`;
        
        setProfile(prev => ({ 
          ...prev, 
          profileImage: imageUrl
        }));
      }
    } catch (err) {
      console.error('Profile image upload error:', err);
      showNotification('Failed to upload profile image', 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Handle cover image file selection
  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type and size
    const fileType = file.type.split('/')[0];
    if (fileType !== 'image') {
      showNotification('Please select an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('Image size should not exceed 10MB', 'error');
      return;
    }

    await handleCoverImageUpload(file);
    // Clear the input
    e.target.value = '';
  };

  // Handle cover image upload (works for both file and blob)
  const handleCoverImageUpload = async (file) => {
    try {
      setUploadingCover(true);
      const result = await uploadCoverImage(file);
      console.log('Cover image upload result:', result);
      
      // Make sure we're using the correct path from the server response
      setProfile(prev => ({ 
        ...prev, 
        coverImage: result.coverImage 
      }));
      showNotification('Cover image updated successfully!', 'success');
      
      // Force refresh the image by adding a cache-busting parameter
      if (result.coverImage) {
        const timestamp = new Date().getTime();
        const imageUrl = result.coverImage.includes('?') 
          ? `${result.coverImage}&t=${timestamp}` 
          : `${result.coverImage}?t=${timestamp}`;
        
        setProfile(prev => ({ 
          ...prev, 
          coverImage: imageUrl
        }));
      }
    } catch (err) {
      console.error('Cover image upload error:', err);
      showNotification('Failed to upload cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubscriptionChange = async (subscriptionType) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/subscriptions/change`,
        { subscription: subscriptionType, duration: 1 },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setProfile(response.data);
      setError(null);
      showNotification(`Subscription changed to ${subscriptionType}!`, 'success');
    } catch (err) {
      setError('Failed to change subscription');
      showNotification('Failed to change subscription', 'error');
      console.error('Subscription change error:', err);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to get correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // For absolute filesystem paths (which we need to fix)
    if (imagePath.includes('/Users/condu/Desktop')) {
      // Extract just the filename
      const filename = imagePath.split('/').pop();
      
      // Determine if it's a profile or cover image from the path
      let type = 'profile';
      if (imagePath.includes('/cover/')) {
        type = 'cover';
      }
      
      // Create a proper URL
      return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/${type}/${filename.split('?')[0]}`;
    }
    
    // If it's already a complete URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a relative path like /uploads/profile/... or /uploads/cover/...
    if (imagePath.startsWith('/uploads')) {
      // Add the API base URL
      return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${imagePath}`;
    }
    
    // For any other path, ensure it starts with a slash
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    // Add the API base URL
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${normalizedPath}`;
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500"></div>
    </div>
  );
  
  if (!profile) return (
    <div className="min-h-screen bg-black flex justify-center items-center">
      <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl text-center">
        <FaUser className="mx-auto h-16 w-16 text-zinc-400 mb-4" />
        <p className="text-xl font-semibold text-zinc-100">Profile not found</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-6 px-3 sm:px-6 lg:px-8 text-zinc-100">
      {/* Hidden file inputs */}
      <input 
        type="file" 
        ref={profileImageInputRef} 
        onChange={handleProfileImageChange} 
        style={{ display: 'none' }} 
        accept="image/*"
      />
      <input 
        type="file" 
        ref={coverImageInputRef} 
        onChange={handleCoverImageChange} 
        style={{ display: 'none' }} 
        accept="image/*"
      />
      
      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-80 shadow-xl border border-zinc-700">
            <h3 className="text-xl font-bold mb-4 text-center">
              {showOptionModal === 'profile' ? 'Update Profile Photo' : 'Update Cover Photo'}
            </h3>
            <div className="flex flex-col space-y-3">
              <button
                className="flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg transition-colors w-full"
                onClick={() => handleOptionSelection('camera')}
              >
                <RiCameraLensFill className="mr-2" size={20} />
                Take a Photo
              </button>
              <button
                className="flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg transition-colors w-full"
                onClick={() => handleOptionSelection('file')}
              >
                <FaCamera className="mr-2" size={18} />
                Upload from Device
              </button>
              <button
                className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors w-full mt-4"
                onClick={() => setShowOptionModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Interface */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="relative w-full max-w-md">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full rounded-lg shadow-lg"
              style={{ maxHeight: '70vh' }}
            ></video>
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button 
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                onClick={closeCamera}
              >
                <FaTimes size={24} />
              </button>
              <button 
                className="bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-full transition-colors"
                onClick={takePhoto}
              >
                <FaCamera size={24} />
              </button>
            </div>
            
            <p className="text-center text-white mt-4">
              {cameraType === 'profile' ? 'Take a profile photo' : 'Take a cover photo'}
            </p>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0 ${
            notification.type === 'success' ? 'bg-teal-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden mb-6 transform hover:translate-y-1 transition-all duration-300 border border-zinc-800">
          <div className="relative h-48 sm:h-60 bg-gradient-to-r from-black via-teal-900 to-black">
            {/* Cover Image */}
            {profile?.coverImage ? (
              <img
                src={getImageUrl(profile.coverImage)}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={() => console.log('Cover image loaded successfully')}
                onError={(e) => {
                  console.error('Error loading cover image:', e);
                  console.log('Attempted cover image URL:', e.target.src);
                  // Create a direct URL to the file without using a placeholder
                  try {
                    const newUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/cover/${profile.coverImage.split('/').pop()}`;
                    console.log('Trying alternative cover URL:', newUrl);
                    e.target.src = newUrl;
                    e.target.onerror = (e2) => {
                      console.error('Second attempt failed, using placeholder');
                      e2.target.src = 'https://via.placeholder.com/800x200?text=Cover+Image';
                      e2.target.onerror = null;
                    };
                  } catch (err) {
                    console.error('Error creating alternative URL:', err);
                    e.target.src = 'https://via.placeholder.com/800x200?text=Cover+Image';
                    e.target.onerror = null;
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-teal-900 to-zinc-900"></div>
            )}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            
            {/* Cover Image Upload Button */}
            <button 
              className="absolute top-4 right-4 p-2 bg-zinc-800/50 rounded-full hover:bg-zinc-700/70 transition-colors"
              onClick={handleCoverImageClick}
              disabled={uploadingCover}
            >
              {uploadingCover ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FaCamera className="h-5 w-5 text-white" />
              )}
            </button>
            
            <div className="absolute -bottom-12 left-4 sm:left-8">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden shadow-2xl">
                  {profile?.profileImage ? (
                    <img
                      src={getImageUrl(profile.profileImage)}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onLoad={() => console.log('Profile image loaded successfully')}
                      onError={(e) => {
                        console.error('Error loading profile image:', e);
                        console.log('Attempted profile image URL:', e.target.src);
                        // Create a direct URL to the file without using a placeholder
                        try {
                          const newUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/profile/${profile.profileImage.split('/').pop()}`;
                          console.log('Trying alternative profile URL:', newUrl);
                          e.target.src = newUrl;
                          e.target.onerror = (e2) => {
                            console.error('Second attempt failed, using placeholder');
                            e2.target.src = 'https://via.placeholder.com/150?text=Profile';
                            e2.target.onerror = null;
                          };
                        } catch (err) {
                          console.error('Error creating alternative URL:', err);
                          e.target.src = 'https://via.placeholder.com/150?text=Profile';
                          e.target.onerror = null;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-800 to-zinc-900">
                      <FaUser className="h-12 w-12 text-teal-200" />
                    </div>
                  )}
                </div>
                
                {/* Profile Image Upload Button */}
                <button 
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center shadow-lg opacity-100 group-hover:opacity-100 transition-opacity"
                  onClick={handleProfileImageClick}
                  disabled={uploadingProfile}
                >
                  {uploadingProfile ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaCamera className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="absolute bottom-6 left-32 sm:left-40 right-4 sm:right-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile?.name || 'User Name'}</h1>
                  <div className="flex items-center text-white/80 mt-1">
                    <FaEnvelope className="h-4 w-4 mr-2" />
                    <p className="text-sm sm:text-base truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-lg text-white font-medium flex items-center transition-colors text-sm"
                  >
                    <FaEdit className="mr-1 sm:mr-2" /> {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <button 
                    onClick={() => showNotification('Profile shared!', 'success')}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-medium flex items-center transition-colors text-sm"
                  >
                    <FaShareAlt className="mr-1 sm:mr-2" /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-16 pb-6 px-4 sm:px-8">
            <div className="flex flex-wrap gap-4">
              {profile?.phone && (
                <div className="flex items-center text-zinc-300">
                  <FaPhone className="h-4 w-4 mr-2 text-teal-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center text-zinc-300">
                  <FaMapMarkerAlt className="h-4 w-4 mr-2 text-teal-400" />
                  <span>{profile.address}</span>
                </div>
              )}
              {profile?.subscription?.type && (
                <div className="flex items-center text-zinc-300">
                  <FaMedal className="h-4 w-4 mr-2 text-teal-400" />
                  <span className="capitalize">{profile.subscription.type} Plan</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-900 rounded-xl shadow-xl mb-6 border border-zinc-800 overflow-x-auto">
          <div className="border-b border-zinc-800">
            <nav className="flex space-x-1" aria-label="Tabs">
              {[
                { id: 'personal', icon: <FaUser />, label: 'Personal Info' },
                { id: 'subscription', icon: <FaStar />, label: 'Subscription' },
                { id: 'statistics', icon: <FaChartLine />, label: 'Statistics' },
                { id: 'security', icon: <FaShieldAlt />, label: 'Security' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-3 sm:px-4 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-teal-500 text-teal-400 bg-zinc-800'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-teal-400' : 'text-zinc-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-zinc-900 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 transform hover:translate-y-1 transition-all duration-300 border border-zinc-800">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Personal Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <FaEdit className="mr-2" /> Edit
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="group">
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaUser className="text-zinc-500" />
                        </div>
                        <input
                          type="text"
                          value={profile?.name || ''}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="pl-10 block w-full rounded-lg border-zinc-700 bg-zinc-800 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-all text-white"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-zinc-500" />
                        </div>
                        <input
                          type="email"
                          value={profile?.email || ''}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="pl-10 block w-full rounded-lg border-zinc-700 bg-zinc-800 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-all text-white"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaPhone className="text-zinc-500" />
                        </div>
                        <input
                          type="tel"
                          value={profile?.phone || ''}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="pl-10 block w-full rounded-lg border-zinc-700 bg-zinc-800 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-all text-white"
                          placeholder="+1 (123) 456-7890"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaMapMarkerAlt className="text-zinc-500" />
                        </div>
                        <input
                          type="text"
                          value={profile?.address || ''}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          className="pl-10 block w-full rounded-lg border-zinc-700 bg-zinc-800 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-all text-white"
                          placeholder="123 Main St, City, Country"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-zinc-600 shadow-sm text-sm font-medium rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-gradient-to-r from-black to-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-teal-900 transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-teal-900 flex items-center justify-center mr-3">
                        <FaUser className="h-5 w-5 text-teal-200" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Name</p>
                        <p className="text-lg font-semibold text-zinc-100">{profile?.name || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-black to-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-teal-900 transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-teal-900 flex items-center justify-center mr-3">
                        <FaEnvelope className="h-5 w-5 text-teal-200" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Email</p>
                        <p className="text-lg font-semibold text-zinc-100">{profile?.email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-black to-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-teal-900 transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-teal-900 flex items-center justify-center mr-3">
                        <FaPhone className="h-5 w-5 text-teal-200" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Phone</p>
                        <p className="text-lg font-semibold text-zinc-100">{profile?.phone || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-black to-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-teal-900 transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-teal-900 flex items-center justify-center mr-3">
                        <FaMapMarkerAlt className="h-5 w-5 text-teal-200" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Address</p>
                        <p className="text-lg font-semibold text-zinc-100">{profile?.address || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Subscription Plan</h2>
                <div className="text-sm text-zinc-400">
                  Change plans anytime
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 shadow-xl border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-zinc-100">Choose Your Perfect Plan</h3>
                  <span className="px-3 py-1 bg-gradient-to-r from-teal-600 to-teal-900 rounded-full text-xs font-medium text-white">
                    Current: {profile?.subscription?.type || 'Free'}
                  </span>
                </div>
                <p className="text-zinc-300 mb-6">Get the most out of our platform with a plan that fits your needs.</p>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[
                    { 
                      type: 'free', 
                      name: 'Free', 
                      price: '$0', 
                      description: 'Up to $5K referral ARR',
                      features: ['Unlimited referrals', 'AI integrations', 'Core platform features'],
                      buttonText: 'Get Started',
                      bgClass: 'from-zinc-900 to-black',
                      popular: false
                    },
                    { 
                      type: 'basic', 
                      name: 'Grow', 
                      price: '$350', 
                      description: 'Up to $50K referral ARR',
                      features: ['Everything in Free, Plus:', 'In-brand customizations', 'In-bound email savings widget', 'Team integrations'],
                      buttonText: 'Recommended',
                      bgClass: 'from-teal-900 to-black',
                      popular: true
                    },
                    { 
                      type: 'premium', 
                      name: 'Scale', 
                      price: '$750', 
                      description: 'Up to $100K referral ARR',
                      features: ['Everything in Grow, Plus:', 'Premium SLAs', 'Premium support', 'Custom integrations'],
                      buttonText: 'Enterprise Choice',
                      bgClass: 'from-zinc-900 to-black',
                      popular: false
                    }
                  ].map((plan) => (
                    <div 
                      key={plan.type}
                      className={`relative rounded-xl border border-zinc-800 p-6 transition-all duration-300 hover:shadow-xl hover:border-teal-700 ${
                        plan.popular ? 'transform scale-105 ring-2 ring-teal-500 z-10' : ''
                      } bg-gradient-to-br ${plan.bgClass}`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-teal-500 text-black rounded-full text-xs font-bold">
                          MOST POPULAR
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg sm:text-xl font-bold text-white">{plan.name}</h4>
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl sm:text-3xl font-bold text-white">{plan.price}</span>
                        <span className="text-zinc-300">/mo</span>
                      </div>
                      <p className="text-zinc-300 text-sm mb-6">{plan.description}</p>
                      <div className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="flex-shrink-0 h-5 w-5 text-teal-400 mt-0.5">
                              <FaCheck />
                            </div>
                            <p className="ml-2 text-sm text-zinc-300">{feature}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleSubscriptionChange(plan.type)}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          profile?.subscription?.type === plan.type
                            ? 'bg-teal-600 text-white'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700'
                        }`}
                      >
                        {profile?.subscription?.type === plan.type ? 'Current Plan' : plan.buttonText}
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between sm:items-center">
                  <div className="px-6 py-3 bg-gradient-to-r from-teal-900 to-black rounded-lg font-medium text-white text-center sm:text-left">
                    Limited Time Offer - 20% Off Annual Plans
                  </div>
                  <button 
                    onClick={() => showNotification('Demo booked!', 'success')}
                    className="px-6 py-3 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Schedule a Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Account Statistics</h2>
                <div className="text-sm text-zinc-400">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'Total Logins', value: profile?.stats?.totalLogins || 0, icon: <FaUser />, color: 'bg-blue-600' },
                  { name: 'Days Active', value: profile?.stats?.daysActive || 0, icon: <FaCalendar />, color: 'bg-teal-600' },
                  { name: 'Completed Actions', value: profile?.stats?.completedActions || 0, icon: <FaCheck />, color: 'bg-teal-600' },
                  { name: 'Average Rating', value: (profile?.stats?.averageRating || 0).toFixed(1), icon: <FaStar />, color: 'bg-amber-600' }
                ].map((stat) => (
                  <div key={stat.name} className="bg-zinc-900 p-4 sm:p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all hover:shadow-lg">
                    <div className={`h-10 w-10 rounded-full ${stat.color} flex items-center justify-center mb-4`}>
                      <span className="text-black">{stat.icon}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{stat.name}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-zinc-100">{stat.value}</p>
                    <div className="h-1 w-full bg-zinc-800 mt-4 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-teal-700 rounded-full"
                        style={{ width: `${Math.min(stat.value * 5, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="bg-zinc-900 p-4 sm:p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Activity Overview</h3>
                  <div className="h-64 flex items-center justify-center bg-zinc-800 rounded-lg p-4 relative">
                    <div className="absolute inset-0 p-6 flex flex-col">
                      <div className="mb-4 flex justify-between items-center">
                        <div className="text-sm text-zinc-400">Monthly Activity</div>
                        <div className="text-sm text-zinc-400">Last 6 Months</div>
                      </div>
                      <div className="flex-1 flex items-end">
                        {[35, 45, 30, 60, 75, 50].map((height, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-1">
                            <div className="w-full px-1">
                              <div 
                                className="w-full bg-gradient-to-t from-teal-700 to-teal-500 rounded-t-sm"
                                style={{ height: `${height}%` }}
                              ></div>
                            </div>
                            <div className="text-zinc-500 text-xs mt-2">
                              {new Date(new Date().setMonth(new Date().getMonth() - (5 - idx))).toLocaleString('default', { month: 'short' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 sm:p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Device Usage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { device: 'Desktop', icon: <FaDesktop />, percentage: 45 },
                      { device: 'Mobile', icon: <FaMobileAlt />, percentage: 35 },
                      { device: 'Tablet', icon: <FaTabletAlt />, percentage: 15 },
                      { device: 'Laptop', icon: <FaLaptop />, percentage: 5 }
                    ].map((device) => (
                      <div key={device.device} className="flex items-center bg-zinc-800 rounded-lg p-4">
                        <div className="h-10 w-10 rounded-full bg-teal-900 flex items-center justify-center mr-3">
                          <span className="text-teal-200">{device.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-zinc-300">{device.device}</span>
                            <span className="text-sm text-zinc-300">{device.percentage}%</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-teal-700"
                              style={{ width: `${device.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Security Settings</h2>
                <div className="text-sm text-zinc-400">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="bg-zinc-900 p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Password & Authentication</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-200">Change Password</p>
                        <p className="text-sm text-zinc-400">Last changed: {profile?.lastPasswordChange || 'Never'}</p>
                      </div>
                      <button 
                        onClick={() => showNotification('Password change coming soon!', 'info')}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-sm transition-colors"
                      >
                        Update
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-200">Two-Factor Authentication</p>
                        <p className="text-sm text-zinc-400">{profile?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <button 
                        onClick={() => showNotification('2FA setup coming soon!', 'info')}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-sm transition-colors"
                      >
                        Configure
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-200">Biometric Login</p>
                        <p className="text-sm text-zinc-400">Use fingerprint or face recognition</p>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="toggle-biometric"
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                          defaultChecked={profile?.biometricEnabled}
                          onChange={() => showNotification('Biometric settings saved', 'success')}
                        />
                        <label 
                          htmlFor="toggle-biometric" 
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-zinc-700 cursor-pointer"
                        ></label>
                      </div>
                      <style>{`
                        .toggle-checkbox:checked {
                          transform: translateX(100%);
                          border-color: #14b8a6;
                        }
                        .toggle-checkbox:checked + .toggle-label {
                          background-color: #14b8a6;
                        }
                      `}</style>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-200">Profile Visibility</p>
                        <p className="text-sm text-zinc-400">Control who can see your profile</p>
                      </div>
                      <select 
                        defaultValue={profile?.privacySettings?.profileVisibility || 'public'}
                        onChange={() => showNotification('Privacy settings saved', 'success')}
                        className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2 pl-3 pr-8 text-sm"
                      >
                        <option value="public">Everyone</option>
                        <option value="connections">Connections Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-200">Email Notifications</p>
                        <p className="text-sm text-zinc-400">Receive updates about activity</p>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="toggle-email"
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                          defaultChecked={profile?.privacySettings?.emailNotifications}
                          onChange={() => showNotification('Email notification settings saved', 'success')}
                        />
                        <label 
                          htmlFor="toggle-email" 
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-zinc-700 cursor-pointer"
                        ></label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-200">Data Collection</p>
                        <p className="text-sm text-zinc-400">Allow usage data for improving services</p>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="toggle-data"
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                          defaultChecked={profile?.privacySettings?.dataCollection}
                          onChange={() => showNotification('Data collection settings saved', 'success')}
                        />
                        <label 
                          htmlFor="toggle-data" 
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-zinc-700 cursor-pointer"
                        ></label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-900 p-6 rounded-xl shadow-md border border-zinc-800 hover:border-teal-700 transition-all">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Sessions & Devices</h3>
                <div className="space-y-4">
                  {[
                    { device: 'MacBook Pro', location: 'San Francisco, CA', lastActive: 'Active now', current: true },
                    { device: 'iPhone 15', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
                    { device: 'iPad Pro', location: 'New York, NY', lastActive: '3 days ago', current: false }
                  ].map((session, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${session.current ? 'bg-teal-900' : 'bg-zinc-700'}`}>
                          <FaDesktop className={session.current ? 'text-teal-200' : 'text-zinc-400'} />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">{session.device}</p>
                          <p className="text-sm text-zinc-400">{session.location} • {session.lastActive}</p>
                        </div>
                      </div>
                      {session.current ? (
                        <span className="px-2 py-1 bg-teal-900/30 text-teal-400 rounded-md text-xs">Current Session</span>
                      ) : (
                        <button 
                          onClick={() => showNotification(`Logged out from ${session.device}`, 'success')}
                          className="px-3 py-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg text-sm transition-colors"
                        >
                          Log Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <button 
                    onClick={() => showNotification('Logged out from all other devices', 'success')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Log Out From All Other Devices
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;