import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCog, 
  FaChartLine, FaShareAlt, FaEdit, FaCamera, FaTimes, FaHome,
  FaInfoCircle, FaTag, FaWifi, FaParking, FaSnowflake, FaTv, 
  FaCoffee, FaTrash, FaCreditCard, FaPaypal, FaDollarSign,
  FaChevronDown, FaShieldAlt, FaUsers, FaBed, FaShower,
  FaSwimmer, FaMapPin, FaMap, FaUtensils, FaTshirt, FaBuilding, 
  FaImages, FaCloudUploadAlt, FaImage, FaRegClock, 
  FaUniversity, FaQuestionCircle, FaSave, FaCheckCircle, FaArrowRight, FaStar
} from 'react-icons/fa';
import { RiCameraLensFill } from 'react-icons/ri';
import { useAuth } from '../context/authContext';
import { getProfile, updateProfile, uploadProfileImage, uploadCoverImage, changePassword } from '../api/auth';
import axios from 'axios';

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
  const [cameraType, setCameraType] = useState('profile');
  const [showOptionModal, setShowOptionModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [userHotels, setUserHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState(null);
  const [hotelToDelete, setHotelToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    address: '',
    price: '',
    amenities: {}
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  const [accommodation, setAccommodation] = useState({
    title: '',
    description: '',
    propertyType: 'apartment',
    maxGuests: 1,
    bedrooms: 1,
    bathrooms: 1,
    amenities: {
      wifi: false,
      parking: false,
      ac: false,
      tv: false,
      coffeeMaker: false,
      pool: false,
      kitchen: false,
      washer: false,
      balcony: false
    },
    address: '',
    latitude: '',
    longitude: '',
    coordinates: { lat: 0, lng: 0 },
    photos: [],
    cancellationPolicy: 'moderate',
    houseRules: '',
    paymentMethod: 'card',
    price: '',
    currency: 'RON',
    phoneNumber: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    weeklyDiscount: false,
    monthlyDiscount: false,
    roomTypes: [
      { type: 'single', count: 2, price: 0, capacity: 1 },
      { type: 'double', count: 3, price: 0, capacity: 2 },
      { type: 'triple', count: 2, price: 0, capacity: 3 },
      { type: 'quad', count: 1, price: 0, capacity: 4 }
    ]
  });
  

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvc: ''
  });
  

  const formatCardNumber = (value) => {
    if (!value) return '';

    const digitsOnly = value.replace(/\D/g, '');

    const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');

    return formatted.slice(0, 19);
  };
  

  const formatExpiryDate = (value) => {
    if (!value) return '';

    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length >= 2) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`;
    }
    return digitsOnly;
  };
  

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      setCardDetails(prev => ({ 
        ...prev, 
        [name]: formatCardNumber(value)
      }));
    } else if (name === 'expiryDate') {
      setCardDetails(prev => ({ 
        ...prev, 
        [name]: formatExpiryDate(value)
      }));
    } else if (name === 'cvc') {

      const cvcValue = value.replace(/\D/g, '').slice(0, 4);
      setCardDetails(prev => ({ 
        ...prev, 
        [name]: cvcValue
      }));
    } else {
      setCardDetails(prev => ({ 
        ...prev, 
        [name]: value
      }));
    }
  };

  const profileImageInputRef = useRef(null);
  const coverImageInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {

    const fetchProfile = async () => {
      try {
        if (user) {
          const data = await getProfile();
          setProfile(data);
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);


  useEffect(() => {
    const fetchUserHotels = async () => {
      if (activeTab === 'myaccommodations' && user) {
        try {
          setHotelsLoading(true);
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          

          try {
            const response = await axios.get(
              `${API_BASE_URL}/api/hotels/user/my-hotels`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
              }
            );
            
            if (response.data && response.data.success) {
              setUserHotels(response.data.data);
            }
          } catch (apiError) {
            console.error('Error fetching user hotels:', apiError);
            

            if (apiError.response && apiError.response.status === 404) {
              console.log('Using mock data from localStorage since API endpoint is not available');
              

              const savedAccommodations = JSON.parse(localStorage.getItem('userAccommodations') || '[]');
              

              if (savedAccommodations.length > 0) {
                setUserHotels(savedAccommodations);
              } else {

                const mockAccommodations = [
                  {
                    id: 'mock-1',
                    title: 'Exemple Apartament București',
                    propertyType: 'apartment',
                    address: 'Bulevardul Unirii, București',
                    price: 200,
                    currency: 'RON',
                    status: 'approved',
                    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    photos: [
                      'https://placehold.co/800x600/172a45/ffffff?text=Apartment+Image+1',
                      'https://placehold.co/800x600/172a45/ffffff?text=Apartment+Image+2'
                    ]
                  }
                ];
                

                localStorage.setItem('userAccommodations', JSON.stringify(mockAccommodations));
                setUserHotels(mockAccommodations);
              }
            } else {

              setUserHotels([]);
            }
          }
        } catch (error) {
          console.error('Error in hotel fetching process:', error);
        } finally {
          setHotelsLoading(false);
        }
      }
    };
    
    fetchUserHotels();
  }, [activeTab, user]);

  useEffect(() => {
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

  const handleProfileImageClick = () => {
    setShowOptionModal('profile');
  };

  const handleCoverImageClick = () => {
    setShowOptionModal('cover');
  };

  const handleOptionSelection = (option) => {
    if (option === 'camera') {
      setCameraType(showOptionModal);
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

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        try {
          if (cameraType === 'profile') {
            await handleProfileImageUpload(blob);
          } else if (cameraType === 'cover') {
            await handleCoverImageUpload(blob);
          }
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

  const closeCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleProfileImageChange = async (e) => {

    const file = e.target.files[0];
    if (!file) return;
    const fileType = file.type.split('/')[0];
    if (fileType !== 'image') {
      showNotification('Please select an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image size should not exceed 5MB', 'error');
      return;
    }
    await handleProfileImageUpload(file);
    e.target.value = '';
  };

  const handleProfileImageUpload = async (file) => {

    try {
      setUploadingProfile(true);
      const result = await uploadProfileImage(file);
      setProfile(prev => ({ 
        ...prev, 
        profileImage: result.profileImage 
      }));
      showNotification('Profile image updated successfully!', 'success');
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

  const handleCoverImageChange = async (e) => {

    const file = e.target.files[0];
    if (!file) return;
    const fileType = file.type.split('/')[0];
    if (fileType !== 'image') {
      showNotification('Please select an image file', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Image size should not exceed 10MB', 'error');
      return;
    }
    await handleCoverImageUpload(file);
    e.target.value = '';
  };

  const handleCoverImageUpload = async (file) => {

    try {
      setUploadingCover(true);
      const result = await uploadCoverImage(file);
      setProfile(prev => ({ 
        ...prev, 
        coverImage: result.coverImage 
      }));
      showNotification('Cover image updated successfully!', 'success');
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

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getImageUrl = (imagePath) => {

    if (!imagePath) return 'https://placehold.co/400x300/172a45/ffffff?text=No+Image';
    

    if (imagePath.startsWith('blob:')) {
      try {

        fetch(imagePath).catch(() => {
          console.warn('Invalid blob URL:', imagePath);
          return 'https://placehold.co/400x300/172a45/ffffff?text=Image+Not+Available';
        });
        return imagePath;
      } catch (error) {
        console.warn('Error with blob URL:', error);
        return 'https://placehold.co/400x300/172a45/ffffff?text=Image+Not+Available';
      }
    }
    

    if (imagePath.includes('/Users/condu/Desktop')) {
      const filename = imagePath.split('/').pop();
      let type = 'profile';
      if (imagePath.includes('/cover/')) {
        type = 'cover';
      }
      return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/${type}/${filename.split('?')[0]}`;
    }
    

    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    

    if (imagePath.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${imagePath}`;
    }
    

    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${normalizedPath}`;
  };


  const handleAccommodationChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setAccommodation(prev => ({
          ...prev,
          [parent]: { ...prev[parent], [child]: checked }
        }));
      } else {
        setAccommodation(prev => ({
          ...prev,
          amenities: { ...prev.amenities, [name]: checked },
        }));
      }
    } else if (name === 'latitude' || name === 'longitude') {
      const updatedValue = value === '' ? '' : parseFloat(value);
      const coordKey = name === 'latitude' ? 'lat' : 'lng';
      
      setAccommodation(prev => ({
        ...prev,
        [name]: value, // Keep as string in the input
        coordinates: {
          ...prev.coordinates,
          [coordKey]: updatedValue || 0 // Use 0 if empty or invalid
        }
      }));
    } else if (name.startsWith('roomTypes.')) {
      // Handle room type changes
      const [_, index, field] = name.split('.');
      const idx = parseInt(index);
      
      setAccommodation(prev => {
        const updatedRoomTypes = [...prev.roomTypes];
        
        // Handle numeric fields
        if (field === 'count' || field === 'capacity') {
          updatedRoomTypes[idx] = {
            ...updatedRoomTypes[idx],
            [field]: value === '' ? 0 : parseInt(value)
          };
        } else if (field === 'price') {
          updatedRoomTypes[idx] = {
            ...updatedRoomTypes[idx],
            [field]: value === '' ? 0 : parseFloat(value)
          };
        } else {
          updatedRoomTypes[idx] = {
            ...updatedRoomTypes[idx],
            [field]: value
          };
        }
        
        // If base price changes, update all room type prices proportionally
        if (field === 'price' && idx === 1) { // Double room is our reference
          const basePrice = parseFloat(value) || 0;
          updatedRoomTypes[0].price = Math.round(basePrice * 0.7); // Single
          updatedRoomTypes[2].price = Math.round(basePrice * 1.3); // Triple
          updatedRoomTypes[3].price = Math.round(basePrice * 1.6); // Quad
        }
        
        return {
          ...prev,
          roomTypes: updatedRoomTypes
        };
      });
    } else {
      setAccommodation(prev => ({ ...prev, [name]: value }));
      
      // If base price changes, update room type prices
      if (name === 'price') {
        const basePrice = parseFloat(value) || 0;
        setAccommodation(prev => ({
          ...prev,
          roomTypes: prev.roomTypes.map(room => ({
            ...room,
            price: room.type === 'single' ? Math.round(basePrice * 0.7) :
                   room.type === 'double' ? basePrice :
                   room.type === 'triple' ? Math.round(basePrice * 1.3) :
                   Math.round(basePrice * 1.6)
          }))
        }));
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + accommodation.photos.length > 10) {
      showNotification('Maximum 10 photos allowed', 'error');
      return;
    }
    
    const newPhotos = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));
    
    setAccommodation(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
    }));
    
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setAccommodation(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const uploadPhotos = async (photos) => {
    try {
      const uploadedUrls = [];
      
      // Verificăm dacă există fotografii de încărcat
      if (!photos || photos.length === 0) {
        console.log('Nu există fotografii de încărcat');
        return [];
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('authToken');

      // Încercăm să încărcăm toate fișierele într-o singură cerere
      const filesToUpload = photos.filter(photo => photo.file).map(photo => photo.file);
      
      if (filesToUpload.length > 0) {
        try {
          // Pregătim FormData pentru cererea de upload
          const formData = new FormData();
          
          // Adăugăm fiecare fișier cu numele hotelImages (trebuie să corespundă cu configurația middleware-ului)
          filesToUpload.forEach(file => {
            formData.append('hotelImages', file);
          });
          
          // Facem cererea de upload către noua rută API
          const response = await axios.post(
            `${API_BASE_URL}/api/hotels/upload-images`, 
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (response.data && response.data.success && response.data.imageUrls) {
            console.log('Imagini încărcate cu succes:', response.data.imageUrls);
            // Adăugăm URL-urile primite de la server
            uploadedUrls.push(...response.data.imageUrls);
          } else {
            throw new Error('Răspuns invalid de la server la încărcarea imaginilor');
          }
        } catch (uploadError) {
          console.error('Eroare la încărcarea imaginilor:', uploadError);
          
          // În caz de eroare, adăugăm imagini placeholder pentru fișierele care nu s-au putut încărca
          for (let i = 0; i < filesToUpload.length; i++) {
            uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Upload+Failed+${i+1}`);
          }
        }
      }
      
      // Adăugăm orice URL-uri existente care nu sunt fișiere
      photos.forEach((photo, index) => {
        if (!photo.file && photo.url) {
          // Păstrăm doar URL-urile valide, nu cele care încep cu blob:
          if (!photo.url.startsWith('blob:')) {
            uploadedUrls.push(photo.url);
          } else {
            // Pentru URL-uri blob, folosim placeholder
            uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Accommodation+Image+${index+1}`);
          }
        }
      });
      
      console.log('URL-uri finale pentru imagini:', uploadedUrls);
      return uploadedUrls;
    } catch (error) {
      console.error('Eroare generală la încărcarea fotografiilor:', error);
      
      // Fallback în caz de eroare
      return photos.map((_, index) => 
        `https://placehold.co/800x600/172a45/ffffff?text=Fallback+Image+${index+1}`
      );
    }
  };

  const processPayment = async (method) => {
    try {


      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/hotels/payment`,
          { paymentMethod: method },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            } 
          }
        );
        
        return response.data.paymentToken || 'payment-success';
      } catch (apiError) {
        console.error('Payment API error:', apiError);
        


        console.log('Using mock payment token since API failed');
        return `mock-payment-${Date.now()}`;
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error('Failed to process payment');
    }
  };

  const handleAccommodationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // Process uploaded photos
      const formData = new FormData();
      const photoUrls = [];
      
      for (const photoObj of accommodation.photos) {
        if (photoObj.file) {
          formData.append('photos', photoObj.file);
        }
      }
      
      if (accommodation.photos.length > 0) {
        const uploadResponse = await axios.post(
          `${API_BASE_URL}/api/upload/photos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }
        );
        
        if (uploadResponse.data && uploadResponse.data.success) {
          photoUrls.push(...uploadResponse.data.urls);
        }
      }
      
      // Prepare payment data
      const paymentData = {
        isPaid: true,
        paymentDate: new Date().toISOString(),
        paymentMethod: accommodation.paymentMethod || 'card',
        amount: 10,
        currency: 'EUR',
        cardDetails: {
          cardNumber: cardDetails.cardNumber ? cardDetails.cardNumber.replace(/\s/g, '') : '****',
          expiryDate: cardDetails.expiryDate || '**/**',
          cardholderName: profile?.firstName && profile?.lastName 
            ? `${profile.firstName} ${profile.lastName}`
            : 'Card Owner'
        }
      };
      
      // Clean up and prepare room configuration to ensure number values
      const roomsConfig = accommodation.roomTypes.map(room => ({
        type: String(room.type || 'double'),
        capacity: Number(parseInt(room.capacity) || 1),
        price: Number(parseFloat(room.price) || 0),
        count: Number(parseInt(room.count) || 0)
      }));
      
      // Ensure coordinates are properly formatted
      const coords = accommodation.coordinates || { lat: 0, lng: 0 };
      if (typeof coords.lat !== 'number') coords.lat = parseFloat(coords.lat) || 0;
      if (typeof coords.lng !== 'number') coords.lng = parseFloat(coords.lng) || 0;
      
      const accommodationData = {
        title: accommodation.title,
        description: accommodation.description,
        propertyType: accommodation.propertyType || 'apartment',
        maxGuests: parseInt(accommodation.maxGuests) || 2,
        bedrooms: parseInt(accommodation.bedrooms) || 1,
        bathrooms: parseInt(accommodation.bathrooms) || 1,
        amenities: accommodation.amenities || {},
        address: accommodation.address,
        price: parseFloat(accommodation.price) || 0,
        currency: accommodation.currency || 'RON',
        phoneNumber: accommodation.phoneNumber || '',
        houseRules: accommodation.houseRules || '',
        cancellationPolicy: accommodation.cancellationPolicy || 'moderate',
        checkInTime: accommodation.checkInTime || '14:00',
        checkOutTime: accommodation.checkOutTime || '11:00',
        coordinates: coords,
        photos: photoUrls,
        payment: paymentData,
        weeklyDiscount: accommodation.weeklyDiscount || false,
        monthlyDiscount: accommodation.monthlyDiscount || false,
        roomsConfig: roomsConfig
      };
      
      console.log('Sending accommodation data:', accommodationData);
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/hotels/user-hotel`,
          accommodationData,
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
            } 
          }
        );
        
        if (response.data && response.data.success) {
          showNotification('Cazarea a fost adăugată cu succes și este activă!', 'success');
          
          // Refresh hotel list
          try {
            const hotelsResponse = await axios.get(
              `${API_BASE_URL}/api/hotels/user/my-hotels`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
              }
            );
            
            if (hotelsResponse.data && hotelsResponse.data.success) {
              setUserHotels(hotelsResponse.data.data);
            }
          } catch (refreshError) {
            console.error('Error refreshing hotel list:', refreshError);
          }
          
          // Reset form
          setAccommodation({
            title: '',
            description: '',
            propertyType: 'apartment',
            maxGuests: 1,
            bedrooms: 1,
            bathrooms: 1,
            amenities: {
              wifi: false,
              parking: false,
              ac: false,
              tv: false,
              coffeeMaker: false,
              pool: false,
              kitchen: false,
              washer: false,
              balcony: false
            },
            address: '',
            latitude: '',
            longitude: '',
            coordinates: { lat: 0, lng: 0 },
            photos: [],
            cancellationPolicy: 'moderate',
            houseRules: '',
            paymentMethod: 'card',
            price: '',
            currency: 'RON',
            phoneNumber: '',
            checkInTime: '14:00',
            checkOutTime: '11:00',
            weeklyDiscount: false,
            monthlyDiscount: false,
            roomTypes: [
              { type: 'single', count: 2, price: 0, capacity: 1 },
              { type: 'double', count: 3, price: 0, capacity: 2 },
              { type: 'triple', count: 2, price: 0, capacity: 3 },
              { type: 'quad', count: 1, price: 0, capacity: 4 }
            ]
          });
          
          setCardDetails({
            cardNumber: '',
            expiryDate: '',
            cvc: ''
          });
          
          // Switch to "My Accommodations" tab
          setActiveTab('myaccommodations');
        } else {
          console.error('Error in server response:', response.data);
          showNotification('Eroare la adăugarea cazării. Vă rugăm să încercați din nou.', 'error');
        }
      } catch (submitError) {
        console.error('Error submitting accommodation:', submitError);
        
        if (submitError.response) {
          console.error('Server response:', submitError.response.status, submitError.response.data);
          showNotification(`Eroare la trimiterea datelor (${submitError.response.status}): ${submitError.response.data?.message || 'Vă rugăm să încercați din nou.'}`, 'error');
        } else {
          showNotification('Eroare de rețea. Verificați conexiunea și încercați din nou.', 'error');
        }
      }
    } catch (error) {
      console.error('Error preparing accommodation data:', error);
      showNotification('A apărut o eroare la pregătirea datelor. Vă rugăm să încercați din nou.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      console.log("getAddressFromCoordinates called with:", { lat, lng });
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.log("Invalid coordinates, aborting");
        return;
      }
      

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.display_name) {
        console.log('Reverse geocoding result:', data);
        

        const address = data.display_name;
        
        setAccommodation(prev => ({
          ...prev,
          address: address
        }));
      } else {
        console.log("No address found for coordinates");
        showNotification('Nu s-a putut găsi o adresă pentru aceste coordonate', 'error');
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      showNotification('Eroare la obținerea adresei', 'error');
    }
  };


  useEffect(() => {

    if (accommodation.latitude && accommodation.longitude) {
      const lat = parseFloat(accommodation.latitude);
      const lng = parseFloat(accommodation.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {

        getAddressFromCoordinates(lat, lng);
      }
    }
  }, [accommodation.latitude, accommodation.longitude]);


  const handleImageError = (e) => {
    console.warn('Image failed to load:', e.target.src);
    e.target.onerror = null; // Prevent infinite error loop
    e.target.src = 'https://placehold.co/400x300/172a45/ffffff?text=Image+Not+Available';
  };


  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    

    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Toate câmpurile sunt obligatorii.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Noua parolă și confirmarea acesteia nu se potrivesc.');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Parola trebuie să aibă cel puțin 8 caractere.');
      return;
    }
    

    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasNumber || !hasSpecial) {
      setPasswordError('Parola trebuie să conțină cel puțin un număr și un caracter special.');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setPasswordSuccess(true);
      setPasswordError(null);
      showNotification('Parola a fost schimbată cu succes!', 'success');
    } catch (error) {
      setPasswordError(error.message || 'A apărut o eroare la schimbarea parolei. Verificați parola curentă.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Add this function to handle editing a hotel
  const handleEditHotel = (hotel) => {
    setEditingHotelId(hotel.id || hotel._id);
    setEditFormData({
      title: hotel.title || hotel.name,
      description: hotel.description,
      address: hotel.address || hotel.location,
      price: hotel.price,
      amenities: hotel.amenities
    });
  };

  // Add this function to cancel editing
  const handleCancelEdit = () => {
    setEditingHotelId(null);
    setEditFormData({
      title: '',
      description: '',
      address: '',
      price: '',
      amenities: {}
    });
  };

  // Add this function to handle input changes in edit form
  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setEditFormData(prev => ({
        ...prev,
        amenities: {
          ...prev.amenities,
          [name.replace('amenities.', '')]: checked
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add this function to save hotel changes
  const handleSaveHotel = async (hotelId) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const updatedHotelData = {
        name: editFormData.title,
        description: editFormData.description,
        location: editFormData.address,
        price: parseFloat(editFormData.price),
        amenities: Object.entries(editFormData.amenities)
          .filter(([_, value]) => value === true)
          .map(([key]) => key)
      };
      
      const response = await axios.put(
        `${API_BASE_URL}/api/hotels/${hotelId}`,
        updatedHotelData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        showNotification('Cazarea a fost actualizată cu succes!', 'success');
        
        // Update the hotel in the list
        setUserHotels(prevHotels => 
          prevHotels.map(hotel => 
            (hotel.id === hotelId || hotel._id === hotelId) 
              ? {
                  ...hotel,
                  title: editFormData.title,
                  name: editFormData.title,
                  description: editFormData.description,
                  address: editFormData.address,
                  location: editFormData.address,
                  price: editFormData.price,
                  amenities: editFormData.amenities
                }
              : hotel
          )
        );
        
        setEditingHotelId(null);
      }
    } catch (error) {
      console.error('Error updating hotel:', error);
      
      // Fallback to localStorage if API call fails
      try {
        const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
        const updatedMockHotels = mockHotels.map(hotel => {
          if (hotel.id === hotelId || hotel._id === hotelId) {
            return {
              ...hotel,
              title: editFormData.title,
              description: editFormData.description,
              address: editFormData.address,
              price: editFormData.price,
              amenities: editFormData.amenities,
              updatedAt: new Date().toISOString()
            };
          }
          return hotel;
        });
        
        localStorage.setItem('mockHotels', JSON.stringify(updatedMockHotels));
        
        // Update the hotel in the list
        setUserHotels(prevHotels => 
          prevHotels.map(hotel => 
            (hotel.id === hotelId || hotel._id === hotelId) 
              ? {
                  ...hotel,
                  title: editFormData.title,
                  name: editFormData.title,
                  description: editFormData.description,
                  address: editFormData.address,
                  location: editFormData.address,
                  price: editFormData.price,
                  amenities: editFormData.amenities
                }
              : hotel
          )
        );
        
        showNotification('Cazarea a fost actualizată cu succes! (mock)', 'success');
        setEditingHotelId(null);
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
        showNotification('A apărut o eroare la actualizarea cazării', 'error');
      }
    }
  };

  // Add this function to show delete confirmation
  const handleDeleteClick = (hotel) => {
    setHotelToDelete(hotel);
    setShowDeleteModal(true);
  };

  // Add this function to delete a hotel
  const handleDeleteHotel = async () => {
    if (!hotelToDelete) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await axios.delete(
        `${API_BASE_URL}/api/hotels/${hotelToDelete.id || hotelToDelete._id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        showNotification('Cazarea a fost ștearsă cu succes!', 'success');
        
        // Remove the hotel from the list
        setUserHotels(prevHotels => 
          prevHotels.filter(hotel => 
            hotel.id !== (hotelToDelete.id || hotelToDelete._id) && 
            hotel._id !== (hotelToDelete.id || hotelToDelete._id)
          )
        );
      }
    } catch (error) {
      console.error('Error deleting hotel:', error);
      
      // Fallback to localStorage if API call fails
      try {
        const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
        const filteredMockHotels = mockHotels.filter(hotel => 
          hotel.id !== (hotelToDelete.id || hotelToDelete._id) && 
          hotel._id !== (hotelToDelete.id || hotelToDelete._id)
        );
        
        localStorage.setItem('mockHotels', JSON.stringify(filteredMockHotels));
        
        // Remove the hotel from the list
        setUserHotels(prevHotels => 
          prevHotels.filter(hotel => 
            hotel.id !== (hotelToDelete.id || hotelToDelete._id) && 
            hotel._id !== (hotelToDelete.id || hotelToDelete._id)
          )
        );
        
        showNotification('Cazarea a fost ștearsă cu succes! (mock)', 'success');
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
        showNotification('A apărut o eroare la ștergerea cazării', 'error');
      }
    }
    
    // Close the modal
    setShowDeleteModal(false);
    setHotelToDelete(null);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex justify-center items-center">
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-700/30 text-center">
        <FaUser className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <p className="text-xl font-semibold text-white">Profile not found</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
        >
          Go Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-6 px-3 sm:px-6 lg:px-8 text-white">
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
      <input 
        type="file" 
        ref={photoInputRef} 
        onChange={handlePhotoUpload} 
        style={{ display: 'none' }} 
        accept="image/*"
        multiple
      />

      {/* Back Button */}
      <div className="max-w-6xl mx-auto mb-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-gray-300 hover:text-blue-400 transition-colors group"
        >
          <div className="p-2 bg-gray-800 rounded-full mr-2 group-hover:bg-blue-500/20 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
        </button>
      </div>

      {showOptionModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 w-80 shadow-xl border border-gray-700/30">
            <h3 className="text-xl font-bold mb-4 text-center text-white">
              {showOptionModal === 'profile' ? 'Update Profile Photo' : 'Update Cover Photo'}
            </h3>
            <div className="flex flex-col space-y-3">
              <button
                className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors w-full shadow-lg"
                onClick={() => handleOptionSelection('camera')}
              >
                <RiCameraLensFill className="mr-2" size={20} />
                Take a Photo
              </button>
              <button
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors w-full shadow-lg"
                onClick={() => handleOptionSelection('file')}
              >
                <FaCamera className="mr-2" size={18} />
                Upload from Device
              </button>
              <button
                className="flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors w-full mt-4"
                onClick={() => setShowOptionModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full transition-colors"
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

      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0 ${
            notification.type === 'success' ? 'bg-blue-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-gray-700'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden mb-6 border border-gray-700/30 transform transition-all duration-300 hover:shadow-blue-500/20">
          <div className="relative h-48 sm:h-60 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900">
            {profile?.coverImage ? (
              <img
                src={getImageUrl(profile.coverImage)}
                alt="Cover"
                className="w-full h-full object-cover opacity-80"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FaImage className="text-gray-700 opacity-20 w-20 h-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            <button 
              className="absolute top-4 right-4 p-2 bg-gray-800/50 rounded-full hover:bg-gray-700/70 transition-colors"
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
                <div className="h-24 w-24 rounded-full border-4 border-gray-900 bg-gray-800 overflow-hidden shadow-2xl">
                  {profile?.profileImage ? (
                    <img
                      src={getImageUrl(profile.profileImage)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onLoad={() => console.log('Profile image loaded successfully')}
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <FaUser className="text-gray-600 w-16 h-16" />
                    </div>
                  )}
                </div>
                <button 
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg opacity-100 group-hover:opacity-100 transition-opacity"
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
                  <div className="flex items-center text-gray-300 mt-1">
                    <FaEnvelope className="h-4 w-4 mr-2" />
                    <p className="text-sm sm:text-base truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium flex items-center transition-colors text-sm shadow-lg"
                  >
                    <FaEdit className="mr-1 sm:mr-2" /> {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <button 
                    onClick={() => showNotification('Profile shared!', 'success')}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium flex items-center transition-colors text-sm shadow-lg"
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
                <div className="flex items-center text-gray-300">
                  <FaPhone className="h-4 w-4 mr-2 text-blue-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center text-gray-300">
                  <FaMapMarkerAlt className="h-4 w-4 mr-2 text-blue-400" />
                  <span>{profile.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl mb-6 border border-gray-700/30 overflow-x-auto">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-1" aria-label="Tabs">
              {[
                { id: 'personal', icon: <FaUser />, label: 'Personal Info' },
                { id: 'accommodation', icon: <FaHome />, label: 'Add Accommodation' },
                { id: 'myaccommodations', icon: <FaBuilding />, label: 'My Accommodations' },
                { id: 'password', icon: <FaShieldAlt />, label: 'Change Password' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-3 sm:px-4 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-gray-800'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-blue-400' : 'text-gray-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-700/30 transform transition-all duration-300 hover:shadow-blue-500/20">
        {activeTab === 'personal' && (
  <div className="space-y-10">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-white relative">
        <span className="relative">
          Personal Information
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></span>
        </span>
      </h2>
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-300"
        >
          <FaEdit /> <span>Edit Profile</span>
        </button>
      )}
    </div>
    
    {isEditing ? (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-blue-500/30 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <form onSubmit={handleUpdateProfile} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="group">
              <label className="block text-sm font-medium text-gray-200 mb-2">Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={profile?.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
                  placeholder="Your full name"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={profile?.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Phone</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="tel"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
                  placeholder="+1 (123) 456-7890"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaMapMarkerAlt className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={profile?.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
                  placeholder="123 Main St, City, Country"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-3 border border-gray-600 shadow-md text-sm font-medium rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all flex items-center gap-2"
            >
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="px-5 py-3 border border-transparent shadow-md text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all flex items-center gap-2"
            >
              <span>Save Changes</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/90 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <FaUser className="h-5 w-5 text-blue-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Name</p>
              <p className="text-lg font-semibold text-white truncate">{profile?.name || 'Not set'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/90 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <FaEnvelope className="h-5 w-5 text-blue-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Email</p>
              <p className="text-lg font-semibold text-white truncate">{profile?.email || 'Not set'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/90 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <FaPhone className="h-5 w-5 text-blue-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Phone</p>
              <p className="text-lg font-semibold text-white truncate">{profile?.phone || 'Not set'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/90 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <FaMapMarkerAlt className="h-5 w-5 text-blue-100" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Address</p>
              <p className="text-lg font-semibold text-white truncate">{profile?.address || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}
{activeTab === 'accommodation' && (
  <div className="space-y-10 max-w-4xl mx-auto">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Add New Accommodation
      </h2>
      <div className="text-sm text-gray-400 flex items-center bg-gray-800/40 py-2 px-4 rounded-full">
        <FaInfoCircle className="mr-2 text-blue-400" />
        Fill in the details to list your property
      </div>
    </div>
    
    <form onSubmit={handleAccommodationSubmit} className="space-y-8">
      {/* Basic Information Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-blue-500/30 shadow-xl backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
            <FaHome className="text-blue-400" />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Basic Information
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-blue-400 transition-colors">
              Title
            </label>
            <div className="relative">
              <input
                type="text"
                name="title"
                value={accommodation.title}
                onChange={handleAccommodationChange}
                className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-blue-500 focus:ring focus:ring-blue-500/30 transition-all text-white px-4 py-3"
                placeholder="e.g., Modern apartment in city center"
                required
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
                <FaTag className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-blue-400 transition-colors">
              Property Type
            </label>
            <div className="relative">
              <select
                name="propertyType"
                value={accommodation.propertyType}
                onChange={handleAccommodationChange}
                className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-blue-500 focus:ring focus:ring-blue-500/30 transition-all text-white px-4 py-3 appearance-none"
              >
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="cabin">Cabin</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <FaChevronDown className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-blue-400 transition-colors">
            Description
          </label>
          <textarea
            name="description"
            value={accommodation.description}
            onChange={handleAccommodationChange}
            className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-blue-500 focus:ring focus:ring-blue-500/30 transition-all text-white px-4 py-3"
            rows="4"
            placeholder="Describe your property in detail..."
            required
          />
        </div>
        <div className="mt-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-blue-400 transition-colors">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaPhone className="text-gray-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <input
              type="tel"
              name="phoneNumber"
              value={accommodation.phoneNumber || ''}
              onChange={handleAccommodationChange}
              className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-blue-500 focus:ring focus:ring-blue-500/30 transition-all text-white px-4 py-3"
              placeholder="+40 712 345 678"
              required
            />
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-purple-500/30 shadow-xl backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
            <FaDollarSign className="text-purple-400" />
          </div>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Pricing
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-purple-400 transition-colors">
              Base Price (per night)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaDollarSign className="text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <input
                type="number"
                name="price"
                value={accommodation.price || ''}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-purple-500 focus:ring focus:ring-purple-500/30 transition-all text-white px-4 py-3"
                placeholder="100"
                min="1"
                required
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-purple-400 transition-colors">
              Currency
            </label>
            <div className="relative">
              <select
                name="currency"
                value={accommodation.currency || 'RON'}
                onChange={handleAccommodationChange}
                className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-purple-500 focus:ring focus:ring-purple-500/30 transition-all text-white px-4 py-3 appearance-none"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <FaChevronDown className="text-gray-400 group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-3 group-hover:text-purple-400 transition-colors">
            Special Offers
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer">
              <input
                type="checkbox"
                name="weeklyDiscount"
                checked={accommodation.weeklyDiscount || false}
                onChange={handleAccommodationChange}
                className="h-5 w-5 text-purple-500 focus:ring-purple-500 border-gray-600 bg-gray-700/50 rounded-md"
              />
              <div className="ml-3">
                <span className="text-gray-200 font-medium">Weekly Discount</span>
                <p className="text-xs text-gray-400 mt-1">Save 10% on weekly bookings</p>
              </div>
            </div>
            <div className="flex items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer">
              <input
                type="checkbox"
                name="monthlyDiscount"
                checked={accommodation.monthlyDiscount || false}
                onChange={handleAccommodationChange}
                className="h-5 w-5 text-purple-500 focus:ring-purple-500 border-gray-600 bg-gray-700/50 rounded-md"
              />
              <div className="ml-3">
                <span className="text-gray-200 font-medium">Monthly Discount</span>
                <p className="text-xs text-gray-400 mt-1">Save 20% on monthly bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Details Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-teal-500/30 shadow-xl backdrop-blur-sm hover:border-teal-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-teal-500/20 rounded-lg mr-3">
            <FaHome className="text-teal-400" />
          </div>
          <span className="bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent">
            Property Details
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-teal-400 transition-colors">
              Max Guests
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUsers className="text-gray-500 group-hover:text-teal-400 transition-colors" />
              </div>
              <input
                type="number"
                name="maxGuests"
                value={accommodation.maxGuests}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-teal-500 focus:ring focus:ring-teal-500/30 transition-all text-white px-4 py-3"
                min="1"
                required
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-teal-400 transition-colors">
              Bedrooms
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaBed className="text-gray-500 group-hover:text-teal-400 transition-colors" />
              </div>
              <input
                type="number"
                name="bedrooms"
                value={accommodation.bedrooms}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-teal-500 focus:ring focus:ring-teal-500/30 transition-all text-white px-4 py-3"
                min="1"
                required
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-teal-400 transition-colors">
              Bathrooms
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaShower className="text-gray-500 group-hover:text-teal-400 transition-colors" />
              </div>
              <input
                type="number"
                name="bathrooms"
                value={accommodation.bathrooms}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-teal-500 focus:ring focus:ring-teal-500/30 transition-all text-white px-4 py-3"
                min="1"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-green-500/30 shadow-xl backdrop-blur-sm hover:border-green-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-green-500/20 rounded-lg mr-3">
            <FaMapMarkerAlt className="text-green-400" />
          </div>
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Location
          </span>
        </h3>
        <div className="mb-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-green-400 transition-colors">
            Full Address
          </label>
          <textarea
            name="address"
            value={accommodation.address || ''}
            onChange={handleAccommodationChange}
            className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-green-500 focus:ring focus:ring-green-500/30 transition-all text-white px-4 py-3"
            rows="2"
            placeholder="Address will be populated from coordinates"
            readOnly
          />
          <p className="mt-2 text-xs text-gray-500">
            <FaInfoCircle className="inline-block mr-1" />
            Address is automatically populated based on the latitude and longitude provided above.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-green-400 transition-colors">
              Latitude
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaMapPin className="text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>
              <input
                type="number"
                name="latitude"
                value={accommodation.latitude || ''}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-green-500 focus:ring focus:ring-green-500/30 transition-all text-white px-4 py-3"
                placeholder="45.7494"
                step="any"
                required
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-green-400 transition-colors">
              Longitude
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaMapPin className="text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>
              <input
                type="number"
                name="longitude"
                value={accommodation.longitude || ''}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-green-500 focus:ring focus:ring-green-500/30 transition-all text-white px-4 py-3"
                placeholder="21.1291"
                step="any"
                required
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-2 mb-4">
          <button
            type="button"
            onClick={() => {
              try {
                console.log("Update Map button clicked");
                const lat = parseFloat(accommodation.latitude);
                const lng = parseFloat(accommodation.longitude);
                if (isNaN(lat) || isNaN(lng)) {
                  console.log("Invalid coordinates detected");
                  showNotification('Te rog să introduci coordonate valide (doar numere)', 'error');
                  return;
                }
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                  console.log("Coordinates out of valid range");
                  showNotification('Coordonate în afara intervalului valid (lat: -90 to 90, lng: -180 to 180)', 'error');
                  return;
                }
                getAddressFromCoordinates(lat, lng);
                setAccommodation(prev => ({
                  ...prev,
                  coordinates: { lat, lng }
                }));
                console.log("Map updated with coordinates:", { lat, lng });
                showNotification('Locația a fost actualizată cu succes!', 'success');
              } catch (error) {
                console.error("Error updating map:", error);
                showNotification('Eroare la actualizarea hărții', 'error');
              }
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-green-600/20"
          >
            <FaMap className="text-white" /> Actualizează Harta
          </button>
        </div>
        <div className="mt-2 p-4 bg-gray-800/40 rounded-xl border border-gray-700">
          <div className="flex items-center mb-3">
            <FaInfoCircle className="text-green-400 mr-2" />
            <span className="text-sm text-gray-300">
              {accommodation.latitude && accommodation.longitude ? 
                'Locația a fost setată pe hartă. Puteți verifica dacă este corectă.' : 
                'Introduceți coordonatele pentru a vedea locația pe hartă'
              }
            </span>
          </div>
          {accommodation.latitude && accommodation.longitude ? (
            <div className="bg-gray-700/50 rounded-lg h-64 flex items-center justify-center overflow-hidden relative">
              <iframe 
                title="Location Map"
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }} 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(accommodation.longitude) - 0.01},${parseFloat(accommodation.latitude) - 0.01},${parseFloat(accommodation.longitude) + 0.01},${parseFloat(accommodation.latitude) + 0.01}&layer=mapnik&marker=${accommodation.latitude},${accommodation.longitude}`}
              />
              <div className="absolute top-3 right-3 bg-gray-800/80 text-white p-2 rounded-lg text-xs">
                OpenStreetMap
              </div>
              <div className="absolute bottom-3 left-3 bg-gray-800/80 text-white p-2 rounded-lg text-sm">
                <p>Location: {accommodation.address || 'Custom location'}</p>
                <p className="text-xs mt-1">
                  {accommodation.latitude}, {accommodation.longitude}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/50 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <FaMap className="text-gray-500 text-4xl mx-auto mb-3" />
                <p className="text-gray-400">Harta va fi afișată aici după introducerea coordonatelor</p>
                <p className="text-xs text-gray-500 mt-2">Folosim OpenStreetMap pentru localizare</p>
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-gray-400 flex items-start">
            <FaInfoCircle className="text-green-400 mr-2 mt-0.5 shrink-0" />
            <span>
              Pentru a găsi coordonatele precise, puteți folosi Google Maps. 
              Faceți click dreapta pe locația dorită și selectați "Ce se află aici?". 
              Coordonatele vor apărea în partea de jos a ecranului.
            </span>
          </div>
        </div>
      </div>

      {/* Amenities Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-amber-500/30 shadow-xl backdrop-blur-sm hover:border-amber-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-amber-500/20 rounded-lg mr-3">
            <FaWifi className="text-amber-400" />
          </div>
          <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
            Amenities
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { name: 'wifi', label: 'Wi-Fi', icon: <FaWifi /> },
            { name: 'parking', label: 'Parking', icon: <FaParking /> },
            { name: 'ac', label: 'Air Conditioning', icon: <FaSnowflake /> },
            { name: 'tv', label: 'TV', icon: <FaTv /> },
            { name: 'coffeeMaker', label: 'Coffee Maker', icon: <FaCoffee /> },
            { name: 'pool', label: 'Swimming Pool', icon: <FaSwimmer /> },
            { name: 'kitchen', label: 'Kitchen', icon: <FaUtensils /> },
            { name: 'washer', label: 'Washer', icon: <FaTshirt /> },
            { name: 'balcony', label: 'Balcony', icon: <FaBuilding /> }
          ].map((amenity) => (
            <label 
              key={amenity.name} 
              className="flex items-center p-4 space-x-3 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-amber-500/50 hover:bg-gray-800/50 transition-all cursor-pointer group"
            >
              <input
                type="checkbox"
                name={amenity.name}
                checked={accommodation.amenities[amenity.name]}
                onChange={handleAccommodationChange}
                className="h-5 w-5 text-amber-500 focus:ring-amber-500 border-gray-600 bg-gray-700/50 rounded-md"
              />
              <div className="flex items-center">
                <div className="p-2 bg-gray-700/50 rounded-lg mr-2 group-hover:bg-amber-500/20 transition-all">
                  <span className="text-gray-400 group-hover:text-amber-400 transition-colors">
                    {amenity.icon}
                  </span>
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  {amenity.label}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Photos Upload Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-pink-500/30 shadow-xl backdrop-blur-sm hover:border-pink-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-pink-500/20 rounded-lg mr-3">
            <FaImages className="text-pink-400" />
          </div>
          <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Property Photos
          </span>
        </h3>
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <FaInfoCircle className="text-pink-400 mr-2" />
            <span className="text-sm text-gray-300">Upload at least 5 high-quality photos of your property</span>
          </div>
          <div 
            className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-pink-500/50 transition-all"
            onClick={() => photoInputRef.current?.click()}
          >
            <div className="space-y-4">
              <div className="mx-auto bg-pink-500/10 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                <FaCloudUploadAlt className="text-pink-400 text-2xl" />
              </div>
              <div>
                <p className="text-gray-300">Drag photos here or click to upload</p>
                <p className="text-gray-400 text-xs mt-1">Accepted formats: JPG, PNG - Max 10MB each</p>
              </div>
              <button 
                type="button"
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg text-sm font-medium transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  photoInputRef.current?.click();
                }}
              >
                Select Files
              </button>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handlePhotoUpload}
                ref={photoInputRef}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          {accommodation.photos.length > 0 ? (
            accommodation.photos.map((photo, index) => (
              <div key={index} className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
                <img 
                  src={photo.url} 
                  alt={`Property photo ${index + 1}`} 
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-2 right-2">
                  <button 
                    type="button"
                    className="bg-red-500/70 hover:bg-red-500 text-white p-1.5 rounded-full"
                    onClick={() => removePhoto(index)}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <FaImage className="text-gray-500 text-2xl" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules and Policies Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-indigo-500/30 shadow-xl backdrop-blur-sm hover:border-indigo-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-indigo-500/20 rounded-lg mr-3">
            <FaShieldAlt className="text-indigo-400" />
          </div>
          <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
            Rules & Policies
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors">
              Check-in Time
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaRegClock className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <select
                name="checkInTime"
                value={accommodation.checkInTime || '14:00'}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-indigo-500 focus:ring focus:ring-indigo-500/30 transition-all text-white px-4 py-3 appearance-none"
              >
                <option value="12:00">12:00 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <FaChevronDown className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors">
              Check-out Time
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaRegClock className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <select
                name="checkOutTime"
                value={accommodation.checkOutTime || '11:00'}
                onChange={handleAccommodationChange}
                className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-indigo-500 focus:ring focus:ring-indigo-500/30 transition-all text-white px-4 py-3 appearance-none"
              >
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="12:00">12:00 PM</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <FaChevronDown className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors">
            Cancellation Policy
          </label>
          <div className="relative">
            <select
              name="cancellationPolicy"
              value={accommodation.cancellationPolicy || 'moderate'}
              onChange={handleAccommodationChange}
              className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-indigo-500 focus:ring focus:ring-indigo-500/30 transition-all text-white px-4 py-3 appearance-none"
            >
              <option value="flexible">Flexible (Full refund 1 day prior to arrival)</option>
              <option value="moderate">Moderate (Full refund 5 days prior to arrival)</option>
              <option value="strict">Strict (50% refund up to 1 week prior to arrival)</option>
              <option value="nonRefundable">Non-refundable</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <FaChevronDown className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        </div>
        <div className="mt-6 group">
          <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors">
            House Rules
          </label>
          <textarea
            name="houseRules"
            value={accommodation.houseRules || ''}
            onChange={handleAccommodationChange}
            className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-indigo-500 focus:ring focus:ring-indigo-500/30 transition-all text-white px-4 py-3"
            rows="4"
            placeholder="Enter any special rules or requirements for guests..."
          />
        </div>
      </div>

      {/* Room Types Configuration Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-purple-500/30 shadow-xl backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
            <FaBed className="text-purple-400" />
          </div>
          <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Configurare Camere
          </span>
        </h3>
        <p className="text-gray-300 mb-4">
          Specificați câte camere de fiecare tip sunt disponibile pentru rezervare
        </p>
        <div className="space-y-6">
          {accommodation.roomTypes.map((room, index) => (
            <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <h4 className="font-medium mb-3 text-purple-300">
                {room.type.charAt(0).toUpperCase() + room.type.slice(1)} 
                {room.type === 'single' && ' (Pat individual)'}
                {room.type === 'double' && ' (Pat matrimonial)'}
                {room.type === 'triple' && ' (Pat matrimonial + pat individual)'}
                {room.type === 'quad' && ' (2 paturi matrimoniale)'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-purple-400 transition-colors">
                    Număr de camere
                  </label>
                  <input
                    type="number"
                    name={`roomTypes.${index}.count`}
                    value={room.count}
                    onChange={handleAccommodationChange}
                    className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-purple-500 focus:ring focus:ring-purple-500/30 transition-all text-white px-4 py-3"
                    min="0"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-purple-400 transition-colors">
                    Capacitate (persoane)
                  </label>
                  <input
                    type="number"
                    name={`roomTypes.${index}.capacity`}
                    value={room.capacity}
                    onChange={handleAccommodationChange}
                    className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-purple-500 focus:ring focus:ring-purple-500/30 transition-all text-white px-4 py-3"
                    min="1"
                    max="10"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-purple-400 transition-colors">
                    Preț pe noapte
                  </label>
                  <input
                    type="number"
                    name={`roomTypes.${index}.price`}
                    value={room.price}
                    onChange={handleAccommodationChange}
                    className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-purple-500 focus:ring focus:ring-purple-500/30 transition-all text-white px-4 py-3"
                    min="0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit and Payment Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-orange-500/30 shadow-xl backdrop-blur-sm hover:border-orange-400/50 transition-all duration-300">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <div className="p-2 bg-orange-500/20 rounded-lg mr-3">
            <FaCreditCard className="text-orange-400" />
          </div>
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Payment & Publishing
          </span>
        </h3>
        <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-6">
          <div className="flex items-start">
            <div className="p-2 bg-orange-500/20 rounded-lg mr-3">
              <FaInfoCircle className="text-orange-400" />
            </div>
            <div>
              <h4 className="font-medium text-white mb-1">Publication Fee Required</h4>
              <p className="text-gray-300 text-sm">
                Publishing your accommodation requires a one-time fee of <span className="font-semibold text-orange-400">199.99 RON</span> per listing.
                Your property will be visible to all users after payment is processed.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
          <h4 className="text-lg font-medium text-white mb-4">Order Summary</h4>
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-300">Property Listing Fee</span>
            <span className="font-medium text-white">199.99 RON</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-300">Service Fee</span>
            <span className="font-medium text-white">0.00 RON</span>
          </div>
          <div className="flex justify-between py-3 mt-1">
            <span className="text-lg text-white font-medium">Total</span>
            <span className="text-lg font-bold text-orange-400">199.99 RON</span>
          </div>
        </div>
        <div className="mb-6">
          <h4 className="text-md font-medium text-white mb-4">Payment Method</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer group">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-700/50"
              />
              <div className="ml-3 flex items-center">
                <FaCreditCard className="text-gray-400 group-hover:text-orange-400 transition-colors mr-2" />
                <span className="text-gray-300 group-hover:text-white transition-colors">Credit Card</span>
              </div>
            </label>
            <label className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer group">
              <input
                type="radio"
                name="paymentMethod"
                value="paypal"
                checked={paymentMethod === 'paypal'}
                onChange={() => setPaymentMethod('paypal')}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-700/50"
              />
              <div className="ml-3 flex items-center">
                <FaPaypal className="text-gray-400 group-hover:text-orange-400 transition-colors mr-2" />
                <span className="text-gray-300 group-hover:text-white transition-colors">PayPal</span>
              </div>
            </label>
            <label className="flex items-center p-4 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer group">
              <input
                type="radio"
                name="paymentMethod"
                value="bankTransfer"
                checked={paymentMethod === 'bankTransfer'}
                onChange={() => setPaymentMethod('bankTransfer')}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-700/50"
              />
              <div className="ml-3 flex items-center">
                <FaUniversity className="text-gray-400 group-hover:text-orange-400 transition-colors mr-2" />
                <span className="text-gray-300 group-hover:text-white transition-colors">Bank Transfer</span>
              </div>
            </label>
          </div>
        </div>
        {paymentMethod === 'card' && (
          <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
            <h4 className="text-md font-medium text-white mb-4">Card Details</h4>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-orange-400 transition-colors">
                  Card Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaCreditCard className="text-gray-500 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="cardNumber"
                    value={cardDetails.cardNumber}
                    onChange={handleCardChange}
                    placeholder="1234 5678 9012 3456"
                    className="pl-10 block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-orange-500 focus:ring focus:ring-orange-500/30 transition-all text-white px-4 py-3"
                    maxLength={19}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-orange-400 transition-colors">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={cardDetails.expiryDate}
                    onChange={handleCardChange}
                    placeholder="MM/YY"
                    className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-orange-500 focus:ring focus:ring-orange-500/30 transition-all text-white px-4 py-3"
                    maxLength={5}
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-300 mb-2 group-hover:text-orange-400 transition-colors">
                    CVC
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleCardChange}
                      placeholder="123"
                      className="block w-full rounded-xl border-gray-700 bg-gray-800/50 shadow-inner focus:border-orange-500 focus:ring focus:ring-orange-500/30 transition-all text-white px-4 py-3"
                      maxLength={4}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <FaQuestionCircle className="text-gray-500 hover:text-orange-400 transition-colors" title="3-digit security code on the back of your card" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {paymentMethod === 'paypal' && (
          <div className="bg-gray-800/50 p-6 rounded-lg mb-6 text-center">
            <FaPaypal className="text-blue-400 text-4xl mx-auto mb-3" />
            <p className="text-gray-300 mb-4">You will be redirected to PayPal to complete your payment.</p>
          </div>
        )}
        {paymentMethod === 'bankTransfer' && (
          <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
            <h4 className="text-md font-medium text-white mb-4">Bank Transfer Details</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Bank:</span>
                <span className="text-white">Banca Transilvania</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Holder:</span>
                <span className="text-white">Boksy Travel SRL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">IBAN:</span>
                <span className="text-white">RO29 BTRL 0000 0012 3456 7890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SWIFT:</span>
                <span className="text-white">BTRLRO22</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reference:</span>
                <span className="text-white">ACC-{Math.floor(Math.random() * 10000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-semibold">199.99 RON</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
              <p className="text-gray-300 text-xs">
                <FaInfoCircle className="inline-block mr-1 text-orange-400" />
                Your accommodation will be published after we confirm your payment. This may take 1-2 business days.
              </p>
            </div>
          </div>
        )}
        <div className="mt-8 flex items-center justify-between">
          <label className="flex items-center cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
              className="h-5 w-5 text-orange-500 focus:ring-orange-500 border-gray-600 bg-gray-700/50 rounded-md"
            />
            <span className="ml-2 text-sm text-gray-300 group-hover:text-white transition-colors">
              I agree to the <span className="text-orange-400 hover:underline">Terms & Conditions</span>
            </span>
          </label>
        </div>
      </div>

      <div className="my-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            setAccommodation({
              title: '',
              description: '',
              propertyType: 'apartment',
              maxGuests: 1,
              bedrooms: 1,
              bathrooms: 1,
              amenities: {
                wifi: false,
                parking: false,
                ac: false,
                tv: false,
                coffeeMaker: false,
                pool: false,
                kitchen: false,
                washer: false,
                balcony: false
              },
              address: '',
              latitude: '',
              longitude: '',
              coordinates: { lat: 0, lng: 0 },
              photos: [],
              cancellationPolicy: 'moderate',
              houseRules: '',
              paymentMethod: 'card',
              price: '',
              currency: 'RON',
              phoneNumber: '',
              checkInTime: '14:00',
              checkOutTime: '11:00',
              weeklyDiscount: false,
              monthlyDiscount: false,
              roomTypes: [
                { type: 'single', count: 2, price: 0, capacity: 1 },
                { type: 'double', count: 3, price: 0, capacity: 2 },
                { type: 'triple', count: 2, price: 0, capacity: 3 },
                { type: 'quad', count: 1, price: 0, capacity: 4 }
              ]
            });
          }}
          className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Anulează
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesare...
            </>
          ) : (
            'Trimite'
          )}
        </button>
      </div>
    </form>
  </div>
)}

{activeTab === 'password' && (
  <div className="space-y-10">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-white relative">
        <span className="relative">
          Change Password
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></span>
        </span>
      </h2>
      <div className="text-sm text-gray-300 flex items-center gap-2">
        <div className="p-1 rounded-full bg-blue-500/20">
          <FaShieldAlt className="text-blue-400" />
        </div>
        <span>Keep your account secure with a strong password</span>
      </div>
    </div>
    
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-blue-500/30 shadow-xl relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
      
      {passwordSuccess && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6 text-green-400 flex items-center gap-3">
          <FaCheckCircle className="text-green-400 text-xl flex-shrink-0" />
          <span>Parola a fost actualizată cu succes!</span>
        </div>
      )}
      
      {passwordError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 flex items-center gap-3">
          <FaInfoCircle className="text-red-400 text-xl flex-shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}
      
      <form 
        onSubmit={handlePasswordSubmit} 
        className="space-y-8 relative z-10"
      >
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Current Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaShieldAlt className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
              placeholder="Enter your current password"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">New Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaShieldAlt className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
              placeholder="Enter your new password"
              required
            />
          </div>
          <div className="flex gap-2 mt-3 text-sm text-gray-300">
            <span className="p-1 bg-blue-500/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <p className="text-gray-400">Password must be at least 8 characters and include a number and a special character</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Confirm New Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaShieldAlt className="text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className="pl-12 block w-full rounded-xl border border-gray-600 bg-gray-800/50 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/40 focus:ring-opacity-50 transition-all text-white py-3"
              placeholder="Confirm your new password"
              required
            />
          </div>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full sm:w-auto px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all flex items-center justify-center gap-2"
          >
            {isChangingPassword ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

        {activeTab === 'myaccommodations' && (
  <div className="bg-[#172a45] rounded-lg p-6 mt-6">
    <h3 className="text-xl font-bold mb-4 flex items-center">
      <FaBed className="mr-2" /> Cazările mele
    </h3>
    
    {hotelsLoading ? (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    ) : userHotels.length === 0 ? (
      <div className="text-center py-6 text-gray-400">
        <FaBuilding className="mx-auto text-4xl mb-3 opacity-30" />
        <p>Nu aveți încă nicio cazare adăugată.</p>
        <button
          onClick={() => setActiveTab('addaccommodation')}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
        >
          Adăugați o cazare
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userHotels.map((hotel) => (
          <div 
            key={hotel.id || hotel._id} 
            className="bg-[#1e3a5f] rounded-lg overflow-hidden shadow-lg"
          >
            {editingHotelId === (hotel.id || hotel._id) ? (
              <div className="p-4">
                <h4 className="text-lg font-bold mb-3">Editare cazare</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Titlu</label>
                    <input
                      type="text"
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditFormChange}
                      className="w-full bg-[#0a192f] border border-gray-600 rounded p-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Descriere</label>
                    <textarea
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditFormChange}
                      rows="3"
                      className="w-full bg-[#0a192f] border border-gray-600 rounded p-2 text-white"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Adresă</label>
                    <input
                      type="text"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditFormChange}
                      className="w-full bg-[#0a192f] border border-gray-600 rounded p-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Preț</label>
                    <input
                      type="number"
                      name="price"
                      value={editFormData.price}
                      onChange={handleEditFormChange}
                      className="w-full bg-[#0a192f] border border-gray-600 rounded p-2 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Facilități</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="amenities.wifi"
                          checked={editFormData.amenities?.wifi || false}
                          onChange={handleEditFormChange}
                          className="form-checkbox"
                        />
                        <span>WiFi</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="amenities.parking"
                          checked={editFormData.amenities?.parking || false}
                          onChange={handleEditFormChange}
                          className="form-checkbox"
                        />
                        <span>Parcare</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="amenities.ac"
                          checked={editFormData.amenities?.ac || false}
                          onChange={handleEditFormChange}
                          className="form-checkbox"
                        />
                        <span>Aer condiționat</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="amenities.pool"
                          checked={editFormData.amenities?.pool || false}
                          onChange={handleEditFormChange}
                          className="form-checkbox"
                        />
                        <span>Piscină</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
                    >
                      Anulare
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSaveHotel(hotel.id || hotel._id)}
                      className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
                    >
                      Salvare
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-40">
                  <img
                    src={
                      hotel.photos && hotel.photos.length > 0
                        ? typeof hotel.photos[0] === 'string'
                          ? hotel.photos[0]
                          : (hotel.photos[0].name && typeof hotel.photos[0].name === 'string')
                            ? (hotel.photos[0].name.startsWith('http') ? hotel.photos[0].name : `${API_BASE_URL}/api/places/media/${encodeURIComponent(hotel.photos[0].name)}?maxWidthPx=400`)
                            : 'https://placehold.co/600x400/172a45/ffffff?text=No+Image'
                        : 'https://placehold.co/600x400/172a45/ffffff?text=No+Image'
                    }
                  alt={hotel.title || hotel.name} 
                  className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x400/172a45/ffffff?text=Image+Error';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => handleEditHotel(hotel)}
                      className="bg-blue-500 p-2 rounded-full text-white hover:bg-blue-600 transition"
                      title="Edit"
                    >
                      <FaEdit size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteClick(hotel)}
                      className="bg-red-500 p-2 rounded-full text-white hover:bg-red-600 transition"
                      title="Delete"
                    >
                      <FaTrash size={14} />
                    </button>
              </div>
            </div>
            
                <div className="p-4">
                  <h4 className="text-lg font-bold mb-1">{hotel.title || hotel.name}</h4>
                  <p className="text-sm text-gray-300 mb-2">{hotel.address || hotel.location}</p>
                  
                  <div className="flex items-center mb-3">
                <div className="flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      <span>{hotel.rating?.toFixed(1) || '0.0'}</span>
                </div>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="text-lg font-bold">{hotel.price} RON</span>
              </div>
              
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(hotel.amenities && typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities)) ? (
                    Object.entries(hotel.amenities)
                      .filter(([_, value]) => value === true)
                      .map(([key]) => (
                          <span key={key} className="bg-[#0a192f] text-xs px-2 py-1 rounded">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      ))
                    ) : (Array.isArray(hotel.amenities) ? (
                      hotel.amenities.map((amenity, index) => (
                        <span key={index} className="bg-[#0a192f] text-xs px-2 py-1 rounded">
                          {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                      </span>
                    ))
                    ) : null)}
                </div>
                  
                  <button
                    onClick={() => navigate(`/hotel/${hotel.id || hotel._id}`)}
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
                  >
                    Vezi detalii
                </button>
              </div>
              </>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}

{/* Delete confirmation modal */}
{showDeleteModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-[#172a45] rounded-lg p-6 max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">Confirmare ștergere</h3>
      <p className="mb-6">
        Sunteți sigur că doriți să ștergeți cazarea "{hotelToDelete?.title || hotelToDelete?.name}"? 
        Această acțiune nu poate fi anulată.
      </p>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setHotelToDelete(null);
          }}
          className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
        >
          Anulare
        </button>
        
        <button
          onClick={handleDeleteHotel}
          className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Ștergere
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