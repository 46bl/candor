// config.js — extension configuration
// Switch API_URL between local dev and production.

const CANDOR_CONFIG = {
  // Production: 'https://c4ndor.xyz'
  // Development: 'http://localhost:3000'
  API_URL: 'https://c4ndor.xyz',
}

// Make available globally for popup.js, background.js, and content.js
if (typeof globalThis !== 'undefined') {
  globalThis.CANDOR_CONFIG = CANDOR_CONFIG
}
