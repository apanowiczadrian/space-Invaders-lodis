/**
 * Navigation - Shared Component
 * LODIS GALAGA
 *
 * Handles page navigation and redirects between different HTML pages
 * Uses window.location.replace() to prevent back button navigation
 */

/**
 * Redirect to index.html (root page)
 * @param {boolean} preserveHistory - If true, uses href instead of replace (allows back button)
 */
export function redirectToIndex(preserveHistory = false) {
    console.log('🔄 Redirecting to index.html');
    if (preserveHistory) {
        window.location.href = 'index.html';
    } else {
        window.location.replace('index.html');
    }
}

/**
 * Redirect to start-menu.html (registration form)
 * @param {boolean} preserveHistory - If true, uses href instead of replace (allows back button)
 */
export function redirectToMenu(preserveHistory = false) {
    console.log('🔄 Redirecting to start-menu.html');
    if (preserveHistory) {
        window.location.href = 'start-menu.html';
    } else {
        window.location.replace('start-menu.html');
    }
}

/**
 * Redirect to pwa-install.html (PWA installation instructions)
 * @param {boolean} preserveHistory - If true, uses href instead of replace (allows back button)
 */
export function redirectToPWA(preserveHistory = false) {
    console.log('🔄 Redirecting to pwa-install.html');
    if (preserveHistory) {
        window.location.href = 'pwa-install.html';
    } else {
        window.location.replace('pwa-install.html');
    }
}

/**
 * Redirect to game.html (game canvas)
 * @param {boolean} preserveHistory - If true, uses href instead of replace (allows back button)
 */
export function redirectToGame(preserveHistory = false) {
    console.log('🔄 Redirecting to game.html');
    if (preserveHistory) {
        window.location.href = 'game.html';
    } else {
        window.location.replace('game.html');
    }
}

/**
 * Redirect to leaderboard.html (full leaderboard page)
 * @param {boolean} preserveHistory - If true, uses href instead of replace (allows back button)
 */
export function redirectToLeaderboard(preserveHistory = true) {
    console.log('🔄 Redirecting to leaderboard.html');
    if (preserveHistory) {
        window.location.href = 'leaderboard.html';
    } else {
        window.location.replace('leaderboard.html');
    }
}

/**
 * Reload current page
 */
export function reloadPage() {
    console.log('🔄 Reloading current page');
    window.location.reload();
}

/**
 * Navigate back in history (if available)
 * Falls back to start-menu.html if no history
 */
export function goBack() {
    if (window.history.length > 1) {
        console.log('🔄 Going back in history');
        window.history.back();
    } else {
        console.log('🔄 No history, redirecting to menu');
        redirectToMenu();
    }
}

/**
 * Get current page name (without .html extension)
 * @returns {string} Current page name (e.g., 'start-menu', 'game', 'index')
 */
export function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return filename.replace('.html', '') || 'index';
}

/**
 * Check if current page matches given page name
 * @param {string} pageName - Page name to check (without .html)
 * @returns {boolean} True if current page matches
 */
export function isCurrentPage(pageName) {
    return getCurrentPage() === pageName;
}
