/**
 * Portrait Warning Overlay - Shared Component
 * LODIS GALAGA
 *
 * Manages portrait orientation detection and warning overlay
 * Used across all pages (start-menu, PWA install, game)
 */

import { getViewportDimensions } from '../js/core/viewport.js';
import { isMobileDevice } from '../js/core/viewport.js';

// State variables for orientation checking
let orientationCheckTimer = null;
let isCheckingOrientation = false;

/**
 * Check if device is in portrait orientation
 * @returns {boolean} True if portrait, false if landscape
 */
export function isPortrait() {
    const { width, height } = getViewportDimensions();
    return height > width;
}

/**
 * Show portrait warning overlay
 */
export function showPortraitWarning() {
    const portraitWarning = document.getElementById('portrait-warning');
    if (portraitWarning && !portraitWarning.classList.contains('active')) {
        portraitWarning.classList.add('active');
        console.log('📱 Portrait warning shown');
    }
}

/**
 * Hide portrait warning overlay
 */
export function hidePortraitWarning() {
    const portraitWarning = document.getElementById('portrait-warning');
    if (portraitWarning && portraitWarning.classList.contains('active')) {
        portraitWarning.classList.remove('active');
        console.log('📱 Portrait warning hidden');
    }
}

/**
 * Check orientation and show/hide warning (simplified version for non-game pages)
 * Use this for start-menu.html, pwa-install.html, leaderboard.html
 * For game.html, use the full checkOrientation() from sketch.js
 */
export function checkOrientationSimple() {
    // Clear any pending check
    if (orientationCheckTimer) {
        clearTimeout(orientationCheckTimer);
    }

    // Debounce: wait 300ms for orientation to stabilize (iOS viewport lag)
    orientationCheckTimer = setTimeout(() => {
        // Guard: prevent concurrent execution
        if (isCheckingOrientation) {
            return;
        }

        isCheckingOrientation = true;

        try {
            const isCurrentlyPortrait = isPortrait();
            const isMobile = isMobileDevice();

            // Skip orientation enforcement on desktop
            if (!isMobile) {
                hidePortraitWarning();
                isCheckingOrientation = false;
                return;
            }

            // Simple logic: show warning if portrait, hide if landscape
            if (isCurrentlyPortrait) {
                showPortraitWarning();
            } else {
                hidePortraitWarning();
            }
        } catch (error) {
            console.error('❌ Error checking orientation:', error);
        } finally {
            isCheckingOrientation = false;
        }
    }, 300);
}

/**
 * Initialize portrait warning for a page
 * Call this in DOMContentLoaded for any page that needs portrait detection
 */
export function initPortraitWarning() {
    // Load portrait warning HTML
    loadPortraitWarningHTML();

    // Initial check
    checkOrientationSimple();

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        checkOrientationSimple();
    });

    // Listen for window resize (fallback for some devices)
    window.addEventListener('resize', () => {
        checkOrientationSimple();
    });

    console.log('✅ Portrait warning initialized');
}

/**
 * Load portrait warning HTML into page
 * Fetches shared/portrait-warning.html and injects it into body
 */
async function loadPortraitWarningHTML() {
    try {
        const response = await fetch('shared/portrait-warning.html');
        const html = await response.text();

        // Create container if it doesn't exist
        let container = document.getElementById('portrait-warning-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'portrait-warning-container';
            document.body.insertBefore(container, document.body.firstChild);
        }

        container.innerHTML = html;
        console.log('✅ Portrait warning HTML loaded');
    } catch (error) {
        console.error('❌ Failed to load portrait warning HTML:', error);
        // Fallback: create minimal HTML inline
        const fallbackHTML = `
            <div id="portrait-warning">
                <div class="rotation-icon">📱</div>
                <h2 class="portrait-title">Obróć Urządzenie</h2>
                <p class="portrait-text">Ta gra wymaga orientacji poziomej (landscape)</p>
            </div>
        `;
        let container = document.getElementById('portrait-warning-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'portrait-warning-container';
            document.body.insertBefore(container, document.body.firstChild);
        }
        container.innerHTML = fallbackHTML;
    }
}
