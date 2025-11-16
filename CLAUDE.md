---
project: LODIS GALAGA
version: 2.0.0
last_updated: 2025-11-16
ai_assistant: Claude Code
author: Adrian Apanowicz
license: MIT
platform: Windows 10/11
tech_stack: p5.js, PWA, Google Sheets API, localStorage
---

# CLAUDE.md

> **AI Assistant Guide** for LODIS GALAGA Space Shooter Game

Space Invaders-style arcade game with cross-platform support (desktop + mobile PWA), endless wave system, online leaderboard, weapon heat mechanics, power-ups, and GTA V-inspired game over screen.

---

<!-- SECTION:critical-rules -->
## 🔴 CRITICAL RULES (READ FIRST)

### ⛔ NEVER EDIT TEXT CONTENT

**HTML text (labels, buttons, instructions) = OFF LIMITS**

All Polish UI strings have been **manually crafted and polished** by the developer. You must NEVER edit, reword, or "improve" this content.

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
- ✅ Add NEW elements with NEW text (if required by feature)

**Violation = Rejected Work**

### 🎯 Core Constraints

1. **Coordinate System**: All game logic uses **SAFE_ZONE coords (1200x600)**, never screen coords
2. **State Management**: Always use `GameStates` enum, never boolean flags
3. **Mobile Performance**: `pixelDensity(1)` only on mobile (performance critical)
4. **Production Logging**: Zero `console.log` in production, use DebugLogger for remote debugging

**Keywords**: `#rules #constraints #critical #text-policy`

---

<!-- SECTION:quick-start -->
## ⚡ Quick Start

### For Claude: Common Tasks

| Task | Primary Files | Key Functions/Lines |
|------|--------------|---------------------|
| **Fix PWA flow** | [pwa-install.html:252-257](pwa-install.html#L252-L257), [shared/pwa-detection.js](shared/pwa-detection.js) | Auto-trigger native prompt (3s), Opera detection, button states |
| **Adjust difficulty** | [wavePatterns.js](js/config/wavePatterns.js) | Pattern configs, speed multipliers |
| **Debug mobile crash** | [sketch.js:149-189](js/sketch.js#L149-L189) | Global error handlers |
| **Leaderboard API** | [leaderboardAPI.js:9](js/utils/leaderboardAPI.js#L9) | `GOOGLE_SHEETS_ENDPOINT` |
| **Viewport scaling** | [viewport.js:46-75](js/core/viewport.js#L46-L75) | `getViewportDimensions()` |
| **Game state flow** | [Game.js](js/Game.js), [GameStates.js](js/core/GameStates.js) | State machine transitions |
| **Power-up system** | [PowerUpManager.js](js/systems/PowerUpManager.js) | Drop rates, weighted selection |
| **Error handling** | [sketch.js:615-656](js/sketch.js#L615-L656) | Try-catch wrappers, fallback UIs |

### For Developers: Local Setup

**Windows:**
```cmd
npm install -g http-server
cd C:\Users\Adrian\Documents\Develop\gaming_house\gra
http-server -c-1
# Open: http://127.0.0.1:8080
```

**Requirements:**
- Landscape orientation on mobile
- PWA installation recommended (game fully playable in browsers)
- HTTPS required for PWA service worker (or localhost/127.0.0.1)

**Keywords**: `#quickstart #setup #common-tasks`

---

<!-- SECTION:architecture -->
## 🏗️ Architecture

**Keywords**: `#architecture #system-design #core`

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Rendering** | p5.js (canvas) | Game graphics, animations |
| **Language** | ES6 JavaScript (modules) | Code organization |
| **Storage** | localStorage + Google Sheets API | Local scores + cloud leaderboard |
| **PWA** | manifest.json, service-worker.js | Offline support, fullscreen mode |
| **Fonts** | Orbitron, Rajdhani, Russo One, Press Start 2P | UI typography |

### State Machine
<!-- SUBSECTION:state-machine -->

**Flow**: `MENU` → `PLAYING` → `GAME_OVER` → `PLAYING` (restart)

```javascript
// ✅ CORRECT - Use state machine
this.gameState = GameStates.MENU;
this.gameState = GameStates.PLAYING;
this.gameState = GameStates.GAME_OVER;

// ❌ WRONG - No boolean flags
this.gameOver = true;
this.isPaused = true;
```

**Files**: [GameStates.js](js/core/GameStates.js), [Game.js:102](js/Game.js#L102)

**Why?** Prevents invalid state transitions, easier debugging, clearer code flow.

**Keywords**: `#state-machine #game-flow`

---

### Viewport System
<!-- SUBSECTION:viewport-system -->

**Problem Solved**: Mobile browser address bar causes canvas resize on scroll (50-100px jumps) → visual jarring.

**Solution**: Stable viewport API selection based on device mode.

| Mode | Viewport API | Resize on Scroll | Notch Handling | Fullscreen |
|------|-------------|------------------|----------------|------------|
| Desktop | `visualViewport` | No | N/A | No |
| Mobile Browser | `window.innerHeight` | ✅ **No (stable)** | No | No |
| Mobile PWA | `visualViewport` | No | ✅ Yes | ✅ Yes |

**Implementation** ([viewport.js:46-75](js/core/viewport.js#L46-L75)):
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

**Resize Event Filtering** ([sketch.js:483-500](js/sketch.js#L483-L500)):
```javascript
window.visualViewport.addEventListener('resize', () => {
    if (isStandaloneMode()) {  // Only in PWA
        handleResizeEvent(game, resizeCanvas);
    }
    // Browser mode: ignored (stable via innerHeight)
});
```

**Trade-offs:**
- Mobile Browser: Loses notch handling (acceptable - browser has own safe area)
- Mobile Browser: Address bar may be visible (acceptable - stable gameplay prioritized)
- PWA: Full notch handling + fullscreen maintained

**Files**: [viewport.js](js/core/viewport.js), [constants.js](js/core/constants.js)

**Keywords**: `#viewport #mobile #stability #pwa`

---

### Safe Zone System
<!-- SUBSECTION:safe-zone -->

**Competitive Fairness**: All players use same **1200x600 virtual coordinates** regardless of screen size.

- **Desktop**: 1000px viewport → safe zone scaled down
- **Mobile**: 1200px viewport → safe zone at full size
- **ALL game logic**: Uses safe zone coords (never screen coords)

**Pattern**: Coordinate Transformation
```javascript
// ✅ CORRECT - Safe zone coordinates for game objects
enemy.x = 100;  // 0-1200 range (SAFE_ZONE)
enemy.y = 50;   // 0-600 range (SAFE_ZONE)

// Transform to screen when drawing
const screenX = safeZoneX + enemy.x * scaleFactor;
const screenY = safeZoneY + enemy.y * scaleFactor;

// ❌ WRONG - Never use raw screen coordinates
enemy.x = mouseX; // Breaks on different viewports
```

**Files**: [constants.js](js/core/constants.js), [viewport.js](js/core/viewport.js)

**Keywords**: `#coordinates #safe-zone #fairness`

---

### PWA Configuration
<!-- SUBSECTION:pwa-configuration -->

> **⚠️ CRITICAL - DO NOT MODIFY PWA FILES**
>
> PWA configuration is **STABLE** and tested on both localhost and GitHub Pages subdirectory.
> Modifying manifest paths or service worker will break installation on GitHub Pages.
> **Files protected**: [manifest.json](manifest.json), [service-worker.js](service-worker.js), all HTML `<link rel="manifest">` tags

**Universal Path System** (works on localhost AND GitHub Pages):

**HTML files** - Relative paths without leading slash:
```html
<link rel="manifest" href="manifest.json">  <!-- ✅ Universal -->
<link rel="manifest" href="/manifest.json"> <!-- ❌ Breaks on subdirectory -->
```

**manifest.json** - Relative scope and paths:
```json
{
  "scope": "./",              // ✅ Relative scope (works everywhere)
  "id": "./",                 // ✅ Unique PWA identifier
  "start_url": "game.html",   // ✅ Relative path
  "icons": [
    { "src": "assets/spaceship512.png", "purpose": "any maskable" } // Android adaptive
  ]
}
```

**service-worker.js** - Dynamic base path detection:
```javascript
const getBasePath = () => {
  const swPath = self.location.pathname;
  return swPath.substring(0, swPath.lastIndexOf('/') + 1);
};
// localhost: basePath = "/"
// GitHub Pages: basePath = "/galaga/"
const urlsToCache = [`${basePath}manifest.json`, ...];
```

**Why This Works:**
- **Localhost**: `http://localhost:8080/` → basePath = `/` → cache `/manifest.json` ✅
- **GitHub Pages**: `https://user.github.io/galaga/` → basePath = `/galaga/` → cache `/galaga/manifest.json` ✅
- **Universal**: Same code works in both environments without modification

**Meta Tags** ([index.html:15-19](index.html#L15-L19)):
```html
<meta name="mobile-web-app-capable" content="yes">        <!-- Android/Chrome -->
<meta name="apple-mobile-web-app-capable" content="yes">  <!-- iOS Safari -->
```

**Why Both Tags?**
- `mobile-web-app-capable`: Modern standard for Android/Chrome
- `apple-mobile-web-app-capable`: Required for iOS splash screens, fullscreen mode
- Both work together without conflicts (Chrome DevTools warning is misleading)

**Service Worker Requirements:**
- ✅ HTTPS (or localhost/127.0.0.1)
- ❌ Local IP (192.168.x.x) over HTTP = fails

**Installation Flow**:

**Mobile Browser (enforced):**
1. User opens index.html → auto-redirects to pwa-install.html
2. Shows platform-specific instructions (all end with 🚀 "Uruchom grę z pulpitu"):
   - **Android**: 4 steps (menu → dodaj do ekranu → info PWA → uruchom z pulpitu)
   - **Opera Mobile**: 6 steps (3 kropki → dodaj do → ekran główny → info PWA → ostrzeżenie o przeglądarce → uruchom z pulpitu)
   - **iOS**: 4 steps (udostępnij 📤 → dodaj do ekranu → potwierdź → uruchom z pulpitu)
3. **3-State Button System**:
   - **State 1**: "Dodaj grę do ekranu" - triggers native install prompt (Chromium only, requires user gesture)
   - **State 2**: "Uruchomić grę bez PWA?" - 2s cooldown before enabling State 3
   - **State 3**: "Graję w niestabilną grę" - launches game/menu based on localStorage
4. If installed: Desktop auto-opens PWA, Mobile requires manual icon tap

**Desktop:**
- Skips PWA screen entirely (index.html → game.html or start-menu.html)

**Native Install Prompt** (Chromium browsers only):
- Captured via `beforeinstallprompt` event (requires HTTPS or localhost)
- Button triggers prompt on click (user gesture required by browser security)
- If dismissed or unavailable: button shows State 2 fallback
- Safari iOS: No native prompt support (manual instructions only)

**Files**: [service-worker.js](service-worker.js), [manifest.json](manifest.json), [pwa-install.html](pwa-install.html), [shared/pwa-detection.js](shared/pwa-detection.js)

**Keywords**: `#pwa #mobile #installation #offline #github-pages #universal-paths`

---

<!-- SECTION:game-systems -->
## 🎮 Game Systems

**Keywords**: `#gameplay #mechanics #systems`

### Player Registration
<!-- SUBSECTION:player-registration -->

**Flow**: HTML form → localStorage → PWA screen (mobile only) → Game start

**Data Structure** (localStorage key: `spaceInvPlayerData`):
```javascript
{
  nick: "PlayerName",    // Required, 2-20 chars
  email: "password123"   // Required, min 1 char (NOT necessarily email - used as "prize password")
}
```

**Important**: StartMenu.js **DISABLED** ([Game.js:102](js/Game.js#L102)). Use HTML menu only.

**Files**: [index.html:186-229](index.html#L186-L229)

**Keywords**: `#player #registration #localstorage`

---

### Wave & Difficulty
<!-- SUBSECTION:wave-difficulty -->

**Progression Table**:

| Wave | Speed | Fire Rate | Points/Kill | Wave Bonus |
|------|-------|-----------|-------------|------------|
| 1 | 1.0x | Base | 1 | 50 |
| 5 | 1.32x | +75% | 3 | 250 |
| 10 | 1.72x | +150% | 5 | 500 |
| 20 | 2.5x (capped) | +300% | 10 | 1000 |

**Formula**:
- Speed: `+8% per wave` (max 2.5x at wave 20)
- Fire rate: `+15% per wave`
- Points: `1 + floor(wave / 2)`
- Bonus: `wave × 50`

**Files**: [wavePatterns.js](js/config/wavePatterns.js), [CometManager.js](js/systems/CometManager.js)

**Keywords**: `#difficulty #progression #balance`

---

### Weapon Heat & Power-ups
<!-- SUBSECTION:weapon-heat-powerups -->

**Weapon Heat Mechanics**:
- Heat: +5 per shot
- Cooling: 20/sec
- Overheat at 100 → unlocks at 50
- Visual: green → yellow → blue (pulsing when frozen)

**Power-up Drop Chance**: `8% base + 3% per 10 waves`

| Icon | Name | Effect | Weight | Duration |
|------|------|--------|--------|----------|
| ❤️ | Life | +1 life (max 3) | 5 (rare) | Permanent |
| 🛡️ | Shield | Invulnerability | 20 (common) | 5s |
| 🔥 | Auto-fire | Auto-shooting | 15 | 4s |
| 3️⃣ | Triple Shot | 3 projectiles | 12 | 5s |
| 🚀 | Rocket | +3 rockets | 3 (very rare) | Until used |

**Files**: [WeaponHeatSystem.js](js/systems/WeaponHeatSystem.js), [PowerUpManager.js](js/systems/PowerUpManager.js)

**Keywords**: `#weapons #powerups #mechanics`

---

### Leaderboard System
<!-- SUBSECTION:leaderboard -->

**Data Storage**:
- **Saving**: localStorage (`spaceInvScores`, top 100) + Google Sheets API
- **Display**: Google Sheets API only (no localStorage fallback)
- **Deduplication**: By nick only (one player = one entry with best score)
- **Cache**: 60s for Google Sheets API requests

**Display Logic**:
- Top 4 on game over screen, current player highlighted in gold
- Top 100 on leaderboard.html page
- Each player appears only once with their highest score
- Ties broken by fastest time

**API Usage**:
```javascript
// Preload on game start (non-blocking, deduplicated by nick)
await scoreManager.preloadLeaderboard(10);

// Save score on game over (0 or negative NOT saved)
scoreManager.saveScore(playerData, score, wave, time);

// Get top scores with unique nicks (async) - RECOMMENDED
const scores = await scoreManager.getTopScoresUniqueNicks(100);

// Get top scores with unique nicks (sync, uses cache) - RECOMMENDED
const scores = scoreManager.getTopScoresUniqueNicksSync(4);

// DEPRECATED methods (use above instead):
// const scores = await scoreManager.getTopScores(4);
// const scores = scoreManager.getTopScoresSync(4);
```

**Player Rank Logic**:
- Uses same deduplicated data as leaderboard display
- Prevents "congratulations" bug (showing wrong rank)
- Returns null if player not in online leaderboard cache

**Responsive Game Over Screen**:
- **Small screens (vh ≤ 620)**: Side-by-side layout (button to right of leaderboard)
- **Normal screens**: Vertical layout (button centered at bottom)
- **Prevents crash**: Solves UI overlap issue on iPhone 13 mini/Pro

**Files**: [ScoreManager.js](js/systems/ScoreManager.js), [leaderboardAPI.js](js/utils/leaderboardAPI.js), [GameOverScreen.js:32-42](js/ui/GameOverScreen.js#L32-L42)

**Keywords**: `#leaderboard #scores #api`

---

### Performance Optimizations
<!-- SUBSECTION:performance -->

**Implemented**:
- ✅ Object pooling (projectiles, rockets) - avoid GC pressure
- ✅ Spatial grid collision detection (100px cells) - O(n²) → O(n)
- ✅ Enemy batch rendering - reduce draw calls
- ✅ Text rendering cache - reuse rendered text
- ✅ `pixelDensity(1)` on mobile - 4× performance gain
- ✅ `p5.disableFriendlyErrors` in production

**Pattern**: Mobile Performance
```javascript
// ✅ CORRECT - Low pixel density on mobile
if (isMobile) {
    pixelDensity(1); // 4x FPS improvement
}

// ✅ CORRECT - Object pooling
const projectile = this.projectilePool.acquire();

// ✅ CORRECT - Spatial grid for collisions
const nearbyEnemies = spatialGrid.query(x, y, radius);

// ❌ WRONG - Creating objects in game loop
const projectile = new Projectile(); // GC pressure
```

**Files**: [SpatialGrid.js](js/systems/SpatialGrid.js), [EnemyBatchRenderer.js](js/systems/EnemyBatchRenderer.js), [TextCache.js](js/systems/TextCache.js)

**Keywords**: `#performance #optimization #mobile`

---

<!-- SECTION:debugging -->
## 🐛 Debugging & Error Handling

**Keywords**: `#debugging #errors #logging`

### Debug Logger System
<!-- SUBSECTION:debug-logger -->

**Purpose**: Remote debugging for mobile devices with device fingerprinting and game context tracking.

**Features**:
- Auto-intercepts all `console.*` calls → sends to remote server
- Batch processing (500ms intervals, max 50 logs)
- Retry logic (3 attempts) + localStorage fallback
- Device fingerprinting (OS, browser, screen info, PWA mode)
- Game context tracking (player nick, state, wave, FPS, lives)
- JSONL file logging (`debugging/logs/debug-YYYY-MM-DD.jsonl`)

**Server Setup** (Windows):
```cmd
cd debugging
npm install
node server.js
# Access: http://localhost:3001 (or http://{your-ip}:3001 from mobile)
```

**Console Output Format**:
```
[12:34:56.789] [INFO ] [sketch.js] [🌐 Desktop | Windows 10 | Chrome 120] Game started
[12:35:01.234] [WARN ] [WeaponHeatSystem.js] [📱 Mobile | Android 14 | Chrome 120] [Adrian W5 58fps] Weapon overheated
```

**localStorage Fallback**:
- Saves up to 100 logs locally when server unavailable
- Access: `JSON.parse(localStorage.getItem('debugLogs'))`

**Files**: [DebugLogger.js](js/debug/DebugLogger.js), [config.js](js/debug/config.js), [debugging/server.js](debugging/server.js)

**Keywords**: `#debug-logger #remote-logging #mobile-debugging`

---

### Global Error Handling
<!-- SUBSECTION:error-handling -->

**Architecture**: Multi-layer protection to prevent mobile crashes.

**Layer 1: Global Handlers** ([sketch.js:149-189](js/sketch.js#L149-L189))
- `window.onerror`: Catches all uncaught errors
- `unhandledrejection`: Catches all unhandled Promise rejections
- Logs to console + DebugLogger + localStorage
- Shows critical error screen (red background, actionable instructions)

**Layer 2: Try-Catch Wrappers** ([sketch.js:615-656](js/sketch.js#L615-L656))
```javascript
function drawGameOverScreen(deltaTime) {
    try {
        // Normal rendering
        game.gameOverScreen.draw(score, wave, time, playerData, topScores, playerRank);
    } catch (error) {
        console.error('❌ Game over screen crashed:', error);
        // Fallback: Simple text UI
        text('GAME OVER', centerX, centerY - 100);
        text(`Score: ${game.score}`, centerX, centerY - 40);
        // Always allow restart
        if (keyIsDown(32) || mouseIsPressed) {
            game.restartGame();
        }
    }
}
```

**Layer 3: Input Validation** ([GameOverScreen.js:116](js/ui/GameOverScreen.js#L116))
- Validates all parameters (NaN, null, undefined)
- Handles edge cases gracefully
- Fallback rendering on any error

**Layer 4: Async Protection** ([analytics.js:310](js/utils/analytics.js#L310))
- 5s timeout for fetch using AbortController
- `.catch()` handlers on all Promises
- Non-blocking (analytics failure doesn't crash game)

**Common Mobile Crash Scenarios** (FIXED 2025-11-13):

| Scenario | Root Cause | Solution |
|----------|-----------|----------|
| Analytics timeout on 3G | Fetch hangs indefinitely | AbortController 5s timeout |
| Promise rejection | No .catch() handler | Added .catch() to analytics |
| Font loading failure | textFont() throws error | Try-catch + fallback rendering |
| NaN in score/wave/time | Math operations fail | Input validation |
| null topScores array | forEach() throws error | Array.isArray() check |
| GPU memory pressure | Canvas context lost | Fallback rendering |

**Testing Error Handling**:
```javascript
// Test uncaught error
throw new Error("Test uncaught error");

// Test promise rejection
Promise.reject(new Error("Test promise rejection"));

// View saved error logs
JSON.parse(localStorage.getItem('debugLogs'));
```

**Files**: [sketch.js](js/sketch.js), [Game.js:813-839](js/Game.js#L813-L839), [GameOverScreen.js](js/ui/GameOverScreen.js), [analytics.js](js/utils/analytics.js)

**Keywords**: `#error-handling #crash-prevention #fallback-ui`

---

<!-- SECTION:file-reference -->
## 📁 File Reference

**Keywords**: `#files #structure #reference`

### 🎯 Core Files (Modify Often)

| File | Purpose | Key Exports | Lines |
|------|---------|-------------|-------|
| [sketch.js](js/sketch.js) | p5.js entry, game loop, global error handlers | `setup()`, `draw()`, `windowResized()` | ~700 |
| [Game.js](js/Game.js) | Main game class, state management | `Game`, `restartGame()`, `handleCriticalError()` | ~850 |
| [GameStates.js](js/core/GameStates.js) | State enum | `MENU`, `PLAYING`, `GAME_OVER` | ~10 |
| [viewport.js](js/core/viewport.js) | Viewport logic, device detection | `getViewportDimensions()`, `isStandaloneMode()` | ~150 |
| [input.js](js/core/input.js) | Input handling (keyboard, mouse, touch) | `setupInputHandlers()` | ~200 |
| [constants.js](js/core/constants.js) | SAFE_ZONE dimensions, global constants | `SAFE_ZONE` object | ~50 |

### 🎮 Game Systems (Modify Sometimes)

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| [PowerUpManager.js](js/systems/PowerUpManager.js) | Power-up spawning, weighted selection | `PowerUpManager`, `spawnPowerUp()` |
| [WeaponHeatSystem.js](js/systems/WeaponHeatSystem.js) | Weapon overheat mechanics | `WeaponHeatSystem`, `addHeat()`, `cool()` |
| [ScoreManager.js](js/systems/ScoreManager.js) | Leaderboard logic, localStorage + API | `ScoreManager`, `saveScore()`, `getTopScores()` |
| [CometManager.js](js/systems/CometManager.js) | Comet obstacle management | `CometManager`, `spawnComet()` |
| [SpatialGrid.js](js/systems/SpatialGrid.js) | Collision optimization (100px cells) | `SpatialGrid`, `query()` |
| [wavePatterns.js](js/config/wavePatterns.js) | Wave configurations, difficulty | `wavePatterns` array |

### 🖼️ UI Components (Modify Rarely)

| File | Purpose | Notes |
|------|---------|-------|
| [GameOverScreen.js](js/ui/GameOverScreen.js) | GTA-style game over, leaderboard display | Responsive layout for small screens (vh ≤ 620) |
| [DevOverlay.js](js/ui/DevOverlay.js) | Debug overlay (D key) | FPS, device info, wave stats |
| [TouchStrip.js](js/ui/TouchStrip.js) | Mobile touch controls | Left/right movement strips |
| [WeaponHeatBar.js](js/ui/WeaponHeatBar.js) | Heat meter UI | Color-coded bar |
| [PerformanceMonitor.js](js/ui/PerformanceMonitor.js) | FPS tracking | Min, max, avg FPS |

### 🔧 Utilities & Debugging

| File | Purpose | Usage |
|------|---------|-------|
| [leaderboardAPI.js](js/utils/leaderboardAPI.js) | Google Sheets API integration | Fetch/save scores, 60s cache |
| [analytics.js](js/utils/analytics.js) | Game statistics logging | Send stats on game over, 5s timeout |
| [DebugLogger.js](js/debug/DebugLogger.js) | Remote logging client | Auto-initialized, device fingerprinting |
| [debugging/server.js](debugging/server.js) | Node.js log server | `node debugging/server.js` |

**Complete File Tree**: See [knowledge/CLAUDE-old.md](knowledge/CLAUDE-old.md) lines 923-986 for full structure.

---

<!-- SECTION:api-reference -->
## 🔌 API Reference

**Keywords**: `#api #endpoints #config`

### Google Sheets Leaderboard
<!-- API:leaderboard -->

**Endpoint** ([leaderboardAPI.js:9](js/utils/leaderboardAPI.js#L9)):
```
https://script.google.com/macros/s/AKfycbx18SZnL14VGzLQcZddjqMTcK1wE9DKCnn1N4CQXGv_pqFYJHfPPQUXfMpkcVng0fonmQ/exec
```

**Actions**:
- `GET ?action=leaderboard&limit=N` - Fetch top N scores
- `POST /exec` - Send analytics data

**Cache**: 60 seconds for leaderboard requests

**Response Format**:
```json
{
  "data": [
    {
      "nick": "PlayerName",
      "score": 1234,
      "wave": 15,
      "time": "5:23",
      "timestamp": "2025-01-14T12:00:00Z"
    }
  ]
}
```

**Logging**:
- Success: `✅ poprawnie pobrano wyniki` / `✅ poprawnie zapisano wynik do bazy`
- Errors: Only critical errors logged (verbose debug logs removed)

---

<!-- SECTION:troubleshooting -->
## 🔧 Troubleshooting

**Keywords**: `#troubleshooting #bugs #fixes`

### Common Issues

**Canvas not showing:**
- Check `canvas.elt.style.display = 'block'` in [sketch.js](js/sketch.js)
- Verify `startGame` event fired
- Check console for p5.js errors

**Safe zone misalignment:**
- Check viewport calculations in [viewport.js](js/core/viewport.js)
- Verify `updateGameDimensions(game)` called on resize

**PWA not installing:**
- Ensure manifest.json served correctly (check Network tab)
- iOS: Must use Safari, use share button (📤)
- Android: Use Chrome, 3-dot menu
- Check browser console for service worker errors

**Leaderboard not loading:**
- Check Google Sheets API endpoint in [leaderboardAPI.js:9](js/utils/leaderboardAPI.js#L9)
- Verify CORS settings on Google Apps Script
- Check browser console for fetch errors

**Mobile crashes after game over** (FIXED 2025-11-13):
- View error logs: `JSON.parse(localStorage.getItem('debugLogs'))`
- Trigger test errors: `throw new Error("Test error")`
- Check critical error screen (red background)
- Verify restart works (SPACE or click)

---

<!-- SECTION:development-guide -->
## 🛠️ Development Guide

**Keywords**: `#patterns #howto #bestpractices`

### Input Handling

**Desktop**:
- Arrow keys: movement
- Space: fire
- D: dev overlay
- G: god mode (tracked in stats)
- +/-: wave jump (tracked in stats)

**Mobile**:
- Left 35% strip: movement (split left/right)
- Right 35% strip: firing
- Touch converts screen → virtual coords

**File**: [input.js](js/core/input.js)

### Testing Checklist

**Desktop:**
1. Enter nick + email/password (both required)
2. Verify keyboard controls (←, →, SPACE)
3. Play until game over
4. Verify WASTED animation + leaderboard
5. Click RESTART, verify data persisted

**Mobile Browser:**
1. Open in landscape mode
2. Fill form, bypass PWA screen (3 clicks)
3. **Verify canvas stable when scrolling** (no resize)
4. Test touch controls
5. Verify FPS 55-60

**Mobile PWA:**
1. Install PWA (before or after form)
2. Launch from home screen icon
3. Test touch controls
4. Verify fullscreen mode (no address bar)
5. Verify FPS 55-60
6. **iPhone 13 mini/Pro**: Verify side-by-side game over layout

### Analytics & Statistics

**Tracked data:**
- Total shots (by weapon type)
- Power-ups collected
- Game time, shots/sec
- FPS stats (min, max, avg)
- Browser fingerprint
- Cheat detection (god mode, wave jumps)

**IMPORTANT**: Stats sent to Google Sheets on game over. Manual review performed.

---

<!-- SECTION:appendix -->
## 📜 Appendix

### Typography

| Font | Usage | Style |
|------|-------|-------|
| **Orbitron** | Titles, buttons | Futuristic |
| **Rajdhani** | Body text, UI | Modern |
| **Russo One** | "WASTED" text | GTA V style |
| **Press Start 2P** | Pixel art UI | Retro |

### Lives & Respawn

- Start with 3 lives
- On hit: 2-second cyan shield (invulnerability)
- Enemy projectiles cleared on respawn
- Game over when lives reach 0

### Enemy Formation

- All enemies share `game.formationDirection`
- Formation reverses when ANY enemy hits boundary
- All descend together on reverse
- Individual `isFlying` state during spawn

### Version History

- **2025-11-16 (later)**: Leaderboard deduplication system - unique nick-based leaderboard (one player = one entry with best score), fixed congratulations bug (rank calculation matches displayed data), display uses Google Sheets only (no localStorage), deprecated getTopScores/getTopScoresSync in favor of getTopScoresUniqueNicks/getTopScoresUniqueNicksSync
- **2025-11-16**: PWA installation instructions enhancement - added final step "🚀 Uruchom grę z pulpitu" to all platforms (Android, Opera, iOS), 3-state button system (native prompt trigger → fallback warning → launch), user gesture requirement for native install prompt
- **2025-11-15 (later)**: PWA Opera Mobile support - Opera browser detection, platform-specific installation instructions, native browser install prompt with user gesture, toast notifications for installation feedback
- **2025-11-15**: PWA universal paths system - dynamic basePath detection in service-worker.js, relative paths in manifest.json and HTML files, fixes GitHub Pages subdirectory installation
- **2025-11-13**: Global error handling system, localStorage fallback for DebugLogger, mobile crash prevention
- **2025-01-10**: Responsive game over screen, device fingerprinting, JSONL logging, debug server enhancements
- **2025-01-09**: Viewport stability improvements (stable viewport in mobile browsers)

---

## 🏷️ Keyword Index

For quick searches (Ctrl+F or Claude):

- `#architecture` - System design, state machine, viewport, safe zone
- `#pwa` - PWA configuration, installation, offline support, service worker
- `#mobile` - Mobile optimizations, touch controls, performance, viewport stability
- `#gameplay` - Game mechanics, difficulty, power-ups, weapon heat
- `#api` - Google Sheets, leaderboard, analytics endpoints
- `#debugging` - DebugLogger, error handling, crash prevention, remote logging
- `#files` - File structure, imports, modules, key exports
- `#patterns` - Code patterns, best practices, coordinate transformation
- `#troubleshooting` - Common issues, fixes, testing checklist
- `#performance` - Optimization, object pooling, spatial grid, batch rendering

---

**Last Updated**: 2025-11-16
**Maintained By**: Adrian Apanowicz
**AI Assistant**: Claude Code (Sonnet 4.5)
**Full Documentation**: [knowledge/CLAUDE-old.md](knowledge/CLAUDE-old.md) (1396 lines, detailed reference)
