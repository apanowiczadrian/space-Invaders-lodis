/**
 * Debug Logger
 *
 * Intercepts console.log/warn/error calls and sends them to a remote debug server.
 * Maintains original console behavior while adding remote logging capability.
 */

import { DebugConfig } from './config.js';

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Detect operating system
 */
function detectOS() {
  const ua = navigator.userAgent;

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9.]+)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/iPad|iPhone|iPod/.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `iOS ${version}`;
    }
    return 'iOS';
  }
  if (/Windows NT/.test(ua)) {
    const match = ua.match(/Windows NT\s([0-9.]+)/);
    if (match) {
      const versionMap = {
        '10.0': '10/11',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7'
      };
      return `Windows ${versionMap[match[1]] || match[1]}`;
    }
    return 'Windows';
  }
  if (/Macintosh/.test(ua)) {
    const match = ua.match(/Mac OS X\s([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }
  if (/Linux/.test(ua)) return 'Linux';

  return 'Unknown';
}

/**
 * Detect browser and version
 */
function detectBrowser() {
  const ua = navigator.userAgent;

  // Edge (Chromium-based)
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/);
    return match ? `Edge ${match[1]}` : 'Edge';
  }
  // Chrome
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    return match ? `Chrome ${match[1]}` : 'Chrome';
  }
  // Safari
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/);
    return match ? `Safari ${match[1]}` : 'Safari';
  }
  // Firefox
  if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/);
    return match ? `Firefox ${match[1]}` : 'Firefox';
  }

  return 'Unknown';
}

/**
 * Detect device type
 */
function detectDeviceType() {
  const ua = navigator.userAgent;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (/iPad/.test(ua) || (hasTouch && /Macintosh/.test(ua))) {
    return 'Tablet';
  }
  if (/Android.*tablet|iPad|PlayBook|Silk/i.test(ua)) {
    return 'Tablet';
  }
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || hasTouch) {
    return 'Mobile';
  }

  return 'Desktop';
}

/**
 * Check if running in PWA standalone mode
 */
function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Get screen orientation
 */
function getOrientation() {
  if (window.screen && window.screen.orientation) {
    return window.screen.orientation.type;
  }
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

class DebugLogger {
  constructor() {
    this.config = DebugConfig;
    this.logQueue = [];
    this.batchTimer = null;
    this.isConnected = false;
    this.originalConsole = {};
    this.retryCount = 0;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    };

    // Collect session information (collected once on initialization)
    this.sessionInfo = this.collectSessionInfo();
  }

  /**
   * Collect session and device information
   */
  collectSessionInfo() {
    return {
      id: generateUUID(),
      deviceType: detectDeviceType(),
      isPWA: isStandaloneMode(),
      os: detectOS(),
      browser: detectBrowser(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: getOrientation(),
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
  }

  /**
   * Collect game context information (dynamic)
   */
  collectGameContext() {
    try {
      // Get player data from localStorage
      const playerDataStr = localStorage.getItem('spaceInvPlayerData');
      const playerData = playerDataStr ? JSON.parse(playerDataStr) : null;

      // Try to get game instance from window (if available)
      const game = window.game || null;

      return {
        playerNick: playerData?.nick || null,
        gameState: game?.gameState || null,
        wave: game?.waveNumber || null,
        fps: game?.performanceMonitor?.getCurrentFPS() || null,
        lives: game?.player?.lives || null
      };
    } catch (e) {
      // Return null if game context is not available
      return {
        playerNick: null,
        gameState: null,
        wave: null,
        fps: null,
        lives: null
      };
    }
  }

  /**
   * Initialize the debug logger
   * Overrides console methods to capture logs
   */
  init() {
    if (!this.config.enabled) {
      this.originalConsole.log('%cDebugLogger: Disabled in config', 'color: #888; font-style: italic');
      return;
    }

    this.originalConsole.log('%c═══════════════════════════════════════════', 'color: #00ff00');
    this.originalConsole.log('%c🔌 DebugLogger: Initializing...', 'color: #00ff00; font-weight: bold; font-size: 14px');
    this.originalConsole.log('%c═══════════════════════════════════════════', 'color: #00ff00');

    // Override console methods
    this.interceptConsole();
    this.originalConsole.log('   ✓ Console methods intercepted');

    // Start batch timer if batching is enabled
    if (this.config.batchEnabled) {
      this.startBatchTimer();
      this.originalConsole.log(`   ✓ Batch timer started (${this.config.batchInterval}ms, max ${this.config.batchMaxSize} logs)`);
    }

    // Test server connection
    this.testConnection();
  }

  /**
   * Intercept console methods
   */
  interceptConsole() {
    const methods = ['log', 'info', 'warn', 'error', 'debug'];

    methods.forEach(method => {
      if (!this.config.levels[method]) return;

      console[method] = (...args) => {
        // Call original console method
        if (this.config.keepOriginalConsole) {
          this.originalConsole[method](...args);
        }

        // Send to remote server
        const message = args.map(arg => this.formatArg(arg)).join(' ');
        const file = this.getCallerFile();
        this.queueLog(message, method === 'log' ? 'info' : method, file);
      };
    });
  }

  /**
   * Format argument for logging
   */
  formatArg(arg) {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number') return String(arg);
    if (typeof arg === 'boolean') return String(arg);
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    try {
      return JSON.stringify(arg, null, 2);
    } catch (e) {
      return String(arg);
    }
  }

  /**
   * Get caller file name from stack trace
   */
  getCallerFile() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');

      // Find the first line that's not from DebugLogger
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('DebugLogger')) continue;

        // Extract file name
        const match = line.match(/\/([^\/]+\.js)/);
        if (match) {
          return match[1];
        }
      }

      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Queue log for sending
   */
  queueLog(message, level, file) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      file,
      session: this.sessionInfo,
      game: this.collectGameContext()
    };

    if (this.config.batchEnabled) {
      this.logQueue.push(logEntry);

      // Send immediately if queue is full
      if (this.logQueue.length >= this.config.batchMaxSize) {
        this.sendBatch();
      }
    } else {
      // Send immediately
      this.sendLog(logEntry);
    }
  }

  /**
   * Start batch timer
   */
  startBatchTimer() {
    this.batchTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.sendBatch();
      }
    }, this.config.batchInterval);
  }

  /**
   * Send batch of logs
   */
  async sendBatch() {
    if (this.logQueue.length === 0) return;

    const batch = [...this.logQueue];
    this.logQueue = [];

    try {
      const response = await fetch(`${this.config.serverUrl}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch })
      });

      if (response.ok) {
        const wasDisconnected = !this.isConnected;
        this.isConnected = true;
        this.retryCount = 0;

        // Log first successful batch send
        if (wasDisconnected && this.config.showConnectionStatus) {
          this.originalConsole.log(`%c📤 DebugLogger: First batch sent successfully! (${batch.length} logs)`, 'color: #00ff00; font-weight: bold');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.handleSendError(error, batch);
    }
  }

  /**
   * Send single log
   */
  async sendLog(logEntry) {
    try {
      const response = await fetch(`${this.config.serverUrl}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: [logEntry] })
      });

      if (response.ok) {
        this.isConnected = true;
        this.retryCount = 0;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.handleSendError(error, [logEntry]);
    }
  }

  /**
   * Handle send error with retry logic
   */
  handleSendError(error, logs) {
    const wasConnected = this.isConnected;
    this.isConnected = false;

    if (this.config.retryEnabled && this.retryCount < this.config.retryAttempts) {
      this.retryCount++;

      // Log on first failure
      if (this.retryCount === 1 && wasConnected && this.config.showConnectionStatus) {
        this.originalConsole.warn(`%c⚠️ DebugLogger: Connection lost, retrying... (${this.retryCount}/${this.config.retryAttempts})`, 'color: #ff9900; font-weight: bold');
        this.originalConsole.warn(`   Error: ${error.message}`);
      }

      setTimeout(() => {
        // Re-queue logs for retry
        this.logQueue.unshift(...logs);
      }, this.config.retryDelay);
    } else {
      // Priority 6: Save to localStorage after max retries
      if (this.config.fallbackToLocalStorage && this.retryCount >= this.config.retryAttempts) {
        this.saveToLocalStorage(logs);
      }

      // Give up after max retries
      if (this.config.showConnectionStatus && this.retryCount >= this.config.retryAttempts) {
        this.originalConsole.error(`%c❌ DebugLogger: Failed after ${this.retryCount} attempts!`, 'color: #ff0000; font-weight: bold; font-size: 14px');
        this.originalConsole.error(`   🚫 Server: ${this.config.serverUrl}`);
        this.originalConsole.error(`   ⚠️  Error: ${error.message}`);
        if (this.config.fallbackToLocalStorage) {
          this.originalConsole.warn(`   📦 ${logs.length} logs saved to localStorage`);
        } else {
          this.originalConsole.error(`   💔 ${logs.length} logs were dropped`);
        }
      }
    }
  }

  /**
   * Save logs to localStorage as fallback
   * Priority 6: localStorage fallback for production debugging
   */
  saveToLocalStorage(logs) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.config.localStorageKey) || '[]');
      const combined = [...existing, ...logs].slice(-this.config.maxLocalLogs);
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(combined));

      if (this.config.showConnectionStatus && logs.length > 0) {
        this.originalConsole.log(`%c📦 Saved ${logs.length} logs to localStorage`, 'color: #0099ff');
      }
    } catch (e) {
      this.originalConsole.error('Failed to save logs to localStorage:', e);
    }
  }

  /**
   * Log a global error (for window.onerror, unhandledrejection)
   * Priority 6: Integration with global error handlers
   */
  logGlobalError(type, error, additionalInfo = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `[GLOBAL ${type}] ${error?.message || error}`,
      file: error?.fileName || additionalInfo.source || 'unknown',
      session: this.sessionInfo,
      game: this.collectGameContext(),
      errorDetails: {
        type,
        message: error?.message || String(error),
        stack: error?.stack || 'No stack trace',
        ...additionalInfo
      }
    };

    // Queue for remote logging
    if (this.config.batchEnabled) {
      this.logQueue.push(logEntry);
    } else {
      this.sendLog(logEntry);
    }

    // Also save to localStorage immediately for critical errors
    if (this.config.fallbackToLocalStorage) {
      this.saveToLocalStorage([logEntry]);
    }
  }

  /**
   * Test server connection
   */
  async testConnection() {
    // Log connection attempt with details
    this.originalConsole.log(`%c🔌 DebugLogger: Attempting connection...`, 'color: #00ff00; font-weight: bold');
    this.originalConsole.log(`   📍 Server URL: ${this.config.serverUrl}`);
    this.originalConsole.log(`   🌐 Current page: ${window.location.href}`);
    this.originalConsole.log(`   📱 User agent: ${navigator.userAgent.substring(0, 80)}...`);

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.serverUrl}/logs?limit=1`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.isConnected = true;
        if (this.config.showConnectionStatus) {
          this.originalConsole.log(`%c✅ DebugLogger: Connected successfully!`, 'color: #00ff00; font-weight: bold; font-size: 14px');
          this.originalConsole.log(`   ⚡ Response time: ${responseTime}ms`);
          this.originalConsole.log(`   🔗 Connected to: ${this.config.serverUrl}`);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.isConnected = false;
      if (this.config.showConnectionStatus) {
        this.originalConsole.error(`%c❌ DebugLogger: Connection FAILED!`, 'color: #ff0000; font-weight: bold; font-size: 14px');
        this.originalConsole.error(`   🚫 Server URL: ${this.config.serverUrl}`);
        this.originalConsole.error(`   ⚠️  Error: ${error.message}`);
        this.originalConsole.error(`   💡 Tip: Make sure debug server is running on 0.0.0.0:3001`);
        this.originalConsole.warn(`   📋 Logs will be queued (max ${this.config.retryAttempts} retries)`);
      }
    }
  }

  /**
   * Log using original console (bypass interception)
   */
  log(message, level = 'info') {
    this.originalConsole[level](message);
  }

  /**
   * Cleanup
   */
  destroy() {
    // Restore original console methods
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method];
    });

    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Send remaining logs
    if (this.logQueue.length > 0) {
      this.sendBatch();
    }
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  debugLogger.init();
}

export default debugLogger;
