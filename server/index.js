require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for Shopify iframe compatibility
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      // Add Shopify admin origins
      /\.myshopify\.com$/,
      /\.shopify\.com$/
    ].filter(Boolean);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return origin === allowed;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB connection error:', err));
} else {
  console.log('⚠️ MongoDB not configured - using mock data');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/payments', require('./routes/payments'));

// Shopify webhook for abandoned checkout
app.post('/webhooks/shopify/checkout/abandoned', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('🛒 Shopify abandoned checkout webhook received');
  
  try {
    const checkoutData = JSON.parse(req.body.toString());
    
    // Import here to avoid circular dependency issues
    const { handleAbandonedCheckout } = require('./controllers/webhookController');
    await handleAbandonedCheckout(checkoutData);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing abandoned checkout:', error);
    res.status(500).send('Error');
  }
});

// Shopify webhook for order creation
app.post('/webhooks/shopify/orders/create', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('📦 Shopify order created webhook received');
  
  try {
    const orderData = JSON.parse(req.body.toString());
    
    // Import here to avoid circular dependency issues
    const { handleOrderCreated } = require('./controllers/webhookController');
    await handleOrderCreated(orderData);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing order creation:', error);
    res.status(500).send('Error');
  }
});

// WhatsApp webhook endpoint
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

app.post('/webhooks/whatsapp', express.json(), (req, res) => {
  console.log('📱 WhatsApp webhook received:', JSON.stringify(req.body, null, 2));
  
  // Handle WhatsApp webhook data here
  // Update message status, handle replies, etc.
  
  res.status(200).send('OK');
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or webhooks
    if (req.path.startsWith('/api/') || req.path.startsWith('/webhooks/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
} else {
  // Development mode - just show API info
  app.get('/', (req, res) => {
    res.json({
      message: 'WhatsApp Shopify Integration API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth/shopify?shop=yourstore.myshopify.com',
        stores: '/api/stores/:storeId',
        whatsapp: '/api/whatsapp/*'
      }
    });
  });
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 App URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
}); 