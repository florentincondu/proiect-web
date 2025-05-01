const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  placeId: {
    type: String,
    unique: true,
    sparse: true // Allows null values and maintains uniqueness for non-null values
  },
  description: String,
  rating: {
    type: Number,
    default: 0
  },
  photos: [String],
  price: {
    type: Number,
    required: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  amenities: [String],
  rooms: [{
    type: {
      type: String,
      enum: ['single', 'double', 'triple', 'quad'],
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    count: {
      type: Number,
      required: true
    }
  }],
  availability: [{
    date: Date,
    rooms: [{
      type: {
        type: String,
        required: true
      },
      count: {
        type: Number,
        default: 0
      }
    }]
  }],
  isRestricted: {
    type: Boolean,
    default: false
  },
  restrictionDetails: {
    restrictedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    restrictedAt: Date,
    reason: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payment: {
    isPaid: {
      type: Boolean,
      default: false
    },
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['card', 'paypal', 'bankTransfer'],
      default: 'card'
    },
    paymentId: String,
    amount: {
      type: Number,
      default: 10 // Valoarea implicită a taxei de listare (10 EUR)
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    cardDetails: {
      cardNumber: String, 
      expiryDate: String,
      cardholderName: String
    }
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'villa', 'cabin'],
    default: 'apartment'
  },
  maxGuests: {
    type: Number,
    default: 2
  },
  bedrooms: {
    type: Number,
    default: 1
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'draft', 'approved'],
    default: 'pending'
  },
  phoneNumber: String,
  houseRules: String,
  cancellationPolicy: {
    type: String,
    enum: ['flexible', 'moderate', 'strict', 'nonRefundable'],
    default: 'moderate'
  },
  checkInTime: {
    type: String,
    default: '14:00'
  },
  checkOutTime: {
    type: String,
    default: '11:00'
  },
  isHotel: {
    type: Boolean,
    default: true
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  discounts: {
    weekly: {
      type: Boolean,
      default: false
    },
    monthly: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

hotelSchema.methods.checkAvailability = async function(startDate, endDate, roomType, guests) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If no specific room type is provided, try to determine it from guests count
  if (!roomType && guests) {
    roomType = this.getRoomTypeForGuests(guests);
  }
  
  if (!roomType) return false;

  // Find the room configuration to check how many rooms of this type exist
  const roomConfig = this.rooms.find(r => r.type === roomType);
  if (!roomConfig) return false;
  
  // The total count of this room type available
  const totalRoomCount = roomConfig.count;
  if (!totalRoomCount || totalRoomCount <= 0) return false;

  // Check each day in the range
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0];
    const availability = this.availability.find(a => 
      a.date.toISOString().split('T')[0] === dateString
    );

    if (availability) {
      const roomAvailability = availability.rooms.find(r => r.type === roomType);
      if (roomAvailability) {
        // If booked count is equal to or exceeds total count, no rooms available
        if (roomAvailability.count >= totalRoomCount) {
          return false;
        }
      }
    }
  }

  return true;
};

hotelSchema.methods.getRoomTypeForGuests = function(guests) {
  // For hotels added through the system with defined room types
  if (this.rooms && this.rooms.length > 0) {
    // Find the smallest capacity room that can accommodate the guests
    const sortedRooms = [...this.rooms].sort((a, b) => a.capacity - b.capacity);
    for (const room of sortedRooms) {
      if (room.capacity >= guests) {
        return room.type;
      }
    }
    // If no room is big enough, return the largest capacity room
    return sortedRooms[sortedRooms.length - 1].type;
  }

  // Default behavior for hotels without specific room configurations
  if (guests <= 1) return 'single';
  if (guests === 2) return 'double';
  if (guests === 3) return 'triple';
  if (guests >= 4) return 'quad';
  return 'double'; // Default fallback
};

hotelSchema.methods.calculateTotalPrice = function(startDate, endDate, roomType, guests) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If no room type specified, try to determine from guests
  if (!roomType && guests) {
    roomType = this.getRoomTypeForGuests(guests);
  }
  
  if (!roomType) return 0;

  // Find the room with matching type
  const room = this.rooms.find(r => r.type === roomType);
  if (!room) return this.price; // Fallback to base hotel price

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return room.price * days;
};

// Add a new method to update availability when a booking is made
hotelSchema.methods.bookRoom = async function(startDate, endDate, roomType, guests = 1) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If room type not specified, determine from guests
  if (!roomType) {
    roomType = this.getRoomTypeForGuests(guests);
  }
  
  // Check if the room is available first
  const isAvailable = await this.checkAvailability(startDate, endDate, roomType);
  if (!isAvailable) {
    throw new Error(`No availability for room type ${roomType} in the selected date range`);
  }
  
  // Update availability for each day in the range
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0];
    
    // Find or create availability entry for this date
    let dateAvailability = this.availability.find(a => 
      a.date.toISOString().split('T')[0] === dateString
    );
    
    if (!dateAvailability) {
      // Create new availability entry for this date
      dateAvailability = { 
        date: new Date(date),
        rooms: []
      };
      this.availability.push(dateAvailability);
    }
    
    // Find or create room entry in availability
    let roomAvailability = dateAvailability.rooms.find(r => r.type === roomType);
    if (!roomAvailability) {
      roomAvailability = { type: roomType, count: 0 };
      dateAvailability.rooms.push(roomAvailability);
    }
    
    // Increment the count (booked rooms)
    roomAvailability.count += 1;
  }
  
  // Save the updated availability
  await this.save();
  return true;
};

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel; 