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
  const hotels = await Hotel.find();
  
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
  const hotel = await Hotel.create(req.body);
  
  res.status(201).json({
    success: true,
    data: hotel
  });
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
    // Import the PlacePrice model
    let PlacePrice;
    try {
      const modelPath = path.join(__dirname, '..', 'models', 'PlacePrice.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlacePrice model file does not exist at path:', modelPath);
        // Create PlacePrice schema on the fly if it doesn't exist
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
    
    // Update both Hotel and PlacePrice models
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

// Search hotels by query
exports.searchHotels = asyncHandler(async (req, res, next) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  // Search by hotel name, location, or description using regex for partial matches
  const hotels = await Hotel.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { location: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  });
  
  res.status(200).json({
    success: true,
    count: hotels.length,
    data: hotels
  });
});

// Update room prices
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
  
  // Update each room's price
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