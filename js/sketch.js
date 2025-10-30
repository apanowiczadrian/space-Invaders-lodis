p5.disableFriendlyErrors = true;

// =================================================
// Reverted to: Hybrid Approach (Stable, Pixelated)
// =================================================

const VIRTUAL_WIDTH = 1200;
const VIRTUAL_HEIGHT = 600;

let game;
let gameBuffer; // Offscreen buffer for all game rendering

// --- Scaling and Offset Globals ---
let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let resizeTimeoutId = null;

// Core Sizing and Scaling Logic
function getViewportDimensions() {
    if (window.visualViewport) {
        return { width: window.visualViewport.width, height: window.visualViewport.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
}

function updateScaleAndOffset() {
    const { width, height } = getViewportDimensions();
    const gameAspect = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    const screenAspect = width / height;
    
    if (screenAspect > gameAspect) {
        scaleFactor = height / VIRTUAL_HEIGHT;
        offsetX = (width - (VIRTUAL_WIDTH * scaleFactor)) / 2;
        offsetY = 0;
    } else {
        scaleFactor = width / VIRTUAL_WIDTH;
        offsetX = 0;
        offsetY = (height - (VIRTUAL_HEIGHT * scaleFactor)) / 2;
    }
}

function handleResizeEvent() {
    clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(() => {
        const { width, height } = getViewportDimensions();
        resizeCanvas(width, height);
        updateScaleAndOffset();
    }, 150);
}

let lastTime = 0;

// p5.js Core Functions
function preload() {
    game = new Game();
    game.spaceImg = loadImage("./assets/spaceship.png");
    game.enemyImg = loadImage("./assets/alien1.png");
}

function setup() {
    const { width, height } = getViewportDimensions();
    const canvas = createCanvas(width, height);
    const context = canvas.elt.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    gameBuffer = createGraphics(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    
    let targetPixelDensity = window.devicePixelRatio || 1;
    if (width < 1024) targetPixelDensity = Math.min(targetPixelDensity, 2);
    pixelDensity(targetPixelDensity);
    gameBuffer.pixelDensity(targetPixelDensity);

    updateScaleAndOffset();
    game.setup();
}

function draw() {
    const currentTime = millis();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    drawGameOnBuffer(deltaTime);
    background(0);
    image(gameBuffer, offsetX, offsetY, VIRTUAL_WIDTH * scaleFactor, VIRTUAL_HEIGHT * scaleFactor);
}

function windowResized() {
    handleResizeEvent();
}

// Game Logic (draws to buffer)
function drawGameOnBuffer(deltaTime) {
    if (game.isTouchDevice) {
        handleTouches();
    }

    if (window.innerWidth < window.innerHeight && game.isTouchDevice) {
        gameBuffer.background(0);
        gameBuffer.fill(255);
        gameBuffer.textAlign(CENTER, CENTER);
        gameBuffer.textSize(20);
        gameBuffer.text("Please rotate your device", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
        return;
    }

    gameBuffer.background(0);
    gameBuffer.strokeWeight(1);

    if (game.gameOver) {
        gameBuffer.textAlign(CENTER);
        gameBuffer.fill(255);
        gameBuffer.textSize(32);
        gameBuffer.text(game.gameWin ? "Winner" : "Game Over", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
        gameBuffer.text("Score: " + game.score, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 40);
        game.retryButton.draw();
        return;
    }

    if (game.isTouchDevice) {
        game.moveLeftButton.draw();
        game.moveRightButton.draw();
        game.fireButton.draw();
    }

    game.player.show();
    game.player.move(deltaTime);

    for (let i = game.enemies.length - 1; i >= 0; i--) {
        game.enemies[i].show();
        game.enemies[i].move(deltaTime);
    }

    for (let p of game.playerProjectilePool.pool) {
        if (!p.active) continue;
        p.show();
        p.move(deltaTime);
        for (let j = game.enemies.length - 1; j >= 0; j--) {
            if (p.hit(game.enemies[j])) {
                game.killedEnemies++;
                game.score++;
                game.enemies.splice(j, 1);
                game.playerProjectilePool.release(p);
                break;
            }
        }
    }

    for (let p of game.enemyProjectilePool.pool) {
        if (!p.active) continue;
        p.show();
        p.move(deltaTime);
        if (p.hit(game.player)) {
            game.gameOver = true;
            break;
        }
    }

    if (game.enemies.length === 0) {
        game.gameOver = true;
        game.gameWin = true;
    }

    game.updateKilledText();
    game.drawStars(deltaTime);
}

// Input Handling (Multi-Touch Polling)
function handleTouches() {
    game.isLeftPressed = false;
    game.isRightPressed = false;
    let isFireButtonPressed = false;
    for (let i = 0; i < touches.length; i++) {
        const virtualMouseX = (touches[i].x - offsetX) / scaleFactor;
        const virtualMouseY = (touches[i].y - offsetY) / scaleFactor;
        if (game.moveLeftButton.hitTest(virtualMouseX, virtualMouseY)) { game.isLeftPressed = true; }
        if (game.moveRightButton.hitTest(virtualMouseX, virtualMouseY)) { game.isRightPressed = true; }
        if (game.fireButton.hitTest(virtualMouseX, virtualMouseY)) { isFireButtonPressed = true; }
    }
    if (isFireButtonPressed && !game.fireButtonWasPressed) {
        game.playerProjectilePool.get(game.player.x, game.player.y, -1);
    }
    game.fireButtonWasPressed = isFireButtonPressed;
}

function mousePressed() {
    const virtualMouseX = (mouseX - offsetX) / scaleFactor;
    const virtualMouseY = (mouseY - offsetY) / scaleFactor;
    if (game.gameOver && game.retryButton.hitTest(virtualMouseX, virtualMouseY)) {
        game.resetGame();
    }
}

function touchStarted() {
    if (touches.length > 0) {
        const virtualMouseX = (touches[0].x - offsetX) / scaleFactor;
        const virtualMouseY = (touches[0].y - offsetY) / scaleFactor;
        if (game.gameOver && game.retryButton.hitTest(virtualMouseX, virtualMouseY)) {
            game.resetGame();
        }
    }
    return false;
}

function keyPressed() {
    if (key === " ") {
        game.playerProjectilePool.get(game.player.x, game.player.y, -1);
    }
}

// Game Classes (drawing on gameBuffer)
class CanvasButton {
    constructor(x, y, w, h, text) { this.x = x; this.y = y; this.w = w; this.h = h; this.text = text; }
    draw() {
        gameBuffer.stroke(255);
        gameBuffer.fill(0);
        gameBuffer.rectMode(CENTER);
        gameBuffer.rect(this.x, this.y, this.w, this.h, 10);
        gameBuffer.fill(255);
        gameBuffer.noStroke();
        gameBuffer.textAlign(CENTER, CENTER);
        gameBuffer.textSize(32);
        gameBuffer.text(this.text, this.x, this.y);
    }
    hitTest(virtualX, virtualY) {
        return (virtualX > this.x - this.w / 2 && virtualX < this.x + this.w / 2 &&
                virtualY > this.y - this.h / 2 && virtualY < this.y + this.h / 2);
    }
}

class Game {
    constructor() {
        this.player; this.enemies = []; 
        this.playerProjectilePool = new ProjectilePool(10);
        this.enemyProjectilePool = new ProjectilePool(20);
        this.gameOver = false; this.gameWin = false; this.score = 0;
        this.retryButton = new CanvasButton(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 100, 200, 60, "Retry");
        this.isTouchDevice = 'ontouchstart' in window;
        this.moveLeftButton = new CanvasButton(150, VIRTUAL_HEIGHT - 80, 100, 80, "<");
        this.moveRightButton = new CanvasButton(300, VIRTUAL_HEIGHT - 80, 100, 80, ">");
        this.fireButton = new CanvasButton(VIRTUAL_WIDTH - 150, VIRTUAL_HEIGHT - 80, 120, 80, "FIRE");
        this.isLeftPressed = false; this.isRightPressed = false; this.fireButtonWasPressed = false;
        this.spaceImg; this.enemyImg; this.killedEnemies = 0;
        this.stars = [];
    }
    setup() { this.resetGame(); }
    resetGame() {
        this.killedEnemies = 0; this.gameOver = false; this.gameWin = false; this.score = 0;
        this.player = new Player(); this.enemies = []; this.initEnemies();
        this.playerProjectilePool.pool.forEach(p => p.active = false);
        this.enemyProjectilePool.pool.forEach(p => p.active = false);
        this.stars = Array.from({length: 50}, () => ({
            x: Math.random() * VIRTUAL_WIDTH,
            y: Math.random() * VIRTUAL_HEIGHT,
            speed: Math.random() * 50 + 20, // pixels per second
            size: Math.random() * 3 + 1
        }));
    }
    initEnemies() { for (let i = 0; i < 5; i++) { for (let j = 0; j < 10; j++) { this.enemies.push(new Enemy(j * 60 + 60, i * 40 + 80)); } } }
    drawStars(dt) {
        for (let star of this.stars) {
            gameBuffer.stroke(255);
            gameBuffer.strokeWeight(star.size);
            gameBuffer.point(star.x, star.y);
            star.y -= star.speed * dt;
            if (star.y < 0) {
                star.y = VIRTUAL_HEIGHT;
                star.x = Math.random() * VIRTUAL_WIDTH;
            }
        }
    }
    updateKilledText() {
        gameBuffer.textAlign(CENTER);
        gameBuffer.strokeWeight(0.5);
        gameBuffer.fill(255);
        gameBuffer.textSize(12);
        gameBuffer.text("Killed Enemies: " + this.killedEnemies, 80, 30);
    }
}

class Player {
    constructor() { this.x = VIRTUAL_WIDTH / 2; this.y = VIRTUAL_HEIGHT - 70; this.w = 50; this.h = 50; this.speed = 300; }
    show() { gameBuffer.image(game.spaceImg, this.x, this.y, this.w, this.h); }
    move(dt) {
        if ((keyIsDown(LEFT_ARROW) || game.isLeftPressed) && this.x > 0) { this.x -= this.speed * dt; }
        if ((keyIsDown(RIGHT_ARROW) || game.isRightPressed) && this.x < VIRTUAL_WIDTH - this.w) { this.x += this.speed * dt; }
    }
}

class Enemy {
    constructor(x, y) { this.x = x; this.y = y; this.w = 50; this.h = 50; this.speed = 60; this.direction = 1; }
    show() { gameBuffer.image(game.enemyImg, this.x, this.y, this.w, this.h); }
    move(dt) {
        this.x += this.speed * this.direction * dt;
        if (this.x > VIRTUAL_WIDTH - this.w || this.x < 0) { this.direction *= -1; this.y += 10; }
        if (Math.random() < 0.001) { game.enemyProjectilePool.get(this.x + this.w / 2, this.y + this.h, 1); }
    }
}

class Projectile {
    constructor(x, y, direction) { this.x = x; this.y = y; this.r = 10; this.speed = 300; this.direction = direction; this.active = false; }
    show() {
        gameBuffer.fill(255);
        gameBuffer.noStroke();
        gameBuffer.ellipse(this.x, this.y, this.r * 2, this.r * 2);
    }
    move(dt) { this.y += this.speed * this.direction * dt; }
    hit(obj) { let d = dist(this.x, this.y, obj.x + obj.w / 2, obj.y + obj.h / 2); return d < this.r + obj.w / 2; }
    reset(x, y, direction) { this.x = x; this.y = y; this.direction = direction; this.active = true; }
}

class ProjectilePool {
    constructor(size) {
        this.pool = Array(size).fill().map(() => new Projectile(0, 0, 1));
    }
    
    get(x, y, direction) {
        let proj = this.pool.find(p => !p.active);
        if (proj) {
            proj.reset(x, y, direction);
            return proj;
        }
        // Optionally expand the pool if it's empty
        proj = new Projectile(x, y, direction);
        proj.active = true;
        this.pool.push(proj);
        return proj;
    }
    
    release(proj) {
        proj.active = false;
    }
}

// Global Event Listeners
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResizeEvent);
    window.visualViewport.addEventListener('scroll', handleResizeEvent);
}
window.addEventListener('orientationchange', () => { setTimeout(handleResizeEvent, 100); });