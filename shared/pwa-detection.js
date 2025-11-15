/**
 * PWA Detection - Shared Component
 * LODIS GALAGA
 *
 * Detects device type, browser, and PWA installation status
 * Used across all pages for conditional logic and navigation
 */

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
           || ('ontouchstart' in window);
}

/**
 * Check if device is iOS (iPhone, iPad, iPod)
 * @returns {boolean} True if iOS device
 */
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Check if running in PWA standalone mode
 * @returns {boolean} True if PWA installed and running in standalone mode
 */
export function isStandaloneMode() {
    // On iOS, the `standalone` property is the only reliable method
    if (isIOS()) {
        return window.navigator.standalone === true;
    }

    // For other browsers, use the standard display-mode media query
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches
    );
}

/**
 * Check if device is Android
 * @returns {boolean} True if Android device
 */
export function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

/**
 * Check if browser is Opera (desktop or mobile)
 * @returns {boolean} True if Opera browser
 */
export function isOpera() {
    const ua = navigator.userAgent;
    // Modern Opera (v15+) uses 'OPR', older versions use 'Opera'
    return ua.indexOf('OPR') !== -1 || ua.indexOf('Opera') !== -1;
}

/**
 * Get device type as string
 * @returns {string} 'desktop', 'android', or 'ios'
 */
export function getDeviceType() {
    if (!isMobileDevice()) return 'desktop';
    if (isAndroid()) return 'android';
    if (isIOS()) return 'ios';
    return 'mobile'; // Generic mobile fallback
}

/**
 * Check if PWA installation is possible
 * PWA requires HTTPS (or localhost/127.0.0.1)
 * @returns {boolean} True if PWA can be installed
 */
export function canInstallPWA() {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const hasServiceWorker = 'serviceWorker' in navigator;

    return (isHTTPS || isLocalhost) && hasServiceWorker;
}

/**
 * Check if user should see PWA install screen
 * Show if: mobile device + NOT in PWA mode + can install PWA
 * @returns {boolean} True if should redirect to PWA install screen
 */
export function shouldShowPWAScreen() {
    return isMobileDevice() && !isStandaloneMode() && canInstallPWA();
}

/**
 * Log device detection info for debugging
 */
export function logDeviceInfo() {
    const info = {
        deviceType: getDeviceType(),
        isMobile: isMobileDevice(),
        isStandalone: isStandaloneMode(),
        isIOS: isIOS(),
        isAndroid: isAndroid(),
        canInstallPWA: canInstallPWA(),
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname
    };

    console.log('📱 Device Detection:', info);
    return info;
}
