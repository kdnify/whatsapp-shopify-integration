const express = require('express');
const axios = require('axios');
const Store = require('../models/Store');
const router = express.Router();

// Shopify OAuth
router.get('/shopify', (req, res) => {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter required' });
  }

  // Updated scopes for WhatsApp integration
  const scopes = 'read_orders,read_products,read_customers,write_orders,read_checkouts,write_script_tags';
  const redirectUri = `${process.env.APP_URL}/api/auth/shopify/callback`;
  const apiKey = process.env.SHOPIFY_API_KEY;
  
  const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?` +
    `client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${shop}`;
  
  res.redirect(authUrl);
});

router.get('/shopify/callback', async (req, res) => {
  const { code, state: shop } = req.query;
  
  try {
    // Exchange code for access token
    const response = await axios.post(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    });

    const { access_token } = response.data;
    
    // Get shop details
    const shopResponse = await axios.get(`https://${shop}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token }
    });

    const shopData = shopResponse.data.shop;

    // Create or update store record
    const storeData = {
      shopDomain: shop,
      accessToken: access_token,
      shopifyStoreId: shopData.id.toString(),
      storeName: shopData.name,
      email: shopData.email,
      currency: shopData.currency,
      timezone: shopData.iana_timezone,
      isActive: true
    };

    const store = await Store.findOneAndUpdate(
      { shopDomain: shop },
      storeData,
      { upsert: true, new: true }
    );

    // Install webhooks for abandoned checkout and order creation
    await installWebhooks(shop, access_token);

    console.log(`✅ Shopify store connected: ${shopData.name} (${shop})`);
    
    // Redirect to the React app with store ID
    res.redirect(`${process.env.FRONTEND_URL}?shop=${shop}&storeId=${store._id}`);

  } catch (error) {
    console.error('Shopify OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/error?message=shopify_auth_failed`);
  }
});

// Install necessary webhooks
async function installWebhooks(shop, accessToken) {
  const webhooks = [
    {
      topic: 'checkouts/abandon',
      address: `${process.env.APP_URL}/webhooks/shopify/checkout/abandoned`,
      format: 'json'
    },
    {
      topic: 'orders/create',
      address: `${process.env.APP_URL}/webhooks/shopify/orders/create`,
      format: 'json'
    }
  ];

  for (const webhook of webhooks) {
    try {
      await axios.post(
        `https://${shop}.myshopify.com/admin/api/2023-10/webhooks.json`,
        { webhook },
        { headers: { 'X-Shopify-Access-Token': accessToken } }
      );
      console.log(`✅ Webhook installed: ${webhook.topic}`);
    } catch (error) {
      console.error(`❌ Failed to install webhook ${webhook.topic}:`, error.response?.data);
    }
  }
}

// Verify webhook signature (for production)
function verifyWebhook(data, hmacHeader) {
  const crypto = require('crypto');
  const body = JSON.stringify(data);
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

// Amazon SP-API OAuth placeholder
router.get('/amazon', (req, res) => {
  // Amazon requires LWA (Login with Amazon)
  const clientId = process.env.AMAZON_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/auth/amazon/callback`;
  const scope = 'sellingpartnerapi::notifications';
  
  const authUrl = `https://sellercentral.amazon.com/apps/authorize/consent?` +
    `application_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  res.redirect(authUrl);
});

router.get('/amazon/callback', async (req, res) => {
  const { selling_partner_id, spapi_oauth_code } = req.query;
  
  try {
    // TODO: Exchange code for access token using LWA
    console.log(`Amazon connected:`, { selling_partner_id, spapi_oauth_code });
    
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=amazon`);
  } catch (error) {
    console.error('Amazon OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/error?message=amazon_auth_failed`);
  }
});

// Generic webhook validation endpoint
router.post('/verify-webhook', (req, res) => {
  const { platform, signature, payload } = req.body;
  
  // TODO: Implement webhook signature verification for each platform
  console.log(`Webhook verification for ${platform}`);
  
  res.json({ verified: true });
});

module.exports = router; 