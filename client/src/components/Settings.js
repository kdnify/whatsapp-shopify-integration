import React, { useState } from 'react';
import {
  Page,
  Card,
  LegacyStack as Stack,
  TextField,
  Button,
  Banner,
  Checkbox,
  Badge,
  TextContainer,
  Text,
  Modal
} from '@shopify/polaris';

function Settings({ storeId, store, onUpdate }) {
  const [features, setFeatures] = useState(store.enabledFeatures || {
    abandonedCart: true,
    orderConfirmation: true,
    orderDelivered: false
  });
  const [loading, setLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFeatureChange = (feature, value) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: value
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledFeatures: features
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Settings saved successfully!');
        onUpdate();
      } else {
        setMessage('Error saving settings: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone) {
      setMessage('Please enter a phone number for testing');
      return;
    }

    setTestLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/whatsapp/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          phoneNumber: testPhone,
          messageType: 'test'
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Test message sent successfully! ✅');
        setShowTestModal(false);
        setTestPhone('');
      } else {
        setMessage('Test message failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('Test message failed: ' + error.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Page
      title="Settings"
      subtitle="Manage your WhatsApp automation features"
      secondaryActions={[
        {
          content: 'Send Test Message',
          onAction: () => setShowTestModal(true)
        }
      ]}
    >
      <Stack vertical spacing="large">
        {/* Store Info */}
        <Card title="Store Information" sectioned>
          <Stack vertical spacing="tight">
            <p><strong>Store:</strong> {store.storeName}</p>
            <p><strong>Domain:</strong> {store.shopDomain}</p>
            <p><strong>Plan:</strong> <Badge status="info">{store.plan || 'free'}</Badge></p>
            <p><strong>WhatsApp Status:</strong> 
              <Badge status={store.whatsappConfigured ? "success" : "critical"}>
                {store.whatsappConfigured ? "Configured" : "Not Configured"}
              </Badge>
            </p>
          </Stack>
        </Card>

        {/* Feature Configuration */}
        <Card title="WhatsApp Automation Features" sectioned>
          <Stack vertical spacing="loose">
            <Checkbox
              label="Abandoned Cart Recovery"
              checked={features.abandonedCart}
              onChange={(value) => handleFeatureChange('abandonedCart', value)}
              helpText="Send WhatsApp messages to customers who abandon their carts"
            />
            
            <Checkbox
              label="Order Confirmation Messages"
              checked={features.orderConfirmation}
              onChange={(value) => handleFeatureChange('orderConfirmation', value)}
              helpText="Send WhatsApp confirmations when orders are placed"
            />
            
            <Checkbox
              label="Order Delivered Notifications"
              checked={features.orderDelivered}
              onChange={(value) => handleFeatureChange('orderDelivered', value)}
              helpText="Send WhatsApp messages when orders are delivered (coming soon)"
              disabled={true}
            />
          </Stack>
        </Card>

        {/* Free vs Pro Features */}
        <Card title="Plan Features" sectioned>
          <Stack vertical spacing="loose">
            <TextContainer>
              <Text variant="headingMd">Free Plan (Current)</Text>
              <ul>
                <li>✅ Up to 50 messages per month</li>
                <li>✅ Abandoned cart recovery</li>
                <li>✅ Order confirmations</li>
                <li>✅ Basic analytics</li>
              </ul>
            </TextContainer>
            
            <TextContainer>
              <Text variant="headingMd">Pro Plan - $29/month</Text>
              <ul>
                <li>✅ Unlimited messages</li>
                <li>✅ Advanced message templates</li>
                <li>✅ Customer segmentation</li>
                <li>✅ Detailed analytics & reporting</li>
                <li>✅ Priority support</li>
                <li>✅ Custom automation rules</li>
              </ul>
              <Button primary disabled>
                Upgrade to Pro (Coming Soon)
              </Button>
            </TextContainer>
          </Stack>
        </Card>

        {/* WhatsApp Widget */}
        <Card title="Opt-in Widget" sectioned>
          <Stack vertical spacing="loose">
            <p>Add the WhatsApp opt-in widget to your store to start collecting customer phone numbers for automation.</p>
            <Button url={`/api/whatsapp/widget/${storeId}`} external>
              Get Widget Code
            </Button>
          </Stack>
        </Card>

        {/* Message Status */}
        {message && (
          <Banner status={message.includes('successfully') ? "success" : "critical"}>
            <p>{message}</p>
          </Banner>
        )}

        {/* Save Button */}
        <Card sectioned>
          <Stack distribution="trailing">
            <Button
              primary
              onClick={saveSettings}
              loading={loading}
            >
              Save Settings
            </Button>
          </Stack>
        </Card>

        {/* Advanced Settings */}
        <Card title="Advanced" sectioned>
          <Stack vertical spacing="loose">
            <Button url="/setup">
              Reconfigure WhatsApp API
            </Button>
            <TextContainer>
              <p><strong>Webhook URL:</strong> {process.env.REACT_APP_API_URL || 'http://localhost:5000'}/webhooks/whatsapp</p>
              <p><strong>Verify Token:</strong> Use the token from your WhatsApp setup</p>
            </TextContainer>
          </Stack>
        </Card>
      </Stack>

      {/* Test Message Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Message"
        primaryAction={{
          content: 'Send Message',
          onAction: sendTestMessage,
          loading: testLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowTestModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Stack vertical spacing="loose">
            <TextField
              label="Phone Number"
              value={testPhone}
              onChange={setTestPhone}
              placeholder="+1234567890"
              helpText="Include country code (e.g., +1 for US)"
              type="tel"
            />
          </Stack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default Settings; 