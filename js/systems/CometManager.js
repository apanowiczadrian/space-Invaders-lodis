import { Comet } from '../entities/Comet.js';
import { getSafeZoneX, getSafeZoneY } from '../core/viewport.js';
import { SAFE_ZONE_WIDTH } from '../core/constants.js';

export class CometManager {
    constructor(game) {
        this.game = game;
        this.comets = [];
        this.spawnTimer = 0;
        this.minSpawnInterval = 3.0; // Minimum 3 seconds between spawns
        this.maxSpawnInterval = 6.0; // Maximum 6 seconds between spawns
        this.nextSpawnTime = this.getRandomSpawnInterval();

        // Spawn chance by size
        this.sizeWeights = {
            'small': 50,
            'medium': 35,
            'large': 15
        };
    }

    getRandomSpawnInterval() {
        return this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
    }

    getRandomSize() {
        const totalWeight = Object.values(this.sizeWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (const [size, weight] of Object.entries(this.sizeWeights)) {
            random -= weight;
            if (random <= 0) {
                return size;
            }
        }

        return 'medium'; // Fallback
    }

    spawnComet() {
        const size = this.getRandomSize();
        const x = getSafeZoneX() + Math.random() * (SAFE_ZONE_WIDTH - 50); // Random X position
        const y = getSafeZoneY() - 60; // Spawn above safe zone

        const comet = new Comet(x, y, size, this.game);
        this.comets.push(comet);
    }

    update(dt) {
        // Spawn timer
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.nextSpawnTime) {
            this.spawnComet();
            this.spawnTimer = 0;
            this.nextSpawnTime = this.getRandomSpawnInterval();
        }

        // Update all comets
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const comet = this.comets[i];

            if (!comet.active) {
                this.comets.splice(i, 1);
                continue;
            }

            comet.move(dt);

            // Check collision with player
            if (comet.hit(this.game.player)) {
                if (!this.game.player.isInvulnerable()) {
                    this.game.respawnPlayer();
                }
                comet.active = false;
            }
        }
    }

    draw() {
        for (const comet of this.comets) {
            if (comet.active) {
                comet.show();
            }
        }
    }

    reset() {
        this.comets = [];
        this.spawnTimer = 0;
        this.nextSpawnTime = this.getRandomSpawnInterval();
    }

    // Called when projectile hits comet
    handleProjectileHit(comet) {
        const destroyed = comet.takeDamage();
        if (destroyed) {
            this.game.score += comet.points;

            // Rocket drop chance based on comet size
            let rocketDropChance = 0;
            if (comet.size === 'small') {
                rocketDropChance = 0.05; // 5%
            } else if (comet.size === 'medium') {
                rocketDropChance = 0.075; // 7.5%
            } else if (comet.size === 'large') {
                rocketDropChance = 0.10; // 10%
            }

            // Try to drop rocket
            if (Math.random() < rocketDropChance) {
                this.game.rocketAmmo += 1;
            }

            return true;
        }
        return false;
    }
}
