/**
 * Debug Logger Configuration
 *
 * Settings for the remote debug logging system.
 */

export const DebugConfig = {
  // Enable/disable remote logging
  enabled: true,

  // Debug server URL (auto-detects hostname from current page URL)
  serverUrl: typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001',

  // Batch settings (for performance optimization)
  batchEnabled: true,
  batchInterval: 500, // ms - send logs every 500ms
  batchMaxSize: 50,   // max logs per batch

  // Retry settings
  retryEnabled: true,
  retryAttempts: 3,
  retryDelay: 1000,   // ms - wait 1s before retry

  // Log levels to send (set to false to disable)
  levels: {
    log: true,      // console.log
    info: true,     // console.info
    warn: true,     // console.warn
    error: true,    // console.error
    debug: true     // console.debug
  },

  // Keep original console output
  keepOriginalConsole: true,

  // Show connection status in console
  showConnectionStatus: true,

  // Priority 6: localStorage fallback for offline logging
  fallbackToLocalStorage: true,
  localStorageKey: 'debugLogs',
  maxLocalLogs: 100  // Maximum number of logs to store locally
};
