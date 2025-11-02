import { getSafeZoneY, getSafeZoneX } from '../core/viewport.js';
import { SAFE_ZONE_HEIGHT, SAFE_ZONE_WIDTH } from '../core/constants.js';

export class Comet {
    constructor(x, y, size = 'medium', game) {
        this.x = x;
        this.y = y;
        this.size = size; // 'small', 'medium', 'large'
        this.active = true;
        this.game = game;

        // Size-based properties (comet is rectangular, not square - to match image proportions)
        // Assuming comet image is roughly 2:3 aspect ratio (width:height with tail)
        // Speeds are 40-50% of projectile speed (450), minimum 180 (40%)
        const sizeConfig = {
            'small': { width: 30, height: 45, hp: 1, speed: 220, points: 10 },
            'medium': { width: 40, height: 60, hp: 2, speed: 190, points: 20 },
            'large': { width: 50, height: 75, hp: 3, speed: 180, points: 30 }
        };

        const config = sizeConfig[size] || sizeConfig['medium'];
        this.w = config.width;
        this.h = config.height;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.speed = config.speed;
        this.points = config.points;
    }

    show() {
        if (!this.active) return;

        push();

        // Draw comet image without rotation (preserve tail direction)
        if (this.game && this.game.cometImg) {
            image(this.game.cometImg, this.x, this.y, this.w, this.h);
        } else {
            // Fallback if image not loaded
            fill(120, 100, 80);
            stroke(80, 70, 60);
            strokeWeight(2);
            rect(this.x, this.y, this.w, this.h, 5);
        }

        pop();

        // HP indicator (if damaged)
        if (this.hp < this.maxHp) {
            push();
            fill(255, 0, 0);
            noStroke();
            const hpPercent = this.hp / this.maxHp;
            rect(this.x, this.y - 8, this.w * hpPercent, 4);
            pop();
        }
    }

    move(dt) {
        if (!this.active) return;

        this.y += this.speed * dt;

        // Deactivate if out of bounds
        if (this.y > getSafeZoneY() + SAFE_ZONE_HEIGHT + 50) {
            this.active = false;
        }
    }

    hit(obj) {
        if (!this.active) return false;

        // Simple AABB collision detection
        return (
            this.x < obj.x + obj.w &&
            this.x + this.w > obj.x &&
            this.y < obj.y + obj.h &&
            this.y + this.h > obj.y
        );
    }

    takeDamage(damage = 1) {
        this.hp -= damage;

        if (this.hp <= 0) {
            this.active = false;
            return true; // Destroyed
        }

        return false; // Still alive
    }
}
