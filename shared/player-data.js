/**
 * Player Data Management - Shared Component
 * LODIS GALAGA
 *
 * Manages player data storage and retrieval from localStorage
 * Used across all pages for player registration and game initialization
 */

// localStorage key for player data
const STORAGE_KEY = 'spaceInvPlayerData';

/**
 * Save player data to localStorage
 * @param {string} nick - Player nickname (2-20 characters)
 * @param {string} email - Player email/password (min 1 character)
 * @returns {Object} Saved player data object
 */
export function savePlayerData(nick, email) {
    const data = {
        nick: nick.trim(),
        email: email.trim()
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Player data saved:', data);
        return data;
    } catch (error) {
        console.error('❌ Error saving player data:', error);
        throw error;
    }
}

/**
 * Load player data from localStorage
 * @returns {Object|null} Player data object or null if not found
 */
export function loadPlayerData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return null;
        }

        const data = JSON.parse(saved);
        console.log('✅ Player data loaded:', data);
        return data;
    } catch (error) {
        console.error('❌ Error loading player data:', error);
        return null;
    }
}

/**
 * Check if player data exists in localStorage
 * @returns {boolean} True if valid player data exists
 */
export function hasPlayerData() {
    const data = loadPlayerData();
    return data && data.nick && data.email;
}

/**
 * Clear player data from localStorage
 * Useful for logout or reset functionality
 */
export function clearPlayerData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ Player data cleared');
    } catch (error) {
        console.error('❌ Error clearing player data:', error);
    }
}

/**
 * Validate player data before saving
 * @param {string} nick - Player nickname
 * @param {string} email - Player email/password
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
export function validatePlayerData(nick, email) {
    // Trim whitespace
    nick = (nick || '').trim();
    email = (email || '').trim();

    // Validate nick
    if (!nick) {
        return { valid: false, error: 'Nick jest wymagany!' };
    }

    if (nick.length < 2) {
        return { valid: false, error: 'Nick musi mieć min. 2 znaki!' };
    }

    if (nick.length > 20) {
        return { valid: false, error: 'Nick może mieć max. 20 znaków!' };
    }

    // Validate email/password
    if (!email) {
        return { valid: false, error: 'Email/hasło jest wymagane!' };
    }

    if (email.length > 40) {
        return { valid: false, error: 'Email/hasło może mieć max. 40 znaków!' };
    }

    return { valid: true, error: null };
}

/**
 * Get player nickname (shorthand)
 * @returns {string|null} Player nickname or null if not found
 */
export function getPlayerNick() {
    const data = loadPlayerData();
    return data ? data.nick : null;
}

/**
 * Update player data (merge with existing)
 * @param {Object} updates - Partial player data to update
 * @returns {Object|null} Updated player data or null if failed
 */
export function updatePlayerData(updates) {
    try {
        const current = loadPlayerData() || {};
        const updated = { ...current, ...updates };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('✅ Player data updated:', updated);
        return updated;
    } catch (error) {
        console.error('❌ Error updating player data:', error);
        return null;
    }
}
