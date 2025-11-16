/**
 * Analytics - Send game stats to Google Sheets
 *
 * INSTRUKCJA:
 * 1. Przejdź do Google Sheets i stwórz Apps Script (patrz: GOOGLE_SHEETS_INTEGRATION.md)
 * 2. Po deployment skopiuj Web App URL
 * 3. Wklej URL poniżej (zamiast 'YOUR_DEPLOYMENT_ID')
 * 4. Import w sketch.js: import { sendStatsToGoogleSheets } from './utils/analytics.js';
 */

// 🔧 WKLEJ TUTAJ SWÓJ WEB APP URL Z APPS SCRIPT
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx18SZnL14VGzLQcZddjqMTcK1wE9DKCnn1N4CQXGv_pqFYJHfPPQUXfMpkcVng0fonmQ/exec';

// Ustaw na false aby wyłączyć wysyłanie (np. podczas developmentu)
const ANALYTICS_ENABLED = true;

/**
 * Wykryj typ urządzenia
 */
export function detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'Mobile';
    }
    return 'Desktop';
}

/**
 * Wykryj przeglądarkę (prosty string)
 */
export function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    return 'Unknown';
}

/**
 * Wykryj wersję przeglądarki
 */
export function detectBrowserVersion() {
    const ua = navigator.userAgent;
    let match;

    // Firefox
    match = ua.match(/Firefox\/(\d+\.\d+)/);
    if (match) return match[1];

    // Chrome
    match = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];

    // Safari
    match = ua.match(/Version\/(\d+\.\d+)/);
    if (match && ua.indexOf('Safari') > -1) return match[1];

    // Edge
    match = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];

    // Opera
    match = ua.match(/OPR\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) return match[1];

    return 'Unknown';
}

/**
 * Zbierz pełny fingerprint przeglądarki i urządzenia
 * @param {Object} fpsStats - FPS statistics from PerformanceMonitor {current, average, min, max}
 * @param {Object} stats - Game statistics including cheat detection
 */
export async function getBrowserFingerprint(fpsStats = null, stats = null) {
    const fingerprint = {
        // User Agent
        userAgent: navigator.userAgent,
        browserName: detectBrowser(),

        // Screen & Display
        screenResolution: `${screen.width}x${screen.height}`,
        screenAvailable: `${screen.availWidth}x${screen.availHeight}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: screen.orientation?.type || 'unknown',

        // Device Info
        platform: navigator.platform,
        deviceType: detectDevice(),
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',

        // Language & Locale
        language: navigator.language,
        languages: navigator.languages?.join(', ') || navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),

        // Browser Features
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified',
        onlineStatus: navigator.onLine,

        // Connection Info
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
        } : 'unknown',

        // WebGL Info
        webglVendor: getWebGLInfo().vendor,
        webglRenderer: getWebGLInfo().renderer,

        // Canvas Fingerprint (hash dla unikalności)
        canvasFingerprint: getCanvasFingerprint(),

        // Storage
        localStorage: typeof(Storage) !== 'undefined',
        sessionStorage: typeof(Storage) !== 'undefined',

        // Additional Features
        webWorkers: typeof(Worker) !== 'undefined',
        serviceWorkers: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,

        // FPS Statistics (if provided)
        fps: fpsStats ? {
            average: fpsStats.average,
            min: fpsStats.min,
            max: fpsStats.max,
            current: fpsStats.current
        } : 'not_available',

        // Developer Cheats Detection
        cheats: stats ? {
            usedCheats: stats.usedCheats || false,
            usedGodMode: stats.usedGodMode || false,
            usedWaveJump: stats.usedWaveJump || false
        } : {
            usedCheats: false,
            usedGodMode: false,
            usedWaveJump: false
        },

        // Timestamp
        timestamp: new Date().toISOString()
    };

    // Pobierz IP (opcjonalne, tylko jeśli dostępne)
    try {
        const ipData = await getPublicIP();
        fingerprint.ip = ipData.ip;
        fingerprint.ipLocation = ipData.location;
    } catch (error) {
        fingerprint.ip = 'unavailable';
        fingerprint.ipLocation = 'unavailable';
    }

    return fingerprint;
}

/**
 * Pobierz informacje WebGL
 */
function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return { vendor: 'unavailable', renderer: 'unavailable' };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            };
        }

        return {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER)
        };
    } catch (e) {
        return { vendor: 'error', renderer: 'error' };
    }
}

/**
 * Wygeneruj Canvas Fingerprint (hash)
 */
function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Rysuj tekst z różnymi fontami
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('Canvas Fingerprint 🎮', 2, 2);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Canvas Fingerprint 🎮', 4, 4);

        // Konwertuj na hash
        const dataURL = canvas.toDataURL();
        return simpleHash(dataURL);
    } catch (e) {
        return 'unavailable';
    }
}

/**
 * Prosty hash function
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Pobierz publiczne IP (używa darmowego API)
 */
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            timeout: 2000 // 2 sekundy timeout
        });
        const data = await response.json();

        // Opcjonalnie pobierz lokalizację
        try {
            const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`, {
                timeout: 2000
            });
            const geoData = await geoResponse.json();

            return {
                ip: data.ip,
                location: {
                    country: geoData.country_name,
                    city: geoData.city,
                    region: geoData.region
                }
            };
        } catch (e) {
            return { ip: data.ip, location: 'unavailable' };
        }
    } catch (error) {
        return { ip: 'unavailable', location: 'unavailable' };
    }
}

/**
 * Wyślij statystyki do Google Sheets
 *
 * @param {Object} playerData - Dane gracza {nick, email}
 * @param {Object} stats - Statystyki gry z finalizeStats()
 * @param {Object} fpsStats - FPS statistics from game.performanceMonitor.getFpsStats()
 * @returns {Promise<boolean>} - true jeśli wysłano pomyślnie
 */
export async function sendStatsToGoogleSheets(playerData, stats, fpsStats = null) {
    // Sprawdź czy analytics jest włączony
    if (!ANALYTICS_ENABLED) {
        console.log('📊 Analytics disabled');
        return false;
    }

    // Sprawdź czy endpoint jest skonfigurowany
    if (GOOGLE_SHEETS_ENDPOINT.includes('YOUR_DEPLOYMENT_ID')) {
        console.warn('⚠️ Google Sheets endpoint not configured. See GOOGLE_SHEETS_INTEGRATION.md');
        return false;
    }

    try {
        // Zbierz pełny fingerprint przeglądarki (z IP, FPS stats i cheat detection)
        const browserFingerprint = await getBrowserFingerprint(fpsStats, stats);

        // Przygotuj dane do wysłania
        const payload = {
            // Dane gracza
            nick: playerData?.nick || 'Anonymous',
            email: playerData?.email || '',

            // Wyniki
            finalScore: stats.finalScore || 0,
            finalWave: stats.finalWave || 0,
            enemiesKilled: stats.enemiesKilled || 0,

            // Czas gry
            totalGameTime: stats.totalGameTime || '0',

            // Strzały
            totalShots: stats.totalShots || 0,
            shotsPerSecond: stats.shotsPerSecond || '0',
            shotsByWeapon: stats.shotsByWeapon || {
                basic: 0,
                triple: 0,
                rocket: 0
            },

            // Power-upy
            powerUpsCollected: stats.powerUpsCollected || {
                life: 0,
                shield: 0,
                autofire: 0,
                tripleshot: 0,
                rocket: 0
            },

            // Metadata
            device: detectDevice(),
            browser: JSON.stringify(browserFingerprint), // 🆕 Pełny fingerprint jako JSON
            timestamp: Date.now(),

            // URL gry (dla multi-domain tracking)
            gameUrl: window.location.href
        };

        // Priority 3: Add 5s timeout to fetch using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            // Wyślij POST request
            const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors', // Important: Google Apps Script wymaga no-cors
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal // Add abort signal
            });

            clearTimeout(timeoutId);

            // Note: mode: 'no-cors' nie pozwala odczytać response,
            // ale request zostanie wysłany i przetworzony przez Apps Script
            console.log('✅ poprawnie zapisano wynik do bazy');
            return true;

        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error('❌ Analytics timeout after 5s');
            } else {
                console.error('❌ Error sending stats to Google Sheets:', fetchError);
            }
            return false;
        }

    } catch (error) {
        // Outer catch for fingerprint collection errors
        console.error('❌ Error collecting fingerprint:', error);
        return false;
    }
}

/**
 * Testowa funkcja do sprawdzenia czy endpoint działa
 * Wywołaj w console: testAnalytics()
 */
export function testAnalytics() {
    const testData = {
        nick: 'TestPlayer',
        email: 'test@example.com',
        finalScore: 99999,
        finalWave: 99,
        enemiesKilled: 999,
        totalGameTime: '999.99',
        totalShots: 999,
        shotsPerSecond: '9.99',
        shotsByWeapon: {
            basic: 500,
            triple: 300,
            rocket: 199
        },
        powerUpsCollected: {
            life: 5,
            shield: 10,
            autofire: 15,
            tripleshot: 20,
            rocket: 25
        },
        usedCheats: false, // Test data - no cheats
        usedGodMode: false,
        usedWaveJump: false
    };

    console.log('🧪 Testing analytics endpoint...');

    // Mock FPS stats for testing
    const testFpsStats = {
        average: 58,
        min: 45,
        max: 60,
        current: 57
    };

    sendStatsToGoogleSheets(
        { nick: testData.nick, email: testData.email },
        testData,
        testFpsStats
    ).then(success => {
        if (success) {
            console.log('✅ Test successful! Check your Google Sheet.');
        } else {
            console.log('❌ Test failed. Check console for errors.');
        }
    });
}

// Udostępnij funkcję testową globalnie
if (typeof window !== 'undefined') {
    window.testAnalytics = testAnalytics;
}
