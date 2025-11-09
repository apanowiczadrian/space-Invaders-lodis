import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT, PC_TARGET_WIDTH, MOBILE_TARGET_WIDTH } from './constants.js';

// Virtual resolution (może być większa niż safe zone)
let _VIRTUAL_WIDTH;
let _VIRTUAL_HEIGHT;

// Safe zone offset w virtual space
let _safeZoneX = 0;
let _safeZoneY = 0;

// Scaling and Offset Globals
let _scaleFactor = 1;
let _offsetX = 0;
let _offsetY = 0;
let _resizeTimeoutId = null;

// Export getters for read-only access
export const getVirtualWidth = () => _VIRTUAL_WIDTH;
export const getVirtualHeight = () => _VIRTUAL_HEIGHT;
export const getSafeZoneX = () => _safeZoneX;
export const getSafeZoneY = () => _safeZoneY;
export const getScaleFactor = () => _scaleFactor;
export const getOffsetX = () => _offsetX;
export const getOffsetY = () => _offsetY;

// Clear viewport cache - forces fresh calculation on next update
// Use this when orientation changes to prevent stale data
export function clearViewportCache() {
    _VIRTUAL_WIDTH = undefined;
    _VIRTUAL_HEIGHT = undefined;
    _safeZoneX = 0;
    _safeZoneY = 0;
    _scaleFactor = 1;
    _offsetX = 0;
    _offsetY = 0;
    console.log('✅ Viewport cache cleared');
}

// Device detection
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
           || ('ontouchstart' in window);
}

export function getTargetWidth() {
    return isMobileDevice() ? MOBILE_TARGET_WIDTH : PC_TARGET_WIDTH;
}

// Detect if running in standalone PWA mode
export function isStandaloneMode() {
    return window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

// Stały margines dla wersji desktop (piksele z każdej strony)
const DESKTOP_MARGIN = 20;

// Core Sizing and Scaling Logic
export function getViewportDimensions() {
    // Zawsze zwracaj pełne wymiary viewportu (canvas będzie pełnej wielkości)
    // Margines będzie uwzględniony tylko w obliczeniach skali i offsetów

    const isMobile = isMobileDevice();
    const isStandalone = isStandaloneMode();

    // Dla przeglądarki mobilnej (nie PWA): użyj stabilnego window.innerHeight
    // Zapobiega to zmianie rozmiaru canvas gdy pasek adresu się chowa/pokazuje
    if (isMobile && !isStandalone) {
        return {
            width: window.innerWidth,
            height: window.innerHeight  // Stabilne - nie zmienia się przy scrollu
        };
    }

    // Dla PWA/standalone lub desktop: użyj visualViewport (obsługuje notche)
    if (window.visualViewport) {
        return {
            width: window.visualViewport.width,
            height: window.visualViewport.height
        };
    }

    // Fallback dla starszych przeglądarek
    return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
    };
}

export function calculateGameArea() {
    const { width, height } = getViewportDimensions();
    const screenAspect = width / height;
    const safeAspect = SAFE_ZONE_WIDTH / SAFE_ZONE_HEIGHT;

    const targetWidth = getTargetWidth();

    // MOBILE: fill screen
    if (isMobileDevice()) {
        // VALIDATION GATE: Detect portrait orientation
        // Portrait has narrow aspect ratio (width < height, aspect < 1.0)
        // Game requires landscape (aspect >= 1.0)
        if (screenAspect < 1.0) {
            console.warn(`⚠️ Portrait orientation detected in calculateGameArea! Aspect: ${screenAspect.toFixed(2)} (width: ${width}, height: ${height})`);
            console.warn('⚠️ This will create huge virtual height and off-screen entities!');
            // Don't throw error - allow calculation but warn loudly
            // Calling code should prevent this scenario from happening
        }

        if (screenAspect >= safeAspect) {
            // Wider than safe zone - add extra space on sides
            _VIRTUAL_WIDTH = SAFE_ZONE_HEIGHT * screenAspect;
            _VIRTUAL_HEIGHT = SAFE_ZONE_HEIGHT;
            _safeZoneX = (_VIRTUAL_WIDTH - SAFE_ZONE_WIDTH) / 2;
            _safeZoneY = 0;
        } else {
            // Narrower - fit safe zone to width
            _VIRTUAL_WIDTH = SAFE_ZONE_WIDTH;
            _VIRTUAL_HEIGHT = SAFE_ZONE_WIDTH / screenAspect;
            _safeZoneX = 0;
            _safeZoneY = (_VIRTUAL_HEIGHT - SAFE_ZONE_HEIGHT) / 2;
        }

        // Log calculated values for debugging
        if (screenAspect < 1.0) {
            console.warn(`⚠️ Calculated virtual space: ${_VIRTUAL_WIDTH.toFixed(0)}x${_VIRTUAL_HEIGHT.toFixed(0)} (safe zone offset Y: ${_safeZoneY.toFixed(0)})`);
        }
    }
    // DESKTOP: smaller viewport for lower res sprites
    else {
        _VIRTUAL_WIDTH = targetWidth;
        _VIRTUAL_HEIGHT = SAFE_ZONE_HEIGHT;
        _safeZoneX = (_VIRTUAL_WIDTH - SAFE_ZONE_WIDTH) / 2;
        _safeZoneY = 0;
    }
}

export function updateScaleAndOffset() {
    const { width, height } = getViewportDimensions();
    const isMobile = isMobileDevice();

    // Na desktop, odejmij margines od dostępnej przestrzeni
    const availableWidth = isMobile ? width : width - (DESKTOP_MARGIN * 2);
    const availableHeight = isMobile ? height : height - (DESKTOP_MARGIN * 2);

    // WAŻNE: Skaluj na podstawie SAFE_ZONE, a nie virtual space
    // Safe zone to obszar gdzie faktycznie rozgrywa się gra
    const scaleByHeight = availableHeight / SAFE_ZONE_HEIGHT;
    const scaleByWidth = availableWidth / SAFE_ZONE_WIDTH;

    // Wybierz mniejszy współczynnik, aby cały safe zone zmieścił się na ekranie
    _scaleFactor = Math.min(scaleByHeight, scaleByWidth);

    // Wycentruj safe zone na ekranie (uwzględnij safeZoneX/Y offset)
    const scaledSafeZoneX = _safeZoneX * _scaleFactor;
    const scaledSafeZoneY = _safeZoneY * _scaleFactor;
    const scaledSafeZoneWidth = SAFE_ZONE_WIDTH * _scaleFactor;
    const scaledSafeZoneHeight = SAFE_ZONE_HEIGHT * _scaleFactor;

    _offsetX = (width - scaledSafeZoneWidth) / 2 - scaledSafeZoneX;
    _offsetY = (height - scaledSafeZoneHeight) / 2 - scaledSafeZoneY;
}

export function updateGameDimensions(game) {
    calculateGameArea();
    const { width, height } = getViewportDimensions();
    // resizeCanvas will be called from main sketch
    updateScaleAndOffset();

    // Reinitialize touch strips po resize
    if (game && game.isTouchDevice) {
        game.initTouchStrips();
    }

    return { width, height };
}

export function handleResizeEvent(game, resizeCanvasFn) {
    clearTimeout(_resizeTimeoutId);
    _resizeTimeoutId = setTimeout(() => {
        const dims = updateGameDimensions(game);
        if (resizeCanvasFn) {
            resizeCanvasFn(dims.width, dims.height);
        }
    }, 150);
}
