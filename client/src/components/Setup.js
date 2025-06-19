import React, { useState } from 'react';
import {
  Page,
  Card,
  LegacyStack as Stack,
  TextField,
  Button,
  Banner,
  Link,
  TextContainer,
  Text,
  List,
  Checkbox,
  Spinner
} from '@shopify/polaris';
import { getApiUrl } from '../utils/api';

function Setup({ storeId, store, onSetupComplete }) {
  const [formData, setFormData] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: 'whatsapp_verify_' + Math.random().toString(36).substr(2, 9),
    enabledFeatures: {
      abandonedCart: true,
      orderConfirmation: true,
      orderDelivered: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testingApi, setTestingApi] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureChange = (feature, value) => {
    setFormData(prev => ({
      ...prev,
      enabledFeatures: {
        ...prev.enabledFeatures,
        [feature]: value
      }
    }));
  };

  const testApiConnection = async () => {
    if (!formData.accessToken || !formData.phoneNumberId) {
      setError('Please fill in Access Token and Phone Number ID first');
      return;
    }

    setTestingApi(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/api/whatsapp/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          phoneNumber: formData.phoneNumberId, // Send test to self
          messageType: 'test'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Test message sent successfully! Check your WhatsApp.');
      } else {
        setError('Test failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setError('Test failed: ' + error.message);
    } finally {
      setTestingApi(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.accessToken || !formData.phoneNumberId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/api/whatsapp/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        onSetupComplete();
      } else {
        setError(data.error || 'Configuration failed');
      }
    } catch (error) {
      setError('Configuration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title="WhatsApp Setup"
      subtitle="Configure your WhatsApp Business Cloud API to start sending automated messages"
    >
      <Stack vertical spacing="large">
        <Banner title="Setup Required" status="warning">
          <p>Complete the WhatsApp Business Cloud API setup to start sending abandoned cart recovery and order confirmation messages.</p>
        </Banner>

        <Card sectioned>
          <Stack vertical spacing="large">
            <TextContainer>
              <Text>Step 1: Get Your WhatsApp Business Cloud API Credentials</Text>
              <p>You'll need to create a WhatsApp Business Account and get API credentials:</p>
              <List type="number">
                <List.Item>
                  Go to <Link url="https://developers.facebook.com/" external>Facebook Developers</Link> and create an app
                </List.Item>
                <List.Item>Add the WhatsApp product to your app</List.Item>
                <List.Item>Get your Access Token from the WhatsApp API setup</List.Item>
                <List.Item>Copy your Phone Number ID from the API setup</List.Item>
                <List.Item>Note your Business Account ID from the account settings</List.Item>
              </List>
            </TextContainer>
          </Stack>
        </Card>

        <Card sectioned title="Step 2: Configure API Credentials">
          <Stack vertical spacing="large">
            <TextField
              label="Access Token"
              value={formData.accessToken}
              onChange={(value) => handleInputChange('accessToken', value)}
              placeholder="EAAG..."
              helpText="Your WhatsApp Business Cloud API access token"
              type="password"
            />

            <TextField
              label="Phone Number ID"
              value={formData.phoneNumberId}
              onChange={(value) => handleInputChange('phoneNumberId', value)}
              placeholder="1234567890123456"
              helpText="The phone number ID from your WhatsApp Business API setup"
            />

            <TextField
              label="Business Account ID"
              value={formData.businessAccountId}
              onChange={(value) => handleInputChange('businessAccountId', value)}
              placeholder="1234567890123456"
              helpText="Your WhatsApp Business Account ID (optional but recommended)"
            />

            <TextField
              label="Webhook Verify Token"
              value={formData.webhookVerifyToken}
              onChange={(value) => handleInputChange('webhookVerifyToken', value)}
              helpText="Token for webhook verification (auto-generated)"
            />

            <Stack>
              <Button
                onClick={testApiConnection}
                loading={testingApi}
                disabled={!formData.accessToken || !formData.phoneNumberId}
              >
                Test API Connection
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Card sectioned title="Step 3: Choose Features">
          <Stack vertical spacing="tight">
            <Checkbox
              label="Abandoned Cart Recovery"
              checked={formData.enabledFeatures.abandonedCart}
              onChange={(value) => handleFeatureChange('abandonedCart', value)}
              helpText="Send WhatsApp messages when customers abandon their carts"
            />
            <Checkbox
              label="Order Confirmation"
              checked={formData.enabledFeatures.orderConfirmation}
              onChange={(value) => handleFeatureChange('orderConfirmation', value)}
              helpText="Send WhatsApp confirmation when orders are placed"
            />
            <Checkbox
              label="Order Delivered Notifications"
              checked={formData.enabledFeatures.orderDelivered}
              onChange={(value) => handleFeatureChange('orderDelivered', value)}
              helpText="Send WhatsApp messages when orders are delivered (coming soon)"
            />
          </Stack>
        </Card>

        {error && (
          <Banner title="Configuration Error" status="critical">
            <p>{error}</p>
          </Banner>
        )}

        <Card sectioned>
          <Stack distribution="trailing">
            <Button
              primary
              onClick={handleSubmit}
              loading={loading}
              disabled={!formData.accessToken || !formData.phoneNumberId}
            >
              {loading ? <Spinner size="small" /> : 'Complete Setup'}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}

export default Setup; 