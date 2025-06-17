const express = require('express');
const router = express.Router();
const Store = require('../models/Store');

// Mock store for local testing (when MongoDB isn't connected)
const mockStore = {
  _id: 'mock-store-123',
  shopDomain: 'demo-store.myshopify.com',
  storeName: 'Demo WhatsApp Store',
  email: 'demo@store.com',
  currency: 'USD',
  timezone: 'America/New_York',
  isActive: true,
  plan: 'free',
  whatsappConfigured: true,
  enabledFeatures: {
    abandonedCart: true,
    orderConfirmation: true,
    orderDelivered: false
  },
  stats: {
    totalOptIns: 12,
    messagesDelivered: 45,
    messagesClicked: 8,
    conversions: 3
  },
  createdAt: new Date()
};

// Mock dashboard data
const mockDashboard = {
  store: {
    name: 'Demo WhatsApp Store',
    domain: 'demo-store.myshopify.com',
    plan: 'free',
    whatsappConfigured: true
  },
  stats: {
    totalOptIns: 12,
    recentOptIns: 3,
    totalMessages: 45,
    recentMessages: 8,
    clickRate: '17.8',
    conversionRate: '6.7'
  },
  messagesByStatus: {
    sent: 35,
    delivered: 30,
    read: 15,
    failed: 2
  },
  enabledFeatures: {
    abandonedCart: true,
    orderConfirmation: true,
    orderDelivered: false
  }
};

// Get store details
router.get('/:storeId', async (req, res) => {
  try {
    // Try database first, fall back to mock for local testing
    if (req.params.storeId === 'mock-store-123') {
      return res.json({ success: true, store: mockStore });
    }

    const store = await Store.findById(req.params.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Don't expose sensitive tokens in response
    const storeData = {
      id: store._id,
      shopDomain: store.shopDomain,
      storeName: store.storeName,
      email: store.email,
      currency: store.currency,
      timezone: store.timezone,
      isActive: store.isActive,
      plan: store.plan,
      whatsappConfigured: store.whatsappConfig.isConfigured,
      enabledFeatures: store.whatsappConfig.enabledFeatures,
      stats: store.stats,
      createdAt: store.createdAt
    };

    res.json({ success: true, store: storeData });
  } catch (error) {
    console.error('Get store error:', error);
    // If MongoDB is not connected, return mock data
    res.json({ success: true, store: mockStore });
  }
});

// Update store settings
router.patch('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { enabledFeatures, plan } = req.body;

    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      return res.json({ 
        success: true, 
        message: 'Store settings updated (mock)',
        store: {
          id: storeId,
          plan: plan || 'free',
          enabledFeatures: enabledFeatures || mockStore.enabledFeatures
        }
      });
    }

    const updateData = {};
    
    if (enabledFeatures) {
      updateData['whatsappConfig.enabledFeatures'] = enabledFeatures;
    }
    
    if (plan && ['free', 'basic', 'pro'].includes(plan)) {
      updateData.plan = plan;
    }

    const store = await Store.findByIdAndUpdate(storeId, updateData, { new: true });
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ 
      success: true, 
      message: 'Store settings updated',
      store: {
        id: store._id,
        plan: store.plan,
        enabledFeatures: store.whatsappConfig.enabledFeatures
      }
    });

  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Failed to update store settings' });
  }
});

// Get store dashboard data
router.get('/:storeId/dashboard', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Mock response for local testing
    if (storeId === 'mock-store-123') {
      return res.json({ success: true, dashboard: mockDashboard });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get recent stats for dashboard
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const OptIn = require('../models/OptIn');
    const Message = require('../models/Message');

    const [recentOptIns, recentMessages, messagesByStatus] = await Promise.all([
      OptIn.countDocuments({ storeId, createdAt: { $gte: thirtyDaysAgo } }),
      Message.countDocuments({ storeId, createdAt: { $gte: thirtyDaysAgo } }),
      Message.aggregate([
        { $match: { storeId: require('mongoose').Types.ObjectId(storeId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const dashboardData = {
      store: {
        name: store.storeName,
        domain: store.shopDomain,
        plan: store.plan,
        whatsappConfigured: store.whatsappConfig.isConfigured
      },
      stats: {
        totalOptIns: store.stats.totalOptIns,
        recentOptIns,
        totalMessages: store.stats.messagesDelivered,
        recentMessages,
        clickRate: store.stats.messagesClicked > 0 ? 
          ((store.stats.messagesClicked / store.stats.messagesDelivered) * 100).toFixed(1) : 0,
        conversionRate: store.stats.conversions > 0 ? 
          ((store.stats.conversions / store.stats.messagesDelivered) * 100).toFixed(1) : 0
      },
      messagesByStatus: messagesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      enabledFeatures: store.whatsappConfig.enabledFeatures
    };

    res.json({ success: true, dashboard: dashboardData });

  } catch (error) {
    console.error('Dashboard data error:', error);
    // Return mock data if database fails
    res.json({ success: true, dashboard: mockDashboard });
  }
});

module.exports = router; 