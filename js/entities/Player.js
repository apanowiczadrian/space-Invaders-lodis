import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT } from '../core/constants.js';
import { getSafeZoneX, getSafeZoneY } from '../core/viewport.js';
import { WeaponHeatSystem } from '../systems/WeaponHeatSystem.js';

export class Player {
    constructor(gameRef) {
        this.game = gameRef;
        this.x = getSafeZoneX() + SAFE_ZONE_WIDTH / 2 - 25;
        this.y = getSafeZoneY() + SAFE_ZONE_HEIGHT - 70;
        this.w = 50;
        this.h = 50;
        this.speed = 300;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.weaponHeat = new WeaponHeatSystem();
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 5.0; // 5 seconds of invincibility
    }

    updateShield(dt) {
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldTimer = 0;
            }
        }
    }

    show() {
        image(this.game.spaceImg, this.x, this.y, this.w, this.h);

        // Draw shield if active
        if (this.shieldActive) {
            push();
            noFill();
            stroke(0, 255, 255, 150 + Math.sin(millis() / 100) * 100); // Pulsing cyan shield
            strokeWeight(3);
            ellipse(this.x + this.w / 2, this.y + this.h / 2, this.w + 30, this.h + 30);
            pop();
        }
    }

    move(dt) {
        this.updateShield(dt);
        this.weaponHeat.update(dt); // Update weapon heat

        const leftBound = getSafeZoneX();
        const rightBound = getSafeZoneX() + SAFE_ZONE_WIDTH - this.w;

        if ((keyIsDown(LEFT_ARROW) || this.game.isLeftPressed) && this.x > leftBound) {
            this.x -= this.speed * dt;
        }
        if ((keyIsDown(RIGHT_ARROW) || this.game.isRightPressed) && this.x < rightBound) {
            this.x += this.speed * dt;
        }

        this.x = constrain(this.x, leftBound, rightBound);
    }

    canFire() {
        return this.weaponHeat.canFire();
    }

    fire() {
        return this.weaponHeat.addHeat();
    }

    isInvulnerable() {
        return this.shieldActive || this.game.godMode;
    }
}
