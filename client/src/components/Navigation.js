import React from 'react';
import { Navigation as PolarisNavigation } from '@shopify/polaris';
import { 
  HomeIcon, 
  ChartLineIcon, 
  SettingsIcon,
  MobileIcon
} from '@shopify/polaris-icons';

function Navigation({ store }) {
  const navigationItems = [
    {
      url: '/',
      label: 'Dashboard',
      icon: HomeIcon,
      exactMatch: true
    },
    {
      url: '/analytics',
      label: 'Analytics',
      icon: ChartLineIcon
    },
    {
      url: '/settings',
      label: 'Settings',
      icon: SettingsIcon
    }
  ];

  // Add setup item if WhatsApp not configured
  if (!store.whatsappConfigured) {
    navigationItems.unshift({
      url: '/setup',
      label: 'WhatsApp Setup',
      icon: MobileIcon,
      badge: 'Required'
    });
  }

  return (
    <PolarisNavigation location={window.location.pathname}>
      <PolarisNavigation.Section
        items={navigationItems}
        title="WhatsApp for Shopify"
        rollup={{
          after: 2,
          view: 'view',
          hide: 'hide',
          activePath: window.location.pathname
        }}
      />
    </PolarisNavigation>
  );
}

export default Navigation; 