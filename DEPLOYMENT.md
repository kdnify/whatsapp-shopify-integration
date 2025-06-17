# Deployment Guide - Render + Shopify App Testing

## Overview
Deploy your WhatsApp Shopify integration to Render for testing as a real Shopify app before submitting to the App Store.

## 🚀 Quick Deploy to Render

### Step 1: Prepare Repository
```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Create MongoDB Atlas Database (Free)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (512MB - perfect for testing)
3. Create database user
4. Whitelist all IPs (0.0.0.0/0) for now
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/whatsapp-shopify`

### Step 3: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: `whatsapp-shopify-app`
   - **Environment**: `Node`
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing)

### Step 4: Set Environment Variables
In Render dashboard, add these environment variables:

**Required:**
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-shopify

# Shopify App Credentials (from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# WhatsApp Business API (from Meta Developer Console)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Security
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long
```

**Optional (for advanced features):**
```bash
# n8n Integration
N8N_BASE_URL=https://your-n8n-server.com
N8N_API_KEY=your_n8n_api_key

# Payments (later)
STRIPE_SECRET_KEY=sk_live_your_stripe_key
```

## 🛍️ Test as Shopify App

### Step 1: Update Shopify App Settings
After Render deployment (you'll get a URL like `https://whatsapp-shopify-app-abc123.onrender.com`):

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Find your app → App setup
3. Update URLs:
   - **App URL**: `https://your-app.onrender.com`
   - **Allowed redirection URLs**: `https://your-app.onrender.com/api/auth/shopify/callback`
   - **Webhook endpoints**: `https://your-app.onrender.com/webhooks/shopify/checkout/abandoned`

### Step 2: Install in Test Store
```bash
# Visit this URL to install in your development store
https://your-app.onrender.com/api/auth/shopify?shop=your-test-store.myshopify.com
```

### Step 3: Test Complete Flow
1. **Install app** in test store ✅
2. **Configure WhatsApp** credentials ✅
3. **Add test customer** phone number ✅
4. **Create abandoned cart** → verify WhatsApp message sent ✅
5. **Create order** → verify confirmation message ✅
6. **Check analytics** → verify data tracking ✅

## 🔧 WhatsApp Business API Setup

### Get WhatsApp Credentials
1. **Facebook Business Account**: [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business API**: [developers.facebook.com](https://developers.facebook.com)
3. **Create App** → Add WhatsApp Product
4. **Get Phone Number ID** and **Access Token**
5. **Set Webhook URL**: `https://your-app.onrender.com/webhooks/whatsapp`

### Test WhatsApp Integration
```bash
# Test API connection
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_TEST_NUMBER",
    "type": "text",
    "text": {"body": "Test from Shopify app!"}
  }'
```

## 🧪 n8n Integration (Optional)

### Setup n8n Server
```bash
# Option 1: n8n Cloud (easiest)
# Sign up at n8n.cloud and get API key

# Option 2: Self-hosted
# Deploy n8n to another Render service or your server
```

### Create Workflows
1. **Abandoned Cart Sequence**:
   - Webhook trigger from your app
   - Wait 1 hour
   - Check if still abandoned
   - Send follow-up message

2. **Customer Segmentation**:
   - New vs returning customer logic
   - VIP customer special handling
   - A/B test message variants

## 🚦 Production Checklist

**Before Going Live:**
- [ ] SSL certificate active (Render provides automatically)
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Error logging setup (Render logs)
- [ ] Rate limiting configured
- [ ] CORS properly configured for Shopify
- [ ] Webhook signatures verified
- [ ] Test all user flows
- [ ] Performance testing with realistic data

**Monitoring:**
- [ ] Render service health checks
- [ ] Database connection monitoring  
- [ ] WhatsApp API rate limits
- [ ] Error alerting setup

## 📊 Testing Scenarios

### End-to-End Test Script
1. **Fresh store install**
2. **Configure WhatsApp with real number**
3. **Add customer with real phone**
4. **Create abandoned cart scenario**
5. **Verify message received on phone**
6. **Complete purchase → verify confirmation**
7. **Check analytics dashboard**
8. **Test n8n workflows** (if configured)

### Load Testing
```bash
# Test webhook handling
for i in {1..100}; do
  curl -X POST https://your-app.onrender.com/webhooks/shopify/checkout/abandoned \
    -H "Content-Type: application/json" \
    -d '{"test": "load_'$i'"}'
done
```

## 🎯 Success Metrics

**Technical:**
- App loads in Shopify admin ✅
- OAuth flow completes ✅  
- Webhooks receive data ✅
- WhatsApp messages send ✅
- Analytics display correctly ✅

**Business:**
- Message delivery rate > 95%
- Customer response rate tracked
- Conversion attribution working
- Dashboard shows ROI metrics

## 🆘 Troubleshooting

**Common Issues:**
- **CORS errors**: Check allowed origins in index.js
- **Webhook timeouts**: Render free tier has limits
- **WhatsApp API errors**: Check phone number verification
- **Database connection**: Verify MongoDB URI and whitelist

**Debug Mode:**
```bash
# Check Render logs
# Go to Render Dashboard → Your Service → Logs

# Test endpoints
curl https://your-app.onrender.com/health
curl https://your-app.onrender.com/api/stores/mock-store-123
```

## 🎉 Ready for App Store

Once everything works:
1. **Create production environment** variables
2. **Update Shopify app listing** with screenshots
3. **Write privacy policy** and terms
4. **Submit for App Store review**
5. **Marketing materials** ready

**Estimated Timeline:**
- Deploy + Test: 2-3 days
- App Store submission: 1-2 weeks review
- Go live: Day 1 after approval

---

Need help? Check the logs first, then reach out with specific error messages! 