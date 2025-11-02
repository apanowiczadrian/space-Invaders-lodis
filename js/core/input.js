import { getOffsetX, getOffsetY, getScaleFactor } from './viewport.js';

// Input Handling - Invisible Touch Strips
export function handleTouches(game, touches) {
    game.isLeftPressed = false;
    game.isRightPressed = false;
    game.isFirePressed = false;

    if (!game.leftTouchStrip || !game.rightTouchStrip) return;

    for (let i = 0; i < touches.length; i++) {
        const virtualX = (touches[i].x - getOffsetX()) / getScaleFactor();
        const virtualY = (touches[i].y - getOffsetY()) / getScaleFactor();

        // Left strip - movement control (split in half)
        if (game.leftTouchStrip.hitTest(virtualX, virtualY)) {
            const stripCenter = game.leftTouchStrip.width / 2;

            if (virtualX < stripCenter) {
                game.isLeftPressed = true;
            } else {
                game.isRightPressed = true;
            }
            game.leftTouchStrip.active = true;
        }

        // Right strip - fire control
        if (game.rightTouchStrip.hitTest(virtualX, virtualY)) {
            game.isFirePressed = true;
            game.rightTouchStrip.active = true;
        }
    }

    // Fire bullet (only once per touch)
    if (game.isFirePressed && !game.fireButtonWasPressed) {
        game.firePlayerWeapon();
    }
    game.fireButtonWasPressed = game.isFirePressed;

    // Reset active state
    if (touches.length === 0) {
        if (game.leftTouchStrip) game.leftTouchStrip.active = false;
        if (game.rightTouchStrip) game.rightTouchStrip.active = false;
    }
}

export function handleMousePressed(game, mouseX, mouseY) {
    const virtualMouseX = (mouseX - getOffsetX()) / getScaleFactor();
    const virtualMouseY = (mouseY - getOffsetY()) / getScaleFactor();
    if (game.gameOver && game.retryButton.hitTest(virtualMouseX, virtualMouseY)) {
        game.resetGame();
    }
}

export function handleTouchStarted(game, touches) {
    if (touches.length > 0) {
        const virtualMouseX = (touches[0].x - getOffsetX()) / getScaleFactor();
        const virtualMouseY = (touches[0].y - getOffsetY()) / getScaleFactor();
        if (game.gameOver && game.retryButton.hitTest(virtualMouseX, virtualMouseY)) {
            game.resetGame();
        }
    }
    return false;
}

export function handleKeyPressed(game, key) {
    if (key === " ") {
        game.firePlayerWeapon();
    }

    // Toggle dev overlay
    if (key === "d" || key === "D") {
        game.devOverlay.enabled = !game.devOverlay.enabled;
    }

    // Developer cheat: God Mode
    if (key === "g" || key === "G") {
        game.godMode = !game.godMode;
        console.log("God Mode:", game.godMode ? "ON" : "OFF");
    }

    // Developer cheat: Next wave with '+' or '='
    if (key === "+" || key === "=") {
        game.jumpToWave(game.wave + 1);
        console.log("Jumped to Wave", game.wave);
    }

    // Developer cheat: Previous wave with '-'
    if (key === "-" || key === "_") {
        if (game.wave > 1) {
            game.jumpToWave(game.wave - 1);
            console.log("Jumped to Wave", game.wave);
        }
    }
}
