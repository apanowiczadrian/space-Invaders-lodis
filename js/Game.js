import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT } from './core/constants.js';
import { getVirtualWidth, getVirtualHeight, getSafeZoneX, getSafeZoneY, isMobileDevice } from './core/viewport.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { ProjectilePool, RocketPool } from './entities/Projectile.js';
import { DevOverlay } from './ui/DevOverlay.js';
import { TouchStrip } from './ui/TouchStrip.js';
import { CanvasButton } from './ui/CanvasButton.js';
import { WeaponHeatBar } from './ui/WeaponHeatBar.js';
import { getPatternForWave } from './config/wavePatterns.js';
import { PowerUpManager } from './systems/PowerUpManager.js';
import { CometManager } from './systems/CometManager.js';

export class Game {
    constructor() {
        this.player = null;
        this.enemies = [];
        this.playerProjectilePool = new ProjectilePool(10, 'player');
        this.enemyProjectilePool = new ProjectilePool(20, 'enemy');
        this.rocketPool = new RocketPool(5); // Pool for rocket power-up
        this.gameOver = false;
        this.gameWin = false;
        this.score = 0;
        this.wave = 1; // Wave counter starts at 1
        this.retryButton = null; // Initialize later
        this.isTouchDevice = isMobileDevice();
        this.leftTouchStrip = null;
        this.rightTouchStrip = null;
        this.isLeftPressed = false;
        this.isRightPressed = false;
        this.isFirePressed = false;
        this.fireButtonWasPressed = false;
        this.spaceImg = null;
        this.enemyImg = null;
        this.killedEnemies = 0;
        this.stars = [];
        this.devOverlay = new DevOverlay();
        this.weaponHeatBar = new WeaponHeatBar();
        this.waveBonus = 0;
        this.waveBonusTimer = 0;
        this.waveSpawnPending = false; // True when waiting to spawn next wave
        this.lives = 3; // Player lives
        this.godMode = false; // Developer god mode
        this.formationDirection = 1; // Shared direction for entire formation
        this.formationReady = false; // True when all enemies finished flying in
        this.powerUpManager = new PowerUpManager(this);
        this.cometManager = new CometManager(this);
        this.activePowerUps = {}; // Track active temporary power-ups with timers
        this.autoFireTimer = 0; // Timer for auto-fire power-up
        this.autoFireRate = 0.15; // Auto-fire every 0.15 seconds
        this.statsLogged = false; // Track if stats were already logged
        this.rocketAmmo = 0; // Rocket ammunition count

        // Game statistics
        this.stats = {
            totalShots: 0,
            shotsByWeapon: {
                basic: 0,
                triple: 0,
                rocket: 0
            },
            powerUpsCollected: {
                life: 0,
                shield: 0,
                autofire: 0,
                tripleshot: 0,
                rocket: 0
            },
            gameStartTime: 0,
            gameEndTime: 0,
            totalGameTime: 0,
            shotsPerSecond: 0
        };
    }

    setup() {
        this.resetGame();
        this.initTouchStrips();
    }

    initTouchStrips() {
        if (this.isTouchDevice) {
            this.leftTouchStrip = new TouchStrip('left');
            this.rightTouchStrip = new TouchStrip('right');
        }
    }

    resetGame() {
        this.killedEnemies = 0;
        this.gameOver = false;
        this.gameWin = false;
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        this.formationDirection = 1;
        this.formationReady = false;
        this.activePowerUps = {};
        this.statsLogged = false;
        this.rocketAmmo = 0;
        this.player = new Player(this);
        this.enemies = [];
        this.initEnemies();
        this.playerProjectilePool.pool.forEach(p => p.active = false);
        this.enemyProjectilePool.pool.forEach(p => p.active = false);
        this.rocketPool.pool.forEach(r => r.active = false);
        this.powerUpManager.reset();
        this.cometManager.reset();

        // Reset statistics
        this.stats = {
            totalShots: 0,
            shotsByWeapon: {
                basic: 0,
                triple: 0,
                rocket: 0
            },
            powerUpsCollected: {
                life: 0,
                shield: 0,
                autofire: 0,
                tripleshot: 0,
                rocket: 0
            },
            gameStartTime: Date.now(),
            gameEndTime: 0,
            totalGameTime: 0,
            shotsPerSecond: 0
        };

        // Initialize retry button with correct position
        this.retryButton = new CanvasButton(
            getVirtualWidth() / 2,
            getVirtualHeight() / 2 + 100,
            200,
            60,
            "Retry"
        );

        // Stars spawn only in safe zone
        this.stars = Array.from({length: 50}, () => ({
            x: getSafeZoneX() + Math.random() * SAFE_ZONE_WIDTH,
            y: getSafeZoneY() + Math.random() * SAFE_ZONE_HEIGHT,
            speed: Math.random() * 50 + 20,
            size: Math.random() * 2 + 1
        }));
    }

    initEnemies() {
        // Get wave configuration
        const waveConfig = this.getWaveConfig(this.wave);

        for (let rowIndex = 0; rowIndex < waveConfig.rows.length; rowIndex++) {
            const rowConfig = waveConfig.rows[rowIndex];

            for (let colIndex = 0; colIndex < rowConfig.count; colIndex++) {
                const x = colIndex * 60 + rowConfig.startX;
                const y = rowIndex * 50 + 80; // Optimized row spacing for penguin sprites
                const enemy = new Enemy(x, y, rowConfig.type, rowIndex, this, rowConfig);

                this.enemies.push(enemy);
            }
        }
    }

    getWaveConfig(wave) {
        // Use external wave pattern configuration
        return getPatternForWave(wave);
    }

    startNextWave() {
        // Wave completion bonus (increases with wave number)
        const waveBonus = this.wave * 50;
        this.score += waveBonus;

        // Show wave bonus notification and delay next wave spawn
        this.waveBonus = waveBonus;
        this.waveBonusTimer = 2.0; // Show for 2 seconds (1s message + 1s delay)
        this.waveSpawnPending = true;
        this.wave++;
    }

    spawnNextWave() {
        this.enemies = [];
        this.formationReady = false;
        this.initEnemies();

        // Progressive difficulty: speed increases by 8% per wave (max 2.5x at wave 20)
        const speedMultiplier = Math.min(1 + (this.wave - 1) * 0.08, 2.5);
        for (let enemy of this.enemies) {
            enemy.speed = 60 * speedMultiplier;
        }
        this.waveSpawnPending = false;
    }

    updateFormationMovement() {
        if (this.enemies.length === 0) return;

        // Check if all enemies finished flying in
        if (!this.formationReady) {
            let allLanded = true;
            for (let enemy of this.enemies) {
                if (enemy.isFlying) {
                    allLanded = false;
                    break;
                }
            }
            if (allLanded) {
                this.formationReady = true;
            }
            // Don't check boundaries until formation is ready
            return;
        }

        const leftBound = getSafeZoneX();
        const rightBound = getSafeZoneX() + SAFE_ZONE_WIDTH;

        // Find leftmost and rightmost enemy in ENTIRE formation
        let leftmost = Infinity;
        let rightmost = -Infinity;
        let hasActiveEnemy = false;

        for (let enemy of this.enemies) {
            // Skip inactive enemies and dying enemies (playing death animation)
            if (!enemy.active || enemy.animationState === 'dying') continue;

            hasActiveEnemy = true;
            leftmost = Math.min(leftmost, enemy.x);
            rightmost = Math.max(rightmost, enemy.x + enemy.w);
        }

        if (!hasActiveEnemy) return;

        // Check if ANY enemy in formation hit boundaries
        let shouldDescend = false;

        if (this.formationDirection === 1 && rightmost >= rightBound) {
            // Hit right wall - reverse ENTIRE formation
            this.formationDirection = -1;
            shouldDescend = true;
        } else if (this.formationDirection === -1 && leftmost <= leftBound) {
            // Hit left wall - reverse ENTIRE formation
            this.formationDirection = 1;
            shouldDescend = true;
        }

        // Apply descent to ENTIRE formation
        if (shouldDescend) {
            for (let enemy of this.enemies) {
                if (!enemy.isFlying && enemy.active) {
                    enemy.y += 20; // Descend by 20 pixels

                    // Check if any enemy reached bottom (game over)
                    if (enemy.y + enemy.h >= getSafeZoneY() + SAFE_ZONE_HEIGHT) {
                        this.gameOver = true;
                    }
                }
            }
        }
    }

    drawStars(dt) {
        push();
        noStroke();

        for (let star of this.stars) {
            fill(255, 255, 255, star.size * 80);
            ellipse(star.x, star.y, star.size, star.size);

            star.y -= star.speed * dt;
            if (star.y < getSafeZoneY() - 10) {
                star.y = getSafeZoneY() + SAFE_ZONE_HEIGHT + 10;
                star.x = getSafeZoneX() + Math.random() * SAFE_ZONE_WIDTH;
            }
        }

        pop();
    }

    updateKilledText() {
        textAlign(LEFT);
        strokeWeight(0.5);
        fill(255);
        textSize(12);
        text("Killed: " + this.killedEnemies, getSafeZoneX() + 15, getSafeZoneY() + 30);
    }

    updateWaveText() {
        textAlign(LEFT);
        strokeWeight(0.5);
        fill(255);
        textSize(12);
        text("Wave: " + this.wave, getSafeZoneX() + 15, getSafeZoneY() + 50);
    }

    drawWaveBonus(dt) {
        if (this.waveBonusTimer <= 0) return;

        this.waveBonusTimer -= dt;

        // Spawn new wave after 2 second delay (when timer drops below 2.0)
        if (this.waveSpawnPending && this.waveBonusTimer <= 2.0) {
            this.spawnNextWave();
        }

        push();
        const alpha = Math.min(255, this.waveBonusTimer * 255);
        fill(255, 215, 0, alpha); // Gold color
        textAlign(CENTER, CENTER);
        textSize(24);
        text(`WAVE ${this.wave - 1} COMPLETE!`, getVirtualWidth() / 2, getVirtualHeight() / 2 - 40);
        text(`+${this.waveBonus} BONUS`, getVirtualWidth() / 2, getVirtualHeight() / 2);
        pop();
    }

    drawLives() {
        push();
        const heartSize = 25;
        const spacing = 30;
        const startX = getSafeZoneX() + SAFE_ZONE_WIDTH - 30;
        const startY = getSafeZoneY() + 30;

        imageMode(CENTER);
        for (let i = 0; i < this.lives; i++) {
            if (this.heartImg) {
                image(this.heartImg, startX - i * spacing, startY, heartSize, heartSize);
            } else {
                // Fallback if image not loaded
                fill(255, 215, 0);
                noStroke();
                ellipse(startX - i * spacing, startY, heartSize, heartSize);
            }
        }
        pop();
    }

    drawScore() {
        push();
        // Format score with leading zeros (minimum 5 digits)
        const formattedScore = String(this.score).padStart(5, '0');

        fill(255, 255, 255);
        textAlign(RIGHT, CENTER);
        textSize(24);
        noStroke();

        // Position: to the left of hearts (hearts start at SAFE_ZONE_WIDTH - 30)
        const scoreX = getSafeZoneX() + SAFE_ZONE_WIDTH - 120; // 120px from right = space for hearts
        const scoreY = getSafeZoneY() + 30; // Same height as hearts

        text(formattedScore, scoreX, scoreY);
        pop();
    }

    respawnPlayer() {
        this.lives--;

        if (this.lives <= 0) {
            this.gameOver = true;
            // Finalize stats immediately when game ends
            this.stats.gameEndTime = Date.now();
            this.stats.totalGameTime = (this.stats.gameEndTime - this.stats.gameStartTime) / 1000;
            if (this.stats.totalGameTime > 0) {
                this.stats.shotsPerSecond = (this.stats.totalShots / this.stats.totalGameTime).toFixed(2);
            }
            return;
        }

        // Save current player position
        const currentX = this.player.x;
        const currentY = this.player.y;

        // Respawn with shield at same position
        this.player = new Player(this);
        this.player.x = currentX;
        this.player.y = currentY;
        this.player.activateShield();

        // Clear enemy projectiles for safety
        this.enemyProjectilePool.pool.forEach(p => p.active = false);
    }

    jumpToWave(waveNumber) {
        if (waveNumber < 1) return;

        this.wave = waveNumber;
        this.enemies = [];
        this.formationReady = false;
        this.initEnemies();

        // Apply wave difficulty
        const speedMultiplier = Math.min(1 + (this.wave - 1) * 0.08, 2.5);
        for (let enemy of this.enemies) {
            enemy.speed = 60 * speedMultiplier;
        }

        // Reset player position
        this.player.x = getSafeZoneX() + SAFE_ZONE_WIDTH / 2 - 25;
        this.player.y = getSafeZoneY() + SAFE_ZONE_HEIGHT - 70;
    }

    activatePowerUp(type, duration) {
        // Activate temporary power-up with timer
        this.activePowerUps[type] = duration;
    }

    updatePowerUps(dt) {
        // Update power-up timers
        for (const [type, timer] of Object.entries(this.activePowerUps)) {
            this.activePowerUps[type] -= dt;

            if (this.activePowerUps[type] <= 0) {
                delete this.activePowerUps[type];
                console.log(`Power-up ${type} expired`);
            }
        }

        // Auto-fire logic - shoots from wings, not center
        if (this.hasPowerUp('autofire')) {
            this.autoFireTimer -= dt;
            if (this.autoFireTimer <= 0) {
                // Auto-fire from wings (left and right sides of ship)
                const leftWingX = this.player.x + 10;
                const rightWingX = this.player.x + this.player.w - 10;
                const wingY = this.player.y;

                // Spawn projectiles from both wings
                this.playerProjectilePool.get(leftWingX, wingY, -1);
                this.playerProjectilePool.get(rightWingX, wingY, -1);

                // Track stats (auto-fire counts as basic shots)
                this.stats.totalShots += 2;
                this.stats.shotsByWeapon.basic += 2;

                this.autoFireTimer = this.autoFireRate;
            }
        }

        // Update PowerUpManager
        this.powerUpManager.update(dt);

        // Update CometManager
        this.cometManager.update(dt);
    }

    hasPowerUp(type) {
        return this.activePowerUps.hasOwnProperty(type);
    }

    firePlayerWeapon(skipHeatCheck = false) {
        // Unified shooting logic - handles normal, triple shot, and rocket modes
        // When auto-fire is active, manual shots from center are still allowed but add heat

        const centerX = this.player.x + this.player.w / 2;
        const centerY = this.player.y;

        // Check if player wants to use rocket ammo
        if (this.rocketAmmo > 0) {
            // Use rocket ammo (doesn't consume heat)
            this.rocketPool.get(centerX, centerY, -1);
            this.rocketAmmo--;
            this.stats.totalShots++;
            this.stats.shotsByWeapon.rocket++;
            console.log('Rocket fired! Remaining: ' + this.rocketAmmo);
            return true;
        }

        // Regular weapons - check heat
        if (!skipHeatCheck) {
            if (!this.player.fire()) {
                return false; // Weapon overheated or can't fire
            }
        }

        // Track statistics
        this.stats.totalShots++;

        if (this.hasPowerUp('tripleshot')) {
            // Triple shot: center, left, right
            this.playerProjectilePool.get(centerX, centerY, -1); // Center
            this.playerProjectilePool.get(centerX - 15, centerY, -1); // Left
            this.playerProjectilePool.get(centerX + 15, centerY, -1); // Right
            this.stats.shotsByWeapon.triple++;
        } else {
            // Normal single shot from center
            this.playerProjectilePool.get(centerX, centerY, -1);
            this.stats.shotsByWeapon.basic++;
        }

        return true;
    }

    finalizeStats() {
        // Return stats object ready for server submission (already calculated in respawnPlayer)
        return {
            totalShots: this.stats.totalShots,
            shotsByWeapon: { ...this.stats.shotsByWeapon },
            powerUpsCollected: { ...this.stats.powerUpsCollected },
            totalGameTime: this.stats.totalGameTime.toFixed(2),
            shotsPerSecond: this.stats.shotsPerSecond,
            finalScore: this.score,
            finalWave: this.wave,
            enemiesKilled: this.killedEnemies
        };
    }
}
