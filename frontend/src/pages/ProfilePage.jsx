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
    } else {
      setAccommodation(prev => ({ ...prev, [name]: value }));
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
      

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        if (photo.file) {
          try {

            const formData = new FormData();
            formData.append('image', photo.file);
            
            try {

              const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
              const response = await axios.post(
                `${API_BASE_URL}/api/upload/accommodation`, 
                formData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  }
                }
              );
              
              if (response.data && response.data.url) {
                uploadedUrls.push(response.data.url);
                continue;
              }
            } catch (apiError) {
              console.error('API upload error:', apiError);

            }
            


            if (photo.url && photo.url.startsWith('blob:')) {

              uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Accommodation+Image+${i+1}`);
            } else {
              uploadedUrls.push(photo.url);
            }
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);

            uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Upload+Failed+${i+1}`);
          }
        } else if (photo.url) {

          if (photo.url.startsWith('blob:')) {

            uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Accommodation+Image+${i+1}`);
          } else {

            uploadedUrls.push(photo.url);
          }
        } else {

          uploadedUrls.push(`https://placehold.co/800x600/172a45/ffffff?text=Image+${i+1}`);
        }
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      

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
    

    if (!accommodation.title || !accommodation.description || !accommodation.address || !accommodation.price) {
      showNotification('Completați toate câmpurile obligatorii', 'error');
      return;
    }
    
    try {

      setLoading(true);
      

      showNotification('Procesăm plata...', 'info');
      let paymentToken;
      try {
        paymentToken = await processPayment(accommodation.paymentMethod);
      } catch (paymentError) {
        console.error('Payment failed:', paymentError);
        showNotification('Procesarea plății a eșuat. Vom continua fără plată.', 'warning');
        paymentToken = 'mock-payment-token';
      }
      

      showNotification('Încărcăm fotografiile...', 'info');
      let photoUrls;
      try {
        photoUrls = await uploadPhotos(accommodation.photos);
      } catch (photoError) {
        console.error('Photo upload failed:', photoError);
        showNotification('Încărcarea fotografiilor a eșuat. Vom continua fără fotografii.', 'warning');
        photoUrls = [];
      }
      

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      

      const paymentData = {
        paymentMethod: accommodation.paymentMethod,
        paymentToken: paymentToken,
        cardDetails: accommodation.paymentMethod === 'card' ? {
          cardNumber: cardDetails.cardNumber.replace(/\s/g, ''),
          expiryDate: cardDetails.expiryDate,
          cardholderName: cardDetails.cardholderName || user?.name || 'Card Holder',
          cvc: cardDetails.cvc
        } : null
      };
      
      const accommodationData = {
        title: accommodation.title,
        description: accommodation.description,
        propertyType: accommodation.propertyType,
        maxGuests: accommodation.maxGuests,
        bedrooms: accommodation.bedrooms,
        bathrooms: accommodation.bathrooms,
        amenities: accommodation.amenities,
        address: accommodation.address,
        price: accommodation.price,
        currency: accommodation.currency,
        phoneNumber: accommodation.phoneNumber,
        houseRules: accommodation.houseRules,
        cancellationPolicy: accommodation.cancellationPolicy,
        checkInTime: accommodation.checkInTime || '14:00',
        checkOutTime: accommodation.checkOutTime || '11:00',
        coordinates: accommodation.coordinates || { lat: 0, lng: 0 },
        photos: photoUrls,
        payment: paymentData,

        status: 'pending',

        isHotel: true,
        rating: 0,
        reviews: [],
        weeklyDiscount: accommodation.weeklyDiscount || false,
        monthlyDiscount: accommodation.monthlyDiscount || false
      };
      
      try {
        console.log('Sending data to API:', accommodationData);
        

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
        

        showNotification('Cazarea a fost adăugată cu succes și este în așteptare pentru aprobare!', 'success');
        

        if (response.data && response.data.success) {
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
        }
      } catch (submitError) {
        console.error('Error submitting accommodation:', submitError);
        

        if (submitError.response) {
          console.error('Server response:', submitError.response.status, submitError.response.data);
          
          if (submitError.response.status === 404) {
            console.log('Using mock response since API endpoint is not available');

            showNotification('Cazarea a fost adăugată cu succes și este în așteptare pentru aprobare! (Simulare)', 'success');
            

            console.log('Accommodation data that would be submitted:', accommodationData);
            


            const savedAccommodations = JSON.parse(localStorage.getItem('userAccommodations') || '[]');
            savedAccommodations.push({
              ...accommodationData,
              id: `mock-${Date.now()}`,
              createdAt: new Date().toISOString(),

              status: 'approved'
            });
            localStorage.setItem('userAccommodations', JSON.stringify(savedAccommodations));
            

            const mockHotels = JSON.parse(localStorage.getItem('mockHotels') || '[]');
            mockHotels.push({
              ...accommodationData,
              id: `mock-${Date.now()}`,
              createdAt: new Date().toISOString(),
              status: 'approved'
            });
            localStorage.setItem('mockHotels', JSON.stringify(mockHotels));
            

            setUserHotels(savedAccommodations);
          } else {

            showNotification(`Eroare la trimiterea datelor către server (${submitError.response.status}): ${submitError.response.data.message || 'Vă rugăm să încercați din nou.'}`, 'error');
          }
        } else {

          showNotification('Eroare de rețea la trimiterea datelor. Verificați conexiunea și încercați din nou.', 'error');
        }
      }
      

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
      });
      

      setCardDetails({
        cardNumber: '',
        expiryDate: '',
        cvc: ''
      });
      
    } catch (error) {
      console.error('Error submitting accommodation:', error);
      showNotification('A apărut o eroare. Vă rugăm să încercați din nou.', 'error');
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
              {/* Using OpenStreetMap which doesn't require API key */}
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
        
        {/* Image Preview Area */}
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

      {/* This is the connecting element - a visual divider with summary information */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-blue-400/30 shadow-xl backdrop-blur-sm transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
              <FaCheckCircle className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Almost Done!
              </h3>
              <p className="text-sm text-gray-300">Complete payment to publish your accommodation</p>
            </div>
          </div>
          
          <div className="flex items-center bg-gray-800/50 px-4 py-2 rounded-lg">
            <div className="flex flex-col items-end mr-4">
              <span className="text-xs text-gray-400">Publishing Fee</span>
              <span className="text-lg font-semibold text-white">10.00 EUR</span>
            </div>
            <FaArrowRight className="text-blue-400" />
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-1">Property Type</h4>
            <p className="text-white capitalize">{accommodation.propertyType || 'Not specified'}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-1">Location</h4>
            <p className="text-white truncate">{accommodation.address || 'Not specified'}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-1">Base Price</h4>
            <p className="text-white">{accommodation.price || '0'} {accommodation.currency || 'RON'}</p>
          </div>
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
                Publishing your accommodation requires a one-time fee of <span className="font-semibold text-orange-400">10 EUR</span> per listing.
                Your property will be visible to all users after payment is processed.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
          <h4 className="text-lg font-medium text-white mb-4">Order Summary</h4>
          
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-300">Property Listing Fee</span>
            <span className="font-medium text-white">10.00 EUR</span>
          </div>
          
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-300">Service Fee</span>
            <span className="font-medium text-white">0.00 EUR</span>
          </div>
          
          <div className="flex justify-between py-3 mt-1">
            <span className="text-lg text-white font-medium">Total</span>
            <span className="text-lg font-bold text-orange-400">10.00 EUR</span>
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
                <span className="text-white">Euro Central Bank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Holder:</span>
                <span className="text-white">Travel Explorer SRL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">IBAN:</span>
                <span className="text-white">RO29 BACX 0000 0012 3456 7890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SWIFT:</span>
                <span className="text-white">BACXROBU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reference:</span>
                <span className="text-white">ACC-{Math.floor(Math.random() * 10000)}</span>
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

      <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
        <button
          type="button"
          className="order-2 sm:order-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium flex items-center justify-center transition-all"
        >
          <FaSave className="mr-2" />
          Save as Draft
        </button>
        
        <button
          type="submit"
          disabled={!agreeTerms}
          className={`order-1 sm:order-2 px-8 py-3 rounded-xl font-medium flex items-center justify-center transition-all ${
            agreeTerms 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FaCreditCard className="mr-2" />
          Pay & Publish Accommodation
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
  <div className="space-y-10">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-white relative">
        <span className="relative">
          Cazările Mele
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></span>
        </span>
      </h2>
      <button
        onClick={() => setActiveTab('accommodation')}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
      >
        <FaHome /> Adaugă Cazare Nouă
      </button>
    </div>
    
    {hotelsLoading ? (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    ) : userHotels.length === 0 ? (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 rounded-2xl border border-blue-500/30 shadow-xl text-center">
        <div className="p-3 bg-blue-500/20 rounded-full inline-block mb-4">
          <FaHome className="text-blue-400 text-2xl" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">Nu aveți cazări adăugate încă</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          Adăugați prima dvs. cazare pentru a o face vizibilă potențialilor clienți. Procesul este simplu și rapid.
        </p>
        <button
          onClick={() => setActiveTab('accommodation')}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <FaHome /> Adaugă Prima Cazare
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userHotels.map(hotel => (
          <div 
            key={hotel._id || hotel.id}
            className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-blue-500/30 hover:border-blue-400/60 shadow-xl overflow-hidden transition-all duration-300"
          >
            {/* Accommodation Image */}
            <div className="h-48 bg-gray-700 relative">
              {hotel.photos && hotel.photos.length > 0 ? (
                <img 
                  src={typeof hotel.photos[0] === 'string' ? hotel.photos[0] : hotel.photos[0].url || '/default-hotel.jpg'} 
                  alt={hotel.title || hotel.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FaHome className="text-gray-500 text-4xl" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium
                ${hotel.status === 'approved' ? 'bg-green-500/80 text-white' : 
                  hotel.status === 'pending' ? 'bg-yellow-500/80 text-white' : 
                  'bg-red-500/80 text-white'}`}
              >
                {hotel.status === 'approved' ? 'Aprobată' : 
                 hotel.status === 'pending' ? 'În așteptare' : 
                 hotel.status === 'rejected' ? 'Respinsă' : 'Necunoscută'}
              </div>
            </div>
            
            {/* Accommodation Details */}
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white mb-2 truncate">
                {hotel.title || hotel.name}
              </h3>
              <p className="text-gray-400 text-sm mb-3 flex items-start">
                <FaMapMarkerAlt className="text-blue-400 mr-1 mt-1 shrink-0" />
                <span className="line-clamp-2">{hotel.address || hotel.location || 'Locație nedisponibilă'}</span>
              </p>
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  {hotel.price && (
                    <span className="text-white font-semibold mr-1">
                      {hotel.price} {hotel.currency || 'RON'}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">/noapte</span>
                </div>
                
                {hotel.rating && (
                  <div className="flex items-center bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-sm">
                    <FaStar className="mr-1" /> {hotel.rating}
                  </div>
                )}
              </div>
              
              {/* Amenities */}
              {hotel.amenities && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {typeof hotel.amenities === 'object' && !Array.isArray(hotel.amenities) ? (
                    Object.entries(hotel.amenities)
                      .filter(([_, value]) => value === true)
                      .map(([key]) => (
                        <span key={key} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-xs">
                          {key === 'wifi' ? 'Wi-Fi' : 
                           key === 'parking' ? 'Parking' : 
                           key === 'ac' ? 'A/C' : 
                           key === 'tv' ? 'TV' : 
                           key === 'pool' ? 'Pool' : 
                           key === 'coffeeMaker' ? 'Coffee' : 
                           key.charAt(0).toUpperCase() + key.slice(1)
                          }
                        </span>
                      ))
                  ) : (
                    Array.isArray(hotel.amenities) && hotel.amenities.map((amenity, index) => (
                      <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-md text-xs">
                        {amenity}
                      </span>
                    ))
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-700">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-1 flex items-center justify-center">
                  <FaEdit className="mr-1" /> Edit
                </button>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;