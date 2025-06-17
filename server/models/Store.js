const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  shopifyStoreId: {
    type: String,
    required: true
  },
  storeName: String,
  email: String,
  currency: String,
  timezone: String,
  
  // WhatsApp Configuration
  whatsappConfig: {
    isConfigured: { type: Boolean, default: false },
    accessToken: String,
    phoneNumberId: String,
    businessAccountId: String,
    webhookVerifyToken: String,
    enabledFeatures: {
      abandonedCart: { type: Boolean, default: true },
      orderConfirmation: { type: Boolean, default: true },
      orderDelivered: { type: Boolean, default: false }
    }
  },
  
  // App Configuration
  isActive: { type: Boolean, default: true },
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  
  // Analytics
  stats: {
    totalOptIns: { type: Number, default: 0 },
    messagesDelivered: { type: Number, default: 0 },
    messagesClicked: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Store', storeSchema); 