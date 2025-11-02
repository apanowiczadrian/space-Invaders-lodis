import { getVirtualWidth, getVirtualHeight, getSafeZoneX, getSafeZoneY, getScaleFactor, isMobileDevice } from '../core/viewport.js';
import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT } from '../core/constants.js';

// Developer Overlay
export class DevOverlay {
    constructor() {
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fpsHistory = [];
        this.enabled = true;
    }

    update(deltaTime) {
        this.frameCount++;
        const currentTime = millis();

        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > 60) this.fpsHistory.shift();

            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }

    draw(game) {
        if (!this.enabled) return;

        push();
        fill(0, 0, 0, 180);
        noStroke();
        rect(5, 5, 280, 220, 5);

        fill(0, 255, 0);
        textAlign(LEFT, TOP);
        textSize(14);

        let y = 15;
        const avgFps = this.fpsHistory.length > 0
            ? Math.round(this.fpsHistory.reduce((a,b) => a+b, 0) / this.fpsHistory.length)
            : this.fps;

        const fpsColor = this.fps >= 55 ? [0, 255, 0] :
                        this.fps >= 30 ? [255, 255, 0] : [255, 0, 0];
        fill(...fpsColor);
        text(`FPS: ${this.fps} (avg: ${avgFps})`, 15, y);

        y += 20;
        fill(200, 200, 200);
        text(`Device: ${isMobileDevice() ? 'Mobile' : 'Desktop'}`, 15, y);

        y += 20;
        text(`Virtual: ${getVirtualWidth()}x${getVirtualHeight()}`, 15, y);

        y += 20;
        text(`Safe Zone: ${SAFE_ZONE_WIDTH}x${SAFE_ZONE_HEIGHT}`, 15, y);

        y += 20;
        text(`Safe Offset: (${Math.round(getSafeZoneX())}, ${Math.round(getSafeZoneY())})`, 15, y);

        y += 20;
        text(`Scale: ${getScaleFactor().toFixed(2)}x`, 15, y);

        y += 20;
        fill(150, 150, 255);
        text(`Wave: ${game.wave}`, 15, y);

        y += 20;
        fill(200, 150, 255);
        const pointsPerKill = 1 + Math.floor(game.wave / 2);
        text(`Points/Kill: ${pointsPerKill}`, 15, y);

        y += 20;
        fill(255, 215, 0);
        text(`Lives: ${game.lives}`, 15, y);

        y += 20;
        if (game.godMode) {
            fill(255, 0, 0);
            text(`GOD MODE: ON`, 15, y);
        } else if (game.player && game.player.shieldActive) {
            fill(0, 255, 255);
            text(`Shield: ${game.player.shieldTimer.toFixed(1)}s`, 15, y);
        } else {
            fill(100, 100, 100);
            text(`Shield: OFF`, 15, y);
        }

        y += 20;
        fill(100, 100, 100);
        textSize(10);
        text(`D=Overlay G=God +/-=Wave`, 15, y);

        pop();
    }
}
