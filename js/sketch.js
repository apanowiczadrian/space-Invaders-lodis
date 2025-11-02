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
    handleResizeEvent
} from './core/viewport.js';
import {
    handleTouches,
    handleMousePressed,
    handleTouchStarted,
    handleKeyPressed
} from './core/input.js';
import { Game } from './Game.js';

let game;
let lastTime = 0;

// p5.js Core Functions
window.preload = function() {
    game = new Game();
    game.spaceImg = loadImage("./assets/spaceship.png");
    game.enemyImg = loadImage("./assets/alien1.png");
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
}

window.setup = function() {
    const { width, height } = getViewportDimensions();
    const canvas = createCanvas(width, height);
    const context = canvas.elt.getContext('2d');
    context.imageSmoothingEnabled = false;

    pixelDensity(1);

    updateGameDimensions(game);
    game.setup();
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

    if (window.innerWidth < window.innerHeight && game.isTouchDevice) {
        background(0);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(20);
        text("Please rotate your device", getVirtualWidth() / 2, getVirtualHeight() / 2);
        return;
    }

    background(0);

    // Draw safe zone border
    drawSafeZone();

    strokeWeight(1);

    if (game.gameOver) {
        // Finalize statistics when game ends
        const stats = game.finalizeStats();

        // Log detailed stats to console only once
        if (!game.statsLogged) {
            console.log("Game Statistics:", stats);
            game.statsLogged = true;
        }

        textAlign(CENTER);
        fill(255);
        textSize(32);
        text("Game Over", getVirtualWidth() / 2, getVirtualHeight() / 2 - 100);

        textSize(16);
        text("Score: " + game.score, getVirtualWidth() / 2, getVirtualHeight() / 2 - 60);
        text("Wave: " + game.wave, getVirtualWidth() / 2, getVirtualHeight() / 2 - 40);

        // Format time as MM:SS
        const totalSeconds = Math.floor(game.stats.totalGameTime);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = minutes + ":" + (seconds < 10 ? "0" : "") + seconds;

        text("Time: " + timeString, getVirtualWidth() / 2, getVirtualHeight() / 2 - 20);
        text("Shots/sec: " + stats.shotsPerSecond, getVirtualWidth() / 2, getVirtualHeight() / 2);

        game.retryButton.draw();
        game.devOverlay.draw(game);
        return;
    }

    // Draw touch feedback (invisible strips with subtle feedback)
    if (game.isTouchDevice && game.leftTouchStrip) {
        game.leftTouchStrip.draw();
        game.rightTouchStrip.draw();
    }

    game.drawStars(deltaTime);

    game.player.show();
    game.player.move(deltaTime);

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        game.enemies[i].show();
        game.enemies[i].move(deltaTime);
    }

    // Check entire formation boundaries (all enemies move together)
    game.updateFormationMovement();

    for (let p of game.playerProjectilePool.pool) {
        if (!p.active) continue;

        if (p.isOutOfBounds()) {
            game.playerProjectilePool.release(p);
            continue;
        }

        p.show();
        p.move(deltaTime);

        // Check collision with enemies
        let hitSomething = false;
        for (let j = game.enemies.length - 1; j >= 0; j--) {
            const enemy = game.enemies[j];
            // Can only hit enemies that are active, NOT dying, and NOT flying in
            if (p.hit(enemy) && enemy.active && enemy.animationState !== 'dying' && !enemy.isFlying) {
                // Enemy takes damage
                const destroyed = enemy.takeDamage();

                if (destroyed) {
                    // Points per kill increase with wave (base 1 + wave bonus)
                    const killPoints = (1 + Math.floor(game.wave / 2)) * (enemy.type === 'boss' ? 10 : 1);
                    game.score += killPoints;
                    game.killedEnemies++;

                    // Try to spawn power-up at enemy position
                    game.powerUpManager.trySpawnPowerUp(enemy.x + enemy.w / 2, enemy.y);

                    // Don't remove from array yet - let death animation play
                    // Enemy will be removed in cleanup pass below
                }

                game.playerProjectilePool.release(p);
                hitSomething = true;
                break;
            }
        }

        // Check collision with comets (if projectile didn't hit enemy)
        if (!hitSomething) {
            for (let k = game.cometManager.comets.length - 1; k >= 0; k--) {
                const comet = game.cometManager.comets[k];
                if (p.hit(comet) && comet.active) {
                    game.cometManager.handleProjectileHit(comet);
                    game.playerProjectilePool.release(p);
                    break;
                }
            }
        }
    }

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

        // Check for direct hit on ANY enemy
        for (let j = game.enemies.length - 1; j >= 0; j--) {
            const enemy = game.enemies[j];
            // Rocket can hit any enemy (even flying in)
            if (r.hit(enemy) && enemy.active && enemy.animationState !== 'dying') {
                // Rocket hit! Destroy ALL enemies on screen
                console.log('ROCKET HIT! Destroying all enemies!');

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

    game.updateKilledText();
    game.updateWaveText();
    game.drawScore();
    game.drawLives();
    game.drawWaveBonus(deltaTime);

    // Update and draw power-ups
    game.updatePowerUps(deltaTime);
    game.powerUpManager.draw();

    // Draw comets
    game.cometManager.draw();

    // Weapon heat bar
    game.weaponHeatBar.draw(game.player.weaponHeat);

    // Dev overlay - zawsze na końcu
    game.devOverlay.update(deltaTime);
    game.devOverlay.draw(game);
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
    window.visualViewport.addEventListener('resize', () => handleResizeEvent(game, resizeCanvas));
    window.visualViewport.addEventListener('scroll', () => handleResizeEvent(game, resizeCanvas));
}
window.addEventListener('orientationchange', () => {
    setTimeout(() => handleResizeEvent(game, resizeCanvas), 100);
});
