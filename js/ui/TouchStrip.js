import { getVirtualWidth, getVirtualHeight } from '../core/viewport.js';

// Invisible Touch Strip
export class TouchStrip {
    constructor(side) {
        this.side = side;
        this.width = getVirtualWidth() * 0.175; // Reduced to half (17.5% instead of 35%)
        this.active = false;
    }

    hitTest(virtualX, virtualY) {
        if (this.side === 'left') {
            return virtualX < this.width;
        } else {
            return virtualX > (getVirtualWidth() - this.width);
        }
    }

    draw() {
        if (!this.active) return;

        push();
        fill(255, 255, 255, 20);
        noStroke();

        if (this.side === 'left') {
            rect(0, 0, this.width, getVirtualHeight());

            // Visual divider in center
            stroke(255, 255, 255, 40);
            strokeWeight(2);
            line(this.width / 2, 0, this.width / 2, getVirtualHeight());
        } else {
            rect(getVirtualWidth() - this.width, 0, this.width, getVirtualHeight());
        }
        pop();
    }
}
