const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['booking', 'revenue', 'user', 'location'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Compound index for efficient querying
analyticsSchema.index({ type: 1, date: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 