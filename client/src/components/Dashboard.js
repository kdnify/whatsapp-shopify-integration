import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  TextContainer,
  Text,
  Badge,
  Button,
  Modal,
  List,
  Banner,
  SkeletonDisplayText,
  SkeletonBodyText
} from '@shopify/polaris';
import { getApiUrl } from '../utils/api';

function Dashboard({ storeId, store }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetCode, setWidgetCode] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/stores/${storeId}/dashboard`);
        const data = await response.json();
        
        if (data.success) {
          setDashboardData(data.dashboard);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [storeId]);

  const getWidgetCode = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/whatsapp/widget/${storeId}`);
      const data = await response.json();
      
      if (data.success) {
        setWidgetCode(data.widgetCode);
        setShowWidgetModal(true);
      }
    } catch (error) {
      console.error('Error fetching widget code:', error);
    }
  };

  if (loading) {
    return (
      <Page title="Dashboard">
        <BlockStack gap="5">
          <Card sectioned>
            <BlockStack gap="3">
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={3} />
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  if (!dashboardData) {
    return (
      <Page title="Dashboard">
        <Banner title="Error loading dashboard" status="critical">
          <p>Unable to load dashboard data. Please refresh the page.</p>
        </Banner>
      </Page>
    );
  }

  const { stats, messagesByStatus, enabledFeatures } = dashboardData;

  return (
    <Page
      title="Dashboard"
      subtitle={`WhatsApp integration for ${store.storeName}`}
      primaryAction={{
        content: 'Get Widget Code',
        onAction: getWidgetCode
      }}
    >
      <BlockStack gap="5">
        {/* Status Banner */}
        <Banner
          title="WhatsApp Integration Active"
          status="success"
          action={{
            content: 'View Settings',
            url: '/settings'
          }}
        >
          <p>Your WhatsApp Business API is configured and ready to send automated messages.</p>
        </Banner>

        {/* Key Metrics */}
        <InlineStack gap="4" align="space-evenly">
          <Card sectioned>
            <BlockStack gap="2">
              <Text variant="bodySm" color="subdued">Total Opt-ins</Text>
              <Text variant="heading2xl">{stats.totalOptIns}</Text>
              <Text variant="bodySm" color="subdued">
                +{stats.recentOptIns} in last 30 days
              </Text>
            </BlockStack>
          </Card>

          <Card sectioned>
            <BlockStack gap="2">
              <Text variant="bodySm" color="subdued">Messages Sent</Text>
              <Text variant="heading2xl">{stats.totalMessages}</Text>
              <Text variant="bodySm" color="subdued">
                +{stats.recentMessages} in last 30 days
              </Text>
            </BlockStack>
          </Card>

          <Card sectioned>
            <BlockStack gap="2">
              <Text variant="bodySm" color="subdued">Click Rate</Text>
              <Text variant="heading2xl">{stats.clickRate}%</Text>
              <Text variant="bodySm" color="subdued">
                Customer engagement
              </Text>
            </BlockStack>
          </Card>

          <Card sectioned>
            <BlockStack gap="2">
              <Text variant="bodySm" color="subdued">Conversion Rate</Text>
              <Text variant="heading2xl">{stats.conversionRate}%</Text>
              <Text variant="bodySm" color="subdued">
                Messages to sales
              </Text>
            </BlockStack>
          </Card>
        </InlineStack>

        {/* Feature Status */}
                  <Card title="Active Features" sectioned>
            <InlineStack gap="3">
              <Badge status={enabledFeatures.abandonedCart ? "success" : "attention"}>
                {enabledFeatures.abandonedCart ? "✅" : "⏸"} Abandoned Cart Recovery
              </Badge>
              <Badge status={enabledFeatures.orderConfirmation ? "success" : "attention"}>
                {enabledFeatures.orderConfirmation ? "✅" : "⏸"} Order Confirmations
              </Badge>
              <Badge status={enabledFeatures.orderDelivered ? "success" : "attention"}>
                {enabledFeatures.orderDelivered ? "✅" : "⏸"} Delivery Notifications
              </Badge>
            </InlineStack>
          </Card>

          {/* Message Status Breakdown */}
          <Card title="Message Delivery Status" sectioned>
            <InlineStack gap="4">
              {Object.entries(messagesByStatus).map(([status, count]) => (
                <BlockStack gap="1" key={status}>
                  <Text variant="bodySm" color="subdued">{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                  <Text variant="headingMd">{count}</Text>
                </BlockStack>
              ))}
            </InlineStack>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" sectioned>
            <InlineStack gap="3">
              <Button onClick={getWidgetCode}>
                Get Opt-in Widget Code
              </Button>
              <Button url="/analytics">
                View Detailed Analytics
              </Button>
              <Button url="/settings">
                Configure Settings
              </Button>
            </InlineStack>
          </Card>

        {/* Getting Started Guide */}
        <Card title="Next Steps" sectioned>
          <TextContainer>
            <Text variant="heading">Maximize Your WhatsApp Automation</Text>
            <List type="number">
              <List.Item>
                <strong>Add the Opt-in Widget:</strong> Get the widget code and add it to your store theme to start collecting WhatsApp opt-ins
              </List.Item>
              <List.Item>
                <strong>Customize Messages:</strong> Go to Settings to personalize your abandoned cart and order confirmation messages
              </List.Item>
              <List.Item>
                <strong>Monitor Performance:</strong> Check Analytics regularly to optimize your messaging strategy and improve conversion rates
              </List.Item>
              <List.Item>
                <strong>Upgrade for Growth:</strong> Consider upgrading to Pro for unlimited messages and advanced automation features
              </List.Item>
            </List>
          </TextContainer>
        </Card>

        {/* Widget Code Modal */}
        <Modal
          open={showWidgetModal}
          onClose={() => setShowWidgetModal(false)}
          title="WhatsApp Opt-in Widget Code"
          primaryAction={{
            content: 'Copy Code',
            onAction: () => {
              navigator.clipboard.writeText(widgetCode);
              alert('Widget code copied to clipboard!');
            }
          }}
          secondaryActions={[
            {
              content: 'Close',
              onAction: () => setShowWidgetModal(false)
            }
          ]}
        >
                      <Modal.Section>
              <BlockStack gap="4">
                <Text variant="bodyMd">
                  Copy this code and paste it into your Shopify theme where you want the WhatsApp opt-in button to appear:
                </Text>
                
                <div style={{ 
                  backgroundColor: '#f6f6f7', 
                  padding: '16px', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {widgetCode}
                </div>
                
                <Banner status="info">
                  <p>
                    <strong>Tip:</strong> Place this widget on your product pages, cart page, or checkout to maximize opt-ins.
                    The button will automatically handle customer consent and add them to your WhatsApp messaging list.
                  </p>
                </Banner>
              </BlockStack>
            </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}

export default Dashboard; 