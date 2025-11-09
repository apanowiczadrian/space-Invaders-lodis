# First Start Problem: Portrait→Landscape Orientation Bug

## Problem Statement

**Symptoms:**
- Player and enemy entities are NOT visible when game starts after rotating from portrait to landscape
- Player instantly dies (loses all 3 lives → WASTED screen) without seeing gameplay
- Console shows: `totalShots: 0`, `totalGameTime: 12.22s`, `finalScore: 0`
- Stars and comets ARE visible (spawn correctly)
- Problem occurs ONLY when user starts in portrait, sees "obróć ekran", then rotates to landscape
- Works correctly when starting in landscape orientation from the beginning

**Affected Devices:**
- iPhone 13 mini (Safari, both browser and PWA)
- Android Chrome (tested at 892x412 screen resolution)
- Random occurrence (sometimes works, sometimes doesn't)
- Almost always works on larger screens/desktop

**Console Output Example (Bug State):**
```
✅ Service Worker registered
⚠️ Ostrzeżenie: Gra nie działa w trybie PWA
📊 Preloading online leaderboard...
[Game runs for ~12 seconds invisible]
Game Statistics: {totalShots: 0, ...}
FPS Statistics: {current: 47, average: 45, min: 1, max: 55}
```

**Expected Console Output (Working State):**
```
⚠️ Portrait mode detected. Waiting for landscape rotation...
[User rotates device]
✅ Landscape detected. Starting game...
[Entities visible, gameplay starts normally]
```

---

## Root Causes Identified

### 1. **Asynchronous Orientation Detection**
Game initialization is async with orientation change; should be synchronous blocking operation.

### 2. **Viewport Calculated Before Orientation Finalized**
`calculateGameArea()` (viewport.js:77-107) runs immediately, processes portrait dimensions, creates huge virtual canvas (2180px height instead of 600px).

### 3. **Multiple Detection Methods Not Synchronized**
- `isLandscape()` uses `matchMedia('(orientation: landscape)')`
- `isMobileDevice()` uses regex + touch detection
- CSS uses `@media (orientation: portrait)`
- All three can be out of sync during orientation change (50-300ms lag)

### 4. **Aspect Ratio Amplification Bug**
When portrait dimensions reach `calculateGameArea()`:
- `screenAspect = 412/892 ≈ 0.46`
- `_VIRTUAL_HEIGHT = 1200 / 0.46 ≈ 2608px` (should be 600px)
- Player spawns at `Y = 2608 - 70 = 2538px` (way off-screen)

### 5. **CSS Display Override Race Condition**
- `startGameFromPWA()` sets `canvas.style.display = 'block'` (inline style)
- CSS media query `@media (orientation: portrait) { canvas { display: none; } }` might override
- Media query specificity can win over inline styles during orientation transition

### 6. **No Entity Position Validation at Spawn Time**
Game spawns enemies at virtual coordinates without checking if they're within visible safe zone bounds.

### 7. **Event Listener Registration Timing**
`orientationchange` listener (sketch.js:498) might not be registered when event fires, or fires multiple times during single rotation.

---

## All Implemented Fixes (Chronological)

### Fix #1: CSS Portrait Media Query (2025-01-06)
**Location:** `index.html` lines 178-186
**Mechanism:**
```css
@media (orientation: portrait) and (max-width: 768px),
       (orientation: portrait) and (pointer: coarse) {
    #orientation-hint { display: flex; }
    canvas { display: none; }
}
```

**Rationale:** Hide canvas visually in portrait mode, show rotation hint overlay.

**Why It Failed:**
- Purely visual hiding - p5.js `setup()` and `draw()` continue running
- Game state machine initializes entities at wrong viewport dimensions
- Viewport calculations happen BEFORE orientation detection
- Canvas hidden but collision detection still works → player dies invisibly

---

### Fix #2: Portrait Detection in startGame Event (2025-01-06)
**Location:** `js/sketch.js` lines 108-115
**Mechanism:**
```javascript
if (!isLandscape() && isMobileDevice()) {
    pendingPlayerData = playerData;
    console.log('⚠️ Portrait mode detected. Waiting for landscape rotation...');
    return;  // Don't call game.startGame()
}
```

**Rationale:** Prevent game initialization if device is in portrait; save player data for later when `orientationchange` fires.

**Why It Failed:**
- Race condition: `orientationchange` event might fire BEFORE canvas is shown
- `isLandscape()` uses `matchMedia` which can lag behind physical orientation
- If `orientationchange` fires during this code execution, `pendingPlayerData` might be null
- Doesn't handle case where user rotates BEFORE clicking start button

---

### Fix #3: orientationTimeoutId Tracking (2025-01-07)
**Location:** `js/sketch.js` lines 30, 120-123, 500-523
**Mechanism:**
```javascript
let orientationTimeoutId = null;

// Cancel pending resize before starting game
if (orientationTimeoutId !== null) {
    clearTimeout(orientationTimeoutId);
    orientationTimeoutId = null;
}

// In orientationchange listener:
window.addEventListener('orientationchange', () => {
    if (orientationTimeoutId !== null) {
        clearTimeout(orientationTimeoutId);  // Cancel old
    }
    orientationTimeoutId = setTimeout(() => {
        handleResizeEvent(game, resizeCanvas);
        orientationTimeoutId = null;

        if (pendingPlayerData !== null && isLandscape()) {
            game.startGame(pendingPlayerData);
        }
    }, 300);  // Initially 100ms, increased to 300ms
});
```

**Rationale:**
- Prevent race conditions by canceling pending resize operations
- 300ms delay gives browser time to complete orientation animation
- Ensure viewport dimensions are finalized before calculations

**Why It Failed:**
- **300ms delay is arbitrary** - no evidence this is sufficient for all devices
- `visualViewport` API updates might not complete within 300ms on slow devices
- Some devices fire `orientationchange` multiple times during single rotation
- If no portrait detected initially, `pendingPlayerData` is never used
- `isLandscape()` called after timeout - might catch intermediate state

---

### Fix #4: Mobile Browser vs PWA Viewport Strategy (2025-01-05)
**Location:** `js/core/viewport.js` lines 46-75
**Mechanism:**
```javascript
export function getViewportDimensions() {
    const isMobile = isMobileDevice();
    const isStandalone = isStandaloneMode();

    // Mobile Browser (NOT PWA): Use stable window.innerHeight
    if (isMobile && !isStandalone) {
        return {
            width: window.innerWidth,
            height: window.innerHeight  // Stable
        };
    }

    // PWA: Use visualViewport (handles notches)
    if (window.visualViewport) {
        return {
            width: window.visualViewport.width,
            height: window.visualViewport.height
        };
    }

    // Fallback
    return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
    };
}
```

**Rationale:**
- Mobile browsers have stable `window.innerHeight` (doesn't change during address bar animation)
- PWA mode uses `visualViewport` to handle notches and safe areas
- Prevents constant canvas resizing during scroll in mobile browsers

**Why This Doesn't Solve Portrait Bug:**
- Doesn't detect portrait at all - just returns viewport dimensions
- If called during portrait orientation, returns portrait dimensions
- No logic to wait for landscape before using dimensions
- Aspect ratio calculations (lines 77-107) work with whatever dimensions are provided
- **Amplifies bug:** `calculateGameArea()` creates huge virtual canvas for narrow aspect ratios

---

### Fix #5: Forced Synchronous Viewport Update (2025-01-07)
**Location:** `js/sketch.js` lines 125-132, 515-521
**Mechanism:**
```javascript
// Before starting game (landscape start):
const dims = updateGameDimensions(game);
resizeCanvas(dims.width, dims.height);  // Synchronous resize
game.startGame(playerData);

// After orientationchange (portrait→landscape):
if (pendingPlayerData !== null && isLandscape()) {
    const dims = updateGameDimensions(game);
    resizeCanvas(dims.width, dims.height);  // Synchronous resize
    game.startGame(pendingPlayerData);
    pendingPlayerData = null;
}
```

**Rationale:**
- Call `updateGameDimensions()` IMMEDIATELY when startGame event fires
- Ensure viewport.js has latest dimensions before `Game.startGame()` creates enemies
- Synchronize canvas resize with game logic

**Why It Failed:**
- **Too late if already portrait:** If user is in portrait when they click Start, this still gets portrait dimensions
- **CSS hasn't been applied yet:** Canvas might be hidden by CSS but dimensions already calculated
- **Timing gap:** Between `orientationchange` event and this code, intermediate states can occur
- If portrait detected at line 108, this code never executes (early return)
- Event listener might not be registered yet when `orientationchange` fires

---

### Fix #6: visualViewport Event Filtering (2025-01-05)
**Location:** `js/sketch.js` lines 484-496
**Mechanism:**
```javascript
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (isStandaloneMode()) {  // Only in PWA
            handleResizeEvent(game, resizeCanvas);
        }
    });
    window.visualViewport.addEventListener('scroll', () => {
        if (isStandaloneMode()) {
            handleResizeEvent(game, resizeCanvas);
        }
    });
}
```

**Rationale:** Don't respond to `visualViewport` resize in mobile browser (address bar showing/hiding), only in PWA.

**Why This Doesn't Help With Portrait:**
- Doesn't prevent portrait at all - just prevents excessive mobile browser resizes
- PWA running in portrait will still respond to this
- Orientation change might not trigger `visualViewport` resize event
- Desktop fallback (`window.windowResized()`) is never filtered

---

### Fix #7: isLandscape() Uses matchMedia (2025-01-09)
**Location:** `js/sketch.js` lines 34-37
**Mechanism:**
```javascript
// Helper function to check if device is in landscape orientation
// Uses matchMedia to sync with CSS @media (orientation: portrait/landscape)
function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
}
```

**Rationale:** Sync JavaScript orientation detection with CSS media query engine instead of comparing `window.innerWidth > window.innerHeight`.

**Why It Failed:**
- **matchMedia relies on CSS engine** - might lag 50-200ms behind actual rotation
- No fallback to direct dimension comparison
- Can return false even if device is physically landscape (during transition)
- Doesn't solve timing race between CSS update and JavaScript execution
- Still called inside 300ms timeout - might catch intermediate state

---

### Fix #8: validateEntityPositions() Safety Net (2025-01-08)
**Location:** `js/Game.js` lines 685-728
**Mechanism:**
```javascript
validateEntityPositions() {
    const safeZoneX = getSafeZoneX();
    const safeZoneY = getSafeZoneY();

    // Check if player Y is way off-screen (more than 2x safe zone height)
    if (this.player.y > safeZoneY + SAFE_ZONE_HEIGHT * 2 ||
        this.player.y < safeZoneY - SAFE_ZONE_HEIGHT) {
        console.warn('⚠️ Player off-screen detected. Repositioning...');
        this.player.x = safeZoneX + SAFE_ZONE_WIDTH / 2 - 25;
        this.player.y = safeZoneY + SAFE_ZONE_HEIGHT - 70;
    }

    // Check enemies
    let enemiesOffScreen = false;
    for (let enemy of this.enemies) {
        if (enemy.targetY > safeZoneY + SAFE_ZONE_HEIGHT * 2 ||
            enemy.targetY < safeZoneY - SAFE_ZONE_HEIGHT) {
            enemiesOffScreen = true;
            break;
        }
    }

    if (enemiesOffScreen) {
        console.warn('⚠️ Enemies off-screen detected. Resetting wave...');
        this.enemies = [];
        this.initEnemies();
    }
}

// Called in startGame():
startGame(playerData) {
    this.playerData = playerData;
    this.resetGame();
    this.validateEntityPositions();  // Safety net
    this.gameState = GameStates.PLAYING;
}
```

**Rationale:** Automatically detect and correct off-screen entities after creation; safety net for timing issues.

**Why It Failed:**
- **Validation happens AFTER entities spawn** - brief moment where game is running with wrong positions
- **Viewport might still be stale** - `getSafeZoneY()` might return portrait values during validation
- **Draw loop already started** - `gameState = PLAYING` means collision detection is running
- **Canvas might be hidden** - validation runs but player can't see or interact
- Doesn't prevent the root cause - just tries to fix symptoms

---

## Why Fixes Failed Collectively

### Pattern #1: Layered Approach Without Synchronization
- Each layer tries to fix different aspect (CSS, JS, viewport, events)
- No single source of truth for "is device in portrait?"
- CSS media query, JavaScript `isLandscape()`, and device orientation API all potentially out of sync

### Pattern #2: Timing Races Without Blocking
- `orientationchange` listener uses 300ms timeout instead of blocking game start
- No wait-synchronization mechanism
- Multiple async operations: CSS change, viewport resize, event listeners, game initialization

### Pattern #3: Viewport Calculated Before Orientation Locked
- `viewport.js` processes dimensions immediately, regardless of orientation state
- `calculateGameArea()` doesn't validate orientation before using aspect ratio
- If aspect ratio is portrait, all downstream calculations are wrong

### Pattern #4: No Explicit Orientation Lock
- `manifest.json` might specify orientation, but not enforced in code
- Browser doesn't prevent portrait mode - just shows hint
- Game can technically start in portrait if events fire in wrong order

### Pattern #5: Ambiguous "Landscape" Requirement
- `isLandscape()` uses `matchMedia` - relies on browser's CSS engine
- `matchMedia` might lag behind actual physical orientation
- No fallback check: `window.innerWidth > window.innerHeight`

### Pattern #6: CSS Specificity Issues
- `display: none` in media query vs `display: block` inline style
- Media query might win during orientation transition
- No explicit canvas state management

---

## Technical Debt & Critical Code Issues

### Issue A: isLandscape() Timing Lag
```javascript
function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
}
```
- Relies on CSS media query engine - might lag 50-200ms behind actual rotation
- No fallback to direct dimension comparison
- Can return false even if device is physically landscape (during transition)

### Issue B: calculateGameArea() Aspect Ratio Amplification
```javascript
export function calculateGameArea() {
    const { width, height } = getViewportDimensions();
    const screenAspect = width / height;
    const safeAspect = SAFE_ZONE_WIDTH / SAFE_ZONE_HEIGHT;  // 2.0

    if (isMobileDevice()) {
        if (screenAspect >= safeAspect) {
            // Landscape-like: use full height, add side margins
            _VIRTUAL_WIDTH = SAFE_ZONE_HEIGHT * screenAspect;
            _VIRTUAL_HEIGHT = SAFE_ZONE_HEIGHT;
        } else {
            // Portrait-like: HUGE virtual height created here!
            _VIRTUAL_WIDTH = SAFE_ZONE_WIDTH;
            _VIRTUAL_HEIGHT = SAFE_ZONE_WIDTH / screenAspect;  // 1200 / 0.46 ≈ 2608px
        }
    }
}
```
- **No check preventing portrait from reaching this code**
- Portrait creates `_VIRTUAL_HEIGHT = 1200 / 0.55 = 2180px` - completely wrong
- Game tries to center this huge virtual space - entities spawn off-screen below visible area

### Issue C: startGame vs orientationchange Race
- `startGame` event handler checks `isLandscape()` at line 108
- `orientationchange` listener at line 498 also calls `game.startGame()`
- Both trying to start game - could start twice if timing aligns wrong
- No mutex/lock to prevent double-start

### Issue D: pendingPlayerData Single-Use Limitation
```javascript
if (!isLandscape() && isMobileDevice()) {
    pendingPlayerData = playerData;
    return;  // Exits - never reaches game.startGame()
}
```
- If `orientationchange` fires BEFORE this code, `pendingPlayerData` is null
- If user rotates BEFORE completing registration form, value is null
- If multiple `orientationchange` events fire, only last one works
- No validation that `pendingPlayerData` is not stale

### Issue E: 300ms Timeout Magic Number
```javascript
orientationTimeoutId = setTimeout(() => {
    // ...
}, 300);  // Why 300ms?
```
- Arbitrary delay with no empirical basis
- Different devices have different orientation animation speeds:
  - iOS Safari: ~200-300ms
  - Chrome Android: ~100-200ms
  - Firefox Android: ~150-250ms
- No adaptive delay based on device performance

---

## Future Investigation Points (Speculative)

### 1. **Check manifest.json for Orientation Lock Enforcement**
**Why:** PWA manifest can specify `"orientation": "landscape"` but this might not be enforced in browser mode.

**Investigation Steps:**
- Open `manifest.json` and verify orientation property
- Test if browser respects this setting vs PWA mode
- Check if we need JavaScript enforcement: `screen.orientation.lock('landscape')`

**Potential Fix:** Add explicit orientation lock in code:
```javascript
if ('orientation' in screen) {
    screen.orientation.lock('landscape').catch(err => {
        console.warn('Orientation lock failed:', err);
    });
}
```

---

### 2. **Test if orientationchange Event Fires Reliably**
**Why:** Some browsers might not fire `orientationchange` or fire it multiple times.

**Investigation Steps:**
- Add comprehensive logging:
  ```javascript
  let orientationChangeCount = 0;
  window.addEventListener('orientationchange', () => {
      console.log(`orientationchange #${++orientationChangeCount}`, {
          matchMedia: window.matchMedia('(orientation: landscape)').matches,
          dimensions: `${window.innerWidth}x${window.innerHeight}`,
          visualViewport: window.visualViewport ?
              `${window.visualViewport.width}x${window.visualViewport.height}` : 'N/A',
          timestamp: Date.now()
      });
  });
  ```
- Test on iPhone Safari, Chrome Android, Firefox Android
- Check if event fires during PWA install flow
- Test rotation speed impact (fast vs slow rotation)

**Potential Fix:** Use `window.resize` event as fallback:
```javascript
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Detect orientation change by dimension swap
    if ((lastWidth < lastHeight && newWidth > newHeight) ||
        (lastWidth > lastHeight && newWidth < newHeight)) {
        console.log('Orientation changed via resize event');
        handleOrientationChange();
    }

    lastWidth = newWidth;
    lastHeight = newHeight;
});
```

---

### 3. **Check screen.orientation API vs matchMedia**
**Why:** Modern browsers have `screen.orientation` API which might be more reliable than `matchMedia`.

**Investigation Steps:**
- Check browser support:
  ```javascript
  if ('orientation' in screen) {
      console.log('screen.orientation supported');
      console.log('Current orientation:', screen.orientation.type);
      console.log('Angle:', screen.orientation.angle);
  } else {
      console.log('screen.orientation NOT supported - fallback to matchMedia');
  }
  ```
- Compare `screen.orientation.type` vs `matchMedia('(orientation: landscape)')` during rotation
- Test timing lag: which updates first?

**Potential Fix:** Use screen.orientation as primary detection:
```javascript
function isLandscape() {
    // Try modern API first
    if ('orientation' in screen && screen.orientation) {
        return screen.orientation.type.includes('landscape');
    }

    // Fallback to matchMedia
    if (window.matchMedia) {
        return window.matchMedia('(orientation: landscape)').matches;
    }

    // Last resort: dimension comparison
    return window.innerWidth > window.innerHeight;
}
```

---

### 4. **Check if Canvas Needs to be Visible Before resizeCanvas() Works**
**Why:** p5.js `resizeCanvas()` might not apply correctly if canvas has `display: none`.

**Investigation Steps:**
- Add logging before/after `resizeCanvas()`:
  ```javascript
  const canvasEl = document.querySelector('canvas');
  console.log('Canvas before resize:', {
      display: window.getComputedStyle(canvasEl).display,
      width: canvasEl.width,
      height: canvasEl.height
  });

  resizeCanvas(dims.width, dims.height);

  console.log('Canvas after resize:', {
      display: window.getComputedStyle(canvasEl).display,
      width: canvasEl.width,
      height: canvasEl.height
  });
  ```
- Test if resize values stick when canvas is hidden
- Test if p5.js internally checks canvas visibility

**Potential Fix:** Force canvas visible before resizing:
```javascript
const canvasEl = document.querySelector('canvas');
const originalDisplay = window.getComputedStyle(canvasEl).display;

// Temporarily show canvas if hidden
if (originalDisplay === 'none') {
    canvasEl.style.display = 'block';
}

resizeCanvas(dims.width, dims.height);

// Restore original state if needed
if (originalDisplay === 'none' && !isLandscape()) {
    canvasEl.style.display = 'none';
}
```

---

### 5. **Check Browser-Specific Event Timing (Chrome vs Safari)**
**Why:** iOS Safari and Chrome Android have different event firing orders during orientation change.

**Investigation Steps:**
- Create comprehensive event logger:
  ```javascript
  const eventLog = [];

  ['orientationchange', 'resize', 'visualViewport.resize', 'visualViewport.scroll'].forEach(eventName => {
      const target = eventName.includes('visualViewport') ? window.visualViewport : window;
      const actualEventName = eventName.replace('visualViewport.', '');

      target.addEventListener(actualEventName, () => {
          eventLog.push({
              event: eventName,
              timestamp: Date.now(),
              dimensions: `${window.innerWidth}x${window.innerHeight}`,
              matchMedia: window.matchMedia('(orientation: landscape)').matches
          });
      });
  });

  // Log sequence after orientation change
  setTimeout(() => console.table(eventLog), 1000);
  ```
- Compare event sequence on iOS Safari vs Chrome Android
- Note which event fires first, which has correct dimensions

**Potential Fix:** Use earliest reliable event per browser:
```javascript
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);

if (isIOS || isSafari) {
    // Safari: resize event is more reliable
    window.addEventListener('resize', handleOrientationChange);
} else {
    // Chrome: orientationchange works well
    window.addEventListener('orientationchange', handleOrientationChange);
}
```

---

### 6. **Check p5.js Orientation Handling Built-ins**
**Why:** p5.js might have built-in orientation change handling we're not using.

**Investigation Steps:**
- Review p5.js documentation for:
  - `windowResized()` function (already used, but check if it handles orientation)
  - `deviceOrientation` variable
  - `setAttributes()` options for orientation
- Check if p5.js has internal orientation lock features
- Test if p5.js automatically handles canvas resize on orientation change

**Potential Fix:** Use p5.js native orientation detection:
```javascript
// In sketch.js
window.deviceOrientation = function() {
    console.log('p5.js deviceOrientation fired');
    handleOrientationChange();
};
```

---

### 7. **Check Blocking vs Async Orientation Detection**
**Why:** All current fixes are async (timeouts, event listeners). A blocking approach might be more reliable.

**Investigation Steps:**
- Test synchronous orientation check loop:
  ```javascript
  function waitForLandscape(callback, timeout = 5000) {
      const startTime = Date.now();

      function check() {
          if (isLandscape()) {
              console.log('Landscape detected after', Date.now() - startTime, 'ms');
              callback();
          } else if (Date.now() - startTime < timeout) {
              requestAnimationFrame(check);
          } else {
              console.warn('Landscape timeout after', timeout, 'ms');
          }
      }

      check();
  }
  ```
- Test if blocking loop prevents race conditions
- Measure performance impact on slow devices

**Potential Fix:** Replace timeout with polling loop:
```javascript
if (!isLandscape() && isMobileDevice()) {
    pendingPlayerData = playerData;
    console.log('⚠️ Portrait mode detected. Waiting for landscape...');

    // Poll every frame until landscape
    waitForLandscape(() => {
        const dims = updateGameDimensions(game);
        resizeCanvas(dims.width, dims.height);
        game.startGame(pendingPlayerData);
        pendingPlayerData = null;
    });

    return;
}
```

---

### 8. **Check Entity Spawning Deferral to draw() Loop**
**Why:** Entities might spawn correctly if we wait until draw() confirms canvas is visible and dimensions are correct.

**Investigation Steps:**
- Test deferred entity creation:
  ```javascript
  let entitiesInitialized = false;

  function draw() {
      if (game.gameState === GameStates.PLAYING && !entitiesInitialized) {
          // First frame of gameplay - ensure viewport is correct
          const canvasEl = document.querySelector('canvas');
          const isVisible = window.getComputedStyle(canvasEl).display !== 'none';

          if (isVisible && isLandscape()) {
              game.initEnemies();
              entitiesInitialized = true;
              console.log('✅ Entities initialized in draw() loop');
          } else {
              console.warn('⚠️ Waiting for visible landscape canvas...');
              return; // Skip this frame
          }
      }

      // Normal draw logic
      game.update(deltaTime);
      game.draw();
  }
  ```
- Check if entities spawn at correct coordinates
- Measure delay impact on UX

**Potential Fix:** Two-phase game start (state change → entity spawn):
```javascript
startGame(playerData) {
    this.playerData = playerData;
    this.gameState = GameStates.PLAYING;
    this.entitiesPending = true;  // Flag for draw() loop
    // Don't call resetGame() yet
}

// In draw():
if (this.entitiesPending && isLandscape() && canvasVisible) {
    this.resetGame();  // Now create entities
    this.entitiesPending = false;
}
```

---

### 9. **Check Viewport Dimension Caching Issues**
**Why:** viewport.js might cache dimensions and not update when orientation changes.

**Investigation Steps:**
- Add logging to all viewport.js functions:
  ```javascript
  export function getViewportDimensions() {
      const dims = { /* calculation */ };
      console.log('getViewportDimensions called:', dims);
      return dims;
  }

  export function calculateGameArea() {
      console.log('calculateGameArea called, before:', {
          VIRTUAL_WIDTH: _VIRTUAL_WIDTH,
          VIRTUAL_HEIGHT: _VIRTUAL_HEIGHT
      });

      // calculation...

      console.log('calculateGameArea called, after:', {
          VIRTUAL_WIDTH: _VIRTUAL_WIDTH,
          VIRTUAL_HEIGHT: _VIRTUAL_HEIGHT,
          safeZoneX: _safeZoneX,
          safeZoneY: _safeZoneY
      });
  }
  ```
- Check if `_VIRTUAL_WIDTH`, `_VIRTUAL_HEIGHT` are stale during orientation change
- Test if calling `updateGameDimensions()` multiple times updates values

**Potential Fix:** Force viewport cache clear:
```javascript
export function clearViewportCache() {
    _VIRTUAL_WIDTH = undefined;
    _VIRTUAL_HEIGHT = undefined;
    _safeZoneX = 0;
    _safeZoneY = 0;
    _scaleFactor = 1;
    _offsetX = 0;
    _offsetY = 0;
}

// In sketch.js before orientation-sensitive operations:
clearViewportCache();
const dims = updateGameDimensions(game);
```

---

### 10. **Check if p5.js setup() Waits for Canvas Visibility**
**Why:** p5.js might have internal logic that waits for canvas to be visible before running `setup()`.

**Investigation Steps:**
- Add logging to `window.setup()`:
  ```javascript
  window.setup = function() {
      console.log('p5.js setup() called:', {
          canvasExists: !!document.querySelector('canvas'),
          canvasDisplay: window.getComputedStyle(document.querySelector('canvas')).display,
          dimensions: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: Date.now()
      });

      // existing setup code...
  };
  ```
- Test if setup() is called before or after CSS media query applies
- Check if setup() can be called multiple times safely

**Potential Fix:** Re-run setup() on orientation change:
```javascript
window.addEventListener('orientationchange', () => {
    if (orientationTimeoutId !== null) {
        clearTimeout(orientationTimeoutId);
    }

    orientationTimeoutId = setTimeout(() => {
        console.log('Re-running setup() after orientation change');

        // Clear existing game state
        if (game) {
            game.cleanup();
        }

        // Re-run setup (p5.js might handle this automatically)
        setup();

        handleResizeEvent(game, resizeCanvas);
        orientationTimeoutId = null;
    }, 300);
});
```

---

### 11. **Check CSS Media Query Application Timing**
**Why:** CSS media query might not apply instantly when JavaScript checks orientation.

**Investigation Steps:**
- Test synchronous CSS check vs matchMedia:
  ```javascript
  function checkCSSState() {
      const canvasEl = document.querySelector('canvas');
      const orientationHint = document.getElementById('orientation-hint');

      console.log('CSS State:', {
          canvasDisplay: window.getComputedStyle(canvasEl).display,
          hintDisplay: window.getComputedStyle(orientationHint).display,
          matchMedia: window.matchMedia('(orientation: landscape)').matches,
          dimensions: `${window.innerWidth}x${window.innerHeight}`
      });
  }

  // Check before and after orientation change
  window.addEventListener('orientationchange', () => {
      console.log('Immediately after orientationchange:');
      checkCSSState();

      setTimeout(() => {
          console.log('After 100ms:');
          checkCSSState();
      }, 100);

      setTimeout(() => {
          console.log('After 300ms:');
          checkCSSState();
      }, 300);
  });
  ```
- Measure CSS application lag
- Check if forcing reflow helps: `canvasEl.offsetHeight; // Force reflow`

**Potential Fix:** Force CSS reflow before checking orientation:
```javascript
function isLandscapeReliable() {
    // Force browser to apply pending CSS changes
    document.body.offsetHeight;

    // Now check orientation
    return window.matchMedia('(orientation: landscape)').matches;
}
```

---

### 12. **Check manifest.json Start URL Conflicts**
**Why:** PWA `start_url` might bypass orientation checks if it loads a different page state.

**Investigation Steps:**
- Review `manifest.json` start_url setting
- Test if PWA loads from cached state vs fresh load
- Check if service worker caching affects orientation detection

**Potential Fix:** Add orientation check to manifest or service worker:
```json
{
  "start_url": "/?orientation=landscape",
  "orientation": "landscape"
}
```

---

## Next Steps

### Immediate Actions Needed
1. **Comprehensive Event Logging:** Add detailed logging to all orientation-related code
2. **Device Testing Matrix:** Test on multiple devices with logging enabled
3. **Collect Timing Data:** Measure actual event firing order and delays
4. **Identify Device-Specific Behavior:** Determine if iPhone vs Android have different patterns

### Long-Term Solutions to Investigate
1. **Blocking Orientation Lock:** Use `screen.orientation.lock()` API
2. **Deferred Entity Spawning:** Don't create entities until draw() loop confirms ready state
3. **Viewport Cache Invalidation:** Force clear viewport cache on orientation change
4. **Multi-Event Synchronization:** Wait for BOTH `orientationchange` AND `resize` events
5. **CSS-JavaScript Sync:** Force CSS reflow before checking orientation state

---

## References

### Related Files
- `js/sketch.js` - Main game loop, orientation event listeners
- `js/core/viewport.js` - Viewport dimension calculations
- `js/Game.js` - Entity spawning, validateEntityPositions()
- `index.html` - CSS media queries, PWA flow, startGameFromPWA()
- `manifest.json` - PWA orientation settings

### Key Functions
- `isLandscape()` - Orientation detection (sketch.js:34-37)
- `getViewportDimensions()` - Viewport size query (viewport.js:46-75)
- `calculateGameArea()` - Virtual canvas calculation (viewport.js:77-107)
- `updateGameDimensions()` - Viewport recalculation (viewport.js:135-147)
- `startGameFromPWA()` - Game start trigger (index.html:422-436)
- `validateEntityPositions()` - Off-screen detection (Game.js:685-728)

### Console Commands for Debugging
```javascript
// Check current orientation state
console.log({
    matchMedia: window.matchMedia('(orientation: landscape)').matches,
    dimensions: `${window.innerWidth}x${window.innerHeight}`,
    screenOrientation: screen.orientation?.type,
    canvasDisplay: window.getComputedStyle(document.querySelector('canvas')).display,
    virtualDimensions: `${getVirtualWidth()}x${getVirtualHeight()}`,
    safeZone: `${getSafeZoneX()},${getSafeZoneY()}`,
    scaleFactor: getScaleFactor()
});

// Check entity positions
console.log({
    playerX: game.player.x,
    playerY: game.player.y,
    enemyCount: game.enemies.length,
    firstEnemyY: game.enemies[0]?.y
});
```

---

**Last Updated:** 2025-01-09
**Status:** Bug still occurring after 8 fix attempts
**Priority:** CRITICAL - Blocks mobile gameplay
