# LODIS - GALAGA: Raport Techniczny

**Data:** 2025-11-14
**Wersja:** Post-cleanup v1.0
**Status:** Kod po czyszczeniu Phase 1

---

## 📊 Executive Summary

LODIS - GALAGA to Space Invaders-style arcade game zbudowana w p5.js z następującymi cechami:
- Cross-platform (desktop + mobile PWA)
- Endless wave system z progresywną trudnością
- Online leaderboard (Google Sheets API)
- System ciepła broni i power-up system
- GTA V-style game over screen

**Autor:** Adrian Apanowicz
**Licencja:** MIT
**Tech Stack:** p5.js, ES6 Modules, localStorage, Google Sheets API, PWA

---

## 🧹 Czyszczenie Kodu - Raport

### Faza 1: Ukończona (2025-11-14)

**Usunięte pliki:**
- `js/ui/StartMenu.js` (447 linii) - całkowicie nieużywany, zastąpiony HTML menu
- `nul` (artefakt Windows) - 0 bytes

**Usunięte martwe metody:**
- `Game.returnToMenu()` - nigdy nie wywoływana
- `ScoreManager.getScores()` - deprecated, nieużywany
- `Game.gameWin` property - nigdy nie używany (endless mode)

**Oczyszczone zakomentowane logi:**
- `PowerUp.js` - 7 zakomentowanych console.log
- `Game.js` - 3 zakomentowanych console.log
- `sketch.js` - 1 zakomentowany console.log
- `CometManager.js` - 1 zakomentowany console.log
- `input.js` - 4 zakomentowane console.log
- **Razem:** 16 linii usuniętych

**Naprawione błędy:**
- Usunięto referencje do nieistniejącego `pwa-installed` div w `index.html:374-384`
- Zastąpiono bezpośrednim wywołaniem `startGameFromPWA()` w standalone mode

**Statystyki czyszczenia:**
| Metryka | Przed | Po | Różnica |
|---------|-------|-----|---------|
| Pliki JS | 32 | 31 | -1 |
| Linie kodu (całość) | ~8,500 | ~8,000 | -500 |
| Martwe metody | 3 | 0 | -3 |
| Zakomentowane logi | 16 | 0 | -16 |

---

## 📁 Struktura Projektu

### Core Files (Root)
```
index.html                       # HTML entry point, PWA flow, player registration
manifest.json                    # PWA manifest (fullscreen, landscape)
service-worker.js                # PWA service worker, cache strategy
CLAUDE.md                        # Project instructions for Claude AI
claudeRAPORT.md                  # This file - technical report
todo                             # Developer TODO list
```

### JavaScript Architecture

```
js/
├── sketch.js                    # p5.js entry point, game loop (831 lines)
├── Game.js                      # Main game class, state management (864 lines)
│
├── core/                        # Core engine components
│   ├── constants.js             # SAFE_ZONE dimensions (1200x600)
│   ├── viewport.js              # Device detection, scaling, viewport stability
│   ├── input.js                 # Keyboard, mouse, touch handlers
│   └── GameStates.js            # State enum (MENU, PLAYING, GAME_OVER, PAUSED)
│
├── entities/                    # Game objects
│   ├── Player.js                # Player ship (movement, collision, shield)
│   ├── Enemy.js                 # Enemy types (penguin, boss)
│   ├── Projectile.js            # Projectile pools (player, enemy, rocket)
│   ├── PowerUp.js               # Power-up classes (5 types)
│   └── Comet.js                 # Comet obstacles (3 sizes)
│
├── systems/                     # Game systems
│   ├── PowerUpManager.js        # Power-up spawning, weighted randomization
│   ├── CometManager.js          # Comet management, rocket drops
│   ├── ScoreManager.js          # Leaderboard, localStorage sync
│   ├── WeaponHeatSystem.js      # Weapon overheat mechanics
│   ├── SpatialGrid.js           # Collision optimization (100px cells)
│   ├── EnemyBatchRenderer.js    # Batch rendering optimization
│   └── TextCache.js             # Text rendering cache
│
├── ui/                          # UI components
│   ├── GameOverScreen.js        # GTA V-style screen (responsive)
│   ├── DevOverlay.js            # Debug overlay (press D)
│   ├── PerformanceMonitor.js    # FPS tracking
│   ├── TouchStrip.js            # Mobile touch controls
│   ├── CanvasButton.js          # Button component
│   └── WeaponHeatBar.js         # Heat meter UI
│
├── utils/                       # Utilities
│   ├── leaderboardAPI.js        # Google Sheets integration
│   └── analytics.js             # Game statistics logging
│
├── debug/                       # Debug system
│   ├── DebugLogger.js           # Remote logging client
│   └── config.js                # Debug logger configuration
│
└── config/
    └── wavePatterns.js          # Wave configurations (15+ patterns)
```

### Assets

```
assets/
├── spaceship.png                # Player sprite
├── boss.png                     # Boss enemy sprite
├── penguin/1.png                # Penguin idle frame
├── penguin/2-9.png              # Penguin death animation (8 frames)
├── comet.png                    # Comet obstacle sprite
├── heart.png                    # Life indicator icon
├── shield.png                   # Power-up icons (5 types)
├── autofire.png
├── tripleshot.png
├── rocket.png
└── PressStart2P-Regular.ttf     # Pixel font (local)
```

### Debug System

```
debugging/
├── server.js                    # Node.js Express server
├── package.json                 # Server dependencies (express, cors)
├── public/
│   └── index.html               # Web interface for logs (auto-refresh)
└── logs/
    └── debug-*.jsonl            # Daily JSONL log files (gitignored)
```

---

## 🏗️ Architektura Systemu

### 1. Game State Machine

**States:** `MENU` → `PLAYING` → `GAME_OVER` → `PLAYING` (restart)

```javascript
// GameStates.js
export const GameStates = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
    PAUSED: 'PAUSED'  // Used for portrait orientation lock
};
```

**Flow:**
1. **MENU:** HTML form (player registration) → localStorage
2. **PWA Check:** Mobile only - platform-specific installation instructions (optional)
3. **PLAYING:** Game starts with player data from localStorage
4. **GAME_OVER:** GTA V-style screen, leaderboard, stats
5. **Restart:** Reuses saved player data (no return to menu)

**Critical:** `StartMenu.js` was deleted - HTML menu is the only entry point.

---

### 2. Fixed Safe Zone System

**Competitive fairness architecture:**
- Desktop: 1000px viewport → 1200x600 safe zone (scaled down)
- Mobile: 1200px viewport → 1200x600 safe zone (full size)
- **ALL gameplay logic uses safe zone coordinates** (1200x600)

**Why?** Ensures consistent gameplay across devices.

```javascript
// constants.js
export const SAFE_ZONE_WIDTH = 1200;
export const SAFE_ZONE_HEIGHT = 600;
```

**Coordinate Transform:**
```javascript
// Game object position (in safe zone coords: 0-1200, 0-600)
enemy.x = 100;
enemy.y = 50;

// Draw on screen (viewport.js handles transformation)
const screenX = safeZoneX + enemy.x * scaleFactor;
const screenY = safeZoneY + enemy.y * scaleFactor;
```

---

### 3. Viewport Stability System (Mobile)

**Problem Solved:**
Mobile browsers resize viewport when address bar appears/disappears during scroll (50-100px height changes). This caused canvas resizing during gameplay.

**Solution:**
- **Mobile Browser:** Uses `window.innerHeight` (stable, doesn't resize on scroll)
- **PWA/Standalone:** Uses `window.visualViewport` (handles notches, fullscreen)
- **Desktop:** Uses `window.visualViewport` or fallback

**API Selection ([viewport.js:46-75](js/core/viewport.js)):**
```javascript
export function getVirtualWidth() {
    const isMobile = isMobileDevice();
    const isStandalone = isStandaloneMode();

    // Mobile Browser: stable window.innerHeight
    if (isMobile && !isStandalone) {
        return { width: window.innerWidth, height: window.innerHeight };
    }

    // PWA/Desktop: visualViewport (handles notches)
    if (window.visualViewport) {
        return {
            width: window.visualViewport.width,
            height: window.visualViewport.height
        };
    }

    // Fallback
    return { width: window.innerWidth, height: window.innerHeight };
}
```

**Behavior Matrix:**

| Mode | Viewport API | Resize on Scroll | Notch Handling | Fullscreen |
|------|-------------|------------------|----------------|------------|
| Desktop | visualViewport | No | N/A | No |
| Mobile Browser | innerHeight | **No** ✅ | No | No |
| Mobile PWA | visualViewport | No | Yes ✅ | Yes ✅ |

**Resize Event Filtering ([sketch.js:483-500](js/sketch.js)):**
```javascript
window.visualViewport.addEventListener('resize', () => {
    if (isStandaloneMode()) {  // Only in PWA
        handleResizeEvent(game, resizeCanvas);
    }
    // Browser mode: ignored (viewport is stable via innerHeight)
});
```

---

### 4. Player Registration & Data Flow

**HTML Form ([index.html:186-229](index.html)):**
- **Nick:** Required, 2-20 chars
- **Email/Password:** Required (min 1 char), used as "prize password"
- **Storage:** `localStorage.spaceInvPlayerData`
- **Auto-fill:** Loads saved data on page load

**Important:** "Email/Password" field accepts any text, not necessarily email format.

**Data Structure:**
```javascript
{
    nick: "PlayerName",
    email: "password123"  // Can be any text
}
```

**Lifecycle:**
1. User fills form → Save to localStorage
2. Submit form → Hide HTML menu, show canvas
3. PWA prompt (mobile only, optional)
4. Game starts with `window.playerDataFromMenu`
5. On restart → Reuses localStorage data

---

### 5. PWA Installation Flow

**Important:** PWA installation is **RECOMMENDED** but **NOT REQUIRED**. Game is fully playable in mobile browsers with stable viewport.

**Device Detection ([index.html:92-93](index.html)):**
```javascript
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                 || ('ontouchstart' in window);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone === true;
```

**Flow:**
- **Desktop:** Form → Game starts directly (no PWA prompt)
- **Mobile (browser):** Form → PWA installation screen (can bypass with 3 clicks)
- **Mobile (PWA):** Form → Game starts directly (no PWA prompt)

**3-Click Fallback ([index.html:408-451](index.html)):**
1. Click 1: "❌ PWA nie wykryto! Sprawdź czy zainstalowałeś..."
2. Click 2: "❌ Nadal brak PWA! Upewnij się..."
3. Click 3: Button changes to "⚠️ GRAJ BEZ PWA" → Starts game

**Platform Detection:**
- **iOS:** Shows share button (📤) instructions
- **Android:** Shows 3-dot menu instructions

**Why both meta tags?**
```html
<meta name="mobile-web-app-capable" content="yes">          <!-- Modern standard -->
<meta name="apple-mobile-web-app-capable" content="yes">   <!-- iOS Safari required -->
```
Chrome shows deprecation warning, but iOS Safari still requires the Apple-specific tag.

---

### 6. Leaderboard System

**Dual Storage:**
- **Local:** `localStorage.spaceInvScores` (top 100)
- **Online:** Google Sheets API with 60s cache
- **Merge:** Deduplicates by `nick + score + time`

**Files:**
- [ScoreManager.js](js/systems/ScoreManager.js) - Logic
- [leaderboardAPI.js](js/utils/leaderboardAPI.js) - API integration

**Display:**
- Top 4 on game over screen
- Current player highlighted in gold (if in top 4)
- Responsive layout for small screens (vh ≤ 620px)

**API Endpoint:**
```
https://script.google.com/macros/s/AKfycbx18SZnL14VGzLQcZddjqMTcK1wE9DKCnn1N4CQXGv_pqFYJHfPPQUXfMpkcVng0fonmQ/exec
```

**Actions:**
- `GET ?action=leaderboard&limit=N` - Fetch top N scores
- `POST /exec` - Send analytics data

**Logging (simplified 2025-11-13):**
- Success: `✅ poprawnie pobrano wyniki` / `✅ poprawnie zapisano wynik do bazy`
- Errors: Only critical errors logged
- Debug logs removed for cleaner console

---

### 7. Weapon Heat System

**Mechanics ([WeaponHeatSystem.js](js/systems/WeaponHeatSystem.js)):**
- Heat increases +5 per shot
- Cooling: 20 heat/sec
- **Overheated at 100** → unlocks at 50
- Visual heat bar: green → yellow → red → blue (pulsing when frozen)

**Integration:**
```javascript
// Game.js - firing logic
if (this.player.fire()) {  // Returns false if overheated
    this.playerProjectilePool.get(x, y, dy);
}
```

**UI:**
- Heat bar displayed below player (12px height)
- Color coding: 0-33% green, 33-66% yellow, 66-100% red, 100% blue pulsing

---

### 8. Power-Up System

**Drop Chance:**
`8% base + 3% per 10 waves`

**Types ([PowerUpManager.js](js/systems/PowerUpManager.js)):**

| Power-up | Effect | Weight | Duration | Max Limit |
|----------|--------|--------|----------|-----------|
| ❤️ Life | +1 life | 5 (rare) | Permanent | 3 lives max |
| 🛡️ Shield | Invulnerability | 20 (common) | 5s | - |
| 🔥 Auto-fire | Auto-shooting | 15 | 4s | - |
| 3️⃣ Triple Shot | 3 projectiles | 12 | 5s | - |
| 🚀 Rocket | +3 rockets | 3 (very rare) | Until used | - |

**Weighted Randomization:**
```javascript
const weights = {
    'life': 5,
    'shield': 20,
    'autofire': 15,
    'tripleshot': 12,
    'rocket': 3
};
// Total weight: 55
// Shield probability: 20/55 = 36.4%
```

**Rocket Power-Up:**
- Gives +1 rocket ammo (instant all-enemy destruction)
- Can stack (no limit)
- Displayed as "R" icon with count
- Fired with R key or dedicated touch strip button

---

### 9. Wave & Difficulty Progression

**Progression ([Game.js:743-769](js/Game.js)):**
```javascript
// Speed increase
const speedMultiplier = Math.min(1 + (wave - 1) * 0.08, 2.5);  // +8% per wave, cap 2.5x at wave 20

// Fire rate increase
const fireRateMultiplier = 1 + (wave - 1) * 0.15;  // +15% per wave

// Points per kill
const pointsPerKill = 1 + Math.floor(wave / 2);

// Wave bonus
const waveBonus = wave * 50;
```

**Pattern System ([wavePatterns.js](js/config/wavePatterns.js)):**
- 15+ predefined patterns
- Variations: rows, columns, V-formation, diamond, checkerboard
- Boss waves every 5 waves
- Random pattern selection weighted by difficulty

**Wave Spawn:**
```javascript
spawnWave(waveNumber) {
    const pattern = getPatternForWave(waveNumber);
    // pattern = { rows: 3, cols: 8, type: 'penguin', bossCount: 0 }

    // Spawn enemies based on pattern
    for (let row = 0; row < pattern.rows; row++) {
        for (let col = 0; col < pattern.cols; col++) {
            const enemy = new Enemy(x, y, pattern.type, this);
            this.enemies.push(enemy);
        }
    }
}
```

---

### 10. Performance Optimizations

**Implemented:**

1. **Object Pooling ([Projectile.js](js/entities/Projectile.js))**
   - Player projectiles: Pool of 10
   - Enemy projectiles: Pool of 20
   - Rockets: Pool of 5
   - Reuses objects instead of create/destroy

2. **Spatial Grid ([SpatialGrid.js](js/systems/SpatialGrid.js))**
   - 100px cell size
   - O(n) collision detection → O(1) per cell
   - Only checks nearby cells for collisions

3. **Batch Rendering ([EnemyBatchRenderer.js](js/systems/EnemyBatchRenderer.js))**
   - Groups enemy draw calls
   - Reduces push()/pop() overhead
   - Batches by sprite type

4. **Text Cache ([TextCache.js](js/systems/TextCache.js))**
   - Caches rendered text as offscreen canvases
   - Reuses cached images for repeated text
   - Significant performance gain for UI labels

5. **Mobile Optimizations:**
   - `pixelDensity(1)` on mobile (4× performance gain)
   - `p5.disableFriendlyErrors` in production
   - Viewport stability (no canvas resizing on scroll)

**Performance Targets:**
- Desktop: 60 FPS steady
- Mobile: 55-60 FPS (depending on device)

---

### 11. Debug Logger System

**Purpose:**
Remote debugging for mobile devices with device fingerprinting and game context tracking.

**Architecture:**
- **Client:** Intercepts `console.*` calls → sends to remote server
- **Server:** Node.js/Express with web interface + JSONL file logging
- **Auto-initialization:** Enabled on import (no manual setup)

**Features:**
- Automatic console method interception (log, info, warn, error, debug)
- Batch processing (500ms intervals, max 50 logs/batch)
- Retry logic (3 attempts with 1s delay)
- Source file detection via stack traces
- **Device fingerprinting:** Session ID, OS, browser, device type, screen info
- **Game context:** Player nick, game state, wave, FPS, lives
- **JSONL file logging:** `debugging/logs/debug-YYYY-MM-DD.jsonl`

**Configuration ([config.js](js/debug/config.js)):**
```javascript
{
  enabled: true,
  serverUrl: 'http://{hostname}:3001',  // Auto-detects hostname
  batchEnabled: true,
  batchInterval: 500,   // ms
  batchMaxSize: 50,     // logs
  retryAttempts: 3,
  fallbackToLocalStorage: true,
  localStorageKey: 'debugLogs',
  maxLocalLogs: 100
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
    "id": "abc123-...",
    "deviceType": "Mobile",
    "isPWA": true,
    "os": "Android 14",
    "browser": "Chrome 120.0.0.0",
    "screenResolution": "844x390",
    "viewportSize": "1200x600",
    "pixelRatio": 2.5,
    "orientation": "landscape-primary"
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
- REST API (POST `/log`)
- In-memory storage (last 500 logs)
- Enhanced colorized console output
- Web interface (http://localhost:3001)
- JSONL file logging with daily rotation
- Automatic logs directory creation

**localStorage Fallback:**
- Saves up to 100 logs locally when server unavailable
- Accessible via `localStorage.debugLogs`
- Critical errors saved immediately (bypasses retry queue)

---

### 12. Global Error Handling System

**Purpose:**
Prevent mobile crashes by catching all errors, providing fallback UIs, and logging for debugging.

**Architecture:**
- **Multi-layer protection:** Global handlers → Try-catch blocks → Input validation
- **Graceful degradation:** Fallback UIs when rendering fails
- **Remote logging:** All errors sent to DebugLogger (with localStorage backup)

**Layer 1: Global Error Handlers ([sketch.js:149-189](js/sketch.js))**
```javascript
window.onerror = function(message, source, lineno, colno, error) {
    console.error('❌ UNCAUGHT ERROR:', { message, source, lineno, colno, error });
    debugLogger.logGlobalError('ERROR', error || new Error(message), { source, lineno, colno });
    if (game) game.handleCriticalError(error || new Error(message));
    return true; // Prevent default browser error handling
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ UNHANDLED PROMISE REJECTION:', { reason: event.reason });
    debugLogger.logGlobalError('PROMISE_REJECTION', event.reason);
    if (game) game.handleCriticalError(event.reason);
    event.preventDefault();
});
```

**Layer 2: Try-Catch in Critical Rendering ([sketch.js:615-656](js/sketch.js))**
```javascript
function drawGameOverScreen(deltaTime) {
    try {
        game.gameOverScreen.draw(score, wave, time, playerData, topScores, playerRank);
    } catch (error) {
        console.error('❌ Game over screen crashed:', error);
        // Fallback: Simple game over screen with restart option
    }
}
```

**Layer 3: Async Operation Protection ([analytics.js:309-347](js/utils/analytics.js))**
```javascript
// 5-second timeout using AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
    const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST',
        signal: controller.signal  // Abort on timeout
    });
    clearTimeout(timeoutId);
} catch (fetchError) {
    if (fetchError.name === 'AbortError') {
        console.error('❌ Analytics timeout after 5s');
    }
}
```

**Layer 4: Critical Error Screen ([sketch.js:671-709](js/sketch.js))**
- Red background, error message, game context
- Press SPACE or click to reload
- Always functional (uses simple p5.js primitives)

**Common Mobile Crash Scenarios (Now Fixed):**

| Scenario | Root Cause | Solution | File |
|----------|-----------|----------|------|
| Analytics timeout on 3G | Fetch hangs indefinitely | AbortController 5s timeout | [analytics.js:310](js/utils/analytics.js) |
| Promise rejection | No .catch() handler | Added .catch() to analytics | [sketch.js:633](js/sketch.js) |
| Font loading failure | textFont() throws error | Try-catch + fallback rendering | [GameOverScreen.js:503](js/ui/GameOverScreen.js) |
| NaN in score/wave/time | Math operations fail | Input validation | [GameOverScreen.js:120](js/ui/GameOverScreen.js) |
| null topScores array | forEach() throws error | Array.isArray() check | [GameOverScreen.js:136](js/ui/GameOverScreen.js) |

---

## 📈 Metryki Kodu

### Statystyki Linii Kodu (LOC)

| Kategoria | Pliki | LOC (approx) | % |
|-----------|-------|--------------|---|
| **Core Engine** | 5 | 1,200 | 15% |
| - sketch.js | 1 | 831 | - |
| - Game.js | 1 | 864 | - |
| - Other core | 3 | ~500 | - |
| **Entities** | 4 | 1,100 | 14% |
| **Systems** | 7 | 2,000 | 25% |
| **UI** | 6 | 1,800 | 22% |
| **Utils** | 2 | 800 | 10% |
| **Debug** | 2 | 700 | 9% |
| **Config** | 1 | 400 | 5% |
| **TOTAL** | 31 | ~8,000 | 100% |

### Complexity Analysis

**Largest Files (need splitting):**
1. `Game.js` - 864 lines (state, entities, stats, power-ups)
2. `sketch.js` - 831 lines (game loop, UI, error handling, orientation)
3. `GameOverScreen.js` - 525 lines (GTA V-style UI, leaderboard)
4. `analytics.js` - 350 lines (fingerprinting, stats collection)
5. `DebugLogger.js` - 480 lines (remote logging, session tracking)

**Recommendations:**
- Split `Game.js` → extract `StatsTracker.js`
- Split `sketch.js` → extract `orientation.js`, `errorHandler.js`
- Consider splitting `GameOverScreen.js` → extract `LeaderboardRenderer.js`

### Dependencies

**External Libraries:**
- `p5.js` (v1.4.0) - Canvas rendering engine
- `p5.sound.js` - NOT USED (can be removed)

**Browser APIs:**
- localStorage
- fetch
- visualViewport
- matchMedia
- AbortController
- Geolocation (analytics only)

**Third-party Services:**
- Google Sheets API (leaderboard)
- Google Fonts (Orbitron, Rajdhani, Russo One)

---

## ⚠️ Znane Ograniczenia

### 1. Architektura

**Problem:** `Game.js` (864 lines) i `sketch.js` (831 lines) są za duże
**Impact:** Trudność w maintenance, testowalność
**Recommendation:** Rozdzielić na mniejsze moduły (< 400 lines each)

**Problem:** Brak spójnej konwencji nazewnictwa boolean properties
**Impact:** Niespójna czytelność kodu
**Examples:**
- `gameOver` (should be `isGameOver`)
- `formationReady` (should be `isFormationReady`)
- `statsLogged` (should be `hasLoggedStats`)

**Problem:** Duplikacja kodu w device detection
**Impact:** Kod maintenance w 4 miejscach
**Locations:**
- `index.html:93`
- `viewport.js:25-31`
- `analytics.js:20-29`
- `DebugLogger.js:98-113`

### 2. Performance

**Problem:** Text rendering cache nie działa dla dynamicznego tekstu
**Impact:** Niewielki overhead dla score/wave labels
**Workaround:** Używa cache tylko dla statycznych label

**Problem:** 50+ `console.log` w produkcji bez flagi DEBUG
**Impact:** Cluttered console
**Recommendation:** Dodać `DEBUG_MODE` flag i warunkowe logi

### 3. PWA

**Problem:** Service worker wymaga HTTPS (lub localhost)
**Impact:** Nie działa na lokalnej sieci (192.168.x.x) bez HTTPS
**Workaround:** USB port forwarding lub ngrok tunnel

**Problem:** iOS PWA nie obsługuje `visualViewport.resize` events reliably
**Impact:** Możliwe problemy z resizingiem na iOS PWA
**Mitigation:** Używamy `window.innerHeight` jako fallback

### 4. Testing

**Problem:** Brak automated tests
**Impact:** Manual testing required, ryzyko regression
**Recommendation:** Dodać unit tests (Jest) i integration tests (Playwright)

### 5. Analytics

**Problem:** 5s timeout może być za krótki na wolnych sieciach
**Impact:** Niektóre statystyki mogą się nie wysłać
**Mitigation:** Graceful degradation - gra działa bez analytics

---

## 🔧 TODO List (Priorytetowe)

### High Priority

- [ ] **Rozdzielić `Game.js`** na mniejsze moduły
  - `StatsTracker.js` - stats collection
  - `PowerUpController.js` - power-up logic
  - `EntityManager.js` - entity lifecycle

- [ ] **Rozdzielić `sketch.js`** na mniejsze moduły
  - `orientation.js` - orientation lock logic
  - `errorHandler.js` - global error handling
  - `gameLoop.js` - core game loop

- [ ] **Konsolidować device detection** do `viewport.js`
  - Export `detectDeviceType()` function
  - Remove duplicates from `index.html`, `analytics.js`, `DebugLogger.js`

- [ ] **Zastąpić PWA detection duplicates** funkcją `isStandaloneMode()`
  - 3 miejsca w `index.html` używają identycznego kodu

### Medium Priority

- [ ] **Dodać DEBUG_MODE flag** dla console.log
  - Config flag: `DEBUG = false` w produkcji
  - Wrap all debug logs: `if (DEBUG) console.log(...)`

- [ ] **Standaryzować nazewnictwo boolean** (is/has/should prefixes)
  - `gameOver` → `isGameOver`
  - `formationReady` → `isFormationReady`
  - `statsLogged` → `hasLoggedStats`

- [ ] **Utworzyć `formatters.js` utility**
  - `formatTime(seconds)` - używany w 4 miejscach
  - `formatScore(score)` - potencjalnie przydatny

- [ ] **Ekstrakcja magic numbers** do named constants
  - `PLAYER_Y_OFFSET = 70`
  - `ENEMY_ROW_SPACING = 50`
  - `WAVE_BONUS_MULTIPLIER = 50`

### Low Priority

- [ ] **Dodać unit tests** (Jest)
  - Test `ScoreManager` logic
  - Test `PowerUpManager` weighted randomization
  - Test `SpatialGrid` collision detection

- [ ] **Dodać JSDoc comments** do wszystkich public methods
  - Szczególnie: Game API, ScoreManager, PowerUpManager

- [ ] **Ujednolicić konwencję nazewnictwa plików**
  - `GameStates.js` (PascalCase) vs `constants.js` (lowercase)
  - Recommendation: camelCase dla utils, PascalCase dla klas

- [ ] **Dodać error handling** do localStorage operations
  - Try-catch z fallback behavior
  - User-friendly error messages

---

## 👨‍💻 Przewodnik dla Developerów

### Setup Development Environment

**1. Clone repository:**
```bash
git clone <repository-url>
cd gra
```

**2. Start local HTTP server:**
```cmd
REM Windows
npm install -g http-server
http-server -c-1

REM Open browser: http://127.0.0.1:8080
```

**3. Start debug server (optional, for mobile debugging):**
```cmd
cd debugging
npm install
node server.js

REM Open web interface: http://localhost:3001
```

### Development Workflow

**Desktop Testing:**
1. Open game in browser (http://127.0.0.1:8080)
2. Fill form (nick + password)
3. Press **D** for dev overlay (FPS, device info)
4. Press **G** for god mode (invulnerability)
5. Press **+/-** to jump waves

**Mobile Testing (Browser):**
1. Find PC's local IP: `ipconfig` (Windows)
2. Open on mobile: `http://{pc-ip}:8080`
3. Fill form, bypass PWA screen (3 clicks)
4. Test touch controls (left strip = move, right strip = fire)
5. Check debug logs: `http://{pc-ip}:3001`

**Mobile Testing (PWA):**
1. Install PWA from browser
2. Launch from home screen icon
3. Test fullscreen mode
4. Verify no canvas resizing on scroll

### Code Style Guidelines

**1. State Management:**
```javascript
// ✅ CORRECT - use GameStates enum
this.gameState = GameStates.PLAYING;

// ❌ WRONG - don't use boolean flags
this.gameOver = true;
```

**2. Coordinate System:**
```javascript
// ✅ CORRECT - safe zone coordinates (0-1200, 0-600)
enemy.x = 100;
enemy.y = 50;

// Transform when drawing
const screenX = safeZoneX + enemy.x * scaleFactor;

// ❌ WRONG - don't use raw screen coordinates
enemy.x = mouseX;
```

**3. Console Logging:**
```javascript
// ✅ CORRECT - use emoji prefixes for clarity
console.log('✅ Success message');
console.warn('⚠️ Warning message');
console.error('❌ Error message');

// ❌ WRONG - commented out logs (remove them)
// console.log('Debug message');
```

**4. Error Handling:**
```javascript
// ✅ CORRECT - always wrap async operations
try {
    const response = await fetch(url);
} catch (error) {
    console.error('❌ Fetch failed:', error);
    // Graceful degradation
}

// ❌ WRONG - unhandled promise
fetch(url).then(response => { ... });
```

### Testing Checklist

**Before Committing:**
- [ ] Desktop: Game starts, plays, restarts
- [ ] Mobile Browser: Stable viewport (no resize on scroll)
- [ ] Mobile PWA: Fullscreen mode, no address bar
- [ ] Dev overlay works (press D)
- [ ] Leaderboard loads
- [ ] No errors in console (F12)
- [ ] Debug server receives logs (if running)

**Before Releasing:**
- [ ] Test on iPhone (Safari, Chrome)
- [ ] Test on Android (Chrome)
- [ ] Test on desktop (Chrome, Firefox, Edge)
- [ ] Verify analytics sends data
- [ ] Verify leaderboard updates
- [ ] Test PWA installation flow
- [ ] Test game over → restart flow

### Debug Tools

**Dev Overlay (Press D):**
- FPS (current, avg, min, max) - color-coded
- Device type, virtual resolution
- Safe zone dimensions, scale factor
- Wave info, lives, shield status

**Dev Cheats:**
- **G:** God mode (invulnerability) - tracked in stats
- **+/=:** Jump to next wave - tracked in stats
- **-/_:** Jump to previous wave - tracked in stats
- **P:** Toggle performance monitor
- **D:** Toggle dev overlay

**Debug Logger:**
- View logs in browser console
- View logs on debug server web interface: http://localhost:3001
- View logs in JSONL files: `debugging/logs/debug-*.jsonl`
- Parse logs with `jq` or `grep`

**Browser Console:**
```javascript
// View localStorage data
JSON.parse(localStorage.getItem('spaceInvPlayerData'));
JSON.parse(localStorage.getItem('spaceInvScores'));

// View debug logs (when server unavailable)
JSON.parse(localStorage.getItem('debugLogs'));

// Trigger test errors
throw new Error("Test error");
Promise.reject(new Error("Test promise rejection"));
```

### Common Tasks

**Add New Power-Up:**
1. Create class in `js/entities/PowerUp.js` extending `PowerUp`
2. Add weight to `PowerUpManager.powerUpWeights`
3. Add icon to `assets/`
4. Add stats tracking to `Game.stats.powerUpsCollected`

**Add New Enemy Type:**
1. Add type in `Enemy.js` constructor
2. Add sprite to `assets/`
3. Update `getPatternForWave()` in `wavePatterns.js`
4. Update collision logic if needed

**Change Difficulty:**
1. Edit `Game.js:743-769` (speed, fire rate multipliers)
2. Edit `wavePatterns.js` (enemy counts, formations)
3. Edit `PowerUpManager.js` (drop chance formula)

**Modify UI:**
1. **⚠️ DO NOT EDIT** existing Polish text in `index.html`
2. Only modify: JavaScript logic, CSS styles
3. Add NEW elements if needed

---

## 📜 Version History

### v1.0 - Post-Cleanup (2025-11-14)

**Usunięte:**
- `StartMenu.js` (447 linii)
- `nul` file
- 3 martwe metody
- 16 zakomentowanych console.log
- Referencje do nieistniejącego `pwa-installed` div

**Dodane:**
- `claudeRAPORT.md` - technical documentation
- Improved code hygiene

**Statystyki:**
- ~500 linii martwego kodu usuniętego
- 1 plik usunięty
- Kod bardziej czytelny i maintainable

---

## 🔗 Referencje

**Project Files:**
- [CLAUDE.md](CLAUDE.md) - Project instructions for Claude AI
- [todo](todo) - Developer TODO list
- [manifest.json](manifest.json) - PWA configuration

**Documentation:**
- p5.js Reference: https://p5js.org/reference/
- Google Sheets API: https://developers.google.com/sheets/api
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

**Tools:**
- Debug Server: http://localhost:3001
- Chrome DevTools: F12
- VSCode Live Server (alternative to http-server)

---

## 📧 Contact

**Author:** Adrian Apanowicz
**Project:** LODIS - GALAGA
**License:** MIT
**Date:** 2025-11-14

---

**END OF REPORT**
