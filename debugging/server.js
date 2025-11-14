const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory log storage (last 500 logs)
const logs = [];
const MAX_LOGS = 500;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper: Get color for log level
function getColorForLevel(level) {
  switch (level) {
    case 'error': return colors.red;
    case 'warn': return colors.yellow;
    case 'info': return colors.blue;
    case 'debug': return colors.cyan;
    default: return colors.white;
  }
}

// Helper: Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').substring(0, 23);
}

// Helper: Ensure logs directory exists
function ensureLogsDirectory() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Created logs directory: ${logsDir}`);
  }
}

// Helper: Save log to file (JSONL format)
function saveLogToFile(logEntry) {
  ensureLogsDirectory();

  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(__dirname, 'logs', `debug-${today}.jsonl`);

  // Create JSONL entry (one JSON object per line)
  const jsonLine = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logFile, jsonLine, (err) => {
    if (err) {
      console.error(`${colors.red}Failed to write to log file:${colors.reset}`, err.message);
    }
  });
}

// Endpoint: Receive log via GET
app.get('/log', (req, res) => {
  const { message, level = 'info', file = 'unknown', timestamp } = req.query;

  if (!message) {
    return res.status(400).json({ error: 'Message parameter is required' });
  }

  const logEntry = {
    message: decodeURIComponent(message),
    level: level.toLowerCase(),
    file: file,
    timestamp: timestamp ? parseInt(timestamp) : Date.now()
  };

  // Add to in-memory storage
  logs.push(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.shift(); // Remove oldest log
  }

  // Print to server console with colors
  const color = getColorForLevel(logEntry.level);
  const timeStr = formatTimestamp(logEntry.timestamp);
  const levelStr = logEntry.level.toUpperCase().padEnd(5);
  const fileStr = logEntry.file.padEnd(30);

  console.log(
    `${colors.dim}[${timeStr}]${colors.reset} ` +
    `${color}[${levelStr}]${colors.reset} ` +
    `${colors.magenta}[${fileStr}]${colors.reset} ` +
    `${logEntry.message}`
  );

  // Optionally save to file
  // saveLogToFile(logEntry);

  res.json({ success: true, logged: logEntry });
});

// Endpoint: Receive log via POST (for batching)
app.post('/log', (req, res) => {
  const { logs: batchLogs } = req.body;

  if (!batchLogs || !Array.isArray(batchLogs)) {
    return res.status(400).json({ error: 'logs array is required' });
  }

  batchLogs.forEach(logData => {
    // Store complete log entry with session and game context
    const logEntry = {
      timestamp: logData.timestamp || new Date().toISOString(),
      level: (logData.level || 'info').toLowerCase(),
      message: logData.message || '',
      file: logData.file || 'unknown',
      session: logData.session || null,
      game: logData.game || null
    };

    // Add to in-memory storage
    logs.push(logEntry);
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }

    // Print to server console with device info
    const color = getColorForLevel(logEntry.level);
    const timeStr = typeof logEntry.timestamp === 'string'
      ? logEntry.timestamp.substring(11, 23)
      : formatTimestamp(logEntry.timestamp);
    const levelStr = logEntry.level.toUpperCase().padEnd(5);
    const fileStr = logEntry.file.padEnd(20);

    // Device info (if available)
    let deviceInfo = '';
    if (logEntry.session) {
      const { deviceType, os, browser, isPWA } = logEntry.session;
      const pwaIcon = isPWA ? '📱' : '🌐';
      deviceInfo = `${colors.dim}[${pwaIcon} ${deviceType} | ${os} | ${browser}]${colors.reset} `;
    }

    // Game info (if available)
    let gameInfo = '';
    if (logEntry.game && logEntry.game.playerNick) {
      const { playerNick, wave, fps } = logEntry.game;
      const waveStr = wave ? `W${wave}` : '';
      const fpsStr = fps ? `${Math.round(fps)}fps` : '';
      gameInfo = `${colors.cyan}[${playerNick}${waveStr ? ' ' + waveStr : ''}${fpsStr ? ' ' + fpsStr : ''}]${colors.reset} `;
    }

    console.log(
      `${colors.dim}[${timeStr}]${colors.reset} ` +
      `${color}[${levelStr}]${colors.reset} ` +
      `${colors.magenta}[${fileStr}]${colors.reset} ` +
      `${deviceInfo}${gameInfo}` +
      `${logEntry.message}`
    );

    // Save to file (JSONL format)
    saveLogToFile(logEntry);
  });

  res.json({ success: true, count: batchLogs.length });
});

// Endpoint: Get all logs as JSON
app.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || logs.length;
  const recentLogs = logs.slice(-limit);
  res.json({ logs: recentLogs, total: logs.length });
});

// Endpoint: Clear logs
app.delete('/logs', (req, res) => {
  const count = logs.length;
  logs.length = 0;
  console.log(`${colors.yellow}Cleared ${count} logs${colors.reset}`);
  res.json({ success: true, cleared: count });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}LODIS - GALAGA Debug Server${colors.reset}`);
  console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
  console.log(`${colors.green}✓${colors.reset} Server running on ${colors.bright}http://0.0.0.0:${PORT}${colors.reset}`);
  console.log(`${colors.green}✓${colors.reset} Web interface: ${colors.bright}http://localhost:${PORT}${colors.reset}`);
  console.log(`${colors.green}✓${colors.reset} Log endpoint: ${colors.bright}http://localhost:${PORT}/log${colors.reset}`);
  console.log(`${colors.green}✓${colors.reset} API endpoint: ${colors.bright}http://localhost:${PORT}/logs${colors.reset}`);
  console.log(`${colors.bright}${colors.green}========================================${colors.reset}\n`);
  console.log(`${colors.dim}Waiting for logs...${colors.reset}\n`);
});
