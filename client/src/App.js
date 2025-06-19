import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, Frame } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import Dashboard from './components/Dashboard';
import Setup from './components/Setup';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import { getApiUrl } from './utils/api';
import './App.css';

function App() {
  const [storeId, setStoreId] = useState(null);
  const [shop, setShop] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get store info from URL params or use demo store for local testing
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    const storeIdParam = urlParams.get('storeId');

    if (shopParam && storeIdParam) {
      setShop(shopParam);
      setStoreId(storeIdParam);
      fetchStoreData(storeIdParam);
    } else {
      // For local testing, use mock store
      console.log('🧪 Using demo store for local testing');
      setShop('demo-store.myshopify.com');
      setStoreId('mock-store-123');
      fetchStoreData('mock-store-123');
    }
  }, []);

  const fetchStoreData = async (id) => {
    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/stores/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setStore(data.store);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppProvider i18n={enTranslations}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>Loading your WhatsApp + Shopify dashboard...</div>
        </div>
      </AppProvider>
    );
  }

  if (!store) {
    return (
      <AppProvider i18n={enTranslations}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>Error loading store data. Please try reconnecting.</div>
        </div>
      </AppProvider>
    );
  }

  return (
    <AppProvider i18n={enTranslations}>
      <Router>
        <Frame
          navigation={<Navigation store={store} />}
          showMobileNavigation={false}
        >
          <Routes>
            <Route 
              path="/" 
              element={
                store.whatsappConfigured ? 
                  <Dashboard storeId={storeId} store={store} /> : 
                  <Setup storeId={storeId} store={store} onSetupComplete={() => fetchStoreData(storeId)} />
              } 
            />
            <Route 
              path="/setup" 
              element={<Setup storeId={storeId} store={store} onSetupComplete={() => fetchStoreData(storeId)} />} 
            />
            <Route 
              path="/analytics" 
              element={<Analytics storeId={storeId} store={store} />} 
            />
            <Route 
              path="/settings" 
              element={<Settings storeId={storeId} store={store} onUpdate={() => fetchStoreData(storeId)} />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Frame>
      </Router>
    </AppProvider>
  );
}

export default App;
