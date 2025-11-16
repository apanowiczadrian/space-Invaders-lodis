/**
 * Login Logger - Send user login data to Google Sheets
 *
 * Logs user login attempts with browser fingerprint and device information
 * to the 'loginlog' sheet in Google Sheets.
 */

import { getBrowserFingerprint, detectBrowser, detectBrowserVersion, detectDevice } from './analytics.js';
import { isStandaloneMode } from '../core/viewport.js';

// 🔧 Google Sheets endpoint (same as analytics.js)
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx18SZnL14VGzLQcZddjqMTcK1wE9DKCnn1N4CQXGv_pqFYJHfPPQUXfMpkcVng0fonmQ/exec';

// Enable/disable login logging
const LOGIN_LOGGING_ENABLED = true;

/**
 * Send login data to Google Sheets with timeout
 *
 * @param {Object} playerData - Player data {nick, email}
 * @param {number} timeout - Max wait time in ms (default: 2000ms)
 * @returns {Promise<boolean>} - Resolves when sent or timeout reached
 */
export async function sendLoginToGoogleSheets(playerData, timeout = 2000) {
    try {
        // Race between actual send and timeout
        const sendPromise = sendLoginInBackground(playerData);
        const timeoutPromise = new Promise(resolve =>
            setTimeout(() => resolve(false), timeout)
        );

        const result = await Promise.race([sendPromise, timeoutPromise]);
        return result;
    } catch (error) {
        console.error('❌ Login logging failed:', error);
        return false;
    }
}

/**
 * Internal function - sends login data in background
 */
async function sendLoginInBackground(playerData) {
    // Check if logging is enabled
    if (!LOGIN_LOGGING_ENABLED) {
        console.log('📊 Login logging disabled');
        return false;
    }

    // Check if endpoint is configured
    if (GOOGLE_SHEETS_ENDPOINT.includes('YOUR_DEPLOYMENT_ID')) {
        console.warn('⚠️ Google Sheets endpoint not configured for login logging');
        return false;
    }

    try {
        // Collect browser fingerprint (without FPS stats and game stats)
        const fingerprint = await getBrowserFingerprint(null, null);

        // Detect browser info
        const browserName = detectBrowser();
        const browserVersion = detectBrowserVersion();
        const isPWA = isStandaloneMode();

        // Prepare payload
        const payload = {
            action: 'loginlog',

            // User data
            nick: playerData?.nick || 'Anonymous',
            email: playerData?.email || '',

            // Browser info
            browserName: browserName,
            browserVersion: browserVersion,
            isPWA: isPWA,

            // Full fingerprint as JSON
            fingerprint: fingerprint,

            // Timestamp
            timestamp: Date.now()
        };

        // Send POST request with 2s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        try {
            const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors', // Important: Google Apps Script requires no-cors
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Note: mode: 'no-cors' prevents reading response,
            // but request is sent and processed by Apps Script
            console.log('✅ Login logged successfully');
            return true;

        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error('❌ Login logging timeout after 2s');
            } else {
                console.error('❌ Error sending login log:', fetchError);
            }
            return false;
        }

    } catch (error) {
        // Outer catch for fingerprint collection errors
        console.error('❌ Error collecting login data:', error);
        return false;
    }
}

/**
 * Test function to verify endpoint works
 * Call in console: testLoginLogger()
 */
export function testLoginLogger() {
    const testData = {
        nick: 'TestPlayer',
        email: 'test@example.com'
    };

    console.log('🧪 Testing login logger endpoint...');

    sendLoginToGoogleSheets(testData).then(success => {
        if (success) {
            console.log('✅ Test initiated! Check your Google Sheet loginlog tab.');
        } else {
            console.log('❌ Test failed. Check console for errors.');
        }
    });
}

// Make test function available globally
if (typeof window !== 'undefined') {
    window.testLoginLogger = testLoginLogger;
}
