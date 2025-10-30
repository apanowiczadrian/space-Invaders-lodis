# GEMINI.md

## Project Overview

This project is a simple "Space Invaders" style game created using the p5.js library. The game runs in a web browser. The player controls a spaceship at the bottom of the screen and shoots projectiles at aliens. The aliens move from side to side, and gradually move down. The player wins by destroying all aliens and loses if hit by an enemy projectile.

The project consists of the following files:
*   `index.html`: The main HTML file that loads the p5.js library and the game script.
*   `js/p5.min.js`: The minified p5.js library.
*   `js/sketch.js`: The main game logic, written in JavaScript using p5.js.
*   `assets/spaceship.png`: Image for the player's spaceship.
*   `assets/alien1.png`: Image for the enemy aliens.

## Building and Running

To run the game, you need to serve the files using a local web server. The `README.md` recommends using `http-server`.

1.  **Install `http-server`:**
    ```bash
    npm install -g http-server
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd C:\Users\Adrian\Documents\Develop\gaming_house\gra
    ```

3.  **Run the server:**
    ```bash
    http-server -c-1
    ```

4.  **Open the game:**
    Open a web browser and navigate to the local address provided by `http-server` (e.g., `http://127.0.0.1:8080`).

## Development Conventions

The game is written in a single JavaScript file (`js/sketch.js`) using the p5.js library. The code is structured using classes for game objects:

*   `Game`: Manages the overall game state, including the player, enemies, projectiles, and game over conditions.
*   `Player`: Represents the player's spaceship.
*   `Enemy`: Represents a single alien enemy.
*   `Projectile`: Represents a projectile fired by the player or an enemy.

The code uses global functions like `setup()` and `draw()`, which are the entry points for p5.js sketches. The game uses a virtual resolution (`VIRTUAL_WIDTH`, `VIRTUAL_HEIGHT`) and scales the canvas to fit the browser window.

## Target Platforms and Requirements

The application is designed to be a cross-platform web game, with a focus on providing a consistent, full-screen experience on modern mobile devices.

*   **Target Platforms:**
    *   Desktop web browsers (e.g., Chrome, Firefox, Safari).
    *   Mobile web browsers on iOS (Safari).
    *   Mobile web browsers on Android (Chrome).

*   **Key Requirements for Mobile:**
    *   **Full-Screen Experience:** The game should run as a Progressive Web App (PWA) when added to the home screen, hiding the browser's UI.
    *   **Forced Landscape Orientation:** The game must only be playable in landscape mode. A message should prompt the user to rotate their device if it's in portrait mode.
    *   **No Scaling:** Users must not be able to zoom in or out of the game using pinch-to-zoom or other gestures.
    *   **Consistent Scaling:** The game's internal resolution should scale correctly to fit the device's screen without distortion or cropping, maintaining its aspect ratio.

## Current Architecture (Hybrid Buffer)

After multiple iterations to solve cross-platform scaling and performance issues, the project has been reverted to a known stable, hybrid architecture. This architecture prioritizes stability and a consistent gameplay experience across all devices, particularly iOS, over achieving the highest possible visual fidelity on high-DPI screens.

The key components of this architecture are:

*   **Virtual Resolution:** The game logic operates in a fixed virtual resolution (`1200x600`), ensuring consistent layout and behavior regardless of screen size.

*   **Offscreen Buffer (`gameBuffer`):** The entire game scene is drawn to an offscreen buffer (`createGraphics`) at the virtual resolution. This prevents visual flickering and artifacts, as the main canvas is only cleared and redrawn once per frame with the final, composed image.

*   **Viewport-Based Sizing:** The main, visible canvas is resized using the `visualViewport` API. This is the most robust method for handling the dynamic nature of mobile browser interfaces (appearing/disappearing address bars) and preventing unwanted page scrolling on iOS.

*   **Predictable Scaling (`pixelDensity(1)`):** To ensure stability and avoid performance issues that arose with more complex solutions, the rendering density is explicitly set to 1. This forces predictable scaling behavior on all devices. The trade-off is that the final image may appear pixelated on high-resolution (Retina) displays, but it guarantees a smooth and functional experience.

*   **Multi-Touch Input Polling:** User input on touch devices is handled by a polling system (`handleTouches`) that checks the status of all active touches in every frame. This allows for robust multi-touch actions, such as moving and shooting simultaneously, which is critical for mobile gameplay.
