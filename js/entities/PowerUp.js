import { getSafeZoneY, getSafeZoneX } from '../core/viewport.js';
import { SAFE_ZONE_HEIGHT, SAFE_ZONE_WIDTH } from '../core/constants.js';

// Base PowerUp class - all power-ups inherit from this
export class PowerUp {
    constructor(x, y, type, game = null) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.type = type; // 'life', 'shield', 'autofire', 'tripleshot', 'rocket'
        this.speed = 80; // Fall speed
        this.active = true;
        this.collected = false;
        this.game = game; // Reference to game for accessing images
    }

    show() {
        if (!this.active) return;

        push();

        // Draw power-up container (rounded square)
        fill(50, 50, 50, 200);
        stroke(this.getColor());
        strokeWeight(2);
        rect(this.x, this.y, this.w, this.h, 5);

        // Draw icon based on type
        this.drawIcon();

        pop();
    }

    drawIcon() {
        // Override in child classes for specific icons
        // Default: draw text symbol
        fill(this.getColor());
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text(this.getSymbol(), this.x + this.w / 2, this.y + this.h / 2);
    }

    getGame() {
        // Helper to get game reference (passed during collision check)
        return this.gameRef;
    }

    getColor() {
        // Different color for each power-up type
        const colors = {
            'life': [255, 215, 0],      // Gold
            'shield': [0, 255, 255],     // Cyan
            'autofire': [255, 165, 0],   // Orange
            'tripleshot': [138, 43, 226], // Purple
            'rocket': [255, 69, 0]       // Red-Orange
        };
        return colors[this.type] || [255, 255, 255];
    }

    getSymbol() {
        // Text symbols for each power-up type
        const symbols = {
            'life': '+',
            'shield': 'S',
            'autofire': 'A',
            'tripleshot': '3',
            'rocket': 'R'
        };
        return symbols[this.type] || '?';
    }

    move(dt) {
        if (!this.active) return;

        // Fall down slowly
        this.y += this.speed * dt;

        // Deactivate if out of bounds
        if (this.y > getSafeZoneY() + SAFE_ZONE_HEIGHT) {
            this.active = false;
        }
    }

    hit(player) {
        if (!this.active || this.collected) return false;

        // Simple AABB collision detection
        return (
            this.x < player.x + player.w &&
            this.x + this.w > player.x &&
            this.y < player.y + player.h &&
            this.y + this.h > player.y
        );
    }

    // Override in child classes for specific effects
    activate(game) {
        this.collected = true;
        this.active = false;

        // Track statistics
        if (game.stats && game.stats.powerUpsCollected[this.type] !== undefined) {
            game.stats.powerUpsCollected[this.type]++;
        }
    }
}

// Specific PowerUp classes

export class LifePowerUp extends PowerUp {
    constructor(x, y, game) {
        super(x, y, 'life', game);
    }

    drawIcon() {
        // Draw heart image if available
        if (this.game && this.game.heartImg) {
            imageMode(CENTER);
            image(this.game.heartImg, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.7, this.h * 0.7);
        } else {
            // Fallback to + symbol
            fill(this.getColor());
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text('+', this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    activate(game) {
        // Max 3 lives
        if (game.lives < 3) {
            game.lives++;
        }
        super.activate(game);
    }
}

export class ShieldPowerUp extends PowerUp {
    constructor(x, y, game) {
        super(x, y, 'shield', game);
    }

    drawIcon() {
        // Draw shield image if available
        if (this.game && this.game.shieldImg) {
            imageMode(CENTER);
            image(this.game.shieldImg, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.7, this.h * 0.7);
        } else {
            // Fallback to S symbol
            fill(this.getColor());
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text('S', this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    activate(game) {
        game.player.activateShield();
        super.activate(game);
    }
}

export class AutoFirePowerUp extends PowerUp {
    constructor(x, y, game) {
        super(x, y, 'autofire', game);
        this.duration = 4.0; // 4 seconds of auto-fire
    }

    drawIcon() {
        // Draw autofire image if available
        if (this.game && this.game.autofireImg) {
            imageMode(CENTER);
            image(this.game.autofireImg, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.7, this.h * 0.7);
        } else {
            // Fallback to A symbol
            fill(this.getColor());
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text('A', this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    activate(game) {
        game.activatePowerUp('autofire', this.duration);
        super.activate(game);
    }
}

export class TripleShotPowerUp extends PowerUp {
    constructor(x, y, game) {
        super(x, y, 'tripleshot', game);
        this.duration = 5.0; // 5 seconds of triple shot
    }

    drawIcon() {
        // Draw tripleshot image if available
        if (this.game && this.game.tripleshotImg) {
            imageMode(CENTER);
            image(this.game.tripleshotImg, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.7, this.h * 0.7);
        } else {
            // Fallback to 3 symbol
            fill(this.getColor());
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text('3', this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    activate(game) {
        game.activatePowerUp('tripleshot', this.duration);
        super.activate(game);
    }
}

export class RocketPowerUp extends PowerUp {
    constructor(x, y, game) {
        super(x, y, 'rocket', game);
    }

    drawIcon() {
        // Draw rocket image if available
        if (this.game && this.game.rocketImg) {
            imageMode(CENTER);
            image(this.game.rocketImg, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.7, this.h * 0.7);
        } else {
            // Fallback to R symbol
            fill(this.getColor());
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text('R', this.x + this.w / 2, this.y + this.h / 2);
        }
    }

    activate(game) {
        // Give 1 rocket as ammo - instant all-enemy destruction
        game.rocketAmmo += 1;
        super.activate(game);
    }
}
