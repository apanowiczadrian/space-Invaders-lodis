import { getSafeZoneX, getSafeZoneY } from '../core/viewport.js';

export class Enemy {
    constructor(x, y, type = 'basic', rowIndex = 0, gameRef, rowConfig = {}) {
        this.game = gameRef;
        this.type = type;
        this.rowIndex = rowIndex;

        // Start above screen in FINAL formation position
        this.x = getSafeZoneX() + x;
        this.y = getSafeZoneY() - 200 - (rowIndex * 55); // Stagger height based on row (optimized spacing for penguin sprites)

        // Target position (where enemy will be after flying in)
        this.targetY = getSafeZoneY() + y;

        this.w = type === 'boss' ? 80 : 50;
        this.h = type === 'boss' ? 80 : 50;
        this.speed = 60;
        this.isFlying = true;
        this.flySpeed = 300; // 2x faster flying in
        this.active = true;

        // Health scales with difficulty tiers (every 10 waves)
        // Waves 1-10: 1 HP regular, then scales up
        const difficultyTier = Math.floor(gameRef.wave / 10);
        if (type === 'boss') {
            this.health = 5 * (difficultyTier + 1); // Boss: 5 HP base, then 10, 15, 20...
        } else {
            this.health = difficultyTier + 1; // Regular: wave 1-10 = 1 HP, wave 11-20 = 2 HP, etc.
        }
        this.maxHealth = this.health;

        // Boss weapon configuration (from wave pattern)
        this.weaponType = rowConfig.weaponType || 'aimed'; // 'aimed', 'triple', 'rapid'
        this.fireRateMultiplier = rowConfig.fireRateMultiplier || 1.0;

        // Animation state for death animation
        this.animationState = 'idle'; // 'idle', 'dying', 'dead'
        this.deathFrame = 0;
        this.deathFrameTime = 0;
        this.deathFrameDuration = 0.025; // 25ms per frame (8 frames = 200ms total, 2x faster)
    }

    show() {
        if (!this.active) return;

        push();

        // Different images for different types
        if (this.type === 'boss') {
            // Boss uses boss.png
            noTint();
            if (this.game.bossImg) {
                image(this.game.bossImg, this.x, this.y, this.w, this.h);
            } else {
                // Fallback if boss image not loaded
                tint(255, 100, 100);
                image(this.game.enemyImg, this.x, this.y, this.w, this.h);
            }

            // Show health bar for boss (when damaged)
            if (this.health < this.maxHealth) {
                const barWidth = this.w;
                const barHeight = 6;
                const healthPercent = this.health / this.maxHealth;

                // Background bar
                fill(50);
                noStroke();
                rect(this.x, this.y - 12, barWidth, barHeight);

                // Health bar (red)
                fill(255, 0, 0);
                rect(this.x, this.y - 12, barWidth * healthPercent, barHeight);

                // Border
                noFill();
                stroke(255);
                strokeWeight(1);
                rect(this.x, this.y - 12, barWidth, barHeight);
            }
        } else {
            // Regular enemies use penguin animations
            noTint();

            if (this.animationState === 'idle') {
                // Use death animation frames to show damage state
                // For 1 HP enemies: only normal sprite
                // For 2 HP enemies: normal → frame 5
                // For 3+ HP enemies: normal → frame 3 → frame 5
                const healthPercent = this.health / this.maxHealth;

                if (this.maxHealth === 1 || healthPercent > 0.66) {
                    // 1 HP enemies always show normal, or high HP (66-100%): Show normal idle sprite
                    if (this.game.penguinIdleImg) {
                        image(this.game.penguinIdleImg, this.x, this.y, this.w, this.h);
                    } else {
                        image(this.game.enemyImg, this.x, this.y, this.w, this.h);
                    }
                } else if (this.maxHealth === 2 || healthPercent <= 0.33) {
                    // For 2 HP: damaged state (1/2 HP), or for 3+ HP: very low HP (0-33%): Show frame 5 (index 4)
                    if (this.game.penguinDeathFrames && this.game.penguinDeathFrames[4]) {
                        image(this.game.penguinDeathFrames[4], this.x, this.y, this.w, this.h);
                    } else {
                        image(this.game.penguinIdleImg, this.x, this.y, this.w, this.h);
                    }
                } else {
                    // For 3+ HP: medium damage (33-66%): Show frame 3 (index 2)
                    if (this.game.penguinDeathFrames && this.game.penguinDeathFrames[2]) {
                        image(this.game.penguinDeathFrames[2], this.x, this.y, this.w, this.h);
                    } else {
                        image(this.game.penguinIdleImg, this.x, this.y, this.w, this.h);
                    }
                }
            } else if (this.animationState === 'dying') {
                // Show current death animation frame
                if (this.game.penguinDeathFrames && this.game.penguinDeathFrames[this.deathFrame]) {
                    image(this.game.penguinDeathFrames[this.deathFrame], this.x, this.y, this.w, this.h);
                }
            }
        }

        pop();
    }

    move(dt) {
        if (!this.active) return;

        // Death animation state - advance frames
        if (this.animationState === 'dying') {
            this.deathFrameTime += dt;

            if (this.deathFrameTime >= this.deathFrameDuration) {
                this.deathFrameTime = 0;
                this.deathFrame++;

                // Check if animation is complete (8 frames total)
                if (this.deathFrame >= 8) {
                    this.animationState = 'dead';
                    this.active = false; // Now we can safely remove the enemy
                }
            }

            // Continue moving with formation even while dying
            if (this.game.formationReady) {
                this.x += this.speed * this.game.formationDirection * dt;
            }

            return; // Don't fly in or shoot while dying
        }

        // Flying in animation
        if (this.isFlying) {
            const distToTarget = this.targetY - this.y;

            if (distToTarget > 0) {
                const moveAmount = this.flySpeed * dt;
                this.y += Math.min(moveAmount, distToTarget);
            } else {
                this.isFlying = false;
            }
            return;
        }

        // Wait for entire formation to be ready before moving horizontally
        if (!this.game.formationReady) return;

        // Move horizontally using SHARED formation direction
        this.x += this.speed * this.game.formationDirection * dt;

        // Fire rate increases with wave
        let baseFireRate = this.type === 'boss' ? 0.003 : 0.0012; // Increased from 0.0008 to 0.0012 for more dynamic gameplay

        // Wave 1 is 50% more aggressive to make game less easy
        if (this.game.wave === 1) {
            baseFireRate *= 1.5;
        }

        const waveMultiplier = 1 + (this.game.wave - 1) * 0.15;
        const fireRate = baseFireRate * waveMultiplier * this.fireRateMultiplier;

        if (Math.random() < fireRate) {
            if (this.type === 'boss') {
                // Boss always can shoot using configured weapon type
                this.shootAtPlayer();
            } else {
                // Regular enemies can only shoot if no one is below them
                if (this.canShoot()) {
                    this.game.enemyProjectilePool.get(this.x + this.w / 2, this.y + this.h, 1);
                }
            }
        }
    }

    canShoot() {
        // Check if there's any enemy below this one (in same column-ish area)
        // An enemy is "below" if it's lower (higher Y value) and horizontally aligned
        const columnWidth = 60; // Same as spacing in formation

        for (const enemy of this.game.enemies) {
            if (enemy === this) continue;
            if (!enemy.active || enemy.animationState === 'dying') continue;

            // Check if enemy is below (higher Y) and in similar X position
            const isBelow = enemy.y > this.y;
            const isAligned = Math.abs(enemy.x - this.x) < columnWidth;

            if (isBelow && isAligned) {
                return false; // Someone is below, can't shoot
            }
        }

        return true; // No one below, can shoot
    }

    shootAtPlayer() {
        if (!this.game.player) return;

        const enemyCenterX = this.x + this.w / 2;
        const enemyCenterY = this.y + this.h;
        const playerCenterX = this.game.player.x + this.game.player.w / 2;
        const playerCenterY = this.game.player.y + this.game.player.h / 2;

        // Calculate direction vector
        const dx = playerCenterX - enemyCenterX;
        const dy = playerCenterY - enemyCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Use configured weapon type
        switch(this.weaponType) {
            case 'triple':
                // Triple shot pattern
                const spreadAngle = 0.3; // radians

                // Center shot
                this.createDirectionalProjectile(enemyCenterX, enemyCenterY, dirX, dirY);

                // Left shot (rotate left)
                const leftDirX = dirX * Math.cos(-spreadAngle) - dirY * Math.sin(-spreadAngle);
                const leftDirY = dirX * Math.sin(-spreadAngle) + dirY * Math.cos(-spreadAngle);
                this.createDirectionalProjectile(enemyCenterX, enemyCenterY, leftDirX, leftDirY);

                // Right shot (rotate right)
                const rightDirX = dirX * Math.cos(spreadAngle) - dirY * Math.sin(spreadAngle);
                const rightDirY = dirX * Math.sin(spreadAngle) + dirY * Math.cos(spreadAngle);
                this.createDirectionalProjectile(enemyCenterX, enemyCenterY, rightDirX, rightDirY);
                break;

            case 'rapid':
                // Rapid fire - single aimed shot (fires more often due to fireRateMultiplier)
                this.createDirectionalProjectile(enemyCenterX, enemyCenterY, dirX, dirY);
                break;

            case 'aimed':
            default:
                // Single aimed shot
                this.createDirectionalProjectile(enemyCenterX, enemyCenterY, dirX, dirY);
                break;
        }
    }

    createDirectionalProjectile(x, y, dirX, dirY) {
        // Get projectile from pool
        const projectile = this.game.enemyProjectilePool.get(x, y, 1);

        // Override direction to aim at player
        projectile.directionX = dirX;
        projectile.directionY = dirY;
        projectile.isDirectional = true;
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            // Trigger death animation for regular enemies
            if (this.type !== 'boss') {
                this.animationState = 'dying';
                this.deathFrame = 0;
                this.deathFrameTime = 0;
                return true; // Enemy destroyed (but still playing animation)
            } else {
                // Boss dies immediately without animation
                this.active = false;
                return true;
            }
        }
        return false; // Enemy still alive
    }
}
