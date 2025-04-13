const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['client', 'admin', 'host', 'guest'],
    default: 'client'
  },
  adminRequested: {
    type: Boolean,
    default: false
  },
  adminVerified: {
    type: Boolean,
    default: false
  },
  adminApproved: {
    type: Boolean,
    default: false
  },
  adminVerificationToken: String,
  adminVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  phone: {
    type: String
  },
  address: {
    type: String
  },
  profileImage: {
    type: String
  },
  coverImage: {
    type: String
  },
  // User activity tracking
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  // Activity history
  activityLogs: [{
    action: String,  // login, booking, review, etc.
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  bePartOfUs: {
    type: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    description: {
      free: {
        type: String,
        default: 'Client basic access - Book properties'
      },
      pro: {
        type: String,
        default: 'Host with admin approval - List your properties'
      },
      premium: {
        type: String,
        default: 'Premium host features - Fast approvals and advanced statistics'
      }
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    features: {
      searchAndBook: {
        type: Boolean,
        default: true
      },
      favorites: {
        type: Boolean,
        default: true
      },
      standardNotifications: {
        type: Boolean,
        default: true
      },
      
      addProperties: {
        type: Boolean,
        default: false
      },
      manageProperties: {
        type: Boolean,
        default: false
      },
      basicStatistics: {
        type: Boolean,
        default: false
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      optimizationTips: {
        type: Boolean,
        default: false
      },
      
      fastApproval: {
        type: Boolean,
        default: false
      },
      promotedListings: {
        type: Boolean,
        default: false
      },
      advancedStatistics: {
        type: Boolean,
        default: false
      },
      customBranding: {
        type: Boolean,
        default: false
      },
      directBookings: {
        type: Boolean,
        default: false
      },
      loyaltyProgram: {
        type: Boolean,
        default: false
      }
    }
  },
  favorites: [{
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  properties: [{
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    views: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  }],
  companyName: {
    type: String
  },
  companyAddress: {
    type: String
  },
  companyPhone: {
    type: String
  },
  companyEmail: {
    type: String
  },
  companyDescription: {
    type: String
  },
  companyLogo: {
    type: String
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      marketing: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      enum: ['en', 'es', 'fr', 'de', 'it'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  statistics: {
    totalLogins: {
      type: Number,
      default: 0
    },
    daysActive: {
      type: Number,
      default: 0
    },
    completedActions: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    propertyViews: {
      type: Number,
      default: 0
    },
    propertyBookings: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    occupancyRate: {
      type: Number,
      default: 0
    }
  },
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    sessions: [{
      device: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet']
      },
      browser: String,
      location: String,
      lastActive: Date,
      current: {
        type: Boolean,
        default: false
      }
    }]
  },
  badges: [{
    name: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  recentActivity: [{
    type: {
      type: String,
      enum: ['login', 'update', 'subscription', 'property_add', 'property_edit', 'booking', 'favorite', 'other']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to automatically set the name field before validation
userSchema.pre('validate', function(next) {
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  next();
});

// Middleware for password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    // Use a consistent salt round value
    const saltRounds = 10;
    console.log('[User Model] Hashing password for user:', this.email);
    
    // Generate a salt
    const salt = await bcrypt.genSalt(saltRounds);
    
    // Hash the password with the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    
    console.log('[User Model] Password hashed successfully');
    next();
  } catch (error) {
    console.error('[User Model] Error hashing password:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log('[User Model] Comparing passwords for user:', this.email);
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('[User Model] Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('[User Model] Error comparing passwords:', error);
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;