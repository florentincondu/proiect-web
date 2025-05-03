const mongoose = require('mongoose');

const paymentStatSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  successfulPayments: {
    type: Number,
    default: 0
  },
  pendingPayments: {
    type: Number,
    default: 0
  },
  refundCount: {
    type: Number,
    default: 0
  },
  paymentCounts: {
    type: Map,
    of: Number,
    default: () => new Map([
      ['paid', 0],
      ['pending', 0],
      ['failed', 0],
      ['refunded', 0],
      ['partially_refunded', 0],
      ['cancelled', 0]
    ])
  },
  paymentMethodCounts: {
    type: Map,
    of: Number,
    default: () => new Map([
      ['credit_card', 0],
      ['paypal', 0],
      ['bank_transfer', 0],
      ['cash', 0],
      ['other', 0]
    ])
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for year and month to ensure uniqueness
paymentStatSchema.index({ year: 1, month: 1 }, { unique: true });

const PaymentStat = mongoose.model('PaymentStat', paymentStatSchema);

module.exports = PaymentStat; 