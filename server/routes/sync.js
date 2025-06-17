const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const router = express.Router();

// Generic data sync endpoint
router.post('/trigger', async (req, res) => {
  const { platform, action, data } = req.body;
  
  try {
    let result;
    
    switch (platform) {
      case 'shopify':
        result = await handleShopifySync(action, data);
        break;
      case 'amazon':
        result = await handleAmazonSync(action, data);
        break;
      case 'tiktok':
        result = await handleTikTokSync(action, data);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Shopify sync functions
async function handleShopifySync(action, data) {
  const { shop, accessToken } = data;
  const baseUrl = `https://${shop}.myshopify.com/admin/api/2023-10`;
  
  switch (action) {
    case 'get_orders':
      const ordersResponse = await axios.get(`${baseUrl}/orders.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
      return ordersResponse.data.orders;
      
    case 'get_products':
      const productsResponse = await axios.get(`${baseUrl}/products.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
      return productsResponse.data.products;
      
    case 'update_inventory':
      // TODO: Implement inventory updates
      return { message: 'Inventory update placeholder' };
      
    default:
      throw new Error(`Unsupported Shopify action: ${action}`);
  }
}

// Amazon sync functions
async function handleAmazonSync(action, data) {
  // TODO: Implement Amazon SP-API calls
  switch (action) {
    case 'get_orders':
      return { message: 'Amazon orders placeholder' };
    case 'get_inventory':
      return { message: 'Amazon inventory placeholder' };
    default:
      throw new Error(`Unsupported Amazon action: ${action}`);
  }
}

// TikTok Shop sync functions
async function handleTikTokSync(action, data) {
  // TODO: Implement TikTok Shop API calls
  switch (action) {
    case 'get_orders':
      return { message: 'TikTok orders placeholder' };
    default:
      throw new Error(`Unsupported TikTok action: ${action}`);
  }
}

// Data transformation utilities
router.post('/transform', (req, res) => {
  const { source, target, data } = req.body;
  
  try {
    const transformed = transformData(source, target, data);
    res.json({ transformed });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function transformData(source, target, data) {
  // Universal data transformer for different platform formats
  const transformMap = {
    'shopify_to_standard': (data) => ({
      id: data.id,
      order_number: data.order_number,
      total: data.total_price,
      customer: data.customer ? data.customer.email : null,
      created_at: data.created_at,
      items: data.line_items?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    }),
    'amazon_to_standard': (data) => ({
      // TODO: Amazon order transformation
    }),
    'standard_to_analytics': (data) => ({
      revenue: parseFloat(data.total),
      order_count: 1,
      customer_email: data.customer,
      date: new Date(data.created_at).toISOString().split('T')[0]
    })
  };

  const transformer = transformMap[`${source}_to_${target}`];
  if (!transformer) {
    throw new Error(`No transformer found for ${source} to ${target}`);
  }

  return Array.isArray(data) ? data.map(transformer) : transformer(data);
}

// Scheduled sync jobs (can be configured per customer)
router.post('/schedule', (req, res) => {
  const { cronExpression, platform, action, config } = req.body;
  
  // TODO: Store scheduled job in database
  console.log(`Scheduled sync: ${cronExpression} for ${platform}/${action}`);
  
  // Example: Run every hour
  // cron.schedule('0 * * * *', () => {
  //   handleShopifySync(action, config);
  // });
  
  res.json({ scheduled: true, expression: cronExpression });
});

module.exports = router; 