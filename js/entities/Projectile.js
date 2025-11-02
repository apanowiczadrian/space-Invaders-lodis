import { SAFE_ZONE_HEIGHT } from '../core/constants.js';
import { getSafeZoneY } from '../core/viewport.js';

export class Projectile {
    constructor(x, y, direction, owner = 'player') {
        this.x = x;
        this.y = y;
        this.width = 3; // Laser width
        this.height = 12; // Laser height
        this.speed = 450; // 0.75x of 600
        this.direction = direction;
        this.owner = owner; // 'player' or 'enemy'
        this.active = false;
        this.isDirectional = false; // For boss aimed shots
        this.directionX = 0;
        this.directionY = 1;
    }

    show() {
        push();
        // Different colors for player vs enemy
        if (this.owner === 'player') {
            fill(0, 200, 255); // Cyan/Blue laser for player
        } else {
            fill(255, 255, 255); // White laser for enemies
        }
        noStroke();

        // Draw laser as vertical rectangle
        rectMode(CENTER);
        rect(this.x, this.y, this.width, this.height);
        pop();
    }

    move(dt) {
        if (this.isDirectional) {
            // Move in custom direction (for boss aimed shots)
            this.x += this.speed * this.directionX * dt;
            this.y += this.speed * this.directionY * dt;
        } else {
            // Normal vertical movement
            this.y += this.speed * this.direction * dt;
        }
    }

    hit(obj) {
        // Rectangle collision detection for laser
        return (
            this.x - this.width / 2 < obj.x + obj.w &&
            this.x + this.width / 2 > obj.x &&
            this.y - this.height / 2 < obj.y + obj.h &&
            this.y + this.height / 2 > obj.y
        );
    }

    isOutOfBounds() {
        return this.y < getSafeZoneY() - 20 ||
               this.y > getSafeZoneY() + SAFE_ZONE_HEIGHT + 20;
    }

    reset(x, y, direction, owner = 'player') {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.owner = owner;
        this.active = true;
        this.isDirectional = false;
        this.directionX = 0;
        this.directionY = 1;
    }
}

export class ProjectilePool {
    constructor(size, owner = 'player') {
        this.owner = owner;
        this.pool = Array(size).fill().map(() => new Projectile(0, 0, 1, owner));
    }

    get(x, y, direction, owner) {
        // Use pool owner if not specified
        const projectileOwner = owner !== undefined ? owner : this.owner;

        let proj = this.pool.find(p => !p.active);
        if (proj) {
            proj.reset(x, y, direction, projectileOwner);
            return proj;
        }
        proj = new Projectile(x, y, direction, projectileOwner);
        proj.active = true;
        this.pool.push(proj);
        return proj;
    }

    release(proj) {
        proj.active = false;
    }
}

// Rocket class - larger projectile with AOE damage on impact
export class Rocket {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 20;
        this.speed = 300; // Slower than regular projectiles
        this.direction = direction;
        this.active = false;
        this.explosionRadius = 120; // AOE damage radius (2x bigger)
    }

    reset(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.active = true;
    }

    show() {
        push();

        // Rocket body (orange-red gradient)
        fill(255, 100, 0);
        noStroke();
        rectMode(CENTER);
        rect(this.x, this.y, this.width, this.height, 2);

        // Rocket tip (bright red)
        fill(255, 50, 0);
        triangle(
            this.x - this.width / 2, this.y - this.height / 2,
            this.x + this.width / 2, this.y - this.height / 2,
            this.x, this.y - this.height / 2 - 5
        );

        // Flame trail effect
        fill(255, 200, 0, 150);
        ellipse(this.x, this.y + this.height / 2, this.width * 0.6, 8);

        pop();
    }

    move(dt) {
        this.y += this.speed * this.direction * dt;
    }

    isOutOfBounds() {
        return this.y < getSafeZoneY() - 50 || this.y > getSafeZoneY() + SAFE_ZONE_HEIGHT + 50;
    }

    hit(obj) {
        // Rectangle collision detection
        return (
            this.x - this.width / 2 < obj.x + obj.w &&
            this.x + this.width / 2 > obj.x &&
            this.y - this.height / 2 < obj.y + obj.h &&
            this.y + this.height / 2 > obj.y
        );
    }

    // Check if object is within explosion radius
    inExplosionRadius(obj) {
        const objCenterX = obj.x + obj.w / 2;
        const objCenterY = obj.y + obj.h / 2;
        const distance = Math.sqrt(
            Math.pow(objCenterX - this.x, 2) +
            Math.pow(objCenterY - this.y, 2)
        );
        return distance <= this.explosionRadius;
    }
}

export class RocketPool {
    constructor(size) {
        this.pool = Array(size).fill().map(() => new Rocket(0, 0, 1));
    }

    get(x, y, direction) {
        let rocket = this.pool.find(r => !r.active);
        if (rocket) {
            rocket.reset(x, y, direction);
            return rocket;
        }
        rocket = new Rocket(x, y, direction);
        rocket.active = true;
        this.pool.push(rocket);
        return rocket;
    }

    release(rocket) {
        rocket.active = false;
    }
}
