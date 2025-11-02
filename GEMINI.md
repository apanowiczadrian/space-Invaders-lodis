# Space Invaders p5.js Game

## Project Overview

This project is a simple "Space Invaders" style game created using the p5.js library. The game is designed to run in a web browser, with a focus on providing a consistent, full-screen experience on both desktop and mobile devices.

The player controls a spaceship, shooting at aliens that move side-to-side and descend. The game is won by destroying all aliens and lost if the player is hit.

## Key Files

*   `index.html`: Main HTML file with viewport settings for mobile, PWA capabilities, and safe area support.
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

*   **Fixed Safe Zone System:** The game logic operates within a fixed safe zone of 1200x600, ensuring a consistent gameplay area for all players.
    *   **Desktop:** The game is displayed with a 1000px viewport for smaller sprites.
    *   **Mobile:** The game is displayed in full screen with a 1200px viewport.

*   **Invisible Touch Controls:**
    *   **Movement:** The left 35% of the screen is dedicated to movement. The left half of this area moves the ship left, and the right half moves the ship right.
    *   **Firing:** The right 35% of the screen is dedicated to firing.
    *   **Visual Feedback:** Subtle visual feedback is provided during touch interactions.

*   **Developer Overlay:** A developer overlay can be toggled by pressing the 'D' key, showing real-time information such as:
    *   FPS (current and average) with color-coded status.
    *   Device type.
    *   Virtual resolution.
    *   Safe zone dimensions and offset.
    *   Scale factor.

*   **Safe Area Support:** The game automatically handles notches, Dynamic Islands, and home indicators on iOS devices, ensuring a true full-screen experience.

*   **Performance Optimizations:**
    *   **Batch Rendering:** Stars are rendered in a single batch operation for improved performance.
    *   **Projectile Despawning:** Projectiles are despawned when they move outside the safe zone.
    *   **Efficient Touch Handling:** The game uses an efficient multi-touch handling system.

## Controls

### Keyboard (Desktop):
- **Arrow Keys** - Move the ship.
- **Space** - Fire.
- **D** - Toggle the developer overlay.

### Touch (Mobile):
- **Left side of the screen** - Touch to move the ship.
    - Touch the left half of the movement area to move left.
    - Touch the right half of the movement area to move right.
- **Right side of the screen** - Touch to fire.

## Testing

### Desktop Test:
1.  Open the game in a browser.
2.  Press 'D' to view the developer overlay.
3.  Check that the FPS is around 60.
4.  The virtual resolution should be approximately 1000x600.
5.  The safe zone should be 1200x600.

### Mobile Test:
1.  Open the game on a mobile device.
2.  Rotate the device to landscape mode.
3.  Touch the left side of the screen to move the ship.
4.  Touch the right side of the screen to fire.
5.  The FPS should be between 55-60.

### Fairness Test:
1.  Compare the game on desktop and mobile.
2.  Player speed should be 300px/s (4 seconds to cross the screen).
3.  Enemies should spawn in the same positions.
4.  The safe zone should be identical (1200x600).
