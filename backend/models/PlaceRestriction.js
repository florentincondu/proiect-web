const mongoose = require('mongoose');

const placeRestrictionSchema = new mongoose.Schema({
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
  isRestricted: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    default: ''
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

const PlaceRestriction = mongoose.model('PlaceRestriction', placeRestrictionSchema, 'places_restrictions');

module.exports = PlaceRestriction; 