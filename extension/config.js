// config.js — extension configuration
// Change API_URL to your deployed server URL for production.
// For local development, keep it pointing to localhost.

const CANDOR_CONFIG = {
  API_URL: 'http://localhost:3000',   // production: 'https://your-domain.com'
}

// Make available globally for popup.js, background.js, and content.js
if (typeof globalThis !== 'undefined') {
  globalThis.CANDOR_CONFIG = CANDOR_CONFIG
}
