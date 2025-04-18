import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaFilter, FaImage, FaClock, FaDollarSign, FaTags } from 'react-icons/fa';
import axios from 'axios';


const initialServices = [
  { 
    id: 1, 
    name: 'Flight Booking', 
    description: 'Find and book flights to destinations worldwide with our comprehensive flight search.',
    priceRange: '$100-$1500',
    basePrice: 100,
    category: 'Transportation',
    featuredImage: '/images/services/flight.webp',
    galleryImages: ['/images/services/flight1.webp', '/images/services/flight2.webp', '/images/services/flight3.webp'],
    availabilityHours: '24/7',
    bookings: 245, 
    status: 'Active',
    featured: true,
    dateAdded: '2024-10-01'
  },
  { 
    id: 2, 
    name: 'Hotel Booking', 
    description: 'Book accommodations ranging from luxury hotels to budget-friendly options worldwide.',
    priceRange: '$50-$500 per night',
    basePrice: 50,
    category: 'Accommodation',
    featuredImage: '/images/services/hotel.webp',
    galleryImages: ['/images/services/hotel1.webp', '/images/services/hotel2.webp', '/images/services/hotel3.webp'],
    availabilityHours: '24/7',
    bookings: 189, 
    status: 'Active',
    featured: true,
    dateAdded: '2024-10-01'
  },
  { 
    id: 3, 
    name: 'Car Rental', 
    description: 'Rent vehicles of all sizes for your travel needs with flexible pickup and drop-off options.',
    priceRange: '$50-$200 per day',
    basePrice: 50,
    category: 'Transportation',
    featuredImage: '/images/services/car.webp',
    galleryImages: ['/images/services/car1.webp', '/images/services/car2.webp', '/images/services/car3.webp'],
    availabilityHours: '8:00 AM - 8:00 PM',
    bookings: 127, 
    status: 'Active',
    featured: false,
    dateAdded: '2024-10-05'
  },
  { 
    id: 4, 
    name: 'Tour Package', 
    description: 'All-inclusive guided tours with accommodation, meals, and attractions included.',
    priceRange: '$100-$2000',
    basePrice: 100,
    category: 'Experience',
    featuredImage: '/images/services/tour.webp',
    galleryImages: ['/images/services/tour1.webp', '/images/services/tour2.webp', '/images/services/tour3.webp'],
    availabilityHours: '9:00 AM - 6:00 PM',
    bookings: 98, 
    status: 'Active',
    featured: true,
    dateAdded: '2024-10-10'
  },
  { 
    id: 5, 
    name: 'Airport Transfer', 
    description: 'Reliable transportation to and from airports worldwide with professional drivers.',
    priceRange: '$30-$150',
    basePrice: 30,
    category: 'Transportation',
    featuredImage: '/images/services/airport.webp',
    galleryImages: ['/images/services/airport1.webp', '/images/services/airport2.webp'],
    availabilityHours: '24/7',
    bookings: 76, 
    status: 'Active',
    featured: false,
    dateAdded: '2024-10-15'
  },
  { 
    id: 6, 
    name: 'Cruise Booking', 
    description: 'Book luxury cruise vacations to exotic destinations with all-inclusive packages.',
    priceRange: '$500-$5000',
    basePrice: 500,
    category: 'Experience',
    featuredImage: '/images/services/cruise.webp',
    galleryImages: ['/images/services/cruise1.webp', '/images/services/cruise2.webp'],
    availabilityHours: '9:00 AM - 7:00 PM',
    bookings: 42, 
    status: 'Inactive',
    featured: false,
    dateAdded: '2024-10-20'
  }
];


const serviceCategories = [
  'Transportation',
  'Accommodation',
  'Experience',
  'Food & Dining',
  'Adventure',
  'Wellness',
  'Business'
];

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  useEffect(() => {
    fetchServices();
  }, []);
  
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/services`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setServices(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch services. Please try again later.');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddService = async (newService) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/services`,
        newService,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setServices([...services, response.data]);
      setIsAddModalOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to add service. Please try again later.');
      console.error('Error adding service:', err);
    }
  };
  
  const handleUpdateService = async (updatedService) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/services/${updatedService._id}`,
        updatedService,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setServices(services.map(service => 
        service._id === updatedService._id ? response.data : service
      ));
      
      setIsEditModalOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to update service. Please try again later.');
      console.error('Error updating service:', err);
    }
  };
  
  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/services/${serviceId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setServices(services.filter(service => service._id !== serviceId));
      setError(null);
    } catch (err) {
      setError('Failed to delete service. Please try again later.');
      console.error('Error deleting service:', err);
    }
  };
  
  const getCategoryColor = (category) => {
    switch (category) {
      case 'hotel':
        return 'bg-blue-500/20 text-blue-400';
      case 'tour':
        return 'bg-green-500/20 text-green-400';
      case 'transport':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'activity':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const filteredServices = services.filter(service => {
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    const matchesSearch = searchQuery === '' || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Manage Services</h1>
          <p className="text-gray-400">View, add, edit, and manage all services</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <FaSearch />
                </span>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Category filter */}
            <div>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="hotel">Hotels</option>
                <option value="tour">Tours</option>
                <option value="transport">Transport</option>
                <option value="activity">Activities</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {/* Add service button */}
            <div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center justify-center bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                <span>Add Service</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Services Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      Loading services...
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      No services found
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service) => (
                    <tr key={service._id} className="text-sm">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-gray-400">{service.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(service.category)}`}>
                          {service.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">${service.price}</td>
                      <td className="px-6 py-4">{service.duration} min</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${service.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setCurrentService(service);
                              setIsEditModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service._id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Add Service Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-4">
              <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Add New Service</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                  <FaTimes />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Service name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      rows="3"
                      placeholder="Service description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="hotel">Hotel</option>
                      <option value="tour">Tour</option>
                      <option value="transport">Transport</option>
                      <option value="activity">Activity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Images
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-400">
                          <label className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload images</span>
                            <input type="file" className="sr-only" multiple />
                          </label>
                        </div>
                        <p className="text-xs text-gray-400">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {

                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Service
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Service Modal */}
        {isEditModalOpen && currentService && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-4">
              <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Edit Service</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                  <FaTimes />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      value={currentService.name}
                      onChange={(e) => setCurrentService({...currentService, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      rows="3"
                      value={currentService.description}
                      onChange={(e) => setCurrentService({...currentService, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Category
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      value={currentService.category}
                      onChange={(e) => setCurrentService({...currentService, category: e.target.value})}
                    >
                      <option value="hotel">Hotel</option>
                      <option value="tour">Tour</option>
                      <option value="transport">Transport</option>
                      <option value="activity">Activity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        value={currentService.price}
                        onChange={(e) => setCurrentService({...currentService, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        value={currentService.duration}
                        onChange={(e) => setCurrentService({...currentService, duration: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                      value={currentService.isActive}
                      onChange={(e) => setCurrentService({...currentService, isActive: e.target.value === 'true'})}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateService(currentService)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceManagement;