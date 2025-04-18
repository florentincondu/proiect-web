const Hotel = require('../models/Hotel');
const CustomError = require('../utils/CustomError');
const asyncHandler = require('../middleware/asyncHandler');
const path = require('path');
const fs = require('fs');

exports.checkAvailability = async (req, res) => {
  try {
    const { hotelId, startDate, endDate, guests } = req.body;
    
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }

    const isAvailable = await hotel.checkAvailability(startDate, endDate, guests);
    const totalPrice = hotel.calculateTotalPrice(startDate, endDate, guests);

    res.json({
      available: isAvailable,
      totalPrice,
      roomType: hotel.getRoomTypeForGuests(guests)
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
    const hotelData = {
      ...req.body,
      owner: req.user._id, // Always set owner to current user
      status: 'active',    // Set default status
      rooms: req.body.rooms || [  // Set default rooms if not provided
        {
          type: 'single',
          capacity: 1,
          price: Math.round(req.body.price * 0.7),
          count: 2
        },
        {
          type: 'double',
          capacity: 2,
          price: req.body.price,
          count: 3
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

    console.log('Creating new hotel with data:', JSON.stringify(hotelData, null, 2));
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
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }
  const searchQuery = {
    $and: [
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  };
  if (!req.user?.isAdmin) {
    searchQuery.$and.push({ isRestricted: { $ne: true } });
  }

  const hotels = await Hotel.find(searchQuery);
  
  res.status(200).json({
    success: true,
    count: hotels.length,
    data: hotels
  });
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
  const {
    title, description, propertyType, maxGuests, bedrooms, bathrooms,
    amenities, address, price, currency, phoneNumber, houseRules,
    cancellationPolicy, coordinates, photos, checkInTime, checkOutTime,
    payment, weeklyDiscount, monthlyDiscount, status, isHotel, rating, reviews
  } = req.body;


  if (!req.user) {
    return next(new CustomError('Nu sunteți autorizat să adăugați cazări. Vă rugăm să vă autentificați.', 401));
  }


  if (!title || !description || !address || !price) {
    return next(new CustomError('Vă rugăm să completați toate câmpurile obligatorii', 400));
  }

  try {

    const hotelData = {
      name: title,
      location: address,
      description,
      price: parseFloat(price),
      propertyType,
      maxGuests: parseInt(maxGuests) || 2,
      bedrooms: parseInt(bedrooms) || 1,
      bathrooms: parseInt(bathrooms) || 1,
      phoneNumber,
      houseRules,
      cancellationPolicy,
      checkInTime,
      checkOutTime,
      owner: req.user.id,
      coordinates: coordinates || {},
      status: status || 'pending', // Inițial, cazarea va fi în stare "pending" până când este aprobată de admin
      amenities: [],
      isHotel: isHotel || true,
      rating: rating || 0,
      reviews: reviews || [],
      discounts: {
        weekly: weeklyDiscount || false,
        monthly: monthlyDiscount || false
      }
    };


    if (amenities) {

      const amenitiesArray = [];
      for (const [key, value] of Object.entries(amenities)) {
        if (value === true) amenitiesArray.push(key);
      }
      hotelData.amenities = amenitiesArray;
    }


    hotelData.rooms = [
      {
        type: 'single',
        capacity: 1,
        price: Math.round(parseFloat(price) * 0.7),
        count: 2
      },
      {
        type: 'double',
        capacity: 2,
        price: parseFloat(price),
        count: 3
      },
      {
        type: 'triple',
        capacity: 3,
        price: Math.round(parseFloat(price) * 1.3),
        count: 1
      },
      {
        type: 'quad',
        capacity: 4,
        price: Math.round(parseFloat(price) * 1.6),
        count: 1
      }
    ];


    if (payment) {
      hotelData.payment = {
        isPaid: true,
        paymentDate: new Date(),
        paymentMethod: payment.paymentMethod,
        paymentId: payment.paymentToken || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        amount: 10, // Taxa standard de 10 EUR pentru listare
        currency: 'EUR'
      };


      if (payment.cardDetails) {
        hotelData.payment.cardDetails = {

          cardNumber: payment.cardDetails.cardNumber.slice(-4),
          expiryDate: payment.cardDetails.expiryDate,
          cardholderName: payment.cardDetails.cardholderName
        };
      }
    } else {
      hotelData.payment = {
        isPaid: true,
        paymentDate: new Date(),
        paymentMethod: 'card',
        paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        amount: 10,
        currency: 'EUR'
      };
    }


    if (photos && photos.length > 0) {


      hotelData.photos = photos;
    }


    const hotel = await Hotel.create(hotelData);





    res.status(201).json({
      success: true,
      data: hotel,
      message: 'Cazarea a fost adăugată cu succes și este în așteptare pentru aprobare.'
    });
  } catch (error) {
    console.error('Eroare la crearea cazării:', error);
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

  if (!req.user) {
    return next(new CustomError('Nu sunteți autorizat. Vă rugăm să vă autentificați.', 401));
  }

  if (!paymentMethod) {
    return next(new CustomError('Metoda de plată este obligatorie', 400));
  }

  try {
    let hotel;

    if (hotelId) {

      hotel = await Hotel.findById(hotelId);

      if (!hotel) {
        return next(new CustomError('Cazarea nu a fost găsită', 404));
      }

      if (hotel.owner.toString() !== req.user.id) {
        return next(new CustomError('Nu sunteți autorizat să actualizați această cazare', 401));
      }

      hotel.payment = {
        isPaid: true,
        paymentDate: new Date(),
        paymentMethod,
        paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        amount: 10,
        currency: 'EUR'
      };

      hotel.status = 'pending';
      await hotel.save();
    } else {


      const paymentToken = `TOKEN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      



      return res.status(200).json({
        success: true,
        message: 'Plata a fost procesată cu succes',
        paymentToken
      });
    }

    res.status(200).json({
      success: true,
      message: 'Plata a fost procesată cu succes',
      data: hotel
    });
  } catch (error) {
    console.error('Eroare la procesarea plății:', error);
    return next(new CustomError('A apărut o eroare la procesarea plății. Vă rugăm să încercați din nou.', 500));
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