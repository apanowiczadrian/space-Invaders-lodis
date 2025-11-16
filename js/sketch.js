p5.disableFriendlyErrors = true;

// Initialize debug logger (must be first to capture all console output)
import debugLogger from './debug/DebugLogger.js';

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
let isWaitingForLandscape = false; // Flag to track if waiting for landscape rotation
let orientationCheckTimer = null; // Debounce timer for orientation checks
let isCheckingOrientation = false; // Guard flag to prevent concurrent checks
let lastOrientationCheck = 0; // Timestamp of last runtime orientation check

// Helper function to check if device is in portrait orientation
function isPortrait() {
    const { width, height } = getViewportDimensions();
    return height > width;
}

// Helper function to show portrait warning overlay
function showPortraitWarning() {
    const portraitWarning = document.getElementById('portrait-warning');
    if (portraitWarning && !portraitWarning.classList.contains('active')) {
        portraitWarning.classList.add('active');
        console.log('📱 Portrait warning shown');
    }
}

// Helper function to hide portrait warning overlay
function hidePortraitWarning() {
    const portraitWarning = document.getElementById('portrait-warning');
    if (portraitWarning && portraitWarning.classList.contains('active')) {
        portraitWarning.classList.remove('active');
        console.log('📱 Portrait warning hidden');
    }
}

// Unified debounced orientation check function
function checkOrientation() {
    // Clear any pending check
    if (orientationCheckTimer) {
        clearTimeout(orientationCheckTimer);
    }

    // Debounce: wait 300ms for orientation to stabilize (iOS viewport lag)
    orientationCheckTimer = setTimeout(() => {
        // Guard: prevent concurrent execution
        if (isCheckingOrientation) {
            console.log('⚠️ Orientation check already in progress, skipping...');
            return;
        }

        isCheckingOrientation = true;

        try {
            const isCurrentlyPortrait = isPortrait();
            const isMobile = isMobileDevice();

            console.log(`🔄 Orientation check: ${isCurrentlyPortrait ? 'PORTRAIT' : 'LANDSCAPE'}, Mobile: ${isMobile}, Game State: ${game?.gameState || 'N/A'}`);

            // Skip orientation enforcement on desktop
            if (!isMobile) {
                console.log('💻 Desktop device, skipping orientation enforcement');
                hidePortraitWarning();
                isCheckingOrientation = false;
                return;
            }

            // SCENARIO 1: Pre-game (waiting for landscape to start)
            if (isWaitingForLandscape) {
                if (isCurrentlyPortrait) {
                    console.log('⚠️ Still in portrait, waiting for landscape...');
                    showPortraitWarning();
                } else {
                    console.log('✅ Landscape detected, reloading page...');
                    hidePortraitWarning();
                    // Reload to start game properly in landscape
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                }
                isCheckingOrientation = false;
                return;
            }

            // SCENARIO 2: During gameplay (runtime portrait detection)
            if (game && game.gameState === GameStates.PLAYING) {
                if (isCurrentlyPortrait) {
                    console.log('⏸️ Portrait detected during gameplay, pausing game...');
                    game.pauseGame();
                    showPortraitWarning();
                } else {
                    console.log('▶️ Landscape detected, game continues...');
                    hidePortraitWarning();
                }
                isCheckingOrientation = false;
                return;
            }

            // SCENARIO 3: Game paused due to portrait, now back to landscape
            if (game && game.gameState === GameStates.PAUSED) {
                if (!isCurrentlyPortrait) {
                    console.log('▶️ Landscape restored, resuming game...');
                    hidePortraitWarning();
                    game.resumeGame();
                } else {
                    console.log('⏸️ Still in portrait, keeping game paused...');
                    showPortraitWarning();
                }
                isCheckingOrientation = false;
                return;
            }

            // SCENARIO 4: Other states (MENU, GAME_OVER) - just hide warning
            if (game && (game.gameState === GameStates.MENU || game.gameState === GameStates.GAME_OVER)) {
                if (!isCurrentlyPortrait) {
                    hidePortraitWarning();
                }
                // Don't show warning during menu/game over - not critical
                isCheckingOrientation = false;
                return;
            }

        } catch (error) {
            console.error('❌ Error in checkOrientation:', error);
        } finally {
            isCheckingOrientation = false;
        }
    }, 300); // 300ms debounce for iOS viewport stabilization
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

    // Global error handlers for production debugging
    // Priority 1: Catch uncaught exceptions and unhandled promise rejections
    // Priority 6: Integrate with DebugLogger for remote/localStorage logging
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('❌ UNCAUGHT ERROR:', {
            message,
            source,
            lineno,
            colno,
            error: error ? error.stack : 'No error object'
        });

        // Log to DebugLogger (remote + localStorage fallback)
        debugLogger.logGlobalError('ERROR', error || new Error(message), {
            source,
            lineno,
            colno
        });

        // Show user-friendly error screen if game is initialized
        if (game) {
            game.handleCriticalError(error || new Error(message));
        }

        return true; // Prevent default browser error handling
    };

    window.addEventListener('unhandledrejection', function(event) {
        console.error('❌ UNHANDLED PROMISE REJECTION:', {
            reason: event.reason,
            promise: event.promise
        });

        // Log to DebugLogger (remote + localStorage fallback)
        debugLogger.logGlobalError('PROMISE_REJECTION', event.reason);

        // Show user-friendly error screen if game is initialized
        if (game) {
            game.handleCriticalError(event.reason);
        }

        // Prevent error from being thrown to console
        event.preventDefault();
    });

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

    // Dispatch canvasReady event for game.html
    // This allows game.html to know when p5.js setup is complete
    window.dispatchEvent(new CustomEvent('canvasReady'));
    console.log('✅ Canvas ready event dispatched');

    // Listen for start game event from HTML menu
    window.addEventListener('startGame', function(e) {
        const playerData = e.detail;

        // NOTE: HTML menu hiding removed - game.html doesn't have HTML menu
        // Menu is on separate page (start-menu.html) now

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

        // Check orientation with debounced function (prevents double warnings)
        if (isPortrait() && isMobileDevice()) {
            console.log('⚠️ Portrait mode detected at game start');
            isWaitingForLandscape = true;
            checkOrientation(); // Will show warning and wait for landscape
            return;
        }

        // Landscape mode confirmed - proceed with game initialization
        console.log('✅ Landscape mode confirmed, starting game...');

        // Show canvas via CSS class (not inline style)
        canvas.elt.classList.add('game-ready');

        // Clear viewport cache to ensure fresh calculation
        clearViewportCache();

        // Force viewport recalculation before creating entities
        const dims = updateGameDimensions(game);
        resizeCanvas(dims.width, dims.height);

        // Start the game with player data
        game.startGame(playerData);
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
    // Check for critical error first - show error screen regardless of game state
    if (game.hasCriticalError) {
        drawCriticalErrorScreen();
        return;
    }

    // Runtime orientation monitoring (check every 2 seconds during PLAYING or PAUSED states)
    const currentTime = millis();
    if ((game.gameState === GameStates.PLAYING || game.gameState === GameStates.PAUSED) &&
        isMobileDevice() &&
        currentTime - lastOrientationCheck > 2000) {
        lastOrientationCheck = currentTime;
        checkOrientation();
    }

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
        case GameStates.PAUSED:
            // Draw frozen game screen (no updates, no deltaTime progression)
            drawPlayingScreen(0); // Pass 0 deltaTime to prevent updates
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
    // Priority 4: Wrap entire function in try-catch with fallback UI
    try {
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

            // Priority 2: Add .catch() to prevent unhandled promise rejection
            sendStatsToGoogleSheets(game.playerData, stats, fpsStats)
                .catch(error => {
                    console.error('Failed to send analytics (non-critical):', error);
                    // Analytics failure should not crash the game
                });
            game.statsLogged = true;
        }

        // Get top scores for leaderboard (synchronous - uses cache)
        // Uses deduplicated unique nicks (one entry per player)
        const topScores = game.scoreManager.getTopScoresUniqueNicksSync(4);

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
    } catch (error) {
        console.error('❌ Game over screen crashed:', error);

        // Fallback: show simple error message with game stats
        push();
        background(30, 30, 35);
        fill(255, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(36);
        text('GAME OVER', getVirtualWidth() / 2, getVirtualHeight() / 2 - 100);

        fill(255);
        textSize(24);
        text(`Score: ${game.score}`, getVirtualWidth() / 2, getVirtualHeight() / 2 - 40);
        text(`Wave: ${game.wave}`, getVirtualWidth() / 2, getVirtualHeight() / 2);

        fill(255, 100, 100);
        textSize(16);
        text('Error displaying leaderboard', getVirtualWidth() / 2, getVirtualHeight() / 2 + 50);
        text('Check console for details', getVirtualWidth() / 2, getVirtualHeight() / 2 + 75);

        fill(100, 200, 100);
        textSize(20);
        text('Click to Restart', getVirtualWidth() / 2, getVirtualHeight() / 2 + 120);
        pop();

        // Allow restart on click or space
        if (keyIsDown(32) || mouseIsPressed) {
            game.restartGame();
        }
    }
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

// Critical error screen
function drawCriticalErrorScreen() {
    push();
    background(30, 0, 0); // Dark red background

    fill(255, 50, 50);
    textAlign(CENTER, CENTER);
    textSize(48);
    text('CRITICAL ERROR', getVirtualWidth() / 2, getVirtualHeight() / 2 - 120);

    fill(255, 200, 200);
    textSize(20);
    text('The game encountered an unexpected error', getVirtualWidth() / 2, getVirtualHeight() / 2 - 60);

    if (game.criticalError) {
        fill(255, 255, 200);
        textSize(16);
        text(game.criticalError.message, getVirtualWidth() / 2, getVirtualHeight() / 2 - 20);

        fill(200, 200, 200);
        textSize(12);
        text(`Game State: ${game.criticalError.gameState} | Wave: ${game.criticalError.wave} | Score: ${game.criticalError.score}`,
             getVirtualWidth() / 2, getVirtualHeight() / 2 + 10);
    }

    fill(255, 255, 255);
    textSize(18);
    text('Check browser console (F12) for details', getVirtualWidth() / 2, getVirtualHeight() / 2 + 60);

    fill(100, 200, 100);
    textSize(16);
    text('Press SPACE or click to reload the page', getVirtualWidth() / 2, getVirtualHeight() / 2 + 100);

    pop();

    // Allow reload on space or click
    if (keyIsDown(32) || mouseIsPressed) {
        window.location.reload();
    }
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
// Unified orientation change handler
window.addEventListener('orientationchange', () => {
    console.log('📱 Orientation change event fired');

    // Clear viewport cache to get fresh dimensions
    clearViewportCache();

    // Handle viewport resize
    handleResizeEvent(game, resizeCanvas);

    // Check orientation and handle pause/resume logic
    // (debounced, handles all scenarios: pre-game, playing, paused)
    checkOrientation();
});
