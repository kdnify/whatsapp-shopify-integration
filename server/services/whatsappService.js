const axios = require('axios');

// WhatsApp Business Cloud API base URL
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

class WhatsAppService {
  constructor() {
    this.n8nBaseUrl = process.env.N8N_BASE_URL;
    this.n8nApiKey = process.env.N8N_API_KEY;
  }

  // Send abandoned cart message
  async sendAbandonedCartMessage(store, customerData, cartData) {
    try {
      const { whatsappConfig } = store;
      
      if (!whatsappConfig.isConfigured) {
        throw new Error('WhatsApp not configured for this store');
      }

      // Prepare message content
      const message = this.buildAbandonedCartMessage(customerData, cartData);
      
      // Send via WhatsApp API
      const response = await axios.post(
        `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: customerData.phoneNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Trigger n8n workflow for advanced abandoned cart sequence
      if (this.n8nBaseUrl) {
        await this.triggerN8nWorkflow('abandoned-cart', {
          storeId: store._id,
          customerData,
          cartData,
          messageId: response.data.messages[0].id
        });
      }

      return {
        success: true,
        messageId: response.data.messages[0].id,
        message: message
      };
      
    } catch (error) {
      console.error('WhatsApp message error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Send order confirmation
  async sendOrderConfirmation(store, customerData, orderData) {
    try {
      const { whatsappConfig } = store;
      
      if (!whatsappConfig.isConfigured) {
        throw new Error('WhatsApp not configured for this store');
      }

      const message = this.buildOrderConfirmationMessage(customerData, orderData);
      
      const response = await axios.post(
        `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: customerData.phoneNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Trigger n8n workflow for order follow-up sequence
      if (this.n8nBaseUrl) {
        await this.triggerN8nWorkflow('order-confirmation', {
          storeId: store._id,
          customerData,
          orderData,
          messageId: response.data.messages[0].id
        });
      }

      return {
        success: true,
        messageId: response.data.messages[0].id,
        message: message
      };
      
    } catch (error) {
      console.error('WhatsApp message error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Send test message
  async sendTestMessage(accessToken, phoneNumberId, recipientPhone, message) {
    try {
      const response = await axios.post(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'text',
          text: { body: message || 'Test message from WhatsApp Shopify integration! 🎉' }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
      
    } catch (error) {
      console.error('Test message error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Trigger n8n workflow
  async triggerN8nWorkflow(workflowType, data) {
    if (!this.n8nBaseUrl || !this.n8nApiKey) {
      console.log('n8n not configured, skipping workflow trigger');
      return;
    }

    try {
      const webhookUrl = `${process.env.N8N_WEBHOOK_BASE}/${workflowType}`;
      
      await axios.post(webhookUrl, {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'whatsapp-shopify-app'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.n8nApiKey}`
        },
        timeout: 5000 // Don't wait too long for n8n
      });

      console.log(`✅ n8n workflow triggered: ${workflowType}`);
    } catch (error) {
      console.error(`❌ Failed to trigger n8n workflow ${workflowType}:`, error.message);
      // Don't fail the main operation if n8n is down
    }
  }

  // Build abandoned cart message
  buildAbandonedCartMessage(customerData, cartData) {
    const { customerName, customerEmail } = customerData;
    const { checkoutUrl, itemCount, totalPrice, currency } = cartData;
    
    const name = customerName || customerEmail?.split('@')[0] || 'there';
    
    return `Hi ${name}! 👋

You left ${itemCount} item${itemCount > 1 ? 's' : ''} in your cart worth ${currency} ${totalPrice}.

Complete your purchase now and get them before they're gone! 

🛒 Complete Order: ${checkoutUrl}

Need help? Just reply to this message!`;
  }

  // Build order confirmation message
  buildOrderConfirmationMessage(customerData, orderData) {
    const { customerName, customerEmail } = customerData;
    const { orderNumber, totalPrice, currency } = orderData;
    
    const name = customerName || customerEmail?.split('@')[0] || 'there';
    
    return `Hi ${name}! ✅

Your order #${orderNumber} has been confirmed!

📦 Order Total: ${currency} ${totalPrice}
🚚 We'll send you tracking info once your order ships.

Thanks for shopping with us! If you have any questions, just reply to this message.`;
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, verifyToken) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', verifyToken);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  // Send a text message
  async sendTextMessage(phoneNumberId, accessToken, to, message) {
    try {
      const response = await axios.post(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('WhatsApp text message error:', error.response?.data);
      throw error;
    }
  }

  // Send a template message (for promotional/abandoned cart messages)
  async sendTemplateMessage(phoneNumberId, accessToken, to, templateName, templateParams = []) {
    try {
      const response = await axios.post(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components: templateParams.length > 0 ? [
              {
                type: 'body',
                parameters: templateParams.map(param => ({
                  type: 'text',
                  text: param
                }))
              }
            ] : []
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('WhatsApp template message error:', error.response?.data);
      throw error;
    }
  }

  // Parse incoming webhook message
  parseWebhookMessage(webhookData) {
    try {
      const entry = webhookData.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;

      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        return {
          type: 'message',
          messageId: message.id,
          from: message.from,
          timestamp: message.timestamp,
          text: message.text?.body || '',
          messageType: message.type
        };
      }

      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        return {
          type: 'status',
          messageId: status.id,
          recipient: status.recipient_id,
          status: status.status,
          timestamp: status.timestamp
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing webhook message:', error);
      return null;
    }
  }

  // Get message templates (for future use)
  async getMessageTemplates(businessAccountId, accessToken) {
    try {
      const response = await axios.get(
        `${WHATSAPP_API_BASE}/${businessAccountId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching message templates:', error);
      throw error;
    }
  }

  // Create opt-in widget JavaScript
  generateOptInWidget(storeId, customStyles = {}) {
    const defaultStyles = {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '9999',
      backgroundColor: '#25D366',
      color: 'white',
      border: 'none',
      borderRadius: '50px',
      padding: '15px 20px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      ...customStyles
    };

    return `
    <!-- WhatsApp Opt-in Widget -->
    <div id="whatsapp-optin-widget">
      <button 
        id="whatsapp-optin-btn"
        onclick="openWhatsAppOptIn()"
        style="${Object.entries(defaultStyles).map(([key, value]) => 
          `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`
        ).join('; ')}"
      >
        💬 WhatsApp Updates
      </button>
      
      <div id="whatsapp-optin-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
          <h3 style="margin-top: 0; color: #333;">Get WhatsApp Updates! 📱</h3>
          <p style="color: #666; margin-bottom: 20px;">Get notified about your orders and exclusive offers via WhatsApp.</p>
          
          <input 
            type="tel" 
            id="whatsapp-phone-input" 
            placeholder="+1234567890" 
            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 15px; box-sizing: border-box;"
          />
          
          <div style="display: flex; gap: 10px;">
            <button onclick="submitWhatsAppOptIn()" style="flex: 1; background: #25D366; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">
              Subscribe
            </button>
            <button onclick="closeWhatsAppOptIn()" style="flex: 1; background: #ccc; color: white; border: none; padding: 12px; border-radius: 5px; cursor: pointer;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <script>
      function openWhatsAppOptIn() {
        document.getElementById('whatsapp-optin-modal').style.display = 'block';
      }
      
      function closeWhatsAppOptIn() {
        document.getElementById('whatsapp-optin-modal').style.display = 'none';
      }
      
      async function submitWhatsAppOptIn() {
        const phone = document.getElementById('whatsapp-phone-input').value;
        if (!phone) {
          alert('Please enter your phone number');
          return;
        }
        
        try {
          const response = await fetch('/api/whatsapp/optin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: phone,
              storeId: '${storeId}',
              source: 'widget'
            })
          });
          
          if (response.ok) {
            alert('Successfully subscribed to WhatsApp updates! 🎉');
            closeWhatsAppOptIn();
          } else {
            alert('Something went wrong. Please try again.');
          }
        } catch (error) {
          alert('Something went wrong. Please try again.');
        }
      }
    </script>
    `;
  }
}

module.exports = new WhatsAppService(); 