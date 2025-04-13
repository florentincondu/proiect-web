const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  group: {
    type: String,
    enum: ['general', 'authentication', 'preferences', 'integrations', 'notifications', 'payments', 'system'],
    default: 'general'
  },
  description: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Static methods for common operations
settingSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

settingSchema.statics.setSetting = async function(key, value, options = {}) {
  const { group = 'general', description = '', isPublic = false, lastUpdatedBy = null } = options;
  
  return this.findOneAndUpdate(
    { key }, 
    { 
      key, 
      value, 
      group, 
      description, 
      isPublic, 
      lastUpdatedBy 
    }, 
    { upsert: true, new: true }
  );
};

settingSchema.statics.getSettingsByGroup = async function(group) {
  return this.find({ group });
};

settingSchema.statics.getPublicSettings = async function() {
  return this.find({ isPublic: true });
};

// Method to get all settings (admin only)
settingSchema.statics.getAllSettings = async function() {
  const settings = await this.find();
  return settings.reduce((acc, setting) => {
    if (!acc[setting.group]) {
      acc[setting.group] = {};
    }
    acc[setting.group][setting.key] = setting.value;
    return acc;
  }, {});
};

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting; 