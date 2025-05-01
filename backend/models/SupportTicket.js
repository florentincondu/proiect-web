const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin', 'system'],
    default: 'user'
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });


// Schema for contact form submissions (no authentication required)
const contactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['booking', 'payment', 'account', 'property', 'rewards', 'other'],
    default: 'other'
  },
  message: {
    type: String,
    required: true
  },
  bookingId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'reviewing', 'responded', 'closed'],
    default: 'new'
  },
  isPrivacyAgreed: {
    type: Boolean,
    required: true,
    default: false
  },
  adminResponse: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  ip: String,
  userAgent: String
}, { timestamps: true });


const supportTicketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['booking', 'payment', 'account', 'general', 'technical'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  messages: [messageSchema],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  }
}, { timestamps: true });


supportTicketSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = Date.now();
  }
  next();
});


supportTicketSchema.index({ userId: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ createdAt: -1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
const ContactSubmission = mongoose.model('ContactSubmission', contactSubmissionSchema);

module.exports = {
  SupportTicket,
  ContactSubmission
}; 