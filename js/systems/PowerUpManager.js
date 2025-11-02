import {
    LifePowerUp,
    ShieldPowerUp,
    AutoFirePowerUp,
    TripleShotPowerUp,
    RocketPowerUp
} from '../entities/PowerUp.js';

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.baseDropChance = 0.08; // 8% base chance to drop power-up on enemy kill

        // Power-up spawn weights (higher = more common)
        this.spawnWeights = {
            'life': 5,       // Rare
            'shield': 20,    // Common
            'autofire': 15,  // Uncommon
            'tripleshot': 12, // Uncommon
            'rocket': 3      // Very rare
        };
    }

    // Called when an enemy is destroyed
    trySpawnPowerUp(x, y) {
        // Drop chance increases every 10 waves (tier system)
        const difficultyTier = Math.floor(this.game.wave / 10);
        const dropChance = this.baseDropChance + (difficultyTier * 0.03); // +3% per tier

        // Random chance to spawn power-up
        if (Math.random() > dropChance) return;

        const powerUpType = this.getRandomPowerUpType();
        const powerUp = this.createPowerUp(x, y, powerUpType);

        if (powerUp) {
            this.powerUps.push(powerUp);
        }
    }

    getRandomPowerUpType() {
        // Weighted random selection
        const totalWeight = Object.values(this.spawnWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (const [type, weight] of Object.entries(this.spawnWeights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return 'shield'; // Fallback
    }

    createPowerUp(x, y, type) {
        switch (type) {
            case 'life':
                return new LifePowerUp(x, y, this.game);
            case 'shield':
                return new ShieldPowerUp(x, y, this.game);
            case 'autofire':
                return new AutoFirePowerUp(x, y, this.game);
            case 'tripleshot':
                return new TripleShotPowerUp(x, y, this.game);
            case 'rocket':
                return new RocketPowerUp(x, y, this.game);
            default:
                return null;
        }
    }

    update(dt) {
        // Update all power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];

            if (!powerUp.active) {
                // Remove inactive power-ups
                this.powerUps.splice(i, 1);
                continue;
            }

            powerUp.move(dt);

            // Check collision with player
            if (powerUp.hit(this.game.player)) {
                powerUp.activate(this.game);
                // Power-up will be removed on next update when active = false
            }
        }
    }

    draw() {
        // Draw all active power-ups
        for (const powerUp of this.powerUps) {
            if (powerUp.active) {
                powerUp.show();
            }
        }
    }

    reset() {
        this.powerUps = [];
    }
}
