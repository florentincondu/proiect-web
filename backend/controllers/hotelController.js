const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const CustomError = require('../utils/CustomError');
const Hotel = require('../models/Hotel');
const path = require('path');
const fs = require('fs');

exports.checkAvailability = async (req, res) => {
  try {
    const { hotelId, startDate, endDate, guests, roomType } = req.body;
    
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }

    // Check availability with specific room type if provided
    const isAvailable = await hotel.checkAvailability(startDate, endDate, roomType, guests);
    
    // Calculate price based on room type or guest count
    const totalPrice = hotel.calculateTotalPrice(startDate, endDate, roomType, guests);

    // Get room configuration and availability details
    const roomConfig = hotel.rooms.find(r => r.type === roomType);
    const totalRoomCount = roomConfig ? roomConfig.count : 0;
    
    // Calculate how many rooms are booked for the specified dates
    let bookedCount = 0;
    if (roomConfig) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Find the maximum number of booked rooms across all dates in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const availabilityEntry = hotel.availability.find(a => 
          a.date.toISOString().split('T')[0] === dateString
        );

        if (availabilityEntry) {
          const roomAvailability = availabilityEntry.rooms.find(r => r.type === roomType);
          if (roomAvailability) {
            bookedCount = Math.max(bookedCount, roomAvailability.count);
          }
        }
      }
    }

    // Get all room types if needed
    let availableRoomTypes = [];
    if (!roomType && hotel.rooms && hotel.rooms.length > 0) {
      // Check availability for each room type
      for (const room of hotel.rooms) {
        const available = await hotel.checkAvailability(startDate, endDate, room.type);
        if (available) {
          availableRoomTypes.push({
            type: room.type,
            capacity: room.capacity,
            price: room.price,
            count: room.count
          });
        }
      }
    }

    res.json({
      available: isAvailable,
      totalPrice,
      roomType: roomType || hotel.getRoomTypeForGuests(guests),
      totalCount: totalRoomCount,
      bookedCount: bookedCount,
      availableCount: totalRoomCount - bookedCount,
      availableRoomTypes: availableRoomTypes.length > 0 ? availableRoomTypes : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHotels = asyncHandler(async (req, res, next) => {
  const query = req.user?.isAdmin ? {} : { isRestricted: { $ne: true } };
  
  const hotels = await Hotel.find(query);
  
  res.status(200).json({
    success: true,
    count: hotels.length,
    data: hotels,
    hotels: hotels // Include hotels field for backward compatibility
  });
});

exports.getHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: hotel
  });
});

exports.createHotel = asyncHandler(async (req, res, next) => {
  try {
    console.log('Received hotel creation request with data:', JSON.stringify(req.body, null, 2));
    const requiredFields = ['name', 'location', 'price'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Generate appropriate room counts based on hotel attributes
    let roomCounts = {
      single: 2,
      double: 3,
      triple: 2,
      quad: 1
    };
    
    // If this is an API hotel, determine room counts based on characteristics
    if (req.body.placeId) {
      // Get the price as a factor - higher price generally means larger hotel
      const priceLevel = req.body.priceLevel || 2;
      const ratingLevel = req.body.rating || 3.5;
      const userRatingCount = req.body.userRatingCount || 0;
      
      // Calculate a size factor based on ratings and price
      const sizeFactor = (((priceLevel / 5) * 2) + (ratingLevel / 5) + (Math.min(userRatingCount, 1000) / 1000)) / 3;
      
      // Adjust room counts based on the size factor (1.0 = standard, 2.0 = large hotel)
      roomCounts = {
        single: Math.round(3 + (sizeFactor * 7)),    // 3-10 single rooms
        double: Math.round(5 + (sizeFactor * 10)),   // 5-15 double rooms
        triple: Math.round(2 + (sizeFactor * 6)),    // 2-8 triple rooms
        quad: Math.round(1 + (sizeFactor * 4))       // 1-5 quad rooms
      };
      
      console.log(`Generated room counts for API hotel based on size factor ${sizeFactor.toFixed(2)}:`, roomCounts);
    }
    
    const hotelData = {
      ...req.body,
      owner: req.user._id, // Always set owner to current user
      status: 'active',    // Set default status
      rooms: req.body.rooms || [  // Set default rooms if not provided
        {
          type: 'single',
          capacity: 1,
          price: Math.round(req.body.price * 0.7),
          count: roomCounts.single
        },
        {
          type: 'double',
          capacity: 2,
          price: req.body.price,
          count: roomCounts.double
        },
        {
          type: 'triple',
          capacity: 3,
          price: Math.round(req.body.price * 1.3),
          count: roomCounts.triple
        },
        {
          type: 'quad',
          capacity: 4,
          price: Math.round(req.body.price * 1.6),
          count: roomCounts.quad
        }
      ]
    };
    if (hotelData.placeId) {
      console.log('Checking for existing hotel with placeId:', hotelData.placeId);
      const existingHotel = await Hotel.findOne({ placeId: hotelData.placeId });
      if (existingHotel) {
        console.log('Found existing hotel:', existingHotel._id);
        return res.status(200).json({
          success: true,
          data: existingHotel
        });
      }
    }

    // Initialize availability data
    const availability = [];
    try {
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Create proper objects, not string representations
        const roomsAvailability = [];
        for (const room of hotelData.rooms) {
          roomsAvailability.push({
            type: room.type,
            count: 0
          });
        }
        
        availability.push({
          date,
          rooms: roomsAvailability
        });
      }
    } catch (availabilityError) {
      console.error('Error generating availability data:', availabilityError);
    }

    hotelData.availability = availability;

    console.log('Creating new hotel with data:', JSON.stringify({
      ...hotelData,
      availability: hotelData.availability.length > 0 ? `${hotelData.availability.length} entries initialized` : 'No availability entries'
    }, null, 2));
    
    const hotel = await Hotel.create(hotelData);
    console.log('Hotel created successfully:', hotel._id);

    res.status(201).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return res.status(400).json({
      success: false,
      message: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

exports.updateHotel = asyncHandler(async (req, res, next) => {
  let hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
  }
  
  hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: hotel
  });
});

exports.deleteHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
  }
  
  await hotel.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

exports.updateHotelPrice = asyncHandler(async (req, res, next) => {
  const { price, name } = req.body;
  
  if (price === undefined || typeof price !== 'number') {
    return next(new CustomError('Please provide a valid price', 400));
  }
  
  try {

    let PlacePrice;
    try {
      const modelPath = path.join(__dirname, '..', 'models', 'PlacePrice.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlacePrice model file does not exist at path:', modelPath);

        const mongoose = require('mongoose');
        
        const placePriceSchema = new mongoose.Schema({
          placeId: {
            type: String,
            required: true,
            unique: true,
            index: true
          },
          name: {
            type: String,
            required: true
          },
          price: {
            type: Number,
            required: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          },
          updatedAt: {
            type: Date,
            default: Date.now
          },
          updatedBy: {
            userId: {
              type: String
            },
            email: {
              type: String
            }
          }
        });
        
        PlacePrice = mongoose.model('PlacePrice', placePriceSchema, 'places_prices');
      } else {
        PlacePrice = require('../models/PlacePrice');
      }
    } catch (err) {
      console.error('Error importing or creating PlacePrice model:', err);
      return next(new CustomError('Server error loading models', 500));
    }
    

    const [hotel, placePrice] = await Promise.all([
      Hotel.findByIdAndUpdate(
        req.params.id,
        { price },
        { new: true, runValidators: true }
      ),
      PlacePrice.findOneAndUpdate(
        { placeId: req.params.id },
        {
          $set: {
            placeId: req.params.id,
            name: name || 'Unknown Hotel',
            price: parseFloat(price),
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      )
    ]);
    
    if (!hotel) {
      return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: {
        hotel,
        placePrice
      }
    });
  } catch (error) {
    console.error('Error updating hotel price:', error);
    return next(new CustomError('Error updating hotel price', 500));
  }
});

exports.batchUpdatePrices = asyncHandler(async (req, res, next) => {
  const { prices } = req.body;
  
  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    return next(new CustomError('Please provide an array of prices', 400));
  }
  
  const updateOperations = [];
  const invalidIds = [];
  
  for (const item of prices) {
    if (!item.id || !item.price || typeof item.price !== 'number') {
      invalidIds.push(item.id || 'unknown');
      continue;
    }
    
    const hotel = await Hotel.findById(item.id);
    if (!hotel) {
      invalidIds.push(item.id);
      continue;
    }
    
    updateOperations.push({
      updateOne: {
        filter: { _id: item.id },
        update: { price: item.price }
      }
    });
  }
  
  if (updateOperations.length === 0) {
    return next(new CustomError('No valid hotel price updates found', 400));
  }
  
  await Hotel.bulkWrite(updateOperations);
  
  res.status(200).json({
    success: true,
    count: updateOperations.length,
    invalidIds: invalidIds.length > 0 ? invalidIds : undefined
  });
});

exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hotel not found' 
      });
    }

    const { startDate, endDate, guests } = req.query;
    if (startDate && endDate && guests) {
      const availability = hotel.checkAvailability(startDate, endDate, guests);
      return res.json({ 
        success: true,
        data: { 
          ...hotel.toObject(), 
          availability 
        }
      });
    }

    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    console.error('Error fetching hotel:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hotel',
      error: error.message
    });
  }
};

exports.searchHotels = asyncHandler(async (req, res, next) => {
  try {
  const { query } = req.query;
  
  if (!query) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Create a regex for case-insensitive search
    const searchRegex = new RegExp(query, 'i');
    
    // Search hotels that match query in name, location, or description
    // Only return hotels that are approved or active
    const hotels = await Hotel.find({
    $and: [
      {
        $or: [
            { name: searchRegex },
            { location: searchRegex },
            { description: searchRegex }
          ]
        },
        {
          $or: [
            { status: 'approved' },
            { status: 'active' }
          ]
        },
        {
          isRestricted: { $ne: true }
        }
      ]
    });
  
  res.status(200).json({
    success: true,
    count: hotels.length,
    data: hotels
  });
  } catch (error) {
    console.error('Error searching hotels:', error);
    next(new CustomError('Error searching hotels', 500));
  }
});

exports.updateRoomPrices = asyncHandler(async (req, res, next) => {
  const { rooms } = req.body;
  
  if (!rooms || !Array.isArray(rooms)) {
    return res.status(400).json({
      success: false,
      message: 'Valid room prices are required'
    });
  }
  
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
  }
  

  rooms.forEach(roomUpdate => {
    const room = hotel.rooms.find(r => r._id.toString() === roomUpdate.roomId);
    if (room) {
      room.price = roomUpdate.price;
    }
  });
  
  await hotel.save();
  
  res.status(200).json({
    success: true,
    data: hotel
  });
});

exports.createUserHotel = asyncHandler(async (req, res, next) => {
  try {
    const {
      title, description, propertyType, maxGuests, bedrooms, bathrooms,
      amenities, address, price, currency, phoneNumber, houseRules,
      cancellationPolicy, coordinates, photos, checkInTime, checkOutTime,
      payment, weeklyDiscount, monthlyDiscount, roomsConfig
    } = req.body;

    console.log('Received hotel data:', JSON.stringify({
      title, 
      address,
      price,
      roomsConfig: roomsConfig ? `${roomsConfig.length} rooms` : 'no room config',
      photos: photos ? `${photos.length} photos` : 'no photos',
      user: req.user ? req.user.id : 'user not available'
    }, null, 2));

    if (!req.user || !req.user.id) {
      console.error('User not authenticated or user ID missing');
      return next(new CustomError('Nu sunteți autorizat să adăugați cazări. Vă rugăm să vă autentificați.', 401));
    }

    if (!title || !description || !address || !price) {
      console.error('Missing required fields:', { title, description, address, price });
      return next(new CustomError('Vă rugăm să completați toate câmpurile obligatorii', 400));
    }

    const basePrice = parseFloat(price);
    if (isNaN(basePrice) || basePrice <= 0) {
      console.error('Invalid price value:', price);
      return next(new CustomError('Prețul trebuie să fie un număr pozitiv', 400));
    }

    // Process room configuration
    let rooms = [];
    try {
      if (roomsConfig && Array.isArray(roomsConfig) && roomsConfig.length > 0) {
        // Use the provided room configuration
        rooms = roomsConfig.map(room => ({
          type: room.type || 'double',
          capacity: parseInt(room.capacity) || 2,
          price: parseFloat(room.price) || basePrice,
          count: parseInt(room.count) || 1
        }));
        
        console.log('Using custom room configuration:', rooms);
      } else {
        // Default room configuration based on base price
        rooms = [
          {
            type: 'single',
            capacity: 1,
            price: Math.round(basePrice * 0.7),
            count: 2
          },
          {
            type: 'double',
            capacity: 2,
            price: basePrice,
            count: 3
          },
          {
            type: 'triple',
            capacity: 3,
            price: Math.round(basePrice * 1.3),
            count: 2
          },
          {
            type: 'quad',
            capacity: 4,
            price: Math.round(basePrice * 1.6),
            count: 1
          }
        ];
        
        console.log('Using default room configuration based on price:', basePrice);
      }
    } catch (roomError) {
      console.error('Error processing room configuration:', roomError);
      rooms = [
        { type: 'double', capacity: 2, price: basePrice, count: 5 }
      ];
    }

    // Initialize availability data
    const availability = [];
    try {
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Create proper objects, not string representations
        const roomsAvailability = [];
        for (const room of rooms) {
          roomsAvailability.push({
            type: room.type,
            count: 0
          });
        }
        
        availability.push({
          date,
          rooms: roomsAvailability
        });
      }
    } catch (availabilityError) {
      console.error('Error generating availability data:', availabilityError);
    }

    // Process amenities
    const amenitiesArray = [];
    try {
      if (amenities && typeof amenities === 'object') {
        for (const [key, value] of Object.entries(amenities)) {
          if (value === true) amenitiesArray.push(key);
        }
      }
    } catch (amenitiesError) {
      console.error('Error processing amenities:', amenitiesError);
    }

    // Create hotel data object
    const hotelData = {
      name: title,
      location: address,
      description,
      price: basePrice,
      propertyType: propertyType || 'apartment',
      maxGuests: parseInt(maxGuests) || 2,
      bedrooms: parseInt(bedrooms) || 1,
      bathrooms: parseInt(bathrooms) || 1,
      phoneNumber: phoneNumber || '',
      houseRules: houseRules || '',
      cancellationPolicy: cancellationPolicy || 'moderate',
      checkInTime: checkInTime || '14:00',
      checkOutTime: checkOutTime || '11:00',
      owner: req.user.id,
      coordinates: coordinates || { lat: 0, lng: 0 },
      status: 'active',
      amenities: amenitiesArray,
      isHotel: true,
      rating: 0,
      reviews: [],
      rooms: rooms,
      availability: availability,
      discounts: {
        weekly: weeklyDiscount || false,
        monthly: monthlyDiscount || false
      }
    };

    // Process payment data
    try {
      if (payment && typeof payment === 'object') {
        hotelData.payment = {
          verified: true,
          paymentDate: new Date(),
          paymentMethod: payment.paymentMethod || 'card',
          paymentId: payment.paymentToken || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        };
        
        if (payment.cardDetails) {
          hotelData.payment.cardDetails = {
            cardNumber: payment.cardDetails.cardNumber ? payment.cardDetails.cardNumber.slice(-4) : '****',
            expiryDate: payment.cardDetails.expiryDate || '**/**',
            cardholderName: payment.cardDetails.cardholderName || 'Card Owner'
          };
        }
        
        // Create Payment record in the database
        const Payment = require('../models/Payment');
        const invoiceNumber = await Payment.generateInvoiceNumber();
        
        const paymentRecord = new Payment({
          invoiceNumber,
          user: req.user._id,
          items: [{
            description: `Listing fee for new hotel: ${hotelData.name}`,
            quantity: 1,
            unitPrice: 199.99, // Price in RON
            total: 199.99 // Price in RON
          }],
          subtotal: 199.99, // Price in RON
          tax: 0,
          discount: 0,
          total: 199.99, // Price in RON
          currency: 'RON', // Set currency to RON
          status: 'paid',
          paymentMethod: payment.paymentMethod === 'card' ? 'credit_card' : payment.paymentMethod === 'paypal' ? 'paypal' : 'bank_transfer',
          transactionId: hotelData.payment.paymentId,
          issueDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), // Due in 10 days
          paidDate: new Date(),
          notes: `Payment for listing new hotel: ${hotelData.name}`
        });
        
        await paymentRecord.save();
        console.log(`Created payment record with ID ${paymentRecord._id} for hotel ${hotelData.name}`);
      } else {
        hotelData.payment = {
          verified: true,
          paymentDate: new Date(),
          paymentMethod: 'card',
          paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        };
        
        // Create default Payment record
        const Payment = require('../models/Payment');
        const invoiceNumber = await Payment.generateInvoiceNumber();
        
        const paymentRecord = new Payment({
          invoiceNumber,
          user: req.user._id,
          items: [{
            description: `Listing fee for new hotel: ${hotelData.name}`,
            quantity: 1,
            unitPrice: 199.99, // Price in RON
            total: 199.99 // Price in RON
          }],
          subtotal: 199.99, // Price in RON
          tax: 0,
          discount: 0,
          total: 199.99, // Price in RON
          currency: 'RON', // Set currency to RON
          status: 'paid',
          paymentMethod: 'credit_card', // Default to credit card
          transactionId: hotelData.payment.paymentId,
          issueDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), // Due in 10 days
          paidDate: new Date(),
          notes: `Payment for listing new hotel: ${hotelData.name}`
        });
        
        await paymentRecord.save();
        console.log(`Created default payment record with ID ${paymentRecord._id} for hotel ${hotelData.name}`);
      }
    } catch (paymentError) {
      console.error('Error processing payment data:', paymentError);
      hotelData.payment = {
        verified: true,
        paymentDate: new Date(),
        paymentMethod: 'card',
        paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      };
      
      // Log payment error but still try to create a payment record
      try {
        const Payment = require('../models/Payment');
        const invoiceNumber = await Payment.generateInvoiceNumber();
        
        const paymentRecord = new Payment({
          invoiceNumber,
          user: req.user._id,
          items: [{
            description: `Listing fee for new hotel: ${hotelData.name}`,
            quantity: 1,
            unitPrice: 199.99, // Price in RON
            total: 199.99 // Price in RON
          }],
          subtotal: 199.99, // Price in RON
          tax: 0,
          discount: 0,
          total: 199.99, // Price in RON
          currency: 'RON', // Set currency to RON
          status: 'paid',
          paymentMethod: 'credit_card', // Default to credit card
          transactionId: hotelData.payment.paymentId,
          issueDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), // Due in 10 days
          paidDate: new Date(),
          notes: `Payment for listing new hotel: ${hotelData.name} (with payment processing error)`
        });
        
        await paymentRecord.save();
        console.log(`Created recovery payment record with ID ${paymentRecord._id} after error for hotel ${hotelData.name}`);
      } catch (recoveryError) {
        console.error('Error creating recovery payment record:', recoveryError);
      }
    }

    // Process photos
    if (photos && Array.isArray(photos) && photos.length > 0) {
      hotelData.photos = photos;
    } else {
      hotelData.photos = [];
    }

    console.log('Creating hotel with data:', JSON.stringify({
      name: hotelData.name,
      location: hotelData.location,
      owner: hotelData.owner,
      rooms: hotelData.rooms.map(r => ({type: r.type, price: r.price, count: r.count})),
      availability: hotelData.availability.length > 0 ? `${hotelData.availability.length} entries initialized` : 'No availability entries'
    }, null, 2));

    try {
      // Ensure room data is properly formatted
      const formattedRooms = rooms.map(room => ({
        type: String(room.type),
        capacity: Number(room.capacity),
        price: Number(room.price),
        count: Number(room.count)
      }));
      
      // Ensure availability data is properly formatted
      const formattedAvailability = availability.map(avail => ({
        date: avail.date,
        rooms: avail.rooms.map(room => ({
          type: String(room.type),
          count: Number(room.count)
        }))
      }));
      
      // Update hotel data with formatted arrays
      hotelData.rooms = formattedRooms;
      hotelData.availability = formattedAvailability;
      
      console.log('Creating hotel with formatted data');
      const hotel = await Hotel.create(hotelData);
      console.log('Hotel created successfully with ID:', hotel._id);
      
      res.status(201).json({
        success: true,
        data: hotel,
        message: 'Cazarea a fost adăugată cu succes și este activă imediat!'
      });
    } catch (createError) {
      console.error('Error creating hotel in database:', createError);
      if (createError.name === 'ValidationError') {
        const errors = Object.keys(createError.errors).map(key => `${key}: ${createError.errors[key].message}`);
        return next(new CustomError(`Validation error: ${errors.join(', ')}`, 400));
      }
      return next(new CustomError('A apărut o eroare la procesarea cererii. Vă rugăm să încercați din nou.', 500));
    }
  } catch (error) {
    console.error('Unexpected error in createUserHotel:', error);
    return next(new CustomError('A apărut o eroare la procesarea cererii. Vă rugăm să încercați din nou.', 500));
  }
});

exports.getUserHotels = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new CustomError('Nu sunteți autorizat. Vă rugăm să vă autentificați.', 401));
  }

  const hotels = await Hotel.find({ owner: req.user.id });

  res.status(200).json({
    success: true,
    count: hotels.length,
    data: hotels
  });
});

exports.processHotelPayment = asyncHandler(async (req, res, next) => {
  const { paymentMethod, hotelId } = req.body;
  
  try {
    console.log(`Processing hotel payment for user: ${req.user._id}, method: ${paymentMethod}`);
    
    // Basic validation
    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment method is required' 
      });
    }
    
    // If a hotel ID is provided, mark it as paid (for existing hotel)
    if (hotelId) {
      const hotel = await Hotel.findById(hotelId);
      
      if (!hotel) {
        return res.status(404).json({ 
          success: false,
          message: 'Hotel not found' 
        });
      }
      
      if (hotel.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this hotel'
        });
      }
      
      // Update hotel payment data
      hotel.payment = {
        verified: true,
        paymentDate: new Date(),
        paymentMethod,
        paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      };
      
      await hotel.save();
      
      // Record payment in the Payment collection
      const Payment = require('../models/Payment');
      const invoiceNumber = await Payment.generateInvoiceNumber();
      
      const paymentRecord = new Payment({
        invoiceNumber,
        user: req.user._id,
        items: [{
          description: `Listing fee for hotel: ${hotel.name}`,
          quantity: 1,
          unitPrice: 199.99, // Price in RON
          total: 199.99 // Price in RON
        }],
        subtotal: 199.99, // Price in RON
        tax: 0,
        discount: 0,
        total: 199.99, // Price in RON
        currency: 'RON', // Set currency to RON
        status: 'paid',
        paymentMethod: paymentMethod === 'card' ? 'credit_card' : paymentMethod === 'paypal' ? 'paypal' : 'bank_transfer',
        transactionId: hotel.payment.paymentId,
        issueDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), // Due in 10 days
        paidDate: new Date(),
        notes: `Payment for listing hotel: ${hotel.name}`
      });
      
      await paymentRecord.save();
      
      return res.status(200).json({ 
        success: true,
        message: 'Payment processed successfully',
        hotel: {
          id: hotel._id,
          name: hotel.name,
          payment: hotel.payment
        }
      });
    }
    
    // If no hotel ID is provided, this is a pre-approval token for a new hotel
    const paymentToken = `TOKEN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    console.log(`Generated payment token: ${paymentToken}`);
    
    return res.status(200).json({
      success: true,
      message: 'Payment pre-approved. Complete hotel creation to process payment.',
      paymentToken
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
});

exports.toggleHotelRestriction = asyncHandler(async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return next(new CustomError(`Hotel not found with id of ${req.params.id}`, 404));
    }
    hotel.isRestricted = !hotel.isRestricted;
    if (hotel.isRestricted) {
      hotel.restrictionDetails = {
        restrictedBy: req.user._id,
        restrictedAt: new Date(),
        reason: req.body.reason || 'Administrative action'
      };
    } else {
      hotel.restrictionDetails = null;
    }

    await hotel.save();

    res.status(200).json({
      success: true,
      data: hotel,
      message: `Hotel ${hotel.isRestricted ? 'restricted' : 'unrestricted'} successfully`
    });
  } catch (error) {
    console.error('Error toggling hotel restriction:', error);
    return next(new CustomError('Error updating hotel restriction status', 500));
  }
});

/**
 * @desc    Update user's own hotel
 * @route   PUT /api/hotels/user/my-hotels/:id
 * @access  Private
 */
exports.updateUserHotel = asyncHandler(async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    
    // Find the hotel by ID and check if it belongs to the current user
    let hotel = await Hotel.findById(hotelId);
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Cazarea nu a fost găsită'
      });
    }
    
    // Verify ownership
    if (hotel.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Nu aveți permisiunea să modificați această cazare'
      });
    }
    
    // Update hotel with the provided data
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Ensure we're not allowing modification of ownership
    delete updateData.owner;
    
    hotel = await Hotel.findByIdAndUpdate(hotelId, updateData, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: hotel,
      message: 'Cazarea a fost actualizată cu succes'
    });
  } catch (error) {
    console.error('Error updating user hotel:', error);
    return next(new CustomError('Eroare la actualizarea cazării. Vă rugăm să încercați din nou.', 500));
  }
});

/**
 * @desc    Delete user's own hotel
 * @route   DELETE /api/hotels/user/my-hotels/:id
 * @access  Private
 */
exports.deleteUserHotel = asyncHandler(async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    
    // Find the hotel by ID and check if it belongs to the current user
    const hotel = await Hotel.findById(hotelId);
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Cazarea nu a fost găsită'
      });
    }
    
    // Verify ownership
    if (hotel.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Nu aveți permisiunea să ștergeți această cazare'
      });
    }
    
    // Delete the hotel
    await hotel.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Cazarea a fost ștearsă cu succes'
    });
  } catch (error) {
    console.error('Error deleting user hotel:', error);
    return next(new CustomError('Eroare la ștergerea cazării. Vă rugăm să încercați din nou.', 500));
  }
});

/**
 * @desc    Încarcă imagini pentru hoteluri
 * @route   POST /api/hotels/upload-images
 * @access  Private
 */
exports.uploadHotelImages = asyncHandler(async (req, res, next) => {
  try {
    if (!req.hotelImageUrls || req.hotelImageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu s-au încărcat imagini. Vă rugăm să selectați cel puțin o imagine.'
      });
    }

    // Returnăm URL-urile imaginilor încărcate
    res.status(200).json({
      success: true,
      message: `${req.hotelImageUrls.length} imagini încărcate cu succes`,
      imageUrls: req.hotelImageUrls
    });
  } catch (error) {
    console.error('Eroare la încărcarea imaginilor pentru hotel:', error);
    return next(new CustomError('Eroare la încărcarea imaginilor. Vă rugăm să încercați din nou.', 500));
  }
}); 