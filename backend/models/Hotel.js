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
  rating: Number,
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