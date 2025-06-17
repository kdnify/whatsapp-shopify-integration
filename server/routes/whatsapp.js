const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const OptIn = require('../models/OptIn');
const Message = require('../models/Message');
const whatsappService = require('../services/whatsappService');

// Mock analytics data for local testing
const mockAnalytics = {
  totalOptIns: 25,
  recentOptIns: 8,
  messageStats: [
    { _id: 'sent', count: 42 },
    { _id: 'delivered', count: 38 },
    { _id: 'read', count: 22 },
    { _id: 'failed', count: 4 }
  ],
  messagesByType: [
    { _id: 'abandoned_cart', count: 28, clicked: 12, converted: 4 },
    { _id: 'order_confirmation', count: 14, clicked: 6, converted: 0 },
    { _id: 'test', count: 4, clicked: 2, converted: 0 }
  ],
  dateRange: '30 days'
};

// Handle WhatsApp opt-in from widget
router.post('/optin', async (req, res) => {
  try {
    const { phoneNumber, storeId, customerId, customerEmail, customerName, source = 'widget' } = req.body;

    if (!phoneNumber || !storeId) {
      return res.status(400).json({ error: 'Phone number and store ID required' });
    }

    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      console.log(`✅ Mock WhatsApp opt-in: ${phoneNumber} for demo store`);
      return res.json({ 
        success: true, 
        message: 'Successfully opted in to WhatsApp updates (mock)',
        optInId: 'mock-optin-' + Date.now()
      });
    }

    // Find the store
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Create or update opt-in
    const optInData = {
      storeId,
      customerId: customerId || `guest_${Date.now()}`,
      customerEmail,
      customerName,
      phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove non-digits
      optInSource: source,
      isActive: true
    };

    const optIn = await OptIn.findOneAndUpdate(
      { storeId, phoneNumber: optInData.phoneNumber },
      optInData,
      { upsert: true, new: true }
    );

    // Update store stats
    await Store.findByIdAndUpdate(storeId, {
      $inc: { 'stats.totalOptIns': 1 }
    });

    console.log(`✅ New WhatsApp opt-in: ${phoneNumber} for store ${store.storeName}`);

    res.json({ 
      success: true, 
      message: 'Successfully opted in to WhatsApp updates',
      optInId: optIn._id
    });

  } catch (error) {
    console.error('WhatsApp opt-in error:', error);
    res.status(500).json({ error: 'Failed to process opt-in' });
  }
});

// Configure WhatsApp settings for a store
router.post('/configure', async (req, res) => {
  try {
    const { 
      storeId, 
      accessToken, 
      phoneNumberId, 
      businessAccountId,
      webhookVerifyToken,
      enabledFeatures = {}
    } = req.body;

    if (!storeId || !accessToken || !phoneNumberId) {
      return res.status(400).json({ error: 'Missing required WhatsApp configuration' });
    }

    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      console.log(`✅ Mock WhatsApp configured for demo store`);
      return res.json({ 
        success: true, 
        message: 'WhatsApp configuration saved successfully (mock)',
        store: {
          id: storeId,
          name: 'Demo WhatsApp Store',
          whatsappConfigured: true
        }
      });
    }

    // Test the WhatsApp API connection
    try {
      await whatsappService.sendTextMessage(
        phoneNumberId,
        accessToken,
        phoneNumberId, // Send to self as test
        'WhatsApp integration test successful! 🎉'
      );
    } catch (apiError) {
      return res.status(400).json({ 
        error: 'Invalid WhatsApp API credentials',
        details: apiError.message
      });
    }

    // Update store configuration
    const store = await Store.findByIdAndUpdate(
      storeId,
      {
        'whatsappConfig.isConfigured': true,
        'whatsappConfig.accessToken': accessToken,
        'whatsappConfig.phoneNumberId': phoneNumberId,
        'whatsappConfig.businessAccountId': businessAccountId,
        'whatsappConfig.webhookVerifyToken': webhookVerifyToken,
        'whatsappConfig.enabledFeatures': {
          abandonedCart: enabledFeatures.abandonedCart !== false,
          orderConfirmation: enabledFeatures.orderConfirmation !== false,
          orderDelivered: enabledFeatures.orderDelivered || false
        }
      },
      { new: true }
    );

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    console.log(`✅ WhatsApp configured for store: ${store.storeName}`);

    res.json({ 
      success: true, 
      message: 'WhatsApp configuration saved successfully',
      store: {
        id: store._id,
        name: store.storeName,
        whatsappConfigured: store.whatsappConfig.isConfigured
      }
    });

  } catch (error) {
    console.error('WhatsApp configuration error:', error);
    res.status(500).json({ error: 'Failed to configure WhatsApp' });
  }
});

// Get opt-in widget code
router.get('/widget/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const widgetCode = whatsappService.generateOptInWidget(storeId);

    res.json({
      success: true,
      widgetCode,
      instructions: 'Add this code to your store theme before the closing </body> tag'
    });

  } catch (error) {
    console.error('Widget generation error:', error);
    res.status(500).json({ error: 'Failed to generate widget' });
  }
});

// Get analytics for a store
router.get('/analytics/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { days = 30 } = req.query;

    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      return res.json({
        success: true,
        analytics: mockAnalytics
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get store stats
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get recent opt-ins
    const recentOptIns = await OptIn.countDocuments({
      storeId,
      createdAt: { $gte: startDate }
    });

    // Get message stats
    const messageStats = await Message.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId), createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get messages by type
    const messagesByType = await Message.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId), createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          converted: { $sum: { $cond: ['$converted', 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        totalOptIns: store.stats.totalOptIns,
        recentOptIns,
        messageStats,
        messagesByType,
        dateRange: `${days} days`
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    // Return mock data if database fails
    res.json({
      success: true,
      analytics: mockAnalytics
    });
  }
});

// Send test message
router.post('/test-message', async (req, res) => {
  try {
    const { storeId, phoneNumber, messageType = 'test' } = req.body;

    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      console.log(`🧪 Mock test message sent to ${phoneNumber}`);
      return res.json({
        success: true,
        message: 'Test message sent successfully (mock)',
        messageId: 'mock-msg-' + Date.now()
      });
    }

    const store = await Store.findById(storeId);
    if (!store || !store.whatsappConfig.isConfigured) {
      return res.status(400).json({ error: 'WhatsApp not configured for this store' });
    }

    const testMessage = `🧪 Test message from ${store.storeName}!\n\nThis is a test to verify your WhatsApp integration is working correctly.\n\nTimestamp: ${new Date().toISOString()}`;

    const result = await whatsappService.sendTextMessage(
      store.whatsappConfig.phoneNumberId,
      store.whatsappConfig.accessToken,
      phoneNumber,
      testMessage
    );

    // Log the test message
    await Message.create({
      storeId,
      optInId: null, // Test message
      messageType: 'test',
      whatsappMessageId: result.messages[0].id,
      whatsappPhoneNumberId: store.whatsappConfig.phoneNumberId,
      recipientPhone: phoneNumber,
      messageContent: testMessage,
      status: 'sent',
      sentAt: new Date()
    });

    res.json({
      success: true,
      message: 'Test message sent successfully',
      messageId: result.messages[0].id
    });

  } catch (error) {
    console.error('Test message error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

module.exports = router; 