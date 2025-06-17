const Store = require('../models/Store');
const OptIn = require('../models/OptIn');
const Message = require('../models/Message');
const whatsappService = require('../services/whatsappService');

// Handle Shopify abandoned checkout webhook
async function handleAbandonedCheckout(checkoutData) {
  try {
    console.log('🛒 Processing abandoned checkout:', checkoutData.id);

    // Find the store by shop domain
    const shopDomain = checkoutData.shop_domain || extractDomainFromCheckout(checkoutData);
    const store = await Store.findOne({ shopDomain });
    
    if (!store) {
      console.log('❌ Store not found for domain:', shopDomain);
      return;
    }

    if (!store.whatsappConfig.isConfigured || !store.whatsappConfig.enabledFeatures.abandonedCart) {
      console.log('⏭️ WhatsApp abandoned cart not enabled for store:', store.storeName);
      return;
    }

    // Check if customer has opted in to WhatsApp
    const customerPhone = extractCustomerPhone(checkoutData);
    if (!customerPhone) {
      console.log('📞 No customer phone found in checkout data');
      return;
    }

    const optIn = await OptIn.findOne({
      storeId: store._id,
      phoneNumber: customerPhone.replace(/\D/g, ''),
      isActive: true,
      'preferences.abandonedCart': true
    });

    if (!optIn) {
      console.log('🚫 Customer not opted in for abandoned cart messages:', customerPhone);
      return;
    }

    // Prepare cart data
    const cartData = {
      checkoutUrl: checkoutData.abandoned_checkout_url,
      itemCount: checkoutData.line_items ? checkoutData.line_items.length : 0,
      totalPrice: checkoutData.total_price,
      currency: checkoutData.currency || checkoutData.presentment_currency,
      customerEmail: checkoutData.email,
      customerName: checkoutData.billing_address?.first_name || checkoutData.customer?.first_name
    };

    const customerData = {
      customerId: checkoutData.customer?.id?.toString() || optIn.customerId,
      customerEmail: cartData.customerEmail,
      customerName: cartData.customerName,
      phoneNumber: customerPhone
    };

    // Send abandoned cart message
    const result = await whatsappService.sendAbandonedCartMessage(store, customerData, cartData);

    if (result.success) {
      // Log the message
      await Message.create({
        storeId: store._id,
        optInId: optIn._id,
        messageType: 'abandoned_cart',
        whatsappMessageId: result.messageId,
        whatsappPhoneNumberId: store.whatsappConfig.phoneNumberId,
        recipientPhone: customerPhone,
        messageContent: result.message,
        shopifyCartId: checkoutData.id?.toString(),
        orderValue: parseFloat(cartData.totalPrice),
        currency: cartData.currency,
        status: 'sent',
        sentAt: new Date()
      });

      // Update store stats
      await Store.findByIdAndUpdate(store._id, {
        $inc: { 'stats.messagesDelivered': 1 }
      });

      console.log('✅ Abandoned cart message sent successfully');
    } else {
      console.error('❌ Failed to send abandoned cart message:', result.error);
    }

  } catch (error) {
    console.error('Error handling abandoned checkout:', error);
  }
}

// Handle Shopify order created webhook
async function handleOrderCreated(orderData) {
  try {
    console.log('📦 Processing order created:', orderData.id);

    // Find the store by shop domain
    const shopDomain = orderData.shop_domain || extractDomainFromOrder(orderData);
    const store = await Store.findOne({ shopDomain });
    
    if (!store) {
      console.log('❌ Store not found for domain:', shopDomain);
      return;
    }

    if (!store.whatsappConfig.isConfigured || !store.whatsappConfig.enabledFeatures.orderConfirmation) {
      console.log('⏭️ WhatsApp order confirmation not enabled for store:', store.storeName);
      return;
    }

    // Check if customer has opted in to WhatsApp
    const customerPhone = extractCustomerPhoneFromOrder(orderData);
    if (!customerPhone) {
      console.log('📞 No customer phone found in order data');
      return;
    }

    const optIn = await OptIn.findOne({
      storeId: store._id,
      phoneNumber: customerPhone.replace(/\D/g, ''),
      isActive: true,
      'preferences.orderUpdates': true
    });

    if (!optIn) {
      console.log('🚫 Customer not opted in for order updates:', customerPhone);
      return;
    }

    // Prepare order data
    const orderInfo = {
      orderNumber: orderData.order_number || orderData.name,
      totalPrice: orderData.total_price,
      currency: orderData.currency || orderData.presentment_currency,
      customerEmail: orderData.email,
      customerName: orderData.billing_address?.first_name || orderData.customer?.first_name
    };

    const customerData = {
      customerId: orderData.customer?.id?.toString() || optIn.customerId,
      customerEmail: orderInfo.customerEmail,
      customerName: orderInfo.customerName,
      phoneNumber: customerPhone
    };

    // Send order confirmation message
    const result = await whatsappService.sendOrderConfirmation(store, customerData, orderInfo);

    if (result.success) {
      // Log the message
      await Message.create({
        storeId: store._id,
        optInId: optIn._id,
        messageType: 'order_confirmation',
        whatsappMessageId: result.messageId,
        whatsappPhoneNumberId: store.whatsappConfig.phoneNumberId,
        recipientPhone: customerPhone,
        messageContent: result.message,
        shopifyOrderId: orderData.id?.toString(),
        orderValue: parseFloat(orderInfo.totalPrice),
        currency: orderInfo.currency,
        status: 'sent',
        sentAt: new Date()
      });

      // Update store stats
      await Store.findByIdAndUpdate(store._id, {
        $inc: { 'stats.messagesDelivered': 1 }
      });

      console.log('✅ Order confirmation message sent successfully');
    } else {
      console.error('❌ Failed to send order confirmation message:', result.error);
    }

  } catch (error) {
    console.error('Error handling order creation:', error);
  }
}

// Handle WhatsApp webhook (message status updates)
async function handleWhatsAppWebhook(webhookData) {
  try {
    const parsedMessage = whatsappService.parseWebhookMessage(webhookData);
    
    if (!parsedMessage) {
      return;
    }

    if (parsedMessage.type === 'status') {
      // Update message status
      await Message.findOneAndUpdate(
        { whatsappMessageId: parsedMessage.messageId },
        {
          status: parsedMessage.status,
          [`${parsedMessage.status}At`]: new Date(parsedMessage.timestamp * 1000)
        }
      );

      console.log(`📱 WhatsApp message ${parsedMessage.messageId} status: ${parsedMessage.status}`);
    }

    if (parsedMessage.type === 'message') {
      // Handle incoming customer messages (for future features)
      console.log('📨 Incoming WhatsApp message:', parsedMessage.text);
    }

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
  }
}

// Helper functions
function extractDomainFromCheckout(checkoutData) {
  // Try to extract domain from various fields
  if (checkoutData.shop_domain) return checkoutData.shop_domain;
  if (checkoutData.abandoned_checkout_url) {
    const match = checkoutData.abandoned_checkout_url.match(/https?:\/\/([^\/]+)/);
    return match ? match[1] : null;
  }
  return null;
}

function extractDomainFromOrder(orderData) {
  // Try to extract domain from various fields
  if (orderData.shop_domain) return orderData.shop_domain;
  // Add more extraction logic as needed
  return null;
}

function extractCustomerPhone(checkoutData) {
  // Try to get phone from billing address, shipping address, or customer
  return checkoutData.billing_address?.phone ||
         checkoutData.shipping_address?.phone ||
         checkoutData.customer?.phone ||
         null;
}

function extractCustomerPhoneFromOrder(orderData) {
  // Try to get phone from billing address, shipping address, or customer
  return orderData.billing_address?.phone ||
         orderData.shipping_address?.phone ||
         orderData.customer?.phone ||
         null;
}

module.exports = {
  handleAbandonedCheckout,
  handleOrderCreated,
  handleWhatsAppWebhook
}; 