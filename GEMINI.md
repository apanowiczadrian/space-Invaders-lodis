# Space Invaders p5.js Game

## Project Overview

This project is a simple "Space Invaders" style game created using the p5.js library. The game is designed to run in a web browser, with a focus on providing a consistent, full-screen experience on both desktop and mobile devices.

The player controls a spaceship, shooting at aliens that move side-to-side and descend. The game is won by destroying all aliens and lost if the player is hit.

## Key Files

*   `index.html`: Main HTML file with viewport settings for mobile and PWA capabilities.
*   `js/sketch.js`: Core game logic, optimized for performance and cross-platform compatibility.
*   `assets/`: Contains game assets like `spaceship.png` and `alien1.png`.

## Running the Game

A local web server is required to run the game.

1.  **Install `http-server` (if not already installed):**
    ```bash
    npm install -g http-server
    ```

2.  **Navigate to the project directory and start the server:**
    ```bash
    cd C:\Users\Adrian\Documents\Develop\gaming_house\gra
    http-server -c-1
    ```

3.  **Open in Browser:**
    Navigate to the local address provided by the server (e.g., `http://127.0.0.1:8080`).

## Architecture & Features

The game uses a performance-oriented architecture designed for stability across all devices.

*   **Virtual Resolution:** The game logic operates at a fixed virtual resolution (`1200x600`) and is scaled to fit any screen size using a letterbox/pillarbox system. This ensures a consistent layout.

*   **Direct Rendering & Performance:**
    *   The game renders directly to the main canvas, eliminating the overhead of an offscreen buffer.
    *   `pixelDensity(1)` is enforced to maximize performance, especially on mobile devices.
    *   `imageSmoothingEnabled = false` is used to render crisp, pixel-perfect graphics.

*   **Mobile-First Design:**
    *   **Forced Landscape:** On mobile devices, a message prompts the user to rotate their screen to landscape mode.
    *   **Full-Screen & No Zoom:** The `index.html` file is configured with meta tags to provide a full-screen PWA experience and prevent pinch-to-zoom or other scaling gestures.
    *   **Touch Controls:** The game includes on-screen touch controls for moving and firing.