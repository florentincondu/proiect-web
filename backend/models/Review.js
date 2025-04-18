const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hotelId: {
      type: String,
      required: true,
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    photos: [String],
    reactions: {
      likes: {
        count: { type: Number, default: 0 },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      },
      hearts: {
        count: { type: Number, default: 0 },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reply: {
      content: String,
      date: Date,
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    isVerifiedStay: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);


reviewSchema.pre('save', async function(next) {
  if (this.bookingId) {
    try {
      const Booking = mongoose.model('Booking');
      const booking = await Booking.findById(this.bookingId);
      
      if (booking && booking.status === 'completed') {
        this.isVerifiedStay = true;
      }
    } catch (error) {
      console.error('Error checking verified stay status:', error);
    }
  }
  

  if (!this.comments) {
    console.log('Initializing empty comments array');
    this.comments = [];
  }
  
  if (!this.reactions) {
    console.log('Initializing empty reactions object');
    this.reactions = {
      likes: { count: 0, users: [] },
      hearts: { count: 0, users: [] }
    };
  } else {

    if (!this.reactions.likes) {
      this.reactions.likes = { count: 0, users: [] };
    }
    if (!this.reactions.hearts) {
      this.reactions.hearts = { count: 0, users: [] };
    }
  }
  
  next();
});


reviewSchema.post('find', function(docs) {
  if (!docs) return;
  
  docs.forEach(doc => {
    if (!doc.comments) {
      doc.comments = [];
    }
    
    if (!doc.reactions) {
      doc.reactions = {
        likes: { count: 0, users: [] },
        hearts: { count: 0, users: [] }
      };
    } else {

      if (!doc.reactions.likes) {
        doc.reactions.likes = { count: 0, users: [] };
      }
      if (!doc.reactions.hearts) {
        doc.reactions.hearts = { count: 0, users: [] };
      }
    }
  });
});

reviewSchema.post('findOne', function(doc) {
  if (!doc) return;
  
  if (!doc.comments) {
    doc.comments = [];
  }
  
  if (!doc.reactions) {
    doc.reactions = {
      likes: { count: 0, users: [] },
      hearts: { count: 0, users: [] }
    };
  } else {

    if (!doc.reactions.likes) {
      doc.reactions.likes = { count: 0, users: [] };
    }
    if (!doc.reactions.hearts) {
      doc.reactions.hearts = { count: 0, users: [] };
    }
  }
});


reviewSchema.statics.getAverageRating = async function(hotelId) {
  try {
    console.log('Calculating average rating for hotelId:', hotelId);
    

    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('Review model exists:', !!mongoose.models.Review);
    
    const result = await this.aggregate([
      {
        $match: { hotelId: hotelId, status: 'approved' }
      },
      {
        $group: {
          _id: '$hotelId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Average rating result:', result);
    
    return result.length > 0 
      ? { 
          averageRating: parseFloat(result[0].averageRating.toFixed(1)), 
          reviewCount: result[0].reviewCount 
        } 
      : { averageRating: 0, reviewCount: 0 };
  } catch (error) {
    console.error('Error calculating average rating:', error);
    return { averageRating: 0, reviewCount: 0 };
  }
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 