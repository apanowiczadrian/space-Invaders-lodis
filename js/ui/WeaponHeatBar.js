import { getSafeZoneX, getSafeZoneY } from '../core/viewport.js';
import { SAFE_ZONE_WIDTH } from '../core/constants.js';

export class WeaponHeatBar {
    constructor() {
        this.barWidth = 150;
        this.barHeight = 12;
        this.x = 0; // Will be positioned on right
        this.y = 0; // Will be positioned below hearts
        this.padding = 20;
    }

    draw(weaponHeatSystem) {
        // Position on right side, below hearts
        this.x = getSafeZoneX() + SAFE_ZONE_WIDTH - this.barWidth - 15;
        this.y = getSafeZoneY() + 60; // Below hearts (hearts at y=30, this puts bar ~30px below)

        push();

        // Background (dark gray)
        fill(40, 40, 40);
        stroke(100, 100, 100);
        strokeWeight(2);
        rect(this.x, this.y, this.barWidth, this.barHeight, 2);

        // Heat fill (now represents cooling - reverse colors)
        const heatPercent = weaponHeatSystem.getHeatPercentage();
        const fillWidth = this.barWidth * heatPercent;

        if (fillWidth > 0) {
            noStroke();

            // Color gradient: green (good) → blue (frozen)
            if (weaponHeatSystem.isOverheated()) {
                // Pulsing blue when frozen
                const pulse = Math.sin(millis() / 100) * 0.3 + 0.7;
                fill(0, 150 * pulse, 255 * pulse);
            } else if (heatPercent > 0.8) {
                // Light blue when nearly frozen
                fill(100, 180, 255);
            } else if (heatPercent > 0.5) {
                // Yellow when cooling down
                fill(255, 200, 0);
            } else {
                // Green when warm (good)
                fill(0, 255, 100);
            }

            rect(this.x, this.y, fillWidth, this.barHeight, 2);
        }

        // Status text
        if (weaponHeatSystem.isOverheated()) {
            fill(100, 200, 255);
            textAlign(CENTER, CENTER);
            textSize(10);
            text("FROZEN!", this.x + this.barWidth / 2, this.y - 10);
        }

        pop();
    }
}
