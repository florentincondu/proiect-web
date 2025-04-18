const mongoose = require('mongoose');


const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
});


const refundSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionId: String,
  notes: String
}, { timestamps: true });


const paymentSchema = new mongoose.Schema({

  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  items: [lineItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  

  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'voided', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer', 'cash', 'other'],
    default: 'credit_card'
  },
  transactionId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  

  cardBrand: String,
  lastFour: String,
  

  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  

  refunds: [refundSchema],
  

  notes: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });


paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ issueDate: -1 });
paymentSchema.index({ invoiceNumber: 1 });


paymentSchema.virtual('totalRefunded').get(function() {
  if (!this.refunds || this.refunds.length === 0) return 0;
  return this.refunds
    .filter(refund => refund.status === 'completed')
    .reduce((total, refund) => total + refund.amount, 0);
});


paymentSchema.virtual('isFullyRefunded').get(function() {
  return this.totalRefunded >= this.total;
});


paymentSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  

  const lastInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {

    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};


paymentSchema.methods.refund = async function(amount, reason, refundedBy, options = {}) {
  if (amount > this.total - this.totalRefunded) {
    throw new Error('Refund amount exceeds remaining payment amount');
  }
  
  const refund = {
    amount,
    reason,
    refundedBy,
    status: 'pending',
    ...options
  };
  
  this.refunds.push(refund);
  
  if (amount === this.total - this.totalRefunded) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 