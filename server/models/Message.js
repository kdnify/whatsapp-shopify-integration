const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  optInId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OptIn',
    required: true
  },
  
  // Message details
  messageType: {
    type: String,
    enum: ['abandoned_cart', 'order_confirmation', 'order_shipped', 'order_delivered', 'promotion'],
    required: true
  },
  
  // WhatsApp API details
  whatsappMessageId: String,
  whatsappPhoneNumberId: String,
  recipientPhone: String,
  
  // Message content
  templateName: String,
  messageContent: String,
  
  // Related Shopify data
  shopifyOrderId: String,
  shopifyCartId: String,
  orderValue: Number,
  currency: String,
  
  // Delivery tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  failureReason: String,
  
  // Engagement tracking
  clicked: { type: Boolean, default: false },
  clickedAt: Date,
  clickedUrl: String,
  
  // Conversion tracking
  converted: { type: Boolean, default: false },
  convertedAt: Date,
  conversionValue: Number
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ storeId: 1, createdAt: -1 });
messageSchema.index({ whatsappMessageId: 1 });
messageSchema.index({ shopifyOrderId: 1 });
messageSchema.index({ messageType: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema); 