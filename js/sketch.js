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
    isStandaloneMode
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

    // Hide canvas initially, show HTML menu
    canvas.elt.style.display = 'none';

    // Listen for start game event from HTML menu
    window.addEventListener('startGame', function(e) {
        const playerData = e.detail;

        // Hide HTML menu
        const menuOverlay = document.getElementById('start-menu');
        if (menuOverlay) {
            menuOverlay.style.display = 'none';
        }

        // Show canvas
        canvas.elt.style.display = 'block';

        // Runtime PWA detection - warn if not in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
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
    game.player.show();
    game.player.move(deltaTime);
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
    setTimeout(() => handleResizeEvent(game, resizeCanvas), 100);
});
