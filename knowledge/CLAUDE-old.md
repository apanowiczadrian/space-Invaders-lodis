# CLAUDE.md

> Project documentation for Claude Code AI assistant

## Project Overview

**LODIS - GALAGA** is a Space Invaders-style arcade game built with p5.js, featuring:
- Cross-platform support (desktop + mobile PWA)
- Endless wave system with progressive difficulty
- Online leaderboard integration (Google Sheets API)
- Weapon heat mechanics and power-up system
- GTA V-inspired game over screen

**Author:** Adrian Apanowicz
**License:** MIT
**Development Platform:** Windows 10/11

---

## ⚠️ CRITICAL: DO NOT EDIT TEXT CONTENT

**IMPORTANT FOR CLAUDE CODE:**
- **NEVER** edit, modify, or "improve" text content in HTML files (index.html)
- This includes: form labels, instructions, error messages, button text, PWA installation steps
- All text content has been **manually crafted and polished** by the developer
- You may ONLY modify: JavaScript logic, CSS styles, code structure
- If you need to add new features, create NEW elements - don't modify existing text

**Examples of what NOT to change:**
- ❌ Form field labels ("Nick", "Email/Hasło")
- ❌ Button text ("ZROBIŁEM, ROZPOCZNIJ GRĘ")
- ❌ PWA installation instructions
- ❌ Error messages ("❌ PWA nie wykryto!")
- ❌ Any user-facing Polish text

**What you CAN modify:**
- ✅ JavaScript logic (event handlers, functions)
- ✅ CSS styles (colors, animations, layouts)
- ✅ Code structure and architecture
- ✅ Add new features with NEW elements

---

## Quick Start

**Windows:**
```cmd
REM Install http-server globally
npm install -g http-server

REM Navigate to project directory
cd C:\Users\Adrian\Documents\Develop\gaming_house\gra

REM Start local server (disable caching)
http-server -c-1

REM Open browser: http://127.0.0.1:8080
```

**IMPORTANT:**
- Game requires landscape orientation on mobile devices
- Mobile browsers: Fully playable without PWA installation
- PWA installation recommended for best fullscreen experience

---

## Architecture

### Tech Stack

- **Rendering:** p5.js (canvas-based)
- **Language:** ES6 JavaScript (modules)
- **Storage:** localStorage + Google Sheets API
- **PWA:** manifest.json (fullscreen, landscape)
- **Fonts:** Google Fonts (Orbitron, Rajdhani, Russo One) + Press Start 2P (local)

### PWA Configuration

**Meta Tags** ([index.html](index.html) lines 15-19):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Why both meta tags?**
- `mobile-web-app-capable` - Modern standard for Android/Chrome (prevents deprecation warnings)
- `apple-mobile-web-app-capable` - Required for iOS Safari (splash screens, fullscreen mode)
- Both tags work together without conflicts

**Chrome DevTools Warning:**
Chrome may show deprecation warning for `apple-mobile-web-app-capable`, suggesting to use only `mobile-web-app-capable`. **This is misleading** - iOS Safari still requires the Apple-specific tag for full PWA functionality. Using both tags is the correct approach for cross-platform compatibility.

**Service Worker Requirements:**
- Requires **HTTPS** (or localhost/127.0.0.1 for development)
- Local IP addresses (192.168.x.x) over HTTP will fail with "Service Worker not supported"
- For local testing on mobile devices, use one of:
  - Chrome flags: `chrome://flags/#unsafety-treat-insecure-origin-as-secure`
  - HTTPS with self-signed certificate (mkcert)
  - USB port forwarding with Chrome DevTools
  - ngrok/localtunnel for public HTTPS tunnel

**Files:**
- [service-worker.js](service-worker.js) - Cache strategy, offline support
- [manifest.json](manifest.json) - App metadata, icons, display mode
- [index.html](index.html) lines 451-465 - Service Worker registration

### Game State Machine

**States** ([js/core/GameStates.js](js/core/GameStates.js)):
- `MENU` → `PLAYING` → `GAME_OVER` → `PLAYING` (restart)

**Flow:**
1. HTML menu (player registration)
2. PWA installation screen (MOBILE ONLY - platform-specific)
3. Game starts with player data from localStorage
4. Game over screen shows leaderboard + stats
5. Restart reuses saved player data

**IMPORTANT:** PWA installation is RECOMMENDED (not required) for mobile devices for optimal fullscreen experience. Desktop users skip PWA flow entirely.

### Fixed Safe Zone System

**Competitive fairness architecture:**
- Desktop: 1000px viewport (1200x600 safe zone scaled down)
- Mobile: 1200px viewport (1200x600 safe zone at full size)
- **ALL gameplay logic uses safe zone coordinates** (1200x600)

**Stable Viewport System:**
- **Mobile Browser (non-PWA):** Uses `window.innerHeight` (stable, doesn't resize when address bar hides/shows)
- **PWA/Standalone:** Uses `window.visualViewport` (handles notches, full-screen mode)
- **Desktop:** Uses `window.visualViewport` or fallback (20px margins)
- **Detection:** `isStandaloneMode()` determines PWA vs browser mode

**Key files:**
- [js/core/constants.js](js/core/constants.js) - SAFE_ZONE dimensions
- [js/core/viewport.js](js/core/viewport.js) - Scaling calculations, standalone detection

### Viewport Stability System (Technical Details)

**Problem Solved:**
Mobile browsers dynamically resize viewport when address bar appears/disappears during scroll. This caused canvas to constantly resize during gameplay (50-100px height changes), creating visual jarring and poor UX.

**Solution Architecture:**

**1. Standalone Detection** ([viewport.js:37-40](js/core/viewport.js#L37-L40))
```javascript
export function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}
```
Detects if app runs in PWA (from home screen) vs browser.

**2. Smart Viewport API Selection** ([viewport.js:46-75](js/core/viewport.js#L46-L75))
```javascript
// Mobile Browser: stable window.innerHeight
if (isMobile && !isStandalone) {
    return { width: window.innerWidth, height: window.innerHeight };
}
// PWA/Desktop: visualViewport (handles notches)
if (window.visualViewport) {
    return { width: window.visualViewport.width, height: window.visualViewport.height };
}
```

**API Differences:**
- `window.innerHeight`: **Stable** - fixed value, ignores browser chrome visibility
- `window.visualViewport.height`: **Dynamic** - actual visible area, changes with address bar

**3. Resize Event Filtering** ([sketch.js:483-500](js/sketch.js#L483-L500))
```javascript
window.visualViewport.addEventListener('resize', () => {
    if (isStandaloneMode()) {  // Only in PWA
        handleResizeEvent(game, resizeCanvas);
    }
    // Browser mode: ignored (viewport is stable via innerHeight)
});
```

**Behavior Matrix:**

| Mode | Viewport API | Resize on Scroll | Notch Handling | Fullscreen |
|------|-------------|------------------|----------------|------------|
| Desktop | visualViewport | No | N/A | No |
| Mobile Browser | innerHeight | **No** ✅ | No | No |
| Mobile PWA | visualViewport | No | Yes ✅ | Yes ✅ |

**Trade-offs:**
- Mobile Browser: Loses notch handling (acceptable - browser has own safe area)
- Mobile Browser: May have address bar visible (acceptable - stable gameplay prioritized)
- PWA: Full notch handling + fullscreen maintained

**Competitive Fairness:**
- Safe zone always 1200x600 virtual coordinates (unchanged)
- Only visual rendering stability improved
- No gameplay mechanics affected

---

## Key Systems

### 1. Player Registration & Data

**HTML Form** ([index.html](index.html) lines 186-229):
- **Nick:** Required, 2-20 chars
- **Email/Password:** Required (min 1 char), used as "prize password" - can be any text, not necessarily email
- **Storage:** localStorage key `spaceInvPlayerData`
- **Auto-fill:** Loads saved data on page load

**IMPORTANT:** StartMenu.js exists but is DISABLED ([Game.js:102](js/Game.js#L102)). Use HTML menu only.

### 2. PWA Installation Flow

**IMPORTANT:** PWA installation is RECOMMENDED but NOT REQUIRED for mobile devices. Game is fully playable in mobile browsers with stable viewport.

**Device Detection:**
- Uses regex + touch detection: `/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window)`
- Checks standalone mode: `window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true` ([viewport.js:37-40](js/core/viewport.js#L37-L40))
- **Desktop:** After form submission → Game starts directly
- **Mobile (in browser):** After form submission → PWA installation screen (can be bypassed)
- **Mobile (in PWA):** After form submission → Game starts directly (no intermediate screens)

**Browser vs PWA Experience:**
- **Mobile Browser:** Stable gameplay, address bar may appear, uses `window.innerHeight` for stability
- **PWA Mode:** Full-screen, no browser chrome, optimal experience, uses `window.visualViewport`

**Mobile PWA Scenarios:**

**Scenario 1: Early PWA Install (Mobile)**
1. User opens page in mobile browser
2. Installs PWA before filling form
3. Opens PWA from home screen
4. Fills form
5. Game starts immediately ✅

**Scenario 2: Guided PWA Install (Mobile)**
1. User opens page in mobile browser
2. Fills form (data saved to localStorage)
3. Sees platform-specific installation instructions
4. Installs PWA
5. Opens PWA from home screen
6. Game starts automatically (data from localStorage) ✅

**Scenario 3: Subsequent Launches (Mobile)**
1. User opens PWA from home screen
2. Game starts immediately (data from localStorage) ✅

**Scenario 4: Desktop (No PWA)**
1. User opens page in desktop browser
2. Fills form (data saved to localStorage)
3. **PWA screen is skipped**
4. Game starts immediately ✅

**Platform Detection (Mobile browser only):**
- **Android:** Shows 3-dot menu instructions
- **iOS:** Shows share button (📤) instructions
- **Note:** If already running in PWA standalone mode, installation screen is skipped entirely

**Implementation:** [index.html](index.html) lines 92-103 (device & standalone detection), lines 231-297 (PWA screens)

**3-Click Fallback Mechanism (Mobile only):**
- PWA installation is RECOMMENDED for optimal fullscreen experience, but game is fully playable without it
- After filling form, user sees platform-specific installation instructions
- Button "ZROBIŁEM, ROZPOCZNIJ GRĘ" validates PWA installation:
  - **Click 1 (no PWA):** Shows error "❌ PWA nie wykryto! Sprawdź czy zainstalowałeś grę z ekranu głównego."
  - **Click 2 (no PWA):** Shows error "❌ Nadal brak PWA! Upewnij się że otworzyłeś ikonę z ekranu głównego."
  - **Click 3 (no PWA):** Button changes to "⚠️ GRAJ BEZ PWA (niestabilna wersja)" - allows starting in browser mode (fully stable since viewport fix)
- Error messages have shake animation for visibility
- **Note:** Since viewport stability improvements, browser mode is now fully playable (no canvas resizing on scroll)

**Runtime PWA Detection:**
- On game start, checks if running in standalone mode ([sketch.js:91-100](js/sketch.js#L91-L100))
- If mobile device not in PWA: logs warning to console + sets `game.pwaWarning = true`
- Console message: "⚠️ Ostrzeżenie: Gra nie działa w trybie PWA. Dla najlepszego doświadczenia uruchom z ikony na ekranie głównym."

### 3. Leaderboard System

**Dual storage:**
- **Local:** localStorage (`spaceInvScores`, top 100)
- **Online:** Google Sheets API with 60s cache
- **Merge strategy:** Deduplicates by `nick + score + time`

**Files:**
- [js/systems/ScoreManager.js](js/systems/ScoreManager.js) - Leaderboard logic
- [js/utils/leaderboardAPI.js](js/utils/leaderboardAPI.js) - API integration

**Display:** Top 4 on game over screen, current player highlighted in gold

**Logging:**
- Success: `✅ poprawnie pobrano wyniki`
- Errors: Only critical errors are logged
- Debug logs (URL, response status, parsed data) have been removed for cleaner console output

**Responsive Game Over Screen:**
- **Small screen detection:** Automatically detects devices with `vh ≤ 620px` (iPhone 13 mini, iPhone 13 Pro, etc.)
- **Adaptive layout:**
  - **Normal screens (vh > 620):** Vertical layout with button centered at bottom
  - **Small screens (vh ≤ 620):** Side-by-side layout with button positioned to the right of leaderboard
- **Implementation:** [GameOverScreen.js](js/ui/GameOverScreen.js) lines 32-42 (detection), lines 280-302 (responsive columns)
- **Prevents crash:** Solves UI overlap issue that caused rendering freeze on wide-aspect mobile devices

### 4. Weapon Heat System

**Mechanics:**
- Heat increases +5 per shot
- Cooling: 20 heat/sec
- Overheated at 100 → unlocks at 50
- Visual heat bar changes color: green → yellow → blue (pulsing blue when frozen)

**File:** [js/systems/WeaponHeatSystem.js](js/systems/WeaponHeatSystem.js)

### 5. Power-ups

**Drop chance:** 8% base + 3% per 10 waves

| Power-up | Effect | Weight | Duration |
|----------|--------|--------|----------|
| ❤️ Life | +1 life (max 3) | 5 (rare) | Permanent |
| 🛡️ Shield | Invulnerability | 20 (common) | 5s |
| 🔥 Auto-fire | Auto-shooting | 15 | 4s |
| 3️⃣ Triple Shot | 3 projectiles | 12 | 5s |
| 🚀 Rocket | +3 rockets | 3 (very rare) | Until used |

**File:** [js/systems/PowerUpManager.js](js/systems/PowerUpManager.js)

### 6. Wave & Difficulty

**Progression:**
- Speed: +8% per wave (capped at 2.5x at wave 20)
- Fire rate: +15% per wave
- Points per kill: `1 + floor(wave / 2)`
- Wave bonus: `wave × 50`

**Pattern system:** [js/config/wavePatterns.js](js/config/wavePatterns.js)

### 7. Performance Optimizations

**Implemented:**
- Object pooling (projectiles, rockets)
- Spatial grid collision detection (100px cells)
- Enemy batch rendering
- Text rendering cache
- `pixelDensity(1)` on mobile (4× performance gain)
- `p5.disableFriendlyErrors` in production

**Files:**
- [js/systems/SpatialGrid.js](js/systems/SpatialGrid.js)
- [js/systems/EnemyBatchRenderer.js](js/systems/EnemyBatchRenderer.js)
- [js/systems/TextCache.js](js/systems/TextCache.js)

### 8. Debug Logger System

**Purpose:** Remote debugging for mobile devices and production environments with device fingerprinting and game context tracking.

**Architecture:**
- **Client:** Intercepts all console.* calls and sends to remote server
- **Server:** Node.js/Express server with web interface and JSONL file logging
- **Auto-initialization:** Enabled on import (no manual setup required)

**Features:**
- Automatic console method interception (log, info, warn, error, debug)
- Batch processing (500ms intervals, max 50 logs per batch)
- Retry logic (3 attempts with 1s delay)
- Source file detection via stack traces
- Network resilience (queues logs when offline)
- Dynamic server URL detection (auto-detects hostname)
- **Device fingerprinting** (session ID, OS, browser, device type, screen info)
- **Game context tracking** (player nick, game state, wave, FPS, lives)
- **JSONL file logging** (debugging/logs/debug-YYYY-MM-DD.jsonl)

**Configuration:** [js/debug/config.js](js/debug/config.js)
```javascript
{
  enabled: true,
  serverUrl: 'http://{hostname}:3001',  // Auto-detects from window.location.hostname
  batchEnabled: true,
  batchInterval: 500,   // ms
  batchMaxSize: 50,     // logs
  retryAttempts: 3,
  fallbackToLocalStorage: true,  // Save logs locally when server unavailable
  localStorageKey: 'debugLogs',
  maxLocalLogs: 100               // Maximum logs to store in localStorage
}
```

**Log Structure:**
```json
{
  "timestamp": "2025-01-10T12:34:56.789Z",
  "level": "info",
  "message": "Game started",
  "file": "sketch.js",
  "session": {
    "id": "abc123-def456-...",
    "deviceType": "Mobile",
    "isPWA": true,
    "os": "Android 14",
    "browser": "Chrome 120.0.0.0",
    "screenResolution": "844x390",
    "viewportSize": "1200x600",
    "pixelRatio": 2.5,
    "orientation": "landscape-primary",
    "touchSupport": true,
    "maxTouchPoints": 5
  },
  "game": {
    "playerNick": "PlayerName",
    "gameState": "PLAYING",
    "wave": 5,
    "fps": 58,
    "lives": 2
  }
}
```

**Server Setup (Windows):**
```cmd
cd debugging
npm install
node server.js
```

**Server Features:**
- REST API (POST endpoint for batched logs)
- In-memory storage (last 500 logs)
- Enhanced colorized console output with device and game info
- Web interface with auto-refresh (http://localhost:3001)
- **JSONL file logging** (debugging/logs/debug-YYYY-MM-DD.jsonl)
- Automatic logs directory creation
- Daily log file rotation

**Console Output Format:**
```
[12:34:56.789] [INFO ] [sketch.js          ] [🌐 Desktop | Windows 10/11 | Chrome 120] Game started
[12:35:01.234] [WARN ] [WeaponHeatSystem.js] [📱 Mobile | Android 14 | Chrome 120] [Adrian W5 58fps] Weapon overheated!
```

**Icons:**
- 🌐 = Browser mode
- 📱 = PWA (standalone mode)

**Network Configuration:**
- Desktop: Connects to `localhost:3001`
- Mobile (same network): Connects to `{desktop-ip}:3001`
- Server listens on `0.0.0.0:3001` (all interfaces)

**Integration:**
- Imported in [js/sketch.js](js/sketch.js) line 4 (before other modules)
- Auto-initializes on module load
- Non-intrusive (preserves original console behavior)

**Files:**
- [js/debug/DebugLogger.js](js/debug/DebugLogger.js) - Client implementation
- [js/debug/config.js](js/debug/config.js) - Configuration
- [debugging/server.js](debugging/server.js) - Node.js server
- [debugging/public/index.html](debugging/public/index.html) - Web interface
- [debugging/logs/*.jsonl](debugging/logs/) - Daily JSONL log files

**Diagnostic Messages:**
- Connection success: `✅ DebugLogger: Connected successfully!`
- Connection failure: `❌ DebugLogger: Connection FAILED!`
- First batch sent: `📤 DebugLogger: First batch sent successfully!`
- Retry attempts: `⚠️ DebugLogger: Connection lost, retrying...`

**Device Detection:**
- **OS:** Android (with version), iOS (with version), Windows 10/11, macOS, Linux
- **Browser:** Chrome, Safari, Firefox, Edge (with versions)
- **Device Type:** Desktop, Mobile, Tablet
- **PWA Mode:** Standalone vs browser detection
- **Screen Info:** Resolution, viewport size, pixel ratio, orientation
- **Touch:** Touch support detection and max touch points

**Game Context (dynamic):**
- **Player Nick:** From localStorage (spaceInvPlayerData)
- **Game State:** MENU, PLAYING, GAME_OVER
- **Wave:** Current wave number
- **FPS:** Real-time FPS from performanceMonitor
- **Lives:** Current player lives

**File Logging:**
- **Format:** JSON Lines (.jsonl) - one JSON object per line
- **File naming:** `debugging/logs/debug-YYYY-MM-DD.jsonl`
- **Rotation:** Automatic daily rotation (new file per day)
- **Parsing:** Easy to parse with `jq`, `grep`, or Python for Claude analysis

**Parsing Examples:**
```bash
# View all logs from Mobile devices
cat debugging/logs/debug-2025-01-10.jsonl | grep '"deviceType":"Mobile"'

# View logs from specific session
cat debugging/logs/debug-2025-01-10.jsonl | grep '"id":"abc123-def456"'

# Pretty print specific log
cat debugging/logs/debug-2025-01-10.jsonl | head -1 | python -m json.tool
```

**Use Cases:**
- Mobile debugging (Android/iOS via network)
- Production error tracking
- Remote QA testing
- Performance monitoring
- Device-specific issue debugging
- Session replay analysis

**localStorage Fallback:**
- **Purpose:** Save logs locally when debug server is unavailable (offline mode, production)
- **Automatic:** Logs saved to localStorage after 3 failed retry attempts
- **Storage:** Up to 100 most recent logs in `localStorage.debugLogs`
- **Format:** Same JSON structure as remote logs
- **Access:** `JSON.parse(localStorage.getItem('debugLogs'))` in browser console

**Global Error Integration:**
- **Automatic logging:** All uncaught errors and promise rejections logged to DebugLogger
- **Immediate save:** Critical errors saved to localStorage immediately (bypasses retry queue)
- **Full context:** Includes error stack, game state, session info in every error log

### 9. Global Error Handling System

**Purpose:** Prevent mobile crashes by catching all errors, providing fallback UIs, and logging for debugging.

**Architecture:**
- **Multi-layer protection:** Global handlers → Try-catch blocks → Input validation
- **Graceful degradation:** Fallback UIs when rendering fails
- **Remote logging:** All errors sent to DebugLogger (with localStorage backup)
- **User-friendly:** Shows actionable error screens instead of freezing

**Implementation Files:**
- [js/sketch.js](js/sketch.js) - Global handlers, critical error screen, try-catch wrapper
- [js/Game.js](js/Game.js) - Critical error handler method
- [js/ui/GameOverScreen.js](js/ui/GameOverScreen.js) - Input validation, try-catch rendering
- [js/utils/analytics.js](js/utils/analytics.js) - Fetch timeout with AbortController
- [js/debug/DebugLogger.js](js/debug/DebugLogger.js) - Global error integration

---

#### Layer 1: Global Error Handlers

**window.onerror** ([sketch.js:149-171](js/sketch.js#L149-L171))
```javascript
window.onerror = function(message, source, lineno, colno, error) {
    console.error('❌ UNCAUGHT ERROR:', { message, source, lineno, colno, error });

    // Log to DebugLogger (remote + localStorage fallback)
    debugLogger.logGlobalError('ERROR', error || new Error(message), {
        source, lineno, colno
    });

    // Show user-friendly error screen
    if (game) {
        game.handleCriticalError(error || new Error(message));
    }

    return true; // Prevent default browser error handling
};
```

**unhandledrejection** ([sketch.js:173-189](js/sketch.js#L173-L189))
```javascript
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ UNHANDLED PROMISE REJECTION:', { reason: event.reason });

    // Log to DebugLogger (remote + localStorage fallback)
    debugLogger.logGlobalError('PROMISE_REJECTION', event.reason);

    // Show user-friendly error screen
    if (game) {
        game.handleCriticalError(event.reason);
    }

    event.preventDefault();
});
```

**Features:**
- Catches **all** uncaught JavaScript errors
- Catches **all** unhandled Promise rejections
- Logs to console + DebugLogger + localStorage
- Shows critical error screen to user
- Prevents browser's default error popup

---

#### Layer 2: Try-Catch in Critical Rendering

**drawGameOverScreen** ([sketch.js:615-656](js/sketch.js#L615-L656))
```javascript
function drawGameOverScreen(deltaTime) {
    try {
        // Normal rendering: stats, leaderboard, animations
        game.gameOverScreen.draw(score, wave, time, playerData, topScores, playerRank);
    } catch (error) {
        console.error('❌ Game over screen crashed:', error);

        // Fallback: Simple game over screen
        push();
        background(30, 30, 35);
        text('GAME OVER', centerX, centerY - 100);
        text(`Score: ${game.score}`, centerX, centerY - 40);
        text(`Wave: ${game.wave}`, centerX, centerY);
        text('Click to Restart', centerX, centerY + 120);
        pop();

        // Allow restart
        if (keyIsDown(32) || mouseIsPressed) {
            game.restartGame();
        }
    }
}
```

**Features:**
- Prevents game over screen crashes from freezing the game
- Shows minimal fallback UI with score/wave
- Always allows restart (SPACE or click)
- Logs error details for debugging

**GameOverScreen.draw()** ([GameOverScreen.js:116-525](js/ui/GameOverScreen.js#L116-L525))
```javascript
draw(score, wave, time, playerData, topScores, playerRank = null) {
    try {
        // Input validation
        if (typeof score !== 'number' || isNaN(score)) {
            console.error('Invalid score:', score);
            score = 0;
        }
        // ... validate all parameters ...

        // Normal rendering
        // ... complex GTA-style UI ...

    } catch (error) {
        console.error('❌ Error rendering game over screen:', error);

        // Fallback rendering
        // ... simple text-based UI ...
    }
}
```

**Features:**
- Validates **all** input parameters before rendering
- Handles NaN, null, undefined gracefully
- Try-catch around rendering logic
- Fallback to simple text UI on any error

---

#### Layer 3: Async Operation Protection

**Analytics Promise Handling** ([sketch.js:593-597](js/sketch.js#L593-L597))
```javascript
sendStatsToGoogleSheets(game.playerData, stats, fpsStats)
    .catch(error => {
        console.error('Failed to send analytics (non-critical):', error);
        // Analytics failure should not crash the game
    });
```

**Fetch Timeout** ([analytics.js:309-347](js/utils/analytics.js#L309-L347))
```javascript
// Add 5s timeout to fetch using AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
    const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal  // Add abort signal
    });

    clearTimeout(timeoutId);
    console.log('✅ poprawnie zapisano wynik do bazy');
    return true;

} catch (fetchError) {
    clearTimeout(timeoutId);

    if (fetchError.name === 'AbortError') {
        console.error('❌ Analytics timeout after 5s');
    } else {
        console.error('❌ Error sending stats:', fetchError);
    }
    return false;
}
```

**Features:**
- **5-second timeout** prevents infinite hangs on slow mobile networks
- **AbortController** cancels fetch request on timeout
- **Nested try-catch:** Outer for fingerprint, inner for fetch
- **Non-blocking:** Analytics failure doesn't affect gameplay

---

#### Layer 4: Critical Error Screen

**Purpose:** User-friendly screen when global error occurs

**Implementation** ([sketch.js:671-709](js/sketch.js#L671-L709))
```javascript
function drawCriticalErrorScreen() {
    push();
    background(30, 0, 0); // Dark red background

    fill(255, 50, 50);
    textSize(48);
    text('CRITICAL ERROR', centerX, centerY - 120);

    fill(255, 200, 200);
    textSize(20);
    text('The game encountered an unexpected error', centerX, centerY - 60);

    if (game.criticalError) {
        fill(255, 255, 200);
        textSize(16);
        text(game.criticalError.message, centerX, centerY - 20);

        fill(200, 200, 200);
        textSize(12);
        text(`Game State: ${game.criticalError.gameState} | Wave: ${game.criticalError.wave} | Score: ${game.criticalError.score}`,
             centerX, centerY + 10);
    }

    fill(255, 255, 255);
    textSize(18);
    text('Check browser console (F12) for details', centerX, centerY + 60);

    fill(100, 200, 100);
    textSize(16);
    text('Press SPACE or click to reload the page', centerX, centerY + 100);
    pop();

    // Allow reload on space or click
    if (keyIsDown(32) || mouseIsPressed) {
        window.location.reload();
    }
}
```

**Features:**
- **Red background** - clearly indicates error state
- **Shows error message** - what went wrong
- **Shows game context** - state, wave, score at time of crash
- **Actionable instructions** - directs to console, allows reload
- **Always functional** - uses simple p5.js primitives (no complex dependencies)

**Game.handleCriticalError()** ([Game.js:813-839](js/Game.js#L813-L839))
```javascript
handleCriticalError(error) {
    console.error('🚨 CRITICAL ERROR DETECTED:', error);

    // Store error details for display
    this.criticalError = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
        gameState: this.gameState,
        wave: this.wave,
        score: this.score
    };

    // Set flag to show error screen
    this.hasCriticalError = true;

    // Log context for debugging
    console.error('Game context at crash:', {
        gameState: this.gameState,
        wave: this.wave,
        score: this.score,
        lives: this.lives,
        enemies: this.enemies?.length || 0,
        playerExists: !!this.player
    });
}
```

---

#### DebugLogger Global Error Integration

**logGlobalError()** ([DebugLogger.js:453-480](js/debug/DebugLogger.js#L453-L480))
```javascript
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
```

**Features:**
- **Immediate localStorage save:** Bypasses retry queue for critical errors
- **Full context:** Includes session info, game state, device info
- **Stack trace:** Preserves error stack for debugging
- **Type tagging:** Distinguishes ERROR vs PROMISE_REJECTION

---

#### Error Recovery Flow

**1. Uncaught Error Occurs**
```
JavaScript Error
    ↓
window.onerror catches it
    ↓
Log to console (with stack trace)
    ↓
Send to DebugLogger → Remote server (if available)
    ↓
Save to localStorage (immediate)
    ↓
game.handleCriticalError() → Set error flag
    ↓
Next draw() frame → Show critical error screen
    ↓
User presses SPACE/click → Reload page
```

**2. Promise Rejection Occurs**
```
Unhandled Promise Rejection
    ↓
unhandledrejection event catches it
    ↓
Log to console (with reason)
    ↓
Send to DebugLogger → Remote server + localStorage
    ↓
game.handleCriticalError() → Set error flag
    ↓
Critical error screen → User can reload
```

**3. Game Over Screen Error**
```
GameOverScreen.draw() throws error
    ↓
Try-catch in drawGameOverScreen() catches it
    ↓
Log error to console
    ↓
Show fallback game over UI (simple text)
    ↓
User can still restart game (SPACE/click)
```

---

#### Common Mobile Crash Scenarios (Now Fixed)

| Scenario | Root Cause | Solution | File |
|----------|-----------|----------|------|
| **Analytics timeout on 3G** | Fetch hangs indefinitely | AbortController 5s timeout | [analytics.js:310](js/utils/analytics.js#L310) |
| **Promise rejection** | No .catch() handler | Added .catch() to analytics | [sketch.js:633](js/sketch.js#L633) |
| **Font loading failure** | textFont() throws error | Try-catch + fallback rendering | [GameOverScreen.js:503](js/ui/GameOverScreen.js#L503) |
| **NaN in score/wave/time** | Math operations fail | Input validation | [GameOverScreen.js:120](js/ui/GameOverScreen.js#L120) |
| **null topScores array** | forEach() throws error | Array.isArray() check | [GameOverScreen.js:136](js/ui/GameOverScreen.js#L136) |
| **GPU memory pressure** | Canvas context lost | Fallback rendering | [sketch.js:665](js/sketch.js#L665) |

---

#### Testing Error Handling

**Trigger test errors in browser console:**

```javascript
// Test uncaught error
throw new Error("Test uncaught error");

// Test promise rejection
Promise.reject(new Error("Test promise rejection"));

// Test invalid game over screen data
game.gameOverScreen.draw(NaN, null, undefined, null, null);

// View saved error logs
JSON.parse(localStorage.getItem('debugLogs'));

// Clear error logs
localStorage.removeItem('debugLogs');
```

**Expected behavior:**
- Error logged to console with full details
- Sent to DebugLogger (if server running)
- Saved to localStorage
- Critical error screen shown
- Game remains responsive (can reload)

---

## File Structure

```
js/
├── sketch.js                    # p5.js entry point, game loop
├── Game.js                      # Main game class, state management
├── core/
│   ├── constants.js             # SAFE_ZONE dimensions
│   ├── viewport.js              # Device detection, scaling
│   ├── input.js                 # Keyboard, mouse, touch handlers
│   └── GameStates.js            # State enum
├── entities/
│   ├── Player.js                # Player ship
│   ├── Enemy.js                 # Enemy types (penguin, boss)
│   ├── Projectile.js            # Projectile pools
│   ├── PowerUp.js               # Power-up classes
│   └── Comet.js                 # Comet obstacles
├── systems/
│   ├── PowerUpManager.js        # Power-up spawning
│   ├── CometManager.js          # Comet management
│   ├── ScoreManager.js          # Leaderboard + localStorage
│   ├── WeaponHeatSystem.js      # Weapon overheat
│   ├── SpatialGrid.js           # Collision optimization
│   ├── EnemyBatchRenderer.js    # Batch rendering
│   └── TextCache.js             # Text rendering cache
├── ui/
│   ├── StartMenu.js             # DISABLED - use HTML menu
│   ├── GameOverScreen.js        # GTA V-style game over (responsive layout for small screens)
│   ├── DevOverlay.js            # Debug overlay (press D)
│   ├── PerformanceMonitor.js    # FPS tracking
│   ├── TouchStrip.js            # Mobile touch controls
│   ├── CanvasButton.js          # Button component
│   └── WeaponHeatBar.js         # Heat meter UI
├── utils/
│   ├── leaderboardAPI.js        # Google Sheets integration
│   └── analytics.js             # Game statistics logging
├── debug/
│   ├── DebugLogger.js           # Remote logging client
│   └── config.js                # Debug logger configuration
└── config/
    └── wavePatterns.js          # Wave configurations

assets/
├── spaceship.png                # Player sprite
├── boss.png                     # Boss enemy
├── penguin/1.png                # Penguin idle frame
├── penguin/2-9.png              # Penguin death animation
├── comet.png                    # Comet obstacle
├── heart.png                    # Life indicator
├── shield.png                   # Power-up icons
├── autofire.png
├── tripleshot.png
├── rocket.png
└── PressStart2P-Regular.ttf     # Pixel font

debugging/
├── server.js                    # Node.js debug server (Express)
├── package.json                 # Server dependencies
├── README.md                    # Debug server documentation
└── public/
    └── index.html               # Web interface for logs

index.html                       # HTML entry + PWA flow
manifest.json                    # PWA manifest
service-worker.js                # PWA service worker
```

---

## Development Guidelines

### ⚠️ Text Content Policy

**CRITICAL RULE: DO NOT MODIFY USER-FACING TEXT**

All text content in HTML files (form labels, buttons, instructions, error messages) has been **manually polished** by the developer. You must NEVER edit, reword, or "improve" this content.

**Allowed modifications:**
- ✅ JavaScript logic and functionality
- ✅ CSS styling and animations
- ✅ Code structure and architecture
- ✅ Adding NEW elements with NEW text (if required by feature)

**FORBIDDEN modifications:**
- ❌ Changing existing text content in HTML
- ❌ "Improving" or rewording Polish text
- ❌ Modifying form labels, buttons, instructions
- ❌ Editing error messages or user feedback

**When adding new features:** Create new HTML elements with your own text, but leave existing text untouched.

---

### Game State Management

**CRITICAL:** Always use state machine properly:

```javascript
// ✅ CORRECT
this.gameState = GameStates.MENU;
this.gameState = GameStates.PLAYING;
this.gameState = GameStates.GAME_OVER;

// ❌ WRONG
this.gameOver = true; // Don't use boolean flags
```

### Coordinate System

**IMPORTANT:** ALL game objects use **safe zone coordinates** (1200x600):

```javascript
// ✅ CORRECT - safe zone coordinates
enemy.x = 100; // 0-1200 range
enemy.y = 50;  // 0-600 range

// Transform to screen when drawing
const screenX = safeZoneX + enemy.x * scaleFactor;
const screenY = safeZoneY + enemy.y * scaleFactor;

// ❌ WRONG - screen coordinates
enemy.x = mouseX; // Don't use raw screen coords
```

### Input Handling

**Desktop:**
- Arrow keys: movement
- Space: fire
- D: dev overlay
- G: god mode (tracked in stats)
- +/-: wave jump (tracked in stats)

**Mobile:**
- Left 35% strip: movement (split left/right)
- Right 35% strip: firing
- Touch converts screen → virtual coords

**File:** [js/core/input.js](js/core/input.js)

### Player Data Flow

**Registration:**
1. HTML form validates nick (required) + email/password (required, min 1 char)
2. Saves to localStorage: `spaceInvPlayerData`
3. PWA screen shows
4. Game receives data via `startGame` event

**Restart:**
1. Uses saved localStorage data
2. No return to menu (direct restart)

### Performance Best Practices

1. **Object Pooling:** Reuse projectiles instead of create/destroy
2. **Spatial Grid:** Use for collision detection (100px cells)
3. **Text Cache:** Cache rendered text for reuse
4. **Batch Rendering:** Group similar draw calls
5. **pixelDensity(1):** Use on mobile for 4× performance

### Leaderboard Integration

```javascript
// Preload on game start (non-blocking)
await scoreManager.preloadLeaderboard(10);

// Save score on game over
scoreManager.saveScore(playerData, score, wave, time);

// Get top scores (async)
const scores = await scoreManager.getTopScores(4);

// Get top scores (sync, uses cache)
const scores = scoreManager.getTopScoresSync(4);
```

**IMPORTANT:** Scores of 0 or negative are NOT saved.

### Analytics & Statistics

**Tracked data:**
- Total shots (by weapon type)
- Power-ups collected
- Game time, shots/sec
- FPS stats (min, max, avg)
- Browser fingerprint
- Cheat detection (god mode, wave jumps)

**File:** [js/utils/analytics.js](js/utils/analytics.js)

**IMPORTANT:** Stats are sent to Google Sheets on game over. Manual review is performed.

**Logging:**
- Success: `✅ poprawnie zapisano wynik do bazy`
- Errors: Only critical errors are logged
- Debug logs (fingerprint collection, payload details) have been removed for cleaner console output

---

## Testing & Debugging

### Dev Overlay (Press D)

Shows:
- FPS (current, avg, min, max) - color-coded
- Device type, virtual resolution
- Safe zone dimensions, scale factor
- Wave info, lives, shield status

### Developer Cheats

**WARNING:** Cheat usage is tracked in statistics.

- **G:** God mode (invulnerability)
- **+/=:** Jump to next wave
- **-/_:** Jump to previous wave

### Debug Server (Remote Logging)

**Purpose:** Monitor console output from mobile devices and remote sessions.

**Start Server (Windows):**
```cmd
cd debugging
npm install
node server.js
```

**Access:**
- **Server console:** Colorized logs in terminal
- **Web interface:** http://localhost:3001
- **Mobile access:** http://{your-ip}:3001

**Features:**
- Real-time log streaming
- Level filtering (INFO, WARN, ERROR, DEBUG)
- Auto-refresh (1s interval)
- Pause/Resume functionality
- Clear logs button
- Statistics display

**Network Setup:**
1. Find your PC's local IP (Windows):
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.10)

2. Server automatically listens on `0.0.0.0:3001` (all interfaces)

3. Game auto-detects server URL based on page hostname:
   - Desktop: `localhost:8080` → connects to `localhost:3001`
   - Mobile: `192.168.1.10:8080` → connects to `192.168.1.10:3001`

**Diagnostic Output:**
- Connection success/failure messages in browser console
- First batch confirmation
- Retry attempts on network errors
- Detailed error messages with troubleshooting tips

**Mobile Testing Workflow:**
1. Start debug server on PC (`node debugging\server.js`)
2. Open game on mobile device (`http://{pc-ip}:8080`)
3. Check mobile browser console for connection status
4. View logs in PC terminal or web interface

### Testing Checklist

**Desktop:**
1. Open game, enter nick (required) and email/password (required)
2. Verify keyboard controls (←, →, SPACE)
3. Play until game over
4. Verify WASTED animation + leaderboard
5. Click RESTART, verify same nick and password saved

**Mobile Browser (without PWA):**
1. Open in landscape mode in mobile browser (Chrome/Safari)
2. Fill form, click through PWA screen (3 clicks to bypass)
3. **Verify canvas does NOT resize when scrolling** (stable viewport)
4. Test touch controls (left strip = move, right strip = fire)
5. Verify FPS 55-60 and stable gameplay
6. Test game over + restart

**Mobile PWA:**
1. Install PWA (before or after form)
2. Launch from home screen icon
3. Test touch controls (left strip = move, right strip = fire)
4. Verify fullscreen mode (no address bar)
5. Verify FPS 55-60
6. Test game over + restart
7. **iPhone 13 mini/Pro:** Verify game over screen shows side-by-side layout (button to the right)

**PWA Flow:**
1. Test early install (before form)
2. Test guided install (after form)
3. Test subsequent launches (auto-start)
4. Verify standalone mode detection
5. **Test viewport stability in both browser and PWA modes**

**Leaderboard:**
1. Play multiple games with different scores
2. Verify top 4 display
3. Verify current player highlighted (gold)
4. Check localStorage: `spaceInvScores`
5. Check online API integration

### Common Issues

**Canvas not showing:**
- Check `canvas.elt.style.display = 'block'` after form submit
- Verify `startGame` event is fired

**Safe zone misalignment:**
- Check viewport calculations in [viewport.js](js/core/viewport.js)
- Verify `updateGameDimensions(game)` is called

**PWA not installing:**
- Ensure manifest.json is served correctly
- Check browser console for errors
- iOS: Must use Safari, use share button
- Android: Use Chrome, 3-dot menu

**Leaderboard not loading:**
- Check Google Sheets API endpoint in [leaderboardAPI.js](js/utils/leaderboardAPI.js)
- Verify CORS settings on Google Apps Script
- Check browser console for fetch errors

**Game over screen crash on small screens (iPhone 13 mini):**
- **Problem:** Game freezes when displaying game over screen on wide-aspect mobile devices (aspect ratio ≥ 2.0, vh ≤ 620px)
- **Root cause:** UI element overlap - restart button (Y=500) overlaps leaderboard rank row (Y=505) by 5px, causing canvas rendering conflicts
- **Devices affected:** iPhone 13 mini (812x375, vh=600), iPhone 13 Pro (844x390, vh=600), similar wide-aspect phones
- **Solution implemented:** Responsive layout in [GameOverScreen.js](js/ui/GameOverScreen.js):
  - Detects small screens: `vh ≤ 620`
  - Side-by-side layout: Button positioned to the right of leaderboard (not below)
  - Leaderboard columns shifted left to make horizontal room
  - Reduced spacing: congratsOffset 30px → 15px on small screens
- **Fixed in:** 2025-01-10 (responsive game over screen)

**Mobile crashes after game over (FIXED 2025-11-13):**
- **Problem:** App freezes on mobile after player death, before showing game over screen
- **Root causes identified:**
  - Analytics fetch hangs indefinitely on slow 3G networks
  - Unhandled Promise rejections from sendStatsToGoogleSheets
  - Font loading failures causing rendering crashes
  - NaN/null values in GameOverScreen parameters
  - No global error handlers - crashes were silent
- **Solutions implemented:**
  - **Global error handlers:** Catch all uncaught errors and promise rejections ([sketch.js:149-189](js/sketch.js#L149-L189))
  - **Fetch timeout:** 5s AbortController timeout for analytics ([analytics.js:310](js/utils/analytics.js#L310))
  - **Promise .catch():** Added to analytics call ([sketch.js:633](js/sketch.js#L633))
  - **Try-catch blocks:** All critical rendering paths wrapped
  - **Input validation:** All GameOverScreen parameters validated
  - **Fallback UIs:** Simple error screens when rendering fails
  - **localStorage logging:** All errors saved locally for debugging
- **Result:** Game now shows error screen instead of freezing, always allows restart/reload

**Debugging mobile crashes:**
1. **View error logs in localStorage:**
   ```javascript
   // In mobile browser console (Chrome Remote Debugging)
   JSON.parse(localStorage.getItem('debugLogs'))
   ```
2. **Trigger test errors:**
   ```javascript
   throw new Error("Test error");
   Promise.reject(new Error("Test promise"));
   ```
3. **Check critical error screen:** Should show red background with error details
4. **Verify restart works:** SPACE or click should reload the page

---

## API Configuration

### Google Sheets Integration

**Endpoint:** [js/utils/leaderboardAPI.js](js/utils/leaderboardAPI.js) line 9
**Current:** `https://script.google.com/macros/s/AKfycbx18SZnL14VGzLQcZddjqMTcK1wE9DKCnn1N4CQXGv_pqFYJHfPPQUXfMpkcVng0fonmQ/exec`

**Actions:**
- `?action=leaderboard&limit=N` - Fetch top N scores
- POST stats to `/exec` - Send analytics data

**Cache:** 60 seconds for leaderboard requests

---

## Additional Notes

### Typography

**Google Fonts:**
- **Orbitron:** Titles, buttons (futuristic)
- **Rajdhani:** Body text, UI (modern)
- **Russo One:** "WASTED" text (GTA V style)

**Local Font:**
- **Press Start 2P:** Pixel art style UI

### Lives & Respawn

- Start with 3 lives
- On hit: 2-second cyan shield (invulnerability)
- Enemy projectiles cleared on respawn
- Game over when lives reach 0

### Enemy Formation

**Unified movement:**
- All enemies share `game.formationDirection`
- Formation reverses when ANY enemy hits boundary
- All descend together on reverse
- Individual `isFlying` state during spawn

### Mobile Optimizations

- **Stable Viewport System:** Prevents canvas resizing when browser address bar hides/shows
- **Smart API Selection:** `window.innerHeight` for browsers, `visualViewport` for PWA
- **Resize Event Filtering:** Ignores scroll-triggered resizes in browser mode ([sketch.js:483-500](js/sketch.js#L483-L500))
- Safe area insets for iOS notches (PWA mode)
- Orientation lock to landscape (PWA manifest)
- Prevent pinch-to-zoom
- Prevent double-tap-to-zoom

---

## Version History

- **2025-11-13:**
  - **Global Error Handling System** (critical mobile crash prevention):
    - **Global error handlers:** window.onerror + unhandledrejection ([sketch.js:149-189](js/sketch.js#L149-L189))
    - **Critical error screen:** User-friendly error UI with reload option ([sketch.js:671-709](js/sketch.js#L671-L709))
    - **Try-catch protection:** drawGameOverScreen + GameOverScreen.draw() with fallback UIs
    - **Input validation:** All parameters validated in GameOverScreen.draw() (NaN, null, undefined)
    - **Async protection:** 5s timeout for analytics fetch with AbortController ([analytics.js:310](js/utils/analytics.js#L310))
    - **Promise handling:** .catch() added to sendStatsToGoogleSheets ([sketch.js:633](js/sketch.js#L633))
  - **DebugLogger enhancements:**
    - **localStorage fallback:** Saves up to 100 logs locally when server unavailable ([config.js:40-42](js/debug/config.js#L40-L42))
    - **Global error integration:** logGlobalError() method for critical errors ([DebugLogger.js:453-480](js/debug/DebugLogger.js#L453-L480))
    - **Immediate save:** Critical errors bypass retry queue, saved directly to localStorage
    - **Full context:** Every error log includes session info, game state, stack trace
  - Simplified logging for Google Sheets integration:
    - Leaderboard: Only shows `✅ poprawnie pobrano wyniki` on success
    - Analytics: Only shows `✅ poprawnie zapisano wynik do bazy` on success
    - Removed verbose debug logs (URL, response status, fingerprint details, parsed data)
    - Retained critical error messages for debugging
- **2025-01-10:**
  - Fixed game over screen crash on iPhone 13 mini (responsive layout for small screens)
  - Added Debug Logger System (remote logging for mobile debugging)
  - **Enhanced Debug Logger with device fingerprinting:**
    - Session ID (UUID v4) for tracking individual sessions
    - OS detection (Android, iOS, Windows, macOS, Linux with versions)
    - Browser detection (Chrome, Safari, Firefox, Edge with versions)
    - Device type detection (Desktop, Mobile, Tablet)
    - PWA mode detection (standalone vs browser)
    - Screen info (resolution, viewport, pixel ratio, orientation, touch support)
  - **Game context tracking in logs:**
    - Player nick from localStorage
    - Game state (MENU, PLAYING, GAME_OVER)
    - Current wave number
    - Real-time FPS
    - Player lives
  - **JSONL file logging:**
    - One JSON object per line for easy parsing
    - Daily rotation (debug-YYYY-MM-DD.jsonl)
    - Automatic logs directory creation
  - **Enhanced server console output:**
    - Device info display (OS, browser, device type)
    - Game context display (player nick, wave, FPS)
    - PWA/browser mode icons (📱/🌐)
  - Network configuration for cross-device debugging (0.0.0.0 server binding)
  - Dynamic server URL detection (auto-detects hostname)
- **2025-01-09:** Viewport stability improvements (stable viewport in mobile browsers)

**Claude Code Version:** For Claude Code AI assistant
