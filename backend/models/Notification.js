const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['booking', 'support', 'system', 'contact'],
      default: 'system'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['Booking', 'SupportTicket', 'ContactSubmission']
    },
    data: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { 
    timestamps: true 
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create({
      userId: data.userId,
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      read: false,
      referenceId: data.referenceId,
      referenceModel: data.referenceModel
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 