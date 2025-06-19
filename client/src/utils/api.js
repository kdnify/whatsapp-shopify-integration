// Utility function to get the correct API URL based on environment
export const getApiUrl = () => {
  const isProduction = window.location.hostname !== 'localhost';
  return isProduction 
    ? 'https://whatsapp-shopify-app.onrender.com' 
    : (process.env.REACT_APP_API_URL || 'http://localhost:5000');
};

// Helper function for making API calls
export const apiCall = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  return response.json();
}; 