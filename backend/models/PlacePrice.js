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

const PlacePrice = mongoose.model('PlacePrice', placePriceSchema, 'places_prices');

module.exports = PlacePrice; 