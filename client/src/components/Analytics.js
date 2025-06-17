import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  Banner,
  DataTable,
  Badge,
  SkeletonDisplayText,
  SkeletonBodyText
} from '@shopify/polaris';

function Analytics({ storeId, store }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [storeId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/whatsapp/analytics/${storeId}?days=${timeRange}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
  ];

  if (loading) {
    return (
      <Page title="Analytics">
        <BlockStack gap="500">
          <Card>
            <BlockStack gap="300">
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText lines={5} />
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  if (!analytics) {
    return (
      <Page title="Analytics">
        <Banner title="Error loading analytics" tone="critical">
          <p>Unable to load analytics data. Please refresh the page.</p>
        </Banner>
      </Page>
    );
  }

  const { messageStats, messagesByType } = analytics;

  // Prepare data table for message performance
  const messagePerformanceRows = messagesByType.map(type => [
    type._id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type.count,
    type.clicked,
    type.converted,
    type.count > 0 ? `${((type.clicked / type.count) * 100).toFixed(1)}%` : '0%',
    type.count > 0 ? `${((type.converted / type.count) * 100).toFixed(1)}%` : '0%'
  ]);

  // Prepare data table for delivery status
  const deliveryStatusRows = messageStats.map(status => [
    status._id.charAt(0).toUpperCase() + status._id.slice(1),
    status.count,
    <Badge tone={getStatusBadge(status._id)} key={status._id}>
      {status._id}
    </Badge>
  ]);

  function getStatusBadge(status) {
    switch (status) {
      case 'delivered': return 'success';
      case 'sent': return 'info';
      case 'read': return 'success';
      case 'failed': return 'critical';
      default: return 'attention';
    }
  }

  return (
    <Page
      title="Analytics"
      subtitle={`Performance insights for ${store.storeName}`}
      secondaryActions={[
        {
          content: 'Export Data',
          onAction: () => alert('Export feature coming soon!')
        }
      ]}
    >
      <BlockStack gap="500">
        {/* Time Range Selector */}
        <Card>
          <InlineStack>
            <div style={{ width: '200px' }}>
              <Select
                label="Time Range"
                options={timeRangeOptions}
                value={timeRange}
                onChange={(value) => setTimeRange(value)}
              />
            </div>
          </InlineStack>
        </Card>

        {/* Key Metrics Summary */}
        <InlineStack gap="400" align="space-evenly">
          <Card>
            <BlockStack gap="200">
              <Text variant="bodySm" tone="subdued">Total Opt-ins</Text>
              <Text variant="heading2xl">{analytics.totalOptIns}</Text>
              <Text variant="bodySm" tone="success">
                +{analytics.recentOptIns} this period
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text variant="bodySm" tone="subdued">Messages Sent</Text>
              <Text variant="heading2xl">
                {messageStats.reduce((sum, stat) => sum + stat.count, 0)}
              </Text>
              <Text variant="bodySm" tone="subdued">
                Across all message types
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text variant="bodySm" tone="subdued">Avg. Click Rate</Text>
              <Text variant="heading2xl">
                {messagesByType.length > 0 ? 
                  (messagesByType.reduce((sum, type) => 
                    sum + (type.count > 0 ? (type.clicked / type.count) * 100 : 0), 0
                  ) / messagesByType.length).toFixed(1) : 0}%
              </Text>
              <Text variant="bodySm" tone="subdued">
                Customer engagement
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text variant="bodySm" tone="subdued">Conversion Rate</Text>
              <Text variant="heading2xl">
                {messagesByType.length > 0 ? 
                  (messagesByType.reduce((sum, type) => 
                    sum + (type.count > 0 ? (type.converted / type.count) * 100 : 0), 0
                  ) / messagesByType.length).toFixed(1) : 0}%
              </Text>
              <Text variant="bodySm" tone="success">
                Messages to sales
              </Text>
            </BlockStack>
          </Card>
        </InlineStack>

        {/* Message Performance by Type */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Message Performance by Type</Text>
            {messagesByType.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'text', 'text']}
                headings={['Message Type', 'Sent', 'Clicked', 'Converted', 'Click Rate', 'Conversion Rate']}
                rows={messagePerformanceRows}
              />
            ) : (
              <Banner tone="info">
                <p>No message data available for the selected time period.</p>
              </Banner>
            )}
          </BlockStack>
        </Card>

        {/* Delivery Status Breakdown */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Message Delivery Status</Text>
            {messageStats.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'numeric', 'text']}
                headings={['Status', 'Count', 'Badge']}
                rows={deliveryStatusRows}
              />
            ) : (
              <Banner tone="info">
                <p>No delivery data available for the selected time period.</p>
              </Banner>
            )}
          </BlockStack>
        </Card>

        {/* Recommendations */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Recommendations</Text>
            <BlockStack gap="300">
              {analytics.totalOptIns < 50 && (
                <Banner tone="info">
                  <p>
                    <strong>Increase Opt-ins:</strong> Add the WhatsApp opt-in widget to more prominent locations on your store to capture more customer contacts.
                  </p>
                </Banner>
              )}
              
              {messagesByType.length > 0 && messagesByType.some(type => type.count > 0 && (type.clicked / type.count) < 0.1) && (
                <Banner tone="attention">
                  <p>
                    <strong>Improve Click Rates:</strong> Some message types have low engagement. Consider personalizing your messages or testing different timing.
                  </p>
                </Banner>
              )}
              
              {messageStats.some(stat => stat._id === 'failed' && stat.count > 0) && (
                <Banner tone="critical">
                  <p>
                    <strong>Address Failed Messages:</strong> You have failed message deliveries. Check your WhatsApp Business API configuration and phone number verification.
                  </p>
                </Banner>
                )}
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export default Analytics; 