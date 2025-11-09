p5.disableFriendlyErrors = true;

import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT } from './core/constants.js';
import {
    getVirtualWidth,
    getVirtualHeight,
    getSafeZoneX,
    getSafeZoneY,
    getScaleFactor,
    getOffsetX,
    getOffsetY,
    getViewportDimensions,
    updateGameDimensions,
    handleResizeEvent,
    isMobileDevice,
    isStandaloneMode,
    clearViewportCache
} from './core/viewport.js';
import {
    handleTouches,
    handleMousePressed,
    handleTouchStarted,
    handleKeyPressed
} from './core/input.js';
import { Game } from './Game.js';
import { GameStates } from './core/GameStates.js';
import { sendStatsToGoogleSheets } from './utils/analytics.js';

let game;
let lastTime = 0;
let orientationTimeoutId = null; // Track pending orientation resize
let pendingPlayerData = null; // Store player data when waiting for landscape orientation

// Helper function to check if device is in landscape orientation
// Uses matchMedia to sync with CSS @media (orientation: portrait/landscape)
function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
}

// Multi-signal landscape detection - all sources must agree
// Uses 3 independent signals to confirm orientation:
// 1. CSS matchMedia (browser layout engine)
// 2. Dimension comparison (physical viewport size)
// 3. Screen Orientation API (native device orientation)
function isLandscapeConfirmed() {
    // Signal 1: CSS media query
    const matchMedia = window.matchMedia('(orientation: landscape)').matches;

    // Signal 2: Direct dimension comparison
    const { width, height } = getViewportDimensions();
    const dimensions = width > height;

    // Signal 3: Screen Orientation API (if available)
    let orientation = true; // Assume landscape if API not available
    if ('orientation' in screen && screen.orientation) {
        orientation = screen.orientation.type.includes('landscape');
    }

    // ALL THREE must agree for confirmed landscape
    const confirmed = matchMedia && dimensions && orientation;

    // Debug logging only when signals disagree
    if (!confirmed && isMobileDevice()) {
        console.log(`🔍 Landscape check: matchMedia=${matchMedia}, dimensions=${dimensions} (${width}x${height}), orientation=${orientation}`);
    }

    return confirmed;
}

// Blocking landscape wait - polls until orientation confirmed
// Uses requestAnimationFrame for smooth polling (doesn't block main thread)
// Max timeout prevents infinite waiting
function waitForLandscape(callback, timeoutMs = 5000) {
    const startTime = Date.now();
    let frameCount = 0;

    function check() {
        frameCount++;
        const elapsed = Date.now() - startTime;

        if (isLandscapeConfirmed()) {
            console.log(`✅ Landscape confirmed after ${elapsed}ms (${frameCount} frames)`);
            callback();
        } else if (elapsed < timeoutMs) {
            // Keep polling
            requestAnimationFrame(check);
        } else {
            console.warn(`⚠️ Landscape wait timeout after ${timeoutMs}ms. User might still be in portrait!`);
            console.warn('⚠️ Proceeding anyway - game may have visual issues.');
            // Call callback anyway - let validation gate catch portrait
            callback();
        }
    }

    check();
}

// p5.js Core Functions
window.preload = function() {
    game = new Game();
    game.spaceImg = loadImage("./assets/spaceship.png");
    // enemyImg removed - using penguinIdleImg as fallback instead (alien1.png deleted)
    game.enemyImg = null;
    game.bossImg = loadImage("./assets/boss.png");
    game.cometImg = loadImage("./assets/comet.png");
    game.heartImg = loadImage("./assets/heart.png");

    // Load penguin enemy animations
    game.penguinIdleImg = loadImage("./assets/penguin/1.png");
    game.penguinDeathFrames = [];
    for (let i = 2; i <= 9; i++) {
        game.penguinDeathFrames.push(loadImage(`./assets/penguin/${i}.png`));
    }

    // Load power-up icons
    game.shieldImg = loadImage("./assets/shield.png");
    game.autofireImg = loadImage("./assets/autofire.png");
    game.tripleshotImg = loadImage("./assets/tripleshot.png");
    game.rocketImg = loadImage("./assets/rocket.png");

    // Load font for pixel art style UI
    game.pixelFont = loadFont('./assets/PressStart2P-Regular.ttf');
}

window.setup = function() {
    const { width, height } = getViewportDimensions();
    const canvas = createCanvas(width, height);
    const context = canvas.elt.getContext('2d');
    context.imageSmoothingEnabled = false;

    // OPTIMIZED: pixelDensity(1) for maximum mobile performance
    // pixelDensity(2) = 4× more pixels = 4× GPU load
    // With optimized text cache, we don't need high density for crisp text
    pixelDensity(1); // Was: isMobileDevice() ? 2 : 1

    // NOTE: If text quality is poor on hi-DPI screens, consider:
    // - Adaptive: pixelDensity(isMobileDevice() && navigator.deviceMemory >= 4 ? 2 : 1)
    // - Or simply revert to: pixelDensity(isMobileDevice() ? 2 : 1)

    updateGameDimensions(game);
    game.setup();

    // Canvas is hidden by default via CSS (no inline style needed)
    // See index.html: canvas { display: none; }

    // Try to lock orientation to landscape in PWA/standalone mode
    if (isStandaloneMode() && 'orientation' in screen && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').then(() => {
            console.log('✅ Orientation locked to landscape (PWA mode)');
        }).catch(err => {
            console.warn('⚠️ Orientation lock failed:', err.message);
            console.warn('   This is normal if not in fullscreen or if browser doesn\'t support it');
        });
    } else {
        if (isMobileDevice()) {
            console.log('📱 Orientation lock not available (browser mode or unsupported)');
            console.log('   Using fallback: CSS media query + JavaScript detection');
        }
    }

    // Listen for start game event from HTML menu
    window.addEventListener('startGame', function(e) {
        const playerData = e.detail;

        // Hide HTML menu
        const menuOverlay = document.getElementById('start-menu');
        if (menuOverlay) {
            menuOverlay.style.display = 'none';
        }

        // Show canvas via CSS class (not inline style)
        canvas.elt.classList.add('game-ready');

        // Runtime PWA detection - warn if not in standalone mode
        const isStandalone = window.matchMedia('(display-mode: fullscreen)').matches ||
                            window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone === true;
        if (!isStandalone) {
            console.warn('⚠️ Ostrzeżenie: Gra nie działa w trybie PWA. Dla najlepszego doświadczenia uruchom z ikony na ekranie głównym.');
            // Store warning flag for potential UI display
            game.pwaWarning = true;
        } else {
            game.pwaWarning = false;
        }

        // Preload online leaderboard (non-blocking)
        game.scoreManager.preloadLeaderboard(10);

        // CRITICAL FIX: Multi-signal orientation check before starting game
        // If in portrait, use blocking poll to wait for landscape confirmation
        if (!isLandscapeConfirmed() && isMobileDevice()) {
            // Save player data for when landscape is confirmed
            pendingPlayerData = playerData;
            console.log('⚠️ Portrait mode detected. Waiting for landscape rotation...');
            // Canvas is shown so #orientation-hint becomes visible

            // Use blocking poll instead of event listener (eliminates race condition)
            waitForLandscape(() => {
                console.log('✅ Landscape confirmed. Starting game...');

                // Cancel any pending orientation timeout
                if (orientationTimeoutId !== null) {
                    clearTimeout(orientationTimeoutId);
                    orientationTimeoutId = null;
                }

                // Clear viewport cache to force fresh calculation
                clearViewportCache();

                // Force viewport recalculation with confirmed landscape dimensions
                const dims = updateGameDimensions(game);
                resizeCanvas(dims.width, dims.height);

                // Start the game with player data
                game.startGame(pendingPlayerData);
                pendingPlayerData = null; // Clear pending data
            });
            return;
        }

        // Landscape confirmed - start game immediately
        // Cancel any pending orientation resize
        if (orientationTimeoutId !== null) {
            clearTimeout(orientationTimeoutId);
            orientationTimeoutId = null;
        }

        // Clear viewport cache to ensure fresh calculation
        clearViewportCache();

        // Force viewport recalculation before creating entities
        const dims = updateGameDimensions(game);
        resizeCanvas(dims.width, dims.height);

        // Start the game with player data
        game.startGame(playerData);
        pendingPlayerData = null; // Clear pending data after successful start
    });
}

window.draw = function() {
    const currentTime = millis();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    background(0);

    push();
    translate(getOffsetX(), getOffsetY());
    scale(getScaleFactor());

    drawGame(deltaTime);

    pop();
}

window.windowResized = function() {
    handleResizeEvent(game, resizeCanvas);
}

// Visual Safe Zone Indicator
function drawSafeZone() {
    push();

    // Subtle border
    stroke(100, 100, 150, 80);
    strokeWeight(2);
    noFill();
    rect(getSafeZoneX(), getSafeZoneY(), SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT);

    // Corner markers (visible only in dev mode)
    if (game.devOverlay && game.devOverlay.enabled) {
        fill(0, 255, 0, 150);
        noStroke();
        const markerSize = 10;

        rect(getSafeZoneX(), getSafeZoneY(), markerSize, markerSize);
        rect(getSafeZoneX() + SAFE_ZONE_WIDTH - markerSize, getSafeZoneY(), markerSize, markerSize);
        rect(getSafeZoneX(), getSafeZoneY() + SAFE_ZONE_HEIGHT - markerSize, markerSize, markerSize);
        rect(getSafeZoneX() + SAFE_ZONE_WIDTH - markerSize, getSafeZoneY() + SAFE_ZONE_HEIGHT - markerSize, markerSize, markerSize);
    }

    pop();
}

// Game Logic
function drawGame(deltaTime) {
    if (game.isTouchDevice) {
        handleTouches(game, touches);
    }

    // background(0); // REMOVED: Canvas already cleared in window.draw() - double clear was wasting ~1-2ms per frame

    // Route to appropriate screen based on game state
    switch (game.gameState) {
        case GameStates.MENU:
            drawMenuScreen(deltaTime);
            break;
        case GameStates.PLAYING:
            drawPlayingScreen(deltaTime);
            break;
        case GameStates.GAME_OVER:
            drawGameOverScreen(deltaTime);
            break;
    }
}

// Menu screen (now using HTML menu, not canvas)
function drawMenuScreen(deltaTime) {
    // HTML menu is displayed instead of canvas menu
    // Just draw stars as background for smooth transition
    game.drawStars(deltaTime);

    // Note: Canvas is hidden when in MENU state
    // The HTML menu (index.html) handles user input
}

// Playing screen (original game logic)
function drawPlayingScreen(deltaTime) {
    // Update performance monitor
    game.performanceMonitor.update(deltaTime);

    // DEFERRED ENTITY SPAWNING: Check if entities need to be spawned
    // This happens on first frame after startGame() when portrait->landscape transition
    if (game.entitiesPending) {
        // Spawn entities now that we're in draw loop
        // Viewport is guaranteed to be correct
        game.spawnEntities();
        return; // Skip this frame, entities will render next frame
    }

    // Draw safe zone border
    drawSafeZone();

    strokeWeight(1);

    if (game.gameOver) {
        // Game ended - should transition to GAME_OVER state
        return;
    }

    // PERFORMANCE: Clear and populate spatial grid for collision detection
    game.spatialGrid.clear();

    // Add all collidable objects to grid
    game.enemies.forEach(e => {
        if (e.active && e.animationState !== 'dying') {
            game.spatialGrid.insert(e);
        }
    });

    game.cometManager.comets.forEach(c => {
        if (c.active) {
            game.spatialGrid.insert(c);
        }
    });

    game.powerUpManager.powerUps.forEach(p => {
        if (p.active) {
            game.spatialGrid.insert(p);
        }
    });

    // Draw touch feedback (invisible strips with subtle feedback)
    if (game.isTouchDevice && game.leftTouchStrip) {
        game.leftTouchStrip.draw();
        game.rightTouchStrip.draw();
    }

    game.drawStars(deltaTime);

    // PERFORMANCE: Player rendering and logic
    game.performanceMonitor.startMeasure('player');

    // NULL CHECK: Player might be null during deferred spawning (entitiesPending=true)
    if (game.player) {
        game.player.show();
        game.player.move(deltaTime);
    } else {
        // This should only happen in first frame when entities are pending
        console.warn('⚠️ Player not initialized yet (frame skip during entity spawning)');
    }

    game.performanceMonitor.endMeasure();

    // PERFORMANCE: Enemies logic and batch rendering
    game.performanceMonitor.startMeasure('enemies');

    // Move all enemies and add to batch renderer
    game.enemyBatchRenderer.clear();

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        game.enemies[i].move(deltaTime);
        game.enemyBatchRenderer.addEnemy(game.enemies[i]);
    }

    // Render all enemies in batches (dramatically reduces state changes)
    game.enemyBatchRenderer.render(game);

    // Check entire formation boundaries (all enemies move together)
    game.updateFormationMovement();
    game.performanceMonitor.endMeasure();

    // PERFORMANCE: Projectiles and collision detection
    game.performanceMonitor.startMeasure('projectiles');
    for (let p of game.playerProjectilePool.pool) {
        if (!p.active) continue;

        if (p.isOutOfBounds()) {
            game.playerProjectilePool.release(p);
            continue;
        }

        p.show();
        p.move(deltaTime);

        // Check collision with enemies - OPTIMIZED with spatial grid
        game.performanceMonitor.endMeasure();
        game.performanceMonitor.startMeasure('collision');

        let hitSomething = false;
        const potentialHits = game.spatialGrid.getPotentialCollisions(p);

        for (const target of potentialHits) {
            // Check if it's an enemy
            if (target.type && (target.type === 'basic' || target.type === 'boss' || target.type === 'penguin')) {
                // Can only hit enemies that are active, NOT dying, and NOT flying in
                if (p.hit(target) && target.active && target.animationState !== 'dying' && !target.isFlying) {
                    // Enemy takes damage
                    const destroyed = target.takeDamage();

                    if (destroyed) {
                        // Points per kill increase with wave (base 1 + wave bonus)
                        const killPoints = (1 + Math.floor(game.wave / 2)) * (target.type === 'boss' ? 10 : 1);
                        game.score += killPoints;
                        game.killedEnemies++;

                        // Try to spawn power-up at enemy position
                        game.powerUpManager.trySpawnPowerUp(target.x + target.w / 2, target.y);

                        // Don't remove from array yet - let death animation play
                        // Enemy will be removed in cleanup pass below
                    }

                    game.playerProjectilePool.release(p);
                    hitSomething = true;
                    break;
                }
            }
            // Check if it's a comet
            else if (target.size && !hitSomething) {
                if (p.hit(target) && target.active) {
                    game.cometManager.handleProjectileHit(target);
                    game.playerProjectilePool.release(p);
                    hitSomething = true;
                    break;
                }
            }
        }

        game.performanceMonitor.endMeasure();
        game.performanceMonitor.startMeasure('projectiles');
    }
    game.performanceMonitor.endMeasure();

    for (let p of game.enemyProjectilePool.pool) {
        if (!p.active) continue;

        if (p.isOutOfBounds()) {
            game.enemyProjectilePool.release(p);
            continue;
        }

        p.show();
        p.move(deltaTime);

        if (p.hit(game.player)) {
            if (!game.player.isInvulnerable()) {
                game.respawnPlayer();
            }
            game.enemyProjectilePool.release(p);
            break;
        }
    }

    // Rocket projectiles - with AOE damage
    for (let r of game.rocketPool.pool) {
        if (!r.active) continue;

        if (r.isOutOfBounds()) {
            game.rocketPool.release(r);
            continue;
        }

        r.show();
        r.move(deltaTime);

        // Check for direct hit on ANY enemy - OPTIMIZED with spatial grid
        const potentialRocketHits = game.spatialGrid.getPotentialCollisions(r);

        for (const target of potentialRocketHits) {
            // Check if it's an enemy
            if (target.type && (target.type === 'basic' || target.type === 'boss' || target.type === 'penguin')) {
                // Rocket can hit any enemy (even flying in)
                if (r.hit(target) && target.active && target.animationState !== 'dying') {
                    // Rocket hit! Destroy ALL enemies on screen
                    // console.log('ROCKET HIT! Destroying all enemies!'); // Removed for performance

                    // Draw massive explosion effect
                    push();
                    noFill();
                    stroke(255, 150, 0, 200);
                    strokeWeight(4);
                    ellipse(r.x, r.y, 300, 300);
                    fill(255, 200, 0, 100);
                    noStroke();
                    ellipse(r.x, r.y, 250, 250);
                    pop();

                    // Destroy ALL enemies
                    game.destroyAllEnemies();

                    game.rocketPool.release(r);
                    break;
                }
            }
        }
    }

    // Cleanup: Remove enemies that have finished death animation
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        if (!game.enemies[i].active) {
            game.enemies.splice(i, 1);
        }
    }

    // Check for wave completion (endless mode)
    if (game.enemies.length === 0 && !game.gameOver && !game.waveSpawnPending) {
        game.startNextWave();
    }

    // PERFORMANCE: Power-ups system
    game.performanceMonitor.startMeasure('powerups');
    game.updatePowerUps(deltaTime);
    game.powerUpManager.draw();
    game.performanceMonitor.endMeasure();

    // PERFORMANCE: Comets system
    game.performanceMonitor.startMeasure('comets');
    game.cometManager.draw();
    game.performanceMonitor.endMeasure();

    // PERFORMANCE: UI rendering
    game.performanceMonitor.startMeasure('ui');
    game.updateKilledText();
    game.updateWaveText();
    game.drawScore();
    game.drawLives();
    game.drawWaveBonus(deltaTime);
    game.weaponHeatBar.draw(game.player.weaponHeat);
    game.performanceMonitor.endMeasure();

    // Dev overlay - zawsze na końcu
    game.devOverlay.update(deltaTime);
    game.devOverlay.draw(game);

    // Performance Monitor - always visible in top-left corner
    game.performanceMonitor.draw();
}

// Game Over screen
function drawGameOverScreen(deltaTime) {
    // Draw stars in background
    game.drawStars(deltaTime);

    // Finalize statistics when game ends
    const stats = game.finalizeStats();

    // Log detailed stats to console only once
    if (!game.statsLogged) {
        console.log("Game Statistics:", stats);

        // Get FPS stats from performance monitor
        const fpsStats = game.performanceMonitor.getFpsStats();
        console.log("FPS Statistics:", fpsStats);

        sendStatsToGoogleSheets(game.playerData, stats, fpsStats);
        game.statsLogged = true;
    }

    // Get top scores for leaderboard (synchronous - uses cache)
    const topScores = game.scoreManager.getTopScoresSync(4);

    // Find player's rank in full leaderboard
    const playerRank = game.scoreManager.findPlayerRank(
        game.playerData,
        game.score,
        Math.floor(game.stats.totalGameTime)
    );

    // Update game over screen (for hover effects and animation)
    const virtualMouseX = (mouseX - getOffsetX()) / getScaleFactor();
    const virtualMouseY = (mouseY - getOffsetY()) / getScaleFactor();
    game.gameOverScreen.update(virtualMouseX, virtualMouseY, deltaTime);

    // Draw game over screen
    game.gameOverScreen.draw(
        game.score,
        game.wave,
        Math.floor(game.stats.totalGameTime), // Use Math.floor for consistency with saved scores
        game.playerData,
        topScores,
        playerRank
    );
}

window.mousePressed = function() {
    handleMousePressed(game, mouseX, mouseY);
}

window.touchStarted = function() {
    return handleTouchStarted(game, touches);
}

window.keyPressed = function() {
    handleKeyPressed(game, key);
}

// Global Event Listeners
if (window.visualViewport) {
    // Tylko w trybie PWA/standalone reaguj na zmiany visualViewport
    // W przeglądarce mobilnej ignoruj zmiany spowodowane chowaniem/pokazywaniem paska adresu
    window.visualViewport.addEventListener('resize', () => {
        if (isStandaloneMode()) {
            handleResizeEvent(game, resizeCanvas);
        }
    });
    window.visualViewport.addEventListener('scroll', () => {
        if (isStandaloneMode()) {
            handleResizeEvent(game, resizeCanvas);
        }
    });
}
// Zawsze reaguj na zmianę orientacji (prawdziwa zmiana układu)
window.addEventListener('orientationchange', () => {
    // Cancel any pending orientation timeout
    if (orientationTimeoutId !== null) {
        clearTimeout(orientationTimeoutId);
        orientationTimeoutId = null;
    }

    console.log('📱 Orientation change detected');

    // Clear viewport cache immediately to prevent stale data
    clearViewportCache();

    // Use blocking poll to wait for confirmed landscape (eliminates timeout guessing)
    waitForLandscape(() => {
        handleResizeEvent(game, resizeCanvas);

        // CRITICAL FIX: Start pending game after rotation to landscape
        // This handles the scenario where user started game in portrait
        if (pendingPlayerData !== null) {
            console.log('✅ Starting pending game after landscape confirmation...');

            // Clear cache again before final calculation
            clearViewportCache();

            // Force SYNCHRONOUS viewport update with confirmed orientation
            const dims = updateGameDimensions(game);
            resizeCanvas(dims.width, dims.height);

            // Now safe to start the game (viewport is up-to-date)
            game.startGame(pendingPlayerData);
            pendingPlayerData = null; // Clear pending data
        }
    });
});
