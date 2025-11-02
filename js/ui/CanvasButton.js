export class CanvasButton {
    constructor(x, y, w, h, text) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
    }

    draw() {
        stroke(255);
        fill(0);
        rectMode(CENTER);
        rect(this.x, this.y, this.w, this.h, 10);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(32);
        text(this.text, this.x, this.y);
    }

    hitTest(virtualX, virtualY) {
        return (virtualX > this.x - this.w / 2 && virtualX < this.x + this.w / 2 &&
                virtualY > this.y - this.h / 2 && virtualY < this.y + this.h / 2);
    }
}
