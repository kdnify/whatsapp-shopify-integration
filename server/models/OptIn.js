const mongoose = require('mongoose');

const optInSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  customerEmail: String,
  customerName: String,
  phoneNumber: {
    type: String,
    required: true
  },
  whatsappId: String, // WhatsApp ID from the message
  
  // Opt-in details
  optInSource: {
    type: String,
    enum: ['widget', 'checkout', 'manual'],
    default: 'widget'
  },
  optInTimestamp: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  
  // Message preferences
  preferences: {
    abandonedCart: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false }
  },
  
  // Tracking
  lastMessageSent: Date,
  totalMessagesReceived: { type: Number, default: 0 },
  totalMessagesClicked: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Compound index for efficient lookups
optInSchema.index({ storeId: 1, customerId: 1 }, { unique: true });
optInSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('OptIn', optInSchema); 