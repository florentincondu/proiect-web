const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  module: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ip: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Static method to log information
systemLogSchema.statics.logInfo = async function(message, module, metadata = {}) {
  return this.create({
    action: 'System Info',
    message,
    level: 'info',
    module,
    metadata
  });
};

// Static method to log warnings
systemLogSchema.statics.logWarning = async function(message, module, metadata = {}) {
  return this.create({
    action: 'System Warning',
    message,
    level: 'warning',
    module,
    metadata
  });
};

// Static method to log errors
systemLogSchema.statics.logError = async function(message, module, metadata = {}) {
  return this.create({
    action: 'System Error',
    message,
    level: 'error',
    module,
    metadata
  });
};

// Create index for timestamp to optimize sorting
systemLogSchema.index({ timestamp: -1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = SystemLog; 