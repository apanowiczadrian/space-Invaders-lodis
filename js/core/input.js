import { getOffsetX, getOffsetY, getScaleFactor } from './viewport.js';
import { GameStates } from './GameStates.js';

// Input Handling - Invisible Touch Strips
export function handleTouches(game, touches) {
    // Only handle touch strips during PLAYING state
    if (game.gameState !== GameStates.PLAYING) return;

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

    switch (game.gameState) {
        case GameStates.MENU:
            // Menu is now HTML-based (see index.html)
            // No canvas interaction needed
            break;

        case GameStates.PLAYING:
            // No mouse interaction during gameplay (keyboard/touch only)
            break;

        case GameStates.GAME_OVER:
            // Handle restart button click
            if (game.gameOverScreen.handleClick(virtualMouseX, virtualMouseY)) {
                game.restartGame();
            }
            break;
    }
}

export function handleTouchStarted(game, touches) {
    // IMPORTANT: Return false ONLY when we need to prevent default (during gameplay)
    // If we return false in MENU state, it blocks HTML form interactions!

    if (touches.length > 0) {
        const virtualMouseX = (touches[0].x - getOffsetX()) / getScaleFactor();
        const virtualMouseY = (touches[0].y - getOffsetY()) / getScaleFactor();

        switch (game.gameState) {
            case GameStates.MENU:
                // Menu is now HTML-based (see index.html)
                // DON'T prevent default - allow HTML interactions
                return; // Return undefined to NOT block touch events

            case GameStates.PLAYING:
                // Touch handled by handleTouches() function
                // Prevent default to avoid scrolling during gameplay
                return false;

            case GameStates.GAME_OVER:
                // Handle restart button touch
                if (game.gameOverScreen.handleClick(virtualMouseX, virtualMouseY)) {
                    game.restartGame();
                }
                // Prevent default to avoid accidental page scrolling
                return false;
        }
    }

    // Default: don't prevent (allow HTML interactions)
    return;
}

export function handleKeyPressed(game, key) {
    switch (game.gameState) {
        case GameStates.MENU:
            // Menu is now HTML-based (see index.html)
            // Keyboard input handled by HTML form
            break;

        case GameStates.PLAYING:
            // Gameplay controls
            if (key === " ") {
                game.firePlayerWeapon();
            }

            // Toggle dev overlay
            if (key === "d" || key === "D") {
                game.devOverlay.enabled = !game.devOverlay.enabled;
            }

            // Toggle performance monitor
            if (key === "p" || key === "P") {
                game.performanceMonitor.toggle();
            }

            // Developer cheat: God Mode
            if (key === "g" || key === "G") {
                game.godMode = !game.godMode;
                if (game.godMode) {
                    game.usedGodMode = true; // Track that god mode was used
                }
            }

            // Developer cheat: Next wave with '+' or '='
            if (key === "+" || key === "=") {
                game.jumpToWave(game.wave + 1);
                game.usedWaveJump = true; // Track that wave jump was used
            }

            // Developer cheat: Previous wave with '-'
            if (key === "-" || key === "_") {
                if (game.wave > 1) {
                    game.jumpToWave(game.wave - 1);
                    game.usedWaveJump = true; // Track that wave jump was used
                }
            }
            break;

        case GameStates.GAME_OVER:
            // Restart only via mouse click on button (not keyboard)
            // Keyboard restart disabled to prevent accidental restarts
            break;
    }
}
