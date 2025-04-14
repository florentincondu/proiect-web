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
      type: String,
      count: Number
    }]
  }],
  restrictions: {
    isRestricted: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      default: ''
    },
    restrictedDates: [{
      startDate: Date,
      endDate: Date,
      reason: String
    }]
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
      cardNumber: String, // Ultimele 4 cifre
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

hotelSchema.methods.checkAvailability = async function(startDate, endDate, guests) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const roomType = this.getRoomTypeForGuests(guests);
  if (!roomType) return false;

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const availability = this.availability.find(a => 
      a.date.toDateString() === date.toDateString()
    );

    if (availability) {
      const roomAvailability = availability.rooms.find(r => r.type === roomType);
      if (!roomAvailability || roomAvailability.count <= 0) {
        return false;
      }
    }
  }

  return true;
};

hotelSchema.methods.getRoomTypeForGuests = function(guests) {
  if (guests <= 1) return 'single';
  if (guests === 2) return 'double';
  if (guests === 3) return 'triple';
  if (guests >= 4) return 'quad';
  return null;
};

hotelSchema.methods.calculateTotalPrice = function(startDate, endDate, guests) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const roomType = this.getRoomTypeForGuests(guests);
  
  if (!roomType) return 0;

  const room = this.rooms.find(r => r.type === roomType);
  if (!room) return 0;

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return room.price * days;
};

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel; 